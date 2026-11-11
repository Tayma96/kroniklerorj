// Siyasi yapı durum biçimleri (Ek B §12: Region, SultanState, Appointment/Term, Tribute, MongolPosture, Legitimacy,
// AutonomyPetition). Sürümlü (v). SP verisiyle ilişkisi yoktur. Bölge başına BolgeDO, tek düşük frekanslı SultanlikDO.

import type { MakamTuru, MesruiyetKademesi } from "./sabitler.ts";

/** İstemciye giden metin anahtarı ve parametreleri (çeviri istemcide). */
export interface Metin {
  k: string;
  p?: Record<string, string | number | boolean>;
}

/** Döküm kalemi: neden (anahtar) ve sayısal katkısı. Gizli sayı yoktur. */
export interface Neden {
  k: string;
  d: number;
}

/**
 * Yerleşim DO'sundan gelen siyasi kimlik (sunucu doğrular; istemci kimliği kabul edilmez).
 * `kisi` = "<yerlesim>/<yerel oyuncu kimliği>"; vâris yeni kişi olur, hesap aynı kalır.
 */
export interface SiyasiKimlik {
  kisi: string;
  hesap: string;
  ad: string;
  yerlesim: string;
  bolge: string;
  yas: number;
  /** Hane (ocak) numarası; 0 = yok. */
  e: number;
  olu: boolean;
  /** Nam toplamı (0–400). */
  nam: number;
  /** Teveccüh kademesi (0–5). */
  teveccuh: number;
  /** Makamla ilgili hak düğümleri (beceri ağacı v2: kasabaMakami, bolgeMakami). */
  haklar: string[];
}

/** Makamı tutan kişi; NPC ise kurumun tutucusudur (boş makam toplumu kilitlemez). */
export interface Tutucu {
  npc: boolean;
  kisi: string;
  hesap?: string;
  ad: string;
  /** Hesap kümesi anahtarları ("h:<hesap>", "e:<yerlesim>:<hane>"). NPC'de boş. */
  kume: string[];
  /** Son görülme (ms); yokluk kademesi buradan hesaplanır. */
  sg?: number;
  liyakat: number;
}

export interface Aday extends Tutucu {
  /** Liyakat dökümü. */
  dokum: Neden[];
  yerlesim?: string;
}

export type SecimAsamasi = "adaylik" | "gosterme" | "onay" | "oy";

export interface Secim {
  asama: SecimAsamasi;
  /** Aşamanın bittiği ay (bu ayın dönümünde sonraki aşamaya geçilir). */
  bitis: number;
  acilis: number;
  adaylar: Aday[];
  /** Karma/atama: gösterilen aday (kisi). */
  gosterilen?: string;
  /** Reddedilen adaylar (aynı seçimde yeniden gösterilemez). */
  reddedilen: string[];
  /** Onay: koltuk kimliği → evet/hayır (oyuncu tutucular; NPC deterministik oy verir). Oy: kisi → aday kisi. */
  oylar: Record<string, string>;
  /** Oy veren hesaplar (kişi başı tek oy; vâris yeniden oy veremez). */
  oyHesap: string[];
  deneme: number;
}

export interface Koltuk {
  id: string;
  tur: MakamTuru;
  /** Bölge ya da yerleşim kimliği. */
  yer: string;
  s: Tutucu;
  /** Vekil (oyuncu); büyük siyasi karar alamaz. */
  v?: Tutucu;
  ds: number;
  dn: number;
  /** Geçici usul (NPC naib ya da yetersiz katılımla atama): yarım dönem. */
  gecici?: boolean;
  /** Aynı kümenin ardışık dönem sayısı. */
  ardisik: number;
  /** Yetki ayarları (olağan işler sahibe bakmadan bu ayarla işler). */
  ayar: Record<string, number>;
  /** Ön talimat: aylık bayındırlık (kapsam, süre ve harcama sınırı görünür). */
  talimat?: { hedef: string; tutar: number; bitis: number };
  /** Bu ayın harcaması: [ay, tutar]. */
  harcanan: [number, number];
  /** Bu dönemdeki azil sayısı (azleden olarak) ve yetki kullanımı (sicil: ihmal denetimi). */
  azil: number;
  is: number;
  /** Ardışık yetersiz katılım (yeter sayı kademeli düşer; başarılı seçimde sıfırlanır). */
  yd: number;
  secim?: Secim;
}

export interface AzilKaydi {
  n: number;
  ay: number;
  koltuk: string;
  /** Azledilen tutucu (itiraz kabul edilirse geri döner). */
  eski: Tutucu;
  eskiDonem: [number, number];
  gerekce: string;
  azleden: string;
  /** İtiraz: yok | bekliyor | kabul | ret. */
  itiraz: "yok" | "bekliyor" | "kabul" | "ret";
  hakem?: "divan" | "mogol";
  dogrulandi: boolean;
}

/** İşlem kaydı satırı (yalnız eklenir; sayfalı saklanır, budanmaz). Akçe hareketleri de buradadır. */
export interface KayitSatiri {
  n: number;
  ay: number;
  tur: string;
  kim: string;
  koltuk?: string;
  /** Akçe hareketi (pozitif giriş, negatif çıkış) ve sonraki kasa. */
  akce?: number;
  kasa?: number;
  m: Metin;
}

export interface Ozerklik {
  durum: "basvuru" | "sartli" | "etkin" | "ret" | "bitti" | "geriAlindi";
  indirim: number;
  sure: number;
  asker: number;
  basvuruAy: number;
  karar?: { tur: "kabul" | "sartli" | "ret"; skor: number; dokum: Neden[]; ay: number };
  /** Şartlı teklif: cevap son ayı. */
  cevapSon?: number;
  bitis?: number;
  /** Şart: haraç gecikmesi olursa geri alınır. */
  sart?: string;
  neden?: string;
  /** Kayıt numarası (başvuru kimliği). */
  n: number;
}

export interface Mesruiyet {
  puan: number;
  kademe: MesruiyetKademesi;
  nedenler: Neden[];
}

export interface SultanlikOzeti {
  ay: number;
  sultan: { ad: string; npc: boolean };
  hazine: number;
  mesruiyet: Mesruiyet;
  mogol: MogolGorunumu;
}

export interface MogolGorunumu {
  tutum: string;
  kademe: number;
  /** 3 kademeli görünür gösterge (Moğol onayı): guclu / dengeli / zayif. */
  gosterge: MesruiyetKademesi;
  gerilim: number;
  sonrakiEsik: number | null;
  nedenler: Neden[];
  etki: { arz: number; moral: number; guvenlik: number };
  talep: number;
}

export type DarbeAsamasi = "hazirlik" | "ilan" | "catışma" | "bastirildi" | "pat" | "basarili" | "mogol" | "iptal";
export type DarbeDestekRolu = "sehirBeyi" | "ahiBasi";
export interface DarbeDestegi {
  kisi: string;
  hesap: string;
  koltuk: string;
  rol: DarbeDestekRolu;
  kume: string[];
  ay: number;
}
export interface DarbeIzi {
  ay: number;
  tur: "hazirlik" | "destek" | "ikmal" | "ilan" | "baskin";
  guvenilirlik: number;
  gorunurluk: "vali" | "ileriGelen" | "bolge";
}
export interface DarbePlani {
  v: 1;
  id: string;
  durum: DarbeAsamasi;
  baslatanKisi: string;
  baslatanHesap: string;
  acilisAy: number;
  sogumaSonAy: number;
  destekler: DarbeDestegi[];
  garnizonSadakati: number;
  yatirilan: number;
  mod?: "acik" | "baskin";
  ilanAy?: number;
  cozumAy?: number;
  izler: DarbeIzi[];
}

export interface BolgeDurumu {
  v: 1;
  id: string;
  /** İşlenen son ay dönümü. */
  ay: number;
  g: { arz: number; moral: number; guvenlik: number };
  kasa: number;
  /** Akçe defteri toplamları: giren = kasa + cikan + gonderilen + yolda (değişmez). */
  giren: number;
  cikan: number;
  gonderilen: number;
  /** Sultanlığa yolda olan haraç (outbox; anahtar → tutar). */
  yolda: Record<string, number>;
  /** Ardışık haraç gecikmesi (ay). */
  gecikme: number;
  sonGelir: number;
  koltuklar: Koltuk[];
  /** Tırmanış: hesap → tuttuğu makam türleri (liyakat dökümü). */
  gecmis: Record<string, string[]>;
  /** Penceredeki haksız azil ayları (Divan/Moğol geri aldı). */
  haksiz: number[];
  /** Bu ay Sultan adına geri alınan azil sayısı (rapora gider). */
  sultanHaksiz: number;
  aziller: AzilKaydi[];
  ozerklik?: Ozerklik;
  /** P5 darbe planı; gizli hazırlık izleri genel bölge görünümüne sızdırılmaz. */
  darbe?: DarbePlani;
  /** Son çekilen Sultanlık özeti (GET'ler Sultanlığa gitmez: sıcak global nesne yok). */
  sultanlik?: SultanlikOzeti;
  mesruiyet: Mesruiyet;
  /** Son rapor (yolda kalan haraç yeniden gönderilirken eşlik eder). */
  sonRapor?: BolgeRaporu;
  /** Son işlem kayıtları (tamamı sayfalarda). */
  kayit: KayitSatiri[];
  kn: number;
}

export interface BolgeRaporu {
  ay: number;
  mesruiyet: number;
  kademe: MesruiyetKademesi;
  moral: number;
  haracBeklenen: number;
  haracOdenen: number;
  gecikme: number;
  ozerklik: boolean;
  /** Bu ay verilen özerklik (Moğol gerilim girdisi). */
  yeniOzerklik: boolean;
  /** Bu ay Divan/Moğol'un geri aldığı Sultan azilleri (Sultan meşruiyeti: adalet). */
  sultanHaksiz: number;
  vali: { ad: string; npc: boolean };
  temsilci: { ad: string; npc: boolean; kisi: string };
}

export interface SultanlikDurumu {
  v: 1;
  ay: number;
  sultan: Tutucu;
  divan: Tutucu[];
  hazine: number;
  giren: number;
  cikan: number;
  mogol: { tutum: number; gerilim: number; gecikme: number; nedenler: Neden[] };
  mesruiyet: Mesruiyet;
  raporlar: Record<string, BolgeRaporu>;
  /** Alınan haraç anahtarları (tekrar güvenliği) → ay. */
  harac: Record<string, number>;
  /** Divanın geri aldığı Sultan azilleri (ay). */
  haksiz: number[];
  kayit: KayitSatiri[];
  kn: number;
}

/** HesapDO → BolgeDO. */
export type BolgeIleti =
  | { islem: "gorunum"; bolge: string; hesapId: string; kimlik?: SiyasiKimlik; kayitSayfa?: number | null; simdi?: number }
  | { islem: "yaz"; bolge: string; hesapId: string; kimlik: SiyasiKimlik; govde: unknown }
  | { islem: "yoklama"; bolge: string; hesapId: string }
  /** Faz 6 kancası: oyuncu/mülk vergisi vali kasasına (anahtar ile tekrar güvenli; akçe çağıranda düşülmüş olmalı). */
  | { islem: "vergiYatir"; bolge: string; anahtar: string; tutar: number; yerlesim: string };

/** BolgeDO → SultanlikDO. */
export type SultanlikIleti =
  | { islem: "rapor"; bolge: string; rapor: BolgeRaporu; harac: { anahtar: string; tutar: number } | null; temsilci?: Tutucu }
  | { islem: "ozet" };
