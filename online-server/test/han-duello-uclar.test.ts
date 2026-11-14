// H6 düello uçtan uca: gerçek Worker yönlendiricisi + gerçek DO sınıfları, sahte hibernation soketleri.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, MasaDO, YerlesimDO, YonetimDO } from "../src/index.ts";
import { yerlesimCagir } from "../src/ic.ts";
import type { Env } from "../src/tipler.ts";
import { hibernasyonlu, sahteAraclar, type SahteWebSoket } from "./han-yardimci.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

type Yanit = { durum: number; govde: Record<string, any> };
let sayac = 0;
const no = (): string => `duelk-${String(++sayac).padStart(8, "0")}`;

test("H6 uçtan uca: meydan okuma teklif olur, kabul düelloya gider; kapı tutmazsa 'gerçekleşmedi'; tekrar teslim etkisiz; teklif düşer; kabulde kavga yasağı", async () => {
  const anahtar = await rsaAnahtari("kid-duelk");
  globalThis.fetch = sahteJwks([anahtar]).getir;
  const araclar = sahteAraclar();
  const env = { GOOGLE_CLIENT_ID: ISTEMCI, OTURUM_ANAHTARI: "o".repeat(48) } as Env;
  const hesap = sahteAdAlani((ctx) => new HesapDO(ctx, env));
  const masa = sahteAdAlani((ctx) => new MasaDO(hibernasyonlu(ctx), env, araclar));
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

  const ayse = await oyuncu("130000000000000000101", "Ayşe");
  const bora = await oyuncu("130000000000000000102", "Bora");
  const a = await baglan(ayse.oturum);
  const b = await baglan(bora.oturum);
  await yolla(a, { t: "otur" });
  await yolla(b, { t: "otur" });
  const eylem = (oturum: string, govde: Record<string, unknown>) => cagir("POST", "/v1/han/eylem", { oturum, govde: { masa: 1, istekNo: no(), ...govde } });

  const t1 = await eylem(ayse.oturum, { tur: "meydanOku", hedef: bora.hesap });
  assert.equal(t1.durum, 200, JSON.stringify(t1.govde));
  assert.equal(t1.govde.olay.durum, "teklif");
  const k1 = await eylem(bora.oturum, { tur: "kabul", olay: t1.govde.olay.no });
  assert.equal(k1.durum, 200, JSON.stringify(k1.govde));
  assert.equal(k1.govde.olay.teklifTur, "meydanOku");
  const duello = async (oturum: string) =>
    ((await cagir("GET", "/v1/olaylar", { oturum })).govde.olaylar as any[]).filter((o) => o.ozet.k.startsWith("olay.han.duello"));
  const ad = await duello(ayse.oturum);
  assert.deepEqual(ad.map((o) => [o.ozet.k, o.ozet.p.neden]), [["olay.han.duelloOlmadi", "yas"]], "12 yaşında düello olmaz");
  assert.equal((await duello(bora.oturum)).length, 1);
  const olay = k1.govde.olay;
  const tekrar = await yerlesimCagir(env, { islem: "hanOlayi", yerlesim: "kizilca", hesapId: bora.hesap, govde: { anahtar: `${olay.masa}#${olay.no}`, olay } });
  assert.deepEqual(tekrar, { ok: true, deger: { tekrar: true } });
  assert.equal((await duello(ayse.oturum)).length, 1, "tekrar teslim ikinci olay üretmez");

  // Meydan okuyan kalkıp yeniden oturursa teklif düşer.
  const t2 = await eylem(ayse.oturum, { tur: "meydanOku", hedef: bora.hesap });
  await yolla(a, { t: "kalk" });
  await yolla(a, { t: "otur" });
  const k2 = await eylem(bora.oturum, { tur: "kabul", olay: t2.govde.olay.no });
  assert.equal(k2.govde.hata, "teklif_dustu");
  assert.equal(k2.durum, 409);

  // Teklif açıkken masa başı kavgayı yasaklarsa kabul reddedilir.
  const t3 = await eylem(ayse.oturum, { tur: "meydanOku", hedef: bora.hesap });
  assert.equal(t3.durum, 200);
  await yolla(b, { t: "ayar", kavgaYasak: true });
  const k3 = await eylem(bora.oturum, { tur: "kabul", olay: t3.govde.olay.no });
  assert.equal(k3.govde.hata, "kavga_yasak");
  void a.son;
});
