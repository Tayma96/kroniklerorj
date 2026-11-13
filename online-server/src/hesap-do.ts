// HesapDO: Google `sub` başına bir örnek. Hesap, profil, yerleşim işaretçisi, istekNo defteri (tekrar güvenliği)
// ve hız sınırı. Yerleşim uçları buradan oyuncunun YerlesimDO'suna iletilir (hız sınırı burada uygulanır).
// Yaptırım: YonetimDO'nun yazdığı etkin özet burada her iletiden önce uygulanır (giriş hariç).
// İnce sarmalayıcıdır; kurallar mantik.ts ve yonetim/yaptirim.ts'dedir.

import { doDepo, type Depo } from "./depo.ts";
import { dunyaCagir, hesapCagir, iletiOku, jsonYanit, yerlesimCagir, yonetimCagir } from "./ic.ts";
import { girisKaydet, hesapKaydi, hizKontrol, profilGetir, profilOlustur, sakinKaydi, yerlesimeIlet, HIZ_SINIRI, type HizDurumu, type YerlesimIstegi } from "./mantik.ts";
import { basarili, hata, type Env, type HesapIleti, type HesapYaptirimi, type Profil, type Sonuc, type YerlesimIleti } from "./tipler.ts";
import type { MasaIleti } from "./han/tipler.ts";
import { uzaklastirmaBilgisi, yaptirimEngeli } from "./yonetim/yaptirim.ts";
import { engeliMasayaBildir, hanEylemi, hanIkrami, hanListesi, hanSesi, masaBileti, yaptirimiMasayaBildir, type HanHesapBaglami } from "./han/hesap-kopru.ts";
import { masaCagir } from "./han/ic.ts";
import { ikramOdeyici } from "./han/yerlesim-kopru.ts";
import * as debdebe from "./debdebe/hesap.ts";
import { yapilandirilmamisDogrulayici, type MakbuzDogrulayici } from "./debdebe/makbuz.ts";
import { SEZON_KAYNAK_PUANI } from "./debdebe/sezon.ts";
import { siyasetOku, siyasetYaz, siyasetYoklama } from "./siyaset/hesap-kopru.ts";

const YAPTIRIM = "yaptirim";
const OTURUM_SURUMU = "oturumSurumu";
/** [PARAMETRE] Yönetim parametrelerinin (hız sınırı) HesapDO belleğinde tutulduğu süre. */
export const PARAMETRE_ONBELLEK_MS = 60_000;

export class HesapDO {
  readonly #depo: Depo;
  readonly #env: Env;
  /** Bellekte tutulur: örnek uykuya geçince sıfırlanması zararsızdır, depolamaya yazım harcamaz. */
  #hiz: HizDurumu | undefined;
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
    const hiz = hizKontrol(this.#hiz, simdi, this.#parametre?.sinir ?? HIZ_SINIRI);
    this.#hiz = hiz.durum;
    if (!hiz.izin) return jsonYanit(hata("hiz_siniri"));
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
    switch (ileti.islem) {
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
          if (typeof g === "object" && g !== null && !Array.isArray(g) && typeof (g as { hedef?: unknown }).hedef === "string" && /^o[1-9][0-9]{0,8}$/.test((g as { hedef: string }).hedef)) {
            const r = await this.#yerlesime({ islem: "sakinHesabi", hesapId: ileti.hesapId, hedef: (g as { hedef: string }).hedef });
            if (!r.ok) return r;
            return yonetimCagir(this.#env, { islem: "sikayetEkle", sikayetci: ileti.hesapId, govde: { ...g, hedef: (r.deger as { hesap: string }).hesap } });
          }
        }
        return yonetimCagir(this.#env, { islem: "sikayetEkle", sikayetci: ileti.hesapId, govde: ileti.govde });
      case "duyurular":
        return yonetimCagir(this.#env, { islem: "duyurular" });
      case "profil":
        return profilGetir(this.#depo);
      case "profilOlustur":
        return profilOlustur(
          this.#depo,
          ileti.hesapId,
          ileti.govde,
          (k) => dunyaCagir<Profil>(this.#env, { islem: "kayit", istek: k }),
          (p) => yerlesimCagir(this.#env, { islem: "sakinEkle", yerlesim: p.yerlesim, sakin: sakinKaydi(p) }),
        );
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
        return r;
      }
      case "oyuncu":
        return this.#yerlesime({ islem: "oyuncu", hesapId: ileti.hesapId, oyuncu: ileti.oyuncu, dil: ileti.dil });
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
        return hanListesi(await this.#han(ileti.hesapId, simdi), ileti.dil);
      case "masaBilet": {
        const bilet = await masaBileti(await this.#han(ileti.hesapId, simdi), ileti.masa);
        // E7 müdavim: sunucuda kesilen bilet han ziyaretidir (gün başına bir kez sayılır; hata bileti etkilemez).
        if (bilet.ok) await this.#yerlesime({ islem: "mudavimZiyaret", hesapId: ileti.hesapId }).catch(() => undefined);
        return bilet;
      }
      case "hanEylem":
        return hanEylemi(await this.#han(ileti.hesapId, simdi), ileti.govde);
      case "hanSes":
        return hanSesi(await this.#han(ileti.hesapId, simdi), ileti.masa, ileti.alt, ileti.govde);
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
      case "devir":
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
      // Mülk ve işletme (Faz 12–13): ileti aynen yerleşime gider (bağlam ve işletme çağrısı orada).
      case "mulk":
        return this.#yerlesime(ileti);
      default:
        return hata("gecersiz_istek");
    }
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
      engelSor: (yerlesim) => yerlesimCagir(env, { islem: "engeller", yerlesim, hesapId }),
      plakaCerçevesi: () => debdebe.plakaCerçevesi(this.#depo, simdi),
    };
  }

  #yerlesime(istek: YerlesimIstegi): Promise<Sonuc<unknown>> {
    return yerlesimeIlet(this.#depo, istek, (i) => yerlesimCagir(this.#env, i));
  }
}
