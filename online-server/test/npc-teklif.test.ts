// NPC teklifleri (Faz 3a, saf): oyuncu başına aynı anda tek, 3 ay cevapsız kalınca düşer, aralık; NPC borcu
// vadede aynen döner; olağan düzen NPC borç isteğine yokken cevap verir.
import test from "node:test";
import assert from "node:assert/strict";
import { duzenGuncelle } from "../src/yerlesim/duzen.ts";
import { iliskiAl } from "../src/yerlesim/eylem.ts";
import { NPC_BORC_VADE, NPC_TEKLIF_ARALIK, NPC_TEKLIF_SURE, npcTeklifUret } from "../src/yerlesim/npc-teklif.ts";
import { teklifCevap, teklifDonumu } from "../src/yerlesim/teklif.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

function kur(): { k: Kasaba; kar: Karakter } {
  const k = testKasabasi("develi", 200);
  const kar = oyuncuEkle(k, 1, k.ay - 13 * 12 - 2);
  const ili = k.ili.get(kar.o)!;
  for (const n of k.npc.slice(0, 20)) iliskiAl(ili, n.i).t = 20;
  return { k, kar };
}

function ay(k: Kasaba): void {
  k.ay += 1;
  teklifDonumu(k, k.ay);
  npcTeklifUret(k, k.ay);
}

const acikNpc = (k: Kasaba, o: string) => (k.tp?.tk ?? []).filter((t) => t.a === o && t.d === "acik" && t.g.startsWith("n"));

test("NPC teklifi: aynı anda tek; cevapsız 3 ay sonra cezasız düşer; ardından aralık kadar yeni teklif gelmez", () => {
  const { k, kar } = kur();
  let ilk;
  for (let i = 0; i < 60 && !ilk; i++) {
    ay(k);
    assert.ok(acikNpc(k, kar.o).length <= 1);
    ilk = acikNpc(k, kar.o)[0];
  }
  assert.ok(ilk, "60 ayda en az bir NPC teklifi");
  const acilis = ilk.ac;
  const para = kar.pa;
  while (k.ay < acilis + NPC_TEKLIF_SURE) {
    ay(k);
    if (k.ay <= ilk.sa) assert.equal(acikNpc(k, kar.o).length, 1, "açıkken ikincisi gelmez");
  }
  assert.equal(ilk.d, "dustu");
  assert.equal(kar.pa, para, "ceza yok");
  for (let i = 1; i < NPC_TEKLIF_ARALIK; i++) {
    ay(k);
    assert.equal(acikNpc(k, kar.o).length, 0, "aralık");
  }
});

test("NPC borç isteği: kabulde akçe NPC'ye geçer, vadede aynen döner; düzen 'kabul' ise yokken uygulanır", () => {
  const { k, kar } = kur();
  kar.pa = 50;
  assert.ok(duzenGuncelle(kar, { borcCevap: "kabul", borcEnCok: 10 }).ok);
  let borc;
  for (let i = 0; i < 200 && !borc; i++) {
    ay(k);
    const t = acikNpc(k, kar.o)[0];
    if (t && t.t !== "npcBorc") assert.ok(teklifCevap(k, kar, `t${t.i}`, "ret", {}, k.ay).ok);
    else if (t) borc = t;
  }
  assert.ok(borc, "NPC borç istedi");
  assert.equal(borc.v, "kabul");
  const tutar = borc.s.tu!;
  while (borc.d === "acik") ay(k);
  assert.equal(borc.d, "surer", "düzen yokken kabul etti");
  assert.equal(kar.pa, 50 - tutar);
  while (borc.d === "surer" && k.ay < (borc.vd ?? 0) + 1) ay(k);
  assert.ok(borc.vd! - borc.ka! === NPC_BORC_VADE);
  assert.equal(borc.d, "bitti");
  assert.ok(borc.sn === "odendi" || borc.sn === "oldu");
  if (borc.sn === "odendi") assert.equal(kar.pa, 50);
});
