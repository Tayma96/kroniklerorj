// Hayat Romanı (paylaşım): Yankı hafızasından kısa, spoiler'sız bir hayat hikâyesi. Ağ yok, sunucu yok; yalnız kayıt okunur.
// Satırlar {k, p} olarak üretilir (günlük gibi renderEvt ile 6 dilde, oyuncu dişilse .f varyantıyla basılır).
// Spoiler-hafif: kartın/yayın yalnız BAŞLIĞI ve seçimin eğilimi yazılır; seçimin sonucu, yayın sonu, ölüm sebebi yazılmaz.
import { GameState, Iz, IzEt, IZ_ZIT, izBaslik, onemliIzler, hafizaEgilimi, deathEpithet } from "./game";
import type { EvtParam } from "./i18n";

export interface RomanSatir { k: string; p: EvtParam[]; }
export interface Roman { satirlar: RomanSatir[]; donumSayisi: number; egilim: IzEt | null; }

const yasi = (s: GameState, iz: Iz) => Math.max(0, s.player.age - Math.floor(Math.max(0, s.turn - iz.t) / 12));
const etP = (et: IzEt): EvtParam => ({ sfx: "yanki.et." + et });

export function hayatRomani(s: GameState): Roman {
  const p = s.player; const h = (s.hafiza || []).filter((x) => !x.ata);
  const out: RomanSatir[] = [];
  out.push({ k: p.dead ? "roman.acilis" : "roman.acilis.sag", p: [p.name, p.age] });
  const ata = (s.hafiza || []).find((x) => x.ata);
  if (ata && ata.ata) out.push({ k: "roman.soy", p: [ata.ata, Math.max(2, p.generation || 2)] });
  else if ((p.generation || 1) > 1) out.push({ k: "roman.kusak", p: [p.generation] });
  const eg = hafizaEgilimi(s.hafiza);
  if (eg) out.push({ k: "roman.egilim", p: [etP(eg)] });
  // Dönüm noktaları: en çok anılan üç büyük seçim, zaman sırasıyla (başlık + eğilim; sonuç yok)
  const donum = onemliIzler(s.hafiza, 3).filter((x) => izBaslik(x)).sort((a, b) => a.t - b.t);
  for (const iz of donum) out.push({ k: "roman.donum", p: [yasi(s, iz), izBaslik(iz) as EvtParam, etP(iz.et)] });
  // Yoldan dönüş: baskın eğilimin en az iki izinden SONRA gelen ilk ters iz
  if (eg) {
    let ayni = 0; const zit = IZ_ZIT[eg];
    for (const iz of [...h].sort((a, b) => a.t - b.t)) {
      if (iz.et === eg) ayni++;
      else if (iz.et === zit && ayni >= 2 && izBaslik(iz) && !donum.includes(iz)) { out.push({ k: "roman.donus", p: [yasi(s, iz), izBaslik(iz) as EvtParam] }); break; }
    }
  }
  const buyuk = h.filter((x) => !x.k.startsWith("kapi:")).length, donen = h.filter((x) => !x.k.startsWith("kapi:") && (x.ref || 0) > 0).length, kapi = h.filter((x) => x.k.startsWith("kapi:")).length;
  if (h.length) out.push({ k: "roman.yanki", p: [buyuk, donen] });
  if (kapi) out.push({ k: "roman.kapi", p: [kapi] });
  const yay = s.story?.completed?.length || 0;
  if (yay) out.push({ k: "roman.yay", p: [yay] });
  if (p.dead) { const ep = deathEpithet(s); out.push(ep ? { k: "roman.son", p: [{ sfx: "ep." + ep }] } : { k: "roman.son.yok", p: [] }); }
  else out.push({ k: "roman.devam", p: [] });
  return { satirlar: out, donumSayisi: donum.length, egilim: eg };
}
