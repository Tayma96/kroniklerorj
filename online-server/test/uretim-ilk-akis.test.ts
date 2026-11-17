// Üretim benzeri ortamda ilk oturum akışı (17 Kasım acil hata): davet kodlu test girişi → profil → varış →
// Yaşam ekranının ilk yüklediği uçlar. Ortam üretimdeki gibidir: ZAR_SIRRI tanımlı, ZAR_YEDEK_IZINLI YOK.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, IsletmeDO, YerlesimDO, hataKaydi, testKovaSifirla } from "../src/index.ts";
import type { Env } from "../src/tipler.ts";
import { sahteAdAlani } from "./yardimci.ts";
import { zarSirriAyarla } from "../src/yerlesim/zar-sirri.ts";
import { readFileSync } from "node:fs";
import { MAL_IDLERI } from "../src/icerik/mallar.ts";
import { MESLEK_IDLERI } from "../src/icerik/meslekler.ts";

/** İstemcinin protokol doğrulayıcısındaki sabit kimlik listesi (mobile/lib/online/protokol.ts). İstemci bilinmeyen
 * mal/meslek kimliği içeren yanıtı `gecersiz_yanit` sayar; sunucu listesi istemciden geniş olursa ekran açılmaz. */
function istemciListesi(ad: string): string[] {
  const kaynak = readFileSync(new URL("../../mobile/lib/online/protokol.ts", import.meta.url).pathname, "utf8");
  const m = new RegExp(`export const ${ad} = \\[([^\\]]*)\\]`).exec(kaynak);
  assert.ok(m, `${ad} istemcide bulunamadı`);
  return [...(m[1] ?? "").matchAll(/"([^"]+)"/g)].map((x) => x[1] ?? "");
}

/** Yanıttaki her mal kimliğini (tarif girdi/çıktı/yan/araç, envanter anahtarları) toplar. */
function mallariTopla(v: unknown, cikis: Set<string>, anahtar = ""): void {
  if (Array.isArray(v)) { for (const x of v) mallariTopla(x, cikis, anahtar); return; }
  if (v === null || typeof v !== "object") return;
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    if (k === "mal" && typeof x === "string") cikis.add(x);
    else if ((k === "girdi" || k === "eksik" || k === "yan" || k === "envanter") && x && typeof x === "object" && !Array.isArray(x)) {
      for (const m of Object.keys(x)) cikis.add(m);
    }
    mallariTopla(x, cikis, k);
  }
}

test("istemci protokolü sunucunun bütün mal ve meslek kimliklerini tanır", () => {
  const mal = new Set(istemciListesi("MAL_IDLERI"));
  assert.deepEqual(MAL_IDLERI.filter((m) => !mal.has(m)), [], "istemcide eksik mal");
  const meslek = new Set(istemciListesi("MESLEK_IDLERI"));
  assert.deepEqual(MESLEK_IDLERI.filter((m) => !meslek.has(m)), [], "istemcide eksik meslek");
});

const KOD = "Kronikler-Uretim-Davet-Kodu-2026-Deneme";

function ortam(): Env {
  const env = {
    GOOGLE_CLIENT_ID: "",
    OTURUM_ANAHTARI: "u".repeat(48),
    ZAR_SIRRI: "z".repeat(40),
    TEST_GIRIS_ACIK: "1",
    TEST_GIRIS_KODU: KOD,
  } as unknown as Env;
  env.HESAP = sahteAdAlani((ctx) => new HesapDO(ctx, env));
  env.DUNYA = sahteAdAlani((ctx) => new DunyaDO(ctx, env));
  env.YERLESIM = sahteAdAlani((ctx) => new YerlesimDO(ctx, env));
  env.ISLETME = sahteAdAlani((ctx) => new IsletmeDO(ctx, env));
  return env;
}

async function cagir(env: Env, yontem: string, yol: string, s: { govde?: unknown; oturum?: string } = {}) {
  const h: Record<string, string> = { "cf-connecting-ip": "203.0.113.50" };
  if (s.oturum) h.authorization = `Bearer ${s.oturum}`;
  if (s.govde !== undefined) h["content-type"] = "application/json";
  const y = await isleyici.fetch(new Request(`https://kronikler-online.test${yol}`, { method: yontem, headers: h, body: s.govde === undefined ? null : JSON.stringify(s.govde) }), env);
  return { durum: y.status, govde: (await y.json()) as Record<string, unknown> };
}

test("üretim ortamı: test girişi → profil → Yaşam ilk yüklemesi başarılı ve istemcinin tanıdığı mallarla döner", async () => {
  testKovaSifirla();
  const env = ortam();
  try {
    const g = await cagir(env, "POST", "/v1/test-giris", { govde: { kod: KOD, cihazId: "test-0123456789abcdefghijklmnop" } });
    assert.equal(g.durum, 200, JSON.stringify(g.govde));
    const oturum = g.govde.oturum as string;
    const dokum: Record<string, unknown> = {};
    assert.equal((await cagir(env, "GET", "/v1/dunya", { oturum })).durum, 200);
    assert.deepEqual((await cagir(env, "GET", "/v1/profil", { oturum })).govde, { hata: "profil_yok" });
    const p = await cagir(env, "POST", "/v1/profil", { oturum, govde: { ad: "Kerem", cinsiyet: "erkek", yerlesim: "develi", istekNo: "uretim-istek-0001" } });
    assert.equal(p.durum, 200, JSON.stringify(p.govde));
    for (const yol of ["/v1/profil", "/v1/yerlesim?dil=tr", "/v1/olaylar?imlec=0&dil=tr", "/v1/siparisler?dil=tr"]) {
      const r = await cagir(env, "GET", yol, { oturum });
      assert.equal(r.durum, 200, `${yol}: ${JSON.stringify(r.govde).slice(0, 300)}`);
      dokum[yol] = r.govde;
    }
    for (const [yol, govde] of Object.entries(dokum)) assert.ok(!("hata" in (govde as object)), `${yol}: ${JSON.stringify(govde)}`);
    // Yaşam ekranının ilk yüklemesi istemci doğrulayıcısından geçmeli: içindeki her mal istemcide tanınmalı.
    const istemciMal = new Set(istemciListesi("MAL_IDLERI"));
    const gorulen = new Set<string>();
    mallariTopla(dokum["/v1/yerlesim?dil=tr"], gorulen);
    assert.ok(gorulen.size > 0);
    assert.deepEqual([...gorulen].filter((m) => !istemciMal.has(m)), [], "yerleşim yanıtında istemcinin tanımadığı mal");
  } finally {
    zarSirriAyarla(undefined, true);
    testKovaSifirla();
  }
});

test("500 kaydı hata adı, mesaj ve uç yolunu yazar; sorgu ve kimlik kesimlerini atar", async () => {
  const k = hataKaydi(new TypeError("x tanımsız"), new Request("https://k.test/v1/davet/GIZLI-KOD?dil=tr&imlec=3"));
  assert.deepEqual(k, { ad: "TypeError", mesaj: "x tanımsız", yontem: "GET", yol: "/v1/davet/:p" });
  assert.equal(hataKaydi("düz", new Request("https://k.test/v1/yerlesim?dil=tr")).yol, "/v1/yerlesim");
  // Uçtan uca: DO bağı eksik ortamda yönlendirici fırlatır → 500 ve tek satır kayıt.
  const kayitlar: unknown[][] = [];
  const eski = console.error;
  console.error = (...a: unknown[]) => { kayitlar.push(a); };
  try {
    const env = { OTURUM_ANAHTARI: "u".repeat(48), TEST_GIRIS_ACIK: "1", TEST_GIRIS_KODU: KOD } as unknown as Env;
    testKovaSifirla();
    const y = await isleyici.fetch(new Request("https://k.test/v1/test-giris", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.77" }, body: JSON.stringify({ kod: KOD, cihazId: "test-0123456789abcdefghijklmnop" }) }), env);
    assert.equal(y.status, 500);
    assert.deepEqual(await y.json(), { hata: "sunucu_hatasi" });
  } finally {
    console.error = eski;
    testKovaSifirla();
  }
  assert.equal(kayitlar.length, 1);
  const [etiket, govde] = kayitlar[0] ?? [];
  assert.equal(etiket, "sunucu_hatasi");
  const kayit = JSON.parse(String(govde)) as { ad: string; yol: string; yontem: string };
  assert.equal(kayit.yol, "/v1/test-giris");
  assert.equal(kayit.yontem, "POST");
  assert.equal(kayit.ad, "TypeError");
});
