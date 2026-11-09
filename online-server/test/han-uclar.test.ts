// Han masası uçtan uca: gerçek Worker yönlendiricisi + gerçek DO sınıfları (MasaDO dahil), sahte hibernation soketleri.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, MasaDO, YerlesimDO, YonetimDO } from "../src/index.ts";
import { hesapCagir } from "../src/ic.ts";
import { KAPANIS } from "../src/han/kurallar.ts";
import { MASA_ATMA } from "../src/han/y1-kayit.ts";
import type { Env } from "../src/tipler.ts";
import { hibernasyonlu, sahteAraclar, type SahteWebSoket } from "./han-yardimci.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks, type TestAnahtari } from "./yardimci.ts";

type Yanit = { durum: number; govde: Record<string, any> };

let sayac = 0;
const no = (): string => `han-${String(++sayac).padStart(8, "0")}`;
let ortakAnahtar: TestAnahtari | undefined;

async function kur() {
  ortakAnahtar ??= await rsaAnahtari("kid-han");
  const anahtar = ortakAnahtar;
  globalThis.fetch = sahteJwks([anahtar]).getir;
  const araclar = sahteAraclar();
  const env = { GOOGLE_CLIENT_ID: ISTEMCI, OTURUM_ANAHTARI: "o".repeat(48) } as Env;
  const hesap = sahteAdAlani((ctx) => new HesapDO(ctx, env));
  const masa = sahteAdAlani((ctx) => new MasaDO(hibernasyonlu(ctx), env, araclar));
  const yonetim = sahteAdAlani((ctx) => new YonetimDO(ctx, env));
  const dunya = sahteAdAlani((ctx) => new DunyaDO(ctx, env));
  const yerlesim = sahteAdAlani((ctx) => new YerlesimDO(ctx, env));
  Object.assign(env, { HESAP: hesap, MASA: masa, YONETIM: yonetim, DUNYA: dunya, YERLESIM: yerlesim });
  const simdi = Date.now();
  const cagir = async (yontem: string, yol: string, s: { govde?: unknown; oturum?: string; baslik?: Record<string, string> } = {}): Promise<Yanit> => {
    const basliklar: Record<string, string> = { ...s.baslik };
    if (s.oturum) basliklar.authorization = `Bearer ${s.oturum}`;
    if (s.govde !== undefined) basliklar["content-type"] = "application/json";
    const y = await isleyici.fetch(
      new Request(`https://kronikler-online.test${yol}`, { method: yontem, headers: basliklar, body: s.govde === undefined ? null : JSON.stringify(s.govde) }),
      env,
    );
    return { durum: y.status, govde: (await y.json()) as Record<string, any> };
  };
  const oyuncu = async (sub: string, ad: string) => {
    const t = await jwtImzala(anahtar, googleYuku(simdi, { sub, given_name: ad }));
    const g = await cagir("POST", "/v1/giris", { govde: { idToken: t } });
    const oturum = g.govde.oturum as string;
    const p = await cagir("POST", "/v1/profil", { oturum, govde: { ad, cinsiyet: "kadın", yerlesim: "kizilca", istekNo: no() } });
    assert.equal(p.durum, 200, `profil ${ad}`);
    return { oturum, hesap: p.govde.hesapId as string };
  };
  /** Bağlanır; yükseltme başarılıysa sunucu ucunu döndürür. */
  const baglan = async (oturum: string, masaNo: number | string = 1) => {
    const once = araclar.sunucular.length;
    const y = await cagir("GET", `/v1/han/masa/${masaNo}/baglan`, { oturum, baslik: { upgrade: "websocket" } });
    return { y, soket: araclar.sunucular.length > once ? araclar.sunucular.at(-1)! : undefined };
  };
  const masaOrnegi = (ad: string) => {
    const k = masa.ornekler.get(masa.idFromName(ad).toString());
    assert.ok(k, ad);
    return k;
  };
  const yolla = (soket: SahteWebSoket, ileti: unknown) => masaOrnegi("masa:kizilca:menzil:1").ornek.webSocketMessage(soket, JSON.stringify(ileti));
  const tumDepolar = () =>
    [hesap, masa, yonetim, dunya, yerlesim].flatMap((ns) => [...ns.ornekler.values()].map((o) => JSON.stringify([...o.depolama.veri.entries()])));
  return { env, cagir, oyuncu, baglan, yolla, masaOrnegi, tumDepolar };
}

test("han listesi, yükseltme, otur, sohbet (saklanmaz), eylem (katılım, tekrar güvenli), ikram kapalı", async () => {
  const { env, cagir, oyuncu, baglan, yolla, masaOrnegi, tumDepolar } = await kur();
  const ayse = await oyuncu("110000000000000000101", "Ayşe");
  const bora = await oyuncu("110000000000000000102", "Bora");

  const liste = await cagir("GET", "/v1/han?dil=en", { oturum: ayse.oturum });
  assert.equal(liste.durum, 200);
  assert.equal(liste.govde.han.tur, "menzil");
  assert.equal(liste.govde.han.ad, "Way Station");
  assert.equal(liste.govde.masalar.length, 2);
  assert.equal(liste.govde.masalar[0].oturan, 0);
  assert.equal((await cagir("GET", "/v1/han")).durum, 401);

  assert.equal((await cagir("GET", "/v1/han/masa/1/baglan", { oturum: ayse.oturum })).durum, 426);
  assert.equal((await baglan(ayse.oturum, 3)).y.govde.hata, "masa_gecersiz");
  const a = await baglan(ayse.oturum);
  const b = await baglan(bora.oturum);
  assert.ok(a.soket && b.soket);
  assert.equal(a.soket.son("hosgeldin")?.ben.ad, "Ayşe");
  await yolla(a.soket, { t: "otur" });
  await yolla(b.soket, { t: "otur" });

  const GIZLI = "gizli plan: şafakta kervanı karşılayalım 7731";
  await yolla(a.soket, { t: "yaz", metin: GIZLI });
  assert.equal(b.soket.son("ileti")?.metin, GIZLI);
  for (const d of tumDepolar()) assert.equal(d.includes("7731"), false, "sohbet hiçbir depoya yazılmaz");
  assert.equal(JSON.stringify(b.soket.deserializeAttachment()).includes("7731"), false, "soket ekine de yazılmaz");

  const doluluk = await cagir("GET", "/v1/han", { oturum: bora.oturum });
  assert.equal(doluluk.govde.masalar[0].oturan, 2);

  const istekNo = no();
  const eylem = { masa: 1, tur: "ittifak", hedef: bora.hesap, istekNo };
  const e1 = await cagir("POST", "/v1/han/eylem", { oturum: ayse.oturum, govde: eylem });
  assert.equal(e1.durum, 200, JSON.stringify(e1.govde));
  assert.deepEqual(e1.govde.olay.katilim, [ayse.hesap, bora.hesap]);
  assert.equal(e1.govde.olay.durum, "teklif");
  assert.equal(b.soket.son("olay")?.olay.no, e1.govde.olay.no);
  const e2 = await cagir("POST", "/v1/han/eylem", { oturum: ayse.oturum, govde: eylem });
  assert.deepEqual(e2.govde, e1.govde, "aynı istekNo aynı olay");
  assert.equal(b.soket.giden.filter((g) => g.t === "olay").length, 1, "tekrar yayınlanmaz");
  const kabul = await cagir("POST", "/v1/han/eylem", { oturum: bora.oturum, govde: { masa: 1, tur: "kabul", olay: e1.govde.olay.no, istekNo: no() } });
  assert.equal(kabul.govde.olay.tur, "kabul");

  const ikram = await cagir("POST", "/v1/han/ikram", { oturum: ayse.oturum, govde: { masa: 1, hedef: bora.hesap, ikram: "serbet", istekNo: no() } });
  assert.deepEqual([ikram.durum, ikram.govde.hata], [503, "ikram_kapali"], "ödeme YerlesimDO'ya bağlanana kadar kapalı");
  assert.equal(b.soket.son("anons"), undefined);

  // Masa deposunda yalnız olay, sayaç ve istek kaydı var; sohbet ve para yok.
  const masaAnahtarlari = [...masaOrnegi("masa:kizilca:menzil:1").depolama.veri.keys()].sort();
  assert.ok(masaAnahtarlari.every((k) => /^(olay#|olay:\d{8}|istek:)/.test(k)), masaAnahtarlari.join(","));
  void env;
});

test("Y1 yaptırımları masada: sonradan susturulan yazamaz, uzaklaştırılan kopar ve bağlanamaz; başka masaya geçiş", async () => {
  const { env, oyuncu, baglan, yolla, masaOrnegi } = await kur();
  const ayse = await oyuncu("110000000000000000201", "Ayşe");
  const bora = await oyuncu("110000000000000000202", "Bora");
  const a = (await baglan(ayse.oturum)).soket!;
  const b = (await baglan(bora.oturum)).soket!;
  await yolla(a, { t: "otur" });
  await yolla(b, { t: "otur" });

  await hesapCagir(env, bora.hesap, { islem: "yaptirimYaz", hesapId: bora.hesap, durum: { susturma: { bitis: null } } });
  await yolla(b, { t: "yaz", metin: "duyuyor musun" });
  assert.equal(b.son("hata")?.hata, "susturuldu");
  assert.equal(a.son("ileti"), undefined);

  await hesapCagir(env, ayse.hesap, { islem: "yaptirimYaz", hesapId: ayse.hesap, durum: { uzaklastirma: { bitis: null } } });
  assert.deepEqual(a.kapanis, [KAPANIS.uzaklastirildi, "uzaklastirildi"]);
  assert.equal(b.son("durum")?.masa.koltuklar.filter(Boolean).length, 1);
  const tekrar = await baglan(ayse.oturum);
  assert.deepEqual([tekrar.y.durum, tekrar.y.govde.hata, tekrar.soket], [403, "uzaklastirildi", undefined]);

  // Bora 2. masaya geçerse 1. masadaki bağlantısı kapanır (aynı anda tek masa).
  const b2 = await baglan(bora.oturum, 2);
  assert.ok(b2.soket);
  assert.deepEqual(b.kapanis, [KAPANIS.baskaMasa, "baska_masa"]);
  void masaOrnegi;
});

test("masa başının çıkarması olay olur, Y1 kaydına düşer ve süre dolana dek geri bağlanılamaz", async () => {
  const { env, oyuncu, baglan, yolla } = await kur();
  const ayse = await oyuncu("110000000000000000301", "Ayşe");
  const bora = await oyuncu("110000000000000000302", "Bora");
  const a = (await baglan(ayse.oturum)).soket!;
  await yolla(a, { t: "otur" });
  const b = (await baglan(bora.oturum)).soket!;
  await yolla(b, { t: "otur" });
  await yolla(a, { t: "at", hedef: bora.hesap });
  assert.equal(a.son("olay")?.olay.tur, "atma");
  assert.deepEqual(a.son("olay")?.olay.katilim, [ayse.hesap, bora.hesap]);
  assert.deepEqual(b.kapanis, [KAPANIS.atildi, "atildi"]);
  const yonetim = env.YONETIM as unknown as { ornekler: Map<string, { depolama: { veri: Map<string, unknown> } }> };
  const kayitlar = [...yonetim.ornekler.values()].flatMap((o) => [...o.depolama.veri.entries()].filter(([k]) => k.startsWith(MASA_ATMA)));
  assert.equal(kayitlar.length, 1);
  assert.equal((kayitlar[0]?.[1] as { hedef: string }).hedef, bora.hesap);
  const geri = await baglan(bora.oturum);
  assert.deepEqual([geri.y.durum, geri.y.govde.hata], [403, "atildi"]);
  assert.equal(typeof geri.y.govde.bitis, "number");
});
