// IsletmeDO iletileri ve saf işleyicisi. Bütün iletiler yerleşimin YerlesimDO'sundan gelir (bağlam güvenilirdir:
// isteyen karakter, meslek kademeleri, teveccüh kademesi, tapu özeti). Yanıt her zaman işletmenin bekleyen çıkış
// kayıtlarını (`teslim`) taşır: yerleşim uygular ve "onay" ile kapatır; onay kaybolursa DO alarmı yeniden teslim eder.

import { oyunAyi } from "../saat.ts";
import { basarili, hata, type HataKodu, type Sonuc } from "../tipler.ts";
import { karma } from "../yerlesim/rastgele.ts";
import {
  adDegis,
  ayIlerlet,
  ayarGonder,
  cek,
  devirOnizleme,
  emanetIslem,
  fiyatAyarla,
  isletmeKur,
  kapiAyarla,
  kasayaGir,
  panel,
  personel,
  sahipDegis,
  tezyinAl,
  IST_EN_COK,
  type Baglam,
  type GirisNedeni,
  type Isletme,
  type Kisi,
  type PersonelHedefi,
} from "./isletme.ts";
import { KALITE_ROLLERI, ROL_MESLEGI, type MulkTuru } from "./kurallar.ts";
import { UZLASTIRMA_TUR_EN_COK, cikisKapat, girisUygula, type CevapDurumu, type CikisKaydi } from "./transfer.ts";

export interface TapuOzeti {
  isletme: string;
  yerlesim: string;
  tur: MulkTuru;
  no: number;
  ts: number;
  sahip: Kisi;
}

export const KOMUTLAR = ["ad", "tezyin", "fiyat", "kapi", "cek", "emanet", "personel"] as const;
export type Komut = (typeof KOMUTLAR)[number];

export type IsletmeIleti =
  | { islem: "komut"; isletme: string; tapu: TapuOzeti; baglam: Baglam; alt: Komut; govde: unknown; hedef?: PersonelHedefi; istekNo: string }
  | { islem: "oku"; isletme: string; tapu: TapuOzeti; baglam: Baglam; tur: "panel" | "devir" }
  | { islem: "teslim"; isletme: string; kayitlar: CikisKaydi[] }
  | { islem: "onay"; isletme: string; sonuclar: [string, CevapDurumu][] };

export interface IsletmeYaniti {
  deger?: unknown;
  sonuclar?: [string, CevapDurumu, string?][];
  teslim: CikisKaydi[];
}

/** Tapu özeti yeniyse işletmeyi kurar (iflastan sonra yeni sahip) ya da sahibini değiştirir. Çıkış/giriş defteri korunur. */
function tapuUygula(is: Isletme | undefined, t: TapuOzeti, ay: number): Isletme {
  if (!is) return isletmeKur(t.isletme, t.yerlesim, t.tur, t.no, t.sahip, t.ts, ay);
  if (t.ts <= is.ts) return is;
  if (is.durum === "iflas") {
    const yeni = isletmeKur(t.isletme, t.yerlesim, t.tur, t.no, t.sahip, t.ts, ay);
    yeni.cik = is.cik;
    yeni.gir = is.gir;
    yeni.ist = is.ist;
    yeni.kaynak = is.kaynak;
    yeni.batak = is.batak;
    yeni.kasa = is.kasa;
    yeni.as = is.as;
    return yeni;
  }
  sahipDegis(is, t.sahip, t.ts, ay);
  return is;
}

/** Bağlamdaki sahip bilgisini (kalite meslekleri, teveccüh) tazeler. */
function sahipTazele(is: Isletme, b: Baglam): void {
  if (b.o !== is.sahip.o) return;
  const sm: Isletme["sm"] = {};
  for (const r of KALITE_ROLLERI[is.tur]) {
    const m = ROL_MESLEGI[r];
    if (m && b.mk[m] !== undefined) sm[m] = b.mk[m];
  }
  is.sm = sm;
  is.stv = b.tv;
}

/** Yerleşimin reddettiği çıkış: telafi (maaş/tazminat emanete, diğerleri kasaya geri). */
export function isletmeTelafi(is: Isletme, x: CikisKaydi): void {
  if (x.t !== "cuzdana") return;
  const neden = x.y.neden;
  if (neden === "maas" || neden === "tazminat") is.emanet += x.a;
  else is.kasa += x.a;
}

export function devirSurumu(is: Isletme): string {
  return karma(JSON.stringify(devirOnizleme(is))).toString(36);
}

/** Saf işleyici: (durum, ileti, an) → yeni durum + yanıt. `is` yerinde değişebilir. */
export function isletmeIsle(onceki: Isletme | undefined, ileti: IsletmeIleti, an: number): { is: Isletme | undefined; sonuc: Sonuc<IsletmeYaniti> } {
  const ay = oyunAyi(an);
  let is = onceki;
  if ((ileti.islem === "komut" || ileti.islem === "oku") && ileti.tapu.isletme === ileti.isletme) is = tapuUygula(is, ileti.tapu, ay);
  if (is) ayIlerlet(is, ay, an);
  let deger: unknown;
  let sonuclar: [string, CevapDurumu, string?][] | undefined;
  let hataKodu: HataKodu | undefined;
  switch (ileti.islem) {
    case "teslim": {
      sonuclar = [];
      for (const x of ileti.kayitlar) {
        if (x.t === "kur" || x.t === "sahip") {
          const t = x.y as unknown as TapuOzeti;
          is = tapuUygula(is, { isletme: ileti.isletme, yerlesim: ileti.isletme.split(".")[0]!, tur: (x.y.tur as MulkTuru) ?? is?.tur ?? "han", no: Number(x.y.no ?? is?.no ?? 1), ts: t.ts, sahip: t.sahip }, ay);
          girisUygula(is.gir, x.i, an, () => ({ durum: "kabul" }));
          sonuclar.push([x.i, "kabul"]);
        } else if (x.t === "kasaya") {
          if (!is) {
            sonuclar.push([x.i, "red", "isletme_yok"]);
            continue;
          }
          const hedef = is;
          const r = girisUygula(hedef.gir, x.i, an, () =>
            kasayaGir(hedef, { tutar: x.a, neden: x.y.neden as GirisNedeni, o: String(x.y.o), kume: x.y.kume === true, karsilikli: x.y.karsilikli === true }, ay),
          );
          sonuclar.push(r.neden ? [x.i, r.durum, r.neden] : [x.i, r.durum]);
        } else sonuclar.push([x.i, "red", "gecersiz_istek"]);
      }
      break;
    }
    case "onay": {
      if (!is) return { is, sonuc: hata("isletme_yok") };
      for (const [i, d] of ileti.sonuclar) {
        const k = cikisKapat(is.cik, i, d, an);
        if (k?.durum === "iade") isletmeTelafi(is, k.kayit);
      }
      break;
    }
    case "oku": {
      if (!is) return { is, sonuc: hata("isletme_yok") };
      sahipTazele(is, ileti.baglam);
      deger = ileti.tur === "panel" ? panel(is, ileti.baglam.o, ay, an) : { ...devirOnizleme(is), surum: devirSurumu(is) };
      break;
    }
    case "komut": {
      if (!is) return { is, sonuc: hata("isletme_yok") };
      const b = ileti.baglam;
      sahipTazele(is, b);
      const anahtar = `${b.o}:${ileti.istekNo}`;
      const kayitli = is.ist.find((x) => x[0] === anahtar);
      if (kayitli) {
        deger = kayitli[1];
        break;
      }
      const islemNo = `i:${is.id}:${b.o}:${ileti.istekNo}`;
      const g = ileti.govde;
      const r =
        ileti.alt === "ad"
          ? adDegis(is, b, g, ay)
          : ileti.alt === "tezyin"
            ? tezyinAl(is, b, g, ay)
            : ileti.alt === "fiyat"
              ? fiyatAyarla(is, b, g, ay)
              : ileti.alt === "kapi"
                ? kapiAyarla(is, b, g, ay)
                : ileti.alt === "cek"
                  ? cek(is, b, g, ay, an, islemNo)
                  : ileti.alt === "emanet"
                    ? emanetIslem(is, b, g, ay)
                    : personel(is, b, g, ileti.hedef ?? {}, ay, an, islemNo);
      if (!r.ok) {
        hataKodu = r.hata;
        break;
      }
      deger = r.deger;
      is.ist.push([anahtar, deger]);
      if (is.ist.length > IST_EN_COK) is.ist.splice(0, is.ist.length - IST_EN_COK);
      break;
    }
  }
  if (is) ayarGonder(is, an);
  if (hataKodu) return { is, sonuc: hata(hataKodu) };
  return { is, sonuc: basarili({ ...(deger !== undefined ? { deger } : {}), ...(sonuclar ? { sonuclar } : {}), teslim: is ? is.cik.k.slice(0, UZLASTIRMA_TUR_EN_COK) : [] }) };
}
