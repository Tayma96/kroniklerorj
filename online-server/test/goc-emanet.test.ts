// Göç emaneti (saf): çekiş sırası ve sınırı, birden çok arşiv, izli partiler, iptalde aynen geri yazım, paket denetimi.
import test from "node:test";
import assert from "node:assert/strict";
import { emanetCikar, emanetDokumu, emanetEkle, emanetGeriYaz, emanetIslemiMi, emanetPaketiGecerli } from "../src/yerlesim/goc-emanet.ts";
import { GOC_TASIMA_EN_COK } from "../src/yerlesim/goc.ts";
import type { Karakter } from "../src/yerlesim/tipler.ts";

const arsiv = (o: string, ev: Record<string, number>, kq?: Karakter["kq"]) => ({ o, h: "h1", ev: { ...ev }, ...(kq ? { kq: structuredClone(kq) } : {}) }) as unknown as Karakter;

test("emanet çekişi: sınır kadar, arşivlerden sırayla düşer, partiler taşınır; iptal aynen geri yazar", () => {
  const a = arsiv("o1", { odun: 25, kilic: 3 }, { kilic: [[2, 2, "o9"]] });
  const b = arsiv("o7", { odun: 20 });
  const d = emanetDokumu([a, b]);
  assert.deepEqual(d.emanet, { odun: 45, kilic: 3 });
  assert.equal(d.tasinacakAdet, GOC_TASIMA_EN_COK);
  const once = structuredClone([a, b]);
  const bk = emanetCikar([a, b], "h1", "develi", "emanet:abcdefgh1");
  assert.ok(bk);
  const toplam = Object.values(bk.p.ev).reduce((x, n) => x + n, 0);
  assert.equal(toplam, GOC_TASIMA_EN_COK);
  assert.deepEqual(bk.p.kq, { kilic: [[2, 2, "o9"]] }, "değerli mal önce, izli parti taşınır");
  const kalan = (a.ev?.odun ?? 0) + (b.ev?.odun ?? 0) + (a.ev?.kilic ?? 0) + (b.ev?.kilic ?? 0);
  assert.equal(kalan + toplam, 48, "toplam korunur");
  emanetGeriYaz(new Map([[a.o, a], [b.o, b]]), bk);
  assert.deepEqual([a.ev, b.ev, a.kq], [once[0]!.ev, once[1]!.ev, once[0]!.kq], "iptal aynen geri");
  assert.equal(emanetCikar([arsiv("o2", {})], "h1", "develi", "emanet:abcdefgh2"), undefined);
});

test("emanet paketi denetimi ve yeni karaktere ekleme", () => {
  assert.equal(emanetIslemiMi("emanet:abcdefgh"), true);
  assert.equal(emanetIslemiMi("goc:abcdefgh"), false);
  const p = { v: 1 as const, islem: "emanet:abcdefgh", hesap: "h1", kaynak: "develi", ev: { odun: 3 } };
  assert.equal(emanetPaketiGecerli(p, "h1", "emanet:abcdefgh"), true);
  assert.equal(emanetPaketiGecerli(p, "h2", "emanet:abcdefgh"), false);
  assert.equal(emanetPaketiGecerli({ ...p, ev: { odun: GOC_TASIMA_EN_COK + 1 } }, "h1", "emanet:abcdefgh"), false, "sınır üstü reddedilir");
  assert.equal(emanetPaketiGecerli({ ...p, ev: { odun: -1 } }, "h1", "emanet:abcdefgh"), false);
  const kar = { ev: { odun: 2 } } as unknown as Karakter;
  emanetEkle(kar, p);
  assert.deepEqual(kar.ev, { odun: 5 });
});
