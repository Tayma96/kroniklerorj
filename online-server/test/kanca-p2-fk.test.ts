// Kanca partisi 2, hak f–k: ortak dert (önderlik, hazırlık, buyruk, bağış), genç talimi, ebe bağı, ihtiyar heyeti,
// ilk görüş, husumet listesi, kethüda adaylığı, hazine defteri, fiyat döngüsü, kronik kalemi ve koru. Her bağlanan
// kanca için davranış testi; akçe değişmezi ve tavanlar (sim) kilitli.
import test from "node:test";
import assert from "node:assert/strict";
import { ETKILER } from "../src/icerik/agaclar/index.ts";
import { BOSTA_KANCALAR } from "../src/icerik/bosta-kancalar.ts";
import { KANCA_BAGLARI, kancaAnahtari } from "../src/icerik/kanca-kayit.ts";
import { seviyeVer } from "../src/yerlesim/beceri.ts";
import { hakAcik } from "../src/yerlesim/beceri-etki.ts";
import { dugumSeviyesi } from "../src/yerlesim/meslek.ts";
import { arkaPlanAl } from "../src/yerlesim/arka-plan.ts";
import {
  BAGIS_ARZ_EN_COK,
  DERT_BUYRUK_INDIRIM,
  DERT_ESIK_INDIRIM_TAVAN,
  DERT_HAZIRLIK_AY,
  DERT_ONDERLIK_INDIRIM,
  dertGorunumu,
  ortakDertDonumu,
  ortakDertKatki,
  type OrtakDert,
} from "../src/yerlesim/ortak-dert.ts";
import { GENC_TALIMI_ASINMA, GOSTERGE_AYLIK_DONUS, GOSTERGE_DENGE, gostergeDegistir, gostergeOku, toplulukAl } from "../src/yerlesim/topluluk-kayit.ts";
import { HAZINE_DEFTERI_AY, hazineDefteriGorunumu, toplulukDonumu } from "../src/yerlesim/topluluk.ts";
import { hizmetGorevDonumu, hizmetGorevTeslim } from "../src/yerlesim/hizmet-gorev.ts";
import { hizmetNpcTalebiAc } from "../src/yerlesim/hizmet-pazari.ts";
import { ekonomiAl } from "../src/yerlesim/pazar-tahta.ts";
import { ucgenAl, ucgenEmanet } from "../src/yerlesim/bilgi.ts";
import { araciIste, arabulucuYap } from "../src/yerlesim/arabulucu.ts";
import { tohumlu } from "../src/yerlesim/rastgele.ts";
import { ILK_GORUS, gorus, ilkGorusAcik } from "../src/yerlesim/gorus.ts";
import { husumetListesi } from "../src/yerlesim/iliski.ts";
import { toplumAl } from "../src/yerlesim/toplum.ts";
import { adayUygunMu, koltukBul } from "../src/siyaset/makam.ts";
import { bolgeKur } from "../src/siyaset/bolge.ts";
import type { SiyasiKimlik } from "../src/siyaset/tipler.ts";
import { fiyatDongusu, type FiyatOzeti } from "../src/yerlesim/kervan.ts";
import { fiyatOzetiUc, type KervanMotoru } from "../src/yerlesim/kervan-uclar.ts";
import { KRONIK_KALEM_YILLIK, KRONIK_NAM, kronikKalemi } from "../src/yerlesim/kronik.ts";
import { KORU_ARALIK_AY, KORU_ODUN, KORU_PAYI, koruDik } from "../src/yerlesim/koru.ts";
import { hanedanKasabasi } from "../src/yerlesim/hanedan.ts";
import type { Karakter, Kasaba, Olay, OlayTaslagi } from "../src/yerlesim/tipler.ts";
import { toplamAkce } from "./hanedan-yardimci.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";
import { baglam, dostYap, kopya, senaryo } from "./ucgen-yardimci.ts";

const AY = 300;

/** Bu partide bağlanan kancalar (kayıtta "mevcut", tüketici dosyada). */
const BAGLANAN = [
  "haydutOnderligi", "kitlikOnderligi", "hazirlikPenceresi", "kitlikBagisi", "kapiKapama", "karantina", "gencTalimi",
  "haneEbeligi", "heyetUzlasmasi", "ilkGorus", "husumetListesi", "kethudaAdayligi", "hazineDefteri", "fiyatDongusu",
  "kasabaKronigi", "kronikNami", "koruDikimi", "koruBakimi",
].map((h) => `hak:${h}`);

function yetiskin(k: Kasaba, no: number): Karakter {
  const kar = oyuncuEkle(k, no, AY - 12 * 25);
  kar.pa = 500;
  kar.tk = 60;
  kar.ta = AY;
  kar.e = 900 + no;
  k.sakin.find((s) => s.o === kar.o)!.e = 900 + no;
  return kar;
}

function ogrenmis(k: Kasaba, no: number, ...kancalar: string[]): Karakter {
  const c = yetiskin(k, no);
  for (const x of kancalar) {
    const e = ETKILER.find((y) => kancaAnahtari(y.etki) === x);
    if (!e) throw new Error(`ağaçta yok: ${x}`);
    seviyeVer(c, e.dugum, Math.max(e.seviye, dugumSeviyesi(c, e.dugum)));
  }
  return c;
}

const akce = (k: Kasaba) => toplamAkce(k);

test("kayıt: bu partinin kancaları bağlı, boşta listesinde değil; boşta kalan f–k kancalarının nedeni yazılı", () => {
  for (const a of BAGLANAN) {
    assert.equal(KANCA_BAGLARI[a]?.kanal, "mevcut", a);
    assert.ok(!BOSTA_KANCALAR.includes(a), a);
  }
});

// ── Ortak dert ──

function dertAcik(k: Kasaba, t: "haydut" | "kitlik", ay: number): OrtakDert {
  arkaPlanAl(k).tt[t] = ay + 2;
  ortakDertDonumu(k, ay);
  return k.tl!.od.find((x) => x.t === t && x.d === "acik")!;
}

test("hak:haydutOnderligi / hak:kitlikOnderligi: derdin eşiği önderle düşük açılır (dökümlü); hak yoksa ham", () => {
  for (const [t, hak] of [["haydut", "hak:haydutOnderligi"], ["kitlik", "hak:kitlikOnderligi"]] as const) {
    const k0 = testKasabasi("develi", AY);
    yetiskin(k0, 1);
    const ham = dertAcik(k0, t, AY + 1);
    assert.equal(ham.eh, undefined, `${t}: önder yokken indirim yok`);
    const k = testKasabasi("develi", AY);
    const o = ogrenmis(k, 1, hak);
    const d = dertAcik(k, t, AY + 1);
    assert.equal(d.eh, ham.es);
    assert.equal(d.es, ham.es - Math.round((ham.es * DERT_ONDERLIK_INDIRIM) / 100), t);
    const g = dertGorunumu(d) as { esikDokum?: { ham: number; kalemler: { kanca: string; d: number; kisiAd: string }[] } };
    assert.deepEqual(g.esikDokum!.kalemler[0], { kanca: hak.slice(4), d: d.es - ham.es, kisiAd: o.ad });
    assert.equal(g.esikDokum!.ham, ham.es);
  }
});

test("hak:hazirlikPenceresi: haydut derdinin penceresi bir ay uzar (yalnız haydut)", () => {
  const k0 = testKasabasi("develi", AY);
  const ham = dertAcik(k0, "haydut", AY + 1);
  const k = testKasabasi("develi", AY);
  ogrenmis(k, 1, "hak:hazirlikPenceresi");
  assert.equal(dertAcik(k, "haydut", AY + 1).bt, ham.bt + DERT_HAZIRLIK_AY);
  const k2 = testKasabasi("develi", AY);
  ogrenmis(k2, 1, "hak:hazirlikPenceresi");
  const kit0 = dertAcik(testKasabasi("develi", AY), "kitlik", AY + 1);
  assert.equal(dertAcik(k2, "kitlik", AY + 1).bt, kit0.bt);
});

test("hak:kapiKapama / hak:karantina: buyruk hakkı olanın ilk katkısında eşik bir kez düşer; toplam indirim tavanlı", () => {
  for (const [t, hak] of [["haydut", "hak:kapiKapama"], ["salgin", "hak:karantina"]] as const) {
    const k = testKasabasi("develi", AY);
    const c = ogrenmis(k, 1, hak);
    const tl = toplulukAl(k);
    tl.od.push({ i: tl.on++, t, ac: AY, bt: AY + 4, es: 100, pu: 0, np: 0, d: "acik", k: [] });
    const d = tl.od.at(-1)!;
    const r1 = ortakDertKatki(k, c, { dert: d.i, katki: "elEmegi" }, AY);
    assert.ok(r1.ok, JSON.stringify(r1));
    if (!r1.ok) continue;
    assert.deepEqual(r1.deger.yanit.buyruk, { hak: hak.slice(4), esik: -DERT_BUYRUK_INDIRIM });
    assert.equal(d.es, 100 - DERT_BUYRUK_INDIRIM);
    const r2 = ortakDertKatki(k, c, { dert: d.i, katki: "elEmegi" }, AY);
    assert.ok(r2.ok && r2.deger.yanit.buyruk === undefined, "buyruk dert başına bir kez");
    assert.equal(d.es, 100 - DERT_BUYRUK_INDIRIM);
  }
  // Önderlik + buyruk birlikte: indirim ham eşiğin DERT_ESIK_INDIRIM_TAVAN yüzdesini aşmaz.
  const k = testKasabasi("develi", AY);
  const c = ogrenmis(k, 1, "hak:haydutOnderligi", "hak:kapiKapama");
  const d = dertAcik(k, "haydut", AY + 1);
  const r = ortakDertKatki(k, c, { dert: d.i, katki: "elEmegi" }, AY + 1);
  assert.ok(r.ok);
  const toplam = DERT_ONDERLIK_INDIRIM + DERT_BUYRUK_INDIRIM;
  assert.ok(toplam > DERT_ESIK_INDIRIM_TAVAN, "test tavanı sınar");
  assert.equal(d.eh! - d.es, Math.floor((d.eh! * DERT_ESIK_INDIRIM_TAVAN) / 100));
});

test("hak:kitlikBagisi: kıtlık derdine erzak sandığı bağışı Erzak'a (arz) yazar, katkı başına tavanlı; akçe değişmez", () => {
  const k = testKasabasi("develi", AY);
  const c = ogrenmis(k, 1, "hak:kitlikBagisi");
  const b = yetiskin(k, 2);
  const d = dertAcik(k, "kitlik", AY + 1);
  d.es = 10_000;
  c.ev = { erzakSandigi: 10 };
  b.ev = { erzakSandigi: 10 };
  const tl = toplulukAl(k);
  tl.gs[0] = 40;
  const a0 = akce(k);
  const r = ortakDertKatki(k, c, { dert: d.i, katki: "erzak", mal: "erzakSandigi", adet: 5 }, AY + 1);
  assert.ok(r.ok, JSON.stringify(r));
  if (r.ok) assert.deepEqual(r.deger.yanit.bagis, { arz: BAGIS_ARZ_EN_COK });
  assert.equal(gostergeOku(k, "arz"), 40 + BAGIS_ARZ_EN_COK);
  const r2 = ortakDertKatki(k, b, { dert: d.i, katki: "erzak", mal: "erzakSandigi", adet: 5 }, AY + 1);
  assert.ok(r2.ok && r2.deger.yanit.bagis === undefined, "hakkı olmayan bağış Erzak'a yazmaz");
  assert.equal(gostergeOku(k, "arz"), 40 + BAGIS_ARZ_EN_COK);
  assert.equal(akce(k), a0);
});

// ── Kasaba görevi: genç talimi ──

test("hak:gencTalimi: talim görevinin ayında asayiş yarı aşınır; hak yoksa olağan aşınma", () => {
  for (const [hakli, asinma] of [[true, GENC_TALIMI_ASINMA], [false, GOSTERGE_AYLIK_DONUS]] as const) {
    const k = testKasabasi("develi", AY);
    k.hd = { ...(k.hd ?? {}), hz: 500 } as never;
    hizmetGorevDonumu(k, AY);
    const c = hakli ? ogrenmis(k, 1, "hak:gencTalimi") : ogrenmis(k, 1, "hizmet:talim");
    const gorev = ekonomiAl(k).hg!.find((x) => x.tur === "talim")!;
    const r = hizmetGorevTeslim(k, c, `kg${gorev.i}`, AY);
    assert.ok(r.ok, JSON.stringify(r));
    if (r.ok) assert.equal(r.deger.katki.gencTalimi, hakli ? true : undefined);
    const tl = toplulukAl(k);
    gostergeDegistir(tl, "asayis", GOSTERGE_DENGE + 20 - gostergeOku(k, "asayis"));
    toplulukDonumu(k, AY + 1);
    assert.equal(gostergeOku(k, "asayis"), GOSTERGE_DENGE + 20 - asinma, `hak ${hakli}`);
    // Bir sonraki ay talim yoksa olağan aşınma.
    toplulukDonumu(k, AY + 2);
    assert.equal(gostergeOku(k, "asayis"), GOSTERGE_DENGE + 20 - asinma - GOSTERGE_AYLIK_DONUS);
  }
});

// ── NPC hizmet talebi: ebe bağı ──

test("hak:haneEbeligi: hanenin önceki lohusasını yapan ebe (hakkıyla) yeni doğumda ilk çağrılır, genel öncelikten önce", () => {
  const k = testKasabasi("develi", AY);
  k.hd = { ...(k.hd ?? {}), hz: 100 } as never;
  const genel = ogrenmis(k, 1, "hizmet:lohusa", "hak:dogumTalebi");
  const ebe = ogrenmis(k, 2, "hizmet:lohusa", "hak:haneEbeligi");
  const npc = k.npc.find((n) => n.e !== genel.e && n.e !== ebe.e)!;
  const olay = (w: string) => ({ t: "dogum", w, h: `n${npc.i}`, g: "", n: 3, k: "olay.dogum", p: {} }) as unknown as OlayTaslagi;
  assert.equal(hizmetNpcTalebiAc(k, AY, [olay("olay-1")]).length, 1);
  const ek = ekonomiAl(k);
  const ilk = ek.hn!.at(-1)!;
  assert.equal(ilk.on, genel.o, "bağ yokken genel öncelik");
  // Ebe bu hanenin lohusasını yaptı (bağ kuruldu).
  ilk.d = "tamam";
  ilk.teslim = { o: ebe.o, ad: ebe.ad, ay: AY };
  assert.equal(hizmetNpcTalebiAc(k, AY + 1, [olay("olay-2")]).length, 1);
  assert.equal(ek.hn!.at(-1)!.on, ebe.o, "ebe bağı önce gelir");
  // Hakkı olmayan önceki ebe bağ kurmaz.
  const k2 = testKasabasi("develi", AY);
  k2.hd = { ...(k2.hd ?? {}), hz: 100 } as never;
  const g2 = ogrenmis(k2, 1, "hizmet:lohusa", "hak:dogumTalebi");
  const e2 = ogrenmis(k2, 2, "hizmet:lohusa");
  const n2 = k2.npc.find((n) => n.e !== g2.e && n.e !== e2.e)!;
  const o2 = (w: string) => ({ t: "dogum", w, h: `n${n2.i}`, g: "", n: 3, k: "olay.dogum", p: {} }) as unknown as OlayTaslagi;
  hizmetNpcTalebiAc(k2, AY, [o2("olay-1")]);
  const t2 = ekonomiAl(k2).hn!.at(-1)!;
  t2.d = "tamam";
  t2.teslim = { o: e2.o, ad: e2.ad, ay: AY };
  hizmetNpcTalebiAc(k2, AY + 1, [o2("olay-2")]);
  assert.equal(ekonomiAl(k2).hn!.at(-1)!.on, g2.o);
});

// ── Arabuluculuk: ihtiyar heyeti ──

test("hak:heyetUzlasmasi: heyetin ilk arabuluculuğu reddedilmez (ret → ateşkes, heyet:true); akçe korunur, nam yok", () => {
  const s0 = senaryo();
  dostYap(s0.k, s0.berkay.o, s0.hasan.o);
  s0.berkay.pa = 50;
  assert.ok(araciIste(baglam(s0.k, s0.berkay), { arabulucu: s0.hasan.o, npc: s0.murat.i, bedel: "ozur", miktar: 0 }).ok);
  const talep = ucgenAl(s0.k).at[0]!.i;
  let retTohum = -1;
  for (let i = 0; i < 300 && retTohum < 0; i++) {
    const s = kopya(s0);
    const r = arabulucuYap(baglam(s.k, s.hasan), { talep }, tohumlu("ara", i));
    if (r.ok && r.deger.yanit.sonuc === "ret" && !r.deger.yanit.yakalandi) retTohum = i;
  }
  assert.ok(retTohum >= 0, "ret çıkan tohum bulundu");
  const s = kopya(s0);
  const e = ETKILER.find((y) => kancaAnahtari(y.etki) === "hak:heyetUzlasmasi")!;
  seviyeVer(s.hasan, e.dugum, e.seviye);
  const nam0 = JSON.stringify(s.hasan.nm);
  const once = toplamAkce(s.k) + ucgenEmanet(s.k);
  const r = arabulucuYap(baglam(s.k, s.hasan), { talep }, tohumlu("ara", retTohum));
  assert.ok(r.ok, JSON.stringify(r));
  if (!r.ok) return;
  assert.equal(r.deger.yanit.sonuc, "ateskes");
  assert.equal(r.deger.yanit.heyet, true);
  assert.equal(toplamAkce(s.k) + ucgenEmanet(s.k), once);
  assert.equal(JSON.stringify(s.hasan.nm), nam0, "ateşkes nam vermez");
});

// ── Görüş: ilk görüş ──

test("hak:ilkGorus: geçmişi olmayan NPC'de ilk görüş +5 (dökümlü); tanışınca kalkar; hızlı denetim hakAcik ile aynı", () => {
  const k = testKasabasi("develi", AY);
  const c = yetiskin(k, 1);
  const npc = k.npc.find((n) => n.e !== c.e)!;
  const once = gorus(k, npc, c, k.ili.get(c.o), AY).toplam;
  assert.equal(ilkGorusAcik(c), false);
  const e = ETKILER.find((y) => kancaAnahtari(y.etki) === "hak:ilkGorus")!;
  seviyeVer(c, e.dugum, e.seviye);
  assert.equal(ilkGorusAcik(c), hakAcik(c, "ilkGorus"));
  assert.equal(ilkGorusAcik(c), true);
  const sonra = gorus(k, npc, c, k.ili.get(c.o), AY);
  assert.equal(sonra.toplam, Math.min(100, once + ILK_GORUS));
  assert.ok(sonra.kalemler.some((x) => x.k === "gorus.ilkGorus" && x.d === ILK_GORUS));
  k.ili.get(c.o)![npc.i] = { t: 0, an: [] } as never;
  assert.ok(!gorus(k, npc, c, k.ili.get(c.o), AY).kalemler.some((x) => x.k === "gorus.ilkGorus"));
});

// ── Husumet listesi ──

test("hak:husumetListesi: kasabanın bütün açık husumetleri ve süren arabuluculuğun arabulucusu", () => {
  const k = testKasabasi("develi", AY);
  const a = yetiskin(k, 1);
  const b = yetiskin(k, 2);
  const c = yetiskin(k, 3);
  const t = toplumAl(k);
  t.hu.push({ g: a.o, h: b.o, ay: AY, d: "acik" }, { g: c.o, h: a.o, ay: AY, d: "kalkti" });
  (t.oa ??= []).push({ i: 1, s: b.o, k: a.o, ar: c.o, d: "taslak", rs: {}, sv: 0, im: {}, ac: AY } as never);
  const ad = (id: string) => ({ id, ad: k.sakin.find((s) => s.o === id)?.ad ?? "?" });
  assert.deepEqual(husumetListesi(k, ad), [{ ilanEden: ad(a.o), hedef: ad(b.o), ay: AY, arabulucu: ad(c.o) }]);
  t.oa![0]!.d = "tamam";
  assert.equal(husumetListesi(k, ad)[0]!.arabulucu, null);
});

// ── Siyaset: kethüda adaylığı ──

test("hak:kethudaAdayligi: ahi başı adaylığında teveccüh şartının yerini tutar; başka makamı açmaz", () => {
  const d = bolgeKur("demirhan", 0);
  const ahi = koltukBul(d, "ahiBasi:develi")!;
  const kimlik = (haklar: string[]): SiyasiKimlik => ({ kisi: "develi/o1", hesap: "hesap-o1", ad: "O1", yerlesim: "develi", bolge: "demirhan", yas: 30, e: 0, olu: false, nam: 0, teveccuh: 0, haklar });
  assert.equal(adayUygunMu(d, ahi, kimlik([])), "aday_uygun_degil");
  assert.equal(adayUygunMu(d, ahi, kimlik(["kethudaAdayligi"])), null);
  const kasaba = koltukBul(d, "kasabaAgasi:develi")!;
  assert.equal(adayUygunMu(d, kasaba, kimlik(["kethudaAdayligi"])), "aday_uygun_degil");
});

// ── Hazine defteri ──

test("hak:hazineDefteri: defter tutucu yaşarken ay başı hazine bakiyesi yazılır (12 ay), herkese görünür; akçeye dokunmaz", () => {
  const k = testKasabasi("develi", AY);
  yetiskin(k, 2);
  toplulukDonumu(k, AY + 1);
  assert.equal(hazineDefteriGorunumu(k), null, "tutucu yokken defter yok");
  const c = ogrenmis(k, 1, "hak:hazineDefteri");
  const hz = hanedanKasabasi(k);
  hz.hz = 100;
  const a0 = akce(k);
  for (let i = 0; i < HAZINE_DEFTERI_AY + 3; i++) {
    hz.hz += 5;
    toplulukDonumu(k, AY + 2 + i);
  }
  const g = hazineDefteriGorunumu(k)!;
  assert.equal(g.satirlar.length, HAZINE_DEFTERI_AY);
  assert.equal(g.satirlar.at(-1)!.bakiye, hz.hz);
  assert.equal(g.satirlar.at(-1)!.fark, 5);
  assert.equal(g.satirlar.at(-1)!.tutanAd, c.ad);
  assert.equal(akce(k), a0 + 5 * (HAZINE_DEFTERI_AY + 3));
});

// ── Fiyat döngüsü ──

test("hak:fiyatDongusu: fiyat özeti yalnız istenince döngüyü taşır (kıtlık süresi, Erzak, olasılık çarpanı)", () => {
  const k = testKasabasi("develi", AY);
  arkaPlanAl(k).tt.kitlik = AY + 2;
  const motor = { kasaba: k } as unknown as KervanMotoru;
  const duz = fiyatOzetiUc(motor, undefined, undefined, undefined);
  assert.ok(duz.ok && (duz.deger.ozet as FiyatOzeti).dongu === undefined);
  const d = fiyatOzetiUc(motor, undefined, undefined, undefined, true);
  assert.ok(d.ok);
  if (d.ok) assert.deepEqual(d.deger.ozet.dongu, fiyatDongusu(k));
  assert.deepEqual({ kitlik: fiyatDongusu(k).kitlik, bitis: fiyatDongusu(k).kitlikBitis }, { kitlik: true, bitis: AY + 2 });
});

// ── Kronik kalemi ──

function olay(s: number, a: number, w: string, g = ""): Olay {
  return { s, a, t: "sohbet", w, h: "", g, n: 3, k: "olay.test", p: {} };
}

test("hak:kasabaKronigi / hak:kronikNami: yılda 3 açık olay kroniğe; adı geçen başka oyuncu yılda bir kez nam alır", () => {
  const k = testKasabasi("develi", AY);
  const ozan = ogrenmis(k, 1, "hak:kasabaKronigi");
  const b = yetiskin(k, 2);
  b.nm = [0, 0, 5, 0];
  assert.deepEqual(kronikKalemi(k, yetiskin(k, 3), olay(1, AY, b.o), AY), { ok: false, hata: "dugum_kapali" });
  assert.deepEqual(kronikKalemi(k, ozan, olay(1, AY, b.o, b.o), AY), { ok: false, hata: "hedef_uygun_degil" }, "özel olay yazılmaz");
  assert.deepEqual(kronikKalemi(k, ozan, olay(1, AY - 13, b.o), AY), { ok: false, hata: "hedef_uygun_degil" }, "eski olay");
  const r = kronikKalemi(k, ozan, olay(1, AY, b.o), AY);
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(k.kq!.at(-1)!.t, "kalem");
  assert.equal(JSON.stringify(b.nm), JSON.stringify([0, 0, 5, 0]), "kronikNami yokken nam yok");
  assert.deepEqual(kronikKalemi(k, ozan, olay(1, AY, b.o), AY), { ok: false, hata: "istek_tekrar" }, "aynı olay iki kez yazılmaz");
  const e = ETKILER.find((y) => kancaAnahtari(y.etki) === "hak:kronikNami")!;
  seviyeVer(ozan, e.dugum, e.seviye);
  const r2 = kronikKalemi(k, ozan, olay(2, AY, b.o), AY);
  assert.ok(r2.ok);
  if (r2.ok) assert.deepEqual(r2.deger.yanit.kalem, { olay: 2, yil: (r2.deger.yanit.kalem as { yil: number }).yil, yazilan: 2, kalan: 1, nam: { kisi: b.ad, nam: "mertlik", d: KRONIK_NAM } });
  assert.equal(b.nm[2], 5 + KRONIK_NAM);
  // Aynı yıl ikinci kez aynı kişi nam almaz; kendi olayı nam getirmez.
  const r3 = kronikKalemi(k, ozan, olay(3, AY, b.o), AY);
  assert.ok(r3.ok && !(r3.deger.yanit.kalem as { nam?: unknown }).nam);
  assert.equal(b.nm[2], 5 + KRONIK_NAM);
  assert.deepEqual(kronikKalemi(k, ozan, olay(4, AY, ozan.o), AY), { ok: false, hata: "aralik_dolu" }, `yılda ${KRONIK_KALEM_YILLIK}`);
  ozan.tk = 60;
  ozan.ta = AY + 12;
  const r4 = kronikKalemi(k, ozan, olay(5, AY + 12, ozan.o), AY + 12);
  assert.ok(r4.ok && !(r4.deger.yanit.kalem as { nam?: unknown }).nam, "yeni yıl; kendi olayı nam getirmez");
});

test("sim: kronik kalemi 10 yılda kişi başı yılda en çok 1 nam, akçe değişmez", () => {
  const k = testKasabasi("develi", AY);
  const ozan = ogrenmis(k, 1, "hak:kasabaKronigi", "hak:kronikNami");
  const b = yetiskin(k, 2);
  const a0 = akce(k);
  const nam0 = b.nm.reduce((x, y) => x + y, 0);
  let s = 1;
  for (let yil = 0; yil < 10; yil++) {
    for (let i = 0; i < 6; i++) {
      const ay = AY + yil * 12 + i;
      ozan.tk = 60;
      ozan.ta = ay;
      kronikKalemi(k, ozan, olay(s++, ay, b.o), ay);
    }
  }
  assert.equal(b.nm.reduce((x, y) => x + y, 0) - nam0, 10 * KRONIK_NAM);
  assert.equal(akce(k), a0);
});

// ── Koru ──

test("hak:koruDikimi / hak:koruBakimi: dikim herkesin odun sayacını sıfırlar; kasaba başı 6 ayda bir; koru payı sert odun", () => {
  const k = testKasabasi("develi", AY);
  const c = ogrenmis(k, 1, "hak:koruDikimi");
  const b = yetiskin(k, 2);
  b.tz = { odun: [AY, AY], tas: [AY] };
  c.ev = { odun: 1 };
  assert.deepEqual(koruDik(k, yetiskin(k, 3), AY), { ok: false, hata: "dugum_kapali" });
  assert.deepEqual(koruDik(k, c, AY), { ok: false, hata: "mal_yok" });
  c.ev = { odun: 5 };
  const a0 = akce(k);
  const r = koruDik(k, c, AY);
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(b.tz.odun, undefined);
  assert.deepEqual(b.tz.tas, [AY], "yalnız odun sayacı");
  assert.equal(c.ev.odun, 5 - KORU_ODUN);
  assert.equal(c.ev.sertOdun, undefined, "koru bakımı yokken pay yok");
  if (r.ok) assert.deepEqual(r.deger.digerleri, [b.o]);
  assert.deepEqual(koruDik(k, c, AY + KORU_ARALIK_AY - 1), { ok: false, hata: "aralik_dolu" });
  const e = ETKILER.find((y) => kancaAnahtari(y.etki) === "hak:koruBakimi")!;
  seviyeVer(c, e.dugum, e.seviye);
  c.tk = 60;
  c.ta = AY + KORU_ARALIK_AY;
  const r2 = koruDik(k, c, AY + KORU_ARALIK_AY);
  assert.ok(r2.ok, JSON.stringify(r2));
  assert.equal(c.ev.sertOdun, KORU_PAYI);
  assert.equal(akce(k), a0);
});
