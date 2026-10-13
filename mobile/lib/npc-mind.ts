import { aniBakisi, bakisDegistir, type BakisDefteri } from "./npc-bakis";
import { izlenimTabani, izlenimBirlestir, type IzlenimDefteri } from "./npc-izlenim";

// NPC Zihni — Vercel npc_mind.py portu (S2): yapısal anı, decay, ilişki=taban+Σanı,
// davranış kademeleri, dedikodu kaynağı, nam türetme. Saf modül (game.ts'e bağımsız).

export interface Memory {
  tur: string;        // anı türü (MEMORY_TYPES anahtarı)
  hafta: number;      // eklendiği tur
  yuk: number;        // duygu yükü (decay ile söner)
  unutma: number;     // unutma hızı (her tur yuk *= unutma)
  travma: boolean;    // travma → asla silinmez, yuk sabit
  taniklar: string[]; // tanık NPC id'leri (dedikodu için)
  yayildi: boolean;   // dedikoduya dönüştü mü
  kaynak?: string;    // anı sahibinin adı (dedikodu kaynağı, anlık)
  kimlik?: string; sahip?: string; konu?: string; olay?: string;
  kanit?: "katilim" | "gorgu" | "duyum" | "eski";
  kesinlik?: number; kaynakZinciri?: string[]; sonAnilma?: number;
  izYuku?: number; // ayrıntı sönerken kalan, helallikle de hafifleyen yük
}

// Dedikoduya dönüşebilen anı türleri için söylenti varyant sayısı (rumor.<tur>.<i> anahtarları).
export const RUMOR_VARIANTS: Record<string, number> = {
  kara_cal: 2, hakaret: 2, tehdit: 2, saldiri: 2, kacirma: 1, hirsizlik_tanigi: 1, suc_tanigi: 1,
  dolandiricilik: 2, somuru: 2, iftira: 2, alay: 2, yakinima_zarar: 2, flort_tanigi: 2,
  reddedilme: 2, comert_hediye: 2, sadaka: 2, yardim: 2, borc_kurtarma: 2,
  hayat_kurtarma: 2, savunma: 2, ibadet_tanigi: 2, ihanet: 1, yuz_cevirme: 2, miras_kavgasi: 2, soyulma: 2, ucret_odenmedi: 1, angarya: 1, vergi_zulmu: 1,
  kan: 2, can_bagisi: 2,
};

export interface MemSpec { yuk: number; unutma: number; skandal: number; nam: string | null; travma?: boolean; }

// 34 anı türü — (yuk, unutma, skandal, nam, travma). Vercel MEMORY_TYPES birebir.
export const MEMORY_TYPES: Record<string, MemSpec> = {
  // olumlu
  iltifat:        { yuk:  +4, unutma: 0.94, skandal: 0.0, nam: null },
  guzel_sohbet:   { yuk:  +3, unutma: 0.94, skandal: 0.0, nam: null },
  icten_sohbet:   { yuk:  +6, unutma: 0.96, skandal: 0.0, nam: null },
  hediye:         { yuk:  +8, unutma: 0.96, skandal: 0.0, nam: "comert" },
  comert_hediye:  { yuk: +15, unutma: 0.98, skandal: 0.2, nam: "comert" },
  sadaka:         { yuk: +10, unutma: 0.97, skandal: 0.2, nam: "comert" },
  yardim:         { yuk: +20, unutma: 0.995, skandal: 0.3, nam: "comert" },
  borc_kurtarma:  { yuk: +25, unutma: 0.997, skandal: 0.4, nam: "comert" },
  hayat_kurtarma: { yuk: +40, unutma: 1.0,  skandal: 0.6, nam: "mert", travma: true },
  savunma:        { yuk: +15, unutma: 0.99, skandal: 0.4, nam: "mert" },
  sir_saklama:    { yuk: +12, unutma: 0.99, skandal: 0.0, nam: "mert" },
  soz_tutma:      { yuk:  +8, unutma: 0.97, skandal: 0.0, nam: "mert" },
  dugun:          { yuk: +20, unutma: 0.995, skandal: 0.2, nam: null },
  ibadet_tanigi:  { yuk:  +3, unutma: 0.95, skandal: 0.2, nam: "dindar" },
  ortak_kazanc:   { yuk:  +7, unutma: 0.96, skandal: 0.0, nam: null },
  ise_alinma:     { yuk:  +6, unutma: 0.96, skandal: 0.0, nam: null },    // mülkünde işe aldı (ekmeğine kapı açtı)
  // olumsuz
  rahatsizlik:    { yuk:  -3, unutma: 0.93, skandal: 0.0, nam: null },
  tatsiz_konu:    { yuk:  -4, unutma: 0.94, skandal: 0.0, nam: null },
  haddini_asma:   { yuk:  -6, unutma: 0.95, skandal: 0.1, nam: null },
  bluf:           { yuk:  -4, unutma: 0.94, skandal: 0.1, nam: null },
  alay:           { yuk:  -8, unutma: 0.96, skandal: 0.2, nam: "zalim" },
  hakaret:        { yuk: -15, unutma: 0.98, skandal: 0.5, nam: "zalim" },
  tehdit:         { yuk: -20, unutma: 0.985, skandal: 0.6, nam: "zalim" },
  iftira:         { yuk: -12, unutma: 0.97, skandal: 0.4, nam: "zalim" },
  somuru:         { yuk: -15, unutma: 0.98, skandal: 0.3, nam: "zalim" },
  dolandiricilik: { yuk: -22, unutma: 0.985, skandal: 0.6, nam: "zalim" },
  hirsizlik_tanigi:{ yuk: -18, unutma: 0.98, skandal: 0.7, nam: "zalim" },
  suc_tanigi:     { yuk: -15, unutma: 0.98, skandal: 0.8, nam: "zalim" },
  saldiri:        { yuk: -35, unutma: 1.0,  skandal: 0.9, nam: "zalim", travma: true },
  kacirma:        { yuk: -50, unutma: 1.0,  skandal: 1.0, nam: "zalim", travma: true },
  yakinima_zarar: { yuk: -30, unutma: 1.0,  skandal: 0.6, nam: "zalim", travma: true },
  ihanet:         { yuk: -30, unutma: 1.0,  skandal: 0.5, nam: null,    travma: true },
  flort_tanigi:   { yuk:  -1, unutma: 0.96, skandal: 0.4, nam: "capkin" },
  reddedilme:     { yuk:  -2, unutma: 0.95, skandal: 0.3, nam: "capkin" },
  yuz_cevirme:    { yuk: -14, unutma: 0.99, skandal: 0.3, nam: null }, // darda kalan kardeşi kapıdan çevirmek
  miras_kavgasi:  { yuk: -16, unutma: 0.99, skandal: 0.4, nam: null }, // mirasta kardeş payını vermemek
  soyulma:        { yuk: -25, unutma: 0.99, skandal: 0.6, nam: "zalim" }, // malını çalanı tanıdı
  kovulma:        { yuk: -12, unutma: 0.97, skandal: 0.0, nam: null },    // işinden kovuldu
  ucret_odenmedi: { yuk: -8,  unutma: 0.96, skandal: 0.3, nam: null },    // emeğinin karşılığını alamadı
  angarya:        { yuk: -10, unutma: 0.98, skandal: 0.3, nam: "zalim" }, // valinin angaryasına koşuldu
  vergi_affi:     { yuk: +6,  unutma: 0.97, skandal: 0.0, nam: "comert" },// vergisi bağışlandı
  adalet:         { yuk: +5,  unutma: 0.97, skandal: 0.0, nam: null },    // fermanla hakkına kavuştu
  pazar_serbest:  { yuk: +5,  unutma: 0.96, skandal: 0.0, nam: null },    // pazar serbestisiyle kazandı
  vergi_zulmu:    { yuk: -10, unutma: 0.98, skandal: 0.3, nam: "zalim" }, // ağır vergiyle ocağı söndü
  vergi_hafif:    { yuk: +5,  unutma: 0.96, skandal: 0.0, nam: null },    // hafif vergiye dua etti
  ikilem_iyi:     { yuk: +8,  unutma: 0.98, skandal: 0.0, nam: null },    // zor bir anında insanlık gördü
  ikilem_kotu:    { yuk: -8,  unutma: 0.98, skandal: 0.0, nam: null },    // zor bir anında yüz çevrildi
  helallik:       { yuk: +6,  unutma: 0.98, skandal: 0.0, nam: null },    // helallik verdi (kırgınlık soldu)
  kan:            { yuk: -60, unutma: 1.0,  skandal: 1.0, nam: "zalim", travma: true }, // yakınının canını aldı
  can_bagisi:     { yuk: +30, unutma: 1.0,  skandal: 0.6, nam: "mert",  travma: true }, // yere serdiği hâlde canını bağışladı
  yuz_karasi:     { yuk: -25, unutma: 0.995, skandal: 0.5, nam: null },   // bağışlandı ama yenilgiyi yüz karası saydı
  diyet:          { yuk: +12, unutma: 0.99, skandal: 0.3, nam: null },    // kan bedelini ödedi, dava kapandı
  barisma:        { yuk: +12, unutma: 0.99, skandal: 0.3, nam: "mert" },  // amansız hasımken barıştı
  kefalet:        { yuk: +10, unutma: 0.99, skandal: 0.0, nam: "comert" }, // borcuna kefil oldu
  hakem_lehte:    { yuk: +12, unutma: 0.99, skandal: 0.3, nam: null },    // hakemlikte benden yana karar verdi
  hakem_aleyhte:  { yuk: -12, unutma: 0.99, skandal: 0.3, nam: null },    // hakemlikte aleyhime karar verdi
};

export const NAM_TRAITS = ["comert", "zalim", "capkin", "dindar", "mert"];

// Aynı açık sahnenin şahitleri tek haber çıkarır. Eski, ortak sahnesiz anılar ayrı kalır.
export function groupWitnessMemories(entries: { id: string; memory: Memory }[]): { id: string; memory: Memory }[][] {
  const groups = new Map<string, { id: string; memory: Memory }[]>();
  entries.forEach((entry, i) => {
    const m = entry.memory; const key = m.olay && m.taniklar?.length ? "event:" + m.olay : "old:" + i;
    const group = groups.get(key); if (group) group.push(entry); else groups.set(key, [entry]);
  });
  return [...groups.values()];
}

// Yapısal anı ekle. 24 ayrıntı tavanı; budanan anının izlenimi ayrı, sınırlı özette kalır.
export interface MemoryOptions {
  yuk?: number; taniklar?: string[]; kaynak?: string; huy?: string;
  bakis?: BakisDefteri; izlenim?: IzlenimDefteri;
  kimlik?: string; sahip?: string; konu?: string; olay?: string;
  kanit?: Memory["kanit"]; kesinlik?: number; kaynakZinciri?: string[];
}
// Aynı olay kişiliğe göre başka ağırlık taşır; açık yükü veren eski çağrılar da bu cepheden geçer.
export function personalityWeight(tur: string, huy?: string): number {
  if (!huy) return 1;
  const iyi = (MEMORY_TYPES[tur]?.yuk || 0) > 0;
  if (huy === "unutkan") return 0.75;
  if (iyi) {
    if (["cömert", "misafirperver", "sıcakkanlı", "neşeli"].includes(huy)) return 1.25;
    if (["kurnaz", "hırslı", "kibirli"].includes(huy)) return 0.65;
    if (["dindar", "mert", "ciddi"].includes(huy)) return 1.1;
    return 1;
  }
  if (["hakaret", "alay", "haddini_asma"].includes(tur)) return huy === "kibirli" ? 1.4 : huy === "neşeli" ? 0.85 : 1;
  if (["ihanet", "somuru", "dolandiricilik", "ucret_odenmedi"].includes(tur)) return ["dindar", "mert", "ciddi"].includes(huy) ? 1.3 : 1;
  if (["hirsizlik_tanigi", "suc_tanigi"].includes(tur)) return ["dindar", "mert", "ciddi"].includes(huy) ? 1.3 : ["kurnaz", "hırslı", "kibirli"].includes(huy) ? .7 : ["cömert", "sıcakkanlı", "misafirperver"].includes(huy) ? 1.1 : 1;
  if (["saldiri", "tehdit", "kacirma", "kan", "yakinima_zarar"].includes(tur)) return ["utangaç", "dertli", "yalnız", "sabırlı"].includes(huy) ? 1.3 : ["dindar", "mert", "ciddi"].includes(huy) ? 1.15 : 1;
  return 1;
}
export function addMemory(anilar: Memory[], tur: string, hafta: number, opts?: MemoryOptions): Memory | null {
  const spec = MEMORY_TYPES[tur];
  if (!spec) return null;
  const rawLoad = Number.isFinite(opts?.yuk) ? opts!.yuk! : spec.yuk;
  const m: Memory = {
    tur,
    hafta: Math.floor(hafta),
    yuk: opts?.huy ? Math.round(rawLoad * personalityWeight(tur, opts.huy) * 1000) / 1000 : rawLoad,
    unutma: spec.travma ? 1.0 : spec.unutma,
    travma: !!spec.travma,
    taniklar: opts?.taniklar ? [...opts.taniklar] : [],
    yayildi: false,
    kaynak: opts?.kaynak,
  };
  if (opts?.kimlik) m.kimlik = opts.kimlik;
  if (opts?.sahip) m.sahip = opts.sahip;
  if (opts?.konu) m.konu = opts.konu;
  if (opts?.olay) m.olay = opts.olay;
  if (opts?.kanit) { m.kanit = opts.kanit; m.kesinlik = Number.isFinite(opts.kesinlik) ? Math.max(0, Math.min(1, opts.kesinlik!)) : opts.kanit === "duyum" ? 0.6 : opts.kanit === "eski" ? 0.4 : 1; }
  if (opts?.kaynakZinciri) m.kaynakZinciri = [...opts.kaynakZinciri].slice(-4);
  if (opts?.izlenim) m.izYuku = izlenimTabani(m);
  anilar.push(m);
  if (opts?.bakis) bakisDegistir(opts.bakis, undefined, aniBakisi(m));
  if (anilar.length > 24) {
    const zayif = anilar.filter((x) => !x.travma).sort((a, b) => Math.abs(a.yuk) - Math.abs(b.yuk));
    const removed = zayif.length ? anilar.splice(anilar.indexOf(zayif[0]), 1)[0] : anilar.shift();
    if (removed) {
      if (opts?.bakis) bakisDegistir(opts.bakis, aniBakisi(removed));
      if (opts?.izlenim) {
        const delta = izlenimBirlestir(opts.izlenim, removed);
        if (opts.bakis && delta.after) bakisDegistir(opts.bakis, delta.before ? aniBakisi(delta.before) : undefined, aniBakisi(delta.after));
      }
    }
  }
  return m;
}

// Son küçük sohbet ağır bir geçmişi örtemez. Otomatik gönderme aynı ayda aynı anıyı tekrarlamaz.
export function representativeMemory(anilar: Memory[] | undefined, tur: string): Memory | undefined {
  let best: Memory | undefined;
  for (const m of anilar || []) if (m.tur === tur && Number.isFinite(m.yuk) && (!best || Math.abs(m.yuk) > Math.abs(best.yuk) || (Math.abs(m.yuk) === Math.abs(best.yuk) && m.hafta > best.hafta))) best = m;
  return best;
}

export function salientMemory(anilar: Memory[] | undefined, turn: number, allowMentioned = false): Memory | null {
  let best: Memory | null = null, score = -1;
  for (const m of anilar || []) {
    if (!m || !Number.isFinite(m.yuk) || !Number.isFinite(m.hafta) || m.hafta > turn || Math.abs(m.yuk) < 3 || (!allowMentioned && m.sonAnilma === turn)) continue;
    const value = Math.abs(m.yuk) * (m.travma ? 1.25 : 1) / (m.travma ? 1 : 1 + Math.max(0, turn - m.hafta) / 120);
    if (value > score || (value === score && m.hafta > (best?.hafta ?? -1))) { best = m; score = value; }
  }
  return best;
}

// Ayrıntının yükü iz tabanına kadar söner; aynı yük iki listede birden tutulmaz.
export function decayMemories(anilar: Memory[], bakis?: BakisDefteri, izlenim?: IzlenimDefteri): Memory[] {
  const keep: Memory[] = [];
  for (const m of anilar) {
    const before = bakis ? aniBakisi(m) : undefined;
    if (izlenim && !Number.isFinite(m.izYuku)) m.izYuku = izlenimTabani(m);
    const floor = izlenim ? Math.abs(izlenimTabani(m)) : 0;
    m.yuk = Math.sign(m.yuk) * Math.max(floor, Math.round(Math.abs(m.yuk) * (m.unutma ?? .95) * 1000) / 1000);
    const retained = m.travma || Math.abs(m.yuk) >= 1 && (!izlenim || Math.abs(m.yuk) > floor);
    if (retained) keep.push(m);
    if (bakis) bakisDegistir(bakis, before, retained ? aniBakisi(m) : undefined);
    if (!retained && izlenim) {
      const delta = izlenimBirlestir(izlenim, m);
      if (bakis && delta.after) bakisDegistir(bakis, delta.before ? aniBakisi(delta.before) : undefined, aniBakisi(delta.after));
    }
  }
  return keep;
}

export function memorySum(anilar: Memory[] | undefined): number {
  if (!anilar || !anilar.length) return 0;
  return Math.round(anilar.reduce((a, m) => a + m.yuk, 0));
}

// GDD: ilişki_skoru = taban + Σ(aktif anıların duygu yükü).
export function effectiveRel(base: number, anilar: Memory[] | undefined): number {
  return Math.max(-100, Math.min(100, base + memorySum(anilar)));
}

// En ağır n anının türü + yönü (sohbet/NPC ekranı "seni hatırlıyor" yüzeyi).
export function topMemories(anilar: Memory[] | undefined, n = 2): { tur: string; yon: number; travma: boolean }[] {
  if (!anilar) return [];
  const mems = anilar.filter((m) => Math.abs(m.yuk) >= 3).sort((a, b) => Math.abs(b.yuk) - Math.abs(a.yuk));
  return mems.slice(0, n).map((m) => ({ tur: m.tur, yon: m.yuk > 0 ? 1 : -1, travma: m.travma }));
}

// Davranış kademeleri — Vercel TIERS birebir (selam, ticaret çarpanı, bilgi paylaşımı).
export interface Tier { key: string; selam: boolean; al_carpan: number; bilgi: boolean; }
export const TIERS: { lo: number; hi: number; t: Tier }[] = [
  { lo: -101, hi: -40, t: { key: "aktif_dusman", selam: false, al_carpan: 1.20, bilgi: false } },
  { lo: -40, hi: -20, t: { key: "soguk", selam: true, al_carpan: 1.08, bilgi: false } },
  { lo: -20, hi: 20, t: { key: "notr", selam: true, al_carpan: 1.0, bilgi: true } },
  { lo: 20, hi: 50, t: { key: "dost", selam: true, al_carpan: 0.95, bilgi: true } },
  { lo: 50, hi: 101, t: { key: "sadik", selam: true, al_carpan: 0.90, bilgi: true } },
];

export function behaviorTier(score: number): Tier {
  for (const { lo, hi, t } of TIERS) if (score >= lo && score < hi) return t;
  return TIERS[2].t;
}

// Nam profili: tüm NPC anıları (son 24 ay) → nam sayaçları. Söylentiler de büyütür.
export function computeNamFromMemories(allAnilar: Memory[][], turn: number, rumors?: { nam?: string | null; siddet?: number }[]): Record<string, number> {
  const nam: Record<string, number> = { comert: 0, zalim: 0, capkin: 0, dindar: 0, mert: 0 };
  for (const anilar of allAnilar) {
    for (const m of anilar) {
      if (turn - m.hafta > 24) continue;
      const trait = MEMORY_TYPES[m.tur]?.nam;
      if (trait) nam[trait] += Math.min(3, 1 + Math.floor(Math.abs(m.yuk)) / 12 | 0);
    }
  }
  if (rumors) for (const r of rumors) if (r.nam && nam[r.nam] != null) nam[r.nam] += Math.round(r.siddet ?? 1) * 2;
  return nam;
}

export function dominantNam(nam: Record<string, number>): string | null {
  const sirali = Object.entries(nam).sort((a, b) => b[1] - a[1]);
  if (!sirali.length) return null;
  const [top, second] = [sirali[0], sirali[1] || ["", 0]];
  if (top[1] >= 8 && top[1] >= (second[1] as number) * 1.3) return top[0];
  return null;
}
