// Yerleşim motoru: kasabayı depodan yükler (ilk açılışta tohumdan üretir), kaçan ay dönümlerini sırayla
// yetiştirir, uç işlemlerini yürütür ve yalnız değişen anahtarları yazar. Workers'a bağlı değildir (Depo alır);
// YerlesimDO yalnız bunu çağıran ince sarmalayıcıdır.
//
// Depo anahtarları (kısa): m meta · n0..nK NPC parçaları (100'er) · s sakin dizini · o:<id> karakter ·
// g:<id> ilişki haritası · e:<sayfa> olay defteri sayfaları (64'er; son 48 sayfa tutulur) · sp lonca siparişleri
// (eski kayıtta yok → boş liste) · kronik:<sayfa> yerleşim kroniği (64'er; budanmaz, Faz 7).

import { DEPO_TOPLU_SINIR, type Depo } from "../depo.ts";
import { yerlesimBul } from "../dunya-veri.ts";
import type { Dil } from "../icerik/adlar.ts";
import { HAYALLER, HUYLAR, TUHAFLIKLAR } from "../icerik/kisilik.ts";
import { istekNoCoz } from "../mantik.ts";
import { oyunAyi, sonrakiDonum, takvim } from "../saat.ts";
import { basarili, hata, type SakinKaydi, type Sonuc } from "../tipler.ts";
import { harita, npcMekani } from "./cizelge.ts";
import { arkaPlanGorunumu, type ArkaPlan } from "./arka-plan.ts";
import { ayDonumu } from "./donum.ts";
import { donusKartiSec, gorebilir } from "./donus.ts";
import {
  EYLEMLER,
  NPC_EYLEMLERI,
  eylemGirdisiCoz,
  eylemKapisi,
  eylemSansi,
  eylemYap,
  getiriCarpani,
  tekrarSayisi,
} from "./eylem.ts";
import { akrabalik, gorus, gorusDegeri, npcNpcBakisi } from "./gorus.ts";
import {
  BECERILER,
  NAMLAR,
  OZELLIKLER,
  TAKAT_TAVAN,
  adlandir,
  karakterOlustur,
  karakterYasi,
  ocakSec,
  takatTazele,
} from "./karakter.ts";
import { acikMi, ogrenmeDurumu, ogrenmeIlerle, sayacArtir } from "./ogrenme.ts";
import { dilCoz, kisiAdi, kisiCoz, meslekGorunumu, npcAdi, npcKimlik, oyuncuRef, paramYaz, yas } from "./ortak.ts";
import { loncaTablosu, oyuncuSayaci } from "./lonca.ts";
import { KADEME_HIZMET, beceriGorunumu, kademeAtla, meslekKaydi, meslekSec, yanSec } from "./meslek.ts";
import { agacGorunumu, beceriHizlandir, beceriIptal, beceriOgren, beceriOzeti, beceriYeniden, mesleki, ogrenmeTamamla } from "./beceri.ts";
import { acikEtkiler, basariSay } from "./beceri-etki.ts";
import { aylikTakat, halGorunumu } from "./hal.ts";
import { barinmaDonumu, barinmaGorunumu, otomatikAyarla, tesisKonakla } from "./barinma.ts";
import { donusHazirla, donusOku } from "./donus-ekrani.ts";
import { NPC_AYLIK_KOTA, envanterEkle, npcdenAl, npcdenAlinan, stokGorunumu, type KasabaStogu } from "./npc-taban.ts";
import { kalanSatisKotasi, NPC_SATIS_KOTASI, npcyeSat } from "./pazar.ts";
import { siparisDonumu, siparisGorunumu, siparisTeslim, type Siparis } from "./siparis.ts";
import { tarifListesi, tarifYap } from "./tarif.ts";
import { tohumlu } from "./rastgele.ts";
import { TANIDIK_EN_COK, dostlukIslem, husumetIslem, oyuncuProfili, bagGorunumu, acikHusumet } from "./iliski.ts";
import { duzenGorunumu, duzenGuncelle } from "./duzen.ts";
import { engelKaldir, engelle, engelListesi, engelliMi } from "./engel.ts";
import { mekanTaniklari, soylentiEkle, soylentiGorunumu, yalanla } from "./soylenti.ts";
import {
  ciraklikUstasi,
  TEKLIF_YASI,
  GORUCU_YASI,
  ortakPayi,
  ortaklar,
  taraflarArasiIptal,
  teklifBul,
  teklifCevap,
  teklifGorunumu,
  teklifOlustur,
  teklifTaraflari,
  toplumKimligiTasi,
  vitrinGorunumu,
  vitrinSec,
} from "./teklif.ts";
import { teveccuhEkle, teveccuhGorunumu, teveccuhKademesi, teveccuhEtkisi, TEVECCUH_ETKI } from "./teveccuh.ts";
import { IKRAM_MENUSU, type IkramId } from "../han/ikram.ts";
import { toplumDonumu } from "./toplum-donum.ts";
import { oyuncuArabuluculukAc, oyuncuArabuluculukCevap, oyuncuArabuluculukGeriAl, oyuncuArabuluculukTaslak, oyuncuArabuluculukImzala, oyuncuArabuluculukUygula } from "./arabuluculuk-oyuncu.ts";
import { OYUNCU_TEKLIF_TURLERI, oyuncuArabuluculukAl, toplumAl, type OyuncuArabuluculuk, type Toplum } from "./toplum.ts";
import { MALLAR, MAL_IDLERI, malBul } from "../icerik/mallar.ts";
import { temelIsOnizleme, temelIsYap } from "./temel-is.ts";
import { devirHesapla, devirUygula, kimlikTasiyiciEkle, planKarmasi } from "./devir.ts";
import { npcEvlilikTeklifi } from "./evlilik.ts";
import { hanedanKasabasi, hanedanKaydi, olduMu, oyuncuNoAl, type HanedanKasabasi } from "./hanedan.ts";
import { hanedanGorunumu, hanedanOzeti } from "./hanedan-gorunum.ts";
import { KRONIK_SAYFA, KRONIK_YANIT_EN_COK, kronikYaz, type KronikSatiri } from "./kronik.ts";
import { vasiyetDogrula } from "./vasiyet.ts";
import { GUNDEM_ADI, type CalismaParametreleri, type Isaret, type IliskiHaritasi, type Karakter, type Kasaba, type Npc, type Olay, type OlayParam, type OlayTaslagi, type Sakin } from "./tipler.ts";
import { kasabaKur } from "./uret.ts";
import { defterGorunumu, defterYaz } from "./defter.ts";
import { ekonomiDonumu } from "./ekonomi-donum.ts";
import { hizmetNpcTalebiAc } from "./hizmet-pazari.ts";
import { ismarlamaSicili } from "./ismarlama.ts";
import { kaliteGorunumu } from "./kalite.ts";
import { levhaYaz } from "./levha.ts";
import type { EkonomiKaydi } from "./pazar-tahta.ts";
import type { UcgenDefteri } from "./bilgi.ts";
import { eksenler } from "./hafiza.ts";
import { mulkluIkram, mulkluKira } from "../mulk/tapu.ts";
import type { MulkDefteri } from "../mulk/tapu.ts";
import { toplulukDonumu } from "./topluluk.ts";
import type { ToplulukKaydi } from "./topluluk-kayit.ts";
import { ucgenDonumu, ucgenGorunumu, ucgenIslem, ucgenOkumaYuklenecek, ucgenYuklenecek } from "./ucgen.ts";

// Faz 3 kayıtları (borç, teklif, engel, husumet) devirde vârise bağlanır.
kimlikTasiyiciEkle(toplumKimligiTasi);

const META = "m";
const NPC = "n";
const SAKIN = "s";
const KAR = "o:";
const ILI = "g:";
const SAYFA = "e:";
const SIPARIS = "sp";
const TOPLUM = "tp";
/** Oyuncu pazarı, ısmarlama ve Ustalar Levhası (Faz 6). */
const EKONOMI = "ek";
/** Topluluk: hami, ortak dert, şenlik, zaviye, bölge göstergeleri (E6–E7). */
const TOPLULUK = "tl";
const UCGEN = "ug";
const MULK = "mk";
/** [PARAMETRE] Gelen kutusunda gösterilen son kapanan teklif sayısı; söylenti yalanlamanın takat bedeli. */
export const GELEN_KAPALI_EN_COK = 20;
export const YALANLAMA_TAKAT = 1;
const KRONIK = "kronik:";

export const NPC_PARCA = 100;
export const OLAY_SAYFA = 64;
export const TUTULAN_SAYFA = 48;
/** [PARAMETRE] Bir çağrıda en çok yetiştirilecek ay; kalanı bir sonraki alarmda sürer. */
export const AZAMI_YETISTIRME = 12;
/** Olay okumasında sayfa ve yanıt sınırları. */
const OKUMA_SAYFA_EN_COK = 8;
export const OLAY_YANIT_EN_COK = 50;
/** Dönüş Kartı adayları en çok bu kadar geriye bakar. */
const KART_TARAMA = OKUMA_SAYFA_EN_COK * OLAY_SAYFA;
/** Bu süreden uzun ara yeni bir giriştir; kısa aradaki yenilemelerde kart korunur. */
export const OTURUM_ARASI_MS = 30 * 60 * 1000;
const IST_EN_COK = 10;
export { TANIDIK_EN_COK };
/** §13.9: NPC'nin üçüncü kişilere bakışını görmek için ona yakınlık eşiği. */
export const YAKINLIK_ESIGI = 30;
const ISARETLER: readonly string[] = ["tanidik", "dost", "dusman"];

interface Meta {
  v: 1;
  y: string;
  /** Son işlenen ay. */
  sa: number;
  /** Son olay sırası. */
  sq: number;
  ni: number;
  ne: number;
  /** NPC parça sayısı. */
  np: number;
  /** Tutulan ilk olay sayfası. */
  ep: number;
  /** Sonraki oyuncu numarası. */
  no: number;
  /** Hanedan defteri ve kronik satır sayısı (Faz 7; eski kayıtta yok). */
  hd?: HanedanKasabasi;
  kr?: number;
  /** Kasaba stoğu (denge 9 Kasım; eski kayıtta yok). */
  st?: Partial<Record<string, number>>;
  /** Arka plan: kasaba özeti, sayaçlar, tetikler (Faz 5; eski kayıtta yok). */
  ap?: ArkaPlan;
}

export interface OlayGorunumu {
  sira: number;
  ay: number;
  tur: string;
  kim: string | null;
  hedef: string | null;
  gorunurluk: "herkes" | "ozel";
  onem: number;
  ozet: { k: string; p: Record<string, unknown> };
}

export function olayYaz(o: Olay, dil: Dil): OlayGorunumu {
  return {
    sira: o.s,
    ay: o.a,
    tur: o.t,
    kim: o.w || null,
    hedef: o.h || null,
    gorunurluk: o.g ? "ozel" : "herkes",
    onem: o.n,
    ozet: { k: o.k, p: paramYaz(o.p, dil) },
  };
}

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function kardesMi(a: Npc, b: Npc): boolean {
  return (a.an !== 0 && a.an === b.an) || (a.ba !== 0 && a.ba === b.ba);
}

/** #tekrarGuvenli'nin işleyiciye verdiği ekler: ilişki haritası, eklenecek olay, sipariş listesi değişti mi. */
export interface TekrarEki {
  ili: IliskiHaritasi;
  olay: OlayTaslagi | undefined;
  siparis: boolean;
  /** Yanıta girmeyen ek olaylar (karşı tarafa özel bildirimler, meydan ilanları). */
  olaylar: OlayTaslagi[];
  /** Değişen öteki oyuncular (yerel kimlik) ve toplum kaydı. */
  digerleri: string[];
  toplum: boolean;
  /** Faz 6: ekonomi kaydı değişti; deftere açık kalemler [oyuncu, kalem, tutar] (kalanı varsayılan kaleme yazılır). */
  ekonomi?: boolean;
  defter?: [o: string, kalem: string, tutar: number][];
  /** E6–E7: topluluk kaydı değişti. */
  topluluk?: boolean;
}

export class YerlesimMotoru {
  readonly kasaba: Kasaba;
  readonly #depo: Depo;
  readonly #meta: Meta;
  readonly #sayfalar = new Map<number, Olay[]>();
  readonly #kronikler = new Map<number, KronikSatiri[]>();
  readonly #kirli = new Set<string>();
  readonly #silinecek = new Set<string>();
  /** Son isteğin gerçek zamanı (ms; `yetistir` yazar): beceri öğrenme süreleri buna göre işler. */
  #simdi = 0;

  private constructor(depo: Depo, meta: Meta, kasaba: Kasaba) {
    this.#depo = depo;
    this.#meta = meta;
    this.kasaba = kasaba;
  }

  /** Son olay sırası (imleç başı). */
  get imlec(): number {
    return this.#meta.sq;
  }

  /** Y2: yönetim panelinden gelen izinli parametreler yalnız bellek görünümüne yazılır, kasaba kaydına girmez. */
  parametreleriGuncelle(parametreler: CalismaParametreleri): void {
    this.kasaba.pr = { ...parametreler };
  }

  /**
   * Kasabayı açar. Hiç kurulmamışsa ve `yerlesimId` geçerliyse bu ayın nüfusunu tohumdan üretip yazar.
   * Kimlik verilmişse kayıtlı olanla uyuşmalıdır.
   */
  static async ac(depo: Depo, yerlesimId: string | undefined, simdi: number): Promise<YerlesimMotoru | undefined> {
    const meta = await depo.al<Meta>(META);
    if (!meta) {
      const y = yerlesimId === undefined ? undefined : yerlesimBul(yerlesimId);
      if (!y) return undefined;
      const kasaba = kasabaKur(y, oyunAyi(simdi));
      kasaba.no = 1;
      const m: Meta = { v: 1, y: y.id, sa: kasaba.ay, sq: 0, ni: kasaba.ni, ne: kasaba.ne, np: 0, ep: 0, no: 1 };
      const motor = new YerlesimMotoru(depo, m, kasaba);
      motor.#kirli.add(NPC).add(SAKIN);
      await motor.kaydet();
      return motor;
    }
    if (yerlesimId !== undefined && meta.y !== yerlesimId) return undefined;
    const y = yerlesimBul(meta.y);
    if (!y) return undefined;
    const anahtarlar = Array.from({ length: meta.np }, (_, i) => NPC + i);
    const parcalar = await depo.alCok<Npc[]>(anahtarlar);
    const npc = anahtarlar.flatMap((a) => parcalar.get(a) ?? []);
    const sakin = (await depo.al<Sakin[]>(SAKIN)) ?? [];
    const sp = (await depo.al<Siparis[]>(SIPARIS)) ?? [];
    const tp = await depo.al<Toplum>(TOPLUM);
    const ek = await depo.al<EkonomiKaydi>(EKONOMI);
    const ug = await depo.al<UcgenDefteri>(UCGEN);
    const mk = await depo.al<MulkDefteri>(MULK);
    const tl = await depo.al<ToplulukKaydi>(TOPLULUK);
    const kasaba: Kasaba = {
      y: meta.y,
      tur: y.tur,
      hedef: y.npc,
      ay: meta.sa,
      npc,
      dizin: new Map(npc.map((n) => [n.i, n])),
      ni: meta.ni,
      ne: meta.ne,
      sakin,
      kar: new Map(),
      ili: new Map(),
      sp,
      ...(tp ? { tp } : {}),
      ...(ek ? { ek } : {}),
      ...(ug ? { ug } : {}),
      ...(mk ? { mk } : {}),
      ...(tl ? { tl } : {}),
      no: meta.no,
      ...(meta.hd ? { hd: meta.hd } : {}),
      ...(meta.st ? { st: meta.st } : {}),
      ...(meta.ap ? { ap: meta.ap } : {}),
    };
    return new YerlesimMotoru(depo, meta, kasaba);
  }

  /** Değişen anahtarları yazar (128'lik parçalar; aralarında bekleme yok, DO hepsini birlikte işler). */
  async kaydet(): Promise<void> {
    const m = this.#meta;
    const k = this.kasaba;
    m.sa = k.ay;
    m.ni = k.ni;
    m.ne = k.ne;
    m.no = k.no ?? m.no;
    if (k.hd) m.hd = k.hd;
    if (k.st) m.st = k.st;
    if (k.ap) m.ap = k.ap;
    await this.#kronikBosalt();
    const kayit: Record<string, unknown> = {};
    for (const a of this.#kirli) {
      if (a === NPC) {
        const np = Math.ceil(k.npc.length / NPC_PARCA);
        for (let i = 0; i < np; i++) kayit[NPC + i] = k.npc.slice(i * NPC_PARCA, (i + 1) * NPC_PARCA);
        for (let i = np; i < m.np; i++) this.#silinecek.add(NPC + i);
        m.np = np;
      } else if (a === SAKIN) kayit[a] = k.sakin;
      else if (a === SIPARIS) kayit[a] = k.sp ?? [];
      else if (a === TOPLUM) kayit[a] = k.tp;
      else if (a === EKONOMI) kayit[a] = k.ek;
      else if (a === UCGEN) kayit[a] = k.ug;
      else if (a === MULK) kayit[a] = k.mk;
      else if (a === TOPLULUK) kayit[a] = k.tl;
      else if (a.startsWith(KAR)) kayit[a] = k.kar.get(a.slice(KAR.length));
      else if (a.startsWith(ILI)) kayit[a] = k.ili.get(a.slice(ILI.length));
      else if (a.startsWith(SAYFA)) kayit[a] = this.#sayfalar.get(Number(a.slice(SAYFA.length)));
      else if (a.startsWith(KRONIK)) kayit[a] = this.#kronikler.get(Number(a.slice(KRONIK.length)));
    }
    kayit[META] = m;
    const girdiler = Object.entries(kayit).filter(([, v]) => v !== undefined);
    const silinecek = [...this.#silinecek];
    this.#kirli.clear();
    this.#silinecek.clear();
    const isler: Promise<void>[] = [];
    for (let i = 0; i < girdiler.length; i += DEPO_TOPLU_SINIR) {
      isler.push(this.#depo.koy(Object.fromEntries(girdiler.slice(i, i + DEPO_TOPLU_SINIR))));
    }
    for (let i = 0; i < silinecek.length; i += DEPO_TOPLU_SINIR) isler.push(this.#depo.sil(silinecek.slice(i, i + DEPO_TOPLU_SINIR)));
    await Promise.all(isler);
  }

  async #yukle(kimlikler: string[]): Promise<void> {
    const k = this.kasaba;
    const eksik = kimlikler.filter((o) => !k.kar.has(o));
    const anahtarlar = eksik.flatMap((o) => [KAR + o, ILI + o]);
    for (let i = 0; i < anahtarlar.length; i += DEPO_TOPLU_SINIR) {
      const parca = anahtarlar.slice(i, i + DEPO_TOPLU_SINIR);
      const veri = await this.#depo.alCok<unknown>(parca);
      for (const a of parca) {
        if (!a.startsWith(KAR)) continue;
        const o = a.slice(KAR.length);
        const kar = veri.get(a) as Karakter | undefined;
        if (!kar) continue;
        k.kar.set(o, kar);
        k.ili.set(o, (veri.get(ILI + o) as IliskiHaritasi | undefined) ?? {});
      }
    }
  }

  async #sayfa(p: number): Promise<Olay[]> {
    let s = this.#sayfalar.get(p);
    if (!s) {
      s = (await this.#depo.al<Olay[]>(SAYFA + p)) ?? [];
      this.#sayfalar.set(p, s);
    }
    return s;
  }

  async #olayEkle(t: OlayTaslagi, ay: number): Promise<Olay> {
    const m = this.#meta;
    const s = ++m.sq;
    const p = Math.floor((s - 1) / OLAY_SAYFA);
    const o: Olay = { s, a: ay, ...t };
    (await this.#sayfa(p)).push(o);
    this.#kirli.add(SAYFA + p);
    if (p - m.ep >= TUTULAN_SAYFA) {
      const ilk = p - TUTULAN_SAYFA + 1;
      for (let q = m.ep; q < ilk; q++) {
        this.#silinecek.add(SAYFA + q);
        this.#kirli.delete(SAYFA + q);
        this.#sayfalar.delete(q);
      }
      m.ep = ilk;
    }
    return o;
  }

  /** `sonra`dan sonraki olaylar (süzgeçten geçenler); `son` taranan son sıradır (görünmeyenler dahil). */
  async #oku(sonra: number, enCok: number, suzgec: (o: Olay) => boolean): Promise<{ olaylar: Olay[]; son: number }> {
    const m = this.#meta;
    let s = Math.max(sonra + 1, m.ep * OLAY_SAYFA + 1);
    let son = Math.max(sonra, s - 1);
    const olaylar: Olay[] = [];
    for (let taranan = 0; s <= m.sq && olaylar.length < enCok && taranan < OKUMA_SAYFA_EN_COK; taranan++) {
      const p = Math.floor((s - 1) / OLAY_SAYFA);
      for (const o of await this.#sayfa(p)) {
        if (o.s < s) continue;
        son = o.s;
        if (suzgec(o)) {
          olaylar.push(o);
          if (olaylar.length >= enCok) break;
        }
      }
      s = (p + 1) * OLAY_SAYFA + 1;
    }
    return { olaylar, son: Math.min(son, m.sq) };
  }

  async #siradan(siralar: number[]): Promise<Olay[]> {
    const sonuc: Olay[] = [];
    for (const s of siralar) {
      const p = Math.floor((s - 1) / OLAY_SAYFA);
      if (p < this.#meta.ep) continue;
      const o = (await this.#sayfa(p)).find((x) => x.s === s);
      if (o) sonuc.push(o);
    }
    return sonuc;
  }

  /**
   * Kaçan ay dönümlerini sırayla işler (en çok `azami` ay). `kalan` > 0 ise çağıran kısa süre sonra
   * yeniden çağırmalıdır (alarm). Dönüm için bütün sakinlerin karakteri yüklenir.
   */
  async yetistir(simdi: number, azami = AZAMI_YETISTIRME): Promise<{ islenen: number; kalan: number }> {
    const k = this.kasaba;
    this.#simdi = Math.max(this.#simdi, simdi);
    const hedef = oyunAyi(simdi);
    if (k.ay >= hedef) return { islenen: 0, kalan: 0 };
    await this.#yukle(k.sakin.map((s) => s.o));
    let islenen = 0;
    while (k.ay < hedef && islenen < azami) {
      const ay = k.ay + 1;
      // Faz 6: süresi dolan ilan/ısmarlama iadeleri kendi defter kalemleriyle; kalan akçe farkı "donum" kalemine.
      for (const t of ekonomiDonumu(k, ay)) await this.#olayEkle(t, ay);
      const pa0 = new Map([...k.kar].map(([o, c]) => [o, c.pa]));
      const ayOlaylari = ayDonumu(k, ay);
      for (const t of ayOlaylari) await this.#olayEkle(t, ay);
      for (const t of hizmetNpcTalebiAc(k, ay, ayOlaylari)) await this.#olayEkle(t, ay);
      for (const t of siparisDonumu(k, ay, k.pr)) await this.#olayEkle(t, ay);
      for (const t of toplumDonumu(k, ay)) await this.#olayEkle(t, ay);
      for (const [o, c] of k.kar) defterYaz(c, ay, "donum", c.pa - (pa0.get(o) ?? c.pa));
      for (const t of barinmaDonumu(k, ay)) await this.#olayEkle(t, ay);
      for (const t of ucgenDonumu(k, ay)) await this.#olayEkle(t, ay);
      for (const t of toplulukDonumu(k, ay)) await this.#olayEkle(t, ay);
      islenen++;
    }
    this.#kirli.add(NPC).add(SIPARIS).add(SAKIN);
    if (k.tp) this.#kirli.add(TOPLUM);
    if (k.ek) this.#kirli.add(EKONOMI);
    if (k.ug) this.#kirli.add(UCGEN);
    if (k.tl) this.#kirli.add(TOPLULUK);
    for (const s of k.sakin) this.#kirli.add(KAR + s.o).add(ILI + s.o);
    // Ölüler de yazılır (devir arşivi); devirle gelen vâris yeni kimliktedir.
    for (const o of k.kar.keys()) this.#kirli.add(KAR + o).add(ILI + o);
    await this.kaydet();
    return { islenen, kalan: hedef - k.ay };
  }

  /** Yönetim Y2: kimliksiz, yerleşim toplamlarından oluşan ekonomi sağlığı özeti. */
  async ekonomiSagligi(): Promise<Sonuc<unknown>> {
    const k = this.kasaba;
    await this.#yukle(k.sakin.map((s) => s.o));
    const oyuncular = [...k.kar.values()];
    const bakiyeler = oyuncular.map((c) => c.pa).filter(Number.isFinite).sort((a, b) => a - b);
    const toplamAkce = bakiyeler.reduce((s, x) => s + x, 0);
    const ortalamaAkce = bakiyeler.length ? Math.round(toplamAkce / bakiyeler.length) : 0;
    const orta = Math.floor(bakiyeler.length / 2);
    const medyanAkce = bakiyeler.length === 0 ? 0 : bakiyeler.length % 2
      ? bakiyeler[orta]!
      : Math.round((bakiyeler[orta - 1]! + bakiyeler[orta]!) / 2);
    const akis = oyuncular.reduce((t, c) => {
      const d = defterGorunumu(c, k.ay, 12).toplam;
      t.gelir += d.gelir;
      t.gider += d.gider;
      return t;
    }, { gelir: 0, gider: 0 });
    const stokAdet = Object.values(k.st ?? {}).reduce<number>((s, n) => s + (n ?? 0), 0);
    return basarili({
      yerlesim: k.y,
      oyunAyi: k.ay,
      oyuncuSayisi: bakiyeler.length,
      npcSayisi: k.npc.length,
      toplamAkce,
      bakiyeler,
      ortalamaAkce,
      medyanAkce,
      enDusukAkce: bakiyeler[0] ?? 0,
      enYuksekAkce: bakiyeler.at(-1) ?? 0,
      son12Ay: { gelir: akis.gelir, gider: akis.gider, net: akis.gelir - akis.gider },
      kasabaStokAdet: stokAdet,
      acikSiparis: k.sp?.filter((s) => s.durum === "acik").length ?? 0,
    });
  }

  /** Y3: Kurucu telafisi. Yalnız hedef oyuncuya görünen olay ve karakter bazlı tekrar güvenliği. */
  async yonetimTelafi(hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
    if (!nesneMi(govde)) return hata("gecersiz_istek");
    return this.#tekrarGuvenli(hesapId, govde, (kar, _s, ay, ek) => {
      if (typeof govde.gerekce !== "string" || govde.gerekce.trim().length < 10 || govde.gerekce.trim().length > 240) return hata("gerekce_gecersiz");
      const gerekce = govde.gerekce.trim();
      let olayParam: Record<string, string | number>;
      let yanit: Record<string, unknown>;
      if (govde.tur === "akce") {
        if (typeof govde.tutar !== "number" || !Number.isInteger(govde.tutar) || govde.tutar < 1 || govde.tutar > 10000) return hata("deger_sinir_disi");
        kar.pa += govde.tutar;
        olayParam = { tutar: govde.tutar, gerekce };
        yanit = { tur: "akce", tutar: govde.tutar, gerekce };
      } else if (govde.tur === "esya") {
        const mal = malBul(govde.mal);
        if (!mal) return hata("mal_gecersiz");
        if (typeof govde.adet !== "number" || !Number.isInteger(govde.adet) || govde.adet < 1 || govde.adet > 50) return hata("deger_sinir_disi");
        envanterEkle(kar, mal, govde.adet);
        olayParam = { mal, adet: govde.adet, gerekce };
        yanit = { tur: "esya", mal, adet: govde.adet, gerekce };
      } else {
        return hata("deger_sinir_disi");
      }
      ek.olay = { t: "yonetimTelafi", w: "kurum", h: kar.o, g: kar.o, n: 5, k: govde.tur === "akce" ? "olay.yonetim.telafiAkce" : "olay.yonetim.telafiEsya", p: olayParam };
      return basarili(yanit);
    });
  }

  /** Sakin kaydı (tekrar güvenli): ocak seçilir, karakter kurulur, yerleşime "yeni gelen" olayı düşer. */
  async sakinEkle(kayit: SakinKaydi): Promise<Sonuc<{ id: string }>> {
    const k = this.kasaba;
    const mevcut = k.sakin.find((s) => s.h === kayit.hesapId);
    if (mevcut) return basarili({ id: mevcut.o });
    if (
      !nesneMi(kayit) ||
      typeof kayit.hesapId !== "string" ||
      typeof kayit.ad !== "string" ||
      (kayit.cinsiyet !== "erkek" && kayit.cinsiyet !== "kadın") ||
      !Number.isInteger(kayit.dogumAyi)
    ) {
      return hata("gecersiz_istek");
    }
    const o = oyuncuNoAl(k);
    const ocak = ocakSec(k, kayit.hesapId);
    const sakin: Sakin = { o, h: kayit.hesapId, ad: kayit.ad, k: kayit.cinsiyet === "kadın" ? 1 : 0, d: kayit.dogumAyi, e: ocak.e, mk: "", ma: -1e9 };
    const kar = karakterOlustur(sakin, ocak, k.ay);
    kar.im = Math.max(0, this.#meta.sq - OLAY_SAYFA);
    k.sakin.push(sakin);
    k.kar.set(o, kar);
    k.ili.set(o, {});
    this.#kirli.add(SAKIN).add(KAR + o).add(ILI + o);
    await this.#olayEkle({ t: "sakin", w: o, h: "", g: "", n: 3, k: "olay.yeniSakin", p: { kisi: oyuncuRef(sakin) } }, k.ay);
    await this.kaydet();
    return basarili({ id: o });
  }

  async #oyuncu(hesapId: string): Promise<Sonuc<{ s: Sakin; kar: Karakter; ili: IliskiHaritasi }>> {
    const s = this.kasaba.sakin.find((x) => x.h === hesapId);
    if (!s) return hata("sakin_yok");
    await this.#yukle([s.o]);
    const kar = this.kasaba.kar.get(s.o);
    const ili = this.kasaba.ili.get(s.o);
    if (!kar || !ili) return hata("sakin_yok");
    takatTazele(kar, this.kasaba.ay);
    return basarili({ s, kar, ili });
  }

  #tanidiklar(kar: Karakter, ili: IliskiHaritasi, dil: Dil) {
    const k = this.kasaba;
    const liste: { id: string; ad: string; isaret: Isaret; oyuncu?: true; gorus?: number }[] = [];
    for (const [id, isaret] of Object.entries(kar.tn)) {
      const ki = kisiCoz(id);
      if (ki?.tur === "npc") {
        const n = k.dizin.get(ki.i);
        if (!n) {
          delete kar.tn[id]; // ölen NPC listeden düşer
          continue;
        }
        liste.push({ id, ad: npcAdi(n, dil), isaret, gorus: gorusDegeri(k, n, kar, ili, k.ay) });
      } else {
        const ad = kisiAdi(k, id, dil);
        if (ad) liste.push({ id, ad, isaret, oyuncu: true });
      }
    }
    return liste.sort((a, b) => Math.abs(b.gorus ?? 0) - Math.abs(a.gorus ?? 0));
  }

  #ben(kar: Karakter, ili: IliskiHaritasi, dil: Dil) {
    const k = this.kasaba;
    const ay = k.ay;
    const usta = kar.us ? k.dizin.get(kar.us) : undefined;
    const npcAlimTavan = k.pr?.NPC_AYLIK_KOTA ?? NPC_AYLIK_KOTA;
    return {
      id: kar.o,
      ad: kar.ad,
      cinsiyet: kar.k ? "kadın" : "erkek",
      yas: karakterYasi(kar, ay),
      dogumAyi: kar.d,
      ozellikler: adlandir(OZELLIKLER, kar.oz),
      ozellikPuani: kar.op,
      beceriler: adlandir(BECERILER, kar.be),
      nam: adlandir(NAMLAR, kar.nm),
      takat: { kalan: kar.tk, tavan: TAKAT_TAVAN, aylik: aylikTakat(kar, ay) },
      para: kar.pa,
      hal: halGorunumu(kar, ay),
      envanter: kar.ev ?? {},
      envanterKalite: kaliteGorunumu(kar),
      ismarlamaSicili: ismarlamaSicili(kar),
      meslek: kar.ms ?? null,
      kademeHizmet: KADEME_HIZMET,
      beceri: beceriGorunumu(kar),
      beceriOzet: beceriOzeti(kar, this.#simdi),
      tarifler: tarifListesi(kar),
      temelIsler: temelIsOnizleme(kar, oyuncuSayaci(k), ay, k.pr),
      npcKota: {
        sat: kalanSatisKotasi(kar, ay, oyuncuSayaci(k)),
        satTavan: NPC_SATIS_KOTASI,
        al: Object.fromEntries(MAL_IDLERI.filter((m) => MALLAR[m].taban > 0).map((m) => [m, npcAlimTavan - npcdenAlinan(kar, m, ay)])),
        alTavan: npcAlimTavan,
      },
      stok: stokGorunumu(k.st as KasabaStogu | undefined, kar, k.pr),
      hane: k.npc
        .filter((n) => n.e === kar.e)
        .map((n) => ({ id: npcKimlik(n.i), ad: npcAdi(n, dil), rol: akrabalik(k, n, kar) ?? "hane" })),
      usta: usta ? { id: npcKimlik(usta.i), ad: npcAdi(usta, dil), meslek: meslekGorunumu(usta, ay) } : null,
      mekan: kar.ma === ay ? kar.mk : null,
      karar: kar.kr || null,
      kulYemini: kar.ky === 1,
      hanedan: hanedanOzeti(kar, ay),
      tanidiklar: this.#tanidiklar(kar, ili, dil),
      ogrenme: ogrenmeDurumu(kar, ay),
    };
  }

  /** GET /v1/yerlesim: saat, yerleşim, benim karakterim, harita, Dönüş Kartı, öneriler, imleç. */
  async durum(hesapId: string, simdi: number, dilHam: unknown): Promise<Sonuc<unknown>> {
    const dil = dilCoz(dilHam);
    const r = await this.#oyuncu(hesapId);
    if (!r.ok) return r;
    const { kar, ili } = r.deger;
    const k = this.kasaba;
    const ay = k.ay;
    // Barınma ve dönüş ekranı (Faz 14): son görülme güncellenmeden önce.
    const donus = donusHazirla(k, kar, simdi);
    const yeni = (await this.#oku(Math.max(kar.im, this.#meta.sq - KART_TARAMA), Number.POSITIVE_INFINITY, (o) => gorebilir(o, kar))).olaylar;
    const oturumSurer = simdi - kar.kz < OTURUM_ARASI_MS;
    let kart: Olay[];
    if (yeni.length > 0 || !oturumSurer) {
      const onceki = oturumSurer ? await this.#siradan(kar.kt) : [];
      kart = donusKartiSec([...onceki, ...yeni], kar);
      kar.kt = kart.map((o) => o.s);
    } else kart = await this.#siradan(kar.kt);
    kar.im = this.#meta.sq;
    kar.kz = simdi;

    const oneriler: { id: string; ad: string; gorus: number }[] = [];
    for (const a of Object.keys(ili)) {
      const n = a === "0" ? undefined : k.dizin.get(Number(a));
      if (!n || kar.tn[npcKimlik(n.i)]) continue;
      const g = gorusDegeri(k, n, kar, ili, ay);
      if (Math.abs(g) >= 15) oneriler.push({ id: npcKimlik(n.i), ad: npcAdi(n, dil), gorus: g });
    }
    oneriler.sort((a, b) => Math.abs(b.gorus) - Math.abs(a.gorus));

    const y = yerlesimBul(k.y);
    this.#simdi = Math.max(this.#simdi, simdi);
    await this.#beceriTamamla(kar);
    const ben = this.#ben(kar, ili, dil);
    this.#kirli.add(KAR + kar.o);
    await this.kaydet();
    return basarili({
      saat: { simdi, oyunAyi: ay, ...takvim(ay), sonrakiDonum: sonrakiDonum(simdi) },
      yerlesim: { id: k.y, ad: y?.ad ?? k.y, tur: k.tur, beylik: y?.beylik ?? "", npc: k.npc.length, oyuncu: k.sakin.length, nabiz: arkaPlanGorunumu(k.ap, ay) },
      ben,
      harita: harita(k, ay, dil),
      donusKarti: kart.map((o) => olayYaz(o, dil)),
      oneriler: oneriler.slice(0, 3),
      imlec: this.#meta.sq,
      barinma: donus.barinma,
      donusEkrani: donus.donusEkrani,
    });
  }

  /** GET /v1/olaylar?imlec=: imleçten sonraki görünür olaylar (sayfalı). */
  async olaylar(hesapId: string, imlecHam: unknown, dilHam: unknown): Promise<Sonuc<unknown>> {
    const dil = dilCoz(dilHam);
    let imlec = 0;
    if (imlecHam !== undefined && imlecHam !== null && imlecHam !== "") {
      if (typeof imlecHam !== "string" || !/^[0-9]{1,12}$/.test(imlecHam)) return hata("imlec_gecersiz");
      imlec = Number(imlecHam);
    }
    const r = await this.#oyuncu(hesapId);
    if (!r.ok) return r;
    const { kar } = r.deger;
    const { olaylar, son } = await this.#oku(Math.min(imlec, this.#meta.sq), OLAY_YANIT_EN_COK, (o) => gorebilir(o, kar));
    return basarili({
      olaylar: olaylar.map((o) => olayYaz(o, dil)),
      imlec: son,
      dahaVar: son < this.#meta.sq,
      eksik: imlec < this.#meta.ep * OLAY_SAYFA,
    });
  }

  /** GET /v1/kisi/:id: profil, sana bakışın dökümü, eylemler ve şansları; üçüncü kişilere bakış §13.9'a göre. */
  async kisi(hesapId: string, kisiHam: unknown, dilHam: unknown): Promise<Sonuc<unknown>> {
    const dil = dilCoz(dilHam);
    const r = await this.#oyuncu(hesapId);
    if (!r.ok) return r;
    const { kar, ili } = r.deger;
    const k = this.kasaba;
    const ay = k.ay;
    const ki = kisiCoz(kisiHam);
    if (!ki) return hata("kisi_yok");
    if (ki.tur === "oyuncu") {
      const s = k.sakin.find((x) => x.o === ki.o);
      if (!s) return hata("kisi_yok");
      return basarili({
        id: s.o,
        ad: s.ad,
        oyuncu: true,
        ben: s.o === kar.o,
        cinsiyet: s.k ? "kadın" : "erkek",
        yas: yas(s.d, ay),
        mekan: s.ma === ay ? s.mk : null,
        tanidik: kar.tn[s.o] ?? null,
      });
    }
    const npc = k.dizin.get(ki.i);
    if (!npc) return hata("kisi_yok");
    const id = npcKimlik(npc.i);
    const aile: { id: string; ad: string; rol: string }[] = [];
    const aileEkle = (n: Npc | undefined, rol: string) => {
      if (n) aile.push({ id: npcKimlik(n.i), ad: npcAdi(n, dil), rol });
    };
    if (npc.es) aileEkle(k.dizin.get(npc.es), "es");
    if (npc.an) aileEkle(k.dizin.get(npc.an), "anne");
    if (npc.ba) aileEkle(k.dizin.get(npc.ba), "baba");
    for (const o of k.npc) {
      if (o.an === npc.i || o.ba === npc.i) aileEkle(o, "evlat");
      else if (o !== npc && kardesMi(o, npc)) aileEkle(o, "kardes");
    }
    const bakis = gorus(k, npc, kar, ili, ay);
    const yakin = bakis.toplam > YAKINLIK_ESIGI;
    const liste: { id: string; ad: string; tur: string; deger: number; oyuncu?: true }[] = [];
    if (yakin) {
      for (const b of npc.b) {
        const o = k.dizin.get(b[0]);
        const v = o ? npcNpcBakisi(npc, o) : undefined;
        if (o && v) liste.push({ id: npcKimlik(o.i), ad: npcAdi(o, dil), tur: v.tur, deger: v.deger });
      }
      const oyuncular = Object.keys(kar.tn).filter((x) => x.startsWith("o") && x !== kar.o);
      await this.#yukle(oyuncular);
      for (const o of oyuncular) {
        const ok = k.kar.get(o);
        if (ok) liste.push({ id: o, ad: ok.ad, tur: "oyuncu", deger: gorusDegeri(k, npc, ok, k.ili.get(o), ay), oyuncu: true });
      }
    }
    const eylemler = NPC_EYLEMLERI.map((tur) => {
      const engel = eylemKapisi(k, tur, kar, npc, ay);
      const sansVar = engel === undefined || engel === "takat_yok" || engel === "para_yok" || engel === "ogrenme_kapali";
      const tekrar = tekrarSayisi(ili[npc.i], tur, ay);
      return {
        tur,
        takat: EYLEMLER[tur].takat,
        acik: engel === undefined,
        ...(engel ? { engel } : {}),
        ...(sansVar ? { sans: eylemSansi(k, tur, npc, kar, ili, ay) } : {}),
        getiri: { tekrar, carpan: Math.round(getiriCarpani(tekrar) * 100) / 100 },
      };
    });
    return basarili({
      id,
      ad: npcAdi(npc, dil),
      cinsiyet: npc.k ? "kadın" : "erkek",
      yas: yas(npc.d, ay),
      meslek: meslekGorunumu(npc, ay),
      huy: HUYLAR[npc.h] ?? "",
      tuhaflik: TUHAFLIKLAR[npc.q] ?? "",
      hayal: HAYALLER[npc.r] ?? "",
      gundem: GUNDEM_ADI[npc.g] || null,
      mekan: npcMekani(k, npc, ay) ?? null,
      aile,
      sanaBakis: bakis,
      sanaBakisEksen: eksenler(bakis),
      bakislari: { gorunur: yakin, liste },
      eylemler,
      tanidik: kar.tn[id] ?? null,
    });
  }

  /** POST /v1/eylem {tur, hedef?, secim?, ozellik?, istekNo, dil?}. Aynı istekNo aynı yanıtı döndürür. */
  async eylem(hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
    const no = istekNoCoz(govde);
    if (!no.ok) return no;
    const r = await this.#oyuncu(hesapId);
    if (!r.ok) return r;
    const { s, kar, ili } = r.deger;
    const onceki = kar.ist.find((x) => x[0] === no.deger);
    if (onceki) return basarili(onceki[1]);
    const girdi = eylemGirdisiCoz(govde);
    if (!girdi.ok) return girdi;
    const k = this.kasaba;
    const ay = k.ay;
    const dil = dilCoz(nesneMi(govde) ? govde.dil : undefined);
    const pa0 = kar.pa;
    const sonuc = eylemYap(k, kar, ili, girdi.deger, ay, tohumlu("eylem", k.y, ay, kar.o, kar.en));
    if (!sonuc.ok) return sonuc;
    defterYaz(kar, ay, "eylem", kar.pa - pa0);
    const olay = sonuc.deger.olay ? olayYaz(await this.#olayEkle(sonuc.deger.olay, ay), dil) : undefined;
    // Söylenti: başarılı hediye ve yardımı aynı mekândaki NPC'ler görür (muhatap NPC zaten bilir).
    const tur = girdi.deger.tur;
    const hedefId = sonuc.deger.sonuc.hedef;
    if (sonuc.deger.sonuc.basari && hedefId && (tur === "hediye" || tur === "yardim")) {
      const tanik = mekanTaniklari(k, kar.mk, [Number(hedefId.slice(1))], ay, `eylem:${kar.o}:${kar.en}`);
      if (soylentiEkle(k, tur, kar.o, hedefId, tanik, ay)) this.#kirli.add(TOPLUM);
    }
    s.mk = kar.mk;
    s.ma = kar.ma;
    const hedef = sonuc.deger.sonuc.hedef;
    const yanit = {
      ...sonuc.deger.sonuc,
      ...(hedef ? { hedefAd: kisiAdi(k, hedef, dil) ?? null } : {}),
      ...(olay ? { olay } : {}),
    };
    kar.ist.push([no.deger, yanit]);
    if (kar.ist.length > IST_EN_COK) kar.ist.splice(0, kar.ist.length - IST_EN_COK);
    this.#kirli.add(KAR + kar.o).add(ILI + kar.o).add(SAKIN);
    await this.kaydet();
    return basarili(yanit);
  }

  /** istekNo'lu yazma işlemlerinin ortak kabuğu: aynı istekNo aynı yanıtı döndürür, ikinci kez etki üretmez. */
  async #tekrarGuvenli(
    hesapId: string,
    govde: unknown,
    isle: (kar: Karakter, s: Sakin, ay: number, ek: TekrarEki) => Sonuc<Record<string, unknown>>,
    kalem = "diger",
  ): Promise<Sonuc<unknown>> {
    const no = istekNoCoz(govde);
    if (!no.ok) return no;
    const r = await this.#oyuncu(hesapId);
    if (!r.ok) return r;
    const { s, kar, ili } = r.deger;
    const onceki = kar.ist.find((x) => x[0] === no.deger);
    if (onceki) return basarili(onceki[1]);
    if (olduMu(kar)) return hata("olu");
    const ay = this.kasaba.ay;
    const bitti = await this.#beceriTamamla(kar);
    const ek: TekrarEki = { ili, olay: undefined, siparis: false, olaylar: [], digerleri: [], toplum: false };
    const pa0 = new Map([...this.kasaba.kar].map(([o, c]) => [o, c.pa]));
    const sonuc = isle(kar, s, ay, ek);
    if (!sonuc.ok) {
      if (bitti) await this.kaydet();
      return sonuc;
    }
    this.#defterIsle(pa0, ek, ay, kalem);
    const dil = dilCoz(nesneMi(govde) ? govde.dil : undefined);
    const olay = ek.olay ? olayYaz(await this.#olayEkle(ek.olay, ay), dil) : undefined;
    for (const t of ek.olaylar) await this.#olayEkle(t, ay);
    for (const o of ek.digerleri) if (this.kasaba.kar.has(o)) this.#kirli.add(KAR + o).add(ILI + o);
    if (ek.toplum) this.#kirli.add(TOPLUM);
    const yanit = structuredClone({ ...sonuc.deger, ...(olay ? { olay } : {}), envanter: kar.ev ?? {}, para: kar.pa, takat: kar.tk });
    kar.ist.push([no.deger, yanit]);
    if (kar.ist.length > IST_EN_COK) kar.ist.splice(0, kar.ist.length - IST_EN_COK);
    this.#kirli.add(KAR + kar.o).add(ILI + kar.o).add(SAKIN);
    if (ek.siparis) this.#kirli.add(SIPARIS);
    if (ek.ekonomi) this.#kirli.add(EKONOMI);
    if (ek.topluluk) this.#kirli.add(TOPLULUK);
    await this.kaydet();
    return basarili(yanit);
  }

  /** Defter (Faz 6): açık kalemleri, sonra akçesi değişen her oyuncunun kalan farkını varsayılan kaleme yazar. */
  #defterIsle(pa0: Map<string, number>, ek: TekrarEki, ay: number, kalem: string): void {
    const acik = new Map<string, number>();
    for (const [o, km, tutar] of ek.defter ?? []) {
      const c = this.kasaba.kar.get(o);
      if (!c) continue;
      defterYaz(c, ay, km, tutar);
      acik.set(o, (acik.get(o) ?? 0) + tutar);
    }
    for (const [o, c] of this.kasaba.kar) {
      const once = pa0.get(o);
      if (once === undefined) continue;
      const fark = c.pa - once - (acik.get(o) ?? 0);
      if (fark !== 0) defterYaz(c, ay, kalem, fark);
      if (c.pa !== once) this.#kirli.add(KAR + o);
    }
  }

  /**
   * Faz 6 ekonomi uçlarının yazma kabuğu (ekonomi-uclar.ts): `yukle` oyuncularını yükler, istekNo'lu işlemi
   * yürütür; ekonomi kaydı, değişen öteki oyuncular ve defter yazılır.
   */
  async ekonomiYaz(
    hesapId: string,
    govde: unknown,
    kalem: string,
    yukle: readonly string[],
    isle: (kar: Karakter, ay: number, ek: TekrarEki) => Sonuc<Record<string, unknown>>,
  ): Promise<Sonuc<unknown>> {
    const k = this.kasaba;
    const yuklenecek = yukle.filter((o) => k.sakin.some((x) => x.o === o));
    if (yuklenecek.length > 0) await this.#yukle(yuklenecek);
    return this.#tekrarGuvenli(
      hesapId,
      govde,
      (kar, _s, ay, ek) => {
        const r = isle(kar, ay, ek);
        if (r.ok) ek.ekonomi = true;
        return r;
      },
      kalem,
    );
  }

  /** Faz 6 ekonomi okuma uçları: sakin karakteriyle okur (yazmaz). */
  async ekonomiOku(hesapId: string, oku: (kar: Karakter, ay: number) => Sonuc<unknown>): Promise<Sonuc<unknown>> {
    const r = await this.#oyuncu(hesapId);
    if (!r.ok) return r;
    return oku(r.deger.kar, this.kasaba.ay);
  }

  /**
   * E5–E7 topluluk uçlarının yazma kabuğu (topluluk-uclar.ts): `yukle` oyuncularını yükler, istekNo'lu işlemi
   * yürütür; topluluk kaydı, değişen öteki oyuncular ve defter ("topluluk" kalemi) yazılır. `simdi` gerçek zamandır.
   */
  async toplulukYaz(
    hesapId: string,
    govde: unknown,
    yukle: readonly string[],
    isle: (kar: Karakter, ay: number, ek: TekrarEki, simdi: number) => Sonuc<Record<string, unknown>>,
  ): Promise<Sonuc<unknown>> {
    const k = this.kasaba;
    const yuklenecek = yukle.filter((o) => k.sakin.some((x) => x.o === o));
    if (yuklenecek.length > 0) await this.#yukle(yuklenecek);
    return this.#tekrarGuvenli(
      hesapId,
      govde,
      (kar, _s, ay, ek) => {
        const r = isle(kar, ay, ek, this.#simdi);
        if (r.ok) ek.topluluk = true;
        return r;
      },
      "topluluk",
    );
  }

  /** Topluluk okuma ucu: sakin karakteriyle okur (yazmaz). */
  async toplulukOku(hesapId: string, oku: (kar: Karakter, ay: number, simdi: number) => Sonuc<unknown>): Promise<Sonuc<unknown>> {
    const r = await this.#oyuncu(hesapId);
    if (!r.ok) return r;
    return oku(r.deger.kar, this.kasaba.ay, this.#simdi);
  }

  /** İç yazma (istekNo'suz, doğası gereği tekrar güvenli; ör. müdavim ziyareti): karakter, sakin ve olaylar yazılır. */
  async karakterYaz(
    hesapId: string,
    isle: (kar: Karakter, s: Sakin, ay: number, simdi: number) => Sonuc<{ deger: unknown; olaylar: OlayTaslagi[] }>,
  ): Promise<Sonuc<unknown>> {
    const r = await this.#oyuncu(hesapId);
    if (!r.ok) return r;
    const { s, kar } = r.deger;
    if (olduMu(kar)) return hata("olu");
    const ay = this.kasaba.ay;
    const sonuc = isle(kar, s, ay, this.#simdi);
    if (!sonuc.ok) return sonuc;
    for (const t of sonuc.deger.olaylar) await this.#olayEkle(t, ay);
    this.#kirli.add(KAR + kar.o).add(SAKIN);
    await this.kaydet();
    return basarili(sonuc.deger.deger);
  }

  /** Yerel oyuncu kimliğini çözer (yalnız bu yerleşimin sakini). */
  sakinKimligi(ham: unknown): string | undefined {
    return this.#sakinKimligi(ham);
  }

  /** Süresi dolan beceri öğrenmesini tamamlar; oyuncuya özel olay (Dönüş Kartı maddesi) düşer. */
  async #beceriTamamla(kar: Karakter) {
    const t = ogrenmeTamamla(kar, this.#simdi);
    if (!t) return null;
    const p: Record<string, OlayParam> = t.tur === "ogrenme" ? { meslek: t.meslek, dugum: t.dugum, seviye: t.seviye } : { meslek: t.meslek };
    await this.#olayEkle({ t: "beceri", w: kar.o, h: kar.o, g: kar.o, n: 4, k: t.tur === "ogrenme" ? "olay.beceri.tamam" : "olay.beceri.yeniden", p }, this.kasaba.ay);
    this.#kirli.add(KAR + kar.o);
    return t;
  }

  /** GET /v1/beceri?meslek=: ağaç + oyuncu durumu (beceri ağacı v2). */
  async beceri(hesapId: string, meslekHam: unknown): Promise<Sonuc<unknown>> {
    const r = await this.#oyuncu(hesapId);
    if (!r.ok) return r;
    const { kar } = r.deger;
    const bitti = await this.#beceriTamamla(kar);
    const g = agacGorunumu(kar, meslekHam, this.#simdi);
    if (bitti) await this.kaydet();
    return g;
  }

  /**
   * Beceri yazma işlemleri (istekNo'lu): ogren {meslek, dugum}, iptal {}, hizlandir {kaynak}, yeniden {meslek}.
   * Yanıtta süren öğrenme ve ilgili meslek ağacının puanı döner.
   */
  async beceriYaz(hesapId: string, islem: "ogren" | "iptal" | "hizlandir" | "yeniden", govde: unknown): Promise<Sonuc<unknown>> {
    if (!nesneMi(govde)) return hata("gecersiz_istek");
    const simdi = this.#simdi;
    if (islem === "hizlandir") {
      // Eğitimde ustanın karakteri gerekir (kademesine göre oran).
      const r = await this.#oyuncu(hesapId);
      if (r.ok && r.deger.kar.bo) {
        const u = ciraklikUstasi(this.kasaba, r.deger.kar.o, r.deger.kar.bo.m);
        if (u) await this.#yukle([u]);
      }
    }
    return this.#tekrarGuvenli(hesapId, govde, (kar) => {
      let r: Sonuc<Record<string, unknown>>;
      if (islem === "ogren") r = beceriOgren(kar, govde.meslek, govde.dugum, simdi);
      else if (islem === "iptal") r = beceriIptal(kar, simdi);
      else if (islem === "hizlandir")
        r = beceriHizlandir(kar, govde.kaynak, simdi, (m) => {
          const o = ciraklikUstasi(this.kasaba, kar.o, m);
          const u = o ? this.kasaba.kar.get(o) : undefined;
          return u ? { o: u.o, kademe: u.ms?.s[m]?.kd ?? 0 } : undefined;
        }, nesneMi(govde.kisaltma) ? (govde.kisaltma as { dk?: number; oran?: number }) : undefined);
      else r = beceriYeniden(kar, govde.meslek, simdi, hanedanKasabasi(this.kasaba));
      if (!r.ok) return r;
      return basarili({ ...r.deger, beceri: beceriGorunumu(kar), beceriOzet: beceriOzeti(kar, simdi) });
    }, "beceri");
  }

  /** POST /v1/meslek {islem: sec|yan|kademe, meslek, istekNo}. Düğüm öğrenme /v1/beceri/ogren'dedir (v2). */
  async meslek(hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
    if (!nesneMi(govde)) return hata("gecersiz_istek");
    return this.#tekrarGuvenli(hesapId, govde, (kar, s, ay) => {
      const m = govde.meslek;
      let r: Sonuc<unknown>;
      switch (govde.islem) {
        case "sec":
          r = meslekSec(kar, m, ay);
          if (r.ok) s.ms = meslekKaydi(kar).a || undefined;
          break;
        case "yan":
          r = yanSec(kar, m, ay);
          break;
        case "kademe":
          r = kademeAtla(kar, m, ay);
          break;
        default:
          return hata("gecersiz_istek");
      }
      if (!r.ok) return r;
      return basarili({ meslek: meslekKaydi(kar), kademeHizmet: KADEME_HIZMET, beceri: beceriGorunumu(kar), tarifler: tarifListesi(kar) });
    });
  }

  /** POST /v1/temel-is {is, istekNo}: herkese açık temel iş; çıktı, fırsat dökümü ve envanter. */
  async temelIs(hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
    if (!nesneMi(govde)) return hata("gecersiz_istek");
    const sayac = oyuncuSayaci(this.kasaba);
    return this.#tekrarGuvenli(hesapId, govde, (kar, _s, ay) => temelIsYap(kar, govde.is, sayac, ay));
  }

  /** POST /v1/taban-al {mal, adet, istekNo}: NPC taban arzından pahalı ve kotalı alım. */
  async tabanAl(hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
    if (!nesneMi(govde)) return hata("gecersiz_istek");
    return this.#tekrarGuvenli(hesapId, govde, (kar, _s, ay) => npcdenAl(kar, govde.mal, govde.adet, ay, (this.kasaba.st ??= {}) as KasabaStogu, this.kasaba.pr), "npcAlim");
  }

  /** POST /v1/tarif {tarif, istekNo}: açık düğümlü tarif; girdi düşer, çıktı eklenir, Hal ve hizmet döner. */
  async tarif(hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
    if (!nesneMi(govde)) return hata("gecersiz_istek");
    return this.#tekrarGuvenli(hesapId, govde, (kar, _s, ay, ek) => {
      const r = tarifYap(kar, govde.tarif, ay);
      if (!r.ok) return r;
      const lv = levhaYaz(this.kasaba, kar, r.deger.tarif, r.deger.cikti.mal, r.deger.kalite.kademe, ay);
      if (lv) {
        ek.olaylar.push(lv.olay);
        ek.ekonomi = true;
      }
      const ur = (kar.ur ??= {});
      ur[r.deger.cikti.mal] = (ur[r.deger.cikti.mal] ?? 0) + r.deger.cikti.adet;
      return basarili({ ...r.deger, levha: lv ? true : false, tarifler: tarifListesi(kar) });
    });
  }

  /** POST /v1/sat {mal, adet, istekNo}: NPC'ye satış (aylık kotalı); birim fiyat dökümü ve kota döner. */
  async sat(hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
    if (!nesneMi(govde)) return hata("gecersiz_istek");
    const sayac = oyuncuSayaci(this.kasaba);
    await this.#ortaklariYukle(hesapId);
    return this.#tekrarGuvenli(hesapId, govde, (kar, _s, ay, ek) => {
      const r = npcyeSat(kar, govde.mal, govde.adet, sayac, ay, (this.kasaba.st ??= {}) as KasabaStogu, this.kasaba.pr);
      if (!r.ok) return r;
      basariSay(kar, "sat:akce", r.deger.tutar);
      return basarili({ ...r.deger, ...this.#ortakPayiYaz(kar, r.deger.tutar, ay, ek) });
    }, "npcSatis");
  }

  /** POST /v1/siparis/teslim {siparis, istekNo, dil?}: ilk getiren alır; ödül, hizmet, teşekkür izi olayı. */
  async siparisTeslim(hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
    if (!nesneMi(govde)) return hata("gecersiz_istek");
    await this.#ortaklariYukle(hesapId);
    return this.#tekrarGuvenli(hesapId, govde, (kar, _s, ay, ek) => {
      const sp = this.kasaba.sp?.find((x) => x.id === govde.siparis);
      if (sp && this.#oncelik(kar, sp, ay).bekle) return hata("oncelik_bekle");
      const r = siparisTeslim(this.kasaba, kar, ek.ili, govde.siparis, ay);
      if (!r.ok) return r;
      if (sp) basariSay(kar, `teslim:${sp.mal}`, sp.adet);
      ek.olay = r.deger.olay;
      ek.siparis = true;
      return basarili({ ...r.deger.sonuc, hal: halGorunumu(kar, ay), ...this.#ortakPayiYaz(kar, r.deger.sonuc.odul, ay, ek) });
    }, "siparis");
  }

  /** GET /v1/siparisler?dil=: açık ve son kapanan siparişler (teşekkür izi), benim elimdeki adet. */
  async siparisler(hesapId: string, dilHam: unknown): Promise<Sonuc<unknown>> {
    const r = await this.#oyuncu(hesapId);
    if (!r.ok) return r;
    const k = this.kasaba;
    const kar = r.deger.kar;
    const liste = siparisGorunumu(k, kar, k.ay, dilCoz(dilHam)).map((g) => {
      const sp = k.sp?.find((x) => x.id === g.id);
      return sp ? { ...g, oncelik: this.#oncelik(kar, sp, k.ay) } : g;
    });
    return basarili({ siparisler: liste });
  }

  /** GET /v1/lonca: yerleşimin lonca tablosu (oyuncunun sakin olması gerekir). */
  async lonca(hesapId: string): Promise<Sonuc<unknown>> {
    const r = await this.#oyuncu(hesapId);
    if (!r.ok) return r;
    return basarili({ lonca: loncaTablosu(this.kasaba) });
  }

  /** POST /v1/tanidik {hedef, isaret: "tanidik" | "dost" | "dusman" | null}. null işareti listeden çıkarır. */
  async tanidik(hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
    if (!nesneMi(govde)) return hata("gecersiz_istek");
    const r = await this.#oyuncu(hesapId);
    if (!r.ok) return r;
    const { kar, ili } = r.deger;
    if (olduMu(kar)) return hata("olu");
    const k = this.kasaba;
    const ay = k.ay;
    const ki = kisiCoz(govde.hedef);
    const hedef = govde.hedef as string;
    const var_ = ki?.tur === "npc" ? k.dizin.has(ki.i) : ki ? k.sakin.some((s) => s.o === ki.o) : false;
    if (!ki || !var_) return hata("kisi_yok");
    if (hedef === kar.o) return hata("isaret_gecersiz");
    const isaret = govde.isaret;
    if (isaret === null || isaret === "sil") delete kar.tn[hedef];
    else {
      if (typeof isaret !== "string" || !ISARETLER.includes(isaret)) return hata("isaret_gecersiz");
      if (!acikMi(kar, ay, isaret)) return hata("ogrenme_kapali");
      // Oyuncular arası dostluk karşılıklıdır (istek/kabul); Faz 2'de yalnız tanıdık ve gizli düşman işareti.
      if (isaret === "dost" && ki.tur === "oyuncu") return hata("isaret_gecersiz");
      const onceki = kar.tn[hedef];
      if (!onceki && Object.keys(kar.tn).length >= TANIDIK_EN_COK) return hata("isaret_gecersiz");
      kar.tn[hedef] = isaret as Isaret;
      if (isaret === "dost" && onceki !== "dost") sayacArtir(kar, "dostluk");
    }
    const ogrenme = ogrenmeIlerle(kar, ay);
    this.#kirli.add(KAR + kar.o);
    await this.kaydet();
    return basarili({ tanidiklar: this.#tanidiklar(kar, ili, dilCoz(govde.dil)), ogrenme });
  }
  // ---------------------------------------------------------------- oyuncular arası (Faz 3a)

  /** Var olan sakin oyuncunun yerel kimliği. */
  /** Şikayet için: yerleşimdeki oyuncunun yerel kimliği → hesap kimliği (yalnız sakin olan sorar). */
  async sakinHesabi(hesapId: string, hedef: unknown): Promise<Sonuc<{ hesap: string }>> {
    if (!this.kasaba.sakin.some((x) => x.h === hesapId)) return hata("sakin_yok");
    const o = this.#sakinKimligi(hedef);
    const s = o ? this.kasaba.sakin.find((x) => x.o === o) : undefined;
    return s ? basarili({ hesap: s.h }) : hata("kisi_yok");
  }

  #sakinKimligi(ham: unknown): string | undefined {
    const ki = kisiCoz(ham);
    return ki?.tur === "oyuncu" && this.kasaba.sakin.some((s) => s.o === ki.o) ? ki.o : undefined;
  }

  async #ortaklariYukle(hesapId: string): Promise<void> {
    const s = this.kasaba.sakin.find((x) => x.h === hesapId);
    if (s && this.kasaba.tp) await this.#yukle(ortaklar(this.kasaba, s.o));
  }

  #ortakPayiYaz(kar: Karakter, tutar: number, ay: number, ek: TekrarEki): { ortakPayi?: { ortak: string; akce: number }[] } {
    const pay = ortakPayi(this.kasaba, kar, tutar, ay);
    if (pay.length === 0) return {};
    ek.digerleri.push(...pay.map((p) => p.ortak));
    ek.toplum = true;
    return { ortakPayi: pay };
  }

  /** Lonca siparişinde teveccüh önceliği: açılış ayında aynı meslekte daha yüksek kademeli biri varsa beklenir. */
  #oncelik(kar: Karakter, sp: Siparis, ay: number) {
    const meslek = MALLAR[sp.mal].meslek;
    const kademe = teveccuhKademesi(kar, ay);
    let enYuksek = 0;
    for (const x of this.kasaba.sakin) if (x.o !== kar.o && x.ms === meslek && (x.tv ?? 0) > enYuksek) enYuksek = x.tv ?? 0;
    const bekle = sp.durum === "acik" && ay === sp.acilis && enYuksek >= TEVECCUH_ETKI.siparisKademe && enYuksek > kademe;
    return { kademe, enYuksek, bekle, kalem: { k: "siparis.oncelik.teveccuh", d: teveccuhEtkisi(kademe, "siparis") } };
  }

  /** Karşı oyuncuyu yükler ve istekNo'lu işlemi yürütür (ikisi de yazılır, toplum kaydı da). */
  async #karsilikli(
    hesapId: string,
    govde: Record<string, unknown>,
    isle: (kar: Karakter, diger: Karakter, ay: number, ek: TekrarEki) => Sonuc<Record<string, unknown>>,
  ): Promise<Sonuc<unknown>> {
    const h = this.#sakinKimligi(govde.hedef);
    if (h) await this.#yukle([h]);
    return this.#tekrarGuvenli(hesapId, govde, (kar, _s, ay, ek) => {
      const diger = h ? this.kasaba.kar.get(h) : undefined;
      if (!diger) return hata("kisi_yok");
      if (diger.o === kar.o) return hata("kendine");
      ek.digerleri.push(diger.o);
      ek.toplum = true;
      return isle(kar, diger, ay, ek);
    }, "teklif");
  }

  #oyuncuEylemleri(kar: Karakter, o: Karakter, ay: number) {
    const t = this.kasaba.tp;
    const engel = engelliMi(t, kar.o, o.o);
    const yasBen = karakterYasi(kar, ay);
    const yasO = karakterYasi(o, ay);
    const kapi = (enAz: number) => (engel ? "engelli" : yasBen < enAz || yasO < enAz ? "yas_kapisi" : undefined);
    const bag = bagGorunumu(t, kar.o, o.o);
    const liste: { tur: string; islem?: string; acik: boolean; engel?: string }[] = [];
    const ekle = (tur: string, islem: string | undefined, e: string | undefined) =>
      liste.push({ tur, ...(islem ? { islem } : {}), acik: e === undefined, ...(e ? { engel: e } : {}) });
    ekle("dostluk", bag === "dost" ? "bitir" : bag === "istekGeldi" ? "kabul" : bag === "istekGonderildi" ? "bekliyor" : "iste", bag === "dost" ? undefined : kapi(TEKLIF_YASI));
    for (const tur of OYUNCU_TEKLIF_TURLERI) ekle(`teklif.${tur}`, undefined, kapi(tur === "gorucu" ? GORUCU_YASI : TEKLIF_YASI));
    ekle("husumet", acikHusumet(t, kar.o, o.o) ? "kaldir" : "ilan", undefined);
    ekle("engelle", (t?.eg[kar.o] ?? []).includes(o.o) ? "kaldir" : "engelle", undefined);
    ekle("sikayet", undefined, undefined);
    return liste;
  }

  /** GET /v1/oyuncu/:id?dil=: oyuncu profili (yalnız görünür alanlar; kendi kimliğinle `ben: true`). */
  async oyuncu(hesapId: string, idHam: unknown, dilHam: unknown): Promise<Sonuc<unknown>> {
    const dil = dilCoz(dilHam);
    const r = await this.#oyuncu(hesapId);
    if (!r.ok) return r;
    const { kar } = r.deger;
    const h = this.#sakinKimligi(idHam);
    if (!h) return hata("kisi_yok");
    await this.#yukle([h]);
    const o = this.kasaba.kar.get(h);
    if (!o) return hata("kisi_yok");
    const ay = this.kasaba.ay;
    return basarili({
      ...oyuncuProfili(this.kasaba, kar, o, dil),
      mesleki: mesleki(o, this.#simdi),
      teveccuh: teveccuhGorunumu(o, ay),
      ismarlamaSicili: ismarlamaSicili(o),
      vitrin: vitrinGorunumu(o),
      eylemler: o.o === kar.o ? [] : this.#oyuncuEylemleri(kar, o, ay),
    });
  }

  /** POST /v1/dostluk {hedef, islem: iste|kabul|ret|bitir, istekNo}. */
  async dostluk(hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
    if (!nesneMi(govde)) return hata("gecersiz_istek");
    return this.#karsilikli(hesapId, govde, (kar, o, ay, ek) => {
      const r = dostlukIslem(this.kasaba, kar, o, govde.islem, ay);
      if (!r.ok) return r;
      ek.olaylar.push(...r.deger.olaylar);
      return basarili({ hedef: o.o, bag: r.deger.bag });
    });
  }

  /** POST /v1/husumet {hedef, islem: ilan|kaldir, istekNo}. */
  async husumet(hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
    if (!nesneMi(govde)) return hata("gecersiz_istek");
    return this.#karsilikli(hesapId, govde, (kar, o, ay, ek) => {
      const r = husumetIslem(this.kasaba, kar, o, govde.islem, ay);
      if (!r.ok) return r;
      ek.olaylar.push(...r.deger.olaylar);
      return basarili({ hedef: o.o, husumet: r.deger.husumet });
    });
  }

  /** POST /v1/teklif {tur, hedef, ...şartlar, istekNo}: emanet hemen kilitlenir; alıcıya özel olay düşer. */
  async teklif(hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
    if (!nesneMi(govde)) return hata("gecersiz_istek");
    const dil = dilCoz(govde.dil);
    if (govde.is === "mektup") {
      const hedef = this.#sakinKimligi(govde.mektupHedef);
      if (!hedef) return hata("kisi_yok");
      await this.#yukle([hedef]);
    }
    return this.#karsilikli(hesapId, govde, (kar, o, ay, ek) => {
      const r = teklifOlustur(this.kasaba, kar, o, govde, ay);
      if (!r.ok) return r;
      ek.olaylar.push(...r.deger.olaylar);
      return basarili({ teklif: teklifGorunumu(this.kasaba, r.deger.teklif, kar.o, dil) });
    });
  }

  /** POST /v1/teklif/:id/cevap {cevap: kabul|ret|geri|bitir|ode, tutar?, istekNo}. */
  async teklifCevap(hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
    if (!nesneMi(govde)) return hata("gecersiz_istek");
    const dil = dilCoz(govde.dil);
    const k = this.kasaba;
    const t = teklifBul(k, govde.teklif);
    if (t) await this.#yukle([...teklifTaraflari(t), ...(t.s.yp ? [t.s.yp] : [])]);
    return this.#tekrarGuvenli(hesapId, govde, (kar, _s, ay, ek) => {
      const r = teklifCevap(k, kar, govde.teklif, govde.cevap, govde, ay);
      if (!r.ok) return r;
      ek.olaylar.push(...r.deger.olaylar);
      ek.digerleri.push(...teklifTaraflari(r.deger.teklif).filter((x) => x !== kar.o));
      ek.toplum = true;
      return basarili({ teklif: teklifGorunumu(k, r.deger.teklif, kar.o, dil) });
    }, "teklif");
  }


  /** POST /v1/arabuluculuk {islem: ac|cevap|geri, hedef?, arabulucu?, dosya?, cevap?, istekNo}.
   * Her işlem çağıranın kendi karakteriyle yapılır; üçüncü taraflar yalnız yerleşim kaydında güncellenir. */
  async oyuncuArabuluculuk(hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
    if (!nesneMi(govde)) return hata("gecersiz_istek");
    const k = this.kasaba;
    const hedef = govde.islem === "ac" ? this.#sakinKimligi(govde.hedef) : undefined;
    const arabulucu = govde.islem === "ac" ? this.#sakinKimligi(govde.arabulucu) : undefined;
    if (govde.islem === "ac" && (!hedef || !arabulucu)) return hata("kisi_yok");
    if (hedef && arabulucu) await this.#yukle([hedef, arabulucu]);
    if (["cevap", "geri", "taslak", "imza", "uygula"].includes(String(govde.islem))) {
      const id = typeof govde.dosya === "string" && /^[1-9][0-9]{0,8}$/.test(govde.dosya) ? Number(govde.dosya) : -1;
      const dosya = oyuncuArabuluculukAl(toplumAl(k)).find(x => x.i === id);
      if (dosya) await this.#yukle([dosya.s, dosya.k, dosya.ar]);
    }
    return this.#tekrarGuvenli(hesapId, govde, (kar, _s, ay, ek) => {
      let sonuc: Sonuc<OyuncuArabuluculuk>;
      if (govde.islem === "ac") {
        const karsi = hedef ? k.kar.get(hedef) : undefined;
        const ar = arabulucu ? k.kar.get(arabulucu) : undefined;
        if (!karsi || !ar) return hata("sakin_yok");
        sonuc = oyuncuArabuluculukAc(k, kar, karsi, ar, ay);
      } else if (govde.islem === "cevap") {
        sonuc = oyuncuArabuluculukCevap(k, kar, govde.dosya, govde.cevap, ay);
      } else if (govde.islem === "geri") {
        sonuc = oyuncuArabuluculukGeriAl(k, kar, govde.dosya, ay);
      } else if (govde.islem === "taslak") {
        sonuc = oyuncuArabuluculukTaslak(k, kar, govde.dosya, govde.sTutari, govde.kTutari, govde.not, ay);
      } else if (govde.islem === "imza") {
        sonuc = oyuncuArabuluculukImzala(k, kar, govde.dosya, govde.surum);
      } else if (govde.islem === "uygula") {
        sonuc = oyuncuArabuluculukUygula(k, kar, govde.dosya, ay);
      } else return hata("gecersiz_istek");
      if (!sonuc.ok) return sonuc;
      const d = sonuc.deger;
      ek.digerleri.push(...[d.s, d.k, d.ar].filter(o => o !== kar.o));
      ek.toplum = true;
      return basarili({ dosya: { id: String(d.i), durum: d.d, sikayetci: d.s, karsi: d.k, arabulucu: d.ar, riza: d.rs, uzlasma: d.uz, surum: d.sv, imza: d.im, acilisAyi: d.ac, sonCevapAyi: d.sa, sonAy: d.sonAy } });
    }, "arabuluculuk");
  }

  /** GET /v1/gelen?dil=: gelen/giden açık teklifler, süren anlaşmalar, son kapananlar, dostluk, husumet, söylenti. */
  async gelen(hesapId: string, dilHam: unknown): Promise<Sonuc<unknown>> {
    const dil = dilCoz(dilHam);
    const r = await this.#oyuncu(hesapId);
    if (!r.ok) return r;
    const { kar } = r.deger;
    const k = this.kasaba;
    const t = k.tp;
    const benim = (t?.tk ?? []).filter((x) => x.g === kar.o || x.a === kar.o);
    const mektupHedefleri = benim.flatMap((x) => x.s.he ? [x.s.he] : []);
    if (mektupHedefleri.length) await this.#yukle(mektupHedefleri);
    const g = (x: (typeof benim)[number]) => teklifGorunumu(k, x, kar.o, dil);
    const ad = (id: string) => ({ id, ad: k.sakin.find((s) => s.o === id)?.ad ?? "?" });
    const bagli = (t?.ob ?? []).filter((b) => b.a === kar.o || b.b === kar.o);
    const diger = (b: { a: string; b: string }) => (b.a === kar.o ? b.b : b.a);
    return basarili({
      ay: k.ay,
      gelen: benim.filter((x) => x.d === "acik" && x.a === kar.o).map(g),
      giden: benim.filter((x) => x.d === "acik" && x.g === kar.o).map(g),
      suren: benim.filter((x) => x.d === "surer").map(g),
      kapanan: benim.filter((x) => x.d !== "acik" && x.d !== "surer").slice(-GELEN_KAPALI_EN_COK).reverse().map(g),
      arabuluculuk: oyuncuArabuluculukAl(toplumAl(k))
        .filter(x => x.s === kar.o || x.k === kar.o || x.ar === kar.o)
        .slice(-GELEN_KAPALI_EN_COK).reverse()
        .map(x => ({ id: String(x.i), durum: x.d, rol: x.s === kar.o ? "sikayetci" : x.k === kar.o ? "karsi" : "arabulucu",
          sikayetci: ad(x.s), karsi: ad(x.k), arabulucu: ad(x.ar), riza: { ...x.rs }, uzlasma: x.uz ? { ...x.uz } : undefined, surum: x.sv, imza: { ...x.im },
          acilisAyi: x.ac, sonCevapAyi: x.sa, sonAy: x.sonAy, kapanisAyi: x.kp })),
      dostluk: {
        gelen: bagli.filter((b) => b.d === "istek" && b.g !== kar.o).map((b) => ({ ...ad(diger(b)), ay: b.ay })),
        giden: bagli.filter((b) => b.d === "istek" && b.g === kar.o).map((b) => ({ ...ad(diger(b)), ay: b.ay })),
        dostlar: bagli.filter((b) => b.d === "dost").map((b) => ({ ...ad(diger(b)), ay: b.ay })),
      },
      husumetler: (t?.hu ?? [])
        .filter((h) => h.d === "acik" && (h.g === kar.o || h.h === kar.o))
        .map((h) => ({ ...ad(h.g === kar.o ? h.h : h.g), yon: h.g === kar.o ? "ilanEttim" : "ilanEdildi", ay: h.ay })),
      soylentiler: soylentiGorunumu(k, kar, dil),
      engellenenler: engelListesi(t, kar.o).map(ad),
    });
  }

  /** POST /v1/engelle {hedef, islem: engelle|kaldir, istekNo}: açık teklifler iptal (emanet iade), dostluk biter. */
  async engelle(hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
    if (!nesneMi(govde)) return hata("gecersiz_istek");
    // İptal edilen tekliflerin emaneti iade edilir: karşı tarafın teklifleri için onun karakteri de yüklüdür.
    return this.#karsilikli(hesapId, govde, (kar, o, ay) => {
      const k = this.kasaba;
      const t = toplumAl(k);
      let liste: readonly string[];
      if (govde.islem === "kaldir") liste = engelKaldir(t, kar.o, o.o);
      else if (govde.islem === undefined || govde.islem === "engelle") {
        const r = engelle(t, kar.o, o.o);
        if (!r.ok) return r;
        liste = r.deger;
        taraflarArasiIptal(k, kar.o, o.o, ay);
        if (kar.tn[o.o] === "dost") kar.tn[o.o] = "tanidik";
        if (o.tn[kar.o] === "dost") o.tn[kar.o] = "tanidik";
      } else return hata("gecersiz_istek");
      return basarili({ engellenenler: liste.map((id) => ({ id, ad: k.sakin.find((s) => s.o === id)?.ad ?? "?" })) });
    });
  }

  /** Han masası bileti: oyuncunun engellediği ve onu engelleyen oyuncuların hesap kimlikleri (iki yönlü). */
  /** Siyaset (Faz 7/P1): sunucunun doğruladığı siyasi kimlik (yalnız okur; BolgeDO adaylık ve küme için kullanır). */
  async siyasetKimlik(hesapId: string): Promise<Sonuc<unknown>> {
    const r = await this.#oyuncu(hesapId);
    if (!r.ok) return r;
    const { kar } = r.deger;
    const haklar = new Set<string>();
    for (const e of acikEtkiler(kar)) if (e.tur === "hak" && (e.hak === "kasabaMakami" || e.hak === "bolgeMakami")) haklar.add(e.hak);
    const k = this.kasaba;
    return basarili({
      kisi: `${k.y}/${kar.o}`,
      hesap: hesapId,
      ad: kar.ad,
      yerlesim: k.y,
      yas: yas(kar.d, k.ay),
      e: kar.e,
      olu: olduMu(kar),
      nam: kar.nm.reduce((t, x) => t + x, 0),
      teveccuh: teveccuhKademesi(kar, k.ay),
      haklar: [...haklar].sort(),
    });
  }

  async engeller(hesapId: string): Promise<Sonuc<{ engeller: string[] }>> {
    const s = this.kasaba.sakin.find((x) => x.h === hesapId);
    if (!s) return hata("sakin_yok");
    const eg = this.kasaba.tp?.eg ?? {};
    const yerel = new Set<string>(eg[s.o] ?? []);
    for (const [kim, liste] of Object.entries(eg)) if (liste.includes(s.o)) yerel.add(kim);
    const hesaplar = new Set<string>();
    for (const x of this.kasaba.sakin) if (x.h !== hesapId && yerel.has(x.o)) hesaplar.add(x.h);
    return basarili({ engeller: [...hesaplar].sort() });
  }

  /**
   * Han ikramı (HesapDO masa kontrolünden sonra; govde {hedef: hesap kimliği, ikram, istekNo}). Fiyat yalnız
   * IKRAM_MENUSU'ndan: verenin akçesi düşer, NPC hancıda dünyadan çıkar; alanın verene teveccühü tutar kadar artar
   * (aynı hane/küme sayılmaz). istekNo ile tekrar güvenli.
   */
  async hanIkram(hesapId: string, govde: unknown, vergiOrani = 0): Promise<Sonuc<unknown>> {
    if (!nesneMi(govde)) return hata("gecersiz_istek");
    const ikram = govde.ikram;
    if (typeof ikram !== "string" || !Object.hasOwn(IKRAM_MENUSU, ikram)) return hata("ikram_gecersiz");
    const hs = typeof govde.hedef === "string" ? this.kasaba.sakin.find((x) => x.h === govde.hedef) : undefined;
    if (hs) await this.#yukle([hs.o]);
    return this.#tekrarGuvenli(hesapId, govde, (kar, _s, ay, ek) => {
      const alan = hs ? this.kasaba.kar.get(hs.o) : undefined;
      if (!alan || olduMu(alan)) return hata("kisi_yok");
      if (alan.o === kar.o) return hata("kendi_hedef");
      if (engelliMi(this.kasaba.tp, kar.o, alan.o)) return hata("engelli");
      // Faz 12: yerleşimin hanı oyuncu işletmesiyse akçe kasaya (çıkış kutusu), değilse dünyadan çıkar.
      this.#kirli.add(MULK);
      const odeme = mulkluIkram(this.kasaba, kar, ikram as IkramId, this.#simdi, String(govde.istekNo), vergiOrani);
      if (!odeme.ok) return odeme;
      const teveccuh = teveccuhEkle(alan, kar, "ikram", ay, odeme.deger.fiyat);
      const sk = this.kasaba.sakin.find((x) => x.o === alan.o);
      if (sk) sk.tv = teveccuhKademesi(alan, ay) || undefined;
      ek.digerleri.push(alan.o);
      return basarili({ ikram, fiyat: odeme.deger.fiyat, batak: odeme.deger.batak, ...(odeme.deger.kasaya ? { kasaya: odeme.deger.kasaya, transfer: { islem: odeme.deger.islem } } : {}), teveccuh });
    }, "ikram");
  }

  /** GET /v1/duzen: olağan düzen ayarları. */
  async duzenOku(hesapId: string): Promise<Sonuc<unknown>> {
    const r = await this.#oyuncu(hesapId);
    if (!r.ok) return r;
    return basarili({ duzen: duzenGorunumu(r.deger.kar) });
  }

  /** POST /v1/duzen {gelen?, borcCevap?, borcEnCok?, istekNo}: yalnız sonradan açılan tekliflere uygulanır. */
  async duzen(hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
    if (!nesneMi(govde)) return hata("gecersiz_istek");
    return this.#tekrarGuvenli(hesapId, govde, (kar) => {
      const r = duzenGuncelle(kar, govde);
      return r.ok ? basarili({ duzen: duzenGorunumu(kar) }) : r;
    });
  }

  /** POST /v1/yalanla {soylenti, istekNo}: kendi hakkındaki söylentiyi bir kez yalanlar (takat 1). */
  async yalanla(hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
    if (!nesneMi(govde)) return hata("gecersiz_istek");
    const dil = dilCoz(govde.dil);
    return this.#tekrarGuvenli(hesapId, govde, (kar, _s, _ay, ek) => {
      if (kar.tk < YALANLAMA_TAKAT) return hata("takat_yok");
      const r = yalanla(this.kasaba, kar, govde.soylenti);
      if (!r.ok) return r;
      kar.tk -= YALANLAMA_TAKAT;
      ek.toplum = true;
      return basarili({ soylentiler: soylentiGorunumu(this.kasaba, kar, dil) });
    });
  }

  /** POST /v1/ucgen {tur, ..., istekNo}: üçgen eylemleri (ucgen.ts); ilgili oyuncular önce yüklenir. */
  async ucgen(hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
    if (!nesneMi(govde)) return hata("gecersiz_istek");
    await this.#yukle(ucgenYuklenecek(this.kasaba, govde));
    return this.#tekrarGuvenli(hesapId, govde, (kar, s, ay, ek) => {
      const r = ucgenIslem(this.kasaba, kar, ek.ili, s, govde, ay);
      if (!r.ok) return r;
      ek.olaylar.push(...r.deger.olaylar);
      ek.digerleri.push(...r.deger.digerleri);
      this.#kirli.add(UCGEN);
      return basarili(r.deger.yanit);
    });
  }

  /** GET /v1/ucgen?npc=&hedef=&dil=: üçgen görünümü ve önizleme (§13.9 görünürlüğüyle). */
  async ucgenOku(hesapId: string, npc: unknown, hedef: unknown, dilHam: unknown): Promise<Sonuc<unknown>> {
    const r = await this.#oyuncu(hesapId);
    if (!r.ok) return r;
    const { kar, ili } = r.deger;
    await this.#yukle(ucgenOkumaYuklenecek(this.kasaba, kar.o, hedef));
    return basarili(ucgenGorunumu(this.kasaba, kar, ili, { npc, hedef }, dilCoz(dilHam)));
  }

  /** POST /v1/vitrin {goster: armaganId[], istekNo}: sahibi vitrinde gösterilecek armağanları seçer. */
  async vitrin(hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
    if (!nesneMi(govde)) return hata("gecersiz_istek");
    return this.#tekrarGuvenli(hesapId, govde, (kar) => {
      const r = vitrinSec(kar, govde.goster);
      return r.ok ? basarili({ vitrin: vitrinGorunumu(kar) }) : r;
    });
  }

  // --- Hanedan (Faz 7): kurallar hanedan.ts, evlilik.ts, yaslilik.ts, vasiyet.ts, devir.ts, kronik.ts ---

  async #kronikSayfa(p: number): Promise<KronikSatiri[]> {
    let s = this.#kronikler.get(p);
    if (!s) {
      s = (await this.#depo.al<KronikSatiri[]>(KRONIK + p)) ?? [];
      this.#kronikler.set(p, s);
    }
    return s;
  }

  /** Kuyruktaki kronik satırlarına sıra verip sayfalara yazar. */
  async #kronikBosalt(): Promise<void> {
    const kq = this.kasaba.kq;
    if (!kq?.length) return;
    for (const satir of kq.splice(0)) {
      const s = (this.#meta.kr ?? 0) + 1;
      this.#meta.kr = s;
      const p = Math.floor((s - 1) / KRONIK_SAYFA);
      (await this.#kronikSayfa(p)).push({ ...satir, s });
      this.#kirli.add(KRONIK + p);
    }
  }

  #hepsiKirli(): void {
    this.#kirli.add(NPC).add(SAKIN);
    for (const o of this.kasaba.kar.keys()) this.#kirli.add(KAR + o).add(ILI + o);
  }

  /** GET /v1/hanedan: hanedan, eş, çocuklar, akrabalar, vâris adayları, vasiyet, yaşlılık, tereke, kurallar. */
  async hanedan(hesapId: string, dilHam: unknown): Promise<Sonuc<unknown>> {
    const r = await this.#oyuncu(hesapId);
    if (!r.ok) return r;
    return basarili(hanedanGorunumu(this.kasaba, r.deger.kar, this.kasaba.ay, dilCoz(dilHam)));
  }

  /** POST /v1/vasiyet {vasiyet: {varis?, paylar?} | null, istekNo}. */
  async vasiyet(hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
    if (!nesneMi(govde)) return hata("gecersiz_istek");
    return this.#tekrarGuvenli(hesapId, govde, (kar) => {
      const v = vasiyetDogrula(this.kasaba, kar, govde.vasiyet);
      if (!v.ok) return v;
      const hd = hanedanKaydi(this.kasaba, kar);
      if (v.deger) hd.vs = v.deger;
      else delete hd.vs;
      return basarili({ vasiyet: hd.vs ?? null });
    });
  }

  /** GET /v1/devir/onizle?varis=: sunucunun devir planı ve karması. Canlıyken "bu ay ölse" varsayımıdır. */
  async devirOnizle(hesapId: string, varisHam: unknown, dilHam: unknown): Promise<Sonuc<unknown>> {
    const r = await this.#oyuncu(hesapId);
    if (!r.ok) return r;
    const k = this.kasaba;
    await this.#yukle(k.sakin.map((s) => s.o));
    const p = devirHesapla(k, r.deger.kar.o, varisHam ?? undefined, k.ay);
    if (!p.ok) return p;
    return basarili({ plan: p.deger, pk: planKarmasi(p.deger), varsayim: !olduMu(r.deger.kar), kronik: kronikYaz({ a: k.ay, ...p.deger.kronik }, dilCoz(dilHam)) });
  }

  /** POST /v1/devir {varis?, pk, istekNo}: önizlenen plan aynen uygulanır; pk tutmazsa devir_degisti (409). */
  async devir(hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
    if (!nesneMi(govde)) return hata("gecersiz_istek");
    const no = istekNoCoz(govde);
    if (!no.ok) return no;
    const r = await this.#oyuncu(hesapId);
    if (!r.ok) return r;
    const { kar } = r.deger;
    const onceki = kar.ist.find((x) => x[0] === no.deger);
    if (onceki) return basarili(onceki[1]);
    if (!olduMu(kar)) return hata("devir_yok");
    const k = this.kasaba;
    await this.#yukle(k.sakin.map((s) => s.o));
    const plan = devirHesapla(k, kar.o, govde.varis, k.ay);
    if (!plan.ok) return plan;
    if (typeof govde.pk !== "string" || govde.pk !== planKarmasi(plan.deger)) return hata("devir_degisti");
    const u = devirUygula(k, plan.deger, k.ay);
    if (!u.ok) return u;
    const dil = dilCoz(govde.dil);
    const olay = olayYaz(await this.#olayEkle(u.deger.olay, k.ay), dil);
    const varis = u.deger.kar;
    const yanit = structuredClone({ id: varis.o, pk: govde.pk, plan: plan.deger, olay, para: varis.pa, hanedan: hanedanOzeti(varis, k.ay) });
    // Aynı istekNo, hesap artık vârise baksa da aynı yanıtı döndürür.
    for (const x of [kar, varis]) x.ist.push([no.deger, yanit]);
    this.#hepsiKirli();
    await this.kaydet();
    return basarili(yanit);
  }

  /** POST /v1/evlilik {hedef, istekNo}: NPC ile evlilik (oyuncu–oyuncu Faz 3 görücü teklifiyle). */
  async evlilik(hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
    if (!nesneMi(govde)) return hata("gecersiz_istek");
    return this.#tekrarGuvenli(hesapId, govde, (kar, _s, ay, ek) => {
      const r = npcEvlilikTeklifi(this.kasaba, kar, ek.ili, govde.hedef, ay);
      if (!r.ok) return r;
      ek.olay = r.deger.olay;
      this.#kirli.add(NPC);
      return basarili(r.deger.sonuc);
    }, "hanedan");
  }

  /** GET /v1/barinma ve GET /v1/donus (Faz 14; barınma şimdiye getirilir ve yazılır). */
  async barinmaOku(islem: "barinma" | "donus", hesapId: string, simdi: number): Promise<Sonuc<unknown>> {
    const r = await this.#oyuncu(hesapId);
    if (!r.ok) return r;
    const kar = r.deger.kar;
    const deger = islem === "barinma" ? { barinma: barinmaGorunumu(this.kasaba, kar, simdi) } : { donusEkrani: donusOku(this.kasaba, kar, simdi) };
    this.#kirli.add(KAR + kar.o);
    await this.kaydet();
    return basarili(deger);
  }

  /** POST /v1/barinma/kira | tesis | otomatik (istekNo ile tekrar güvenli; kira NPC hancıya, akçe dünyadan çıkar). */
  async barinmaIslem(islem: "barinmaKira" | "barinmaTesis" | "barinmaOtomatik", hesapId: string, govde: unknown, simdi: number, vergiOrani = 0): Promise<Sonuc<unknown>> {
    const k = this.kasaba;
    return this.#tekrarGuvenli(hesapId, govde, (kar) =>
      islem === "barinmaKira" ? (this.#kirli.add(MULK), mulkluKira(k, kar, govde, simdi, vergiOrani)) : islem === "barinmaTesis" ? tesisKonakla(k, kar, simdi) : otomatikAyarla(k, kar, govde, simdi),
    );
  }

  // ── Mülk (Faz 12–13): src/mulk/yerlesim-mulk.ts kullanır; mülk defteri karakterle aynı yazımda kaydolur. ──

  async mulkOyuncu(hesapId: string): Promise<Sonuc<{ kar: Karakter }>> {
    const r = await this.#oyuncu(hesapId);
    return r.ok ? basarili({ kar: r.deger.kar }) : r;
  }

  /** istekNo'lu yerel adım (cüzdan, tapu, çıkış kutusu). `yukle`: etkilenen diğer karakterler. */
  async mulkAdimi(hesapId: string, govde: unknown, yukle: string[], isle: (kar: Karakter) => Sonuc<Record<string, unknown>>): Promise<Sonuc<unknown>> {
    if (yukle.length) await this.#yukle(yukle);
    this.#kirli.add(MULK);
    return this.#tekrarGuvenli(hesapId, govde, (kar, _s, _ay, ek) => {
      const r = isle(kar);
      if (r.ok) for (const o of yukle) if (o !== kar.o) ek.digerleri.push(o);
      return r;
    });
  }

  /** İstekNo'suz iç adım (gelen transfer, uzlaştırma kapanışı, telafi): yükler, uygular, kaydeder. */
  async mulkIslem<T>(yukle: string[], isle: () => T): Promise<T> {
    if (yukle.length) await this.#yukle(yukle);
    const r = isle();
    this.#kirli.add(MULK);
    for (const o of yukle) if (this.kasaba.kar.has(o)) this.#kirli.add(KAR + o);
    await this.kaydet();
    return r;
  }

  /** GET /v1/kronik?imlec=: imleçten sonraki kronik satırları (budanmaz; 49. sayfadan sonra da okunur). */
  async kronik(hesapId: string, imlecHam: unknown, dilHam: unknown): Promise<Sonuc<unknown>> {
    let imlec = 0;
    if (imlecHam !== undefined && imlecHam !== null && imlecHam !== "") {
      if (typeof imlecHam !== "string" || !/^[0-9]{1,12}$/.test(imlecHam)) return hata("imlec_gecersiz");
      imlec = Number(imlecHam);
    }
    const r = await this.#oyuncu(hesapId);
    if (!r.ok) return r;
    const toplam = this.#meta.kr ?? 0;
    const satirlar: KronikSatiri[] = [];
    let s = imlec + 1;
    while (s <= toplam && satirlar.length < KRONIK_YANIT_EN_COK) {
      const p = Math.floor((s - 1) / KRONIK_SAYFA);
      for (const x of await this.#kronikSayfa(p)) {
        if ((x.s ?? 0) >= s && satirlar.length < KRONIK_YANIT_EN_COK) satirlar.push(x);
      }
      s = (p + 1) * KRONIK_SAYFA + 1;
    }
    const son = satirlar.at(-1)?.s ?? Math.min(imlec, toplam);
    const dil = dilCoz(dilHam);
    return basarili({ kronik: satirlar.map((x) => kronikYaz(x, dil)), imlec: son, dahaVar: son < toplam });
  }
}

/** Sonraki alarm: yetiştirilecek ay kaldıysa hemen (1 sn), yoksa bir sonraki dönüm (UTC 09:00 / 21:00). */
export function sonrakiAlarm(simdi: number, kalan: number): number {
  return kalan > 0 ? simdi + 1000 : sonrakiDonum(simdi);
}
