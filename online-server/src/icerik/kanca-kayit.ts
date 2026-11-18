// Meslek/beceri kancası kaydı (tezgâh modeli Dilim 3, tasarım §7). Ağaçlardaki her etki ya yapısal olarak bağlıdır
// (tarif, usta işi, ürün kalitesi, verim, araç, ömür, tasarruf: `beceri.ts` `kancaMi`) ya bu tabloda bir tüketiciye
// bağlıdır ya da `bosta-kancalar.ts` listesindedir; üçüncüsü yalnız kısalır (test/kanca.test.ts).
//
// Kanallar ve yığılma kuralı `src/mulk/kanca.ts`'te tek yerde: kanal içinde kişinin katkısı kancalarının toplamı;
// işletmede sahip ve oyuncu çalışanlar arasından EN YÜKSEK kişi katkısı alınır (toplanmaz, çarpılmaz); kanal tavanıyla
// kırpılır (tezgah-kurallar.ts KANCA_TAVAN). Kanallar birbirini çarpmaz; hiçbir kanal bütçe (B, Y), NPC emeği adedi,
// maaş, girdi ya da ödül tutarına dokunmaz: kanca akçe basmaz.

import type { Etki } from "./agaclar/tipler.ts";
import type { MalId } from "./mallar.ts";
import type { MeslekId } from "./meslekler.ts";

/**
 * - mevcut: kanca bu dilimden önce bir sistemce okunuyordu (dosya alanı tüketiciyi gösterir; test dosyada kimliği arar).
 * - dukkanH: dükkân raf satırı çekiciliği H (yüzde puan); `meslek` verilirse yalnız o mesleğin malı.
 * - hanH: han yolcu payı çekiciliği H (yüzde puan).
 * - rafSatir: dükkânın raf satırı sınırına +satır. rafAdet: raf satırı başına en çok adede +adet.
 * - depo: dükkân/atölye depo kapasitesine +yüzde.
 * - atolyeKalite: atölyede üretimde (anlık ve emir) kaliteye +puan; `meslek` = atölye zanaatı.
 * - npcCeza: emirde NPC emeği kalite cezasından −puan; `meslek` = atölye zanaatı.
 * - topluIndirim: toplu siparişte teslim adedinden −yüzde (ödül aynı); `meslek` = sipariş zanaatı.
 * - genisletme: genişletme malzemesinden −yüzde; `mal` verilirse yalnız o malzeme.
 * - fiyatTablosu: dükkân görünümünde yerleşimdeki rakip raf fiyatları tablosu (bilgi; değer yok).
 * - bakimIndirim (kanca partisi 2): dükkân/atölye aylık bakımından −yüzde.
 */
export type KancaKanali = "mevcut" | "dukkanH" | "hanH" | "rafSatir" | "rafAdet" | "depo" | "atolyeKalite" | "npcCeza" | "topluIndirim" | "genisletme" | "fiyatTablosu" | "bakimIndirim";

export interface KancaBagi {
  kanal: KancaKanali;
  /** [PARAMETRE] Kancanın kanal birimindeki değeri (etki başına; aynı kanca iki düğümde varsa iki kez sayılır). */
  d?: number;
  meslek?: MeslekId;
  mal?: MalId;
  /** "mevcut" için tüketen dosya (depo köküne göre). */
  dosya?: string;
}

/** Etkinin kayıt anahtarı: `tur:kimlik` (araç/tasarrufta `tur:hedef:mal`, sinerjide açtığı kimlik). */
export function kancaAnahtari(e: Etki): string {
  switch (e.tur) {
    case "tarif":
      return `tarif:${e.tarif}`;
    case "is":
      return `is:${e.is}`;
    case "verim":
      return `verim:${e.hedef}`;
    case "arac":
      return `arac:${e.hedef}:${e.mal}`;
    case "omur":
      return `omur:${e.mal}`;
    case "kalite":
      return `kalite:${e.hedef}`;
    case "tasarruf":
      return `tasarruf:${e.hedef}:${e.mal}`;
    case "hizmet":
      return `hizmet:${e.hizmet}`;
    case "hak":
      return `hak:${e.hak}`;
    case "sinerji":
      return `sinerji:${e.acar}`;
  }
}

const m = (dosya: string): KancaBagi => ({ kanal: "mevcut", dosya });
const dH = (d: number, meslek?: MeslekId): KancaBagi => ({ kanal: "dukkanH", d, ...(meslek ? { meslek } : {}) });
const hH = (d: number): KancaBagi => ({ kanal: "hanH", d });
const aK = (d: number, meslek?: MeslekId): KancaBagi => ({ kanal: "atolyeKalite", d, ...(meslek ? { meslek } : {}) });
const nC = (d: number, meslek: MeslekId): KancaBagi => ({ kanal: "npcCeza", d, meslek });
const tI = (d: number, meslek: MeslekId): KancaBagi => ({ kanal: "topluIndirim", d, meslek });
const gM = (d: number, mal?: MalId): KancaBagi => ({ kanal: "genisletme", d, ...(mal ? { mal } : {}) });

/** Kanca → tüketici. Anahtarı burada olan etki `kancaMi` için bağlıdır. */
export const KANCA_BAGLARI: Readonly<Record<string, KancaBagi>> = {
  // ── Bu dilimden önce bağlı olanlar (sistemleri okuyordu; kayıt eksikti) ──
  "hizmet:kervan": m("src/yerlesim/kervan.ts"),
  "hizmet:topluYuk": m("src/yerlesim/kervan.ts"),
  "hizmet:fiyatHaberi": m("src/yerlesim/kervan.ts"),
  "hizmet:yatak": m("src/yerlesim/barinma.ts"),
  "hizmet:oda": m("src/yerlesim/barinma.ts"),
  "sinerji:seckinOda": m("src/yerlesim/barinma.ts"),
  "hizmet:nobet": m("src/yerlesim/hizmet-gorev.ts"),
  "hizmet:vergiSayimi": m("src/yerlesim/hizmet-gorev.ts"),
  "hizmet:meclisKaydi": m("src/yerlesim/hizmet-gorev.ts"),
  "hizmet:talim": m("src/yerlesim/hizmet-gorev.ts"),
  "hizmet:araBul": m("src/yerlesim/teklif.ts"),
  "hizmet:muhafizlik": m("src/yerlesim/teklif.ts"),
  "arac:muhafizlik:zincir": m("src/yerlesim/teklif.ts"),
  "hizmet:mektup": m("src/yerlesim/teklif.ts"),
  "hak:ulakSiparisi": m("src/yerlesim/teklif.ts"),
  "hak:kasabaMakami": m("src/yerlesim/motor.ts"),
  "hak:bolgeMakami": m("src/yerlesim/motor.ts"),
  "hizmet:yaraBak": m("src/yerlesim/hizmet-tarif.ts"),
  "hizmet:kirikSar": m("src/yerlesim/hizmet-tarif.ts"),
  "hizmet:turku": m("src/yerlesim/hizmet-tarif.ts"),
  "hizmet:lohusa": m("src/yerlesim/hizmet-tarif.ts"),
  "hizmet:sazGecesi": m("src/yerlesim/hizmet-tarif.ts"),
  "hizmet:barisSofrasi": m("src/yerlesim/hizmet-tarif.ts"),
  "hizmet:ziyafet": m("src/yerlesim/hizmet-tarif.ts"),
  "hizmet:teselli": m("src/yerlesim/hizmet-tarif.ts"),
  "sinerji:ortakSahne": m("src/yerlesim/hizmet-tarif.ts"),
  "sinerji:sazGecesi": m("src/yerlesim/hizmet-tarif.ts"),
  "sinerji:barisCorbasi": m("src/yerlesim/hizmet-tarif.ts"),
  "sinerji:baklaYemegi": m("src/yerlesim/hizmet-tarif.ts"),
  "sinerji:arbalet": m("src/yerlesim/beceri-etki.ts"),
  "sinerji:ticaretSozlesmesi": m("src/yerlesim/beceri-etki.ts"),
  "sinerji:barisSansi": m("src/yerlesim/arabulucu.ts"),
  "sinerji:yaylaCadiri": m("src/yerlesim/tarif.ts"),
  "sinerji:pulZirhAstari": m("src/yerlesim/tarif.ts"),
  "sinerji:ozelPastirma": m("src/yerlesim/tarif.ts"),
  "sinerji:kasabaDegirmeni": m("src/yerlesim/tarif.ts"),
  "sinerji:hanKirisi": m("src/yerlesim/tarif.ts"),
  "sinerji:kagniHarmani": m("src/yerlesim/tarif.ts"),
  "sinerji:kervanArabasi": m("src/yerlesim/tarif.ts"),
  "sinerji:ulakCizmesi": m("src/yerlesim/tarif.ts"),
  "sinerji:ticaretSenedi": m("src/yerlesim/tarif.ts"),

  // ── Dilim 3 ilk parti: dükkân H (raf çekiciliği) ──
  "kalite:satis": dH(5),
  "hizmet:tezgah": dH(3),
  "hak:pazarGunu": dH(5),
  "hak:uzakMallar": dH(3),
  "hak:loncaBasi": dH(5),
  "hak:guvenilirTezgah": dH(5),
  "hizmet:ayarDamgasi": dH(3),
  "kalite:ayar": dH(4),
  "hak:attarDukkani": dH(10, "sifaci"),
  "hak:baharatSiparisi": dH(5, "sifaci"),
  "hak:ekmekNarhi": dH(5, "asci"),
  "hak:kitlikSatisi": dH(5, "ciftci"),

  // ── Raf ve depo ──
  "kalite:tezgahKotasi": { kanal: "rafSatir", d: 1 },
  "hak:bezistan": { kanal: "rafSatir", d: 1 },
  "hak:tuccarKotasi": { kanal: "rafAdet", d: 6 },
  "hak:tahilSaklama": { kanal: "depo", d: 15 },
  "hak:kitlikAmbari": { kanal: "depo", d: 10 },
  "hak:bozulmazKiler": { kanal: "depo", d: 10 },
  "hak:kurumKileri": { kanal: "depo", d: 10 },
  "hak:erzakDefteri": { kanal: "depo", d: 5 },

  // ── Atölye kalitesi (zanaata göre) ──
  "hak:ustaDamgasi": aK(5, "demirci"),
  "hak:ustalarLevhasi": aK(3),
  "kalite:ev": aK(3, "marangoz"),
  "hak:kasabaPlani": aK(3, "marangoz"),
  "hak:kitabeImzasi": aK(3, "marangoz"),
  "hak:ahiKusagi": aK(5, "dokumaci"),
  "hak:loncaKethudaligi": aK(3, "dokumaci"),
  "hak:bereketPiri": aK(5, "ciftci"),
  "hak:ormanNizami": aK(5, "oduncu"),
  "hak:loncaSofrasi": aK(5, "asci"),
  "hak:divanKalemi": aK(5, "katip"),
  "hak:tugraCekme": aK(3, "katip"),
  "hak:kitabeYazisi": aK(3, "katip"),

  // ── NPC emeği kalite cezası (zanaata göre) ──
  "hak:evTezgahlari": nC(10, "dokumaci"),
  "hak:dulHaneGecimi": nC(5, "dokumaci"),
  "hak:npcMadenci": nC(10, "oduncu"),
  "hak:ocakGuvenligi": nC(5, "oduncu"),
  "hak:imeceCagrisi": nC(5, "ciftci"),
  "hak:imeceKatkisi": nC(10, "ciftci"),
  "hak:ashane": nC(10, "asci"),
  "hak:imaretAsi": nC(5, "asci"),
  "hak:projeKatkisi": nC(10, "marangoz"),
  "hak:tahrir": nC(5, "katip"),

  // ── Toplu sipariş (teslim adedi indirimi; ödül aynı) ──
  "hak:topluAletSiparisi": tI(10, "demirci"),
  "hak:orduSiparisi": tI(10, "demirci"),
  "hak:silahSiparisOnceligi": tI(5, "demirci"),
  "hak:saheserKilicSiparisi": tI(5, "demirci"),
  "hak:topluEkmek": tI(10, "asci"),
  "hak:topluCorba": tI(10, "asci"),
  "hak:garnizonEkmegi": tI(5, "asci"),
  "hak:kitlikSiparisi": tI(5, "asci"),
  "hak:uzakSatis": tI(5, "asci"),
  "hak:topluHasat": tI(10, "ciftci"),
  "hak:garnizonZahiresi": tI(5, "ciftci"),
  "hak:projeKerestesi": tI(10, "oduncu"),
  "hak:kasabaOcagi": tI(10, "oduncu"),
  "hak:vakifSiparisi": tI(10, "marangoz"),
  "hak:debbaghane": tI(10, "dokumaci"),
  "hak:tabaklamaIlani": tI(5, "dokumaci"),
  "hak:kurumYazismasi": tI(10, "katip"),
  "hak:resmiYazisma": tI(5, "katip"),
  // Kanca partisi 2 (sipariş hakları, Dilim 3 emsali: kurum siparişi = toplu sipariş indirimi)
  "hak:asevi": tI(5, "asci"),
  "hak:armaCizme": tI(5, "marangoz"),

  // ── Genişletme malzemesi ──
  "hak:temelTasi": gM(25, "kesmeTas"),
  "hak:surOnarimi": gM(10, "kesmeTas"),
  "hak:evProjesi": gM(10),
  "hak:hanProjesi": gM(10),
  "hak:projeSirasi": gM(10),

  // ── Han H (yolcu payı çekiciliği) ──
  "kalite:yatak": hH(3),
  "kalite:oda": hH(4),
  "kalite:haber": hH(4),
  "kalite:sahne": hH(4),
  "kalite:atisma": hH(4),
  "kalite:ziyafet": hH(4),
  "kalite:sazGecesi": hH(3),
  "kalite:kulak": hH(2),
  "kalite:dugun": hH(2),
  "hizmet:kulak": hH(3),
  "hizmet:kervanKonagi": hH(3),
  "hizmet:dugunEvSahipligi": hH(3),
  "hak:hanBerati": hH(5),
  "hak:mudavimRozeti": hH(5),
  "hak:kervansaray": hH(5),
  "hak:yolcuHimayesi": hH(3),
  "hak:haberDefteri": hH(3),
  "hak:kervanKonaklamaSiparisi": hH(3),
  "hak:kervanKonaklama": hH(3),
  "hak:kervanKonagiCadiri": hH(2),

  // ── Bilgi ──
  "hak:fiyatTablosu": { kanal: "fiyatTablosu" },

  // ── Kanca partisi 2: bakım ("bakımı ayni öder", yıpranan yapıların defteri) ──
  "hizmet:yapiOnarimi": { kanal: "bakimIndirim", d: 25 },
  "hak:bakimDefteri": { kanal: "bakimIndirim", d: 25 },

  // ── Kanca partisi 2: hizmet pazarı (kalite, yeni hizmetler, araç) ──
  "kalite:turku": m("src/yerlesim/hizmet-tarif.ts"),
  "kalite:teselli": m("src/yerlesim/hizmet-tarif.ts"),
  "kalite:lohusa": m("src/yerlesim/hizmet-tarif.ts"),
  "kalite:kirikSar": m("src/yerlesim/hizmet-tarif.ts"),
  "kalite:sifa": m("src/yerlesim/hizmet-tarif.ts"),
  "kalite:dertlesme": m("src/yerlesim/hizmet-tarif.ts"),
  "kalite:turkuYak": m("src/yerlesim/hizmet-tarif.ts"),
  "kalite:barisSofrasi": m("src/yerlesim/hizmet-tarif.ts"),
  "kalite:gucDogum": m("src/yerlesim/hizmet-tarif.ts"),
  "kalite:destan": m("src/yerlesim/hizmet-tarif.ts"),
  "hizmet:gucDogum": m("src/yerlesim/hizmet-tarif.ts"),
  "hizmet:yaraDikisi": m("src/yerlesim/hizmet-tarif.ts"),
  "hizmet:dertlesme": m("src/yerlesim/hizmet-tarif.ts"),
  "hizmet:turkuYak": m("src/yerlesim/hizmet-tarif.ts"),
  "hizmet:atisma": m("src/yerlesim/hizmet-tarif.ts"),
  "hizmet:barisIlahisi": m("src/yerlesim/hizmet-tarif.ts"),
  "hizmet:onarimHizmeti": m("src/yerlesim/hizmet-tarif.ts"),
  "hizmet:yelekOnarimi": m("src/yerlesim/hizmet-tarif.ts"),
  "hizmet:postTabaklama": m("src/yerlesim/hizmet-tarif.ts"),
  "arac:yaraDikisi:alet": m("src/yerlesim/hizmet-tarif.ts"),
  "arac:sazliSahne:saz": m("src/yerlesim/hizmet-tarif.ts"),

  // ── Kanca partisi 2: hizmet pazarı hakları (kırgın gönül tabanı, NPC talep önceliği) ──
  "hak:kirginTaban": m("src/yerlesim/hizmet-pazari.ts"),
  "hak:dogumTalebi": m("src/yerlesim/hizmet-pazari.ts"),
  "hak:yasliHane": m("src/yerlesim/hizmet-pazari.ts"),

  // ── Kanca partisi 2: kasaba görevleri (kalite, mızrakla nöbet, koltuk hakları) ──
  "kalite:asayis": m("src/yerlesim/hizmet-gorev.ts"),
  "kalite:talim": m("src/yerlesim/hizmet-gorev.ts"),
  "kalite:vergiSayimi": m("src/yerlesim/hizmet-gorev.ts"),
  "kalite:meclisKaydi": m("src/yerlesim/hizmet-gorev.ts"),
  "arac:nobet:mizrak": m("src/yerlesim/hizmet-gorev.ts"),
  "hak:nobetKoltuklari": m("src/yerlesim/hizmet-gorev.ts"),
  "hak:garnizonTalimi": m("src/yerlesim/hizmet-gorev.ts"),

  // ── Kanca partisi 2: kervan (koşum ve taşıt aşınması, kervan kalitesi) ──
  "omur:kosum": m("src/yerlesim/kervan.ts"),
  "omur:araba": m("src/yerlesim/kervan.ts"),
  "omur:kagni": m("src/yerlesim/kervan.ts"),
  "kalite:kervan": m("src/yerlesim/kervan.ts"),

  // ── Kanca partisi 2: konsinye (emanet satır, komisyon) ──
  "hak:komisyon": m("src/mulk/tezgah-uclar.ts"),

  // ── Kanca partisi 2: hizmet pazarı hakları a–e (darüşşifa tabanı, aşın geç bozulması) ──
  "hak:bozulmaSuresi": m("src/yerlesim/hizmet-pazari.ts"),
  "hak:darussifa": m("src/yerlesim/hizmet-pazari.ts"),
  "hak:darussifaBasi": m("src/yerlesim/hizmet-pazari.ts"),

  // ── Kanca partisi 2: casus (kapıda yakalama) ──
  "hak:casusTespiti": m("src/yerlesim/casus.ts"),

  // ── Kanca partisi 2: gece devriyesi görevi ──
  "hak:devriye": m("src/yerlesim/hizmet-gorev.ts"),
};
