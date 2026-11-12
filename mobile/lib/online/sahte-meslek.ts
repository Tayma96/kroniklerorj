// Geliştirici oturumu ve tasarım önizlemesi için sahte meslek uçları: sunucu yerlesim/meslek.ts, temel-is.ts,
// npc-taban.ts, lonca.ts, hal.ts, tarif.ts, pazar.ts ve siparis.ts kurallarının sadeleştirilmiş kopyası (yanıt biçimi
// motor.ts #tekrarGuvenli ile aynı).
// Akçe ve takat sahte yerleşimin karakter nesnesiyle paylaşılır; uygulamada hiç çalışmaz.
import type { SahteKasaba } from "./sahte-yerlesim";
import {
  ALET_OMRU, DUGUM_BEDEL, GERI_ALMA_ARALIK, HAL_TAVAN, KADEME_HIZMET_VARSAYILAN, KONDISYON_KADEMELERI, MALLAR, MESLEKLER, MESLEK_YASI,
  AGIR_KALFA_YASI, NPC_AYLIK_KOTA, NPC_CARPAN, npcSatisKotasi, PIR_CIRAK, TARIFLER, TEMEL_ISLER, TEMEL_IS_YASI, TEMEL_TAKAT,
  beceriPuaniYerel, kitlikPrimi, tarifListesiYerel,
} from "./meslek-veri";
import {
  basarili, basarisiz, MESLEK_IDLERI,
  type BeceriHaritasi, type Dil, type Dokum, type Envanter, type Gosterge, type HalEtki, type HalGorunumu, type HalNedeni, type HataKodu, type IsId,
  type Kademe, type KisiAdi, type LoncaYaniti, type MalId, type MeslekId, type MeslekIlerleme, type MeslekIstegi, type MeslekKaydi, type MeslekYaniti,
  type SatIstegi, type SatYaniti, type SiparisDurumu, type SiparislerYaniti, type SiparisTeslimIstegi, type SiparisTeslimYaniti, type Sonuc,
  type TabanAlIstegi, type TabanAlYaniti, type TarifIstegi, type TarifSatiri, type TarifYaniti, type TemelIsIstegi, type TemelIsYaniti,
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

/** Sunucu hal.ts sabitleri (sahte): toparlama ve emek başına kondisyon kaybı, sipariş gönülü, can eşiği. */
const IS_KONDISYON = 3;
const GONUL_SIPARIS = 3;
const CAN_YARALI_ESIGI = 50;
const HAL_TABAN_CAN = 10;
const SIPARIS_ODUL_CARPANI = 1.5;
const SIPARIS_HIZMET = 3;
const SIPARIS_ISTEYEN_GORUS = 6;
const SIPARIS_GORUS = 2;
/** Etki nesnesi (anahtar sunucudaki gibi; çevirisi onl. önekiyle). */
const etki = (anahtar: string, p: Record<string, number>): HalEtki => ({ k: anahtar, p });

interface SSiparis { id: string; mal: MalId; adet: number; odul: number; npc: string; acilis: number; son: number; durum: SiparisDurumu; alan?: KisiAdi; teslimAy?: number }

export interface SahteMeslek {
  meslek(g: MeslekIstegi): Sonuc<MeslekYaniti>;
  temelIs(g: TemelIsIstegi): Sonuc<TemelIsYaniti>;
  tabanAl(g: TabanAlIstegi): Sonuc<TabanAlYaniti>;
  lonca(): LoncaYaniti;
  tarif(g: TarifIstegi): Sonuc<TarifYaniti>;
  sat(g: SatIstegi): Sonuc<SatYaniti>;
  siparisler(dil: Dil): SiparislerYaniti;
  siparisTeslim(g: SiparisTeslimIstegi): Sonuc<SiparisTeslimYaniti>;
  /** Sunucunun #ben'e eklediği alanlar (motor.ts #ben) ve kondisyona bağlı aylık takat. */
  benEki(): { meslek: MeslekKaydi | null; kademeHizmet: number[]; envanter: Envanter; beceri: BeceriHaritasi; hal: HalGorunumu; tarifler: TarifSatiri[]; takatAylik: number };
}

/** `baslangic` verilirse o meslekte kalfa olarak başlar (önizleme: ağaç görünümü). */
export function sahteMeslekKur(kasaba: SahteKasaba, baslangic?: MeslekId, profilAd = ""): SahteMeslek {
  const kayit: MeslekKaydi = { a: "", y: "", s: {} };
  const ev: Record<string, number> = {};
  const tz: Partial<Record<IsId, number[]>> = {};
  let tb: [number, Record<string, number>] = [-1, {}];
  const ist = new Map<string, unknown>();
  const ek = () => kasaba.ekonomi();
  // Hal: önizlemede biraz yorgun ve gönlü hoş; son nedenler görünsün diye iki değişim.
  const hal = { can: 74, kondisyon: 52, gonul: 64 };
  const nedenler: HalNedeni[] = [];
  const as: Partial<Record<string, number>> = {};
  let ns: [number, Record<string, number>] = [-1, {}];
  const siparisler: SSiparis[] = [];
  if (baslangic) {
    const m = MESLEKLER[baslangic];
    kayit.a = baslangic;
    kayit.s[baslangic] = { kd: 1, dl: [m.dallar[0], m.dallar[1]], dg: [`${m.id}.${m.dallar[0]}.0`, `${m.id}.${m.dallar[0]}.1`, `${m.id}.${m.dallar[1]}.0`], hz: 41, cy: 0 };
    Object.assign(ev, { odun: 4, tas: 2, kereste: 1, cevher: 3, komur: 1, nal: 1 });
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
  const kirp = (x: number, alt: number) => Math.max(alt, Math.min(HAL_TAVAN, x));
  const kademe = () => KONDISYON_KADEMELERI.find((x) => hal.kondisyon >= x.alt) ?? KONDISYON_KADEMELERI[2];
  /** Sunucu halDegistir: sınır içinde değiştirir, aynı ay aynı nedeni birleştirir, son 3 nedeni tutar. */
  const halDegistir = (g: Gosterge, fark: number, neden: string): number => {
    const once = hal[g];
    hal[g] = kirp(once + fark, g === "can" ? HAL_TABAN_CAN : 0);
    const gercek = hal[g] - once;
    if (!gercek) return 0;
    const { ay } = ek();
    const i = nedenler.findIndex((x) => x.gosterge === g && x.neden === neden && x.ay === ay);
    const eski = i >= 0 ? nedenler.splice(i, 1)[0].fark : 0;
    nedenler.unshift({ gosterge: g, fark: eski + gercek, neden, ay });
    nedenler.length = Math.min(nedenler.length, 3);
    return gercek;
  };
  const halGorunumu = (): HalGorunumu => {
    const yarali = hal.can < CAN_YARALI_ESIGI;
    const kk = kademe();
    const gd = hal.gonul >= 70 ? { durum: "sen" as const, sans: 5 } : hal.gonul >= 30 ? { durum: "olagan" as const, sans: 0 } : { durum: "kirgin" as const, sans: -10 };
    return {
      can: { deger: hal.can, durum: yarali ? "yarali" : "saglam", etki: etki(`hal.can.${yarali ? "yarali" : "saglam"}`, { taban: HAL_TABAN_CAN, toparlama: 5, kondisyonToparlama: yarali ? 7 : 15, esik: CAN_YARALI_ESIGI }) },
      kondisyon: { deger: hal.kondisyon, kademe: kk.kademe, etki: etki(`hal.kondisyon.${kk.kademe}`, { takatAylik: kk.takat, isBasina: -IS_KONDISYON }) },
      gonul: { deger: hal.gonul, durum: gd.durum, etki: etki(`hal.gonul.${gd.durum}`, { sans: gd.sans, denge: 50 }) },
      nedenler: kopya(nedenler),
    };
  };
  const beceri = (): BeceriHaritasi =>
    Object.fromEntries(Object.entries(kayit.s).map(([m, i]) => [m, beceriPuaniYerel(i as MeslekIlerleme)])) as BeceriHaritasi;
  const tarifler = () => tarifListesiYerel(dugumAcik, ev, ek().kar.tk, as);
  const profilAdi = () => profilAd;

  // Önizleme tohumu: iki Hal nedeni; açık iki ilan, başka oyuncunun teslim ettiği bir sipariş (teşekkür izi), düşen bir sipariş.
  {
    const { ay } = ek();
    nedenler.push({ gosterge: "kondisyon", fark: -6, neden: "hal.neden.temelIs", ay }, { gosterge: "gonul", fark: 3, neden: "hal.neden.sohbet", ay: ay - 1 });
    const kisiler = ek().yetiskinler("tr");
    const kisi = (n: number) => kisiler[n % Math.max(1, kisiler.length)]?.id ?? "n1";
    const odul = (mal: MalId, adet: number) => Math.ceil(adet * (MALLAR[mal].taban + (oyuncuSayisi(MALLAR[mal].meslek) === 0 ? kitlikPrimi(mal) : 0)) * SIPARIS_ODUL_CARPANI);
    siparisler.push(
      { id: `s${ay - 5}_0`, mal: "tahil", adet: 4, odul: odul("tahil", 4), npc: kisi(7), acilis: ay - 5, son: ay - 1, durum: "dustu" },
      { id: `s${ay - 3}_0`, mal: "komur", adet: 3, odul: odul("komur", 3), npc: kisi(4), acilis: ay - 3, son: ay + 1, durum: "teslim", alan: { id: "o1", ad: "Ayşe" }, teslimAy: ay - 2 },
      { id: `s${ay - 2}_0`, mal: "kereste", adet: 2, odul: odul("kereste", 2), npc: kisi(2), acilis: ay - 2, son: ay + 1, durum: "acik" },
      { id: `s${ay}_0`, mal: "nal", adet: 3, odul: odul("nal", 3), npc: kisi(0), acilis: ay, son: ay + 4, durum: "acik" },
    );
    kasaba.ekonomi().olayYaz({ t: "siparis", w: "o1", h: kisi(4), n: 5, anahtar: "olay.siparis.teslim", p: { kim: { r: "o1" }, mal: "komur", adet: 3, isteyen: { r: kisi(4) } } }, "tr", 2);
    kasaba.ekonomi().olayYaz({ t: "siparis", w: kisi(0), h: "", n: 3, anahtar: "olay.siparis.acildi", p: { isteyen: { r: kisi(0) }, mal: "nal", adet: 3, odul: odul("nal", 3) } }, "tr");
  }
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
                if (beceriPuaniYerel(i).kalan < DUGUM_BEDEL[d.kd]) return hata("puan_yok");
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
        return basarili({ meslek: kayit, kademeHizmet: [...KADEME_HIZMET_VARSAYILAN], beceri: beceri(), tarifler: tarifler() });
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
        halDegistir("kondisyon", -IS_KONDISYON * TEMEL_TAKAT, "hal.neden.temelIs");
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
    tarif(g) {
      return tekrarGuvenli<TarifYaniti>(g.istekNo, () => {
        const { kar } = ek();
        const t = TARIFLER.find((x) => x.id === g.tarif);
        if (!t) return hata("tarif_gecersiz");
        if (!dugumAcik(t.dugum)) return hata("dugum_kapali");
        if (Object.entries(t.girdi).some(([mal, n]) => (ev[mal] ?? 0) < (n ?? 0))) return hata("girdi_yok");
        if (kar.tk < t.takat) return hata("takat_yok");
        kar.tk -= t.takat;
        for (const [mal, n] of Object.entries(t.girdi)) envanterEkle(mal as MalId, -(n ?? 0));
        let adet = t.cikti[1];
        let arac: TarifYaniti["arac"] = null;
        if (t.arac && (ev[t.arac.mal] ?? 0) > 0) {
          adet = t.arac.adet;
          const kullanim = (as[t.arac.mal] ?? 0) + 1;
          const asindi = kullanim >= ALET_OMRU;
          if (asindi) { envanterEkle(t.arac.mal, -1); delete as[t.arac.mal]; } else as[t.arac.mal] = kullanim;
          arac = { mal: t.arac.mal, kullanim, omur: ALET_OMRU, asindi };
        }
        envanterEkle(t.cikti[0], adet);
        const carpan = kayit.a === t.meslek ? 1 : kayit.y === t.meslek ? YAN_CARPAN : 0;
        if (carpan) ilerleme(t.meslek).hz += t.hizmet * carpan;
        halDegistir("kondisyon", -IS_KONDISYON * t.takat, "hal.neden.tarif");
        return basarili({ tarif: t.id, cikti: { mal: t.cikti[0], adet }, girdi: t.girdi, arac, hizmet: t.hizmet * carpan, hal: halGorunumu(), tarifler: tarifler() });
      });
    },
    sat(g) {
      return tekrarGuvenli<SatYaniti>(g.istekNo, () => {
        const { kar, ay } = ek();
        const bilgi = MALLAR[g.mal];
        if (!bilgi || bilgi.taban === 0 || !Number.isInteger(g.adet) || g.adet < 1) return hata("mal_gecersiz");
        if ((ev[g.mal] ?? 0) < g.adet) return hata("mal_yok");
        if (ns[0] !== ay) ns = [ay, {}];
        const once = ns[1][g.mal] ?? 0;
        const kotaTavan = npcSatisKotasi(g.mal, oyuncuSayisi(bilgi.meslek));
        if (once + g.adet > kotaTavan) return hata("kota_doldu");
        const kalemler = [{ k: "taban", d: bilgi.taban }];
        if (oyuncuSayisi(bilgi.meslek) === 0) kalemler.push({ k: "kitlik", d: kitlikPrimi(g.mal) });
        const birim: Dokum = { toplam: kalemler.reduce((a, x) => a + x.d, 0), kalemler };
        ns[1][g.mal] = once + g.adet;
        envanterEkle(g.mal, -g.adet);
        kar.pa += birim.toplam * g.adet;
        const satilan = once + g.adet;
        return basarili({ mal: g.mal, adet: g.adet, birim, tutar: birim.toplam * g.adet, kota: { satilan, tavan: kotaTavan, kalan: kotaTavan - satilan } });
      });
    },
    siparisler(dil) {
      const { ay } = ek();
      const adlar = new Map(ek().yetiskinler(dil).map((n) => [n.id, n.ad]));
      return {
        siparisler: [...siparisler].reverse().map((s) => {
          const elde = ev[s.mal] ?? 0;
          const acik = s.durum === "acik" && ay < s.son;
          return {
            id: s.id, mal: s.mal, adet: s.adet, odul: s.odul, hizmet: SIPARIS_HIZMET, meslek: MALLAR[s.mal].meslek, acilis: s.acilis, son: s.son,
            kalanAy: Math.max(0, s.son - ay), durum: s.durum, isteyen: adlar.has(s.npc) ? { id: s.npc, ad: adlar.get(s.npc) ?? "" } : null,
            alan: s.alan ?? null, teslimAy: s.teslimAy ?? null, elde, teslimEdebilir: acik && elde >= s.adet,
          };
        }),
      };
    },
    siparisTeslim(g) {
      return tekrarGuvenli<SiparisTeslimYaniti>(g.istekNo, () => {
        const { kar, ay, benId } = ek();
        const s = siparisler.find((x) => x.id === g.siparis);
        if (!s) return hata("siparis_yok");
        if (s.durum !== "acik" || ay >= s.son) return hata("siparis_kapandi");
        if ((ev[s.mal] ?? 0) < s.adet) return hata("mal_yok");
        envanterEkle(s.mal, -s.adet);
        kar.pa += s.odul;
        s.durum = "teslim";
        s.alan = { id: benId, ad: profilAdi() };
        s.teslimAy = ay;
        const m = MALLAR[s.mal].meslek;
        const carpan = kayit.a === m ? 1 : kayit.y === m ? YAN_CARPAN : 0;
        if (carpan) ilerleme(m).hz += SIPARIS_HIZMET * carpan;
        const gonul = halDegistir("gonul", GONUL_SIPARIS, "hal.neden.siparis");
        const gorus: Record<string, number> = { [s.npc]: SIPARIS_ISTEYEN_GORUS };
        for (const n of ek().yetiskinler(g.dil ?? "tr").slice(0, 4)) if (n.id !== s.npc) gorus[n.id] = SIPARIS_GORUS;
        const olay = ek().olayYaz({ t: "siparis", w: benId, h: s.npc, n: 5, anahtar: "olay.siparis.teslim", p: { kim: { r: benId }, mal: s.mal, adet: s.adet, isteyen: { r: s.npc } } }, g.dil ?? "tr");
        return basarili({ siparis: s.id, mal: s.mal, adet: s.adet, odul: s.odul, hizmet: SIPARIS_HIZMET * carpan, gonul, gorus, hal: halGorunumu(), olay });
      });
    },
    benEki: () => kopya({
      meslek: kayit.a || kayit.y ? kayit : null, kademeHizmet: [...KADEME_HIZMET_VARSAYILAN], envanter: ev, beceri: beceri(), hal: halGorunumu(),
      tarifler: tarifler(), takatAylik: kademe().takat,
    }),
  };
}
