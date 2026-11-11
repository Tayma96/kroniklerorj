// Siyaset saf kuralları (Faz 7 + Ek B P1–P4): karma atama, hesap kümesi, yeter sayı, yokluk/vekil/devir, azil-itiraz,
// haraç akışı ve toplam akçe değişmezi, Moğol tutumu, meşruiyet, müzakereli özerklik.
import test from "node:test";
import assert from "node:assert/strict";
import { BEYLIKLER } from "../src/dunya-veri.ts";
import { akceGir, bolgeAyi, bolgeEylem, bolgeGorunumu, bolgeKur, defterTutarli, haracOnayla } from "../src/siyaset/bolge.ts";
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
  assert.equal(darbeSadakatYatir(d, 40, d.ay), null);
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

  assert.equal(eylem(d, yabanci, { islem: "darbeHazirla" }).hata, "yetki_yok");
  assert.equal(eylem(d, vali, { islem: "darbeHazirla" }).ok, true);
  assert.equal(eylem(d, vali, { islem: "darbeHazirla" }).hata, "darbe_var");

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

  assert.equal(eylem(d, bey, { islem: "devletYonet", tur: "ad", ad: "Demirhan Beyliği" }).ok, true);
  assert.equal(eylem(d, bey, { islem: "devletYonet", tur: "vergi", deger: 4 }).ok, true);
  assert.equal(d.devlet?.vergiOrani, 4);
  assert.equal(eylem(d, bey, { islem: "devletYonet", tur: "mogol", deger: "diren" }).ok, true);
  assert.equal(d.devlet?.mogol, "diren");
  assert.equal(eylem(d, bey, { islem: "devletYonet", tur: "sultanBaris" }).ok, true);
  assert.equal(d.devlet?.sultan, "barisTalebi");

  const oyuncu = kimlik("gönüllü", { bolge: "demirhan" });
  assert.equal(eylem(d, oyuncu, { islem: "devletYemin", deger: "bagli" }).ok, true);
  assert.equal(d.devlet?.yeminler[oyuncu.kisi], "bagli");
  const tarafsiz = kimlik("tarafsiz", { bolge: "demirhan" });
  assert.equal(eylem(d, tarafsiz, { islem: "devletYemin", deger: "tarafsiz" }).ok, true);
  assert.equal(d.devlet?.yeminler[tarafsiz.kisi], "tarafsiz");
  assert.equal(eylem(d, kimlik("sahte-bey", { bolge: "demirhan" }), { islem: "devletYonet", tur: "vergi", deger: 1 }).hata, "yetki_yok");
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
