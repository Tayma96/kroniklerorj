// Faz 7e: devir akışı motorda (önizle → devir, pk, istekNo), süre dolunca varsayılan vâris, kalıcı kronik,
// yeniden yükleme ve HTTP uçları.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, YerlesimDO } from "../src/index.ts";
import { bellekDepo, type BellekDepo } from "../src/depo.ts";
import { AY_MS, DUNYA_BASLANGICI_MS } from "../src/saat.ts";
import type { Env, Sonuc } from "../src/tipler.ts";
import { DEVIR_SURE_AY } from "../src/yerlesim/hanedan.ts";
import { KRONIK_SAYFA } from "../src/yerlesim/kronik.ts";
import { TUTULAN_SAYFA, YerlesimMotoru } from "../src/yerlesim/motor.ts";
import { cocukEkle, npcIleEvlendir } from "./hanedan-yardimci.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

const an = (ay: number) => DUNYA_BASLANGICI_MS + ay * AY_MS + 60_000;
type Nesne = Record<string, any>;
const deger = <T = Nesne>(s: Sonuc<unknown>): T => {
  assert.ok(s.ok, JSON.stringify(s));
  return s.deger as T;
};

/** hesap-1: 70 yaşında, evli, iki çocuklu, 2. ayda ölecek; hesap-2: genç komşu (ölüye düşman). */
async function kur(): Promise<{ depo: BellekDepo; m: YerlesimMotoru }> {
  const depo = bellekDepo();
  const m = (await YerlesimMotoru.ac(depo, "develi", an(0)))!;
  await m.sakinEkle({ hesapId: "hesap-1", ad: "Dede", cinsiyet: "erkek", dogumAyi: -70 * 12 });
  await m.sakinEkle({ hesapId: "hesap-2", ad: "Komşu", cinsiyet: "kadın", dogumAyi: -30 * 12 });
  const k = m.kasaba;
  const kar = k.kar.get("o1")!;
  npcIleEvlendir(k, kar);
  cocukEkle(k, kar, 30, 1);
  cocukEkle(k, kar, 22, 2);
  kar.pa = 200;
  kar.hd!.oa = 2;
  k.kar.get("o2")!.tn.o1 = "dusman";
  await m.kaydet();
  await m.yetistir(an(2));
  return { depo, m };
}

test("önizle → devir: aynı pk 200, eski pk 409; aynı istekNo tek devir; başka hesap devredemez", async () => {
  const { depo, m } = await kur();
  const d = deger(await m.durum("hesap-1", an(2), "tr"));
  assert.equal(d.ben.hanedan.olu, true);
  assert.ok(d.donusKarti.some((o: Nesne) => o.ozet.k === "olay.oyuncuOldu"));
  assert.deepEqual(await m.eylem("hesap-1", { tur: "sohbet", hedef: "n1", istekNo: "olu-eylem-01" }), { ok: false, hata: "olu" });
  assert.deepEqual(await m.temelIs("hesap-1", { is: "odun", istekNo: "olu-temel-01" }), { ok: false, hata: "olu" });
  const h = deger(await m.hanedan("hesap-1", "tr"));
  assert.equal(h.tereke.kalanAy, DEVIR_SURE_AY);
  assert.equal(h.adaylar[0].yas, 30);

  const o = deger(await m.devirOnizle("hesap-1", null, "tr"));
  assert.equal(o.varsayim, false);
  assert.equal(o.plan.varis.id, h.varsayilanVaris);
  // Koşul değişir (ölüye ikinci düşman işareti): eski pk 409.
  m.kasaba.kar.get("o2")!.tn.o1 = "tanidik";
  assert.deepEqual(await m.devir("hesap-1", { pk: o.pk, istekNo: "devir-0001" }), { ok: false, hata: "devir_degisti" });
  m.kasaba.kar.get("o2")!.tn.o1 = "dusman";
  assert.deepEqual(await m.devir("hesap-2", { pk: o.pk, istekNo: "devir-0002" }), { ok: false, hata: "devir_yok" }, "canlı hesap devredemez");
  const govde = { pk: o.pk, istekNo: "devir-0003" };
  const r1 = deger(await m.devir("hesap-1", govde));
  const r2 = deger(await m.devir("hesap-1", govde));
  assert.deepEqual(r2, r1);
  assert.deepEqual(r1.plan, o.plan, "önizleme planı = uygulanan plan");
  assert.equal(r1.hanedan.nesil, 2);
  const pay = o.plan.kalemler.find((x: Nesne) => x.tur === "pay" && x.kime === o.plan.varis.id).akce;
  const d2 = deger(await m.durum("hesap-1", an(2), "tr"));
  assert.equal(d2.ben.id, r1.id);
  assert.equal(d2.ben.para, pay, "önizlemedeki sayı profilde aynen");
  assert.equal(m.kasaba.kar.get("o2")!.tn[r1.id], "dusman", "husumet vârise geçti");
  const kr = deger(await m.kronik("hesap-2", "", "tr"));
  assert.deepEqual(kr.kronik.map((x: Nesne) => x.tur), ["evlilik", "olum", "devir"]);
  assert.equal(kr.kronik.at(-1).ozet.p.varis.id, r1.id);

  // Yeniden yükleme: hanedan defteri, kronik ve oyuncu sayacı kalıcıdır.
  const m2 = (await YerlesimMotoru.ac(depo, "develi", an(2)))!;
  assert.deepEqual(m2.kasaba.hd, m.kasaba.hd);
  assert.equal(deger(await m2.kronik("hesap-2", "0", "tr")).kronik.length, 3);
  assert.equal(deger(await m2.durum("hesap-1", an(2), "tr")).ben.id, r1.id);
  const yeni = deger(await m2.sakinEkle({ hesapId: "hesap-9", ad: "Yeni", cinsiyet: "erkek", dogumAyi: 2 - 144 }));
  assert.ok(![...m2.kasaba.kar.keys()].filter((x) => x !== yeni.id).includes(yeni.id));
  assert.notEqual(yeni.id, r1.id);
  assert.notEqual(yeni.id, "o1");
});

test("süre dolunca varsayılan vâris seçilir (yokluk cezası yok)", async () => {
  const { m } = await kur();
  await m.yetistir(an(2 + DEVIR_SURE_AY));
  const d = deger(await m.durum("hesap-1", an(2 + DEVIR_SURE_AY), "tr"));
  assert.equal(d.ben.hanedan.olu, false);
  assert.equal(d.ben.hanedan.nesil, 2);
  assert.equal(d.ben.yas, 30 + Math.floor((2 + DEVIR_SURE_AY) / 12));
  assert.ok(d.donusKarti.some((o: Nesne) => o.ozet.k === "olay.devir"));
  assert.deepEqual(m.kasaba.hd!.tr, []);
});

test("vasiyet ucu: istekNo ile yazılır, geçersiz alıcı reddedilir", async () => {
  const depo = bellekDepo();
  const m = (await YerlesimMotoru.ac(depo, "develi", an(0)))!;
  await m.sakinEkle({ hesapId: "hesap-1", ad: "Ana", cinsiyet: "kadın", dogumAyi: -40 * 12 });
  const kar = m.kasaba.kar.get("o1")!;
  npcIleEvlendir(m.kasaba, kar);
  const c = cocukEkle(m.kasaba, kar, 15, 1);
  assert.deepEqual(await m.vasiyet("hesap-1", { vasiyet: { paylar: [{ kime: "n999999", oran: 100 }] }, istekNo: "vas-0001" }), { ok: false, hata: "vasiyet_gecersiz" });
  const v = { varis: `n${c.i}`, paylar: [{ kime: `n${c.i}`, oran: 90 }, { kime: "vakif", oran: 10 }] };
  assert.deepEqual(deger(await m.vasiyet("hesap-1", { vasiyet: v, istekNo: "vas-0002" })).vasiyet, v);
  const o = deger(await m.devirOnizle("hesap-1", null, "tr"));
  assert.equal(o.varsayim, true, "canlıyken önizleme varsayımdır");
  assert.equal(o.plan.varis.id, `n${c.i}`);
});

test("kronik budanmaz: 49. sayfadan sonra da okunur (olay defteri 48 sayfa tutar)", async () => {
  const depo = bellekDepo();
  const m = (await YerlesimMotoru.ac(depo, "develi", an(0)))!;
  await m.sakinEkle({ hesapId: "hesap-1", ad: "Okur", cinsiyet: "kadın", dogumAyi: -144 });
  const n = (TUTULAN_SAYFA + 2) * KRONIK_SAYFA + 5;
  m.kasaba.kq = Array.from({ length: n }, (_, i) => ({ a: 0, t: "dogum" as const, k: "kronik.dogum", p: { no: i + 1 } }));
  await m.kaydet();
  const m2 = (await YerlesimMotoru.ac(depo, "develi", an(0)))!;
  const ilk = deger(await m2.kronik("hesap-1", "0", "tr"));
  assert.equal(ilk.kronik[0].sira, 1);
  assert.equal(ilk.dahaVar, true);
  const imlec = String(49 * KRONIK_SAYFA);
  const r = deger(await m2.kronik("hesap-1", imlec, "tr"));
  assert.equal(r.kronik[0].sira, 49 * KRONIK_SAYFA + 1);
  assert.equal(r.kronik[0].ozet.p.no, 49 * KRONIK_SAYFA + 1);
  const son = deger(await m2.kronik("hesap-1", String(n - 3), "tr"));
  assert.equal(son.kronik.length, 3);
  assert.equal(son.dahaVar, false);
  assert.equal((await m2.kronik("hesap-1", "x", "tr")).ok, false);
});

test("HTTP: hanedan, vasiyet, devir önizleme, evlilik ve kronik uçları yönlendirilir", async () => {
  const anahtar = await rsaAnahtari("kid-1");
  const jwks = sahteJwks([anahtar]);
  const eskiFetch = globalThis.fetch;
  globalThis.fetch = jwks.getir;
  try {
    const saat = Date.now();
    const env = { GOOGLE_CLIENT_ID: ISTEMCI, OTURUM_ANAHTARI: "o".repeat(48) } as Env;
    env.HESAP = sahteAdAlani((ctx) => new HesapDO(ctx, env));
    env.DUNYA = sahteAdAlani((ctx) => new DunyaDO(ctx, env));
    env.YERLESIM = sahteAdAlani((ctx) => new YerlesimDO(ctx, env, () => saat));
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
    const h = await cagir("GET", "/v1/hanedan?dil=tr", { oturum });
    assert.equal(h.durum, 200);
    assert.equal(h.govde.nesil, 1);
    assert.equal(h.govde.kurallar.vergiOrani, 10);
    const d = await cagir("GET", "/v1/yerlesim", { oturum });
    assert.deepEqual(d.govde.ben.hanedan, { id: h.govde.id, nesil: 1, olu: false, sonGunler: false });
    const v = await cagir("POST", "/v1/vasiyet", { oturum, govde: { vasiyet: { paylar: [{ kime: "vakif", oran: 100 }] }, istekNo: "vasiyet-0001" } });
    assert.equal(v.durum, 200);
    assert.deepEqual(v.govde.vasiyet, { paylar: [{ kime: "vakif", oran: 100 }] });
    const o = await cagir("GET", "/v1/devir/onizle", { oturum });
    assert.equal(o.durum, 200);
    assert.equal(o.govde.varsayim, true);
    const dv = await cagir("POST", "/v1/devir", { oturum, govde: { pk: o.govde.pk, istekNo: "devir-0001" } });
    assert.deepEqual([dv.durum, dv.govde], [409, { hata: "devir_yok" }]);
    const e = await cagir("POST", "/v1/evlilik", { oturum, govde: { hedef: "n1", istekNo: "evlilik-0001" } });
    assert.deepEqual([e.durum, e.govde], [403, { hata: "yas_kapisi" }]);
    const kr = await cagir("GET", "/v1/kronik?imlec=0", { oturum });
    assert.equal(kr.durum, 200);
    assert.deepEqual(kr.govde.kronik, []);
    assert.equal((await cagir("POST", "/v1/hanedan", { oturum })).durum, 405);
  } finally {
    globalThis.fetch = eskiFetch;
  }
});
