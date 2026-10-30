// Simülasyon (Faz 2d'nin küçük hali): 1 kasaba, 20 sanal oyuncu, 24 ay (12 gerçek gün), saf fonksiyonlarla.
// Ölçülen: ay dönümü süresi, olay hacmi, para dağılımı ve farm denemesinin kazancı (aynı NPC'ye aynı eylem)
// ile çeşitli oyunun kazancı.
import test from "node:test";
import assert from "node:assert/strict";
import { ayDonumu } from "../src/yerlesim/donum.ts";
import { eylemKapisi, eylemYap, type EylemTuru } from "../src/yerlesim/eylem.ts";
import { gorusDegeri } from "../src/yerlesim/gorus.ts";
import { yas } from "../src/yerlesim/ortak.ts";
import { tohumlu } from "../src/yerlesim/rastgele.ts";
import type { Karakter } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const AY = 24;
const OYUNCU = 20;

test("simülasyon: 1 kasaba, 20 oyuncu, 24 ay — dönüm süresi ve farm, çeşitli oyundan açıkça az kazanır", () => {
  const k = testKasabasi("develi", 0);
  const oyuncular: Karakter[] = [];
  for (let i = 1; i <= OYUNCU; i++) oyuncular.push(oyuncuEkle(k, i));
  const farmci = (kar: Karakter) => Number(kar.o.slice(1)) <= OYUNCU / 2;
  const kazanc = new Map<string, number>(oyuncular.map((o) => [o.o, 0]));
  const yetiskinler = () => k.npc.filter((n) => yas(n.d, k.ay) >= 20);
  const farmHedefi = new Map<string, number>();
  const sureler: number[] = [];
  let olay = 0;
  let eylemSayisi = 0;

  for (let ay = 1; ay <= AY; ay++) {
    const t0 = performance.now();
    olay += ayDonumu(k, ay).length;
    sureler.push(performance.now() - t0);
    const havuz = yetiskinler();
    for (const kar of oyuncular) {
      const ili = k.ili.get(kar.o)!;
      let sira = 0;
      for (let deneme = 0; deneme < 30; deneme++) {
        let tur: EylemTuru;
        let hedefNo: number;
        if (farmci(kar)) {
          let h = farmHedefi.get(kar.o);
          if (h === undefined || !k.dizin.has(h)) {
            h = havuz[(Number(kar.o.slice(1)) * 13) % havuz.length]!.i;
            farmHedefi.set(kar.o, h);
          }
          tur = "sohbet";
          hedefNo = h;
        } else {
          const turler: EylemTuru[] = ["sohbet", "yardim", "ayakIsi", "hediye"];
          tur = turler[(sira + ay) % turler.length]!;
          hedefNo = havuz[(Number(kar.o.slice(1)) * 7 + ay * 5 + sira * 3) % havuz.length]!.i;
          sira++;
        }
        const npc = k.dizin.get(hedefNo);
        const engel = eylemKapisi(k, tur, kar, npc, ay);
        if (engel === "takat_yok") break;
        if (engel) continue;
        const r = eylemYap(k, kar, ili, { tur, hedef: `n${hedefNo}` }, ay, tohumlu("sim", kar.o, ay, kar.en));
        assert.ok(r.ok);
        eylemSayisi++;
        kazanc.set(kar.o, (kazanc.get(kar.o) ?? 0) + (r.deger.sonuc.degisim.gorus ?? 0));
      }
      assert.ok(kar.tk <= 18);
    }
  }

  const ort = (suz: (o: Karakter) => boolean) => {
    const secili = oyuncular.filter(suz);
    return secili.reduce((a, o) => a + (kazanc.get(o.o) ?? 0), 0) / secili.length;
  };
  const farm = ort(farmci);
  const cesitli = ort((o) => !farmci(o));
  const enUzun = Math.max(...sureler);
  const ortalama = sureler.reduce((a, b) => a + b, 0) / sureler.length;
  const para = oyuncular.map((o) => o.pa).sort((a, b) => a - b);
  // Görüş dağılımı: çeşitli oyuncuya en az +10 bakan NPC sayısı.
  const yakinlar = (kar: Karakter) => k.npc.filter((n) => gorusDegeri(k, n, kar, k.ili.get(kar.o), k.ay) >= 10).length;
  console.log(
    `sim: nufus=${k.npc.length} donum_ms_enuzun=${enUzun.toFixed(2)} donum_ms_ort=${ortalama.toFixed(2)} ` +
      `olay=${olay} eylem=${eylemSayisi} gorus_kazanci_farm=${farm.toFixed(1)} gorus_kazanci_cesitli=${cesitli.toFixed(1)} ` +
      `para_min/med/max=${para[0]}/${para[OYUNCU / 2]}/${para.at(-1)} yakin_npc_farm=${yakinlar(oyuncular[0]!)} yakin_npc_cesitli=${yakinlar(oyuncular.at(-1)!)}`,
  );
  assert.ok(enUzun < 50, `ay dönümü ${enUzun} ms`);
  assert.ok(farm < cesitli * 0.4, `farm ${farm} / çeşitli ${cesitli}`);
  assert.ok(eylemSayisi <= OYUNCU * AY * 6 + OYUNCU * 12, "takat eylem sayısını sınırlar");
  assert.ok(olay < AY * 40, `olay hacmi ${olay}`);
});
