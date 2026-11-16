// YerlesimDO alt istek bütçesi (≤ 12): ay dönümü alarmında kervan + mülk/tezgâh + vergi uzlaştırması aynı anda
// birikmişken her tur bütçe içinde kalır; kalan iş sonraki turlarda sürer, hiçbir kayıt kaybolmaz ya da iki kez
// uygulanmaz.
import test from "node:test";
import assert from "node:assert/strict";
import { ALT_ISTEK_EN_COK, YerlesimDO } from "../src/yerlesim-do.ts";
import type { Env } from "../src/tipler.ts";
import { sahteDepolama } from "./yardimci.ts";

type Nesne = Record<string, any>;

function ad(): DurableObjectNamespace {
  return { idFromName: (n: string) => ({ toString: () => n, equals: () => false }) } as unknown as DurableObjectNamespace;
}

test("alt istek bütçesi: biriken kervan + tezgâh + vergi teslimi her turda ≤ 12; hepsi bir kez teslim edilir", async () => {
  const saat = Date.now();
  const sayac = { tur: 0 };
  const teslimEdilen = new Map<string, number>();
  const vergiAnahtar = new Map<string, number>();
  const yanit = (v: unknown) => new Response(JSON.stringify(v), { headers: { "content-type": "application/json" } });
  const stub = (isle: (ileti: Nesne) => unknown) => ({
    ...ad(),
    get: () => ({ fetch: async (_u: string, init?: RequestInit) => (sayac.tur++, yanit(isle(JSON.parse(String(init?.body))))) }),
  }) as unknown as DurableObjectNamespace;
  const env = {
    YONETIM: stub(() => ({ ok: true, deger: {} })),
    BOLGE: stub((i) => {
      vergiAnahtar.set(i.anahtar, (vergiAnahtar.get(i.anahtar) ?? 0) + 1);
      return { ok: true, deger: {} };
    }),
    ISLETME: stub((i) => {
      if (i.islem === "teslim") {
        for (const x of i.kayitlar) teslimEdilen.set(x.i, (teslimEdilen.get(x.i) ?? 0) + 1);
        // Yanıt bir kayıt da teslim eder: yerleşim onay ile kapatır (2. alt istek).
        return { ok: true, deger: { sonuclar: i.kayitlar.map((x: Nesne) => [x.i, "kabul"]), teslim: [{ i: `geri:${i.isletme}`, t: "ayar", h: "demirhan", a: 0, y: { isletme: i.isletme, ts: -1, as: 1 }, b: 0, d: 0, s: 0 }] } };
      }
      return { ok: true, deger: { teslim: [] } };
    }),
    YERLESIM: stub(() => ({ ok: false, hata: "gecersiz_istek" })),
  } as unknown as Env;
  const depolama = sahteDepolama();
  const yap = () => new YerlesimDO({ id: { toString: () => "y" }, storage: depolama } as unknown as DurableObjectState, env, () => saat);
  await yap().fetch(new Request("https://ic/", { method: "POST", body: JSON.stringify({ islem: "durum", yerlesim: "demirhan", hesapId: "yok" }) }));
  // Biriken iş: 10 işletmeye bekleyen tezgâh kaydı, 6 vergi kaydı, 10 varmış kervan.
  const mk = (depolama.veri.get("mk") as Nesne | undefined) ?? { v: 1, ts: 0, t: {}, cik: { k: [], z: [] }, gir: { g: {} }, mh: [0, []], od: {}, batak: 0 };
  for (let n = 1; n <= 10; n++) mk.cik.k.push({ i: `tz-${n}`, t: "tezgah", h: `demirhan.dukkan.${n}`, a: 1, y: { isletme: `demirhan.dukkan.${n}`, aylar: [[1, 1, 0]] }, b: 0, d: 0, s: 0 });
  mk.vergiGiden = Array.from({ length: 6 }, (_, n) => ({ anahtar: `v-${n}`, tutar: 1, yerlesim: "demirhan" }));
  depolama.veri.set("mk", mk);
  const kv = { c: { k: Array.from({ length: 10 }, (_, n) => ({ i: `kv-${n}`, t: "kervan", h: "develi", a: 0, y: { va: 0, ev: {} }, b: 0, d: 0, s: 0 })), z: [] }, s: {}, g: {}, v: {} };
  depolama.veri.set("kv", kv);
  const turlar: number[] = [];
  for (let i = 0; i < 12 && (teslimEdilen.size < 10 || vergiAnahtar.size < 6); i++) {
    const d = yap();
    sayac.tur = 0;
    await d.alarm();
    turlar.push(sayac.tur);
    assert.equal(d.harcanan, sayac.tur, "sayaç gerçek alt istekle aynı");
    assert.ok(sayac.tur <= ALT_ISTEK_EN_COK, `tur ${i}: ${sayac.tur} alt istek`);
  }
  console.log(`alarm turlarında alt istek: ${turlar.join(", ")} (sınır ${ALT_ISTEK_EN_COK})`);
  assert.equal(teslimEdilen.size, 10, "bütün tezgâh kayıtları teslim edildi");
  assert.ok([...teslimEdilen.values()].every((n) => n === 1), "hiçbiri iki kez teslim edilmedi");
  assert.equal(vergiAnahtar.size, 6);
  assert.ok([...vergiAnahtar.values()].every((n) => n === 1));
  assert.equal((depolama.veri.get("mk") as Nesne).cik.k.length, 0, "çıkış kutusu boşaldı");
  // İstek yolu: aynı birikimle bir istek de bütçede kalır.
  for (let n = 11; n <= 20; n++) mk.cik.k.push({ i: `tz-${n}`, t: "tezgah", h: `demirhan.dukkan.${n % 12 || 1}`, a: 1, y: { isletme: "x", aylar: [[1, 1, 0]] }, b: 0, d: 0, s: 0 });
  depolama.veri.set("mk", mk);
  const d = yap();
  sayac.tur = 0;
  await d.fetch(new Request("https://ic/", { method: "POST", body: JSON.stringify({ islem: "durum", yerlesim: "demirhan", hesapId: "yok" }) }));
  assert.ok(sayac.tur <= ALT_ISTEK_EN_COK, `istek: ${sayac.tur}`);
});
