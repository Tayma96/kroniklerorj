// Eşya kademeleri ve özellikleri (tezgâh tasarımı §9, Dilim 4): yedi kademe, meslek kademesi ve emir tavanı,
// efsanevi denemesi (yalnız pir, atölyede kendi emeğiyle, ayda sınırlı; NPC emeği ve toplu üretim üretemez), hüner,
// yadigâr (el değiştirme ve varis), denge (farm yok, akçe değişmezi, dükkân ve edilgen atölye tavanı), geriye uyum.
import test from "node:test";
import assert from "node:assert/strict";
import { MALLAR, MAL_IDLERI, type MalId } from "../src/icerik/mallar.ts";
import { TARIFLER } from "../src/icerik/tarifler.ts";
import { seviyeVer } from "../src/yerlesim/beceri.ts";
import {
  KALITE_ADLARI,
  KALITE_DEGER_CARPANI,
  KALITE_EMIR_TAVANI,
  KALITE_ESIK,
  KALITE_KADEME_TAVANI,
  KALITE_PARTI_EN_COK,
  ALET_KALITE_OMUR,
  ALET_KALITE_PUANI,
  ALET_KALITE_VERIM,
  damgaliAdet,
  kaliteAdedi,
  kaliteGorunumu,
  kaliteliCikar,
  kaliteliEkle,
  kaliteMi,
  partiParca,
  urunKalitesi,
  type EsyaKaydi,
  type Kalite,
  type KaliteParti,
} from "../src/yerlesim/kalite.ts";
import {
  AILELER,
  EFSANEVI_DENEME_AY,
  EFSANEVI_SANS_TABAN,
  EFSANEVI_SANS_TAVAN,
  EFSANEVI_SANS_PUAN,
  TILSIM_SANS_BINDE,
  ALET_BEREKET_VERIM,
  efsaneviSansDokumu,
  ETKI_CARPANI,
  YADIGAR_GECMIS_EN_COK,
  efsaneviDene,
  efsaneviHakki,
  efsaneviSansi,
  efsaneviZari,
  elDegistir,
  esyaAilesi,
  esyaYap,
  gecmisEkle,
  mirasPartileri,
  nadideHuneri,
  ozellikDokumu,
  sansBandi,
} from "../src/yerlesim/esya.ts";
import { efsaneviKaydet, esyaSayaci } from "../src/yerlesim/esya-kayit.ts";
import { ilerleme, meslekSec } from "../src/yerlesim/meslek.ts";
import { ALET_OMRU, aletOmru, aracAsindir, ciktiAdedi, tarifYap } from "../src/yerlesim/tarif.ts";
import { omurArtisi } from "../src/yerlesim/beceri-etki.ts";
import { tohumlu } from "../src/yerlesim/rastgele.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { bosTezgah, depoGorunumu, tasimaCoz, type Tezgah } from "../src/mulk/depo.ts";
import { emirAc, emirleriIsle } from "../src/mulk/uretim-emri.ts";
import { adil, npcTavani, talepCoz } from "../src/mulk/hane-butcesi.ts";
import { rafaKoy, rafSatilabilir, raftanSat, satirGorunumu } from "../src/mulk/raf.ts";
import { depodanDus } from "../src/mulk/atolye.ts";
import { depoyaKoy, tezgahBosalt } from "../src/mulk/depo.ts";
import { npcyeSat } from "../src/yerlesim/pazar.ts";
import { envanterEkle } from "../src/yerlesim/npc-taban.ts";
import { esyaKilidi } from "../src/yerlesim/kalite.ts";
import { ilanAc, ilanGorunumu } from "../src/yerlesim/pazar-tahta.ts";
import { DUKKAN_NPC_TAVAN, HANE_BUTCESI, KITLIK_BUTCE_CARPANI, NPC_ATOLYE_MAAS_EN_AZ, NPC_EMEK_AY, Q_CARPANI, ZANAAT_MESLEKLERI } from "../src/mulk/tezgah-kurallar.ts";
import { PERSONEL_EN_COK } from "../src/mulk/kurallar.ts";
import { devirHesapla, devirUygula } from "../src/yerlesim/devir.ts";
import { oyuncuOlumu } from "../src/yerlesim/yaslilik.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";
import { cocukEkle, npcIleEvlendir, toplamAkce } from "./hanedan-yardimci.ts";

const AY = 30;
const ATOLYE = "develi.atolye.1";
const hep = (x: number) => () => x;
/** Sırayla verilen zar değerleri (sonra son değer tekrar). */
const dizi = (...xs: number[]) => {
  let i = 0;
  return () => xs[Math.min(i++, xs.length - 1)]!;
};

function demirci(k: Kasaba, no: number, kd: 0 | 1 | 2 | 3): Karakter {
  const c = oyuncuEkle(k, no, k.ay - 30 * 12);
  c.e = 7000 + no;
  c.tk = 18;
  c.ta = k.ay;
  c.pa = 200;
  meslekSec(c, "demirci", k.ay);
  seviyeVer(c, "demirci.temelDovme", 1);
  seviyeVer(c, "demirci.aletcilik", 3);
  seviyeVer(c, "demirci.silahDovme", 3);
  ilerleme(c, "demirci").kd = kd;
  c.be[3] = 100;
  return c;
}

/** Atölyede yapılmış gibi: büyük ek kalem (puanı nadide eşiğinin üstüne taşır) ve damga. */
const atolyeEki = (d: number, efsanevi?: { zar?: () => number }) => ({
  kalemler: [{ k: "kalite.atolye", d }],
  damga: ATOLYE,
  ...(efsanevi ? { efsanevi: { atolyeAd: "Demirhane", ...(efsanevi.zar ? { zar: efsanevi.zar } : {}) } } : {}),
});

const girdiVer = (c: Karakter, kez = 1) => {
  c.ev = { ...(c.ev ?? {}), cevher: (c.ev?.cevher ?? 0) + 2 * kez, komur: (c.ev?.komur ?? 0) + 2 * kez, deri: (c.ev?.deri ?? 0) + kez };
};

// ── Kademeler ve tavanlar ──

test("parametreler: yedi kademe, çarpanlar artan ve tavanlı; dizi uzunlukları kademe sayısına eşit", () => {
  assert.deepEqual([...KALITE_ADLARI], ["sade", "iyi", "ustun", "saheser", "nadide", "efsanevi", "tilsimli"]);
  for (const d of [ETKI_CARPANI, KALITE_DEGER_CARPANI, Q_CARPANI, ALET_KALITE_PUANI, ALET_KALITE_VERIM, ALET_KALITE_OMUR]) {
    assert.equal(d.length, 7);
    for (let i = 1; i < d.length; i++) assert.ok(d[i]! >= d[i - 1]!, `artan: ${d}`);
  }
  assert.deepEqual([...ETKI_CARPANI], [1, 1.5, 2, 3, 4, 5, 7], "§9.1 önerisi");
  assert.ok(Math.max(...ETKI_CARPANI) <= 7 && Math.max(...KALITE_DEGER_CARPANI) <= 7, "tavanlı");
  assert.deepEqual([...KALITE_KADEME_TAVANI], [1, 2, 4, 4], "çırak iyi, kalfa üstün, usta/pir nadide (efsanevi puanla çıkmaz)");
  assert.equal(KALITE_EMIR_TAVANI, 3);
  for (let q = 0; q <= 6; q++) assert.ok(kaliteMi(q));
  for (const v of [-1, 7, 1.5, "1", null]) assert.ok(!kaliteMi(v));
});

test("meslek kademesi tavanı: her puan ve zarda çırak ≤ iyi, kalfa ≤ üstün, usta/pir ≤ nadide; efsanevi puanla hiç çıkmaz", () => {
  const k = testKasabasi("develi", AY);
  for (const kd of [0, 1, 2, 3] as const) {
    const c = demirci(k, 10 + kd, kd);
    let enYuksek = 0;
    for (const ek of [0, 50, 100, 400]) {
      for (let z = 0; z < 1; z += 0.05) {
        const s = urunKalitesi(c, TARIFLER.kilic, 60, 3, hep(z), [{ k: "kalite.atolye", d: ek }]);
        enYuksek = Math.max(enYuksek, s.kademe);
        if (s.kademe === KALITE_KADEME_TAVANI[kd]) assert.equal(s.sonrakiEsik, null, "tavanda sonraki eşik yok");
        if (s.kisit) assert.ok(s.kisit === "kalite.tavan.meslek" || (kd === 2 && s.kisit === "kalite.tavan.ustaNadide"), s.kisit);
      }
    }
    assert.equal(enYuksek, KALITE_KADEME_TAVANI[kd], `kd ${kd}`);
  }
});

test("kademe dağılımı: tam donanımlı usta nadideye ender ulaşır, pir atölyede daha sık; dağılım deterministik", () => {
  const k = testKasabasi("develi", AY);
  const say = (kd: 2 | 3, atolyeBonus: number) => {
    const c = demirci(k, 20 + kd, kd);
    const n = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 1000; i++) n[urunKalitesi(c, TARIFLER.kilic, 20, 3, tohumlu("dagilim", kd, i), [{ k: "kalite.atolye", d: atolyeBonus }]).kademe]!++;
    return n;
  };
  // Usta: 20 kademe + 20 zanaat + 20 beceri + 20 şaheser alet + zar 0–19 → en çok 99 < 125: elde nadide yok.
  const usta = say(2, 0);
  assert.equal(usta[4], 0, `usta elde: ${usta}`);
  // Usta en üst atölyede (+20) ve kanca tavanıyla (+10): puan nadideye yetse de ender (KALITE_USTA_NADIDE_YUZDE).
  const ustaAtolye = say(2, 20 + 10);
  assert.ok(ustaAtolye[4]! > 0 && ustaAtolye[4]! <= 150, `usta atölye: ${ustaAtolye}`);
  // Pir aynı atölyede: nadide sık ama hiçbir zaman efsanevi değil.
  const pir = say(3, 20 + 10);
  assert.ok(pir[4]! > ustaAtolye[4]!, `pir ${pir} > usta ${ustaAtolye}`);
  assert.equal(pir[5]! + pir[6]!, 0);
  assert.deepEqual(say(3, 30), pir, "aynı tohumla aynı dağılım");
  console.log(`  dağılım (1000 kılıç): usta elde ${usta}, usta atölye+kanca ${ustaAtolye}, pir atölye ${pir}`);
});

test("NPC emeği ve emirle (toplu) üretim şaheseri aşamaz: pir usta, en büyük kanca, her zanaat tarifi", () => {
  const k = testKasabasi("develi", AY);
  let n = 0;
  for (const tr of Object.values(TARIFLER)) {
    if (!(ZANAAT_MESLEKLERI as readonly string[]).includes(tr.meslek)) continue;
    const u = oyuncuEkle(k, 100 + n++, k.ay - 30 * 12);
    meslekSec(u, tr.meslek, AY);
    ilerleme(u, tr.meslek as never).kd = 3;
    u.be[3] = 100;
    // Yalnız kalite tavanı sınanır (tarif kilidi emirAc'ta denetlenir).
    const s = urunKalitesi(u, tr, 60, 3, hep(0.99), [{ k: "kalite.atolye", d: 500 }], true);
    assert.ok(s.kademe <= 3, `${tr.id}: ${s.kademe}`);
    assert.equal(s.kisit, "kalite.tavan.emir");
  }
  // Uygulamalı: pir demirci, yalnız oyuncu emeğiyle değil NPC emeğiyle de emir → depoda şaheserden yükseği yok.
  const u = demirci(k, 300, 3);
  const t: Tezgah = bosTezgah();
  t.za = "demirci";
  kaliteliEkle(t, "cevher", [[0, 20]]);
  kaliteliEkle(t, "komur", [[0, 20]]);
  kaliteliEkle(t, "deri", [[0, 10]]);
  t.eh = 18;
  assert.ok(emirAc(t, 4, "kilic", 6, [u], u.o, AY).ok);
  const r = emirleriIsle({ t, isletme: ATOLYE, seviye: 4, kapasite: 240, npcEmek: NPC_EMEK_AY * 4, adaylar: [u], ay: AY, kanca: { kalite: 200, npcCeza: 30 } });
  assert.ok(r.yapim >= 1);
  assert.ok((t.kq?.kilic ?? []).every((p) => p[0] <= 3 && !p[4]), JSON.stringify(t.kq?.kilic));
  assert.equal(u.ef, undefined, "emir efsanevi hakkına dokunmaz");
});

// ── Efsanevi denemesi ──

test("efsanevi: yalnız pir ister; koşul tutmazsa hiçbir şey değişmez (girdi, takat, hak)", () => {
  const k = testKasabasi("develi", AY);
  const usta = demirci(k, 1, 2);
  girdiVer(usta);
  const ev = structuredClone(usta.ev);
  const tk = usta.tk;
  assert.deepEqual(tarifYap(usta, "kilic", AY, hep(0.99), atolyeEki(200, {})), { ok: false, hata: "efsanevi_pir_degil" });
  assert.deepEqual(usta.ev, ev);
  assert.equal(usta.tk, tk);
  assert.equal(usta.ef, undefined);
  // Atölye dışında (AtolyeEki yok) efsanevi istenemez: elde üretim nadideyi aşmaz.
  const pir = demirci(k, 2, 3);
  girdiVer(pir);
  const r = tarifYap(pir, "kilic", AY, hep(0.99));
  assert.ok(r.ok);
  assert.equal(r.deger.efsanevi, null);
  assert.ok(r.deger.kalite.kademe <= 4);
});

test("efsanevi: ürün nadide değilse denenmez (hak kalır); nadideyse hak harcanır, ayda bir, sonraki ay döner", () => {
  const k = testKasabasi("develi", AY);
  const pir = demirci(k, 3, 3);
  girdiVer(pir, 4);
  // Düşük puan: nadide değil → denenmez.
  let r = tarifYap(pir, "kilic", AY, hep(0), atolyeEki(0, { zar: hep(0) }));
  assert.ok(r.ok);
  assert.deepEqual([r.deger.efsanevi?.denendi, r.deger.efsanevi?.neden, r.deger.efsanevi?.kalanHak], [false, "nadide_degil", 1]);
  assert.equal(efsaneviHakki(pir, AY), EFSANEVI_DENEME_AY);
  // Nadide ama zar tutmadı (0,99 ≥ şans): hak harcandı, ürün nadide kaldı.
  r = tarifYap(pir, "kilic", AY, hep(0.99), atolyeEki(100, { zar: hep(0.99) }));
  assert.ok(r.ok);
  assert.equal(r.deger.kalite.kademe, 4);
  assert.deepEqual([r.deger.efsanevi?.denendi, r.deger.efsanevi?.kademe, r.deger.efsanevi?.kalanHak], [true, null, 0]);
  assert.ok(["zayif", "makul", "guclu"].includes(r.deger.efsanevi!.sans));
  // Aynı ay ikinci deneme: girdi ve takat harcanmadan reddedilir (bedava ya da ücretli yeniden zar yok).
  const ev = structuredClone(pir.ev);
  const tk = pir.tk;
  assert.deepEqual(tarifYap(pir, "kilic", AY, hep(0.99), atolyeEki(100, { zar: hep(0) })), { ok: false, hata: "efsanevi_hak_yok" });
  assert.deepEqual([pir.ev, pir.tk], [ev, tk]);
  // Denemesiz üretim aynı ay sürer (yalnız nadide).
  assert.ok(tarifYap(pir, "kilic", AY, hep(0.99), atolyeEki(100)).ok);
  // Sonraki ay hak döner.
  assert.equal(efsaneviHakki(pir, AY + 1), 1);
});

test("efsanevi: başarılı denemede bir adet adlı eşya (damga, usta, hüner, yapım satırı); kalan adet nadide", () => {
  const k = testKasabasi("develi", AY);
  const pir = demirci(k, 4, 3);
  pir.ev = { cevher: 2, komur: 2 };
  // nal 2 adet çıkar; zar: şans tuttu (0), tılsım tutmadı (0,5), hüner/lakap 0.
  const r = tarifYap(pir, "nal", AY, hep(0.99), atolyeEki(100, { zar: dizi(0, 0.5, 0, 0) }));
  assert.ok(r.ok, JSON.stringify(r));
  const ef = r.deger.efsanevi!;
  assert.equal(ef.kademe, 5);
  assert.ok(ef.esya);
  const liste = pir.kq!.nal!;
  const esyali = liste.filter((p) => p[4]);
  assert.equal(esyali.length, 1);
  assert.deepEqual(esyali[0]!.slice(0, 4), [5, 1, pir.o, ATOLYE]);
  assert.equal(kaliteAdedi(pir, "nal", 4), r.deger.cikti.adet - 1, "kalan nadide");
  const e = esyali[0]![4]!;
  assert.equal(e.u, pir.ad);
  assert.equal(e.a, "Demirhane");
  assert.deepEqual(e.h, [AILELER.arac.hunerler[0]]);
  assert.deepEqual(e.g, [[AY, "yapim", pir.ad]]);
  assert.equal(r.deger.ozellik.kademe, 5);
  assert.deepEqual(r.deger.ozellik.hunerler, e.h);
});

test("tılsımlı: başarılı efsanevinin ayrıca binde biri; iki ayrı hüner; olasılıklar tavanlı ve kaba bantla", () => {
  const k = testKasabasi("develi", AY);
  const pir = demirci(k, 5, 3);
  girdiVer(pir);
  const r = tarifYap(pir, "kilic", AY, hep(0.99), atolyeEki(100, { zar: dizi(0, 0, 0.1, 0.9, 0.3) }));
  assert.ok(r.ok);
  assert.equal(r.deger.efsanevi?.kademe, 6);
  const e = r.deger.efsanevi!.esya!;
  assert.equal(e.h.length, 2);
  assert.notEqual(e.h[0], e.h[1]);
  assert.equal(efsaneviSansi(KALITE_ESIK[4]! - 1), 0);
  assert.equal(efsaneviSansi(KALITE_ESIK[4]!), EFSANEVI_SANS_TABAN);
  assert.equal(efsaneviSansi(10_000), EFSANEVI_SANS_TAVAN);
  assert.deepEqual([0, 10, 13, 17].map(sansBandi), ["yok", "zayif", "makul", "guclu"]);
  // Beklenen sıklık: en iyi şansla deneme başına efsanevi %20, tılsımlı bunun binde 15'i.
  let efs = 0;
  let tls = 0;
  for (let i = 0; i < 20_000; i++) {
    const c = { o: `o${i}`, h: `h${i}`, ad: "x" } as Karakter;
    const s = efsaneviDene(c, "kilic", 4, 10_000, AY, "A");
    if (s.kademe === 5) efs++;
    if (s.kademe === 6) tls++;
  }
  assert.ok(efs > 3500 && efs < 4500, `efsanevi ${efs}/20000`);
  assert.ok(tls >= 25 && tls <= 110, `tılsımlı ${tls}/20000`);
  console.log(`  20000 tam şanslı deneme: efsanevi ${efs}, tılsımlı ${tls}`);
});

test("denge §9.2: 1000 pir ayda bir (en iyi şansla) — ayda birkaç tılsımlı, efsanevi pirlerin ≤ %20'si (sim kilidi)", () => {
  assert.deepEqual([EFSANEVI_SANS_TABAN, EFSANEVI_SANS_PUAN, EFSANEVI_SANS_TAVAN, TILSIM_SANS_BINDE], [10, 0.5, 20, 15]);
  const aylar = 12;
  let efs = 0;
  let tls = 0;
  for (let ay = 0; ay < aylar; ay++) {
    for (let i = 0; i < 1000; i++) {
      const c = { o: `o${i}`, h: `h${i}`, ad: "x" } as Karakter;
      const s = efsaneviDene(c, "kilic", 4, 10_000, AY + ay, "A");
      if (s.kademe === 5) efs++;
      if (s.kademe === 6) tls++;
    }
  }
  const tAy = tls / aylar;
  const eAy = (efs + tls) / aylar;
  console.log(`  1000 pir × ${aylar} ay: aylık efsanevi ${eAy.toFixed(1)}, tılsımlı ${tAy.toFixed(2)}`);
  assert.ok(tAy >= 1 && tAy <= 6, `ayda birkaç tılsımlı: ${tAy}`);
  assert.ok(eAy <= 220, `efsanevi tavanı: ${eAy}`);
  // Döküm sayıları gerçek şansla birebir (gizli sayı yok).
  const d = efsaneviSansDokumu(KALITE_ESIK[4]! + 7);
  assert.equal(d.yuzde, efsaneviSansi(KALITE_ESIK[4]! + 7));
  assert.deepEqual(d.kalemler, [{ k: "efsanevi.taban", d: 10 }, { k: "efsanevi.puan", d: 3 }]);
  assert.equal(d.tilsimBinde, TILSIM_SANS_BINDE);
  const t = efsaneviSansDokumu(10_000);
  assert.equal(t.yuzde, EFSANEVI_SANS_TAVAN);
  assert.ok(t.kalemler.some((x) => x.k === "efsanevi.tavan" && x.d < 0));
});

test("tekrar güvenliği: efsanevi zarı oyuncu + ay tohumlu (tarif ya da sayaçla değişmez); aynı girdi aynı eşya", () => {
  const a = { o: "o1", h: "h1", ad: "Ayşe" } as Karakter;
  assert.equal(efsaneviZari(a, AY)(), efsaneviZari(a, AY)());
  assert.notEqual(efsaneviZari(a, AY)(), efsaneviZari(a, AY + 1)());
  const e1 = esyaYap(a, "kilic", 5, AY, "A", tohumlu("x"));
  const e2 = esyaYap(a, "kilic", 5, AY, "A", tohumlu("x"));
  assert.deepEqual(e1, e2);
  assert.ok(!e1.i.includes("h1"), "hesap kimliği eşya kimliğine yazılmaz");
});

test("efsanevi kaydı: kroniğe ve herkese açık olaya düşer, yönetici sayacı artar; akçe ya da beceri vermez", () => {
  const k = testKasabasi("develi", AY);
  const pir = demirci(k, 6, 3);
  const pa = pir.pa;
  const e = esyaYap(pir, "kilic", 5, AY, "Demirhane", hep(0));
  const o = efsaneviKaydet(k, pir, "kilic", 5, e, [ATOLYE, "Demirhane"]);
  efsaneviKaydet(k, pir, "kilic", 6, { ...e, i: "e2" }, [ATOLYE, "Demirhane"]);
  assert.equal(o.g, "");
  assert.equal(o.k, "olay.esya.efsanevi");
  assert.deepEqual(esyaSayaci(k), { efsanevi: 1, tilsimli: 1 });
  assert.deepEqual(k.kq?.map((x) => x.k), ["kronik.esya.efsanevi", "kronik.esya.tilsimli"]);
  assert.equal(pir.pa, pa);
});

// ── Hüner ve özellik ──

test("özellik dökümü: aile, üst kademe ek etki, sadede kusur (ceza değil), nadide hüneri; bağlanmamış etki bagli:false, çarpan yok", () => {
  assert.equal(esyaAilesi("kilic"), "silah");
  assert.equal(esyaAilesi("ekmek"), "yiyecek");
  assert.equal(esyaAilesi("odun"), "mal");
  const sade = ozellikDokumu("ekmek", 0);
  assert.equal(sade.kusur, "bayat");
  assert.deepEqual(sade.etkiler, [{ id: "tokluk", bagli: false }]);
  assert.deepEqual(sade.hunerler, []);
  assert.equal(sade.bagli, false);
  const saheser = ozellikDokumu("ekmek", 3);
  assert.deepEqual(saheser.etkiler.map((x) => x.id), ["tokluk", "keyif"]);
  assert.equal(saheser.kusur, null);
  const nadide = ozellikDokumu("ekmek", 4);
  assert.deepEqual(nadide.etkiler.map((x) => x.id), ["tokluk", "keyif", "saglik"]);
  assert.deepEqual(nadide.hunerler, [nadideHuneri("ekmek")]);
  assert.deepEqual(nadide.hunerDokumu, [{ id: nadideHuneri("ekmek"), bagli: false }]);
  assert.ok(!("carpan" in nadide), "okunmayan çarpan dökümde yazılmaz");
  for (const m of MAL_IDLERI) {
    const a = AILELER[esyaAilesi(m)];
    assert.equal(new Set(a.hunerler).size, a.hunerler.length, `${m}: hüner eşsiz`);
  }
  // Alet: verim ve ömür bağlı ve gerçek değerle; incelik bağlı değil.
  const usta = ozellikDokumu("alet", 4);
  assert.deepEqual(usta.etkiler, [
    { id: "verim", bagli: true, deger: ALET_KALITE_VERIM[4], birim: "adet" },
    { id: "omur", bagli: true, yipranmaz: true },
    { id: "incelik", bagli: false },
  ]);
  assert.deepEqual(usta.hunerDokumu, [{ id: "yipranmaz", bagli: true }]);
  assert.deepEqual(ozellikDokumu("alet", 2).etkiler.find((e) => e.id === "omur"), { id: "omur", bagli: true, deger: ALET_KALITE_OMUR[2], birim: "kullanim" });
});

test("gösterilen = gerçek: alet dökümünde bagli:true her etki oyun mantığında birebir işler (verim, ömür, yıpranmaz)", () => {
  const k = testKasabasi("develi", AY);
  const aletler: [Kalite, EsyaKaydi | undefined][] = [[0, undefined], [1, undefined], [2, undefined], [3, undefined], [4, undefined]];
  const ref = demirci(k, 40, 3);
  aletler.push([5, esyaYap(ref, "alet", 5, AY, "A", hep(0))], [6, esyaYap(ref, "alet", 6, AY, "A", hep(0))]);
  let no = 41;
  for (const [q, e] of aletler) {
    const c = demirci(k, no++, 3);
    const d = ozellikDokumu("alet", q, e);
    for (const h of d.hunerDokumu) assert.ok(!h.bagli || ["yipranmaz", "bereketli"].includes(h.id), `${q}: bağlı hüner tanımlı`);
    if (e) assert.ok(e.h.every((h) => d.hunerDokumu.find((x) => x.id === h)?.bagli), `${q}: adlı alete yalnız bağlı hüner`);
    // Araçsız ve bu aletle çıktı farkı = dökümdeki verim (tarif aracı: alet).
    const tarif = Object.values(TARIFLER).find((t) => "arac" in t && (t as { arac?: { mal: string } }).arac?.mal === "alet")!;
    const once = ciktiAdedi(c, tarif as never, true);
    kaliteliEkle(c, "alet", [e ? [q, 1, c.o, ATOLYE, e] : [q, 1, c.o]]);
    const verim = d.etkiler.find((x) => x.id === "verim")!;
    assert.equal(ciktiAdedi(c, tarif as never, true) - once, verim.bagli ? (verim as { deger: number }).deger : 0, `${q}: verim`);
    const omur = d.etkiler.find((x) => x.id === "omur");
    if (omur && "yipranmaz" in omur) {
      for (let i = 0; i < 40; i++) assert.equal(aracAsindir(c, "alet").asindi, false, `${q}: yıpranmaz`);
      assert.equal(c.ev?.alet, 1);
    } else {
      const beklenen = ALET_OMRU + omurArtisi(c, "alet") + (omur ? (omur as { deger: number }).deger : 0);
      assert.equal(aletOmru(c, "alet"), beklenen, `${q}: ömür`);
      let n = 0;
      while ((c.ev?.alet ?? 0) > 0 && n < 100) {
        aracAsindir(c, "alet");
        n++;
      }
      assert.equal(n, beklenen, `${q}: ömründe tükenir`);
    }
  }
  assert.equal(ALET_BEREKET_VERIM, 1);
});

test("efsanevi alet yıpranmaz (kırılıp yok olmaz); sıradan alet ömründe tükenir", () => {
  const k = testKasabasi("develi", AY);
  const c = demirci(k, 7, 3);
  const e = esyaYap(c, "alet", 5, AY, "A", hep(0));
  kaliteliEkle(c, "alet", [[5, 1, c.o, ATOLYE, e]]);
  for (let i = 0; i < 50; i++) assert.equal(aracAsindir(c, "alet").asindi, false);
  assert.equal(kaliteAdedi(c, "alet", 5), 1);
  const d = demirci(k, 8, 1);
  kaliteliEkle(d, "alet", [[1, 1, d.o]]);
  let tukendi = false;
  for (let i = 0; i < 50 && !tukendi; i++) tukendi = aracAsindir(d, "alet").asindi;
  assert.ok(tukendi);
});

// ── Yadigâr ──

const esya = (i: string, g: EsyaKaydi["g"] = [[1, "yapim", "Usta"]]): EsyaKaydi => ({ i, l: 0, u: "Usta", a: "A", h: ["keskinAgiz"], y: 1, g });

test("adlı eşya partisi: birleşmez, kopyalanmaz, parti sınırında düşmez, JSON'dan sağ çıkar", () => {
  const t: Tezgah = bosTezgah();
  kaliteliEkle(t, "kilic", [[5, 1, "o1", ATOLYE, esya("e1")]]);
  kaliteliEkle(t, "kilic", [[5, 1, "o1", ATOLYE, esya("e2")]]);
  kaliteliEkle(t, "kilic", [[4, 2, "o1", ATOLYE]]);
  assert.equal(t.kq!.kilic!.filter((p) => p[4]).length, 2, "aynı usta/damga/kademe olsa da birleşmez");
  // Parti sınırı: çok sayıda sıradan parti eşyayı izsiz sadeye düşürmez.
  for (let i = 0; i < KALITE_PARTI_EN_COK + 4; i++) kaliteliEkle(t, "kilic", [[1, 1, `x${i}`]]);
  assert.deepEqual(t.kq!.kilic!.filter((p) => p[4]).map((p) => p[4]!.i).sort(), ["e1", "e2"]);
  assert.deepEqual(partiParca(t.kq!.kilic![0]!, 1)[4], t.kq!.kilic![0]![4]);
  const geri = JSON.parse(JSON.stringify(t)) as Tezgah;
  assert.deepEqual(geri.kq!.kilic!.filter((p) => p[4]).map((p) => p[4]!.i).sort(), ["e1", "e2"]);
  assert.equal(kaliteliCikar(geri, "kilic", 1, 5), null, "adlı eşya kimliksiz çıkmaz");
  const c = kaliteliCikar(geri, "kilic", 1, 5, "e1")!;
  assert.equal(c.length, 1);
  assert.equal(c[0]![4]!.i, "e1");
  assert.ok(c[0]![4]);
  assert.equal(kaliteAdedi(geri, "kilic", 5), 1, "yalnız biri çıktı");
  // Toplu siparişe damgalı sayılmaz (eşya toplu teslimle NPC'ye gitmez).
  assert.equal(damgaliAdet(t, "kilic", ATOLYE), 2);
});

test("yadigâr geçmişi: el değiştikçe yazılır, sınırlı; ilk satır (yapım) hep kalır; eşyasız parti olduğu gibi", () => {
  let g: EsyaKaydi["g"] = [[1, "yapim", "Usta"]];
  for (let i = 0; i < 20; i++) g = gecmisEkle(g, [2 + i, "satis", `K${i}`]);
  assert.equal(g.length, YADIGAR_GECMIS_EN_COK);
  assert.deepEqual(g[0], [1, "yapim", "Usta"]);
  assert.deepEqual(g.at(-1), [21, "satis", "K19"]);
  const p: KaliteParti[] = [[5, 1, "o1", ATOLYE, esya("e1")], [2, 3, "o1"]];
  const s = elDegistir(p, 9, "satis", "Ali");
  assert.deepEqual(s[0]![4]!.g.at(-1), [9, "satis", "Ali"]);
  assert.equal(p[0]![4]!.g.length, 1, "kaynak değişmez");
  assert.equal(s[1], p[1]);
});

test("varis: miras izli partileri (sandık dahil) taşır, adlı eşya 'miras' satırıyla yadigâr olur; mal ve akçe korunur", () => {
  const k = testKasabasi("develi", 0);
  const kar = oyuncuEkle(k, 1, k.ay - 70 * 12);
  npcIleEvlendir(k, kar);
  cocukEkle(k, kar, 30, 0);
  kar.pa = 50;
  kar.ev = { kilic: 3, odun: 2 };
  kar.kq = { kilic: [[5, 1, "o9", ATOLYE, esya("e7")], [2, 1, "o9"]] };
  kar.br = { sd: { ev: { kilic: 1 }, kq: { kilic: [[4, 1, "o9", ATOLYE]] } } } as never;
  oyuncuOlumu(k, kar, k.ay);
  const plan = devirHesapla(k, "o1", undefined, k.ay);
  assert.ok(plan.ok, JSON.stringify(plan));
  const once = toplamAkce(k);
  const r = devirUygula(k, plan.deger, k.ay);
  assert.ok(r.ok);
  const v = r.deger.kar;
  assert.equal(toplamAkce(k), once);
  assert.deepEqual(v.ev, { kilic: 4, odun: 2 });
  assert.equal(kaliteAdedi(v, "kilic", 5), 1);
  assert.equal(kaliteAdedi(v, "kilic", 4), 1, "sandıktaki nadide de geçti");
  assert.equal(kaliteAdedi(v, "kilic", 2), 1);
  assert.equal(kaliteAdedi(v, "kilic", 0), 1);
  const e = v.kq!.kilic!.find((p) => p[4])![4]!;
  assert.deepEqual(e.g.at(-1), [k.ay, "miras", v.ad]);
  assert.equal(kar.kq, undefined, "ölüde kalmaz");
  // Saf yardımcı: partiler adedi aşamaz.
  const kq = mirasPartileri([{ kilic: [[3, 5]] }], { kilic: 2 }, 1, "V")!;
  assert.equal(kq.kilic!.reduce((a, p) => a + p[1], 0), 2);
});

// ── Denge ──

test("denge: dükkân NPC hasılatı her kademede seviye tavanını ve meslek bütçesini aşmaz (kademe fiyat çarpanlarıyla)", () => {
  const MALLAR_SIM: MalId[] = ["kilic", "ekmek", "kumas", "dograma", "bicak"];
  let enCok = 0;
  for (const seviye of [0, 2, 4]) {
    for (let q = 0; q <= 6; q++) {
      for (const c of [1, 1.5]) {
        const satirlar = MALLAR_SIM.map((mal, r) => ({ id: `d#${r}`, dukkan: "d", mal, q: q as Kalite, adet: 24, fiyat: Math.floor(npcTavani(mal, q as Kalite) / (c === 1 ? 1.5 : 1)) }));
        const s = talepCoz("sehir", satirlar, new Map([["d", { id: "d", itibar: 100, tavan: DUKKAN_NPC_TAVAN[seviye]! }]]), () => 0, "butce");
        assert.ok(s.harcanan <= DUKKAN_NPC_TAVAN[seviye]!, `seviye ${seviye} q ${q}: ${s.harcanan}`);
        assert.ok(s.harcanan <= s.butce);
        enCok = Math.max(enCok, s.harcanan);
      }
    }
  }
  console.log(`  dükkân en yüksek aylık NPC hasılatı (7 kademe): ${enCok} (tavan ${DUKKAN_NPC_TAVAN[4]})`);
});

test("denge: edilgen atölye emirle şaheseri aşamadığından aylık net ≤ 35 kalır; kademe çarpanı bunu bozmaz", () => {
  // tezgah-sim'in edilgen üst sınırı, emir tavanındaki en iyi kademe (KALITE_EMIR_TAVANI) ile.
  let net = -Infinity;
  for (const t of Object.values(TARIFLER)) {
    if (!(ZANAAT_MESLEKLERI as readonly string[]).includes(t.meslek)) continue;
    const mal = t.cikti[0] as MalId;
    if (!(MALLAR[mal].taban > 0)) continue;
    const girdi = Object.entries(t.girdi).reduce((a, [m, n]) => a + MALLAR[m as MalId].taban * (n ?? 0), 0);
    for (let n = 1; n <= PERSONEL_EN_COK; n++) {
      for (let yap = 1; yap <= Math.floor((NPC_EMEK_AY * n) / t.takat); yap++) {
        const r = talepCoz("sehir", [{ id: "d#0", dukkan: "d", mal, q: KALITE_EMIR_TAVANI, adet: yap * t.cikti[1], fiyat: npcTavani(mal, KALITE_EMIR_TAVANI) }], new Map([["d", { id: "d", itibar: 100, tavan: DUKKAN_NPC_TAVAN[4]! }]]), () => 0, "butce");
        net = Math.max(net, r.harcanan - yap * girdi - n * NPC_ATOLYE_MAAS_EN_AZ);
      }
    }
  }
  assert.ok(net <= 35, `edilgen net ${net}`);
  assert.ok(Math.floor(HANE_BUTCESI.sehir * KITLIK_BUTCE_CARPANI) >= 0);
});

test("denge: NPC'den alınan sade mal rafa nadide/efsanevi/tılsımlı konamaz; parayla kademe yolu yok", () => {
  for (const m of ["kilic", "ekmek", "alet"] as MalId[]) {
    for (const q of [4, 5, 6] as const) {
      const t: Tezgah = bosTezgah();
      kaliteliEkle(t, m, [[0, 5]]);
      assert.deepEqual(rafaKoy(t, m, q, 1, Math.max(1, Math.floor(npcTavani(m, q))), 4), { ok: false, hata: "mal_yok" });
    }
    assert.ok(adil(m, 6) > adil(m, 3));
  }
});

test("denge: efsanevi üretimi akçe doğurmaz; deneme her seferinde gerçek girdi ve takat ister (farm yok)", () => {
  const k = testKasabasi("develi", AY);
  const pir = demirci(k, 9, 3);
  girdiVer(pir, 2);
  const pa = pir.pa;
  const once = { cevher: pir.ev!.cevher!, tk: pir.tk };
  const r = tarifYap(pir, "kilic", AY, hep(0.99), atolyeEki(100, { zar: dizi(0, 0.5) }));
  assert.ok(r.ok);
  assert.equal(pir.pa, pa, "akçe değişmez");
  assert.equal(pir.ev!.cevher, once.cevher - 2);
  assert.equal(pir.tk, once.tk - TARIFLER.kilic.takat);
});

// ── Geriye uyum ──

test("geriye uyum: eski 0–3 partiler, eşyasız eski depo ve 'ef'siz karakter göçsüz çalışır; yeni kademe taşınabilir", () => {
  const t: Tezgah = { r: [], n: 0, kk: 0, ev: { kilic: 4, ekmek: 2 }, kq: { kilic: [[3, 1, "o1", ATOLYE], [1, 2, "o1"]] } };
  assert.deepEqual(depoGorunumu(t), [
    { mal: "ekmek", kalite: 0, adet: 2 },
    { mal: "kilic", kalite: 0, adet: 1 },
    { mal: "kilic", kalite: 1, adet: 2 },
    { mal: "kilic", kalite: 3, adet: 1 },
  ]);
  const c = { o: "o1", ev: { kilic: 1 }, kq: { kilic: [[4, 1, "o1", ATOLYE]] } } as unknown as Karakter;
  const g = kaliteGorunumu(c) as Record<string, { kalite: string; huner?: string }[]>;
  assert.equal(g.kilic![0]!.kalite, "nadide");
  assert.equal(g.kilic![0]!.huner, nadideHuneri("kilic"));
  assert.equal(efsaneviHakki({}, AY), 1);
  const malBul = (v: unknown) => (typeof v === "string" && v in MALLAR ? (v as MalId) : undefined);
  assert.ok(tasimaCoz({ mal: "kilic", kalite: 5, adet: 1 }, malBul).ok);
  assert.deepEqual(tasimaCoz({ mal: "kilic", kalite: 7, adet: 1 }, malBul), { ok: false, hata: "kalite_gecersiz" });
});

// ── Denetim sonrası (17 Kasım): adlı eşya sessizce yok olmaz, göç ikinci hak açmaz, ilan/raf eşyayı gösterir ──

test("adlı eşya kilidi: 1 sade + 1 efsanevi kılıçla 2 kılıç NPC'ye satış esya_kilitli; efsanevi yerinde, hiçbir şey değişmez", () => {
  const k = testKasabasi("develi", AY);
  const c = demirci(k, 60, 3);
  const e = esyaYap(c, "kilic", 5, AY, "A", hep(0));
  c.ev = {};
  kaliteliEkle(c, "kilic", [[0, 1, c.o]]);
  kaliteliEkle(c, "kilic", [[5, 1, c.o, ATOLYE, e]]);
  const once = structuredClone({ ev: c.ev, kq: c.kq, pa: c.pa, ns: c.ns });
  assert.deepEqual(npcyeSat(c, "kilic", 2, () => 0, AY), { ok: false, hata: "esya_kilitli" });
  assert.deepEqual({ ev: c.ev, kq: c.kq, pa: c.pa, ns: c.ns }, once);
  // Tek sade satılır; efsanevi yerinde kalır.
  assert.ok(npcyeSat(c, "kilic", 1, () => 0, AY).ok);
  assert.equal(c.ev!.kilic, 1);
  assert.equal(c.kq!.kilic![0]![4]!.i, e.i);
  // Artık 1 kılıç var ama o adlı: kimliksiz satış yine kilitli.
  assert.deepEqual(npcyeSat(c, "kilic", 1, () => 0, AY), { ok: false, hata: "esya_kilitli" });
  // Savunma: denetimsiz eksi envanterEkle adlı eşyanın altına inmez, kaliteKirp ona dokunmaz.
  envanterEkle(c, "kilic", -5);
  assert.equal(c.ev!.kilic, 1);
  assert.equal(c.kq!.kilic![0]![4]!.i, e.i);
  assert.equal(esyaKilidi(c, { kilic: 1 }), "esya_kilitli");
  assert.equal(esyaKilidi(c, { kilic: 2 }), null, "envanter hiç yetmiyorsa çağıranın mal_yok'u geçerli");
});

test("adlı eşya kilidi: tarif girdisi ve depo genişletmesi adlı eşyayı yakmaz (esya_kilitli); kimlikle taşınır", () => {
  const k = testKasabasi("develi", AY);
  const c = demirci(k, 61, 3);
  const e = esyaYap(c, "civi", 5, AY, "A", hep(0));
  c.ev = {};
  kaliteliEkle(c, "civi", [[5, 1, c.o, ATOLYE, e]]);
  const t: Tezgah = bosTezgah();
  const malBul = (v: unknown) => (typeof v === "string" && v in MALLAR ? (v as MalId) : undefined);
  const g = tasimaCoz({ mal: "civi", kalite: 5, adet: 1 }, malBul, true);
  assert.ok(g.ok);
  assert.deepEqual(depoyaKoy(c, t, g.deger, 100), { ok: false, hata: "esya_kilitli" });
  const gi = tasimaCoz({ mal: "civi", kalite: 5, adet: 1, esya: e.i }, malBul, true);
  assert.ok(gi.ok);
  assert.ok(depoyaKoy(c, t, gi.deger, 100).ok);
  assert.equal(t.kq!.civi![0]![4]!.i, e.i);
  assert.equal(depodanDus(t, "civi", 1), false, "depodan kimliksiz düşüş adlı eşyayı almaz");
  // İflas/devralma boşaltması adlı eşyayı da taşır.
  const varis = { ev: {} } as Karakter;
  tezgahBosalt(t, varis);
  assert.equal(varis.kq!.civi![0]![4]!.i, e.i);
});

test("göç: efsanevi hak sayacı yerleşim ayından bağımsız — daha geride bir yerleşimde ikinci hak açılmaz", () => {
  const c = { o: "o1", h: "h1", ad: "x" } as Karakter;
  efsaneviDene(c, "kilic", 4, 10_000, AY + 3, "A", hep(0.99));
  assert.deepEqual(c.ef, [AY + 3, 1]);
  assert.equal(efsaneviHakki(c, AY + 3), 0);
  assert.equal(efsaneviHakki(c, AY + 1), 0, "göçle geride kalan yerleşimde hak yok");
  const r = efsaneviDene(c, "kilic", 4, 10_000, AY + 1, "A", hep(0.99));
  assert.deepEqual(c.ef, [AY + 3, 2], "sayaç ayı geri gitmez");
  assert.equal(r.kalanHak, 0);
  assert.equal(efsaneviHakki(c, AY + 4), 1, "sonraki gerçek ay hak döner");
});

test("ilan ve raf adlı eşyanın herkese açık görünümünü verir (geçmiş yok); kimliksiz alım onu seçmez", () => {
  const k = testKasabasi("develi", AY);
  const c = demirci(k, 62, 3);
  const e = esyaYap(c, "kilic", 5, AY, "Demirhane", hep(0));
  c.ev = {};
  kaliteliEkle(c, "kilic", [[5, 1, c.o, ATOLYE, e]]);
  assert.deepEqual(ilanAc(k, c, { tur: "sat", mal: "kilic", adet: 1, fiyat: 500, kalite: 5 }, AY), { ok: false, hata: "esya_kilitli" });
  const r = ilanAc(k, c, { tur: "sat", mal: "kilic", adet: 1, fiyat: 500, kalite: 5, esya: e.i }, AY);
  assert.ok(r.ok, JSON.stringify(r));
  const gv = ilanGorunumu(r.deger.ilan, "x", AY) as { esyalar?: Record<string, unknown>[] };
  assert.equal(gv.esyalar?.length, 1);
  assert.deepEqual(Object.keys(gv.esyalar![0]!).sort(), ["atolye", "hunerler", "id", "kademe", "kalite", "lakap", "ozellik", "usta", "yapim"]);
  assert.equal(gv.esyalar![0]!.usta, c.ad);
  // Raf: adlı eşya NPC talebine girmez; görünümde eşya ve kimliksiz alınabilen adet.
  const t: Tezgah = bosTezgah();
  kaliteliEkle(t, "kilic", [[5, 1, c.o, ATOLYE, { ...e, i: "e9" }], [3, 2, c.o]]);
  const rr = rafaKoy(t, "kilic", 5, 1, Math.floor(adil("kilic", 5)), 4, undefined, "e9");
  assert.ok(rr.ok, JSON.stringify(rr));
  const s = rr.deger.satir;
  assert.equal(rafSatilabilir(s), 0);
  assert.deepEqual(raftanSat(t, s, 1), null, "kimliksiz satış adlı eşyayı almaz");
  assert.equal((satirGorunumu(s) as { esyalar?: unknown[] }).esyalar?.length, 1);
  assert.equal(raftanSat(t, s, 1, "e9")![0]![4]!.i, "e9");
});

// ── Uç (atölyede anlık üretim) ──

test("uç: atölyede efsanevi isteği — pir olmayan reddedilir, pirde nadide değilse hak kalır; görünüm hakkı söyler", async () => {
  const { AY_MS, DUNYA_BASLANGICI_MS } = await import("../src/saat.ts");
  const { edin, mulkDefteri } = await import("../src/mulk/tapu.ts");
  const { atolyedeUret, depoTasi, tezgahGorunumu, zanaatUc } = await import("../src/mulk/tezgah-uclar.ts");
  const k = testKasabasi("develi", AY);
  const AN = DUNYA_BASLANGICI_MS + AY * AY_MS + 1000;
  const a = demirci(k, 1, 3);
  a.pa = 2000;
  a.nm = [30, 30, 0, 0];
  a.e = 901;
  k.sakin.find((s) => s.o === a.o)!.e = 901;
  assert.ok(edin(k, a, { tur: "atolye" }, AN, "e-0000001").ok, "atölye edinildi");
  const md = mulkDefteri(k);
  md.cik.k = [];
  const tp = md.t[ATOLYE]!;
  tp.y = { isletme: ATOLYE, ts: tp.ts, ad: "Demirhane", fc: 100, seviye: 0, durum: "acik", kapi: true, kapasite: 1, it: 10, kq: 0, py: [], pn: [], po: [], to: [], as: 1 } as never;
  assert.ok(zanaatUc(k, a, ATOLYE, { meslek: "demirci" }).ok);
  a.ev = { cevher: 6, komur: 6, deri: 3 };
  for (const mal of ["cevher", "komur", "deri"]) assert.ok(depoTasi(k, a, ATOLYE, { yon: "koy", mal, adet: a.ev[mal]! }).ok);
  const pa = a.pa;
  const g = tezgahGorunumu(k, a, ATOLYE);
  assert.ok(g.ok);
  assert.deepEqual((g.deger.atolye as { efsanevi: unknown }).efsanevi, { pir: true, hak: 1, ayda: 1 });
  ilerleme(a, "demirci").kd = 2;
  assert.deepEqual(atolyedeUret(k, a, ATOLYE, { tarif: "kilic", efsanevi: true }, { olaylar: [] }), { ok: false, hata: "efsanevi_pir_degil" });
  ilerleme(a, "demirci").kd = 3;
  const r = atolyedeUret(k, a, ATOLYE, { tarif: "kilic", efsanevi: true }, { olaylar: [] });
  assert.ok(r.ok, JSON.stringify(r));
  const u = r.deger.uretim as { kalite: { kademe: number }; efsanevi: { denendi: boolean; kalanHak: number } };
  if (u.kalite.kademe < 4) assert.deepEqual([u.efsanevi.denendi, u.efsanevi.kalanHak], [false, 1]);
  else assert.equal(u.efsanevi.kalanHak, 0);
  assert.equal(a.pa, pa, "akçe değişmez");
});
