// Uçtan uca (Faz 6): oyuncu pazarı (ilan, işlem, istekNo tekrarı, geri), ısmarlama (avans, kabul, teslim), Ustalar
// Levhası ve defter. İki oyuncu birbirini beklemeden işlem yapar; ilan sahibi çevrimdışıyken de doldurulur.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, YerlesimDO } from "../src/index.ts";
import type { Env } from "../src/tipler.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

type Nesne = Record<string, any>;
const GUN = 24 * 60 * 60 * 1000;

test("ekonomi uçları: pazar ilanı/işlem/geri, ısmarlama, levha, defter", async () => {
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
    const ben = async (o: string) => (await cagir("GET", "/v1/yerlesim", { oturum: o })).govde.ben as Nesne;

    saat += 7 * GUN; // 14 oyun ayı: 13 yaş
    const { ornek } = [...yerlesimler.ornekler.values()][0]!;
    for (let i = 0; i < 5; i++) await ornek.alarm();
    const aId = (await ben(ayse)).id as string;

    // Ayşe oduncu olur, odun keser; pazar boş, kurallar görünür.
    assert.equal((await yaz("/v1/meslek", { islem: "sec", meslek: "oduncu" }, ayse)).durum, 200);
    assert.equal((await yaz("/v1/temel-is", { is: "odun" }, ayse)).durum, 200);
    const p0 = await cagir("GET", "/v1/pazar", { oturum: zehra });
    assert.equal(p0.durum, 200, JSON.stringify(p0.govde));
    assert.deepEqual(p0.govde.ilanlar, []);
    assert.ok(p0.govde.kurallar.bacOrani > 0);
    assert.equal((await cagir("GET", "/v1/pazar?mal=altin", { oturum: zehra })).govde.hata, "mal_gecersiz");

    // Satış ilanı: mal emanete; aynı istekNo ikinci kez etki üretmez.
    const odun0 = (await ben(ayse)).envanter.odun as number;
    const il = await yaz("/v1/pazar/ilan", { tur: "sat", mal: "odun", adet: 2, fiyat: 2 }, ayse, "ilan-0001");
    const ilB = await yaz("/v1/pazar/ilan", { tur: "sat", mal: "odun", adet: 2, fiyat: 2 }, ayse, "ilan-0001");
    assert.equal(il.durum, 200, JSON.stringify(il.govde));
    assert.deepEqual(ilB.govde, il.govde);
    assert.equal(il.govde.envanter.odun ?? 0, odun0 - 2);
    const ilanId = il.govde.ilan.id as string;
    assert.equal(il.govde.ilan.karsilastirma.npcTaban, 1);
    assert.equal((await yaz("/v1/pazar/ilan", { tur: "takas", mal: "odun", adet: 1, fiyat: 1 }, ayse)).govde.hata, "ilan_gecersiz");

    // Zehra (ilan sahibi çevrimdışı olabilir) 1 adet alır; tekrar aynı yanıt.
    const zPa = (await ben(zehra)).para as number;
    const is1 = await yaz("/v1/pazar/islem", { ilan: ilanId, adet: 1 }, zehra, "islem-0001");
    const is1b = await yaz("/v1/pazar/islem", { ilan: ilanId, adet: 1 }, zehra, "islem-0001");
    assert.equal(is1.durum, 200, JSON.stringify(is1.govde));
    assert.deepEqual(is1b.govde, is1.govde);
    assert.equal(is1.govde.para, zPa - 2);
    assert.equal(is1.govde.envanter.odun, 1);
    assert.equal(is1.govde.islem.ilan.kalan, 1);
    assert.equal((await yaz("/v1/pazar/islem", { ilan: ilanId, adet: 1 }, ayse)).govde.hata, "kendine");
    assert.equal((await yaz("/v1/pazar/islem", { ilan: "p999", adet: 1 }, zehra)).durum, 404);

    // Geri: kalan mal Ayşe'ye döner.
    const g = await yaz("/v1/pazar/geri", { ilan: ilanId }, ayse);
    assert.equal(g.durum, 200, JSON.stringify(g.govde));
    assert.deepEqual(g.govde.iade, { akce: 0, adet: 1 });
    assert.equal((await yaz("/v1/pazar/geri", { ilan: ilanId }, zehra)).govde.hata, "taraf_degil");

    // Ismarlama: Zehra Ayşe'ye 1 odun ısmarlar; avans emanette, kabul ve teslimde ödeme.
    const ism = await yaz("/v1/ismarlama", { hedef: aId, mal: "odun", adet: 1, sure: 2, ucret: 2 }, zehra);
    assert.equal(ism.durum, 200, JSON.stringify(ism.govde));
    const iId = ism.govde.ismarlama.id as string;
    const gelen = await cagir("GET", "/v1/ismarlama", { oturum: ayse });
    assert.equal(gelen.govde.gelen[0].id, iId);
    assert.equal((await yaz("/v1/ismarlama/cevap", { ismarlama: iId, cevap: "kabul" }, ayse)).durum, 200);
    const tes = await yaz("/v1/ismarlama/cevap", { ismarlama: iId, cevap: "teslim" }, ayse);
    assert.equal(tes.durum, 200, JSON.stringify(tes.govde));
    assert.equal(tes.govde.ismarlama.durum, "teslim");
    assert.equal(tes.govde.teslim.ucret, 2);
    assert.equal((await yaz("/v1/ismarlama", { hedef: aId, mal: "odun", adet: 1, sure: 9, ucret: 2 }, zehra)).govde.hata, "ismarlama_gecersiz");

    // Defter: satış, bac ve ısmarlama geliri kalemleri; levha okunur.
    const d = await cagir("GET", "/v1/defter", { oturum: ayse });
    assert.equal(d.durum, 200, JSON.stringify(d.govde));
    const kalemler = d.govde.kalemler.map((x: Nesne) => x.k);
    assert.ok(kalemler.includes("pazarSatis") && kalemler.includes("ismarlamaGelir"), kalemler.join(","));
    assert.equal(d.govde.toplam.net, d.govde.kalemler.reduce((a: number, x: Nesne) => a + x.d, 0));
    assert.equal((await cagir("GET", "/v1/defter?ay=99", { oturum: ayse })).durum, 400);
    const lv = await cagir("GET", "/v1/levha", { oturum: zehra });
    assert.equal(lv.durum, 200);
    assert.ok(Array.isArray(lv.govde.kayitlar));
    assert.equal((await cagir("POST", "/v1/levha", { oturum: zehra })).durum, 405);
    // Kalıcılık: DO yeniden açılınca ilan ve ısmarlama kaydı yerinde.
    const p1 = await cagir("GET", "/v1/pazar", { oturum: ayse });
    assert.equal(p1.govde.benim[0].durum, "geri");
  } finally {
    globalThis.fetch = eskiFetch;
  }
});
