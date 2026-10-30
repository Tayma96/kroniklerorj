// Yerleşim motoru: kasabayı depodan yükler (ilk açılışta tohumdan üretir), kaçan ay dönümlerini sırayla
// yetiştirir, uç işlemlerini yürütür ve yalnız değişen anahtarları yazar. Workers'a bağlı değildir (Depo alır);
// YerlesimDO yalnız bunu çağıran ince sarmalayıcıdır.
//
// Depo anahtarları (kısa): m meta · n0..nK NPC parçaları (100'er) · s sakin dizini · o:<id> karakter ·
// g:<id> ilişki haritası · e:<sayfa> olay defteri sayfaları (64'er; son 48 sayfa tutulur).

import { DEPO_TOPLU_SINIR, type Depo } from "../depo.ts";
import { yerlesimBul } from "../dunya-veri.ts";
import type { Dil } from "../icerik/adlar.ts";
import { HAYALLER, HUYLAR, TUHAFLIKLAR } from "../icerik/kisilik.ts";
import { istekNoCoz } from "../mantik.ts";
import { oyunAyi, sonrakiDonum, takvim } from "../saat.ts";
import { basarili, hata, type SakinKaydi, type Sonuc } from "../tipler.ts";
import { harita, npcMekani } from "./cizelge.ts";
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
  TAKAT_AYLIK,
  TAKAT_TAVAN,
  adlandir,
  karakterOlustur,
  karakterYasi,
  ocakSec,
  takatTazele,
} from "./karakter.ts";
import { acikMi, ogrenmeDurumu, ogrenmeIlerle, sayacArtir } from "./ogrenme.ts";
import { dilCoz, kisiAdi, kisiCoz, meslekGorunumu, npcAdi, npcKimlik, oyuncuRef, paramYaz, yas } from "./ortak.ts";
import { tohumlu } from "./rastgele.ts";
import { GUNDEM_ADI, type Isaret, type IliskiHaritasi, type Karakter, type Kasaba, type Npc, type Olay, type OlayTaslagi, type Sakin } from "./tipler.ts";
import { kasabaKur } from "./uret.ts";

const META = "m";
const NPC = "n";
const SAKIN = "s";
const KAR = "o:";
const ILI = "g:";
const SAYFA = "e:";

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
export const TANIDIK_EN_COK = 200;
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

export class YerlesimMotoru {
  readonly kasaba: Kasaba;
  readonly #depo: Depo;
  readonly #meta: Meta;
  readonly #sayfalar = new Map<number, Olay[]>();
  readonly #kirli = new Set<string>();
  readonly #silinecek = new Set<string>();

  private constructor(depo: Depo, meta: Meta, kasaba: Kasaba) {
    this.#depo = depo;
    this.#meta = meta;
    this.kasaba = kasaba;
  }

  /** Son olay sırası (imleç başı). */
  get imlec(): number {
    return this.#meta.sq;
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
    const kayit: Record<string, unknown> = {};
    for (const a of this.#kirli) {
      if (a === NPC) {
        const np = Math.ceil(k.npc.length / NPC_PARCA);
        for (let i = 0; i < np; i++) kayit[NPC + i] = k.npc.slice(i * NPC_PARCA, (i + 1) * NPC_PARCA);
        for (let i = np; i < m.np; i++) this.#silinecek.add(NPC + i);
        m.np = np;
      } else if (a === SAKIN) kayit[a] = k.sakin;
      else if (a.startsWith(KAR)) kayit[a] = k.kar.get(a.slice(KAR.length));
      else if (a.startsWith(ILI)) kayit[a] = k.ili.get(a.slice(ILI.length));
      else if (a.startsWith(SAYFA)) kayit[a] = this.#sayfalar.get(Number(a.slice(SAYFA.length)));
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
    const hedef = oyunAyi(simdi);
    if (k.ay >= hedef) return { islenen: 0, kalan: 0 };
    await this.#yukle(k.sakin.map((s) => s.o));
    let islenen = 0;
    while (k.ay < hedef && islenen < azami) {
      const ay = k.ay + 1;
      for (const t of ayDonumu(k, ay)) await this.#olayEkle(t, ay);
      islenen++;
    }
    this.#kirli.add(NPC);
    for (const s of k.sakin) this.#kirli.add(KAR + s.o).add(ILI + s.o);
    await this.kaydet();
    return { islenen, kalan: hedef - k.ay };
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
    const o = `o${this.#meta.no++}`;
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
      takat: { kalan: kar.tk, tavan: TAKAT_TAVAN, aylik: TAKAT_AYLIK },
      para: kar.pa,
      hane: k.npc
        .filter((n) => n.e === kar.e)
        .map((n) => ({ id: npcKimlik(n.i), ad: npcAdi(n, dil), rol: akrabalik(k, n, kar) ?? "hane" })),
      usta: usta ? { id: npcKimlik(usta.i), ad: npcAdi(usta, dil), meslek: meslekGorunumu(usta, ay) } : null,
      mekan: kar.ma === ay ? kar.mk : null,
      karar: kar.kr || null,
      kulYemini: kar.ky === 1,
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
    const ben = this.#ben(kar, ili, dil);
    this.#kirli.add(KAR + kar.o);
    await this.kaydet();
    return basarili({
      saat: { simdi, oyunAyi: ay, ...takvim(ay), sonrakiDonum: sonrakiDonum(simdi) },
      yerlesim: { id: k.y, ad: y?.ad ?? k.y, tur: k.tur, beylik: y?.beylik ?? "", npc: k.npc.length, oyuncu: k.sakin.length },
      ben,
      harita: harita(k, ay, dil),
      donusKarti: kart.map((o) => olayYaz(o, dil)),
      oneriler: oneriler.slice(0, 3),
      imlec: this.#meta.sq,
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
    const sonuc = eylemYap(k, kar, ili, girdi.deger, ay, tohumlu("eylem", k.y, ay, kar.o, kar.en));
    if (!sonuc.ok) return sonuc;
    const olay = sonuc.deger.olay ? olayYaz(await this.#olayEkle(sonuc.deger.olay, ay), dil) : undefined;
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

  /** POST /v1/tanidik {hedef, isaret: "tanidik" | "dost" | "dusman" | null}. null işareti listeden çıkarır. */
  async tanidik(hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
    if (!nesneMi(govde)) return hata("gecersiz_istek");
    const r = await this.#oyuncu(hesapId);
    if (!r.ok) return r;
    const { kar, ili } = r.deger;
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
}

/** Sonraki alarm: yetiştirilecek ay kaldıysa hemen (1 sn), yoksa bir sonraki dönüm (UTC 09:00 / 21:00). */
export function sonrakiAlarm(simdi: number, kalan: number): number {
  return kalan > 0 ? simdi + 1000 : sonrakiDonum(simdi);
}
