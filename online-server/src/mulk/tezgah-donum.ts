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
import { partiToplam, type Tezgah } from "./depo.ts";
import { talepCoz, yolcuCoz, type Dukkan, type TalepSatiri, type YolcuHani } from "./hane-butcesi.ts";
import { ITIBAR_BASLANGIC, NPC_HAN_NO, isletmeCoz, isletmeKimligi } from "./kurallar.ts";
import { rafBos, raftanSat } from "./raf.ts";
import { hanNolari, mulkDefteri, vergiAyir } from "./tapu.ts";
import { CIKIS_EN_COK, cikisAc } from "./transfer.ts";
import { DUKKAN_NPC_TAVAN, PAY_YONTEMI, TEZGAH_KAYIT_PAYI } from "./tezgah-kurallar.ts";

/** Yerleşimde o meslekte (ana meslek) yaşayan oyuncu sayısı (kıtlık sinyali). */
export function meslekOyuncuSayaci(k: Kasaba): (m: MeslekId) => number {
  const say = new Map<string, number>();
  for (const kar of k.kar.values()) {
    if (olduMu(kar) || kar.gc || !kar.ms?.a) continue;
    say.set(kar.ms.a, (say.get(kar.ms.a) ?? 0) + 1);
  }
  return (m) => say.get(m) ?? 0;
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
  for (const [id, tapu] of Object.entries(md.t)) {
    const c = isletmeCoz(id);
    if (!c || c.tur !== "dukkan" || c.yerlesim !== k.y || tapu.y?.durum === "iflas") continue;
    const t = tz[id];
    const dolu = !!t && t.r.some((s) => partiToplam(s.p) > 0);
    if (!dolu) {
      // Kepenk: bakım, iflas sayacı, itibar kaybı, faaliyet ayı yok (işletmeye kayıt gitmez).
      if (t) {
        t.kk++;
        t.gs = { ay, kepenk: true };
      }
      continue;
    }
    t.kk = 0;
    if (!yerVar(k, id)) {
      t.gs = { ay, kepenk: false, ertelendi: true };
      continue;
    }
    const seviye = tapu.y?.seviye ?? 0;
    dukkanlar.set(id, { id, itibar: tapu.y?.it ?? ITIBAR_BASLANGIC, tavan: DUKKAN_NPC_TAVAN[seviye] ?? DUKKAN_NPC_TAVAN[0]! });
    for (const s of t.r) {
      const sid = `${id}#${s.n}`;
      satirHaritasi.set(sid, { t, n: s.n });
      satirlar.push({ id: sid, dukkan: id, mal: s.m, q: s.q, adet: partiToplam(s.p), fiyat: s.f });
    }
  }
  const r = talepCoz(k.tur, satirlar, dukkanlar, meslekOyuncuSayaci(k), PAY_YONTEMI);
  const oran = Number.isInteger(md.vo) && md.vo! >= 0 && md.vo! <= 4 ? md.vo! : 0;
  let vergiToplam = 0;
  for (const [id] of dukkanlar) {
    const t = tz[id]!;
    const benim = r.satirlar.filter((x) => x.dukkan === id);
    for (const x of benim) {
      if (x.adet <= 0) continue;
      const s = t.r.find((y) => y.n === satirHaritasi.get(x.id)!.n);
      if (s) raftanSat(t, s, x.adet);
    }
    const hasilat = benim.reduce((a, x) => a + x.hasilat, 0);
    const v = vergiAyir(md, id, hasilat, oran);
    (md.vergiKesir ??= {})[id] = v.kalan;
    vergiToplam += v.vergi;
    md.kaynak = (md.kaynak ?? 0) + hasilat;
    const satir = benim.filter((x) => x.adet > 0).length;
    girdiEkle(k, id, ay, v.net, satir);
    // Bilgi veren olaylar (ayda bir; dönüm her ay bir kez işlenir): satış yapan dükkânın gün sonu, raf boşaldıysa kepenk.
    const sahip = md.t[id]!.s;
    const ad = md.t[id]!.y?.ad ?? "";
    const adet = benim.reduce((a, x) => a + x.adet, 0);
    if (adet > 0) {
      const enCok = [...benim].sort((a, b) => b.adet - a.adet || b.hasilat - a.hasilat)[0]!;
      olaylar.push({ t: "tezgah", w: sahip, h: "", g: sahip, n: 2, k: "olay.tezgah.gunSonu", p: { isletme: id, ad, adet, hasilat, mal: enCok.mal } });
    }
    if (rafBos(t)) olaylar.push({ t: "tezgah", w: sahip, h: "", g: sahip, n: 2, k: "olay.tezgah.kepenkIndi", p: { isletme: id, ad } });
    const seviye = md.t[id]!.y?.seviye ?? 0;
    t.gs = {
      ay,
      kepenk: false,
      hasilat,
      vergi: { oran, tutar: v.vergi },
      net: v.net,
      tavan: { seviye: DUKKAN_NPC_TAVAN[seviye] ?? DUKKAN_NPC_TAVAN[0]!, kullanilan: hasilat },
      satirlar: benim.map((x) => ({
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
      })),
    };
  }
  if (vergiToplam > 0) (md.vergiGiden ??= []).push({ anahtar: `y:${k.y}:tz:vergi:${ay}`, tutar: vergiToplam, yerlesim: k.y });
  md.tzo = { ay, yontem: r.yontem, butce: r.butce, harcanan: r.harcanan, meslekler: r.meslekler };
  olaylar.push(...hanDonumu(k, ay));
  return olaylar;
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
    hanlar.push({ no, isletme: id, fc: y.fc, kalite: y.kq ?? 0, itibar: y.it ?? ITIBAR_BASLANGIC, seviye: y.seviye });
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
export function yolcuKarti(k: Kasaba, isletme: string, o: string): { ay: number; payYuzde: number; tutar: number; tavan: number; carpan: { F: number; K: number; R: number; H: number } } | undefined {
  const md = k.mk;
  const t = md?.t[isletme];
  if (!t || (t.s !== o && !t.y?.py?.some(([x]) => x === o))) return undefined;
  const hy = md!.hy as { ay: number; hanlar: { isletme: string | null; pay: number; tutar: number; tavan: number; carpan: { F: number; K: number; R: number; H: number } }[] } | undefined;
  const h = hy?.hanlar.find((x) => x.isletme === isletme);
  if (!hy || !h) return undefined;
  return { ay: hy.ay, payYuzde: Math.round(h.pay * 1000) / 10, tutar: h.tutar, tavan: h.tavan, carpan: h.carpan };
}
