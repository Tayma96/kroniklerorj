// Beceri ağacı v2 veri bütünlüğü: 14 ağaç × 14 düğüm, düzen, bedel/süre ölçeği, ön koşullar, döngü yok, kanca.
import test from "node:test";
import assert from "node:assert/strict";
import { AGACLAR, ETKILER, IS_KILIDI, TARIF_KILIDI, TUM_DUGUMLER, UNVANLAR, beceriDugumu, gocKarsiligi, ESKI_DALLAR } from "../src/icerik/agaclar/index.ts";
import { MALLAR } from "../src/icerik/mallar.ts";
import { MESLEK_IDLERI, meslekBul } from "../src/icerik/meslekler.ts";
import { TARIFLER } from "../src/icerik/tarifler.ts";
import { kancaMi } from "../src/yerlesim/beceri.ts";
import { PUAN_TAVANI } from "../src/yerlesim/meslek.ts";
import { TEMEL_ISLER } from "../src/yerlesim/temel-is.ts";

const SEVIYE = { cirak: 3, kalfa: 3, kalfa2: 2, usta: 2, pir: 1, gizli: 1 } as const;
const SAYI = { cirak: 3, kalfa: 3, kalfa2: 3, usta: 3, pir: 1, gizli: 1 } as const;

test("14 ağaç, her biri 14 düğüm; bölüm düzeni, seviye sayıları, sütunlar", () => {
  assert.equal(Object.keys(AGACLAR).length, 14);
  for (const m of MESLEK_IDLERI) {
    const d = AGACLAR[m].dugumler;
    assert.equal(d.length, 14, m);
    for (const [b, n] of Object.entries(SAYI)) {
      const bolum = d.filter((x) => x.bolum === b);
      assert.equal(bolum.length, n, `${m} ${b}`);
      for (const x of bolum) assert.equal(x.seviye, SEVIYE[b as keyof typeof SEVIYE], x.id);
      if (n === 3) assert.deepEqual(bolum.map((x) => x.sutun), [0, 1, 2], `${m} ${b}`);
    }
    for (const x of d) {
      assert.equal(x.meslek, m);
      assert.equal(x.id, `${m}.${x.anahtar}`);
      assert.equal(x.ad, `onl.ba.${x.id}`);
      assert.ok(/^[a-zA-Z]+$/.test(x.ikon), x.id);
      assert.equal(x.seviyeler.length, x.seviye);
      for (const [n, s] of x.seviyeler.entries()) {
        assert.ok(s.etkiler.length > 0, `${x.id} s${n + 1} somut etki`);
        assert.equal(s.metin, `onl.ba.${x.id}.s${n + 1}`);
      }
    }
    assert.equal(new Set(d.map((x) => x.ikon)).size, 14, `${m}: ağaç içinde ikonlar benzersiz`);
    assert.ok(d.find((x) => x.bolum === "gizli")?.gizli, `${m} gizli koşulu`);
  }
  assert.equal(new Set(TUM_DUGUMLER.map((x) => x.id)).size, 14 * 14);
});

test("bedel ve süre ölçeği (spec §3–4): Çırak 1p 15/30/45 dk … Pir 7p 12 sa; ağaç toplamı tavanı aşar", () => {
  const d = AGACLAR.demirci.dugumler;
  const b = (id: string) => beceriDugumu(`demirci.${id}`)!.seviyeler.map((s) => [s.bedel, s.sureDk]);
  assert.deepEqual(b("aletcilik"), [[1, 15], [1, 30], [1, 45]]);
  assert.deepEqual(b("tarimAletleri"), [[2, 60], [2, 90], [2, 120]]);
  assert.deepEqual(b("gelismisAletler"), [[3, 150], [3, 180]]);
  assert.deepEqual(b("mekanizmaUstaligi"), [[5, 300], [5, 360]]);
  assert.deepEqual(b("saheserUstaligi"), [[7, 720]]);
  const toplam = (dl: typeof d) => dl.filter((x) => x.bolum !== "gizli").reduce((a, x) => a + x.seviyeler.reduce((y, s) => y + s.bedel, 0), 0);
  assert.equal(toplam(d), 82, "Demirci ağacı ~82 puan");
  for (const m of MESLEK_IDLERI) assert.ok(toplam(AGACLAR[m].dugumler) > PUAN_TAVANI, m);
});

test("ön koşullar geçerli, seviyeleri tutarlı, kademe şartı bölümle uyumlu, döngü yok", () => {
  for (const x of TUM_DUGUMLER) {
    for (const o of x.onKosul) {
      const h = beceriDugumu(o.dugum);
      assert.ok(h, `${x.id} → ${o.dugum}`);
      assert.equal(h.meslek, x.meslek);
      assert.ok(o.seviye >= 1 && o.seviye <= h.seviye, `${x.id} → ${o.dugum} ${o.seviye}`);
      assert.ok(h.sira < x.sira || x.bolum === "gizli", `${x.id} yukarıdan beslenir`);
    }
    if (x.bolum === "cirak") assert.deepEqual(x.onKosul, []);
    else assert.ok(x.onKosul.length > 0, x.id);
    assert.equal(x.kademeSarti, x.kademe);
  }
  // Döngü yok (DFS).
  const durum = new Map<string, 1 | 2>();
  const gez = (id: string): void => {
    assert.notEqual(durum.get(id), 1, `döngü: ${id}`);
    if (durum.get(id) === 2) return;
    durum.set(id, 1);
    for (const o of beceriDugumu(id)!.onKosul) gez(o.dugum);
    durum.set(id, 2);
  };
  for (const x of TUM_DUGUMLER) gez(x.id);
  // Demirci §8: Silah Dövme ← Temel Dövme 1 + Aletçilik 3; Pir ← herhangi bir usta düğümü 2/2.
  assert.deepEqual(beceriDugumu("demirci.silahDovme")!.onKosul, [
    { dugum: "demirci.temelDovme", seviye: 1 },
    { dugum: "demirci.aletcilik", seviye: 3 },
  ]);
  const pir = beceriDugumu("demirci.saheserUstaligi")!;
  assert.equal(pir.onKosulBiri, true);
  assert.deepEqual(pir.onKosul.map((o) => o.seviye), [2, 2, 2]);
});

test("bağlı etkiler gerçek sisteme işaret eder; her tarif ve usta iş bir düğümle açılır; sinerjiler geçerli", () => {
  for (const id of Object.keys(TARIFLER)) assert.ok(TARIF_KILIDI[id], `tarif ${id}`);
  for (const [id, is] of Object.entries(TEMEL_ISLER)) if ("usta" in is) assert.ok(IS_KILIDI[id], `usta iş ${id}`);
  for (const { dugum, etki } of ETKILER) {
    if (etki.tur === "sinerji") {
      const h = beceriDugumu(etki.dugum);
      assert.ok(h && h.meslek === etki.meslek && etki.seviye <= h.seviye, `${dugum} sinerji ${etki.dugum}`);
      assert.notEqual(h.meslek, beceriDugumu(dugum)!.meslek);
    }
    if (!kancaMi(etki) && etki.tur === "arac") assert.ok(Object.hasOwn(MALLAR, etki.mal));
  }
  const bagli = ETKILER.filter((e) => !kancaMi(e.etki)).map((e) => e.dugum.split(".")[0]);
  for (const m of ["ciftci", "oduncu", "demirci"]) assert.ok(bagli.filter((x) => x === m).length >= 5, `${m} bağlı etkiler`);
});

test("göç: 168 eski düğümün hepsi aynı meslekte geçerli karşılığa çevrilir", () => {
  let n = 0;
  for (const m of MESLEK_IDLERI) {
    for (const dal of ESKI_DALLAR[m]) {
      for (let kd = 0; kd <= 3; kd++) {
        const y = gocKarsiligi(`${m}.${dal}.${kd}`);
        assert.ok(y && beceriDugumu(y.dugum)?.meslek === m, `${m}.${dal}.${kd}`);
        n++;
      }
    }
  }
  assert.equal(n, 168);
  assert.equal(gocKarsiligi("demirci.kalem.0"), undefined);
  assert.equal(gocKarsiligi("yok.alet.0"), undefined);
});

test("unvanlar: en az demirci, çiftçi, tüccar; meslekler geçerli, kimlikler benzersiz", () => {
  for (const m of ["demirci", "ciftci", "tuccar"]) assert.ok(UNVANLAR.some((u) => u.meslek === m), m);
  for (const u of UNVANLAR) assert.ok(meslekBul(u.meslek) && u.esik > 0, u.id);
  assert.equal(new Set(UNVANLAR.map((u) => u.id)).size, UNVANLAR.length);
});

test("her meslekte tecrübe veren en az bir temel iş (usta işi değil) var", () => {
  for (const m of MESLEK_IDLERI) assert.ok(Object.values(TEMEL_ISLER).some((is) => is.meslek === m && !("usta" in is)), m);
});
