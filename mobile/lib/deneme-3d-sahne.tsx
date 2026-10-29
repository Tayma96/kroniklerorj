import { useEffect, useMemo } from "react";
import { AccessibilityInfo, View, useWindowDimensions } from "react-native";
import { Camera, EnvironmentalLight, FilamentScene, FilamentView, Light, ModelRenderer, RenderCallbackContext, useAnimator, useFilamentContext, useModel } from "react-native-filament";
import { useSharedValue } from "react-native-worklets-core";

// 3D deneme sahnesi (react-native-filament). Web karşılığı: deneme-3d-sahne.web.tsx.
// Tek 'worklet' aşağıdaki çizim döngüsüdür. Onu (ve Filament'in kendi iç worklet'lerini)
// babel-preset-expo'nun eklediği react-native-worklets eklentisi derler; worklets-core babel
// eklentisi bilerek eklenmedi: ikisi de aynı __closure/__initData/__workletHash biçimini üretir.
// Reanimated API'si burada kullanılmaz; paylaşılan değerler worklets-core'dandır.

const MODEL = require("../assets/3d/deneme_savasci.glb");
// Blender dışa aktarımının yazdığı zamanlama yan dosyası. Klip süresi animatörden okunabiliyorsa o esastır.
type KlipZaman = { sure?: number; dongu?: boolean; temas?: number; agir?: boolean };
const ZAMAN: { fps?: number; klipler?: Record<string, KlipZaman | undefined> } = require("../assets/3d/deneme_savasci.json");

// Geçiş süreleri (sn); ağırlık eğrisi doğrusal değil, smoothstep. Filament aynı anda yalnız iki klibi karıştırır.
const GIRIS_SN: Record<string, number> = { saldir: 0.08, savustur: 0.06 }; // beklemeden eyleme
const GIRIS_VARSAYILAN = 0.08;
const DONUS_SN = 0.2; // beklemeye dönüş
const KESME_SN = 0.05; // süren eylemi kesme; kuyruktaki istek de süren geçişi en geç bu sürede tamamlatır
const DURAK_SN = 0.06, DURAK_AGIR_SN = 0.09; // temas anında vuruş duraklaması (saat oranı 0)
const SARSINTI_SN = 0.15, SARSINTI_BIRIM = 0.008; // temasta çok küçük kamera titremesi
const YAVAS_CARPAN = 0.25;
const EN_FAZLA_DT = 0.1; // takılma veya arka plandan dönüşte sıçramayı önler
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
export type Deneme3DSahneProps = { klipler: readonly string[]; arkaPlan: string; onHazir: (t: SahneTutamak | null) => void; /** 0.25× yavaş çekim. */ yavas?: boolean };

function klipBul(adlar: string[], ad: string): number {
  const k = ad.toLowerCase(), kucuk = adlar.map((a) => a.toLowerCase());
  let i = kucuk.indexOf(k);
  if (i < 0) i = kucuk.findIndex((a) => a.endsWith("|" + k));
  if (i < 0) i = kucuk.findIndex((a) => a.includes(k));
  return i;
}

const sayi = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : -1);

export function Deneme3DSahne({ klipler, arkaPlan, onHazir, yavas = false }: Deneme3DSahneProps) {
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
          <Savasci klipler={klipler} onHazir={onHazir} yavas={yavas} kamera={kamera} />
        </FilamentView>
      </FilamentScene>
    </View>
  );
}

type SavasciProps = Pick<Deneme3DSahneProps, "klipler" | "onHazir"> & { yavas: boolean; kamera: [number, number, number] };

function Savasci({ klipler, onHazir, yavas, kamera }: SavasciProps) {
  const model = useModel(MODEL);
  const animator = useAnimator(model);
  const { camera } = useFilamentContext();

  // Klip tablosu JS tarafında bir kez okunur (Filament animatörü kendi kilidini tutar).
  const tablo = useMemo(() => {
    if (animator == null) return null;
    try {
      const n = animator.getAnimationCount();
      const adlar: string[] = [], sureler: number[] = [], dongu: boolean[] = [], temas: number[] = [], agir: boolean[] = [], giris: number[] = [];
      for (let i = 0; i < n; i++) {
        adlar.push(animator.getAnimationName(i)); sureler.push(sayi(animator.getAnimationDuration(i)));
        dongu.push(false); temas.push(-1); agir.push(false); giris.push(GIRIS_VARSAYILAN);
      }
      const indeks = klipler.map((k) => klipBul(adlar, k));
      if (indeks[0] < 0 && n > 0) indeks[0] = 0; // adı tutmasa da ilk klip beklemede döner
      klipler.forEach((k, j) => {
        const i = indeks[j];
        if (i < 0) return;
        const z = ZAMAN.klipler?.[k];
        if (!(sureler[i] > 0)) sureler[i] = sayi(z?.sure); // animatör süresi yoksa yan dosyadaki
        if (z?.dongu === true) dongu[i] = true;
        const tc = sayi(z?.temas);
        if (tc > 0 && tc < sureler[i]) temas[i] = tc;
        agir[i] = z?.agir === true;
        giris[i] = GIRIS_SN[k] ?? GIRIS_VARSAYILAN;
      });
      if (indeks[0] >= 0) dongu[indeks[0]] = true; // bekleme her zaman döner
      return { sureler, dongu, temas, agir, giris, indeks };
    } catch {
      return null; // animatör bırakılmışsa sahne yüklenmemiş sayılır
    }
  }, [animator, klipler]);
  const sureler = useMemo(() => tablo?.sureler ?? [], [tablo]);
  const dongu = useMemo(() => tablo?.dongu ?? [], [tablo]);
  const temas = useMemo(() => tablo?.temas ?? [], [tablo]);
  const agir = useMemo(() => tablo?.agir ?? [], [tablo]);
  const giris = useMemo(() => tablo?.giris ?? [], [tablo]);
  const bekle = tablo?.indeks[0] ?? -1;
  // Titreme kamerayı kaydırır (eksen: kameranın sağı ve dünya yukarısı). Kamera bileşeni her kare lookAt
  // çağırır; bu geri çağrı, bağımlılığında kadraj bulunduğundan her zaman ondan sonra kaydolur.
  const [kx, ky, kz] = kamera;
  const [hx, hy, hz] = HEDEF;
  const sag = useMemo(() => {
    const fx = hx - kx, fz = hz - kz, u = Math.hypot(fx, fz) || 1;
    return { x: -fz / u, z: fx / u };
  }, [hx, hz, kx, kz]);
  const sagX = sag.x, sagZ = sag.z;

  // JS → çizim iş parçacığı istek kanalı ve çizim tarafının durumu (zaman kendi saatimizle ilerler).
  const istekKlip = useSharedValue(-1);
  const istekNo = useSharedValue(0);
  const gorulenNo = useSharedValue(0);
  const aktifKlip = useSharedValue(-1);
  const aktifZaman = useSharedValue(0);
  const onceki = useSharedValue(-1);
  const oncekiZaman = useSharedValue(0);
  const gecisU = useSharedValue(1);
  const gecisHiz = useSharedValue(1);
  const kuyruk = useSharedValue(-1);
  const durakKalan = useSharedValue(0);
  const temasOldu = useSharedValue(0);
  const sarsintiKalan = useSharedValue(0);
  const sonSaat = useSharedValue(-1);
  const hizCarpani = useSharedValue(1);
  const sarsIzin = useSharedValue(1);
  const hata = useSharedValue(0);
  const kare = useSharedValue(0);

  useEffect(() => { hizCarpani.value = yavas ? YAVAS_CARPAN : 1; }, [yavas, hizCarpani]);
  // "Hareketi azalt" açıksa kamera titremez (vuruş duraklaması kalır).
  useEffect(() => {
    let canli = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (canli) sarsIzin.value = v ? 0 : 1; }).catch(() => {});
    const abone = AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => { sarsIzin.value = v ? 0 : 1; });
    return () => { canli = false; abone.remove(); };
  }, [sarsIzin]);

  RenderCallbackContext.useRenderCallback(
    ({ passedSeconds }) => {
      "worklet";
      kare.value += 1;
      const n = sureler.length;
      if (animator == null || bekle < 0 || bekle >= n || hata.value !== 0) return;
      // Kendi saatimiz: t += dt × oran. dt gerçek kare aralığıdır (sınırlı) × yavaş çekim çarpanı.
      const son = sonSaat.value;
      sonSaat.value = passedSeconds;
      const dt = son < 0 ? 0 : Math.min(Math.max(passedSeconds - son, 0), EN_FAZLA_DT) * hizCarpani.value;

      let akt = aktifKlip.value, t = aktifZaman.value, onc = onceki.value, tOnc = oncekiZaman.value;
      let u = gecisU.value, hiz = gecisHiz.value, kuy = kuyruk.value, durak = durakKalan.value;
      let temasTamam = temasOldu.value, sars = sarsintiKalan.value;
      if (akt < 0 || akt >= n) { akt = bekle; t = 0; onc = -1; }
      if (onc >= n) onc = -1;

      // Geçiş süresi: beklemeye dönüş yumuşak, beklemeden eyleme kısa, süren eylemi kesmek en kısa.
      const baslat = (yeni: number) => {
        if (yeni === bekle && akt === bekle) return;
        const sure = yeni === bekle ? DONUS_SN : akt === bekle ? giris[yeni] ?? GIRIS_VARSAYILAN : KESME_SN;
        onc = akt; tOnc = t; u = 0; hiz = 1 / Math.max(sure, 0.001);
        akt = yeni; t = 0; temasTamam = 0;
      };
      // Yeni istek: geçiş sürmüyorsa hemen başlar. Sürüyorsa kuyruğa girer (en yenisi geçerli, istek düşmez);
      // iki klip sınırı yüzünden yarım geçişten kesmek poz sıçratacağından süren geçiş en geç KESME_SN'de tamamlanır.
      if (istekNo.value !== gorulenNo.value) {
        gorulenNo.value = istekNo.value;
        const yeni = istekKlip.value;
        if (yeni >= 0 && yeni < n) {
          if (onc < 0) baslat(yeni);
          else if (yeni === bekle && akt === bekle) kuy = -1; // zaten beklemeye dönülüyor; bekleyen eylem iptal
          else { kuy = yeni; hiz = Math.max(hiz, (1 - u) / KESME_SN); }
        }
      }

      // Vuruş duraklaması: oran 0; duraklamadan taşan süre kaybolmaz.
      let dtA = dt;
      if (durak > 0) { const kalan = durak - dt; durak = kalan > 0 ? kalan : 0; dtA = kalan < 0 ? -kalan : 0; }
      const t0 = t;
      t += dtA;
      if (onc >= 0) { tOnc += dtA; u += dtA * hiz; if (u >= 1) { u = 1; onc = -1; } }
      // Temas anı geçildiyse eylem tam o karede durur.
      const tc = temas[akt] ?? -1;
      if (tc > 0 && temasTamam === 0 && t0 < tc && t >= tc) {
        t = tc; temasTamam = 1;
        durak = agir[akt] === true ? DURAK_AGIR_SN : DURAK_SN;
        sars = SARSINTI_SN;
      }
      // Kuyruktaki istek geçiş biter bitmez; yoksa tek seferlik eylem bitmeden beklemeye dönüş başlar.
      if (onc < 0 && kuy >= 0) { const k = kuy; kuy = -1; baslat(k); }
      if (onc < 0 && kuy < 0 && akt !== bekle && dongu[akt] !== true && t >= (sureler[akt] ?? 0) - DONUS_SN) baslat(bekle);

      // Döngüdeki klip sarılır, tek seferlikler son karede durur (Filament zamanı kendisi de sarabilir).
      const zaman = (k: number, s: number) => {
        const d = sureler[k] ?? 0;
        if (!(d > 0)) return 0;
        return dongu[k] === true ? s % d : Math.max(0, Math.min(s, d - 0.001));
      };
      try {
        animator.applyAnimation(akt, zaman(akt, t));
        if (onc >= 0) animator.applyCrossFade(onc, zaman(onc, tOnc), u * u * (3 - 2 * u)); // ağırlık: smoothstep
        animator.updateBoneMatrices();
      } catch {
        hata.value = 1; // animatör bırakıldıysa döngü sessizce durur
      }

      if (sars > 0) {
        sars = Math.max(sars - dt, 0);
        if (sarsIzin.value === 1 && camera != null) {
          const g = SARSINTI_SN - sars, z = sars / SARSINTI_SN, a = SARSINTI_BIRIM * z * z;
          const x = a * Math.sin(g * 2 * Math.PI * 17), y = a * Math.sin(g * 2 * Math.PI * 11); // sıfırdan başlar, sıfırda biter
          try { camera.lookAt([kx + sagX * x, ky + y, kz + sagZ * x], [hx + sagX * x, hy + y, hz + sagZ * x], [0, 1, 0]); } catch { sars = 0; }
        }
      }

      aktifKlip.value = akt; aktifZaman.value = t; onceki.value = onc; oncekiZaman.value = tOnc;
      gecisU.value = u; gecisHiz.value = hiz; kuyruk.value = kuy; durakKalan.value = durak;
      temasOldu.value = temasTamam; sarsintiKalan.value = sars;
    },
    [animator, camera, bekle, sureler, dongu, temas, agir, giris, kx, ky, kz, hx, hy, hz, sagX, sagZ,
      istekKlip, istekNo, gorulenNo, aktifKlip, aktifZaman, onceki, oncekiZaman, gecisU, gecisHiz, kuyruk,
      durakKalan, temasOldu, sarsintiKalan, sonSaat, hizCarpani, sarsIzin, hata, kare]
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
