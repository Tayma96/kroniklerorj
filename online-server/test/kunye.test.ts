// Künye: oyuncu numarası (benzersiz, kalıcı, rastgele, hesaba bağlı), arama sınırları, oyuncu sayfası izin listesi.
import test from "node:test";
import assert from "node:assert/strict";
import { bellekDepo, type BellekDepo } from "../src/depo.ts";
import { ARAMA_SAYFA, adAra, imlecOku, numaraAdTazele, numaraAl, numaraBul, numaraCoz, numaraUret, type Listeleyici } from "../src/kunye/numara.ts";
import { KUNYE_ALANLARI, durumKovasi, kunyeGorunumu } from "../src/kunye/gorunum.ts";
import { AD_ARAMA_EN_AZ, ARAMA_GUNLUK_SINIRI, NUMARA_ISKA_GUNLUK, SAYFA_ALANLARI, SONUC_ALANLARI, benimNumaram, oyuncuAra, oyuncuSayfasi, type KunyeBaglami } from "../src/kunye/hesap.ts";
import { PROFIL_ANAHTARI } from "../src/mantik.ts";
import { devirHesapla, devirUygula } from "../src/yerlesim/devir.ts";
import { oyuncuOlumu } from "../src/yerlesim/yaslilik.ts";
import { basarili, hata, type DunyaIleti, type Profil, type Sonuc, type YerlesimIleti } from "../src/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";
import { cocukEkle, npcIleEvlendir } from "./hanedan-yardimci.ts";

/** Tohumlu, tekrarlanabilir bayt kaynağı (testte; üretimde crypto.getRandomValues). */
function sirali(tohum = 1) {
  let s = tohum >>> 0;
  return (n: number) => {
    const b = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      b[i] = s >>> 24;
    }
    return b;
  };
}

function listeleyici(d: BellekDepo): Listeleyici {
  return async <T,>(onek: string, sinir: number, sonra?: string) => {
    const a = [...d.veri.keys()].filter((k) => k.startsWith(onek) && (sonra === undefined || k > sonra)).sort().slice(0, sinir);
    return new Map(a.map((k) => [k, structuredClone(d.veri.get(k)) as T]));
  };
}

function profil(hesapId: string, ad: string, yerlesim = "develi"): Profil {
  return { hesapId, ad, cinsiyet: "kadın", beylik: "demirhan", yerlesim, dogumAyi: 0, olusturma: 0 };
}

test("numara: 8 hane, başında 0 yok, biçim çözümü", () => {
  const r = sirali(7);
  for (let i = 0; i < 2000; i++) {
    const n = numaraUret(r)!;
    assert.ok(n >= 10_000_000 && n <= 99_999_999, String(n));
    assert.equal(String(n).length, 8);
  }
  assert.equal(numaraCoz("1234 5678"), 12345678);
  assert.equal(numaraCoz("1234-5678"), 12345678);
  assert.equal(numaraCoz("01234567"), undefined);
  assert.equal(numaraCoz("1234567"), undefined);
  assert.equal(numaraCoz("123456789"), undefined);
  assert.equal(numaraCoz("1234567a"), undefined);
  assert.equal(numaraCoz(undefined), undefined);
});

test("numara: hesaba kalıcı, tekrar güvenli, benzersiz; çakışmada yeniden dener; sıralı değil", async () => {
  const d = bellekDepo();
  const r = sirali(3);
  const nolar = new Map<string, number>();
  for (let i = 0; i < 500; i++) {
    const a = await numaraAl(d, `hesap-${i}`, r);
    assert.ok(a.ok);
    nolar.set(`hesap-${i}`, a.deger.numara);
  }
  assert.equal(new Set(nolar.values()).size, 500, "benzersiz");
  for (const [h, n] of nolar) {
    const b = await numaraAl(d, h, sirali(99));
    assert.ok(b.ok);
    assert.equal(b.deger.numara, n, "aynı hesap aynı numara");
  }
  // Ardışık hesapların numaraları ardışık değildir.
  const dizi = [...nolar.values()];
  const ardisik = dizi.slice(1).filter((n, i) => Math.abs(n - dizi[i]!) <= 1).length;
  assert.equal(ardisik, 0);
  // Çakışma: aynı tohumla yeni depoda ilk numara önce başkasına verilir; ikinci hesap farklısını alır.
  const d2 = bellekDepo();
  const ilk = await numaraAl(d2, "a", sirali(5));
  const ikinci = await numaraAl(d2, "b", sirali(5));
  assert.ok(ilk.ok && ikinci.ok);
  assert.notEqual(ilk.deger.numara, ikinci.deger.numara);
  // Hep aynı numarayı veren kaynak tükenir: hata, yazım yok.
  const sabit = () => new Uint8Array([10, 20, 30, 40]);
  const d3 = bellekDepo();
  assert.ok((await numaraAl(d3, "x", sabit)).ok);
  const boyut = d3.veri.size;
  assert.deepEqual(await numaraAl(d3, "y", sabit), hata("sunucu_hatasi"));
  assert.equal(d3.veri.size, boyut);
});

test("numara iç kimlik sızdırmaz: numaraBul yanıtı ve imleç hesap kimliği taşımaz (HesapDO süzer)", async () => {
  const d = bellekDepo();
  await d.koy({ "kayit:gizli-hesap-kimligi": profil("gizli-hesap-kimligi", "Ayşe Hatun") });
  const n = await numaraAl(d, "gizli-hesap-kimligi", sirali(11));
  assert.ok(n.ok);
  assert.ok(!String(n.deger.numara).includes("gizli"));
  const a = await adAra(d, listeleyici(d), "ayş", null, 1);
  assert.ok(a.ok);
  assert.equal(a.deger.sonuclar.length, 1);
  assert.equal(a.deger.imlec, null);
  // Sayfa sınırı ve imleç
  for (let i = 0; i < 12; i++) {
    await d.koy({ [`kayit:h${i}`]: profil(`h${i}`, `Aysel${String.fromCharCode(97 + i)}`) });
    assert.ok((await numaraAl(d, `h${i}`, sirali(100 + i))).ok);
  }
  const s1 = await adAra(d, listeleyici(d), "AYSEL", null);
  assert.ok(s1.ok);
  assert.equal(s1.deger.sonuclar.length, ARAMA_SAYFA);
  assert.ok(s1.deger.imlec);
  assert.ok(!imlecOku(s1.deger.imlec!)!.includes("h"), "imleç ad + numaradır");
  const s2 = await adAra(d, listeleyici(d), "aysel", s1.deger.imlec);
  assert.ok(s2.ok);
  assert.equal(s2.deger.sonuclar.length, 2);
  assert.equal(s2.deger.imlec, null);
  const hepsi = [...s1.deger.sonuclar, ...s2.deger.sonuclar].map((x) => x.ad);
  assert.equal(new Set(hepsi).size, 12);
  // Başka önekin imleci reddedilir.
  assert.deepEqual(await adAra(d, listeleyici(d), "ayşe", s1.deger.imlec), hata("gecersiz_istek"));
});

test("vâris: hesap aynı numarayı korur; ad dizini yeni adla tazelenir, eski ad aramada çıkmaz", async () => {
  const k = testKasabasi("develi", 0);
  const kar = oyuncuEkle(k, 1, k.ay - 70 * 12);
  npcIleEvlendir(k, kar);
  cocukEkle(k, kar, 30, 0);
  const d = bellekDepo();
  await d.koy({ "kayit:hesap-1": profil("hesap-1", kar.ad) });
  const once = await numaraAl(d, "hesap-1", sirali(21));
  assert.ok(once.ok);
  const g1 = kunyeGorunumu(k, kar, 0, "tr");
  oyuncuOlumu(k, kar, k.ay);
  const plan = devirHesapla(k, kar.o, undefined, k.ay);
  assert.ok(plan.ok);
  const u = devirUygula(k, plan.deger, k.ay);
  assert.ok(u.ok);
  const s = k.sakin.find((x) => x.h === "hesap-1")!;
  const varis = k.kar.get(s.o)!;
  const g2 = kunyeGorunumu(k, varis, 0, "tr");
  assert.notEqual(g2.ad, g1.ad);
  assert.notEqual(g2.kisi.id, g1.kisi.id);
  assert.equal(g2.hanedan.soyad, g1.hanedan.soyad);
  assert.equal(g2.hanedan.nesil, 2);
  assert.deepEqual(await numaraAdTazele(d, "hesap-1", g2.ad), basarili({ tazelendi: true }));
  assert.deepEqual(await numaraAdTazele(d, "hesap-1", g2.ad), basarili({ tazelendi: false }), "tekrar güvenli");
  const sonra = await numaraAl(d, "hesap-1", sirali(77));
  assert.ok(sonra.ok);
  assert.equal(sonra.deger.numara, once.deger.numara);
  const b = await numaraBul(d, String(once.deger.numara));
  assert.ok(b.ok);
  assert.equal(b.deger.ad, g2.ad);
  const yeni = await adAra(d, listeleyici(d), g2.ad, null);
  assert.ok(yeni.ok);
  assert.equal(yeni.deger.sonuclar.length, 1);
  const eski = await adAra(d, listeleyici(d), g1.ad, null);
  assert.ok(eski.ok);
  assert.equal(eski.deger.sonuclar.filter((x) => x.hesapId === "hesap-1").length, 0);
});

test("künye görünümü yalnız izin listesindeki alanları döndürür; özel veri yok", () => {
  const k = testKasabasi("develi", 0);
  const kar = oyuncuEkle(k, 1);
  kar.pa = 987654;
  kar.ev = { odun: 31337 };
  const g = kunyeGorunumu(k, kar, 1000, "tr");
  assert.deepEqual(Object.keys(g).sort(), [...KUNYE_ALANLARI].sort());
  const metin = JSON.stringify(g);
  for (const yasak of ["987654", "31337", "odun", "hesap-1", "takat", "\"pa\"", "\"ev\"", "beceri"]) assert.ok(!metin.includes(yasak), yasak);
  assert.equal(durumKovasi(0, 5), "uzak");
  assert.equal(durumKovasi(1000, 1000 + 60_000), "simdi");
  assert.equal(durumKovasi(1000, 1000 + 2 * 3600_000), "bugun");
  assert.equal(durumKovasi(1000, 1000 + 3 * 86400_000), "uzak");
});

/** HesapDO bağlamı: dünya gerçek numara işlevleriyle, yerleşim sahte (engel + künye). */
function baglam(dunyaDepo: BellekDepo, hesapId: string, ayar: { engel?: string[]; simdi?: number } = {}) {
  const depo = bellekDepo();
  const cagrilar: string[] = [];
  const dunya = async (i: DunyaIleti): Promise<Sonuc<unknown>> => {
    cagrilar.push(i.islem);
    if (i.islem === "numaraAl") return numaraAl(dunyaDepo, i.hesapId, sirali(hesapId.length * 31 + 7));
    if (i.islem === "numaraBul") return numaraBul(dunyaDepo, i.numara);
    if (i.islem === "adAra") return adAra(dunyaDepo, listeleyici(dunyaDepo), i.onek, i.imlec);
    if (i.islem === "numaraAdTazele") return numaraAdTazele(dunyaDepo, i.hesapId, i.ad);
    return hata("gecersiz_istek");
  };
  const k = testKasabasi("develi", 0);
  const yerlesim = async (i: YerlesimIleti): Promise<Sonuc<unknown>> => {
    cagrilar.push(i.islem);
    if (i.islem === "engeller") return basarili({ engeller: ayar.engel ?? [] });
    if (i.islem === "kunye") {
      const p = await dunyaDepo.al<Profil>(`kayit:${i.hesapId}`);
      const kar = oyuncuEkle(k, k.sakin.length + 1);
      kar.ad = p!.ad;
      kar.pa = 4242;
      return basarili({ ...kunyeGorunumu(k, kar, 0, "tr"), para: 4242 });
    }
    return hata("gecersiz_istek");
  };
  const b: KunyeBaglami = { depo, hesapId, simdi: ayar.simdi ?? 1_000_000, dunya, yerlesim };
  return { b, depo, cagrilar };
}

async function oyuncuKur(dunyaDepo: BellekDepo, hesapId: string, ad: string, yerlesim = "develi") {
  const p = profil(hesapId, ad, yerlesim);
  await dunyaDepo.koy({ [`kayit:${hesapId}`]: p });
  const n = await numaraAl(dunyaDepo, hesapId, sirali(hesapId.length * 31 + 7));
  assert.ok(n.ok);
  return { p, numara: n.deger.numara };
}

test("kendi numaran: tembel, önbellekli, tekrar güvenli", async () => {
  const dd = bellekDepo();
  const { b, cagrilar } = baglam(dd, "hesap-ben");
  const a = await benimNumaram(b);
  const c = await benimNumaram(b);
  assert.ok(a.ok && c.ok);
  assert.equal(a.deger.numara, c.deger.numara);
  assert.deepEqual(cagrilar, ["numaraAl"], "ikinci çağrı dünyaya gitmez");
});

test("arama: en az karakter, biçim, ıska tavanı, günlük tavan, engel süzgeci, sonuç alanları", async () => {
  const dd = bellekDepo();
  const hedef = await oyuncuKur(dd, "hesap-hedef", "Kerem Usta");
  await oyuncuKur(dd, "hesap-engelli", "Kerime");
  const { b, depo } = baglam(dd, "hesap-ara", { engel: ["hesap-engelli"] });
  assert.deepEqual(await oyuncuAra(b, { ad: "Kerem" }), hata("profil_yok"));
  await depo.koy({ [PROFIL_ANAHTARI]: profil("hesap-ara", "Arayan") });
  assert.equal(AD_ARAMA_EN_AZ, 3);
  assert.deepEqual(await oyuncuAra(b, { ad: "Ke" }), hata("arama_kisa"));
  assert.deepEqual(await oyuncuAra(b, { ad: "  K e " }), hata("arama_kisa"));
  assert.deepEqual(await oyuncuAra(b, { no: "0123" }), hata("numara_gecersiz"));
  const ad = await oyuncuAra(b, { ad: "ker" });
  assert.ok(ad.ok);
  assert.deepEqual(ad.deger.sonuclar.map((x) => x.ad), ["Kerem Usta"], "engelli süzülür");
  for (const x of ad.deger.sonuclar) assert.deepEqual(Object.keys(x).sort(), [...SONUC_ALANLARI]);
  const no = await oyuncuAra(b, { no: String(hedef.numara) });
  assert.ok(no.ok);
  assert.equal(no.deger.sonuclar[0]!.numara, hedef.numara);
  assert.ok(!JSON.stringify(no.deger).includes("hesap-"), "hesap kimliği dönmez");
  // Numara taraması: ıskalar sayılır, tavanda numara sorgusu kapanır (ad araması sürer).
  let n = 10_000_000;
  let iska = 0;
  while (iska < NUMARA_ISKA_GUNLUK) {
    const r = await oyuncuAra(b, { no: String(n++) });
    assert.ok(r.ok);
    if (r.deger.sonuclar.length === 0) iska++;
  }
  assert.deepEqual(await oyuncuAra(b, { no: String(hedef.numara) }), hata("arama_siniri"));
  assert.deepEqual(await oyuncuSayfasi(b, String(hedef.numara), "tr"), hata("arama_siniri"));
  assert.ok((await oyuncuAra(b, { ad: "ker" })).ok);
  // Ertesi gün sıfırlanır.
  const ertesi = { ...b, simdi: b.simdi + 24 * 3600_000 };
  assert.ok((await oyuncuAra(ertesi, { no: String(hedef.numara) })).ok);
  // Günlük toplam tavan.
  await depo.koy({ aramaIz: { g: Math.floor(ertesi.simdi / 86400_000), s: ARAMA_GUNLUK_SINIRI, i: 0 } });
  assert.deepEqual(await oyuncuAra(ertesi, { ad: "ker" }), hata("arama_siniri"));
});

test("oyuncu sayfası: alanlar izin listesiyle birebir, özel veri yok, engelde kisi_yok, ad dizini tazelenir", async () => {
  const dd = bellekDepo();
  const hedef = await oyuncuKur(dd, "hesap-hedef", "Kerem");
  const engelli = await oyuncuKur(dd, "hesap-engelli", "Kerime");
  const uzak = await oyuncuKur(dd, "hesap-uzak", "Zeynep", "misis");
  const { b, depo, cagrilar } = baglam(dd, "hesap-bakan", { engel: ["hesap-engelli"] });
  await depo.koy({ [PROFIL_ANAHTARI]: profil("hesap-bakan", "Bakan") });
  const s = await oyuncuSayfasi(b, String(hedef.numara), "tr");
  assert.ok(s.ok);
  assert.deepEqual(Object.keys(s.deger).sort(), SAYFA_ALANLARI);
  assert.equal(s.deger.numara, hedef.numara);
  assert.equal(s.deger.ben, false);
  assert.equal(s.deger.ayniYerlesim, true);
  assert.ok(!JSON.stringify(s.deger).includes("4242"), "akçe sızmaz");
  assert.ok(!JSON.stringify(s.deger).includes("hesap-"), "hesap kimliği sızmaz");
  assert.deepEqual(await oyuncuSayfasi(b, String(engelli.numara), "tr"), hata("kisi_yok"));
  // Başka yerleşimdeki oyuncu: engel sorulmaz.
  cagrilar.length = 0;
  const u = await oyuncuSayfasi(b, String(uzak.numara), "tr");
  assert.ok(u.ok);
  assert.equal(u.deger.ayniYerlesim, false);
  assert.ok(!cagrilar.includes("engeller"));
  assert.deepEqual(await oyuncuSayfasi(b, "1234", "tr"), hata("numara_gecersiz"));
  // Ad değişmişse (vâris) dizin tazelenir.
  await dd.koy({ "kayit:hesap-hedef": profil("hesap-hedef", "Kerem Oğlu Ali") });
  cagrilar.length = 0;
  assert.ok((await oyuncuSayfasi(b, String(hedef.numara), "tr")).ok);
  assert.ok(cagrilar.includes("numaraAdTazele"));
  const bul = await numaraBul(dd, String(hedef.numara));
  assert.ok(bul.ok);
  assert.equal(bul.deger.ad, "Kerem Oğlu Ali");
});
