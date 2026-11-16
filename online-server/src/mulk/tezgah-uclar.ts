// Tezgâh uçları (YerlesimDO tarafı, Dilim 1): dükkân listesi, tezgâh görünümü, fiyat önizlemesi (salt okuma);
// depo taşıma, raf (koy/al/fiyat), raftan satın alma, devralma (istekNo ile tekrar güvenli, tek yazım). Depo ve raf
// karakter envanteriyle aynı DO'dadır; işletme kasasına giden akçe mevcut çıkış kutusu protokolüyle gider.

import { MALLAR, malBul } from "../icerik/mallar.ts";
import { kaliteliEkle, type Kalite } from "../yerlesim/kalite.ts";
import { akceIade, iadeTeslim, malIade } from "./iade.ts";
import type { Karakter, Kasaba } from "../yerlesim/tipler.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { bosTezgah, depoAdedi, depoGorunumu, depoKapasitesi, depodanAl, depoyaKoy, tasimaCoz, tezgahBosalt, type Tezgah } from "./depo.ts";
import { adil, npcTavani, talepCoz, type Dukkan, type TalepSatiri } from "./hane-butcesi.ts";
import type { Kisi } from "./isletme.ts";
import { ITIBAR_BASLANGIC, KISI_MULK_EN_COK, MULK_YUVA, isletmeCoz, type MulkTuru, type Yetki } from "./kurallar.ts";
import { fiyatBandi, fiyatGecerli, rafAdedi, rafBos, rafSatirSiniri, rafaKoy, raftanAl, raftanSat, satirBul, satirGorunumu } from "./raf.ts";
import { bosYuva, edinimSarti, iadeBedeli, kasayaCikis, mulkDefteri, sahipMulkleri, vergiAyir, type MulkDefteri } from "./tapu.ts";
import { meslekOyuncuSayaci, saticilar } from "./tezgah-donum.ts";
import { pompaDenetle, pompaYaz } from "../yerlesim/pazar-tahta.ts";
import { trGunu } from "../yonetim/sikayet.ts";
import { CIKIS_EN_COK, cikisAc } from "./transfer.ts";
import { CALISAN_DEPO_GUNLUK_ADIL, DEPO_DEFTER_EN_COK, DEVRALMA_KEPENK_AY, NPC_TAVAN_CARPANI, DEVRALMA_TURLERI, DUKKAN_NPC_TAVAN, PAY_YONTEMI, RAF_SATIR_ADET, TEZGAH_KAYIT_PAYI } from "./tezgah-kurallar.ts";

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

type TezgahTuru = "dukkan" | "atolye";

/** Tapu + tür denetimi: yalnız dükkân ve atölyenin tezgâhı var. */
function hedef(k: Kasaba, isletme: string): Sonuc<{ md: MulkDefteri; tur: TezgahTuru; t: Tezgah; seviye: number }> {
  const c = isletmeCoz(isletme);
  const md = mulkDefteri(k);
  const tapu = md.t[isletme];
  if (!c || c.yerlesim !== k.y || !tapu) return hata("isletme_yok");
  if (c.tur === "han") return hata("tezgah_yok");
  const tz = (md.tz ??= {});
  const t = (tz[isletme] ??= bosTezgah());
  return basarili({ md, tur: c.tur, t, seviye: tapu.y?.seviye ?? 0 });
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
  return { dukkanlar, yuva: { dukkan: yuva("dukkan"), atolye: yuva("atolye") }, devralmaKepenkAy: DEVRALMA_KEPENK_AY };
}

/** GET /v1/isletme/:id/tezgah: raf (herkese), depo + gün sonu dökümü + izinler (sahip ve yetkili çalışana). */
export function tezgahGorunumu(k: Kasaba, kar: Karakter, isletme: string): Sonuc<Record<string, unknown>> {
  const h = hedef(k, isletme);
  if (!h.ok) return h;
  const { md, tur, t, seviye } = h.deger;
  const tapu = md.t[isletme]!;
  const iz = izinler(md, isletme, kar.o);
  const itibar = tapu.y?.it ?? ITIBAR_BASLANGIC;
  const yetkili = iz.sahip || iz.depoKoy || iz.depoAl || iz.raf || iz.fiyat;
  return basarili({
    isletme,
    tur,
    ad: tapu.y?.ad ?? "",
    sahip: { id: tapu.s, ad: sahipAdi(k, tapu.s) },
    seviye,
    itibar,
    kepenk: tur === "atolye" || rafBos(t),
    kepenkAy: t.kk,
    gecenAyKepenk: (t.gs as { kepenk?: boolean } | undefined)?.kepenk ?? true,
    raf: tur === "dukkan" ? t.r.map((s) => satirGorunumu(s, itibar)) : [],
    rafSiniri: { satir: tur === "dukkan" ? rafSatirSiniri(seviye) : 0, adet: RAF_SATIR_ADET },
    npcTavanSeviye: tur === "dukkan" ? (DUKKAN_NPC_TAVAN[seviye] ?? DUKKAN_NPC_TAVAN[0]!) : 0,
    devralinabilir: devralinabilir(k, md, isletme) && tapu.s !== kar.o,
    izin: { depoKoy: iz.depoKoy, depoAl: iz.depoAl, raf: iz.raf && tur === "dukkan", fiyat: iz.fiyat && tur === "dukkan", satinAl: tur === "dukkan" && tapu.s !== kar.o },
    ...(yetkili
      ? { depo: depoGorunumu(t), depoKapasite: depoKapasitesi(tur, seviye), depoDolu: depoAdedi(t), gunSonu: t.gs ?? null, ozet: md.tzo ?? null, depoDefteri: (t.dd ?? []).map(([ay, o, mal, kalite, adet]) => ({ ay, kim: o, mal, kalite, adet })) }
      : {}),
  });
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
    for (const s of t.r) satirlar.push({ id: `${id}#${s.n}`, dukkan: id, mal: s.m, q: s.q, adet: rafAdedi(s), fiyat: s.f });
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
  if (q !== 0 && q !== 1 && q !== 2 && q !== 3) return hata("kalite_gecersiz");
  const fiyat = Number(g.fiyat);
  if (!fiyatGecerli(mal, q as Kalite, fiyat)) return hata("fiyat_bant_disi");
  const { md } = h.deger;
  const { satirlar, dukkanlar } = talepGirdisi(k, md);
  const mevcut = h.deger.t.r.find((s) => s.m === mal && s.q === q);
  const adet = Number.isInteger(Number(g.adet)) && Number(g.adet) > 0 ? Math.min(RAF_SATIR_ADET, Number(g.adet)) : mevcut ? Math.max(1, rafAdedi(mevcut)) : RAF_SATIR_ADET;
  const sid = mevcut ? `${isletme}#${mevcut.n}` : `${isletme}#onizle`;
  const liste = satirlar.filter((s) => s.id !== sid);
  liste.push({ id: sid, dukkan: isletme, mal, q: q as Kalite, adet, fiyat });
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
  const { md, tur, t, seviye } = h.deger;
  iadeTeslim(k, kar);
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  const iz = izinler(md, isletme, kar.o);
  const g = tasimaCoz(govde, malBul);
  if (!g.ok) return g;
  let r;
  if (govde.yon === "koy") {
    if (!iz.depoKoy) return hata("yetki_yok");
    r = depoyaKoy(kar, t, g.deger, depoKapasitesi(tur, seviye));
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
  return basarili({ depo: { yon: govde.yon, mal: g.deger.mal, kalite: g.deger.q, adet: g.deger.adet, icerik: depoGorunumu(t), dolu: depoAdedi(t), kapasite: depoKapasitesi(tur, seviye) } });
}

/** POST .../raf {islem: koy, mal, kalite?, adet, fiyat?} | {islem: al, satir, adet} | {islem: fiyat, satir, fiyat}. */
export function rafIslem(k: Kasaba, kar: Karakter, isletme: string, govde: unknown, vergiOrani?: number): Sonuc<Record<string, unknown>> {
  const h = hedef(k, isletme);
  if (!h.ok) return h;
  const { md, tur, t, seviye } = h.deger;
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
    const r = rafaKoy(t, g.deger.mal, g.deger.q, g.deger.adet, govde.fiyat, seviye);
    if (!r.ok) return r;
    if (iz.yonetici) etkinlik(k, t);
    return basarili({ raf: t.r.map((s) => satirGorunumu(s)), satir: satirGorunumu(r.deger.satir) });
  }
  const s = satirBul(t, govde.satir);
  if (!s) return hata("satir_yok");
  if (islem === "al") {
    if (!iz.raf) return hata("yetki_yok");
    const adet = govde.adet;
    if (!Number.isInteger(adet) || (adet as number) < 1 || (adet as number) > RAF_SATIR_ADET) return hata("adet_gecersiz");
    if (depoAdedi(t) + (adet as number) > depoKapasitesi(tur, seviye)) return hata("depo_dolu");
    const r = raftanAl(t, s, adet as number);
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
  const adet = govde.adet;
  if (!Number.isInteger(adet) || (adet as number) < 1 || (adet as number) > RAF_SATIR_ADET) return hata("adet_gecersiz");
  if (govde.fiyat !== undefined && govde.fiyat !== s.f) return hata("fiyat_degisti");
  if (rafAdedi(s) < (adet as number)) return hata("stok_yok");
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
  const p = raftanSat(t, s, adet as number)!;
  kaliteliEkle(kar, mal, p);
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
  if (tz) malIade(k, tapu.s, (h) => (iade = tezgahBosalt(tz, h)));
  (md.ob ??= []).push({ t: "tezgah", w: tapu.s, h: kar.o, g: tapu.s, n: 5, k: "olay.tezgah.devralindi", p: { isletme, ad: tapu.y?.ad ?? "", bedel, mal: iade, kepenkAy: tz?.kk ?? 0 } });
  (md.tz ??= {})[isletme] = bosTezgah();
  md.t[isletme] = { s: kar.o, h: kar.h, ts, a: k.ay, f: sart.fiyat, eb: sart.fiyat };
  delete md.od[isletme];
  return basarili({ devralma: { isletme, fiyat: sart.fiyat, eskiSahip: tapu.s, iade: { bedel, mal: iade, kasa: "isletmeden" }, ts } });
}

/** Devralma kaydı teslim edilmeden işletmeye komut gitmez (eski kasa yeni sahibe geçmesin). */
export function devralBekliyor(md: MulkDefteri | undefined, isletme: string): boolean {
  return !!md?.cik.k.some((x) => x.t === "devral" && x.h === isletme);
}
