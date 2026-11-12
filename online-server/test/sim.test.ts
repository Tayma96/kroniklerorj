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
  const { kademeAtla, meslekSec } = await import("../src/yerlesim/meslek.ts");
  const { seviyeVer } = await import("../src/yerlesim/beceri.ts");
  const { gocKarsiligi } = await import("../src/icerik/agaclar/index.ts");
  // v1 düğümünü göç tablosundaki karşılığıyla verir (öğrenme süresi simülasyon dışı).
  const dugumAc = (c: Parameters<typeof seviyeVer>[0], _m: string, eski: string) => {
    const y = gocKarsiligi(eski)!;
    seviyeVer(c, y.dugum, y.seviye);
  };
  const { satisDegeri } = await import("../src/yerlesim/npc-taban.ts");
  const { npcSatisKotasi, npcyeSat, satilan } = await import("../src/yerlesim/pazar.ts");
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
        const adet = Math.min(c.ev?.[mal] ?? 0, npcSatisKotasi(mal) - satilan(c, mal, ay));
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

// Denge simülasyonu (denge denetimi 9 Kasım, "Önerilen değişiklikler"): 3 ve 6 oyunculu kasaba (çiftçi, oduncu,
// demirci sırayla), 24 ay. Her oyuncu her ay takatini en kârlı işe harcar (temel iş, usta iş, tarif; eksik girdiyi
// önce kasaba stoğundan, yoksa NPC'den alır), siparişleri teslim eder ve kotası kadar NPC'ye satar. Ölçülen: meslek
// başına aylık net akçe. Ölçüt: üç meslek birbirinin ±%35'i içinde; akçe yalnız satış, sipariş ve alımla değişir.
/** [PARAMETRE] Meslekler arası aylık akçe farkı sınırı (en yüksek ≤ en düşük × (1 + bu)). */
export const SIM_MESLEK_FARKI = 0.35;

async function dengeSim(N: number) {
  const { MALLAR, MAL_IDLERI } = await import("../src/icerik/mallar.ts");
  const { oyuncuSayaci } = await import("../src/yerlesim/lonca.ts");
  const { kademeAtla, meslekSec } = await import("../src/yerlesim/meslek.ts");
  const { seviyeVer } = await import("../src/yerlesim/beceri.ts");
  const { gocKarsiligi } = await import("../src/icerik/agaclar/index.ts");
  // v1 düğümünü göç tablosundaki karşılığıyla verir (öğrenme süresi simülasyon dışı).
  const dugumAc = (c: Parameters<typeof seviyeVer>[0], _m: string, eski: string) => {
    const y = gocKarsiligi(eski)!;
    seviyeVer(c, y.dugum, y.seviye);
  };
  const { NPC_AYLIK_KOTA, npcFiyat, npcdenAl, npcdenAlinan, saticiDegeri, stokFiyat, malMeslegindeMi } = await import("../src/yerlesim/npc-taban.ts");
  const { npcSatisKotasi, npcyeSat, satilan } = await import("../src/yerlesim/pazar.ts");
  const { siparisDonumu, siparisTeslim } = await import("../src/yerlesim/siparis.ts");
  const { tarifListesi, tarifYap } = await import("../src/yerlesim/tarif.ts");
  const { temelIsOnizleme, temelIsYap } = await import("../src/yerlesim/temel-is.ts");
  const { takatTazele } = await import("../src/yerlesim/karakter.ts");
  type M = "ciftci" | "oduncu" | "demirci";
  type Mal = (typeof MAL_IDLERI)[number];
  const k = testKasabasi("develi", 0);
  const stok: Partial<Record<Mal, number>> = {};
  k.st = stok;
  const sira: M[] = ["oduncu", "ciftci", "demirci"];
  const dal: Record<M, string> = { ciftci: "ekin", oduncu: "maden", demirci: "alet" };
  const oyuncular = Array.from({ length: N }, (_, i) => {
    const c = oyuncuEkle(k, i + 1, k.ay - 16 * 12);
    const m = (["ciftci", "oduncu", "demirci"] as M[])[i % 3]!;
    meslekSec(c, m, k.ay);
    k.sakin.find((s) => s.o === c.o)!.ms = m;
    dugumAc(c, m, `${m}.${dal[m]}.0`);
    return { c, m };
  }).sort((a, b) => sira.indexOf(a.m) - sira.indexOf(b.m));
  const sayac = () => oyuncuSayaci(k);
  const aylik = new Map<M, number[]>(sira.map((m) => [m, []]));
  let kaynak = 0;
  let degisim = 0;

  for (let ay = 1; ay <= AY; ay++) {
    k.ay = ay;
    siparisDonumu(k, ay);
    for (const { c, m } of oyuncular) {
      const pa0 = c.pa;
      let akis = 0;
      takatTazele(c, ay);
      const deger = (mal: Mal) => saticiDegeri(c, mal, sayac()).toplam;
      const satilabilir = (mal: Mal, adet: number) => Math.min(adet, Math.max(0, npcSatisKotasi(mal) - satilan(c, mal, ay) - (c.ev?.[mal] ?? 0)));
      const alimMaliyeti = (mal: Mal, n: number): number => {
        if (n <= 0) return 0;
        const st = malMeslegindeMi(c, mal) ? 0 : Math.min(stok[mal] ?? 0, n);
        const npc = n - st;
        if (npcdenAlinan(c, mal, ay) + npc > NPC_AYLIK_KOTA) return Number.POSITIVE_INFINITY;
        return st * stokFiyat(mal).toplam + npc * npcFiyat(mal).toplam;
      };
      for (let adim = 0; adim < 40 && c.tk > 0; adim++) {
        let enIyi: { tur: "is" | "tarif"; id: string; d: number; al?: [Mal, number][] } | undefined;
        for (const v of temelIsOnizleme(c, sayac(), ay)) {
          if (!v.acik || v.adet <= 0 || !v.mal || v.is === "onarim") continue;
          const d = satilabilir(v.mal, v.adet) * deger(v.mal);
          if (d > 0 && (!enIyi || d > enIyi.d)) enIyi = { tur: "is", id: v.is, d };
        }
        for (const t of tarifListesi(c)) {
          if (!t.acik || c.tk < t.takat || (t.arac?.zorunlu && !t.arac.var)) continue; // zorunlu araç (Faz 6)
          let maliyet = 0;
          let odeme = 0;
          const al: [Mal, number][] = [];
          for (const [mal, n] of Object.entries(t.girdi) as [Mal, number][]) {
            const var_ = Math.min(c.ev?.[mal] ?? 0, n);
            const a = alimMaliyeti(mal, n - var_);
            maliyet += var_ * deger(mal) + a;
            odeme += a;
            if (n > var_) al.push([mal, n - var_]);
          }
          if (odeme > c.pa) continue;
          const d = (satilabilir(t.cikti.mal, t.cikti.adet) * deger(t.cikti.mal) - maliyet) / t.takat;
          if (d > 0 && (!enIyi || d > enIyi.d)) enIyi = { tur: "tarif", id: t.id, d, al };
        }
        if (!enIyi) break;
        if (enIyi.tur === "is") {
          assert.ok(temelIsYap(c, enIyi.id, sayac(), ay).ok);
          continue;
        }
        for (const [mal, n] of enIyi.al ?? []) {
          const r = npcdenAl(c, mal, n, ay, stok);
          assert.ok(r.ok, JSON.stringify(r));
          akis -= r.deger.tutar;
        }
        assert.ok(tarifYap(c, enIyi.id, ay).ok);
      }
      for (const s of k.sp ?? []) {
        if (s.durum !== "acik") continue;
        const r = siparisTeslim(k, c, k.ili.get(c.o)!, s.id, ay);
        if (r.ok) akis += r.deger.sonuc.odul;
      }
      for (const mal of MAL_IDLERI) {
        const adet = Math.min(c.ev?.[mal] ?? 0, NPC_SATIS_KOTASI - satilan(c, mal, ay));
        if (adet <= 0 || MALLAR[mal].taban === 0) continue;
        const r = npcyeSat(c, mal, adet, sayac(), ay, stok);
        assert.ok(r.ok);
        akis += r.deger.tutar;
      }
      kaynak += akis;
      degisim += c.pa - pa0;
      aylik.get(m)!.push(c.pa - pa0);
      if (kademeAtla(c, m, ay).ok) dugumAc(c, m, `${m}.${dal[m]}.1`);
    }
  }
  const ort = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  const sonuc = Object.fromEntries(sira.map((m) => [m, ort(aylik.get(m)!)])) as Record<M, number>;
  return { sonuc, kaynak, degisim, teslim: (k.sp ?? []).filter((s) => s.durum === "teslim").length };
}

for (const N of [3, 6]) {
  test(`denge simülasyonu: ${N} oyuncu — çiftçi/oduncu/demirci aylık akçesi birbirinin ±%35'i içinde`, async () => {
    const { sonuc, kaynak, degisim, teslim } = await dengeSim(N);
    const d = Object.values(sonuc);
    console.log(`sim-denge N=${N}: ciftci=${sonuc.ciftci.toFixed(1)} oduncu=${sonuc.oduncu.toFixed(1)} demirci=${sonuc.demirci.toFixed(1)} teslim=${teslim}`);
    assert.equal(degisim, kaynak, "akçe yalnız satış, sipariş ve alımla değişti");
    assert.ok(Math.min(...d) > 0, "her meslek kazanır");
    assert.ok(Math.max(...d) <= Math.min(...d) * (1 + SIM_MESLEK_FARKI), JSON.stringify(sonuc));
  });
}

test("takatsiz kâr yolu yok: NPC'den ya da stoktan alıp satmak, NPC'den alıp siparişe teslim etmek kâr etmez", async () => {
  const { MALLAR } = await import("../src/icerik/mallar.ts");
  const { npcFiyat, satisDegeri, stokFiyat } = await import("../src/yerlesim/npc-taban.ts");
  const { SIPARIS_MALLARI, SIPARIS_ODUL_CARPANI } = await import("../src/yerlesim/siparis.ts");
  for (const [mal, m] of Object.entries(MALLAR) as [keyof typeof MALLAR, (typeof MALLAR)[keyof typeof MALLAR]][]) {
    if (m.taban === 0) continue;
    const enIyiSatis = satisDegeri(mal, 0).toplam; // kıtlık primli
    assert.ok(npcFiyat(mal).toplam > enIyiSatis, `${mal}: NPC al → sat`);
    assert.ok(stokFiyat(mal).toplam >= enIyiSatis, `${mal}: stok al → sat`);
  }
  for (const liste of Object.values(SIPARIS_MALLARI)) {
    for (const { mal, alt, ust } of liste!) {
      for (let adet = alt; adet <= ust; adet++) {
        const odul = Math.ceil(adet * satisDegeri(mal, 0).toplam * SIPARIS_ODUL_CARPANI);
        assert.ok(adet * npcFiyat(mal).toplam > odul, `${mal}×${adet}: NPC al → sipariş`);
      }
    }
  }
});
