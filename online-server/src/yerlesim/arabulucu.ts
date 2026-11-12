// Arabuluculuk (Faz 4, §6.2): taraf (Berkay) dost oyuncudan (Hasan) NPC (Murat) ile arasını bulmasını ister;
// tazminat akçesi emanette bekler. Arabulucu kendi zamanında dener. Sonuç: barış (kırgınlığın yarısı, kalıcı) ·
// şartlı barış (şart ödenince kırgınlık kadar) · ateşkes (4 ay hasmane katılım yok) · ret (arabulucunun itibarı
// düşer). Başarı geçmişi silmez: anılar kalır. İkili oyun: arabulucu aynı NPC'yi aynı taraf için yakın zamanda
// kışkırttıysa yakalanabilir. Şans eylem anındaki görüşle hesaplanır (asenkron çelişki yok).

import type { Dil } from "../icerik/adlar.ts";
import { basarili, hata, type HataKodu, type Sonuc } from "../tipler.ts";
import { ARACI_BEDELLERI, npcyeOde, ucgenAl, type AraciBedeli, type AraciTalebi } from "./bilgi.ts";
import { getiriCarpani, iliskiAl, tekrarSayisi } from "./eylem.ts";
import { engelliMi } from "./engel.ts";
import { gorus, gorusDegeri } from "./gorus.ts";
import { haberVer, tanikAgirligi } from "./haber.ts";
import { kirginlikSebebi } from "./hafiza.ts";
import { olduMu } from "./hanedan.ts";
import { ILISKI_YASI, dostMu } from "./iliski.ts";
import { beceriEkle, karakterYasi, namEkle, takatHarca } from "./karakter.ts";
import { kisiAdi, kisiCoz, npcAdi, npcKimlik, npcRef, oyuncuRef, sinirla, yas } from "./ortak.ts";
import type { Zar } from "./rastgele.ts";
import type { Dokum, Karakter, Kasaba, OlayTaslagi } from "./tipler.ts";
import { TEKRAR_CEZASI, UCGEN_TAKAT, dokumKur, talepKimlik, zarAt, type UcgenBaglami, type UcgenCiktisi } from "./ucgen-ortak.ts";

/** [PARAMETRE] Kapı: NPC'nin arabulucuya en az görüşü, talep süresi ve sınırları. */
export const ARACI_GUVEN_ESIGI = 20;
export const ARACI_NPC_YASI = 14;
export const TALEP_SURE = 3;
export const TALEP_ACIK_EN_COK = 3;
export const TAZMINAT_TAVANI = 15;
/** [PARAMETRE] Şans: temel, güven/2, kırgınlık/3, sebep ağırlığı (hafiza.SEBEP_AGIRLIGI), bedel, tanıklar. */
export const ARACI_TEMEL = 30;
export const GUVEN_BOLEN = 2;
export const KIRGINLIK_BOLEN = 3;
export const BEDEL_SANS: Readonly<Record<Exclude<AraciBedeli, "tazminat">, number>> = { ozur: 5, helallik: 10, ortakIs: 10 };
/** Sonuç bantları: zar ≤ şans/2 barış · ≤ şans şartlı · ≤ şans + ATESKES_PAYI ateşkes · üstü ret. */
export const ATESKES_PAYI = 15;
export const ATESKES_SURE = 4;
export const SART_SURE = 6;
export const SART_TUTARI = { bolen: 4, alt: 2, ust: 15 } as const;
export const RET_ANISI = -8;
export const IKILI_OYUN = { pencere: 6, yakalanma: 0.5, ani: -15, guven: 80 } as const;
/** Arabulucunun kazancı (barış/şartlı; azalan getiri, aylık tavanlı): mertlik ve söz becerisi. */
export const ARACI_ODUL = { mertlik: 2, soz: 1 } as const;

export type AraciSonucu = "baris" | "sartli" | "ateskes" | "ret";

export function araciGirdisi(g: Record<string, unknown>, bedeller: readonly string[]): Sonuc<{ tur: "araciIste"; arabulucu: string; npc: number; bedel: AraciBedeli; miktar: number }> {
  const ar = kisiCoz(g.arabulucu);
  if (!ar || ar.tur !== "oyuncu") return ar ? hata("hedef_uygun_degil") : hata("kisi_yok");
  const n = kisiCoz(g.npc);
  if (!n || n.tur !== "npc") return hata("kisi_yok");
  const b = typeof g.bedel === "object" && g.bedel !== null && !Array.isArray(g.bedel) ? (g.bedel as Record<string, unknown>) : {};
  if (typeof b.t !== "string" || !bedeller.includes(b.t)) return hata("ucgen_gecersiz");
  let miktar = 0;
  if (b.t === "tazminat") {
    if (!Number.isInteger(b.miktar) || (b.miktar as number) < 1 || (b.miktar as number) > TAZMINAT_TAVANI) return hata("ucgen_gecersiz");
    miktar = b.miktar as number;
  }
  return basarili({ tur: "araciIste", arabulucu: ar.o, npc: n.i, bedel: b.t as AraciBedeli, miktar });
}

export function talepGorunumu(k: Kasaba, t: AraciTalebi, dil: Dil) {
  const n = k.dizin.get(t.n);
  return {
    id: talepKimlik(t.i),
    taraf: { id: t.t, ad: kisiAdi(k, t.t, dil) ?? "?" },
    arabulucu: { id: t.ar, ad: kisiAdi(k, t.ar, dil) ?? "?" },
    npc: { id: npcKimlik(t.n), ad: n ? npcAdi(n, dil) : "?" },
    bedel: t.b,
    ...(t.m ? { emanet: t.m } : {}),
    acilis: t.ac,
    sonAy: t.sa,
    durum: t.d,
    ...(t.sn ? { sonuc: t.sn } : {}),
  };
}

function iade(k: Kasaba, t: AraciTalebi): void {
  if (t.m <= 0) return;
  const kar = k.kar.get(t.t);
  if (kar) kar.pa += t.m;
  else npcyeOde(k, t.m);
  t.m = 0;
}

function kapat(k: Kasaba, t: AraciTalebi, d: AraciTalebi["d"], sn: string, ay: number): void {
  t.d = d;
  t.sn = sn;
  t.kp = ay;
  const ug = ucgenAl(k);
  const kapali = ug.at.filter((x) => x.d !== "acik");
  if (kapali.length > 40) {
    const sil = new Set(kapali.slice(0, kapali.length - 40));
    ug.at = ug.at.filter((x) => !sil.has(x));
  }
}

/** Taraf ister: arabulucu karşılıklı dost, NPC tarafa kırgın; tazminat emanete alınır. */
export function araciIste(b: UcgenBaglami, g: { arabulucu: string; npc: number; bedel: AraciBedeli; miktar: number }): Sonuc<UcgenCiktisi> {
  const { k, kar, ili, ay } = b;
  if (g.arabulucu === kar.o) return hata("kendine");
  const ar = k.kar.get(g.arabulucu);
  if (!ar || olduMu(ar)) return hata("kisi_yok");
  if (karakterYasi(kar, ay) < ILISKI_YASI || karakterYasi(ar, ay) < ILISKI_YASI) return hata("yas_kapisi");
  if (engelliMi(k.tp, kar.o, ar.o)) return hata("engelli");
  if (!dostMu(k.tp, kar.o, ar.o)) return hata("dost_degil");
  const npc = k.dizin.get(g.npc);
  if (!npc) return hata("kisi_yok");
  if (yas(npc.d, ay) < ARACI_NPC_YASI) return hata("hedef_uygun_degil");
  if (gorusDegeri(k, npc, kar, ili, ay) >= 0) return hata("kirgin_degil");
  const ug = ucgenAl(k);
  const acik = ug.at.filter((t) => t.t === kar.o && t.d === "acik");
  if (acik.some((t) => t.n === npc.i)) return hata("aralik_dolu");
  if (acik.length >= TALEP_ACIK_EN_COK) return hata("teklif_siniri");
  if (kar.pa < g.miktar) return hata("para_yok");
  kar.pa -= g.miktar;
  const t: AraciTalebi = { i: ug.n++, t: kar.o, ar: ar.o, n: npc.i, b: g.bedel, m: g.miktar, ac: ay, sa: ay + TALEP_SURE, d: "acik" };
  ug.at.push(t);
  const olay: OlayTaslagi = {
    t: "ucgen", w: kar.o, h: ar.o, g: ar.o, n: 6, k: "olay.ucgen.araciTalebi",
    p: { kisi: oyuncuRef(kar), npc: npcRef(npc), bedel: g.bedel, talep: talepKimlik(t.i), ...(g.miktar ? { miktar: g.miktar } : {}) },
  };
  return basarili({ yanit: { tur: "araciIste", talep: talepGorunumu(k, t, "tr"), ...(g.miktar ? { degisim: { para: -g.miktar } } : {}) }, olaylar: [olay], digerleri: [ar.o] });
}

/** Ücretli teklif sözleşmesinin kabulünde, var olan NPC arabuluculuk kurallarıyla aynı kapıları doğrular. */
export function araciSozlesmeKontrol(
  k: Kasaba,
  taraf: Karakter,
  arabulucu: Karakter,
  npcNo: number,
  bedel: AraciBedeli,
  miktar: number,
  ay: number,
): Sonuc<null> {
  if (!ARACI_BEDELLERI.includes(bedel)) return hata("ucgen_gecersiz");
  if (bedel === "tazminat" ? (!Number.isInteger(miktar) || miktar < 1 || miktar > TAZMINAT_TAVANI) : miktar !== 0) return hata("ucgen_gecersiz");
  if (taraf.o === arabulucu.o || olduMu(arabulucu)) return hata(taraf.o === arabulucu.o ? "kendine" : "kisi_yok");
  if (karakterYasi(taraf, ay) < ILISKI_YASI || karakterYasi(arabulucu, ay) < ILISKI_YASI) return hata("yas_kapisi");
  if (engelliMi(k.tp, taraf.o, arabulucu.o)) return hata("engelli");
  if (!dostMu(k.tp, taraf.o, arabulucu.o)) return hata("dost_degil");
  const npc = k.dizin.get(npcNo);
  if (!npc) return hata("kisi_yok");
  if (yas(npc.d, ay) < ARACI_NPC_YASI) return hata("hedef_uygun_degil");
  if (gorusDegeri(k, npc, taraf, k.ili.get(taraf.o), ay) >= 0) return hata("kirgin_degil");
  const acik = (k.ug?.at ?? []).filter((x) => x.t === taraf.o && x.d === "acik");
  if (acik.some((x) => x.n === npcNo)) return hata("aralik_dolu");
  if (acik.length >= TALEP_ACIK_EN_COK) return hata("teklif_siniri");
  return basarili(null);
}

/** Kabul edilmiş ücretli teklif, arabuluculuk defterinde gerçek ve tekil bir talep açar.
 * Tazminat teklif emanetinden ayrıldığı için burada tarafın cüzdanından ikinci kez düşülmez. */
export function araciSozlesmeAc(
  k: Kasaba,
  taraf: Karakter,
  arabulucu: Karakter,
  npcNo: number,
  bedel: AraciBedeli,
  miktar: number,
  ay: number,
  teklifNo: number,
): Sonuc<{ talep: AraciTalebi; olay: OlayTaslagi }> {
  const kontrol = araciSozlesmeKontrol(k, taraf, arabulucu, npcNo, bedel, miktar, ay);
  if (!kontrol.ok) return kontrol;
  const npc = k.dizin.get(npcNo)!;
  const ug = ucgenAl(k);
  const talep: AraciTalebi = {
    i: ug.n++, t: taraf.o, ar: arabulucu.o, n: npcNo, b: bedel, m: miktar,
    ac: ay, sa: ay + TALEP_SURE, d: "acik", teklif: teklifNo,
  };
  ug.at.push(talep);
  const olay: OlayTaslagi = {
    t: "ucgen", w: taraf.o, h: arabulucu.o, g: arabulucu.o, n: 6, k: "olay.ucgen.araciTalebi",
    p: { kisi: oyuncuRef(taraf), npc: npcRef(npc), bedel, talep: talepKimlik(talep.i), ...(miktar ? { miktar } : {}), sozlesme: true },
  };
  return basarili({ talep, olay });
}

/** Sözleşme iptal/sona erme durumunda henüz denenmemiş arabuluculuk talebinin tazminat emanetini geri verir. */
export function araciSozlesmeIptal(k: Kasaba, talepNo: number, teklifNo: number, ay: number): void {
  const t = k.ug?.at.find((x) => x.i === talepNo);
  if (!t || t.teklif !== teklifNo || t.d !== "acik") return;
  iade(k, t);
  kapat(k, t, "geri", "sozlesmeIptal", ay);
}

/** Taraf geri çeker ya da arabulucu reddeder: emanet iade, öbür tarafa olay. Cezasız. */
export function araciKapat(b: UcgenBaglami, g: { talep: number }): Sonuc<UcgenCiktisi> {
  const { k, kar, ay } = b;
  const t = k.ug?.at.find((x) => x.i === g.talep);
  if (!t || t.d !== "acik") return hata("talep_yok");
  if (t.teklif !== undefined) return hata("talep_yok");
  if (t.t !== kar.o && t.ar !== kar.o) return hata("taraf_degil");
  const geri = t.t === kar.o;
  iade(k, t);
  kapat(k, t, geri ? "geri" : "ret", geri ? "geri" : "ret", ay);
  const diger = geri ? t.ar : t.t;
  const olay: OlayTaslagi = { t: "ucgen", w: kar.o, h: diger, g: diger, n: 4, k: `olay.ucgen.araci.${geri ? "geri" : "ret"}`, p: { kisi: oyuncuRef(kar), talep: talepKimlik(t.i) } };
  return basarili({ yanit: { tur: "araciKapat", talep: talepGorunumu(k, t, "tr") }, olaylar: [olay], digerleri: [diger] });
}

function arabulucuKapisi(k: Kasaba, ar: Karakter, t: AraciTalebi, ay: number): HataKodu | undefined {
  if (t.d !== "acik") return "talep_yok";
  if (t.ar !== ar.o) return "taraf_degil";
  const taraf = k.kar.get(t.t);
  if (!taraf || olduMu(taraf)) return "kisi_yok";
  if (!dostMu(k.tp, ar.o, taraf.o)) return "dost_degil";
  const npc = k.dizin.get(t.n);
  if (!npc) return "kisi_yok";
  if (gorusDegeri(k, npc, ar, k.ili.get(ar.o), ay) < ARACI_GUVEN_ESIGI) return "guven_yetersiz";
  if (ar.tk < UCGEN_TAKAT.arabulucu) return "takat_yok";
  return undefined;
}

/** Arabuluculuk şansı (gerekçeli döküm) ve kırgınlık. */
export function arabuluculukSansi(k: Kasaba, ar: Karakter, t: AraciTalebi, ay: number): { sans: Dokum; kirginlik: number; sebep: string } {
  const npc = k.dizin.get(t.n)!;
  const taraf = k.kar.get(t.t)!;
  const d = dokumKur();
  d.ekle("sans.temel", ARACI_TEMEL);
  const ga = gorusDegeri(k, npc, ar, k.ili.get(ar.o), ay);
  d.ekle("sans.guven", Math.round(ga / GUVEN_BOLEN), { gorus: ga });
  const gt = gorus(k, npc, taraf, k.ili.get(taraf.o), ay);
  const kirginlik = -Math.min(0, gt.toplam);
  d.ekle("sans.kirginlik", -Math.round(kirginlik / KIRGINLIK_BOLEN), { kirginlik });
  const sebep = kirginlikSebebi(gt);
  d.ekle("sans.sebep", -sebep.agirlik, { sebep: sebep.kalem });
  d.ekle("sans.bedel", t.b === "tazminat" ? Math.min(TAZMINAT_TAVANI, t.m) : BEDEL_SANS[t.b], { bedel: t.b, ...(t.m ? { miktar: t.m } : {}) });
  for (const x of tanikAgirligi(k, npc, taraf.o, ay)) d.ekle(x.k, x.d, x.p);
  const tekrar = tekrarSayisi(k.ili.get(ar.o)?.[npc.i], "arabulucu", ay);
  d.ekle("sans.tekrar", -TEKRAR_CEZASI * tekrar, { tekrar });
  return { sans: d.bitir(), kirginlik, sebep: sebep.kalem };
}

/** Gelen talep önizlemesi (arabulucuya): kapı ve şans. */
export function arabulucuOnizle(k: Kasaba, ar: Karakter, t: AraciTalebi, ay: number) {
  const engel = arabulucuKapisi(k, ar, t, ay);
  if (engel && engel !== "takat_yok") return { engel };
  const { sans, kirginlik } = arabuluculukSansi(k, ar, t, ay);
  return { ...(engel ? { engel } : {}), sans, kirginlik, bantlar: { baris: Math.floor(sans.toplam / 2), sartli: sans.toplam, ateskes: sans.toplam + ATESKES_PAYI } };
}

export function sonucBandi(atilan: number, sans: number): AraciSonucu {
  if (atilan <= Math.floor(sans / 2)) return "baris";
  if (atilan <= sans) return "sartli";
  if (atilan <= sans + ATESKES_PAYI) return "ateskes";
  return "ret";
}

/** Arabulucu dener. Sonuç `Iliski.ab` olarak kalır ve "gorus.baris" kalemiyle görünür. */
export function arabulucuYap(b: UcgenBaglami, g: { talep: number }, zar: Zar, teklifNo?: number): Sonuc<UcgenCiktisi> {
  const { k, kar, ili, ay } = b;
  const t = k.ug?.at.find((x) => x.i === g.talep);
  if (!t || t.teklif !== teklifNo) return hata("talep_yok");
  const engel = arabulucuKapisi(k, kar, t, ay);
  if (engel) return hata(engel);
  if (!takatHarca(kar, ay, UCGEN_TAKAT.arabulucu)) return hata("takat_yok");
  const npc = k.dizin.get(t.n)!;
  const taraf = k.kar.get(t.t)!;
  const tarafIli = k.ili.get(taraf.o)!;
  const ug = ucgenAl(k);
  const temel = { tur: "arabulucu", talep: talepKimlik(t.i), npc: npcKimlik(npc.i), taraf: taraf.o };
  const { sans, kirginlik, sebep } = arabuluculukSansi(k, kar, t, ay);
  const iliski = iliskiAl(ili, npc.i);
  const tekrar = tekrarSayisi(iliski, "arabulucu", ay);
  const carpan = getiriCarpani(tekrar);
  (iliski.az.arabulucu ??= []).push(ay);
  const olaylar: OlayTaslagi[] = [];
  if (kirginlik === 0) {
    iade(k, t);
    kapat(k, t, "bitti", "gerekYok", ay);
    return basarili({ yanit: { ...temel, sans, sonuc: "gerekYok" }, olaylar, digerleri: [taraf.o] });
  }
  const atilan = zarAt(zar);
  let sonuc = sonucBandi(atilan, sans.toplam);
  // İkili oyun: arabulucu bu NPC'yi aynı taraf için yakın zamanda kışkırttıysa yakalanabilir.
  const ikili = ug.iz.some((x) => x[1] === "kiskirt" && x[2] === kar.o && x[3] === npc.i && x[4] === taraf.o && ay - x[0] < IKILI_OYUN.pencere);
  const yakalandi = ikili && zar() < IKILI_OYUN.yakalanma;
  if (yakalandi) {
    sonuc = "ret";
    iliski.an.push(["ikiliOyun", IKILI_OYUN.ani, ay]);
    olaylar.push(...haberVer(k, { kaynak: npcKimlik(npc.i), kaynakRef: npcRef(npc), alici: taraf.o, konu: kar.o, tur: "ikiliOyun", guven: IKILI_OYUN.guven, ay, p: { arabulucu: oyuncuRef(kar), npc: npcRef(npc) }, onem: 8 }));
  }
  const ab = (iliskiAl(tarafIli, npc.i).ab ??= { v: 0, a: ay, ar: kar.o });
  ab.a = ay;
  ab.ar = kar.o;
  const degisim: Record<string, unknown> = {};
  const ek: Record<string, unknown> = {};
  if (sonuc === "baris") {
    const v = Math.round(kirginlik / 2);
    ab.v += v;
    ek.deger = v;
  } else if (sonuc === "sartli") {
    const tutar = sinirla(Math.round(kirginlik / SART_TUTARI.bolen), SART_TUTARI.alt, SART_TUTARI.ust);
    ab.s = [kirginlik, tutar, ay + SART_SURE];
    ek.sart = { deger: kirginlik, tutar, sonAy: ay + SART_SURE };
  } else if (sonuc === "ateskes") {
    ab.ak = ay + ATESKES_SURE;
    ek.ateskesBitis = ay + ATESKES_SURE;
  } else {
    if (!yakalandi) iliski.an.push(["basarisizArabulucu", RET_ANISI, ay]);
    if (ab.v === 0 && !ab.s && ab.ak === undefined) delete iliskiAl(tarafIli, npc.i).ab;
    // En ağır olumsuz kalem: "Murat reddetti: sebep …".
    let en = sans.kalemler[0]!;
    for (const x of sans.kalemler) if (x.k !== "sans.sinir" && x.d < en.d) en = x;
    ek.gerekce = yakalandi ? "sans.ikiliOyun" : en.k;
  }
  if (sonuc === "ret") iade(k, t);
  else {
    npcyeOde(k, t.m);
    t.m = 0;
  }
  if (sonuc === "baris" || sonuc === "sartli") {
    const n = namEkle(kar, ay, "mertlik", Math.round(ARACI_ODUL.mertlik * carpan));
    if (n) degisim.nam = { mertlik: n };
    const s = beceriEkle(kar, ay, "soz", Math.round(ARACI_ODUL.soz * carpan));
    if (s) degisim.beceri = { soz: s };
  }
  kapat(k, t, sonuc === "ret" ? "ret" : "bitti", sonuc, ay);
  const p = { arabulucu: oyuncuRef(kar), npc: npcRef(npc), sebep, ...(ek.deger ? { deger: ek.deger as number } : {}), ...(typeof ek.gerekce === "string" ? { gerekce: ek.gerekce } : {}) };
  olaylar.push({ t: "ucgen", w: kar.o, h: taraf.o, g: taraf.o, n: 7, k: `olay.ucgen.arabuluculuk.${sonuc}`, p });
  if (sonuc === "baris") {
    olaylar.push({ t: "ucgen", w: kar.o, h: taraf.o, g: "", n: 5, k: "olay.ucgen.barisildi", p: { taraf: oyuncuRef(taraf), npc: npcRef(npc), arabulucu: oyuncuRef(kar) } });
  }
  return basarili({
    yanit: { ...temel, sans, zar: atilan, sonuc, kirginlik, ...ek, ...(yakalandi ? { yakalandi: true } : {}), getiri: { tekrar, carpan: Math.round(carpan * 100) / 100 }, degisim },
    olaylar,
    digerleri: [taraf.o],
  });
}

/** Şartlı barışın şartını öder (taraf): akçe NPC'ye (hazine), barış değeri kırgınlık kadar artar. */
export function sartOde(b: UcgenBaglami, g: { npc: number }): Sonuc<UcgenCiktisi> {
  const { k, kar, ili, ay } = b;
  const ab = ili[g.npc]?.ab;
  if (!ab?.s || ab.s[2] < ay) return hata("sart_yok");
  const [deger, tutar] = ab.s;
  if (kar.pa < tutar) return hata("para_yok");
  kar.pa -= tutar;
  npcyeOde(k, tutar);
  ab.v += deger;
  delete ab.s;
  return basarili({ yanit: { tur: "sartOde", npc: npcKimlik(g.npc), deger, degisim: { para: -tutar } }, olaylar: [], digerleri: [] });
}

/** Ay dönümü: süresi dolan ya da tarafı ölen talepler cezasız düşer, emanet iade edilir. */
export function talepDonumu(k: Kasaba, ay: number): OlayTaslagi[] {
  const olaylar: OlayTaslagi[] = [];
  for (const t of k.ug?.at ?? []) {
    if (t.d !== "acik") continue;
    const taraf = k.kar.get(t.t);
    const ar = k.kar.get(t.ar);
    const olu = !taraf || !ar || olduMu(taraf) || olduMu(ar) || !k.dizin.has(t.n);
    if (!olu && ay <= t.sa) continue;
    iade(k, t);
    kapat(k, t, "dustu", olu ? "oldu" : "sure", ay);
    olaylar.push({ t: "ucgen", w: t.ar, h: t.t, g: t.t, n: 3, k: "olay.ucgen.araci.dustu", p: { talep: talepKimlik(t.i), ...(ar ? { arabulucu: oyuncuRef(ar) } : {}) } });
  }
  return olaylar;
}
