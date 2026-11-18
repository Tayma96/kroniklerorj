// Kanca partisi 2 (hak l–r + namYayma, hileliTarti): çarşıda ün (mulk/carsi-hile.ts), ortak dert çağrısı ve kanal
// kancaları (ozanbasi, menzilhane, ordugahHakki, meraHakki). Akçe değişmezi: hileli tartı hasılatı dürüst dükkânla
// aynıdır (yalnız rafta mal kalır); övgü ozana hiçbir şey kazandırmaz; tek yığılma kuralı (en yüksek kişi, tavan).
import test from "node:test";
import assert from "node:assert/strict";
import { AY_MS, DUNYA_BASLANGICI_MS } from "../src/saat.ts";
import { ETKILER } from "../src/icerik/agaclar/index.ts";
import { MALLAR } from "../src/icerik/mallar.ts";
import { BOSTA_KANCALAR } from "../src/icerik/bosta-kancalar.ts";
import { KANCA_BAGLARI, kancaAnahtari } from "../src/icerik/kanca-kayit.ts";
import { seviyeVer } from "../src/yerlesim/beceri.ts";
import { dugumSeviyesi } from "../src/yerlesim/meslek.ts";
import { kaliteliEkle } from "../src/yerlesim/kalite.ts";
import { NAMLAR } from "../src/yerlesim/karakter.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { edin, mulkDefteri } from "../src/mulk/tapu.ts";
import { dukkanHKancasi, tezgahDonumu } from "../src/mulk/tezgah-donum.ts";
import { depoTasi, dukkanListesi, rafIslem, tezgahGorunumu } from "../src/mulk/tezgah-uclar.ts";
import { KANCA_TAVAN } from "../src/mulk/tezgah-kurallar.ts";
import {
  HILELI_TARTI_ADET_EN_COK,
  HILELI_TARTI_YAKALANMA,
  HILELI_TARTI_YAKALANMA_DENETCI,
  HILELI_TARTI_YUZDE,
  HILE_NAM_KAYBI,
  LEKE_ITIBAR,
  LEKE_SURE_AY,
  NAM_YAYMA_H,
  OVGU_TASLAMA_EK,
  dukkanItibari,
  hileZari,
  lekeliMi,
} from "../src/mulk/carsi-hile.ts";
import { ORTAK_DERT_CAGRI_EK, ORTAK_DERT_NPC_AYLIK, dertGorunumu, etkinlikDertleri, ortakDertDonumu } from "../src/yerlesim/ortak-dert.ts";
import { zarSirriAyarla } from "../src/yerlesim/zar-sirri.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const AY = 10;
const AN = DUNYA_BASLANGICI_MS + AY * AY_MS + 1000;
const ID = "develi.dukkan.1";
const ID2 = "develi.dukkan.2";
const MERT = NAMLAR.indexOf("mertlik");

function yetiskin(k: Kasaba, no: number): Karakter {
  const kar = oyuncuEkle(k, no, AY - 12 * 20);
  kar.pa = 2000;
  kar.nm = [30, 30, 30, 0];
  kar.e = 900 + no;
  k.sakin.find((s) => s.o === kar.o)!.e = 900 + no;
  return kar;
}

function ogrenmis(k: Kasaba, no: number, ...kancalar: string[]): Karakter {
  const c = yetiskin(k, no);
  for (const x of kancalar) {
    const e = ETKILER.find((y) => kancaAnahtari(y.etki) === x)!;
    seviyeVer(c, e.dugum, Math.max(e.seviye, dugumSeviyesi(c, e.dugum)));
  }
  return c;
}

function yansit(k: Kasaba, id: string): void {
  const t = mulkDefteri(k).t[id]!;
  t.y = { isletme: id, ts: t.ts, ad: "Tezgâh", fc: 100, seviye: 0, durum: "acik", kapi: true, kapasite: 1, it: 40, kq: 0, py: [], pn: [], po: [], to: [], as: 1 } as never;
}

/** Ekmek raflı dükkân (sahip no 1). */
function dukkan(k: Kasaba, sahip: Karakter, id: string, adet = 20): void {
  assert.ok(edin(k, sahip, { tur: "dukkan" }, AN, `e-${id.slice(-1)}000000${sahip.o.slice(1)}`).ok);
  mulkDefteri(k).cik.k = [];
  yansit(k, id);
  kaliteliEkle(sahip, "ekmek", [[0, adet]]);
  assert.ok(depoTasi(k, sahip, id, { yon: "koy", mal: "ekmek", adet }).ok);
  assert.ok(rafIslem(k, sahip, id, { islem: "koy", mal: "ekmek", adet, fiyat: MALLAR.ekmek.taban }).ok);
}

/** Zarı istenen tarafta düşen ilk dönüm ayı (sırlı zar deterministik: testte yedek anahtar). */
function zarAyi(yakala: boolean, bas = AY + 1): number {
  for (let a = bas; a < bas + 200; a++) if (hileZari("develi", ID, a) < HILELI_TARTI_YAKALANMA === yakala) return a;
  throw new Error("zar ayı yok");
}

type GunSonu = { hasilat: number; net: number; satirlar: { satilan: number; kalan: number; carpanlar: { R: number; H: number } }[]; hileliTarti?: { yakalanmaYuzde: number; yakalandi: boolean; kazanc: number; lekeBitis?: number; nam?: number } };

function donum(k: Kasaba, ay: number): GunSonu {
  k.ay = ay - 1;
  tezgahDonumu(k, ay);
  return mulkDefteri(k).tz![ID]!.gs as GunSonu;
}

// ── Kayıt ──

test("kayıt: bu partinin kancaları bağlı (boşta değil); boşta kalanların her biri gerekçeli", () => {
  const bagli = ["hileliTarti", "lekeliSatici", "namYayma", "ovguTaslama", "ortakDertCagrisi", "ozanbasi", "menzilhane", "ordugahHakki", "meraHakki"];
  for (const h of bagli) {
    assert.ok(Object.hasOwn(KANCA_BAGLARI, `hak:${h}`), h);
    assert.ok(!BOSTA_KANCALAR.includes(`hak:${h}`), h);
  }
  assert.deepEqual(KANCA_BAGLARI["hak:ozanbasi"], { kanal: "hanH", d: 3 });
  assert.deepEqual(KANCA_BAGLARI["hak:menzilhane"], { kanal: "hanH", d: 3 });
  assert.deepEqual(KANCA_BAGLARI["hak:ordugahHakki"], { kanal: "topluIndirim", d: 5, meslek: "dokumaci" });
  assert.deepEqual(KANCA_BAGLARI["hak:meraHakki"], { kanal: "npcCeza", d: 5, meslek: "ciftci" });
});

// ── Hileli tartı ──

test("hak:hileliTarti: hakkı olmayan kuramaz; yönetici olmayan kuramaz; kurulunca yöneticiye sayılarıyla görünür", () => {
  const k0 = testKasabasi("develi", AY);
  const s0 = yetiskin(k0, 1);
  dukkan(k0, s0, ID);
  assert.deepEqual(rafIslem(k0, s0, ID, { islem: "tarti", hile: true }), { ok: false, hata: "dugum_kapali" });

  const k = testKasabasi("develi", AY);
  const sahip = ogrenmis(k, 1, "hak:hileliTarti");
  dukkan(k, sahip, ID);
  const yabanci = yetiskin(k, 2);
  assert.deepEqual(rafIslem(k, yabanci, ID, { islem: "tarti", hile: true }), { ok: false, hata: "yetki_yok" });
  assert.deepEqual(rafIslem(k, sahip, ID, { islem: "tarti", hile: "evet" }), { ok: false, hata: "gecersiz_istek" });
  assert.ok(rafIslem(k, sahip, ID, { islem: "tarti", hile: true }).ok);
  assert.equal(mulkDefteri(k).tz![ID]!.ht, sahip.o);
  const g = tezgahGorunumu(k, sahip, ID);
  assert.ok(g.ok);
  const tarti = g.deger.tarti as { acik: boolean; yuzde: number; yakalanma: { taban: number; denetciyle: number } };
  assert.equal(tarti.acik, true);
  assert.equal(tarti.yuzde, HILELI_TARTI_YUZDE);
  assert.deepEqual(tarti.yakalanma, { taban: HILELI_TARTI_YAKALANMA, denetciyle: HILELI_TARTI_YAKALANMA_DENETCI });
  // Yabancı tartıyı görmez.
  const gy = tezgahGorunumu(k, yabanci, ID);
  assert.ok(gy.ok && gy.deger.tarti === undefined);
  assert.ok(rafIslem(k, sahip, ID, { islem: "tarti", hile: false }).ok);
  assert.equal(mulkDefteri(k).tz![ID]!.ht, undefined);
});

test("hileli tartı yakalanmazsa: hasılat dürüst dükkânla aynı (akçe basılmaz), yalnız en çok 2 adet rafta kalır", () => {
  const ay = zarAyi(false);
  const kur = (hile: boolean) => {
    const k = testKasabasi("develi", AY);
    const sahip = ogrenmis(k, 1, "hak:hileliTarti");
    dukkan(k, sahip, ID);
    if (hile) assert.ok(rafIslem(k, sahip, ID, { islem: "tarti", hile: true }).ok);
    const gs = donum(k, ay);
    const raf = mulkDefteri(k).tz![ID]!.r.reduce((a, s) => a + s.p.reduce((b, p) => b + p[1], 0), 0);
    return { gs, raf, girdi: mulkDefteri(k).tzb![ID]![0]!, nam: sahip.nm[MERT] };
  };
  const durust = kur(false);
  const hileli = kur(true);
  const satilan = durust.gs.satirlar.reduce((a, x) => a + x.satilan, 0);
  assert.ok(satilan > 0, "NPC aldı");
  const beklenen = Math.min(HILELI_TARTI_ADET_EN_COK, Math.floor((satilan * HILELI_TARTI_YUZDE) / 100));
  assert.ok(beklenen > 0, `satilan ${satilan}`);
  assert.equal(hileli.gs.hasilat, durust.gs.hasilat, "hasılat aynı");
  assert.deepEqual(hileli.girdi, durust.girdi, "kasaya giden aynı");
  assert.equal(hileli.gs.hileliTarti?.yakalandi, false);
  assert.equal(hileli.gs.hileliTarti?.kazanc, beklenen);
  assert.equal(hileli.raf - durust.raf, beklenen, "rafta kalan fark = kazanç");
  assert.equal(hileli.gs.satirlar[0]!.kalan, durust.gs.satirlar[0]!.kalan + beklenen, "dökümde kalan doğru");
  assert.equal(hileli.nam, durust.nam);
});

test("hileli tartı yakalanırsa: o ay kazanç yok, tartı kapanır, mertlik namı düşer, 3 dönüm lekeli (R düşük); akçe cezası yok", () => {
  const ay = zarAyi(true);
  const k = testKasabasi("develi", AY);
  const sahip = ogrenmis(k, 1, "hak:hileliTarti");
  dukkan(k, sahip, ID, 24);
  assert.ok(rafIslem(k, sahip, ID, { islem: "tarti", hile: true }).ok);
  const pa = sahip.pa;
  const nam = sahip.nm[MERT]!;
  const gs = donum(k, ay);
  const t = mulkDefteri(k).tz![ID]!;
  assert.equal(gs.hileliTarti?.yakalandi, true);
  assert.equal(gs.hileliTarti?.kazanc, 0);
  assert.equal(gs.hileliTarti?.nam, -HILE_NAM_KAYBI);
  assert.equal(sahip.nm[MERT], nam - HILE_NAM_KAYBI);
  assert.equal(sahip.pa, pa, "akçe cezası yok");
  assert.equal(t.ht, undefined, "tartı kapandı");
  assert.equal(t.lk, ay + LEKE_SURE_AY);
  assert.equal(gs.hasilat > 0, true);
  // Leke herkese görünür; sürerken yeniden kurulamaz.
  k.ay = ay;
  const l = dukkanListesi(k, sahip).dukkanlar.find((x) => x.isletme === ID)!;
  assert.deepEqual(l.leke, { bitis: ay + LEKE_SURE_AY, itibar: LEKE_ITIBAR });
  assert.deepEqual(rafIslem(k, sahip, ID, { islem: "tarti", hile: true }), { ok: false, hata: "soguma" });
  // Sonraki dönümde R çarpanı lekeyle düşer; LEKE_SURE_AY dönüm sonra kalkar.
  const r = donum(k, ay + 1).satirlar[0]!.carpanlar.R;
  assert.equal(r, 0.5 + (40 - LEKE_ITIBAR) / 100);
  for (let a = ay + 1; a <= ay + LEKE_SURE_AY; a++) assert.ok(lekeliMi(t, a), `${a} lekeli`);
  assert.ok(!lekeliMi(t, ay + LEKE_SURE_AY + 1));
  assert.ok(!lekeliMi(t, ay), "yakalandığı dönüm lekeli değil");
  assert.equal(dukkanItibari(5, t, ay + 1), 0, "itibar 0'ın altına inmez");
  k.ay = ay + LEKE_SURE_AY;
  assert.ok(rafIslem(k, sahip, ID, { islem: "tarti", hile: true }).ok, "leke bitince yeniden kurulabilir");
});

test("hak:lekeliSatici: yerleşimde denetçi yaşıyorsa yakalanma olasılığı yükselir (dökümde)", () => {
  const ay = zarAyi(false);
  for (const denetci of [false, true]) {
    const k = testKasabasi("develi", AY);
    const sahip = ogrenmis(k, 1, "hak:hileliTarti");
    dukkan(k, sahip, ID);
    if (denetci) ogrenmis(k, 2, "hak:lekeliSatici");
    assert.ok(rafIslem(k, sahip, ID, { islem: "tarti", hile: true }).ok);
    const gs = donum(k, ay);
    assert.equal(gs.hileliTarti?.yakalanmaYuzde, denetci ? HILELI_TARTI_YAKALANMA_DENETCI : HILELI_TARTI_YAKALANMA);
  }
  // Zar aynı: taban yakalamazken denetçiyle yakalayan bir ay vardır.
  const ara = Array.from({ length: 200 }, (_, i) => AY + 1 + i).find((a) => {
    const z = hileZari("develi", ID, a);
    return z >= HILELI_TARTI_YAKALANMA && z < HILELI_TARTI_YAKALANMA_DENETCI;
  })!;
  const k = testKasabasi("develi", AY);
  const sahip = ogrenmis(k, 1, "hak:hileliTarti");
  dukkan(k, sahip, ID);
  ogrenmis(k, 2, "hak:lekeliSatici");
  assert.ok(rafIslem(k, sahip, ID, { islem: "tarti", hile: true }).ok);
  assert.equal(donum(k, ara).hileliTarti?.yakalandi, true);
});

test("hileli tartı 36 ay: aylık kazanç tavanı aşılmaz; hasılat dürüst dükkânınkini hiç aşmaz", () => {
  const kur = () => {
    const k = testKasabasi("develi", AY);
    const sahip = ogrenmis(k, 1, "hak:hileliTarti");
    dukkan(k, sahip, ID, 10);
    return { k, sahip };
  };
  const h = kur();
  const d = kur();
  let kazanc = 0;
  let hasilatH = 0;
  let hasilatD = 0;
  for (let ay = AY + 1; ay <= AY + 36; ay++) {
    for (const x of [h, d]) {
      const t = mulkDefteri(x.k).tz![ID]!;
      const raf = t.r.reduce((a, s) => a + s.p.reduce((b, p) => b + p[1], 0), 0);
      if (raf < 10) {
        kaliteliEkle(x.sahip, "ekmek", [[0, 10 - raf]]);
        x.k.ay = ay - 1;
        assert.ok(depoTasi(x.k, x.sahip, ID, { yon: "koy", mal: "ekmek", adet: 10 - raf }).ok);
        assert.ok(rafIslem(x.k, x.sahip, ID, { islem: "koy", mal: "ekmek", adet: 10 - raf, fiyat: MALLAR.ekmek.taban }).ok);
      }
    }
    h.k.ay = ay - 1;
    if (!lekeliMi(mulkDefteri(h.k).tz![ID], ay)) rafIslem(h.k, h.sahip, ID, { islem: "tarti", hile: true });
    const gh = donum(h.k, ay);
    const gd = donum(d.k, ay);
    const kz = gh.hileliTarti?.kazanc ?? 0;
    assert.ok(kz <= HILELI_TARTI_ADET_EN_COK);
    kazanc += kz;
    hasilatH += gh.hasilat ?? 0;
    hasilatD += gd.hasilat ?? 0;
  }
  assert.ok(kazanc <= 36 * HILELI_TARTI_ADET_EN_COK);
  assert.ok(hasilatH <= hasilatD, `hileli ${hasilatH} ≤ dürüst ${hasilatD}`);
});

// ── Ozan övgüsü ──

test("hak:namYayma: ozan başka dükkânı över; kendine, çalıştığına, aynı kümeye, hakkı yokken olmaz; ayda bir; ozana kazanç yok", () => {
  const k = testKasabasi("develi", AY);
  const sahip = yetiskin(k, 1);
  dukkan(k, sahip, ID);
  const hakkiz = yetiskin(k, 3);
  assert.deepEqual(rafIslem(k, hakkiz, ID, { islem: "namYay" }), { ok: false, hata: "dugum_kapali" });
  const ozan = ogrenmis(k, 2, "hak:namYayma");
  dukkan(k, ozan, ID2);
  assert.deepEqual(rafIslem(k, ozan, ID2, { islem: "namYay" }), { ok: false, hata: "kendine" });
  const akraba = ogrenmis(k, 4, "hak:namYayma");
  akraba.e = sahip.e;
  assert.deepEqual(rafIslem(k, akraba, ID, { islem: "namYay" }), { ok: false, hata: "ayni_kume" });
  const { pa, nm, tk } = { pa: ozan.pa, nm: [...ozan.nm], tk: ozan.tk };
  const r = rafIslem(k, ozan, ID, { islem: "namYay" });
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(ozan.tk, tk - 1, "takat harcandı");
  assert.equal(ozan.pa, pa, "ozana akçe yok");
  assert.deepEqual(ozan.nm, nm, "ozana nam yok");
  assert.deepEqual(mulkDefteri(k).tz![ID]!.ny, [ozan.o, ozan.ad, AY, NAM_YAYMA_H]);
  // Aynı ay ikinci övgü yok (ozan sınırı); başka ozan aynı dükkânı bu ay övemez.
  const ozan2 = ogrenmis(k, 5, "hak:namYayma");
  assert.deepEqual(rafIslem(k, ozan2, ID, { islem: "namYay" }), { ok: false, hata: "teklif_var" });
  assert.deepEqual(rafIslem(k, ozan, ID2, { islem: "namYay" }), { ok: false, hata: "kendine" });
  k.ay = AY + 1;
  assert.ok(rafIslem(k, ozan2, ID, { islem: "namYay" }).ok, "ertesi ay yeniden övülebilir");
  // Görünüm: övgü herkese, ozana kalan hak.
  const g = tezgahGorunumu(k, ozan, ID);
  assert.ok(g.ok);
  assert.deepEqual(g.deger.ovgu, { ad: ozan2.ad, deger: NAM_YAYMA_H });
  assert.equal((g.deger.namYayma as { kalan: number }).kalan, 1);
});

test("övgü H kanalında tek yığılma kuralıyla: en yüksek kişi (toplanmaz), tavan; yalnız o ay; dönümde H çarpanına ve dökümüne girer", () => {
  const k = testKasabasi("develi", AY);
  const sahip = ogrenmis(k, 1, "kalite:satis");
  dukkan(k, sahip, ID);
  const md = mulkDefteri(k);
  assert.equal(dukkanHKancasi(k, md, ID)("asci").deger, 5, "sahibin kancası");
  const ozan = ogrenmis(k, 2, "hak:namYayma", "hak:ovguTaslama");
  assert.ok(rafIslem(k, ozan, ID, { islem: "namYay" }).ok);
  const h = dukkanHKancasi(k, md, ID)("asci");
  assert.equal(h.deger, NAM_YAYMA_H + OVGU_TASLAMA_EK, "en yüksek kişi: ozan (toplanmaz)");
  assert.equal(h.kisi, ozan.o);
  assert.deepEqual(h.kalemler.map((x) => x.kanca), ["hak:namYayma", "hak:ovguTaslama"]);
  assert.ok(h.deger <= KANCA_TAVAN.dukkanH);
  assert.equal(dukkanHKancasi(k, md, ID, AY + 1)("asci").deger, 5, "ertesi ayın gözüyle övgü yok");
  const gs = donum(k, AY + 1) as GunSonu & { hKanca: Record<string, { deger: number; kisiAd: string }> };
  assert.equal(gs.satirlar[0]!.carpanlar.H, 1 + (NAM_YAYMA_H + OVGU_TASLAMA_EK) / 100);
  assert.equal(gs.hKanca.asci!.kisiAd, ozan.ad);
  // Sahibin katkısı övgüden yüksekse övgü değer değiştirmez.
  const k2 = testKasabasi("develi", AY);
  const s2 = ogrenmis(k2, 1, "kalite:satis", "hak:pazarGunu");
  dukkan(k2, s2, ID);
  const o2 = ogrenmis(k2, 2, "hak:namYayma");
  assert.ok(rafIslem(k2, o2, ID, { islem: "namYay" }).ok);
  const h2 = dukkanHKancasi(k2, mulkDefteri(k2), ID)("asci");
  assert.equal(h2.deger, 10);
  assert.equal(h2.kisi, s2.o);
});

// ── Ortak dert çağrısı ──

test("hak:ortakDertCagrisi: yerleşimde hakkı bilen yaşayan sakin varsa halkın aylık katkısı artar (bir kez), dökümde", () => {
  const kur = (n: number) => {
    const k = testKasabasi("develi", 300);
    for (let i = 1; i <= n; i++) ogrenmis(k, i, "hak:ortakDertCagrisi");
    if (n === 0) yetiskin(k, 1);
    assert.equal(etkinlikDertleri(k, k.ay, [{ id: "e1", dert: "kitlik", sureAy: 4 }]).length, 1);
    const d = k.tl!.od.find((x) => x.e === "e1")!;
    ortakDertDonumu(k, k.ay + 1);
    return d;
  };
  const yok = kur(0);
  assert.equal(yok.np, ORTAK_DERT_NPC_AYLIK);
  assert.equal(dertGorunumu(yok).halkCagri, undefined);
  for (const n of [1, 2]) {
    const d = kur(n);
    assert.equal(d.np, ORTAK_DERT_NPC_AYLIK + ORTAK_DERT_CAGRI_EK, `${n} hancı: bir kez`);
    assert.equal(dertGorunumu(d).halkCagri, ORTAK_DERT_CAGRI_EK);
  }
});

test("hileli tartı: zar sırrı yoksa kurulmaz ve dönüm düşmez (kazanç/yakalanma yok); kuran sahiplikten çıkınca kapanır", () => {
  const ay = zarAyi(false);
  const k = testKasabasi("develi", AY);
  const sahip = ogrenmis(k, 1, "hak:hileliTarti");
  dukkan(k, sahip, ID);
  assert.ok(rafIslem(k, sahip, ID, { islem: "tarti", hile: true }).ok);
  zarSirriAyarla(undefined, false);
  try {
    assert.deepEqual(rafIslem(k, sahip, ID, { islem: "tarti", hile: true }), { ok: false, hata: "yapilandirma_eksik" });
    const gs = donum(k, ay);
    assert.equal(gs.hileliTarti?.kazanc, 0);
    assert.equal(gs.hileliTarti?.yakalandi, false);
  } finally {
    zarSirriAyarla(undefined, true);
  }
  const t = mulkDefteri(k).tz![ID]!;
  assert.equal(t.ht, sahip.o);
  t.ht = "o99";
  donum(k, ay + 1);
  assert.equal(t.ht, undefined, "kuran sahip/çalışan değil: kapandı");
});
