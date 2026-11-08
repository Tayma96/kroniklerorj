// YonetimDO: tek örnek ("yonetim"). Yönetici rolleri, yalnız eklenen işlem kaydı, parametre katmanı, şikayet kuyruğu,
// yaptırım kayıtları ve duyurular. Yönetici başına oran sınırı burada (bellekte) uygulanır.
// İnce sarmalayıcıdır; kurallar src/yonetim/islem.ts'dedir.

import { doDepo, type Depo } from "./depo.ts";
import { dunyaCagir, hesapCagir, iletiOku, jsonYanit } from "./ic.ts";
import { hizKontrol, type HizDurumu } from "./mantik.ts";
import { hata, type Env, type Profil, type YonetimIleti } from "./tipler.ts";
import { yonetimIsle, type YonetimBaglami } from "./yonetim/islem.ts";
import { kurucuListesi } from "./yonetim/yetki.ts";

/** [PARAMETRE] Yönetici (e-posta) başına dakikadaki istek sınırı. */
export const YONETIM_HIZ_SINIRI = 60;
/** Bellekteki hız sayaçlarının en çok sayısı; aşılınca sıfırlanır. */
const HIZ_TABLOSU_EN_COK = 1000;

export class YonetimDO {
  readonly #depo: Depo;
  readonly #env: Env;
  readonly #hiz = new Map<string, HizDurumu>();

  constructor(ctx: DurableObjectState, env: Env) {
    this.#depo = doDepo(ctx.storage);
    this.#env = env;
  }

  async fetch(istek: Request): Promise<Response> {
    const ileti = await iletiOku<YonetimIleti>(istek);
    if (!ileti) return jsonYanit(hata("gecersiz_istek"));
    const simdi = Date.now();
    if (ileti.islem === "giris" || ileti.islem === "yonet") {
      const eposta = ileti.yonetici.eposta;
      const hiz = hizKontrol(this.#hiz.get(eposta), simdi, YONETIM_HIZ_SINIRI);
      if (this.#hiz.size >= HIZ_TABLOSU_EN_COK && !this.#hiz.has(eposta)) this.#hiz.clear();
      this.#hiz.set(eposta, hiz.durum);
      if (!hiz.izin) return jsonYanit(hata("hiz_siniri"));
    }
    const env = this.#env;
    const baglam: YonetimBaglami = {
      depo: this.#depo,
      simdi,
      kurucular: kurucuListesi(env.YONETICI_EPOSTALAR),
      oyuncuBul: (sorgu) => dunyaCagir<Profil>(env, { islem: "oyuncuBul", ...sorgu }),
      hesabaYaz: (hedef, durum) => hesapCagir(env, hedef, { islem: "yaptirimYaz", hesapId: hedef, durum }),
    };
    return jsonYanit(await yonetimIsle(baglam, ileti));
  }
}
