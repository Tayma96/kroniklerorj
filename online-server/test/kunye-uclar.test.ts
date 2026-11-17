// Künye uçtan uca: gerçek yönlendirici + gerçek DO sınıfları. Numara girişte tembel üretilir, kalıcıdır;
// arama ve oyuncu sayfası izin listesine uyar; aramaya özel dakikalık kova uygulanır.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, YerlesimDO } from "../src/index.ts";
import type { Env } from "../src/tipler.ts";
import { ARAMA_DAKIKA_SINIRI, SAYFA_ALANLARI } from "../src/kunye/hesap.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

function ortam(): Env {
  const env = { GOOGLE_CLIENT_ID: `web-istemci,${ISTEMCI}`, OTURUM_ANAHTARI: "o".repeat(48) } as Env;
  env.HESAP = sahteAdAlani((ctx) => new HesapDO(ctx, env));
  env.DUNYA = sahteAdAlani((ctx) => new DunyaDO(ctx, env));
  env.YERLESIM = sahteAdAlani((ctx) => new YerlesimDO(ctx, env));
  return env;
}

function istemci(env: Env) {
  return async (yontem: string, yol: string, secenek: { govde?: unknown; oturum?: string } = {}) => {
    const basliklar: Record<string, string> = {};
    if (secenek.oturum) basliklar.authorization = `Bearer ${secenek.oturum}`;
    if (secenek.govde !== undefined) basliklar["content-type"] = "application/json";
    const yanit = await isleyici.fetch(
      new Request(`https://kronikler-online.test${yol}`, { method: yontem, headers: basliklar, body: secenek.govde === undefined ? null : JSON.stringify(secenek.govde) }),
      env,
    );
    return { durum: yanit.status, govde: (await yanit.json()) as Record<string, unknown> };
  };
}

test("künye uçları: numara, arama, sayfa, hız kovası", async () => {
  const anahtar = await rsaAnahtari("kid-k");
  const jwks = sahteJwks([anahtar]);
  const eskiFetch = globalThis.fetch;
  globalThis.fetch = jwks.getir;
  try {
    const env = ortam();
    const cagir = istemci(env);
    const simdi = Date.now();
    const gir = async (sub: string) => (await cagir("POST", "/v1/giris", { govde: { idToken: await jwtImzala(anahtar, googleYuku(simdi, { sub })) } })).govde.oturum as string;
    const o1 = await gir("310000000000000000001");
    const o2 = await gir("320000000000000000002");

    // Profilden önce de numara vardır (girişte üretildi); hesaba bağlıdır, tekrar aynısı döner.
    const n1 = (await cagir("GET", "/v1/numara", { oturum: o1 })).govde.numara as number;
    assert.match(String(n1), /^[1-9][0-9]{7}$/);
    assert.equal((await cagir("GET", "/v1/numara", { oturum: o1 })).govde.numara, n1);
    const yeniden = await gir("310000000000000000001");
    assert.equal((await cagir("GET", "/v1/numara", { oturum: yeniden })).govde.numara, n1);
    const n2 = (await cagir("GET", "/v1/numara", { oturum: o2 })).govde.numara as number;
    assert.notEqual(n1, n2);
    assert.equal((await cagir("POST", "/v1/numara", { oturum: o1 })).durum, 405);

    // Profilsiz arama yapılmaz.
    assert.deepEqual((await cagir("GET", "/v1/oyuncu-ara?ad=Kerem", { oturum: o1 })).govde, { hata: "profil_yok" });

    const p1 = await cagir("POST", "/v1/profil", { oturum: o1, govde: { ad: "Kerem", cinsiyet: "erkek", yerlesim: "develi", istekNo: "kunye-istek-0001" } });
    assert.equal(p1.durum, 200);
    const p2 = await cagir("POST", "/v1/profil", { oturum: o2, govde: { ad: "Zeynep", cinsiyet: "kadın", yerlesim: "develi", istekNo: "kunye-istek-0002" } });
    assert.equal(p2.durum, 200);

    const kisa = await cagir("GET", "/v1/oyuncu-ara?ad=ke", { oturum: o2 });
    assert.deepEqual([kisa.durum, kisa.govde], [400, { hata: "arama_kisa" }]);
    const ad = await cagir("GET", `/v1/oyuncu-ara?ad=${encodeURIComponent("KER")}`, { oturum: o2 });
    assert.equal(ad.durum, 200);
    assert.deepEqual(ad.govde, { sonuclar: [{ numara: n1, ad: "Kerem", yerlesim: { id: "develi", ad: "Develi" }, beylik: { id: "demirhan", ad: "Demirhan Beyliği" } }], imlec: null });
    const no = await cagir("GET", `/v1/oyuncu-ara?no=${n1}`, { oturum: o2 });
    assert.deepEqual((no.govde.sonuclar as { numara: number }[]).map((x) => x.numara), [n1]);
    const biçimsiz = await cagir("GET", "/v1/oyuncu-ara?no=0123", { oturum: o2 });
    assert.deepEqual([biçimsiz.durum, biçimsiz.govde], [400, { hata: "numara_gecersiz" }]);

    const sayfa = await cagir("GET", `/v1/kunye/${n1}?dil=tr`, { oturum: o2 });
    assert.equal(sayfa.durum, 200);
    assert.deepEqual(Object.keys(sayfa.govde).sort(), SAYFA_ALANLARI);
    assert.equal(sayfa.govde.ad, "Kerem");
    assert.equal(sayfa.govde.ben, false);
    assert.equal(sayfa.govde.ayniYerlesim, true);
    assert.equal((sayfa.govde.kisi as { yerlesim: string }).yerlesim, "develi");
    const metin = JSON.stringify(sayfa.govde);
    for (const yasak of ["do-", "\"para\"", "\"pa\"", "envanter", "takat", "beceri", "sub"]) assert.ok(!metin.includes(yasak), yasak);
    // Sayfadaki kimlik mevcut sosyal uca bağlanır.
    const oyuncu = await cagir("GET", `/v1/oyuncu/${(sayfa.govde.kisi as { id: string }).id}`, { oturum: o2 });
    assert.equal(oyuncu.durum, 200);
    assert.equal(oyuncu.govde.ad, "Kerem");
    const kendi = await cagir("GET", `/v1/kunye/${n1}`, { oturum: o1 });
    assert.equal(kendi.govde.ben, true);
    assert.equal((await cagir("GET", "/v1/kunye/99999999x", { oturum: o2 })).durum, 400);

    // Engel: Kerem Zeynep'i engeller → iki yönde de arama ve sayfa kapanır.
    const zeynepId = (await cagir("GET", `/v1/kunye/${n2}`, { oturum: o1 })).govde.kisi as { id: string };
    const eg = await cagir("POST", "/v1/engelle", { oturum: o1, govde: { hedef: zeynepId.id, istekNo: "kunye-engel-0001" } });
    assert.equal(eg.durum, 200);
    assert.deepEqual((await cagir("GET", `/v1/kunye/${n1}`, { oturum: o2 })).govde, { hata: "kisi_yok" });
    assert.deepEqual((await cagir("GET", "/v1/oyuncu-ara?ad=kerem", { oturum: o2 })).govde, { sonuclar: [], imlec: null });
    assert.deepEqual((await cagir("GET", `/v1/oyuncu-ara?no=${n2}`, { oturum: o1 })).govde, { sonuclar: [], imlec: null });

    // Aramaya özel dakikalık kova (genel sınırdan dar).
    const o3 = await gir("330000000000000000003");
    await cagir("POST", "/v1/profil", { oturum: o3, govde: { ad: "Ali Can", cinsiyet: "erkek", yerlesim: "misis", istekNo: "kunye-istek-0003" } });
    const durumlar: number[] = [];
    for (let i = 0; i < ARAMA_DAKIKA_SINIRI + 1; i++) durumlar.push((await cagir("GET", "/v1/oyuncu-ara?ad=zey", { oturum: o3 })).durum);
    assert.deepEqual(durumlar.slice(0, ARAMA_DAKIKA_SINIRI), Array(ARAMA_DAKIKA_SINIRI).fill(200));
    assert.equal(durumlar[ARAMA_DAKIKA_SINIRI], 429);
    // Kendi numaran kovaya takılmaz.
    assert.equal((await cagir("GET", "/v1/numara", { oturum: o3 })).durum, 200);
  } finally {
    globalThis.fetch = eskiFetch;
  }
});
