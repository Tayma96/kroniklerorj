// Uçtan uca: meslek seçimi, temel iş (istekNo tekrar güvenliği), NPC taban alımı ve lonca tablosu.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, YerlesimDO } from "../src/index.ts";
import type { Env } from "../src/tipler.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

type Nesne = Record<string, any>;
const GUN = 24 * 60 * 60 * 1000;

test("meslek uçları: seçim, temel iş, taban alımı, lonca", async () => {
  const anahtar = await rsaAnahtari("kid-1");
  const jwks = sahteJwks([anahtar]);
  const eskiFetch = globalThis.fetch;
  globalThis.fetch = jwks.getir;
  try {
    let saat = Date.now();
    const env = { GOOGLE_CLIENT_ID: ISTEMCI, OTURUM_ANAHTARI: "o".repeat(48) } as Env;
    env.HESAP = sahteAdAlani((ctx) => new HesapDO(ctx, env));
    env.DUNYA = sahteAdAlani((ctx) => new DunyaDO(ctx, env));
    const yerlesimler = sahteAdAlani((ctx) => new YerlesimDO(ctx, env, () => saat));
    env.YERLESIM = yerlesimler;
    const cagir = async (yontem: string, yol: string, secenek: { govde?: unknown; oturum?: string } = {}) => {
      const basliklar: Record<string, string> = {};
      if (secenek.oturum) basliklar.authorization = `Bearer ${secenek.oturum}`;
      const yanit = await isleyici.fetch(
        new Request(`https://kronikler-online.test${yol}`, {
          method: yontem,
          headers: basliklar,
          body: secenek.govde === undefined ? null : JSON.stringify(secenek.govde),
        }),
        env,
      );
      return { durum: yanit.status, govde: (await yanit.json()) as Nesne };
    };

    const token = await jwtImzala(anahtar, googleYuku(saat));
    const oturum = (await cagir("POST", "/v1/giris", { govde: { idToken: token } })).govde.oturum as string;
    await cagir("POST", "/v1/profil", { oturum, govde: { ad: "Ayşe", cinsiyet: "kadın", yerlesim: "develi", istekNo: "profil-0001" } });

    // 12 yaşında meslek seçilemez; eski (ms alanı olmayan) karakter de lonca tablosunu görür.
    const sec = { islem: "sec", meslek: "demirci", istekNo: "meslek-0001" };
    assert.deepEqual((await cagir("POST", "/v1/meslek", { oturum, govde: sec })).govde, { hata: "yas_kapisi" });
    const l0 = await cagir("GET", "/v1/lonca", { oturum });
    assert.equal(l0.govde.lonca.length, 14);
    assert.equal(l0.govde.lonca.find((x: Nesne) => x.meslek === "demirci").oyuncu, 0);
    assert.equal((await cagir("POST", "/v1/lonca", { oturum })).durum, 405);

    // 7 gün = 14 oyun ayı: 13 yaş.
    saat += 7 * GUN;
    const { ornek } = [...yerlesimler.ornekler.values()][0]!;
    for (let i = 0; i < 5; i++) await ornek.alarm();
    const s1 = await cagir("POST", "/v1/meslek", { oturum, govde: { ...sec, istekNo: "meslek-0002" } });
    assert.equal(s1.durum, 200, JSON.stringify(s1.govde));
    assert.equal(s1.govde.meslek.a, "demirci");
    assert.equal((await cagir("GET", "/v1/lonca", { oturum })).govde.lonca.find((x: Nesne) => x.meslek === "demirci").durum, "az");
    assert.deepEqual((await cagir("POST", "/v1/meslek", { oturum, govde: { islem: "uc", meslek: "demirci", istekNo: "meslek-0003" } })).govde, { hata: "gecersiz_istek" });

    // Demirci odun keser; aynı istekNo ikinci kez envanteri artırmaz.
    const is = { is: "odun", istekNo: "temelis-0001" };
    const t1 = await cagir("POST", "/v1/temel-is", { oturum, govde: is });
    const t2 = await cagir("POST", "/v1/temel-is", { oturum, govde: is });
    assert.equal(t1.durum, 200, JSON.stringify(t1.govde));
    assert.deepEqual(t2.govde, t1.govde);
    assert.equal(t1.govde.envanter.odun, 3);
    assert.ok(t1.govde.firsat.kalemler.some((x: Nesne) => x.k === "meslekte"));
    const t3 = await cagir("POST", "/v1/temel-is", { oturum, govde: { is: "odun", istekNo: "temelis-0002" } });
    assert.equal(t3.govde.envanter.odun, 4);

    // NPC taban alımı: para yetmezse hata, envanter değişmez.
    const a1 = await cagir("POST", "/v1/taban-al", { oturum, govde: { mal: "alet", adet: 1, istekNo: "taban-0001" } });
    assert.deepEqual(a1.govde, { hata: "para_yok" });
    const a2 = await cagir("POST", "/v1/taban-al", { oturum, govde: { mal: "odun", adet: 1, istekNo: "taban-0002" } });
    assert.equal(a2.durum, 200, JSON.stringify(a2.govde));
    assert.equal(a2.govde.envanter.odun, 5);
    assert.equal(a2.govde.para, t3.govde.para - 3, "NPC odunu 3 akçe (taban 1 × 2.5, yukarı yuvarlanır)");
    assert.deepEqual((await cagir("POST", "/v1/taban-al", { oturum, govde: { mal: "odun", adet: 1 } })).govde, { hata: "istekno_gecersiz" });
  } finally {
    globalThis.fetch = eskiFetch;
  }
});
