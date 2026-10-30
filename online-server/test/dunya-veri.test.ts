import test from "node:test";
import assert from "node:assert/strict";
import { BEYLIKLER, TUR_VARSAYILANLARI, YERLESIMLER, yerlesimBul } from "../src/dunya-veri.ts";

test("7 beylik; tek oyunculudaki 5 beylik aynı kimlik ve adla", () => {
  assert.equal(BEYLIKLER.length, 7);
  const adlar = new Map(BEYLIKLER.map((b) => [b.id, b.ad]));
  assert.equal(adlar.size, 7);
  assert.equal(adlar.get("demirhan"), "Demirhan Beyliği");
  assert.equal(adlar.get("yenisehir"), "Yenişehir Sancağı");
  assert.equal(adlar.get("gumushisar"), "Gümüşhisar Beyliği");
  assert.equal(adlar.get("aksehir"), "Akşehir Sancağı");
  assert.equal(adlar.get("karahisar"), "Karahisar Beyliği");
});

test("her beylikte 1 şehir, 2-3 kasaba, 4-6 köy; tür varsayılanları", () => {
  for (const b of BEYLIKLER) {
    const say = (tur: string) => b.yerlesimler.filter((y) => y.tur === tur).length;
    assert.equal(say("sehir"), 1, b.id);
    assert.ok(say("kasaba") >= 2 && say("kasaba") <= 3, b.id);
    assert.ok(say("koy") >= 4 && say("koy") <= 6, b.id);
    for (const y of b.yerlesimler) {
      assert.equal(y.beylik, b.id);
      assert.equal(y.evKapasite, TUR_VARSAYILANLARI[y.tur].evKapasite);
      assert.equal(y.npc, TUR_VARSAYILANLARI[y.tur].npc);
    }
  }
  assert.deepEqual(TUR_VARSAYILANLARI, {
    koy: { evKapasite: 25, npc: 80 },
    kasaba: { evKapasite: 60, npc: 200 },
    sehir: { evKapasite: 150, npc: 400 },
  });
});

test("kimlikler eşsiz ve ASCII, adlar dolu ve eşsiz", () => {
  const idler = new Set(YERLESIMLER.map((y) => y.id));
  assert.equal(idler.size, YERLESIMLER.length);
  assert.equal(new Set(YERLESIMLER.map((y) => y.ad)).size, YERLESIMLER.length);
  for (const id of [...idler, ...BEYLIKLER.map((b) => b.id)]) assert.match(id, /^[a-z][a-z0-9_]*$/);
  for (const y of YERLESIMLER) assert.ok(y.ad.trim().length >= 2);
  assert.equal(yerlesimBul("misis")?.beylik, "cukurova");
  assert.equal(yerlesimBul("yok"), undefined);
});
