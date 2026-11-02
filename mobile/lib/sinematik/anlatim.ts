// Açılış sinematiği sesi: dil başına tek tam miks (Kronks anlatıcı + özgün müzik + efekt; ElevenLabs, ücretli plan).
// Hepsi aynı ortak zaman çizelgesinde (assets/ses/giris/zaman.json). Kaynak ve lisans: assets/ses/LISANS.md, uretim.json.
import ZAMAN from "../../assets/ses/giris/zaman.json";
const MS: number = ZAMAN.toplamMs;
export const ANLATIM: Record<string, { kaynak: number; ms: number }> = {
  "giris.tr": { kaynak: require("../../assets/ses/giris/giris_tr.m4a"), ms: MS },
  "giris.en": { kaynak: require("../../assets/ses/giris/giris_en.m4a"), ms: MS },
  "giris.es": { kaynak: require("../../assets/ses/giris/giris_es.m4a"), ms: MS },
  "giris.pt": { kaynak: require("../../assets/ses/giris/giris_pt.m4a"), ms: MS },
  "giris.ar": { kaynak: require("../../assets/ses/giris/giris_ar.m4a"), ms: MS },
  "giris.ru": { kaynak: require("../../assets/ses/giris/giris_ru.m4a"), ms: MS },
};
