// Hissiyat turu metinleri (docs/HISSIYAT_PLANI.md). Sıra: tr, en, es, pt, ar, ru.
import type { Lang } from "./locale-data";
const rows: Record<string, string[]> = {
  // Kartı bu yıla düşmeyen şenlik ayı: akışta tek satırlık ortam (oyuncuyu özne yapmaz).
  "evj.senlikSessiz.2": [
    "Nevruz geldi: meydanda ateşler yandı, çocuklar alevin üstünden atladı.",
    "Nevruz came: fires burned in the square and children leapt over the flames.",
    "Llegó el Nevruz: ardieron hogueras en la plaza y los niños saltaron sobre las llamas.",
    "Chegou o Nevruz: arderam fogueiras na praça e as crianças saltaram sobre as chamas.",
    "حلّ النوروز: اشتعلت النيران في الساحة، وقفز الأطفال فوق اللهب.",
    "Пришёл Навруз: на площади горели костры, дети прыгали через пламя.",
  ],
  "evj.senlikSessiz.7": [
    "Harman bitti: köy son demeti bağladı, akşam sofraları uzun sürdü.",
    "The threshing was done: the village tied the last sheaf, and the evening tables ran long.",
    "Terminó la trilla: el pueblo ató la última gavilla y las cenas se alargaron.",
    "Acabou a debulha: a aldeia atou o último feixe e os jantares estenderam-se.",
    "انتهى الدِّراس: ربطت القرية آخر حزمة، وطالت موائد المساء.",
    "Обмолот закончен: деревня связала последний сноп, вечерние застолья затянулись.",
  ],
  "evj.senlikSessiz.11": [
    "Kış gecesi meclisleri başladı: ocak başlarında masallar anlatıldı, helva kavruldu.",
    "The winter-night gatherings began: tales were told by the hearths and halva was roasted.",
    "Empezaron las veladas de invierno: junto a los hogares se contaron cuentos y se tostó halva.",
    "Começaram os serões de inverno: junto às lareiras contaram-se histórias e torrou-se halva.",
    "بدأت مجالس ليالي الشتاء: رُويت الحكايات حول المواقد وحُمّصت الحلوى.",
    "Начались зимние посиделки: у очагов рассказывали сказки и жарили халву.",
  ],
};
export const HISSIYAT_METIN = Object.fromEntries((["tr", "en", "es", "pt", "ar", "ru"] as Lang[]).map((lang, i) => [lang, Object.fromEntries(Object.entries(rows).map(([key, values]) => [key, values[i]]))])) as Record<Lang, Record<string, string>>;
