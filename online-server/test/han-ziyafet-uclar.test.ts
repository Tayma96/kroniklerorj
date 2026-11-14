// H7 ziyafet uçtan uca: gerçek Worker yönlendiricisi + gerçek DO sınıfları, sahte hibernation soketleri.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, MasaDO, YerlesimDO, YonetimDO } from "../src/index.ts";
import { yerlesimCagir } from "../src/ic.ts";
import type { Env } from "../src/tipler.ts";
import { ZIYAFET_EN_AZ_KONUK, ziyafetBedeli } from "../src/han/ziyafet.ts";
import { hibernasyonlu, sahteAraclar, type SahteWebSoket } from "./han-yardimci.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

type Yanit = { durum: number; govde: Record<string, any> };
let sayac = 0;
const no = (): string => `ziyfk-${String(++sayac).padStart(8, "0")}`;

test("H7 uçtan uca: ziyafet bütün masaya; bedel sunucuda, akçe düşer, nam mevsimde bir, tanıklık ve anons; konuk şartı; tekrar güvenli", async () => {
  const anahtar = await rsaAnahtari("kid-ziyfk");
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

  const ayse = await oyuncu("140000000000000000101", "Ayşe");
  const digerleri = [await oyuncu("140000000000000000102", "Bora"), await oyuncu("140000000000000000103", "Cem"), await oyuncu("140000000000000000104", "Dilek")];
  const tel = await yerlesimCagir(env, { islem: "yonetimTelafi", yerlesim: "kizilca", hesapId: ayse.hesap, govde: { tur: "akce", tutar: 50, gerekce: "test için ziyafet akçesi", istekNo: no() } });
  assert.ok(tel.ok);
  const para = async () => (await cagir("GET", "/v1/yerlesim", { oturum: ayse.oturum })).govde.ben.para as number;
  const a = await baglan(ayse.oturum);
  await yolla(a, { t: "otur" });
  const b = await baglan(digerleri[0]!.oturum);
  await yolla(b, { t: "otur" });
  const p0 = await para();
  const az = await cagir("POST", "/v1/han/ziyafet", { oturum: ayse.oturum, govde: { masa: 1, istekNo: no() } });
  assert.equal(az.govde.hata, "ziyafet_konuk_az", `en az ${ZIYAFET_EN_AZ_KONUK} konuk`);
  assert.equal(az.durum, 409);
  assert.equal(await para(), p0, "şart tutmazsa ödeme yok");
  for (const d of digerleri.slice(1)) await yolla(await baglan(d.oturum), { t: "otur" });

  const govde = { masa: 1, istekNo: no() };
  const z = await cagir("POST", "/v1/han/ziyafet", { oturum: ayse.oturum, govde });
  assert.equal(z.durum, 200, JSON.stringify(z.govde));
  assert.equal(z.govde.bedel, ziyafetBedeli(3));
  assert.equal(z.govde.para, p0 - ziyafetBedeli(3));
  assert.equal(z.govde.nam, 1);
  assert.deepEqual([b.son("anons")?.anons.tur, b.son("anons")?.anons.oge, b.son("anons")?.anons.hedef], ["ziyafet", "ziyafet", undefined]);
  const z2 = await cagir("POST", "/v1/han/ziyafet", { oturum: ayse.oturum, govde });
  assert.deepEqual(z2.govde, z.govde, "aynı istekNo ikinci kez ödetmez");
  assert.equal(await para(), p0 - ziyafetBedeli(3));
  const olaylar = ((await cagir("GET", "/v1/olaylar", { oturum: digerleri[0]!.oturum })).govde.olaylar as any[]).filter((o) => o.ozet.k === "olay.han.ziyafet");
  assert.equal(olaylar.length, 1);
  assert.deepEqual([olaylar[0].ozet.p.masa, olaylar[0].ozet.p.konuk, olaylar[0].ozet.p.bedel], [1, 3, ziyafetBedeli(3)]);
  const z3 = await cagir("POST", "/v1/han/ziyafet", { oturum: ayse.oturum, govde: { masa: 1, istekNo: no() } });
  assert.equal(z3.durum, 200);
  assert.equal(z3.govde.nam, 0, "nam mevsimde bir");
  void a;
});
