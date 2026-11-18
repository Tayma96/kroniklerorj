// istemci-uyum sapı: React kancaları düz fonksiyon (hook'lu istemciler bileşen dışında çağrılır).
module.exports = {
  useMemo: (f) => f(), useCallback: (f) => f, useState: (v) => [typeof v === "function" ? v() : v, () => {}], useRef: (v) => ({ current: v }),
  useEffect: () => {}, useLayoutEffect: () => {}, useContext: () => globalThis.__O, createContext: () => ({ Provider: () => null }),
  createElement: () => null, Fragment: "f", memo: (x) => x, forwardRef: (x) => x, useReducer: (r, s) => [s, () => {}], useSyncExternalStore: (a, g) => g(),
};
