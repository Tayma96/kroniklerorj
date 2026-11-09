import test from "node:test";
import assert from "node:assert/strict";
import { MESLEKLER } from "../src/icerik/kisilik.ts";
import { MALLAR, MAL_IDLERI, malBul } from "../src/icerik/mallar.ts";
import { MESLEKLER_ONLINE, MESLEK_IDLERI, NPC_MESLEK_ESLEME, meslekBul } from "../src/icerik/meslekler.ts";

test("14 meslek, kimlikler benzersiz", () => {
  assert.equal(MESLEK_IDLERI.length, 14);
  assert.equal(new Set(MESLEK_IDLERI).size, 14);
  for (const id of MESLEK_IDLERI) assert.equal(MESLEKLER_ONLINE[id].id, id);
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

test("her malın üreticisi geçerli meslek", () => {
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
  assert.equal(malBul("constructor"), undefined);
});
