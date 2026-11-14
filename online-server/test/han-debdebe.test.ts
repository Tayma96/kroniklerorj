// H11 Debdebe yüzeyleri handa: sohbet balonu ve masa süsü yalnız sahiplikten ve kuşanılmışsa; yalnız görünüş (plaka,
// ileti balonu); oyun mantığı okumaz.
import test from "node:test";
import assert from "node:assert/strict";
import { bosCosmetic, iadeUygula, kusan, satinAlimUygula } from "../src/debdebe/cosmetic.ts";
import type { UrunId } from "../src/debdebe/katalog.ts";
import { plakaSusleri } from "../src/debdebe/hesap.ts";
import type { Depo } from "../src/depo.ts";
import { bellekDepo } from "../src/depo.ts";
import { masaBileti, type HanHesapBaglami } from "../src/han/hesap-kopru.ts";
import { baglan, iletiIsle } from "../src/han/masa.ts";
import { basarili, hata } from "../src/tipler.ts";
import { bilet, sahteMasa, sahteSoket } from "./han-yardimci.ts";

const T0 = Date.UTC(2026, 10, 10, 12);
const b = (islem: string, urun: UrunId) => ({ magaza: "google" as const, islemKimligi: islem, urunKimligi: `debdebe_${urun}`, durum: "odendi" as const, zaman: T0 });

test("H11 plaka süsleri yalnız sahip olunan ve kuşanılan balon/masa süsünden; iade edilince düşer", async () => {
  const c = bosCosmetic();
  const depo = { al: async () => c } as unknown as Depo;
  assert.deepEqual(await plakaSusleri(depo, T0), {});
  assert.equal(satinAlimUygula(c, "balon_ipek", b("google:balon", "balon_ipek"), T0).ok, true);
  assert.deepEqual(await plakaSusleri(depo, T0), {}, "kuşanılmamış ürün görünmez");
  assert.equal(kusan(c, "balon", "balon_ipek", 0, T0).ok, true);
  assert.equal(satinAlimUygula(c, "masa_mum", b("google:mum", "masa_mum"), T0).ok, true);
  assert.equal(kusan(c, "masaSusu", "masa_mum", 0, T0).ok, true);
  assert.deepEqual(await plakaSusleri(depo, T0), { balon: "balon_ipek", masaSusu: "masa_mum" });
  iadeUygula(c, "google:balon", T0);
  assert.deepEqual(await plakaSusleri(depo, T0), { masaSusu: "masa_mum" });
});

test("H11 bilet ve masa: balon ve masa süsü plakada görünür, sohbet iletisine balon eklenir; kozmetik hatası bağlantıyı engellemez", async () => {
  const depo = bellekDepo();
  await depo.koy({ profil: { hesapId: "ali", ad: "Ali", cinsiyet: "erkek", beylik: "demirhan", yerlesim: "kizilca", dogumAyi: 0, olusturma: 0 } });
  const hb: HanHesapBaglami = {
    depo,
    hesapId: "ali",
    simdi: T0,
    yaptirim: undefined,
    masaCagir: async () => basarili({}),
    ikramOde: async () => hata("gecersiz_istek"),
    plakaSusleri: async () => ({ cerceve: "cerceve_oymali", balon: "balon_ipek", masaSusu: "masa_mum" }),
  };
  const r = await masaBileti(hb, 1);
  assert.ok(r.ok);
  assert.deepEqual(r.deger.plaka, { hesap: "ali", ad: "Ali", cerceve: "cerceve_oymali", balon: "balon_ipek", masaSusu: "masa_mum" });
  const bozuk = await masaBileti({ ...hb, plakaSusleri: async () => { throw new Error("kozmetik"); } }, 1);
  assert.ok(bozuk.ok);
  assert.deepEqual(bozuk.deger.plaka, { hesap: "ali", ad: "Ali" });

  const m = sahteMasa();
  const a = sahteSoket();
  baglan(m.baglam(), a, { ...bilet("ali", "Ali"), plaka: r.deger.plaka });
  m.soketler.push(a);
  const v = sahteSoket();
  baglan(m.baglam(), v, bilet("veli", "Veli"));
  m.soketler.push(v);
  await iletiIsle(m.baglam(), a, JSON.stringify({ t: "otur" }));
  assert.deepEqual(v.son("durum")?.masa.koltuklar[0], { hesap: "ali", ad: "Ali", cerceve: "cerceve_oymali", balon: "balon_ipek", masaSusu: "masa_mum" });
  await iletiIsle(m.baglam(), a, JSON.stringify({ t: "yaz", metin: "selam" }));
  assert.equal(v.son("ileti")?.balon, "balon_ipek");
});
