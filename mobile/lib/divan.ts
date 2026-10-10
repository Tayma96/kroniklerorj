// Divan Davası (kronik_divan): oyun dışı, çevrimdışı günlük dava. Tarih tohumu → herkes aynı gün aynı davayı görür.
// Kasaba oyu mizaca göre (TRAITS) deterministik hesaplanır; sunucu, ağ, zamanlayıcı yok. Ödül yalnızca kimliktir (lakap):
// GameState'e dokunmaz — para, güç, itibar, eşya yok. Her dava numarası bir kez hükme bağlanır (çiftlik yok); kaçan dava yok:
// geçmiş numaralar arşivde hükmünü bekler, seri/zincir sayılmaz.
import { TRAITS } from "./world";

export const DIVAN_KEY = "kronik_divan";
export const DIVAN_DAVALAR = [
  "yetim_hizmet", "calinan_ekmek", "tasan_su", "kayip_deve", "yanlis_terazi", "kacak_gelin", "borclu_dul", "kavgaci_ciraklar",
  "sahte_sahit", "komsu_duvari", "hirsiz_cocuk", "vakif_parasi", "hayvan_zarari", "miras_kardes", "eski_suclu", "kiz_okulu",
  "kirik_kopru", "yanlis_hekim", "kuyu_payi", "kumar_borcu", "gurbetci_mektup", "orman_odunu", "bozuk_kumas", "kopek_isirdi",
  "yabanci_tuccar", "cirak_kacti", "ates_yakan", "defin_yeri", "pazar_yeri", "dugun_borcu", "avci_geyik", "tarla_siniri",
] as const;
// Yollar sabit sıradadır: c0 merhamet, c1 adalet, c2 töre.
export type DivanYol = 0 | 1 | 2;
export const DIVAN_YOLLAR: DivanYol[] = [0, 1, 2];
export const DIVAN_LAKAP_ESIK = 20;
export const DIVAN_ARSIV = 14; // ekranda geriye dönük gösterilen dava sayısı
const EPOCH = Date.UTC(2026, 9, 1); // Divan No. 1 = 1 Ekim 2026
const ADIM = 7; // 7, dava sayısıyla aralarında asal: her döngüde her dava bir kez

export interface DivanKayit { v: 1; k: Record<string, DivanYol>; }
export function bosDivan(): DivanKayit { return { v: 1, k: {} }; }
// Bozuk/eski kaydı onar: yalnızca pozitif tamsayı numara → 0|1|2 hükmü kalır.
export function divanGoc(raw: unknown): DivanKayit {
  const d = bosDivan();
  if (!raw || typeof raw !== "object") return d;
  const k = (raw as { k?: unknown }).k;
  if (!k || typeof k !== "object") return d;
  for (const [no, s] of Object.entries(k as Record<string, unknown>)) {
    const n = Number(no);
    if (Number.isInteger(n) && n > 0 && (s === 0 || s === 1 || s === 2)) d.k[String(n)] = s;
  }
  return d;
}

// Yerel takvim gününden dava numarası (saat dilimi kaymasın diye Y/A/G alanlarından UTC'ye kurulur).
export function divanNo(d: Date): number {
  const g = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.max(1, Math.floor((g - EPOCH) / 86400000) + 1);
}
export function divanDavasi(no: number): string {
  const n = DIVAN_DAVALAR.length;
  return DIVAN_DAVALAR[(((no - 1) * ADIM) % n + n) % n];
}

function mulberry(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hashStr(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }

// Mizaç → eğilim (TRAITS sırası world.ts'teki gibi): 0 merhamet, 1 adalet, 2 töre.
const MIZAC_YOL: Record<string, DivanYol> = {
  "neşeli": 0, "cömert": 0, "dertli": 0, "sıcakkanlı": 0, "misafirperver": 0,
  "ciddi": 1, "kurnaz": 1, "mert": 1, "hırslı": 1, "utangaç": 1, "sabırlı": 1,
  "kibirli": 2, "yalnız": 2, "dindar": 2, "unutkan": 2, "aceleci": 2,
};
export function mizacYolu(tr: number): DivanYol { return MIZAC_YOL[TRAITS[tr] as string] ?? 1; }
export const KASABA_NUFUS = 120;

// Kasaba oyu: numaraya göre tohumlanan sentetik kasaba (herkes aynı sonucu görür — paylaşım karşılaştırılabilir).
// Her seçmen mizacının yoluna ~%60, öbürlerine ~%20 eğilir; davanın kendi ağırlığı (0–0.35) eklenir. Tek yol %90'ı geçemez.
export function kasabaOyu(no: number): [number, number, number] {
  const id = divanDavasi(no);
  const r = mulberry(hashStr(id) ^ Math.imul(no, 2654435761));
  const egim = [r() * 0.35, r() * 0.35, r() * 0.35];
  const say = [0, 0, 0];
  for (let i = 0; i < KASABA_NUFUS; i++) {
    const yol = mizacYolu(Math.floor(r() * TRAITS.length));
    const w = [0.2 + egim[0], 0.2 + egim[1], 0.2 + egim[2]]; w[yol] += 0.4;
    const top = w[0] + w[1] + w[2]; let x = r() * top;
    const s = x < w[0] ? 0 : (x -= w[0]) < w[1] ? 1 : 2;
    say[s]++;
  }
  return say as [number, number, number];
}
// Yüzdeler (toplam 100; en büyük kalan yöntemi) — oyuncunun hükmü de bir oy sayılır.
export function oyYuzde(no: number, ben?: DivanYol): [number, number, number] {
  const say = [...kasabaOyu(no)]; if (ben != null) say[ben]++;
  const top = say[0] + say[1] + say[2];
  const ham = say.map((x) => (x * 100) / top); const y = ham.map(Math.floor);
  let kalan = 100 - y[0] - y[1] - y[2];
  const sira = [0, 1, 2].sort((a, b) => (ham[b] - y[b]) - (ham[a] - y[a]));
  for (const i of sira) if (kalan-- > 0) y[i]++;
  return y as [number, number, number];
}

// Hüküm: aynı numara ikinci kez yazılamaz (saf; değişmezse aynı nesne döner).
export function hukumVer(d: DivanKayit, no: number, s: DivanYol): DivanKayit {
  if (!Number.isInteger(no) || no < 1 || d.k[String(no)] != null) return d;
  return { v: 1, k: { ...d.k, [String(no)]: s } };
}
export function yolSayilari(d: DivanKayit): [number, number, number] {
  const c: [number, number, number] = [0, 0, 0]; for (const s of Object.values(d.k)) c[s]++; return c;
}
export function divanLakaplari(d: DivanKayit): DivanYol[] { const c = yolSayilari(d); return DIVAN_YOLLAR.filter((y) => c[y] >= DIVAN_LAKAP_ESIK); }
// Arşiv: bugünden geriye DIVAN_ARSIV numara (Divan No. 1'den öncesi yok).
export function arsivNumaralari(bugun: number): number[] { const a: number[] = []; for (let n = bugun - 1; n >= 1 && a.length < DIVAN_ARSIV; n--) a.push(n); return a; }
