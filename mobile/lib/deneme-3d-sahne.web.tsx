import { View } from "react-native";
import type { Deneme3DSahneProps } from "./deneme-3d-sahne";

// react-native-filament web'i desteklemez; web paketinde yerel modül çekilmesin diye boş zemin.
export type { SahneTutamak } from "./deneme-3d-sahne";
export function Deneme3DSahne({ arkaPlan }: Deneme3DSahneProps) {
  return <View style={{ flex: 1, backgroundColor: arkaPlan }} />;
}
