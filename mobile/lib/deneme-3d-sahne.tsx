import { useEffect, useMemo } from "react";
import { View, useWindowDimensions } from "react-native";
import { Camera, EnvironmentalLight, FilamentScene, FilamentView, Light, ModelRenderer, RenderCallbackContext, useAnimator, useModel } from "react-native-filament";
import { useSharedValue } from "react-native-worklets-core";

// 3D deneme sahnesi (react-native-filament). Web karşılığı: deneme-3d-sahne.web.tsx.
// Tek 'worklet' aşağıdaki çizim döngüsüdür. Onu (ve Filament'in kendi iç worklet'lerini)
// babel-preset-expo'nun eklediği react-native-worklets eklentisi derler; worklets-core babel
// eklentisi bilerek eklenmedi: ikisi de aynı __closure/__initData/__workletHash biçimini üretir.
// Reanimated API'si burada kullanılmaz; paylaşılan değerler worklets-core'dandır.

const MODEL = require("../assets/3d/deneme_savasci.glb");

const GECIS_SN = 0.2; // klipler arası çapraz geçiş
// Kadraj: model birim küpe sığdırılır (en uzun kenar 2 birim, merkez 0,0,0).
const ODAK_MM = 35; // Filament lensi 24 mm sensör yüksekliği kullanır → dikey görüş ≈ 37.8°
const YARI_YUKSEKLIK = 1.15; // boy + pay
const YARI_GENISLIK = 1.0; // saldırıda öne uzanan kol/silah için yatay pay
const YAN_SAPMA = (15 * Math.PI) / 180; // tam profilden öne doğru küçük sapma
const YUKSELTI = (8 * Math.PI) / 180; // kamerayı hafif yukarıdan baktırır
const HEDEF: [number, number, number] = [0, -0.12, 0]; // gövde, alttaki düğmelerden biraz yukarıda dursun
const ANAHTAR_ISIK: [number, number, number] = [0.56, -0.66, -0.5]; // kamera tarafından, yukarı-önden

export type SahneTutamak = {
  /** Modelde bulunan istenen klipler (ilk eleman döngüdeki bekleme klibi). */
  klipler: string[];
  /** Klibi baştan oynatır; bekleme dışındakiler bir kez oynar, sonra beklemeye çapraz geçişle döner. */
  oynat: (ad: string) => boolean;
  /** Çizim döngüsünde şu an oynayan klip. */
  aktif: () => string;
  /** Çizim döngüsünün başından beri çizilen kare sayısı (gerçek 3D FPS için). */
  kare: () => number;
};
export type Deneme3DSahneProps = { klipler: readonly string[]; arkaPlan: string; onHazir: (t: SahneTutamak | null) => void };

function klipBul(adlar: string[], ad: string): number {
  const k = ad.toLowerCase(), kucuk = adlar.map((a) => a.toLowerCase());
  let i = kucuk.indexOf(k);
  if (i < 0) i = kucuk.findIndex((a) => a.endsWith("|" + k));
  if (i < 0) i = kucuk.findIndex((a) => a.includes(k));
  return i;
}

export function Deneme3DSahne({ klipler, arkaPlan, onHazir }: Deneme3DSahneProps) {
  const { width, height } = useWindowDimensions();
  const kamera = useMemo(() => {
    const tanY = 12 / ODAK_MM, oran = width > 0 && height > 0 ? width / height : 0.5;
    const d = Math.max(YARI_YUKSEKLIK / tanY, YARI_GENISLIK / (tanY * oran)) + 0.5;
    const yatay = d * Math.cos(YUKSELTI);
    const konum: [number, number, number] = [HEDEF[0] - yatay * Math.cos(YAN_SAPMA), HEDEF[1] + d * Math.sin(YUKSELTI), HEDEF[2] + yatay * Math.sin(YAN_SAPMA)];
    return konum;
  }, [width, height]);
  return (
    <View style={{ flex: 1, backgroundColor: arkaPlan }}>
      <FilamentScene>
        <FilamentView style={{ flex: 1 }}>
          <Camera cameraPosition={kamera} cameraTarget={HEDEF} focalLengthInMillimeters={ODAK_MM} near={0.1} far={50} />
          <EnvironmentalLight source={{ uri: "RNF_default_env_ibl.ktx" }} intensity={30_000} />
          <Light type="directional" direction={ANAHTAR_ISIK} intensity={40_000} colorKelvin={5_600} castShadows={false} />
          <Savasci klipler={klipler} onHazir={onHazir} />
        </FilamentView>
      </FilamentScene>
    </View>
  );
}

function Savasci({ klipler, onHazir }: Pick<Deneme3DSahneProps, "klipler" | "onHazir">) {
  const model = useModel(MODEL);
  const animator = useAnimator(model);

  // Klip tablosu JS tarafında bir kez okunur (Filament animatörü kendi kilidini tutar).
  const tablo = useMemo(() => {
    if (animator == null) return null;
    const adlar: string[] = [], sureler: number[] = [];
    for (let i = 0; i < animator.getAnimationCount(); i++) { adlar.push(animator.getAnimationName(i)); sureler.push(animator.getAnimationDuration(i)); }
    const indeks = klipler.map((k) => klipBul(adlar, k));
    if (indeks[0] < 0 && adlar.length > 0) indeks[0] = 0; // adı tutmasa da ilk klip beklemede döner
    return { sureler, indeks };
  }, [animator, klipler]);
  const sureler = useMemo(() => tablo?.sureler ?? [], [tablo]);
  const bekle = tablo?.indeks[0] ?? -1;

  // JS → çizim iş parçacığı istek kanalı ve çizim tarafının durumu.
  const istekKlip = useSharedValue(-1);
  const istekNo = useSharedValue(0);
  const gorulenNo = useSharedValue(0);
  const aktifKlip = useSharedValue(-1);
  const basla = useSharedValue(0);
  const onceki = useSharedValue(-1);
  const oncekiZaman = useSharedValue(0);
  const gecisBasla = useSharedValue(0);
  const kare = useSharedValue(0);

  RenderCallbackContext.useRenderCallback(
    ({ passedSeconds }) => {
      "worklet";
      kare.value += 1;
      if (animator == null || bekle < 0) return;
      const simdi = passedSeconds;
      // Bekleme döngüde, tek seferlik klipler son karede durur (Filament zamanı sarabilir).
      const zaman = (k: number, t: number) => {
        const s = sureler[k] ?? 0;
        if (s <= 0) return 0;
        return k === bekle ? t % s : Math.min(Math.max(t, 0), s - 0.001);
      };
      const gecir = (yeni: number) => {
        onceki.value = aktifKlip.value;
        oncekiZaman.value = simdi - basla.value;
        gecisBasla.value = simdi;
        aktifKlip.value = yeni;
        basla.value = simdi;
      };
      if (aktifKlip.value < 0) { aktifKlip.value = bekle; basla.value = simdi; }
      if (istekNo.value !== gorulenNo.value) {
        gorulenNo.value = istekNo.value;
        const yeni = istekKlip.value;
        if (yeni >= 0 && yeni < sureler.length && !(yeni === bekle && aktifKlip.value === bekle)) gecir(yeni);
      }
      // Tek seferlik klip bitmek üzereyken beklemeye çapraz geçişle dön.
      if (aktifKlip.value !== bekle && simdi - basla.value >= (sureler[aktifKlip.value] ?? 0) - GECIS_SN) gecir(bekle);

      const klip = aktifKlip.value;
      animator.applyAnimation(klip, zaman(klip, simdi - basla.value));
      const o = onceki.value;
      if (o >= 0) {
        const gecen = simdi - gecisBasla.value, alfa = gecen / GECIS_SN;
        if (alfa >= 1) onceki.value = -1;
        else animator.applyCrossFade(o, zaman(o, oncekiZaman.value + gecen), alfa);
      }
      animator.updateBoneMatrices();
    },
    [animator, bekle, sureler, istekKlip, istekNo, gorulenNo, aktifKlip, basla, onceki, oncekiZaman, gecisBasla, kare]
  );

  useEffect(() => {
    if (tablo == null || bekle < 0) { onHazir(null); return; }
    const harita = new Map<string, number>();
    klipler.forEach((k, i) => { if (tablo.indeks[i] >= 0) harita.set(k, tablo.indeks[i]); });
    onHazir({
      klipler: [...harita.keys()],
      oynat: (ad) => {
        const i = harita.get(ad);
        if (i == null) return false;
        istekKlip.value = i;
        istekNo.value = istekNo.value + 1;
        return true;
      },
      aktif: () => {
        const i = aktifKlip.value;
        for (const [ad, k] of harita) if (k === i) return ad;
        return klipler[0];
      },
      kare: () => kare.value,
    });
    return () => onHazir(null);
  }, [tablo, bekle, klipler, onHazir, istekKlip, istekNo, aktifKlip, kare]);

  return <ModelRenderer model={model} transformToUnitCube />;
}
