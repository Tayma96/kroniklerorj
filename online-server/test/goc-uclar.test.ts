// Uçtan uca (D1 göç): GET /v1/goc önizlemesi, POST /v1/goc (istekNo tekrar güvenliği), profil ve dünya kaydı,
// siyasi kimliğin yeni yerleşimden gelmesi, varışta misafirhane, iki yerleşimin olay/kronik satırları.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { BolgeDO, DunyaDO, HesapDO, SultanlikDO, YerlesimDO } from "../src/index.ts";
import type { Env } from "../src/tipler.ts";
import type { Karakter, Sakin } from "../src/yerlesim/tipler.ts";
import { GOC_YOL_BEDELI } from "../src/yerlesim/goc.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

type Nesne = Record<string, any>;

test("göç uçları: önizleme, kapı, göç, tekrar, profil, siyasi kimlik, misafirhane, kronik", async () => {
  const anahtar = await rsaAnahtari("kid-1");
  const jwks = sahteJwks([anahtar]);
  const eskiFetch = globalThis.fetch;
  globalThis.fetch = jwks.getir;
  try {
    const saat = Date.now();
    const env = { GOOGLE_CLIENT_ID: ISTEMCI, ZAR_YEDEK_IZINLI: "1", OTURUM_ANAHTARI: "o".repeat(48) } as Env;
    env.HESAP = sahteAdAlani((ctx) => new HesapDO(ctx, env));
    env.DUNYA = sahteAdAlani((ctx) => new DunyaDO(ctx, env));
    const yerlesimler = sahteAdAlani((ctx) => new YerlesimDO(ctx, env, () => saat));
    env.YERLESIM = yerlesimler;
    env.BOLGE = sahteAdAlani((ctx) => new BolgeDO(ctx, env, () => saat));
    env.SULTANLIK = sahteAdAlani((ctx) => new SultanlikDO(ctx, env, () => saat));
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
    const p0 = await cagir("POST", "/v1/profil", { oturum, govde: { ad: "Ayşe", cinsiyet: "kadın", yerlesim: "develi", istekNo: "profil-0001" } });
    assert.equal(p0.durum, 200, JSON.stringify(p0.govde));
    const eskiKisi = (await cagir("GET", "/v1/siyaset", { oturum })).govde.benim.kisi as string;
    assert.ok(eskiKisi.startsWith("develi/"));

    // Yöntem ve doğrulama.
    assert.equal((await cagir("PUT", "/v1/goc", { oturum })).durum, 405);
    assert.deepEqual((await cagir("POST", "/v1/goc", { oturum, govde: { hedef: "konuralp" } })).govde, { hata: "istekno_gecersiz" });
    const ayni = await cagir("GET", "/v1/goc?hedef=develi", { oturum });
    assert.deepEqual([ayni.durum, ayni.govde], [400, { hata: "goc_ayni_yer" }]);

    // 12 yaşında: önizleme yaş kapısını gösterir, POST aynı kodu verir.
    const o0 = await cagir("GET", "/v1/goc?hedef=konuralp", { oturum });
    assert.equal(o0.durum, 200, JSON.stringify(o0.govde));
    assert.equal(o0.govde.engel, "goc_yas");
    assert.equal(o0.govde.uygun, false);
    const g0 = await cagir("POST", "/v1/goc", { oturum, govde: { hedef: "konuralp", istekNo: "goc-0000001" } });
    assert.deepEqual([g0.durum, g0.govde], [403, { hata: "goc_yas" }]);

    // Karakter 4 yıl yaşlanır ve zenginleşir (depoda; YerlesimDO örneği yeniden açılır).
    const develiAnahtar = env.YERLESIM.idFromName("yerlesim:develi").toString();
    const develi = yerlesimler.ornekler.get(develiAnahtar)!;
    const sakinler = develi.depolama.veri.get("s") as Sakin[];
    const o = sakinler[0]!.o;
    sakinler[0]!.d -= 48;
    const kar = develi.depolama.veri.get(`o:${o}`) as Karakter;
    kar.d -= 48;
    kar.pa = 40;
    kar.ev = { odun: 50 };
    develi.ornek = new YerlesimDO({ id: env.YERLESIM.idFromName("yerlesim:develi"), storage: develi.depolama } as unknown as DurableObjectState, env, () => saat);

    const o1 = await cagir("GET", "/v1/goc?hedef=konuralp", { oturum });
    assert.equal(o1.govde.uygun, true, JSON.stringify(o1.govde));
    assert.equal(o1.govde.akce.tasinan, 40 - GOC_YOL_BEDELI);
    assert.deepEqual(o1.govde.doluluk, { nufus: 0, evKapasite: 60 });
    assert.equal(o1.govde.kapilar.makam, true);
    assert.equal(o1.govde.kapilar.darbe, true);

    const g1 = await cagir("POST", "/v1/goc", { oturum, govde: { hedef: "konuralp", istekNo: "goc-0000002" } });
    assert.equal(g1.durum, 200, JSON.stringify(g1.govde));
    assert.equal(g1.govde.goc.akce, o1.govde.akce.tasinan, "önizleme = gerçek sonuç");
    assert.deepEqual(g1.govde.goc.tasinan, o1.govde.envanter.tasinan);
    assert.deepEqual(g1.govde.goc.emanet, o1.govde.envanter.emanet);
    assert.equal(g1.govde.profil.yerlesim, "konuralp");
    const g2 = await cagir("POST", "/v1/goc", { oturum, govde: { hedef: "konuralp", istekNo: "goc-0000002" } });
    assert.deepEqual(g2.govde, g1.govde, "aynı istekNo aynı sonuç");

    // Profil ve dünya.
    const pr = await cagir("GET", "/v1/profil", { oturum });
    assert.deepEqual([pr.govde.yerlesim, pr.govde.beylik], ["konuralp", "yenisehir"]);
    const dz = await cagir("GET", "/v1/dunya");
    const nufus = (id: string) => dz.govde.beylikler.flatMap((b: Nesne) => b.yerlesimler).find((y: Nesne) => y.id === id).nufus;
    assert.deepEqual([nufus("develi"), nufus("konuralp")], [0, 1]);

    // Yeni yerleşim: durum, akçe, siyasi kimlik yeni yerleşimden.
    const d1 = await cagir("GET", "/v1/yerlesim", { oturum });
    assert.equal(d1.durum, 200, JSON.stringify(d1.govde));
    assert.equal(d1.govde.yerlesim.id, "konuralp");
    assert.equal(d1.govde.ben.para, 40 - GOC_YOL_BEDELI);
    const s1 = await cagir("GET", "/v1/siyaset", { oturum });
    assert.equal(s1.durum, 200, JSON.stringify(s1.govde));
    assert.ok((s1.govde.benim.kisi as string).startsWith("konuralp/"), s1.govde.benim.kisi);
    assert.equal(s1.govde.bolge.id, "yenisehir");

    // Varışta misafirhane (12 saat, şehir başına bir kez).
    const b1 = await cagir("GET", "/v1/barinma", { oturum });
    assert.equal(b1.govde.barinma.durum, "misafir", JSON.stringify(b1.govde.barinma));
    assert.equal(b1.govde.barinma.konaklama.tur, "misafirhane");

    // Kronik: yenide "geldi"; eski yerde sakin kaydı kapandı, "göç etti" satırı yazıldı.
    const k1 = await cagir("GET", "/v1/kronik", { oturum });
    assert.ok(k1.govde.kronik.some((s: Nesne) => s.ozet.k === "kronik.goc.geldi"));
    const eskiSakin = (develi.depolama.veri.get("s") as Sakin[]).some((s) => s.o === o);
    assert.equal(eskiSakin, false);
    assert.equal((develi.depolama.veri.get(`o:${o}`) as Karakter).gc?.d, "kapandi");
    assert.deepEqual((develi.depolama.veri.get(`o:${o}`) as Karakter).ev, g1.govde.goc.emanet, "fazla mal eski yerde emanette");

    // Soğuma: yeniden göç yok.
    const g3 = await cagir("POST", "/v1/goc", { oturum, govde: { hedef: "develi", istekNo: "goc-0000003" } });
    assert.deepEqual([g3.durum, g3.govde], [409, { hata: "goc_soguma" }]);
  } finally {
    globalThis.fetch = eskiFetch;
  }
});
