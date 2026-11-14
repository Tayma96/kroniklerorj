// GDD §10 N-10: ateşkes ön talimatı. Çevrimdışı yetkilinin önceden verdiği karar teklife uygulanır;
// sessizlik kabul sayılmaz, yetkisi olmayan talimat yazamaz.
import test from "node:test";
import assert from "node:assert/strict";
import { bolgeKur } from "../src/siyaset/bolge.ts";
import { darbeBarisTeklifEt, darbeBarisYanit, darbeGorunumu, darbeTalimatYaz } from "../src/siyaset/darbe.ts";
import type { BolgeDurumu, DarbeDestegi, SiyasiKimlik } from "../src/siyaset/tipler.ts";

const kimlik = (o: string): SiyasiKimlik => ({ kisi: `develi/${o}`, hesap: `h-${o}`, ad: o, yerlesim: "develi", bolge: "demirhan", yas: 30, e: 0, olu: false, nam: 50, teveccuh: 0, haklar: [] });
const savunma = (k: SiyasiKimlik): DarbeDestegi => ({ kisi: k.kisi, hesap: k.hesap, ad: k.ad, koltuk: "ahiBasi:x", rol: "ahiBasi", kume: [`h:${k.hesap}`], ay: 0 });

function kur(savunanlar: SiyasiKimlik[]): { d: BolgeDurumu; lider: SiyasiKimlik } {
  const d = bolgeKur("demirhan", 5);
  const lider = kimlik("lider");
  d.darbe = {
    v: 1, id: "demirhan:darbe:t", durum: "catışma", baslatanKisi: lider.kisi, baslatanHesap: lider.hesap,
    acilisAy: 0, sogumaSonAy: 0, destekler: [], savunma: savunanlar.map(savunma),
    garnizonSadakati: 0, yatirilan: 0, ilanAy: d.ay, cozumAy: d.ay + 2, izler: [],
  };
  return { d, lider };
}

test("talimat: yalnız yanıt yetkisi olan yazar, değer denetlenir, 'yok' siler", () => {
  const a = kimlik("a");
  const { d, lider } = kur([a]);
  assert.equal(darbeTalimatYaz(d, kimlik("yabanci"), "kabul", d.ay), "taraf_degil");
  assert.equal(darbeTalimatYaz(d, a, "belki", d.ay), "deger_sinir_disi");
  assert.equal(darbeTalimatYaz(d, a, "ret", d.ay), null);
  assert.equal(darbeGorunumu(d, a)!.benimTalimat, "ret");
  assert.equal(darbeTalimatYaz(d, a, "yok", d.ay), null);
  assert.equal(d.darbe!.talimat, undefined);
  assert.equal(darbeTalimatYaz(d, lider, "kabul", d.ay + 2), "darbe_kapali", "çözüm ayından sonra yazılmaz");
});

test("talimat: önceden 'kabul' diyen savunan yokken gelen teklif ateşkese döner", () => {
  const a = kimlik("a");
  const b = kimlik("b");
  const { d, lider } = kur([a, b]);
  assert.equal(darbeTalimatYaz(d, b, "kabul", d.ay), null);
  assert.equal(darbeBarisTeklifEt(d, lider, "teklif-0001", d.ay), null);
  assert.equal(d.darbe!.durum, "ateskes");
  assert.deepEqual([d.darbe!.barisTeklifi!.durum, d.darbe!.barisTeklifi!.yanitlayan, d.darbe!.barisTeklifi!.talimatla], ["kabul", b.kisi, true]);
});

test("talimat: talimatsız bir yetkili varsa 'ret' talimatı teklifi düşürmez; hepsi 'ret' ise reddedilir", () => {
  const a = kimlik("a");
  const b = kimlik("b");
  const { d, lider } = kur([a, b]);
  darbeTalimatYaz(d, a, "ret", d.ay);
  assert.equal(darbeBarisTeklifEt(d, lider, "teklif-0002", d.ay), null);
  assert.equal(d.darbe!.barisTeklifi!.durum, "bekliyor", "sessizlik ne kabul ne ret");
  assert.equal(darbeTalimatYaz(d, b, "ret", d.ay), null);
  assert.equal(d.darbe!.barisTeklifi!.durum, "ret");
  assert.equal(d.darbe!.durum, "catışma");
  assert.equal(darbeBarisYanit(d, b, "teklif-0002", "kabul", d.ay), "hedef_uygun_degil", "yanıtlanmış teklif yeniden açılmaz");
});

test("talimat: saldıran liderin talimatı savunanın teklifine uygulanır; kendi teklifine uygulanmaz", () => {
  const a = kimlik("a");
  const { d, lider } = kur([a]);
  darbeTalimatYaz(d, lider, "kabul", d.ay);
  assert.equal(darbeBarisTeklifEt(d, lider, "teklif-0003", d.ay), null);
  assert.equal(d.darbe!.barisTeklifi!.durum, "bekliyor", "kendi teklifine kendi talimatı yanıt değildir");
  d.darbe!.barisTeklifi = undefined;
  assert.equal(darbeBarisTeklifEt(d, a, "teklif-0004", d.ay), null);
  assert.equal(d.darbe!.durum, "ateskes");
});
