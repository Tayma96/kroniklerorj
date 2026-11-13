// Faz 12–13 saf kurallar: transfer protokolü, edinim şartı, kasa ↔ cüzdan (çift gönderim, yarım işlem, toplam
// akçe), yetki matrisi, maaş ve emanet, çekim tavanı, kapasite, iflas, ad/tezyin, oyuncu hanı kira/ikram, izleme.
import test from "node:test";
import assert from "node:assert/strict";
import { AY_MS, DUNYA_BASLANGICI_MS } from "../src/saat.ts";
import { meslekSec } from "../src/yerlesim/meslek.ts";
import { barinmaGorunumu, oyuncuHanOdaAcik } from "../src/yerlesim/barinma.ts";
import { bosDefter, bosKutu, cikisAc, cikisKapat, denemeErtele, girisUygula, transferDurumu, type CikisKaydi } from "../src/mulk/transfer.ts";
import { isletmeIsle, type IsletmeIleti, type TapuOzeti } from "../src/mulk/islem.ts";
import { ayIlerlet, kapasite, yetkiDurumu, type Baglam, type Isletme } from "../src/mulk/isletme.ts";
import {
  CALISAN_GUNLUK_CEKIM,
  EDINIM_FIYATI,
  IFLAS_BORC_AY,
  ROLLER,
  ROL_YETKILERI,
  SAHIP_GUNLUK_CEKIM,
  YETKILER,
} from "../src/mulk/kurallar.ts";
import { edin, girisIsle, mulkDefteri, mulkluIkram, mulkluKira, telafi, yatir } from "../src/mulk/tapu.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const AN = DUNYA_BASLANGICI_MS + 10 * AY_MS + 1000;
const AY = 10;

function hazir(): { k: Kasaba; a: Karakter; b: Karakter } {
  const k = testKasabasi("develi", AY);
  const a = oyuncuEkle(k, 1, AY - 12 * 20);
  const b = oyuncuEkle(k, 2, AY - 12 * 18);
  a.pa = 1000;
  a.nm = [20, 20, 20, 0];
  b.pa = 50;
  // Ayrı haneler (aynı ocağa düşerse küme bayrağı testleri bozulur).
  k.sakin.find((s) => s.o === "o2")!.e = 999;
  b.e = 999;
  return { k, a, b };
}

function baglam(kar: Karakter, tv = 0): Baglam {
  return { h: kar.h, o: kar.o, ad: kar.ad, mk: {}, tv };
}

/** İki tarafı bellekte konuşturur: yerleşim çıkış kutusu → işletme; işletme teslimi → yerleşim. */
function kopru(k: Kasaba) {
  let is: Isletme | undefined;
  const isle = (ileti: IsletmeIleti, an = AN) => {
    const r = isletmeIsle(is, ileti, an);
    is = r.is;
    return r.sonuc;
  };
  const yerlesimdenTeslim = () => {
    const md = mulkDefteri(k);
    const kayitlar = [...md.cik.k];
    if (!kayitlar.length) return;
    const r = isle({ islem: "teslim", isletme: kayitlar[0]!.h, kayitlar });
    assert.ok(r.ok);
    for (const [i, d] of r.deger.sonuclar!) {
      const kp = cikisKapat(md.cik, i, d, AN);
      if (kp?.durum === "iade") telafi(k, kp.kayit);
    }
    isletmedenTeslim(r.deger.teslim);
  };
  const isletmedenTeslim = (teslim: CikisKaydi[]) => {
    if (!teslim.length) return;
    const sonuclar = teslim.map((x) => [x.i, girisIsle(k, x, AN).durum] as [string, "kabul" | "red"]);
    isle({ islem: "onay", isletme: is!.id, sonuclar });
  };
  const tapu = (): TapuOzeti => {
    const t = mulkDefteri(k).t["develi.han.1"]!;
    return { isletme: "develi.han.1", yerlesim: "develi", tur: "han", no: 1, ts: t.ts, sahip: { h: t.h, o: t.s, ad: "" } };
  };
  const komut = (kar: Karakter, alt: Extract<IsletmeIleti, { islem: "komut" }>["alt"], govde: unknown, istekNo: string, ek: Partial<Extract<IsletmeIleti, { islem: "komut" }>> = {}) =>
    isle({ islem: "komut", isletme: "develi.han.1", tapu: tapu(), baglam: baglam(kar), alt, govde, istekNo, ...ek });
  return { get is() { return is!; }, isle, yerlesimdenTeslim, isletmedenTeslim, komut, tapu };
}

function toplam(k: Kasaba, is: Isletme | undefined): number {
  let t = 0;
  for (const kar of k.kar.values()) t += kar.pa;
  const md = k.mk;
  if (md) t += md.cik.k.reduce((s, x) => s + x.a, 0) + md.batak;
  if (is) t += is.kasa + is.emanet + is.cik.k.reduce((s, x) => s + x.a, 0) + is.batak - is.kaynak;
  return t;
}

test("transfer protokolü: çift teslim tek uygulanır, red telafi edilir, zaman aşımı telafi doğurmaz", () => {
  const kutu = bosKutu();
  const defter = bosDefter();
  assert.ok(cikisAc(kutu, { i: "x1", t: "kasaya", h: "is", a: 10, y: {} }, 0));
  assert.ok(cikisAc(kutu, { i: "x1", t: "kasaya", h: "is", a: 10, y: {} }, 0), "aynı kimlik ikinci kayıt açmaz");
  assert.equal(kutu.k.length, 1);
  let uygulanan = 0;
  const uygula = () => (uygulanan++, { durum: "kabul" as const });
  assert.equal(girisUygula(defter, "x1", 0, uygula).yeni, true);
  assert.equal(girisUygula(defter, "x1", 0, uygula).yeni, false);
  assert.equal(uygulanan, 1);
  denemeErtele(kutu, "x1", 0);
  assert.equal(transferDurumu(kutu, "x1"), "bekliyor", "cevapsızlık kaydı kapatmaz");
  assert.equal(cikisKapat(kutu, "x1", "kabul", 1)?.durum, "kesin");
  assert.equal(cikisKapat(kutu, "x1", "red", 1), undefined, "eşzamanlı ikinci kapanış telafi yapmaz");
  cikisAc(kutu, { i: "x2", t: "kasaya", h: "is", a: 5, y: {} }, 0);
  assert.equal(cikisKapat(kutu, "x2", "red", 2)?.durum, "iade");
});

test("edinim şartı (D-17): yaş, nam ya da lonca, akçe, yuva ve kişi sınırı", () => {
  const { k, a, b } = hazir();
  b.nm = [0, 0, 0, 0];
  assert.deepEqual(edin(k, b, { tur: "han" }, AN, "e-0000001"), { ok: false, hata: "edinim_sarti" });
  b.d = AY - 12 * 12;
  assert.deepEqual(edin(k, b, { tur: "han" }, AN, "e-0000002"), { ok: false, hata: "yas_kapisi" });
  assert.deepEqual(edin(k, a, { tur: "saray" }, AN, "e-0000003"), { ok: false, hata: "mulk_tur_gecersiz" });
  a.nm = [0, 0, 0, 0];
  assert.deepEqual(edin(k, a, { tur: "han" }, AN, "e-0000004"), { ok: false, hata: "edinim_sarti" }, "yalnız parayla alınamaz");
  a.nm = [30, 30, 0, 0];
  const r = edin(k, a, { tur: "han" }, AN, "e-0000005");
  assert.ok(r.ok);
  assert.equal(a.pa, 1000 - EDINIM_FIYATI.kasaba.han);
  assert.equal(mulkDefteri(k).cik.k[0]!.t, "kur");
  assert.deepEqual(edin(k, a, { tur: "han" }, AN, "e-0000006"), { ok: false, hata: "mulk_dolu" }, "kasabada tek han yuvası");
  assert.ok(edin(k, a, { tur: "dukkan" }, AN, "e-0000007").ok);
  assert.deepEqual(edin(k, a, { tur: "atolye" }, AN, "e-0000008"), { ok: false, hata: "mulk_siniri" });
});

test("kasa ↔ cüzdan: yarım işlem ve çift gönderim toplam akçeyi değiştirmez", () => {
  const { k, a } = hazir();
  const once = toplam(k, undefined);
  const br = kopru(k);
  assert.ok(edin(k, a, { tur: "han" }, AN, "e-0000001").ok);
  br.yerlesimdenTeslim();
  assert.equal(br.is.sahip.o, "o1");
  assert.equal(toplam(k, br.is), once);
  // Yatırma: yerleşim düştü, işletme henüz almadı (uçuşta) → toplam yine aynı.
  assert.ok(yatir(k, a, "develi.han.1", { tutar: 100 }, AN, "y-0000001").ok);
  assert.equal(toplam(k, br.is), once, "uçuştaki akçe sayılır");
  // Çift gönderim: aynı kayıt iki kez teslim edilir; kasa bir kez artar.
  const kayit = [...mulkDefteri(k).cik.k];
  br.isle({ islem: "teslim", isletme: "develi.han.1", kayitlar: kayit });
  br.yerlesimdenTeslim();
  assert.equal(br.is.kasa, 100);
  assert.equal(mulkDefteri(k).cik.k.length, 0);
  assert.equal(toplam(k, br.is), once);
  // Kasa → cüzdan: çekim kaydı açılır, yanıt kaybolur (yerleşim uygulamaz) → bekler; sonra iki kez teslim.
  const c = br.komut(a, "cek", { tutar: 40 }, "c-0000001");
  assert.ok(c.ok);
  assert.equal(br.is.kasa, 60);
  assert.equal(toplam(k, br.is), once);
  const teslim = br.is.cik.k.filter((x) => x.t === "cuzdana");
  const pa = a.pa;
  assert.equal(girisIsle(k, teslim[0]!, AN).durum, "kabul");
  assert.equal(girisIsle(k, teslim[0]!, AN).durum, "kabul");
  assert.equal(a.pa, pa + 40, "ikinci teslim para üretmez");
  // Tekrar eden komut (aynı istekNo) ikinci kez düşmez.
  assert.ok(br.komut(a, "cek", { tutar: 40 }, "c-0000001").ok);
  assert.equal(br.is.kasa, 60);
  br.isletmedenTeslim(br.is.cik.k);
  assert.equal(br.is.cik.k.length, 0);
  assert.equal(toplam(k, br.is), once);
  // Red → telafi: işletme iflas etmişse kasaya giriş reddedilir, akçe cüzdana döner.
  br.is.durum = "iflas";
  const pa2 = a.pa;
  assert.ok(yatir(k, a, "develi.han.1", { tutar: 10 }, AN, "y-0000002").ok);
  br.yerlesimdenTeslim();
  assert.equal(a.pa, pa2, "iade");
  assert.equal(toplam(k, br.is), once);
});

test("yetki matrisi: roller, tek tek yetki, vekâlet, NPC çalışan", () => {
  const { k, a, b } = hazir();
  const br = kopru(k);
  a.ms = { a: "", y: "", s: {} };
  edin(k, a, { tur: "han" }, AN, "e-0000001");
  br.yerlesimdenTeslim();
  br.is.kasa = 500;
  // Teklif ve kabul.
  const t = br.komut(a, "personel", { islem: "teklif", rol: "garson", maas: 5 }, "p-0000001", { hedef: { oyuncu: { h: b.h, o: b.o, ad: b.ad, mk: {} } } });
  assert.ok(t.ok, JSON.stringify(t));
  assert.deepEqual(br.komut(b, "cek", { tutar: 1 }, "c-0000001"), { ok: false, hata: "yetki_yok" }, "teklif çalışan yapmaz");
  assert.ok(br.komut(b, "personel", { islem: "kabul" }, "p-0000002").ok);
  const d = yetkiDurumu(br.is, "o2", AY);
  assert.equal(d.konum, "garson");
  assert.deepEqual(d.yetkiler, ROL_YETKILERI.garson);
  // Matris: garson yalnız müşteri; kasa, fiyat, tezyin, ad, personel yok.
  assert.ok(br.komut(b, "kapi", { acik: true }, "m-0000001").ok);
  for (const [alt, g] of [["cek", { tutar: 1 }], ["fiyat", { carpan: 120 }], ["tezyin", { grup: "atmosfer", secim: "luks" }], ["ad", { ad: "Garson Hanı" }], ["emanet", { yon: "koy", tutar: 1 }]] as const) {
    assert.deepEqual(br.komut(b, alt, g, `m-${alt}-0001`), { ok: false, hata: "yetki_yok" }, alt);
  }
  assert.deepEqual(br.komut(b, "personel", { islem: "npc", rol: "asci", maas: 3 }, "m-0000002", { hedef: { npc: { n: "n1", ad: "Ali" } } }), { ok: false, hata: "yetki_yok" });
  // Tek tek yetki: sahip kasa yetkisi verir; yalnız sahip yetki dağıtır.
  assert.deepEqual(br.komut(b, "personel", { islem: "yetki", sozlesme: 1, yetki: "kasa", ver: true }, "m-0000003"), { ok: false, hata: "yetki_yok" });
  assert.ok(br.komut(a, "personel", { islem: "yetki", sozlesme: 2, yetki: "kasa", ver: true }, "y-0000001").ok);
  assert.deepEqual(br.komut(b, "cek", { tutar: CALISAN_GUNLUK_CEKIM + 1 }, "c-0000002"), { ok: false, hata: "cekim_tavani" });
  assert.ok(br.komut(b, "cek", { tutar: CALISAN_GUNLUK_CEKIM }, "c-0000003").ok);
  assert.deepEqual(br.komut(b, "cek", { tutar: 1 }, "c-0000004"), { ok: false, hata: "cekim_tavani" }, "günlük tavan");
  assert.deepEqual(br.komut(a, "cek", { tutar: SAHIP_GUNLUK_CEKIM + 1 }, "c-0000005"), { ok: false, hata: "cekim_tavani" }, "sahip de tavanlı");
  // Personel yetkisi: öneri verir, işe alamaz; sahip onaylar.
  assert.ok(br.komut(a, "personel", { islem: "yetki", sozlesme: 2, yetki: "personel", ver: true }, "y-0000002").ok);
  assert.deepEqual(br.komut(b, "personel", { islem: "npc", rol: "asci", maas: 3 }, "m-0000004", { hedef: { npc: { n: "n1", ad: "Ali" } } }), { ok: false, hata: "yetki_yok" });
  const on = br.komut(b, "personel", { islem: "oner", rol: "asci", maas: 3 }, "m-0000005", { hedef: { npc: { n: "n1", ad: "Ali" } } });
  assert.ok(on.ok);
  const onay = br.komut(a, "personel", { islem: "onayla", oneri: (on.ok && (on.deger.deger as { oneri: { n: number } }).oneri.n) }, "y-0000003");
  assert.ok(onay.ok, JSON.stringify(onay));
  assert.equal(yetkiDurumu(br.is, "o2", AY).yetkiler.includes("vekalet"), false);
  // Vekâlet: süreli; vekil yönetir.
  assert.deepEqual(br.komut(a, "personel", { islem: "yetki", sozlesme: 2, yetki: "vekalet", ver: true, sure: 99 }, "y-0000004"), { ok: false, hata: "sure_gecersiz" });
  assert.ok(br.komut(a, "personel", { islem: "yetki", sozlesme: 2, yetki: "vekalet", ver: true, sure: 1 }, "y-0000005").ok);
  assert.equal(yetkiDurumu(br.is, "o2", AY).konum, "vekil");
  assert.ok(br.komut(b, "tezyin", { grup: "atmosfer", secim: "luks" }, "m-0000006").ok, "vekil tezyin yapar");
  assert.deepEqual(br.komut(b, "ad", { ad: "Vekil Hanı" }, "m-0000007"), { ok: false, hata: "yetki_yok" }, "ad yalnız sahibin");
  assert.equal(yetkiDurumu(br.is, "o2", AY + 1).konum, "garson", "vekâlet süresi biter");
  assert.equal(yetkiDurumu(br.is, "o9", AY).konum, null);
  assert.deepEqual([...YETKILER].sort(), yetkiDurumu(br.is, "o1", AY).yetkiler.sort());
  assert.ok(ROLLER.every((r) => Array.isArray(ROL_YETKILERI[r])));
});

test("maaş emanetten: ödeyen işveren öder, ödemeyen sözleşmeyi bozmuş sayılır; çıkarmada tazminat", () => {
  const { k, a, b } = hazir();
  const br = kopru(k);
  edin(k, a, { tur: "han" }, AN, "e-0000001");
  br.yerlesimdenTeslim();
  br.is.kasa = 100;
  br.komut(a, "personel", { islem: "teklif", rol: "hanci", maas: 10 }, "p-0000001", { hedef: { oyuncu: { h: b.h, o: b.o, ad: b.ad, mk: {} } } });
  br.komut(b, "personel", { islem: "kabul" }, "p-0000002");
  br.komut(a, "personel", { islem: "npc", rol: "asci", maas: 4 }, "p-0000003", { hedef: { npc: { n: "n1", ad: "Ali" } } });
  assert.deepEqual(br.komut(a, "personel", { islem: "maas", sozlesme: 2, maas: 8 }, "p-0000004"), { ok: false, hata: "maas_kesinti" });
  assert.ok(br.komut(a, "emanet", { yon: "koy", tutar: 14 }, "p-0000005").ok);
  assert.deepEqual(br.komut(a, "emanet", { yon: "al", tutar: 1 }, "p-0000006"), { ok: false, hata: "emanet_yetersiz" }, "maaş yükü bloke");
  const once = toplam(k, br.is);
  const kaynak0 = br.is.kaynak;
  ayIlerlet(br.is, AY + 1, AN + AY_MS);
  const maas = br.is.cik.k.find((x) => x.t === "cuzdana" && x.y.neden === "maas");
  assert.equal(maas?.a, 10);
  assert.equal(br.is.emanet, 0);
  const pa = b.pa;
  br.isletmedenTeslim(br.is.cik.k);
  assert.equal(b.pa, pa + 10);
  assert.ok(br.is.kaynak >= kaynak0);
  assert.equal(toplam(k, br.is), once, "maaş, bakım ve NPC geliri denetimde dengede");
  // İkinci ay emanet boş: iki sözleşme de işverence bozulur, sicil ve itibar düşer.
  const it = br.is.it;
  ayIlerlet(br.is, AY + 2, AN + 2 * AY_MS);
  assert.equal(br.is.pr.filter((s) => s.d === "bozuldu").length, 2);
  assert.equal(br.is.sicil, 2);
  assert.ok(br.is.it < it);
  // Devir önizlemesi sicili ve borcu gösterir.
  const on = br.isle({ islem: "oku", isletme: "develi.han.1", tapu: br.tapu(), baglam: baglam(b), tur: "devir" });
  assert.ok(on.ok);
  const dv = on.deger.deger as { sicil: number; borc: number; sozlesmeler: unknown[]; surum: string };
  assert.equal(dv.sicil, 2);
  assert.equal(typeof dv.surum, "string");
});

test("kapasite parayla artmaz; iflas mülkü beyliğe döndürür, karakteri silmez", () => {
  const { k, a } = hazir();
  const br = kopru(k);
  edin(k, a, { tur: "han" }, AN, "e-0000001");
  br.yerlesimdenTeslim();
  const kp = kapasite(br.is);
  br.is.kasa = 500;
  for (const [g, s] of [["mimari", "tas"], ["atmosfer", "luks"], ["aydinlatma", "avize"], ["ozelAlan", "misafirOdasi"]] as const) assert.ok(br.komut(a, "tezyin", { grup: g, secim: s }, `t-${g}-001`).ok);
  assert.equal(kapasite(br.is), kp, "tezyin kapasite vermez");
  assert.deepEqual(br.komut(a, "tezyin", { grup: "mimari", secim: "tas" }, "t-0000009"), { ok: false, hata: "tezyin_var" });
  // Ad: ilk ücretsiz, sonra ad jetonu; yasak sözcük.
  assert.deepEqual(br.komut(a, "ad", { ad: "Kervan Divanı" }, "a-0000001"), { ok: false, hata: "ad_yasak" });
  assert.ok(br.komut(a, "ad", { ad: "Kervan Konağı" }, "a-0000002").ok);
  assert.deepEqual(br.komut(a, "ad", { ad: "Yeni Konak" }, "a-0000003"), { ok: false, hata: "ad_jetonu_yok" });
  // Kasa boşalır, bakım borcu birikir → iflas.
  br.is.kasa = 0;
  br.is.kapi = false;
  ayIlerlet(br.is, AY + IFLAS_BORC_AY, AN + IFLAS_BORC_AY * AY_MS);
  assert.equal(br.is.durum, "iflas");
  br.isletmedenTeslim(br.is.cik.k);
  assert.equal(mulkDefteri(k).t["develi.han.1"], undefined, "tapu boşaldı");
  assert.ok(k.kar.get("o1"), "karakter yerinde");
  assert.deepEqual(a.nm, [20, 20, 20, 0], "nam silinmez");
});

test("oyuncu hanı: kira ve ikram kasaya, çarpanlı fiyat; aynı hane ve karşılıklı işlem izlenir", () => {
  const { k, a, b } = hazir();
  a.ms = { a: "", y: "", s: {} };
  const br = kopru(k);
  edin(k, a, { tur: "han" }, AN, "e-0000001");
  br.yerlesimdenTeslim();
  assert.ok(mulkDefteri(k).t["develi.han.1"]!.y, "yansı geldi");
  br.komut(a, "fiyat", { carpan: 150 }, "f-0000001");
  br.isletmedenTeslim(br.is.cik.k);
  const pa = b.pa;
  assert.deepEqual(barinmaGorunumu(k, b, AN, { isletme: "develi.han.1", fc: 150, seviye: 0, kapasite: 3, sahip: a }).odalar, [], "becerisiz hancı odaları kataloğa çıkaramaz");
  assert.deepEqual(mulkluKira(k, b, { oda: "yatak", sure: 1, istekNo: "k-beceri-kilitli" }, AN), { ok: false, hata: "dugum_kapali" }, "oyuncu hanında yatak becerisi olmadan oda açılamaz");

  assert.ok(meslekSec(a, "hanci", AY).ok);
  a.ms!.s.hanci!.sv = { "hanci.yatakAhir": 1 };
  assert.equal(oyuncuHanOdaAcik(a, "yatak"), true);
  assert.equal(oyuncuHanOdaAcik(a, "oda"), false, "temiz oda ayrı beceri ister");
  assert.equal(oyuncuHanOdaAcik(a, "hasOda"), false, "has oda için temiz oda ustalığı ve marangoz sinerjisi gerekir");
  const gorunumYatak = barinmaGorunumu(k, b, AN, { isletme: "develi.han.1", fc: 150, seviye: 0, kapasite: 3, sahip: a });
  assert.deepEqual(gorunumYatak.odalar.map((o) => o.oda), ["yatak"], "katalog yalnız öğrenilmiş yatak hizmetini gösterir");

  const kira = mulkluKira(k, b, { oda: "yatak", sure: 1, istekNo: "k-0000001" }, AN);
  assert.ok(kira.ok, JSON.stringify(kira));
  const kv = kira.deger.kira as { fiyat: number; batak: number; kasaya: number };
  assert.deepEqual([kv.fiyat, kv.batak, kv.kasaya], [3, 0, 3]);
  assert.equal(b.pa, pa - 3);

  a.ms!.s.hanci!.sv = { "hanci.yatakAhir": 1, "hanci.temizOda": 1 };
  assert.equal(oyuncuHanOdaAcik(a, "oda"), true, "temiz oda düğümü oda türünü açar");
  assert.equal(oyuncuHanOdaAcik(a, "hasOda"), false, "has oda için üçüncü seviye ve marangoz sinerjisi gerekir");
  const gorunumOda = barinmaGorunumu(k, b, AN, { isletme: "develi.han.1", fc: 150, seviye: 0, kapasite: 3, sahip: a });
  assert.deepEqual(gorunumOda.odalar.map((o) => o.oda), ["yatak", "oda"]);

  assert.ok(meslekSec(a, "marangoz", AY + 12).ok);
  a.ms!.s.marangoz!.sv = { "marangoz.kundekari": 1 };
  a.ms!.s.hanci!.sv = { "hanci.yatakAhir": 1, "hanci.temizOda": 3 };
  assert.equal(oyuncuHanOdaAcik(a, "hasOda"), true, "has oda iki mesleğin gerçek sinerjisiyle açılır");

  const ik = mulkluIkram(k, b, "serbet", AN, "i-0000001");
  assert.ok(ik.ok);
  assert.deepEqual([ik.deger.fiyat, ik.deger.batak, ik.deger.kasaya], [5, 0, 5]);
  br.yerlesimdenTeslim();
  assert.equal(br.is.kasa, 8);
  assert.equal(br.is.iz.s.length, 1, "sayılan müşteri");
  assert.equal(br.is.iz.b, 0);
  // Aynı haneden ödeme: kasaya girer ama sayılmaz, bayraklanır.
  b.e = a.e;
  k.sakin.find((s) => s.o === "o2")!.e = a.e;
  mulkluIkram(k, b, "ekmek", AN, "i-0000002");
  br.yerlesimdenTeslim();
  assert.equal(br.is.iz.b, 1);
  assert.equal(br.is.iz.m.at(-1)![2], "kume");
  assert.deepEqual(mulkluKira(k, a, { oda: "yatak", sure: 1, istekNo: "k-0000002" }, AN), { ok: false, hata: "kendine" });
});

test("oyuncu hanı geliri bölge vergisini kesir biriktirerek outbox'a ayırır", () => {
  const { k, a, b } = hazir();
  const br = kopru(k);
  a.ms = { a: "hanci", y: "", at: AY, s: { hanci: { kd: 0, hz: 0, cy: 0, sv: { "hanci.yatakAhir": 1 } } } };
  b.pa = 1000;
  edin(k, a, { tur: "han" }, AN, "e-vergi-0001");
  br.yerlesimdenTeslim();
  br.komut(a, "fiyat", { carpan: 100 }, "f-vergi-0001");
  br.isletmedenTeslim(br.is.cik.k);

  for (let i = 1; i <= 25; i++) {
    const r = mulkluIkram(k, b, "ekmek", AN, `ikram-vergi-${String(i).padStart(4, "0")}`, 4);
    assert.equal(r.ok, true, JSON.stringify(r));
  }
  const md = mulkDefteri(k);
  assert.equal(md.vergiGiden?.reduce((t, x) => t + x.tutar, 0), 2, "50 akçe ciroda %4 toplam 2 akçe vergi");
  assert.equal(md.vergiKesir?.["develi.han.1"], 0, "yüzde payı bir tam akçeye dönüşünce sıfırlanır");
  assert.equal(md.cik.k.reduce((t, x) => t + x.a, 0), 48, "işletme kasasına vergi sonrası net 48 akçe çıkar");
  br.yerlesimdenTeslim();
  assert.equal(br.is.kasa, 48);

  const kira = mulkluKira(k, b, { oda: "yatak", sure: 1, istekNo: "kira-vergi-0001" }, AN, 4);
  if (!kira.ok) throw new Error(JSON.stringify(kira));
  assert.equal((kira.deger.vergi as { tutar: number }).tutar, 0, "küçük tek işlemde vergi kesri birikir, erken yuvarlanmaz");
  assert.equal(mulkDefteri(k).vergiKesir?.["develi.han.1"], 8);
});
