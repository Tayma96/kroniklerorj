// Faz 7a–7c: hanedan çekirdeği, evlilik ve doğum, yaşlılık ve ölüm (saf fonksiyonlar).
import test from "node:test";
import assert from "node:assert/strict";
import { ayDonumu } from "../src/yerlesim/donum.ts";
import { evlilikKapisi, evlilikKaydet, npcEvlilikTeklifi, DUGUN_BEDELI, EVLILIK_GORUS_ESIGI } from "../src/yerlesim/evlilik.ts";
import { eylemYap, iliskiAl } from "../src/yerlesim/eylem.ts";
import { AILE_MESLEGI_CARPANI, hanedanKimligi, nesil, olduMu, varisAdaylari, varsayilanVaris } from "../src/yerlesim/hanedan.ts";
import { aylikTakat } from "../src/yerlesim/hal.ts";
import { takatTazele } from "../src/yerlesim/karakter.ts";
import { hizmetEkle, meslekSec } from "../src/yerlesim/meslek.ts";
import { npcKimlik, yas } from "../src/yerlesim/ortak.ts";
import { tohumlu } from "../src/yerlesim/rastgele.ts";
import { OLUM_YAS_EN_AZ, OLUM_YAS_EN_COK, SON_GUNLER_AY, olumAyiBelirle, yaslilikTakatTavani } from "../src/yerlesim/yaslilik.ts";
import { npcBul, oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";
import { cocukEkle, npcIleEvlendir, toplamAkce } from "./hanedan-yardimci.ts";

test("7a: Faz 2 karakteri alansız yüklenir; nesil 1, hanedan kimliği ilk atanın kimliği", () => {
  const k = testKasabasi("develi", 0);
  const kar = oyuncuEkle(k, 1);
  const eski = JSON.parse(JSON.stringify(kar));
  assert.equal(eski.hd, undefined);
  assert.equal(nesil(eski), 1);
  assert.equal(hanedanKimligi(eski), "o1");
  assert.equal(olduMu(eski), false);
  assert.deepEqual(varisAdaylari(k, eski, k.ay).filter((a) => a.yakinlik === "cocuk"), []);
});

test("7a: aday sırası — önce çocuklar büyükten küçüğe (12 altı görünür ama seçilemez), sonra 16+ kardeş/yeğen", () => {
  const kur = () => {
    const k = testKasabasi("develi", 0);
    const kar = oyuncuEkle(k, 2, k.ay - 40 * 12);
    npcIleEvlendir(k, kar);
    const c = [cocukEkle(k, kar, 8, 1), cocukEkle(k, kar, 20, 2), cocukEkle(k, kar, 14, 3)];
    return { k, kar, c };
  };
  const a = kur();
  const b = kur();
  const adaylar = varisAdaylari(a.k, a.kar, a.k.ay);
  assert.deepEqual(adaylar, varisAdaylari(b.k, b.kar, b.k.ay), "aynı tohum aynı sıra");
  const cocuk = adaylar.filter((x) => x.yakinlik === "cocuk");
  assert.deepEqual(cocuk.map((x) => x.yas), [20, 14, 8]);
  assert.deepEqual(cocuk.map((x) => x.uygun), [true, true, false]);
  assert.equal(cocuk[2]!.neden, "kucuk");
  const ilkAkraba = adaylar.findIndex((x) => x.yakinlik !== "cocuk");
  if (ilkAkraba >= 0) {
    assert.ok(ilkAkraba >= 3, "akrabalar çocuklardan sonra");
    for (const x of adaylar.slice(ilkAkraba)) assert.ok(x.yas >= 16 && x.uygun);
  }
  assert.equal(varsayilanVaris(a.k, a.kar, a.k.ay), npcKimlik(a.c[1]!.i), "en büyük uygun çocuk");
});

test("7b: evlilik kapısı — 15 yaş YAS, evliye ikinci evlilik EVLI, akraba ve aynı cins reddedilir", () => {
  const k = testKasabasi("develi", 0);
  const genc = oyuncuEkle(k, 1, k.ay - 15 * 12);
  const npc = npcBul(k, genc, 16, 25, (n) => n.k !== genc.k && n.es === 0);
  assert.equal(evlilikKapisi(k, genc, npcKimlik(npc.i), k.ay), "yas_kapisi");
  const kar = oyuncuEkle(k, 3, k.ay - 25 * 12);
  const es = npcIleEvlendir(k, kar);
  assert.equal(es.es, -3, "NPC eşin oyuncu eşi negatif kodla tutulur");
  assert.equal(es.e, kar.e, "NPC eş oyuncunun hanesine taşınır");
  const baska = npcBul(k, kar, 18, 35, (n) => n.k !== kar.k && n.es === 0);
  assert.equal(evlilikKapisi(k, kar, npcKimlik(baska.i), k.ay), "evli");
  const bekar = oyuncuEkle(k, 5, k.ay - 25 * 12);
  const anne = k.dizin.get(bekar.an);
  if (anne && bekar.k === 0) assert.equal(evlilikKapisi(k, bekar, npcKimlik(anne.i), k.ay), "akraba_evlilik");
  const ayniCins = npcBul(k, bekar, 18, 35, (n) => n.k === bekar.k && n.es === 0);
  assert.equal(evlilikKapisi(k, bekar, npcKimlik(ayniCins.i), k.ay), "hedef_uygun_degil");
  // Oyuncu–oyuncu kancası (Faz 3 görücü teklifi kabulünden sonra çağrılır).
  const o6 = oyuncuEkle(k, 6, k.ay - 25 * 12);
  assert.notEqual(o6.k, bekar.k);
  assert.equal(evlilikKapisi(k, bekar, "o6", k.ay), undefined);
  evlilikKaydet(k, bekar, "o6", k.ay);
  assert.equal(bekar.hd?.es, "o6");
  assert.equal(o6.hd?.es, "o5");
  assert.equal(evlilikKapisi(k, o6, npcKimlik(baska.i), k.ay), "evli");
  assert.ok(k.kq?.some((s) => s.t === "evlilik"), "kronik satırı");
});

test("7b: NPC teklifi — görüş eşiği, düğün bedeli hazineye (akçe korunur), takat düşer", () => {
  const k = testKasabasi("develi", 0);
  const kar = oyuncuEkle(k, 1, k.ay - 22 * 12);
  kar.pa = 50;
  const ili = k.ili.get("o1")!;
  const n = k.npc.find((x) => evlilikKapisi(k, kar, npcKimlik(x.i), k.ay) === undefined)!;
  assert.deepEqual(npcEvlilikTeklifi(k, kar, ili, npcKimlik(n.i), k.ay), { ok: false, hata: "gorus_yetersiz" });
  assert.equal(kar.pa, 50, "red bedel almaz");
  iliskiAl(ili, n.i).t = EVLILIK_GORUS_ESIGI + 10;
  const once = toplamAkce(k);
  const r = npcEvlilikTeklifi(k, kar, ili, npcKimlik(n.i), k.ay);
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(kar.pa, 50 - DUGUN_BEDELI);
  assert.equal(k.hd!.hz, DUGUN_BEDELI);
  assert.equal(toplamAkce(k), once);
  assert.ok((r.deger.sonuc.gorus as { toplam: number }).toplam >= EVLILIK_GORUS_ESIGI, "döküm döner");
  assert.deepEqual(npcEvlilikTeklifi(k, kar, ili, npcKimlik(n.i), k.ay), { ok: false, hata: "evli" });
});

test("7b: evli oyuncu hanesinde 120 ayda en az 1 doğum; çocuk co'ya, oyuncu ebeveyn oe'ye yazılır", () => {
  const k = testKasabasi("develi", 0);
  const kar = oyuncuEkle(k, 1, k.ay - 20 * 12); // kadın
  assert.equal(kar.k, 1);
  npcIleEvlendir(k, kar);
  const olaylar = [];
  for (let ay = 1; ay <= 120; ay++) olaylar.push(...ayDonumu(k, ay));
  const co = kar.hd?.co ?? [];
  assert.ok(co.length >= 1, `doğum: ${co.length}`);
  for (const i of co) {
    const c = k.dizin.get(i);
    if (c) assert.deepEqual(c.oe, ["o1"]);
  }
  assert.ok(olaylar.some((o) => o.k === "olay.oyuncuDogum" && o.h === "o1"));
  assert.ok(k.kq!.filter((s) => s.t === "dogum").length === co.length);
});

test("7c: ölüm ayı aynı tohumla sabit ve 61–80 yaş arası; ortalama ~70", () => {
  let toplam = 0;
  for (let i = 1; i <= 400; i++) {
    const kar = { o: `o${i}`, d: -144 };
    const a = olumAyiBelirle(kar, `o${i}`);
    assert.equal(a, olumAyiBelirle(kar, `o${i}`));
    const y = (a - kar.d) / 12;
    assert.ok(y >= OLUM_YAS_EN_AZ && y <= OLUM_YAS_EN_COK + 1, String(y));
    toplam += y;
  }
  const ort = toplam / 400;
  assert.ok(ort > 68 && ort < 73, String(ort));
});

test("7c: 60'ta ölüm ayı seçilir, son günler tam 6 ay önce, ölümde tereke; ölüye eylem OLU", () => {
  const k = testKasabasi("develi", 0);
  const kar = oyuncuEkle(k, 1, k.ay - 60 * 12 + 1); // gelecek ay 60
  kar.pa = 77;
  ayDonumu(k, 1);
  const oa = kar.hd?.oa;
  assert.ok(oa !== undefined && oa >= 1 + SON_GUNLER_AY);
  const turler = new Map<string, number>();
  for (let ay = 2; ay <= oa; ay++) for (const o of ayDonumu(k, ay)) if (o.h === "o1" && !turler.has(o.k)) turler.set(o.k, ay);
  assert.equal(turler.get("olay.sonGunler"), oa - SON_GUNLER_AY);
  assert.equal(turler.get("olay.oyuncuOldu"), oa);
  assert.ok(olduMu(kar));
  assert.equal(kar.hd?.ol, oa);
  assert.deepEqual(k.hd?.tr, [{ o: "o1", h: "hesap-1", ol: oa, son: oa + 4 }]);
  assert.equal(kar.pa, 77, "emanet: para kıpırdamaz");
  const npc = k.npc.find((n) => yas(n.d, k.ay) > 20)!;
  const r = eylemYap(k, kar, k.ili.get("o1")!, { tur: "sohbet", hedef: npcKimlik(npc.i) }, k.ay, tohumlu("x"));
  assert.deepEqual(r, { ok: false, hata: "olu" });
  assert.ok(k.kq?.some((s) => s.t === "olum"));
});

test("7c: yaşlılık — 60+ takat 5, 70+ takat 4; 60'tan önce doğal ölüm yok", () => {
  assert.equal(yaslilikTakatTavani(59), Number.POSITIVE_INFINITY);
  assert.equal(yaslilikTakatTavani(60), 5);
  assert.equal(yaslilikTakatTavani(71), 4);
  const k = testKasabasi("develi", 0);
  const yasli = oyuncuEkle(k, 1, k.ay - 65 * 12);
  assert.equal(aylikTakat(yasli, k.ay), 5);
  yasli.tk = 0;
  takatTazele(yasli, k.ay + 2);
  assert.equal(yasli.tk, 10);
  const genc = oyuncuEkle(k, 2, k.ay - 20 * 12);
  for (let ay = 1; ay <= 120; ay++) ayDonumu(k, ay);
  assert.equal(olduMu(genc), false);
  assert.equal(genc.hd?.oa, undefined);
});

test("§5.3 kararı: aile mesleğinde vâris tecrübeyi çarpanla kazanır (ustalık ve tecrübe geçmez)", () => {
  const k = testKasabasi("develi", 0);
  const kar = oyuncuEkle(k, 1, k.ay - 16 * 12);
  assert.ok(meslekSec(kar, "demirci", k.ay).ok);
  assert.equal(hizmetEkle(kar, "demirci", 4), 4);
  kar.hd = { h: "o9", n: 2, s: 0, am: "demirci" };
  assert.equal(hizmetEkle(kar, "demirci", 4), 4 * AILE_MESLEGI_CARPANI);
});
