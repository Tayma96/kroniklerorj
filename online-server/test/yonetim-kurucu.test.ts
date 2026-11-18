// Yönetim 18 Kasım: kurucu sınırsız, moderatörün kişisel yetkileri, kurucu anahtarıyla giriş, oturum sürümü,
// telafi alma/geri alma, oyuncu arama/ayrıntı, ekonomi yetkisi, dünya sürümü öneki, çapraz parametre, telafi yarışı.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, YerlesimDO, YonetimDO } from "../src/index.ts";
import { b64urlCoz } from "../src/b64.ts";
import { bellekDepo } from "../src/depo.ts";
import { doAdi, dunyaSurumu, oyuncuOturumAnahtari } from "../src/dunya-surumu.ts";
import { ETKINLIK_SAAT_EN_COK, ETKINLIK_TURLERI } from "../src/etkinlik/katalog.ts";
import { basarili, hata, type Env, type Profil, type Sonuc, type YoneticiKimligi, type YonetimUcu } from "../src/tipler.ts";
import { anahtarHataSay, anahtarIzin, anahtarSayaciYeni, ANAHTAR_IP_HATA } from "../src/yonetim-do.ts";
import { yonetimIsle, type YonetimBaglami } from "../src/yonetim/islem.ts";
import { debdebeKayit } from "../src/yonetim/y3.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks, type TestAnahtari } from "./yardimci.ts";

const KURUCU = "berkay@ornek.com";
const KURUCU_SUB = "110000000000000000001";
const MOD = "mod@ornek.com";
const MOD_SUB = "440000000000000000004";
const ANAHTAR = "k".repeat(40);

function ortam(ek: Partial<Env> = {}): Env {
  const env = {
    GOOGLE_CLIENT_ID: ISTEMCI, YONETIM_GOOGLE_CLIENT_ID: ISTEMCI, ZAR_YEDEK_IZINLI: "1", OTURUM_ANAHTARI: "o".repeat(48),
    YONETICI_EPOSTALAR: KURUCU, ...ek,
  } as Env;
  env.HESAP = sahteAdAlani((ctx) => new HesapDO(ctx, env));
  env.DUNYA = sahteAdAlani((ctx) => new DunyaDO(ctx, env));
  env.YERLESIM = sahteAdAlani((ctx) => new YerlesimDO(ctx, env));
  env.YONETIM = sahteAdAlani((ctx) => new YonetimDO(ctx, env));
  return env;
}

type Yanit = { durum: number; govde: Record<string, any> };
function istemci(env: Env) {
  return async (yontem: string, yol: string, s: { govde?: unknown; oturum?: string; ip?: string } = {}): Promise<Yanit> => {
    const b: Record<string, string> = {};
    if (s.oturum) b.authorization = `Bearer ${s.oturum}`;
    if (s.govde !== undefined) b["content-type"] = "application/json";
    if (s.ip) b["cf-connecting-ip"] = s.ip;
    const y = await isleyici.fetch(new Request(`https://kronikler-online.test${yol}`, { method: yontem, headers: b, body: s.govde === undefined ? null : JSON.stringify(s.govde) }), env);
    const metin = await y.text();
    let govde: Record<string, any> = {};
    try { govde = JSON.parse(metin) as Record<string, any>; } catch { govde = { metin }; }
    return { durum: y.status, govde };
  };
}

let sayac = 0;
const no = (): string => `istek-${String(++sayac).padStart(8, "0")}`;
const G = "yeterince uzun bir gerekçe";
let ortakAnahtar: TestAnahtari | undefined;
const eskiFetch = globalThis.fetch;

async function kur(ek: Partial<Env> = {}) {
  ortakAnahtar ??= await rsaAnahtari("kid-kurucu");
  const anahtar = ortakAnahtar;
  globalThis.fetch = sahteJwks([anahtar]).getir;
  const env = ortam(ek);
  const cagir = istemci(env);
  const belirtec = (yuk: Record<string, unknown>) => jwtImzala(anahtar, googleYuku(Date.now(), yuk));
  const oyuncu = async (sub: string, ad: string, yerlesim = "kizilca") => {
    const g = await cagir("POST", "/v1/giris", { govde: { idToken: await belirtec({ sub, given_name: ad }) } });
    const oturum = g.govde.oturum as string;
    const p = await cagir("POST", "/v1/profil", { oturum, govde: { ad, cinsiyet: "kadın", yerlesim, istekNo: no() } });
    assert.equal(p.durum, 200, `profil ${ad}`);
    return { oturum, hesap: p.govde.hesapId as string };
  };
  const yonetici = async (sub: string, eposta: string) =>
    (await cagir("POST", "/yonetim/giris", { govde: { idToken: await belirtec({ sub, email: eposta, email_verified: true }) } })).govde.oturum as string;
  return { env, cagir, oyuncu, yonetici };
}

test("kurucu anahtarı: sır yoksa kapalı; yanlış/doğru anahtar kayda girer; IP sınırı; her yerden çık; sır silinince düşer", async () => {
  try {
    const kapali = await kur();
    assert.equal((await kapali.cagir("POST", "/yonetim/anahtar-giris", { govde: { anahtar: ANAHTAR } })).durum, 404);

    const { env, cagir } = await kur({ YONETIM_KURUCU_ANAHTARI: ANAHTAR, YONETICI_EPOSTALAR: "" });
    const giris = (anahtar: string, ip = "10.0.0.1") => cagir("POST", "/yonetim/anahtar-giris", { govde: { anahtar }, ip });
    const yanlis = await giris("y".repeat(40));
    assert.deepEqual([yanlis.durum, yanlis.govde], [403, { hata: "yetki_yok" }]);
    const dogru = await giris(ANAHTAR);
    assert.equal(dogru.durum, 200, JSON.stringify(dogru.govde));
    assert.equal(dogru.govde.rol, "kurucu");
    const t1 = dogru.govde.oturum as string;
    const ben = await cagir("GET", "/yonetim/ben", { oturum: t1 });
    assert.equal(ben.govde.rol, "kurucu");
    assert.equal(ben.govde.anahtarOturumu, true);
    assert.equal(ben.govde.dunyaSurumu, "1");
    assert.equal(ben.govde.yetkisizGirisBugun, 1, "yanlış anahtar günlük yetkisiz sayaca girer");
    const kayit = (await cagir("GET", "/yonetim/kayit", { oturum: t1 })).govde.kayitlar as { islem: string; sonuc: string }[];
    assert.deepEqual(kayit.filter((k) => k.islem === "anahtarGiris").map((k) => k.sonuc).sort(), ["tamam", "yetki_yok"]);

    // IP başına başarısız deneme sınırı: dolunca doğru anahtar da denenmez; başka IP etkilenmez.
    for (let i = 0; i < ANAHTAR_IP_HATA; i++) await giris("z".repeat(40), "10.9.9.9");
    assert.deepEqual((await giris(ANAHTAR, "10.9.9.9")).govde, { hata: "hiz_siniri" });
    assert.equal((await giris(ANAHTAR, "10.0.0.2")).durum, 200);

    // Her yerden çık: eski belirteç düşer, yeni giriş yeni sürümle çalışır.
    assert.equal((await cagir("POST", "/yonetim/oturumlari-kapat", { oturum: t1, govde: { istekNo: no() } })).durum, 200);
    assert.deepEqual((await cagir("GET", "/yonetim/ben", { oturum: t1 })).govde, { hata: "oturum_gecersiz" });
    const t2 = (await giris(ANAHTAR, "10.0.0.3")).govde.oturum as string;
    assert.equal((await cagir("GET", "/yonetim/ben", { oturum: t2 })).durum, 200);

    // Sır kaldırılınca anahtar oturumu hemen kurucu olmaktan çıkar.
    env.YONETIM_KURUCU_ANAHTARI = undefined;
    assert.deepEqual((await cagir("GET", "/yonetim/ben", { oturum: t2 })).govde, { hata: "yetki_yok" });
  } finally {
    globalThis.fetch = eskiFetch;
  }
});

test("anahtar sayacı (saf): IP penceresi ve genel saatlik tavan", () => {
  const s = anahtarSayaciYeni();
  const t = 1_000_000_000;
  for (let i = 0; i < ANAHTAR_IP_HATA; i++) { assert.ok(anahtarIzin(s, "a", t)); anahtarHataSay(s, "a", t); }
  assert.equal(anahtarIzin(s, "a", t), false);
  assert.ok(anahtarIzin(s, "b", t));
  assert.ok(anahtarIzin(s, "a", t + 16 * 60_000), "pencere geçince açılır");
});

test("moderatör kişisel yetkileri: kurucu açar/kapatır; /yonetim/ekonomi yetkisiz moderatöre 403; rolVer verilemez", async () => {
  try {
    const { cagir, yonetici } = await kur();
    const yb = await yonetici(KURUCU_SUB, KURUCU);
    const rol = (govde: Record<string, unknown>) => cagir("POST", "/yonetim/rol", { oturum: yb, govde: { eposta: MOD, rol: "moderator", gerekce: G, istekNo: no(), ...govde } });
    assert.equal((await rol({ yetkiler: ["oyuncuGor"] })).durum, 200);
    const mb = await yonetici(MOD_SUB, MOD);
    assert.deepEqual([(await cagir("GET", "/yonetim/ekonomi", { oturum: mb })).durum, (await cagir("GET", "/yonetim/ekonomi", { oturum: mb })).govde], [403, { hata: "yetki_yok" }]);
    assert.equal((await cagir("GET", "/yonetim/sikayetler", { oturum: mb })).durum, 403, "kapatılan varsayılan yetki");
    assert.equal((await cagir("GET", "/yonetim/moderatorler", { oturum: mb })).durum, 403);
    assert.equal((await rol({ yetkiler: ["rolVer"] })).govde.hata, "yetki_gecersiz");
    assert.equal((await rol({ telafiTavan: 10_000_000 })).govde.hata, "deger_sinir_disi");
    assert.equal((await rol({ yetkiler: ["ekonomi", "telafi"], telafiTavan: 7_000 })).durum, 200);
    assert.equal((await cagir("GET", "/yonetim/ekonomi", { oturum: mb })).durum, 200);
    const ben = (await cagir("GET", "/yonetim/ben", { oturum: mb })).govde;
    assert.ok(ben.yetkiler.includes("ekonomi") && !ben.yetkiler.includes("oyuncuGor"));
    assert.equal(ben.telafiTavan, 7_000);
    const liste = (await cagir("GET", "/yonetim/moderatorler", { oturum: yb })).govde;
    assert.deepEqual(liste.moderatorler, [{ eposta: MOD, yetkiler: ["ekonomi", "telafi"], telafiTavan: 7_000, kisisel: true }]);
    assert.ok(liste.secenekler.some((x: { islem: string }) => x.islem === "etkinlikYonet"));
    assert.ok(!liste.secenekler.some((x: { islem: string }) => x.islem === "rolVer"));
    // Moderatörlükten çıkarılınca yetki kaydı da silinir.
    await cagir("POST", "/yonetim/rol", { oturum: yb, govde: { eposta: MOD, rol: null, gerekce: G, istekNo: no() } });
    assert.equal((await cagir("GET", "/yonetim/ben", { oturum: mb })).durum, 403);
    assert.deepEqual((await cagir("GET", "/yonetim/moderatorler", { oturum: yb })).govde.moderatorler, []);
  } finally {
    globalThis.fetch = eskiFetch;
  }
});

test("telafi alma ve geri alma: cüzdan sıfırın altına inmez, mal kırpılır, bir kez geri alınır; moderatör kendine yapamaz", async () => {
  try {
    const { cagir, oyuncu, yonetici } = await kur();
    const mehmet = await oyuncu("220000000000000000002", "Mehmet");
    const modOyuncu = await oyuncu(MOD_SUB, "Moddo");
    const yb = await yonetici(KURUCU_SUB, KURUCU);
    const para = async () => (await cagir("GET", "/v1/yerlesim", { oturum: mehmet.oturum })).govde.ben.para as number;
    const telafi = (oturum: string, govde: Record<string, unknown>) => cagir("POST", "/yonetim/telafi", { oturum, govde: { hedef: mehmet.hesap, gerekce: G, istekNo: no(), ...govde } });
    const p0 = await para();
    const al = await telafi(yb, { tur: "akce", yon: "al", tutar: p0 + 1_000 });
    assert.equal(al.durum, 200, JSON.stringify(al.govde));
    assert.equal(al.govde.telafi.uygulanan, p0, "yalnız cüzdandaki kadar alınır");
    assert.equal(await para(), 0);
    const geri = (kayitNo: number) => cagir("POST", "/yonetim/telafi-geri", { oturum: yb, govde: { no: kayitNo, gerekce: G, istekNo: no() } });
    const g1 = await geri(al.govde.telafi.no);
    assert.equal(g1.durum, 200, JSON.stringify(g1.govde));
    assert.equal(await para(), p0, "geri alma cüzdanı eski hâline getirir");
    assert.equal((await geri(al.govde.telafi.no)).govde.hata, "geri_yok", "bir kez geri alınır");
    assert.equal((await geri(g1.govde.telafi.no)).govde.hata, "geri_yok", "geri alma kaydı yeniden geri alınmaz");

    // Mal: 3 nal ver, 10 al → 3 alınır.
    assert.equal((await telafi(yb, { tur: "esya", mal: "nal", adet: 3 })).durum, 200);
    const malAl = await telafi(yb, { tur: "esya", yon: "al", mal: "nal", adet: 10 });
    assert.equal(malAl.govde.telafi.uygulanan, 3);
    const liste = (await cagir("GET", "/yonetim/telafiler", { oturum: yb })).govde.telafiler as { no: number; yon: string; geri?: unknown; geriNo?: number }[];
    assert.ok(liste.find((x) => x.no === al.govde.telafi.no)?.geri, "geri alınan işaretli");
    assert.equal(liste.find((x) => x.no === g1.govde.telafi.no)?.geriNo, al.govde.telafi.no);

    // Moderatör: kendi oyun karakterine telafi yasak; geri alma yetkisi yoksa 403.
    await cagir("POST", "/yonetim/rol", { oturum: yb, govde: { eposta: MOD, rol: "moderator", yetkiler: ["telafi"], gerekce: G, istekNo: no() } });
    const mb = await yonetici(MOD_SUB, MOD);
    assert.equal((await telafi(mb, { hedef: modOyuncu.hesap, tur: "akce", tutar: 10 })).govde.hata, "kendi_hedef");
    assert.equal((await cagir("POST", "/yonetim/telafi-geri", { oturum: mb, govde: { no: malAl.govde.telafi.no, gerekce: G, istekNo: no() } })).durum, 403);
  } finally {
    globalThis.fetch = eskiFetch;
  }
});

test("oyuncu bulma: ad başı ve numara; ayrıntı cüzdan/envanter/son giriş; yetkisiz moderatöre 403; kayda girer", async () => {
  try {
    const { cagir, oyuncu, yonetici } = await kur();
    const mehmet = await oyuncu("220000000000000000002", "Mehmet");
    const yb = await yonetici(KURUCU_SUB, KURUCU);
    const ad = await cagir("GET", "/yonetim/oyuncu-ara?ad=meh", { oturum: yb });
    assert.equal(ad.durum, 200, JSON.stringify(ad.govde));
    const bulunan = (ad.govde.sonuclar as { hesap: string; numara: number; ad: string }[]).find((x) => x.hesap === mehmet.hesap);
    assert.ok(bulunan && bulunan.ad === "Mehmet" && typeof bulunan.numara === "number");
    const num = await cagir("GET", `/yonetim/oyuncu-ara?no=${bulunan.numara}`, { oturum: yb });
    assert.deepEqual(num.govde.sonuclar.map((x: { hesap: string }) => x.hesap), [mehmet.hesap]);
    assert.equal((await cagir("GET", "/yonetim/oyuncu-ara?ad=m", { oturum: yb })).govde.hata, "arama_kisa");
    const ay = await cagir("GET", `/yonetim/oyuncu-ayrinti?hesap=${encodeURIComponent(mehmet.hesap)}`, { oturum: yb });
    assert.equal(ay.durum, 200, JSON.stringify(ay.govde));
    assert.equal(typeof ay.govde.karakter.para, "number");
    assert.equal(typeof ay.govde.karakter.envanter.adet, "number");
    assert.equal(typeof ay.govde.hesap.sonGiris, "number");
    assert.equal(ay.govde.numara, bulunan.numara);
    const kayit = (await cagir("GET", "/yonetim/kayit", { oturum: yb })).govde.kayitlar as { islem: string; hedef?: string }[];
    assert.ok(kayit.some((k) => k.islem === "oyuncuAyrinti" && k.hedef === mehmet.hesap));
    assert.ok(kayit.some((k) => k.islem === "oyuncuAra"));
    await cagir("POST", "/yonetim/rol", { oturum: yb, govde: { eposta: MOD, rol: "moderator", gerekce: G, istekNo: no() } });
    const mb = await yonetici(MOD_SUB, MOD);
    assert.equal((await cagir("GET", "/yonetim/oyuncu-ara?ad=meh", { oturum: mb })).durum, 200, "varsayılan oyuncuGor açık");
    assert.equal((await cagir("GET", `/yonetim/oyuncu-ayrinti?hesap=${encodeURIComponent(mehmet.hesap)}`, { oturum: mb })).durum, 403);
  } finally {
    globalThis.fetch = eskiFetch;
  }
});

test("etkinlik süre sınırı yalnız moderatöre", async () => {
  try {
    const { cagir, yonetici } = await kur();
    const yb = await yonetici(KURUCU_SUB, KURUCU);
    const baslat = (oturum: string, tur: string) => cagir("POST", "/yonetim/etkinlik-baslat", { oturum, govde: { tur, kapsam: "dunya", saat: ETKINLIK_SAAT_EN_COK + 24, istekNo: no() } });
    assert.equal((await baslat(yb, ETKINLIK_TURLERI[0]!)).durum, 200);
    await cagir("POST", "/yonetim/rol", { oturum: yb, govde: { eposta: MOD, rol: "moderator", yetkiler: ["etkinlikGor", "etkinlikYonet"], gerekce: G, istekNo: no() } });
    const mb = await yonetici(MOD_SUB, MOD);
    assert.equal((await baslat(mb, ETKINLIK_TURLERI[1]!)).govde.hata, "etkinlik_gecersiz");
  } finally {
    globalThis.fetch = eskiFetch;
  }
});

test("dünya sürümü: '1'de önek yok; '2'de oyun DO'ları öneklenir, YonetimDO değil; eski oyuncu belirteci geçmez", async () => {
  assert.equal(dunyaSurumu({}), "1");
  assert.equal(dunyaSurumu({ DUNYA_SURUMU: "bozuk değer!" }), "1");
  assert.equal(doAdi({ DUNYA_SURUMU: "1" }, "yerlesim:kizilca"), "yerlesim:kizilca");
  assert.equal(doAdi({ DUNYA_SURUMU: "2" }, "yerlesim:kizilca"), "d2:yerlesim:kizilca");
  assert.equal(oyuncuOturumAnahtari("s", {}), "s");
  try {
    const adlar = (ns: unknown) => [...(ns as { ornekler: Map<string, unknown> }).ornekler.keys()].map((k) => new TextDecoder().decode(b64urlCoz(k.slice(3))));
    const v1 = await kur();
    const o1 = await v1.oyuncu("220000000000000000002", "Mehmet");
    assert.ok(adlar(v1.env.HESAP).every((a) => a.startsWith("google:")));
    const v2 = await kur({ DUNYA_SURUMU: "2" });
    const o2 = await v2.oyuncu("220000000000000000002", "Mehmet");
    await v2.yonetici(KURUCU_SUB, KURUCU);
    assert.notEqual(o1.hesap, o2.hesap, "aynı Google hesabı yeni dünyada yeni hesap");
    assert.ok(adlar(v2.env.HESAP).every((a) => a.startsWith("d2:google:")));
    assert.ok(adlar(v2.env.YERLESIM).every((a) => a.startsWith("d2:yerlesim:")));
    assert.deepEqual(adlar(v2.env.DUNYA), ["d2:dunya"]);
    assert.deepEqual(adlar(v2.env.YONETIM), ["yonetim"], "yönetim sürüm dışı");
    assert.deepEqual((await v2.cagir("GET", "/v1/profil", { oturum: o1.oturum })).govde, { hata: "oturum_gecersiz" });
    const yb = await v2.yonetici(KURUCU_SUB, KURUCU);
    assert.equal((await v2.cagir("GET", "/yonetim/ben", { oturum: yb })).govde.dunyaSurumu, "2");
  } finally {
    globalThis.fetch = eskiFetch;
  }
});

// ---------------------------------------------------------------- YonetimDO kuralları doğrudan

const K: YoneticiKimligi = { eposta: "k@o.com", sub: "1", hesap: "do-kurucu" };
const M: YoneticiKimligi = { eposta: "m@o.com", sub: "2", hesap: "do-mod" };
const profil = (hesapId: string): Profil => ({ hesapId, ad: hesapId, cinsiyet: "kadın", beylik: "demirhan", yerlesim: "kizilca", dogumAyi: 0, olusturma: 0 });

function baglam(ek: Partial<YonetimBaglami> = {}) {
  const depo = bellekDepo();
  const b: YonetimBaglami = {
    depo, simdi: Date.UTC(2026, 10, 18, 10), kurucular: new Set([K.eposta]),
    oyuncuBul: async (s) => (s.hesap?.startsWith("do-") && s.hesap !== M.hesap && s.hesap !== K.hesap ? basarili(profil(s.hesap)) : hata("kisi_yok")),
    hesabaYaz: async (_h, d) => basarili(d),
    ...ek,
  };
  const yonet = (y: YoneticiKimligi, uc: YonetimUcu, govde?: unknown) => yonetimIsle(b, { islem: "yonet", yonetici: y, uc, govde, sorgu: {} }) as Promise<Sonuc<Record<string, any>>>;
  return { b, depo, yonet };
}

test("telafi yarışı (madde 9): aynı istekNo eşzamanlı ikinci istek istek_tekrar alır; tek kayıt, pay bir kez; sonra ilk sonuç döner", async () => {
  let cagri = 0;
  let birak!: () => void;
  const bekle = new Promise<void>((r) => (birak = r));
  const { depo, yonet } = baglam({
    siyasiKimlikOku: async () => basarili({} as never),
    telafiYaz: async (_y, _h, g) => { cagri++; await bekle; return basarili({ uygulanan: (g as { tutar: number }).tutar }); },
  });
  await depo.koy({ roller: { [M.eposta]: "moderator" }, modYetki: { [M.eposta]: { y: ["telafi"], t: 1_000 } } });
  const govde = { hedef: "do-hedef", tur: "akce", tutar: 400, gerekce: G, istekNo: "yaris-000001" };
  const a = yonet(M, "telafi", govde);
  const c = yonet(M, "telafi", govde);
  await new Promise<void>((r) => setTimeout(() => r(), 10));
  birak();
  const [ra, rc] = await Promise.all([a, c]);
  assert.ok(ra.ok);
  assert.deepEqual(rc, hata("istek_tekrar"));
  assert.deepEqual(await yonet(M, "telafi", govde), ra, "tamamlanınca yeniden gönderim ilk sonucu alır");
  assert.equal(cagri, 1, "yerleşime bir kez gidildi");
  assert.equal(await depo.al("sayac:telafi"), 1, "tek telafi kaydı");
  assert.equal((await depo.al<{ n: number }>("telafiGunluk:2"))?.n, 400, "pay bir kez");
});

test("kendine-fayda yasağı yalnız moderatöre: kendi hakkındaki şikayete kurucu karar verir, moderatör veremez", async () => {
  const { b, depo, yonet } = baglam({ oyuncuBul: async (s) => (s.hesap?.startsWith("do-") ? basarili(profil(s.hesap)) : hata("kisi_yok")) });
  await depo.koy({ roller: { [M.eposta]: "moderator" } });
  const sikayet = (hedef: string) => yonetimIsle(b, { islem: "sikayetEkle", sikayetci: "do-a", govde: { hedef, neden: "spam", istekNo: `s-${hedef}-0001` } }) as Promise<Sonuc<{ id: number }>>;
  const sm = await sikayet(M.hesap);
  const sk = await sikayet(K.hesap);
  assert.ok(sm.ok && sk.ok);
  assert.deepEqual(await yonet(M, "sikayet-karar", { id: sm.deger.id, karar: "reddet", gerekce: G, istekNo: "karar-00001" }), hata("kendi_hedef"));
  assert.ok((await yonet(K, "sikayet-karar", { id: sk.deger.id, karar: "reddet", gerekce: G, istekNo: "karar-00002" })).ok);
});

test("çapraz parametre (madde 10): önceden var olan ihlal alakasız değişikliği kilitlemez; kötüleştiren reddedilir", async () => {
  const { depo, yonet } = baglam();
  // STOK_CARPAN 1 iken stokKitlik ihlal (1 ≥ 1 + 0,5 değil).
  await depo.koy({ "param:STOK_CARPAN": { yigin: [1], surum: 1, gecmis: [] } });
  const p = (ad: string, deger: number) => yonet(K, "parametre", { ad, deger, gerekce: G, istekNo: no() });
  assert.ok((await p("HIZ_SINIRI", 60)).ok, "alakasız parametre");
  assert.deepEqual(await p("KITLIK_PRIM", 0.6), hata("parametre_capraz"), "ihlali büyütür");
  assert.ok((await p("KITLIK_PRIM", 0.4)).ok, "ihlali hafifletir");
  assert.ok((await p("STOK_CARPAN", 2)).ok, "ihlali düzeltir");
  assert.deepEqual(await p("STOK_CARPAN", 1.2), hata("parametre_capraz"), "yeni ihlal açılamaz");
});

test("Debdebe defteri: dünya sıfırlanınca eski makbuz yeni hesaba bir kez bağlanır; aynı dünyada başka hesaba geçmez", async () => {
  const { b } = baglam();
  const kayit = (hesap: string, surum: string) => debdebeKayit({ ...b, dunyaSurumu: surum }, { islem: "google:GPA.1", magaza: "google", urun: "balon", hesap, zaman: 0 });
  assert.deepEqual(await kayit("do-a", "1"), basarili({ no: 1, yeni: true }));
  assert.deepEqual(await kayit("do-b", "1"), hata("makbuz_kullanilmis"));
  assert.deepEqual(await kayit("do-b", "2"), basarili({ no: 1, yeni: true }));
  assert.deepEqual(await kayit("do-b", "2"), basarili({ no: 1, yeni: false }));
  assert.deepEqual(await kayit("do-c", "2"), hata("makbuz_kullanilmis"));
});
