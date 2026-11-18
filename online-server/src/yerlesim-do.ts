// YerlesimDO: yerleşim başına bir örnek (idFromName("yerlesim:<id>")). Yerleşimin tek sahibidir: bütün eylemleri
// geliş sırasıyla işler (§13.8). Ay dönümü DO alarmıyla UTC 09:00 ve 21:00'de (TR 12:00 / 00:00); kaçan dönümler
// sırayla, çağrı başına sınırlı yetiştirilir. İnce sarmalayıcıdır; kurallar src/yerlesim/*.ts'dedir.

import { doDepo, type Depo } from "./depo.ts";
import { etkinlikUc, hamiUc, mesrepUc, mudavimUc, ortakDertUc, senlikUc, toplulukOku, zaviyeUc } from "./yerlesim/topluluk-uclar.ts";
import { defterOku, hizmetGeriUc, hizmetHazirlaUc, hizmetIlanUc, hizmetIslemUc, hizmetOku, hizmetTalepTeslimUc, hizmetGorevTeslimUc, ismarlaUc, ismarlamaCevapUc, ismarlamaOku, levhaOku, pazarGeri, pazarIlan, pazarIslem, pazarOku } from "./yerlesim/ekonomi-uclar.ts";
import { armaganGeri, armaganTeveccuh } from "./yerlesim/armagan-uclar.ts";
import { iletiOku, isletmeCagir, jsonYanit, yerlesimCagir, yonetimCagir } from "./ic.ts";
import { fiyatOzetiUc, kervanGonder, kervanHaber, kervanOnizle, kervanUzlastir, kervanVarisUc, type KervanCagir } from "./yerlesim/kervan-uclar.ts";
import { bolgeCagir } from "./siyaset/ic.ts";
import { BEYLIKLER } from "./dunya-veri.ts";
import { oyunAyi } from "./saat.ts";
import { basarili, hata, type Env, type Sonuc, type YerlesimIleti } from "./tipler.ts";
import type { CalismaParametreleri } from "./yerlesim/tipler.ts";
import { sonrakiAlarm, YerlesimMotoru } from "./yerlesim/motor.ts";
import { VERGI_ALT, mulkIsle, teslimAl, uzlastir, type IsletmeCagir } from "./mulk/yerlesim-mulk.ts";
import { hanNoCoz } from "./mulk/tapu.ts";
import { DOLULUK, dolulukUygula, type DolulukKaydi } from "./han/doluluk.ts";
import { VITRIN, vitrinBudar, vitrinListesi, vitrinUygula, type VitrinKaydi } from "./han/oyun/vitrin.ts";
import { yerlesimBul } from "./dunya-veri.ts";
import { ZarYapilandirmaHatasi, zarSirriAyarla } from "./yerlesim/zar-sirri.ts";

/** [PARAMETRE] Bir istekte bölgeye teslim edilen en çok vergi kaydı (DO alt istek bütçesi ≤ 12). */
export const VERGI_TUR_EN_COK = 2;
/**
 * [PARAMETRE] İstek (ya da alarm) başına alt istek bütçesi: yönetim parametresi, vergi oranı, asıl işlem ve ardından
 * kervan, mülk (tezgâh) ve vergi uzlaştırmaları aynı sayaçtan harcar. Bütçe biterse kalan uzlaştırma işi bekler
 * (kayıtlar çıkış kutusunda kalır; alarm bir sonraki turda sürdürür): hiçbir kayıt kaybolmaz ya da iki kez uygulanmaz.
 */
export const ALT_ISTEK_EN_COK = 12;

export class YerlesimDO {
  readonly #env: Env;
  readonly #depolama: DurableObjectStorage;
  readonly #depo: Depo;
  readonly #saat: () => number;
  /** Mülk (Faz 12): IsletmeDO çağrısı (bağlı değilse işletme uçları `isletme_yok`). */
  readonly #isletme: IsletmeCagir;
  /** Kervan (D2): başka YerlesimDO'ya iç çağrı (varış, fiyat özeti). */
  readonly #kervan: KervanCagir;
  /** Bellekteki kasaba; hata olursa atılır ve bir sonraki istekte depodan yeniden yüklenir. */
  #motor: YerlesimMotoru | undefined;
  #alarmVar = false;
  /** Bu istekte kalan alt istek bütçesi (fetch/alarm başında yenilenir). */
  #kalan = ALT_ISTEK_EN_COK;
  /** Denetim (testler): bu istekte harcanan alt istek. */
  harcanan = 0;
  /**
   * İstek sırası (17 Kasım denetimi S2; bolge-do.ts kalıbı): oyuncu istekleri ve alarm await noktalarında iç içe
   * geçmez. DO→DO iç iletileri (ganimet, kervan varışı, fiyat özeti) sıraya girmez: gönderen DO kendi sırasında
   * beklerken karşılıklı kilitlenme olmasın (bu iletiler geri çağrı yapmaz).
   */
  #sira: Promise<unknown> = Promise.resolve();

  constructor(ctx: DurableObjectState, env: Env, saat: () => number = Date.now) {
    this.#env = env;
    zarSirriAyarla(env.ZAR_SIRRI, env.ZAR_YEDEK_IZINLI === "1");
    this.#isletme = (i) => (env.ISLETME ? (this.#harca(), isletmeCagir(env, i)) : Promise.resolve({ ok: false, hata: "isletme_yok" }));
    this.#kervan = (i) => (this.#harca(), yerlesimCagir(env, i));
    this.#depolama = ctx.storage;
    this.#depo = doDepo(ctx.storage);
    this.#saat = saat;
  }

  #harca(): void {
    this.#kalan--;
    this.harcanan++;
  }

  #butceYenile(): void {
    this.#kalan = ALT_ISTEK_EN_COK;
    this.harcanan = 0;
  }

  async #ac(yerlesimId: string | undefined, simdi: number): Promise<YerlesimMotoru | undefined> {
    if (this.#motor && (yerlesimId === undefined || this.#motor.kasaba.y === yerlesimId)) return this.#motor;
    this.#motor = await YerlesimMotoru.ac(this.#depo, yerlesimId, simdi);
    return this.#motor;
  }

  async #parametreleriYukle(motor: YerlesimMotoru): Promise<void> {
    motor.parametreleriGuncelle({});
    try {
      this.#harca();
      const parametreler = await yonetimCagir(this.#env, { islem: "parametrelerCalisma", yerlesim: motor.kasaba.y });
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

  #sirayla<T>(is: () => Promise<T>): Promise<T> {
    const p = this.#sira.then(is, is);
    this.#sira = p.catch(() => undefined);
    return p;
  }

  async fetch(istek: Request): Promise<Response> {
    const ileti = await iletiOku<YerlesimIleti>(istek);
    if (!ileti || typeof ileti.yerlesim !== "string") return jsonYanit(hata("gecersiz_istek"));
    // 4.9 masa doluluğu: hafif yol (motor açılmaz, ay yetiştirilmez, başka DO'ya çağrı yok); tek küçük depo kaydı.
    if (ileti.islem === "masaDoluluk") return jsonYanit(await this.#dolulukYaz(ileti.yerlesim, ileti.govde));
    // Canlı masalar vitrini: aynı hafif yol (motor açılmaz); tek küçük depo kaydı.
    if (ileti.islem === "masaOyunu" || ileti.islem === "masaVitrin") return jsonYanit(await this.#vitrin(ileti));
    // Künye (başka yerleşimden oyuncu sayfası): salt okuma hafif yolu. Ay yetiştirilmez, vergi/etkinlik/kervan/mülk
    // uzlaştırılmaz, alarm kurulmaz, başka DO'ya çağrı yok; yerleşim kurulmamışsa kurulmaz.
    if (ileti.islem === "kunye") return jsonYanit(await this.#kunyeOku(ileti));
    const sirasiz = ileti.islem === "ganimetKes" || ileti.islem === "ganimetPay" || ileti.islem === "kervanVaris" || ileti.islem === "fiyatOzeti";
    return sirasiz ? this.#istekIsle(ileti) : this.#sirayla(() => this.#istekIsle(ileti));
  }

  async #istekIsle(ileti: YerlesimIleti): Promise<Response> {
    this.#butceYenile();
    try {
      const simdi = this.#saat();
      const sonuc = await this.#isle(ileti, simdi);
      // BolgeDO'dan gelen ganimet adımı bölgeye geri çağrı yapmaz (DO → DO döngüsel bekleme olmaz).
      if (ileti.islem === "ganimetKes" || ileti.islem === "ganimetPay") return jsonYanit(sonuc);
      // Kervan iç iletileri (başka YerlesimDO'dan) geri çağrı yapmaz: kaynak hedefi beklerken döngü olmaz.
      if (ileti.islem === "kervanVaris" || ileti.islem === "fiyatOzeti") return jsonYanit(sonuc);
      await this.#kervanUzlastir(simdi, false);
      await this.#mulkUzlastir(simdi, ileti.islem === "hanIkram" || ileti.islem === "hanZiyafet" || ileti.islem === "barinmaKira");
      await this.#vergiUzlastir(simdi);
      return jsonYanit(sonuc);
    } catch (e) {
      // Bellekteki kasaba (ve bu istekte kirlenen anahtarlar) atılır; sonraki istek depodan yeniden yükler.
      this.#motor = undefined;
      if (e instanceof ZarYapilandirmaHatasi) return jsonYanit(hata("yapilandirma_eksik"));
      throw e;
    }
  }

  async #vitrin(ileti: Extract<YerlesimIleti, { islem: "masaOyunu" | "masaVitrin" }>): Promise<Sonuc<unknown>> {
    if (!yerlesimBul(ileti.yerlesim)) return hata("yerlesim_gecersiz");
    const kayit = (await this.#depo.al<VitrinKaydi>(VITRIN)) ?? {};
    let degisti = vitrinBudar(kayit, Date.now());
    if (ileti.islem === "masaOyunu") {
      const ham = typeof ileti.govde === "object" && ileti.govde !== null ? (ileti.govde as { kayit?: unknown }).kayit : undefined;
      if (vitrinUygula(kayit, ham)) degisti = true;
    }
    if (degisti) {
      if (Object.keys(kayit).length) await this.#depo.koy({ [VITRIN]: kayit });
      else await this.#depo.sil([VITRIN]);
    }
    return ileti.islem === "masaVitrin" ? basarili({ masalar: vitrinListesi(kayit, Date.now()) }) : basarili({});
  }

  async #kunyeOku(ileti: Extract<YerlesimIleti, { islem: "kunye" }>): Promise<Sonuc<unknown>> {
    if (!yerlesimBul(ileti.yerlesim)) return hata("yerlesim_gecersiz");
    if (!this.#motor && !(await this.#depo.al("m"))) return hata("kisi_yok");
    try {
      const motor = await this.#ac(ileti.yerlesim, this.#saat());
      if (!motor) return hata("yerlesim_gecersiz");
      return await motor.kunye(ileti.hesapId, ileti.dil, this.#saat(), ileti.izleyen);
    } catch (e) {
      this.#motor = undefined;
      throw e;
    }
  }

  async #dolulukYaz(yerlesim: string, govde: unknown): Promise<Sonuc<unknown>> {
    if (!yerlesimBul(yerlesim)) return hata("yerlesim_gecersiz");
    const kayit = (await this.#depo.al<DolulukKaydi>(DOLULUK)) ?? {};
    const hamlar = typeof govde === "object" && govde !== null ? (govde as { kayitlar?: unknown }).kayitlar : undefined;
    if (dolulukUygula(kayit, hamlar)) {
      if (Object.keys(kayit).length) await this.#depo.koy({ [DOLULUK]: kayit });
      else await this.#depo.sil([DOLULUK]);
    }
    return basarili({});
  }

  /** Bölgenin güncel vergi oranı; siyaset DO erişilemiyorsa işlem ek vergi kesmeden devam eder. */
  async #vergiOrani(yerlesim: string): Promise<number> {
    return (await this.#vergiOraniBelki(yerlesim)) ?? 0;
  }

  /** Vergi oranı ya da bilinemediyse undefined (son bilinen oran korunur). */
  async #vergiOraniBelki(yerlesim: string): Promise<number | undefined> {
    const bolge = BEYLIKLER.find((x) => x.yerlesimler.some((y) => y.id === yerlesim));
    if (!bolge || !this.#env.BOLGE) return undefined;
    try {
      this.#harca();
      const r = await bolgeCagir<{ bolge?: { vergi?: { oran?: number } } }>(this.#env, {
        islem: "gorunum", bolge: bolge.id, hesapId: `yerlesim:${yerlesim}`,
      });
      const oran = r.ok ? r.deger.bolge?.vergi?.oran : undefined;
      return Number.isInteger(oran) && typeof oran === "number" && oran >= 0 && oran <= 4 ? oran : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * NPC raf satışı vergisi için oran hiç bilinmiyorsa (md.vo yok) ay dönümünden önce bölgeden tazelenir; bütçe ya
   * da bölge yoksa son bilinen (ya da 0) kullanılır.
   */
  async #voTazele(motor: YerlesimMotoru, simdi: number): Promise<void> {
    const md = motor.kasaba.mk;
    if (!md || md.vo !== undefined || this.#kalan <= 1 || motor.kasaba.ay >= oyunAyi(simdi)) return;
    if (!Object.keys(md.t).some((id) => id.includes(".dukkan."))) return;
    const oran = await this.#vergiOraniBelki(motor.kasaba.y);
    if (oran !== undefined) md.vo = oran;
  }

  /** Mülk gelirinden ayrılan vergiyi bölge DO'suna idempotent anahtarla teslim eder. */
  async #vergiUzlastir(simdi: number): Promise<void> {
    const motor = this.#motor;
    const md = motor?.kasaba.mk;
    if (!motor || !md?.vergiGiden?.length || !this.#env.BOLGE) return;
    // Alt istek bütçesi: turda en çok VERGI_TUR_EN_COK teslim; kalanı bir dakika sonra alarm.
    for (const x of md.vergiGiden.slice(0, VERGI_TUR_EN_COK)) {
      if (this.#kalan <= 0) break;
      const bolge = BEYLIKLER.find((b) => b.yerlesimler.some((y) => y.id === x.yerlesim));
      if (!bolge) break;
      let r: Sonuc<unknown>;
      try {
        this.#harca();
        r = await bolgeCagir(this.#env, {
          islem: "vergiYatir", bolge: bolge.id, anahtar: x.anahtar, tutar: x.tutar, yerlesim: x.yerlesim,
        });
      } catch {
        break;
      }
      if (!r.ok) break;
      await motor.mulkIslem([], () => {
        const i = md.vergiGiden?.findIndex((y) => y.anahtar === x.anahtar) ?? -1;
        if (i >= 0) md.vergiGiden!.splice(i, 1);
      });
    }
    if (md.vergiGiden?.length) {
      const yeniden = simdi + 60_000;
      const mevcut = await this.#depolama.getAlarm();
      if (mevcut === null || mevcut > yeniden) await this.#depolama.setAlarm(yeniden);
    }
  }

  async #isle(ileti: YerlesimIleti, simdi: number): Promise<Sonuc<unknown>> {
    if (ileti.islem === "ekonomiSagligi" && !(await this.#depo.al("m"))) {
      return basarili({ yerlesim: ileti.yerlesim, oyuncuSayisi: 0, npcSayisi: 0, toplamAkce: 0, ortalamaAkce: 0, medyanAkce: 0, enDusukAkce: 0, enYuksekAkce: 0, son12Ay: { gelir: 0, gider: 0, net: 0 }, kasabaStokAdet: 0, acikSiparis: 0, esya: { efsanevi: 0, tilsimli: 0 } });
    }
    const motor = await this.#ac(ileti.yerlesim, simdi);
    if (!motor) return hata("yerlesim_gecersiz");
    if (ileti.islem === "ekonomiSagligi") return motor.ekonomiSagligi();
    // YonetimDO → YerlesimDO iç çağrıları geri döngü oluşturmamak için parametre/ay dönümü çağırmaz.
    if (ileti.islem === "siyasetKimlik") return motor.siyasetKimlik(ileti.hesapId);
    if (ileti.islem === "kumeIzi") return motor.kumeIzi(ileti.hesapId, ileti.kk);
    if (ileti.islem === "yonetimTelafi") return motor.yonetimTelafi(ileti.hesapId, ileti.govde);
    if (ileti.islem === "yonetimAyrinti") return motor.yonetimAyrinti(ileti.hesapId);
    if (ileti.islem === "ganimetKes" || ileti.islem === "ganimetPay") return motor.ganimet(ileti.islem, ileti.hesapId, ileti.govde);
    await this.#parametreleriYukle(motor);
    await this.#voTazele(motor, simdi);
    const { kalan } = await motor.yetistir(simdi);
    await motor.etkinlikSenkron(simdi);
    await this.#alarmKur(simdi, kalan);
    const tezgahVergi = ileti.islem === "mulk" && VERGI_ALT.includes(ileti.alt) ? await this.#vergiOraniBelki(ileti.yerlesim) : undefined;
    // Sultan'ın Fermanı etkinliği (src/etkinlik/): han ikramı, ziyafet ve oda kirasından vergi alınmaz.
    const vergisiz = motor.kasaba.pr?.ETK?.vergisiz === true;
    const vergiOrani = vergisiz ? 0 : ileti.islem === "hanIkram" || ileti.islem === "hanZiyafet" || ileti.islem === "barinmaKira"
      ? await this.#vergiOrani(ileti.yerlesim)
      : (tezgahVergi ?? 0);
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
      case "oyuncuArabuluculuk":
        return motor.oyuncuArabuluculuk(ileti.hesapId, ileti.govde);
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
        return motor.hanIkram(ileti.hesapId, ileti.govde, vergiOrani);
      case "hanPano":
        return motor.hanPano(ileti.hesapId, ileti.alt, ileti.govde, ileti.han);
      case "hanPanoIlan":
        return motor.hanPanoIlan(ileti.hesapId, ileti.ilan);
      case "hanZiyafet":
        return motor.hanZiyafet(ileti.hesapId, ileti.govde, vergiOrani);
      // Debdebe armağanı (HesapDO'dan; tutar değer olarak gelir, cosmetic okunmaz)
      case "armaganTeveccuh":
        return armaganTeveccuh(motor, ileti.hesapId, ileti.govde);
      case "armaganGeri":
        return armaganGeri(motor, ileti.hesapId, ileti.govde);
      case "sakinHesabi":
        return motor.sakinHesabi(ileti.hesapId, ileti.hedef);
      case "engeller": {
        const han = hanNoCoz(ileti.han);
        if (han === undefined) return hata("han_gecersiz");
        if (!motor.hanAcikMi(han)) return hata("han_yok");
        return motor.engeller(ileti.hesapId, han);
      }
      case "hanlar":
        return motor.hanlar(ileti.hesapId, await this.#depo.al<DolulukKaydi>(DOLULUK));
      case "hanTanidiklar":
        return motor.hanTanidiklar(ileti.hesapId);
      case "hanOlayi":
        return motor.hanOlayi(ileti.hesapId, ileti.govde);
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
      case "etkinlik":
        return etkinlikUc(motor, ileti.hesapId, ileti.govde);
      case "mudavimZiyaret": {
        const han = hanNoCoz(ileti.han);
        if (han === undefined || !motor.hanAcikMi(han)) return hata("han_yok");
        return mudavimUc(motor, ileti.hesapId, han);
      }
      // Ekonomi (Faz 6) ve hizmet pazarı (E4.3): src/yerlesim/ekonomi-uclar.ts
      case "hizmet":
        return hizmetOku(motor, ileti.hesapId);
      case "hizmetHazirla":
        return hizmetHazirlaUc(motor, ileti.hesapId, ileti.govde);
      case "hizmetIlan":
        return hizmetIlanUc(motor, ileti.hesapId, ileti.govde);
      case "hizmetIslem":
        return hizmetIslemUc(motor, ileti.hesapId, ileti.govde);
      case "hizmetGeri":
        return hizmetGeriUc(motor, ileti.hesapId, ileti.govde);
      case "hizmetTalepTeslim":
        return hizmetTalepTeslimUc(motor, ileti.hesapId, ileti.govde);
      case "hizmetGorev":
        return hizmetGorevTeslimUc(motor, ileti.hesapId, ileti.govde);
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
        return motor.barinmaOku(ileti.islem, ileti.hesapId, simdi, ileti.islem === "barinma" ? ileti.han : undefined);
      case "barinmaKira":
      case "barinmaTesis":
      case "barinmaOtomatik":
      case "barinmaSandik":
      case "barinmaEmanet":
      case "barinmaGorusme":
        return motor.barinmaIslem(ileti.islem, ileti.hesapId, ileti.govde, simdi, vergiOrani);
      // Mülk (Faz 12–13): istemci uçları ve IsletmeDO'dan gelen kasa → cüzdan kayıtları.
      case "mulk":
        return mulkIsle(motor, ileti, simdi, this.#isletme, tezgahVergi, () => this.#kalan);
      // Göç (D1): HesapDO'dan; src/yerlesim/goc.ts
      case "gocOnizle":
        return motor.gocOnizle(ileti.hesapId, ileti.hedef);
      case "gocCikis":
        return motor.gocCikis(ileti.hesapId, ileti.govde);
      case "gocGiris":
        return motor.gocGiris(ileti.hesapId, ileti.govde);
      case "gocTamam":
        return motor.gocTamam(ileti.hesapId, ileti.govde);
      case "gocIptal":
        return motor.gocIptal(ileti.hesapId, ileti.govde);
      case "emanetOnizle":
        return motor.emanetOnizle(ileti.hesapId);
      case "emanetCikis":
        return motor.emanetCikis(ileti.hesapId, ileti.govde);
      case "emanetGiris":
        return motor.emanetGiris(ileti.hesapId, ileti.govde);
      case "emanetTamam":
        return motor.emanetTamam(ileti.hesapId, ileti.govde);
      case "emanetIptal":
        return motor.emanetIptal(ileti.hesapId, ileti.govde);
      // Kervan (D2): src/yerlesim/kervan-uclar.ts
      case "kervan":
        return kervanOnizle(motor, ileti.hesapId, ileti.hedef, ileti.mallar, this.#kervan);
      case "kervanGonder":
        return kervanGonder(motor, ileti.hesapId, ileti.govde);
      case "kervanHaber":
        return kervanHaber(motor, ileti.hesapId, ileti.govde, this.#kervan);
      case "kervanVaris":
        return kervanVarisUc(motor, ileti.islemNo, ileti.kaynak, ileti.yuk, simdi);
      case "fiyatOzeti":
        return fiyatOzetiUc(motor, ileti.hesap, ileti.yuk, ileti.va, ileti.ke);
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
    const sonraki = await uzlastir(motor, simdi, this.#isletme, hepsi, () => this.#kalan);
    if (sonraki === null) return;
    const mevcut = await this.#depolama.getAlarm();
    if (mevcut === null || mevcut > sonraki) await this.#depolama.setAlarm(Math.max(sonraki, simdi + 1));
  }

  /** Varış ayı gelen kervanları teslim eder; bekleyen yeniden deneme varsa alarmı o ana çeker. */
  async #kervanUzlastir(simdi: number, hepsi: boolean): Promise<void> {
    const motor = this.#motor;
    if (!motor?.kasaba.kv?.c.k.length) return;
    // Kervan kalan bütçenin yarısını alır: mülk ve vergi uzlaştırması aç kalmaz.
    const bas = this.#kalan;
    const tavan = Math.floor(bas / 2);
    const sonraki = await kervanUzlastir(motor, simdi, this.#kervan, hepsi, () => tavan - (bas - this.#kalan));
    if (sonraki === null) return;
    const mevcut = await this.#depolama.getAlarm();
    if (mevcut === null || mevcut > sonraki) await this.#depolama.setAlarm(Math.max(sonraki, simdi + 1));
  }

  /** Ay dönümü alarmı: kaçanları yetiştirir; kaldıysa 1 sn sonra, yoksa bir sonraki dönümde yeniden kurar. */
  alarm(): Promise<void> {
    return this.#sirayla(() => this.#alarmIsle());
  }

  async #alarmIsle(): Promise<void> {
    const simdi = this.#saat();
    this.#butceYenile();
    try {
      const motor = await this.#ac(undefined, simdi);
      if (!motor) return;
      await this.#parametreleriYukle(motor);
      await this.#voTazele(motor, simdi);
    const { kalan } = await motor.yetistir(simdi);
      await motor.etkinlikSenkron(simdi);
      await this.#depolama.setAlarm(sonrakiAlarm(simdi, kalan));
      this.#alarmVar = true;
      await this.#kervanUzlastir(simdi, false);
      await this.#mulkUzlastir(simdi, false);
      await this.#vergiUzlastir(simdi);
    } catch (e) {
      this.#motor = undefined;
      throw e;
    }
  }
}
