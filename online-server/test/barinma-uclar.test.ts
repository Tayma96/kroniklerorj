// Uçtan uca (Faz 14): barınma görünümü, kira (istekNo tekrar güvenliği, akçe), otomatik talimat, tesis, dönüş ekranı.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, YerlesimDO } from "../src/index.ts";
import type { Env } from "../src/tipler.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

type Nesne = Record<string, any>;
const SAAT = 60 * 60 * 1000;

test("barınma uçları: görünüm, kira, tekrar güvenliği, otomatik, tesis, dönüş ekranı", async () => {
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

    // Yeni sakin ocağında: konaklıdır, misafirhane hakkı harcanmaz; durum yanıtı barınmayı taşır, dönüş ekranı yok.
    const d0 = await cagir("GET", "/v1/yerlesim", { oturum });
    assert.equal(d0.durum, 200, JSON.stringify(d0.govde));
    assert.equal(d0.govde.barinma.durum, "konakli");
    assert.equal(d0.govde.barinma.konaklama.tur, "ocak");
    assert.equal(d0.govde.barinma.misafirhane.buSehir.kullanildi, false);
    assert.equal(d0.govde.donusEkrani, null);
    const b0 = await cagir("GET", "/v1/barinma", { oturum });
    assert.equal(b0.durum, 200);
    assert.deepEqual(b0.govde.barinma.odalar.map((o: Nesne) => o.oda), ["yatak", "oda"]);
    assert.equal(b0.govde.barinma.otomatik.mod, "kapali");
    assert.equal((await cagir("POST", "/v1/barinma", { oturum })).durum, 405);
    assert.equal((await cagir("GET", "/v1/barinma/kira", { oturum })).durum, 405);

    // Kira: istekNo şart; aynı istekNo ikinci kez akçe düşürmez.
    assert.deepEqual((await cagir("POST", "/v1/barinma/kira", { oturum, govde: { oda: "yatak", sure: 1 } })).govde, { hata: "istekno_gecersiz" });
    const kira = { oda: "yatak", sure: 1, istekNo: "kira-0001" };
    const k1 = await cagir("POST", "/v1/barinma/kira", { oturum, govde: kira });
    const k2 = await cagir("POST", "/v1/barinma/kira", { oturum, govde: kira });
    assert.equal(k1.durum, 200, JSON.stringify(k1.govde));
    assert.deepEqual(k2.govde, k1.govde);
    assert.equal(k1.govde.kira.fiyat, 2);
    assert.equal(k1.govde.kira.batak, 2);
    assert.equal(k1.govde.para, 3, "başlangıç 5 − kira 2 (NPC hancı: dünyadan çıkar)");
    assert.equal(k1.govde.barinma.konaklama.tur, "oda");
    const k3 = await cagir("POST", "/v1/barinma/kira", { oturum, govde: { oda: "oda", sure: 1, istekNo: "kira-0002" } });
    assert.deepEqual([k3.durum, k3.govde], [409, { hata: "oda_var" }]);
    const k4 = await cagir("POST", "/v1/barinma/kira", { oturum, govde: { oda: "saray", sure: 1, istekNo: "kira-0003" } });
    assert.deepEqual([k4.durum, k4.govde], [400, { hata: "oda_gecersiz" }]);

    // Otomatik talimat ve tesis.
    const o1 = await cagir("POST", "/v1/barinma/otomatik", { oturum, govde: { mod: "oda", istekNo: "oto-0001" } });
    assert.equal(o1.durum, 200, JSON.stringify(o1.govde));
    assert.equal(o1.govde.otomatik, "oda");
    const o2 = await cagir("POST", "/v1/barinma/otomatik", { oturum, govde: { mod: "bazen", istekNo: "oto-0002" } });
    assert.deepEqual([o2.durum, o2.govde], [400, { hata: "mod_gecersiz" }]);
    const t1 = await cagir("POST", "/v1/barinma/tesis", { oturum, govde: { istekNo: "tesis-0001" } });
    assert.deepEqual([t1.durum, t1.govde], [409, { hata: "konaklama_var" }]);

    // 3 gün yokluk: oda bitti, ocak barındırıyor (otomatik talimat harcamaz); dönüş ekranı gösterilir.
    saat += 72 * SAAT;
    const { ornek } = [...yerlesimler.ornekler.values()][0]!;
    await ornek.alarm();
    const d1 = await cagir("GET", "/v1/yerlesim", { oturum });
    assert.equal(d1.govde.ben.para, 3);
    assert.equal(d1.govde.barinma.konaklama.tur, "ocak");
    const e = d1.govde.donusEkrani;
    assert.ok(e, "uzun yoklukta dönüş ekranı");
    assert.equal(e.baslik, "donus.baslik.hosgeldin");
    assert.ok(e.yokluk.ms >= 72 * SAAT);
    assert.ok(e.olanlar.some((x: Nesne) => x.k === "donus.olan.oda.bitti"));
    assert.deepEqual(e.secenekler, [], "ocağı güvende olana barınma dayatılmaz");
    // Dönüş ekranı yeniden açılabilir; ikinci durum çağrısında yeniden gösterilmez.
    const g = await cagir("GET", "/v1/donus", { oturum });
    assert.equal(g.durum, 200);
    assert.equal(g.govde.donusEkrani.yokluk.baslangic, e.yokluk.baslangic);
    assert.equal((await cagir("GET", "/v1/yerlesim", { oturum })).govde.donusEkrani, null);
  } finally {
    globalThis.fetch = eskiFetch;
  }
});
