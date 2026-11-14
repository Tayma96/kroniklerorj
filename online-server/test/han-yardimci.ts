// Han testi yardımcıları: çekirdek için sahte MasaSoketi, DO için sahte hibernation WebSocket'i ve bağlamı.

import type { MasaBaglami, MasaSoketi } from "../src/han/masa.ts";
import type { MasaAyari, MasaBileti, MasaOlayi, SoketEki, SunucuIletisi } from "../src/han/tipler.ts";
import type { HesapYaptirimi, Sonuc } from "../src/tipler.ts";
import type { MasaAraclari, WebSocketDurumu } from "../src/masa-do.ts";
import { basarili } from "../src/tipler.ts";

export const MASA = "masa:kizilca:menzil:1";

export interface SahteSoket extends MasaSoketi {
  giden: SunucuIletisi[];
  kapanis: [number, string] | null;
  son<T extends SunucuIletisi["t"]>(t: T): Extract<SunucuIletisi, { t: T }> | undefined;
  hepsi<T extends SunucuIletisi["t"]>(t: T): Extract<SunucuIletisi, { t: T }>[];
}

export function sahteSoket(): SahteSoket {
  let ek: SoketEki | null = null;
  const s: SahteSoket = {
    giden: [],
    kapanis: null,
    ek: () => (ek ? structuredClone(ek) : null),
    ekYaz: (e) => {
      ek = structuredClone(e);
    },
    gonder: (v) => {
      s.giden.push(structuredClone(v));
    },
    kapat: (kod, neden) => {
      s.kapanis ??= [kod, neden];
    },
    son: (t) => s.hepsi(t).at(-1),
    hepsi: <T extends SunucuIletisi["t"]>(t: T) => s.giden.filter((g) => g.t === t) as Extract<SunucuIletisi, { t: T }>[],
  };
  return s;
}

export function bilet(hesap: string, ad = hesap, yt: HesapYaptirimi = {}, cerceve?: string): MasaBileti {
  return { masa: MASA, no: 1, plaka: { hesap, ad, ...(cerceve ? { cerceve } : {}) }, yt };
}

/** Bellekte masa: soket listesi + değiştirilebilir saat; her çağrıda taze bağlam üretir. */
export function sahteMasa(ek: Partial<Pick<MasaBaglami, "engelliMi" | "rapor">> = {}) {
  const soketler: SahteSoket[] = [];
  const atmalar: { kim: string; hedef: string; katilim: string[] }[] = [];
  const raporlar: { kim: string; govde: Record<string, unknown> }[] = [];
  let simdi = 1_800_000_000_000;
  let ayar: MasaAyari = { tur: "acik", acik: true, sesli: false, kavgaYasak: false, kilitli: false };
  const ayarYazimlari: MasaAyari[] = [];
  const m = {
    soketler,
    ayarYazimlari,
    get ayar() {
      return ayar;
    },
    set ayar(a: MasaAyari) {
      ayar = a;
    },
    atmalar,
    raporlar,
    ileri(ms: number) {
      simdi += ms;
    },
    get simdi() {
      return simdi;
    },
    baglam(): MasaBaglami {
      return {
        masa: MASA,
        no: 1,
        soketler: soketler.filter((s) => !s.kapanis),
        ayar: { ...ayar },
        ayarYaz: (a) => {
          ayar = { ...a };
          ayarYazimlari.push({ ...a });
        },
        simdi,
        engelliMi: ek.engelliMi ?? (async () => false),
        rapor:
          ek.rapor ??
          (async (kim, govde) => {
            raporlar.push({ kim, govde });
            return basarili({ id: 1, durum: "acik", kalan: 4 }) as Sonuc<unknown>;
          }),
        atma: async (kim, hedef, katilim) => {
          atmalar.push({ kim, hedef, katilim });
          return { no: atmalar.length, masa: MASA, tur: "atma", kim, hedef, zaman: simdi, katilim } satisfies MasaOlayi;
        },
      };
    },
  };
  return m;
}

// ---------------------------------------------------------------- DO düzeyi

export class SahteWebSoket implements WebSocket {
  readyState = 1;
  giden: SunucuIletisi[] = [];
  kapanis: [number, string] | null = null;
  #ek: unknown = null;
  send(m: string): void {
    if (this.readyState !== 1) throw new Error("kapalı");
    this.giden.push(JSON.parse(m) as SunucuIletisi);
  }
  close(kod?: number, neden?: string): void {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.kapanis = [kod ?? 1000, neden ?? ""];
  }
  serializeAttachment(v: unknown): void {
    this.#ek = structuredClone(v);
  }
  deserializeAttachment(): unknown {
    return structuredClone(this.#ek);
  }
  son<T extends SunucuIletisi["t"]>(t: T): Extract<SunucuIletisi, { t: T }> | undefined {
    return this.giden.filter((g) => g.t === t).at(-1) as Extract<SunucuIletisi, { t: T }> | undefined;
  }
}

/** sahteAdAlani'nin verdiği ctx'e hibernation yöntemlerini ekler (kapanan soketler listeden düşer). */
export function hibernasyonlu(ctx: DurableObjectState): WebSocketDurumu {
  const soketler: SahteWebSoket[] = [];
  return Object.assign(ctx, {
    acceptWebSocket: (ws: WebSocket) => {
      soketler.push(ws as SahteWebSoket);
    },
    getWebSockets: () => soketler.filter((s) => s.readyState === 1),
  });
}

/** Testte 101 yanıtı kurulamaz (Node): yükseltilen istemci ucu yerine sunucu ucu saklanır, 200 döner. */
export function sahteAraclar(): MasaAraclari & { sunucular: SahteWebSoket[] } {
  const sunucular: SahteWebSoket[] = [];
  return {
    sunucular,
    cift: () => {
      const s = new SahteWebSoket();
      sunucular.push(s);
      return [new SahteWebSoket(), s];
    },
    yukselt: () => new Response(JSON.stringify({ yukseltildi: true }), { status: 200 }),
  };
}
