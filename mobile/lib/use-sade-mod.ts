import { useSyncExternalStore } from "react";
import { isReduceMotion, onReduceMotionChange } from "./perf";

// Tercih değişince görünür portre, sahne ve parçacıklar da aynı anda durur.
export function useSadeMod(): boolean {
  return useSyncExternalStore(onReduceMotionChange, isReduceMotion, isReduceMotion);
}
