// P5 darbe ganimet tavanı: saf hesabın değişmezleri.
import test from "node:test";
import assert from "node:assert/strict";
import {
  darbeTaraflari, ganimetHesapla, ganimetIzleri,
  GANIMET_AKCE_YUZDE, GANIMET_MULK_EN_COK, GANIMET_PENCERE_AY,
  type GanimetGirdisi,
} from "../src/siyaset/ganimet.ts";
import type { DarbePlani } from "../src/siyaset/tipler.ts";

function girdi(): GanimetGirdisi {
  return {
    darbeId: "konya:darbe:10:1",
    ay: 10,
    kaybedenler: [
      { kisi: "k1", hesap: "h1", akce: 1003, mulkler: [
        { id: "ev1", deger: 50, barinak: true },
        { id: "dukkan1", deger: 300 },
        { id: "atolye1", deger: 200 },
      ] },
      { kisi: "k2", hesap: "h2", akce: 400, mulkler: [{ id: "ocak2", deger: 10, aileEvi: true }] },
    ],
    kazananlar: [
      { kisi: "z1", hesap: "hz1", mulkYeri: 1 },
      { kisi: "z2", hesap: "hz2", mulkYeri: 2 },
      { kisi: "z3", hesap: "hz3", mulkYeri: 0 },
    ],
  };
}

test("ganimet: akçe tavanı yüzde ile, mülk tavanı tek", () => {
  assert.equal(GANIMET_AKCE_YUZDE, 25);
  assert.equal(GANIMET_MULK_EN_COK, 1);
  const d = ganimetHesapla(girdi());
  const k1 = d.kayip.find((x) => x.kisi === "k1")!;
  assert.equal(k1.neden, "uygulandi");
  assert.equal(k1.akceKaybi, 250); // floor(1003 * 25 / 100)
  assert.ok(k1.akceKaybi <= Math.floor((k1.akceOnce * GANIMET_AKCE_YUZDE) / 100));
  for (const x of d.kayip) assert.ok((x.mulk ? 1 : 0) <= GANIMET_MULK_EN_COK);
  // En düşük değerli uygun mülk alınır; en çok yeri olan kazanana gider.
  assert.deepEqual(k1.mulk, { id: "atolye1", alan: "z2" });
});

test("ganimet: barınak ve aile evi asla alınmaz", () => {
  const d = ganimetHesapla(girdi());
  const k1 = d.kayip.find((x) => x.kisi === "k1")!;
  const k2 = d.kayip.find((x) => x.kisi === "k2")!;
  assert.deepEqual(k1.korunan, ["ev1"]);
  assert.notEqual(k1.mulk?.id, "ev1");
  assert.deepEqual(k2.korunan, ["ocak2"]);
  assert.equal(k2.mulk, null);
  assert.equal(k2.akceKaybi, 100);
});

test("ganimet: dağıtılan akçe kaybedilene tam eşit (yoktan akçe doğmaz)", () => {
  for (const kazananSayisi of [1, 2, 3]) {
    const g = girdi();
    g.kazananlar = g.kazananlar.slice(0, kazananSayisi);
    const d = ganimetHesapla(g);
    assert.equal(d.toplamKayip, d.kayip.reduce((t, x) => t + x.akceKaybi, 0));
    assert.equal(d.toplamPay, d.toplamKayip);
    const once = g.kaybedenler.reduce((t, x) => t + x.akce, 0);
    const sonra = d.kayip.reduce((t, x) => t + (x.akceOnce - x.akceKaybi), 0) + d.pay.reduce((t, x) => t + x.akce, 0);
    assert.equal(sonra, once);
    // Alınan her mülk tam bir kazananın payında görünür.
    const alinan = d.kayip.flatMap((x) => (x.mulk ? [x.mulk.id] : [])).sort();
    assert.deepEqual(d.pay.flatMap((x) => x.mulkler).sort(), alinan);
  }
});

test("ganimet: kazanan yoksa hiçbir şey kesilmez; kazananın yeri yoksa mülk alınmaz", () => {
  const g = girdi();
  g.kazananlar = [];
  const d = ganimetHesapla(g);
  assert.ok(d.kayip.every((x) => x.neden === "kazananYok" && x.akceKaybi === 0 && x.mulk === null));
  assert.equal(d.toplamPay, 0);
  const g2 = girdi();
  g2.kazananlar = [{ kisi: "z3", hesap: "hz3", mulkYeri: 0 }];
  const d2 = ganimetHesapla(g2);
  assert.ok(d2.kayip.every((x) => x.mulk === null));
  assert.equal(d2.toplamPay, d2.toplamKayip);
});

test("ganimet: tekrar oynatma ve pencere ikinci kez kesmez", () => {
  const g = girdi();
  const ilk = ganimetHesapla(g);
  const iz = ganimetIzleri(ilk);
  assert.deepEqual(Object.keys(iz).sort(), ["k1", "k2"]);
  // Aynı darbe yeniden işlenirse (tekrar) hiçbir kesinti yok.
  const tekrar = ganimetHesapla({ ...g, kaybedenler: g.kaybedenler.map((k) => ({ ...k, oncekiKayip: iz[k.kisi] })) });
  assert.ok(tekrar.kayip.every((x) => x.neden === "tekrar" && x.akceKaybi === 0 && x.mulk === null));
  assert.equal(tekrar.toplamPay, 0);
  // Pencere içinde başka bir darbe de kesemez; pencere bitince yeniden mümkün.
  const ikinci = { ...g, darbeId: "konya:darbe:12:2", ay: 10 + GANIMET_PENCERE_AY - 1, kaybedenler: g.kaybedenler.map((k) => ({ ...k, oncekiKayip: iz[k.kisi] })) };
  assert.ok(ganimetHesapla(ikinci).kayip.every((x) => x.neden === "pencere" && x.akceKaybi === 0));
  const sonra = ganimetHesapla({ ...ikinci, ay: 10 + GANIMET_PENCERE_AY });
  assert.ok(sonra.kayip.every((x) => x.neden === "uygulandi"));
  // İstek kimlikleri deterministik ve kişiye özgü.
  assert.deepEqual(ilk.kayip.map((x) => x.istekNo), ganimetHesapla(g).kayip.map((x) => x.istekNo));
  assert.equal(new Set(ilk.kayip.map((x) => x.istekNo)).size, ilk.kayip.length);
});

test("ganimet: aynı oyuncu iki kez sayılmaz, iki tarafta aynı hesap kesilmez, negatif akçe sıfırlanır", () => {
  const g = girdi();
  g.kaybedenler.push({ ...g.kaybedenler[0]! });
  g.kaybedenler.push({ kisi: "k9", hesap: "hz1", akce: 999, mulkler: [] });
  g.kaybedenler.push({ kisi: "k8", hesap: "h8", akce: -50, mulkler: [] });
  const d = ganimetHesapla(g);
  assert.equal(d.kayip.filter((x) => x.kisi === "k1").length, 1);
  assert.equal(d.kayip.some((x) => x.kisi === "k9"), false);
  assert.equal(d.kayip.find((x) => x.kisi === "k8")!.akceKaybi, 0);
});

test("darbe tarafları: yalnız açık taraf tutanlar; pat/ateşkeste kimse kaybetmez", () => {
  const p = {
    v: 1, id: "d", durum: "basarili", baslatanKisi: "b", baslatanHesap: "hb", acilisAy: 0, sogumaSonAy: 0,
    destekler: [{ kisi: "s1", hesap: "hs1", ad: "S", koltuk: "x", rol: "sehirBeyi", kume: [], ay: 0 }],
    savunma: [{ kisi: "v1", hesap: "hv1", ad: "V", koltuk: "y", rol: "ahiBasi", kume: [], ay: 1 }],
    garnizonSadakati: 60, yatirilan: 0, izler: [],
  } as DarbePlani;
  assert.deepEqual(darbeTaraflari(p).kaybeden.map((x) => x.kisi), ["v1"]);
  assert.deepEqual(darbeTaraflari(p).kazanan.map((x) => x.kisi), ["b", "s1"]);
  assert.deepEqual(darbeTaraflari({ ...p, durum: "bastirildi" }).kaybeden.map((x) => x.kisi), ["b", "s1"]);
  for (const durum of ["pat", "ateskes", "mogol", "iptal"] as const) {
    const t = darbeTaraflari({ ...p, durum });
    assert.equal(t.kaybeden.length + t.kazanan.length, 0);
  }
});
