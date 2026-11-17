// Yerleşim ay dönümü (tezgâh modeli §5.2–5.3): bütün dükkân rafları ve hanlar yerleşimin mülk defterinde
// bilindiği için NPC talebi tek yerde, alt istek olmadan, deterministik çözülür (DO alt istek bütçesi: 0). Sonuç
// işletmelere "tezgah" kaydıyla gider; kaçan aylar `yetistir` döngüsünde sırayla işlenir, girdiler toplanır ve
// dönüm sonunda işletme başına TEK kayıt açılır (kimlik ay aralığını taşır: tekrar teslim tek uygulanır).
//
// Neden yerleşimde: raflar karakter envanteriyle aynı DO'da (depo.ts); NPC satışı raf adedini ve hasılatı aynı
// yazımda düşer/yazar. Raf özetini işletme DO'larından toplamak ay başına 12+ alt istek ve yarış demekti.

import { MALLAR, type MalId } from "../icerik/mallar.ts";
import type { MeslekId } from "../icerik/meslekler.ts";
import { olduMu } from "../yerlesim/hanedan.ts";
import type { Kasaba, OlayTaslagi } from "../yerlesim/tipler.ts";
import { iadeCoz } from "./iade.ts";
import { bosTezgah, partiToplam, type Tezgah } from "./depo.ts";
import { talepCoz, yolcuCoz, type Dukkan, type TalepSatiri, type YolcuHani } from "./hane-butcesi.ts";
import { ITIBAR_BASLANGIC, NPC_HAN_NO, isletmeCoz, isletmeKimligi } from "./kurallar.ts";
import { rafBos, raftanSat } from "./raf.ts";
import { hanNolari, mulkDefteri, vergiAyir } from "./tapu.ts";
import { CIKIS_EN_COK, cikisAc } from "./transfer.ts";
import { DUKKAN_NPC_TAVAN, NPC_EMEK_AY, PAY_YONTEMI, TEZGAH_KAYIT_PAYI, URETIM_DOKUM_EN_COK } from "./tezgah-kurallar.ts";
import { depoKapasitesi } from "./depo.ts";
import { etkinSeviye } from "./atolye.ts";
import { emirleriIsle } from "./uretim-emri.ts";
import { topluDonumu } from "./toplu-siparis.ts";
import { atolyeAdaylari, kancaAdaylari, zanaatHazirla } from "./tezgah-uclar.ts";
import { levhaYaz } from "../yerlesim/levha.ts";
import { kancaDokumu, kancaHesapla, type KancaSonucu } from "./kanca.ts";
import type { MulkDefteri } from "./tapu.ts";
import type { Karakter } from "../yerlesim/tipler.ts";

/**
 * Dükkânın H kancası (Dilim 3), satırdaki malın mesleğine göre (önbellekli): sahip ve oyuncu çalışanlardan en yüksek
 * katkı, H tavanıyla. Dönüm, önizleme ve görünüm aynı hesabı kullanır.
 */
export function dukkanHKancasi(k: Kasaba, md: MulkDefteri, isletme: string, ay = k.ay): (m: MeslekId) => KancaSonucu {
  const kisiler: Karakter[] = kancaAdaylari(k, md, isletme, ay);
  const on = new Map<MeslekId, KancaSonucu>();
  return (m) => {
    let s = on.get(m);
    if (!s) on.set(m, (s = kancaHesapla(kisiler, "dukkanH", { meslek: m })));
    return s;
  };
}

/** Dökümde görünen ad (kimlik istemciye gitmez). */
function kisiAdi(k: Kasaba, o: string): string {
  return k.kar.get(o)?.ad ?? k.sakin.find((s) => s.o === o)?.ad ?? "";
}

/** Gün sonu dökümüne H kancası: satırlardaki meslek başına uygulanan değer ve kalemleri (yalnız etkisi olan). */
function hKancaDokumu(k: Kasaba, hk: ((m: MeslekId) => KancaSonucu) | undefined, mallar: readonly MalId[]): { hKanca?: Record<string, ReturnType<typeof kancaDokumu>> } {
  if (!hk) return {};
  const l = [...new Set(mallar.map((m) => MALLAR[m].meslek))].map((m) => [m, hk(m)] as const).filter(([, s]) => s.deger > 0);
  return l.length ? { hKanca: Object.fromEntries(l.map(([m, s]) => [m, kancaDokumu(s, (o) => kisiAdi(k, o))])) } : {};
}

/** İşletmenin depo kancası (tavanlı yüzde). */
export function depoKancasi(k: Kasaba, md: MulkDefteri, isletme: string): KancaSonucu {
  return kancaHesapla(kancaAdaylari(k, md, isletme), "depo");
}

/**
 * Yerleşimde o meslekte (ana meslek) yaşayan oyuncu sayısı (kıtlık sinyali). Pazardaki kural gibi (npc-taban.ts
 * saticiHaricSayi) o mesleğin malını rafta satan sahipler sayılmaz: tek demirci kendi bütçesini düşürmez.
 */
export function meslekOyuncuSayaci(k: Kasaba, haric: ReadonlyMap<MeslekId, ReadonlySet<string>> = new Map()): (m: MeslekId) => number {
  const say = new Map<string, string[]>();
  for (const kar of k.kar.values()) {
    if (olduMu(kar) || kar.gc || !kar.ms?.a) continue;
    say.set(kar.ms.a, [...(say.get(kar.ms.a) ?? []), kar.o]);
  }
  return (m) => (say.get(m) ?? []).filter((o) => !haric.get(m)?.has(o)).length;
}

/** Meslek → o mesleğin malını rafta satan dükkân sahipleri. */
export function saticilar(md: { t: Record<string, { s: string }> }, satirlar: readonly TalepSatiri[]): Map<MeslekId, Set<string>> {
  const m = new Map<MeslekId, Set<string>>();
  for (const s of satirlar) {
    const sahip = md.t[s.dukkan]?.s;
    if (!sahip) continue;
    const meslek = MALLAR[s.mal].meslek;
    if (!m.has(meslek)) m.set(meslek, new Set());
    m.get(meslek)!.add(sahip);
  }
  return m;
}

/** Bir kayıtta taşınan en çok ay girdisi (işletme 64'e kadar kabul eder). */
const GRUP_AY_EN_COK = 48;

/** Ay girdisi toplanabilir mi: işletmenin bekleyen grubu varsa evet; yoksa çıkış kutusunda yer olmalı. */
function yerVar(k: Kasaba, isletme: string): boolean {
  const md = mulkDefteri(k);
  const grup = md.tzb?.[isletme]?.length ?? 0;
  if (grup >= GRUP_AY_EN_COK) return false;
  if (grup > 0) return true;
  const bekleyenGrup = Object.values(md.tzb ?? {}).filter((l) => l.length).length;
  return md.cik.k.length + bekleyenGrup < CIKIS_EN_COK + TEZGAH_KAYIT_PAYI;
}

function girdiEkle(k: Kasaba, isletme: string, ay: number, net: number, satir: number): void {
  const md = mulkDefteri(k);
  ((md.tzb ??= {})[isletme] ??= []).push([ay, net, satir]);
}

/** Tek ay dönümü: dükkân rafları NPC'ye satar (kepenk sayımı), hanlar yolcu payını alır. */
export function tezgahDonumu(k: Kasaba, ay: number): OlayTaslagi[] {
  const md = k.mk;
  if (!md) return [];
  const olaylar: OlayTaslagi[] = [];
  iadeCoz(k, ay);
  const tz = (md.tz ??= {});
  const satirlar: TalepSatiri[] = [];
  const dukkanlar = new Map<string, Dukkan>();
  const satirHaritasi = new Map<string, { t: Tezgah; n: number }>();
  const tumu: string[] = [];
  const hkHarita = new Map<string, (m: MeslekId) => KancaSonucu>();
  for (const [id, tapu] of Object.entries(md.t)) {
    const c = isletmeCoz(id);
    if (!c || c.tur !== "dukkan" || c.yerlesim !== k.y || tapu.y?.durum === "iflas") continue;
    // Tezgâh kaydı yoksa kurulur: devralma sayacı her dükkânda ilerler.
    const t = (tz[id] ??= bosTezgah());
    t.gk ??= tapu.y?.seviye ?? 0;
    tumu.push(id);
    if (!t.r.some((s) => partiToplam(s.p) > 0) || !yerVar(k, id)) continue;
    const seviye = tapu.y?.seviye ?? 0;
    dukkanlar.set(id, { id, itibar: tapu.y?.it ?? ITIBAR_BASLANGIC, tavan: DUKKAN_NPC_TAVAN[seviye] ?? DUKKAN_NPC_TAVAN[0]! });
    // Kanca kişi kuralı biten ayın (ay − 1) gözüyle: o ay görülen önizleme dönümde uygulanır.
    const hk = dukkanHKancasi(k, md, id, ay - 1);
    hkHarita.set(id, hk);
    for (const s of t.r) {
      const sid = `${id}#${s.n}`;
      satirHaritasi.set(sid, { t, n: s.n });
      const h = hk(MALLAR[s.m].meslek).deger;
      satirlar.push({ id: sid, dukkan: id, mal: s.m, q: s.q, adet: partiToplam(s.p), fiyat: s.f, ...(h > 0 ? { hYuzde: h } : {}) });
    }
  }
  const r = talepCoz(k.tur, satirlar, dukkanlar, meslekOyuncuSayaci(k, saticilar(md, satirlar)), PAY_YONTEMI);
  const oran = Number.isInteger(md.vo) && md.vo! >= 0 && md.vo! <= 4 ? md.vo! : 0;
  let vergiToplam = 0;
  for (const id of tumu) {
    const t = tz[id]!;
    const tapu = md.t[id]!;
    const benim = r.satirlar.filter((x) => x.dukkan === id);
    for (const x of benim) {
      if (x.adet <= 0) continue;
      const s = t.r.find((y) => y.n === satirHaritasi.get(x.id)!.n);
      if (s) raftanSat(t, s, x.adet);
    }
    const adet = benim.reduce((a, x) => a + x.adet, 0);
    // Kepenk = biten ayda hiç satış yok (NPC'ye ya da oyuncuya): bakım, borç/iflas sayacı, itibar, faaliyet, maaş işlemez.
    const satisVar = adet > 0 || t.os === ay - 1;
    // Devralma sayacı: satışsız VE sahibin/vekilin tezgâh eylemi olmayan üst üste ay.
    t.kk = satisVar || t.se === ay - 1 ? 0 : t.kk + 1;
    const satirDokumu = benim.map((x) => ({
      satir: satirHaritasi.get(x.id)!.n,
      mal: x.mal,
      kalite: x.q,
      fiyat: x.fiyat,
      satilan: x.adet,
      kalan: x.kalan,
      hasilat: x.hasilat,
      payYuzde: Math.round(x.pay * 1000) / 10,
      carpanlar: x.carpan,
      cekicilik: x.a,
      bMal: x.bMal,
      npcTavan: x.npcTavan,
      neden: x.neden,
    }));
    if (!satisVar || !yerVar(k, id)) {
      t.gs = { ay, kepenk: true, ...(satirDokumu.length ? { satirlar: satirDokumu } : {}) };
      continue;
    }
    const hasilat = benim.reduce((a, x) => a + x.hasilat, 0);
    const v = vergiAyir(md, id, hasilat, oran);
    (md.vergiKesir ??= {})[id] = v.kalan;
    vergiToplam += v.vergi;
    md.kaynak = (md.kaynak ?? 0) + hasilat;
    girdiEkle(k, id, ay, v.net, benim.filter((x) => x.adet > 0).length);
    // Bilgi veren olaylar (ayda bir; dönüm her ay bir kez işlenir): satış yapan dükkânın gün sonu, raf boşaldıysa kepenk.
    const ad = tapu.y?.ad ?? "";
    if (adet > 0) {
      const enCok = [...benim].sort((a, b) => b.adet - a.adet || b.hasilat - a.hasilat)[0]!;
      olaylar.push({ t: "tezgah", w: tapu.s, h: "", g: tapu.s, n: 2, k: "olay.tezgah.gunSonu", p: { isletme: id, ad, adet, hasilat, mal: enCok.mal } });
      if (rafBos(t)) olaylar.push({ t: "tezgah", w: tapu.s, h: "", g: tapu.s, n: 2, k: "olay.tezgah.kepenkIndi", p: { isletme: id, ad } });
    }
    const seviye = tapu.y?.seviye ?? 0;
    t.gs = {
      ay,
      kepenk: false,
      hasilat,
      vergi: { oran, tutar: v.vergi },
      net: v.net,
      tavan: { seviye: DUKKAN_NPC_TAVAN[seviye] ?? DUKKAN_NPC_TAVAN[0]!, kullanilan: hasilat },
      satirlar: satirDokumu,
      ...hKancaDokumu(k, hkHarita.get(id), benim.map((x) => x.mal)),
    };
  }
  if (vergiToplam > 0) (md.vergiGiden ??= []).push({ anahtar: `y:${k.y}:tz:vergi:${ay}`, tutar: vergiToplam, yerlesim: k.y });
  md.tzo = { ay, yontem: r.yontem, butce: r.butce, harcanan: r.harcanan, meslekler: r.meslekler };
  olaylar.push(...atolyeDonumu(k, ay));
  olaylar.push(...hanDonumu(k, ay));
  return olaylar;
}

/**
 * Atölye ay dönümü (Dilim 2): üretim emirleri havuzdaki emek ve o ayın NPC emeğiyle işlenir (alt istek yok; ustalar
 * dönümde yüklü). Biten ayda anlık üretim ya da toplu sipariş teslimi olduysa ya da emir işlendiyse ay üretimlidir:
 * işletmeye "tezgah" girdisi (satir 1) gider, bakım/maaş/itibar işler; değilse kepenkli. Sonra toplu sipariş dönümü.
 */
function atolyeDonumu(k: Kasaba, ay: number): OlayTaslagi[] {
  const olaylar: OlayTaslagi[] = [];
  const md = mulkDefteri(k);
  const tz = (md.tz ??= {});
  const zanaatlar: MeslekId[] = [];
  for (const [id, tapu] of Object.entries(md.t)) {
    const c = isletmeCoz(id);
    if (!c || c.tur !== "atolye" || c.yerlesim !== k.y || tapu.y?.durum === "iflas") continue;
    const t = (tz[id] ??= bosTezgah());
    const seviye = tapu.y?.seviye ?? 0;
    t.gk ??= seviye;
    zanaatHazirla(k, md, id, t);
    if (t.za) zanaatlar.push(t.za);
    const ad = tapu.y?.ad ?? "";
    // Emek veren NPC: maaşı emanetten karşılanan (işletme yansısı); eski yansıda nt yoksa hepsi karşılanmış sayılır.
    const ne = tapu.y?.ne ?? 0;
    const nt = Math.max(ne, tapu.y?.nt ?? ne);
    const adaylar = atolyeAdaylari(k, md, id);
    const kk = kancaAdaylari(k, md, id, ay - 1);
    const u = emirleriIsle({
      t,
      isletme: id,
      seviye,
      kapasite: depoKapasitesi("atolye", etkinSeviye(t, seviye), kancaHesapla(kk, "depo").deger),
      npcEmek: NPC_EMEK_AY * ne,
      adaylar,
      ay,
      ...(t.za ? { kanca: { kalite: kancaHesapla(kk, "atolyeKalite", { meslek: t.za }).deger, npcCeza: kancaHesapla(kk, "npcCeza", { meslek: t.za }).deger } } : {}),
    });
    for (const l of u.levha) {
      const lv = levhaYaz(k, l.usta, l.tarif, l.mal, l.q, ay, [id, ad]);
      if (lv) olaylar.push(lv.olay);
    }
    const uretimli = t.ua === ay - 1 || u.yapim > 0;
    t.kk = uretimli || t.se === ay - 1 ? 0 : t.kk + 1;
    const dokum = { ay, kepenk: !uretimli, anlik: t.ua === ay - 1, yapim: u.yapim, emek: u.emek, npc: npcDokumu(ne, nt), emirler: u.emirler.slice(0, URETIM_DOKUM_EN_COK) };
    t.gs = dokum;
    if (uretimli && yerVar(k, id)) girdiEkle(k, id, ay, 0, 1);
    if (u.yapim > 0) {
      const enCok = [...u.emirler].sort((a, b) => b.cikti.adet - a.cikti.adet)[0]!;
      olaylar.push({ t: "tezgah", w: tapu.s, h: "", g: tapu.s, n: 2, k: "olay.tezgah.uretim", p: { isletme: id, ad, yapim: u.yapim, mal: enCok.cikti.mal, adet: enCok.cikti.adet } });
    }
  }
  const tsp = (md.tsp ??= { l: [] });
  const r = topluDonumu(tsp, k.y, ay, zanaatlar);
  if (r.acilan) olaylar.push({ t: "tezgah", w: "", h: "", g: "", n: 3, k: "olay.tezgah.topluSiparis", p: { siparis: r.acilan.id, meslek: r.acilan.meslek, mal: r.acilan.mal, adet: r.acilan.adet, odul: r.acilan.odul } });
  if (!tsp.l.length && tsp.sm === undefined) delete md.tsp;
  return olaylar;
}

/** NPC emeği dökümü: sözleşmeli NPC, emek veren ve maaşı emanetten karşılanmadığı için emek vermeyen (gizli sayı yok). */
export function npcDokumu(ne: number, nt: number) {
  return { sozlesme: nt, emekVeren: ne, maassiz: nt - ne, neden: nt > ne ? ("emanet_maas_yetmez" as const) : null };
}

/** Han yolcu havuzu: açık hanlar (NPC hanı sabit çekicilikle) Y'yi paylaşır; NPC hanının payı yanar. */
function hanDonumu(k: Kasaba, ay: number): OlayTaslagi[] {
  const olaylar: OlayTaslagi[] = [];
  const md = mulkDefteri(k);
  const hanlar: YolcuHani[] = [];
  for (const no of hanNolari(k)) {
    const id = isletmeKimligi(k.y, "han", no);
    const t = md.t[id];
    if (!t) {
      if (no === NPC_HAN_NO) hanlar.push({ no, isletme: null, fc: 100, kalite: 0, itibar: 0, seviye: 0 });
      continue;
    }
    const y = t.y;
    if (!y || y.durum !== "acik" || !y.kapi || !yerVar(k, id)) continue;
    const h = kancaHesapla(kancaAdaylari(k, md, id, ay - 1), "hanH").deger;
    hanlar.push({ no, isletme: id, fc: y.fc, kalite: y.kq ?? 0, itibar: y.it ?? ITIBAR_BASLANGIC, seviye: y.seviye, ...(h > 0 ? { hYuzde: h } : {}) });
  }
  const r = yolcuCoz(k.tur, hanlar);
  for (const h of r.hanlar) {
    if (h.isletme === null || h.tutar <= 0) continue;
    md.kaynak = (md.kaynak ?? 0) + h.tutar;
    girdiEkle(k, h.isletme, ay, h.tutar, 0);
    const t = md.t[h.isletme]!;
    olaylar.push({ t: "han", w: t.s, h: "", g: t.s, n: 2, k: "olay.han.yolcuPayi", p: { isletme: h.isletme, ad: t.y?.ad ?? "", tutar: h.tutar, payYuzde: Math.round(h.pay * 1000) / 10 } });
  }
  md.hy = { ay, ...r };
  return olaylar;
}

/** Toplanan ay girdilerini işletme başına tek "tezgah" kaydıyla çıkış kutusuna yazar (yer yoksa bekler). */
export function tezgahKayitlariAc(k: Kasaba, an: number): number {
  const md = k.mk;
  if (!md?.tzb) return 0;
  let n = 0;
  for (const [isletme, l] of Object.entries(md.tzb)) {
    if (!l.length) {
      delete md.tzb[isletme];
      continue;
    }
    const a = l.reduce((t, e) => t + e[1], 0);
    const i = `y:${k.y}:tz:${isletme}:${l[0]![0]}-${l[l.length - 1]![0]}`;
    if (!cikisAc(md.cik, { i, t: "tezgah", h: isletme, a, y: { isletme, aylar: l } }, an, CIKIS_EN_COK + TEZGAH_KAYIT_PAYI)) break;
    delete md.tzb[isletme];
    n++;
  }
  if (Object.keys(md.tzb).length === 0) delete md.tzb;
  return n;
}

/** Mal kataloğu kısayolu (görünüm). */
export function malMeslegi(m: MalId): MeslekId {
  return MALLAR[m].meslek;
}

/** Hanın son yolcu payı dökümü (yalnız sahibi ve oyuncu çalışanı için; rakip görmez). */
export function yolcuKarti(k: Kasaba, isletme: string, o: string): { ay: number; payYuzde: number; tutar: number; tavan: number; carpan: { F: number; K: number; R: number; H: number }; kanca: ReturnType<typeof kancaDokumu> } | undefined {
  const md = k.mk;
  const t = md?.t[isletme];
  if (!t || (t.s !== o && !t.y?.py?.some(([x]) => x === o))) return undefined;
  const hy = md!.hy as { ay: number; hanlar: { isletme: string | null; pay: number; tutar: number; tavan: number; carpan: { F: number; K: number; R: number; H: number } }[] } | undefined;
  const h = hy?.hanlar.find((x) => x.isletme === isletme);
  if (!hy || !h) return undefined;
  // Kanca dökümü bugünkü kadrodan (gelecek ayın H'si); son ayın H'si carpan.H'de.
  return { ay: hy.ay, payYuzde: Math.round(h.pay * 1000) / 10, tutar: h.tutar, tavan: h.tavan, carpan: h.carpan, kanca: kancaDokumu(kancaHesapla(kancaAdaylari(k, md!, isletme), "hanH"), (x) => kisiAdi(k, x), { o, sahip: t.s === o }) };
}
