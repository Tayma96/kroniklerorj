// H10 han ilan panosu (saf): girdi ve filtre, tavan, ömür, yalnız sahibi siler, görünüm.
import test from "node:test";
import assert from "node:assert/strict";
import { MASKE } from "../src/han/filtre.ts";
import { ilanEkle, ilanSil, panoGirdisiCoz, panoGorunumu, PANO_EN_COK, PANO_METIN_EN_UZUN, PANO_OMUR_MS, type PanoKaydi } from "../src/han/pano.ts";

const T = 1_800_000_000_000;

test("H10 girdi: tür listeden, metin tek satır ve sınırlı, küfür maskelenir", () => {
  const r = panoGirdisiCoz({ metin: "Ozan aranır\\nyavşak olmasın", tur: "ozan", istekNo: "pano-0000001" });
  assert.ok(r.ok);
  const g = panoGirdisiCoz({ metin: "Ozan aranır, kahpe olmasın", tur: "ozan", istekNo: "pano-0000001" });
  assert.deepEqual(g.ok && g.deger.metin, `Ozan aranır, ${MASKE} olmasın`);
  const hata = (x: unknown) => {
    const s = panoGirdisiCoz(x);
    return s.ok ? "" : s.hata;
  };
  assert.equal(hata({ metin: "x", tur: "reklam", istekNo: "pano-0000001" }), "gecersiz_istek");
  assert.equal(hata({ metin: "   ", tur: "is", istekNo: "pano-0000001" }), "metin_gecersiz");
  assert.equal(hata({ metin: "a".repeat(PANO_METIN_EN_UZUN + 1), tur: "is", istekNo: "pano-0000001" }), "metin_gecersiz");
});

test("H10 pano: en çok N ilan, ömür dolunca düşer, yalnız sahibi siler, görünüm yeniden eskiye", () => {
  const p: PanoKaydi = { n: 0, l: [] };
  for (let i = 0; i < PANO_EN_COK + 2; i++) ilanEkle(p, { o: "o1", ad: "Ali", t: "is", m: `ilan ${i}` }, T + i);
  assert.equal(p.l.length, PANO_EN_COK);
  assert.equal(p.l[0]!.m, "ilan 2", "en eskiler düşer");
  const g = panoGorunumu(p, "o1", T + 100);
  assert.equal(g[0]!.metin, `ilan ${PANO_EN_COK + 1}`);
  assert.deepEqual([g[0]!.benim, g[0]!.kisi, g[0]!.bitis], [true, { id: "o1", ad: "Ali" }, T + PANO_EN_COK + 1 + PANO_OMUR_MS]);
  assert.equal(panoGorunumu(p, "o2", T + 100)[0]!.benim, false);
  assert.equal(panoGorunumu(p, "o1", T + PANO_OMUR_MS + 10).length, PANO_EN_COK + 2 - 11, "süresi dolan görünmez");
  const id = g[0]!.id;
  const baskasi = ilanSil(p, "o2", id);
  assert.equal(baskasi.ok ? "" : baskasi.hata, "yetki_yok");
  assert.ok(ilanSil(p, "o1", id).ok);
  const yok = ilanSil(p, "o1", id);
  assert.equal(yok.ok ? "" : yok.hata, "ilan_yok");
  ilanEkle(p, { o: "o3", ad: "Can", t: "etkinlik", m: "yeni" }, T + PANO_OMUR_MS + 50);
  assert.ok(p.l.every((x) => T + PANO_OMUR_MS + 50 - x.z < PANO_OMUR_MS), "yazarken eskiler budanır");
});
