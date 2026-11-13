// Arabuluculuk (§6.2), şartlı barış, ateşkes, ikili oyun, toplam akçe ve Hasan–Ahmet–Berkay maliyet/risk çeşitliliği.
// Kabul (FAZ4_PLAN senaryo 6.2): Hasan (Murat→Hasan +35) Berkay'ın dostudur; Murat→Berkay −42.
import test from "node:test";
import assert from "node:assert/strict";
import { ucgenAl, ucgenEmanet } from "../src/yerlesim/bilgi.ts";
import { gorus, gorusDegeri } from "../src/yerlesim/gorus.ts";
import { tohumlu } from "../src/yerlesim/rastgele.ts";
import { seviyeVer } from "../src/yerlesim/beceri.ts";
import { araciIste, araciKapat, arabulucuYap, arabuluculukSansi, sartOde, sonucBandi, talepDonumu } from "../src/yerlesim/arabulucu.ts";
import { kiskirt, ucgenDonumu } from "../src/yerlesim/ucgen.ts";
import type { Kasaba } from "../src/yerlesim/tipler.ts";
import { toplamAkce } from "./hanedan-yardimci.ts";
import { baglam, dostYap, kopya, senaryo, type Senaryo } from "./ucgen-yardimci.ts";

const akce = (k: Kasaba) => toplamAkce(k) + ucgenEmanet(k);

function hazir(bedel: "ozur" | "tazminat" = "ozur", miktar = 0): Senaryo & { talep: number } {
  const s = senaryo();
  dostYap(s.k, s.berkay.o, s.hasan.o);
  s.berkay.pa = 50;
  const r = araciIste(baglam(s.k, s.berkay), { arabulucu: s.hasan.o, npc: s.murat.i, bedel, miktar });
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(r.deger.olaylar[0]!.g, s.hasan.o, "talep Hasan'a özel olay");
  return { ...s, talep: ucgenAl(s.k).at[0]!.i };
}

function oyna(tohum: number, bedel: "ozur" | "tazminat" = "ozur", miktar = 0) {
  const s = kopya(hazir(bedel, miktar));
  const once = akce(s.k);
  const r = arabulucuYap(baglam(s.k, s.hasan), { talep: s.talep }, tohumlu("ara", tohum));
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(akce(s.k), once, "toplam akçe korunur");
  return { s, c: r.deger };
}

test("barış ilahisi sinerjisi iki meslek düğümü de öğrenilince arabuluculuk şansına +10 ekler", () => {
  const s = hazir();
  const talep = ucgenAl(s.k).at[0]!;
  const temel = arabuluculukSansi(s.k, s.hasan, talep, s.k.ay).sans.toplam;
  seviyeVer(s.hasan, "ozan.barisIlahisi", 1);
  const ilkSeviye = arabuluculukSansi(s.k, s.hasan, talep, s.k.ay).sans.toplam;
  assert.equal(ilkSeviye, temel, "barış ilahisinin ilk seviyesi sinerji için yetmez");
  seviyeVer(s.hasan, "ozan.barisIlahisi", 2);
  const tekMeslek = arabuluculukSansi(s.k, s.hasan, talep, s.k.ay).sans.toplam;
  assert.equal(tekMeslek, temel, "açan düğüm tek başına çapraz meslek sinerjisini açmaz");
  seviyeVer(s.hasan, "arabulucu.araBulma", 1);
  const ikiMeslek = arabuluculukSansi(s.k, s.hasan, talep, s.k.ay).sans.toplam;
  assert.equal(ikiMeslek, temel + 10, "iki düğüm birlikte öğrenilince bonus tek kez eklenir");
});

test("senaryo 6.2: dört sonuç da tohumla üretilir; bantlar şansa bağlı", () => {
  const goruldu = new Set<string>();
  for (let i = 0; i < 300 && goruldu.size < 4; i++) goruldu.add(oyna(i).c.yanit.sonuc as string);
  assert.deepEqual([...goruldu].sort(), ["ateskes", "baris", "ret", "sartli"]);
  assert.equal(sonucBandi(10, 40), "baris");
  assert.equal(sonucBandi(30, 40), "sartli");
  assert.equal(sonucBandi(50, 40), "ateskes");
  assert.equal(sonucBandi(56, 40), "ret");
});

function bul(sonuc: string, bedel: "ozur" | "tazminat" = "ozur", miktar = 0) {
  for (let i = 0; i < 400; i++) {
    const r = oyna(i, bedel, miktar);
    if (r.c.yanit.sonuc === sonuc) return r;
  }
  throw new Error(`sonuç yok: ${sonuc}`);
}

test("barış: Murat→Berkay kırgınlığın yarısı kadar iyileşir; kalem 3 yıl sonra aynı; anılar silinmez; Hasan kazanır", () => {
  const { s, c } = bul("baris");
  const { k, murat, berkay } = s;
  const ili = k.ili.get(berkay.o)!;
  assert.equal(c.yanit.deger, 21);
  assert.equal(gorusDegeri(k, murat, berkay, ili, k.ay), -42 + 21);
  const kalem = (ay: number) => gorus(k, murat, berkay, ili, ay).kalemler.find((x) => x.k === "gorus.baris")?.d;
  assert.equal(kalem(k.ay), 21);
  for (let a = 1; a <= 36; a++) ucgenDonumu(k, k.ay + a);
  assert.equal(kalem(k.ay + 36), 21, "barış kalemi sönmez");
  assert.ok(c.olaylar.some((o) => o.k === "olay.ucgen.barisildi" && o.g === ""), "meydanda helallik");
});

test("şartlı barış: şart ödenene dek 0, ödenince kırgınlık kadar; şart parası hazineye", () => {
  const { s, c } = bul("sartli");
  const { k, murat, berkay } = s;
  const ili = k.ili.get(berkay.o)!;
  assert.equal(gorusDegeri(k, murat, berkay, ili, k.ay), -42, "şarta dek değişmez");
  const tutar = (c.yanit.sart as { tutar: number }).tutar;
  const once = akce(k);
  const pa = berkay.pa;
  const r = sartOde(baglam(k, berkay), { npc: murat.i });
  assert.ok(r.ok);
  assert.equal(berkay.pa, pa - tutar);
  assert.equal(akce(k), once);
  assert.equal(gorusDegeri(k, murat, berkay, ili, k.ay), 0);
  assert.deepEqual(sartOde(baglam(k, berkay), { npc: murat.i }), { ok: false, hata: "sart_yok" });
});

test("ret: Murat→Hasan düşer; tazminat emaneti iade; ateşkes NPC laf hamlesini ve katılımı durdurur", () => {
  const { s, c } = bul("ret", "tazminat", 10);
  const { k, murat, hasan, berkay } = s;
  assert.equal(berkay.pa, 50, "tazminat iade");
  assert.ok(gorusDegeri(k, murat, hasan, k.ili.get(hasan.o), k.ay) < 35);
  assert.ok(typeof c.yanit.gerekce === "string");
  assert.ok(c.olaylar.some((o) => o.g === berkay.o && o.k === "olay.ucgen.arabuluculuk.ret" && o.p.gerekce));
  const a = bul("ateskes");
  assert.ok(typeof a.c.yanit.ateskesBitis === "number");
});

test("kapılar: dost olmayan, güveni yetmeyen, kırgın olmayan, başkasının talebi", () => {
  const s = senaryo();
  const b = baglam(s.k, s.berkay);
  const g = { arabulucu: s.hasan.o, npc: s.murat.i, bedel: "ozur" as const, miktar: 0 };
  assert.deepEqual(araciIste(b, g), { ok: false, hata: "dost_degil" });
  dostYap(s.k, s.berkay.o, s.hasan.o);
  assert.deepEqual(araciIste(b, { ...g, arabulucu: s.berkay.o }), { ok: false, hata: "kendine" });
  const s2 = senaryo("kurnaz", 10);
  dostYap(s2.k, s2.berkay.o, s2.hasan.o);
  assert.deepEqual(araciIste(baglam(s2.k, s2.berkay), { ...g }), { ok: false, hata: "kirgin_degil" });
  const s3 = senaryo("kurnaz", -42, 10);
  dostYap(s3.k, s3.berkay.o, s3.hasan.o);
  assert.ok(araciIste(baglam(s3.k, s3.berkay), g).ok);
  const t = ucgenAl(s3.k).at[0]!.i;
  assert.deepEqual(arabulucuYap(baglam(s3.k, s3.hasan), { talep: t }, tohumlu("x")), { ok: false, hata: "guven_yetersiz" });
  assert.deepEqual(arabulucuYap(baglam(s3.k, s3.ahmet), { talep: t }, tohumlu("x")), { ok: false, hata: "taraf_degil" });
  // Hasan reddeder: cezasız kapanır.
  assert.ok(araciKapat(baglam(s3.k, s3.hasan), { talep: t }).ok);
  assert.deepEqual(araciKapat(baglam(s3.k, s3.hasan), { talep: t }), { ok: false, hata: "talep_yok" });
});

test("süre dolunca talep düşer ve emanet iade edilir", () => {
  const s = hazir("tazminat", 7);
  assert.equal(s.berkay.pa, 43);
  const once = akce(s.k);
  assert.equal(talepDonumu(s.k, s.k.ay + 1).length, 0);
  const o = talepDonumu(s.k, s.k.ay + 4);
  assert.equal(o.length, 1);
  assert.equal(s.berkay.pa, 50);
  assert.equal(akce(s.k), once);
});

test("ikili oyun: Hasan Murat'ı Berkay'a karşı kışkırttıysa arabuluculukta yakalanabilir; iki taraf da öğrenir", () => {
  let yakalanan = 0;
  for (let i = 0; i < 40; i++) {
    const s = kopya(hazir());
    s.hasan.tk = 10;
    assert.ok(kiskirt(baglam(s.k, s.hasan), { npc: s.murat.i, hedef: s.berkay.o, teklif: "soz", miktar: 0 }, tohumlu("ik", i)).ok);
    const r = arabulucuYap(baglam(s.k, s.hasan), { talep: s.talep }, tohumlu("ik2", i));
    assert.ok(r.ok);
    if (r.deger.yanit.yakalandi) {
      yakalanan++;
      assert.equal(r.deger.yanit.sonuc, "ret");
      assert.ok(r.deger.olaylar.some((o) => o.k === "olay.ucgen.ikiliOyun" && o.g === s.berkay.o));
      assert.ok(s.k.ili.get(s.hasan.o)![s.murat.i]!.an.some((a) => a[0] === "ikiliOyun"), "Murat da bilir");
    }
  }
  assert.ok(yakalanan > 0);
});

test("Hasan–Ahmet–Berkay: farklı yollar farklı maliyet ve risk üretir", () => {
  const maliyetler = new Set<string>();
  // Ahmet'in kışkırtması: para teklifi başarıda akçe; retHaber'de nam ve ifşa.
  for (let i = 0; i < 200; i++) {
    for (const huy of ["kurnaz", "mert"]) {
      const s = kopya(senaryo(huy));
      s.ahmet.pa = 30;
      s.ahmet.nm[2] = 20;
      const r = kiskirt(baglam(s.k, s.ahmet), { npc: s.murat.i, hedef: s.berkay.o, teklif: "para", miktar: 10 }, tohumlu("m", i));
      assert.ok(r.ok);
      if (r.deger.yanit.sonuc === "basari" && s.ahmet.pa === 20) maliyetler.add("ahmet:akce");
      if (r.deger.yanit.sonuc === "retHaber" && s.ahmet.nm[2]! < 20) maliyetler.add("ahmet:namIfsa");
    }
  }
  // Hasan'ın arabuluculuğu: ret Murat'taki itibarından düşer; Berkay'ın tazminatı barışta hazineye gider.
  const ret = bul("ret");
  if (gorusDegeri(ret.s.k, ret.s.murat, ret.s.hasan, ret.s.k.ili.get(ret.s.hasan.o), ret.s.k.ay) < 35) maliyetler.add("hasan:itibar");
  const baris = bul("baris", "tazminat", 10);
  if (baris.s.berkay.pa === 40) maliyetler.add("berkay:tazminat");
  assert.ok(maliyetler.size >= 2, [...maliyetler].join(","));
  assert.deepEqual([...maliyetler].sort(), ["ahmet:akce", "ahmet:namIfsa", "berkay:tazminat", "hasan:itibar"]);
});
