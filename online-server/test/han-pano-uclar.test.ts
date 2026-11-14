// H10 ilan panosu uçtan uca: gerçek Worker yönlendiricisi + gerçek DO sınıfları, sahte hibernation soketleri.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, MasaDO, YerlesimDO, YonetimDO } from "../src/index.ts";
import { yerlesimCagir } from "../src/ic.ts";
import type { Env } from "../src/tipler.ts";
import { PANO_GUNLUK } from "../src/han/pano.ts";
import { hibernasyonlu, sahteAraclar, type SahteWebSoket } from "./han-yardimci.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

type Yanit = { durum: number; govde: Record<string, any> };
let sayac = 0;
const no = (): string => `panok-${String(++sayac).padStart(8, "0")}`;

test("H10 uçtan uca: ilan as, oku, günlük sınır, filtre, yalnız sahibi siler, ilan şikâyeti ilan kimliğiyle", async () => {
  const anahtar = await rsaAnahtari("kid-panok");
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

  const ayse = await oyuncu("150000000000000000101", "Ayşe");
  const bora = await oyuncu("150000000000000000102", "Bora");
  const as = (oturum: string, govde: Record<string, unknown>) => cagir("POST", "/v1/han/pano", { oturum, govde: { tur: "etkinlik", istekNo: no(), ...govde } });
  const govde = { metin: "Cuma akşamı handa ozan atışması, ibne gelmesin", tur: "ozan", istekNo: no() };
  const r1 = await cagir("POST", "/v1/han/pano", { oturum: ayse.oturum, govde });
  assert.equal(r1.durum, 200, JSON.stringify(r1.govde));
  assert.equal(r1.govde.ilanlar[0].metin, "Cuma akşamı handa ozan atışması, ••• gelmesin");
  const tekrar = await cagir("POST", "/v1/han/pano", { oturum: ayse.oturum, govde });
  assert.deepEqual(tekrar.govde, r1.govde, "aynı istekNo aynı ilan");
  for (let i = 1; i < PANO_GUNLUK; i++) assert.equal((await as(ayse.oturum, { metin: `ilan ${i}` })).durum, 200);
  assert.equal((await as(ayse.oturum, { metin: "fazla" })).govde.hata, "eylem_siniri");
  const oku = await cagir("GET", "/v1/han/pano", { oturum: bora.oturum });
  assert.equal(oku.durum, 200);
  assert.equal(oku.govde.ilanlar.length, PANO_GUNLUK);
  assert.ok(oku.govde.ilanlar.every((x: any) => x.benim === false && x.kisi.ad === "Ayşe"));
  const id = r1.govde.ilan as string;
  const sil = await cagir("POST", "/v1/han/pano/sil", { oturum: bora.oturum, govde: { ilan: id, istekNo: no() } });
  assert.equal(sil.govde.hata, "yetki_yok");
  const sk = await cagir("POST", "/v1/sikayet", { oturum: bora.oturum, govde: { ilan: id, neden: "kufur", istekNo: no() } });
  assert.equal(sk.durum, 200, JSON.stringify(sk.govde));
  const yonetimJson = [...yonetim.ornekler.values()].map((o) => JSON.stringify([...o.depolama.veri.values()])).join();
  assert.ok(yonetimJson.includes(`"ilan":{"id":"${id}"`), "şikâyette ilan kimliği");
  assert.ok(yonetimJson.includes(ayse.hesap), "hedef ilan sahibi");
  const sil2 = await cagir("POST", "/v1/han/pano/sil", { oturum: ayse.oturum, govde: { ilan: id, istekNo: no() } });
  assert.equal(sil2.durum, 200, JSON.stringify(sil2.govde));
  assert.equal(sil2.govde.ilanlar.length, PANO_GUNLUK - 1);
  assert.equal((await as(ayse.oturum, { metin: "sildim yeniden asarım" })).govde.hata, "eylem_siniri", "silip yeniden asmak sınırı aşmaz");
  const yok = await cagir("POST", "/v1/sikayet", { oturum: bora.oturum, govde: { ilan: id, neden: "kufur", istekNo: no() } });
  assert.equal(yok.govde.hata, "ilan_yok");
});
