// Tezgâh uçları (YerlesimDO tarafı, Dilim 1): dükkân listesi, tezgâh görünümü, fiyat önizlemesi (salt okuma);
// depo taşıma, raf (koy/al/fiyat), raftan satın alma, devralma (istekNo ile tekrar güvenli, tek yazım). Depo ve raf
// karakter envanteriyle aynı DO'dadır; işletme kasasına giden akçe mevcut çıkış kutusu protokolüyle gider.

import { MALLAR, malBul } from "../icerik/mallar.ts";
import { tarifBul } from "../icerik/tarifler.ts";
import { olduMu } from "../yerlesim/hanedan.ts";
import { IS_KONDISYON, halDegistir } from "../yerlesim/hal.ts";
import { takatHarca } from "../yerlesim/karakter.ts";
import { levhaYaz } from "../yerlesim/levha.ts";
import { ciktiAdedi, girdiGorunumu, tarifYap } from "../yerlesim/tarif.ts";
import type { OlayTaslagi } from "../yerlesim/tipler.ts";
import { atolyeKalemleri, emekTavani, etkinSeviye, genislet, genisletmeGorunumu, tezgahSayisi, zanaatOner, zanaatSec } from "./atolye.ts";
import { emirAc, emirIptal } from "./uretim-emri.ts";
import { topluGeriAl, topluGorunumu, topluTeslim } from "./toplu-siparis.ts";
import { kaliteliEkle, kaliteMi, type Kalite } from "../yerlesim/kalite.ts";
import { EFSANEVI_DENEME_AY, EFSANEVI_PIR_KADEMESI, efsaneviHakki, elDegistir } from "../yerlesim/esya.ts";
import { efsaneviKaydet } from "../yerlesim/esya-kayit.ts";
import { akceIade, iadeTeslim, malIade, konsinyeIade } from "./iade.ts";
import type { Karakter, Kasaba } from "../yerlesim/tipler.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { bosTezgah, depoAdedi, depoGorunumu, depoKapasitesi, depodanAl, depoyaKoy, tasimaCoz, tezgahBosalt, type Tezgah } from "./depo.ts";
import { adil, npcTavani, talepCoz, type Dukkan, type TalepSatiri } from "./hane-butcesi.ts";
import type { Kisi } from "./isletme.ts";
import { EDINIM_FIYATI, ITIBAR_BASLANGIC, KISI_MULK_EN_COK, MULK_YUVA, isletmeCoz, type MulkTuru, type Yetki } from "./kurallar.ts";
import { fiyatBandi, fiyatGecerli, rafAdedi, rafBos, rafEsyaAlanlari, rafSatilabilir, rafSatirSiniri, rafaKoy, raftanAl, raftanSat, satirBul, satirGorunumu } from "./raf.ts";
import { secilebilirToplam, esyaKimligiCoz, secimEksigi } from "./depo.ts";
import { hakAcik } from "../yerlesim/beceri-etki.ts";
import { ayniKume } from "../yerlesim/teveccuh.ts";
import { kaliteliCikar } from "../yerlesim/kalite.ts";
import { bosYuva, edinimSarti, iadeBedeli, kasayaCikis, mulkDefteri, sahipMulkleri, vergiAyir, type MulkDefteri } from "./tapu.ts";
import { depoKancasi, dukkanHKancasi, meslekOyuncuSayaci, npcDokumu, saticilar } from "./tezgah-donum.ts";
import { bilgiKancasi, kancaDokumu, kancaHesapla, kancaKisileri } from "./kanca.ts";
import type { MalzemeIndirimi } from "./atolye.ts";
import type { MeslekId } from "../icerik/meslekler.ts";
import { pompaDenetle, pompaYaz } from "../yerlesim/pazar-tahta.ts";
import { trGunu } from "../yonetim/sikayet.ts";
import { CIKIS_EN_COK, cikisAc } from "./transfer.ts";
import {
  ATOLYE_KALITE_SEVIYE_PUANI,
  CALISAN_DEPO_GUNLUK_ADIL,
  DEPO_DEFTER_EN_COK,
  DEVRALMA_KEPENK_AY,
  DEVRALMA_TURLERI,
  DUKKAN_NPC_TAVAN,
  EMIR_KEZ_EN_COK,
  MESAI_TEK_EN_COK,
  NPC_ATOLYE_MAAS_EN_AZ,
  NPC_EMEK_AY,
  NPC_EMEK_KALITE_CEZA,
  NPC_TAVAN_CARPANI,
  PAY_YONTEMI,
  RAF_SATIR_ADET,
  TEZGAH_KAYIT_PAYI,
  ZANAAT_DEGISIM_BEDELI,
  ZANAAT_MESLEKLERI,
  ZANAAT_UCRETSIZ_DEGISIM,
  KOMISYON_EN_COK,
  KOMISYON_VARSAYILAN,
} from "./tezgah-kurallar.ts";

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

type TezgahTuru = "dukkan" | "atolye";

/** Tapu + tür denetimi: yalnız dükkân ve atölyenin tezgâhı var. */
function hedef(k: Kasaba, isletme: string): Sonuc<{ md: MulkDefteri; tur: TezgahTuru; t: Tezgah; seviye: number; etkin: number }> {
  const c = isletmeCoz(isletme);
  const md = mulkDefteri(k);
  const tapu = md.t[isletme];
  if (!c || c.yerlesim !== k.y || !tapu) return hata("isletme_yok");
  if (c.tur === "han") return hata("tezgah_yok");
  const tz = (md.tz ??= {});
  const t = (tz[isletme] ??= bosTezgah());
  const seviye = tapu.y?.seviye ?? 0;
  // Genişletme (Dilim 2): eski kayıtta kapasite bugünkü seviyede verilmiş sayılır.
  t.gk ??= seviye;
  return basarili({ md, tur: c.tur, t, seviye, etkin: etkinSeviye(t, seviye) });
}

/** Atölyenin zanaatı seçilmemişse sahibin ana/yan mesleğinden atanır (uygunsa; değişiklik sayılmaz). */
export function zanaatHazirla(k: Kasaba, md: MulkDefteri, isletme: string, t: Tezgah): void {
  if (t.za || isletmeCoz(isletme)?.tur !== "atolye") return;
  const z = zanaatOner(k.kar.get(md.t[isletme]?.s ?? ""));
  if (z) t.za = z;
}

// ── Dilim 3 kancaları (mulk/kanca.ts; kişiler = kancaKisileri: sahip + bekleme süresini dolduran, en eski sözleşmesi
// burada olan oyuncu çalışanlar; en yüksek katkı, tavanlı) ──

function depoKap(k: Kasaba, md: MulkDefteri, isletme: string, tur: TezgahTuru, seviye: number): number {
  return depoKapasitesi(tur, seviye, depoKancasi(k, md, isletme).deger);
}

function rafEki(k: Kasaba, md: MulkDefteri, isletme: string): { satir: number; adet: number } {
  const ki = kancaAdaylari(k, md, isletme);
  return { satir: kancaHesapla(ki, "rafSatir").deger, adet: kancaHesapla(ki, "rafAdet").deger };
}

function malzemeIndirimi(k: Kasaba, md: MulkDefteri, isletme: string): MalzemeIndirimi {
  const ki = kancaAdaylari(k, md, isletme);
  return (mal) => kancaHesapla(ki, "genisletme", { mal }).deger;
}

function topluIndirimi(k: Kasaba, md: MulkDefteri, isletme: string): (m: MeslekId) => number {
  const ki = kancaAdaylari(k, md, isletme);
  return (m) => kancaHesapla(ki, "topluIndirim", { meslek: m }).deger;
}

/** Yetkiliye kanca dökümü: etkisi olan kanallar (değer, tavan, katkı verenin adı; kalemler sahibe ve katkı verene). */
function kancaGorunumu(k: Kasaba, md: MulkDefteri, isletme: string, tur: TezgahTuru, t: Tezgah, bakan: { o: string; sahip: boolean }) {
  const ki = kancaAdaylari(k, md, isletme);
  const l: [string, ReturnType<typeof kancaHesapla>][] = [["depo", kancaHesapla(ki, "depo")]];
  l.push(["bakimIndirim", kancaHesapla(ki, "bakimIndirim")]);
  if (tur === "dukkan") {
    l.push(["rafSatir", kancaHesapla(ki, "rafSatir")], ["rafAdet", kancaHesapla(ki, "rafAdet")]);
    const hk = dukkanHKancasi(k, md, isletme);
    for (const m of new Set(t.r.map((s) => MALLAR[s.m].meslek))) l.push([`dukkanH.${m}`, hk(m)]);
  } else if (t.za) {
    l.push(["atolyeKalite", kancaHesapla(ki, "atolyeKalite", { meslek: t.za })], ["npcCeza", kancaHesapla(ki, "npcCeza", { meslek: t.za })], ["topluIndirim", kancaHesapla(ki, "topluIndirim", { meslek: t.za })]);
  }
  return Object.fromEntries(l.filter(([, s]) => s.deger > 0).map(([a, s]) => [a, kancaDokumu(s, (o) => k.kar.get(o)?.ad ?? sahipAdi(k, o), bakan)]));
}

/** Fiyat tablosu (tüccar `fiyatTablosu` kancası): yerleşimdeki öbür dükkânların raf satırları, mal sırasıyla (en çok 40). */
function fiyatTablosu(k: Kasaba, md: MulkDefteri, isletme: string) {
  const l: { isletme: string; ad: string; mal: string; kalite: number; fiyat: number; adet: number }[] = [];
  for (const [id, tapu] of Object.entries(md.t)) {
    const c = isletmeCoz(id);
    if (!c || c.tur !== "dukkan" || c.yerlesim !== k.y || id === isletme || tapu.y?.durum === "iflas") continue;
    for (const s of md.tz?.[id]?.r ?? []) if (rafAdedi(s) > 0) l.push({ isletme: id, ad: tapu.y?.ad ?? "", mal: s.m, kalite: s.q, fiyat: s.f, adet: rafAdedi(s), ...rafEsyaAlanlari(s) });
  }
  return l.sort((a, b) => (a.mal < b.mal ? -1 : a.mal > b.mal ? 1 : a.kalite - b.kalite || a.fiyat - b.fiyat || (a.isletme < b.isletme ? -1 : 1))).slice(0, 40);
}

/**
 * Kanca katkısı verebilecek kişiler (mulk/kanca.ts kişi kuralı; yerleşimde yüklü, yaşayan). `ay`: kuralın "içinde
 * bulunulan ayı" — uçlarda bugünkü ay, ay dönümünde biten ay (önizleme = uygulanan).
 */
export function kancaAdaylari(k: Kasaba, md: MulkDefteri, isletme: string, ay = k.ay): Karakter[] {
  return kancaKisileri(md.t, isletme, ay).flatMap((o) => {
    const c = k.kar.get(o);
    return c && !olduMu(c) && !c.gc ? [c] : [];
  });
}

/**
 * Kanca okuyan uçta belleğe yüklenecek kişiler (önizleme = ay dönümü: dönümde bütün sakinler yüklüdür). Yerel depo
 * okuması, alt istek değil.
 */
export function kancaYuklenecekler(k: Kasaba, isletmeler: readonly string[]): string[] {
  const md = k.mk;
  if (!md) return [];
  return [...new Set(isletmeler.flatMap((id) => kancaKisileri(md.t, id, k.ay)))].filter((o) => !k.kar.has(o));
}

/** Sahip ve oyuncu çalışanlar (yerleşimde yüklü, yaşayan): emrin ustası adayları. */
export function atolyeAdaylari(k: Kasaba, md: MulkDefteri, isletme: string): Karakter[] {
  const tapu = md.t[isletme];
  if (!tapu) return [];
  return [tapu.s, ...(tapu.y?.po ?? [])].flatMap((o) => {
    const c = k.kar.get(o);
    return c && !olduMu(c) && !c.gc ? [c] : [];
  });
}

/** İsteyenin yetkileri: sahip hepsi; oyuncu çalışan işletme yansısındaki yetkileri (vekil hepsi). */
function yetkiler(md: MulkDefteri, isletme: string, o: string): { sahip: boolean; y: Yetki[] } {
  const t = md.t[isletme];
  if (!t) return { sahip: false, y: [] };
  if (t.s === o) return { sahip: true, y: ["kasa", "musteri", "fiyat", "personel", "vekalet", "masa"] };
  return { sahip: false, y: t.y?.py?.find(([x]) => x === o)?.[1] ?? [] };
}

/** Yetki kuralı: depoya koy ve raf koy/al "musteri"; depodan al "kasa" (mal dışarı çıkar); fiyat "fiyat". */
export const TEZGAH_YETKI = { depoKoy: "musteri", depoAl: "kasa", raf: "musteri", fiyat: "fiyat" } as const satisfies Record<string, Yetki>;

function izinler(md: MulkDefteri, isletme: string, o: string) {
  const { sahip, y } = yetkiler(md, isletme, o);
  return {
    sahip,
    /** Sahip ya da vekil: devralma sayacını sıfırlar, depodan alışta tavansızdır. */
    yonetici: sahip || y.includes("vekalet"),
    depoKoy: sahip || y.includes(TEZGAH_YETKI.depoKoy),
    depoAl: sahip || y.includes(TEZGAH_YETKI.depoAl),
    raf: sahip || y.includes(TEZGAH_YETKI.raf),
    fiyat: sahip || y.includes(TEZGAH_YETKI.fiyat),
    /** Atölye (Dilim 2): anlık üretim ve toplu sipariş teslimi "musteri"; mesai her oyuncu çalışan; emir ve genişletme yönetici. */
    uret: sahip || y.includes("musteri"),
    toplu: sahip || y.includes("musteri"),
    mesai: sahip || !!md.t[isletme]?.y?.po?.includes(o) || !!md.t[isletme]?.y?.py?.some(([x]) => x === o),
    emir: sahip || y.includes("vekalet"),
    genislet: sahip || y.includes("vekalet"),
  };
}

function devralinabilir(k: Kasaba, md: MulkDefteri, isletme: string): boolean {
  const c = isletmeCoz(isletme);
  if (!c || !(DEVRALMA_TURLERI as readonly string[]).includes(c.tur)) return false;
  const t = md.tz?.[isletme];
  return !!md.t[isletme] && (t?.kk ?? 0) >= DEVRALMA_KEPENK_AY && bosYuva(k, md, c.tur) === undefined;
}

/** Sahibin/vekilin tezgâh eylemi: devralma sayacı anında sıfırlanır. */
function etkinlik(k: Kasaba, t: Tezgah): void {
  t.se = k.ay;
  t.kk = 0;
}

function sahipAdi(k: Kasaba, o: string): string {
  return k.sakin.find((s) => s.o === o)?.ad ?? "";
}

// ── Okuma ──

/** GET /v1/dukkanlar: yerleşimdeki dükkânlar (raf özeti, kepenk, devralma) ve yuva doluluğu. */
export function dukkanListesi(k: Kasaba, kar: Karakter) {
  const md = mulkDefteri(k);
  const dukkanlar = Object.entries(md.t)
    .filter(([id]) => isletmeCoz(id)?.tur === "dukkan" && isletmeCoz(id)?.yerlesim === k.y)
    .sort(([a], [b]) => isletmeCoz(a)!.no - isletmeCoz(b)!.no)
    .map(([id, t]) => {
      const tz = md.tz?.[id];
      return {
        isletme: id,
        no: isletmeCoz(id)!.no,
        ad: t.y?.ad ?? "",
        sahip: { id: t.s, ad: sahipAdi(k, t.s) },
        seviye: t.y?.seviye ?? 0,
        itibar: t.y?.it ?? ITIBAR_BASLANGIC,
        kepenk: !tz || rafBos(tz),
        satir: tz?.r.length ?? 0,
        mallar: [...new Set((tz?.r ?? []).map((s) => s.m))],
        benim: t.s === kar.o,
        devralinabilir: devralinabilir(k, md, id) && t.s !== kar.o,
      };
    });
  const yuva = (tur: MulkTuru) => ({ toplam: MULK_YUVA[k.tur][tur], dolu: Object.keys(md.t).filter((id) => isletmeCoz(id)?.tur === tur).length });
  return { dukkanlar, yuva: { dukkan: yuva("dukkan"), atolye: yuva("atolye") }, devralmaKepenkAy: DEVRALMA_KEPENK_AY, bedel: { dukkan: EDINIM_FIYATI[k.tur].dukkan, atolye: EDINIM_FIYATI[k.tur].atolye } };
}

/** GET /v1/atolyeler: yerleşimdeki atölyeler (zanaat, seviye, kepenk, devralma) ve toplu siparişler. */
export function atolyeListesi(k: Kasaba, kar: Karakter) {
  const md = mulkDefteri(k);
  const ids = Object.keys(md.t)
    .filter((id) => isletmeCoz(id)?.tur === "atolye" && isletmeCoz(id)?.yerlesim === k.y)
    .sort((a, b) => isletmeCoz(a)!.no - isletmeCoz(b)!.no);
  const atolyeler = ids.map((id) => {
    const t = md.t[id]!;
    const tz = md.tz?.[id];
    return {
      isletme: id,
      no: isletmeCoz(id)!.no,
      ad: t.y?.ad ?? "",
      sahip: { id: t.s, ad: sahipAdi(k, t.s) },
      seviye: t.y?.seviye ?? 0,
      itibar: t.y?.it ?? ITIBAR_BASLANGIC,
      zanaat: tz?.za ?? null,
      kepenk: (tz?.gs as { kepenk?: boolean } | undefined)?.kepenk ?? true,
      benim: t.s === kar.o,
      devralinabilir: devralinabilir(k, md, id) && t.s !== kar.o,
    };
  });
  // Teslim edebileceği atölye: sahibi ya da "musteri" yetkili çalışanı olduğu ilk atölye.
  const benimId = ids.find((id) => izinler(md, id, kar.o).toplu);
  const benim = benimId ? { isletme: benimId, t: (md.tz ??= {})[benimId] ?? bosTezgah() } : undefined;
  return { atolyeler, topluSiparis: topluGorunumu(md.tsp, k.ay, benim && { ...benim, indirim: topluIndirimi(k, md, benim.isletme) }), yuva: { toplam: MULK_YUVA[k.tur].atolye, dolu: ids.length }, bedel: EDINIM_FIYATI[k.tur].atolye, devralmaKepenkAy: DEVRALMA_KEPENK_AY };
}

/** GET /v1/isletme/:id/tezgah: raf (herkese), depo + gün sonu dökümü + izinler (sahip ve yetkili çalışana). */
export function tezgahGorunumu(k: Kasaba, kar: Karakter, isletme: string): Sonuc<Record<string, unknown>> {
  const h = hedef(k, isletme);
  if (!h.ok) return h;
  const { md, tur, t, seviye, etkin } = h.deger;
  const tapu = md.t[isletme]!;
  const iz = izinler(md, isletme, kar.o);
  const itibar = tapu.y?.it ?? ITIBAR_BASLANGIC;
  const yetkili = iz.sahip || iz.depoKoy || iz.depoAl || iz.raf || iz.fiyat || (tur === "atolye" && iz.mesai);
  return basarili({
    isletme,
    tur,
    ad: tapu.y?.ad ?? "",
    sahip: { id: tapu.s, ad: sahipAdi(k, tapu.s) },
    seviye,
    itibar,
    kepenk: tur === "atolye" ? ((t.gs as { kepenk?: boolean } | undefined)?.kepenk ?? true) && t.ua !== k.ay : rafBos(t),
    kepenkAy: t.kk,
    gecenAyKepenk: (t.gs as { kepenk?: boolean } | undefined)?.kepenk ?? true,
    raf: tur === "dukkan" ? t.r.map((s) => satirGorunumu(s, itibar)) : [],
    rafSiniri: tur === "dukkan" ? (() => { const e = rafEki(k, md, isletme); return { satir: rafSatirSiniri(etkin) + e.satir, adet: RAF_SATIR_ADET + e.adet }; })() : { satir: 0, adet: RAF_SATIR_ADET },
    npcTavanSeviye: tur === "dukkan" ? (DUKKAN_NPC_TAVAN[seviye] ?? DUKKAN_NPC_TAVAN[0]!) : 0,
    devralinabilir: devralinabilir(k, md, isletme) && tapu.s !== kar.o,
    // Kanca partisi 2: konsinye (herkese: açık mı, komisyon; benim konsinye satırım).
    ...(tur === "dukkan" ? { komisyon: { ...komisyonGorunumu(k, md, isletme, t), benimSatir: t.r.find((x) => x.ko?.o === kar.o)?.n ?? null } } : {}),
    izin: {
      depoKoy: iz.depoKoy,
      depoAl: iz.depoAl,
      raf: iz.raf && tur === "dukkan",
      fiyat: iz.fiyat && tur === "dukkan",
      satinAl: tur === "dukkan" && tapu.s !== kar.o,
      genislet: iz.genislet,
      ...(tur === "atolye" ? { uret: iz.uret, mesai: iz.mesai, emir: iz.emir, toplu: iz.toplu, zanaat: iz.sahip } : {}),
    },
    ...(yetkili
      ? {
          depo: depoGorunumu(t),
          depoKapasite: depoKap(k, md, isletme, tur, etkin),
          depoDolu: depoAdedi(t),
          gunSonu: t.gs ?? null,
          ozet: md.tzo ?? null,
          depoDefteri: (t.dd ?? []).map(([ay, o, mal, kalite, adet]) => ({ ay, kim: o, kimAd: k.kar.get(o)?.ad ?? sahipAdi(k, o), mal, kalite, adet })),
          genisletme: genisletmeGorunumu(tur, t, seviye, malzemeIndirimi(k, md, isletme)),
          kanca: kancaGorunumu(k, md, isletme, tur, t, { o: kar.o, sahip: iz.sahip }),
          ...(tur === "dukkan" && bilgiKancasi(kar, "fiyatTablosu") ? { fiyatTablosu: fiyatTablosu(k, md, isletme) } : {}),
          ...(tur === "atolye" ? { atolye: atolyeGorunumu(k, md, isletme, t, seviye, kar) } : {}),
        }
      : {}),
  });
}

/** Atölye bölümü (yetkiliye): zanaat, tezgâh, emek havuzu, emirler, son üretim dökümü, toplu siparişler. */
function atolyeGorunumu(k: Kasaba, md: MulkDefteri, isletme: string, t: Tezgah, seviye: number, kar: Karakter) {
  const tapu = md.t[isletme]!;
  const ne = tapu.y?.ne ?? 0;
  const zs = t.zs ?? 0;
  return {
    zanaat: t.za ?? null,
    zanaatOneri: t.za ? null : (zanaatOner(k.kar.get(tapu.s)) ?? null),
    zanaatlar: ZANAAT_MESLEKLERI,
    zanaatDegisim: { yapilan: zs, ucretsizKalan: Math.max(0, ZANAAT_UCRETSIZ_DEGISIM - zs), bedel: zs >= ZANAAT_UCRETSIZ_DEGISIM ? ZANAAT_DEGISIM_BEDELI : 0 },
    tezgah: { sayi: tezgahSayisi(t, seviye), acikEmir: t.ue?.length ?? 0 },
    kaliteBonus: ATOLYE_KALITE_SEVIYE_PUANI * seviye,
    emek: { havuz: t.eh ?? 0, tavan: emekTavani(t, seviye), tekEnCok: MESAI_TEK_EN_COK, npcCalisan: ne, npcAylik: NPC_EMEK_AY * ne, npc: npcDokumu(ne, Math.max(ne, tapu.y?.nt ?? ne)), npcKaliteCeza: NPC_EMEK_KALITE_CEZA, npcMaasEnAz: NPC_ATOLYE_MAAS_EN_AZ },
    emirler: (t.ue ?? []).map((e) => ({ no: e.n, tarif: e.tr, kez: e.k, yapilan: e.y, kalan: e.k - e.y, acilis: e.a, acan: { id: e.o, ad: k.kar.get(e.o)?.ad ?? sahipAdi(k, e.o) } })),
    emirKezEnCok: EMIR_KEZ_EN_COK,
    sonUretimAyi: t.ua ?? null,
    topluSiparis: topluGorunumu(md.tsp, k.ay, { isletme, t, indirim: topluIndirimi(k, md, isletme) }),
    benimTakat: kar.tk,
    // Dilim 4: bakanın efsanevi denemesi (zanaatta pirse); şans üretimde kaba bantla döner.
    efsanevi: { pir: !!t.za && (kar.ms?.s[t.za]?.kd ?? 0) >= EFSANEVI_PIR_KADEMESI, hak: efsaneviHakki(kar, k.ay), ayda: EFSANEVI_DENEME_AY },
  };
}

/** Bu ayki raflar için talep girdisi (önizleme; çıkış kutusu ve kepenk sayacına dokunmaz). */
function talepGirdisi(k: Kasaba, md: MulkDefteri) {
  const satirlar: TalepSatiri[] = [];
  const dukkanlar = new Map<string, Dukkan>();
  for (const [id, tapu] of Object.entries(md.t)) {
    const c = isletmeCoz(id);
    const t = md.tz?.[id];
    if (!c || c.tur !== "dukkan" || !t || tapu.y?.durum === "iflas") continue;
    const seviye = tapu.y?.seviye ?? 0;
    dukkanlar.set(id, { id, itibar: tapu.y?.it ?? ITIBAR_BASLANGIC, tavan: DUKKAN_NPC_TAVAN[seviye] ?? DUKKAN_NPC_TAVAN[0]! });
    const hk = dukkanHKancasi(k, md, id);
    for (const s of t.r) {
      const h = hk(MALLAR[s.m].meslek).deger;
      satirlar.push({ id: `${id}#${s.n}`, dukkan: id, mal: s.m, q: s.q, adet: rafSatilabilir(s), fiyat: s.f, ...(h > 0 ? { hYuzde: h } : {}) });
    }
  }
  return { satirlar, dukkanlar };
}

/** GET /v1/isletme/:id/onizle?mal&kalite&fiyat&adet: bu fiyatla bu ayki raf durumuna göre tahmini pay ve adet. */
export function fiyatOnizle(k: Kasaba, kar: Karakter, isletme: string, govde: unknown): Sonuc<Record<string, unknown>> {
  const h = hedef(k, isletme);
  if (!h.ok) return h;
  if (h.deger.tur !== "dukkan") return hata("tezgah_yok");
  const g = nesneMi(govde) ? govde : {};
  const mal = malBul(g.mal);
  if (!mal || MALLAR[mal].taban <= 0) return hata("mal_gecersiz");
  const q = Number(g.kalite ?? 0);
  if (!kaliteMi(q)) return hata("kalite_gecersiz");
  const fiyat = Number(g.fiyat);
  if (!fiyatGecerli(mal, q as Kalite, fiyat)) return hata("fiyat_bant_disi");
  const { md } = h.deger;
  const { satirlar, dukkanlar } = talepGirdisi(k, md);
  const mevcut = h.deger.t.r.find((s) => s.m === mal && s.q === q);
  const satirSiniri = RAF_SATIR_ADET + rafEki(k, md, isletme).adet;
  const adet = Number.isInteger(Number(g.adet)) && Number(g.adet) > 0 ? Math.min(satirSiniri, Number(g.adet)) : mevcut ? Math.max(1, rafAdedi(mevcut)) : satirSiniri;
  const sid = mevcut ? `${isletme}#${mevcut.n}` : `${isletme}#onizle`;
  const liste = satirlar.filter((s) => s.id !== sid);
  const hk = dukkanHKancasi(k, md, isletme)(MALLAR[mal].meslek).deger;
  liste.push({ id: sid, dukkan: isletme, mal, q: q as Kalite, adet, fiyat, ...(hk > 0 ? { hYuzde: hk } : {}) });
  const r = talepCoz(k.tur, liste, dukkanlar, meslekOyuncuSayaci(k, saticilar(md, liste)), PAY_YONTEMI);
  const x = r.satirlar.find((s) => s.id === sid)!;
  const meslek = r.meslekler.find((m) => m.meslek === MALLAR[mal].meslek)!;
  void kar;
  return basarili({
    onizleme: {
      mal,
      kalite: q,
      fiyat,
      adet,
      bant: fiyatBandi(mal, q as Kalite),
      npcTavan: npcTavani(mal, q as Kalite),
      butce: { meslek: meslek.meslek, B: meslek.B, kitlik: meslek.kitlik, malSayisi: meslek.malSayisi, bMal: x.bMal },
      payYuzde: Math.round(x.pay * 1000) / 10,
      carpanlar: x.carpan,
      cekicilik: x.a,
      rakipSatir: liste.filter((s) => s.mal === mal).length - 1,
      tahminiAdet: x.adet,
      tahminiHasilat: x.hasilat,
      neden: x.neden,
      yontem: r.yontem,
    },
  });
}

// ── Yazma ──

/** POST .../depo {yon: koy|al, mal, kalite?, adet}: sahip ya da yetkili çalışan; envanter ↔ depo (tek yazım). */
export function depoTasi(k: Kasaba, kar: Karakter, isletme: string, govde: unknown, an = 0): Sonuc<Record<string, unknown>> {
  const h = hedef(k, isletme);
  if (!h.ok) return h;
  const { md, tur, t, etkin: seviye } = h.deger;
  iadeTeslim(k, kar);
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  const iz = izinler(md, isletme, kar.o);
  const g = tasimaCoz(govde, malBul, tur === "atolye");
  if (!g.ok) return g;
  let r;
  if (govde.yon === "koy") {
    if (!iz.depoKoy) return hata("yetki_yok");
    r = depoyaKoy(kar, t, g.deger, depoKap(k, md, isletme, tur, seviye));
  } else if (govde.yon === "al") {
    if (!iz.depoAl) return hata("yetki_yok");
    // Çalışan (sahip/vekil değil): günlük adil değer tavanı ve depo defterine satır (mal kaçırma önlemi).
    const deger = Math.ceil(adil(g.deger.mal, g.deger.q) * g.deger.adet);
    let bugun = 0;
    if (!iz.yonetici) {
      const gun = trGunu(an);
      if (!t.cg || t.cg[0] !== gun) t.cg = [gun, {}];
      bugun = t.cg[1][kar.o] ?? 0;
      if (bugun + deger > CALISAN_DEPO_GUNLUK_ADIL) return hata("depo_cekim_tavani");
    }
    r = depodanAl(kar, t, g.deger);
    if (r.ok && !iz.yonetici) {
      t.cg![1][kar.o] = bugun + deger;
      (t.dd ??= []).push([k.ay, kar.o, g.deger.mal, g.deger.q, g.deger.adet]);
      if (t.dd.length > DEPO_DEFTER_EN_COK) t.dd.splice(0, t.dd.length - DEPO_DEFTER_EN_COK);
    }
  } else return hata("gecersiz_istek");
  if (!r.ok) return r;
  if (iz.yonetici) etkinlik(k, t);
  return basarili({ depo: { yon: govde.yon, mal: g.deger.mal, kalite: g.deger.q, adet: g.deger.adet, icerik: depoGorunumu(t), dolu: depoAdedi(t), kapasite: depoKap(k, md, isletme, tur, seviye) } });
}

/** Konsinye açık mı: dükkânın kanca kişilerinden (sahip + kuralı dolduran çalışan) birinde `hak:komisyon` var. */
export function konsinyeAcik(k: Kasaba, md: MulkDefteri, isletme: string): boolean {
  return kancaAdaylari(k, md, isletme).some((c) => hakAcik(c, "komisyon"));
}

/** Konsinye görünümü: açık mı, komisyon yüzdesi ve rafta konsinye satır sayısı. */
export function komisyonGorunumu(k: Kasaba, md: MulkDefteri, isletme: string, t: Tezgah) {
  return { acik: konsinyeAcik(k, md, isletme), oran: t.kom ?? KOMISYON_VARSAYILAN, enCok: KOMISYON_EN_COK, satir: t.r.filter((x) => x.ko).length };
}

/** POST .../raf {islem: koy, mal, kalite?, adet, fiyat?} | {islem: al, satir, adet} | {islem: fiyat, satir, fiyat}. */
export function rafIslem(k: Kasaba, kar: Karakter, isletme: string, govde: unknown, vergiOrani?: number): Sonuc<Record<string, unknown>> {
  const h = hedef(k, isletme);
  if (!h.ok) return h;
  const { md, tur, t, etkin: seviye } = h.deger;
  if (tur !== "dukkan") return hata("tezgah_yok");
  if (vergiOrani !== undefined) md.vo = vergiOrani;
  iadeTeslim(k, kar);
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  const iz = izinler(md, isletme, kar.o);
  const islem = govde.islem;
  if (islem === "koy") {
    if (!iz.raf) return hata("yetki_yok");
    const g = tasimaCoz(govde, malBul);
    if (!g.ok) return g;
    if (govde.fiyat !== undefined && !iz.fiyat) return hata("yetki_yok");
    const r = rafaKoy(t, g.deger.mal, g.deger.q, g.deger.adet, govde.fiyat, seviye, rafEki(k, md, isletme), g.deger.esya);
    if (!r.ok) return r;
    if (iz.yonetici) etkinlik(k, t);
    return basarili({ raf: t.r.map((s) => satirGorunumu(s)), satir: satirGorunumu(r.deger.satir) });
  }
  // ── Kanca partisi 2: konsinye (hak:komisyon) ──
  if (islem === "komisyon") {
    if (!iz.yonetici) return hata("yetki_yok");
    const oran = govde.oran;
    if (!Number.isInteger(oran) || (oran as number) < 0 || (oran as number) > KOMISYON_EN_COK) return hata("gecersiz_istek");
    t.kom = oran as number;
    etkinlik(k, t);
    return basarili({ komisyon: komisyonGorunumu(k, md, isletme, t) });
  }
  if (islem === "konsinye") {
    const tapu = md.t[isletme]!;
    // Emanetçi dükkânın sahibi ya da çalışanı olamaz; aynı hesap/hane kümesi konsinye yapamaz (gelir pompası yok).
    if (tapu.s === kar.o || tapu.y?.py?.some(([o]) => o === kar.o)) return hata("kendine");
    if (!konsinyeAcik(k, md, isletme)) return hata("dugum_kapali");
    const sahip = k.kar.get(tapu.s);
    if (!sahip || ayniKume(kar, sahip)) return hata("ayni_kume");
    const g = tasimaCoz(govde, malBul);
    if (!g.ok) return g;
    if (g.deger.esya) return hata("esya_kilitli");
    const { mal, q, adet } = g.deger;
    if (adet > RAF_SATIR_ADET) return hata("adet_gecersiz");
    if (t.r.some((x) => x.ko?.o === kar.o)) return hata("teklif_var");
    if (t.r.length >= rafSatirSiniri(seviye) + rafEki(k, md, isletme).satir) return hata("raf_dolu");
    if (!fiyatGecerli(mal, q, govde.fiyat)) return hata("fiyat_bant_disi");
    const eksik = secimEksigi(kar, mal, q, adet);
    if (eksik) return hata(eksik);
    const p = kaliteliCikar(kar, mal, adet, q)!;
    const satir = { n: ++t.n, m: mal, q, p, f: govde.fiyat as number, ko: { o: kar.o, ad: kar.ad, y: t.kom ?? KOMISYON_VARSAYILAN } };
    t.r.push(satir);
    return basarili({ satir: satirGorunumu(satir), komisyon: komisyonGorunumu(k, md, isletme, t) });
  }
  const s = satirBul(t, govde.satir);
  if (!s) return hata("satir_yok");
  if (islem === "konsinyeGeri") {
    // Emanetçi kendi satırını geri çeker (envanterine; kayıp yok). Sahip konsinye malına dokunamaz.
    if (s.ko?.o !== kar.o) return hata("yetki_yok");
    kaliteliEkle(kar, s.m, s.p);
    t.r = t.r.filter((x) => x !== s);
    return basarili({ geri: { mal: s.m, kalite: s.q, adet: rafAdedi({ ...s }) } });
  }
  if (s.ko) return hata("yetki_yok");
  if (islem === "al") {
    if (!iz.raf) return hata("yetki_yok");
    const adet = govde.adet;
    if (!Number.isInteger(adet) || (adet as number) < 1 || (adet as number) > RAF_SATIR_ADET + rafEki(k, md, isletme).adet) return hata("adet_gecersiz");
    if (depoAdedi(t) + (adet as number) > depoKap(k, md, isletme, tur, seviye)) return hata("depo_dolu");
    const esya = esyaKimligiCoz(govde.esya);
    if (esya === null || (esya !== undefined && adet !== 1)) return hata("adet_gecersiz");
    const r = raftanAl(t, s, adet as number, esya);
    if (!r.ok) return r;
    if (iz.yonetici) etkinlik(k, t);
    return basarili({ raf: t.r.map((x) => satirGorunumu(x)), depoDolu: depoAdedi(t) });
  }
  if (islem === "fiyat") {
    if (!iz.fiyat) return hata("yetki_yok");
    if (!fiyatGecerli(s.m, s.q, govde.fiyat)) return hata("fiyat_bant_disi");
    s.f = govde.fiyat as number;
    if (iz.yonetici) etkinlik(k, t);
    return basarili({ satir: satirGorunumu(s) });
  }
  return hata("gecersiz_istek");
}

/**
 * POST .../satinal {satir, adet, fiyat?}: oyuncu müşteri raftan anında alır. Akçe alıcıdan; vergi hazineye; net
 * işletme kasasına (çıkış kutusu); mal kalitesi ve yapan iziyle alıcının envanterine. Kendi dükkânından alınmaz.
 * Aynı hane kümesi / karşılıklı işlem bayrağı kasaya girer ama gelir, itibar, seviyeye sayılmaz (IsletmeDO `izle`).
 */
export function satinAl(k: Kasaba, kar: Karakter, isletme: string, govde: unknown, an: number, istekNo: string, vergiOrani: number): Sonuc<Record<string, unknown>> {
  const h = hedef(k, isletme);
  if (!h.ok) return h;
  const { md, tur, t } = h.deger;
  if (tur !== "dukkan") return hata("tezgah_yok");
  const tapu = md.t[isletme]!;
  // Sahip ve işletmenin oyuncu çalışanı kendi dükkânından alamaz.
  if (tapu.s === kar.o || tapu.y?.py?.some(([o]) => o === kar.o)) return hata("kendine");
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  const s = satirBul(t, govde.satir);
  if (!s) return hata("satir_yok");
  // Konsinye satırı yalnız NPC'ye satılır (emanetçinin payı ay dönümünde ayrılır).
  if (s.ko) return hata("yetki_yok");
  const adet = govde.adet;
  if (!Number.isInteger(adet) || (adet as number) < 1 || (adet as number) > RAF_SATIR_ADET + rafEki(k, md, isletme).adet) return hata("adet_gecersiz");
  if (govde.fiyat !== undefined && govde.fiyat !== s.f) return hata("fiyat_degisti");
  // Adlı eşya yalnız `esya` kimliğiyle (adet 1) alınır; kimliksiz alım onu hiç seçmez.
  const esya = esyaKimligiCoz(govde.esya);
  if (esya === null || (esya !== undefined && adet !== 1)) return hata("adet_gecersiz");
  if (secilebilirToplam(s.p, esya) < (adet as number)) return hata(esya === undefined && rafAdedi(s) >= (adet as number) ? "esya_kilitli" : "stok_yok");
  const tutar = s.f * (adet as number);
  if (kar.pa < tutar) return hata("para_yok");
  if (md.cik.k.length >= CIKIS_EN_COK) return hata("transfer_bekliyor");
  // Armağan (pompa) denetimi pazarla aynı: adil bandın dışı aylık hediye tavanına sayılır; aynı kümede bant = adil.
  const satici = k.kar.get(tapu.s);
  // Rafta hediye sayılmayan üst sınır NPC tavanıdır (1,5 × adil): üstü (bant 3×'e kadar) armağan tavanına sayılır.
  const pompa = satici ? pompaDenetle(satici, kar, s.m, s.q, adet as number, tutar, k.ay, NPC_TAVAN_CARPANI) : undefined;
  if (pompa && !pompa.ok) return pompa;
  // Aynı hane kümesinde bant sıfırdır: adil değerin üstünde satış hiç geçmez (aile içi akçe aktarma yolu kapalı).
  if (pompa?.ok && pompa.deger.ayniKume && pompa.deger.yon === "alicidan") return hata("pompa_siniri");
  const oran = Number.isInteger(vergiOrani) && vergiOrani >= 0 && vergiOrani <= 4 ? vergiOrani : 0;
  md.vo = oran;
  const v = vergiAyir(md, isletme, tutar, oran);
  const islem = `y:${k.y}:${kar.o}:satinal:${istekNo}`;
  kar.pa -= tutar;
  // Gelir/itibar/seviye puanına yalnız adil değere kadar olan kısım yazılır (üstü kasaya girer, puan saymaz).
  const sayilan = Math.min(v.net, Math.floor(adil(s.m, s.q) * (adet as number)));
  const c = kasayaCikis(k, kar, isletme, v.net, "satis", an, islem, false, { satici: tapu.s, sayilan });
  if (!c.ok) {
    kar.pa += tutar;
    return c;
  }
  (md.vergiKesir ??= {})[isletme] = v.kalan;
  if (v.vergi > 0) (md.vergiGiden ??= []).push({ anahtar: `${islem}:vergi`, tutar: v.vergi, yerlesim: k.y });
  const mal = s.m;
  const q = s.q;
  const p = raftanSat(t, s, adet as number, esya)!;
  kaliteliEkle(kar, mal, elDegistir(p, k.ay, "satis", kar.ad));
  if (pompa?.ok && satici) pompaYaz(satici, kar, pompa.deger, k.ay);
  // Satış kepengi açar ve devralma sayacını sıfırlar.
  t.os = k.ay;
  t.kk = 0;
  return basarili({
    satis: { isletme, satir: s.n, mal, kalite: q, adet, birim: s.f, tutar, vergi: { oran, tutar: v.vergi }, kasaya: v.net, islem, kume: c.deger.kume, karsilikli: c.deger.karsilikli, yapan: p.find((x) => x[2] !== undefined)?.[2] ?? null },
  });
}

/**
 * POST .../devral {}: bütün yuvalar doluyken DEVRALMA_KEPENK_AY aydır kepengi kapalı dükkân için. İsteyen edinim
 * şartını taşır ve bugünkü edinim bedelini öder (beyliğe); eski sahibe ödediği edinim bedelinin tamamı, depo ve raf
 * (envanterine) bu yazımda, kasa + emanet işletmeden cüzdanına iade edilir. İtibar ve seviye sıfırlanır.
 * `yukle`: çağıran eski sahibi yüklemiş olmalı.
 */
export function devral(k: Kasaba, kar: Karakter, isletme: string, an: number, istekNo: string): Sonuc<Record<string, unknown>> {
  const c = isletmeCoz(isletme);
  const md = mulkDefteri(k);
  const tapu = md.t[isletme];
  if (!c || c.yerlesim !== k.y || !tapu) return hata("isletme_yok");
  if (tapu.s === kar.o) return hata("kendine");
  if (!devralinabilir(k, md, isletme)) return hata("devralma_kosulu");
  if (sahipMulkleri(md, kar.o).length >= KISI_MULK_EN_COK) return hata("mulk_siniri");
  // Eski sahip ölmüş olabilir: iadeler vârise/bekleyene gider (iade.ts); bağlam için son bilinen ad.
  const eski = k.kar.get(tapu.s);
  const sart = edinimSarti(k, kar, c.tur);
  if (sart.eksik.includes("yas")) return hata("yas_kapisi");
  if (sart.eksik.includes("namYaDaLonca")) return hata("edinim_sarti");
  if (sart.eksik.includes("akce")) return hata("para_yok");
  const ts = ++md.ts;
  const eskiKisi: Kisi = { h: tapu.h, o: tapu.s, ad: eski?.ad ?? sahipAdi(k, tapu.s) };
  if (!cikisAc(md.cik, { i: `y:${k.y}:${kar.o}:devral:${istekNo}`, t: "devral", h: isletme, a: 0, y: { isletme, ts, sahip: { h: kar.h, o: kar.o, ad: kar.ad }, eski: eskiKisi } }, an, CIKIS_EN_COK + TEZGAH_KAYIT_PAYI)) {
    md.ts--;
    return hata("transfer_bekliyor");
  }
  kar.pa -= sart.fiyat;
  md.batak += sart.fiyat;
  // İade yalnız beyliğe gerçekten ödenen edinim bedeli (devir fiyatı değil): batak eksiye düşmez, akçe basılmaz.
  const bedel = Math.min(iadeBedeli(k, isletme), md.batak);
  akceIade(k, tapu.s, bedel);
  md.batak -= bedel;
  const tz = md.tz?.[isletme];
  let iade = 0;
  if (tz) konsinyeIade(k, tz);
  if (tz) malIade(k, tapu.s, (h) => (iade = tezgahBosalt(tz, h)));
  (md.ob ??= []).push({ t: "tezgah", w: tapu.s, h: kar.o, g: tapu.s, n: 5, k: "olay.tezgah.devralindi", p: { isletme, ad: tapu.y?.ad ?? "", bedel, mal: iade, kepenkAy: tz?.kk ?? 0 } });
  (md.tz ??= {})[isletme] = bosTezgah(0);
  md.t[isletme] = { s: kar.o, h: kar.h, ts, a: k.ay, f: sart.fiyat, eb: sart.fiyat };
  delete md.od[isletme];
  return basarili({ devralma: { isletme, fiyat: sart.fiyat, eskiSahip: tapu.s, iade: { bedel, mal: iade, kasa: "isletmeden" }, ts } });
}

// ── Atölye (Dilim 2) ──

function iflasMi(md: MulkDefteri, isletme: string): boolean {
  return md.t[isletme]?.y?.durum === "iflas";
}

/** Atölye hedefi: tür denetimi + zanaat hazırlığı. */
function atolyeHedef(k: Kasaba, isletme: string) {
  const h = hedef(k, isletme);
  if (!h.ok) return h;
  if (h.deger.tur !== "atolye") return hata("tezgah_yok");
  // İflas eden atölyede (yansı) yazma yok: üretim, mesai, emir, toplu teslim ve zanaat işletmeye ulaşamaz, yanardı.
  if (iflasMi(h.deger.md, isletme)) return hata("isletme_kapali");
  zanaatHazirla(k, h.deger.md, isletme, h.deger.t);
  return h;
}

/** POST .../zanaat {meslek}: yalnız sahip. İlk atama ve ilk değişiklik ücretsiz; sonrası akçe (beyliğe); açık emirle değişmez. */
export function zanaatUc(k: Kasaba, kar: Karakter, isletme: string, govde: unknown): Sonuc<Record<string, unknown>> {
  const h = atolyeHedef(k, isletme);
  if (!h.ok) return h;
  const { md, t } = h.deger;
  if (md.t[isletme]!.s !== kar.o) return hata("yetki_yok");
  const r = zanaatSec(t, nesneMi(govde) ? govde.meslek : undefined, kar.pa);
  if (!r.ok) return r;
  const { meslek, bedel, degisim } = r.deger;
  if (bedel > 0) {
    kar.pa -= bedel;
    md.batak += bedel;
  }
  t.za = meslek;
  if (degisim > 0) t.zs = degisim;
  etkinlik(k, t);
  return basarili({ zanaat: { meslek, bedel, degisim: t.zs ?? 0, ucretsizKalan: Math.max(0, ZANAAT_UCRETSIZ_DEGISIM - (t.zs ?? 0)) } });
}

/**
 * POST .../uret {tarif}: sahip ya da "musteri" yetkili çalışan atölyede tarif yapar. Takat ve beceri kişiden; girdi,
 * alet ve ürün atölye deposunda; kaliteye +5 × seviye (adet artmaz); ürüne atölye damgası. Tek yazım, tekrar güvenli.
 */
export function atolyedeUret(k: Kasaba, kar: Karakter, isletme: string, govde: unknown, ek: { olaylar: OlayTaslagi[]; ekonomi?: boolean }): Sonuc<Record<string, unknown>> {
  const h = atolyeHedef(k, isletme);
  if (!h.ok) return h;
  const { md, t, seviye, etkin } = h.deger;
  if (!izinler(md, isletme, kar.o).uret) return hata("yetki_yok");
  if (!t.za) return hata("zanaat_yok");
  const tr = tarifBul(nesneMi(govde) ? govde.tarif : undefined);
  if (!tr) return hata("tarif_gecersiz");
  if (tr.meslek !== t.za) return hata("zanaat_disi");
  const kapasite = depoKap(k, md, isletme, "atolye", etkin);
  const ad = md.t[isletme]!.y?.ad ?? "";
  const ev0 = kar.ev;
  const kq0 = kar.kq;
  const as0 = kar.as;
  kar.ev = t.ev ?? {};
  kar.kq = t.kq;
  kar.as = t.as;
  let r: ReturnType<typeof tarifYap>;
  try {
    const aracVar = !!tr.arac && (kar.ev[tr.arac.mal] ?? 0) > 0;
    const giren = Object.values(girdiGorunumu(kar, tr)).reduce((a, n) => a + (n ?? 0), 0);
    const cikan = ciktiAdedi(kar, tr, aracVar) + Object.values(tr.yan ?? {}).reduce((a, n) => a + (n ?? 0), 0);
    if (depoAdedi(kar) - giren + cikan > kapasite) r = hata("depo_dolu");
    else r = tarifYap(kar, tr.id, k.ay, undefined, { kalemler: atolyeKalemleri(seviye, 0, { kalite: kancaHesapla(kancaAdaylari(k, md, isletme), "atolyeKalite", { meslek: t.za }).deger, npcCeza: 0 }), damga: isletme, ...(nesneMi(govde) && govde.efsanevi === true ? { efsanevi: { atolyeAd: ad } } : {}) });
  } finally {
    t.ev = kar.ev;
    t.kq = kar.kq;
    t.as = kar.as;
    if (t.ev && !Object.keys(t.ev).length) delete t.ev;
    if (!t.kq) delete t.kq;
    if (!t.as || !Object.keys(t.as).length) delete t.as;
    kar.ev = ev0;
    kar.kq = kq0;
    kar.as = as0;
    if (kar.kq === undefined) delete kar.kq;
    if (kar.as === undefined) delete kar.as;
  }
  if (!r.ok) return r;
  const efs = r.deger.efsanevi;
  if (efs?.esya && efs.kademe !== null) {
    ek.olaylar.push(efsaneviKaydet(k, kar, r.deger.cikti.mal, efs.kademe, efs.esya, [isletme, ad]));
    ek.ekonomi = true;
  }
  const lv = levhaYaz(k, kar, r.deger.tarif, r.deger.cikti.mal, efs?.kademe ?? r.deger.kalite.kademe, k.ay, [isletme, ad]);
  if (lv) {
    ek.olaylar.push(lv.olay);
    ek.ekonomi = true;
  }
  const ur = (kar.ur ??= {});
  ur[r.deger.cikti.mal] = (ur[r.deger.cikti.mal] ?? 0) + r.deger.cikti.adet;
  t.ua = k.ay;
  if (izinler(md, isletme, kar.o).yonetici) etkinlik(k, t);
  return basarili({ uretim: { ...r.deger, atolye: { isletme, ad }, levha: !!lv }, depo: depoGorunumu(t), depoDolu: depoAdedi(t), depoKapasite: kapasite });
}

/** POST .../mesai {emek}: sahip ya da oyuncu çalışan kendi takatinden havuza emek bağlar (1:1, geri alınmaz, tavanlı). */
export function mesai(k: Kasaba, kar: Karakter, isletme: string, govde: unknown): Sonuc<Record<string, unknown>> {
  const h = atolyeHedef(k, isletme);
  if (!h.ok) return h;
  const { md, t, seviye } = h.deger;
  const iz = izinler(md, isletme, kar.o);
  if (!iz.mesai) return hata("yetki_yok");
  const emek = nesneMi(govde) ? govde.emek : undefined;
  if (!Number.isInteger(emek) || (emek as number) < 1 || (emek as number) > MESAI_TEK_EN_COK) return hata("emek_gecersiz");
  const tavan = emekTavani(t, seviye);
  if ((t.eh ?? 0) + (emek as number) > tavan) return hata("havuz_dolu");
  if (!takatHarca(kar, k.ay, emek as number)) return hata("takat_yok");
  halDegistir(kar, k.ay, { kondisyon: -IS_KONDISYON * (emek as number) }, "hal.neden.tarif");
  t.eh = (t.eh ?? 0) + (emek as number);
  if (iz.yonetici) etkinlik(k, t);
  return basarili({ mesai: { emek, havuz: t.eh, tavan }, takat: kar.tk });
}

/** POST .../emir {islem: ac, tarif, kez} | {islem: iptal, emir}: sahip ya da vekil. İptalde hiçbir şey yanmaz (girdi yapımda düşer). */
export function emirUc(k: Kasaba, kar: Karakter, isletme: string, govde: unknown): Sonuc<Record<string, unknown>> {
  const h = atolyeHedef(k, isletme);
  if (!h.ok) return h;
  const { md, t, seviye } = h.deger;
  if (!izinler(md, isletme, kar.o).emir) return hata("yetki_yok");
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  let r: Sonuc<{ emir: { n: number; tr: string; k: number; y: number; a: number; o: string } }>;
  if (govde.islem === "ac") r = emirAc(t, seviye, govde.tarif, govde.kez, atolyeAdaylari(k, md, isletme), kar.o, k.ay);
  else if (govde.islem === "iptal") r = emirIptal(t, govde.emir);
  else return hata("gecersiz_istek");
  if (!r.ok) return r;
  etkinlik(k, t);
  const e = r.deger.emir;
  return basarili({ emir: { no: e.n, tarif: e.tr, kez: e.k, yapilan: e.y, acilis: e.a, durum: govde.islem === "ac" ? "acik" : "iptal" }, emirler: (t.ue ?? []).map((x) => ({ no: x.n, tarif: x.tr, kez: x.k, yapilan: x.y })) });
}

/**
 * POST .../toplu {siparis}: sahip ya da "musteri" yetkili çalışan atölye deposundan toplu siparişi teslim eder. Ödül
 * (kasabadan, lonca siparişi gibi) atölye kasasına "tezgah" kaydıyla gider; teslim o ayı üretimli sayar.
 */
export function topluUc(k: Kasaba, kar: Karakter, isletme: string, govde: unknown, an: number): Sonuc<Record<string, unknown>> {
  const h = atolyeHedef(k, isletme);
  if (!h.ok) return h;
  const { md, t } = h.deger;
  const iz = izinler(md, isletme, kar.o);
  if (!iz.toplu) return hata("yetki_yok");
  if (!md.tsp) return hata("siparis_yok");
  const ad = md.t[isletme]!.y?.ad ?? "";
  const r = topluTeslim(md.tsp, nesneMi(govde) ? govde.siparis : undefined, isletme, ad, t, k.ay, topluIndirimi(k, md, isletme));
  if (!r.ok) return r;
  const s = r.deger.siparis;
  // Ret telafisi için (tapu.ts telafi): düşen partiler, önceki "son alan" ve teslim eden kayıtta taşınır.
  const y = { isletme, aylar: [[k.ay, s.odul, 0]], neden: "toplu", siparis: s.id, ...(t.za ? { za: t.za } : {}), parti: r.deger.parti, saOnce: r.deger.saOnce ?? null, o: kar.o };
  // Çıkış kutusu doluysa teslim aynı yazımda geri alınır (mal partileriyle depoya, sipariş açık): akçe yazılmaz.
  if (!cikisAc(md.cik, { i: `y:${k.y}:toplu:${s.id}`, t: "tezgah", h: isletme, a: s.odul, y }, an, CIKIS_EN_COK + TEZGAH_KAYIT_PAYI)) {
    topluGeriAl(md.tsp, y, isletme, t);
    return hata("transfer_bekliyor");
  }
  md.kaynak = (md.kaynak ?? 0) + s.odul;
  t.ua = k.ay;
  if (iz.yonetici) etkinlik(k, t);
  (md.ob ??= []).push({ t: "tezgah", w: md.t[isletme]!.s, h: "", g: "", n: 4, k: "olay.tezgah.topluTeslim", p: { isletme, ad, mal: s.mal, adet: r.deger.adet, odul: s.odul } });
  return basarili({ toplu: { siparis: s.id, mal: s.mal, adet: r.deger.adet, siparisAdet: s.adet, indirimYuzde: r.deger.indirimYuzde, odul: s.odul, kasaya: s.odul, islem: `y:${k.y}:toplu:${s.id}` }, depo: depoGorunumu(t), depoDolu: depoAdedi(t) });
}

/** POST .../genislet {}: sahip ya da vekil; dükkân ve atölye. Seviyenin açtığı kapasite depodaki malzemeyle açılır. */
export function genisletUc(k: Kasaba, kar: Karakter, isletme: string): Sonuc<Record<string, unknown>> {
  const h = hedef(k, isletme);
  if (!h.ok) return h;
  const { md, tur, t, seviye } = h.deger;
  if (iflasMi(md, isletme)) return hata("isletme_kapali");
  if (!izinler(md, isletme, kar.o).genislet) return hata("yetki_yok");
  const indirim = malzemeIndirimi(k, md, isletme);
  const r = genislet(tur, t, seviye, indirim);
  if (!r.ok) return r;
  etkinlik(k, t);
  const etkin = etkinSeviye(t, seviye);
  return basarili({
    genisletme: { kademe: t.gk, malzeme: r.deger.malzeme, rafSatir: tur === "dukkan" ? rafSatirSiniri(etkin) : 0, depoKapasite: depoKap(k, md, isletme, tur, etkin), tezgah: tur === "atolye" ? tezgahSayisi(t, seviye) : 0 },
    sonraki: genisletmeGorunumu(tur, t, seviye, indirim),
    depo: depoGorunumu(t),
  });
}

/** Devralma kaydı teslim edilmeden işletmeye komut gitmez (eski kasa yeni sahibe geçmesin). */
export function devralBekliyor(md: MulkDefteri | undefined, isletme: string): boolean {
  return !!md?.cik.k.some((x) => x.t === "devral" && x.h === isletme);
}
