// H8 ozan atışması ve sahnesi uçtan uca: gerçek Worker yönlendiricisi + gerçek DO'lar, sahte hibernation soketleri.
// Teklif/kabul HTTP eylemiyle, kıta/oy WebSocket'le; sonuç masa olayı olur ve yerleşimde anılır. DO yeniden uyanınca
// durum depodan gelir; taraf yoksa temizce düşer.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, MasaDO, YerlesimDO, YonetimDO } from "../src/index.ts";
import { yerlesimCagir } from "../src/ic.ts";
import { ATISMA_KITA } from "../src/han/sahne.ts";
import type { WebSocketDurumu } from "../src/masa-do.ts";
import type { Env } from "../src/tipler.ts";
import { hibernasyonlu, sahteAraclar, type SahteWebSoket } from "./han-yardimci.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

type Yanit = { durum: number; govde: Record<string, any> };
let sayac = 0;
const no = (): string => `atisk-${String(++sayac).padStart(8, "0")}`;

test("H8 uçtan uca: atışma teklif-kabul, kıtalar, oylama, masa olayı ve yerleşimde anılma; tekrar güvenli; uyanışta sürer ya da düşer", async () => {
  const anahtar = await rsaAnahtari("kid-atisk");
  globalThis.fetch = sahteJwks([anahtar]).getir;
  const araclar = sahteAraclar();
  const env = { GOOGLE_CLIENT_ID: ISTEMCI, OTURUM_ANAHTARI: "o".repeat(48) } as Env;
  let masaCtx: WebSocketDurumu | undefined;
  const hesap = sahteAdAlani((ctx) => new HesapDO(ctx, env));
  const masa = sahteAdAlani((ctx) => {
    masaCtx = hibernasyonlu(ctx);
    return new MasaDO(masaCtx, env, araclar);
  });
  const yonetim = sahteAdAlani((ctx) => new YonetimDO(ctx, env));
  const dunya = sahteAdAlani((ctx) => new DunyaDO(ctx, env));
  const yerlesim = sahteAdAlani((ctx) => new YerlesimDO(ctx, env));
  Object.assign(env, { HESAP: hesap, MASA: masa, YONETIM: yonetim, DUNYA: dunya, YERLESIM: yerlesim });
  const simdi = Date.now();
  const cagir = async (yontem: string, yol: string, s: { govde?: unknown; oturum?: string; baslik?: Record<string, string> } = {}): Promise<Yanit> => {
    const basliklar: Record<string, string> = { ...s.baslik };
    if (s.oturum) basliklar.authorization = `Bearer ${s.oturum}`;
    if (s.govde !== undefined) basliklar["content-type"] = "application/json";
    const y = await isleyici.fetch(
      new Request(`https://kronikler-online.test${yol}`, { method: yontem, headers: basliklar, body: s.govde === undefined ? null : JSON.stringify(s.govde) }),
      env,
    );
    return { durum: y.status, govde: (await y.json()) as Record<string, any> };
  };
  const oyuncu = async (sub: string, ad: string) => {
    const t = await jwtImzala(anahtar, googleYuku(simdi, { sub, given_name: ad }));
    const oturum = (await cagir("POST", "/v1/giris", { govde: { idToken: t } })).govde.oturum as string;
    const p = await cagir("POST", "/v1/profil", { oturum, govde: { ad, cinsiyet: "kadın", yerlesim: "kizilca", istekNo: no() } });
    assert.equal(p.durum, 200, `profil ${ad}`);
    return { oturum, hesap: p.govde.hesapId as string };
  };
  const baglan = async (oturum: string) => {
    await cagir("GET", "/v1/han/masa/1/baglan", { oturum, baslik: { upgrade: "websocket" } });
    return araclar.sunucular.at(-1)!;
  };
  const masaKaydi = () => masa.ornekler.get(masa.idFromName("masa:kizilca:menzil:1").toString())!;
  const yolla = (s: SahteWebSoket, ileti: unknown) => masaKaydi().ornek.webSocketMessage(s, JSON.stringify(ileti));
  const eylem = (oturum: string, govde: Record<string, unknown>, istekNo = no()) => cagir("POST", "/v1/han/eylem", { oturum, govde: { masa: 1, istekNo, ...govde } });
  const anilma = async (oturum: string) =>
    ((await cagir("GET", "/v1/olaylar", { oturum })).govde.olaylar as any[]).filter((o) => /^olay\.han\.atisma(Kazandi|Berabere)$/.test(o.ozet.k));

  const ayse = await oyuncu("140000000000000000101", "Ayşe");
  const bora = await oyuncu("140000000000000000102", "Bora");
  const cem = await oyuncu("140000000000000000103", "Cem");
  const a = await baglan(ayse.oturum);
  const b = await baglan(bora.oturum);
  const c = await baglan(cem.oturum);
  for (const s of [a, b, c]) await yolla(s, { t: "otur" });
  assert.equal(c.son("durum")!.masa.koltuklar.some((p) => p?.ozan), false, "ozan olmayanda işaret yok");

  // Teklif ve kabul (HTTP eylemi, istekNo ile).
  const t1 = await eylem(ayse.oturum, { tur: "atisma", hedef: bora.hesap });
  assert.equal(t1.durum, 200, JSON.stringify(t1.govde));
  assert.equal(t1.govde.olay.durum, "teklif");
  const kabulNo = no();
  const k1 = await eylem(bora.oturum, { tur: "kabul", olay: t1.govde.olay.no }, kabulNo);
  assert.equal(k1.durum, 200, JSON.stringify(k1.govde));
  assert.equal(c.son("atisma")?.atisma?.sira, ayse.hesap);
  // Sahne atışma sürerken açılamaz; ikinci atışma teklifi reddedilir.
  await yolla(c, { t: "sahneAc" });
  assert.equal(c.son("hata")?.hata, "masa_mesgul");
  const t2 = await eylem(cem.oturum, { tur: "atisma", hedef: ayse.hesap });
  assert.equal(t2.govde.hata, "masa_mesgul");
  assert.equal(t2.durum, 409);

  await yolla(a, { t: "kita", metin: "Ben Ayşe'yim, sazım elde" });
  // Kabulün tekrarı (aynı istekNo) atışmayı yeniden başlatmaz.
  const k1b = await eylem(bora.oturum, { tur: "kabul", olay: t1.govde.olay.no }, kabulNo);
  assert.deepEqual(k1b.govde.olay, k1.govde.olay);
  assert.equal(c.son("atisma")?.atisma?.kita, 1);
  assert.equal(c.son("kita")?.metin, "Ben Ayşe'yim, sazım elde");

  // DO yeniden uyanır (bellek boşalır, soketler kalır): atışma depodan gelir, sıra sürer.
  masaKaydi().ornek = new MasaDO(masaCtx!, env, araclar);
  await yolla(a, { t: "kita", metin: "araya giremem" });
  assert.equal(a.son("hata")?.hata, "sira_degil");
  await yolla(b, { t: "kita", metin: "Bora der ki" });
  for (let i = 1; i < ATISMA_KITA; i++) {
    await yolla(a, { t: "kita", metin: `Ayşe ${i}` });
    await yolla(b, { t: "kita", metin: `Bora ${i}` });
  }
  assert.equal(c.son("atisma")?.atisma?.asama, "oylama");
  await yolla(a, { t: "oy", hedef: ayse.hesap });
  assert.equal(a.son("hata")?.hata, "oy_hakki_yok");
  await yolla(c, { t: "oy", hedef: bora.hesap });
  assert.deepEqual(a.son("atisma")?.son?.kazanan, [bora.hesap]);
  const sonOlay = a.son("olay")?.olay;
  assert.equal(sonOlay?.tur, "atismaSonuc");
  assert.deepEqual([sonOlay?.kim, sonOlay?.hedef, sonOlay?.sonuc, sonOlay?.oy, sonOlay?.olay], [bora.hesap, ayse.hesap, "kazandi", [0, 1], t1.govde.olay.no]);
  assert.equal(JSON.stringify(sonOlay).includes("Bora der ki"), false, "kıta metni kayda geçmez");

  // Yerleşimde anılma: üç tanığa (iki taraf + dinleyici) olay; tekrar teslim ikinci olay üretmez.
  for (const o of [ayse, bora, cem]) {
    const x = await anilma(o.oturum);
    assert.deepEqual(x.map((y) => y.ozet.k), ["olay.han.atismaKazandi"], o.hesap);
  }
  const tekrar = await yerlesimCagir(env, { islem: "hanOlayi", yerlesim: "kizilca", hesapId: bora.hesap, govde: { anahtar: `${sonOlay!.masa}#${sonOlay!.no}`, olay: sonOlay } });
  assert.deepEqual(tekrar, { ok: true, deger: { tekrar: true } });
  assert.equal((await anilma(bora.oturum)).length, 1);
  assert.equal(await masaKaydi().depolama.get("anma:kuyruk"), undefined, "teslim edilen kuyruktan düşer");
  assert.equal(await masaKaydi().depolama.get("etkinlik"), undefined, "biten atışma depoda kilit bırakmaz");

  // Uyanışta taraf yoksa (kapanış olayı kaçmış) atışma temizce düşer.
  const t3 = await eylem(ayse.oturum, { tur: "atisma", hedef: bora.hesap });
  await eylem(bora.oturum, { tur: "kabul", olay: t3.govde.olay.no });
  assert.ok(await masaKaydi().depolama.get("etkinlik"));
  b.readyState = 3;
  masaKaydi().ornek = new MasaDO(masaCtx!, env, araclar);
  await yolla(c, { t: "yaz", metin: "Bora gitti mi?" });
  assert.equal(a.son("atisma")?.son?.sonuc, "iptal");
  assert.equal(a.son("ileti")?.metin, "Bora gitti mi?", "kilit kalmaz");
  assert.equal(await masaKaydi().depolama.get("etkinlik"), undefined);

  // Sahne de depoda durur ve uyanışta geri gelir.
  await yolla(a, { t: "sahneAc" });
  masaKaydi().ornek = new MasaDO(masaCtx!, env, araclar);
  await yolla(c, { t: "yaz", metin: "sözsüz" });
  assert.equal(c.son("hata")?.hata, "soz_verilmedi");
  await yolla(a, { t: "sozVer", hedef: cem.hesap });
  await yolla(c, { t: "yaz", metin: "sözlü" });
  assert.equal(a.son("ileti")?.metin, "sözlü");
});
