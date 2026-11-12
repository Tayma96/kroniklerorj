#!/usr/bin/env node
// Faz 9 bounded load smoke. Only runs against the isolated test Worker.
import { performance } from "node:perf_hooks";
import { randomUUID } from "node:crypto";

const base = process.env.TEST_WORKER_URL ?? "";
const invite = process.env.TEST_GIRIS_KODU ?? "";
const requests = Number(process.env.LOAD_REQUESTS ?? 120);
const concurrency = Number(process.env.LOAD_CONCURRENCY ?? 20);
const p95Limit = Number(process.env.LOAD_P95_MS ?? 2500);
const timeoutMs = Number(process.env.LOAD_TIMEOUT_MS ?? 10000);

function fail(message) {
  console.error(`[load-test] ${message}`);
  process.exitCode = 1;
}
function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)];
}
if (!base || !invite) {
  fail("TEST_WORKER_URL ve TEST_GIRIS_KODU gerekli.");
  process.exit();
}
let url;
try { url = new URL(base); } catch { fail("TEST_WORKER_URL geçerli URL değil."); process.exit(); }
if (url.protocol !== "https:" || !url.hostname.includes("kronikler-online-test")) {
  fail("Güvenlik kilidi: yalnız https://kronikler-online-test.* adresine yük testi gönderilebilir.");
  process.exit();
}
if (!Number.isInteger(requests) || requests < 10 || requests > 500 || !Number.isInteger(concurrency) || concurrency < 1 || concurrency > 50) {
  fail("LOAD_REQUESTS 10–500, LOAD_CONCURRENCY 1–50 aralığında tam sayı olmalı.");
  process.exit();
}
const cihazId = `test-${randomUUID().replaceAll("-", "")}`;
const timeout = AbortSignal.timeout(timeoutMs);
const giris = await fetch(new URL("/v1/test-giris", url), {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ kod: invite, cihazId }), signal: timeout,
});
const girisJson = await giris.json().catch(() => null);
if (!giris.ok || typeof girisJson?.oturum !== "string") {
  fail(`Test oturumu açılamadı (HTTP ${giris.status}). Test Worker sırlarını kontrol et.`);
  process.exit();
}
const token = girisJson.oturum;
const results = [];
let errors = 0;
let cursor = 0;
async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= requests) return;
    const path = index % 2 === 0 ? "/v1/dunya" : "/v1/profil";
    const start = performance.now();
    try {
      const res = await fetch(new URL(path, url), {
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(timeoutMs),
      });
      const body = await res.json().catch(() => null);
      const ms = performance.now() - start;
      results.push(ms);
      if (!res.ok || body?.ok !== true) {
        errors++;
        console.error(`[load-test] request ${index + 1}: HTTP ${res.status}, apiOk=${String(body?.ok)}`);
      }
    } catch (e) {
      errors++;
      console.error(`[load-test] request ${index + 1}: ${e instanceof Error ? e.message : "network error"}`);
    }
  }
}
const started = performance.now();
await Promise.all(Array.from({ length: Math.min(concurrency, requests) }, () => worker()));
const elapsed = performance.now() - started;
const p50 = percentile(results, 0.50);
const p95 = percentile(results, 0.95);
const errorRate = errors / requests;
console.log(`[load-test] requests=${requests} concurrency=${concurrency} ok=${requests - errors} errors=${errors} errorRate=${(errorRate * 100).toFixed(2)}% wall=${elapsed.toFixed(0)}ms p50=${p50.toFixed(0)}ms p95=${p95.toFixed(0)}ms`);
if (errors > 0 || p95 > p95Limit) {
  fail(`Yük kapısı başarısız: hata=${errors}, p95=${p95.toFixed(0)}ms (limit ${p95Limit}ms).`);
} else {
  console.log("[load-test] PASS — test Worker sınırları içinde hata ve gecikme kapısı geçti.");
}
