// 17 Kasım denetimi (arkadaş denemesi öncesi): ekonomi (E1–E10) ve güvenlik/dayanıklılık (S1–S13) bulguları.
// Her bulgu önce kırmızı test olarak yazıldı.
import test from "node:test";
import assert from "node:assert/strict";
import { DEVIR_ADIL_UST, DEVIR_SOGUMA_AY, devirKabul, devirTeklif, edin, mulkDefteri } from "../src/mulk/tapu.ts";
import { HEDIYE_VERME_AYLIK } from "../src/yerlesim/teklif.ts";
import { AY_MS, DUNYA_BASLANGICI_MS } from "../src/saat.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const AN = DUNYA_BASLANGICI_MS + 10 * AY_MS + 1000;
const ID = "develi.dukkan.1";

function yetiskin(k: Kasaba, no: number, pa = 2000): Karakter {
  const kar = oyuncuEkle(k, no, k.ay - 12 * 20);
  kar.pa = pa;
  kar.nm = [30, 30, 0, 0];
  kar.e = 900 + no;
  k.sakin.find((s) => s.o === kar.o)!.e = 900 + no;
  return kar;
}

test("E1: devir fiyatı adil bant dışına çıkınca armağan tavanına sayılır; 1500'lük devir reddedilir", () => {
  const k = testKasabasi("develi", 10);
  const a = yetiskin(k, 1);
  const b = yetiskin(k, 2, 3000);
  assert.ok(edin(k, a, { tur: "dukkan" }, AN, "e-0000001").ok);
  assert.ok(devirTeklif(k, a, ID, { islem: "teklif", alici: "o2", fiyat: 1500 }).ok);
  assert.deepEqual(devirKabul(k, b, ID, AN, "dv-0000001"), { ok: false, hata: "pompa_siniri" });
  // Bandı 50 aşan fiyat: kabul, 50 armağan tavanına yazılır.
  const ust = Math.ceil(120 * DEVIR_ADIL_UST);
  assert.ok(devirTeklif(k, a, ID, { islem: "teklif", alici: "o2", fiyat: ust + 50 }).ok);
  const r = devirKabul(k, b, ID, AN, "dv-0000002");
  assert.ok(r.ok, JSON.stringify(r));
  assert.deepEqual(b.hv, [k.ay, 50]);
  assert.deepEqual(a.ha, [k.ay, 50]);
  // Soğuma: yeni sahip 12 ay devredemez.
  assert.deepEqual(devirTeklif(k, b, ID, { islem: "teklif", alici: "o1", fiyat: 0 }), { ok: false, hata: "aralik_dolu" });
});

test("E1: aynı kümede devir fiyatsızdır", () => {
  const k = testKasabasi("develi", 10);
  const a = yetiskin(k, 1);
  const b = yetiskin(k, 2);
  b.e = a.e;
  k.sakin.find((s) => s.o === b.o)!.e = a.e;
  assert.ok(edin(k, a, { tur: "dukkan" }, AN, "e-0000001").ok);
  assert.deepEqual(devirTeklif(k, a, ID, { islem: "teklif", alici: "o2", fiyat: 100 }), { ok: false, hata: "ayni_kume" });
  assert.ok(devirTeklif(k, a, ID, { islem: "teklif", alici: "o2", fiyat: 0 }).ok);
  assert.ok(devirKabul(k, b, ID, AN, "dv-0000001").ok);
});

test("E1 sim: devir döngüsüyle aktarım armağan tavanını aşamaz", () => {
  const k = testKasabasi("develi", 10);
  const a = yetiskin(k, 1, 100_000);
  const b = yetiskin(k, 2, 100_000);
  assert.ok(edin(k, a, { tur: "dukkan" }, AN, "e-0000001").ok);
  const bas = b.pa;
  const AYLAR = 48;
  let no = 0;
  for (let i = 0; i < AYLAR; i++) {
    k.ay++;
    const t = mulkDefteri(k).t[ID]!;
    const sahip = t.s === "o1" ? a : b;
    const diger = sahip === a ? b : a;
    // Ana hesap (a) alt hesaba (b) aktarmak ister: b satarken fiyatı şişirir, a satarken sıfıra çeker.
    for (const fiyat of sahip === b ? [10_000, 5000, 1500, 600, 300, 240] : [0, 30, 60]) {
      const tk = devirTeklif(k, sahip, ID, { islem: "teklif", alici: diger.o, fiyat });
      if (!tk.ok) continue;
      if (devirKabul(k, diger, ID, AN, `dv-${String(++no).padStart(7, "0")}`).ok) break;
    }
  }
  const aktarim = b.pa - bas;
  assert.ok(aktarim <= HEDIYE_VERME_AYLIK * AYLAR, `aktarım ${aktarim}`);
  assert.ok(aktarim <= 120 * DEVIR_ADIL_UST * Math.ceil(AYLAR / DEVIR_SOGUMA_AY), `aktarım ${aktarim}`);
});

import { ZAVIYE_EN_AZ, ZAVIYE_YATIR_AYLIK, zaviyeIslem } from "../src/yerlesim/lonca-grup.ts";

function zaviyeKur(k: Kasaba): Karakter[] {
  const uyeler = Array.from({ length: ZAVIYE_EN_AZ }, (_, i) => oyuncuEkle(k, i + 1, k.ay - 20 * 12));
  uyeler.forEach((u, i) => {
    u.pa = 1000;
    u.e = 90000 + i;
  });
  const [ku, ...digerleri] = uyeler;
  assert.ok(zaviyeIslem(k, ku!, { islem: "kur", ad: "Demirciler", sekil: "kalkan", renk: "al" }, k.ay).ok);
  for (const u of digerleri) {
    assert.ok(zaviyeIslem(k, ku!, { islem: "davet", hedef: u.o }, k.ay).ok);
    assert.ok(zaviyeIslem(k, u, { islem: "katil", zaviye: "z1" }, k.ay).ok);
  }
  return uyeler;
}

test("E2: zaviye dağılınca kasa yatıranlara yatırdıkları oranda döner, artan hazineye; son üye hepsini almaz", () => {
  const k = testKasabasi("develi", 400);
  const u = zaviyeKur(k);
  const ay = k.ay;
  assert.ok(zaviyeIslem(k, u[1]!, { islem: "yatir", tutar: 100 }, ay).ok);
  assert.ok(zaviyeIslem(k, u[2]!, { islem: "yatir", tutar: 50 }, ay).ok);
  assert.ok(zaviyeIslem(k, u[3]!, { islem: "yatir", tutar: 1 }, ay).ok);
  const toplamOnce = u.reduce((a, x) => a + x.pa, 0) + k.tl!.zv[0]!.ks;
  // Herkes ayrılır; son ayrılan u[4] hiç yatırmadı.
  for (const x of [u[0]!, u[1]!, u[2]!, u[3]!]) assert.ok(zaviyeIslem(k, x, { islem: "ayril" }, ay).ok);
  const pa4 = u[4]!.pa;
  const r = zaviyeIslem(k, u[4]!, { islem: "ayril" }, ay);
  assert.ok(r.ok);
  assert.equal(u[4]!.pa, pa4, "yatırmayan son üye kasayı almaz");
  assert.equal(u[1]!.pa, 1000, "yatırdığını geri alır");
  assert.equal(u[2]!.pa, 1000);
  const hazine = (mulkDefteri(k).vergiGiden ?? []).reduce((a, x) => a + x.tutar, 0);
  assert.equal(u.reduce((a, x) => a + x.pa, 0) + hazine, toplamOnce, "toplam akçe korunur");
  assert.equal(k.tl!.zv.length, 0);
});

test("E2: zaviyeye yatırmada üye başı aylık tavan", () => {
  const k = testKasabasi("develi", 400);
  const u = zaviyeKur(k);
  assert.ok(zaviyeIslem(k, u[1]!, { islem: "yatir", tutar: ZAVIYE_YATIR_AYLIK }, k.ay).ok);
  assert.deepEqual(zaviyeIslem(k, u[1]!, { islem: "yatir", tutar: 1 }, k.ay), { ok: false, hata: "tavan_doldu" });
  assert.ok(zaviyeIslem(k, u[1]!, { islem: "yatir", tutar: 1 }, k.ay + 1).ok);
});

import { HAN_ODEME_SERBEST_AYLIK, mulkluHanOdemesi } from "../src/mulk/tapu.ts";
import { HEDIYE_VERME_AYLIK as HV } from "../src/yerlesim/teklif.ts";
import { TEVECCUH_CIFT_AYLIK, sakinEkonomiKademesi, sakinTeveccuhYaz, teveccuhEkle, teveccuhEkonomiKademesi, teveccuhKademesi } from "../src/yerlesim/teveccuh.ts";

test("E3: ikram/armağan teveccühü veren-alan çifti başına aylık tavanlı; başka veren ayrı sayılır", () => {
  const k = testKasabasi("develi", 10);
  const alan = yetiskin(k, 1);
  const v1 = yetiskin(k, 2);
  const v2 = yetiskin(k, 3);
  let top = 0;
  for (let i = 0; i < 30; i++) top += teveccuhEkle(alan, v1, "ikram", k.ay, 6);
  assert.equal(top, TEVECCUH_CIFT_AYLIK);
  assert.equal(teveccuhEkle(alan, v2, "ikram", k.ay, 6), 6);
  assert.equal(teveccuhEkle(alan, v1, "ikram", k.ay + 1, 6), 6, "yeni ay sayaç sıfırlanır");
});

test("E3: oyuncu hanında küme ödemesi kasaya girmez; aynı kişinin aylık ödemesi armağan tavanına sayılır", () => {
  const k = testKasabasi("develi", 10);
  const sahip = yetiskin(k, 1);
  const musteri = yetiskin(k, 2, 5000);
  assert.ok(edin(k, sahip, { tur: "han" }, AN, "e-0000001").ok);
  const t = mulkDefteri(k).t["develi.han.1"]!;
  t.y = { isletme: "develi.han.1", ts: t.ts, ad: "", fc: 100, seviye: 0, durum: "acik", kapi: true, kapasite: 1, it: 10, kq: 0, py: [], pn: [], po: [], to: [], as: 1 } as never;
  let kasaya = 0;
  let no = 0;
  let red = "";
  for (let i = 0; i < 100; i++) {
    const r = mulkluHanOdemesi(k, musteri, 10, AN, `i-${++no}`, 0, false, 1);
    if (!r.ok) {
      red = r.hata;
      break;
    }
    kasaya += r.deger.kasaya;
  }
  assert.equal(red, "tavan_doldu");
  assert.ok(kasaya <= HAN_ODEME_SERBEST_AYLIK + HV, `kasaya ${kasaya}`);
  assert.equal(aylikDeger(musteri.hv, k.ay), kasaya - HAN_ODEME_SERBEST_AYLIK);
  // Küme: kasaya girmez.
  const kardes = yetiskin(k, 3);
  kardes.e = sahip.e;
  const r = mulkluHanOdemesi(k, kardes, 10, AN, "i-kume", 0, false, 1);
  assert.ok(r.ok);
  assert.deepEqual([r.deger.kasaya, r.deger.batak], [0, 10]);
});

function aylikDeger(s: [number, number] | undefined, ay: number): number {
  return s && s[0] === ay ? s[1] : 0;
}

test("E5: Debdebe armağanı teveccühü görünür kademeye sayılır, ekonomik kademeye (sipariş önceliği, ahi) sayılmaz", () => {
  const k = testKasabasi("develi", 10);
  const alan = yetiskin(k, 1);
  const v = yetiskin(k, 2);
  teveccuhEkle(alan, v, "debdebe", k.ay, 5000);
  assert.equal(teveccuhKademesi(alan, k.ay), 5);
  assert.equal(teveccuhEkonomiKademesi(alan, k.ay), 0);
  teveccuhEkle(alan, v, "armagan", k.ay, 20);
  assert.equal(teveccuhEkonomiKademesi(alan, k.ay), 1);
  assert.equal(teveccuhEkonomiKademesi(alan, k.ay + 24), 0, "aynı sönme");
  const s = k.sakin.find((x) => x.o === alan.o)!;
  sakinTeveccuhYaz(s, alan, k.ay);
  assert.deepEqual([s.tv, sakinEkonomiKademesi(s)], [5, 1]);
});

import { ETKINLIK_TURLERI, parametreUygula } from "../src/etkinlik/katalog.ts";
import { PARAMETRELER, caprazIhlaller, type ParametreAdi } from "../src/yonetim/parametre.ts";

test("E4: 18 etkinliğin her biri ve ikili birleşimleri çapraz kuralları bozmaz", () => {
  const oz = (tur: (typeof ETKINLIK_TURLERI)[number], id: string) => ({ id, tur, bas: 0, bit: null });
  assert.equal(ETKINLIK_TURLERI.length, 18);
  const denetle = (liste: ReturnType<typeof oz>[]) => {
    const pr = parametreUygula({}, liste) as Record<string, number | undefined>;
    const d = (ad: ParametreAdi) => pr[ad] ?? PARAMETRELER[ad].varsayilan;
    assert.deepEqual(caprazIhlaller(d), [], liste.map((x) => x.tur).join("+"));
    for (const ad of Object.keys(PARAMETRELER) as ParametreAdi[]) {
      const v = d(ad);
      assert.ok(v >= PARAMETRELER[ad].alt && v <= PARAMETRELER[ad].ust, `${ad}=${v}`);
    }
  };
  for (const a of ETKINLIK_TURLERI) {
    denetle([oz(a, "e1")]);
    for (const b of ETKINLIK_TURLERI) if (a < b) denetle([oz(a, "e1"), oz(b, "e2")]);
  }
  // Lonca çarpanı < 1,6 (varsayılan üzerinde).
  assert.ok(parametreUygula({}, [oz("lonca", "e1")]).SIPARIS_ODUL_CARPANI! < 1.6);
});

import { etkiBirlestir } from "../src/etkinlik/katalog.ts";
import { NPC_SATIS_KOTASI, npcyeSat } from "../src/yerlesim/pazar.ts";

test("E6: Vakıf Günü ve Göç Dalgası NPC'lerin oyuncudan alım kotasını artırır", () => {
  const oz = (tur: "vakif" | "goc", id: string) => ({ id, tur, bas: 0, bit: null });
  assert.equal(etkiBirlestir([oz("vakif", "e1")]).satisEk, 2);
  assert.equal(etkiBirlestir([oz("goc", "e1"), oz("vakif", "e2")]).satisEk, 2);
  const k = testKasabasi("develi", 10);
  const kar = yetiskin(k, 1);
  kar.ev = { ekmek: 20 };
  const pr = { ETK: etkiBirlestir([oz("vakif", "e1")]) };
  const r = npcyeSat(kar, "ekmek", NPC_SATIS_KOTASI + 2, () => 1, k.ay, undefined, pr);
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(r.deger.kota.tavan, NPC_SATIS_KOTASI + 2);
  const kar2 = yetiskin(k, 2);
  kar2.ev = { ekmek: 20 };
  assert.deepEqual(npcyeSat(kar2, "ekmek", NPC_SATIS_KOTASI + 1, () => 1, k.ay), { ok: false, hata: "kota_doldu" });
});

import { arkaPlanAl } from "../src/yerlesim/arka-plan.ts";
import { DEFTER_EN_COK, ORTAK_DERT_KISI_EN_COK, ortakDertDonumu, ortakDertKatki } from "../src/yerlesim/ortak-dert.ts";
import { LEVHA_EN_COK, SENLIK_KATKI_EN_COK, senlikDurumu, senlikKatki } from "../src/yerlesim/senlik.ts";
import { toplulukAl } from "../src/yerlesim/topluluk-kayit.ts";

test("E7: defter dolu olsa da ortak dert katkı tavanı ve tek sefer ödül kişi sayacından", () => {
  const k = testKasabasi("develi", 300);
  const a = oyuncuEkle(k, 1, k.ay - 20 * 12);
  const ay = k.ay + 1;
  arkaPlanAl(k).tt.kitlik = ay + 2;
  ortakDertDonumu(k, ay);
  const d = k.tl!.od.find((x) => x.t === "kitlik")!;
  d.es = 1e9;
  for (let i = 0; i < DEFTER_EN_COK; i++) d.k.push({ o: `x${i}`, ad: "X", t: ["elEmegi"], n: 1, p: 1 });
  a.tk = 18;
  const g0 = a.nm.slice();
  for (let i = 0; i < ORTAK_DERT_KISI_EN_COK; i++) assert.ok(ortakDertKatki(k, a, { dert: d.i, katki: "elEmegi" }, ay).ok);
  assert.deepEqual(ortakDertKatki(k, a, { dert: d.i, katki: "elEmegi" }, ay), { ok: false, hata: "katki_siniri" });
  assert.equal(a.nm.reduce((x, y) => x + y, 0) - g0.reduce((x, y) => x + y, 0) <= 5, true, "nam bir kez");
});

test("E7: levha dolu olsa da şenlik katkı tavanı kişi sayacından", () => {
  const k = testKasabasi("develi", 0);
  let acik = -1;
  for (let ay = 0; ay < 40 && acik < 0; ay++) if (senlikDurumu(ay)?.durum === "acik") acik = ay;
  const s = senlikDurumu(acik)!;
  const tl = toplulukAl(k);
  tl.sn.push({ i: s.id, t: s.tur, ac: s.acilis, bt: s.bitis, k: Array.from({ length: LEVHA_EN_COK }, (_, i) => ({ o: `x${i}`, ad: "X", t: ["hayir"], n: 1 })) });
  const z = oyuncuEkle(k, 1, acik - 20 * 12);
  z.tk = 18;
  z.pa = 100;
  for (let i = 0; i < SENLIK_KATKI_EN_COK; i++) assert.ok(senlikKatki(k, z, { katki: "hayir", tutar: 1 }, acik).ok);
  assert.deepEqual(senlikKatki(k, z, { katki: "hayir", tutar: 1 }, acik), { ok: false, hata: "katki_siniri" });
});

import { iadeEt } from "../src/yerlesim/pazar-tahta.ts";
import { STOK_EN_COK } from "../src/yerlesim/npc-taban.ts";
import { hanedanKasabasi } from "../src/yerlesim/hanedan.ts";
import { MALLAR } from "../src/icerik/mallar.ts";

test("E8: sahipsiz ilan iadesinde stok tavanını aşan mal yok olmaz, taban değeriyle hazineye", () => {
  const k = testKasabasi("develi", 10);
  k.st = { ekmek: STOK_EN_COK - 2 } as never;
  const hz0 = hanedanKasabasi(k).hz;
  const ilan = { i: 1, t: "sat", o: "o9", oa: "X", ml: "ekmek", q: 0, n: 5, n0: 5, f: 3, ac: 10, sa: 12, p: [[0, 5]], e: 0, d: "acik" } as never;
  assert.equal(iadeEt(k, ilan, undefined), 3);
  assert.equal((k.st as Record<string, number>).ekmek, STOK_EN_COK);
  assert.equal(hanedanKasabasi(k).hz, hz0 + 3 * MALLAR.ekmek.taban);
});

import { YerlesimDO } from "../src/yerlesim-do.ts";
import { zarHazir, zarSirriAyarla } from "../src/yerlesim/zar-sirri.ts";
import { sahteDepolama } from "./yardimci.ts";

test("S1: YerlesimDO sırsız ortamda yedeğe yalnız ZAR_YEDEK_IZINLI=1 iken düşer", () => {
  const ctx = { id: { toString: () => "x" }, storage: sahteDepolama() } as never;
  try {
    new YerlesimDO(ctx, {} as never);
    assert.equal(zarHazir(), false);
    new YerlesimDO(ctx, { ZAR_YEDEK_IZINLI: "1" } as never);
    assert.equal(zarHazir(), true);
    new YerlesimDO(ctx, { ZAR_SIRRI: "kisa" } as never);
    assert.equal(zarHazir(), false);
    new YerlesimDO(ctx, { ZAR_SIRRI: "x".repeat(32) } as never);
    assert.equal(zarHazir(), true);
  } finally {
    zarSirriAyarla(undefined, true);
  }
});

test("S2: YerlesimDO istekleri sırayla işler (iki eşzamanlı istek tek motor açar, araya girmez)", async () => {
  const depolama = sahteDepolama();
  let mOkuma = 0;
  const asil = depolama.get.bind(depolama) as (k: string | string[]) => Promise<unknown>;
  (depolama as { get: unknown }).get = async (k: string | string[]) => {
    if (k === "m") {
      mOkuma++;
      for (let i = 0; i < 5; i++) await null;
    }
    return asil(k);
  };
  const env = { ZAR_YEDEK_IZINLI: "1" } as never;
  const d = new YerlesimDO({ id: { toString: () => "yerlesim:develi" }, storage: depolama } as never, env);
  const istek = () => new Request("https://ic/", { method: "POST", body: JSON.stringify({ islem: "durum", yerlesim: "develi", hesapId: "h-yok" }) });
  const [a, b] = await Promise.all([d.fetch(istek()), d.fetch(istek())]);
  assert.equal(a.status, b.status);
  assert.equal(mOkuma, 1, "ikinci istek ilkinin açtığı motoru kullanır");
});

import { IsletmeDO } from "../src/isletme-do.ts";

test("S2: IsletmeDO istekleri sırayla işler (eşzamanlı iki istek kaydı bir kez yükler)", async () => {
  const depolama = sahteDepolama();
  let okuma = 0;
  const asil = depolama.get.bind(depolama) as (k: string | string[]) => Promise<unknown>;
  (depolama as { get: unknown }).get = async (k: string | string[]) => {
    if (k === "is") {
      okuma++;
      for (let i = 0; i < 5; i++) await null;
    }
    return asil(k);
  };
  const d = new IsletmeDO({ id: { toString: () => "isletme:develi.dukkan.1" }, storage: depolama } as never, {} as never);
  const istek = () => new Request("https://ic/", { method: "POST", body: JSON.stringify({ islem: "gorunum", isletme: "develi.dukkan.1", hesapId: "h" }) });
  await Promise.all([d.fetch(istek()), d.fetch(istek())]);
  assert.equal(okuma, 1);
});

import { HesapDO } from "../src/hesap-do.ts";

test("S3: HesapDO istekleri sırayla işler (eşzamanlı iki istek yaptırım kaydını bir kez okur)", async () => {
  const depolama = sahteDepolama();
  let okuma = 0;
  const asil = depolama.get.bind(depolama) as (k: string | string[]) => Promise<unknown>;
  (depolama as { get: unknown }).get = async (k: string | string[]) => {
    if (k === "yaptirim") {
      okuma++;
      for (let i = 0; i < 5; i++) await null;
    }
    return asil(k);
  };
  const d = new HesapDO({ id: { toString: () => "h" }, storage: depolama } as never, {} as never);
  const istek = () => new Request("https://ic/", { method: "POST", body: JSON.stringify({ islem: "profil", hesapId: "h" }) });
  await Promise.all([d.fetch(istek()), d.fetch(istek())]);
  assert.equal(okuma, 1);
});
