// Casus (Faz 4, §6.3): bir NPC'ye akçe verip bir oyuncuyu 1-3 ay izletirsin. Her ay dönümünde casus izlenenin o ay
// kimlerle görüştüğünü (en çok 2) raporlar. Kaynak durumdur: izlenenin ilişki haritasındaki o ayın eylem izleri;
// özel eylemler (ayak işi, ret) rapora girmez, gizli görüşmenin (kışkırtma, katılım, arabuluculuk) yalnız varlığı
// görülür, içeriği değil. Güven düşükse rapor çarpık olabilir (yanlış kişi ya da mekân) ve "düşük" etiketiyle gelir.
// İzlenenin dostu casusu fark ederse ya da casus izlenene dost bakıyorsa haber izlenene gider ve casusluk biter.

import { HUYLAR } from "../icerik/kisilik.ts";
import { basarili, hata, type HataKodu, type Sonuc } from "../tipler.ts";
import { npcyeOde, ucgenAl, type Casus } from "./bilgi.ts";
import { mekanlar, npcMekani } from "./cizelge.ts";
import { DOST_ESIGI } from "./donum.ts";
import { engelliMi } from "./engel.ts";
import { gorusDegeri } from "./gorus.ts";
import { fark, haberVer } from "./haber.ts";
import { olduMu } from "./hanedan.ts";
import { karakterYasi, takatHarca, takatTazele } from "./karakter.ts";
import { npcKimlik, npcRef, oyuncuRef, sinirla, yas } from "./ortak.ts";
import { karma, tohumlu } from "./rastgele.ts";
import type { Dokum, Karakter, Kasaba, Npc, OlayTaslagi } from "./tipler.ts";
import { UCGEN_TAKAT, casusKimlik, dokumKur, type UcgenBaglami, type UcgenCiktisi } from "./ucgen-ortak.ts";

/** [PARAMETRE] Casus: yaş, aylık bedel (akçe; NPC'ye → kasaba hazinesi), kapı ve güvenilirlik. */
export const CASUS_YASI = 16;
export const CASUS_NPC_YASI = 16;
export const IZLENEN_YASI = 13;
export const CASUS_AYLIK_BEDEL = 3;
export const CASUS_GORUS_ESIGI = 0;
export const CASUS_GUVEN = { taban: 30, mekan: 25, sadakatBolen: 5, sadakatTavan: 10 } as const;
export const CASUS_HUY: Readonly<Record<string, number>> = { kurnaz: 20, utangaç: 10, sabırlı: 5, aceleci: -15, unutkan: -20, neşeli: -5 };
export const DUSUK_GUVEN = 40;
export const CARPIK_ORAN = 0.4;
export const RAPOR_EN_COK = 2;
export const CASUS_FARK_ORANI = 0.3;
export const CASUS_IHBAR_GUVEN = 90;
/** Rapora girmeyen özel eylem izleri; içeriği gizli görüşmeler. */
export const OZEL_IZLER: readonly string[] = ["ayakIsi", "cirakRed"];
export const GIZLI_GORUSMELER: readonly string[] = ["kiskirt", "katil", "arabulucu"];

export function casusKapisi(k: Kasaba, kar: Karakter, npc: Npc | undefined, izlenen: Karakter | undefined, ay: number, sure = 1): HataKodu | undefined {
  if (karakterYasi(kar, ay) < CASUS_YASI) return "yas_kapisi";
  if (!npc) return "kisi_yok";
  if (yas(npc.d, ay) < CASUS_NPC_YASI) return "hedef_uygun_degil";
  if (!izlenen || olduMu(izlenen)) return "kisi_yok";
  if (izlenen.o === kar.o) return "kendine";
  if (karakterYasi(izlenen, ay) < IZLENEN_YASI) return "yas_kapisi";
  if (engelliMi(k.tp, kar.o, izlenen.o)) return "engelli";
  if ((k.ug?.cs ?? []).some((c) => c.s === kar.o)) return "casus_var";
  if (gorusDegeri(k, npc, kar, k.ili.get(kar.o), ay) < CASUS_GORUS_ESIGI) return "guven_yetersiz";
  if (kar.pa < CASUS_AYLIK_BEDEL * sure) return "para_yok";
  takatTazele(kar, ay);
  if (kar.tk < UCGEN_TAKAT.casus) return "takat_yok";
  return undefined;
}

/** Raporun güvenilirliği (0..100): taban + huy + sahibine sadakat (+ mekân çakışması). */
export function casusGuveni(k: Kasaba, npc: Npc, sahip: Karakter, ay: number, mekanCakisti: boolean): Dokum {
  const d = dokumKur();
  d.ekle("guven.taban", CASUS_GUVEN.taban);
  const huy = HUYLAR[npc.h] ?? "";
  d.ekle("guven.huy", CASUS_HUY[huy] ?? 0, { huy });
  const g = gorusDegeri(k, npc, sahip, k.ili.get(sahip.o), ay);
  d.ekle("guven.sadakat", sinirla(Math.round(g / CASUS_GUVEN.sadakatBolen), -CASUS_GUVEN.sadakatTavan, CASUS_GUVEN.sadakatTavan), { gorus: g });
  if (mekanCakisti) d.ekle("guven.mekan", CASUS_GUVEN.mekan);
  return d.bitir(0, 100);
}

export function casusTut(b: UcgenBaglami, g: { npc: number; izlenen: string; sure: number }): Sonuc<UcgenCiktisi> {
  const { k, kar, ay } = b;
  const npc = k.dizin.get(g.npc);
  const izlenen = k.kar.get(g.izlenen);
  const engel = casusKapisi(k, kar, npc, izlenen, ay, g.sure);
  if (engel) return hata(engel);
  if (!npc || !izlenen || !takatHarca(kar, ay, UCGEN_TAKAT.casus)) return hata("takat_yok");
  const bedel = CASUS_AYLIK_BEDEL * g.sure;
  kar.pa -= bedel;
  npcyeOde(k, bedel);
  const ug = ucgenAl(k);
  const c: Casus = { i: ug.n++, s: kar.o, n: npc.i, iz: izlenen.o, a: ay, b: ay + g.sure };
  ug.cs.push(c);
  return basarili({
    yanit: {
      tur: "casus",
      casus: { id: casusKimlik(c.i), npc: npcKimlik(npc.i), izlenen: izlenen.o, bitis: c.b },
      guven: casusGuveni(k, npc, kar, ay, false),
      carpikOran: CARPIK_ORAN,
      dusukGuven: DUSUK_GUVEN,
      degisim: { para: -bedel },
    },
    olaylar: [],
    digerleri: [],
  });
}

interface Gorusme {
  npc: number;
  tur: string;
}

/** İzlenenin `m` ayındaki görüşmeleri (durumdan; özel izler hariç), deterministik sırayla. */
function gorusmeler(k: Kasaba, iz: string, m: number, tohum: number): Gorusme[] {
  const ili = k.ili.get(iz);
  if (!ili) return [];
  const sonuc: Gorusme[] = [];
  for (const [a, i] of Object.entries(ili)) {
    if (a === "0" || !k.dizin.has(Number(a))) continue;
    const turler = Object.entries(i.az).filter(([t, aylar]) => !OZEL_IZLER.includes(t) && aylar.includes(m)).map(([t]) => t);
    if (!turler.length) continue;
    const gizli = turler.some((t) => GIZLI_GORUSMELER.includes(t));
    sonuc.push({ npc: Number(a), tur: gizli ? "gizliGorusme" : turler.sort()[0]! });
  }
  return sonuc.sort((x, y) => karma(tohum, x.npc) - karma(tohum, y.npc));
}

/** Ay dönümü: her casus geçen ayı (ay − 1) bir kez rapor eder; süresi dolan, fark edilen ya da ihanet eden düşer. */
export function casusDonumu(k: Kasaba, ay: number): OlayTaslagi[] {
  const ug = k.ug;
  if (!ug || ug.cs.length === 0) return [];
  const olaylar: OlayTaslagi[] = [];
  const m = ay - 1;
  const kalan: Casus[] = [];
  for (const c of ug.cs) {
    const sahip = k.kar.get(c.s);
    const izlenen = k.kar.get(c.iz);
    const npc = k.dizin.get(c.n);
    if (!sahip || !izlenen || !npc || olduMu(sahip) || olduMu(izlenen) || m >= c.b) continue;
    if (m < c.a || c.r === m) {
      kalan.push(c);
      continue;
    }
    c.r = m;
    const r = tohumlu("casus", k.y, ay, c.i);
    const bitti = (neden: string) =>
      olaylar.push({ t: "ucgen", w: npcKimlik(npc.i), h: sahip.o, g: sahip.o, n: 5, k: "olay.ucgen.casusBitti", p: { casus: npcRef(npc), izlenen: oyuncuRef(izlenen), neden } });
    // Sadakat: izlenene dost bakan casus haber verir.
    if (gorusDegeri(k, npc, izlenen, k.ili.get(izlenen.o), m) >= DOST_ESIGI) {
      olaylar.push(...haberVer(k, { kaynak: npcKimlik(npc.i), kaynakRef: npcRef(npc), alici: izlenen.o, konu: sahip.o, tur: "casusIhbar", guven: CASUS_IHBAR_GUVEN, ay, p: { sahip: oyuncuRef(sahip), casus: npcRef(npc) }, onem: 8 }));
      bitti("birakti");
      continue;
    }
    const mekan = npcMekani(k, npc, m) ?? "meydan";
    const goren = fark(k, mekan, m, izlenen.o, [npcKimlik(npc.i), sahip.o]).find(() => r() < CASUS_FARK_ORANI);
    if (goren) {
      olaylar.push(...haberVer(k, { kaynak: goren.kim, kaynakRef: goren.ref, alici: izlenen.o, konu: sahip.o, tur: "casusFark", guven: goren.guven, ay, p: { casus: npcRef(npc), mekan } }));
      bitti("farkedildi");
      continue;
    }
    const liste = gorusmeler(k, izlenen.o, m, karma("casus", c.i, m)).slice(0, RAPOR_EN_COK);
    if (liste.length === 0) {
      olaylar.push({ t: "ucgen", w: npcKimlik(npc.i), h: sahip.o, g: sahip.o, n: 3, k: "olay.ucgen.casusBos", p: { casus: npcRef(npc), izlenen: oyuncuRef(izlenen) } });
    }
    for (const x of liste) {
      const gorulen = k.dizin.get(x.npc)!;
      const gercekMekan = npcMekani(k, gorulen, m) ?? "meydan";
      const guven = casusGuveni(k, npc, sahip, ay, mekan === gercekMekan).toplam;
      let kisi = gorulen;
      let yer = gercekMekan;
      if (guven < DUSUK_GUVEN && r() < CARPIK_ORAN) {
        if (r() < 0.5) {
          const adaylar = k.npc.filter((n) => n.i !== gorulen.i && yas(n.d, m) >= 14);
          kisi = adaylar[Math.floor(r() * adaylar.length)] ?? gorulen;
        } else {
          const yerler = mekanlar(k.tur).filter((y) => y !== gercekMekan);
          yer = yerler[Math.floor(r() * yerler.length)] ?? gercekMekan;
        }
      }
      olaylar.push({
        t: "ucgen", w: npcKimlik(npc.i), h: sahip.o, g: sahip.o, n: 5, k: "olay.ucgen.casusRapor",
        p: { casus: npcRef(npc), izlenen: oyuncuRef(izlenen), npc: npcRef(kisi), mekan: yer, tur: x.tur, guven, dusuk: guven < DUSUK_GUVEN ? 1 : 0, ay: m },
      });
    }
    if (m + 1 < c.b) kalan.push(c);
    else bitti("sure");
  }
  ug.cs = kalan;
  return olaylar;
}
