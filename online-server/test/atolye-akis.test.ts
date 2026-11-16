// Tezgâh modeli Dilim 2 (atölye) uç ve dönüm akışı: zanaat, atölyede anlık üretim (depo, damga, levha), mesai,
// üretim emri ay dönümünde, kepenk ve muhasebe (IsletmeDO köprüsü), toplu sipariş ödülü kasaya, genişletme, devralma,
// NPC maaş tabanı ve zanaat kalite rolü; Dilim 1 küçük ekleri. Mal ve akçe ne çoğalır ne kaybolur.
import test from "node:test";
import assert from "node:assert/strict";
import { AY_MS, DUNYA_BASLANGICI_MS } from "../src/saat.ts";
import { seviyeVer } from "../src/yerlesim/beceri.ts";
import { kaliteliEkle } from "../src/yerlesim/kalite.ts";
import { ilerleme, meslekSec } from "../src/yerlesim/meslek.ts";
import { isletmeIsle, type IsletmeIleti } from "../src/mulk/islem.ts";
import { ayarYuku, isletmeKur, kalite, type Isletme } from "../src/mulk/isletme.ts";
import { edin, girisIsle, mulkDefteri, telafi } from "../src/mulk/tapu.ts";
import { cikisKapat, type CikisKaydi } from "../src/mulk/transfer.ts";
import { bosTezgah, depoAdedi } from "../src/mulk/depo.ts";
import { tezgahDonumu, tezgahKayitlariAc } from "../src/mulk/tezgah-donum.ts";
import { atolyeListesi, atolyedeUret, depoTasi, devral, dukkanListesi, emirUc, genisletUc, mesai, tezgahGorunumu, topluUc, zanaatUc } from "../src/mulk/tezgah-uclar.ts";
import { DEVRALMA_KEPENK_AY, NPC_ATOLYE_MAAS_EN_AZ, NPC_EMEK_AY, ZANAAT_DEGISIM_BEDELI } from "../src/mulk/tezgah-kurallar.ts";
import { MULK_YUVA } from "../src/mulk/kurallar.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const AY = 10;
const AN = DUNYA_BASLANGICI_MS + AY * AY_MS + 1000;
const ID = "develi.atolye.1";

function yetiskin(k: Kasaba, no: number, meslek?: string): Karakter {
  const kar = oyuncuEkle(k, no, AY - 12 * 20);
  kar.pa = 2000;
  kar.nm = [30, 30, 0, 0];
  kar.e = 900 + no;
  kar.tk = 18;
  kar.ta = AY;
  k.sakin.find((s) => s.o === kar.o)!.e = 900 + no;
  if (meslek) meslekSec(kar, meslek, AY);
  return kar;
}

function yansit(k: Kasaba, id: string, ek: Record<string, unknown> = {}): void {
  const t = mulkDefteri(k).t[id]!;
  t.y = { isletme: id, ts: t.ts, ad: "Hızar", fc: 100, seviye: 0, durum: "acik", kapi: true, kapasite: 1, it: 10, kq: 0, py: [], pn: [], po: [], to: [], as: 1, ...ek } as never;
}

function kopru(k: Kasaba) {
  const isler = new Map<string, Isletme>();
  const isle = (ileti: IsletmeIleti, an = AN) => {
    const r = isletmeIsle(isler.get(ileti.isletme), ileti, an);
    if (r.is) isler.set(ileti.isletme, r.is);
    return r.sonuc;
  };
  const teslim = (an = AN) => {
    const md = mulkDefteri(k);
    const gruplar = new Map<string, CikisKaydi[]>();
    for (const x of md.cik.k) gruplar.set(x.h, [...(gruplar.get(x.h) ?? []), x]);
    for (const [h, kayitlar] of gruplar) {
      const r = isle({ islem: "teslim", isletme: h, kayitlar }, an);
      assert.ok(r.ok);
      for (const [i, d] of r.deger.sonuclar!) {
        const kp = cikisKapat(md.cik, i, d, an);
        if (kp?.durum === "iade") telafi(k, kp.kayit);
      }
      const gelen = r.deger.teslim;
      if (gelen.length) isle({ islem: "onay", isletme: h, sonuclar: gelen.map((x) => [x.i, girisIsle(k, x, an).durum]) }, an);
    }
  };
  return { isler, isle, teslim };
}

function hazir() {
  const k = testKasabasi("develi", AY);
  const a = yetiskin(k, 1, "oduncu");
  seviyeVer(a, "oduncu.baltacilik", 1);
  ilerleme(a, "oduncu").kd = 2;
  a.be[3] = 100;
  const b = yetiskin(k, 2);
  assert.ok(edin(k, a, { tur: "atolye" }, AN, "e-0000001").ok);
  mulkDefteri(k).cik.k = [];
  yansit(k, ID);
  const br = kopru(k);
  br.isler.set(ID, isletmeKur(ID, "develi", "atolye", 1, { h: a.h, o: a.o, ad: a.ad }, mulkDefteri(k).t[ID]!.ts, AY));
  return { k, a, b, br };
}

const tz = (k: Kasaba) => ((mulkDefteri(k).tz ??= {})[ID] ??= bosTezgah());

test("zanaat: sahibin mesleğinden atanır; değişim ilk ücretsiz sonra akçe (beyliğe); yalnız sahip", () => {
  const { k, a, b } = hazir();
  assert.deepEqual(zanaatUc(k, b, ID, { meslek: "demirci" }), { ok: false, hata: "yetki_yok" });
  assert.ok(zanaatUc(k, a, ID, { meslek: "oduncu" }).ok, "ilk açılışta oduncu atanır");
  assert.equal(tz(k).za, "oduncu");
  assert.equal(tz(k).zs, undefined, "atama değişiklik sayılmaz");
  assert.ok(zanaatUc(k, a, ID, { meslek: "demirci" }).ok);
  const pa = a.pa;
  const batak = mulkDefteri(k).batak;
  const r = zanaatUc(k, a, ID, { meslek: "oduncu" });
  assert.ok(r.ok);
  assert.equal(a.pa, pa - ZANAAT_DEGISIM_BEDELI);
  assert.equal(mulkDefteri(k).batak, batak + ZANAAT_DEGISIM_BEDELI);
  const g = tezgahGorunumu(k, a, ID);
  assert.ok(g.ok);
  const at = (g.deger.atolye as { zanaat: string; zanaatDegisim: { bedel: number } });
  assert.deepEqual([at.zanaat, at.zanaatDegisim.bedel], ["oduncu", ZANAAT_DEGISIM_BEDELI]);
});

test("atölyede anlık üretim: girdi/ürün depoda, takat kişiden, kalite +5×seviye (adet artmaz), damga ve levha", () => {
  const { k, a, b } = hazir();
  assert.deepEqual(atolyedeUret(k, b, ID, { tarif: "kereste" }, { olaylar: [] }), { ok: false, hata: "yetki_yok" });
  assert.deepEqual(atolyedeUret(k, a, ID, { tarif: "nal" }, { olaylar: [] }), { ok: false, hata: "zanaat_disi" });
  assert.deepEqual(atolyedeUret(k, a, ID, { tarif: "kereste" }, { olaylar: [] }), { ok: false, hata: "girdi_yok" }, "girdi envanterden değil depodan");
  kaliteliEkle(a, "odun", [[0, 5]]);
  assert.ok(depoTasi(k, a, ID, { yon: "koy", mal: "odun", adet: 3 }).ok);
  const tk = a.tk;
  yansit(k, ID, { seviye: 4 });
  const ek = { olaylar: [] as never[], ekonomi: false };
  const r = atolyedeUret(k, a, ID, { tarif: "kereste" }, ek);
  assert.ok(r.ok, JSON.stringify(r));
  const u = r.deger.uretim as { cikti: { adet: number }; kalite: { kademe: number; dokum: { kalemler: { k: string; d: number }[] } }; atolye: { isletme: string } };
  assert.equal(u.cikti.adet, 1, "adet artmaz");
  assert.ok(u.kalite.dokum.kalemler.some((x) => x.k === "kalite.atolye" && x.d === 20));
  assert.equal(a.tk, tk - 1, "takat kişiden");
  assert.equal(a.ev?.odun, 2, "envanter değişmedi");
  assert.equal(tz(k).ev?.odun, 2);
  assert.equal(tz(k).ev?.kereste, 1);
  assert.deepEqual(tz(k).kq?.kereste?.[0]?.slice(2), [a.o, ID], "yapan + atölye damgası");
  assert.equal(tz(k).ua, AY);
  if (u.kalite.kademe >= 2) {
    assert.ok(ek.ekonomi);
    assert.deepEqual(k.ek?.lv.at(-1)?.at, [ID, "Hızar"], "levha atölye damgasıyla");
  }
});

test("mesai ve üretim emri: takat → emek 1:1; ay dönümünde işlenir, kepenk/muhasebe, emirle XP/hizmet yok", () => {
  const { k, a, b, br } = hazir();
  const md = mulkDefteri(k);
  assert.ok(zanaatUc(k, a, ID, { meslek: "oduncu" }).ok);
  assert.deepEqual(mesai(k, b, ID, { emek: 1 }), { ok: false, hata: "yetki_yok" });
  assert.deepEqual(mesai(k, a, ID, { emek: 7 }), { ok: false, hata: "havuz_dolu" }, "1 tezgâh × 6");
  const tk = a.tk;
  assert.ok(mesai(k, a, ID, { emek: 4 }).ok);
  assert.equal(a.tk, tk - 4);
  assert.equal(tz(k).eh, 4);
  assert.deepEqual(emirUc(k, b, ID, { islem: "ac", tarif: "kereste", kez: 3, istekNo: "x" }), { ok: false, hata: "yetki_yok" });
  assert.ok(emirUc(k, a, ID, { islem: "ac", tarif: "kereste", kez: 3 }).ok);
  assert.deepEqual(emirUc(k, a, ID, { islem: "ac", tarif: "kereste", kez: 1 }), { ok: false, hata: "tezgah_dolu" });
  kaliteliEkle(a, "odun", [[0, 10]]);
  assert.ok(depoTasi(k, a, ID, { yon: "koy", mal: "odun", adet: 10 }).ok);
  const hizmet = JSON.stringify(a.ms);
  // İlk dönüm: kepenkli ay değil (emir işlendi) → girdi kaydı; ikinci: emek yok, üretim yok → kepenk.
  const is = br.isler.get(ID)!;
  is.kasa = 10;
  tezgahDonumu(k, AY + 1);
  const gs = tz(k).gs as { kepenk: boolean; yapim: number; emek: { oyuncuOnce: number; oyuncuSonra: number } };
  assert.deepEqual([gs.kepenk, gs.yapim, gs.emek.oyuncuOnce - gs.emek.oyuncuSonra], [false, 3, 3]);
  assert.equal(tz(k).ev?.kereste, 3);
  assert.equal(tz(k).ev?.odun, 7);
  assert.equal(tz(k).ue, undefined, "emir bitti");
  assert.equal(tz(k).eh, 1);
  assert.equal(JSON.stringify(a.ms), hizmet, "emirle üretim meslek/hizmet vermez");
  tezgahDonumu(k, AY + 2);
  assert.equal((tz(k).gs as { kepenk: boolean }).kepenk, true);
  assert.equal(tz(k).kk, 1, "üretimsiz ve eylemsiz ay sayılır");
  tezgahDonumu(k, AY + 3);
  assert.equal(tz(k).kk, 2);
  assert.deepEqual(md.tzb![ID]!.map((e) => e[0]), [AY + 1], "yalnız üretimli ay girdi doğurur");
  tezgahKayitlariAc(k, AN);
  br.teslim(AN + 3 * AY_MS);
  assert.ok(is.df.filter((x) => x[1] === "bakim").length === 1, "yalnız üretimli ayda bakım");
  assert.equal(is.fa, 1);
});

test("toplu sipariş: dönümde açılır, atölye deposundan teslim, ödül kasaya (tezgah kaydı), üst üste alınmaz", () => {
  const { k, a, br } = hazir();
  const md = mulkDefteri(k);
  assert.ok(zanaatUc(k, a, ID, { meslek: "oduncu" }).ok);
  tezgahDonumu(k, AY + 1);
  const liste = atolyeListesi(k, a);
  const s = liste.topluSiparis[0]!;
  assert.equal(s.meslek, "oduncu");
  assert.ok(s.odul <= 84);
  k.ay = AY + 1;
  kaliteliEkle(tz(k), s.mal as never, [[0, s.adet]]);
  const once = depoAdedi(tz(k));
  const kaynak = md.kaynak ?? 0;
  const r = topluUc(k, a, ID, { siparis: s.id }, AN);
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(depoAdedi(tz(k)), once - s.adet);
  assert.equal(md.kaynak, kaynak + s.odul);
  assert.equal(tz(k).ua, AY + 1, "teslim ayı üretimli");
  const is = br.isler.get(ID)!;
  br.teslim(AN + AY_MS);
  assert.equal(is.kasa, s.odul);
  assert.ok(is.df.some((x) => x[1] === "toplu" && x[2] === s.odul));
  assert.deepEqual(topluUc(k, a, ID, { siparis: s.id }, AN), { ok: false, hata: "siparis_kapandi" });
});

test("genişletme: seviye atlayınca kapasite malzemeyle açılır; eski kayıt bugünkü seviyede; dükkânda da", () => {
  const { k, a } = hazir();
  assert.ok(zanaatUc(k, a, ID, { meslek: "oduncu" }).ok);
  assert.equal(tz(k).gk, 0);
  yansit(k, ID, { seviye: 2 });
  let g = tezgahGorunumu(k, a, ID);
  assert.ok(g.ok);
  assert.equal(g.deger.depoKapasite, 60, "seviye 2 ama genişletilmedi");
  assert.deepEqual(genisletUc(k, a, ID), { ok: false, hata: "malzeme_yok" });
  kaliteliEkle(tz(k), "kereste", [[0, 8]]);
  kaliteliEkle(tz(k), "civi", [[0, 6]]);
  assert.ok(genisletUc(k, a, ID).ok);
  g = tezgahGorunumu(k, a, ID);
  assert.ok(g.ok);
  assert.equal(g.deger.depoKapasite, 90);
  assert.equal(depoAdedi(tz(k)), 0, "malzeme depodan düştü");
  // Eski kayıt (kademe yok): bugünkü seviye verilmiş sayılır.
  delete tz(k).gk;
  yansit(k, ID, { seviye: 3 });
  g = tezgahGorunumu(k, a, ID);
  assert.ok(g.ok);
  assert.equal(g.deger.depoKapasite, 180);
});

test("atölye devralma: bütün yuvalar dolu + 60 ay etkinliksiz; depo ve bedel iade", () => {
  const { k, a } = hazir();
  const md = mulkDefteri(k);
  for (let i = 2; i <= MULK_YUVA.kasaba.atolye; i++) assert.ok(edin(k, yetiskin(k, 10 + i), { tur: "atolye" }, AN, `e-00000${10 + i}`).ok);
  md.cik.k = [];
  kaliteliEkle(tz(k), "odun", [[0, 5]]);
  tz(k).kk = DEVRALMA_KEPENK_AY;
  const d = yetiskin(k, 9);
  assert.ok(atolyeListesi(k, d).atolyeler.find((x) => x.isletme === ID)?.devralinabilir);
  const odun = a.ev?.odun ?? 0;
  const r = devral(k, d, ID, AN, "d-0000001");
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(a.ev?.odun, odun + 5);
  assert.equal(md.t[ID]!.s, d.o);
  assert.equal(md.tz![ID]!.gk, 0);
});

test("IsletmeDO: atölye kalite rolü zanaat mesleği; NPC maaş tabanı; yansı NPC emek sayısı", () => {
  const sahip = { h: "h1", o: "o1", ad: "A" };
  const is = isletmeKur(ID, "develi", "atolye", 1, sahip, 1, AY);
  const tapu = { isletme: ID, yerlesim: "develi", tur: "atolye" as const, no: 1, ts: 1, sahip, za: "demirci" as const };
  const baglam = { ...sahip, mk: { demirci: 2 as const, tuccar: 3 as const }, tv: 0 };
  let r = isletmeIsle(is, { islem: "oku", isletme: ID, tapu, baglam, tur: "panel" }, AN);
  assert.ok(r.sonuc.ok);
  assert.equal(r.is!.za, "demirci");
  assert.equal(kalite(r.is!).toplam, 2, "tüccar değil demirci kademesi");
  r = isletmeIsle(r.is, { islem: "komut", isletme: ID, tapu, baglam, alt: "personel", govde: { islem: "npc", rol: "yonetici", maas: NPC_ATOLYE_MAAS_EN_AZ - 1 }, hedef: { npc: { n: "n5", ad: "Ali" } }, istekNo: "p-0000001" }, AN);
  assert.deepEqual(r.sonuc, { ok: false, hata: "maas_npc_taban" });
  r = isletmeIsle(r.is, { islem: "komut", isletme: ID, tapu, baglam, alt: "personel", govde: { islem: "npc", rol: "yonetici", maas: NPC_ATOLYE_MAAS_EN_AZ }, hedef: { npc: { n: "n5", ad: "Ali" } }, istekNo: "p-0000002" }, AN);
  assert.deepEqual(r.sonuc, { ok: false, hata: "emanet_yetersiz" });
  r.is!.emanet = NPC_ATOLYE_MAAS_EN_AZ;
  r = isletmeIsle(r.is, { islem: "komut", isletme: ID, tapu, baglam, alt: "personel", govde: { islem: "npc", rol: "yonetici", maas: NPC_ATOLYE_MAAS_EN_AZ }, hedef: { npc: { n: "n5", ad: "Ali" } }, istekNo: "p-0000003" }, AN);
  assert.ok(r.sonuc.ok);
  assert.equal(ayarYuku(r.is!).ne, 1);
  assert.equal(NPC_EMEK_AY * 1, 2);
});

test("Dilim 1 ekleri: dükkân listesinde edinim bedeli, depo defterinde kimAd, devralma kasası olayında ad", () => {
  const { k, a, b } = hazir();
  const l = dukkanListesi(k, a);
  assert.deepEqual(l.bedel, { dukkan: 120, atolye: 150 });
  yansit(k, ID, { py: [["o2", ["musteri", "kasa"]]], po: ["o2"] });
  kaliteliEkle(tz(k), "odun", [[0, 3]]);
  assert.ok(depoTasi(k, b, ID, { yon: "al", mal: "odun", adet: 1 }, AN).ok);
  const g = tezgahGorunumu(k, a, ID);
  assert.ok(g.ok);
  assert.equal((g.deger.depoDefteri as { kimAd: string }[])[0]!.kimAd, b.ad);
  const md = mulkDefteri(k);
  const x: CikisKaydi = { i: "z:1", t: "cuzdana", h: "develi", a: 5, y: { isletme: ID, o: a.o, h: a.h, tutar: 5, neden: "devral", ad: "Eski Hızar" } } as never;
  girisIsle(k, x, AN);
  const olay = (md.ob ?? []).find((o) => o.k === "olay.tezgah.devralmaKasasi");
  assert.equal(olay?.p.ad, "Eski Hızar");
});

// ── Denge denetimi düzeltmeleri (Dilim 2) ──

function personelKomutu(k: Kasaba, a: Karakter) {
  const md = mulkDefteri(k);
  const tapu = { isletme: ID, yerlesim: "develi", tur: "atolye" as const, no: 1, ts: md.t[ID]!.ts, sahip: { h: a.h, o: a.o, ad: a.ad }, za: "oduncu" as const };
  const baglam = { h: a.h, o: a.o, ad: a.ad, mk: {}, tv: 0 };
  return (alt: "personel" | "emanet", govde: Record<string, unknown>, istekNo: string, hedef?: { npc: { n: string; ad: string } }): IsletmeIleti => ({ islem: "komut", isletme: ID, tapu, baglam, alt, govde, ...(hedef ? { hedef } : {}), istekNo });
}

/** İşletmenin çıkış kutusunu (yansı dahil) yerleşime ulaştırır. */
function yansiAkit(k: Kasaba, br: ReturnType<typeof kopru>, an = AN): void {
  const r = br.isle({ islem: "teslim", isletme: ID, kayitlar: [] }, an);
  assert.ok(r.ok);
  if (r.deger.teslim.length) br.isle({ islem: "onay", isletme: ID, sonuclar: r.deger.teslim.map((x) => [x.i, girisIsle(k, x, an).durum]) }, an);
}

test("A: maaşı karşılanmayan NPC emek vermez: emanet 0 iken 8 NPC işe alınıp dönümde bedava emek alınamaz", () => {
  const { k, a, br } = hazir();
  assert.ok(zanaatUc(k, a, ID, { meslek: "oduncu" }).ok);
  const is = br.isler.get(ID)!;
  is.kasa = 100;
  const kmt = personelKomutu(k, a);
  const al = (i: number) => br.isle(kmt("personel", { islem: "npc", rol: "yonetici", maas: NPC_ATOLYE_MAAS_EN_AZ }, `p-00000${i}`, { npc: { n: `n${i}`, ad: "N" } }));
  for (let i = 1; i <= 8; i++) assert.deepEqual(al(i), { ok: false, hata: "emanet_yetersiz" }, "emanet maaşı karşılamadan NPC alınmaz");
  // Eski kayıt / maaş artırımı ile karşılanmayan sözleşme: sözleşme var ama emek vermez, nedeni dökümde.
  is.emanet = 8 * NPC_ATOLYE_MAAS_EN_AZ;
  for (let i = 1; i <= 8; i++) assert.ok(al(i).ok);
  is.emanet = 0;
  yansiAkit(k, br);
  assert.deepEqual([mulkDefteri(k).t[ID]!.y?.ne, mulkDefteri(k).t[ID]!.y?.nt], [0, 8]);
  assert.ok(emirUc(k, a, ID, { islem: "ac", tarif: "kereste", kez: 16 }).ok);
  kaliteliEkle(a, "odun", [[0, 16]]);
  assert.ok(depoTasi(k, a, ID, { yon: "koy", mal: "odun", adet: 16 }).ok);
  tezgahDonumu(k, AY + 1);
  const gs = tz(k).gs as { yapim: number; emek: { npcVerilen: number; npcKullanilan: number } };
  assert.equal(gs.emek.npcKullanilan, 0, "maaşı ödenemeyecek NPC emek vermez");
  assert.equal(gs.yapim, 0);
  assert.deepEqual((tz(k).gs as { npc: unknown }).npc, { sozlesme: 8, emekVeren: 0, maassiz: 8, neden: "emanet_maas_yetmez" });
});

test("A: maaşı emanetten karşılanan NPC eskisi gibi çalışır; emanet birikimli olarak kaç NPC'yi karşılıyorsa o kadar", () => {
  const { k, a, br } = hazir();
  assert.ok(zanaatUc(k, a, ID, { meslek: "oduncu" }).ok);
  const is = br.isler.get(ID)!;
  is.kasa = 100;
  const kmt = personelKomutu(k, a);
  assert.ok(br.isle(kmt("emanet", { yon: "koy", tutar: 100 }, "e-0000001")).ok);
  assert.equal(is.emanet, 100);
  for (let i = 1; i <= 2; i++) assert.ok(br.isle(kmt("personel", { islem: "npc", rol: "yonetici", maas: NPC_ATOLYE_MAAS_EN_AZ }, `p-00000${i}`, { npc: { n: `n${i}`, ad: "N" } })).ok);
  assert.deepEqual(br.isle(kmt("personel", { islem: "npc", rol: "yonetici", maas: NPC_ATOLYE_MAAS_EN_AZ }, "p-0000003", { npc: { n: "n3", ad: "N" } })), { ok: false, hata: "emanet_yetersiz" });
  yansiAkit(k, br);
  assert.deepEqual([mulkDefteri(k).t[ID]!.y?.ne, mulkDefteri(k).t[ID]!.y?.nt], [2, 2]);
  assert.ok(emirUc(k, a, ID, { islem: "ac", tarif: "kereste", kez: 8 }).ok);
  kaliteliEkle(a, "odun", [[0, 8]]);
  assert.ok(depoTasi(k, a, ID, { yon: "koy", mal: "odun", adet: 8 }).ok);
  tezgahDonumu(k, AY + 1);
  let gs = tz(k).gs as { yapim: number; emek: { npcKullanilan: number }; npc: { emekVeren: number; neden: string | null } };
  assert.deepEqual([gs.emek.npcKullanilan, gs.yapim, gs.npc.emekVeren, gs.npc.neden], [2 * NPC_EMEK_AY, 2 * NPC_EMEK_AY, 2, null]);
  // Üretimli ayın kaydı maaşı öder (100 − 76 = 24): ertesi ay emanet bir NPC'yi bile karşılamaz → emek yok.
  tezgahKayitlariAc(k, AN);
  br.teslim(AN + AY_MS);
  assert.equal(is.emanet, 100 - 2 * NPC_ATOLYE_MAAS_EN_AZ);
  assert.ok(is.pr.every((s) => s.d === "etkin" && s.od === 1), "maaş ödendi, sözleşme sürüyor");
  yansiAkit(k, br, AN + AY_MS);
  assert.deepEqual([mulkDefteri(k).t[ID]!.y?.ne, mulkDefteri(k).t[ID]!.y?.nt], [0, 2]);
  tezgahDonumu(k, AY + 2);
  gs = tz(k).gs as typeof gs;
  assert.deepEqual([gs.emek.npcKullanilan, gs.npc.emekVeren, gs.npc.neden], [0, 0, "emanet_maas_yetmez"]);
});
