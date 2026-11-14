// Han masası olaylarının yerleşimdeki etkisi (H5). HesapDO, MasaDO'nun yazdığı olayı `hanOlayi` iç iletisiyle gönderir
// (anahtar: masa adı + "#" + olay no). Saf fonksiyonlar; motor yükleme ve yazmayı yapar.
//
//  1. Tanıklık: olay anında masada OTURANLARIN (katılım listesi) her birine yalnız kendisinin gördüğü bir olay düşer.
//     Şart metni olaya yazılmaz; yalnız tür, taraflar ve masa numarası.
//  2. Duyum: masada olmayanlar mevcut söylenti sistemiyle duyar. Tohum handaki NPC'lerdir (`mekanTaniklari(...,"han")`);
//     o ay handa NPC yoksa masadakilerin hane NPC'leri. Yayılım ay dönümünde dostluk ağıyla (soylenti.ts).
//  3. Küçük etkiler (farm süzgeci: akçe YOK; nam aylık NAM_AYLIK_TAVAN içinde; aynı hane/hesap kümesi arası eylem etki
//     üretmez; çift başına ayda bir; aynı anahtarın yeniden teslimi hiçbir şey üretmez):
//      - yemin: yalnız Kül Yemini mührü kabul edilmişse (ky === 2) yemin edene mertlik +HAN_YEMIN_NAM; masada kümesi
//        dışından en az bir tanık şarttır. Mühürsüz yemin yine tanıklık ve söylenti üretir.
//      - kabul (sözleşme/ittifak onayı): iki tarafa tanıdık izi (boşsa "tanidik"; dost/düşman ezilmez) ve iki yönlü
//        olumlu söylenti.
//      - ihbar: hedef hakkında olumsuz söylenti (hedef mevcut /v1/yalanla ile yalanlar); ihbar edene kazanç yok.
//      - meydanOku, sözleşme/ittifak teklifi: yalnız tanıklık.
//      - kabul (meydan okuma onayı, H6): düello (src/yerlesim/duello.ts). Kapı tutmazsa "düello gerçekleşmedi" tanıklığı.

import { basarili, hata, type Sonuc } from "../tipler.ts";
import { namEkle } from "./karakter.ts";
import { TANIDIK_EN_COK } from "./iliski.ts";
import { olduMu } from "./hanedan.ts";
import { oyuncuRef } from "./ortak.ts";
import { haneTaniklari, mekanTaniklari, soylentiEkle } from "./soylenti.ts";
import { ayniKume } from "./teveccuh.ts";
import { DUELLO_NAM, DUELLO_TAKAT, duelloCoz, duelloKapisi, mevsimNo, type DuelloDokumu, type DuelloKapisi } from "./duello.ts";
import { ciftSirala, toplumAl, type SoylentiTuru, type Toplum } from "./toplum.ts";
import type { Karakter, Kasaba, OlayTaslagi } from "./tipler.ts";

export const HAN_OLAY_TURLERI = ["yemin", "sozlesme", "ittifak", "ihbar", "meydanOku", "kabul"] as const;
export type HanOlayTuru = (typeof HAN_OLAY_TURLERI)[number];

/** [PARAMETRE] Yemin edenin mertlik kazancı (aylık nam tavanı ayrıca uygulanır; çift başına ayda bir). */
export const HAN_YEMIN_NAM = 1;
/** [PARAMETRE] İşlenmiş olay anahtarlarının tutulan sayısı (yeniden teslim süzgeci). */
export const HAN_OLAY_IZ_EN_COK = 400;
/** [PARAMETRE] Katılım listesinin kabul edilen en çok uzunluğu (koltuk sayısının üstü reddedilir). */
export const HAN_KATILIM_EN_COK = 8;
/** [PARAMETRE] Tanıklık olayının önemi (Dönüş Kartı). */
export const HAN_TANIKLIK_ONEM = 3;

/** Toplum kaydındaki han defteri: işlenmiş anahtarlar ve "çift başına ayda bir" izleri (iz → ay). */
export interface HanDefteri {
  k: string[];
  iz: Record<string, number>;
  /** H6 düello farm izi: sıralı çift → nam ürettiği mevsim numarası (mevsim geçince budanır). */
  dz?: Record<string, number>;
}

export interface HanOlayGirdisi {
  anahtar: string;
  masaNo: number;
  tur: HanOlayTuru;
  /** Hesap kimlikleri. */
  kim: string;
  hedef?: string;
  katilim: string[];
  teklifTur?: "sozlesme" | "ittifak" | "meydanOku";
}

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const kimlikMi = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 64;

/** İç ileti gövdesi: {anahtar, olay}. Olayın sahibi gönderen hesap olmalı, masa bu yerleşimin hanında olmalı. */
export function hanOlayiCoz(govde: unknown, hesapId: string, yerlesim: string): Sonuc<HanOlayGirdisi> {
  if (!nesneMi(govde) || !nesneMi(govde.olay) || typeof govde.anahtar !== "string") return hata("gecersiz_istek");
  const o = govde.olay;
  if (typeof o.masa !== "string" || !o.masa.startsWith(`masa:${yerlesim}:`) || o.masa.length > 128) return hata("gecersiz_istek");
  if (typeof o.no !== "number" || !Number.isInteger(o.no) || o.no < 1) return hata("gecersiz_istek");
  if (govde.anahtar !== `${o.masa}#${o.no}`) return hata("gecersiz_istek");
  if (typeof o.tur !== "string" || !(HAN_OLAY_TURLERI as readonly string[]).includes(o.tur)) return hata("gecersiz_istek");
  if (o.kim !== hesapId) return hata("yetki_yok");
  if (o.hedef !== undefined && !kimlikMi(o.hedef)) return hata("gecersiz_istek");
  if (!Array.isArray(o.katilim) || o.katilim.length > HAN_KATILIM_EN_COK || !o.katilim.every(kimlikMi)) return hata("gecersiz_istek");
  const masaNo = Number(o.masa.slice(o.masa.lastIndexOf(":") + 1));
  const teklifTur = o.teklifTur === "sozlesme" || o.teklifTur === "ittifak" || o.teklifTur === "meydanOku" ? o.teklifTur : undefined;
  if (o.tur === "kabul" && !teklifTur) return hata("gecersiz_istek");
  return basarili({
    anahtar: govde.anahtar,
    masaNo: Number.isInteger(masaNo) ? masaNo : 0,
    tur: o.tur as HanOlayTuru,
    kim: hesapId,
    ...(o.hedef ? { hedef: o.hedef } : {}),
    katilim: [...new Set(o.katilim as string[])],
    ...(teklifTur ? { teklifTur } : {}),
  });
}

export function hanDefteri(t: Toplum): HanDefteri {
  return (t.hn ??= { k: [], iz: {} });
}

export function hanOlayiIslendiMi(k: Kasaba, anahtar: string): boolean {
  return k.tp?.hn?.k.includes(anahtar) ?? false;
}

/** Olay i18n anahtarı (istemci metni `olay.han.*`). */
export function hanOlayAnahtari(g: Pick<HanOlayGirdisi, "tur" | "teklifTur">, hedefli: boolean): string {
  if (g.tur === "yemin") return hedefli ? "olay.han.yeminKisiye" : "olay.han.yemin";
  if (g.tur === "kabul") return `olay.han.kabul.${g.teklifTur}`;
  return `olay.han.${g.tur}`;
}

export interface HanEtkisi {
  tanik: number;
  nam?: { mertlik: number };
  soylenti: SoylentiTuru[];
  iz?: true;
  /** Etki üretilmedi; neden (görünür döküm). */
  engel?: "ayni_kume" | "muhur_yok" | "tanik_yok" | "ayda_bir" | "hedef_yok" | "mevsimde_bir";
  /** H6 düello: kapı (gerçekleşmedi) ya da sonuç ve döküm. */
  duello?: { kapi: DuelloKapisi } | { kazanan: string; kisi: DuelloDokumu; hedef: DuelloDokumu; nam: number };
}

function tanidikIzi(kar: Karakter, diger: string): boolean {
  if (kar.tn[diger] || Object.keys(kar.tn).length >= TANIDIK_EN_COK) return false;
  kar.tn[diger] = "tanidik";
  return true;
}

/**
 * Olayı uygular (anahtar zaten işlenmişse çağrılmamalıdır; motor denetler). `kisiler`: hesap kimliği → yüklü karakter
 * (yalnız bu yerleşimin sakinleri). Dönen `degisen` yazılması gereken karakterlerdir (yerel kimlik).
 */
export function hanOlayiUygula(
  k: Kasaba,
  g: HanOlayGirdisi,
  kisiler: ReadonlyMap<string, Karakter>,
  ay: number,
): Sonuc<{ olaylar: OlayTaslagi[]; degisen: string[]; etki: HanEtkisi }> {
  const kim = kisiler.get(g.kim);
  if (!kim || olduMu(kim)) return hata("sakin_yok");
  const t = toplumAl(k);
  const defter = hanDefteri(t);
  for (const [iz, a] of Object.entries(defter.iz)) if (a !== ay) delete defter.iz[iz];
  defter.k.push(g.anahtar);
  if (defter.k.length > HAN_OLAY_IZ_EN_COK) defter.k.splice(0, defter.k.length - HAN_OLAY_IZ_EN_COK);

  const hedef = g.hedef ? kisiler.get(g.hedef) : undefined;
  const etki: HanEtkisi = { tanik: 0, soylenti: [] };
  const olaylar: OlayTaslagi[] = [];
  const degisen = new Set<string>();
  // Hedef zorunlu türlerde hedef bu yerleşimin sakini değilse (ör. başka yerleşimden ihbar) olay ve etki yoktur.
  if (g.tur !== "yemin" && !hedef) return basarili({ olaylar, degisen: [], etki: { ...etki, engel: "hedef_yok" } });
  if (g.tur === "kabul" && g.teklifTur === "meydanOku" && hedef) return duelloUygula(k, g, kim, hedef, kisiler, defter, ay);

  // 1. Tanıklık: katılım listesindeki her sakine yalnız kendisinin gördüğü olay.
  const muhur = kim.ky === 2 ? 1 : 0;
  const tanilar = g.katilim.map((h) => kisiler.get(h)).filter((x): x is Karakter => x !== undefined && !olduMu(x));
  const p = {
    kisi: oyuncuRef(kim),
    ...(hedef ? { hedef: oyuncuRef(hedef) } : {}),
    masa: g.masaNo,
    ...(g.tur === "yemin" ? { muhur } : {}),
  };
  const anahtar = hanOlayAnahtari(g, hedef !== undefined);
  for (const tk of tanilar) {
    olaylar.push({ t: "han", w: kim.o, h: hedef?.o ?? "", g: tk.o, n: HAN_TANIKLIK_ONEM, k: anahtar, p });
  }
  etki.tanik = tanilar.length;

  // Farm süzgeci: aynı hane/hesap kümesi arası eylem etki üretmez.
  if (hedef && ayniKume(kim, hedef)) return basarili({ olaylar, degisen: [], etki: { ...etki, engel: "ayni_kume" } });
  if (g.tur === "meydanOku" || g.tur === "sozlesme" || g.tur === "ittifak") return basarili({ olaylar, degisen: [], etki });

  // 2. Duyum tanıkları: handaki NPC'ler; yoksa masadakilerin hane NPC'leri.
  const tohum = `han:${g.anahtar}`;
  const handaki = mekanTaniklari(k, "han", [], ay, tohum);
  const npcTanik = handaki.length ? handaki : haneTaniklari(k, [...new Set(tanilar.map((x) => x.e).filter((e) => e !== 0))], ay, tohum);
  const soylenti = (tur: SoylentiTuru, konu: string, muhatap: string): void => {
    if (soylentiEkle(k, tur, konu, muhatap, npcTanik, ay)) etki.soylenti.push(tur);
  };

  if (g.tur === "yemin") {
    soylenti("hanYemin", kim.o, hedef?.o ?? "");
    const iz = `yemin:${kim.o}:${hedef?.o ?? "-"}`;
    const tanikVar = tanilar.some((x) => !ayniKume(x, kim));
    if (!muhur) etki.engel = "muhur_yok";
    else if (!tanikVar) etki.engel = "tanik_yok";
    else if (defter.iz[iz] === ay) etki.engel = "ayda_bir";
    else {
      defter.iz[iz] = ay;
      const n = namEkle(kim, ay, "mertlik", HAN_YEMIN_NAM);
      etki.nam = { mertlik: n };
      degisen.add(kim.o);
    }
  } else if (g.tur === "kabul" && hedef) {
    const [a, b] = ciftSirala(kim.o, hedef.o);
    const iz = `anlasma:${a}:${b}`;
    if (defter.iz[iz] === ay) etki.engel = "ayda_bir";
    else {
      defter.iz[iz] = ay;
      if (tanidikIzi(kim, hedef.o)) degisen.add(kim.o);
      if (tanidikIzi(hedef, kim.o)) degisen.add(hedef.o);
      etki.iz = true;
      soylenti("hanAnlasma", kim.o, hedef.o);
      soylenti("hanAnlasma", hedef.o, kim.o);
    }
  } else if (g.tur === "ihbar" && hedef) {
    const iz = `ihbar:${kim.o}:${hedef.o}`;
    if (defter.iz[iz] === ay) etki.engel = "ayda_bir";
    else {
      defter.iz[iz] = ay;
      soylenti("hanIhbar", hedef.o, kim.o);
    }
  }
  return basarili({ olaylar, degisen: [...degisen], etki });
}

/** H1: oyuncunun dostları ve aynı hanedeki oyuncular (yerel kimlik). */
export function hanTanidikKimlikleri(k: Kasaba, o: string, e: number): string[] {
  const sonuc = new Set<string>();
  for (const b of k.tp?.ob ?? []) {
    if (b.d !== "dost") continue;
    if (b.a === o) sonuc.add(b.b);
    else if (b.b === o) sonuc.add(b.a);
  }
  if (e !== 0) for (const s of k.sakin) if (s.e === e && s.o !== o) sonuc.add(s.o);
  return [...sonuc];
}

/**
 * H6 düello: kabul olayında `kim` meydan okunan (kabul eden), `hedef` meydan okuyandır. Olayda `kisi` meydan okuyan,
 * `hedef` meydan okunan olarak yazılır. İki taraf her durumda tanık listesine eklenir (döküm iki tarafa da düşer).
 */
function duelloUygula(
  k: Kasaba,
  g: HanOlayGirdisi,
  savunan: Karakter,
  okuyan: Karakter,
  kisiler: ReadonlyMap<string, Karakter>,
  defter: HanDefteri,
  ay: number,
): Sonuc<{ olaylar: OlayTaslagi[]; degisen: string[]; etki: HanEtkisi }> {
  const tanilar = new Map<string, Karakter>();
  for (const h of g.katilim) {
    const x = kisiler.get(h);
    if (x && !olduMu(x)) tanilar.set(x.o, x);
  }
  for (const x of [okuyan, savunan]) tanilar.set(x.o, x);
  const taban = { kisi: oyuncuRef(okuyan), hedef: oyuncuRef(savunan), masa: g.masaNo };
  const tanikla = (anahtar: string, p: Record<string, string | number | ReturnType<typeof oyuncuRef>>) =>
    [...tanilar.values()].map((tk): OlayTaslagi => ({ t: "han", w: okuyan.o, h: savunan.o, g: tk.o, n: HAN_TANIKLIK_ONEM + 1, k: anahtar, p }));
  const sakin = (x: Karakter) => k.sakin.find((s) => s.o === x.o) ?? { d: x.d };
  const kapi = duelloKapisi(okuyan, savunan, sakin(okuyan), sakin(savunan), ay);
  if (kapi) {
    const olaylar = tanikla("olay.han.duelloOlmadi", { ...taban, neden: kapi });
    return basarili({ olaylar, degisen: [], etki: { tanik: tanilar.size, soylenti: [], duello: { kapi } } });
  }
  const sonuc = duelloCoz(okuyan, savunan, ay, g.anahtar);
  const kazanan = sonuc.kazanan === "kisi" ? okuyan : savunan;
  const kaybeden = kazanan === okuyan ? savunan : okuyan;
  okuyan.tk -= DUELLO_TAKAT;
  savunan.tk -= DUELLO_TAKAT;
  const etki: HanEtkisi = { tanik: tanilar.size, soylenti: [] };
  // Farm süzgeci: aynı sıralı çift mevsimde bir kez nam (ve söylenti) üretir; sonrakiler yalnız kayıt.
  const mevsim = mevsimNo(ay);
  const dz = (defter.dz ??= {});
  for (const [iz, m] of Object.entries(dz)) if (m < mevsim) delete dz[iz];
  const [a, b] = ciftSirala(okuyan.o, savunan.o);
  const iz = `${a}:${b}`;
  let nam = 0;
  if (dz[iz] === mevsim) etki.engel = "mevsimde_bir";
  else {
    dz[iz] = mevsim;
    nam = namEkle(kazanan, ay, "mertlik", DUELLO_NAM);
    etki.nam = { mertlik: nam };
    const tohum = `han:${g.anahtar}`;
    const handaki = mekanTaniklari(k, "han", [], ay, tohum);
    const npcTanik = handaki.length ? handaki : haneTaniklari(k, [...new Set([...tanilar.values()].map((x) => x.e).filter((e) => e !== 0))], ay, tohum);
    if (soylentiEkle(k, "hanDuello", kazanan.o, kaybeden.o, npcTanik, ay)) etki.soylenti.push("hanDuello");
  }
  etki.duello = { kazanan: kazanan.o, kisi: sonuc.kisi, hedef: sonuc.hedef, nam };
  const dokumP: Record<string, number> = {};
  for (const [taraf, d] of [["kisi", sonuc.kisi], ["hedef", sonuc.hedef]] as const) {
    for (const [kalem, deger] of Object.entries(d)) dokumP[taraf + kalem[0]!.toUpperCase() + kalem.slice(1)] = deger;
  }
  const olaylar = tanikla("olay.han.duello", { ...taban, kazanan: oyuncuRef(kazanan), nam, ...dokumP });
  return basarili({ olaylar, degisen: [okuyan.o, savunan.o], etki });
}
