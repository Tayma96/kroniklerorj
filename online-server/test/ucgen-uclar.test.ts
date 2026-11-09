// Üçgen uçları (motor + HTTP yolu): istekNo ile idempotent kışkırtma, kalıcılık (depo "ug"), GET önizleme §13.9
// görünürlüğüyle, kişi kartında eksenler, ay dönümünde casus raporu Dönüş olayına düşer.
import test from "node:test";
import assert from "node:assert/strict";
import { bellekDepo } from "../src/depo.ts";
import { HUYLAR } from "../src/icerik/kisilik.ts";
import isleyici from "../src/index.ts";
import { AY_MS, DUNYA_BASLANGICI_MS } from "../src/saat.ts";
import type { Env } from "../src/tipler.ts";
import { YerlesimMotoru } from "../src/yerlesim/motor.ts";
import { gorusAyarla } from "./ucgen-yardimci.ts";

const an = (ay: number) => DUNYA_BASLANGICI_MS + ay * AY_MS + 60_000;
type Nesne = Record<string, any>;

test("POST/GET /v1/ucgen motor: idempotent, kalıcı, önizleme görünürlüğü, eksenler, casus raporu", async () => {
  const depo = bellekDepo();
  const m = (await YerlesimMotoru.ac(depo, "develi", an(0)))!;
  for (const i of [1, 2]) assert.ok((await m.sakinEkle({ hesapId: `hesap-${i}`, ad: `Oyuncu${i}`, cinsiyet: "erkek", dogumAyi: -240 })).ok);
  const k = m.kasaba;
  const ahmet = k.kar.get("o1")!;
  const berkay = k.kar.get("o2")!;
  const murat = k.npc.find((n) => n.e !== ahmet.e && n.e !== berkay.e && Math.floor((k.ay - n.d) / 12) >= 25)!;
  murat.h = HUYLAR.indexOf("kurnaz");
  gorusAyarla(k, murat, berkay, -42);
  await m.kaydet();
  const govde = { tur: "kiskirt", npc: `n${murat.i}`, hedef: "o2", teklif: { t: "soz" }, istekNo: "ucgen-0001" };
  const r1 = await m.ucgen("hesap-1", govde);
  assert.ok(r1.ok, JSON.stringify(r1));
  const y1 = r1.deger as Nesne;
  assert.ok(["basari", "ret", "retHaber"].includes(y1.sonuc));
  assert.equal(y1.sans.kalemler.reduce((a: number, x: Nesne) => a + x.d, 0), y1.sans.toplam);
  assert.equal(typeof y1.takat, "number");
  const r2 = await m.ucgen("hesap-1", govde);
  assert.deepEqual(r2, r1, "aynı istekNo aynı yanıt");
  assert.deepEqual(await m.ucgen("hesap-1", { ...govde, istekNo: "ucgen-0002" }), { ok: false, hata: "aralik_dolu" });
  assert.deepEqual(await m.ucgen("hesap-1", { tur: "yok", istekNo: "ucgen-0003" }), { ok: false, hata: "ucgen_gecersiz" });
  assert.deepEqual(await m.ucgen("hesap-1", { ...govde, istekNo: undefined }), { ok: false, hata: "istekno_gecersiz" });

  // Kalıcılık: yeniden açılan motorda iz ve (başarıdaysa) söz durur.
  const m2 = (await YerlesimMotoru.ac(depo, "develi", an(0)))!;
  assert.equal(m2.kasaba.ug?.iz.length, 1);
  if (y1.sonuc === "basari") assert.equal(m2.kasaba.ug?.sz.length, 1);

  // GET önizleme: Murat Ahmet'e yakın değil → Berkay'a bakışı kaba aralıkla; kesin kızgınlık kalemi gizli.
  const g = await m2.ucgenOku("hesap-1", `n${murat.i}`, "o2", "tr");
  assert.ok(g.ok);
  const o = (g.deger as Nesne).onizleme;
  assert.equal(o.gorunur, y1.sonuc === "basari", "sözlü NPC'nin bakışı görünür");
  if (!o.gorunur) {
    assert.equal(o.kiskirt.kaba, "kizgin");
    assert.ok(o.kiskirt.teklifler.soz.bilinen.every((x: Nesne) => x.k !== "sans.kizginlik"));
  }
  assert.ok((g.deger as Nesne).parametreler.kiskirt.farkOrani > 0, "gizli sayı yok: parametreler döner");

  // Kişi kartı eksenleri.
  const kisi = await m2.kisi("hesap-2", `n${murat.i}`, "tr");
  assert.ok(kisi.ok);
  assert.ok(typeof (kisi.deger as Nesne).sanaBakisEksen === "object");

  // Casus: Ahmet 3 akçe ile Berkay'ı izletir; ay dönümünde rapor ya da "boş" olayı yalnız Ahmet'e düşer.
  const k2 = m2.kasaba;
  k2.kar.get("o1")!.pa = 10;
  const casusNpc = k2.npc.find((n) => n !== murat && Math.floor((k2.ay - n.d) / 12) >= 20 && n.e !== k2.kar.get("o2")!.e)!;
  casusNpc.h = HUYLAR.indexOf("kurnaz");
  gorusAyarla(k2, casusNpc, k2.kar.get("o1")!, 10);
  const c = await m2.ucgen("hesap-1", { tur: "casus", npc: `n${casusNpc.i}`, izlenen: "o2", ay: 1, istekNo: "ucgen-0004" });
  assert.ok(c.ok, JSON.stringify(c));
  await m2.yetistir(an(1));
  const anahtarlar = async (h: string) => {
    const r = await m2.olaylar(h, "0", "tr");
    assert.ok(r.ok);
    return ((r.deger as Nesne).olaylar as Nesne[]).map((x) => x.ozet.k as string);
  };
  const a1 = await anahtarlar("hesap-1");
  assert.ok(a1.some((x) => /olay\.ucgen\.casus(Rapor|Bos|Bitti)/.test(x)), a1.join(","));
  assert.ok(!(await anahtarlar("hesap-2")).some((x) => x.startsWith("olay.ucgen.casusRapor")), "izlenen raporu görmez");
});

test("HTTP: /v1/ucgen yolu tanımlı (oturumsuz 401, yanlış yöntem 405)", async () => {
  const env = { GOOGLE_CLIENT_ID: "x", OTURUM_ANAHTARI: "o".repeat(48) } as Env;
  const istek = (method: string) => isleyici.fetch(new Request("https://kronikler-online.test/v1/ucgen", { method }), env);
  assert.equal((await istek("GET")).status, 401);
  assert.equal((await istek("POST")).status, 401);
  assert.equal((await istek("PUT")).status, 405);
});
