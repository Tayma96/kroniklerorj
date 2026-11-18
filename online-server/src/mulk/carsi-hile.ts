// Kanca partisi 2 (hak l–r): çarşıda ün. Saf ve deterministik; dükkân dönümü (tezgah-donum.ts) ve raf uçları
// (tezgah-uclar.ts) buradan okur.
//
// - `hak:hileliTarti` (tüccar, pazar kethüdalığı 2): dükkânın yöneticisi tartıyı hileli kurar. Ay dönümünde NPC'ye
//   satılan toplam adedin HILELI_TARTI_YUZDE'si (aşağı yuvarlanır, en çok HILELI_TARTI_ADET_EN_COK) raftan düşmez:
//   alıcı eksik tartılmış malın parasını öder. Akçe basılmaz: hasılat aynı NPC bütçesinden ve dükkân tavanı içinde;
//   yalnız rafta mal kalır (bir sonraki ayın stoğu). Her ay sunucuda sırlı zarla (zar-sirri.ts) yakalanma denenir;
//   yakalanırsa o ay kazanç yok, tartı kapanır, dükkân LEKE_SURE_AY dönüm boyunca LEKE_ITIBAR düşük itibarla satar
//   (R çarpanı) ve tartıyı kuranın mertlik namı düşer. Akçe cezası yok.
// - `hak:lekeliSatici` (divan, çarşı denetimi 3): yerleşimde bu hakkı bilen yaşayan bir sakin varsa yakalanma
//   olasılığı HILELI_TARTI_YAKALANMA_DENETCI olur (çarşı denetçisi lekeli satıcının peşindedir).
// - `hak:namYayma` (ozan, kahramanlık türküsü 3): ozan BAŞKA bir dükkânı över; o ay dükkânın H kanalına ozanın
//   katkısı NAM_YAYMA_H girer. Tek yığılma kuralına uyar: ozan dükkânın bir kişisi gibi sayılır, kanalın değeri sahip,
//   çalışanlar ve ozan arasından EN YÜKSEK katkıdır, tavanla kırpılır (toplanmaz). Kendi/çalıştığı dükkânı, aynı
//   kümeden dükkânı övemez; ozana akçe, nam, XP gelmez (farm yok); ozan ayda NAM_YAYMA_AYLIK, dükkân ayda bir övgü.
// - `hak:ovguTaslama` (ozan, ozan postu 2): övgüyü güçlendirir (+OVGU_TASLAMA_EK, aynı katkının kalemi).

import type { Nam } from "../yerlesim/karakter.ts";
import { namDus } from "../yerlesim/bilgi.ts";
import { hakAcik } from "../yerlesim/beceri-etki.ts";
import { olduMu } from "../yerlesim/hanedan.ts";
import { sirliZar, zarHazir } from "../yerlesim/zar-sirri.ts";
import type { Karakter, Kasaba } from "../yerlesim/tipler.ts";
import type { Tezgah } from "./depo.ts";
import { kancaKisileri, type KancaKalemi, type KancaSonucu } from "./kanca.ts";
import type { MulkDefteri } from "./tapu.ts";
import { KANCA_TAVAN } from "./tezgah-kurallar.ts";

/** [PARAMETRE] Hileli tartıda raftan düşmeyen pay: NPC'ye satılan toplam adedin yüzdesi (aşağı yuvarlanır). */
export const HILELI_TARTI_YUZDE = 15;
/** [PARAMETRE] Hileli tartının bir dükkânda bir ayda raftan düşürmediği en çok adet. */
export const HILELI_TARTI_ADET_EN_COK = 2;
/** [PARAMETRE] Aylık yakalanma olasılığı (yüzde); yerleşimde `lekeliSatici` bilen yaşayan sakin varsa ikincisi. */
export const HILELI_TARTI_YAKALANMA = 25;
export const HILELI_TARTI_YAKALANMA_DENETCI = 50;
/** [PARAMETRE] Yakalanan dükkânın itibar düşüşü (R çarpanında) ve süresi (dönüm sayısı). */
export const LEKE_ITIBAR = 20;
export const LEKE_SURE_AY = 3;
/** [PARAMETRE] Yakalanınca tartıyı kuranın mertlik namından düşen. */
export const HILE_NAM_KAYBI = 5;
/** Ün kaybının namı. */
export const HILE_NAM: Nam = "mertlik";

/** [PARAMETRE] Ozanın övgüsünün dükkân H katkısı (yüzde puan) ve `ovguTaslama` eki. */
export const NAM_YAYMA_H = 5;
export const OVGU_TASLAMA_EK = 3;
/** [PARAMETRE] Övgünün takati ve ozan başına aylık sayısı. */
export const NAM_YAYMA_TAKAT = 1;
export const NAM_YAYMA_AYLIK = 1;

/** Kişi kuralına göre işletmenin yaşayan, yüklü kanca kişileri (sahip + kuralı dolduran çalışanlar). */
function kisiler(k: Kasaba, md: MulkDefteri, isletme: string, ay: number): Karakter[] {
  return kancaKisileri(md.t, isletme, ay).flatMap((o) => {
    const c = k.kar.get(o);
    return c && !olduMu(c) && !c.gc ? [c] : [];
  });
}

// ── Hileli tartı ve leke ──

/** `donumAyi` dönümünde dükkân lekeli mi (yakalanmadan sonraki LEKE_SURE_AY dönüm). Önizleme `k.ay + 1` verir. */
export function lekeliMi(t: Pick<Tezgah, "lk"> | undefined, donumAyi: number): boolean {
  const lk = t?.lk;
  return Number.isInteger(lk) && donumAyi <= lk! && donumAyi > lk! - LEKE_SURE_AY;
}

/** NPC talebinin gördüğü itibar: lekeli dükkânda LEKE_ITIBAR düşük (0'ın altına inmez). */
export function dukkanItibari(it: number, t: Pick<Tezgah, "lk"> | undefined, donumAyi: number): number {
  return lekeliMi(t, donumAyi) ? Math.max(0, it - LEKE_ITIBAR) : it;
}

/** Tartıyı hileli kurmaya hakkı olan: dükkânın kanca kişilerinden biri `hak:hileliTarti` bilir. */
export function hileHakki(k: Kasaba, md: MulkDefteri, isletme: string, ay = k.ay): boolean {
  return kisiler(k, md, isletme, ay).some((c) => hakAcik(c, "hileliTarti"));
}

/** Yerleşimde `hak:lekeliSatici` bilen yaşayan sakin var mı (ay dönümünde bütün sakinler yüklüdür). */
export function denetciVar(k: Kasaba): boolean {
  return k.sakin.some((s) => {
    const c = k.kar.get(s.o);
    return !!c && !olduMu(c) && !c.gc && hakAcik(c, "lekeliSatici");
  });
}

/** Ayın yakalanma zarı (sırlı, deterministik): [0, 100). */
export function hileZari(yerlesim: string, isletme: string, ay: number): number {
  return sirliZar("hileliTarti", yerlesim, isletme, ay)() * 100;
}

export interface HileSonucu {
  /** Yakalanma olasılığı (yüzde) ve sonucu. */
  yakalanmaYuzde: number;
  yakalandi: boolean;
  /** Raftan düşmeyen adet (yakalanınca 0). */
  kazanc: number;
  /** Yakalanınca: leke bitiş dönümü ve düşen nam. */
  lekeBitis?: number;
  nam?: number;
}

/**
 * Dönüm adımı (biten ay `ay − 1`): tartı hileli kurulu ve hakkı bitmiş ayın gözüyle hâlâ varsa zar atılır. Yakalanırsa
 * leke yazılır, tartı kapanır, kuranın namı düşer; yakalanmazsa raftan düşmeyecek adet döner. Kurulu değilse undefined.
 */
export function hileDonumu(k: Kasaba, md: MulkDefteri, isletme: string, t: Tezgah, ay: number, satilanAdet: number): HileSonucu | undefined {
  if (!t.ht) return undefined;
  // Kuran hâlâ sahip ya da çalışan değilse (devir, istifa) ya da hak kalmadıysa tartı kendiliğinden kapanır.
  const tapu = md.t[isletme];
  const kuranYerinde = !!tapu && (tapu.s === t.ht || !!tapu.y?.py?.some(([o]) => o === t.ht));
  if (!kuranYerinde || !hileHakki(k, md, isletme, ay - 1)) {
    delete t.ht;
    return undefined;
  }
  const yakalanmaYuzde = denetciVar(k) ? HILELI_TARTI_YAKALANMA_DENETCI : HILELI_TARTI_YAKALANMA;
  // Zar sırrı yoksa (S1) hile değerlendirilemez: kazanç da yakalanma da yok (dönüm düşmez).
  if (satilanAdet <= 0 || !zarHazir()) return { yakalanmaYuzde, yakalandi: false, kazanc: 0 };
  if (hileZari(k.y, isletme, ay) < yakalanmaYuzde) {
    const kuran = k.kar.get(t.ht);
    const nam = kuran ? namDus(kuran, HILE_NAM, HILE_NAM_KAYBI) : 0;
    t.lk = ay + LEKE_SURE_AY;
    delete t.ht;
    return { yakalanmaYuzde, yakalandi: true, kazanc: 0, lekeBitis: t.lk, nam };
  }
  return { yakalanmaYuzde, yakalandi: false, kazanc: Math.min(HILELI_TARTI_ADET_EN_COK, Math.floor((satilanAdet * HILELI_TARTI_YUZDE) / 100)) };
}

/** Yöneticiye tartı görünümü (sayılar açık: gizli olasılık yok). */
export function tartiGorunumu(k: Kasaba, md: MulkDefteri, isletme: string, t: Tezgah) {
  return {
    hak: hileHakki(k, md, isletme),
    acik: !!t.ht,
    yuzde: HILELI_TARTI_YUZDE,
    adetEnCok: HILELI_TARTI_ADET_EN_COK,
    yakalanma: { taban: HILELI_TARTI_YAKALANMA, denetciyle: HILELI_TARTI_YAKALANMA_DENETCI },
    leke: { itibar: LEKE_ITIBAR, sure: LEKE_SURE_AY, nam: HILE_NAM_KAYBI },
  };
}

/** Herkese açık leke (çarşı bilir): bitiş dönümü ya da null. */
export function lekeGorunumu(t: Pick<Tezgah, "lk"> | undefined, ay: number): { bitis: number; itibar: number } | null {
  return lekeliMi(t, ay + 1) ? { bitis: t!.lk!, itibar: LEKE_ITIBAR } : null;
}

// ── Ozan övgüsü ──

/** Ozan övgü hakkını biliyor mu (`hak:namYayma`). */
export const ozanOvebilir = (k: Karakter): boolean => hakAcik(k, "namYayma");

/** Övgü kaydının değeri (ozanın o anki hakları; kayda yazılır). */
export function ovguDegeri(ozan: Karakter): { d: number; kalemler: KancaKalemi[] } {
  const kalemler: KancaKalemi[] = [{ kanca: "hak:namYayma", d: NAM_YAYMA_H }];
  if (hakAcik(ozan, "ovguTaslama")) kalemler.push({ kanca: "hak:ovguTaslama", d: OVGU_TASLAMA_EK });
  return { d: kalemler.reduce((a, x) => a + x.d, 0), kalemler };
}

/** Ozanın bu ay verdiği övgü sayısı (yerleşimdeki bütün dükkânlar). */
export function ozanAylik(md: MulkDefteri, o: string, ay: number): number {
  let n = 0;
  for (const t of Object.values(md.tz ?? {})) if (t.ny && t.ny[0] === o && t.ny[2] === ay) n++;
  return n;
}

/**
 * H kanalına övgü (tek yığılma kuralı): `ay` gözüyle etkin övgü varsa ozan bir kişi gibi sayılır; değer kişiler
 * arasından en yükseği, tavanla. Ozan bu arada dükkânın sahibi olduysa övgü sayılmaz.
 */
export function ovguyleH(s: KancaSonucu, md: MulkDefteri, isletme: string, ay: number): KancaSonucu {
  const ny = md.tz?.[isletme]?.ny;
  if (!ny || ny[2] !== ay || ny[0] === md.t[isletme]?.s || ny[3] <= s.ham) return s;
  const tavan = KANCA_TAVAN.dukkanH;
  const kalemler: KancaKalemi[] = [{ kanca: "hak:namYayma", d: NAM_YAYMA_H }];
  if (ny[3] > NAM_YAYMA_H) kalemler.push({ kanca: "hak:ovguTaslama", d: ny[3] - NAM_YAYMA_H });
  return { kanal: "dukkanH", deger: Math.min(tavan, ny[3]), ham: ny[3], tavan, kisi: ny[0], kalemler };
}
