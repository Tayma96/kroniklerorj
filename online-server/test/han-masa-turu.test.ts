// H9 masa türleri (saf): masa başı açık/özel seçer; özel masada yalnız davetli oturur ve sıradan geçer; kilitli ile
// ilişki; meclis/tüccar seçilemez; masa boşalınca tür ve davetler sıfırlanır.
import test from "node:test";
import assert from "node:assert/strict";
import { DAVET_EN_COK, KOLTUK_SAYISI } from "../src/han/kurallar.ts";
import { baglan, iletiIsle } from "../src/han/masa.ts";
import { HATA_DURUMU } from "../src/tipler.ts";
import { bilet, sahteMasa, sahteSoket, type SahteSoket } from "./han-yardimci.ts";

type Masa = ReturnType<typeof sahteMasa>;
function gir(m: Masa, hesap: string): SahteSoket {
  const s = sahteSoket();
  baglan(m.baglam(), s, bilet(hesap, hesap.toUpperCase()));
  m.soketler.push(s);
  return s;
}
const yolla = (m: Masa, s: SahteSoket, ileti: unknown) => iletiIsle(m.baglam(), s, JSON.stringify(ileti));
async function oturt(m: Masa, ...ss: SahteSoket[]) {
  for (const s of ss) {
    await yolla(m, s, { t: "otur" });
    m.ileri(1);
  }
}

test("H9 özel masa: yalnız masa başı türü seçer; davetsiz oturamaz; davetli oturur; meclis/tüccar seçilemez", async () => {
  const m = sahteMasa();
  const a = gir(m, "ali");
  const v = gir(m, "veli");
  await oturt(m, a);
  await yolla(m, v, { t: "ayar", tur: "ozel" });
  assert.equal(v.son("hata")?.hata, "yetki_yok");
  for (const tur of ["meclis", "tuccar", "baska", 3]) {
    await yolla(m, a, { t: "ayar", tur });
    assert.equal(a.son("hata")?.hata, "gecersiz_istek", String(tur));
  }
  await yolla(m, a, { t: "ayar", tur: "ozel" });
  assert.equal(v.son("durum")?.masa.ayar.tur, "ozel");
  await yolla(m, v, { t: "otur" });
  assert.equal(v.son("hata")?.hata, "davet_gerekli");
  assert.equal(HATA_DURUMU.davet_gerekli, 403);
  assert.equal(v.ek()?.s, null, "davetsiz sıraya da giremez");
  await yolla(m, v, { t: "davet", hedef: "ali" });
  assert.equal(v.son("hata")?.hata, "yetki_yok", "davet yalnız masa başından");
  await yolla(m, a, { t: "davet", hedef: "ali" });
  assert.equal(a.son("hata")?.hata, "kendi_hedef");
  await yolla(m, a, { t: "davet", hedef: "veli" });
  assert.deepEqual(v.son("durum")?.masa.ayar.davet, ["veli"]);
  await yolla(m, v, { t: "otur" });
  assert.equal(v.ek()?.k, 1, "davetli oturur");
  // Kilit özel masada da herkese kapalıdır (davetliye de).
  const c = gir(m, "can");
  await yolla(m, a, { t: "davet", hedef: "can" });
  await yolla(m, a, { t: "ayar", kilitli: true });
  await yolla(m, c, { t: "otur" });
  assert.equal(c.son("hata")?.hata, "masa_kilitli");
  await yolla(m, a, { t: "ayar", kilitli: false });
  await yolla(m, c, { t: "otur" });
  assert.equal(c.ek()?.k, 2);
  // Davet geri alınır.
  await yolla(m, a, { t: "davet", hedef: "can", kaldir: true });
  assert.deepEqual(m.ayar.davet, ["veli"]);
});

test("H9 özel masada sıra: davetsizler beklemeye devam eder, davetli öne geçer; açığa dönünce sıra ilerler", async () => {
  const m = sahteMasa();
  const otur: SahteSoket[] = [];
  for (let i = 0; i < KOLTUK_SAYISI; i++) otur.push(gir(m, `o${i}`));
  await oturt(m, ...otur);
  const once = gir(m, "once");
  await oturt(m, once);
  const sonra = gir(m, "sonra");
  await oturt(m, sonra);
  await yolla(m, otur[0]!, { t: "ayar", tur: "ozel" });
  await yolla(m, otur[0]!, { t: "davet", hedef: "sonra" });
  await yolla(m, otur[4]!, { t: "kalk" });
  assert.equal(sonra.ek()?.k, 4, "davetli sıradaki davetsizin önüne geçer");
  assert.equal(once.ek()?.k, null);
  await yolla(m, otur[5]!, { t: "kalk" });
  assert.equal(once.ek()?.k, null, "özel masada davetsiz oturmaz");
  await yolla(m, otur[0]!, { t: "ayar", tur: "acik" });
  assert.equal(once.ek()?.k, 5, "açığa dönünce boş koltuğa geçer");
});

test("H9 davet tavanı; masa boşalınca tür açığa döner ve davetler silinir", async () => {
  const m = sahteMasa();
  const a = gir(m, "ali");
  await oturt(m, a);
  await yolla(m, a, { t: "ayar", tur: "ozel" });
  for (let i = 0; i < DAVET_EN_COK; i++) await yolla(m, a, { t: "davet", hedef: `d${i}` });
  m.ileri(20_000);
  await yolla(m, a, { t: "davet", hedef: "fazla" });
  assert.equal(a.son("hata")?.hata, "tavan_doldu");
  await yolla(m, a, { t: "kalk" });
  assert.equal(m.ayar.tur, "acik");
  assert.equal(m.ayar.davet, undefined);
});
