// Geliştirici/önizleme için sahte atölye (tezgâh Dilim 2 + Dilim 3). Senaryo: oyuncunun 1. atölyesi (Elif Nur, demirci
// zanaatı, seviye 1 → iki tezgâh): bir açık emir (alet), emek havuzu ve maaşı karşılanamayan bir NPC, ay sonu dökümü
// (kanca kalemiyle), üç toplu sipariş (nal: damgalı mal yeterli → indirimli; alet: damgalı mal az → tam adet; tahıl:
// zanaat dışı) ve kapanmış biri, ustalık etkileri (kalite ve toplu indirim; depo bir çalışan ustadan). Sunucunun kaba
// bir taklididir: sayılar ve neden kodları aynı biçimde gelir, gerçek hesap sunucudadır. Durum yerleşim başına tektir;
// sahte tezgâh (GET …/tezgah) ile sahte atölye istemcisi (yazmalar) aynı depoyu ve emirleri paylaşır.
import { ekBasarili, ekBasarisiz, type EkHata, type EkSonuc } from "./ek-istemci";
import { TARIFLER } from "./meslek-veri";
import type { AtolyeIstemci, AtolyeKarti, AtolyeListesi } from "./atolye-veri";
import type { AtolyeBolumu, DepoSatiri, GenisletmeGorunumu, GunSonu, Kademe, KancaDokumu, TopluSiparis, UretimEmri } from "./tezgah-veri";

/** Sunucunun istemcide tanımsız atölye kodu (`ham`), gerçek istemcinin döndürdüğü biçimde. */
const hamHata = <T,>(kod: string): EkSonuc<T> => ({ ok: false, hata: "gecersiz_istek" as EkHata, ham: kod });
/** Sunucu kalite kalemi kimliği ("kalite.atolye" gibi; metin anahtarı değil). */
const kk = (ad: string, enAz: number, enCok: number) => ({ k: "kalite." + ad, enAz, enCok });

const AY = 40;
const bekle = () => new Promise<void>((r) => setTimeout(r, 80));
/** [PARAMETRE] sunucu aynası: tezgâh sayısı seviyeye göre, emek havuzu tezgâh×6, tek mesai ≤18, emir ≤24, toplu indirim tavanı 10. */
const TEZGAH = [1, 2, 3, 4, 5];
const TEK_MESAI = 18;
const EMIR_KEZ = 24;
const TOPLU_INDIRIM = 10;
const DEPO_KAP = 72;
const BEN = { id: "o1", ad: "Elif Nur" };

interface HamToplu { id: string; meslek: string; mal: string; adet: number; deger: number; odul: number; kalanAy: number; durum: "acik" | "teslim"; alan: TopluSiparis["alan"] }
export interface SahteAtolye {
  isletme: string; zanaat: string | null; zs: number; seviye: number; kademe: number; emirler: UretimEmri[]; en: number; havuz: number; takat: number;
  depo: DepoSatiri[]; damgali: Record<string, number>; toplu: HamToplu[]; gs: GunSonu;
}

const tekler = new Map<string, SahteAtolye>();

/** Yerleşimin sahte atölye durumu (uygulama boyunca tek). */
export function sahteAtolyeDurumu(yer: string): SahteAtolye {
  let d = tekler.get(yer);
  if (d) return d;
  d = {
    isletme: `${yer}.atolye.1`, zanaat: "demirci", zs: 1, seviye: 1, kademe: 1, en: 1, havuz: 7, takat: 8,
    emirler: [{ no: 1, tarif: "alet", kez: 6, yapilan: 2, kalan: 4, acilis: AY - 2, acan: BEN }],
    depo: [
      { mal: "nal", kalite: 0, adet: 14 }, { mal: "nal", kalite: 1, adet: 8 }, { mal: "alet", kalite: 1, adet: 11 },
      { mal: "cevher", kalite: 0, adet: 6 }, { mal: "komur", kalite: 0, adet: 5 }, { mal: "kereste", kalite: 0, adet: 4 }, { mal: "tas", kalite: 0, adet: 12 },
    ],
    damgali: { nal: 19, alet: 4 },
    toplu: [
      { id: "ts1", meslek: "demirci", mal: "nal", adet: 20, deger: 60, odul: 84, kalanAy: 2, durum: "acik", alan: null },
      { id: "ts2", meslek: "demirci", mal: "alet", adet: 12, deger: 60, odul: 84, kalanAy: 2, durum: "acik", alan: null },
      { id: "ts3", meslek: "ciftci", mal: "tahil", adet: 30, deger: 60, odul: 84, kalanAy: 1, durum: "acik", alan: null },
      { id: "ts0", meslek: "oduncu", mal: "kereste", adet: 16, deger: 48, odul: 67, kalanAy: 0, durum: "teslim", alan: { isletme: `${yer}.atolye.2`, ad: "Kerem Ocağı", ay: AY - 1 } },
    ],
    gs: {
      ay: AY - 1, kepenk: false, anlik: false, yapim: 3, emek: { oyuncuOnce: 10, oyuncuSonra: 7, npcVerilen: 2, npcKullanilan: 2 },
      npc: { sozlesme: 2, emekVeren: 1, maassiz: 1, neden: "emanet_maas_yetmez" },
      emirler: [{
        emir: 1, tarif: "alet", kez: 6, yapilan: 2, buAy: 2, cikti: { mal: "alet", adet: 2 }, kalite: [0, 1, 1, 0], usta: BEN, emek: { oyuncu: 3, npc: 1 }, neden: "girdi_yok",
        kaliteDokum: { kalemler: [kk("atolye", 5, 5), kk("kanca", 8, 8), kk("npcEmegi", -30, 0), kk("zar", -10, 10)], toplam: { enAz: -27, enCok: 23 } },
      }],
    },
  };
  tekler.set(yer, d);
  return d;
}

const tezgahSayisi = (a: SahteAtolye) => TEZGAH[Math.min(4, a.seviye + a.kademe - 1)] ?? 1;
const emekTavani = (a: SahteAtolye) => tezgahSayisi(a) * 6;
const depoda = (a: SahteAtolye, mal: string) => a.depo.reduce((n, x) => (x.mal === mal ? n + x.adet : n), 0);
const depoDolu = (a: SahteAtolye) => a.depo.reduce((n, x) => n + x.adet, 0);
function depodanAl(a: SahteAtolye, mal: string, n: number) {
  for (const x of a.depo) { if (x.mal !== mal || n <= 0) continue; const k = Math.min(x.adet, n); x.adet -= k; n -= k; }
  for (let i = a.depo.length - 1; i >= 0; i--) if (a.depo[i]!.adet <= 0) a.depo.splice(i, 1);
  a.damgali = Object.fromEntries(Object.entries(a.damgali).map(([m, v]) => [m, Math.min(v, depoda(a, m))]));
}
function depoyaKoy(a: SahteAtolye, mal: string, q: Kademe, n: number, damga: boolean) {
  const x = a.depo.find((y) => y.mal === mal && y.kalite === q);
  if (x) x.adet += n; else a.depo.push({ mal, kalite: q, adet: n });
  if (damga) a.damgali[mal] = (a.damgali[mal] ?? 0) + n;
}

/** Sahte kanca dökümleri (sunucu kanca.ts biçimi): kalite oyuncudan, toplu indirim ve depo çalışan ustadan. */
function kancalar(a: SahteAtolye): Record<string, KancaDokumu> {
  const k: Record<string, KancaDokumu> = { depo: { deger: 15, tavan: 25, kisiAd: "Usta Rıza", kalemler: [{ kanca: "hak:tahilSaklama", d: 15 }] } };
  if (a.zanaat === "demirci") {
    k.atolyeKalite = { deger: 8, tavan: 10, kisiAd: BEN.ad, kalemler: [{ kanca: "hak:ustaDamgasi", d: 5 }, { kanca: "hak:ustalarLevhasi", d: 3 }] };
    k.topluIndirim = { deger: TOPLU_INDIRIM, tavan: 10, kisiAd: "Usta Rıza", kalemler: [{ kanca: "hak:topluAletSiparisi", d: 10 }, { kanca: "hak:orduSiparisi", d: 10 }] };
  }
  return k;
}

/** Toplu siparişin bu atölyeye göre görünümü (sunucu toplu-siparis.ts teslimPlani taklidi). */
function topluGorunumu(a: SahteAtolye, s: HamToplu): TopluSiparis {
  const acik = s.durum === "acik" && s.kalanAy > 0;
  const zanaatta = a.zanaat === s.meslek;
  const ind = zanaatta ? kancalar(a).topluIndirim?.deger ?? 0 : 0;
  const indAdet = Math.max(1, s.adet - Math.floor((s.adet * ind) / 100));
  const damgaYeter = indAdet < s.adet && (a.damgali[s.mal] ?? 0) >= indAdet;
  const teslimAdet = damgaYeter ? indAdet : s.adet;
  const dp = depoda(a, s.mal);
  return {
    id: s.id, meslek: s.meslek, mal: s.mal, adet: s.adet, deger: s.deger, odul: s.odul,
    odulDokum: { toplam: s.odul, kalemler: [{ k: "taban", d: s.deger }, { k: "toplu_carpani", d: s.odul - s.deger }] },
    acilis: AY - 1, son: AY - 1 + 2, kalanAy: s.kalanAy, durum: s.durum, alan: s.alan,
    depoda: dp, teslimAdet, indirimYuzde: damgaYeter ? ind : 0, teslimEdebilir: acik && zanaatta && dp >= teslimAdet, ustUste: false,
  };
}

/** GET …/tezgah'ın atölyeye özgü ekleri (yalnız sahibine). */
export function sahteAtolyeGorunumu(a: SahteAtolye): { atolye: AtolyeBolumu; kanca: Record<string, KancaDokumu>; genisletme: GenisletmeGorunumu; depoKapasite: number } {
  const sayi = tezgahSayisi(a);
  return {
    depoKapasite: DEPO_KAP,
    kanca: kancalar(a),
    genisletme: {
      kademe: a.kademe, seviye: a.seviye,
      sonraki: a.kademe >= 4 ? null : { hedef: Math.min(5, sayi + 1), malzeme: [{ mal: "kereste", adet: 6, depoda: depoda(a, "kereste"), taban: 8 }, { mal: "tas", adet: 10, depoda: depoda(a, "tas"), taban: 10 }] },
    },
    atolye: {
      zanaat: a.zanaat, zanaatOneri: a.zanaat ? null : "demirci", zanaatlar: ["oduncu", "demirci", "marangoz", "dokumaci", "asci", "sifaci", "katip"],
      zanaatDegisim: { yapilan: a.zs, ucretsizKalan: Math.max(0, 1 - a.zs), bedel: a.zs >= 1 ? 30 : 0 },
      tezgah: { sayi, acikEmir: a.emirler.length }, kaliteBonus: 5 * a.seviye,
      emek: { havuz: a.havuz, tavan: emekTavani(a), tekEnCok: TEK_MESAI, npcCalisan: 1, npcAylik: 2, npc: { sozlesme: 2, emekVeren: 1, maassiz: 1, neden: "emanet_maas_yetmez" }, npcKaliteCeza: 30, npcMaasEnAz: 38 },
      emirler: a.emirler.map((e) => ({ ...e, kalan: e.kez - e.yapilan })), emirKezEnCok: EMIR_KEZ, sonUretimAyi: AY - 1,
      topluSiparis: a.toplu.map((s) => topluGorunumu(a, s)), benimTakat: a.takat,
    },
  };
}

/** Geliştirici modunun atölye istemcisi: sahte tezgâhla aynı durumu yazar. */
export function sahteAtolyeIstemci(yer: string): AtolyeIstemci {
  const a = sahteAtolyeDurumu(yer);
  const benimMi = (id: string) => id === a.isletme;
  return {
    async atolyeler() {
      await bekle();
      const l: AtolyeKarti[] = [
        { isletme: a.isletme, no: 1, ad: "", sahip: BEN, seviye: a.seviye, itibar: 16, zanaat: a.zanaat, kepenk: false, benim: true, devralinabilir: false },
        { isletme: `${yer}.atolye.2`, no: 2, ad: "Kerem Ocağı", sahip: { id: "o7", ad: "Usta Kerem" }, seviye: 2, itibar: 22, zanaat: "oduncu", kepenk: true, benim: false, devralinabilir: false },
      ];
      const r: AtolyeListesi = { atolyeler: l, topluSiparis: a.toplu.map((s) => topluGorunumu(a, s)), yuva: { toplam: 3, dolu: 2 }, bedel: 220, devralmaKepenkAy: 60 };
      return ekBasarili(r);
    },
    async zanaat(id, g) {
      await bekle();
      if (!benimMi(id)) return ekBasarisiz("yetki_yok");
      if (a.emirler.length && g.meslek !== a.zanaat) return hamHata("emir_acik");
      const bedel = a.zanaat && a.zs >= 1 ? 30 : 0;
      if (a.zanaat) a.zs++;
      a.zanaat = g.meslek;
      return ekBasarili({ zanaat: { meslek: g.meslek, bedel, degisim: a.zs, ucretsizKalan: Math.max(0, 1 - a.zs) } });
    },
    async uret(id, g) {
      await bekle();
      if (!benimMi(id)) return ekBasarisiz("yetki_yok");
      const tf = TARIFLER.find((x) => x.id === g.tarif);
      if (!a.zanaat) return hamHata("zanaat_yok");
      if (!tf || tf.meslek !== a.zanaat) return hamHata("zanaat_disi");
      for (const [m, n] of Object.entries(tf.girdi)) if (depoda(a, m) < (n ?? 0)) return hamHata("girdi_yok");
      if (a.takat < tf.takat) return hamHata("takat_yok");
      for (const [m, n] of Object.entries(tf.girdi)) depodanAl(a, m, n ?? 0);
      a.takat -= tf.takat;
      const [mal, adet] = tf.cikti;
      depoyaKoy(a, mal, 1, adet, true);
      return ekBasarili({
        uretim: { tarif: tf.id, cikti: { mal, adet }, girdi: tf.girdi as Record<string, number>, kalite: { kademe: 1, dokum: { toplam: 13, kalemler: [{ k: kk("atolye", 5, 5).k, d: 5 }, { k: kk("kanca", 8, 8).k, d: 8 }] } }, atolye: { isletme: a.isletme, ad: "" }, levha: false },
        depo: a.depo.filter((x) => x.adet > 0), depoDolu: depoDolu(a), depoKapasite: DEPO_KAP,
      });
    },
    async mesai(id, g) {
      await bekle();
      if (!benimMi(id)) return ekBasarisiz("yetki_yok");
      if (!Number.isInteger(g.emek) || g.emek < 1 || g.emek > TEK_MESAI || g.emek > a.takat) return hamHata("emek_gecersiz");
      if (a.havuz + g.emek > emekTavani(a)) return hamHata("havuz_dolu");
      a.havuz += g.emek; a.takat -= g.emek;
      return ekBasarili({ mesai: { emek: g.emek, havuz: a.havuz, tavan: emekTavani(a) }, takat: a.takat });
    },
    async emir(id, g) {
      await bekle();
      if (!benimMi(id)) return ekBasarisiz("yetki_yok");
      if (g.islem === "iptal") {
        const e = a.emirler.find((x) => x.no === g.emir);
        if (!e) return hamHata("emir_yok");
        a.emirler = a.emirler.filter((x) => x !== e);
        return ekBasarili({ emir: { no: e.no, tarif: e.tarif, kez: e.kez, yapilan: e.yapilan, acilis: e.acilis, durum: "iptal" as const }, emirler: a.emirler.map((x) => ({ no: x.no, tarif: x.tarif, kez: x.kez, yapilan: x.yapilan })) });
      }
      if (!a.zanaat) return hamHata("zanaat_yok");
      if (a.emirler.length >= tezgahSayisi(a)) return hamHata("tezgah_dolu");
      if (!Number.isInteger(g.kez) || g.kez < 1 || g.kez > EMIR_KEZ) return hamHata("kez_gecersiz");
      const e: UretimEmri = { no: ++a.en, tarif: g.tarif, kez: g.kez, yapilan: 0, kalan: g.kez, acilis: AY, acan: BEN };
      a.emirler.push(e);
      return ekBasarili({ emir: { no: e.no, tarif: e.tarif, kez: e.kez, yapilan: 0, acilis: AY, durum: "acik" as const }, emirler: a.emirler.map((x) => ({ no: x.no, tarif: x.tarif, kez: x.kez, yapilan: x.yapilan })) });
    },
    async toplu(id, g) {
      await bekle();
      if (!benimMi(id)) return ekBasarisiz("yetki_yok");
      const s = a.toplu.find((x) => x.id === g.siparis);
      if (!s || s.durum !== "acik") return hamHata("siparis_yok");
      const v = topluGorunumu(a, s);
      if (!v.teslimEdebilir) return (a.zanaat !== s.meslek ? hamHata("zanaat_disi") : ekBasarisiz("stok_yok"));
      const n = v.teslimAdet ?? s.adet;
      depodanAl(a, s.mal, n);
      s.durum = "teslim"; s.alan = { isletme: a.isletme, ad: "", ay: AY };
      return ekBasarili({ toplu: { siparis: s.id, mal: s.mal, adet: n, siparisAdet: s.adet, indirimYuzde: v.indirimYuzde ?? 0, odul: s.odul, kasaya: s.odul, islem: "sahte" }, depo: a.depo.filter((x) => x.adet > 0), depoDolu: depoDolu(a) });
    },
    async genislet(id) {
      await bekle();
      if (!benimMi(id)) return ekBasarisiz("yetki_yok");
      const gn = sahteAtolyeGorunumu(a).genisletme.sonraki;
      if (!gn) return hamHata("genisletme_yok");
      if (gn.malzeme.some((m) => m.depoda < m.adet)) return hamHata("malzeme_yok");
      for (const m of gn.malzeme) depodanAl(a, m.mal, m.adet);
      a.kademe++;
      const sonraki = sahteAtolyeGorunumu(a).genisletme;
      return ekBasarili({ genisletme: { kademe: a.kademe, malzeme: Object.fromEntries(gn.malzeme.map((m) => [m.mal, m.adet])), rafSatir: 0, depoKapasite: DEPO_KAP, tezgah: tezgahSayisi(a) }, sonraki, depo: a.depo.filter((x) => x.adet > 0) });
    },
  };
}
