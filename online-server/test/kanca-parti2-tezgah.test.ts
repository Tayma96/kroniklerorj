// Kanca partisi 2, tezgâh: konsinye (hak:komisyon) ve bakım indirimi (hizmet:yapiOnarimi, hak:bakimDefteri).
// Akçe değişmezi: konsinye hasılatı NPC bütçesinden; vergi + emanetçi payı + dükkân komisyonu = hasılat.
import test from "node:test";
import assert from "node:assert/strict";
import { AY_MS, DUNYA_BASLANGICI_MS } from "../src/saat.ts";
import { ETKILER } from "../src/icerik/agaclar/index.ts";
import { MALLAR } from "../src/icerik/mallar.ts";
import { kancaAnahtari } from "../src/icerik/kanca-kayit.ts";
import { seviyeVer } from "../src/yerlesim/beceri.ts";
import { dugumSeviyesi, meslekSec } from "../src/yerlesim/meslek.ts";
import { kaliteliEkle } from "../src/yerlesim/kalite.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { edin, mulkDefteri, tezgahIade } from "../src/mulk/tapu.ts";
import { tezgahDonumu, bakimIndirimi } from "../src/mulk/tezgah-donum.ts";
import { rafIslem, satinAl, tezgahGorunumu } from "../src/mulk/tezgah-uclar.ts";
import { tezgahKaydiUygula } from "../src/mulk/tezgah-isletme.ts";
import { isletmeKur } from "../src/mulk/isletme.ts";
import { BAKIM } from "../src/mulk/kurallar.ts";
import { KANCA_TAVAN, KOMISYON_VARSAYILAN } from "../src/mulk/tezgah-kurallar.ts";
import { kancaHesapla } from "../src/mulk/kanca.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const AY = 10;
const AN = DUNYA_BASLANGICI_MS + AY * AY_MS + 1000;
const ID = "develi.dukkan.1";

function yetiskin(k: Kasaba, no: number): Karakter {
  const kar = oyuncuEkle(k, no, AY - 12 * 20);
  kar.pa = 2000;
  kar.nm = [30, 30, 0, 0];
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
  t.y = { isletme: id, ts: t.ts, ad: "Tezgâh", fc: 100, seviye: 0, durum: "acik", kapi: true, kapasite: 1, it: 10, kq: 0, py: [], pn: [], po: [], to: [], as: 1 } as never;
}

function dukkanKur(...sahipKancalari: string[]) {
  const k = testKasabasi("develi", AY);
  const sahip = ogrenmis(k, 1, ...sahipKancalari);
  assert.ok(edin(k, sahip, { tur: "dukkan" }, AN, "e-0000001").ok);
  mulkDefteri(k).cik.k = [];
  yansit(k, ID);
  return { k, sahip };
}

// ── Konsinye ──

test("hak:komisyon: sahibinde hak yoksa konsinye kapalı; varsa emanetçi malını kendi satırıyla rafa koyar", () => {
  const { k: k0 } = dukkanKur();
  const e0 = yetiskin(k0, 2);
  kaliteliEkle(e0, "ekmek", [[0, 10]]);
  assert.deepEqual(rafIslem(k0, e0, ID, { islem: "konsinye", mal: "ekmek", adet: 5, fiyat: MALLAR.ekmek.taban }), { ok: false, hata: "dugum_kapali" });

  const { k, sahip } = dukkanKur("hak:komisyon");
  const e = yetiskin(k, 2);
  kaliteliEkle(e, "ekmek", [[0, 10]]);
  kaliteliEkle(sahip, "ekmek", [[0, 10]]);
  const r = rafIslem(k, e, ID, { islem: "konsinye", mal: "ekmek", adet: 5, fiyat: MALLAR.ekmek.taban });
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(e.ev?.ekmek, 5);
  const t = mulkDefteri(k).tz![ID]!;
  const satir = t.r.find((x) => x.ko)!;
  assert.deepEqual(satir.ko, { o: e.o, ad: e.ad, y: KOMISYON_VARSAYILAN });
  // İkinci satır yok; sahip konsinye satırına dokunamaz; oyuncu konsinye satırından alamaz.
  assert.deepEqual(rafIslem(k, e, ID, { islem: "konsinye", mal: "ekmek", adet: 1, fiyat: MALLAR.ekmek.taban }), { ok: false, hata: "teklif_var" });
  assert.deepEqual(rafIslem(k, sahip, ID, { islem: "al", satir: satir.n, adet: 1 }), { ok: false, hata: "yetki_yok" });
  assert.deepEqual(rafIslem(k, sahip, ID, { islem: "fiyat", satir: satir.n, fiyat: MALLAR.ekmek.taban }), { ok: false, hata: "yetki_yok" });
  const alici = yetiskin(k, 3);
  assert.deepEqual(satinAl(k, alici, ID, { satir: satir.n, adet: 1 }, AN, "s-00000001", 0), { ok: false, hata: "yetki_yok" });
  const g = tezgahGorunumu(k, e, ID);
  assert.ok(g.ok);
  if (g.ok) assert.deepEqual((g.deger.komisyon as { acik: boolean; benimSatir: number }).benimSatir, satir.n);
  // Geri çekme: yalnız emanetçi; mal envanterine döner.
  assert.deepEqual(rafIslem(k, alici, ID, { islem: "konsinyeGeri", satir: satir.n }), { ok: false, hata: "yetki_yok" });
  assert.ok(rafIslem(k, e, ID, { islem: "konsinyeGeri", satir: satir.n }).ok);
  assert.equal(e.ev?.ekmek, 10);
  assert.equal(t.r.some((x) => x.ko), false);
});

test("konsinye: sahip, çalışan ve aynı küme konsinye yapamaz; komisyon oranını yalnız yönetici, 0–20 arası", () => {
  const { k, sahip } = dukkanKur("hak:komisyon");
  kaliteliEkle(sahip, "ekmek", [[0, 10]]);
  assert.deepEqual(rafIslem(k, sahip, ID, { islem: "konsinye", mal: "ekmek", adet: 1, fiyat: MALLAR.ekmek.taban }), { ok: false, hata: "kendine" });
  const akraba = yetiskin(k, 2);
  akraba.e = sahip.e;
  kaliteliEkle(akraba, "ekmek", [[0, 10]]);
  assert.deepEqual(rafIslem(k, akraba, ID, { islem: "konsinye", mal: "ekmek", adet: 1, fiyat: MALLAR.ekmek.taban }), { ok: false, hata: "ayni_kume" });
  const yabanci = yetiskin(k, 3);
  assert.deepEqual(rafIslem(k, yabanci, ID, { islem: "komisyon", oran: 5 }), { ok: false, hata: "yetki_yok" });
  assert.deepEqual(rafIslem(k, sahip, ID, { islem: "komisyon", oran: 21 }), { ok: false, hata: "gecersiz_istek" });
  assert.ok(rafIslem(k, sahip, ID, { islem: "komisyon", oran: 20 }).ok);
  assert.equal(mulkDefteri(k).tz![ID]!.kom, 20);
});

test("konsinye NPC satışı: emanetçiye net − komisyon, dükkân kasasına yalnız komisyon; toplam akçe korunur", () => {
  const { k, sahip } = dukkanKur("hak:komisyon");
  assert.ok(rafIslem(k, sahip, ID, { islem: "komisyon", oran: 20 }).ok);
  const e = yetiskin(k, 2);
  assert.ok(meslekSec(e, "asci", AY).ok);
  kaliteliEkle(e, "ekmek", [[0, 20]]);
  assert.ok(rafIslem(k, e, ID, { islem: "konsinye", mal: "ekmek", adet: 20, fiyat: MALLAR.ekmek.taban }).ok);
  const pa0 = e.pa;
  tezgahDonumu(k, AY + 1);
  const md = mulkDefteri(k);
  const gs = md.tz![ID]!.gs as { hasilat: number; net: number; vergi: { tutar: number }; konsinye: { pay: number; komisyon: number; emanetciye: number }[] };
  assert.ok(gs.hasilat > 0, "NPC aldı");
  const kn = gs.konsinye[0]!;
  assert.equal(kn.komisyon, Math.floor((kn.pay * 20) / 100));
  assert.equal(e.pa - pa0, kn.emanetciye);
  const girdi = md.tzb![ID]!;
  assert.equal(girdi[0]![1], gs.net - kn.emanetciye, "kasaya yalnız komisyon (ve varsa sahibin kendi satışı)");
  assert.equal(gs.net + gs.vergi.tutar, gs.hasilat, "vergi + net = hasılat");
});

test("konsinye: devralma/iade boşaltmasında emanet mal sahibine değil emanetçiye döner; ölü/yerleşimsiz emanetçinin satırı satılmaz", () => {
  const { k, sahip } = dukkanKur("hak:komisyon");
  const e = yetiskin(k, 2);
  kaliteliEkle(e, "ekmek", [[0, 6]]);
  assert.ok(rafIslem(k, e, ID, { islem: "konsinye", mal: "ekmek", adet: 6, fiyat: MALLAR.ekmek.taban }).ok);
  const s0 = sahip.ev?.ekmek ?? 0;
  tezgahIade(k, ID, sahip.o);
  assert.equal(e.ev?.ekmek, 6, "emanetçiye döndü");
  assert.equal(sahip.ev?.ekmek ?? 0, s0, "sahibe geçmedi");

  const { k: k2, sahip: s2 } = dukkanKur("hak:komisyon");
  void s2;
  const e2 = yetiskin(k2, 2);
  kaliteliEkle(e2, "ekmek", [[0, 6]]);
  assert.ok(rafIslem(k2, e2, ID, { islem: "konsinye", mal: "ekmek", adet: 6, fiyat: MALLAR.ekmek.taban }).ok);
  k2.kar.delete(e2.o); // yerleşimde yüklü yaşayan sakin değil (göç gibi)
  tezgahDonumu(k2, AY + 1);
  assert.equal(mulkDefteri(k2).tz![ID]!.r.some((x) => x.ko), false, "satır kalktı, mal iade bekleyeninde");
});

// ── Bakım indirimi ──

test("bakım indirimi: yapı onarımı / bakım defteri bakım giderini yüzde düşürür (tavanlı); yalnız gider, akçe basmaz", () => {
  for (const [kancalar, beklenen] of [[["hizmet:yapiOnarimi"], 25], [["hak:bakimDefteri"], 25], [["hizmet:yapiOnarimi", "hak:bakimDefteri"], 50]] as const) {
    const { k } = dukkanKur(...kancalar);
    const s = bakimIndirimi(k, mulkDefteri(k), ID);
    assert.equal(s.deger, Math.min(KANCA_TAVAN.bakimIndirim, beklenen), kancalar.join("+"));
  }
  const { k: k0 } = dukkanKur();
  assert.equal(bakimIndirimi(k0, mulkDefteri(k0), ID).deger, 0);
  // Tavan: kişi katkısı ne olursa olsun KANCA_TAVAN.bakimIndirim.
  assert.equal(kancaHesapla([], "bakimIndirim").tavan, 50);
});

test("bakım indirimi: tezgah kaydının 4. alanıyla işletmede bakım azalır; tavan üstü kayıt reddedilir; eski 3'lü kayıt geçer", () => {
  const sahip = { o: "o1", h: "hesap-1", ad: "S" };
  for (const [bi, gider] of [[0, BAKIM.dukkan], [25, BAKIM.dukkan - Math.round(BAKIM.dukkan * 0.25)], [50, BAKIM.dukkan - Math.round(BAKIM.dukkan * 0.5)]] as const) {
    const is = isletmeKur(ID, "develi", "dukkan", 1, sahip, 1, AY);
    is.kasa = 100;
    const aylar = bi ? [[AY, 10, 1, bi]] : [[AY, 10, 1]];
    const r = tezgahKaydiUygula(is, { i: `x${bi}`, t: "tezgah", h: ID, a: 10, y: { isletme: ID, aylar } } as never, AN);
    assert.equal(r.durum, "kabul");
    assert.equal(is.kasa, 100 + 10 - gider, `indirim %${bi}`);
  }
  const is = isletmeKur(ID, "develi", "dukkan", 1, sahip, 1, AY);
  const r = tezgahKaydiUygula(is, { i: "y", t: "tezgah", h: ID, a: 10, y: { isletme: ID, aylar: [[AY, 10, 1, 90]] } } as never, AN);
  assert.equal(r.durum, "red");
});

test("bakım indirimi dönümde kayda yazılır (sahibin yapı onarımı) ve dökümde görünür", () => {
  const { k, sahip } = dukkanKur("hizmet:yapiOnarimi");
  kaliteliEkle(sahip, "ekmek", [[0, 10]]);
  const md = mulkDefteri(k);
  const t = (md.tz ??= {})[ID] ?? (md.tz[ID] = { r: [], n: 0, kk: 0 });
  kaliteliEkle(t, "ekmek", [[0, 10]]);
  assert.ok(rafIslem(k, sahip, ID, { islem: "koy", mal: "ekmek", adet: 10, fiyat: MALLAR.ekmek.taban }).ok);
  tezgahDonumu(k, AY + 1);
  const gs = md.tz![ID]!.gs as { hasilat?: number; bakimIndirimi?: number };
  assert.ok((gs.hasilat ?? 0) > 0);
  assert.equal(gs.bakimIndirimi, 25);
  assert.equal(md.tzb![ID]![0]![3], 25);
});
