// YerlesimDO: yerleşim başına bir örnek (idFromName("yerlesim:<id>")). Yerleşimin tek sahibidir: bütün eylemleri
// geliş sırasıyla işler (§13.8). Ay dönümü DO alarmıyla UTC 09:00 ve 21:00'de (TR 12:00 / 00:00); kaçan dönümler
// sırayla, çağrı başına sınırlı yetiştirilir. İnce sarmalayıcıdır; kurallar src/yerlesim/*.ts'dedir.

import { doDepo, type Depo } from "./depo.ts";
import { hamiUc, mesrepUc, mudavimUc, ortakDertUc, senlikUc, toplulukOku, zaviyeUc } from "./yerlesim/topluluk-uclar.ts";
import { defterOku, ismarlaUc, ismarlamaCevapUc, ismarlamaOku, levhaOku, pazarGeri, pazarIlan, pazarIslem, pazarOku } from "./yerlesim/ekonomi-uclar.ts";
import { armaganGeri, armaganTeveccuh } from "./yerlesim/armagan-uclar.ts";
import { iletiOku, isletmeCagir, jsonYanit, yonetimCagir } from "./ic.ts";
import { basarili, hata, type Env, type Sonuc, type YerlesimIleti } from "./tipler.ts";
import type { CalismaParametreleri } from "./yerlesim/tipler.ts";
import { sonrakiAlarm, YerlesimMotoru } from "./yerlesim/motor.ts";
import { mulkIsle, teslimAl, uzlastir, type IsletmeCagir } from "./mulk/yerlesim-mulk.ts";

export class YerlesimDO {
  readonly #env: Env;
  readonly #depolama: DurableObjectStorage;
  readonly #depo: Depo;
  readonly #saat: () => number;
  /** Mülk (Faz 12): IsletmeDO çağrısı (bağlı değilse işletme uçları `isletme_yok`). */
  readonly #isletme: IsletmeCagir;
  /** Bellekteki kasaba; hata olursa atılır ve bir sonraki istekte depodan yeniden yüklenir. */
  #motor: YerlesimMotoru | undefined;
  #alarmVar = false;

  constructor(ctx: DurableObjectState, env: Env, saat: () => number = Date.now) {
    this.#env = env;
    this.#isletme = (i) => (env.ISLETME ? isletmeCagir(env, i) : Promise.resolve({ ok: false, hata: "isletme_yok" }));
    this.#depolama = ctx.storage;
    this.#depo = doDepo(ctx.storage);
    this.#saat = saat;
  }

  async #ac(yerlesimId: string | undefined, simdi: number): Promise<YerlesimMotoru | undefined> {
    if (this.#motor && (yerlesimId === undefined || this.#motor.kasaba.y === yerlesimId)) return this.#motor;
    this.#motor = await YerlesimMotoru.ac(this.#depo, yerlesimId, simdi);
    return this.#motor;
  }

  async #parametreleriYukle(motor: YerlesimMotoru): Promise<void> {
    motor.parametreleriGuncelle({});
    try {
      const parametreler = await yonetimCagir(this.#env, { islem: "parametrelerCalisma" });
      if (parametreler.ok && typeof parametreler.deger === "object" && parametreler.deger !== null) {
        motor.parametreleriGuncelle(parametreler.deger as CalismaParametreleri);
      }
    } catch {
      // Yönetim DO erişilemezse oyun güvenli varsayılan parametrelerle çalışmaya devam eder.
    }
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
      const simdi = this.#saat();
      const sonuc = await this.#isle(ileti, simdi);
      await this.#mulkUzlastir(simdi, ileti.islem === "hanIkram" || ileti.islem === "barinmaKira");
      return jsonYanit(sonuc);
    } catch (e) {
      this.#motor = undefined;
      throw e;
    }
  }

  async #isle(ileti: YerlesimIleti, simdi: number): Promise<Sonuc<unknown>> {
    if (ileti.islem === "ekonomiSagligi" && !(await this.#depo.al("m"))) {
      return basarili({ yerlesim: ileti.yerlesim, oyuncuSayisi: 0, npcSayisi: 0, toplamAkce: 0, ortalamaAkce: 0, medyanAkce: 0, enDusukAkce: 0, enYuksekAkce: 0, son12Ay: { gelir: 0, gider: 0, net: 0 }, kasabaStokAdet: 0, acikSiparis: 0 });
    }
    const motor = await this.#ac(ileti.yerlesim, simdi);
    if (!motor) return hata("yerlesim_gecersiz");
    if (ileti.islem === "ekonomiSagligi") return motor.ekonomiSagligi();
    // YonetimDO → YerlesimDO iç çağrıları geri döngü oluşturmamak için parametre/ay dönümü çağırmaz.
    if (ileti.islem === "siyasetKimlik") return motor.siyasetKimlik(ileti.hesapId);
    if (ileti.islem === "yonetimTelafi") return motor.yonetimTelafi(ileti.hesapId, ileti.govde);
    await this.#parametreleriYukle(motor);
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
      case "beceri":
        return motor.beceri(ileti.hesapId, ileti.meslek);
      case "beceriOgren":
        return motor.beceriYaz(ileti.hesapId, "ogren", ileti.govde);
      case "beceriIptal":
        return motor.beceriYaz(ileti.hesapId, "iptal", ileti.govde);
      case "beceriHizlandir":
        return motor.beceriYaz(ileti.hesapId, "hizlandir", ileti.govde);
      case "beceriYeniden":
        return motor.beceriYaz(ileti.hesapId, "yeniden", ileti.govde);
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
      case "ucgen":
        return motor.ucgen(ileti.hesapId, ileti.govde);
      case "ucgenOku":
        return motor.ucgenOku(ileti.hesapId, ileti.npc, ileti.hedef, ileti.dil);
      case "hanIkram":
        return motor.hanIkram(ileti.hesapId, ileti.govde);
      // Debdebe armağanı (HesapDO'dan; tutar değer olarak gelir, cosmetic okunmaz)
      case "armaganTeveccuh":
        return armaganTeveccuh(motor, ileti.hesapId, ileti.govde);
      case "armaganGeri":
        return armaganGeri(motor, ileti.hesapId, ileti.govde);
      case "sakinHesabi":
        return motor.sakinHesabi(ileti.hesapId, ileti.hedef);
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
      // Topluluk (E5–E7): src/yerlesim/topluluk-uclar.ts
      case "topluluk":
        return toplulukOku(motor, ileti.hesapId);
      case "mesrep":
        return mesrepUc(motor, ileti.hesapId, ileti.govde);
      case "hami":
        return hamiUc(motor, ileti.hesapId, ileti.govde);
      case "ortakDert":
        return ortakDertUc(motor, ileti.hesapId, ileti.govde);
      case "senlik":
        return senlikUc(motor, ileti.hesapId, ileti.govde);
      case "zaviye":
        return zaviyeUc(motor, ileti.hesapId, ileti.govde);
      case "mudavimZiyaret":
        return mudavimUc(motor, ileti.hesapId);
      // Ekonomi (Faz 6): src/yerlesim/ekonomi-uclar.ts
      case "pazar":
        return pazarOku(motor, ileti.hesapId, ileti.mal);
      case "pazarIlan":
        return pazarIlan(motor, ileti.hesapId, ileti.govde);
      case "pazarIslem":
        return pazarIslem(motor, ileti.hesapId, ileti.govde);
      case "pazarGeri":
        return pazarGeri(motor, ileti.hesapId, ileti.govde);
      case "ismarlamalar":
        return ismarlamaOku(motor, ileti.hesapId);
      case "ismarla":
        return ismarlaUc(motor, ileti.hesapId, ileti.govde);
      case "ismarlamaCevap":
        return ismarlamaCevapUc(motor, ileti.hesapId, ileti.govde);
      case "levha":
        return levhaOku(motor, ileti.hesapId, ileti.mal);
      case "defter":
        return defterOku(motor, ileti.hesapId, ileti.ay);
      // Barınma (Faz 14): ms damgalı kurallar dünya saatini alır.
      case "barinma":
      case "donus":
        return motor.barinmaOku(ileti.islem, ileti.hesapId, simdi);
      case "barinmaKira":
      case "barinmaTesis":
      case "barinmaOtomatik":
        return motor.barinmaIslem(ileti.islem, ileti.hesapId, ileti.govde, simdi);
      // Mülk (Faz 12–13): istemci uçları ve IsletmeDO'dan gelen kasa → cüzdan kayıtları.
      case "mulk":
        return mulkIsle(motor, ileti, simdi, this.#isletme);
      case "mulkGiris":
        return { ok: true, deger: { sonuclar: await teslimAl(motor, ileti.kayitlar, simdi) } };
      default:
        return hata("gecersiz_istek");
    }
  }

  /** Bekleyen çıkış kayıtlarını teslim eder; kalan varsa alarmı yeniden deneme anına çeker. */
  async #mulkUzlastir(simdi: number, hepsi: boolean): Promise<void> {
    const motor = this.#motor;
    if (!motor?.kasaba.mk?.cik.k.length) return;
    const sonraki = await uzlastir(motor, simdi, this.#isletme, hepsi);
    if (sonraki === null) return;
    const mevcut = await this.#depolama.getAlarm();
    if (mevcut === null || mevcut > sonraki) await this.#depolama.setAlarm(Math.max(sonraki, simdi + 1));
  }

  /** Ay dönümü alarmı: kaçanları yetiştirir; kaldıysa 1 sn sonra, yoksa bir sonraki dönümde yeniden kurar. */
  async alarm(): Promise<void> {
    const simdi = this.#saat();
    try {
      const motor = await this.#ac(undefined, simdi);
      if (!motor) return;
      await this.#parametreleriYukle(motor);
      const { kalan } = await motor.yetistir(simdi);
      await this.#depolama.setAlarm(sonrakiAlarm(simdi, kalan));
      this.#alarmVar = true;
      await this.#mulkUzlastir(simdi, false);
    } catch (e) {
      this.#motor = undefined;
      throw e;
    }
  }
}
