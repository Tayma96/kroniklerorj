// Faz 6 ekonomi (saf fonksiyonlar): kalite partileri ve yapan izi, ürün kalitesi, alet kalitesinin etkisi, yeni
// tarifler, oyuncu pazarı (emanet, bac, pompa sınırı), ısmarlama (avans, teslim, gecikme), Ustalar Levhası, defter.
import test from "node:test";
import assert from "node:assert/strict";
import { ETKILER } from "../src/icerik/agaclar/index.ts";
import { MALLAR } from "../src/icerik/mallar.ts";
import { TARIFLER } from "../src/icerik/tarifler.ts";
import { kancaMi, seviyeVer } from "../src/yerlesim/beceri.ts";
import { DEFTER_AY, defterGorunumu, defterYaz } from "../src/yerlesim/defter.ts";
import { ekonomiDonumu } from "../src/yerlesim/ekonomi-donum.ts";
import { ismarla, ismarlamaCevap, ismarlamaEmaneti, ismarlamaSicili, ISMARLAMA_HIZMET } from "../src/yerlesim/ismarlama.ts";
import {
  ALET_KALITE_OMUR,
  ALET_KALITE_VERIM,
  KALITE_ESIK,
  enIyiKalite,
  kademeBul,
  kaliteAdedi,
  kaliteliCikar,
  kaliteliEkle,
  urunKalitesi,
} from "../src/yerlesim/kalite.ts";
import { levhaGorunumu, levhaYaz } from "../src/yerlesim/levha.ts";
import { ilerleme, meslekSec } from "../src/yerlesim/meslek.ts";
import { envanterEkle } from "../src/yerlesim/npc-taban.ts";
import { HEDIYE_ALMA_AYLIK } from "../src/yerlesim/teklif.ts";
import {
  PAZAR_BAC_ORANI,
  ekonomiAl,
  ilanAc,
  ilanGeri,
  ilanIsle,
  karsilastirma,
  pazarEmaneti,
  pompaDenetle,
} from "../src/yerlesim/pazar-tahta.ts";
import { ALET_OMRU, aletOmru, tarifListesi, tarifYap } from "../src/yerlesim/tarif.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const hep = (x: number) => () => x;

function yetiskin(k: Kasaba, no: number, meslek?: string): Karakter {
  const c = oyuncuEkle(k, no, k.ay - 16 * 12);
  c.e = 9000 + no; // ayrı ocaklar
  c.tk = 18;
  c.ta = k.ay;
  c.pa = 200;
  if (meslek) meslekSec(c, meslek, k.ay);
  return c;
}

/** Oyuncular + emanet + hazine: aktarımlarda değişmez. */
function toplamAkce(k: Kasaba, oyuncular: Karakter[]): number {
  return oyuncular.reduce((a, c) => a + c.pa, 0) + pazarEmaneti(k.ek) + ismarlamaEmaneti(k.ek) + (k.hd?.hz ?? 0);
}

test("kalite partileri: eski sayısal envanter sade; çıkarmada önce izsiz sade, sonra en düşük kalite; yetmezse değişmez", () => {
  const k = testKasabasi();
  const c = yetiskin(k, 1);
  c.ev = { alet: 2 }; // eski kayıt: izsiz
  assert.equal(kaliteAdedi(c, "alet", 0), 2);
  kaliteliEkle(c, "alet", [[2, 1, "o9"], [1, 1, "o8"]]);
  assert.equal(c.ev.alet, 4);
  assert.equal(enIyiKalite(c, "alet"), 2);
  envanterEkle(c, "alet", -3); // 2 izsiz + 1 iyi düşer
  assert.equal(c.ev.alet, 1);
  assert.deepEqual(c.kq?.alet, [[2, 1, "o9"]]);
  assert.equal(kaliteliCikar(c, "alet", 2, 2), null);
  assert.equal(c.ev.alet, 1);
  assert.deepEqual(kaliteliCikar(c, "alet", 1, 2), [[2, 1, "o9"]]);
  assert.equal(c.ev.alet, undefined);
  assert.equal(c.kq, undefined);
});

test("ürün kalitesi: deterministik döküm (toplam = kalemler), eşikler, kalfa+kalite düğümü+üstün alet yükseltir", () => {
  const k = testKasabasi();
  const c = yetiskin(k, 1, "demirci");
  const t = TARIFLER.kilic;
  const cirak = urunKalitesi(c, t, 0, null, hep(0));
  assert.equal(cirak.kademe, 0);
  assert.equal(cirak.dokum.toplam, cirak.dokum.kalemler.reduce((a, x) => a + x.d, 0));
  ilerleme(c, "demirci").kd = 2;
  c.be[3] = 50;
  const usta = urunKalitesi(c, t, 20, 2, hep(0.99));
  assert.equal(usta.dokum.toplam, 20 + 10 + 20 + 10 + 19);
  assert.equal(usta.kademe, kademeBul(79));
  assert.equal(usta.ad, "ustun");
  assert.equal(kademeBul(KALITE_ESIK[3]!), 3);
  assert.deepEqual(urunKalitesi(c, t, 20, 2, hep(0.5)), urunKalitesi(c, t, 20, 2, hep(0.5)));
});

test("tarif: çıktı kalite ve yapan iziyle envantere girer; kılıç kalitesi 'silah' düğümünden; levha üstünü bir kez yazar", () => {
  const k = testKasabasi();
  const c = yetiskin(k, 1, "demirci");
  seviyeVer(c, "demirci.temelDovme", 1);
  seviyeVer(c, "demirci.aletcilik", 3);
  seviyeVer(c, "demirci.silahDovme", 3); // kılıç + kalite("silah", 20)
  ilerleme(c, "demirci").kd = 2;
  c.be[3] = 100;
  c.ev = { cevher: 4, komur: 4, deri: 2 };
  const r = tarifYap(c, "kilic", k.ay, hep(0.99));
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(r.deger.yapan, c.o);
  assert.ok(r.deger.kalite.dokum.kalemler.some((x) => x.k === "kalite.beceri" && x.d === 20));
  assert.equal(r.deger.kalite.kademe, 2); // 20 + 20 + 20 + 19 = 79
  assert.deepEqual(c.kq?.kilic, [[2, 1, c.o]]);
  const lv = levhaYaz(k, c, "kilic", "kilic", 2, k.ay);
  assert.ok(lv && lv.olay.g === "");
  assert.equal(levhaYaz(k, c, "kilic", "kilic", 2, k.ay + 1), null, "tek sefer izi");
  assert.equal(levhaYaz(k, c, "nal", "nal", 1, k.ay), null, "iyi kalite levhaya girmez");
  const g = levhaGorunumu(k);
  assert.equal(g.kayitlar.length, 1);
  assert.deepEqual(g.ustalar[0], { id: c.o, ad: c.ad, saheser: 0, ustun: 1 });
});

test("alet kalitesi (yapanın ustalığı): üstün alet hasatta fazladan çıktı ve ömür verir; kullanılan en iyi alet tükenir", () => {
  const k = testKasabasi();
  const c = yetiskin(k, 1, "ciftci");
  seviyeVer(c, "ciftci.ekinBilgisi", 1);
  c.ev = { alet: 1 }; // izsiz sade
  kaliteliEkle(c, "alet", [[2, 1, "o7"]]);
  assert.equal(aletOmru(c, "alet"), ALET_OMRU + ALET_KALITE_OMUR[2]!);
  const r = tarifYap(c, "hasat", k.ay);
  assert.ok(r.ok);
  assert.equal(r.deger.cikti.adet, TARIFLER.hasat.arac.adet + ALET_KALITE_VERIM[2]!);
  assert.equal(r.deger.arac?.kalite, 2);
  c.as = { alet: ALET_OMRU + ALET_KALITE_OMUR[2]! - 1 };
  const son = tarifYap(c, "hasat", k.ay + 1);
  assert.ok(son.ok && son.deger.arac?.asindi);
  assert.equal(c.ev.alet, 1);
  assert.equal(enIyiKalite(c, "alet"), 0, "üstün alet tükendi, sade kaldı");
});

test("yeni tarifler: zorunlu araç yoksa arac_yok (değişmez), yan çıktı, etki aracı (doğrama + alet) aşınır", () => {
  const k = testKasabasi();
  const c = yetiskin(k, 1, "oduncu");
  seviyeVer(c, "oduncu.tasOcagi", 3);
  seviyeVer(c, "oduncu.kesmeBlok", 1);
  c.ev = { kesmeTas: 2 };
  assert.deepEqual(tarifYap(c, "blok", k.ay), { ok: false, hata: "arac_yok" });
  assert.equal(c.tk, 18);
  assert.equal(tarifListesi(c).find((x) => x.id === "blok")!.yapilabilir, false);
  c.ev.alet = 1;
  assert.ok(tarifYap(c, "blok", k.ay).ok);
  assert.equal(c.ev.blok, 1);

  const f = yetiskin(k, 2, "ciftci");
  seviyeVer(f, "ciftci.kesimVePost", 1);
  const ks = tarifYap(f, "kesim", k.ay);
  assert.ok(ks.ok);
  assert.deepEqual([f.ev?.et, f.ev?.post], [2, 1]);

  const m = yetiskin(k, 3, "marangoz");
  seviyeVer(m, "marangoz.dogramacilik", 2); // doğrama + arac("dograma", "alet", 1)
  m.ev = { kereste: 2, civi: 2, alet: 1 };
  const d = tarifYap(m, "dograma", k.ay);
  assert.ok(d.ok);
  assert.equal(d.deger.cikti.adet, 2);
  assert.equal(d.deger.etkiAraci?.mal, "alet");
  assert.equal(m.as?.alet, 1);
});

test("kanca bağları: altı meslekte tarif kancaları gerçek tarif; kalite ve tarif hedefli araç etkileri bağlı", () => {
  for (const id of Object.keys(TARIFLER)) {
    const t = TARIFLER[id as keyof typeof TARIFLER];
    assert.ok(Object.hasOwn(MALLAR, t.cikti[0]), id);
  }
  const bagliTarif = (m: string) => ETKILER.filter((e) => e.dugum.startsWith(`${m}.`) && e.etki.tur === "tarif" && !kancaMi(e.etki)).length;
  for (const m of ["ciftci", "oduncu", "demirci", "marangoz", "dokumaci", "asci"]) assert.ok(bagliTarif(m) >= 4, `${m}: ${bagliTarif(m)}`);
  const kalite = ETKILER.filter((e) => e.etki.tur === "kalite" && !kancaMi(e.etki)).map((e) => e.dugum);
  assert.ok(kalite.includes("demirci.silahDovme") && kalite.includes("dokumaci.iplikEgirme"), kalite.join(","));
  assert.ok(ETKILER.some((e) => e.dugum === "asci.degirmenUnu" && e.etki.tur === "arac" && !kancaMi(e.etki)));
});

test("pazar: satış ilanı malı, alım ilanı akçeyi emanete alır; işlem kısmi, bac hazineye; toplam akçe değişmez", () => {
  const k = testKasabasi();
  const a = yetiskin(k, 1);
  const b = yetiskin(k, 2);
  const herkes = [a, b];
  a.ev = { nal: 5 };
  const t0 = toplamAkce(k, herkes);
  const s = ilanAc(k, a, { tur: "sat", mal: "nal", adet: 4, fiyat: 10 }, k.ay);
  assert.ok(s.ok, JSON.stringify(s));
  assert.equal(a.ev.nal, 1);
  assert.deepEqual(ilanIsle(k, a, a, `p${s.deger.ilan.i}`, 1, undefined, k.ay), { ok: false, hata: "kendine" });
  const i1 = ilanIsle(k, b, a, `p${s.deger.ilan.i}`, 3, undefined, k.ay);
  assert.ok(i1.ok, JSON.stringify(i1));
  assert.equal(i1.deger.sonuc.tutar, 30);
  assert.equal(i1.deger.sonuc.bac, Math.floor(30 * PAZAR_BAC_ORANI));
  assert.equal(b.ev?.nal, 3);
  assert.equal(a.pa, 200 + i1.deger.sonuc.net);
  assert.equal(k.hd?.hz, i1.deger.sonuc.bac);
  assert.equal(s.deger.ilan.n, 1);
  assert.equal(toplamAkce(k, herkes), t0);
  // Alım ilanı: akçe kilitlenir; satıcı doldurur.
  const al = ilanAc(k, a, { tur: "al", mal: "odun", adet: 5, fiyat: 2, sure: 1 }, k.ay);
  assert.ok(al.ok);
  assert.equal(pazarEmaneti(k.ek, a.o), 10);
  b.ev = { ...b.ev, odun: 3 };
  assert.ok(ilanIsle(k, b, a, `p${al.deger.ilan.i}`, 3, undefined, k.ay).ok);
  assert.equal(a.ev?.odun, 3);
  assert.equal(toplamAkce(k, herkes), t0);
  // Süre dolunca (sonraki ay dönümü) kalan emanet iade edilir; satış ilanı geri çekilince mal döner.
  ekonomiDonumu(k, k.ay + 1);
  assert.equal(al.deger.ilan.d, "dustu");
  assert.equal(pazarEmaneti(k.ek, a.o), 0);
  const geri = ilanGeri(k, a, `p${s.deger.ilan.i}`, k.ay + 1);
  assert.ok(geri.ok);
  assert.equal(a.ev?.nal, 2);
  assert.equal(toplamAkce(k, herkes), t0);
  assert.deepEqual(ilanGeri(k, a, `p${s.deger.ilan.i}`, k.ay + 1), { ok: false, hata: "ilan_kapandi" });
});

test("pazar: karşılaştırma dökümü NPC tabanını gösterir; adil bant dışı fark armağan tavanına yazılır; aynı hanede iki kat", () => {
  const k = testKasabasi();
  const a = yetiskin(k, 1);
  const b = yetiskin(k, 2);
  const kd = karsilastirma("nal", 0, 12);
  assert.equal(kd.npcTaban, MALLAR.nal.taban);
  assert.equal(kd.tabanOrani, Math.round((12 / MALLAR.nal.taban) * 100));
  // 1 odun (taban 1) için 1000 akçe: bant üstü fark tavanı aşar.
  a.ev = { odun: 3 };
  b.pa = 5000;
  const s = ilanAc(k, a, { tur: "sat", mal: "odun", adet: 1, fiyat: 1000 }, k.ay);
  assert.ok(s.ok, "fiyat tavanı yok: ilan açılır");
  const t0 = b.pa;
  assert.deepEqual(ilanIsle(k, b, a, `p${s.deger.ilan.i}`, 1, undefined, k.ay), { ok: false, hata: "pompa_siniri" });
  assert.equal(b.pa, t0);
  // Bant içi ama üst sınırı aşan küçük fark armağan sayılır.
  const s2 = ilanAc(k, a, { tur: "sat", mal: "odun", adet: 1, fiyat: 13 }, k.ay);
  assert.ok(s2.ok);
  const r = ilanIsle(k, b, a, `p${s2.deger.ilan.i}`, 1, undefined, k.ay);
  assert.ok(r.ok);
  assert.equal(r.deger.sonuc.pompa.hediye, 13 - 3);
  assert.deepEqual(a.ha, [k.ay, 10]);
  // Aynı hane: bant sıfır, fark iki kat.
  b.e = a.e;
  const p = pompaDenetle(a, b, "odun", 0, 1, 6, k.ay);
  assert.ok(p.ok && p.deger.ayniKume && p.deger.hediye === (6 - 1) * 2);
  const asiri = pompaDenetle(a, b, "odun", 0, 1, HEDIYE_ALMA_AYLIK, k.ay);
  assert.deepEqual(asiri, { ok: false, hata: "pompa_siniri" });
});

test("ısmarlama: aynı hane ve kendine kapalı; ücret emanette; teslimde ödeme, yapan izi, tecrübe, sicil; tekrar azalan", () => {
  const k = testKasabasi();
  const m = yetiskin(k, 1);
  const u = yetiskin(k, 2, "demirci");
  const herkes = [m, u];
  const t0 = toplamAkce(k, herkes);
  assert.deepEqual(ismarla(k, m, m, {}, k.ay), { ok: false, hata: "kendine" });
  const yan = yetiskin(k, 3, "demirci");
  yan.e = m.e;
  assert.deepEqual(ismarla(k, m, yan, { mal: "nal", adet: 2, sure: 2, ucret: 16 }, k.ay), { ok: false, hata: "ayni_kume" });
  assert.deepEqual(ismarla(k, m, u, { mal: "tahil", adet: 2, sure: 2, ucret: 6 }, k.ay), { ok: false, hata: "meslek_yok" });
  const g = { mal: "nal", adet: 2, sure: 2, ucret: 20, kalite: 1 };
  const r = ismarla(k, m, u, g, k.ay);
  assert.ok(r.ok, JSON.stringify(r));
  const id = `i${r.deger.ismarlama.i}`;
  assert.equal(m.pa, 180);
  assert.equal(toplamAkce(k, herkes), t0 + 0);
  assert.deepEqual(ismarlamaCevap(k, u, m, id, "teslim", undefined, k.ay), { ok: false, hata: "ismarlama_kapandi" }, "önce kabul");
  assert.ok(ismarlamaCevap(k, u, m, id, "kabul", undefined, k.ay).ok);
  assert.deepEqual(ismarlamaCevap(k, m, u, id, "geri", undefined, k.ay), { ok: false, hata: "ismarlama_kapandi" }, "kabulden sonra geri yok");
  u.ev = { nal: 2 }; // sade: kalite 1 istenmişti
  assert.deepEqual(ismarlamaCevap(k, u, m, id, "teslim", undefined, k.ay), { ok: false, hata: "mal_yok" });
  kaliteliEkle(u, "nal", [[1, 2, u.o]]);
  const t = ismarlamaCevap(k, u, m, id, "teslim", undefined, k.ay);
  assert.ok(t.ok, JSON.stringify(t));
  assert.equal(t.deger.teslim?.kalite, 1);
  assert.equal(t.deger.teslim?.hizmet, ISMARLAMA_HIZMET + 1);
  assert.equal(u.pa, 220);
  assert.deepEqual(m.kq?.nal, [[1, 2, u.o]]);
  assert.equal(ismarlamaSicili(u).teslim, 1);
  assert.equal(toplamAkce(k, herkes), t0);
  // Aynı müşteriden ikinci teslim: tecrübe yarıya iner.
  const r2 = ismarla(k, m, u, { mal: "nal", adet: 2, sure: 2, ucret: 16 }, k.ay);
  assert.ok(r2.ok);
  ismarlamaCevap(k, u, m, `i${r2.deger.ismarlama.i}`, "kabul", undefined, k.ay);
  const t2 = ismarlamaCevap(k, u, m, `i${r2.deger.ismarlama.i}`, "teslim", undefined, k.ay);
  assert.ok(t2.ok);
  assert.equal(t2.deger.teslim?.carpan, 0.5);
});

test("ısmarlama: gecikmede varsayılan (emanet iade, sicilde gecikme, ceza yok); cevapsız düşer", () => {
  const k = testKasabasi();
  const m = yetiskin(k, 1);
  const u = yetiskin(k, 2, "demirci");
  const a = ismarla(k, m, u, { mal: "nal", adet: 2, sure: 1, ucret: 16 }, k.ay);
  const b = ismarla(k, m, u, { mal: "alet", adet: 1, sure: 1, ucret: 24 }, k.ay);
  assert.ok(a.ok && b.ok);
  ismarlamaCevap(k, u, m, `i${a.deger.ismarlama.i}`, "kabul", undefined, k.ay);
  assert.equal(m.pa, 160);
  ekonomiDonumu(k, k.ay + 1);
  assert.equal(a.deger.ismarlama.d, "gecikti");
  assert.equal(b.deger.ismarlama.d, "dustu");
  assert.equal(m.pa, 200);
  assert.equal(u.pa, 200, "ustaya para cezası yok");
  assert.deepEqual(ismarlamaSicili(u), { teslim: 0, gecikme: 1, guven: 0 });
  assert.ok(defterGorunumu(m, k.ay + 1).kalemler.some((x) => x.k === "ismarlamaIade" && x.d === 40));
});

test("defter: kalemler aylara yazılır, pencere dışı düşer, gelir/gider/net", () => {
  const k = testKasabasi();
  const c = yetiskin(k, 1);
  defterYaz(c, 1, "npcSatis", 10);
  defterYaz(c, 1, "npcAlim", -4);
  defterYaz(c, 2, "pazarSatis", 7);
  defterYaz(c, 2, "uydurma", 1);
  const g = defterGorunumu(c, 2);
  assert.deepEqual(g.toplam, { gelir: 18, gider: 4, net: 14 });
  assert.equal(g.aylar[0]!.ay, 2);
  assert.ok(g.aylar[0]!.kalemler.some((x) => x.k === "diger"));
  defterYaz(c, 2 + DEFTER_AY, "eylem", 1);
  assert.equal(c.df!.some((x) => x[0] <= 2), false);
  void ekonomiAl;
});
