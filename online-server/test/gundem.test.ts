// Katmanlı NPC gündemi (Faz 5): ihtiyaç → karar (gerekçeli, deterministik), yakın çevre katmanı, etkin oturum
// güvencesi, boş yerleşimde seyrek kasaba olayı, ayrıntılı işleme tavanı, borç gündemi ↔ NPC teklifi, kalıcılık, süre.
import test from "node:test";
import assert from "node:assert/strict";
import { bellekDepo } from "../src/depo.ts";
import { BOS_OLAY_ARALIK, OLAY_ARALIK, arkaPlanAl, kasabaGeneli } from "../src/yerlesim/arka-plan.ts";
import { ayDonumu } from "../src/yerlesim/donum.ts";
import { iliskiAl } from "../src/yerlesim/eylem.ts";
import { AYRINTILI_EN_COK, KASABA_ORNEK, YAKIN_CEVRE_EN_COK, donumAni, gundemKatmanlari, yakinCevre } from "../src/yerlesim/gundem.ts";
import { YerlesimMotoru } from "../src/yerlesim/motor.ts";
import { BORC_ESIGI, IHTIYAC_PUANI, ihtiyaclar, npcKarar, type KararBaglami } from "../src/yerlesim/npc-karar.ts";
import { npcTeklifUret } from "../src/yerlesim/npc-teklif.ts";
import { yas } from "../src/yerlesim/ortak.ts";
import { teklifCevap } from "../src/yerlesim/teklif.ts";
import { GUNDEM, type Karakter, type Kasaba, type Npc } from "../src/yerlesim/tipler.ts";
import { toplumDonumu } from "../src/yerlesim/toplum-donum.ts";
import { ISSIZ } from "../src/yerlesim/uret.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const bag = (k: Kasaba, ay: number, ek: Partial<KararBaglami> = {}): KararBaglami => ({
  hane: kasabaGeneli(k, arkaPlanAl(k), ay, new Map()).hane,
  kitlik: false,
  haydut: false,
  mevsim: "ilkbahar",
  ...ek,
});

/** Kalemsiz sade bir NPC (huy/hayal etkisiz, bağsız) kurar. */
function sade(k: Kasaba, n: Npc, ay: number, yil: number, ek: Partial<Npc> = {}): Npc {
  Object.assign(n, { d: ay - yil * 12, h: 1, r: 0, b: [], es: 1, m: 0, g: GUNDEM.yok, ...ek });
  delete n.ga;
  return n;
}

test("ihtiyaç dökümü toplamı kalemlere eşit; karar eşiğe ve tetiğe göre, gerekçesiyle", () => {
  const k = testKasabasi("develi", 200);
  const ay = 200;
  const n = sade(k, k.npc.find((x) => yas(x.d, ay) >= 20)!, ay, 45);
  const b = bag(k, ay);
  for (const d of Object.values(ihtiyaclar(k, n, ay, b))) assert.equal(d.toplam, d.kalemler.reduce((s, x) => s + x.d, 0));
  assert.equal(npcKarar(k, n, ay, b), undefined, "ihtiyacı eşiğin altında: karar yok");
  const h = npcKarar(k, n, ay, { ...b, haydut: true })!;
  assert.equal(h.gundem, GUNDEM.nobet);
  assert.equal(h.sebep, "ihtiyac.guvenlik.haydut");
  n.m = ISSIZ;
  const g = npcKarar(k, n, ay, b)!;
  assert.deepEqual([g.gundem, g.sebep], [GUNDEM.gecim, "ihtiyac.gecim.issiz"], "iş arama");
  assert.ok(g.deger >= IHTIYAC_PUANI.issiz);
  n.es = 0;
  n.d = ay - 30 * 12;
  const goc = npcKarar(k, n, ay, { ...b, kitlik: true })!;
  assert.equal(goc.gundem, GUNDEM.goc, "kıtlıkta işsiz bekâr: göç niyeti");
  assert.deepEqual(npcKarar(k, n, ay, { ...b, kitlik: true }), goc, "deterministik");
  // Kalabalık hane + kıtlık: borç sıkışması.
  const baba = sade(k, n, ay, 40, { es: 1, m: 0 });
  const cocuklar = k.npc.filter((x) => x !== baba).slice(0, 4);
  for (const c of cocuklar) Object.assign(c, { d: ay - 5 * 12, ba: baba.i, e: baba.e });
  const borc = npcKarar(k, baba, ay, { ...bag(k, ay), kitlik: true })!;
  assert.ok(borc.deger >= BORC_ESIGI);
  assert.equal(borc.gundem, GUNDEM.borc);
  assert.equal(npcKarar(k, baba, ay, bag(k, ay)), undefined, "kıtlık yokken sıkışma yok");
  // Zorla: eşik aranmaz, mevcut gündemden farklı hedef.
  const z = npcKarar(k, baba, ay, bag(k, ay), { zorla: true, haric: GUNDEM.ambar })!;
  assert.notEqual(z.gundem, GUNDEM.ambar);
  const cocuk = cocuklar[0]!;
  assert.equal(npcKarar(k, cocuk, ay, bag(k, ay), { zorla: true }), undefined, "çocuk karar vermez");
});

function etkinKasaba(id: string, oyuncu: number): { k: Kasaba; oyuncular: Karakter[] } {
  const k = testKasabasi(id, 0);
  const oyuncular: Karakter[] = [];
  for (let i = 1; i <= oyuncu; i++) oyuncular.push(oyuncuEkle(k, i, -13 * 12 - i));
  return { k, oyuncular };
}

test("yakın çevre en çok 15 kişi, 14+ ve ocağın ailesini içerir", () => {
  const { k, oyuncular } = etkinKasaba("develi", 1);
  const kar = oyuncular[0]!;
  const ili = k.ili.get(kar.o)!;
  for (const n of k.npc.slice(0, 40)) iliskiAl(ili, n.i).t = 10;
  const { hane } = kasabaGeneli(k, arkaPlanAl(k), 1, new Map());
  const c = yakinCevre(k, kar, ili, 1, hane);
  assert.ok(c.length > 0 && c.length <= YAKIN_CEVRE_EN_COK);
  assert.ok(c.every((n) => yas(n.d, 1) >= 14));
  const aile = k.npc.filter((n) => n.e === kar.e && yas(n.d, 1) >= 14);
  for (const n of aile.slice(0, 3)) assert.ok(c.includes(n), "hane yakın çevrede");
});

test("etkin oyuncu her dönümde yakın çevresinden en az bir NPC kaynaklı yeni gündem görür; etkin olmayan görmez", () => {
  const { k, oyuncular } = etkinKasaba("develi", 2);
  const [etkin, uyuyan] = oyuncular as [Karakter, Karakter];
  for (let ay = 1; ay <= 24; ay++) {
    etkin.kz = donumAni(ay) - 60_000;
    const olaylar = ayDonumu(k, ay);
    const benim = olaylar.filter((o) => o.k === "olay.gundem.yeni" && o.g === etkin.o);
    assert.ok(benim.length >= 1, `ay ${ay}: yeni gündem`);
    for (const o of benim) {
      assert.ok(typeof o.p.sebep === "string" && (o.p.sebep as string).startsWith("ihtiyac."), "gerekçe");
      assert.ok(o.p.firsat && o.p.gundem && o.w.startsWith("n"));
    }
    assert.equal(olaylar.filter((o) => o.g === uyuyan.o && o.k.startsWith("olay.gundem")).length, 0);
  }
});

test("boş yerleşimde kasaba olayı seyrek ve aralıklı; etkin yerleşimde daha sık; deterministik", () => {
  const say = (etkin: boolean) => {
    const k = testKasabasi("kizilca", 0);
    const kar = etkin ? oyuncuEkle(k, 1, -13 * 12) : undefined;
    const aylar: number[] = [];
    for (let ay = 1; ay <= 240; ay++) {
      if (kar) kar.kz = donumAni(ay);
      for (const o of ayDonumu(k, ay)) if (o.k.startsWith("olay.kasaba.")) aylar.push(ay);
    }
    return { aylar, ap: k.ap };
  };
  const bos = say(false);
  assert.ok(bos.aylar.length > 0, "boş bölgede de olay olur");
  for (let i = 1; i < bos.aylar.length; i++) assert.ok(bos.aylar[i]! - bos.aylar[i - 1]! >= BOS_OLAY_ARALIK);
  assert.ok(bos.aylar.length <= 240 / BOS_OLAY_ARALIK / 2, `düşük sıklık: ${bos.aylar.length}`);
  const dolu = say(true);
  for (let i = 1; i < dolu.aylar.length; i++) assert.ok(dolu.aylar[i]! - dolu.aylar[i - 1]! >= OLAY_ARALIK);
  assert.ok(dolu.aylar.length > bos.aylar.length, `${dolu.aylar.length} > ${bos.aylar.length}`);
  assert.deepEqual(say(false), bos, "aynı tohum aynı arka plan");
  assert.ok((bos.ap?.sy.olum ?? 0) > 0 && bos.ap!.oz.n > 0, "uzak sayaçlar ve özet");
});

test("ölçek: dönümde ayrıntılı işlenen NPC tavanlı, nüfusun küçük bir kısmı", () => {
  const { k, oyuncular } = etkinKasaba("demirhan", 20);
  for (let ay = 1; ay <= 6; ay++) {
    for (const o of oyuncular) o.kz = donumAni(ay);
    const { ayrintili } = gundemKatmanlari(k, ay, []);
    assert.ok(ayrintili <= AYRINTILI_EN_COK + KASABA_ORNEK + oyuncular.length, `ayrıntılı ${ayrintili}`);
    assert.ok(ayrintili < k.npc.length / 3);
    k.ay = ay;
  }
});

test("borç gündemli yakın NPC borç ister (gerekçeli); kabulden sonra gündemi çözülür", () => {
  const k = testKasabasi("develi", 200);
  const kar = oyuncuEkle(k, 1, k.ay - 13 * 12 - 2);
  kar.pa = 50;
  const n = k.npc.find((x) => x.e !== kar.e && yas(x.d, k.ay) >= 25)!;
  iliskiAl(k.ili.get(kar.o)!, n.i).t = 20;
  n.g = GUNDEM.borc;
  n.ga = k.ay;
  let t;
  for (let i = 0; i < 30 && !t; i++) {
    k.ay += 1;
    npcTeklifUret(k, k.ay);
    t = k.tp?.tk.find((x) => x.a === kar.o && x.d === "acik");
  }
  assert.ok(t, "borç isteği geldi");
  assert.equal(t.t, "npcBorc");
  assert.equal(t.g, `n${n.i}`);
  assert.ok(teklifCevap(k, kar, `t${t.i}`, "kabul", {}, k.ay).ok);
  const { olaylar } = gundemKatmanlari(k, k.ay + 1, []);
  const c = olaylar.find((o) => o.k === "olay.gundem.cozuldu");
  assert.ok(c && c.g === kar.o && c.p.sebep === "gundem.borcVerildi");
  assert.equal(n.g, GUNDEM.yok);
});

test("arka plan kalıcı (meta) ve durumda kasaba nabzı görünür", async () => {
  const an = (ay: number) => donumAni(ay) + 60_000;
  const depo = bellekDepo();
  const m = (await YerlesimMotoru.ac(depo, "kizilca", an(0)))!;
  await m.yetistir(an(6));
  assert.ok(m.kasaba.ap && m.kasaba.ap.oa === 6);
  const yeniden = (await YerlesimMotoru.ac(depo, "kizilca", an(6)))!;
  assert.deepEqual(yeniden.kasaba.ap, m.kasaba.ap);
  assert.ok(await m.sakinEkle({ hesapId: "h1", ad: "Ali", cinsiyet: "erkek", dogumAyi: -150 } as never));
  const d = (await m.durum("h1", an(6), "tr")) as { ok: true; deger: { yerlesim: { nabiz: { nufus: number } } } };
  assert.ok(d.ok && d.deger.yerlesim.nabiz.nufus > 0);
});

test("süre: şehir, 20 etkin oyuncu, 24 ay — dönüm (gündem dahil) sınırı aşmaz", () => {
  const { k, oyuncular } = etkinKasaba("demirhan", 20);
  let enUzun = 0;
  let gundem = 0;
  for (let ay = 1; ay <= 24; ay++) {
    for (const o of oyuncular) o.kz = donumAni(ay);
    const t0 = performance.now();
    const olaylar = [...ayDonumu(k, ay), ...toplumDonumu(k, ay)];
    enUzun = Math.max(enUzun, performance.now() - t0);
    gundem += olaylar.filter((o) => o.k === "olay.gundem.yeni").length;
  }
  assert.ok(enUzun < 50, `ay dönümü ${enUzun} ms`);
  assert.ok(gundem >= 24 * oyuncular.length, "her etkin oyuncuya her ay");
});
