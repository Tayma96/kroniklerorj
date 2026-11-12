// Faz 3a oyuncular arası protokol (ayrı dosya: han/hanedan istemcisiyle birleşme kolay olsun diye).
// online-server/src/yerlesim/{toplum,teklif,iliski,engel,duzen,soylenti,teveccuh,npc-teklif}.ts ve motor.ts
// (oyuncu, gelen, dostluk, teklif, teklifCevap, husumet, engelle, duzen, duzenOku, yalanla, vitrin) yanıtlarının
// birebir biçimi. İstemci sonuç hesaplamaz: yalnız niyet gönderir, sunucunun gördüğü sınırları ön izlemede gösterir.
// Bu dosya protokol.ts'den yalnız TİP alır (çalışma anında döngü yok; protokol.ts buradan hata kodlarını alır).
import type { Cinsiyet, Dil, Kademe, KisiAdi, MalId, MeslekId } from "./protokol";

/** Faz 3a hata kodları (tipler.ts HATA_DURUMU) ve /v1/sikayet kodları. */
export const TOPLUM_HATALARI = [
  "teklif_gecersiz", "teklif_yok", "teklif_kapandi", "teklif_siniri", "taraf_degil", "kendine", "engelli", "tavan_doldu",
  "hediye_dongu", "aralik_dolu", "istek_yok", "soylenti_yok", "duzen_gecersiz", "oncelik_bekle",
  "kendini_sikayet", "sikayet_gecersiz", "sikayet_siniri", "kuyruk_dolu", "susturuldu",
] as const;
export type ToplumHataKodu = (typeof TOPLUM_HATALARI)[number];

export const OYUNCU_TEKLIF_TURLERI = ["cirak", "ortak", "borc", "hediye", "gorucu", "is"] as const;
export const IKI_TARAF_ISLERI = ["arabuluculuk", "muhafiz", "mektup"] as const;
export type IkiTarafIsi = (typeof IKI_TARAF_ISLERI)[number];
export const NPC_TEKLIF_TURLERI = ["npcIs", "npcBorc", "npcDunur"] as const;
export type OyuncuTeklifTuru = (typeof OYUNCU_TEKLIF_TURLERI)[number];
export type NpcTeklifTuru = (typeof NPC_TEKLIF_TURLERI)[number];
export type TeklifTuru = OyuncuTeklifTuru | NpcTeklifTuru;
export const TEKLIF_TURLERI: readonly TeklifTuru[] = [...OYUNCU_TEKLIF_TURLERI, ...NPC_TEKLIF_TURLERI];
export type TeklifDurumu = "acik" | "surer" | "bitti" | "ret" | "dustu" | "geri" | "iptal";
export type VarsayilanSonuc = "kabul" | "ret" | "dustu";
export type TeklifCevabi = "kabul" | "ret" | "geri" | "bitir" | "ode" | "teslim";
export type BagDurumu = "dost" | "istekGonderildi" | "istekGeldi" | null;
export type GelenCevap = "bekle" | "kabul" | "ret";
export const GELEN_CEVAPLARI: readonly GelenCevap[] = ["bekle", "kabul", "ret"];

/** [PARAMETRE] sunucu teklif.ts / iliski.ts / duzen.ts sınırları (form ön izlemesi için; karar sunucudadır). */
export const TOPLUM_SINIR = {
  teklifYasi: 13, gorucuYasi: 16, teklifSureAy: 2, npcTeklifSureAy: 3,
  ortakPay: 25, ortakSure: 12, borcEnCok: 50, borcFaiz: 20, borcVade: 12, borcToplam: 60,
  hediyeEnCok: 40, hediyeAylik: 60, hediyeTakat: 1, yalanlamaTakat: 1, vitrinEnCok: 6, duzenBorcEnCok: 20,
  npcIsTakat: 2, isEnCok: 20,
} as const;

/** teklifGorunumu.sartlar (uzun adlar). */
export interface TeklifSartlari {
  meslek?: MeslekId;
  usta?: string;
  tutar?: number;
  faiz?: number;
  vade?: number;
  yon?: "ver" | "iste";
  pay?: number;
  sure?: number;
  mal?: MalId;
  adet?: number;
  yapan?: KisiAdi;
  aday?: KisiAdi;
  is?: IkiTarafIsi;
  hedef?: KisiAdi;
  mesaj?: string;
}
export interface TeklifGorunumu {
  id: string;
  tur: TeklifTuru;
  kaynak: "npc" | "oyuncu";
  yon: "gelen" | "giden";
  gonderen: KisiAdi;
  alici: KisiAdi;
  sartlar: TeklifSartlari;
  emanet: number;
  acilisAyi: number;
  sonAy: number;
  varsayilan: VarsayilanSonuc;
  durum: TeklifDurumu;
  kabulAyi?: number;
  kapanisAyi?: number;
  neden?: string;
  borclu?: string;
  alacakli?: string;
  kalan?: number | null;
  vadeAyi?: number | null;
  bitisAyi?: number;
}

export interface OyuncuMeslegi { ana: MeslekId | null; anaKademe: Kademe | null; yan: MeslekId | null; yanKademe: Kademe | null }
/** Mesleki geçmiş: her meslekte kademe ve öğrenilmiş dallar. */
export interface OyuncuMeslekSatiri { meslek: MeslekId; kademe: Kademe; dallar: string[] }
export interface TeveccuhEtkisi { k: string; p: { deger: number } }
export interface TeveccuhGorunumu { kademe: number; puan: number; sonrakiEsik: number | null; verenSayisi: number; etkiler: TeveccuhEtkisi[] }
export interface VitrinArmagani { id: string; kimden: KisiAdi; ay: number; akce?: number; mal?: MalId; adet?: number; yapan: KisiAdi | null }
/** Oyuncu profilindeki eylem: dostluk (iste|kabul|bekliyor|bitir), teklif.<tür>, husumet (ilan|kaldir), engelle (engelle|kaldir), sikayet. */
export interface OyuncuEylemi { tur: string; islem?: string; acik: boolean; engel?: string }
export interface ProfilHusumeti { id: string; ad: string; yon: "ilanEtti" | "hedef"; ay: number }

/** GET /v1/oyuncu/:id (kendin için ben: true, eylemler boş). */
export interface OyuncuProfili {
  id: string;
  ad: string;
  oyuncu: true;
  ben: boolean;
  cinsiyet: Cinsiyet;
  yas: number;
  meslek: OyuncuMeslegi;
  meslekler: OyuncuMeslekSatiri[];
  hane: { id: number; reis: KisiAdi | null };
  nam: Record<string, number>;
  mekan: string | null;
  bag: BagDurumu;
  husumet: { benIlanEttim: boolean; oIlanEtti: boolean };
  husumetler: ProfilHusumeti[];
  dostSayisi: number;
  ortakTanidiklar: KisiAdi[];
  engelledim: boolean;
  teveccuh: TeveccuhGorunumu;
  vitrin: VitrinArmagani[];
  eylemler: OyuncuEylemi[];
  /** Beceri ağacı v2 §5: kalıcı unvanlar (sunucu henüz göndermiyor). */
  unvanlar?: string[];
}

export interface SoylentiGorunumu {
  id: string;
  tur: string;
  hedef: { id: string; ad: string | null } | null;
  ay: number;
  bilen: number;
  guven: number;
  etki: number;
  yalanlandi: boolean;
  yayiliyor: boolean;
}
export type AyliKisi = KisiAdi & { ay: number };
/** GET /v1/gelen */
export interface GelenYaniti {
  ay: number;
  gelen: TeklifGorunumu[];
  giden: TeklifGorunumu[];
  suren: TeklifGorunumu[];
  kapanan: TeklifGorunumu[];
  dostluk: { gelen: AyliKisi[]; giden: AyliKisi[]; dostlar: AyliKisi[] };
  husumetler: (AyliKisi & { yon: "ilanEttim" | "ilanEdildi" })[];
  soylentiler: SoylentiGorunumu[];
  engellenenler: KisiAdi[];
}
export interface DuzenGorunumu {
  gelen: Record<TeklifTuru, GelenCevap>;
  borcCevap: GelenCevap;
  borcEnCok: number;
  sinir: { borcEnCok: number; kendiligindenKabulYok: TeklifTuru[]; cevaplar: GelenCevap[] };
}

// ---------------------------------------------------------------- istekler
export type DostlukIslemi = "iste" | "kabul" | "ret" | "bitir";
export interface DostlukIstegi { hedef: string; islem: DostlukIslemi; istekNo: string }
export interface HusumetIstegi { hedef: string; islem: "ilan" | "kaldir"; istekNo: string }
export interface EngelIstegi { hedef: string; islem: "engelle" | "kaldir"; istekNo: string }
/** POST /v1/teklif: türe göre şartlar (sunucu sartlarCoz). */
export interface TeklifSartGirdisi {
  meslek?: MeslekId;
  ustaBen?: boolean;
  pay?: number;
  sure?: number;
  yon?: "ver" | "iste";
  tutar?: number;
  vade?: number;
  faiz?: number;
  mal?: MalId;
  adet?: number;
  is?: IkiTarafIsi;
  mektupHedef?: string;
  mektupMetni?: string;
}
export interface TeklifIstegi extends TeklifSartGirdisi { tur: OyuncuTeklifTuru; hedef: string; istekNo: string; dil?: Dil }
export interface TeklifCevapIstegi { teklif: string; cevap: TeklifCevabi; tutar?: number; istekNo: string; dil?: Dil }
export interface DuzenIstegi { gelen?: Partial<Record<TeklifTuru, GelenCevap>>; borcCevap?: GelenCevap; borcEnCok?: number; istekNo: string }
export const SIKAYET_NEDENLERI = ["kufur", "taciz", "uygunsuzAd", "hile", "dolandiricilik", "spam", "diger"] as const;
export type SikayetNedeni = (typeof SIKAYET_NEDENLERI)[number];
export interface SikayetIstegi { hedef: string; neden: SikayetNedeni; aciklama?: string; istekNo: string }
export interface SikayetYaniti { id: number; durum: string; kalan?: number; birlesti?: boolean }

// ---------------------------------------------------------------- biçim denetimleri
type Nesne = Record<string, unknown>;
const nesne = (v: unknown): v is Nesne => typeof v === "object" && v !== null && !Array.isArray(v);
const metin = (v: unknown): v is string => typeof v === "string";
const sayi = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const dizi = (v: unknown): v is unknown[] => Array.isArray(v);
const mantik = (v: unknown): v is boolean => typeof v === "boolean";
const kisiMi = (v: unknown): v is KisiAdi & Nesne => nesne(v) && metin(v.id) && metin(v.ad);
const bagMi = (v: unknown): v is BagDurumu => v === null || v === "dost" || v === "istekGonderildi" || v === "istekGeldi";

export function teklifMi(v: unknown): v is TeklifGorunumu {
  return nesne(v) && metin(v.id) && metin(v.tur) && (v.yon === "gelen" || v.yon === "giden") && kisiMi(v.gonderen) && kisiMi(v.alici)
    && nesne(v.sartlar) && sayi(v.emanet) && sayi(v.acilisAyi) && sayi(v.sonAy) && metin(v.varsayilan) && metin(v.durum);
}
const teveccuhMi = (v: unknown): v is TeveccuhGorunumu =>
  nesne(v) && sayi(v.kademe) && sayi(v.puan) && (v.sonrakiEsik === null || sayi(v.sonrakiEsik)) && sayi(v.verenSayisi)
  && dizi(v.etkiler) && v.etkiler.every((e) => nesne(e) && metin(e.k) && nesne(e.p));
const vitrinMi = (v: unknown): v is VitrinArmagani[] =>
  dizi(v) && v.every((a) => nesne(a) && metin(a.id) && kisiMi(a.kimden) && sayi(a.ay) && (a.yapan === null || kisiMi(a.yapan)));

export function oyuncuProfiliMi(v: unknown): v is OyuncuProfili {
  if (!kisiMi(v) || v.oyuncu !== true) return false;
  const p: Nesne = v;
  const m = p.meslek, h = p.hane, hu = p.husumet;
  return mantik(p.ben) && (p.cinsiyet === "erkek" || p.cinsiyet === "kadın") && sayi(p.yas)
    && nesne(m) && dizi(p.meslekler) && p.meslekler.every((x) => nesne(x) && metin(x.meslek) && sayi(x.kademe) && dizi(x.dallar))
    && nesne(h) && nesne(p.nam) && bagMi(p.bag) && nesne(hu) && mantik(hu.benIlanEttim) && mantik(hu.oIlanEtti)
    && dizi(p.husumetler) && sayi(p.dostSayisi) && dizi(p.ortakTanidiklar) && p.ortakTanidiklar.every(kisiMi) && mantik(p.engelledim)
    && teveccuhMi(p.teveccuh) && vitrinMi(p.vitrin) && dizi(p.eylemler) && p.eylemler.every((e) => nesne(e) && metin(e.tur) && mantik(e.acik))
    && (p.unvanlar === undefined || (dizi(p.unvanlar) && p.unvanlar.every(metin)));
}
const ayliListe = (v: unknown) => dizi(v) && v.every((x) => kisiMi(x) && sayi(x.ay));
const teklifListesi = (v: unknown) => dizi(v) && v.every(teklifMi);
export function gelenMi(v: unknown): v is GelenYaniti {
  if (!nesne(v) || !sayi(v.ay)) return false;
  const d = v.dostluk;
  return teklifListesi(v.gelen) && teklifListesi(v.giden) && teklifListesi(v.suren) && teklifListesi(v.kapanan)
    && nesne(d) && ayliListe(d.gelen) && ayliListe(d.giden) && ayliListe(d.dostlar) && ayliListe(v.husumetler)
    && dizi(v.soylentiler) && v.soylentiler.every((s) => nesne(s) && metin(s.id) && metin(s.tur) && sayi(s.bilen) && mantik(s.yalanlandi))
    && dizi(v.engellenenler) && v.engellenenler.every(kisiMi);
}
export const dostlukYanitiMi = (v: unknown): v is { hedef: string; bag: BagDurumu } => nesne(v) && metin(v.hedef) && bagMi(v.bag);
export const husumetYanitiMi = (v: unknown): v is { hedef: string; husumet: boolean } => nesne(v) && metin(v.hedef) && mantik(v.husumet);
export const teklifYanitiMi = (v: unknown): v is { teklif: TeklifGorunumu } => nesne(v) && teklifMi(v.teklif);
export const engelYanitiMi = (v: unknown): v is { engellenenler: KisiAdi[] } => nesne(v) && dizi(v.engellenenler) && v.engellenenler.every(kisiMi);
export const duzenYanitiMi = (v: unknown): v is { duzen: DuzenGorunumu } =>
  nesne(v) && nesne(v.duzen) && nesne(v.duzen.gelen) && metin(v.duzen.borcCevap) && sayi(v.duzen.borcEnCok) && nesne(v.duzen.sinir);
export const yalanlaYanitiMi = (v: unknown): v is { soylentiler: SoylentiGorunumu[] } => nesne(v) && dizi(v.soylentiler);
export const vitrinYanitiMi = (v: unknown): v is { vitrin: VitrinArmagani[] } => nesne(v) && vitrinMi(v.vitrin);
export const sikayetYanitiMi = (v: unknown): v is SikayetYaniti => nesne(v) && sayi(v.id) && metin(v.durum);

/** Oyuncu kimliği "o<sayı>" mı (NPC "n<sayı>"). */
export const oyuncuKimligiMi = (id: string | null | undefined): id is string => !!id && /^o[1-9][0-9]{0,8}$/.test(id);
/** Kişi satırının gideceği sayfa: oyuncu profili ya da NPC kişi ekranı. */
export const kisiYolu = (id: string) => (oyuncuKimligiMi(id) ? `/online/oyuncu/${id}` : `/online/kisi/${id}`);


// E5–E7 topluluk panosu: meşrep, ortak dert, şenlik, hami, müdavim ve zaviye.
export interface ToplulukDert {
  id: string; tur: string; durum: string; acilis: number; bitis: number; esik: number; puan: number; halk: number;
  defter: { id: string; ad: string; katkilar: string[] }[];
  benim?: { sayi: number; kalan: number; puan: number };
}
export interface ToplulukSenlik {
  id: string; tur: string; durum: "ilan" | "acik"; acilis: number; bitis: number;
  levha: { id: string; ad: string; katkilar: string[] }[]; benim: { sayi: number; kalan: number };
}
export interface ToplulukDurumu {
  mesrep: { secildi: boolean; secimAcik: boolean; kapali?: string; eksenler: { eksen: string; secili: string; uclar: { uc: string; etkiler: { k: string; tur: string; p: Record<string, number> }[] }[] }[] };
  hami: { suren: unknown[]; gelen: unknown[]; giden: unknown[]; biten: unknown[] };
  ortakDert: { acik: ToplulukDert[]; son: ToplulukDert[]; uygunKatkilarim: string[]; kurallar: Record<string, unknown> };
  senlik: { simdiki: ToplulukSenlik | null; sonKapanan: unknown; kurallar: Record<string, unknown> };
  mudavim: { rozet: string | null; ziyaret: number; sonraki: { rozet: string; gereken: number } | null; indirim?: { deger: number; tavan: number } };
  zaviye: { benim: unknown; davetler: unknown[]; kasabada: unknown[]; ahiSarti: Record<string, unknown> };
  gostergeler: { arz: number; moral: number; asayis: number; denge: number; taban: number; tavan: number };
}
export interface MesrepIstegi { el: "comert" | "hesapli" | "orta"; cesaret: "temkinli" | "gozupek" | "orta"; gurur: "mutevazi" | "gururlu" | "orta"; istekNo: string }
export interface OrtakDertIstegi { dert: string; katki: string; mal?: MalId; adet?: number; istekNo: string }
export interface SenlikIstegi { katki: "yemek" | "sus" | "hayir"; mal?: MalId; adet?: number; tutar?: number; istekNo: string }
const genelYanitiMi = (v: unknown): v is Record<string, unknown> => nesne(v);
export function toplulukDurumuMi(v: unknown): v is ToplulukDurumu {
  if (!nesne(v) || !nesne(v.mesrep) || !dizi(v.mesrep.eksenler) || !mantik(v.mesrep.secildi) || !mantik(v.mesrep.secimAcik)) return false;
  if (!nesne(v.ortakDert) || !dizi(v.ortakDert.acik) || !dizi(v.ortakDert.son) || !dizi(v.ortakDert.uygunKatkilarim)) return false;
  if (!nesne(v.senlik) || !(v.senlik.simdiki === null || nesne(v.senlik.simdiki))) return false;
  if (!nesne(v.hami) || !dizi(v.hami.suren) || !dizi(v.hami.gelen) || !dizi(v.hami.giden)) return false;
  if (!nesne(v.mudavim) || !sayi(v.mudavim.ziyaret) || !(v.mudavim.rozet === null || metin(v.mudavim.rozet))) return false;
  if (!nesne(v.zaviye) || !dizi(v.zaviye.kasabada) || !dizi(v.zaviye.davetler)) return false;
  return nesne(v.gostergeler) && sayi(v.gostergeler.arz) && sayi(v.gostergeler.moral) && sayi(v.gostergeler.asayis);
}
