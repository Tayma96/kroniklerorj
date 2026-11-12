// Uçtan uca (Faz 7 + P1–P4): /v1/siyaset görünümü, doğrulanmış kimlik, şartlar, istekNo tekrar güvenliği,
// BolgeDO → SultanlikDO ay dönümü (rapor + haraç outbox).
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { BolgeDO, DunyaDO, HesapDO, SultanlikDO, YerlesimDO } from "../src/index.ts";
import { AY_MS, oyunAyi } from "../src/saat.ts";
import { bolgeCagir } from "../src/siyaset/ic.ts";
import { bolgeKur } from "../src/siyaset/bolge.ts";
import type { BolgeDurumu } from "../src/siyaset/tipler.ts";
import type { Env } from "../src/tipler.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

type Nesne = Record<string, any>;

test("siyaset uçları: görünüm, şart, tekrar güvenliği, ay dönümü ve haraç", async () => {
  const anahtar = await rsaAnahtari("kid-1");
  const jwks = sahteJwks([anahtar]);
  const eskiFetch = globalThis.fetch;
  globalThis.fetch = jwks.getir;
  try {
    let saat = Date.now();
    const env = { GOOGLE_CLIENT_ID: ISTEMCI, OTURUM_ANAHTARI: "o".repeat(48) } as Env;
    env.HESAP = sahteAdAlani((ctx) => new HesapDO(ctx, env));
    env.DUNYA = sahteAdAlani((ctx) => new DunyaDO(ctx, env));
    env.YERLESIM = sahteAdAlani((ctx) => new YerlesimDO(ctx, env, () => saat));
    const bolgeler = sahteAdAlani((ctx) => new BolgeDO(ctx, env, () => saat));
    env.BOLGE = bolgeler;
    const sultanlik = sahteAdAlani((ctx) => new SultanlikDO(ctx, env, () => saat));
    env.SULTANLIK = sultanlik;
    const cagir = async (yontem: string, yol: string, secenek: { govde?: unknown; oturum?: string } = {}) => {
      const basliklar: Record<string, string> = {};
      if (secenek.oturum) basliklar.authorization = `Bearer ${secenek.oturum}`;
      const yanit = await isleyici.fetch(
        new Request(`https://kronikler-online.test${yol}`, { method: yontem, headers: basliklar, body: secenek.govde === undefined ? null : JSON.stringify(secenek.govde) }),
        env,
      );
      return { durum: yanit.status, govde: (await yanit.json()) as Nesne };
    };
    const token = await jwtImzala(anahtar, googleYuku(saat));
    const oturum = (await cagir("POST", "/v1/giris", { govde: { idToken: token } })).govde.oturum as string;
    await cagir("POST", "/v1/profil", { oturum, govde: { ad: "Ayşe", cinsiyet: "kadın", yerlesim: "develi", istekNo: "profil-0001" } });

    const g0 = await cagir("GET", "/v1/siyaset", { oturum });
    assert.equal(g0.durum, 200, JSON.stringify(g0.govde));
    assert.equal(g0.govde.bolge.id, "demirhan");
    assert.equal(g0.govde.makamlar.length, 8);
    assert.ok(g0.govde.makamlar.every((m: Nesne) => m.sahip.npc && m.etkin.neden === "sahip"));
    assert.equal(g0.govde.bolge.defter.tutarli, true);
    const kisi = g0.govde.benim.kisi as string;
    assert.match(kisi, /^develi\/o\d+$/);
    assert.equal((await cagir("GET", "/v1/siyaset?bolge=yenisehir", { oturum })).govde.benim, null, "başka bölge salt okunur");
    assert.deepEqual((await cagir("GET", "/v1/siyaset?bolge=yok", { oturum })).govde, { hata: "bolge_gecersiz" });
    assert.equal((await cagir("PUT", "/v1/siyaset", { oturum })).durum, 405);

    // Yeni karakter (12 yaş) şartı karşılamaz: hata önbelleğe girmez.
    assert.deepEqual((await cagir("POST", "/v1/siyaset", { oturum, govde: { islem: "aday", makam: "vali:demirhan" } })).govde, { hata: "istekno_gecersiz" });
    const a1 = await cagir("POST", "/v1/siyaset", { oturum, govde: { islem: "aday", makam: "vali:demirhan", istekNo: "aday-00001" } });
    assert.deepEqual([a1.durum, a1.govde.hata], [403, "yas_kapisi"], "12 yaşında makam adaylığı yok");
    const y0 = await cagir("POST", "/v1/siyaset", { oturum, govde: { islem: "yetki", makam: "kasabaAgasi:develi", yetki: "ortakDert", hedef: "arz", istekNo: "yetki-0001" } });
    assert.deepEqual([y0.durum, y0.govde.hata], [403, "yetki_yok"], "istemcinin makam iddiası kabul edilmez");

    // Oyuncuyu kasaba ağası yap (doğrudan durumda), DO'yu depodan yeniden aç.
    const hesap = env.HESAP.idFromName("google:110000000000000000001").toString();
    const [bk, kayit] = [...bolgeler.ornekler.entries()][0]!;
    const d = kayit.depolama.veri.get("bolge") as BolgeDurumu;
    const ag = d.koltuklar.find((k) => k.id === "kasabaAgasi:develi")!;
    ag.s = { npc: false, kisi, hesap, ad: "Ayşe", kume: [`h:${hesap}`], sg: saat, liyakat: 0 };
    kayit.depolama.veri.set("bolge", d);
    kayit.ornek = new BolgeDO({ id: env.BOLGE.idFromString(bk), storage: kayit.depolama } as unknown as DurableObjectState, env, () => saat);

    const govde = { islem: "yetki", makam: "kasabaAgasi:develi", yetki: "ortakDert", hedef: "arz", istekNo: "yetki-0002" };
    const y1 = await cagir("POST", "/v1/siyaset", { oturum, govde });
    const y2 = await cagir("POST", "/v1/siyaset", { oturum, govde });
    assert.equal(y1.durum, 200, JSON.stringify(y1.govde));
    assert.deepEqual(y2.govde, y1.govde, "aynı istekNo aynı yanıt");
    assert.equal(y1.govde.sonuc.dokum.hedef, "arz");
    assert.equal(y1.govde.gorunum.kayit.filter((s: Nesne) => s.tur === "yetki").length, 1);
    assert.deepEqual(y1.govde.gorunum.benim.makamlar, ["kasabaAgasi:develi"]);
    const yv = await cagir("POST", "/v1/siyaset", { oturum, govde: { islem: "yetki", makam: "kasabaAgasi:develi", yetki: "vergiOrani", deger: 3, istekNo: "yetki-0003" } });
    assert.deepEqual([yv.durum, yv.govde.hata], [403, "yetki_yok"], "yetki listesi kapalı");

    // İki ay dönümü: vergi → kasa → haraç Sultanlığa; görünüm Sultanlık özetini taşır, defter tutarlı.
    saat += 2 * AY_MS + 31 * 60 * 1000;
    const g1 = await cagir("GET", "/v1/siyaset?kayit=0", { oturum });
    assert.equal(g1.durum, 200);
    assert.equal(g1.govde.bolge.defter.tutarli, true);
    assert.ok(g1.govde.bolge.defter.gonderilen > 0, "haraç Sultanlığa ulaştı");
    assert.equal(g1.govde.sultanlik.sultan.npc, true);
    assert.equal(g1.govde.sultanlik.mogol.tutum, "memnun");
    assert.ok(g1.govde.kayitSayfasi.satirlar.length > 0);
    assert.equal(sultanlik.ornekler.size, 1, "tek Sultanlık örneği");
  } finally {
    globalThis.fetch = eskiFetch;
  }
});



test("P6 tanınma isteği ve kararı iki BolgeDO arasında outbox ile teslim edilir", async () => {
  let saat = Date.now();
  const env = {} as Env;
  const bolgeler = sahteAdAlani((ctx) => new BolgeDO(ctx, env, () => saat));
  env.BOLGE = bolgeler;
  const ay = oyunAyi(saat);
  const kaynakKimlik = {
    kisi: "develi/o1", hesap: "hesap-kaynak", ad: "Kaynak Bey", yerlesim: "develi",
    bolge: "demirhan", yas: 30, e: 0, olu: false, nam: 50, teveccuh: 3, haklar: ["bolgeMakami"],
  };
  const hedefKimlik = {
    kisi: "aksehir/o2", hesap: "hesap-hedef", ad: "Akşehir Beyi", yerlesim: "aksehir",
    bolge: "aksehir", yas: 30, e: 0, olu: false, nam: 50, teveccuh: 3, haklar: ["bolgeMakami"],
  };
  const devlet = (kimlik: typeof kaynakKimlik | typeof hedefKimlik, ad: string) => ({
    v: 1 as const, ad, kurulusAy: ay, beyKisi: kimlik.kisi, beyHesap: kimlik.hesap, beyAd: kimlik.ad,
    vergiOrani: 0, divan: [] as { kisi: string; hesap: string; ad: string; rol: "divan" }[],
    mogol: "diren" as const, sultan: "bagimsiz" as const, taninma: "taninmadi" as const, yeminler: {},
  });
  const ilkKaynak = await bolgeCagir(env, { islem: "gorunum", bolge: "demirhan", hesapId: kaynakKimlik.hesap });
  const ilkHedef = await bolgeCagir(env, { islem: "gorunum", bolge: "aksehir", hesapId: hedefKimlik.hesap });
  assert.equal(ilkKaynak.ok, true);
  assert.equal(ilkHedef.ok, true);
  const kaynakId = env.BOLGE.idFromName("bolge:demirhan").toString();
  const hedefId = env.BOLGE.idFromName("bolge:aksehir").toString();
  const kaynakKaydi = bolgeler.ornekler.get(kaynakId);
  const hedefKaydi = bolgeler.ornekler.get(hedefId);
  assert.ok(kaynakKaydi && hedefKaydi);
  const kaynakDurum = bolgeKur("demirhan", ay);
  kaynakDurum.devlet = devlet(kaynakKimlik, "Demirhan Beyliği");
  const hedefDurum = bolgeKur("aksehir", ay);
  hedefDurum.devlet = devlet(hedefKimlik, "Akşehir Beyliği");
  kaynakKaydi.depolama.veri.set("bolge", kaynakDurum);
  hedefKaydi.depolama.veri.set("bolge", hedefDurum);
  kaynakKaydi.ornek = new BolgeDO({ id: env.BOLGE.idFromString(kaynakId), storage: kaynakKaydi.depolama } as unknown as DurableObjectState, env, () => saat);
  hedefKaydi.ornek = new BolgeDO({ id: env.BOLGE.idFromString(hedefId), storage: hedefKaydi.depolama } as unknown as DurableObjectState, env, () => saat);

  const talep = await bolgeCagir(env, {
    islem: "yaz", bolge: "demirhan", hesapId: kaynakKimlik.hesap, kimlik: kaynakKimlik,
    govde: { islem: "devletYonet", tur: "taninma", hedefBolge: "aksehir", istekNo: "taninma-kaynak-01" },
  });
  assert.equal(talep.ok, true, JSON.stringify(talep));
  const kaynakSon = kaynakKaydi.depolama.veri.get("bolge") as BolgeDurumu;
  const hedefSon = hedefKaydi.depolama.veri.get("bolge") as BolgeDurumu;
  assert.equal(kaynakSon.devlet?.taninma, "talepEdildi");
  assert.equal(kaynakSon.diplomasiGiden?.length ?? 0, 0, "alıcı teyit edince kaynak outbox boşalır");
  const gelen = hedefSon.devlet?.taninmaGelen?.demirhan;
  assert.ok(gelen);
  assert.equal(gelen.yanitlandi, false);

  const karar = await bolgeCagir(env, {
    islem: "yaz", bolge: "aksehir", hesapId: hedefKimlik.hesap, kimlik: hedefKimlik,
    govde: { islem: "devletYonet", tur: "taninmaYanit", kaynakBolge: "demirhan", istekId: gelen.istekId, karar: "kabul", istekNo: "taninma-hedef-01" },
  });
  assert.equal(karar.ok, true, JSON.stringify(karar));
  const kaynakGuncel = kaynakKaydi.depolama.veri.get("bolge") as BolgeDurumu;
  const hedefGuncel = hedefKaydi.depolama.veri.get("bolge") as BolgeDurumu;
  assert.equal(kaynakGuncel.devlet?.taninma, "tanindi");
  assert.equal(kaynakGuncel.devlet?.taninmaCevap?.kaynak, "aksehir");
  assert.equal(hedefGuncel.diplomasiGiden?.length ?? 0, 0, "kaynak teyit edince yanıt outbox boşalır");
  assert.equal(hedefGuncel.devlet?.taninmaGelen?.demirhan?.yanitlandi, true);
});


test("oyuncu işletmesi vergisi bölge kasasına aynı anahtarla yalnız bir kez yazılır", async () => {
  const saat = Date.now();
  const env = {} as Env;
  const bolgeler = sahteAdAlani((ctx) => new BolgeDO(ctx, env, () => saat));
  env.BOLGE = bolgeler;
  const gorunum = await bolgeCagir(env, { islem: "gorunum", bolge: "demirhan", hesapId: "vergi-test" });
  assert.equal(gorunum.ok, true, JSON.stringify(gorunum));
  if (!gorunum.ok) return;
  const baslangicKasa = (gorunum.deger as { bolge: { kasa: number } }).bolge.kasa;
  const ileti = { islem: "vergiYatir" as const, bolge: "demirhan", anahtar: "develi:vergi:tek-0001", tutar: 7, yerlesim: "develi" };
  const ilk = await bolgeCagir(env, ileti);
  assert.equal(ilk.ok, true, JSON.stringify(ilk));
  if (!ilk.ok) return;
  const ilkDeger = ilk.deger as { tekrar: boolean; kasa: number };
  assert.equal(ilkDeger.tekrar, false);
  assert.equal(ilkDeger.kasa, baslangicKasa + 7);
  const ikinci = await bolgeCagir(env, ileti);
  assert.equal(ikinci.ok, true, JSON.stringify(ikinci));
  if (!ikinci.ok) return;
  const ikinciDeger = ikinci.deger as { tekrar: boolean; kasa: number };
  assert.equal(ikinciDeger.tekrar, true);
  assert.equal(ikinciDeger.kasa, ilkDeger.kasa, "aynı anahtar ikinci kez vergi eklemez");
  assert.equal(ikinciDeger.kasa, baslangicKasa + 7);
});


test("P6 ittifak iki bölge arasında üç aşamalı, tekrar güvenli outbox ile etkinleşir", async () => {
  let saat = Date.now();
  const env = {} as Env;
  const bolgeler = sahteAdAlani((ctx) => new BolgeDO(ctx, env, () => saat));
  env.BOLGE = bolgeler;
  const ay = oyunAyi(saat);
  const kaynakKimlik = {
    kisi: "develi/o11", hesap: "hesap-ittifak-kaynak", ad: "Demirhan Beyi", yerlesim: "develi",
    bolge: "demirhan", yas: 30, e: 0, olu: false, nam: 50, teveccuh: 3, haklar: ["bolgeMakami"],
  };
  const hedefKimlik = {
    kisi: "aksehir/o12", hesap: "hesap-ittifak-hedef", ad: "Akşehir Beyi", yerlesim: "aksehir",
    bolge: "aksehir", yas: 30, e: 0, olu: false, nam: 50, teveccuh: 3, haklar: ["bolgeMakami"],
  };
  const devlet = (kimlik: typeof kaynakKimlik | typeof hedefKimlik, ad: string) => ({
    v: 1 as const, ad, kurulusAy: ay, beyKisi: kimlik.kisi, beyHesap: kimlik.hesap, beyAd: kimlik.ad,
    vergiOrani: 0, divan: [] as { kisi: string; hesap: string; ad: string; rol: "divan" }[],
    mogol: "diren" as const, sultan: "bagimsiz" as const, taninma: "taninmadi" as const, yeminler: {},
  });
  const [kaynakIlk, hedefIlk] = await Promise.all([
    bolgeCagir(env, { islem: "gorunum", bolge: "demirhan", hesapId: kaynakKimlik.hesap }),
    bolgeCagir(env, { islem: "gorunum", bolge: "aksehir", hesapId: hedefKimlik.hesap }),
  ]);
  assert.equal(kaynakIlk.ok, true);
  assert.equal(hedefIlk.ok, true);
  const kaynakId = env.BOLGE.idFromName("bolge:demirhan").toString();
  const hedefId = env.BOLGE.idFromName("bolge:aksehir").toString();
  const kaynakKaydi = bolgeler.ornekler.get(kaynakId)!;
  const hedefKaydi = bolgeler.ornekler.get(hedefId)!;
  const kaynakDurum = bolgeKur("demirhan", ay);
  kaynakDurum.devlet = devlet(kaynakKimlik, "Demirhan Beyliği");
  const hedefDurum = bolgeKur("aksehir", ay);
  hedefDurum.devlet = devlet(hedefKimlik, "Akşehir Beyliği");
  kaynakKaydi.depolama.veri.set("bolge", kaynakDurum);
  hedefKaydi.depolama.veri.set("bolge", hedefDurum);
  kaynakKaydi.ornek = new BolgeDO({ id: env.BOLGE.idFromString(kaynakId), storage: kaynakKaydi.depolama } as unknown as DurableObjectState, env, () => saat);
  hedefKaydi.ornek = new BolgeDO({ id: env.BOLGE.idFromString(hedefId), storage: hedefKaydi.depolama } as unknown as DurableObjectState, env, () => saat);

  const istek = await bolgeCagir(env, {
    islem: "yaz", bolge: "demirhan", hesapId: kaynakKimlik.hesap, kimlik: kaynakKimlik,
    govde: { islem: "devletYonet", tur: "ittifak", hedefBolge: "aksehir", istekNo: "ittifak-kaynak-001" },
  });
  assert.equal(istek.ok, true, JSON.stringify(istek));
  const kaynakBekleyen = kaynakKaydi.depolama.veri.get("bolge") as BolgeDurumu;
  assert.equal(kaynakBekleyen.devlet?.ittifakTalep?.hedef, "aksehir");
  assert.equal(kaynakBekleyen.diplomasiGiden?.length ?? 0, 0, "yazı sonrası outbox aynı çağrıda hedefe teslim edilir");

  const hedefGelen = hedefKaydi.depolama.veri.get("bolge") as BolgeDurumu;
  const gelen = hedefGelen.devlet?.ittifakGelen?.demirhan;
  assert.ok(gelen);
  assert.equal(gelen.yanitlandi, false);
  assert.equal((kaynakKaydi.depolama.veri.get("bolge") as BolgeDurumu).diplomasiGiden?.length ?? 0, 0);

  const kabul = await bolgeCagir(env, {
    islem: "yaz", bolge: "aksehir", hesapId: hedefKimlik.hesap, kimlik: hedefKimlik,
    govde: { islem: "devletYonet", tur: "ittifakYanit", kaynakBolge: "demirhan", istekId: gelen.istekId, karar: "kabul", istekNo: "ittifak-hedef-001" },
  });
  assert.equal(kabul.ok, true, JSON.stringify(kabul));
  const hedefBekleyen = hedefKaydi.depolama.veri.get("bolge") as BolgeDurumu;
  assert.equal(hedefBekleyen.diplomasiGiden?.length ?? 0, 0, "yanıt aynı çağrıda kaynağa teslim edilir");

  // Kaynak kabulü aldı; son teyit hedefe kalıcı ulaşana kadar kaynakta da beklemede kalır.
  const kaynakAktif = kaynakKaydi.depolama.veri.get("bolge") as BolgeDurumu;
  assert.equal(kaynakAktif.devlet?.ittifaklar?.aksehir?.durum, "kabulBekliyor");
  assert.equal(kaynakAktif.diplomasiGiden?.[0]?.tur, "ittifakOnay");

  // Kaynak onayı tekrar hedefe gider; iki taraf da ancak son teyitle aktif görünür.
  await bolgeCagir(env, { islem: "gorunum", bolge: "demirhan", hesapId: kaynakKimlik.hesap });
  const kaynakSon = kaynakKaydi.depolama.veri.get("bolge") as BolgeDurumu;
  const hedefSon = hedefKaydi.depolama.veri.get("bolge") as BolgeDurumu;
  assert.equal(kaynakSon.devlet?.ittifaklar?.aksehir?.durum, "aktif");
  assert.equal(hedefSon.devlet?.ittifaklar?.demirhan?.durum, "aktif");
  assert.equal(kaynakSon.diplomasiGiden?.length ?? 0, 0);
  assert.equal(hedefSon.diplomasiGiden?.length ?? 0, 0);

  // Aynı onay iletisi tekrar gelse de etkin ittifakın kaydı değişmez.
  const tekrar = await bolgeCagir(env, {
    islem: "ittifakOnayAl", bolge: "aksehir", kaynak: "demirhan",
    istekId: gelen.istekId, ay, ad: "Demirhan Beyliği",
  });
  assert.equal(tekrar.ok, true);

  // Hedef ittifak süresi dolduktan sonra eski teyit mesajı onu yeniden açamaz.
  hedefSon.devlet!.ittifaklar!.demirhan!.durum = "suresiDoldu";
  const { ittifakOnayAl } = await import("../src/siyaset/devlet.ts");
  assert.equal(ittifakOnayAl(hedefSon, "demirhan", gelen.istekId, ay, "Demirhan Beyliği"), "hedef_uygun_degil");
});
