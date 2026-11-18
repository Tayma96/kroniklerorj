// Ekonomi denetimi B (18 Kasım): oyuncu-oyuncu aktarım kanallarının tavanları. Her bulguya bir test (B1–B7, B9–B11)
// ve 30 oyunculu "sınırsız kanal" simülasyonu (gerçek mekanizmalarla: işe al–çıkar, devir, han ödemesi).
import test from "node:test";
import assert from "node:assert/strict";
import { AY_MS, DUNYA_BASLANGICI_MS } from "../src/saat.ts";
import { meslekSec } from "../src/yerlesim/meslek.ts";
import { cikisKapat, type CikisKaydi } from "../src/mulk/transfer.ts";
import { isletmeIsle, type IsletmeIleti, type TapuOzeti } from "../src/mulk/islem.ts";
import { emanetIslem, isletmeKur, kasayaGir, personel, sahipDegis, type Baglam, type Isletme } from "../src/mulk/isletme.ts";
import { YENIDEN_ISE_ALMA_SOGUMA_AY } from "../src/mulk/kurallar.ts";
import {
  DEVIR_DEPO_ALT,
  HAN_ODEME_SERBEST_AYLIK,
  HAN_SAHIP_SERBEST_AYLIK,
  devirKabul,
  devirPompa,
  devirTeklif,
  edin,
  girisIsle,
  mulkDefteri,
  mulkluIkram,
  mulkluKira,
  tazminatTavanlari,
  telafi,
  tezgahDegeri,
} from "../src/mulk/tapu.ts";
import { bosTezgah } from "../src/mulk/depo.ts";
import { mirasMulkTasi } from "../src/mulk/miras.ts";
import { HEDIYE_ALMA_AYLIK, HEDIYE_VERME_AYLIK, aylik } from "../src/yerlesim/teklif.ts";
import { ayniKume, teveccuhEkle } from "../src/yerlesim/teveccuh.ts";
import { kumeAnahtarlari, kumeKesisir } from "../src/siyaset/makam.ts";
import { KUME_IZ_EN_COK, girisIzleri, izBirlestir, izOzeti, kumeIziCoz, kumeIziEsitle, kumeIziKaydet } from "../src/kume-izi.ts";
import { bellekDepo } from "../src/depo.ts";
import { PROFIL_ANAHTARI } from "../src/mantik.ts";
import { ZAVIYE_VER_AYLIK, zaviyeIslem } from "../src/yerlesim/lonca-grup.ts";
import { toplulukKimligiTasi } from "../src/yerlesim/topluluk.ts";
import { iadeEt } from "../src/yerlesim/pazar-tahta.ts";
import { STOK_EN_COK } from "../src/yerlesim/npc-taban.ts";
import { hanedanKasabasi } from "../src/yerlesim/hanedan.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import type { YerlesimIleti } from "../src/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";
import { cocukEkle, npcIleEvlendir } from "./hanedan-yardimci.ts";
import { devirHesapla, devirUygula } from "../src/yerlesim/devir.ts";
import { oyuncuOlumu } from "../src/yerlesim/yaslilik.ts";

const AY = 10;
const AN = DUNYA_BASLANGICI_MS + AY * AY_MS + 1000;

function baglam(kar: Pick<Karakter, "h" | "o" | "ad">, tv = 0): Baglam {
  return { h: kar.h, o: kar.o, ad: kar.ad, mk: {}, tv };
}

function ayriHane(k: Kasaba, kar: Karakter, e: number): void {
  kar.e = e;
  k.sakin.find((s) => s.o === kar.o)!.e = e;
}

function kasaba(): { k: Kasaba; a: Karakter; b: Karakter } {
  const k = testKasabasi("develi", AY);
  const a = oyuncuEkle(k, 1, AY - 12 * 20);
  const b = oyuncuEkle(k, 2, AY - 12 * 18);
  a.pa = 5000;
  a.nm = [30, 30, 30, 0];
  b.pa = 5000;
  b.nm = [30, 30, 30, 0];
  ayriHane(k, a, 901);
  ayriHane(k, b, 902);
  return { k, a, b };
}

/** Yerleşim ↔ işletme köprüsü (bellekte; mulk.test.ts deseni). */
function kopru(k: Kasaba, id: string) {
  let is: Isletme | undefined;
  const isle = (ileti: IsletmeIleti, an = AN) => {
    const r = isletmeIsle(is, ileti, an);
    is = r.is;
    return r.sonuc;
  };
  const isletmedenTeslim = (teslim: CikisKaydi[]) => {
    if (!teslim.length) return;
    const sonuclar = teslim.map((x) => [x.i, girisIsle(k, x, AN).durum] as [string, "kabul" | "red"]);
    isle({ islem: "onay", isletme: is!.id, sonuclar });
  };
  const yerlesimdenTeslim = () => {
    const md = mulkDefteri(k);
    const kayitlar = md.cik.k.filter((x) => x.h === id);
    if (!kayitlar.length) return;
    const r = isle({ islem: "teslim", isletme: id, kayitlar });
    assert.ok(r.ok);
    for (const [i, d] of r.deger.sonuclar!) {
      const kp = cikisKapat(md.cik, i, d, AN);
      if (kp?.durum === "iade") telafi(k, kp.kayit);
    }
    isletmedenTeslim(r.deger.teslim);
  };
  const tapu = (): TapuOzeti => {
    const t = mulkDefteri(k).t[id]!;
    const [y, tur, no] = id.split(".");
    return { isletme: id, yerlesim: y!, tur: tur as TapuOzeti["tur"], no: Number(no), ts: t.ts, sahip: { h: t.h, o: t.s, ad: "" }, ...(t.de ? { dv: 1 as const } : {}) };
  };
  return { get is() { return is!; }, isle, yerlesimdenTeslim, isletmedenTeslim, tapu };
}

// ── B1: işe al–çıkar tazminat döngüsü ──

test("B1: tazminat yalnız kıdemli sözleşmeye, armağan tavanıyla; aynı çifte 12 ay yeniden işe alma yok", () => {
  const sahip = { h: "hA", o: "o1", ad: "A" };
  const alt = { h: "hB", o: "o2", ad: "B" };
  const is = isletmeKur("develi.dukkan.1", "develi", "dukkan", 1, sahip, 1, AY);
  kasayaGir(is, { tutar: 10_000, neden: "yatir", o: "o1", kume: false, karsilikli: false }, AY);
  assert.ok(emanetIslem(is, baglam(sahip), { yon: "koy", tutar: 10_000 }, AY).ok);
  const ise = (ay: number, n: string) => {
    const t = personel(is, baglam(sahip), { islem: "teklif", rol: "garson", maas: 60 }, { oyuncu: { ...alt, mk: {} } }, ay, AN, `t${n}`);
    if (!t.ok) return t;
    return personel(is, baglam(alt), { islem: "kabul" }, {}, ay, AN, `k${n}`);
  };
  // Denetçinin döngüsü (aynı ayda 100 kez): artık tazminat 0, aktarım yok.
  let aktarilan = 0;
  for (let i = 0; i < 100; i++) {
    const k = ise(AY, `d${i}`);
    assert.ok(k.ok, JSON.stringify(k));
    const s = (k.deger as { sozlesme: { no: number } }).sozlesme.no;
    const c = personel(is, baglam(sahip), { islem: "cikar", sozlesme: s }, { tz: { v: 60, a: { o2: 60 } } }, AY, AN, `c${i}`);
    assert.ok(c.ok);
    aktarilan += (c.deger as { tazminat: number }).tazminat;
  }
  assert.equal(aktarilan, 0, "kıdemsiz sözleşmede tazminat yok");
  assert.equal(is.cik.k.length, 0);

  // Kıdemli (bir tam ay çalışılmış): tazminat armağan tavanına sayılır; tavan yoksa çıkarma reddedilir.
  const k1 = ise(AY, "x");
  assert.ok(k1.ok);
  const s1 = (k1.deger as { sozlesme: { no: number } }).sozlesme.no;
  assert.deepEqual(personel(is, baglam(sahip), { islem: "cikar", sozlesme: s1 }, {}, AY + 2, AN, "cx0"), { ok: false, hata: "tavan_doldu" });
  assert.deepEqual(personel(is, baglam(sahip), { islem: "cikar", sozlesme: s1 }, { tz: { v: 60, a: { o2: 10 } } }, AY + 2, AN, "cx1"), { ok: false, hata: "tavan_doldu" });
  const c1 = personel(is, baglam(sahip), { islem: "cikar", sozlesme: s1 }, { tz: { v: 60, a: { o2: 60 } } }, AY + 2, AN, "cx2");
  assert.ok(c1.ok);
  assert.equal((c1.deger as { tazminat: number }).tazminat, 60);
  const kayit = is.cik.k.find((x) => x.y.neden === "tazminat")!;
  assert.equal(kayit.y.v, "o1", "işveren armağan sayacı için kayıtta");
  // Soğuma: aynı çift 12 ay yeniden işe alınamaz (teklif ve kabul).
  assert.deepEqual(ise(AY + 3, "y"), { ok: false, hata: "aralik_dolu" });
  assert.deepEqual(ise(AY + 2 + YENIDEN_ISE_ALMA_SOGUMA_AY - 1, "z"), { ok: false, hata: "aralik_dolu" });
  assert.ok(ise(AY + 2 + YENIDEN_ISE_ALMA_SOGUMA_AY, "w").ok);

  // Yerleşim tarafı: tazminat alanın alma, işverenin verme sayacına yazılır; tavanlar buradan okunur.
  const { k, a, b } = kasaba();
  const tz0 = tazminatTavanlari(k, a.o, [b.o]);
  assert.deepEqual(tz0, { v: HEDIYE_VERME_AYLIK, a: { [b.o]: HEDIYE_ALMA_AYLIK } });
  const x: CikisKaydi = { ...kayit, y: { ...kayit.y, o: b.o, h: b.h, v: a.o } };
  const pa = b.pa;
  assert.equal(girisIsle(k, x, AN).durum, "kabul");
  assert.equal(b.pa, pa + 60);
  assert.equal(aylik(b.ha, k.ay), 60);
  assert.equal(aylik(a.hv, k.ay), 60);
  assert.deepEqual(tazminatTavanlari(k, a.o, [b.o]), { v: 0, a: { [b.o]: 0 } });
});

// ── B2: devirde kasa/emanet eski sahibe; depo malı bantta ──

test("B2: devirde kasa ve emanet satıcıya döner (alıcıya geçmez); mirasta işletmede kalır; toplam akçe korunur", () => {
  const { k, a, b } = kasaba();
  const ID = "develi.han.1";
  const br = kopru(k, ID);
  assert.ok(edin(k, a, { tur: "han" }, AN, "e-0000001").ok);
  br.yerlesimdenTeslim();
  br.is.kasa = 700;
  br.is.emanet = 300;
  const toplam = () => [...k.kar.values()].reduce((t, x) => t + x.pa, 0) + br.is.kasa + br.is.emanet + br.is.cik.k.reduce((t, x) => t + x.a, 0);
  const t0 = toplam();
  assert.ok(devirTeklif(k, a, ID, { islem: "teklif", alici: b.o, fiyat: 100 }).ok);
  const paA = a.pa;
  assert.ok(devirKabul(k, b, ID, AN, "dv-0000001").ok);
  assert.equal(mulkDefteri(k).t[ID]!.de, 1);
  br.yerlesimdenTeslim();
  assert.equal(br.is.sahip.o, b.o);
  assert.equal(br.is.kasa, 0, "alıcı kasayı almaz");
  assert.equal(br.is.emanet, 0);
  assert.equal(a.pa, paA + 100 + 1000, "fiyat + kasa + emanet satıcıya");
  assert.equal(toplam(), t0);
  // Komut yolu (tapu özeti dv:1) da aynı: sahip değişimini ilk gören komut olsa da iade olur.
  const is2 = isletmeKur("develi.dukkan.2", "develi", "dukkan", 2, { h: a.h, o: a.o, ad: a.ad }, 1, AY);
  is2.kasa = 50;
  assert.ok(sahipDegis(is2, { h: b.h, o: b.o, ad: b.ad }, 2, AY, AN, true));
  assert.equal(is2.kasa, 0);
  assert.equal(is2.cik.k[0]?.y.neden, "devir");
  assert.equal(is2.cik.k[0]?.y.o, a.o);
  // Miras (devir değil): kasa işletmede kalır.
  const is3 = isletmeKur("develi.dukkan.3", "develi", "dukkan", 3, { h: a.h, o: a.o, ad: a.ad }, 1, AY);
  is3.kasa = 50;
  assert.ok(sahipDegis(is3, { h: b.h, o: "o9", ad: "V" }, 2, AY, AN));
  assert.equal(is3.kasa, 50);
  assert.equal(is3.cik.k.length, 0);
});

test("B2: işletmeyle giden depo/raf malı adil değerle devir bandına girer (malı ucuza devretmek armağan)", () => {
  const { k, a, b } = kasaba();
  const ID = "develi.dukkan.1";
  assert.ok(edin(k, a, { tur: "dukkan" }, AN, "e-0000001").ok);
  const bos = devirPompa(k, a, b, ID, 0);
  const md = mulkDefteri(k);
  const t = ((md.tz ??= {})[ID] ??= bosTezgah());
  t.ev = { ekmek: 400 };
  const deger = tezgahDegeri(t);
  assert.ok(deger > 0);
  const dolu = devirPompa(k, a, b, ID, bos.ok ? bos.deger.bant.ust : 0);
  assert.deepEqual(dolu, { ok: false, hata: "pompa_siniri" }, "depo malı bedavaya devredilemez");
  const r = devirPompa(k, a, b, ID, Math.ceil(deger * DEVIR_DEPO_ALT) + (bos.ok ? bos.deger.bant.alt : 0));
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(r.deger.hediye, 0);
});

// ── B3: hesap kümesi izi ──

test("B3: küme izi tuzlu özettir (ham IP yok); ayniKume ve siyaset küme anahtarları onu okur", async () => {
  const gizli = "s".repeat(48);
  const i1 = await izOzeti(gizli, "ip", "203.0.113.5");
  assert.equal(i1, await izOzeti(gizli, "ip", "203.0.113.5"));
  assert.notEqual(i1, await izOzeti("t".repeat(48), "ip", "203.0.113.5"), "sır değişince özet değişir");
  assert.ok(!i1.includes("203") && /^[A-Za-z0-9_-]{16}$/.test(i1));
  assert.deepEqual(await girisIzleri(gizli, null), []);
  assert.deepEqual(izBirlestir(["a".repeat(16), "b".repeat(16)], ["a".repeat(16), "c".repeat(16), "d".repeat(16)]).length, KUME_IZ_EN_COK);
  assert.equal(kumeIziCoz(["x"]), undefined);
  assert.deepEqual(kumeIziCoz([i1]), [i1]);

  const { k, a, b } = kasaba();
  assert.equal(ayniKume(a, b), false, "ayrı hane, ayrı hesap");
  a.kk = [i1];
  b.kk = ["z".repeat(16), i1];
  assert.equal(ayniKume(a, b), true, "ortak iz: alt hesap ayrı ocakta da yakalanır");
  assert.equal(teveccuhEkle(a, b, "armagan", k.ay, 20), 0, "küme teveccüh üretemez");
  const kim = (hesap: string, kk?: string[]) => ({ hesap, yerlesim: "develi", e: 0, ...(kk ? { kk } : {}) });
  assert.equal(kumeKesisir(kumeAnahtarlari(kim("h1", [i1])), kumeAnahtarlari(kim("h2", [i1]))), true);
  assert.equal(kumeKesisir(kumeAnahtarlari(kim("h1", [i1])), kumeAnahtarlari(kim("h2"))), false);

  // HesapDO tarafı: iz kaydedilir, profilin yerleşimine bir kez yazdırılır (değişmezse yeniden gönderilmez).
  const depo = bellekDepo();
  const giden: YerlesimIleti[] = [];
  const cagir = async (i: YerlesimIleti) => (giden.push(i), { ok: true as const, deger: {} });
  await kumeIziKaydet(depo, [i1]);
  await kumeIziEsitle(depo, "hesap-1", cagir);
  assert.equal(giden.length, 0, "profil yokken gönderilmez");
  await depo.koy({ [PROFIL_ANAHTARI]: { yerlesim: "develi" } });
  await kumeIziEsitle(depo, "hesap-1", cagir);
  await kumeIziEsitle(depo, "hesap-1", cagir);
  assert.deepEqual(giden, [{ islem: "kumeIzi", yerlesim: "develi", hesapId: "hesap-1", kk: [i1] }]);
  const saklanan = JSON.stringify([...depo.veri]);
  assert.ok(saklanan.includes(i1) && !saklanan.includes("203.0.113"), "yalnız özet saklanır");
});

// ── B4 / B7: han ödemeleri ──

function hanKur() {
  const { k, a, b } = kasaba();
  const ID = "develi.han.1";
  const br = kopru(k, ID);
  a.ms = { a: "", y: "", s: {} };
  assert.ok(edin(k, a, { tur: "han" }, AN, "e-0000001").ok);
  br.yerlesimdenTeslim();
  assert.ok(meslekSec(a, "hanci", AY).ok);
  a.ms!.s.hanci!.sv = { "hanci.yatakAhir": 1 };
  return { k, a, b, ID, br };
}

test("B4: han ödemesinin armağan kısmı sahibin alma sayacına yazılır; sahibin aylık serbest geliri tavanlı", () => {
  const { k, a, b, ID } = hanKur();
  // Kişi başı serbest pay aşılınca: ödeyen verme, sahip alma sayacı.
  b.hho = [k.ay, { [ID]: HAN_ODEME_SERBEST_AYLIK }];
  const r = mulkluIkram(k, b, "serbet", AN, "i-0000001");
  assert.ok(r.ok, JSON.stringify(r));
  const f = r.deger.fiyat;
  assert.equal(aylik(b.hv, k.ay), f);
  assert.equal(aylik(a.ha, k.ay), f, "sahibin alma tavanına sayılır");
  // Sahibin toplam serbest geliri: tavana 2 kala, ilk 2 serbest, kalanı armağan.
  const c = oyuncuEkle(k, 3, AY - 12 * 30);
  c.pa = 100;
  ayriHane(k, c, 903);
  a.hsg = [k.ay, HAN_SAHIP_SERBEST_AYLIK - 2];
  const ha0 = aylik(a.ha, k.ay);
  const r2 = mulkluIkram(k, c, "serbet", AN, "i-0000002");
  assert.ok(r2.ok);
  assert.equal(aylik(a.hsg, k.ay), HAN_SAHIP_SERBEST_AYLIK);
  assert.equal(aylik(a.ha, k.ay), ha0 + r2.deger.fiyat - 2);
  // Sahibin alma tavanı dolunca han ödemesi armağan olarak geçemez.
  a.ha = [k.ay, HEDIYE_ALMA_AYLIK];
  assert.deepEqual(mulkluIkram(k, c, "serbet", AN, "i-0000003"), { ok: false, hata: "tavan_doldu" });
});

test("B7: oyuncu hanı kirası: küme ödemesi kasaya girmez; serbest payı aşan kira armağan tavanına sayılır", () => {
  const { k, a, b, ID } = hanKur();
  // Armağan: bu ay bu hana serbest payını doldurmuş kiracı.
  b.hho = [k.ay, { [ID]: HAN_ODEME_SERBEST_AYLIK }];
  const r = mulkluKira(k, b, { han: 1, oda: "yatak", sure: 1, istekNo: "k-0000001" }, AN);
  assert.ok(r.ok, JSON.stringify(r));
  const f = (r.deger.kira as { fiyat: number }).fiyat;
  assert.equal(aylik(b.hv, k.ay), f);
  assert.equal(aylik(a.ha, k.ay), f);
  assert.equal(b.hho![1][ID], HAN_ODEME_SERBEST_AYLIK + f);
  // Tavan doluysa kira tutulmaz, akçe düşmez.
  const pa = b.pa;
  b.hv = [k.ay, HEDIYE_VERME_AYLIK];
  assert.deepEqual(mulkluKira(k, b, { han: 1, oda: "yatak", sure: 3, istekNo: "k-0000002" }, AN), { ok: false, hata: "tavan_doldu" });
  assert.equal(b.pa, pa);
  // Küme (ortak iz): ödeme dünyadan çıkar.
  const c = oyuncuEkle(k, 3, AY - 12 * 30);
  c.pa = 100;
  ayriHane(k, c, 903);
  c.kk = ["q".repeat(16)];
  a.kk = ["q".repeat(16)];
  const md = mulkDefteri(k);
  const batak = md.batak;
  const cikis = md.cik.k.length;
  const rk = mulkluKira(k, c, { han: 1, oda: "yatak", sure: 1, istekNo: "k-0000003" }, AN);
  assert.ok(rk.ok, JSON.stringify(rk));
  const kv = rk.deger.kira as { fiyat: number; kasaya: number; batak: number };
  assert.deepEqual([kv.kasaya, kv.batak], [0, kv.fiyat]);
  assert.equal(md.batak, batak + kv.fiyat);
  assert.equal(md.cik.k.length, cikis, "kasaya çıkış açılmadı");
});

// ── B6: zaviye verme sayacı ──

test("B6: zaviye kasasından verme tavanı defter taşmasıyla sıfırlanmaz (ayrı sayaç)", () => {
  const k = testKasabasi("develi", 400);
  const u = Array.from({ length: 6 }, (_, i) => oyuncuEkle(k, i + 1, k.ay - 240));
  u.forEach((x, i) => {
    x.pa = 1000;
    ayriHane(k, x, 90_000 + i);
  });
  const ay0 = k.ay;
  assert.ok(zaviyeIslem(k, u[0]!, { islem: "kur", ad: "Demirciler", sekil: "kalkan", renk: "al" }, ay0).ok);
  for (const x of u.slice(1)) {
    zaviyeIslem(k, u[0]!, { islem: "davet", hedef: x.o }, ay0);
    assert.ok(zaviyeIslem(k, x, { islem: "katil", zaviye: "z1" }, ay0).ok);
  }
  const ay = ay0 + 3;
  const hedef = u[5]!;
  const pa0 = hedef.pa;
  for (const x of u.slice(1, 5)) assert.ok(zaviyeIslem(k, x, { islem: "yatir", tutar: 150 }, ay).ok);
  for (let tur = 0; tur < 20; tur++) {
    zaviyeIslem(k, u[0]!, { islem: "ver", hedef: hedef.o, tutar: 50 }, ay);
    for (let j = 0; j < 40; j++) zaviyeIslem(k, u[1 + (j % 4)]!, { islem: "yatir", tutar: 1 }, ay);
  }
  assert.equal(hedef.pa - pa0, ZAVIYE_VER_AYLIK, "aynı ayda tavan kadar");
  // B10: sayaç vârise geçer.
  const z = k.tl!.zv[0]!;
  toplulukKimligiTasi(k, hedef.o, "o99");
  assert.equal(z.vs![1]["o99"], ZAVIYE_VER_AYLIK);
  assert.equal(z.vs![1][hedef.o], undefined);
});

// ── B10: devirde tavan sayaçları ──

test("B10: ölüp vâris olarak dönmek tavan sayaçlarını ve küme izini tazelemez", () => {
  const k = testKasabasi("develi", 0);
  const kar = oyuncuEkle(k, 1, k.ay - 70 * 12);
  npcIleEvlendir(k, kar);
  cocukEkle(k, kar, 30, 0);
  const v = oyuncuEkle(k, 2, k.ay - 30 * 12);
  ayriHane(k, v, 905);
  const ay = k.ay;
  kar.ka = ay;
  kar.kn = [3, 0, 2, 0];
  kar.tz = { odun: [ay, ay - 1] };
  kar.ai = [ay, 4];
  kar.ef = [ay, 1];
  kar.hk = [ay, 5];
  kar.kk = ["k".repeat(16)];
  assert.ok(teveccuhEkle(v, kar, "armagan", ay, 15) > 0);
  oyuncuOlumu(k, kar, ay);
  const p = devirHesapla(k, kar.o, undefined, ay);
  assert.ok(p.ok, JSON.stringify(p));
  const r = devirUygula(k, p.deger, ay);
  assert.ok(r.ok);
  const yeni = r.deger.kar;
  assert.deepEqual(yeni.kn, [3, 0, 2, 0]);
  assert.deepEqual(yeni.tz, { odun: [ay, ay - 1] });
  assert.deepEqual([yeni.ai, yeni.ef, yeni.hk, yeni.kk], [[ay, 4], [ay, 1], [ay, 5], ["k".repeat(16)]]);
  assert.equal(v.tv!.c![1][yeni.o], 15, "veren başı teveccüh sayacı vârise geçti");
  assert.equal(teveccuhEkle(v, yeni, "armagan", ay, 20), 5, "çift tavanı tazelenmedi");
});

// ── B9: miras devir soğumasını korur ──

test("B9: mirasta devir soğuması (sd) taşınır", () => {
  const { k, a } = kasaba();
  const ID = "develi.han.1";
  assert.ok(edin(k, a, { tur: "han" }, AN, "e-0000001").ok);
  mulkDefteri(k).t[ID]!.sd = AY;
  const v = oyuncuEkle(k, 7, AY - 12 * 20);
  mirasMulkTasi(k, a.o, v.o, { kalemler: [{ tur: "mulk", isletmeler: [ID] }] } as never);
  assert.equal(mulkDefteri(k).t[ID]!.s, v.o);
  assert.equal(mulkDefteri(k).t[ID]!.sd, AY);
});

// ── B11: sahipsiz mal ──

test("B11: stok tavanını aşan sahipsiz mal yok olur, hazineye akçe yazılmaz", () => {
  const k = testKasabasi("develi", 10);
  k.st = { ekmek: STOK_EN_COK - 1 } as never;
  const hz0 = hanedanKasabasi(k).hz;
  const ilan = { i: 1, t: "sat", o: "o9", oa: "X", ml: "ekmek", q: 0, n: 4, n0: 4, f: 3, ac: 10, sa: 12, p: [[0, 4]], e: 0, d: "acik" } as never;
  assert.equal(iadeEt(k, ilan, undefined), 3);
  assert.equal(hanedanKasabasi(k).hz, hz0);
});

// ── Sınırsız kanal simülasyonu (denetimB/sim30 "sinirsiz" senaryosu, gerçek mekanizmalarla) ──

test("sim: 30 oyuncu 12 ay, 5 alt hesap ANA'ya işe al–çıkar tazminatı ve pompalı devirle aktarmaya çalışır: tavanlı", () => {
  const k = testKasabasi("develi", AY);
  const herkes = Array.from({ length: 30 }, (_, i) => oyuncuEkle(k, i + 1, AY - 12 * 25));
  herkes.forEach((x, i) => {
    x.pa = 2000;
    x.nm = [30, 30, 30, 0];
    ayriHane(k, x, 80_000 + i);
  });
  const ANA = herkes[0]!;
  const ALTLAR = herkes.slice(1, 6);
  // Altlar ANA ile aynı IP'den girmiş: ortak iz.
  for (const x of [ANA, ...ALTLAR]) {
    x.kk = ["ortakizortakiz00"];
    k.sakin.find((s) => s.o === x.o)!.kk = x.kk;
  }
  const toplam = () => [...k.kar.values()].reduce((t, x) => t + x.pa, 0);
  const pa0 = ANA.pa;
  let aktarilan = 0;
  const isletmeler = new Map<number, Isletme>();
  for (let ay = AY; ay < AY + 12; ay++) {
    k.ay = ay;
    const an = DUNYA_BASLANGICI_MS + ay * AY_MS + 1000;
    for (const [n, alt] of ALTLAR.entries()) {
      // (1) Alt'ın dükkânı ANA'yı işe alır, kıdemle çıkarır: tazminat ANA'ya (armağan tavanlı, 12 ay soğumalı).
      const id = `develi.dukkan.${n + 1}`;
      let is = isletmeler.get(n);
      if (!is) {
        is = isletmeKur(id, "develi", "dukkan", n + 1, { h: alt.h, o: alt.o, ad: alt.ad }, 1, AY);
        is.emanet = 1_000_000;
        isletmeler.set(n, is);
      }
      const ana = { h: ANA.h, o: ANA.o, ad: ANA.ad };
      // En kazançlı strateji: işe al, kıdem dolunca (bir tam ay) çıkar, hemen yeniden işe almayı dene.
      const s = is.pr.find((x) => x.d === "etkin" && x.k.t === "oyuncu" && x.k.o === ANA.o);
      if (!s) {
        const t = personel(is, baglam(alt), { islem: "teklif", rol: "garson", maas: 60 }, { oyuncu: { ...ana, mk: {} } }, ay, an, `t${ay}`);
        if (t.ok) assert.ok(personel(is, baglam(ANA), { islem: "kabul" }, {}, ay, an, `k${ay}`).ok);
      } else if (ay - s.b >= 2) {
        const c = personel(is, baglam(alt), { islem: "cikar", sozlesme: s.n }, { tz: tazminatTavanlari(k, alt.o, [ANA.o]) }, ay, an, `c${ay}`);
        if (c.ok) {
          for (const x of is.cik.k.splice(0)) {
            if (girisIsle(k, { ...x, y: { ...x.y, o: ANA.o } }, an).durum === "kabul") {
              alt.pa -= x.a; // emanet alt'ın akçesidir (değişmez: aktarım alttan ANA'ya)
              aktarilan += x.a;
            }
          }
        }
      }
      // (2) Pompalı devir: ortak iz aynı küme sayılır, fiyat yalnız 0 olabilir.
      assert.deepEqual(devirPompa(k, alt, ANA, id, 1000), { ok: false, hata: "ayni_kume" });
    }
  }
  const kazanc = ANA.pa - pa0;
  assert.equal(kazanc, aktarilan);
  assert.ok(aktarilan > 0, "kanal kapanmadı, tavanlandı");
  // 12 ayda: her alt-ANA çifti yılda en çok bir tazminat (≤ 60) ve ANA'nın aylık alma tavanı (60).
  assert.ok(aktarilan <= ALTLAR.length * 60, `aktarılan ${aktarilan}`);
  assert.ok(aktarilan <= 12 * HEDIYE_ALMA_AYLIK);
  // Denetçinin "sınırsız" senaryosunda (altların 20 dışı tüm akçesi: 5 × 1980) ile karşılaştırma.
  assert.ok(aktarilan < (ALTLAR.length * (2000 - 20)) / 10, "sınırsız kanalın onda birinden az");
  assert.equal(toplam(), 30 * 2000, "akçe değişmezi: aktarım yalnız el değiştirir");
});
