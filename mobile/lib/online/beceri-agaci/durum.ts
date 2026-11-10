// Beceri ağacı ekranının veri kancası: oturum varsa o oturumun istemcisi (sunucu ya da geliştirici sahtesi),
// yoksa (tasarım önizlemesi) yerel sahte istemci. Ekran yalnız niyet gönderir; sonuç ve kilit nedenleri sunucudandır.
// Süre: sunucunun kalanMs'i yanıt anına göre yerel saate çevrilir; bitince ağaç yeniden istenir (sunucu tembel açar).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MeslekId, OnlineHata } from "../protokol";
import { useOnline } from "../durum";
import { istekNoUret } from "../depo";
import { onizlemeMi } from "../kapi";
import { yerelSahteBeceri } from "./sahte-beceri";
import type { BeceriAgaci, BeceriIstemci, MeslekiGecmis } from "./beceri-veri";

export type Sekme = "aktif" | "gecmis" | "tum";

function parametre(ad: string): string | null {
  if (!onizlemeMi()) return null;
  const arama = (globalThis as { location?: { search?: string } }).location?.search ?? "";
  try { return new URLSearchParams(arama).get(ad); } catch { return null; }
}
/** Önizleme sorgusu: osekme=gecmis|tum, odugum=<anahtar ya da kimlik>. */
export const ilkSekme = (): Sekme => { const s = parametre("osekme"); return s === "gecmis" || s === "tum" ? s : "aktif"; };
/** Önizlemede (router taklidi meslek vermez) ?meslek= sorgusu. */
export const onizlemeMeslegi = (): string | null => parametre("meslek");
export const ilkDugum = (m: MeslekId): string | null => { const s = parametre("odugum"); return s ? (s.includes(".") ? s : `${m}.${s}`) : null; };

export type Bildirim = { tur: "bitti"; id: string; seviye: number } | { tur: "kisaldi" } | { tur: "yeniden"; iade: number; bedel: number } | { tur: "hata"; kod: OnlineHata };

export function useBeceri(acik: MeslekId, m: MeslekId) {
  const o = useOnline();
  const k: BeceriIstemci = useMemo(() => (o.oturum ? o.beceriIstemci() : yerelSahteBeceri(acik)), [o.oturum]); // eslint-disable-line react-hooks/exhaustive-deps
  const dakikaMs = k.dakikaMs ?? 60_000;
  const [agac, setAgac] = useState<BeceriAgaci | null>(null);
  const [hata, setHata] = useState<OnlineHata | null>(null);
  const [gecmis, setGecmis] = useState<MeslekiGecmis | null>(null);
  const [mesgul, setMesgul] = useState(false);
  const [bildirim, setBildirim] = useState<Bildirim | null>(null);
  const [simdi, setSimdi] = useState(() => Date.now());
  const yerelBitis = useRef<number | null>(null);
  const meslekRef = useRef(m);
  meslekRef.current = m;

  const yukle = useCallback(async () => {
    const r = await k.agac(meslekRef.current);
    if (r.ok) {
      if (r.deger.meslek !== meslekRef.current) return;
      setAgac(r.deger);
      setHata(null);
      yerelBitis.current = r.deger.ogrenme ? Date.now() + r.deger.ogrenme.kalanMs : null;
      setSimdi(Date.now());
    } else setHata(r.hata);
    const g = await k.gecmis();
    if (g.ok) setGecmis(g.deger);
  }, [k]);

  useEffect(() => { void yukle(); }, [yukle, m]);

  const og = agac?.ogrenme ?? null;
  useEffect(() => {
    if (!og) return;
    const z = setInterval(() => setSimdi(Date.now()), 250);
    return () => clearInterval(z);
  }, [og]);
  useEffect(() => {
    const son = yerelBitis.current;
    if (!og || son === null || simdi < son) return;
    yerelBitis.current = null;
    if (og.tur === "ogrenme" && og.dugum && og.seviye) setBildirim({ tur: "bitti", id: og.dugum, seviye: og.seviye });
    void yukle();
  }, [simdi, og, yukle]);

  /** Kalan süre (dakika, öğrenme ölçeğinde) ve ilerleme oranı. */
  const kalan = useMemo(() => {
    const son = yerelBitis.current;
    if (!og || son === null) return null;
    const toplam = Math.max(1, og.bitis - og.baslangic);
    const kalanMs = Math.max(0, son - simdi);
    return { oran: Math.max(0, Math.min(1, 1 - kalanMs / toplam)), dk: Math.max(1, Math.ceil(kalanMs / dakikaMs)) };
  }, [og, simdi, dakikaMs]);

  async function calistir<T>(is: () => Promise<{ ok: true; deger: T } | { ok: false; hata: OnlineHata }>, sonra?: (d: T) => void) {
    if (mesgul) return;
    setMesgul(true);
    setBildirim(null);
    const r = await is();
    setMesgul(false);
    if (r.ok) sonra?.(r.deger);
    else setBildirim({ tur: "hata", kod: r.hata });
    await yukle();
  }

  return {
    agac, hata, gecmis, mesgul, kalan, bildirim, dakikaMs,
    yenile: yukle,
    temizle: () => setBildirim(null),
    ogren: (dugum: string) => calistir(() => k.ogren({ meslek: m, dugum, istekNo: istekNoUret() })),
    iptal: () => calistir(() => k.iptal({ istekNo: istekNoUret() })),
    kisalt: () => calistir(() => k.hizlandir({ kaynak: "egitim", istekNo: istekNoUret() }), () => setBildirim({ tur: "kisaldi" })),
    yeniden: () => calistir(() => k.yeniden({ meslek: m, istekNo: istekNoUret() }), (d) => setBildirim({ tur: "yeniden", iade: d.iadePuan, bedel: d.bedel.toplam })),
  };
}
