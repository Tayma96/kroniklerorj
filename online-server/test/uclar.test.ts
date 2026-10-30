// Uçtan uca: gerçek Worker yönlendiricisi + gerçek DO sınıfları, bellekte sahte depolama ve sahte JWKS ile.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, YerlesimDO } from "../src/index.ts";
import type { Env } from "../src/tipler.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

function ortam(ek: Partial<Env> = {}): Env {
  const env = { GOOGLE_CLIENT_ID: `web-istemci,${ISTEMCI}`, OTURUM_ANAHTARI: "o".repeat(48), ...ek } as Env;
  env.HESAP = sahteAdAlani((ctx) => new HesapDO(ctx, env));
  env.DUNYA = sahteAdAlani((ctx) => new DunyaDO(ctx, env));
  env.YERLESIM = sahteAdAlani((ctx) => new YerlesimDO(ctx, env));
  return env;
}

function istemci(env: Env) {
  return async (yontem: string, yol: string, secenek: { govde?: unknown; oturum?: string } = {}) => {
    const basliklar: Record<string, string> = {};
    if (secenek.oturum) basliklar.authorization = `Bearer ${secenek.oturum}`;
    if (secenek.govde !== undefined) basliklar["content-type"] = "application/json";
    const yanit = await isleyici.fetch(
      new Request(`https://kronikler-online.test${yol}`, {
        method: yontem,
        headers: basliklar,
        body: secenek.govde === undefined ? null : JSON.stringify(secenek.govde),
      }),
      env,
    );
    return { durum: yanit.status, govde: (await yanit.json()) as Record<string, unknown>, yanit };
  };
}

test("uçlar: giriş, profil, tekrar güvenliği, davet, dünya, hız sınırı", async () => {
  const anahtar = await rsaAnahtari("kid-1");
  const jwks = sahteJwks([anahtar]);
  const eskiFetch = globalThis.fetch;
  globalThis.fetch = jwks.getir;
  try {
    const env = ortam();
    const cagir = istemci(env);
    const simdi = Date.now();

    assert.deepEqual((await cagir("GET", "/yok")).govde, { hata: "bulunamadi" });
    assert.equal((await cagir("GET", "/v1/giris")).durum, 405);
    assert.equal((await cagir("POST", "/v1/giris", { govde: {} })).durum, 400);
    const sahte = await cagir("POST", "/v1/giris", { govde: { idToken: "a.b.c" } });
    assert.deepEqual([sahte.durum, sahte.govde], [401, { hata: "google_gecersiz" }]);

    const t1 = await jwtImzala(anahtar, googleYuku(simdi));
    const g1 = await cagir("POST", "/v1/giris", { govde: { idToken: t1 } });
    assert.equal(g1.durum, 200);
    assert.equal(g1.govde.profilVar, false);
    assert.equal(g1.govde.adOnerisi, "Ayşe");
    assert.equal(g1.yanit.headers.get("access-control-allow-origin"), null);
    const oturum = g1.govde.oturum as string;

    assert.deepEqual((await cagir("GET", "/v1/profil")).govde, { hata: "oturum_yok" });
    assert.equal((await cagir("GET", "/v1/profil", { oturum: `${oturum}x` })).durum, 401);
    assert.deepEqual((await cagir("GET", "/v1/profil", { oturum })).govde, { hata: "profil_yok" });

    const profilGovdesi = { ad: "Ayşe", cinsiyet: "kadın", yerlesim: "kizilca", istekNo: "3f1c2a9e-0001" };
    const p1 = await cagir("POST", "/v1/profil", { oturum, govde: profilGovdesi });
    assert.equal(p1.durum, 200);
    assert.equal(p1.govde.yerlesim, "kizilca");
    const p2 = await cagir("POST", "/v1/profil", { oturum, govde: profilGovdesi });
    assert.deepEqual(p2.govde, p1.govde);
    const p3 = await cagir("POST", "/v1/profil", { oturum, govde: { ...profilGovdesi, istekNo: "3f1c2a9e-0002" } });
    assert.deepEqual([p3.durum, p3.govde], [409, { hata: "profil_var" }]);
    assert.deepEqual((await cagir("GET", "/v1/profil", { oturum })).govde, p1.govde);

    const dunya = await cagir("GET", "/v1/dunya");
    const beylikler = dunya.govde.beylikler as { yerlesimler: { id: string; nufus: number }[] }[];
    assert.equal(beylikler.length, 7);
    assert.equal(beylikler.flatMap((b) => b.yerlesimler).find((y) => y.id === "kizilca")?.nufus, 1);

    const d1 = await cagir("POST", "/v1/davet", { oturum });
    const d2 = await cagir("POST", "/v1/davet", { oturum });
    const kod = d1.govde.kod as string;
    assert.equal(d2.govde.kod, kod);

    // İkinci oyuncu davetle gelir: kendi seçtiği yerine davet edenin yerleşimine.
    const t2 = await jwtImzala(anahtar, googleYuku(simdi, { sub: "220000000000000000002", given_name: "Mehmet" }));
    const oturum2 = (await cagir("POST", "/v1/giris", { govde: { idToken: t2 } })).govde.oturum as string;
    assert.notEqual(oturum2, oturum);
    const cozum = await cagir("GET", `/v1/davet/${kod.toLowerCase()}`, { oturum: oturum2 });
    assert.deepEqual(cozum.govde, { kod, yerlesim: "kizilca", beylik: "demirhan", davetEden: "Ayşe" });
    assert.deepEqual((await cagir("GET", "/v1/davet/222222", { oturum: oturum2 })).govde, { hata: "davet_yok" });
    const ayni = await cagir("POST", "/v1/profil", {
      oturum: oturum2,
      govde: { ad: "AYŞE", cinsiyet: "erkek", davet: kod, istekNo: "istek-iki-0001" },
    });
    assert.deepEqual([ayni.durum, ayni.govde], [409, { hata: "ad_alinmis" }]);
    const p4 = await cagir("POST", "/v1/profil", {
      oturum: oturum2,
      govde: { ad: "Mehmet", cinsiyet: "erkek", yerlesim: "misis", davet: kod, istekNo: "istek-iki-0002" },
    });
    assert.equal(p4.durum, 200);
    assert.equal(p4.govde.yerlesim, "kizilca");
    assert.equal(p4.govde.davetEden, "Ayşe");

    const g2 = await cagir("POST", "/v1/giris", { govde: { idToken: t1 } });
    assert.equal(g2.govde.profilVar, true);
    assert.equal(g2.govde.adOnerisi, undefined);
    assert.equal(jwks.cagrilar.length, 1);

    let sinir = 0;
    for (let i = 0; i < 70 && sinir === 0; i++) {
      const r = await cagir("GET", "/v1/profil", { oturum });
      if (r.durum === 429) sinir = i;
    }
    assert.ok(sinir > 0, "hız sınırı devreye girmeli");
    assert.deepEqual((await cagir("GET", "/v1/profil", { oturum })).govde, { hata: "hiz_siniri" });
    assert.equal((await cagir("GET", "/v1/profil", { oturum: oturum2 })).durum, 200);
  } finally {
    globalThis.fetch = eskiFetch;
  }
});

test("yapılandırma eksikse giriş ve oturum uçları 500 yapilandirma_eksik", async () => {
  const cagir = istemci(ortam({ GOOGLE_CLIENT_ID: "", OTURUM_ANAHTARI: "kisa" }));
  const g = await cagir("POST", "/v1/giris", { govde: { idToken: "a.b.c" } });
  assert.deepEqual([g.durum, g.govde], [500, { hata: "yapilandirma_eksik" }]);
  assert.equal((await cagir("GET", "/v1/profil", { oturum: "x.y" })).durum, 500);
  assert.equal((await cagir("GET", "/v1/dunya")).durum, 200);
});
