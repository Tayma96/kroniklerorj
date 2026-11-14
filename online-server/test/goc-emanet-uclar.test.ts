// Uçtan uca göç emaneti geri alma: GET/POST /v1/goc/emanet, taşıma bedeli, tekrar güvenliği, para yoksa iptalde
// malların arşive aynen dönmesi, tek yerde var olma.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { BolgeDO, DunyaDO, HesapDO, SultanlikDO, YerlesimDO } from "../src/index.ts";
import type { Env } from "../src/tipler.ts";
import type { Karakter, Sakin } from "../src/yerlesim/tipler.ts";
import { GOC_TASIMA_EN_COK, GOC_YOL_BEDELI } from "../src/yerlesim/goc.ts";
import { EMANET_BEDELI } from "../src/yerlesim/goc-emanet.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

type Nesne = Record<string, any>;

test("göç emaneti: önizleme, çekiş (bedel, sınır), tekrar, para yoksa iptal ve arşive dönüş, emanet bitince emanet_yok", async () => {
  const anahtar = await rsaAnahtari("kid-1");
  const jwks = sahteJwks([anahtar]);
  const eskiFetch = globalThis.fetch;
  globalThis.fetch = jwks.getir;
  try {
    const saat = Date.now();
    const env = { GOOGLE_CLIENT_ID: ISTEMCI, OTURUM_ANAHTARI: "o".repeat(48) } as Env;
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
    kar.ev = { odun: 70 };
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

    const konuralp = () => yerlesimler.ornekler.get(env.YERLESIM.idFromName("yerlesim:konuralp").toString())!;
    const yeniKar = () => {
      const s = (konuralp().depolama.veri.get("s") as Sakin[]).find((x) => x.h === kar.h)!;
      return { anahtar: `o:${s.o}`, kar: konuralp().depolama.veri.get(`o:${s.o}`) as Karakter };
    };
    const yeniden = (y: typeof develi, id: string) => {
      y.ornek = new YerlesimDO({ id: env.YERLESIM.idFromName(id), storage: y.depolama } as unknown as DurableObjectState, env, () => saat);
    };
    const arsivEv = () => (develi.depolama.veri.get(`o:${o}`) as Karakter).ev;
    const emanet0 = 70 - GOC_TASIMA_EN_COK;
    assert.deepEqual(arsivEv(), { odun: emanet0 });

    const on = await cagir("GET", "/v1/goc/emanet", { oturum });
    assert.equal(on.durum, 200, JSON.stringify(on.govde));
    assert.deepEqual([on.govde.kaynak, on.govde.emanet, on.govde.tasinacak, on.govde.kalacak, on.govde.bedel], ["develi", { odun: emanet0 }, { odun: GOC_TASIMA_EN_COK }, { odun: emanet0 - GOC_TASIMA_EN_COK }, EMANET_BEDELI]);

    // Para yetmezse: (2) reddeder, mallar arşive aynen döner, sonuç para_yok.
    const yk = yeniKar();
    const paraGercek = yk.kar.pa;
    yk.kar.pa = 1;
    yeniden(konuralp(), "yerlesim:konuralp");
    const red = await cagir("POST", "/v1/goc/emanet", { oturum, govde: { istekNo: "emanet-0000001" } });
    assert.deepEqual([red.durum, red.govde], [409, { hata: "para_yok" }]);
    assert.deepEqual(arsivEv(), { odun: emanet0 }, "iptalde mallar arşive döner");
    assert.equal(Object.keys((develi.depolama.veri.get("tp") as Nesne).ec ?? {}).length, 0, "bekleyen kayıt kalmaz");

    const yk2 = yeniKar();
    yk2.kar.pa = paraGercek;
    yeniden(konuralp(), "yerlesim:konuralp");
    const govde = { istekNo: "emanet-0000002" };
    const c1 = await cagir("POST", "/v1/goc/emanet", { oturum, govde });
    assert.equal(c1.durum, 200, JSON.stringify(c1.govde));
    assert.deepEqual([c1.govde.emanet.kaynak, c1.govde.emanet.bedel, c1.govde.emanet.tasinan, c1.govde.emanet.para], ["develi", EMANET_BEDELI, { odun: GOC_TASIMA_EN_COK }, paraGercek - EMANET_BEDELI]);
    assert.equal(c1.govde.emanet.envanter.odun, GOC_TASIMA_EN_COK * 2, "yanındaki + çekilen");
    assert.deepEqual(arsivEv(), { odun: emanet0 - GOC_TASIMA_EN_COK }, "tek yerde: arşivden düştü");
    const c2 = await cagir("POST", "/v1/goc/emanet", { oturum, govde });
    assert.deepEqual(c2.govde, c1.govde, "aynı istekNo aynı sonuç, ikinci kez çekmez");
    assert.equal(yeniKar().kar.ev?.odun, GOC_TASIMA_EN_COK * 2);

    const c3 = await cagir("POST", "/v1/goc/emanet", { oturum, govde: { istekNo: "emanet-0000003" } });
    assert.equal(c3.durum, 200);
    assert.equal(arsivEv(), undefined, "emanet bitti");
    const c4 = await cagir("POST", "/v1/goc/emanet", { oturum, govde: { istekNo: "emanet-0000004" } });
    assert.deepEqual([c4.durum, c4.govde], [404, { hata: "emanet_yok" }]);
    assert.equal(yeniKar().kar.ev?.odun, 70, "toplam mal korunur");
  } finally {
    globalThis.fetch = eskiFetch;
  }
});
