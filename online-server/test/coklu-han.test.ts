// 4.9 Çoklu han (saf kurallar): yuva sayıları, köyde edinim reddi, 2.–5. hanın edinimi, aynı yerleşimde ikinci han
// reddi (edinim ve devir), ödemenin seçilen hanın kasasına gitmesi, kişi başı tek oda, kapanan handa kiracı ve
// sandığın korunması, 1. hanın NPC'ye dönmesi, han başına pano ve müdavimlik, şehir hanının kapasite ve bakımı.
import test from "node:test";
import assert from "node:assert/strict";
import { AY_MS, DUNYA_BASLANGICI_MS } from "../src/saat.ts";
import { meslekSec } from "../src/yerlesim/meslek.ts";
import { barinmaGorunumu, kapsama } from "../src/yerlesim/barinma.ts";
import { mudavimKaydi, mudavimZiyaret, GUN_MS } from "../src/yerlesim/mudavim.ts";
import { ilanEkle, panoGorunumu, PANO_EN_COK, type PanoKaydi } from "../src/han/pano.ts";
import { hanMasaAdi, masaAdi } from "../src/han/kurallar.ts";
import { ayIlerlet, bakim, isletmeKur, kapasite } from "../src/mulk/isletme.ts";
import { EDINIM_FIYATI, HAN_BAKIM, HAN_KAPASITE, MULK_YUVA, hanYuvaSayisi } from "../src/mulk/kurallar.ts";
import {
  devirKabul,
  devirTeklif,
  edin,
  girisIsle,
  hanNoCoz,
  hanNolari,
  hanVar,
  mulkDefteri,
  mulkListesi,
  mulkluHanOdemesi,
  mulkluIkram,
  mulkluKira,
  oyuncuHani,
} from "../src/mulk/tapu.ts";
import type { CikisKaydi } from "../src/mulk/transfer.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const AY = 10;
const AN = DUNYA_BASLANGICI_MS + AY * AY_MS + 1000;

function yetiskin(k: Kasaba, no: number, pa = 2000): Karakter {
  const kar = oyuncuEkle(k, no, AY - 12 * 20);
  kar.pa = pa;
  kar.nm = [30, 30, 0, 0];
  // Ayrı haneler: aynı küme bayrağı ödeme yönünü etkilemesin.
  kar.e = 900 + no;
  k.sakin.find((s) => s.o === kar.o)!.e = 900 + no;
  return kar;
}

/** IsletmeDO'nun yansısı gelmiş gibi: açık, kapısı açık oyuncu hanı. */
function yansit(k: Kasaba, id: string, ek: Record<string, unknown> = {}): void {
  const t = mulkDefteri(k).t[id]!;
  t.y = { ad: "", fc: 100, seviye: 0, durum: "acik", kapi: true, kapasite: 5, pn: [], po: [], to: [], as: 1, ...ek } as never;
}

function hanciYap(kar: Karakter): void {
  assert.ok(meslekSec(kar, "hanci", AY).ok);
  kar.ms!.s.hanci!.sv = { "hanci.yatakAhir": 1 };
}

test("4.9 yuva sayıları: şehir 5, kasaba 2, köy 0 (köyde yalnız NPC hanı)", () => {
  assert.deepEqual([MULK_YUVA.sehir.han, MULK_YUVA.kasaba.han, MULK_YUVA.koy.han], [5, 2, 0]);
  assert.deepEqual([hanYuvaSayisi("sehir"), hanYuvaSayisi("kasaba"), hanYuvaSayisi("koy")], [5, 2, 1]);
  assert.equal(EDINIM_FIYATI.sehir.han, 600);
  assert.equal(EDINIM_FIYATI.kasaba.han, 250);
  const sehir = testKasabasi("demirhan", AY);
  const a = yetiskin(sehir, 1);
  const hanYuvalari = mulkListesi(sehir, a).yuvalar.filter((y) => y.tur === "han");
  assert.equal(hanYuvalari.length, 5);
  assert.deepEqual(hanYuvalari.map((y) => [y.no, (y as { npc?: boolean }).npc, (y as { arsa?: boolean }).arsa]), [[1, true, false], [2, false, true], [3, false, true], [4, false, true], [5, false, true]]);
  assert.deepEqual(hanNolari(sehir), [1], "sahipsiz arsa han listesinde görünmez");
  const koy = testKasabasi("kizilca", AY);
  assert.equal(mulkListesi(koy, yetiskin(koy, 1)).yuvalar.filter((y) => y.tur === "han").length, 0);
  assert.deepEqual(hanNolari(koy), [1]);
});

test("4.9 köyde han edinilemez; NPC hanında oda kirası ve ikram bugünkü gibi çalışır", () => {
  const k = testKasabasi("kizilca", AY);
  const a = yetiskin(k, 1, 500);
  assert.deepEqual(edin(k, a, { tur: "han" }, AN, "e-koy-0001"), { ok: false, hata: "mulk_dolu" });
  assert.deepEqual(edin(k, a, { tur: "han", no: 1 }, AN, "e-koy-0002"), { ok: false, hata: "mulk_dolu" });
  assert.equal(a.pa, 500, "red akçe almaz");
  const kira = mulkluKira(k, a, { oda: "yatak", sure: 1, istekNo: "k-koy-0001" }, AN);
  assert.ok(kira.ok, JSON.stringify(kira));
  assert.equal((kira.deger.barinma as { hanNo: number }).hanNo, 1, "NPC hanı kirasında hanNo");
  assert.equal(kapsama(a.br!, "kizilca", false, AN + 1)?.tur, "oda", "köyde barınma kaybolmaz");
  const ik = mulkluIkram(k, a, "ekmek", AN, "i-koy-0001");
  assert.ok(ik.ok);
  assert.equal(ik.deger.batak, ik.deger.fiyat, "NPC hanında akçe dünyadan çıkar");
  assert.deepEqual(mulkluKira(k, a, { oda: "yatak", sure: 1, han: 2, istekNo: "k-koy-0002" }, AN), { ok: false, hata: "han_yok" });
});

test("4.9 şehirde 2.–5. hanın edinimi; aynı yerleşimde ikinci han reddi (edinim ve devir)", () => {
  const k = testKasabasi("demirhan", AY);
  const [a, b, c] = [yetiskin(k, 1), yetiskin(k, 2), yetiskin(k, 3)];
  const ra = edin(k, a, { tur: "han" }, AN, "e-sehir-0001");
  assert.ok(ra.ok);
  assert.equal((ra.deger.edinim as { isletme: string }).isletme, "demirhan.han.1", "ilk boş yuva 1. han (NPC hanı devralınır)");
  assert.equal(a.pa, 2000 - 600);
  const rb = edin(k, b, { tur: "han" }, AN, "e-sehir-0002");
  assert.equal((rb.ok && (rb.deger.edinim as { isletme: string }).isletme), "demirhan.han.2");
  const rc = edin(k, c, { tur: "han", no: 5 }, AN, "e-sehir-0003");
  assert.equal((rc.ok && (rc.deger.edinim as { isletme: string }).isletme), "demirhan.han.5", "yuva seçilebilir");
  assert.deepEqual(hanNolari(k), [1, 2, 5]);
  assert.equal(hanVar(k, 3), false);
  // Tekel: ikinci han yok; dükkân (kişi başı 2 mülk sınırı içinde) olur.
  assert.deepEqual(edin(k, a, { tur: "han" }, AN, "e-sehir-0004"), { ok: false, hata: "han_siniri" });
  assert.deepEqual(edin(k, c, { tur: "han", no: 2 }, AN, "e-sehir-0005"), { ok: false, hata: "han_siniri" });
  assert.ok(edin(k, a, { tur: "dukkan" }, AN, "e-sehir-0006").ok);
  // Dolu yuva: dördüncü kişi 2. yuvayı seçemez, ilk boş yuvayı (3) alır.
  const d = yetiskin(k, 4);
  assert.deepEqual(edin(k, d, { tur: "han", no: 2 }, AN, "e-sehir-0007"), { ok: false, hata: "mulk_dolu" });
  assert.deepEqual(edin(k, d, { tur: "han", no: 6 }, AN, "e-sehir-0008"), { ok: false, hata: "mulk_dolu" });
  // Devir: zaten han sahibi olan alıcı ikinci hanı devralamaz.
  assert.ok(devirTeklif(k, b, "demirhan.han.2", { islem: "teklif", alici: "o3", fiyat: 10 }).ok);
  assert.deepEqual(devirKabul(k, c, "demirhan.han.2", AN, "dv-0001"), { ok: false, hata: "han_siniri" });
  assert.equal(mulkDefteri(k).t["demirhan.han.2"]!.s, "o2");
  assert.equal(c.pa, 2000 - 600, "red ödeme almaz");
});

test("4.9 ödeme masanın hanının kasasına gider; fiyat çarpanı han başına; sahipsiz arsada ödeme yok", () => {
  const k = testKasabasi("demirhan", AY);
  const [a, b, m] = [yetiskin(k, 1), yetiskin(k, 2), yetiskin(k, 3, 100)];
  assert.ok(edin(k, a, { tur: "han", no: 2 }, AN, "e-od-0001").ok);
  assert.ok(edin(k, b, { tur: "han", no: 3 }, AN, "e-od-0002").ok);
  yansit(k, "demirhan.han.2", { fc: 150 });
  yansit(k, "demirhan.han.3", { fc: 50 });
  const md = mulkDefteri(k);
  md.cik.k = [];
  const i2 = mulkluIkram(k, m, "yemek", AN, "i-od-0001", 0, 2);
  const i3 = mulkluIkram(k, m, "yemek", AN, "i-od-0002", 0, 3);
  const i1 = mulkluIkram(k, m, "yemek", AN, "i-od-0003");
  assert.ok(i1.ok && i2.ok && i3.ok);
  assert.deepEqual([i2.deger.fiyat, i3.deger.fiyat], [9, 3], "fc han başına (6 × 150%, 6 × 50%)");
  assert.equal(i1.deger.batak, i1.deger.fiyat, "sahipsiz 1. han NPC: dünyadan çıkar");
  assert.deepEqual(md.cik.k.map((x) => [x.h, x.a]), [["demirhan.han.2", 9], ["demirhan.han.3", 3]]);
  const z = mulkluHanOdemesi(k, m, 8, AN, "z-od-0001", 0, false, 2);
  assert.ok(z.ok);
  assert.equal(md.cik.k.at(-1)!.h, "demirhan.han.2", "ziyafet de aynı hanın kasasına");
  const pa = m.pa;
  assert.deepEqual(mulkluIkram(k, m, "ekmek", AN, "i-od-0004", 0, 4), { ok: false, hata: "han_yok" });
  assert.equal(m.pa, pa);
  // Kapısı kapalı oyuncu hanı satmaz.
  yansit(k, "demirhan.han.3", { kapi: false });
  assert.deepEqual(mulkluIkram(k, m, "ekmek", AN, "i-od-0005", 0, 3), { ok: false, hata: "han_kapali" });
});

test("4.9 kira: seçilen hanın kasasına; kişi başı tek oda; kendi hanına kira yok", () => {
  const k = testKasabasi("demirhan", AY);
  const [a, b, m] = [yetiskin(k, 1), yetiskin(k, 2), yetiskin(k, 3, 100)];
  hanciYap(a);
  hanciYap(b);
  assert.ok(edin(k, a, { tur: "han", no: 2 }, AN, "e-kira-0001").ok);
  assert.ok(edin(k, b, { tur: "han", no: 4 }, AN, "e-kira-0002").ok);
  yansit(k, "demirhan.han.2", { fc: 150 });
  yansit(k, "demirhan.han.4");
  const md = mulkDefteri(k);
  md.cik.k = [];
  assert.ok(JSON.stringify(barinmaGorunumu(k, m, AN, { ...oyuncuHani(k, 2)!, sahip: a }).odalar) !== JSON.stringify(barinmaGorunumu(k, m, AN).odalar), "çarpanlı katalog NPC'ninkinden ayrı");
  const kira = mulkluKira(k, m, { oda: "yatak", sure: 1, han: 2, istekNo: "k-kira-0001" }, AN);
  assert.ok(kira.ok, JSON.stringify(kira));
  assert.equal(md.cik.k[0]!.h, "demirhan.han.2");
  // Yanıttaki barınma görünümü kiralanan hanın numarası ve kataloğuyla (GET /v1/barinma?han=2 biçimi).
  const br = kira.deger.barinma as { hanNo: number; odalar: unknown[] };
  assert.equal(br.hanNo, 2);
  assert.deepEqual(br.odalar, barinmaGorunumu(k, m, AN, { ...oyuncuHani(k, 2)!, sahip: a }).odalar, "kiralanan hanın kataloğu");
  assert.deepEqual(md.od["demirhan.han.2"]!.map(([o]) => o), ["o3"]);
  assert.equal(md.od["demirhan.han.4"], undefined, "doluluk han başına");
  assert.deepEqual(mulkluKira(k, m, { oda: "yatak", sure: 1, han: 4, istekNo: "k-kira-0002" }, AN), { ok: false, hata: "oda_var" }, "aynı anda tek oda (kişi başı)");
  assert.deepEqual(mulkluKira(k, m, { oda: "yatak", sure: 1, istekNo: "k-kira-0003" }, AN), { ok: false, hata: "oda_var" }, "NPC hanında da ikinci oda yok");
  assert.deepEqual(mulkluKira(k, a, { oda: "yatak", sure: 1, han: 2, istekNo: "k-kira-0004" }, AN), { ok: false, hata: "kendine" });
  assert.ok(mulkluKira(k, a, { oda: "yatak", sure: 1, han: 4, istekNo: "k-kira-0005" }, AN).ok, "başkasının hanında kiralanır");
  assert.deepEqual(mulkluKira(k, m, { oda: "yatak", sure: 1, han: "x", istekNo: "k-kira-0006" }, AN), { ok: false, hata: "han_gecersiz" });
  assert.equal(hanNoCoz(undefined), 1, "eski istek 1. hana");
  assert.equal(hanNoCoz("3"), 3);
  assert.equal(hanNoCoz(0), undefined);
});

test("4.9 kapanan han: kiracının sözleşmesi, sandığı ve akçesi korunur; 1. han NPC'ye döner, diğeri kapanır", () => {
  const k = testKasabasi("demirhan", AY);
  const [a, b, m] = [yetiskin(k, 1), yetiskin(k, 2), yetiskin(k, 3, 100)];
  hanciYap(b);
  assert.ok(edin(k, a, { tur: "han", no: 1 }, AN, "e-kap-0001").ok);
  assert.ok(edin(k, b, { tur: "han", no: 2 }, AN, "e-kap-0002").ok);
  yansit(k, "demirhan.han.1");
  yansit(k, "demirhan.han.2");
  assert.ok(mulkluKira(k, m, { oda: "yatak", sure: 3, han: 2, istekNo: "k-kap-0001" }, AN).ok);
  m.br!.sd = { ev: { ekmek: 2 }, kq: {} } as never;
  const once = structuredClone(m.br);
  const pa = m.pa;
  const md = mulkDefteri(k);
  const iflas = (id: string): CikisKaydi => ({ i: `${id}:tapu:${md.t[id]!.ts}`, t: "iflas", h: "demirhan", a: 0, y: { isletme: id, ts: md.t[id]!.ts } }) as unknown as CikisKaydi;
  assert.equal(girisIsle(k, iflas("demirhan.han.2"), AN).durum, "kabul");
  assert.equal(hanVar(k, 2), false);
  assert.deepEqual(hanNolari(k), [1]);
  assert.deepEqual(m.br, once, "kiracı kaydına dokunulmaz (sandık ve sözleşme yerinde)");
  assert.equal(m.pa, pa);
  assert.equal(kapsama(m.br!, "demirhan", false, AN + AY_MS)?.tur, "oda", "peşin kira bitişe dek konaklama sayılır");
  assert.deepEqual(mulkluIkram(k, m, "ekmek", AN, "i-kap-0001", 0, 2), { ok: false, hata: "han_yok" });
  // 1. han iflasta NPC'ye döner: masa ve ödeme bugünkü NPC yolundan.
  assert.equal(girisIsle(k, iflas("demirhan.han.1"), AN).durum, "kabul");
  assert.equal(oyuncuHani(k, 1), undefined);
  assert.ok(hanVar(k, 1));
  const ik = mulkluIkram(k, m, "ekmek", AN, "i-kap-0002");
  assert.ok(ik.ok && ik.deger.batak === ik.deger.fiyat);
  // Kapanan arsa yeniden edinilebilir (yeni tapu sürümü).
  const c = yetiskin(k, 4);
  const yeni = edin(k, c, { tur: "han", no: 2 }, AN, "e-kap-0003");
  assert.ok(yeni.ok);
  assert.equal(md.t["demirhan.han.2"]!.s, "o4");
});

test("4.9 masa adları: 1. han değişmez, diğerleri ayrı; pano ve müdavimlik han başına", () => {
  assert.equal(hanMasaAdi("demirhan", "han", 1, 3), masaAdi("demirhan", "han", 3));
  assert.equal(hanMasaAdi("demirhan", "han", 1, 3), "masa:demirhan:han:3");
  assert.equal(hanMasaAdi("demirhan", "han", 2, 3), "masa:demirhan:han2:3");
  assert.notEqual(hanMasaAdi("develi", "kucukHan", 2, 1), hanMasaAdi("develi", "kucukHan", 1, 1));

  const p: PanoKaydi = { n: 0, l: [] };
  const i1 = ilanEkle(p, { o: "o1", ad: "A", t: "is", m: "bir" }, AN);
  const i2 = ilanEkle(p, { o: "o1", ad: "A", t: "is", m: "iki" }, AN, 2);
  assert.notEqual(i1.i, i2.i, "ilan kimliği yerleşimde tek");
  assert.deepEqual(panoGorunumu(p, "o1", AN).map((x) => x.metin), ["bir"], "eski çağrı 1. hanın panosu");
  assert.deepEqual(panoGorunumu(p, "o1", AN, 2).map((x) => x.metin), ["iki"]);
  assert.equal(panoGorunumu(p, "o1", AN, null).length, 2, "şikâyet araması bütün hanlarda");
  for (let i = 0; i < PANO_EN_COK + 3; i++) ilanEkle(p, { o: "o2", ad: "B", t: "is", m: `x${i}` }, AN + i, 3);
  assert.equal(panoGorunumu(p, "o1", AN + 100, 3).length, PANO_EN_COK, "sınır han başına");
  assert.equal(panoGorunumu(p, "o1", AN + 100).length, 1, "başka hanın taşması 1. hanın ilanını düşürmez");

  const k = testKasabasi("demirhan", AY);
  const a = yetiskin(k, 1);
  for (let g = 0; g < 6; g++) mudavimZiyaret(a, AN + g * GUN_MS, AY, 2);
  assert.equal(mudavimKaydi(a, 2)?.r, 1, "2. handa ilk rozet");
  assert.equal(mudavimKaydi(a, 1), undefined, "1. hanın sayımı ayrı");
  const r = mudavimZiyaret(a, AN, AY);
  assert.equal(r.sayi, 1);
  assert.equal(a.md?.r, 0);
});

test("4.9 şehir hanı daha büyük ve pahalı: kapasite ve bakım yerleşim türüne göre", () => {
  const sahip = { h: "hesap-1", o: "o1", ad: "A" };
  const sehir = isletmeKur("demirhan.han.2", "demirhan", "han", 2, sahip, 1, AY);
  const kasaba = isletmeKur("develi.han.2", "develi", "han", 2, sahip, 1, AY);
  const dukkan = isletmeKur("demirhan.dukkan.1", "demirhan", "dukkan", 1, sahip, 1, AY);
  assert.deepEqual([kapasite(sehir), kapasite(kasaba)], [HAN_KAPASITE.sehir[0], HAN_KAPASITE.kasaba[0]]);
  assert.deepEqual([kapasite(sehir), kapasite(kasaba)], [5, 3]);
  assert.deepEqual([bakim(sehir), bakim(kasaba), bakim(dukkan)], [HAN_BAKIM.sehir, HAN_BAKIM.kasaba, 3]);
  sehir.kasa = 100;
  ayIlerlet(sehir, AY + 1, AN + AY_MS);
  const bakimSatiri = sehir.df.flatMap((d) => Object.entries(d)).find(([k]) => k === "bakim");
  assert.ok(sehir.batak >= HAN_BAKIM.sehir, `bakım düşüldü (${JSON.stringify(bakimSatiri ?? null)})`);
});

test("4.9 masa doluluk kaydı: mutlak değer, eski z yok sayılır, boşalan masa silinir, masa adı çözümü", async () => {
  const { dolulukUygula, hanMasaOzeti, masaAdiCoz } = await import("../src/han/doluluk.ts");
  assert.deepEqual(masaAdiCoz("masa:demirhan:han:3"), { yerlesim: "demirhan", han: 1, no: 3 });
  assert.deepEqual(masaAdiCoz("masa:develi:kucukHan2:4"), { yerlesim: "develi", han: 2, no: 4 });
  assert.equal(masaAdiCoz("masa:x"), undefined);
  const kayit = {};
  assert.equal(dolulukUygula(kayit, [{ han: 2, masa: 1, oturan: 3, acik: true, z: 10 }, { han: 2, masa: 2, oturan: 0, acik: false, z: 10 }]), true);
  assert.deepEqual(hanMasaOzeti(kayit, 2, 8), { sayi: 8, acik: 7, oturan: 3 });
  assert.equal(dolulukUygula(kayit, [{ han: 2, masa: 1, oturan: 3, acik: true, z: 10 }]), false, "tekrar zararsız");
  assert.equal(dolulukUygula(kayit, [{ han: 2, masa: 1, oturan: 1, acik: true, z: 5 }]), false, "eski z yok sayılır");
  dolulukUygula(kayit, [{ han: 2, masa: 1, oturan: 0, acik: true, z: 20 }, { han: 2, masa: 2, oturan: 0, acik: true, z: 20 }, { bozuk: 1 }]);
  assert.deepEqual(kayit, {}, "boşalan masa kaydı silinir");
  assert.deepEqual(hanMasaOzeti(kayit, 1, 8), { sayi: 8, acik: 8, oturan: 0 });
});
