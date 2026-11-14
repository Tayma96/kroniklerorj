// Han eksikleri H1–H5 (saf ve HesapDO köprüsü): keşif sırası, masa ayarı, sohbet filtresi ve yeni hesap sınırı,
// müdavim plakası, masa olayının yerleşime giden kutusu.
import test from "node:test";
import assert from "node:assert/strict";
import { bellekDepo } from "../src/depo.ts";
import { MASKE, sohbetMaskele, yasakSozcukMu } from "../src/han/filtre.ts";
import { eylemGirdisiCoz } from "../src/han/eylem.ts";
import {
  hanEylemi,
  hanListesi,
  masaBileti,
  OLAY_KUYRUK,
  type HanHesapBaglami,
  type HanOlayiBekleyen,
  type HanOlayiGovdesi,
} from "../src/han/hesap-kopru.ts";
import {
  ILETI_EN_UZUN,
  iletiMetniCoz,
  iletiSiniri,
  KOLTUK_SAYISI,
  masaSirala,
  VARSAYILAN_AYAR,
  YENI_HESAP_ILETI,
  YENI_HESAP_MS,
} from "../src/han/kurallar.ts";
import { baglan, iletiIsle, type MasaBaglami } from "../src/han/masa.ts";
import type { MasaIcOzeti, MasaIleti, MasaOlayi, MasaOzeti } from "../src/han/tipler.ts";
import { basarili, hata, HATA_DURUMU, type Sonuc } from "../src/tipler.ts";
import { bilet, sahteMasa, sahteSoket, type SahteSoket } from "./han-yardimci.ts";

const SIMDI = 1_800_000_000_000;
type Masa = ReturnType<typeof sahteMasa>;

function gir(m: Masa, hesap: string, ek: Partial<ReturnType<typeof bilet>> = {}): SahteSoket {
  const s = sahteSoket();
  baglan(m.baglam(), s, { ...bilet(hesap, hesap.toUpperCase()), ...ek });
  m.soketler.push(s);
  return s;
}

function yolla(m: Masa, s: SahteSoket, ileti: unknown, ek: Partial<MasaBaglami> = {}): Promise<void> {
  return iletiIsle({ ...m.baglam(), ...ek }, s, JSON.stringify(ileti));
}

async function oturt(m: Masa, ...soketler: SahteSoket[]): Promise<void> {
  for (const s of soketler) {
    await yolla(m, s, { t: "otur" });
    m.ileri(1);
  }
}

// ---------------------------------------------------------------- H1

function oz(no: number, oturan: number, tanidik = 0): MasaOzeti {
  return { no, oturan, tanidik, ayakta: 0, sira: 0, ayar: { ...VARSAYILAN_AYAR } };
}

test("H1 keşif sırası: tanıdık (çoktan aza) → oturanı olup yeri olan → boş → dolu; eşitlikte masa no", () => {
  const sirali = masaSirala([oz(1, 0), oz(2, KOLTUK_SAYISI), oz(3, 2), oz(4, 1, 1), oz(5, KOLTUK_SAYISI, 3), oz(6, 0), oz(7, 3)]);
  assert.deepEqual(sirali.map((m) => m.no), [5, 4, 3, 7, 1, 6, 2]);
});

function hanDeposu() {
  const depo = bellekDepo();
  return depo.koy({ profil: { hesapId: "ali", ad: "Ali", cinsiyet: "erkek", beylik: "demirhan", yerlesim: "kizilca", dogumAyi: 0, olusturma: 0 } }).then(() => depo);
}

test("H1 han listesi: tanıdık sayısı yalnız sayı olarak gider (kimlik yok), sıralı döner; yerleşim hatası listeyi bozmaz", async () => {
  const depo = await hanDeposu();
  const oturanlar: Record<string, string[]> = { "masa:kizilca:menzil:1": ["yabanci"], "masa:kizilca:menzil:2": ["ali", "dost", "hane"] };
  let tanidikHata = false;
  const b: HanHesapBaglami = {
    depo,
    hesapId: "ali",
    simdi: SIMDI,
    yaptirim: undefined,
    masaCagir: async (ad, i) => {
      const o = oturanlar[ad] ?? [];
      return basarili({ no: (i as { no: number }).no, oturan: o.length, ayakta: 0, sira: 0, ayar: { ...VARSAYILAN_AYAR }, oturanlar: o } satisfies MasaIcOzeti);
    },
    ikramOde: async () => hata("gecersiz_istek"),
    tanidikSor: async () => {
      if (tanidikHata) throw new Error("yerleşim yok");
      return basarili({ hesaplar: ["dost", "hane", "baska"] });
    },
  };
  const r = await hanListesi(b, "tr");
  assert.ok(r.ok);
  assert.deepEqual(r.deger.masalar.map((m) => [m.no, m.tanidik]), [[2, 2], [1, 0]], "kendisi sayılmaz; tanıdık masası önde");
  assert.equal(JSON.stringify(r.deger).includes("dost"), false, "oturan kimlikleri istemciye gitmez");
  assert.equal("oturanlar" in (r.deger.masalar[0] as object), false);
  tanidikHata = true;
  const r2 = await hanListesi(b, "tr");
  assert.ok(r2.ok, "tanıdık sorgusu düşerse liste yine döner");
  assert.deepEqual(r2.deger.masalar.map((m) => m.tanidik), [0, 0]);
});

// ---------------------------------------------------------------- H2

test("H2 masa ayarı: yalnız masa başı; kilitliyken yeni oturan/sıra yok, ayakta dinleme sürer; herkese durum", async () => {
  const m = sahteMasa();
  const a = gir(m, "ali");
  const v = gir(m, "veli");
  await oturt(m, a, v);
  await yolla(m, v, { t: "ayar", kilitli: true });
  assert.equal(v.son("hata")?.hata, "yetki_yok");
  await yolla(m, a, { t: "ayar" });
  assert.equal(a.son("hata")?.hata, "gecersiz_istek", "en az bir alan");
  await yolla(m, a, { t: "ayar", kilitli: "evet" });
  assert.equal(a.son("hata")?.hata, "gecersiz_istek");
  assert.equal(m.ayarYazimlari.length, 0);

  await yolla(m, a, { t: "ayar", kilitli: true, kavgaYasak: true });
  assert.deepEqual(m.ayarYazimlari.at(-1), { ...m.ayar, kilitli: true, kavgaYasak: true });
  assert.equal(v.son("durum")?.masa.ayar.kilitli, true, "herkese yayınlanır");
  assert.equal(v.son("durum")?.masa.ayar.kavgaYasak, true);

  const c = gir(m, "can");
  assert.ok(c.son("hosgeldin"), "kilitli masada ayakta dinlenir");
  await yolla(m, c, { t: "otur" });
  assert.equal(c.son("hata")?.hata, "masa_kilitli");
  assert.equal(c.ek()?.s, null, "sıraya da giremez");
  assert.equal(HATA_DURUMU.masa_kilitli, 409);

  // Oturanlar etkilenmez; kalkan yeniden oturamaz (yeni oturma).
  await yolla(m, v, { t: "kalk" });
  await yolla(m, v, { t: "otur" });
  assert.equal(v.son("hata")?.hata, "masa_kilitli");

  // Son oturan kalkınca masa başı ayarları varsayılana döner.
  await yolla(m, a, { t: "kalk" });
  assert.deepEqual(m.ayar, VARSAYILAN_AYAR_SAHTE(m));
  assert.equal(c.son("durum")?.masa.ayar.kilitli, false);
  await yolla(m, c, { t: "otur" });
  assert.equal(c.ek()?.k, 0, "boş masa kilitli kalmaz");
});

/** sahteMasa'nın tür/açık alanları korunur, masa başı alanları varsayılana döner. */
function VARSAYILAN_AYAR_SAHTE(m: Masa) {
  return { ...m.ayar, kavgaYasak: VARSAYILAN_AYAR.kavgaYasak, kilitli: VARSAYILAN_AYAR.kilitli, sesli: VARSAYILAN_AYAR.sesli };
}

test("H2 kilitli masada sıra ilerlemez; kilit açılınca boş koltuğa sıradaki oturur", async () => {
  const m = sahteMasa();
  const oturan: SahteSoket[] = [];
  for (let i = 0; i < KOLTUK_SAYISI; i++) oturan.push(gir(m, `o${i}`));
  await oturt(m, ...oturan);
  const bekleyen = gir(m, "bekleyen");
  await oturt(m, bekleyen);
  assert.ok(bekleyen.ek()?.s, "sırada");
  await yolla(m, oturan[0]!, { t: "ayar", kilitli: true });
  await yolla(m, oturan[3]!, { t: "kalk" });
  assert.equal(bekleyen.ek()?.k, null, "kilitliyken boşalan koltuğa geçmez");
  await yolla(m, oturan[0]!, { t: "ayar", kilitli: false });
  assert.equal(bekleyen.ek()?.k, 3, "kilit açılınca oturur");
});

test("H2 sesli:false açık yayınları ses kapatma yoluyla kapatır ve ses durumunu yayınlar", async () => {
  const m = sahteMasa();
  m.ayar = { ...m.ayar, sesli: true };
  const a = gir(m, "ali");
  const v = gir(m, "veli");
  await oturt(m, a, v);
  const ek = v.ek()!;
  ek.ses = { o: "oturum-v", i: "iz-v", d: "mid-v" };
  v.ekYaz(ek);
  const kapanan: string[] = [];
  const sesBaglami = { sesYapilandi: true, sesKapat: (o: string, d: string) => void kapanan.push(`${o}/${d}`) };
  await yolla(m, a, { t: "ayar", sesli: false }, sesBaglami);
  assert.deepEqual(kapanan, ["oturum-v/mid-v"]);
  assert.equal(v.ek()?.ses?.i, undefined);
  const ses = v.son("sesDurum")?.ses;
  assert.deepEqual([ses?.acik, ses?.neden, ses?.yayin.length], [false, "masa_sessiz", 0]);
});

test("H2 eski kayıtlı ayarda kilitli yoksa false sayılır (varsayılanla birleşir)", () => {
  const eski = { tur: "acik", acik: true, sesli: true, kavgaYasak: true };
  assert.equal({ ...VARSAYILAN_AYAR, ...eski }.kilitli, false);
});

// ---------------------------------------------------------------- H3

test("H3 küfür maskesi 6 dilde: yalnız eşleşen sözcük maskelenir, ileti reddedilmez", () => {
  assert.equal(sohbetMaskele("Hey orospu çocuğu, gel!"), `Hey ${MASKE} çocuğu, gel!`);
  assert.equal(sohbetMaskele("what the FUCK man"), `what the ${MASKE} man`);
  assert.equal(sohbetMaskele("eres un pendejo"), `eres un ${MASKE}`);
  assert.equal(sohbetMaskele("que merda é essa"), `que ${MASKE} é essa`);
  assert.equal(sohbetMaskele("يا شرموطة"), `يا ${MASKE}`);
  assert.equal(sohbetMaskele("ты сука"), `ты ${MASKE}`);
  assert.equal(sohbetMaskele("fuuuuck"), MASKE, "harf tekrarı daraltılır");
  assert.equal(sohbetMaskele("s1kt1r git"), `${MASKE} git`, "rakam kaçamağı");
  assert.equal(sohbetMaskele("SİKTİR"), MASKE, "Türkçe büyük harf (İ→i)");
});

test("H3 Scunthorpe: masum sözcükler maskelenmez (sözcük sınırı)", () => {
  const masum = "Kasap dükkânında class, assassin, Scunthorpe, sık sık sikke, sıkıntı, amin, got it, pic, shiitake, niggle, sukno, cono";
  assert.equal(sohbetMaskele(masum), masum);
  for (const s of ["kasap", "class", "sıkı", "sikke", "assassin", "Scunthorpe", "göz", "pikap", "amin"]) {
    assert.equal(yasakSozcukMu(s), false, s);
  }
});

test("H3 sohbet ve şart metni maskelenir; yeni hesap (24 sa) iletisi en çok 120 harf", async () => {
  const r = iletiMetniCoz("selam pezevenk");
  assert.deepEqual(r, basarili(`selam ${MASKE}`));
  const e = eylemGirdisiCoz({ masa: 1, tur: "yemin", sart: "bu yavşak adına yemin", istekNo: "yemin-0000001" });
  assert.ok(e.ok);
  assert.equal(e.deger.sart, `bu ${MASKE} adına yemin`);

  assert.equal(iletiSiniri(SIMDI - YENI_HESAP_MS + 1, SIMDI), YENI_HESAP_ILETI);
  assert.equal(iletiSiniri(SIMDI - YENI_HESAP_MS, SIMDI), ILETI_EN_UZUN);
  assert.equal(iletiSiniri(undefined, SIMDI), ILETI_EN_UZUN);

  const m = sahteMasa();
  const yeni = gir(m, "yeni", { ho: m.simdi - 60_000 });
  const eski = gir(m, "eski", { ho: m.simdi - YENI_HESAP_MS - 1 });
  await oturt(m, yeni, eski);
  await yolla(m, yeni, { t: "yaz", metin: "a".repeat(YENI_HESAP_ILETI + 1) });
  assert.equal(yeni.son("hata")?.hata, "metin_gecersiz", "mevcut çok uzun hatası");
  await yolla(m, yeni, { t: "yaz", metin: "a".repeat(YENI_HESAP_ILETI) });
  assert.equal(eski.son("ileti")?.metin.length, YENI_HESAP_ILETI);
  await yolla(m, eski, { t: "yaz", metin: "b".repeat(YENI_HESAP_ILETI + 1) });
  assert.equal(yeni.son("ileti")?.metin.length, YENI_HESAP_ILETI + 1, "eski hesap tam sınır");
  await yolla(m, eski, { t: "yaz", metin: "kahpe" });
  assert.equal(yeni.son("ileti")?.metin, MASKE);
});

// ---------------------------------------------------------------- H3/H4 bilet

test("H4 bilet: müdavim rozeti plakada, hesap oluşturma anı HesapDO'dan; plakada görünür", async () => {
  const depo = await hanDeposu();
  const b: HanHesapBaglami = {
    depo,
    hesapId: "ali",
    simdi: SIMDI,
    yaptirim: undefined,
    masaCagir: async () => basarili({}),
    ikramOde: async () => hata("gecersiz_istek"),
    engelSor: async () => basarili({ engeller: [], mudavim: true }),
    hesapOlusturma: async () => SIMDI - 1000,
  };
  const r = await masaBileti(b, 1);
  assert.ok(r.ok);
  assert.deepEqual(r.deger.plaka, { hesap: "ali", ad: "Ali", mudavim: true });
  assert.equal(r.deger.ho, SIMDI - 1000);
  const r2 = await masaBileti({ ...b, engelSor: async () => basarili({ engeller: [] }), hesapOlusturma: undefined }, 1);
  assert.ok(r2.ok);
  assert.deepEqual(r2.deger.plaka, { hesap: "ali", ad: "Ali" });
  assert.equal("ho" in r2.deger, false);

  const m = sahteMasa();
  const a = gir(m, "ali", { plaka: { hesap: "ali", ad: "Ali", mudavim: true } });
  assert.deepEqual(a.son("hosgeldin")?.ben, { hesap: "ali", ad: "Ali", mudavim: true });
});

// ---------------------------------------------------------------- H5 giden kutusu

test("H5 giden kutusu: teslim edilemeyen olay eylemi bozmaz, sonraki eylemde yeniden denenir; mantıksal ret düşer", async () => {
  const depo = await hanDeposu();
  let no = 0;
  const teslim: HanOlayiGovdesi[] = [];
  let ag = false;
  let ret = false;
  const b: HanHesapBaglami = {
    depo,
    hesapId: "ali",
    simdi: SIMDI,
    yaptirim: undefined,
    masaCagir: async (ad, i: MasaIleti) => {
      no++;
      const olay: MasaOlayi = { no, masa: ad, tur: "meydanOku", kim: "ali", hedef: "veli", zaman: SIMDI, katilim: ["ali", "veli"] };
      void i;
      return basarili({ olay }) as Sonuc<unknown>;
    },
    ikramOde: async () => hata("gecersiz_istek"),
    hanOlayiGonder: async (_y, g) => {
      if (ag) throw new Error("ağ");
      if (ret) return hata("sakin_yok");
      teslim.push(g);
      return basarili({});
    },
  };
  ag = true;
  const e1 = await hanEylemi(b, { masa: 1, tur: "meydanOku", hedef: "veli", istekNo: "eylem-0000001" });
  assert.ok(e1.ok, "yerleşim yanıt vermese de eylem başarılı");
  assert.equal((await depo.al<HanOlayiBekleyen[]>(OLAY_KUYRUK))?.length, 1, "olay kuyrukta bekler");
  ag = false;
  // Aynı istekNo tekrarı da kuyruğu boşaltır (masa yeniden çağrılmaz).
  const e1b = await hanEylemi(b, { masa: 1, tur: "meydanOku", hedef: "veli", istekNo: "eylem-0000001" });
  assert.deepEqual(e1b, e1);
  assert.equal(no, 1);
  assert.deepEqual(teslim.map((t) => t.anahtar), ["masa:kizilca:menzil:1#1"]);
  assert.equal(await depo.al(OLAY_KUYRUK), undefined);
  const e2 = await hanEylemi(b, { masa: 1, tur: "meydanOku", hedef: "veli", istekNo: "eylem-0000002" });
  assert.ok(e2.ok);
  assert.deepEqual(teslim.map((t) => t.anahtar), ["masa:kizilca:menzil:1#1", "masa:kizilca:menzil:1#2"]);
  ret = true;
  const e3 = await hanEylemi(b, { masa: 1, tur: "meydanOku", hedef: "veli", istekNo: "eylem-0000003" });
  assert.ok(e3.ok);
  assert.equal(await depo.al(OLAY_KUYRUK), undefined, "mantıksal ret kuyrukta tıkanmaz");
});
