// YonetimDO kuralları doğrudan (bellek deposu, sahte DunyaDO/HesapDO): güvenlik incelemesi maddeleri.
import test from "node:test";
import assert from "node:assert/strict";
import { bellekDepo, type BellekDepo } from "../src/depo.ts";
import { basarili, hata, type HesapYaptirimi, type Profil, type Sonuc, type YoneticiKimligi, type YonetimUcu } from "../src/tipler.ts";
import { hizTablosuSay } from "../src/yonetim-do.ts";
import { yonetimIsle, type YonetimBaglami } from "../src/yonetim/islem.ts";
import { ACIK_KUYRUK_EN_COK, SIKAYETCI_ACIK_EN_COK } from "../src/yonetim/sikayet.ts";
import { gerekceCoz, metinTemizle } from "../src/yonetim/yaptirim.ts";
import type { HizDurumu } from "../src/mantik.ts";

const KURUCU: YoneticiKimligi = { eposta: "k@o.com", sub: "1", hesap: "do-kurucu" };
const MOD: YoneticiKimligi = { eposta: "m@o.com", sub: "2", hesap: "do-mod" };
const G = "yeterince uzun bir gerekçe";

function profil(hesapId: string): Profil {
  return { hesapId, ad: hesapId, cinsiyet: "kadın", beylik: "demirhan", yerlesim: "kizilca", dogumAyi: 0, olusturma: 0 };
}

function ortam(depo: BellekDepo = bellekDepo()) {
  const itilen: [string, HesapYaptirimi][] = [];
  let hesapCalisiyor = true;
  let yetkisiz = 0;
  const b: YonetimBaglami = {
    depo,
    simdi: Date.UTC(2026, 10, 8, 10),
    kurucular: new Set([KURUCU.eposta]),
    oyuncuBul: async (s) => (s.hesap?.startsWith("do-") ? basarili(profil(s.hesap)) : hata("kisi_yok")),
    hesabaYaz: async (h, d): Promise<Sonuc<unknown>> => {
      if (!hesapCalisiyor) return hata("sunucu_hatasi");
      itilen.push([h, d]);
      return basarili(d);
    },
    yetkisizGirisIzni: () => ++yetkisiz <= 3,
  };
  const yonet = (y: YoneticiKimligi, uc: YonetimUcu, govde?: unknown, sorgu: Record<string, string> = {}) =>
    yonetimIsle(b, { islem: "yonet", yonetici: y, uc, govde, sorgu }) as Promise<Sonuc<Record<string, any>>>;
  const sikayet = (sikayetci: string, govde: unknown) => yonetimIsle(b, { islem: "sikayetEkle", sikayetci, govde }) as Promise<Sonuc<Record<string, any>>>;
  return { b, depo, itilen, yonet, sikayet, hesapKapat: (k: boolean) => (hesapCalisiyor = !k) };
}

let n = 0;
const no = () => `istekno-${String(++n).padStart(6, "0")}`;
const kayitlar = (depo: BellekDepo) => [...depo.veri.entries()].filter(([k]) => /^kayit:\d/.test(k)).map(([, v]) => v as { islem: string; sonuc: string; kim: string });

test("madde 1: rolsüz giriş kayda yazılmaz, günlük sayılır, genel dakikalık tavan; hız tablosu topluca silinmez", async () => {
  const { b, depo } = ortam();
  for (let i = 0; i < 3; i++) {
    assert.deepEqual(await yonetimIsle(b, { islem: "giris", yonetici: { eposta: `x${i}@o.com`, sub: "9", hesap: "do-x" } }), hata("yetki_yok"));
  }
  assert.deepEqual(await yonetimIsle(b, { islem: "giris", yonetici: { eposta: "y@o.com", sub: "9", hesap: "do-x" } }), hata("hiz_siniri"));
  assert.equal(kayitlar(depo).length, 0, "rolsüz deneme kalıcı kayda girmez");
  assert.equal([...depo.veri.entries()].find(([k]) => k.startsWith("yetkisizGiris:"))?.[1], 3);

  const tablo = new Map<string, HizDurumu>();
  const simdi = 120_000;
  assert.ok(hizTablosuSay(tablo, "kurban", simdi, 2, 3));
  assert.ok(hizTablosuSay(tablo, "kurban", simdi, 2, 3));
  assert.ok(hizTablosuSay(tablo, "a", simdi, 2, 3));
  assert.ok(hizTablosuSay(tablo, "b", simdi, 2, 3));
  assert.equal(hizTablosuSay(tablo, "c", simdi, 2, 3), false, "dolu tabloda yeni e-posta reddedilir");
  assert.equal(hizTablosuSay(tablo, "kurban", simdi, 2, 3), false, "kurbanın sayacı silinmedi");
  assert.ok(hizTablosuSay(tablo, "c", simdi + 60_000, 2, 3), "eski pencereler atılınca yer açılır");
});

test("madde 2: şikayetçi başına açık sınırı; kuyruk doluyken yeni hedef reddedilir ama mevcut hedef birleşir", async () => {
  const { depo, sikayet } = ortam();
  await depo.koy({ "param:SIKAYET_GUNLUK": { yigin: [50], surum: 1, gecmis: [] } });
  for (let i = 0; i < SIKAYETCI_ACIK_EN_COK; i++) {
    assert.ok((await sikayet("do-a", { hedef: `do-h${i}`, neden: "spam", istekNo: no() })).ok);
  }
  assert.deepEqual(await sikayet("do-a", { hedef: "do-fazla", neden: "spam", istekNo: no() }), hata("sikayet_siniri"));

  // Kuyruk dolu: yalnız yeni hedef reddedilir.
  const acik = (await depo.al<number[]>("sikayetAcik")) ?? [];
  await depo.koy({ sikayetAcik: [...acik, ...Array.from({ length: ACIK_KUYRUK_EN_COK - acik.length }, (_, i) => 100_000 + i)] });
  assert.deepEqual(await sikayet("do-b", { hedef: "do-yeni", neden: "spam", istekNo: no() }), hata("kuyruk_dolu"));
  const birles = await sikayet("do-b", { hedef: "do-h0", neden: "kufur", istekNo: no() });
  assert.ok(birles.ok);
  assert.equal(birles.deger.birlesti, true);
  const kayit = await depo.al<{ sayi: number }>("sikayet:000000000001");
  assert.equal(kayit?.sayi, 2);
});

test("madde 3: HesapDO'ya itilemezse yanıt söyler ve kayda girer; aynı istekNo ya da yaptirim_yok onarır", async () => {
  const { depo, itilen, yonet, hesapKapat } = ortam();
  hesapKapat(true);
  const govde = { hedef: "do-hedef", tur: "uzaklastirma", gun: 2, gerekce: G, istekNo: no() };
  const r1 = await yonet(KURUCU, "yaptirim", govde);
  assert.ok(r1.ok);
  assert.equal(r1.deger.hesabaYazildi, false);
  assert.ok(kayitlar(depo).some((k) => k.islem === "uzaklastirma:hesabaYaz" && k.sonuc === "sunucu_hatasi"));
  hesapKapat(false);
  const r2 = await yonet(KURUCU, "yaptirim", govde);
  assert.ok(r2.ok);
  assert.equal(r2.deger.hesabaYazildi, true);
  assert.equal(itilen.length, 1);
  assert.ok(itilen[0]?.[1].uzaklastirma);

  // Kaldırma itilemedi; sonraki kaldırma denemesi yaptirim_yok döner ama özeti yeniden iter.
  hesapKapat(true);
  const k1 = await yonet(KURUCU, "yaptirim-kaldir", { hedef: "do-hedef", gerekce: G, istekNo: no() });
  assert.ok(k1.ok);
  assert.equal(k1.deger.hesabaYazildi, false);
  hesapKapat(false);
  assert.deepEqual(await yonet(KURUCU, "yaptirim-kaldir", { hedef: "do-hedef", gerekce: G, istekNo: no() }), hata("yaptirim_yok"));
  assert.deepEqual(itilen.at(-1), ["do-hedef", {}], "HesapDO onarıldı");
});

test("madde 5: aynı istekNo başka uçta ya da başka gövdeyle istekno_gecersiz (kayda girer)", async () => {
  const { depo, yonet } = ortam();
  const istekNo = no();
  assert.ok((await yonet(KURUCU, "duyuru", { metin: "Bayram", gerekce: G, istekNo })).ok);
  assert.ok((await yonet(KURUCU, "duyuru", { gerekce: G, istekNo, metin: "Bayram" })).ok, "anahtar sırası önemsiz");
  assert.deepEqual(await yonet(KURUCU, "duyuru", { metin: "Başka", gerekce: G, istekNo }), hata("istekno_gecersiz"));
  assert.deepEqual(await yonet(KURUCU, "parametre", { ad: "NPC_CARPAN", deger: 3, gerekce: G, istekNo }), hata("istekno_gecersiz"));
  assert.equal(kayitlar(depo).filter((k) => k.sonuc === "istekno_gecersiz").length, 2);
  assert.equal((await depo.al<number>("sayac:duyuru")), 1);
});

test("madde 6: moderatör yaptırımı yapanın e-postasını değil rolünü görür; kurucu e-postayı görür", async () => {
  const { depo, yonet } = ortam();
  await depo.koy({ roller: { [MOD.eposta]: "moderator" } });
  assert.ok((await yonet(KURUCU, "yaptirim", { hedef: "do-h", tur: "susturma", gun: 1, gerekce: G, istekNo: no() })).ok);
  assert.ok((await yonet(MOD, "yaptirim", { hedef: "do-h", tur: "uzaklastirma", gun: 1, gerekce: G, istekNo: no() })).ok);
  const modGoru = await yonet(MOD, "oyuncu", undefined, { hesap: "do-h" });
  assert.ok(modGoru.ok);
  assert.deepEqual(modGoru.deger.yaptirim.liste.map((y: { kim: string }) => y.kim), [MOD.eposta, "kurucu"]);
  const kurucuGoru = await yonet(KURUCU, "oyuncu", undefined, { hesap: "do-h" });
  assert.ok(kurucuGoru.ok);
  assert.deepEqual(kurucuGoru.deger.yaptirim.liste.map((y: { kim: string }) => y.kim), [MOD.eposta, KURUCU.eposta]);
});

test("madde 9: depoda 'kurucu' yazsa bile kurucu sayılmaz", async () => {
  const { depo, yonet } = ortam();
  await depo.koy({ roller: { "sahte@o.com": "kurucu" } });
  assert.deepEqual(await yonet({ eposta: "sahte@o.com", sub: "3", hesap: "do-s" }, "ben"), hata("yetki_yok"));
  assert.deepEqual(await yonet(KURUCU, "rol", { eposta: "z@o.com", rol: "kurucu", gerekce: G, istekNo: no() }), hata("rol_gecersiz"));
});

test("madde 4+7: görünmez/bidi/dolgu karakterleri atılır; gerekçe en az 10 harf/rakam ister", () => {
  assert.equal(metinTemizle("a‮b⁦c​d﻿eㅤf⠀g\nh"), "abcdefg\nh");
  assert.deepEqual(gerekceCoz("ㅤ".repeat(12)), hata("gerekce_gecersiz"));
  assert.deepEqual(gerekceCoz("!!!!!!!!!!!! .... ----"), hata("gerekce_gecersiz"));
  assert.deepEqual(gerekceCoz("a​b​c​d​e​f​g​h​i"), hata("gerekce_gecersiz"));
  assert.deepEqual(gerekceCoz("küfür 2 kez, uyarı"), basarili("küfür 2 kez, uyarı"));
});

test("parametre çapraz sınırı: (1 + KITLIK_PRIM) × sipariş çarpanı < NPC_CARPAN ve STOK_CARPAN ≥ 1 + KITLIK_PRIM", async () => {
  const { depo, yonet } = ortam();
  // Varsayılanlar geçerli: (1,5 × 1,5 = 2,25) < 2,5; 1,5 ≥ 1,5.
  const { caprazIhlaller, PARAMETRELER } = await import("../src/yonetim/parametre.ts");
  assert.deepEqual(caprazIhlaller((a) => PARAMETRELER[a].varsayilan), []);
  // NPC çarpanı tek başına sınır içinde (2,2) ama çapraz kuralı bozar → reddedilir, değer değişmez.
  const r = await yonet(KURUCU, "parametre", { ad: "NPC_CARPAN", deger: 2.2, gerekce: G, istekNo: no() });
  assert.deepEqual(r, hata("parametre_capraz"));
  assert.equal(await depo.al("param:NPC_CARPAN"), undefined);
  assert.ok(kayitlar(depo).some((k) => k.sonuc === "parametre_capraz"), "red kayda girer");
  // Kıtlık primi düşerse aynı NPC çarpanı geçer.
  assert.ok((await yonet(KURUCU, "parametre", { ad: "KITLIK_PRIM", deger: 0.2, gerekce: G, istekNo: no() })).ok);
  assert.ok((await yonet(KURUCU, "parametre", { ad: "NPC_CARPAN", deger: 2.2, gerekce: G, istekNo: no() })).ok);
  // Stok çarpanı kıtlıklı satış değerinin altına inemez.
  assert.deepEqual(await yonet(KURUCU, "parametre", { ad: "STOK_CARPAN", deger: 1.1, gerekce: G, istekNo: no() }), hata("parametre_capraz"));
});
