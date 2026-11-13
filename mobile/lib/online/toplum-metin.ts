// Faz 3a metin tabloları: sunucu olay/etki anahtarlarının parametre sırası (metin.ts PARAM'a katılır) ve yeni hata
// kodlarının i18n anahtarları (hata.ts ANAHTAR'a katılır). Metinler i18n-sayfa/online-toplum.ts'te (6 dil).
import type { OnlineHata } from "./protokol";

const TURLER = ["cirak", "ortak", "borc", "hediye", "gorucu", "is", "npcIs", "npcBorc", "npcDunur"];
const herTur = (on: string, p: string[]) => Object.fromEntries(TURLER.map((t) => [`${on}.${t}`, p]));

/** Sunucu {k, p} → şablon %1, %2 … sırası (teklif.ts, iliski.ts, npc-teklif.ts, teveccuh.ts). */
export const TOPLUM_PARAM: Record<string, string[]> = {
  ...herTur("olay.teklif.geldi", ["kisi"]),
  ...herTur("olay.teklif.kabul", ["kisi"]),
  ...herTur("olay.teklif.ret", ["kisi"]),
  ...herTur("olay.teklif.dustu", []),
  "olay.teklif.bitti.cirak": ["kisi"],
  "olay.teklif.bitti.ortak": ["kisi"],
  "olay.teklif.bitti.is": ["kisi"],
  "olay.teklif.teslim.is": ["kisi", "tutar"],
  "olay.teklif.mektupUlasti": ["kisi", "mesaj"],
  "olay.teklif.mektupTeslim": ["kisi"],
  "olay.teklif.duzen": ["tur"],
  "olay.borc.odendi": ["kisi", "tutar"],
  "olay.borc.taksit": ["kisi", "tutar", "kalan"],
  "olay.borc.gecikti": ["kalan"],
  "olay.ciraklik.oyuncu": ["cirak", "usta", "meslek"],
  "olay.ciraklik.kalfa": ["cirak", "usta", "meslek"],
  "olay.ortaklik": ["a", "b"],
  "olay.dostluk.istek": ["kisi"],
  "olay.dostluk.oyuncu": ["a", "b"],
  "olay.husumet.ilan": ["kisi", "hedef"],
  "olay.husumet.kalkti": ["kisi", "hedef"],
  "olay.npcTeklif.npcIs": ["kisi", "tutar"],
  "olay.npcTeklif.npcBorc": ["kisi", "tutar"],
  "olay.npcTeklif.npcDunur": ["kisi", "aday"],
  "olay.npcBorc.batti": ["tutar"],
  "olay.npcBorc.odendi": ["kisi", "tutar"],
  "teveccuh.etki.ilkIzlenim": ["deger"],
  "teveccuh.etki.siparis": ["deger"],
  "teveccuh.etki.secim": ["deger"],
  "teveccuh.etki.sahne": ["deger"],
  "teveccuh.etki.musteri": ["deger"],
  "teveccuh.etki.ahi": ["deger"],
};

export const TOPLUM_HATA_ANAHTARI: Partial<Record<OnlineHata, string>> = {
  teklif_gecersiz: "onl.h.teklifGecersiz",
  teklif_yok: "onl.h.teklifYok",
  teklif_kapandi: "onl.h.teklifKapandi",
  teklif_siniri: "onl.h.teklifSiniri",
  taraf_degil: "onl.h.tarafDegil",
  ayni_kume: "onl.h.ayniKume",
  kendine: "onl.h.kendine",
  engelli: "onl.h.engelli",
  tavan_doldu: "onl.h.tavanDoldu",
  hediye_dongu: "onl.h.hediyeDongu",
  aralik_dolu: "onl.h.aralikDolu",
  istek_yok: "onl.h.istekYok",
  soylenti_yok: "onl.h.soylentiYok",
  duzen_gecersiz: "onl.h.duzenGecersiz",
  oncelik_bekle: "onl.h.oncelikBekle",
  kendini_sikayet: "onl.h.kendine",
  sikayet_gecersiz: "onl.h.sikayetGecersiz",
  sikayet_siniri: "onl.h.sikayetSiniri",
  kuyruk_dolu: "onl.h.sikayetSiniri",
  susturuldu: "onl.h.susturuldu",
};
