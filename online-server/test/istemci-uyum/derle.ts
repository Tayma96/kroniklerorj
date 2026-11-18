// İstemci uyum testi yardımcısı: mobil istemcinin GERÇEK HTTP istemcilerini ve yanıt doğrulayıcılarını
// (mobile/lib/online/*) esbuild ile tek ESM pakete derler. React Native, Expo, i18n ve depolama modülleri
// `sap/` altındaki küçük saplarla değişir; doğrulayıcı kodu olduğu gibi kalır. esbuild mobil bağımlılıklarından
// alınır (mobile/node_modules); yoksa `null` döner ve test atlanır.
import { createRequire } from "node:module";

const MOBIL = new URL("../../../mobile/", import.meta.url).pathname;
const SAP = new URL("./sap/", import.meta.url).pathname;
const ONLINE = MOBIL + "lib/online/";

/** Pakete giren istemci modülleri (giriş dosyası bellekte üretilir; sunucu tsc'si mobil kodu taramaz). */
const GIRIS = `
export * as protokol from "./protokol";
export { httpIstemci } from "./istemci";
export { ekCagir, EK_HATALAR, ekHataAnahtari, ekHataMi } from "./ek-istemci";
export { hataAnahtari } from "./hata";
export { useAtolyeIstemci } from "./atolye-veri";
export { useBarinmaIstemci } from "./barinma-veri";
export { useDebdebeIstemci } from "./debdebe-veri";
export { useEkonomiIstemci } from "./ekonomi-veri";
export { useEtkinlikIstemci } from "./etkinlik-veri";
export { useGocIstemci } from "./goc-veri";
export { httpHanIstemci } from "./han-veri";
export { useHanedanIstemci } from "./hanedan-veri";
export { httpHizmetIstemci } from "./hizmet-veri";
export { useKervanIstemci } from "./kervan-veri";
export { useKunyeIstemci, kunyeHataAnahtari } from "./kunye-veri";
export { useMulkIstemci } from "./mulk-veri";
export { httpSiyasetIstemci } from "./siyaset-veri";
export { useTezgahIstemci } from "./tezgah-veri";
export { useUcgenIstemci } from "./ucgen-veri";
export { vitrinMi as masaVitriniMi } from "./masa-oyun-veri";
`;

const HARICI = /^(react-native|expo-.*|@react-native.*|@expo.*|react-native-.*)$/;

interface Cozum { path: string; importer: string }
interface Kurucu { onResolve(f: { filter: RegExp }, cb: (a: Cozum) => { path: string } | undefined): void }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IstemciPaketi = any;

export async function istemciDerle(): Promise<IstemciPaketi | null> {
  const iste = createRequire(MOBIL + "package.json");
  let esbuild: { build(o: unknown): Promise<{ outputFiles: { text: string }[] }> };
  try {
    esbuild = iste("esbuild") as typeof esbuild;
  } catch {
    return null;
  }
  const sonuc = await esbuild.build({
    stdin: { contents: GIRIS, resolveDir: ONLINE, loader: "ts", sourcefile: "istemci-uyum-giris.ts" },
    bundle: true, platform: "node", format: "esm", write: false, logLevel: "error", jsx: "automatic",
    define: { __DEV__: "false" },
    plugins: [{
      name: "sap",
      setup(b: Kurucu) {
        b.onResolve({ filter: /.*/ }, (a) => {
          const p = a.path;
          if (p === "react") return { path: SAP + "react.cjs" };
          if (p === "react/jsx-runtime" || HARICI.test(p)) return { path: SAP + "proxy.cjs" };
          if (a.importer.includes("/lib/online/")) {
            if (/(^|\/)durum$/.test(p)) return { path: SAP + "durum.cjs" };
            if (/(^|\/)ayar$/.test(p)) return { path: SAP + "ayar.cjs" };
            if (/(^|\/)depo$/.test(p)) return { path: SAP + "depo.cjs" };
          }
          if (/(^|\/)i18n$|sahte|\.(png|mp3|jpg|webp|ttf)$/.test(p)) return { path: SAP + "proxy.cjs" };
          return undefined;
        });
      },
    }],
  });
  const kod = sonuc.outputFiles[0]?.text ?? "";
  return import("data:text/javascript;charset=utf-8," + encodeURIComponent(kod));
}
