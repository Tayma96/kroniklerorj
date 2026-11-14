// H5 han masası olaylarının yerleşim etkisi (saf): tanıklık, söylenti tohumu, yemin/kabul/ihbar etkileri, farm süzgeci.
import test from "node:test";
import assert from "node:assert/strict";
import {
  HAN_YEMIN_NAM,
  hanOlayiCoz,
  hanOlayiIslendiMi,
  hanOlayiUygula,
  hanTanidikKimlikleri,
  type HanOlayGirdisi,
} from "../src/yerlesim/han-olay.ts";
import { NAMLAR } from "../src/yerlesim/karakter.ts";
import { soylentiGorunumu, yalanla } from "../src/yerlesim/soylenti.ts";
import { toplumAl } from "../src/yerlesim/toplum.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const MERT = NAMLAR.indexOf("mertlik");

function haneDegistir(k: Kasaba, kar: Karakter, e: number): void {
  kar.e = e;
  const s = k.sakin.find((x) => x.o === kar.o);
  if (s) s.e = e;
}

function kur() {
  const k = testKasabasi("develi", 200);
  const a = oyuncuEkle(k, 1);
  const b = oyuncuEkle(k, 2);
  const c = oyuncuEkle(k, 3);
  const d = oyuncuEkle(k, 4);
  const haneler = [...new Set(k.npc.map((n) => n.e).filter((e) => e !== 0))];
  haneDegistir(k, a, haneler[0]!);
  haneDegistir(k, b, haneler[1]!);
  haneDegistir(k, c, haneler[2]!);
  haneDegistir(k, d, haneler[0]!); // a ile aynı hane
  const kisiler = new Map([a, b, c, d].map((x) => [x.h, x]));
  return { k, a, b, c, d, kisiler };
}

let sira = 0;
function girdi(ek: Partial<HanOlayGirdisi> & Pick<HanOlayGirdisi, "tur" | "kim">): HanOlayGirdisi {
  return { anahtar: `masa:develi:han:1#${++sira}`, masaNo: 1, katilim: [], ...ek };
}

const akce = (k: Kasaba) => [...k.kar.values()].reduce((t, x) => t + x.pa, 0);

test("H5 yemin: mühürlü (ky=2) ve kümesi dışından tanıkla mertlik +1; tanıklık olayı yalnız katılımcıya, şart yok", () => {
  const { k, a, b, kisiler } = kur();
  a.ky = 2;
  const once = a.nm[MERT] ?? 0;
  const para = akce(k);
  const g = girdi({ tur: "yemin", kim: a.h, katilim: [a.h, b.h] });
  const r = hanOlayiUygula(k, g, kisiler, k.ay);
  assert.ok(r.ok);
  assert.equal((a.nm[MERT] ?? 0) - once, HAN_YEMIN_NAM);
  assert.deepEqual(r.deger.etki.nam, { mertlik: HAN_YEMIN_NAM });
  assert.deepEqual(r.deger.olaylar.map((o) => [o.g, o.k, o.p.muhur, o.p.masa]), [
    [a.o, "olay.han.yemin", 1, 1],
    [b.o, "olay.han.yemin", 1, 1],
  ]);
  assert.equal(JSON.stringify(r.deger.olaylar).includes("sart"), false);
  assert.ok(r.deger.etki.soylenti.includes("hanYemin"), "handaki/hanedeki NPC'ler duyar");
  assert.equal(akce(k), para, "akçe üretilmez");
  assert.ok(hanOlayiIslendiMi(k, g.anahtar), "anahtar işlendi olarak kalır (yeniden teslim süzgeci)");
  // Aynı ay aynı çift (hedefsiz) ikinci yemin nam vermez.
  const r2 = hanOlayiUygula(k, girdi({ tur: "yemin", kim: a.h, katilim: [a.h, b.h] }), kisiler, k.ay);
  assert.ok(r2.ok);
  assert.equal(r2.deger.etki.engel, "ayda_bir");
  assert.equal((a.nm[MERT] ?? 0) - once, HAN_YEMIN_NAM);
});

test("H5 yemin: mühürsüz (ky≠2) tanıklık ve söylenti üretir ama nam vermez; muhur: 0", () => {
  const { k, a, b, kisiler } = kur();
  a.ky = 1;
  const once = a.nm[MERT] ?? 0;
  const r = hanOlayiUygula(k, girdi({ tur: "yemin", kim: a.h, hedef: b.h, katilim: [a.h, b.h] }), kisiler, k.ay);
  assert.ok(r.ok);
  assert.equal(r.deger.etki.engel, "muhur_yok");
  assert.equal(a.nm[MERT] ?? 0, once);
  assert.deepEqual(r.deger.olaylar.map((o) => [o.k, o.p.muhur]), [["olay.han.yeminKisiye", 0], ["olay.han.yeminKisiye", 0]]);
  assert.ok(r.deger.etki.soylenti.includes("hanYemin"));
});

test("H5 yemin: masada kümesi dışından tanık yoksa nam yok", () => {
  const { k, a, d, kisiler } = kur();
  a.ky = 2;
  const r = hanOlayiUygula(k, girdi({ tur: "yemin", kim: a.h, katilim: [a.h, d.h] }), kisiler, k.ay);
  assert.ok(r.ok);
  assert.equal(r.deger.etki.engel, "tanik_yok");
  assert.equal(r.deger.etki.nam, undefined);
});

test("H5 kabul: iki tarafa tanıdık izi ve olumlu söylenti, çift başına ayda bir; hane içi etki yok", () => {
  const { k, a, b, d, kisiler } = kur();
  const g = girdi({ tur: "kabul", teklifTur: "ittifak", kim: b.h, hedef: a.h, katilim: [a.h, b.h] });
  const r = hanOlayiUygula(k, g, kisiler, k.ay);
  assert.ok(r.ok);
  assert.deepEqual([a.tn[b.o], b.tn[a.o]], ["tanidik", "tanidik"]);
  assert.equal(r.deger.etki.iz, true);
  assert.equal(r.deger.olaylar[0]?.k, "olay.han.kabul.ittifak");
  const sy = toplumAl(k).sy.filter((s) => s.t === "hanAnlasma");
  assert.deepEqual(sy.map((s) => s.k).sort(), [a.o, b.o].sort(), "iki yönlü söylenti");
  const r2 = hanOlayiUygula(k, girdi({ tur: "kabul", teklifTur: "sozlesme", kim: a.h, hedef: b.h, katilim: [a.h, b.h] }), kisiler, k.ay);
  assert.ok(r2.ok);
  assert.equal(r2.deger.etki.engel, "ayda_bir");
  assert.equal(r2.deger.olaylar[0]?.k, "olay.han.kabul.sozlesme");
  // Hane içi: tanıklık var, etki yok.
  const r3 = hanOlayiUygula(k, girdi({ tur: "kabul", teklifTur: "sozlesme", kim: d.h, hedef: a.h, katilim: [a.h, d.h] }), kisiler, k.ay);
  assert.ok(r3.ok);
  assert.equal(r3.deger.etki.engel, "ayni_kume");
  assert.equal(r3.deger.olaylar.length, 2);
  assert.equal(a.tn[d.o], undefined);
  assert.equal(toplumAl(k).sy.filter((s) => s.t === "hanAnlasma").length, 2);
});

test("H5 ihbar: hedef hakkında olumsuz söylenti, ihbar edene kazanç yok; hedef yalanlayabilir; masada olmayan olay görmez", () => {
  const { k, a, b, c, kisiler } = kur();
  const nm = [...a.nm];
  const para = akce(k);
  const r = hanOlayiUygula(k, girdi({ tur: "ihbar", kim: a.h, hedef: c.h, katilim: [a.h, b.h] }), kisiler, k.ay);
  assert.ok(r.ok);
  assert.deepEqual(r.deger.olaylar.map((o) => o.g), [a.o, b.o], "yalnız oturanlar tanık");
  assert.equal(r.deger.olaylar[0]?.k, "olay.han.ihbar");
  assert.deepEqual(a.nm, nm, "ihbar edene nam yok");
  assert.equal(akce(k), para, "ihbar edene akçe yok");
  const gorunum = soylentiGorunumu(k, c, "tr");
  const ihbar = gorunum.find((s) => s.tur === "hanIhbar");
  assert.ok(ihbar, "hedef söylentiyi görür");
  assert.equal(ihbar.k, "soylenti.han.ihbar");
  assert.ok(ihbar.etki < 0);
  const y = yalanla(k, c, ihbar.id);
  assert.ok(y.ok, "mevcut yalanla yolu");
});

test("H5 meydan okuma ve teklifler yalnız tanıklık; başka yerleşimden hedefte olay yok", () => {
  const { k, a, b, kisiler } = kur();
  const syOnce = k.tp?.sy.length ?? 0;
  for (const tur of ["meydanOku", "sozlesme", "ittifak"] as const) {
    const r = hanOlayiUygula(k, girdi({ tur, kim: a.h, hedef: b.h, katilim: [a.h, b.h] }), kisiler, k.ay);
    assert.ok(r.ok);
    assert.equal(r.deger.olaylar.length, 2);
    assert.equal(r.deger.olaylar[0]?.k, `olay.han.${tur}`);
    assert.deepEqual(r.deger.etki.soylenti, []);
  }
  assert.equal(k.tp?.sy.length ?? 0, syOnce);
  const yok = hanOlayiUygula(k, girdi({ tur: "ihbar", kim: a.h, hedef: "baska-yerlesim", katilim: [a.h] }), kisiler, k.ay);
  assert.ok(yok.ok);
  assert.deepEqual([yok.deger.olaylar.length, yok.deger.etki.engel], [0, "hedef_yok"]);
});

test("H5 iç ileti doğrulaması: olay sahibi gönderen, anahtar masa+no, masa bu yerleşimde", () => {
  const olay = { no: 3, masa: "masa:develi:han:2", tur: "ihbar", kim: "hesap-1", hedef: "hesap-3", zaman: 1, katilim: ["hesap-1"] };
  const iyi = hanOlayiCoz({ anahtar: "masa:develi:han:2#3", olay }, "hesap-1", "develi");
  assert.ok(iyi.ok);
  assert.equal(iyi.deger.masaNo, 2);
  const kotu = (g: unknown, h = "hesap-1", y = "develi") => {
    const r = hanOlayiCoz(g, h, y);
    return r.ok ? "" : r.hata;
  };
  assert.equal(kotu({ anahtar: "masa:develi:han:2#3", olay }, "hesap-2"), "yetki_yok");
  assert.equal(kotu({ anahtar: "masa:develi:han:2#4", olay }), "gecersiz_istek");
  assert.equal(kotu({ anahtar: "masa:develi:han:2#3", olay }, "hesap-1", "kizilca"), "gecersiz_istek");
  assert.equal(kotu({ anahtar: "masa:develi:han:2#3", olay: { ...olay, tur: "kabul" } }), "gecersiz_istek", "kabulde teklif türü şart");
});

test("H1 tanıdıklar: dostlar ve aynı hanedeki oyuncular (kendisi hariç)", () => {
  const { k, a, b, c, d } = kur();
  toplumAl(k).ob.push({ a: a.o < b.o ? a.o : b.o, b: a.o < b.o ? b.o : a.o, d: "dost", ay: k.ay });
  toplumAl(k).ob.push({ a: a.o < c.o ? a.o : c.o, b: a.o < c.o ? c.o : a.o, d: "istek", g: a.o, ay: k.ay });
  assert.deepEqual(hanTanidikKimlikleri(k, a.o, a.e).sort(), [b.o, d.o].sort());
});
