// Faz 6 ekonomi uçları (YerlesimDO → motor): oyuncu pazarı, ısmarlama, Ustalar Levhası, defter. Yazma uçları
// motorun istekNo'lu kabuğundan geçer (`ekonomiYaz`): aynı istekNo aynı yanıtı döndürür, ikinci kez etki üretmez;
// değişen öteki oyuncular, ekonomi kaydı ve defter birlikte yazılır. Kurallar pazar-tahta.ts, ismarlama.ts, levha.ts
// ve defter.ts'dedir; burada yalnız yükleme, defter kalemleri ve görünüm vardır.

import { MALLAR, malBul, type MalId } from "../icerik/mallar.ts";
import { HIZMET_TARIFLERI } from "./hizmet-tarif.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { DEFTER_AY, defterGorunumu } from "./defter.ts";
import { hizmetAcik } from "./beceri-etki.ts";
import { hizmetHazirla, hizmetIlanAc, hizmetIlanBul, hizmetIlanGeri, hizmetIlanGorunumu, hizmetIlanIsle, hizmetIlanlar, hizmetStoguGecerli, hizmetStoguGorunumu } from "./hizmet-pazari.ts";
import {
  ISMARLAMA_ADET_EN_COK,
  ISMARLAMA_MUSTERI_EN_COK,
  ISMARLAMA_SURE_EN_COK,
  ISMARLAMA_USTA_EN_COK,
  ismarla,
  ismarlamaBul,
  ismarlamaCevap,
  ismarlamaEmaneti,
  ismarlamaGorunumu,
  ismarlamaSicili,
} from "./ismarlama.ts";
import { KALITE_ADLARI, KALITE_DEGER_CARPANI } from "./kalite.ts";
import { levhaGorunumu } from "./levha.ts";
import type { YerlesimMotoru } from "./motor.ts";
import { npcFiyat } from "./npc-taban.ts";
import {
  PAZAR_ADET_EN_COK,
  PAZAR_ADIL_ALT,
  PAZAR_ADIL_UST,
  PAZAR_BAC_ORANI,
  PAZAR_ILAN_EN_COK,
  PAZAR_KUME_CARPANI,
  PAZAR_SURE_EN_COK,
  acikIlanlar,
  ekonomiAl,
  ilanAc,
  ilanBul,
  ilanGeri,
  ilanGorunumu,
  ilanIsle,
  pazarEmaneti,
} from "./pazar-tahta.ts";
import { HEDIYE_ALMA_AYLIK, HEDIYE_VERME_AYLIK } from "./teklif.ts";
import type { Karakter } from "./tipler.ts";

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
const aylik = (s: [number, number] | undefined, ay: number) => (s && s[0] === ay ? s[1] : 0);

/** GET /v1/hizmet: öğrenilmiş hizmet kataloğu ve oyuncunun süresi geçmemiş hazır stoğu. */
export function hizmetOku(m: YerlesimMotoru, hesapId: string): Promise<Sonuc<unknown>> {
  return m.ekonomiOku(hesapId, (kar, ay) => {
    const katalog = HIZMET_TARIFLERI.map((tarif) => ({
      id: tarif.id,
      meslek: tarif.meslek,
      dugum: tarif.dugum,
      seviye: tarif.seviye,
      girdi: tarif.girdi,
      takat: tarif.takat,
      aylikTavan: tarif.aylikTavan,
      hedef: tarif.hedef,
      etki: tarif.etki,
      hazir: tarif.hazir,
      fiyatTaban: tarif.fiyatTaban,
      acik: hizmetAcik(kar, tarif.id),
    }));
    const ek = m.kasaba.ek;
    const stok = (ek?.hs ?? [])
      .filter((x) => x.o === kar.o && hizmetStoguGecerli(x, ay))
      .map((x) => hizmetStoguGorunumu(x, ay));
    const ilanlar = hizmetIlanlar(ek, ay).map((x) => hizmetIlanGorunumu(x, kar.o, ay));
    const benimIlanlar = hizmetIlanlar(ek, ay).filter((x) => x.o === kar.o).map((x) => hizmetIlanGorunumu(x, kar.o, ay));
    return basarili({ katalog, stok, ilanlar, benimIlanlar, kurallar: { tekHazirlamaEnCok: 5, hizmetStokEnCok: 20, acikIlanEnCok: 5, alimAdetEnCok: 5 } });
  });
}

/** POST /v1/hizmet/hazirla {hizmet, adet, istekNo}: mal ve takat harcayıp süreli hizmet stoğu üretir. */
export function hizmetHazirlaUc(m: YerlesimMotoru, hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
  if (!nesneMi(govde)) return Promise.resolve(hata("gecersiz_istek"));
  return m.ekonomiYaz(hesapId, govde, "hizmetHazirla", [], (kar, ay) => {
    const r = hizmetHazirla(ekonomiAl(m.kasaba), kar, govde.hizmet, govde.adet, ay);
    if (!r.ok) return r;
    return basarili({ hazirlama: r.deger, stok: hizmetStoguGorunumu(r.deger.stok, ay) });
  });
}

/** POST /v1/hizmet/ilan {stok, adet, fiyat, istekNo}: hazır stoğu pazara ayırır. */
export function hizmetIlanUc(m: YerlesimMotoru, hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
  if (!nesneMi(govde)) return Promise.resolve(hata("gecersiz_istek"));
  return m.ekonomiYaz(hesapId, govde, "hizmetIlan", [], (kar, ay) => {
    const r = hizmetIlanAc(ekonomiAl(m.kasaba), kar, govde.stok, govde.adet, govde.fiyat, ay);
    if (!r.ok) return r;
    return basarili({ ilan: hizmetIlanGorunumu(r.deger, kar.o, ay) });
  });
}

/** POST /v1/hizmet/geri {ilan, istekNo}: açık ilanı kapatır ve bozulmamış stoğu iade eder. */
export function hizmetGeriUc(m: YerlesimMotoru, hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
  if (!nesneMi(govde)) return Promise.resolve(hata("gecersiz_istek"));
  return m.ekonomiYaz(hesapId, govde, "hizmetGeri", [], (kar, ay) => {
    const r = hizmetIlanGeri(ekonomiAl(m.kasaba), kar, govde.ilan, ay);
    if (!r.ok) return r;
    return basarili({ ilan: hizmetIlanGorunumu(r.deger.ilan, kar.o, ay), iade: r.deger.iade });
  });
}

/** POST /v1/hizmet/satin-al {ilan, adet, istekNo}: satıcı çevrimdışı olsa da aynı ekonomi yazımında yüklenir. */
export async function hizmetIslemUc(m: YerlesimMotoru, hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  const ilan = hizmetIlanBul(m.kasaba.ek, govde.ilan);
  return m.ekonomiYaz(hesapId, govde, "hizmetSatis", ilan ? [ilan.o] : [], (alici, ay, ek) => {
    const satici = ilan ? m.kasaba.kar.get(ilan.o) : undefined;
    const r = hizmetIlanIsle(ekonomiAl(m.kasaba), alici, satici, govde.ilan, govde.adet, ay);
    if (!r.ok) return r;
    if (satici) ek.digerleri.push(satici.o);
    return basarili({
      islem: {
        ilan: hizmetIlanGorunumu(r.deger.ilan, alici.o, ay),
        adet: r.deger.adet,
        tutar: r.deger.tutar,
        etki: r.deger.etki,
        hizmetPuani: r.deger.hizmetPuani,
      },
    });
  });
}

/** Pazar kuralları (ekranda açıkça yazılır; gizli sayı yok). */
export const PAZAR_KURALLARI = {
  ilanEnCok: PAZAR_ILAN_EN_COK,
  sureEnCok: PAZAR_SURE_EN_COK,
  adetEnCok: PAZAR_ADET_EN_COK,
  bacOrani: PAZAR_BAC_ORANI,
  adilBant: { alt: PAZAR_ADIL_ALT, ust: PAZAR_ADIL_UST },
  kumeCarpani: PAZAR_KUME_CARPANI,
  kaliteCarpani: KALITE_DEGER_CARPANI,
  armaganTavani: { verme: HEDIYE_VERME_AYLIK, alma: HEDIYE_ALMA_AYLIK },
} as const;

function armaganKalan(kar: Karakter, ay: number) {
  return { verme: HEDIYE_VERME_AYLIK - aylik(kar.hv, ay), alma: HEDIYE_ALMA_AYLIK - aylik(kar.ha, ay) };
}

/** GET /v1/pazar?mal=: açık ilanlar (karşılaştırmalı), benim ilanlarım, mal özeti, kurallar, kalan armağan tavanı. */
export function pazarOku(m: YerlesimMotoru, hesapId: string, malHam: unknown): Promise<Sonuc<unknown>> {
  return m.ekonomiOku(hesapId, (kar, ay) => {
    const k = m.kasaba;
    let mal: MalId | undefined;
    if (typeof malHam === "string" && malHam !== "") {
      mal = malBul(malHam);
      if (!mal) return hata("mal_gecersiz");
    }
    const acik = acikIlanlar(k.ek).filter((x) => !mal || x.ml === mal);
    const ozet = new Map<MalId, { mal: MalId; npcTaban: number; npcdenAlis: number; enUcuzSatis: number | null; enYuksekAlim: number | null }>();
    for (const x of acik) {
      const o = ozet.get(x.ml) ?? { mal: x.ml, npcTaban: MALLAR[x.ml].taban, npcdenAlis: npcFiyat(x.ml, m.kasaba.pr).toplam, enUcuzSatis: null, enYuksekAlim: null };
      if (x.t === "sat") o.enUcuzSatis = o.enUcuzSatis === null ? x.f : Math.min(o.enUcuzSatis, x.f);
      else o.enYuksekAlim = o.enYuksekAlim === null ? x.f : Math.max(o.enYuksekAlim, x.f);
      ozet.set(x.ml, o);
    }
    return basarili({
      ilanlar: acik.map((x) => ilanGorunumu(x, kar.o, ay)),
      benim: (k.ek?.il ?? []).filter((x) => x.o === kar.o).map((x) => ilanGorunumu(x, kar.o, ay)),
      ozet: [...ozet.values()].sort((a, b) => (a.mal < b.mal ? -1 : 1)),
      kurallar: PAZAR_KURALLARI,
      kaliteler: KALITE_ADLARI,
      armaganKalan: armaganKalan(kar, ay),
      emanet: pazarEmaneti(k.ek, kar.o),
    });
  });
}

/** POST /v1/pazar/ilan {tur, mal, adet, fiyat, sure?, kalite?, istekNo}. */
export function pazarIlan(m: YerlesimMotoru, hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
  if (!nesneMi(govde)) return Promise.resolve(hata("gecersiz_istek"));
  return m.ekonomiYaz(hesapId, govde, "pazarEmanet", [], (kar, ay, ek) => {
    const r = ilanAc(m.kasaba, kar, govde, ay);
    if (!r.ok) return r;
    ek.olaylar.push(r.deger.olay);
    return basarili({ ilan: ilanGorunumu(r.deger.ilan, kar.o, ay) });
  });
}

/** POST /v1/pazar/islem {ilan, adet, kalite?, istekNo}: ilan sahibi yüklenir; satış/alım ve bac defterde ayrı. */
export async function pazarIslem(m: YerlesimMotoru, hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  const ilan = ilanBul(m.kasaba, govde.ilan);
  return m.ekonomiYaz(hesapId, govde, "pazarAlim", ilan ? [ilan.o] : [], (kar, ay, ek) => {
    const sahip = ilan ? m.kasaba.kar.get(ilan.o) : undefined;
    const r = ilanIsle(m.kasaba, kar, sahip, govde.ilan, govde.adet, govde.kalite, ay);
    if (!r.ok) return r;
    const s = r.deger.sonuc;
    const satici = s.ilan.t === "sat" ? sahip! : kar;
    ek.digerleri.push(sahip!.o);
    ek.olaylar.push(...r.deger.olaylar);
    (ek.defter ??= []).push([satici.o, "pazarSatis", s.tutar], [satici.o, "bac", -s.bac]);
    if (s.ilan.t === "sat") ek.defter.push([kar.o, "pazarAlim", -s.tutar]);
    return basarili({
      islem: { ilan: ilanGorunumu(s.ilan, kar.o, ay), adet: s.adet, kalite: KALITE_ADLARI[s.kalite], tutar: s.tutar, bac: s.bac, net: s.net, karsilastirma: s.karsilastirma, pompa: s.pompa },
    });
  });
}

/** POST /v1/pazar/geri {ilan, istekNo}: kalan emanet sahibine döner. */
export function pazarGeri(m: YerlesimMotoru, hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
  if (!nesneMi(govde)) return Promise.resolve(hata("gecersiz_istek"));
  return m.ekonomiYaz(hesapId, govde, "pazarIade", [], (kar, ay) => {
    const r = ilanGeri(m.kasaba, kar, govde.ilan, ay);
    if (!r.ok) return r;
    return basarili({ ilan: ilanGorunumu(r.deger.ilan, kar.o, ay), iade: r.deger.iade });
  });
}

/** GET /v1/ismarlama: gelen (usta olarak), giden (müşteri olarak), ustalık sicili, kurallar. */
export function ismarlamaOku(m: YerlesimMotoru, hesapId: string): Promise<Sonuc<unknown>> {
  return m.ekonomiOku(hesapId, (kar, ay) => {
    const liste = [...(m.kasaba.ek?.is ?? [])].reverse();
    return basarili({
      gelen: liste.filter((x) => x.u === kar.o).map((x) => ismarlamaGorunumu(x, kar.o, ay)),
      giden: liste.filter((x) => x.m === kar.o).map((x) => ismarlamaGorunumu(x, kar.o, ay)),
      sicil: ismarlamaSicili(kar),
      emanet: ismarlamaEmaneti(m.kasaba.ek, kar.o),
      kurallar: {
        adetEnCok: ISMARLAMA_ADET_EN_COK,
        sureEnCok: ISMARLAMA_SURE_EN_COK,
        musteriEnCok: ISMARLAMA_MUSTERI_EN_COK,
        ustaEnCok: ISMARLAMA_USTA_EN_COK,
        adilBant: { alt: PAZAR_ADIL_ALT, ust: PAZAR_ADIL_UST },
        armaganTavani: { verme: HEDIYE_VERME_AYLIK, alma: HEDIYE_ALMA_AYLIK },
      },
    });
  });
}

/** POST /v1/ismarlama {hedef, mal, adet, kalite?, sure, ucret, istekNo}: ücret müşteriden emanete. */
export function ismarlaUc(m: YerlesimMotoru, hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
  if (!nesneMi(govde)) return Promise.resolve(hata("gecersiz_istek"));
  const h = m.sakinKimligi(govde.hedef);
  return m.ekonomiYaz(hesapId, govde, "ismarlamaEmanet", h ? [h] : [], (kar, ay, ek) => {
    const usta = h ? m.kasaba.kar.get(h) : undefined;
    if (!usta) return hata("kisi_yok");
    const r = ismarla(m.kasaba, kar, usta, govde, ay);
    if (!r.ok) return r;
    ek.digerleri.push(usta.o);
    ek.olaylar.push(...r.deger.olaylar);
    return basarili({ ismarlama: ismarlamaGorunumu(r.deger.ismarlama, kar.o, ay), pompa: r.deger.pompa });
  });
}

/** POST /v1/ismarlama/cevap {ismarlama, cevap: kabul|ret|geri|teslim, kalite?, istekNo}. */
export function ismarlamaCevapUc(m: YerlesimMotoru, hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
  if (!nesneMi(govde)) return Promise.resolve(hata("gecersiz_istek"));
  const ism = ismarlamaBul(m.kasaba, govde.ismarlama);
  const kalem = govde.cevap === "teslim" ? "ismarlamaGelir" : "ismarlamaIade";
  return m.ekonomiYaz(hesapId, govde, kalem, ism ? [ism.m, ism.u] : [], (kar, ay, ek) => {
    const diger = ism ? m.kasaba.kar.get(ism.m === kar.o ? ism.u : ism.m) : undefined;
    const r = ismarlamaCevap(m.kasaba, kar, diger, govde.ismarlama, govde.cevap, govde.kalite, ay);
    if (!r.ok) return r;
    ek.digerleri.push(diger!.o);
    ek.olaylar.push(...r.deger.olaylar);
    return basarili({ ismarlama: ismarlamaGorunumu(r.deger.ismarlama, kar.o, ay), teslim: r.deger.teslim ?? null });
  });
}

/** GET /v1/levha?mal=: Ustalar Levhası. */
export function levhaOku(m: YerlesimMotoru, hesapId: string, malHam: unknown): Promise<Sonuc<unknown>> {
  return m.ekonomiOku(hesapId, () => basarili(levhaGorunumu(m.kasaba, malHam)));
}

/** GET /v1/defter?ay=: son N ayın gelir-gider dökümü, şimdiki akçe ve emanetteki akçe. */
export function defterOku(m: YerlesimMotoru, hesapId: string, ayHam: unknown): Promise<Sonuc<unknown>> {
  return m.ekonomiOku(hesapId, (kar, ay) => {
    const n = ayHam === undefined || ayHam === null || ayHam === "" ? DEFTER_AY : Number(ayHam);
    if (!Number.isInteger(n) || n < 1 || n > DEFTER_AY) return hata("gecersiz_istek");
    const ek = m.kasaba.ek;
    return basarili({
      ...defterGorunumu(kar, ay, n),
      ay,
      para: kar.pa,
      emanet: { pazar: pazarEmaneti(ek, kar.o), ismarlama: ismarlamaEmaneti(ek, kar.o) },
    });
  });
}
