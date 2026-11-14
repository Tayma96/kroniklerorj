// H6 düello: masada meydan okuma teklifi ve kabulü (saf), yerleşimde kapılar, deterministik çözüm, nam tavanı,
// mevsim farm süzgeci, aynı küme, kayıp yok, tekrar teslim.
import test from "node:test";
import assert from "node:assert/strict";
import { bellekDepo } from "../src/depo.ts";
import { eylemUygula, oturusAnahtari, type EylemBaglami } from "../src/han/eylem.ts";
import { VARSAYILAN_AYAR } from "../src/han/kurallar.ts";
import type { EylemGirdisi } from "../src/han/tipler.ts";
import { HATA_DURUMU } from "../src/tipler.ts";
import {
  DUELLO_AGIRLIK,
  DUELLO_KALEMLERI,
  DUELLO_NAM,
  DUELLO_YERLESIM_AY_EN_AZ,
  DUELLO_ZAR,
  duelloCoz,
  girisAyi,
  mevsimNo,
} from "../src/yerlesim/duello.ts";
import { hanOlayiIslendiMi, hanOlayiUygula, type HanOlayGirdisi } from "../src/yerlesim/han-olay.ts";
import { NAM_AYLIK_TAVAN, NAMLAR } from "../src/yerlesim/karakter.ts";
import { soylentiGorunumu } from "../src/yerlesim/soylenti.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";
import { MASA } from "./han-yardimci.ts";

const MERT = NAMLAR.indexOf("mertlik");
const SIMDI = 1_800_000_000_000;

// ---------------------------------------------------------------- masa tarafı

function baglam(ek: Partial<EylemBaglami> = {}): EylemBaglami {
  return {
    masa: MASA,
    oturanlar: [
      { hesap: "ali", koltuk: 0, o: 100 },
      { hesap: "veli", koltuk: 1, o: 200 },
    ],
    ayar: { ...VARSAYILAN_AYAR },
    simdi: SIMDI,
    engelliMi: async () => false,
    ...ek,
  };
}
let istek = 0;
const girdi = (e: Partial<EylemGirdisi> & Pick<EylemGirdisi, "tur">): EylemGirdisi => ({ masa: 1, istekNo: `duello-${String(++istek).padStart(6, "0")}`, ...e });

test("H6 masa: meydan okuma teklif olur; yalnız hedef kabul eder; kabulde teklifTur meydanOku", async () => {
  const depo = bellekDepo();
  const t = await eylemUygula(depo, "ali", girdi({ tur: "meydanOku", hedef: "veli" }), baglam());
  assert.ok(t.ok);
  assert.equal(t.deger.olay.durum, "teklif");
  assert.deepEqual(await depo.al(oturusAnahtari(t.deger.olay.no)), [100, 200]);
  const yanlis = await eylemUygula(depo, "ali", girdi({ tur: "kabul", olay: t.deger.olay.no }), baglam());
  assert.equal(yanlis.ok ? "" : yanlis.hata, "olay_yok", "meydan okuyan kendi teklifini kabul edemez");
  const k = await eylemUygula(depo, "veli", girdi({ tur: "kabul", olay: t.deger.olay.no }), baglam());
  assert.ok(k.ok);
  assert.deepEqual([k.deger.olay.teklifTur, k.deger.olay.hedef, k.deger.olay.kim], ["meydanOku", "ali", "veli"]);
  const iki = await eylemUygula(depo, "veli", girdi({ tur: "kabul", olay: t.deger.olay.no }), baglam());
  assert.equal(iki.ok ? "" : iki.hata, "karar_verildi");
});

test("H6 masa: taraflardan biri kalkıp yeniden oturursa teklif düşer; kabul anında kavga yasaksa reddedilir", async () => {
  const depo = bellekDepo();
  const t = await eylemUygula(depo, "ali", girdi({ tur: "meydanOku", hedef: "veli" }), baglam());
  assert.ok(t.ok);
  const yasak = await eylemUygula(depo, "veli", girdi({ tur: "kabul", olay: t.deger.olay.no }), baglam({ ayar: { ...VARSAYILAN_AYAR, kavgaYasak: true } }));
  assert.equal(yasak.ok ? "" : yasak.hata, "kavga_yasak");
  const yeniden = baglam({ oturanlar: [{ hesap: "ali", koltuk: 2, o: 300 }, { hesap: "veli", koltuk: 1, o: 200 }] });
  const dustu = await eylemUygula(depo, "veli", girdi({ tur: "kabul", olay: t.deger.olay.no }), yeniden);
  assert.equal(dustu.ok ? "" : dustu.hata, "teklif_dustu");
  assert.equal(HATA_DURUMU.teklif_dustu, 409);
  const yok = baglam({ oturanlar: [{ hesap: "veli", koltuk: 1, o: 200 }] });
  const gitti = await eylemUygula(depo, "veli", girdi({ tur: "kabul", olay: t.deger.olay.no }), yok);
  assert.equal(gitti.ok ? "" : gitti.hata, "teklif_dustu", "meydan okuyan masadan gittiyse düşer");
});

// ---------------------------------------------------------------- yerleşim tarafı

function kur(yasA = 20, yasB = 25) {
  const k = testKasabasi("develi", 400);
  const a = oyuncuEkle(k, 1, k.ay - yasA * 12);
  const b = oyuncuEkle(k, 2, k.ay - yasB * 12);
  const c = oyuncuEkle(k, 3, k.ay - 30 * 12);
  const haneler = [...new Set(k.npc.map((n) => n.e).filter((e) => e !== 0))];
  const hane = (x: Karakter, e: number) => {
    x.e = e;
    k.sakin.find((s) => s.o === x.o)!.e = e;
  };
  hane(a, haneler[0]!);
  hane(b, haneler[1]!);
  hane(c, haneler[2]!);
  return { k, a, b, c, kisiler: new Map([a, b, c].map((x) => [x.h, x])) };
}

let sira = 0;
/** Kabul olayı: `savunan` kabul eder (kim), `okuyan` meydan okumuştu (hedef). */
function kabul(okuyan: Karakter, savunan: Karakter, ek: Partial<HanOlayGirdisi> = {}): HanOlayGirdisi {
  return { anahtar: `masa:develi:han:1#${++sira}`, masaNo: 1, tur: "kabul", teklifTur: "meydanOku", kim: savunan.h, hedef: okuyan.h, katilim: [okuyan.h, savunan.h], ...ek };
}

const akce = (k: Kasaba) => [...k.kar.values()].reduce((t, x) => t + x.pa, 0);

test("H6 deterministik çözüm: aynı tohum aynı sonuç; döküm kalemleri formüle uyar, toplam kalemlerin toplamı", () => {
  const { k, a, b } = kur();
  const r1 = duelloCoz(a, b, k.ay, "masa:develi:han:1#7");
  const r2 = duelloCoz(a, b, k.ay, "masa:develi:han:1#7");
  assert.deepEqual(r1, r2);
  for (const [kar, d] of [[a, r1.kisi], [b, r1.hedef]] as const) {
    assert.equal(d.dovus, kar.be[0]! * DUELLO_AGIRLIK.dovus);
    assert.equal(d.guc, kar.oz[0]! * DUELLO_AGIRLIK.guc);
    assert.equal(d.ceviklik, kar.oz[1]! * DUELLO_AGIRLIK.ceviklik);
    assert.equal(d.dayaniklilik, kar.oz[2]! * DUELLO_AGIRLIK.dayaniklilik);
    assert.ok(d.zar >= 1 && d.zar <= DUELLO_ZAR);
    assert.equal(d.toplam, DUELLO_KALEMLERI.reduce((t, x) => t + d[x], 0));
  }
  assert.equal(r1.kazanan, r1.kisi.toplam > r1.hedef.toplam ? "kisi" : "hedef", "eşitlikte savunan");
  const zarlar = new Set(Array.from({ length: 30 }, (_, i) => duelloCoz(a, b, k.ay, `t${i}`).kisi.zar));
  assert.ok(zarlar.size > 1, "zar tohuma bağlı");
});

test("H6 düello: kazanana mertlik +2 (aylık tavan içinde); kaybeden hiçbir şey kaybetmez; iki taraf birer takat; döküm tanıklara", () => {
  const { k, a, b, c, kisiler } = kur();
  const g = kabul(a, b, { katilim: [a.h, b.h, c.h] });
  const beklenen = duelloCoz(a, b, k.ay, g.anahtar);
  const kazanan = beklenen.kazanan === "kisi" ? a : b;
  const kaybeden = kazanan === a ? b : a;
  const kayip0 = structuredClone({ nm: kaybeden.nm, pa: kaybeden.pa, ev: kaybeden.ev, hl: kaybeden.hl });
  const tk0 = [a.tk, b.tk];
  const mert0 = kazanan.nm[MERT] ?? 0;
  const para = akce(k);
  const r = hanOlayiUygula(k, g, kisiler, k.ay);
  assert.ok(r.ok);
  assert.equal((kazanan.nm[MERT] ?? 0) - mert0, DUELLO_NAM);
  assert.deepEqual(structuredClone({ nm: kaybeden.nm, pa: kaybeden.pa, ev: kaybeden.ev, hl: kaybeden.hl }), kayip0, "kaybın yok");
  assert.deepEqual([a.tk, b.tk], [tk0[0]! - 1, tk0[1]! - 1]);
  assert.equal(akce(k), para, "akçe yok");
  assert.deepEqual(r.deger.olaylar.map((o) => o.g).sort(), [a.o, b.o, c.o].sort(), "masadakiler ve iki taraf");
  const p = r.deger.olaylar[0]!.p;
  assert.equal(r.deger.olaylar[0]!.k, "olay.han.duello");
  assert.deepEqual([(p.kisi as { i: string }).i, (p.hedef as { i: string }).i, (p.kazanan as { i: string }).i, p.nam, p.masa], [a.o, b.o, kazanan.o, DUELLO_NAM, 1]);
  assert.deepEqual([p.kisiToplam, p.hedefToplam, p.kisiZar, p.hedefDovus], [beklenen.kisi.toplam, beklenen.hedef.toplam, beklenen.kisi.zar, beklenen.hedef.dovus]);
  assert.ok(r.deger.etki.soylenti.includes("hanDuello"));
  const sy = soylentiGorunumu(k, kazanan, "tr").find((s) => s.tur === "hanDuello");
  assert.ok(sy && sy.k === "soylenti.han.duello" && sy.etki > 0, "söylenti konusu kazanan, olumlu");
  assert.equal(soylentiGorunumu(k, kaybeden, "tr").some((s) => s.tur === "hanDuello"), false);
  assert.ok(hanOlayiIslendiMi(k, g.anahtar), "yeniden teslim süzgeci (motor anahtarı görürse uygulamaz)");
});

test("H6 nam aylık tavanı: kazananın bu ay kalan nam hakkı kadar yazılır", () => {
  const { k, a, b, kisiler } = kur();
  const g = kabul(a, b);
  const kazanan = duelloCoz(a, b, k.ay, g.anahtar).kazanan === "kisi" ? a : b;
  kazanan.ka = k.ay;
  kazanan.kn = [0, 0, NAM_AYLIK_TAVAN - 1, 0];
  const r = hanOlayiUygula(k, g, kisiler, k.ay);
  assert.ok(r.ok);
  assert.deepEqual(r.deger.etki.nam, { mertlik: 1 });
});

test("H6 mevsim farmı: aynı çift mevsimde bir kez nam ve söylenti; sonrakiler yalnız kayıt; yeni mevsimde yeniden", () => {
  const { k, a, b, kisiler } = kur();
  assert.equal(mevsimNo(11), mevsimNo(13), "Aralık–Şubat aynı kış");
  assert.notEqual(mevsimNo(13), mevsimNo(14));
  const ay = k.ay - (k.ay + 1) % 3; // mevsimin ilk ayı
  const ilk = hanOlayiUygula(k, kabul(a, b), kisiler, ay);
  assert.ok(ilk.ok);
  assert.ok((ilk.deger.etki.nam?.mertlik ?? 0) > 0);
  const tk = [a.tk, b.tk];
  // Aynı mevsim, ters yön (b meydan okur): çift sıralı olduğundan yine nam yok.
  const ikinci = hanOlayiUygula(k, kabul(b, a), kisiler, ay + 1);
  assert.ok(ikinci.ok);
  assert.equal(ikinci.deger.etki.engel, "mevsimde_bir");
  assert.equal(ikinci.deger.etki.nam, undefined);
  assert.deepEqual(ikinci.deger.etki.soylenti, []);
  assert.equal(ikinci.deger.olaylar[0]?.p.nam, 0, "olay yine yazılır");
  assert.ok(a.tk <= tk[0]! && b.tk <= tk[1]!);
  const yeni = hanOlayiUygula(k, kabul(a, b), kisiler, ay + 3);
  assert.ok(yeni.ok);
  assert.ok(yeni.deger.etki.nam !== undefined, "yeni mevsimde yeniden nam");
});

test("H6 kapılar: yaş, yerleşim süresi, ölü, aynı küme, takat → düello yok, 'gerçekleşmedi' tanıklığı ve neden", () => {
  const durum = (hazirla: (x: ReturnType<typeof kur>) => void, yasA?: number, yasB?: number) => {
    const x = kur(yasA, yasB);
    hazirla(x);
    const nm = [...x.a.nm, ...x.b.nm];
    const tk = [x.a.tk, x.b.tk];
    const r = hanOlayiUygula(x.k, kabul(x.a, x.b), x.kisiler, x.k.ay);
    assert.ok(r.ok);
    if (r.deger.etki.duello && "kapi" in r.deger.etki.duello) {
      assert.deepEqual([...x.a.nm, ...x.b.nm], nm, "nam değişmez");
      assert.equal(r.deger.olaylar[0]?.k, "olay.han.duelloOlmadi");
      assert.deepEqual([x.a.tk, x.b.tk], tk, "takat harcanmaz");
      return r.deger.olaylar[0]?.p.neden;
    }
    return "oldu";
  };
  assert.equal(durum(() => undefined, 15), "yas");
  assert.equal(durum(() => undefined, 20, 66), "yas");
  assert.equal(durum(() => undefined, 16, 65), "oldu");
  assert.equal(durum((x) => void (x.k.sakin.find((s) => s.o === x.b.o)!.gi = x.k.ay - DUELLO_YERLESIM_AY_EN_AZ + 1)), "sure");
  assert.equal(durum((x) => void (x.k.sakin.find((s) => s.o === x.b.o)!.gi = x.k.ay - DUELLO_YERLESIM_AY_EN_AZ)), "oldu");
  assert.equal(durum((x) => void (x.a.hd = { h: x.a.o, n: 1, s: 0, ol: x.k.ay })), "olu");
  assert.equal(durum((x) => {
    x.b.e = x.a.e;
  }), "ayni_kume");
  assert.equal(durum((x) => {
    x.a.tk = 0;
    x.a.ta = x.k.ay;
  }), "takat");
  assert.equal(girisAyi({ d: 100 }), 100 + 144, "eski kayıtta giriş = doğum + başlangıç yaşı");
});
