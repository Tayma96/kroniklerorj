// Bölge (valilik) motoru: göstergeler, vali kasası, vergi → haraç akışı, yetki kullanımı, azil/itiraz, özerklik ve
// ay dönümü. Akçe defteri değişmezi: giren = kasa + cikan + gonderilen + yolda (testle). Haraç Sultanlığa outbox ile
// gider (anahtarlı, tekrar güvenli). Moğol etkisi yalnız bölge göstergelerine düşer. Saf fonksiyonlar.

import { BEYLIKLER } from "../dunya-veri.ts";
import { basarili, hata, type HataKodu, type Sonuc } from "../tipler.ts";
import { mesruiyetGorunumu, bolgeMesruiyeti } from "./mesruiyet.ts";
import { mogolEtkisi } from "./mogol.ts";
import { darbeAyi, darbeBarisTeklifEt, darbeBarisYanit, darbeDestekle, darbeEsigi, darbeGorunumu, darbeHazirla, darbeIlanEt, darbeSadakatYatir, darbeSavunmaYaz, darbeVazgec } from "./darbe.ts";
import { devletAyi, devletGorunumu, devletYemin, devletYonet } from "./devlet.ts";
import {
  adayUygunMu,
  adayYap,
  bolgeKoltuklari,
  bosalt,
  etkinKisi,
  goster,
  kayitEkle,
  kimlikGor,
  koltukAyi,
  koltukBul,
  kumeKesisir,
  kumeAnahtarlari,
  onaylayanKoltuklar,
  onaySay,
  oySay,
  secimAc,
  turKoltugu,
  yetkiAcik,
  yoklukKademesi,
  yerUygun,
} from "./makam.ts";
import { basvur, basvuruEngeli, divanKarari, haracIndirimi, ozerklikAyi, ozerklikEtkin, sartliCevap, talepCoz, geriAl } from "./ozerklik.ts";
import {
  ALARM,
  AZIL,
  BASLANGIC,
  BAYINDIRLIK,
  DARBE,
  ESNAF,
  GOSTERGE,
  HARAC,
  MAKAMLAR,
  MESRUIYET,
  MOGOL,
  ORTAK_DERT,
  OZERKLIK,
  PAZAR,
  VERGI,
  YETKILER,
  type Yetki,
} from "./sabitler.ts";
import type { AzilKaydi, BolgeDurumu, BolgeRaporu, Koltuk, SiyasiKimlik, SultanlikOzeti } from "./tipler.ts";

export type Gosterge = "arz" | "moral" | "guvenlik";
const GOSTERGELER: readonly Gosterge[] = ["arz", "moral", "guvenlik"];

export function bolgeVar(id: string): boolean {
  return BEYLIKLER.some((b) => b.id === id);
}

export function bolgeKur(id: string, ay: number): BolgeDurumu {
  const d: BolgeDurumu = {
    v: 1,
    id,
    ay,
    g: { arz: GOSTERGE.taban, moral: GOSTERGE.taban, guvenlik: GOSTERGE.taban },
    kasa: 0,
    giren: 0,
    cikan: 0,
    gonderilen: 0,
    yolda: {},
    gecikme: 0,
    sonGelir: 0,
    koltuklar: bolgeKoltuklari(id, ay),
    gecmis: {},
    haksiz: [],
    sultanHaksiz: 0,
    aziller: [],
    mesruiyet: { puan: 50, kademe: "dengeli", nedenler: [] },
    kayit: [],
    kn: 0,
  };
  const vali = turKoltugu(d, "vali");
  if (vali) vali.ayar.vergiOrani = VERGI.baslangic;
  akceGir(d, BASLANGIC.valiKasasi, "baslangic", ay, "kurum");
  mesruiyetHesapla(d);
  return d;
}

// ---------------------------------------------------------------- akçe defteri

export function akceGir(d: BolgeDurumu, tutar: number, tur: string, ay: number, kim: string): void {
  if (!(tutar > 0)) return;
  d.kasa += tutar;
  d.giren += tutar;
  kayitEkle(d, ay, tur, kim, { k: `kayit.${tur}`, p: { tutar } }, { akce: tutar, kasa: d.kasa });
}

/** Kasadan dünyaya çıkış (sink: bayındırlık, alarm gideri, hakemlik bedeli). Yetmezse ödenebilen kadar çıkar. */
export function akceCik(d: BolgeDurumu, tutar: number, tur: string, ay: number, kim: string, koltuk?: string): number {
  const t = Math.min(Math.max(0, Math.floor(tutar)), d.kasa);
  if (t <= 0) return 0;
  d.kasa -= t;
  d.cikan += t;
  kayitEkle(d, ay, tur, kim, { k: `kayit.${tur}`, p: { tutar: t } }, { akce: -t, kasa: d.kasa, ...(koltuk ? { koltuk } : {}) });
  return t;
}

/** Akçe değişmezi (testler ve DO denetimi). */
export function defterTutarli(d: BolgeDurumu): boolean {
  const yolda = Object.values(d.yolda).reduce((t, x) => t + x, 0);
  return Math.abs(d.giren - (d.kasa + d.cikan + d.gonderilen + yolda)) < 1e-6 && d.kasa >= 0;
}

/** Sultanlık haracı aldı: yoldaki tutar gönderilene geçer (tekrar güvenli). */
export function haracOnayla(d: BolgeDurumu, anahtar: string): void {
  const t = d.yolda[anahtar];
  if (t === undefined) return;
  d.gonderilen += t;
  delete d.yolda[anahtar];
}

// ---------------------------------------------------------------- göstergeler ve vergi

const kirp = (x: number) => Math.max(GOSTERGE.alt, Math.min(GOSTERGE.ust, Math.round(x)));

export function gostergeEkle(d: BolgeDurumu, g: Gosterge, deger: number): void {
  d.g[g] = kirp(d.g[g] + deger);
}

export function gostergeKademesi(x: number): "zayif" | "dengeli" | "guclu" {
  return x < GOSTERGE.zayif ? "zayif" : x < GOSTERGE.guclu ? "dengeli" : "guclu";
}

const vali = (d: BolgeDurumu): Koltuk => turKoltugu(d, "vali")!;
const ayarOku = (k: Koltuk | undefined, ad: string, varsayilan = 0): number => k?.ayar[ad] ?? varsayilan;

function npcNufusu(id: string): number {
  return BEYLIKLER.find((b) => b.id === id)?.yerlesimler.reduce((t, y) => t + y.npc, 0) ?? 0;
}

/** Aylık NPC halk vergisi (dökümüyle): nüfus × taban × oran çarpanı × pazar × arz × meşruiyet. */
export function vergiDokumu(d: BolgeDurumu) {
  const oran = d.devlet?.vergiOrani ?? ayarOku(vali(d), "vergiOrani", VERGI.baslangic);
  const pazar = PAZAR.ek[ayarOku(turKoltugu(d, "sehirBeyi"), "pazarVergisi")] ?? 0;
  const arz = 0.5 + d.g.arz / 100;
  const mesr = d.mesruiyet.kademe === "zayif" ? MESRUIYET.zayifVergi : 1;
  const nufus = npcNufusu(d.id);
  const tutar = Math.round(nufus * VERGI.npcBasi * (VERGI.carpan[oran] ?? 1) * (1 + pazar) * arz * mesr);
  return { tutar, nufus, oran, carpan: VERGI.carpan[oran] ?? 1, pazar, arz: Math.round(arz * 100) / 100, mesruiyet: mesr };
}

function mesruiyetHesapla(d: BolgeDurumu): void {
  const v = vali(d);
  d.haksiz = d.haksiz.filter((a) => a > d.ay - MESRUIYET.pencere);
  d.mesruiyet = bolgeMesruiyeti({
    vergiOrani: d.devlet?.vergiOrani ?? ayarOku(v, "vergiOrani", VERGI.baslangic),
    gostergeOrt: (d.g.arz + d.g.moral + d.g.guvenlik) / 3,
    haksizAzil: d.haksiz.length,
    onayliVali: !v.s.npc && !v.gecici,
    mogolTutum: d.sultanlik?.mogol.kademe ?? 0,
    ozerklik: ozerklikEtkin(d),
    valiTeveccuh: 0,
  });
}

/** Bayındırlık harcaması: bütçe sınırı (aylık tavan), azalan getiri (karekök), akçe dünyadan çıkar. */
function bayindir(d: BolgeDurumu, k: Koltuk, hedef: Gosterge, tutar: number, ay: number, kim: string): Sonuc<{ harcanan: number; etki: number; kalanButce: number }> {
  if (k.harcanan[0] !== ay) k.harcanan = [ay, 0];
  const tavan = Math.floor((BAYINDIRLIK.ayTavan[k.tur] ?? 0) * (ozerklikEtkin(d) && k.tur === "vali" ? BAYINDIRLIK.ozerklikCarpan : 1));
  if (k.harcanan[1] + tutar > tavan) return hata("sinir_asildi");
  if (d.kasa < tutar) return hata("kasa_yetersiz");
  const once = Math.min(BAYINDIRLIK.etkiTavan, Math.floor(Math.sqrt(k.harcanan[1])));
  const sonra = Math.min(BAYINDIRLIK.etkiTavan, Math.floor(Math.sqrt(k.harcanan[1] + tutar)));
  akceCik(d, tutar, "bayindirlik", ay, kim, k.id);
  k.harcanan[1] += tutar;
  gostergeEkle(d, hedef, sonra - once);
  return basarili({ harcanan: tutar, etki: sonra - once, kalanButce: tavan - k.harcanan[1] });
}

// ---------------------------------------------------------------- ay dönümü

export interface AyCiktisi {
  harac: { anahtar: string; tutar: number } | null;
  rapor: BolgeRaporu;
}

/** Bir ay dönümü. `ozet`: Sultanlığın son özeti (Moğol tutumu, Sultan meşruiyeti). */
export function bolgeAyi(d: BolgeDurumu, ay: number, simdi: number, ozet?: SultanlikOzeti): AyCiktisi {
  d.ay = ay;
  if (ozet) d.sultanlik = ozet;
  const v = vali(d);
  const tutum = d.sultanlik?.mogol.kademe ?? 0;
  // 1. Göstergeler tabana kayar; olağan işler önceki ayarla işler (sahibin girişine bağlı değil).
  for (const g of GOSTERGELER) {
    const x = d.g[g];
    d.g[g] = x > GOSTERGE.taban ? Math.max(GOSTERGE.taban, x - GOSTERGE.kayma) : Math.min(GOSTERGE.taban, x + GOSTERGE.kayma);
  }
  gostergeEkle(d, "moral", VERGI.moral[ayarOku(v, "vergiOrani", VERGI.baslangic)] ?? 0);
  const alarm = ayarOku(v, "alarm");
  gostergeEkle(d, "guvenlik", ALARM.guvenlik[alarm] ?? 0);
  gostergeEkle(d, "arz", ALARM.arz[alarm] ?? 0);
  akceCik(d, ALARM.gider[alarm] ?? 0, "alarmGideri", ay, "kurum", v.id);
  gostergeEkle(d, "arz", PAZAR.arz[ayarOku(turKoltugu(d, "sehirBeyi"), "pazarVergisi")] ?? 0);
  for (const k of d.koltuklar) {
    if (k.tur === "ahiBasi") {
      const e = ayarOku(k, "esnafNizami", 1);
      gostergeEkle(d, "arz", ESNAF.arz[e] ?? 0);
      gostergeEkle(d, "moral", ESNAF.moral[e] ?? 0);
    }
    if (k.tur === "kasabaAgasi" && k.ayar.ortakDert !== undefined) {
      gostergeEkle(d, ORTAK_DERT.hedefler[k.ayar.ortakDert] as Gosterge, ORTAK_DERT.artis);
    }
  }
  // D-46: Moğol etkisi yalnız bölge göstergelerine.
  const me = mogolEtkisi(tutum);
  for (const g of GOSTERGELER) gostergeEkle(d, g, me[g]);
  // 2. Ön talimat: kapsamı, süresi ve bütçe sınırı içinde, sahip yokken de işler.
  for (const k of d.koltuklar) {
    if (k.talimat && ay < k.talimat.bitis) bayindir(d, k, k.talimat.hedef as Gosterge, Math.min(k.talimat.tutar, d.kasa), ay, "talimat");
  }
  // 3. Vergi → vali kasası.
  const vergi = vergiDokumu(d);
  d.sonGelir = vergi.tutar;
  akceGir(d, vergi.tutar, "vergi", ay, "halk");
  // 4. Haraç → Sultan hazinesi (yolda; Sultanlık onaylayınca gönderilene geçer). Gecikme kademelidir.
  const bagimsiz = !!d.devlet && d.devlet.sultan !== "sultanligaDondu";
  const beklenen = bagimsiz ? 0 : Math.round(vergi.tutar * HARAC.pay * (1 - haracIndirimi(d)));
  const odenen = Math.min(beklenen, d.kasa);
  let harac: AyCiktisi["harac"] = null;
  if (odenen > 0) {
    const anahtar = `${d.id}:${ay}`;
    d.kasa -= odenen;
    d.yolda[anahtar] = (d.yolda[anahtar] ?? 0) + odenen;
    kayitEkle(d, ay, "harac", v.id, { k: "kayit.harac", p: { tutar: odenen, beklenen } }, { akce: -odenen, kasa: d.kasa, koltuk: v.id });
    harac = { anahtar, tutar: d.yolda[anahtar]! };
  }
  // Bağımsız devlet Sultan'a haraç ödemez; Moğol tercihi "haraç" ise pay doğrudan dünyadan çıkar.
  if (bagimsiz && d.devlet?.mogol === "harac") {
    const mogolHaraci = Math.min(Math.round(vergi.tutar * HARAC.pay), d.kasa);
    if (mogolHaraci > 0) akceCik(d, mogolHaraci, "mogolHaraci", ay, "mogol");
  }
  d.gecikme = odenen < beklenen ? d.gecikme + 1 : 0;
  if (d.gecikme > 0) kayitEkle(d, ay, "haracGecikme", v.id, { k: "kayit.haracGecikme", p: { kademe: HARAC.kademeler[Math.min(3, d.gecikme)] ?? "yaptirim", ay: d.gecikme } });
  // 5. Özerklik: Divan kararı, süre, şart ihlali, Moğol seferi.
  let yeniOzerklik = false;
  const karar = divanKarari(d, ay, d.sultanlik);
  if (karar) {
    yeniOzerklik = karar.durum === "etkin";
    kayitEkle(d, ay, "ozerklikKarari", "divan", { k: "kayit.ozerklikKarari", p: { karar: karar.karar!.tur, skor: karar.karar!.skor } });
  }
  const bitis = ozerklikAyi(d, ay, tutum);
  const darbeOnce = d.darbe?.durum;
  darbeAyi(d, ay);
  if (darbeOnce === "catışma" && (d.darbe?.durum === "bastirildi" || d.darbe?.durum === "mogol")) {
    const valiKoltugu = koltukBul(d, `vali:${d.id}`);
    if (valiKoltugu && valiKoltugu.s.kisi === d.darbe.baslatanKisi) {
      bosalt(d, valiKoltugu, ay, d.darbe.durum === "mogol" ? "mogolMud" : "darbeBastirildi");
    }
    kayitEkle(d, ay, "darbeSonuc", "kurum", { k: "kayit.darbeSonuc", p: { sonuc: d.darbe.durum } });
  } else if (darbeOnce === "catışma" && d.darbe?.sonuc) {
    kayitEkle(d, ay, "darbeSonuc", "kurum", { k: "kayit.darbeSonuc", p: { sonuc: d.darbe.sonuc.tur, saldiran: d.darbe.sonuc.saldiran, savunan: d.darbe.sonuc.savunan } });
  }
  if (bitis) kayitEkle(d, ay, "ozerklikBitti", "divan", { k: "kayit.ozerklikBitti", p: { neden: bitis } });
  // 6. NPC Sultan: haraçta yaptırım kademesindeki oyuncu valiyi doğrulanmış gerekçeyle azleder (itiraz yolu açık).
  if (!v.s.npc && d.gecikme >= HARAC.azilGecikme) azlet(d, v, "harac", "sultan", ay, true);
  // 7. İtirazlar (Divan/Moğol hakemliği), koltuklar, meşruiyet.
  itirazlariCoz(d, ay);
  for (const k of d.koltuklar) koltukAyi(d, k, ay, simdi);
  mesruiyetHesapla(d);
  const devletKarari = devletAyi(d, ay);
  if (devletKarari) kayitEkle(d, ay, "devletDiplomasi", "divan", { k: "kayit.devletDiplomasi", p: { sonuc: devletKarari } });
  const dt = turKoltugu(d, "divanTemsilcisi")!;
  const rapor: BolgeRaporu = {
    ay,
    mesruiyet: d.mesruiyet.puan,
    kademe: d.mesruiyet.kademe,
    moral: d.g.moral,
    haracBeklenen: beklenen,
    haracOdenen: odenen,
    gecikme: d.gecikme,
    ozerklik: ozerklikEtkin(d),
    yeniOzerklik,
    sultanHaksiz: d.sultanHaksiz,
    vali: { ad: v.s.ad, npc: v.s.npc },
    temsilci: { ad: dt.s.ad, npc: dt.s.npc, kisi: dt.s.kisi },
  };
  d.sultanHaksiz = 0;
  d.sonRapor = rapor;
  return { harac, rapor };
}

// ---------------------------------------------------------------- azil ve itiraz

function azlet(d: BolgeDurumu, k: Koltuk, gerekce: string, azleden: string, ay: number, dogrulandi: boolean): AzilKaydi {
  const kayit: AzilKaydi = {
    n: d.kn,
    ay,
    koltuk: k.id,
    eski: structuredClone(k.s),
    eskiDonem: [k.ds, k.dn],
    gerekce,
    azleden,
    itiraz: "yok",
    dogrulandi,
  };
  kayitEkle(d, ay, "azil", azleden, { k: "kayit.azil", p: { makam: k.id, ad: k.s.ad, gerekce, dogrulandi } }, { koltuk: k.id });
  d.aziller.push(kayit);
  if (d.aziller.length > 20) d.aziller.splice(0, d.aziller.length - 20);
  bosalt(d, k, ay, "azil");
  return kayit;
}

/** Gerekçe doğrulaması (sunucu bildiği olgulardan): yokluk ve ihmal doğrulanabilir; diğerleri Divan'a kalır. */
function gerekceDogrula(k: Koltuk, gerekce: string, ay: number, simdi: number): boolean {
  if (gerekce === "yokluk") return yoklukKademesi(k.s, simdi) !== "etkin";
  if (gerekce === "ihmal") return k.is === 0 && ay - k.ds >= AZIL.ihmalAy;
  return false;
}

/** Divan (ya da Moğol noyanı) itirazı karara bağlar: doğrulanmamış gerekçeli azil geri alınır ve "haksız" sayılır. */
function itirazlariCoz(d: BolgeDurumu, ay: number): void {
  for (const a of d.aziller) {
    if (a.itiraz !== "bekliyor") continue;
    const tutum = d.sultanlik?.mogol.kademe ?? 0;
    const kabul = a.hakem === "mogol" ? !a.dogrulandi && tutum <= 1 : !a.dogrulandi;
    a.itiraz = kabul ? "kabul" : "ret";
    kayitEkle(d, ay, "itirazKarari", a.hakem ?? "divan", { k: "kayit.itirazKarari", p: { makam: a.koltuk, kabul, hakem: a.hakem ?? "divan" } }, { koltuk: a.koltuk });
    if (!kabul) continue;
    const k = koltukBul(d, a.koltuk);
    if (!k) continue;
    if (a.azleden === "sultan") d.sultanHaksiz++;
    else d.haksiz.push(ay);
    // Eski tutucu, dönemi bitmediyse ve küme kuralı izin veriyorsa koltuğuna döner.
    const cakisir = d.koltuklar.some((x) => x.id !== k.id && MAKAMLAR[x.tur].kume && MAKAMLAR[k.tur].kume && !x.s.npc && kumeKesisir(x.s.kume, a.eski.kume));
    if (a.eskiDonem[1] > ay && !cakisir) {
      k.s = a.eski;
      k.ds = a.eskiDonem[0];
      k.dn = a.eskiDonem[1];
      delete k.gecici;
      delete k.secim;
    }
  }
}

// ---------------------------------------------------------------- oyuncu eylemleri

type Govde = Record<string, unknown>;

export interface EylemSonucu {
  islem: string;
  makam?: string;
  dokum?: unknown;
}

function oyuncuKoltugu(d: BolgeDurumu, makam: unknown, kimlik: SiyasiKimlik, simdi: number): Sonuc<{ k: Koltuk; neden: "sahip" | "vekil" | "naib" }> {
  const k = koltukBul(d, makam);
  if (!k) return hata("makam_yok");
  const e = etkinKisi(d, k, simdi);
  if (e.t.hesap !== kimlik.hesap || e.t.kisi !== kimlik.kisi) {
    // Sahip yokken vekil: sahibin kendisi döndüyse sahip olarak tanınır (etkinKisi zaten sahip döner).
    return hata("yetki_yok");
  }
  return basarili({ k, neden: e.neden });
}

function tamsayi(x: unknown, alt: number, ust: number): number | null {
  return typeof x === "number" && Number.isInteger(x) && x >= alt && x <= ust ? x : null;
}

function gostergeCoz(x: unknown): Gosterge | null {
  return typeof x === "string" && (GOSTERGELER as readonly string[]).includes(x) ? (x as Gosterge) : null;
}

/** Yetki kullanımı: etkin kişi mi → yetki listede mi (vekil daraltılmış) → bant/adım → bütçe → uygula ve kaydet. */
function yetkiKullan(d: BolgeDurumu, kimlik: SiyasiKimlik, g: Govde, ay: number, simdi: number): Sonuc<EylemSonucu> {
  const y = g.yetki;
  if (typeof y !== "string" || !(YETKILER as readonly string[]).includes(y)) return hata("gecersiz_istek");
  const yetki = y as Yetki;
  const r = oyuncuKoltugu(d, g.makam, kimlik, simdi);
  if (!r.ok) return r;
  const { k, neden } = r.deger;
  if (!yetkiAcik(k, yetki, neden)) return hata("yetki_yok");
  const kim = kimlik.kisi;
  const kaydet = (p: Record<string, string | number | boolean>) => {
    k.is++;
    kayitEkle(d, ay, "yetki", kim, { k: `kayit.yetki.${yetki}`, p: { makam: k.id, vekil: neden !== "sahip", ...p } }, { koltuk: k.id });
  };
  switch (yetki) {
    case "vergiOrani": {
      const deger = tamsayi(g.deger, 0, VERGI.carpan.length - 1);
      if (deger === null) return hata("deger_sinir_disi");
      const adim = ozerklikEtkin(d) ? OZERKLIK.vergiAdim : VERGI.adim;
      const eski = ayarOku(k, "vergiOrani", VERGI.baslangic);
      if (Math.abs(deger - eski) > adim || k.ayar.vergiAy === ay) return hata("sinir_asildi");
      k.ayar.vergiOrani = deger;
      k.ayar.vergiAy = ay;
      kaydet({ eski, yeni: deger });
      return basarili({ islem: "yetki", makam: k.id, dokum: { eski, yeni: deger, gelirCarpani: VERGI.carpan[deger], moralAylik: VERGI.moral[deger], mesruiyet: VERGI.mesruiyet[deger] } });
    }
    case "alarm": {
      const deger = tamsayi(g.deger, 0, ALARM.seviyeler.length - 1);
      if (deger === null) return hata("deger_sinir_disi");
      const eski = ayarOku(k, "alarm");
      if (Math.abs(deger - eski) > 1 || k.ayar.alarmAy === ay) return hata("sinir_asildi");
      k.ayar.alarm = deger;
      k.ayar.alarmAy = ay;
      kaydet({ eski, yeni: deger });
      return basarili({ islem: "yetki", makam: k.id, dokum: { seviye: ALARM.seviyeler[deger], guvenlik: ALARM.guvenlik[deger], arz: ALARM.arz[deger], aylikGider: ALARM.gider[deger] } });
    }
    case "bayindirlik": {
      const hedef = gostergeCoz(g.hedef);
      const tutar = tamsayi(g.tutar, 1, 10_000);
      if (!hedef || tutar === null) return hata("deger_sinir_disi");
      const s = bayindir(d, k, hedef, tutar, ay, kim);
      if (!s.ok) return s;
      kaydet({ hedef, tutar });
      return basarili({ islem: "yetki", makam: k.id, dokum: { hedef, ...s.deger, kasa: d.kasa } });
    }
    case "talimat": {
      if (g.talimat === null) {
        delete k.talimat;
        kaydet({ kaldir: true });
        return basarili({ islem: "yetki", makam: k.id, dokum: { talimat: null } });
      }
      const hedef = gostergeCoz(g.hedef);
      const tutar = tamsayi(g.tutar, 1, BAYINDIRLIK.ayTavan[k.tur] ?? 0);
      const sure = tamsayi(g.sure, 1, BAYINDIRLIK.talimatEnUzun);
      if (!hedef || tutar === null || sure === null) return hata("deger_sinir_disi");
      k.talimat = { hedef, tutar, bitis: ay + sure };
      kaydet({ hedef, tutar, sure });
      return basarili({ islem: "yetki", makam: k.id, dokum: { talimat: k.talimat, butceSiniri: BAYINDIRLIK.ayTavan[k.tur] } });
    }
    case "pazarVergisi":
    case "esnafNizami": {
      const deger = tamsayi(g.deger, 0, 2);
      if (deger === null) return hata("deger_sinir_disi");
      const ayAnahtar = `${yetki}Ay`;
      if (k.ayar[ayAnahtar] === ay) return hata("sinir_asildi");
      k.ayar[yetki] = deger;
      k.ayar[ayAnahtar] = ay;
      kaydet({ yeni: deger });
      const dokum = yetki === "pazarVergisi" ? { ekGelir: PAZAR.ek[deger], arzAylik: PAZAR.arz[deger] } : { arzAylik: ESNAF.arz[deger], moralAylik: ESNAF.moral[deger] };
      return basarili({ islem: "yetki", makam: k.id, dokum });
    }
    case "ortakDert": {
      const hedef = gostergeCoz(g.hedef);
      if (!hedef) return hata("deger_sinir_disi");
      k.ayar.ortakDert = ORTAK_DERT.hedefler.indexOf(hedef);
      kaydet({ hedef });
      return basarili({ islem: "yetki", makam: k.id, dokum: { hedef, aylik: ORTAK_DERT.artis } });
    }
    case "goster": {
      const hedef = koltukBul(d, g.hedef);
      if (!hedef || MAKAMLAR[hedef.tur].gosteren !== k.tur) return hata("makam_yok");
      const h = goster(d, hedef, g.aday, ay, kim);
      if (h) return hata(h);
      k.is++;
      return basarili({ islem: "yetki", makam: k.id, dokum: { hedef: hedef.id, aday: g.aday } });
    }
    case "azil": {
      const hedef = koltukBul(d, g.hedef);
      if (!hedef || MAKAMLAR[hedef.tur].gosteren !== k.tur) return hata("makam_yok");
      if (hedef.s.npc) return hata("hedef_uygun_degil");
      const gerekce = g.gerekce;
      if (typeof gerekce !== "string" || !(AZIL.gerekceler as readonly string[]).includes(gerekce) || gerekce === "harac") return hata("gerekce_gecersiz");
      if (k.azil >= AZIL.donemEnCok) return hata("sinir_asildi");
      k.azil++;
      k.is++;
      const a = azlet(d, hedef, gerekce, kim, ay, gerekceDogrula(hedef, gerekce, ay, simdi));
      return basarili({ islem: "yetki", makam: k.id, dokum: { hedef: hedef.id, gerekce, dogrulandi: a.dogrulandi, itirazSon: ay + AZIL.itirazAy, azil: a.n } });
    }
    case "ozerklik": {
      if (k.tur !== "vali") return hata("yetki_yok");
      const engel = basvuruEngeli(d, ay);
      if (engel) return hata(engel);
      const t = talepCoz(g);
      if (!t) return hata("deger_sinir_disi");
      const o = basvur(d, t, ay, d.kn);
      kaydet({ indirim: t.indirim, sure: t.sure, asker: t.asker });
      return basarili({ islem: "yetki", makam: k.id, dokum: { ozerklik: o, kararAyi: ay + 1 } });
    }
    case "vekil": {
      if (g.vekil === null) {
        delete k.v;
        kaydet({ kaldir: true });
        return basarili({ islem: "yetki", makam: k.id, dokum: { vekil: null } });
      }
      // Vekil yalnız bölgedeki başka bir makamın etkin oyuncu sahibi olabilir; kendi kümesinden olamaz.
      const vk = d.koltuklar.find((x) => x.id !== k.id && !x.s.npc && x.s.kisi === g.vekil);
      if (!vk || kumeKesisir(vk.s.kume, k.s.kume) || yoklukKademesi(vk.s, simdi) !== "etkin") return hata("vekil_gecersiz");
      k.v = structuredClone(vk.s);
      kaydet({ vekil: vk.s.ad });
      return basarili({ islem: "yetki", makam: k.id, dokum: { vekil: { kisi: vk.s.kisi, ad: vk.s.ad }, yetkiler: MAKAMLAR[k.tur].vekilYetkileri } });
    }
    case "cekil": {
      bosalt(d, k, ay, "cekilme");
      return basarili({ islem: "yetki", makam: k.id, dokum: { cekildi: true } });
    }
  }
}

/** Oyuncu eylemleri (istekNo tekrar güvenliği DO'dadır). */
export function bolgeEylem(d: BolgeDurumu, kimlik: SiyasiKimlik, g: Govde, simdi: number): Sonuc<EylemSonucu> {
  if (kimlik.olu) return hata("olu");
  const ay = d.ay;
  switch (g.islem) {
    case "aday": {
      const k = koltukBul(d, g.makam);
      if (!k) return hata("makam_yok");
      const engel = adayUygunMu(d, k, kimlik);
      if (engel) return hata(engel);
      // NPC tutucudaki makam oyuncu adaylığıyla seçime açılır; oyuncudaki makam dönem sonunu bekler.
      const s = k.secim ?? (k.s.npc ? secimAc(d, k, ay) : undefined);
      if (!s) return hata("secim_kapali");
      if (s.asama !== "adaylik") return hata("secim_kapali");
      if (s.adaylar.some((a) => a.hesap === kimlik.hesap)) return hata("zaten_aday");
      const aday = adayYap(d, kimlik, simdi);
      s.adaylar.push(aday);
      kayitEkle(d, ay, "aday", kimlik.kisi, { k: "kayit.aday", p: { makam: k.id, ad: kimlik.ad } }, { koltuk: k.id });
      return basarili({ islem: "aday", makam: k.id, dokum: { liyakat: aday.liyakat, kalemler: aday.dokum, asamaBitis: s.bitis } });
    }
    case "adayCekil": {
      const k = koltukBul(d, g.makam);
      const s = k?.secim;
      if (!k || !s) return hata("secim_kapali");
      const i = s.adaylar.findIndex((a) => a.hesap === kimlik.hesap);
      if (i < 0) return hata("aday_uygun_degil");
      s.adaylar.splice(i, 1);
      if (s.gosterilen === kimlik.kisi) delete s.gosterilen;
      kayitEkle(d, ay, "adayCekil", kimlik.kisi, { k: "kayit.adayCekil", p: { makam: k.id } }, { koltuk: k.id });
      return basarili({ islem: "adayCekil", makam: k.id });
    }
    case "oy": {
      const k = koltukBul(d, g.makam);
      const s = k?.secim;
      if (!k || !s || s.asama !== "oy") return hata("secim_kapali");
      if (!yerUygun(d, k, kimlik) || kimlik.yas < 16) return hata("oy_hakki_yok");
      if (!s.adaylar.some((a) => a.kisi === g.aday)) return hata("aday_uygun_degil");
      // Kişi (hesap) başına tek oy; son ana kadar değiştirilebilir.
      s.oylar[kimlik.hesap] = g.aday as string;
      if (!s.oyHesap.includes(kimlik.hesap)) s.oyHesap.push(kimlik.hesap);
      return basarili({ islem: "oy", makam: k.id, dokum: oySay(k) });
    }
    case "onay": {
      const k = koltukBul(d, g.makam);
      const s = k?.secim;
      if (!k || !s || s.asama !== "onay") return hata("secim_kapali");
      if (typeof g.evet !== "boolean") return hata("gecersiz_istek");
      // Onay büyük karardır: yalnız ileri gelen koltuğun sahibi (vekil değil) oy verir; her koltuk bir oy.
      const koltuklar = onaylayanKoltuklar(d, k).filter((x) => !x.s.npc && x.s.hesap === kimlik.hesap && x.s.kisi === kimlik.kisi);
      if (koltuklar.length === 0) return hata("oy_hakki_yok");
      for (const x of koltuklar) s.oylar[x.id] = g.evet ? "evet" : "hayir";
      const aday = s.adaylar.find((a) => a.kisi === s.gosterilen);
      return basarili({ islem: "onay", makam: k.id, dokum: aday ? onaySay(d, k, aday) : null });
    }
    case "yetki":
      return yetkiKullan(d, kimlik, g, ay, simdi);
    case "itiraz": {
      const a = d.aziller.find((x) => x.n === g.azil);
      if (!a) return hata("itiraz_yok");
      if (a.eski.hesap !== kimlik.hesap) return hata("taraf_degil");
      if (a.itiraz !== "yok" || ay > a.ay + AZIL.itirazAy) return hata("itiraz_kapali");
      const hakem = g.hakem === "mogol" ? "mogol" : "divan";
      if (hakem === "mogol") {
        // Moğol noyanı yalnız valinin Sultan'a karşı itirazına bakar; bedelli ve meşruiyeti aşındırır.
        if (a.azleden !== "sultan") return hata("hedef_uygun_degil");
        if (d.kasa < MOGOL.hakemBedel) return hata("kasa_yetersiz");
        akceCik(d, MOGOL.hakemBedel, "hakemBedeli", ay, kimlik.kisi);
        d.haksiz.push(ay);
      }
      a.itiraz = "bekliyor";
      a.hakem = hakem;
      kayitEkle(d, ay, "itiraz", kimlik.kisi, { k: "kayit.itiraz", p: { makam: a.koltuk, hakem } }, { koltuk: a.koltuk });
      return basarili({ islem: "itiraz", makam: a.koltuk, dokum: { hakem, kararAyi: ay + 1, dogrulandi: a.dogrulandi } });
    }
    case "ozerklikCevap": {
      const r = oyuncuKoltugu(d, vali(d).id, kimlik, simdi);
      if (!r.ok || r.deger.neden !== "sahip") return hata("yetki_yok");
      if (typeof g.kabul !== "boolean") return hata("gecersiz_istek");
      const h = sartliCevap(d, g.kabul, ay);
      if (h) return hata(h);
      kayitEkle(d, ay, "ozerklikCevap", kimlik.kisi, { k: "kayit.ozerklikCevap", p: { kabul: g.kabul } });
      return basarili({ islem: "ozerklikCevap", dokum: d.ozerklik });
    }
    case "darbeHazirla": {
      const r = oyuncuKoltugu(d, `vali:${d.id}`, kimlik, simdi);
      if (!r.ok || r.deger.neden !== "sahip") return hata("yetki_yok");
      const h = darbeHazirla(d, kimlik, ay);
      if (h) return hata(h);
      kayitEkle(d, ay, "darbeHazirlik", kimlik.kisi, { k: "kayit.darbeHazirlik" });
      return basarili({ islem: "darbeHazirla", dokum: darbeGorunumu(d, kimlik) });
    }
    case "darbeDestek": {
      const r = oyuncuKoltugu(d, g.makam, kimlik, simdi);
      if (!r.ok || r.deger.neden !== "sahip") return hata("yetki_yok");
      if (r.deger.k.tur !== "sehirBeyi" && r.deger.k.tur !== "ahiBasi") return hata("yetki_yok");
      const h = darbeDestekle(d, kimlik, r.deger.k.id, r.deger.k.tur, ay);
      if (h) return hata(h);
      kayitEkle(d, ay, "darbeDestek", kimlik.kisi, { k: "kayit.darbeDestek", p: { rol: r.deger.k.tur } }, { koltuk: r.deger.k.id });
      return basarili({ islem: "darbeDestek", dokum: darbeGorunumu(d, kimlik) });
    }
    case "darbeSavunma": {
      const r = oyuncuKoltugu(d, g.makam, kimlik, simdi);
      if (!r.ok || r.deger.neden !== "sahip") return hata("yetki_yok");
      if (r.deger.k.tur !== "sehirBeyi" && r.deger.k.tur !== "ahiBasi") return hata("yetki_yok");
      const h = darbeSavunmaYaz(d, kimlik, r.deger.k.id, r.deger.k.tur, ay);
      if (h) return hata(h);
      kayitEkle(d, ay, "darbeSavunma", kimlik.kisi, { k: "kayit.darbeSavunma", p: { rol: r.deger.k.tur } }, { koltuk: r.deger.k.id });
      return basarili({ islem: "darbeSavunma", dokum: darbeGorunumu(d, kimlik) });
    }
    case "darbeBarisTeklif": {
      const h = darbeBarisTeklifEt(d, kimlik, g.istekId, ay);
      if (h) return hata(h);
      kayitEkle(d, ay, "darbeBarisTeklif", kimlik.kisi, { k: "kayit.darbeBarisTeklif" });
      return basarili({ islem: "darbeBarisTeklif", dokum: darbeGorunumu(d, kimlik) });
    }
    case "darbeBarisYanit": {
      const h = darbeBarisYanit(d, kimlik, g.istekId, g.karar, ay);
      if (h) return hata(h);
      const kabul = g.karar === "kabul";
      kayitEkle(d, ay, kabul ? "darbeBarisKabul" : "darbeBarisRet", kimlik.kisi, {
        k: kabul ? "kayit.darbeBarisKabul" : "kayit.darbeBarisRet",
      });
      return basarili({ islem: "darbeBarisYanit", dokum: darbeGorunumu(d, kimlik) });
    }
    case "darbeSadakat": {
      const r = oyuncuKoltugu(d, `vali:${d.id}`, kimlik, simdi);
      if (!r.ok || r.deger.neden !== "sahip") return hata("yetki_yok");
      const tutar = tamsayi(g.tutar, DARBE.yatirimEnAz, DARBE.yatirimEnCok);
      if (tutar === null) return hata("deger_sinir_disi");
      const harcanan = darbeSadakatYatir(d, tutar, ay);
      if (typeof harcanan === "string") return hata(harcanan);
      akceCik(d, harcanan, "darbeIkmal", ay, kimlik.kisi, r.deger.k.id);
      kayitEkle(d, ay, "darbeSadakat", kimlik.kisi, { k: "kayit.darbeSadakat", p: { tutar: harcanan } }, { koltuk: r.deger.k.id });
      return basarili({ islem: "darbeSadakat", dokum: { darbe: darbeGorunumu(d, kimlik), harcanan } });
    }
    case "darbeIlan": {
      const r = oyuncuKoltugu(d, `vali:${d.id}`, kimlik, simdi);
      if (!r.ok || r.deger.neden !== "sahip") return hata("yetki_yok");
      if (g.mod !== "acik" && g.mod !== "baskin") return hata("gecersiz_istek");
      const esik = darbeEsigi(d);
      const h = darbeIlanEt(d, g.mod, ay);
      if (h) return hata(h);
      kayitEkle(d, ay, "darbeIlan", kimlik.kisi, { k: "kayit.darbeIlan", p: { mod: g.mod, cozumAy: d.darbe?.cozumAy ?? ay } });
      return basarili({ islem: "darbeIlan", dokum: { esik: esik.dokum, darbe: darbeGorunumu(d, kimlik) } });
    }
    case "darbeVazgec": {
      const r = oyuncuKoltugu(d, `vali:${d.id}`, kimlik, simdi);
      if (!r.ok || r.deger.neden !== "sahip") return hata("yetki_yok");
      const h = darbeVazgec(d, kimlik.kisi, ay);
      if (h) return hata(h);
      kayitEkle(d, ay, "darbeIptal", kimlik.kisi, { k: "kayit.darbeIptal" });
      return basarili({ islem: "darbeVazgec", dokum: darbeGorunumu(d, kimlik) });
    }
    case "devletYonet": {
      const h = devletYonet(d, kimlik, g);
      if (h) return hata(h);
      kayitEkle(d, ay, "devletKarari", kimlik.kisi, { k: "kayit.devletKarari", p: { tur: String(g.tur) } });
      return basarili({ islem: "devletYonet", dokum: devletGorunumu(d.devlet) });
    }
    case "devletYemin": {
      const h = devletYemin(d, kimlik, g.deger);
      if (h) return hata(h);
      kayitEkle(d, ay, "devletYemin", kimlik.kisi, { k: "kayit.devletYemin", p: { deger: g.deger as string } });
      return basarili({ islem: "devletYemin", dokum: devletGorunumu(d.devlet) });
    }
    case "ozerklikBirak": {
      const r = oyuncuKoltugu(d, vali(d).id, kimlik, simdi);
      if (!r.ok || r.deger.neden !== "sahip") return hata("yetki_yok");
      if (!ozerklikEtkin(d)) return hata("ozerklik_yok");
      geriAl(d, ay, "valiBirakti");
      kayitEkle(d, ay, "ozerklikBitti", kimlik.kisi, { k: "kayit.ozerklikBitti", p: { neden: "valiBirakti" } });
      return basarili({ islem: "ozerklikBirak", dokum: d.ozerklik });
    }
    default:
      return hata("gecersiz_istek");
  }
}

/** Faz 6 kancası: oyuncu/mülk vergisi vali kasasına (çağıran akçeyi düşmüş olmalı; anahtar tekrar güvenliği DO'da). */
export function vergiYatir(d: BolgeDurumu, tutar: number, yerlesim: string): HataKodu | null {
  if (!Number.isInteger(tutar) || tutar <= 0 || tutar > 1_000_000) return "deger_sinir_disi";
  if (!BEYLIKLER.find((b) => b.id === d.id)?.yerlesimler.some((y) => y.id === yerlesim)) return "yerlesim_gecersiz";
  akceGir(d, tutar, "oyuncuVergisi", d.ay, yerlesim);
  return null;
}

// ---------------------------------------------------------------- görünüm

function tutucuOzeti(t: { ad: string; npc: boolean; kisi: string }) {
  return { ad: t.ad, npc: t.npc, ...(t.npc ? {} : { kisi: t.kisi }) };
}

export function koltukGorunumu(d: BolgeDurumu, k: Koltuk, simdi: number, kimlik?: SiyasiKimlik) {
  const t = MAKAMLAR[k.tur];
  const e = etkinKisi(d, k, simdi);
  const s = k.secim;
  const aday = s?.adaylar.find((a) => a.kisi === s.gosterilen);
  const butce = BAYINDIRLIK.ayTavan[k.tur];
  return {
    id: k.id,
    tur: k.tur,
    yer: k.yer,
    yol: t.yol,
    sahip: tutucuOzeti(k.s),
    vekil: k.v ? tutucuOzeti(k.v) : null,
    etkin: { ...tutucuOzeti(e.t), neden: e.neden },
    yokluk: yoklukKademesi(k.s, simdi),
    donem: { bas: k.ds, son: k.dn, gecici: k.gecici === true, ardisik: k.ardisik },
    yetkiler: t.yetkiler.map((y) => ({ y, vekil: t.vekilYetkileri.includes(y) })),
    ayar: k.ayar,
    talimat: k.talimat ?? null,
    butce: butce === undefined ? null : { aylik: butce, harcanan: k.harcanan[0] === d.ay ? k.harcanan[1] : 0 },
    itiraz: t.itiraz,
    kume: t.kume,
    secim: s
      ? {
          asama: s.asama,
          bitis: s.bitis,
          deneme: s.deneme,
          adaylar: s.adaylar.map((a) => ({ ...tutucuOzeti(a), liyakat: a.liyakat, dokum: a.dokum })),
          gosterilen: aday ? tutucuOzeti(aday) : null,
          onay: aday && s.asama === "onay" ? onaySay(d, k, aday) : null,
          oy: s.asama === "oy" ? oySay(k) : null,
          benimOyum: kimlik ? (s.oylar[kimlik.hesap] ?? null) : null,
        }
      : null,
    uygunluk: kimlik ? (adayUygunMu(d, k, kimlik) ?? "uygun") : null,
  };
}

export function bolgeGorunumu(d: BolgeDurumu, simdi: number, kimlik?: SiyasiKimlik) {
  const b = BEYLIKLER.find((x) => x.id === d.id);
  const benim = kimlik && kimlik.bolge === d.id ? kimlik : undefined;
  const yolda = Object.values(d.yolda).reduce((t, x) => t + x, 0);
  return {
    ay: d.ay,
    bolge: {
      id: d.id,
      ad: b?.ad ?? d.id,
      gostergeler: Object.fromEntries(GOSTERGELER.map((g) => [g, { deger: d.g[g], kademe: gostergeKademesi(d.g[g]) }])),
      mesruiyet: mesruiyetGorunumu(d.mesruiyet),
      kasa: d.kasa,
      defter: { giren: d.giren, cikan: d.cikan, gonderilen: d.gonderilen, yolda, tutarli: defterTutarli(d) },
      vergi: vergiDokumu(d),
      harac: { pay: HARAC.pay, indirim: haracIndirimi(d), gecikme: d.gecikme, kademe: HARAC.kademeler[Math.min(3, d.gecikme)] },
      alarm: ALARM.seviyeler[ayarOku(vali(d), "alarm")],
      ozerklik: d.ozerklik ?? null,
      devlet: devletGorunumu(d.devlet),
      darbe: darbeGorunumu(d, kimlik),
    },
    makamlar: d.koltuklar.map((k) => koltukGorunumu(d, k, simdi, benim)),
    aziller: d.aziller.slice(-5).map((a) => ({ n: a.n, ay: a.ay, makam: a.koltuk, ad: a.eski.ad, gerekce: a.gerekce, dogrulandi: a.dogrulandi, itiraz: a.itiraz, hakem: a.hakem ?? null, itirazSon: a.ay + AZIL.itirazAy })),
    sultanlik: d.sultanlik ?? null,
    kayit: d.kayit.slice(-20),
    kayitSayisi: d.kn,
    benim: benim
      ? {
          kisi: benim.kisi,
          kume: kumeAnahtarlari(benim).length,
          makamlar: d.koltuklar.filter((k) => !k.s.npc && k.s.hesap === benim.hesap).map((k) => k.id),
          vekillikler: d.koltuklar.filter((k) => k.v?.hesap === benim.hesap).map((k) => k.id),
          adayliklar: d.koltuklar.filter((k) => k.secim?.adaylar.some((a) => a.hesap === benim.hesap)).map((k) => k.id),
          azillerim: d.aziller.filter((a) => a.eski.hesap === benim.hesap && a.itiraz === "yok" && d.ay <= a.ay + AZIL.itirazAy).map((a) => a.n),
        }
      : null,
  };
}
