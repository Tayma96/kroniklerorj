// Geliştirici oturumu için sahte masa oyunları (Çanak Zarı, Dokuz Taş): sahte han soketi (sahte-han.ts) masa oyunu
// iletilerini buraya devreder. Sunucunun çatı ve kural motorunu (online-server/src/han/oyun/) kabaca taklit eder; yalnız
// önizleme içindir, gerçek oyunda sonuç ve geçerlilik sunucudadır. Bellekte masa başına bir oyun; sahte rakipler
// birkaç saniye düşünüp oynar. Önizleme: 1. hanın 2. masasında süren bir Dokuz Taş (izle), 2. hanın 1. masasında
// oyuncu bekleyen bir Çanak Zarı (katıl; rakiplerden biri masadan ayrılmış: "sırasını geç" görünür).
import {
  KOMSU, NOKTA, UCLEMELER, sha256Hex, type ElTuru, type OyunAdimi, type OyunGorunumu, type OyunIletisi, type OyunSonucTuru, type OyunTuru,
  type VitrinSatiri,
} from "./masa-oyun-veri";

const SABIR = 3 * 60_000;
const EN = { canak: [2, 4], dokuztas: [2, 2] } as const;

interface CanakIc { el: number; acan: number; sira: number | null; zarlar: number[][]; yeniledi: (number | null)[]; cikti: boolean[]; kazanc: number[]; gecmis: { el: number; zarlar: (number[] | null)[]; turler: (ElTuru | null)[]; alan: number | null }[]; bitti?: { kazanan: number[]; berabere: boolean } }
interface DokuzIc { tahta: number[]; el: [number, number]; sira: 0 | 1; sessiz: number; son?: { kim: 0 | 1; kaynak?: number; hedef: number; al?: number }; bitti?: { kazanan: number[]; berabere: boolean } }
interface Oyun {
  id: number; tur: OyunTuru; asama: "bekleme" | "oyun" | "bitti"; kurucu: string; oyuncular: { hesap: string; ad: string }[]; n: number;
  tohum?: string; taahhut?: string; c?: CanakIc; d?: DokuzIc; yok: Record<string, number>; cekilen: string[]; dagit: string[];
  sonuc?: { tur: OyunSonucTuru; kazanan: string[] }; kayit: OyunAdimi[];
}
export interface SahteOyunOrtami {
  ben: { hesap: string; ad: string };
  oturan: () => { hesap: string; ad: string }[];
  mesgul: () => boolean;
  yolla: (o: OyunGorunumu | null) => void;
  hata: (kod: string, istek: string) => void;
}

const oyunlar = new Map<string, Oyun>();
const ortamlar = new Map<string, SahteOyunOrtami>();
const zar = () => 1 + Math.floor(Math.random() * 6);
const at = () => [zar(), zar(), zar()];
const tohumUret = () => Array.from({ length: 16 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join("");

// ---------------------------------------------------------------- Çanak (sunucu canak.ts'in kabaca aynası)

function elDegeri(z: readonly number[]): { tur: ElTuru; anahtar: number[] } {
  const [a, b, c] = [...z].sort((x, y) => y - x) as [number, number, number];
  if (a === b && b === c) return { tur: "uclu", anahtar: [3, a] };
  if (a - b === 1 && b - c === 1) return { tur: "sirali", anahtar: [2, a] };
  if (a === b || b === c) return { tur: "cift", anahtar: [1, b, a === b ? c : a] };
  return { tur: "tek", anahtar: [0, a, b, c] };
}
const kars = (x: number[], y: number[]) => { for (let i = 0; i < Math.max(x.length, y.length); i++) { const f = (x[i] ?? 0) - (y[i] ?? 0); if (f) return f; } return 0; };
const sonraki = (c: CanakIc, i: number) => { for (let k = 1; k <= c.cikti.length; k++) { const j = (i + k) % c.cikti.length; if (!c.cikti[j]) return j; } return i; };
function canakIlerle(c: CanakIc, son: number): void {
  for (let k = 0; k < c.cikti.length; k++) {
    const i = (sonraki(c, son) + k) % c.cikti.length;
    if (!c.cikti[i] && c.yeniledi[i] === null) { c.sira = i; return; }
  }
  let alan: number | null = null, enIyi: number[] | null = null, esit = false;
  c.cikti.forEach((ck, i) => {
    if (ck) return;
    const a = elDegeri(c.zarlar[i]!).anahtar;
    const f = enIyi ? kars(a, enIyi) : 1;
    if (f > 0) { enIyi = a; alan = i; esit = false; } else if (f === 0) esit = true;
  });
  if (esit) alan = null;
  c.gecmis.push({ el: c.el, zarlar: c.zarlar.map((z, i) => (c.cikti[i] ? null : [...z])), turler: c.zarlar.map((z, i) => (c.cikti[i] ? null : elDegeri(z).tur)), alan });
  if (alan !== null) c.kazanc[alan] = c.kazanc[alan]! + 1;
  c.sira = null;
  const hedefe = c.kazanc.findIndex((k, i) => !c.cikti[i] && k >= 3);
  if (hedefe >= 0) { c.bitti = { kazanan: [hedefe], berabere: false }; return; }
  if (c.el >= 9) {
    const enCok = Math.max(...c.kazanc.filter((_, i) => !c.cikti[i]));
    const ust = c.kazanc.flatMap((k, i) => (!c.cikti[i] && k === enCok ? [i] : []));
    c.bitti = { kazanan: ust, berabere: ust.length > 1 };
    return;
  }
  c.el += 1;
  c.acan = sonraki(c, c.acan);
  c.sira = c.acan;
  c.zarlar = c.zarlar.map((z, i) => (c.cikti[i] ? z : at()));
  c.yeniledi = c.cikti.map(() => null);
}
function canakKarar(c: CanakIc, i: number, yenile: number[]) {
  const z = [...c.zarlar[i]!];
  for (const k of yenile) z[k] = zar();
  c.zarlar[i] = z;
  c.yeniledi[i] = yenile.length;
  canakIlerle(c, i);
}
function canakBot(z: number[]): number[] {
  const t = elDegeri(z).tur;
  if (t === "uclu" || t === "sirali") return [];
  if (t === "cift") { const tek = z.findIndex((x) => z.filter((y) => y === x).length === 1); return [tek]; }
  return z.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]).slice(0, 2).map((x) => x[1]);
}

// ---------------------------------------------------------------- Dokuz Taş (sunucu dokuztas.ts'in kabaca aynası)

const say = (d: DokuzIc, i: number) => d.tahta.filter((x) => x === i).length;
const uclemede = (t: number[], p: number) => t[p]! >= 0 && UCLEMELER.some((u) => u.includes(p) && u.every((q) => t[q] === t[p]));
const alinabilir = (t: number[], i: number) => { const l = t.flatMap((x, p) => (x === 1 - i ? [p] : [])); const d = l.filter((p) => !uclemede(t, p)); return d.length ? d : l; };
function dokuzHamleleri(d: DokuzIc, i: number): { kaynak?: number; hedef: number }[] {
  const bos = d.tahta.flatMap((x, p) => (x === -1 ? [p] : []));
  if (d.el[i]! > 0) return bos.map((hedef) => ({ hedef }));
  const benim = d.tahta.flatMap((x, p) => (x === i ? [p] : []));
  const uc = benim.length <= 3;
  return benim.flatMap((kaynak) => (uc ? bos : KOMSU[kaynak]!.filter((q) => d.tahta[q] === -1)).map((hedef) => ({ kaynak, hedef })));
}
/** Sahte sunucu doğrulaması; hata kodu ya da null. */
function dokuzOyna(d: DokuzIc, i: number, h: Record<string, unknown>): string | null {
  const nokta = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < NOKTA;
  const t = [...d.tahta];
  let kaynak: number | undefined, hedef: number;
  if (d.el[i]! > 0) {
    if (!nokta(h.koy) || t[h.koy] !== -1) return "hamle_gecersiz";
    hedef = h.koy; t[hedef] = i;
  } else {
    if (!nokta(h.kaynak) || !nokta(h.hedef) || t[h.kaynak] !== i || t[h.hedef] !== -1) return "hamle_gecersiz";
    if (say(d, i) > 3 && !KOMSU[h.kaynak]!.includes(h.hedef)) return "hamle_gecersiz";
    kaynak = h.kaynak; hedef = h.hedef; t[kaynak] = -1; t[hedef] = i;
  }
  let al: number | undefined;
  if (uclemede(t, hedef)) {
    const s = alinabilir(t, i);
    if (s.length) { if (!nokta(h.al) || !s.includes(h.al)) return "hamle_gecersiz"; al = h.al; t[al] = -1; }
  } else if (h.al !== undefined) return "hamle_gecersiz";
  const el: [number, number] = [d.el[0], d.el[1]];
  if (d.el[i]! > 0) el[i] = el[i]! - 1;
  const surme = d.el[0] === 0 && d.el[1] === 0;
  d.sessiz = al !== undefined ? 0 : surme ? d.sessiz + 1 : 0;
  d.tahta = t; d.el = el; d.sira = (1 - i) as 0 | 1;
  d.son = { kim: i as 0 | 1, ...(kaynak !== undefined ? { kaynak } : {}), hedef, ...(al !== undefined ? { al } : {}) };
  const r = d.sira;
  if (el[r]! + say(d, r) < 3 || !dokuzHamleleri(d, r).length) d.bitti = { kazanan: [i], berabere: false };
  else if (d.sessiz >= 50) d.bitti = { kazanan: [], berabere: true };
  return null;
}
function dokuzBot(d: DokuzIc, i: number): Record<string, unknown> {
  const l = dokuzHamleleri(d, i);
  const uclu = l.filter((m) => { const t = [...d.tahta]; if (m.kaynak !== undefined) t[m.kaynak] = -1; t[m.hedef] = i; return uclemede(t, m.hedef); });
  const m = (uclu.length ? uclu : l)[Math.floor(Math.random() * (uclu.length || l.length))]!;
  const t = [...d.tahta]; if (m.kaynak !== undefined) t[m.kaynak] = -1; t[m.hedef] = i;
  const al = uclemede(t, m.hedef) ? alinabilir(t, i) : [];
  const temel: Record<string, unknown> = m.kaynak === undefined ? { koy: m.hedef } : { kaynak: m.kaynak, hedef: m.hedef };
  return al.length ? { ...temel, al: al[Math.floor(Math.random() * al.length)] } : temel;
}

// ---------------------------------------------------------------- çatı

const etkin = (o: Oyun) => o.oyuncular.map((p) => p.hesap).filter((h) => !o.cekilen.includes(h));
function sira(o: Oyun): string | null {
  if (o.asama !== "oyun") return null;
  const i = o.c ? (o.c.bitti ? null : o.c.sira) : o.d ? (o.d.bitti ? null : o.d.sira) : null;
  return i === null ? null : o.oyuncular[i]?.hesap ?? null;
}
const pasAcik = (o: Oyun) => { const s = sira(o); return !!s && !!o.c && o.yok[s] !== undefined && Date.now() - o.yok[s]! >= SABIR; };

function gorunum(o: Oyun, izleyen: string): OyunGorunumu {
  const g: OyunGorunumu = {
    id: o.id, tur: o.tur, asama: o.asama, kurucu: o.kurucu, enAz: EN[o.tur][0], enCok: EN[o.tur][1],
    oyuncular: o.oyuncular.map((p) => ({ ...p, ...(o.yok[p.hesap] !== undefined ? { yok: o.yok[p.hesap] } : {}), ...(o.cekilen.includes(p.hesap) ? { cekildi: true as const } : {}) })),
    n: o.n, sira: sira(o), dagit: [...o.dagit], pasAcik: o.asama === "oyun" && pasAcik(o), sabir: SABIR,
  };
  if (o.taahhut) g.taahhut = o.taahhut;
  const i = o.oyuncular.findIndex((p) => p.hesap === izleyen);
  if (o.c) {
    const c = o.c;
    g.durum = { el: c.el, elEnCok: 9, hedef: 3, acan: c.acan, kazanc: [...c.kazanc], cikti: [...c.cikti], yeniledi: [...c.yeniledi], gecmis: c.gecmis.map((x) => ({ ...x, zarlar: x.zarlar.map((z) => (z ? [...z] : null)), turler: [...x.turler] })) };
    if (i >= 0 && o.asama === "oyun" && !c.bitti && !c.cikti[i]) g.ben = { zarlarim: [...c.zarlar[i]!], elim: elDegeri(c.zarlar[i]!).tur };
  }
  if (o.d) {
    const d = o.d;
    g.durum = { tahta: [...d.tahta], el: [...d.el], taslar: [say(d, 0), say(d, 1)], ucma: [d.el[0] === 0 && say(d, 0) <= 3, d.el[1] === 0 && say(d, 1) <= 3], sessiz: d.sessiz, sessizEnCok: 50, ...(d.son ? { son: { ...d.son } } : {}) };
  }
  if (o.sonuc) g.sonuc = { tur: o.sonuc.tur, kazanan: [...o.sonuc.kazanan] };
  if (o.asama === "bitti" && o.tohum) { g.tohum = o.tohum; g.kayit = o.kayit.map((k) => [k[0], k[1]] as OyunAdimi); }
  return g;
}

function bitir(o: Oyun, s?: { kazanan: number[]; berabere: boolean }) {
  o.asama = "bitti";
  o.sonuc = s ? { tur: s.berabere ? "berabere" : "kazandi", kazanan: s.kazanan.map((i) => o.oyuncular[i]!.hesap) } : { tur: "dagildi", kazanan: [] };
}
function sonrasi(o: Oyun) {
  o.dagit = [];
  const s = o.c?.bitti ?? o.d?.bitti;
  if (s) bitir(o, s);
}

function yay(anahtar: string) {
  const r = ortamlar.get(anahtar);
  const o = oyunlar.get(anahtar);
  r?.yolla(o ? gorunum(o, r.ben.hesap) : null);
  botlar(anahtar);
}

/** Sırası gelen sahte rakip (masada ve "yok" değilse) birkaç saniye sonra oynar. */
function botlar(anahtar: string) {
  const o = oyunlar.get(anahtar);
  const r = ortamlar.get(anahtar);
  if (!o || o.asama !== "oyun") return;
  const s = sira(o);
  if (!s || s === r?.ben.hesap || o.yok[s] !== undefined) return;
  const n = o.n;
  setTimeout(() => {
    const y = oyunlar.get(anahtar);
    if (y !== o || o.n !== n || o.asama !== "oyun" || !ortamlar.has(anahtar)) return;
    const i = o.oyuncular.findIndex((p) => p.hesap === s);
    if (o.c) { const yen = canakBot(o.c.zarlar[i]!); o.kayit.push([i, yen.length ? { yenile: yen } : { tut: true }]); canakKarar(o.c, i, yen); }
    else if (o.d) { const h = dokuzBot(o.d, i); o.kayit.push([i, h]); dokuzOyna(o.d, i, h); }
    o.n += 1;
    sonrasi(o);
    yay(anahtar);
  }, o.d ? 2200 : 1700);
}

function baslat(o: Oyun) {
  o.tohum = tohumUret();
  o.taahhut = sha256Hex(o.tohum);
  o.asama = "oyun";
  const k = o.oyuncular.length;
  if (o.tur === "canak") o.c = { el: 1, acan: 0, sira: 0, zarlar: Array.from({ length: k }, at), yeniledi: Array(k).fill(null), cikti: Array(k).fill(false), kazanc: Array(k).fill(0), gecmis: [] };
  else o.d = { tahta: Array(NOKTA).fill(-1), el: [9, 9], sira: 0, sessiz: 0 };
}

const yeniOyun = (tur: OyunTuru, kurucu: { hesap: string; ad: string }): Oyun => ({ id: Date.now(), tur, asama: "bekleme", kurucu: kurucu.hesap, oyuncular: [kurucu], n: 0, yok: {}, cekilen: [], dagit: [], kayit: [] });

// Önizleme oyunları (ilk erişimde kurulur).
let kuruldu = false;
function onizleme() {
  if (kuruldu) return;
  kuruldu = true;
  const d = yeniOyun("dokuztas", { hesap: "oy-osman", ad: "Osman Kalfa" });
  d.oyuncular.push({ hesap: "oy-zeynep", ad: "Zeynep" });
  baslat(d);
  for (let k = 0; k < 7; k++) { const i = d.d!.sira; const h = dokuzBot(d.d!, i); d.kayit.push([i, h]); dokuzOyna(d.d!, i, h); d.n += 1; }
  oyunlar.set("1:2", d);
  const c = yeniOyun("canak", { hesap: "oy-hatice", ad: "Hatice Kadın" });
  c.oyuncular.push({ hesap: "oy-osman", ad: "Osman Kalfa" });
  oyunlar.set("2:1", c);
}

/** Sahte vitrin: bellekteki bekleyen ve süren oyunlar (önce katılınabilir). */
export function sahteVitrin(): VitrinSatiri[] {
  onizleme();
  const l: VitrinSatiri[] = [];
  for (const [a, o] of oyunlar) {
    if (o.asama === "bitti") continue;
    const [han, masa] = a.split(":").map(Number) as [number, number];
    const enCok = EN[o.tur][1];
    const bos = o.asama === "bekleme" ? Math.max(0, enCok - o.oyuncular.length) : 0;
    l.push({ han, masa, oyun: o.tur, asama: o.asama, oyuncu: o.oyuncular.length, enCok, bos, seyirci: o.asama === "oyun" ? 2 : 0, katilabilir: o.asama === "bekleme" && bos > 0 });
  }
  return l.sort((p, q) => Number(q.katilabilir) - Number(p.katilabilir) || p.han - q.han || p.masa - q.masa);
}

/** Sahte soket açılınca: ortam bağlanır, dönen oyuncunun "yok" işareti silinir; hosgeldin için görünüm döner. */
export function sahteOyunBagla(anahtar: string, r: SahteOyunOrtami): OyunGorunumu | null {
  onizleme();
  ortamlar.set(anahtar, r);
  const o = oyunlar.get(anahtar);
  if (!o) return null;
  delete o.yok[r.ben.hesap];
  setTimeout(() => botlar(anahtar), 0);
  return gorunum(o, r.ben.hesap);
}
/** Sahte soket kapanınca: oyunda "yok" işaretlenir; beklemede listeden düşer. */
export function sahteOyunAyir(anahtar: string, r: SahteOyunOrtami) {
  if (ortamlar.get(anahtar) === r) ortamlar.delete(anahtar);
  const o = oyunlar.get(anahtar);
  if (!o) return;
  if (o.asama === "oyun" && etkin(o).includes(r.ben.hesap)) o.yok[r.ben.hesap] = Date.now();
  if (o.asama === "bekleme") beklemedenCik(anahtar, o, r.ben.hesap);
}
/** Oyuncu kalktı (beklemede oturmayan listeden düşer). */
export function sahteOyunKalkti(anahtar: string) {
  const o = oyunlar.get(anahtar);
  const r = ortamlar.get(anahtar);
  if (o && r && o.asama === "bekleme" && o.oyuncular.some((p) => p.hesap === r.ben.hesap)) { beklemedenCik(anahtar, o, r.ben.hesap); yay(anahtar); }
}
function beklemedenCik(anahtar: string, o: Oyun, h: string) {
  o.oyuncular = o.oyuncular.filter((p) => p.hesap !== h);
  if (!o.oyuncular.length) oyunlar.delete(anahtar);
  else if (o.kurucu === h) o.kurucu = o.oyuncular[0]!.hesap;
}
/** Sahte soketten gelen bir oyun iletisini işler. Oyun meşgulken sahne açılmaz: `sahteOyunSuruyor`. */
export const sahteOyunSuruyor = (anahtar: string) => { const o = oyunlar.get(anahtar); return !!o && o.asama !== "bitti"; };

export function sahteOyunIsle(anahtar: string, ileti: OyunIletisi) {
  const r = ortamlar.get(anahtar);
  if (!r) return;
  const o = oyunlar.get(anahtar);
  const ben = r.ben.hesap;
  const oturuyor = r.oturan().some((p) => p.hesap === ben);
  const hata = (k: string) => r.hata(k, ileti.t);
  switch (ileti.t) {
    case "oyunAc": {
      if (!oturuyor) return hata("oturmuyor");
      if (r.mesgul()) return hata("masa_mesgul");
      if (ileti.oyun !== "canak" && ileti.oyun !== "dokuztas") return hata("oyun_turu_gecersiz");
      if (o && o.asama !== "bitti") return hata("oyun_var");
      const y = yeniOyun(ileti.oyun, r.ben);
      oyunlar.set(anahtar, y);
      // Masadaki sahte misafirler katılır (çanakta en çok iki, dokuz taşta bir).
      const adaylar = r.oturan().filter((p) => p.hesap !== ben).slice(0, ileti.oyun === "canak" ? 2 : 1);
      adaylar.forEach((p, k) => setTimeout(() => {
        if (oyunlar.get(anahtar) !== y || y.asama !== "bekleme" || y.oyuncular.length >= EN[y.tur][1]) return;
        y.oyuncular.push(p);
        yay(anahtar);
      }, 1400 + k * 1300));
      return yay(anahtar);
    }
    case "oyunKatil": {
      if (!oturuyor) return hata("oturmuyor");
      if (!o || o.asama === "bitti") return hata("oyun_yok");
      if (o.oyuncular.some((p) => p.hesap === ben)) return yay(anahtar);
      if (o.asama !== "bekleme") return hata("oyun_basladi");
      if (o.oyuncular.length >= EN[o.tur][1]) return hata("oyun_dolu");
      o.oyuncular.push(r.ben);
      // Sahte kurucu bir süre sonra başlatır; önizlemedeki rakiplerden biri masadan ayrılmış görünür.
      if (o.kurucu !== ben) setTimeout(() => {
        if (oyunlar.get(anahtar) !== o || o.asama !== "bekleme" || o.oyuncular.length < EN[o.tur][0]) return;
        baslat(o);
        if (anahtar === "2:1") o.yok["oy-osman"] = Date.now() - SABIR - 1000;
        yay(anahtar);
      }, 2600);
      return yay(anahtar);
    }
    case "oyunAyril": {
      if (!o || o.asama === "bitti") return hata("oyun_yok");
      const i = o.oyuncular.findIndex((p) => p.hesap === ben);
      if (o.asama === "bekleme") { if (i >= 0) beklemedenCik(anahtar, o, ben); return yay(anahtar); }
      if (i < 0) return hata("oyuncu_degil");
      if (o.cekilen.includes(ben)) return;
      o.cekilen.push(ben);
      o.kayit.push([i, "cekil"]);
      o.n += 1;
      if (o.c && o.c.cikti.filter((c) => !c).length > 2) {
        o.c.cikti[i] = true;
        o.c.yeniledi[i] = null;
        if (o.c.acan === i) o.c.acan = sonraki(o.c, i);
        if (o.c.sira === i) canakIlerle(o.c, i);
        sonrasi(o);
      } else bitir(o);
      return yay(anahtar);
    }
    case "oyunBaslat": {
      if (!o || o.asama !== "bekleme") return hata(o?.asama === "oyun" ? "oyun_basladi" : "oyun_yok");
      if (o.kurucu !== ben) return hata("yetki_yok");
      if (o.oyuncular.length < EN[o.tur][0]) return hata("oyuncu_az");
      baslat(o);
      return yay(anahtar);
    }
    case "hamle":
    case "oyunPas": {
      if (!o || o.asama === "bekleme") return hata("oyun_yok");
      // Eski adım numarası tekrar sayılır: uygulanmaz, güncel görünüm gelir; ileri numara reddedilir.
      if (ileti.n < o.n) return r.yolla(gorunum(o, ben));
      if (o.asama !== "oyun") return hata("oyun_yok");
      if (ileti.n !== o.n) return hata("hamle_no");
      const s = sira(o);
      if (ileti.t === "oyunPas") {
        if (!s || s === ben || !pasAcik(o) || !o.c) return hata("pas_yok");
        const i = o.oyuncular.findIndex((p) => p.hesap === s);
        o.kayit.push([i, "pas"]);
        canakKarar(o.c, i, []);
      } else {
        const i = o.oyuncular.findIndex((p) => p.hesap === ben);
        if (i < 0 || o.cekilen.includes(ben)) return hata("oyuncu_degil");
        if (s !== ben) return hata("sira_degil");
        const h = ileti.hamle;
        if (o.c) {
          const yen = h.tut === true ? [] : Array.isArray(h.yenile) ? (h.yenile as number[]) : null;
          if (!yen || (h.tut !== true && (yen.length < 1 || yen.length > 3 || new Set(yen).size !== yen.length || yen.some((x) => !Number.isInteger(x) || x < 0 || x > 2)))) return hata("hamle_gecersiz");
          canakKarar(o.c, i, yen);
        } else if (o.d) {
          const k = dokuzOyna(o.d, i, h);
          if (k) return hata(k);
        }
        o.kayit.push([i, h]);
      }
      o.n += 1;
      sonrasi(o);
      return yay(anahtar);
    }
    case "oyunDagit": {
      if (!o || o.asama === "bitti") return hata("oyun_yok");
      if (o.asama === "bekleme") { if (o.kurucu !== ben) return hata("yetki_yok"); oyunlar.delete(anahtar); return yay(anahtar); }
      if (!etkin(o).includes(ben)) return hata("oyuncu_degil");
      if (!o.dagit.includes(ben)) o.dagit.push(ben);
      // Sahte rakipler dağıtmaya razı olur (masada olmayanın oyu aranmaz).
      setTimeout(() => {
        if (oyunlar.get(anahtar) !== o || o.asama !== "oyun" || !o.dagit.length) return;
        bitir(o);
        yay(anahtar);
      }, 1800);
      return yay(anahtar);
    }
    case "oyunKapat": {
      if (!o) return;
      if (o.asama !== "bitti") return hata("oyun_var");
      if (!oturuyor) return hata("oturmuyor");
      oyunlar.delete(anahtar);
      return yay(anahtar);
    }
  }
}
