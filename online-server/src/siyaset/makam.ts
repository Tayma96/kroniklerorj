// Makam, seçim/atama, yokluk ve devir (Faz 7 + P1). Kurallar:
// - Her makamın yetki listesi, görev süresi, bütçe sınırı, itiraz yolu ve işlem kaydı vardır (sabitler.ts).
// - Karışık atama (D-38): gösteren makam aday gösterir, ileri gelenler onaylar; yeter sayı kademeli düşer.
// - Makam yokluğu toplumu kilitlemez: etkin kişi her zaman vardır (sahip → vekil → NPC naib).
// - Hesap kümesi kuralı: vali, şehir beyi, ahi başı ve Divan temsilcisi aynı kümeden olamaz.
// - Vekil büyük siyasi karar alamaz; giden makam sahibi halef atayamaz; karakter silinmez.
// Saf fonksiyonlar; zar yalnız tohumlu (rastgele.ts).

import { AD_HAVUZLARI } from "../icerik/adlar.ts";
import { BEYLIKLER } from "../dunya-veri.ts";
import { karma, tohumlu } from "../yerlesim/rastgele.ts";
import { teveccuhEtkisi } from "../yerlesim/teveccuh.ts";
import type { HataKodu } from "../tipler.ts";
import { GUN_MS, LIYAKAT, MAKAMLAR, SART, SECIM, YOKLUK_GUN, type MakamTuru, type Yetki } from "./sabitler.ts";
import type { Aday, BolgeDurumu, KayitSatiri, Koltuk, Metin, Neden, Secim, SiyasiKimlik, Tutucu } from "./tipler.ts";

// ---------------------------------------------------------------- kayıt

/** İşlem kaydına satır ekler (yalnız eklenir; son satırlar durumda, tamamı DO'da sayfalarda). */
export function kayitEkle(
  d: { kayit: KayitSatiri[]; kn: number },
  ay: number,
  tur: string,
  kim: string,
  m: Metin,
  ek: { koltuk?: string; akce?: number; kasa?: number } = {},
): KayitSatiri {
  const s: KayitSatiri = { n: d.kn++, ay, tur, kim, m, ...ek };
  d.kayit.push(s);
  if (d.kayit.length > 100) d.kayit.splice(0, d.kayit.length - 100);
  return s;
}

// ---------------------------------------------------------------- kimlik, küme, liyakat

/** Hesap kümesi yaklaşığı: aynı hesap ya da aynı hane (teveccuh.ts ayniKume ile aynı ölçü). */
export function kumeAnahtarlari(k: Pick<SiyasiKimlik, "hesap" | "yerlesim" | "e">): string[] {
  return [`h:${k.hesap}`, ...(k.e !== 0 ? [`e:${k.yerlesim}:${k.e}`] : [])];
}

export function kumeKesisir(a: readonly string[], b: readonly string[]): boolean {
  return a.length > 0 && b.some((x) => a.includes(x));
}

export function liyakat(k: SiyasiKimlik, gecmis: readonly string[]): { puan: number; dokum: Neden[] } {
  const dokum: Neden[] = [
    { k: "liyakat.nam", d: Math.floor(k.nam / LIYAKAT.namBolen) },
    { k: "liyakat.teveccuh", d: Math.min(LIYAKAT.teveccuhTavan, teveccuhEtkisi(k.teveccuh, "secim")) },
    { k: "liyakat.hak", d: k.haklar.includes("bolgeMakami") ? LIYAKAT.hakBolge : k.haklar.includes("kasabaMakami") ? LIYAKAT.hakKasaba : 0 },
    { k: "liyakat.gecmis", d: Math.min(LIYAKAT.gecmisTavan, gecmis.length * LIYAKAT.gecmisMakam) },
  ].filter((n) => n.d !== 0);
  return { puan: dokum.reduce((t, n) => t + n.d, 0), dokum };
}

export function oyuncuTutucu(k: SiyasiKimlik, puan: number, simdi: number): Tutucu {
  return { npc: false, kisi: k.kisi, hesap: k.hesap, ad: k.ad, kume: kumeAnahtarlari(k), sg: simdi, liyakat: puan };
}

/** Kurumun NPC tutucusu (deterministik ad; tr havuzundan, özel ad olarak gösterilir). */
export function npcTutucu(tohum: string): Tutucu {
  const r = tohumlu(tohum, "npc");
  const h = AD_HAVUZLARI.tr;
  const ad = `${h.m[Math.floor(r() * h.m.length)]} ${h.s[Math.floor(r() * h.s.length)]}`;
  return { npc: true, kisi: `npc:${karma(tohum).toString(36)}`, ad, kume: [], liyakat: LIYAKAT.npc };
}

// ---------------------------------------------------------------- koltuklar

function yeniKoltuk(id: string, tur: MakamTuru, yer: string, ay: number): Koltuk {
  const t = MAKAMLAR[tur];
  return { id, tur, yer, s: npcTutucu(`${id}:${ay}`), ds: ay, dn: ay + t.donemAy, ardisik: 0, ayar: {}, harcanan: [ay, 0], azil: 0, is: 0, yd: 0 };
}

/** Bölgenin bütün koltukları (7 beylik verisi 7 bölge olarak korunur; Ç1). Başta hepsi NPC tutucudadır. */
export function bolgeKoltuklari(bolgeId: string, ay: number): Koltuk[] {
  const b = BEYLIKLER.find((x) => x.id === bolgeId);
  if (!b) return [];
  const k: Koltuk[] = [yeniKoltuk(`vali:${b.id}`, "vali", b.id, ay), yeniKoltuk(`divanTemsilcisi:${b.id}`, "divanTemsilcisi", b.id, ay)];
  for (const y of b.yerlesimler) {
    if (y.tur === "sehir") k.push(yeniKoltuk(`sehirBeyi:${y.id}`, "sehirBeyi", y.id, ay));
    if (y.tur !== "koy") k.push(yeniKoltuk(`ahiBasi:${y.id}`, "ahiBasi", y.id, ay));
    if (y.tur === "kasaba") k.push(yeniKoltuk(`kasabaAgasi:${y.id}`, "kasabaAgasi", y.id, ay));
  }
  return k;
}

export const koltukBul = (d: BolgeDurumu, id: unknown): Koltuk | undefined =>
  typeof id === "string" ? d.koltuklar.find((k) => k.id === id) : undefined;

export const turKoltugu = (d: BolgeDurumu, tur: MakamTuru): Koltuk | undefined => d.koltuklar.find((k) => k.tur === tur);

/** Kişinin yerleşimi koltuğun bölgesinde/yerleşiminde mi (bölge makamları bölgede, yerel makamlar yerleşimde). */
export function yerUygun(d: BolgeDurumu, k: Koltuk, kimlik: SiyasiKimlik): boolean {
  if (kimlik.bolge !== d.id) return false;
  return k.tur === "vali" || k.tur === "divanTemsilcisi" || k.tur === "sehirBeyi" ? true : kimlik.yerlesim === k.yer;
}

/** Hesap kümesi kuralı: aynı kümeden başka bir kısıtlı koltuk tutucusu var mı (kendi koltuğu hariç). */
export function kumeCakisir(d: BolgeDurumu, koltukId: string, kume: readonly string[]): boolean {
  const hedef = d.koltuklar.find((k) => k.id === koltukId);
  if (!hedef || !MAKAMLAR[hedef.tur].kume) return false;
  return d.koltuklar.some((k) => k.id !== koltukId && MAKAMLAR[k.tur].kume && !k.s.npc && kumeKesisir(k.s.kume, kume));
}

/** Adaylık şartı denetimi (null = uygun). */
export function adayUygunMu(d: BolgeDurumu, k: Koltuk, kimlik: SiyasiKimlik): HataKodu | null {
  const t = MAKAMLAR[k.tur];
  if (t.yol === "npc") return "makam_kapali";
  if (kimlik.olu) return "olu";
  if (!yerUygun(d, k, kimlik)) return "yerlesim_gecersiz";
  if (kimlik.yas < t.enAzYas) return "yas_kapisi";
  const gecmis = d.gecmis[kimlik.hesap] ?? [];
  if (t.sart === "bolge" && !kimlik.haklar.includes("bolgeMakami") && gecmis.length === 0) return "aday_uygun_degil";
  if (t.sart === "kasaba" && !kimlik.haklar.includes("kasabaMakami") && !kimlik.haklar.includes("bolgeMakami") && kimlik.nam < SART.kasabaNam) {
    return "aday_uygun_degil";
  }
  if (t.sart === "teveccuh" && kimlik.teveccuh < SART.ahiTeveccuh) return "aday_uygun_degil";
  const kume = kumeAnahtarlari(kimlik);
  if (kumeCakisir(d, k.id, kume)) return "kume_cakisma";
  if (!k.s.npc && kumeKesisir(k.s.kume, kume) && k.ardisik >= SECIM.ardisikEnCok) return "ardisik_donem";
  return null;
}

export function adayYap(d: BolgeDurumu, kimlik: SiyasiKimlik, simdi: number): Aday {
  const l = liyakat(kimlik, d.gecmis[kimlik.hesap] ?? []);
  return { ...oyuncuTutucu(kimlik, l.puan, simdi), dokum: l.dokum, yerlesim: kimlik.yerlesim };
}

// ---------------------------------------------------------------- yokluk ve etkin kişi

export type YoklukKademesi = "etkin" | "vekil" | "uyku" | "devir";

export function yoklukKademesi(t: Tutucu, simdi: number): YoklukKademesi {
  if (t.npc || t.sg === undefined) return "etkin";
  const gun = (simdi - t.sg) / GUN_MS;
  if (gun < YOKLUK_GUN.vekil) return "etkin";
  if (gun < YOKLUK_GUN.uyku) return "vekil";
  if (gun < YOKLUK_GUN.devir) return "uyku";
  return "devir";
}

export interface Etkin {
  t: Tutucu;
  neden: "sahip" | "vekil" | "naib";
}

/** Makamın şu an etkin kişisi; asla boş dönmez. Vali yoksa vekil, o da yoksa Divan temsilcisi, yoksa NPC naib. */
export function etkinKisi(d: BolgeDurumu, k: Koltuk, simdi: number): Etkin {
  if (yoklukKademesi(k.s, simdi) === "etkin") return { t: k.s, neden: "sahip" };
  if (k.v && yoklukKademesi(k.v, simdi) === "etkin") return { t: k.v, neden: "vekil" };
  if (k.tur === "vali") {
    const dt = turKoltugu(d, "divanTemsilcisi");
    if (dt && !dt.s.npc && yoklukKademesi(dt.s, simdi) === "etkin") return { t: dt.s, neden: "vekil" };
  }
  return { t: npcTutucu(`${k.id}:naib`), neden: "naib" };
}

/** Yetki bu etkin kişi için açık mı (vekil/naib yalnız daraltılmış listede). */
export function yetkiAcik(k: Koltuk, yetki: Yetki, neden: Etkin["neden"]): boolean {
  const t = MAKAMLAR[k.tur];
  return neden === "sahip" ? t.yetkiler.includes(yetki) : t.vekilYetkileri.includes(yetki);
}

// ---------------------------------------------------------------- atama, boşaltma

/** Tutucuyu atar; tırmanış geçmişine yazar. Ön talimat ve vekil sıfırlanır, olağan ayarlar sürer. */
export function ata(d: BolgeDurumu, k: Koltuk, t: Tutucu, ay: number, gecici: boolean): void {
  const ayniKume = !k.s.npc && !t.npc && kumeKesisir(k.s.kume, t.kume);
  const donem = MAKAMLAR[k.tur].donemAy;
  k.ardisik = t.npc ? 0 : ayniKume ? k.ardisik + 1 : 1;
  k.s = { npc: t.npc, kisi: t.kisi, ad: t.ad, kume: t.kume, liyakat: t.liyakat, ...(t.hesap ? { hesap: t.hesap } : {}), ...(t.sg !== undefined ? { sg: t.sg } : {}) };
  k.ds = ay;
  k.dn = ay + (gecici ? Math.max(1, Math.ceil(donem / 2)) : donem);
  k.gecici = gecici || undefined;
  delete k.v;
  delete k.talimat;
  delete k.secim;
  k.azil = 0;
  k.is = 0;
  if (t.hesap) {
    const g = (d.gecmis[t.hesap] ??= []);
    g.push(k.tur);
    if (g.length > 10) g.splice(0, g.length - 10);
  }
  if (k.tur === "vali") delete d.ozerklik?.cevapSon; // yeni vali şartlı teklifi devralmaz
  kayitEkle(d, ay, "atama", t.kisi, { k: "kayit.atama", p: { makam: k.id, ad: t.ad, gecici, npc: t.npc } }, { koltuk: k.id });
}

/** Koltuğu boşaltır: NPC naib geçici tutar ve seçim açılır (makam askıda kalmaz; karakter silinmez). */
export function bosalt(d: BolgeDurumu, k: Koltuk, ay: number, neden: string): void {
  const eski = k.s;
  const surenSecim = k.secim;
  ata(d, k, npcTutucu(`${k.id}:${ay}:${neden}`), ay, true);
  kayitEkle(d, ay, "bosalma", eski.kisi, { k: "kayit.bosalma", p: { makam: k.id, ad: eski.ad, neden } }, { koltuk: k.id });
  if (surenSecim) {
    surenSecim.adaylar = surenSecim.adaylar.filter((a) => a.hesap !== eski.hesap);
    k.secim = surenSecim;
  } else secimAc(d, k, ay);
}

// ---------------------------------------------------------------- seçim

export function secimAc(d: BolgeDurumu, k: Koltuk, ay: number): Secim | undefined {
  if (MAKAMLAR[k.tur].yol === "npc" || k.secim) return k.secim;
  k.secim = { asama: "adaylik", acilis: ay, bitis: ay + SECIM.adaylikAy, adaylar: [], reddedilen: [], oylar: {}, oyHesap: [], deneme: 0 };
  kayitEkle(d, ay, "secimAcildi", "kurum", { k: "kayit.secimAcildi", p: { makam: k.id, bitis: k.secim.bitis } }, { koltuk: k.id });
  return k.secim;
}

/** Onay yeter oranı (ardışık yetersiz katılımda kademeli düşer). */
export const yeterOran = (yd: number): number => Math.max(SECIM.yeterAlt, SECIM.yeterOran - SECIM.yeterDusus * yd);
export const yeterOy = (yd: number): number => Math.max(SECIM.yeterOyAlt, SECIM.yeterOy - yd);

/** Kümesi çakışmayan, reddedilmemiş adaylar; liyakat sonra kişi kimliğine göre sıralı (deterministik). */
function gosterilebilir(d: BolgeDurumu, k: Koltuk): Aday[] {
  const s = k.secim;
  if (!s) return [];
  return s.adaylar
    .filter((a) => !s.reddedilen.includes(a.kisi) && !kumeCakisir(d, k.id, a.kume))
    .sort((a, b) => b.liyakat - a.liyakat || (a.kisi < b.kisi ? -1 : 1));
}

export function onaylayanKoltuklar(d: BolgeDurumu, k: Koltuk): Koltuk[] {
  const tur = MAKAMLAR[k.tur].onaylayanlar ?? [];
  return d.koltuklar.filter((x) => x.id !== k.id && tur.includes(x.tur));
}

/** NPC ileri gelenin onay oyu: NPC adaya ve eşiği geçen oyuncu adaya evet. */
export function npcOnayi(aday: Aday): boolean {
  return aday.npc || aday.liyakat >= SECIM.npcOnayEsik;
}

export interface OnaySayimi {
  evet: number;
  hayir: number;
  katilan: number;
  koltuk: number;
  gereken: number;
}

export function onaySay(d: BolgeDurumu, k: Koltuk, aday: Aday): OnaySayimi {
  const s = k.secim!;
  const koltuklar = onaylayanKoltuklar(d, k);
  let evet = 0;
  let hayir = 0;
  let katilan = 0;
  for (const x of koltuklar) {
    const oy = x.s.npc ? (npcOnayi(aday) ? "evet" : "hayir") : s.oylar[x.id];
    if (oy === undefined) continue;
    katilan++;
    if (oy === "evet") evet++;
    else hayir++;
  }
  return { evet, hayir, katilan, koltuk: koltuklar.length, gereken: Math.ceil(koltuklar.length * yeterOran(k.yd)) };
}

export interface OySayimi {
  oylar: Record<string, number>;
  oyuncu: number;
  npc: { aday: string; agirlik: number } | null;
  gereken: number;
}

export function oySay(k: Koltuk): OySayimi {
  const s = k.secim!;
  const oylar: Record<string, number> = {};
  for (const a of s.adaylar) oylar[a.kisi] = 0;
  let oyuncu = 0;
  for (const aday of Object.values(s.oylar)) {
    if (oylar[aday] === undefined) continue;
    oylar[aday]++;
    oyuncu++;
  }
  const sirali = [...s.adaylar].sort((a, b) => b.liyakat - a.liyakat || (a.kisi < b.kisi ? -1 : 1));
  const tercih = sirali[0];
  const agirlik = Math.max(1, Math.round((oyuncu * SECIM.npcOyPayi) / (1 - SECIM.npcOyPayi)));
  if (tercih) oylar[tercih.kisi] = (oylar[tercih.kisi] ?? 0) + agirlik;
  return { oylar, oyuncu, npc: tercih ? { aday: tercih.kisi, agirlik } : null, gereken: yeterOy(k.yd) };
}

function adayTutucu(a: Aday): Tutucu {
  return { npc: a.npc, kisi: a.kisi, ad: a.ad, kume: a.kume, liyakat: a.liyakat, ...(a.hesap ? { hesap: a.hesap } : {}), ...(a.sg !== undefined ? { sg: a.sg } : {}) };
}

/** NPC gösteren (ya da süresinde göstermeyen oyuncu yerine kurum usulü) en yüksek liyakatli uygun adayı seçer. */
function otomatikGoster(d: BolgeDurumu, k: Koltuk, ay: number, kim: string): boolean {
  const a = gosterilebilir(d, k)[0];
  if (!a) return false;
  return gosterAta(d, k, a, ay, kim);
}

/** Gösterilen aday: atamada doğrudan atanır, karmada onaya gider. */
function gosterAta(d: BolgeDurumu, k: Koltuk, a: Aday, ay: number, kim: string): boolean {
  const s = k.secim!;
  s.gosterilen = a.kisi;
  kayitEkle(d, ay, "goster", kim, { k: "kayit.goster", p: { makam: k.id, aday: a.ad } }, { koltuk: k.id });
  if (MAKAMLAR[k.tur].yol === "atama") {
    ata(d, k, adayTutucu(a), ay, false);
    return true;
  }
  s.asama = "onay";
  s.bitis = ay + SECIM.onayAy;
  s.oylar = {};
  return true;
}

/** Oyuncu gösterenin aday göstermesi (yetki "goster"). */
export function goster(d: BolgeDurumu, k: Koltuk, adayKisi: unknown, ay: number, kim: string): HataKodu | null {
  const s = k.secim;
  if (!s || s.asama !== "gosterme") return "secim_kapali";
  const a = gosterilebilir(d, k).find((x) => x.kisi === adayKisi);
  if (!a) return s.adaylar.some((x) => x.kisi === adayKisi) ? "kume_cakisma" : "aday_uygun_degil";
  gosterAta(d, k, a, ay, kim);
  return null;
}

function gostermeyeGec(d: BolgeDurumu, k: Koltuk, ay: number, simdi: number): void {
  const s = k.secim!;
  s.asama = "gosterme";
  s.bitis = ay + SECIM.gostermeAy;
  delete s.gosterilen;
  const gosteren = MAKAMLAR[k.tur].gosteren;
  const gk = gosteren === "sultan" ? undefined : gosteren ? turKoltugu(d, gosteren) : undefined;
  // Sultan başta NPC'dir (D-40); gösteren NPC ya da yoksa kurum usulü hemen gösterir.
  const npcGosterir = !gk || etkinKisi(d, gk, simdi).neden !== "sahip";
  if (npcGosterir && !otomatikGoster(d, k, ay, gosteren === "sultan" ? "sultan" : "kurum")) kurumTutsun(d, k, ay);
}

/** Uygun aday kalmadı: kurum tutucusu (NPC) geçici sürer; makam askıda kalmaz. */
function kurumTutsun(d: BolgeDurumu, k: Koltuk, ay: number): void {
  kayitEkle(d, ay, "adaySiz", "kurum", { k: "kayit.adaySiz", p: { makam: k.id } }, { koltuk: k.id });
  if (k.s.npc) {
    k.dn = ay + MAKAMLAR[k.tur].donemAy;
    delete k.secim;
  } else ata(d, k, npcTutucu(`${k.id}:${ay}:kurum`), ay, true);
}

/** Seçimin ay dönümü adımı. */
export function secimAdimi(d: BolgeDurumu, k: Koltuk, ay: number, simdi: number): void {
  const s = k.secim;
  if (!s || ay < s.bitis) return;
  const yol = MAKAMLAR[k.tur].yol;
  if (s.asama === "adaylik") {
    if (s.adaylar.length === 0) return kurumTutsun(d, k, ay);
    if (yol === "secim") {
      s.asama = "oy";
      s.bitis = ay + SECIM.oyAy;
      return;
    }
    return gostermeyeGec(d, k, ay, simdi);
  }
  if (s.asama === "gosterme") {
    // Oyuncu gösteren süresinde göstermedi: kurum usulü gösterir.
    if (!otomatikGoster(d, k, ay, "kurum")) kurumTutsun(d, k, ay);
    return;
  }
  if (s.asama === "onay") {
    const aday = s.adaylar.find((a) => a.kisi === s.gosterilen);
    if (!aday) return gostermeyeGec(d, k, ay, simdi);
    const say = onaySay(d, k, aday);
    kayitEkle(d, ay, "onaySayim", "kurum", { k: "kayit.onaySayim", p: { makam: k.id, aday: aday.ad, evet: say.evet, hayir: say.hayir, katilan: say.katilan, gereken: say.gereken } }, { koltuk: k.id });
    if (say.katilan < say.gereken) {
      k.yd++;
      s.deneme++;
      if (s.deneme >= SECIM.denemeEnCok) return ata(d, k, adayTutucu(aday), ay, true);
      s.bitis = ay + SECIM.onayAy;
      s.oylar = {};
      return;
    }
    if (say.evet > say.hayir && !kumeCakisir(d, k.id, aday.kume)) {
      k.yd = 0;
      return ata(d, k, adayTutucu(aday), ay, false);
    }
    s.reddedilen.push(aday.kisi);
    s.deneme++;
    if (s.deneme >= SECIM.denemeEnCok || gosterilebilir(d, k).length === 0) return kurumTutsun(d, k, ay);
    return gostermeyeGec(d, k, ay, simdi);
  }
  // oy
  const say = oySay(k);
  const sirali = [...s.adaylar].sort((a, b) => {
    const fark = (say.oylar[b.kisi] ?? 0) - (say.oylar[a.kisi] ?? 0);
    if (fark !== 0) return fark;
    if (b.liyakat !== a.liyakat) return b.liyakat - a.liyakat;
    return tohumlu(k.id, ay, a.kisi)() - tohumlu(k.id, ay, b.kisi)();
  });
  const yeter = say.oyuncu >= say.gereken;
  const kazanan = (yeter ? sirali : sirali.filter((a) => a.kisi === say.npc?.aday)).find((a) => !kumeCakisir(d, k.id, a.kume));
  kayitEkle(d, ay, "oySayim", "kurum", { k: "kayit.oySayim", p: { makam: k.id, oyuncu: say.oyuncu, gereken: say.gereken, kazanan: kazanan?.ad ?? "-" } }, { koltuk: k.id });
  if (!kazanan) return kurumTutsun(d, k, ay);
  if (yeter) k.yd = 0;
  else k.yd++;
  ata(d, k, adayTutucu(kazanan), ay, !yeter);
}

/** Koltuğun ay dönümü: yokluk devri, dönem sonu seçimi, seçim adımı, talimat süresi. */
export function koltukAyi(d: BolgeDurumu, k: Koltuk, ay: number, simdi: number): void {
  if (MAKAMLAR[k.tur].yol === "npc") return;
  if (!k.s.npc && yoklukKademesi(k.s, simdi) === "devir") bosalt(d, k, ay, "yokluk");
  if (k.v && yoklukKademesi(k.v, simdi) === "devir") delete k.v;
  if (k.talimat && ay >= k.talimat.bitis) delete k.talimat;
  if (!k.secim && ay >= k.dn) {
    const s = secimAc(d, k, ay);
    // Görevdeki oyuncu yeniden onaya girer (ardışık dönem sınırı ve yokluk izin verirse).
    if (s && !k.s.npc && k.ardisik < SECIM.ardisikEnCok && yoklukKademesi(k.s, simdi) === "etkin") {
      s.adaylar.push({ ...k.s, dokum: [{ k: "liyakat.gorevde", d: k.s.liyakat }] });
    }
  }
  secimAdimi(d, k, ay, simdi);
}

/** Kimlik görüldü: son görülmeyi tazeler; tutucu öldüyse (ya da vâris geçtiyse) makam boşalır. */
export function kimlikGor(d: BolgeDurumu, kimlik: SiyasiKimlik, simdi: number): void {
  for (const k of d.koltuklar) {
    if (k.s.hesap === kimlik.hesap) {
      if (kimlik.olu || k.s.kisi !== kimlik.kisi) bosalt(d, k, d.ay, "olum");
      else k.s.sg = simdi;
    }
    if (k.v?.hesap === kimlik.hesap) {
      if (kimlik.olu || k.v.kisi !== kimlik.kisi) delete k.v;
      else k.v.sg = simdi;
    }
    const s = k.secim;
    if (s) {
      const i = s.adaylar.findIndex((a) => a.hesap === kimlik.hesap);
      if (i >= 0 && (kimlik.olu || s.adaylar[i]!.kisi !== kimlik.kisi)) s.adaylar.splice(i, 1);
      else if (i >= 0) s.adaylar[i]!.sg = simdi;
    }
  }
}
