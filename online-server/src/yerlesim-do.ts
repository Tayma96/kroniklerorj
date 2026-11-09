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
      case "meslek":
        return motor.meslek(ileti.hesapId, ileti.govde);
      case "temelIs":
        return motor.temelIs(ileti.hesapId, ileti.govde);
      case "tabanAl":
        return motor.tabanAl(ileti.hesapId, ileti.govde);
      case "lonca":
        return motor.lonca(ileti.hesapId);
      case "tarif":
        return motor.tarif(ileti.hesapId, ileti.govde);
      case "sat":
        return motor.sat(ileti.hesapId, ileti.govde);
      case "siparisTeslim":
        return motor.siparisTeslim(ileti.hesapId, ileti.govde);
      case "siparisler":
        return motor.siparisler(ileti.hesapId, ileti.dil);
      case "oyuncu":
        return motor.oyuncu(ileti.hesapId, ileti.oyuncu, ileti.dil);
      case "gelen":
        return motor.gelen(ileti.hesapId, ileti.dil);
      case "duzenOku":
        return motor.duzenOku(ileti.hesapId);
      case "dostluk":
        return motor.dostluk(ileti.hesapId, ileti.govde);
      case "teklif":
        return motor.teklif(ileti.hesapId, ileti.govde);
      case "teklifCevap":
        return motor.teklifCevap(ileti.hesapId, ileti.govde);
      case "husumet":
        return motor.husumet(ileti.hesapId, ileti.govde);
      case "engelle":
        return motor.engelle(ileti.hesapId, ileti.govde);
      case "duzen":
        return motor.duzen(ileti.hesapId, ileti.govde);
      case "yalanla":
        return motor.yalanla(ileti.hesapId, ileti.govde);
      case "vitrin":
        return motor.vitrin(ileti.hesapId, ileti.govde);
      case "hanIkram":
        return motor.hanIkram(ileti.hesapId, ileti.govde);
      case "engeller":
        return motor.engeller(ileti.hesapId);
      // Hanedan (Faz 7)
      case "hanedan":
        return motor.hanedan(ileti.hesapId, ileti.dil);
      case "vasiyet":
        return motor.vasiyet(ileti.hesapId, ileti.govde);
      case "devirOnizle":
        return motor.devirOnizle(ileti.hesapId, ileti.varis, ileti.dil);
      case "devir":
        return motor.devir(ileti.hesapId, ileti.govde);
      case "evlilik":
        return motor.evlilik(ileti.hesapId, ileti.govde);
      case "kronik":
        return motor.kronik(ileti.hesapId, ileti.imlec, ileti.dil);
      // Barınma (Faz 14): ms damgalı kurallar dünya saatini alır.
      case "barinma":
      case "donus":
        return motor.barinmaOku(ileti.islem, ileti.hesapId, simdi);
      case "barinmaKira":
      case "barinmaTesis":
      case "barinmaOtomatik":
        return motor.barinmaIslem(ileti.islem, ileti.hesapId, ileti.govde, simdi);
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
