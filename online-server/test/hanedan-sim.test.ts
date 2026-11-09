// Faz 7g kabul simülasyonu: 1 kasaba, ~1800 ay (≈3 kuşak), saf fonksiyonlarla.
//   H1: iki oyuncu (o1 kadın + o2 erkek) birbiriyle evlenir (Faz 3 görücü kancası: evlilikKapisi + evlilikKaydet).
//   H2: o3 ve vârisleri NPC eşle evlenir.  H3: o4 ve vârisleri hiç evlenmez → uzak akrabayla sürer.
// Her devirde: önizleme planı = uygulanan plan (pk), para korunumu, vergi %10, sarkan kimlik yok, tek devir.
import test from "node:test";
import assert from "node:assert/strict";
import { devirHesapla, devirUygula, planKarmasi, VERGI_ORANI } from "../src/yerlesim/devir.ts";
import { ayDonumu } from "../src/yerlesim/donum.ts";
import { evlilikKapisi, evlilikKaydet } from "../src/yerlesim/evlilik.ts";
import { hanedanKimligi, nesil, olduMu } from "../src/yerlesim/hanedan.ts";
import { npcKimlik, yas } from "../src/yerlesim/ortak.ts";
import type { KronikSatiri } from "../src/yerlesim/kronik.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";
import { toplamAkce } from "./hanedan-yardimci.ts";

const AY = 1800;

function kosu() {
  const k = testKasabasi("develi", 0);
  for (let i = 1; i <= 4; i++) oyuncuEkle(k, i).pa = 500;
  k.kar.get("o4")!.tn.o3 = "dusman";
  const sureler: number[] = [];
  let olum = 0;
  let devir = 0;
  let uzak = 0;
  const hanedanHesap = new Map(k.sakin.map((s) => [s.h, s.o]));

  for (let ay = 1; ay <= AY; ay++) {
    const t0 = performance.now();
    const olaylar = ayDonumu(k, ay);
    sureler.push(performance.now() - t0);
    olum += olaylar.filter((o) => o.k === "olay.oyuncuOldu").length;
    assert.ok(!olaylar.some((o) => o.k === "olay.devir"), "simde devir hep elle yapılır; süre dolmaz");

    // Evlilikler
    const canli = (o: string) => {
      const x = k.kar.get(o);
      return x && !olduMu(x) && k.sakin.some((s) => s.o === o) ? x : undefined;
    };
    const a1 = canli("o1");
    const a2 = canli("o2");
    if (a1 && a2 && !a1.hd?.es && evlilikKapisi(k, a1, "o2", ay) === undefined) evlilikKaydet(k, a1, "o2", ay);
    for (const s of k.sakin) {
      const kar = k.kar.get(s.o)!;
      const h = hanedanKimligi(kar);
      if (olduMu(kar) || kar.hd?.es || h === "o4") continue;
      if ((h === "o1" || h === "o2") && nesil(kar) === 1) continue; // ilk kuşak birbiriyle evlenir
      if (yas(kar.d, ay) < 18) continue;
      const n = k.npc.find((x) => evlilikKapisi(k, kar, npcKimlik(x.i), ay) === undefined);
      if (n) evlilikKaydet(k, kar, npcKimlik(n.i), ay);
    }

    // Devirler: önizle → (aynı plan) → uygula
    for (const t of [...(k.hd?.tr ?? [])]) {
      const on = devirHesapla(k, t.o, undefined, ay);
      assert.ok(on.ok, JSON.stringify(on));
      const pk = planKarmasi(on.deger);
      const plan = devirHesapla(k, t.o, undefined, ay);
      assert.ok(plan.ok);
      assert.equal(planKarmasi(plan.deger), pk, "önizleme = devir");
      const once = toplamAkce(k);
      const ol = k.kar.get(t.o)!;
      const r = devirUygula(k, plan.deger, ay);
      assert.ok(r.ok, JSON.stringify(r));
      assert.deepEqual(devirUygula(k, plan.deger, ay), { ok: false, hata: "devir_yok" });
      devir++;
      if (plan.deger.varis.id === "uzak") uzak++;
      const v = r.deger.kar;
      assert.equal(toplamAkce(k), once, "para korunur");
      const vergi = plan.deger.kalemler.find((x) => x.tur === "vergi");
      assert.equal(vergi ? (vergi as { akce: number }).akce : 0, Math.floor((plan.deger.tereke * VERGI_ORANI) / 100));
      assert.equal(nesil(v), nesil(ol) + 1);
      // Sarkan kimlik yok: canlı kayıtlarda ölünün kimliği geçmez.
      const no = Number(t.o.slice(1));
      assert.ok(!k.sakin.some((s) => s.o === t.o));
      assert.equal(hanedanHesap.has(v.h), true);
      for (const s of k.sakin) {
        const c = k.kar.get(s.o)!;
        assert.equal(c.tn[t.o], undefined, `tanıdık işaretçisi ${s.o}`);
        assert.notEqual(c.hd?.es, t.o, `eş işaretçisi ${s.o}`);
      }
      assert.ok(!k.npc.some((n) => n.es === -no), "NPC eş işaretçisi");
      if (plan.deger.varis.id !== "uzak") assert.equal(k.dizin.has(Number(plan.deger.varis.id.slice(1))), false);
      assert.equal(k.hd!.tr.some((x) => x.o === t.o), false);
    }
  }
  const kronik = (k.kq ?? []) as KronikSatiri[];
  return { k, kronik, sureler, olum, devir, uzak };
}

test("hanedan simülasyonu: 4 hesap / 3 hanedan türü × 3 kuşak, devir kusursuz ve deterministik", () => {
  const a = kosu();
  const b = kosu();
  assert.deepEqual(a.kronik, b.kronik, "aynı tohum aynı kronik");
  const { k, kronik, sureler, olum, devir, uzak } = a;
  assert.equal(olum, devir, "her ölüme tam bir devir");
  assert.equal(kronik.filter((s) => s.t === "olum").length, olum, "her ölüme bir kronik satırı");
  assert.equal(kronik.filter((s) => s.t === "devir").length, devir);
  assert.ok(uzak >= 2, `uzak akraba: ${uzak}`);
  const nesiller = k.sakin.map((s) => [s.h, nesil(k.kar.get(s.o)!)] as const);
  for (const [h, n] of nesiller) assert.ok(n >= 3, `${h} nesil ${n}`);
  assert.ok(kronik.some((s) => s.t === "evlilik" && (s.p.b as { i: string }).i === "o2"), "H1 oyuncu–oyuncu evliliği");
  assert.ok(kronik.some((s) => s.t === "evlilik" && (s.p.b as { i: string }).i.startsWith("n")), "H2 NPC eş");
  assert.ok(kronik.some((s) => s.t === "dogum"));
  const enUzun = Math.max(...sureler);
  const ortalama = sureler.reduce((x, y) => x + y, 0) / sureler.length;
  const ozet = k.sakin
    .map((s) => {
      const kar = k.kar.get(s.o)!;
      return `${s.h}: hanedan ${hanedanKimligi(kar)} nesil ${nesil(kar)} (${(kar.hd?.at ?? []).map((x) => `${x[1]} ${yas(x[2], x[3])}y`).join(" → ")} → ${kar.ad})`;
    })
    .join("\n# ");
  console.log(
    `# hanedan-sim: ölüm=${olum} devir=${devir} uzak=${uzak} kronik=${kronik.length} hazine=${k.hd!.hz} ` +
      `nufus=${k.npc.length} donum_ms_enuzun=${enUzun.toFixed(2)} donum_ms_ort=${ortalama.toFixed(2)}\n# ${ozet}`,
  );
  assert.ok(enUzun < 50, `ay dönümü ${enUzun} ms`);
});
