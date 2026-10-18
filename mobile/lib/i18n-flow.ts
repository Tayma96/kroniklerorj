import type { Lang } from "./locale-data";
const rows: Record<string, string[]> = {
  "flow.pending": ["Karara dön", "Return to decision", "Volver a la decisión", "Voltar à decisão", "العودة إلى القرار", "Вернуться к решению"],
  "flow.pendingHint": ["Bu ayın bekleyen kararını aç", "Open this month's pending decision", "Abrir la decisión pendiente de este mes", "Abrir a decisão pendente deste mês", "فتح قرار هذا الشهر المعلّق", "Открыть ожидающее решение этого месяца"]
};
export const FLOW_METIN = Object.fromEntries((["tr", "en", "es", "pt", "ar", "ru"] as Lang[]).map((lang, i) => [lang, Object.fromEntries(Object.entries(rows).map(([key, values]) => [key, values[i]]))])) as Record<Lang, Record<string, string>>;
