// xorshift32: yalnız verilen durumun zarını ilerletir; ortam Math.random'ına dokunmaz.
export function nextRandom(state: { rng_state?: number }, fallback = 0x6d2b79f5): number {
  let x = Number.isFinite(state.rng_state) && (state.rng_state! >>> 0) !== 0
    ? state.rng_state! >>> 0
    : (fallback >>> 0) || 0x6d2b79f5;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  state.rng_state = x >>> 0 || 0x6d2b79f5;
  return state.rng_state / 0x100000000;
}
