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

// Dikey dilim ekonomisi (plan Task 5): 1 kasaba, 10 oyuncu, 24 ay; her oyuncu her ay bütün takatini en kârlı işe
// harcar, sonra siparişleri teslim eder ve kotası kadar NPC'ye satar. Akçe yalnız satış ve sipariş ödülünden doğar.
/** [PARAMETRE] Oyuncu başına ortalama aylık akçe kazancı üst sınırı. */
export const SIM_AYLIK_AKCE_TAVANI = 40;
/** [PARAMETRE] Tek oyuncunun tek aydaki kazancı için sert üst sınır. */
export const SIM_TEK_AY_TAVANI = 90;

test("simülasyon: dikey dilim ekonomisi — en kârlı oyunda bile aylık akçe sınırlı, artış sınırsız değil", async () => {
  const { MALLAR, MAL_IDLERI } = await import("../src/icerik/mallar.ts");
  const { TARIFLER } = await import("../src/icerik/tarifler.ts");
  const { halAl } = await import("../src/yerlesim/hal.ts");
  const { takatTazele } = await import("../src/yerlesim/karakter.ts");
  const { oyuncuSayaci } = await import("../src/yerlesim/lonca.ts");
  const { dalAc, dugumAc, kademeAtla, meslekSec } = await import("../src/yerlesim/meslek.ts");
  const { satisDegeri } = await import("../src/yerlesim/npc-taban.ts");
  const { NPC_SATIS_KOTASI, npcyeSat, satilan } = await import("../src/yerlesim/pazar.ts");
  const { siparisDonumu, siparisTeslim } = await import("../src/yerlesim/siparis.ts");
  const { tarifListesi, tarifYap } = await import("../src/yerlesim/tarif.ts");
  const { TEMEL_ISLER, firsatMaliyeti, temelIsYap } = await import("../src/yerlesim/temel-is.ts");
  type MeslekAdi = "ciftci" | "oduncu" | "demirci";

  const N = 10;
  const k = testKasabasi("develi", 0);
  const plan: Record<MeslekAdi, { dal: string }> = { ciftci: { dal: "ekin" }, oduncu: { dal: "maden" }, demirci: { dal: "alet" } };
  const meslekler: MeslekAdi[] = ["ciftci", "oduncu", "demirci"];
  const oyuncular = Array.from({ length: N }, (_, i) => {
    const c = oyuncuEkle(k, i + 1, k.ay - 16 * 12);
    const m = meslekler[i % 3]!;
    meslekSec(c, m, k.ay);
    k.sakin.find((s) => s.o === c.o)!.ms = m;
    dalAc(c, m, plan[m].dal);
    dugumAc(c, m, `${m}.${plan[m].dal}.0`);
    return { c, m };
  });
  const deger = (mal: string) => satisDegeri(mal as never, oyuncuSayaci(k)(MALLAR[mal as keyof typeof MALLAR].meslek)).toplam;
  const aylik: number[][] = [];
  let kaynak = 0;
  let paDegisimi = 0;
  let enDusukKondisyon = 100;

  for (let ay = 1; ay <= AY; ay++) {
    ayDonumu(k, ay);
    siparisDonumu(k, ay);
    const buAy: number[] = [];
    for (const { c, m } of oyuncular) {
      const pa0 = c.pa;
      let kazanc = 0;
      takatTazele(c, ay);
      for (let adim = 0; adim < 40 && c.tk > 0; adim++) {
        let enIyi: { tur: "is" | "tarif"; id: string; d: number } | undefined;
        for (const id of Object.keys(TEMEL_ISLER)) {
          const f = firsatMaliyeti(c, id as never, oyuncuSayaci(k), ay);
          const d = f.kalemler.find((x) => x.k === "bu_is")?.d ?? 0;
          if (d > 0 && (!enIyi || d > enIyi.d)) enIyi = { tur: "is", id, d };
        }
        for (const t of tarifListesi(c)) {
          if (!t.yapilabilir) continue;
          const girdi = Object.entries(t.girdi).reduce((a, [mal, n]) => a + deger(mal) * (n as number), 0);
          const d = (t.cikti.adet * deger(t.cikti.mal) - girdi) / t.takat;
          if (d > 0 && (!enIyi || d > enIyi.d)) enIyi = { tur: "tarif", id: t.id, d };
        }
        if (!enIyi) break;
        const r = enIyi.tur === "is" ? temelIsYap(c, enIyi.id, oyuncuSayaci(k), ay) : tarifYap(c, enIyi.id, ay);
        if (!r.ok) break;
      }
      for (const s of k.sp ?? []) {
        if (s.durum !== "acik") continue;
        const r = siparisTeslim(k, c, k.ili.get(c.o)!, s.id, ay);
        if (r.ok) kazanc += r.deger.sonuc.odul;
      }
      for (const mal of MAL_IDLERI) {
        const adet = Math.min(c.ev?.[mal] ?? 0, NPC_SATIS_KOTASI - satilan(c, mal, ay));
        if (adet <= 0 || MALLAR[mal].taban === 0) continue;
        const r = npcyeSat(c, mal, adet, oyuncuSayaci(k), ay);
        assert.ok(r.ok, JSON.stringify(r));
        kazanc += r.deger.tutar;
      }
      kaynak += kazanc;
      paDegisimi += c.pa - pa0;
      buAy.push(kazanc);
      enDusukKondisyon = Math.min(enDusukKondisyon, halAl(c, ay).kondisyon);
      assert.ok(c.tk <= 18);
      // İlerleme: kalfa olunca bir sonraki düğüm (demircide alet tarifi).
      if (kademeAtla(c, m, ay).ok) dugumAc(c, m, `${m}.${plan[m].dal}.1`);
    }
    aylik.push(buAy);
  }

  const hepsi = aylik.flat();
  const ort = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  const ilkYil = ort(aylik.slice(0, 12).flat());
  const ikinciYil = ort(aylik.slice(12).flat());
  const meslekOrt = (m: MeslekAdi) => ort(aylik.flatMap((a) => a.filter((_, i) => oyuncular[i]!.m === m)));
  const teslim = (k.sp ?? []).filter((s) => s.durum === "teslim").length;
  console.log(
    `sim-dilim: ort=${ort(hepsi).toFixed(1)} enCok=${Math.max(...hepsi)} yil1=${ilkYil.toFixed(1)} yil2=${ikinciYil.toFixed(1)} ` +
      `ciftci=${meslekOrt("ciftci").toFixed(1)} oduncu=${meslekOrt("oduncu").toFixed(1)} demirci=${meslekOrt("demirci").toFixed(1)} ` +
      `teslim=${teslim} enDusukKondisyon=${enDusukKondisyon} tarif=${Object.keys(TARIFLER).length}`,
  );
  assert.equal(paDegisimi, kaynak, "akçe yalnız satış ve sipariş ödülünden değişti");
  assert.ok(ort(hepsi) <= SIM_AYLIK_AKCE_TAVANI, `ortalama ${ort(hepsi)}`);
  assert.ok(Math.max(...hepsi) <= SIM_TEK_AY_TAVANI, `tek ay ${Math.max(...hepsi)}`);
  assert.ok(ikinciYil <= ilkYil * 1.5 + 2, `artış: ${ilkYil} → ${ikinciYil}`);
  assert.ok(ort(hepsi) > 0, "emek bir şey kazandırır");
});
