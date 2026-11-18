// IsletmeDO tarafı tezgâh kayıtları (tezgâh modeli Dilim 1). Yerleşim ay dönümünde raf hasılatını ve han yolcu
// payını bir "tezgah" kaydıyla gönderir: [ay, net akçe, satış yapan satır] girdileri. Dükkânın aylık muhasebesi
// (bakım, borç, faaliyet ayı, itibar, iflas) yalnız bu girdiyle işler; kepenkli ay hiç girdi doğurmaz (bakım yok,
// iflas sayacı ilerlemez, itibar düşmez, faaliyet sayılmaz). "devral" kaydı işletmeyi yeni sahibe sıfırdan kurar:
// eski sahibin kasası ve emaneti cüzdanına gider (kayıp yok), itibar ve seviye sıfırlanır.

import type { Isletme, Kisi } from "./isletme.ts";
import { bakim, defterYaz, etkinler, iflasEt, isletmeKur, kalite, maasOde } from "./isletme.ts";
import { IFLAS_BORC_AY, ITIBAR_BORC, ITIBAR_EN_COK, ITIBAR_KALITE, ITIBAR_MAAS_BOZMA, ITIBAR_MUSTERI, ITIBAR_MUSTERI_TAVAN, isletmeCoz } from "./kurallar.ts";
import { cikisAc, type CevapDurumu, type CikisKaydi } from "./transfer.ts";
import { zanaatMi } from "./atolye.ts";
import { KANCA_TAVAN } from "./tezgah-kurallar.ts";

/** [ay, net, satış yapan satır, bakım indirimi yüzdesi (kanca partisi 2; eski kayıtta yok = 0)]. */
type AyGirdisi = [ay: number, net: number, satir: number, bakimIndirim: number];

function girdileriCoz(x: CikisKaydi): AyGirdisi[] | undefined {
  const l = x.y.aylar;
  if (!Array.isArray(l) || l.length === 0 || l.length > 64) return undefined;
  const g: AyGirdisi[] = [];
  for (const e of l) {
    if (!Array.isArray(e) || (e.length !== 3 && e.length !== 4) || !e.every((v) => Number.isInteger(v) && v >= 0)) return undefined;
    if ((e[3] ?? 0) > KANCA_TAVAN.bakimIndirim) return undefined;
    g.push([e[0], e[1], e[2], e[3] ?? 0]);
  }
  if (g.reduce((t, e) => t + e[1], 0) !== x.a) return undefined;
  return g.sort((a, b) => a[0] - b[0]);
}

/** Dükkânın (ve üretimli atölye ayının) açık (kepenksiz) bir ayı: bakım + borç, faaliyet ayı, itibar (satış yapan satır + sayılan müşteri), iflas. */
function dukkanAyi(is: Isletme, ay: number, satir: number, an: number, bakimIndirim = 0): void {
  if (is.durum !== "acik") return;
  // Kanca partisi 2: bakım indirimi (yapı onarımı, bakım defteri; yerleşimin kanca hesabından, tavanlı) yuvarlanır.
  const b = bakim(is);
  const gider = b - Math.round((b * bakimIndirim) / 100) + is.borc;
  const odenen = Math.min(is.kasa, gider);
  is.kasa -= odenen;
  is.batak += odenen;
  is.borc = gider - odenen;
  if (odenen > 0) defterYaz(is, ay, "bakim", -odenen);
  is.borcAy = is.borc > 0 ? is.borcAy + 1 : 0;
  is.fa = (is.fa ?? 0) + 1;
  // "Müşteri sayısı" girdisi: NPC'ye satış yapan satır + bu ayın sayılan (bayraksız) oyuncu müşterisi, tavanlı.
  const oyuncu = is.iz.ay === ay - 1 ? is.iz.s.length : 0;
  const musteri = Math.min(ITIBAR_MUSTERI_TAVAN, (satir + oyuncu) * ITIBAR_MUSTERI);
  // Maaş yalnız satış olan ayda (kepenkli ayda sözleşme askıda).
  const bozulan = maasOde(is, ay, an);
  const fark = kalite(is).toplam * ITIBAR_KALITE + musteri - (is.borc > 0 ? ITIBAR_BORC : 0) - bozulan * ITIBAR_MAAS_BOZMA;
  is.it = Math.max(0, Math.min(ITIBAR_EN_COK, is.it + fark));
  if (is.borcAy >= IFLAS_BORC_AY) iflasEt(is, ay, an);
}

/** "tezgah" kaydını uygular (giriş defteri tekrar güvenliğini sağlar). Kapalı işletme reddeder: akçe basılmaz. */
export function tezgahKaydiUygula(is: Isletme, x: CikisKaydi, an: number): { durum: CevapDurumu; neden?: string } {
  if (is.durum !== "acik") return { durum: "red", neden: "isletme_kapali" };
  const g = girdileriCoz(x);
  if (!g) return { durum: "red", neden: "gecersiz_istek" };
  // Önce gelirler (kasa ve seviye puanına sayılan gelir), sonra ay ay muhasebe: iflas bile olsa akçe kasada kalmaz,
  // iflasta kasa sahibin cüzdanına gider.
  if (is.tur === "atolye" && zanaatMi(x.y.za)) is.za = x.y.za;
  const kalem = is.tur === "han" ? "yolcu" : x.y.neden === "toplu" ? "toplu" : "npcSatis";
  for (const [ay, net] of g) {
    if (net <= 0) continue;
    is.kasa += net;
    is.gelir += net;
    defterYaz(is, ay, kalem, net);
  }
  if (is.tur === "dukkan") for (const [ay, , satir, bi] of g) dukkanAyi(is, ay, satir, an, bi);
  // Atölye (Dilim 2): üretimli ay girdisi (satir > 0) bakım, maaş, faaliyet, itibar işletir; toplu sipariş ödülü
  // (satir 0) yalnız gelirdir. Üretimsiz ay girdi doğurmaz: kepenkli.
  if (is.tur === "atolye") for (const [ay, , satir, bi] of g) if (satir > 0) dukkanAyi(is, ay, satir, an, bi);
  return { durum: "kabul" };
}

/**
 * Devralma: tapu sürümü yeniyse işletme yeni sahiple sıfırdan kurulur (itibar, seviye, faaliyet, personel sıfır);
 * eski sahibin kasa + emaneti cüzdanına çıkış kutusundan gider. Çıkış/giriş defteri ve denetim toplamları korunur.
 */
export function devralUygula(is: Isletme | undefined, x: CikisKaydi, ay: number, an: number): Isletme | undefined {
  const c = isletmeCoz(x.y.isletme);
  const sahip = x.y.sahip as Kisi | undefined;
  const eski = x.y.eski as Kisi | undefined;
  const ts = x.y.ts;
  if (!c || !sahip || !eski || !Number.isInteger(ts)) return undefined;
  if (is && is.ts >= (ts as number)) return is;
  const yeni = isletmeKur(c.id, c.yerlesim, c.tur, c.no, sahip, ts as number, ay);
  if (!is) return yeni;
  yeni.cik = is.cik;
  yeni.gir = is.gir;
  yeni.ist = is.ist;
  yeni.kaynak = is.kaynak;
  yeni.batak = is.batak;
  yeni.as = is.as;
  if (is.durum === "acik") {
    for (const s of etkinler(is)) {
      s.d = "bitti";
      s.e = ay;
    }
    const kalan = is.kasa + is.emanet;
    // Zorunlu sistem kaydı: kutu sınırı uygulanmaz (eski sahibin akçesi yeni sahibe kalamaz).
    if (kalan > 0) cikisAc(yeni.cik, { i: `${is.id}:devral:${ts}`, t: "cuzdana", h: is.yerlesim, a: kalan, y: { isletme: is.id, o: eski.o, h: eski.h, tutar: kalan, neden: "devral", ad: is.ad } }, an, Infinity);
    defterYaz(yeni, ay, "devral", 0, `${eski.o}:${kalan}`);
  } else yeni.kasa = is.kasa;
  return yeni;
}
