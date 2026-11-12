// Geliştirici/önizleme için sahte ekonomi (Faz 6) istemcisi ve kasaba nabzı. Senaryo: Develi pazarında demirci ve
// dokumacı ilanları, bir alım ilanı, iki ısmarlama, Ustalar Levhası ve üç aylık defter. Döküm "sunucudan gelmiş"
// gibi hazır gelir (sunucu pazar-tahta.ts karşılaştırma ve bac kuralıyla aynı biçim); istemci hesap yapmaz.
import { ekBasarili, ekBasarisiz } from "./ek-istemci";
import type {
  DefterYaniti, EkonomiIstemci, EnvanterKalite, IlanGorunumu, IlanTuru, IsmarlamaGorunumu, Kademe4, Karsilastirma, KasabaNabzi, KaliteAdi,
  LevhaYaniti, PazarYaniti,
} from "./ekonomi-veri";

const AY = 40;
const ADLARI: KaliteAdi[] = ["sade", "iyi", "ustun", "saheser"];
const CARPAN = [1, 1.25, 1.6, 2.5];
const TABAN: Record<string, number> = { odun: 1, sertOdun: 4, tas: 1, ot: 1, yun: 2, kereste: 3, cevher: 3, komur: 3, tahil: 2, deri: 3, alet: 14, nal: 4, sifaliOt: 3, inceYun: 4 };
const bekle = () => new Promise<void>((r) => setTimeout(r, 60));

function karsilastirma(mal: string, q: Kademe4, f: number): Karsilastirma {
  const taban = TABAN[mal] ?? 1;
  const adil = taban * CARPAN[q];
  return { birimFiyat: f, npcTaban: taban, npcdenAlis: Math.ceil(taban * 1.5), stokFiyati: Math.ceil(taban * 1.2), adil,
    bant: { alt: Math.floor(adil * 0.5), ust: Math.ceil(adil * 3) }, tabanOrani: Math.round((f / taban) * 100) };
}

export function sahteNabiz(): KasabaNabzi {
  return {
    ay: AY, nufus: 214, yetiskin: 131, issiz: 19, bekar: 27, yasli: 22, cocuk: 61, hane: 48,
    gundem: { gecim: 14, evlilik: 6, ambar: 4, borc: 5, nobet: 2, merak: 3 },
    tetikler: ["kitlik"], gocNiyeti: 3, sayaclar: { dogum: 4, olum: 2, evlilik: 1, gocGelen: 1, isBuldu: 3 },
  };
}

/** Ambar kalite partileri (sahte envanterdeki demirci malları için). */
export function sahteKalite(): EnvanterKalite {
  return {
    nal: [{ kalite: "iyi", kademe: 1, adet: 2, yapan: "Elif Nur" }, { kalite: "ustun", kademe: 2, adet: 1, yapan: "Elif Nur" }],
    alet: [{ kalite: "saheser", kademe: 3, adet: 1, yapan: "Usta Kerem" }],
  };
}

export function sahteEkonomiIstemci(baslangicPara: number): EkonomiIstemci {
  let n = 20;
  const s = { para: Math.max(80, baslangicPara), emanet: 0 };
  const ilan = (tur: IlanTuru, sahip: [string, string], mal: string, q: Kademe4, adet: number, f: number, benim = false, yapan?: string): IlanGorunumu => ({
    id: "p" + ++n, tur, sahip: { id: sahip[0], ad: sahip[1] }, benim, mal, kalite: ADLARI[q], kademe: q, kalan: adet, ilk: adet, birimFiyat: f,
    toplam: adet * f, emanet: tur === "sat" ? { adet, akce: 0 } : { adet: 0, akce: adet * f }, yapanlar: yapan ? [yapan] : [],
    acilis: AY - 1, son: AY + 1, kalanAy: 2, durum: "acik", karsilastirma: karsilastirma(mal, q, f), islemler: [],
  });
  const ilanlar: IlanGorunumu[] = [
    ilan("sat", ["o7", "Usta Kerem"], "alet", 3, 2, 34, false, "Usta Kerem"),
    ilan("sat", ["o4", "Zeynep"], "nal", 1, 6, 5, false, "Zeynep"),
    ilan("sat", ["o9", "Hasan Bey"], "kereste", 0, 12, 4),
    ilan("al", ["o4", "Zeynep"], "cevher", 0, 10, 4),
    ilan("sat", ["o11", "Mahmut"], "deri", 0, 5, 11),
  ];
  const benim: IlanGorunumu[] = [];
  const pazar = (): PazarYaniti => {
    const acik = ilanlar.filter((x) => x.durum === "acik");
    const ozet = new Map<string, PazarYaniti["ozet"][number]>();
    for (const x of [...acik, ...benim.filter((b) => b.durum === "acik")]) {
      const o = ozet.get(x.mal) ?? { mal: x.mal, npcTaban: TABAN[x.mal] ?? 1, npcdenAlis: Math.ceil((TABAN[x.mal] ?? 1) * 1.5), enUcuzSatis: null, enYuksekAlim: null };
      if (x.tur === "sat") o.enUcuzSatis = o.enUcuzSatis === null ? x.birimFiyat : Math.min(o.enUcuzSatis, x.birimFiyat);
      else o.enYuksekAlim = o.enYuksekAlim === null ? x.birimFiyat : Math.max(o.enYuksekAlim, x.birimFiyat);
      ozet.set(x.mal, o);
    }
    return {
      ilanlar: [...acik, ...benim.filter((b) => b.durum === "acik")], benim: [...benim], ozet: [...ozet.values()],
      kurallar: { ilanEnCok: 5, sureEnCok: 3, adetEnCok: 50, bacOrani: 0.05, adilBant: { alt: 0.5, ust: 3 }, kumeCarpani: 2, kaliteCarpani: CARPAN, armaganTavani: { verme: 60, alma: 60 } },
      kaliteler: ADLARI, armaganKalan: { verme: 48, alma: 60 }, emanet: s.emanet,
    };
  };
  const ism = (id: string, rol: "musteri" | "usta", karsi: [string, string], mal: string, adet: number, q: Kademe4, ucret: number, durum: IsmarlamaGorunumu["durum"]): IsmarlamaGorunumu => ({
    id, rol, musteri: rol === "musteri" ? { id: "o1", ad: "Elif Nur" } : { id: karsi[0], ad: karsi[1] }, usta: rol === "usta" ? { id: "o1", ad: "Elif Nur" } : { id: karsi[0], ad: karsi[1] },
    mal, adet, kalite: ADLARI[q], kademe: q, ucret, emanet: durum === "acik" || durum === "surer" ? ucret : 0, acilis: AY - 1, son: AY + 2, kalanAy: 3, durum,
    teslimKalitesi: durum === "teslim" ? ADLARI[q] : null, hizmet: durum === "teslim" ? 4 : null,
  });
  const gelen = [ism("i3", "usta", ["o4", "Zeynep"], "nal", 4, 1, 26, "acik"), ism("i2", "usta", ["o9", "Hasan Bey"], "alet", 1, 2, 40, "surer")];
  const giden = [ism("i4", "musteri", ["o11", "Mahmut"], "deri", 3, 0, 14, "acik"), ism("i1", "musteri", ["o7", "Usta Kerem"], "alet", 1, 3, 45, "teslim")];
  const levha: LevhaYaniti = {
    kayitlar: [
      { oyuncu: { id: "o7", ad: "Usta Kerem" }, mal: "alet", kalite: "saheser", kademe: 3, ay: AY - 1, tarif: "demirci.alet" },
      { oyuncu: { id: "o1", ad: "Elif Nur" }, mal: "nal", kalite: "ustun", kademe: 2, ay: AY - 2, tarif: "demirci.nal" },
      { oyuncu: { id: "o4", ad: "Zeynep" }, mal: "inceYun", kalite: "ustun", kademe: 2, ay: AY - 4, tarif: "dokumaci.inceYun" },
    ],
    ustalar: [{ id: "o7", ad: "Usta Kerem", saheser: 1, ustun: 2 }, { id: "o1", ad: "Elif Nur", saheser: 0, ustun: 1 }, { id: "o4", ad: "Zeynep", saheser: 0, ustun: 1 }],
  };
  const defter = (): DefterYaniti => {
    const aylar = [
      { ay: AY, kalemler: [{ k: "pazarSatis", d: 24 }, { k: "npcSatis", d: 12 }, { k: "pazarAlim", d: -10 }, { k: "bac", d: -1 }, { k: "donum", d: -3 }] },
      { ay: AY - 1, kalemler: [{ k: "siparis", d: 18 }, { k: "npcAlim", d: -9 }, { k: "ismarlamaGelir", d: 26 }, { k: "ikram", d: -4 }] },
      { ay: AY - 2, kalemler: [{ k: "npcSatis", d: 15 }, { k: "beceri", d: -12 }, { k: "eylem", d: -2 }] },
    ].map((a) => {
      const gelir = a.kalemler.filter((x) => x.d > 0).reduce((t, x) => t + x.d, 0);
      const gider = a.kalemler.filter((x) => x.d < 0).reduce((t, x) => t - x.d, 0);
      return { ...a, gelir, gider, net: gelir - gider };
    });
    const toplam = aylar.reduce((t, a) => ({ gelir: t.gelir + a.gelir, gider: t.gider + a.gider, net: t.net + a.net }), { gelir: 0, gider: 0, net: 0 });
    return { aylar, toplam, kalemler: [], ay: AY, para: s.para, emanet: { pazar: s.emanet, ismarlama: 14 } };
  };
  return {
    async pazar(mal) { await bekle(); const p = pazar(); return ekBasarili(mal ? { ...p, ilanlar: p.ilanlar.filter((x) => x.mal === mal) } : p); },
    async ilan(g) {
      await bekle();
      if (benim.filter((x) => x.durum === "acik").length >= 5) return ekBasarisiz("ilan_siniri");
      if (g.tur === "al" && s.para < g.adet * g.fiyat) return ekBasarisiz("para_yok");
      const x = ilan(g.tur, ["o1", "Elif Nur"], g.mal, g.kalite ?? 0, g.adet, g.fiyat, true, g.tur === "sat" ? "Elif Nur" : undefined);
      x.son = AY + (g.sure ?? 2) - 1; x.kalanAy = g.sure ?? 2;
      if (g.tur === "al") { s.para -= g.adet * g.fiyat; s.emanet += g.adet * g.fiyat; }
      benim.unshift(x);
      return ekBasarili({ ilan: x });
    },
    async islem(g) {
      await bekle();
      const x = ilanlar.find((i) => i.id === g.ilan);
      if (!x || x.durum !== "acik") return ekBasarisiz("ilan_kapandi");
      if (g.adet < 1 || g.adet > x.kalan) return ekBasarisiz("ilan_gecersiz");
      const tutar = g.adet * x.birimFiyat;
      if (x.tur === "sat" && s.para < tutar) return ekBasarisiz("para_yok");
      if (x.tur === "al") return ekBasarisiz("mal_yok");
      const bac = Math.floor(tutar * 0.05);
      s.para -= tutar;
      x.kalan -= g.adet; x.toplam = x.kalan * x.birimFiyat;
      x.islemler.push({ ay: AY, kim: "o1", adet: g.adet, tutar });
      if (x.kalan <= 0) x.durum = "bitti";
      const k = x.karsilastirma;
      return ekBasarili({ islem: { ilan: x, adet: g.adet, kalite: x.kalite, tutar, bac, net: tutar - bac, karsilastirma: k,
        pompa: { hediye: 0, yon: null, ayniKume: false, bant: { alt: k.bant.alt * g.adet, ust: k.bant.ust * g.adet }, verenKalan: 48, alanKalan: 60 } } });
    },
    async geri(g) {
      await bekle();
      const x = benim.find((i) => i.id === g.ilan);
      if (!x || x.durum !== "acik") return ekBasarisiz("ilan_kapandi");
      x.durum = "geri";
      if (x.tur === "al") { s.para += x.emanet.akce; s.emanet -= x.emanet.akce; }
      return ekBasarili({ ilan: x, iade: x.emanet });
    },
    async ismarlamalar() {
      await bekle();
      return ekBasarili({ gelen, giden, sicil: { teslim: 5, gecikme: 1, guven: 83 }, emanet: 14,
        kurallar: { adetEnCok: 20, sureEnCok: 6, musteriEnCok: 5, ustaEnCok: 8, adilBant: { alt: 0.5, ust: 3 }, armaganTavani: { verme: 60, alma: 60 } } });
    },
    async ismarla(g) {
      await bekle();
      if (s.para < g.ucret) return ekBasarisiz("para_yok");
      s.para -= g.ucret;
      const x = ism("i" + ++n, "musteri", [g.hedef, g.hedef === "o7" ? "Usta Kerem" : "Zeynep"], g.mal, g.adet, g.kalite ?? 0, g.ucret, "acik");
      giden.unshift(x);
      return ekBasarili({ ismarlama: x });
    },
    async cevap(g) {
      await bekle();
      const x = [...gelen, ...giden].find((i) => i.id === g.ismarlama);
      if (!x || !(x.durum === "acik" || x.durum === "surer")) return ekBasarisiz("ismarlama_kapandi");
      if (g.cevap === "teslim" && x.mal === "alet") return ekBasarisiz("mal_yok");
      x.durum = g.cevap === "kabul" ? "surer" : g.cevap === "teslim" ? "teslim" : g.cevap;
      if (x.durum === "teslim") { x.teslimKalitesi = x.kalite; x.hizmet = 4; x.emanet = 0; }
      return ekBasarili({ ismarlama: x, teslim: null });
    },
    async levha(mal) { await bekle(); return ekBasarili(mal ? { ...levha, kayitlar: levha.kayitlar.filter((x) => x.mal === mal) } : levha); },
    async defter() { await bekle(); return ekBasarili(defter()); },
  };
}
