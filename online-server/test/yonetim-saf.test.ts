// Y1 yönetim çekirdeğinin saf kuralları: yetki matrisi, roller, parametre sürümleme, yaptırım, şikayet, belirteç.
import test from "node:test";
import assert from "node:assert/strict";
import { GoogleDogrulayici } from "../src/google.ts";
import { oturumDogrula, oturumOlustur } from "../src/oturum.ts";
import { yoneticiOturumuDogrula, yoneticiOturumuOlustur, YONETICI_OTURUM_SURESI_MS } from "../src/yonetim/kimlik.ts";
import {
  degerDogrula,
  etkinDeger,
  parametreAdiCoz,
  parametreDegistir,
  parametreGeriAl,
  parametreOzeti,
  PARAMETRELER,
} from "../src/yonetim/parametre.ts";
import { gunlukSay, sikayetGirdisiCoz, trGunu } from "../src/yonetim/sikayet.ts";
import {
  etkinOzet,
  gerekceCoz,
  GUN_MS,
  uzaklastirmaBilgisi,
  yaptirimEngeli,
  yaptirimGirdisiCoz,
  type Yaptirim,
} from "../src/yonetim/yaptirim.ts";
import { epostaDuzenle, kurucuListesi, rolCoz, yetkiler, yetkiVar, YETKI } from "../src/yonetim/yetki.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteJwks } from "./yardimci.ts";

const GIZLI = "o".repeat(48);
const IST = "istek-000001";

test("yetki matrisi: moderatör sınırlı, kurucu her şey, bilinmeyen ve rolsüz reddedilir", () => {
  for (const i of ["sikayetGor", "sikayetKarar", "susturma", "uzaklastirma", "oyuncuGor", "adDegisikligiZorunlu", "yaptirimKaldir"]) {
    assert.ok(yetkiVar("moderator", i), i);
  }
  for (const i of ["parametreDegistir", "parametreGeri", "kaliciUzaklastirma", "kaliciKaldir", "rolVer", "duyuru", "iade", "kayitGor"]) {
    assert.equal(yetkiVar("moderator", i), false, i);
    assert.ok(yetkiVar("kurucu", i), i);
  }
  for (const i of Object.keys(YETKI)) assert.ok(yetkiVar("kurucu", i));
  assert.equal(yetkiVar("kurucu", "dunyayiSil"), false);
  assert.equal(yetkiVar("kurucu", "toString"), false);
  assert.equal(yetkiVar(undefined, "ben"), false);
  assert.deepEqual(yetkiler(undefined), []);
  assert.ok(yetkiler("moderator").length < yetkiler("kurucu").length);
});

test("roller: ortamdaki kurucu baskın, boş liste kimseyi yönetici yapmaz, istemci rolü yok sayılır", () => {
  const k = kurucuListesi(" Berkay@Ornek.com , ,bozuk, ikinci@ornek.com");
  assert.deepEqual([...k], ["berkay@ornek.com", "ikinci@ornek.com"]);
  assert.equal(kurucuListesi(undefined).size, 0);
  assert.equal(kurucuListesi("").size, 0);
  assert.equal(rolCoz("berkay@ornek.com", k, "moderator"), "kurucu");
  assert.equal(rolCoz("mod@ornek.com", k, "moderator"), "moderator");
  assert.equal(rolCoz("mod@ornek.com", k, "tanri"), undefined);
  assert.equal(rolCoz("berkay@ornek.com", new Set(), undefined), undefined);
  assert.equal(epostaDuzenle("  A@B.co "), "a@b.co");
  assert.equal(epostaDuzenle("a,b@c"), undefined);
  assert.equal(epostaDuzenle(5), undefined);
});

test("parametre: izinli ad, sınır, sürümlü değiştir ve adım adım geri al", () => {
  assert.equal(parametreAdiCoz("NPC_CARPAN"), "NPC_CARPAN");
  assert.equal(parametreAdiCoz("constructor"), undefined);
  assert.equal(parametreAdiCoz("YOK"), undefined);
  const t = PARAMETRELER.NPC_AYLIK_KOTA;
  assert.deepEqual(degerDogrula(t, 2.5), { ok: false, hata: "deger_sinir_disi" });
  assert.deepEqual(degerDogrula(t, 999), { ok: false, hata: "deger_sinir_disi" });
  assert.deepEqual(degerDogrula(t, "4"), { ok: false, hata: "deger_sinir_disi" });
  assert.deepEqual(degerDogrula(PARAMETRELER.NPC_CARPAN, 2.75), { ok: true, deger: 2.75 });
  assert.deepEqual(degerDogrula(PARAMETRELER.NPC_CARPAN, 1), { ok: false, hata: "deger_sinir_disi" });
  for (const [ad, p] of Object.entries(PARAMETRELER)) {
    assert.ok(p.alt <= p.varsayilan && p.varsayilan <= p.ust, `${ad} varsayılan sınır içinde`);
    assert.ok(p.aciklama.length > 0 && (p.uygulama === "Y1" || p.uygulama === "Y2"));
  }
  const iz = { kim: "k@o.com", zaman: 1, gerekce: "deneme gerekçesi" };
  const k1 = parametreDegistir(t, undefined, 5, iz);
  const k2 = parametreDegistir(t, k1, 7, { ...iz, zaman: 2 });
  assert.equal(etkinDeger(t, k2), 7);
  assert.deepEqual(k2.gecmis.map((g) => [g.surum, g.onceki, g.deger]), [[1, 3, 5], [2, 5, 7]]);
  const g1 = parametreGeriAl(t, k2, iz);
  assert.ok(g1.ok);
  assert.equal(etkinDeger(t, g1.deger), 5);
  const g2 = parametreGeriAl(t, g1.deger, iz);
  assert.ok(g2.ok);
  assert.equal(etkinDeger(t, g2.deger), t.varsayilan);
  assert.equal(g2.deger.gecmis.length, 4, "eski değerler saklanır");
  assert.deepEqual(parametreGeriAl(t, g2.deger, iz), { ok: false, hata: "geri_yok" });
  assert.deepEqual(parametreGeriAl(t, undefined, iz), { ok: false, hata: "geri_yok" });
  const oz = parametreOzeti("NPC_AYLIK_KOTA", g2.deger);
  assert.equal(oz.surum, 4);
  assert.equal(oz.gecmis[0]?.surum, 4, "yeniden eskiye");
});

test("yaptırım girdisi: tür, gün sınırı, gerekçe, istekNo", () => {
  const g = { hedef: "do-abc", tur: "uzaklastirma", gun: 7, gerekce: "tekrarlı küfür ve taciz", istekNo: IST };
  assert.ok(yaptirimGirdisiCoz(g, 7).ok);
  assert.deepEqual(yaptirimGirdisiCoz({ ...g, gun: 8 }, 7), { ok: false, hata: "gun_gecersiz" });
  assert.ok(yaptirimGirdisiCoz({ ...g, gun: 8 }, 10).ok, "sınır parametreden gelir");
  assert.deepEqual(yaptirimGirdisiCoz({ ...g, gun: 1.5 }, 7), { ok: false, hata: "gun_gecersiz" });
  assert.deepEqual(yaptirimGirdisiCoz({ ...g, tur: "kaliciUzaklastirma" }, 7), { ok: false, hata: "gun_gecersiz" });
  const { gun: _g, ...gunsuz } = g;
  assert.ok(yaptirimGirdisiCoz({ ...gunsuz, tur: "kaliciUzaklastirma" }, 7).ok);
  assert.deepEqual(yaptirimGirdisiCoz({ ...g, tur: "idam" }, 7), { ok: false, hata: "yaptirim_gecersiz" });
  assert.deepEqual(yaptirimGirdisiCoz({ ...g, gerekce: "kısa" }, 7), { ok: false, hata: "gerekce_gecersiz" });
  assert.deepEqual(yaptirimGirdisiCoz({ ...g, istekNo: "x" }, 7), { ok: false, hata: "istekno_gecersiz" });
  assert.deepEqual(yaptirimGirdisiCoz({ ...g, hedef: "a/b" }, 7), { ok: false, hata: "hesap_yok" });
  assert.deepEqual(gerekceCoz("  \u0000 on karakter  "), { ok: true, deger: "on karakter" });
  assert.deepEqual(gerekceCoz("x".repeat(501)), { ok: false, hata: "gerekce_gecersiz" });
});

test("yaptırım özeti ve engel: kalıcı baskın, kaldırılan ve süresi dolan etkisiz, giriş muaf", () => {
  const s = 1_000_000;
  const y = (id: number, tur: Yaptirim["tur"], bitis: number | null, kaldir = false): Yaptirim => ({
    id, tur, baslangic: s, bitis, kim: "m@o.com", gerekce: "gerekçe gerekçe",
    ...(kaldir ? { kaldirma: { kim: "k@o.com", zaman: s, gerekce: "affedildi uzunca" } } : {}),
  });
  assert.deepEqual(etkinOzet([y(1, "uzaklastirma", s + GUN_MS), y(2, "uzaklastirma", s + 3 * GUN_MS)], s), {
    uzaklastirma: { bitis: s + 3 * GUN_MS },
  });
  assert.deepEqual(etkinOzet([y(1, "uzaklastirma", s + GUN_MS), y(2, "kaliciUzaklastirma", null)], s), {
    uzaklastirma: { bitis: null },
  });
  assert.deepEqual(etkinOzet([y(1, "kaliciUzaklastirma", null, true), y(2, "susturma", s - 1)], s), {});
  const durum = etkinOzet([y(1, "uzaklastirma", s + GUN_MS), y(2, "susturma", s + 2 * GUN_MS)], s);
  assert.deepEqual(yaptirimEngeli(durum, "profil", s), { ok: false, hata: "uzaklastirildi", bitis: s + GUN_MS });
  assert.equal(yaptirimEngeli(durum, "giris", s), undefined);
  assert.deepEqual(uzaklastirmaBilgisi(durum, s), { bitis: s + GUN_MS });
  // Uzaklaştırma bitince yalnız susturma kalır: oyun açık, şikayet kapalı.
  const sonra = s + GUN_MS + 1;
  assert.equal(yaptirimEngeli(durum, "profil", sonra), undefined);
  assert.deepEqual(yaptirimEngeli(durum, "sikayet", sonra), { ok: false, hata: "susturuldu", bitis: s + 2 * GUN_MS });
  assert.equal(yaptirimEngeli(undefined, "profil", s), undefined);
});

test("şikayet girdisi ve günlük sınır (TR günü)", () => {
  const g = { hedef: "do-xyz", neden: "kufur", aciklama: "  çok kaba  ", istekNo: IST };
  assert.deepEqual(sikayetGirdisiCoz(g), { ok: true, deger: { hedef: "do-xyz", neden: "kufur", aciklama: "çok kaba", istekNo: IST } });
  assert.deepEqual(sikayetGirdisiCoz({ ...g, neden: "canim-sikildi" }), { ok: false, hata: "sikayet_gecersiz" });
  assert.deepEqual(sikayetGirdisiCoz({ ...g, aciklama: "x".repeat(501) }), { ok: false, hata: "sikayet_gecersiz" });
  assert.deepEqual(sikayetGirdisiCoz({ ...g, hedef: 7 }), { ok: false, hata: "kisi_yok" });
  const gun0 = Date.UTC(2026, 10, 8, 20, 59); // TR 23:59
  assert.equal(trGunu(gun0) + 1, trGunu(gun0 + 2 * 60_000), "TR gece yarısında gün döner");
  let d = gunlukSay(undefined, gun0, 2);
  assert.ok(d.izin);
  d = gunlukSay(d.durum, gun0, 2);
  assert.ok(d.izin);
  assert.equal(gunlukSay(d.durum, gun0, 2).izin, false);
  assert.ok(gunlukSay(d.durum, gun0 + 2 * 60_000, 2).izin, "ertesi gün yeniden açılır");
});

test("yönetici belirteci oyuncu belirtecinden ayrıdır ve 12 saat geçerlidir", async () => {
  const simdi = Date.now();
  const yb = await yoneticiOturumuOlustur({ sub: "1234", eposta: "k@o.com" }, GIZLI, simdi);
  assert.deepEqual(await yoneticiOturumuDogrula(yb, GIZLI, simdi), { ok: true, sub: "1234", eposta: "k@o.com" });
  assert.deepEqual((await oturumDogrula(yb, GIZLI, simdi)).ok, false, "yönetici belirteci oyuncu doğrulamasından geçmez");
  const ob = await oturumOlustur("do-hesap", GIZLI, simdi);
  assert.deepEqual(await yoneticiOturumuDogrula(ob, GIZLI, simdi), { ok: false, hata: "oturum_gecersiz" });
  assert.deepEqual(await yoneticiOturumuDogrula(yb, GIZLI, simdi + YONETICI_OTURUM_SURESI_MS + 1), {
    ok: false,
    hata: "oturum_suresi_doldu",
  });
  assert.equal((await yoneticiOturumuDogrula(yb, "b".repeat(48), simdi)).ok, false);
});

test("Google: e-posta yalnız email_verified doğruysa döner", async () => {
  const anahtar = await rsaAnahtari("kid-e");
  const jwks = sahteJwks([anahtar]);
  const d = new GoogleDogrulayici({ fetch: jwks.getir });
  const simdi = Date.now();
  const dogru = await d.dogrula(await jwtImzala(anahtar, googleYuku(simdi, { email: "Berkay@Ornek.com", email_verified: true })), [ISTEMCI]);
  assert.equal(dogru.eposta, "berkay@ornek.com");
  const yanlis = await d.dogrula(await jwtImzala(anahtar, googleYuku(simdi, { email: "x@o.com", email_verified: false })), [ISTEMCI]);
  assert.equal(yanlis.eposta, undefined);
  const yok = await d.dogrula(await jwtImzala(anahtar, googleYuku(simdi, { email: "x@o.com" })), [ISTEMCI]);
  assert.equal(yok.eposta, undefined);
});
