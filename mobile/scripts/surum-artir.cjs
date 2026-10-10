#!/usr/bin/env node
// Sürüm numarasının TEK kaynağı: mobile/app.json → expo.version (görünen sürüm) ve
// expo.android.versionCode (Play/Android'in karşılaştırdığı tam sayı).
// APK workflow'u, AAB workflow'u ve EAS (eas.json appVersionSource: "local") bu değeri olduğu gibi okur;
// hiçbiri kendi sayacıyla ezmez.
//
// Kullanım (mobile/ içinden):
//   node scripts/surum-artir.cjs            → versionCode +1
//   node scripts/surum-artir.cjs 1.1.0      → versionCode +1 ve görünen sürüm 1.1.0
//   node scripts/surum-artir.cjs --goster   → yalnız yazdırır
// Ardından değişikliği commit et; Play'e her yüklemede versionCode bir öncekinden BÜYÜK olmalı.
const fs = require('fs');
const path = require('path');
const f = path.join(__dirname, '..', 'app.json');
const j = JSON.parse(fs.readFileSync(f, 'utf8'));
const a = j.expo.android || (j.expo.android = {});
const arg = process.argv[2];
if (arg === '--goster') {
  console.log(`version ${j.expo.version} · versionCode ${a.versionCode}`);
  process.exit(0);
}
if (arg && !/^\d+\.\d+\.\d+$/.test(arg)) {
  console.error('Görünen sürüm X.Y.Z biçiminde olmalı: ' + arg);
  process.exit(1);
}
const eski = a.versionCode | 0;
a.versionCode = eski + 1;
if (arg) j.expo.version = arg;
fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
console.log(`versionCode ${eski} → ${a.versionCode}` + (arg ? ` · version ${j.expo.version}` : ''));
