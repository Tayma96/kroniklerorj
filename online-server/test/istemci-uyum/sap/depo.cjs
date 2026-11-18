// istemci-uyum sapı: lib/online/depo (oturum globalThis.__OTURUM'dan; istekNo sayaçlı).
let n = 0;
module.exports = new Proxy({ oturumOku: async () => globalThis.__OTURUM ?? null, istekNoUret: () => `denetim-${Date.now().toString(36)}-${(++n).toString().padStart(6, "0")}` },
  { get: (t, k) => (k in t ? t[k] : k === "__esModule" ? false : async () => null) });
