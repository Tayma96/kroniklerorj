// Güvenlik sertleştirmeleri: hız sınırı yönetim çağrısından önce, gövde akış sınırı, oturum geri alma.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, YerlesimDO } from "../src/index.ts";
import { HIZ_SINIRI } from "../src/mantik.ts";
import { oturumOlustur, oturumDogrula } from "../src/oturum.ts";
import type { Env } from "../src/tipler.ts";
import { TELAFI_GUNLUK_AKCE, telafiGunlukEkle } from "../src/yonetim/y2.ts";
import { sahteAdAlani, sahteDepolama } from "./yardimci.ts";

const KOD = "Kronikler-Test-Davet-Kodu-2026-Sonbahar";
const ANAHTAR = "o".repeat(48);

/** YonetimDO yerine çağrıları sayan sahte; `cevap` parametrelerCalisma yanıtını belirler. */
function sahteYonetim(cevap: () => unknown) {
  const sayac = { calisma: 0 };
  const ad = {
    idFromName: (s: string) => ({ toString: () => s }),
    get: () => ({
      fetch: async (girdi: string | Request, init?: RequestInit) => {
        const r = typeof girdi === "string" ? new Request(girdi, init) : girdi;
        const ileti = (await r.json()) as { islem: string };
        if (ileti.islem === "parametrelerCalisma") sayac.calisma++;
        const d = cevap();
        if (d instanceof Error) throw d;
        return new Response(JSON.stringify(d), { headers: { "content-type": "application/json" } });
      },
    }),
  };
  return { ad: ad as unknown as DurableObjectNamespace, sayac };
}

function hesapDO(yonetim: DurableObjectNamespace): HesapDO {
  const env = { YONETIM: yonetim } as unknown as Env;
  return new HesapDO({ storage: sahteDepolama() } as unknown as DurableObjectState, env);
}

async function profilIste(h: HesapDO): Promise<{ ok: boolean; hata?: string }> {
  const r = await h.fetch(new Request("https://hesap/", { method: "POST", body: JSON.stringify({ islem: "profil", hesapId: "h1" }) }));
  return (await r.json()) as { ok: boolean; hata?: string };
}

test("hız sınırı yönetim çağrısından önce uygulanır; parametreler 60 sn önbelleklenir", async () => {
  const y = sahteYonetim(() => ({ ok: true, deger: { HIZ_SINIRI: 10 } }));
  const h = hesapDO(y.ad);
  const sonuclar: string[] = [];
  for (let i = 0; i < 40; i++) sonuclar.push((await profilIste(h)).hata ?? "ok");
  // Etkin sınır (10) önbellekten uygulanır: 10 istek geçer, kalanlar reddedilir.
  assert.equal(sonuclar.filter((s) => s !== "hiz_siniri").length, 10);
  // 40 isteğe karşın YonetimDO en çok bir kez çağrılır.
  assert.equal(y.sayac.calisma, 1);
});

test("önbellek süresi dolunca parametre yeniden okunur; reddedilen istek yönetimi çağırmaz", async () => {
  const gercekNow = Date.now;
  let saat = Date.UTC(2026, 10, 13, 10, 0, 5);
  Date.now = () => saat;
  try {
    const y = sahteYonetim(() => ({ ok: true, deger: { HIZ_SINIRI: 10 } }));
    const h = hesapDO(y.ad);
    for (let i = 0; i < 12; i++) await profilIste(h);
    assert.equal(y.sayac.calisma, 1);
    saat += 61_000;
    await profilIste(h);
    assert.equal(y.sayac.calisma, 2);
  } finally {
    Date.now = gercekNow;
  }
});

test("yönetim erişilemezse varsayılan hız sınırı kullanılır", async () => {
  const y = sahteYonetim(() => new Error("erisilemez"));
  const h = hesapDO(y.ad);
  let gecen = 0;
  for (let i = 0; i < HIZ_SINIRI + 5; i++) if ((await profilIste(h)).hata !== "hiz_siniri") gecen++;
  assert.equal(gecen, HIZ_SINIRI);
});

test("Content-Length olmayan büyük gövde akış olarak okunur ve sınırda kesilir", async () => {
  const env = { GOOGLE_CLIENT_ID: "x", OTURUM_ANAHTARI: ANAHTAR } as unknown as Env;
  let cekilen = 0;
  const parca = new Uint8Array(4096).fill(0x20);
  const akis = new ReadableStream<Uint8Array>({
    pull(c) {
      if (cekilen >= 4 * 1024 * 1024) return c.close();
      cekilen += parca.length;
      c.enqueue(parca);
    },
  });
  const istek = new Request("https://kronikler-online.test/v1/giris", {
    method: "POST", body: akis, duplex: "half",
  } as RequestInit & { duplex: "half" });
  assert.equal(istek.headers.get("content-length"), null);
  const yanit = await isleyici.fetch(istek, env);
  assert.equal(yanit.status, 413);
  assert.deepEqual(await yanit.json(), { hata: "govde_buyuk" });
  assert.ok(cekilen < 256 * 1024, `gövdenin tamamı okunmamalı (okunan ${cekilen})`);
});

test("sınır altındaki çok baytlı gövde geçerli JSON olarak okunur", async () => {
  const env = { GOOGLE_CLIENT_ID: "", OTURUM_ANAHTARI: ANAHTAR } as unknown as Env;
  const yanit = await isleyici.fetch(new Request("https://kronikler-online.test/v1/giris", {
    method: "POST", body: JSON.stringify({ idToken: "ş".repeat(3000) }),
  }), env);
  // Gövde okundu; yapılandırma eksik olduğundan 500 (gövde hatası değil).
  assert.deepEqual(await yanit.json(), { hata: "yapilandirma_eksik" });
});

function ortam(): Env {
  const env = { OTURUM_ANAHTARI: ANAHTAR, TEST_GIRIS_ACIK: "1", TEST_GIRIS_KODU: KOD } as unknown as Env;
  env.HESAP = sahteAdAlani((ctx) => new HesapDO(ctx, env));
  env.DUNYA = sahteAdAlani((ctx) => new DunyaDO(ctx, env));
  env.YERLESIM = sahteAdAlani((ctx) => new YerlesimDO(ctx, env));
  return env;
}

async function cagir(env: Env, yontem: string, yol: string, secenek: { govde?: unknown; oturum?: string } = {}) {
  const basliklar: Record<string, string> = {};
  if (secenek.oturum) basliklar.authorization = `Bearer ${secenek.oturum}`;
  const yanit = await isleyici.fetch(new Request(`https://kronikler-online.test${yol}`, {
    method: yontem, headers: basliklar, body: secenek.govde === undefined ? null : JSON.stringify(secenek.govde),
  }), env);
  return { durum: yanit.status, govde: (await yanit.json()) as Record<string, unknown> };
}

test("bütün oturumları kapat: eski belirteçler geçersizleşir, yeni giriş çalışır", async () => {
  const env = ortam();
  const cihazId = "test-0123456789abcdefghijklmnop";
  const giris = async () => (await cagir(env, "POST", "/v1/test-giris", { govde: { kod: KOD, cihazId } })).govde.oturum as string;
  const a = await giris();
  const b = await giris();
  // Sürümsüz (eski biçim) belirteç sürüm 0 sayılır ve geçerlidir.
  const dogru = await oturumDogrula(a, ANAHTAR, Date.now());
  assert.ok(dogru.ok);
  const eski = await oturumOlustur(dogru.hesapId, ANAHTAR, Date.now());
  assert.equal((await cagir(env, "GET", "/v1/profil", { oturum: eski })).govde.hata, "profil_yok");
  assert.equal((await cagir(env, "GET", "/v1/profil", { oturum: a })).govde.hata, "profil_yok");

  assert.equal((await cagir(env, "GET", "/v1/oturumlar/kapat", { oturum: a })).durum, 405);
  const k = await cagir(env, "POST", "/v1/oturumlar/kapat", { oturum: a });
  assert.deepEqual([k.durum, k.govde], [200, { kapatildi: true }]);
  for (const t of [a, b, eski]) {
    assert.deepEqual(await cagir(env, "GET", "/v1/profil", { oturum: t }), { durum: 401, govde: { hata: "oturum_gecersiz" } });
  }
  const c = await giris();
  assert.equal((await cagir(env, "GET", "/v1/profil", { oturum: c })).govde.hata, "profil_yok");
  // Tekrar: ikinci kapatma da sonraki belirteçleri düşürür.
  assert.equal((await cagir(env, "POST", "/v1/oturumlar/kapat", { oturum: c })).durum, 200);
  assert.equal((await cagir(env, "GET", "/v1/profil", { oturum: c })).durum, 401);
});

test("oturum belirteci sürüm taşır; sürümsüz belirteç sürüm 0", async () => {
  const simdi = Date.UTC(2026, 10, 13);
  const s0 = await oturumDogrula(await oturumOlustur("h", ANAHTAR, simdi), ANAHTAR, simdi);
  const s3 = await oturumDogrula(await oturumOlustur("h", ANAHTAR, simdi, undefined, 3), ANAHTAR, simdi);
  assert.ok(s0.ok && s3.ok);
  assert.equal(s0.surum, 0);
  assert.equal(s3.surum, 3);
});

test("telafi günlük akçe tavanı: aynı gün birikir, yeni TR gününde sıfırlanır", () => {
  const gun = Date.UTC(2026, 10, 13, 9);
  const a = telafiGunlukEkle(undefined, gun, TELAFI_GUNLUK_AKCE - 1);
  assert.ok(a);
  assert.equal(telafiGunlukEkle(a, gun, 2), undefined);
  assert.equal(telafiGunlukEkle(a, gun, 1)?.n, TELAFI_GUNLUK_AKCE);
  assert.equal(telafiGunlukEkle(a, gun + 24 * 60 * 60 * 1000, TELAFI_GUNLUK_AKCE)?.n, TELAFI_GUNLUK_AKCE);
});
