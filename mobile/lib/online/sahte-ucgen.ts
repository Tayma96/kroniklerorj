// Geliştirici/önizleme için sahte üçgen (Faz 4) istemcisi: sabit, inandırıcı veri. Şanslar ve zarlar burada da
// "sunucudan gelmiş" gibi hazırdır; istemci ekranları hiçbir sonucu kendisi hesaplamaz.
import { ekBasarili, ekBasarisiz, type EkSonuc } from "./ek-istemci";
import type { Dokum, Kalem } from "./protokol";
import type { KisiRef, Soz, Talep, UcgenGorunumu, UcgenIstemci, UcgenYaniti, Baris, CasusKaydi, UcgenParametreleri } from "./ucgen-veri";

export interface SahteUcgenBaglami { ay: number; ben: string; ad: (id: string) => string; oyuncular: KisiRef[] }

const PARAMETRELER: UcgenParametreleri = {
  takat: { kiskirt: 1, katil: 1, sozBoz: 0, araciIste: 0, araciKapat: 0, arabulucu: 1, sartOde: 0, casus: 1 },
  kiskirt: { yas: 16, teklif: { ortaklik: 8, intikamPayi: 5, soz: 3, paraTavani: 15 }, farkOrani: 0.6, sozSure: 6, aylik: 2 },
  katil: { yakalanma: { laf: 0.15, boykot: 0.25 }, boykotSure: 3, lafAlici: 3 },
};
/** Fixture kalemi (anahtar sunucunun "sans.*"/"guven.*" kalemidir; metni "onl." önekiyle). */
const kl = (k: string, d: number, p?: Record<string, string | number>): Kalem => (p ? { k, d, p } : { k, d });
const bekle = () => new Promise<void>((r) => setTimeout(r, 60));

interface Durum { sozler: Soz[]; giden: Talep[]; gelen: Talep[]; kapanan: Talep[]; casus: CasusKaydi | null; barislar: Baris[]; n: number; kurulan: Set<string> }
const durum: Durum = { sozler: [], giden: [], gelen: [], kapanan: [], casus: null, barislar: [], n: 40, kurulan: new Set() };

function kur(b: SahteUcgenBaglami, npc: string) {
  if (durum.kurulan.has(npc)) return;
  durum.kurulan.add(npc);
  const n: KisiRef = { id: npc, ad: b.ad(npc) };
  const [a, c] = b.oyuncular;
  if (a) durum.sozler.push({ id: `z${durum.n++}`, npc: n, hedef: a, kurulus: b.ay - 2, bitis: b.ay + 4, kaynak: "kiskirt", teklif: "ortaklik", katilabilir: true });
  if (c ?? a) {
    durum.gelen.push({ id: `r${durum.n++}`, taraf: (c ?? a)!, arabulucu: { id: b.ben, ad: b.ad(b.ben) }, npc: n, bedel: "helallik", acilis: b.ay - 1, sonAy: b.ay + 2, durum: "acik" });
  }
  if (!durum.barislar.length) durum.barislar.push({ npc: n, deger: 0, arabulucu: a ?? { id: "o9", ad: "—" }, sartli: { deger: 24, tutar: 6, sonAy: b.ay + 4 } });
}

const GUVEN: Dokum = { toplam: 38, kalemler: [kl("guven.taban", 30), kl("guven.huy", 5, { huy: "sabırlı" }), kl("guven.sadakat", 3, { gorus: 14 })] };
const ARACI_SANS: Dokum = { toplam: 41, kalemler: [
  kl("sans.temel", 30), kl("sans.guven", 9, { gorus: 18 }), kl("sans.kirginlik", -8, { kirginlik: 24 }),
  kl("sans.sebep", -6, { sebep: "gorus.soylenti" }), kl("sans.bedel", 10, { bedel: "helallik" }), kl("sans.tanikLehte", 6),
] };
const KISKIRT_BILINEN: Kalem[] = [
  kl("sans.temel", 10), kl("sans.bakis", 4, { gorus: 14 }), kl("sans.huy", 15, { huy: "kurnaz" }), kl("sans.beceri", 1, { beceri: "soz" }),
];
const teklifKalemi = (t: string): Kalem => (kl("sans.teklif", t === "para" ? 15 : t === "ortaklik" ? 8 : t === "intikamPayi" ? 5 : 3, { teklif: t }));

export function sahteUcgenIstemci(b: SahteUcgenBaglami): UcgenIstemci {
  return {
    async oku({ npc, hedef }): Promise<EkSonuc<UcgenGorunumu>> {
      await bekle();
      if (npc) kur(b, npc);
      const g: UcgenGorunumu = {
        ay: b.ay,
        sozler: durum.sozler,
        talepler: {
          giden: durum.giden,
          gelen: durum.gelen.map((t) => ({ ...t, onizleme: { sans: ARACI_SANS, kirginlik: 24, bantlar: { baris: 20, sartli: 41, ateskes: 56 } } })),
          kapanan: durum.kapanan,
        },
        casus: durum.casus,
        barislar: durum.barislar,
        parametreler: PARAMETRELER,
      };
      if (npc) {
        g.onizleme = {
          npc, eksenler: { yakinlik: 12, guven: -6, saygi: 4, husumet: -8, borc: 2 }, gorunur: false,
          ...(hedef ? {
            kiskirt: {
              teklifler: Object.fromEntries(["para", "ortaklik", "intikamPayi", "soz"].map((t) => [t, { bilinen: [...KISKIRT_BILINEN, teklifKalemi(t)] }])),
              kaba: "soguk" as const,
            },
            casus: { ...(durum.casus ? { engel: "casus_var" } : {}), guven: GUVEN },
          } : {}),
        };
      }
      return ekBasarili(g);
    },
    async eylem(g): Promise<EkSonuc<UcgenYaniti>> {
      await bekle();
      switch (g.tur) {
        case "kiskirt": {
          const hedef = b.oyuncular.find((o) => o.id === g.hedef);
          if (!hedef) return ekBasarisiz("kisi_yok");
          const sans: Dokum = { toplam: 0, kalemler: [...KISKIRT_BILINEN, kl("sans.kizginlik", 9, { gorus: -18 }), teklifKalemi(g.teklif.t)] };
          if (g.teklif.t === "para") sans.kalemler[sans.kalemler.length - 1] = kl("sans.teklif", g.teklif.miktar ?? 1, { teklif: "para", miktar: g.teklif.miktar ?? 1 });
          sans.toplam = sans.kalemler.reduce((a, k) => a + k.d, 0);
          const soz: Soz = { id: `z${durum.n++}`, npc: { id: g.npc, ad: b.ad(g.npc) }, hedef, kurulus: b.ay, bitis: b.ay + 6, kaynak: "kiskirt", teklif: g.teklif.t, katilabilir: true };
          durum.sozler.push(soz);
          return ekBasarili({ tur: "kiskirt", sans, zar: 23, sonuc: "basari", getiri: { tekrar: 0, carpan: 1 },
            degisim: { beceri: { soz: 1 }, ...(g.teklif.t === "para" ? { para: -(g.teklif.miktar ?? 1) } : {}) }, soz });
        }
        case "katil": {
          const s = durum.sozler.find((x) => x.id === g.soz);
          if (!s) return ekBasarisiz("soz_yok");
          if (!s.katilabilir) return ekBasarisiz("aralik_dolu");
          s.katilabilir = false;
          const sans: Dokum = { toplam: 54, kalemler: <Kalem[]>[kl("sans.temel", 50), kl("sans.sadakat", 4, { gorus: 16 }), kl("sans.kizginlik", 5, { gorus: -20 }), kl("sans.huy", 5, { huy: "kurnaz" }), ...(g.hamle === "boykot" ? [kl("sans.hamle", -10, { hamle: "boykot" })] : [])] };
          sans.toplam = sans.kalemler.reduce((a, k) => a + k.d, 0);
          return ekBasarili({ tur: "katil", soz: s.id, hamle: g.hamle, sans, zar: 38, katildi: true, yakalandi: false,
            etki: g.hamle === "laf" ? { duyan: 2, guven: 58 } : { boykotBitis: b.ay + 3 } });
        }
        case "sozBoz":
          durum.sozler = durum.sozler.filter((x) => x.id !== g.soz);
          return ekBasarili({ tur: "sozBoz", soz: g.soz, degisim: { nam: { mertlik: -3 } } });
        case "araciIste": {
          const ar = b.oyuncular.find((o) => o.id === g.arabulucu);
          if (!ar) return ekBasarisiz("dost_degil");
          const t: Talep = { id: `r${durum.n++}`, taraf: { id: b.ben, ad: b.ad(b.ben) }, arabulucu: ar, npc: { id: g.npc, ad: b.ad(g.npc) }, bedel: g.bedel.t,
            ...(g.bedel.miktar ? { emanet: g.bedel.miktar } : {}), acilis: b.ay, sonAy: b.ay + 3, durum: "acik" };
          durum.giden.push(t);
          return ekBasarili({ tur: "araciIste", talep: t, ...(g.bedel.miktar ? { degisim: { para: -g.bedel.miktar } } : {}) });
        }
        case "araciKapat": {
          const t = [...durum.giden, ...durum.gelen].find((x) => x.id === g.talep);
          if (!t) return ekBasarisiz("talep_yok");
          durum.giden = durum.giden.filter((x) => x !== t);
          durum.gelen = durum.gelen.filter((x) => x !== t);
          const kapali: Talep = { ...t, durum: t.taraf.id === b.ben ? "geri" : "ret", sonuc: t.taraf.id === b.ben ? "geri" : "ret" };
          durum.kapanan.unshift(kapali);
          return ekBasarili({ tur: "araciKapat", talep: kapali });
        }
        case "arabulucu": {
          const t = durum.gelen.find((x) => x.id === g.talep);
          if (!t) return ekBasarisiz("talep_yok");
          durum.gelen = durum.gelen.filter((x) => x !== t);
          durum.kapanan.unshift({ ...t, durum: "bitti", sonuc: "sartli" });
          return ekBasarili({ tur: "arabulucu", talep: t.id, sans: ARACI_SANS, zar: 33, sonuc: "sartli", kirginlik: 24, sart: { deger: 24, tutar: 6, sonAy: b.ay + 6 },
            getiri: { tekrar: 0, carpan: 1 }, degisim: { nam: { mertlik: 2 }, beceri: { soz: 1 } } });
        }
        case "sartOde": {
          const br = durum.barislar.find((x) => x.npc.id === g.npc && x.sartli);
          if (!br?.sartli) return ekBasarisiz("sart_yok");
          const { deger, tutar } = br.sartli;
          br.deger += deger;
          delete br.sartli;
          return ekBasarili({ tur: "sartOde", deger, degisim: { para: -tutar } });
        }
        case "casus": {
          if (durum.casus) return ekBasarisiz("casus_var");
          const iz = b.oyuncular.find((o) => o.id === g.izlenen);
          if (!iz) return ekBasarisiz("kisi_yok");
          durum.casus = { id: `c${durum.n++}`, npc: { id: g.npc, ad: b.ad(g.npc) }, izlenen: iz, bitis: b.ay + g.ay };
          return ekBasarili({ tur: "casus", casus: { id: durum.casus.id, npc: g.npc, izlenen: iz.id, bitis: durum.casus.bitis },
            guven: GUVEN,
            carpikOran: 0.4, dusukGuven: 40, degisim: { para: -3 * g.ay } });
        }
      }
    },
  };
}
