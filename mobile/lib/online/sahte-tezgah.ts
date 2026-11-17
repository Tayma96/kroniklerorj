// Geliştirici/önizleme için sahte tezgâh (Dilim 1). Senaryo: üç dükkânlı çarşı — 1. dükkân Zeynep'in (rakip, dolu raf),
// 2. dükkân oyuncunun (Elif Nur; raf, depo, gün sonu), 3. dükkân Hasan Bey'in (13 aydır kepenkli, yuvalar dolu →
// devralınabilir); 1. atölye oyuncunun (zanaat, emirler, emek havuzu, toplu sipariş, ustalık etkileri: sahte-atolye.ts),
// 2. atölye Usta Kerem'in. Oyuncunun dükkânında Dilim 3 ekleri: ustalık etkileri, çarşı fiyat tablosu, gün sonu H kancası. Önizleme sunucudaki bütçe payının
// kaba bir taklididir (aynı çarpan adları ve neden kodları); gerçek hesap sunucudadır. Zeynep'in 2. satırında ilk satın
// alma denemesi `fiyat_degisti` döner (yeniden onay akışı denensin).
import { ekBasarili, ekBasarisiz } from "./ek-istemci";
import { sahteAtolyeDurumu, sahteAtolyeGorunumu } from "./sahte-atolye";
import {
  bantHesapla, type DepoSatiri, type DukkanKarti, type FiyatTablosuSatiri, type GunSonu, type Kademe, type KancaDokumu, type Onizleme, type RafSatiri, type TezgahGorunumu, type TezgahIstemci,
} from "./tezgah-veri";

const bekle = () => new Promise<void>((r) => setTimeout(r, 80));
const AY = 40;
const KALITE_ADI = ["sade", "iyi", "ustun", "saheser"];
const Q = [1, 1.1, 1.25, 1.5];

interface Ham { n: number; m: string; q: Kademe; adet: number; f: number; yapan?: string }
interface Dukkan { id: string; ad: string; sahip: { id: string; ad: string }; seviye: number; itibar: number; kk: number; r: Ham[]; depo: DepoSatiri[]; ben: boolean; gs: GunSonu | null; tur: "dukkan" | "atolye" }

export function sahteTezgahIstemci(baslangicPara: number, yer: string): TezgahIstemci {
  const id = (tur: string, no: number) => `${yer}.${tur}.${no}`;
  const s = { para: Math.max(160, baslangicPara), fiyatOyunu: true, sn: 10 };
  const at = sahteAtolyeDurumu(yer);
  const dk: Dukkan[] = [
    { id: id("dukkan", 1), ad: "Zeynep'in Kumaş Dükkânı", sahip: { id: "o4", ad: "Zeynep" }, seviye: 1, itibar: 34, kk: 0, ben: false, gs: null, tur: "dukkan", depo: [],
      r: [{ n: 1, m: "inceYun", q: 1, adet: 9, f: 5, yapan: "Zeynep" }, { n: 2, m: "deri", q: 0, adet: 6, f: 4 }, { n: 3, m: "kagit", q: 0, adet: 4, f: 7 }] },
    { id: id("dukkan", 2), ad: "", sahip: { id: "o1", ad: "Elif Nur" }, seviye: 0, itibar: 18, kk: 0, ben: true, tur: "dukkan",
      r: [{ n: 1, m: "yun", q: 0, adet: 10, f: 3 }, { n: 2, m: "alet", q: 2, adet: 3, f: 40, yapan: "Elif Nur" }],
      depo: [{ mal: "kereste", kalite: 0, adet: 12 }, { mal: "inceYun", kalite: 1, adet: 6 }, { mal: "tahil", kalite: 0, adet: 8 }],
      gs: { ay: AY - 1, kepenk: false, hasilat: 21, vergi: { oran: 2, tutar: 0 }, net: 21, tavan: { seviye: 30, kullanilan: 21 }, satirlar: [
        { satir: 1, mal: "yun", kalite: 0, fiyat: 3, satilan: 4, kalan: 10, hasilat: 12, payYuzde: 42.5, carpanlar: { F: 0.44, Q: 1, R: 0.68, H: 1 }, cekicilik: 0.3, bMal: 28, npcTavan: 3, neden: "rakip" },
        { satir: 2, mal: "alet", kalite: 2, fiyat: 40, satilan: 0, kalan: 3, hasilat: 0, payYuzde: 0, carpanlar: { F: 0.36, Q: 1.25, R: 0.68, H: 1 }, cekicilik: 0, bMal: 35, npcTavan: 33, neden: "tavan" },
        { satir: 3, mal: "tahil", kalite: 0, fiyat: 2, satilan: 4, kalan: 0, hasilat: 9, payYuzde: 100, carpanlar: { F: 1, Q: 1, R: 0.68, H: 1.05 }, cekicilik: 0.71, bMal: 9, npcTavan: 3, neden: "stok" },
      ], hKanca: { ciftci: { deger: 5, tavan: 30, kisiAd: "Elif Nur" } } } },
    { id: id("dukkan", 3), ad: "Hasan Bey'in Nalbur Dükkânı", sahip: { id: "o9", ad: "Hasan Bey" }, seviye: 0, itibar: 10, kk: 61, ben: false, gs: null, tur: "dukkan", depo: [], r: [] },
    { id: at.isletme, ad: "", sahip: { id: "o1", ad: "Elif Nur" }, seviye: at.seviye, itibar: 16, kk: 0, ben: true, gs: at.gs, tur: "atolye", depo: at.depo, r: [] },
    { id: id("atolye", 2), ad: "Kerem Ocağı", sahip: { id: "o7", ad: "Usta Kerem" }, seviye: 2, itibar: 22, kk: 4, ben: false, gs: null, tur: "atolye", depo: [], r: [] },
  ];
  const bul = (isletme: string) => dk.find((x) => x.id === isletme);
  const satirG = (d: Dukkan, h: Ham): RafSatiri => {
    const b = bantHesapla(h.m, h.q)!;
    const F = Math.pow(Math.max(0.6, Math.min(1.6, b.adil / h.f)), 2);
    const R = 0.5 + d.itibar / 100;
    return { satir: h.n, mal: h.m, kalite: h.q, kaliteAdi: KALITE_ADI[h.q]!, adet: h.adet, fiyat: h.f, bant: b.bant, npcTavan: b.npcTavan, adil: b.adil,
      ...(h.yapan ? { yapan: h.yapan } : {}), cekicilik: { F, Q: Q[h.q]!, R, H: 1, a: F * Q[h.q]! * R } };
  };
  const bos = (d: Dukkan) => !d.r.some((x) => x.adet > 0);
  // Dilim 3: oyuncunun dükkânında tüccar kancaları (raf satırı +1, H çiftçi malına) ve depo; çarşı fiyat tablosu.
  const rafSatirS = (d: Dukkan) => [3, 4, 6, 8, 10][d.seviye]! + (d.ben ? 1 : 0);
  const kap = (d: Dukkan) => (d.tur === "atolye" && d.ben ? sahteAtolyeGorunumu(at).depoKapasite : d.ben ? 46 : 40);
  const dukkanKanca = (d: Dukkan): Record<string, KancaDokumu> => {
    const k: Record<string, KancaDokumu> = {
      rafSatir: { deger: 1, tavan: 2, kisiAd: "Elif Nur", kalemler: [{ kanca: "kalite:tezgahKotasi", d: 1 }] },
      depo: { deger: 15, tavan: 25, kisiAd: "Elif Nur", kalemler: [{ kanca: "hak:tahilSaklama", d: 15 }] },
    };
    if (d.r.some((x) => x.m === "yun" || x.m === "tahil")) k["dukkanH.ciftci"] = { deger: 5, tavan: 30, kisiAd: "Elif Nur", kalemler: [{ kanca: "hak:kitlikSatisi", d: 5 }] };
    return k;
  };
  const fiyatTablosu = (d: Dukkan): FiyatTablosuSatiri[] => dk.filter((x) => x !== d && x.tur === "dukkan").flatMap((x) => x.r.filter((h) => h.adet > 0)
    .map((h) => ({ isletme: x.id, ad: x.ad, mal: h.m, kalite: h.q, fiyat: h.f, adet: h.adet }))).sort((a, b) => (a.mal < b.mal ? -1 : a.mal > b.mal ? 1 : a.kalite - b.kalite || a.fiyat - b.fiyat)).slice(0, 40);
  const gorunum = (d: Dukkan): TezgahGorunumu => ({
    isletme: d.id, tur: d.tur, ad: d.ad, sahip: d.sahip, seviye: d.seviye, itibar: d.itibar, kepenk: d.tur === "atolye" ? !d.ben : bos(d), kepenkAy: d.kk, gecenAyKepenk: d.gs ? d.gs.kepenk : true,
    raf: d.tur === "dukkan" ? d.r.map((h) => satirG(d, h)) : [], rafSiniri: { satir: d.tur === "dukkan" ? rafSatirS(d) : 0, adet: 24 },
    npcTavanSeviye: d.tur === "dukkan" ? [30, 60, 100, 160, 240][d.seviye]! : 0, devralinabilir: d.kk >= 60 && !d.ben && d.tur === "dukkan",
    izin: { depoKoy: d.ben, depoAl: d.ben, raf: d.ben && d.tur === "dukkan", fiyat: d.ben && d.tur === "dukkan", satinAl: !d.ben && d.tur === "dukkan",
      genislet: d.ben && d.tur === "atolye", ...(d.tur === "atolye" ? { uret: d.ben, mesai: d.ben, emir: d.ben, toplu: d.ben, zanaat: d.ben } : {}) },
    ...(d.ben && d.tur === "atolye" ? sahteAtolyeGorunumu(at) : d.ben ? { kanca: dukkanKanca(d), fiyatTablosu: fiyatTablosu(d) } : {}),
    ...(d.ben ? { depo: d.depo.filter((x) => x.adet > 0), depoKapasite: kap(d), depoDolu: d.depo.reduce((t, x) => t + x.adet, 0), gunSonu: d.gs, depoDefteri: [{ ay: AY - 1, kim: "o5", mal: "kereste", kalite: 0, adet: 2 }],
      ozet: { ay: AY - 1, meslekler: [{ meslek: "demirci", neden: "kimseSatmadi" }, { meslek: "ciftci", neden: "satildi" }] } } : {}),
  });
  const depoDolu = (d: Dukkan) => d.depo.reduce((t, x) => t + x.adet, 0);
  const depoEkle = (d: Dukkan, mal: string, q: Kademe, adet: number) => {
    const x = d.depo.find((y) => y.mal === mal && y.kalite === q);
    if (x) x.adet += adet; else d.depo.push({ mal, kalite: q, adet });
  };
  return {
    async dukkanlar() {
      await bekle();
      const l: DukkanKarti[] = dk.filter((d) => d.tur === "dukkan").map((d, i) => ({
        isletme: d.id, no: i + 1, ad: d.ad, sahip: d.sahip, seviye: d.seviye, itibar: d.itibar, kepenk: bos(d), satir: d.r.length,
        mallar: [...new Set(d.r.map((x) => x.m))], benim: d.ben, devralinabilir: d.kk >= 60 && !d.ben,
      }));
      return ekBasarili({ dukkanlar: l, yuva: { dukkan: { toplam: 3, dolu: 3 }, atolye: { toplam: 3, dolu: 1 } }, devralmaKepenkAy: 60 });
    },
    async tezgah(isletme) { await bekle(); const d = bul(isletme); return d ? ekBasarili(gorunum(d)) : ekBasarisiz(isletme.includes(".han.") ? "tezgah_yok" : "isletme_yok"); },
    async onizle(isletme, g) {
      await bekle();
      const d = bul(isletme);
      const b = bantHesapla(g.mal, g.kalite);
      if (!d || !b) return ekBasarisiz("mal_gecersiz");
      if (g.fiyat < b.bant.alt || g.fiyat > b.bant.ust) return ekBasarisiz("fiyat_bant_disi");
      const mevcut = d.r.find((x) => x.m === g.mal && x.q === g.kalite);
      const adet = g.adet ?? Math.max(1, mevcut?.adet ?? 24);
      const F = Math.pow(Math.max(0.6, Math.min(1.6, b.adil / g.fiyat)), 2);
      const R = 0.5 + d.itibar / 100;
      const a = g.fiyat > b.npcTavan ? 0 : F * Q[g.kalite]! * R;
      const rakip = dk.filter((x) => x !== d && x.r.some((y) => y.m === g.mal && y.adet > 0)).length;
      const rakipA = rakip * 0.55;
      const pay = a > 0 ? a / (a + rakipA) : 0;
      const bMal = 18;
      const tahminiHasilat = Math.floor(bMal * pay);
      const tahminiAdet = Math.min(adet, Math.floor(tahminiHasilat / g.fiyat));
      const neden = a === 0 ? "tavan" : tahminiAdet >= adet ? "stok" : rakip > 0 && pay < 0.5 ? "rakip" : "butce";
      const o: Onizleme = {
        mal: g.mal, kalite: g.kalite, fiyat: g.fiyat, adet, bant: b.bant, npcTavan: b.npcTavan,
        butce: { meslek: "ciftci", B: 70, kitlik: false, malSayisi: 3, bMal }, payYuzde: Math.round(pay * 1000) / 10,
        carpanlar: { F: Math.round(F * 100) / 100, Q: Q[g.kalite]!, R: Math.round(R * 100) / 100, H: 1 }, cekicilik: a, rakipSatir: rakip,
        tahminiAdet, tahminiHasilat: tahminiAdet * g.fiyat, neden, yontem: "butce",
      };
      return ekBasarili(o);
    },
    async depo(isletme, g) {
      await bekle();
      const d = bul(isletme);
      if (!d) return ekBasarisiz("isletme_yok");
      if (!d.ben) return ekBasarisiz("yetki_yok");
      const q = (g.kalite ?? 0) as Kademe;
      if (!Number.isInteger(g.adet) || g.adet < 1 || g.adet > 60) return ekBasarisiz("adet_gecersiz");
      if (g.yon === "koy") {
        if (depoDolu(d) + g.adet > kap(d)) return ekBasarisiz("depo_dolu");
        depoEkle(d, g.mal, q, g.adet);
      } else {
        const x = d.depo.find((y) => y.mal === g.mal && y.kalite === q);
        if (!x || x.adet < g.adet) return ekBasarisiz("mal_yok");
        x.adet -= g.adet;
      }
      return ekBasarili({ depo: { yon: g.yon, mal: g.mal, kalite: q, adet: g.adet, icerik: d.depo.filter((x) => x.adet > 0), dolu: depoDolu(d), kapasite: kap(d) }, para: s.para });
    },
    async raf(isletme, g) {
      await bekle();
      const d = bul(isletme);
      if (!d || d.tur !== "dukkan") return ekBasarisiz("tezgah_yok");
      if (!d.ben) return ekBasarisiz("yetki_yok");
      if (g.islem === "koy") {
        const q = (g.kalite ?? 0) as Kademe;
        const x = d.depo.find((y) => y.mal === g.mal && y.kalite === q);
        if (!x || x.adet < g.adet) return ekBasarisiz("mal_yok");
        let h = d.r.find((y) => y.m === g.mal && y.q === q);
        if (h && h.adet + g.adet > 24) return ekBasarisiz("raf_satir_dolu");
        if (!h) {
          if (d.r.length >= rafSatirS(d)) return ekBasarisiz("raf_dolu");
          const b = bantHesapla(g.mal, q);
          if (g.fiyat === undefined || !b || g.fiyat < b.bant.alt || g.fiyat > b.bant.ust) return ekBasarisiz("fiyat_bant_disi");
          if (g.adet > 24) return ekBasarisiz("adet_gecersiz");
          h = { n: ++s.sn, m: g.mal, q, adet: 0, f: g.fiyat };
          d.r.push(h);
        }
        x.adet -= g.adet; h.adet += g.adet;
        return ekBasarili({ raf: d.r.map((y) => satirG(d, y)), satir: satirG(d, h) });
      }
      const h = d.r.find((y) => y.n === g.satir);
      if (!h) return ekBasarisiz("satir_yok");
      if (g.islem === "al") {
        if (g.adet > h.adet) return ekBasarisiz("adet_gecersiz");
        if (depoDolu(d) + g.adet > kap(d)) return ekBasarisiz("depo_dolu");
        h.adet -= g.adet; depoEkle(d, h.m, h.q, g.adet);
        if (h.adet <= 0) d.r = d.r.filter((y) => y !== h);
        return ekBasarili({ raf: d.r.map((y) => satirG(d, y)), depoDolu: depoDolu(d) });
      }
      const b = bantHesapla(h.m, h.q)!;
      if (g.fiyat < b.bant.alt || g.fiyat > b.bant.ust) return ekBasarisiz("fiyat_bant_disi");
      h.f = g.fiyat;
      return ekBasarili({ satir: satirG(d, h) });
    },
    async satinAl(isletme, g) {
      await bekle();
      const d = bul(isletme);
      if (!d || d.tur !== "dukkan") return ekBasarisiz("tezgah_yok");
      if (d.ben) return ekBasarisiz("kendine");
      const h = d.r.find((y) => y.n === g.satir);
      if (!h) return ekBasarisiz("satir_yok");
      if (s.fiyatOyunu && d.id === id("dukkan", 1) && h.n === 2) { s.fiyatOyunu = false; h.f += 1; return ekBasarisiz("fiyat_degisti"); }
      if (g.fiyat !== h.f) return ekBasarisiz("fiyat_degisti");
      if (h.adet < g.adet) return ekBasarisiz("stok_yok");
      const tutar = h.f * g.adet;
      if (s.para < tutar) return ekBasarisiz("para_yok");
      s.para -= tutar; h.adet -= g.adet;
      const vergi = Math.floor(tutar * 0.02);
      const sonuc = { isletme, satir: h.n, mal: h.m, kalite: h.q, adet: g.adet, birim: h.f, tutar, vergi: { oran: 2, tutar: vergi }, kasaya: tutar - vergi, yapan: h.yapan ?? null };
      if (h.adet <= 0) d.r = d.r.filter((y) => y !== h);
      return ekBasarili({ satis: sonuc, para: s.para });
    },
    async devral(isletme) {
      await bekle();
      const d = bul(isletme);
      if (!d) return ekBasarisiz("isletme_yok");
      if (d.ben) return ekBasarisiz("kendine");
      if (d.kk < 12) return ekBasarisiz("devralma_kosulu");
      if (dk.filter((x) => x.ben).length >= 2) return ekBasarisiz("mulk_siniri");
      if (s.para < 180) return ekBasarisiz("para_yok");
      s.para -= 180;
      const eski = d.sahip.id;
      Object.assign(d, { sahip: { id: "o1", ad: "Elif Nur" }, ben: true, kk: 0, itibar: 10, seviye: 0, ad: "", r: [], depo: [], gs: null });
      return ekBasarili({ devralma: { isletme, fiyat: 180, eskiSahip: eski, iade: { bedel: 150, mal: 0, kasa: "isletmeden" }, ts: 1 } });
    },
  };
}
