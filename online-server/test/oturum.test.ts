import test from "node:test";
import assert from "node:assert/strict";
import { OTURUM_SURESI_MS, oturumDogrula, oturumOlustur, sabitSurecliEsit } from "../src/oturum.ts";
import { b64urlKodla, jsonB64url } from "../src/b64.ts";

const GIZLI = "test-anahtari-".repeat(4);
const SIMDI = Date.UTC(2026, 10, 5, 10, 0, 0);

test("imzala ve doğrula; süre 30 gün", async () => {
  const b = await oturumOlustur("hesap-1", GIZLI, SIMDI);
  const s = await oturumDogrula(b, GIZLI, SIMDI + 1000);
  assert.deepEqual(s, { ok: true, hesapId: "hesap-1", son: SIMDI + OTURUM_SURESI_MS });
  assert.equal(OTURUM_SURESI_MS, 30 * 24 * 60 * 60 * 1000);
});

test("süresi dolan belirteç", async () => {
  const b = await oturumOlustur("hesap-1", GIZLI, SIMDI);
  assert.deepEqual(await oturumDogrula(b, GIZLI, SIMDI + OTURUM_SURESI_MS), { ok: false, hata: "oturum_suresi_doldu" });
  assert.equal((await oturumDogrula(b, GIZLI, SIMDI + OTURUM_SURESI_MS - 1)).ok, true);
});

test("oynanmış yük, imza ya da yanlış anahtar reddedilir", async () => {
  const b = await oturumOlustur("hesap-1", GIZLI, SIMDI);
  const [yuk, imza] = b.split(".") as [string, string];
  const sahteYuk = jsonB64url({ h: "hesap-2", s: SIMDI + OTURUM_SURESI_MS });
  const gecersiz = { ok: false, hata: "oturum_gecersiz" };
  assert.deepEqual(await oturumDogrula(`${sahteYuk}.${imza}`, GIZLI, SIMDI), gecersiz);
  const bozukImza = (imza[0] === "A" ? "B" : "A") + imza.slice(1);
  assert.deepEqual(await oturumDogrula(`${yuk}.${bozukImza}`, GIZLI, SIMDI), gecersiz);
  assert.deepEqual(await oturumDogrula(b, "baska-anahtar-".repeat(4), SIMDI), gecersiz);
  for (const cop of ["", "abc", `${yuk}.`, `${yuk}.${imza}.x`, `${yuk}.${b64urlKodla(new Uint8Array(31))}`]) {
    assert.deepEqual(await oturumDogrula(cop, GIZLI, SIMDI), gecersiz, cop);
  }
});

test("sabit süreli karşılaştırma", () => {
  assert.equal(sabitSurecliEsit(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3])), true);
  assert.equal(sabitSurecliEsit(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4])), false);
  assert.equal(sabitSurecliEsit(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3])), false);
});
