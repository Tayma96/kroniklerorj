// MasaDO: masa başına bir örnek (idFromName("masa:<yerlesim>:<han>:<no>")). WebSocket hibernation API'si.
// Yalnız oturum, katılım ve sohbet akışı; para tutmaz, para işlemi yapmaz (GDD §13).
// Kalıcı olanlar: masa ayarı, olaylar (katılım listesiyle), istekNo kaydı, masa başının dönüş yasakları.
// Sohbet iletileri depoya ya da soket ekine yazılmaz; yalnız bağlı istemcilere gönderilir.
// İnce sarmalayıcıdır; kurallar src/han/masa.ts ve src/han/eylem.ts'dedir.
// Faz 16 ses: yetki kapısı src/han/ses.ts, Realtime istemcisi src/han/realtime.ts. Ses depoya yazılmaz, kaydedilmez.

import { doDepo, type Depo } from "./depo.ts";
import { ENGEL_ANAHTARI, engelListesiCoz, engelSorgusuKur, type EngelSorgusu } from "./han/engel-kopru.ts";
import { ATMA, atismaSonucuYaz, atmaUygula, eylemUygula } from "./han/eylem.ts";
import { BILET_BASLIGI } from "./han/ic.ts";
import { KAPANIS, surer, VARSAYILAN_AYAR } from "./han/kurallar.ts";
import {
  atismaBaslatYayinla,
  ayril,
  baglan,
  baglanmaEngeli,
  hesabiCikar,
  iletiIsle,
  etkinlikDenetleYayinla,
  kayitlar,
  oturanlar,
  ozet,
  yaptirimGuncelle,
  type MasaBaglami,
  type MasaSoketi,
} from "./han/masa.ts";
import { etkinlikCoz, type Etkinlik } from "./han/sahne.ts";
import type { AtismaSonucu, MasaAyari, MasaBileti, MasaIleti, MasaOlayi, SoketEki, SunucuIletisi } from "./han/tipler.ts";
import { Realtime, realtimeAyari, type Getir } from "./han/realtime.ts";
import { sesIsle } from "./han/ses.ts";
import { masaAdiCoz } from "./han/doluluk.ts";
import { masaOyunuCoz, oyunSuruyor, vitrinOzeti, type MasaOyunu } from "./han/oyun/cati.ts";
import { VITRIN_TAZELE_MS, vitrinAnahtari } from "./han/oyun/vitrin.ts";
import { hesapCagir, iletiOku, jsonYanit, yerlesimCagir, yonetimCagir } from "./ic.ts";
import { basarili, hata, HATA_DURUMU, type Env, type Sonuc } from "./tipler.ts";

/** Hibernation API'li DO durumu. */
export interface WebSocketDurumu extends DurableObjectState {
  acceptWebSocket(ws: WebSocket, tags?: string[]): void;
  getWebSockets(tag?: string): WebSocket[];
}

/** WebSocket çifti ve 101 yanıtı (testte sahtesi verilir: Node 101 durumlu Response kurmaz). */
export interface MasaAraclari {
  cift(): [istemci: WebSocket, sunucu: WebSocket];
  yukselt(istemci: WebSocket): Response;
  /** Realtime API çağrısı (yoksa global fetch; testte sahte). */
  getir?: Getir;
}

const VARSAYILAN_ARACLAR: MasaAraclari = {
  cift: () => {
    const p = new WebSocketPair();
    return [p[0], p[1]];
  },
  yukselt: (istemci) => new Response(null, { status: 101, webSocket: istemci }),
};

const AYAR = "ayar";
/** H8 sahne/atışma durumu (kıta metni yok) ve yerleşime teslim bekleyen anılma olayları. */
const ETKINLIK = "etkinlik";
const ANMA_KUYRUK = "anma:kuyruk";
/** 4.9: yerleşime son bildirilen doluluk [oturan, açık 1/0] (yalnız değişince yeniden bildirilir). */
const DOLULUK_SON = "doluluk:son";
/** Masa oyunu (src/han/oyun/; gizli tohum ve zarlar yalnız burada) ve yerleşime son bildirilen vitrin özeti. */
const OYUN = "oyun";
const VITRIN_SON = "vitrin:son";
/** [PARAMETRE] Teslim bekleyen anılma olaylarının en çok sayısı (eskiler düşer). */
export const ANMA_KUYRUK_EN_COK = 20;

interface AnmaBekleyen {
  yerlesim: string;
  anahtar: string;
  olay: MasaOlayi;
}

/** "masa:<yerlesim>:<han>:<no>" → yerleşim kimliği. */
function yerlesimAdi(masa: string): string {
  return masa.split(":")[1] ?? "";
}

function masaNo(ad: string): number {
  const n = Number(ad.slice(ad.lastIndexOf(":") + 1));
  return Number.isInteger(n) ? n : 0;
}

function biletCoz(ham: string | null): MasaBileti | undefined {
  if (!ham) return undefined;
  try {
    const b = JSON.parse(decodeURIComponent(ham)) as MasaBileti;
    if (typeof b?.masa === "string" && typeof b.no === "number" && typeof b.plaka?.hesap === "string" && typeof b.plaka.ad === "string") {
      const plaka = {
        hesap: b.plaka.hesap,
        ad: b.plaka.ad,
        ...(typeof b.plaka.cerceve === "string" && b.plaka.cerceve.length <= 40 ? { cerceve: b.plaka.cerceve } : {}),
        ...(typeof b.plaka.balon === "string" && b.plaka.balon.length <= 40 ? { balon: b.plaka.balon } : {}),
        ...(typeof b.plaka.masaSusu === "string" && b.plaka.masaSusu.length <= 40 ? { masaSusu: b.plaka.masaSusu } : {}),
        ...(b.plaka.mudavim === true ? { mudavim: true as const } : {}),
        ...(b.plaka.ozan === true ? { ozan: true as const } : {}),
        ...(typeof b.plaka.kisi === "string" && /^o[1-9][0-9]{0,8}$/.test(b.plaka.kisi) ? { kisi: b.plaka.kisi } : {}),
        ...(Number.isInteger(b.plaka.nam) && (b.plaka.nam as number) >= 0 && (b.plaka.nam as number) <= 400 ? { nam: b.plaka.nam as number } : {}),
      };
      const ho = typeof b.ho === "number" && Number.isFinite(b.ho) ? { ho: b.ho } : {};
      return { masa: b.masa, no: b.no, plaka, yt: b.yt ?? {}, eg: engelListesiCoz(b.eg), ...ho };
    }
  } catch {
    // aşağıda
  }
  return undefined;
}

export class MasaDO {
  readonly #ctx: WebSocketDurumu;
  readonly #depo: Depo;
  readonly #env: Env;
  readonly #araclar: MasaAraclari;
  readonly #sarmal = new WeakMap<WebSocket, MasaSoketi>();
  #ayar: MasaAyari | undefined;
  /** H8: null = yüklenmedi. */
  #etkinlik: Etkinlik | undefined | null = null;
  /** H8: anılma kuyruğunda öğe var mı (null = bilinmiyor; boşken her iletide depo okunmaz). */
  #anmaVar: boolean | null = null;
  /** 4.9: yerleşime son bildirilen doluluk (null = depodan yüklenmedi). */
  #sonDoluluk: [number, 0 | 1] | undefined | null = null;
  /** Masa oyunu (null = yüklenmedi). */
  #oyun: MasaOyunu | undefined | null = null;
  /** Son bildirilen vitrin özeti [anahtar, z] (null = yüklenmedi). */
  #sonVitrin: [string, number] | undefined | null = null;
  /** İşlem sırasında sıraya alınan SFU iz kapatmaları; işlem sonunda beklenir. */
  readonly #bekleyen: Promise<unknown>[] = [];
  /** Hesap başına iki yönlü engel listesi önbelleği (asıl kayıt depoda `eg:<hesap>`). */
  readonly #engeller = new Map<string, readonly string[] | undefined>();
  readonly #engelliMi: EngelSorgusu = engelSorgusuKur(async (h) => {
    if (!this.#engeller.has(h)) this.#engeller.set(h, await this.#depo.al<string[]>(ENGEL_ANAHTARI + h));
    return this.#engeller.get(h);
  });

  constructor(ctx: WebSocketDurumu, env: Env, araclar: MasaAraclari = VARSAYILAN_ARACLAR) {
    this.#ctx = ctx;
    this.#depo = doDepo(ctx.storage);
    this.#env = env;
    this.#araclar = araclar;
  }

  async fetch(istek: Request): Promise<Response> {
    if ((istek.headers.get("upgrade") ?? "").toLowerCase() === "websocket") return this.#baglan(istek);
    const ileti = await iletiOku<MasaIleti>(istek);
    if (!ileti || typeof ileti.masa !== "string") return jsonYanit(hata("gecersiz_istek"));
    const sonuc = await this.#isle(ileti);
    await this.#bosalt();
    await this.#anmaBosalt();
    await this.#dolulukBildir(ileti.masa);
    await this.#vitrinBildir(ileti.masa);
    return jsonYanit(sonuc);
  }

  async webSocketMessage(ws: WebSocket, mesaj: string | ArrayBuffer): Promise<void> {
    const ek = this.#sar(ws).ek();
    if (!ek) return;
    await iletiIsle(await this.#baglam(ek.m), this.#sar(ws), mesaj);
    await this.#bosalt();
    await this.#anmaBosalt();
    await this.#dolulukBildir(ek.m);
    await this.#vitrinBildir(ek.m);
  }

  #realtime(): Realtime | undefined {
    const ayar = realtimeAyari(this.#env);
    return ayar ? new Realtime(ayar, this.#araclar.getir ?? ((u, i) => fetch(u, i))) : undefined;
  }

  async #bosalt(): Promise<void> {
    while (this.#bekleyen.length) await Promise.all(this.#bekleyen.splice(0));
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.#kapandi(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.#kapandi(ws);
  }

  async #kapandi(ws: WebSocket): Promise<void> {
    const ek = this.#sar(ws).ek();
    if (ek) ayril(await this.#baglam(ek.m, ws), this.#sar(ws));
    await this.#bosalt();
    await this.#anmaBosalt();
    if (ek) await this.#dolulukBildir(ek.m, ws);
    if (ek) await this.#vitrinBildir(ek.m, ws);
    try {
      ws.close(1000, "ayrildi");
    } catch {
      // zaten kapalı
    }
  }

  /**
   * 4.9: oturan sayısı ya da açık/kapalı durum değiştiyse yerleşime mutlak değeri bildirir (istek başına en çok bir
   * kez; değişmediyse çağrı yok). Başarısızlık masayı bozmaz: son bildirilen güncellenmez, sonraki değişimde ya da
   * seçili hanın canlı okumasında düzelir.
   */
  async #dolulukBildir(masa: string, haric?: WebSocket): Promise<void> {
    const c = masaAdiCoz(masa);
    if (!c) return;
    try {
      const soketler = this.#ctx.getWebSockets().filter((w) => w !== haric).map((w) => this.#sar(w));
      const oturan = oturanlar(kayitlar(soketler)).length;
      const acik: 0 | 1 = (await this.#ayarAl()).acik === false ? 0 : 1;
      if (this.#sonDoluluk === null) this.#sonDoluluk = (await this.#depo.al<[number, 0 | 1]>(DOLULUK_SON)) ?? [0, 1];
      const son = this.#sonDoluluk;
      if (son && son[0] === oturan && son[1] === acik) return;
      const r = await yerlesimCagir(this.#env, {
        islem: "masaDoluluk", yerlesim: c.yerlesim, hesapId: "",
        govde: { kayitlar: [{ han: c.han, masa: c.no, oturan, acik: acik === 1, z: Date.now() }] },
      });
      if (!r.ok) return;
      this.#sonDoluluk = [oturan, acik];
      if (oturan === 0 && acik === 1) await this.#depo.sil([DOLULUK_SON]);
      else await this.#depo.koy({ [DOLULUK_SON]: [oturan, acik] });
    } catch {
      // en iyi çaba: yerleşim yanıt vermezse kayıt sonraki değişimde ya da canlı okumada düzelir
    }
  }

  /**
   * Canlı masalar vitrini: oyun özeti (tür, aşama, oyuncu, boş yer, seyirci) değiştiyse ya da VITRIN_TAZELE_MS geçtiyse
   * yerleşime bildirir (gizli bilgi yok). Oyun yoksa/bittiyse kayıt silinir. En iyi çaba: hata masayı bozmaz.
   */
  async #vitrinBildir(masa: string, haric?: WebSocket): Promise<void> {
    const c = masaAdiCoz(masa);
    if (!c) return;
    try {
      const oyun = await this.#oyunAl();
      if (this.#sonVitrin === null) this.#sonVitrin = await this.#depo.al<[string, number]>(VITRIN_SON);
      if (!oyun && !this.#sonVitrin) return;
      const bagli = kayitlar(this.#ctx.getWebSockets().filter((w) => w !== haric).map((w) => this.#sar(w))).map((r) => r.ek.h);
      const ozet = vitrinOzeti(oyun, bagli);
      const anahtar = vitrinAnahtari(ozet);
      const simdi = Date.now();
      const son = this.#sonVitrin;
      if (son && son[0] === anahtar && (!ozet || simdi - son[1] < VITRIN_TAZELE_MS)) return;
      const r = await yerlesimCagir(this.#env, {
        islem: "masaOyunu", yerlesim: c.yerlesim, hesapId: "",
        govde: { kayit: { han: c.han, masa: c.no, ...(ozet ? { ozet } : {}), z: simdi } },
      });
      if (!r.ok) return;
      this.#sonVitrin = ozet ? [anahtar, simdi] : undefined;
      if (ozet) await this.#depo.koy({ [VITRIN_SON]: [anahtar, simdi] });
      else await this.#depo.sil([VITRIN_SON]);
    } catch {
      // en iyi çaba: sonraki değişimde düzelir
    }
  }

  async #oyunAl(): Promise<MasaOyunu | undefined> {
    if (this.#oyun === null) this.#oyun = masaOyunuCoz(await this.#depo.al<unknown>(OYUN));
    return this.#oyun;
  }

  #oyunYaz(o: MasaOyunu | undefined): void {
    this.#oyun = o;
    this.#bekleyen.push(o ? this.#depo.koy({ [OYUN]: o }) : this.#depo.sil([OYUN]));
  }

  #sar(ws: WebSocket): MasaSoketi {
    let s = this.#sarmal.get(ws);
    if (!s) {
      s = {
        ek: () => (ws.deserializeAttachment() as SoketEki | null) ?? null,
        ekYaz: (e) => ws.serializeAttachment(e),
        gonder: (v: SunucuIletisi) => {
          try {
            ws.send(JSON.stringify(v));
          } catch {
            // kapanmış soket
          }
        },
        kapat: (kod, neden) => {
          try {
            ws.close(kod, neden);
          } catch {
            // zaten kapalı
          }
        },
      };
      this.#sarmal.set(ws, s);
    }
    return s;
  }

  async #ayarAl(): Promise<MasaAyari> {
    this.#ayar ??= { ...VARSAYILAN_AYAR, ...((await this.#depo.al<Partial<MasaAyari>>(AYAR)) ?? {}) };
    return this.#ayar;
  }

  /** H2: ayar bellekte hemen değişir; depo yazımı işlem sonunda beklenir. Varsayılana dönen ayar silinir. */
  #ayarYaz(ayar: MasaAyari): void {
    this.#ayar = { ...ayar };
    const varsayilan = !ayar.davet?.length && !ayar.sahneYasak && (Object.keys(VARSAYILAN_AYAR) as (keyof MasaAyari)[]).every((a) => ayar[a] === VARSAYILAN_AYAR[a]);
    this.#bekleyen.push(varsayilan ? this.#depo.sil([AYAR]) : this.#depo.koy({ [AYAR]: { ...ayar } }));
  }

  async #etkinlikAl(): Promise<Etkinlik | undefined> {
    if (this.#etkinlik === null) this.#etkinlik = etkinlikCoz(await this.#depo.al<unknown>(ETKINLIK));
    return this.#etkinlik;
  }

  #etkinlikYaz(e: Etkinlik | undefined): void {
    this.#etkinlik = e;
    this.#bekleyen.push(e ? this.#depo.koy({ [ETKINLIK]: e }) : this.#depo.sil([ETKINLIK]));
  }

  /** H8: atışma sonucu masa olayı olur (herkese yayınlanır); kazanan varsa yerleşime anılma için kuyruğa girer. */
  async #anil(masa: string, sonuc: AtismaSonucu, katilim: string[], simdi: number): Promise<void> {
    const olay = await atismaSonucuYaz(this.#depo, masa, sonuc, katilim, simdi);
    for (const w of this.#ctx.getWebSockets()) {
      const s = this.#sar(w);
      const ek = s.ek();
      if (ek && !ek.x) s.gonder({ t: "olay", olay });
    }
    if (sonuc.sonuc !== "kazandi" && sonuc.sonuc !== "berabere") return;
    const kuyruk = (await this.#depo.al<AnmaBekleyen[]>(ANMA_KUYRUK)) ?? [];
    kuyruk.push({ yerlesim: yerlesimAdi(masa), anahtar: `${olay.masa}#${olay.no}`, olay });
    await this.#depo.koy({ [ANMA_KUYRUK]: kuyruk.slice(-ANMA_KUYRUK_EN_COK) });
    this.#anmaVar = true;
  }

  /**
   * Anılma kuyruğunu yerleşime teslim eder (HesapDO giden kutusu deseni): ağ hatası kuyruğu korur ve durur, mantıksal
   * ret öğeyi düşürür. Yerleşim anahtarla tekrar güvenlidir: ikinci teslim ikinci etki üretmez.
   */
  async #anmaBosalt(): Promise<void> {
    if (this.#anmaVar === false) return;
    const kuyruk = (await this.#depo.al<AnmaBekleyen[]>(ANMA_KUYRUK)) ?? [];
    this.#anmaVar = kuyruk.length > 0;
    if (kuyruk.length === 0) return;
    const teslim = new Set<string>();
    for (const k of kuyruk) {
      try {
        await yerlesimCagir(this.#env, { islem: "hanOlayi", yerlesim: k.yerlesim, hesapId: k.olay.kim, govde: { anahtar: k.anahtar, olay: k.olay } });
        teslim.add(k.anahtar);
      } catch {
        break;
      }
    }
    if (teslim.size === 0) return;
    const kalan = ((await this.#depo.al<AnmaBekleyen[]>(ANMA_KUYRUK)) ?? []).filter((k) => !teslim.has(k.anahtar));
    if (kalan.length) await this.#depo.koy({ [ANMA_KUYRUK]: kalan });
    else await this.#depo.sil([ANMA_KUYRUK]);
    this.#anmaVar = kalan.length > 0;
  }

  async #baglam(masa: string, haric?: WebSocket): Promise<MasaBaglami> {
    const env = this.#env;
    const depo = this.#depo;
    const simdi = Date.now();
    const etkinlik = await this.#etkinlikAl();
    const oyun = await this.#oyunAl();
    return {
      masa,
      no: masaNo(masa),
      soketler: this.#ctx
        .getWebSockets()
        .filter((w) => w !== haric)
        .map((w) => this.#sar(w)),
      ayar: await this.#ayarAl(),
      ayarYaz: (a) => this.#ayarYaz(a),
      simdi,
      engelliMi: this.#engelliMi,
      ...(etkinlik ? { etkinlik } : {}),
      etkinlikYaz: (e) => this.#etkinlikYaz(e),
      ...(oyun ? { oyun } : {}),
      oyunYaz: (o) => this.#oyunYaz(o),
      anil: (sonuc, katilim) => {
        this.#bekleyen.push(this.#anil(masa, sonuc, katilim, simdi).catch(() => undefined));
      },
      sesYapilandi: realtimeAyari(env) !== undefined,
      sesKapat: (oturum, mid) => {
        const rt = this.#realtime();
        if (rt) this.#bekleyen.push(rt.izKapat(oturum, [mid]).catch(() => undefined));
      },
      rapor: (kim, govde) => hesapCagir(env, kim, { islem: "sikayet", hesapId: kim, govde, masa: { ad: masa, no: masaNo(masa) } }),
      atma: async (kim, hedef, katilim) => {
        const olay = await atmaUygula(depo, masa, kim, hedef, katilim, simdi);
        try {
          await yonetimCagir(env, { islem: "masaAtma", masa, kim, hedef, olay: olay.no, zaman: simdi });
        } catch {
          // Y1 kaydı en iyi çabadır; olay masada zaten kalıcıdır
        }
        return olay;
      },
    };
  }

  async #baglan(istek: Request): Promise<Response> {
    const bilet = biletCoz(istek.headers.get(BILET_BASLIGI));
    if (!bilet) return jsonYanit({ hata: "gecersiz_istek" }, HATA_DURUMU.gecersiz_istek);
    const b = await this.#baglam(bilet.masa);
    const atma = await this.#depo.al<number>(ATMA + bilet.plaka.hesap);
    const engel = baglanmaEngeli(b, bilet, atma);
    if (engel) {
      return jsonYanit(engel.bitis !== undefined ? { hata: engel.hata, bitis: engel.bitis } : { hata: engel.hata }, HATA_DURUMU[engel.hata]);
    }
    await this.#engelYaz(bilet.plaka.hesap, bilet.eg ?? []);
    const [istemci, sunucu] = this.#araclar.cift();
    this.#ctx.acceptWebSocket(sunucu);
    baglan(b, this.#sar(sunucu), bilet);
    await this.#bosalt();
    await this.#dolulukBildir(bilet.masa);
    await this.#vitrinBildir(bilet.masa);
    return this.#araclar.yukselt(istemci);
  }

  async #engelYaz(hesap: string, liste: readonly string[]): Promise<void> {
    this.#engeller.set(hesap, liste);
    if (liste.length) await this.#depo.koy({ [ENGEL_ANAHTARI + hesap]: liste });
    else await this.#depo.sil([ENGEL_ANAHTARI + hesap]);
  }

  async #isle(ileti: MasaIleti): Promise<Sonuc<unknown>> {
    const b = await this.#baglam(ileti.masa);
    switch (ileti.islem) {
      case "ozet":
        return basarili(ozet(ileti.no, kayitlar(b.soketler), b.ayar));
      case "eylem": {
        etkinlikDenetleYayinla(b, kayitlar(b.soketler));
        const tum = kayitlar(b.soketler);
        const yapan = tum.find((r) => r.ek.h === ileti.hesap);
        const sonuc = await eylemUygula(this.#depo, ileti.hesap, ileti.girdi, {
          masa: ileti.masa,
          oturanlar: oturanlar(tum),
          ...(yapan?.ek.yt.susturma ? { susturma: yapan.ek.yt.susturma } : {}),
          ayar: b.ayar,
          simdi: b.simdi,
          engelliMi: b.engelliMi,
          mesgul: b.etkinlik !== undefined || oyunSuruyor(b.oyun),
        });
        if (!sonuc.ok) return sonuc;
        if (sonuc.deger.yeni) for (const r of kayitlar(b.soketler)) r.soket.gonder({ t: "olay", olay: sonuc.deger.olay });
        // H8: atışma kabulü atışmayı başlatır (tekrar istekte yeni: false → yeniden başlamaz).
        if (sonuc.deger.yeni) atismaBaslatYayinla(b, sonuc.deger.olay);
        return basarili({ olay: sonuc.deger.olay });
      }
      case "cikar":
        return basarili({ cikti: hesabiCikar(b, ileti.hesap, KAPANIS.baskaMasa, "baska_masa") });
      case "yaptirim":
        yaptirimGuncelle(b, ileti.hesap, ileti.durum ?? {});
        return basarili({});
      case "ikramKontrol": {
        const tum = kayitlar(b.soketler);
        const veren = tum.find((r) => r.ek.h === ileti.hesap);
        if (!veren || veren.ek.k === null) return hata("oturmuyor");
        if (surer(veren.ek.yt.susturma, b.simdi)) return { ok: false, hata: "susturuldu", bitis: veren.ek.yt.susturma.bitis };
        if (!tum.some((r) => r.ek.h === ileti.hedef)) return hata("hedef_masada_degil");
        if (await b.engelliMi(ileti.hedef, ileti.hesap)) return hata("engelli");
        return basarili({});
      }
      case "ziyafetKontrol": {
        const tum = kayitlar(b.soketler);
        const veren = tum.find((r) => r.ek.h === ileti.hesap);
        if (!veren || veren.ek.k === null) return hata("oturmuyor");
        if (surer(veren.ek.yt.susturma, b.simdi)) return { ok: false, hata: "susturuldu", bitis: veren.ek.yt.susturma.bitis };
        return basarili({ oturanlar: oturanlar(tum).map((o) => o.hesap) });
      }
      case "engel":
        await this.#engelYaz(ileti.hesap, engelListesiCoz(ileti.liste));
        return basarili({});
      case "ses":
        return sesIsle(b, this.#realtime(), ileti.hesap, ileti.alt, ileti.govde);
      case "anons":
        for (const r of kayitlar(b.soketler)) r.soket.gonder({ t: "anons", anons: ileti.anons });
        return basarili({});
      default:
        return hata("gecersiz_istek");
    }
  }
}
