// Sahte beceri istemcisi (geliştirici oturumu ve tasarım önizlemesi): sunucu yerlesim/beceri.ts kurallarının
// görünüm için aynası. Ağaç verisi agac-aynasi.ts'ten (sunucudan üretilir); yanıtlar BeceriIstemci biçimindedir.
// Kurallar: puan verilince öğrenme başlar, bütün meslekler için tek sıra, süre bitince seviye açılır (tembel),
// iptalde puan iade, eğitimle kısaltma bir kez, Debdebe kısaltması kapalı, yeniden düzenlemede çırak silinmez.
// Örnekte 1 öğrenme dakikası = SAHTE_DK_MS milisaniye (önizlemede süre akışı görünsün diye).
// Önizleme sorgusu: oagac=ogren (açık mesleğin sağ çırak düğümü öğreniliyor).
import { MESLEK_IDLERI, basarili, basarisiz, type MeslekId, type OnlineHata, type Sonuc } from "../protokol";
import { onizlemeMi } from "../kapi";
import { AGAC_AYNASI, BOLUM_BEDEL, BOLUM_SURE_DK, UNVAN_AYNASI } from "./agac-aynasi";
import type { BeceriAgaci, BeceriIstemci, BeceriPuaniV2, DugumGorunumu, KademeNo, KilitKodu, MeslekiGecmis, OgrenmeGorunumu } from "./beceri-veri";

export const SAHTE_DK_MS = 400;
const TAVAN = 40;
const KADEME_HIZMET = [0, 120, 400, 1000];
const BOLUM_KADEME = { cirak: 0, kalfa: 1, kalfa2: 1, usta: 2, pir: 3, gizli: 2 } as const;
/** Sunucu bedel kalemi kimlikleri (metin anahtarı değil). */
const KALEM_TABAN = "yeniden.taban", KALEM_PUAN = "yeniden.puan";
const BOLUM_SIRA = { cirak: 0, kalfa: 1, kalfa2: 2, usta: 3, pir: 4, gizli: 5 } as const;

interface SahteOgrenme { t: "o" | "y"; m: MeslekId; d: string; s: number; b: number; e: number; p: number; k?: 1 }
interface Durum {
  kd: Record<MeslekId, KademeNo>;
  kazanilan: Record<MeslekId, number>;
  sv: Record<string, number>;
  acilan: string[];
  bo: SahteOgrenme | null;
  unvanlar: string[];
}

/** Örnek ilerleme: beş meslekte farklı kademe ve öğrenilmiş beceriler; diğerleri boş ağaçla başlar. */
const ORNEK: Partial<Record<MeslekId, [KademeNo, number]>> = { demirci: [1, 20], ciftci: [0, 6], hanci: [1, 17], sifaci: [2, 31], asker: [0, 3] };
const ORNEK_SEVIYE: Record<string, number> = {
  "demirci.aletcilik": 3, "demirci.temelDovme": 1, "demirci.silahDovme": 2,
  "ciftci.ekinBilgisi": 2, "ciftci.hayvancilik": 1,
  "hanci.yatakAhir": 3, "hanci.serbetOcagi": 3, "hanci.kulakMisafiri": 1, "hanci.temizOda": 1, "hanci.sazGecesi": 1,
  "sifaci.sargiMerhem": 3, "sifaci.lohusaBakimi": 2, "sifaci.otBilgisi": 3, "sifaci.kirikSarma": 3, "sifaci.damitma": 1, "sifaci.yaraDikisi": 2,
  "asker.surNobeti": 1,
};

const ayna = (id: string) => {
  const [m, a] = id.split(".") as [MeslekId, string];
  const d = AGAC_AYNASI[m]?.find((x) => x[0] === a);
  return d ? { m, d } : undefined;
};
const bedelOf = (bolum: keyof typeof BOLUM_BEDEL, n: number) => BOLUM_BEDEL[bolum][n] ?? BOLUM_BEDEL[bolum][BOLUM_BEDEL[bolum].length - 1];
const sureOf = (bolum: keyof typeof BOLUM_SURE_DK, n: number) => BOLUM_SURE_DK[bolum][n] ?? BOLUM_SURE_DK[bolum][BOLUM_SURE_DK[bolum].length - 1];
/** Bir düğümün ilk n seviyesinin toplam bedeli. */
const seviyeBedeli = (id: string, n: number) => {
  const x = ayna(id);
  if (!x) return 0;
  let t = 0;
  for (let i = 0; i < n; i++) t += bedelOf(x.d[2], i);
  return t;
};

function parametre(ad: string): string | null {
  if (!onizlemeMi()) return null;
  const arama = (globalThis as { location?: { search?: string } }).location?.search ?? "";
  try { return new URLSearchParams(arama).get(ad); } catch { return null; }
}

export function sahteBeceriIstemci(bekle: () => Promise<void> = async () => {}, acik?: MeslekId): BeceriIstemci & { dakikaMs: number } {
  const s: Durum = {
    kd: Object.fromEntries(MESLEK_IDLERI.map((m) => [m, ORNEK[m]?.[0] ?? 0])) as Record<MeslekId, KademeNo>,
    kazanilan: Object.fromEntries(MESLEK_IDLERI.map((m) => [m, ORNEK[m]?.[1] ?? 3])) as Record<MeslekId, number>,
    sv: { ...ORNEK_SEVIYE },
    acilan: [],
    bo: null,
    unvanlar: ["ciftci.bereketliToprak"],
  };

  const harcanan = (m: MeslekId) => Object.entries(s.sv).filter(([id]) => id.startsWith(m + ".")).reduce((t, [id, n]) => t + seviyeBedeli(id, n), 0) + (s.bo?.m === m ? s.bo.p : 0);
  const puan = (m: MeslekId): BeceriPuaniV2 => {
    const kazanilan = Math.min(TAVAN, s.kazanilan[m]), h = harcanan(m);
    return { tecrube: kazanilan * 40, kazanilan, harcanan: h, kalan: Math.max(0, kazanilan - h), tavan: TAVAN, bar: kazanilan >= TAVAN ? null : 60, barDolu: 22, sonrakiPuan: kazanilan >= TAVAN ? null : 38, sonrakiKademe: s.kd[m] >= 3 ? null : KADEME_HIZMET[s.kd[m] + 1] };
  };
  const tamamla = (simdi: number) => {
    const o = s.bo;
    if (!o || simdi < o.e) return;
    if (o.t === "o") s.sv[o.d] = Math.max(s.sv[o.d] ?? 0, o.s);
    s.bo = null;
  };
  const ogrenmeGor = (simdi: number): OgrenmeGorunumu | null => s.bo ? { tur: s.bo.t === "o" ? "ogrenme" : "yeniden", meslek: s.bo.m, dugum: s.bo.t === "o" ? s.bo.d : null, seviye: s.bo.t === "o" ? s.bo.s : null, baslangic: s.bo.b, bitis: s.bo.e, kalanMs: Math.max(0, s.bo.e - simdi), puan: s.bo.p, egitimleKisaldi: s.bo.k === 1 } : null;
  const gorunur = (id: string, gizli: boolean) => !gizli || s.acilan.includes(id);
  const onTamam = (m: MeslekId, on: readonly string[], biri: boolean) => {
    if (!on.length) return true;
    const ok = on.map((x) => { const [a, sv] = x.split(":"); return (s.sv[`${m}.${a}`] ?? 0) >= Number(sv); });
    return biri ? ok.some(Boolean) : ok.every(Boolean);
  };
  const engeller = (m: MeslekId, id: string): KilitKodu[] => {
    const x = ayna(id)!;
    const [, , bolum, , on] = x.d;
    const mevcut = s.sv[id] ?? 0, azami = x.d[5].length;
    const k: KilitKodu[] = [];
    if (!gorunur(id, bolum === "gizli")) k.push("gizli");
    if (mevcut >= azami) k.push("seviye_tavan");
    if (s.bo) k.push("ogrenme_suruyor");
    if (s.kd[m] < BOLUM_KADEME[bolum]) k.push("kademe");
    if (!onTamam(m, on, bolum === "pir")) k.push("on_kosul");
    if (mevcut < azami && puan(m).kalan < bedelOf(bolum, mevcut)) k.push("puan");
    return k;
  };

  function agacOf(m: MeslekId, simdi: number): BeceriAgaci {
    tamamla(simdi);
    const dugumler: DugumGorunumu[] = AGAC_AYNASI[m].map(([a, ikon, bolum, sutun, on, kanca, gorunme]) => {
      const id = `${m}.${a}`, gizli = bolum === "gizli", gor = gorunur(id, gizli), azami = kanca.length, mevcut = s.sv[id] ?? 0;
      const yer = { id, bolum, kademe: BOLUM_KADEME[bolum] as KademeNo, sutun, sira: BOLUM_SIRA[bolum], gizli, gorunur: gor };
      if (!gor) return { ...yer, ikon: "gizli", seviye: 0, azami, durum: "gizli" as const, kilit: ["gizli" as const] };
      const kilit = engeller(m, id);
      const ogreniliyor = s.bo?.t === "o" && s.bo.d === id;
      const durum = ogreniliyor ? "ogreniliyor" as const : mevcut >= azami ? "ogrenildi" as const : kilit.length === 0 ? "acilabilir" as const : "kilitli" as const;
      return {
        ...yer, ad: `onl.ba.${id}`, ikon, seviye: mevcut, azami,
        onKosul: on.map((x) => { const [oa, sv] = x.split(":"); return { dugum: `${m}.${oa}`, seviye: Number(sv), tamam: (s.sv[`${m}.${oa}`] ?? 0) >= Number(sv) }; }),
        onKosulBiri: bolum === "pir", kademeSarti: BOLUM_KADEME[bolum] as KademeNo,
        seviyeler: [...kanca].map((c, n) => ({ seviye: n + 1, bedel: bedelOf(bolum, n), sureDk: sureOf(bolum, n), metin: `onl.ba.${id}.s${n + 1}`, etkiler: [{ tur: "hak", kanca: c === "1" }] })),
        sonraki: mevcut < azami ? { seviye: mevcut + 1, bedel: bedelOf(bolum, mevcut), sureMs: sureOf(bolum, mevcut) * SAHTE_DK_MS, metin: `onl.ba.${id}.s${mevcut + 1}` } : null,
        ...(gorunme ? { gorunme } : {}),
        durum, kilit: mevcut >= azami ? [] : kilit,
      };
    });
    return { meslek: m, aktif: m === (acik ?? "demirci"), kademe: s.kd[m], kademeHizmet: KADEME_HIZMET, puan: puan(m), bolumler: [], dugumler, ogrenme: ogrenmeGor(simdi) };
  }

  // Önizleme: açık mesleğin sağ çırak düğümü öğrenilirken (süre %40 ilerlemiş).
  if (acik && parametre("oagac") === "ogren") {
    const a = AGAC_AYNASI[acik].find((x) => x[2] === "cirak" && x[3] === 2)!;
    const id = `${acik}.${a[0]}`, n = s.sv[id] ?? 0;
    if (n < a[5].length) {
      const sure = sureOf("cirak", n) * SAHTE_DK_MS, simdi = Date.now();
      s.bo = { t: "o", m: acik, d: id, s: n + 1, b: simdi - sure * 0.4, e: simdi + sure * 0.6, p: bedelOf("cirak", n) };
    }
  }

  const hata = <T,>(h: OnlineHata): Sonuc<T> => basarisiz(h);
  return {
    dakikaMs: SAHTE_DK_MS,
    agac: async (m) => { await bekle(); return basarili(agacOf(m, Date.now())); },
    ogren: async ({ meslek: m, dugum }) => {
      await bekle();
      const simdi = Date.now();
      tamamla(simdi);
      const x = ayna(dugum);
      if (!x || x.m !== m) return hata("dugum_gecersiz");
      const k = engeller(m, dugum);
      const once: [KilitKodu, OnlineHata][] = [["gizli", "dugum_gizli"], ["seviye_tavan", "seviye_tavan"], ["ogrenme_suruyor", "ogrenme_suruyor"], ["kademe", "kademe_kapali"], ["on_kosul", "on_kosul_eksik"], ["puan", "puan_yok"]];
      for (const [kod, h] of once) if (k.includes(kod)) return hata(h);
      const n = s.sv[dugum] ?? 0, bolum = x.d[2];
      s.bo = { t: "o", m, d: dugum, s: n + 1, b: simdi, e: simdi + sureOf(bolum, n) * SAHTE_DK_MS, p: bedelOf(bolum, n) };
      return basarili({ ogrenme: ogrenmeGor(simdi)!, beceri: puan(m), beceriOzet: { ogrenme: ogrenmeGor(simdi), meslekler: {}, unvanlar: s.unvanlar } });
    },
    iptal: async () => {
      await bekle();
      tamamla(Date.now());
      const o = s.bo;
      if (!o || o.t !== "o") return hata("ogrenme_yok");
      s.bo = null;
      return basarili({ iptal: { meslek: o.m, dugum: o.d, seviye: o.s }, iadePuan: o.p });
    },
    hizlandir: async ({ kaynak }) => {
      await bekle();
      const simdi = Date.now();
      tamamla(simdi);
      const o = s.bo;
      if (kaynak !== "egitim" && kaynak !== "debdebe") return hata("kaynak_gecersiz");
      if (!o || o.t !== "o") return hata("ogrenme_yok");
      if (kaynak === "debdebe") return hata("hizlandirma_kapali");
      if (o.k === 1) return hata("hizlandirma_yok");
      const kisaltmaMs = Math.floor((o.e - simdi) * 0.3);
      o.e -= kisaltmaMs;
      o.k = 1;
      return basarili({ kaynak: "egitim" as const, usta: "sahte.usta", oran: 0.3, kisaltmaMs, ogrenme: ogrenmeGor(simdi) });
    },
    yeniden: async ({ meslek: m }) => {
      await bekle();
      const simdi = Date.now();
      tamamla(simdi);
      if (s.bo) return hata("ogrenme_suruyor");
      const sifirlanan = Object.entries(s.sv).filter(([id, n]) => n > 0 && id.startsWith(m + ".") && ayna(id)!.d[2] !== "cirak").map(([dugum, seviye]) => ({ dugum, seviye }));
      if (!sifirlanan.length) return hata("yeniden_bos");
      const iadePuan = sifirlanan.reduce((t, x) => t + seviyeBedeli(x.dugum, x.seviye), 0);
      for (const x of sifirlanan) delete s.sv[x.dugum];
      s.bo = { t: "y", m, d: "", s: 0, b: simdi, e: simdi + 60 * SAHTE_DK_MS, p: 0 };
      const kalemler = [{ k: KALEM_TABAN, d: 20 }, { k: KALEM_PUAN, d: 2 * iadePuan }];
      return basarili({ meslek: m, sifirlanan, iadePuan, bedel: { toplam: kalemler.reduce((t, x) => t + x.d, 0), kalemler }, ogrenme: ogrenmeGor(simdi)! });
    },
    gecmis: async () => {
      tamamla(Date.now());
      const meslekler: MeslekiGecmis["meslekler"] = MESLEK_IDLERI.flatMap((m) => {
        const ogrenilen = Object.entries(s.sv).filter(([id, n]) => n > 0 && id.startsWith(m + ".")).map(([dugum, seviye]) => ({ dugum, seviye }));
        return ogrenilen.length || s.kd[m] > 0 ? [{ meslek: m, kademe: s.kd[m], ogrenilen }] : [];
      });
      return basarili({ meslekler, toplamBeceri: meslekler.reduce((t, x) => t + x.ogrenilen.length, 0), unvanlar: s.unvanlar.map((id) => ({ id, meslek: UNVAN_AYNASI.find((u) => u.id === id)?.meslek ?? null })) });
    },
  };
}

let yerel: ReturnType<typeof sahteBeceriIstemci> | null = null;
/** Oturum yokken (tasarım önizlemesi) ekranın kullandığı tek sahte istemci. */
export const yerelSahteBeceri = (acik: MeslekId) => (yerel ??= sahteBeceriIstemci(async () => {}, acik));
