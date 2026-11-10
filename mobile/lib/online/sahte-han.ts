// Geliştirici oturumu ve tasarım önizlemesi için sahte han: bellekte dört masa, birkaç uydurma oyuncu ve sahte soket.
// Sunucunun masa kurallarını (otur/kalk/sıra/masa başı/at/öne al/sustur, butonlu eylem, ikram) kabaca taklit eder;
// sunucuya hiç bağlanmaz. Sohbet örnekleri oyuncu yazısı yerine geçer (çeviri sözlüğü değildir).
// Faz 16 ses de taklit edilir (yerel WebRTC modülü olmadan): yayın/konuşan/ses kesme/söz isteme durumları gelir, ses yoktur.
import { ekBasarili, ekBasarisiz, type EkSonuc } from "./ek-istemci";
import type {
  HamSoket, HanEylemGirdisi, HanOzeti, IkramGirdisi, IkramId, IkramSonucu, IstemciIletisi, MasaAnonsu, MasaAyari,
  MasaGorunumu, MasaOlayi, MenuSatiri, Plaka, SesDurumu, SunucuIletisi, HanIstemci,
} from "./han-veri";
import type { Dil } from "./protokol";

const KOLTUK = 6;
const MENU: MenuSatiri[] = [{ id: "ekmek", fiyat: 2 }, { id: "serbet", fiyat: 3 }, { id: "yemek", fiyat: 6 }, { id: "gulSuyu", fiyat: 10 }];
const HAN_ADI: Record<Dil, string> = { tr: "Küçük Han", en: "Small Inn", es: "Posada pequeña", pt: "Pequena estalagem", ar: "خان صغير", ru: "Малый постоялый двор" };
const AYAR: MasaAyari = { tur: "acik", acik: true, sesli: true, kavgaYasak: false };
const KISILER: Plaka[] = [
  { hesap: "oy-kerim", ad: "Kerim Usta" }, { hesap: "oy-ayse", ad: "Ayşe Hatun" }, { hesap: "oy-osman", ad: "Osman Kalfa" },
  { hesap: "oy-zeynep", ad: "Zeynep" }, { hesap: "oy-mehmet", ad: "Mehmet Çelebi", cerceve: "yaldiz" }, { hesap: "oy-hatice", ad: "Hatice Kadın" },
  { hesap: "oy-yakup", ad: "Yakup" }, { hesap: "oy-selim", ad: "Selim Ağa" },
];
const SOZLER = [
  "Kervan yarın sabah Konya yolundan geliyormuş.", "Demirhan'da tuz yine pahalanmış, duydunuz mu?",
  "Lonca bu ay keçe siparişi açtı.", "Hancı, bir şerbet daha!", "Kış erken gelecek, odunu şimdiden yığın.",
  "Kadı efendi çarşı kavgasını yarın dinleyecekmiş.", "Ahi babanın çırağı usta oldu, hayırlı olsun.",
];

interface SahteMasa { koltuklar: (Plaka | null)[]; oturma: number[]; sira: Plaka[]; ayakta: number; atilan: Set<string> }
interface Dunya { masalar: SahteMasa[]; olayNo: number; olaylar: Map<number, MasaOlayi>; para: number; istek: Map<string, unknown>; soket: SahteSoket | null }

function masaKur(oturan: number[], ayakta: number, sira: number[] = []): SahteMasa {
  const koltuklar: (Plaka | null)[] = Array.from({ length: KOLTUK }, () => null);
  const oturma = Array.from({ length: KOLTUK }, () => 0);
  oturan.forEach((k, i) => { koltuklar[i * 2 % KOLTUK + Math.floor(i / 3)] = KISILER[k]!; });
  koltuklar.forEach((p, i) => { if (p) oturma[i] = i + 1; });
  return { koltuklar, oturma, sira: sira.map((k) => KISILER[k]!), ayakta, atilan: new Set() };
}

let dunya: Dunya | null = null;
function dunyaAl(): Dunya {
  dunya ??= {
    masalar: [masaKur([0, 1, 4], 2), masaKur([2, 3, 5, 6, 7, 1], 3, [4]), masaKur([], 0), masaKur([6], 1)],
    olayNo: 40, olaylar: new Map(), para: 40, istek: new Map(), soket: null,
  };
  // Masa 2 bilerek dolu: altı koltuk.
  const m2 = dunya.masalar[1]!;
  m2.koltuklar = m2.koltuklar.map((p, i) => p ?? KISILER[(i + 2) % KISILER.length]!);
  m2.oturma = m2.oturma.map((o, i) => o || i + 1);
  return dunya;
}

const oturanlar = (m: SahteMasa) => m.koltuklar.flatMap((p, i) => (p ? [{ p, i, o: m.oturma[i]! }] : []));
function masaBasi(m: SahteMasa): string | null {
  const o = oturanlar(m).sort((a, b) => a.o - b.o)[0];
  return o?.p.hesap ?? null;
}
function gorunum(no: number, m: SahteMasa, ben: Plaka, bagli: boolean): MasaGorunumu {
  const benOturuyor = m.koltuklar.some((p) => p?.hesap === ben.hesap);
  return { no, koltuklar: [...m.koltuklar], masaBasi: masaBasi(m), sira: [...m.sira], ayakta: m.ayakta + (bagli && !benOturuyor ? 1 : 0), ayar: AYAR };
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
  constructor(readonly no: number, readonly ben: Plaka) {
    const w = dunyaAl();
    w.soket?.kapat();
    w.soket = this;
    this.sonra(150, () => {
      this.d?.acildi();
      if (no === 1) this.yayin.add("oy-kerim").add("oy-ayse");
      this.yolla({ t: "hosgeldin", ben, susturma: null, masa: this.gor(), ses: this.sesGor() });
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
  private masa() { return dunyaAl().masalar[this.no - 1]!; }
  private gor() { return gorunum(this.no, this.masa(), this.ben, true); }
  private sonra(ms: number, is: () => void) { this.zaman.push(setTimeout(() => { if (!this.kapali) is(); }, ms)); }
  private yolla(v: SunucuIletisi) { if (!this.kapali) this.d?.ileti(v); }
  private durum() { this.yolla({ t: "durum", masa: this.gor() }); }
  private hata(hata: string, istek?: string) { this.yolla({ t: "hata", hata, ...(istek ? { istek } : {}) }); }
  anons(a: MasaAnonsu) { this.yolla({ t: "anons", anons: a }); }
  olay(o: Omit<MasaOlayi, "no" | "masa" | "zaman" | "katilim">): MasaOlayi {
    const w = dunyaAl();
    const tam: MasaOlayi = { ...o, no: ++w.olayNo, masa: `masa:sahte:${this.no}`, zaman: Date.now(), katilim: oturanlar(this.masa()).sort((a, b) => a.i - b.i).map((x) => x.p.hesap) };
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
    this.yayin.clear();
    this.zaman.forEach(clearTimeout);
    if (this.dongu) clearInterval(this.dongu);
    const w = dunyaAl();
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
        return this.durum();
      case "yaz": {
        if (benKoltuk < 0) return this.hata("oturmuyor");
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
        const w = dunyaAl();
        const o: MasaOlayi = { no: ++w.olayNo, masa: `masa:sahte:${this.no}`, tur: "atma", kim: this.ben.hesap, hedef: ileti.hedef, zaman: Date.now(), katilim };
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
        if (!this.soz.some((p) => p.hesap === this.ben.hesap)) return this.hata("soz_istegi_yok");
        this.soz = this.soz.filter((p) => p.hesap !== this.ben.hesap);
        return this.sesYolla();
      case "sozVer":
        if (!masaninBasi) return this.hata("yetki_yok");
        return this.hata("soz_istegi_yok");
    }
  }
}

const EYLEM_KURALI: Record<string, { hedef: boolean; oturan: boolean; sart: boolean }> = {
  yemin: { hedef: false, oturan: true, sart: true }, sozlesme: { hedef: true, oturan: true, sart: true },
  ittifak: { hedef: true, oturan: true, sart: false }, ihbar: { hedef: true, oturan: false, sart: false },
  meydanOku: { hedef: true, oturan: true, sart: false },
};
const gecikme = <T,>(v: T, ms = 220) => new Promise<T>((r) => setTimeout(() => r(v), ms));

export function sahteHanIstemci(hesap: string, ad: string): HanIstemci {
  const ben: Plaka = { hesap, ad };
  return {
    han: (dil) => {
      const w = dunyaAl();
      const ozet: HanOzeti = {
        yerlesim: { id: "develi", ad: "Develi" },
        han: { tur: "kucukHan", ad: HAN_ADI[dil] },
        koltuk: KOLTUK,
        masalar: w.masalar.map((m, i) => {
          const g = gorunum(i + 1, m, ben, w.soket?.no === i + 1);
          return { no: i + 1, oturan: g.koltuklar.filter(Boolean).length, ayakta: g.ayakta, sira: g.sira.length, ayar: AYAR };
        }),
        menu: MENU,
      };
      return gecikme(ekBasarili(ozet));
    },
    eylem: (g: HanEylemGirdisi): Promise<EkSonuc<{ olay: MasaOlayi }>> => {
      const w = dunyaAl();
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
        if (!t || t.hedef !== hesap || (t.tur !== "sozlesme" && t.tur !== "ittifak")) return gecikme(ekBasarisiz("olay_yok"));
        if (t.durum !== "teklif") return gecikme(ekBasarisiz("karar_verildi"));
        olay = s.olay({ tur: "kabul", kim: hesap, hedef: t.kim, olay: t.no });
        w.olaylar.set(t.no, { ...t, durum: "kabul", kabulOlay: olay.no });
      } else {
        const k = EYLEM_KURALI[g.tur]!;
        if (k.hedef && !g.hedef) return gecikme(ekBasarisiz("kisi_yok"));
        if (g.hedef === hesap) return gecikme(ekBasarisiz("kendi_hedef"));
        if (g.hedef && k.oturan && !oturan.has(g.hedef)) return gecikme(ekBasarisiz("hedef_masada_degil"));
        if (k.sart && !g.sart?.trim()) return gecikme(ekBasarisiz("metin_gecersiz"));
        const onayli = g.tur === "sozlesme" || g.tur === "ittifak";
        olay = s.olay({ tur: g.tur, kim: hesap, ...(g.hedef ? { hedef: g.hedef } : {}), ...(g.sart?.trim() ? { sart: g.sart.trim() } : {}), ...(onayli ? { durum: "teklif" as const } : {}) });
        // Sahte karşı taraf sözleşmeyi/ittifakı birkaç saniye sonra kabul eder.
        if (onayli && g.hedef) {
          const hedef = g.hedef;
          setTimeout(() => {
            const t = w.olaylar.get(olay.no);
            if (!t || t.durum !== "teklif" || w.soket !== s) return;
            const kabul = s.olay({ tur: "kabul", kim: hedef, hedef: hesap, olay: t.no });
            w.olaylar.set(t.no, { ...t, durum: "kabul", kabulOlay: kabul.no });
          }, 3500);
        }
      }
      const yanit = { olay };
      w.istek.set("e" + g.istekNo, yanit);
      return gecikme(ekBasarili(yanit));
    },
    ikram: (g: IkramGirdisi): Promise<EkSonuc<IkramSonucu>> => {
      const w = dunyaAl();
      const onceki = w.istek.get("i" + g.istekNo) as IkramSonucu | undefined;
      if (onceki) return gecikme(ekBasarili(onceki));
      if (g.hedef === hesap) return gecikme(ekBasarisiz("kendi_hedef"));
      const s = w.soket;
      const m = w.masalar[g.masa - 1];
      if (!m || !s || s.no !== g.masa) return gecikme(ekBasarisiz("masa_gecersiz"));
      if (!m.koltuklar.some((p) => p?.hesap === hesap)) return gecikme(ekBasarisiz("oturmuyor"));
      if (!m.koltuklar.some((p) => p?.hesap === g.hedef) && !m.sira.some((p) => p.hesap === g.hedef)) return gecikme(ekBasarisiz("hedef_masada_degil"));
      const fiyat = MENU.find((x) => x.id === g.ikram)?.fiyat;
      if (fiyat === undefined) return gecikme(ekBasarisiz("ikram_gecersiz"));
      if (w.para < fiyat) return gecikme(ekBasarisiz("para_yok"));
      w.para -= fiyat;
      const anons: MasaAnonsu = { tur: "ikram", kim: hesap, hedef: g.hedef, oge: g.ikram as IkramId, zaman: Date.now() };
      s.anons(anons);
      const yanit: IkramSonucu = { ikram: g.ikram, fiyat, para: w.para, anons };
      w.istek.set("i" + g.istekNo, yanit);
      return gecikme(ekBasarili(yanit));
    },
    soket: (no) => (no >= 1 && no <= dunyaAl().masalar.length ? new SahteSoket(no, ben) : undefined),
    sahte: true,
    ses: (no, alt) => {
      const s = dunyaAl().soket;
      if (!s || s.no !== no) return gecikme(ekBasarisiz("masada_degil"));
      if (alt === "yayin" || alt === "kapat") {
        const h = s.sesYayin(alt === "yayin");
        if (h) return gecikme(ekBasarisiz(h));
      }
      return gecikme(ekBasarili({}));
    },
  };
}
