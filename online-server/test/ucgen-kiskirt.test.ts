// Kışkırtma (§6.1), ittifak sözü, katılım (laf/boykot), söz bozma ve bilgi sınırları (saf).
// Kabul (FAZ4_PLAN senaryo 6.1): Ahmet, Berkay, Murat (Murat→Berkay −42).
import test from "node:test";
import assert from "node:assert/strict";
import { ITTIFAK_DEGERI, ucgenAl } from "../src/yerlesim/bilgi.ts";
import { eylemSansi, iliskiAl } from "../src/yerlesim/eylem.ts";
import { gorus, gorusDegeri } from "../src/yerlesim/gorus.ts";
import { tohumlu } from "../src/yerlesim/rastgele.ts";
import {
  KISKIRT_NAM_KAYBI,
  SOZ_SURE,
  haberKarari,
  katil,
  kiskirt,
  kiskirtSansi,
  sozBoz,
  ucgenDonumu,
  ucgenGirdisiCoz,
} from "../src/yerlesim/ucgen.ts";
import { bagKur } from "../src/yerlesim/uret.ts";
import type { Kasaba, OlayTaslagi } from "../src/yerlesim/tipler.ts";
import { baglam, dostYap, kopya, senaryo } from "./ucgen-yardimci.ts";
import { oyuncuEkle } from "./kasaba-yardimci.ts";

const g0 = { teklif: "soz" as const, miktar: 0 };
const kur = (k: Kasaba, npc: number, hedef: string, t: Partial<typeof g0> = {}) => ({ npc, hedef, ...g0, ...t });

function dene(huy: string, tohum: number, gorusB = -42) {
  const s = kopya(senaryo(huy, gorusB));
  const r = kiskirt(baglam(s.k, s.ahmet), kur(s.k, s.murat.i, s.berkay.o), tohumlu("test", tohum));
  assert.ok(r.ok, JSON.stringify(r));
  return { s, c: r.deger };
}

test("senaryo 6.1: 200 tohumda en az iki sonuç; mert Murat daha çok haber verir; aynı tohum aynı sonuç", () => {
  const say = (huy: string) => {
    const n: Record<string, number> = {};
    for (let i = 0; i < 200; i++) {
      const v = dene(huy, i).c.yanit.sonuc as string;
      n[v] = (n[v] ?? 0) + 1;
    }
    return n;
  };
  const kurnaz = say("kurnaz");
  const mert = say("mert");
  assert.ok(Object.keys(kurnaz).length >= 2, JSON.stringify(kurnaz));
  assert.ok(kurnaz.basari! > 0);
  assert.ok((mert.retHaber ?? 0) > (kurnaz.retHaber ?? 0), `mert ${JSON.stringify(mert)} kurnaz ${JSON.stringify(kurnaz)}`);
  assert.deepEqual(dene("kurnaz", 7).c.yanit, dene("kurnaz", 7).c.yanit);
});

test("kızgınlık arttıkça başarı oranı artar; döküm toplamı şansa eşit", () => {
  const oran = (g: number) => {
    let b = 0;
    for (let i = 0; i < 200; i++) if (dene("kurnaz", i, g).c.yanit.sonuc === "basari") b++;
    return b;
  };
  assert.ok(oran(-80) > oran(-10));
  const s = senaryo();
  const d = kiskirtSansi(s.k, s.murat, s.ahmet, s.berkay, g0, s.k.ay);
  assert.equal(d.kalemler.reduce((a, x) => a + x.d, 0), d.toplam);
  assert.equal(d.kalemler.find((x) => x.k === "sans.kizginlik")?.d, 21);
  // Para şansı en çok +15 (sonucu satın almaz).
  const p = kiskirtSansi(s.k, s.murat, s.ahmet, s.berkay, { teklif: "para", miktar: 15 }, s.k.ay);
  assert.equal(p.kalemler.find((x) => x.k === "sans.teklif")?.d, 15);
});

test("başarı: ittifak sözü Murat→Berkay'ı en az 15 düşürür; süre 6 ay; yeniden kışkırtma süreyi uzatır", () => {
  let tohum = 0;
  let r = dene("kurnaz", tohum);
  while (r.c.yanit.sonuc !== "basari") r = dene("kurnaz", ++tohum);
  const { s } = r;
  const { k, murat, berkay, ahmet } = s;
  const ili = k.ili.get(berkay.o);
  const d = gorus(k, murat, berkay, ili, k.ay);
  assert.equal(d.kalemler.find((x) => x.k === "gorus.ittifak")?.d, -ITTIFAK_DEGERI);
  assert.ok(gorusDegeri(k, murat, berkay, ili, k.ay) <= -42 - 15);
  assert.ok(gorus(k, murat, ahmet, k.ili.get(ahmet.o), k.ay).kalemler.some((x) => x.k === "gorus.ittifakOrtagi"), "sadakat kalemi");
  const soz = ucgenAl(k).sz[0]!;
  assert.equal(soz.b, k.ay + SOZ_SURE);
  // 6 ay sonra söz sessizce düşer, kalem kaybolur.
  for (let a = 1; a <= SOZ_SURE; a++) ucgenDonumu(k, k.ay + a);
  const sonra = k.ay + SOZ_SURE;
  assert.equal(ucgenAl(k).sz.length, 0);
  assert.ok(!gorus(k, murat, berkay, ili, sonra).kalemler.some((x) => x.k === "gorus.ittifak"));
});

test("ret ve haber: mert Murat Berkay'a kaynaklı bilgi verir, Ahmet'in mertliği düşer; gerekçe kalemli", () => {
  let tohum = 0;
  let r = dene("mert", tohum);
  while (r.c.yanit.sonuc !== "retHaber") r = dene("mert", ++tohum);
  const { s, c } = r;
  const ihbar = c.olaylar.find((o: OlayTaslagi) => o.k === "olay.ucgen.ihbar")!;
  assert.equal(ihbar.h, s.berkay.o);
  assert.equal(ihbar.g, s.berkay.o, "yalnız Berkay görür");
  assert.ok(ihbar.p.kaynak && typeof ihbar.p.guven === "number");
  assert.ok(((c.yanit.degisim as any).nam?.mertlik ?? 0) <= 0);
  // Namı olan fail: mertlik tam KISKIRT_NAM_KAYBI düşer.
  const s2 = kopya(senaryo("mert"));
  s2.ahmet.nm[2] = 20;
  const r2 = kiskirt(baglam(s2.k, s2.ahmet), kur(s2.k, s2.murat.i, s2.berkay.o), tohumlu("test", tohum));
  assert.ok(r2.ok && r2.deger.yanit.sonuc === "retHaber");
  assert.equal(s2.ahmet.nm[2], 20 - KISKIRT_NAM_KAYBI);
  assert.ok((c.yanit.gerekce as any[]).some((x) => x.k === "haber.huy"));
  // Haber kararı zarsızdır ve gerekçelidir.
  assert.equal(haberKarari("kurnaz", -42, 0).haber, false);
  assert.equal(haberKarari("kurnaz", -10, 0).haber, true);
  assert.equal(haberKarari("kurnaz", -10, 40).haber, false, "faile dost bakan susar");
  assert.ok(KISKIRT_NAM_KAYBI > 0);
});

test("kapılar: kendine, oyuncu olmayana, 12 yaş, aynı hedefe ayda bir, teklif biçimi", () => {
  const s = senaryo();
  const b = baglam(s.k, s.ahmet);
  const z = tohumlu("x");
  assert.equal(ucgenGirdisiCoz({ tur: "kiskirt", npc: `n${s.murat.i}`, hedef: `n${s.murat.i}`, teklif: { t: "soz" } }).ok, false);
  assert.deepEqual(ucgenGirdisiCoz({ tur: "kiskirt", npc: `n${s.murat.i}`, hedef: `n${s.murat.i}`, teklif: { t: "soz" } }), { ok: false, hata: "hedef_uygun_degil" });
  assert.deepEqual(ucgenGirdisiCoz({ tur: "kiskirt", npc: `n${s.murat.i}`, hedef: "o2", teklif: { t: "para", miktar: 99 } }), { ok: false, hata: "ucgen_gecersiz" });
  assert.deepEqual(kiskirt(b, kur(s.k, s.murat.i, s.ahmet.o), z), { ok: false, hata: "kendine" });
  const cocuk = oyuncuEkle(s.k, 9, s.k.ay - 144);
  assert.deepEqual(kiskirt(baglam(s.k, cocuk), kur(s.k, s.murat.i, s.berkay.o), z), { ok: false, hata: "yas_kapisi" });
  assert.deepEqual(kiskirt(b, kur(s.k, s.murat.i, cocuk.o), z), { ok: false, hata: "yas_kapisi" }, "12 yaşındaki hedef");
  assert.equal(kiskirt(b, kur(s.k, s.murat.i, s.berkay.o), z).ok, true);
  assert.deepEqual(kiskirt(b, kur(s.k, s.murat.i, s.berkay.o), z), { ok: false, hata: "aralik_dolu" });
});

test("fark: Berkay'ın dostu aynı mekândaysa görüşme kaynaklı bilgiyle Berkay'a gider; yoksa doğmaz", () => {
  let farkli = 0;
  let yok = 0;
  for (let i = 0; i < 20; i++) {
    const s = kopya(senaryo());
    const zeynep = oyuncuEkle(s.k, 4, s.k.ay - 240);
    dostYap(s.k, zeynep.o, s.berkay.o);
    const r = kiskirt(baglam(s.k, s.ahmet), kur(s.k, s.murat.i, s.berkay.o), tohumlu("fark", i));
    assert.ok(r.ok);
    const mekan = s.ahmet.mk;
    // Dost başka mekândaysa: fark yok.
    const s2 = kopya(senaryo());
    const z2 = oyuncuEkle(s2.k, 4, s2.k.ay - 240);
    dostYap(s2.k, z2.o, s2.berkay.o);
    const zs2 = s2.k.sakin.find((x) => x.o === z2.o)!;
    zs2.mk = mekan === "meydan" ? "cami" : "meydan";
    zs2.ma = s2.k.ay;
    const r2 = kiskirt(baglam(s2.k, s2.ahmet), kur(s2.k, s2.murat.i, s2.berkay.o), tohumlu("fark", i));
    assert.ok(r2.ok);
    if (r2.deger.olaylar.some((o) => o.k === "olay.ucgen.fark" && o.p.kaynak && (o.p.kaynak as any).i === z2.o)) yok++;
    // Aynı mekân: Zeynep'i oraya koy ve yeniden oyna.
    const s3 = kopya(senaryo());
    const z3 = oyuncuEkle(s3.k, 4, s3.k.ay - 240);
    dostYap(s3.k, z3.o, s3.berkay.o);
    const zs3 = s3.k.sakin.find((x) => x.o === z3.o)!;
    zs3.mk = mekan;
    zs3.ma = s3.k.ay;
    const r3 = kiskirt(baglam(s3.k, s3.ahmet), kur(s3.k, s3.murat.i, s3.berkay.o), tohumlu("fark", i));
    assert.ok(r3.ok);
    const f = r3.deger.olaylar.find((o) => o.k === "olay.ucgen.fark" && (o.p.kaynak as any).i === z3.o);
    if (f) {
      farkli++;
      assert.equal(f.g, s3.berkay.o);
      assert.equal(f.p.guven, 80);
    }
    assert.equal(JSON.stringify(r3.deger.yanit).includes("fark"), false, "fail fark edildiğini bilmez");
  }
  assert.ok(farkli > 0, "dost aynı mekânda fark eder");
  assert.equal(yok, 0, "dost başka yerdeyse fark yok");
});

function sozlu() {
  let tohum = 0;
  let r = dene("kurnaz", tohum);
  while (r.c.yanit.sonuc !== "basari") r = dene("kurnaz", ++tohum);
  return r.s;
}

test("katılım: laf yalnız Murat'ın dostlarına duyum olarak ulaşır (bilgi sınırı); ayda tek; boykot eylem şansını düşürür", () => {
  const s = sozlu();
  const { k, murat, berkay, ahmet } = s;
  const ili = k.ili.get(berkay.o)!;
  const dostlar = murat.b.filter((b) => b[1] === 1).map((b) => b[0]);
  if (dostlar.length === 0) {
    const d = k.npc.find((n) => n !== murat && n.e !== murat.e && !murat.b.some((b) => b[0] === n.i))!;
    bagKur(murat, d, 1, 60, k.ay - 30);
  }
  const yabanci = k.npc.find((n) => n !== murat && !murat.b.some((b) => b[0] === n.i) && n.b.every((b) => b[0] !== murat.i))!;
  const yabanciOnce = gorusDegeri(k, yabanci, berkay, ili, k.ay);
  const soz = `z${ucgenAl(k).sz[0]!.i}`;
  let r;
  let t = 0;
  do {
    const kk = kopya(s);
    r = { s: kk, c: katil(baglam(kk.k, kk.ahmet), { soz: ucgenAl(kk.k).sz[0]!.i, hamle: "laf" }, tohumlu("laf", t++)) };
  } while (r.c.ok && !(r.c.deger.yanit.katildi && !r.c.deger.yanit.yakalandi) && t < 200);
  assert.ok(r.c.ok && r.c.deger.yanit.katildi, "katıldı");
  const kk = r.s;
  const kIli = kk.k.ili.get(kk.berkay.o)!;
  const duyan = Object.entries(kIli).filter(([, i]) => i.du?.some((d) => d[1] === "laf")).map(([a]) => Number(a));
  assert.ok(duyan.length > 0);
  for (const n of duyan) assert.ok(kk.murat.b.some((b) => b[0] === n && b[1] === 1), "duyan Murat'ın dostu");
  const d0 = kk.k.dizin.get(duyan[0]!)!;
  assert.ok(gorus(kk.k, d0, kk.berkay, kIli, kk.k.ay).kalemler.some((x) => x.k === "gorus.duyulan" && x.d < 0));
  const y2 = kk.k.dizin.get(yabanci.i)!;
  assert.equal(gorusDegeri(kk.k, y2, kk.berkay, kIli, kk.k.ay), yabanciOnce, "duymayan tepki vermez");
  assert.deepEqual(katil(baglam(kk.k, kk.ahmet), { soz: ucgenAl(kk.k).sz[0]!.i, hamle: "boykot" }, tohumlu("x")), { ok: false, hata: "aralik_dolu" });
  // Söz başkasınındır: Berkay katılım isteyemez.
  assert.deepEqual(katil(baglam(k, berkay), { soz: Number(soz.slice(1)), hamle: "laf" }, tohumlu("x")), { ok: false, hata: "taraf_degil" });
  // Boykot: hedefin o NPC ile eylem şansı −20.
  iliskiAl(ili, murat.i).bk = k.ay + 3;
  assert.equal(eylemSansi(k, "sohbet", murat, berkay, ili, k.ay).kalemler.find((x) => x.k === "sans.boykot")?.d, -20);
  void ahmet;
});

test("söz bozma: söz düşer, Ahmet'in mertliği azalır, Murat'ta ağır ihanet anısı kalır", () => {
  const s = sozlu();
  const { k, ahmet, murat } = s;
  ahmet.nm[2] = 20;
  const z = ucgenAl(k).sz[0]!;
  const r = sozBoz(baglam(k, ahmet), { soz: z.i });
  assert.ok(r.ok);
  assert.equal(ahmet.nm[2], 17);
  assert.ok(k.ili.get(ahmet.o)![murat.i]!.an.some((a) => a[0] === "ihanet"));
  assert.deepEqual(sozBoz(baglam(k, ahmet), { soz: z.i }), { ok: false, hata: "soz_yok" });
  // İhanet anısı varsayılandan yavaş söner (12 ayda yarıdan çok kalır).
  const d = gorus(k, murat, ahmet, k.ili.get(ahmet.o), k.ay + 12).kalemler.find((x) => x.k === "gorus.ani.ihanet")!;
  assert.ok(d.d < -10);
});
