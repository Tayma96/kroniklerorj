// Görsel paylaşım kartı: ekrandaki kart View'u Skia ile PNG'ye çekilir, önbelleğe yazılır ve sistem paylaşım penceresiyle
// gönderilir (Android/iOS). Kartın metni zaten görselin içindedir; Android paylaşımı resme altyazı eklemeye izin vermediği için
// metin ayrıca "metin olarak" düğmesiyle paylaşılabilir. Herhangi bir adım başarısız olursa (yerel modül yok — eski APK,
// paylaşım yok, çekim başarısız) metin paylaşımına düşülür. Ağ yok, sunucu yok.
import type { RefObject } from "react";
import { Share, View } from "react-native";

export type PaylasimSonucu = "gorsel" | "metin" | "yok";

export async function metinPaylas(metin: string): Promise<PaylasimSonucu> {
  try { await Share.share({ message: metin }); return "metin"; } catch { return "yok"; }
}

export async function kartPaylas(ref: RefObject<View | null>, metin: string, dosyaAdi: string, baslik: string): Promise<PaylasimSonucu> {
  try {
    // Yerel modüller içeride yüklenir: eski bir APK'da (modül derlenmemişse) ekran çökmez, metne düşer.
    const Sharing = await import("expo-sharing");
    if (!(await Sharing.isAvailableAsync())) throw new Error("paylaşım yok");
    const { makeImageFromView, ImageFormat } = await import("@shopify/react-native-skia");
    const img = await makeImageFromView(ref as RefObject<View>);
    if (!img) throw new Error("çekim yok");
    const bayt = img.encodeToBytes(ImageFormat.PNG, 100);
    if (!bayt || !bayt.length) throw new Error("kodlama yok");
    const { File, Paths } = await import("expo-file-system");
    const f = new File(Paths.cache, dosyaAdi.replace(/[^a-z0-9_-]/gi, "_") + ".png");
    if (f.exists) f.delete();
    f.create();
    f.write(bayt);
    await Sharing.shareAsync(f.uri, { mimeType: "image/png", dialogTitle: baslik, UTI: "public.png" });
    return "gorsel";
  } catch {
    return metinPaylas(metin);
  }
}
