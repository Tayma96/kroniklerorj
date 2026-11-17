import test from "node:test";
import assert from "node:assert/strict";
import { TEST_HESAP_IP_SAATLIK, testGiris, testKovaSifirla } from "../src/index.ts";
import { oturumDogrula } from "../src/oturum.ts";
import type { Env } from "../src/tipler.ts";

const KOD = "Kronikler-Test-Davet-Kodu-2026-Sonbahar";
const ANAHTAR = "oturum-test-anahtari-uzun-ve-rastgele-2026";

function ortam(ayar: Partial<Pick<Env, "TEST_GIRIS_ACIK" | "TEST_GIRIS_KODU">> = {}) {
  const hesaplar = new Map<string, { sub: string; giris: number }>();
  const HESAP = {
    idFromName: (name: string) => ({ toString: () => name }),
    idFromString: (id: string) => id,
    get: (id: string) => ({
      fetch: async (_url: string, init: RequestInit) => {
        const ileti = JSON.parse(String(init.body)) as { islem: string; sub: string; hesapId: string; yeniYasak?: boolean };
        assert.equal(ileti.islem, "giris");
        if (ileti.yeniYasak && !hesaplar.has(id)) {
          return new Response(JSON.stringify({ ok: false, hata: "hesap_yok" }), { headers: { "content-type": "application/json" } });
        }
        hesaplar.set(id, { sub: ileti.sub, giris: (hesaplar.get(id)?.giris ?? 0) + 1 });
        return new Response(JSON.stringify({ ok: true, deger: { profilVar: false } }), { headers: { "content-type": "application/json" } });
      },
    }),
  };
  const env = {
    HESAP,
    ZAR_YEDEK_IZINLI: "1", OTURUM_ANAHTARI: ANAHTAR,
    TEST_GIRIS_ACIK: "1",
    TEST_GIRIS_KODU: KOD,
    ...ayar,
  } as unknown as Env;
  return { env, hesaplar };
}

function istek(kod: string, cihazId = "test-0123456789abcdefghijklmnop", ip = "203.0.113.1") {
  return new Request("https://online.test/v1/test-giris", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip },
    body: JSON.stringify({ kod, cihazId }),
  });
}

test("test girişi production varsayılanında görünmez", async () => {
  const { env } = ortam({ TEST_GIRIS_ACIK: "0" });
  const r = await testGiris(istek(KOD), env);
  assert.equal(r.status, 404);
});

test("test girişi kısa/eksik sırla açılamaz", async () => {
  const { env } = ortam({ TEST_GIRIS_KODU: "kisa" });
  const r = await testGiris(istek("kisa"), env);
  assert.equal(r.status, 404);
});

test("yanlış davet kodu ve biçimsiz cihaz kimliği reddedilir", async () => {
  const { env } = ortam();
  assert.equal((await testGiris(istek("yanlis", "test-0123456789abcdefghijklmnop"), env)).status, 400);
  assert.equal((await testGiris(istek(KOD, "cihaz"), env)).status, 400);
});

test("aynı cihaz aynı anonim test hesabını açar; farklı cihaz ayrı hesap alır", async () => {
  const { env, hesaplar } = ortam();
  const cihaz = "test-0123456789abcdefghijklmnop";
  const a = await testGiris(istek(KOD, cihaz), env);
  const b = await testGiris(istek(KOD, cihaz), env);
  const c = await testGiris(istek(KOD, "test-zyxwvutsrqponmlkjihgfedcba"), env);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(c.status, 200);
  const aj = await a.json() as { oturum: string; profilVar: boolean };
  const bj = await b.json() as { oturum: string; profilVar: boolean };
  const cj = await c.json() as { oturum: string; profilVar: boolean };
  assert.equal(aj.profilVar, false);
  assert.deepEqual(await oturumDogrula(aj.oturum, ANAHTAR, Date.now()).then(x => x.ok ? x.hesapId : null),
    await oturumDogrula(bj.oturum, ANAHTAR, Date.now()).then(x => x.ok ? x.hesapId : null));
  assert.notEqual(
    await oturumDogrula(aj.oturum, ANAHTAR, Date.now()).then(x => x.ok ? x.hesapId : null),
    await oturumDogrula(cj.oturum, ANAHTAR, Date.now()).then(x => x.ok ? x.hesapId : null),
  );
  assert.equal([...hesaplar.values()].filter(x => x.sub.startsWith("test:")).length, 2);
  assert.equal([...hesaplar.values()].reduce((n, x) => n + x.giris, 0), 3);
});

test("S5: yeni test hesabı 22+ karakterlik cihaz kimliği ister; eski kısa kimlikli hesap girer; IP başına saatlik yeni hesap tavanı", async () => {
  testKovaSifirla();
  const { env, hesaplar } = ortam();
  const kisa = "test-0123456789abcdef"; // 16 karakter: eski biçim
  assert.equal((await testGiris(istek(KOD, kisa, "198.51.100.7"), env)).status, 400, "yeni hesap kısa kimlikle açılmaz");
  // Eski hesap (kısa kimlikle önceden açılmış) girebilir.
  const { hesapKimligi } = await import("../src/ic.ts");
  hesaplar.set(hesapKimligi(env, `test:${kisa}`), { sub: `test:${kisa}`, giris: 1 });
  assert.equal((await testGiris(istek(KOD, kisa, "198.51.100.7"), env)).status, 200);
  for (let i = 0; i < TEST_HESAP_IP_SAATLIK; i++) {
    assert.equal((await testGiris(istek(KOD, `test-yeni-cihaz-${String(i).padStart(10, "0")}xxxxxx`, "198.51.100.8"), env)).status, 200);
  }
  assert.equal((await testGiris(istek(KOD, "test-yeni-cihaz-asim-0000000000000", "198.51.100.8"), env)).status, 429);
  assert.equal((await testGiris(istek(KOD, "test-yeni-cihaz-asim-0000000000000", "198.51.100.9"), env)).status, 200, "başka IP");
  assert.equal((await testGiris(istek(KOD, "test-yeni-cihaz-0000000000xxxxxx", "198.51.100.8"), env)).status, 200, "var olan hesap IP tavanına sayılmaz");
  testKovaSifirla();
});
