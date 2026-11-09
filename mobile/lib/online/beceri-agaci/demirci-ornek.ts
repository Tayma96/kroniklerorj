// Beceri ağacı v2 örneği — yalnız Demircilik (docs/superpowers/specs/2026-11-09-beceri-agaci-v2-design.md §2, §3, §8).
// Sahte veri: sunucu sözleşmesi değildir, Berkay onaylayınca protokole taşınır. Bedel ve süreler [PARAMETRE].
// Metin anahtarları: onl.ba.d.<id> ad, onl.ba.d.<id>.a açıklama, onl.ba.d.<id>.<seviye> o seviyenin etkisi.

export type KademeAd = "cirak" | "kalfa" | "usta" | "pir";
export const KADEME_SIRA: readonly KademeAd[] = ["cirak", "kalfa", "usta", "pir"];

export interface OnKosul { id: string; seviye: number }
export interface BeceriDugumu {
  id: string;
  /** Ağaçtaki sıra: 0 çırak, 1 kalfa, 2 kalfa ikinci sıra, 3 usta, 4 pir, 5 gizli. */
  sira: number;
  sutun: 0 | 1 | 2;
  kademe: KademeAd;
  ikon: string;
  azami: number;
  /** Seviye başına puan bedeli. */
  bedel: number;
  /** Seviye seviye gerçek öğrenme süresi (dakika). */
  sureDk: number[];
  onKosul: OnKosul[];
  /** true: ön koşullardan biri yeter (Pir: herhangi bir usta düğümü 2/2). */
  herhangi?: boolean;
  gizli?: boolean;
  vurgu?: "kizil" | "altin";
}

const CIRAK_SURE = [15, 30, 45], KALFA_SURE = [60, 90, 120], KALFA2_SURE = [150, 180], USTA_SURE = [300, 360];

export const DEMIRCI_AGACI: readonly BeceriDugumu[] = [
  { id: "aletcilik", sira: 0, sutun: 0, kademe: "cirak", ikon: "cekic", azami: 3, bedel: 1, sureDk: CIRAK_SURE, onKosul: [] },
  { id: "temelDovme", sira: 0, sutun: 1, kademe: "cirak", ikon: "bicak", azami: 3, bedel: 1, sureDk: CIRAK_SURE, onKosul: [] },
  { id: "metalIsleme", sira: 0, sutun: 2, kademe: "cirak", ikon: "ors", azami: 3, bedel: 1, sureDk: CIRAK_SURE, onKosul: [] },
  { id: "tarimAletleri", sira: 1, sutun: 0, kademe: "kalfa", ikon: "orak", azami: 3, bedel: 2, sureDk: KALFA_SURE, onKosul: [{ id: "aletcilik", seviye: 3 }] },
  { id: "silahDovme", sira: 1, sutun: 1, kademe: "kalfa", ikon: "caprazKilic", azami: 3, bedel: 2, sureDk: KALFA_SURE, onKosul: [{ id: "aletcilik", seviye: 3 }, { id: "temelDovme", seviye: 1 }] },
  { id: "zirhYapimi", sira: 1, sutun: 2, kademe: "kalfa", ikon: "migfer", azami: 3, bedel: 2, sureDk: KALFA_SURE, onKosul: [{ id: "metalIsleme", seviye: 3 }] },
  { id: "gelismisAletler", sira: 2, sutun: 0, kademe: "kalfa", ikon: "disliler", azami: 2, bedel: 3, sureDk: KALFA2_SURE, onKosul: [{ id: "tarimAletleri", seviye: 3 }] },
  { id: "silahUstaligi", sira: 2, sutun: 1, kademe: "kalfa", ikon: "kilic", azami: 2, bedel: 3, sureDk: KALFA2_SURE, onKosul: [{ id: "silahDovme", seviye: 3 }] },
  { id: "zirhUstaligi", sira: 2, sutun: 2, kademe: "kalfa", ikon: "gogusluk", azami: 2, bedel: 3, sureDk: KALFA2_SURE, onKosul: [{ id: "zirhYapimi", seviye: 3 }] },
  { id: "mekanizma", sira: 3, sutun: 0, kademe: "usta", ikon: "mekanizma", azami: 2, bedel: 5, sureDk: USTA_SURE, onKosul: [{ id: "gelismisAletler", seviye: 2 }] },
  { id: "efsaneviSilahlar", sira: 3, sutun: 1, kademe: "usta", ikon: "alevKilic", azami: 2, bedel: 5, sureDk: USTA_SURE, onKosul: [{ id: "silahUstaligi", seviye: 2 }], vurgu: "kizil" },
  { id: "ozelZirhlar", sira: 3, sutun: 2, kademe: "usta", ikon: "sovalye", azami: 2, bedel: 5, sureDk: USTA_SURE, onKosul: [{ id: "zirhUstaligi", seviye: 2 }] },
  { id: "saheser", sira: 4, sutun: 1, kademe: "pir", ikon: "saheser", azami: 1, bedel: 7, sureDk: [720], onKosul: [{ id: "mekanizma", seviye: 2 }, { id: "efsaneviSilahlar", seviye: 2 }, { id: "ozelZirhlar", seviye: 2 }], herhangi: true, vurgu: "altin" },
  { id: "efsaneviCelik", sira: 5, sutun: 1, kademe: "usta", ikon: "kilic", azami: 1, bedel: 7, sureDk: [720], onKosul: [], gizli: true },
];

export const PUAN_TAVANI = 40;
export const AGAC_TOPLAM = DEMIRCI_AGACI.filter((d) => !d.gizli).reduce((t, d) => t + d.bedel * d.azami, 0); // ≈ 82
export const dugumBul = (id: string) => DEMIRCI_AGACI.find((d) => d.id === id);
