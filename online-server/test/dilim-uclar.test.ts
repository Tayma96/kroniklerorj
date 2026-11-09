// Uçtan uca dikey dilim: demirci (oduncu becerisiyle) temel işle cevher çıkarır, NPC'den odun alır, kömür ve nal
// tarifini yapar, NPC'ye satar ve lonca siparişini teslim eder; olay defterinde teşekkür izi görünür.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, YerlesimDO } from "../src/index.ts";
import type { Env } from "../src/tipler.ts";
import type { Siparis } from "../src/yerlesim/siparis.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

type Nesne = Record<string, any>;
const GUN = 24 * 60 * 60 * 1000;

test("dikey dilim uçları: Hal, tarif, satış, sipariş teslimi ve teşekkür izi", async () => {
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
    const giris = async (sub: string, ad: string) => {
      const token = await jwtImzala(anahtar, googleYuku(saat, { sub }));
      const oturum = (await cagir("POST", "/v1/giris", { govde: { idToken: token } })).govde.oturum as string;
      const p = await cagir("POST", "/v1/profil", { oturum, govde: { ad, cinsiyet: "kadın", yerlesim: "develi", istekNo: `profil-${sub}` } });
      assert.equal(p.durum, 200, JSON.stringify(p.govde));
      return oturum;
    };
    const oturum = await giris("sub-ayse", "Ayşe");
    const ikinci = await giris("sub-zehra", "Zehra");

    // İlk görünüm: kayıtta hl/ev/ms alanı yok (eski biçim) → Hal tam, envanter boş, meslek null.
    const { depolama: ilkDepo } = [...yerlesimler.ornekler.values()][0]!;
    const eski = ilkDepo.veri.get("o:o1") as Nesne;
    assert.ok(eski && eski.hl === undefined && eski.ev === undefined && eski.ms === undefined);
    assert.equal(ilkDepo.veri.get("sp"), undefined, "eski kasabada sipariş anahtarı yok");
    const d0 = (await cagir("GET", "/v1/yerlesim", { oturum })).govde.ben;
    assert.equal(d0.hal.kondisyon.deger, 100);
    assert.equal(d0.hal.kondisyon.kademe, "iyi");
    assert.deepEqual(d0.envanter, {});
    assert.equal(d0.meslek, null);
    assert.deepEqual(d0.kademeHizmet, [0, 24, 72, 72]);
    assert.equal(d0.tarifler.length, 6);
    assert.equal(d0.takat.aylik, 6);

    // 7 gün = 14 oyun ayı: 13 yaş; bu sırada kıt mesleklere sipariş açılır.
    saat += 7 * GUN;
    const { ornek, depolama } = [...yerlesimler.ornekler.values()][0]!;
    for (let i = 0; i < 5; i++) await ornek.alarm();

    let no = 0;
    const yaz = async (yol: string, govde: Nesne, o = oturum) => {
      const r = await cagir("POST", yol, { oturum: o, govde: { ...govde, istekNo: `istek-${String(++no).padStart(4, "0")}` } });
      return r;
    };
    const tamam = async (yol: string, govde: Nesne, o = oturum) => {
      const r = await yaz(yol, govde, o);
      assert.equal(r.durum, 200, `${yol} ${JSON.stringify(r.govde)}`);
      return r.govde;
    };
    await tamam("/v1/meslek", { islem: "sec", meslek: "demirci" });
    await tamam("/v1/meslek", { islem: "yan", meslek: "oduncu" });
    // Beceriler v1 kaydıyla gelir (eski kayıt göçü: alet.0 → Aletçilik 1, maden.0 → Madencilik 2); öğrenme
    // süresi akışı beceri-uclar testinde. Bellekteki motor atılır, yeni örnek depodan okur.
    for (const [ad, kayit] of yerlesimler.ornekler) {
      for (const [a, v] of kayit.depolama.veri) {
        if (!a.startsWith("o:")) continue;
        const kar = v as Nesne;
        if (kar.ms?.a !== "demirci") continue;
        kar.ms.s.demirci = { ...kar.ms.s.demirci, dl: ["alet"], dg: ["demirci.alet.0"] };
        kar.ms.s.oduncu = { kd: 0, hz: 0, cy: 0, dl: ["maden"], dg: ["oduncu.maden.0"] };
      }
      kayit.ornek = new YerlesimDO({ id: { toString: () => ad }, storage: kayit.depolama } as never, env, () => saat);
    }
    const m = (await cagir("GET", "/v1/yerlesim", { oturum })).govde.ben;
    assert.equal(m.tarifler.find((t: Nesne) => t.id === "nal").acik, true);
    assert.equal(m.tarifler.find((t: Nesne) => t.id === "komur").acik, true);

    // Girdi yoksa tarif reddedilir, takat değişmez.
    const takat0 = (await cagir("GET", "/v1/yerlesim", { oturum })).govde.ben.takat.kalan as number;
    assert.deepEqual((await yaz("/v1/tarif", { tarif: "nal" })).govde, { hata: "girdi_yok" });

    // Usta iş: cevher ayıkla (maden düğümü; azalan getiri 2, 1); odun kes, NPC'den bir odun al.
    const c1 = await tamam("/v1/temel-is", { is: "cevher" });
    assert.deepEqual([c1.mal, c1.adet, c1.sonraki], ["cevher", 2, 1]);
    const c2 = await tamam("/v1/temel-is", { is: "cevher" });
    assert.equal(c2.envanter.cevher, 3);
    await tamam("/v1/temel-is", { is: "odun" });
    const al = await tamam("/v1/taban-al", { mal: "odun", adet: 1 });
    assert.equal(al.envanter.odun, 4);

    // Kömür ×2, nal ×2; aynı istekNo ikinci kez girdi düşürmez.
    const komurIstek = { tarif: "komur", istekNo: "tarif-tekrar-1" };
    const k1 = await cagir("POST", "/v1/tarif", { oturum, govde: komurIstek });
    const k2 = await cagir("POST", "/v1/tarif", { oturum, govde: komurIstek });
    assert.equal(k1.durum, 200, JSON.stringify(k1.govde));
    assert.deepEqual(k2.govde, k1.govde);
    assert.equal(k1.govde.envanter.odun, 3, "kömür 1 odun ister");
    await tamam("/v1/tarif", { tarif: "komur" });
    await tamam("/v1/tarif", { tarif: "nal" });
    const nal = await tamam("/v1/tarif", { tarif: "nal" });
    assert.deepEqual(nal.envanter, { cevher: 1, nal: 4, odun: 2 });
    assert.ok(nal.hal.kondisyon.deger < 100);
    assert.ok(nal.hal.nedenler.some((x: Nesne) => x.neden === "hal.neden.tarif"));
    assert.equal(nal.takat, takat0 - 2 - 1 - 1 - 1 - 1 - 1);

    // Sipariş listesi: açık bir demirci siparişi (nal ya da alet) olmalı; yoksa listede kıt meslek siparişi vardır.
    const liste = (await cagir("GET", "/v1/siparisler", { oturum })).govde.siparisler as Nesne[];
    assert.ok(liste.length > 0, "kıt mesleklere sipariş açıldı");
    assert.equal((await cagir("POST", "/v1/siparisler", { oturum })).durum, 405);
    const sip = liste.find((s) => s.durum === "acik" && s.mal === "nal");
    assert.ok(sip, `açık nal siparişi: ${JSON.stringify(liste.map((s) => [s.mal, s.durum, s.adet]))}`);
    assert.ok(sip.isteyen?.ad, "isteyen NPC adı görünür");

    // Elde yetecek nal yoksa önce yap (adet ≤ 4).
    assert.ok(sip.adet <= 4);
    assert.equal(sip.teslimEdebilir, true);
    assert.equal(sip.meslekUygun, true);
    assert.equal(sip.odulDokum.kalemler.reduce((t: number, x: Nesne) => t + x.d, 0), sip.odul, "ödül dökümü toplamı");
    const b0 = (await cagir("GET", "/v1/yerlesim", { oturum })).govde.ben;
    const once = b0.para as number;
    // GET önizlemeleri: temel işin sonraki verimi, kalan NPC alım kotası.
    const cv = b0.temelIsler.find((x: Nesne) => x.is === "cevher");
    assert.deepEqual([cv.adet, cv.sonraki, cv.acik], [0, 0, true], "pencerede 2 kez yapıldı: verim yok");
    assert.equal(b0.npcKota.sat.nal, 6);
    assert.equal(b0.npcKota.al.odun, 2);
    const teslimIstek = { siparis: sip.id, istekNo: "teslim-0001" };
    const t1 = await cagir("POST", "/v1/siparis/teslim", { oturum, govde: teslimIstek });
    assert.equal(t1.durum, 200, JSON.stringify(t1.govde));
    assert.equal(t1.govde.para, once + sip.odul, "akçe yalnız ödül kadar artar");
    assert.equal(t1.govde.envanter.nal ?? 0, 4 - sip.adet);
    assert.equal(t1.govde.hizmet, 3);
    assert.equal(t1.govde.olay.ozet.k, "olay.siparis.teslim");
    assert.equal(t1.govde.olay.ozet.p.kim.ad, "Ayşe");
    const t2 = await cagir("POST", "/v1/siparis/teslim", { oturum, govde: teslimIstek });
    assert.deepEqual(t2.govde, t1.govde, "aynı istekNo aynı yanıt, ikinci ödül yok");

    // İkinci oyuncu aynı siparişi alamaz.
    const z = await yaz("/v1/siparis/teslim", { siparis: sip.id }, ikinci);
    assert.deepEqual(z.govde, { hata: "siparis_kapandi" });
    assert.equal(z.durum, 409);
    assert.deepEqual((await yaz("/v1/siparis/teslim", { siparis: "s0_9" })).govde, { hata: "siparis_yok" });

    // Teşekkür izi: herkes olay defterinde görür, sipariş listesinde teslim edenin adı.
    const olaylar: Nesne[] = [];
    for (let imlec = 0, sayfa = 0; sayfa < 50; sayfa++) {
      const o = (await cagir("GET", `/v1/olaylar?imlec=${imlec}`, { oturum: ikinci })).govde;
      olaylar.push(...o.olaylar);
      imlec = o.imlec;
      if (!o.dahaVar) break;
    }
    const iz = olaylar.find((o) => o.ozet.k === "olay.siparis.teslim");
    assert.ok(iz, "ikinci oyuncu teşekkür izini görür");
    assert.equal(iz.ozet.p.kim.ad, "Ayşe");
    assert.equal(iz.ozet.p.mal, "nal");
    const l2 = (await cagir("GET", "/v1/siparisler", { oturum: ikinci })).govde.siparisler as Nesne[];
    assert.deepEqual(l2.find((s) => s.id === sip.id)?.alan?.ad, "Ayşe");

    // NPC'ye satış: tutar = birim × adet; kesirli adet reddedilir; kota döner.
    const s1 = await tamam("/v1/sat", { mal: "cevher", adet: 1 });
    assert.equal(s1.tutar, s1.birim.toplam);
    assert.equal(s1.para, t1.govde.para + s1.tutar);
    assert.deepEqual(s1.kota, { satilan: 1, tavan: 6, kalan: 5 });
    assert.deepEqual((await yaz("/v1/sat", { mal: "nal", adet: 1.5 })).govde, { hata: "mal_gecersiz" });
    assert.deepEqual((await yaz("/v1/sat", { mal: "su", adet: 1 })).govde, { hata: "mal_gecersiz" });
    assert.deepEqual((await yaz("/v1/sat", { mal: "cevher", adet: 1 })).govde, { hata: "mal_yok" });

    // Kalıcılık: motor yeniden yüklenince sipariş durumu korunur (sp anahtarı).
    const d1y = await cagir("GET", "/v1/yerlesim", { oturum });
    assert.equal(d1y.durum, 200, JSON.stringify(d1y.govde));
    const d1 = d1y.govde.ben;
    assert.equal(d1.meslek.a, "demirci");
    assert.equal(d1.envanter.nal ?? 0, 4 - sip.adet);
    assert.ok(d1.hal.nedenler.length > 0);
    const kalici = depolama.veri.get("sp") as Siparis[] | undefined;
    assert.equal(kalici?.find((s) => s.id === sip.id)?.durum, "teslim");
  } finally {
    globalThis.fetch = eskiFetch;
  }
});
