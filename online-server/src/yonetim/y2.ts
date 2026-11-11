// Y3 telafi olayları: Kurucu gerekçeli akçe/eşya telafisi yapar; işlem dünya yönetim defterine yazılır,
// hedef karakterin kroniğine yalnız kendisinin görebildiği olay eklenir. Yönetici kendi hesap/hane kümesine
// telafi veremez. İstek kimliği yönetici + istekNo'dan türetilir; hedef YerlesimDO da aynı kimlikle tekrar güvenlidir.

import { istekNoCoz } from "../mantik.ts";
import { malBul } from "../icerik/mallar.ts";
import { kumeAnahtarlari, kumeKesisir } from "../siyaset/makam.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { govdeOzeti, hane, kayitHazirla, reddet, tekrar, yaz, yetkiIste, type Ek, type Oturum } from "./islem.ts";
import { gerekceCoz, hesapIdCoz } from "./yaptirim.ts";

/** [PARAMETRE] Telafi geçmişi sayfa boyu. */
export const TELAFI_SAYFASI = 50;
const TELAFI = "telafi:"; // + hedef DO'ya gönderilen kalıcı olay kimliği
const SIRA = "telafiNo:"; // + 12 hane → olay kimliği
const SAYAC = "sayac:telafi";

export interface TelafiKaydi {
  no: number;
  id: string;
  hedef: string;
  yerlesim: string;
  tur: "akce" | "esya";
  tutar?: number;
  mal?: string;
  adet?: number;
  kim: string;
  zaman: number;
  gerekce: string;
}

/** POST /yonetim/telafi: hedef kümesi kontrolü, YerlesimDO uygulaması ve kalıcı yönetim olayı. */
export async function telafiUygula(o: Oturum, govde: unknown): Promise<Sonuc<unknown>> {
  const g = typeof govde === "object" && govde !== null ? (govde as Record<string, unknown>) : {};
  const hedef = hesapIdCoz(g.hedef);
  const tur = g.tur === "akce" || g.tur === "esya" ? g.tur : undefined;
  const ek0: Ek = { ...(hedef ? { hedef } : {}), ayrinti: { tur: tur ?? "gecersiz" } };
  const red = await yetkiIste(o, "telafi", ek0);
  if (red) return red;
  const no = istekNoCoz(g);
  if (!no.ok) return reddet(o, "telafi", no.hata, ek0);
  if (!hedef) return reddet(o, "telafi", "hesap_yok", ek0);
  if (!tur) return reddet(o, "telafi", "deger_sinir_disi", ek0);
  const gerekce = gerekceCoz(g.gerekce);
  if (!gerekce.ok) return reddet(o, "telafi", gerekce.hata, ek0);
  let tutar: number | undefined;
  let mal: string | undefined;
  let adet: number | undefined;
  if (tur === "akce") {
    if (typeof g.tutar !== "number" || !Number.isInteger(g.tutar) || g.tutar < 1 || g.tutar > 10000) return reddet(o, "telafi", "deger_sinir_disi", ek0);
    tutar = g.tutar;
  } else {
    const m = malBul(g.mal);
    if (!m) return reddet(o, "telafi", "mal_gecersiz", ek0);
    if (typeof g.adet !== "number" || !Number.isInteger(g.adet) || g.adet < 1 || g.adet > 50) return reddet(o, "telafi", "deger_sinir_disi", ek0);
    mal = m;
    adet = g.adet;
  }
  const ek: Ek = { hedef, gerekce: gerekce.deger, ayrinti: { tur, ...(tutar !== undefined ? { tutar } : { mal, adet }) } };
  const onceki = await tekrar(o, no.deger);
  if (onceki) return onceki;

  const kimlikOku = o.b.siyasiKimlikOku;
  const telafiYaz = o.b.telafiYaz;
  if (!kimlikOku || !telafiYaz) return reddet(o, "telafi", "yapilandirma_eksik", ek);
  let yoneticiProfil: Awaited<ReturnType<typeof o.b.oyuncuBul>>;
  let hedefProfil: Awaited<ReturnType<typeof o.b.oyuncuBul>>;
  try {
    [yoneticiProfil, hedefProfil] = await Promise.all([
      o.b.oyuncuBul({ hesap: o.y.hesap }),
      o.b.oyuncuBul({ hesap: hedef }),
    ]);
  } catch {
    return reddet(o, "telafi", "sunucu_hatasi", ek);
  }
  if (!yoneticiProfil.ok) return reddet(o, "telafi", "hesap_yok", ek);
  if (!hedefProfil.ok) return reddet(o, "telafi", "kisi_yok", ek);
  let yoneticiKimlik: Awaited<ReturnType<typeof kimlikOku>>;
  let hedefKimlik: Awaited<ReturnType<typeof kimlikOku>>;
  try {
    [yoneticiKimlik, hedefKimlik] = await Promise.all([
      kimlikOku(o.y.hesap, yoneticiProfil.deger.yerlesim),
      kimlikOku(hedef, hedefProfil.deger.yerlesim),
    ]);
  } catch {
    return reddet(o, "telafi", "sunucu_hatasi", ek);
  }
  if (!yoneticiKimlik.ok || !hedefKimlik.ok) return reddet(o, "telafi", "hedef_uygun_degil", ek);
  if (kumeKesisir(kumeAnahtarlari(yoneticiKimlik.deger), kumeAnahtarlari(hedefKimlik.deger))) {
    return reddet(o, "telafi", "kendi_hedef", ek);
  }

  // Yönetici + istekNo karması: farklı yöneticiler aynı hedef karakterin idempotency anahtarını çakıştıramaz.
  const olayId = "t" + await govdeOzeti({ yonetici: o.y.eposta, istekNo: no.deger });
  const hedefGovde = {
    tur,
    gerekce: gerekce.deger,
    istekNo: olayId,
    ...(tutar !== undefined ? { tutar } : { mal: mal!, adet: adet! }),
  };
  let uygulama: Sonuc<unknown>;
  try {
    uygulama = await telafiYaz(hedefProfil.deger.yerlesim, hedef, hedefGovde);
  } catch {
    return reddet(o, "telafi", "sunucu_hatasi", ek);
  }
  if (!uygulama.ok) return reddet(o, "telafi", uygulama.hata, ek);

  const sayac = ((await o.b.depo.al<number>(SAYAC)) ?? 0) + 1;
  const kayit: TelafiKaydi = {
    no: sayac, id: olayId, hedef, yerlesim: hedefProfil.deger.yerlesim, tur,
    ...(tutar !== undefined ? { tutar } : { mal, adet }),
    kim: o.y.eposta, zaman: o.b.simdi, gerekce: gerekce.deger,
  };
  const sonuc = basarili({ telafi: kayit, uygulama: uygulama.deger });
  await yaz(o, no.deger, "telafi", ek, { [SAYAC]: sayac, [SIRA + hane(sayac)]: olayId, [TELAFI + olayId]: kayit }, sonuc);
  return sonuc;
}

/** GET /yonetim/telafiler?imlec=: telafi WorldEvent defteri (yeniden eskiye). */
export async function telafiListesi(o: Oturum, sorgu: Record<string, string | null>): Promise<Sonuc<unknown>> {
  const red = await yetkiIste(o, "telafiler");
  if (red) return red;
  const toplam = (await o.b.depo.al<number>(SAYAC)) ?? 0;
  let ust = toplam;
  if (sorgu.imlec) {
    const n = Number(sorgu.imlec);
    if (!Number.isInteger(n) || n < 1) return reddet(o, "telafiler", "imlec_gecersiz");
    ust = Math.min(n - 1, toplam);
  }
  const nolar: number[] = [];
  for (let i = ust; i >= 1 && nolar.length < TELAFI_SAYFASI; i--) nolar.push(i);
  const sira = await o.b.depo.alCok<string>(nolar.map((i) => SIRA + hane(i)));
  const idler = nolar.flatMap((i) => sira.get(SIRA + hane(i)) ?? []);
  const kayitlar = await o.b.depo.alCok<TelafiKaydi>(idler.map((id) => TELAFI + id));
  const telafiler = idler.flatMap((id) => kayitlar.get(TELAFI + id) ?? []);
  await o.b.depo.koy(await kayitHazirla(o, "telafiler", "tamam", {}));
  return basarili({ telafiler, toplam, imlec: nolar.at(-1) ?? null, dahaVar: (nolar.at(-1) ?? 0) > 1 });
}
