import test from "node:test";
import assert from "node:assert/strict";
import { ISTEK_IZ_EN_COK, ISTEK_PENCERESI_MS, IST_EN_COK, istekBul, istekYaz } from "../src/yerlesim/istek-defteri.ts";
import type { Karakter } from "../src/yerlesim/tipler.ts";

const T0 = Date.UTC(2026, 10, 13, 8);
const kar = (): Pick<Karakter, "ist" | "isk"> => ({ ist: [] });

test("parametreler: pencere en az 24 saat, iz üst sınırı 200", () => {
  assert.ok(ISTEK_PENCERESI_MS >= 24 * 60 * 60 * 1000);
  assert.equal(ISTEK_IZ_EN_COK, 200);
});

test("son yanıtlar aynen döner; 10'dan eski istekNo 24 saat boyunca tekrar sayılır", () => {
  const k = kar();
  for (let i = 0; i < 50; i++) istekYaz(k, `n${i}`, { i }, T0 + i * 1000);
  assert.deepEqual(istekBul(k, "n49"), { tur: "yanit", yanit: { i: 49 } });
  assert.equal(k.ist.length, IST_EN_COK);
  // Eskiden 11. istekten sonra unutulurdu; artık tekrar olarak reddedilir.
  assert.deepEqual(istekBul(k, "n0"), { tur: "eski" });
  assert.equal(istekBul(k, "yok"), undefined);
});

test("pencere dolunca iz düşer; üst sınır aşılınca en eski atılır", () => {
  const k = kar();
  istekYaz(k, "ilk", 1, T0);
  for (let i = 0; i < IST_EN_COK; i++) istekYaz(k, `a${i}`, i, T0 + 1);
  assert.deepEqual(istekBul(k, "ilk"), { tur: "eski" });
  istekYaz(k, "sonra", 0, T0 + ISTEK_PENCERESI_MS + 1);
  assert.equal(istekBul(k, "ilk"), undefined);

  const b = kar();
  for (let i = 0; i < ISTEK_IZ_EN_COK + IST_EN_COK + 30; i++) istekYaz(b, `b${i}`, i, T0 + i);
  assert.equal(b.isk?.length, ISTEK_IZ_EN_COK);
  assert.equal(istekBul(b, "b0"), undefined);
  assert.deepEqual(istekBul(b, "b30"), { tur: "eski" });
});

test("eski biçim (zamansız ikili) okunur ve bozulmaz", () => {
  const k = { ist: [["eski1", { a: 1 }], ["eski2", { a: 2 }]] } as Pick<Karakter, "ist" | "isk">;
  assert.deepEqual(istekBul(k, "eski1"), { tur: "yanit", yanit: { a: 1 } });
  for (let i = 0; i < IST_EN_COK; i++) istekYaz(k, `y${i}`, i, T0);
  assert.deepEqual(istekBul(k, "eski1"), { tur: "eski" });
  assert.deepEqual(istekBul(k, "y9"), { tur: "yanit", yanit: 9 });
});
