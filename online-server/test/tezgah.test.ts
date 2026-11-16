// Tezgâh modeli Dilim 1 (saf kurallar + iki taraf köprüsü): depo, raf, oyuncu müşteri, hane bütçesi ay dönümü,
// kepenk, eski kayıt göçü, devralma, iflasta mal iadesi, han yolcu havuzu. Mal ve akçe ne çoğalır ne kaybolur.
import test from "node:test";
import assert from "node:assert/strict";
import { AY_MS, DUNYA_BASLANGICI_MS } from "../src/saat.ts";
import { kaliteAdedi, kaliteliEkle } from "../src/yerlesim/kalite.ts";
import { meslekSec } from "../src/yerlesim/meslek.ts";
import { isletmeIsle, type IsletmeIleti } from "../src/mulk/islem.ts";
import { ayIlerlet, isletmeKur, type Baglam, type Isletme } from "../src/mulk/isletme.ts";
import { MULK_YUVA } from "../src/mulk/kurallar.ts";
import { edin, girisIsle, mulkDefteri, telafi } from "../src/mulk/tapu.ts";
import { cikisKapat, type CikisKaydi } from "../src/mulk/transfer.ts";
import { depoAdedi, partiToplam } from "../src/mulk/depo.ts";
import { tezgahDonumu, tezgahKayitlariAc, yolcuKarti } from "../src/mulk/tezgah-donum.ts";
import { depoTasi, devral, dukkanListesi, fiyatOnizle, rafIslem, satinAl, tezgahGorunumu } from "../src/mulk/tezgah-uclar.ts";
import { yolcuCoz } from "../src/mulk/hane-butcesi.ts";
import { DEVRALMA_KEPENK_AY, HANE_BUTCESI, KITLIK_BUTCE_CARPANI, URETICI_MESLEKLER, YOLCU_BUTCESI } from "../src/mulk/tezgah-kurallar.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const AY = 10;
const AN = DUNYA_BASLANGICI_MS + AY * AY_MS + 1000;
const ID = "develi.dukkan.1";

function yetiskin(k: Kasaba, no: number, pa = 2000): Karakter {
  const kar = oyuncuEkle(k, no, AY - 12 * 20);
  kar.pa = pa;
  kar.nm = [30, 30, 0, 0];
  kar.e = 900 + no;
  k.sakin.find((s) => s.o === kar.o)!.e = 900 + no;
  return kar;
}

/** IsletmeDO yansısı gelmiş gibi (seviye, itibar, çalışan yetkileri). */
function yansit(k: Kasaba, id: string, ek: Record<string, unknown> = {}): void {
  const t = mulkDefteri(k).t[id]!;
  t.y = { isletme: id, ts: t.ts, ad: "", fc: 100, seviye: 0, durum: "acik", kapi: true, kapasite: 1, it: 10, kq: 0, py: [], pn: [], po: [], to: [], as: 1, ...ek } as never;
}

function hazir() {
  const k = testKasabasi("develi", AY);
  const a = yetiskin(k, 1);
  const b = yetiskin(k, 2);
  assert.ok(edin(k, a, { tur: "dukkan" }, AN, "e-0000001").ok);
  mulkDefteri(k).cik.k = [];
  yansit(k, ID);
  kaliteliEkle(a, "ekmek", [[0, 30], [2, 6, "o1"]]);
  kaliteliEkle(a, "civi", [[0, 20]]);
  return { k, a, b };
}

/** Bütün mal adedi (envanterler + depo + raf): korunum denetimi. */
function malToplam(k: Kasaba, mal: string): number {
  let t = 0;
  for (const kar of k.kar.values()) t += kar.ev?.[mal] ?? 0;
  for (const tz of Object.values(k.mk?.tz ?? {})) {
    t += tz.ev?.[mal] ?? 0;
    for (const s of tz.r) if (s.m === mal) t += partiToplam(s.p);
  }
  return t;
}

test("depo ve raf: yetki, kapasite, bant, satır sınırları; yapan izi korunur; mal çoğalmaz/kaybolmaz", () => {
  const { k, a, b } = hazir();
  const once = malToplam(k, "ekmek");
  assert.deepEqual(depoTasi(k, b, ID, { yon: "koy", mal: "ekmek", adet: 1 }), { ok: false, hata: "yetki_yok" }, "yabancı koyamaz");
  assert.deepEqual(depoTasi(k, a, ID, { yon: "koy", mal: "ekmek", adet: 61 }), { ok: false, hata: "adet_gecersiz" });
  assert.deepEqual(depoTasi(k, a, ID, { yon: "koy", mal: "su", adet: 1 }), { ok: false, hata: "mal_gecersiz" }, "tabanı 0 mal rafa çıkmaz");
  assert.ok(depoTasi(k, a, ID, { yon: "koy", mal: "ekmek", adet: 30 }).ok);
  assert.ok(depoTasi(k, a, ID, { yon: "koy", mal: "ekmek", kalite: 2, adet: 6 }).ok);
  assert.deepEqual(depoTasi(k, a, ID, { yon: "koy", mal: "civi", adet: 5 }), { ok: false, hata: "depo_dolu" }, "1. seviye depo 40");
  assert.equal(depoAdedi(mulkDefteri(k).tz![ID]!), 36);
  // Çalışan: "musteri" yetkisiyle koyar, "kasa" yetkisi olmadan depodan alamaz (mal dışarı çıkmaz).
  yansit(k, ID, { py: [["o2", ["musteri"]]] });
  kaliteliEkle(b, "civi", [[0, 2]]);
  assert.ok(depoTasi(k, b, ID, { yon: "koy", mal: "civi", adet: 2 }).ok);
  assert.deepEqual(depoTasi(k, b, ID, { yon: "al", mal: "civi", adet: 1 }), { ok: false, hata: "yetki_yok" });
  // Raf: yeni satır fiyat ister; bant dışı fiyat; satır başı 24.
  assert.deepEqual(rafIslem(k, a, ID, { islem: "koy", mal: "ekmek", adet: 5 }), { ok: false, hata: "fiyat_gecersiz" });
  assert.deepEqual(rafIslem(k, a, ID, { islem: "koy", mal: "ekmek", adet: 5, fiyat: 100 }), { ok: false, hata: "fiyat_bant_disi" });
  assert.deepEqual(rafIslem(k, a, ID, { islem: "koy", mal: "ekmek", adet: 25, fiyat: 5 }), { ok: false, hata: "raf_satir_dolu" });
  assert.ok(rafIslem(k, a, ID, { islem: "koy", mal: "ekmek", adet: 20, fiyat: 5 }).ok);
  assert.ok(rafIslem(k, a, ID, { islem: "koy", mal: "ekmek", kalite: 2, adet: 6, fiyat: 9 }).ok);
  assert.ok(rafIslem(k, a, ID, { islem: "koy", mal: "civi", adet: 2, fiyat: 4 }).ok);
  kaliteliEkle(mulkDefteri(k).tz![ID]!, "kumas", [[0, 1]]);
  assert.deepEqual(rafIslem(k, a, ID, { islem: "koy", mal: "kumas", adet: 1, fiyat: 15 }), { ok: false, hata: "raf_dolu" }, "1. seviye 3 satır");
  assert.deepEqual(rafIslem(k, b, ID, { islem: "fiyat", satir: 1, fiyat: 6 }), { ok: false, hata: "yetki_yok" }, "fiyat yetkisi yok");
  assert.ok(rafIslem(k, a, ID, { islem: "fiyat", satir: 1, fiyat: 6 }).ok);
  assert.ok(rafIslem(k, a, ID, { islem: "al", satir: 1, adet: 4 }).ok);
  const g = tezgahGorunumu(k, a, ID);
  assert.ok(g.ok);
  const raf = g.deger.raf as { satir: number; adet: number; fiyat: number; yapan?: string; npcTavan: number }[];
  assert.deepEqual(raf.map((s) => [s.satir, s.adet, s.fiyat]), [[1, 16, 6], [2, 6, 9], [3, 2, 4]]);
  assert.equal(raf[1]!.yapan, "o1", "yapan izi rafta");
  assert.equal(g.deger.kepenk, false);
  // Dışarıdan bakan depoyu görmez.
  const c = yetiskin(k, 3);
  const dis = tezgahGorunumu(k, c, ID);
  assert.ok(dis.ok && !("depo" in dis.deger));
  assert.ok(depoTasi(k, a, ID, { yon: "al", mal: "ekmek", adet: 14 }).ok);
  assert.equal(malToplam(k, "ekmek"), once, "mal korunur");
  // Atölye: depo var, raf yok.
  assert.ok(edin(k, a, { tur: "atolye" }, AN, "e-0000002").ok);
  assert.deepEqual(rafIslem(k, a, "develi.atolye.1", { islem: "koy", mal: "ekmek", adet: 1, fiyat: 5 }), { ok: false, hata: "tezgah_yok" });
  assert.ok(depoTasi(k, a, "develi.atolye.1", { yon: "koy", mal: "ekmek", adet: 1 }).ok);
});

/** İki tarafı bellekte konuşturur (mulk.test.ts kopru deseni). */
function kopru(k: Kasaba) {
  const isler = new Map<string, Isletme>();
  const isle = (ileti: IsletmeIleti, an = AN) => {
    const r = isletmeIsle(isler.get(ileti.isletme), ileti, an);
    if (r.is) isler.set(ileti.isletme, r.is);
    return r.sonuc;
  };
  const teslim = (an = AN) => {
    const md = mulkDefteri(k);
    const gruplar = new Map<string, CikisKaydi[]>();
    for (const x of md.cik.k) gruplar.set(x.h, [...(gruplar.get(x.h) ?? []), x]);
    for (const [h, kayitlar] of gruplar) {
      const r = isle({ islem: "teslim", isletme: h, kayitlar }, an);
      assert.ok(r.ok);
      for (const [i, d] of r.deger.sonuclar!) {
        const kp = cikisKapat(md.cik, i, d, an);
        if (kp?.durum === "iade") telafi(k, kp.kayit);
      }
      const gelen = r.deger.teslim;
      if (gelen.length) isle({ islem: "onay", isletme: h, sonuclar: gelen.map((x) => [x.i, girisIsle(k, x, an).durum]) }, an);
    }
  };
  return { isler, isle, teslim };
}

function baglam(kar: Karakter): Baglam {
  return { h: kar.h, o: kar.o, ad: kar.ad, mk: {}, tv: 0 };
}

test("oyuncu müşteri: anında alır, vergi hazineye, net kasaya, mal yapan iziyle; aynı hane geliri saymaz", () => {
  const { k, a, b } = hazir();
  const br = kopru(k);
  br.teslim();
  // Kurulum kaydı yeniden (hazir çıkış kutusunu boşalttı): işletmeyi doğrudan kur.
  br.isler.set(ID, isletmeKur(ID, "develi", "dukkan", 1, { h: a.h, o: a.o, ad: a.ad }, mulkDefteri(k).t[ID]!.ts, AY));
  assert.ok(depoTasi(k, a, ID, { yon: "koy", mal: "ekmek", kalite: 2, adet: 6 }).ok);
  assert.ok(rafIslem(k, a, ID, { islem: "koy", mal: "ekmek", kalite: 2, adet: 6, fiyat: 10 }).ok);
  assert.deepEqual(satinAl(k, a, ID, { satir: 1, adet: 1 }, AN, "s-0000001", 0), { ok: false, hata: "kendine" });
  assert.deepEqual(satinAl(k, b, ID, { satir: 1, adet: 1, fiyat: 9 }, AN, "s-0000002", 0), { ok: false, hata: "fiyat_degisti" });
  assert.deepEqual(satinAl(k, b, ID, { satir: 1, adet: 7 }, AN, "s-0000003", 0), { ok: false, hata: "stok_yok" });
  const pa = b.pa;
  const r = satinAl(k, b, ID, { satir: 1, adet: 3, fiyat: 10 }, AN, "s-0000004", 4);
  assert.ok(r.ok);
  const satis = r.deger.satis as { tutar: number; kasaya: number; vergi: { tutar: number }; kume: boolean; yapan: string };
  assert.equal(b.pa, pa - 30);
  assert.equal(satis.vergi.tutar, 1);
  assert.equal(satis.kasaya, 29);
  assert.equal(satis.yapan, "o1");
  assert.equal(kaliteAdedi(b, "ekmek", 2), 3, "kalite korunur");
  assert.ok(b.kq?.ekmek?.some((p) => p[2] === "o1"), "yapan izi alıcıda");
  assert.equal(mulkDefteri(k).vergiGiden?.at(-1)?.tutar, 1);
  br.teslim();
  const is = br.isler.get(ID)!;
  assert.equal(is.kasa, 29);
  assert.equal(is.gelir, 19, "yabancı müşteri geliri adil değere kadar sayılır (3 × 6,4 = 19; üstü kasada, puan saymaz)");
  // Aynı hane (küme): kasaya girer, gelire/itibara sayılmaz.
  const c = yetiskin(k, 3);
  c.e = a.e;
  c.h = a.h;
  k.sakin.find((s) => s.o === "o3")!.e = a.e;
  k.sakin.find((s) => s.o === "o3")!.h = a.h;
  // Aynı kümede adil üstü fiyat armağan sayılır ve geçmez (bant = adil): fiyat adile (6) iner.
  assert.deepEqual(satinAl(k, c, ID, { satir: 1, adet: 2 }, AN, "s-0000006", 0), { ok: false, hata: "pompa_siniri" });
  assert.ok(rafIslem(k, a, ID, { islem: "fiyat", satir: 1, fiyat: 6 }).ok);
  const r2 = satinAl(k, c, ID, { satir: 1, adet: 2 }, AN, "s-0000005", 0);
  assert.ok(r2.ok);
  assert.equal((r2.deger.satis as { kume: boolean }).kume, true);
  br.teslim();
  assert.equal(is.kasa, 41);
  assert.equal(is.gelir, 19, "küme satışı gelir/seviye puanı üretmez");
  assert.ok(is.iz.m.some((x) => x[2] === "kume"));
  assert.deepEqual(is.iz.s, ["o2"], "itibar müşteri sayımına yalnız bayraksız müşteri");
});

test("hane bütçesi ay dönümü: NPC harcaması ≤ ΣB; kepenkte kayıt yok; kaçan aylar tek kayıtta; tekrar teslim tek uygulanır", () => {
  const { k, a } = hazir();
  const br = kopru(k);
  br.isler.set(ID, isletmeKur(ID, "develi", "dukkan", 1, { h: a.h, o: a.o, ad: a.ad }, mulkDefteri(k).t[ID]!.ts, AY));
  const is = br.isler.get(ID)!;
  is.kasa = 20;
  // İkinci dükkân (kepenkli: rafı boş).
  const c = yetiskin(k, 3);
  assert.ok(edin(k, c, { tur: "dukkan" }, AN, "e-0000009").ok);
  mulkDefteri(k).cik.k = [];
  yansit(k, "develi.dukkan.2");
  (mulkDefteri(k).tz ??= {})["develi.dukkan.2"] = { r: [], n: 0, kk: 0 };
  assert.ok(depoTasi(k, a, ID, { yon: "koy", mal: "ekmek", adet: 30 }).ok);
  assert.ok(rafIslem(k, a, ID, { islem: "koy", mal: "ekmek", adet: 24, fiyat: 4 }).ok);
  const once = malToplam(k, "ekmek");
  tezgahDonumu(k, AY + 1);
  const md = mulkDefteri(k);
  const ozet = md.tzo as { butce: number; harcanan: number; meslekler: { meslek: string; B: number; kitlik: boolean }[] };
  // Develi kasaba: 8 meslek, oyuncu mesleği yok → hepsi kıtlık (×1,5).
  assert.equal(URETICI_MESLEKLER.length, 8);
  assert.equal(ozet.butce, 8 * Math.floor(HANE_BUTCESI.kasaba * KITLIK_BUTCE_CARPANI));
  assert.ok(ozet.harcanan <= ozet.butce);
  const gs = md.tz![ID]!.gs as { hasilat: number; satirlar: { satilan: number; neden: string; carpanlar: { F: number; Q: number; R: number; H: number } }[] };
  assert.equal(gs.hasilat, ozet.harcanan, "tek satıcı");
  assert.equal(gs.satirlar[0]!.satilan * 4, gs.hasilat);
  assert.equal(gs.satirlar[0]!.carpanlar.H, 1, "H Dilim 1'de 1");
  assert.ok(["butce", "stok", "seviyeTavani"].includes(gs.satirlar[0]!.neden));
  assert.equal(malToplam(k, "ekmek"), once - gs.satirlar[0]!.satilan, "NPC'ye satılan raftan düşer");
  assert.equal(md.tz!["develi.dukkan.2"]!.kk, 1, "kepenk sayıldı");
  assert.equal(md.tzb?.["develi.dukkan.2"], undefined, "kepenkli dükkâna kayıt yok");
  // Kaçan iki ay daha (rafı boşaltılırsa kepenk).
  tezgahDonumu(k, AY + 2);
  const kalan = md.tz![ID]!.r[0];
  if (kalan) assert.ok(rafIslem(k, a, ID, { islem: "al", satir: kalan.n, adet: partiToplam(kalan.p) }).ok, "raf boşaltılır → kepenk");
  tezgahDonumu(k, AY + 3);
  assert.deepEqual(md.tzb![ID]!.map((e) => e[0]), [AY + 1, AY + 2], "kepenkli 3. ay girdi doğurmaz");
  assert.equal(tezgahKayitlariAc(k, AN), 1);
  const kayit = md.cik.k.find((x) => x.t === "tezgah")!;
  assert.equal(kayit.i, `y:develi:tz:${ID}:${AY + 1}-${AY + 2}`);
  const kaynak = md.kaynak!;
  const kopya = structuredClone(kayit);
  br.teslim(AN + 3 * AY_MS);
  const kasa = is.kasa;
  assert.equal(is.fa, 2, "iki açık ay faaliyet");
  assert.ok(is.df.filter((x) => x[1] === "bakim").length === 2, "yalnız açık aylarda bakım");
  // Aynı kayıt yeniden teslim: tek uygulanır.
  const r = br.isle({ islem: "teslim", isletme: ID, kayitlar: [kopya] }, AN + 3 * AY_MS);
  assert.ok(r.ok);
  assert.equal(is.kasa, kasa);
  assert.equal(md.kaynak, kaynak);
});

test("eski kayıt göçü ve kepenk: dükkân/atölyede pasif gelir ve bakım yok, borç silinir; kapı yalnız handa", () => {
  const sahip = { h: "h1", o: "o1", ad: "A" };
  const d = isletmeKur("develi.dukkan.1", "develi", "dukkan", 1, sahip, 1, AY);
  delete d.tg;
  delete d.fa;
  d.borc = 9;
  d.borcAy = 2;
  d.kasa = 0;
  ayIlerlet(d, AY + 6, AN + 6 * AY_MS);
  assert.equal(d.borc, 0, "borç silindi");
  assert.equal(d.durum, "acik", "kepenkte iflas yok");
  assert.equal(d.kasa, 0, "pasif NPC geliri yok");
  assert.equal(d.fa, 0, "kepenkli ay faaliyet sayılmaz");
  const at = isletmeKur("develi.atolye.1", "develi", "atolye", 1, sahip, 1, AY);
  ayIlerlet(at, AY + 12, AN + 12 * AY_MS);
  assert.deepEqual([at.kasa, at.borc, at.durum, at.it], [0, 0, "acik", 10], "atölye kepenkli durur");
  const han = isletmeKur("develi.han.1", "develi", "han", 1, sahip, 1, AY);
  han.kasa = 100;
  ayIlerlet(han, AY + 1, AN + AY_MS);
  assert.equal(han.kasa, 100 - 6, "han bakımı sürer, pasif gelir yerine yolcu havuzu");
  const tapu = { isletme: "develi.dukkan.1", yerlesim: "develi", tur: "dukkan" as const, no: 1, ts: 1, sahip };
  const r = isletmeIsle(d, { islem: "komut", isletme: "develi.dukkan.1", tapu, baglam: { ...sahip, mk: {}, tv: 0 }, alt: "kapi", govde: { acik: false }, istekNo: "k-0000001" }, AN + 6 * AY_MS);
  assert.deepEqual(r.sonuc, { ok: false, hata: "kepenk_kendiliginden" });
});

test("yuva sayıları ve devralma: bütün yuvalar dolu + 12 ay kepenk; eski sahibe bedel, mal, kasa iade; itibar sıfır", () => {
  assert.deepEqual([MULK_YUVA.sehir.dukkan, MULK_YUVA.sehir.atolye, MULK_YUVA.kasaba.dukkan, MULK_YUVA.kasaba.atolye, MULK_YUVA.koy.dukkan, MULK_YUVA.koy.atolye], [12, 9, 6, 4, 2, 2]);
  const { k, a } = hazir();
  const br = kopru(k);
  const md = mulkDefteri(k);
  br.isler.set(ID, isletmeKur(ID, "develi", "dukkan", 1, { h: a.h, o: a.o, ad: a.ad }, md.t[ID]!.ts, AY));
  const eskiIs = br.isler.get(ID)!;
  eskiIs.kasa = 40;
  eskiIs.emanet = 5;
  eskiIs.it = 60;
  assert.ok(depoTasi(k, a, ID, { yon: "koy", mal: "civi", adet: 10 }).ok);
  const d = yetiskin(k, 9);
  assert.deepEqual(devral(k, d, ID, AN, "d-0000001"), { ok: false, hata: "devralma_kosulu" }, "boş yuva var");
  for (let i = 2; i <= MULK_YUVA.kasaba.dukkan; i++) {
    const o = yetiskin(k, 10 + i);
    assert.ok(edin(k, o, { tur: "dukkan" }, AN, `e-00000${10 + i}`).ok);
  }
  md.cik.k = [];
  md.tz![ID]!.kk = DEVRALMA_KEPENK_AY - 1;
  assert.deepEqual(devral(k, d, ID, AN, "d-0000002"), { ok: false, hata: "devralma_kosulu" }, "11 ay yetmez");
  md.tz![ID]!.kk = DEVRALMA_KEPENK_AY;
  const liste = dukkanListesi(k, d);
  assert.equal(liste.dukkanlar.find((x) => x.isletme === ID)?.devralinabilir, true);
  assert.deepEqual(devral(k, a, ID, AN, "d-0000003"), { ok: false, hata: "kendine" });
  const paA = a.pa;
  const paD = d.pa;
  const civi = a.ev?.civi ?? 0;
  const r = devral(k, d, ID, AN, "d-0000004");
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(d.pa, paD - 120, "bugünkü edinim bedeli");
  assert.equal(a.pa, paA + 120, "eski sahibe ödediği bedelin tamamı");
  assert.equal(a.ev?.civi, civi + 10, "depo eski sahibe");
  assert.equal(md.t[ID]!.s, "o9");
  br.teslim();
  const yeni = br.isler.get(ID)!;
  assert.equal(yeni.sahip.o, "o9");
  assert.equal(yeni.it, 10, "itibar sıfırlandı");
  assert.equal(yeni.kasa, 0);
  const pa = a.pa;
  br.teslim();
  assert.equal(a.pa, pa, "iade ikinci kez yapılmaz");
  assert.ok(yeni.df.some((x) => x[1] === "devral"));
  // Kasa + emanet (45) eski sahibe cüzdanla gitti (onay sırasında uygulandı).
  assert.ok(md.gir.g[`${ID}:devral:${md.t[ID]!.ts}`]?.[0] === "kabul");
});

test("iflasta depo ve raf eski sahibin envanterine döner", () => {
  const { k, a } = hazir();
  assert.ok(depoTasi(k, a, ID, { yon: "koy", mal: "ekmek", kalite: 2, adet: 6 }).ok);
  assert.ok(rafIslem(k, a, ID, { islem: "koy", mal: "ekmek", kalite: 2, adet: 4, fiyat: 9 }).ok);
  const once = malToplam(k, "ekmek");
  const md = mulkDefteri(k);
  const r = girisIsle(k, { i: "iflas-1", t: "iflas", h: "develi", a: 0, y: { isletme: ID, ts: md.t[ID]!.ts }, b: 0, d: 0, s: 0 }, AN);
  assert.equal(r.durum, "kabul");
  assert.equal(md.t[ID], undefined);
  assert.equal(kaliteAdedi(a, "ekmek", 2), 6);
  assert.equal(malToplam(k, "ekmek"), once);
});

test("fiyat önizlemesi: pay, çarpanlar, tahmini adet; raf durumu değişmez", () => {
  const { k, a } = hazir();
  assert.ok(depoTasi(k, a, ID, { yon: "koy", mal: "ekmek", adet: 20 }).ok);
  const ucuz = fiyatOnizle(k, a, ID, { mal: "ekmek", kalite: 0, fiyat: 3 });
  const pahali = fiyatOnizle(k, a, ID, { mal: "ekmek", kalite: 0, fiyat: 6 });
  assert.ok(ucuz.ok && pahali.ok);
  const u = ucuz.deger.onizleme as { tahminiAdet: number; payYuzde: number; neden: string; carpanlar: { F: number } };
  const p = pahali.deger.onizleme as { tahminiAdet: number; neden: string; npcTavan: number };
  assert.equal(u.payYuzde, 100, "rakipsiz");
  assert.ok(u.tahminiAdet > 0);
  assert.equal(p.npcTavan, 6);
  assert.deepEqual(fiyatOnizle(k, a, ID, { mal: "ekmek", fiyat: 99 }), { ok: false, hata: "fiyat_bant_disi" });
  assert.equal(mulkDefteri(k).tz![ID]!.r.length, 0, "önizleme rafa yazmaz");
});

test("han yolcu havuzu: oyuncu hanları toplamı ≤ Y, han başına tavan; ucuz ve kaliteli han çeker; NPC payı yanar", () => {
  const h = (no: number, fc: number, kalite = 0, itibar = 10, seviye = 0) => ({ no, isletme: `demirhan.han.${no}`, fc, kalite, itibar, seviye });
  const r = yolcuCoz("sehir", [{ no: 1, isletme: null, fc: 100, kalite: 0, itibar: 0, seviye: 0 }, h(2, 50, 2, 40, 4), h(3, 100), h(4, 150), h(5, 100, 0, 10, 1)]);
  assert.equal(r.Y, YOLCU_BUTCESI.sehir);
  assert.ok(r.dagitilan <= r.Y);
  for (const x of r.hanlar) assert.ok(x.tutar <= x.tavan);
  const p = new Map(r.hanlar.map((x) => [x.no, x]));
  assert.ok(p.get(2)!.pay > p.get(3)!.pay && p.get(3)!.pay > p.get(4)!.pay);
  assert.ok(p.get(1)!.hak > 0, "NPC hanı pay alır (yanar)");
  // Yerleşim dönümünde: çoklu handa toplam NPC han geliri ≤ Y.
  const k = testKasabasi("demirhan", AY);
  const md = mulkDefteri(k);
  for (let no = 2; no <= 5; no++) {
    const o = yetiskin(k, no);
    assert.ok(meslekSec(o, "hanci", AY).ok);
    assert.ok(edin(k, o, { tur: "han", no }, AN, `h-000000${no}`).ok);
    yansit(k, `demirhan.han.${no}`, { fc: 60 + no * 10, seviye: 4, it: 80 });
  }
  md.cik.k = [];
  tezgahDonumu(k, AY + 1);
  const toplam = Object.entries(md.tzb ?? {}).filter(([id]) => id.includes(".han.")).reduce((t, [, l]) => t + l.reduce((s, e) => s + e[1], 0), 0);
  assert.ok(toplam > 0 && toplam <= YOLCU_BUTCESI.sehir, `toplam ${toplam}`);
  assert.equal((md.hy as { ay: number }).ay, AY + 1);
});

test("§5.4 (4): iki hesap arası karşılıklı döngü gelir, itibar ve seviye puanı üretmez; akçe basmaz", () => {
  const { k, a, b } = hazir();
  const br = kopru(k);
  const ID2 = "develi.dukkan.2";
  assert.ok(edin(k, b, { tur: "dukkan" }, AN, "e-0000010").ok);
  mulkDefteri(k).cik.k = [];
  yansit(k, ID2);
  const isA = isletmeKur(ID, "develi", "dukkan", 1, { h: a.h, o: a.o, ad: a.ad }, mulkDefteri(k).t[ID]!.ts, AY);
  const isB = isletmeKur(ID2, "develi", "dukkan", 2, { h: b.h, o: b.o, ad: b.ad }, mulkDefteri(k).t[ID2]!.ts, AY);
  br.isler.set(ID, isA);
  br.isler.set(ID2, isB);
  kaliteliEkle(b, "civi", [[0, 10]]);
  assert.ok(depoTasi(k, a, ID, { yon: "koy", mal: "ekmek", adet: 10 }).ok);
  assert.ok(rafIslem(k, a, ID, { islem: "koy", mal: "ekmek", adet: 10, fiyat: 6 }).ok);
  assert.ok(depoTasi(k, b, ID2, { yon: "koy", mal: "civi", adet: 10 }).ok);
  assert.ok(rafIslem(k, b, ID2, { islem: "koy", mal: "civi", adet: 10, fiyat: 4 }).ok);
  const once = a.pa + b.pa;
  // Dört ay dönüşümlü: B→A, A→B, B→A, A→B (her bacak 2 adet).
  for (let i = 0; i < 4; i++) {
    const r = i % 2 === 0 ? satinAl(k, b, ID, { satir: 1, adet: 2 }, AN, `s-30000${i}`, 4) : satinAl(k, a, ID2, { satir: 1, adet: 2 }, AN, `s-30000${i}`, 4);
    assert.ok(r.ok, JSON.stringify(r));
    br.teslim(AN + i * AY_MS);
    k.ay++;
  }
  // Yalnız ilk bacak (yabancıdan ilk ödeme) adil değeriyle (2 × 4 = 8) puana girer; sonraki üç bacak bayraklı: 0.
  assert.equal(isA.gelir + isB.gelir, 8, "döngü gelir puanı (seviye) üretmez");
  assert.ok(isA.iz.m.some((x) => x[2] === "karsilikli") && isB.iz.m.some((x) => x[2] === "karsilikli"), "bayraklı bacaklar izleme kaydında");
  assert.equal(isB.iz.s.length, 0, "son ay (bayraklı) müşteri sayımına girmez: itibar artmaz");
  const kasaya = isA.kasa + isB.kasa;
  const vergi = (mulkDefteri(k).vergiGiden ?? []).reduce((t, x) => t + x.tutar, 0);
  assert.equal(a.pa + b.pa + kasaya + vergi, once, "döngü akçe basmaz (vergi birikimi oyunculardan çıkar)");
});

test("iade bekleyen: devralmada ölmüş sahibin bedeli, malı ve kasası yanmaz; vârise geçer; yerleşimde yoksa hazineye", () => {
  const { k, a } = hazir();
  const md = mulkDefteri(k);
  assert.ok(depoTasi(k, a, ID, { yon: "koy", mal: "civi", adet: 4 }).ok);
  for (let i = 2; i <= MULK_YUVA.kasaba.dukkan; i++) assert.ok(edin(k, yetiskin(k, 10 + i), { tur: "dukkan" }, AN, `e-00000${10 + i}`).ok);
  md.cik.k = [];
  md.tz![ID]!.kk = DEVRALMA_KEPENK_AY;
  // Sahip öldü (devir henüz yapılmadı): devralma yapılabilir, iadeler ölünün kimliğiyle bekler.
  a.hd = { ...(a.hd ?? {}), ol: AY } as never;
  const paA = a.pa;
  const d = yetiskin(k, 9);
  const r = devral(k, d, ID, AN, "d-0000009");
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(a.pa, paA, "ölünün cüzdanına yazılmaz");
  assert.equal(md.ia?.o1?.pa, 120, "bedel bekliyor");
  assert.equal(md.ia?.o1?.ev?.civi, 4, "mal bekliyor");
  assert.ok(md.ob?.some((o) => o.k === "olay.tezgah.devralindi" && o.g === "o1"));
  // İşletmeden gelen kasa iadesi de reddedilmez, bekleyene yazılır.
  const g = girisIsle(k, { i: "dv-kasa-1", t: "cuzdana", h: "develi", a: 45, y: { isletme: ID, o: "o1", h: a.h, tutar: 45, neden: "devral" }, b: 0, d: 0, s: 0 }, AN);
  assert.equal(g.durum, "kabul");
  assert.equal(md.ia?.o1?.pa, 165);
  // Devir: vâris belli → ay dönümünde vârise teslim (mal + akçe), kayıt silinir.
  const varis = yetiskin(k, 30);
  (a.hd as { dv?: string }).dv = varis.o;
  const paV = varis.pa;
  tezgahDonumu(k, AY + 1);
  assert.equal(varis.pa, paV + 165);
  assert.equal(varis.ev?.civi, 4);
  assert.equal(md.ia, undefined);
  // Yerleşimde kaydı olmayan (göçle ayrılmış) sahibin bekleyeni hazineye gider, yakılmaz.
  (md.ia ??= {}).o77 = { pa: 30, ev: { civi: 2 } };
  const vergi0 = (md.vergiGiden ?? []).reduce((t, x) => t + x.tutar, 0);
  tezgahDonumu(k, AY + 2);
  assert.equal((md.vergiGiden ?? []).reduce((t, x) => t + x.tutar, 0), vergi0 + 30, "akçe hazineye");
  assert.ok(md.vergiGiden!.some((x) => x.anahtar === `y:develi:iade:o77:${AY + 2}`));
  assert.equal(k.st?.civi !== undefined, true, "mal kasaba stoğuna");
  assert.equal(md.ia, undefined);
});

test("ay dönümü olayları (ayda bir, yalnız sahibe) ve han yolcu kartı (yalnız sahip/çalışan görür)", () => {
  const { k, a } = hazir();
  assert.ok(depoTasi(k, a, ID, { yon: "koy", mal: "ekmek", adet: 3 }).ok);
  assert.ok(rafIslem(k, a, ID, { islem: "koy", mal: "ekmek", adet: 3, fiyat: 4 }).ok);
  const olaylar = tezgahDonumu(k, AY + 1);
  const gs = olaylar.find((o) => o.k === "olay.tezgah.gunSonu")!;
  assert.deepEqual([gs.g, gs.p.isletme, gs.p.adet, gs.p.hasilat, gs.p.mal], ["o1", ID, 3, 12, "ekmek"]);
  assert.ok(olaylar.some((o) => o.k === "olay.tezgah.kepenkIndi" && o.g === "o1"), "raf boşaldı → kepenk olayı");
  assert.equal(tezgahDonumu(k, AY + 2).filter((o) => o.k.startsWith("olay.tezgah")).length, 0, "kepenkli ayda yeni olay yok");
  // Han: yolcu payı olayı ve kartı.
  const s = testKasabasi("demirhan", AY);
  const sahip = yetiskin(s, 2);
  const yabanci = yetiskin(s, 3);
  const calisan = yetiskin(s, 4);
  assert.ok(meslekSec(sahip, "hanci", AY).ok);
  assert.ok(edin(s, sahip, { tur: "han", no: 2 }, AN, "h-0000002").ok);
  mulkDefteri(s).cik.k = [];
  yansit(s, "demirhan.han.2", { py: [["o4", ["musteri"]]] });
  const ho = tezgahDonumu(s, AY + 1).filter((o) => o.k === "olay.han.yolcuPayi");
  assert.equal(ho.length, 1);
  assert.equal(ho[0]!.g, "o2");
  const kart = yolcuKarti(s, "demirhan.han.2", sahip.o)!;
  assert.equal(kart.ay, AY + 1);
  assert.equal(kart.tutar, ho[0]!.p.tutar);
  assert.deepEqual(Object.keys(kart.carpan), ["F", "K", "R", "H"]);
  assert.deepEqual(yolcuKarti(s, "demirhan.han.2", calisan.o), kart, "çalışan görür");
  assert.equal(yolcuKarti(s, "demirhan.han.2", yabanci.o), undefined, "rakip görmez");
});
