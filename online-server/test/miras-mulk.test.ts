// D3: ölümde mülk devri — tapu bölünmeden vârise geçer, IsletmeDO'ya sahip değişimi tek kez gider, akçe hareketi yok.
import test from "node:test";
import assert from "node:assert/strict";
import "../src/mulk/miras.ts";
import { mulkDefteri } from "../src/mulk/tapu.ts";
import { CIKIS_EN_COK } from "../src/mulk/transfer.ts";
import { devirHesapla, devirUygula } from "../src/yerlesim/devir.ts";
import { oyuncuOlumu } from "../src/yerlesim/yaslilik.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";
import { cocukEkle, npcIleEvlendir, toplamAkce } from "./hanedan-yardimci.ts";

function kur() {
  const k = testKasabasi("develi", 0);
  const kar = oyuncuEkle(k, 1, k.ay - 70 * 12);
  npcIleEvlendir(k, kar);
  cocukEkle(k, kar, 30, 0);
  kar.pa = 100;
  const md = mulkDefteri(k);
  md.ts = 4;
  md.t["develi.han.1"] = { s: "o1", h: kar.h, ts: 3, a: 2, f: 500, y: { as: 7, ts: 3 } as never };
  md.t["develi.dukkan.1"] = { s: "o1", h: kar.h, ts: 4, a: 3, f: 300 };
  md.t["develi.atolye.1"] = { s: "o9", h: "baska", ts: 2, a: 1, f: 200 };
  return { k, kar, md };
}

test("miras: ölünün tapuları planda görünür ve vârise geçer; başkasının tapusu ve akçe toplamı değişmez", () => {
  const { k, kar, md } = kur();
  oyuncuOlumu(k, kar, k.ay);
  const p = devirHesapla(k, "o1", undefined, k.ay);
  assert.ok(p.ok, JSON.stringify(p));
  assert.deepEqual(p.deger.kalemler.find((x) => x.tur === "mulk"), { tur: "mulk", isletmeler: ["develi.dukkan.1", "develi.han.1"] });
  const once = toplamAkce(k);
  const r = devirUygula(k, p.deger, k.ay);
  assert.ok(r.ok, JSON.stringify(r));
  const yeni = r.deger.kar.o;
  assert.notEqual(yeni, "o1");
  assert.equal(md.t["develi.han.1"]!.s, yeni);
  assert.equal(md.t["develi.dukkan.1"]!.s, yeni);
  assert.equal(md.t["develi.han.1"]!.f, 500, "edinim bedeli korunur");
  assert.equal(md.t["develi.han.1"]!.y?.ts, md.t["develi.han.1"]!.ts, "yansı sürümü tapu sürümüyle aynı");
  assert.equal(md.t["develi.atolye.1"]!.s, "o9");
  assert.equal(md.ts, 6);
  const giden = md.cik.k.filter((x) => x.t === "sahip");
  assert.deepEqual(giden.map((x) => [x.h, (x.y.sahip as { o: string }).o, x.a]).sort(), [["develi.dukkan.1", yeni, 0], ["develi.han.1", yeni, 0]]);
  assert.equal(toplamAkce(k), once, "mülk devri akçe üretmez ve yakmaz");
});

test("miras: çıkış kutusunda yer yoksa devir geçici olarak bekletilir", () => {
  const { k, kar, md } = kur();
  oyuncuOlumu(k, kar, k.ay);
  for (let i = 0; i < CIKIS_EN_COK - 1; i++) md.cik.k.push({ i: `dolu-${i}`, t: "kasaya", h: "x", a: 0, y: {}, b: 0, d: 0, s: 0 });
  assert.deepEqual(devirHesapla(k, "o1", undefined, k.ay), { ok: false, hata: "transfer_bekliyor" });
  md.cik.k.splice(0, 5);
  assert.ok(devirHesapla(k, "o1", undefined, k.ay).ok);
});
