// Tezgâh modeli Dilim 3 (tasarım §7): meslek/beceri kancaları. Kilit testi (boşta kanca listesi yalnız kısalır),
// kayıttaki her kancanın davranışı (tablo güdümlü), yığılma kuralı ve kanalların tezgâh/atölye/han etkisi.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AY_MS, DUNYA_BASLANGICI_MS } from "../src/saat.ts";
import { ETKILER } from "../src/icerik/agaclar/index.ts";
import { BOSTA_KANCALAR, BOSTA_TAVAN } from "../src/icerik/bosta-kancalar.ts";
import { KANCA_BAGLARI, kancaAnahtari } from "../src/icerik/kanca-kayit.ts";
import { MESLEK_IDLERI, type MeslekId } from "../src/icerik/meslekler.ts";
import { MALLAR, type MalId } from "../src/icerik/mallar.ts";
import { TARIFLER } from "../src/icerik/tarifler.ts";
import { agacGorunumu, kancaMi, seviyeVer, yapisalKancaMi } from "../src/yerlesim/beceri.ts";
import { kaliteliEkle } from "../src/yerlesim/kalite.ts";
import { ilerleme, meslekSec } from "../src/yerlesim/meslek.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { bilgiKancasi, kancaHesapla, kisiKatkisi } from "../src/mulk/kanca.ts";
import { atolyeKalemleri, genisletmeMalzemesi } from "../src/mulk/atolye.ts";
import { bosTezgah, depoKapasitesi, type Tezgah } from "../src/mulk/depo.ts";
import { npcTavani, talepCoz } from "../src/mulk/hane-butcesi.ts";
import { rafaKoy } from "../src/mulk/raf.ts";
import { edin, mulkDefteri } from "../src/mulk/tapu.ts";
import { emirAc, emirleriIsle } from "../src/mulk/uretim-emri.ts";
import { topluGeriAl, topluGorunumu, topluTeslim, type TopluDefter } from "../src/mulk/toplu-siparis.ts";
import { tezgahDonumu, yolcuKarti } from "../src/mulk/tezgah-donum.ts";
import { depoTasi, fiyatOnizle, rafIslem, tezgahGorunumu } from "../src/mulk/tezgah-uclar.ts";
import {
  DEPO_KAPASITE,
  DUKKAN_NPC_TAVAN,
  GENISLETME_MALZEME,
  HANE_BUTCESI,
  H_TAVAN_YUZDE,
  KANCA_TAVAN,
  KITLIK_BUTCE_CARPANI,
  MESAI_TEK_EN_COK,
  NPC_ATOLYE_MAAS_EN_AZ,
  NPC_EMEK_AY,
  NPC_EMEK_KALITE_CEZA,
  RAF_SATIR,
  RAF_SATIR_ADET,
  ZANAAT_MESLEKLERI,
} from "../src/mulk/tezgah-kurallar.ts";
import { PERSONEL_EN_COK } from "../src/mulk/kurallar.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const AY = 10;
const AN = DUNYA_BASLANGICI_MS + AY * AY_MS + 1000;

/** [KİLİT] Boşta kanca sayısının bu testteki üst sınırı: yalnız azaltılır (bosta-kancalar.ts BOSTA_TAVAN ile birlikte). */
const BOSTA_EN_COK = 230;

function yetiskin(k: Kasaba, no: number, meslek?: string): Karakter {
  const kar = oyuncuEkle(k, no, AY - 12 * 20);
  kar.pa = 2000;
  kar.nm = [30, 30, 0, 0];
  kar.e = 900 + no;
  k.sakin.find((s) => s.o === kar.o)!.e = 900 + no;
  if (meslek) meslekSec(kar, meslek, AY);
  return kar;
}

function yansit(k: Kasaba, id: string, ek: Record<string, unknown> = {}): void {
  const t = mulkDefteri(k).t[id]!;
  t.y = { isletme: id, ts: t.ts, ad: "Tezgâh", fc: 100, seviye: 0, durum: "acik", kapi: true, kapasite: 1, it: 10, kq: 0, py: [], pn: [], po: [], to: [], as: 1, ...ek } as never;
}

/** Kancayı içeren ilk düğüm seviyesi. */
function kaynak(kanca: string) {
  return ETKILER.find((e) => kancaAnahtari(e.etki) === kanca);
}

/** Kancayı (ve o düğümün önceki seviyelerini) öğrenmiş karakter. */
function ogrenmis(k: Kasaba, no: number, ...kancalar: string[]): Karakter {
  const c = yetiskin(k, no);
  for (const x of kancalar) {
    const e = kaynak(x)!;
    seviyeVer(c, e.dugum, e.seviye);
  }
  return c;
}

const DEGERLI = Object.entries(KANCA_BAGLARI).filter(([, b]) => b.kanal !== "mevcut" && b.kanal !== "fiyatTablosu");

// ── Kilit ──

test("kilit: tanımlı her kanca ya bağlı ya boşta listesinde; listede bağlı kanca yok; liste yalnız kısalır", () => {
  const bosta = new Set(BOSTA_KANCALAR);
  assert.equal(bosta.size, BOSTA_KANCALAR.length, "listede tekrar yok");
  assert.ok(BOSTA_KANCALAR.length <= BOSTA_TAVAN, `liste ${BOSTA_KANCALAR.length} > BOSTA_TAVAN ${BOSTA_TAVAN}`);
  assert.ok(BOSTA_TAVAN <= BOSTA_EN_COK, `BOSTA_TAVAN ${BOSTA_TAVAN} büyütülmüş (en çok ${BOSTA_EN_COK})`);
  const tanimli = new Set<string>();
  for (const { dugum, etki } of ETKILER) {
    if (!yapisalKancaMi(etki)) continue;
    const a = kancaAnahtari(etki);
    tanimli.add(a);
    const bagli = Object.hasOwn(KANCA_BAGLARI, a);
    assert.ok(bagli || bosta.has(a), `${dugum} ${a}: ne bağlı ne boşta listesinde (yeni boşta kanca eklenemez)`);
    assert.ok(!(bagli && bosta.has(a)), `${a}: bağlandı, boşta listesinden silinmeli`);
    assert.equal(kancaMi(etki), !bagli, a);
  }
  for (const a of BOSTA_KANCALAR) assert.ok(tanimli.has(a), `boşta listesinde ağaçta olmayan ${a}`);
  for (const a of Object.keys(KANCA_BAGLARI)) assert.ok(tanimli.has(a), `kayıtta ağaçta olmayan ya da yapısal bağlı ${a}`);
  const yeni = Object.values(KANCA_BAGLARI).filter((b) => b.kanal !== "mevcut").length;
  assert.ok(yeni >= 70, `Dilim 3 ilk parti ≈70: ${yeni}`);
  console.log(`  kanca: ${Object.keys(KANCA_BAGLARI).length} kayıtlı (${yeni} Dilim 3), ${BOSTA_KANCALAR.length} boşta`);
});

test("kayıt: önceden bağlı kancaların tüketicisi dosyada; değerli kanallar tavanlı, filtreler geçerli", () => {
  for (const [a, b] of Object.entries(KANCA_BAGLARI)) {
    if (b.kanal === "mevcut") {
      const kimlik = a.split(":")[1]!;
      const kod = readFileSync(new URL(`../${b.dosya}`, import.meta.url).pathname, "utf8");
      assert.ok(kod.includes(`"${kimlik}"`), `${a}: ${b.dosya} içinde "${kimlik}" yok`);
      continue;
    }
    if (b.kanal === "fiyatTablosu") continue;
    assert.ok(Object.hasOwn(KANCA_TAVAN, b.kanal), `${a} kanal ${b.kanal}`);
    assert.ok((b.d ?? 0) > 0, `${a} değer`);
    if (b.meslek) assert.ok((MESLEK_IDLERI as readonly string[]).includes(b.meslek), `${a} meslek`);
    if (b.mal) assert.ok(Object.hasOwn(MALLAR, b.mal), `${a} mal`);
    if (b.kanal === "atolyeKalite" || b.kanal === "npcCeza" || b.kanal === "topluIndirim") assert.ok(!b.meslek || (ZANAAT_MESLEKLERI as readonly string[]).includes(b.meslek), `${a}: zanaat değil`);
  }
});

test("ağaç görünümü: bağlanan kanca 'etkin' (kanca:false), boştaki 'yakında' (kanca:true)", () => {
  const k = testKasabasi("develi", AY);
  const c = yetiskin(k, 1, "tuccar");
  const g = agacGorunumu(c, "tuccar", AN);
  assert.ok(g.ok);
  const d = g.deger.dugumler.find((x) => x.id === "tuccar.pazarlik") as { seviyeler: { etkiler: { tur: string; kanca: boolean }[] }[] };
  assert.equal(d.seviyeler[0]!.etkiler[0]!.kanca, false, "fiyatTablosu bağlı");
  assert.equal(d.seviyeler[2]!.etkiler[0]!.kanca, false, "satis H bağlı");
  const y = g.deger.dugumler.find((x) => x.id === "tuccar.kervanSancagi") as { seviyeler: { etkiler: { kanca: boolean }[] }[] };
  assert.equal(y.seviyeler[0]!.etkiler[0]!.kanca, true, "kafile henüz boşta");
});

// ── Tablo güdümlü davranış: her bağlanan kanca kişi katkısı verir, filtre dışı vermez ──

test("her değerli kanca: öğrenen kişiye kanalında değerini verir; öğrenmeyene ve filtre dışına vermez", () => {
  const k = testKasabasi("develi", AY);
  let no = 1;
  for (const [a, b] of DEGERLI) {
    const kanal = b.kanal as keyof typeof KANCA_TAVAN;
    const f = { ...(b.meslek ? { meslek: b.meslek } : {}), ...(b.mal ? { mal: b.mal } : {}) };
    const bos = yetiskin(k, no++);
    assert.equal(kisiKatkisi(bos, kanal, f).d, 0, `${a}: öğrenmeyen`);
    const c = ogrenmis(k, no++, a);
    const r = kisiKatkisi(c, kanal, f);
    const kalem = r.kalemler.find((x) => x.kanca === a);
    assert.ok(kalem && kalem.d >= b.d!, `${a}: kalem ${JSON.stringify(r.kalemler)}`);
    if (b.meslek) {
      const baska = (MESLEK_IDLERI.find((m) => m !== b.meslek) ?? "ozan") as MeslekId;
      assert.equal(kisiKatkisi(c, kanal, { meslek: baska, ...(b.mal ? { mal: b.mal } : {}) }).kalemler.some((x) => x.kanca === a), false, `${a}: meslek filtresi`);
    }
    if (b.mal) assert.equal(kisiKatkisi(c, kanal, { ...f, mal: "civi" }).kalemler.some((x) => x.kanca === a), false, `${a}: mal filtresi`);
    const h = kancaHesapla([bos, c], kanal, f);
    assert.equal(h.kisi, c.o);
    assert.equal(h.deger, Math.min(KANCA_TAVAN[kanal], r.d));
  }
});

test("bilgi kancası: fiyatTablosu yalnız öğrenende açık", () => {
  const k = testKasabasi("develi", AY);
  assert.equal(bilgiKancasi(yetiskin(k, 1), "fiyatTablosu"), false);
  assert.equal(bilgiKancasi(ogrenmis(k, 2, "hak:fiyatTablosu"), "fiyatTablosu"), true);
});

// ── Yığılma kuralı ──

test("yığılma: kişi içinde toplanır, kişiler arasında en yükseği alınır (toplanmaz), kanal tavanıyla kırpılır", () => {
  const k = testKasabasi("develi", AY);
  const hepsi = DEGERLI.filter(([, b]) => b.kanal === "dukkanH" && !b.meslek).map(([a]) => a);
  const tam = ogrenmis(k, 1, ...hepsi);
  const ham = kisiKatkisi(tam, "dukkanH").d;
  assert.ok(ham > H_TAVAN_YUZDE, `bütün genel H kancaları ${ham} > ${H_TAVAN_YUZDE}`);
  const r = kancaHesapla([tam], "dukkanH");
  assert.equal(r.deger, H_TAVAN_YUZDE);
  assert.equal(r.ham, ham);
  // İki çalışan: biri 5 (satis), öbürü 5 (pazarGunu): işletme değeri 5 (toplam 10 değil).
  const x = ogrenmis(k, 2, "kalite:satis");
  const y = ogrenmis(k, 3, "hak:pazarGunu");
  assert.equal(kancaHesapla([x, y], "dukkanH").deger, 5);
  // Her kanal kendi tavanını aşmaz (bütün kancaları öğrenen tek kişi, her filtre).
  const herkes = ogrenmis(k, 4, ...DEGERLI.map(([a]) => a));
  for (const kanal of Object.keys(KANCA_TAVAN) as (keyof typeof KANCA_TAVAN)[]) {
    for (const m of [undefined, ...MESLEK_IDLERI]) {
      for (const mal of [undefined, "kesmeTas", "kereste"] as const) {
        const s = kancaHesapla([herkes, x, y], kanal, { ...(m ? { meslek: m } : {}), ...(mal ? { mal } : {}) });
        assert.ok(s.deger <= KANCA_TAVAN[kanal], `${kanal}/${m}/${mal}: ${s.deger}`);
      }
    }
  }
});

test("denge: kanca H bütçeyi büyütmez (Σ harcanan ≤ ΣB); edilgen atölye tavan H ve NPC cezasız kaliteyle ≤ 35", () => {
  // Kanallar yalnız pay (H), kapasite, kalite, teslim adedi ve malzeme değiştirir: B, Y, NPC emeği adedi, maaş, girdi ve
  // ödül hiçbir kanalda yok (kayıt tipi bunu sınırlar).
  assert.deepEqual(Object.keys(KANCA_TAVAN).sort(), ["atolyeKalite", "depo", "dukkanH", "genisletme", "hanH", "npcCeza", "rafAdet", "rafSatir", "topluIndirim"]);
  const d = new Map([["d1", { id: "d1", itibar: 100, tavan: 999 }], ["d2", { id: "d2", itibar: 10, tavan: 999 }]]);
  const r = talepCoz("sehir", [
    { id: "d1#1", dukkan: "d1", mal: "ekmek", q: 3, adet: 24, fiyat: npcTavani("ekmek", 3), hYuzde: 999 },
    { id: "d2#1", dukkan: "d2", mal: "ekmek", q: 0, adet: 24, fiyat: 2 },
  ], d, () => 0);
  assert.ok(r.harcanan <= r.butce);
  assert.equal(r.satirlar.find((x) => x.dukkan === "d1")!.carpan.H, 1 + H_TAVAN_YUZDE / 100, "H tavanı");
  // Edilgen atölye üst sınırı (tezgah-sim ile aynı hesap), H en yüksekte: tek satıcıda pay zaten 1, bağlayan B.
  let net = -Infinity;
  for (const t of Object.values(TARIFLER)) {
    if (!(ZANAAT_MESLEKLERI as readonly string[]).includes(t.meslek)) continue;
    const mal = t.cikti[0] as MalId;
    if (!(MALLAR[mal].taban > 0)) continue;
    const girdi = Object.entries(t.girdi).reduce((a, [m, n]) => a + MALLAR[m as MalId].taban * (n ?? 0), 0);
    for (let n = 1; n <= PERSONEL_EN_COK; n++) {
      for (let yap = 1; yap <= Math.floor((NPC_EMEK_AY * n) / t.takat); yap++) {
        const s = talepCoz("sehir", [{ id: "d#0", dukkan: "d", mal, q: 3, adet: yap * t.cikti[1], fiyat: npcTavani(mal, 3), hYuzde: KANCA_TAVAN.dukkanH }], new Map([["d", { id: "d", itibar: 100, tavan: DUKKAN_NPC_TAVAN[4]! }]]), () => 0, "butce");
        assert.ok(s.harcanan <= Math.floor(HANE_BUTCESI.sehir * KITLIK_BUTCE_CARPANI));
        net = Math.max(net, s.harcanan - yap * girdi - n * NPC_ATOLYE_MAAS_EN_AZ);
      }
    }
  }
  assert.ok(net <= 35, `edilgen atölye kancalı ${net}`);
});

// ── Kanalların sistem etkisi ──

test("dükkân H: sahibin kancası ay dönümünde satırın H çarpanına girer, gün sonunda kalemiyle dökülür; önizleme aynı", () => {
  const k = testKasabasi("develi", AY);
  const a = ogrenmis(k, 1, "kalite:satis", "hak:attarDukkani");
  assert.ok(edin(k, a, { tur: "dukkan" }, AN, "e-0000001").ok);
  mulkDefteri(k).cik.k = [];
  const ID = "develi.dukkan.1";
  yansit(k, ID);
  kaliteliEkle(a, "ekmek", [[0, 10]]);
  kaliteliEkle(a, "sifaliOt", [[0, 10]]);
  assert.ok(depoTasi(k, a, ID, { yon: "koy", mal: "ekmek", adet: 10 }).ok);
  assert.ok(depoTasi(k, a, ID, { yon: "koy", mal: "sifaliOt", adet: 10 }).ok);
  assert.ok(rafIslem(k, a, ID, { islem: "koy", mal: "ekmek", adet: 10, fiyat: MALLAR.ekmek.taban }).ok);
  assert.ok(rafIslem(k, a, ID, { islem: "koy", mal: "sifaliOt", adet: 10, fiyat: MALLAR.sifaliOt.taban }).ok);
  const g = tezgahGorunumu(k, a, ID);
  assert.ok(g.ok);
  const on = fiyatOnizle(k, a, ID, { mal: "ekmek", fiyat: MALLAR.ekmek.taban });
  assert.ok(on.ok);
  assert.equal((on.deger.onizleme as { carpanlar: { H: number } }).carpanlar.H, 1.05, "önizleme aynı H");
  const kanca = g.deger.kanca as Record<string, { deger: number; kalemler: { kanca: string }[] }>;
  assert.equal(kanca["dukkanH.asci"]?.deger, 5);
  assert.equal(kanca["dukkanH.sifaci"]?.deger, 15, "attar dükkânı yalnız şifacı malında");
  tezgahDonumu(k, AY + 1);
  const gs = mulkDefteri(k).tz![ID]!.gs as { satirlar: { mal: string; carpanlar: { H: number } }[]; hKanca: Record<string, { deger: number }> };
  assert.equal(gs.satirlar.find((x) => x.mal === "ekmek")!.carpanlar.H, 1.05);
  assert.equal(gs.satirlar.find((x) => x.mal === "sifaliOt")!.carpanlar.H, 1.15);
  assert.equal(gs.hKanca.sifaci!.deger, 15);
});

test("han H: sahibin/çalışanın han kancası yolcu payı çekiciliğine girer; kart kalemleri döker", () => {
  const k = testKasabasi("demirhan", AY);
  const sahip = ogrenmis(k, 2, "kalite:oda", "hak:hanBerati");
  assert.ok(meslekSec(sahip, "hanci", AY).ok);
  assert.ok(edin(k, sahip, { tur: "han", no: 2 }, AN, "h-0000002").ok);
  mulkDefteri(k).cik.k = [];
  yansit(k, "demirhan.han.2");
  tezgahDonumu(k, AY + 1);
  const kart = yolcuKarti(k, "demirhan.han.2", sahip.o)!;
  assert.equal(kart.carpan.H, 1.09);
  assert.equal(kart.kanca.deger, 9);
  assert.deepEqual(kart.kanca.kalemler.map((x) => x.kanca).sort(), ["hak:hanBerati", "kalite:oda"]);
  const hy = mulkDefteri(k).hy as { dagitilan: number; Y: number };
  assert.ok(hy.dagitilan <= hy.Y, "Y aşılmaz");
});

test("raf ve depo: tezgahKotasi +satır, tuccarKotasi +adet, depo kancası +kapasite (görünümde ve uçta)", () => {
  const k = testKasabasi("develi", AY);
  const a = ogrenmis(k, 1, "kalite:tezgahKotasi", "hak:tuccarKotasi", "hak:tahilSaklama");
  assert.ok(edin(k, a, { tur: "dukkan" }, AN, "e-0000001").ok);
  mulkDefteri(k).cik.k = [];
  const ID = "develi.dukkan.1";
  yansit(k, ID);
  const g = tezgahGorunumu(k, a, ID);
  assert.ok(g.ok);
  assert.deepEqual(g.deger.rafSiniri, { satir: RAF_SATIR[0]! + 1, adet: RAF_SATIR_ADET + 6 });
  assert.equal(g.deger.depoKapasite, DEPO_KAPASITE.dukkan[0]! + Math.floor((DEPO_KAPASITE.dukkan[0]! * 15) / 100));
  assert.equal(depoKapasitesi("atolye", 4, 25), 300);
  // Uçta: 4. satır ve 30 adet açılır (kancasız 3 satır, 24 adet).
  const mallar: MalId[] = ["ekmek", "civi", "kumas", "kereste"];
  for (const m of mallar) kaliteliEkle(a, m, [[0, 30]]);
  for (const m of mallar) assert.ok(depoTasi(k, a, ID, { yon: "koy", mal: m, adet: m === "ekmek" ? 30 : 5 }).ok, m);
  for (const m of mallar) assert.ok(rafIslem(k, a, ID, { islem: "koy", mal: m, adet: 5, fiyat: MALLAR[m].taban }).ok, m);
  assert.ok(rafIslem(k, a, ID, { islem: "koy", mal: "ekmek", adet: 24 }).ok, "satır başına 30");
  const t: Tezgah = bosTezgah();
  kaliteliEkle(t, "ekmek", [[0, 30]]);
  assert.deepEqual(rafaKoy(t, "ekmek", 0, 25, MALLAR.ekmek.taban, 0), { ok: false, hata: "raf_satir_dolu" }, "kancasız 24");
});

test("atölye: kalite kancası kalem olarak eklenir; NPC cezası kancayla azalır (dökümde), emir üretiminde uygulanır", () => {
  assert.deepEqual(atolyeKalemleri(2, 1, { kalite: 5, npcCeza: 10 }), [
    { k: "kalite.atolye", d: 10 },
    { k: "kalite.kanca", d: 5 },
    { k: "kalite.npcEmegi", d: -(NPC_EMEK_KALITE_CEZA - 10) },
  ]);
  assert.deepEqual(atolyeKalemleri(0, 1, { kalite: 0, npcCeza: 99 }), [{ k: "kalite.atolye", d: 0 }], "ceza sıfırın altına inmez");
  const k = testKasabasi("develi", AY);
  const u = yetiskin(k, 1, "oduncu");
  seviyeVer(u, "oduncu.baltacilik", 1);
  ilerleme(u, "oduncu").kd = 2;
  const kalemler = (kanca?: { kalite: number; npcCeza: number }) => {
    const t = bosTezgah();
    t.za = "oduncu";
    kaliteliEkle(t, "odun", [[0, 10]]);
    assert.ok(emirAc(t, 0, "kereste", 2, [u], u.o, AY).ok);
    const r = emirleriIsle({ t, isletme: "develi.atolye.1", seviye: 1, kapasite: 240, npcEmek: 10, adaylar: [u], ay: AY, ...(kanca ? { kanca } : {}) });
    return r.emirler[0]!.kaliteDokum!.kalemler;
  };
  const once = kalemler();
  const sonra = kalemler({ kalite: 5, npcCeza: 10 });
  assert.equal(once.find((x) => x.k === "kalite.kanca"), undefined);
  assert.deepEqual(sonra.find((x) => x.k === "kalite.kanca"), { k: "kalite.kanca", enAz: 5, enCok: 5 });
  assert.ok(sonra.find((x) => x.k === "kalite.npcEmegi")!.enAz > once.find((x) => x.k === "kalite.npcEmegi")!.enAz);
});

test("atölye ay dönümü: zanaat filtreli kanca (ormanNizami oduncu) emirde, görünümde; emek.tekEnCok", () => {
  const k = testKasabasi("develi", AY);
  const a = ogrenmis(k, 1, "hak:ormanNizami", "hak:npcMadenci");
  assert.ok(meslekSec(a, "oduncu", AY).ok);
  seviyeVer(a, "oduncu.baltacilik", 1);
  ilerleme(a, "oduncu").kd = 2;
  assert.ok(edin(k, a, { tur: "atolye" }, AN, "e-0000001").ok);
  mulkDefteri(k).cik.k = [];
  const ID = "develi.atolye.1";
  yansit(k, ID, { ne: 2, nt: 2 });
  const t = ((mulkDefteri(k).tz ??= {})[ID] ??= bosTezgah());
  t.za = "oduncu";
  kaliteliEkle(t, "odun", [[0, 10]]);
  assert.ok(emirAc(t, 0, "kereste", 2, [a], a.o, AY).ok);
  const g = tezgahGorunumu(k, a, ID);
  assert.ok(g.ok);
  const at = g.deger.atolye as { emek: { tekEnCok: number } };
  assert.equal(at.emek.tekEnCok, MESAI_TEK_EN_COK);
  const kanca = g.deger.kanca as Record<string, { deger: number }>;
  assert.equal(kanca.atolyeKalite?.deger, 5);
  assert.equal(kanca.npcCeza?.deger, 10);
  tezgahDonumu(k, AY + 1);
  const gs = t.gs as { emirler: { kaliteDokum: { kalemler: { k: string; enAz: number }[] } | null }[] };
  assert.equal(gs.emirler[0]!.kaliteDokum!.kalemler.find((x) => x.k === "kalite.kanca")!.enAz, 5);
  // Zanaat dışı: demirci atölyesinde oduncu kancası işlemez.
  assert.equal(kancaHesapla([a], "atolyeKalite", { meslek: "demirci" }).deger, 0);
});

test("toplu sipariş: zanaat kancası teslim adedini düşürür, ödül aynı; reddedilen teslimde düşen adet geri döner", () => {
  const d: TopluDefter = { l: [{ id: "t5", meslek: "oduncu", mal: "kereste", adet: 10, deger: 40, odul: 56, acilis: 5, son: 7, durum: "acik" }] };
  const t = bosTezgah();
  t.za = "oduncu";
  kaliteliEkle(t, "kereste", [[0, 9]]);
  const ind = (m: MeslekId) => (m === "oduncu" ? 20 : 0);
  const gor = topluGorunumu(d, 5, { isletme: "a1", t, indirim: ind })[0] as { teslimAdet: number; teslimEdebilir: boolean; odul: number };
  assert.equal(gor.teslimAdet, 8);
  assert.equal(gor.teslimEdebilir, true);
  assert.deepEqual(topluTeslim(structuredClone(d), "t5", "a1", "A", structuredClone(t), 5), { ok: false, hata: "mal_yok" }, "kancasız 10 gerekir");
  const r = topluTeslim(d, "t5", "a1", "A", t, 5, ind);
  assert.ok(r.ok);
  assert.equal(r.deger.adet, 8);
  assert.equal(r.deger.siparis.odul, 56, "ödül aynı");
  assert.equal(t.ev?.kereste, 1);
  const g = topluGeriAl(d, { siparis: "t5", parti: r.deger.parti }, "a1", t);
  assert.equal(g?.parti.reduce((a, p) => a + p[1], 0), 8);
  assert.equal(t.ev?.kereste, 9);
  assert.equal(d.l[0]!.ti, undefined);
});

test("genişletme: malzeme kancası (mal filtreli ve genel) adet başına aşağı yuvarlanır, en az 1; mal filtresi ve tavan", () => {
  const t = bosTezgah(3);
  const taban = GENISLETME_MALZEME.atolye[3]!;
  const g = genisletmeMalzemesi("atolye", t, 4, (m) => (m === "kesmeTas" ? 25 : 10))!;
  for (const [m, n] of Object.entries(taban)) {
    const y = m === "kesmeTas" ? 25 : 10;
    assert.equal(g.malzeme[m as MalId], Math.max(1, n! - Math.floor((n! * y) / 100)), m);
  }
  assert.ok(g.malzeme.kesmeTas! < taban.kesmeTas!);
  const k = testKasabasi("develi", AY);
  const a = ogrenmis(k, 1, "hak:temelTasi", "hak:evProjesi");
  const i = (mal: MalId) => kancaHesapla([a], "genisletme", { mal }).deger;
  assert.equal(i("kesmeTas"), 25, "temelTasi 25 + evProjesi 10 → tavan 25");
  assert.equal(i("civi"), 10);
});

test("fiyat tablosu: tüccar kancası rakip raf fiyatlarını görünümde açar; kancasız görünmez", () => {
  const k = testKasabasi("develi", AY);
  const a = ogrenmis(k, 1, "hak:fiyatTablosu");
  const b = yetiskin(k, 2);
  assert.ok(edin(k, a, { tur: "dukkan" }, AN, "e-0000001").ok);
  assert.ok(edin(k, b, { tur: "dukkan" }, AN, "e-0000002").ok);
  mulkDefteri(k).cik.k = [];
  yansit(k, "develi.dukkan.1");
  yansit(k, "develi.dukkan.2", { ad: "Rakip" });
  kaliteliEkle(b, "ekmek", [[0, 5]]);
  assert.ok(depoTasi(k, b, "develi.dukkan.2", { yon: "koy", mal: "ekmek", adet: 5 }).ok);
  assert.ok(rafIslem(k, b, "develi.dukkan.2", { islem: "koy", mal: "ekmek", adet: 5, fiyat: 3 }).ok);
  const g = tezgahGorunumu(k, a, "develi.dukkan.1");
  assert.ok(g.ok);
  assert.deepEqual(g.deger.fiyatTablosu, [{ isletme: "develi.dukkan.2", ad: "Rakip", mal: "ekmek", kalite: 0, fiyat: 3, adet: 5 }]);
  const gb = tezgahGorunumu(k, b, "develi.dukkan.2");
  assert.ok(gb.ok);
  assert.equal(gb.deger.fiyatTablosu, undefined);
});
