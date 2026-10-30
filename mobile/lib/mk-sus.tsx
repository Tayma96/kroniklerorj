// Hafif süs ve renk modülü: tek oyunculu kayda (store) bağlanmadan kullanılabilir.
// Çevrimiçi ekranlar ve ortak görsel bileşenler bunu içe aktarır; home-mockup-ui aynı adları yeniden dışa aktarır.
import Svg, { Path, Circle } from "react-native-svg";

export const MK = {
  side: 10,            // panel yan boşluğu
  heroH: 201,          // sahne yüksekliği (durum çubuğu hariç)
  frame: "#A8823F",    // panel çerçevesi
  frameHi: "#C9A24E",  // ince altın vurgu
  panel: "#18120B",    // panel zemini
  ink: "#EDE1C8",      // gövde metni
  muted: "#B9A57F",    // ikincil metin
  gold: "#E2B65A",     // başlık altını
};

// Panel başlığındaki pusula süsü (mockup'taki halkalı yıldız).
export function Ornament({ size = 16, color = MK.gold }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 1 L13.6 10.4 L23 12 L13.6 13.6 L12 23 L10.4 13.6 L1 12 L10.4 10.4 Z" fill={color} />
    <Circle cx="12" cy="12" r="5.2" fill="none" stroke={color} strokeWidth="1.3" />
  </Svg>;
}
