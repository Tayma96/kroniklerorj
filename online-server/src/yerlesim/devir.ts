// Devir (Faz 7, OYNANIS_TASARIMI §8): ölümde vâris seçilir; akçe, envanter, nam, NPC görüşü (sönümlü "ata
// namı") ve husumet vârise geçer, yerleşimin kroniğine satır yazılır. Tek saf `devirHesapla()` planı çıkarır:
// önizleme ucu da devir ucu da bu planı kullanır; devir ucu, önizlemenin plan karması (pk) tutmazsa reddeder.
// `devirUygula()` planı aynen yazar: kendi para hesabı yoktur (yalnız yeni kimlik verir ve NPC'yi karaktere çevirir).
// Akçe korunur: Σ paylar + vergi = tereke; miras para üretmez. Ölünün anıları ve tanıdıkları ölüde kalır.

import { AD_HAVUZLARI } from "../icerik/adlar.ts";
import type { MeslekId } from "../icerik/meslekler.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { iliskiAl } from "./eylem.ts";
import { aniYuku } from "./gorus.ts";
import {
  AILE_MESLEGI_CARPANI,
  akrabalar,
  hanedanKasabasi,
  hanedanKimligi,
  hanedanSoyadi,
  nesil,
  olduMu,
  oyuncuEsKodu,
  oyuncuNoAl,
  varisAdaylari,
  varsayilanVaris,
  type HanedanKaydi,
} from "./hanedan.ts";
import { karakterOlustur, NAMLAR } from "./karakter.ts";
import { kronikEkle, type KronikSatiri } from "./kronik.ts";
import { kisiCoz, npcAdi, npcKimlik, oyuncuRef, yas } from "./ortak.ts";
import { dizinSec, karma, tohumlu } from "./rastgele.ts";
import type { Karakter, Kasaba, KisiRef, OlayTaslagi } from "./tipler.ts";
import { VAKIF } from "./vasiyet.ts";

/** [PARAMETRE] Veraset vergisi (yüzde, aşağı yuvarlanır; kasaba hazinesine). */
export const VERGI_ORANI = 10;
/** [PARAMETRE] Nam devri: vâris atasının namının bu oranıyla başlar (aşağı yuvarlanır). */
export const NAM_DEVIR_ORANI = 0.25;
/** [PARAMETRE] Ata namı: NPC'nin ölüye bakışının (geçmiş + anılar) bu oranı vârise sönümlü anı olur. */
export const ATA_NAMI_ORANI = 0.3;
export const ATA_NAMI_EN_COK = 40;
/** [PARAMETRE] Vasiyette payı ortalamanın altında kalan evladın vârise küsme anısı. */
export const KUSME_YUKU = -15;
/** [PARAMETRE] Uzak akraba bu yaşta gelir. */
export const UZAK_AKRABA_YASI = 16;
export const UZAK = "uzak";

export type DevirKalemi =
  /** Akçe payı: kime "n12" (NPC emanetine), "o3" (oyuncu eş), "vakif" ya da vâris kimliği (plan.varis.id). */
  | { tur: "pay"; kime: string; oran: number; akce: number }
  | { tur: "vergi"; akce: number }
  /** Vârisin NPC'yken emanette duran payı kendi kesesine geçer. */
  | { tur: "emanet"; akce: number }
  | { tur: "envanter"; mallar: Record<string, number> }
  | { tur: "nam"; nam: number[] }
  | { tur: "aileMeslegi"; meslek: MeslekId; carpan: number }
  | { tur: "ata"; npc: number; yuk: number }
  | { tur: "kusme"; npc: number; yuk: number }
  /** Bir oyuncunun ölüye düşman işareti vârise geçer (husumet). */
  | { tur: "husumet"; kim: string }
  /** Ölüye konmuş diğer işaretler düşer. */
  | { tur: "isaretSil"; kim: string };
// Faz 3 (borç, açık husumet, teklif), Faz 5 (mülk) ve Faz 6 (kan davası) kalemleri bu birliğe eklenir;
// kayıtlarını yeni kimliğe taşımak için kimlikTasiyiciEkle() kullanılır.

export interface VarisBilgisi {
  /** "n12" ya da "uzak". */
  id: string;
  ad: string;
  k: 0 | 1;
  d: number;
  e: number;
  an: number;
  ba: number;
}

export interface DevirPlani {
  olu: string;
  hesap: string;
  hanedan: string;
  /** Vârisin nesli. */
  nesil: number;
  ol: number;
  varis: VarisBilgisi;
  tereke: number;
  kalemler: DevirKalemi[];
  /** Kronik satırı (ayı ve vârisin yeni kimliği uygulanırken yazılır). */
  kronik: Omit<KronikSatiri, "a" | "s">;
}

/** Devir sonrası kimlik taşıyıcıları (Faz 3+ kayıtları: borç, husumet, teklif). Saf ve tekrar güvenli olmalıdır. */
export type KimlikTasiyici = (kasaba: Kasaba, eski: string, yeni: string, plan: DevirPlani) => void;
const TASIYICILAR: KimlikTasiyici[] = [];
export function kimlikTasiyiciEkle(f: KimlikTasiyici): void {
  if (!TASIYICILAR.includes(f)) TASIYICILAR.push(f);
}

export function planKarmasi(plan: DevirPlani): string {
  return karma(JSON.stringify(plan)).toString(36);
}

/** Uzak akraba: hanedan adını taşır, 16 yaşında gelir; hanedan + ölüm ayına göre deterministik. */
export function uzakAkrabaUret(kasaba: Kasaba, olu: Karakter, ol: number): VarisBilgisi {
  const r = tohumlu("uzak", kasaba.y, hanedanKimligi(olu), ol);
  const k = (r() < 0.5 ? 1 : 0) as 0 | 1;
  const havuz = AD_HAVUZLARI.tr;
  const a = dizinSec((k ? havuz.f : havuz.m).length, r);
  const s = hanedanSoyadi(kasaba, olu);
  return { id: UZAK, ad: npcAdi({ a, s, k }, "tr"), k, d: ol - UZAK_AKRABA_YASI * 12 - dizinSec(12, r), e: olu.e, an: 0, ba: 0 };
}

/** Canlı pay alıcısı mı (NPC ya da yüklenmiş, canlı oyuncu)? */
function canliAlici(kasaba: Kasaba, id: string): boolean {
  if (id === VAKIF) return true;
  const ki = kisiCoz(id);
  if (ki?.tur === "npc") return kasaba.dizin.has(ki.i);
  const k = ki ? kasaba.kar.get(ki.o) : undefined;
  return !!k && !olduMu(k);
}

/**
 * Devir planı. Ölü değilse (vasiyet yazarken önizleme) bu ay ölmüş gibi hesaplanır. `varisHam` yoksa varsayılan
 * vâris. Bütün sayılar ölüm ayına göre hesaplanır: plan sonraki aylarda da aynı kalır (koşullar değişmedikçe).
 */
export function devirHesapla(kasaba: Kasaba, oluO: string, varisHam: unknown, ay: number): Sonuc<DevirPlani> {
  const olu = kasaba.kar.get(oluO);
  if (!olu) return hata("sakin_yok");
  if (olu.hd?.dv) return hata("devir_yok");
  const ol = olu.hd?.ol ?? ay;
  const adaylar = varisAdaylari(kasaba, olu, ay);
  const uygun = adaylar.filter((a) => a.uygun);
  const varisId = varisHam === undefined || varisHam === null || varisHam === "" ? varsayilanVaris(kasaba, olu, ay) : varisHam;
  let varis: VarisBilgisi;
  if (varisId === UZAK) {
    if (uygun.length) return hata("varis_gecersiz");
    varis = uzakAkrabaUret(kasaba, olu, ol);
  } else {
    const aday = typeof varisId === "string" ? uygun.find((a) => a.id === varisId) : undefined;
    const n = aday ? kasaba.dizin.get(aday.i) : undefined;
    if (!n) return hata("varis_gecersiz");
    varis = { id: npcKimlik(n.i), ad: npcAdi(n, "tr"), k: n.k, d: n.d, e: n.e, an: n.an, ba: n.ba };
  }

  // Akçe: vergi, sonra vasiyet payları ya da eşit bölüşüm; yuvarlama artığı ve düşen paylar vârise.
  const tereke = Math.max(0, olu.pa);
  const vergi = Math.floor((tereke * VERGI_ORANI) / 100);
  const dagit = tereke - vergi;
  const paylar = new Map<string, { oran: number; akce: number }>();
  const ekle = (kime: string, oran: number, akce: number) => {
    const p = paylar.get(kime) ?? { oran: 0, akce: 0 };
    p.oran += oran;
    p.akce += akce;
    paylar.set(kime, p);
  };
  const vs = olu.hd?.vs?.paylar;
  const { cocuklar } = akrabalar(kasaba, olu);
  if (vs?.length) {
    for (const p of vs) ekle(canliAlici(kasaba, p.kime) ? p.kime : varis.id, p.oran, Math.floor((dagit * p.oran) / 100));
  } else {
    const alicilar: string[] = [];
    if (olu.hd?.es && canliAlici(kasaba, olu.hd.es)) alicilar.push(olu.hd.es);
    for (const c of cocuklar) alicilar.push(npcKimlik(c.i));
    if (!alicilar.includes(varis.id)) alicilar.push(varis.id);
    const oran = Math.floor(100 / alicilar.length);
    for (const a of alicilar) ekle(a, oran, Math.floor(dagit / alicilar.length));
  }
  let dagitilan = 0;
  for (const p of paylar.values()) dagitilan += p.akce;
  ekle(varis.id, 0, dagit - dagitilan);

  const kalemler: DevirKalemi[] = [];
  for (const [kime, p] of paylar) if (p.akce > 0 || kime === varis.id) kalemler.push({ tur: "pay", kime, oran: p.oran, akce: p.akce });
  if (vergi > 0) kalemler.push({ tur: "vergi", akce: vergi });
  const em = varis.id === UZAK ? 0 : (kasaba.hd?.em[varis.id.slice(1)] ?? 0);
  if (em > 0) kalemler.push({ tur: "emanet", akce: em });
  if (olu.ev && Object.keys(olu.ev).length) {
    kalemler.push({ tur: "envanter", mallar: Object.fromEntries(Object.entries(olu.ev).sort(([a], [b]) => (a < b ? -1 : 1))) });
  }
  const nam = olu.nm.map((x) => Math.floor(x * NAM_DEVIR_ORANI));
  if (nam.some((x) => x > 0)) kalemler.push({ tur: "nam", nam });
  const am = (olu.ms?.a || olu.hd?.am) as MeslekId | "" | undefined;
  if (am) kalemler.push({ tur: "aileMeslegi", meslek: am, carpan: AILE_MESLEGI_CARPANI });

  // Ata namı: NPC'lerin ölüye bakışı (ölüm ayında) vârise sönümlü anı olarak geçer; kin de geçer.
  const ata: { npc: number; yuk: number }[] = [];
  for (const [a, i] of Object.entries(kasaba.ili.get(oluO) ?? {})) {
    const npc = Number(a);
    if (!npc || !kasaba.dizin.has(npc) || npcKimlik(npc) === varis.id) continue;
    let v = i.t;
    for (const x of i.an) v += aniYuku(x, ol);
    const yuk = Math.trunc(v * ATA_NAMI_ORANI);
    if (yuk !== 0) ata.push({ npc, yuk });
  }
  ata.sort((x, y) => Math.abs(y.yuk) - Math.abs(x.yuk) || x.npc - y.npc);
  for (const x of ata.slice(0, ATA_NAMI_EN_COK).sort((p, q) => p.npc - q.npc)) kalemler.push({ tur: "ata", ...x });

  // Küsme: vasiyette payı evlatlar ortalamasının altında kalan evlat (vâris hariç).
  if (vs?.length && cocuklar.length > 1) {
    const akce = (id: string) => paylar.get(id)?.akce ?? 0;
    const ort = cocuklar.reduce((t, c) => t + akce(npcKimlik(c.i)), 0) / cocuklar.length;
    for (const c of cocuklar) {
      const id = npcKimlik(c.i);
      if (id !== varis.id && akce(id) < ort) kalemler.push({ tur: "kusme", npc: c.i, yuk: KUSME_YUKU });
    }
  }

  // Husumet: diğer oyuncuların ölüye işaretleri (düşman vârise geçer, ötekiler düşer).
  for (const s of kasaba.sakin) {
    if (s.o === oluO) continue;
    const isaret = kasaba.kar.get(s.o)?.tn[oluO];
    if (isaret) kalemler.push(isaret === "dusman" ? { tur: "husumet", kim: s.o } : { tur: "isaretSil", kim: s.o });
  }

  return basarili({
    olu: oluO,
    hesap: olu.h,
    hanedan: hanedanKimligi(olu),
    nesil: nesil(olu) + 1,
    ol,
    varis,
    tereke,
    kalemler,
    kronik: { t: "devir", k: "kronik.devir", p: { olu: oyuncuRef(olu), nesil: nesil(olu) + 1 } },
  });
}

/** NPC vâris karaktere dönüşür: listeden çıkar; eşi, çocukları, bağları ve başkalarının ona işaretleri taşınır. */
function npcyiKaraktereCevir(kasaba: Kasaba, npcI: number, kar: Karakter): void {
  const n = kasaba.dizin.get(npcI)!;
  kasaba.npc = kasaba.npc.filter((x) => x.i !== npcI);
  kasaba.dizin.delete(npcI);
  const hd = kar.hd!;
  if (n.es > 0) {
    const es = kasaba.dizin.get(n.es);
    if (es) {
      es.es = oyuncuEsKodu(kar.o);
      hd.es = npcKimlik(es.i);
    }
  } else if (n.es < 0) {
    const ok = kasaba.kar.get(`o${-n.es}`);
    if (ok?.hd && !olduMu(ok)) {
      ok.hd.es = kar.o;
      hd.es = ok.o;
    }
  }
  const co: number[] = [];
  for (const x of kasaba.npc) {
    if (x.b.length && x.b.some((b) => b[0] === npcI)) x.b = x.b.filter((b) => b[0] !== npcI);
    if (x.an === npcI || x.ba === npcI) {
      if (x.an === npcI) x.an = 0;
      if (x.ba === npcI) x.ba = 0;
      x.oe = [...(x.oe ?? []), kar.o];
      co.push(x.i);
    }
  }
  if (co.length) hd.co = co.sort((a, b) => a - b);
  const id = npcKimlik(npcI);
  for (const [o, k] of kasaba.kar) {
    if (o === kar.o || olduMu(k)) continue;
    const isaret = k.tn[id];
    if (isaret) {
      delete k.tn[id];
      k.tn[kar.o] = isaret === "dost" ? "tanidik" : isaret; // oyuncular arası dostluk karşılıklıdır
    }
    if (k.us === npcI) k.us = 0;
    const ili = kasaba.ili.get(o);
    if (ili?.[npcI]) delete ili[npcI];
  }
}

/**
 * Planı aynen uygular (tek kez: tereke kapanır, ikinci çağrı `devir_yok`). Vâris yeni yerel kimlik alır; sakin
 * dizini vârise döner (hesap aynı). Dönen olay Dönüş Kartı'na ve herkese düşer; kronik satırı kuyruğa girer.
 */
export function devirUygula(kasaba: Kasaba, plan: DevirPlani, ay: number): Sonuc<{ kar: Karakter; olay: OlayTaslagi }> {
  const hk = hanedanKasabasi(kasaba);
  const t = hk.tr.findIndex((x) => x.o === plan.olu);
  const olu = kasaba.kar.get(plan.olu);
  const s = kasaba.sakin.find((x) => x.o === plan.olu);
  if (t < 0 || !olu || !olduMu(olu) || olu.hd?.dv || !s) return hata("devir_yok");
  const npcI = plan.varis.id === UZAK ? 0 : Number(plan.varis.id.slice(1));
  if (npcI && !kasaba.dizin.has(npcI)) return hata("varis_gecersiz");
  hk.tr.splice(t, 1);

  const o = oyuncuNoAl(kasaba);
  const v = plan.varis;
  // Özellik tohumu kuşağa göre değişir (hesap + yeni kimlik); karakter kaydı yine hesabındır.
  const kar = karakterOlustur({ o, h: `${plan.hesap}/${o}`, ad: v.ad, k: v.k, d: v.d }, { e: v.e, an: v.an, ba: v.ba }, ay);
  kar.h = plan.hesap;
  kar.pa = 0;
  kar.im = olu.im;
  kar.ky = yas(v.d, ay) >= 13 ? 1 : 0;
  const ak = new Set([...(olu.hd!.co ?? []), ...(olu.hd!.ak ?? [])].filter((i) => i !== npcI && kasaba.dizin.has(i)));
  const atalar = [...(olu.hd!.at ?? []), [olu.o, olu.ad, olu.d, plan.ol] as [string, string, number, number]];
  const hd: HanedanKaydi = { h: plan.hanedan, n: plan.nesil, s: hanedanSoyadi(kasaba, olu), at: atalar };
  if (ak.size) hd.ak = [...ak].sort((a, b) => a - b);
  kar.hd = hd;
  const ili = {};
  kasaba.kar.set(o, kar);
  kasaba.ili.set(o, ili);
  if (npcI) npcyiKaraktereCevir(kasaba, npcI, kar);

  for (const k of plan.kalemler) {
    switch (k.tur) {
      case "pay":
        if (k.kime === v.id) kar.pa += k.akce;
        else if (k.kime === VAKIF) hk.vk += k.akce;
        else if (k.kime.startsWith("o")) {
          const alan = kasaba.kar.get(k.kime);
          if (alan) alan.pa += k.akce;
          else hk.hz += k.akce; // yüklenemeyen alıcı: para kaybolmaz, hazineye
        } else hk.em[k.kime.slice(1)] = (hk.em[k.kime.slice(1)] ?? 0) + k.akce;
        break;
      case "vergi":
        hk.hz += k.akce;
        break;
      case "emanet":
        kar.pa += k.akce;
        delete hk.em[String(npcI)];
        break;
      case "envanter":
        kar.ev = { ...k.mallar };
        delete olu.ev;
        break;
      case "nam":
        kar.nm = k.nam.slice(0, NAMLAR.length);
        break;
      case "aileMeslegi":
        hd.am = k.meslek;
        break;
      case "ata":
        iliskiAl(ili, k.npc).an.push(["ata", k.yuk, ay]);
        break;
      case "kusme":
        iliskiAl(ili, k.npc).an.push(["kusme", k.yuk, ay]);
        break;
      case "husumet": {
        const diger = kasaba.kar.get(k.kim);
        if (diger) {
          delete diger.tn[plan.olu];
          diger.tn[o] = "dusman";
        }
        break;
      }
      case "isaretSil":
        delete kasaba.kar.get(k.kim)?.tn[plan.olu];
        break;
    }
  }
  olu.pa -= plan.tereke;
  olu.hd!.dv = o;
  for (const f of TASIYICILAR) f(kasaba, plan.olu, o, plan);

  s.o = o;
  s.ad = kar.ad;
  s.k = kar.k;
  s.d = kar.d;
  s.e = kar.e;
  s.mk = "";
  s.ma = -1e9;
  delete s.ms;

  const varisRef: KisiRef = oyuncuRef(kar);
  kronikEkle(kasaba, { ...plan.kronik, a: ay, p: { ...plan.kronik.p, varis: varisRef } });
  const olay: OlayTaslagi = {
    t: "hanedan",
    w: o,
    h: o,
    g: "",
    n: 9,
    k: "olay.devir",
    p: { olu: oyuncuRef(olu), varis: varisRef, nesil: plan.nesil },
  };
  return basarili({ kar, olay });
}

/** Süresi dolan tereke: varsayılan vâris (vasiyet → en büyük uygun aday → uzak akraba) ile devir. */
export function varsayilanDevir(kasaba: Kasaba, oluO: string, ay: number): OlayTaslagi[] {
  const plan = devirHesapla(kasaba, oluO, undefined, ay);
  if (!plan.ok) return [];
  const r = devirUygula(kasaba, plan.deger, ay);
  return r.ok ? [r.deger.olay] : [];
}
