// MasaDO: masa başına bir örnek (idFromName("masa:<yerlesim>:<han>:<no>")). WebSocket hibernation API'si.
// Yalnız oturum, katılım ve sohbet akışı; para tutmaz, para işlemi yapmaz (GDD §13).
// Kalıcı olanlar: masa ayarı, olaylar (katılım listesiyle), istekNo kaydı, masa başının dönüş yasakları.
// Sohbet iletileri depoya ya da soket ekine yazılmaz; yalnız bağlı istemcilere gönderilir.
// İnce sarmalayıcıdır; kurallar src/han/masa.ts ve src/han/eylem.ts'dedir.
// Faz 16 ses: yetki kapısı src/han/ses.ts, Realtime istemcisi src/han/realtime.ts. Ses depoya yazılmaz, kaydedilmez.

import { doDepo, type Depo } from "./depo.ts";
import { ENGEL_ANAHTARI, engelListesiCoz, engelSorgusuKur, type EngelSorgusu } from "./han/engel-kopru.ts";
import { ATMA, atmaUygula, eylemUygula } from "./han/eylem.ts";
import { BILET_BASLIGI } from "./han/ic.ts";
import { KAPANIS, surer, VARSAYILAN_AYAR } from "./han/kurallar.ts";
import {
  ayril,
  baglan,
  baglanmaEngeli,
  hesabiCikar,
  iletiIsle,
  kayitlar,
  oturanlar,
  ozet,
  yaptirimGuncelle,
  type MasaBaglami,
  type MasaSoketi,
} from "./han/masa.ts";
import type { MasaAyari, MasaBileti, MasaIleti, SoketEki, SunucuIletisi } from "./han/tipler.ts";
import { Realtime, realtimeAyari, type Getir } from "./han/realtime.ts";
import { sesIsle } from "./han/ses.ts";
import { hesapCagir, iletiOku, jsonYanit, yonetimCagir } from "./ic.ts";
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

function masaNo(ad: string): number {
  const n = Number(ad.slice(ad.lastIndexOf(":") + 1));
  return Number.isInteger(n) ? n : 0;
}

function biletCoz(ham: string | null): MasaBileti | undefined {
  if (!ham) return undefined;
  try {
    const b = JSON.parse(decodeURIComponent(ham)) as MasaBileti;
    if (typeof b?.masa === "string" && typeof b.no === "number" && typeof b.plaka?.hesap === "string" && typeof b.plaka.ad === "string") {
      return { masa: b.masa, no: b.no, plaka: { hesap: b.plaka.hesap, ad: b.plaka.ad, ...(typeof b.plaka.cerceve === "string" && b.plaka.cerceve.length <= 40 ? { cerceve: b.plaka.cerceve } : {}) }, yt: b.yt ?? {}, eg: engelListesiCoz(b.eg) };
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
    return jsonYanit(sonuc);
  }

  async webSocketMessage(ws: WebSocket, mesaj: string | ArrayBuffer): Promise<void> {
    const ek = this.#sar(ws).ek();
    if (!ek) return;
    await iletiIsle(await this.#baglam(ek.m), this.#sar(ws), mesaj);
    await this.#bosalt();
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
    try {
      ws.close(1000, "ayrildi");
    } catch {
      // zaten kapalı
    }
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

  async #baglam(masa: string, haric?: WebSocket): Promise<MasaBaglami> {
    const env = this.#env;
    const depo = this.#depo;
    const simdi = Date.now();
    return {
      masa,
      no: masaNo(masa),
      soketler: this.#ctx
        .getWebSockets()
        .filter((w) => w !== haric)
        .map((w) => this.#sar(w)),
      ayar: await this.#ayarAl(),
      simdi,
      engelliMi: this.#engelliMi,
      sesYapilandi: realtimeAyari(env) !== undefined,
      sesKapat: (oturum, mid) => {
        const rt = this.#realtime();
        if (rt) this.#bekleyen.push(rt.izKapat(oturum, [mid]).catch(() => undefined));
      },
      rapor: (kim, govde) => hesapCagir(env, kim, { islem: "sikayet", hesapId: kim, govde }),
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
        const tum = kayitlar(b.soketler);
        const yapan = tum.find((r) => r.ek.h === ileti.hesap);
        const sonuc = await eylemUygula(this.#depo, ileti.hesap, ileti.girdi, {
          masa: ileti.masa,
          oturanlar: oturanlar(tum),
          ...(yapan?.ek.yt.susturma ? { susturma: yapan.ek.yt.susturma } : {}),
          ayar: b.ayar,
          simdi: b.simdi,
          engelliMi: b.engelliMi,
        });
        if (!sonuc.ok) return sonuc;
        if (sonuc.deger.yeni) for (const r of kayitlar(b.soketler)) r.soket.gonder({ t: "olay", olay: sonuc.deger.olay });
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
