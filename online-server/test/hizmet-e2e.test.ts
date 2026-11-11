// E4.3-A: gerçek HTTP akışı; beceri açma, hazırlama, ilan, DO yeniden açılışı, çevrimdışı satıcı ve istekNo.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, YerlesimDO } from "../src/index.ts";
import type { Env } from "../src/tipler.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

type Nesne = Record<string, any>;
const GUN = 24 * 60 * 60 * 1000;
const DK = 60 * 1000;

test("hizmet pazarı HTTP: gerçek beceri, çevrimdışı satıcı ve istekNo tekrarı", async () => {
  const anahtar = await rsaAnahtari("kid-hizmet-e2e");
  const jwks = sahteJwks([anahtar]);
  const eskiFetch = globalThis.fetch;
  globalThis.fetch = jwks.getir;
  try {
    let saat = Date.now();
    const env = { GOOGLE_CLIENT_ID: ISTEMCI, OTURUM_ANAHTARI: "h".repeat(48) } as Env;
    env.HESAP = sahteAdAlani((ctx) => new HesapDO(ctx, env));
    env.DUNYA = sahteAdAlani((ctx) => new DunyaDO(ctx, env));
    const yerlesimler = sahteAdAlani((ctx) => new YerlesimDO(ctx, env, () => saat));
    env.YERLESIM = yerlesimler;

    const cagir = async (yontem: string, yol: string, secenek: { govde?: unknown; oturum?: string } = {}) => {
      const basliklar: Record<string, string> = {};
      if (secenek.oturum) basliklar.authorization = `Bearer ${secenek.oturum}`;
      const yanit = await isleyici.fetch(new Request(`https://kronikler-online.test${yol}`, {
        method: yontem, headers: basliklar, body: secenek.govde === undefined ? null : JSON.stringify(secenek.govde),
      }), env);
      return { durum: yanit.status, govde: (await yanit.json()) as Nesne };
    };
    let istekSayaci = 0;
    const yaz = (yol: string, govde: Nesne, oturum: string, istekNo?: string) =>
      cagir("POST", yol, { oturum, govde: { ...govde, istekNo: istekNo ?? `hizmet-e2e-${String(++istekSayaci).padStart(4, "0")}` } });
    const giris = async (sub: string, ad: string) => {
      const token = await jwtImzala(anahtar, googleYuku(saat, { sub }));
      const g = await cagir("POST", "/v1/giris", { govde: { idToken: token } });
      assert.equal(g.durum, 200, JSON.stringify(g.govde));
      const oturum = g.govde.oturum as string;
      const p = await cagir("POST", "/v1/profil", { oturum, govde: {
        ad, cinsiyet: "kadın", yerlesim: "develi", istekNo: `profil-${sub}`,
      } });
      assert.equal(p.durum, 200, JSON.stringify(p.govde));
      return oturum;
    };
    const ayse = await giris("hizmet-satici", "Ayşe");
    const zehra = await giris("hizmet-alici", "Zehra");
    const ben = async (oturum: string) => {
      const r = await cagir("GET", "/v1/yerlesim", { oturum });
      assert.equal(r.durum, 200, JSON.stringify(r.govde));
      return r.govde.ben;
    };

    saat += 7 * GUN;
    const { ornek } = [...yerlesimler.ornekler.values()][0]!;
    for (let i = 0; i < 5; i++) await ornek.alarm();

    // Ozan becerisini oyun içi ezber yamaklığıyla kazanır: 6 tecrübe → 1 puan → 15 dk öğrenme.
    assert.equal((await yaz("/v1/meslek", { islem: "sec", meslek: "ozan" }, ayse)).durum, 200);
    for (let i = 0; i < 3; i++) assert.equal((await yaz("/v1/temel-is", { is: "ezber" }, ayse)).durum, 200);
    saat += GUN;
    for (let i = 0; i < 3; i++) await ornek.alarm();
    for (let i = 0; i < 3; i++) assert.equal((await yaz("/v1/temel-is", { is: "ezber" }, ayse)).durum, 200);
    const ogren = await yaz("/v1/beceri/ogren", { meslek: "ozan", dugum: "ozan.turkuMani" }, ayse);
    assert.equal(ogren.durum, 200, JSON.stringify(ogren.govde));
    saat += 15 * DK;
    await ben(ayse);
    saat += 7 * GUN;
    for (let i = 0; i < 5; i++) await ornek.alarm();

    const katalog = await cagir("GET", "/v1/hizmet", { oturum: ayse });
    assert.equal(katalog.durum, 200, JSON.stringify(katalog.govde));
    assert.equal(katalog.govde.katalog.find((x: Nesne) => x.id === "turku").acik, true);
    const zPara0 = (await ben(zehra)).para as number;
    const aPara0 = (await ben(ayse)).para as number;
    const zGonul0 = (await ben(zehra)).hal.gonul.deger as number;

    const hazir = await yaz("/v1/hizmet/hazirla", { hizmet: "turku", adet: 1 }, ayse, "hizmet-hazir-0001");
    assert.equal(hazir.durum, 200, JSON.stringify(hazir.govde));
    const ilanGirdi = { stok: hazir.govde.stok.id as string, adet: 1, fiyat: 1 };
    const ilan = await yaz("/v1/hizmet/ilan", ilanGirdi, ayse, "hizmet-ilan-0001");
    const ilanTekrar = await yaz("/v1/hizmet/ilan", ilanGirdi, ayse, "hizmet-ilan-0001");
    assert.equal(ilan.durum, 200, JSON.stringify(ilan.govde));
    assert.deepEqual(ilanTekrar.govde, ilan.govde);
    const ilanId = ilan.govde.ilan.id as string;

    // Aynı depoyla yeni DO örneği: satıcı bellekte yüklü değildir; satın alma satıcıyı depodan yüklemelidir.
    const [doKey, kayit] = [...yerlesimler.ornekler.entries()][0]!;
    const doId = yerlesimler.idFromString(doKey);
    yerlesimler.ornekler.set(doKey, {
      ornek: new YerlesimDO({ id: doId, storage: kayit.depolama } as any, env, () => saat),
      depolama: kayit.depolama,
    });

    const satinGirdi = { ilan: ilanId, adet: 1 };
    const satin = await yaz("/v1/hizmet/satin-al", satinGirdi, zehra, "hizmet-satin-0001");
    const satinTekrar = await yaz("/v1/hizmet/satin-al", satinGirdi, zehra, "hizmet-satin-0001");
    assert.equal(satin.durum, 200, JSON.stringify(satin.govde));
    assert.deepEqual(satinTekrar.govde, satin.govde, "aynı istekNo ikinci ödeme/etki üretmez");

    const z1 = await ben(zehra);
    const a1 = await ben(ayse);
    assert.equal(z1.para, zPara0 - 1);
    assert.equal(a1.para, aPara0 + 1);
    assert.equal(z1.hal.gonul.deger, zGonul0 + 3);
  } finally {
    globalThis.fetch = eskiFetch;
  }
});
