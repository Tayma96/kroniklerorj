// Göç (D1, ONLINE_DURUM §4.5) — HesapDO tarafı: önizleme ve üç adımlı işin yürütülmesi. İş kalıcı kuyrukta
// (`goc:is`) tutulur; adım arası kesintide (istisna ya da 5xx) iş olduğu yerde kalır ve sonraki istekte yeniden
// denenir. Her adım işlem kimliğiyle (`goc:<istekNo>`) tekrar güvenlidir: eski yerleşim aynı paketi döner, yeni
// yerleşim ikinci karakter açmaz, dünya kaydı bir kez taşınır. Profil işaretçisi yalnız (2) başarılı olunca değişir.
// (2) kalıcı reddedilirse (ör. hedef doldu) dünya kaydı geri alınır ve eski yerleşimde mühür açılıp paket geri yazılır.

import type { Depo } from "./depo.ts";
import { yerlesimBul } from "./dunya-veri.ts";
import { istekNoCoz, profilGetir, PROFIL_ANAHTARI } from "./mantik.ts";
import { basarili, hata, HATA_DURUMU, type DunyaIleti, type DunyaOzeti, type HataKodu, type Profil, type Sonuc, type YerlesimIleti } from "./tipler.ts";
import { GOC_KAPI_SIRASI, gocHedefi, ilkEngel, type GocKapisi, type GocPaketi } from "./yerlesim/goc.ts";

export const GOC_IS = "goc:is";
export const GOC_ISTEK = "goc:istek:"; // + istekNo → Sonuc (bitmiş işin sonucu)
/** Son göçün kaynağı (emanet geri alma eski yerleşimi bununla bulur). */
export const GOC_SON = "goc:son";
/** Emanet çekişi işi (kalıcı kuyruk) ve bitmiş çekişlerin sonucu. */
export const EMANET_IS = "goc:emanetIs";
export const EMANET_ISTEK = "goc:emanetIstek:"; // + istekNo → Sonuc
/** [PARAMETRE] Bir istekte kuyrukta en çok ilerlenen adım (döngü koruması). */
export const GOC_ADIM_EN_COK = 8;
/** Açık sayılan darbe aşamaları (taraf olan göç edemez). */
export const ACIK_DARBE_ASAMALARI: readonly string[] = ["hazirlik", "ilan", "catışma", "ateskes"];

/** Önizlemede gösterilen taşınan ve kalan şeyler (istemci metni `onl.goc.tasinan.<x>` / `onl.goc.kalan.<x>`). */
export const GOC_TASINANLAR = ["akce", "envanter", "ozellik", "beceri", "nam", "meslek", "beceriAgaci", "teveccuh", "kulYemini", "hal", "ogrenme", "unvan", "defter"] as const;
export const GOC_KALANLAR = ["npcGorusleri", "tanidiklar", "hane", "emanet", "usta"] as const;

export type GocAdimi = "cikis" | "giris" | "tamam" | "geriAl" | "iptal";

export interface GocIsi {
  islem: string;
  istekNo: string;
  eski: string;
  hedef: string;
  adim: GocAdimi;
  paket?: GocPaketi;
  /** Dünya kaydı hedefe taşındı. */
  kayit?: true;
  yeniId?: string;
  /** İptal nedeni (kalıcı ret kodu). */
  neden?: HataKodu;
  an: number;
}

export interface GocBaglami {
  depo: Depo;
  hesapId: string;
  simdi: number;
  /** Doğrudan yerleşim çağrısı (iletideki `yerlesim`e gider; profil işaretçisine bakmaz). */
  yerlesim: (i: YerlesimIleti) => Promise<Sonuc<unknown>>;
  dunya: (i: DunyaIleti) => Promise<Sonuc<unknown>>;
  /** Makam ve açık darbe taraflığı (BolgeDO görünümünden). Yoksa (siyaset bağlı değil) ikisi de geçti sayılır. */
  siyaset?: () => Promise<Sonuc<{ makam: boolean; darbe: boolean }>>;
}

export type SurdurSonucu = { durum: "yok" } | { durum: "bekliyor" } | { durum: "bitti"; sonuc: Sonuc<unknown> };

const GECICI = Symbol("gecici");

/** Çağrı: istisna ya da 5xx geçicidir (iş kuyrukta kalır), diğer ret kalıcıdır. */
async function dene<T>(f: () => Promise<Sonuc<T>>): Promise<Sonuc<T> | typeof GECICI> {
  try {
    const r = await f();
    if (!r.ok && (HATA_DURUMU[r.hata] ?? 500) >= 500) return GECICI;
    return r;
  } catch {
    return GECICI;
  }
}

/** BolgeDO görünümünden göç kapıları: makam (koltuk, vekillik, adaylık) ve açık darbede taraf olmak. */
export function gocSiyasetKapilari(gorunum: unknown): { makam: boolean; darbe: boolean } {
  const g = (gorunum ?? {}) as {
    benim?: { makamlar?: string[]; vekillikler?: string[]; adayliklar?: string[] } | null;
    bolge?: { darbe?: { durum?: string; benimTaraf?: string | null; benimDestek?: boolean; benimGanimet?: boolean } | null };
  };
  const b = g.benim;
  const makam = !!b && (b.makamlar?.length ?? 0) + (b.vekillikler?.length ?? 0) + (b.adayliklar?.length ?? 0) > 0;
  const d = g.bolge?.darbe;
  // Açık darbede taraf olmak ya da sonuçlanmış darbenin ganimet adımı henüz işlenmemiş olmak göçü bekletir.
  const darbe = !!d && ((ACIK_DARBE_ASAMALARI.includes(d.durum ?? "") && (!!d.benimTaraf || d.benimDestek === true)) || d.benimGanimet === true);
  return { makam, darbe };
}

const yerlesimVar = (id: string) => yerlesimBul(id) !== undefined;

/** HesapDO'nun kapıları: makam, darbe, hedefin doluluğu (dünya kaydı). true = geçti. */
async function hesapKapilari(b: GocBaglami, hedef: string): Promise<Sonuc<{ kapilar: Partial<Record<GocKapisi, boolean>>; doluluk: { nufus: number; evKapasite: number } }>> {
  const s = b.siyaset ? await b.siyaset() : basarili({ makam: false, darbe: false });
  if (!s.ok) return s;
  const oz = await b.dunya({ islem: "ozet" });
  if (!oz.ok) return oz;
  const y = (oz.deger as DunyaOzeti).beylikler.flatMap((x) => x.yerlesimler).find((x) => x.id === hedef);
  if (!y) return hata("yerlesim_gecersiz");
  return basarili({
    kapilar: { makam: !s.deger.makam, darbe: !s.deger.darbe, dolu: y.nufus < y.evKapasite },
    doluluk: { nufus: y.nufus, evKapasite: y.evKapasite },
  });
}

/** GET /v1/goc?hedef=: kapılar (sırasıyla), bedel, taşınacaklar, emanete kalacaklar, döküm. Yazmaz. */
export async function gocOnizle(b: GocBaglami, hedefHam: unknown): Promise<Sonuc<Record<string, unknown>>> {
  const profil = await profilGetir(b.depo);
  if (!profil.ok) return profil;
  const h = gocHedefi(profil.deger.yerlesim, hedefHam, yerlesimVar);
  if (!h.ok) return hata(h.hata);
  const yerel = await b.yerlesim({ islem: "gocOnizle", yerlesim: profil.deger.yerlesim, hesapId: b.hesapId, hedef: h.hedef });
  if (!yerel.ok) return yerel;
  const ek = await hesapKapilari(b, h.hedef);
  if (!ek.ok) return ek;
  const d = yerel.deger as Record<string, unknown> & { kapilar: Partial<Record<GocKapisi, boolean>> };
  const kapilar = { ...d.kapilar, ...ek.deger.kapilar };
  const engel = ilkEngel(kapilar);
  return basarili({
    ...d,
    kapilar,
    kapiSirasi: GOC_KAPI_SIRASI,
    uygun: engel === undefined,
    engel: engel ?? null,
    doluluk: ek.deger.doluluk,
    tasinanlar: GOC_TASINANLAR,
    kalanlar: GOC_KALANLAR,
  });
}

/**
 * POST /v1/goc {hedef, istekNo}. Bitmiş iş aynı istekNo ile aynı sonucu döner. Kapı reddi önbelleğe girmez.
 * İş bir adımda geçici hatayla durursa `goc_suruyor` döner; sonraki istek (herhangi bir uç) işi sürdürür.
 */
export async function gocBaslat(b: GocBaglami, govde: unknown): Promise<Sonuc<unknown>> {
  const no = istekNoCoz(govde);
  if (!no.ok) return no;
  const onceki = await b.depo.al<Sonuc<unknown>>(GOC_ISTEK + no.deger);
  if (onceki) return onceki;
  const bekleyen = await b.depo.al<GocIsi>(GOC_IS);
  if (bekleyen) {
    const r = await gocSurdur(b);
    if (bekleyen.istekNo === no.deger) return r.durum === "bitti" ? r.sonuc : hata("goc_suruyor");
    if (r.durum === "bekliyor") return hata("goc_suruyor");
  }
  const hedefHam = (govde as { hedef?: unknown }).hedef;
  const on = await gocOnizle(b, hedefHam);
  if (!on.ok) return on;
  if (on.deger.engel) return hata(on.deger.engel as HataKodu);
  const profil = await profilGetir(b.depo);
  if (!profil.ok) return profil;
  const is: GocIsi = { islem: `goc:${no.deger}`, istekNo: no.deger, eski: profil.deger.yerlesim, hedef: on.deger.hedef as string, adim: "cikis", an: b.simdi };
  await b.depo.koy({ [GOC_IS]: is });
  const r = await gocSurdur(b);
  return r.durum === "bitti" ? r.sonuc : hata("goc_suruyor");
}

/** Kuyruktaki işi kaldığı adımdan sürdürür. Geçici hatada durur (iş kalır); kalıcı sonuçta işi kapatır. */
export async function gocSurdur(b: GocBaglami): Promise<SurdurSonucu> {
  for (let tur = 0; tur < GOC_ADIM_EN_COK; tur++) {
    const is = await b.depo.al<GocIsi>(GOC_IS);
    if (!is) return { durum: "yok" };
    const govde = { islem: is.islem };
    switch (is.adim) {
      case "cikis": {
        const r = await dene(() => b.yerlesim({ islem: "gocCikis", yerlesim: is.eski, hesapId: b.hesapId, govde: { ...govde, hedef: is.hedef } }));
        if (r === GECICI) return { durum: "bekliyor" };
        if (!r.ok) {
          // Yetkili kapı reddi (önizlemeden sonra değişen durum): iş kapanır, hiçbir şey taşınmadı.
          await b.depo.sil([GOC_IS]);
          return { durum: "bitti", sonuc: r };
        }
        is.paket = (r.deger as { paket: GocPaketi }).paket;
        is.adim = "giris";
        await b.depo.koy({ [GOC_IS]: is });
        break;
      }
      case "giris": {
        if (!is.kayit) {
          const d = await dene(() => b.dunya({ islem: "gocKayit", hesapId: b.hesapId, kaynak: is.eski, hedef: is.hedef }));
          if (d === GECICI) return { durum: "bekliyor" };
          if (!d.ok) {
            is.adim = "iptal";
            is.neden = d.hata;
            await b.depo.koy({ [GOC_IS]: is });
            break;
          }
          is.kayit = true;
          await b.depo.koy({ [GOC_IS]: is });
        }
        const r = await dene(() => b.yerlesim({ islem: "gocGiris", yerlesim: is.hedef, hesapId: b.hesapId, govde: { ...govde, paket: is.paket } }));
        if (r === GECICI) return { durum: "bekliyor" };
        if (!r.ok) {
          is.adim = "geriAl";
          is.neden = r.hata;
          await b.depo.koy({ [GOC_IS]: is });
          break;
        }
        const profil = await profilGetir(b.depo);
        if (!profil.ok) return { durum: "bekliyor" };
        const y = yerlesimBul(is.hedef)!;
        const yeni: Profil = { ...profil.deger, yerlesim: y.id, beylik: y.beylik };
        is.adim = "tamam";
        is.yeniId = (r.deger as { id: string }).id;
        // Profil işaretçisi ve kuyruk aynı yazımda: işaretçi yalnız (2) başarılıysa değişir.
        await b.depo.koy({ [PROFIL_ANAHTARI]: yeni, [GOC_IS]: is });
        break;
      }
      case "tamam": {
        const r = await dene(() => b.yerlesim({ islem: "gocTamam", yerlesim: is.eski, hesapId: b.hesapId, govde }));
        if (r === GECICI) return { durum: "bekliyor" };
        // (3) kalıcı reddi (beklenmez) işi geri almaz: karakter ve akçe zaten yeni yerleşimde.
        const p = is.paket!;
        const profil = await profilGetir(b.depo);
        const sonuc = basarili({
          goc: {
            kaynak: is.eski,
            hedef: is.hedef,
            id: is.yeniId ?? null,
            yolBedeli: p.yolBedeli,
            akce: p.kar.pa,
            tasinan: p.kar.ev ?? {},
            emanet: p.emanet,
          },
          ...(profil.ok ? { profil: profil.deger } : {}),
        });
        await b.depo.koy({ [GOC_ISTEK + is.istekNo]: sonuc, [GOC_SON]: is.eski });
        await b.depo.sil([GOC_IS]);
        return { durum: "bitti", sonuc };
      }
      case "geriAl": {
        if (is.kayit) {
          const d = await dene(() => b.dunya({ islem: "gocKayit", hesapId: b.hesapId, kaynak: is.hedef, hedef: is.eski, geri: true }));
          if (d === GECICI) return { durum: "bekliyor" };
          delete is.kayit;
        }
        is.adim = "iptal";
        await b.depo.koy({ [GOC_IS]: is });
        break;
      }
      case "iptal": {
        const r = await dene(() => b.yerlesim({ islem: "gocIptal", yerlesim: is.eski, hesapId: b.hesapId, govde }));
        if (r === GECICI) return { durum: "bekliyor" };
        const sonuc = hata(is.neden ?? "sunucu_hatasi");
        await b.depo.koy({ [GOC_ISTEK + is.istekNo]: sonuc });
        await b.depo.sil([GOC_IS]);
        return { durum: "bitti", sonuc };
      }
    }
  }
  return { durum: "bekliyor" };
}

// ---------------------------------------------------------------- emanet geri alma

export interface EmanetIsi {
  islem: string;
  istekNo: string;
  eski: string;
  yeni: string;
  adim: "cikis" | "giris" | "tamam" | "iptal";
  paket?: unknown;
  neden?: HataKodu;
}

async function emanetYeri(b: GocBaglami): Promise<Sonuc<{ eski: string; yeni: string }>> {
  const profil = await profilGetir(b.depo);
  if (!profil.ok) return profil;
  const eski = await b.depo.al<string>(GOC_SON);
  if (!eski || eski === profil.deger.yerlesim) return hata("emanet_yok");
  return basarili({ eski, yeni: profil.deger.yerlesim });
}

/** GET /v1/goc/emanet: eski yerleşimdeki emanet, bu çekişte taşınacak ve kalacak, bedel. Yazmaz. */
export async function emanetOnizle(b: GocBaglami): Promise<Sonuc<unknown>> {
  const yer = await emanetYeri(b);
  if (!yer.ok) return yer;
  return b.yerlesim({ islem: "emanetOnizle", yerlesim: yer.deger.eski, hesapId: b.hesapId });
}

/**
 * POST /v1/goc/emanet {istekNo}: emanetin en çok GOC_TASIMA_EN_COK adedi taşıma bedeliyle yeni karaktere çekilir.
 * İş kalıcı kuyrukta (`goc:emanetIs`); geçici hatada `goc_suruyor` döner, sonraki emanet isteği sürdürür.
 */
export async function emanetCek(b: GocBaglami, govde: unknown): Promise<Sonuc<unknown>> {
  const no = istekNoCoz(govde);
  if (!no.ok) return no;
  const onceki = await b.depo.al<Sonuc<unknown>>(EMANET_ISTEK + no.deger);
  if (onceki) return onceki;
  const bekleyen = await b.depo.al<EmanetIsi>(EMANET_IS);
  if (bekleyen) {
    const r = await emanetSurdur(b);
    if (bekleyen.istekNo === no.deger) return r.durum === "bitti" ? r.sonuc : hata("goc_suruyor");
    if (r.durum === "bekliyor") return hata("goc_suruyor");
  }
  const yer = await emanetYeri(b);
  if (!yer.ok) return yer;
  const is: EmanetIsi = { islem: `emanet:${no.deger}`, istekNo: no.deger, eski: yer.deger.eski, yeni: yer.deger.yeni, adim: "cikis" };
  await b.depo.koy({ [EMANET_IS]: is });
  const r = await emanetSurdur(b);
  return r.durum === "bitti" ? r.sonuc : hata("goc_suruyor");
}

export async function emanetSurdur(b: GocBaglami): Promise<SurdurSonucu> {
  for (let tur = 0; tur < GOC_ADIM_EN_COK; tur++) {
    const is = await b.depo.al<EmanetIsi>(EMANET_IS);
    if (!is) return { durum: "yok" };
    const govde = { islem: is.islem };
    const bitir = async (sonuc: Sonuc<unknown>): Promise<SurdurSonucu> => {
      await b.depo.koy({ [EMANET_ISTEK + is.istekNo]: sonuc });
      await b.depo.sil([EMANET_IS]);
      return { durum: "bitti", sonuc };
    };
    if (is.adim === "cikis") {
      const r = await dene(() => b.yerlesim({ islem: "emanetCikis", yerlesim: is.eski, hesapId: b.hesapId, govde }));
      if (r === GECICI) return { durum: "bekliyor" };
      if (!r.ok) {
        // Kalıcı ret (ör. emanet yok): hiçbir şey taşınmadı; sonuç önbelleğe girmez (yeniden denenebilir).
        await b.depo.sil([EMANET_IS]);
        return { durum: "bitti", sonuc: r };
      }
      is.paket = (r.deger as { paket: unknown }).paket;
      is.adim = "giris";
      await b.depo.koy({ [EMANET_IS]: is });
    } else if (is.adim === "giris") {
      const r = await dene(() => b.yerlesim({ islem: "emanetGiris", yerlesim: is.yeni, hesapId: b.hesapId, govde: { ...govde, paket: is.paket } }));
      if (r === GECICI) return { durum: "bekliyor" };
      if (!r.ok) {
        is.adim = "iptal";
        is.neden = r.hata;
      } else {
        is.adim = "tamam";
        is.paket = { sonuc: r.deger, paket: is.paket };
      }
      await b.depo.koy({ [EMANET_IS]: is });
    } else if (is.adim === "tamam") {
      const r = await dene(() => b.yerlesim({ islem: "emanetTamam", yerlesim: is.eski, hesapId: b.hesapId, govde }));
      if (r === GECICI) return { durum: "bekliyor" };
      const { sonuc } = is.paket as { sonuc: Record<string, unknown> };
      return bitir(basarili({ emanet: { kaynak: is.eski, ...sonuc } }));
    } else {
      const r = await dene(() => b.yerlesim({ islem: "emanetIptal", yerlesim: is.eski, hesapId: b.hesapId, govde }));
      if (r === GECICI) return { durum: "bekliyor" };
      return bitir(hata(is.neden ?? "sunucu_hatasi"));
    }
  }
  return { durum: "bekliyor" };
}
