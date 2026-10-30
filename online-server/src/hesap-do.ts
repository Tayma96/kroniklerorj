// HesapDO: Google `sub` başına bir örnek. Hesap, profil, yerleşim işaretçisi, istekNo defteri (tekrar güvenliği)
// ve hız sınırı. Yerleşim uçları buradan oyuncunun YerlesimDO'suna iletilir (hız sınırı burada uygulanır).
// İnce sarmalayıcıdır; kurallar mantik.ts'dedir.

import { doDepo, type Depo } from "./depo.ts";
import { dunyaCagir, iletiOku, jsonYanit, yerlesimCagir } from "./ic.ts";
import { girisKaydet, hizKontrol, profilGetir, profilOlustur, sakinKaydi, yerlesimeIlet, type HizDurumu, type YerlesimIstegi } from "./mantik.ts";
import { basarili, hata, type Env, type HesapIleti, type Profil, type Sonuc } from "./tipler.ts";

export class HesapDO {
  readonly #depo: Depo;
  readonly #env: Env;
  /** Bellekte tutulur: örnek uykuya geçince sıfırlanması zararsızdır, depolamaya yazım harcamaz. */
  #hiz: HizDurumu | undefined;

  constructor(ctx: DurableObjectState, env: Env) {
    this.#depo = doDepo(ctx.storage);
    this.#env = env;
  }

  async fetch(istek: Request): Promise<Response> {
    const ileti = await iletiOku<HesapIleti>(istek);
    if (!ileti) return jsonYanit(hata("gecersiz_istek"));
    const simdi = Date.now();
    const hiz = hizKontrol(this.#hiz, simdi);
    this.#hiz = hiz.durum;
    if (!hiz.izin) return jsonYanit(hata("hiz_siniri"));
    return jsonYanit(await this.#isle(ileti, simdi));
  }

  async #isle(ileti: HesapIleti, simdi: number): Promise<Sonuc<unknown>> {
    switch (ileti.islem) {
      case "giris":
        return basarili(await girisKaydet(this.#depo, ileti.hesapId, ileti.sub, simdi));
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
        return this.#yerlesime({ islem: "eylem", hesapId: ileti.hesapId, govde: ileti.govde });
      case "tanidik":
        return this.#yerlesime({ islem: "tanidik", hesapId: ileti.hesapId, govde: ileti.govde });
      default:
        return hata("gecersiz_istek");
    }
  }

  #yerlesime(istek: YerlesimIstegi): Promise<Sonuc<unknown>> {
    return yerlesimeIlet(this.#depo, istek, (i) => yerlesimCagir(this.#env, i));
  }
}
