import test from "node:test";
import assert from "node:assert/strict";
import { bellekDepo, type BellekDepo } from "../src/depo.ts";
import { yerlesimBul } from "../src/dunya-veri.ts";
import {
  DAVET_ALFABESI,
  davetCoz,
  davetKoduDuzenle,
  davetKoduUret,
  davetOlustur,
  dunyaOzeti,
  hizKontrol,
  kayitOl,
  profilGetir,
  profilOlustur,
  type HizDurumu,
  type Rastgele,
} from "../src/mantik.ts";
import { oyunAyi } from "../src/saat.ts";
import type { KayitIstegi, Profil, Sonuc } from "../src/tipler.ts";

const SIMDI = Date.UTC(2026, 10, 10, 12, 0, 0);
const rastgele: Rastgele = (n) => crypto.getRandomValues(new Uint8Array(n));

function dunyaKur() {
  const dunya = bellekDepo();
  let cagri = 0;
  const kayit = (istek: KayitIstegi): Promise<Sonuc<Profil>> => {
    cagri++;
    return kayitOl(dunya, structuredClone(istek), SIMDI);
  };
  return { dunya, kayit, cagri: () => cagri };
}

const govde = (ek: Record<string, unknown> = {}) => ({
  ad: "Ayşe",
  cinsiyet: "kadın",
  yerlesim: "kizilca",
  istekNo: "istek-0001",
  ...ek,
});

async function oyuncu(dunya: BellekDepo, hesapId: string, ek: Record<string, unknown>) {
  return kayitOl(dunya, { hesapId, ad: "Oyuncu", cinsiyet: "erkek", yerlesim: "kizilca", ...ek } as KayitIstegi, SIMDI);
}

test("profil: 12 yaşında doğar; aynı istekNo aynı sonucu döndürür, nüfus bir kez artar", async () => {
  const { dunya, kayit, cagri } = dunyaKur();
  const hesap = bellekDepo();
  const ilk = await profilOlustur(hesap, "h1", govde(), kayit);
  assert.ok(ilk.ok);
  assert.deepEqual(ilk.deger, {
    hesapId: "h1",
    ad: "Ayşe",
    cinsiyet: "kadın",
    beylik: "demirhan",
    yerlesim: "kizilca",
    dogumAyi: oyunAyi(SIMDI) - 144,
    olusturma: SIMDI,
  });
  const tekrar = await profilOlustur(hesap, "h1", govde(), kayit);
  assert.deepEqual(tekrar, ilk);
  assert.equal(cagri(), 1);
  assert.equal(dunya.veri.get("nufus:kizilca"), 1);
  assert.deepEqual(await profilGetir(hesap), ilk);

  // Hesap başına tek profil.
  assert.deepEqual(await profilOlustur(hesap, "h1", govde({ istekNo: "istek-0002" }), kayit), {
    ok: false,
    hata: "profil_var",
  });
});

test("yarıda kalan istek: dünya kaydı tekrar güvenli, iki kez sayılmaz", async () => {
  const { dunya, kayit } = dunyaKur();
  // Dünya kaydı oldu ama hesap tarafı yazamadan koptu: yeni boş hesap deposuyla aynı istek tekrarlanır.
  const a = await profilOlustur(bellekDepo(), "h1", govde(), kayit);
  const b = await profilOlustur(bellekDepo(), "h1", govde({ ad: "Başka Ad" }), kayit);
  assert.deepEqual(b, a);
  assert.equal(dunya.veri.get("nufus:kizilca"), 1);
});

test("profil girdisi doğrulama", async () => {
  const { kayit, cagri } = dunyaKur();
  const dene = async (ek: Record<string, unknown>) => {
    const s = await profilOlustur(bellekDepo(), "h1", govde(ek), kayit);
    return s.ok ? "ok" : s.hata;
  };
  assert.equal(await dene({ istekNo: "kisa" }), "istekno_gecersiz");
  assert.equal(await dene({ istekNo: undefined }), "istekno_gecersiz");
  assert.equal(await dene({ cinsiyet: "diger" }), "cinsiyet_gecersiz");
  assert.equal(await dene({ ad: "A" }), "ad_uzunluk");
  assert.equal(await dene({ ad: "Admin" }), "ad_yasak");
  assert.equal(await dene({ yerlesim: "atlantis" }), "yerlesim_gecersiz");
  assert.equal(await dene({ yerlesim: undefined }), "yerlesim_gecersiz");
  assert.equal(await dene({ davet: "0O1IL!" }), "davet_gecersiz");
  assert.equal(cagri(), 0);
  assert.equal(await dene({ davet: "ABCDEF" }), "davet_yok");
});

test("ad benzersizliği Türkçe büyük/küçük harf duyarsız", async () => {
  const { dunya, kayit } = dunyaKur();
  assert.ok((await profilOlustur(bellekDepo(), "h1", govde({ ad: "İlker" }), kayit)).ok);
  const ikinci = await profilOlustur(bellekDepo(), "h2", govde({ ad: "  ilker " }), kayit);
  assert.deepEqual(ikinci, { ok: false, hata: "ad_alinmis" });
  assert.ok((await profilOlustur(bellekDepo(), "h3", govde({ ad: "Ilker" }), kayit)).ok); // ı ≠ i
  assert.equal(dunya.veri.get("nufus:kizilca"), 2);
});

test("kapasite: dolu yerleşim davetsiz reddedilir, davetle esnek", async () => {
  const dunya = bellekDepo();
  const kapasite = yerlesimBul("kizilca")!.evKapasite;
  assert.equal(kapasite, 25);
  assert.ok((await oyuncu(dunya, "davetci", { ad: "Davetçi" })).ok);
  const kod = await davetOlustur(dunya, "davetci", rastgele);
  assert.ok(kod.ok);
  dunya.veri.set("nufus:kizilca", kapasite);

  assert.deepEqual(await oyuncu(dunya, "h2", { ad: "Gelen" }), { ok: false, hata: "yerlesim_dolu" });
  const davetle = await oyuncu(dunya, "h2", { ad: "Gelen", yerlesim: "misis", davet: kod.deger.kod.toLowerCase() });
  assert.ok(davetle.ok);
  assert.equal(davetle.deger.yerlesim, "kizilca");
  assert.equal(davetle.deger.beylik, "demirhan");
  assert.equal(davetle.deger.davetEden, "Davetçi");
  assert.equal(dunya.veri.get("nufus:kizilca"), kapasite + 1);
  // Başka yerleşim etkilenmez.
  assert.ok((await oyuncu(dunya, "h3", { ad: "Üçüncü", yerlesim: "misis" })).ok);
});

test("davet kodu: oluştur, aynısını döndür, çöz", async () => {
  const dunya = bellekDepo();
  assert.deepEqual(await davetOlustur(dunya, "h1", rastgele), { ok: false, hata: "profil_yok" });
  assert.ok((await oyuncu(dunya, "h1", { ad: "Kemal", yerlesim: "konuralp" })).ok);
  const a = await davetOlustur(dunya, "h1", rastgele);
  const b = await davetOlustur(dunya, "h1", rastgele);
  assert.ok(a.ok && b.ok);
  assert.equal(a.deger.kod, b.deger.kod);
  assert.match(a.deger.kod, new RegExp(`^[${DAVET_ALFABESI}]{6}$`));
  const kod = a.deger.kod;
  const ayrik = `${kod.slice(0, 3).toLowerCase()}-${kod.slice(3)}`;
  assert.deepEqual(await davetCoz(dunya, ayrik), {
    ok: true,
    deger: { kod, yerlesim: "konuralp", beylik: "yenisehir", davetEden: "Kemal" },
  });
  assert.deepEqual(await davetCoz(dunya, "222222"), { ok: false, hata: "davet_yok" });
  assert.deepEqual(await davetCoz(dunya, "OOOOOO"), { ok: false, hata: "davet_gecersiz" });
  assert.deepEqual(await davetCoz(dunya, 123), { ok: false, hata: "davet_gecersiz" });
});

test("davet kodu üretimi: alfabe, uzunluk, çakışmada vazgeçer", async () => {
  for (let i = 0; i < 200; i++) assert.match(davetKoduUret(rastgele), /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
  assert.equal(davetKoduUret(() => new Uint8Array(16).fill(255).fill(0, 8)), "222222");
  assert.equal(davetKoduDuzenle(" ab cd-ef "), "ABCDEF");
  const dunya = bellekDepo();
  const sabit: Rastgele = (n) => new Uint8Array(n).fill(1);
  assert.ok((await oyuncu(dunya, "h1", { ad: "Bir" })).ok);
  assert.ok((await oyuncu(dunya, "h2", { ad: "İki" })).ok);
  assert.ok((await davetOlustur(dunya, "h1", sabit)).ok);
  assert.deepEqual(await davetOlustur(dunya, "h2", sabit), { ok: false, hata: "sunucu_hatasi" });
});

test("hız sınırı: dakikada 30", () => {
  let durum: HizDurumu | undefined;
  const t0 = Date.UTC(2026, 10, 10, 12, 0, 0);
  for (let i = 1; i <= 30; i++) {
    const s = hizKontrol(durum, t0 + i * 100);
    assert.equal(s.izin, true);
    durum = s.durum;
  }
  const fazla = hizKontrol(durum, t0 + 5_000);
  assert.equal(fazla.izin, false);
  assert.equal(hizKontrol(fazla.durum, t0 + 60_000).izin, true);
});

test("dünya özeti: saat ve doluluk", async () => {
  const dunya = bellekDepo();
  assert.ok((await oyuncu(dunya, "h1", { ad: "Bir", yerlesim: "misis" })).ok);
  const o = await dunyaOzeti(dunya, SIMDI);
  assert.equal(o.beylikler.length, 7);
  assert.equal(o.saat.oyunAyi, oyunAyi(SIMDI));
  assert.ok(o.saat.sonrakiDonum > SIMDI);
  const misis = o.beylikler.flatMap((b) => b.yerlesimler).find((y) => y.id === "misis");
  assert.deepEqual(misis, { id: "misis", ad: "Misis", tur: "sehir", evKapasite: 150, npc: 400, nufus: 1 });
});
