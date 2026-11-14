// Göç (D1): saf kurallar (kapılar, envanter bölüşümü, paket), yerleşim adımları (çıkış/giriş/tamam/iptal) ve
// HesapDO yürütücüsü (src/goc-hesap.ts) — her adımda kesinti ve yeniden deneme, kalıcı ret → iptal, akçe korunumu.
import test from "node:test";
import assert from "node:assert/strict";
import { bellekDepo, type BellekDepo } from "../src/depo.ts";
import { yerlesimBul } from "../src/dunya-veri.ts";
import { dunyaOzeti, gocKayit, kayitOl, profilGetir, PROFIL_ANAHTARI } from "../src/mantik.ts";
import { AY_MS, DUNYA_BASLANGICI_MS } from "../src/saat.ts";
import { hata, type DunyaIleti, type Profil, type Sonuc, type YerlesimIleti } from "../src/tipler.ts";
import { GOC_IS, GOC_ISTEK, gocBaslat, gocOnizle, gocSiyasetKapilari, gocSurdur, type GocBaglami } from "../src/goc-hesap.ts";
import {
  GOC_SOGUMA_AY,
  GOC_TASIMA_EN_COK,
  GOC_YOL_BEDELI,
  envanterBol,
  ilkEngel,
  partiBol,
  yerelKapilar,
} from "../src/yerlesim/goc.ts";
import { YerlesimMotoru } from "../src/yerlesim/motor.ts";
import { barinmaIlerlet, SEHIR_KORUMA_MS } from "../src/yerlesim/barinma.ts";
import { girisIsle, mulkDefteri } from "../src/mulk/tapu.ts";
import type { Karakter } from "../src/yerlesim/tipler.ts";

const an = (ay: number) => DUNYA_BASLANGICI_MS + ay * AY_MS + 60_000;
type Nesne = Record<string, any>;
const HESAP = "hesap-1";
const deger = <T = Nesne>(s: Sonuc<unknown>): T => {
  assert.ok(s.ok, JSON.stringify(s));
  return s.deger as T;
};

/** 17 yaşında (göç yaşı üstü) bir sakin; ay 0. */
async function motor(id: string, oyuncu = 1): Promise<YerlesimMotoru> {
  const m = (await YerlesimMotoru.ac(bellekDepo(), id, an(0)))!;
  for (let i = 1; i <= oyuncu; i++) {
    deger(await m.sakinEkle({ hesapId: `hesap-${i}`, ad: `Oyuncu${i}`, cinsiyet: "kadın", dogumAyi: -17 * 12 }));
  }
  return m;
}

const kar = (m: YerlesimMotoru, hesap = HESAP): Karakter => {
  const s = m.kasaba.sakin.find((x) => x.h === hesap)!;
  return m.kasaba.kar.get(s.o)!;
};

// ---------------------------------------------------------------- saf kurallar

test("göç saf: envanter bölüşümü değerli maldan başlar, toplam korunur; partiler kalite çoğaltmaz", () => {
  const { tasinan, emanet } = envanterBol({ odun: 25, alet: 2, deri: 10 }, 20);
  assert.deepEqual(tasinan, { alet: 2, deri: 10, odun: 8 });
  assert.deepEqual(emanet, { odun: 17 });
  assert.deepEqual(envanterBol({ odun: 3 }), { tasinan: { odun: 3 }, emanet: {} });
  const [ilk, son] = partiBol([[3, 4, "o2"], [1, 6]], 6);
  assert.deepEqual(ilk, [[3, 4, "o2"], [1, 2]]);
  assert.deepEqual(son, [[1, 4]]);
  // Kapı sırası: ek (HesapDO) kapısı yerel kapıdan önce gelirse o döner.
  assert.equal(ilkEngel({ olu: true, yas: true, borc: false }, { makam: false }), "goc_makam");
  assert.equal(ilkEngel({ olu: true, para: false }, { dolu: false }), "yerlesim_dolu");
  assert.equal(ilkEngel({ olu: true }), undefined);
});

test("göç saf: siyaset görünümünden makam (koltuk/vekillik/adaylık) ve açık darbe taraflığı", () => {
  assert.deepEqual(gocSiyasetKapilari({ benim: { makamlar: [], vekillikler: [], adayliklar: [] }, bolge: { darbe: null } }), { makam: false, darbe: false });
  assert.deepEqual(gocSiyasetKapilari({ benim: { makamlar: [], vekillikler: ["vali:x"], adayliklar: [] } }), { makam: true, darbe: false });
  assert.deepEqual(gocSiyasetKapilari({ benim: { makamlar: [], vekillikler: [], adayliklar: ["a"] } }), { makam: true, darbe: false });
  assert.equal(gocSiyasetKapilari({ bolge: { darbe: { durum: "catışma", benimTaraf: "savunan" } } }).darbe, true);
  assert.equal(gocSiyasetKapilari({ bolge: { darbe: { durum: "hazirlik", benimTaraf: null, benimDestek: true } } }).darbe, true);
  assert.equal(gocSiyasetKapilari({ bolge: { darbe: { durum: "basarili", benimTaraf: "saldiran" } } }).darbe, false, "sonuçlanmış darbe açık değil");
  assert.equal(gocSiyasetKapilari({ bolge: { darbe: { durum: "ilan", benimTaraf: null, benimDestek: false } } }).darbe, false);
});

// ---------------------------------------------------------------- kapılar (yerleşim)

test("göç kapıları: yaş, ölüm, soğuma, aile, mülk, borç, sözleşme, açık iş, para; her biri kendi koduyla", async () => {
  const islem = "goc:kapi-00001";
  const dene = async (m: YerlesimMotoru) => m.gocCikis(HESAP, { islem, hedef: "karapinar" });

  // Yaş: 12 yaşındaki yeni sakin.
  const genc = (await YerlesimMotoru.ac(bellekDepo(), "develi", an(0)))!;
  deger(await genc.sakinEkle({ hesapId: HESAP, ad: "Genç", cinsiyet: "erkek", dogumAyi: -144 }));
  assert.deepEqual(await dene(genc), hata("goc_yas"));

  const durumlar: [string, (m: YerlesimMotoru, c: Karakter) => void, string][] = [
    ["olu", (_m, c) => { c.hd = { h: c.o, n: 1, s: 0, ol: 0 }; }, "olu"],
    ["soguma", (_m, c) => { c.gg = -GOC_SOGUMA_AY + 1; }, "goc_soguma"],
    ["aile (oyuncu eşi)", (_m, c) => { c.hd = { h: c.o, n: 1, s: 0, es: "o2" }; }, "goc_aile"],
    ["aile (açık devir)", (_m, c) => { c.hd = { h: c.o, n: 1, s: 0, dv: "o9" }; }, "goc_aile"],
    ["mülk", (m, c) => { mulkDefteri(m.kasaba).t["develi.han.1"] = { s: c.o, h: HESAP, ts: 1, a: 0, f: 10 }; }, "goc_mulk"],
    ["borç", (m, c) => {
      m.kasaba.tp = { tn: 2, sn: 1, tk: [{ i: 1, t: "borc", g: c.o, a: "o2", s: { yn: "iste", tu: 5 } as never, e: 0, ac: 0, sa: 1, v: "ret", d: "surer", kl: 5 }], ob: [], hu: [], eg: {}, sy: [] };
    }, "goc_borc"],
    ["sözleşme (açık teklif)", (m, c) => {
      m.kasaba.tp = { tn: 2, sn: 1, tk: [{ i: 1, t: "ortak", g: "o2", a: c.o, s: {} as never, e: 0, ac: 0, sa: 1, v: "ret", d: "acik" }], ob: [], hu: [], eg: {}, sy: [] };
    }, "goc_sozlesme"],
    ["açık iş (pazar ilanı)", (m, c) => {
      m.kasaba.ek = { n: 2, il: [{ i: 1, t: "sat", o: c.o, oa: c.ad, ml: "odun", q: 0, n: 1, n0: 1, f: 1, ac: 0, sa: 2, e: 0, d: "acik" }], is: [], lv: [] };
    }, "goc_acik_is"],
    ["para", (_m, c) => { c.pa = GOC_YOL_BEDELI - 1; }, "para_yok"],
  ];
  for (const [ad, kur, kod] of durumlar) {
    const m = await motor("develi", 2);
    kur(m, kar(m));
    assert.deepEqual(await dene(m), hata(kod as never), ad);
    assert.equal(kar(m).gc, undefined, `${ad}: reddedilen çıkış mühürlemez`);
    const on = deger(await m.gocOnizle(HESAP, "karapinar"));
    assert.equal(ilkEngel(on.kapilar), kod, `${ad}: önizleme aynı kapıyı gösterir`);
  }

  // Hedef: aynı yer ve geçersiz yerleşim.
  const m = await motor("develi");
  assert.deepEqual(await m.gocCikis(HESAP, { islem, hedef: "develi" }), hata("goc_ayni_yer"));
  assert.deepEqual(await m.gocCikis(HESAP, { islem, hedef: "yok-yer" }), hata("yerlesim_gecersiz"));
  assert.deepEqual(await m.gocCikis(HESAP, { islem: "bozuk", hedef: "karapinar" }), hata("gecersiz_istek"));
  assert.deepEqual(yerelKapilar(m.kasaba, kar(m), 0), { olu: true, yas: true, soguma: true, aile: true, mulk: true, borc: true, sozlesme: true, acikIs: true, para: true });
});

// ---------------------------------------------------------------- yerleşim adımları

test("göç adımları: çıkış mühürler ve paketi bir kez verir; giriş ikinci karakter açmaz; tamam sakini kapatır", async () => {
  const eski = await motor("develi", 2);
  const yeni = await motor("karapinar", 0);
  const c = kar(eski);
  c.pa = 50;
  c.ev = { odun: 25, alet: 2, deri: 10 };
  c.kq = { alet: [[3, 2, "o2"]] };
  c.nm = [10, 20, 30, 40];
  c.be = [5, 6, 7, 8, 9, 10];
  c.ky = 2;
  c.tv = { p: 77, a: 0, v: [] };
  c.tn = { o2: "dost" };
  const islem = "goc:adim-00001";

  const r1 = deger<{ paket: Nesne }>(await eski.gocCikis(HESAP, { islem, hedef: "karapinar" }));
  const p = r1.paket;
  assert.equal(p.kar.pa, 50 - GOC_YOL_BEDELI);
  assert.deepEqual(p.kar.ev, envanterBol({ odun: 25, alet: 2, deri: 10 }).tasinan);
  assert.deepEqual(p.emanet, envanterBol({ odun: 25, alet: 2, deri: 10 }).emanet);
  assert.equal(Object.values(p.kar.ev as Record<string, number>).reduce((a, x) => a + x, 0), GOC_TASIMA_EN_COK);
  assert.equal(p.kar.tn, undefined, "tanıdıklar taşınmaz");
  // Eski karakterde: akçe sıfır, yalnız emanet; mühürlü (eylem reddi).
  assert.equal(c.pa, 0);
  assert.deepEqual(c.ev, p.emanet);
  assert.deepEqual(await eski.eylem(HESAP, { tur: "dinlen", istekNo: "eylem-00001" }), hata("goc_suruyor"));
  assert.deepEqual(await eski.durum(HESAP, an(0), "tr"), hata("goc_suruyor"));
  // Aynı işlem aynı paketi döner (çift akçe yok); başka işlem reddedilir.
  assert.deepEqual(deger(await eski.gocCikis(HESAP, { islem, hedef: "karapinar" })), r1);
  assert.deepEqual(await eski.gocCikis(HESAP, { islem: "goc:baska-00001", hedef: "karapinar" }), hata("goc_suruyor"));

  // (2) giriş: yeni yerel kimlik, taşınanlar aynen; tekrar ikinci karakter açmaz.
  const g = deger<{ id: string }>(await yeni.gocGiris(HESAP, { islem, paket: p }));
  assert.deepEqual(deger(await yeni.gocGiris(HESAP, { islem, paket: p })), g);
  assert.equal(yeni.kasaba.sakin.filter((s) => s.h === HESAP).length, 1);
  assert.deepEqual(await yeni.gocGiris(HESAP, { islem: "goc:baska-00001", paket: p }), hata("goc_hedef_kayitli"));
  const y = kar(yeni);
  assert.equal(y.o, g.id);
  assert.equal(y.pa, 50 - GOC_YOL_BEDELI);
  assert.deepEqual(y.nm, [10, 20, 30, 40]);
  assert.deepEqual(y.be, [5, 6, 7, 8, 9, 10]);
  assert.equal(y.ky, 2);
  assert.equal(y.tv?.p, 77);
  assert.deepEqual(y.kq, { alet: [[3, 2, "o2"]] });
  assert.deepEqual(y.tn, {});
  assert.equal(y.e, 0, "hane NPC'leri eski yerde kalır");
  assert.equal(y.gg, yeni.kasaba.ay);
  const sakinYeni = yeni.kasaba.sakin.find((s) => s.h === HESAP)!;
  assert.equal(sakinYeni.tv, 2, "teveccüh kademesi (77 puan) sakin dizinine taşınır");
  // Akçe korunumu: yol bedeli dışında toplam sabit (eski 0 + yeni = önceki − bedel).
  assert.equal(c.pa + y.pa, 50 - GOC_YOL_BEDELI);
  // Mal korunumu: emanet + taşınan = önceki envanter.
  for (const mal of ["odun", "alet", "deri"]) assert.equal((c.ev?.[mal] ?? 0) + (y.ev?.[mal] ?? 0), ({ odun: 25, alet: 2, deri: 10 } as Nesne)[mal]);
  // Yenide "geldi" olayı (herkese açık) ve kronik satırı.
  const k2 = deger<Nesne>(await yeni.kronik("hesap-1", null, "tr"));
  assert.ok(k2.kronik.some((s: Nesne) => s.ozet.k === "kronik.goc.geldi" && s.ozet.p.kaynak === "develi"), JSON.stringify(k2));
  const d2 = deger<Nesne>(await yeni.olaylar("hesap-1", "0", "tr"));
  assert.ok(d2.olaylar.some((o: Nesne) => o.ozet.k === "olay.goc.geldi"), JSON.stringify(d2.olaylar.map((o: Nesne) => o.ozet.k)));

  // (3) tamam: sakin kaydı kapanır, eski yerde "göç etti" olayı ve kronik; tekrar güvenli.
  deger(await eski.gocTamam(HESAP, { islem }));
  deger(await eski.gocTamam(HESAP, { islem }));
  assert.equal(eski.kasaba.sakin.some((s) => s.h === HESAP), false);
  assert.deepEqual(await eski.durum(HESAP, an(0), "tr"), hata("sakin_yok"));
  const ok2 = deger<Nesne>(await eski.olaylar("hesap-2", "0", "tr"));
  assert.ok(ok2.olaylar.some((o: Nesne) => o.ozet.k === "olay.goc.gitti" && o.ozet.p.hedef === "karapinar"));
  const kr = deger<Nesne>(await eski.kronik("hesap-2", null, "tr"));
  assert.ok(kr.kronik.some((s: Nesne) => s.ozet.k === "kronik.goc.gitti"));
});

test("göç iptal: paket (yol bedeli dahil) aynen geri yazılır, mühür kalkar, eylem yeniden kabul edilir", async () => {
  const eski = await motor("develi");
  const c = kar(eski);
  c.pa = 20;
  c.ev = { odun: 40 };
  const islem = "goc:iptal-00001";
  deger(await eski.gocCikis(HESAP, { islem, hedef: "karapinar" }));
  assert.equal(c.pa, 0);
  const r = deger<{ geri: number }>(await eski.gocIptal(HESAP, { islem }));
  assert.equal(r.geri, 20);
  assert.equal(c.pa, 20);
  assert.deepEqual(c.ev, { odun: 40 });
  assert.equal(c.gc, undefined);
  assert.deepEqual(deger(await eski.gocIptal(HESAP, { islem })), { iptal: true, geri: 0 }, "ikinci iptal bir şey yazmaz");
  assert.equal(c.pa, 20);
  assert.ok((await eski.durum(HESAP, an(0), "tr")).ok);
});

test("göçle kapanan karakterin cüzdanına işletme ödemesi yazılmaz", async () => {
  const eski = await motor("develi");
  const c = kar(eski);
  c.gc = { i: "goc:x-0000001", h: "karapinar", a: 0, d: "kapandi", p: {} as never };
  const r = girisIsle(eski.kasaba, { i: "is-1", t: "cuzdana", a: 5, y: { o: c.o, tutar: 5 } } as never, an(0));
  assert.equal(r.durum, "red");
  assert.equal(r.neden, "kisi_yok");
  assert.equal(c.pa, 5);
});

test("göç sonrası misafirhane: hedefte 12 saat, şehir başına bir kez", async () => {
  const eski = await motor("develi");
  const yeni = await motor("karapinar", 0);
  const c = kar(eski);
  const islem = "goc:misafir-0001";
  const p = deger<{ paket: Nesne }>(await eski.gocCikis(HESAP, { islem, hedef: "karapinar" })).paket;
  deger(await yeni.gocGiris(HESAP, { islem, paket: p }));
  const y = kar(yeni);
  const t0 = an(0) + 1000;
  const a = barinmaIlerlet(yeni.kasaba, y, t0, false);
  assert.equal(a.durum, "misafir");
  assert.equal(a.konaklama?.tur, "misafirhane");
  assert.equal(a.konaklama?.bitis, y.br!.mh.karapinar![0] + SEHIR_KORUMA_MS);
  assert.ok(c.br === undefined || c.br.iy === "develi");
  // Hak bitince yenilenmez.
  const b = barinmaIlerlet(yeni.kasaba, y, y.br!.mh.karapinar![1] + 1, false);
  assert.notEqual(b.durum, "misafir");
});

// ---------------------------------------------------------------- HesapDO yürütücüsü

interface Dunya {
  depo: BellekDepo;
  motorlar: Map<string, YerlesimMotoru>;
  b: GocBaglami;
  /** Bir sonraki çağrıda kesinti: "once" çağrı yapılmadan, "sonra" çağrı işlendikten sonra (yanıt kaybolur). */
  kes: Map<string, "once" | "sonra">;
  cagrilar: string[];
  dunyaDepo: BellekDepo;
}

async function dunyaKur(simdi = an(0)): Promise<Dunya> {
  const dunyaDepo = bellekDepo();
  const depo = bellekDepo();
  const p = deger<Profil>(await kayitOl(dunyaDepo, { hesapId: HESAP, ad: "Ayşe", cinsiyet: "kadın", yerlesim: "develi" }, simdi));
  await depo.koy({ [PROFIL_ANAHTARI]: p });
  const motorlar = new Map<string, YerlesimMotoru>([["develi", await motor("develi", 2)], ["karapinar", await motor("karapinar", 0)], ["konuralp", await motor("konuralp", 0)]]);
  const kes = new Map<string, "once" | "sonra">();
  const cagrilar: string[] = [];
  const kesinti = async <T>(ad: string, f: () => Promise<T>): Promise<T> => {
    cagrilar.push(ad);
    const k = kes.get(ad);
    if (k) kes.delete(ad);
    if (k === "once") throw new Error("ağ kesildi");
    const r = await f();
    if (k === "sonra") throw new Error("yanıt kayboldu");
    return r;
  };
  const yerlesim = (i: YerlesimIleti): Promise<Sonuc<unknown>> => kesinti(i.islem, async () => {
    const m = motorlar.get(i.yerlesim)!;
    switch (i.islem) {
      case "gocOnizle": return m.gocOnizle(i.hesapId, i.hedef);
      case "gocCikis": return m.gocCikis(i.hesapId, i.govde);
      case "gocGiris": return m.gocGiris(i.hesapId, i.govde);
      case "gocTamam": return m.gocTamam(i.hesapId, i.govde);
      case "gocIptal": return m.gocIptal(i.hesapId, i.govde);
      default: return hata("gecersiz_istek");
    }
  });
  const dunya = (i: DunyaIleti): Promise<Sonuc<unknown>> => kesinti(i.islem, async () => {
    if (i.islem === "ozet") return { ok: true, deger: await dunyaOzeti(dunyaDepo, simdi) };
    if (i.islem === "gocKayit") return gocKayit(dunyaDepo, i.hesapId, i.kaynak, i.hedef, i.geri === true);
    return hata("gecersiz_istek");
  });
  const b: GocBaglami = { depo, hesapId: HESAP, simdi, yerlesim, dunya };
  return { depo, motorlar, b, kes, cagrilar, dunyaDepo };
}

const toplamAkce = (w: Dunya) => {
  let t = 0;
  for (const m of w.motorlar.values()) for (const c of m.kasaba.kar.values()) if (c.h === HESAP) t += c.pa;
  return t;
};
const kayitliKarakter = (w: Dunya) => [...w.motorlar.values()].flatMap((m) => m.kasaba.sakin.filter((s) => s.h === HESAP).map(() => m.kasaba.y));

test("göç yürütücüsü: önizleme = gerçek sonuç; profil, dünya kaydı ve nüfus taşınır; aynı istekNo aynı sonuç", async () => {
  const w = await dunyaKur();
  const c = kar(w.motorlar.get("develi")!);
  c.pa = 40;
  c.ev = { odun: 50 };
  const on = deger<Nesne>(await gocOnizle(w.b, "konuralp"));
  assert.equal(on.uygun, true);
  assert.equal(on.engel, null);
  assert.deepEqual(on.kapiSirasi.slice(0, 3), ["olu", "yas", "soguma"]);
  assert.equal(on.akce.tasinan, 40 - GOC_YOL_BEDELI);
  assert.deepEqual(on.misafirhane, { saat: 12, kullanildi: false });
  assert.ok(on.tasinanlar.includes("kulYemini") && on.kalanlar.includes("tanidiklar"));

  const r = deger<Nesne>(await gocBaslat(w.b, { hedef: "konuralp", istekNo: "goc-istek-0001" }));
  assert.equal(r.goc.akce, on.akce.tasinan);
  assert.deepEqual(r.goc.tasinan, on.envanter.tasinan);
  assert.deepEqual(r.goc.emanet, on.envanter.emanet);
  assert.equal(r.profil.yerlesim, "konuralp");
  assert.equal(r.profil.beylik, "yenisehir", "siyasi bölge yeni yerleşimden gelir");
  assert.deepEqual(kayitliKarakter(w), ["konuralp"]);
  assert.equal(toplamAkce(w), 40 - GOC_YOL_BEDELI);
  assert.equal(await w.depo.al(GOC_IS), undefined);
  const dz = await dunyaOzeti(w.dunyaDepo, an(0));
  const nufus = (id: string) => dz.beylikler.flatMap((x) => x.yerlesimler).find((y) => y.id === id)!.nufus;
  assert.deepEqual([nufus("develi"), nufus("konuralp")], [0, 1]);
  assert.deepEqual(await gocBaslat(w.b, { hedef: "konuralp", istekNo: "goc-istek-0001" }), { ok: true, deger: r });
  // Soğuma: yeni yerde 12 ay yeniden göç yok.
  const on2 = deger<Nesne>(await gocOnizle(w.b, "develi"));
  assert.equal(on2.engel, "goc_soguma");
  assert.deepEqual(await gocBaslat(w.b, { hedef: "develi", istekNo: "goc-istek-0002" }), hata("goc_soguma"));
  assert.deepEqual(on2.soguma, { sonGoc: 0, acilisAyi: GOC_SOGUMA_AY, sure: GOC_SOGUMA_AY });
});

test("göç yürütücüsü: makam/darbe kapısı siyasetten, doluluk dünyadan; önizleme ile aynı kod", async () => {
  for (const [siyaset, kod] of [[{ makam: true, darbe: false }, "goc_makam"], [{ makam: false, darbe: true }, "goc_darbe"]] as const) {
    const w = await dunyaKur();
    w.b.siyaset = async () => ({ ok: true, deger: siyaset });
    assert.equal(deger<Nesne>(await gocOnizle(w.b, "karapinar")).engel, kod);
    assert.deepEqual(await gocBaslat(w.b, { hedef: "karapinar", istekNo: "goc-istek-0001" }), hata(kod));
    assert.equal(kar(w.motorlar.get("develi")!).gc, undefined);
  }
  const w = await dunyaKur();
  await w.dunyaDepo.koy({ "nufus:karapinar": yerlesimBul("karapinar")!.evKapasite });
  assert.equal(deger<Nesne>(await gocOnizle(w.b, "karapinar")).engel, "yerlesim_dolu");
  assert.deepEqual(await gocBaslat(w.b, { hedef: "karapinar", istekNo: "goc-istek-0001" }), hata("yerlesim_dolu"));
  assert.equal(kar(w.motorlar.get("develi")!).pa, 5, "dolu hedef: hiçbir şey kesilmez");
});

for (const [adim, tur] of [
  ["gocCikis", "once"], ["gocCikis", "sonra"],
  ["gocKayit", "once"], ["gocKayit", "sonra"],
  ["gocGiris", "once"], ["gocGiris", "sonra"],
  ["gocTamam", "once"], ["gocTamam", "sonra"],
] as const) {
  test(`göç kesintisi: ${adim} ${tur === "once" ? "öncesi" : "sonrası (yanıt kayıp)"} → yeniden deneme; çift karakter ve çift akçe yok`, async () => {
    const w = await dunyaKur();
    const c = kar(w.motorlar.get("develi")!);
    c.pa = 30;
    c.ev = { odun: 45 };
    w.kes.set(adim, tur);
    const r1 = await gocBaslat(w.b, { hedef: "karapinar", istekNo: "goc-kes-00001" });
    assert.deepEqual(r1, hata("goc_suruyor"));
    assert.ok(await w.depo.al(GOC_IS), "iş kuyrukta kalır");
    const profil = deger<Profil>(await profilGetir(w.depo));
    const ikiSonrasi = adim === "gocTamam";
    assert.equal(profil.yerlesim, ikiSonrasi ? "karapinar" : "develi", "işaretçi yalnız (2) başarılıysa değişir");
    // Akçe hiçbir anda iki yerde değil: kuyruk dışında toplam ≤ önceki − bedel (paketteyken 0).
    assert.ok(toplamAkce(w) <= 30 - GOC_YOL_BEDELI || (adim === "gocCikis" && tur === "once" && toplamAkce(w) === 30));
    assert.ok(kayitliKarakter(w).length <= 2);
    // Sürdürme: sonraki istek işi bitirir.
    const s = await gocSurdur(w.b);
    assert.equal(s.durum, "bitti");
    const r2 = await gocBaslat(w.b, { hedef: "karapinar", istekNo: "goc-kes-00001" });
    assert.ok(r2.ok, JSON.stringify(r2));
    assert.deepEqual(kayitliKarakter(w), ["karapinar"], "tek karakter");
    assert.equal(w.motorlar.get("karapinar")!.kasaba.sakin.filter((x) => x.h === HESAP).length, 1);
    assert.equal(toplamAkce(w), 30 - GOC_YOL_BEDELI, "çift akçe yok");
    const y = kar(w.motorlar.get("karapinar")!);
    assert.equal((y.ev?.odun ?? 0) + (c.ev?.odun ?? 0), 45, "mal korunur");
    assert.equal(await w.depo.al(GOC_IS), undefined);
    assert.ok(await w.depo.al(GOC_ISTEK + "goc-kes-00001"));
  });
}

test("göç: (2) kalıcı ret (hedef arada doldu) → iptal; paket aynen geri, mühür kalkar, profil yerinde", async () => {
  const w = await dunyaKur();
  const c = kar(w.motorlar.get("develi")!);
  c.pa = 30;
  c.ev = { odun: 45 };
  const ozgun = w.b.dunya;
  // Önizlemeden sonra, kayıt anında hedef dolar.
  w.b.dunya = async (i) => {
    if (i.islem === "gocKayit" && !i.geri) await w.dunyaDepo.koy({ "nufus:karapinar": yerlesimBul("karapinar")!.evKapasite });
    return ozgun(i);
  };
  assert.deepEqual(await gocBaslat(w.b, { hedef: "karapinar", istekNo: "goc-dolu-00001" }), hata("yerlesim_dolu"));
  assert.equal(c.pa, 30);
  assert.deepEqual(c.ev, { odun: 45 });
  assert.equal(c.gc, undefined);
  assert.equal(deger<Profil>(await profilGetir(w.depo)).yerlesim, "develi");
  assert.deepEqual(kayitliKarakter(w), ["develi"]);
  assert.equal(await w.depo.al(GOC_IS), undefined);
  assert.deepEqual(await gocBaslat(w.b, { hedef: "karapinar", istekNo: "goc-dolu-00001" }), hata("yerlesim_dolu"), "aynı istekNo aynı sonuç");
});

test("göç: (2) yeni yerleşim kalıcı reddederse dünya kaydı geri alınır, iptal kesintide de tamamlanır", async () => {
  const w = await dunyaKur();
  const c = kar(w.motorlar.get("develi")!);
  c.pa = 12;
  // Hedefte aynı hesapla başka bir kayıt (beklenmeyen durum) → goc_hedef_kayitli (kalıcı).
  deger(await w.motorlar.get("karapinar")!.sakinEkle({ hesapId: HESAP, ad: "Eski", cinsiyet: "kadın", dogumAyi: -200 }));
  w.kes.set("gocIptal", "once");
  assert.deepEqual(await gocBaslat(w.b, { hedef: "karapinar", istekNo: "goc-red-000001" }), hata("goc_suruyor"));
  assert.equal(c.pa, 0, "iptal adımı kesildi: paket henüz geri yazılmadı");
  assert.deepEqual(await w.motorlar.get("develi")!.eylem(HESAP, { tur: "dinlen", istekNo: "eylem-00001" }), hata("goc_suruyor"));
  const s = await gocSurdur(w.b);
  assert.deepEqual(s, { durum: "bitti", sonuc: hata("goc_hedef_kayitli") });
  assert.equal(c.pa, 12);
  assert.equal(c.gc, undefined);
  const dz = await dunyaOzeti(w.dunyaDepo, an(0));
  const kayit = await w.dunyaDepo.al<Profil>(`kayit:${HESAP}`);
  assert.equal(kayit?.yerlesim, "develi", "dünya kaydı geri alındı");
  assert.equal(dz.beylikler[0]!.yerlesimler.find((y) => y.id === "develi")!.nufus, 1);
  assert.equal(deger<Profil>(await profilGetir(w.depo)).yerlesim, "develi");
});

test("göç: iş sürerken başka göç isteği goc_suruyor; bitince yenisi kapılardan geçer", async () => {
  const w = await dunyaKur();
  w.kes.set("gocGiris", "once");
  assert.deepEqual(await gocBaslat(w.b, { hedef: "karapinar", istekNo: "goc-bir-000001" }), hata("goc_suruyor"));
  w.kes.set("gocGiris", "once");
  assert.deepEqual(await gocBaslat(w.b, { hedef: "konuralp", istekNo: "goc-iki-000001" }), hata("goc_suruyor"));
  // Kesinti kalktı: ikinci istek önce eski işi bitirir, sonra kendi kapılarına bakar (soğuma).
  assert.deepEqual(await gocBaslat(w.b, { hedef: "konuralp", istekNo: "goc-iki-000001" }), hata("goc_soguma"));
  assert.deepEqual(kayitliKarakter(w), ["karapinar"]);
  assert.ok(w.cagrilar.includes("gocTamam"));
});
