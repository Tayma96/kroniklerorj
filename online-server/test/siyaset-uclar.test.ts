// Uçtan uca (Faz 7 + P1–P4): /v1/siyaset görünümü, doğrulanmış kimlik, şartlar, istekNo tekrar güvenliği,
// BolgeDO → SultanlikDO ay dönümü (rapor + haraç outbox).
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { BolgeDO, DunyaDO, HesapDO, SultanlikDO, YerlesimDO } from "../src/index.ts";
import { AY_MS } from "../src/saat.ts";
import type { BolgeDurumu } from "../src/siyaset/tipler.ts";
import type { Env } from "../src/tipler.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

type Nesne = Record<string, any>;

test("siyaset uçları: görünüm, şart, tekrar güvenliği, ay dönümü ve haraç", async () => {
  const anahtar = await rsaAnahtari("kid-1");
  const jwks = sahteJwks([anahtar]);
  const eskiFetch = globalThis.fetch;
  globalThis.fetch = jwks.getir;
  try {
    let saat = Date.now();
    const env = { GOOGLE_CLIENT_ID: ISTEMCI, OTURUM_ANAHTARI: "o".repeat(48) } as Env;
    env.HESAP = sahteAdAlani((ctx) => new HesapDO(ctx, env));
    env.DUNYA = sahteAdAlani((ctx) => new DunyaDO(ctx, env));
    env.YERLESIM = sahteAdAlani((ctx) => new YerlesimDO(ctx, env, () => saat));
    const bolgeler = sahteAdAlani((ctx) => new BolgeDO(ctx, env, () => saat));
    env.BOLGE = bolgeler;
    const sultanlik = sahteAdAlani((ctx) => new SultanlikDO(ctx, env, () => saat));
    env.SULTANLIK = sultanlik;
    const cagir = async (yontem: string, yol: string, secenek: { govde?: unknown; oturum?: string } = {}) => {
      const basliklar: Record<string, string> = {};
      if (secenek.oturum) basliklar.authorization = `Bearer ${secenek.oturum}`;
      const yanit = await isleyici.fetch(
        new Request(`https://kronikler-online.test${yol}`, { method: yontem, headers: basliklar, body: secenek.govde === undefined ? null : JSON.stringify(secenek.govde) }),
        env,
      );
      return { durum: yanit.status, govde: (await yanit.json()) as Nesne };
    };
    const token = await jwtImzala(anahtar, googleYuku(saat));
    const oturum = (await cagir("POST", "/v1/giris", { govde: { idToken: token } })).govde.oturum as string;
    await cagir("POST", "/v1/profil", { oturum, govde: { ad: "Ayşe", cinsiyet: "kadın", yerlesim: "develi", istekNo: "profil-0001" } });

    const g0 = await cagir("GET", "/v1/siyaset", { oturum });
    assert.equal(g0.durum, 200, JSON.stringify(g0.govde));
    assert.equal(g0.govde.bolge.id, "demirhan");
    assert.equal(g0.govde.makamlar.length, 8);
    assert.ok(g0.govde.makamlar.every((m: Nesne) => m.sahip.npc && m.etkin.neden === "sahip"));
    assert.equal(g0.govde.bolge.defter.tutarli, true);
    const kisi = g0.govde.benim.kisi as string;
    assert.match(kisi, /^develi\/o\d+$/);
    assert.equal((await cagir("GET", "/v1/siyaset?bolge=yenisehir", { oturum })).govde.benim, null, "başka bölge salt okunur");
    assert.deepEqual((await cagir("GET", "/v1/siyaset?bolge=yok", { oturum })).govde, { hata: "bolge_gecersiz" });
    assert.equal((await cagir("PUT", "/v1/siyaset", { oturum })).durum, 405);

    // Yeni karakter (12 yaş) şartı karşılamaz: hata önbelleğe girmez.
    assert.deepEqual((await cagir("POST", "/v1/siyaset", { oturum, govde: { islem: "aday", makam: "vali:demirhan" } })).govde, { hata: "istekno_gecersiz" });
    const a1 = await cagir("POST", "/v1/siyaset", { oturum, govde: { islem: "aday", makam: "vali:demirhan", istekNo: "aday-00001" } });
    assert.deepEqual([a1.durum, a1.govde.hata], [403, "yas_kapisi"], "12 yaşında makam adaylığı yok");
    const y0 = await cagir("POST", "/v1/siyaset", { oturum, govde: { islem: "yetki", makam: "kasabaAgasi:develi", yetki: "ortakDert", hedef: "arz", istekNo: "yetki-0001" } });
    assert.deepEqual([y0.durum, y0.govde.hata], [403, "yetki_yok"], "istemcinin makam iddiası kabul edilmez");

    // Oyuncuyu kasaba ağası yap (doğrudan durumda), DO'yu depodan yeniden aç.
    const hesap = env.HESAP.idFromName("google:110000000000000000001").toString();
    const [bk, kayit] = [...bolgeler.ornekler.entries()][0]!;
    const d = kayit.depolama.veri.get("bolge") as BolgeDurumu;
    const ag = d.koltuklar.find((k) => k.id === "kasabaAgasi:develi")!;
    ag.s = { npc: false, kisi, hesap, ad: "Ayşe", kume: [`h:${hesap}`], sg: saat, liyakat: 0 };
    kayit.depolama.veri.set("bolge", d);
    kayit.ornek = new BolgeDO({ id: env.BOLGE.idFromString(bk), storage: kayit.depolama } as unknown as DurableObjectState, env, () => saat);

    const govde = { islem: "yetki", makam: "kasabaAgasi:develi", yetki: "ortakDert", hedef: "arz", istekNo: "yetki-0002" };
    const y1 = await cagir("POST", "/v1/siyaset", { oturum, govde });
    const y2 = await cagir("POST", "/v1/siyaset", { oturum, govde });
    assert.equal(y1.durum, 200, JSON.stringify(y1.govde));
    assert.deepEqual(y2.govde, y1.govde, "aynı istekNo aynı yanıt");
    assert.equal(y1.govde.sonuc.dokum.hedef, "arz");
    assert.equal(y1.govde.gorunum.kayit.filter((s: Nesne) => s.tur === "yetki").length, 1);
    assert.deepEqual(y1.govde.gorunum.benim.makamlar, ["kasabaAgasi:develi"]);
    const yv = await cagir("POST", "/v1/siyaset", { oturum, govde: { islem: "yetki", makam: "kasabaAgasi:develi", yetki: "vergiOrani", deger: 3, istekNo: "yetki-0003" } });
    assert.deepEqual([yv.durum, yv.govde.hata], [403, "yetki_yok"], "yetki listesi kapalı");

    // İki ay dönümü: vergi → kasa → haraç Sultanlığa; görünüm Sultanlık özetini taşır, defter tutarlı.
    saat += 2 * AY_MS + 31 * 60 * 1000;
    const g1 = await cagir("GET", "/v1/siyaset?kayit=0", { oturum });
    assert.equal(g1.durum, 200);
    assert.equal(g1.govde.bolge.defter.tutarli, true);
    assert.ok(g1.govde.bolge.defter.gonderilen > 0, "haraç Sultanlığa ulaştı");
    assert.equal(g1.govde.sultanlik.sultan.npc, true);
    assert.equal(g1.govde.sultanlik.mogol.tutum, "memnun");
    assert.ok(g1.govde.kayitSayfasi.satirlar.length > 0);
    assert.equal(sultanlik.ornekler.size, 1, "tek Sultanlık örneği");
  } finally {
    globalThis.fetch = eskiFetch;
  }
});
