// Siyaset saf kuralları (Faz 7 + Ek B P1–P4): karma atama, hesap kümesi, yeter sayı, yokluk/vekil/devir, azil-itiraz,
// haraç akışı ve toplam akçe değişmezi, Moğol tutumu, meşruiyet, müzakereli özerklik.
import test from "node:test";
import assert from "node:assert/strict";
import { BEYLIKLER } from "../src/dunya-veri.ts";
import { akceGir, bolgeAyi, bolgeEylem, bolgeGorunumu, bolgeKur, defterTutarli, haracOnayla } from "../src/siyaset/bolge.ts";
import { darbeBarisTeklifEt, darbeBarisYanit, darbeGorunumu } from "../src/siyaset/darbe.ts";
import { etkinKisi, koltukBul, kumeCakisir, kumeAnahtarlari, oyuncuTutucu, yetkiAcik, yeterOran } from "../src/siyaset/makam.ts";
import { hedefTutum, mogolAyi, mogolBaslangic, mogolEtkisi } from "../src/siyaset/mogol.ts";
import { ozerklikAyi } from "../src/siyaset/ozerklik.ts";
import { BASLANGIC, GUN_MS, MOGOL } from "../src/siyaset/sabitler.ts";
import { raporAl, sultanlikAyi, sultanlikKur, sultanlikOzeti, sultanlikTutarli } from "../src/siyaset/sultanlik.ts";
import type { BolgeDurumu, SiyasiKimlik } from "../src/siyaset/tipler.ts";

const SIMDI = 1_800_000_000_000;

function kimlik(o: string, ek: Partial<SiyasiKimlik> = {}): SiyasiKimlik {
  const yerlesim = ek.yerlesim ?? "develi";
  return { kisi: `${yerlesim}/${o}`, hesap: `hesap-${o}`, ad: o.toUpperCase(), yerlesim, bolge: "demirhan", yas: 30, e: 0, olu: false, nam: 40, teveccuh: 0, haklar: ["bolgeMakami"], ...ek };
}

function eylem(d: BolgeDurumu, k: SiyasiKimlik, g: Record<string, unknown>) {
  return bolgeEylem(d, k, g, SIMDI);
}

/** Valiyi karma yolla (Sultan gösterir, NPC ileri gelenler onaylar) oyuncuya atar. */
function valiYap(d: BolgeDurumu, k: SiyasiKimlik): void {
  assert.equal(eylem(d, k, { islem: "aday", makam: "vali:demirhan" }).ok, true);
  bolgeAyi(d, d.ay + 1, SIMDI);
  assert.equal(koltukBul(d, "vali:demirhan")!.secim?.asama, "onay");
  bolgeAyi(d, d.ay + 1, SIMDI);
}

test("karma atama: Sultan (NPC) gösterir, ileri gelenler onaylar; düşük liyakat reddedilir, makam askıda kalmaz", () => {
  const d = bolgeKur("demirhan", 0);
  assert.equal(d.koltuklar.length, 8);
  assert.ok(d.koltuklar.every((k) => k.s.npc), "başta hepsi NPC tutucuda");
  const a = kimlik("o1");
  valiYap(d, a);
  const vali = koltukBul(d, "vali:demirhan")!;
  assert.equal(vali.s.hesap, a.hesap);
  assert.equal(vali.gecici, undefined);
  assert.deepEqual(d.gecmis[a.hesap], ["vali"]);

  // Liyakati eşiğin altındaki aday: NPC ileri gelenler hayır der; aday kalmayınca kurum tutucusu sürer.
  const z = bolgeKur("demirhan", 0);
  assert.equal(eylem(z, kimlik("o2", { nam: 0, haklar: [] }), { islem: "aday", makam: "vali:demirhan" }).ok, false, "şart: hak ya da geçmiş makam");
  const zayif = kimlik("o3", { nam: 0, haklar: ["kasabaMakami"], teveccuh: 0 });
  assert.equal(eylem(z, zayif, { islem: "aday", makam: "kasabaAgasi:develi" }).ok, true);
  const vz = kimlik("o4", { nam: 0, haklar: ["bolgeMakami"] });
  assert.equal(eylem(z, vz, { islem: "aday", makam: "vali:demirhan" }).ok, true);
  bolgeAyi(z, 1, SIMDI);
  bolgeAyi(z, 2, SIMDI);
  const v2 = koltukBul(z, "vali:demirhan")!;
  assert.ok(v2.s.npc, "liyakat 10 < eşik 12: ret");
  assert.equal(v2.secim, undefined);
  assert.ok(z.kayit.some((s) => s.tur === "onaySayim"));
});

test("hesap kümesi: vali, şehir beyi, ahi başı, Divan temsilcisi aynı kümeden olamaz", () => {
  const d = bolgeKur("demirhan", 0);
  const a = kimlik("o1", { e: 7 });
  valiYap(d, a);
  const ayniHane = kimlik("o2", { e: 7, teveccuh: 5 });
  assert.deepEqual(eylem(d, ayniHane, { islem: "aday", makam: "sehirBeyi:demirhan" }), { ok: false, hata: "kume_cakisma" });
  assert.deepEqual(eylem(d, ayniHane, { islem: "aday", makam: "ahiBasi:develi" }), { ok: false, hata: "kume_cakisma" });
  // Kasaba ağası küme kuralına tabi değil; başka hane serbest.
  assert.equal(eylem(d, ayniHane, { islem: "aday", makam: "kasabaAgasi:develi" }).ok, true);
  assert.equal(eylem(d, kimlik("o3", { e: 8 }), { islem: "aday", makam: "sehirBeyi:demirhan" }).ok, true);
  assert.equal(kumeCakisir(d, "divanTemsilcisi:demirhan", kumeAnahtarlari(a)), true);
  assert.equal(kumeCakisir(d, "kasabaAgasi:develi", kumeAnahtarlari(a)), false);
});

test("yeter sayı: oyuncu ileri gelenler çekimser kalırsa oran kademeli düşer, sonunda geçici atama", () => {
  const d = bolgeKur("demirhan", 0);
  let i = 10;
  for (const k of d.koltuklar) {
    if (["sehirBeyi", "ahiBasi", "kasabaAgasi"].includes(k.tur)) k.s = oyuncuTutucu(kimlik(`o${i++}`, { e: i }), 0, SIMDI);
  }
  const a = kimlik("o1");
  eylem(d, a, { islem: "aday", makam: "vali:demirhan" });
  bolgeAyi(d, 1, SIMDI);
  for (let ay = 2; ay <= 4; ay++) bolgeAyi(d, ay, SIMDI);
  const vali = koltukBul(d, "vali:demirhan")!;
  assert.equal(vali.s.hesap, a.hesap);
  assert.equal(vali.gecici, true, "yetersiz katılımla geçici (yarım dönem)");
  assert.ok(yeterOran(2) < yeterOran(0));
  assert.ok(yeterOran(99) > 0);
});

test("yokluk: 7 gün → vekil (daraltılmış yetki), vekil yoksa NPC naib; 90 gün → makam boşalır, seçim açılır", () => {
  const d = bolgeKur("demirhan", 0);
  const a = kimlik("o1");
  valiYap(d, a);
  const vali = koltukBul(d, "vali:demirhan")!;
  const simdi = SIMDI + 10 * GUN_MS;
  assert.equal(etkinKisi(d, vali, simdi).neden, "naib");
  vali.v = oyuncuTutucu(kimlik("o9", { e: 3 }), 0, simdi);
  const e = etkinKisi(d, vali, simdi);
  assert.equal(e.neden, "vekil");
  assert.equal(yetkiAcik(vali, "vergiOrani", "vekil"), false, "vekil büyük karar alamaz");
  assert.equal(yetkiAcik(vali, "bayindirlik", "vekil"), true);
  assert.equal(eylem(d, a, { islem: "yetki", makam: vali.id, yetki: "vergiOrani", deger: 3 }).ok, true, "sahip etkin");
  bolgeAyi(d, d.ay + 1, SIMDI + 100 * GUN_MS);
  assert.equal(vali.s.npc, true);
  assert.equal(vali.secim?.asama, "adaylik");
  assert.ok(d.kayit.some((s) => s.tur === "bosalma"));
});

test("azil ve itiraz: doğrulanamayan gerekçe Divan'da geri alınır, bölge meşruiyeti nedeniyle düşer", () => {
  const d = bolgeKur("demirhan", 0);
  const a = kimlik("o1", { e: 1 });
  valiYap(d, a);
  const sb = koltukBul(d, "sehirBeyi:demirhan")!;
  const c = kimlik("o5", { e: 2 });
  sb.s = oyuncuTutucu(c, 10, SIMDI);
  sb.dn = d.ay + 12;
  const r = eylem(d, a, { islem: "yetki", makam: "vali:demirhan", yetki: "azil", hedef: sb.id, gerekce: "yolsuzluk" });
  assert.equal(r.ok, true);
  assert.equal(sb.s.npc, true);
  assert.deepEqual(eylem(d, a, { islem: "yetki", makam: "vali:demirhan", yetki: "azil", hedef: sb.id, gerekce: "keyfi" }), { ok: false, hata: "hedef_uygun_degil" });
  const n = d.aziller[0]!.n;
  assert.deepEqual(eylem(d, a, { islem: "itiraz", azil: n }), { ok: false, hata: "taraf_degil" });
  assert.equal(eylem(d, c, { islem: "itiraz", azil: n }).ok, true);
  assert.deepEqual(eylem(d, c, { islem: "itiraz", azil: n }), { ok: false, hata: "itiraz_kapali" });
  bolgeAyi(d, d.ay + 1, SIMDI);
  assert.equal(sb.s.hesap, c.hesap, "eski tutucu döndü");
  assert.equal(d.aziller[0]!.itiraz, "kabul");
  assert.ok(d.mesruiyet.nedenler.some((x) => x.k === "mesruiyet.haksizAzil" && x.d < 0));
});

test("haraç akışı: vergi → vali kasası → Sultan hazinesi → Moğol (sink); toplam akçe değişmezi 36 ay", () => {
  const s = sultanlikKur(0);
  const bolgeler = BEYLIKLER.map((b) => bolgeKur(b.id, 0));
  for (let ay = 1; ay <= 36; ay++) {
    for (const d of bolgeler) {
      const c = bolgeAyi(d, ay, SIMDI, sultanlikOzeti(s));
      // Her 5. ay çağrı "kopar": haraç yolda kalır (outbox), Sultanlık saymaz.
      const ulasti = ay % 5 !== 0;
      raporAl(s, d.id, c.rapor, ulasti ? c.harac : null);
      if (c.harac && ulasti) {
        assert.equal(raporAl(s, d.id, c.rapor, c.harac), false, "aynı haraç ikinci kez sayılmaz");
        haracOnayla(d, c.harac.anahtar);
      }
      assert.ok(defterTutarli(d), `bölge defteri ${d.id} ay ${ay}`);
    }
    sultanlikAyi(s, ay);
    assert.ok(sultanlikTutarli(s));
  }
  const giren = bolgeler.reduce((t, d) => t + d.giren, 0) + BASLANGIC.hazine;
  const yolda = bolgeler.reduce((t, d) => t + Object.values(d.yolda).reduce((a, b) => a + b, 0), 0);
  const kalan = bolgeler.reduce((t, d) => t + d.kasa + d.cikan, 0) + yolda + s.hazine + s.cikan;
  assert.equal(giren, kalan, "akçe yaratılmaz, kaybolmaz; Moğol haracı kayıtlı çıkış");
  assert.ok(s.cikan >= MOGOL.talep * 36, "Moğol talebi her ay ödendi");
  assert.equal(s.mogol.tutum, 0, "düzenli haraçta Moğol memnun");
  assert.ok(s.kayit.some((x) => x.tur === "mogolHaraci" && x.akce! < 0));
  assert.equal(s.mesruiyet.kademe === "zayif", false);
});

test("Moğol tutumu kademeli ve görünür; seferde yalnız ağır ihlalde; etki yalnız bölge göstergelerine", () => {
  const m = mogolBaslangic();
  const izler: number[] = [];
  for (let i = 0; i < 8; i++) {
    const onceki = m.tutum;
    mogolAyi(m, { odemeOrani: i < 1 ? 1 : 0, eksikBolge: 7, zayifBolge: 0, yeniOzerklik: 0 });
    assert.ok(Math.abs(m.tutum - onceki) <= 1, "ayda en çok bir kademe");
    assert.ok(m.nedenler.length > 0, "nedenler görünür");
    izler.push(m.tutum);
  }
  assert.ok(izler.includes(1) && izler.includes(2) && izler.at(-1) === 3, izler.join(","));
  assert.equal(hedefTutum(100, false), 2, "ağır ihlal yoksa sinirli tavan");
  assert.deepEqual(Object.keys(mogolEtkisi(3)).sort(), ["arz", "guvenlik", "moral"]);
  const d = bolgeKur("demirhan", 0);
  const ozet = sultanlikOzeti(sultanlikKur(0));
  ozet.mogol.kademe = 3;
  const once = d.g.guvenlik;
  bolgeAyi(d, 1, SIMDI, ozet);
  assert.ok(d.g.guvenlik < once);
  assert.ok(d.mesruiyet.nedenler.some((x) => x.k === "mesruiyet.mogol"));
});

test("meşruiyet 3 kademe, nedenleriyle; vergi yükü ve göstergeler görünür kalem", () => {
  const d = bolgeKur("demirhan", 0);
  akceGir(d, 0, "x", 0, "x");
  const a = kimlik("o1");
  valiYap(d, a);
  assert.ok(["zayif", "dengeli", "guclu"].includes(d.mesruiyet.kademe));
  assert.ok(d.mesruiyet.nedenler.some((x) => x.k === "mesruiyet.onayliVali"));
  for (let i = 0; i < 2; i++) {
    const r = eylem(d, a, { islem: "yetki", makam: "vali:demirhan", yetki: "vergiOrani", deger: 3 + i });
    assert.equal(r.ok, true);
    assert.deepEqual(eylem(d, a, { islem: "yetki", makam: "vali:demirhan", yetki: "vergiOrani", deger: 2 }), { ok: false, hata: "sinir_asildi" });
    bolgeAyi(d, d.ay + 1, SIMDI);
  }
  assert.ok(d.mesruiyet.nedenler.some((x) => x.k === "mesruiyet.vergiYuku" && x.d < 0));
});

test("müzakereli özerklik: şartlı → kabul → şart ihlalinde geri alınır; aşırı talep ret + soğuma", () => {
  const d = bolgeKur("demirhan", 0);
  const a = kimlik("o1");
  valiYap(d, a);
  const r = eylem(d, a, { islem: "yetki", makam: "vali:demirhan", yetki: "ozerklik", indirim: 0.2, sure: 12, asker: 1 });
  assert.equal(r.ok, true);
  assert.deepEqual(eylem(d, a, { islem: "yetki", makam: "vali:demirhan", yetki: "ozerklik", indirim: 0.2, sure: 12 }), { ok: false, hata: "ozerklik_var" });
  bolgeAyi(d, d.ay + 1, SIMDI);
  const o = d.ozerklik!;
  assert.ok(o.karar && o.karar.dokum.length > 0, "Divan kararı dökümlü");
  if (o.durum === "sartli") assert.equal(eylem(d, a, { islem: "ozerklikCevap", kabul: true }).ok, true);
  assert.equal(d.ozerklik!.durum, "etkin");
  d.gecikme = 1;
  assert.equal(ozerklikAyi(d, d.ay + 1, 0), "sartIhlali");
  assert.equal(d.ozerklik!.durum, "geriAlindi");
  assert.deepEqual(eylem(d, a, { islem: "yetki", makam: "vali:demirhan", yetki: "ozerklik", indirim: 0.5, sure: 24 }), { ok: false, hata: "soguma" });
  // Aşırı talep: ret.
  const z = bolgeKur("yenisehir", 0);
  const b = kimlik("o2", { yerlesim: "konuralp", bolge: "yenisehir" });
  assert.equal(bolgeEylem(z, b, { islem: "aday", makam: "vali:yenisehir" }, SIMDI).ok, true);
  bolgeAyi(z, 1, SIMDI);
  bolgeAyi(z, 2, SIMDI);
  assert.equal(bolgeEylem(z, b, { islem: "yetki", makam: "vali:yenisehir", yetki: "ozerklik", indirim: 0.5, sure: 24 }, SIMDI).ok, true);
  z.mesruiyet.puan = 30;
  bolgeAyi(z, 3, SIMDI);
  assert.equal(z.ozerklik!.durum, "ret");
});


test("P5 darbe hazırlığı: şehir/ahi desteği ve garnizon eşiği olmadan ilan edilemez", async () => {
  const { darbeHazirla, darbeDestekle, darbeSadakatYatir, darbeEsigi, darbeIlanEt, darbeAyi } = await import("../src/siyaset/darbe.ts");
  const d = bolgeKur("demirhan", 0);
  const a = kimlik("vali");
  valiYap(d, a);
  d.kasa = 100;
  assert.equal(darbeHazirla(d, a, d.ay), null);
  assert.equal(darbeIlanEt(d, "acik", d.ay), "darbe_esik_eksik");
  const sehir = koltukBul(d, "sehirBeyi:demirhan")!;
  const ahi1 = koltukBul(d, "ahiBasi:demirhan")!;
  const ahi2 = koltukBul(d, "ahiBasi:develi")!;
  const s1 = kimlik("sehir", { yerlesim: "demirhan" });
  const s2 = kimlik("ahi1", { yerlesim: "demirhan", e: 7 });
  const s3 = kimlik("ahi2", { yerlesim: "develi" });
  sehir.s = oyuncuTutucu(s1, 20, SIMDI);
  ahi1.s = oyuncuTutucu(s2, 20, SIMDI);
  ahi2.s = oyuncuTutucu(s3, 20, SIMDI);
  assert.equal(darbeDestekle(d, s1, sehir.id, "sehirBeyi", d.ay), null);
  assert.equal(darbeDestekle(d, s2, ahi1.id, "ahiBasi", d.ay), null);
  assert.equal(darbeDestekle(d, s3, ahi2.id, "ahiBasi", d.ay), null);
  assert.equal(darbeDestekle(d, kimlik("alt", { e: s2.e, yerlesim: "demirhan" }), "ahiBasi:demirhan", "ahiBasi", d.ay), "kume_cakisma");
  assert.equal(darbeSadakatYatir(d, 80, d.ay), "kasa_yetersiz");
  d.kasa = 120;
  assert.equal(darbeSadakatYatir(d, 80, d.ay), 80);
  d.kasa -= 80;
  assert.equal(darbeEsigi(d).uygun, true);
  assert.equal(darbeIlanEt(d, "acik", d.ay), null);
  assert.equal(d.darbe?.durum, "ilan");
  darbeAyi(d, d.ay + 1);
  assert.equal(d.darbe?.durum, "catışma");
});


test("P5 hazırlık izi gizlidir; ilanla birlikte yalnız durum bölgeye açılır", async () => {
  const { darbeHazirla, darbeIlanEt } = await import("../src/siyaset/darbe.ts");
  const d = bolgeKur("demirhan", 0);
  const vali = kimlik("vali-gizlilik");
  const yabanci = kimlik("yabanci-gizlilik");
  valiYap(d, vali);

  const yabanciSonuc = eylem(d, yabanci, { islem: "darbeHazirla" });
  assert.equal(yabanciSonuc.ok, false);
  if (!yabanciSonuc.ok) assert.equal(yabanciSonuc.hata, "yetki_yok");
  assert.equal(eylem(d, vali, { islem: "darbeHazirla" }).ok, true);
  const tekrarSonuc = eylem(d, vali, { islem: "darbeHazirla" });
  assert.equal(tekrarSonuc.ok, false);
  if (!tekrarSonuc.ok) assert.equal(tekrarSonuc.hata, "darbe_var");

  const gizli = bolgeGorunumu(d, SIMDI, yabanci).bolge.darbe;
  const katilimci = bolgeGorunumu(d, SIMDI, vali).bolge.darbe;
  assert.equal(gizli, null);
  assert.ok(katilimci && "izler" in katilimci);
  assert.equal(darbeHazirla(d, vali, d.ay), "darbe_var");

  // İlan sonrası dışarıdan yalnız kamusal durum görünür; hazırlık izleri ve taahhüt dökümü sızmaz.
  d.darbe!.durum = "ilan";
  d.darbe!.mod = "acik";
  d.darbe!.ilanAy = d.ay;
  d.darbe!.cozumAy = d.ay + 1;
  assert.equal(darbeIlanEt(d, "acik", d.ay), "darbe_yok");
  const acik = bolgeGorunumu(d, SIMDI, yabanci).bolge.darbe;
  assert.ok(acik && !("izler" in acik) && !("destekler" in acik));
});


test("P5 hazırlık iptali altı aylık soğuma uygular", async () => {
  const { darbeHazirla, darbeVazgec } = await import("../src/siyaset/darbe.ts");
  const d = bolgeKur("demirhan", 0);
  const vali = kimlik("vali-soguma");
  valiYap(d, vali);
  assert.equal(darbeHazirla(d, vali, d.ay), null);
  assert.equal(darbeVazgec(d, vali.kisi, d.ay), null);
  assert.equal(d.darbe?.durum, "iptal");
  assert.equal(darbeHazirla(d, vali, d.ay + 5), "darbe_soguma");
  assert.equal(darbeHazirla(d, vali, d.ay + 6), null);
});


test("P5 çatışma sonucu bağımsız devlet kurar; P6 yönetim kararları ve gönüllü yemin çalışır", async () => {
  const { darbeAyi } = await import("../src/siyaset/darbe.ts");
  const d = bolgeKur("demirhan", 0);
  const bey = kimlik("kurucu");
  const sehir = koltukBul(d, "sehirBeyi:demirhan")!;
  const ahi1 = koltukBul(d, "ahiBasi:demirhan")!;
  const ahi2 = koltukBul(d, "ahiBasi:develi")!;
  const destek = [
    { kisi: "sehir/oyuncu", hesap: "hesap-sehir", ad: "Şehir Beyi", koltuk: sehir.id, rol: "sehirBeyi" as const, kume: ["h:hesap-sehir"], ay: 0 },
    { kisi: "demirhan/ahi1", hesap: "hesap-ahi1", ad: "Ahi 1", koltuk: ahi1.id, rol: "ahiBasi" as const, kume: ["h:hesap-ahi1"], ay: 0 },
    { kisi: "develi/ahi2", hesap: "hesap-ahi2", ad: "Ahi 2", koltuk: ahi2.id, rol: "ahiBasi" as const, kume: ["h:hesap-ahi2"], ay: 0 },
  ];
  d.g.moral = 100;
  d.mesruiyet.puan = 0;
  d.sultanlik = sultanlikOzeti(sultanlikKur(0));
  d.darbe = {
    v: 1, id: "demirhan:darbe:test", durum: "catışma",
    baslatanKisi: bey.kisi, baslatanHesap: bey.hesap,
    acilisAy: 0, sogumaSonAy: 0, destekler: destek,
    garnizonSadakati: 100, yatirilan: 100, mod: "acik",
    ilanAy: 0, cozumAy: 1, izler: [],
  };
  darbeAyi(d, 1);
  assert.equal(d.darbe?.durum, "basarili");
  assert.equal(d.devlet?.beyKisi, bey.kisi);
  assert.equal(d.devlet?.divan.length, 3);
  assert.equal(d.devlet?.sultan, "bagimsiz");
  assert.equal(d.devlet?.yeminler && Object.keys(d.devlet.yeminler).length, 0);
  assert.equal(bolgeGorunumu(d, SIMDI, bey).bolge.devlet?.ad, d.devlet?.ad);
  const oncekiHarcama = d.cikan;
  bolgeAyi(d, d.ay + 1, SIMDI);
  assert.ok(d.cikan > oncekiHarcama, "bağımsız devlet harac tercihi Moğol payını doğrudan öder");

  assert.equal(eylem(d, bey, { islem: "devletYonet", tur: "ad", ad: "Demirhan Beyliği" }).ok, true);
  assert.equal(eylem(d, bey, { islem: "devletYonet", tur: "vergi", deger: 4 }).ok, true);
  assert.equal(d.devlet?.vergiOrani, 4);
  assert.equal(eylem(d, bey, { islem: "devletYonet", tur: "mogol", deger: "diren" }).ok, true);
  assert.equal(d.devlet?.mogol, "diren");
  const direnOncesi = d.cikan;
  bolgeAyi(d, d.ay + 1, SIMDI);
  assert.equal(d.cikan, direnOncesi, "direnişte Moğol haracı ödenmez");
  assert.equal(eylem(d, bey, { islem: "devletYonet", tur: "sultanBaris" }).ok, true);
  assert.equal(d.devlet?.sultan, "barisTalebi");
  d.mesruiyet.puan = 60;
  d.sultanlik.mesruiyet.puan = 60;
  const { devletAyi } = await import("../src/siyaset/devlet.ts");
  assert.equal(devletAyi(d, d.ay + 2), "barisKabul");
  assert.equal(d.devlet?.sultan, "sultanligaDondu");
  assert.equal(eylem(d, bey, { islem: "devletYonet", tur: "divanCikar", kisi: destek[0]!.kisi }).ok, true);
  assert.equal(eylem(d, bey, { islem: "devletYonet", tur: "divanEkle", kisi: destek[0]!.kisi }).ok, true);
  assert.equal(eylem(d, bey, { islem: "devletYonet", tur: "taninma", hedefBolge: "aksehir" }).ok, true);
  assert.equal(d.devlet?.taninma, "talepEdildi");
  const istek = d.diplomasiGiden?.find((x) => x.tur === "taninmaIstek");
  assert.ok(istek && istek.tur === "taninmaIstek");
  assert.equal(istek.hedef, "aksehir");

  const hedef = bolgeKur("aksehir", d.ay);
  const aksehirBey = kimlik("aksehir-bey", { yerlesim: "aksehir", bolge: "aksehir" });
  hedef.devlet = {
    v: 1, ad: "Akşehir Beyliği", kurulusAy: hedef.ay,
    beyKisi: aksehirBey.kisi, beyHesap: aksehirBey.hesap, beyAd: aksehirBey.ad,
    vergiOrani: 0, divan: [], mogol: "diren", sultan: "bagimsiz",
    taninma: "taninmadi", yeminler: {},
  };
  const { devletYonet, taninmaIstekAl, taninmaYanitAl } = await import("../src/siyaset/devlet.ts");
  const kaynakAd = BEYLIKLER.find((x) => x.id === "demirhan")!.ad;
  const hedefAd = BEYLIKLER.find((x) => x.id === "aksehir")!.ad;
  assert.equal(taninmaIstekAl(hedef, "demirhan", istek.istekId, d.ay, kaynakAd), null);
  assert.equal(taninmaIstekAl(hedef, "demirhan", istek.istekId, d.ay, kaynakAd), null, "aynı istek tekrar güvenli");
  assert.equal(taninmaIstekAl(hedef, "demirhan", "demirhan:another:1", d.ay, kaynakAd), "devlet_talep_var", "bekleyen talep üstüne ikinci talep alınmaz");
  assert.equal(devletYonet(hedef, aksehirBey, { tur: "taninmaYanit", kaynakBolge: "demirhan", istekId: istek.istekId, karar: "kabul" }), null);
  assert.equal(hedef.devlet.taninmaGelen?.demirhan?.yanitlandi, true);
  assert.equal(hedef.diplomasiGiden?.[0]?.tur, "taninmaYanit");
  assert.equal(taninmaYanitAl(d, "aksehir", istek.istekId, "kabul", hedef.ay, hedefAd), null);
  assert.equal(d.devlet?.taninma, "tanindi");
  assert.equal(d.devlet?.taninmaSonuc, "kabul");
  assert.equal(taninmaYanitAl(d, "aksehir", istek.istekId, "kabul", hedef.ay, hedefAd), null, "yanıt tekrar güvenli");
  assert.equal(taninmaYanitAl(d, "aksehir", "sahte-istek", "ret", hedef.ay, hedefAd), "hedef_uygun_degil");
  assert.deepEqual(bolgeGorunumu(d, SIMDI, bey).bolge.devlet?.taninmaTalep?.cevap, {
    kaynak: "aksehir", karar: "kabul", ay: hedef.ay, ad: hedefAd, istekId: istek.istekId,
  });
  const kendineIstek = eylem(d, bey, { islem: "devletYonet", tur: "taninma", hedefBolge: "demirhan" });
  assert.equal(kendineIstek.ok, false, "kendi devletine tanınma isteği gönderemez");
  const sahteHedef = eylem(d, bey, { islem: "devletYonet", tur: "taninma", hedefBolge: "hayali-beylik" });
  assert.equal(sahteHedef.ok, false, "gerçek beylik listesinde olmayan hedef reddedilir");


  const oyuncu = kimlik("gönüllü", { bolge: "demirhan" });
  assert.equal(eylem(d, oyuncu, { islem: "devletYemin", deger: "bagli" }).ok, true);
  assert.equal(d.devlet?.yeminler[oyuncu.hesap], "bagli");
  const tarafsiz = kimlik("tarafsiz", { bolge: "demirhan" });
  assert.equal(eylem(d, tarafsiz, { islem: "devletYemin", deger: "tarafsiz" }).ok, true);
  assert.equal(d.devlet?.yeminler[tarafsiz.hesap], "tarafsiz");
  const sahteBeySonuc = eylem(d, kimlik("sahte-bey", { bolge: "demirhan" }), { islem: "devletYonet", tur: "vergi", deger: 1 });
  assert.equal(sahteBeySonuc.ok, false);
  if (!sahteBeySonuc.ok) assert.equal(sahteBeySonuc.hata, "yetki_yok");
});

test("P6 ittifak: iki taraflı istek, kabul teyidi, ret ve süre aşımı idempotent işler", async () => {
  const { devletYonet, ittifakIstekAl, ittifakYanitAl, ittifakOnayAl, devletAyi } = await import("../src/siyaset/devlet.ts");
  const ad = (id: string) => BEYLIKLER.find((x) => x.id === id)!.ad;
  const devletKur = (id: string, kisi: SiyasiKimlik) => {
    const d = bolgeKur(id, 0);
    d.devlet = {
      v: 1, ad: ad(id), kurulusAy: 0, beyKisi: kisi.kisi, beyHesap: kisi.hesap, beyAd: kisi.ad,
      vergiOrani: 0, divan: [], mogol: "diren", sultan: "bagimsiz", taninma: "taninmadi", yeminler: {},
    };
    return d;
  };

  const kaynakBey = kimlik("ittifak-kaynak", { yerlesim: "demirhan", bolge: "demirhan" });
  const hedefBey = kimlik("ittifak-hedef", { yerlesim: "aksehir", bolge: "aksehir" });
  const kaynak = devletKur("demirhan", kaynakBey);
  const hedef = devletKur("aksehir", hedefBey);

  assert.equal(devletYonet(kaynak, kaynakBey, { tur: "ittifak", hedefBolge: "aksehir" }), null);
  const istek = kaynak.diplomasiGiden?.find((x) => x.tur === "ittifakIstek");
  assert.ok(istek && istek.tur === "ittifakIstek");
  assert.equal(ittifakIstekAl(hedef, "demirhan", istek.istekId, 0, ad("demirhan")), null);
  assert.equal(ittifakIstekAl(hedef, "demirhan", istek.istekId, 0, ad("demirhan")), null, "aynı istek tekrar güvenli");
  assert.equal(ittifakIstekAl(hedef, "demirhan", "sahte-istek", 0, "sahte ad"), "deger_sinir_disi");
  assert.equal(devletYonet(hedef, hedefBey, { tur: "ittifakYanit", kaynakBolge: "demirhan", istekId: istek.istekId, karar: "kabul" }), null);
  assert.equal(hedef.devlet?.ittifakGelen?.demirhan?.yanitlandi, true);
  assert.equal(hedef.devlet?.ittifaklar?.demirhan?.durum, "kabulBekliyor");

  const yanit = hedef.diplomasiGiden?.find((x) => x.tur === "ittifakYanit");
  assert.ok(yanit && yanit.tur === "ittifakYanit");
  assert.equal(ittifakYanitAl(kaynak, "aksehir", istek.istekId, "kabul", 0, ad("aksehir")), null);
  assert.equal(kaynak.devlet?.ittifaklar?.aksehir?.durum, "aktif");
  const onay = kaynak.diplomasiGiden?.find((x) => x.tur === "ittifakOnay");
  assert.ok(onay && onay.tur === "ittifakOnay");
  assert.equal(ittifakOnayAl(hedef, "demirhan", istek.istekId, 0, ad("demirhan")), null);
  assert.equal(hedef.devlet?.ittifaklar?.demirhan?.durum, "aktif");
  assert.equal(ittifakOnayAl(hedef, "demirhan", istek.istekId, 0, ad("demirhan")), null, "son teyit tekrar güvenli");
  assert.equal(ittifakOnayAl(hedef, "demirhan", "sahte-istek", 0, ad("demirhan")), "hedef_uygun_degil");

  const retKaynakBey = kimlik("ittifak-ret-kaynak", { yerlesim: "demirhan", bolge: "demirhan" });
  const retHedefBey = kimlik("ittifak-ret-hedef", { yerlesim: "yenisehir", bolge: "yenisehir" });
  const retKaynak = devletKur("demirhan", retKaynakBey);
  const retHedef = devletKur("yenisehir", retHedefBey);
  assert.equal(devletYonet(retKaynak, retKaynakBey, { tur: "ittifak", hedefBolge: "yenisehir" }), null);
  const retIstek = retKaynak.diplomasiGiden?.find((x) => x.tur === "ittifakIstek");
  assert.ok(retIstek && retIstek.tur === "ittifakIstek");
  assert.equal(ittifakIstekAl(retHedef, "demirhan", retIstek.istekId, 0, ad("demirhan")), null);
  assert.equal(devletYonet(retHedef, retHedefBey, { tur: "ittifakYanit", kaynakBolge: "demirhan", istekId: retIstek.istekId, karar: "ret" }), null);
  assert.equal(ittifakYanitAl(retKaynak, "yenisehir", retIstek.istekId, "ret", 0, ad("yenisehir")), null);
  assert.equal(retKaynak.devlet?.ittifaklar?.aksaray?.durum, "ret");
  assert.equal(retKaynak.diplomasiGiden?.some((x) => x.tur === "ittifakOnay"), false);

  const sureKaynak = devletKur("demirhan", kimlik("sure-kaynak", { yerlesim: "demirhan", bolge: "demirhan" }));
  const sureHedef = devletKur("yenisehir", kimlik("sure-hedef", { yerlesim: "yenisehir", bolge: "yenisehir" }));
  const sureBey = { kisi: sureKaynak.devlet!.beyKisi, hesap: sureKaynak.devlet!.beyHesap, ad: sureKaynak.devlet!.beyAd, yerlesim: "demirhan", bolge: "demirhan", yas: 30, e: 0, olu: false, nam: 40, teveccuh: 0, haklar: ["bolgeMakami"] } as SiyasiKimlik;
  assert.equal(devletYonet(sureKaynak, sureBey, { tur: "ittifak", hedefBolge: "yenisehir" }), null);
  const sureIstek = sureKaynak.diplomasiGiden?.find((x) => x.tur === "ittifakIstek");
  assert.ok(sureIstek && sureIstek.tur === "ittifakIstek");
  assert.equal(ittifakIstekAl(sureHedef, "demirhan", sureIstek.istekId, 0, ad("demirhan")), null);
  devletAyi(sureKaynak, 3);
  devletAyi(sureHedef, 3);
  assert.equal(sureKaynak.devlet?.ittifakTalep, undefined);
  assert.equal(sureKaynak.devlet?.ittifaklar?.aksaray?.durum, "suresiDoldu");
  assert.equal(sureHedef.diplomasiGiden?.some((x) => x.tur === "ittifakYanit" && x.karar === "ret"), true, "yanıtsız gelen istek süre sonunda reddedilir");
});

test("P5 savunma üstün gelirse darbe bastırılır ve vali makamı boşalır", () => {
  const d = bolgeKur("demirhan", 0);
  const vali = kimlik("vali-savunma");
  valiYap(d, vali);
  d.mesruiyet.puan = 90;
  d.g.guvenlik = 100;
  d.sultanlik = sultanlikOzeti(sultanlikKur(0));
  d.sultanlik.mesruiyet.puan = 100;
  d.darbe = {
    v: 1, id: "demirhan:darbe:savunma", durum: "catışma",
    baslatanKisi: vali.kisi, baslatanHesap: vali.hesap,
    acilisAy: d.ay, sogumaSonAy: d.ay, destekler: [],
    garnizonSadakati: 0, yatirilan: 0, mod: "baskin",
    ilanAy: d.ay, cozumAy: d.ay + 1, izler: [],
  };
  bolgeAyi(d, d.ay + 1, SIMDI);
  assert.equal(d.darbe?.durum, "bastirildi");
  assert.equal(koltukBul(d, "vali:demirhan")?.s.npc, true);
});


test("P5 garnizon sadakati tavana yaklaşınca yalnız gereken akçe tahsil edilir", async () => {
  const { darbeHazirla } = await import("../src/siyaset/darbe.ts");
  const d = bolgeKur("demirhan", 0);
  const vali = kimlik("vali-yatirim");
  valiYap(d, vali);
  assert.equal(eylem(d, vali, { islem: "darbeHazirla" }).ok, true);
  d.darbe!.garnizonSadakati = 95;
  const once = d.kasa;
  assert.equal(eylem(d, vali, { islem: "darbeSadakat", tutar: 40 }).ok, true);
  assert.equal(d.darbe?.garnizonSadakati, 100);
  assert.equal(d.darbe?.yatirilan, 20);
  assert.equal(d.kasa, once - 20);
  assert.ok(defterTutarli(d));
});


test("P5 Moğol müdahalesi darbe liderini görevden alır; bağımsız devlet kurulmaz", () => {
  const d = bolgeKur("demirhan", 0);
  const vali = kimlik("vali-mogol");
  valiYap(d, vali);
  d.sultanlik = sultanlikOzeti(sultanlikKur(0));
  d.sultanlik.mogol.kademe = 3;
  d.darbe = {
    v: 1, id: "demirhan:darbe:mogol", durum: "catışma",
    baslatanKisi: vali.kisi, baslatanHesap: vali.hesap,
    acilisAy: d.ay, sogumaSonAy: d.ay, destekler: [],
    garnizonSadakati: 20, yatirilan: 0, mod: "baskin",
    ilanAy: d.ay, cozumAy: d.ay + 1, izler: [],
  };
  bolgeAyi(d, d.ay + 1, SIMDI);
  assert.equal(d.darbe?.durum, "mogol");
  assert.equal(koltukBul(d, "vali:demirhan")?.s.npc, true);
  assert.equal(d.devlet, undefined);
});

test("P5 güçler yakınsa çıkmaz statükoyu korur", async () => {
  const { darbeAyi } = await import("../src/siyaset/darbe.ts");
  const d = bolgeKur("demirhan", 0);
  const sehir = koltukBul(d, "sehirBeyi:demirhan")!;
  const ahi = koltukBul(d, "ahiBasi:demirhan")!;
  d.sultanlik = sultanlikOzeti(sultanlikKur(0));
  d.mesruiyet.puan = 50;
  d.g.moral = 50;
  d.g.guvenlik = 50;
  d.darbe = {
    v: 1, id: "demirhan:darbe:pat", durum: "catışma",
    baslatanKisi: "vali/pat", baslatanHesap: "hesap-pat",
    acilisAy: 0, sogumaSonAy: 0,
    destekler: [
      { kisi: "sehir/1", hesap: "hesap-1", ad: "Şehir", koltuk: sehir.id, rol: "sehirBeyi", kume: ["h:1"], ay: 0 },
      { kisi: "ahi/1", hesap: "hesap-2", ad: "Ahi", koltuk: ahi.id, rol: "ahiBasi", kume: ["h:2"], ay: 0 },
    ],
    garnizonSadakati: 50, yatirilan: 0, mod: "acik",
    ilanAy: 0, cozumAy: 1, izler: [],
  };
  darbeAyi(d, 1);
  assert.equal(d.darbe?.durum, "pat");
  assert.equal(d.devlet, undefined);
});


test("P5 savunma ön emri: ilan sonrası makam sahibi yazabilir; aynı hane ikinci emri veremez", () => {
  const d = bolgeKur("demirhan", 0);
  const savunan = kimlik("savunma", { yerlesim: "demirhan", e: 55 });
  const savunanKoltuk = koltukBul(d, "sehirBeyi:demirhan")!;
  savunanKoltuk.s = oyuncuTutucu(savunan, 0, SIMDI);
  const ayniHane = kimlik("ahi-savunma", { yerlesim: "demirhan", e: 55 });
  const ahiKoltuk = koltukBul(d, "ahiBasi:demirhan")!;
  ahiKoltuk.s = oyuncuTutucu(ayniHane, 0, SIMDI);

  d.darbe = {
    v: 1, id: "demirhan:darbe:savunma", durum: "ilan",
    baslatanKisi: "vali/oyuncu", baslatanHesap: "hesap-vali", baslatanKume: ["hesap:hesap-vali"],
    acilisAy: 0, sogumaSonAy: 0, destekler: [], savunma: [],
    garnizonSadakati: 20, yatirilan: 0, mod: "acik", ilanAy: 0, cozumAy: 2, izler: [],
  };

  assert.equal(eylem(d, savunan, { islem: "darbeSavunma", makam: "sehirBeyi:demirhan" }).ok, true);
  assert.deepEqual(eylem(d, ayniHane, { islem: "darbeSavunma", makam: "ahiBasi:demirhan" }), { ok: false, hata: "kume_cakisma" });
  assert.equal(d.darbe.savunma?.length, 1);
  assert.equal(d.darbe.savunma?.[0]?.rol, "sehirBeyi");

  d.ay = 2;
  d.darbe.cozumAy = 2;
  assert.deepEqual(eylem(d, savunan, { islem: "darbeSavunma", makam: "sehirBeyi:demirhan" }), { ok: false, hata: "darbe_kapali" });
});

test("P5 savunma ön emirleri çatışma gücüne tanımlı ve tavanlı katkı verir", async () => {
  const { darbeAyi } = await import("../src/siyaset/darbe.ts");
  const plan = (savunma: NonNullable<BolgeDurumu["darbe"]>["savunma"]) => {
    const d = bolgeKur("demirhan", 0);
    d.darbe = {
      v: 1, id: "demirhan:darbe:puan", durum: "catışma",
      baslatanKisi: "vali/oyuncu", baslatanHesap: "hesap-vali",
      acilisAy: 0, sogumaSonAy: 0, destekler: [], savunma,
      garnizonSadakati: 20, yatirilan: 0, mod: "baskin", cozumAy: 1, izler: [],
    };
    darbeAyi(d, 1);
    return d.darbe!.sonuc!.savunan;
  };
  const emirler = [
    { kisi: "sehir/1", hesap: "h1", ad: "Şehir", koltuk: "sehirBeyi:develi", rol: "sehirBeyi" as const, kume: ["h1"], ay: 0 },
    { kisi: "ahi/2", hesap: "h2", ad: "Ahi", koltuk: "ahiBasi:develi", rol: "ahiBasi" as const, kume: ["h2"], ay: 0 },
  ];
  assert.equal(plan(emirler) - plan([]), 9);
  assert.equal(plan(Array.from({ length: 20 }, (_, i) => ({ ...emirler[i % 2]!, hesap: "h" + i, kume: ["h" + i] }))) - plan([]), 30, "savunma puanı tavanı");
});



function darbeCatismaDurumu() {
  const d = bolgeKur("demirhan", 0);
  const saldiran = kimlik("o1");
  const savunan = kimlik("o2", { e: 2 });
  d.darbe = {
    v: 1, id: "demirhan:darbe:ateskes-test", durum: "catışma",
    baslatanKisi: saldiran.kisi, baslatanHesap: saldiran.hesap,
    acilisAy: 1, sogumaSonAy: 0, destekler: [],
    savunma: [{
      kisi: savunan.kisi, hesap: savunan.hesap, ad: savunan.ad, koltuk: "sehirBeyi:demirhan",
      rol: "sehirBeyi", kume: ["h:hesap-o2"], ay: 1,
    }],
    garnizonSadakati: 60, yatirilan: 80, mod: "acik", ilanAy: 1, cozumAy: 4, izler: [],
  };
  return { d, saldiran, savunan };
}

test("darbe görünümü: destek veren oyuncu savunma ön emri düğmesini yanlışlıkla açamaz", () => {
  const { d } = darbeCatismaDurumu();
  const destekci = kimlik("o3", { e: 3 });
  d.darbe!.destekler.push({
    kisi: destekci.kisi, hesap: destekci.hesap, ad: destekci.ad,
    koltuk: "ahiBasi:demirhan", rol: "ahiBasi", kume: kumeAnahtarlari(destekci), ay: 1,
  });
  const gorunum = darbeGorunumu(d, destekci)!;
  assert.equal(gorunum.benimDestek, true);
  assert.equal(gorunum.benimTaraf, null, "destekçi savunma tarafı sayılmaz");
  const ayniHane = kimlik("o4", { e: 3 });
  assert.equal(darbeGorunumu(d, ayniHane)!.benimDestek, true, "aynı hane hesabı da destek kümesinde sayılır");
});

test("darbe ateşkesi: karşı tarafın açık kabulü gerekir, statüko korunur ve soğuma başlar", () => {
  const { d, saldiran, savunan } = darbeCatismaDurumu();
  assert.equal(darbeBarisTeklifEt(d, saldiran, "ateskes-istek-0001", 2), null);
  assert.equal(darbeBarisYanit(d, saldiran, "ateskes-istek-0001", "kabul", 2), "taraf_degil", "teklif sahibi kendi teklifini kabul edemez");
  assert.equal(darbeBarisYanit(d, savunan, "ateskes-istek-0001", "kabul", 2), null);
  assert.equal(d.darbe?.durum, "ateskes");
  assert.equal(d.darbe?.sonuc, undefined, "ateşkes zafer/yenilgi gibi kaydedilmez");
  assert.equal(d.darbe?.sogumaSonAy, 8);
  assert.equal(d.darbe?.barisTeklifi?.durum, "kabul");
  assert.equal(darbeBarisTeklifEt(d, saldiran, "ateskes-istek-0002", 3), "darbe_kapali", "ateşkesten sonra yeni teklif açılamaz");
});

test("darbe ateşkesi: savunma tarafı da teklif edebilir, saldıran kabul ya da reddedebilir", () => {
  const { d, saldiran, savunan } = darbeCatismaDurumu();
  assert.equal(darbeBarisTeklifEt(d, savunan, "ateskes-istek-0003", 2), null);
  assert.equal(darbeBarisYanit(d, savunan, "ateskes-istek-0003", "ret", 2), "taraf_degil");
  assert.equal(darbeBarisYanit(d, saldiran, "ateskes-istek-0003", "ret", 2), null);
  assert.equal(d.darbe?.durum, "catışma", "ret çatışmayı sürdürür");
  assert.equal(d.darbe?.barisTeklifi?.durum, "ret");
  assert.equal(darbeBarisTeklifEt(d, savunan, "ateskes-istek-0004", 2), null, "ret sonrası yeni teklif mümkün");
});

test("darbe ateşkesi: emir vermemiş üçüncü kişi taraf olamaz ve çözüm ayı geçince teklif kapanır", () => {
  const { d, saldiran, savunan } = darbeCatismaDurumu();
  assert.equal(darbeBarisTeklifEt(d, kimlik("o3"), "ateskes-istek-0005", 2), "taraf_degil");
  assert.equal(darbeBarisTeklifEt(d, saldiran, "ateskes-istek-0006", 4), "darbe_kapali");
  assert.equal(darbeBarisTeklifEt(d, saldiran, "kisa", 2), "deger_sinir_disi");
  assert.equal(darbeBarisTeklifEt(d, saldiran, "ateskes-istek-0007", 2), null);
  assert.equal(darbeBarisYanit(d, savunan, "yanlis-istek-0000", "kabul", 2), "hedef_uygun_degil");
});
