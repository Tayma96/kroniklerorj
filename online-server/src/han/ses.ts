// Faz 16 handa sesli sohbet: MasaDO'nun ses yetki kapısı ve Realtime vekilliği (POST /v1/han/masa/:no/ses/<alt>).
// Kurallar: yalnız masaya bağlı olan dinler (ayaktakiler dahil); yalnız oturan, Y1'de susturulmamış ve masa başının
// sesini kesmediği oyuncu yayın (mikrofon) açar. Engelli çiftler birbirini çekemez. Ses kaydedilmez, saklanmaz:
// depoya hiçbir şey yazılmaz; yalnız soket ekinde oturum/iz kimlikleri durur.

import { basarili, hata, type Sonuc } from "../tipler.ts";
import { ILETI_PENCERESI_MS, KOLTUK_SAYISI, KOMUT_SINIRI, pencereSay, surer } from "./kurallar.ts";
import { kayitlar, sesYayinla, yayiniKes, type Kayit, type MasaBaglami } from "./masa.ts";
import { midCoz, sdpCoz, type IceSunucusu, type Realtime, type Sdp } from "./realtime.ts";
import type { SesAlt, SoketEki } from "./tipler.ts";

export interface SesOturumu {
  ice: IceSunucusu[];
}
export interface SesYayini {
  sdp: Sdp | null;
  yeniden: boolean;
  iz: string;
}
export interface SesDinleme {
  sdp: Sdp | null;
  yeniden: boolean;
  izler: { mid: string; iz: string; hesap: string }[];
}

function nesne(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function bul(b: MasaBaglami, hesap: string): Kayit | undefined {
  return kayitlar(b.soketler).find((r) => r.ek.h === hesap);
}

/** Bekleme (Realtime çağrısı) sonrası taze ek: bağlantı kapanmış ya da değişmişse undefined. */
function taze(kayit: Kayit): SoketEki | undefined {
  const ek = kayit.soket.ek();
  return ek && !ek.x ? ek : undefined;
}

function yayinEngeli(b: MasaBaglami, ek: SoketEki): Sonuc<never> | undefined {
  if (ek.k === null) return hata("oturmuyor");
  if (surer(ek.yt.susturma, b.simdi)) return { ok: false, hata: "susturuldu", bitis: ek.yt.susturma.bitis };
  if (ek.sm) return hata("sesi_kesildi");
  return undefined;
}

export async function sesIsle(b: MasaBaglami, rt: Realtime | undefined, hesap: string, alt: SesAlt, govde: unknown): Promise<Sonuc<unknown>> {
  if (!rt) return hata("ses_kapali");
  if (!b.ayar.sesli) return hata("masa_sessiz");
  const kayit = bul(b, hesap);
  if (!kayit) return hata("masada_degil");
  const ek = kayit.ek;
  const hiz = pencereSay(ek.kz, b.simdi, KOMUT_SINIRI, ILETI_PENCERESI_MS);
  ek.kz = hiz.durum;
  kayit.soket.ekYaz(ek);
  if (!hiz.izin) return hata("hiz_siniri");
  const g = nesne(govde);
  switch (alt) {
    case "oturum":
      return oturum(b, rt, kayit, ek);
    case "yayin":
      return yayin(b, rt, kayit, ek, g);
    case "dinle":
      return dinle(b, rt, ek, g);
    case "anlas": {
      if (!ek.ses) return hata("ses_oturumu_yok");
      const cevap = sdpCoz(g.sdp, "answer");
      if (!cevap) return hata("gecersiz_istek");
      const r = await rt.yenidenAnlas(ek.ses.o, cevap);
      return r.ok ? basarili({}) : r;
    }
    case "kapat":
      return kapat(b, rt, kayit, ek, g);
    default:
      return hata("gecersiz_istek");
  }
}

/** Yeni Realtime oturumu (her WebRTC bağlantısı için bir tane). Önceki yayın varsa kapatılır. */
async function oturum(b: MasaBaglami, rt: Realtime, kayit: Kayit, ek: SoketEki): Promise<Sonuc<SesOturumu>> {
  const vardi = yayiniKes(b, ek);
  if (vardi) kayit.soket.ekYaz(ek);
  const id = await rt.oturumAc();
  if (!id.ok) return id;
  const ice = await rt.iceSunuculari();
  const son = taze(kayit);
  if (!son) return hata("masada_degil");
  yayiniKes(b, son);
  son.ses = { o: id.deger };
  kayit.soket.ekYaz(son);
  if (vardi) sesYayinla(b, kayitlar(b.soketler));
  return basarili({ ice });
}

/** Mikrofon izini yayına ekler: istemci offer + mid → SFU answer. */
async function yayin(b: MasaBaglami, rt: Realtime, kayit: Kayit, ek: SoketEki, g: Record<string, unknown>): Promise<Sonuc<SesYayini>> {
  if (!ek.ses) return hata("ses_oturumu_yok");
  const engel = yayinEngeli(b, ek);
  if (engel) return engel;
  const teklif = sdpCoz(g.sdp, "offer");
  const mid = midCoz(g.mid);
  if (!teklif || !mid) return hata("gecersiz_istek");
  yayiniKes(b, ek);
  kayit.soket.ekYaz(ek);
  const oturumId = ek.ses.o;
  const iz = `m${b.simdi.toString(36)}`;
  const r = await rt.izEkle(oturumId, teklif, mid, iz);
  if (!r.ok) return r;
  // Bekleme sırasında kalkmış, susturulmuş ya da sesi kesilmiş olabilir: yayın hemen geri kapatılır.
  const son = taze(kayit);
  const sonEngel = son ? yayinEngeli(b, son) : hata("masada_degil");
  if (!son || sonEngel || son.ses?.o !== oturumId) {
    b.sesKapat?.(oturumId, mid);
    return sonEngel ?? hata("ses_oturumu_yok");
  }
  son.ses = { o: oturumId, i: iz, d: r.deger.izler[0]?.mid ?? mid };
  kayit.soket.ekYaz(son);
  sesYayinla(b, kayitlar(b.soketler));
  return basarili({ sdp: r.deger.sdp, yeniden: r.deger.yeniden, iz });
}

/** Masadaki yayınları çeker (istenen iz adları; kendisi ve engelli çiftler hariç). SFU offer döner. */
async function dinle(b: MasaBaglami, rt: Realtime, ek: SoketEki, g: Record<string, unknown>): Promise<Sonuc<SesDinleme>> {
  if (!ek.ses) return hata("ses_oturumu_yok");
  const istenen = Array.isArray(g.izler) ? [...new Set(g.izler.filter((i): i is string => typeof i === "string"))].slice(0, KOLTUK_SAYISI) : [];
  const cekilecek: { oturum: string; iz: string; hesap: string }[] = [];
  for (const r of kayitlar(b.soketler)) {
    const s = r.ek.ses;
    if (!s?.i || r.ek.k === null || r.ek.h === ek.h || !istenen.includes(s.i)) continue;
    if ((await b.engelliMi(ek.h, r.ek.h)) || (await b.engelliMi(r.ek.h, ek.h))) continue;
    cekilecek.push({ oturum: s.o, iz: s.i, hesap: r.ek.h });
  }
  if (cekilecek.length === 0) return basarili({ sdp: null, yeniden: false, izler: [] });
  const r = await rt.izCek(ek.ses.o, cekilecek.map(({ oturum, iz }) => ({ oturum, iz })));
  if (!r.ok) return r;
  const izler = r.deger.izler.flatMap((i) => {
    const kim = cekilecek.find((c) => c.iz === i.iz);
    return kim ? [{ mid: i.mid, iz: i.iz, hesap: kim.hesap }] : [];
  });
  return basarili({ sdp: r.deger.sdp, yeniden: r.deger.yeniden, izler });
}

/**
 * Kapatma: `mids` verilirse o izler (dinlenenler dahil), verilmezse kendi yayını; `tum` ile oturum da bırakılır.
 * İstemci offer verirse SFU answer döner; vermezse zorla kapatılır.
 */
async function kapat(b: MasaBaglami, rt: Realtime, kayit: Kayit, ek: SoketEki, g: Record<string, unknown>): Promise<Sonuc<{ sdp: Sdp | null }>> {
  const s = ek.ses;
  if (!s) return basarili({ sdp: null });
  const tum = g.tum === true;
  const verilen = Array.isArray(g.mids) ? g.mids.map(midCoz) : [];
  if (verilen.some((m) => m === undefined)) return hata("gecersiz_istek");
  const mids = new Set(verilen as string[]);
  if ((tum || verilen.length === 0) && s.d) mids.add(s.d);
  const yayinKapandi = Boolean(s.i && s.d && mids.has(s.d));
  if (yayinKapandi) {
    delete s.i;
    delete s.d;
    delete s.k;
  }
  if (tum) delete ek.ses;
  kayit.soket.ekYaz(ek);
  if (yayinKapandi) sesYayinla(b, kayitlar(b.soketler));
  if (mids.size === 0) return basarili({ sdp: null });
  const teklif = tum ? undefined : sdpCoz(g.sdp, "offer");
  const r = await rt.izKapat(s.o, [...mids].slice(0, KOLTUK_SAYISI + 1), teklif);
  // Kendi yayını yerelde zaten kapandı sayılır; SFU hatası istemciye bildirilir.
  return r.ok ? basarili({ sdp: r.deger }) : r;
}
