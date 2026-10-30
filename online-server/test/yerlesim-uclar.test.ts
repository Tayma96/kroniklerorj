// Uçtan uca (Faz 2): gerçek yönlendirici + HesapDO, DunyaDO, YerlesimDO; bellekte sahte depolama, sahte JWKS
// ve YerlesimDO için sahte saat (alarm ve kaçan dönümler).
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, YerlesimDO } from "../src/index.ts";
import { oyunAyi, sonrakiDonum } from "../src/saat.ts";
import type { Env } from "../src/tipler.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

type Nesne = Record<string, any>;
const GUN = 24 * 60 * 60 * 1000;

test("yerleşim uçları: durum, kişi, eylem (istekNo), tanıdık, olaylar, alarm ve kaçan dönümler", async () => {
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
    assert.equal((await cagir("GET", "/v1/yerlesim")).durum, 401);
    assert.deepEqual((await cagir("GET", "/v1/yerlesim", { oturum })).govde, { hata: "profil_yok" });
    const p = await cagir("POST", "/v1/profil", {
      oturum,
      govde: { ad: "Ayşe", cinsiyet: "kadın", yerlesim: "develi", istekNo: "profil-0001" },
    });
    assert.equal(p.durum, 200);
    // Profil oluşunca oyuncu yerleşiminin sakini olur (tek YerlesimDO örneği, develi).
    assert.equal(yerlesimler.ornekler.size, 1);
    const { ornek, depolama } = [...yerlesimler.ornekler.values()][0]!;
    assert.equal(depolama.alarmAni, sonrakiDonum(saat));
    const ilkAy = oyunAyi(saat);

    const d = await cagir("GET", "/v1/yerlesim?dil=tr", { oturum });
    assert.equal(d.durum, 200);
    assert.equal(d.govde.ben.ad, "Ayşe");
    assert.equal(d.govde.ben.yas, 12);
    assert.equal(d.govde.yerlesim.id, "develi");
    assert.equal(d.govde.saat.oyunAyi, ilkAy);
    assert.equal(d.govde.harita.length, 6);
    assert.equal(d.govde.ben.ogrenme.gun, 1);

    const hedef = d.govde.harita.flatMap((m: Nesne) => m.kisiler).find((x: Nesne) => !x.oyuncu && !d.govde.ben.hane.some((h: Nesne) => h.id === x.id));
    const kisi = await cagir("GET", `/v1/kisi/${hedef.id}`, { oturum });
    assert.equal(kisi.durum, 200);
    assert.equal(kisi.govde.ad, hedef.ad);
    assert.equal(kisi.govde.sanaBakis.kalemler.reduce((a: number, k: Nesne) => a + k.d, 0), kisi.govde.sanaBakis.toplam);
    assert.deepEqual(kisi.govde.bakislari, { gorunur: false, liste: [] });
    assert.deepEqual((await cagir("GET", "/v1/kisi/xyz", { oturum })).govde, { hata: "kisi_yok" });
    assert.equal((await cagir("POST", "/v1/kisi/n1", { oturum })).durum, 405);

    const eylem = { tur: "sohbet", hedef: hedef.id, istekNo: "eylem-uc-0001" };
    const e1 = await cagir("POST", "/v1/eylem", { oturum, govde: eylem });
    const e2 = await cagir("POST", "/v1/eylem", { oturum, govde: eylem });
    assert.equal(e1.durum, 200);
    assert.deepEqual(e2.govde, e1.govde);
    assert.equal(e1.govde.takat.kalan, 5);
    assert.equal(e1.govde.hedefAd, hedef.ad);
    const cirak = await cagir("POST", "/v1/eylem", { oturum, govde: { tur: "cirak", hedef: hedef.id, istekNo: "eylem-uc-0002" } });
    assert.deepEqual([cirak.durum, cirak.govde], [403, { hata: "ogrenme_kapali" }]);
    assert.deepEqual((await cagir("POST", "/v1/eylem", { oturum, govde: { tur: "uc", istekNo: "eylem-uc-0003" } })).govde, { hata: "eylem_gecersiz" });
    assert.equal((await cagir("GET", "/v1/eylem", { oturum })).durum, 405);

    const t = await cagir("POST", "/v1/tanidik", { oturum, govde: { hedef: hedef.id, isaret: "tanidik" } });
    assert.equal(t.durum, 200);
    assert.equal(t.govde.tanidiklar[0].id, hedef.id);

    const o = await cagir("GET", "/v1/olaylar?imlec=0", { oturum });
    assert.equal(o.durum, 200);
    assert.ok(o.govde.olaylar.some((x: Nesne) => x.ozet.k === "olay.yeniSakin" && x.ozet.p.kisi.ad === "Ayşe"));
    assert.equal((await cagir("GET", "/v1/olaylar?imlec=x", { oturum })).durum, 400);

    // İki gün (4 ay) sonra alarm çalar; dönümler işlenir, Dönüş Kartı dolar.
    saat += 2 * GUN;
    await ornek.alarm();
    assert.equal(depolama.alarmAni, sonrakiDonum(saat));
    const d2 = await cagir("GET", "/v1/yerlesim", { oturum });
    assert.equal(d2.govde.saat.oyunAyi, ilkAy + 4);
    assert.ok(d2.govde.donusKarti.length > 0 && d2.govde.donusKarti.length <= 5);
    assert.equal(d2.govde.ben.ogrenme.gun, 3);
    assert.equal(d2.govde.ben.takat.kalan, Math.min(18, 5 + 4 * 6));

    // Alarmlar kaçtı (10 gün = 20 ay): istek 12 ayı yetiştirir, alarm hemen yeniden kurulur, sonra gerisi.
    saat += 10 * GUN;
    const d3 = await cagir("GET", "/v1/yerlesim", { oturum });
    assert.equal(d3.govde.saat.oyunAyi, ilkAy + 16);
    assert.equal(depolama.alarmAni, saat + 1000);
    await ornek.alarm();
    assert.equal(depolama.alarmAni, sonrakiDonum(saat));
    const d4 = await cagir("GET", "/v1/yerlesim", { oturum });
    assert.equal(d4.govde.saat.oyunAyi, oyunAyi(saat));
    assert.equal(oyunAyi(saat) - ilkAy, 24);
    assert.equal(d4.govde.ben.yas, 14);
    assert.equal(d4.govde.ben.kulYemini, true, "13 yaşına girişte Kül Yemini kancası");
  } finally {
    globalThis.fetch = eskiFetch;
  }
});
