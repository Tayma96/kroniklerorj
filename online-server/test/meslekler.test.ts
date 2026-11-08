import test from "node:test";
import assert from "node:assert/strict";
import { MESLEKLER } from "../src/icerik/kisilik.ts";
import { MALLAR, MAL_IDLERI, malBul } from "../src/icerik/mallar.ts";
import { MESLEKLER_ONLINE, MESLEK_IDLERI, NPC_MESLEK_ESLEME, dugumBul, meslekBul } from "../src/icerik/meslekler.ts";

test("14 meslek; her birinde 3 benzersiz dal ve 12 düğüm", () => {
  assert.equal(MESLEK_IDLERI.length, 14);
  for (const id of MESLEK_IDLERI) {
    const m = MESLEKLER_ONLINE[id];
    assert.equal(new Set(m.dallar).size, 3, id);
    assert.equal(m.dugumler.length, 12, id);
    for (const dal of m.dallar) assert.deepEqual(m.dugumler.filter((d) => d.dal === dal).map((d) => d.kd), [0, 1, 2, 3]);
  }
});

test("düğüm kimlikleri bütün sette benzersiz", () => {
  const hepsi = MESLEK_IDLERI.flatMap((id) => MESLEKLER_ONLINE[id].dugumler.map((d) => d.id));
  assert.equal(new Set(hepsi).size, hepsi.length);
});

test("zincir: her meslekte en az 2 müşteri ve 1 tedarikçi, hepsi geçerli (§14.4.2)", () => {
  for (const id of MESLEK_IDLERI) {
    const m = MESLEKLER_ONLINE[id];
    assert.ok(m.musteri.length >= 2, id);
    assert.ok(m.tedarik.length >= 1, id);
    for (const x of [...m.musteri, ...m.tedarik]) assert.ok(meslekBul(x), `${id} → ${x}`);
    assert.ok(!m.musteri.includes(id) && !m.tedarik.includes(id), id);
  }
});

test("düğümlerin istediği mallar tanımlı; her malın üreticisi geçerli meslek", () => {
  for (const id of MESLEK_IDLERI) for (const d of MESLEKLER_ONLINE[id].dugumler) for (const mal of d.ister ?? []) assert.ok(malBul(mal), d.id);
  for (const mal of MAL_IDLERI) assert.ok(meslekBul(MALLAR[mal].meslek), mal);
});

test("NPC meslek eşlemesi kisilik.ts'in bütün mesleklerini kapsar", () => {
  for (const ad of MESLEKLER) {
    assert.ok(Object.hasOwn(NPC_MESLEK_ESLEME, ad), ad);
    const m = NPC_MESLEK_ESLEME[ad];
    assert.ok(m === null || meslekBul(m), ad);
  }
});

test("bilinmeyen kimlikler undefined döner", () => {
  assert.equal(meslekBul("yok"), undefined);
  assert.equal(meslekBul(5), undefined);
  assert.equal(meslekBul("toString"), undefined);
  assert.equal(dugumBul(MESLEKLER_ONLINE.demirci, "ciftci.ekin.0"), undefined);
  assert.equal(malBul("constructor"), undefined);
});
