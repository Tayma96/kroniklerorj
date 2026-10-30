// İş mantığının gördüğü küçük anahtar-değer arayüzü. DO'da Durable Object depolamasına,
// testte belleğe bağlanır. Bir DO içinde yalnız depolama beklemeleri arasında başka istek araya girmez
// (giriş kapısı), bu yüzden oku-hesapla-yaz dizileri atomiktir.

export interface Depo {
  al<T>(anahtar: string): Promise<T | undefined>;
  alCok<T>(anahtarlar: string[]): Promise<Map<string, T>>;
  /** Hepsi tek seferde ve birlikte yazılır. */
  koy(kayitlar: Record<string, unknown>): Promise<void>;
  sil(anahtarlar: string[]): Promise<void>;
}

/** Tek çağrıda okunup yazılabilecek en çok anahtar (DO sınırı). */
export const DEPO_TOPLU_SINIR = 128;

/** Toplu çağrılarda en fazla 128 anahtar (DO sınırı); çağıran parçalar. */
export function doDepo(depolama: DurableObjectStorage): Depo {
  return {
    al: <T>(anahtar: string) => depolama.get<T>(anahtar),
    alCok: <T>(anahtarlar: string[]) => depolama.get<T>(anahtarlar),
    koy: (kayitlar) => depolama.put(kayitlar),
    sil: async (anahtarlar) => {
      await depolama.delete(anahtarlar);
    },
  };
}

export interface BellekDepo extends Depo {
  readonly veri: Map<string, unknown>;
}

/** Testler için; değerleri DO depolaması gibi kopyalar. */
export function bellekDepo(): BellekDepo {
  const veri = new Map<string, unknown>();
  return {
    veri,
    async al<T>(anahtar: string) {
      return structuredClone(veri.get(anahtar)) as T | undefined;
    },
    async alCok<T>(anahtarlar: string[]) {
      const sonuc = new Map<string, T>();
      for (const a of anahtarlar) if (veri.has(a)) sonuc.set(a, structuredClone(veri.get(a)) as T);
      return sonuc;
    },
    async koy(kayitlar) {
      for (const [a, d] of Object.entries(kayitlar)) veri.set(a, structuredClone(d));
    },
    async sil(anahtarlar) {
      for (const a of anahtarlar) veri.delete(a);
    },
  };
}
