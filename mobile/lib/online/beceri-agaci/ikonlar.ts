// Beceri ağacı ikonları (512×512 görünüm kutusu, dolgu yolları). GameIcon setinde olmayan çekiç, bıçak, kılıç, orak,
// miğfer, göğüslük ve dişliler burada çizilir; var olanlar (örs, alev, çapraz kılıç, buğday) ICON_PATHS'ten alınır.
// Katman rengi: "ana" düğüm durumunun rengi, "vurgu" köz/altın vurgusu, "koyu" oyuk ve çizgi ayrıntısı.
import { ICON_PATHS } from "../../icon-paths";

export type KatmanRengi = "ana" | "vurgu" | "koyu";
export interface IkonKatman { d: string[]; renk?: KatmanRengi; tek?: boolean; t?: string }
export type IkonTanim = IkonKatman[];

const daire = (cx: number, cy: number, r: number) => `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;

/** Dişli: kök yarıçapı r1, diş ucu r2, n diş, ortada delik (tek-çift dolgu ile oyulur). */
function disli(cx: number, cy: number, r1: number, r2: number, n: number, delik: number): string {
  const p: string[] = [];
  const w1 = (Math.PI / n) * 0.62, w2 = (Math.PI / n) * 0.36;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    for (const [aci, r] of [[a - w1, r1], [a - w2, r2], [a + w2, r2], [a + w1, r1]] as const) p.push(`${(cx + Math.cos(aci) * r).toFixed(1)} ${(cy + Math.sin(aci) * r).toFixed(1)}`);
  }
  return `M${p.join(" L")} Z ${daire(cx, cy, delik)}`;
}

const CEKIC = ["M140 70 H350 C368 70 380 82 380 100 V150 C380 168 368 180 350 180 H140 L96 158 V92 Z", "M230 180 H282 V430 C282 452 270 466 256 466 C242 466 230 452 230 430 Z"];
const BICAK = ["M256 40 L300 120 L292 300 H220 L212 120 Z", "M160 300 H352 C364 300 372 308 372 318 C372 328 364 336 352 336 H160 C148 336 140 328 140 318 C140 308 148 300 160 300 Z", "M236 336 H276 V420 H236 Z", daire(256, 446, 30)];
const KILIC = ["M256 20 L290 70 V330 H222 V70 Z", "M140 330 H372 L352 366 H160 Z", "M240 366 H272 V440 H240 Z", daire(256, 466, 26)];
const KILIC_OLUK = ["M251 76 H261 V320 H251 Z"];
const PIRILTI = (cx: number, cy: number, r: number) => `M${cx} ${cy - r} L${cx + r * 0.22} ${cy - r * 0.22} L${cx + r} ${cy} L${cx + r * 0.22} ${cy + r * 0.22} L${cx} ${cy + r} L${cx - r * 0.22} ${cy + r * 0.22} L${cx - r} ${cy} L${cx - r * 0.22} ${cy - r * 0.22} Z`;
const MIGFER = "M256 44 C146 44 92 124 92 236 V400 C92 430 130 460 180 468 H332 C382 460 420 430 420 400 V236 C420 124 366 44 256 44 Z M140 228 H372 V272 H282 V468 H230 V272 H140 Z";
const SOVALYE = "M256 80 C160 80 112 146 112 232 V384 C112 424 142 452 182 464 H330 C370 452 400 424 400 384 V232 C400 146 352 80 256 80 Z M150 236 H362 V258 H150 Z M150 280 H362 V298 H150 Z " + daire(206, 360, 9) + " " + daire(256, 360, 9) + " " + daire(306, 360, 9);
const SORGUC = "M250 82 C262 34 334 8 432 26 C388 38 356 60 336 96 C306 84 278 80 250 82 Z";
const GOGUSLUK = "M160 70 L210 60 C230 100 282 100 302 60 L352 70 L420 120 L400 200 L370 190 V380 C370 430 320 460 256 470 C192 460 142 430 142 380 V190 L112 200 L92 120 Z M250 120 H262 V286 H250 Z M170 306 H342 V318 H170 Z M180 360 H332 V372 H180 Z";
const ORAK = ["M300 64 C420 72 476 176 432 268 C416 200 368 150 300 140 C230 132 176 176 168 240 C160 300 196 350 236 372 L214 400 C150 372 104 310 110 236 C118 132 200 58 300 64 Z", "M214 392 L244 420 L132 500 C120 508 104 504 98 494 C92 484 96 472 106 466 Z"];
const yol = (ad: string) => ICON_PATHS[ad] ?? [];

export const BECERI_IKON: Record<string, IkonTanim> = {
  cekic: [{ d: CEKIC, t: "rotate(-38 256 256)" }],
  bicak: [{ d: BICAK, t: "rotate(40 256 256)" }, { d: ["M252 110 H260 V290 H252 Z"], renk: "koyu", t: "rotate(40 256 256)" }],
  ors: [{ d: yol("anvil") }],
  orak: [{ d: yol("wheat"), renk: "vurgu", t: "translate(250 150) scale(0.5)" }, { d: ORAK }],
  caprazKilic: [{ d: yol("crossed-swords") }],
  migfer: [{ d: [MIGFER], tek: true }],
  disliler: [{ d: [disli(196, 312, 104, 140, 9, 40)], tek: true }, { d: [disli(368, 156, 62, 90, 8, 24)], tek: true }, { d: [disli(390, 392, 44, 64, 7, 16)], tek: true }],
  kilic: [{ d: KILIC }, { d: KILIC_OLUK, renk: "koyu" }, { d: [PIRILTI(392, 104, 64)], renk: "vurgu" }],
  gogusluk: [{ d: [GOGUSLUK], tek: true }],
  mekanizma: [{ d: [disli(256, 256, 156, 206, 10, 64)], tek: true }, { d: [daire(256, 256, 34)], renk: "ana" }],
  alevKilic: [{ d: yol("flame"), renk: "vurgu", t: "translate(40 40) scale(0.62)" }, { d: KILIC, t: "rotate(40 256 256)" }, { d: KILIC_OLUK, renk: "koyu", t: "rotate(40 256 256)" }],
  sovalye: [{ d: [SORGUC], renk: "vurgu" }, { d: [SOVALYE], tek: true }],
  saheser: [{ d: [PIRILTI(256, 118, 100)], renk: "vurgu" }, { d: yol("anvil"), t: "translate(56 150) scale(0.78)" }],
  /** Başlıktaki meslek arması: örs ve üstünde çekiç. */
  demircilik: [{ d: yol("anvil"), t: "translate(28 150) scale(0.9)" }, { d: CEKIC, t: "translate(150 -10) scale(0.56) rotate(-40 256 256)" }],
  /** Çiftçilik geçmiş örneği. */
  bugday: [{ d: yol("wheat") }],
};
