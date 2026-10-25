// Denetim betiklerinin kullandığı esbuild: mobile/package.json devDependency'si (yerel kurulum).
// `npx esbuild` yerel paket yoksa ağdan indirmeye kalkar; bu yardımcı yerel ikiliyi doğrudan çağırır,
// yoksa açık bir mesajla durur ("npm ci" unutulmuş demektir).
const path = require("path");
let bin;
try {
  bin = require.resolve("esbuild/bin/esbuild", { paths: [path.join(__dirname, "..", "..")] });
} catch (e) {
  console.error("esbuild bulunamadı — mobile/ içinde `npm ci` çalıştır (esbuild devDependency).");
  process.exit(1);
}
// Windows cmd.exe, paketin JavaScript başlatıcısını doğrudan açmaz; isteğe bağlı platform paketindeki .exe'yi çağır.
if (process.platform === "win32") {
  const arch = process.arch === "arm64" ? "arm64" : process.arch === "ia32" ? "ia32" : "x64";
  try { bin = require.resolve(`@esbuild/win32-${arch}/esbuild.exe`, { paths: [path.dirname(bin)] }); }
  catch (e) { console.error("esbuild Windows ikilisi bulunamadı — mobile/ içinde `npm ci` çalıştır."); process.exit(1); }
}
// Not: bin doğrudan çalıştırılır; test süreçleri paket yöneticisine veya ağa başvurmaz.
module.exports = `"${bin}"`;
