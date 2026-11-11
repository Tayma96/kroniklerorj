import test from "node:test";
import assert from "node:assert/strict";
import { ETKILER } from "../src/icerik/agaclar/index.ts";
import { MALLAR } from "../src/icerik/mallar.ts";
import { HIZMET_TARIFLERI, hizmetTarifiBul } from "../src/yerlesim/hizmet-tarif.ts";

test("E4.3 hizmet kataloğu: kimlikler tekil, girdiler mal dizininde ve beceri kapıları gerçek", () => {
  assert.equal(new Set(HIZMET_TARIFLERI.map((x) => x.id)).size, HIZMET_TARIFLERI.length);
  for (const h of HIZMET_TARIFLERI) {
    assert.equal(hizmetTarifiBul(h.id), h);
    for (const mal of Object.keys(h.girdi)) assert.ok(Object.hasOwn(MALLAR, mal), `${h.id}: ${mal}`);
    assert.ok(h.seviye >= 1 && h.seviye <= 3, h.id);
    assert.ok(h.takat > 0 && h.hazir.adet > 0 && h.hazir.gecerlilikAy > 0, h.id);
    assert.ok(ETKILER.some((x) => x.dugum === h.dugum && x.seviye === h.seviye && x.etki.tur === "hizmet" && x.etki.hizmet === h.id), h.id);
  }
  assert.equal(hizmetTarifiBul("olmayan"), undefined);
  assert.equal(hizmetTarifiBul({ id: "yaraBak" }), undefined);
});
