// Görsel paylaşım kartı denetimi (statik):
//  1) expo-sharing ve expo-file-system projenin Expo SDK ana sürümüyle eşleşir ve kurulu (yerel modül yapılandırmasıyla).
//  2) kart-paylas.ts: yerel modüller try içinde yüklenir; her hata metin paylaşımına düşer; ağ çağrısı yok.
//  3) Roman ve Divan ekranları görseli kart View'undan çeker (ref + collapsable=false) ve metin düğmesini korur.
//  4) "paylas.metin" 6 dilde var.
// Kullanım: node scripts/_smoke/paylas-check.cjs → "PAYLAŞ: TEMİZ" ya da ihlal listesi (exit 1)
const fs = require("fs"); const path = require("path");
const mobile = path.join(__dirname, "..", ".."); const hata = [];
const pkg = JSON.parse(fs.readFileSync(path.join(mobile, "package.json"), "utf8"));
const sdk = (pkg.dependencies.expo || "").replace(/[^0-9.]/g, "").split(".")[0];
for (const m of ["expo-sharing", "expo-file-system"]) {
  const v = pkg.dependencies[m]; if (!v) { hata.push(`${m} package.json'da yok`); continue; }
  if (v.replace(/[^0-9.]/g, "").split(".")[0] !== sdk) hata.push(`${m} ${v} SDK ${sdk} ile eşleşmiyor`);
  const yol = path.join(mobile, "node_modules", m);
  if (!fs.existsSync(path.join(yol, "package.json"))) hata.push(`${m} kurulu değil`);
  else if (!fs.existsSync(path.join(yol, "expo-module.config.json"))) hata.push(`${m} yerel modül yapılandırması yok`);
}
const src = fs.readFileSync(path.join(mobile, "lib/kart-paylas.ts"), "utf8");
const kod = src.replace(/\/\/.*$/gm, "");
if (/^import [^t].*from "(expo-sharing|expo-file-system|@shopify\/react-native-skia)"/m.test(kod)) hata.push("yerel modül dosya başında yükleniyor (eski APK çöker)");
if (!/catch\s*\{\s*return metinPaylas\(metin\);/.test(kod)) hata.push("hata yolu metin paylaşımına düşmüyor");
if (/fetch\(|XMLHttpRequest|WebSocket|http/.test(kod)) hata.push("kart-paylas.ts ağ kullanıyor");
for (const [f, ad] of [["app/oyun/roman.tsx", "roman"], ["app/oyun/divan.tsx", "divan"]]) {
  const e = fs.readFileSync(path.join(mobile, f), "utf8");
  if (!e.includes("kartPaylas(kartRef")) hata.push(`${ad}: görsel paylaşım yok`);
  if (!/ref=\{kartRef\} collapsable=\{false\}/.test(e)) hata.push(`${ad}: kart View'u çekilebilir değil`);
  if (!e.includes("metinPaylas(")) hata.push(`${ad}: metin düğmesi yok`);
  if (/Share\.share\(/.test(e)) hata.push(`${ad}: doğrudan Share.share kaldı`);
}
const cigir = fs.readFileSync(path.join(mobile, "lib/i18n-cigir.ts"), "utf8");
const n = (cigir.match(/"paylas\.metin":/g) || []).length; if (n !== 6) hata.push(`paylas.metin ${n}/6 dilde`);
console.log(`paylaşım: SDK ${sdk} · expo-sharing ${pkg.dependencies["expo-sharing"]} · expo-file-system ${pkg.dependencies["expo-file-system"]} · Roman + Divan görsel kart, metne düşüş`);
if (hata.length) { console.log("PAYLAŞ: İHLAL\n" + hata.join("\n")); process.exit(1); }
console.log("PAYLAŞ: TEMİZ");
