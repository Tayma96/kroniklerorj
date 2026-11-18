// Kanca partisi 2, hak s–z (18 Kasım): bağlanan her hak kancasının davranışı ve sınırları. Ortak dert (salgın bakımı,
// yol devriyesi, yol emini, hazine zahiresi), şenlik süsü, kırık sarmada yaralı durumu, arabuluculukta tanık sözü,
// ulufe payı koltuğu, barınma (zaviye, yoksul çorbası), han sahnesi. Hiçbiri akçe basmaz; ödüller tek sefer kalır.
import test from "node:test";
import assert from "node:assert/strict";
import { ETKILER } from "../src/icerik/agaclar/index.ts";
import { BOSTA_KANCALAR } from "../src/icerik/bosta-kancalar.ts";
import { KANCA_BAGLARI, kancaAnahtari } from "../src/icerik/kanca-kayit.ts";
import { kancaHesapla } from "../src/mulk/kanca.ts";
import { KANCA_TAVAN } from "../src/mulk/tezgah-kurallar.ts";
import { ucgenAl } from "../src/yerlesim/bilgi.ts";
import { ARACI_TANIK_SOZU, araciIste, arabuluculukSansi } from "../src/yerlesim/arabulucu.ts";
import { ayBasi, barinmaDonumu, barinmaGorunumu, barinmaHaklari, tesisKonakla, TESIS_PENCERE_EN_COK, YOKSUL_CORBA_BEDEL, ZAVIYE_TESIS_EK } from "../src/yerlesim/barinma.ts";
import { seviyeVer } from "../src/yerlesim/beceri.ts";
import { CAN_YARALI_ESIGI, halAl, halDegistir } from "../src/yerlesim/hal.ts";
import { hanedanKasabasi } from "../src/yerlesim/hanedan.ts";
import { KASABA_GOREV_KOLTUKLARI, hizmetGorevDonumu } from "../src/yerlesim/hizmet-gorev.ts";
import { YARALI_CAN_TABANI, hizmetHazirla, hizmetIlanAc, hizmetIlanIsle } from "../src/yerlesim/hizmet-pazari.ts";
import { hizmetTarifiBul } from "../src/yerlesim/hizmet-tarif.ts";
import { dugumSeviyesi } from "../src/yerlesim/meslek.ts";
import { DERT_HAK_EKI, ORTAK_DERT_GONUL, ZAHIRE_ALIM_AKCE, ortakDertDonumu, ortakDertKatki, uygunKatkilar, type DertTuru, type OrtakDert } from "../src/yerlesim/ortak-dert.ts";
import { ekonomiAl } from "../src/yerlesim/pazar-tahta.ts";
import { SENLIK_MORAL, SENLIK_SUSLEME_MORAL, senlikDonumu, senlikDurumu, senlikKatki } from "../src/yerlesim/senlik.ts";
import { gostergeOku, toplulukAl } from "../src/yerlesim/topluluk-kayit.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { toplamAkce } from "./hanedan-yardimci.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";
import { baglam, dostYap, senaryo } from "./ucgen-yardimci.ts";

const AY = 300;

const BAGLANANLAR = [
  "hak:salginKatkisi",
  "hak:yolDevriyesi",
  "hak:yolEmini",
  "hak:zahireAlimi",
  "hak:senlikSuslemesi",
  "hak:yaraliDurumu",
  "hak:tanikSozu",
  "hak:ulufePayi",
  "hak:zaviye",
  "hak:yoksulCorbasi",
  "hak:sahneSirasi",
];

function kaynak(kanca: string) {
  const e = ETKILER.find((x) => kancaAnahtari(x.etki) === kanca);
  if (!e) throw new Error(`ağaçta yok: ${kanca}`);
  return e;
}

function yetiskin(k: Kasaba, no: number): Karakter {
  const kar = oyuncuEkle(k, no, k.ay - 12 * 25);
  kar.pa = 500;
  kar.tk = 60;
  kar.ta = k.ay;
  return kar;
}

function ogret(c: Karakter, ...kancalar: string[]): Karakter {
  for (const x of kancalar) {
    const e = kaynak(x);
    seviyeVer(c, e.dugum, Math.max(e.seviye, dugumSeviyesi(c, e.dugum)));
  }
  return c;
}

function dertAcElle(k: Kasaba, t: DertTuru, ay: number, es = 500): OrtakDert {
  const tl = toplulukAl(k);
  const d: OrtakDert = { i: tl.on++, t, ac: ay, bt: ay + 3, es, pu: 0, np: 0, d: "acik", k: [] };
  tl.od.push(d);
  return d;
}

test("p2 s–z kilit: bağlananlar kayıtta, boşta listesinde değil; kalan s–z kancaları boşta", () => {
  for (const a of BAGLANANLAR) {
    assert.ok(Object.hasOwn(KANCA_BAGLARI, a), a);
    assert.ok(!BOSTA_KANCALAR.includes(a), a);
  }
  const kalan = BOSTA_KANCALAR.filter((a) => /^hak:[s-z]/.test(a) && !/^hak:[a-r]/.test(a));
  assert.equal(kalan.length, 17, kalan.join(","));
});

// ── Ortak dert ──

test("ortak dert: hak katkı türünü açar ve yalnız kendi derdinde +puan (dökümde); ödül tek sefer, akçe değişmez", () => {
  for (const [hak, x] of Object.entries(DERT_HAK_EKI)) {
    const k = testKasabasi("develi", AY);
    const sade = yetiskin(k, 1);
    const sahip = ogret(yetiskin(k, 2), `hak:${hak}`);
    assert.ok(uygunKatkilar(sahip).includes(x.katki), `${hak} ${x.katki} açar`);
    // Sade karakterde katkı türünü meslekle aç (karşılaştırma için).
    const meslek = x.katki === "bakim" ? "sifaci" : x.katki === "tedarik" ? "tuccar" : "asker";
    sade.ms = { a: meslek, y: "", s: { [meslek]: { kd: 0, hz: 0, cy: 0 } } } as never;
    if (x.katki === "nobet") ogret(sade, "hizmet:nobet");
    assert.ok(uygunKatkilar(sade).includes(x.katki), `${meslek} ${x.katki}`);

    const d = dertAcElle(k, x.dert, AY);
    const pa = toplamAkce(k);
    const r0 = ortakDertKatki(k, sade, { dert: d.i, katki: x.katki }, AY);
    const r1 = ortakDertKatki(k, sahip, { dert: d.i, katki: x.katki }, AY);
    assert.ok(r0.ok && r1.ok, JSON.stringify([r0, r1]));
    if (!r0.ok || !r1.ok) return;
    const p0 = (r0.deger.yanit.katki as { puan: number }).puan;
    const p1 = (r1.deger.yanit.katki as { puan: number; dokum: { kalemler: { k: string; d: number; p?: Record<string, unknown> }[] } });
    assert.equal(p1.puan, p0 + x.puan, `${hak}: +${x.puan}`);
    assert.deepEqual(p1.dokum.kalemler.find((y) => y.k === "ortakDert.puan.hak"), { k: "ortakDert.puan.hak", d: x.puan, p: { hak } });
    assert.equal((r1.deger.yanit.odul as { gonul?: number }).gonul, ORTAK_DERT_GONUL);
    assert.equal(toplamAkce(k), pa, "akçe değişmez");
    // İkinci katkıda ödül yok (tek sefer), ek puan yine var (eşiğe katkı).
    const r2 = ortakDertKatki(k, sahip, { dert: d.i, katki: x.katki }, AY);
    assert.ok(r2.ok);
    if (r2.ok) {
      assert.deepEqual(r2.deger.yanit.odul, {});
      assert.equal((r2.deger.yanit.katki as { puan: number }).puan, p0 + x.puan);
    }

    // Başka dertte ek yok.
    const baska: DertTuru = x.dert === "salgin" ? "haydut" : "salgin";
    const d2 = dertAcElle(k, baska, AY);
    const r3 = ortakDertKatki(k, sahip, { dert: d2.i, katki: x.katki }, AY);
    assert.ok(r3.ok);
    if (r3.ok) {
      const kal = (r3.deger.yanit.katki as { dokum: { kalemler: { k: string }[] } }).dokum.kalemler;
      assert.ok(!kal.some((y) => y.k === "ortakDert.puan.hak"), `${hak}: ${baska} derdinde ek yok`);
    }
  }
});

test("zahireAlimi: kıtlıkta hazine bir kez 30 akçelik zahire alır (puan = akçe); hak yoksa, ölüyse ya da hazine yetmezse yok", () => {
  const kur = (hz: number, hak: boolean, olu = false) => {
    const k = testKasabasi("develi", AY);
    const c = yetiskin(k, 1);
    if (hak) ogret(c, "hak:zahireAlimi");
    if (olu) c.hd = { ...(c.hd ?? {}), ol: AY - 1 } as never;
    hanedanKasabasi(k).hz = hz;
    const d = dertAcElle(k, "kitlik", AY);
    return { k, d };
  };
  const { k, d } = kur(100, true);
  const pa = toplamAkce(k);
  const o1 = ortakDertDonumu(k, AY);
  assert.equal(hanedanKasabasi(k).hz, 100 - ZAHIRE_ALIM_AKCE);
  assert.equal(d.za, ZAHIRE_ALIM_AKCE);
  assert.ok(d.pu >= ZAHIRE_ALIM_AKCE);
  assert.ok(o1.some((o) => o.k === "olay.ortakDert.zahireAlimi" && o.p.akce === ZAHIRE_ALIM_AKCE));
  assert.equal(toplamAkce(k), pa - ZAHIRE_ALIM_AKCE, "akçe hazineden dünyaya çıkar, kimseye geçmez");
  ortakDertDonumu(k, AY + 1);
  assert.equal(hanedanKasabasi(k).hz, 100 - ZAHIRE_ALIM_AKCE, "dert başına bir kez");

  for (const [hz, hak, olu] of [[100, false, false], [100, true, true], [ZAHIRE_ALIM_AKCE - 1, true, false]] as const) {
    const x = kur(hz, hak, olu);
    ortakDertDonumu(x.k, AY);
    assert.equal(hanedanKasabasi(x.k).hz, hz, `hz=${hz} hak=${hak} olu=${olu}`);
    assert.equal(x.d.za, undefined);
  }
  // Salgın derdinde zahire alımı yok.
  const s = kur(100, true);
  s.d.t = "salgin";
  ortakDertDonumu(s.k, AY);
  assert.equal(hanedanKasabasi(s.k).hz, 100);
});

// ── Şenlik ──

function acikSenlikAyi(): number {
  for (let ay = AY; ay < AY + 48; ay++) if (senlikDurumu(ay)?.durum === "acik") return ay;
  throw new Error("şenlik yok");
}

test("senlikSuslemesi: nakkaş süs verince kapanış morali +2 (şenlik başına bir kez); yemek katkısı ya da haksız süs eklemez", () => {
  const ay = acikSenlikAyi();
  const s = senlikDurumu(ay)!;
  const dene = (fn: (k: Kasaba) => void) => {
    const k = testKasabasi("develi", ay);
    fn(k);
    const once = gostergeOku(k, "moral");
    const ol = senlikDonumu(k, s.bitis + 1);
    return { fark: gostergeOku(k, "moral") - once, olay: ol.find((o) => o.k === "olay.senlik.bitti") };
  };
  const sus = (c: Karakter) => {
    c.ev = { ...(c.ev ?? {}), bez: 5, ekmek: 5 };
    return c;
  };
  const sade = dene((k) => assert.ok(senlikKatki(k, sus(yetiskin(k, 1)), { katki: "sus", mal: "bez", adet: 1 }, ay).ok));
  assert.equal(sade.fark, SENLIK_MORAL);
  assert.equal(sade.olay?.p.susleme, undefined);

  let yanit: Record<string, unknown> = {};
  const nakkas = dene((k) => {
    const a = sus(ogret(yetiskin(k, 1), "hak:senlikSuslemesi"));
    const b = sus(ogret(yetiskin(k, 2), "hak:senlikSuslemesi"));
    const r = senlikKatki(k, a, { katki: "sus", mal: "bez", adet: 1 }, ay);
    assert.ok(r.ok);
    if (r.ok) yanit = r.deger.yanit;
    assert.ok(senlikKatki(k, b, { katki: "sus", mal: "bez", adet: 1 }, ay).ok);
    assert.ok(senlikKatki(k, a, { katki: "sus", mal: "bez", adet: 1 }, ay).ok);
  });
  assert.equal(nakkas.fark, SENLIK_MORAL + SENLIK_SUSLEME_MORAL, "iki nakkaş, üç süs: yine bir kez");
  assert.equal(nakkas.olay?.p.susleme, SENLIK_SUSLEME_MORAL);
  assert.equal((yanit.katki as { susleme?: number }).susleme, SENLIK_SUSLEME_MORAL);
  assert.equal((yanit.senlik as { simdiki: { susleme: boolean } }).simdiki.susleme, true);

  const yemek = dene((k) => assert.ok(senlikKatki(k, sus(ogret(yetiskin(k, 1), "hak:senlikSuslemesi")), { katki: "yemek", mal: "ekmek", adet: 1 }, ay).ok));
  assert.equal(yemek.fark, SENLIK_MORAL, "süs değil, yemek");
});

// ── Kırık sarma ──

test("yaraliDurumu: hakkı açık şifacının kırık sarması canı en az yaralı eşiğine çıkarır; haksız yalnız +etki; sağlamda fark yok", () => {
  assert.equal(YARALI_CAN_TABANI, CAN_YARALI_ESIGI);
  const sat = (hak: boolean, can: number) => {
    const k = testKasabasi("develi", AY);
    const s = ogret(yetiskin(k, 1), "hizmet:kirikSar", ...(hak ? ["hak:yaraliDurumu"] : []));
    const a = yetiskin(k, 2);
    halDegistir(a, AY, { can: can - halAl(a, AY).can }, "test");
    s.ev = { bez: 5, kereste: 5, sifaliOt: 5 };
    const ek = ekonomiAl(k);
    const h = hizmetHazirla(ek, s, "kirikSar", 1, AY);
    assert.ok(h.ok, JSON.stringify(h));
    if (!h.ok) throw new Error();
    const il = hizmetIlanAc(ek, s, `h${h.deger.stok.i}`, 1, hizmetTarifiBul("kirikSar")!.fiyatTaban, AY);
    assert.ok(il.ok);
    if (!il.ok) throw new Error();
    const pa = toplamAkce(k);
    const r = hizmetIlanIsle(ek, a, s, `hi${il.deger.i}`, 1, AY);
    assert.ok(r.ok, JSON.stringify(r));
    assert.equal(toplamAkce(k), pa, "ücret el değiştirir");
    return halAl(a, AY).can;
  };
  const haksiz = sat(false, 12);
  const hakli = sat(true, 12);
  assert.ok(haksiz < CAN_YARALI_ESIGI, `haksız ${haksiz}`);
  assert.equal(hakli, CAN_YARALI_ESIGI);
  assert.equal(sat(true, 70), sat(false, 70), "eşik üstünde yalnız etki");
});

// ── Arabuluculuk ──

test("tanikSozu: arabulucunun sözü şansa +5 kalem olarak eklenir (döküm)", () => {
  const s = senaryo();
  dostYap(s.k, s.berkay.o, s.hasan.o);
  s.berkay.pa = 50;
  const r = araciIste(baglam(s.k, s.berkay), { arabulucu: s.hasan.o, npc: s.murat.i, bedel: "ozur", miktar: 0 });
  assert.ok(r.ok, JSON.stringify(r));
  const talep = ucgenAl(s.k).at[0]!;
  const once = arabuluculukSansi(s.k, s.hasan, talep, s.k.ay).sans;
  assert.ok(!once.kalemler.some((x) => x.k === "sans.tanikSozu"));
  ogret(s.hasan, "hak:tanikSozu");
  const sonra = arabuluculukSansi(s.k, s.hasan, talep, s.k.ay).sans;
  assert.equal(sonra.toplam, once.toplam + ARACI_TANIK_SOZU);
  assert.ok(sonra.kalemler.some((x) => x.k === "sans.tanikSozu" && x.d === ARACI_TANIK_SOZU));
});

// ── Kasaba görevi ──

test("ulufePayi: yaşayan hak sahibi varsa vergi sayımına +1 koltuk (ulufe hazineden; hazine yoksa açılmaz)", () => {
  const say = (hak: boolean, hz = 1000) => {
    const k = testKasabasi("develi", AY);
    const c = yetiskin(k, 1);
    if (hak) ogret(c, "hak:ulufePayi");
    hanedanKasabasi(k).hz = hz;
    hizmetGorevDonumu(k, AY);
    return (ekonomiAl(k).hg ?? []).filter((g) => g.tur === "vergiSayimi").length;
  };
  assert.equal(say(false), KASABA_GOREV_KOLTUKLARI.vergiSayimi);
  assert.equal(say(true), KASABA_GOREV_KOLTUKLARI.vergiSayimi + 1);
  assert.equal(say(true, 0), 0, "ulufe yoksa koltuk yok");
});

// ── Barınma ──

function evsiz(k: Kasaba, no: number): Karakter {
  const kar = oyuncuEkle(k, no);
  kar.e = 0;
  kar.pa = 0;
  return kar;
}

test("zaviye: hak sahibi yaşıyorsa sosyal tesis penceresi +1 (ay dönümü izi); ölünce ya da iz eskiyince söner", () => {
  const k = testKasabasi("develi", AY);
  const ozan = ogret(yetiskin(k, 1), "hak:zaviye");
  const kar = evsiz(k, 2);
  k.ay = AY;
  barinmaDonumu(k, AY);
  assert.deepEqual(barinmaHaklari(k), { zaviye: true, corba: false });
  let an = ayBasi(AY) + 1000;
  const g = barinmaGorunumu(k, kar, an);
  assert.equal(g.tesis.zaviyeEk, ZAVIYE_TESIS_EK);
  assert.equal(g.tesis.kalanHak, TESIS_PENCERE_EN_COK + ZAVIYE_TESIS_EK);
  for (let i = 0; i < TESIS_PENCERE_EN_COK + ZAVIYE_TESIS_EK; i++) {
    const r = tesisKonakla(k, kar, an);
    assert.ok(r.ok, `${i}: ${JSON.stringify(r)}`);
    an += 30 * 24 * 60 * 60 * 1000 + 1;
  }
  assert.deepEqual(tesisKonakla(k, kar, an), { ok: false, hata: "tesis_dolu" });
  // İz başka aya aitse etki yok; hak sahibi ölünce sonraki dönüm izi siler.
  k.ay = AY + 1;
  assert.equal(barinmaHaklari(k).zaviye, false);
  ozan.hd = { ...(ozan.hd ?? {}), ol: AY } as never;
  barinmaDonumu(k, AY + 1);
  assert.equal(barinmaHaklari(k).zaviye, false);
});

test("zaviye yoksa pencere değişmez", () => {
  const k = testKasabasi("develi", AY);
  const kar = evsiz(k, 2);
  k.ay = AY;
  barinmaDonumu(k, AY);
  const g = barinmaGorunumu(k, kar, ayBasi(AY) + 1000);
  assert.equal(g.tesis.zaviyeEk, 0);
  assert.equal(g.tesis.kalanHak, TESIS_PENCERE_EN_COK);
});

test("yoksulCorbasi: can kaybı aşamasındaki evsize can düşmez, hazine kişi başı 2 öder; hazine bitince can yine düşer", () => {
  const sim = (hak: boolean, hz: number) => {
    const k = testKasabasi("develi", 0);
    const asci = oyuncuEkle(k, 1, -12 * 25);
    if (hak) ogret(asci, "hak:yoksulCorbasi");
    const kar = evsiz(k, 2);
    hanedanKasabasi(k).hz = hz;
    const pa = toplamAkce(k);
    for (let ay = 1; ay <= 20; ay++) {
      k.ay = ay;
      barinmaDonumu(k, ay);
    }
    const corba = (kar.br?.gl ?? []).filter((x) => x[1] === "yoksulCorbasi").length;
    return { can: halAl(kar, 20).can, hz: hanedanKasabasi(k).hz, corba, k, kar, pa };
  };
  const yok = sim(false, 1000);
  const var_ = sim(true, 1000);
  assert.equal(yok.corba, 0);
  assert.ok(var_.corba > 0);
  assert.ok(var_.can > yok.can, `${var_.can} > ${yok.can}`);
  // Hazine yalnız çorba kadar azalır (aşçı da ocaksızsa onun çorbası da sayılır).
  const butun = [...var_.k.kar.values()].reduce((t, c) => t + (c.br?.gl ?? []).filter((x) => x[1] === "yoksulCorbasi").length, 0);
  assert.equal(var_.hz, 1000 - butun * YOKSUL_CORBA_BEDEL);
  assert.equal(toplamAkce(var_.k), var_.pa - butun * YOKSUL_CORBA_BEDEL, "akçe hazineden dünyaya çıkar");
  const g = barinmaGorunumu(var_.k, var_.kar, ayBasi(20) + 1000);
  if (g.zincir?.asama === "canKaybi") {
    assert.equal(g.zincir.etkiler.canAylik, 0);
    assert.equal(g.zincir.etkiler.yoksulCorbasi, true);
  }
  const bos = sim(true, 0);
  assert.equal(bos.corba, 0, "hazine yoksa çorba yok");
  assert.equal(bos.can, yok.can);
});

// ── Han sahnesi ──

test("sahneSirasi: handa sahne sırası han H'ye +2; yığılma kuralıyla tavanı aşamaz", () => {
  const k = testKasabasi("develi", AY);
  const ozan = ogret(yetiskin(k, 1), "hak:sahneSirasi");
  assert.equal(kancaHesapla([ozan], "hanH").deger, 2);
  const hepsi = Object.entries(KANCA_BAGLARI).filter(([, b]) => b.kanal === "hanH").map(([a]) => a);
  const usta = ogret(yetiskin(k, 2), ...hepsi);
  const r = kancaHesapla([ozan, usta], "hanH");
  assert.equal(r.tavan, KANCA_TAVAN.hanH);
  assert.ok(r.deger <= KANCA_TAVAN.hanH);
  assert.equal(r.kisi, usta.o, "kişiler toplanmaz: en yüksek kişi");
});
