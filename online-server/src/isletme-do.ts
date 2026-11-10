// IsletmeDO: işletme başına bir örnek (idFromName("isletme:<yerleşim>.<tür>.<no>")). GDD §13: ayarlar, kasa, emanet,
// personel ve muhasebe aynı DO'da (tek yazıcı). Para tutar; masa trafiği buradan geçmez. Ay dönümü ve uzlaştırma
// (bekleyen kasa → cüzdan kayıtlarının yeniden teslimi) DO alarmıyla. İnce sarmalayıcıdır; kurallar src/mulk/*.ts.

import { doDepo, type Depo } from "./depo.ts";
import { iletiOku, jsonYanit, yerlesimCagir } from "./ic.ts";
import { oyunAyi, sonrakiDonum } from "./saat.ts";
import { hata, type Env, type Sonuc } from "./tipler.ts";
import { ayIlerlet, ayarGonder, type Isletme } from "./mulk/isletme.ts";
import { isletmeIsle, isletmeTelafi, type IsletmeIleti } from "./mulk/islem.ts";
import { UZLASTIRMA_TUR_EN_COK, cikisKapat, denemeErtele, denenecekler, sonrakiDeneme, type CevapDurumu } from "./mulk/transfer.ts";

export const ISLETME_ANAHTARI = "is";

export class IsletmeDO {
  readonly #depolama: DurableObjectStorage;
  readonly #depo: Depo;
  readonly #env: Env;
  readonly #saat: () => number;
  #is: Isletme | undefined;
  #yuklendi = false;
  #uzlastiriyor = false;

  constructor(ctx: DurableObjectState, env: Env, saat: () => number = Date.now) {
    this.#depolama = ctx.storage;
    this.#depo = doDepo(ctx.storage);
    this.#env = env;
    this.#saat = saat;
  }

  async #yukle(): Promise<Isletme | undefined> {
    if (!this.#yuklendi) {
      this.#is = await this.#depo.al<Isletme>(ISLETME_ANAHTARI);
      this.#yuklendi = true;
    }
    return this.#is;
  }

  async #kaydet(): Promise<void> {
    if (this.#is) await this.#depo.koy({ [ISLETME_ANAHTARI]: this.#is });
  }

  async #alarmKur(simdi: number): Promise<void> {
    if (!this.#is) return;
    const d = sonrakiDeneme(this.#is.cik);
    const an = Math.min(sonrakiDonum(simdi), d ?? Infinity);
    const mevcut = await this.#depolama.getAlarm();
    if (mevcut === null || mevcut > an || mevcut <= simdi) await this.#depolama.setAlarm(Math.max(an, simdi + 1));
  }

  async fetch(istek: Request): Promise<Response> {
    const ileti = await iletiOku<IsletmeIleti>(istek);
    if (!ileti || typeof ileti.isletme !== "string") return jsonYanit(hata("gecersiz_istek"));
    const simdi = this.#saat();
    try {
      const onceki = await this.#yukle();
      if (onceki && onceki.id !== ileti.isletme) return jsonYanit(hata("isletme_yok"));
      const { is, sonuc } = isletmeIsle(onceki, ileti, simdi);
      this.#is = is;
      await this.#kaydet();
      await this.#alarmKur(simdi);
      return jsonYanit(sonuc);
    } catch (e) {
      this.#yuklendi = false;
      throw e;
    }
  }

  /** Ay dönümü + uzlaştırma: zamanı gelen kasa → cüzdan kayıtları yerleşime teslim edilir; red telafi edilir. */
  async alarm(): Promise<void> {
    const simdi = this.#saat();
    const is = await this.#yukle();
    if (!is) return;
    ayIlerlet(is, oyunAyi(simdi), simdi);
    ayarGonder(is, simdi);
    await this.#kaydet();
    await this.uzlastir(simdi);
    await this.#alarmKur(simdi);
  }

  /** Bekleyen kayıtları teslim eder (testler de çağırır). Cevapsız kalan kayıt ertelenir; zaman aşımı telafi doğurmaz. */
  async uzlastir(simdi: number, hepsi = false): Promise<void> {
    const is = this.#is;
    if (!is || this.#uzlastiriyor) return;
    const kayitlar = denenecekler(is.cik, simdi, hepsi).slice(0, UZLASTIRMA_TUR_EN_COK);
    if (kayitlar.length === 0) return;
    this.#uzlastiriyor = true;
    try {
      let r: Sonuc<{ sonuclar: [string, CevapDurumu, string?][] }> | undefined;
      try {
        r = await yerlesimCagir<{ sonuclar: [string, CevapDurumu, string?][] }>(this.#env, { islem: "mulkGiris", yerlesim: is.yerlesim, hesapId: "", kayitlar });
      } catch {
        r = undefined;
      }
      if (r?.ok) {
        for (const [i, d] of r.deger.sonuclar) {
          const k = cikisKapat(is.cik, i, d, simdi);
          if (k?.durum === "iade") isletmeTelafi(is, k.kayit);
        }
      } else for (const k of kayitlar) denemeErtele(is.cik, k.i, simdi);
      await this.#kaydet();
    } finally {
      this.#uzlastiriyor = false;
    }
  }
}
