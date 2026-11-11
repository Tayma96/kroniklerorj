// YonetimDO: tek örnek ("yonetim"). Yönetici rolleri, yalnız eklenen işlem kaydı, parametre katmanı, şikayet kuyruğu,
// yaptırım kayıtları ve duyurular. Yönetici başına oran sınırı burada (bellekte) uygulanır.
// İnce sarmalayıcıdır; kurallar src/yonetim/islem.ts'dedir.

import { doDepo, type Depo } from "./depo.ts";
import { dunyaCagir, hesapCagir, iletiOku, jsonYanit } from "./ic.ts";
import { HIZ_PENCERESI_MS, hizKontrol, type HizDurumu } from "./mantik.ts";
import { basarili, hata, type Env, type Profil, type YonetimIleti } from "./tipler.ts";
import { etkinDeger, PARAMETRELER, type ParametreAdi, type ParametreKaydi } from "./yonetim/parametre.ts";
import { yonetimIsle, type YonetimBaglami } from "./yonetim/islem.ts";
import { kurucuListesi } from "./yonetim/yetki.ts";
import { masaAtmaKaydet } from "./han/y1-kayit.ts";

/** [PARAMETRE] Yönetici (e-posta) başına dakikadaki istek sınırı. */
export const YONETIM_HIZ_SINIRI = 60;
/** [PARAMETRE] Rolsüz giriş denemeleri için genel (herkes toplam) dakikalık tavan. */
export const YETKISIZ_GIRIS_DAKIKA = 20;
/**
 * Bellekteki hız sayaçlarının en çok sayısı. Dolunca yalnız süresi geçmiş pencereler atılır; hiçbiri geçmemişse
 * tabloda olmayan yeni e-posta `hiz_siniri` alır. Tablo topluca sıfırlanmaz (çok sayıda e-postayla bir kişinin
 * sayacını silmek mümkün olmasın). Bu yalnız bellek içi hız tablosudur; işlem kaydı ayrıdır ve hiç silinmez.
 */
export const HIZ_TABLOSU_EN_COK = 1000;

/** Saf: e-posta başına dakikalık sayaç; tablo doluysa yalnız eski pencereleri atar, topluca silmez. */
export function hizTablosuSay(
  tablo: Map<string, HizDurumu>,
  anahtar: string,
  simdi: number,
  sinir = YONETIM_HIZ_SINIRI,
  enCok = HIZ_TABLOSU_EN_COK,
): boolean {
  if (!tablo.has(anahtar) && tablo.size >= enCok) {
    const pencere = Math.floor(simdi / HIZ_PENCERESI_MS);
    for (const [k, d] of tablo) if (d.pencere < pencere) tablo.delete(k);
    if (tablo.size >= enCok) return false;
  }
  const h = hizKontrol(tablo.get(anahtar), simdi, sinir);
  tablo.set(anahtar, h.durum);
  return h.izin;
}

export class YonetimDO {
  readonly #depo: Depo;
  readonly #env: Env;
  readonly #hiz = new Map<string, HizDurumu>();
  #yetkisiz: HizDurumu | undefined;

  constructor(ctx: DurableObjectState, env: Env) {
    this.#depo = doDepo(ctx.storage);
    this.#env = env;
  }

  async fetch(istek: Request): Promise<Response> {
    const ileti = await iletiOku<YonetimIleti>(istek);
    if (!ileti) return jsonYanit(hata("gecersiz_istek"));
    const simdi = Date.now();
    if (ileti.islem === "parametrelerCalisma") {
      const adlar = Object.keys(PARAMETRELER) as ParametreAdi[];
      const kayitlar = await this.#depo.alCok<ParametreKaydi>(adlar.map((ad) => `parametre:${ad}`));
      const degerler = Object.fromEntries(adlar.map((ad) => [ad, etkinDeger(PARAMETRELER[ad], kayitlar.get(`parametre:${ad}`))]));
      return jsonYanit(basarili(degerler));
    }
    if (ileti.islem === "masaAtma") return jsonYanit(await masaAtmaKaydet(this.#depo, ileti));
    if (ileti.islem === "giris" || ileti.islem === "yonet") {
      if (!hizTablosuSay(this.#hiz, ileti.yonetici.eposta, simdi)) return jsonYanit(hata("hiz_siniri"));
    }
    const env = this.#env;
    const baglam: YonetimBaglami = {
      depo: this.#depo,
      simdi,
      kurucular: kurucuListesi(env.YONETICI_EPOSTALAR),
      oyuncuBul: (sorgu) => dunyaCagir<Profil>(env, { islem: "oyuncuBul", ...sorgu }),
      hesabaYaz: (hedef, durum) => hesapCagir(env, hedef, { islem: "yaptirimYaz", hesapId: hedef, durum }),
      hesabaIlet: (hedef, ileti) => hesapCagir(env, hedef, ileti),
      yetkisizGirisIzni: () => {
        const h = hizKontrol(this.#yetkisiz, simdi, YETKISIZ_GIRIS_DAKIKA);
        this.#yetkisiz = h.durum;
        return h.izin;
      },
    };
    return jsonYanit(await yonetimIsle(baglam, ileti));
  }
}
