// Diplomasi outbox: alıcının kalıcı reddettiği ileti kaynağı "bekliyor" durumunda kilitli bırakmaz.
import test from "node:test";
import assert from "node:assert/strict";
import { bolgeKur } from "../src/siyaset/bolge.ts";
import { diplomasiReddedildi } from "../src/siyaset/diplomasi-red.ts";
import type { BolgeDurumu } from "../src/siyaset/tipler.ts";

function devletli(): BolgeDurumu {
  const d = bolgeKur("demirhan", 10);
  d.ay = 12;
  d.devlet = {
    v: 1, ad: "Demirhan Beyliği", kurulusAy: 5, beyKisi: "develi/o1", beyHesap: "hesap-kaynak", beyAd: "Kaynak Bey",
    vergiOrani: 0, divan: [], mogol: "diren", sultan: "bagimsiz", taninma: "taninmadi", yeminler: {},
  };
  return d;
}

test("reddedilen tanınma isteği kaynağı kilitli bırakmaz ve yeniden denenebilir", () => {
  const d = devletli();
  const s = d.devlet!;
  s.taninma = "talepEdildi";
  s.taninmaTalepAy = 11;
  s.taninmaHedef = "aksehir";
  s.taninmaIstekId = "demirhan:1:11";
  diplomasiReddedildi(d, { tur: "taninmaIstek", hedef: "aksehir", istekId: "demirhan:1:11", ay: 11, ad: "Demirhan" });
  assert.equal(s.taninma, "taninmadi", "bekleyen talep kapanır; yeni talep açılabilir");
  assert.equal(s.taninmaSonuc, "ret");
  assert.equal(s.taninmaCevap?.karar, "ret");
  assert.equal(s.taninmaCevap?.istekId, "demirhan:1:11");
  assert.equal(s.taninmaTalepAy, undefined);
});

test("başka istek kimliğine ait ret, güncel bekleyen tanınma talebine dokunmaz", () => {
  const d = devletli();
  const s = d.devlet!;
  s.taninma = "talepEdildi";
  s.taninmaTalepAy = 12;
  s.taninmaHedef = "aksehir";
  s.taninmaIstekId = "demirhan:2:12";
  diplomasiReddedildi(d, { tur: "taninmaIstek", hedef: "aksehir", istekId: "demirhan:1:11", ay: 11, ad: "Demirhan" });
  assert.equal(s.taninma, "talepEdildi");
  assert.equal(s.taninmaCevap, undefined);
});

test("reddedilen ittifak isteği bekleyen talebi kapatır", () => {
  const d = devletli();
  const s = d.devlet!;
  s.ittifakTalep = { hedef: "aksehir", istekId: "demirhan:3:12:ittifak", ay: 12 };
  diplomasiReddedildi(d, { tur: "ittifakIstek", hedef: "aksehir", istekId: "demirhan:3:12:ittifak", ay: 12, ad: "Demirhan" });
  assert.equal(s.ittifakTalep, undefined);
  assert.equal(s.ittifakYanits?.aksehir?.karar, "ret");
  assert.equal(s.ittifaklar?.aksehir?.durum, "ret");
});

test("kaynağa ulaşmayan kabul, hedefte kabulBekliyor durumunda asılı kalmaz; ret yanıtı durumu değiştirmez", () => {
  const d = devletli();
  const s = d.devlet!;
  s.ittifaklar = { aksehir: { durum: "kabulBekliyor", baslangicAy: 12, sonAy: 24, ad: "Akşehir", istekId: "k1" } };
  diplomasiReddedildi(d, { tur: "ittifakYanit", hedef: "aksehir", istekId: "k1", karar: "ret", ay: 12, ad: "Demirhan" });
  assert.equal(s.ittifaklar.aksehir?.durum, "kabulBekliyor", "ret yanıtının reddi kabul kaydını bozmaz");
  diplomasiReddedildi(d, { tur: "ittifakYanit", hedef: "aksehir", istekId: "k1", karar: "kabul", ay: 12, ad: "Demirhan" });
  assert.equal(s.ittifaklar.aksehir?.durum, "suresiDoldu");
  assert.equal(s.ittifaklar.aksehir?.sonAy, 12);
});

test("hedefin reddettiği son teyit, kaynaktaki aktif ittifakı tek taraflı bırakmaz", () => {
  const d = devletli();
  const s = d.devlet!;
  s.ittifaklar = { aksehir: { durum: "aktif", baslangicAy: 12, sonAy: 24, ad: "Akşehir", istekId: "o1" } };
  diplomasiReddedildi(d, { tur: "ittifakOnay", hedef: "aksehir", istekId: "yanlis", ay: 12, ad: "Demirhan" });
  assert.equal(s.ittifaklar.aksehir?.durum, "aktif", "başka istek kimliği etkilemez");
  diplomasiReddedildi(d, { tur: "ittifakOnay", hedef: "aksehir", istekId: "o1", ay: 12, ad: "Demirhan" });
  assert.equal(s.ittifaklar.aksehir?.durum, "suresiDoldu");
});

test("devleti olmayan bölgede ve tanınma yanıtında hiçbir şey değişmez, hata fırlatmaz", () => {
  const d = bolgeKur("demirhan", 10);
  diplomasiReddedildi(d, { tur: "taninmaIstek", hedef: "aksehir", istekId: "x", ay: 10, ad: "Demirhan" });
  assert.equal(d.devlet, undefined);
  const e = devletli();
  const once = JSON.stringify(e.devlet);
  diplomasiReddedildi(e, { tur: "taninmaYanit", hedef: "aksehir", istekId: "x", karar: "kabul", ay: 10, ad: "Demirhan" });
  assert.equal(JSON.stringify(e.devlet), once);
});
