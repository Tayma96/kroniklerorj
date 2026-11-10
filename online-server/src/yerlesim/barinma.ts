// Barınma ve evsizlik (GDD §18, D-16; Faz 14). Zaman ortak tek dünya saatidir: sayaç oyuncu çevrimdışıyken de işler.
// Durum ms damgalarından tembel hesaplanır (konaklama aralıkları, misafirhane hakkı, zincir başı); Hal etkileri ay
// dönümünde (dönüm anına göre) uygulanır. Saf fonksiyonlar; karakteri yerinde değiştirir.
//
// Zincir (koruma bitişinden): uyarı → +24 saat Evsiz (kondisyon ve gönül düşer) → +72 saat can düşer. Can tabanı %10
// (HAL_TABAN_CAN), ölüm yok. Konaklama bulununca zincir durur, Evsiz unvanı kalkar, Hal olağan hızla (oda varsa
// daha hızlı) toparlanır.
//
// Konaklama sayılanlar: kiralık oda, ocak (yaşayan aile hanesi; GDD "ev ya da mülk"), misafirhane hakkı, sosyal tesis
// (imaret/zaviye, D-23 önerisi). Misafirhane hakkı (ShelterGrant, karakter × şehir) ihtiyaç anında açılır: başka
// konaklamanın bittiği andan sayılır; ilk yerleşimde karakter ömründe bir kez 48 saat, diğer şehirlerde şehir başına
// bir kez 12 saat. Aynı şehre dönmek hakkı yenilemez.
//
// Uyku kademesi (D-22 önerisi): 30 günü aşan yoklukta etkiler işlemez ve otomatik kira harcamaz (taban zaten %10);
// dönüşte bir aylık mola (12 saat) boyunca yeni etki işlemez, dönüş ekranı tek dokunuşla barınma sunar.

import type { YerlesimTuru } from "../dunya-veri.ts";
import { AY_MS, DUNYA_BASLANGICI_MS } from "../saat.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { GONUL_EVSIZLIK, HAL_TABAN_CAN, halDegistir } from "./hal.ts";
import { olduMu } from "./hanedan.ts";
import {
  KIRA_EN_UZUN_AY,
  ODALAR,
  SOZLESME_EN_COK,
  enUcuzOda,
  hanKodu,
  hanOdalari,
  kiraFiyati,
  kiraOdemesi,
  kiraSuresiMs,
  npcHani,
  odaCoz,
  sureCoz,
  type HanKaynagi,
  type KiraSozlesmesi,
  type OdaId,
  type OyuncuHaniKatalogu,
} from "./oda.ts";
import type { Karakter, Kasaba, OlayTaslagi } from "./tipler.ts";

const SAAT_MS = 60 * 60 * 1000;

/** [PARAMETRE] Bayrak: kiralık oda sistemi yayında değilse zincir açılmaz (GDD §18 güvenlik ağları). */
export const BARINMA_ZINCIRI_ACIK = true;
/** [PARAMETRE] Ocak (yaşayan aile hanesi) konaklama sayılır mı (12 yaşında ocağa doğan karakter evsiz olmaz). */
export const OCAK_KONAKLAMA = true;
/** [PARAMETRE, KESİN D-16] Misafirhane hakkı: ilk yerleşim 48 saat (4 ay), diğer şehirler 12 saat (1 ay). */
export const ILK_KORUMA_MS = 48 * SAAT_MS;
export const SEHIR_KORUMA_MS = 12 * SAAT_MS;
/** [PARAMETRE, KESİN D-16] Zincir eşikleri, koruma bitişinden: +24 saat Evsiz, ondan +72 saat can kaybı. */
export const EVSIZ_ESIGI_MS = 24 * SAAT_MS;
export const CAN_KAYBI_ESIGI_MS = EVSIZ_ESIGI_MS + 72 * SAAT_MS;
/** [PARAMETRE, ÖNERİ] Konaklama bitişinden bu kadar önce hatırlatma (dönüş ekranı ve görünüm `yakindaBiter`). */
export const HATIRLATMA_MS = 12 * SAAT_MS;
/** [PARAMETRE, D-21] Evsizken her ay dönümünde: kondisyon ve gönül düşüşü; can kaybı aşamasında can düşüşü. */
export const EVSIZ_KONDISYON = 20;
export const EVSIZ_GONUL = GONUL_EVSIZLIK;
export const CAN_KAYBI_AYLIK = 15;
/** [PARAMETRE, D-22 önerisi] Uyku kademesi eşiği ve dönüşteki mola. */
export const UYKU_ESIGI_MS = 30 * 24 * SAAT_MS;
export const DONUS_MOLASI_MS = 12 * SAAT_MS;
/** [PARAMETRE] Dönüş ekranının gösterildiği en kısa yokluk ("uzun yokluk"). */
export const DONUS_EKRANI_ESIGI_MS = 24 * SAAT_MS;
/**
 * [PARAMETRE, D-23 önerisi] Sosyal tesis (imaret/zaviye) konaklama sayılır: ücretsiz, yalnız yoksula (akçesi en
 * ucuz bir aylık odaya yetmeyene), her konaklama 1 ay, 6 ayda en çok 2 kez. Odanın getirdiklerini vermez.
 */
export const SOSYAL_TESIS_ACIK = true;
export const TESIS_SURE_MS = AY_MS;
export const TESIS_PENCERE_MS = 6 * AY_MS;
export const TESIS_PENCERE_EN_COK = 2;
export const SOSYAL_TESIS: Readonly<Record<YerlesimTuru, "imaret" | "zaviye">> = { sehir: "imaret", kasaba: "imaret", koy: "zaviye" };
/** [PARAMETRE] Dönüş özetinde tutulan barınma günlüğü satırı. */
export const GUNLUK_EN_COK = 10;
/** Otomatik konaklama modları (GDD §18): kapalı (varsayılan), en ucuz oda, yalnız ücretsiz tesis, harcama yapma/uyar. */
export const OTOMATIK_MODLAR = ["kapali", "oda", "tesis", "uyar"] as const;
export type OtomatikMod = (typeof OTOMATIK_MODLAR)[number];

export type KonaklamaTuru = "oda" | "ocak" | "misafirhane" | "tesis" | "hami";
export type ZincirAsamasi = "uyari" | "evsiz" | "canKaybi";
export type BarinmaDurumu = "kapali" | "konakli" | "misafir" | ZincirAsamasi;
const ASAMA_SIRASI: Readonly<Record<ZincirAsamasi, number>> = { uyari: 0, evsiz: 1, canKaybi: 2 };

/** Barınma günlüğü satırı: [an (ms), anahtar, parametreler]. */
export type BarinmaGunlugu = [an: number, k: string, p: Record<string, string | number>];

/** Karakterde saklanan barınma kaydı (eski kayıtta yok → ilk değerlendirmede kurulur). */
export interface BarinmaKaydi {
  /** Kaydın kurulduğu an (eski kayıtta ilk değerlendirme anı). */
  kb: number;
  /** İlk yerleşim: ömürde bir kezlik 48 saatlik hak bu şehre bağlıdır. */
  iy: string;
  /** Bulunulan şehir ve varış anı. */
  vr: [yerlesim: string, an: number];
  /** Misafirhane hakları (karakter × şehir): yerleşim → [başlangıç, bitiş) ms. */
  mh: Record<string, [number, number]>;
  /** Kira sözleşmeleri (etkin ve son bitenler; en geç biten önce). */
  od: KiraSozlesmesi[];
  /** Sosyal tesis konaklamaları: [yerleşim, başlangıç, bitiş) (en yeni önce). */
  ts: [yerlesim: string, b: number, s: number][];
  /** Son bilinen ocak durumu ve ocağın yitirildiği an (0 = yok). */
  oc: 0 | 1;
  ob: number;
  /** Otomatik konaklama modu (OTOMATIK_MODLAR dizini; 0 = kapalı). */
  om: 0 | 1 | 2 | 3;
  /** Etkileri işlenmiş son ay. */
  ia: number;
  /** Son bildirilen zincir aşaması: [zincir başı, aşama sırası] (−1 = zincir yok). */
  za: [z: number, asama: number];
  /** Dönüş molasının bitişi (ms) ve son dönüş ekranının yokluk başlangıcı. */
  dm: number;
  og: number;
  /** Günlük (en yeni önce). */
  gl: BarinmaGunlugu[];
  /** Hamisinin evinde misafirlik (E6, §18 misafir daveti): [yerleşim, başlangıç, bitiş) ms, hami. */
  hm?: [yerlesim: string, b: number, s: number, hami: string];
}

export interface Konaklama {
  tur: KonaklamaTuru;
  /** Bitiş anı (ocakta yok). */
  bitis: number | null;
  oda?: OdaId;
  han?: string;
}

export interface BarinmaAni {
  acik: boolean;
  durum: BarinmaDurumu;
  konaklama: Konaklama | null;
  /** Zincir başı (konaklamasız ilk an); konaklama varsa yok. */
  z: number | null;
  /** Otomatik konaklamanın bu değerlendirmede yaptığı. */
  otomatik?: { tur: "oda"; oda: OdaId; fiyat: number; batak: number } | { tur: "tesis" };
}

export function ayBasi(ay: number): number {
  return DUNYA_BASLANGICI_MS + ay * AY_MS;
}

/** Yerleşim türünde NPC han oda veriyor mu (yükleme anında bir kez hesaplanır; dönüm sıcak yolu). */
const ODA_VAR: Readonly<Record<YerlesimTuru, boolean>> = Object.fromEntries(
  (["koy", "kasaba", "sehir"] as const).map((t) => {
    const k = hanOdalari(npcHani(""), t);
    return [t, k.ok && k.deger.length > 0];
  }),
) as Record<YerlesimTuru, boolean>;

export function zincirAcik(tur: YerlesimTuru): boolean {
  return BARINMA_ZINCIRI_ACIK && ODA_VAR[tur];
}

export function ocakVar(kasaba: Kasaba, kar: Karakter): boolean {
  return OCAK_KONAKLAMA && kar.e !== 0 && kasaba.npc.some((n) => n.e === kar.e);
}

/** Kaydı döndürür (yoksa kurar). Şehir değiştiyse varış anı yenilenir (göç sonraki fazda; hak şehir başınadır). */
export function barinmaKaydi(kar: Karakter, yerlesim: string, an: number, ocak: boolean): BarinmaKaydi {
  const br = (kar.br ??= {
    kb: an,
    iy: yerlesim,
    vr: [yerlesim, an],
    mh: {},
    od: [],
    ts: [],
    oc: ocak ? 1 : 0,
    ob: 0,
    om: 0,
    ia: -1e9,
    za: [0, -1],
    dm: 0,
    og: 0,
    gl: [],
  });
  if (br.vr[0] !== yerlesim) br.vr = [yerlesim, an];
  return br;
}

function gunlukEkle(br: BarinmaKaydi, an: number, k: string, p: Record<string, string | number> = {}): void {
  br.gl.push([an, k, p]);
  br.gl.sort((a, b) => b[0] - a[0]);
  if (br.gl.length > GUNLUK_EN_COK) br.gl.length = GUNLUK_EN_COK;
}

function gunlukteVar(br: BarinmaKaydi, k: string, z: number): boolean {
  return br.gl.some((g) => g[1] === k && g[2].z === z);
}

/** `an` anındaki konaklama (öncelik: oda, ocak, misafirhane, tesis). */
export function kapsama(br: BarinmaKaydi, yerlesim: string, ocak: boolean, an: number): Konaklama | undefined {
  const oda = br.od.find((s) => s.y === yerlesim && s.b <= an && an < s.s);
  if (oda) return { tur: "oda", bitis: oda.s, oda: oda.o, han: oda.h };
  if (ocak && OCAK_KONAKLAMA) return { tur: "ocak", bitis: null };
  const m = br.mh[yerlesim];
  if (m && m[0] <= an && an < m[1]) return { tur: "misafirhane", bitis: m[1] };
  const t = br.ts.find((x) => x[0] === yerlesim && x[1] <= an && an < x[2]);
  if (t) return { tur: "tesis", bitis: t[2] };
  const h = br.hm;
  if (h && h[0] === yerlesim && h[1] <= an && an < h[2]) return { tur: "hami", bitis: h[2] };
  return undefined;
}

/** Konaklamasız `an` için zincir başı: bu şehirde son konaklamanın bittiği, ocağın yitirildiği ya da varış anı. */
export function zincirBasi(br: BarinmaKaydi, yerlesim: string, an: number): number {
  let z = Math.max(br.kb, br.vr[0] === yerlesim ? br.vr[1] : br.kb);
  if (br.ob > 0 && br.ob <= an) z = Math.max(z, br.ob);
  for (const s of br.od) if (s.y === yerlesim && s.s <= an) z = Math.max(z, s.s);
  for (const t of br.ts) if (t[0] === yerlesim && t[2] <= an) z = Math.max(z, t[2]);
  const m = br.mh[yerlesim];
  if (m && m[1] <= an) z = Math.max(z, m[1]);
  if (br.hm && br.hm[0] === yerlesim && br.hm[2] <= an) z = Math.max(z, br.hm[2]);
  return Math.min(z, an);
}

export function asama(z: number, an: number): ZincirAsamasi {
  const d = an - z;
  return d < EVSIZ_ESIGI_MS ? "uyari" : d < CAN_KAYBI_ESIGI_MS ? "evsiz" : "canKaybi";
}

/** Sonraki aşamanın adı ve anı (can kaybında yok). */
export function sonrakiAsama(z: number, an: number): { asama: ZincirAsamasi; an: number } | null {
  const a = asama(z, an);
  if (a === "uyari") return { asama: "evsiz", an: z + EVSIZ_ESIGI_MS };
  if (a === "evsiz") return { asama: "canKaybi", an: z + CAN_KAYBI_ESIGI_MS };
  return null;
}

/** Son görülme: son Dönüş Kartı anı; hiç görülmediyse kaydın kuruluşu. */
export function sonGorulme(kar: Karakter, br: BarinmaKaydi): number {
  return kar.kz > 0 ? kar.kz : br.kb;
}

export function uyuyor(kar: Karakter, br: BarinmaKaydi, an: number): boolean {
  return an - sonGorulme(kar, br) >= UYKU_ESIGI_MS;
}

/** Sosyal tesise girebilir mi (D-23 önerisi): açık, yoksul ve pencere tavanı dolmamış. */
export function tesisUygunlugu(br: BarinmaKaydi, kar: Karakter, tur: YerlesimTuru, an: number): Sonuc<{ kalanHak: number }> {
  if (!SOSYAL_TESIS_ACIK) return hata("tesis_kapali");
  if (kar.pa >= kiraFiyati(ODALAR[enUcuzOda(tur)].aylik, 1)) return hata("tesis_sart");
  const kullanilan = br.ts.filter((t) => an - t[1] < TESIS_PENCERE_MS).length;
  if (kullanilan >= TESIS_PENCERE_EN_COK) return hata("tesis_dolu");
  return basarili({ kalanHak: TESIS_PENCERE_EN_COK - kullanilan });
}

function sozlesmeKirp(br: BarinmaKaydi): void {
  br.od.sort((a, b) => b.s - a.s);
  if (br.od.length > SOZLESME_EN_COK) br.od.length = SOZLESME_EN_COK;
}

function tesisEkle(br: BarinmaKaydi, yerlesim: string, bas: number): number {
  const bitis = bas + TESIS_SURE_MS;
  br.ts.unshift([yerlesim, bas, bitis]);
  if (br.ts.length > TESIS_PENCERE_EN_COK + 2) br.ts.length = TESIS_PENCERE_EN_COK + 2;
  return bitis;
}

/** Zincirdeyken konaklama bulunduysa zincir kapanır (günlüğe yazılır). */
function zincirKapat(br: BarinmaKaydi, an: number, tur: KonaklamaTuru): void {
  if (br.za[1] < 0) return;
  gunlukEkle(br, an, "zincir.durdu", { konaklama: tur });
  br.za = [0, -1];
}

/** Biten konaklamaları günlüğe bir kez yazar (sona eren rezervasyonlar; an = gerçek bitiş). */
function bitenleriYaz(br: BarinmaKaydi, yerlesim: string, an: number): void {
  for (const s of br.od) {
    if (s.y !== yerlesim || s.s > an || br.gl.some((g) => g[1] === "oda.bitti" && g[2].bitis === s.s)) continue;
    if (br.gl.length >= GUNLUK_EN_COK && s.s < br.gl[br.gl.length - 1]![0]) continue;
    gunlukEkle(br, s.s, "oda.bitti", { oda: s.o, bitis: s.s });
  }
  const m = br.mh[yerlesim];
  if (m && m[1] <= an && !br.gl.some((g) => g[1] === "misafirhane.bitti" && g[2].bitis === m[1])) {
    if (br.gl.length < GUNLUK_EN_COK || m[1] >= br.gl[br.gl.length - 1]![0]) gunlukEkle(br, m[1], "misafirhane.bitti", { bitis: m[1] });
  }
}

/**
 * Barınmayı `an` anına getirir: ocak geçişi, biten konaklamalar, gerekiyorsa misafirhane hakkının açılması ve
 * otomatik konaklama talimatı. Konaklama ve zincir durumunu döndürür. Tekrar çağrılması güvenlidir.
 */
export function barinmaIlerlet(
  kasaba: Pick<Kasaba, "y" | "tur">,
  kar: Karakter,
  an: number,
  ocak: boolean,
  acik = zincirAcik(kasaba.tur),
): BarinmaAni {
  const y = kasaba.y;
  const br = barinmaKaydi(kar, y, an, ocak);
  const oc = ocak ? 1 : 0;
  if (oc !== br.oc) {
    if (!ocak) br.ob = an;
    br.oc = oc;
  }
  if (!acik) return { acik: false, durum: "kapali", konaklama: null, z: null };
  bitenleriYaz(br, y, an);
  let k = kapsama(br, y, ocak, an);
  if (!k && !br.mh[y]) {
    const bas = zincirBasi(br, y, an);
    const bitis = bas + (y === br.iy ? ILK_KORUMA_MS : SEHIR_KORUMA_MS);
    br.mh[y] = [bas, bitis];
    gunlukEkle(br, bas, "misafirhane.basladi", { bitis, ilk: y === br.iy ? 1 : 0 });
    k = kapsama(br, y, ocak, an);
  }
  if (k) {
    if (k.tur !== "misafirhane") zincirKapat(br, an, k.tur);
    return { acik: true, durum: k.tur === "misafirhane" ? "misafir" : "konakli", konaklama: k, z: null };
  }
  const z = zincirBasi(br, y, an);
  const sonuc: BarinmaAni = { acik: true, durum: asama(z, an), konaklama: null, z };
  const mod = OTOMATIK_MODLAR[br.om];
  if (mod === "kapali" || uyuyor(kar, br, an)) return sonuc;
  // Talimat konaklamanın bittiği andan başlar (kesintisiz); bir aydan eski bir boşlukta şimdiden başlar.
  const bas = an - z < AY_MS ? z : an;
  if (mod === "oda") {
    const oda = enUcuzOda(kasaba.tur);
    const fiyat = kiraFiyati(ODALAR[oda].aylik, 1);
    const han = npcHani(y);
    const odeme = kiraOdemesi(han, kar.pa, fiyat);
    if (!odeme.ok) {
      if (!gunlukteVar(br, "otomatik.akceYok", z)) gunlukEkle(br, an, "otomatik.akceYok", { z, fiyat, para: kar.pa });
      return sonuc;
    }
    kar.pa = odeme.deger.para;
    br.od.push({ h: hanKodu(han), o: oda, b: bas, s: bas + kiraSuresiMs(1), t: fiyat, y });
    sozlesmeKirp(br);
    gunlukEkle(br, bas, "otomatik.oda", { oda, fiyat, bitis: bas + kiraSuresiMs(1) });
    zincirKapat(br, an, "oda");
    return { acik: true, durum: "konakli", konaklama: kapsama(br, y, ocak, an) ?? null, z: null, otomatik: { tur: "oda", oda, fiyat, batak: odeme.deger.batak } };
  }
  if (mod === "tesis") {
    if (!tesisUygunlugu(br, kar, kasaba.tur, an).ok) {
      if (!gunlukteVar(br, "otomatik.tesisYok", z)) gunlukEkle(br, an, "otomatik.tesisYok", { z });
      return sonuc;
    }
    const bitis = tesisEkle(br, y, bas);
    gunlukEkle(br, bas, "otomatik.tesis", { tesis: SOSYAL_TESIS[kasaba.tur], bitis });
    zincirKapat(br, an, "tesis");
    return { acik: true, durum: "konakli", konaklama: kapsama(br, y, ocak, an) ?? null, z: null, otomatik: { tur: "tesis" } };
  }
  if (!gunlukteVar(br, "otomatik.uyari", z)) gunlukEkle(br, an, "otomatik.uyari", { z });
  return sonuc;
}

/**
 * Ay dönümü (motor.yetistir, ayDonumu'ndan sonra): her sakin için barınma dönüm anına getirilir; zincir aşaması
 * değiştiyse özel olay düşer; Evsiz aşamasında kondisyon ve gönül, can kaybında can düşer (taban %10); odada
 * kondisyon fazladan toparlanır. Uykuda ve dönüş molasında etki işlemez. Aynı ay iki kez işlenmez.
 */
export function barinmaDonumu(kasaba: Kasaba, ay: number, acik = zincirAcik(kasaba.tur)): OlayTaslagi[] {
  if (!acik) return [];
  const an = ayBasi(ay);
  const haneler = new Set(kasaba.npc.map((n) => n.e));
  const olaylar: OlayTaslagi[] = [];
  for (const s of kasaba.sakin) {
    const kar = kasaba.kar.get(s.o);
    if (!kar || olduMu(kar)) continue;
    const ocak = OCAK_KONAKLAMA && kar.e !== 0 && haneler.has(kar.e);
    const r = barinmaIlerlet(kasaba, kar, an, ocak);
    const br = kar.br!;
    if (br.ia >= ay) continue;
    br.ia = ay;
    if (r.otomatik) {
      const p: Record<string, string | number> = r.otomatik.tur === "oda" ? { oda: r.otomatik.oda, fiyat: r.otomatik.fiyat } : { tesis: SOSYAL_TESIS[kasaba.tur] };
      olaylar.push({ t: "barinma", w: kar.o, h: kar.o, g: kar.o, n: 6, k: `olay.barinma.otomatik.${r.otomatik.tur}`, p });
    }
    const etkili = !uyuyor(kar, br, an) && an >= br.dm;
    if (r.z !== null && r.durum !== "kapali" && r.durum !== "konakli" && r.durum !== "misafir") {
      const sira = ASAMA_SIRASI[r.durum];
      if (br.za[0] !== r.z || br.za[1] < sira) {
        br.za = [r.z, sira];
        gunlukEkle(br, an, `zincir.${r.durum}`, { z: r.z });
        olaylar.push({ t: "barinma", w: kar.o, h: kar.o, g: kar.o, n: 6 + sira, k: `olay.barinma.${r.durum}`, p: { sonraki: sonrakiAsama(r.z, an)?.an ?? 0 } });
      }
      if (etkili && sira >= 1) {
        halDegistir(kar, ay, { kondisyon: -EVSIZ_KONDISYON, gonul: -EVSIZ_GONUL }, "hal.neden.evsizlik");
        if (sira >= 2) halDegistir(kar, ay, { can: -CAN_KAYBI_AYLIK }, "hal.neden.barinmaCan");
      }
    } else if (r.konaklama?.tur === "oda" && r.konaklama.oda && ODALAR[r.konaklama.oda].kondisyon > 0) {
      halDegistir(kar, ay, { kondisyon: ODALAR[r.konaklama.oda].kondisyon }, "hal.neden.oda");
    }
  }
  return olaylar;
}

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** POST /v1/barinma/kira {oda, sure: 1|3|12}: peşin kira; aynı odada uzatır (bitişten devam), başka oda `oda_var`. */
export function kiraTut(
  kasaba: Kasaba,
  kar: Karakter,
  govde: unknown,
  simdi: number,
  /** Faz 12: yerleşimin hanı oyuncu işletmesiyse katalog, fiyat ve boş oda (kapasite) buradan; ödeme kasaya. */
  oyuncuHan?: OyuncuHaniKatalogu & { isletme: string; bos: number },
): Sonuc<Record<string, unknown>> {
  if (!zincirAcik(kasaba.tur)) return hata("barinma_kapali");
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  const oda = odaCoz(govde.oda);
  const sure = sureCoz(govde.sure);
  if (!oda) return hata("oda_gecersiz");
  if (!sure) return hata("sure_gecersiz");
  const han: HanKaynagi = oyuncuHan ? { tur: "oyuncu", isletme: oyuncuHan.isletme } : npcHani(kasaba.y);
  const katalog = hanOdalari(han, kasaba.tur, oyuncuHan);
  if (!katalog.ok) return katalog;
  const teklif = katalog.deger.find((x) => x.oda === oda);
  if (!teklif) return hata("oda_gecersiz");
  const ocak = ocakVar(kasaba, kar);
  barinmaIlerlet(kasaba, kar, simdi, ocak);
  const br = kar.br!;
  const etkin = br.od.find((s) => s.y === kasaba.y && s.b <= simdi && simdi < s.s);
  if (etkin && (etkin.o !== oda || etkin.h !== hanKodu(han))) return hata("oda_var");
  if (oyuncuHan && !etkin && oyuncuHan.bos <= 0) return hata("han_dolu");
  const bas = etkin ? etkin.s : simdi;
  const bitis = bas + kiraSuresiMs(sure);
  if (bitis - simdi > KIRA_EN_UZUN_AY * AY_MS) return hata("kira_siniri");
  const fiyat = teklif.fiyatlar[sure];
  const odeme = kiraOdemesi(han, kar.pa, fiyat);
  if (!odeme.ok) return odeme;
  kar.pa = odeme.deger.para;
  if (etkin) {
    etkin.s = bitis;
    etkin.t += fiyat;
  } else br.od.push({ h: hanKodu(han), o: oda, b: simdi, s: bitis, t: fiyat, y: kasaba.y });
  sozlesmeKirp(br);
  gunlukEkle(br, simdi, etkin ? "oda.uzatildi" : "oda.kiralandi", { oda, sure, fiyat, bitis });
  zincirKapat(br, simdi, "oda");
  return basarili({
    kira: {
      oda,
      sure,
      fiyat,
      batak: odeme.deger.batak,
      ...(oyuncuHan ? { kasaya: odeme.deger.kasaya, han: hanKodu(han) } : {}),
      baslangic: etkin ? etkin.b : simdi,
      bitis,
      uzatildi: !!etkin,
    },
    barinma: barinmaGorunumu(kasaba, kar, simdi),
  });
}

/** POST /v1/barinma/tesis {}: imaret/zaviyede bir aylık ücretsiz konaklama (D-23 önerisi). */
export function tesisKonakla(kasaba: Kasaba, kar: Karakter, simdi: number): Sonuc<Record<string, unknown>> {
  if (!zincirAcik(kasaba.tur)) return hata("barinma_kapali");
  const ocak = ocakVar(kasaba, kar);
  barinmaIlerlet(kasaba, kar, simdi, ocak);
  const br = kar.br!;
  if (kapsama(br, kasaba.y, ocak, simdi)) return hata("konaklama_var");
  const u = tesisUygunlugu(br, kar, kasaba.tur, simdi);
  if (!u.ok) return u;
  const bitis = tesisEkle(br, kasaba.y, simdi);
  gunlukEkle(br, simdi, "tesis.konakladi", { tesis: SOSYAL_TESIS[kasaba.tur], bitis });
  zincirKapat(br, simdi, "tesis");
  return basarili({ tesis: { tur: SOSYAL_TESIS[kasaba.tur], baslangic: simdi, bitis }, barinma: barinmaGorunumu(kasaba, kar, simdi) });
}

/** POST /v1/barinma/otomatik {mod}: opt-in talimat (varsayılan kapalı). */
export function otomatikAyarla(kasaba: Kasaba, kar: Karakter, govde: unknown, simdi: number): Sonuc<Record<string, unknown>> {
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  const i = OTOMATIK_MODLAR.indexOf(govde.mod as OtomatikMod);
  if (i < 0) return hata("mod_gecersiz");
  const br = barinmaKaydi(kar, kasaba.y, simdi, ocakVar(kasaba, kar));
  if (br.om !== i) gunlukEkle(br, simdi, "otomatik.ayar", { mod: OTOMATIK_MODLAR[i]! });
  br.om = i as BarinmaKaydi["om"];
  return basarili({ otomatik: OTOMATIK_MODLAR[i], barinma: barinmaGorunumu(kasaba, kar, simdi) });
}

/** GET /v1/barinma: durum, konaklama, zincir (eşikler ve etkiler sayılarıyla), misafirhane hakkı, odalar, tesis. */
export function barinmaGorunumu(kasaba: Kasaba, kar: Karakter, simdi: number) {
  const ocak = ocakVar(kasaba, kar);
  const r = barinmaIlerlet(kasaba, kar, simdi, ocak);
  const br = kar.br!;
  const y = kasaba.y;
  const katalog = hanOdalari(npcHani(y), kasaba.tur);
  const k = r.konaklama;
  const zincirde = r.z !== null && (r.durum === "uyari" || r.durum === "evsiz" || r.durum === "canKaybi");
  const tesis = tesisUygunlugu(br, kar, kasaba.tur, simdi);
  const m = br.mh[y];
  return {
    acik: r.acik,
    durum: r.durum,
    unvan: r.durum === "evsiz" || r.durum === "canKaybi" ? ("evsiz" as const) : null,
    konaklama: k
      ? {
          tur: k.tur,
          bitis: k.bitis,
          kalanMs: k.bitis === null ? null : k.bitis - simdi,
          yakindaBiter: k.bitis !== null && k.bitis - simdi <= HATIRLATMA_MS,
          ...(k.oda ? { oda: k.oda, han: k.han, nitelik: { ...ODALAR[k.oda] } } : {}),
        }
      : null,
    zincir:
      zincirde && r.z !== null
        ? {
            baslangic: r.z,
            asama: r.durum,
            sonraki: sonrakiAsama(r.z, simdi),
            etkiler: {
              kondisyonAylik: r.durum === "uyari" ? 0 : -EVSIZ_KONDISYON,
              gonulAylik: r.durum === "uyari" ? 0 : -EVSIZ_GONUL,
              canAylik: r.durum === "canKaybi" ? -CAN_KAYBI_AYLIK : 0,
              canTaban: HAL_TABAN_CAN,
              olum: false,
            },
            esikler: { evsizMs: EVSIZ_ESIGI_MS, canKaybiMs: CAN_KAYBI_ESIGI_MS },
          }
        : null,
    misafirhane: {
      ilkYerlesim: br.iy,
      hakMs: y === br.iy ? ILK_KORUMA_MS : SEHIR_KORUMA_MS,
      buSehir: m ? { baslangic: m[0], bitis: m[1], kullanildi: true } : { kullanildi: false },
    },
    odalar: katalog.ok ? katalog.deger.map((o) => ({ ...o, yeterli: kar.pa >= o.fiyatlar[1] })) : [],
    tesis: {
      tur: SOSYAL_TESIS[kasaba.tur],
      acik: SOSYAL_TESIS_ACIK,
      uygun: tesis.ok,
      ...(tesis.ok ? { kalanHak: tesis.deger.kalanHak } : { neden: tesis.hata }),
      sureMs: TESIS_SURE_MS,
    },
    otomatik: { mod: OTOMATIK_MODLAR[br.om], modlar: OTOMATIK_MODLAR },
    uyku: uyuyor(kar, br, simdi),
    mola: br.dm > simdi ? br.dm : null,
    sozlesmeler: br.od.filter((s) => s.y === y).map((s) => ({ oda: s.o, han: s.h, baslangic: s.b, bitis: s.s, odenen: s.t, etkin: s.b <= simdi && simdi < s.s })),
    gunluk: br.gl.map(([an, k2, p]) => ({ an, k: `barinma.${k2}`, p })),
    para: kar.pa,
  };
}
export type BarinmaGorunumu = ReturnType<typeof barinmaGorunumu>;
