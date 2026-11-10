// HesapDO: Google `sub` başına bir örnek. Hesap, profil, yerleşim işaretçisi, istekNo defteri (tekrar güvenliği)
// ve hız sınırı. Yerleşim uçları buradan oyuncunun YerlesimDO'suna iletilir (hız sınırı burada uygulanır).
// Yaptırım: YonetimDO'nun yazdığı etkin özet burada her iletiden önce uygulanır (giriş hariç).
// İnce sarmalayıcıdır; kurallar mantik.ts ve yonetim/yaptirim.ts'dedir.

import { doDepo, type Depo } from "./depo.ts";
import { dunyaCagir, iletiOku, jsonYanit, yerlesimCagir, yonetimCagir } from "./ic.ts";
import { girisKaydet, hesapKaydi, hizKontrol, profilGetir, profilOlustur, sakinKaydi, yerlesimeIlet, type HizDurumu, type YerlesimIstegi } from "./mantik.ts";
import { basarili, hata, type Env, type HesapIleti, type HesapYaptirimi, type Profil, type Sonuc } from "./tipler.ts";
import { uzaklastirmaBilgisi, yaptirimEngeli } from "./yonetim/yaptirim.ts";
import { engeliMasayaBildir, hanEylemi, hanIkrami, hanListesi, masaBileti, yaptirimiMasayaBildir, type HanHesapBaglami } from "./han/hesap-kopru.ts";
import { masaCagir } from "./han/ic.ts";
import { ikramOdeyici } from "./han/yerlesim-kopru.ts";

const YAPTIRIM = "yaptirim";

export class HesapDO {
  readonly #depo: Depo;
  readonly #env: Env;
  /** Bellekte tutulur: örnek uykuya geçince sıfırlanması zararsızdır, depolamaya yazım harcamaz. */
  #hiz: HizDurumu | undefined;
  /** Yaptırım özeti önbelleği: bu örnek tek yazandır, bu yüzden tutarlıdır. null = yok. */
  #yaptirim: HesapYaptirimi | null | undefined;

  constructor(ctx: DurableObjectState, env: Env) {
    this.#depo = doDepo(ctx.storage);
    this.#env = env;
  }

  async fetch(istek: Request): Promise<Response> {
    const ileti = await iletiOku<HesapIleti>(istek);
    if (!ileti) return jsonYanit(hata("gecersiz_istek"));
    const simdi = Date.now();
    // Yönetimin iç yazımı oyuncunun hız sınırına takılmaz.
    if (ileti.islem === "yaptirimYaz") return jsonYanit(await this.#yaptirimYaz(ileti.durum, ileti.hesapId));
    const hiz = hizKontrol(this.#hiz, simdi);
    this.#hiz = hiz.durum;
    if (!hiz.izin) return jsonYanit(hata("hiz_siniri"));
    const yaptirim = await this.#yaptirimDurumu();
    const engel = yaptirimEngeli(yaptirim, ileti.islem, simdi);
    if (engel) return jsonYanit(engel);
    if (ileti.islem === "giris") {
      const g = await girisKaydet(this.#depo, ileti.hesapId, ileti.sub, simdi);
      const uzak = uzaklastirmaBilgisi(yaptirim, simdi);
      return jsonYanit(basarili(uzak ? { ...g, uzaklastirma: uzak } : g));
    }
    return jsonYanit(await this.#isle(ileti, simdi));
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
        return this.#yerlesime({ islem: "durum", hesapId: ileti.hesapId, dil: ileti.dil });
      case "olaylar":
        return this.#yerlesime({ islem: "olaylar", hesapId: ileti.hesapId, imlec: ileti.imlec, dil: ileti.dil });
      case "kisi":
        return this.#yerlesime({ islem: "kisi", hesapId: ileti.hesapId, kisi: ileti.kisi, dil: ileti.dil });
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
      case "beceriHizlandir":
      case "beceriYeniden":
      case "dostluk":
      case "teklif":
      case "teklifCevap":
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
      case "hanIkram":
        return hanIkrami(await this.#han(ileti.hesapId, simdi), ileti.govde);
      case "siparisler":
        return this.#yerlesime({ islem: "siparisler", hesapId: ileti.hesapId, dil: ileti.dil });
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
    };
  }

  #yerlesime(istek: YerlesimIstegi): Promise<Sonuc<unknown>> {
    return yerlesimeIlet(this.#depo, istek, (i) => yerlesimCagir(this.#env, i));
  }
}
