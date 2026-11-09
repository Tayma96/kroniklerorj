// Uçtan uca beceri ağacı v2: körük yamaklığıyla tecrübe → puan, öğrenme sırası (istekNo), süre dolumu (sahte saat),
// iptal, Debdebe kısaltması kapalı, yeniden düzenleme, `ben.beceriOzet` ve profil `mesleki`.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, YerlesimDO } from "../src/index.ts";
import type { Env } from "../src/tipler.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

type Nesne = Record<string, any>;
const GUN = 24 * 60 * 60 * 1000;
const DK = 60_000;

test("beceri uçları: ağaç, öğren, süre, iptal, hızlandır, yeniden, özet ve profil", async () => {
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
        new Request(`https://kronikler-online.test${yol}`, { method: yontem, headers: basliklar, body: secenek.govde === undefined ? null : JSON.stringify(secenek.govde) }),
        env,
      );
      return { durum: yanit.status, govde: (await yanit.json()) as Nesne };
    };
    const token = await jwtImzala(anahtar, googleYuku(saat));
    const oturum = (await cagir("POST", "/v1/giris", { govde: { idToken: token } })).govde.oturum as string;
    await cagir("POST", "/v1/profil", { oturum, govde: { ad: "Ayşe", cinsiyet: "kadın", yerlesim: "develi", istekNo: "profil-0001" } });
    saat += 7 * GUN;
    const { ornek } = [...yerlesimler.ornekler.values()][0]!;
    for (let i = 0; i < 5; i++) await ornek.alarm();
    let no = 0;
    const yaz = (yol: string, govde: Nesne) => cagir("POST", yol, { oturum, govde: { istekNo: `istek-${String(++no).padStart(4, "0")}`, ...govde } });
    assert.equal((await yaz("/v1/meslek", { islem: "sec", meslek: "demirci" })).durum, 200);
    assert.deepEqual((await yaz("/v1/meslek", { islem: "dugum", meslek: "demirci", dugum: "demirci.alet.0" })).govde, { hata: "gecersiz_istek" }, "v1 düğüm açma kalktı");

    // Ağaç: 14 düğüm, puan 0 (başlangıç puanı yok), kilit nedenleri.
    const a0 = await cagir("GET", "/v1/beceri?meslek=demirci", { oturum });
    assert.equal(a0.durum, 200, JSON.stringify(a0.govde));
    assert.equal(a0.govde.dugumler.length, 14);
    assert.equal(a0.govde.puan.kalan, 0);
    assert.deepEqual(a0.govde.dugumler.find((d: Nesne) => d.id === "demirci.aletcilik").kilit, ["puan"]);
    assert.equal((await cagir("GET", "/v1/beceri?meslek=korsan", { oturum })).durum, 400);
    assert.equal((await cagir("POST", "/v1/beceri", { oturum })).durum, 405);
    assert.deepEqual((await yaz("/v1/beceri/ogren", { meslek: "demirci", dugum: "demirci.aletcilik" })).govde, { hata: "puan_yok" });

    // Körük yamaklığı: mal çıkmaz, demircilik tecrübesi yazılır; iki pencerede 6 tecrübe = 1 puan.
    for (let tur = 0; tur < 2; tur++) {
      for (let i = 0; i < 3; i++) {
        const r = await yaz("/v1/temel-is", { is: "koruk" });
        assert.equal(r.durum, 200, JSON.stringify(r.govde));
        assert.equal(r.govde.yamak, true);
        assert.equal(r.govde.mal, null);
      }
      saat += GUN;
      for (let i = 0; i < 3; i++) await ornek.alarm();
    }
    const ogrenIstek = { meslek: "demirci", dugum: "demirci.aletcilik", istekNo: "ogren-0001" };
    const o1 = await cagir("POST", "/v1/beceri/ogren", { oturum, govde: ogrenIstek });
    assert.equal(o1.durum, 200, JSON.stringify(o1.govde));
    const o2 = await cagir("POST", "/v1/beceri/ogren", { oturum, govde: ogrenIstek });
    assert.deepEqual(o2.govde, o1.govde, "aynı istekNo aynı yanıt");
    assert.equal(o1.govde.ogrenme.bitis - o1.govde.ogrenme.baslangic, 15 * DK);
    assert.equal(o1.govde.beceri.demirci.kalan, 0);
    assert.equal(o1.govde.beceriOzet.ogrenme.dugum, "demirci.aletcilik");
    assert.equal((await yaz("/v1/beceri/hizlandir", { kaynak: "debdebe" })).durum, 403, "Debdebe Faz 11'de");
    assert.deepEqual((await yaz("/v1/beceri/hizlandir", { kaynak: "egitim" })).govde, { hata: "hizlandirma_yok" });
    assert.deepEqual((await yaz("/v1/beceri/ogren", { meslek: "demirci", dugum: "demirci.temelDovme" })).govde, { hata: "ogrenme_suruyor" });

    // İptal: puan iade; yeniden başlat, süre dolsun.
    const ip = await yaz("/v1/beceri/iptal", {});
    assert.equal(ip.govde.iadePuan, 1);
    assert.equal(ip.govde.beceri.demirci.kalan, 1);
    assert.equal((await yaz("/v1/beceri/ogren", { meslek: "demirci", dugum: "demirci.aletcilik" })).durum, 200);
    const ben0 = (await cagir("GET", "/v1/yerlesim", { oturum })).govde.ben;
    assert.ok(ben0.beceriOzet.ogrenme.kalanMs > 0);
    assert.equal(ben0.tarifler.find((t: Nesne) => t.id === "nal").acik, false);
    saat += 15 * DK;
    const ben1 = (await cagir("GET", "/v1/yerlesim", { oturum })).govde;
    assert.equal(ben1.ben.beceriOzet.ogrenme, null, "süre doldu, tembel tamamlandı");
    assert.equal(ben1.ben.tarifler.find((t: Nesne) => t.id === "nal").acik, true);
    assert.equal(ben1.ben.beceriOzet.meslekler.demirci.ogrenilen, 1);
    const a1 = await cagir("GET", "/v1/beceri", { oturum });
    assert.equal(a1.govde.meslek, "demirci", "varsayılan aktif meslek");
    assert.equal(a1.govde.dugumler.find((d: Nesne) => d.id === "demirci.aletcilik").seviye, 1);
    const olaylar: Nesne[] = [];
    for (let imlec = 0, dahaVar = true; dahaVar; ) {
      const g = (await cagir("GET", `/v1/olaylar?imlec=${imlec}`, { oturum })).govde;
      olaylar.push(...g.olaylar);
      ({ imlec, dahaVar } = g);
    }
    assert.ok(olaylar.some((o) => o.ozet?.k === "olay.beceri.tamam"), "tamamlanma olayı düştü");

    // Yeniden düzenleme: yalnız çırak varsa yapılacak bir şey yok.
    assert.deepEqual((await yaz("/v1/beceri/yeniden", { meslek: "demirci" })).govde, { hata: "yeniden_bos" });
    assert.deepEqual((await cagir("POST", "/v1/beceri/iptal", { oturum, govde: {} })).govde, { hata: "istekno_gecersiz" });

    // Profil: Mesleki Geçmişim.
    const p = await cagir("GET", `/v1/oyuncu/${ben1.ben.id}`, { oturum });
    assert.equal(p.durum, 200, JSON.stringify(p.govde));
    assert.deepEqual(p.govde.mesleki.meslekler.find((x: Nesne) => x.meslek === "demirci"), {
      meslek: "demirci",
      kademe: 0,
      ogrenilen: [{ dugum: "demirci.aletcilik", seviye: 1 }],
    });
    assert.equal(p.govde.mesleki.toplamBeceri, 1);
    assert.deepEqual(p.govde.mesleki.unvanlar, []);
  } finally {
    globalThis.fetch = eskiFetch;
  }
});
