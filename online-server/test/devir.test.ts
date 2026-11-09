// Faz 7d: vasiyet ve saf devir hesabı — korunum, eşit bölüşüm, husumet, alan alan eşitlik, tek kez uygulama.
import test from "node:test";
import assert from "node:assert/strict";
import { ATA_NAMI_ORANI, KUSME_YUKU, NAM_DEVIR_ORANI, devirHesapla, devirUygula, planKarmasi, type DevirKalemi } from "../src/yerlesim/devir.ts";
import { iliskiAl } from "../src/yerlesim/eylem.ts";
import { olduMu } from "../src/yerlesim/hanedan.ts";
import { meslekSec } from "../src/yerlesim/meslek.ts";
import { npcKimlik } from "../src/yerlesim/ortak.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { vasiyetDogrula } from "../src/yerlesim/vasiyet.ts";
import { oyuncuOlumu } from "../src/yerlesim/yaslilik.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";
import { cocukEkle, npcIleEvlendir, toplamAkce } from "./hanedan-yardimci.ts";

function ailesiyle(cocukYaslari: number[], pa = 101): { k: Kasaba; kar: Karakter; c: number[] } {
  const k = testKasabasi("develi", 0);
  const kar = oyuncuEkle(k, 1, k.ay - 70 * 12);
  npcIleEvlendir(k, kar);
  const c = cocukYaslari.map((y, i) => cocukEkle(k, kar, y, i).i);
  kar.pa = pa;
  return { k, kar, c };
}

const paylar = (kalemler: DevirKalemi[]) => kalemler.filter((x) => x.tur === "pay") as Extract<DevirKalemi, { tur: "pay" }>[];

test("eşit bölüşüm: 101 akçe → vergi 10, eş ve iki çocuk 30/30/31 (artık vârise); korunum", () => {
  const { k, kar, c } = ailesiyle([30, 25]);
  oyuncuOlumu(k, kar, k.ay);
  const p = devirHesapla(k, "o1", undefined, k.ay);
  assert.ok(p.ok, JSON.stringify(p));
  const plan = p.deger;
  assert.equal(plan.varis.id, npcKimlik(c[0]!), "en büyük çocuk");
  const v = plan.kalemler.find((x) => x.tur === "vergi");
  assert.deepEqual(v, { tur: "vergi", akce: 10 });
  const pay = paylar(plan.kalemler);
  assert.deepEqual(pay.map((x) => x.akce).sort(), [30, 30, 31]);
  assert.equal(pay.find((x) => x.kime === plan.varis.id)?.akce, 31);
  assert.equal(pay.reduce((t, x) => t + x.akce, 0) + 10, plan.tereke);
  const once = toplamAkce(k);
  const r = devirUygula(k, plan, k.ay);
  assert.ok(r.ok);
  assert.equal(toplamAkce(k), once, "miras para üretmez");
});

test("devirUygula planın öngördüğünü alan alan yazar; aynı plan ikinci kez uygulanmaz", () => {
  const { k, kar, c } = ailesiyle([30, 9]);
  kar.ev = { odun: 4, demir: 2 };
  kar.nm = [40, 20, 10, 0];
  assert.ok(meslekSec(kar, "demirci", k.ay).ok);
  const ili = k.ili.get("o1")!;
  const dost = k.npc.find((n) => !c.includes(n.i) && n.i !== Number(kar.hd!.es!.slice(1)))!;
  iliskiAl(ili, dost.i).t = 50;
  // Başka bir oyuncu ölüye düşman, bir başkası tanıdık işareti koymuş.
  const dusman = oyuncuEkle(k, 2, k.ay - 30 * 12);
  const tanidik = oyuncuEkle(k, 3, k.ay - 30 * 12);
  dusman.tn.o1 = "dusman";
  tanidik.tn.o1 = "tanidik";
  oyuncuOlumu(k, kar, k.ay);
  const plan = devirHesapla(k, "o1", undefined, k.ay);
  assert.ok(plan.ok);
  const sonra = devirHesapla(k, "o1", undefined, k.ay + 2);
  assert.ok(sonra.ok);
  assert.equal(planKarmasi(plan.deger), planKarmasi(sonra.deger), "plan aylar geçse de aynı (ölüm ayına göre)");
  const varisNpc = k.dizin.get(c[0]!)!;
  const kucuk = c[1]!;
  const r = devirUygula(k, plan.deger, k.ay);
  assert.ok(r.ok);
  const v = r.deger.kar;
  const pay = paylar(plan.deger.kalemler);
  assert.equal(v.pa, pay.find((x) => x.kime === plan.deger.varis.id)!.akce);
  assert.equal(k.hd!.em[String(kucuk)], pay.find((x) => x.kime === npcKimlik(kucuk))!.akce, "12 altı çocuğun payı emanette");
  assert.deepEqual(v.ev, { demir: 2, odun: 4 });
  assert.equal(kar.ev, undefined);
  assert.deepEqual(v.nm, [40, 20, 10, 0].map((x) => Math.floor(x * NAM_DEVIR_ORANI)));
  assert.equal(v.hd?.am, "demirci");
  assert.equal(v.ms, undefined, "ustalık geçmez");
  assert.deepEqual(k.ili.get(v.o)![dost.i]!.an, [["ata", Math.trunc(50 * ATA_NAMI_ORANI), k.ay]]);
  assert.equal(v.hd?.n, 2);
  assert.equal(v.hd?.h, "o1");
  assert.equal(v.h, "hesap-1");
  assert.equal(v.ad, plan.deger.varis.ad);
  // Husumet vârise geçer; ölüye bağlı işaret kalmaz; vâris NPC listeden çıkar.
  assert.equal(dusman.tn[v.o], "dusman");
  assert.equal(dusman.tn.o1, undefined);
  assert.equal(tanidik.tn.o1, undefined);
  assert.equal(k.dizin.has(varisNpc.i), false);
  assert.ok(!k.npc.some((n) => n.i === varisNpc.i));
  assert.equal(k.sakin.find((s) => s.h === "hesap-1")?.o, v.o);
  assert.ok(!k.sakin.some((s) => s.o === "o1"));
  assert.equal(kar.pa, 0);
  assert.equal(kar.hd?.dv, v.o);
  assert.ok(v.hd?.ak?.includes(kucuk), "küçük kardeş hanedan akrabası olarak taşınır");
  assert.deepEqual(v.hd?.at?.map((x) => x[0]), ["o1"]);
  // NPC eşin oyuncu işaretçisi ölümde temizlendi.
  assert.ok(!k.npc.some((n) => n.es === -1));
  assert.deepEqual(devirUygula(k, plan.deger, k.ay), { ok: false, hata: "devir_yok" });
});

test("vasiyet: alıcı yalnız eş/akraba/vakıf, oranlar tamsayı ve toplam 100; az pay alan evlat küser", () => {
  const { k, kar, c } = ailesiyle([30, 28, 26], 1000);
  const yabanci = k.npc.find((n) => !c.includes(n.i) && n.e !== kar.e)!;
  const dogrula = (v: unknown) => vasiyetDogrula(k, kar, v);
  assert.equal(dogrula({ paylar: [{ kime: npcKimlik(yabanci.i), oran: 100 }] }).ok, false);
  assert.equal(dogrula({ paylar: [{ kime: "vakif", oran: 50 }] }).ok, false, "toplam 100 değil");
  assert.equal(dogrula({ paylar: [{ kime: "vakif", oran: 50.5 }, { kime: npcKimlik(c[0]!), oran: 49.5 }] }).ok, false);
  assert.equal(dogrula({ varis: "vakif" }).ok, false);
  const v = dogrula({ varis: npcKimlik(c[1]!), paylar: [{ kime: npcKimlik(c[1]!), oran: 70 }, { kime: npcKimlik(c[0]!), oran: 20 }, { kime: "vakif", oran: 10 }] });
  assert.ok(v.ok && v.deger);
  kar.hd!.vs = v.deger;
  oyuncuOlumu(k, kar, k.ay);
  const plan = devirHesapla(k, "o1", undefined, k.ay);
  assert.ok(plan.ok);
  assert.equal(plan.deger.varis.id, npcKimlik(c[1]!), "vasiyetteki vâris");
  const kusme = plan.deger.kalemler.filter((x) => x.tur === "kusme");
  assert.deepEqual(kusme.map((x) => (x as { npc: number }).npc).sort(), [c[0]!, c[2]!].sort());
  const once = toplamAkce(k);
  const r = devirUygula(k, plan.deger, k.ay);
  assert.ok(r.ok);
  assert.equal(k.hd!.vk, 90);
  assert.equal(k.hd!.hz, 100);
  assert.equal(r.deger.kar.pa, 900 - 180 - 90 + 0);
  assert.deepEqual(k.ili.get(r.deger.kar.o)![c[2]!]!.an, [["kusme", KUSME_YUKU, k.ay]]);
  assert.equal(toplamAkce(k), once);
  assert.equal(vasiyetDogrula(k, kar, null).ok, false, "ölü vasiyet yazamaz");
});

test("çocuksuz ölüm (ya da tek çocuk 12 altı): uzak akraba gelir, hanedan adını taşır, deterministik", () => {
  const { k, kar, c } = ailesiyle([7]);
  for (const n of [...k.npc]) if (n.an === kar.an && kar.an && n.i !== kar.an) n.an = 0; // ocak kardeşi yok
  for (const n of [...k.npc]) if (n.ba === kar.ba && kar.ba && n.i !== kar.ba) n.ba = 0;
  oyuncuOlumu(k, kar, k.ay);
  assert.deepEqual(devirHesapla(k, "o1", npcKimlik(c[0]!), k.ay), { ok: false, hata: "varis_gecersiz" }, "12 altı seçilemez");
  const a = devirHesapla(k, "o1", undefined, k.ay);
  const b = devirHesapla(k, "o1", "uzak", k.ay);
  assert.ok(a.ok && b.ok);
  assert.equal(planKarmasi(a.deger), planKarmasi(b.deger));
  assert.equal(a.deger.varis.id, "uzak");
  assert.equal(k.ay - a.deger.varis.d >= 16 * 12, true);
  const r = devirUygula(k, a.deger, k.ay);
  assert.ok(r.ok);
  assert.equal(r.deger.kar.hd?.s, kar.hd?.s, "hanedan soyadı");
  assert.ok(r.deger.kar.hd?.ak?.includes(c[0]!), "küçük çocuk hanedanda kalır, büyüyünce aday olur");
  assert.ok(!olduMu(r.deger.kar));
});

test("eski pk: koşul değişince plan karması değişir", () => {
  const { k, kar } = ailesiyle([30]);
  oyuncuOlumu(k, kar, k.ay);
  const once = devirHesapla(k, "o1", undefined, k.ay);
  kar.pa += 5;
  const sonra = devirHesapla(k, "o1", undefined, k.ay);
  assert.ok(once.ok && sonra.ok);
  assert.notEqual(planKarmasi(once.deger), planKarmasi(sonra.deger));
});

test("devir: aile adı küçük başlangıç teveccühü verir (veren listesi geçmez); borç/teklif/engel vârise bağlanır", async () => {
  const { AILE_ADI_EN_COK, AILE_ADI_ORANI } = await import("../src/yerlesim/devir.ts");
  const { teveccuhEkle, teveccuhPuani } = await import("../src/yerlesim/teveccuh.ts");
  const { toplumAl } = await import("../src/yerlesim/toplum.ts");
  // Taşıyıcı kaydı motor modülündedir (YerlesimDO yüklerken bağlanır).
  await import("../src/yerlesim/motor.ts");
  const { k, kar, c } = ailesiyle([30]);
  const alacakli = oyuncuEkle(k, 2, k.ay - 30 * 12);
  const ortak = oyuncuEkle(k, 3, k.ay - 30 * 12);
  alacakli.e = 9001;
  ortak.e = 9002;
  teveccuhEkle(kar, alacakli, "armagan", k.ay, 60);
  const tp = toplumAl(k);
  const borcVar = { i: 1, t: "borc" as const, g: "o2", a: "o1", s: { tu: 20, fz: 0, va: 6, yn: "ver" as const }, e: 0, ac: k.ay, sa: k.ay, v: "ret" as const, d: "surer" as const, kl: 20, vd: k.ay + 6 };
  const borcAlacak = { i: 2, t: "borc" as const, g: "o1", a: "o3", s: { tu: 10, fz: 0, va: 6, yn: "ver" as const }, e: 0, ac: k.ay, sa: k.ay, v: "ret" as const, d: "surer" as const, kl: 10, vd: k.ay + 6 };
  const acikHediye = { i: 3, t: "hediye" as const, g: "o1", a: "o3", s: { tu: 7 }, e: 7, ac: k.ay, sa: k.ay + 1, v: "ret" as const, d: "acik" as const };
  const cirak: import("../src/yerlesim/toplum.ts").Teklif = { i: 4, t: "cirak" as const, g: "o1", a: "o3", s: { m: "demirci" as const, us: "o1" }, e: 0, ac: k.ay, sa: k.ay, v: "ret" as const, d: "surer" as const };
  tp.tk.push(borcVar, borcAlacak, acikHediye, cirak);
  tp.eg.o2 = ["o1"];
  oyuncuOlumu(k, kar, k.ay);
  const plan = devirHesapla(k, "o1", undefined, k.ay);
  assert.ok(plan.ok);
  const beklenen = Math.min(AILE_ADI_EN_COK, Math.floor(teveccuhPuani(kar, plan.deger.ol) * AILE_ADI_ORANI));
  assert.equal(beklenen, 6);
  assert.deepEqual(plan.deger.kalemler.find((x) => x.tur === "aileAdi"), { tur: "aileAdi", puan: beklenen });
  const once = toplamAkce(k);
  const r = devirUygula(k, plan.deger, k.ay);
  assert.ok(r.ok);
  const v = r.deger.kar;
  assert.equal(v.tv?.p, beklenen, "aile adı");
  assert.deepEqual(v.tv?.v, [], "hediye verenleri geçmez");
  assert.deepEqual([borcVar.a, borcVar.d, borcVar.kl], [v.o, "surer", 20], "borç vârise geçer");
  assert.deepEqual([borcAlacak.g, borcAlacak.d], [v.o, "surer"], "alacak vârise geçer");
  assert.equal(acikHediye.g, v.o, "açık armağan teklifi (emanetiyle) vârisin");
  assert.deepEqual([cirak.d, cirak.sn], ["bitti", "oldu"], "çıraklık kişiye bağlıdır, kapanır");
  assert.deepEqual(tp.eg.o2, [v.o], "engel vârise de geçerli");
  assert.equal(toplamAkce(k), once, "akçe korunur");
  void c;
});
