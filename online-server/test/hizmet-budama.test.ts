// Hizmet pazarı kayıt budaması: bitmiş kayıtlar silinir, açık ve güncel kayıtlara dokunulmaz.
import test from "node:test";
import assert from "node:assert/strict";
import { hizmetKayitBuda, HIZMET_KAPALI_ILAN_SAKLAMA_AY } from "../src/yerlesim/hizmet-pazari.ts";
import type { EkonomiKaydi } from "../src/yerlesim/pazar-tahta.ts";

function kayit(ek: Record<string, unknown>): EkonomiKaydi {
  return ek as unknown as EkonomiKaydi;
}

test("süresi dolmuş stok silinir; geçerli stok ve bu ayın kaydı kalır", () => {
  const ek = kayit({
    n: 9,
    hs: [
      { i: 1, o: "a", oa: "A", h: "yaraBak", n: 0, n0: 3, ac: 2, sa: 4 },
      { i: 2, o: "a", oa: "A", h: "yaraBak", n: 2, n0: 2, ac: 9, sa: 12 },
      { i: 3, o: "a", oa: "A", h: "yaraBak", n: 1, n0: 1, ac: 10, sa: 10 },
    ],
  });
  hizmetKayitBuda(ek, 10);
  assert.deepEqual(ek.hs?.map((x) => x.i), [2, 3]);
});

test("açık ilan budanmaz; kapalı ilan saklama süresi dolunca silinir", () => {
  const ay = 20;
  const sinir = ay - HIZMET_KAPALI_ILAN_SAKLAMA_AY;
  const ilan = (i: number, d: string, sa: number) => ({ i, o: "a", oa: "A", h: "yaraBak", s: 1, n: 0, n0: 1, f: 3, ac: 1, sa, d });
  const ek = kayit({
    n: 9,
    hi: [
      ilan(1, "acik", 21),
      ilan(2, "bitti", sinir - 1),
      ilan(3, "geri", sinir),
      ilan(4, "dustu", ay),
    ],
  });
  hizmetKayitBuda(ek, ay);
  assert.deepEqual(ek.hi?.map((x) => x.i), [1, 3, 4]);
});

test("kayıt dizisi olmayan ekonomi kaydında hata vermez ve alan oluşturmaz", () => {
  const ek = kayit({ n: 1 });
  hizmetKayitBuda(ek, 5);
  assert.equal(ek.hs, undefined);
  assert.equal(ek.hi, undefined);
});
