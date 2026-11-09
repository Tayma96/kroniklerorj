// Beceri ağacı örneğinin sahte durumu ve kuralları (istemci tarafında, yalnız görünüm için).
// Gerçekte sonuç sunucudan gelir; burada §3 kuralı taklit edilir: puan verilince öğrenme başlar, aynı anda tek öğrenme,
// süre bitince seviye artar, vazgeçince puan iade edilir. Örnekte 1 gerçek dakika = ORNEK_DK_MS milisaniye.
// Önizleme sorgusu (yalnız tasarım önizlemesinde): oagac=ogren (Metal İşleme öğreniliyor), odugum=<kimlik>, osekme=gecmis|tum.
import { useCallback, useEffect, useMemo, useState } from "react";
import { onizlemeMi } from "../kapi";
import { DEMIRCI_AGACI, KADEME_SIRA, dugumBul, type BeceriDugumu, type KademeAd } from "./demirci-ornek";

export const ORNEK_DK_MS = 400;

export interface Ogrenme { id: string; hedef: number; basla: number; sureMs: number; dk: number }
export interface AgacDurumu {
  kademe: KademeAd;
  puan: number;
  seviye: Record<string, number>;
  /** Görünür olmuş gizli düğümler. */
  acilanGizli: string[];
  ogrenme: Ogrenme | null;
}

export type Engel =
  | { tur: "tam" }
  | { tur: "gizli" }
  | { tur: "suren" }
  | { tur: "kademe"; kademe: KademeAd }
  | { tur: "onKosul" }
  | { tur: "puan"; gerekli: number };

export type DugumHali = "tam" | "ogrenildi" | "ogreniliyor" | "acik" | "kilitli" | "gizli";

export const sev = (d: AgacDurumu, id: string) => d.seviye[id] ?? 0;
const kademeTamam = (d: AgacDurumu, k: KademeAd) => KADEME_SIRA.indexOf(d.kademe) >= KADEME_SIRA.indexOf(k);

export function onKosulTamam(d: AgacDurumu, n: BeceriDugumu): boolean {
  if (!n.onKosul.length) return true;
  const ok = n.onKosul.map((o) => sev(d, o.id) >= o.seviye);
  return n.herhangi ? ok.some(Boolean) : ok.every(Boolean);
}

export const gizliMi = (d: AgacDurumu, n: BeceriDugumu) => !!n.gizli && !d.acilanGizli.includes(n.id);

/** Öğrenmenin önündeki ilk engel; yoksa null. */
export function engel(d: AgacDurumu, n: BeceriDugumu): Engel | null {
  if (sev(d, n.id) >= n.azami) return { tur: "tam" };
  if (gizliMi(d, n)) return { tur: "gizli" };
  if (d.ogrenme) return { tur: "suren" };
  if (!onKosulTamam(d, n)) return { tur: "onKosul" };
  if (!kademeTamam(d, n.kademe)) return { tur: "kademe", kademe: n.kademe };
  if (d.puan < n.bedel) return { tur: "puan", gerekli: n.bedel };
  return null;
}

export function dugumHali(d: AgacDurumu, n: BeceriDugumu): DugumHali {
  if (gizliMi(d, n)) return "gizli";
  if (d.ogrenme?.id === n.id) return "ogreniliyor";
  const s = sev(d, n.id);
  if (s >= n.azami) return "tam";
  if (s > 0) return "ogrenildi";
  return onKosulTamam(d, n) && kademeTamam(d, n.kademe) ? "acik" : "kilitli";
}

export const kademeSartiTamam = kademeTamam;

function parametre(ad: string): string | null {
  if (!onizlemeMi()) return null;
  const arama = (globalThis as { location?: { search?: string } }).location?.search ?? "";
  try { return new URLSearchParams(arama).get(ad); } catch { return null; }
}

function baslangic(simdi: number): AgacDurumu {
  const d: AgacDurumu = { kademe: "kalfa", puan: 12, seviye: { aletcilik: 3, temelDovme: 1, silahDovme: 2 }, acilanGizli: [], ogrenme: null };
  if (parametre("oagac") === "ogren") {
    const n = dugumBul("metalIsleme")!;
    const dk = n.sureDk[0];
    d.puan -= n.bedel;
    d.ogrenme = { id: n.id, hedef: 1, basla: simdi - dk * ORNEK_DK_MS * 0.4, sureMs: dk * ORNEK_DK_MS, dk };
  }
  return d;
}

export type Sekme = "aktif" | "gecmis" | "tum";
export const ilkSekme = (): Sekme => { const s = parametre("osekme"); return s === "gecmis" || s === "tum" ? s : "aktif"; };
export const ilkSecim = (): string => { const s = parametre("odugum"); return s && dugumBul(s) ? s : "silahDovme"; };

/** Sahte ağaç durumu: öğren, vazgeç; süre dolunca seviye artar. `bitti` son biten öğrenmeyi bildirir. */
export function useSahteAgac() {
  const [d, setD] = useState<AgacDurumu>(() => baslangic(Date.now()));
  const [simdi, setSimdi] = useState(() => Date.now());
  const [bitti, setBitti] = useState<{ id: string; seviye: number } | null>(null);

  useEffect(() => {
    if (!d.ogrenme) return;
    const z = setInterval(() => setSimdi(Date.now()), 250);
    return () => clearInterval(z);
  }, [d.ogrenme]);

  useEffect(() => {
    const o = d.ogrenme;
    if (!o || simdi - o.basla < o.sureMs) return;
    setD((x) => (x.ogrenme ? { ...x, seviye: { ...x.seviye, [o.id]: o.hedef }, ogrenme: null } : x));
    setBitti({ id: o.id, seviye: o.hedef });
  }, [simdi, d.ogrenme]);

  const ogren = useCallback((id: string) => {
    setD((x) => {
      const n = dugumBul(id);
      if (!n || engel(x, n)) return x;
      const hedef = sev(x, id) + 1, dk = n.sureDk[hedef - 1] ?? n.sureDk[n.sureDk.length - 1];
      const t = Date.now();
      setSimdi(t);
      return { ...x, puan: x.puan - n.bedel, ogrenme: { id, hedef, basla: t, sureMs: dk * ORNEK_DK_MS, dk } };
    });
    setBitti(null);
  }, []);

  const vazgec = useCallback(() => {
    setD((x) => { const n = x.ogrenme && dugumBul(x.ogrenme.id); return n ? { ...x, puan: x.puan + n.bedel, ogrenme: null } : x; });
  }, []);

  /** Kalan gerçek süre (dakika) ve ilerleme oranı. */
  const kalan = useMemo(() => {
    const o = d.ogrenme;
    if (!o) return null;
    const oran = Math.max(0, Math.min(1, (simdi - o.basla) / o.sureMs));
    return { oran, dk: Math.max(1, Math.ceil(o.dk * (1 - oran))) };
  }, [d.ogrenme, simdi]);

  return { d, ogren, vazgec, kalan, bitti, temizle: () => setBitti(null) };
}

export const ogrenilmisler = (d: AgacDurumu) => DEMIRCI_AGACI.filter((n) => sev(d, n.id) > 0);
