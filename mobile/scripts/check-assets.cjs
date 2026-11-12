#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const source = path.resolve(__dirname, "../lib/assets.ts");
const root = path.dirname(source);
const sourceText = fs.readFileSync(source, "utf8");
const matches = [...sourceText.matchAll(/require\(["']([^"']+)["']\)/g)];
if (matches.length === 0) {
  console.error("Görsel haritasında statik require yolu bulunamadı.");
  process.exit(1);
}
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
  for (const item of missing) console.error(" - " + item);
  process.exitCode = 1;
} else {
  console.log("Görsel haritası temiz: " + matches.length + " statik görsel yolu doğrulandı.");
}
