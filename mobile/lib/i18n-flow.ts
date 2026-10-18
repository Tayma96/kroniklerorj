import type { Lang } from "./locale-data";
const rows: Record<string, string[]> = {
  "flow.pending": ["Karara dön", "Return to decision", "Volver a la decisión", "Voltar à decisão", "العودة إلى القرار", "Вернуться к решению"],
  "flow.pendingHint": ["Bu ayın bekleyen kararını aç", "Open this month's pending decision", "Abrir la decisión pendiente de este mes", "Abrir a decisão pendente deste mês", "فتح قرار هذا الشهر المعلّق", "Открыть ожидающее решение этого месяца"],
  "visual.ruler": ["Hükümdar", "Ruler", "Gobernante", "Governante", "الحاكم", "Правитель"],
  "visual.talkTitle": ["Söyleyeceklerin", "What to say", "Qué decir", "O que dizer", "ما تود قوله", "Что сказать"],
  "flow.monthDecision": ["Bu Ayın Kararı", "This Month’s Decision", "La decisión de este mes", "A decisão deste mês", "قرار هذا الشهر", "Решение месяца"],
  "flow.anotherMonth": ["Bir Ay Daha", "Another Month", "Un mes más", "Mais um mês", "شهر آخر", "Ещё один месяц"],
  "flow.recent": ["Son Gelişmeler", "Recent Events", "Últimos acontecimientos", "Últimos acontecimentos", "آخر التطورات", "Последние события"],
  "flow.lifeBook": ["Yaşam Defteri", "Life Journal", "Diario de vida", "Diário da vida", "سجل الحياة", "Дневник жизни"]
};
export const FLOW_METIN = Object.fromEntries((["tr", "en", "es", "pt", "ar", "ru"] as Lang[]).map((lang, i) => [lang, Object.fromEntries(Object.entries(rows).map(([key, values]) => [key, values[i]]))])) as Record<Lang, Record<string, string>>;
