import test from "node:test";
import assert from "node:assert/strict";
import { ETKILER } from "../src/icerik/agaclar/index.ts";
import { MALLAR } from "../src/icerik/mallar.ts";
import { HIZMET_TARIFLERI, hizmetTarifiBul } from "../src/yerlesim/hizmet-tarif.ts";
import { hizmetHazirla, hizmetStoguGecerli } from "../src/yerlesim/hizmet-pazari.ts";
import type { Karakter } from "../src/yerlesim/tipler.ts";
import type { EkonomiKaydi } from "../src/yerlesim/pazar-tahta.ts";

test("E4.3 hizmet kataloğu: kimlikler tekil, girdiler mal dizininde ve beceri kapıları gerçek", () => {
  assert.equal(new Set(HIZMET_TARIFLERI.map((x) => x.id)).size, HIZMET_TARIFLERI.length);
  for (const h of HIZMET_TARIFLERI) {
    assert.equal(hizmetTarifiBul(h.id), h);
    for (const mal of Object.keys(h.girdi)) assert.ok(Object.hasOwn(MALLAR, mal), `${h.id}: ${mal}`);
    assert.ok(h.seviye >= 1 && h.seviye <= 3, h.id);
    assert.ok(h.takat > 0 && h.hazir.adet > 0 && h.hazir.gecerlilikAy > 0, h.id);
    assert.ok(ETKILER.some((x) => x.dugum === h.dugum && x.seviye === h.seviye && x.etki.tur === "hizmet" && x.etki.hizmet === h.id), h.id);
  }
  assert.equal(hizmetTarifiBul("olmayan"), undefined);
  assert.equal(hizmetTarifiBul({ id: "yaraBak" }), undefined);
});


function sifaciKarakter(seviye = 2, sifaliOt = 3, takat = 6): Karakter {
  return {
    o: "o1",
    h: "hesap-1",
    ad: "Şifacı",
    e: 1,
    d: 0,
    ev: { sifaliOt },
    tk: takat,
    ta: 12,
    ms: { a: "sifaci", y: "", s: { sifaci: { a: "sifaci", kd: 0, hz: 0, cy: 0, sv: { "sifaci.sargiMerhem": seviye } } } },
  } as unknown as Karakter;
}

function ekonomi(): EkonomiKaydi {
  return { n: 1, il: [], is: [], lv: [], hs: [] };
}

test("E4.3-A hizmet hazırlama: beceri, girdi ve takat birlikte doğrulanır; stok süreli yazılır", () => {
  const kar = sifaciKarakter();
  const ek = ekonomi();
  const r = hizmetHazirla(ek, kar, "yaraBak", 2, 12);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(r.deger.harcanan, { girdiler: { sifaliOt: 2 }, takat: 2 });
  assert.equal(kar.ev?.sifaliOt, 1);
  assert.equal(kar.tk, 4);
  assert.equal(r.deger.stok.n, 2);
  assert.equal(r.deger.stok.sa, 14);
  assert.equal(ek.hs?.length, 1);
  assert.equal(hizmetStoguGecerli(r.deger.stok, 14), true);
  assert.equal(hizmetStoguGecerli(r.deger.stok, 15), false);
});

test("E4.3-A hizmet hazırlama: beceri kilidi, eksik girdi ve takat hatasında mal/stoğa dokunulmaz", () => {
  const kilitli = sifaciKarakter(1, 3, 6);
  const kilitliEk = ekonomi();
  const kilit = hizmetHazirla(kilitliEk, kilitli, "yaraBak", 1, 12);
  assert.equal(kilit.ok, false);
  if (!kilit.ok) assert.equal(kilit.hata, "dugum_kapali");
  assert.equal(kilitli.ev?.sifaliOt, 3);
  assert.equal(kilitliEk.hs?.length, 0);

  const girdisiz = sifaciKarakter(2, 0, 6);
  const girdisizEk = ekonomi();
  const girdi = hizmetHazirla(girdisizEk, girdisiz, "yaraBak", 1, 12);
  assert.equal(girdi.ok, false);
  if (!girdi.ok) assert.equal(girdi.hata, "girdi_yok");
  assert.equal(girdisiz.tk, 6);
  assert.equal(girdisizEk.hs?.length, 0);

  const takatsiz = sifaciKarakter(2, 3, 0);
  const takatsizEk = ekonomi();
  const takat = hizmetHazirla(takatsizEk, takatsiz, "yaraBak", 1, 12);
  assert.equal(takat.ok, false);
  if (!takat.ok) assert.equal(takat.hata, "takat_yok");
  assert.equal(takatsiz.ev?.sifaliOt, 3);
  assert.equal(takatsizEk.hs?.length, 0);
});


test("E4.3-A hizmet stoğu oyuncu/hizmet başına 20 adette durur; kota hatası harcama yapmaz", () => {
  const kar = sifaciKarakter(2, 25, 30);
  const ek = ekonomi();
  for (let i = 0; i < 4; i++) {
    const r = hizmetHazirla(ek, kar, "yaraBak", 5, 12);
    assert.equal(r.ok, true);
  }
  const onceEnvanter = kar.ev?.sifaliOt;
  const onceTakat = kar.tk;
  const fazla = hizmetHazirla(ek, kar, "yaraBak", 1, 12);
  assert.equal(fazla.ok, false);
  if (!fazla.ok) assert.equal(fazla.hata, "kota_doldu");
  assert.equal(kar.ev?.sifaliOt, onceEnvanter);
  assert.equal(kar.tk, onceTakat);
  assert.equal(ek.hs?.reduce((n, x) => n + x.n, 0), 20);
});
