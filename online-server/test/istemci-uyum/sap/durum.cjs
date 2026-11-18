// istemci-uyum sapı: lib/online/durum (useOnline globalThis.__O döner; gerisi boş vekil).
module.exports = new Proxy({ useOnline: () => globalThis.__O }, { get: (t, k) => (k in t ? t[k] : k === "__esModule" ? false : require("./proxy.cjs")) });
