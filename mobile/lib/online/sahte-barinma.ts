// Geliştirici/önizleme için sahte barınma (Faz 14) istemcisi. Senaryo: üç gündür uzakta kalmış, misafirhane hakkı
// bitmiş, zincirin "evsiz" aşamasında bir karakter. Durum, fiyat ve seçenekler "sunucudan gelmiş" gibi hazır gelir.
import { ekBasarili, ekBasarisiz, type EkSonuc } from "./ek-istemci";
import type { YerlesimTuru } from "./protokol";
import type { BarinmaGorunumu, BarinmaIstemci, DonusEkrani, OdaId, OdaTeklifi, OtomatikMod, TekDokunus } from "./barinma-veri";

const SAAT = 3_600_000;
const AY = 12 * SAAT;
/** Barınma günlüğü anahtar öneki (sunucu barinma.ts gunluk: "barinma." + olay). */
const GUNLUK = "barinma.";
const bekle = () => new Promise<void>((r) => setTimeout(r, 60));
const NITELIK = {
  yatak: { aylik: 2, kondisyon: 0, sandik: 0, ozel: false, adres: true },
  oda: { aylik: 4, kondisyon: 5, sandik: 10, ozel: true, adres: true },
  hasOda: { aylik: 9, kondisyon: 10, sandik: 30, ozel: true, adres: true },
} as const;
const fiyat = (a: number, s: 1 | 3 | 12) => Math.ceil(a * s * (1 - (s === 1 ? 0 : s === 3 ? 0.1 : 0.2)) - 1e-9);

export function sahteBarinmaIstemci(baslangicPara: number, tur: YerlesimTuru): BarinmaIstemci {
  const simdi = Date.now();
  const z = simdi - 40 * SAAT;
  const tesisTuru = tur === "koy" ? "zaviye" : "imaret";
  const s = {
    para: Math.max(6, baslangicPara),
    konak: null as null | { oda?: OdaId; tesis?: boolean; bas: number; bitis: number },
    mod: "kapali" as OtomatikMod,
    tesisKullanildi: false,
  };
  const odalar = (): OdaTeklifi[] => (["yatak", "oda", "hasOda"] as OdaId[]).map((oda) => {
    const n = NITELIK[oda];
    const f = { "1": fiyat(n.aylik, 1), "3": fiyat(n.aylik, 3), "12": fiyat(n.aylik, 12) };
    return { oda, aylik: n.aylik, nitelik: { ...n }, fiyatlar: f, yeterli: s.para >= f["1"] };
  });
  const gorunum = (): BarinmaGorunumu => {
    const an = Date.now();
    const k = s.konak && s.konak.bitis > an ? s.konak : null;
    const uygun = !s.tesisKullanildi && s.para < fiyat(2, 1);
    return {
      acik: true,
      durum: k ? "konakli" : "evsiz",
      unvan: k ? null : "evsiz",
      konaklama: k ? { tur: k.oda ? "oda" : "tesis", bitis: k.bitis, kalanMs: k.bitis - an, yakindaBiter: k.bitis - an <= 12 * SAAT,
        ...(k.oda ? { oda: k.oda, han: "npc:develi", nitelik: { ...NITELIK[k.oda] } } : {}) } : null,
      zincir: k ? null : {
        baslangic: z, asama: "evsiz", sonraki: { asama: "canKaybi", an: z + 96 * SAAT },
        etkiler: { kondisyonAylik: -20, gonulAylik: -10, canAylik: 0, canTaban: 10, olum: false },
        esikler: { evsizMs: 24 * SAAT, canKaybiMs: 96 * SAAT },
      },
      misafirhane: { ilkYerlesim: "develi", hakMs: 48 * SAAT, buSehir: { baslangic: z - 48 * SAAT, bitis: z, kullanildi: true } },
      odalar: odalar(),
      tesis: { tur: tesisTuru, acik: true, uygun, ...(uygun ? { kalanHak: 2 } : { neden: s.tesisKullanildi ? "tesis_dolu" : "tesis_sart" }), sureMs: AY },
      otomatik: { mod: s.mod, modlar: ["kapali", "oda", "tesis", "uyar"] },
      uyku: false,
      mola: null,
      sozlesmeler: s.konak?.oda ? [{ oda: s.konak.oda, han: "npc:develi", baslangic: s.konak.bas, bitis: s.konak.bitis, odenen: 2, etkin: !!k }] : [],
      gunluk: [
        { an: z + 24 * SAAT, k: GUNLUK + "zincir.evsiz", p: { z } },
        { an: z, k: GUNLUK + "misafirhane.bitti", p: { bitis: z } },
        { an: z - 48 * SAAT, k: GUNLUK + "misafirhane.basladi", p: { bitis: z, ilk: 1 } },
      ],
      para: s.para,
    };
  };
  const secenekler = (g: BarinmaGorunumu): TekDokunus[] => {
    if (g.konaklama) return [];
    const l: TekDokunus[] = [
      <TekDokunus>{ tur: "tesis", anahtar: `donus.secenek.${g.tesis.tur}`, fiyat: 0, uygun: g.tesis.uygun, ...(g.tesis.neden ? { neden: g.tesis.neden } : {}), istek: { yontem: "POST", yol: "/v1/barinma/tesis", govde: {} } },
      ...g.odalar.map((o): TekDokunus => ({ tur: "oda", anahtar: `donus.secenek.oda.${o.oda}`, fiyat: o.fiyatlar["1"], uygun: o.yeterli, ...(o.yeterli ? {} : { neden: "para_yok" }), istek: { yontem: "POST", yol: "/v1/barinma/kira", govde: { oda: o.oda, sure: 1 } } })),
    ].sort((a, b) => Number(b.uygun) - Number(a.uygun) || a.fiyat - b.fiyat);
    if (g.otomatik.mod === "kapali") l.push({ tur: "otomatik", anahtar: "donus.secenek.otomatik", fiyat: 0, uygun: true, istek: { yontem: "POST", yol: "/v1/barinma/otomatik", govde: { mod: "oda" } } });
    return l;
  };
  const kira = (oda: OdaId, sure: 1 | 3 | 12): EkSonuc<{ f: number }> => {
    const f = fiyat(NITELIK[oda].aylik, sure);
    if (s.para < f) return ekBasarisiz("para_yok");
    const an = Date.now();
    const etkin = s.konak?.oda === oda && s.konak.bitis > an;
    if (s.konak?.oda && s.konak.oda !== oda && s.konak.bitis > an) return ekBasarisiz("oda_var");
    s.para -= f;
    s.konak = { oda, bas: etkin ? s.konak!.bas : an, bitis: (etkin ? s.konak!.bitis : an) + sure * AY };
    return ekBasarili({ f });
  };
  const tesis = (): EkSonuc<true> => {
    const g = gorunum();
    if (g.konaklama) return ekBasarisiz("konaklama_var");
    if (!g.tesis.uygun) return ekBasarisiz(g.tesis.neden === "tesis_dolu" ? "tesis_dolu" : "tesis_sart");
    s.tesisKullanildi = true;
    s.konak = { tesis: true, bas: Date.now(), bitis: Date.now() + AY };
    return ekBasarili(true);
  };
  return {
    async barinma() { await bekle(); return ekBasarili({ barinma: gorunum() }); },
    async kira(g) {
      await bekle();
      const r = kira(g.oda, g.sure);
      if (!r.ok) return r;
      return ekBasarili({ kira: { oda: g.oda, sure: g.sure, fiyat: r.deger.f, batak: r.deger.f, baslangic: s.konak!.bas, bitis: s.konak!.bitis, uzatildi: false }, barinma: gorunum() });
    },
    async tesis() {
      await bekle();
      const r = tesis();
      if (!r.ok) return r;
      return ekBasarili({ tesis: { tur: tesisTuru, baslangic: s.konak!.bas, bitis: s.konak!.bitis }, barinma: gorunum() });
    },
    async otomatik(g) { await bekle(); s.mod = g.mod; return ekBasarili({ otomatik: g.mod, barinma: gorunum() }); },
    async donus() {
      await bekle();
      const g = gorunum();
      const once = simdi - 3 * 24 * SAAT - 5 * SAAT;
      const d: DonusEkrani = {
        yokluk: { baslangic: once, ms: simdi - once, ay: Math.floor((simdi - once) / AY), uyku: false },
        baslik: g.zincir ? "donus.baslik.toparlan" : "donus.baslik.hosgeldin",
        barinma: { durum: g.durum, anahtar: `donus.barinma.${g.durum}`, unvan: g.unvan, konaklama: g.konaklama, zincir: g.zincir, ...(g.zincir ? { toparlanma: "donus.toparlanma.konaklama" } : {}) },
        hal: {
          can: { deger: 74, anahtar: "donus.hal.can.saglam", taban: 10, toparlanmaAylik: g.zincir ? 0 : 10 },
          kondisyon: { deger: 38, anahtar: "donus.hal.kondisyon.yorgun", toparlanmaAylik: g.zincir ? 0 : 15 },
          gonul: { deger: 41, anahtar: "donus.hal.gonul.olagan", denge: 50 },
          nedenler: [{ gosterge: "kondisyon", fark: -20, neden: "hal.neden.evsizlik", ay: 0 }, { gosterge: "gonul", fark: -10, neden: "hal.neden.evsizlik", ay: 0 }],
        },
        olanlar: g.gunluk.filter((x) => x.an >= once).map((x) => ({ ...x, k: x.k.replace(/^barinma\./, "donus.olan.") })),
        secenekler: secenekler(g),
        otomatik: { mod: s.mod, oneri: s.mod === "kapali" ? "donus.otomatik.oneri" : null },
        mola: null,
      };
      return ekBasarili({ donusEkrani: d });
    },
    async tekDokunus(sec) {
      await bekle();
      const gv = sec.istek.govde;
      if (sec.istek.yol === "/v1/barinma/kira") {
        const r = kira(gv.oda as OdaId, 1);
        if (!r.ok) return r;
      } else if (sec.istek.yol === "/v1/barinma/tesis") {
        const r = tesis();
        if (!r.ok) return r;
      } else if (sec.istek.yol === "/v1/barinma/otomatik") s.mod = gv.mod as OtomatikMod;
      else return ekBasarisiz("gecersiz_istek");
      return ekBasarili({ barinma: gorunum() });
    },
  };
}
