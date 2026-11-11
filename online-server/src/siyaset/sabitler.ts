// Siyasi yapı (Faz 7 + Ek B P1–P4): makam tanımları ve bütün sayısal değerler. Her sayı [PARAMETRE]dir; alfa
// verisiyle ayarlanır. Gizli sayı yoktur: etkiler istemciye döküm olarak döner. Saf veri.

/** Makam türleri. Sultan ve Divan üyeleri başta NPC'dir (D-40); oyuncu tahta yalnız valilik/Divan üzerinden yaklaşır. */
export const MAKAM_TURLERI = ["sultan", "divanUyesi", "vali", "divanTemsilcisi", "sehirBeyi", "ahiBasi", "kasabaAgasi"] as const;
export type MakamTuru = (typeof MAKAM_TURLERI)[number];

/** Yetkiler (kapalı liste). Her biri yazılı sınır ve döküm taşır. */
export const YETKILER = [
  "vergiOrani",
  "bayindirlik",
  "alarm",
  "talimat",
  "goster",
  "azil",
  "ozerklik",
  "pazarVergisi",
  "esnafNizami",
  "ortakDert",
  "vekil",
  "cekil",
] as const;
export type Yetki = (typeof YETKILER)[number];

/** Dolma yolu: karma = aday gösterilir + ileri gelenler onaylar (D-38); secim = sakinler oy verir; atama = doğrudan. */
export type Yol = "karma" | "secim" | "atama" | "npc";

export interface MakamTanimi {
  readonly yol: Yol;
  /** Dönem (oyun ayı; 1 oyun ayı = 12 gerçek saat). */
  readonly donemAy: number;
  readonly enAzYas: number;
  readonly yetkiler: readonly Yetki[];
  /** Vekilin (ve NPC naibin) daraltılmış listesi: yalnız günlük bakım; büyük siyasi karar yok. */
  readonly vekilYetkileri: readonly Yetki[];
  /** Aday gösteren / atayan makam (karma, atama). */
  readonly gosteren?: MakamTuru;
  /** Onaylayan ileri gelen makamları (karma). */
  readonly onaylayanlar?: readonly MakamTuru[];
  /** İtiraz yolu. */
  readonly itiraz: "divan" | "mogol";
  /** Hesap kümesi kuralına tabi mi (vali, şehir beyi, ahi başı, Divan temsilcisi aynı küme olamaz). */
  readonly kume: boolean;
  /** Adaylık şartı: beceri ağacı v2 hak düğümü (divan "makamAdayligi") ya da geçmiş makam ya da teveccüh. */
  readonly sart: "bolge" | "kasaba" | "teveccuh" | "yok";
}

export const MAKAMLAR: Readonly<Record<MakamTuru, MakamTanimi>> = {
  sultan: { yol: "npc", donemAy: 120, enAzYas: 30, yetkiler: [], vekilYetkileri: [], itiraz: "mogol", kume: false, sart: "yok" },
  divanUyesi: { yol: "npc", donemAy: 48, enAzYas: 25, yetkiler: [], vekilYetkileri: [], itiraz: "divan", kume: false, sart: "yok" },
  vali: {
    yol: "karma",
    donemAy: 24,
    enAzYas: 18,
    yetkiler: ["vergiOrani", "bayindirlik", "alarm", "talimat", "goster", "azil", "ozerklik", "vekil", "cekil"],
    vekilYetkileri: ["bayindirlik", "alarm"],
    gosteren: "sultan",
    onaylayanlar: ["sehirBeyi", "ahiBasi", "kasabaAgasi"],
    itiraz: "mogol",
    kume: true,
    sart: "bolge",
  },
  divanTemsilcisi: {
    yol: "atama",
    donemAy: 24,
    enAzYas: 16,
    yetkiler: ["vekil", "cekil"],
    vekilYetkileri: [],
    gosteren: "vali",
    itiraz: "divan",
    kume: true,
    sart: "yok",
  },
  sehirBeyi: {
    yol: "karma",
    donemAy: 18,
    enAzYas: 16,
    yetkiler: ["pazarVergisi", "bayindirlik", "vekil", "cekil"],
    vekilYetkileri: ["bayindirlik"],
    gosteren: "vali",
    onaylayanlar: ["ahiBasi", "kasabaAgasi"],
    itiraz: "divan",
    kume: true,
    sart: "bolge",
  },
  ahiBasi: {
    yol: "secim",
    donemAy: 12,
    enAzYas: 16,
    yetkiler: ["esnafNizami", "vekil", "cekil"],
    vekilYetkileri: [],
    itiraz: "divan",
    kume: true,
    sart: "teveccuh",
  },
  kasabaAgasi: {
    yol: "secim",
    donemAy: 12,
    enAzYas: 16,
    yetkiler: ["ortakDert", "vekil", "cekil"],
    vekilYetkileri: ["ortakDert"],
    itiraz: "divan",
    kume: false,
    sart: "kasaba",
  },
};

/** [PARAMETRE] Seçim takvimi (oyun ayı): adaylık, aday gösterme, onay/oy aşamaları. */
export const SECIM = {
  adaylikAy: 1,
  gostermeAy: 1,
  onayAy: 1,
  oyAy: 1,
  /** Onay için yeter sayı (katılan koltuk / onaylayan koltuk); her yetersiz denemede düşer, alt sınırda durur. */
  yeterOran: 0.6,
  yeterDusus: 0.15,
  yeterAlt: 0.3,
  /** Oy seçiminde en az oyuncu oyu; her yetersiz denemede 1 düşer. */
  yeterOy: 3,
  yeterOyAlt: 1,
  /** NPC ileri gelenlerin toplam oy payı (oyuncular birleşirse kazanır). */
  npcOyPayi: 0.4,
  /** NPC ileri gelen, oyuncu adayı bu liyakatten itibaren onaylar. */
  npcOnayEsik: 12,
  /** Ret ya da yetersiz katılımda en çok deneme; sonra geçici atama (makam askıda kalmaz). */
  denemeEnCok: 3,
  /** Ardışık en çok dönem (aynı küme). */
  ardisikEnCok: 2,
} as const;

/** [PARAMETRE] Liyakat dökümü (aday gösterme ve NPC onayı). */
export const LIYAKAT = {
  /** Nam toplamı (0–400) bu sayıya bölünür. */
  namBolen: 10,
  /** Teveccüh: teveccuhEtkisi(kademe, "secim"), sınırlı (§6.2). */
  teveccuhTavan: 6,
  hakBolge: 10,
  hakKasaba: 5,
  /** Tamamlanan (ya da tutulan) her makam. */
  gecmisMakam: 5,
  gecmisTavan: 15,
  npc: 10,
} as const;

/** [PARAMETRE] Adaylık şartları. */
export const SART = {
  /** Kasaba ağası: hak düğümü yoksa en az nam toplamı. */
  kasabaNam: 120,
  /** Ahi başı: en az teveccüh kademesi (TEVECCUH_ETKI.ahiKademe ile aynı). */
  ahiTeveccuh: 3,
} as const;

/** [PARAMETRE] Yokluk kademeleri (gerçek gün; GDD §10 "Yokluk, uyku ve makam devri"). */
export const YOKLUK_GUN = { vekil: 7, uyku: 30, devir: 90 } as const;
export const GUN_MS = 24 * 60 * 60 * 1000;

/** [PARAMETRE] Bölge göstergeleri 0–100; ayda tabana doğru kayma. */
export const GOSTERGE = { taban: 50, kayma: 2, alt: 0, ust: 100, zayif: 35, guclu: 65 } as const;

/** [PARAMETRE] Vergi oranı kademeleri (0 hafif … 4 ağır): gelir çarpanı, aylık moral etkisi, meşruiyet katkısı. */
export const VERGI = {
  carpan: [0.6, 0.8, 1, 1.2, 1.4],
  moral: [2, 1, 0, -2, -4],
  mesruiyet: [6, 3, 0, -5, -10],
  /** NPC başına aylık taban vergi (akçe); NPC halk ekonomisinden dünyaya giriş (basım), kayıtlı. */
  npcBasi: 0.1,
  /** Ayda en çok kademe değişimi (özerklikte 2). */
  adim: 1,
  baslangic: 2,
} as const;

/** [PARAMETRE] Pazar vergisi (şehir beyi) 0–2: ek gelir oranı ve arz etkisi. */
export const PAZAR = { ek: [0, 0.05, 0.1], arz: [0, -1, -2] } as const;
/** [PARAMETRE] Esnaf nizamı (ahi başı) 0–2: gevşek, olağan, sıkı. */
export const ESNAF = { arz: [-1, 0, 1], moral: [1, 0, -1] } as const;
/** [PARAMETRE] Ortak dert (kasaba ağası): seçilen göstergeye aylık +1 (para yok). */
export const ORTAK_DERT = { hedefler: ["arz", "moral", "guvenlik"], artis: 1 } as const;

/** [PARAMETRE] Bölge alarmı (GDD §10 tablosu): aylık güvenlik/arz etkisi ve kasa gideri (maaş/ikmal, dünyadan çıkar). */
export const ALARM = {
  seviyeler: ["olagan", "supheli", "yuksek", "seferberlik"],
  guvenlik: [0, 1, 3, 5],
  arz: [0, 0, -2, -4],
  gider: [0, 2, 6, 12],
} as const;

/** [PARAMETRE] Bayındırlık: kasadan harcanır (akçe dünyadan çıkar); azalan getiri (karekök) ve aylık bütçe sınırı. */
export const BAYINDIRLIK = {
  hedefler: ["arz", "moral", "guvenlik"],
  /** Makam başına aylık harcama sınırı (akçe); özerklikte çarpan. */
  ayTavan: { vali: 60, sehirBeyi: 20 } as Readonly<Record<string, number>>,
  ozerklikCarpan: 1.5,
  /** Etki = floor(sqrt(tutar)) puan, ayda gösterge başına en çok bu kadar. */
  etkiTavan: 8,
  /** Ön talimatın en uzun süresi (oyun ayı). */
  talimatEnUzun: 12,
} as const;

/** [PARAMETRE] Haraç: vergi gelirinin Sultan payı; gecikme kademeleri (uyarı → baskı → yaptırım; ani ceza yok). */
export const HARAC = {
  pay: 0.4,
  kademeler: ["yok", "uyari", "baski", "yaptirim"],
  /** Yaptırım kademesinde NPC Sultan azil gerekçesi doğar. */
  azilGecikme: 3,
} as const;

/** [PARAMETRE] Başlangıç kasaları (dünyaya giriş, kayıtlı). */
export const BASLANGIC = { valiKasasi: 100, hazine: 400 } as const;

/** [PARAMETRE] Moğol (D-41 oynanmaz). Aylık talep hazineden ödenir: akçe dünyadan çıkar (sink). */
export const MOGOL = {
  tutumlar: ["memnun", "temkinli", "sinirli", "seferde"],
  talep: 220,
  /** Tutuma göre talep çarpanı ("haraç baskısı artar"). */
  talepCarpan: [1, 1.1, 1.25, 1.5],
  /** Gerilim girdileri (kayıtlı olaylardan). */
  odemeRahatlama: 8,
  gecikmeGerilim: 20,
  bolgeEksik: 3,
  bolgeZayif: 2,
  ozerklik: 4,
  /** Kademe eşikleri (gerilim 0–100). Seferde yalnız ağır ihlal (ardışık gecikme) ya da P5/P6 kancasıyla. */
  esikler: [25, 50, 80],
  agirIhlalAy: 3,
  /** D-46: etki YALNIZ bölge göstergelerine (aylık). */
  etki: [
    { arz: 0, moral: 0, guvenlik: 0 },
    { arz: 0, moral: -1, guvenlik: 0 },
    { arz: -1, moral: -2, guvenlik: -2 },
    { arz: -4, moral: -4, guvenlik: -6 },
  ],
  /** Hakemlik (noyan) bedeli: başvuranın kasasından, dünyadan çıkar. */
  hakemBedel: 30,
} as const;

/** [PARAMETRE] Meşruiyet (3 kademe: Zayıf / Dengeli / Güçlü), puan 50 tabanlı. */
export const MESRUIYET = {
  taban: 50,
  zayif: 40,
  guclu: 65,
  haksizAzil: -8,
  onayliVali: 5,
  mogol: [0, -2, -5, -10],
  ozerklik: 5,
  teveccuhTavan: 4,
  /** Sultan: vali desteği, halk, Moğol onayı, adalet. */
  valiDestegi: 30,
  mogolOnayi: [10, 0, -10, -20],
  sultanHaksizAzil: -6,
  /** Haksız azillerin sayıldığı pencere (oyun ayı). */
  pencere: 12,
  /** Zayıf bölgede vergi toplamak zorlaşır. */
  zayifVergi: 0.9,
} as const;

export const MESRUIYET_KADEMELERI = ["zayif", "dengeli", "guclu"] as const;
export type MesruiyetKademesi = (typeof MESRUIYET_KADEMELERI)[number];

/** [PARAMETRE] Müzakereli özerklik (P4). */
/** [PARAMETRE] P5 darbe eşikleri; alfa verisiyle ayarlanır (Ek B §8.2). */
export const DARBE = {
  sehirDestekOrani: 1,
  ahiDestekMin: 1,
  garnizonBaslangic: 20,
  garnizonEsik: 60,
  yatirimBirim: 20,
  sadakatBirim: 10,
  yatirimEnAz: 20,
  yatirimEnCok: 200,
  hazineRezerv: 40,
  dusukMesruiyet: 40,
  valiDestekAhiEsik: 2,
  tebligAy: 1,
  catışmaAy: 1,
  sonucFarki: 25,
  sogumaAy: 6,
} as const;

export const OZERKLIK = {
  indirimEnAz: 0.1,
  indirimEnCok: 0.5,
  sureEnAz: 6,
  sureEnCok: 24,
  askerEnCok: 2,
  /** Divan kararı: skor ≥ kabul → kabul; ≥ sartli → şartlı; altı ret. */
  kabul: 15,
  sartli: 0,
  sartliSureEnCok: 12,
  /** Şartlı teklifin cevap süresi (ay). */
  cevapAy: 2,
  sogumaAy: 6,
  /** Divan kararı skor kalemleri. */
  sultanZayif: 10,
  sultanGuclu: -10,
  haracDuzenli: 10,
  haracGecikme: -10,
  mogolKademe: -5,
  indirimAgirlik: -40,
  askerKatki: 5,
  /** Genişletilmiş yetki: vergi adımı. */
  vergiAdim: 2,
} as const;

/** [PARAMETRE] Azil ve itiraz. */
export const AZIL = {
  gerekceler: ["ihmal", "yolsuzluk", "yokluk", "sadakatsizlik", "harac"],
  /** İhmal gerekçesi: dönemde hiç yetki kullanmadan en az bu kadar ay geçmişse doğrulanır. */
  ihmalAy: 3,
  /** Azleden başına dönemde en çok. */
  donemEnCok: 2,
  itirazAy: 2,
  /** Divan, gerekçe doğrulanamazsa ve hedefin sicili temizse azli geri alır. */
} as const;

/** [PARAMETRE] Kayıt sayfası ve tekrar güvenliği defteri. */
export const KAYIT = { sayfa: 50, sonGosterilen: 20, istekEnCok: 30, yoklamaMs: 6 * 60 * 60 * 1000 } as const;

/** Sultanlık değerlendirmesi ay dönümünden bu kadar sonra yapılır (bölgelerin raporu önce gelsin). */
export const SULTANLIK_GECIKME_MS = 30 * 60 * 1000;
