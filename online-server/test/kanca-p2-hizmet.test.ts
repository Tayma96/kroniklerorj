// Kanca partisi 2 (18 Kasım), hizmet/tarif/sinerji bölümü: kasaba hizmet görevleri (ve kaliteleri), ölçüye göre zırh
// ısmarlaması, uzak kervan (başka beylik: yük eki, uzak anlaşma kota eki). Boşta kalan kapsam kancalarının nedeni
// listede yazılı olmalı.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BOSTA_KANCALAR } from "../src/icerik/bosta-kancalar.ts";
import { KANCA_BAGLARI, kancaAnahtari } from "../src/icerik/kanca-kayit.ts";
import {
  GOREV_KALITE_TAVAN,
  KASABA_GOREV_KOLTUKLARI,
  KASABA_GOREV_ULUFESI,
  KOSULLU_GOREVLER,
  gorevHizmeti,
  gorevKalitesi,
  hizmetGorevDonumu,
  hizmetGorevleri,
  hizmetGorevTeslim,
} from "../src/yerlesim/hizmet-gorev.ts";
import { ekonomiAl, type HizmetGorevTuru } from "../src/yerlesim/pazar-tahta.ts";
import { gostergeOku } from "../src/yerlesim/topluluk-kayit.ts";
import { ISMARLAMA_HIZMET, ISMARLAMA_ZIRH_HIZMET, ZIRH_MALLARI, ismarla, ismarlamaCevap } from "../src/yerlesim/ismarlama.ts";
import { dugumSeviyesi, meslekSec } from "../src/yerlesim/meslek.ts";
import {
  KERVAN_YUK_EN_COK,
  UZAK_ANLASMA_KOTA_EK,
  UZAK_KERVAN_YUK_EK,
  bosKervanDefteri,
  ilkKervanEngeli,
  kervanCikar,
  kervanKapilari,
  kervanYukuGecerli,
  uzakMi,
  varisHesapla,
  varisIsle,
  varisTahmini,
  yukTavani,
  type KervanYuku,
} from "../src/yerlesim/kervan.ts";
import { KITLIK_KOTASI, NPC_ODUNCU_SATIS_KOTASI } from "../src/yerlesim/pazar.ts";
import { MALLAR, type MalId } from "../src/icerik/mallar.ts";
import { npcFiyat, stokFiyat } from "../src/yerlesim/npc-taban.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";
import { ETKILER } from "../src/icerik/agaclar/index.ts";
import { seviyeVer } from "../src/yerlesim/beceri.ts";

const AY = 300;

function yetiskin(k: Kasaba, no: number): Karakter {
  const kar = oyuncuEkle(k, no, AY - 12 * 25);
  kar.pa = 2000;
  kar.tk = 60;
  kar.ta = AY;
  kar.e = 900 + no;
  k.sakin.find((s) => s.o === kar.o)!.e = 900 + no;
  return kar;
}

/** Verilen kancaları (düğümlerini o seviyeye) öğrenmiş yetişkin. */
function ogrenmis(k: Kasaba, no: number, ...kancalar: string[]): Karakter {
  const c = yetiskin(k, no);
  for (const x of kancalar) {
    const e = ETKILER.find((y) => kancaAnahtari(y.etki) === x);
    if (!e) throw new Error(`ağaçta yok: ${x}`);
    seviyeVer(c, e.dugum, Math.max(e.seviye, dugumSeviyesi(c, e.dugum)));
  }
  return c;
}

function gorevKasabasi(): Kasaba {
  const k = testKasabasi("develi", AY);
  k.hd = { ...(k.hd ?? {}), hz: 500 } as never;
  return k;
}

/** Yeni görev → (hizmet kancası, kalite kancası ya da null, gösterge). */
const YENI_GOREVLER: readonly [HizmetGorevTuru, string, string | null, "asayis" | "moral" | "arz"][] = [
  ["denetim", "hizmet:denetim", "kalite:denetim", "asayis"],
  ["defter", "hizmet:defter", "kalite:defter", "arz"],
  ["tercume", "hizmet:tercume", "kalite:tercume", "arz"],
  ["hizliUlak", "hizmet:hizliUlak", null, "asayis"],
  ["muhurluMektup", "hizmet:muhurluMektup", null, "moral"],
  ["sifreliMektup", "hizmet:sifreliMektup", null, "asayis"],
  ["izSur", "hizmet:izSur", "kalite:izSur", "asayis"],
  ["sahitDinle", "hizmet:sahitDinle", "kalite:sahitDinle", "asayis"],
  ["hakemlik", "hizmet:hakemlik", "kalite:hakemlik", "moral"],
];

test("hizmet görevleri: kimse bilmiyorsa koltuk açılmaz ve hazine ayrılmaz; bilen yaşayan biri varsa tek koltuk (rezerveli)", () => {
  assert.equal(KOSULLU_GOREVLER.size, YENI_GOREVLER.length);
  const bos = gorevKasabasi();
  hizmetGorevDonumu(bos, AY);
  for (const [tur] of YENI_GOREVLER) assert.equal(ekonomiAl(bos).hg!.filter((x) => x.tur === tur).length, 0, tur);
  for (const [tur, kh] of YENI_GOREVLER) {
    assert.equal(gorevHizmeti(tur), kh.split(":")[1]);
    const k = gorevKasabasi();
    ogrenmis(k, 1, kh);
    const hz0 = k.hd!.hz;
    hizmetGorevDonumu(k, AY);
    const hg = ekonomiAl(k).hg!;
    assert.equal(hg.filter((x) => x.tur === tur).length, KASABA_GOREV_KOLTUKLARI[tur], tur);
    assert.equal(KASABA_GOREV_KOLTUKLARI[tur], 1);
    assert.equal(hz0 - k.hd!.hz, hg.length * KASABA_GOREV_ULUFESI, "ulufe hazineden rezerve; akçe basılmaz");
    const satir = hizmetGorevleri(ekonomiAl(k), AY).find((x) => x.tur === tur)!;
    assert.ok(satir.meslek && satir.gosterge, "görünüm meslek ve göstergeyi döker");
    // Ölü sahip koltuk açtırmaz.
    const k2 = gorevKasabasi();
    const olu = ogrenmis(k2, 1, kh);
    olu.hd = { ...(olu.hd ?? {}), ol: AY - 1 } as never;
    hizmetGorevDonumu(k2, AY);
    assert.equal(ekonomiAl(k2).hg!.filter((x) => x.tur === tur).length, 0, `${tur}: ölü sahip`);
  }
});

test("hizmet görevleri: teslim hizmeti ister; ulufe hazineden gelir (toplam korunur), göstergeye katkı, hane başı ayda bir", () => {
  for (const [tur, kh, , g] of YENI_GOREVLER) {
    const k = gorevKasabasi();
    const c = ogrenmis(k, 1, kh);
    const yabanci = yetiskin(k, 2);
    hizmetGorevDonumu(k, AY);
    const gorev = ekonomiAl(k).hg!.find((x) => x.tur === tur)!;
    assert.deepEqual(hizmetGorevTeslim(k, yabanci, `kg${gorev.i}`, AY), { ok: false, hata: "dugum_kapali" }, tur);
    const toplam0 = c.pa + yabanci.pa + k.hd!.hz + ekonomiAl(k).hg!.filter((x) => x.d === "acik").reduce((a, x) => a + x.odul, 0);
    const g0 = gostergeOku(k, g);
    const r = hizmetGorevTeslim(k, c, `kg${gorev.i}`, AY);
    assert.ok(r.ok, `${tur}: ${JSON.stringify(r)}`);
    if (!r.ok) continue;
    assert.equal(r.deger.odul, KASABA_GOREV_ULUFESI);
    assert.equal(r.deger.katki.kalite, 0, "kalite kancası öğrenilmedi");
    assert.equal(gostergeOku(k, g) - g0, r.deger.katki.gosterge, `${tur}: ${g}`);
    const toplam1 = c.pa + yabanci.pa + k.hd!.hz + ekonomiAl(k).hg!.filter((x) => x.d === "acik").reduce((a, x) => a + x.odul, 0);
    assert.equal(toplam1, toplam0, "akçe değişmezi: ulufe rezervden oyuncuya");
    assert.deepEqual(hizmetGorevTeslim(k, c, `kg${gorev.i}`, AY), { ok: false, hata: "siparis_kapandi" }, "koltuk bir kez dolar");
    // Aynı hane aynı ayda ikinci kamu görevi alamaz (nöbet koltuğu her ay açık).
    const nobet = ekonomiAl(k).hg!.find((x) => x.tur === "nobet" && x.d === "acik")!;
    const c2 = ogrenmis(k, 3, "hizmet:nobet");
    c2.e = c.e;
    c2.ev = { mizrak: 2 };
    assert.deepEqual(hizmetGorevTeslim(k, c2, `kg${nobet.i}`, AY), { ok: false, hata: "ayni_kume" }, `${tur}: hane başı tek görev`);
  }
});

test("hizmet görevleri: dolmayan koltuğun ulufesi ay dönümünde hazineye döner", () => {
  const k = gorevKasabasi();
  ogrenmis(k, 1, "hizmet:denetim");
  const hz0 = k.hd!.hz;
  hizmetGorevDonumu(k, AY);
  hizmetGorevDonumu(k, AY + 1);
  const acik = ekonomiAl(k).hg!.filter((x) => x.d === "acik");
  assert.equal(hz0 - k.hd!.hz, acik.length * KASABA_GOREV_ULUFESI, "yalnız yeni ayın açık koltukları rezervde");
  assert.ok(ekonomiAl(k).hg!.some((x) => x.tur === "denetim" && x.d === "dustu"));
});

test("görev kalitesi (kalite:denetim/defter/tercume/izSur/sahitDinle/hakemlik): yüzde şansla +1 gösterge, tavanlı; kalitesiz görevde 0", () => {
  for (const [tur, kh, kq, g] of YENI_GOREVLER) {
    if (!kq) {
      const k = gorevKasabasi();
      const c = ogrenmis(k, 1, kh);
      assert.equal(gorevKalitesi(c, tur), 0, tur);
      continue;
    }
    let ekToplam = 0;
    let deneme = 0;
    for (let i = 0; i < 40; i++) {
      const k = gorevKasabasi();
      const c = ogrenmis(k, 1, kh, kq);
      assert.ok(gorevKalitesi(c, tur) > 0 && gorevKalitesi(c, tur) <= GOREV_KALITE_TAVAN, kq);
      assert.equal(gorevKalitesi(ogrenmis(k, 2, kh), tur), 0, `${kq}: öğrenmeyene yok`);
      hizmetGorevDonumu(k, AY);
      const gorev = ekonomiAl(k).hg!.find((x) => x.tur === tur)!;
      gorev.i += i * 1000; // farklı tohum
      const once = gostergeOku(k, g);
      const r = hizmetGorevTeslim(k, c, `kg${gorev.i}`, AY);
      assert.ok(r.ok, `${kq}: ${JSON.stringify(r)}`);
      if (!r.ok) continue;
      assert.equal(r.deger.katki.kalite, gorevKalitesi(c, tur));
      assert.equal(r.deger.katki.gosterge, 1 + r.deger.katki.kaliteEk);
      assert.equal(gostergeOku(k, g) - once, r.deger.katki.gosterge);
      assert.equal(r.deger.odul, KASABA_GOREV_ULUFESI, "kalite akçe getirmez");
      ekToplam += r.deger.katki.kaliteEk;
      deneme++;
    }
    assert.ok(ekToplam > 0 && ekToplam < deneme, `${kq}: ek ${ekToplam}/${deneme}`);
  }
});

// ── Ölçüye göre zırh ısmarlaması ──

test("hizmet:ismarlamaZirh: zırh ısmarlamasını teslim eden usta +tecrübe alır; zırh dışı malda ve kancasızda yok; ücret aynı", () => {
  assert.deepEqual([...ZIRH_MALLARI].sort(), ["kalkan", "pulZirh", "zincir"]);
  const sonuc = (kancali: boolean, mal: "kalkan" | "nal") => {
    const k = testKasabasi("develi", AY);
    const m = yetiskin(k, 1);
    const u = kancali ? ogrenmis(k, 2, "hizmet:ismarlamaZirh") : yetiskin(k, 2);
    meslekSec(u, "demirci", AY);
    const once = m.pa + u.pa;
    const r = ismarla(k, m, u, { mal, adet: 1, sure: 2, ucret: 20 }, AY);
    assert.ok(r.ok, JSON.stringify(r));
    if (!r.ok) throw new Error();
    const id = `i${r.deger.ismarlama.i}`;
    assert.ok(ismarlamaCevap(k, u, m, id, "kabul", undefined, AY).ok);
    u.ev = { [mal]: 1 };
    const t = ismarlamaCevap(k, u, m, id, "teslim", undefined, AY);
    assert.ok(t.ok, JSON.stringify(t));
    if (!t.ok) throw new Error();
    assert.equal(m.pa + u.pa, once, "akçe yalnız el değiştirir");
    return t.deger.teslim!;
  };
  const z = sonuc(true, "kalkan");
  assert.equal(z.zirhEk, ISMARLAMA_ZIRH_HIZMET);
  assert.equal(z.hizmet, ISMARLAMA_HIZMET + ISMARLAMA_ZIRH_HIZMET);
  assert.equal(z.ucret, 20);
  assert.equal(sonuc(false, "kalkan").zirhEk, 0);
  assert.equal(sonuc(false, "kalkan").hizmet, ISMARLAMA_HIZMET);
  assert.equal(sonuc(true, "nal").zirhEk, 0, "zırh dışı mal");
});

// ── Uzak kervan ──

function uzakTuccar(no: number, ...kancalar: string[]) {
  const k = testKasabasi("develi", AY);
  const kar = ogrenmis(k, no, "hizmet:kervan", ...kancalar);
  kar.ev = { nal: 10, kosum: 5, kereste: 40, odun: 20 };
  return { k, kar };
}

test("hizmet:uzakKervan: yalnız başka beyliğe giden kervanda yük tavanı +ek; aynı beylikte ve kancasızda yok; mutlak tavan aynı", () => {
  assert.equal(uzakMi("develi", "konuralp"), true);
  assert.equal(uzakMi("develi", "karapinar"), false);
  assert.equal(uzakMi(undefined, "konuralp"), false);
  const { kar } = uzakTuccar(1, "hizmet:uzakKervan");
  assert.equal(yukTavani(kar, {}, true).tavan, KERVAN_YUK_EN_COK + UZAK_KERVAN_YUK_EK);
  assert.equal(yukTavani(kar, {}, true).uzakEk, UZAK_KERVAN_YUK_EK);
  assert.equal(yukTavani(kar, {}, false).tavan, KERVAN_YUK_EN_COK);
  const d = bosKervanDefteri();
  const yuk = { kereste: KERVAN_YUK_EN_COK + UZAK_KERVAN_YUK_EK };
  assert.equal(ilkKervanEngeli(kervanKapilari(d, kar, AY, "konuralp", yuk, 2, "develi")), undefined);
  assert.equal(ilkKervanEngeli(kervanKapilari(d, kar, AY, "karapinar", yuk, 2, "develi")), "kervan_yuk_siniri");
  assert.equal(ilkKervanEngeli(kervanKapilari(d, kar, AY, "konuralp", { kereste: KERVAN_YUK_EN_COK + UZAK_KERVAN_YUK_EK + 1 }, 2, "develi")), "kervan_yuk_siniri");
  const { kar: sade } = uzakTuccar(2);
  assert.equal(ilkKervanEngeli(kervanKapilari(d, sade, AY, "konuralp", yuk, 2, "develi")), "kervan_yuk_siniri", "kancasız");
  const r = kervanCikar(d, kar, "konuralp", yuk, AY, `kervan:develi:${kar.o}:istek-0001`, 1000, 2, "develi");
  assert.ok(r.ok, JSON.stringify(r));
});

test("sinerji:uzakAnlasma: başka beyliğe kervanda varış kotası mal başına +ek; aynı beylikte, sahte ya da aşan ekte yok", () => {
  const { kar } = uzakTuccar(1, "hizmet:uzakKervan", "sinerji:uzakAnlasma");
  const d = bosKervanDefteri();
  const r = kervanCikar(d, kar, "konuralp", { kereste: 12 }, AY, `kervan:develi:${kar.o}:istek-0001`, 1000, 2, "develi");
  assert.ok(r.ok, JSON.stringify(r));
  const y = d.c.k[0]!.y as unknown as KervanYuku;
  assert.equal(y.ke, UZAK_ANLASMA_KOTA_EK);
  const r2 = kervanCikar(d, kar, "karapinar", { kereste: 12 }, AY, `kervan:develi:${kar.o}:istek-0002`, 1000, 2, "develi");
  assert.ok(r2.ok);
  assert.equal((d.c.k[1]!.y as unknown as KervanYuku).ke, undefined, "aynı beylikte ek yazılmaz");
  // Kancasız tüccar: ek yok.
  const { kar: sade } = uzakTuccar(2, "hizmet:uzakKervan");
  const d2 = bosKervanDefteri();
  assert.ok(kervanCikar(d2, sade, "konuralp", { kereste: 5 }, AY, `kervan:develi:${sade.o}:istek-0003`, 1000, 2, "develi").ok);
  assert.equal((d2.c.k[0]!.y as unknown as KervanYuku).ke, undefined);

  // Hedef: kota +ek, tahmin = gerçek.
  const hedef = testKasabasi("konuralp", AY + 1);
  const hd = bosKervanDefteri();
  const tahmin = varisTahmini(hedef, hd, y.hs, y.ev, y.va, y.ke);
  const v = varisIsle(hedef, hd, `kervan:develi:${kar.o}:istek-0001`, "develi", y, 5000);
  assert.equal(v.sonuc.durum, "kabul");
  assert.deepEqual(v.sonuc.satilan, { kereste: NPC_ODUNCU_SATIS_KOTASI + UZAK_ANLASMA_KOTA_EK });
  assert.equal(v.sonuc.ke, UZAK_ANLASMA_KOTA_EK);
  assert.deepEqual(tahmin.satirlar, v.sonuc.satirlar, "önizleme = gerçek");
  // Aynı beylikten gelen sahte ek yok sayılır.
  const yakin = testKasabasi("karapinar", AY + 1);
  const v2 = varisIsle(yakin, bosKervanDefteri(), `kervan:develi:${kar.o}:istek-0009`, "develi", { ...y, ke: 1 }, 5000);
  assert.deepEqual(v2.sonuc.satilan, { kereste: NPC_ODUNCU_SATIS_KOTASI });
  // Tavanı aşan ek yükü geçersiz kılar (kalıcı ret, mal geri döner).
  assert.equal(kervanYukuGecerli({ ...y, ke: UZAK_ANLASMA_KOTA_EK + 1 }), false);
  assert.equal(kervanYukuGecerli({ ...y, ke: 0.5 }), false);
  const v3 = varisIsle(hedef, hd, `kervan:develi:${kar.o}:istek-0010`, "develi", { ...y, ke: 5 }, 5000);
  assert.deepEqual([v3.sonuc.durum, v3.sonuc.hasilat], ["red", 0]);
  // Eski kayıt (ek alanı yok) aynen geçerli.
  assert.equal(kervanYukuGecerli({ o: "o1", hs: "h", ev: { kereste: 1 }, ka: 1, va: 2 }), true);
});

test("denge: uzak anlaşmanın ek birimi var olan satış değerinden satılır, kıtlık primi kotası aynı; NPC'den/stoktan alınan malla kâr yok", () => {
  for (const mal of Object.keys(MALLAR) as MalId[]) {
    if (MALLAR[mal].taban <= 0) continue;
    for (const n of [0, 3]) {
      const yuk = { [mal]: 50 };
      const say = () => n;
      const bos = () => [0, 0] as [number, number];
      const a = varisHesapla(yuk, say, bos, undefined, 0);
      const b = varisHesapla(yuk, say, bos, undefined, UZAK_ANLASMA_KOTA_EK);
      const fark = b.hasilat - a.hasilat;
      const birim = b.satirlar[0]!.birim.toplam;
      assert.ok(fark >= MALLAR[mal].taban * UZAK_ANLASMA_KOTA_EK && fark <= birim * UZAK_ANLASMA_KOTA_EK, `${mal}/${n}: ek birim ${fark}`);
      assert.ok(b.satirlar[0]!.kitlikAdet <= KITLIK_KOTASI, `${mal}: kıtlık primi kotası aşılmaz`);
      assert.ok(birim <= stokFiyat(mal).toplam, `${mal}: stoktan alıp ek kotaya satmak kâr etmez (${birim} > ${stokFiyat(mal).toplam})`);
      assert.ok(birim <= npcFiyat(mal).toplam, `${mal}: NPC'den alıp ek kotaya satmak kâr etmez`);
    }
  }
});

// ── Kayıt ve boşta nedenleri ──

const BAGLANAN = [
  ...YENI_GOREVLER.flatMap(([, kh, kq]) => (kq ? [kh, kq] : [kh])),
  "hizmet:ismarlamaZirh",
  "hizmet:uzakKervan",
  "sinerji:uzakAnlasma",
];

test("kayıt: bu partide bağlanan 18 kanca kayıtta ve boşta listesinde yok; kapsamda boşta kalanın nedeni yazılı", () => {
  assert.equal(BAGLANAN.length, 18);
  const bosta = new Set(BOSTA_KANCALAR);
  for (const a of BAGLANAN) {
    assert.ok(Object.hasOwn(KANCA_BAGLARI, a), `kayıtta yok: ${a}`);
    assert.ok(!bosta.has(a), `boşta listesinde: ${a}`);
  }
  const metin = readFileSync(new URL("../src/icerik/bosta-kancalar.ts", import.meta.url).pathname, "utf8");
  for (const a of BOSTA_KANCALAR) {
    if (!/^(hizmet|tarif|sinerji):/.test(a)) continue;
    assert.match(metin, new RegExp(`"${a}", // .{10,}`), `boşta kalan ${a} için neden yok`);
  }
});
