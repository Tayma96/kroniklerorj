// YerlesimDO: yerleşim başına bir örnek (idFromName("yerlesim:<id>")). Yerleşimin tek sahibidir: bütün eylemleri
// geliş sırasıyla işler (§13.8). Ay dönümü DO alarmıyla UTC 09:00 ve 21:00'de (TR 12:00 / 00:00); kaçan dönümler
// sırayla, çağrı başına sınırlı yetiştirilir. İnce sarmalayıcıdır; kurallar src/yerlesim/*.ts'dedir.

import { doDepo, type Depo } from "./depo.ts";
import { iletiOku, jsonYanit } from "./ic.ts";
import { hata, type Env, type Sonuc, type YerlesimIleti } from "./tipler.ts";
import { sonrakiAlarm, YerlesimMotoru } from "./yerlesim/motor.ts";

export class YerlesimDO {
  readonly #depolama: DurableObjectStorage;
  readonly #depo: Depo;
  readonly #saat: () => number;
  /** Bellekteki kasaba; hata olursa atılır ve bir sonraki istekte depodan yeniden yüklenir. */
  #motor: YerlesimMotoru | undefined;
  #alarmVar = false;

  constructor(ctx: DurableObjectState, _env: Env, saat: () => number = Date.now) {
    this.#depolama = ctx.storage;
    this.#depo = doDepo(ctx.storage);
    this.#saat = saat;
  }

  async #ac(yerlesimId: string | undefined, simdi: number): Promise<YerlesimMotoru | undefined> {
    if (this.#motor && (yerlesimId === undefined || this.#motor.kasaba.y === yerlesimId)) return this.#motor;
    this.#motor = await YerlesimMotoru.ac(this.#depo, yerlesimId, simdi);
    return this.#motor;
  }

  async #alarmKur(simdi: number, kalan: number): Promise<void> {
    if (this.#alarmVar && kalan === 0) return;
    if (kalan > 0 || (await this.#depolama.getAlarm()) === null) await this.#depolama.setAlarm(sonrakiAlarm(simdi, kalan));
    this.#alarmVar = true;
  }

  async fetch(istek: Request): Promise<Response> {
    const ileti = await iletiOku<YerlesimIleti>(istek);
    if (!ileti || typeof ileti.yerlesim !== "string") return jsonYanit(hata("gecersiz_istek"));
    try {
      return jsonYanit(await this.#isle(ileti, this.#saat()));
    } catch (e) {
      this.#motor = undefined;
      throw e;
    }
  }

  async #isle(ileti: YerlesimIleti, simdi: number): Promise<Sonuc<unknown>> {
    const motor = await this.#ac(ileti.yerlesim, simdi);
    if (!motor) return hata("yerlesim_gecersiz");
    const { kalan } = await motor.yetistir(simdi);
    await this.#alarmKur(simdi, kalan);
    switch (ileti.islem) {
      case "sakinEkle":
        return motor.sakinEkle(ileti.sakin);
      case "durum":
        return motor.durum(ileti.hesapId, simdi, ileti.dil);
      case "olaylar":
        return motor.olaylar(ileti.hesapId, ileti.imlec, ileti.dil);
      case "kisi":
        return motor.kisi(ileti.hesapId, ileti.kisi, ileti.dil);
      case "eylem":
        return motor.eylem(ileti.hesapId, ileti.govde);
      case "tanidik":
        return motor.tanidik(ileti.hesapId, ileti.govde);
      default:
        return hata("gecersiz_istek");
    }
  }

  /** Ay dönümü alarmı: kaçanları yetiştirir; kaldıysa 1 sn sonra, yoksa bir sonraki dönümde yeniden kurar. */
  async alarm(): Promise<void> {
    const simdi = this.#saat();
    try {
      const motor = await this.#ac(undefined, simdi);
      if (!motor) return;
      const { kalan } = await motor.yetistir(simdi);
      await this.#depolama.setAlarm(sonrakiAlarm(simdi, kalan));
      this.#alarmVar = true;
    } catch (e) {
      this.#motor = undefined;
      throw e;
    }
  }
}
