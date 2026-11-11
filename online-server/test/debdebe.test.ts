// Debdebe (Faz 11 + 15): katalog, cosmetic ayrımı (oyun modülleri içe aktaramaz), satın alma idempotentliği ve iadesi,
// kuşanma, Debdebe armağanı + teveccüh + rozet, süre kısaltma bağlantısı, Sezon Defteri, levha ve Y3 iade uçları.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import isleyici, { DunyaDO, HesapDO, YerlesimDO, YonetimDO } from "../src/index.ts";
import type { Env } from "../src/tipler.ts";
import { bosCosmetic, iadeUygula, kusan, satinAlimUygula, gorunenler } from "../src/debdebe/cosmetic.ts";
import { KATALOG, urunPuani, seviyeAdi, type UrunId } from "../src/debdebe/katalog.ts";
import { makbuzDenetle } from "../src/debdebe/makbuz.ts";
import { denePaketi } from "../src/debdebe/dene.ts";
import { sezonIlerle, sezonKaydi, SEZON_GUNLUK_TAVAN } from "../src/debdebe/sezon.ts";
import { beceriHizlandir, DEBDEBE_KISALTMA_EN_COK } from "../src/yerlesim/beceri.ts";
import type { Karakter } from "../src/yerlesim/tipler.ts";
import type { Depo } from "../src/depo.ts";
import { plakaCerçevesi } from "../src/debdebe/hesap.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";
import { makbuz, sahteDogrulayici } from "./debdebe-yardimci.ts";

const T0 = Date.UTC(2026, 10, 10, 12);
const b = (islem: string, urun: UrunId, ek: Record<string, unknown> = {}) => ({ magaza: "google" as const, islemKimligi: islem, urunKimligi: `debdebe_${urun}`, durum: "odendi" as const, zaman: T0, ...ek });

test("katalog: satılık her ürünün kademesi var, paralı kutu yok, puan kademeden", () => {
  for (const [id, u] of Object.entries(KATALOG)) {
    if ("ayanOzel" in u || "sezonOdulu" in u) assert.equal("kademe" in u, false, id);
    else assert.ok("kademe" in u, id);
    assert.notEqual(u.tur as string, "kutu");
  }
  assert.equal(urunPuani("cerceve_oymali"), 199);
  assert.equal(seviyeAdi(0), null);
  assert.equal(seviyeAdi(199), "bakir");
});

test("cosmetic: oyun hesaplayan modüller src/debdebe içe aktarmaz ve cosmetic alanını okumaz", () => {
  const kok = new URL("../src/", import.meta.url).pathname;
  const dosyalar: string[] = [];
  const gez = (d: string) => {
    for (const a of readdirSync(d)) {
      const y = join(d, a);
      if (statSync(y).isDirectory()) gez(y);
      else if (y.endsWith(".ts")) dosyalar.push(y);
    }
  };
  for (const d of ["yerlesim", "han", "icerik"]) gez(join(kok, d));
  dosyalar.push(join(kok, "mantik.ts"), join(kok, "yerlesim-do.ts"), join(kok, "masa-do.ts"));
  assert.ok(dosyalar.length > 50);
  for (const f of dosyalar) {
    const kod = readFileSync(f, "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(kod, /from\s+["'][^"']*debdebe\//, f);
    assert.doesNotMatch(kod, /["'`]cosmetic["'`]|\.cosmetic\b|\bCOSMETIC\b/, f);
  }
});

test("satın alma: aynı işlem kimliği bir kez verir; iade geri alır; kuşanma sahiplik ister", () => {
  const c = bosCosmetic();
  assert.equal(satinAlimUygula(c, "cerceve_oymali", b("google:1", "cerceve_oymali"), T0).ok, true);
  const t = satinAlimUygula(c, "cerceve_oymali", b("google:1", "cerceve_oymali"), T0);
  assert.equal(t.ok && t.deger.tekrar, true);
  assert.equal(c.p, 199, "puan bir kez");
  assert.deepEqual(kusan(c, "cerceve", "cerceve_yaldizli", 0, T0), { ok: false, hata: "sahip_degil" });
  assert.deepEqual(kusan(c, "balon", "cerceve_oymali", 0, T0), { ok: false, hata: "yuva_gecersiz" });
  assert.deepEqual(kusan(c, "muhur", null, 1, T0), { ok: false, hata: "yuva_kapali" }, "ikinci mühür yuvası Ayan ister");
  assert.equal(kusan(c, "cerceve", "cerceve_oymali", 0, T0).ok, true);
  const i = iadeUygula(c, "google:1", T0);
  assert.equal(i.ok && i.deger.geriAlinan[0], "cerceve_oymali");
  assert.equal(c.s.cerceve_oymali, undefined);
  assert.deepEqual(gorunenler(c, T0), {});
  assert.equal(c.p, 0);
  assert.equal(iadeUygula(c, "google:1", T0).ok && (iadeUygula(c, "google:1", T0) as { deger: { tekrar: boolean } }).deger.tekrar, true);
  // Ayan: ek mühür yuvası ve Ayan'a özel çerçeve; iade süreyi geri alır.
  assert.equal(satinAlimUygula(c, "ayan_aylik", b("google:2", "ayan_aylik"), T0).ok, true);
  assert.equal(kusan(c, "cerceve", "ayan_cerceve", 0, T0).ok, true);
  assert.equal(satinAlimUygula(c, "muhur_kisisel", b("google:3", "muhur_kisisel"), T0).ok, true);
  assert.equal(satinAlimUygula(c, "muhur_lale", b("google:4", "muhur_lale"), T0).ok, true);
  assert.equal(kusan(c, "muhur", "muhur_kisisel", 0, T0).ok, true);
  assert.equal(kusan(c, "muhur", "muhur_lale", 1, T0).ok, true);
  assert.equal(gorunenler(c, T0).muhur?.length, 2);
  iadeUygula(c, "google:2", T0);
  assert.equal(gorunenler(c, T0).muhur?.length, 1, "Ayan bitince ek yuva görünmez");
  assert.equal(gorunenler(c, T0).cerceve, undefined);
  // Makbuz denetimi
  assert.deepEqual(makbuzDenetle(b("x:1234", "cerceve_oymali"), "google", "debdebe_masa_hali", false), { ok: false, hata: "makbuz_gecersiz" });
  assert.deepEqual(makbuzDenetle(b("x:1234", "masa_hali", { durum: "beklemede" }), "google", "debdebe_masa_hali", false), { ok: false, hata: "odeme_beklemede" });
  assert.deepEqual(makbuzDenetle(b("x:1234", "masa_hali", { test: true }), "google", "debdebe_masa_hali", false), { ok: false, hata: "makbuz_gecersiz" });
});

test("Dene: üç bağlam, gerçek oyuncu yok, figüranlar deterministik", () => {
  const p = denePaketi("kaftan_hilat", "Ayşe", {}, "tr");
  assert.deepEqual(p.sahneler.map((s) => s.sahne), ["hanMasasi", "sehirKapisi", "profilKarti"]);
  assert.equal(p.gercekOyuncuYok, true);
  assert.ok(p.sahneler.every((s) => s.figuranlar.every((f) => f.figuran)));
  assert.deepEqual(denePaketi("kaftan_hilat", "Ayşe", {}, "tr"), p);
  assert.ok(denePaketi("armagan_hilat", "Ayşe", {}, "tr").sahneler[0]!.armagan);
  assert.ok(denePaketi("kisaltma_30dk", "Ayşe", {}, "tr").aciklama);
});

test("Sezon Defteri: oynayarak ilerler, aynı istek iki kez saymaz, günlük tavan, ücretli iz ödülü", () => {
  const sz = sezonKaydi(undefined, T0);
  assert.equal(sezonIlerle(sz, "eylem", "a1", T0).eklenen, 10);
  assert.equal(sezonIlerle(sz, "eylem", "a1", T0).eklenen, 0);
  assert.equal(sezonIlerle(sz, "bilinmeyen", "a2", T0).eklenen, 0);
  let toplam = 10;
  for (let i = 0; i < 40; i++) toplam += sezonIlerle(sz, "siparisTeslim", `s${i}`, T0).eklenen;
  assert.equal(toplam, SEZON_GUNLUK_TAVAN);
  const c = bosCosmetic();
  c.sz = sz;
  const r = satinAlimUygula(c, "sezon_ucretli", b("google:9", "sezon_ucretli"), T0);
  assert.ok(r.ok && r.deger.verilen.sezonOdulleri?.includes("sezon_cerceve"), "ulaşılmış seviyelerin ücretli ödülleri verilir");
  assert.equal(satinAlimUygula(c, "sezon_ucretli", b("google:10", "sezon_ucretli"), T0).ok, false);
});

test("süre kısaltma: yalnız süre; öğrenme başına tavan; Debdebe miktarı yoksa kapalı", () => {
  const k = { bo: { t: "o", m: "demirci", d: "demirci.aletcilik", s: 1, b: T0, e: T0 + 120 * 60_000, p: 1 } } as unknown as Karakter;
  const yok = () => undefined;
  assert.deepEqual(beceriHizlandir(k, "debdebe", T0, yok), { ok: false, hata: "hizlandirma_kapali" });
  const r = beceriHizlandir(k, "debdebe", T0, yok, { dk: 30 });
  assert.ok(r.ok && r.deger.kisaltmaMs === 30 * 60_000);
  assert.equal(k.bo!.e, T0 + 90 * 60_000);
  assert.equal(k.bo!.p, 1, "puan değişmez");
  const y = beceriHizlandir(k, "debdebe", T0, yok, { oran: 0.9 });
  assert.ok(y.ok && y.deger.kisaltmaMs === 45 * 60_000, "pay üst sınırı %50");
  for (let i = 2; i < DEBDEBE_KISALTMA_EN_COK; i++) beceriHizlandir(k, "debdebe", T0, yok, { dk: 1 });
  assert.deepEqual(beceriHizlandir(k, "debdebe", T0, yok, { dk: 1 }), { ok: false, hata: "hizlandirma_yok" });
});

test("uçlar: satın alma, kuşanma, armağan + teveccüh + rozet, kısaltma stoğu, levha, Y3 iade", async () => {
  const anahtar = await rsaAnahtari("kid-debdebe");
  globalThis.fetch = sahteJwks([anahtar]).getir;
  const dogrulayici = sahteDogrulayici();
  const env = { GOOGLE_CLIENT_ID: ISTEMCI, YONETIM_GOOGLE_CLIENT_ID: ISTEMCI, OTURUM_ANAHTARI: "o".repeat(48), YONETICI_EPOSTALAR: "berkay@ornek.com" } as Env;
  env.HESAP = sahteAdAlani((ctx) => new HesapDO(ctx, env, { dogrulayici }));
  env.DUNYA = sahteAdAlani((ctx) => new DunyaDO(ctx, env));
  const yerlesimler = sahteAdAlani((ctx) => new YerlesimDO(ctx, env));
  env.YERLESIM = yerlesimler;
  env.YONETIM = sahteAdAlani((ctx) => new YonetimDO(ctx, env));
  const cagir = async (yontem: string, yol: string, s: { govde?: unknown; oturum?: string } = {}) => {
    const h: Record<string, string> = {};
    if (s.oturum) h.authorization = `Bearer ${s.oturum}`;
    const y = await isleyici.fetch(new Request(`https://k.test${yol}`, { method: yontem, headers: h, body: s.govde === undefined ? null : JSON.stringify(s.govde) }), env);
    return { durum: y.status, govde: (await y.json()) as Record<string, any> };
  };
  let n = 0;
  const no = () => `istek-${String(++n).padStart(6, "0")}`;
  const oyuncu = async (sub: string, ad: string) => {
    const t = await jwtImzala(anahtar, googleYuku(Date.now(), { sub, given_name: ad }));
    const oturum = (await cagir("POST", "/v1/giris", { govde: { idToken: t } })).govde.oturum as string;
    const p = await cagir("POST", "/v1/profil", { oturum, govde: { ad, cinsiyet: "kadın", yerlesim: "kizilca", istekNo: no() } });
    assert.equal(p.durum, 200);
    const ben = (await cagir("GET", "/v1/yerlesim", { oturum })).govde.ben;
    return { oturum, hesap: p.govde.hesapId as string, o: ben.id as string };
  };
  const ayse = await oyuncu("110000000000000000011", "Ayşe");
  const zeynep = await oyuncu("110000000000000000012", "Zeynep");
  const berkay = await oyuncu("110000000000000000013", "Berkay");
  const al = (o: string, urun: string, mb: string, istekNo = no()) => cagir("POST", "/v1/debdebe/satin-al", { oturum: o, govde: { urun, magaza: "google", makbuz: mb, istekNo } });

  // Bayrak kapalı (varsayılan): satın alma ve armağan kapalı; katalog ve Dene açık.
  assert.deepEqual((await al(ayse.oturum, "cerceve_oymali", makbuz("GPA.1001", "cerceve_oymali"))).govde, { hata: "debdebe_kapali" });
  assert.equal(dogrulayici.cagri, 0, "kapalıyken mağazaya gidilmez");
  const k0 = await cagir("GET", "/v1/debdebe", { oturum: ayse.oturum });
  assert.equal(k0.govde.acik, false);
  assert.equal(k0.govde.paraliKutu, false);
  assert.equal((await cagir("GET", "/v1/debdebe/dene?urun=anons_davul", { oturum: ayse.oturum })).govde.sahneler[0].sahne, "sehirKapisi");
  assert.equal((await cagir("POST", "/v1/beceri/hizlandir", { oturum: ayse.oturum, govde: { kaynak: "debdebe", urun: "kisaltma_30dk", istekNo: no() } })).durum, 403);
  env.DEBDEBE_ACIK = "1";

  // Satın alma: idempotent (istekNo ve işlem kimliği), başka hesapta aynı makbuz reddedilir.
  const mb = makbuz("GPA.1001", "cerceve_oymali");
  const s1 = await al(ayse.oturum, "cerceve_oymali", mb, "satin-000001");
  assert.equal(s1.durum, 200, JSON.stringify(s1.govde));
  assert.deepEqual((await al(ayse.oturum, "cerceve_oymali", mb, "satin-000001")).govde, s1.govde);
  assert.deepEqual((await al(ayse.oturum, "cerceve_oymali", mb)).govde, { hata: "zaten_sahip" });
  assert.deepEqual((await al(zeynep.oturum, "cerceve_oymali", mb)).govde, { hata: "makbuz_kullanilmis" });
  assert.deepEqual((await al(zeynep.oturum, "masa_hali", mb)).govde, { hata: "makbuz_gecersiz" }, "makbuz başka ürünün");
  assert.deepEqual((await al(zeynep.oturum, "masa_hali", makbuz("GPA.2001", "masa_hali", "beklemede"))).govde, { hata: "odeme_beklemede" });
  assert.equal((await al(zeynep.oturum, "masa_hali", "uydurma")).durum, 400);
  assert.equal(dogrulayici.onaylanan.length, 1);

  // Kuşan ve başkasına görünüş.
  assert.equal((await cagir("POST", "/v1/debdebe/kusan", { oturum: ayse.oturum, govde: { yuva: "cerceve", urun: "cerceve_oymali", istekNo: no() } })).durum, 200);
  const gor = await cagir("GET", `/v1/debdebe/kisi/${ayse.o}`, { oturum: zeynep.oturum });
  assert.deepEqual(gor.govde.kusanilan, { cerceve: ["cerceve_oymali"] });
  assert.equal(gor.govde.seviye, "bakir");

  // Debdebe armağanı: stok → alanda teveccüh (tutarla) ve rozet; stok biterse reddedilir.
  assert.deepEqual((await cagir("POST", "/v1/debdebe/armagan", { oturum: ayse.oturum, govde: { urun: "armagan_hilat", hedef: zeynep.hesap, istekNo: no() } })).govde, { hata: "stok_yok" });
  assert.equal((await al(ayse.oturum, "armagan_hilat", makbuz("GPA.1002", "armagan_hilat"))).durum, 200);
  const ar = await cagir("POST", "/v1/debdebe/armagan", { oturum: ayse.oturum, govde: { urun: "armagan_hilat", hedef: zeynep.o, istekNo: "armagan-0001" } });
  assert.equal(ar.durum, 200, JSON.stringify(ar.govde));
  assert.equal(ar.govde.teveccuh, 120);
  assert.equal(ar.govde.hedef, zeynep.hesap);
  assert.deepEqual((await cagir("POST", "/v1/debdebe/armagan", { oturum: ayse.oturum, govde: { urun: "armagan_hilat", hedef: zeynep.o, istekNo: "armagan-0001" } })).govde, ar.govde);
  assert.deepEqual((await cagir("POST", "/v1/debdebe/armagan", { oturum: ayse.oturum, govde: { urun: "armagan_hilat", hedef: zeynep.o, istekNo: no() } })).govde, { hata: "stok_yok" });
  const zb = (await cagir("GET", "/v1/debdebe", { oturum: zeynep.oturum })).govde.ben;
  assert.equal(zb.rozetler.length, 1);
  assert.equal(zb.rozetler[0].v, "Ayşe");
  const depo = [...yerlesimler.ornekler.values()][0]!.depolama;
  const tv = () => (depo.veri.get(`o:${zeynep.o}`) as Karakter).tv?.p ?? 0;
  assert.equal(tv(), 120, "Debdebe armağanı teveccühü tutarıyla");
  assert.equal((depo.veri.get(`o:${ayse.o}`) as Karakter).pa >= 0, true);

  // Süre kısaltma: stok harcanmadan önce öğrenme denetlenir (öğrenme yoksa stok kalır).
  assert.equal((await al(ayse.oturum, "kisaltma_30dk", makbuz("GPA.1003", "kisaltma_30dk"))).durum, 200);
  assert.deepEqual((await cagir("POST", "/v1/beceri/hizlandir", { oturum: ayse.oturum, govde: { kaynak: "debdebe", urun: "kisaltma_30dk", istekNo: no() } })).govde, { hata: "ogrenme_yok" });
  assert.equal((await cagir("GET", "/v1/debdebe", { oturum: ayse.oturum })).govde.ben.stok.kisaltma_30dk, 1);

  // Levha: görünmek isteğe bağlı; adlar, tutar yok.
  assert.equal((await cagir("POST", "/v1/debdebe/levha-gorunur", { oturum: ayse.oturum, govde: { gorunur: true, istekNo: no() } })).govde.levhaGorunur, true);
  assert.equal((await al(ayse.oturum, "masa_mum", makbuz("GPA.1004", "masa_mum"))).durum, 200);
  assert.equal((await al(zeynep.oturum, "masa_mum", makbuz("GPA.2002", "masa_mum"))).durum, 200);
  const lv = (await cagir("GET", "/v1/debdebe/levha", { oturum: zeynep.oturum })).govde;
  assert.deepEqual(lv.buHaftaAnilanlar, ["Ayşe"]);
  assert.equal(/"(p|puan|tutar|sira)"/.test(JSON.stringify(lv)), false, "tutar ve sıra görünmez");

  // Y3: Kurucu iadesi (gerekçe zorunlu, kendi hesabına yasak); armağan iadesi teveccühü ve rozeti geri alır.
  assert.equal((await al(berkay.oturum, "balon_ipek", makbuz("GPA.3001", "balon_ipek"))).durum, 200);
  const yt = await jwtImzala(anahtar, googleYuku(Date.now(), { sub: "110000000000000000013", email: "berkay@ornek.com", email_verified: true }));
  const yo = (await cagir("POST", "/yonetim/giris", { govde: { idToken: yt } })).govde.oturum as string;
  const liste = await cagir("GET", "/yonetim/debdebe", { oturum: yo });
  assert.equal(liste.durum, 200, JSON.stringify(liste.govde));
  assert.equal(liste.govde.islemler.length, 6);
  const iade = (islem: string, gerekce = "Mağaza iadesi onaylandı") => cagir("POST", "/yonetim/debdebe-iade", { oturum: yo, govde: { islem, gerekce, istekNo: no() } });
  assert.deepEqual((await iade("google:GPA.3001")).govde, { hata: "kendi_hedef" });
  assert.equal((await iade("google:GPA.1002", "")).govde.hata, "gerekce_gecersiz");
  const i1 = await iade("google:GPA.1002");
  assert.equal(i1.durum, 200, JSON.stringify(i1.govde));
  assert.equal(i1.govde.islem.durum, "iade");
  assert.equal(tv(), 0, "teveccüh geri alındı");
  assert.equal((await cagir("GET", "/v1/debdebe", { oturum: zeynep.oturum })).govde.ben.rozetler.length, 0);
  assert.equal((await iade("google:GPA.1001")).durum, 200);
  const ab = (await cagir("GET", "/v1/debdebe", { oturum: ayse.oturum })).govde.ben;
  assert.equal(ab.sahip.includes("cerceve_oymali"), false);
  assert.deepEqual(ab.kusanilan, {});
  assert.deepEqual((await al(ayse.oturum, "cerceve_oymali", mb)).govde, { hata: "makbuz_iade" }, "iade edilen makbuz yeniden varlık vermez");
  assert.equal((await iade("google:YOK.1")).govde.hata, "islem_yok");
});


test("Sezon Defteri: istek izi sezon boyunca korunur, eski isteğin ertesi gün tekrarı puan üretmez", () => {
  const sz = sezonKaydi(undefined, T0);
  assert.equal(sezonIlerle(sz, "eylem", "ilk", T0).eklenen, 10);
  for (let i = 0; i < 70; i++) sezonIlerle(sz, "eylem", `gun1-${i}`, T0);
  const ertesiGun = T0 + 24 * 60 * 60 * 1000;
  assert.equal(sezonIlerle(sz, "eylem", "ilk", ertesiGun).eklenen, 0);
  assert.ok(sz.iz.includes("ilk"), "ilk istek izi sezonluk listede kalmalı");
});


test("masa plakası yalnız sahip olunan ve kuşanılmış çerçeveyi verir", async () => {
  const c = bosCosmetic();
  assert.equal(satinAlimUygula(c, "cerceve_oymali", b("google:plaka", "cerceve_oymali"), T0).ok, true);
  assert.equal(kusan(c, "cerceve", "cerceve_oymali", 0, T0).ok, true);
  const depo = { al: async () => c } as unknown as Depo;
  assert.equal(await plakaCerçevesi(depo, T0), "cerceve_oymali");
  iadeUygula(c, "google:plaka", T0);
  assert.equal(await plakaCerçevesi(depo, T0), undefined);
});
