// H8 ozan sahnesi ve ozan atışması (saf + masa çekirdeği): sahne aç/kapat/yetki, söz, anlatıcı kalkınca düşme, sahne
// yasağı, ozan işareti; atışma teklif/kabul, sıra zorlaması, kıta sonrası oylama, oy hakları, hükümsüz, berabere,
// iptal, tekrar güvenliği, depo kaydının çözümü; yerleşimde anılma ve sayısal kazanç olmadığı.
import test from "node:test";
import assert from "node:assert/strict";
import { bellekDepo } from "../src/depo.ts";
import { eylemUygula, type EylemBaglami } from "../src/han/eylem.ts";
import { MASKE } from "../src/han/filtre.ts";
import { masaBileti, type HanHesapBaglami } from "../src/han/hesap-kopru.ts";
import { VARSAYILAN_AYAR } from "../src/han/kurallar.ts";
import { atismaBaslatYayinla, baglan, iletiIsle } from "../src/han/masa.ts";
import {
  ATISMA_KITA,
  atismaSonucu,
  etkinlikCoz,
  etkinlikDenetle,
  kitaMetniCoz,
  KITA_SATIR_EN_COK,
  type AtismaDurumu,
} from "../src/han/sahne.ts";
import type { EylemGirdisi, MasaOlayi } from "../src/han/tipler.ts";
import { basarili, hata, HATA_DURUMU } from "../src/tipler.ts";
import { hanOlayiCoz, hanOlayiUygula, type HanOlayGirdisi } from "../src/yerlesim/han-olay.ts";
import { SOYLENTI_YUK } from "../src/yerlesim/soylenti.ts";
import type { Karakter } from "../src/yerlesim/tipler.ts";
import { bilet, MASA, sahteMasa, sahteSoket, type SahteSoket } from "./han-yardimci.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

import { YENI_HESAP_ILETI } from "../src/han/kurallar.ts";

type Masa = ReturnType<typeof sahteMasa>;
function gir(m: Masa, hesap: string, ozan = false): SahteSoket {
  const s = sahteSoket();
  const b = bilet(hesap, hesap.toUpperCase());
  if (ozan) b.plaka.ozan = true;
  baglan(m.baglam(), s, b);
  m.soketler.push(s);
  return s;
}
const yolla = (m: Masa, s: SahteSoket, ileti: unknown) => iletiIsle(m.baglam(), s, JSON.stringify(ileti));
async function oturt(m: Masa, ...ss: SahteSoket[]) {
  for (const s of ss) {
    await yolla(m, s, { t: "otur" });
    m.ileri(1);
  }
}
const hataKodu = (s: SahteSoket) => s.son("hata")?.hata;
const iletiSayisi = (s: SahteSoket) => s.hepsi("ileti").length;

// ---------------------------------------------------------------- sahne

test("H8 sahne: oturan açar ve anlatıcı olur; oturmayan açamaz; ikinci açılış reddedilir; ozan işareti plakada", async () => {
  const m = sahteMasa();
  const a = gir(m, "ali", true);
  const v = gir(m, "veli");
  const d = gir(m, "deli");
  await oturt(m, a, v);
  assert.equal(a.son("durum")?.masa.koltuklar[0]?.ozan, true, "ozan işareti durum yayınında");
  assert.equal(v.son("durum")?.masa.koltuklar[1]?.ozan, undefined);
  await yolla(m, d, { t: "sahneAc" });
  assert.equal(hataKodu(d), "oturmuyor");
  await yolla(m, v, { t: "sahneAc" });
  assert.deepEqual(a.son("sahne")?.sahne, { anlatici: "veli", soz: [], istek: [], acilis: m.simdi });
  assert.equal(d.son("sahne")?.sahne?.anlatici, "veli", "ayaktakiler de görür");
  await yolla(m, a, { t: "sahneAc" });
  assert.equal(hataKodu(a), "sahne_acik");
  assert.equal(HATA_DURUMU.sahne_acik, 409);
  // Yeni gelen hoşgeldinde sahneyi görür.
  const y = gir(m, "yeni");
  assert.equal(y.son("hosgeldin")?.sahne?.anlatici, "veli");
  assert.equal(y.son("hosgeldin")?.atisma, undefined);
});

test("H8 sahne: yalnız anlatıcı yazar; söz isteyen söz alınca yazar; söz geri alınır; masa başı da söz verir", async () => {
  const m = sahteMasa();
  const a = gir(m, "ali");
  const v = gir(m, "veli");
  const k = gir(m, "kara");
  await oturt(m, a, v, k); // ali masa başı
  await yolla(m, v, { t: "sahneAc" });
  await yolla(m, v, { t: "yaz", metin: "Dinleyin ey yarenler" });
  assert.equal(a.son("ileti")?.metin, "Dinleyin ey yarenler");
  const once = iletiSayisi(v);
  await yolla(m, k, { t: "yaz", metin: "ben de" });
  assert.equal(hataKodu(k), "soz_verilmedi");
  assert.equal(iletiSayisi(v), once, "sözsüz ileti yayınlanmaz");
  await yolla(m, a, { t: "yaz", metin: "masa başı da sözsüz yazamaz" });
  assert.equal(hataKodu(a), "soz_verilmedi");
  // Söz isteme (oturan): tekrar istek etkisiz.
  await yolla(m, k, { t: "sozIste" });
  await yolla(m, k, { t: "sozIste" });
  assert.deepEqual(v.son("sahne")?.sahne?.istek, ["kara"]);
  // Anlatıcı olmayan, masa başı olmayan söz veremez.
  await yolla(m, k, { t: "sozVer", hedef: "ali" });
  assert.equal(hataKodu(k), "yetki_yok");
  await yolla(m, v, { t: "sozVer", hedef: "veli" });
  assert.equal(hataKodu(v), "kendi_hedef");
  await yolla(m, v, { t: "sozVer", hedef: "kara" });
  assert.deepEqual([a.son("sahne")?.sahne?.soz, a.son("sahne")?.sahne?.istek], [["kara"], []]);
  await yolla(m, k, { t: "yaz", metin: "söz bende" });
  assert.equal(v.son("ileti")?.metin, "söz bende");
  // Anlatıcı sözü geri alır.
  await yolla(m, v, { t: "sozVer", hedef: "kara", kabul: false });
  assert.deepEqual(a.son("sahne")?.sahne?.soz, []);
  await yolla(m, k, { t: "yaz", metin: "yine" });
  assert.equal(hataKodu(k), "soz_verilmedi");
  // Masa başı (ali) da söz verir; söz alan kendi sözünü bırakabilir.
  await yolla(m, a, { t: "sozVer", hedef: "kara" });
  assert.deepEqual(v.son("sahne")?.sahne?.soz, ["kara"]);
  await yolla(m, k, { t: "sozGeri" });
  assert.deepEqual(v.son("sahne")?.sahne?.soz, []);
  await yolla(m, k, { t: "sozGeri" });
  assert.equal(hataKodu(k), "soz_istegi_yok");
  // Ayakta söz isteme düzeni sahnede de sürer (masa başı koltuğa alır).
  const ay = gir(m, "ayak");
  await yolla(m, ay, { t: "sozIste" });
  assert.deepEqual(a.son("sesDurum")?.ses.soz.map((p) => p.hesap), ["ayak"]);
});

test("H8 sahne: kapatma yalnız anlatıcı ya da masa başı; kapanınca herkes yazar; anlatıcı kalkınca/çıkınca düşer", async () => {
  const m = sahteMasa();
  const a = gir(m, "ali");
  const v = gir(m, "veli");
  const k = gir(m, "kara");
  await oturt(m, a, v, k);
  await yolla(m, v, { t: "sahneAc" });
  await yolla(m, k, { t: "sahneKapat" });
  assert.equal(hataKodu(k), "yetki_yok");
  await yolla(m, a, { t: "sahneKapat" });
  assert.equal(k.son("sahne")?.sahne, null, "masa başı kapattı");
  assert.equal(m.etkinlik, undefined);
  await yolla(m, k, { t: "yaz", metin: "serbest" });
  assert.equal(a.son("ileti")?.metin, "serbest");
  await yolla(m, k, { t: "sahneKapat" });
  assert.equal(hataKodu(k), "sahne_yok");
  // Anlatıcı kendisi kapatır.
  await yolla(m, v, { t: "sahneAc" });
  await yolla(m, v, { t: "sahneKapat" });
  assert.equal(a.son("sahne")?.sahne, null);
  // Anlatıcı kalkarsa düşer; söz alan kalkarsa sözü silinir.
  await yolla(m, k, { t: "sahneAc" });
  await yolla(m, k, { t: "sozVer", hedef: "veli" });
  await yolla(m, v, { t: "kalk" });
  assert.deepEqual(m.etkinlik && m.etkinlik.tur === "sahne" ? m.etkinlik.soz : null, [], "kalkanın sözü silinir");
  await yolla(m, k, { t: "kalk" });
  assert.equal(a.son("sahne")?.sahne, null, "anlatıcı kalkınca sahne biter");
  assert.equal(m.etkinlik, undefined);
  // Anlatıcının bağlantısı kapanırsa (masadan çıkarsa) düşer.
  await oturt(m, k);
  await yolla(m, k, { t: "sahneAc" });
  k.kapanis = [1000, "test"];
  const { ayril } = await import("../src/han/masa.ts");
  ayril(m.baglam(), k);
  assert.equal(a.son("sahne")?.sahne, null);
  assert.equal(m.etkinlik, undefined);
});

test("H8 sahne: masa başının moderasyonu sürer (at, sustur); anlatıcı atılınca sahne biter", async () => {
  const m = sahteMasa();
  const a = gir(m, "ali");
  const v = gir(m, "veli");
  await oturt(m, a, v);
  await yolla(m, v, { t: "sahneAc" });
  await yolla(m, a, { t: "at", hedef: "veli" });
  assert.equal(m.atmalar.length, 1);
  assert.equal(a.son("sahne")?.sahne, null);
  assert.equal(m.etkinlik, undefined);
  // Y1 susturmalı oturan sahne açamaz.
  const s = sahteSoket();
  baglan(m.baglam(), s, bilet("sus", "SUS", { susturma: { bitis: null } }));
  m.soketler.push(s);
  await oturt(m, s);
  await yolla(m, s, { t: "sahneAc" });
  assert.equal(hataKodu(s), "susturuldu");
});

test("H8 sahne yasağı: masa başı ayarı; açık sahne kapanır; yasakken açılamaz; son oturan kalkınca sıfırlanır", async () => {
  const m = sahteMasa();
  const a = gir(m, "ali");
  const v = gir(m, "veli");
  await oturt(m, a, v);
  await yolla(m, v, { t: "sahneAc" });
  await yolla(m, v, { t: "ayar", sahneYasak: true });
  assert.equal(hataKodu(v), "yetki_yok");
  await yolla(m, a, { t: "ayar", sahneYasak: "evet" });
  assert.equal(hataKodu(a), "gecersiz_istek");
  await yolla(m, a, { t: "ayar", sahneYasak: true });
  assert.equal(v.son("durum")?.masa.ayar.sahneYasak, true);
  assert.equal(v.son("sahne")?.sahne, null, "açık sahne kapanır");
  await yolla(m, v, { t: "sahneAc" });
  assert.equal(hataKodu(v), "sahne_yasak");
  const yazim = m.ayarYazimlari.length;
  await yolla(m, a, { t: "ayar", sahneYasak: true });
  assert.equal(m.ayarYazimlari.length, yazim, "değişmeyen ayar yazılmaz");
  await yolla(m, a, { t: "ayar", sahneYasak: false });
  assert.equal("sahneYasak" in (v.son("durum")?.masa.ayar ?? {}), false, "izinli sahne ayarda alan bırakmaz (eski istemciyle aynı)");
  await yolla(m, a, { t: "ayar", sahneYasak: true });
  await yolla(m, a, { t: "kalk" });
  await yolla(m, v, { t: "kalk" });
  assert.equal(m.ayar.sahneYasak, undefined, "son oturan kalkınca yasak düşer");
});

test("H8 sahne yokken eski davranış aynen: sozIste oturanda zaten_oturuyor, yaz serbest, durum ayarında yeni alan yok", async () => {
  const m = sahteMasa();
  const a = gir(m, "ali");
  const v = gir(m, "veli");
  await oturt(m, a, v);
  await yolla(m, v, { t: "sozIste" });
  assert.equal(hataKodu(v), "zaten_oturuyor");
  await yolla(m, v, { t: "yaz", metin: "selam" });
  assert.equal(a.son("ileti")?.metin, "selam");
  assert.deepEqual(Object.keys(a.son("durum")!.masa.ayar).sort(), ["acik", "kavgaYasak", "kilitli", "sesli", "tur"]);
  assert.equal(a.hepsi("sahne").length + a.hepsi("atisma").length, 0);
  assert.equal("sahne" in a.son("hosgeldin")!, false);
});

// ---------------------------------------------------------------- atışma teklifi (eylem)

const SIMDI = 1_800_000_000_000;
function eylemBaglami(ek: Partial<EylemBaglami> = {}): EylemBaglami {
  return {
    masa: MASA,
    oturanlar: [
      { hesap: "ali", koltuk: 0, o: 100 },
      { hesap: "veli", koltuk: 1, o: 200 },
    ],
    ayar: { ...VARSAYILAN_AYAR },
    simdi: SIMDI,
    engelliMi: async () => false,
    ...ek,
  };
}
let istek = 0;
const girdi = (e: Partial<EylemGirdisi> & Pick<EylemGirdisi, "tur">): EylemGirdisi => ({ masa: 1, istekNo: `atisma-${String(++istek).padStart(6, "0")}`, ...e });

test("H8 atışma teklifi: rızalı (yalnız hedef kabul eder); masa meşgulken reddedilir; taraf kalkınca düşer; tekrar güvenli", async () => {
  const depo = bellekDepo();
  const meşgul = await eylemUygula(depo, "ali", girdi({ tur: "atisma", hedef: "veli" }), eylemBaglami({ mesgul: true }));
  assert.equal(meşgul.ok ? "" : meşgul.hata, "masa_mesgul");
  const t = await eylemUygula(depo, "ali", girdi({ tur: "atisma", hedef: "veli" }), eylemBaglami());
  assert.ok(t.ok);
  assert.equal(t.deger.olay.durum, "teklif");
  const kendi = await eylemUygula(depo, "ali", girdi({ tur: "kabul", olay: t.deger.olay.no }), eylemBaglami());
  assert.equal(kendi.ok ? "" : kendi.hata, "olay_yok");
  const mesgulKabul = await eylemUygula(depo, "veli", girdi({ tur: "kabul", olay: t.deger.olay.no }), eylemBaglami({ mesgul: true }));
  assert.equal(mesgulKabul.ok ? "" : mesgulKabul.hata, "masa_mesgul");
  const yeniden = eylemBaglami({ oturanlar: [{ hesap: "ali", koltuk: 2, o: 300 }, { hesap: "veli", koltuk: 1, o: 200 }] });
  const dustu = await eylemUygula(depo, "veli", girdi({ tur: "kabul", olay: t.deger.olay.no }), yeniden);
  assert.equal(dustu.ok ? "" : dustu.hata, "teklif_dustu");
  const gi = girdi({ tur: "kabul", olay: t.deger.olay.no });
  const k = await eylemUygula(depo, "veli", gi, eylemBaglami());
  assert.ok(k.ok);
  assert.deepEqual([k.deger.olay.teklifTur, k.deger.olay.kim, k.deger.olay.hedef, k.deger.yeni], ["atisma", "veli", "ali", true]);
  const tekrar = await eylemUygula(depo, "veli", gi, eylemBaglami({ mesgul: true }));
  assert.ok(tekrar.ok && !tekrar.deger.yeni, "aynı istekNo aynı kabulü döner");
  // Engelliye teklif edilemez.
  const engel = await eylemUygula(depo, "ali", girdi({ tur: "atisma", hedef: "veli" }), eylemBaglami({ engelliMi: async () => true }));
  assert.equal(engel.ok ? "" : engel.hata, "engelli");
});

// ---------------------------------------------------------------- atışma (masa)

function kabulOlayi(no: number, teklif = 1, a = "ali", b = "veli"): MasaOlayi {
  return { no, masa: MASA, tur: "kabul", kim: b, hedef: a, olay: teklif, teklifTur: "atisma", zaman: SIMDI, katilim: [] };
}

async function atismaKur(dinleyici = 2) {
  const m = sahteMasa();
  const a = gir(m, "ali");
  const v = gir(m, "veli");
  const d = Array.from({ length: dinleyici }, (_, i) => gir(m, `dinle${i}`));
  await oturt(m, a, v, ...d);
  assert.equal(atismaBaslatYayinla(m.baglam(), kabulOlayi(2)), true);
  return { m, a, v, d };
}
async function kitalar(m: Masa, a: SahteSoket, v: SahteSoket) {
  for (let i = 0; i < ATISMA_KITA; i++) {
    await yolla(m, a, { t: "kita", metin: `A kıtası ${i + 1}\nikinci dize` });
    await yolla(m, v, { t: "kita", metin: `B kıtası ${i + 1}` });
  }
}

test("H8 atışma: kabulde başlar (ilk kıta teklif edenin); sıra zorlanır; dinleyici ve sırası olmayan yazamaz/söz isteyemez", async () => {
  const { m, a, v, d } = await atismaKur();
  const dn = d[0]!;
  assert.deepEqual(dn.son("atisma")?.atisma, { olay: 1, a: "ali", b: "veli", kita: 0, toplam: 2 * ATISMA_KITA, sira: "ali", asama: "kita", hak: [], oyVeren: [] });
  assert.equal(atismaBaslatYayinla(m.baglam(), kabulOlayi(3)), false, "ikinci atışma başlamaz");
  // Atışma sürerken giren yeni hesap (24 sa): kıta sınırı hoş geldinde hem üstte hem atışma görünümünde.
  const genc = sahteSoket();
  baglan(m.baglam(), genc, { ...bilet("genc", "GENC"), ho: m.simdi - 60_000 });
  m.soketler.push(genc);
  assert.equal(genc.son("hosgeldin")?.kitaEnCok, YENI_HESAP_ILETI * 2);
  assert.equal(genc.son("hosgeldin")?.atisma?.kitaEnCok, YENI_HESAP_ILETI * 2);
  assert.equal(dn.son("hosgeldin")?.atisma?.kitaEnCok, undefined, "eski hesapta alan yok");
  await yolla(m, v, { t: "kita", metin: "önce ben" });
  assert.equal(hataKodu(v), "sira_degil");
  await yolla(m, dn, { t: "kita", metin: "ben de" });
  assert.equal(hataKodu(dn), "taraf_degil");
  for (const s of [a, v, dn]) {
    await yolla(m, s, { t: "yaz", metin: "laf" });
    assert.equal(hataKodu(s), "atisma_suruyor");
  }
  assert.equal(dn.hepsi("ileti").length, 0);
  await yolla(m, dn, { t: "sozIste" });
  assert.equal(hataKodu(dn), "atisma_suruyor");
  await yolla(m, dn, { t: "sahneAc" });
  assert.equal(hataKodu(dn), "masa_mesgul");
  await yolla(m, dn, { t: "oy", hedef: "ali" });
  assert.equal(hataKodu(dn), "oylama_kapali");
  // Küfür maskesi kıtaya da uygulanır; satırlar korunur.
  await yolla(m, a, { t: "kita", metin: "what the FUCK man\nikinci dize" });
  const k1 = dn.son("kita")!;
  assert.deepEqual([k1.hesap, k1.sira, k1.metin], ["ali", 1, `what the ${MASKE} man\nikinci dize`]);
  // Tekrar (aynı kıta iki kez): ikincisi sırası olmadığından reddedilir, sayı bozulmaz.
  await yolla(m, a, { t: "kita", metin: "what the FUCK man\nikinci dize" });
  assert.equal(hataKodu(a), "sira_degil");
  assert.equal(dn.son("atisma")?.atisma?.kita, 1);
  assert.equal(dn.son("atisma")?.atisma?.sira, "veli");
});

test("H8 kıta metni: boş, çok satırlı ve çok uzun reddedilir", () => {
  assert.equal(kitaMetniCoz("").ok, false);
  assert.equal(kitaMetniCoz(" \n \n").ok, false);
  assert.equal(kitaMetniCoz(Array.from({ length: KITA_SATIR_EN_COK + 1 }, () => "dize").join("\n")).ok, false);
  assert.equal(kitaMetniCoz("a".repeat(401)).ok, false);
  assert.equal(kitaMetniCoz(5).ok, false);
  const r = kitaMetniCoz("  bir \r\n\n iki  ");
  assert.ok(r.ok);
  assert.equal(r.deger, "bir\niki");
});

test("H8 atışma: 3+3 kıtadan sonra oylama; taraf oy veremez; çift oy reddi; sonradan oturan oy veremez; herkes oyunca sonuç", async () => {
  const { m, a, v, d } = await atismaKur(3);
  await kitalar(m, a, v);
  const g = d[0]!.son("atisma")!.atisma!;
  assert.deepEqual([g.asama, g.kita, g.sira, g.hak], ["oylama", 6, null, ["dinle0", "dinle1", "dinle2"]]);
  await yolla(m, a, { t: "kita", metin: "bir daha" });
  assert.equal(hataKodu(a), "oylama_kapali");
  await yolla(m, a, { t: "oy", hedef: "ali" });
  assert.equal(hataKodu(a), "oy_hakki_yok");
  await yolla(m, v, { t: "oy", hedef: "ali" });
  assert.equal(hataKodu(v), "oy_hakki_yok");
  // Oylamada serbest sohbet açılır.
  await yolla(m, d[0]!, { t: "yaz", metin: "güzel atıştılar" });
  assert.equal(a.son("ileti")?.metin, "güzel atıştılar");
  const sonra = gir(m, "gec");
  await oturt(m, sonra);
  await yolla(m, sonra, { t: "oy", hedef: "ali" });
  assert.equal(hataKodu(sonra), "oy_hakki_yok");
  await yolla(m, d[0]!, { t: "oy", hedef: "kimse" });
  assert.equal(hataKodu(d[0]!), "gecersiz_istek");
  await yolla(m, d[0]!, { t: "oy", hedef: "veli" });
  await yolla(m, d[0]!, { t: "oy", hedef: "ali" });
  assert.equal(hataKodu(d[0]!), "oy_verildi", "oy değiştirilemez");
  assert.deepEqual(a.son("atisma")?.atisma?.oyVeren, ["dinle0"]);
  assert.equal("oy" in (a.son("atisma")?.atisma ?? {}), false, "oy dağılımı oylama bitene kadar gösterilmez");
  await yolla(m, d[1]!, { t: "oy", hedef: "veli" });
  assert.equal(m.anilanlar.length, 0);
  await yolla(m, d[2]!, { t: "oy", hedef: "ali" });
  const son = a.son("atisma")!;
  assert.equal(son.atisma, null);
  assert.deepEqual(son.son, { olay: 1, a: "ali", b: "veli", sonuc: "kazandi", kazanan: ["veli"], oy: [1, 2] });
  assert.equal(m.anilanlar.length, 1);
  assert.deepEqual(m.anilanlar[0]!.katilim, ["ali", "veli", "dinle0", "dinle1", "dinle2", "gec"]);
  assert.equal(m.etkinlik, undefined);
  await yolla(m, d[1]!, { t: "oy", hedef: "ali" });
  assert.equal(hataKodu(d[1]!), "atisma_yok", "bitmiş atışmaya oy verilemez");
});

test("H8 atışma: eşitlikte berabere (ikisi anılır); oy yoksa hükümsüz; oy hakkı olan kimse yoksa hemen hükümsüz", async () => {
  {
    const { m, a, v, d } = await atismaKur(2);
    await kitalar(m, a, v);
    await yolla(m, d[0]!, { t: "oy", hedef: "ali" });
    await yolla(m, d[1]!, { t: "oy", hedef: "veli" });
    assert.deepEqual(a.son("atisma")?.son, { olay: 1, a: "ali", b: "veli", sonuc: "berabere", kazanan: ["ali", "veli"], oy: [1, 1] });
    assert.equal(m.anilanlar[0]?.sonuc.sonuc, "berabere");
  }
  {
    const { m, a, v, d } = await atismaKur(2);
    await kitalar(m, a, v);
    await yolla(m, d[0]!, { t: "atismaKapat" });
    assert.equal(hataKodu(d[0]!), "yetki_yok", "dinleyici kapatamaz");
    await yolla(m, v, { t: "atismaKapat" });
    assert.deepEqual(a.son("atisma")?.son?.sonuc, "hukumsuz");
    assert.deepEqual(a.son("atisma")?.son?.kazanan, []);
    assert.equal(m.anilanlar[0]?.sonuc.sonuc, "hukumsuz", "hükümsüz de masa kaydına geçer (kazanan yok)");
  }
  {
    const { m, a, v } = await atismaKur(0);
    await kitalar(m, a, v);
    assert.equal(a.son("atisma")?.son?.sonuc, "hukumsuz", "dinleyici yoksa son kıtayla biter");
  }
  {
    // Oylamada masa başı kapatırsa o anki oylarla sonuçlanır.
    const m = sahteMasa();
    const bas = gir(m, "bas");
    const a = gir(m, "ali");
    const v = gir(m, "veli");
    const d = gir(m, "dinle");
    const e = gir(m, "dinle2");
    await oturt(m, bas, a, v, d, e);
    atismaBaslatYayinla(m.baglam(), kabulOlayi(2));
    await kitalar(m, a, v);
    await yolla(m, d, { t: "oy", hedef: "ali" });
    await yolla(m, bas, { t: "atismaKapat" });
    assert.deepEqual(a.son("atisma")?.son?.kazanan, ["ali"]);
  }
});

test("H8 atışma: taraf kalkınca ya da kıta aşamasında kapatılınca iptal (anılma yok); oylamada kalkan dinleyici hakkını yitirir", async () => {
  {
    const { m, a, v, d } = await atismaKur(1);
    await yolla(m, a, { t: "kita", metin: "bir" });
    await yolla(m, v, { t: "kalk" });
    assert.deepEqual(d[0]!.son("atisma")?.son?.sonuc, "iptal");
    assert.equal(d[0]!.son("atisma")?.atisma, null);
    assert.equal(m.anilanlar.length, 0);
    await yolla(m, d[0]!, { t: "yaz", metin: "serbest" });
    assert.equal(a.son("ileti")?.metin, "serbest", "iptalden sonra kilit kalmaz");
  }
  {
    const { m, a, d } = await atismaKur(1);
    await yolla(m, d[0]!, { t: "atismaKapat" });
    assert.equal(hataKodu(d[0]!), "yetki_yok");
    await yolla(m, a, { t: "atismaKapat" });
    assert.equal(d[0]!.son("atisma")?.son?.sonuc, "iptal");
    assert.equal(m.anilanlar.length, 0);
  }
  {
    const { m, a, v, d } = await atismaKur(2);
    await kitalar(m, a, v);
    await yolla(m, d[0]!, { t: "oy", hedef: "ali" });
    await yolla(m, d[1]!, { t: "kalk" });
    assert.deepEqual(a.son("atisma")?.son, { olay: 1, a: "ali", b: "veli", sonuc: "kazandi", kazanan: ["ali"], oy: [1, 0] }, "kalan herkes oy verdiyse biter");
  }
  {
    // Taraf at ile çıkarılırsa da iptal.
    const m = sahteMasa();
    const bas = gir(m, "bas");
    const a = gir(m, "ali");
    const v = gir(m, "veli");
    await oturt(m, bas, a, v);
    atismaBaslatYayinla(m.baglam(), kabulOlayi(2));
    await yolla(m, bas, { t: "at", hedef: "ali" });
    assert.equal(v.son("atisma")?.son?.sonuc, "iptal");
  }
});

test("H8 depo kaydı: bozuk kayıt yok sayılır; uyanışta taraf ya da anlatıcı oturmuyorsa temizce düşer", () => {
  assert.equal(etkinlikCoz(undefined), undefined);
  assert.equal(etkinlikCoz({ tur: "atisma", a: "ali" }), undefined);
  assert.equal(etkinlikCoz({ tur: "sahne", an: "", ao: 1, soz: [], istek: [], z: 1 }), undefined);
  const d: AtismaDurumu = { tur: "atisma", olay: 1, a: "ali", b: "veli", oa: 10, ob: 20, kita: 6, oylama: { hak: ["x"], oy: { x: "ali", sahte: "kimse" } } };
  const c = etkinlikCoz(JSON.parse(JSON.stringify(d)));
  assert.deepEqual(c, { ...d, oylama: { hak: ["x"], oy: { x: "ali" } } }, "geçersiz oy kaydı ayıklanır");
  const r = etkinlikDenetle(c, [{ hesap: "ali", o: 10 }]);
  assert.equal(r.durum, undefined);
  assert.equal(r.sonuc?.sonuc, "iptal");
  const yeniden = etkinlikDenetle(c, [{ hesap: "ali", o: 10 }, { hesap: "veli", o: 99 }]);
  assert.equal(yeniden.sonuc?.sonuc, "iptal", "yeniden oturan taraf aynı oturuş değildir");
  const tamam = etkinlikDenetle(c, [{ hesap: "ali", o: 10 }, { hesap: "veli", o: 20 }, { hesap: "x", o: 5 }]);
  assert.equal(tamam.sonuc?.sonuc, "kazandi", "uyanışta oylama tamamsa sonuçlanır");
  const sahne = etkinlikDenetle({ tur: "sahne", an: "ali", ao: 10, soz: ["veli"], istek: [], z: 1 }, [{ hesap: "veli", o: 20 }]);
  assert.deepEqual([sahne.durum, sahne.degisti], [undefined, true]);
  assert.equal(atismaSonucu({ ...d, oylama: undefined }).sonuc, "iptal");
});

// ---------------------------------------------------------------- yerleşimde anılma

function kur() {
  const k = testKasabasi("develi", 400);
  const a = oyuncuEkle(k, 1, k.ay - 20 * 12);
  const b = oyuncuEkle(k, 2, k.ay - 25 * 12);
  const c = oyuncuEkle(k, 3, k.ay - 30 * 12);
  const haneler = [...new Set(k.npc.map((n) => n.e).filter((e) => e !== 0))];
  const hane = (x: Karakter, e: number) => {
    x.e = e;
    k.sakin.find((s) => s.o === x.o)!.e = e;
  };
  hane(a, haneler[0]!);
  hane(b, haneler[1]!);
  hane(c, haneler[2]!);
  return { k, a, b, c, kisiler: new Map([a, b, c].map((x) => [x.h, x])) };
}
let sira = 0;
function sonucOlayi(kim: Karakter, hedef: Karakter, sonuc: "kazandi" | "berabere", katilim: string[]): HanOlayGirdisi {
  return { anahtar: `masa:develi:han:1#${++sira}`, masaNo: 1, tur: "atismaSonuc", kim: kim.h, hedef: hedef.h, katilim, sonuc, oy: [2, 1] };
}

test("H8 anılma: kazanana tanıklık ve söylenti; berabere ikisi anılır; sayısal hiçbir şey değişmez; ayda bir söylenti", () => {
  const { k, a, b, c, kisiler } = kur();
  const once = JSON.stringify([...k.kar.values()]);
  const r = hanOlayiUygula(k, sonucOlayi(a, b, "kazandi", [a.h, b.h, c.h]), kisiler, k.ay);
  assert.ok(r.ok);
  assert.deepEqual(r.deger.degisen, [], "hiçbir karakter yazılmaz");
  assert.equal(JSON.stringify([...k.kar.values()]), once, "akçe, nam, takat, teveccüh, XP değişmez");
  assert.equal(r.deger.etki.nam, undefined);
  assert.deepEqual(new Set(r.deger.olaylar.map((o) => o.g)), new Set([a.o, b.o, c.o]));
  assert.ok(r.deger.olaylar.every((o) => o.k === "olay.han.atismaKazandi" && o.w === a.o && o.p.oyA === 2 && o.p.oyB === 1));
  assert.deepEqual(r.deger.etki.soylenti, ["hanAtisma"]);
  assert.equal(SOYLENTI_YUK.hanAtisma, 0, "söylentinin bakışa etkisi yok");
  const ikinci = hanOlayiUygula(k, sonucOlayi(b, a, "berabere", [a.h, b.h]), kisiler, k.ay);
  assert.ok(ikinci.ok);
  assert.equal(ikinci.deger.etki.engel, "ayda_bir", "aynı çift ayda bir söylenti");
  assert.equal(ikinci.deger.olaylar.length, 2, "tanıklık yine yazılır");
  const ber = hanOlayiUygula(k, sonucOlayi(a, c, "berabere", [a.h, c.h]), kisiler, k.ay);
  assert.ok(ber.ok);
  assert.deepEqual(ber.deger.etki.soylenti, ["hanAtisma", "hanAtisma"], "berabere: ikisi de anılır");
  assert.ok(ber.deger.olaylar.every((o) => o.k === "olay.han.atismaBerabere"));
  assert.equal(JSON.stringify([...k.kar.values()]), once);
});

test("H8 anılma iletisi: atismaSonuc sonuç ister; kabul atisma yalnız tanıklık; olay sahibi gönderen olmalı", () => {
  const { k, a, b, kisiler } = kur();
  const olay = { masa: "masa:develi:han:1", no: 9, tur: "atismaSonuc", kim: a.h, hedef: b.h, katilim: [a.h, b.h], sonuc: "kazandi", oy: [3, 0] };
  const g = hanOlayiCoz({ anahtar: "masa:develi:han:1#9", olay }, a.h, "develi");
  assert.ok(g.ok);
  assert.deepEqual([g.deger.sonuc, g.deger.oy], ["kazandi", [3, 0]]);
  assert.equal(hanOlayiCoz({ anahtar: "masa:develi:han:1#9", olay: { ...olay, sonuc: "hukumsuz" } }, a.h, "develi").ok, false, "hükümsüz anılmaz");
  assert.equal(hanOlayiCoz({ anahtar: "masa:develi:han:1#9", olay }, b.h, "develi").ok, false);
  const kabul = hanOlayiCoz({ anahtar: "masa:develi:han:1#10", olay: { masa: "masa:develi:han:1", no: 10, tur: "kabul", teklifTur: "atisma", kim: b.h, hedef: a.h, katilim: [a.h, b.h] } }, b.h, "develi");
  assert.ok(kabul.ok);
  const once = JSON.stringify([...k.kar.values()]);
  const r = hanOlayiUygula(k, kabul.deger, kisiler, k.ay);
  assert.ok(r.ok);
  assert.deepEqual([r.deger.degisen, r.deger.etki.soylenti, r.deger.etki.iz], [[], [], undefined]);
  assert.ok(r.deger.olaylar.every((o) => o.k === "olay.han.kabul.atisma"));
  assert.equal(JSON.stringify([...k.kar.values()]), once);
});

test("H8 ozan işareti: yerleşim ana mesleği ozan diyorsa bilet plakasına geçer; yoksa alan yok", async () => {
  const depo = bellekDepo();
  await depo.koy({ profil: { hesapId: "ali", ad: "Ali", cinsiyet: "erkek", beylik: "demirhan", yerlesim: "kizilca", dogumAyi: 0, olusturma: 0 } });
  const b: HanHesapBaglami = {
    depo,
    hesapId: "ali",
    simdi: SIMDI,
    yaptirim: undefined,
    masaCagir: async () => basarili({}),
    ikramOde: async () => hata("gecersiz_istek"),
    engelSor: async () => basarili({ engeller: [], ozan: true }),
  };
  const r = await masaBileti(b, 1);
  assert.ok(r.ok);
  assert.deepEqual(r.deger.plaka, { hesap: "ali", ad: "Ali", ozan: true });
  const r2 = await masaBileti({ ...b, engelSor: async () => basarili({ engeller: [], ozan: false }) }, 1);
  assert.ok(r2.ok);
  assert.deepEqual(r2.deger.plaka, { hesap: "ali", ad: "Ali" });
});
