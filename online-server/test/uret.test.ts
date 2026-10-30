import test from "node:test";
import assert from "node:assert/strict";
import { YERLESIMLER, yerlesimBul } from "../src/dunya-veri.ts";
import { AD_HAVUZLARI, DILLER } from "../src/icerik/adlar.ts";
import { HAYALLER, HUYLAR, MESLEKLER, TUHAFLIKLAR } from "../src/icerik/kisilik.ts";
import { mekanlar } from "../src/yerlesim/cizelge.ts";
import { npcAdi, yas } from "../src/yerlesim/ortak.ts";
import { nufusUret } from "../src/yerlesim/uret.ts";

test("içerik: tek oyunculudan kopyalanan listeler ve 6 dilde hizalı ad havuzları", () => {
  assert.equal(HUYLAR.length, 16);
  assert.equal(TUHAFLIKLAR.length, 14);
  assert.equal(HAYALLER.length, 14);
  assert.deepEqual(MESLEKLER, ["çiftçi", "demirci", "tüccar", "balıkçı", "avcı", "çoban", "fırıncı", "müzisyen", "şifacı", "asker", "işsiz"]);
  for (const d of DILLER) {
    assert.equal(AD_HAVUZLARI[d].m.length, AD_HAVUZLARI.tr.m.length, d);
    assert.equal(AD_HAVUZLARI[d].f.length, AD_HAVUZLARI.tr.f.length, d);
    assert.equal(AD_HAVUZLARI[d].s.length, AD_HAVUZLARI.tr.s.length, d);
  }
  assert.equal(npcAdi({ a: 0, s: 0, k: 0 }, "tr"), "Mehmet Atay");
  assert.equal(npcAdi({ a: 0, s: 4, k: 1 }, "ru"), "Мария Пастухова");
});

test("üretim deterministiktir: aynı yerleşim ve ay aynı nüfusu verir", () => {
  const y = yerlesimBul("develi")!;
  assert.deepEqual(nufusUret(y, 7), nufusUret(y, 7));
  assert.notEqual(JSON.stringify(nufusUret(y, 7)), JSON.stringify(nufusUret(yerlesimBul("karapinar")!, 7)));
});

test("nüfus değişmezleri: sayı, yaş, hane, eş, ebeveyn, bağlar (bütün yerleşimler)", () => {
  const AY = 30;
  for (const y of YERLESIMLER) {
    const { npc } = nufusUret(y, AY);
    const dizin = new Map(npc.map((n) => [n.i, n]));
    assert.ok(npc.length >= y.npc && npc.length <= y.npc * 1.1, `${y.id} sayı ${npc.length}`);
    assert.equal(dizin.size, npc.length, "kimlikler eşsiz");
    const haneler = new Map<number, number>();
    for (const n of npc) {
      const ny = yas(n.d, AY);
      assert.ok(n.d <= AY && ny >= 0 && ny <= 90, `${y.id} yaş ${ny}`);
      assert.ok(n.a < AD_HAVUZLARI.tr.m.length && n.s < AD_HAVUZLARI.tr.s.length);
      assert.ok(n.m < MESLEKLER.length && n.h < HUYLAR.length && n.q < TUHAFLIKLAR.length && n.r < HAYALLER.length);
      if (ny >= 17) haneler.set(n.e, (haneler.get(n.e) ?? 0) + 1);
      else if (!haneler.has(n.e)) haneler.set(n.e, 0);
      if (n.es) {
        const es = dizin.get(n.es)!;
        assert.equal(es.es, n.i, "eşlik iki yönlü");
        assert.notEqual(es.k, n.k);
        assert.equal(es.e, n.e, "eşler aynı hanede");
        assert.ok(ny >= 17 && yas(es.d, AY) >= 17);
      }
      for (const [ebeveynId, kadin] of [[n.an, 1], [n.ba, 0]] as const) {
        if (!ebeveynId) continue;
        const e = dizin.get(ebeveynId)!;
        assert.equal(e.k, kadin);
        assert.ok(n.d - e.d >= 15 * 12, `${y.id}: ebeveyn en az 15 yaş büyük`);
      }
      for (const [o, tur, puan, kurulus] of n.b) {
        assert.notEqual(o, n.i);
        const karsi = dizin.get(o)!.b.find((b) => b[0] === n.i);
        assert.deepEqual(karsi, [n.i, tur, puan, kurulus], "bağ iki yönlü");
        assert.ok(kurulus <= AY - 12, "üretilen bağlar en az 4 mevsimlik");
        assert.ok(tur === 1 ? puan > 0 : puan < 0);
      }
    }
    for (const [hane, yetiskin] of haneler) assert.ok(yetiskin >= 1, `${y.id} hane ${hane} yetişkinsiz`);
  }
});

test("meslek dağılımı yerleşim türüne göre; köyde değirmen, kasaba ve şehirde mektep", () => {
  const pay = (tur: string, meslekler: string[]) => {
    let say = 0;
    let top = 0;
    for (const y of YERLESIMLER.filter((x) => x.tur === tur)) {
      for (const n of nufusUret(y, 0).npc) {
        top++;
        if (meslekler.includes(MESLEKLER[n.m]!)) say++;
      }
    }
    return say / top;
  };
  const toprakKoy = pay("koy", ["çiftçi", "çoban"]);
  const toprakSehir = pay("sehir", ["çiftçi", "çoban"]);
  assert.ok(toprakKoy > 0.45 && toprakKoy > toprakSehir + 0.25, `${toprakKoy} / ${toprakSehir}`);
  assert.ok(pay("sehir", ["tüccar"]) > pay("koy", ["tüccar"]) + 0.1);
  assert.ok(pay("sehir", ["asker"]) > pay("koy", ["asker"]));
  assert.ok(pay("kasaba", ["tüccar"]) > pay("koy", ["tüccar"]));
  assert.deepEqual(mekanlar("koy"), ["carsi", "cami", "kahvehane", "meydan", "han", "degirmen"]);
  assert.deepEqual(mekanlar("kasaba").at(-1), "mektep");
  assert.deepEqual(mekanlar("sehir").at(-1), "mektep");
});
