// H12 uçtan uca: gerçek Worker yönlendiricisi + gerçek DO sınıfları. Sandık (istekNo tekrar güvenliği, çoğalmazlık),
// emanet geri alma, barınma görünümünde ikamet/sandık/görüşme, siyasi kimlikte ikamet, özel görüşme olayları.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, YerlesimDO } from "../src/index.ts";
import { yerlesimCagir } from "../src/ic.ts";
import type { Env } from "../src/tipler.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

type Nesne = Record<string, any>;
let sayac = 0;
const no = (): string => `odag-${String(++sayac).padStart(8, "0")}`;

test("H12 uçları: sandık koy/al tekrar güvenli, emanet, ikamet, özel görüşme yalnız görüşmedekilere", async () => {
  const anahtar = await rsaAnahtari("kid-odag");
  const eskiFetch = globalThis.fetch;
  globalThis.fetch = sahteJwks([anahtar]).getir;
  try {
    const env = { GOOGLE_CLIENT_ID: ISTEMCI, OTURUM_ANAHTARI: "o".repeat(48) } as Env;
    env.HESAP = sahteAdAlani((ctx) => new HesapDO(ctx, env));
    env.DUNYA = sahteAdAlani((ctx) => new DunyaDO(ctx, env));
    let saat = Date.now();
    const yerlesimler = sahteAdAlani((ctx) => new YerlesimDO(ctx, env, () => saat));
    env.YERLESIM = yerlesimler;
    const simdi = saat;
    const cagir = async (yontem: string, yol: string, s: { govde?: unknown; oturum?: string } = {}) => {
      const basliklar: Record<string, string> = {};
      if (s.oturum) basliklar.authorization = `Bearer ${s.oturum}`;
      const y = await isleyici.fetch(
        new Request(`https://kronikler-online.test${yol}`, { method: yontem, headers: basliklar, body: s.govde === undefined ? null : JSON.stringify(s.govde) }),
        env,
      );
      return { durum: y.status, govde: (await y.json()) as Nesne };
    };
    const oyuncu = async (sub: string, ad: string) => {
      const t = await jwtImzala(anahtar, googleYuku(simdi, { sub, given_name: ad }));
      const oturum = (await cagir("POST", "/v1/giris", { govde: { idToken: t } })).govde.oturum as string;
      const p = await cagir("POST", "/v1/profil", { oturum, govde: { ad, cinsiyet: "kadın", yerlesim: "develi", istekNo: no() } });
      assert.equal(p.durum, 200, `profil ${ad}`);
      const d = await cagir("GET", "/v1/yerlesim", { oturum });
      return { oturum, hesap: p.govde.hesapId as string, o: d.govde.ben.id as string };
    };
    const ayse = await oyuncu("140000000000000000201", "Ayşe");
    const bora = await oyuncu("140000000000000000202", "Bora");
    const cem = await oyuncu("140000000000000000203", "Cem");
    const yaz = (oturum: string, yol: string, govde: Nesne) => cagir("POST", yol, { oturum, govde: { istekNo: no(), ...govde } });

    // Yol ve yöntem; kirasız sandık reddedilir.
    assert.equal((await cagir("GET", "/v1/barinma/sandik", { oturum: ayse.oturum })).durum, 405);
    assert.equal((await cagir("GET", "/v1/barinma/emanet", { oturum: ayse.oturum })).durum, 405);
    assert.equal((await cagir("GET", "/v1/barinma/gorusme", { oturum: ayse.oturum })).durum, 405);
    assert.deepEqual((await cagir("POST", "/v1/barinma/sandik", { oturum: ayse.oturum, govde: { islem: "koy", mal: "odun", adet: 1 } })).govde, { hata: "istekno_gecersiz" });
    const s0 = await yaz(ayse.oturum, "/v1/barinma/sandik", { islem: "koy", mal: "odun", adet: 1 });
    assert.deepEqual([s0.durum, s0.govde], [409, { hata: "sandik_yok" }]);

    // 7 gün = 14 oyun ayı: 13 yaş (temel iş kapısı). Sonra oda (4 akçe; başlangıç 5) + temel iş odunu.
    saat += 7 * 24 * 60 * 60 * 1000;
    const { ornek } = [...yerlesimler.ornekler.values()][0]!;
    for (let i = 0; i < 5; i++) await ornek.alarm();
    const kira = await yaz(ayse.oturum, "/v1/barinma/kira", { oda: "oda", sure: 1 });
    assert.equal(kira.durum, 200, JSON.stringify(kira.govde));
    assert.equal(kira.govde.barinma.ikamet, true);
    const is = await yaz(ayse.oturum, "/v1/temel-is", { is: "odun" });
    assert.equal(is.durum, 200, JSON.stringify(is.govde));
    const odun = is.govde.envanter.odun as number;
    assert.ok(odun >= 1);

    // Aynı istekNo ikinci kez mal taşımaz.
    const koy = { islem: "koy", mal: "odun", adet: odun, istekNo: no() };
    const k1 = await cagir("POST", "/v1/barinma/sandik", { oturum: ayse.oturum, govde: koy });
    const k2 = await cagir("POST", "/v1/barinma/sandik", { oturum: ayse.oturum, govde: koy });
    assert.equal(k1.durum, 200, JSON.stringify(k1.govde));
    assert.deepEqual(k2.govde, k1.govde);
    assert.equal(k1.govde.envanter.odun, undefined);
    assert.equal(k1.govde.sandik.durum, "sandik");
    assert.deepEqual(k1.govde.sandik.mallar, { odun });
    const b1 = (await cagir("GET", "/v1/barinma", { oturum: ayse.oturum })).govde.barinma;
    assert.equal(b1.sandik.adet, odun, "ikinci istek çoğaltmadı");
    assert.equal(b1.ikamet, true);
    assert.equal(b1.gorusme.acabilir, true);

    // Siyasi kimlik ikameti taşır (veri hazır; kapı bağlı değil).
    const sk = await yerlesimCagir(env, { islem: "siyasetKimlik", yerlesim: "develi", hesapId: ayse.hesap });
    assert.ok(sk.ok);
    assert.equal((sk.deger as Nesne).ikamet, true);
    const skb = await yerlesimCagir(env, { islem: "siyasetKimlik", yerlesim: "develi", hesapId: bora.hesap });
    assert.equal((skb as Nesne).deger.ikamet, false);

    // Emanet ucu: hepsi envantere döner; ikinci çağrı emanet_yok.
    const e1 = await yaz(ayse.oturum, "/v1/barinma/emanet", {});
    assert.equal(e1.durum, 200, JSON.stringify(e1.govde));
    assert.deepEqual(e1.govde.emanet.alinan, { odun });
    assert.equal(e1.govde.envanter.odun, odun);
    assert.deepEqual((await yaz(ayse.oturum, "/v1/barinma/emanet", {})).govde, { hata: "emanet_yok" });

    // Özel görüşme: Ayşe Bora ve Cem'i davet eder; yalnız Bora kabul eder; söz yalnız ikisine düşer.
    const gorusme = (oturum: string, govde: Nesne) => yaz(oturum, "/v1/barinma/gorusme", govde);
    assert.deepEqual((await gorusme(bora.oturum, { islem: "davet", hedef: ayse.o })).govde, { hata: "ozel_oda_yok" });
    const dv = await gorusme(ayse.oturum, { islem: "davet", hedef: bora.o });
    assert.equal(dv.durum, 200, JSON.stringify(dv.govde));
    assert.equal((await gorusme(ayse.oturum, { islem: "davet", hedef: cem.o })).durum, 200);
    const bb = (await cagir("GET", "/v1/barinma", { oturum: bora.oturum })).govde.barinma;
    assert.equal(bb.gorusme.davetler.length, 1);
    assert.equal(bb.gorusme.davetler[0].ev.i, ayse.o);
    assert.equal((await gorusme(bora.oturum, { islem: "kabul", hedef: ayse.o })).durum, 200);
    const soz = await gorusme(ayse.oturum, { islem: "soz", sart: "ittifak" });
    assert.equal(soz.durum, 200, JSON.stringify(soz.govde));
    assert.deepEqual(soz.govde.soz.katilim, [ayse.o, bora.o]);
    assert.equal(soz.govde.para, k1.govde.para, "söz akçe etkisizdir");
    const sozler = async (oturum: string) => {
      const hepsi: Nesne[] = [];
      for (let imlec = 0, i = 0; i < 200; i++) {
        const g = (await cagir("GET", `/v1/olaylar?imlec=${imlec}`, { oturum })).govde;
        hepsi.push(...(g.olaylar as Nesne[]));
        if (!g.dahaVar) break;
        imlec = g.imlec;
      }
      return hepsi.filter((o) => o.ozet.k === "olay.oda.gorusme");
    };
    assert.equal((await sozler(ayse.oturum)).length, 1);
    const bs = await sozler(bora.oturum);
    assert.equal(bs.length, 1);
    assert.equal(bs[0]!.ozet.p.katilim, `${ayse.o},${bora.o}`);
    assert.equal((await sozler(cem.oturum)).length, 0, "kabul etmeyen görmez");
    assert.deepEqual((await gorusme(cem.oturum, { islem: "soz", sart: "ittifak", hedef: ayse.o })).govde, { hata: "gorusme_yok" });
    assert.equal((await gorusme(ayse.oturum, { islem: "bitir" })).durum, 200);
    assert.deepEqual((await gorusme(bora.oturum, { islem: "soz", sart: "destek" })).govde, { hata: "gorusme_yok" });
  } finally {
    globalThis.fetch = eskiFetch;
  }
});
