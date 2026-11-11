// Lonca siparişi (ana tasarım §5.5, dikey dilim E2): kıtlık kazanç demektir. Ay dönümünde, oyuncusu az ya da
// hiç olmayan ve kasabada NPC müşterisi bulunan meslek için bir NPC sipariş açar ("Kasabaya 3 nal lazım").
// Yalnız malın mesleği ana ya da yan mesleği olan teslim eder (dışarıdan alıp teslim etmek kapalı).
// Teslim tek seferliktir: ilk getiren alır (YerlesimDO istekleri sırayla işler), ödül + hizmet kazanır, herkese
// görünen teşekkür izi olayı düşer ve teslim edenle bağı olan NPC'lerin görüşü (aylık tavanla) biraz artar.
// Akçe kaynağı tanımlıdır: sipariş ödülü (kasaba öder), sipariş başına bir kez. Deterministik tohum.

import { MESLEKLER } from "../icerik/kisilik.ts";
import { MALLAR, type MalId } from "../icerik/mallar.ts";
import { MESLEKLER_ONLINE, NPC_MESLEK_ESLEME, type MeslekId } from "../icerik/meslekler.ts";
import type { Dil } from "../icerik/adlar.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { AYLIK_GORUS_TAVANI, iliskiAl } from "./eylem.ts";
import { GONUL_SIPARIS, halDegistir } from "./hal.ts";
import { loncaTablosu, NPC_YETISKIN, oyuncuSayaci, type LoncaDurumu } from "./lonca.ts";
import { hizmetEkle } from "./meslek.ts";
import { envanterEkle, malMeslegindeMi, satisDegeri } from "./npc-taban.ts";
import { npcAdi, npcKimlik, npcRef, oyuncuRef, yas } from "./ortak.ts";
import { agirlikliSec, aralik, dizinSec, tohumlu } from "./rastgele.ts";
import type { Dokum, IliskiHaritasi, Karakter, Kasaba, Npc, OlayTaslagi } from "./tipler.ts";

export interface Siparis {
  /** "s<ay>_<sıra>". */
  id: string;
  mal: MalId;
  adet: number;
  /** Ödül (akçe) ve hizmet puanı (malın mesleğinde). */
  odul: number;
  hizmet: number;
  /** İsteyen NPC (ölmüşse görünümde null). */
  npc: number;
  acilis: number;
  /** Bu ay ve sonrasında kapalıdır (açılış + SIPARIS_SURE). */
  son: number;
  durum: "acik" | "teslim" | "dustu";
  /** Teslim eden oyuncu (yerel kimlik), adı ve ayı. */
  alan?: string;
  alanAd?: string;
  teslimAy?: number;
  /** Ödül dökümü (açılışta yazılır; eski kayıtta yok → tek "odul" kalemi). */
  dk?: Dokum["kalemler"];
}

/** [PARAMETRE] Aynı anda en çok açık sipariş, süre (ay), dönüm başına en çok yeni sipariş. */
export const SIPARIS_EN_COK = 3;
export const SIPARIS_SURE = 4;
export const SIPARIS_AYLIK_YENI = 1;
/** [PARAMETRE] Ödül = adet × satış değeri × çarpan (yukarı yuvarlanır); hizmet puanı. */
export const SIPARIS_ODUL_CARPANI = 1.5;
export const SIPARIS_HIZMET = 3;
/** [PARAMETRE] Kapanan siparişler bu kadar ay listede kalır (teşekkür izi görünsün). */
export const SIPARIS_TUTMA_AY = 6;
/** [PARAMETRE] Lonca durumuna göre seçilme ağırlığı (denge 9 Kasım: dolu meslek de sipariş alır, daha seyrek). */
export const SIPARIS_AGIRLIK: Record<LoncaDurumu, number> = { bos: 3, az: 2, dolu: 1 };
/** [PARAMETRE] Görüş: isteyen NPC'ye, teslim edenle bağı olan NPC'lere; etkilenen bağlı NPC sayısı sınırı. */
export const SIPARIS_ISTEYEN_GORUS = 6;
export const SIPARIS_GORUS = 2;
export const SIPARIS_GORUS_NPC_EN_COK = 12;
/** [PARAMETRE] Dikey dilimde sipariş verilen mallar ve adet aralığı (yalnız üreticisi olan zincir malları;
 * odun yok: NPC'den alıp teslim etmek başa baş olurdu). */
export const SIPARIS_MALLARI: Partial<Record<MeslekId, readonly { mal: MalId; alt: number; ust: number }[]>> = {
  demirci: [
    { mal: "nal", alt: 2, ust: 4 },
    { mal: "alet", alt: 1, ust: 1 },
  ],
  oduncu: [
    { mal: "kereste", alt: 2, ust: 4 },
    { mal: "komur", alt: 2, ust: 4 },
  ],
  ciftci: [
    { mal: "tahil", alt: 3, ust: 6 },
    { mal: "yun", alt: 2, ust: 4 },
  ],
};

function olay(k: string, n: number, p: OlayTaslagi["p"], w: string, h = ""): OlayTaslagi {
  return { t: "siparis", w, h, g: "", n, k, p };
}

function npcOnlineMeslegi(n: Npc): MeslekId | null {
  return NPC_MESLEK_ESLEME[MESLEKLER[n.m] ?? ""] ?? null;
}

/** Ay dönümü: süresi dolanlar düşer, eskiler temizlenir, kıt meslekler için yeni sipariş açılır. */
export function siparisDonumu(kasaba: Kasaba, ay: number, p?: CalismaParametreleri): OlayTaslagi[] {
  const olaylar: OlayTaslagi[] = [];
  const sp = (kasaba.sp ??= []);
  for (const s of sp) {
    if (s.durum !== "acik" || ay < s.son) continue;
    s.durum = "dustu";
    const n = kasaba.dizin.get(s.npc);
    olaylar.push(olay("olay.siparis.dustu", 2, { ...(n ? { isteyen: npcRef(n) } : {}), mal: s.mal, adet: s.adet }, n ? npcKimlik(n.i) : ""));
  }
  kasaba.sp = sp.filter((s) => s.durum === "acik" || ay - (s.teslimAy ?? s.son) < SIPARIS_TUTMA_AY);

  const r = tohumlu("siparis", kasaba.y, ay);
  const lonca = new Map(loncaTablosu(kasaba).map((x) => [x.meslek, x]));
  const oyuncu = oyuncuSayaci(kasaba);
  const yetiskin = kasaba.npc.filter((n) => yas(n.d, ay) >= NPC_YETISKIN);
  for (let yeni = 0; yeni < SIPARIS_AYLIK_YENI; yeni++) {
    const acik = kasaba.sp.filter((s) => s.durum === "acik");
    if (acik.length >= SIPARIS_EN_COK) break;
    const adaylar: { meslek: MeslekId; mal: MalId; alt: number; ust: number; musteri: Npc[] }[] = [];
    for (const [meslek, mallar] of Object.entries(SIPARIS_MALLARI) as [MeslekId, readonly { mal: MalId; alt: number; ust: number }[]][]) {
      const durum = lonca.get(meslek)?.durum ?? "dolu";
      if (SIPARIS_AGIRLIK[durum] <= 0) continue;
      const musteriMeslek = MESLEKLER_ONLINE[meslek].musteri;
      const musteri = yetiskin.filter((n) => {
        const m = npcOnlineMeslegi(n);
        return m !== null && musteriMeslek.includes(m);
      });
      if (musteri.length === 0) continue;
      for (const x of mallar) if (!acik.some((s) => s.mal === x.mal)) adaylar.push({ meslek, ...x, musteri });
    }
    const secim = agirlikliSec(
      adaylar.map((a) => SIPARIS_AGIRLIK[lonca.get(a.meslek)!.durum]),
      r,
    );
    const a = adaylar[secim];
    if (!a) break;
    const isteyen = a.musteri[dizinSec(a.musteri.length, r)]!;
    const adet = aralik(r, a.alt, a.ust);
    const birim = satisDegeri(a.mal, oyuncu(a.meslek), p);
    const odulCarpani = p?.SIPARIS_ODUL_CARPANI ?? SIPARIS_ODUL_CARPANI;
    const odul = Math.ceil(adet * birim.toplam * odulCarpani);
    const dk = birim.kalemler.map((x) => ({ k: x.k, d: x.d * adet }));
    dk.push({ k: "siparis_carpani", d: odul - adet * birim.toplam });
    const s: Siparis = {
      id: `s${ay}_${yeni}`,
      mal: a.mal,
      adet,
      odul,
      hizmet: SIPARIS_HIZMET,
      npc: isteyen.i,
      acilis: ay,
      son: ay + SIPARIS_SURE,
      durum: "acik",
      dk,
    };
    kasaba.sp.push(s);
    olaylar.push(olay("olay.siparis.acildi", 3, { isteyen: npcRef(isteyen), mal: a.mal, adet, odul }, npcKimlik(isteyen.i)));
  }
  return olaylar;
}

/** Görüş artışı (eylem.ts deseni: üçte biri kalıcı taban, kalanı sönen anı; NPC başına aylık tavan). */
function gorusKat(ili: IliskiHaritasi, npc: number, miktar: number, ay: number): number {
  const i = iliskiAl(ili, npc);
  if (i.ka !== ay) {
    i.ka = ay;
    i.kg = 0;
  }
  const kazanc = Math.min(miktar, Math.max(0, AYLIK_GORUS_TAVANI - i.kg));
  if (kazanc <= 0) return 0;
  const taban = Math.floor(kazanc / 3);
  i.t += taban;
  if (kazanc - taban > 0) i.an.push(["siparis", kazanc - taban, ay]);
  i.kg += kazanc;
  return kazanc;
}

export interface TeslimSonucu {
  siparis: string;
  mal: MalId;
  adet: number;
  odul: number;
  odulDokum: Dokum;
  hizmet: number;
  gonul: number;
  /** Görüşü artan NPC'ler: kimlik → artış. */
  gorus: Record<string, number>;
}

export function siparisTeslim(
  kasaba: Kasaba,
  kar: Karakter,
  ili: IliskiHaritasi,
  idHam: unknown,
  ay: number,
): Sonuc<{ sonuc: TeslimSonucu; olay: OlayTaslagi }> {
  const s = typeof idHam === "string" ? kasaba.sp?.find((x) => x.id === idHam) : undefined;
  if (!s) return hata("siparis_yok");
  if (s.durum !== "acik" || ay >= s.son) return hata("siparis_kapandi");
  if (!malMeslegindeMi(kar, s.mal)) return hata("meslek_yok");
  if ((kar.ev?.[s.mal] ?? 0) < s.adet) return hata("mal_yok");
  envanterEkle(kar, s.mal, -s.adet);
  kar.pa += s.odul;
  s.durum = "teslim";
  s.alan = kar.o;
  s.alanAd = kar.ad;
  s.teslimAy = ay;
  const hizmet = hizmetEkle(kar, MALLAR[s.mal].meslek, s.hizmet);
  const gonul = halDegistir(kar, ay, { gonul: GONUL_SIPARIS }, "hal.neden.siparis").gonul ?? 0;
  const gorus: Record<string, number> = {};
  const isteyen = kasaba.dizin.get(s.npc);
  if (isteyen) {
    const d = gorusKat(ili, isteyen.i, SIPARIS_ISTEYEN_GORUS, ay);
    if (d) gorus[npcKimlik(isteyen.i)] = d;
  }
  const bagli = Object.keys(ili)
    .filter((a) => a !== "0" && Number(a) !== s.npc && kasaba.dizin.has(Number(a)))
    .map(Number)
    .sort((a, b) => a - b)
    .slice(0, SIPARIS_GORUS_NPC_EN_COK);
  for (const n of bagli) {
    const d = gorusKat(ili, n, SIPARIS_GORUS, ay);
    if (d) gorus[npcKimlik(n)] = d;
  }
  const p: OlayTaslagi["p"] = { kim: oyuncuRef(kar), mal: s.mal, adet: s.adet };
  if (isteyen) p.isteyen = npcRef(isteyen);
  return basarili({
    sonuc: { siparis: s.id, mal: s.mal, adet: s.adet, odul: s.odul, odulDokum: odulDokumu(s), hizmet, gonul, gorus },
    olay: olay("olay.siparis.teslim", 5, p, kar.o, isteyen ? npcKimlik(isteyen.i) : ""),
  });
}

/** Ödül dökümü: taban, kıtlık ve sipariş çarpanı payı (toplam = ödül). */
export function odulDokumu(s: Siparis): Dokum {
  return { toplam: s.odul, kalemler: s.dk ?? [{ k: "odul", d: s.odul }] };
}

/** Liste görünümü (en yeni önce): açık siparişler ve son kapananlar; teşekkür izi teslim edenin adıyla. */
export function siparisGorunumu(kasaba: Kasaba, kar: Karakter, ay: number, dil: Dil) {
  return [...(kasaba.sp ?? [])].reverse().map((s) => {
    const n = kasaba.dizin.get(s.npc);
    const elde = kar.ev?.[s.mal] ?? 0;
    const acik = s.durum === "acik" && ay < s.son;
    const meslekUygun = malMeslegindeMi(kar, s.mal);
    return {
      id: s.id,
      mal: s.mal,
      adet: s.adet,
      odul: s.odul,
      odulDokum: odulDokumu(s),
      hizmet: s.hizmet,
      meslek: MALLAR[s.mal].meslek,
      meslekUygun,
      acilis: s.acilis,
      son: s.son,
      kalanAy: Math.max(0, s.son - ay),
      durum: s.durum,
      isteyen: n ? { id: npcKimlik(n.i), ad: npcAdi(n, dil) } : null,
      alan: s.alan ? { id: s.alan, ad: s.alanAd ?? "" } : null,
      teslimAy: s.teslimAy ?? null,
      elde,
      teslimEdebilir: acik && meslekUygun && elde >= s.adet,
    };
  });
}
