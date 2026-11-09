// Masa çekirdeği (saf): koltuk, sıra, sohbet, hız, susturma, sessize alma, engel, masa başı, rapor.
import test from "node:test";
import assert from "node:assert/strict";
import { ATMA_SURE_MS, ILETI_EN_UZUN, ILETI_SINIRI, KAPANIS, KOLTUK_SAYISI, iletiMetniCoz } from "../src/han/kurallar.ts";
import { ayril, baglan, baglanmaEngeli, iletiIsle, yaptirimGuncelle } from "../src/han/masa.ts";
import type { HesapYaptirimi } from "../src/tipler.ts";
import { bilet, sahteMasa, sahteSoket, type SahteSoket } from "./han-yardimci.ts";

type Masa = ReturnType<typeof sahteMasa>;

function gir(m: Masa, hesap: string, yt: HesapYaptirimi = {}): SahteSoket {
  const s = sahteSoket();
  baglan(m.baglam(), s, bilet(hesap, hesap.toUpperCase(), yt));
  m.soketler.push(s);
  return s;
}

function yolla(m: Masa, s: SahteSoket, ileti: unknown): Promise<void> {
  return iletiIsle(m.baglam(), s, JSON.stringify(ileti));
}

test("bağlanınca hoş geldin ve masa görünümü gelir; diğerlerine durum yayınlanır", () => {
  const m = sahteMasa();
  const a = gir(m, "ali");
  const hg = a.son("hosgeldin");
  assert.ok(hg);
  assert.deepEqual(hg.ben, { hesap: "ali", ad: "ALI" });
  assert.equal(hg.masa.koltuklar.length, KOLTUK_SAYISI);
  assert.equal(hg.masa.ayakta, 1);
  assert.equal(hg.susturma, null);
  gir(m, "veli");
  assert.equal(a.son("durum")?.masa.ayakta, 2);
});

test("otur: dolu koltuk reddedilir, iki kez oturulamaz, plaka koltukta görünür", async () => {
  const m = sahteMasa();
  const a = gir(m, "ali");
  const b = gir(m, "veli");
  await yolla(m, a, { t: "otur", koltuk: 2 });
  assert.deepEqual(b.son("durum")?.masa.koltuklar[2], { hesap: "ali", ad: "ALI" });
  await yolla(m, b, { t: "otur", koltuk: 2 });
  assert.equal(b.son("hata")?.hata, "koltuk_dolu");
  await yolla(m, a, { t: "otur" });
  assert.equal(a.son("hata")?.hata, "zaten_oturuyor");
  await yolla(m, b, { t: "otur", koltuk: 99 });
  assert.equal(b.son("hata")?.hata, "gecersiz_istek");
  m.ileri(1);
  await yolla(m, b, { t: "otur" });
  assert.equal(b.ek()?.k, 0, "ilk boş koltuk");
  assert.equal(b.son("durum")?.masa.masaBasi, "ali", "en eski oturan masa başı");
});

test("kalkınca koltuk boşalır; masa doluyken oturan sıraya girer ve boşalan koltuğa sıradaki geçer", async () => {
  const m = sahteMasa();
  const oturanlar: SahteSoket[] = [];
  for (let i = 0; i < KOLTUK_SAYISI; i++) {
    const s = gir(m, `o${i}`);
    await yolla(m, s, { t: "otur" });
    m.ileri(1);
    oturanlar.push(s);
  }
  const x = gir(m, "xbekler");
  const y = gir(m, "ybekler");
  await yolla(m, x, { t: "otur" });
  m.ileri(1);
  await yolla(m, y, { t: "otur" });
  const gor = y.son("durum")!.masa;
  assert.deepEqual(gor.sira.map((p) => p.hesap), ["xbekler", "ybekler"], "sıra herkese görünür");
  assert.equal(x.ek()?.k, null);

  await yolla(m, oturanlar[3]!, { t: "kalk" });
  assert.equal(oturanlar[3]!.ek()?.k, null);
  assert.equal(x.ek()?.k, 3, "sıranın başı boşalan koltuğa oturur");
  assert.equal(y.ek()?.s !== null, true);

  // Bağlantı kopunca da koltuk boşalır.
  const giden = oturanlar[0]!;
  giden.kapanis = [1006, ""];
  ayril(m.baglam(), giden);
  assert.equal(y.ek()?.k, 0);
  assert.equal(y.son("durum")?.masa.sira.length, 0);
  await yolla(m, y, { t: "kalk" });
  await yolla(m, y, { t: "kalk" });
  assert.equal(y.son("hata")?.hata, "oturmuyor");
});

test("yaz: yalnız oturan yazar; görünmez/bidi temizlenir; 240 harf sınırı", async () => {
  const m = sahteMasa();
  const a = gir(m, "ali");
  const b = gir(m, "veli");
  await yolla(m, a, { t: "yaz", metin: "selam" });
  assert.equal(a.son("hata")?.hata, "oturmuyor");
  await yolla(m, a, { t: "otur" });
  await yolla(m, a, { t: "yaz", metin: "  sel‮am​\nhancı  " });
  const ileti = b.son("ileti");
  assert.equal(ileti?.metin, "selam hancı");
  assert.equal(ileti?.koltuk, 0);
  assert.equal(a.son("ileti")?.metin, "selam hancı", "gönderen de alır");
  await yolla(m, a, { t: "yaz", metin: "x".repeat(ILETI_EN_UZUN + 1) });
  assert.equal(a.son("hata")?.hata, "metin_gecersiz");
  await yolla(m, a, { t: "yaz", metin: "​⁦" });
  assert.equal(a.son("hata")?.hata, "metin_gecersiz");
  assert.equal(iletiMetniCoz("ş".repeat(ILETI_EN_UZUN)).ok, true);
});

test("yaz hız sınırı: pencerede sınırı aşan ileti reddedilir, sonraki pencerede açılır", async () => {
  const m = sahteMasa();
  const a = gir(m, "ali");
  await yolla(m, a, { t: "otur" });
  for (let i = 0; i < ILETI_SINIRI; i++) await yolla(m, a, { t: "yaz", metin: `ileti ${i}` });
  assert.equal(a.hepsi("ileti").length, ILETI_SINIRI);
  await yolla(m, a, { t: "yaz", metin: "fazla" });
  assert.equal(a.son("hata")?.hata, "hiz_siniri");
  assert.equal(a.hepsi("ileti").length, ILETI_SINIRI);
  m.ileri(10_000);
  await yolla(m, a, { t: "yaz", metin: "yine" });
  assert.equal(a.son("ileti")?.metin, "yine");
});

test("susturulan (Y1 bayrağı) yazamaz; süresi geçince yazar; sonradan gelen yaptırım hemen işler", async () => {
  const m = sahteMasa();
  const bitis = m.simdi + 60_000;
  const a = gir(m, "ali", { susturma: { bitis } });
  assert.deepEqual(a.son("hosgeldin")?.susturma, { bitis });
  await yolla(m, a, { t: "otur" });
  await yolla(m, a, { t: "yaz", metin: "merhaba" });
  assert.deepEqual([a.son("hata")?.hata, a.son("hata")?.bitis], ["susturuldu", bitis]);
  m.ileri(61_000);
  await yolla(m, a, { t: "yaz", metin: "merhaba" });
  assert.equal(a.son("ileti")?.metin, "merhaba");

  yaptirimGuncelle(m.baglam(), "ali", { susturma: { bitis: null } });
  await yolla(m, a, { t: "yaz", metin: "bir daha" });
  assert.deepEqual([a.son("hata")?.hata, a.son("hata")?.bitis], ["susturuldu", null]);
  yaptirimGuncelle(m.baglam(), "ali", { uzaklastirma: { bitis: null } });
  assert.deepEqual(a.kapanis, [KAPANIS.uzaklastirildi, "uzaklastirildi"]);
});

test("bağlanma engeli: uzaklaştırılmış bağlanamaz, çıkarılan süre dolmadan dönemez, kapalı masa", () => {
  const m = sahteMasa();
  const b = m.baglam();
  const u = baglanmaEngeli(b, bilet("ali", "Ali", { uzaklastirma: { bitis: m.simdi + 1000 } }), undefined);
  assert.deepEqual(u, { ok: false, hata: "uzaklastirildi", bitis: m.simdi + 1000 });
  assert.equal(baglanmaEngeli(b, bilet("ali", "Ali", { uzaklastirma: { bitis: m.simdi - 1 } }), undefined), undefined);
  assert.equal(baglanmaEngeli(b, bilet("ali"), m.simdi + 5)?.hata, "atildi");
  assert.equal(baglanmaEngeli(b, bilet("ali"), m.simdi - 5), undefined);
  assert.equal(baglanmaEngeli({ ...b, ayar: { ...b.ayar, acik: false } }, bilet("ali"), undefined)?.hata, "masa_kapali");
});

test("yerel sessize alma: yalnız alan kişi o oyuncunun iletisini görmez", async () => {
  const m = sahteMasa();
  const a = gir(m, "ali");
  const b = gir(m, "veli");
  const c = gir(m, "can");
  await yolla(m, a, { t: "otur" });
  await yolla(m, b, { t: "sustur", hedef: "ali" });
  assert.deepEqual(b.son("sessiz")?.liste, ["ali"]);
  await yolla(m, a, { t: "yaz", metin: "duyan var mı" });
  assert.equal(b.son("ileti"), undefined);
  assert.equal(c.son("ileti")?.metin, "duyan var mı");
  await yolla(m, b, { t: "susturKaldir", hedef: "ali" });
  await yolla(m, a, { t: "yaz", metin: "şimdi" });
  assert.equal(b.son("ileti")?.metin, "şimdi");
  await yolla(m, b, { t: "sustur", hedef: "veli" });
  assert.equal(b.son("hata")?.hata, "kendi_hedef");
});

test("engel köprüsü: engelli çiftler birbirinin iletisini almaz", async () => {
  const m = sahteMasa({ engelliMi: async (x, y) => x === "veli" && y === "ali" });
  const a = gir(m, "ali");
  const b = gir(m, "veli");
  const c = gir(m, "can");
  await yolla(m, a, { t: "otur" });
  await yolla(m, b, { t: "otur" });
  await yolla(m, a, { t: "yaz", metin: "bir" });
  await yolla(m, b, { t: "yaz", metin: "iki" });
  assert.equal(b.hepsi("ileti").some((i) => i.hesap === "ali"), false);
  assert.equal(a.hepsi("ileti").some((i) => i.hesap === "veli"), false);
  assert.equal(c.hepsi("ileti").length, 2);
});

test("masa başı çıkarır: olay katılım listesiyle, hedef kapanır, koltuğu sıraya geçer; başkası çıkaramaz", async () => {
  const m = sahteMasa();
  const a = gir(m, "ali");
  await yolla(m, a, { t: "otur" });
  m.ileri(1);
  const b = gir(m, "veli");
  await yolla(m, b, { t: "otur" });
  const c = gir(m, "can");
  await yolla(m, c, { t: "at", hedef: "veli" });
  assert.equal(c.son("hata")?.hata, "yetki_yok");
  await yolla(m, b, { t: "at", hedef: "ali" });
  assert.equal(b.son("hata")?.hata, "yetki_yok", "masa başı en eski oturandır");
  await yolla(m, a, { t: "at", hedef: "veli" });
  assert.deepEqual(m.atmalar, [{ kim: "ali", hedef: "veli", katilim: ["ali", "veli"] }]);
  assert.deepEqual(b.kapanis, [KAPANIS.atildi, "atildi"]);
  assert.equal(c.son("olay")?.olay.tur, "atma");
  assert.equal(c.son("durum")?.masa.koltuklar[1], null);
  assert.ok(ATMA_SURE_MS > 0);
});

test("masa başı sıradakini öne alır", async () => {
  const m = sahteMasa();
  const ss: SahteSoket[] = [];
  for (let i = 0; i < KOLTUK_SAYISI; i++) {
    const s = gir(m, `o${i}`);
    await yolla(m, s, { t: "otur" });
    m.ileri(1);
    ss.push(s);
  }
  const x = gir(m, "xx");
  const y = gir(m, "yy");
  await yolla(m, x, { t: "otur" });
  m.ileri(1);
  await yolla(m, y, { t: "otur" });
  await yolla(m, ss[0]!, { t: "oneAl", hedef: "yy" });
  assert.deepEqual(x.son("durum")?.masa.sira.map((p) => p.hesap), ["yy", "xx"]);
  await yolla(m, ss[1]!, { t: "oneAl", hedef: "xx" });
  assert.equal(ss[1]!.son("hata")?.hata, "yetki_yok");
});

test("aynı hesap yeniden bağlanınca koltuğu devralır, eski bağlantı kapanır", async () => {
  const m = sahteMasa();
  const a1 = gir(m, "ali");
  await yolla(m, a1, { t: "otur", koltuk: 4 });
  await yolla(m, a1, { t: "sustur", hedef: "can" });
  const a2 = gir(m, "ali");
  assert.deepEqual(a1.kapanis, [KAPANIS.baskaBaglanti, "baska_baglanti"]);
  assert.equal(a2.ek()?.k, 4);
  assert.deepEqual(a2.ek()?.sus, ["can"]);
  assert.deepEqual(a2.son("hosgeldin")?.masa.koltuklar[4]?.hesap, "ali");
});

test("rapor: Y1 şikâyet yoluna masa önekiyle gider; hedef masada olmalı", async () => {
  const m = sahteMasa();
  const a = gir(m, "ali");
  gir(m, "veli");
  await yolla(m, a, { t: "rapor", hedef: "yok", neden: "kufur", istekNo: "rapor-00000001" });
  assert.equal(a.son("hata")?.hata, "hedef_masada_degil");
  await yolla(m, a, { t: "rapor", hedef: "ali", neden: "kufur", istekNo: "rapor-00000001" });
  assert.equal(a.son("hata")?.hata, "kendini_sikayet");
  await yolla(m, a, { t: "rapor", hedef: "veli", neden: "kufur", aciklama: "küfretti", istekNo: "rapor-00000002" });
  assert.equal(m.raporlar.length, 1);
  assert.equal(m.raporlar[0]?.kim, "ali");
  assert.deepEqual(m.raporlar[0]?.govde, {
    hedef: "veli",
    neden: "kufur",
    aciklama: "[masa:kizilca:menzil:1] küfretti",
    istekNo: "rapor-00000002",
  });
  assert.deepEqual(a.son("rapor")?.sonuc, { id: 1, durum: "acik", kalan: 4 });
});

test("bozuk çerçeve ve bilinmeyen komut hata döner; ikili çerçeve kabul edilmez", async () => {
  const m = sahteMasa();
  const a = gir(m, "ali");
  await iletiIsle(m.baglam(), a, "{bozuk");
  assert.equal(a.son("hata")?.hata, "gecersiz_istek");
  await yolla(m, a, { t: "uc" });
  assert.equal(a.son("hata")?.hata, "gecersiz_istek");
  await iletiIsle(m.baglam(), a, new ArrayBuffer(4));
  assert.equal(a.son("hata")?.hata, "gecersiz_istek");
  await iletiIsle(m.baglam(), a, "x".repeat(5000));
  assert.equal(a.son("hata")?.hata, "govde_buyuk");
});
