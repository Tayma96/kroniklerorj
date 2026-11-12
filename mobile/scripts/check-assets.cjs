#!/usr/bin/env node
"use strict";

// assets.ts içindeki React Native require yolları çalışma anında paketlenir.
// TypeScript kontrolü tek başına dosya varlığını garanti etmediğinden her yolu doğrula.
const fs = require("node:fs");
const path = require("node:path");

const source = path.resolve(__dirname, "../lib/assets.ts");
const root = path.dirname(source);
const text = fs.readFileSync(source, "utf8");
const matches = [...text.matchAll(/require\\(["']([^"']+)["']\\)/g)];
const missing = [];

for (const match of matches) {
  const relative = match[1];
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(path.resolve(__dirname, "..") + path.sep) || !fs.existsSync(resolved)) {
    missing.push(relative);
  }
}

if (missing.length) {
  console.error("Eksik veya assets kökü dışına çıkan görsel yolları:");
  for (const item of missing) console.error(` - ${item}`);
  process.exitCode = 1;
} else {
  console.log(`Görsel haritası temiz: ${matches.length} statik görsel yolu doğrulandı.`);
}
