import test from "node:test";
import assert from "node:assert/strict";
import { loncaTablosu, oyuncuSayaci } from "../src/yerlesim/lonca.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

test("lonca tablosu: 14 satır; eski kayıt (ms yok) boş sayılır", () => {
  const k = testKasabasi();
  oyuncuEkle(k);
  const t = loncaTablosu(k);
  assert.equal(t.length, 14);
  assert.ok(t.every((x) => x.oyuncu === 0 && x.durum === "bos"));
  assert.ok(t.some((x) => x.npc > 0), "NPC'ler meslekleri doldurur");
});

test("iki demirci sakin dolu, bir çiftçi az", () => {
  const k = testKasabasi();
  oyuncuEkle(k, 1);
  oyuncuEkle(k, 2);
  oyuncuEkle(k, 3);
  k.sakin[0]!.ms = "demirci";
  k.sakin[1]!.ms = "demirci";
  k.sakin[2]!.ms = "ciftci";
  const t = loncaTablosu(k);
  assert.equal(t.find((x) => x.meslek === "demirci")?.durum, "dolu");
  assert.equal(t.find((x) => x.meslek === "ciftci")?.durum, "az");
  assert.equal(oyuncuSayaci(k)("demirci"), 2);
});
