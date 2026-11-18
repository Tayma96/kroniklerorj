// İstemci uyumu (18 Kasım denetimi): mobil istemcinin GERÇEK HTTP istemcileri ve yanıt doğrulayıcıları esbuild ile
// derlenir (test/istemci-uyum/derle.ts), gerçek sunucu DO'larına karşı açılış → çocukluk → ay ilerletme → yetişkinlik
// (yaş 20, akçe) → meslek/temel iş/beceri/pazar/han/topluluk/profil/tezgâh/atölye/kervan → ay ilerletme akışı koşulur.
// Her yanıt istemci doğrulayıcısından geçer. Test şunlarda düşer: istemci yanıtı anlamazsa (`gecersiz_yanit`, ekran
// kalıcı kilitlenir) ya da sunucunun gönderdiği hata kodu istemci sonucunda (hata ya da ham) kaybolursa.
// İkinci test: sunucu hata kodlarından oyuncuya metni olmayanları listeler (yönetim, mağaza, e-posta kodları hariç).
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import isleyici, { BolgeDO, DunyaDO, HesapDO, IsletmeDO, MasaDO, SultanlikDO, YerlesimDO, YonetimDO, testKovaSifirla } from "../src/index.ts";
import { HATA_DURUMU } from "../src/tipler.ts";
import { zarSirriAyarla } from "../src/yerlesim/zar-sirri.ts";
import { sahteAdAlani } from "./yardimci.ts";
import { hibernasyonlu, sahteAraclar } from "./han-yardimci.ts";
import { istemciDerle, type IstemciPaketi } from "./istemci-uyum/derle.ts";
import { cocukAdimlari, yetiskinAdimlari, type Baglam } from "./istemci-uyum/adimlar.ts";

const I: IstemciPaketi | null = await istemciDerle();
const ATLA = I ? false : "mobile/node_modules (esbuild) yok";
const KOD = "Istemci-Uyum-Test-Davet-Kodu-2026-Deneme";

// Saat: gerçek zaman + kaydırma (ay ilerletme ve hız sınırı penceresi için).
const gercekNow = Date.now.bind(Date);
const fark = { ms: 0 };
const saat = () => Date.now();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ortam(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env: any = { GOOGLE_CLIENT_ID: "", OTURUM_ANAHTARI: "u".repeat(48), ZAR_SIRRI: "z".repeat(40), TEST_GIRIS_ACIK: "1", TEST_GIRIS_KODU: KOD };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ad = (f: (ctx: any) => unknown) => sahteAdAlani(f as never);
  env.HESAP = ad((ctx) => new HesapDO(ctx, env));
  env.DUNYA = ad((ctx) => new DunyaDO(ctx, env));
  env.YERLESIM = ad((ctx) => new YerlesimDO(ctx, env, saat));
  env.ISLETME = ad((ctx) => new IsletmeDO(ctx, env, saat));
  env.YONETIM = ad((ctx) => new YonetimDO(ctx, env));
  env.MASA = ad((ctx) => new MasaDO(hibernasyonlu(ctx), env, sahteAraclar()));
  env.BOLGE = ad((ctx) => new BolgeDO(ctx, env, saat));
  env.SULTANLIK = ad((ctx) => new SultanlikDO(ctx, env, saat));
  return env;
}

interface Kayit { evre: string; ad: string; sonuc: string; yol: string; ham?: unknown; sunucuHata?: string }

test("istemci doğrulayıcıları gerçek sunucu yanıtlarını kabul eder (uçtan uca akış)", { skip: ATLA }, async () => {
  const env = ortam();
  const eskiFetch = globalThis.fetch;
  const eskiNow = Date.now;
  Date.now = () => gercekNow() + fark.ms;
  let ip = 10;
  let son: { govde: unknown; yol: string } = { govde: undefined, yol: "" };
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    const h = new Headers(init?.headers ?? {});
    h.set("cf-connecting-ip", `203.0.113.${ip}`);
    const y = await isleyici.fetch(new Request(url, { method: init?.method, headers: h, body: init?.body ?? null }), env);
    const metin = await y.text();
    let govde: unknown;
    try { govde = JSON.parse(metin); } catch { govde = undefined; }
    son = { govde, yol: `${init?.method ?? "GET"} ${new URL(url).pathname} ${y.status}` };
    return new Response(metin, { status: y.status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  const O = { oturum: { tur: "test" }, profil: null as unknown, yerlesim: null as unknown };
  g.__O = O;
  const kayit: Kayit[] = [];
  let evre = "acilis";
  let istekSay = 0;
  let pencere = 0;
  const no = () => `uyum-${(++istekSay).toString().padStart(8, "0")}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dene = async (ad: string, p: Promise<any>) => {
    const r = await p;
    if (++pencere >= 12) { pencere = 0; fark.ms += 61_000; } // hız sınırı penceresi
    const k: Kayit = { evre, ad, sonuc: r.ok ? "ok" : `${r.hata}${r.ham ? "(" + r.ham + ")" : ""}`, yol: son.yol };
    const sh = (son.govde as { hata?: unknown } | undefined)?.hata;
    if (!r.ok && typeof sh === "string") k.sunucuHata = sh;
    if (!r.ok && r.hata === "gecersiz_yanit") k.ham = son.govde;
    kayit.push(k);
    return r.ok ? r.deger : undefined;
  };
  const http = (oturum: () => string | null) => I.httpIstemci({ adres: "https://kronikler-online.test", oturum, deneme: 1, zamanAsimiMs: 60_000 });
  const oyuncu = async (ad: string, cihaz: string) => {
    ip++;
    let belirtec: string | null = null;
    const c = http(() => belirtec);
    const gir = await dene(`${ad}:testGiris`, c.testGiris(KOD, cihaz));
    belirtec = gir?.oturum ?? null;
    await dene(`${ad}:profil(yok)`, c.profil());
    const profil = await dene(`${ad}:profilOlustur`, c.profilOlustur({ ad, cinsiyet: "erkek", yerlesim: "develi", istekNo: no() }));
    return { c, belirtec: () => belirtec, profil };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ben = (o: any) => { g.__OTURUM = o.belirtec(); };

  testKovaSifirla();
  try {
    const A = await oyuncu("Kerem", "test-0123456789abcdefghijklmnopA");
    const B = await oyuncu("Ayse", "test-0123456789abcdefghijklmnopB");
    assert.ok(A.belirtec() && B.belirtec(), "test girişi başarısız");
    ben(A);
    const c = A.c;
    await dene("dunya", c.dunya());
    const turSet = async () => {
      const y = await dene("yerlesim", c.yerlesim("tr"));
      O.yerlesim = y;
      O.profil = await dene("profil", c.profil());
      await dene("olaylar", c.olaylar(0, "tr"));
      await dene("siparisler", c.siparisler("tr"));
      await dene("lonca", c.lonca());
      return y;
    };
    await turSet();
    assert.ok(O.yerlesim, "ilk GET /v1/yerlesim istemcide geçersiz");
    const x: Baglam = { I, A, B, c, O, env, fark, dene, no, ben, setEvre: (e) => { evre = e; }, turSet };
    await cocukAdimlari(x);
    await yetiskinAdimlari(x);
  } finally {
    globalThis.fetch = eskiFetch;
    Date.now = eskiNow;
    zarSirriAyarla(undefined, true);
    testKovaSifirla();
  }

  assert.ok(kayit.length > 300, `akış kısa kaldı: ${kayit.length} çağrı`);
  const anlasilmayan = kayit.filter((k) => k.sonuc === "gecersiz_yanit");
  assert.deepEqual(anlasilmayan.map((k) => `[${k.evre}] ${k.ad} ${k.yol}: ${JSON.stringify(k.ham).slice(0, 300)}`), [],
    "istemci doğrulayıcısı sunucu yanıtını reddetti (gecersiz_yanit)");
  // Sunucunun hata kodu istemci sonucunda (hata ya da ham) taşınmalı; aksi hâlde ekran yanlış metin gösterir.
  const kaybolan = kayit.filter((k) => k.sunucuHata && k.sonuc !== k.sunucuHata && !k.sonuc.endsWith(`(${k.sunucuHata})`));
  assert.deepEqual(kaybolan.map((k) => `[${k.evre}] ${k.ad} ${k.yol}: sunucu ${k.sunucuHata} → istemci ${k.sonuc}`), [],
    "sunucu hata kodu istemcide kayboldu");
});

/** Oyuncuya hiç gösterilmeyen ya da istemcide ekranı olmayan kodlar (açıkça hariç). */
const HARIC: Record<string, string> = Object.fromEntries([
  // Yönetim paneli (online-server/src/yonetim): yalnız panelde görünür.
  ...["telafi_gunluk_siniri", "parametre_capraz", "parametre_gecersiz", "gun_gecersiz", "yaptirim_gecersiz",
    "yaptirim_yok", "sikayet_yok", "geri_yok", "kurucu_degismez", "duyuru_gecersiz", "etkinlik_gecersiz", "etkinlik_siniri",
    "etkinlik_suruyor", "hesap_yok"].map((k) => [k, "yönetim"]),
  // Mağaza ve ödeme (istemcide henüz ekran yok).
  ...["urun_satilmaz", "zaten_sahip", "magaza_gecersiz", "magaza_yapilandirilmamis", "makbuz_gecersiz", "makbuz_kullanilmis",
    "makbuz_iade", "odeme_beklemede"].map((k) => [k, "mağaza"]),
  // E-posta girişi (taslak dalda; istemcide ekran yok).
  ...["eposta_dogrulanmamis", "eposta_gecersiz"].map((k) => [k, "e-posta"]),
  // İç kodlar: sayfalama imleci (istemci üretir).
  ["imlec_gecersiz", "iç"],
]);

test("sunucu hata kodlarının istemcide oyuncu metni var", { skip: ATLA }, () => {
  const mobil = new URL("../../mobile/", import.meta.url).pathname;
  const dizin = mobil + "lib/i18n-sayfa/";
  let metin = readFileSync(mobil + "lib/i18n.tsx", "utf8");
  for (const f of readdirSync(dizin)) metin += readFileSync(dizin + f, "utf8");
  const anahtarVar = (k: string) => metin.includes(`"${k}"`);
  // Ekrana özgü tablolar: atölye (onl.atl.h.), eşya (onl.es.h.), masa oyunu (onl.mo.hata.), künye (onl.kn.h.) vb.
  const ekranAnahtari = (kod: string) => new RegExp(`"onl\\.[A-Za-z0-9.]*\\.${kod}"`).test(metin);
  const eksik: string[] = [];
  for (const kod of Object.keys(HATA_DURUMU)) {
    if (HARIC[kod]) continue;
    const ek = I.ekHataMi(kod);
    const anahtar: string = ek ? I.ekHataAnahtari(kod) : I.hataAnahtari(kod);
    const ortak = (I.protokol.hataKoduMu(kod) || ek) && anahtar !== "onl.h.genel" && anahtarVar(anahtar);
    const kunye: string = I.kunyeHataAnahtari(kod);
    const ekranTablosu = kunye !== "onl.h.genel" && anahtarVar(kunye) && kunye.startsWith("onl.kn.");
    if (!ortak && !ekranTablosu && !ekranAnahtari(kod)) eksik.push(kod);
  }
  assert.deepEqual(eksik, [], "istemcide metni olmayan sunucu hata kodları");
});
