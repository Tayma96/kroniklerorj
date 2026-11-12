import test from "node:test";
import assert from "node:assert/strict";
import { ETKILER } from "../src/icerik/agaclar/index.ts";
import { MALLAR } from "../src/icerik/mallar.ts";
import { HIZMET_TARIFLERI, hizmetTarifiBul } from "../src/yerlesim/hizmet-tarif.ts";
import { hizmetHazirla, hizmetIlanAc, hizmetIlanBul, hizmetIlanGeri, hizmetIlanIsle, hizmetIlanlar, hizmetNpcTalepleri, hizmetNpcTalebiAc, hizmetNpcTalepTeslim, hizmetStoguGecerli, hizmetStokDonumu, hizmetYetkiliMi } from "../src/yerlesim/hizmet-pazari.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import type { EkonomiKaydi } from "../src/yerlesim/pazar-tahta.ts";

test("E4.3 hizmet kataloğu: kimlikler tekil, girdiler mal dizininde ve beceri kapıları gerçek", () => {
  assert.equal(new Set(HIZMET_TARIFLERI.map((x) => x.id)).size, HIZMET_TARIFLERI.length);
  for (const h of HIZMET_TARIFLERI) {
    assert.equal(hizmetTarifiBul(h.id), h);
    for (const mal of Object.keys(h.girdi)) assert.ok(Object.hasOwn(MALLAR, mal), `${h.id}: ${mal}`);
    assert.ok(h.seviye >= 1 && h.seviye <= 3, h.id);
    assert.ok(h.takat > 0 && h.hazir.adet > 0 && h.hazir.gecerlilikAy > 0, h.id);
    assert.ok(ETKILER.some((x) => x.dugum === h.dugum && x.seviye === h.seviye && x.etki.tur === "hizmet" && x.etki.hizmet === h.id), h.id);
  }
  assert.equal(hizmetTarifiBul("olmayan"), undefined);
  assert.equal(hizmetTarifiBul({ id: "yaraBak" }), undefined);
});


function sifaciKarakter(seviye = 2, sifaliOt = 3, takat = 6): Karakter {
  return {
    o: "o1",
    h: "hesap-1",
    ad: "Şifacı",
    e: 1,
    d: 0,
    k: 0,
    pa: 50,
    hl: [30, 50, 50, 12],
    hn: [],
    ev: { sifaliOt },
    tk: takat,
    ta: 12,
    ms: { a: "sifaci", y: "", s: { sifaci: { a: "sifaci", kd: 0, hz: 0, cy: 0, sv: { "sifaci.sargiMerhem": seviye } } } },
  } as unknown as Karakter;
}

function ekonomi(): EkonomiKaydi {
  return { n: 1, il: [], is: [], lv: [], hs: [] };
}

test("E4.3-A hizmet hazırlama: beceri, girdi ve takat birlikte doğrulanır; stok süreli yazılır", () => {
  const kar = sifaciKarakter();
  const ek = ekonomi();
  const r = hizmetHazirla(ek, kar, "yaraBak", 2, 12);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(r.deger.harcanan, { girdiler: { sifaliOt: 2 }, takat: 2 });
  assert.equal(kar.ev?.sifaliOt, 1);
  assert.equal(kar.tk, 4);
  assert.equal(r.deger.stok.n, 2);
  assert.equal(r.deger.stok.sa, 14);
  assert.equal(ek.hs?.length, 1);
  assert.equal(hizmetStoguGecerli(r.deger.stok, 14), true);
  assert.equal(hizmetStoguGecerli(r.deger.stok, 15), false);
});

test("E4.3-A hizmet hazırlama: beceri kilidi, eksik girdi ve takat hatasında mal/stoğa dokunulmaz", () => {
  const kilitli = sifaciKarakter(1, 3, 6);
  const kilitliEk = ekonomi();
  const kilit = hizmetHazirla(kilitliEk, kilitli, "yaraBak", 1, 12);
  assert.equal(kilit.ok, false);
  if (!kilit.ok) assert.equal(kilit.hata, "dugum_kapali");
  assert.equal(kilitli.ev?.sifaliOt, 3);
  assert.equal(kilitliEk.hs?.length, 0);

  const girdisiz = sifaciKarakter(2, 0, 6);
  const girdisizEk = ekonomi();
  const girdi = hizmetHazirla(girdisizEk, girdisiz, "yaraBak", 1, 12);
  assert.equal(girdi.ok, false);
  if (!girdi.ok) assert.equal(girdi.hata, "girdi_yok");
  assert.equal(girdisiz.tk, 6);
  assert.equal(girdisizEk.hs?.length, 0);

  const takatsiz = sifaciKarakter(2, 3, 0);
  const takatsizEk = ekonomi();
  const takat = hizmetHazirla(takatsizEk, takatsiz, "yaraBak", 1, 12);
  assert.equal(takat.ok, false);
  if (!takat.ok) assert.equal(takat.hata, "takat_yok");
  assert.equal(takatsiz.ev?.sifaliOt, 3);
  assert.equal(takatsizEk.hs?.length, 0);
});


test("E4.3-A hizmet stoğu oyuncu/hizmet başına 20 adette durur; kota hatası harcama yapmaz", () => {
  const kar = sifaciKarakter(2, 25, 30);
  const ek = ekonomi();
  for (let i = 0; i < 4; i++) {
    const r = hizmetHazirla(ek, kar, "yaraBak", 5, 12);
    assert.equal(r.ok, true);
  }
  const onceEnvanter = kar.ev?.sifaliOt;
  const onceTakat = kar.tk;
  const fazla = hizmetHazirla(ek, kar, "yaraBak", 1, 12);
  assert.equal(fazla.ok, false);
  if (!fazla.ok) assert.equal(fazla.hata, "kota_doldu");
  assert.equal(kar.ev?.sifaliOt, onceEnvanter);
  assert.equal(kar.tk, onceTakat);
  assert.equal(ek.hs?.reduce((n, x) => n + x.n, 0), 20);
});


test("E4.3-A hizmet ilanı: stok ayrılır, alıcı etkisi ve satıcı tecrübesi atomik uygulanır", () => {
  const satici = sifaciKarakter(2, 3, 6);
  satici.pa = 0;
  const alici = sifaciKarakter(0, 0, 6);
  alici.o = "o2";
  alici.h = "hesap-2";
  alici.e = 2;
  alici.pa = 100;
  const ek = ekonomi();
  const hazir = hizmetHazirla(ek, satici, "yaraBak", 2, 12);
  assert.equal(hazir.ok, true);
  if (!hazir.ok) return;
  const ilan = hizmetIlanAc(ek, satici, `h${hazir.deger.stok.i}`, 2, 6, 12);
  assert.equal(ilan.ok, true);
  if (!ilan.ok) return;
  assert.equal(hazir.deger.stok.n, 0);
  assert.equal(hizmetIlanBul(ek, `hi${ilan.deger.i}`)?.n, 2);

  const ilk = hizmetIlanIsle(ek, alici, satici, `hi${ilan.deger.i}`, 1, 12);
  assert.equal(ilk.ok, true);
  if (!ilk.ok) return;
  assert.equal(alici.pa, 94);
  assert.equal(satici.pa, 6);
  assert.equal(alici.hl?.[0], 40);
  assert.equal(ilk.deger.hizmetPuani, 1);
  assert.equal(ilan.deger.n, 1);

  const ikinci = hizmetIlanIsle(ek, alici, satici, `hi${ilan.deger.i}`, 1, 12);
  assert.equal(ikinci.ok, true);
  assert.equal(ilan.deger.n, 0);
  assert.equal(ilan.deger.d, "bitti");
  assert.equal(alici.pa, 88);
  assert.equal(satici.pa, 12);
});

test("E4.3-A hizmet pazarı: ilan iadesi, kendi ilanını alma ve aynı hane ödülsüzlüğü", () => {
  const satici = sifaciKarakter(2, 5, 10);
  const ek = ekonomi();
  const hazir = hizmetHazirla(ek, satici, "yaraBak", 2, 12);
  assert.equal(hazir.ok, true);
  if (!hazir.ok) return;
  const ilan = hizmetIlanAc(ek, satici, `h${hazir.deger.stok.i}`, 2, 6, 12);
  assert.equal(ilan.ok, true);
  if (!ilan.ok) return;
  const kendi = hizmetIlanIsle(ek, satici, satici, `hi${ilan.deger.i}`, 1, 12);
  assert.equal(kendi.ok, false);
  if (!kendi.ok) assert.equal(kendi.hata, "ilan_gecersiz");
  assert.equal(ilan.deger.n, 2);

  const kapat = hizmetIlanGeri(ek, satici, `hi${ilan.deger.i}`, 12);
  assert.equal(kapat.ok, true);
  if (!kapat.ok) return;
  assert.equal(kapat.deger.iade, 2);
  assert.equal(hazir.deger.stok.n, 2);

  const yeni = hizmetIlanAc(ek, satici, `h${hazir.deger.stok.i}`, 1, 6, 12);
  assert.equal(yeni.ok, true);
  if (!yeni.ok) return;
  const haneAl = sifaciKarakter(0, 0, 6);
  haneAl.o = "o3";
  haneAl.h = "hesap-3";
  haneAl.e = satici.e;
  haneAl.pa = 100;
  const onceTecrube = satici.ms?.s.sifaci?.hz ?? 0;
  const satin = hizmetIlanIsle(ek, haneAl, satici, `hi${yeni.deger.i}`, 1, 12);
  assert.equal(satin.ok, true);
  if (satin.ok) assert.equal(satin.deger.hizmetPuani, 0);
  assert.equal(satici.ms?.s.sifaci?.hz ?? 0, onceTecrube);
});

test("E4.3-A hizmet ilanı: süre dolunca alım kapanır ve listeden düşer", () => {
  const satici = sifaciKarakter(2, 3, 6);
  const alici = sifaciKarakter(0, 0, 6);
  alici.o = "o4";
  alici.h = "hesap-4";
  alici.e = 4;
  const ek = ekonomi();
  const hazir = hizmetHazirla(ek, satici, "yaraBak", 1, 12);
  assert.equal(hazir.ok, true);
  if (!hazir.ok) return;
  const ilan = hizmetIlanAc(ek, satici, `h${hazir.deger.stok.i}`, 1, 6, 12);
  assert.equal(ilan.ok, true);
  if (!ilan.ok) return;
  assert.equal(hizmetIlanlar(ek, 14).length, 1);
  assert.equal(hizmetIlanlar(ek, 15).length, 0);
  const satin = hizmetIlanIsle(ek, alici, satici, `hi${ilan.deger.i}`, 1, 15);
  assert.equal(satin.ok, false);
  if (!satin.ok) assert.equal(satin.hata, "ilan_kapandi");
  assert.equal(alici.pa, 50);
  assert.equal(ilan.deger.n, 1);
});


test("E4.3-A hizmet ödülü: aynı hizmetçi-alıcı çifti ayda yalnız iki teslim tecrübesi kazanır", () => {
  const satici = sifaciKarakter(2, 3, 6);
  satici.pa = 0;
  const alici = sifaciKarakter(0, 0, 6);
  alici.o = "o2";
  alici.h = "hesap-2";
  alici.e = 2;
  alici.pa = 100;
  const ek = ekonomi();
  const hazir = hizmetHazirla(ek, satici, "yaraBak", 3, 12);
  assert.equal(hazir.ok, true);
  if (!hazir.ok) return;
  const ilan = hizmetIlanAc(ek, satici, `h${hazir.deger.stok.i}`, 3, 6, 12);
  assert.equal(ilan.ok, true);
  if (!ilan.ok) return;

  const ilk = hizmetIlanIsle(ek, alici, satici, `hi${ilan.deger.i}`, 1, 12);
  const ikinci = hizmetIlanIsle(ek, alici, satici, `hi${ilan.deger.i}`, 1, 12);
  const ucuncu = hizmetIlanIsle(ek, alici, satici, `hi${ilan.deger.i}`, 1, 12);
  assert.equal(ilk.ok && ilk.deger.odul, 1);
  assert.equal(ikinci.ok && ikinci.deger.odul, 1);
  assert.equal(ucuncu.ok && ucuncu.deger.odul, 0);
  assert.equal(ilk.ok && ilk.deger.hizmetPuani, 1);
  assert.equal(ikinci.ok && ikinci.deger.hizmetPuani, 1);
  assert.equal(ucuncu.ok && ucuncu.deger.hizmetPuani, 0);
  assert.equal(ek.ht?.reduce((n, x) => n + x.odul, 0), 2);
});


test("E4.3-A süresi dolan hazır ve ilandaki hizmet stoğu yarım tecrübe verir, tekrar ödül üretmez", () => {
  const hazirSatici = sifaciKarakter(2, 3, 6);
  const hazirEk = ekonomi();
  const hazir = hizmetHazirla(hazirEk, hazirSatici, "yaraBak", 2, 12);
  assert.equal(hazir.ok, true);
  if (!hazir.ok) return;
  const hazirOnce = hazirSatici.ms?.s.sifaci?.hz ?? 0;
  const hazirKasaba = { ek: hazirEk, kar: new Map([[hazirSatici.o, hazirSatici]]) } as unknown as Kasaba;

  hizmetStokDonumu(hazirKasaba, 15);
  assert.equal(hazir.deger.stok.n, 0);
  assert.equal((hazirSatici.ms?.s.sifaci?.hz ?? 0) - hazirOnce, 1);
  hizmetStokDonumu(hazirKasaba, 16);
  assert.equal((hazirSatici.ms?.s.sifaci?.hz ?? 0) - hazirOnce, 1);

  const ilanSatici = sifaciKarakter(2, 3, 6);
  const ilanEk = ekonomi();
  const ilanHazir = hizmetHazirla(ilanEk, ilanSatici, "yaraBak", 2, 12);
  assert.equal(ilanHazir.ok, true);
  if (!ilanHazir.ok) return;
  const ilan = hizmetIlanAc(ilanEk, ilanSatici, `h${ilanHazir.deger.stok.i}`, 2, 6, 12);
  assert.equal(ilan.ok, true);
  if (!ilan.ok) return;
  const ilanOnce = ilanSatici.ms?.s.sifaci?.hz ?? 0;
  const ilanKasaba = { ek: ilanEk, kar: new Map([[ilanSatici.o, ilanSatici]]) } as unknown as Kasaba;

  hizmetStokDonumu(ilanKasaba, 15);
  assert.equal(ilan.deger.n, 0);
  assert.equal(ilan.deger.d, "dustu");
  assert.equal((ilanSatici.ms?.s.sifaci?.hz ?? 0) - ilanOnce, 1);
  hizmetStokDonumu(ilanKasaba, 16);
  assert.equal((ilanSatici.ms?.s.sifaci?.hz ?? 0) - ilanOnce, 1);
});


test("E4.3 hizmet kataloğu: lohusa bakımı ve teselli gerçek beceri düğümlerinden açılır", () => {
  const ebe = sifaciKarakter(1, 3, 6);
  ebe.ms!.s.sifaci!.sv = { "sifaci.lohusaBakimi": 1 };
  ebe.ev!.bez = 1;
  const ebeEk = ekonomi();
  const lohusa = hizmetHazirla(ebeEk, ebe, "lohusa", 1, 12);
  assert.equal(lohusa.ok, true);
  if (lohusa.ok) {
    assert.equal(ebe.ev?.sifaliOt, 2);
    assert.equal(ebe.ev?.bez ?? 0, 0);
    assert.equal(ebe.tk, 4);
  }

  const ozan = sifaciKarakter(0, 0, 6);
  ozan.o = "o9";
  ozan.h = "hesap-9";
  ozan.ms = { a: "ozan", y: "", s: { ozan: { kd: 0, hz: 0, cy: 0, sv: { "ozan.teselli": 1 } } } } as unknown as typeof ozan.ms;
  const teselli = hizmetHazirla(ekonomi(), ozan, "teselli", 1, 12);
  assert.equal(teselli.ok, true);
});


function hanciKarakter(hanciSeviye: number, sazSeviye: number): Karakter {
  return {
    o: "o9",
    h: "hesap-9",
    ad: "Hancı",
    e: 9,
    d: 0,
    k: 0,
    pa: 20,
    ev: { ekmek: 2, corba: 2 },
    tk: 8,
    ta: 12,
    ms: {
      a: "hanci",
      y: "",
      s: {
        hanci: { a: "hanci", kd: 0, hz: 0, cy: 0, sv: { "hanci.sazGecesi": hanciSeviye } },
        ozan: { a: "ozan", kd: 0, hz: 0, cy: 0, sv: { "ozan.sazUstaligi": sazSeviye } },
      },
    },
  } as unknown as Karakter;
}

test("E4 sinerji kapısı: saz gecesi hem hancı düğümünü hem ozan saz ustalığını ister", () => {
  const eksikOzan = hanciKarakter(3, 0);
  const saz = hizmetTarifiBul("sazGecesi")!;
  assert.equal(hizmetYetkiliMi(eksikOzan, saz), false);
  const kapali = hizmetHazirla(ekonomi(), eksikOzan, "sazGecesi", 1, 12);
  assert.deepEqual(kapali, { ok: false, hata: "dugum_kapali" });

  const eksikHanci = hanciKarakter(1, 1);
  assert.equal(hizmetYetkiliMi(eksikHanci, saz), false, "hancı sinerji seviyesine ulaşmamış");

  const birlikte = hanciKarakter(3, 1);
  assert.equal(hizmetYetkiliMi(birlikte, saz), true);
  const ek = ekonomi();
  const hazir = hizmetHazirla(ek, birlikte, "sazGecesi", 1, 12);
  assert.equal(hazir.ok, true);
  assert.equal(birlikte.ev?.ekmek, 1);
  assert.equal(birlikte.ev?.corba, 1);
  assert.equal(birlikte.tk, 6);
});


function npcHizmetKasabasi(ek: EkonomiKaydi, kar: Karakter, hazine = 30) {
  const hedef = { i: 1, a: 0, s: 0, k: 1, d: 0, m: 0, h: 0, q: 0, r: 0, e: 7, es: 0, an: 0, ba: 0, b: [], g: 0 };
  return {
    y: "develi", tur: "kasaba", hedef: 60, ay: 12,
    npc: [hedef], dizin: new Map([[hedef.i, hedef]]), ni: 2, ne: 8,
    sakin: [], kar: new Map([[kar.o, kar]]), ili: new Map(),
    hd: { hz: hazine, vk: 0, em: {}, tr: [] }, ek,
  } as unknown as Kasaba;
}

function lohusaKarakter(hane = 1): Karakter {
  const kar = sifaciKarakter(1, 1, 6);
  kar.e = hane;
  kar.ev = { sifaliOt: 1, bez: 1 };
  kar.ms!.s.sifaci!.sv = { "sifaci.lohusaBakimi": 1 };
  return kar;
}

test("E4.3-B gerçek doğum olayı NPC lohusa talebi açar, hazineyi rezerve eder ve aynı olay tekrarlanmaz", () => {
  const kar = lohusaKarakter();
  const ek = ekonomi();
  const kasaba = npcHizmetKasabasi(ek, kar, 20);
  const dogum = { t: "dogum", w: "n2", h: "n1", g: "", n: 3, k: "olay.dogum", p: {} } as unknown as import("../src/yerlesim/tipler.ts").OlayTaslagi;
  const acilan = hizmetNpcTalebiAc(kasaba, 12, [dogum]);
  assert.equal(acilan.length, 1);
  assert.equal(kasaba.hd?.hz, 12);
  assert.deepEqual(hizmetNpcTalepleri(ek, 12), [{ id: "hn1", hizmet: "lohusa", hedef: "n1", acilisAy: 12, sonAy: 13, odul: 8 }]);
  assert.equal(hizmetNpcTalebiAc(kasaba, 12, [dogum]).length, 0);
  assert.equal(kasaba.hd?.hz, 12);
});

test("E4.3-B lohusa talebi: hazır hizmet tek kez teslim edilir, ödül hazineden önceden ayrılmıştır", () => {
  const kar = lohusaKarakter();
  const ek = ekonomi();
  const kasaba = npcHizmetKasabasi(ek, kar, 20);
  const dogum = { t: "dogum", w: "n2", h: "n1", g: "", n: 3, k: "olay.dogum", p: {} } as unknown as import("../src/yerlesim/tipler.ts").OlayTaslagi;
  hizmetNpcTalebiAc(kasaba, 12, [dogum]);
  const hazir = hizmetHazirla(ek, kar, "lohusa", 1, 12);
  assert.equal(hazir.ok, true);
  if (!hazir.ok) return;
  const teslim = hizmetNpcTalepTeslim(ek, kasaba, kar, "hn1", 12);
  assert.equal(teslim.ok, true);
  if (!teslim.ok) return;
  assert.equal(kar.pa, 8);
  assert.equal(hazir.deger.stok.n, 0);
  assert.equal(teslim.deger.talep.d, "tamam");
  assert.equal(kasaba.hd?.hz, 12, "ödül açılışta rezerve edildi; teslimde hazine ikinci kez düşmez");
  const tekrar = hizmetNpcTalepTeslim(ek, kasaba, kar, "hn1", 12);
  assert.deepEqual(tekrar, { ok: false, hata: "siparis_kapandi" });
  assert.equal(kar.pa, 8);
});

test("E4.3-B doğum/ölüm talepleri gerçek olay türlerine bağlanır; yetersiz hazine talep açmaz", () => {
  const kar = lohusaKarakter();
  const ek = ekonomi();
  const kasaba = npcHizmetKasabasi(ek, kar, 5);
  const dogum = { t: "dogum", w: "n2", h: "n1", g: "", n: 3, k: "olay.dogum", p: {} } as unknown as import("../src/yerlesim/tipler.ts").OlayTaslagi;
  assert.equal(hizmetNpcTalebiAc(kasaba, 12, [dogum]).length, 0);
  kasaba.hd!.hz = 20;
  const olum = { t: "olum", w: "n3", h: "n1", g: "", n: 3, k: "olay.olum", p: {} } as unknown as import("../src/yerlesim/tipler.ts").OlayTaslagi;
  const acilan = hizmetNpcTalebiAc(kasaba, 12, [olum]);
  assert.equal(acilan.length, 1);
  assert.equal(ek.hn?.[0]?.h, "teselli");
  assert.equal(ek.hn?.[0]?.odul, 5);
  assert.equal(kasaba.hd?.hz, 15);
});

test("E4.3-B NPC talebi süresi dolunca veya hedef ölünce rezerve ödül hazineye döner", () => {
  const kar = lohusaKarakter();
  const ek = ekonomi();
  const kasaba = npcHizmetKasabasi(ek, kar, 20);
  const dogum = { t: "dogum", w: "n2", h: "n1", g: "", n: 3, k: "olay.dogum", p: {} } as unknown as import("../src/yerlesim/tipler.ts").OlayTaslagi;
  hizmetNpcTalebiAc(kasaba, 12, [dogum]);
  assert.equal(kasaba.hd?.hz, 12);
  hizmetStokDonumu(kasaba, 14);
  assert.equal(ek.hn?.[0]?.d, "dustu");
  assert.equal(kasaba.hd?.hz, 20);
  hizmetStokDonumu(kasaba, 15);
  assert.equal(kasaba.hd?.hz, 20, "iade ikinci kez yazılmaz");

  const ikinci = npcHizmetKasabasi(ekonomi(), kar, 20);
  hizmetNpcTalebiAc(ikinci, 12, [dogum]);
  ikinci.dizin.delete(1);
  hizmetStokDonumu(ikinci, 13);
  assert.equal(ikinci.ek?.hn?.[0]?.d, "dustu");
  assert.equal(ikinci.hd?.hz, 20);
});

test("E4.3-B aynı hanedeki oyuncu kendi hanesine açılmış NPC talebinden ödül alamaz", () => {
  const kar = lohusaKarakter(7);
  const ek = ekonomi();
  const kasaba = npcHizmetKasabasi(ek, kar, 20);
  const dogum = { t: "dogum", w: "n2", h: "n1", g: "", n: 3, k: "olay.dogum", p: {} } as unknown as import("../src/yerlesim/tipler.ts").OlayTaslagi;
  hizmetNpcTalebiAc(kasaba, 12, [dogum]);
  const hazir = hizmetHazirla(ek, kar, "lohusa", 1, 12);
  assert.equal(hazir.ok, true);
  if (!hazir.ok) return;
  const oncePara = kar.pa;
  const teslim = hizmetNpcTalepTeslim(ek, kasaba, kar, "hn1", 12);
  assert.deepEqual(teslim, { ok: false, hata: "hedef_uygun_degil" });
  assert.equal(kar.pa, oncePara);
  assert.equal(hazir.deger.stok.n, 1);
});
