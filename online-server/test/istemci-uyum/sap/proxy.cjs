// istemci-uyum sapı: React Native/Expo/i18n modülleri için her erişimi kendine döndüren boş vekil.
const f = function () { return p; };
const p = new Proxy(f, { get: (t, k) => (k === "__esModule" ? false : k === Symbol.toPrimitive ? () => "" : k === "then" ? undefined : p), apply: () => p });
module.exports = p;
