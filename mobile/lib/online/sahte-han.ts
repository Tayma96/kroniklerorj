// Geliştirici oturumu ve tasarım önizlemesi için sahte han: bellekte dört masa, birkaç uydurma oyuncu ve sahte soket.
// Sunucunun masa kurallarını (otur/kalk/sıra/masa başı/at/öne al/sustur, butonlu eylem, ikram) kabaca taklit eder;
// sunucuya hiç bağlanmaz. Sohbet örnekleri oyuncu yazısı yerine geçer (çeviri sözlüğü değildir).
// 4.9 çoklu han: şehirde üç han (1. NPC'nin, 2. ve 3. oyuncunun; farklı fiyat, oda doluluğu ve kalabalık); her
// hanın kendi masaları ve panosu vardır, `han` parametresi taklit edilir (bilinmeyen han `han_yok`).
// Faz 16 ses de taklit edilir (yerel WebRTC modülü olmadan): yayın/konuşan/ses kesme/söz isteme durumları gelir, ses yoktur.
import { ekBasarili, ekBasarisiz, type EkSonuc } from "./ek-istemci";
import type {
  PanoIlani,
  HamSoket, HanEylemGirdisi, HanKarti, HanOzeti, IkramGirdisi, IkramId, IkramSonucu, IstemciIletisi, MasaAnonsu, MasaAyari,
  MasaGorunumu, MasaOlayi, MenuSatiri, Plaka, SesDurumu, SunucuIletisi, HanIstemci, SahneGorunumu, AtismaGorunumu, AtismaSonucTuru,
} from "./han-veri";
import { KITA_EN_UZUN, KITA_SATIR } from "./han-veri";
import type { Dil } from "./protokol";
import { OYUN_KOMUTLARI, type OyunIletisi } from "./masa-oyun-veri";
import { sahteOyunAyir, sahteOyunBagla, sahteOyunIsle, sahteOyunKalkti, sahteOyunSuruyor, type SahteOyunOrtami } from "./sahte-masa-oyun";

const KOLTUK = 6;
const MENU: MenuSatiri[] = [{ id: "ekmek", fiyat: 2 }, { id: "serbet", fiyat: 3 }, { id: "yemek", fiyat: 6 }, { id: "gulSuyu", fiyat: 10 }];
const HAN_ADI: Record<Dil, string> = { tr: "Han", en: "Inn", es: "Posada", pt: "Estalagem", ar: "خان", ru: "Постоялый двор" };
const AYAR: MasaAyari = { tur: "acik", acik: true, sesli: true, kavgaYasak: false };
const KISILER: Plaka[] = [
  { hesap: "oy-kerim", ad: "Kerim Usta", mudavim: true, kisi: "o2", nam: 64 }, { hesap: "oy-ayse", ad: "Ayşe Hatun", ozan: true, kisi: "o3", nam: 118 }, { hesap: "oy-osman", ad: "Osman Kalfa", nam: 12 },
  { hesap: "oy-zeynep", ad: "Zeynep" }, { hesap: "oy-mehmet", ad: "Mehmet Çelebi", cerceve: "yaldiz" }, { hesap: "oy-hatice", ad: "Hatice Kadın" },
  { hesap: "oy-yakup", ad: "Yakup", ozan: true }, { hesap: "oy-selim", ad: "Selim Ağa" },
];
/** H8 önizleme kıtaları (oyuncu yazısı yerine geçer; çeviri sözlüğü değildir). */
const KITALAR = [
  "Kervan geçer bu yoldan, toz kalır ardında\nHancı der ki misafir, söz kalır ardında",
  "Söz dediğin gönülden, dilden değil ey yâren\nBir şerbetle tatlanır, acı kalmaz ardında",
  "Develi'nin ovası, karla örtülü kışın\nBahar gelir uyanır, umut kalır ardında",
  "Sazımın teli ince, sözümün özü derin\nMeclis dağılsa bile, bir ses kalır ardında",
  "Ozan olan yorulmaz, yol uzun da olsa\nAdım adım yürüse, iz kalır ardında",
  "Bu atışma bitince, kim kazansa hoş gelir\nDostluk baki bu handa, tat kalır ardında",
];
const SOZLER = [
  "Kervan yarın sabah Konya yolundan geliyormuş.", "Demirhan'da tuz yine pahalanmış, duydunuz mu?",
  "Lonca bu ay keçe siparişi açtı.", "Hancı, bir şerbet daha!", "Kış erken gelecek, odunu şimdiden yığın.",
  "Kadı efendi çarşı kavgasını yarın dinleyecekmiş.", "Ahi babanın çırağı usta oldu, hayırlı olsun.",
];

interface SahteMasa { koltuklar: (Plaka | null)[]; oturma: number[]; sira: Plaka[]; ayakta: number; atilan: Set<string>; ayar?: Partial<MasaAyari> }
interface Dunya { masalar: SahteMasa[]; olayNo: number; olaylar: Map<number, MasaOlayi>; para: number; istek: Map<string, unknown>; soket: SahteSoket | null }

function masaKur(oturan: number[], ayakta: number, sira: number[] = []): SahteMasa {
  const koltuklar: (Plaka | null)[] = Array.from({ length: KOLTUK }, () => null);
  const oturma = Array.from({ length: KOLTUK }, () => 0);
  oturan.forEach((k, i) => { koltuklar[i * 2 % KOLTUK + Math.floor(i / 3)] = KISILER[k]!; });
  koltuklar.forEach((p, i) => { if (p) oturma[i] = i + 1; });
  return { koltuklar, oturma, sira: sira.map((k) => KISILER[k]!), ayakta, atilan: new Set() };
}

/** Önizleme hanları: 1 NPC (en kalabalık), 2 Kerim Usta'nın ucuz hanı (müdavimisin), 3 Ayşe Hatun'un pahalı ve dolu hanı. */
const SAHTE_HANLAR: Omit<HanKarti, "masa" | "isletme">[] = [
  { no: 1, sahip: "npc", ad: "", seviye: 0, fc: 100, acik: true, oda: null, mudavim: null },
  { no: 2, sahip: "oyuncu", sahipKisi: { id: "o2", ad: "Kerim Usta" }, ad: "Kervan Konağı", seviye: 1, fc: 85, acik: true, oda: { dolu: 3, kapasite: 6 }, mudavim: "mudavim" },
  { no: 3, sahip: "oyuncu", sahipKisi: { id: "o3", ad: "Ayşe Hatun" }, ad: "Gül Bahçesi Hanı", seviye: 3, fc: 135, acik: true, oda: { dolu: 6, kapasite: 6 }, mudavim: null },
];
const ILK_MASALAR: Record<number, () => SahteMasa[]> = {
  1: () => [masaKur([0, 1, 4], 2), masaKur([2, 3, 5, 6, 7, 1], 3, [4]), masaKur([], 0), masaKur([6], 1)],
  2: () => [masaKur([2, 5], 1), masaKur([], 0), masaKur([3], 0)],
  3: () => [masaKur([7], 0), masaKur([], 0)],
};
const dunyalar = new Map<number, Dunya>();
/** Akçe bütün hanlarda ortak (tek cüzdan). */
let cuzdan = 40;
const hanVarMi = (han: number) => Object.hasOwn(ILK_MASALAR, han);
function dunyaAl(han = 1): Dunya {
  let dunya = dunyalar.get(han);
  if (!dunya) {
    dunya = { masalar: (ILK_MASALAR[han] ?? ILK_MASALAR[1]!)(), olayNo: 40, olaylar: new Map(), para: 0, istek: new Map(), soket: null };
    dunyalar.set(han, dunya);
    if (han === 1) {
      // 1. hanın 2. masası bilerek dolu: altı koltuk.
      const m2 = dunya.masalar[1]!;
      m2.koltuklar = m2.koltuklar.map((p, i) => p ?? KISILER[(i + 2) % KISILER.length]!);
      m2.oturma = m2.oturma.map((o, i) => o || i + 1);
    }
  }
  return dunya;
}

const oturanlar = (m: SahteMasa) => m.koltuklar.flatMap((p, i) => (p ? [{ p, i, o: m.oturma[i]! }] : []));
function masaBasi(m: SahteMasa): string | null {
  const o = oturanlar(m).sort((a, b) => a.o - b.o)[0];
  return o?.p.hesap ?? null;
}
function gorunum(no: number, m: SahteMasa, ben: Plaka, bagli: boolean): MasaGorunumu {
  const benOturuyor = m.koltuklar.some((p) => p?.hesap === ben.hesap);
  return { no, koltuklar: [...m.koltuklar], masaBasi: masaBasi(m), sira: [...m.sira], ayakta: m.ayakta + (bagli && !benOturuyor ? 1 : 0), ayar: { ...AYAR, ...m.ayar } };
}

class SahteSoket implements HamSoket {
  private d: Parameters<HamSoket["dinle"]>[0] | null = null;
  private zaman: ReturnType<typeof setTimeout>[] = [];
  private dongu: ReturnType<typeof setInterval> | null = null;
  private sessiz = new Set<string>();
  private kapali = false;
  private yayin = new Set<string>();
  private konusan = new Set<string>();
  private sesKesik = new Set<string>();
  private soz: Plaka[] = [];
  private sahne: SahneGorunumu | null = null;
  private atisma: AtismaGorunumu | null = null;
  private oylar = new Map<string, string>();
  /** Masa oyunları (sahte-masa-oyun.ts): bu soketin ortamı. */
  private readonly oyunAnahtar: string;
  private readonly oyunOrtam: SahteOyunOrtami;
  constructor(readonly no: number, readonly ben: Plaka, readonly han = 1) {
    this.oyunAnahtar = `${han}:${no}`;
    this.oyunOrtam = {
      ben: { hesap: ben.hesap, ad: ben.ad },
      oturan: () => oturanlar(this.masa()).map((x) => ({ hesap: x.p.hesap, ad: x.p.ad })),
      mesgul: () => this.mesgul(),
      yolla: (oyun) => this.yolla({ t: "oyun", oyun }),
      hata: (kod, istek) => this.hata(kod, istek),
    };
    // Gerçek sunucuda bir hesap aynı anda tek masadadır (4005 başka masa): öteki hanların soketi de kapanır.
    for (const [h, d] of dunyalar) if (h !== han) d.soket?.kapat();
    const w = dunyaAl(han);
    w.soket?.kapat();
    w.soket = this;
    this.sonra(150, () => {
      this.d?.acildi();
      if (no === 1) this.yayin.add("oy-kerim").add("oy-ayse");
      // Önizleme: 1. masada iki misafir atışıyor, 4. masada bir ozan sahneyi açmış.
      const m0 = this.masa();
      if (no === 1 && m0.koltuklar.some((p) => p?.hesap === "oy-ayse") && m0.koltuklar.some((p) => p?.hesap === "oy-kerim")) this.atismaBaslat("oy-ayse", "oy-kerim", 39);
      if (no === 4 && m0.koltuklar.some((p) => p?.hesap === "oy-yakup")) this.sahne = { anlatici: "oy-yakup", soz: [], istek: [], acilis: Date.now() };
      this.yolla({ t: "hosgeldin", ben, susturma: null, masa: this.gor(), ses: this.sesGor(), oyun: sahteOyunBagla(this.oyunAnahtar, this.oyunOrtam), ...(this.sahne ? { sahne: this.sahne } : {}), ...(this.atisma ? { atisma: this.atisma } : {}) });
      if (this.atisma) this.botKita();
      if (no !== 1) return;
      // Önizleme için anons türleri ve bir teklif: ikram, armağan, Debdebe süsleri ayrı görünsün.
      this.sonra(900, () => this.anons({ tur: "ikram", kim: "oy-ayse", hedef: "oy-kerim", oge: "serbet", zaman: Date.now() }));
      this.sonra(2400, () => this.olay({ tur: "ittifak", kim: "oy-kerim", hedef: ben.hesap, durum: "teklif" }));
      this.sonra(7000, () => this.anons({ tur: "armagan", kim: "oy-kerim", hedef: "oy-mehmet", oge: "kilic", zaman: Date.now() }));
      this.sonra(13000, () => this.anons({ tur: "debdebe", kim: "oy-mehmet", hedef: "oy-ayse", oge: "gulYagmuru", zaman: Date.now() }));
    });
    this.dongu = setInterval(() => this.sohbet(), 6500);
    this.zaman.push(setInterval(() => this.sesOyna(), 2300) as unknown as ReturnType<typeof setTimeout>);
  }
  private sesGor(): SesDurumu {
    const m = this.masa();
    const oturan = new Set(oturanlar(m).map((x) => x.p.hesap));
    const yayin = [...this.yayin].filter((h) => oturan.has(h) && !this.sesKesik.has(h));
    return { acik: true, yayin: yayin.map((h) => ({ hesap: h, iz: "sahte-" + h })), konusan: [...this.konusan].filter((h) => yayin.includes(h)), kapali: [...this.sesKesik], soz: [...this.soz] };
  }
  private sesYolla() { this.yolla({ t: "sesDurum", ses: this.sesGor() }); }
  /** Uydurma konuşanlar: yayındaki sahte oyunculardan biri arada bir konuşur. */
  private sesOyna() {
    const adaylar = [...this.yayin].filter((h) => h !== this.ben.hesap);
    if (!adaylar.length) return;
    const h = adaylar[Math.floor(Math.random() * adaylar.length)]!;
    if (this.konusan.has(h)) this.konusan.delete(h); else this.konusan.add(h);
    this.sesYolla();
  }
  /** Sahte yayın: oturan ve sesi kesilmemişse açılır. */
  sesYayin(acik: boolean): "oturmuyor" | "sesi_kesildi" | null {
    if (acik) {
      if (!this.masa().koltuklar.some((p) => p?.hesap === this.ben.hesap)) return "oturmuyor";
      if (this.sesKesik.has(this.ben.hesap)) return "sesi_kesildi";
      this.yayin.add(this.ben.hesap);
    } else {
      this.yayin.delete(this.ben.hesap);
      this.konusan.delete(this.ben.hesap);
    }
    this.sesYolla();
    return null;
  }
  private masa() { return dunyaAl(this.han).masalar[this.no - 1]!; }
  /** H8: masa meşgul mü (sahne ya da atışma). */
  mesgul() { return !!this.sahne || !!this.atisma; }
  private sahneYolla() { this.yolla({ t: "sahne", sahne: this.sahne ? { ...this.sahne, soz: [...this.sahne.soz], istek: [...this.sahne.istek] } : null }); }
  private atismaYolla() { this.yolla({ t: "atisma", atisma: this.atisma ? { ...this.atisma, hak: [...this.atisma.hak], oyVeren: [...this.atisma.oyVeren] } : null }); }
  private adi(h: string) { return h === this.ben.hesap ? this.ben.ad : KISILER.find((k) => k.hesap === h)?.ad ?? h; }
  atismaBaslat(a: string, b: string, olay: number) {
    this.oylar.clear();
    this.atisma = { olay, a, b, kita: 0, toplam: 6, sira: a, asama: "kita", hak: [], oyVeren: [] };
  }
  /** Sırası gelen sahte taraf birkaç saniye sonra kıtasını yazar. */
  private botKita() {
    const at = this.atisma;
    if (!at || at.asama !== "kita" || at.sira === this.ben.hesap || !at.sira) return;
    const sira = at.sira;
    this.sonra(3800, () => { if (this.atisma === at && at.sira === sira) this.kitaYaz(sira, KITALAR[at.kita % KITALAR.length]!); });
  }
  atismaBaslatYolla(a: string, b: string, olay: number) { this.atismaBaslat(a, b, olay); this.atismaYolla(); this.botKita(); }
  private kitaYaz(h: string, metin: string) {
    const at = this.atisma!;
    const m = this.masa();
    at.kita += 1;
    this.yolla({ t: "kita", hesap: h, ad: this.adi(h), koltuk: m.koltuklar.findIndex((p) => p?.hesap === h), metin, sira: at.kita, zaman: Date.now() });
    if (at.kita >= at.toplam) {
      at.asama = "oylama"; at.sira = null;
      at.hak = oturanlar(m).map((x) => x.p.hesap).filter((x) => x !== at.a && x !== at.b);
      this.atismaYolla();
      // Sahte seçmenler oyunu verir; oyuncu 15 sn içinde vermezse sonuç o anki oylarla çıkar.
      at.hak.filter((x) => x !== this.ben.hesap).forEach((x, i) => this.sonra(1500 + i * 1200, () => this.oyVer(x, i % 2 ? at.b : at.a)));
      this.sonra(15000, () => { if (this.atisma === at) this.atismaBitir(); });
      return;
    }
    at.sira = h === at.a ? at.b : at.a;
    this.atismaYolla();
    this.botKita();
  }
  private oyVer(h: string, kime: string) {
    const at = this.atisma;
    if (!at || at.asama !== "oylama" || !at.hak.includes(h) || at.oyVeren.includes(h)) return;
    this.oylar.set(h, kime);
    at.oyVeren.push(h);
    if (at.oyVeren.length >= at.hak.length) this.atismaBitir();
    else this.atismaYolla();
  }
  private atismaBitir() {
    const at = this.atisma;
    if (!at) return;
    const oy: [number, number] = [0, 0];
    for (const k of this.oylar.values()) oy[k === at.a ? 0 : 1] += 1;
    const sonuc: AtismaSonucTuru = at.asama === "kita" ? "iptal" : oy[0] + oy[1] === 0 ? "hukumsuz" : oy[0] === oy[1] ? "berabere" : "kazandi";
    const kazanan = sonuc === "berabere" ? [at.a, at.b] : sonuc === "kazandi" ? [oy[0] > oy[1] ? at.a : at.b] : [];
    this.atisma = null;
    this.yolla({ t: "atisma", atisma: null, son: { olay: at.olay, a: at.a, b: at.b, sonuc, kazanan, oy } });
    if (sonuc !== "iptal") this.olay({ tur: "atismaSonuc", kim: kazanan[0] ?? at.a, hedef: kazanan[0] === at.b ? at.a : at.b, olay: at.olay, sonuc, oy });
  }
  private gor() { return gorunum(this.no, this.masa(), this.ben, true); }
  private sonra(ms: number, is: () => void) { this.zaman.push(setTimeout(() => { if (!this.kapali) is(); }, ms)); }
  private yolla(v: SunucuIletisi) { if (!this.kapali) this.d?.ileti(v); }
  private durum() { this.yolla({ t: "durum", masa: this.gor() }); }
  private hata(hata: string, istek?: string) { this.yolla({ t: "hata", hata, ...(istek ? { istek } : {}) }); }
  anons(a: MasaAnonsu) { this.yolla({ t: "anons", anons: a }); }
  olay(o: Omit<MasaOlayi, "no" | "masa" | "zaman" | "katilim">): MasaOlayi {
    const w = dunyaAl(this.han);
    const tam: MasaOlayi = { ...o, no: ++w.olayNo, masa: `masa:sahte:${this.han}:${this.no}`, zaman: Date.now(), katilim: oturanlar(this.masa()).sort((a, b) => a.i - b.i).map((x) => x.p.hesap) };
    w.olaylar.set(tam.no, tam);
    this.yolla({ t: "olay", olay: tam });
    return tam;
  }
  private sohbet() {
    const digerleri = oturanlar(this.masa()).filter((x) => x.p.hesap !== this.ben.hesap && !this.sessiz.has(x.p.hesap));
    if (!digerleri.length) return;
    const k = digerleri[Math.floor(Math.random() * digerleri.length)]!;
    this.yolla({ t: "ileti", hesap: k.p.hesap, ad: k.p.ad, koltuk: k.i, metin: SOZLER[Math.floor(Math.random() * SOZLER.length)]!, zaman: Date.now() });
  }
  dinle(d: Parameters<HamSoket["dinle"]>[0]) { this.d = d; }
  kapat() {
    if (this.kapali) return;
    const m = this.masa();
    const i = m.koltuklar.findIndex((p) => p?.hesap === this.ben.hesap);
    if (i >= 0) m.koltuklar[i] = null;
    m.sira = m.sira.filter((p) => p.hesap !== this.ben.hesap);
    this.kapali = true;
    sahteOyunAyir(this.oyunAnahtar, this.oyunOrtam);
    this.yayin.clear();
    this.zaman.forEach(clearTimeout);
    if (this.dongu) clearInterval(this.dongu);
    const w = dunyaAl(this.han);
    if (w.soket === this) w.soket = null;
  }
  gonder(ileti: IstemciIletisi) {
    this.sonra(120, () => this.isle(ileti));
  }
  private isle(ileti: IstemciIletisi) {
    const m = this.masa();
    const benKoltuk = m.koltuklar.findIndex((p) => p?.hesap === this.ben.hesap);
    const masaninBasi = masaBasi(m) === this.ben.hesap;
    const bulunan = (h: string) => m.koltuklar.some((p) => p?.hesap === h) || m.sira.some((p) => p.hesap === h);
    if (OYUN_KOMUTLARI.has(ileti.t)) return sahteOyunIsle(this.oyunAnahtar, ileti as OyunIletisi);
    switch (ileti.t) {
      case "otur": {
        if (benKoltuk >= 0) return this.hata("zaten_oturuyor");
        const bos = ileti.koltuk ?? m.koltuklar.findIndex((p) => p === null);
        if (ileti.koltuk !== undefined && m.koltuklar[ileti.koltuk]) return this.hata("koltuk_dolu");
        if (bos < 0) { if (!m.sira.some((p) => p.hesap === this.ben.hesap)) m.sira.push(this.ben); }
        else { m.koltuklar[bos] = this.ben; m.oturma[bos] = Date.now(); }
        return this.durum();
      }
      case "kalk":
        if (benKoltuk >= 0) {
          m.koltuklar[benKoltuk] = null;
          const ilk = m.sira.shift();
          if (ilk) { m.koltuklar[benKoltuk] = ilk; m.oturma[benKoltuk] = Date.now(); m.ayakta = Math.max(0, m.ayakta - 1); }
          if (this.yayin.delete(this.ben.hesap)) { this.konusan.delete(this.ben.hesap); this.sesYolla(); }
        } else if (m.sira.some((p) => p.hesap === this.ben.hesap)) m.sira = m.sira.filter((p) => p.hesap !== this.ben.hesap);
        else return this.hata("oturmuyor");
        this.durum();
        return sahteOyunKalkti(this.oyunAnahtar);
      case "yaz": {
        if (benKoltuk < 0) return this.hata("oturmuyor");
        if (this.atisma?.asama === "kita") return this.hata("atisma_suruyor");
        if (this.sahne && this.sahne.anlatici !== this.ben.hesap && !this.sahne.soz.includes(this.ben.hesap)) return this.hata("soz_verilmedi");
        const metin = ileti.metin.replace(/[\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim();
        if (!metin || [...metin].length > 240) return this.hata("metin_gecersiz");
        return this.yolla({ t: "ileti", hesap: this.ben.hesap, ad: this.ben.ad, koltuk: benKoltuk, metin, zaman: Date.now() });
      }
      case "sustur":
      case "susturKaldir":
        if (ileti.hedef === this.ben.hesap) return this.hata("kendi_hedef");
        if (ileti.t === "sustur") this.sessiz.add(ileti.hedef); else this.sessiz.delete(ileti.hedef);
        return this.yolla({ t: "sessiz", liste: [...this.sessiz] });
      case "at": {
        if (!masaninBasi) return this.hata("yetki_yok");
        if (ileti.hedef === this.ben.hesap) return this.hata("kendi_hedef");
        if (!bulunan(ileti.hedef)) return this.hata("hedef_masada_degil");
        const katilim = oturanlar(m).map((x) => x.p.hesap);
        m.koltuklar = m.koltuklar.map((p) => (p?.hesap === ileti.hedef ? null : p));
        m.sira = m.sira.filter((p) => p.hesap !== ileti.hedef);
        m.atilan.add(ileti.hedef);
        const w = dunyaAl(this.han);
        const o: MasaOlayi = { no: ++w.olayNo, masa: `masa:sahte:${this.han}:${this.no}`, tur: "atma", kim: this.ben.hesap, hedef: ileti.hedef, zaman: Date.now(), katilim };
        this.yolla({ t: "olay", olay: o });
        return this.durum();
      }
      case "oneAl": {
        if (!masaninBasi) return this.hata("yetki_yok");
        const i = m.sira.findIndex((p) => p.hesap === ileti.hedef);
        if (i < 0) return this.hata("hedef_masada_degil");
        m.sira.unshift(...m.sira.splice(i, 1));
        return this.durum();
      }
      case "rapor":
        if (ileti.hedef === this.ben.hesap) return this.hata("kendini_sikayet", ileti.istekNo);
        return this.yolla({ t: "rapor", sonuc: { sikayet: "s-" + ileti.istekNo.slice(0, 6) } });
      case "konus":
        if (!this.yayin.has(this.ben.hesap)) return this.hata("ses_oturumu_yok");
        if (ileti.acik) this.konusan.add(this.ben.hesap); else this.konusan.delete(this.ben.hesap);
        return this.sesYolla();
      case "sesKapat":
      case "sesAc":
        if (!masaninBasi) return this.hata("yetki_yok");
        if (ileti.hedef === this.ben.hesap) return this.hata("kendi_hedef");
        if (!bulunan(ileti.hedef)) return this.hata("hedef_masada_degil");
        if (ileti.t === "sesKapat") { this.sesKesik.add(ileti.hedef); this.konusan.delete(ileti.hedef); } else this.sesKesik.delete(ileti.hedef);
        return this.sesYolla();
      case "sozIste":
        if (this.sahne && benKoltuk >= 0) {
          if (!this.sahne.istek.includes(this.ben.hesap)) this.sahne.istek.push(this.ben.hesap);
          this.sahneYolla();
          // Sahte anlatıcı birkaç saniye sonra söz verir.
          if (this.sahne.anlatici !== this.ben.hesap) return this.sonra(3000, () => {
            const s = this.sahne;
            if (!s || !s.istek.includes(this.ben.hesap)) return;
            s.istek = s.istek.filter((h) => h !== this.ben.hesap); s.soz.push(this.ben.hesap);
            this.sahneYolla();
          });
          return;
        }
        if (benKoltuk >= 0) return this.hata("zaten_oturuyor");
        if (!this.soz.some((p) => p.hesap === this.ben.hesap)) this.soz.push(this.ben);
        this.sesYolla();
        // Sahte masa başı birkaç saniye sonra söz verir (boş koltuk varsa).
        return this.sonra(3000, () => {
          if (!this.soz.some((p) => p.hesap === this.ben.hesap)) return;
          this.soz = this.soz.filter((p) => p.hesap !== this.ben.hesap);
          const bos = this.masa().koltuklar.findIndex((p) => p === null);
          if (bos >= 0) { this.masa().koltuklar[bos] = this.ben; this.masa().oturma[bos] = Date.now(); this.durum(); }
          this.sesYolla();
        });
      case "sozGeri":
        if (this.sahne && this.sahne.istek.includes(this.ben.hesap)) { this.sahne.istek = this.sahne.istek.filter((h) => h !== this.ben.hesap); return this.sahneYolla(); }
        if (!this.soz.some((p) => p.hesap === this.ben.hesap)) return this.hata("soz_istegi_yok");
        this.soz = this.soz.filter((p) => p.hesap !== this.ben.hesap);
        return this.sesYolla();
      case "sozVer":
        if (this.sahne) {
          const s = this.sahne;
          if (s.anlatici !== this.ben.hesap && !masaninBasi) return this.hata("yetki_yok");
          if (ileti.kabul === false) { s.istek = s.istek.filter((h) => h !== ileti.hedef); s.soz = s.soz.filter((h) => h !== ileti.hedef); }
          else if (!s.istek.includes(ileti.hedef)) return this.hata("soz_istegi_yok");
          else { s.istek = s.istek.filter((h) => h !== ileti.hedef); s.soz.push(ileti.hedef); }
          return this.sahneYolla();
        }
        if (!masaninBasi) return this.hata("yetki_yok");
        return this.hata("soz_istegi_yok");
      case "ayar": {
        if (!masaninBasi) return this.hata("yetki_yok");
        const { kavgaYasak, kilitli, sesli, sahneYasak } = ileti;
        this.masa().ayar = { ...this.masa().ayar, ...(kavgaYasak !== undefined ? { kavgaYasak } : {}), ...(kilitli !== undefined ? { kilitli } : {}), ...(sesli !== undefined ? { sesli } : {}), ...(sahneYasak !== undefined ? { sahneYasak } : {}) };
        return this.durum();
      }
      case "sahneAc":
        if (benKoltuk < 0) return this.hata("oturmuyor");
        if (this.sahne) return this.hata("sahne_acik");
        if (this.atisma || sahteOyunSuruyor(this.oyunAnahtar)) return this.hata("masa_mesgul");
        if (this.masa().ayar?.sahneYasak) return this.hata("sahne_yasak");
        this.sahne = { anlatici: this.ben.hesap, soz: [], istek: [], acilis: Date.now() };
        this.sahneYolla();
        // Sahte dinleyici söz ister (anlatıcı kişi kartından söz verir).
        return this.sonra(2500, () => {
          const h = oturanlar(this.masa()).find((x) => x.p.hesap !== this.ben.hesap)?.p.hesap;
          if (!h || !this.sahne || this.sahne.istek.includes(h)) return;
          this.sahne.istek.push(h); this.sahneYolla();
        });
      case "sahneKapat":
        if (!this.sahne) return this.hata("sahne_yok");
        if (this.sahne.anlatici !== this.ben.hesap && !masaninBasi) return this.hata("yetki_yok");
        this.sahne = null;
        return this.sahneYolla();
      case "kita": {
        const at = this.atisma;
        if (!at) return this.hata("atisma_yok");
        if (at.asama !== "kita" || at.sira !== this.ben.hesap) return this.hata("sira_degil");
        const metin = ileti.metin.replace(/\r/g, "").trim();
        if (!metin || metin.split("\n").length > KITA_SATIR || [...metin].length > KITA_EN_UZUN) return this.hata("metin_gecersiz");
        return this.kitaYaz(this.ben.hesap, metin);
      }
      case "oy": {
        const at = this.atisma;
        if (!at) return this.hata("atisma_yok");
        if (at.asama !== "oylama") return this.hata("oylama_kapali");
        if (!at.hak.includes(this.ben.hesap)) return this.hata("oy_hakki_yok");
        if (at.oyVeren.includes(this.ben.hesap)) return this.hata("oy_verildi");
        if (ileti.hedef !== at.a && ileti.hedef !== at.b) return this.hata("taraf_degil");
        return this.oyVer(this.ben.hesap, ileti.hedef);
      }
      case "atismaKapat": {
        const at = this.atisma;
        if (!at) return this.hata("atisma_yok");
        if (at.a !== this.ben.hesap && at.b !== this.ben.hesap && !masaninBasi) return this.hata("yetki_yok");
        return this.atismaBitir();
      }
    }
  }
}

const EYLEM_KURALI: Record<string, { hedef: boolean; oturan: boolean; sart: boolean }> = {
  yemin: { hedef: false, oturan: true, sart: true }, sozlesme: { hedef: true, oturan: true, sart: true },
  ittifak: { hedef: true, oturan: true, sart: false }, ihbar: { hedef: true, oturan: false, sart: false },
  meydanOku: { hedef: true, oturan: true, sart: false }, atisma: { hedef: true, oturan: true, sart: false },
};
const gecikme = <T,>(v: T, ms = 220) => new Promise<T>((r) => setTimeout(() => r(v), ms));

const SAHTE_PANO = new Map<number, PanoIlani[]>();
const panoAl = (han: number) => { let l = SAHTE_PANO.get(han); if (!l) { l = []; SAHTE_PANO.set(han, l); } return l; };
const isletme = (no: number) => `develi.han.${no}`;
export function sahteHanIstemci(hesap: string, ad: string, hanNo = 1): HanIstemci {
  const ben: Plaka = { hesap, ad };
  const han = hanNo;
  const yok = <T,>() => gecikme(ekBasarisiz<T>("han_yok"));
  const pano = panoAl(han);
  return {
    hanNo: han,
    han: (dil) => {
      if (!hanVarMi(han)) return yok();
      const masaOzetleri = (h: number) => {
        const w = dunyaAl(h);
        return w.masalar.map((m, i) => {
          const g = gorunum(i + 1, m, ben, w.soket?.no === i + 1);
          return { no: i + 1, oturan: g.koltuklar.filter(Boolean).length, ayakta: g.ayakta, sira: g.sira.length, ayar: { ...AYAR, ...m.ayar } };
        });
      };
      const hanlar: HanKarti[] = SAHTE_HANLAR.map((k) => {
        const l = masaOzetleri(k.no);
        return { ...k, isletme: isletme(k.no), masa: { sayi: l.length, acik: l.filter((m) => m.ayar.acik).length, oturan: l.reduce((t, m) => t + m.oturan, 0) } };
      });
      const ozet: HanOzeti = {
        yerlesim: { id: "develi", ad: "Develi" },
        han: { tur: "han", ad: HAN_ADI[dil], no: han, isletme: isletme(han) },
        koltuk: KOLTUK,
        masalar: masaOzetleri(han),
        menu: MENU,
        hanlar,
      };
      return gecikme(ekBasarili(ozet));
    },
    eylem: (g: HanEylemGirdisi): Promise<EkSonuc<{ olay: MasaOlayi }>> => {
      if (!hanVarMi(han)) return yok();
      const w = dunyaAl(han);
      const onceki = w.istek.get("e" + g.istekNo) as { olay: MasaOlayi } | undefined;
      if (onceki) return gecikme(ekBasarili(onceki));
      const s = w.soket;
      const m = w.masalar[g.masa - 1];
      if (!m || !s || s.no !== g.masa) return gecikme(ekBasarisiz("masa_gecersiz"));
      const oturan = new Set(oturanlar(m).map((x) => x.p.hesap));
      if (!oturan.has(hesap)) return gecikme(ekBasarisiz("oturmuyor"));
      let olay: MasaOlayi;
      if (g.tur === "kabul") {
        const t = g.olay !== undefined ? w.olaylar.get(g.olay) : undefined;
        if (!t || t.hedef !== hesap || (t.tur !== "sozlesme" && t.tur !== "ittifak" && t.tur !== "atisma")) return gecikme(ekBasarisiz("olay_yok"));
        if (t.durum !== "teklif") return gecikme(ekBasarisiz("karar_verildi"));
        if (t.tur === "atisma" && s.mesgul()) return gecikme(ekBasarisiz("masa_mesgul"));
        olay = s.olay({ tur: "kabul", kim: hesap, hedef: t.kim, olay: t.no, ...(t.tur === "atisma" ? { teklifTur: "atisma" as const } : {}) });
        if (t.tur === "atisma") s.atismaBaslatYolla(t.kim, hesap, t.no);
        w.olaylar.set(t.no, { ...t, durum: "kabul", kabulOlay: olay.no });
      } else {
        const k = EYLEM_KURALI[g.tur]!;
        if (k.hedef && !g.hedef) return gecikme(ekBasarisiz("kisi_yok"));
        if (g.hedef === hesap) return gecikme(ekBasarisiz("kendi_hedef"));
        if (g.hedef && k.oturan && !oturan.has(g.hedef)) return gecikme(ekBasarisiz("hedef_masada_degil"));
        if (k.sart && !g.sart?.trim()) return gecikme(ekBasarisiz("metin_gecersiz"));
        if (g.tur === "atisma" && s.mesgul()) return gecikme(ekBasarisiz("masa_mesgul"));
        const onayli = g.tur === "sozlesme" || g.tur === "ittifak" || g.tur === "atisma";
        olay = s.olay({ tur: g.tur, kim: hesap, ...(g.hedef ? { hedef: g.hedef } : {}), ...(g.sart?.trim() ? { sart: g.sart.trim() } : {}), ...(onayli ? { durum: "teklif" as const } : {}) });
        // Sahte karşı taraf sözleşmeyi/ittifakı birkaç saniye sonra kabul eder.
        if (onayli && g.hedef) {
          const hedef = g.hedef;
          setTimeout(() => {
            const t = w.olaylar.get(olay.no);
            if (!t || t.durum !== "teklif" || w.soket !== s) return;
            if (g.tur === "atisma" && s.mesgul()) return;
            const kabul = s.olay({ tur: "kabul", kim: hedef, hedef: hesap, olay: t.no, ...(g.tur === "atisma" ? { teklifTur: "atisma" as const } : {}) });
            w.olaylar.set(t.no, { ...t, durum: "kabul", kabulOlay: kabul.no });
            if (g.tur === "atisma") s.atismaBaslatYolla(hesap, hedef, t.no);
          }, 3500);
        }
      }
      const yanit = { olay };
      w.istek.set("e" + g.istekNo, yanit);
      return gecikme(ekBasarili(yanit));
    },
    ikram: (g: IkramGirdisi): Promise<EkSonuc<IkramSonucu>> => {
      if (!hanVarMi(han)) return yok();
      const w = dunyaAl(han);
      const onceki = w.istek.get("i" + g.istekNo) as IkramSonucu | undefined;
      if (onceki) return gecikme(ekBasarili(onceki));
      if (g.hedef === hesap) return gecikme(ekBasarisiz("kendi_hedef"));
      const s = w.soket;
      const m = w.masalar[g.masa - 1];
      if (!m || !s || s.no !== g.masa) return gecikme(ekBasarisiz("masa_gecersiz"));
      if (!m.koltuklar.some((p) => p?.hesap === hesap)) return gecikme(ekBasarisiz("oturmuyor"));
      if (!m.koltuklar.some((p) => p?.hesap === g.hedef) && !m.sira.some((p) => p.hesap === g.hedef)) return gecikme(ekBasarisiz("hedef_masada_degil"));
      const taban = MENU.find((x) => x.id === g.ikram)?.fiyat;
      if (taban === undefined) return gecikme(ekBasarisiz("ikram_gecersiz"));
      // Oyuncu hanında sunucu gibi fiyat çarpanlı (tavan, en az 1).
      const kart = SAHTE_HANLAR.find((k) => k.no === han);
      const fiyat = kart?.sahip === "oyuncu" ? Math.max(1, Math.ceil((taban * kart.fc) / 100 - 1e-9)) : taban;
      if (cuzdan < fiyat) return gecikme(ekBasarisiz("para_yok"));
      cuzdan -= fiyat;
      const anons: MasaAnonsu = { tur: "ikram", kim: hesap, hedef: g.hedef, oge: g.ikram as IkramId, zaman: Date.now() };
      s.anons(anons);
      const yanit: IkramSonucu = { ikram: g.ikram, fiyat, para: cuzdan, anons };
      w.istek.set("i" + g.istekNo, yanit);
      return gecikme(ekBasarili(yanit));
    },
    soket: (no) => (hanVarMi(han) && no >= 1 && no <= dunyaAl(han).masalar.length ? new SahteSoket(no, ben, han) : undefined),
    sahte: true,
    // Önizleme: ziyafet ödemesi yalnız gerçek sunucuda; pano bu cihazın belleğinde.
    ziyafet: () => gecikme(ekBasarisiz("sunucu_yok")),
    pano: () => (hanVarMi(han) ? gecikme(ekBasarili({ ilanlar: [...pano] })) : yok()),
    panoAs: (g) => {
      if (!hanVarMi(han)) return yok();
      pano.unshift({ id: `p${han}-${pano.length + 1}`, tur: g.tur, metin: g.metin, kisi: { id: hesap, ad }, zaman: Date.now(), bitis: Date.now() + 7 * 864e5, benim: true });
      return gecikme(ekBasarili({ ilanlar: [...pano] }));
    },
    panoSil: (g) => {
      const i = pano.findIndex((x) => x.id === g.ilan && x.benim);
      if (i < 0) return gecikme(ekBasarisiz("ilan_yok"));
      pano.splice(i, 1);
      return gecikme(ekBasarili({ ilanlar: [...pano] }));
    },
    ilanSikayet: () => gecikme(ekBasarili({ durum: "acik" })),
    ses: (no, alt) => {
      const s = dunyaAl(han).soket;
      if (!s || s.no !== no) return gecikme(ekBasarisiz("masada_degil"));
      if (alt === "yayin" || alt === "kapat") {
        const h = s.sesYayin(alt === "yayin");
        if (h) return gecikme(ekBasarisiz(h));
      }
      return gecikme(ekBasarili({}));
    },
  };
}
