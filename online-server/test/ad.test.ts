import test from "node:test";
import assert from "node:assert/strict";
import { adAnahtari, adDogrula, trKucuk } from "../src/ad.ts";

const hatasi = (ham: unknown) => {
  const s = adDogrula(ham);
  return s.ok ? "ok" : s.hata;
};

test("geçerli adlar: Türkçe harf, tek boşluk, kesme; boşluklar düzenlenir", () => {
  for (const ad of ["Al", "Ayşe", "Çağrı Gül", "İlker", "Işıl", "Öykü'nün", "Ömer Faruk Şen", "Âdem", "Mary Jane"]) {
    assert.equal(hatasi(ad), "ok", ad);
  }
  const s = adDogrula("  Ali   Rıza  ");
  assert.ok(s.ok);
  assert.equal(s.ad, "Ali Rıza");
  const kesme = adDogrula("Can’ın");
  assert.ok(kesme.ok);
  assert.equal(kesme.ad, "Can'ın");
});

test("uzunluk 2-24", () => {
  assert.equal(hatasi("A"), "ad_uzunluk");
  assert.equal(hatasi("   "), "ad_uzunluk");
  assert.equal(hatasi("Ç".repeat(24)), "ok");
  assert.equal(hatasi("Ç".repeat(25)), "ad_uzunluk");
});

test("geçersiz karakter ve biçim", () => {
  for (const ad of ["Ali3", "Ali_Veli", "'Ali", "Ali'", "Ali ' Veli", "Ali''Veli", "Али", "Ali-Veli", "😀😀"]) {
    assert.equal(hatasi(ad), "ad_karakter", ad);
  }
  assert.equal(hatasi(42), "ad_karakter");
});

test("yasaklı sözcükler; benzer ama masum adlar geçer", () => {
  assert.equal(hatasi("Admin"), "ad_yasak");
  assert.equal(hatasi("Kronikler"), "ad_yasak");
  assert.equal(hatasi("Ali Orospu"), "ad_yasak");
  assert.equal(hatasi("Işık"), "ok");
  assert.equal(hatasi("Sıkı Can"), "ok");
});

test("benzersizlik anahtarı Türkçe küçük harf (İ/ı), boşluk tekleştirilmiş", () => {
  assert.equal(adAnahtari("İLKER"), "ilker");
  assert.equal(adAnahtari("İlker"), adAnahtari("ilker"));
  assert.equal(adAnahtari("ILGAZ"), "ılgaz");
  assert.notEqual(adAnahtari("ILGAZ"), adAnahtari("ilgaz"));
  assert.equal(adAnahtari("IŞIK  SU"), adAnahtari("ışık su"));
  assert.equal(adAnahtari(" Ayşe   Nur "), "ayşe nur");
  assert.equal(trKucuk("ÇĞÖŞÜİI"), "çğöşüiı");
  const s = adDogrula("ŞAHİN");
  assert.ok(s.ok);
  assert.equal(s.anahtar, "şahin");
});
