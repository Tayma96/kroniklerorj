// Han masası (Faz 10) ortak biçimleri: WebSocket iletileri, masa görünümü, olay, iç iletiler.
// Masa para tutmaz: bu dosyadaki hiçbir biçimde akçe, kasa ya da fiyat alanı yoktur (GDD §13 "Masa DO").

import type { HataKodu, HesapYaptirimi } from "../tipler.ts";

/** Yerleşim türüne göre mekân: şehirde han, kasabada küçük han, köyde menzil (GDD §16 Yapı). */
export type HanTuru = "han" | "kucukHan" | "menzil";
/** Masa türleri (GDD §16). H9: masa başı "acik"/"ozel" arasında seçer (özel: yalnız davetli oturur); meclis/tüccar
 *  bu sürümde yalnız gösterimdir (kimse seçemez). */
export type MasaTuru = "acik" | "ozel" | "meclis" | "tuccar";

/**
 * Masa ayarı (kalıcı masa durumu). Hancı (mekân sahibi, Faz 13) masa açar/kapatır, kavgayı yasaklar.
 * `sesli`: Faz 16 sesli sohbet bu masada açık mı (varsayılan açık; sunucuda Realtime yapılandırılmamışsa yine kapalı).
 * Berkay: yaş sınırı yok, yaş kapısı alanı bilerek konmadı (spec §6.1).
 * Para, koltuk satışı, atılmazlık ya da gizli giriş alanı bilerek yoktur.
 */
export interface MasaAyari {
  tur: MasaTuru;
  acik: boolean;
  sesli: boolean;
  kavgaYasak: boolean;
  /** H2: masa başı kilitledi: yeni kimse oturamaz ve sıraya giremez; ayakta dinleme ve oturanlar sürer.
   *  Son oturan kalkınca ayar varsayılana döner. Eski kayıtta yok → false. */
  kilitli: boolean;
  /** H9 özel masanın davetlileri (hesap kimlikleri; masa başı yazar, masa boşalınca silinir). Eski kayıtta yok. */
  davet?: string[];
  /** H8: masa başı ozan sahnesini yasakladı (yalnız true iken yazılır; yok → sahne açılabilir). Son oturan kalkınca
   *  silinir. Atışmayı etkilemez. */
  sahneYasak?: boolean;
}

/** H9: masa başının seçebildiği türler. */
export const MASA_BASI_TURLERI = ["acik", "ozel"] as const;
/** H2: masa başının WebSocket'ten değiştirebildiği ayar alanları. */
export const MASA_BASI_AYARLARI = ["kavgaYasak", "kilitli", "sesli"] as const;

/** İsim plakası: kimlik, görünen ad ve isteğe bağlı Debdebe çerçevesi (oyun mantığı okumaz). */
export interface Plaka {
  hesap: string;
  ad: string;
  cerceve?: string;
  /** H11 Debdebe: sohbet balonu ve oturduğu yerin masa süsü (kozmetik ürün kimliği; oyun mantığı okumaz). */
  balon?: string;
  masaSusu?: string;
  /** H4: bu yerleşimin hanının müdavimi (rozet; oyun mantığı okumaz, yalnız plakada görünür). */
  mudavim?: true;
  /** H8: ana mesleği ozan (yalnız görünür işaret; hiçbir yetki ya da güç vermez). */
  ozan?: true;
  /** Kişi kartı: oyuncunun bu yerleşimdeki karakter kimliği ("o123"; /v1/oyuncu/:id) ve namı (dört eksen toplamı,
   * 0–400). Yalnız herkese açık oyuncu sayfasındaki bilgiler; yoksa istemci "Profile git/Engelle"yi kapalı tutar. */
  kisi?: string;
  nam?: number;
}

export interface MasaGorunumu {
  no: number;
  /** Koltuk dizini 0..KOLTUK_SAYISI-1; boş koltuk null. */
  koltuklar: (Plaka | null)[];
  /** Masa başı: en eski oturan (ayrılınca bir sonrakine geçer). */
  masaBasi: string | null;
  /** Koltuk bekleme sırası (herkese görünür; para sırayı değiştirmez). */
  sira: Plaka[];
  /** Koltuksuz bağlı dinleyiciler (sıradakiler dahil). */
  ayakta: number;
  ayar: MasaAyari;
}

/** Butonlu eylemler (GDD §16 "Konuşma oyun durumunu bağlamaz"); `kabul` sözleşme/ittifak teklifine onaydır. */
export const HAN_EYLEMLERI = ["yemin", "sozlesme", "ittifak", "ihbar", "meydanOku", "atisma", "kabul"] as const;
export type HanEylemi = (typeof HAN_EYLEMLERI)[number];
/** Olay türleri: butonlu eylemler + masa başının çıkarması + H8 atışma sonucu (sunucu yazar; istemci gönderemez). */
export type MasaOlayTuru = HanEylemi | "atma" | "atismaSonuc";
/** Karşı tarafın onayını bekleyen teklif türleri. */
export type TeklifTuru = "sozlesme" | "ittifak" | "meydanOku" | "atisma";

/**
 * Masa olayı: eylemin kendisi (kim, kime, neyi) ve o anda oturanların katılım listesi (yalnız kimlikler).
 * Sohbet içeriği burada yoktur. Oyun etkileri (nam, şeref, söylenti, dava) sonraki fazların kancasıdır.
 */
export interface MasaOlayi {
  no: number;
  masa: string;
  tur: MasaOlayTuru;
  kim: string;
  hedef?: string;
  /** `kabul`: onaylanan olayın numarası. */
  olay?: number;
  /** Söz/şart metni (yemin, sözleşme, ittifak): eylemin parçasıdır, sohbet değildir. */
  sart?: string;
  zaman: number;
  /** Olay anında koltukta oturanlar, koltuk sırasıyla. */
  katilim: string[];
  /** Sözleşme/ittifak/meydan okuma (H6): karşı tarafın onayı bekleniyor mu. */
  durum?: "teklif" | "kabul";
  /** Onaylandıysa onay olayının numarası. */
  kabulOlay?: number;
  /** `kabul`: onaylanan teklifin türü (yerleşimdeki etki için). */
  teklifTur?: TeklifTuru;
  /** H8 `atismaSonuc`: sonuç ve oylar [teklif edenin (a), kabul edenin (b)]. `kim` kazanan (berabere/hükümsüzde a),
   *  `hedef` öteki taraf, `olay` atışma teklifinin numarası. */
  sonuc?: AtismaSonucTuru;
  oy?: [number, number];
}

/** Worker → MasaDO yükseltme bileti (iç başlıkta taşınır; istemci bunu göremez ve yazamaz). */
export interface MasaBileti {
  masa: string;
  no: number;
  plaka: Plaka;
  yt: HesapYaptirimi;
  /** İki yönlü engel listesi (hesap kimlikleri; YerlesimDO'dan, bilet alınırken). Eski bilette yok. */
  eg?: string[];
  /** H3: hesabın oluşturulma anı (ms; HesapDO'dan). Yeni hesabın kısa ileti sınırı için. Eski bilette yok. */
  ho?: number;
}

/** İstemci → sunucu (WebSocket metin çerçevesi, JSON). */
export type IstemciIletisi =
  | { t: "otur"; koltuk?: number }
  | { t: "kalk" }
  | { t: "yaz"; metin: string }
  | { t: "sustur"; hedef: string }
  | { t: "susturKaldir"; hedef: string }
  | { t: "at"; hedef: string }
  | { t: "oneAl"; hedef: string }
  | { t: "rapor"; hedef: string; neden: string; aciklama?: string; istekNo: string }
  // Faz 16 ses: konuşma göstergesi (yalnız yayındayken), masa başının ses kesmesi, söz isteme
  | { t: "konus"; acik: boolean }
  | { t: "sesKapat"; hedef: string }
  | { t: "sesAc"; hedef: string }
  | { t: "sozIste" }
  | { t: "sozGeri" }
  | { t: "sozVer"; hedef: string; kabul?: boolean }
  // H2: masa başı ayarı (en az bir alan)
  | { t: "ayar"; kavgaYasak?: boolean; kilitli?: boolean; sesli?: boolean; tur?: "acik" | "ozel"; sahneYasak?: boolean }
  // H9: masa başı özel masaya davet eder (ya da `kaldir: true` ile daveti geri alır)
  | { t: "davet"; hedef: string; kaldir?: boolean }
  // H8 ozan sahnesi: oturan biri açar (anlatıcı olur); anlatıcı ya da masa başı kapatır. Sahnede söz `sozIste`/
  // `sozGeri`/`sozVer` ile (oturanlar için) yürür.
  | { t: "sahneAc" }
  | { t: "sahneKapat" }
  // H8 ozan atışması (teklif/kabul `/v1/han/eylem` ile, tur "atisma"): sırası gelen taraf kıtasını yazar; oylamada
  // oy hakkı olan bir kez oy verir; taraf ya da masa başı kapatır (kıta aşamasında iptal, oylamada sonuçlandırır).
  | { t: "kita"; metin: string }
  | { t: "oy"; hedef: string }
  | { t: "atismaKapat" };

/** H8 sahne görünümü (herkese aynı). */
export interface SahneGorunumu {
  anlatici: string;
  /** Anlatıcının söz verdiği oturanlar (yazabilirler). */
  soz: string[];
  /** Söz isteyen oturanlar, istek sırasıyla. */
  istek: string[];
  acilis: number;
}

export type AtismaSonucTuru = "kazandi" | "berabere" | "hukumsuz" | "iptal";

/** H8 atışma görünümü. Oyların dağılımı oylama bitene kadar gösterilmez; kimin oy verdiği görünür. */
export interface AtismaGorunumu {
  /** Atışma teklifinin olay numarası. */
  olay: number;
  /** a: teklif eden (ilk kıta onun), b: kabul eden. */
  a: string;
  b: string;
  /** Yazılmış kıta sayısı ve toplam (2 × ATISMA_KITA). */
  kita: number;
  toplam: number;
  /** Kıta sırası kimde (oylamada null). */
  sira: string | null;
  asama: "kita" | "oylama";
  /** Oylamada oy hakkı olanlar ve oy verenler (oylama açılmadıysa boş). */
  hak: string[];
  oyVeren: string[];
  /** Yalnız hoş geldin iletisinde, yeni hesaba (24 sa): kıta harf sınırı (yoksa KITA_EN_UZUN). */
  kitaEnCok?: number;
}

/** H8 atışmanın bitişi (herkese yayınlanır). `kazanan`: kazandıda bir, berabere ikisi, hükümsüz/iptalde boş. */
export interface AtismaSonucu {
  olay: number;
  a: string;
  b: string;
  sonuc: AtismaSonucTuru;
  kazanan: string[];
  /** [a'nın oyu, b'nin oyu]. */
  oy: [number, number];
}

/**
 * Masanın ses durumu (Faz 16). Yalnız kimlikler ve iz adları; ses verisi ve kayıt yoktur.
 * İz adı istemcinin `POST /ses/dinle` ile çekeceği yayını adlandırır; yayının Realtime oturum kimliği gizlidir.
 */
export interface SesDurumu {
  /** Sunucuda Realtime yapılandırılmış ve masa sesli. */
  acik: boolean;
  neden?: "yapilandirilmadi" | "masa_sessiz";
  /** Mikrofonu açık (yayında) olanlar, koltuk sırasıyla. */
  yayin: { hesap: string; iz: string }[];
  /** Şu an konuşanlar (yayındakilerin kendi bildirdiği ses etkinliği). */
  konusan: string[];
  /** Masa başının sesini kestikleri (bu masada yayın açamaz). */
  kapali: string[];
  /** Söz isteyen ayaktakiler, istek sırasıyla. */
  soz: Plaka[];
}

/** Sunucu → istemci. */
export type SunucuIletisi =
  | { t: "hosgeldin"; ben: Plaka; susturma: { bitis: number | null } | null; masa: MasaGorunumu; ses?: SesDurumu; sahne?: SahneGorunumu; atisma?: AtismaGorunumu; /** Yeni hesapta (24 sa) atışma kıtası harf sınırı; yoksa KITA_EN_UZUN. */ kitaEnCok?: number }
  /** H8: sahne açıldı/değişti (null: kapandı). */
  | { t: "sahne"; sahne: SahneGorunumu | null }
  /** H8: atışma başladı/ilerledi (null: bitti; `son` bitişin sonucu). */
  | { t: "atisma"; atisma: AtismaGorunumu | null; son?: AtismaSonucu }
  /** H8: atışma kıtası (sohbet gibi saklanmaz; `sira` 1..toplam). */
  | { t: "kita"; hesap: string; ad: string; koltuk: number; metin: string; sira: number; zaman: number; balon?: string }
  | { t: "sesDurum"; ses: SesDurumu }
  | { t: "durum"; masa: MasaGorunumu }
  | { t: "ileti"; hesap: string; ad: string; koltuk: number; metin: string; zaman: number; balon?: string }
  | { t: "olay"; olay: MasaOlayi }
  | { t: "anons"; anons: MasaAnonsu }
  | { t: "sessiz"; liste: string[] }
  | { t: "rapor"; sonuc: unknown }
  | { t: "hata"; hata: HataKodu; istek?: string; bitis?: number | null };

/** Soket eki (hibernation'da soketle birlikte saklanır, ≤2 KB). Sohbet metni hiçbir zaman buraya yazılmaz. */
export interface SoketEki {
  /** Masa DO adı. */
  m: string;
  no: number;
  h: string;
  a: string;
  /** Debdebe plaka çerçevesi (kozmetik ürün kimliği; oyun mantığı okumaz). */
  cf?: string;
  /** Müdavim rozeti (plaka; oyun mantığı okumaz). */
  md?: 1;
  /** H8 ozan işareti (plaka; oyun mantığı okumaz). */
  oz?: 1;
  /** Kişi kartı: karakter kimliği ve nam (plaka; oyun mantığı okumaz). */
  ki?: string;
  nm?: number;
  /** H11 Debdebe sohbet balonu ve masa süsü (kozmetik; oyun mantığı okumaz). */
  bl?: string;
  su?: string;
  /** Hesabın oluşturulma anı (yeni hesap ileti sınırı). */
  ho?: number;
  /** Koltuk dizini ya da null (ayakta). */
  k: number | null;
  /** Oturma anı (masa başı için). */
  o: number | null;
  /** Sıraya giriş anı ya da null. */
  s: number | null;
  /** Yerel sessize alınanlar (yalnız bu bağlantı için). */
  sus: string[];
  /** İleti hızı ve genel komut hızı (pencere, sayı). */
  hz?: { pencere: number; sayi: number };
  kz?: { pencere: number; sayi: number };
  yt: HesapYaptirimi;
  /** 1 = devredildi ya da çıkarıldı: hesaba katılmaz, kapanışı yok sayılır. */
  x?: 1;
  /** Faz 16 ses: Realtime oturumu (o), yayın izi adı (i) ve mid'i (d), konuşuyor (k). Ses verisi yok. */
  ses?: { o: string; i?: string; d?: string; k?: 1 };
  /** Masa başı bu oyuncunun sesini kesti. */
  sm?: 1;
  /** Söz isteği anı (ayakta dinleyen). */
  si?: number;
}

/** Ses uçları: POST /v1/han/masa/:no/ses/<alt>. */
export const SES_ALTLARI = ["oturum", "yayin", "dinle", "anlas", "kapat"] as const;
export type SesAlt = (typeof SES_ALTLARI)[number];

/** HesapDO → MasaDO iç iletileri. */
export type MasaIleti =
  | { islem: "ozet"; masa: string; no: number }
  | { islem: "eylem"; masa: string; hesap: string; girdi: EylemGirdisi }
  | { islem: "cikar"; masa: string; hesap: string }
  | { islem: "yaptirim"; masa: string; hesap: string; durum: HesapYaptirimi }
  /** İkram öncesi: gönderen oturuyor mu, alan masada mı, engel var mı (ödeme bundan sonra yapılır). */
  | { islem: "ikramKontrol"; masa: string; hesap: string; hedef: string }
  /** Masaya anons: saklanmaz, katılım listesi yoktur. */
  | { islem: "anons"; masa: string; anons: MasaAnonsu }
  /** Oyuncu masadayken engel listesi değişti (HesapDO bildirir; iki yönlü liste). */
  | { islem: "engel"; masa: string; hesap: string; liste: string[] }
  /** H7 ziyafet öncesi: veren oturuyor ve susturulmamış mı; oturanlar (hesap kimlikleri) döner. */
  | { islem: "ziyafetKontrol"; masa: string; hesap: string }
  /** Faz 16 ses: MasaDO yetki kapısıdır (oturuyor mu, susturuldu mu, sesi kesildi mi), Realtime'a vekildir. */
  | { islem: "ses"; masa: string; hesap: string; alt: SesAlt; govde: unknown };

/**
 * Masaya anons türleri (hediye ailesi). Bu fazda yalnız `ikram` (NPC hancı menüsünden akçeyle) çalışır;
 * `armagan` (envanterden) ve `debdebe` (Faz 15) aynı biçimi kullanacak. Anons saklanmaz, katılım listesi yazılmaz.
 */
export type AnonsTuru = "ikram" | "armagan" | "debdebe" | "ziyafet";
export interface MasaAnonsu {
  tur: AnonsTuru;
  kim: string;
  /** Alan kişi; `ziyafet` bütün masaya olduğundan hedefsizdir. */
  hedef?: string;
  /** İkram/armağan/Debdebe öğesinin kimliği (ör. "serbet"). */
  oge: string;
  zaman: number;
}

export interface EylemGirdisi {
  masa: number;
  tur: HanEylemi;
  hedef?: string;
  olay?: number;
  sart?: string;
  istekNo: string;
}

export interface MasaOzeti {
  no: number;
  /** H1: isteyenin dostu ya da hanesinden olup bu masada OTURAN kişi sayısı (kimlik gönderilmez). */
  tanidik: number;
  oturan: number;
  ayakta: number;
  sira: number;
  ayar: MasaAyari;
}

/** MasaDO → HesapDO iç özeti: oturan hesaplar yalnız tanıdık sayımı içindir, istemciye gönderilmez. */
export type MasaIcOzeti = Omit<MasaOzeti, "tanidik"> & { oturanlar: string[] };

/**
 * 4.9 Çoklu han: yerleşimdeki bir hanın kartı (GET /v1/han `hanlar`). `no` istemcinin `han` parametresidir (1 = bugünkü
 * han; sahipsizken NPC). `oda` NPC hanında null (sınırsız). `masa`: masa sayısı, açık masa ve oturan toplamı (HesapDO).
 */
export interface HanKarti {
  no: number;
  isletme: string;
  sahip: "npc" | "oyuncu";
  sahipKisi?: { id: string; ad: string };
  /** İşletme adı (oyuncu koyar; boşsa istemci tür adını gösterir). */
  ad: string;
  seviye: number;
  /** Fiyat çarpanı (%): menü, ziyafet ve oda fiyatı. NPC hanında 100. */
  fc: number;
  /** Oyuncu hanı kapısı kapalıysa ya da yansı gelmediyse false (ödeme `han_kapali`). */
  acik: boolean;
  oda: { dolu: number; kapasite: number } | null;
  /** İsteyenin bu handaki müdavim rozeti (yoksa null). */
  mudavim: string | null;
  masa?: { sayi: number; acik: number; oturan: number };
  /** Tezgâh modeli: son ay dönümündeki yolcu payı dökümü (yalnız hanın sahibi ve oyuncu çalışanı görür). */
  yolcu?: YolcuKarti;
}

export interface YolcuKarti {
  ay: number;
  payYuzde: number;
  tutar: number;
  tavan: number;
  carpan: { F: number; K: number; R: number; H: number };
}

export interface HanOzeti {
  yerlesim: { id: string; ad: string };
  /** `no`: seçili han (4.9; eski istemci yok sayar). */
  han: { tur: HanTuru; ad: string; no: number; isletme: string };
  koltuk: number;
  masalar: MasaOzeti[];
  /** İkram menüsü (fiyat akçe; ödeme YerlesimDO'da). Oyuncu hanında fiyat çarpanla değişir (`hanlar[].fc`). */
  menu: { id: string; fiyat: number }[];
  /** 4.9: yerleşimin açık hanları (keşif sırasıyla değil, numara sırasıyla). Yerleşim yanıt vermezse yalnız seçili han. */
  hanlar: HanKarti[];
}
