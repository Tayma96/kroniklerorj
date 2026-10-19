import type { Lang } from "./locale-data";

const COPY = {
  tr: { title: "Yük ve varış şehri seç", gap: "Şehirler arası fiyat farkı", selected: "Seçili", cargo: "Taşınan yük", hint: "Fark yalnızca fiyat yönünü gösterir; net getiri sermaye, yol ve baskın riskine bağlıdır." },
  en: { title: "Choose cargo and destination", gap: "Intercity price gap", selected: "Selected", cargo: "Carried goods", hint: "The gap shows price direction only; net return depends on investment, travel and raid risk." },
  es: { title: "Elige la carga y el destino", gap: "Diferencia de precios entre ciudades", selected: "Elegida", cargo: "Carga transportada", hint: "La diferencia solo indica el sentido del precio; el rendimiento neto depende de la inversión, el trayecto y el riesgo de asalto." },
  pt: { title: "Escolha a carga e o destino", gap: "Diferença de preços entre cidades", selected: "Selecionada", cargo: "Carga transportada", hint: "A diferença indica apenas a direção do preço; o retorno líquido depende do investimento, da viagem e do risco de assalto." },
  ar: { title: "اختر حمولة القافلة ووجهتها", gap: "فارق السعر بين المدن", selected: "محدد", cargo: "الحمولة المنقولة", hint: "يوضح الفارق اتجاه السعر فقط؛ ويتوقف العائد الصافي على رأس المال والطريق وخطر السطو." },
  ru: { title: "Выберите груз и пункт назначения", gap: "Разница цен между городами", selected: "Выбрано", cargo: "Перевозимый груз", hint: "Разница показывает только направление цены; чистый доход зависит от вложений, пути и риска нападения." },
} satisfies Record<Lang, Record<"title" | "gap" | "selected" | "cargo" | "hint", string>>;

export type CaravanRouteCopyKey = keyof typeof COPY.tr;
export function caravanRouteText(lang: Lang, key: CaravanRouteCopyKey): string {
  return COPY[lang]?.[key] ?? COPY.tr[key];
}
