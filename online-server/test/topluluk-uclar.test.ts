// Uçtan uca (E5–E7): GET /v1/topluluk, POST /v1/mesrep (istekNo tekrarı aynı yanıt), /v1/ortak-dert, /v1/senlik,
// /v1/zaviye ve /v1/hami hata yolları.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, YerlesimDO } from "../src/index.ts";
import type { Env } from "../src/tipler.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

type Nesne = Record<string, any>;
const GUN = 24 * 60 * 60 * 1000;

test("topluluk uçları: görünüm, meşrep seçimi, katkı ve zaviye kapıları", async () => {
  const anahtar = await rsaAnahtari("kid-1");
  const jwks = sahteJwks([anahtar]);
  const eskiFetch = globalThis.fetch;
  globalThis.fetch = jwks.getir;
  try {
    let saat = Date.now();
    const env = { GOOGLE_CLIENT_ID: ISTEMCI, OTURUM_ANAHTARI: "o".repeat(48) } as Env;
    env.HESAP = sahteAdAlani((ctx) => new HesapDO(ctx, env));
    env.DUNYA = sahteAdAlani((ctx) => new DunyaDO(ctx, env));
    const yerlesimler = sahteAdAlani((ctx) => new YerlesimDO(ctx, env, () => saat));
    env.YERLESIM = yerlesimler;
    const cagir = async (yontem: string, yol: string, secenek: { govde?: unknown; oturum?: string } = {}) => {
      const basliklar: Record<string, string> = {};
      if (secenek.oturum) basliklar.authorization = `Bearer ${secenek.oturum}`;
      const yanit = await isleyici.fetch(
        new Request(`https://kronikler-online.test${yol}`, {
          method: yontem,
          headers: basliklar,
          body: secenek.govde === undefined ? null : JSON.stringify(secenek.govde),
        }),
        env,
      );
      return { durum: yanit.status, govde: (await yanit.json()) as Nesne };
    };
    const token = await jwtImzala(anahtar, googleYuku(saat, { sub: "sub-ayse" }));
    const ayse = (await cagir("POST", "/v1/giris", { govde: { idToken: token } })).govde.oturum as string;
    const p = await cagir("POST", "/v1/profil", { oturum: ayse, govde: { ad: "Ayşe", cinsiyet: "kadın", yerlesim: "develi", istekNo: "profil-ayse" } });
    assert.equal(p.durum, 200, JSON.stringify(p.govde));

    const g0 = await cagir("GET", "/v1/topluluk", { oturum: ayse });
    assert.equal(g0.durum, 200, JSON.stringify(g0.govde));
    assert.equal(g0.govde.mesrep.kapali, "mesrep_erken");
    assert.equal(g0.govde.hami.kurallar.akce, 0);
    assert.equal(g0.govde.mudavim.seri, false);
    assert.equal(g0.govde.senlik.kurallar.kacirmaCezasi, 0);
    assert.equal(g0.govde.ortakDert.kurallar.sonuc.karakterCezasi, 0);

    const m0 = await cagir("POST", "/v1/mesrep", { oturum: ayse, govde: { el: "comert", cesaret: "orta", gurur: "orta", istekNo: "mesrep-0001" } });
    assert.equal(m0.govde.hata, "mesrep_erken");

    saat += 7 * GUN; // 14 oyun ayı: 13 yaş
    const { ornek } = [...yerlesimler.ornekler.values()][0]!;
    for (let i = 0; i < 5; i++) await ornek.alarm();
    const govde = { el: "hesapli", cesaret: "gozupek", gurur: "gururlu", istekNo: "mesrep-0002" };
    const m1 = await cagir("POST", "/v1/mesrep", { oturum: ayse, govde });
    const m1b = await cagir("POST", "/v1/mesrep", { oturum: ayse, govde });
    assert.equal(m1.durum, 200, JSON.stringify(m1.govde));
    assert.deepEqual(m1b.govde, m1.govde);
    assert.equal(m1.govde.mesrep.eksenler[0].secili, "hesapli");
    const m2 = await cagir("POST", "/v1/mesrep", { oturum: ayse, govde: { ...govde, el: "comert", istekNo: "mesrep-0003" } });
    assert.equal(m2.govde.hata, "mesrep_kilitli");

    assert.equal((await cagir("POST", "/v1/ortak-dert", { oturum: ayse, govde: { dert: "d999", katki: "elEmegi", istekNo: "dert-0001" } })).govde.hata, "dert_yok");
    assert.equal((await cagir("POST", "/v1/zaviye", { oturum: ayse, govde: { islem: "kur", ad: "Ahiler", sekil: "lale", renk: "al", istekNo: "zav-0001" } })).govde.hata, "yas_kapisi");
    assert.equal((await cagir("POST", "/v1/hami", { oturum: ayse, govde: { islem: "teklif", hedef: "o99", istekNo: "hami-0001" } })).govde.hata, "kisi_yok");
    const sn = await cagir("POST", "/v1/senlik", { oturum: ayse, govde: { katki: "hayir", tutar: 1, istekNo: "senlik-0001" } });
    assert.ok(sn.durum === 200 || sn.govde.hata === "senlik_yok", JSON.stringify(sn.govde));
    assert.equal((await cagir("GET", "/v1/mesrep", { oturum: ayse })).govde.hata, "yontem_yok");
  } finally {
    globalThis.fetch = eskiFetch;
  }
});
