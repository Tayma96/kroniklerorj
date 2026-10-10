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
// Not: kurulumda bu dosya yerel ikiliyle değiştirilir; node ile değil doğrudan çalıştırılır.
module.exports = `"${bin}"`;
