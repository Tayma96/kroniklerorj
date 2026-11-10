// Katmanlı NPC gündemi (GDD §4 nüfus katmanları, §5 NPC gündemleri, §20 Faz 5). Ay dönümünde, ana dönümden sonra
// kendi tohumuyla işler; ana dönümün zar sırasını bozmaz. Katmanlar:
//   1. Uzak (arka plan): bu ayın olaylarından birikimli sayaçlar; NPC'ye bakılmaz.
//   2. Kasaba geneli: tek hafif geçişle özet istatistik + süresi dolan gündemlerin sönmesi; ayrıca birkaç NPC'lik
//      tohumlu örneklem kasaba olayına bireysel karar verir (bütün nüfus ayrıntılı işlenmez).
//   3. Yakın çevre: yalnız etkin oturumdaki oyuncuların ~15 önemli kişisi ayrıntılı işlenir (konum + ihtiyaç +
//      tetik). Etkin oyuncu her dönümde yakın çevresinden en az bir NPC kaynaklı yeni gündem görür.
// Etkinlik: oyuncunun son oturum açılışı (`kar.kz`, GET /v1/yerlesim) dönüm anından en çok ETKIN_PENCERE_MS önce.
// Oyuncunun yerine karar verilmez; yalnız NPC'ler karar verir (OYNANIS §5).

import { AY_MS, DUNYA_BASLANGICI_MS, takvim } from "../saat.ts";
import { arkaPlanAl, gocNiyeti, kasabaGeneli, kasabaOlayi, sayacEkle, sayaclariIsle, tetikSurer, type ArkaPlan } from "./arka-plan.ts";
import { npcMekani } from "./cizelge.ts";
import { akrabalik, AKRABA_DEGERI } from "./gorus.ts";
import { olduMu } from "./hanedan.ts";
import { npcKarar, KARAR_YASI, type Karar, type KararBaglami } from "./npc-karar.ts";
import { npcKimlik, npcRef, yas } from "./ortak.ts";
import { dizinSec, tohumlu } from "./rastgele.ts";
import { GUNDEM, GUNDEM_ADI, type IliskiHaritasi, type Karakter, type Kasaba, type Npc, type OlayTaslagi } from "./tipler.ts";

/** [PARAMETRE] Etkin oturum penceresi: son oturum açılışı dönümden en çok bu kadar önceyse oyuncu etkindir. */
export const ETKIN_PENCERE_MS = 24 * 60 * 60 * 1000;
/** [PARAMETRE] Yakın çevre büyüklüğü (oyuncu başına) ve bir dönümde ayrıntılı işlenen NPC tavanı (bütün oyuncular). */
export const YAKIN_CEVRE_EN_COK = 15;
export const AYRINTILI_EN_COK = 60;
/** [PARAMETRE] Kasaba geneli örneklemi (etkin yerleşimde / boş yerleşimde). */
export const KASABA_ORNEK = 8;
export const KASABA_ORNEK_BOS = 3;
/** [PARAMETRE] Yakın çevrede bir NPC'nin bu ay ihtiyacını tartma olasılığı (kasaba olayı başladıysa herkes tartar). */
export const KARAR_ORANI = 0.35;
/** [PARAMETRE] Bir NPC'nin gündemi en erken kaç ay sonra değişebilir. */
export const GUNDEM_YENILEME = 3;
/** [PARAMETRE] Oyuncu başına dönümde en çok kaç yakın çevre gündemi olayı. */
export const OYUNCU_GUNDEM_EN_COK = 2;
/** [PARAMETRE] Yakın çevre sıralaması: tanıdık işareti, usta, anı başına ağırlık. */
export const YAKIN_AGIRLIK = { tanidik: 15, isaretli: 25, usta: 20, ani: 3 } as const;

/** Gündem → oyuncunun yapabileceği (mevcut eylem türü; Dönüş Kartı "şimdi ne yapabilirim?"). */
export const GUNDEM_FIRSAT: Readonly<Record<string, string>> = {
  gecim: "yardim",
  evlilik: "sohbet",
  dostluk: "sohbet",
  ambar: "hediye",
  nobet: "yardim",
  borc: "yardim",
  itibar: "sohbet",
  goc: "sohbet",
  merak: "sohbet",
};

export const donumAni = (ay: number): number => DUNYA_BASLANGICI_MS + ay * AY_MS;

/** Oyuncu bu dönümde etkin oturumda mı (son N saatte oturum açtı mı)? */
export function etkinMi(kar: Karakter, ay: number): boolean {
  return kar.kz > 0 && donumAni(ay) - kar.kz <= ETKIN_PENCERE_MS;
}

/**
 * Yakın çevre (~15 önemli kişi, 14+): ocağın ailesi, usta, tanıdıklar ve geçmişi olanlar; önem sırasıyla.
 * Bütün nüfus taranmaz: hane dizini, ilişki haritası ve tanıdık listesi yeter.
 */
export function yakinCevre(k: Kasaba, kar: Karakter, ili: IliskiHaritasi, ay: number, hane: ReadonlyMap<number, readonly Npc[]>): Npc[] {
  const puan = new Map<number, number>();
  const ekle = (i: number, d: number) => puan.set(i, (puan.get(i) ?? 0) + d);
  for (const n of kar.e ? hane.get(kar.e) ?? [] : []) ekle(n.i, 0);
  for (const i of [kar.an, kar.ba, kar.us]) if (i) ekle(i, 0);
  for (const [a, x] of Object.entries(ili)) if (a !== "0") ekle(Number(a), Math.abs(x.t) + x.an.length * YAKIN_AGIRLIK.ani);
  for (const [id, isaret] of Object.entries(kar.tn)) {
    if (id.startsWith("n")) ekle(Number(id.slice(1)), isaret === "tanidik" ? YAKIN_AGIRLIK.tanidik : YAKIN_AGIRLIK.isaretli);
  }
  const liste: [Npc, number][] = [];
  for (const [i, p] of puan) {
    const n = k.dizin.get(i);
    if (!n || yas(n.d, ay) < KARAR_YASI) continue;
    const rol = akrabalik(k, n, kar);
    liste.push([n, p + (rol ? AKRABA_DEGERI[rol] : 0) + (kar.us === i ? YAKIN_AGIRLIK.usta : 0)]);
  }
  liste.sort((a, b) => b[1] - a[1] || a[0].i - b[0].i);
  return liste.slice(0, YAKIN_CEVRE_EN_COK).map((x) => x[0]);
}

function uygula(ap: ArkaPlan, n: Npc, karar: Karar, ay: number): void {
  n.g = karar.gundem;
  n.ga = ay;
  sayacEkle(ap, `gundem.${GUNDEM_ADI[karar.gundem]}`);
  if (karar.gundem === GUNDEM.goc) gocNiyeti(ap, n.i, ay);
}

/**
 * Gündem değişebilir mi: boşsa ya da en az GUNDEM_YENILEME ay sürdüyse. Nüfus motorunu süren temel gündemler
 * (geçim, evlilik, dostluk: iş bulma, evlenme, dost edinme) yalnız kasaba olayı sürerken bozulur; böylece katman
 * nüfus dengesini kaydırmaz.
 */
const degisebilir = (n: Npc, ay: number, tetikVar: boolean) =>
  n.g === GUNDEM.yok || ((tetikVar || n.g >= GUNDEM.ambar) && ay - (n.ga ?? -1e9) >= GUNDEM_YENILEME);

function gundemOlayi(n: Npc, kar: Karakter, karar: Karar): OlayTaslagi {
  const ad = GUNDEM_ADI[karar.gundem] ?? "";
  return {
    t: "gundem",
    w: npcKimlik(n.i),
    h: kar.o,
    g: kar.o,
    n: 5,
    k: "olay.gundem.yeni",
    p: { kisi: npcRef(n), gundem: ad, ihtiyac: karar.ihtiyac, sebep: karar.sebep, deger: karar.deger, firsat: GUNDEM_FIRSAT[ad] ?? "sohbet" },
  };
}

/** Bir dönümün katmanlı gündemi; `ayrintili` ayrıntılı işlenen NPC sayısıdır (ölçek denetimi). */
export function gundemKatmanlari(k: Kasaba, ay: number, buAy: readonly OlayTaslagi[]): { olaylar: OlayTaslagi[]; ayrintili: number } {
  const ap = arkaPlanAl(k);
  const olaylar: OlayTaslagi[] = [];
  const etkinler: [Karakter, IliskiHaritasi][] = [];
  for (const s of k.sakin) {
    const kar = k.kar.get(s.o);
    const ili = k.ili.get(s.o);
    if (kar && ili && !olduMu(kar) && etkinMi(kar, ay)) etkinler.push([kar, ili]);
  }
  const bos = etkinler.length === 0;

  // 1. Uzak katman: sayaçlar.
  sayaclariIsle(ap, buAy);

  // 2. Kasaba geneli: özet + sönme + borç çözümü (NPC borç isteği gündemden sonra kabul edildiyse).
  const borcVerenler = new Map<number, string>();
  for (const t of k.tp?.tk ?? []) {
    if (t.t !== "npcBorc" || t.ka === undefined || (t.d !== "surer" && t.d !== "bitti")) continue;
    const n = k.dizin.get(Number(t.g.slice(1)));
    if (n && n.g === GUNDEM.borc && t.ka >= (n.ga ?? 0)) borcVerenler.set(n.i, t.a);
  }
  const { hane, olaylar: cozulen } = kasabaGeneli(k, ap, ay, borcVerenler);
  olaylar.push(...cozulen);
  const { tetik, olaylar: kasabaO } = kasabaOlayi(k, ap, ay, bos);
  olaylar.push(...kasabaO);
  const temel: KararBaglami = { hane, kitlik: tetikSurer(ap, "kitlik", ay), haydut: tetikSurer(ap, "haydut", ay), mevsim: takvim(ay).mevsim };
  const tetikVar = temel.kitlik || temel.haydut;
  const r = tohumlu("gundem", k.y, ay);
  const oran = tetik ? 1 : KARAR_ORANI;

  // 3. Yakın çevre (ayrıntılı): konum + ihtiyaç + tetik.
  const islenen = new Set<number>();
  const yeni = new Map<number, Karar>();
  const mekanAgirlik: number[] = [];
  const cevreler: Npc[][] = [];
  for (const [kar, ili] of etkinler) {
    const cevre = yakinCevre(k, kar, ili, ay, hane);
    cevreler.push(cevre);
    for (const n of cevre) {
      if (islenen.has(n.i)) continue;
      if (islenen.size >= AYRINTILI_EN_COK) break;
      islenen.add(n.i);
      if (!degisebilir(n, ay, tetikVar) || r() >= oran) continue;
      const mekan = npcMekani(k, n, ay, mekanAgirlik);
      const karar = npcKarar(k, n, ay, mekan ? { ...temel, mekan } : temel, { haric: n.g });
      if (karar) {
        uygula(ap, n, karar, ay);
        yeni.set(n.i, karar);
      }
    }
  }
  // Etkin oturum güvencesi: yakın çevreden en az bir yeni gündem (önce gündemsizler, sonra en eskisi).
  etkinler.forEach(([kar], j) => {
    const cevre = cevreler[j] ?? [];
    const kendi = cevre.filter((n) => yeni.has(n.i));
    if (kendi.length === 0) {
      const once = (n: Npc) => (degisebilir(n, ay, tetikVar) ? 2 : 0) + (n.g === GUNDEM.yok ? 1 : 0);
      const aday = cevre.filter((n) => !yeni.has(n.i)).sort((a, b) => once(b) - once(a) || (a.ga ?? -1e9) - (b.ga ?? -1e9) || a.i - b.i);
      // Güvence tavanı aşabilir; oyuncu başına çoğunlukla tek ek değerlendirmedir.
      for (const n of aday) {
        islenen.add(n.i);
        const mekan = npcMekani(k, n, ay, mekanAgirlik);
        const karar = npcKarar(k, n, ay, mekan ? { ...temel, mekan } : temel, { zorla: true, haric: n.g });
        if (!karar) continue;
        uygula(ap, n, karar, ay);
        yeni.set(n.i, karar);
        kendi.push(n);
        break;
      }
    }
    for (const n of kendi.slice(0, OYUNCU_GUNDEM_EN_COK)) olaylar.push(gundemOlayi(n, kar, yeni.get(n.i)!));
  });

  // 4. Kasaba geneli örneklemi: birkaç NPC kendi ihtiyacına (ve kasaba olayına) karar verir; olay yazılmaz, sayılır.
  const ornek = bos ? KASABA_ORNEK_BOS : KASABA_ORNEK;
  let ayrintili = islenen.size;
  for (let i = 0; i < ornek && k.npc.length; i++) {
    const n = k.npc[dizinSec(k.npc.length, r)]!;
    if (islenen.has(n.i) || !degisebilir(n, ay, tetikVar)) continue;
    islenen.add(n.i);
    ayrintili++;
    const karar = npcKarar(k, n, ay, temel, { haric: n.g });
    if (karar) uygula(ap, n, karar, ay);
  }
  return { olaylar, ayrintili };
}

export function katmanliGundem(k: Kasaba, ay: number, buAy: readonly OlayTaslagi[]): OlayTaslagi[] {
  return gundemKatmanlari(k, ay, buAy).olaylar;
}
