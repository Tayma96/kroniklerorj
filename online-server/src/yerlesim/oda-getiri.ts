// Odanın getirdikleri (GDD §18, H12): sandık, han emaneti, ikamet (adres) ve özel görüşme. Saf fonksiyonlar;
// karakteri ve toplum kaydını yerinde değiştirir. Etkin kira, barınma kaydındaki sözleşmeden okunur (barinma.ts'ye
// bağımlılık yok: döngü olmasın diye görünüm bu modülü çağırır, bu modül görünümü değil).
//
// Sandık: geçerli kirası olan ve odası `sandik > 0` olan oyuncu en çok `sandik` adet malı (bütün mallar toplamı)
// odasındaki sandığa koyar ya da çeker. Mal envanterden düşer, sandığa (barınma kaydı `sd`) geçer; izli partiler
// (kalite + yapan) aynen taşınır. Hiçbir adımda çoğalmaz: koy = envanterden çıkan, al = sandıktan çıkan.
// Han emaneti: kira biter ya da sandıksız odaya geçilirse aynı mallar emanette durur (kayıp yok; sandık kaydı
// silinmez). Sonraki sandıklı kirada sandığa döner (aynı kayıt) ya da `emanetAl` ile hepsi envantere geri gelir.
// Göç: sandıkta/emanette mal varken göç kapısı "acikIs" tutmaz (goc.ts); oyuncu önce malını alır.
// Ölüm: sandık ve emanet malı vârisin envanterine geçer (devir.ts envanter kalemi).
//
// İkamet: odası `adres: true` olan geçerli kira (oda, yatak, has oda; NPC ya da oyuncu hanı). Veri hazır, henüz
// hiçbir kapı buna bağlanmadı (ileride makam adaylığı, lonca/esnaf kaydı).
//
// Özel görüşme: odası `ozel: true` olan oyuncu odasına en çok GORUSME_DAVETLI_EN_COK oyuncuyu davet eder, davetli
// kabul eder. Görüşmedekiler hazır kalıplardan bir "özel söz" verir: olay yalnız görüşmedekilere düşer, katılım
// listesi görüşmedekilerdir. Nam/akçe etkisi yoktur; serbest metin saklanmaz (yalnız şart kimliği).

import { malBul, type MalId } from "../icerik/mallar.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { KALITELER, kaliteAdedi, kaliteliCikar, kaliteliEkle, kaliteMi, type Envanterli, type Kalite, type KaliteParti } from "./kalite.ts";
import { ODALAR, type KiraSozlesmesi } from "./oda.ts";
import type { Karakter, Kasaba, OlayTaslagi } from "./tipler.ts";
import { toplumAl } from "./toplum.ts";

/** [PARAMETRE] Sandık işleyişi açık mı (kapalıyken koy/al reddedilir; emanet geri alma her zaman açıktır). */
export const SANDIK_ACIK = true;
/** [PARAMETRE] Özel görüşmeye davet edilebilen en çok oyuncu (ev sahibi hariç). */
export const GORUSME_DAVETLI_EN_COK = 3;
/** [PARAMETRE] Görüşmenin en uzun süresi (ms; gerçek zaman). Süre ya da ev sahibinin kirası bitince görüşme kapanır. */
export const GORUSME_SURE_MS = 6 * 60 * 60 * 1000;
/** [PARAMETRE] Bir görüşmede verilebilen en çok özel söz (olay seli tavanı). */
export const GORUSME_SOZ_EN_COK = 6;
/** [PARAMETRE] Özel söz kalıpları (serbest metin yok; i18n anahtarı `oda.sart.<kimlik>`). */
export const SOZ_SARTLARI = ["ittifak", "sessizlik", "destek", "ticaret", "yardim", "tarafsizlik"] as const;
export type SozSarti = (typeof SOZ_SARTLARI)[number];

/** Sandık / han emaneti: adet (`ev`) ve izli partiler (`kq`), envanterle aynı biçim. */
export type Sandik = Envanterli;

/** Özel görüşme (toplum kaydı `og`): ev sahibi, davetliler [kimlik, kabul], başlangıç, bitiş (ms), verilen söz sayısı. */
export interface OzelGorusme {
  o: string;
  d: [o: string, kabul: 0 | 1][];
  b: number;
  s: number;
  n: number;
}

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** `an` anında bu yerleşimde geçerli kira sözleşmesi. */
export function etkinKira(kar: Karakter, y: string, an: number): KiraSozlesmesi | undefined {
  return kar.br?.od.find((s) => s.y === y && s.b <= an && an < s.s);
}

/** İkamet: odası adres veren geçerli kira (H12; veri hazır, kapı bağlanmadı). */
export function ikametVar(kar: Karakter, y: string, an: number): boolean {
  const k = etkinKira(kar, y, an);
  return !!k && ODALAR[k.o]?.adres === true;
}

/** Geçerli odanın sandık kapasitesi (adet; kira yoksa ya da sandıksız odada 0). */
export function sandikKapasitesi(kar: Karakter, y: string, an: number): number {
  if (!SANDIK_ACIK) return 0;
  const k = etkinKira(kar, y, an);
  return k ? (ODALAR[k.o]?.sandik ?? 0) : 0;
}

export function sandikAdedi(sd: Sandik | undefined): number {
  let n = 0;
  for (const x of Object.values(sd?.ev ?? {})) n += x;
  return n;
}

/** "sandik": sandıklı odada (mallar sandıkta); "emanet": sandıklı oda yok ama mal var (han emaneti); "yok". */
export function sandikDurumu(kar: Karakter, y: string, an: number): "sandik" | "emanet" | "yok" {
  if (sandikKapasitesi(kar, y, an) > 0) return "sandik";
  return sandikAdedi(kar.br?.sd) > 0 ? "emanet" : "yok";
}

/** Barınma görünümündeki sandık/emanet dökümü. */
export function sandikGorunumu(kar: Karakter, y: string, an: number) {
  const sd = kar.br?.sd;
  return {
    durum: sandikDurumu(kar, y, an),
    acik: SANDIK_ACIK,
    kapasite: sandikKapasitesi(kar, y, an),
    adet: sandikAdedi(sd),
    mallar: { ...(sd?.ev ?? {}) },
    partiler: structuredClone(sd?.kq ?? {}),
  };
}

/** `adet` malı kaynaktan hedefe taşır: kalite verilirse yalnız o kalite, verilmezse en düşük kaliteden başlar. */
function tasi(kaynak: Envanterli, hedef: Envanterli, mal: MalId, adet: number, q: Kalite | undefined): boolean {
  const kaliteler: readonly Kalite[] = q === undefined ? KALITELER : [q];
  const toplam = kaliteler.reduce<number>((a, x) => a + Math.max(0, kaliteAdedi(kaynak, mal, x)), 0);
  if (toplam < adet) return false;
  let kalan = adet;
  const giden: KaliteParti[] = [];
  for (const x of kaliteler) {
    if (kalan <= 0) break;
    const n = Math.min(kalan, Math.max(0, kaliteAdedi(kaynak, mal, x)));
    if (n <= 0) continue;
    const c = kaliteliCikar(kaynak, mal, n, x);
    if (!c) return false; // olmaz: adet önceden sayıldı
    giden.push(...c);
    kalan -= n;
  }
  kaliteliEkle(hedef, mal, giden);
  return true;
}

function sandikTemizle(kar: Karakter): void {
  const sd = kar.br?.sd;
  if (!sd) return;
  if (sd.ev && Object.keys(sd.ev).length === 0) delete sd.ev;
  if (sd.kq && Object.keys(sd.kq).length === 0) delete sd.kq;
  if (!sd.ev && !sd.kq) delete kar.br!.sd;
}

/**
 * POST /v1/barinma/sandik {islem: koy|al, mal, adet, kalite?}: sandıklı geçerli kirada envanter ↔ sandık. Sandık
 * toplamı kapasiteyi aşamaz (al her zaman serbest; küçük odaya geçildiyse fazlası çekilebilir).
 */
export function sandikIslem(kar: Karakter, y: string, govde: unknown, an: number): Sonuc<Record<string, unknown>> {
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  const islem = govde.islem;
  if (islem !== "koy" && islem !== "al") return hata("gecersiz_istek");
  const mal = malBul(govde.mal);
  if (!mal) return hata("mal_gecersiz");
  const adet = govde.adet;
  if (typeof adet !== "number" || !Number.isInteger(adet) || adet < 1) return hata("gecersiz_istek");
  if (govde.kalite !== undefined && !kaliteMi(govde.kalite)) return hata("gecersiz_istek");
  const q = govde.kalite as Kalite | undefined;
  const kapasite = sandikKapasitesi(kar, y, an);
  if (kapasite <= 0 || !kar.br) return hata("sandik_yok");
  const sd = (kar.br.sd ??= {});
  if (islem === "koy") {
    if (sandikAdedi(sd) + adet > kapasite) return hata("sandik_dolu");
    if (!tasi(kar, sd, mal, adet, q)) {
      sandikTemizle(kar);
      return hata("mal_yok");
    }
  } else if (!tasi(sd, kar, mal, adet, q)) {
    sandikTemizle(kar);
    return hata("mal_yok");
  }
  sandikTemizle(kar);
  return basarili({ sandikIslem: { islem, mal, adet, ...(q !== undefined ? { kalite: q } : {}) }, sandik: sandikGorunumu(kar, y, an) });
}

/** POST /v1/barinma/emanet {}: sandık/emanetteki bütün mallar envantere döner (bedelsiz; kayıp yok). */
export function emanetAl(kar: Karakter, y: string, an: number): Sonuc<Record<string, unknown>> {
  const sd = kar.br?.sd;
  if (!sd || sandikAdedi(sd) <= 0) return hata("emanet_yok");
  const alinan: Record<string, number> = {};
  for (const [m, n] of Object.entries(sd.ev ?? {})) {
    const mal = m as MalId;
    if (n <= 0) continue;
    if (tasi(sd, kar, mal, n, undefined)) alinan[m] = n;
  }
  sandikTemizle(kar);
  return basarili({ emanet: { alinan }, sandik: sandikGorunumu(kar, y, an) });
}

// ── Özel görüşme ──

/** Süresi geçmemiş görüşmeler (yazmaz). */
function canliGorusmeler(k: Kasaba, an: number): OzelGorusme[] {
  return (k.tp?.og ?? []).filter((g) => an < g.s);
}

/** Görüşmedekiler: ev sahibi + kabul etmiş davetliler (sıralı). */
export function gorusmeKatilimi(g: OzelGorusme): string[] {
  return [g.o, ...g.d.filter((x) => x[1] === 1).map((x) => x[0])];
}

function sakinAdi(k: Kasaba, o: string): string {
  return k.sakin.find((s) => s.o === o)?.ad ?? k.kar.get(o)?.ad ?? "?";
}

function ref(k: Kasaba, o: string) {
  return { i: o, ad: sakinAdi(k, o) };
}

function gorusmeOzeti(k: Kasaba, g: OzelGorusme, ben: string) {
  return {
    ev: ref(k, g.o),
    benim: g.o === ben,
    davetliler: g.d.map(([o, kabul]) => ({ kisi: ref(k, o), kabul: kabul === 1 })),
    katilim: gorusmeKatilimi(g),
    baslangic: g.b,
    bitis: g.s,
    soz: g.n,
    sozEnCok: GORUSME_SOZ_EN_COK,
  };
}

/** Barınma görünümündeki görüşme özeti: kendi görüşmem ve davet edildiklerim. */
export function gorusmeGorunumu(k: Kasaba, kar: Karakter, an: number) {
  const canli = canliGorusmeler(k, an);
  const benim = canli.find((g) => g.o === kar.o);
  return {
    acabilir: etkinKira(kar, k.y, an) !== undefined && ODALAR[etkinKira(kar, k.y, an)!.o]?.ozel === true,
    davetliEnCok: GORUSME_DAVETLI_EN_COK,
    sartlar: SOZ_SARTLARI,
    benim: benim ? gorusmeOzeti(k, benim, kar.o) : null,
    davetler: canli.filter((g) => g.o !== kar.o && g.d.some((x) => x[0] === kar.o)).map((g) => gorusmeOzeti(k, g, kar.o)),
  };
}

/** Görüşme işleminin sonucu: yanıt, yalnız görüşmedekilere düşecek olaylar. */
export interface GorusmeSonucu {
  yanit: Record<string, unknown>;
  olaylar: OlayTaslagi[];
}

/**
 * POST /v1/barinma/gorusme {islem: davet|kabul|bitir|soz, hedef?, sart?}.
 *   davet {hedef}: özel odalı geçerli kira; en çok GORUSME_DAVETLI_EN_COK davetli; engel iki yönlü uygulanır.
 *   kabul {hedef: ev sahibi}: davetli görüşmeye girer.
 *   bitir {hedef?}: ev sahibi görüşmeyi kapatır; davetli (hedef = ev sahibi) ayrılır.
 *   soz {sart, hedef?}: görüşmedeki (en az iki kişi) hazır kalıplı söz; olay yalnız görüşmedekilere, nam/akçe yok.
 * Süresi biten görüşmeler her yazımda budanır.
 */
export function gorusmeIslem(k: Kasaba, kar: Karakter, govde: unknown, an: number): Sonuc<GorusmeSonucu> {
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  const islem = govde.islem;
  if (islem !== "davet" && islem !== "kabul" && islem !== "bitir" && islem !== "soz") return hata("gecersiz_istek");
  const hedef = govde.hedef;
  if (hedef !== undefined && (typeof hedef !== "string" || hedef.length === 0 || hedef.length > 16)) return hata("gecersiz_istek");
  const tp = toplumAl(k);
  tp.og = (tp.og ?? []).filter((g) => an < g.s);
  const og = tp.og;
  const ben = kar.o;
  const olaylar: OlayTaslagi[] = [];
  const yanit = (g: OzelGorusme | undefined) => ({ gorusme: g ? gorusmeOzeti(k, g, ben) : null });

  if (islem === "davet") {
    if (typeof hedef !== "string") return hata("gecersiz_istek");
    const kira = etkinKira(kar, k.y, an);
    if (!kira || ODALAR[kira.o]?.ozel !== true) return hata("ozel_oda_yok");
    if (hedef === ben) return hata("kendine");
    if (!k.sakin.some((s) => s.o === hedef)) return hata("kisi_yok");
    if ((tp.eg[ben]?.includes(hedef) ?? false) || (tp.eg[hedef]?.includes(ben) ?? false)) return hata("engelli");
    let g = og.find((x) => x.o === ben);
    if (g?.d.some((x) => x[0] === hedef)) return basarili({ yanit: yanit(g), olaylar });
    if (g && g.d.length >= GORUSME_DAVETLI_EN_COK) return hata("gorusme_dolu");
    if (!g) {
      g = { o: ben, d: [], b: an, s: Math.min(an + GORUSME_SURE_MS, kira.s), n: 0 };
      og.push(g);
    }
    g.d.push([hedef, 0]);
    olaylar.push({ t: "oda", w: ben, h: hedef, g: hedef, n: 4, k: "olay.oda.davet", p: { ev: ref(k, ben), bitis: g.s } });
    return basarili({ yanit: yanit(g), olaylar });
  }

  if (islem === "kabul") {
    if (typeof hedef !== "string") return hata("gecersiz_istek");
    const g = og.find((x) => x.o === hedef);
    const d = g?.d.find((x) => x[0] === ben);
    if (!g || !d) return hata("gorusme_yok");
    if (d[1] === 0) {
      d[1] = 1;
      olaylar.push({ t: "oda", w: ben, h: g.o, g: g.o, n: 3, k: "olay.oda.katildi", p: { kim: ref(k, ben) } });
    }
    return basarili({ yanit: yanit(g), olaylar });
  }

  if (islem === "bitir") {
    const sahip = hedef === undefined || hedef === ben ? og.find((x) => x.o === ben) : undefined;
    if (sahip) {
      tp.og = og.filter((x) => x !== sahip);
      for (const o of gorusmeKatilimi(sahip)) {
        if (o !== ben) olaylar.push({ t: "oda", w: ben, h: o, g: o, n: 3, k: "olay.oda.bitti", p: { ev: ref(k, ben) } });
      }
      return basarili({ yanit: yanit(undefined), olaylar });
    }
    const g = typeof hedef === "string" ? og.find((x) => x.o === hedef) : undefined;
    if (!g || !g.d.some((x) => x[0] === ben)) return hata("gorusme_yok");
    g.d = g.d.filter((x) => x[0] !== ben);
    olaylar.push({ t: "oda", w: ben, h: g.o, g: g.o, n: 3, k: "olay.oda.ayrildi", p: { kim: ref(k, ben) } });
    return basarili({ yanit: yanit(undefined), olaylar });
  }

  // soz
  const sart = govde.sart;
  if (typeof sart !== "string" || !(SOZ_SARTLARI as readonly string[]).includes(sart)) return hata("sart_gecersiz");
  const icinde = (x: OzelGorusme) => gorusmeKatilimi(x).includes(ben);
  const g = typeof hedef === "string" ? og.find((x) => x.o === hedef && icinde(x)) : (og.find((x) => x.o === ben) ?? og.find(icinde));
  if (!g || !icinde(g)) return hata("gorusme_yok");
  const katilim = gorusmeKatilimi(g);
  if (katilim.length < 2) return hata("gorusme_yok");
  if (g.n >= GORUSME_SOZ_EN_COK) return hata("gorusme_siniri");
  g.n += 1;
  for (const o of katilim) {
    olaylar.push({ t: "oda", w: ben, h: g.o, g: o, n: 5, k: "olay.oda.gorusme", p: { sart, kim: ref(k, ben), ev: ref(k, g.o), katilim: katilim.join(","), kisi: katilim.length } });
  }
  return basarili({ yanit: { ...yanit(g), soz: { sart, katilim } }, olaylar });
}
