// Tezgâh modeli Dilim 2 (atölye) saf kuralları ve denge sınırları (§6, §8): zanaat, genişletme, üretim emri,
// emek havuzu, NPC emeği, toplu sipariş. Her denge sınırı önce burada sınanır.
import test from "node:test";
import assert from "node:assert/strict";
import { MALLAR, type MalId } from "../src/icerik/mallar.ts";
import { TARIFLER } from "../src/icerik/tarifler.ts";
import { seviyeVer } from "../src/yerlesim/beceri.ts";
import { kaliteAdedi, kaliteliEkle } from "../src/yerlesim/kalite.ts";
import { ilerleme, meslekSec } from "../src/yerlesim/meslek.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { bosTezgah, depoAdedi, type Tezgah } from "../src/mulk/depo.ts";
import { emekTavani, etkinSeviye, genislet, tezgahSayisi, ustaSec, zanaatOner, zanaatSec } from "../src/mulk/atolye.ts";
import { emirAc, emirIptal, emirleriIsle } from "../src/mulk/uretim-emri.ts";
import { topluDonumu, topluMallari, topluTeslim, topluTutar, type TopluDefter } from "../src/mulk/toplu-siparis.ts";
import {
  EMEK_HAVUZU_TEZGAH_BASI,
  GENISLETME_MALZEME,
  NPC_ATOLYE_MAAS_EN_AZ,
  NPC_EMEK_AY,
  TEZGAH_SAYISI,
  TOPLU_ODUL_CARPANI,
  ZANAAT_DEGISIM_BEDELI,
  ZANAAT_MESLEKLERI,
  emekMarji,
} from "../src/mulk/tezgah-kurallar.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const AY = 20;
const ID = "develi.atolye.1";

function usta(k: Kasaba, no: number, meslek: string, dugum: string, kd: 0 | 1 | 2 | 3 = 1): Karakter {
  const c = oyuncuEkle(k, no, AY - 20 * 12);
  meslekSec(c, meslek, AY);
  seviyeVer(c, dugum, 1);
  ilerleme(c, meslek as never).kd = kd;
  return c;
}

function atolye(za = "oduncu", gk?: number): Tezgah {
  const t = bosTezgah(gk);
  t.za = za as never;
  return t;
}

const malSay = (t: Tezgah, m: string) => t.ev?.[m] ?? 0;

test("parametreler: tezgâh sayısı, zanaat meslekleri (tarifi olanlar), NPC atölye maaş tabanı türetilmiş", () => {
  assert.deepEqual(TEZGAH_SAYISI, [1, 2, 3, 4, 5]);
  assert.deepEqual([...ZANAAT_MESLEKLERI], ["asci", "ciftci", "demirci", "dokumaci", "katip", "marangoz", "oduncu", "sifaci"]);
  assert.equal(NPC_ATOLYE_MAAS_EN_AZ, 38);
});

test("§8 (a): NPC emeğiyle üretip NPC'ye taban fiyattan satmak kâr ettirmez (her tarif, maaş + girdi ≥ çıktı)", () => {
  let enKotu = -Infinity;
  for (const t of Object.values(TARIFLER)) {
    const ayKar = NPC_EMEK_AY * emekMarji(t as never) - NPC_ATOLYE_MAAS_EN_AZ;
    enKotu = Math.max(enKotu, ayKar);
    assert.ok(ayKar <= 0, `${t.id}: ${ayKar}`);
  }
  // Uygulamalı: yalnız NPC emeğiyle bir ay en kârlı tarif (girdisi depoda) → çıktı tabanı − girdi tabanı − maaş ≤ 0.
  const k = testKasabasi("develi", AY);
  const u = usta(k, 1, "asci", "asci.kitlikErzaki", 2);
  const tr = TARIFLER.erzakSandigi;
  const t = atolye("asci");
  for (const [m, n] of Object.entries(tr.girdi)) kaliteliEkle(t, m as MalId, [[0, (n ?? 0) * 4]]);
  assert.ok(emirAc(t, 0, "erzakSandigi", 4, [u], u.o, AY).ok);
  const once = Object.entries(t.ev ?? {}).reduce((a, [m, n]) => a + MALLAR[m as MalId].taban * n, 0);
  const r = emirleriIsle({ t, isletme: ID, seviye: 0, kapasite: 240, npcEmek: NPC_EMEK_AY, adaylar: [u], ay: AY });
  const sonra = Object.entries(t.ev ?? {}).reduce((a, [m, n]) => a + MALLAR[m as MalId].taban * n, 0);
  assert.ok(r.yapim >= 1);
  assert.ok(sonra - once - NPC_ATOLYE_MAAS_EN_AZ <= 0, `NPC emeği kârı ${sonra - once - NPC_ATOLYE_MAAS_EN_AZ}`);
  console.log(`  §8(a) en kötü tarif aylık NPC kârı ${enKotu.toFixed(1)}; erzak sandığı uygulamalı ${sonra - once - NPC_ATOLYE_MAAS_EN_AZ}`);
});

test("§8 (b)(c)(f): emirle üretim girdi/çıktı korunur, atölye seviyesi adet artırmaz yalnız kalite; takat→emek 1:1", () => {
  const k = testKasabasi("develi", AY);
  const u = usta(k, 1, "oduncu", "oduncu.baltacilik", 2);
  const sonuc = (seviye: number) => {
    const t = atolye();
    kaliteliEkle(t, "odun", [[0, 10]]);
    t.eh = 7;
    assert.ok(emirAc(t, 4, "kereste", 10, [u], u.o, AY).ok);
    const r = emirleriIsle({ t, isletme: ID, seviye, kapasite: 240, npcEmek: 0, adaylar: [u], ay: AY });
    return { t, r };
  };
  const a = sonuc(0);
  const b = sonuc(4);
  // 7 emek → 7 yapım (takat 1): 7 odun gitti, 7 kereste geldi; emek yoktan çoğalmadı.
  for (const { t, r } of [a, b]) {
    assert.equal(r.yapim, 7);
    assert.equal(malSay(t, "odun"), 3);
    assert.equal(malSay(t, "kereste"), 7, "adet seviyeyle artmaz");
    assert.equal(t.eh, undefined, "havuz bitti");
    assert.equal(r.emek.oyuncuOnce - r.emek.oyuncuSonra, r.yapim * TARIFLER.kereste.takat);
    assert.equal(r.emirler[0]!.neden, "emek_yok");
    assert.equal(depoAdedi(t), 10, "girdi + çıktı korunumu (1:1 tarif)");
  }
  const kalite = (t: Tezgah) => [0, 1, 2, 3].reduce((s, q) => s + q * kaliteAdedi(t, "kereste", q as 0), 0);
  assert.ok(kalite(b.t) > kalite(a.t), "seviye bonusu yalnız kaliteye");
  assert.ok(b.t.kq?.kereste?.every((p) => p[2] === u.o && p[3] === ID), "yapan izi + atölye damgası");
});

test("emir: zanaat, tezgâh sınırı, usta şartı, iptal; bekleme nedenleri; NPC emeği biriktirilmez ve kaliteyi düşürür", () => {
  const k = testKasabasi("develi", AY);
  const u = usta(k, 1, "oduncu", "oduncu.baltacilik", 0);
  const yabanci = usta(k, 2, "demirci", "demirci.aletcilik", 3);
  const t = atolye();
  assert.deepEqual(emirAc(bosTezgah(), 0, "kereste", 1, [u], u.o, AY), { ok: false, hata: "zanaat_yok" });
  assert.deepEqual(emirAc(t, 0, "nal", 1, [u], u.o, AY), { ok: false, hata: "zanaat_disi" });
  assert.deepEqual(emirAc(t, 0, "kereste", 0, [u], u.o, AY), { ok: false, hata: "kez_gecersiz" });
  assert.deepEqual(emirAc(t, 0, "komur", 1, [u], u.o, AY), { ok: false, hata: "usta_yok" }, "kömür düğümü kapalı");
  assert.deepEqual(emirAc(t, 0, "kereste", 1, [yabanci], u.o, AY), { ok: false, hata: "usta_yok" });
  assert.ok(emirAc(t, 0, "kereste", 3, [u], u.o, AY).ok);
  assert.deepEqual(emirAc(t, 0, "kereste", 1, [u], u.o, AY), { ok: false, hata: "tezgah_dolu" }, "1. seviye 1 tezgâh");
  assert.equal(tezgahSayisi(t, 3), 4);
  assert.deepEqual(emirAc(t, 3, "kereste", 1, [u], u.o, AY).ok, true);
  assert.deepEqual(emirIptal(t, 2).ok, true);
  assert.deepEqual(emirIptal(t, 9), { ok: false, hata: "emir_yok" });
  // Girdi yok: bekler, emek harcanmaz.
  t.eh = 3;
  let r = emirleriIsle({ t, isletme: ID, seviye: 0, kapasite: 60, npcEmek: 4, adaylar: [u], ay: AY });
  assert.equal(r.yapim, 0);
  assert.equal(r.emirler[0]!.neden, "girdi_yok");
  assert.equal(t.eh, 3);
  assert.equal(r.emek.npcKullanilan, 0, "NPC emeği kullanılmadı ve biriktirilmez");
  // Depo dolu: bekler.
  kaliteliEkle(t, "odun", [[0, 60]]);
  r = emirleriIsle({ t, isletme: ID, seviye: 0, kapasite: 60, npcEmek: 0, adaylar: [u], ay: AY });
  assert.equal(r.yapim, 3, "1:1 tarif kapasiteyi aşmaz");
  assert.equal(t.ue, undefined, "tamamlanan emir çıkar");
  // Usta yok: bekler.
  assert.ok(emirAc(t, 0, "kereste", 2, [u], u.o, AY).ok);
  r = emirleriIsle({ t, isletme: ID, seviye: 0, kapasite: 240, npcEmek: 2, adaylar: [], ay: AY });
  assert.equal(r.emirler[0]!.neden, "usta_yok");
  // NPC emeği: aynı zarla tam NPC yapımı ceza kalemi taşır, oyuncu emeği taşımaz.
  const t1 = atolye();
  const t2 = atolye();
  for (const x of [t1, t2]) {
    kaliteliEkle(x, "odun", [[0, 5]]);
    assert.ok(emirAc(x, 0, "kereste", 1, [u], u.o, AY).ok);
  }
  t1.eh = 1;
  const r1 = emirleriIsle({ t: t1, isletme: ID, seviye: 0, kapasite: 240, npcEmek: 0, adaylar: [u], ay: AY });
  const r2 = emirleriIsle({ t: t2, isletme: ID, seviye: 0, kapasite: 240, npcEmek: 2, adaylar: [u], ay: AY });
  assert.deepEqual([r1.emirler[0]!.emek, r2.emirler[0]!.emek], [{ oyuncu: 1, npc: 0 }, { oyuncu: 0, npc: 1 }]);
  assert.equal(r2.emek.npcKullanilan, 1);
});

test("zanaat: öneri ana/yan meslekten; ilk atama ve ilk değişiklik ücretsiz, sonrası akçe; açık emirle değişmez", () => {
  const k = testKasabasi("develi", AY);
  const c = oyuncuEkle(k, 1, AY - 20 * 12);
  assert.equal(zanaatOner(c), undefined);
  meslekSec(c, "hanci", AY);
  assert.equal(zanaatOner(c), undefined, "hancının tarifi yok");
  const d = oyuncuEkle(k, 2, AY - 20 * 12);
  meslekSec(d, "demirci", AY);
  assert.equal(zanaatOner(d), "demirci");
  const t = bosTezgah();
  assert.deepEqual(zanaatSec(t, "tuccar", 0), { ok: false, hata: "meslek_gecersiz" });
  assert.deepEqual(zanaatSec(t, "oduncu", 0), { ok: true, deger: { meslek: "oduncu", bedel: 0, degisim: 0 } }, "ilk atama değişiklik sayılmaz");
  t.za = "oduncu";
  assert.deepEqual(zanaatSec(t, "demirci", 0), { ok: true, deger: { meslek: "demirci", bedel: 0, degisim: 1 } });
  t.za = "demirci";
  t.zs = 1;
  assert.deepEqual(zanaatSec(t, "oduncu", 0), { ok: false, hata: "para_yok" });
  assert.deepEqual(zanaatSec(t, "oduncu", 100), { ok: true, deger: { meslek: "oduncu", bedel: ZANAAT_DEGISIM_BEDELI, degisim: 2 } });
  t.ue = [{ n: 1, tr: "nal", k: 1, y: 0, a: AY, o: c.o }];
  assert.deepEqual(zanaatSec(t, "oduncu", 100), { ok: false, hata: "emir_acik" });
});

test("usta: tarifi yapabilen en yüksek kademeli; emek tavanı tezgâh × sabit", () => {
  const k = testKasabasi("develi", AY);
  const a = usta(k, 1, "oduncu", "oduncu.baltacilik", 1);
  const b = usta(k, 2, "oduncu", "oduncu.baltacilik", 2);
  const c = usta(k, 3, "oduncu", "oduncu.madencilik", 3);
  assert.equal(ustaSec([a, b, c], TARIFLER.kereste as never)?.o, b.o);
  assert.equal(emekTavani(atolye(), 0), EMEK_HAVUZU_TEZGAH_BASI);
  assert.equal(emekTavani(atolye("oduncu", 1), 4), 2 * EMEK_HAVUZU_TEZGAH_BASI, "genişletilmemiş seviye kapasite açmaz");
});

test("genişletme: malzeme NPC'den alınabilir mallar; depodan düşer, kademe bir artar; eski kayıt bugünkü seviyede", () => {
  for (const tur of ["dukkan", "atolye"] as const) {
    assert.equal(GENISLETME_MALZEME[tur].length, 4);
    for (const l of GENISLETME_MALZEME[tur]) for (const m of Object.keys(l)) assert.ok(MALLAR[m as MalId].taban > 0, `${m} NPC'den alınır`);
  }
  const eski = bosTezgah();
  assert.equal(etkinSeviye(eski, 3), 3, "eski kayıtta kapasite verilmiş sayılır");
  assert.deepEqual(genislet("atolye", eski, 3), { ok: false, hata: "genisletme_yok" });
  const t = bosTezgah(0);
  assert.equal(etkinSeviye(t, 2), 0);
  assert.deepEqual(genislet("atolye", t, 2), { ok: false, hata: "malzeme_yok" });
  kaliteliEkle(t, "kereste", [[0, 8]]);
  kaliteliEkle(t, "civi", [[0, 7]]);
  assert.ok(genislet("atolye", t, 2).ok);
  assert.deepEqual([t.gk, malSay(t, "kereste"), malSay(t, "civi")], [1, 0, 1]);
  assert.equal(tezgahSayisi(t, 2), 2);
});

test("§8 (d): toplu sipariş ödülü ≤ 84; tek açık; dönüşümlü; üst üste aynı atölye alamaz; ayda giriş ≤ 84", () => {
  for (const m of ZANAAT_MESLEKLERI) for (const mal of topluMallari(m)) {
    const tt = topluTutar(mal);
    assert.ok(tt.deger <= 60 && tt.odul <= 84 && tt.odul === Math.ceil(tt.deger * TOPLU_ODUL_CARPANI), `${mal}: ${JSON.stringify(tt)}`);
  }
  const d: TopluDefter = { l: [] };
  assert.equal(topluDonumu(d, "develi", AY, []).acilan, undefined, "atölye yoksa sipariş yok");
  const a = topluDonumu(d, "develi", AY, ["oduncu", "demirci"]).acilan!;
  assert.equal(a.meslek, "demirci");
  assert.equal(topluDonumu(d, "develi", AY + 1, ["oduncu", "demirci"]).acilan, undefined, "açık varken yenisi açılmaz");
  const t1 = atolye("demirci");
  const t2 = atolye("demirci");
  const t3 = atolye("oduncu");
  kaliteliEkle(t1, a.mal, [[0, a.adet * 3]]);
  kaliteliEkle(t2, a.mal, [[0, a.adet]]);
  assert.deepEqual(topluTeslim(d, a.id, "x.atolye.3", "", t3, AY + 1), { ok: false, hata: "zanaat_disi" });
  assert.deepEqual(topluTeslim(d, a.id, "x.atolye.2", "", atolye("demirci"), AY + 1), { ok: false, hata: "mal_yok" });
  assert.ok(topluTeslim(d, a.id, "x.atolye.1", "Bir", t1, AY + 1).ok);
  assert.equal(malSay(t1, a.mal), a.adet * 2);
  assert.deepEqual(topluTeslim(d, a.id, "x.atolye.2", "", t2, AY + 1), { ok: false, hata: "siparis_kapandi" }, "ilk teslim eden alır");
  const b = topluDonumu(d, "develi", AY + 2, ["oduncu", "demirci"]).acilan!;
  assert.equal(b.meslek, "oduncu", "dönüşümlü");
  const c = topluDonumu(d, "develi", AY + 2 + 2, ["demirci"]);
  assert.equal(c.dusen.length, 1, "süresi dolan düşer");
  assert.equal(c.acilan!.meslek, "demirci");
  assert.deepEqual(topluTeslim(d, c.acilan!.id, "x.atolye.1", "", t1, AY + 4), { ok: false, hata: "ust_uste" });
  // 36 ay boyunca her ay teslim: aylık giriş tavanı.
  const s: TopluDefter = { l: [] };
  const aylik = new Map<number, number>();
  for (let ay = 1; ay <= 36; ay++) {
    const r = topluDonumu(s, "develi", ay, ZANAAT_MESLEKLERI);
    if (!r.acilan) continue;
    const tz = atolye(r.acilan.meslek);
    kaliteliEkle(tz, r.acilan.mal, [[0, r.acilan.adet]]);
    const t = topluTeslim(s, r.acilan.id, `x.atolye.${ay % 2}`, "", tz, ay);
    if (t.ok) aylik.set(ay, (aylik.get(ay) ?? 0) + t.deger.siparis.odul);
  }
  const enCok = Math.max(...aylik.values());
  assert.ok(enCok <= 84, `aylık giriş ${enCok}`);
  console.log(`  §8(d) toplu sipariş en yüksek aylık giriş ${enCok} akçe (36 ay, ${aylik.size} teslim)`);
});
