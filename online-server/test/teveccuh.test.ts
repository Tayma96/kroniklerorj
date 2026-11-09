// Teveccüh (§6.2, Berkay 9 Kasım): hediyenin tutarıyla artar (veren başına tavan yok), aynı haneden akçe armağanı
// sayılmaz, Debdebe armağanı aynı haneden de sayılır, sönme çok yavaştır, NPC bakışında görünür kalemdir.
import test from "node:test";
import assert from "node:assert/strict";
import { gorus } from "../src/yerlesim/gorus.ts";
import { teklifCevap, teklifOlustur, vitrinGorunumu, vitrinSec } from "../src/yerlesim/teklif.ts";
import {
  TEVECCUH_KADEMELERI,
  teveccuhEkle,
  teveccuhEtkisi,
  teveccuhGorunumu,
  teveccuhKademesi,
  teveccuhPuani,
} from "../src/yerlesim/teveccuh.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

function kur() {
  const k = testKasabasi("develi", 200);
  const alan = oyuncuEkle(k, 1, k.ay - 160);
  const zengin = oyuncuEkle(k, 2, k.ay - 160);
  if (zengin.e === alan.e) zengin.e = alan.e + 1000;
  return { k, alan, zengin };
}

test("zengin verenin büyük armağanı kademeyi belirgin artırır (veren başına tavan yok)", () => {
  const { k, alan, zengin } = kur();
  assert.equal(teveccuhKademesi(alan, k.ay), 0);
  assert.equal(teveccuhEkle(alan, zengin, "armagan", k.ay, 5), 5);
  const az = teveccuhKademesi(alan, k.ay);
  teveccuhEkle(alan, zengin, "armagan", k.ay, 200);
  const cok = teveccuhKademesi(alan, k.ay);
  assert.ok(cok >= az + 2, `${az} → ${cok}`);
  assert.equal(teveccuhGorunumu(alan, k.ay).verenSayisi, 1);
  assert.ok(teveccuhGorunumu(alan, k.ay).etkiler.length > 0, "etkiler görünür");
});

test("aynı haneden akçe armağanı sayılmaz; Debdebe armağanı aynı haneden de sayılır; kendine yok", () => {
  const { k, alan } = kur();
  const kardes = oyuncuEkle(k, 3, k.ay - 160);
  kardes.e = alan.e;
  assert.equal(teveccuhEkle(alan, kardes, "armagan", k.ay, 100), 0);
  assert.equal(teveccuhEkle(alan, kardes, "ikram", k.ay, 100), 0);
  assert.equal(teveccuhEkle(alan, alan, "debdebe", k.ay, 100), 0);
  assert.equal(teveccuhEkle(alan, kardes, "debdebe", k.ay, 100), 100);
  assert.equal(teveccuhEkle(alan, "dis-kaynak", "debdebe", k.ay, 30), 30);
  assert.equal(teveccuhEkle(alan, "dis-kaynak", "armagan", k.ay, 30), 0, "kimliği bilinmeyen akçe armağanı sayılmaz");
});

test("sönme çok yavaş ve tembel (ay damgalı)", () => {
  const { k, alan, zengin } = kur();
  teveccuhEkle(alan, zengin, "armagan", k.ay, TEVECCUH_KADEMELERI[3]! * 1.05);
  assert.equal(teveccuhKademesi(alan, k.ay), 3);
  assert.equal(teveccuhKademesi(alan, k.ay + 6), 3, "6 ay sonra kademe korunur");
  const yil = teveccuhPuani(alan, k.ay + 12);
  assert.ok(yil > TEVECCUH_KADEMELERI[3]! * 0.98 * 0.95 && yil < TEVECCUH_KADEMELERI[3]! * 1.05);
  assert.equal(alan.tv!.a, k.ay, "okuma kaydı değiştirmez");
});

test("teveccüh NPC bakışında görünür kalemdir (tavanlı); armağan kabulü teveccüh ve vitrin yazar", () => {
  const { k, alan, zengin } = kur();
  const ili = k.ili.get(alan.o)!;
  const npc = k.npc.find((n) => n.e !== alan.e)!;
  assert.equal(gorus(k, npc, alan, ili, k.ay).kalemler.find((x) => x.k === "gorus.teveccuh"), undefined);
  teveccuhEkle(alan, zengin, "debdebe", k.ay, 5000);
  const kalem = gorus(k, npc, alan, ili, k.ay).kalemler.find((x) => x.k === "gorus.teveccuh");
  assert.equal(kalem?.d, teveccuhEtkisi(5, "ilkIzlenim"));
  assert.ok(teveccuhEtkisi(5, "ilkIzlenim") <= 5);

  // Teklif yoluyla armağan: kabulde teveccüh ve vitrin; sahibi vitrini seçer.
  const k2 = testKasabasi("develi", 200);
  const a = oyuncuEkle(k2, 1, k2.ay - 160);
  const b = oyuncuEkle(k2, 2, k2.ay - 160);
  if (a.e === b.e) b.e = a.e + 1000;
  a.ev = { alet: 1 };
  const t = teklifOlustur(k2, a, b, { tur: "hediye", mal: "alet", adet: 1 }, k2.ay);
  assert.ok(t.ok, JSON.stringify(t));
  assert.ok(teklifCevap(k2, b, `t${t.deger.teklif.i}`, "kabul", {}, k2.ay).ok);
  assert.equal(teveccuhPuani(b, k2.ay), 14, "alet değeri (taban 14) kadar");
  assert.deepEqual(b.ev, { alet: 1 });
  assert.equal(vitrinGorunumu(b)[0]?.mal, "alet");
  assert.deepEqual(vitrinSec(b, ["t999"]), { ok: false, hata: "teklif_yok" });
  assert.ok(vitrinSec(b, [`t${t.deger.teklif.i}`]).ok);
  assert.equal(vitrinGorunumu(b).length, 1);
});
