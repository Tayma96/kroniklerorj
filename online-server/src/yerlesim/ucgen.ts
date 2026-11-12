// Oyuncu–NPC–oyuncu üçgeni (Faz 4, OYNANIS_TASARIMI §6): kışkırtma (§6.1) → ittifak sözü → katılım (laf, boykot),
// söz bozma; arabuluculuk (§6.2, arabulucu.ts) ve casus (§6.3, casus.ts). Kural tek: NPC'nin bakışı duyduklarından
// ve dostlarının bakışından da etkilenir; yeni puan yoktur, her etki görüş/şans dökümünde kalemdir. Saf fonksiyonlar:
// ilgili oyuncuların karakter ve ilişki haritaları kasabada yüklü olmalıdır (motor `ucgenYuklenecek` ile yükler).
// Bütün denetimler etkiden önce yapılır: hata dönerse hiçbir şey değişmez.

import { HUYLAR } from "../icerik/kisilik.ts";
import type { Dil } from "../icerik/adlar.ts";
import { basarili, hata, type HataKodu, type Sonuc } from "../tipler.ts";
import { araciGirdisi, araciIste, araciKapat, arabulucuOnizle, arabulucuYap, sartOde, talepDonumu, talepGorunumu } from "./arabulucu.ts";
import {
  ARACI_BEDELLERI,
  KISKIRT_TEKLIFLERI,
  ateskesMi,
  duyumYalanla,
  namDus,
  npcyeOde,
  ucgenAl,
  type AraciBedeli,
  type KiskirtTeklifi,
  type Soz,
  type UcgenDefteri,
} from "./bilgi.ts";
import { casusDonumu, casusGuveni, casusKapisi, casusTut } from "./casus.ts";
import { npcMekani } from "./cizelge.ts";
import { kimlikTasiyiciEkle } from "./devir.ts";
import { DOST_ESIGI } from "./donum.ts";
import { engelliMi } from "./engel.ts";
import { getiriCarpani, iliskiAl, tekrarSayisi } from "./eylem.ts";
import { gorus, gorusDegeri } from "./gorus.ts";
import { fark, haberVer, kaynakGuveni } from "./haber.ts";
import { eksenler, hafizaBudama } from "./hafiza.ts";
import { olduMu } from "./hanedan.ts";
import { BECERILER, beceriEkle, karakterYasi, takatHarca, takatTazele } from "./karakter.ts";
import { kisiAdi, kisiCoz, npcAdi, npcKimlik, npcRef, oyuncuRef, yas } from "./ortak.ts";
import { tohumlu, type Zar } from "./rastgele.ts";
import { mesrepRiskSansi, mesrepYakalanma } from "./mesrep.ts";
import type { Dokum, IliskiHaritasi, Kalem, Karakter, Kasaba, Npc, OlayTaslagi, Sakin } from "./tipler.ts";
import {
  GORUNURLUK_ESIGI,
  TEKRAR_CEZASI,
  UCGEN_TAKAT,
  UCGEN_TURLERI,
  dokumKur,
  kimlikCoz,
  sozKimlik,
  zarAt,
  type UcgenBaglami,
  type UcgenCiktisi,
  type UcgenTuru,
} from "./ucgen-ortak.ts";

export { UCGEN_TURLERI, UCGEN_TAKAT };

/** [PARAMETRE] Kışkırtma: yaş kapıları (söz 16+), şans katsayıları ve teklif etkileri. */
export const KISKIRT_YASI = 16;
export const NPC_YASI = 16;
export const HEDEF_YASI = 13;
export const KISKIRT_TEMEL = 10;
export const KIZGINLIK_BOLEN = 2;
export const FAIL_GORUS_BOLEN = 3;
export const SOZ_BECERI_BOLEN = 5;
export const HUY_KISKIRT: Readonly<Record<string, number>> = { kurnaz: 15, hırslı: 15, aceleci: 15, mert: -15, dindar: -15, sabırlı: -15 };
export const TEKLIF_SANS: Readonly<Record<Exclude<KiskirtTeklifi, "para">, number>> = { ortaklik: 8, intikamPayi: 5, soz: 3 };
/** Para: 1 akçe = +1 şans, en çok +15 (sonucu satın almaz); yalnız başarıda ödenir (NPC'ye → kasaba hazinesi). */
export const PARA_SANS_TAVANI = 15;
export const ATESKES_CEZASI = 40;
/** Ret sonrası haber: mert/dindar ya da kızgınlığı sınırlı (görüş > HABER_ESIGI) NPC haber verir; faile dost bakan susar. */
export const HABER_ESIGI = -30;
export const HABER_HUYLARI: readonly string[] = ["mert", "dindar"];
export const IHBAR_GUVEN = 90;
export const KISKIRT_NAM_KAYBI = 3;
export const RET_ANI = { ret: -3, retHaber: -8 } as const;
export const KISKIRT_BECERI = 1;
/** Sınırlar: (fail, hedef) ayda bir; fail ayda en çok, hedef ayda en çok (bütün failler). */
export const KISKIRT_AYLIK = 2;
export const HEDEF_AYLIK = 2;
/** Fark: hedefin aynı mekândaki dostu görüşmeyi bu olasılıkla görür; gören NPC failin hakkında duyum taşır. */
export const FARK_ORANI = 0.6;
export const FARK_DUYUM_YUKU = -6;
/** İttifak sözü: süre (2 mevsim) ve sınırlar. */
export const SOZ_SURE = 6;
export const SOZ_NPC_EN_COK = 3;
export const SOZ_FAIL_EN_COK = 5;
/** Katılım (laf, boykot): şans, yakalanma, leke, etkiler; hedef başına mevsimde en çok. */
export const KATIL_TEMEL = 50;
export const KATIL_BOLEN = 4;
export const HUY_KATIL: Readonly<Record<string, number>> = { aceleci: 10, hırslı: 10, kurnaz: 10, mert: -10, sabırlı: -10, dindar: -10 };
export const KATIL_HAMLE = { laf: 0, boykot: -10 } as const;
export type Hamle = keyof typeof KATIL_HAMLE;
export const LEKE_CEZASI = 20;
export const YAKALANMA = { laf: 0.15, boykot: 0.25 } as const;
export const YAKALANMA_GUVEN = 70;
export const LEKE_SURE = 12;
export const LAF_ALICI = 3;
export const LAF_DUYUM_YUKU = -8;
export const BOYKOT_SURE = 3;
export const HEDEF_MEVSIM_KATILIM = 3;
/** Söz bozma: failin namı ve NPC'de kalan ağır anı. */
export const SOZ_BOZMA = { nam: 3, ani: -15 } as const;
/** İz defteri ömrü (ay) ve en çok kayıt; anlık görüntüde NPC başına en çok oyuncu. */
export const IZ_OMUR = 12;
export const IZ_EN_COK = 400;
export const YK_EN_COK = 5;

// ---------------------------------------------------------------- girdi

export type UcgenGirdisi =
  | { tur: "kiskirt"; npc: number; hedef: string; teklif: KiskirtTeklifi; miktar: number }
  | { tur: "katil"; soz: number; hamle: Hamle }
  | { tur: "sozBoz"; soz: number }
  | { tur: "araciIste"; arabulucu: string; npc: number; bedel: AraciBedeli; miktar: number }
  | { tur: "araciKapat"; talep: number }
  | { tur: "arabulucu"; talep: number }
  | { tur: "sartOde"; npc: number }
  | { tur: "casus"; npc: number; izlenen: string; sure: number };

const nesne = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const npcNo = (v: unknown) => {
  const k = kisiCoz(v);
  return k?.tur === "npc" ? k.i : undefined;
};
const oyuncuNo = (v: unknown) => {
  const k = kisiCoz(v);
  return k?.tur === "oyuncu" ? k.o : undefined;
};
const tamsayi = (v: unknown, alt: number, ust: number) => (Number.isInteger(v) && (v as number) >= alt && (v as number) <= ust ? (v as number) : undefined);

/** POST /v1/ucgen gövdesi (istekNo ayrıca denetlenir). */
export function ucgenGirdisiCoz(g: unknown): Sonuc<UcgenGirdisi> {
  if (!nesne(g)) return hata("gecersiz_istek");
  const tur = g.tur;
  if (typeof tur !== "string" || !(UCGEN_TURLERI as readonly string[]).includes(tur)) return hata("ucgen_gecersiz");
  switch (tur as UcgenTuru) {
    case "kiskirt": {
      const npc = npcNo(g.npc);
      if (npc === undefined) return hata("kisi_yok");
      if (typeof g.hedef !== "string") return hata("kisi_yok");
      const hedef = oyuncuNo(g.hedef);
      if (!hedef) return kisiCoz(g.hedef) ? hata("hedef_uygun_degil") : hata("kisi_yok");
      const t = nesne(g.teklif) ? g.teklif : {};
      if (typeof t.t !== "string" || !(KISKIRT_TEKLIFLERI as readonly string[]).includes(t.t)) return hata("ucgen_gecersiz");
      const miktar = t.t === "para" ? tamsayi(t.miktar, 1, PARA_SANS_TAVANI) : 0;
      if (miktar === undefined) return hata("ucgen_gecersiz");
      return basarili({ tur: "kiskirt", npc, hedef, teklif: t.t as KiskirtTeklifi, miktar });
    }
    case "katil": {
      const soz = kimlikCoz(g.soz, "z");
      if (soz === undefined) return hata("soz_yok");
      if (g.hamle !== "laf" && g.hamle !== "boykot") return hata("ucgen_gecersiz");
      return basarili({ tur: "katil", soz, hamle: g.hamle });
    }
    case "sozBoz": {
      const soz = kimlikCoz(g.soz, "z");
      return soz === undefined ? hata("soz_yok") : basarili({ tur: "sozBoz", soz });
    }
    case "araciIste":
      return araciGirdisi(g, ARACI_BEDELLERI);
    case "araciKapat":
    case "arabulucu": {
      const talep = kimlikCoz(g.talep, "r");
      return talep === undefined ? hata("talep_yok") : basarili({ tur, talep } as UcgenGirdisi);
    }
    case "sartOde": {
      const npc = npcNo(g.npc);
      return npc === undefined ? hata("kisi_yok") : basarili({ tur: "sartOde", npc });
    }
    case "casus": {
      const npc = npcNo(g.npc);
      if (npc === undefined) return hata("kisi_yok");
      const izlenen = oyuncuNo(g.izlenen);
      if (!izlenen) return kisiCoz(g.izlenen) ? hata("hedef_uygun_degil") : hata("kisi_yok");
      const sure = tamsayi(g.ay ?? 1, 1, 3);
      if (sure === undefined) return hata("ucgen_gecersiz");
      return basarili({ tur: "casus", npc, izlenen, sure });
    }
  }
}

/** İşlemden önce yüklenmesi gereken öteki oyuncular (sakin olanlar). */
export function ucgenYuklenecek(k: Kasaba, govde: unknown): string[] {
  const g = ucgenGirdisiCoz(govde);
  if (!g.ok) return [];
  const d = g.deger;
  const ug = k.ug;
  const liste: string[] = [];
  if (d.tur === "kiskirt") liste.push(d.hedef);
  else if (d.tur === "casus") liste.push(d.izlenen);
  else if (d.tur === "araciIste") liste.push(d.arabulucu);
  else if (d.tur === "katil" || d.tur === "sozBoz") {
    const s = ug?.sz.find((x) => x.i === d.soz);
    if (s) liste.push(s.h);
  } else if (d.tur === "araciKapat" || d.tur === "arabulucu") {
    const t = ug?.at.find((x) => x.i === d.talep);
    if (t) liste.push(t.t, t.ar);
  }
  return liste.filter((o) => k.sakin.some((s) => s.o === o));
}

/** Ücretli teklifin arabuluculuk teslimi; aynı deterministik zar ve aynı mevcut ilişki/şans kuralları kullanılır. */
export function arabulucuSozlesmeTeslim(k: Kasaba, ar: Karakter, talep: number, teklif: number, ay: number): Sonuc<UcgenCiktisi> {
  const ili = k.ili.get(ar.o);
  const s = k.sakin.find((x) => x.o === ar.o);
  if (!ili || !s) return hata("sakin_yok");
  return arabulucuYap({ k, kar: ar, ili, s, ay }, { talep }, tohumlu("ucgen", k.y, ay, ar.o, "arabulucu", talep), teklif);
}

/** Tek giriş: girdiyi çözer, tohumlu zarı kurar (aynı ay + fail + NPC + tür aynı zarı verir; yeniden atma yok). */
export function ucgenIslem(k: Kasaba, kar: Karakter, ili: IliskiHaritasi, s: Sakin, govde: unknown, ay: number): Sonuc<UcgenCiktisi> {
  const g = ucgenGirdisiCoz(govde);
  if (!g.ok) return g;
  const b: UcgenBaglami = { k, kar, ili, s, ay };
  const d = g.deger;
  takatTazele(kar, ay);
  switch (d.tur) {
    case "kiskirt":
      return kiskirt(b, d, tohumlu("ucgen", k.y, ay, kar.o, "kiskirt", d.npc, d.hedef));
    case "katil":
      return katil(b, d, tohumlu("ucgen", k.y, ay, kar.o, "katil", d.soz));
    case "sozBoz":
      return sozBoz(b, d);
    case "araciIste":
      return araciIste(b, d);
    case "araciKapat":
      return araciKapat(b, d);
    case "arabulucu":
      return arabulucuYap(b, d, tohumlu("ucgen", k.y, ay, kar.o, "arabulucu", d.talep));
    case "sartOde":
      return sartOde(b, d);
    case "casus":
      return casusTut(b, d);
  }
}

// ---------------------------------------------------------------- kışkırtma

export interface KiskirtGirdisi {
  npc: number;
  hedef: string;
  teklif: KiskirtTeklifi;
  miktar: number;
}

/** Kışkırtma kapısı (önizleme ve işlem aynı denetimi kullanır). */
export function kiskirtKapisi(k: Kasaba, kar: Karakter, npc: Npc | undefined, hedef: Karakter | undefined, g: KiskirtGirdisi, ay: number): HataKodu | undefined {
  if (karakterYasi(kar, ay) < KISKIRT_YASI) return "yas_kapisi";
  if (!npc) return "kisi_yok";
  if (yas(npc.d, ay) < NPC_YASI) return "hedef_uygun_degil";
  if (g.hedef === kar.o) return "kendine";
  if (!hedef || olduMu(hedef)) return "kisi_yok";
  if (karakterYasi(hedef, ay) < HEDEF_YASI) return "yas_kapisi";
  if (engelliMi(k.tp, kar.o, hedef.o)) return "engelli";
  const buAy = (k.ug?.iz ?? []).filter((x) => x[0] === ay && x[1] === "kiskirt");
  if (buAy.some((x) => x[2] === kar.o && x[4] === hedef.o)) return "aralik_dolu";
  if (buAy.filter((x) => x[2] === kar.o).length >= KISKIRT_AYLIK) return "kota_doldu";
  if (buAy.filter((x) => x[4] === hedef.o).length >= HEDEF_AYLIK) return "hedef_siniri";
  const aktif = (k.ug?.sz ?? []).filter((s) => s.b > ay);
  const ayni = aktif.some((s) => s.n === npc.i && s.f === kar.o && s.h === hedef.o);
  if (!ayni && (aktif.filter((s) => s.n === npc.i).length >= SOZ_NPC_EN_COK || aktif.filter((s) => s.f === kar.o).length >= SOZ_FAIL_EN_COK)) {
    return "tavan_doldu";
  }
  if (g.teklif === "para" && kar.pa < g.miktar) return "para_yok";
  takatTazele(kar, ay);
  if (kar.tk < UCGEN_TAKAT.kiskirt) return "takat_yok";
  return undefined;
}

/** Kışkırtma şansı = kalemlerin toplamı (5..95). */
export function kiskirtSansi(k: Kasaba, npc: Npc, fail: Karakter, hedef: Karakter, g: Pick<KiskirtGirdisi, "teklif" | "miktar">, ay: number): Dokum {
  const failIli = k.ili.get(fail.o);
  const hedefIli = k.ili.get(hedef.o);
  const d = dokumKur();
  d.ekle("sans.temel", KISKIRT_TEMEL);
  const gh = gorusDegeri(k, npc, hedef, hedefIli, ay);
  d.ekle("sans.kizginlik", Math.round(-Math.min(0, gh) / KIZGINLIK_BOLEN), { gorus: gh });
  const gf = gorusDegeri(k, npc, fail, failIli, ay);
  d.ekle("sans.bakis", Math.round(gf / FAIL_GORUS_BOLEN), { gorus: gf });
  const huy = HUYLAR[npc.h] ?? "";
  d.ekle("sans.huy", HUY_KISKIRT[huy] ?? 0, { huy });
  d.ekle("sans.beceri", Math.floor((fail.be[BECERILER.indexOf("soz")] ?? 0) / SOZ_BECERI_BOLEN), { beceri: "soz" });
  d.ekle("sans.teklif", g.teklif === "para" ? Math.min(PARA_SANS_TAVANI, g.miktar) : TEKLIF_SANS[g.teklif], {
    teklif: g.teklif,
    ...(g.teklif === "para" ? { miktar: g.miktar } : {}),
  });
  const tekrar = tekrarSayisi(failIli?.[npc.i], "kiskirt", ay);
  d.ekle("sans.tekrar", -TEKRAR_CEZASI * tekrar, { tekrar });
  if (ateskesMi(hedefIli?.[npc.i], ay)) d.ekle("sans.ateskes", -ATESKES_CEZASI);
  d.ekle("sans.mesrep", mesrepRiskSansi(fail));
  return d.bitir();
}

/** Reddeden NPC hedefe haber verir mi? Gerekçe kalemleri: +1 haber yönünde, −1 susma yönünde (zarsız karar). */
export function haberKarari(huy: string, gh: number, gf: number): { haber: boolean; gerekce: Kalem[] } {
  const gerekce: Kalem[] = [];
  const durust = HABER_HUYLARI.includes(huy);
  if (durust) gerekce.push({ k: "haber.huy", d: 1, p: { huy } });
  const sinirli = gh > HABER_ESIGI;
  if (sinirli) gerekce.push({ k: "haber.kizginlikSinirli", d: 1, p: { gorus: gh } });
  const sadik = gf >= DOST_ESIGI;
  if (sadik) gerekce.push({ k: "haber.sadakat", d: -1, p: { gorus: gf } });
  if (!durust && !sinirli) gerekce.push({ k: "haber.kizgin", d: -1, p: { gorus: gh } });
  return { haber: durust || (sinirli && !sadik), gerekce };
}

/** İttifak sözü kurar; aynı (NPC, fail, hedef) için ikinci söz süreyi uzatır. */
export function sozKur(k: Kasaba, n: number, f: string, h: string, ay: number, kaynak: Soz["k"], tk?: KiskirtTeklifi): Soz {
  const ug = ucgenAl(k);
  const var_ = ug.sz.find((s) => s.n === n && s.f === f && s.h === h && s.b > ay);
  if (var_) {
    var_.b = ay + SOZ_SURE;
    if (tk) var_.tk = tk;
    return var_;
  }
  const s: Soz = { i: ug.n++, n, f, h, a: ay, b: ay + SOZ_SURE, k: kaynak, ...(tk ? { tk } : {}) };
  ug.sz.push(s);
  return s;
}

function izEkle(ug: UcgenDefteri, iz: UcgenDefteri["iz"][number]): void {
  ug.iz.push(iz);
  if (ug.iz.length > IZ_EN_COK) ug.iz.splice(0, ug.iz.length - IZ_EN_COK);
}

export function sozGorunumu(k: Kasaba, s: Soz, ay: number, dil: Dil = "tr") {
  const n = k.dizin.get(s.n);
  return {
    id: sozKimlik(s.i),
    npc: { id: npcKimlik(s.n), ad: n ? npcAdi(n, dil) : "?" },
    hedef: { id: s.h, ad: kisiAdi(k, s.h, dil) ?? "?" },
    kurulus: s.a,
    bitis: s.b,
    kaynak: s.k,
    ...(s.tk ? { teklif: s.tk } : {}),
    katilabilir: s.ka !== ay,
  };
}

/** §6.1: "X'i Y'ye karşı kazan". Sonuç basari (söz) | ret | retHaber; sonuçtan bağımsız fark zarı atılır. */
export function kiskirt(b: UcgenBaglami, g: KiskirtGirdisi, zar: Zar): Sonuc<UcgenCiktisi> {
  const { k, kar, ili, ay } = b;
  const npc = k.dizin.get(g.npc);
  const hedef = k.kar.get(g.hedef);
  const engel = kiskirtKapisi(k, kar, npc, hedef, g, ay);
  if (engel) return hata(engel);
  if (!npc || !hedef || !takatHarca(kar, ay, UCGEN_TAKAT.kiskirt)) return hata("takat_yok");
  const ug = ucgenAl(k);
  const sans = kiskirtSansi(k, npc, kar, hedef, g, ay);
  const atilan = zarAt(zar);
  const iliski = iliskiAl(ili, npc.i);
  const tekrar = tekrarSayisi(iliski, "kiskirt", ay);
  const carpan = getiriCarpani(tekrar);
  (iliski.az.kiskirt ??= []).push(ay);
  izEkle(ug, [ay, "kiskirt", kar.o, npc.i, hedef.o]);
  const mekan = npcMekani(k, npc, ay) ?? "meydan";
  kar.mk = mekan;
  kar.ma = ay;
  b.s.mk = mekan;
  b.s.ma = ay;
  const olaylar: OlayTaslagi[] = [];
  const degisim: Record<string, unknown> = {};
  let sonuc: "basari" | "ret" | "retHaber";
  let soz: Soz | undefined;
  let gerekce: Kalem[] | undefined;
  if (atilan <= sans.toplam) {
    sonuc = "basari";
    if (g.teklif === "para") {
      kar.pa -= g.miktar;
      npcyeOde(k, g.miktar);
      degisim.para = -g.miktar;
    }
    soz = sozKur(k, npc.i, kar.o, hedef.o, ay, "kiskirt", g.teklif);
    const e = beceriEkle(kar, ay, "soz", Math.round(KISKIRT_BECERI * carpan));
    if (e) degisim.beceri = { soz: e };
  } else {
    const gh = gorusDegeri(k, npc, hedef, k.ili.get(hedef.o), ay);
    const gf = gorusDegeri(k, npc, kar, ili, ay);
    const karar = haberKarari(HUYLAR[npc.h] ?? "", gh, gf);
    gerekce = karar.gerekce;
    if (karar.haber) {
      sonuc = "retHaber";
      iliski.an.push(["kiskirtmaRet", RET_ANI.retHaber, ay]);
      const d = namDus(kar, "mertlik", KISKIRT_NAM_KAYBI);
      if (d) degisim.nam = { mertlik: d };
      olaylar.push(
        ...haberVer(k, {
          kaynak: npcKimlik(npc.i),
          kaynakRef: npcRef(npc),
          alici: hedef.o,
          konu: kar.o,
          tur: "ihbar",
          guven: IHBAR_GUVEN,
          ay,
          p: { fail: oyuncuRef(kar), npc: npcRef(npc), teklif: g.teklif },
          onem: 8,
        }),
      );
    } else {
      sonuc = "ret";
      iliski.an.push(["kiskirtmaRet", RET_ANI.ret, ay]);
    }
  }
  // Görünürlük (§6.1): hedefin aynı mekândaki dostu görüşmeyi görebilir (fail bunu bilmez).
  for (const f of fark(k, mekan, ay, hedef.o, [kar.o, npcKimlik(npc.i)])) {
    if (zar() >= FARK_ORANI) continue;
    olaylar.push(
      ...haberVer(k, { kaynak: f.kim, kaynakRef: f.ref, alici: hedef.o, konu: kar.o, tur: "fark", guven: f.guven, ay, p: { fail: oyuncuRef(kar), npc: npcRef(npc), mekan } }),
    );
    if (f.kim.startsWith("n")) haberVer(k, { kaynak: "gozlem", alici: f.kim, konu: kar.o, tur: "kiskirtma", yuk: FARK_DUYUM_YUKU, guven: f.guven, ay });
    break;
  }
  return basarili({
    yanit: {
      tur: "kiskirt",
      npc: npcKimlik(npc.i),
      hedef: hedef.o,
      sans,
      zar: atilan,
      sonuc,
      ...(gerekce ? { gerekce } : {}),
      getiri: { tekrar, carpan: Math.round(carpan * 100) / 100 },
      degisim,
      ...(soz ? { soz: sozGorunumu(k, soz, ay) } : {}),
    },
    olaylar,
    digerleri: [hedef.o],
  });
}

// ---------------------------------------------------------------- katılım ve söz bozma

/** Sözlü NPC'nin katılım şansı (gerekçeli döküm). */
export function katilSansi(k: Kasaba, npc: Npc, fail: Karakter, hedef: Karakter, hamle: Hamle, ay: number): Dokum {
  const d = dokumKur();
  d.ekle("sans.temel", KATIL_TEMEL);
  const gf = gorusDegeri(k, npc, fail, k.ili.get(fail.o), ay);
  d.ekle("sans.sadakat", Math.round(gf / KATIL_BOLEN), { gorus: gf });
  const gh = gorusDegeri(k, npc, hedef, k.ili.get(hedef.o), ay);
  d.ekle("sans.kizginlik", Math.round(-Math.min(0, gh) / KATIL_BOLEN), { gorus: gh });
  const huy = HUYLAR[npc.h] ?? "";
  d.ekle("sans.huy", HUY_KATIL[huy] ?? 0, { huy });
  d.ekle("sans.hamle", KATIL_HAMLE[hamle], { hamle });
  const leke = k.ug?.lk[npc.i];
  if (leke !== undefined && leke > ay) d.ekle("sans.leke", -LEKE_CEZASI);
  d.ekle("sans.mesrep", mesrepRiskSansi(fail));
  return d.bitir();
}

/** Sözlü NPC failin hamlesine katılır: laf (dostlarına duyum) ya da boykot (hedefin eylem şansı −20). Ayda tek. */
export function katil(b: UcgenBaglami, g: { soz: number; hamle: Hamle }, zar: Zar): Sonuc<UcgenCiktisi> {
  const { k, kar, ay } = b;
  const ug = k.ug;
  const soz = ug?.sz.find((s) => s.i === g.soz);
  if (!ug || !soz || soz.b <= ay) return hata("soz_yok");
  if (soz.f !== kar.o) return hata("taraf_degil");
  if (soz.ka === ay) return hata("aralik_dolu");
  const npc = k.dizin.get(soz.n);
  if (!npc) return hata("soz_yok");
  const hedef = k.kar.get(soz.h);
  const hedefIli = k.ili.get(soz.h);
  if (!hedef || !hedefIli || olduMu(hedef)) return hata("kisi_yok");
  const mevsim = ug.iz.filter((x) => x[1] === "katil" && x[4] === hedef.o && ay - x[0] < 3).length;
  if (mevsim >= HEDEF_MEVSIM_KATILIM) return hata("hedef_siniri");
  if (!takatHarca(kar, ay, UCGEN_TAKAT.katil)) return hata("takat_yok");
  soz.ka = ay;
  const temel = { tur: "katil", soz: sozKimlik(soz.i), hamle: g.hamle };
  if (ateskesMi(hedefIli[npc.i], ay)) {
    return basarili({ yanit: { ...temel, katildi: false, gerekce: [{ k: "katil.ateskes", d: -1 }] }, olaylar: [], digerleri: [] });
  }
  izEkle(ug, [ay, "katil", kar.o, npc.i, hedef.o]);
  const sans = katilSansi(k, npc, kar, hedef, g.hamle, ay);
  const atilan = zarAt(zar);
  if (atilan > sans.toplam) {
    return basarili({ yanit: { ...temel, sans, zar: atilan, katildi: false }, olaylar: [], digerleri: [] });
  }
  const olaylar: OlayTaslagi[] = [];
  const nk = npcKimlik(npc.i);
  const etki: Record<string, unknown> = {};
  let alicilar: Npc[] = [];
  if (g.hamle === "laf") {
    alicilar = npc.b
      .filter((x) => x[1] === 1)
      .sort((x, y) => y[2] - x[2] || x[0] - y[0])
      .map((x) => k.dizin.get(x[0]))
      .filter((n): n is Npc => !!n && yas(n.d, ay) >= 14)
      .slice(0, LAF_ALICI);
    const guvenler: number[] = [];
    for (const a of alicilar) {
      const guven = kaynakGuveni(k, a, npc, ay).toplam;
      guvenler.push(guven);
      haberVer(k, { kaynak: nk, alici: npcKimlik(a.i), konu: hedef.o, tur: "laf", yuk: LAF_DUYUM_YUKU, guven, ay });
    }
    etki.duyan = alicilar.length;
    etki.guven = guvenler.length ? Math.round(guvenler.reduce((x, y) => x + y, 0) / guvenler.length) : 0;
  } else {
    iliskiAl(hedefIli, npc.i).bk = ay + BOYKOT_SURE;
    etki.boykotBitis = ay + BOYKOT_SURE;
  }
  // E5 meşrep (cesaret): temkinli sezer (×0,8), gözü pek ağır yakalanır (×1,25); çarpan meşrep görünümünde yazılı.
  const yakalandi = zar() < YAKALANMA[g.hamle] * mesrepYakalanma(kar);
  if (yakalandi) {
    ug.lk[npc.i] = ay + LEKE_SURE;
    if (g.hamle === "laf") for (const a of alicilar) duyumYalanla(hedefIli[a.i], nk, "laf", ay);
    else delete iliskiAl(hedefIli, npc.i).bk;
    olaylar.push(
      ...haberVer(k, {
        kaynak: "gozlem",
        alici: hedef.o,
        konu: kar.o,
        tur: "yakalandi",
        guven: YAKALANMA_GUVEN,
        ay,
        p: { npc: npcRef(npc), fail: oyuncuRef(kar), hamle: g.hamle },
        onem: 7,
      }),
    );
  }
  return basarili({ yanit: { ...temel, sans, zar: atilan, katildi: true, yakalandi, etki }, olaylar, digerleri: [hedef.o] });
}

/** Fail sözünü bozar: söz düşer, failin mertliği azalır, NPC'de ağır "ihanet" anısı kalır. */
export function sozBoz(b: UcgenBaglami, g: { soz: number }): Sonuc<UcgenCiktisi> {
  const { k, kar, ili, ay } = b;
  const soz = k.ug?.sz.find((s) => s.i === g.soz);
  if (!soz || soz.b <= ay) return hata("soz_yok");
  if (soz.f !== kar.o) return hata("taraf_degil");
  soz.b = ay;
  iliskiAl(ili, soz.n).an.push(["ihanet", SOZ_BOZMA.ani, ay]);
  const d = namDus(kar, "mertlik", SOZ_BOZMA.nam);
  return basarili({ yanit: { tur: "sozBoz", soz: sozKimlik(soz.i), degisim: d ? { nam: { mertlik: d } } : {} }, olaylar: [], digerleri: [] });
}

// ---------------------------------------------------------------- ay dönümü, görünüm, devir

/**
 * Ay dönümü (bütün sakinler yüklü): hafıza budaması, söz bitişi (sessiz), leke ve iz temizliği, arabuluculuk
 * talebi ve şart süreleri, casus raporları, oyuncu dostları anlık görüntüsü.
 */
export function ucgenDonumu(k: Kasaba, ay: number): OlayTaslagi[] {
  for (const ili of k.ili.values()) for (const i of Object.values(ili)) hafizaBudama(i, ay);
  const olaylar: OlayTaslagi[] = [];
  const ug = k.ug;
  if (ug) {
    ug.sz = ug.sz.filter((s) => s.b > ay && k.dizin.has(s.n));
    for (const [n, b] of Object.entries(ug.lk)) if (b <= ay) delete ug.lk[n];
    ug.iz = ug.iz.filter((x) => ay - x[0] < IZ_OMUR);
    olaylar.push(...talepDonumu(k, ay));
    olaylar.push(...casusDonumu(k, ay));
  }
  // Oyuncu dostları: yalnız oyuncular arası beyan varsa anlamlıdır.
  const tp = k.tp;
  if (tp && (tp.ob.some((x) => x.d === "dost") || tp.hu.some((x) => x.d === "acik"))) {
    const yk: Record<string, [string, number][]> = {};
    for (const s of k.sakin) {
      const kar = k.kar.get(s.o);
      const ili = k.ili.get(s.o);
      if (!kar || !ili || olduMu(kar)) continue;
      for (const a of Object.keys(ili)) {
        const npc = a === "0" ? undefined : k.dizin.get(Number(a));
        if (!npc) continue;
        const g = gorusDegeri(k, npc, kar, ili, ay);
        if (g >= DOST_ESIGI) (yk[a] ??= []).push([s.o, g]);
      }
    }
    for (const l of Object.values(yk)) {
      l.sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1));
      l.splice(YK_EN_COK);
    }
    ucgenAl(k).yk = yk;
  } else if (ug) ug.yk = {};
  return olaylar;
}

/** Kaba aralık (§13.9): üçüncü kişiye bakış görünmüyorsa. */
export function kabaBakis(g: number): "kizgin" | "soguk" | "yok" {
  return g <= HABER_ESIGI ? "kizgin" : g < 0 ? "soguk" : "yok";
}

/** GET /v1/ucgen?npc=&hedef=: sözlerim, talepler, casusum, barışlar, parametreler ve (npc verilirse) önizleme. */
export function ucgenGorunumu(k: Kasaba, kar: Karakter, ili: IliskiHaritasi, sorgu: { npc?: unknown; hedef?: unknown }, dil: Dil) {
  const ay = k.ay;
  const ug = k.ug;
  const ad = (o: string) => ({ id: o, ad: kisiAdi(k, o, dil) ?? "?" });
  const barislar = [];
  for (const [a, i] of Object.entries(ili)) {
    const n = k.dizin.get(Number(a));
    if (!i.ab || !n) continue;
    barislar.push({
      npc: { id: npcKimlik(n.i), ad: npcAdi(n, dil) },
      deger: i.ab.v,
      arabulucu: ad(i.ab.ar),
      ...(i.ab.s ? { sartli: { deger: i.ab.s[0], tutar: i.ab.s[1], sonAy: i.ab.s[2] } } : {}),
      ...(i.ab.ak !== undefined && i.ab.ak > ay ? { ateskesBitis: i.ab.ak } : {}),
    });
  }
  const casus = (ug?.cs ?? []).find((c) => c.s === kar.o);
  const sonuc: Record<string, unknown> = {
    ay,
    sozler: (ug?.sz ?? []).filter((s) => s.f === kar.o && s.b > ay).map((s) => sozGorunumu(k, s, ay, dil)),
    talepler: {
      giden: (ug?.at ?? []).filter((t) => t.t === kar.o && t.d === "acik").map((t) => talepGorunumu(k, t, dil)),
      gelen: (ug?.at ?? []).filter((t) => t.ar === kar.o && t.d === "acik").map((t) => ({ ...talepGorunumu(k, t, dil), onizleme: arabulucuOnizle(k, kar, t, ay) })),
      kapanan: (ug?.at ?? []).filter((t) => (t.t === kar.o || t.ar === kar.o) && t.d !== "acik").slice(-10).reverse().map((t) => talepGorunumu(k, t, dil)),
    },
    casus: casus ? { id: `c${casus.i}`, npc: { id: npcKimlik(casus.n), ad: kisiAdi(k, npcKimlik(casus.n), dil) ?? "?" }, izlenen: ad(casus.iz), bitis: casus.b } : null,
    barislar,
    parametreler: {
      takat: UCGEN_TAKAT,
      kiskirt: { yas: KISKIRT_YASI, teklif: { ...TEKLIF_SANS, paraTavani: PARA_SANS_TAVANI }, farkOrani: FARK_ORANI, sozSure: SOZ_SURE, aylik: KISKIRT_AYLIK },
      katil: { yakalanma: YAKALANMA, boykotSure: BOYKOT_SURE, lafAlici: LAF_ALICI },
    },
  };
  const n = npcNo(sorgu.npc);
  const npc = n === undefined ? undefined : k.dizin.get(n);
  if (!npc) return sonuc;
  const bakis = gorus(k, npc, kar, ili, ay);
  const gorunur = bakis.toplam > GORUNURLUK_ESIGI || (ug?.sz ?? []).some((s) => s.n === npc.i && s.f === kar.o && s.b > ay);
  const onizleme: Record<string, unknown> = { npc: npcKimlik(npc.i), eksenler: eksenler(bakis), gorunur };
  const ho = oyuncuNo(sorgu.hedef);
  const hedef = ho ? k.kar.get(ho) : undefined;
  if (ho) {
    const teklifler: Record<string, unknown> = {};
    let engel: HataKodu | undefined;
    for (const t of KISKIRT_TEKLIFLERI) {
      const g = { npc: npc.i, hedef: ho, teklif: t, miktar: t === "para" ? PARA_SANS_TAVANI : 0 };
      engel ??= kiskirtKapisi(k, kar, npc, hedef, t === "para" ? { ...g, miktar: 0 } : g, ay);
      if (!hedef || engel === "kisi_yok") continue;
      const sans = kiskirtSansi(k, npc, kar, hedef, g, ay);
      teklifler[t] = gorunur ? sans : { bilinen: sans.kalemler.filter((x) => x.k !== "sans.kizginlik" && x.k !== "sans.sinir") };
    }
    onizleme.kiskirt = {
      ...(engel ? { engel } : {}),
      teklifler,
      ...(hedef && !gorunur ? { kaba: kabaBakis(gorusDegeri(k, npc, hedef, k.ili.get(hedef.o), ay)) } : {}),
    };
    const ce = casusKapisi(k, kar, npc, hedef, ay);
    onizleme.casus = { ...(ce ? { engel: ce } : {}), guven: casusGuveni(k, npc, kar, ay, false) };
  }
  sonuc.onizleme = onizleme;
  return sonuc;
}

/** GET önizlemesinde yüklenecek oyuncular: hedef ve gelen taleplerin tarafları. */
export function ucgenOkumaYuklenecek(k: Kasaba, ben: string, hedefHam: unknown): string[] {
  const liste = (k.ug?.at ?? []).filter((t) => t.ar === ben && t.d === "acik").map((t) => t.t);
  const h = oyuncuNo(hedefHam);
  if (h) liste.push(h);
  return liste.filter((o) => k.sakin.some((s) => s.o === o));
}

/** Devir: ölen karakterin sözleri ve casusu düşer; açık talepleri kapanır, emanet vârise (yoksa sahibine) döner. */
export function ucgenKimligiTasi(k: Kasaba, eski: string, yeni: string): void {
  const ug = k.ug;
  if (!ug || eski === yeni) return;
  ug.sz = ug.sz.filter((s) => s.f !== eski && s.h !== eski);
  ug.cs = ug.cs.filter((c) => c.s !== eski && c.iz !== eski);
  for (const t of ug.at) {
    if (t.d !== "acik" || (t.t !== eski && t.ar !== eski)) continue;
    const kime = t.t === eski ? (k.kar.get(yeni) ?? k.kar.get(eski)) : k.kar.get(t.t);
    if (kime) kime.pa += t.m;
    else npcyeOde(k, t.m);
    t.m = 0;
    t.d = "dustu";
    t.sn = "oldu";
    t.kp = k.ay;
  }
  for (const l of Object.values(ug.yk)) for (let i = l.length - 1; i >= 0; i--) if (l[i]![0] === eski) l.splice(i, 1);
}
kimlikTasiyiciEkle(ucgenKimligiTasi);

