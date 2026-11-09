// Uçtan uca (Faz 3a): oyuncu profili (görünür alanlar), dostluk, teklif ve cevap (istekNo tekrarı), gelen kutusu,
// husumet, engelleme sonrası teklif kapalı, olağan düzen, vitrin ve süre dolumunda emanet iadesi.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, YerlesimDO } from "../src/index.ts";
import type { Env } from "../src/tipler.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

type Nesne = Record<string, any>;
const GUN = 24 * 60 * 60 * 1000;
const GIZLI = ["para", "envanter", "beceriler", "ozellikler", "hal", "tanidiklar", "duzen", "takat", "ogrenme", "sanaBakis"];

test("oyuncular arası uçlar: profil, dostluk, teklif/cevap, gelen, husumet, engel, düzen, vitrin", async () => {
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
    const giris = async (sub: string, ad: string) => {
      const token = await jwtImzala(anahtar, googleYuku(saat, { sub }));
      const oturum = (await cagir("POST", "/v1/giris", { govde: { idToken: token } })).govde.oturum as string;
      const p = await cagir("POST", "/v1/profil", { oturum, govde: { ad, cinsiyet: "kadın", yerlesim: "develi", istekNo: `profil-${sub}` } });
      assert.equal(p.durum, 200, JSON.stringify(p.govde));
      return oturum;
    };
    const ayse = await giris("sub-ayse", "Ayşe");
    const zehra = await giris("sub-zehra", "Zehra");
    let no = 0;
    const yaz = (yol: string, govde: Nesne, o: string, istekNo = `istek-${String(++no).padStart(4, "0")}`) =>
      cagir("POST", yol, { oturum: o, govde: { ...govde, istekNo } });

    // 12 yaşında teklif kapalı (öğrenme dönemi); 7 gün = 14 ay sonra 13.
    const aId = (await cagir("GET", "/v1/yerlesim", { oturum: ayse })).govde.ben.id as string;
    const zId = (await cagir("GET", "/v1/yerlesim", { oturum: zehra })).govde.ben.id as string;
    assert.equal((await yaz("/v1/teklif", { tur: "hediye", hedef: zId, tutar: 1 }, ayse)).govde.hata, "yas_kapisi");
    saat += 7 * GUN;
    const { ornek } = [...yerlesimler.ornekler.values()][0]!;
    for (let i = 0; i < 5; i++) await ornek.alarm();

    // Profil: yalnız görünür alanlar; kendi kimliğinle ben: true.
    const p = await cagir("GET", `/v1/oyuncu/${zId}`, { oturum: ayse });
    assert.equal(p.durum, 200, JSON.stringify(p.govde));
    for (const alan of GIZLI) assert.equal(alan in p.govde, false, `gizli alan sızdı: ${alan}`);
    assert.equal(p.govde.ad, "Zehra");
    assert.equal(p.govde.ben, false);
    assert.ok(p.govde.nam && p.govde.hane && p.govde.teveccuh && Array.isArray(p.govde.vitrin) && Array.isArray(p.govde.eylemler));
    assert.equal(p.govde.teveccuh.kademe, 0);
    assert.ok(p.govde.eylemler.some((e: Nesne) => e.tur === "teklif.hediye" && e.acik));
    const ben = await cagir("GET", `/v1/oyuncu/${aId}`, { oturum: ayse });
    assert.equal(ben.govde.ben, true);
    assert.deepEqual(ben.govde.eylemler, []);
    assert.equal((await cagir("GET", "/v1/oyuncu/o999", { oturum: ayse })).durum, 404);
    assert.equal((await cagir("POST", `/v1/oyuncu/${zId}`, { oturum: ayse })).durum, 405);

    // Dostluk: istek (tekrar aynı yanıt), gelen kutusunda görünür, kabul.
    const d1 = await yaz("/v1/dostluk", { hedef: zId, islem: "iste" }, ayse, "dostluk-1");
    const d1b = await yaz("/v1/dostluk", { hedef: zId, islem: "iste" }, ayse, "dostluk-1");
    assert.equal(d1.durum, 200, JSON.stringify(d1.govde));
    assert.deepEqual(d1b.govde, d1.govde);
    assert.equal(d1.govde.bag, "istekGonderildi");
    const g0 = (await cagir("GET", "/v1/gelen", { oturum: zehra })).govde;
    assert.equal(g0.dostluk.gelen[0].id, aId);
    assert.equal((await yaz("/v1/dostluk", { hedef: zId, islem: "iste" }, zehra)).govde.hata, "kendine");
    const d2 = await yaz("/v1/dostluk", { hedef: aId, islem: "kabul" }, zehra);
    assert.equal(d2.govde.bag, "dost");
    assert.equal((await cagir("GET", `/v1/oyuncu/${zId}`, { oturum: ayse })).govde.bag, "dost");

    // Teklif: hediye (emanet), tekrar güvenli; yanlış taraf; kabul tekrarı.
    assert.equal((await yaz("/v1/teklif", { tur: "hediye", hedef: aId, tutar: 1 }, ayse)).govde.hata, "kendine");
    const t1 = await yaz("/v1/teklif", { tur: "hediye", hedef: zId, tutar: 2 }, ayse, "hediye-1");
    assert.equal(t1.durum, 200, JSON.stringify(t1.govde));
    const t1b = await yaz("/v1/teklif", { tur: "hediye", hedef: zId, tutar: 2 }, ayse, "hediye-1");
    assert.deepEqual(t1b.govde, t1.govde, "aynı istekNo ikinci kez emanet almaz");
    const tid = t1.govde.teklif.id as string;
    assert.equal(t1.govde.teklif.emanet, 2);
    assert.equal(t1.govde.teklif.varsayilan, "dustu");
    const paraA = t1.govde.para as number;
    const gelen = (await cagir("GET", "/v1/gelen", { oturum: zehra })).govde;
    const oyuncudan = gelen.gelen.filter((x: Nesne) => x.kaynak === "oyuncu");
    assert.equal(oyuncudan.length, 1);
    assert.equal(oyuncudan[0].id, tid);
    assert.equal(oyuncudan[0].gonderen.ad, "Ayşe");
    assert.equal(oyuncudan[0].yon, "gelen");
    assert.equal((await yaz(`/v1/teklif/${tid}/cevap`, { cevap: "kabul" }, ayse)).govde.hata, "taraf_degil");
    assert.equal((await cagir("GET", `/v1/teklif/${tid}/cevap`, { oturum: zehra })).durum, 405);
    const paraZ0 = (await cagir("GET", "/v1/yerlesim", { oturum: zehra })).govde.ben.para as number;
    const c1 = await yaz(`/v1/teklif/${tid}/cevap`, { cevap: "kabul" }, zehra, "kabul-0001");
    const c1b = await yaz(`/v1/teklif/${tid}/cevap`, { cevap: "kabul" }, zehra, "kabul-0001");
    assert.equal(c1.durum, 200, JSON.stringify(c1.govde));
    assert.deepEqual(c1b.govde, c1.govde);
    assert.equal(c1.govde.para, paraZ0 + 2, "tek kez aktarıldı");
    assert.equal((await yaz(`/v1/teklif/${tid}/cevap`, { cevap: "kabul" }, zehra)).govde.hata, "teklif_kapandi");
    const pz = (await cagir("GET", `/v1/oyuncu/${zId}`, { oturum: ayse })).govde;
    assert.equal(pz.vitrin[0].kimden.id, aId);
    assert.ok(pz.teveccuh.puan > 0);
    const v = await yaz("/v1/vitrin", { goster: [tid] }, zehra);
    assert.equal(v.govde.vitrin.length, 1);

    // Süre dolumu: Zehra'ya yeni teklif, cevapsız → emanet geri.
    const t2 = await yaz("/v1/teklif", { tur: "borc", yon: "ver", hedef: zId, tutar: 1, vade: 2 }, ayse);
    assert.equal(t2.durum, 200, JSON.stringify(t2.govde));
    assert.equal(t2.govde.para, paraA - 1);

    // Olağan düzen.
    const dz0 = (await cagir("GET", "/v1/duzen", { oturum: zehra })).govde.duzen;
    assert.equal(dz0.borcCevap, "bekle");
    const dz = await yaz("/v1/duzen", { gelen: { hediye: "kabul" } }, zehra);
    assert.equal(dz.govde.duzen.gelen.hediye, "kabul");
    assert.equal((await yaz("/v1/duzen", { gelen: { gorucu: "kabul" } }, zehra)).govde.hata, "duzen_gecersiz");

    saat += 2 * GUN;
    for (let i = 0; i < 5; i++) await ornek.alarm();
    const gA = (await cagir("GET", "/v1/gelen", { oturum: ayse })).govde;
    const dusen = gA.kapanan.find((x: Nesne) => x.id === t2.govde.teklif.id);
    assert.equal(dusen?.durum, "dustu");
    assert.equal((await cagir("GET", "/v1/yerlesim", { oturum: ayse })).govde.ben.para, paraA, "emanet iade");

    // Husumet: herkese görünür ilan; dostluk biter.
    const h = await yaz("/v1/husumet", { hedef: aId, islem: "ilan" }, zehra);
    assert.equal(h.govde.husumet, true);
    const gH = (await cagir("GET", "/v1/gelen", { oturum: ayse })).govde;
    assert.equal(gH.husumetler[0].yon, "ilanEdildi");
    assert.equal(gH.dostluk.dostlar.length, 0);
    assert.equal((await cagir("GET", `/v1/oyuncu/${zId}`, { oturum: ayse })).govde.husumet.oIlanEtti, true);

    // Engel: engellenen teklif ve dostluk isteği gönderemez.
    const e = await yaz("/v1/engelle", { hedef: aId }, zehra);
    assert.equal(e.govde.engellenenler[0].id, aId);
    assert.equal((await yaz("/v1/teklif", { tur: "hediye", hedef: zId, tutar: 1 }, ayse)).durum, 403);
    assert.equal((await yaz("/v1/dostluk", { hedef: zId, islem: "iste" }, ayse)).govde.hata, "engelli");
    assert.equal((await cagir("GET", `/v1/oyuncu/${aId}`, { oturum: zehra })).govde.engelledim, true);
    const k = await yaz("/v1/engelle", { hedef: aId, islem: "kaldir" }, zehra);
    assert.deepEqual(k.govde.engellenenler, []);
  } finally {
    globalThis.fetch = eskiFetch;
  }
});
