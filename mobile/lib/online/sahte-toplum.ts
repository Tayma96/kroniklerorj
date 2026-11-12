// Sahte (geliştirici/önizleme) oyuncular arası uçlar: bellekte, sunucu kurallarının kaba bir kopyasıyla.
// Sakinler sahte-yerlesim.ts ile aynı: o1 Ayşe, o2 Kerem, o3 ben, o4 Deniz. Sonuçlar inandırıcı ama yetkili değildir.
import type { SahteKasaba } from "./sahte-yerlesim";
import type { SahteMeslek } from "./sahte-meslek";
import type { ToplumIstemci } from "./toplum-istemci";
import { basarili, basarisiz, type Cinsiyet, type Dil, type KisiAdi, type MalId, type MeslekId, type Profil, type Sonuc } from "./protokol";
import { MALLAR } from "./meslek-veri";
import {
  TEKLIF_TURLERI, TOPLUM_SINIR,
  type BagDurumu, type DuzenGorunumu, type GelenCevap, type GelenYaniti, type OyuncuEylemi, type OyuncuMeslekSatiri, type OyuncuProfili,
  type SoylentiGorunumu, type TeklifGorunumu, type TeklifSartlari, type TeklifTuru, type TeveccuhGorunumu, type VitrinArmagani,
  type ToplulukDurumu,
} from "./toplum-veri";

interface SOyuncu { o: string; ad: string; k: Cinsiyet; yas: number; meslekler: OyuncuMeslekSatiri[]; tv: number; vitrin: VitrinArmagani[]; nam: number[] }
const ESIK = [0, 20, 60, 150, 400, 1000];
const kademeOf = (p: number) => ESIK.reduce((kd, e, i) => (p >= e ? i : kd), 0);
const etki = (k: string, deger: number) => ({ k, p: { deger } });
function teveccuh(p: number, veren: number): TeveccuhGorunumu {
  const kd = kademeOf(p);
  return {
    kademe: kd, puan: p, sonrakiEsik: ESIK[kd + 1] ?? null, verenSayisi: veren,
    etkiler: [etki("teveccuh.etki.ilkIzlenim", Math.min(5, kd)), etki("teveccuh.etki.siparis", kd), etki("teveccuh.etki.secim", kd * 2),
      etki("teveccuh.etki.sahne", kd), etki("teveccuh.etki.musteri", kd * 5), etki("teveccuh.etki.ahi", kd >= 3 ? 1 : 0)].filter((e) => e.p.deger !== 0),
  };
}

export function sahteToplumKur(kasabaAl: () => SahteKasaba | null, meslekAl: () => SahteMeslek | null, profilAl: () => Profil | null, bekle: () => Promise<void>): ToplumIstemci {
  let kurulu = false;
  const oyuncular: SOyuncu[] = [];
  const bag: Record<string, BagDurumu> = {};
  const husumet: Record<string, { ben: boolean; o: boolean; ay: number }> = {};
  const engel = new Set<string>();
  let teklifler: TeklifGorunumu[] = [];
  let soylentiler: SoylentiGorunumu[] = [];
  let tn = 40;
  let benVitrin: VitrinArmagani[] = [];
  let benArmaganlar: VitrinArmagani[] = [];
  let benTv = 26;
  const duzen: DuzenGorunumu = {
    gelen: Object.fromEntries(TEKLIF_TURLERI.map((t) => [t, "bekle"])) as Record<TeklifTuru, GelenCevap>,
    borcCevap: "bekle", borcEnCok: 0,
    sinir: { borcEnCok: TOPLUM_SINIR.duzenBorcEnCok, kendiligindenKabulYok: ["gorucu", "npcDunur"], cevaplar: ["bekle", "kabul", "ret"] },
  };

  const eko = () => kasabaAl()?.ekonomi();
  const benId = () => eko()?.benId ?? "o3";
  const ay = () => eko()?.ay ?? 0;
  const benAd = (): KisiAdi => ({ id: benId(), ad: profilAl()?.ad ?? "?" });
  const kisi = (id: string): KisiAdi => (id === benId() ? benAd() : { id, ad: oyuncular.find((x) => x.o === id)?.ad ?? "?" });

  function kur(dil: Dil) {
    if (kurulu) return;
    kurulu = true;
    const a = ay();
    oyuncular.push(
      { o: "o1", ad: "Ayşe", k: "kadın", yas: 14, tv: 74, nam: [9, 3, 6, 14],
        meslekler: [{ meslek: "demirci", kademe: 1, dallar: ["alet", "silah"] }, { meslek: "oduncu", kademe: 0, dallar: ["orman"] }],
        vitrin: [{ id: "t7", kimden: { id: "o2", ad: "Kerem" }, ay: a - 3, mal: "kereste", adet: 2, yapan: { id: "o2", ad: "Kerem" } }, { id: "t5", kimden: { id: "o3", ad: profilAl()?.ad ?? "?" }, ay: a - 6, akce: 6, yapan: null }] },
      { o: "o2", ad: "Kerem", k: "erkek", yas: 13, tv: 8, nam: [2, 1, 3, 7], meslekler: [{ meslek: "marangoz", kademe: 0, dallar: [] }], vitrin: [] },
      { o: "o4", ad: "Deniz", k: "erkek", yas: 12, tv: 0, nam: [0, 0, 4, 1], meslekler: [], vitrin: [] },
    );
    bag.o1 = "istekGeldi";
    bag.o2 = null;
    husumet.o4 = { ben: false, o: true, ay: a - 1 };
    const npc = kasabaAl()?.ekonomi().yetiskinler(dil) ?? [];
    const n1 = npc[0] ?? { id: "n1", ad: "Hasan" };
    const n2 = npc[1] ?? { id: "n2", ad: "Fatma" };
    const ben = benAd();
    const t = (p: Partial<TeklifGorunumu> & Pick<TeklifGorunumu, "tur" | "gonderen" | "alici" | "sartlar">): TeklifGorunumu => ({
      id: `t${tn++}`, kaynak: p.gonderen.id.startsWith("n") ? "npc" : "oyuncu", yon: p.alici.id === ben.id ? "gelen" : "giden",
      emanet: 0, acilisAyi: a, sonAy: a + 1, varsayilan: "dustu", durum: "acik", ...p,
    });
    const ayse = kisi("o1"), kerem = kisi("o2");
    const hediyeAyse: VitrinArmagani = { id: "t12", kimden: ayse, ay: a - 2, mal: "nal", adet: 2, yapan: ayse };
    const hediyeKerem: VitrinArmagani = { id: "t9", kimden: kerem, ay: a - 4, akce: 5, yapan: null };
    benArmaganlar = [hediyeAyse, hediyeKerem];
    benVitrin = [hediyeAyse, hediyeKerem];
    teklifler = [
      t({ tur: "ortak", gonderen: ayse, alici: ben, sartlar: { pay: 10, sure: 6 }, acilisAyi: a, sonAy: a + 1 }),
      t({ tur: "npcIs", gonderen: { id: n1.id, ad: n1.ad }, alici: ben, sartlar: { tutar: 4 }, sonAy: a + 2 }),
      t({ tur: "npcBorc", gonderen: { id: n2.id, ad: n2.ad }, alici: ben, sartlar: { tutar: 5, vade: 6 }, sonAy: a, varsayilan: "ret" }),
      t({ tur: "borc", gonderen: ben, alici: kerem, sartlar: { yon: "ver", tutar: 10, faiz: 10, vade: 4 }, emanet: 10, borclu: kerem.id, alacakli: ben.id, kalan: null, vadeAyi: null }),
      t({ tur: "borc", gonderen: ayse, alici: ben, sartlar: { yon: "ver", tutar: 8, faiz: 12, vade: 6 }, acilisAyi: a - 3, sonAy: a - 2, durum: "surer", kabulAyi: a - 3, borclu: ben.id, alacakli: ayse.id, kalan: 9, vadeAyi: a + 3 }),
      t({ tur: "hediye", gonderen: ayse, alici: ben, sartlar: { mal: "nal", adet: 2, yapan: ayse }, acilisAyi: a - 2, sonAy: a - 1, durum: "bitti", kabulAyi: a - 2, kapanisAyi: a - 2, neden: "verildi", id: "t12" }),
      t({ tur: "cirak", gonderen: kerem, alici: ben, sartlar: { meslek: "marangoz", usta: kerem.id }, acilisAyi: a - 5, sonAy: a - 4, durum: "dustu", kapanisAyi: a - 3 }),
    ];
    soylentiler = [
      { id: "s3", tur: "hediye", hedef: { id: n1.id, ad: n1.ad }, ay: a - 1, bilen: 4, guven: 62, etki: 4, yalanlandi: false, yayiliyor: true },
      { id: "s2", tur: "husumet", hedef: kerem, ay: a - 5, bilen: 2, guven: 38, etki: -3, yalanlandi: false, yayiliyor: true },
      { id: "s1", tur: "borcOdenmedi", hedef: ayse, ay: a - 9, bilen: 1, guven: 20, etki: -6, yalanlandi: true, yayiliyor: false },
    ];
  }

  function eylemler(o: SOyuncu): OyuncuEylemi[] {
    const yasBen = eko()?.yas ?? 12;
    const kapi = (enAz: number) => (engel.has(o.o) ? "engelli" : yasBen < enAz || o.yas < enAz ? "yas_kapisi" : undefined);
    const b = bag[o.o] ?? null;
    const l: OyuncuEylemi[] = [];
    const ekle = (tur: string, islem: string | undefined, e: string | undefined) => l.push({ tur, ...(islem ? { islem } : {}), acik: e === undefined, ...(e ? { engel: e } : {}) });
    ekle("dostluk", b === "dost" ? "bitir" : b === "istekGeldi" ? "kabul" : b === "istekGonderildi" ? "bekliyor" : "iste", b === "dost" ? undefined : kapi(TOPLUM_SINIR.teklifYasi));
    for (const tur of ["cirak", "ortak", "borc", "hediye", "gorucu"]) ekle(`teklif.${tur}`, undefined, kapi(tur === "gorucu" ? TOPLUM_SINIR.gorucuYasi : TOPLUM_SINIR.teklifYasi));
    ekle("husumet", husumet[o.o]?.ben ? "kaldir" : "ilan", undefined);
    ekle("engelle", engel.has(o.o) ? "kaldir" : "engelle", undefined);
    ekle("sikayet", undefined, undefined);
    return l;
  }

  function profil(id: string, dil: Dil): Sonuc<OyuncuProfili> {
    kur(dil);
    const e = eko();
    if (!e) return basarisiz("profil_yok");
    const ortak = (e.yetiskinler(dil) ?? []).slice(2, 5).map((n) => ({ id: n.id, ad: n.ad }));
    if (id === benId()) {
      const p = profilAl();
      const mk = meslekAl()?.benEki().meslek;
      const satir = Object.entries(mk?.s ?? {}).map(([meslek, i]) => ({ meslek: meslek as MeslekId, kademe: i!.kd, dallar: i!.dl }));
      return basarili({
        id, ad: p?.ad ?? "?", oyuncu: true, ben: true, cinsiyet: p?.cinsiyet ?? "kadın", yas: e.yas,
        meslek: { ana: mk?.a || null, anaKademe: mk?.a ? (mk.s[mk.a]?.kd ?? 0) : null, yan: mk?.y || null, yanKademe: mk?.y ? (mk.s[mk.y]?.kd ?? 0) : null },
        meslekler: satir, hane: { id: 3, reis: e.yetiskinler(dil)[5] ? { id: e.yetiskinler(dil)[5]!.id, ad: e.yetiskinler(dil)[5]!.ad } : null },
        nam: { comertlik: 6, dindarlik: 4, mertlik: 24, caliskanlik: 12 }, mekan: "carsi", bag: null,
        husumet: { benIlanEttim: false, oIlanEtti: false },
        husumetler: Object.entries(husumet).filter(([, h]) => h.ben || h.o).map(([o, h]) => ({ ...kisi(o), yon: h.ben ? "ilanEtti" : "hedef", ay: h.ay })),
        dostSayisi: Object.values(bag).filter((b) => b === "dost").length, ortakTanidiklar: [], engelledim: false,
        teveccuh: teveccuh(benTv, 3), vitrin: benVitrin, eylemler: [],
      });
    }
    const o = oyuncular.find((x) => x.o === id);
    if (!o) return basarisiz("kisi_yok");
    return basarili({
      id, ad: o.ad, oyuncu: true, ben: false, cinsiyet: o.k, yas: o.yas,
      meslek: { ana: o.meslekler[0]?.meslek ?? null, anaKademe: o.meslekler[0]?.kademe ?? null, yan: o.meslekler[1]?.meslek ?? null, yanKademe: o.meslekler[1]?.kademe ?? null },
      meslekler: o.meslekler, hane: { id: 7, reis: e.yetiskinler(dil)[1] ? { id: e.yetiskinler(dil)[1]!.id, ad: e.yetiskinler(dil)[1]!.ad } : null },
      nam: { comertlik: o.nam[0]!, dindarlik: o.nam[1]!, mertlik: o.nam[2]!, caliskanlik: o.nam[3]! },
      mekan: o.o === "o1" ? "cami" : o.o === "o2" ? "kahvehane" : "meydan", bag: bag[o.o] ?? null,
      husumet: { benIlanEttim: !!husumet[o.o]?.ben, oIlanEtti: !!husumet[o.o]?.o },
      husumetler: husumet[o.o]?.o ? [{ ...benAd(), yon: "ilanEtti", ay: husumet[o.o]!.ay }] : husumet[o.o]?.ben ? [{ ...benAd(), yon: "hedef", ay: husumet[o.o]!.ay }] : [],
      dostSayisi: o.o === "o1" ? 4 : 1, ortakTanidiklar: o.o === "o4" ? [] : ortak, engelledim: engel.has(o.o),
      teveccuh: teveccuh(o.tv, o.tv ? 5 : 0), vitrin: o.vitrin, eylemler: eylemler(o),
    });
  }

  function gelen(dil: Dil): GelenYaniti {
    kur(dil);
    const b = benId();
    const g = (x: TeklifGorunumu) => ({ ...x, yon: x.alici.id === b ? "gelen" as const : "giden" as const });
    return {
      ay: ay(),
      gelen: teklifler.filter((x) => x.durum === "acik" && x.alici.id === b).map(g),
      giden: teklifler.filter((x) => x.durum === "acik" && x.gonderen.id === b).map(g),
      suren: teklifler.filter((x) => x.durum === "surer").map(g),
      kapanan: teklifler.filter((x) => x.durum !== "acik" && x.durum !== "surer").slice(-20).reverse().map(g),
      dostluk: {
        gelen: Object.entries(bag).filter(([, v]) => v === "istekGeldi").map(([o]) => ({ ...kisi(o), ay: ay() - 1 })),
        giden: Object.entries(bag).filter(([, v]) => v === "istekGonderildi").map(([o]) => ({ ...kisi(o), ay: ay() })),
        dostlar: Object.entries(bag).filter(([, v]) => v === "dost").map(([o]) => ({ ...kisi(o), ay: ay() })),
      },
      husumetler: Object.entries(husumet).flatMap(([o, h]) => [
        ...(h.ben ? [{ ...kisi(o), yon: "ilanEttim" as const, ay: h.ay }] : []),
        ...(h.o ? [{ ...kisi(o), yon: "ilanEdildi" as const, ay: h.ay }] : []),
      ]),
      soylentiler,
      engellenenler: [...engel].map(kisi),
    };
  }

  const bul = (id: string) => teklifler.find((x) => x.id === id);
  const kapat = (x: TeklifGorunumu, d: TeklifGorunumu["durum"], neden?: string) => {
    x.durum = d;
    x.kapanisAyi = ay();
    if (neden) x.neden = neden;
    const e = eko();
    if (e && x.emanet && x.gonderen.id === benId() && d !== "bitti") e.kar.pa += x.emanet;
    if (d !== "bitti") x.emanet = 0;
  };

  let secim = { el: "orta", cesaret: "orta", gurur: "orta" };
  let dertPuan = 28;
  let senlikSayi = 1;
  const pano = (): ToplulukDurumu => ({
    mesrep: { secildi: Object.values(secim).some((x) => x !== "orta"), secimAcik: true,
      eksenler: (["el", "cesaret", "gurur"] as const).map((eksen) => ({
        eksen, secili: secim[eksen], uclar: [{ uc: "comert", etkiler: [] }, { uc: "hesapli", etkiler: [] }, { uc: "temkinli", etkiler: [] }, { uc: "gozupek", etkiler: [] }, { uc: "mutevazi", etkiler: [] }, { uc: "gururlu", etkiler: [] }],
      })) },
    hami: { suren: [], gelen: [], giden: [], biten: [] },
    ortakDert: { acik: [{ id: "d1", tur: "haydut", durum: "acik", acilis: ay() - 1, bitis: ay() + 3, esik: 60, puan: dertPuan, halk: 8, defter: [], benim: { sayi: 0, kalan: 3, puan: 0 } }], son: [], uygunKatkilarim: ["elEmegi", "nobet", "moral"], kurallar: {} },
    senlik: { simdiki: { id: "nevruz-1252", tur: "nevruz", durum: "acik", acilis: ay() - 1, bitis: ay() + 2, levha: [], benim: { sayi: senlikSayi, kalan: 3 - senlikSayi } }, sonKapanan: null, kurallar: {} },
    mudavim: { rozet: "mudavim", ziyaret: 4, sonraki: { rozet: "hanDemirbasi", gereken: 6 }, indirim: { deger: 2, tavan: 5 } },
    zaviye: { benim: null, davetler: [], kasabada: [], ahiSarti: { teveccuhKademe: 2, benimKademem: 1, adayim: false } },
    gostergeler: { arz: 56, moral: 61, asayis: 48, denge: 50, taban: 0, tavan: 100 },
  });
  return {
    async toplulukOku() { await bekle(); return basarili(pano()); },
    async mesrep(i) { await bekle(); secim = { el: i.el, cesaret: i.cesaret, gurur: i.gurur }; return basarili({ mesrep: pano().mesrep }); },
    async ortakDert(i) { await bekle(); dertPuan += i.katki === "elEmegi" ? 4 : 8; return basarili({ puan: dertPuan }); },
    async senlik(i) { await bekle(); senlikSayi = Math.min(3, senlikSayi + 1); return basarili({ sayi: senlikSayi }); },
    async oyuncu(id, dil) { await bekle(); return profil(id, dil); },
    async gelen(dil) { await bekle(); return eko() ? basarili(gelen(dil)) : basarisiz("profil_yok"); },
    async dostluk(i) {
      await bekle();
      const o = oyuncular.find((x) => x.o === i.hedef);
      if (!o) return basarisiz("kisi_yok");
      if (engel.has(o.o)) return basarisiz("engelli");
      const b = bag[o.o] ?? null;
      if (i.islem === "iste") {
        if ((eko()?.yas ?? 0) < TOPLUM_SINIR.teklifYasi || o.yas < TOPLUM_SINIR.teklifYasi) return basarisiz("yas_kapisi");
        bag[o.o] = b === "istekGeldi" || b === "dost" ? "dost" : "istekGonderildi";
      } else if (i.islem === "kabul") {
        if (b !== "istekGeldi") return basarisiz("istek_yok");
        bag[o.o] = "dost";
      } else if (i.islem === "ret") {
        if (b !== "istekGeldi" && b !== "istekGonderildi") return basarisiz("istek_yok");
        bag[o.o] = null;
      } else {
        if (b !== "dost") return basarisiz("istek_yok");
        bag[o.o] = null;
      }
      return basarili({ hedef: o.o, bag: bag[o.o] ?? null });
    },
    async teklif(i) {
      await bekle();
      const e = eko();
      const o = oyuncular.find((x) => x.o === i.hedef);
      if (!e) return basarisiz("profil_yok");
      if (!o) return basarisiz("kisi_yok");
      if (engel.has(o.o)) return basarisiz("engelli");
      const enAz = i.tur === "gorucu" ? TOPLUM_SINIR.gorucuYasi : TOPLUM_SINIR.teklifYasi;
      if (e.yas < enAz || o.yas < enAz) return basarisiz("yas_kapisi");
      if (teklifler.some((x) => x.durum === "acik" && x.tur === i.tur && ((x.gonderen.id === benId() && x.alici.id === o.o) || (x.alici.id === benId() && x.gonderen.id === o.o)))) return basarisiz("teklif_siniri");
      let emanet = 0;
      const s: TeklifSartlari = {};
      if (i.tur === "cirak") { if (!i.meslek) return basarisiz("meslek_gecersiz"); s.meslek = i.meslek; s.usta = i.ustaBen === false ? o.o : benId(); }
      if (i.tur === "ortak") { if (!i.pay || !i.sure || i.pay > TOPLUM_SINIR.ortakPay || i.sure > TOPLUM_SINIR.ortakSure) return basarisiz("teklif_gecersiz"); s.pay = i.pay; s.sure = i.sure; }
      if (i.tur === "borc") {
        if (!i.tutar || !i.vade || i.tutar > TOPLUM_SINIR.borcEnCok) return basarisiz("teklif_gecersiz");
        Object.assign(s, { yon: i.yon ?? "ver", tutar: i.tutar, vade: i.vade, faiz: i.faiz ?? 0 });
        if (s.yon === "ver") { if (e.kar.pa < i.tutar) return basarisiz("para_yok"); emanet = i.tutar; }
      }
      if (i.tur === "hediye") {
        const deger = (i.tutar ?? 0) + (i.mal ? Math.max(1, MALLAR[i.mal as MalId]?.taban ?? 1) * (i.adet ?? 0) : 0);
        if (deger < 1 || deger > TOPLUM_SINIR.hediyeEnCok) return basarisiz("teklif_gecersiz");
        if (e.kar.pa < (i.tutar ?? 0)) return basarisiz("para_yok");
        if (e.kar.tk < TOPLUM_SINIR.hediyeTakat) return basarisiz("takat_yok");
        e.kar.tk -= TOPLUM_SINIR.hediyeTakat;
        if (i.tutar) s.tutar = i.tutar;
        if (i.mal) { s.mal = i.mal; s.adet = i.adet ?? 1; }
        emanet = i.tutar ?? 0;
      }
      e.kar.pa -= emanet;
      const yeni: TeklifGorunumu = {
        id: `t${tn++}`, tur: i.tur, kaynak: "oyuncu", yon: "giden", gonderen: benAd(), alici: kisi(o.o), sartlar: s, emanet,
        acilisAyi: ay(), sonAy: ay() + TOPLUM_SINIR.teklifSureAy - 1, varsayilan: "dustu", durum: "acik",
        ...(i.tur === "borc" ? { borclu: s.yon === "iste" ? benId() : o.o, alacakli: s.yon === "iste" ? o.o : benId(), kalan: null, vadeAyi: null } : {}),
      };
      teklifler.push(yeni);
      return basarili({ teklif: yeni });
    },
    async teklifCevap(i) {
      await bekle();
      const x = bul(i.teklif);
      const e = eko();
      if (!x || !e) return basarisiz("teklif_yok");
      const ben = benId();
      if (i.cevap === "kabul" || i.cevap === "ret") {
        if (x.alici.id !== ben) return basarisiz("taraf_degil");
        if (x.durum !== "acik") return basarisiz("teklif_kapandi");
        if (i.cevap === "ret") kapat(x, "ret");
        else if (x.tur === "npcIs") {
          if (e.kar.tk < TOPLUM_SINIR.npcIsTakat) return basarisiz("takat_yok");
          e.kar.tk -= TOPLUM_SINIR.npcIsTakat; e.kar.pa += x.sartlar.tutar ?? 0; x.durum = "bitti"; x.neden = "yapildi"; x.kapanisAyi = ay();
        } else if (x.tur === "npcBorc") {
          const tu = x.sartlar.tutar ?? 0;
          if (e.kar.pa < tu) return basarisiz("para_yok");
          e.kar.pa -= tu; x.durum = "surer"; x.kalan = tu; x.vadeAyi = ay() + (x.sartlar.vade ?? 6); x.borclu = x.gonderen.id; x.alacakli = ben;
        } else if (x.tur === "hediye") {
          e.kar.pa += x.emanet; x.emanet = 0; x.durum = "bitti"; x.neden = "verildi"; x.kapanisAyi = ay();
          const a: VitrinArmagani = { id: x.id, kimden: x.gonderen, ay: ay(), ...(x.sartlar.tutar ? { akce: x.sartlar.tutar } : {}), ...(x.sartlar.mal ? { mal: x.sartlar.mal, adet: x.sartlar.adet ?? 1 } : {}), yapan: x.sartlar.yapan ?? null };
          benArmaganlar = [a, ...benArmaganlar]; benVitrin = [a, ...benVitrin].slice(0, TOPLUM_SINIR.vitrinEnCok); benTv += (x.sartlar.tutar ?? 0) + (x.sartlar.adet ?? 0) * 3;
        } else if (x.tur === "gorucu" || x.tur === "npcDunur") { x.durum = "bitti"; x.neden = "kayit"; x.kapanisAyi = ay(); }
        else x.durum = "surer";
        x.kabulAyi = ay();
        return basarili({ teklif: { ...x } });
      }
      if (i.cevap === "geri") {
        if (x.gonderen.id !== ben) return basarisiz("taraf_degil");
        if (x.durum !== "acik") return basarisiz("teklif_kapandi");
        kapat(x, "geri");
        return basarili({ teklif: { ...x } });
      }
      if (i.cevap === "bitir") {
        if (x.durum !== "surer" || (x.tur !== "ortak" && x.tur !== "cirak")) return basarisiz("teklif_kapandi");
        kapat(x, "bitti", "bitirildi");
        return basarili({ teklif: { ...x } });
      }
      if (x.durum !== "surer" || x.tur !== "borc") return basarisiz("teklif_kapandi");
      if (x.borclu !== ben) return basarisiz("taraf_degil");
      const tutar = Math.min(i.tutar ?? x.kalan ?? 0, x.kalan ?? 0, e.kar.pa);
      if (tutar <= 0) return basarisiz("para_yok");
      e.kar.pa -= tutar;
      x.kalan = (x.kalan ?? 0) - tutar;
      if (x.kalan <= 0) kapat(x, "bitti", "odendi");
      return basarili({ teklif: { ...x } });
    },
    async husumet(i) {
      await bekle();
      const o = oyuncular.find((x) => x.o === i.hedef);
      if (!o) return basarisiz("kisi_yok");
      const h = (husumet[o.o] ??= { ben: false, o: false, ay: ay() });
      h.ben = i.islem === "ilan";
      if (h.ben) { h.ay = ay(); if (bag[o.o] === "dost") bag[o.o] = null; }
      return basarili({ hedef: o.o, husumet: h.ben });
    },
    async engelle(i) {
      await bekle();
      if (!oyuncular.some((x) => x.o === i.hedef)) return basarisiz("kisi_yok");
      if (i.islem === "kaldir") engel.delete(i.hedef);
      else {
        engel.add(i.hedef);
        bag[i.hedef] = null;
        for (const x of teklifler) if (x.durum === "acik" && (x.gonderen.id === i.hedef || x.alici.id === i.hedef)) kapat(x, "iptal", "engel");
      }
      return basarili({ engellenenler: [...engel].map(kisi) });
    },
    async duzenOku() { await bekle(); return basarili({ duzen: structuredClone(duzen) }); },
    async duzen(i) {
      await bekle();
      for (const [t, c] of Object.entries(i.gelen ?? {})) {
        if (c === "kabul" && duzen.sinir.kendiligindenKabulYok.includes(t as TeklifTuru)) return basarisiz("duzen_gecersiz");
        duzen.gelen[t as TeklifTuru] = c as GelenCevap;
      }
      if (i.borcCevap) duzen.borcCevap = i.borcCevap;
      if (i.borcEnCok !== undefined) {
        if (i.borcEnCok < 0 || i.borcEnCok > TOPLUM_SINIR.duzenBorcEnCok) return basarisiz("duzen_gecersiz");
        duzen.borcEnCok = i.borcEnCok;
      }
      return basarili({ duzen: structuredClone(duzen) });
    },
    async yalanla(i) {
      await bekle();
      const s = soylentiler.find((x) => x.id === i.soylenti);
      const e = eko();
      if (!s || !e) return basarisiz("soylenti_yok");
      if (s.yalanlandi) return basarisiz("soylenti_yok");
      if (e.kar.tk < TOPLUM_SINIR.yalanlamaTakat) return basarisiz("takat_yok");
      e.kar.tk -= TOPLUM_SINIR.yalanlamaTakat;
      s.yalanlandi = true;
      s.yayiliyor = false;
      s.guven = Math.round(s.guven / 2);
      return basarili({ soylentiler: [...soylentiler] });
    },
    async vitrin(i) {
      await bekle();
      if (i.goster.length > TOPLUM_SINIR.vitrinEnCok) return basarisiz("teklif_gecersiz");
      const sec = i.goster.map((id) => benArmaganlar.find((a) => a.id === id));
      if (sec.some((a) => !a)) return basarisiz("teklif_yok");
      benVitrin = sec.length ? (sec as VitrinArmagani[]) : benArmaganlar.slice(0, TOPLUM_SINIR.vitrinEnCok);
      return basarili({ vitrin: benVitrin });
    },
    async sikayet(i) {
      await bekle();
      if (i.hedef === benId()) return basarisiz("kendini_sikayet");
      return basarili({ id: 1, durum: "acik", kalan: 4 });
    },
  };
}

