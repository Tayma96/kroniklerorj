// Uçtan uca kervan (D2): GET/POST /v1/kervan, POST /v1/kervan/haber; yöntem ve doğrulama hataları, düğüm kapısı,
// önizleme = gerçek, tekrar güvenliği, ay dönümünde varış ve hasılat, olay.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { BolgeDO, DunyaDO, HesapDO, SultanlikDO, YerlesimDO } from "../src/index.ts";
import { AY_MS } from "../src/saat.ts";
import type { Env } from "../src/tipler.ts";
import { seviyeVer } from "../src/yerlesim/beceri.ts";
import type { Karakter, Olay, Sakin } from "../src/yerlesim/tipler.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

type Nesne = Record<string, any>;

test("kervan uçları: önizleme, kalkış, tekrar, varış ve hasılat, fiyat haberi", async () => {
  const anahtar = await rsaAnahtari("kid-1");
  const jwks = sahteJwks([anahtar]);
  const eskiFetch = globalThis.fetch;
  globalThis.fetch = jwks.getir;
  try {
    const zaman = { saat: Date.now() };
    const env = { GOOGLE_CLIENT_ID: ISTEMCI, OTURUM_ANAHTARI: "o".repeat(48) } as Env;
    env.HESAP = sahteAdAlani((ctx) => new HesapDO(ctx, env));
    env.DUNYA = sahteAdAlani((ctx) => new DunyaDO(ctx, env));
    const yerlesimler = sahteAdAlani((ctx) => new YerlesimDO(ctx, env, () => zaman.saat));
    env.YERLESIM = yerlesimler;
    env.BOLGE = sahteAdAlani((ctx) => new BolgeDO(ctx, env, () => zaman.saat));
    env.SULTANLIK = sahteAdAlani((ctx) => new SultanlikDO(ctx, env, () => zaman.saat));
    const cagir = async (yontem: string, yol: string, secenek: { govde?: unknown; oturum?: string } = {}) => {
      const basliklar: Record<string, string> = {};
      if (secenek.oturum) basliklar.authorization = `Bearer ${secenek.oturum}`;
      const yanit = await isleyici.fetch(
        new Request(`https://kronikler-online.test${yol}`, { method: yontem, headers: basliklar, body: secenek.govde === undefined ? null : JSON.stringify(secenek.govde) }),
        env,
      );
      return { durum: yanit.status, govde: (await yanit.json()) as Nesne };
    };
    const token = await jwtImzala(anahtar, googleYuku(zaman.saat));
    const oturum = (await cagir("POST", "/v1/giris", { govde: { idToken: token } })).govde.oturum as string;
    const p0 = await cagir("POST", "/v1/profil", { oturum, govde: { ad: "Kervancı", cinsiyet: "erkek", yerlesim: "develi", istekNo: "profil-0001" } });
    assert.equal(p0.durum, 200, JSON.stringify(p0.govde));

    // Yöntem ve doğrulama.
    assert.equal((await cagir("PUT", "/v1/kervan", { oturum })).durum, 405);
    assert.equal((await cagir("GET", "/v1/kervan/haber", { oturum })).durum, 405);
    assert.deepEqual((await cagir("POST", "/v1/kervan", { oturum, govde: { hedef: "karapinar", mallar: { odun: 1 } } })).govde, { hata: "istekno_gecersiz" });
    const ayni = await cagir("GET", "/v1/kervan?hedef=develi", { oturum });
    assert.deepEqual([ayni.durum, ayni.govde], [400, { hata: "kervan_ayni_yer" }]);
    const yok = await cagir("GET", "/v1/kervan?hedef=atlantis", { oturum });
    assert.deepEqual([yok.durum, yok.govde], [400, { hata: "yerlesim_gecersiz" }]);
    const bozuk = await cagir("GET", "/v1/kervan?hedef=karapinar&mallar=su:3", { oturum });
    assert.deepEqual([bozuk.durum, bozuk.govde], [400, { hata: "kervan_yuk_gecersiz" }]);

    // Düğümsüz: önizleme dugum kapısını gösterir, POST aynı kodu verir.
    const o0 = await cagir("GET", "/v1/kervan?hedef=karapinar&mallar=odun:1", { oturum });
    assert.equal(o0.durum, 200, JSON.stringify(o0.govde));
    assert.equal(o0.govde.engel, "dugum_kapali");
    const g0 = await cagir("POST", "/v1/kervan", { oturum, govde: { hedef: "karapinar", mallar: { odun: 1 }, istekNo: "kervan-0000" } });
    assert.deepEqual([g0.durum, g0.govde], [409, { hata: "dugum_kapali" }]);

    // Tüccar düğümü, yük ve bedel depoda verilir; YerlesimDO depodan yeniden açılır.
    const develiId = env.YERLESIM.idFromName("yerlesim:develi");
    const develi = yerlesimler.ornekler.get(develiId.toString())!;
    const o = (develi.depolama.veri.get("s") as Sakin[])[0]!.o;
    const kar = develi.depolama.veri.get(`o:${o}`) as Karakter;
    seviyeVer(kar, "tuccar.yukHayvani", 1);
    seviyeVer(kar, "tuccar.fiyatHaberi", 1);
    kar.ev = { nal: 4, kosum: 2, kereste: 12 };
    develi.depolama.veri.set(`o:${o}`, kar);
    develi.ornek = new YerlesimDO({ id: develiId, storage: develi.depolama } as unknown as DurableObjectState, env, () => zaman.saat);

    const on = await cagir("GET", "/v1/kervan?hedef=karapinar&mallar=kereste:10", { oturum });
    assert.equal(on.durum, 200, JSON.stringify(on.govde));
    assert.equal(on.govde.uygun, true, JSON.stringify(on.govde.kapilar));
    assert.equal(on.govde.hedefAd, "Karapınar");
    const tahmin = on.govde.tahmin;
    assert.ok(tahmin.hasilat > 0);
    assert.ok(tahmin.satirlar[0].kota.tavan > 0 && tahmin.satirlar[0].birim.kalemler.length > 0, "fiyat ve kota dökümü");

    const govde = { hedef: "karapinar", mallar: { kereste: 10 }, istekNo: "kervan-0001" };
    const g1 = await cagir("POST", "/v1/kervan", { oturum, govde });
    assert.equal(g1.durum, 200, JSON.stringify(g1.govde));
    assert.equal(g1.govde.kervan.varisAyi, on.govde.varisAyi);
    assert.deepEqual(g1.govde.envanter, { nal: 2, kosum: 1, kereste: 2 });
    const g2 = await cagir("POST", "/v1/kervan", { oturum, govde });
    assert.deepEqual(g2.govde, g1.govde, "aynı istekNo aynı sonuç");
    // İkinci kervanın bedeli yetmez (nal 2, koşum 1 kaldı ama kereste yok): kapı sırası mal → bedel.
    const g3 = await cagir("POST", "/v1/kervan", { oturum, govde: { hedef: "konuralp", mallar: { kereste: 3 }, istekNo: "kervan-0002" } });
    assert.deepEqual([g3.durum, g3.govde], [409, { hata: "mal_yok" }]);

    const yolda = await cagir("GET", "/v1/kervan", { oturum });
    assert.deepEqual(yolda.govde.yolda.map((x: Nesne) => [x.hedef, x.mallar, x.varisAyi]), [["karapinar", { kereste: 10 }, on.govde.varisAyi]]);

    // Ay döner: sonraki istek tembel varışı yapar (hedef çağrısı istekten sonra), hasılat tüccara yazılır.
    zaman.saat += AY_MS;
    const pa0 = (develi.depolama.veri.get(`o:${o}`) as Karakter).pa;
    await cagir("GET", "/v1/yerlesim", { oturum });
    const kar1 = develi.depolama.veri.get(`o:${o}`) as Karakter;
    assert.equal(kar1.df!.find((x) => x[0] === on.govde.varisAyi)![1].kervan, tahmin.hasilat, "önizleme = gerçek");
    assert.ok(kar1.pa >= pa0);
    assert.equal(kar1.ev!.kereste, 2 + (10 - tahmin.satilan.kereste));
    const olay = [...develi.depolama.veri.entries()].filter(([a]) => a.startsWith("e:")).flatMap(([, v]) => v as Olay[]).find((x) => x.k === "olay.kervan.vardi");
    assert.equal(olay?.p.hasilat, tahmin.hasilat);
    assert.deepEqual((await cagir("GET", "/v1/kervan", { oturum })).govde.yolda, []);

    // Fiyat haberi.
    const h = await cagir("POST", "/v1/kervan/haber", { oturum, govde: { istekNo: "haber-0001" } });
    assert.equal(h.durum, 200, JSON.stringify(h.govde));
    assert.equal(h.govde.haber.yerlesimler.length, 3);
    assert.equal(h.govde.bedel.takat, 1);
  } finally {
    globalThis.fetch = eskiFetch;
  }
});
