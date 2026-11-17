// Y3 telafi olayları: yönetici gerekçeli akçe/mal telafisi yapar (verir ya da alır); işlem dünya yönetim defterine
// yazılır, hedef karakterin kroniğine yalnız kendisinin görebildiği olay eklenir. İstek kimliği yönetici + istekNo'dan
// türetilir; hedef YerlesimDO da aynı kimlikle tekrar güvenlidir.
//
// Kurucu hiçbir şeyle sınırlanmaz (Berkay kuralı): tutar teknik sınıra kadar, günlük tavan yok, kendi hesabı ve kendi
// hane kümesi dahil herkese verir/alır. Moderatör: işlem başına TELAFI_ISLEM_*, kişisel günlük tavan (kurucu belirler;
// verme + alma mutlak toplamı) ve kendine-fayda yasağı (kendi hesabı ya da hane kümesi hedef olamaz).
// Alma (yon: "al") cüzdanı sıfırın altına indirmez, adlı eşyayı düşürmez; gerçekte alınan `uygulanan` kayda girer.
// Geri alma (telafiGeri): kaydın uygulanan miktarı ters yönde uygulanır; bir kayıt bir kez geri alınır.

import { istekNoCoz } from "../mantik.ts";
import { malBul } from "../icerik/mallar.ts";
import { kumeAnahtarlari, kumeKesisir } from "../siyaset/makam.ts";
import { TELAFI_TEKNIK_ADET, TELAFI_TEKNIK_AKCE } from "../yerlesim/motor.ts";
import { basarili, type Sonuc } from "../tipler.ts";
import { govdeOzeti, hane, kayitHazirla, kimlikOzeti, kurucuMu, reddet, tekrar, yaz, yetkiIste, type Ek, type Oturum } from "./islem.ts";
import { gerekceCoz, hesapIdCoz } from "./yaptirim.ts";
import { trGunu, type GunlukSayac } from "./sikayet.ts";
import { MOD_TELAFI_TAVAN_EN_COK } from "./yetki.ts";

/** [PARAMETRE] Telafi geçmişi sayfa boyu. */
export const TELAFI_SAYFASI = 50;
const TELAFI = "telafi:"; // + hedef DO'ya gönderilen kalıcı olay kimliği
const SIRA = "telafiNo:"; // + 12 hane → olay kimliği
const SAYAC = "sayac:telafi";
const GERI_KILIT = "telafiGeriKilit:"; // + kayıt no → {kim, istekNo} (eşzamanlı iki geri almayı önler)
/** [PARAMETRE] Moderatör kişisel tavanının üst sınırı (günlük akçe); kurucuya tavan yoktur. */
export const TELAFI_GUNLUK_AKCE = MOD_TELAFI_TAVAN_EN_COK;
/** [PARAMETRE] Moderatörün işlem başına telafi sınırı (akçe ve mal adedi). */
export const TELAFI_ISLEM_AKCE = 10_000;
export const TELAFI_ISLEM_ADET = 50;
const GUNLUK = "telafiGunluk:"; // + yönetici sub → {gun, n: verme + alma mutlak akçe toplamı}

/** Saf: tutar bugünkü toplama eklenebiliyorsa yeni sayaç; değilse undefined. */
export function telafiGunlukEkle(onceki: GunlukSayac | undefined, simdi: number, tutar: number, tavan = TELAFI_GUNLUK_AKCE): GunlukSayac | undefined {
  const gun = trGunu(simdi);
  const n = onceki && onceki.gun === gun ? onceki.n : 0;
  return n + tutar <= tavan ? { gun, n: n + tutar } : undefined;
}

export type TelafiYonu = "ver" | "al";

export interface TelafiKaydi {
  no: number;
  id: string;
  hedef: string;
  hedefAd: string;
  yerlesim: string;
  tur: "akce" | "esya";
  /** Eski kayıtta yok → "ver". */
  yon?: TelafiYonu;
  tutar?: number;
  mal?: string;
  adet?: number;
  /** Gerçekte uygulanan miktar (alma cüzdan/envanterle kırpılır). Eski kayıtta yok → tutar/adet. */
  uygulanan?: number;
  kim: string;
  zaman: number;
  gerekce: string;
  /** Bu kayıt bir geri almaysa geri alınan kaydın numarası. */
  geriNo?: number;
  /** Bu kayıt geri alındıysa: geri alma kaydının numarası, kim, ne zaman. */
  geri?: { no: number; kim: string; zaman: number };
}

interface TelafiGirdisi {
  hedef: string;
  tur: "akce" | "esya";
  yon: TelafiYonu;
  tutar?: number;
  mal?: string;
  adet?: number;
  gerekce: string;
}

/** Moderatörün işlem başı sınırı; kurucuda teknik sınır. */
function miktarSiniri(o: Oturum, tur: "akce" | "esya"): number {
  if (kurucuMu(o)) return tur === "akce" ? TELAFI_TEKNIK_AKCE : TELAFI_TEKNIK_ADET;
  return tur === "akce" ? TELAFI_ISLEM_AKCE : TELAFI_ISLEM_ADET;
}

/**
 * Ortak telafi akışı: hedef ve (moderatörde) küme denetimi, moderatör günlük payı, YerlesimDO uygulaması, yazmadan önce
 * tekrar denetimi ve kalıcı kayıt. `geri` verilirse o kayıt geri alınmış olarak işaretlenir.
 */
async function telafiCalistir(o: Oturum, islem: "telafi" | "telafiGeri", no: string, t: TelafiGirdisi, ek: Ek, geri?: TelafiKaydi): Promise<Sonuc<unknown>> {
  const kurucu = kurucuMu(o);
  const kimlikOku = o.b.siyasiKimlikOku;
  const telafiYaz = o.b.telafiYaz;
  if (!telafiYaz || (!kurucu && !kimlikOku)) return reddet(o, islem, "yapilandirma_eksik", ek);
  let yoneticiProfil: Awaited<ReturnType<typeof o.b.oyuncuBul>> | undefined;
  let hedefProfil: Awaited<ReturnType<typeof o.b.oyuncuBul>>;
  try {
    [yoneticiProfil, hedefProfil] = await Promise.all([
      kurucu ? Promise.resolve(undefined) : o.b.oyuncuBul({ hesap: o.y.hesap }),
      o.b.oyuncuBul({ hesap: t.hedef }),
    ]);
  } catch {
    return reddet(o, islem, "sunucu_hatasi", ek);
  }
  if (!hedefProfil.ok) return reddet(o, islem, "kisi_yok", ek);
  if (!kurucu) {
    // Moderatör: oyun karakteri olmayan da telafi verebilir (kümesi boştur); kendi hesabı ve kümesi hedef olamaz.
    if (yoneticiProfil && !yoneticiProfil.ok && yoneticiProfil.hata !== "kisi_yok") return reddet(o, islem, "hesap_yok", ek);
    if (t.hedef === o.y.hesap) return reddet(o, islem, "kendi_hedef", ek);
    let yk: Awaited<ReturnType<NonNullable<typeof kimlikOku>>> | undefined;
    let hk: Awaited<ReturnType<NonNullable<typeof kimlikOku>>>;
    try {
      [yk, hk] = await Promise.all([
        yoneticiProfil?.ok ? kimlikOku!(o.y.hesap, yoneticiProfil.deger.yerlesim) : Promise.resolve(undefined),
        kimlikOku!(t.hedef, hedefProfil.deger.yerlesim),
      ]);
    } catch {
      return reddet(o, islem, "sunucu_hatasi", ek);
    }
    if ((yk && !yk.ok) || !hk.ok) return reddet(o, islem, "hedef_uygun_degil", ek);
    if (yk?.ok && kumeKesisir(kumeAnahtarlari(yk.deger), kumeAnahtarlari(hk.deger))) return reddet(o, islem, "kendi_hedef", ek);
  }

  // Yönetici + istekNo karması: farklı yöneticiler aynı hedef karakterin idempotency anahtarını çakıştıramaz.
  const olayId = "t" + await govdeOzeti({ yonetici: o.y.eposta, istekNo: no });
  const hedefGovde = {
    tur: t.tur, yon: t.yon, gerekce: t.gerekce, istekNo: olayId,
    ...(t.tutar !== undefined ? { tutar: t.tutar } : { mal: t.mal!, adet: t.adet! }),
  };
  // Moderatörün günlük akçe payı ve geri alma kilidi, dış çağrıdan (await) ÖNCE ayrılır ki eşzamanlı istekler tavanı
  // aşamasın / bir kaydı iki kez geri almasın; uygulama başarısızsa bırakılır.
  const gunlukAnahtar = GUNLUK + o.y.sub;
  const pay = !kurucu && t.tutar !== undefined ? t.tutar : 0;
  if (pay > 0) {
    const yeni = telafiGunlukEkle(await o.b.depo.al<GunlukSayac>(gunlukAnahtar), o.b.simdi, pay, Math.min(o.modTavan ?? 0, TELAFI_GUNLUK_AKCE));
    if (!yeni) return reddet(o, islem, "telafi_gunluk_siniri", ek);
    await o.b.depo.koy({ [gunlukAnahtar]: yeni });
  }
  const kilit = geri ? GERI_KILIT + geri.no : undefined;
  if (kilit) {
    const k = await o.b.depo.al<{ kim: string; istekNo: string }>(kilit);
    if (k && (k.kim !== o.y.eposta || k.istekNo !== no)) {
      await payBirak(o, gunlukAnahtar, pay);
      return reddet(o, islem, "geri_yok", ek);
    }
    await o.b.depo.koy({ [kilit]: { kim: o.y.eposta, istekNo: no } });
  }
  const birak = async (): Promise<void> => {
    await payBirak(o, gunlukAnahtar, pay);
    if (kilit) await o.b.depo.sil([kilit]);
  };
  let uygulama: Sonuc<unknown>;
  try {
    uygulama = await telafiYaz(hedefProfil.deger.yerlesim, t.hedef, hedefGovde);
  } catch {
    await birak();
    return reddet(o, islem, "sunucu_hatasi", ek);
  }
  if (!uygulama.ok) {
    await birak();
    return reddet(o, islem, uygulama.hata, ek);
  }

  // Yalnız depolama: aynı istekNo ile eşzamanlı gelen istek önce yazdıysa onun sonucu döner (YerlesimDO tekrarı
  // olay kimliğiyle tek uygulandı); bu isteğin ayırdığı pay bırakılır.
  const yarisan = await tekrar(o, no);
  if (yarisan) {
    await payBirak(o, gunlukAnahtar, pay);
    return yarisan;
  }
  const deger = typeof uygulama.deger === "object" && uygulama.deger !== null ? (uygulama.deger as Record<string, unknown>) : {};
  const istenen = t.tutar ?? t.adet ?? 0;
  const uygulanan = typeof deger.uygulanan === "number" ? deger.uygulanan : istenen;
  // Alma kırpıldıysa moderatör payından fark düşülür (yalnız gerçekte taşınan sayılır).
  if (pay > uygulanan) await payBirak(o, gunlukAnahtar, pay - uygulanan);
  const sayac = ((await o.b.depo.al<number>(SAYAC)) ?? 0) + 1;
  const kayit: TelafiKaydi = {
    no: sayac, id: olayId, hedef: t.hedef, hedefAd: hedefProfil.deger.ad, yerlesim: hedefProfil.deger.yerlesim, tur: t.tur, yon: t.yon,
    ...(t.tutar !== undefined ? { tutar: t.tutar } : { mal: t.mal!, adet: t.adet! }),
    uygulanan, kim: o.y.eposta, zaman: o.b.simdi, gerekce: t.gerekce,
    ...(geri ? { geriNo: geri.no } : {}),
  };
  const degisiklik: Record<string, unknown> = { [SAYAC]: sayac, [SIRA + hane(sayac)]: olayId, [TELAFI + olayId]: kayit };
  if (geri) degisiklik[TELAFI + geri.id] = { ...geri, geri: { no: sayac, kim: o.y.eposta, zaman: o.b.simdi } } satisfies TelafiKaydi;
  const sonuc = basarili({ telafi: kayit, uygulama: uygulama.deger });
  await yaz(o, no, islem, { ...ek, ayrinti: { ...ek.ayrinti, no: sayac, uygulanan } }, degisiklik, sonuc);
  if (kilit) await o.b.depo.sil([kilit]);
  return sonuc;
}

async function payBirak(o: Oturum, anahtar: string, tutar: number): Promise<void> {
  if (tutar <= 0) return;
  const d = await o.b.depo.al<GunlukSayac>(anahtar);
  if (d && d.gun === trGunu(o.b.simdi)) await o.b.depo.koy({ [anahtar]: { gun: d.gun, n: Math.max(0, d.n - tutar) } });
}

/** POST /yonetim/telafi {hedef, tur: akce|esya, yon?: ver|al, tutar | mal+adet, gerekce, istekNo}. */
export async function telafiUygula(o: Oturum, govde: unknown): Promise<Sonuc<unknown>> {
  const g = typeof govde === "object" && govde !== null ? (govde as Record<string, unknown>) : {};
  const hedef = hesapIdCoz(g.hedef);
  const tur = g.tur === "akce" || g.tur === "esya" ? g.tur : undefined;
  const yon: TelafiYonu | undefined = g.yon === undefined || g.yon === "ver" ? "ver" : g.yon === "al" ? "al" : undefined;
  const ek0: Ek = { ...(hedef ? { hedef } : {}), ayrinti: { tur: tur ?? "gecersiz", yon: yon ?? "gecersiz" } };
  const red = await yetkiIste(o, "telafi", ek0);
  if (red) return red;
  const no = istekNoCoz(g);
  if (!no.ok) return reddet(o, "telafi", no.hata, ek0);
  if (!hedef) return reddet(o, "telafi", "hesap_yok", ek0);
  if (!tur || !yon) return reddet(o, "telafi", "deger_sinir_disi", ek0);
  const gerekce = gerekceCoz(g.gerekce);
  if (!gerekce.ok) return reddet(o, "telafi", gerekce.hata, ek0);
  const sinir = miktarSiniri(o, tur);
  const t: TelafiGirdisi = { hedef, tur, yon, gerekce: gerekce.deger };
  if (tur === "akce") {
    if (typeof g.tutar !== "number" || !Number.isInteger(g.tutar) || g.tutar < 1 || g.tutar > sinir) return reddet(o, "telafi", "deger_sinir_disi", { ...ek0, ayrinti: { tur, yon, tutar: g.tutar, sinir } });
    t.tutar = g.tutar;
  } else {
    const m = malBul(g.mal);
    if (!m) return reddet(o, "telafi", "mal_gecersiz", ek0);
    if (typeof g.adet !== "number" || !Number.isInteger(g.adet) || g.adet < 1 || g.adet > sinir) return reddet(o, "telafi", "deger_sinir_disi", { ...ek0, ayrinti: { tur, yon, adet: g.adet, sinir } });
    t.mal = m;
    t.adet = g.adet;
  }
  const ek: Ek = { hedef, gerekce: gerekce.deger, ayrinti: { tur, yon, ...(t.tutar !== undefined ? { tutar: t.tutar } : { mal: t.mal, adet: t.adet }) } };
  const onceki = await tekrar(o, no.deger);
  if (onceki) return onceki;
  return telafiCalistir(o, "telafi", no.deger, t, ek);
}

/** POST /yonetim/telafi-geri {no, gerekce, istekNo}: telafi kaydını ters yönde uygular (bir kez). */
export async function telafiGeri(o: Oturum, govde: unknown): Promise<Sonuc<unknown>> {
  const g = typeof govde === "object" && govde !== null ? (govde as Record<string, unknown>) : {};
  const kayitNo = typeof g.no === "number" && Number.isInteger(g.no) && g.no >= 1 ? g.no : undefined;
  const ek0: Ek = { ayrinti: { no: kayitNo ?? null } };
  const red = await yetkiIste(o, "telafiGeri", ek0);
  if (red) return red;
  const no = istekNoCoz(g);
  if (!no.ok) return reddet(o, "telafiGeri", no.hata, ek0);
  if (kayitNo === undefined) return reddet(o, "telafiGeri", "islem_yok", ek0);
  const gerekce = gerekceCoz(g.gerekce);
  if (!gerekce.ok) return reddet(o, "telafiGeri", gerekce.hata, ek0);
  const onceki = await tekrar(o, no.deger);
  if (onceki) return onceki;
  const id = await o.b.depo.al<string>(SIRA + hane(kayitNo));
  const kayit = id ? await o.b.depo.al<TelafiKaydi>(TELAFI + id) : undefined;
  if (!kayit) return reddet(o, "telafiGeri", "islem_yok", ek0);
  const miktar = kayit.uygulanan ?? kayit.tutar ?? kayit.adet ?? 0;
  const ek: Ek = { hedef: kayit.hedef, gerekce: gerekce.deger, ayrinti: { no: kayitNo, tur: kayit.tur, yon: (kayit.yon ?? "ver") === "ver" ? "al" : "ver", miktar } };
  // Bir kayıt bir kez geri alınır; geri alma kaydı yeniden geri alınmaz; hiçbir şey taşımamış kayıt geri alınmaz.
  if (kayit.geri || kayit.geriNo !== undefined || miktar < 1) return reddet(o, "telafiGeri", "geri_yok", ek);
  if (miktar > miktarSiniri(o, kayit.tur)) return reddet(o, "telafiGeri", "deger_sinir_disi", ek);
  const t: TelafiGirdisi = {
    hedef: kayit.hedef, tur: kayit.tur, yon: (kayit.yon ?? "ver") === "ver" ? "al" : "ver", gerekce: gerekce.deger,
    ...(kayit.tur === "akce" ? { tutar: miktar } : { mal: kayit.mal!, adet: miktar }),
  };
  return telafiCalistir(o, "telafiGeri", no.deger, t, ek, kayit);
}

/** GET /yonetim/telafiler?imlec=: telafi WorldEvent defteri (yeniden eskiye); hedef adı ve oyuncu numarasıyla. */
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
  const ham = idler.flatMap((id) => kayitlar.get(TELAFI + id) ?? []);
  const kimlik = await kimlikOzeti(o.b, ham.map((k) => k.hedef));
  const telafiler = ham.map((k) => ({ ...k, yon: k.yon ?? "ver", hedefNumara: kimlik[k.hedef]?.numara ?? null }));
  await o.b.depo.koy(await kayitHazirla(o, "telafiler", "tamam", {}));
  return basarili({ telafiler, toplam, imlec: nolar.at(-1) ?? null, dahaVar: (nolar.at(-1) ?? 0) > 1 });
}
