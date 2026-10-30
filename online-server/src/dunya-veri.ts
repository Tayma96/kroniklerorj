// Tek dünya: Anadolu, 7 beylik. Her beylikte 1 şehir, 2-3 kasaba, 4-6 köy. Saf veri.
// İlk 5 beylik tek oyunculudaki adlarla aynıdır; Taşeli ve Çukurova yenidir. Kimlikler ASCII ve eşsizdir.

export type YerlesimTuru = "koy" | "kasaba" | "sehir";

/** [PARAMETRE] Yerleşim türüne göre ev kapasitesi (etkin oyuncu; davette esnek) ve NPC sayısı. */
export const TUR_VARSAYILANLARI: Readonly<Record<YerlesimTuru, { evKapasite: number; npc: number }>> = {
  koy: { evKapasite: 25, npc: 80 },
  kasaba: { evKapasite: 60, npc: 200 },
  sehir: { evKapasite: 150, npc: 400 },
};

export interface Yerlesim {
  readonly id: string;
  readonly ad: string;
  readonly tur: YerlesimTuru;
  readonly beylik: string;
  readonly evKapasite: number;
  readonly npc: number;
}

export interface Beylik {
  readonly id: string;
  readonly ad: string;
  readonly yerlesimler: readonly Yerlesim[];
}

type Ad = readonly [id: string, ad: string];

function beylik(id: string, ad: string, sehir: Ad, kasabalar: readonly Ad[], koyler: readonly Ad[]): Beylik {
  const yap =
    (tur: YerlesimTuru) =>
    ([yid, yad]: Ad): Yerlesim => ({ id: yid, ad: yad, tur, beylik: id, ...TUR_VARSAYILANLARI[tur] });
  return {
    id,
    ad,
    yerlesimler: [yap("sehir")(sehir), ...kasabalar.map(yap("kasaba")), ...koyler.map(yap("koy"))],
  };
}

export const BEYLIKLER: readonly Beylik[] = [
  beylik(
    "demirhan",
    "Demirhan Beyliği",
    ["demirhan", "Demirhan"],
    [["develi", "Develi"], ["karapinar", "Karapınar"]],
    [["yassioren", "Yassıören"], ["kizilca", "Kızılca"], ["camlibel", "Çamlıbel"], ["ortakoy", "Ortaköy"], ["sariyurt", "Sarıyurt"]],
  ),
  beylik(
    "yenisehir",
    "Yenişehir Sancağı",
    ["yenisehir", "Yenişehir"],
    [["konuralp", "Konuralp"], ["akyazi", "Akyazı"], ["tarakli", "Taraklı"]],
    [["sogutlu", "Söğütlü"], ["kavakli", "Kavaklı"], ["yenice", "Yenice"], ["derekoy", "Dereköy"], ["kirazli", "Kirazlı"], ["elmalik", "Elmalık"]],
  ),
  beylik(
    "gumushisar",
    "Gümüşhisar Beyliği",
    ["gumushisar", "Gümüşhisar"],
    [["alasehir", "Alaşehir"], ["esme", "Eşme"]],
    [["bagarasi", "Bağarası"], ["caltili", "Çaltılı"], ["sazkoy", "Sazköy"], ["taslik", "Taşlık"]],
  ),
  beylik(
    "aksehir",
    "Akşehir Sancağı",
    ["aksehir", "Akşehir"],
    [["ilgin", "Ilgın"], ["beysehir", "Beyşehir"], ["egirdir", "Eğirdir"]],
    [["doganhisar", "Doğanhisar"], ["golyaka", "Gölyaka"], ["ciftlik", "Çiftlik"], ["karaagac", "Karaağaç"], ["sultandere", "Sultandere"]],
  ),
  beylik(
    "karahisar",
    "Karahisar Beyliği",
    ["karahisar", "Karahisar"],
    [["honaz", "Honaz"], ["sandikli", "Sandıklı"]],
    [["kayadibi", "Kayadibi"], ["isikli", "Işıklı"], ["pinarbasi", "Pınarbaşı"], ["akoren", "Akören"]],
  ),
  beylik(
    "taseli",
    "Taşeli Beyliği",
    ["taskale", "Taşkale"],
    [["gulnar", "Gülnar"], ["sariveliler", "Sarıveliler"]],
    [["bucakkisla", "Bucakkışla"], ["yellibel", "Yellibel"], ["gokceseki", "Gökçeseki"], ["cukurbag", "Çukurbağ"], ["kozagac", "Kozağaç"]],
  ),
  beylik(
    "cukurova",
    "Çukurova Sancağı",
    ["misis", "Misis"],
    [["kozan", "Kozan"], ["ceyhan", "Ceyhan"], ["yumurtalik", "Yumurtalık"]],
    [["saricam", "Sarıçam"], ["incirlik", "İncirlik"], ["karatas", "Karataş"], ["tuzla", "Tuzla"], ["akdam", "Akdam"]],
  ),
];

export const YERLESIMLER: readonly Yerlesim[] = BEYLIKLER.flatMap((b) => b.yerlesimler);

const DIZIN = new Map(YERLESIMLER.map((y) => [y.id, y] as const));

export function yerlesimBul(id: string): Yerlesim | undefined {
  return DIZIN.get(id);
}
