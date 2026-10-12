// Aynı kayıt anahtarına yazan tüm işlemler tek sıradan geçer.
export interface KayitDeposu {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
export type KayitDurumu = "idle" | "pending" | "saving" | "error";
interface Saat {
  set(fn: () => void, ms: number): unknown;
  clear(id: unknown): void;
}
const GERCEK_SAAT: Saat = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: id => clearTimeout(id as ReturnType<typeof setTimeout>),
};

// Eksik eski alanlar göçe bırakılır; açıkça bozuk gövde yedek üzerine yazılamaz.
export function kayitGovdesi(raw: string | null): any | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object" || Array.isArray(obj) || !obj.player || typeof obj.player !== "object" || Array.isArray(obj.player)) return null;
    if (obj.turn != null && (typeof obj.turn !== "number" || !Number.isFinite(obj.turn) || obj.turn < 0)) return null;
    return obj;
  } catch { return null; }
}

export function kayitKuyrugu(depo: KayitDeposu, key: string, saat: Saat = GERCEK_SAAT) {
  let chain: Promise<void> = Promise.resolve();
  let revision = 0, ticket = 0;
  let timer: unknown = null, pending: unknown = null, latest: unknown = null;
  let status: KayitDurumu = "idle";
  const listeners = new Set<() => void>();
  const durum = (next: KayitDurumu) => {
    if (status === next) return;
    status = next; listeners.forEach(fn => { try { fn(); } catch {} });
  };
  const cancelPending = () => {
    if (timer != null) saat.clear(timer);
    timer = null; pending = null;
  };
  const enqueue = (op: (current: () => boolean) => Promise<boolean>, version: number): Promise<boolean> => {
    const id = ++ticket;
    const current = () => version === revision;
    const result = chain.then(async () => {
      if (!current()) return false;
      durum("saving");
      try {
        const ok = await op(current);
        if (!current()) return false;
        if (id === ticket) durum(ok ? pending == null ? "idle" : "pending" : "error");
        return ok;
      } catch {
        if (current() && id === ticket) durum("error");
        return false;
      }
    });
    chain = result.then(() => undefined);
    return result;
  };
  const write = (state: unknown, version: number, previous?: unknown): Promise<boolean> => {
    let raw: string;
    let prior: string | null = null;
    try {
      raw = JSON.stringify(state);
      if (!kayitGovdesi(raw)) throw new Error("Kayit govdesi gecersiz");
      if (previous != null && previous !== state) {
        const text = JSON.stringify(previous);
        if (kayitGovdesi(text)) prior = text;
      }
    } catch { durum("error"); return Promise.resolve(false); }
    return enqueue(async current => {
      const prev = await depo.getItem(key);
      if (!current()) return false;
      const backup = prior || (kayitGovdesi(prev) ? prev : null);
      if (backup) await depo.setItem(key + "_bak", backup);
      if (!current()) return false;
      await depo.setItem(key, raw);
      return current();
    }, version);
  };
  const flush = (): Promise<boolean> => {
    const next = pending;
    cancelPending();
    return next == null ? chain.then(() => status !== "error") : write(next, revision);
  };
  return {
    schedule(state: unknown) {
      latest = state; pending = state;
      if (status !== "error") durum("pending");
      if (timer == null) timer = saat.set(() => { timer = null; void flush(); }, 1200);
    },
    saveNow(state: unknown) {
      cancelPending(); latest = state;
      return write(state, revision);
    },
    replace(state: unknown, previous: unknown = latest) {
      cancelPending();
      const version = ++revision;
      return write(state, version, previous).then(ok => {
        if (ok && version === revision) latest = state;
        return ok;
      });
    },
    clear() {
      cancelPending();
      return enqueue(async current => {
        // Yedek önce silinir: yarıda kalan sıfırlama hâlâ ana kaydı korur.
        await depo.removeItem(key + "_bak");
        if (!current()) return false;
        await depo.removeItem(key);
        if (!current()) return false;
        latest = null;
        return true;
      }, ++revision);
    },
    flush,
    idle: () => chain,
    version: () => revision,
    snapshot: () => latest,
    remember(state: unknown) { latest = state; },
    reportFailure() { durum("error"); },
    status: () => status,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  };
}
