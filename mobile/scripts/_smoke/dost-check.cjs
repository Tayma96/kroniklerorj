// Dost Haneler denetimi (adım 7 — sunucusuz, yalnız cihazda):
//  1) Hane kodu gidiş-dönüş: TR/AR/RU/ES adlar, uç kuşak/yay değerleri bozulmadan çözülür.
//  2) Bozuk kod reddedilir: tek karakter değişimi, kesilmiş kod, yanlış önek, boş alanlar (sağlama).
//  3) Yalnız kimlik: dost.ts para/güç alanı içermez, ağ çağrısı yok; kayıt göçü korumalı, en çok 20 hane, aynı hane çiftlenmez.
// Kullanım: node scripts/_smoke/dost-check.cjs → "DOST: TEMİZ" ya da ihlal listesi (exit 1)
const ESBUILD = require("./esbuild-yolu.cjs");
const { execSync } = require("child_process"); const os = require("os"); const fs = require("fs"); const path = require("path");
const mobile = path.join(__dirname, "..", ".."); const giris = path.join(mobile, `_dost_giris_${process.pid}.ts`); const paket = path.join(os.tmpdir(), `kr-dost-${process.pid}.cjs`);
fs.writeFileSync(giris, `export * from "./lib/dost";\nexport { bosDefter } from "./lib/defter";\nexport { CIGIR } from "./lib/i18n-cigir";\n`);
try { execSync(`${ESBUILD} ${giris} --bundle --platform=node --format=cjs --outfile=${paket} --log-level=error`, { cwd: mobile, stdio: "inherit" }); } finally { fs.unlinkSync(giris); }
const g = require(paket); fs.unlinkSync(paket); const hata = [];
const defter = (soyad, ad, nesil, egilim, yay) => { const d = g.bosDefter(); d.yaylar = Array.from({ length: yay }, (_, i) => "y" + i); d.soylar.push({ anahtar: "x", ad, soyad, cins: "erkek", nesil, olumYasi: 60, meslek: "çiftçi", lakaplar: [], izler: [], yaylar: [], egilim }); return d; };
if (g.haneKodu(g.bosDefter()) !== null) hata.push("boş defterden kod üretildi");
const ornekler = [["Yılmaz", "Ayşe", 1, "comert", 0], ["Аксёнов", "Дмитрий", 7, "hile", 12], ["الحلبي", "فاطمة", 99, undefined, 999], ["Muñoz", "João", 3, "temkin", 41], ["Öztürk|kötü", "Ali\nVeli", 150, "cesur", 5000]];
let ornekKod = "";
for (const [s, a, n, e, y] of ornekler) {
  const kod = g.haneKodu(defter(s, a, n, e, y)); if (!ornekKod) ornekKod = kod;
  const h = g.koduCoz(kod);
  if (!h) { hata.push(`çözülemedi: ${s}`); continue; }
  const bs = s.replace(/[|\n]/g, " "), ba = a.replace(/[|\n]/g, " ");
  if (h.s !== bs || h.a !== ba || h.n !== Math.min(99, n) || h.y !== Math.min(999, y) || h.e !== e) hata.push(`gidiş-dönüş bozuk: ${JSON.stringify(h)}`);
  if (!/^KR1-[A-Za-z0-9_-]+-[0-9A-Z]{4}$/.test(kod)) hata.push(`kod biçimi: ${kod}`);
  // bozulmalar
  for (let i = 4; i < kod.length; i += 3) { const c = kod[i]; const yeni = kod.slice(0, i) + (c === "A" ? "B" : "A") + kod.slice(i + 1); if (yeni !== kod && g.koduCoz(yeni)) { const hh = g.koduCoz(yeni); if (JSON.stringify(hh) !== JSON.stringify(h)) { hata.push(`bozuk kod kabul edildi (${i})`); break; } } }
  if (g.koduCoz(kod.slice(0, -1))) hata.push("kesik kod kabul edildi");
  if (g.koduCoz("KR2" + kod.slice(3))) hata.push("yanlış önek kabul edildi");
}
for (const k of ["", "KR1--0000", "merhaba", "KR1-!!!!-ABCD", null].map(String)) if (g.koduCoz(k)) hata.push(`çöp kabul edildi: ${k}`);
let k = g.bosDost(); const h0 = g.koduCoz(ornekKod);
k = g.dostEkle(k, h0); k = g.dostEkle(k, h0); if (k.h.length !== 1) hata.push("aynı hane çiftlendi");
for (let i = 0; i < 30; i++) k = g.dostEkle(k, { s: "S" + i, a: "A", n: 1, y: 0 }); if (k.h.length !== g.DOST_EN_COK) hata.push(`hane sınırı ${k.h.length}`);
if (g.dostCikar(k, 0).h.length !== g.DOST_EN_COK - 1) hata.push("çıkar çalışmıyor");
const goc = g.dostGoc({ h: [{ s: "A", a: "B", n: 2, y: 3, e: "comert", para: 5 }, { s: "", a: "x" }, 7, { s: "C", a: "D", n: -1, y: "x", e: "zz" }] });
if (JSON.stringify(goc) !== JSON.stringify({ v: 1, h: [{ s: "A", a: "B", n: 2, y: 3, e: "comert" }, { s: "C", a: "D", n: 1, y: 0 }] })) hata.push("göç: " + JSON.stringify(goc));
for (const b of [null, 1, "x", { h: 3 }]) if (JSON.stringify(g.dostGoc(b)) !== JSON.stringify(g.bosDost())) hata.push("göç bozuk girdi");
const src = fs.readFileSync(path.join(mobile, "lib/dost.ts"), "utf8").replace(/\/\/.*$/gm, "");
if (/\b(money|fame|power|reputation|deposit|properties|fetch|XMLHttpRequest|WebSocket)\b/.test(src)) hata.push("dost.ts para/güç alanı ya da ağ çağrısı içeriyor");
const ui = fs.readFileSync(path.join(mobile, "lib/dost-ui.tsx"), "utf8");
if (/fetch\(|WebSocket|apply\(/.test(ui)) hata.push("dost-ui ağ/eylem çağırıyor");
for (const l of ["tr", "en", "es", "pt", "ar", "ru"]) for (const key of ["dost.baslik", "dost.alt", "dost.hata", "dost.satir", "dost.hane", "dost.mesaj", "dost.kendi"]) if (!g.CIGIR[l][key]) hata.push(`${l}: ${key} yok`);
console.log(`örnek kod: ${ornekKod} → ${JSON.stringify(h0)}`);
if (hata.length) { console.log("DOST: İHLAL\n" + [...new Set(hata)].slice(0, 30).join("\n")); process.exit(1); }
console.log("DOST: TEMİZ");
