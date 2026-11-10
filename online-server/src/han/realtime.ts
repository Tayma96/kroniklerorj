// Cloudflare Realtime SFU istemcisi (Faz 16, handa sesli sohbet). Yalnız sunucuda çalışır: uygulama anahtarı
// (REALTIME_APP_TOKEN) istemciye hiçbir yanıtta gitmez. Ses SFU'dan geçer; sunucu yalnız oturum/iz kimliklerini
// yönetir, ses verisine dokunmaz, kaydetmez, saklamaz (GDD §16 "Sohbet ve ses").
// `getir` dışarıdan verilir (DO'da global fetch, testte sahte; testler gerçek ağa çıkmaz).

import { basarili, hata, type Env, type Sonuc } from "../tipler.ts";

export const REALTIME_KOK = "https://rtc.live.cloudflare.com/v1";
/** TURN yoksa yalnız Cloudflare STUN'u (ücretsiz). */
export const VARSAYILAN_ICE: readonly IceSunucusu[] = [{ urls: ["stun:stun.cloudflare.com:3478"] }];
/** SDP gövdesi sınırı (AZAMI_GOVDE 16 KB'nin altında). */
export const SDP_EN_UZUN = 12_000;
const KIMLIK = /^[A-Za-z0-9_-]{1,128}$/;
const MID = /^[A-Za-z0-9_-]{1,32}$/;

export type Getir = (url: string, init: RequestInit) => Promise<Response>;

export interface RealtimeAyari {
  appId: string;
  token: string;
  /** İsteğe bağlı TURN anahtarı (kısıtlı ağlar için); yoksa STUN. */
  turnId?: string;
  turnToken?: string;
}

export interface Sdp {
  type: "offer" | "answer";
  sdp: string;
}

export interface IceSunucusu {
  urls: string[] | string;
  username?: string;
  credential?: string;
}

interface HamIz {
  mid?: string;
  trackName?: string;
  sessionId?: string;
  errorCode?: string;
}

interface HamYanit {
  sessionId?: string;
  sessionDescription?: Sdp;
  requiresImmediateRenegotiation?: boolean;
  tracks?: HamIz[];
  errorCode?: string;
  iceServers?: IceSunucusu[];
}

export interface IzSonucu {
  /** SFU'nun yanıtı (yayında answer, çekişte offer). */
  sdp: Sdp | null;
  yeniden: boolean;
  izler: { mid: string; iz: string }[];
}

/** Ortamdan ayar: ikisi de doluysa ses açıktır; biri boşsa undefined (uçlar `ses_kapali` döner). */
export function realtimeAyari(env: Pick<Env, "REALTIME_APP_ID" | "REALTIME_APP_TOKEN" | "REALTIME_TURN_ID" | "REALTIME_TURN_TOKEN">): RealtimeAyari | undefined {
  const appId = env.REALTIME_APP_ID?.trim();
  const token = env.REALTIME_APP_TOKEN?.trim();
  if (!appId || !token || !KIMLIK.test(appId)) return undefined;
  const turnId = env.REALTIME_TURN_ID?.trim();
  const turnToken = env.REALTIME_TURN_TOKEN?.trim();
  return { appId, token, ...(turnId && turnToken && KIMLIK.test(turnId) ? { turnId, turnToken } : {}) };
}

/** İstemciden gelen SDP metni: dize, sınır içinde, "v=0" ile başlar. */
export function sdpCoz(ham: unknown, tur: Sdp["type"]): Sdp | undefined {
  if (typeof ham !== "string" || ham.length < 4 || ham.length > SDP_EN_UZUN || !ham.startsWith("v=0")) return undefined;
  return { type: tur, sdp: ham };
}

export function midCoz(ham: unknown): string | undefined {
  return typeof ham === "string" && MID.test(ham) ? ham : undefined;
}

export class Realtime {
  readonly #ayar: RealtimeAyari;
  readonly #getir: Getir;

  constructor(ayar: RealtimeAyari, getir: Getir) {
    this.#ayar = ayar;
    this.#getir = getir;
  }

  async #cagir(url: string, yontem: "POST" | "PUT", token: string, govde?: unknown): Promise<Sonuc<HamYanit>> {
    let y: Response;
    try {
      y = await this.#getir(url, {
        method: yontem,
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        ...(govde === undefined ? {} : { body: JSON.stringify(govde) }),
      });
    } catch {
      return hata("ses_hatasi");
    }
    let v: HamYanit;
    try {
      v = (await y.json()) as HamYanit;
    } catch {
      return hata("ses_hatasi");
    }
    if (!y.ok || typeof v !== "object" || v === null || v.errorCode) return hata("ses_hatasi");
    if (v.tracks?.some((t) => t.errorCode)) return hata("ses_hatasi");
    return basarili(v);
  }

  #oturumYolu(oturum: string, ek: string): string {
    return `${REALTIME_KOK}/apps/${this.#ayar.appId}/sessions/${encodeURIComponent(oturum)}/${ek}`;
  }

  /** POST /apps/{appId}/sessions/new */
  async oturumAc(): Promise<Sonuc<string>> {
    const r = await this.#cagir(`${REALTIME_KOK}/apps/${this.#ayar.appId}/sessions/new`, "POST", this.#ayar.token);
    if (!r.ok) return r;
    const id = r.deger.sessionId;
    return typeof id === "string" && KIMLIK.test(id) ? basarili(id) : hata("ses_hatasi");
  }

  #izSonucu(v: HamYanit): IzSonucu {
    const izler: IzSonucu["izler"] = [];
    for (const t of v.tracks ?? []) if (typeof t.mid === "string" && typeof t.trackName === "string") izler.push({ mid: t.mid, iz: t.trackName });
    const s = v.sessionDescription;
    return {
      sdp: s && (s.type === "offer" || s.type === "answer") && typeof s.sdp === "string" ? { type: s.type, sdp: s.sdp } : null,
      yeniden: v.requiresImmediateRenegotiation === true,
      izler,
    };
  }

  /** Yerel (mikrofon) izini yayına ekler: istemcinin offer'ı → SFU'nun answer'ı. */
  async izEkle(oturum: string, teklif: Sdp, mid: string, iz: string): Promise<Sonuc<IzSonucu>> {
    const r = await this.#cagir(this.#oturumYolu(oturum, "tracks/new"), "POST", this.#ayar.token, {
      sessionDescription: teklif,
      tracks: [{ location: "local", mid, trackName: iz }],
    });
    return r.ok ? basarili(this.#izSonucu(r.deger)) : r;
  }

  /** Başka oturumların izlerini çeker: SFU offer döner, istemci answer'ı `yenidenAnlas` ile yollar. */
  async izCek(oturum: string, izler: { oturum: string; iz: string }[]): Promise<Sonuc<IzSonucu>> {
    const r = await this.#cagir(this.#oturumYolu(oturum, "tracks/new"), "POST", this.#ayar.token, {
      tracks: izler.map((i) => ({ location: "remote", sessionId: i.oturum, trackName: i.iz })),
    });
    return r.ok ? basarili(this.#izSonucu(r.deger)) : r;
  }

  /** PUT /sessions/{id}/renegotiate */
  async yenidenAnlas(oturum: string, cevap: Sdp): Promise<Sonuc<true>> {
    const r = await this.#cagir(this.#oturumYolu(oturum, "renegotiate"), "PUT", this.#ayar.token, { sessionDescription: cevap });
    return r.ok ? basarili(true) : r;
  }

  /** PUT /sessions/{id}/tracks/close. Teklif yoksa `force` (sunucu tarafı kesme: susturma, atma, ayrılma). */
  async izKapat(oturum: string, mids: string[], teklif?: Sdp): Promise<Sonuc<Sdp | null>> {
    const r = await this.#cagir(this.#oturumYolu(oturum, "tracks/close"), "PUT", this.#ayar.token, {
      tracks: mids.map((mid) => ({ mid })),
      force: !teklif,
      ...(teklif ? { sessionDescription: teklif } : {}),
    });
    return r.ok ? basarili(this.#izSonucu(r.deger).sdp) : r;
  }

  /** ICE sunucuları: TURN anahtarı varsa kısa ömürlü kimlik üretilir (anahtar istemciye gitmez), yoksa STUN. */
  async iceSunuculari(): Promise<IceSunucusu[]> {
    const { turnId, turnToken } = this.#ayar;
    if (!turnId || !turnToken) return [...VARSAYILAN_ICE];
    const r = await this.#cagir(`${REALTIME_KOK}/turn/keys/${turnId}/credentials/generate-ice-servers`, "POST", turnToken, { ttl: 86_400 });
    if (!r.ok || !Array.isArray(r.deger.iceServers) || r.deger.iceServers.length === 0) return [...VARSAYILAN_ICE];
    return r.deger.iceServers;
  }
}
