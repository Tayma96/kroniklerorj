// DunyaDO: tek örnek ("dunya"). Yerleşim nüfus sayaçları, ad kaydı (benzersizlik), davet kodları.
// İnce sarmalayıcıdır; kurallar mantik.ts'dedir.

import { doDepo, type Depo } from "./depo.ts";
import { iletiOku, jsonYanit } from "./ic.ts";
import { davetCoz, davetOlustur, dunyaOzeti, kayitOl } from "./mantik.ts";
import { basarili, hata, type DunyaIleti, type Env, type Sonuc } from "./tipler.ts";

const rastgele = (bayt: number): Uint8Array => crypto.getRandomValues(new Uint8Array(bayt));

export class DunyaDO {
  readonly #depo: Depo;

  constructor(ctx: DurableObjectState, _env: Env) {
    this.#depo = doDepo(ctx.storage);
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
      default:
        return hata("gecersiz_istek");
    }
  }
}
