// HesapDO: Google `sub` başına bir örnek. Hesap, profil, yerleşim işaretçisi, istekNo defteri (tekrar güvenliği)
// ve hız sınırı. Yerleşim uçları buradan oyuncunun YerlesimDO'suna iletilir (hız sınırı burada uygulanır).
// Yaptırım: YonetimDO'nun yazdığı etkin özet burada her iletiden önce uygulanır (giriş hariç).
// İnce sarmalayıcıdır; kurallar mantik.ts ve yonetim/yaptirim.ts'dedir.

import { doDepo, type Depo } from "./depo.ts";
import { dunyaCagir, hesapCagir, iletiOku, jsonYanit, yerlesimCagir, yonetimCagir } from "./ic.ts";
import { girisKaydet, hesapKaydi, hizKontrol, profilGetir, profilOlustur, sakinKaydi, yerlesimeIlet, HIZ_SINIRI, SES_HIZ_SINIRI, type HizDurumu, type YerlesimIstegi } from "./mantik.ts";
import { basarili, hata, type Env, type HesapIleti, type HesapYaptirimi, type Profil, type Sonuc, type YerlesimIleti } from "./tipler.ts";
import type { MasaIleti } from "./han/tipler.ts";
import { uzaklastirmaBilgisi, yaptirimEngeli } from "./yonetim/yaptirim.ts";
import { engeliMasayaBildir, hanEylemi, hanIkrami, hanPanoYaz, hanZiyafeti, hanListesi, hanSesi, masaBileti, yaptirimiMasayaBildir, type HanHesapBaglami } from "./han/hesap-kopru.ts";
import { masaCagir } from "./han/ic.ts";
import { ikramOdeyici } from "./han/yerlesim-kopru.ts";
import * as debdebe from "./debdebe/hesap.ts";
import { yapilandirilmamisDogrulayici, type MakbuzDogrulayici } from "./debdebe/makbuz.ts";
import { SEZON_KAYNAK_PUANI } from "./debdebe/sezon.ts";
import { siyasetOku, siyasetYaz, siyasetYoklama } from "./siyaset/hesap-kopru.ts";
import { adiTazele, ARAMA_DAKIKA_SINIRI, benimNumaram, oyuncuAra, oyuncuSayfasi, type KunyeBaglami } from "./kunye/hesap.ts";
import { emanetCek, emanetOnizle, GOC_IS, gocBaslat, gocOnizle, gocSiyasetKapilari, gocSurdur, type GocBaglami } from "./goc-hesap.ts";

/** Göç işi beklerken de çalışan uçlar (yerleşime gitmeyen ya da işi kendisi sürdürenler). */
const GOC_SIRASINDA_SERBEST: ReadonlySet<string> = new Set(["giris", "profil", "profilOlustur", "duyurular", "davetOlustur", "davetCoz", "goc", "gocOnizle"]);

const YAPTIRIM = "yaptirim";
const OTURUM_SURUMU = "oturumSurumu";
/** [PARAMETRE] Yönetim parametrelerinin (hız sınırı) HesapDO belleğinde tutulduğu süre. */
export const PARAMETRE_ONBELLEK_MS = 60_000;

export class HesapDO {
  readonly #depo: Depo;
  readonly #env: Env;
  /** Bellekte tutulur: örnek uykuya geçince sıfırlanması zararsızdır, depolamaya yazım harcamaz. */
  #hiz: HizDurumu | undefined;
  #sesHiz: HizDurumu | undefined;
  /** Künye arama/sayfa uçlarının ayrı, dar dakikalık kovası (bellekte; günlük tavanlar depoda). */
  #aramaHiz: HizDurumu | undefined;
  /** Yaptırım özeti önbelleği: bu örnek tek yazandır, bu yüzden tutarlıdır. null = yok. */
  #yaptirim: HesapYaptirimi | null | undefined;
  /** Etkin hız sınırı önbelleği (YonetimDO'dan; erişilemezse varsayılan). Bellekte, kısa süreli. */
  #parametre: { sinir: number; son: number } | undefined;
  /** Oturum sürümü önbelleği: bu örnek tek yazandır. */
  #oturumSurumu: number | undefined;

  readonly #dogrulayici: MakbuzDogrulayici;

  /** `secenek.dogrulayici`: yalnız testte sahte mağaza doğrulayıcısı; üretimde mağaza bağlantısı (yapılandırılmamış). */
  constructor(ctx: DurableObjectState, env: Env, secenek: { dogrulayici?: MakbuzDogrulayici } = {}) {
    this.#depo = doDepo(ctx.storage);
    this.#env = env;
    this.#dogrulayici = secenek.dogrulayici ?? yapilandirilmamisDogrulayici;
  }

  async fetch(istek: Request): Promise<Response> {
    const ileti = await iletiOku<HesapIleti>(istek);
    if (!ileti) return jsonYanit(hata("gecersiz_istek"));
    const simdi = Date.now();
    // Yönetimin iç yazımı oyuncunun hız sınırına takılmaz.
    if (ileti.islem === "yaptirimYaz") return jsonYanit(await this.#yaptirimYaz(ileti.durum, ileti.hesapId));
    // Debdebe iç iletileri (başka HesapDO ya da YonetimDO): hız sınırı ve yaptırım uygulanmaz.
    if (ileti.islem === "debdebeRozet") return jsonYanit(await debdebe.rozetAl(this.#depo, ileti.rozet));
    if (ileti.islem === "debdebeRozetSil") return jsonYanit(await debdebe.rozetKaldir(this.#depo, ileti.id));
    if (ileti.islem === "debdebeGorunum") return jsonYanit(await debdebe.gorunumVer(this.#depo, simdi));
    if (ileti.islem === "debdebeIade") return jsonYanit(await debdebe.iadeIsle(this.#debdebe(ileti.hesapId, simdi), ileti.islemKimligi));
    // Hız sınırı, YonetimDO'ya gitmeden önce bellekteki son bilinen sınırla uygulanır (reddedilen istek
    // tek YonetimDO'ya yük bindirmez). Önbellek eskiyse yalnız geçen istek parametreyi tazeler.
    if (ileti.islem === "hanSes") {
      const ses = hizKontrol(this.#sesHiz, simdi, SES_HIZ_SINIRI);
      this.#sesHiz = ses.durum;
      if (!ses.izin) return jsonYanit(hata("hiz_siniri"));
    } else {
      const hiz = hizKontrol(this.#hiz, simdi, this.#parametre?.sinir ?? HIZ_SINIRI);
      this.#hiz = hiz.durum;
      if (!hiz.izin) return jsonYanit(hata("hiz_siniri"));
    }
    if (!this.#parametre || this.#parametre.son <= simdi) await this.#parametreTazele(simdi);
    if (typeof ileti.oturumSurumu === "number" && ileti.oturumSurumu !== (await this.#oturumSurumuOku())) {
      return jsonYanit(hata("oturum_gecersiz"));
    }
    if (ileti.islem === "oturumlariKapat") return jsonYanit(await this.#oturumlariKapat());
    const yaptirim = await this.#yaptirimDurumu();
    const engel = yaptirimEngeli(yaptirim, ileti.islem, simdi);
    if (engel) return jsonYanit(engel);
    if (ileti.islem === "giris") {
      const g = await girisKaydet(this.#depo, ileti.hesapId, ileti.sub, simdi);
      await this.#numaraHazirla(ileti.hesapId, simdi);
      const uzak = uzaklastirmaBilgisi(yaptirim, simdi);
      const surum = await this.#oturumSurumuOku();
      return jsonYanit(basarili({ ...g, ...(uzak ? { uzaklastirma: uzak } : {}), ...(surum > 0 ? { oturumSurumu: surum } : {}) }));
    }
    const sonuc = await this.#isle(ileti, simdi);
    // Sezon Defteri: başarılı oyun yazması oynayarak ilerletir (günlük tavan, istekNo izi; yalnız kozmetik ödül).
    if (sonuc.ok && "govde" in ileti && Object.hasOwn(SEZON_KAYNAK_PUANI, ileti.islem)) {
      try {
        await debdebe.sezonaYaz(this.#depo, simdi, ileti.islem, ileti.govde);
      } catch {
        // en iyi çaba
      }
    }
    return jsonYanit(sonuc);
  }

  /** Oyuncu numarası tembel üretilir (ilk giriş, profil kurulumu); en iyi çaba: hata girişi bozmaz. */
  async #numaraHazirla(hesapId: string, simdi: number, tazele = false): Promise<void> {
    try {
      const b = this.#kunye(hesapId, simdi);
      // Profil numaradan sonra kurulduysa dünya kaydı adı dizine de sokar (numaraAl tekrar güvenlidir).
      if (tazele) await b.dunya({ islem: "numaraAl", hesapId });
      await benimNumaram(b);
    } catch {
      // en iyi çaba: numara ilk `GET /v1/numara`da yine üretilir
    }
  }

  #kunye(hesapId: string, simdi: number): KunyeBaglami {
    const env = this.#env;
    return { depo: this.#depo, hesapId, simdi, dunya: (i) => dunyaCagir(env, i), yerlesim: (i) => yerlesimCagir(env, i) };
  }

  /** Künye arama kovası: genel hız sınırına ek olarak dakikada ARAMA_DAKIKA_SINIRI. */
  #aramaIzni(simdi: number): boolean {
    const r = hizKontrol(this.#aramaHiz, simdi, ARAMA_DAKIKA_SINIRI);
    this.#aramaHiz = r.durum;
    return r.izin;
  }

  #debdebe(hesapId: string, simdi: number): debdebe.DebdebeBaglami {
    const env = this.#env;
    return {
      depo: this.#depo,
      hesapId,
      simdi,
      acik: env.DEBDEBE_ACIK === "1",
      testMakbuz: env.DEBDEBE_TEST_MAKBUZ === "1",
      dogrulayici: this.#dogrulayici,
      defter: (kayit) => yonetimCagir(env, { islem: "debdebeKayit", kayit }),
      yerlesime: (i) => this.#yerlesime(i),
      yerlesimeDogrudan: (yerlesim, i) => yerlesimCagir(env, { ...i, yerlesim } as YerlesimIleti),
      hesaba: (hedef, i) => hesapCagir(env, hedef, i),
      levhaya: (yazim) => dunyaCagir(env, { islem: "levhaYaz", yazim }),
      levhaGetir: (beylik) => dunyaCagir(env, { islem: "levhaOku", beylik }),
      ...(env.MASA ? { masaCagir: (ad: string, i: MasaIleti) => masaCagir(env, ad, i) } : {}),
    };
  }

  async #parametreTazele(simdi: number): Promise<void> {
    let sinir = HIZ_SINIRI;
    try {
      const calisma = await yonetimCagir(this.#env, { islem: "parametrelerCalisma" });
      if (calisma.ok && typeof calisma.deger === "object" && calisma.deger !== null) {
        const etkinSinir = (calisma.deger as Record<string, unknown>).HIZ_SINIRI;
        if (typeof etkinSinir === "number") sinir = etkinSinir;
      }
    } catch {
      // Yönetim DO erişilemezse hesap varsayılan hız sınırını kullanır (aynı süre önbelleklenir).
    }
    this.#parametre = { sinir, son: simdi + PARAMETRE_ONBELLEK_MS };
  }

  async #oturumSurumuOku(): Promise<number> {
    if (this.#oturumSurumu === undefined) {
      const d = await this.#depo.al<number>(OTURUM_SURUMU);
      this.#oturumSurumu = typeof d === "number" && Number.isSafeInteger(d) && d >= 0 ? d : 0;
    }
    return this.#oturumSurumu;
  }

  /** Bütün oturumları kapatır: sürüm artar, eski sürümü taşıyan her belirteç reddedilir (çağıranınki dahil). */
  async #oturumlariKapat(): Promise<Sonuc<{ kapatildi: true }>> {
    if (!(await hesapKaydi(this.#depo))) return hata("hesap_yok");
    const yeni = (await this.#oturumSurumuOku()) + 1;
    await this.#depo.koy({ [OTURUM_SURUMU]: yeni });
    this.#oturumSurumu = yeni;
    return basarili({ kapatildi: true });
  }

  async #yaptirimDurumu(): Promise<HesapYaptirimi | undefined> {
    if (this.#yaptirim === undefined) this.#yaptirim = (await this.#depo.al<HesapYaptirimi>(YAPTIRIM)) ?? null;
    return this.#yaptirim ?? undefined;
  }

  async #yaptirimYaz(durum: unknown, hesapId: string): Promise<Sonuc<unknown>> {
    if (typeof durum !== "object" || durum === null) return hata("gecersiz_istek");
    if (!(await hesapKaydi(this.#depo))) return hata("hesap_yok");
    const d = durum as HesapYaptirimi;
    const temiz: HesapYaptirimi = {
      ...(d.uzaklastirma ? { uzaklastirma: { bitis: d.uzaklastirma.bitis ?? null } } : {}),
      ...(d.susturma ? { susturma: { bitis: d.susturma.bitis ?? null } } : {}),
    };
    await this.#depo.koy({ [YAPTIRIM]: temiz });
    this.#yaptirim = temiz;
    if (this.#env.MASA) await yaptirimiMasayaBildir({ depo: this.#depo, hesapId, masaCagir: (ad, i) => masaCagir(this.#env, ad, i) }, temiz);
    return basarili(temiz);
  }

  async #isle(ileti: HesapIleti, simdi: number): Promise<Sonuc<unknown>> {
    // Göç (D1): yarım kalmış iş önce sürdürülür; hâlâ bekliyorsa yerleşime giden uçlar `goc_suruyor` döner.
    if (!GOC_SIRASINDA_SERBEST.has(ileti.islem) && (await this.#depo.al(GOC_IS))) {
      const r = await gocSurdur(this.#goc(ileti.hesapId, simdi));
      if (r.durum === "bekliyor") return hata("goc_suruyor");
    }
    switch (ileti.islem) {
      case "goc":
        return gocBaslat(this.#goc(ileti.hesapId, simdi), ileti.govde);
      case "gocOnizle":
        return gocOnizle(this.#goc(ileti.hesapId, simdi), ileti.hedef);
      case "gocEmanetOnizle":
        return emanetOnizle(this.#goc(ileti.hesapId, simdi));
      case "gocEmanet":
        return emanetCek(this.#goc(ileti.hesapId, simdi), ileti.govde);
      case "giris":
        return basarili(await girisKaydet(this.#depo, ileti.hesapId, ileti.sub, simdi));
      case "sikayet":
        // Şikayet eden kayıtlı oyuncu olmalıdır; kurallar YonetimDO'da.
        {
          const profil = await profilGetir(this.#depo);
          if (!profil.ok) return profil;
        }
        {
          // Profil yalnız yerel oyuncu kimliği (`o12`) verir: şikayet edenin yerleşiminde hesap kimliğine çözülür.
          // Hesap kimliği biçimi (eski) olduğu gibi geçer.
          const g = ileti.govde;
          // H10: ilan şikâyeti {ilan: "p12", neden, aciklama?, istekNo}: hedef ilanın sahibidir, ilan metni kayda girer.
          if (typeof g === "object" && g !== null && !Array.isArray(g) && typeof (g as { ilan?: unknown }).ilan === "string") {
            const r = await this.#yerlesime({ islem: "hanPanoIlan", hesapId: ileti.hesapId, ilan: (g as { ilan: string }).ilan });
            if (!r.ok) return r;
            const ilan = r.deger as { hesap: string; id: string; metin: string };
            return yonetimCagir(this.#env, { islem: "sikayetEkle", sikayetci: ileti.hesapId, govde: { ...g, hedef: ilan.hesap }, ilan: { id: ilan.id, metin: ilan.metin } });
          }
          if (typeof g === "object" && g !== null && !Array.isArray(g) && typeof (g as { hedef?: unknown }).hedef === "string" && /^o[1-9][0-9]{0,8}$/.test((g as { hedef: string }).hedef)) {
            const r = await this.#yerlesime({ islem: "sakinHesabi", hesapId: ileti.hesapId, hedef: (g as { hedef: string }).hedef });
            if (!r.ok) return r;
            return yonetimCagir(this.#env, { islem: "sikayetEkle", sikayetci: ileti.hesapId, govde: { ...g, hedef: (r.deger as { hesap: string }).hesap }, ...(ileti.masa ? { masa: ileti.masa } : {}) });
          }
        }
        // H4: masadan gelen şikâyette masa kimliği (yalnız MasaDO koyar; istemci yolu bu alanı taşımaz).
        return yonetimCagir(this.#env, { islem: "sikayetEkle", sikayetci: ileti.hesapId, govde: ileti.govde, ...(ileti.masa ? { masa: ileti.masa } : {}) });
      case "duyurular":
        return yonetimCagir(this.#env, { islem: "duyurular" });
      case "profil":
        return profilGetir(this.#depo);
      case "profilOlustur": {
        const r = await profilOlustur(
          this.#depo,
          ileti.hesapId,
          ileti.govde,
          (k) => dunyaCagir<Profil>(this.#env, { islem: "kayit", istek: k }),
          (p) => yerlesimCagir(this.#env, { islem: "sakinEkle", yerlesim: p.yerlesim, sakin: sakinKaydi(p) }),
        );
        if (r.ok) await this.#numaraHazirla(ileti.hesapId, simdi, true);
        return r;
      }
      // Künye (src/kunye/hesap.ts): kendi numaran, arama, oyuncu sayfası
      case "numara":
        return benimNumaram(this.#kunye(ileti.hesapId, simdi));
      case "oyuncuAra":
        if (!this.#aramaIzni(simdi)) return hata("hiz_siniri");
        return oyuncuAra(this.#kunye(ileti.hesapId, simdi), { no: ileti.no ?? null, ad: ileti.ad ?? null, imlec: ileti.imlec ?? null });
      case "kunye":
        if (!this.#aramaIzni(simdi)) return hata("hiz_siniri");
        return oyuncuSayfasi(this.#kunye(ileti.hesapId, simdi), ileti.numara, ileti.dil);
      case "devir": {
        const r = await this.#yerlesime(ileti);
        // Vâris geçti: numara aynı kalır, ad dizini yeni karakterin adıyla tazelenir (en iyi çaba).
        if (r.ok) await adiTazele(this.#kunye(ileti.hesapId, simdi)).catch(() => undefined);
        return r;
      }
      case "davetOlustur":
        return dunyaCagir(this.#env, { islem: "davetOlustur", hesapId: ileti.hesapId });
      case "davetCoz":
        return dunyaCagir(this.#env, { islem: "davetCoz", kod: ileti.kod });
      case "yerlesim":
        await siyasetYoklama(this.#depo, this.#env, ileti.hesapId, simdi);
        return this.#yerlesime({ islem: "durum", hesapId: ileti.hesapId, dil: ileti.dil });
      // Siyaset (Faz 7 + Ek B P1-P4): kimlik yerleşimden doğrulanır, iş BolgeDO'dadır.
      case "siyaset":
        return siyasetOku(this.#depo, this.#env, ileti.hesapId, ileti.bolge, ileti.kayitSayfa, simdi, (i) => yerlesimCagir(this.#env, i));
      case "siyasetYaz":
        return siyasetYaz(this.#depo, this.#env, ileti.hesapId, ileti.govde, simdi, (i) => yerlesimCagir(this.#env, i));
      case "olaylar":
        return this.#yerlesime({ islem: "olaylar", hesapId: ileti.hesapId, imlec: ileti.imlec, dil: ileti.dil });
      case "kisi":
        return this.#yerlesime({ islem: "kisi", hesapId: ileti.hesapId, kisi: ileti.kisi, dil: ileti.dil });
      case "beceriHizlandir":
        // Debdebe kısaltması stoktan harcanır; miktar katalogdan gelir (istemcinin `kisaltma` alanı hiç geçmez).
        if (typeof ileti.govde === "object" && ileti.govde !== null && (ileti.govde as { kaynak?: unknown }).kaynak === "debdebe") {
          return debdebe.hizlandir(this.#debdebe(ileti.hesapId, simdi), ileti.govde);
        }
        return this.#yerlesime({ islem: "beceriHizlandir", hesapId: ileti.hesapId, govde: { ...(ileti.govde as object), kisaltma: undefined } });
      case "eylem":
      case "tanidik":
      case "meslek":
      case "temelIs":
      case "tabanAl":
      case "tarif":
      case "sat":
      case "siparisTeslim":
      case "beceriOgren":
      case "beceriIptal":
      case "beceriYeniden":
      case "dostluk":
      case "teklif":
      case "teklifCevap":
      case "oyuncuArabuluculuk":
      case "husumet":
      case "duzen":
      case "yalanla":
      case "vitrin":
      case "ucgen":
        return this.#yerlesime({ islem: ileti.islem, hesapId: ileti.hesapId, govde: ileti.govde });
      case "engelle": {
        const r = await this.#yerlesime({ islem: "engelle", hesapId: ileti.hesapId, govde: ileti.govde });
        if (r.ok && this.#env.MASA) {
          const eg = await this.#yerlesime({ islem: "engeller", hesapId: ileti.hesapId });
          if (eg.ok) {
            const liste = (eg.deger as { engeller: string[] }).engeller;
            await engeliMasayaBildir({ depo: this.#depo, hesapId: ileti.hesapId, masaCagir: (ad, i) => masaCagir(this.#env, ad, i) }, liste);
          }
        }
        // Hesap düzeyinde engel (künye/arama yerleşimden bağımsız süzer); en iyi çaba, yerleşim engeli asıl kayıttır.
        if (r.ok) {
          const g = (typeof ileti.govde === "object" && ileti.govde !== null ? ileti.govde : {}) as { hedef?: unknown; islem?: unknown };
          try {
            const sh = typeof g.hedef === "string" ? await this.#yerlesime({ islem: "sakinHesabi", hesapId: ileti.hesapId, hedef: g.hedef }) : hata("kisi_yok");
            if (sh.ok) await dunyaCagir(this.#env, { islem: "hesapEngel", hesapId: ileti.hesapId, hedef: (sh.deger as { hesap: string }).hesap, kaldir: g.islem === "kaldir" });
          } catch {
            // dünya erişilemezse yerleşim engeli yine geçerlidir
          }
        }
        return r;
      }
      case "oyuncu": {
        const r = await this.#yerlesime({ islem: "oyuncu", hesapId: ileti.hesapId, oyuncu: ileti.oyuncu, dil: ileti.dil });
        // İsteğe bağlı `numara` (istemci künyeye doğrudan geçer); bulunamazsa alan eklenmez.
        if (!r.ok || typeof r.deger !== "object" || r.deger === null) return r;
        try {
          const sh = await this.#yerlesime({ islem: "sakinHesabi", hesapId: ileti.hesapId, hedef: ileti.oyuncu });
          if (!sh.ok) return r;
          const n = await dunyaCagir(this.#env, { islem: "numaraAl", hesapId: (sh.deger as { hesap: string }).hesap });
          return n.ok ? basarili({ ...(r.deger as Record<string, unknown>), numara: (n.deger as { numara: number }).numara }) : r;
        } catch {
          return r;
        }
      }
      case "gelen":
        return this.#yerlesime({ islem: "gelen", hesapId: ileti.hesapId, dil: ileti.dil });
      case "duzenOku":
        return this.#yerlesime({ islem: "duzenOku", hesapId: ileti.hesapId });
      case "ucgenOku":
        return this.#yerlesime({ islem: "ucgenOku", hesapId: ileti.hesapId, npc: ileti.npc, hedef: ileti.hedef, dil: ileti.dil });
      case "lonca":
        return this.#yerlesime({ islem: "lonca", hesapId: ileti.hesapId, dil: ileti.dil });
      case "beceri":
        return this.#yerlesime({ islem: "beceri", hesapId: ileti.hesapId, meslek: ileti.meslek });
      case "han":
        return hanListesi(await this.#han(ileti.hesapId, simdi), ileti.dil, ileti.han);
      case "masaBilet": {
        const bilet = await masaBileti(await this.#han(ileti.hesapId, simdi), ileti.masa, ileti.han);
        // E7 müdavim: sunucuda kesilen bilet han ziyaretidir (gün başına bir kez sayılır; hata bileti etkilemez).
        // 4.9: müdavimlik han başınadır (bilet geçerliyse han numarası da geçerlidir).
        if (bilet.ok) await this.#yerlesime({ islem: "mudavimZiyaret", hesapId: ileti.hesapId, ...(ileti.han ? { han: ileti.han } : {}) }).catch(() => undefined);
        return bilet;
      }
      case "hanEylem":
        return hanEylemi(await this.#han(ileti.hesapId, simdi), ileti.govde);
      case "hanMasalar":
        return this.#yerlesime({ islem: "masaVitrin", hesapId: ileti.hesapId });
      case "hanPano":
        return this.#yerlesime({ islem: "hanPano", hesapId: ileti.hesapId, alt: "oku", ...(ileti.han ? { han: ileti.han } : {}) });
      case "hanPanoYaz":
        return hanPanoYaz({ depo: this.#depo, simdi }, ileti.govde, (govde) => this.#yerlesime({ islem: "hanPano", hesapId: ileti.hesapId, alt: "yaz", govde }));
      case "hanPanoSil":
        return this.#yerlesime({ islem: "hanPano", hesapId: ileti.hesapId, alt: "sil", govde: ileti.govde });
      case "hanZiyafet":
        return hanZiyafeti(await this.#han(ileti.hesapId, simdi), ileti.govde);
      case "hanSes":
        return hanSesi(await this.#han(ileti.hesapId, simdi), ileti.masa, ileti.alt, ileti.govde, ileti.han);
      case "hanIkram": {
        const r = await hanIkrami(await this.#han(ileti.hesapId, simdi), ileti.govde);
        // Oyun içi cömertlik de Cömertler Levhası'nda anılır (yalnız görünürlüğü açık olan; oyun etkisi yok).
        if (r.ok) {
          try {
            await debdebe.ikramLevhaya(this.#debdebe(ileti.hesapId, simdi), r.deger.fiyat);
          } catch {
            // en iyi çaba
          }
        }
        return r;
      }
      case "siparisler":
        return this.#yerlesime({ islem: "siparisler", hesapId: ileti.hesapId, dil: ileti.dil });
      // Debdebe (Faz 11 + 15): src/debdebe/hesap.ts
      case "debdebe":
        return debdebe.debdebeOku(this.#debdebe(ileti.hesapId, simdi));
      case "debdebeDene":
        return debdebe.deneOku(this.#debdebe(ileti.hesapId, simdi), ileti.urun, ileti.dil);
      case "debdebeLevha":
        return debdebe.levhaGoster(this.#debdebe(ileti.hesapId, simdi));
      case "debdebeSezon":
        return debdebe.sezonOku(this.#debdebe(ileti.hesapId, simdi));
      case "debdebeKisi":
        return debdebe.kisiGorunumu(this.#debdebe(ileti.hesapId, simdi), ileti.kisi);
      case "debdebeSatinAl":
        return debdebe.satinAl(this.#debdebe(ileti.hesapId, simdi), ileti.govde);
      case "debdebeKusan":
        return debdebe.kusanUc(this.#debdebe(ileti.hesapId, simdi), ileti.govde);
      case "debdebeArmagan":
        return debdebe.armaganVer(this.#debdebe(ileti.hesapId, simdi), ileti.govde);
      case "debdebeLevhaGorunur":
        return debdebe.levhaGorunurUc(this.#debdebe(ileti.hesapId, simdi), ileti.govde);
      // Hanedan (Faz 7): ileti aynen yerleşime gider.
      case "vasiyet":
      case "evlilik":
      case "hanedan":
      case "devirOnizle":
      case "kronik":
      // Topluluk (E5–E7): ileti aynen yerleşime gider.
      case "topluluk":
      case "mesrep":
      case "hami":
      case "ortakDert":
      case "senlik":
      case "zaviye":
      case "etkinlik":
      // Ekonomi (Faz 6): ileti aynen yerleşime gider.
      case "pazarIlan":
      case "pazarIslem":
      case "pazarGeri":
      case "hizmetHazirla":
      case "hizmetIlan":
      case "hizmetIslem":
      case "hizmetGeri":
      case "hizmetTalepTeslim":
      case "hizmet":
      case "ismarla":
      case "ismarlamaCevap":
      case "pazar":
      case "ismarlamalar":
      case "levha":
      case "defter":
      // Barınma (Faz 14): ileti aynen yerleşime gider.
      case "barinma":
      case "donus":
      case "barinmaKira":
      case "barinmaTesis":
      case "barinmaOtomatik":
      case "barinmaSandik":
      case "barinmaEmanet":
      case "barinmaGorusme":
      // Mülk ve işletme (Faz 12–13): ileti aynen yerleşime gider (bağlam ve işletme çağrısı orada).
      case "mulk":
      // Kervan (D2): ileti aynen yerleşime gider (hedef DO çağrısı kaynak yerleşimde).
      case "kervan":
      case "kervanGonder":
      case "kervanHaber":
        return this.#yerlesime(ileti);
      default:
        return hata("gecersiz_istek");
    }
  }

  #goc(hesapId: string, simdi: number): GocBaglami {
    const env = this.#env;
    return {
      depo: this.#depo,
      hesapId,
      simdi,
      yerlesim: (i) => yerlesimCagir(env, i),
      dunya: (i) => dunyaCagir(env, i),
      // Siyaset bağlı değilse (BolgeDO yok) makam ve darbe kapıları geçti sayılır.
      ...(env.BOLGE
        ? {
            siyaset: async () => {
              const r = await siyasetOku(this.#depo, env, hesapId, null, null, simdi, (i) => yerlesimCagir(env, i));
              return r.ok ? basarili(gocSiyasetKapilari(r.deger)) : r;
            },
          }
        : {}),
    };
  }

  async #han(hesapId: string, simdi: number): Promise<HanHesapBaglami> {
    const env = this.#env;
    return {
      depo: this.#depo,
      hesapId,
      simdi,
      yaptirim: await this.#yaptirimDurumu(),
      masaCagir: (ad, i) => masaCagir(env, ad, i),
      ikramOde: ikramOdeyici(env),
      engelSor: (yerlesim, han) => yerlesimCagir(env, { islem: "engeller", yerlesim, hesapId, ...(han && han !== 1 ? { han } : {}) }),
      hanlarSor: (yerlesim) => yerlesimCagir(env, { islem: "hanlar", yerlesim, hesapId }),
      dolulukYaz: (yerlesim, kayitlar) => yerlesimCagir(env, { islem: "masaDoluluk", yerlesim, hesapId, govde: { kayitlar } }),
      tanidikSor: (yerlesim) => yerlesimCagir(env, { islem: "hanTanidiklar", yerlesim, hesapId }),
      hesapOlusturma: async () => (await hesapKaydi(this.#depo))?.olusturma,
      ziyafetOde: (yerlesim, govde) => yerlesimCagir(env, { islem: "hanZiyafet", yerlesim, hesapId, govde }),
      hanOlayiGonder: (yerlesim, govde) => yerlesimCagir(env, { islem: "hanOlayi", yerlesim, hesapId, govde }),
      plakaCerçevesi: () => debdebe.plakaCerçevesi(this.#depo, simdi),
      plakaSusleri: () => debdebe.plakaSusleri(this.#depo, simdi),
    };
  }

  #yerlesime(istek: YerlesimIstegi): Promise<Sonuc<unknown>> {
    return yerlesimeIlet(this.#depo, istek, (i) => yerlesimCagir(this.#env, i));
  }
}
