// Geliştirici oturumu ve tasarım önizlemesi için sahte meslek uçları: sunucu yerlesim/meslek.ts, temel-is.ts,
// npc-taban.ts ve lonca.ts kurallarının sadeleştirilmiş kopyası (yanıt biçimi motor.ts #tekrarGuvenli ile aynı).
// Akçe ve takat sahte yerleşimin karakter nesnesiyle paylaşılır; uygulamada hiç çalışmaz.
import type { SahteKasaba } from "./sahte-yerlesim";
import {
  GERI_ALMA_ARALIK, KADEME_HIZMET_VARSAYILAN, MALLAR, MESLEKLER, MESLEK_YASI, AGIR_KALFA_YASI, NPC_AYLIK_KOTA, NPC_CARPAN, PIR_CIRAK,
  TEMEL_ISLER, TEMEL_IS_YASI, TEMEL_TAKAT,
} from "./meslek-veri";
import {
  basarili, basarisiz, MESLEK_IDLERI,
  type Dokum, type Envanter, type HataKodu, type IsId, type Kademe, type LoncaYaniti, type MalId, type MeslekId, type MeslekIlerleme,
  type MeslekIstegi, type MeslekKaydi, type MeslekYaniti, type Sonuc, type TabanAlIstegi, type TabanAlYaniti, type TemelIsIstegi, type TemelIsYaniti,
} from "./protokol";

const AZALAN_PENCERE_IS = 6;
const TEMEL_CIKTI = 3;
const MESLEK_TAKAT_DEGERI = [2, 3, 5, 8];
const KITLIK_PRIM = 0.5;
const YAN_CARPAN = 0.5;
const LONCA_DOLU = 2;
/** Sunucu meslekler.ts NPC_MESLEK_ESLEME. */
const NPC_ESLEME: Record<string, MeslekId | null> = {
  çiftçi: "ciftci", demirci: "demirci", tüccar: "tuccar", balıkçı: "ciftci", avcı: "ciftci", çoban: "ciftci", fırıncı: "asci",
  müzisyen: "ozan", şifacı: "sifaci", asker: "asker", işsiz: null,
};
/** Öbür sahte oyuncuların meslekleri: demirci bilerek boş (kıtlık fırsatı önizlemesi). */
const OBUR_OYUNCULAR: MeslekId[] = ["sifaci", "ciftci", "tuccar", "tuccar"];

export interface SahteMeslek {
  meslek(g: MeslekIstegi): Sonuc<MeslekYaniti>;
  temelIs(g: TemelIsIstegi): Sonuc<TemelIsYaniti>;
  tabanAl(g: TabanAlIstegi): Sonuc<TabanAlYaniti>;
  lonca(): LoncaYaniti;
  /** Sunucunun #ben'e eklemesi beklenen alanlar (önizleme sözleşmesi). */
  benEki(): { meslek: MeslekKaydi; kademeHizmet: number[]; envanter: Envanter };
}

/** `baslangic` verilirse o meslekte kalfa olarak başlar (önizleme: ağaç görünümü). */
export function sahteMeslekKur(kasaba: SahteKasaba, baslangic?: MeslekId): SahteMeslek {
  const kayit: MeslekKaydi = { a: "", y: "", s: {} };
  const ev: Record<string, number> = {};
  const tz: Partial<Record<IsId, number[]>> = {};
  let tb: [number, Record<string, number>] = [-1, {}];
  const ist = new Map<string, unknown>();
  const ek = () => kasaba.ekonomi();
  if (baslangic) {
    const m = MESLEKLER[baslangic];
    kayit.a = baslangic;
    kayit.s[baslangic] = { kd: 1, dl: [m.dallar[0], m.dallar[1]], dg: [`${m.id}.${m.dallar[0]}.0`, `${m.id}.${m.dallar[0]}.1`, `${m.id}.${m.dallar[1]}.0`], hz: 41, cy: 0 };
    Object.assign(ev, { odun: 4, tas: 2, kereste: 1 });
  }

  const ilerleme = (id: MeslekId): MeslekIlerleme => (kayit.s[id] ??= { kd: 0, dl: [], dg: [], hz: 0, cy: 0 });
  const envanterEkle = (mal: MalId, adet: number) => {
    const yeni = Math.max(0, (ev[mal] ?? 0) + adet);
    if (yeni === 0) delete ev[mal];
    else ev[mal] = yeni;
  };
  const oyuncuSayisi = (m: MeslekId) => OBUR_OYUNCULAR.filter((x) => x === m).length + (kayit.a === m ? 1 : 0);
  const satisDegeri = (mal: MalId) => {
    const taban = MALLAR[mal].taban;
    return taban + (oyuncuSayisi(MALLAR[mal].meslek) === 0 && taban > 0 ? Math.ceil(taban * KITLIK_PRIM) : 0);
  };
  const dugumAcik = (id: string) => kayit.s[id.split(".")[0] as MeslekId]?.dg.includes(id) ?? false;
  const kopya = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
  /** #tekrarGuvenli: aynı istekNo aynı yanıtı döndürür; yanıta envanter, para ve takat eklenir. */
  function tekrarGuvenli<T>(no: string, isle: () => Sonuc<Record<string, unknown>>): Sonuc<T> {
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(no)) return basarisiz("istekno_gecersiz");
    if (ist.has(no)) return basarili(ist.get(no) as T);
    const r = isle();
    if (!r.ok) return r;
    const { kar } = ek();
    const yanit = kopya({ ...r.deger, envanter: ev, para: kar.pa, takat: kar.tk });
    ist.set(no, yanit);
    return basarili(yanit as T);
  }
  const hata = (k: HataKodu): Sonuc<never> => basarisiz(k);
  const secili = (id: MeslekId) => (kayit.a === id || kayit.y === id ? { m: MESLEKLER[id], i: ilerleme(id) } : null);

  return {
    meslek(g) {
      return tekrarGuvenli<MeslekYaniti>(g.istekNo, () => {
        const { yas, ay } = ek();
        const m = MESLEKLER[g.meslek];
        if (!m) return hata("meslek_gecersiz");
        if (g.islem === "sec") {
          if (yas < MESLEK_YASI) return hata("yas_kapisi");
          kayit.a = m.id;
          if (kayit.y === m.id) kayit.y = "";
          ilerleme(m.id);
        } else if (g.islem === "yan") {
          if (!kayit.a) return hata("meslek_yok");
          if (kayit.a === m.id) return hata("meslek_gecersiz");
          if (yas < MESLEK_YASI) return hata("yas_kapisi");
          kayit.y = m.id;
          ilerleme(m.id);
        } else {
          const s = secili(m.id);
          if (!s) return hata("meslek_yok");
          const { i } = s;
          if (g.islem === "kademe") {
            if (i.kd >= 3) return hata("kademe_kapali");
            const hedef = (i.kd + 1) as Kademe;
            if (i.hz < KADEME_HIZMET_VARSAYILAN[hedef]) return hata("kademe_kapali");
            if (hedef === 1 && m.agir && yas < AGIR_KALFA_YASI) return hata("kademe_kapali");
            if (hedef === 3 && i.cy < PIR_CIRAK) return hata("kademe_kapali");
            i.kd = hedef;
          } else if (g.islem === "dal") {
            if (!g.dal || !m.dallar.includes(g.dal)) return hata("meslek_gecersiz");
            if (!i.dl.includes(g.dal)) {
              if (i.dl.length >= Math.min(i.kd + 1, 3)) return hata("dal_kapali");
              i.dl.push(g.dal);
            }
          } else if (g.islem === "dugum" || g.islem === "geriAl") {
            const d = m.dugumler.find((x) => x.id === g.dugum);
            if (!d) return hata("meslek_gecersiz");
            if (g.islem === "dugum") {
              if (!i.dg.includes(d.id)) {
                if (!i.dl.includes(d.dal)) return hata("dal_kapali");
                if (d.kd > i.kd) return hata("dugum_kapali");
                if (d.kd > 0 && !i.dg.includes(`${m.id}.${d.dal}.${d.kd - 1}`)) return hata("dugum_kapali");
                if (d.kd === 3 && i.dg.some((x) => x.endsWith(".3"))) return hata("dugum_kapali");
                i.dg.push(d.id);
              }
            } else {
              if (!i.dg.includes(d.id) || i.dg.includes(`${m.id}.${d.dal}.${d.kd + 1}`)) return hata("dugum_kapali");
              if (ay - (kayit.ga ?? -1e9) < GERI_ALMA_ARALIK) return hata("geri_alma_dolu");
              i.dg = i.dg.filter((x) => x !== d.id);
              kayit.ga = ay;
            }
          } else return hata("gecersiz_istek");
        }
        return basarili({ meslek: kayit, kademeHizmet: [...KADEME_HIZMET_VARSAYILAN] });
      });
    },
    temelIs(g) {
      return tekrarGuvenli<TemelIsYaniti>(g.istekNo, () => {
        const { kar, yas, ay } = ek();
        const is = TEMEL_ISLER[g.is];
        if (!is) return hata("eylem_gecersiz");
        if (yas < TEMEL_IS_YASI) return hata("yas_kapisi");
        const usta = !!is.usta && dugumAcik(is.usta.dugum);
        const mal = usta && is.usta ? is.usta.mal : is.mal;
        const n = (tz[g.is] ?? []).filter((x) => ay - x < AZALAN_PENCERE_IS).length;
        const adet = Math.floor(TEMEL_CIKTI / (1 + n));
        if (adet <= 0) return hata("verim_yok");
        const kalemler = [{ k: "bu_is", d: adet * satisDegeri(mal) }];
        if (kayit.a && kayit.a !== is.meslek) kalemler.push({ k: "meslekte", d: -MESLEK_TAKAT_DEGERI[kayit.s[kayit.a]?.kd ?? 0] * TEMEL_TAKAT });
        const firsat: Dokum = { toplam: kalemler.reduce((a, x) => a + x.d, 0), kalemler };
        if (kar.tk < TEMEL_TAKAT) return hata("takat_yok");
        kar.tk -= TEMEL_TAKAT;
        tz[g.is] = [...(tz[g.is] ?? []).filter((x) => ay - x < AZALAN_PENCERE_IS), ay];
        envanterEkle(mal, adet);
        const carpan = kayit.a === is.meslek ? 1 : kayit.y === is.meslek ? YAN_CARPAN : 0;
        if (carpan) ilerleme(is.meslek).hz += carpan;
        return basarili({ is: g.is, mal, adet, usta, hizmet: carpan, firsat, takat: kar.tk });
      });
    },
    tabanAl(g) {
      return tekrarGuvenli<TabanAlYaniti>(g.istekNo, () => {
        const { kar, ay } = ek();
        const bilgi = MALLAR[g.mal];
        if (!bilgi || bilgi.taban === 0 || !Number.isInteger(g.adet) || g.adet < 1) return hata("mal_gecersiz");
        if (tb[0] !== ay) tb = [ay, {}];
        const alinan = tb[1][g.mal] ?? 0;
        if (alinan + g.adet > NPC_AYLIK_KOTA) return hata("kota_doldu");
        const toplam = Math.ceil(bilgi.taban * NPC_CARPAN);
        const fiyat: Dokum = { toplam, kalemler: [{ k: "taban", d: bilgi.taban }, { k: "npc_pahali", d: toplam - bilgi.taban }] };
        if (kar.pa < toplam * g.adet) return hata("para_yok");
        kar.pa -= toplam * g.adet;
        tb[1][g.mal] = alinan + g.adet;
        envanterEkle(g.mal, g.adet);
        return basarili({ fiyat, adet: g.adet, para: kar.pa });
      });
    },
    lonca() {
      const npc = new Map<MeslekId, number>();
      for (const ad of ek().npcMeslekleri()) {
        const m = NPC_ESLEME[ad];
        if (m) npc.set(m, (npc.get(m) ?? 0) + 1);
      }
      return {
        lonca: MESLEK_IDLERI.map((meslek) => {
          const o = oyuncuSayisi(meslek);
          return { meslek, oyuncu: o, npc: npc.get(meslek) ?? 0, durum: o === 0 ? "bos" : o < LONCA_DOLU ? "az" : "dolu" };
        }),
      };
    },
    benEki: () => kopya({ meslek: kayit, kademeHizmet: [...KADEME_HIZMET_VARSAYILAN], envanter: ev }),
  };
}
