// Oyuncular arası teklifler (Faz 3a; GDD §5 rızaya bağlı teklifler, §13.7 hediye): ustalık–çıraklık, ortaklık, borç,
// armağan (envanterden mal ve/veya akçe; Berkay §6.1) ve görücü kancası (16+, yalnız kayıt). Her teklifin süresi ve
// cevapsız kalınca ne olacağı (alıcının olağan düzeninden) baştan yazılır; teklif sahibi beklemez. Kaynak kilitleyen
// tekliflerde emanet alınır ve ret, düşme, geri çekme ya da iptalde iade edilir. Bütün akçe hareketi oyuncular
// arasında aktarımdır (toplam akçe değişmez); yalnız NPC işi ücreti dünyadan gelir ve tek-teklif kuralıyla tavanlıdır.
// Saf fonksiyonlar: tarafların karakterleri kasabada yüklü olmalıdır (motor yükler). Hata olursa hiçbir şey değişmez.

import type { Dil } from "../icerik/adlar.ts";
import { MALLAR, malBul, type MalId } from "../icerik/mallar.ts";
import { ARACI_BEDELLERI, type AraciBedeli } from "./bilgi.ts";
import { meslekBul, type MeslekId } from "../icerik/meslekler.ts";
import { TARIFLER } from "../icerik/tarifler.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { varsayilanSonuc } from "./duzen.ts";
import { engelliMi } from "./engel.ts";
import { AZALAN_PENCERE, getiriCarpani } from "./eylem.ts";
import { karakterYasi, namEkle, takatHarca } from "./karakter.ts";
import { aracArtisi, hizmetAcik } from "./beceri-etki.ts";
import { hizmetEkle, meslekKaydi } from "./meslek.ts";
import { aracAsindir } from "./tarif.ts";
import { gostergeDegistir, toplulukAl } from "./topluluk-kayit.ts";
import { envanterEkle } from "./npc-taban.ts";
import { araciSozlesmeAc, araciSozlesmeKontrol, araciSozlesmeIptal, arabulucuYap, TAZMINAT_TAVANI } from "./arabulucu.ts";
import { tohumlu } from "./rastgele.ts";
import { acikNpcTeklifi, npcBorcTahsil, npcKabul } from "./npc-teklif.ts";
import { kisiAdi, kisiCoz, npcAdi, npcKimlik, oyuncuRef } from "./ortak.ts";
import { haneTaniklari, soylentiEkle } from "./soylenti.ts";
import { teveccuhEkle, teveccuhKademesi } from "./teveccuh.ts";
import { OYUNCU_TEKLIF_TURLERI, teklifCoz, teklifKimlik, toplumAl, type OyuncuTeklifTuru, type Sartlar, type Teklif } from "./toplum.ts";
import type { Karakter, Kasaba, OlayTaslagi } from "./tipler.ts";

/** [PARAMETRE] Genel: yaş kapısı (öğrenme dönemi biter), cevap süresi (ay), açık teklif sınırları, tutulan kapalı. */
export const TEKLIF_YASI = 13;
export const TEKLIF_SURE_AY = 2;
export const TEKLIF_ACIK_EN_COK = 5;
export const GELEN_ACIK_EN_COK = 20;
export const KAPALI_TUTULAN = 200;
/** [PARAMETRE] Ustalık–çıraklık: usta en az kalfa; çırak çırak kademesinde; aylık tecrübe bonusu; pir sayacının
 * yazılması için en az süre; usta başına aynı anda çırak; en uzun süre. */
export const USTA_KADEME_EN_AZ = 1;
export const CIRAK_AYLIK_TECRUBE = 1;
export const CIRAKLIK_EN_AZ_AY = 6;
export const USTA_CIRAK_EN_COK = 3;
export const CIRAKLIK_EN_UZUN = 36;
/** [PARAMETRE] Ortaklık: gelir payı (%), süre (ay), ortaklık başına aylık aktarım tavanı, oyuncu başına ortaklık. */
export const ORTAK_PAY_EN_COK = 25;
export const ORTAK_SURE_EN_COK = 12;
export const ORTAK_AYLIK_EN_COK = 20;
export const ORTAK_EN_COK = 2;
/** [PARAMETRE] Borç: tek borç, borçlunun toplam kalan borcu, faiz (%), vade (ay). */
export const BORC_EN_COK = 50;
export const BORC_TOPLAM_EN_COK = 60;
export const BORC_FAIZ_EN_COK = 20;
export const BORC_VADE_EN_COK = 12;
/** [PARAMETRE] Armağan (mal değeri = taban × adet, en az 1/adet; akçe aynı tavana sayılır): tek armağan değeri,
 * aylık verme ve alma tavanı, takat bedeli, cömertlik namı (aynı kişiye azalan getiri), karşılıklı döngü penceresi
 * ve aynı ocak çarpanı (hesap kümesi yaklaşığı: aynı ocaktaki armağan tavana iki kat sayılır, nam getirmez). */
export const HEDIYE_EN_COK = 40;
export const HEDIYE_VERME_AYLIK = 60;
export const HEDIYE_ALMA_AYLIK = 60;
export const HEDIYE_TAKAT = 1;
export const HEDIYE_NAM = 2;
export const HEDIYE_DONGU_ARALIK = 3;
export const AYNI_OCAK_CARPANI = 2;
export const GORUCU_YASI = 16;
/** [PARAMETRE] Alınan armağanlardan tutulan ve vitrinde gösterilen en çok sayı. */
export const ARMAGAN_TUTULAN = 20;
export const VITRIN_EN_COK = 6;

export const CEVAPLAR = ["kabul", "ret", "geri", "bitir", "ode", "teslim"] as const;
/** [PARAMETRE] Bir oyuncunun aynı anda taşıyabileceği aktif iş sözleşmesi. */
export const IS_SURER_EN_COK = 2;
export const IS_UCRET_EN_COK = 20;

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
const tamsayi = (v: unknown, alt: number, ust: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= alt && v <= ust;

/** İki meslek aynı ya da tedarik zinciriyle bağlı mı (biri ötekinin tarif girdisini ya da aracını üretir). */
export function tedarikZinciriMi(a: MeslekId, b: MeslekId): boolean {
  if (a === b) return true;
  for (const t of Object.values(TARIFLER)) {
    const mallar = [...Object.keys(t.girdi), ...("arac" in t ? [t.arac.mal] : [])] as MalId[];
    for (const m of mallar) {
      const uretici = MALLAR[m].meslek;
      if ((t.meslek === a && uretici === b) || (t.meslek === b && uretici === a)) return true;
    }
  }
  return false;
}

/** Borç: borçlu ve alacaklı. */
export function borcTaraflari(t: Teklif): { borclu: string; alacakli: string } {
  if (t.t === "npcBorc") return { borclu: t.g, alacakli: t.a };
  return t.s.yn === "iste" ? { borclu: t.g, alacakli: t.a } : { borclu: t.a, alacakli: t.g };
}

const usta = (t: Teklif) => t.s.us ?? t.g;
const cirak = (t: Teklif) => (usta(t) === t.g ? t.a : t.g);

/** Armağanın tavana sayılan değeri. */
export function hediyeDegeri(s: Sartlar): number {
  const mal = s.ml ? malBul(s.ml) : undefined;
  return (s.tu ?? 0) + (mal ? Math.max(1, MALLAR[mal].taban) * (s.mn ?? 0) : 0);
}

function aylik(sayac: [number, number] | undefined, ay: number): number {
  return sayac && sayac[0] === ay ? sayac[1] : 0;
}

function kalanBorc(k: Kasaba, borclu: string): number {
  return (k.tp?.tk ?? []).filter((t) => t.d === "surer" && (t.t === "borc" || t.t === "npcBorc") && borcTaraflari(t).borclu === borclu).reduce((a, t) => a + (t.kl ?? 0), 0);
}

function surenler(k: Kasaba, o: string, tur: Teklif["t"]): Teklif[] {
  return (k.tp?.tk ?? []).filter((t) => t.d === "surer" && t.t === tur && (t.g === o || t.a === o));
}

/** Süren çıraklıkta bu oyuncunun bu meslekteki ustası (yerel kimlik; beceri süresi kısaltma için). */
export function ciraklikUstasi(k: Kasaba, cirakO: string, m: MeslekId): string | undefined {
  const t = surenler(k, cirakO, "cirak").find((x) => cirak(x) === cirakO && x.s.m === m);
  return t ? usta(t) : undefined;
}

/** Meslek ilerlemesi (kayıt yoksa undefined). */
function ilerleme(kar: Karakter, m: MeslekId) {
  return kar.ms?.s[m];
}

/** Çıraklık şartları (oluşturma ve kabulde aynı denetim). */
function cirakDenetle(k: Kasaba, u: Karakter, c: Karakter, m: MeslekId, ay: number, kabul: boolean): Sonuc<null> {
  if ((ilerleme(u, m)?.kd ?? 0) < USTA_KADEME_EN_AZ) return hata("kademe_kapali");
  if (karakterYasi(c, ay) < TEKLIF_YASI) return hata("yas_kapisi");
  if ((ilerleme(c, m)?.kd ?? 0) > 0) return hata("hedef_uygun_degil");
  if (surenler(k, c.o, "cirak").some((t) => cirak(t) === c.o)) return hata("zaten_cirak");
  if (surenler(k, u.o, "cirak").filter((t) => usta(t) === u.o).length >= USTA_CIRAK_EN_COK) return hata("tavan_doldu");
  if (kabul) {
    const mk = meslekKaydi(c);
    if (mk.a !== m && mk.y !== m) return hata("meslek_yok");
  }
  return basarili(null);
}

function ortakDenetle(k: Kasaba, a: Karakter, b: Karakter): Sonuc<null> {
  const ma = a.ms?.a;
  const mb = b.ms?.a;
  if (!ma || !mb) return hata("meslek_yok");
  if (!tedarikZinciriMi(ma, mb)) return hata("teklif_gecersiz");
  if (surenler(k, a.o, "ortak").length >= ORTAK_EN_COK || surenler(k, b.o, "ortak").length >= ORTAK_EN_COK) return hata("tavan_doldu");
  if (surenler(k, a.o, "ortak").some((t) => t.g === b.o || t.a === b.o)) return hata("teklif_gecersiz");
  return basarili(null);
}

/** Karşılıklı armağan döngüsü: alıcı son pencere içinde gönderene armağan verdiyse (ya da açık armağanı varsa). */
function donguVar(k: Kasaba, gon: Karakter, alici: Karakter, ay: number): boolean {
  if ((alici.hg?.[gon.o] ?? []).some((a) => ay - a < HEDIYE_DONGU_ARALIK)) return true;
  return (k.tp?.tk ?? []).some((t) => t.t === "hediye" && t.d === "acik" && t.g === alici.o && t.a === gon.o);
}

const ocakCarpani = (a: Karakter, b: Karakter) => (a.e !== 0 && a.e === b.e ? AYNI_OCAK_CARPANI : 1);

/** Gelen POST /v1/teklif gövdesinden şartları çözer (türe özgü sınırlar). */
function sartlarCoz(tur: OyuncuTeklifTuru, g: Record<string, unknown>, gon: Karakter, alici: Karakter): Sonuc<Sartlar> {
  switch (tur) {
    case "cirak": {
      const m = meslekBul(g.meslek);
      if (!m) return hata("meslek_gecersiz");
      const ustaBen = g.ustaBen === undefined ? true : g.ustaBen;
      if (typeof ustaBen !== "boolean") return hata("teklif_gecersiz");
      return basarili({ m: m.id, us: ustaBen ? gon.o : alici.o });
    }
    case "ortak":
      if (!tamsayi(g.pay, 1, ORTAK_PAY_EN_COK) || !tamsayi(g.sure, 1, ORTAK_SURE_EN_COK)) return hata("teklif_gecersiz");
      return basarili({ py: g.pay, sr: g.sure });
    case "borc": {
      const yn = g.yon === undefined ? "ver" : g.yon;
      if (yn !== "ver" && yn !== "iste") return hata("teklif_gecersiz");
      if (!tamsayi(g.tutar, 1, BORC_EN_COK) || !tamsayi(g.vade, 1, BORC_VADE_EN_COK)) return hata("teklif_gecersiz");
      const fz = g.faiz === undefined ? 0 : g.faiz;
      if (!tamsayi(fz, 0, BORC_FAIZ_EN_COK)) return hata("teklif_gecersiz");
      if (g.senetli !== undefined && g.senetli !== true && g.senetli !== false) return hata("teklif_gecersiz");
      return basarili({ yn, tu: g.tutar, va: g.vade, fz, ...(g.senetli === true ? { sn: 1 as const } : {}) });
    }
    case "hediye": {
      const s: Sartlar = {};
      if (g.tutar !== undefined) {
        if (!tamsayi(g.tutar, 0, HEDIYE_EN_COK)) return hata("teklif_gecersiz");
        if (g.tutar > 0) s.tu = g.tutar;
      }
      if (g.mal !== undefined) {
        const mal = malBul(g.mal);
        if (!mal) return hata("mal_gecersiz");
        if (!tamsayi(g.adet, 1, HEDIYE_EN_COK)) return hata("teklif_gecersiz");
        s.ml = mal;
        s.mn = g.adet;
      }
      const deger = hediyeDegeri(s);
      if (deger < 1 || deger > HEDIYE_EN_COK) return hata("teklif_gecersiz");
      return basarili(s);
    }
    case "gorucu":
      return basarili({});
    case "is": {
      const it = g.is;
      if (typeof it !== "string" || !["arabuluculuk", "muhafiz", "mektup"].includes(it) || !tamsayi(g.tutar, 1, IS_UCRET_EN_COK)) return hata("teklif_gecersiz");
      if (it === "arabuluculuk") {
        const npcHam = typeof g.arabuluculukNpc === "string" ? g.arabuluculukNpc.trim() : "";
        const npc = kisiCoz(npcHam);
        const bedel = g.arabuluculukBedel;
        if (!npc || npc.tur !== "npc" || typeof bedel !== "string" || !(ARACI_BEDELLERI as readonly string[]).includes(bedel)) return hata("teklif_gecersiz");
        const miktar = bedel === "tazminat" ? g.arabuluculukMiktar : 0;
        if (bedel === "tazminat" ? !tamsayi(miktar, 1, TAZMINAT_TAVANI) : g.arabuluculukMiktar !== undefined && g.arabuluculukMiktar !== 0) return hata("teklif_gecersiz");
        return basarili({ it, tu: g.tutar, an: npc.i, ab: bedel as AraciBedeli, am: miktar as number });
      }
      if (it === "mektup") {
        const hedef = typeof g.mektupHedef === "string" ? g.mektupHedef.trim() : "";
        const mesaj = typeof g.mektupMetni === "string" ? g.mektupMetni.trim() : "";
        if (!/^o[1-9][0-9]{0,8}$/.test(hedef) || mesaj.length < 1 || mesaj.length > 240) return hata("teklif_gecersiz");
        return basarili({ it, tu: g.tutar, he: hedef, ms: mesaj });
      }
      return basarili({ it: it as "arabuluculuk" | "muhafiz" | "mektup", tu: g.tutar });
    }
  }
}

/**
 * POST /v1/teklif: teklif açar. Ortak kapılar: kendine teklif yok, engel yok, ikisi de 13+, açık teklif sınırları,
 * aynı çift arasında aynı türde tek açık teklif. İş sözleşmesinde ücret gönderenden emanet alınır; kabul/teslim ve iade sunucuda yönetilir.
 */
export function teklifOlustur(k: Kasaba, gon: Karakter, alici: Karakter, govde: Record<string, unknown>, ay: number): Sonuc<{ teklif: Teklif; olaylar: OlayTaslagi[] }> {
  const tur = govde.tur;
  if (typeof tur !== "string" || !(OYUNCU_TEKLIF_TURLERI as readonly string[]).includes(tur)) return hata("teklif_gecersiz");
  const t_ = tur as OyuncuTeklifTuru;
  if (gon.o === alici.o) return hata("kendine");
  if (engelliMi(k.tp, gon.o, alici.o)) return hata("engelli");
  if (karakterYasi(gon, ay) < TEKLIF_YASI || karakterYasi(alici, ay) < TEKLIF_YASI) return hata("yas_kapisi");
  if (t_ === "gorucu" && (karakterYasi(gon, ay) < GORUCU_YASI || karakterYasi(alici, ay) < GORUCU_YASI)) return hata("yas_kapisi");
  if (t_ === "is" && (gon.h === alici.h || (gon.e !== 0 && gon.e === alici.e))) return hata("ayni_kume");
  const acik = (k.tp?.tk ?? []).filter((t) => t.d === "acik");
  if (acik.filter((t) => t.g === gon.o).length >= TEKLIF_ACIK_EN_COK) return hata("teklif_siniri");
  if (acik.filter((t) => t.a === alici.o).length >= GELEN_ACIK_EN_COK) return hata("teklif_siniri");
  if (acik.some((t) => t.t === t_ && ((t.g === gon.o && t.a === alici.o) || (t.g === alici.o && t.a === gon.o)))) return hata("teklif_siniri");
  if (t_ === "is") {
    const aktifIsSayisi = (oyuncu: string) => (k.tp?.tk ?? []).filter((t) => t.t === "is" && t.d === "surer" && (t.g === oyuncu || t.a === oyuncu)).length;
    if (aktifIsSayisi(gon.o) >= IS_SURER_EN_COK || aktifIsSayisi(alici.o) >= IS_SURER_EN_COK) return hata("teklif_siniri");
    if ((k.tp?.tk ?? []).some((t) => t.t === "is" && t.d === "surer" && ((t.g === gon.o && t.a === alici.o) || (t.g === alici.o && t.a === gon.o)))) return hata("teklif_siniri");
  }
  const sr = sartlarCoz(t_, govde, gon, alici);
  if (!sr.ok) return sr;
  const s = sr.deger;
  if (t_ === "is" && s.it === "arabuluculuk") {
    const npc = s.an === undefined ? undefined : k.dizin.get(s.an);
    const ar = araciSozlesmeKontrol(k, gon, alici, s.an ?? 0, s.ab!, s.am ?? 0, ay);
    if (!ar.ok) return ar;
    if (!npc) return hata("kisi_yok");
  }
  if (t_ === "is" && s.it === "mektup") {
    const hedef = s.he ? k.kar.get(s.he) : undefined;
    if (!hedef || hedef.o === gon.o || hedef.o === alici.o) return hata("kisi_yok");
    if (engelliMi(k.tp, gon.o, hedef.o) || engelliMi(k.tp, alici.o, hedef.o)) return hata("engelli");
    if (gon.h === hedef.h || alici.h === hedef.h || (gon.e !== 0 && gon.e === hedef.e) || (alici.e !== 0 && alici.e === hedef.e)) return hata("ayni_kume");
    if ((k.tp?.tk ?? []).some((x) => x.t === "is" && x.s.it === "mektup" && x.g === gon.o && x.s.he === hedef.o && x.ac === ay)) return hata("teklif_siniri");
  }
  let e = 0;
  if (t_ === "cirak") {
    const u = s.us === gon.o ? gon : alici;
    const c = u === gon ? alici : gon;
    const d = cirakDenetle(k, u, c, s.m!, ay, false);
    if (!d.ok) return d;
  } else if (t_ === "ortak") {
    const d = ortakDenetle(k, gon, alici);
    if (!d.ok) return d;
  } else if ((t_ === "borc" && s.yn === "ver") || t_ === "is") {
    const tazminatEmaneti = t_ === "is" && s.it === "arabuluculuk" ? (s.am ?? 0) : 0;
    e = (s.tu ?? 0) + tazminatEmaneti;
    if (gon.pa < e) return hata("para_yok");
  } else if (t_ === "borc" && s.sn === 1 && s.yn === "ver") {
    if ((gon.ev?.senet ?? 0) < 1) return hata("mal_yok");
    envanterEkle(gon, "senet", -1);
    s.se = 1;
  } else if (t_ === "hediye") {
    if (donguVar(k, gon, alici, ay)) return hata("hediye_dongu");
    const deger = hediyeDegeri(s) * ocakCarpani(gon, alici);
    if (aylik(gon.hv, ay) + deger > HEDIYE_VERME_AYLIK) return hata("tavan_doldu");
    if (gon.pa < (s.tu ?? 0)) return hata("para_yok");
    if (s.ml && (gon.ev?.[s.ml] ?? 0) < s.mn!) return hata("mal_yok");
    if (!takatHarca(gon, ay, HEDIYE_TAKAT)) return hata("takat_yok");
    gon.hv = [ay, aylik(gon.hv, ay) + deger];
    e = s.tu ?? 0;
    if (s.ml) {
      // "Yapan" izi: kendi ürettiği (tarifle) ve hâlâ elinde olan adet kadar; satılan ürünler envanterle kırpılır.
      const ur = Math.min(gon.ur?.[s.ml] ?? 0, gon.ev?.[s.ml] ?? 0);
      if (ur >= s.mn!) {
        s.yp = gon.o;
        gon.ur![s.ml] = ur - s.mn!;
      }
      envanterEkle(gon, s.ml as MalId, -s.mn!);
    }
  }
  gon.pa -= e;
  const tp = toplumAl(k);
  const teklif: Teklif = { i: tp.tn++, t: t_, g: gon.o, a: alici.o, s, e, ac: ay, sa: ay + TEKLIF_SURE_AY - 1, v: varsayilanSonuc(alici, t_, s), d: "acik" };
  tp.tk.push(teklif);
  const olay: OlayTaslagi = {
    t: "teklif", w: gon.o, h: alici.o, g: alici.o, n: 6, k: `olay.teklif.geldi.${t_}`,
    p: { kisi: oyuncuRef(gon), teklif: teklifKimlik(teklif.i) },
  };
  return basarili({ teklif, olaylar: [olay] });
}

/** Emaneti gönderene iade eder (akçe ve armağan malı). */
function iade(k: Kasaba, t: Teklif): void {
  const gon = k.kar.get(t.g);
  if (!gon) return;
  gon.pa += t.e;
  t.e = 0;
  if (t.t === "hediye" && t.s.ml && t.s.mn) {
    envanterEkle(gon, t.s.ml as MalId, t.s.mn);
    if (t.s.yp === gon.o) (gon.ur ??= {})[t.s.ml] = (gon.ur[t.s.ml] ?? 0) + t.s.mn;
    t.s.mn = 0;
  }
  if (t.t === "borc" && t.s.se === 1) {
    envanterEkle(gon, "senet", 1);
    delete t.s.se;
  }
}

function kapat(k: Kasaba, t: Teklif, d: Teklif["d"], ay: number, sn?: string): void {
  if (t.t === "is" && t.s.it === "arabuluculuk" && t.s.ta !== undefined) araciSozlesmeIptal(k, t.s.ta, t.i, ay);
  t.d = d;
  t.kp = ay;
  if (sn) t.sn = sn;
  if (d !== "surer" && d !== "bitti") iade(k, t);
  if (t.g.startsWith("n")) {
    const a = k.kar.get(t.a);
    if (a) a.nt = ay;
  }
}

/** Kabulün etkisi. Önce denetler, sonra uygular (hata olursa hiçbir şey değişmez). */
function kabulUygula(k: Kasaba, t: Teklif, ay: number): Sonuc<OlayTaslagi[]> {
  const alici = k.kar.get(t.a);
  if (!alici) return hata("sakin_yok");
  if (t.g.startsWith("n")) return npcKabul(k, t, alici, ay);
  const gon = k.kar.get(t.g);
  if (!gon) return hata("sakin_yok");
  if (engelliMi(k.tp, gon.o, alici.o)) return hata("engelli");
  const olaylar: OlayTaslagi[] = [];
  const herkese = (kk: string, n: number, p: OlayTaslagi["p"], w = gon.o, h = alici.o): OlayTaslagi => ({ t: "teklif", w, h, g: "", n, k: kk, p });
  switch (t.t) {
    case "cirak": {
      const u = k.kar.get(usta(t))!;
      const c = k.kar.get(cirak(t))!;
      const d = cirakDenetle(k, u, c, t.s.m!, ay, true);
      if (!d.ok) return d;
      t.d = "surer";
      olaylar.push(herkese("olay.ciraklik.oyuncu", 5, { usta: oyuncuRef(u), cirak: oyuncuRef(c), meslek: t.s.m! }, u.o, c.o));
      break;
    }
    case "ortak": {
      const d = ortakDenetle(k, gon, alici);
      if (!d.ok) return d;
      t.d = "surer";
      t.bt = ay + t.s.sr!;
      t.pa = [ay, 0];
      olaylar.push(herkese("olay.ortaklik", 4, { a: oyuncuRef(gon), b: oyuncuRef(alici) }));
      break;
    }
    case "borc": {
      const { borclu, alacakli } = borcTaraflari(t);
      const tu = t.s.tu!;
      const kl = Math.round((tu * (100 + (t.s.fz ?? 0))) / 100);
      if (kalanBorc(k, borclu) + kl > BORC_TOPLAM_EN_COK) return hata("tavan_doldu");
      const b = k.kar.get(borclu)!;
      const a = k.kar.get(alacakli)!;
      if (t.s.sn === 1 && t.s.yn === "iste" && (a.ev?.senet ?? 0) < 1) return hata("mal_yok");
      if (t.s.yn === "iste") {
        if (a.pa < tu) return hata("para_yok");
        a.pa -= tu;
      } else {
        t.e = 0; // emanet borçluya geçer
        if (t.s.se === 1) delete t.s.se; // göndericinin senedi kabulde kesinleşir
      }
      if (t.s.sn === 1 && t.s.yn === "iste") envanterEkle(a, "senet", -1);
      b.pa += tu;
      t.kl = kl;
      t.vd = ay + t.s.va!;
      t.d = "surer";
      break;
    }
    case "hediye": {
      const carpan = ocakCarpani(gon, alici);
      const deger = hediyeDegeri(t.s) * carpan;
      if (aylik(alici.ha, ay) + deger > HEDIYE_ALMA_AYLIK) return hata("tavan_doldu");
      alici.ha = [ay, aylik(alici.ha, ay) + deger];
      alici.pa += t.e;
      t.e = 0;
      if (t.s.ml && t.s.mn) envanterEkle(alici, t.s.ml as MalId, t.s.mn);
      const aylar = (gon.hg ??= {})[alici.o] ?? [];
      const tekrar = aylar.filter((a) => ay - a < AZALAN_PENCERE).length;
      if (carpan === 1) namEkle(gon, ay, "comertlik", Math.round(HEDIYE_NAM * getiriCarpani(tekrar)));
      gon.hg[alici.o] = [...aylar.filter((a) => ay - a < AZALAN_PENCERE), ay];
      soylentiEkle(k, "hediyeOyuncu", gon.o, alici.o, haneTaniklari(k, [alici.e], ay, `hediye:${t.i}`), ay);
      teveccuhEkle(alici, gon, "armagan", ay, hediyeDegeri(t.s));
      const sakin = k.sakin.find((x) => x.o === alici.o);
      if (sakin) sakin.tv = teveccuhKademesi(alici, ay) || undefined;
      const yapan = t.s.yp ? k.kar.get(t.s.yp) : undefined;
      (alici.av ??= []).push({
        i: t.i, v: gon.o, va: gon.ad, ay,
        ...(t.s.tu ? { tu: t.s.tu } : {}),
        ...(t.s.ml ? { ml: t.s.ml, mn: t.s.mn } : {}),
        ...(yapan ? { yp: yapan.o, ypa: yapan.ad } : {}),
      });
      if (alici.av.length > ARMAGAN_TUTULAN) alici.av.splice(0, alici.av.length - ARMAGAN_TUTULAN);
      t.d = "bitti";
      t.sn = "verildi";
      break;
    }
    case "gorucu":
      t.d = "bitti";
      t.sn = "kayit";
      break;
    case "is": {
      // Teklif açılırken iki taraf da denetlenir; fakat karşı tarafın bekleyen başka teklifi
      // bu arada kabul edilmiş olabilir. Kabul anında göndereni ve çalışanı birlikte yeniden say.
      const aktifIsSayisi = (oyuncu: string) => (k.tp?.tk ?? []).filter((x) => x.t === "is" && x.d === "surer" && (x.g === oyuncu || x.a === oyuncu)).length;
      if (aktifIsSayisi(gon.o) >= IS_SURER_EN_COK || aktifIsSayisi(alici.o) >= IS_SURER_EN_COK) return hata("teklif_siniri");
      const kural = isKurali(t.s.it);
      if (!kural || !hizmetAcik(alici, kural.hizmet)) return hata("dugum_kapali");
      if (t.s.it === "arabuluculuk") {
        const ac = araciSozlesmeAc(k, gon, alici, t.s.an!, t.s.ab!, t.s.am ?? 0, ay, t.i);
        if (!ac.ok) return ac;
        t.s.ta = ac.deger.talep.i;
        t.e -= t.s.am ?? 0;
        olaylar.push(ac.deger.olay);
      }
      t.d = "surer";
      t.sa = ay + 1; // kabulden sonra bir oyun ayı teslim penceresi
      break;
    }
    default:
      return hata("teklif_gecersiz");
  }
  t.ka = ay;
  if (t.d === "bitti") t.kp = ay;
  olaylar.push({ t: "teklif", w: alici.o, h: gon.o, g: gon.o, n: 6, k: `olay.teklif.kabul.${t.t}`, p: { kisi: oyuncuRef(alici), teklif: teklifKimlik(t.i) } });
  return basarili(olaylar);
}

/** Teklifin tarafı olan oyuncu kimlikleri (yüklenecekler). */
export function teklifTaraflari(t: Teklif): string[] {
  return [t.g, t.a, ...(t.s.he ? [t.s.he] : [])].filter((x) => x.startsWith("o"));
}

export function teklifBul(k: Kasaba, idHam: unknown): Teklif | undefined {
  const i = teklifCoz(idHam);
  return i === undefined ? undefined : k.tp?.tk.find((t) => t.i === i);
}

/**
 * POST /v1/teklif/:id/cevap {cevap}: alıcı kabul|ret; gönderen geri; taraflar bitir (ortaklık, çıraklık); borçlu
 * ode {tutar?}. Taraf olmayan teklifi göremez (teklif_yok).
 */
export function teklifCevap(k: Kasaba, ben: Karakter, idHam: unknown, cevap: unknown, govde: Record<string, unknown>, ay: number): Sonuc<{ teklif: Teklif; olaylar: OlayTaslagi[] }> {
  const t = teklifBul(k, idHam);
  if (!t || (t.g !== ben.o && t.a !== ben.o)) return hata("teklif_yok");
  const olaylar: OlayTaslagi[] = [];
  switch (cevap) {
    case "kabul": {
      if (t.a !== ben.o) return hata("taraf_degil");
      if (t.d !== "acik" || ay > t.sa) return hata("teklif_kapandi");
      // Eski sürümde açılmış, NPC hedefi bulunmayan arabuluculuk teklifleri yeni gerçek akışa taşınamaz;
      // kabulde eski emaneti sessizce kilitlemek yerine kapatıp sahibine iade et.
      if (t.t === "is" && t.s.it === "arabuluculuk" && t.s.an === undefined) {
        kapat(k, t, "dustu", ay, "dustu");
        olaylar.push({ t: "teklif", w: ben.o, h: t.g, g: t.g, n: 5, k: "olay.teklif.bitti.is", p: { kisi: oyuncuRef(ben), teklif: teklifKimlik(t.i) } });
        break;
      }
      const r = kabulUygula(k, t, ay);
      if (!r.ok) return r;
      olaylar.push(...(t.g.startsWith("n") ? [] : r.deger));
      break;
    }
    case "ret":
      if (t.a !== ben.o) return hata("taraf_degil");
      if (t.d !== "acik") return hata("teklif_kapandi");
      kapat(k, t, "ret", ay);
      if (!t.g.startsWith("n")) olaylar.push({ t: "teklif", w: ben.o, h: t.g, g: t.g, n: 5, k: `olay.teklif.ret.${t.t}`, p: { kisi: oyuncuRef(ben), teklif: teklifKimlik(t.i) } });
      break;
    case "geri":
      if (t.g !== ben.o) return hata("taraf_degil");
      if (t.d !== "acik") return hata("teklif_kapandi");
      kapat(k, t, "geri", ay);
      break;
    case "bitir":
      if (t.d !== "surer" || (t.t !== "ortak" && t.t !== "cirak" && t.t !== "is")) return hata("teklif_kapandi");
      if (t.t === "is") {
        kapat(k, t, "iptal", ay, "iptal");
        olaylar.push({ t: "teklif", w: ben.o, h: t.g === ben.o ? t.a : t.g, g: t.g === ben.o ? t.a : t.g, n: 6, k: "olay.teklif.bitti.is", p: { kisi: oyuncuRef(ben), teklif: teklifKimlik(t.i) } });
        break;
      }
      kapat(k, t, "bitti", ay, "bitirildi");
      olaylar.push({ t: "teklif", w: ben.o, h: t.g === ben.o ? t.a : t.g, g: t.g === ben.o ? t.a : t.g, n: 6, k: `olay.teklif.bitti.${t.t}`, p: { kisi: oyuncuRef(ben), teklif: teklifKimlik(t.i) } });
      break;
    case "teslim": {
      // Eski sürümdeki NPC hedefi bulunmayan arabuluculuk sözleşmeleri gerçek talep defterine taşınamaz.
      // Teslim denemesinde ücret emanetini sahibine iade edip eski kaydı kapat.
      if (t.d === "surer" && t.t === "is" && t.a === ben.o && t.s.it === "arabuluculuk" && t.s.an === undefined && t.s.ta === undefined) {
        kapat(k, t, "iptal", ay, "eskiArabuluculuk");
        olaylar.push({ t: "teklif", w: ben.o, h: t.g, g: t.g, n: 5, k: "olay.teklif.bitti.is", p: { kisi: oyuncuRef(ben), teklif: teklifKimlik(t.i) } });
        break;
      }
      if (t.d !== "surer" || t.t !== "is" || t.a !== ben.o) return hata("teklif_kapandi");
      if (ay > t.sa) return hata("teklif_kapandi");
      // Eski sürümde kabul edilmiş NPC hedefi olmayan arabuluculuk sözleşmesi teslim edilemez.
      // Kilitli hizmet ücretini sahibine iade edip sözleşmeyi kapat.
      if (t.s.it === "arabuluculuk" && t.s.ta === undefined) {
        kapat(k, t, "iptal", ay, "iptal");
        olaylar.push({ t: "teklif", w: ben.o, h: t.g, g: t.g, n: 6, k: "olay.teklif.bitti.is", p: { kisi: oyuncuRef(ben), teklif: teklifKimlik(t.i) } });
        break;
      }
      const mektupHedef = t.s.it === "mektup" ? k.kar.get(t.s.he ?? "") : undefined;
      const mektupGonderen = t.s.it === "mektup" ? k.kar.get(t.g) : undefined;
      if (t.s.it === "mektup" && (!mektupHedef || !mektupGonderen || !t.s.ms)) return hata("kisi_yok");
      if (mektupHedef && (engelliMi(k.tp, t.g, mektupHedef.o) || engelliMi(k.tp, ben.o, mektupHedef.o))) return hata("engelli");
      const kural = isKurali(t.s.it);
      if (!kural || !hizmetAcik(ben, kural.hizmet)) return hata("dugum_kapali");
      let arabuluculukSonucu: string | undefined;
      if (t.s.it === "arabuluculuk") {
        if (t.s.ta === undefined) return hata("talep_yok");
        const ili = k.ili.get(ben.o);
        const sakin = k.sakin.find((x) => x.o === ben.o);
        if (!ili || !sakin) return hata("sakin_yok");
        const mr = arabulucuYap({ k, kar: ben, ili, s: sakin, ay }, { talep: t.s.ta }, tohumlu("ucgen", k.y, ay, ben.o, "arabulucu", t.s.ta), t.i);
        if (!mr.ok) return mr;
        olaylar.push(...mr.deger.olaylar);
        arabuluculukSonucu = String(mr.deger.yanit.sonuc ?? "");
        if (arabuluculukSonucu === "baris" || arabuluculukSonucu === "sartli" || arabuluculukSonucu === "ateskes") gostergeDegistir(toplulukAl(k), "moral", 1);
        else if (arabuluculukSonucu === "ret") gostergeDegistir(toplulukAl(k), "moral", -1);
      } else {
        if (kural.arac && (!kural.aracHedef || aracArtisi(ben, kural.aracHedef)?.mal !== kural.arac || (ben.ev?.[kural.arac] ?? 0) < 1)) return hata("arac_yok");
        if (!takatHarca(ben, ay, kural.takat)) return hata("takat_yok");
        if (kural.arac) aracAsindir(ben, kural.arac);
        gostergeDegistir(toplulukAl(k), kural.gosterge, 1);
      }
      const odul = t.e;
      ben.pa += odul;
      t.e = 0;
      hizmetEkle(ben, kural.meslek, kural.takat * 2);
      t.d = "bitti";
      t.kp = ay;
      t.sn = arabuluculukSonucu ? `arabuluculuk_${arabuluculukSonucu}` : "teslim";
      olaylar.push({ t: "teklif", w: ben.o, h: t.g, g: t.g, n: 6, k: "olay.teklif.teslim.is", p: { kisi: oyuncuRef(ben), tutar: odul, ...(arabuluculukSonucu ? { sonuc: arabuluculukSonucu } : {}) } });
      if (mektupHedef && mektupGonderen && t.s.ms) {
        olaylar.push({
          t: "teklif", w: ben.o, h: mektupHedef.o, g: mektupHedef.o, n: 7,
          k: "olay.teklif.mektupUlasti", p: { kisi: oyuncuRef(mektupGonderen), mesaj: t.s.ms },
        });
        olaylar.push({
          t: "teklif", w: ben.o, h: mektupGonderen.o, g: mektupGonderen.o, n: 5,
          k: "olay.teklif.mektupTeslim", p: { kisi: oyuncuRef(mektupHedef) },
        });
      }
      break;
    }
    case "ode": {
      if (t.d !== "surer" || t.t !== "borc") return hata("teklif_kapandi");
      const { borclu, alacakli } = borcTaraflari(t);
      if (borclu !== ben.o) return hata("taraf_degil");
      const istenen = govde.tutar === undefined ? (t.kl ?? 0) : govde.tutar;
      if (!tamsayi(istenen, 1, BORC_EN_COK * 2)) return hata("teklif_gecersiz");
      const tutar = Math.min(istenen, t.kl ?? 0, ben.pa);
      if (tutar <= 0) return hata("para_yok");
      olaylar.push(...borcOde(k, t, tutar, ay, borclu, alacakli));
      break;
    }
    default:
      return hata("gecersiz_istek");
  }
  return basarili({ teklif: t, olaylar });
}

function borcOde(k: Kasaba, t: Teklif, tutar: number, ay: number, borclu: string, alacakli: string): OlayTaslagi[] {
  const b = k.kar.get(borclu);
  const a = k.kar.get(alacakli);
  if (!b || !a || tutar <= 0) return [];
  b.pa -= tutar;
  a.pa += tutar;
  (t.bo ??= []).push([ay, tutar]);
  t.kl = (t.kl ?? 0) - tutar;
  if (t.kl <= 0) {
    t.kl = 0;
    kapat(k, t, "bitti", ay, "odendi");
    return [{ t: "teklif", w: borclu, h: alacakli, g: alacakli, n: 5, k: "olay.borc.odendi", p: { kisi: oyuncuRef(b), tutar } }];
  }
  return [{ t: "teklif", w: borclu, h: alacakli, g: alacakli, n: 4, k: "olay.borc.taksit", p: { kisi: oyuncuRef(b), tutar, kalan: t.kl } }];
}

interface IsKurali { hizmet: string; meslek: "arabulucu" | "asker" | "katip"; takat: number; gosterge: "moral" | "asayis"; arac?: "zincir"; aracHedef?: string; }
function isKurali(tur: Sartlar["it"]): IsKurali | undefined {
  switch (tur) {
    case "arabuluculuk": return { hizmet: "araBul", meslek: "arabulucu", takat: 1, gosterge: "moral" };
    case "muhafiz": return { hizmet: "muhafizlik", meslek: "asker", takat: 2, gosterge: "asayis", arac: "zincir", aracHedef: "muhafizlik" };
    case "mektup": return { hizmet: "mektup", meslek: "katip", takat: 1, gosterge: "moral" };
    default: return undefined;
  }
}

/** Engelleme: açık teklifler ve iş sözleşmeleri emanet iadesiyle iptal; süren çıraklık/ortaklık biter, borç sürer. */
export function taraflarArasiIptal(k: Kasaba, x: string, y: string, ay: number): void {
  for (const t of k.tp?.tk ?? []) {
    const arada = (t.g === x && t.a === y) || (t.g === y && t.a === x);
    if (!arada) continue;
    if (t.d === "acik") kapat(k, t, "iptal", ay, "engel");
    else if (t.d === "surer" && (t.t === "ortak" || t.t === "cirak")) kapat(k, t, "bitti", ay, "engel");
    else if (t.d === "surer" && t.t === "is") kapat(k, t, "iptal", ay, "engel");
  }
}

/**
 * Ortaklık gelir payı: ortak NPC'ye satış ya da sipariş ödülü kazandığında payı (yüzde, ortaklık başına aylık
 * tavanlı) ortağına aktarılır. Ortak karakterleri yüklü olmalıdır. Aktarılanların listesini döndürür.
 */
export function ortakPayi(k: Kasaba, kazanan: Karakter, tutar: number, ay: number): { ortak: string; akce: number }[] {
  const sonuc: { ortak: string; akce: number }[] = [];
  if (tutar <= 0) return sonuc;
  for (const t of surenler(k, kazanan.o, "ortak")) {
    const diger = k.kar.get(t.g === kazanan.o ? t.a : t.g);
    if (!diger) continue;
    if (!t.pa || t.pa[0] !== ay) t.pa = [ay, 0];
    const pay = Math.min(Math.floor((tutar * (t.s.py ?? 0)) / 100), ORTAK_AYLIK_EN_COK - t.pa[1], kazanan.pa);
    if (pay <= 0) continue;
    kazanan.pa -= pay;
    diger.pa += pay;
    t.pa[1] += pay;
    sonuc.push({ ortak: diger.o, akce: pay });
  }
  return sonuc;
}

/** Bir oyuncunun süren ortaklıklarındaki ortaklar (motor ödemeden önce yükler). */
export function ortaklar(k: Kasaba, o: string): string[] {
  return surenler(k, o, "ortak").map((t) => (t.g === o ? t.a : t.g));
}

/**
 * Ay dönümü (bütün sakinler yüklü): son cevap ayı geçen açık teklife varsayılan uygulanır (kabul olmazsa düşer ve
 * emanet döner); çıraklık aylık tecrübesi ve kalfalık (ustanın pir sayacı, tek sefer); ortaklık süre sonu; vadesi
 * gelen borç tahsilatı (borçlunun parası yettiği kadar; kalanı kayıtlı kalır, ilk gecikmede tek söylenti).
 */
export function teklifDonumu(k: Kasaba, ay: number): OlayTaslagi[] {
  const tp = k.tp;
  if (!tp) return [];
  const olaylar: OlayTaslagi[] = [];
  for (const t of tp.tk) {
    if (t.d === "acik" && ay > t.sa) {
      const npc = t.g.startsWith("n");
      let sonuc: "kabul" | "ret" | "dustu" = t.v;
      if (sonuc === "kabul") {
        const r = kabulUygula(k, t, ay);
        if (r.ok) {
          olaylar.push(...r.deger);
          olaylar.push({ t: "teklif", w: t.g, h: t.a, g: t.a, n: 5, k: "olay.teklif.duzen", p: { teklif: teklifKimlik(t.i), tur: t.t } });
          continue;
        }
        sonuc = "dustu";
      }
      kapat(k, t, sonuc === "ret" ? "ret" : "dustu", ay);
      if (!npc) olaylar.push({ t: "teklif", w: t.a, h: t.g, g: t.g, n: 4, k: `olay.teklif.${sonuc === "ret" ? "ret" : "dustu"}.${t.t}`, p: { teklif: teklifKimlik(t.i) } });
      continue;
    }
    if (t.d !== "surer") continue;
    if (t.t === "cirak") olaylar.push(...ciraklikDonumu(k, t, ay));
    else if (t.t === "ortak" && ay >= (t.bt ?? 0)) kapat(k, t, "bitti", ay, "sure");
    else if (t.t === "is" && ay > t.sa) kapat(k, t, "dustu", ay, "sure");
    else if (t.t === "npcBorc") olaylar.push(...npcBorcTahsil(k, t, ay));
    else if (t.t === "borc" && ay >= (t.vd ?? 0)) {
      const { borclu, alacakli } = borcTaraflari(t);
      const b = k.kar.get(borclu);
      if (!b) continue;
      olaylar.push(...borcOde(k, t, Math.min(b.pa, t.kl ?? 0), ay, borclu, alacakli));
      if (t.d === "surer" && !t.od) {
        t.od = 1;
        const a = k.kar.get(alacakli);
        soylentiEkle(k, "borcOdenmedi", borclu, alacakli, haneTaniklari(k, [a?.e ?? 0], ay, `borc:${t.i}`), ay);
        olaylar.push({ t: "teklif", w: alacakli, h: borclu, g: borclu, n: 7, k: "olay.borc.gecikti", p: { teklif: teklifKimlik(t.i), kalan: t.kl ?? 0 } });
      }
    }
  }
  const kapali = tp.tk.filter((t) => t.d !== "acik" && t.d !== "surer");
  if (kapali.length > KAPALI_TUTULAN) {
    const sil = new Set(kapali.slice(0, kapali.length - KAPALI_TUTULAN));
    tp.tk = tp.tk.filter((t) => !sil.has(t));
  }
  return olaylar;
}

function ciraklikDonumu(k: Kasaba, t: Teklif, ay: number): OlayTaslagi[] {
  const u = k.kar.get(usta(t));
  const c = k.kar.get(cirak(t));
  const m = t.s.m!;
  if (!u || !c) {
    kapat(k, t, "bitti", ay, "taraf_yok");
    return [];
  }
  if ((ilerleme(c, m)?.kd ?? 0) >= 1) {
    kapat(k, t, "bitti", ay, "kalfa");
    const iz = `${c.o}:${m}`;
    const ui = ilerleme(u, m);
    let pir = false;
    if (ui && ay - (t.ka ?? ay) >= CIRAKLIK_EN_AZ_AY && !(u.cs ?? []).includes(iz)) {
      ui.cy += 1;
      (u.cs ??= []).push(iz);
      pir = true;
      soylentiEkle(k, "kalfaYetistirdi", u.o, c.o, haneTaniklari(k, [u.e, c.e], ay, `kalfa:${t.i}`), ay);
    }
    return [
      { t: "ciraklik", w: c.o, h: u.o, g: "", n: 6, k: "olay.ciraklik.kalfa", p: { usta: oyuncuRef(u), cirak: oyuncuRef(c), meslek: m, pirSayaci: pir ? 1 : 0 } },
    ];
  }
  if (ay - (t.ka ?? ay) >= CIRAKLIK_EN_UZUN) {
    kapat(k, t, "bitti", ay, "sure");
    return [];
  }
  hizmetEkle(c, m, CIRAK_AYLIK_TECRUBE);
  return [];
}

/** Dışarıya giden teklif biçimi (uzun adlar). */
export function teklifGorunumu(k: Kasaba, t: Teklif, ben: string, dil: Dil) {
  const kisi = (id: string) => {
    if (id.startsWith("n")) {
      const n = k.dizin.get(Number(id.slice(1)));
      return { id, ad: n ? npcAdi(n, dil) : "?" };
    }
    return { id, ad: kisiAdi(k, id, dil) ?? "?" };
  };
  const s = t.s;
  const aday = s.dn ? k.dizin.get(s.dn) : undefined;
  const sartlar = {
    ...(s.m ? { meslek: s.m } : {}),
    ...(s.us ? { usta: s.us } : {}),
    ...(s.tu !== undefined ? { tutar: s.tu } : {}),
    ...(s.fz !== undefined ? { faiz: s.fz } : {}),
    ...(s.va !== undefined ? { vade: s.va } : {}),
    ...(s.yn ? { yon: s.yn } : {}),
    ...(s.py !== undefined ? { pay: s.py } : {}),
    ...(s.sr !== undefined ? { sure: s.sr } : {}),
    ...(s.ml ? { mal: s.ml, adet: s.mn ?? 0 } : {}),
    ...(s.it ? { is: s.it } : {}),
    ...(s.an !== undefined && k.dizin.get(s.an) ? { arabuluculukNpc: { id: npcKimlik(s.an), ad: npcAdi(k.dizin.get(s.an)!, dil) } } : {}),
    ...(s.ab ? { arabuluculukBedel: s.ab } : {}),
    ...(s.am !== undefined && s.am > 0 ? { arabuluculukMiktar: s.am } : {}),
    ...(s.he ? { hedef: kisi(s.he) } : {}),
    ...(s.ms ? { mesaj: s.ms } : {}),
    ...(s.yp ? { yapan: kisi(s.yp) } : {}),
    ...(aday ? { aday: { id: `n${aday.i}`, ad: npcAdi(aday, dil) } } : {}),
  };
  const borc = t.t === "borc" || t.t === "npcBorc" ? borcTaraflari(t) : undefined;
  return {
    id: teklifKimlik(t.i),
    tur: t.t,
    kaynak: t.g.startsWith("n") ? "npc" : "oyuncu",
    yon: t.a === ben ? "gelen" : "giden",
    gonderen: kisi(t.g),
    alici: kisi(t.a),
    sartlar,
    emanet: t.e,
    acilisAyi: t.ac,
    sonAy: t.sa,
    varsayilan: t.v,
    durum: t.d,
    ...(t.ka !== undefined ? { kabulAyi: t.ka } : {}),
    ...(t.kp !== undefined ? { kapanisAyi: t.kp } : {}),
    ...(t.sn ? { neden: t.sn } : {}),
    ...(borc ? { borclu: borc.borclu, alacakli: borc.alacakli, kalan: t.kl ?? null, vadeAyi: t.vd ?? null, odemeler: t.bo ?? [] } : {}),
    ...(t.bt !== undefined ? { bitisAyi: t.bt } : {}),
  };
}

/** POST /v1/vitrin {goster: armaganId[]}: sahibi vitrinde gösterilecek armağanları seçer (boş: son armağanlar). */
export function vitrinSec(kar: Karakter, goster: unknown): Sonuc<number[]> {
  if (!Array.isArray(goster) || goster.length > VITRIN_EN_COK) return hata("teklif_gecersiz");
  const secim: number[] = [];
  for (const g of goster) {
    const i = teklifCoz(g);
    if (i === undefined || !(kar.av ?? []).some((a) => a.i === i)) return hata("teklif_yok");
    if (!secim.includes(i)) secim.push(i);
  }
  if (secim.length) kar.vs = secim;
  else delete kar.vs;
  return basarili(secim);
}

/** Vitrin: seçilenler (hâlâ tutuluyorsa), seçim yoksa son armağanlar; en yeni önce. */
export function vitrinGorunumu(kar: Karakter) {
  const av = kar.av ?? [];
  const secili = kar.vs?.length ? av.filter((a) => kar.vs!.includes(a.i)) : av.slice(-VITRIN_EN_COK);
  return [...secili].reverse().map((a) => ({
    id: teklifKimlik(a.i),
    kimden: { id: a.v, ad: a.va },
    ay: a.ay,
    ...(a.tu ? { akce: a.tu } : {}),
    ...(a.ml ? { mal: a.ml, adet: a.mn ?? 0 } : {}),
    yapan: a.yp ? { id: a.yp, ad: a.ypa ?? "" } : null,
  }));
}

export { acikNpcTeklifi };

/** [PARAMETRE] Devirde kişiye bağlı olduğu için vârise geçmeyen teklif türleri (kapanır: "oldu"). */
export const DEVIRDE_KAPANAN: readonly Teklif["t"][] = ["cirak", "gorucu", "npcDunur", "is"];

/**
 * Devir kimlik taşıyıcısı (devir.ts `kimlikTasiyiciEkle`): ölünün açık ve süregelen teklifleri (borç, ortaklık,
 * armağan, NPC işi/borcu) vârise geçer — alacak da borç da, emanet de. Kişiye bağlı olanlar (çıraklık, görücü)
 * kapanır; açıksa emaneti vârise iade edilir. Engeller ve açık husumet ilanları da vârisin kimliğine taşınır.
 * Saf ve tekrar güvenlidir (ikinci çağrıda eski kimlik artık geçmez).
 */
export function toplumKimligiTasi(k: Kasaba, eski: string, yeni: string): void {
  const tp = k.tp;
  if (!tp || eski === yeni) return;
  const cevir = (x: string) => (x === eski ? yeni : x);
  for (const t of tp.tk) {
    if (t.d !== "acik" && t.d !== "surer") continue;
    if (t.g !== eski && t.a !== eski && t.s.us !== eski) continue;
    t.g = cevir(t.g);
    t.a = cevir(t.a);
    if (t.s.us) t.s.us = cevir(t.s.us);
    if (DEVIRDE_KAPANAN.includes(t.t)) kapat(k, t, t.t === "is" || t.d === "acik" ? "iptal" : "bitti", k.ay, "oldu");
  }
  const eg: Record<string, string[]> = {};
  for (const [kim, liste] of Object.entries(tp.eg)) {
    const yeniListe = [...new Set(liste.map(cevir))].filter((x) => x !== cevir(kim));
    if (yeniListe.length) eg[cevir(kim)] = [...new Set([...(eg[cevir(kim)] ?? []), ...yeniListe])];
  }
  tp.eg = eg;
  for (const h of tp.hu) {
    if (h.d !== "acik") continue;
    h.g = cevir(h.g);
    h.h = cevir(h.h);
  }
}
