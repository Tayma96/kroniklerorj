// SultanlikDO: tek örnek ("sultanlik"), düşük frekanslı küresel kayıt. Sultan (NPC), Divan, hazine, Moğol tutumu,
// Sultan meşruiyeti. Yalnız bölgeler (ayda bir rapor + haraç) ve alarm yazar; oyuncu GET'leri buraya gelmez.
// İnce sarmalayıcıdır; kurallar src/siyaset/sultanlik.ts'dedir.

import { doDepo, type Depo } from "./depo.ts";
import { iletiOku, jsonYanit } from "./ic.ts";
import { AY_MS, DUNYA_BASLANGICI_MS } from "./saat.ts";
import { SULTANLIK_GECIKME_MS } from "./siyaset/sabitler.ts";
import { raporAl, sultanlikAyiSimdi, sultanlikGorunumu, sultanlikKur, sultanlikOzeti, sultanlikYetistir } from "./siyaset/sultanlik.ts";
import type { SultanlikDurumu, SultanlikIleti } from "./siyaset/tipler.ts";
import { basarili, hata, type Env, type Sonuc } from "./tipler.ts";

const DURUM = "sultanlik";

export class SultanlikDO {
  readonly #depo: Depo;
  readonly #ctx: DurableObjectState;
  readonly #saat: () => number;
  #durum: SultanlikDurumu | undefined;

  constructor(ctx: DurableObjectState, _env: Env, saat: () => number = () => Date.now()) {
    this.#ctx = ctx;
    this.#depo = doDepo(ctx.storage);
    this.#saat = saat;
  }

  async fetch(istek: Request): Promise<Response> {
    const ileti = await iletiOku<SultanlikIleti>(istek);
    return jsonYanit(ileti ? await this.#isle(ileti, this.#saat()) : hata("gecersiz_istek"));
  }

  async alarm(): Promise<void> {
    await this.#isle({ islem: "ozet" }, this.#saat());
  }

  async #isle(ileti: SultanlikIleti, simdi: number): Promise<Sonuc<unknown>> {
    // Dış çağrı yok: bütün iş tek giriş kapısı içinde atomiktir.
    let d = this.#durum ?? (await this.#depo.al<SultanlikDurumu>(DURUM));
    if (!d) d = sultanlikKur(sultanlikAyiSimdi(simdi));
    this.#durum = d;
    sultanlikYetistir(d, simdi);
    let sonuc: Sonuc<unknown>;
    switch (ileti.islem) {
      case "rapor":
        if (typeof ileti.bolge !== "string" || !ileti.rapor) return hata("gecersiz_istek");
        raporAl(d, ileti.bolge, ileti.rapor, ileti.harac, ileti.temsilci);
        sonuc = basarili(sultanlikOzeti(d));
        break;
      case "ozet":
        sonuc = basarili(sultanlikGorunumu(d));
        break;
      default:
        return hata("gecersiz_istek");
    }
    await this.#depo.koy({ [DURUM]: d });
    await this.#ctx.storage.setAlarm(DUNYA_BASLANGICI_MS + (sultanlikAyiSimdi(simdi) + 1) * AY_MS + SULTANLIK_GECIKME_MS);
    return sonuc;
  }
}
