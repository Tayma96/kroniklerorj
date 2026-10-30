// Ay dönümü (§3, §13.8: yalnız gündem, yaşlanma ve ekonomi toplu işlenir). Sıra sabittir ve tohumludur
// (yerleşim + ay): ölüm → gündem → gündem çözümü (geçim, evlilik, dostluk) → doğum → göç → oyuncular
// (Kül Yemini kancası, öğrenme günü, çırak harçlığı, NPC'nin kendiliğinden hamlesi) → anı sönmesi.
// Yaş saklanmaz, doğum ayından hesaplanır; böylece yaşlanma her dönümde kendiliğinden ilerler.

import { MESLEKLER } from "../icerik/kisilik.ts";
import { AZALAN_PENCERE, iliskiAl } from "./eylem.ts";
import { aniYuku, gorus, gorusDegeri } from "./gorus.ts";
import { beceriEkle } from "./karakter.ts";
import { GUN_BASINA_AY, OGRENME_SURESI_AY, ogrenmeBaslangici } from "./ogrenme.ts";
import { npcKimlik, npcRef, oyuncuRef, yas } from "./ortak.ts";
import { aralik, dizinSec, tohumlu, type Zar } from "./rastgele.ts";
import { GUNDEM, GUNDEM_ADI, type Kalem, type Kasaba, type Npc, type OlayTaslagi } from "./tipler.ts";
import { bagKur, cocukDogur, haneUret, ISSIZ, kasabadaUret, meslekSec } from "./uret.ts";

/** [PARAMETRE] Yaşa göre yıllık ölüm olasılığı. */
export function olumOrani(y: number): number {
  if (y < 1) return 0.08;
  if (y < 5) return 0.03;
  if (y < 40) return 0.006;
  if (y < 55) return 0.015;
  if (y < 65) return 0.04;
  if (y < 75) return 0.1;
  return 0.25;
}

/** [PARAMETRE] Aylık olasılıklar. */
export const ORAN = {
  isBulma: 0.12,
  evlenme: 0.09,
  dostEdinme: 0.1,
  dogum: 0.011,
  goc: 0.25,
  corba: 0.05,
  laf: 0.05,
} as const;
/** NPC kendiliğinden hamlesi için görüş eşikleri (NUFUS.md Aşama 3b). */
export const DOST_ESIGI = 30;
export const HASIM_ESIGI = -30;
export const LAF_YUKU = -3;
/** Ayda en çok kaç gündem olayı defterde yer alır (kalabalık olmasın; gündemin kendisi herkes için işler). */
const GUNDEM_OLAYI_EN_COK = 3;

const KUL_YEMINI_AYI = 13 * 12;

function olay(t: string, k: string, n: number, p: OlayTaslagi["p"], ek: Partial<OlayTaslagi> = {}): OlayTaslagi {
  return { t, w: "", h: "", g: "", n, k, p, ...ek };
}

function kardesMi(a: Npc, b: Npc): boolean {
  return (a.an !== 0 && a.an === b.an) || (a.ba !== 0 && a.ba === b.ba);
}

function esAdayi(kasaba: Kasaba, n: Npc, ay: number, r: Zar): Npc | undefined {
  const ny = yas(n.d, ay);
  const istekli: Npc[] = [];
  const diger: Npc[] = [];
  for (const o of kasaba.npc) {
    if (o.k === n.k || o.es || o.e === n.e || kardesMi(o, n) || o.an === n.i || o.ba === n.i || n.an === o.i || n.ba === o.i) continue;
    const oy = yas(o.d, ay);
    if (oy < 17 || Math.abs(oy - ny) > 10) continue;
    (o.g === GUNDEM.evlilik ? istekli : diger).push(o);
  }
  const havuz = istekli.length ? istekli : diger;
  return havuz.length ? havuz[dizinSec(havuz.length, r)] : undefined;
}

function dostAdayi(kasaba: Kasaba, n: Npc, ay: number, r: Zar): Npc | undefined {
  const ny = yas(n.d, ay);
  for (let deneme = 0; deneme < 8; deneme++) {
    const o = kasaba.npc[dizinSec(kasaba.npc.length, r)];
    if (!o || o === n || o.e === n.e || o.b.length >= 4 || n.b.some((b) => b[0] === o.i)) continue;
    const oy = yas(o.d, ay);
    if (oy >= 16 && Math.abs(oy - ny) <= 12) return o;
  }
  return undefined;
}

function enAgirSebep(kalemler: Kalem[], yon: 1 | -1): string {
  let en: Kalem | undefined;
  for (const k of kalemler) if (k.k !== "gorus.sinir" && k.d * yon > 0 && (!en || k.d * yon > en.d * yon)) en = k;
  return en?.k ?? "gorus.gecmis";
}

/**
 * `ay` ayının dönümünü işler (kasaba.ay + 1 olmalı); kasabayı yerinde değiştirir, olay taslaklarını sırayla
 * döndürür. Oyuncuya dokunan adımlar için sakinlerin karakter ve ilişki haritaları yüklenmiş olmalıdır.
 */
export function ayDonumu(kasaba: Kasaba, ay: number): OlayTaslagi[] {
  const r = tohumlu("donum", kasaba.y, ay);
  const olaylar: OlayTaslagi[] = [];

  // 1. Ölüm
  const olenler: Npc[] = [];
  for (const n of kasaba.npc) if (r() < olumOrani(yas(n.d, ay)) / 12) olenler.push(n);
  if (olenler.length) {
    const olu = new Set(olenler.map((n) => n.i));
    kasaba.npc = kasaba.npc.filter((n) => !olu.has(n.i));
    for (const n of olenler) {
      kasaba.dizin.delete(n.i);
      olaylar.push(olay("olum", "olay.olum", 3, { kisi: npcRef(n), yas: yas(n.d, ay) }, { w: npcKimlik(n.i) }));
    }
    for (const n of kasaba.npc) {
      if (n.es && olu.has(n.es)) n.es = 0;
      if (n.b.length && n.b.some((b) => olu.has(b[0]))) n.b = n.b.filter((b) => !olu.has(b[0]));
    }
    for (const kar of kasaba.kar.values()) {
      for (const n of olenler) {
        if (kar.us === n.i) {
          kar.us = 0;
          olaylar.push(olay("olum", "olay.ustaOldu", 8, { kisi: npcRef(n) }, { w: npcKimlik(n.i), h: kar.o, g: kar.o }));
        } else if (n.i === kar.an || n.i === kar.ba) {
          olaylar.push(olay("olum", "olay.yakinOldu", 9, { kisi: npcRef(n) }, { w: npcKimlik(n.i), h: kar.o, g: kar.o }));
        }
      }
    }
  }

  // 2. Gündem: her NPC doğum ayında ihtiyacına bakar (yılda bir; yük aylara yayılır).
  const yeniGundem: Npc[] = [];
  for (const n of kasaba.npc) {
    if ((((ay - n.d) % 12) + 12) % 12 !== 0) continue;
    const y = yas(n.d, ay);
    let g: number = GUNDEM.yok;
    if (y >= 16 && n.m === ISSIZ) g = GUNDEM.gecim;
    else if (y >= 18 && y <= 40 && !n.es) g = GUNDEM.evlilik;
    else if (y >= 16 && !n.b.some((b) => b[1] === 1)) g = GUNDEM.dostluk;
    if (g !== n.g && g !== GUNDEM.yok) yeniGundem.push(n);
    n.g = g;
  }
  for (let i = 0; i < GUNDEM_OLAYI_EN_COK && yeniGundem.length; i++) {
    const n = yeniGundem.splice(dizinSec(yeniGundem.length, r), 1)[0];
    if (n) olaylar.push(olay("gundem", "olay.gundem", 2, { kisi: npcRef(n), gundem: GUNDEM_ADI[n.g] ?? "" }, { w: npcKimlik(n.i) }));
  }

  // 3. Gündem çözümü
  for (const n of kasaba.npc) {
    if (n.g === GUNDEM.gecim) {
      if (n.m !== ISSIZ) n.g = GUNDEM.yok;
      else if (r() < ORAN.isBulma) {
        let m = ISSIZ;
        for (let d = 0; d < 6 && m === ISSIZ; d++) m = meslekSec(kasaba.tur, r);
        if (m !== ISSIZ) {
          n.m = m;
          n.g = GUNDEM.yok;
          olaylar.push(olay("gundem", "olay.isBuldu", 2, { kisi: npcRef(n), meslek: MESLEKLER[m] ?? "" }, { w: npcKimlik(n.i) }));
        }
      }
    } else if (n.g === GUNDEM.evlilik) {
      if (n.es) n.g = GUNDEM.yok;
      else if (r() < ORAN.evlenme) {
        const o = esAdayi(kasaba, n, ay, r);
        if (o) {
          const [koca, kari] = n.k ? [o, n] : [n, o];
          koca.es = kari.i;
          kari.es = koca.i;
          kari.e = koca.e;
          koca.g = GUNDEM.yok;
          kari.g = GUNDEM.yok;
          olaylar.push(olay("evlilik", "olay.evlilik", 4, { a: npcRef(koca), b: npcRef(kari) }, { w: npcKimlik(koca.i), h: npcKimlik(kari.i) }));
        }
      }
    } else if (n.g === GUNDEM.dostluk && r() < ORAN.dostEdinme) {
      const o = dostAdayi(kasaba, n, ay, r);
      if (o) {
        bagKur(n, o, 1, aralik(r, 30, 60), ay);
        n.g = GUNDEM.yok;
        if (o.g === GUNDEM.dostluk) o.g = GUNDEM.yok;
        olaylar.push(olay("dostluk", "olay.dostluk", 1, { a: npcRef(n), b: npcRef(o) }, { w: npcKimlik(n.i), h: npcKimlik(o.i) }));
      }
    }
  }

  // 4. Doğum (nüfus dengesi: hedefin altında artar, üstünde azalır)
  const nufus = kasaba.npc.length;
  const denge = Math.min(3, Math.max(0.1, (kasaba.hedef / Math.max(1, nufus)) ** 4));
  const cocuk = new Map<number, number>();
  for (const n of kasaba.npc) if (n.an) cocuk.set(n.an, (cocuk.get(n.an) ?? 0) + 1);
  const anneler = kasaba.npc.filter((n) => {
    if (n.k !== 1 || !n.es) return false;
    const y = yas(n.d, ay);
    return y >= 17 && y <= 44 && (cocuk.get(n.i) ?? 0) < 7;
  });
  for (const anne of anneler) {
    const baba = kasaba.dizin.get(anne.es);
    if (!baba || r() >= ORAN.dogum * denge) continue;
    const c = cocukDogur(kasaba, anne, baba, ay, r);
    olaylar.push(
      olay("dogum", "olay.dogum", 3, { anne: npcRef(anne), baba: npcRef(baba), cocuk: npcRef(c) }, { w: npcKimlik(c.i), h: npcKimlik(anne.i) }),
    );
  }

  // 5. Göç: nüfus hedefin çok altındaysa yeni bir hane gelir.
  if (kasaba.npc.length < kasaba.hedef * 0.85 && r() < ORAN.goc) {
    const uyeler = kasabadaUret(kasaba, ay, (b) => haneUret(b, r));
    const bas = uyeler[0];
    if (bas) olaylar.push(olay("goc", "olay.goc", 3, { kisi: npcRef(bas), sayi: uyeler.length }, { w: npcKimlik(bas.i) }));
  }

  // 6. Oyuncular
  for (const s of kasaba.sakin) {
    if (ay - s.d === KUL_YEMINI_AYI) {
      olaylar.push(olay("yas", "olay.kulYemini", 10, { kisi: oyuncuRef(s) }, { w: s.o, h: s.o, g: s.o }));
      const k = kasaba.kar.get(s.o);
      if (k) k.ky = 1;
    }
    const gecen = ay - ogrenmeBaslangici(s);
    if (gecen > 0 && gecen < OGRENME_SURESI_AY && gecen % GUN_BASINA_AY === 0) {
      olaylar.push(olay("ogrenme", "olay.ogrenme.gun", 6, { gun: gecen / GUN_BASINA_AY + 1 }, { h: s.o, g: s.o }));
    }
    const kar = kasaba.kar.get(s.o);
    const ili = kasaba.ili.get(s.o);
    if (!kar || !ili) continue;
    if (kar.us && kasaba.dizin.has(kar.us)) {
      kar.pa += 1;
      beceriEkle(kar, ay, "zanaat", 1);
    }
    // NPC'nin kendiliğinden hamlesi: ilişkisi olanlar ve ocağın ailesi (görüş ≥ 30 dost, ≤ −30 hasım).
    const adaylar = new Set<number>();
    for (const a of Object.keys(ili)) if (a !== "0") adaylar.add(Number(a));
    if (kar.e) for (const n of kasaba.npc) if (n.e === kar.e) adaylar.add(n.i);
    let corba = false;
    let laf = false;
    for (const i of [...adaylar].sort((a, b) => a - b)) {
      const npc = kasaba.dizin.get(i);
      if (!npc || yas(npc.d, ay) < 14) continue;
      const v = gorusDegeri(kasaba, npc, kar, ili, ay);
      if (!corba && v >= DOST_ESIGI && r() < ORAN.corba) {
        corba = true;
        kar.pa += 1;
        const sebep = enAgirSebep(gorus(kasaba, npc, kar, ili, ay).kalemler, 1);
        olaylar.push(olay("hamle", "olay.hamle.corba", 5, { kisi: npcRef(npc), sebep }, { w: npcKimlik(i), h: kar.o, g: kar.o }));
      } else if (!laf && v <= HASIM_ESIGI && r() < ORAN.laf) {
        laf = true;
        const sebep = enAgirSebep(gorus(kasaba, npc, kar, ili, ay).kalemler, -1);
        for (const b of npc.b) if (b[1] === 1 && kasaba.dizin.has(b[0])) iliskiAl(ili, b[0]).an.push(["laf", LAF_YUKU, ay]);
        olaylar.push(olay("hamle", "olay.hamle.laf", 7, { kisi: npcRef(npc), sebep }, { w: npcKimlik(i), h: kar.o, g: kar.o }));
      }
    }
    // Anı sönmesi: yükü 1'in altına inen anılar ve pencereden çıkan tekrar kayıtları silinir.
    for (const [a, i] of Object.entries(ili)) {
      if (i.an.length) i.an = i.an.filter((x) => Math.abs(aniYuku(x, ay)) >= 1);
      for (const [tur, aylar] of Object.entries(i.az)) {
        const kalan = aylar.filter((x) => ay - x < AZALAN_PENCERE);
        if (kalan.length) i.az[tur] = kalan;
        else delete i.az[tur];
      }
      if (i.t === 0 && i.an.length === 0 && Object.keys(i.az).length === 0) delete ili[a];
    }
  }

  kasaba.ay = ay;
  return olaylar;
}
