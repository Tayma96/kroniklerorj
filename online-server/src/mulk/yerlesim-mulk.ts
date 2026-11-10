// YerlesimDO tarafı mülk akışı (Faz 12–13): istemciden gelen mülk ve işletme uçları burada çözülür. Cüzdan ve tapu
// adımları motorun tek yazımındadır (src/mulk/tapu.ts); işletme komutları güvenilir bağlamla IsletmeDO'ya gider.
// Uzlaştırma: her istekten sonra ve YerlesimDO alarmında yerleşimin çıkış kutusu (kur, kasaya, sahip) teslim edilir;
// IsletmeDO'nun yanıtındaki bekleyen kasa → cüzdan kayıtları burada bir kez uygulanır ve onaylanır.

import { istekNoCoz } from "../mantik.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { teveccuhKademesi } from "../yerlesim/teveccuh.ts";
import type { Karakter, Kasaba } from "../yerlesim/tipler.ts";
import type { IsletmeIleti, IsletmeYaniti, Komut, TapuOzeti } from "./islem.ts";
import { KOMUTLAR } from "./islem.ts";
import type { PersonelHedefi } from "./isletme.ts";
import { isletmeCoz } from "./kurallar.ts";
import {
  baglamYap,
  devirKabul,
  devirTeklif,
  edin,
  girisIsle,
  karGerekenler,
  mulkDefteri,
  mulkListesi,
  personelHedefi,
  telafi,
  telafiGerekenler,
  yatir,
} from "./tapu.ts";
import { cikisKapat, denemeErtele, denenecekler, sonrakiDeneme, transferDurumu, type CevapDurumu, type CikisKaydi } from "./transfer.ts";

export interface MulkMotoru {
  readonly kasaba: Kasaba;
  mulkOyuncu(hesapId: string): Promise<Sonuc<{ kar: Karakter }>>;
  mulkAdimi(hesapId: string, govde: unknown, yukle: string[], isle: (kar: Karakter) => Sonuc<Record<string, unknown>>): Promise<Sonuc<unknown>>;
  mulkIslem<T>(yukle: string[], isle: () => T): Promise<T>;
}

export type IsletmeCagir = (ileti: IsletmeIleti) => Promise<Sonuc<IsletmeYaniti>>;

/** İstemci uçlarının alt işlemleri (HesapDO → YerlesimDO "mulk"). */
export const MULK_ALT = ["liste", "edin", "panel", "devirOnizle", "yatir", "devir", ...KOMUTLAR] as const;
export type MulkAlt = (typeof MULK_ALT)[number];

export interface MulkIletisi {
  hesapId: string;
  alt: MulkAlt;
  isletme?: string | null;
  govde?: unknown;
}

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Gelen kayıtları (IsletmeDO çıkış kutusu) bir kez uygular; [işlem, sonuç, neden] döner. */
export function teslimAl(motor: MulkMotoru, kayitlar: CikisKaydi[], an: number): Promise<[string, CevapDurumu, string?][]> {
  const temiz = Array.isArray(kayitlar) ? kayitlar.filter((x) => nesneMi(x) && typeof x.i === "string" && nesneMi(x.y)) : [];
  return motor.mulkIslem(karGerekenler(temiz), () =>
    temiz.map((x) => {
      const r = girisIsle(motor.kasaba, x, an);
      return r.neden ? ([x.i, r.durum, r.neden] as [string, CevapDurumu, string]) : ([x.i, r.durum] as [string, CevapDurumu]);
    }),
  );
}

/** IsletmeDO yanıtındaki bekleyen kayıtları uygular ve onaylar (onay en iyi çabadır; kaybolursa alarm yeniden teslim eder). */
async function yanitTeslimi(motor: MulkMotoru, isletme: string, y: IsletmeYaniti, an: number, cagir: IsletmeCagir): Promise<void> {
  if (!y.teslim?.length) return;
  const sonuclar = await teslimAl(motor, y.teslim, an);
  try {
    await cagir({ islem: "onay", isletme, sonuclar: sonuclar.map(([i, d]) => [i, d]) });
  } catch {
    // yut: uzlaştırma
  }
}

let uzlastiriyor = new WeakSet<Kasaba>();

/** Yerleşimin çıkış kutusunu teslim eder. `hepsi`: bekleme süresine bakmadan (istek sonrası). Sonraki deneme anını döner. */
export async function uzlastir(motor: MulkMotoru, an: number, cagir: IsletmeCagir, hepsi = false): Promise<number | null> {
  const k = motor.kasaba;
  const md = k.mk;
  if (!md || md.cik.k.length === 0) return null;
  if (uzlastiriyor.has(k)) return sonrakiDeneme(md.cik);
  uzlastiriyor.add(k);
  try {
    const gruplar = new Map<string, CikisKaydi[]>();
    for (const x of denenecekler(md.cik, an, hepsi)) gruplar.set(x.h, [...(gruplar.get(x.h) ?? []), x]);
    for (const [isletme, kayitlar] of gruplar) {
      let r: Sonuc<IsletmeYaniti> | undefined;
      try {
        r = await cagir({ islem: "teslim", isletme, kayitlar });
      } catch {
        r = undefined;
      }
      if (!r?.ok || !r.deger.sonuclar) {
        await motor.mulkIslem([], () => kayitlar.forEach((x) => denemeErtele(md.cik, x.i, an)));
        continue;
      }
      const sonuclar = r.deger.sonuclar;
      const yukle = kayitlar.flatMap(telafiGerekenler);
      await motor.mulkIslem(yukle, () => {
        for (const [i, d] of sonuclar) {
          const kp = cikisKapat(md.cik, i, d, an);
          if (kp?.durum === "iade") telafi(k, kp.kayit);
        }
      });
      await yanitTeslimi(motor, isletme, r.deger, an, cagir);
    }
    return sonrakiDeneme(md.cik);
  } finally {
    uzlastiriyor.delete(k);
  }
}

/** Testler için: süreç içi kilit tablosunu sıfırlar. */
export function uzlastirmaSifirla(): void {
  uzlastiriyor = new WeakSet<Kasaba>();
}

function tapuOzeti(k: Kasaba, isletme: string): TapuOzeti | undefined {
  const c = isletmeCoz(isletme);
  const t = k.mk?.t[isletme];
  if (!c || !t || c.yerlesim !== k.y) return undefined;
  const s = k.sakin.find((x) => x.o === t.s);
  return { isletme, yerlesim: k.y, tur: c.tur, no: c.no, ts: t.ts, sahip: { h: t.h, o: t.s, ad: s?.ad ?? "" } };
}

/** Yanıttaki transfer(ler)in güncel durumunu ekler (tekrarlanan istekNo da güncel durumu görür). */
function durumEkle(k: Kasaba, r: Sonuc<unknown>): Sonuc<unknown> {
  if (!r.ok || !nesneMi(r.deger)) return r;
  const d = r.deger;
  const islem = (["edinim", "yatirma", "transfer", "devir"] as const).map((a) => (nesneMi(d[a]) ? (d[a] as Record<string, unknown>).islem : undefined)).find((x) => typeof x === "string") as string | undefined;
  if (!islem || !k.mk) return r;
  return basarili({ ...d, transferDurumu: transferDurumu(k.mk.cik, islem) });
}

/** Mülk uçlarının tek girişi. `an`: dünya saati (ms). */
export async function mulkIsle(motor: MulkMotoru, ileti: MulkIletisi, an: number, cagir: IsletmeCagir): Promise<Sonuc<unknown>> {
  const k = motor.kasaba;
  const { hesapId, alt } = ileti;
  const govde = ileti.govde;
  if (alt === "liste") {
    const r = await motor.mulkOyuncu(hesapId);
    if (!r.ok) return r;
    return basarili(mulkListesi(k, r.deger.kar));
  }
  if (alt === "edin") {
    const no = istekNoCoz(govde);
    if (!no.ok) return no;
    const r = await motor.mulkAdimi(hesapId, govde, [], (kar) => edin(k, kar, govde, an, no.deger));
    await uzlastir(motor, an, cagir, true);
    return durumEkle(k, r);
  }
  const c = isletmeCoz(ileti.isletme);
  if (!c || c.yerlesim !== k.y) return hata("isletme_yok");
  const isletme = c.id;
  if (alt === "yatir" || alt === "devir") {
    const no = istekNoCoz(govde);
    if (!no.ok) return no;
    let r: Sonuc<unknown>;
    if (alt === "yatir") r = await motor.mulkAdimi(hesapId, govde, [], (kar) => yatir(k, kar, isletme, govde, an, no.deger));
    else if (nesneMi(govde) && govde.islem === "kabul") {
      // Alıcı borç ve sözleşmeleri gördüğü sürümle kabul eder; işletme değiştiyse yeniden önizletilir.
      const ben = await motor.mulkOyuncu(hesapId);
      if (!ben.ok) return ben;
      const tapu = tapuOzeti(k, isletme);
      if (!tapu) return hata("isletme_yok");
      const on = await cagir({ islem: "oku", isletme, tapu, baglam: baglamYap(k, ben.deger.kar, 0), tur: "devir" });
      if (!on.ok) return on;
      const surum = (on.deger.deger as { surum?: string } | undefined)?.surum;
      if (typeof govde.surum !== "string" || govde.surum !== surum) return hata("devir_degisti");
      r = await motor.mulkAdimi(hesapId, govde, [tapu.sahip.o], (kar) => devirKabul(k, kar, isletme, an, no.deger));
    } else r = await motor.mulkAdimi(hesapId, govde, [], (kar) => devirTeklif(k, kar, isletme, govde));
    await uzlastir(motor, an, cagir, true);
    return durumEkle(k, r);
  }
  // İşletmeye giden okuma ve komutlar: bağlam ve tapu özeti yerleşimden.
  const ben = await motor.mulkOyuncu(hesapId);
  if (!ben.ok) return ben;
  const kar = ben.deger.kar;
  const tapu = tapuOzeti(k, isletme);
  if (!tapu) return hata("isletme_yok");
  const baglam = baglamYap(k, kar, teveccuhKademesi(kar, k.ay));
  await uzlastir(motor, an, cagir, true);
  if (alt === "panel" || alt === "devirOnizle") {
    let r: Sonuc<IsletmeYaniti>;
    try {
      r = await cagir({ islem: "oku", isletme, tapu, baglam, tur: alt === "panel" ? "panel" : "devir" });
    } catch {
      return hata("transfer_bekliyor");
    }
    if (!r.ok) return r;
    await yanitTeslimi(motor, isletme, r.deger, an, cagir);
    return basarili(r.deger.deger);
  }
  const no = istekNoCoz(govde);
  if (!no.ok) return no;
  let hedef: PersonelHedefi | undefined;
  if (alt === "personel" && nesneMi(govde) && govde.hedef !== undefined) {
    const h = govde.hedef;
    const ph = await motor.mulkIslem(typeof h === "string" && h.startsWith("o") ? [h] : [], () => personelHedefi(k, h));
    if (!ph.ok) return ph;
    hedef = ph.deger;
  }
  let r: Sonuc<IsletmeYaniti>;
  try {
    r = await cagir({ islem: "komut", isletme, tapu, baglam, alt: alt as Komut, govde, ...(hedef ? { hedef } : {}), istekNo: no.deger });
  } catch {
    // Cevap kayboldu: işletme uygulamış olabilir. Aynı istekNo ile tekrar ya da işletme alarmı tamamlar (çift etki yok).
    return hata("transfer_bekliyor");
  }
  if (!r.ok) return r;
  await yanitTeslimi(motor, isletme, r.deger, an, cagir);
  return basarili({ ...(r.deger.deger as Record<string, unknown>), para: kar.pa });
}

export { mulkDefteri };
