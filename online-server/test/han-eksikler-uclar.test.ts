// Han eksikleri H1–H5 uçtan uca: gerçek Worker yönlendiricisi + gerçek DO sınıfları, sahte hibernation soketleri.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, MasaDO, YerlesimDO, YonetimDO } from "../src/index.ts";
import { yerlesimCagir } from "../src/ic.ts";
import { OLAY_KUYRUK } from "../src/han/hesap-kopru.ts";
import { YENI_HESAP_ILETI } from "../src/han/kurallar.ts";
import type { Env } from "../src/tipler.ts";
import { hibernasyonlu, sahteAraclar, type SahteWebSoket } from "./han-yardimci.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

type Yanit = { durum: number; govde: Record<string, any> };
let sayac = 0;
const no = (): string => `hanek-${String(++sayac).padStart(8, "0")}`;

test("H1–H5 uçtan uca: tanıdık sayısı, yeni hesap sınırı, olay tanıklığı ve tekrar güvenliği, şikâyette masa, masa kilidi", async () => {
  const anahtar = await rsaAnahtari("kid-hanek");
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

  const ayse = await oyuncu("120000000000000000101", "Ayşe");
  const bora = await oyuncu("120000000000000000102", "Bora");
  const cem = await oyuncu("120000000000000000103", "Cem");
  const a = await baglan(ayse.oturum);
  const b = await baglan(bora.oturum);
  await yolla(a, { t: "otur" });
  await yolla(b, { t: "otur" });

  // H1: masa özetinde yalnız sayı; oturan kimlikleri yok; dolu masa önde değil (sıra sunucuda).
  const liste = await cagir("GET", "/v1/han", { oturum: cem.oturum });
  assert.equal(liste.durum, 200);
  assert.deepEqual(liste.govde.masalar.map((m: any) => typeof m.tanidik), ["number", "number"]);
  assert.equal(JSON.stringify(liste.govde).includes(ayse.hesap), false, "kimlik sızmaz");
  assert.equal(liste.govde.masalar[0].no, 1, "oturanı olup yeri olan masa boş masadan önce");

  // H3: yeni hesap (24 sa içinde) uzun ileti yazamaz.
  await yolla(a, { t: "yaz", metin: "x".repeat(YENI_HESAP_ILETI + 1) });
  assert.equal(a.son("hata")?.hata, "metin_gecersiz");
  await yolla(a, { t: "yaz", metin: "merhaba ibne" });
  assert.equal(b.son("ileti")?.metin, "merhaba •••");

  // H5: ihbar → oturanlara tanıklık olayı; yeniden teslim ikinci etki üretmez.
  const e = await cagir("POST", "/v1/han/eylem", { oturum: ayse.oturum, govde: { masa: 1, tur: "ihbar", hedef: bora.hesap, istekNo: no() } });
  assert.equal(e.durum, 200, JSON.stringify(e.govde));
  const hanOlaylari = async (oturum: string) =>
    ((await cagir("GET", "/v1/olaylar", { oturum })).govde.olaylar as any[]).filter((o) => o.ozet.k.startsWith("olay.han."));
  const ayseOlay = await hanOlaylari(ayse.oturum);
  assert.deepEqual(ayseOlay.map((o) => o.ozet.k), ["olay.han.ihbar"]);
  assert.equal(ayseOlay[0].gorunurluk, "ozel");
  assert.equal((await hanOlaylari(bora.oturum)).length, 1, "oturan hedef de tanık");
  assert.equal((await hanOlaylari(cem.oturum)).length, 0, "masada olmayan görmez");
  const olay = e.govde.olay;
  const tekrar = await yerlesimCagir<{ tekrar: boolean }>(env, { islem: "hanOlayi", yerlesim: "kizilca", hesapId: ayse.hesap, govde: { anahtar: `${olay.masa}#${olay.no}`, olay } });
  assert.deepEqual(tekrar, { ok: true, deger: { tekrar: true } });
  assert.equal((await hanOlaylari(ayse.oturum)).length, 1);
  const sahte = await yerlesimCagir(env, { islem: "hanOlayi", yerlesim: "kizilca", hesapId: bora.hesap, govde: { anahtar: `${olay.masa}#${olay.no}`, olay } });
  assert.equal(sahte.ok, false, "başkasının olayı kabul edilmez");
  const hesapDepo = [...hesap.ornekler.values()].map((o) => o.depolama.veri);
  assert.ok(hesapDepo.every((v) => !v.has(OLAY_KUYRUK)), "giden kutusu boşaldı");

  // H4: masadan şikâyet kaydında masa kimliği.
  await yolla(b, { t: "rapor", hedef: ayse.hesap, neden: "kufur", istekNo: no() });
  assert.ok(b.son("rapor"), JSON.stringify(b.son("hata")));
  const yonetimJson = [...yonetim.ornekler.values()].map((o) => JSON.stringify([...o.depolama.veri.values()])).join();
  assert.ok(yonetimJson.includes('"masa":{"ad":"masa:kizilca:menzil:1","no":1}'), "şikâyette masa adı ve numarası");

  // H2: masa başı kilitler (kalıcı), yeni gelen oturamaz; son oturan kalkınca ayar silinir.
  await yolla(b, { t: "ayar", kilitli: true });
  assert.equal(b.son("hata")?.hata, "yetki_yok");
  await yolla(a, { t: "ayar", kilitli: true });
  assert.equal((masaKaydi().depolama.veri.get("ayar") as any)?.kilitli, true);
  const c = await baglan(cem.oturum);
  await yolla(c, { t: "otur" });
  assert.equal(c.son("hata")?.hata, "masa_kilitli");
  const kilitliListe = await cagir("GET", "/v1/han", { oturum: cem.oturum });
  assert.equal(kilitliListe.govde.masalar.find((m: any) => m.no === 1).ayar.kilitli, true);
  await yolla(a, { t: "kalk" });
  await yolla(b, { t: "kalk" });
  assert.equal(masaKaydi().depolama.veri.has("ayar"), false, "boş masa varsayılana döner");
  await yolla(c, { t: "otur" });
  assert.equal(c.son("durum")?.masa.koltuklar[0]?.hesap, cem.hesap);
});
