// H12 odanın getirdikleri (GDD §18): sandık (koy/al, kapasite, kalite partileri, çoğalmazlık), kira bitince han
// emaneti ve geri alma, ikamet, göç kapısı, ölümde vârise geçiş, özel görüşme (davet, kabul, söz, bitiş, süre).
import test from "node:test";
import assert from "node:assert/strict";
import { ayBasi, barinmaGorunumu, kiraTut } from "../src/yerlesim/barinma.ts";
import { devirHesapla, devirUygula } from "../src/yerlesim/devir.ts";
import { yerelKapilar } from "../src/yerlesim/goc.ts";
import {
  GORUSME_DAVETLI_EN_COK,
  GORUSME_SOZ_EN_COK,
  GORUSME_SURE_MS,
  emanetAl,
  gorusmeIslem,
  ikametVar,
  sandikAdedi,
  sandikDurumu,
  sandikIslem,
} from "../src/yerlesim/oda-getiri.ts";
import { ODALAR } from "../src/yerlesim/oda.ts";
import { toplumAl } from "../src/yerlesim/toplum.ts";
import { oyuncuOlumu } from "../src/yerlesim/yaslilik.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const SAAT = 60 * 60 * 1000;
const AY = 12 * SAAT;

/** Karakter envanteri + sandık toplamı (çoğalmazlık değişmezi). */
function toplamMal(kar: Karakter, mal: string): number {
  return (kar.ev?.[mal] ?? 0) + (kar.br?.sd?.ev?.[mal] ?? 0);
}

function odali(k: Kasaba, no: number, t: number, oda: "yatak" | "oda" = "oda"): Karakter {
  const kar = oyuncuEkle(k, no);
  kar.pa = 100;
  const r = kiraTut(k, kar, { oda, sure: 1 }, t);
  assert.ok(r.ok, JSON.stringify(r));
  return kar;
}

test("sandık: kira yoksa ya da sandıksız odada sandik_yok; ikamet yalnız geçerli kirada", () => {
  const k = testKasabasi();
  const t = ayBasi(0) + SAAT;
  const kar = oyuncuEkle(k, 1);
  kar.ev = { odun: 5 };
  assert.deepEqual(sandikIslem(kar, k.y, { islem: "koy", mal: "odun", adet: 1 }, t), { ok: false, hata: "sandik_yok" });
  assert.equal(ikametVar(kar, k.y, t), false, "ocak ikamet sayılmaz");
  kar.pa = 100;
  assert.ok(kiraTut(k, kar, { oda: "yatak", sure: 1 }, t).ok);
  assert.equal(ODALAR.yatak.sandik, 0);
  assert.deepEqual(sandikIslem(kar, k.y, { islem: "koy", mal: "odun", adet: 1 }, t), { ok: false, hata: "sandik_yok" });
  assert.equal(ikametVar(kar, k.y, t), true, "yatak adres verir");
  assert.equal(ikametVar(kar, "baska", t), false, "başka yerleşimde ikamet yok");
  assert.equal(ikametVar(kar, k.y, t + AY), false, "kira bitince ikamet düşer");
  const g = barinmaGorunumu(k, kar, t);
  assert.equal(g.ikamet, true);
  assert.equal(g.sandik.durum, "yok");
  assert.equal(g.sandik.kapasite, 0);
});

test("sandık: koy/al envanterle değiş tokuştur, kapasiteyi aşmaz, kalite partileri ve yapan izi taşınır", () => {
  const k = testKasabasi();
  const t = ayBasi(0) + SAAT;
  const kar = odali(k, 1, t);
  kar.ev = { odun: 12, alet: 3 };
  kar.kq = { alet: [[2, 2, "o9"]] };
  const kap = ODALAR.oda.sandik;
  // Geçersiz istekler hiçbir şeyi değiştirmez.
  assert.deepEqual(sandikIslem(kar, k.y, { islem: "sakla", mal: "odun", adet: 1 }, t), { ok: false, hata: "gecersiz_istek" });
  assert.deepEqual(sandikIslem(kar, k.y, { islem: "koy", mal: "altin", adet: 1 }, t), { ok: false, hata: "mal_gecersiz" });
  assert.deepEqual(sandikIslem(kar, k.y, { islem: "koy", mal: "odun", adet: 0 }, t), { ok: false, hata: "gecersiz_istek" });
  assert.deepEqual(sandikIslem(kar, k.y, { islem: "koy", mal: "odun", adet: 1.5 }, t), { ok: false, hata: "gecersiz_istek" });
  assert.deepEqual(sandikIslem(kar, k.y, { islem: "koy", mal: "odun", adet: 1, kalite: 7 }, t), { ok: false, hata: "gecersiz_istek" });
  assert.deepEqual(sandikIslem(kar, k.y, { islem: "koy", mal: "odun", adet: kap + 1 }, t), { ok: false, hata: "sandik_dolu" });
  assert.deepEqual(sandikIslem(kar, k.y, { islem: "koy", mal: "sertOdun", adet: 1 }, t), { ok: false, hata: "mal_yok" });
  assert.equal(kar.br!.sd, undefined, "başarısız istek boş sandık kaydı bırakmaz");

  const r = sandikIslem(kar, k.y, { islem: "koy", mal: "odun", adet: 8 }, t);
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(kar.ev.odun, 4);
  assert.equal(kar.br!.sd!.ev!.odun, 8);
  assert.equal(toplamMal(kar, "odun"), 12);
  // Üstün kaliteli (yapan izli) aletten 2: parti sandığa aynen geçer.
  assert.ok(sandikIslem(kar, k.y, { islem: "koy", mal: "alet", adet: 2, kalite: 2 }, t).ok);
  assert.deepEqual(kar.br!.sd!.kq, { alet: [[2, 2, "o9"]] });
  assert.equal(kar.kq?.alet, undefined);
  assert.equal(kar.ev.alet, 1);
  assert.equal(sandikAdedi(kar.br!.sd), kap);
  assert.deepEqual(sandikIslem(kar, k.y, { islem: "koy", mal: "odun", adet: 1 }, t), { ok: false, hata: "sandik_dolu" });
  // Al: fazlası istenirse mal_yok, hiçbir şey değişmez.
  assert.deepEqual(sandikIslem(kar, k.y, { islem: "al", mal: "odun", adet: 9 }, t), { ok: false, hata: "mal_yok" });
  assert.equal(kar.br!.sd!.ev!.odun, 8);
  assert.ok(sandikIslem(kar, k.y, { islem: "al", mal: "alet", adet: 1, kalite: 2 }, t).ok);
  assert.deepEqual(kar.kq?.alet, [[2, 1, "o9"]]);
  assert.deepEqual(kar.br!.sd!.kq, { alet: [[2, 1, "o9"]] });
  assert.equal(toplamMal(kar, "alet"), 3);
  const g = barinmaGorunumu(k, kar, t);
  assert.equal(g.sandik.durum, "sandik");
  assert.equal(g.sandik.adet, 9);
  assert.equal(g.sandik.kapasite, kap);
  assert.deepEqual(g.sandik.mallar, { odun: 8, alet: 1 });
});

test("kira bitince sandık han emanetine geçer: kaybolmaz, koy kapalı, emanet geri alınır ya da sonraki kirada sandığa döner", () => {
  const k = testKasabasi();
  const t = ayBasi(0) + SAAT;
  const kar = odali(k, 1, t);
  kar.ev = { odun: 6 };
  assert.ok(sandikIslem(kar, k.y, { islem: "koy", mal: "odun", adet: 6 }, t).ok);
  assert.equal(kar.ev.odun, undefined);
  const sonra = t + AY + SAAT;
  assert.equal(sandikDurumu(kar, k.y, sonra), "emanet");
  assert.equal(barinmaGorunumu(k, kar, sonra).sandik.durum, "emanet");
  assert.deepEqual(sandikIslem(kar, k.y, { islem: "al", mal: "odun", adet: 1 }, sonra), { ok: false, hata: "sandik_yok" });
  assert.equal(kar.br!.sd!.ev!.odun, 6, "emanet yerinde");
  // Sonraki sandıklı kira: aynı kayıt yeniden sandıktır.
  assert.ok(kiraTut(k, kar, { oda: "oda", sure: 1 }, sonra).ok);
  assert.equal(sandikDurumu(kar, k.y, sonra), "sandik");
  assert.ok(sandikIslem(kar, k.y, { islem: "al", mal: "odun", adet: 2 }, sonra).ok);
  // Kira yine biter; emanet bedelsiz, hepsi bir kerede envantere döner.
  const en = sonra + 2 * AY;
  const once = kar.pa;
  const e = emanetAl(kar, k.y, en);
  assert.ok(e.ok, JSON.stringify(e));
  assert.deepEqual(e.deger.emanet, { alinan: { odun: 4 } });
  assert.equal(kar.ev!.odun, 6);
  assert.equal(kar.pa, once, "emanet bedelsiz");
  assert.equal(kar.br!.sd, undefined);
  assert.equal(sandikDurumu(kar, k.y, en), "yok");
  assert.deepEqual(emanetAl(kar, k.y, en), { ok: false, hata: "emanet_yok" });
});

test("göç: sandıkta ya da emanette mal varken açık iş kapısı tutmaz; mal alınınca açılır", () => {
  const k = testKasabasi();
  const t = ayBasi(0) + SAAT;
  const kar = odali(k, 1, t);
  kar.ev = { odun: 2 };
  assert.equal(yerelKapilar(k, kar, k.ay).acikIs, true);
  assert.ok(sandikIslem(kar, k.y, { islem: "koy", mal: "odun", adet: 2 }, t).ok);
  assert.equal(yerelKapilar(k, kar, k.ay).acikIs, false);
  assert.ok(emanetAl(kar, k.y, t).ok);
  assert.equal(yerelKapilar(k, kar, k.ay).acikIs, true);
});

test("ölüm: sandık ve emanet malı vârisin envanterine geçer, ölüde kalmaz", () => {
  const k = testKasabasi("develi", 0);
  const kar = oyuncuEkle(k, 1, k.ay - 70 * 12);
  const t = ayBasi(0) + SAAT;
  kar.pa = 100;
  assert.ok(kiraTut(k, kar, { oda: "oda", sure: 1 }, t).ok);
  kar.ev = { odun: 5, tas: 1 };
  assert.ok(sandikIslem(kar, k.y, { islem: "koy", mal: "odun", adet: 3 }, t).ok);
  oyuncuOlumu(k, kar, k.ay);
  const p = devirHesapla(k, "o1", undefined, k.ay);
  assert.ok(p.ok, JSON.stringify(p));
  const env = p.deger.kalemler.find((x) => x.tur === "envanter");
  assert.deepEqual(env, { tur: "envanter", mallar: { odun: 5, tas: 1 } });
  const r = devirUygula(k, p.deger, k.ay);
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(kar.br!.sd, undefined);
  const varis = [...k.kar.values()].find((c) => c.o !== "o1" && c.h === kar.h);
  assert.deepEqual(varis?.ev, { odun: 5, tas: 1 });
});

test("özel görüşme: özel oda şart, en çok 3 davetli, engel iki yönlü, kabul eden katılır", () => {
  const k = testKasabasi();
  const t = ayBasi(0) + SAAT;
  const ev = odali(k, 1, t);
  for (let i = 2; i <= 6; i++) oyuncuEkle(k, i);
  const yatakli = odali(k, 7, t, "yatak");
  assert.deepEqual(gorusmeIslem(k, yatakli, { islem: "davet", hedef: "o2" }, t), { ok: false, hata: "ozel_oda_yok" });
  assert.deepEqual(gorusmeIslem(k, ev, { islem: "davet" }, t), { ok: false, hata: "gecersiz_istek" });
  assert.deepEqual(gorusmeIslem(k, ev, { islem: "davet", hedef: "o1" }, t), { ok: false, hata: "kendine" });
  assert.deepEqual(gorusmeIslem(k, ev, { islem: "davet", hedef: "o99" }, t), { ok: false, hata: "kisi_yok" });
  toplumAl(k).eg.o6 = ["o1"];
  assert.deepEqual(gorusmeIslem(k, ev, { islem: "davet", hedef: "o6" }, t), { ok: false, hata: "engelli" });
  const d = gorusmeIslem(k, ev, { islem: "davet", hedef: "o2" }, t);
  assert.ok(d.ok, JSON.stringify(d));
  assert.deepEqual(d.deger.olaylar.map((o) => [o.k, o.g]), [["olay.oda.davet", "o2"]]);
  assert.equal(gorusmeIslem(k, ev, { islem: "davet", hedef: "o2" }, t).ok && gorusmeIslem(k, ev, { islem: "davet", hedef: "o2" }, t).ok, true);
  assert.equal(k.tp!.og![0]!.d.length, 1, "aynı davet çoğalmaz");
  assert.ok(gorusmeIslem(k, ev, { islem: "davet", hedef: "o3" }, t).ok);
  assert.ok(gorusmeIslem(k, ev, { islem: "davet", hedef: "o4" }, t).ok);
  assert.equal(GORUSME_DAVETLI_EN_COK, 3);
  assert.deepEqual(gorusmeIslem(k, ev, { islem: "davet", hedef: "o5" }, t), { ok: false, hata: "gorusme_dolu" });
  // Kabul etmeden söz yok; kabul ev sahibine bildirilir.
  const o2 = k.kar.get("o2")!;
  const o3 = k.kar.get("o3")!;
  assert.deepEqual(gorusmeIslem(k, ev, { islem: "soz", sart: "ittifak" }, t), { ok: false, hata: "gorusme_yok" });
  assert.deepEqual(gorusmeIslem(k, k.kar.get("o5")!, { islem: "kabul", hedef: "o1" }, t), { ok: false, hata: "gorusme_yok" });
  const kb = gorusmeIslem(k, o2, { islem: "kabul", hedef: "o1" }, t);
  assert.ok(kb.ok);
  assert.deepEqual(kb.deger.olaylar.map((o) => [o.k, o.g]), [["olay.oda.katildi", "o1"]]);
  assert.ok(gorusmeIslem(k, o3, { islem: "kabul", hedef: "o1" }, t).ok);
  const gv = barinmaGorunumu(k, o2, t).gorusme;
  assert.equal(gv.davetler.length, 1);
  assert.deepEqual(gv.davetler[0]!.katilim, ["o1", "o2", "o3"]);
  assert.equal(barinmaGorunumu(k, ev, t).gorusme.benim?.davetliler.length, 3);
});

test("özel söz: olay yalnız görüşmedekilere düşer, katılım listesi görüşmedekilerdir; nam/akçe değişmez; tavan ve bitiş", () => {
  const k = testKasabasi();
  const t = ayBasi(0) + SAAT;
  const ev = odali(k, 1, t);
  const o2 = oyuncuEkle(k, 2);
  oyuncuEkle(k, 3);
  assert.ok(gorusmeIslem(k, ev, { islem: "davet", hedef: "o2" }, t).ok);
  assert.ok(gorusmeIslem(k, ev, { islem: "davet", hedef: "o3" }, t).ok);
  assert.ok(gorusmeIslem(k, o2, { islem: "kabul", hedef: "o1" }, t).ok);
  const nam = [ev.nm.slice(), o2.nm.slice()];
  const pa = [ev.pa, o2.pa];
  assert.deepEqual(gorusmeIslem(k, o2, { islem: "soz", sart: "serbest metin" }, t), { ok: false, hata: "sart_gecersiz" });
  const s = gorusmeIslem(k, o2, { islem: "soz", sart: "ittifak", hedef: "o1" }, t);
  assert.ok(s.ok, JSON.stringify(s));
  assert.deepEqual(s.deger.olaylar.map((o) => o.g).sort(), ["o1", "o2"], "kabul etmeyen o3 görmez");
  for (const o of s.deger.olaylar) {
    assert.equal(o.k, "olay.oda.gorusme");
    assert.equal(o.p.katilim, "o1,o2");
    assert.equal(o.p.sart, "ittifak");
  }
  assert.deepEqual([ev.nm, o2.nm], nam);
  assert.deepEqual([ev.pa, o2.pa], pa);
  for (let i = 1; i < GORUSME_SOZ_EN_COK; i++) assert.ok(gorusmeIslem(k, ev, { islem: "soz", sart: "destek" }, t).ok);
  assert.deepEqual(gorusmeIslem(k, ev, { islem: "soz", sart: "destek" }, t), { ok: false, hata: "gorusme_siniri" });
  // Davetli ayrılır; ev sahibi bitirir; ikinci bitiş gorusme_yok.
  const ay = gorusmeIslem(k, o2, { islem: "bitir", hedef: "o1" }, t);
  assert.ok(ay.ok);
  assert.deepEqual(ay.deger.olaylar.map((o) => [o.k, o.g]), [["olay.oda.ayrildi", "o1"]]);
  assert.ok(gorusmeIslem(k, ev, { islem: "bitir" }, t).ok);
  assert.equal(k.tp!.og!.length, 0);
  assert.deepEqual(gorusmeIslem(k, ev, { islem: "bitir" }, t), { ok: false, hata: "gorusme_yok" });
});

test("özel görüşme süresi dolunca ya da ev sahibinin kirası bitince kapanır (budanır)", () => {
  const k = testKasabasi();
  const t = ayBasi(0) + SAAT;
  const ev = odali(k, 1, t);
  const o2 = oyuncuEkle(k, 2);
  assert.ok(gorusmeIslem(k, ev, { islem: "davet", hedef: "o2" }, t).ok);
  assert.ok(gorusmeIslem(k, o2, { islem: "kabul", hedef: "o1" }, t).ok);
  assert.equal(k.tp!.og![0]!.s, t + Math.min(GORUSME_SURE_MS, AY));
  const sonra = t + GORUSME_SURE_MS;
  assert.deepEqual(gorusmeIslem(k, o2, { islem: "soz", sart: "yardim" }, sonra), { ok: false, hata: "gorusme_yok" });
  assert.equal(k.tp!.og!.length, 0, "süresi biten budandı");
  assert.equal(barinmaGorunumu(k, o2, sonra).gorusme.davetler.length, 0);
});
