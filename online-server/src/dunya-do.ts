// DunyaDO: tek örnek ("dunya"). Yerleşim nüfus sayaçları, ad kaydı (benzersizlik ve yönetimde ad araması),
// davet kodları.
// İnce sarmalayıcıdır; kurallar mantik.ts'dedir.

import { doDepo, type Depo } from "./depo.ts";
import { iletiOku, jsonYanit } from "./ic.ts";
import { davetCoz, davetOlustur, dunyaOzeti, gocKayit, kayitOl, oyuncuBul } from "./mantik.ts";
import { basarili, hata, type DunyaIleti, type Env, type Sonuc } from "./tipler.ts";
import { levhaOku, levhaYaz, type LevhaYazimi } from "./debdebe/levha.ts";
import { adAra, hesapEngelYaz, kimlikOzetleri, numaraAdTazele, numaraAl, numaraBul, type Listeleyici } from "./kunye/numara.ts";

const rastgele = (bayt: number): Uint8Array => crypto.getRandomValues(new Uint8Array(bayt));

export class DunyaDO {
  readonly #depo: Depo;
  readonly #liste: Listeleyici;

  constructor(ctx: DurableObjectState, _env: Env) {
    this.#depo = doDepo(ctx.storage);
    const s = ctx.storage;
    this.#liste = async <T,>(onek: string, sinir: number, sonra?: string) =>
      s.list ? s.list<T>({ prefix: onek, limit: sinir, ...(sonra ? { startAfter: sonra } : {}) }) : new Map<string, T>();
  }

  async fetch(istek: Request): Promise<Response> {
    const ileti = await iletiOku<DunyaIleti>(istek);
    return jsonYanit(ileti ? await this.#isle(ileti, Date.now()) : hata("gecersiz_istek"));
  }

  async #isle(ileti: DunyaIleti, simdi: number): Promise<Sonuc<unknown>> {
    switch (ileti.islem) {
      case "ozet":
        return basarili(await dunyaOzeti(this.#depo, simdi));
      case "kayit":
        return kayitOl(this.#depo, ileti.istek, simdi);
      case "davetOlustur":
        return davetOlustur(this.#depo, ileti.hesapId, rastgele);
      case "davetCoz":
        return davetCoz(this.#depo, ileti.kod);
      case "oyuncuBul":
        return oyuncuBul(this.#depo, { ad: ileti.ad, hesap: ileti.hesap });
      case "kimlikOzet":
        return kimlikOzetleri(this.#depo, ileti.hesaplar);
      // Künye (oyuncu numarası ve arama): src/kunye/numara.ts
      case "numaraAl":
        return numaraAl(this.#depo, ileti.hesapId, rastgele);
      case "numaraBul":
        return numaraBul(this.#depo, ileti.numara, ileti.arayan);
      case "numaraAdTazele":
        return numaraAdTazele(this.#depo, ileti.hesapId, ileti.ad);
      case "adAra":
        return adAra(this.#depo, this.#liste, ileti.onek, ileti.imlec, undefined, ileti.arayan);
      case "hesapEngel":
        return hesapEngelYaz(this.#depo, ileti.hesapId, ileti.hedef, ileti.kaldir === true);
      // Cömertler Levhası (Faz 15)
      case "levhaYaz":
        return levhaYaz(this.#depo, ileti.yazim as LevhaYazimi, simdi);
      case "levhaOku":
        return levhaOku(this.#depo, ileti.beylik, simdi);
      // Göç (D1): src/goc-hesap.ts
      case "gocKayit":
        return gocKayit(this.#depo, ileti.hesapId, ileti.kaynak, ileti.hedef, ileti.geri === true);
      default:
        return hata("gecersiz_istek");
    }
  }
}
