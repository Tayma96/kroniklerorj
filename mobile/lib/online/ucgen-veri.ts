// Üçgen (Faz 4) istemci biçimleri: online-server/src/yerlesim/{ucgen,arabulucu,casus,hafiza}.ts yanıtlarıyla birebir.
// Şans, zar, sonuç, söz ve barış sunucuda hesaplanır; istemci yalnız gösterir ve niyet (POST /v1/ucgen) gönderir.
// Görünmeyen bilgi (§13.9: NPC'nin üçüncü kişiye bakışı) sunucudan gelmez; istemci "bilinmiyor" yazar.
import { useMemo } from "react";
import { useOnline } from "./durum";
import { ekCagir, metinMi, nesneMi, sayiMi, type EkSonuc } from "./ek-istemci";
import { sahteUcgenIstemci } from "./sahte-ucgen";
import type { Dil, Dokum, Getiri, Kalem, YerlesimDurumu } from "./protokol";

export const UCGEN_TURLERI = ["kiskirt", "katil", "sozBoz", "araciIste", "araciKapat", "arabulucu", "sartOde", "casus"] as const;
export type UcgenTuru = (typeof UCGEN_TURLERI)[number];
export const KISKIRT_TEKLIFLERI = ["para", "ortaklik", "intikamPayi", "soz"] as const;
export type KiskirtTeklifi = (typeof KISKIRT_TEKLIFLERI)[number];
export const ARACI_BEDELLERI = ["ozur", "tazminat", "helallik", "ortakIs"] as const;
export type AraciBedeli = (typeof ARACI_BEDELLERI)[number];
export type Hamle = "laf" | "boykot";
export const EKSENLER = ["guven", "yakinlik", "saygi", "korku", "husumet", "borc", "sadakat"] as const;
export type Eksen = (typeof EKSENLER)[number];
export type Eksenler = Partial<Record<Eksen, number>>;
/** [sunucu casus.ts] Aylık casus bedeli (akçe) ve süre sınırı; yalnız önizlemede gösterilir, sunucu ayrıca denetler. */
export const CASUS_AYLIK_BEDEL = 3;
export const CASUS_SURE_EN_COK = 3;
/** [sunucu arabulucu.ts] Tazminat tavanı. */
export const TAZMINAT_TAVANI = 15;

export interface KisiRef { id: string; ad: string }
export interface Soz {
  id: string; npc: KisiRef; hedef: KisiRef; kurulus: number; bitis: number; kaynak: string; teklif?: KiskirtTeklifi; katilabilir: boolean;
}
export type TalepDurumu = "acik" | "bitti" | "ret" | "dustu" | "geri";
export interface Talep {
  id: string; taraf: KisiRef; arabulucu: KisiRef; npc: KisiRef; bedel: AraciBedeli; emanet?: number;
  acilis: number; sonAy: number; durum: TalepDurumu; sonuc?: string;
}
export interface AraciOnizleme { engel?: string; sans?: Dokum; kirginlik?: number; bantlar?: { baris: number; sartli: number; ateskes: number } }
export interface Baris {
  npc: KisiRef; deger: number; arabulucu: KisiRef; sartli?: { deger: number; tutar: number; sonAy: number }; ateskesBitis?: number;
}
export interface CasusKaydi { id: string; npc: KisiRef; izlenen: KisiRef; bitis: number }
export interface UcgenParametreleri {
  takat: Record<UcgenTuru, number>;
  kiskirt: { yas: number; teklif: { ortaklik: number; intikamPayi: number; soz: number; paraTavani: number }; farkOrani: number; sozSure: number; aylik: number };
  katil: { yakalanma: Record<Hamle, number>; boykotSure: number; lafAlici: number };
}
/** Görünmüyorsa (gorunur=false) yalnız bilinen kalemler gelir: hedefe kızgınlık ve toplam gizlidir. */
export type TeklifOnizleme = Dokum | { bilinen: Kalem[] };
export interface UcgenOnizleme {
  npc: string;
  eksenler: Eksenler;
  gorunur: boolean;
  kiskirt?: { engel?: string; teklifler: Partial<Record<KiskirtTeklifi, TeklifOnizleme>>; kaba?: "kizgin" | "soguk" | "yok" };
  casus?: { engel?: string; guven: Dokum };
}
/** GET /v1/ucgen?npc=&hedef=&dil= */
export interface UcgenGorunumu {
  ay: number;
  sozler: Soz[];
  talepler: { giden: Talep[]; gelen: (Talep & { onizleme: AraciOnizleme })[]; kapanan: Talep[] };
  casus: CasusKaydi | null;
  barislar: Baris[];
  parametreler: UcgenParametreleri;
  onizleme?: UcgenOnizleme;
}

/** POST /v1/ucgen gövdesi (istekNo ayrıca). */
export type UcgenGovdesi =
  | { tur: "kiskirt"; npc: string; hedef: string; teklif: { t: KiskirtTeklifi; miktar?: number } }
  | { tur: "katil"; soz: string; hamle: Hamle }
  | { tur: "sozBoz"; soz: string }
  | { tur: "araciIste"; arabulucu: string; npc: string; bedel: { t: AraciBedeli; miktar?: number } }
  | { tur: "araciKapat"; talep: string }
  | { tur: "arabulucu"; talep: string }
  | { tur: "sartOde"; npc: string }
  | { tur: "casus"; npc: string; izlenen: string; ay: number };

export interface UcgenDegisim { para?: number; nam?: Record<string, number>; beceri?: Record<string, number> }
/** POST /v1/ucgen yanıtı (türe göre alanlar; hepsi sunucunun hesapladığı). */
export interface UcgenYaniti {
  tur: UcgenTuru;
  sans?: Dokum;
  zar?: number;
  /** kiskirt: basari | ret | retHaber · arabulucu: baris | sartli | ateskes | ret | gerekYok */
  sonuc?: string;
  /** kiskirt/katil: kalemler; arabulucu retinde: en ağır olumsuz kalemin anahtarı. */
  gerekce?: Kalem[] | string;
  getiri?: Getiri;
  degisim?: UcgenDegisim;
  soz?: Soz | string;
  katildi?: boolean;
  yakalandi?: boolean;
  etki?: { duyan?: number; guven?: number; boykotBitis?: number };
  hamle?: Hamle;
  talep?: Talep | string;
  kirginlik?: number;
  deger?: number;
  sart?: { deger: number; tutar: number; sonAy: number };
  ateskesBitis?: number;
  casus?: { id: string; npc: string; izlenen: string; bitis: number };
  guven?: Dokum;
  carpikOran?: number;
  dusukGuven?: number;
}

const refMi = (v: unknown): v is KisiRef => nesneMi(v) && metinMi(v.id) && metinMi(v.ad);
const dokumMu = (v: unknown): v is Dokum => nesneMi(v) && sayiMi(v.toplam) && Array.isArray(v.kalemler);
const sozMu = (v: unknown): v is Soz => nesneMi(v) && metinMi(v.id) && refMi(v.npc) && refMi(v.hedef) && sayiMi(v.bitis);
const talepMi = (v: unknown): v is Talep => nesneMi(v) && metinMi(v.id) && refMi(v.taraf) && refMi(v.arabulucu) && refMi(v.npc) && metinMi(v.durum);
const gorunumMu = (v: unknown): v is UcgenGorunumu =>
  nesneMi(v) && sayiMi(v.ay) && Array.isArray(v.sozler) && v.sozler.every(sozMu) && nesneMi(v.talepler)
  && [v.talepler.giden, v.talepler.gelen, v.talepler.kapanan].every((l) => Array.isArray(l) && l.every(talepMi))
  && (v.casus === null || nesneMi(v.casus)) && Array.isArray(v.barislar) && nesneMi(v.parametreler)
  && (v.onizleme === undefined || (nesneMi(v.onizleme) && nesneMi(v.onizleme.eksenler) && typeof v.onizleme.gorunur === "boolean"));
const yanitMi = (v: unknown): v is UcgenYaniti =>
  nesneMi(v) && metinMi(v.tur) && (UCGEN_TURLERI as readonly string[]).includes(v.tur) && (v.sans === undefined || dokumMu(v.sans));

export const bilinenMi = (o: TeklifOnizleme | undefined): o is { bilinen: Kalem[] } => !!o && "bilinen" in o;

/** GET /v1/kisi sanaBakisEksen (Faz 4; eski sunucu göndermeyebilir). */
export function kisiEksenleri(kisi: unknown): Eksenler | null {
  const e = nesneMi(kisi) ? kisi.sanaBakisEksen : undefined;
  return nesneMi(e) ? (e as Eksenler) : null;
}

/** Kasabadaki öteki oyuncular (kışkırtma hedefi, izlenen, arabulucu adayı): harita ve tanıdıklardan; ben hariç. */
export function ucgenOyunculari(y: YerlesimDurumu | null): (KisiRef & { dost: boolean })[] {
  if (!y) return [];
  const m = new Map<string, KisiRef & { dost: boolean }>();
  for (const t of y.ben.tanidiklar) if (t.oyuncu && t.id !== y.ben.id) m.set(t.id, { id: t.id, ad: t.ad, dost: t.isaret === "dost" });
  for (const yer of y.harita) for (const k of yer.kisiler) if (k.oyuncu && k.id !== y.ben.id && !m.has(k.id)) m.set(k.id, { id: k.id, ad: k.ad, dost: false });
  return [...m.values()];
}

export interface UcgenIstemci {
  oku(g: { npc?: string; hedef?: string; dil: Dil }): Promise<EkSonuc<UcgenGorunumu>>;
  eylem(g: UcgenGovdesi & { istekNo: string }): Promise<EkSonuc<UcgenYaniti>>;
}

const httpUcgen: UcgenIstemci = {
  oku: ({ npc, hedef, dil }) => {
    const q = [`dil=${dil}`, ...(npc ? [`npc=${encodeURIComponent(npc)}`] : []), ...(hedef ? [`hedef=${encodeURIComponent(hedef)}`] : [])].join("&");
    return ekCagir({ yontem: "GET", yol: `/v1/ucgen?${q}`, tekrar: true }, gorunumMu);
  },
  eylem: (g) => ekCagir({ yontem: "POST", yol: "/v1/ucgen", govde: g, tekrar: true }, yanitMi),
};

/** Geliştirici/önizlemede sahte üçgen, yoksa sunucu. */
export function useUcgenIstemci(): UcgenIstemci {
  const o = useOnline();
  const sahte = o.oturum?.tur === "gelistirici";
  const y = o.yerlesim;
  return useMemo(() => {
    if (!sahte) return httpUcgen;
    const adlar = new Map<string, string>();
    for (const m of y?.harita ?? []) for (const k of m.kisiler) adlar.set(k.id, k.ad);
    for (const k of y?.ben.tanidiklar ?? []) adlar.set(k.id, k.ad);
    for (const [id, k] of Object.entries(o.kisiler)) adlar.set(id, k.ad);
    const ben = y?.ben.id ?? "o1";
    if (y) adlar.set(ben, y.ben.ad);
    return sahteUcgenIstemci({ ay: y?.saat.oyunAyi ?? 0, ben, ad: (id) => adlar.get(id) ?? "—", oyuncular: ucgenOyunculari(y) });
  }, [sahte, y, o.kisiler]);
}
