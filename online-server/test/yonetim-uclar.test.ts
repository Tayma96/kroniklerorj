// Y1 yönetim uçtan uca: gerçek Worker yönlendiricisi + gerçek DO sınıfları (HesapDO, DunyaDO, YerlesimDO, YonetimDO),
// bellekte sahte depolama ve sahte JWKS ile.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, YerlesimDO, YonetimDO } from "../src/index.ts";
import type { Env } from "../src/tipler.ts";
import { yonetimCagir } from "../src/ic.ts";
import { PANEL_PARCALARI } from "../src/yonetim/panel.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks, type TestAnahtari } from "./yardimci.ts";

const KURUCU = "berkay@ornek.com";
const KURUCU_SUB = "110000000000000000001"; // aynı zamanda "Ayşe" oyuncusunun sub'ı
const MOD = "mod@ornek.com";

function ortam(ek: Partial<Env> = {}): Env {
  const env = {
    GOOGLE_CLIENT_ID: ISTEMCI,
    YONETIM_GOOGLE_CLIENT_ID: ISTEMCI,
    OTURUM_ANAHTARI: "o".repeat(48),
    YONETICI_EPOSTALAR: `Berkay@Ornek.com`,
    ...ek,
  } as Env;
  env.HESAP = sahteAdAlani((ctx) => new HesapDO(ctx, env));
  env.DUNYA = sahteAdAlani((ctx) => new DunyaDO(ctx, env));
  env.YERLESIM = sahteAdAlani((ctx) => new YerlesimDO(ctx, env));
  env.YONETIM = sahteAdAlani((ctx) => new YonetimDO(ctx, env));
  return env;
}

type Yanit = { durum: number; govde: Record<string, any>; yanit: Response };

function istemci(env: Env) {
  return async (yontem: string, yol: string, secenek: { govde?: unknown; oturum?: string } = {}): Promise<Yanit> => {
    const basliklar: Record<string, string> = {};
    if (secenek.oturum) basliklar.authorization = `Bearer ${secenek.oturum}`;
    if (secenek.govde !== undefined) basliklar["content-type"] = "application/json";
    const yanit = await isleyici.fetch(
      new Request(`https://kronikler-online.test${yol}`, {
        method: yontem,
        headers: basliklar,
        body: secenek.govde === undefined ? null : JSON.stringify(secenek.govde),
      }),
      env,
    );
    const metin = await yanit.text();
    let govde: Record<string, any> = {};
    try {
      govde = JSON.parse(metin) as Record<string, any>;
    } catch {
      govde = { metin };
    }
    return { durum: yanit.status, govde, yanit };
  };
}

let sayac = 0;
const no = (): string => `istek-${String(++sayac).padStart(8, "0")}`;

// index.ts'deki Google doğrulayıcı JWKS'yi modül düzeyinde önbellekler: dosya boyunca tek anahtar.
let ortakAnahtar: TestAnahtari | undefined;

async function kur(ek: Partial<Env> = {}) {
  ortakAnahtar ??= await rsaAnahtari("kid-yonetim");
  const anahtar = ortakAnahtar;
  globalThis.fetch = sahteJwks([anahtar]).getir;
  const env = ortam(ek);
  const cagir = istemci(env);
  const simdi = Date.now();
  const belirtec = (a: TestAnahtari, yuk: Record<string, unknown>) => jwtImzala(a, googleYuku(simdi, yuk));
  const oyuncu = async (sub: string, ad: string, yerlesim = "kizilca") => {
    const g = await cagir("POST", "/v1/giris", { govde: { idToken: await belirtec(anahtar, { sub, given_name: ad }) } });
    const oturum = g.govde.oturum as string;
    const p = await cagir("POST", "/v1/profil", { oturum, govde: { ad, cinsiyet: "kadın", yerlesim, istekNo: no() } });
    assert.equal(p.durum, 200, `profil ${ad}`);
    return { oturum, hesap: p.govde.hesapId as string };
  };
  const yonetici = async (sub: string, eposta: string) => {
    const t = await belirtec(anahtar, { sub, email: eposta, email_verified: true });
    return cagir("POST", "/yonetim/giris", { govde: { idToken: t } });
  };
  return { env, cagir, anahtar, belirtec, oyuncu, yonetici };
}

const eskiFetch = globalThis.fetch;

test("yönetim girişi: kurucu girer; doğrulanmamış e-posta, rolsüz ve boş liste reddedilir; belirteçler karışmaz", async () => {
  try {
    const { cagir, anahtar, belirtec, oyuncu, yonetici } = await kur();
    const ayse = await oyuncu(KURUCU_SUB, "Ayşe");

    const g = await yonetici(KURUCU_SUB, KURUCU);
    assert.equal(g.durum, 200);
    assert.equal(g.govde.rol, "kurucu");
    const yb = g.govde.oturum as string;

    const ben = await cagir("GET", "/yonetim/ben", { oturum: yb });
    assert.equal(ben.govde.rol, "kurucu");
    assert.equal(ben.govde.kendiHesap, ayse.hesap, "kendi oyuncu hesabı sunucuda hesaplanır");
    assert.ok((ben.govde.yetkiler as string[]).includes("parametreDegistir"));

    // Ayrı oturum: oyuncu belirteci /yonetim/*'de, yönetici belirteci /v1/*'de geçmez.
    assert.deepEqual((await cagir("GET", "/yonetim/ben", { oturum: ayse.oturum })).govde, { hata: "oturum_gecersiz" });
    assert.deepEqual((await cagir("GET", "/v1/profil", { oturum: yb })).govde, { hata: "oturum_gecersiz" });
    assert.equal((await cagir("GET", "/yonetim/ben")).durum, 401);

    const dogrulanmamis = await cagir("POST", "/yonetim/giris", {
      govde: { idToken: await belirtec(anahtar, { email: KURUCU, email_verified: false }) },
    });
    assert.deepEqual([dogrulanmamis.durum, dogrulanmamis.govde], [403, { hata: "eposta_dogrulanmamis" }]);

    const yabanci = await yonetici("330000000000000000003", "yabanci@ornek.com");
    assert.deepEqual([yabanci.durum, yabanci.govde], [403, { hata: "yetki_yok" }]);

    // İstemcinin gönderdiği rol yok sayılır.
    const sahteRol = await cagir("POST", "/yonetim/giris", {
      govde: { idToken: await belirtec(anahtar, { sub: "330000000000000000003", email: "yabanci@ornek.com", email_verified: true }), rol: "kurucu" },
    });
    assert.equal(sahteRol.durum, 403);

    // Rolsüz giriş kalıcı kayda yazılmaz (kayıt şişirilemez); yalnız günlük sayaçta görünür.
    const kayit = await cagir("GET", "/yonetim/kayit", { oturum: yb });
    const islemler = (kayit.govde.kayitlar as { islem: string; sonuc: string; kim: string }[]).map((k) => `${k.islem}:${k.sonuc}:${k.kim}`);
    assert.deepEqual(islemler, ["giris:tamam:berkay@ornek.com"]);
    assert.equal((await cagir("GET", "/yonetim/ben", { oturum: yb })).govde.yetkisizGirisBugun, 2);

    // Silme/düzenleme ucu yoktur.
    assert.equal((await cagir("POST", "/yonetim/kayit", { oturum: yb, govde: {} })).durum, 405);
    assert.equal((await cagir("DELETE", "/yonetim/kayit", { oturum: yb })).durum, 405);
    assert.equal((await cagir("POST", "/yonetim/kayit-sil", { oturum: yb, govde: {} })).durum, 404);

    // Boş liste: kimse yönetici değil.
    const bos = await kur({ YONETICI_EPOSTALAR: "" });
    assert.deepEqual((await bos.yonetici(KURUCU_SUB, KURUCU)).govde, { hata: "yetki_yok" });

    // Yönetim istemci kimliği yoksa oyuncu kimliklerine geri düşülmez.
    const ayarsiz = await kur({ YONETIM_GOOGLE_CLIENT_ID: "" });
    const a = await ayarsiz.yonetici(KURUCU_SUB, KURUCU);
    assert.deepEqual([a.durum, a.govde], [500, { hata: "yapilandirma_eksik" }]);
  } finally {
    globalThis.fetch = eskiFetch;
  }
});

test("yaptırım: uzaklaştırma /v1/*'i kapatır (giriş açık, bitiş döner), tekrar güvenli, gerekçe ve sınır zorunlu", async () => {
  try {
    const { cagir, anahtar, belirtec, oyuncu, yonetici } = await kur();
    const mehmet = await oyuncu("220000000000000000002", "Mehmet");
    const yb = (await yonetici(KURUCU_SUB, KURUCU)).govde.oturum as string;

    const bul = await cagir("GET", "/yonetim/oyuncu?ad=mehmet", { oturum: yb });
    assert.equal(bul.durum, 200);
    assert.equal(bul.govde.profil.hesapId, mehmet.hesap);
    assert.equal(bul.govde.yerlesim.id, "kizilca");
    assert.deepEqual(bul.govde.yaptirim.etkin, {});
    assert.equal((await cagir("GET", "/yonetim/oyuncu?ad=hayalet", { oturum: yb })).govde.hata, "kisi_yok");

    const kisa = await cagir("POST", "/yonetim/yaptirim", {
      oturum: yb, govde: { hedef: mehmet.hesap, tur: "uzaklastirma", gun: 3, gerekce: "kısa", istekNo: no() },
    });
    assert.deepEqual([kisa.durum, kisa.govde], [400, { hata: "gerekce_gecersiz" }]);
    const uzun = await cagir("POST", "/yonetim/yaptirim", {
      oturum: yb, govde: { hedef: mehmet.hesap, tur: "uzaklastirma", gun: 8, gerekce: "sınır dışı süre denemesi", istekNo: no() },
    });
    assert.equal(uzun.govde.hata, "gun_gecersiz");
    const yok = await cagir("POST", "/yonetim/yaptirim", {
      oturum: yb, govde: { hedef: "do-yok", tur: "susturma", gun: 1, gerekce: "olmayan hesap denemesi", istekNo: no() },
    });
    assert.equal(yok.govde.hata, "hesap_yok");

    const istek = { hedef: mehmet.hesap, tur: "uzaklastirma", gun: 3, gerekce: "tekrarlı hakaret, ilk uyarı", istekNo: no() };
    const y1 = await cagir("POST", "/yonetim/yaptirim", { oturum: yb, govde: istek });
    assert.equal(y1.durum, 200);
    const bitis = y1.govde.etkin.uzaklastirma.bitis as number;
    assert.ok(bitis > Date.now() + 2.9 * 86400000);
    const y2 = await cagir("POST", "/yonetim/yaptirim", { oturum: yb, govde: istek });
    assert.deepEqual(y2.govde, y1.govde, "aynı istekNo aynı sonuç");

    const engel = await cagir("GET", "/v1/profil", { oturum: mehmet.oturum });
    assert.deepEqual([engel.durum, engel.govde], [403, { hata: "uzaklastirildi", bitis }]);
    assert.equal((await cagir("POST", "/v1/temel-is", { oturum: mehmet.oturum, govde: { is: "odun", istekNo: no() } })).govde.hata, "uzaklastirildi");
    assert.equal((await cagir("GET", "/v1/duyurular", { oturum: mehmet.oturum })).durum, 403);
    const giris = await cagir("POST", "/v1/giris", { govde: { idToken: await belirtec(anahtar, { sub: "220000000000000000002" }) } });
    assert.equal(giris.durum, 200);
    assert.deepEqual(giris.govde.uzaklastirma, { bitis });

    const kaldir = await cagir("POST", "/yonetim/yaptirim-kaldir", {
      oturum: yb, govde: { hedef: mehmet.hesap, gerekce: "itiraz incelendi, haklı bulundu", istekNo: no() },
    });
    assert.equal(kaldir.durum, 200);
    assert.deepEqual(kaldir.govde.etkin, {});
    assert.equal((await cagir("GET", "/v1/profil", { oturum: mehmet.oturum })).durum, 200);
    assert.equal(
      (await cagir("POST", "/yonetim/yaptirim-kaldir", { oturum: yb, govde: { hedef: mehmet.hesap, gerekce: "kaldırılacak bir şey yok", istekNo: no() } })).govde.hata,
      "yaptirim_yok",
    );

    const kayit = (await cagir("GET", "/yonetim/kayit", { oturum: yb })).govde.kayitlar as { islem: string; sonuc: string }[];
    const ozet = kayit.map((k) => `${k.islem}:${k.sonuc}`).reverse();
    assert.deepEqual(ozet, [
      "giris:tamam",
      "oyuncuGor:tamam",
      "oyuncuGor:kisi_yok",
      "yaptirim:gerekce_gecersiz",
      "yaptirim:gun_gecersiz",
      "susturma:hesap_yok",
      "uzaklastirma:tamam",
      "yaptirimKaldir:tamam",
      "yaptirimKaldir:yaptirim_yok",
    ]);
  } finally {
    globalThis.fetch = eskiFetch;
  }
});

test("roller ve yetki: moderatör kalıcı/parametre/rol yapamaz (kayda girer), ortam kurucusu düşürülemez, rol alınınca belirteç işlemez", async () => {
  try {
    const { cagir, oyuncu, yonetici } = await kur();
    const mehmet = await oyuncu("220000000000000000002", "Mehmet");
    const yb = (await yonetici(KURUCU_SUB, KURUCU)).govde.oturum as string;
    assert.equal((await yonetici("440000000000000000004", MOD)).durum, 403);

    const r1 = await cagir("POST", "/yonetim/rol", { oturum: yb, govde: { eposta: "Mod@Ornek.com", rol: "moderator", gerekce: "yeni moderatör atandı", istekNo: no() } });
    assert.equal(r1.durum, 200);
    assert.deepEqual(r1.govde.roller, { [MOD]: "moderator" });
    assert.equal(
      (await cagir("POST", "/yonetim/rol", { oturum: yb, govde: { eposta: KURUCU, rol: null, gerekce: "kurucuyu düşürme denemesi", istekNo: no() } })).govde.hata,
      "kurucu_degismez",
    );
    assert.equal(
      (await cagir("POST", "/yonetim/rol", { oturum: yb, govde: { eposta: MOD, rol: "tanri", gerekce: "geçersiz rol denemesi", istekNo: no() } })).govde.hata,
      "rol_gecersiz",
    );
    // Kurucu rolü depodan verilemez; yalnız YONETICI_EPOSTALAR kurucudur.
    assert.equal(
      (await cagir("POST", "/yonetim/rol", { oturum: yb, govde: { eposta: "ortak@ornek.com", rol: "kurucu", gerekce: "ikinci kurucu denemesi", istekNo: no() } })).govde.hata,
      "rol_gecersiz",
    );
    assert.equal((await yonetici("550000000000000000005", "ortak@ornek.com")).durum, 403);

    const mg = await yonetici("440000000000000000004", MOD);
    assert.equal(mg.govde.rol, "moderator");
    const mb = mg.govde.oturum as string;
    const ben = await cagir("GET", "/yonetim/ben", { oturum: mb });
    assert.ok(!(ben.govde.yetkiler as string[]).includes("parametreDegistir"));

    const gecici = await cagir("POST", "/yonetim/yaptirim", {
      oturum: mb, govde: { hedef: mehmet.hesap, tur: "susturma", gun: 2, gerekce: "sohbette ısrarlı spam", istekNo: no() },
    });
    assert.equal(gecici.durum, 200);
    const kalici = await cagir("POST", "/yonetim/yaptirim", {
      oturum: mb, govde: { hedef: mehmet.hesap, tur: "kaliciUzaklastirma", gerekce: "moderatör kalıcı denemesi", istekNo: no() },
    });
    assert.deepEqual([kalici.durum, kalici.govde], [403, { hata: "yetki_yok" }]);
    for (const [uc, govde] of [
      ["parametre", { ad: "NPC_CARPAN", deger: 3, gerekce: "moderatör parametre denemesi", istekNo: no() }],
      ["rol", { eposta: "baska@ornek.com", rol: "moderator", gerekce: "moderatör rol denemesi", istekNo: no() }],
      ["duyuru", { metin: "merhaba", gerekce: "moderatör duyuru denemesi", istekNo: no() }],
    ] as const) {
      assert.equal((await cagir("POST", `/yonetim/${uc}`, { oturum: mb, govde })).govde.hata, "yetki_yok", uc);
    }
    assert.equal((await cagir("GET", "/yonetim/kayit", { oturum: mb })).govde.hata, "yetki_yok");

    // Kalıcı uzaklaştırmayı yalnız kurucu kaldırabilir.
    await cagir("POST", "/yonetim/yaptirim", {
      oturum: yb, govde: { hedef: mehmet.hesap, tur: "kaliciUzaklastirma", gerekce: "ağır hile, kanıtlı", istekNo: no() },
    });
    assert.equal((await cagir("GET", "/v1/profil", { oturum: mehmet.oturum })).govde.bitis, null);
    const modKaldir = await cagir("POST", "/yonetim/yaptirim-kaldir", {
      oturum: mb, govde: { hedef: mehmet.hesap, tur: "kaliciUzaklastirma", gerekce: "moderatör kalıcı kaldırma", istekNo: no() },
    });
    assert.equal(modKaldir.govde.hata, "yetki_yok");
    const modSustur = await cagir("POST", "/yonetim/yaptirim-kaldir", {
      oturum: mb, govde: { hedef: mehmet.hesap, tur: "susturma", gerekce: "susturma erken kaldırıldı", istekNo: no() },
    });
    assert.equal(modSustur.durum, 200);
    assert.deepEqual(modSustur.govde.etkin, { uzaklastirma: { bitis: null } });

    // Rol alınınca aynı moderatör belirteci hemen işe yaramaz.
    await cagir("POST", "/yonetim/rol", { oturum: yb, govde: { eposta: MOD, rol: null, gerekce: "moderatörlük sona erdi", istekNo: no() } });
    assert.deepEqual((await cagir("GET", "/yonetim/ben", { oturum: mb })).govde, { hata: "yetki_yok" });

    const kayit = (await cagir("GET", "/yonetim/kayit", { oturum: yb })).govde.kayitlar as { islem: string; sonuc: string; kim: string }[];
    const modDenemeleri = kayit.filter((k) => k.kim === MOD && k.sonuc === "yetki_yok").map((k) => k.islem).sort();
    assert.deepEqual(modDenemeleri, ["ben", "duyuru", "kaliciKaldir", "kaliciUzaklastirma", "kayitGor", "parametreDegistir", "rolVer"]);
  } finally {
    globalThis.fetch = eskiFetch;
  }
});

test("şikayet ve kendine fayda yasağı: kendini şikayet, sınır, susturma, kendi hakkında karar ve kendi hesabından kaldırma yasak", async () => {
  try {
    const { cagir, oyuncu, yonetici } = await kur();
    const ayse = await oyuncu(KURUCU_SUB, "Ayşe"); // kurucunun kendi oyuncu hesabı
    const mehmet = await oyuncu("220000000000000000002", "Mehmet");
    const yb = (await yonetici(KURUCU_SUB, KURUCU)).govde.oturum as string;
    await cagir("POST", "/yonetim/rol", { oturum: yb, govde: { eposta: MOD, rol: "moderator", gerekce: "moderatör atandı deneme", istekNo: no() } });
    const mb = (await yonetici("440000000000000000004", MOD)).govde.oturum as string;

    assert.equal((await cagir("POST", "/v1/sikayet", { oturum: mehmet.oturum, govde: { hedef: mehmet.hesap, neden: "kufur", istekNo: no() } })).govde.hata, "kendini_sikayet");
    assert.equal((await cagir("POST", "/v1/sikayet", { oturum: mehmet.oturum, govde: { hedef: ayse.hesap, neden: "canim", istekNo: no() } })).govde.hata, "sikayet_gecersiz");
    assert.equal((await cagir("POST", "/v1/sikayet", { oturum: mehmet.oturum, govde: { hedef: "do-yok", neden: "kufur", istekNo: no() } })).govde.hata, "kisi_yok");

    // Kurucu günlük sınırı 2'ye indirir: SIKAYET_GUNLUK Y1'de çalışma anında okunur.
    const p = await cagir("POST", "/yonetim/parametre", { oturum: yb, govde: { ad: "SIKAYET_GUNLUK", deger: 2, gerekce: "şikayet seli önlemi", istekNo: no() } });
    assert.equal(p.govde.deger, 2);
    const zeynep = await oyuncu("660000000000000000006", "Zeynep");
    const ali = await oyuncu("770000000000000000007", "Ali");
    const sk = { hedef: ayse.hesap, neden: "taciz", aciklama: "<script>alert(1)</script> sürekli rahatsız ediyor", istekNo: no() };
    const s1 = await cagir("POST", "/v1/sikayet", { oturum: mehmet.oturum, govde: sk });
    assert.equal(s1.durum, 200);
    assert.equal(s1.govde.birlesti, false);
    assert.deepEqual(await cagir("POST", "/v1/sikayet", { oturum: mehmet.oturum, govde: sk }).then((r) => r.govde), s1.govde, "tekrar güvenli");
    const cakisma = await cagir("POST", "/v1/sikayet", { oturum: mehmet.oturum, govde: { ...sk, neden: "spam" } });
    assert.equal(cakisma.govde.hata, "istekno_gecersiz", "aynı istekNo farklı gövdeyle çakışmadır");
    // (Şikayetçi, hedef) tekildir: ikinci kez sayılmaz, günlük hakkı yemez.
    // Profilin verdiği yerel kimlik (`o..`) şikayet edenin yerleşiminde hesap kimliğine çözülür.
    const ayseYerel = (await cagir("GET", "/v1/yerlesim", { oturum: ayse.oturum })).govde.ben.id as string;
    assert.match(ayseYerel, /^o[0-9]+$/);
    assert.equal((await cagir("POST", "/v1/sikayet", { oturum: mehmet.oturum, govde: { hedef: "o999", neden: "spam", istekNo: no() } })).govde.hata, "kisi_yok");
    const tekil = await cagir("POST", "/v1/sikayet", { oturum: mehmet.oturum, govde: { hedef: ayseYerel, neden: "spam", istekNo: no() } });
    assert.deepEqual([tekil.govde.id, tekil.govde.birlesti, tekil.govde.yeni], [s1.govde.id, true, false]);
    const s2 = await cagir("POST", "/v1/sikayet", { oturum: ayse.oturum, govde: { hedef: mehmet.hesap, neden: "kufur", istekNo: no() } });
    assert.equal(s2.durum, 200);
    // Farklı şikayetçiler aynı hedefte tek kayıtta birleşir.
    const z1 = await cagir("POST", "/v1/sikayet", { oturum: zeynep.oturum, govde: { hedef: ayse.hesap, neden: "hile", istekNo: no() } });
    assert.deepEqual([z1.govde.id, z1.govde.birlesti], [s1.govde.id, true]);
    await cagir("POST", "/v1/sikayet", { oturum: zeynep.oturum, govde: { hedef: mehmet.hesap, neden: "spam", istekNo: no() } });
    const sinir = await cagir("POST", "/v1/sikayet", { oturum: zeynep.oturum, govde: { hedef: ali.hesap, neden: "spam", istekNo: no() } });
    assert.deepEqual([sinir.durum, sinir.govde], [429, { hata: "sikayet_siniri" }]);

    const kuyruk = await cagir("GET", "/yonetim/sikayetler?durum=acik", { oturum: yb });
    assert.equal(kuyruk.govde.toplamAcik, 2, "hedef başına tek açık kayıt");
    const ayseHakkinda = (kuyruk.govde.sikayetler as { id: number; kendi: boolean; aciklama?: string; sayi: number; bildirimler: unknown[] }[]).find(
      (s) => s.id === s1.govde.id,
    );
    assert.equal(ayseHakkinda?.kendi, true);
    assert.deepEqual([ayseHakkinda?.sayi, ayseHakkinda?.bildirimler.length], [2, 2]);
    assert.equal(ayseHakkinda?.aciklama, sk.aciklama, "metin olduğu gibi saklanır; panel textContent ile yazar");

    // Kurucu kendi hakkındaki şikayete karar veremez; moderatör verebilir.
    const kendi = await cagir("POST", "/yonetim/sikayet-karar", { oturum: yb, govde: { id: s1.govde.id, karar: "reddet", gerekce: "kendi hakkımda karar", istekNo: no() } });
    assert.deepEqual([kendi.durum, kendi.govde], [403, { hata: "kendi_hedef" }]);
    const modKarar = await cagir("POST", "/yonetim/sikayet-karar", {
      oturum: mb, govde: { id: s1.govde.id, karar: "yaptirim", tur: "uzaklastirma", gun: 1, gerekce: "taciz doğrulandı, bir gün", istekNo: no() },
    });
    assert.equal(modKarar.durum, 200);
    assert.equal(modKarar.govde.sikayet.durum, "yaptirim");
    assert.equal(
      (await cagir("POST", "/yonetim/sikayet-karar", { oturum: mb, govde: { id: s1.govde.id, karar: "reddet", gerekce: "ikinci karar denemesi", istekNo: no() } })).govde.hata,
      "karar_verildi",
    );
    assert.equal((await cagir("GET", "/v1/profil", { oturum: ayse.oturum })).govde.hata, "uzaklastirildi");

    // Kurucu kendi oyuncu hesabının yaptırımını kaldıramaz.
    const kendiKaldir = await cagir("POST", "/yonetim/yaptirim-kaldir", { oturum: yb, govde: { hedef: ayse.hesap, gerekce: "kendimi affediyorum", istekNo: no() } });
    assert.deepEqual([kendiKaldir.durum, kendiKaldir.govde], [403, { hata: "kendi_hedef" }]);
    assert.equal((await cagir("GET", "/v1/profil", { oturum: ayse.oturum })).durum, 403);

    // Kurucu Mehmet hakkındaki şikayete susturma verir: Mehmet oynar ama şikayet açamaz.
    const karar2 = await cagir("POST", "/yonetim/sikayet-karar", {
      oturum: yb, govde: { id: s2.govde.id, karar: "yaptirim", tur: "susturma", gun: 3, gerekce: "küfür doğrulandı, üç gün", istekNo: no() },
    });
    assert.equal(karar2.durum, 200);
    assert.equal((await cagir("GET", "/v1/profil", { oturum: mehmet.oturum })).durum, 200);
    const sustu = await cagir("POST", "/v1/sikayet", { oturum: mehmet.oturum, govde: { hedef: ayse.hesap, neden: "spam", istekNo: no() } });
    assert.equal(sustu.durum, 403);
    assert.equal(sustu.govde.hata, "susturuldu");
    assert.equal(typeof sustu.govde.bitis, "number");

    // Moderatör başka yöneticinin e-postasını değil rolünü görür.
    const kapanan = await cagir("GET", "/yonetim/sikayetler?durum=yaptirim", { oturum: mb });
    const kararlar = (kapanan.govde.sikayetler as { karar: { kim: string } }[]).map((k) => k.karar.kim).sort();
    assert.deepEqual(kararlar, ["kurucu", MOD]);
    assert.equal((await cagir("GET", "/yonetim/sikayetler?durum=acik", { oturum: mb })).govde.toplamAcik, 0);
    // Karar sonrası aynı hedefe gelen şikayet yeni kayıt açar.
    const yeniKayit = await cagir("POST", "/v1/sikayet", { oturum: ali.oturum, govde: { hedef: mehmet.hesap, neden: "spam", istekNo: no() } });
    assert.equal(yeniKayit.govde.birlesti, false);
    assert.notEqual(yeniKayit.govde.id, s2.govde.id);
  } finally {
    globalThis.fetch = eskiFetch;
  }
});

test("parametreler: sürümlü değiştir, sınır, geri al ve duyurular (son 5, yazan gizli)", async () => {
  try {
    const { env: kurucuEnv, cagir, oyuncu, yonetici } = await kur();
    const mehmet = await oyuncu("220000000000000000002", "Mehmet");
    const yb = (await yonetici(KURUCU_SUB, KURUCU)).govde.oturum as string;

    const liste = await cagir("GET", "/yonetim/parametreler", { oturum: yb });
    const ilkCalisma = await yonetimCagir<Record<string, number>>(kurucuEnv, { islem: "parametrelerCalisma" });
    assert.equal(ilkCalisma.ok && ilkCalisma.deger.NPC_CARPAN, 2.5);
    const adlar = (liste.govde.parametreler as { ad: string }[]).map((p) => p.ad);
    assert.deepEqual(adlar, [
      "NPC_AYLIK_KOTA", "NPC_CARPAN", "KITLIK_PRIM", "SIPARIS_ODUL_CARPANI", "STOK_CARPAN", "TEMEL_CIKTI", "AZALAN_PENCERE_IS", "HIZ_SINIRI", "SIKAYET_GUNLUK", "GECICI_UZAKLASTIRMA_EN_COK_GUN",
    ]);
    const yaz = (ad: string, deger: unknown) =>
      cagir("POST", "/yonetim/parametre", { oturum: yb, govde: { ad, deger, gerekce: "denge ayarı denemesi", istekNo: no() } });
    assert.equal((await yaz("BILINMEYEN", 1)).govde.hata, "parametre_gecersiz");
    assert.equal((await yaz("NPC_CARPAN", 99)).govde.hata, "deger_sinir_disi");
    assert.equal((await yaz("NPC_CARPAN", 3)).govde.deger, 3);
    const yeniCalisma = await yonetimCagir<Record<string, number>>(kurucuEnv, { islem: "parametrelerCalisma" });
    assert.equal(yeniCalisma.ok && yeniCalisma.deger.NPC_CARPAN, 3, "YonetimDO oyun modülüne etkin sürümü verir");
    const ikinci = await yaz("NPC_CARPAN", 3.5);
    assert.deepEqual([ikinci.govde.deger, ikinci.govde.surum, ikinci.govde.varsayilan], [3.5, 2, 2.5]);
    const geri = (gerekce = "yanlış ayar geri alındı") =>
      cagir("POST", "/yonetim/parametre-geri", { oturum: yb, govde: { ad: "NPC_CARPAN", gerekce, istekNo: no() } });
    assert.equal((await geri()).govde.deger, 3);
    assert.equal((await geri()).govde.deger, 2.5);
    assert.equal((await geri()).govde.hata, "geri_yok");
    const son = (await cagir("GET", "/yonetim/parametreler", { oturum: yb })).govde.parametreler[1];
    assert.equal(son.gecmis.length, 4);

    // Geçici uzaklaştırma sınırı Y1'de çalışma anında okunur.
    await yaz("GECICI_UZAKLASTIRMA_EN_COK_GUN", 10);
    const on = await cagir("POST", "/yonetim/yaptirim", {
      oturum: yb, govde: { hedef: mehmet.hesap, tur: "uzaklastirma", gun: 10, gerekce: "artırılmış sınır denemesi", istekNo: no() },
    });
    assert.equal(on.durum, 200);
    await cagir("POST", "/yonetim/yaptirim-kaldir", { oturum: yb, govde: { hedef: mehmet.hesap, gerekce: "deneme bitti, kaldırıldı", istekNo: no() } });

    for (let i = 1; i <= 6; i++) {
      const d = await cagir("POST", "/yonetim/duyuru", { oturum: yb, govde: { metin: `Duyuru ${i}`, gerekce: "oyunculara bilgi verme", istekNo: no() } });
      assert.equal(d.durum, 200);
    }
    assert.equal((await cagir("POST", "/yonetim/duyuru", { oturum: yb, govde: { metin: "  ", gerekce: "boş duyuru denemesi", istekNo: no() } })).govde.hata, "duyuru_gecersiz");
    const okunan = await cagir("GET", "/v1/duyurular", { oturum: mehmet.oturum });
    const duyurular = okunan.govde.duyurular as Record<string, unknown>[];
    assert.deepEqual(duyurular.map((d) => d.metin), ["Duyuru 6", "Duyuru 5", "Duyuru 4", "Duyuru 3", "Duyuru 2"]);
    assert.ok(duyurular.every((d) => !("kim" in d)), "yazan yöneticinin e-postası oyuncuya gitmez");

    // Sayfalı işlem kaydı.
    const s1 = await cagir("GET", "/yonetim/kayit", { oturum: yb });
    const toplam = s1.govde.toplam as number;
    assert.ok(toplam >= 17);
    assert.equal((await cagir("GET", "/yonetim/kayit?imlec=0", { oturum: yb })).govde.hata, "imlec_gecersiz");
    const s2 = await cagir("GET", "/yonetim/kayit?imlec=3", { oturum: yb });
    assert.deepEqual((s2.govde.kayitlar as { no: number }[]).map((k) => k.no), [2, 1]);
    assert.equal(s2.govde.dahaVar, false);
  } finally {
    globalThis.fetch = eskiFetch;
  }
});

test("panel: Türkçe HTML, sıkı CSP (özetli satır içi betik/stil), çerçeve yasağı, dış kaynak yok", async () => {
  const cagir = istemci(ortam());
  const r = await cagir("GET", "/yonetim");
  assert.equal(r.durum, 200);
  assert.match(r.yanit.headers.get("content-type") ?? "", /^text\/html/);
  assert.equal(r.yanit.headers.get("x-frame-options"), "DENY");
  const csp = r.yanit.headers.get("content-security-policy") ?? "";
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.ok(!csp.includes("unsafe-inline") && !csp.includes("unsafe-eval"));
  const html = r.govde.metin as string;
  assert.match(html, /<html lang="tr">/);
  assert.ok(!/https?:\/\//.test(html), "dış kaynak yok");
  assert.ok(!/\son[a-z]+=/i.test(html), "satır içi olay işleyicisi yok");
  assert.ok(!html.includes("innerHTML"));
  for (const bolum of ["Giriş", "Oyuncu ara", "Şikayet kuyruğu", "Ekonomi sağlığı", "Parametreler", "Duyuru", "İşlem kaydı"]) assert.ok(html.includes(bolum), bolum);
  const ozet = async (m: string) => {
    const b = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(m)));
    return `'sha256-${btoa(String.fromCharCode(...b))}'`;
  };
  assert.ok(csp.includes(`script-src ${await ozet(PANEL_PARCALARI.BETIK)}`));
  assert.ok(csp.includes(`style-src ${await ozet(PANEL_PARCALARI.STIL)}`));
  assert.ok(html.includes(`<script>${PANEL_PARCALARI.BETIK}</script>`));
  assert.equal((await cagir("POST", "/yonetim")).durum, 405);
});


test("Y2 ekonomi sağlığı: kurucu yerleşim toplamlarını görür, oyuncu kimlikleri açığa çıkmaz", async () => {
  try {
    const { cagir, oyuncu, yonetici } = await kur();
    const mehmet = await oyuncu("220000000000000000002", "Mehmet", "kizilca");
    const yb = (await yonetici(KURUCU_SUB, KURUCU)).govde.oturum as string;
    const rapor = await cagir("GET", "/yonetim/ekonomi", { oturum: yb });
    assert.equal(rapor.durum, 200);
    assert.ok(rapor.govde.toplam.oyuncuSayisi >= 1);
    assert.ok(rapor.govde.yerlesimler.some((x: { yerlesim: string }) => x.yerlesim === "kizilca"));
    assert.equal(rapor.govde.eksikYerlesim, 0);
    assert.ok(!JSON.stringify(rapor.govde).includes(mehmet.hesap), "raporda hesap kimliği yok");
    assert.ok(rapor.govde.yerlesimler.every((x: Record<string, unknown>) => !("oyuncular" in x) && !("hesaplar" in x)));
  } finally {
    globalThis.fetch = eskiFetch;
  }
});
