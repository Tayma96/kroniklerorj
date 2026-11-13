// Uçtan uca (Faz 12–13): edinim, panel, cüzdan ↔ kasa transferi (DO'lar arası; cevap kaybı, ağ hatası, çift ve
// eşzamanlı gönderim, uzlaştırma alarmı), oyuncu hanında kira, işe alım, yetki ve çekim tavanı. Toplam akçe sabit.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, IsletmeDO, YerlesimDO } from "../src/index.ts";
import type { Env } from "../src/tipler.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";
import { oyunAyi } from "../src/saat.ts";

type Nesne = Record<string, any>;

test("mülk uçları: edinim, transfer protokolü, oyuncu hanı kirası, personel; toplam akçe değişmez", async () => {
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
    const isletmeler = sahteAdAlani((ctx) => new IsletmeDO(ctx, env, () => saat));
    // Arıza enjeksiyonu: "once" = istek ulaşmaz; "sonra" = işletme uygular, cevap kaybolur.
    let ariza: "once" | "sonra" | null = null;
    env.ISLETME = {
      ...isletmeler,
      get: (id: DurableObjectId) => {
        const s = isletmeler.get(id);
        return {
          id,
          fetch: async (g: string | Request, i?: RequestInit) => {
            if (ariza === "once") throw new Error("ağ");
            const r = await s.fetch(g as string, i);
            if (ariza === "sonra") throw new Error("cevap kayboldu");
            return r;
          },
        } as DurableObjectStub;
      },
    } as DurableObjectNamespace;
    const cagir = async (yontem: string, yol: string, secenek: { govde?: unknown; oturum?: string } = {}) => {
      const basliklar: Record<string, string> = {};
      if (secenek.oturum) basliklar.authorization = `Bearer ${secenek.oturum}`;
      const yanit = await isleyici.fetch(
        new Request(`https://kronikler-online.test${yol}`, { method: yontem, headers: basliklar, body: secenek.govde === undefined ? null : JSON.stringify(secenek.govde) }),
        env,
      );
      return { durum: yanit.status, govde: (await yanit.json()) as Nesne };
    };
    const oturumAc = async (sub: string, ad: string) => {
      const token = await jwtImzala(anahtar, googleYuku(saat, { sub, given_name: ad }));
      const o = (await cagir("POST", "/v1/giris", { govde: { idToken: token } })).govde.oturum as string;
      const p = await cagir("POST", "/v1/profil", { oturum: o, govde: { ad, cinsiyet: "kadın", yerlesim: "develi", istekNo: `profil-${sub.slice(-4)}` } });
      assert.equal(p.durum, 200, JSON.stringify(p.govde));
      return o;
    };
    const A = await oturumAc("110000000000000000001", "Ayşe");
    const B = await oturumAc("110000000000000000002", "Fatma");

    // Sahibe akçe, nam ve yaş (depoda düzenleyip yerleşimi yeniden başlatır).
    const yId = env.YERLESIM.idFromName("yerlesim:develi");
    const kayit = yerlesimler.ornekler.get(yId.toString())!;
    const ay = oyunAyi(saat);
    const kar1 = kayit.depolama.veri.get("o:o1") as Nesne;
    Object.assign(kar1, { pa: 1000, nm: [30, 30, 0, 0], d: ay - 12 * 20 });
    kar1.ms = { a: "hanci", y: "", at: ay, s: { hanci: { kd: 0, hz: 0, cy: 0, sv: { "hanci.yatakAhir": 1 } } } };
    kayit.depolama.veri.set("o:o1", kar1);
    yerlesimler.ornekler.set(yId.toString(), { ornek: new YerlesimDO({ id: yId, storage: kayit.depolama } as DurableObjectState, env, () => saat), depolama: kayit.depolama });

    const toplam = () => {
      const v = kayit.depolama.veri;
      let t = 0;
      for (const [a, x] of v) if (a.startsWith("o:")) t += (x as Nesne).pa;
      // Denetim: uçuştaki kayıt, hedef defterinde uygulanmış görünüyorsa (cevap kaybı) iki kez sayılmaz.
      const mk = v.get("mk") as Nesne | undefined;
      const isler = [...isletmeler.ornekler.values()].map(({ depolama }) => depolama.veri.get("is") as Nesne | undefined).filter(Boolean) as Nesne[];
      const isGir = (i: string) => isler.some((is) => is.gir.g[i]?.[0] === "kabul");
      if (mk) t += mk.cik.k.reduce((s: number, x: Nesne) => s + (isGir(x.i) ? 0 : x.a), 0) + mk.batak;
      for (const is of isler) t += is.kasa + is.emanet + is.cik.k.reduce((s: number, x: Nesne) => s + (mk?.gir.g[x.i]?.[0] === "kabul" ? 0 : x.a), 0) + is.batak - is.kaynak;
      return t;
    };
    const T0 = toplam();

    const l0 = await cagir("GET", "/v1/mulk", { oturum: A });
    assert.equal(l0.durum, 200, JSON.stringify(l0.govde));
    assert.equal(l0.govde.yuvalar.find((x: Nesne) => x.isletme === "develi.han.1").durum, "bos");
    assert.equal(l0.govde.edinimSarti.han.uygun, true);
    assert.deepEqual((await cagir("POST", "/v1/mulk/edin", { oturum: B, govde: { tur: "han", istekNo: "edin-b-001" } })).govde, { hata: "yas_kapisi" });

    // Edinim: tekrar güvenli.
    const e1 = await cagir("POST", "/v1/mulk/edin", { oturum: A, govde: { tur: "han", istekNo: "edin-a-001" } });
    assert.equal(e1.durum, 200, JSON.stringify(e1.govde));
    assert.equal(e1.govde.transferDurumu, "kesin");
    assert.equal(e1.govde.para, 750);
    const e2 = await cagir("POST", "/v1/mulk/edin", { oturum: A, govde: { tur: "han", istekNo: "edin-a-001" } });
    assert.equal(e2.govde.para, 750);
    assert.equal(toplam(), T0);
    const ID = "/v1/isletme/develi.han.1";
    const p0 = await cagir("GET", ID, { oturum: A });
    assert.equal(p0.durum, 200, JSON.stringify(p0.govde));
    assert.equal(p0.govde.konum, "sahip");
    assert.equal(p0.govde.isletme.kasa, 0);
    const pB = await cagir("GET", ID, { oturum: B });
    assert.equal(pB.govde.konum, null);
    assert.equal(pB.govde.isletme.kasa, undefined, "dışarıdan kasa görünmez");

    // Yatırma, cevap kayboldu: cüzdan düştü, işletme uyguladı; tekrar aynı istekNo ile kesinleşir, iki kez girmez.
    ariza = "sonra";
    const y1 = await cagir("POST", `${ID}/yatir`, { oturum: A, govde: { tutar: 100, istekNo: "yatir-0001" } });
    assert.equal(y1.durum, 200, JSON.stringify(y1.govde));
    assert.equal(y1.govde.transferDurumu, "bekliyor");
    assert.equal(y1.govde.para, 650);
    assert.equal(toplam(), T0, "uçuştaki akçe sayılır");
    ariza = null;
    const y2 = await cagir("POST", `${ID}/yatir`, { oturum: A, govde: { tutar: 100, istekNo: "yatir-0001" } });
    assert.equal(y2.govde.transferDurumu, "kesin");
    assert.equal((await cagir("GET", ID, { oturum: A })).govde.isletme.kasa, 100);
    // Ağ hatası: istek ulaşmadı; bir sonraki istekte uzlaştırma teslim eder.
    ariza = "once";
    const y3 = await cagir("POST", `${ID}/yatir`, { oturum: A, govde: { tutar: 50, istekNo: "yatir-0002" } });
    assert.equal(y3.govde.transferDurumu, "bekliyor");
    ariza = null;
    assert.equal((await cagir("GET", ID, { oturum: A })).govde.isletme.kasa, 150);
    assert.equal(toplam(), T0);

    // Çekim, cevap kayboldu: kasa düştü, cüzdana henüz yazılmadı; işletme alarmı (uzlaştırma) teslim eder.
    ariza = "sonra";
    const c1 = await cagir("POST", `${ID}/cek`, { oturum: A, govde: { tutar: 30, istekNo: "cek-00001" } });
    assert.deepEqual([c1.durum, c1.govde], [503, { hata: "transfer_bekliyor" }]);
    ariza = null;
    assert.equal(toplam(), T0);
    const isDO = isletmeler.ornekler.get(env.ISLETME.idFromName("isletme:develi.han.1").toString())!.ornek;
    await isDO.uzlastir(saat, true);
    const c2 = await cagir("POST", `${ID}/cek`, { oturum: A, govde: { tutar: 30, istekNo: "cek-00001" } });
    assert.equal(c2.durum, 200, JSON.stringify(c2.govde));
    assert.equal(c2.govde.para, 630, "650 − 50 + 30, bir kez");
    // Eşzamanlı çift gönderim.
    const [c3, c4] = await Promise.all([
      cagir("POST", `${ID}/cek`, { oturum: A, govde: { tutar: 20, istekNo: "cek-00002" } }),
      cagir("POST", `${ID}/cek`, { oturum: A, govde: { tutar: 20, istekNo: "cek-00002" } }),
    ]);
    assert.equal(c3.durum, 200);
    assert.equal(c4.durum, 200);
    const p1 = await cagir("GET", ID, { oturum: A });
    assert.equal(p1.govde.isletme.kasa, 100);
    assert.equal(toplam(), T0);

    // Oyuncu hanında kira: akçe kasaya, dünyadan çıkmaz.
    const k1 = await cagir("POST", "/v1/barinma/kira", { oturum: B, govde: { oda: "yatak", sure: 1, istekNo: "kira-b-001" } });
    assert.equal(k1.durum, 200, JSON.stringify(k1.govde));
    assert.deepEqual([k1.govde.kira.batak, k1.govde.kira.kasaya, k1.govde.para], [0, 2, 3]);
    assert.equal((await cagir("GET", ID, { oturum: A })).govde.isletme.kasa, 102);
    assert.equal(toplam(), T0);

    // Tezyin kapasite vermez.
    const kp = p1.govde.isletme.kapasite;
    const t1 = await cagir("POST", `${ID}/tezyin`, { oturum: A, govde: { grup: "aydinlatma", secim: "avize", istekNo: "tezyin-001" } });
    assert.equal(t1.durum, 200, JSON.stringify(t1.govde));
    assert.equal(t1.govde.kapasite, kp);

    // İşe alım (oyuncu), yetki, çekim tavanı.
    const pt = await cagir("POST", `${ID}/personel`, { oturum: A, govde: { islem: "teklif", hedef: "o2", rol: "garson", maas: 5, istekNo: "per-00001" } });
    assert.equal(pt.durum, 200, JSON.stringify(pt.govde));
    assert.deepEqual((await cagir("GET", "/v1/mulk", { oturum: B })).govde.teklifler, ["develi.han.1"]);
    const pk = await cagir("POST", `${ID}/personel`, { oturum: B, govde: { islem: "kabul", istekNo: "per-b-0001" } });
    assert.equal(pk.durum, 200, JSON.stringify(pk.govde));
    const no = pk.govde.sozlesme.no;
    assert.deepEqual((await cagir("POST", `${ID}/cek`, { oturum: B, govde: { tutar: 5, istekNo: "cek-b-0001" } })).govde, { hata: "yetki_yok" });
    assert.equal((await cagir("POST", `${ID}/personel`, { oturum: A, govde: { islem: "yetki", sozlesme: no, yetki: "kasa", ver: true, istekNo: "per-00002" } })).durum, 200);
    assert.deepEqual((await cagir("POST", `${ID}/cek`, { oturum: B, govde: { tutar: 25, istekNo: "cek-b-0002" } })).govde, { hata: "cekim_tavani" });
    const cb = await cagir("POST", `${ID}/cek`, { oturum: B, govde: { tutar: 15, istekNo: "cek-b-0003" } });
    assert.equal(cb.durum, 200, JSON.stringify(cb.govde));
    assert.equal(cb.govde.para, 18);
    const dv = await cagir("GET", `${ID}/devir`, { oturum: B });
    assert.equal(dv.durum, 200);
    assert.equal(dv.govde.sozlesmeler.length, 1);
    assert.equal(toplam(), T0 , "toplam akçe (kaynak ve batak kalemleriyle) değişmedi");
  } finally {
    globalThis.fetch = eskiFetch;
  }
});
