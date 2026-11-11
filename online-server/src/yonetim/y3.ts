// Y3 Debdebe yönetimi (ana tasarım §7.1–7.3): satın alma defteri (mağaza işlem kimliği → hesap; bütün hesaplarda bir
// kez varlık verir) ve Kurucu'nun Debdebe iadesi. İade gerekçe ister, işlem kaydına yalnız eklenir, istekNo ile tekrar
// güvenlidir; yönetici kendi oyuncu hesabının satın alımını iade edemez (kendine fayda yasağı). İade varlığı
// HesapDO'da geri alır; defter "iade" olur ve aynı makbuz bir daha varlık vermez.
// TODO(Y3): mağaza iade bildirimleri (Google RTDN, App Store Server Notifications V2) bu deftere `iade` yazacak uç.

import { istekNoCoz } from "../mantik.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { hane, kayitHazirla, reddet, tekrar, yaz, yetkiIste, type Ek, type Oturum, type YonetimBaglami } from "./islem.ts";
import { gerekceCoz, hesapIdCoz } from "./yaptirim.ts";

/** [PARAMETRE] Sayfa boyu ve hesap başına dizinde tutulan işlem sayısı. */
export const DEBDEBE_SAYFASI = 50;
export const DEBDEBE_HESAP_EN_COK = 200;

const DEFTER = "debdebe:"; // + işlem kimliği (magaza:kimlik) → DebdebeDefterKaydi
const SIRA = "debdebeNo:"; // + 12 hane → işlem kimliği
const HESAP = "debdebeHesap:"; // + hesap → işlem kimlikleri
const SAYAC = "sayac:debdebe";

export interface DebdebeDefterKaydi {
  no: number;
  islem: string;
  magaza: string;
  urun: string;
  hesap: string;
  zaman: number;
  durum: "verildi" | "iade";
  test?: boolean;
  iade?: { kim: string; zaman: number; gerekce: string };
}

/** HesapDO'dan: işlem kimliğini bu hesaba sahiplendirir. Başka hesaba aitse ya da iade edildiyse reddedilir. */
export async function debdebeKayit(b: YonetimBaglami, k: unknown): Promise<Sonuc<{ no: number; yeni: boolean }>> {
  if (typeof k !== "object" || k === null) return hata("gecersiz_istek");
  const g = k as Record<string, unknown>;
  if (typeof g.islem !== "string" || g.islem.length > 200 || typeof g.hesap !== "string" || typeof g.urun !== "string" || typeof g.magaza !== "string") return hata("gecersiz_istek");
  const var_ = await b.depo.al<DebdebeDefterKaydi>(DEFTER + g.islem);
  if (var_) {
    if (var_.hesap !== g.hesap) return hata("makbuz_kullanilmis");
    if (var_.durum === "iade") return hata("makbuz_iade");
    return basarili({ no: var_.no, yeni: false });
  }
  const no = ((await b.depo.al<number>(SAYAC)) ?? 0) + 1;
  const kayit: DebdebeDefterKaydi = {
    no, islem: g.islem, magaza: g.magaza, urun: g.urun.slice(0, 40), hesap: g.hesap, zaman: b.simdi, durum: "verildi",
    ...(g.test === true ? { test: true } : {}),
  };
  const liste = [...((await b.depo.al<string[]>(HESAP + g.hesap)) ?? []), g.islem].slice(-DEBDEBE_HESAP_EN_COK);
  await b.depo.koy({ [SAYAC]: no, [DEFTER + g.islem]: kayit, [SIRA + hane(no)]: g.islem, [HESAP + g.hesap]: liste });
  return basarili({ no, yeni: true });
}

/** GET /yonetim/debdebe?hesap=&imlec= : satın alma defteri (yeniden eskiye). */
export async function debdebeListesi(o: Oturum, sorgu: Record<string, string | null>): Promise<Sonuc<unknown>> {
  const red = await yetkiIste(o, "debdebeGor");
  if (red) return red;
  let anahtarlar: string[];
  let imlec: number | null = null;
  const hesap = sorgu.hesap ? hesapIdCoz(sorgu.hesap) : undefined;
  if (sorgu.hesap && !hesap) return hata("hesap_yok");
  if (hesap) {
    anahtarlar = [...((await o.b.depo.al<string[]>(HESAP + hesap)) ?? [])].reverse();
  } else {
    const son = (await o.b.depo.al<number>(SAYAC)) ?? 0;
    let ust = son;
    if (sorgu.imlec) {
      const n = Number(sorgu.imlec);
      if (!Number.isInteger(n) || n < 1) return hata("imlec_gecersiz");
      ust = Math.min(n - 1, son);
    }
    const nolar: number[] = [];
    for (let i = ust; i >= 1 && nolar.length < DEBDEBE_SAYFASI; i--) nolar.push(i);
    const siralar = await o.b.depo.alCok<string>(nolar.map((i) => SIRA + hane(i)));
    anahtarlar = nolar.flatMap((i) => siralar.get(SIRA + hane(i)) ?? []);
    imlec = nolar.at(-1) ?? null;
  }
  const kayitlar = await o.b.depo.alCok<DebdebeDefterKaydi>(anahtarlar.map((a) => DEFTER + a));
  const liste = anahtarlar.flatMap((a) => kayitlar.get(DEFTER + a) ?? []);
  await o.b.depo.koy(await kayitHazirla(o, "debdebeGor", "tamam", hesap ? { hedef: hesap } : {}));
  return basarili({ islemler: liste, imlec, dahaVar: imlec !== null && imlec > 1 });
}

/** POST /yonetim/debdebe-iade {islem, gerekce, istekNo}: varlık HesapDO'da geri alınır, defter "iade" olur. */
export async function debdebeIade(o: Oturum, govde: unknown): Promise<Sonuc<unknown>> {
  const g = typeof govde === "object" && govde !== null ? (govde as Record<string, unknown>) : {};
  const islem = typeof g.islem === "string" && g.islem.length <= 200 ? g.islem : undefined;
  const ek0: Ek = islem ? { ayrinti: { islem } } : {};
  const red = await yetkiIste(o, "debdebeIade", ek0);
  if (red) return red;
  const no = istekNoCoz(g);
  if (!no.ok) return reddet(o, "debdebeIade", no.hata, ek0);
  if (!islem) return reddet(o, "debdebeIade", "islem_yok");
  const gerekce = gerekceCoz(g.gerekce);
  if (!gerekce.ok) return reddet(o, "debdebeIade", gerekce.hata, ek0);
  const onceki = await tekrar(o, no.deger);
  if (onceki) return onceki;
  const kayit = await o.b.depo.al<DebdebeDefterKaydi>(DEFTER + islem);
  if (!kayit) return reddet(o, "debdebeIade", "islem_yok", ek0);
  const ek: Ek = { hedef: kayit.hesap, gerekce: gerekce.deger, ayrinti: { islem, urun: kayit.urun } };
  if (kayit.hesap === o.y.hesap) return reddet(o, "debdebeIade", "kendi_hedef", ek);
  if (!o.b.hesabaIlet) return reddet(o, "debdebeIade", "yapilandirma_eksik", ek);
  // HesapDO iadesi tekrar güvenlidir: defter zaten "iade" ise yine çağrılır (yarım kalan iade tamamlanır).
  const h = await o.b.hesabaIlet(kayit.hesap, { islem: "debdebeIade", hesapId: kayit.hesap, islemKimligi: islem });
  if (!h.ok) return reddet(o, "debdebeIade", h.hata, ek);

  // Yalnız depolama: tekrar denetimi + defter + kayıt.
  const yarisan = await tekrar(o, no.deger);
  if (yarisan) return yarisan;
  const guncel = (await o.b.depo.al<DebdebeDefterKaydi>(DEFTER + islem)) ?? kayit;
  const yeni: DebdebeDefterKaydi = guncel.durum === "iade" ? guncel : { ...guncel, durum: "iade", iade: { kim: o.y.eposta, zaman: o.b.simdi, gerekce: gerekce.deger } };
  const sonuc = basarili({ islem: yeni, hesap: h.deger });
  await yaz(o, no.deger, "debdebeIade", ek, { [DEFTER + islem]: yeni }, sonuc);
  return sonuc;
}
