// Beceri ağacı ikonları (512×512 görünüm kutusu, dolgu yolları). GameIcon setinde olmayan meslek aletleri burada
// çizilir (saban, balta, keser, kazan, fener, havan, bağlama, kalem, mühür, kalkan ucu…); var olanlar (örs, buğday,
// koyun, deve, terazi, kitap…) ICON_PATHS'ten alınır. Her dizi elemanı ayrı bir <Path>'tir; delik için `tek` (evenodd).
// Katman rengi: "ana" düğüm durumunun rengi, "vurgu" meslek vurgusu (köz, başak, ot…), "koyu" oyuk ve çizgi ayrıntısı.
import { ICON_PATHS } from "../../icon-paths";

export type KatmanRengi = "ana" | "vurgu" | "koyu";
export interface IkonKatman { d: string[]; renk?: KatmanRengi; tek?: boolean; t?: string }
export type IkonTanim = IkonKatman[];

// ---------------------------------------------------------------- yardımcılar
/** Saat yönünde daire (dikdörtgenlerle aynı yönde döner; aynı yolda delik açmaz). */
const D = (cx: number, cy: number, r: number) => `M${cx - r} ${cy} A${r} ${r} 0 1 1 ${cx + r} ${cy} A${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
const E = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx} ${cy} A${rx} ${ry} 0 1 1 ${cx + rx} ${cy} A${rx} ${ry} 0 1 1 ${cx - rx} ${cy} Z`;
function R(x: number, y: number, w: number, h: number, r = 0): string {
  if (!r) return `M${x} ${y} H${x + w} V${y + h} H${x} Z`;
  return `M${x + r} ${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h - r} A${r} ${r} 0 0 1 ${x + w - r} ${y + h} H${x + r} A${r} ${r} 0 0 1 ${x} ${y + h - r} V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`;
}
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
const PIRILTI = (cx: number, cy: number, r: number) => `M${cx} ${cy - r} L${cx + r * 0.22} ${cy - r * 0.22} L${cx + r} ${cy} L${cx + r * 0.22} ${cy + r * 0.22} L${cx} ${cy + r} L${cx - r * 0.22} ${cy + r * 0.22} L${cx - r} ${cy} L${cx - r * 0.22} ${cy - r * 0.22} Z`;
const yol = (ad: string) => ICON_PATHS[ad] ?? [];
const g = (ad: string, renk?: KatmanRengi): IkonTanim => [{ d: yol(ad), renk }];
const ekle = (k: IkonKatman, on: string): IkonKatman => ({ ...k, t: k.t ? `${on} ${k.t}` : on });
const kucult = (ik: IkonTanim, s: number, x: number, y: number) => ik.map((k) => ekle(k, `translate(${x} ${y}) scale(${s})`));
const dondur = (ik: IkonTanim, a: number) => ik.map((k) => ekle(k, `rotate(${a} 256 256)`));
const renkle = (ik: IkonTanim, renk: KatmanRengi) => ik.map((k) => (k.renk ? k : { ...k, renk }));
/** Sağ alta küçük rozet: iki kavramı tek ikonda birleştirir (ambar + anahtar). */
const rozet = (ana: IkonTanim, kucuk: IkonTanim): IkonTanim => [...kucult(ana, 0.86, 0, 0), { d: [D(398, 398, 112)], renk: "koyu" }, ...kucult(kucuk, 0.42, 290, 290)];
/** Sağ üstte pırıltı: aynı aletin zirve ya da gizli hâli. */
const isikli = (ana: IkonTanim): IkonTanim => [...kucult(ana, 0.84, 6, 76), { d: [PIRILTI(410, 100, 76)], renk: "vurgu" }];

// ---------------------------------------------------------------- demircilik (onaylı örnek)
const CEKIC_YOL = ["M140 70 H350 C368 70 380 82 380 100 V150 C380 168 368 180 350 180 H140 L96 158 V92 Z", "M230 180 H282 V430 C282 452 270 466 256 466 C242 466 230 452 230 430 Z"];
const BICAK = ["M256 40 L300 120 L292 300 H220 L212 120 Z", "M160 300 H352 C364 300 372 308 372 318 C372 328 364 336 352 336 H160 C148 336 140 328 140 318 C140 308 148 300 160 300 Z", "M236 336 H276 V420 H236 Z", daire(256, 446, 30)];
const KILIC_YOL = ["M256 20 L290 70 V330 H222 V70 Z", "M140 330 H372 L352 366 H160 Z", "M240 366 H272 V440 H240 Z", daire(256, 466, 26)];
const KILIC_OLUK = ["M251 76 H261 V320 H251 Z"];
const MIGFER_YOL = "M256 44 C146 44 92 124 92 236 V400 C92 430 130 460 180 468 H332 C382 460 420 430 420 400 V236 C420 124 366 44 256 44 Z M140 228 H372 V272 H282 V468 H230 V272 H140 Z";
const SOVALYE = "M256 80 C160 80 112 146 112 232 V384 C112 424 142 452 182 464 H330 C370 452 400 424 400 384 V232 C400 146 352 80 256 80 Z M150 236 H362 V258 H150 Z M150 280 H362 V298 H150 Z " + daire(206, 360, 9) + " " + daire(256, 360, 9) + " " + daire(306, 360, 9);
const SORGUC = "M250 82 C262 34 334 8 432 26 C388 38 356 60 336 96 C306 84 278 80 250 82 Z";
const GOGUSLUK = "M160 70 L210 60 C230 100 282 100 302 60 L352 70 L420 120 L400 200 L370 190 V380 C370 430 320 460 256 470 C192 460 142 430 142 380 V190 L112 200 L92 120 Z M250 120 H262 V286 H250 Z M170 306 H342 V318 H170 Z M180 360 H332 V372 H180 Z";
const ORAK_YOL = ["M300 64 C420 72 476 176 432 268 C416 200 368 150 300 140 C230 132 176 176 168 240 C160 300 196 350 236 372 L214 400 C150 372 104 310 110 236 C118 132 200 58 300 64 Z", "M214 392 L244 420 L132 500 C120 508 104 504 98 494 C92 484 96 472 106 466 Z"];

const CEKIC: IkonTanim = [{ d: CEKIC_YOL, t: "rotate(-38 256 256)" }];
const KILIC: IkonTanim = [{ d: KILIC_YOL }, { d: KILIC_OLUK, renk: "koyu" }, { d: [PIRILTI(392, 104, 64)], renk: "vurgu" }];
const ORAK: IkonTanim = [{ d: yol("wheat"), renk: "vurgu", t: "translate(250 150) scale(0.5)" }, { d: ORAK_YOL }];
const MIGFER: IkonTanim = [{ d: [MIGFER_YOL], tek: true }];

// ---------------------------------------------------------------- toprak: çiftçi, oduncu
const SABAN: IkonTanim = [
  { d: [R(40, 238, 400, 34, 14)], t: "rotate(28 256 256)" },
  { d: [R(392, 120, 30, 250, 12)], t: "rotate(14 407 245)" },
  { d: ["M350 336 L468 366 L452 404 L336 382 Z"], renk: "vurgu" },
  { d: [R(150, 200, 26, 110, 8)], t: "rotate(-10 163 255)" },
];
const INEK: IkonTanim = [
  { d: ["M150 150 C100 140 70 100 76 52 C98 92 132 112 182 118 Z", "M362 150 C412 140 442 100 436 52 C414 92 380 112 330 118 Z"], renk: "vurgu" },
  { d: ["M150 170 C110 170 80 190 66 220 C100 232 140 226 166 206 Z", "M362 170 C402 170 432 190 446 220 C412 232 372 226 346 206 Z"] },
  { d: ["M180 112 H332 C362 112 376 136 370 166 L348 330 C344 390 306 430 256 430 C206 430 168 390 164 330 L142 166 C136 136 150 112 180 112 Z"] },
  { d: [E(256, 372, 72, 44), D(206, 236, 14), D(306, 236, 14)], renk: "koyu" },
  { d: [D(228, 372, 10), D(284, 372, 10)] },
];
const TOHUM: IkonTanim = [
  { d: [E(256, 410, 76, 46)], renk: "vurgu" },
  { d: [R(246, 170, 20, 220, 8)] },
  { d: ["M256 240 C196 250 132 216 114 140 C190 128 244 166 256 240 Z", "M256 206 C304 206 372 172 396 96 C322 86 266 126 256 206 Z"] },
];
const AMBAR: IkonTanim = [
  { d: ["M100 240 L256 116 L412 240 V452 H100 Z"] },
  { d: ["M36 238 L256 62 L476 238 L444 256 L256 106 L68 256 Z"], renk: "vurgu" },
  { d: [R(200, 318, 112, 134), D(256, 222, 26)], renk: "koyu" },
  { d: [R(250, 304, 12, 162)], t: "rotate(38 256 385)" },
  { d: [R(250, 304, 12, 162)], t: "rotate(-38 256 385)" },
];
const CUVAL: IkonTanim = [
  { d: ["M150 176 C110 250 86 340 104 404 C120 458 186 474 256 474 C326 474 392 458 408 404 C426 340 402 250 362 176 Z", "M196 112 H316 L366 178 H146 Z"] },
  { d: [R(150, 166, 212, 24, 10), "M226 112 C210 82 214 52 236 38 C246 62 244 92 236 112 Z", "M286 112 C302 82 298 52 276 38 C266 62 268 92 276 112 Z", "M256 108 C244 78 246 46 256 24 C266 46 268 78 256 108 Z"], renk: "vurgu" },
  { d: [R(150, 300, 212, 10, 5), R(140, 352, 232, 10, 5)], renk: "koyu" },
];
const BALTA: IkonTanim = [
  { d: [R(238, 110, 36, 370, 14)], t: "rotate(-30 256 256)" },
  { d: ["M238 80 C180 64 110 84 80 130 C110 170 116 220 96 268 C150 270 210 244 238 210 Z", R(274, 96, 40, 96, 8)], t: "rotate(-30 256 256)" },
  { d: ["M80 130 C110 170 116 220 96 268 L80 270 C100 220 94 172 64 134 Z"], renk: "vurgu", t: "rotate(-30 256 256)" },
];
const KUTUK: IkonTanim = [
  { d: ["M200 194 L228 130 L262 140 L248 194 Z", "M110 190 H380 V390 H110 C70 390 50 340 50 290 C50 240 70 190 110 190 Z"] },
  { d: [E(380, 290, 66, 100)], renk: "vurgu" },
  { d: [E(380, 290, 46, 72) + " " + E(380, 290, 34, 54), D(380, 290, 12), R(130, 240, 190, 9, 4), R(150, 330, 160, 9, 4)], renk: "koyu", tek: true },
];
const AGAC: IkonTanim = [
  { d: ["M234 474 L244 300 L196 250 L212 238 L250 278 L254 198 H260 L264 278 L302 238 L316 252 L268 300 L280 474 Z", R(150, 462, 212, 18, 8)] },
  { d: [D(256, 168, 112), D(166, 236, 72), D(346, 236, 72)], renk: "vurgu" },
];
const KIRIS: IkonTanim = [
  { d: [D(256, 196, 84) + " " + D(256, 196, 34), D(166, 352, 84) + " " + D(166, 352, 34), D(346, 352, 84) + " " + D(346, 352, 34)], tek: true },
  { d: [D(256, 196, 14), D(166, 352, 14), D(346, 352, 14)], renk: "vurgu" },
];
const KAZMA: IkonTanim = dondur([
  { d: [R(240, 140, 32, 350, 12)] },
  { d: ["M48 172 C140 88 372 88 464 172 L448 196 C360 134 152 134 64 196 Z"] },
  { d: [R(222, 108, 68, 66, 10)], renk: "vurgu" },
], -28);
const BLOK: IkonTanim = [
  { d: [R(56, 352, 194, 100, 10), R(262, 352, 194, 100, 10), R(150, 238, 212, 102, 10), R(56, 238, 82, 102, 10), R(374, 238, 82, 102, 10), R(104, 124, 196, 102, 10), R(312, 124, 144, 102, 10)] },
  { d: [R(80, 380, 60, 8, 4), R(300, 268, 50, 8, 4), R(150, 156, 70, 8, 4)], renk: "koyu" },
];
const DEGIRMEN: IkonTanim = [
  { d: [D(256, 256, 212) + " " + D(256, 256, 50)], tek: true },
  ...[0, 60, 120].map((a): IkonKatman => ({ d: [R(250, 66, 12, 380, 4)], renk: "koyu", t: `rotate(${a + 30} 256 256)` })),
  { d: [D(256, 256, 50) + " " + D(256, 256, 30)], renk: "vurgu", tek: true },
];
const MADEN: IkonTanim = [
  { d: ["M70 466 V204 C70 118 154 64 256 64 C358 64 442 118 442 204 V466 Z M150 466 V226 C150 172 196 140 256 140 C316 140 362 172 362 226 V466 Z"], tek: true },
  { d: [R(160, 210, 26, 256), R(326, 210, 26, 256), R(146, 190, 220, 30, 6)], renk: "vurgu" },
  { d: [R(206, 360, 100, 70, 8), D(226, 446, 16), D(286, 446, 16)] },
];
const KULE: IkonTanim = [
  { d: ["M150 74 H196 V114 H234 V74 H278 V114 H316 V74 H362 V178 H340 V464 H172 V178 H150 Z"] },
  { d: ["M222 464 V384 C222 362 238 348 256 348 C274 348 290 362 290 384 V464 Z", R(244, 222, 24, 56, 10), R(172, 192, 168, 8), R(172, 318, 168, 8)], renk: "koyu" },
  { d: [R(252, 22, 8, 54)] },
  { d: ["M260 22 L322 38 L260 54 Z"], renk: "vurgu" },
];

// ---------------------------------------------------------------- zanaat: marangoz, dokumacı, aşçı
const KESER: IkonTanim = dondur([
  { d: [R(238, 150, 36, 330, 14)] },
  { d: ["M168 92 H312 C334 92 346 106 346 126 V160 H238 C212 160 190 172 174 198 L124 198 C124 142 138 104 168 92 Z"] },
  { d: ["M124 198 H174 L168 214 H118 Z"], renk: "vurgu" },
], -32);
const RENDE: IkonTanim = [
  { d: ["M300 252 C300 182 340 150 390 150 C420 150 440 172 440 202 L430 252 Z " + E(372, 214, 26, 22)], tek: true },
  { d: ["M56 334 L106 252 H412 C440 252 456 272 456 298 V350 H56 Z", "M128 252 C128 216 156 198 184 198 C212 198 228 222 224 252 Z"] },
  { d: [R(56, 350, 400, 16, 4)], renk: "koyu" },
  { d: ["M244 252 L276 170 L300 176 L272 252 Z", "M276 170 C258 120 300 88 338 110 C312 112 296 136 300 170 Z"], renk: "vurgu" },
];
const TEKERLEK: IkonTanim = [
  { d: [D(256, 256, 208) + " " + D(256, 256, 170)], tek: true },
  ...[0, 30, 60, 90, 120, 150].map((a): IkonKatman => ({ d: [R(247, 80, 18, 352, 6)], t: `rotate(${a} 256 256)` })),
  { d: [D(256, 256, 48)], renk: "vurgu" },
  { d: [D(256, 256, 16)], renk: "koyu" },
];
const KOPRU: IkonTanim = [
  { d: [R(30, 208, 452, 38, 6), "M50 246 H462 V436 H410 C410 348 342 292 256 292 C170 292 102 348 102 436 H50 Z", R(30, 148, 452, 14, 6), R(56, 148, 16, 62), R(156, 148, 16, 62), R(248, 148, 16, 62), R(340, 148, 16, 62), R(440, 148, 16, 62)] },
  { d: ["M40 470 C100 448 150 490 210 470 C270 450 316 490 376 470 C420 456 452 466 472 476 V500 H40 Z"], renk: "vurgu" },
];
const KAPI: IkonTanim = [
  { d: ["M116 474 V200 C116 108 178 46 256 46 C334 46 396 108 396 200 V474 Z M148 474 V206 C148 130 196 80 256 80 C316 80 364 130 364 206 V474 Z"], tek: true },
  { d: ["M160 474 V208 C160 138 202 92 256 92 C310 92 352 138 352 208 V474 Z"], renk: "vurgu" },
  { d: [R(252, 92, 8, 382), PIRILTI(256, 214, 48), PIRILTI(206, 346, 26), PIRILTI(306, 346, 26)], renk: "koyu" },
];
const ARABA: IkonTanim = [
  { d: [R(118, 136, 120, 74, 10), R(250, 148, 130, 62, 10)], renk: "vurgu" },
  { d: ["M76 206 H436 L414 322 H98 Z", R(420, 252, 84, 18, 8)] },
  { d: [D(170, 362, 72) + " " + D(170, 362, 50), D(342, 362, 72) + " " + D(342, 362, 50)], tek: true },
  { d: [D(170, 362, 16), D(342, 362, 16)] },
];
const PERGEL: IkonTanim = [
  { d: [R(246, 18, 20, 36, 6), D(256, 72, 32), "M238 92 L118 462 L140 470 L262 102 Z", "M274 92 L394 462 L372 470 L250 102 Z"] },
  { d: ["M136 334 C196 302 316 302 376 334 L370 350 C312 320 200 320 142 350 Z"], renk: "vurgu" },
  { d: [D(256, 72, 11)], renk: "koyu" },
];
const IGNE: IkonTanim = [
  { d: ["M404 108 C470 160 430 252 340 282 C250 312 222 372 270 420 C300 450 350 440 380 420 L386 434 C350 460 296 466 260 432 C200 378 236 300 334 268 C418 240 450 166 396 120 Z"], renk: "vurgu" },
  { d: ["M84 472 L378 112 C392 96 424 104 420 130 Z"] },
  { d: [E(398, 122, 7, 18)], renk: "koyu", t: "rotate(40 398 122)" },
];
const MAKAS: IkonTanim = [
  { d: ["M176 338 L366 52 C376 44 394 52 388 68 L216 354 Z", "M336 338 L146 52 C136 44 118 52 124 68 L296 354 Z"] },
  { d: [D(170, 392, 64) + " " + D(170, 392, 36), D(342, 392, 64) + " " + D(342, 392, 36)], tek: true },
  { d: [D(256, 214, 16)], renk: "vurgu" },
];
const KUMAS: IkonTanim = [
  { d: ["M330 250 L440 250 L472 474 L360 474 Z"], renk: "vurgu" },
  { d: ["M100 160 H370 C400 160 420 200 420 250 C420 300 400 340 370 340 H100 C70 340 50 300 50 250 C50 200 70 160 100 160 Z"] },
  { d: [E(370, 250, 40, 84) + " " + E(370, 250, 16, 30), R(150, 160, 10, 180), R(250, 160, 10, 180)], renk: "koyu", tek: true },
];
const TEZGAH: IkonTanim = [
  { d: [R(68, 60, 34, 404, 8), R(410, 60, 34, 404, 8), R(48, 80, 416, 34, 10), R(48, 384, 416, 34, 10), ...[130, 170, 210, 250, 290, 330, 370].map((x) => R(x, 114, 8, 270))] },
  { d: [R(118, 284, 276, 100), "M156 190 H356 L384 208 L356 226 H156 L128 208 Z"], renk: "vurgu" },
  { d: [R(118, 304, 276, 7), R(118, 334, 276, 7), R(118, 364, 276, 7)], renk: "koyu" },
];
const CADIR: IkonTanim = [
  { d: ["M256 70 L472 430 H40 Z", R(30, 428, 452, 20, 8), R(250, 24, 12, 60)] },
  { d: ["M256 232 L330 430 H182 Z"], renk: "koyu" },
  { d: ["M262 24 L322 40 L262 56 Z", "M256 232 L298 430 H272 Z"], renk: "vurgu" },
];
const HALI: IkonTanim = [
  { d: [R(70, 92, 372, 328, 8), ...[90, 130, 170, 210, 250, 290, 330, 370, 410].flatMap((x) => [R(x, 62, 8, 30), R(x, 420, 8, 30)])] },
  { d: [R(98, 120, 316, 272) + " " + R(118, 140, 276, 232)], renk: "koyu", tek: true },
  { d: ["M256 162 L352 256 L256 350 L160 256 Z"], renk: "vurgu" },
  { d: ["M256 208 L304 256 L256 304 L208 256 Z"], renk: "koyu" },
];
const DERI: IkonTanim = [
  { d: ["M150 60 C200 90 312 90 362 60 L380 120 C440 140 460 180 440 220 C420 260 440 300 460 330 C440 370 400 380 380 400 L362 456 C312 426 200 426 150 456 L132 400 C112 380 72 370 52 330 C72 300 92 260 72 220 C52 180 72 140 132 120 Z"] },
  { d: [D(150, 60, 16), D(362, 60, 16), D(150, 456, 16), D(362, 456, 16)], renk: "vurgu" },
  { d: [E(256, 258, 90, 120) + " " + E(256, 258, 80, 110)], renk: "koyu", tek: true },
];
const KAZAN: IkonTanim = [
  { d: ["M120 200 C120 80 392 80 392 200 H364 C364 114 148 114 148 200 Z", R(84, 190, 344, 40, 16), "M100 230 H412 C412 350 348 432 256 432 C164 432 100 350 100 230 Z", R(150, 408, 30, 62, 8), R(332, 408, 30, 62, 8)] },
  { d: ["M196 504 C190 472 214 458 222 430 C240 458 246 478 236 504 Z", "M276 504 C270 472 294 458 302 430 C320 458 326 478 316 504 Z"], renk: "vurgu" },
  { d: [R(140, 280, 232, 10, 5)], renk: "koyu" },
];
const KEPCE: IkonTanim = dondur([
  { d: [R(242, 46, 28, 272, 12), D(256, 44, 24) + " " + D(256, 44, 11), "M154 300 H358 C358 390 314 446 256 446 C198 446 154 390 154 300 Z"], tek: true },
  { d: [E(256, 306, 96, 14)], renk: "vurgu" },
], 30);
const SOFRA: IkonTanim = [
  { d: [E(256, 330, 212, 58), R(130, 380, 30, 86, 8), R(352, 380, 30, 86, 8)] },
  { d: ["M168 302 C168 250 208 220 256 220 C304 220 344 250 344 302 Z", D(256, 210, 16), E(392, 316, 40, 16), E(120, 316, 36, 14)], renk: "vurgu" },
  { d: [E(256, 306, 106, 14)], renk: "koyu" },
];
const FIRIN: IkonTanim = [
  { d: [R(330, 60, 40, 100, 6), "M70 420 V300 C70 180 160 100 256 100 C352 100 442 180 442 300 V420 Z", R(50, 420, 412, 30, 8)] },
  { d: ["M186 420 V330 C186 290 216 264 256 264 C296 264 326 290 326 330 V420 Z"], renk: "koyu" },
  { d: ["M210 420 C216 380 240 370 244 340 C262 366 274 392 266 420 Z", "M262 420 C268 390 286 380 290 356 C306 380 312 400 304 420 Z"], renk: "vurgu" },
];
const ET: IkonTanim = [
  { d: [R(246, 30, 20, 90, 6), "M256 104 C300 104 312 152 282 172 L270 158 C290 148 286 120 256 120 Z"] },
  { d: ["M190 170 C260 150 340 170 360 230 C380 300 350 400 300 450 C250 470 200 440 180 390 C150 320 150 220 190 170 Z"], renk: "vurgu" },
  { d: ["M200 230 C260 220 300 240 330 270 L324 280 C296 254 256 236 204 242 Z", "M190 320 C240 310 300 330 340 360 L334 370 C296 342 240 324 194 332 Z"], renk: "koyu" },
];
const KUP: IkonTanim = [
  { d: ["M196 120 H316 V150 C380 180 410 240 410 310 C410 400 350 462 256 462 C162 462 102 400 102 310 C102 240 132 180 196 150 Z", R(180, 92, 152, 34, 10)] },
  { d: [R(130, 290, 252, 16, 6), R(140, 340, 232, 10, 5)], renk: "vurgu" },
];

// ---------------------------------------------------------------- hizmet: hancı, şifacı, ozan, kâtip
const FENER: IkonTanim = [
  { d: [D(256, 62, 30) + " " + D(256, 62, 16), "M186 170 H326 L314 404 H198 Z M210 196 H302 L292 380 H220 Z"], tek: true },
  { d: ["M178 152 L256 90 L334 152 Z", R(168, 146, 176, 24, 8), R(176, 404, 160, 30, 10), R(206, 434, 100, 22, 8)] },
  { d: ["M256 230 C290 270 300 310 282 340 C272 356 240 356 230 340 C212 310 226 280 256 230 Z"], renk: "vurgu" },
];
const ANAHTAR: IkonTanim = dondur([
  { d: [D(150, 256, 92) + " " + D(150, 256, 48)], tek: true },
  { d: [R(232, 238, 236, 36, 10), R(400, 272, 26, 60, 4), R(442, 272, 26, 46, 4)] },
  { d: [D(150, 256, 22)], renk: "vurgu" },
], -40);
const YATAK: IkonTanim = [
  { d: [R(56, 150, 44, 290, 10), R(412, 236, 44, 204, 10), R(96, 286, 320, 66, 14), R(56, 352, 400, 26, 6)] },
  { d: [R(210, 276, 206, 82, 12)], renk: "vurgu" },
  { d: [E(156, 268, 54, 26)] },
  { d: [R(210, 304, 206, 8)], renk: "koyu" },
];
const KULAK: IkonTanim = [
  { d: ["M300 60 C200 60 140 130 140 220 C140 280 170 300 190 330 C210 360 200 420 250 450 C300 470 340 430 340 390 C340 350 380 330 400 290 C420 250 420 200 400 160 C380 100 340 60 300 60 Z"] },
  { d: ["M300 118 C240 118 208 160 208 210 C208 242 236 252 250 236 C262 222 250 200 270 186 C300 170 330 190 330 222 L352 222 C352 160 322 118 300 118 Z"], renk: "koyu" },
  { d: ["M430 200 C452 230 452 290 430 320 L414 310 C432 284 432 236 414 210 Z", "M470 170 C502 220 502 300 470 350 L454 340 C482 296 482 224 454 180 Z"], renk: "vurgu" },
];
const GOZ: IkonTanim = [
  { d: ["M30 256 C116 146 396 146 482 256 C396 366 116 366 30 256 Z M78 256 C150 190 362 190 434 256 C362 322 150 322 78 256 Z"], tek: true },
  { d: [D(256, 256, 66)], renk: "vurgu" },
  { d: [D(256, 256, 28)], renk: "koyu" },
];
const HAVAN: IkonTanim = [
  { d: [R(300, 40, 44, 250, 22)], t: "rotate(28 322 165)" },
  { d: ["M150 242 C130 202 140 162 170 142 C180 182 176 216 170 242 Z", "M200 242 C196 198 216 172 246 162 C244 198 232 224 222 242 Z"], renk: "vurgu" },
  { d: ["M96 240 H416 V262 C416 360 346 418 256 418 C166 418 96 360 96 262 Z", R(176, 418, 160, 36, 10)] },
  { d: [E(256, 246, 150, 12)], renk: "koyu" },
];
const NESTER: IkonTanim = dondur([
  { d: [R(240, 200, 32, 280, 12), "M240 200 V110 C240 70 262 40 290 30 C282 80 272 140 272 200 Z"] },
  { d: [R(240, 300, 32, 8), R(240, 330, 32, 8), R(240, 360, 32, 8)], renk: "koyu" },
  { d: [R(236, 192, 40, 16, 6)], renk: "vurgu" },
], 40);
const BESIK: IkonTanim = [
  { d: ["M96 240 C96 150 150 96 230 96 L240 240 Z"] },
  { d: [D(330, 214, 40)], renk: "vurgu" },
  { d: ["M90 222 H422 C422 330 350 380 256 380 C162 380 90 330 90 222 Z", R(140, 350, 22, 70, 6), R(350, 350, 22, 70, 6), "M56 382 C156 452 356 452 456 382 L462 404 C356 478 156 478 50 404 Z"] },
  { d: [R(120, 262, 272, 8, 4), R(140, 300, 232, 8, 4)], renk: "koyu" },
];
const SARGI: IkonTanim = [
  { d: [R(200, 388, 280, 44, 8), D(200, 300, 132) + " " + D(200, 300, 30)], tek: true },
  { d: [D(200, 300, 76) + " " + D(200, 300, 66), R(240, 400, 220, 8)], renk: "koyu", tek: true },
  { d: ["M372 60 H412 V110 H462 V150 H412 V200 H372 V150 H322 V110 H372 Z"], renk: "vurgu" },
];
const NEY: IkonTanim = dondur([
  { d: [R(234, 24, 44, 464, 22)] },
  { d: [R(230, 24, 52, 44, 12), R(230, 450, 52, 30, 10)], renk: "vurgu" },
  { d: [D(256, 160, 9), D(256, 222, 9), D(256, 266, 9), D(256, 310, 9), D(256, 354, 9), D(256, 398, 9)], renk: "koyu" },
], 38);
const BAGLAMA: IkonTanim = dondur([
  { d: [R(244, 30, 24, 300, 8), R(232, 22, 48, 82, 10), "M256 280 C330 280 390 330 390 400 C390 450 330 486 256 486 C182 486 122 450 122 400 C122 330 182 280 256 280 Z"] },
  { d: [R(204, 38, 28, 12, 4), R(204, 70, 28, 12, 4), R(280, 38, 28, 12, 4), R(280, 70, 28, 12, 4)], renk: "vurgu" },
  { d: [D(256, 386, 22), R(220, 442, 72, 10, 4), R(250, 100, 4, 340), R(258, 100, 4, 340)], renk: "koyu" },
], 32);
const KALP: IkonTanim = [
  { d: ["M256 448 C180 388 64 304 64 196 C64 134 112 86 172 86 C210 86 240 108 256 140 C272 108 302 86 340 86 C400 86 448 134 448 196 C448 304 332 388 256 448 Z"] },
  { d: ["M150 170 C150 146 168 128 192 128 L192 146 C178 146 168 156 168 170 Z"], renk: "vurgu" },
];
const KALEM: IkonTanim = [
  { d: ["M448 40 C330 60 220 150 170 300 C160 330 154 356 150 380 L172 386 C250 350 400 230 448 40 Z"] },
  { d: ["M440 52 L176 372 L168 366 L432 46 Z"], renk: "koyu" },
  { d: ["M150 380 L172 386 L118 472 L108 466 Z", D(104, 482, 12)], renk: "vurgu" },
];
const DIVIT: IkonTanim = [
  { d: [R(300, 26, 22, 250, 8)], renk: "vurgu", t: "rotate(24 311 151)" },
  { d: ["M140 280 C140 230 186 206 256 206 C326 206 372 230 372 280 V404 C372 434 334 452 256 452 C178 452 140 434 140 404 Z", R(206, 166, 100, 48, 10)] },
  { d: [R(170, 300, 172, 56, 10)], renk: "koyu" },
  { d: [E(256, 170, 44, 10)], renk: "vurgu" },
];
const MUHUR: IkonTanim = [
  { d: ["M206 60 C206 26 306 26 306 60 V108 C306 136 288 148 282 168 V290 H230 V168 C224 148 206 136 206 108 Z", R(140, 290, 232, 56, 10)] },
  { d: [R(150, 346, 212, 16)], renk: "koyu" },
  { d: [D(256, 440, 54)], renk: "vurgu" },
  { d: [PIRILTI(256, 440, 32)], renk: "koyu" },
];
const MEKTUP: IkonTanim = [
  { d: [R(56, 128, 400, 264, 12)] },
  { d: ["M56 128 L256 292 L456 128 L456 152 L256 316 L56 152 Z", "M56 392 L200 260 L214 274 L80 392 Z", "M456 392 L312 260 L298 274 L432 392 Z"], renk: "koyu" },
];

// ---------------------------------------------------------------- ticaret ve toplum: tüccar, arabulucu, asker, divan
const KESE: IkonTanim = [
  { d: ["M206 160 C120 200 90 290 100 360 C110 432 176 462 256 462 C336 462 402 432 412 360 C422 290 392 200 306 160 Z", "M214 120 H298 L306 162 H206 Z", "M196 122 C200 92 230 78 256 92 C282 78 312 92 316 122 Z"] },
  { d: [R(192, 150, 128, 22, 10)], renk: "vurgu" },
  { d: [D(256, 330, 60) + " " + D(256, 330, 42), R(250, 300, 12, 60, 4)], renk: "koyu", tek: true },
];
const PAZAR: IkonTanim = [
  { d: [R(80, 196, 22, 262), R(410, 196, 22, 262), R(56, 300, 400, 48, 8), R(76, 348, 360, 16)] },
  { d: ["M46 116 H466 L444 200 H68 Z", D(150, 278, 26), D(220, 272, 32), E(330, 284, 60, 20)], renk: "vurgu" },
  { d: ["M130 116 H172 L164 200 H122 Z", "M234 116 H278 L276 200 H236 Z", "M340 116 H382 L390 200 H348 Z"], renk: "koyu" },
];
const EL_SIKISMA: IkonTanim = [
  { d: [R(10, 252, 150, 90, 10)], t: "rotate(-20 85 297)" },
  { d: [R(352, 252, 150, 90, 10)], t: "rotate(20 427 297)" },
  { d: [R(140, 236, 28, 112, 6)], renk: "vurgu", t: "rotate(-20 154 292)" },
  { d: [R(344, 236, 28, 112, 6)], renk: "vurgu", t: "rotate(20 358 292)" },
  { d: ["M162 252 C202 222 242 212 282 216 L360 242 C372 262 368 302 352 322 L300 362 C270 382 230 382 200 364 L158 332 Z"] },
  { d: ["M230 272 L330 264 L332 274 L232 282 Z", "M236 302 L338 294 L340 304 L238 312 Z", "M244 332 L330 326 L332 336 L246 342 Z"], renk: "koyu" },
];
const yaprak = (x: number, y: number, a: number): IkonKatman => ({ d: [E(x, y, 60, 20)], t: `rotate(${a} ${x} ${y})` });
const ZEYTIN: IkonTanim = [
  { d: ["M96 462 C160 362 240 240 400 68 L414 80 C258 252 178 372 114 470 Z"] },
  yaprak(146, 300, -35), yaprak(222, 206, -35), yaprak(298, 118, -35), yaprak(246, 362, 25), yaprak(322, 270, 25), yaprak(394, 176, 25),
  { d: [D(190, 252, 18), D(272, 318, 18), D(346, 214, 16)], renk: "vurgu" },
];
const MIZRAK: IkonTanim = dondur([
  { d: [R(246, 160, 20, 334, 8), "M256 16 C292 70 300 124 274 170 H238 C212 124 220 70 256 16 Z"] },
  { d: [R(234, 166, 44, 22, 6), "M246 190 C222 220 214 252 228 276 L242 206 Z", "M266 190 C290 220 298 252 284 276 L270 206 Z"], renk: "vurgu" },
  { d: [R(253, 40, 6, 120)], renk: "koyu" },
], 35);

// ---------------------------------------------------------------- ek aletler (sunucunun anlamsal ikon adları için)
const DAG: IkonTanim = [
  { d: ["M20 440 L180 140 L250 262 L330 108 L492 440 Z"] },
  { d: ["M330 108 L372 188 L350 180 L330 198 L312 182 L290 190 Z", "M180 140 L210 196 L194 190 L180 204 L166 192 L152 196 Z"], renk: "vurgu" },
];
const TAS: IkonTanim = [
  { d: ["M56 430 L96 300 L190 248 L282 290 L302 430 Z", "M248 430 L288 228 L380 188 L452 258 L472 430 Z"] },
  { d: ["M330 238 L374 218 L394 262 Z", "M120 316 L170 290 L176 320 Z"], renk: "vurgu" },
  { d: ["M200 330 L236 360 L230 368 L196 340 Z", "M352 300 L392 340 L386 348 L346 308 Z"], renk: "koyu" },
];
const SUR: IkonTanim = [
  { d: [R(40, 200, 432, 262), R(40, 150, 56, 54), R(134, 150, 56, 54), R(228, 150, 56, 54), R(322, 150, 56, 54), R(416, 150, 56, 54)] },
  { d: ["M206 462 V384 C206 354 228 334 256 334 C284 334 306 354 306 384 V462 Z", R(40, 282, 432, 7), R(40, 372, 150, 7), R(322, 372, 150, 7)], renk: "koyu" },
  { d: [R(250, 96, 8, 56), "M258 96 L312 112 L258 128 Z"], renk: "vurgu" },
];
const KULCE: IkonTanim = [
  { d: ["M78 334 L118 272 H262 L302 334 Z", "M210 334 L250 272 H394 L434 334 Z", "M144 264 L184 202 H328 L368 264 Z", R(68, 334, 376, 16, 4)] },
  { d: ["M136 290 H246 L252 302 H130 Z", "M268 290 H378 L384 302 H262 Z", "M202 220 H312 L318 232 H196 Z"], renk: "vurgu" },
];
const KILIT: IkonTanim = [
  { d: ["M170 242 V172 C170 110 210 72 256 72 C302 72 342 110 342 172 V242 H306 V174 C306 134 284 110 256 110 C228 110 206 134 206 174 V242 Z", R(128, 232, 256, 222, 24)] },
  { d: [D(256, 318, 26), "M244 330 H268 L278 402 H234 Z"], renk: "koyu" },
  { d: [R(128, 262, 256, 10)], renk: "vurgu" },
];
const MINBER: IkonTanim = [
  { d: ["M56 464 V404 H136 V344 H216 V284 H296 V224 H360 V464 Z", R(340, 122, 120, 342)] },
  { d: ["M330 128 L400 38 L470 128 Z"], renk: "vurgu" },
  { d: ["M66 394 L338 206 L346 218 L74 406 Z", "M372 160 H428 V214 H372 Z"], renk: "koyu" },
];
const GONYE: IkonTanim = [
  { d: ["M80 80 H142 V372 H432 V434 H80 Z"] },
  { d: [...[130, 180, 230, 280, 330].map((y) => R(142, y, 26, 7)), ...[190, 240, 290, 340, 390].map((x) => R(x, 346, 7, 26))], renk: "koyu" },
  { d: [R(98, 98, 26, 26, 6)], renk: "vurgu" },
];
const FIRCA: IkonTanim = dondur([
  { d: [R(240, 30, 32, 260, 14), "M226 322 H286 C292 382 300 430 256 472 C212 430 220 382 226 322 Z"] },
  { d: [R(232, 282, 48, 42, 6), "M232 430 C244 450 268 450 280 430 C276 452 268 466 256 476 C244 466 236 452 232 430 Z"], renk: "vurgu" },
], 35);
const KIRMEN: IkonTanim = [
  { d: [R(248, 52, 16, 420, 8), "M256 40 C292 40 298 76 270 86 L264 74 C278 68 274 54 256 54 Z", E(256, 372, 116, 28)] },
  { d: [E(256, 214, 62, 92)], renk: "vurgu" },
  { d: ["M200 170 L310 250 L306 258 L196 178 Z", "M200 230 L312 300 L308 308 L196 238 Z"], renk: "koyu" },
];
const MEKIK: IkonTanim = [
  { d: ["M30 256 C120 178 392 178 482 256 C392 334 120 334 30 256 Z"] },
  { d: [E(256, 256, 112, 32)], renk: "koyu" },
  { d: [R(170, 236, 172, 40, 18), "M470 262 C496 302 472 334 440 344 L434 330 C460 320 480 298 458 268 Z"], renk: "vurgu" },
];
const KUSAK: IkonTanim = [
  { d: ["M30 218 C150 188 362 188 482 218 V292 C362 262 150 262 30 292 Z", "M228 282 L188 444 L236 422 L256 300 Z", "M284 282 L324 444 L276 422 L256 300 Z"] },
  { d: ["M30 242 C150 212 362 212 482 242 V256 C362 226 150 226 30 256 Z"], renk: "koyu" },
  { d: [D(256, 252, 46)], renk: "vurgu" },
];
const SANDIK: IkonTanim = [
  { d: [R(70, 222, 372, 230, 14), "M70 222 V182 C70 130 120 100 180 100 H332 C392 100 442 130 442 182 V222 Z"] },
  { d: [R(128, 100, 30, 352), R(354, 100, 30, 352), R(224, 196, 64, 74, 8)], renk: "vurgu" },
  { d: [R(70, 214, 372, 10), D(256, 230, 10)], renk: "koyu" },
];
const KUREK: IkonTanim = dondur([
  { d: [R(244, 30, 24, 270, 10), "M150 300 H362 V420 C362 452 340 472 310 472 H202 C172 472 150 452 150 420 Z"] },
  { d: [E(256, 392, 82, 40)], renk: "vurgu" },
  { d: [E(256, 392, 52, 8)], renk: "koyu" },
], 25);
const DAVUL: IkonTanim = [
  { d: [R(190, 18, 18, 190, 9)], t: "rotate(-30 199 113)" },
  { d: [R(304, 18, 18, 190, 9)], t: "rotate(30 313 113)" },
  { d: ["M98 210 V362 C98 412 168 442 256 442 C344 442 414 412 414 362 V210 Z"] },
  { d: ["M98 262 L150 362 L202 262 L256 362 L310 262 L362 362 L414 262 V286 L362 386 L310 286 L256 386 L202 286 L150 386 L98 286 Z"], renk: "koyu" },
  { d: [E(256, 210, 158, 50)], renk: "vurgu" },
];
const FINCAN: IkonTanim = [
  { d: ["M372 230 C442 220 452 302 384 318 L380 292 C416 282 412 250 376 256 Z", "M128 200 H384 C384 320 332 392 256 392 C180 392 128 320 128 200 Z", E(256, 414, 192, 30)] },
  { d: [E(256, 204, 128, 18), "M220 172 C200 140 240 120 220 90 L232 86 C254 118 214 138 234 168 Z", "M290 172 C270 140 310 120 290 90 L302 86 C324 118 284 138 304 168 Z"], renk: "vurgu" },
];
const LALE: IkonTanim = [
  { d: [R(248, 250, 16, 230, 8), "M256 424 C200 404 150 344 150 282 C200 302 240 352 256 424 Z", "M256 404 C312 384 362 324 362 262 C312 282 272 332 256 404 Z"] },
  { d: ["M168 118 L210 172 L256 98 L302 172 L344 118 C354 222 322 272 256 272 C190 272 158 222 168 118 Z"], renk: "vurgu" },
];
const YOLTASI: IkonTanim = [
  { d: ["M170 470 V160 C170 100 210 64 256 64 C302 64 342 100 342 160 V470 Z", R(128, 452, 256, 32, 6)] },
  { d: [R(206, 168, 100, 11, 4), R(206, 208, 100, 11, 4), R(206, 248, 70, 11, 4)], renk: "koyu" },
  { d: ["M214 322 H274 V296 L320 338 L274 380 V354 H214 Z"], renk: "vurgu" },
];
const HEDIYE: IkonTanim = [
  { d: [R(90, 232, 332, 230, 10), R(70, 180, 372, 62, 10)] },
  { d: [R(236, 180, 40, 282), "M256 182 C200 100 118 120 150 172 C170 198 222 192 256 182 Z", "M256 182 C312 100 394 120 362 172 C342 198 290 192 256 182 Z"], renk: "vurgu" },
];
const KAVUK: IkonTanim = [
  { d: ["M172 360 V142 C172 98 340 98 340 142 V360 Z"], renk: "vurgu" },
  { d: [E(256, 362, 192, 82)] },
  { d: ["M70 352 C150 302 362 302 442 352 L438 368 C362 320 150 320 74 368 Z", "M92 394 C172 346 340 346 420 394 L416 410 C340 364 172 364 96 410 Z"], renk: "koyu" },
];
const AYAK = "M150 470 C110 470 100 420 110 360 C120 300 150 270 180 280 C210 290 210 340 200 400 C192 450 180 470 150 470 Z";
const IZ: IkonTanim = [
  { d: [AYAK, D(126, 256, 13), D(152, 244, 13), D(178, 246, 12), D(201, 258, 11)] },
  { d: [AYAK, D(126, 256, 13), D(152, 244, 13), D(178, 246, 12), D(201, 258, 11)], t: "translate(160 -200)" },
];
const KALE: IkonTanim = [
  { d: [R(56, 122, 112, 340), R(344, 122, 112, 340), R(168, 222, 176, 240), R(56, 88, 30, 42), R(97, 88, 30, 42), R(138, 88, 30, 42), R(344, 88, 30, 42), R(385, 88, 30, 42), R(426, 88, 30, 42), R(180, 190, 32, 40), R(240, 190, 32, 40), R(300, 190, 32, 40), R(108, 26, 6, 64)] },
  { d: ["M216 462 V382 C216 358 234 342 256 342 C278 342 296 358 296 382 V462 Z", R(101, 204, 22, 46, 8), R(389, 204, 22, 46, 8)], renk: "koyu" },
  { d: ["M114 26 L160 40 L114 54 Z"], renk: "vurgu" },
];
const TOPUZ: IkonTanim = [
  { d: [PIRILTI(256, 150, 120)], renk: "vurgu" },
  { d: [R(244, 210, 24, 262, 10), D(256, 150, 80), D(256, 484, 18)] },
  { d: [D(256, 150, 28)], renk: "koyu" },
];
const NAL: IkonTanim = [
  { d: ["M118 74 C76 200 98 384 256 444 C414 384 436 200 394 74 H330 C362 188 342 330 256 372 C170 330 150 188 182 74 Z"] },
  { d: [D(144, 130, 10), D(140, 200, 10), D(154, 268, 10), D(368, 130, 10), D(372, 200, 10), D(358, 268, 10)], renk: "koyu" },
  { d: [R(112, 64, 76, 22, 8), R(324, 64, 76, 22, 8)], renk: "vurgu" },
];
const KILIC_SADE: IkonTanim = KILIC.slice(0, 2);

// ---------------------------------------------------------------- ikon sözlüğü (sunucunun anlamsal ikon adları)
// Sıra ve adlar online-server/src/icerik/agaclar/<meslek>.ts `i` alanıyla aynıdır; aynı ad her ağaçta aynı çizimdir.
export const BECERI_IKON: Record<string, IkonTanim> = {
  // çiftçilik
  basak: g("wheat"), koyun: g("sheep"), cuval: CUVAL, saban: SABAN, post: DERI, harman: ORAK, nadas: TOHUM, yayla: rozet(DAG, g("sheep")),
  ambar: AMBAR, imece: rozet(g("family"), g("wheat", "vurgu")), mera: rozet(g("leaf"), g("sheep")), kile: g("bucket"),
  bereket: [{ d: yol("sun"), renk: "vurgu", t: "translate(96 0) scale(0.62)" }, ...kucult(g("wheat"), 0.78, 30, 110)], tohum: isikli(TOHUM),
  // oduncu ve madenci
  balta: BALTA, kazma: KAZMA, tas: TAS, testere: g("saw"), ocak: MADEN, blok: BLOK, kiris: KIRIS, gumus: isikli(g("gems")),
  degirmen: DEGIRMEN, fidan: AGAC, fener: FENER, sur: SUR, dag: isikli(DAG), damar: rozet(DAG, g("gems")),
  // demircilik
  cekic: CEKIC, ors: g("anvil"), kulce: KULCE, orak: ORAK, kilic: KILIC_SADE, kalkan: g("shield"),
  disli: [{ d: [disli(196, 312, 104, 140, 9, 40)], tek: true }, { d: [disli(368, 156, 62, 90, 8, 24)], tek: true }, { d: [disli(390, 392, 44, 64, 7, 16)], tek: true }],
  suVerme: KILIC, zirh: [{ d: [GOGUSLUK], tek: true }], kilit: KILIT,
  kilicTac: [{ d: yol("flame"), renk: "vurgu", t: "translate(40 40) scale(0.62)" }, { d: KILIC_YOL, t: "rotate(40 256 256)" }, { d: KILIC_OLUK, renk: "koyu", t: "rotate(40 256 256)" }],
  migfer: [{ d: [SORGUC], renk: "vurgu" }, { d: [SOVALYE], tek: true }],
  damga: [{ d: [PIRILTI(256, 118, 100)], renk: "vurgu" }, { d: yol("anvil"), t: "translate(56 150) scale(0.78)" }],
  yildizCelik: isikli(KILIC_SADE),
  // marangozluk
  rende: RENDE, tekerlek: TEKERLEK, keski: KESER, ev: g("house"), araba: ARABA, kapi: KAPI, han: rozet(g("house"), YATAK), kopru: KOPRU,
  minber: MINBER, gonye: GONYE, gecit: rozet(KOPRU, g("coins")), firca: FIRCA, pergel: PERGEL, gecme: isikli(RENDE),
  // dokumacılık ve debbağlık
  kirmen: KIRMEN, deri: DERI, kece: g("wool"), dokumaTezgahi: TEZGAH, kosum: g("boot"), cadir: CADIR, hali: HALI, astar: IGNE,
  sancak: g("banner"), mekik: MEKIK, ahi: g("hood"), ordugah: rozet(CADIR, g("banner")), kusak: KUSAK, ipek: isikli(KUMAS),
  // aşçılık
  ekmek: g("bread"), kepce: KEPCE, tuz: KUP, un: DEGIRMEN, kazan: KAZAN, pastirma: ET, firin: FIRIN, sofra: SOFRA, sandik: SANDIK,
  kurek: KUREK, tencere: rozet(g("house"), KEPCE), kiler: ANAHTAR, nimet: isikli(KAZAN), baharat: isikli(KUP),
  // hancılık
  yatak: YATAK, serbet: g("amphora"), kulak: KULAK, oda: rozet(g("house"), ANAHTAR), saz: BAGLAMA, defter: g("book"),
  kervan: rozet(g("camel"), g("compass")), dugun: rozet(SOFRA, KALP), ag: g("scroll"), anahtar: ANAHTAR, kandil: FENER, masa: g("family"),
  kervansaray: rozet(KALE, g("camel")),
  // şifacılık
  merhem: KUP, besik: BESIK, yaprak: g("herbs"), atel: SARGI, ebe: g("baby"), imbik: g("potion"), nester: NESTER,
  cocuk: rozet(g("baby"), g("herbs")), sise: rozet(g("potion"), g("skull")), darussifa: rozet(g("house"), SARGI), el: g("healing"),
  havan: HAVAN, lokman: isikli(HAVAN), risale: isikli(g("book")),
  // ozanlık
  tezene: g("lyre"), gul: KALP, davul: DAVUL, baglama: BAGLAMA, fincan: FINCAN, kitap: g("book"), meydan: g("trophy"), guvercin: ZEYTIN,
  parsomen: g("scroll-open"), tekke: g("prayer-beads"), kalem: KALEM, lale: LALE, kopuz: isikli(BAGLAMA),
  // kâtiplik
  murekkep: DIVIT, zarf: MEKTUP, hat: KALEM, at: NAL, dil: g("scroll-open"), vasiyet: g("scroll"), muhur: MUHUR,
  sayim: rozet(g("book"), g("family")), tasdik: rozet(g("scroll"), MUHUR), menzil: KULE, kese: KESE, tugra: isikli(KALEM), sifre: rozet(g("scroll"), ANAHTAR),
  // tüccarlık
  tezgah: PAZAR, deve: g("camel"), pusula: g("compass"), terazi: g("scales"), harita: g("map"), carsi: rozet(PAZAR, KESE), yolTasi: YOLTASI,
  altin: isikli(g("coins")),
  // arabuluculuk
  elSikisma: EL_SIKISMA, zeytinDali: ZEYTIN, hediye: HEDIYE, yemin: rozet(g("crossed-swords"), ZEYTIN), ferman: rozet(g("scroll"), MUHUR),
  heyet: g("family"), bayrak: g("banner"), kavuk: KAVUK, adalet: isikli(g("scales")), kalp: KALP,
  // askerlik
  mizrak: MIZRAK, talim: g("crossed-swords"), iz: IZ, kule: KULE, kale: KALE, yay: g("bow"), nisan: isikli(g("medal")),
  // divan
  akce: g("coins"), olcek: g("bucket"), divit: DIVIT, dilekce: g("scroll"), buyruk: g("scroll-open"), kursu: MINBER,
  hazine: rozet(SANDIK, g("coins")), topuz: TOPUZ,

  // meslek armaları (başlık, geçmiş ve tüm beceriler listesi)
  demircilik: [{ d: yol("anvil"), t: "translate(28 150) scale(0.9)" }, { d: CEKIC_YOL, t: "translate(150 -10) scale(0.56) rotate(-40 256 256)" }],
  ciftcilik: rozet(SABAN, g("wheat", "vurgu")),
  odunculuk: rozet(KUTUK, BALTA),
  marangozluk: rozet(RENDE, KESER),
  dokumacilik: rozet(KUMAS, MAKAS),
  ascilik: rozet(KAZAN, KEPCE),
  hancilik: rozet(FENER, ANAHTAR),
  sifacilik: rozet(HAVAN, renkle(g("herbs"), "vurgu")),
  ozanlik: rozet(BAGLAMA, NEY),
  katiplik: rozet(DIVIT, KALEM),
  tuccarlik: rozet(g("scales"), KESE),
  arabuluculuk: rozet(EL_SIKISMA, ZEYTIN),
  askerlik: rozet(g("shield"), MIZRAK),
  divanlik: rozet(g("crown"), MUHUR),
};
