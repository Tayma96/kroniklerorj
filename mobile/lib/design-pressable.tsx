import { forwardRef } from "react";
import { Pressable, StyleSheet, type PressableProps, type View } from "react-native";

// Görsel düğme küçülse de etkileşim alanı korunur. Harita işaretlerinin mutlak
// koordinatı değiştirilmez; hedef, işaretin altında en az 44 piksele genişler.
export const DesignPressable = forwardRef<View, PressableProps>(function DesignPressable({ style, hitSlop, accessibilityRole = "button", ...props }, ref) {
  return <Pressable {...props} ref={ref} accessibilityRole={accessibilityRole} hitSlop={hitSlop ?? 8} style={state => {
    const original = typeof style === "function" ? style(state) : style;
    const flat = StyleSheet.flatten(original) || {};
    return [original, { minHeight: Math.max(44, typeof flat.minHeight === "number" ? flat.minHeight : 0), minWidth: Math.max(44, typeof flat.minWidth === "number" ? flat.minWidth : 0), justifyContent: flat.justifyContent || (flat.position === "absolute" ? "flex-start" : "center") }];
  }} />;
});
