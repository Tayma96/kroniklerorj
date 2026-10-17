import type { Lang } from "./locale-data";

type D = Record<string, string>;

const tr: D = {
  "trial.text":"Zaptiye seni kürsünün önüne bıraktı. Kadı mağduru, görgü tanıklarını ve toplanan izleri dinleyecek; vereceğin karar dosyanın ağırlığına karşı sınanacak.",
  "trial.case":"Dosya: %1 delil · %2 görgü tanığı", "trial.case.people":"İddia tanıkları: %1", "trial.case.victim":"Mağdur: %1",
  "trial.level.weak":"zayıf", "trial.level.medium":"orta", "trial.level.strong":"kuvvetli",
  "trial.defBtn.odds":"Kendini savun · başarı %1", "trial.witBtn.named":"%1'i lehine çağır · başarı %2", "trial.witBtn.none":"Lehine konuşacak yaşayan bir dost yok",
  "trial.settleBtn":"Mağdurun zararını karşıla · %1 akçe", "trial.settle.noFunds":"Uzlaşma için %1 akçe gerekiyor", "trial.bowBtn":"Hükme boyun eğ",
  "trial.witWin.named":"%1 kadı önünde lehine tanıklık etti; beraat ettin. Bu borç unutulmaz.", "trial.witLose.named":"%1'in sözü kadıyı kesmedi; hüküm okundu.",
  "trial.settle.done":"%1'in zararını %2 akçeyle karşıladın; kadı dosyayı kapattı.",
};
const en: D = {
  "trial.text":"The bailiff sets you before the bench. The judge will hear the victim, eyewitnesses and gathered traces; your choice will be tested against the weight of the case.",
  "trial.case":"Case: %1 evidence · %2 eyewitnesses", "trial.case.people":"Prosecution witnesses: %1", "trial.case.victim":"Victim: %1",
  "trial.level.weak":"weak", "trial.level.medium":"moderate", "trial.level.strong":"strong",
  "trial.defBtn.odds":"Defend yourself · %1 success", "trial.witBtn.named":"Call %1 for your defense · %2 success", "trial.witBtn.none":"No living friend will speak for you",
  "trial.settleBtn":"Make restitution to the victim · %1 coins", "trial.settle.noFunds":"Restitution requires %1 coins", "trial.bowBtn":"Submit to judgment",
  "trial.witWin.named":"%1 testified for you before the judge; you were acquitted. Such a debt is not forgotten.", "trial.witLose.named":"%1's word did not sway the judge; the sentence was read.",
  "trial.settle.done":"You paid %2 coins to repair %1's loss; the judge closed the case.",
};
const es: D = {
  "trial.text":"El alguacil te deja ante el estrado. El juez oirá a la víctima, a los testigos y las huellas reunidas; tu decisión se medirá contra el peso del caso.",
  "trial.case":"Causa: prueba %1 · %2 testigos", "trial.case.people":"Testigos de la acusación: %1", "trial.case.victim":"Víctima: %1",
  "trial.level.weak":"débil", "trial.level.medium":"media", "trial.level.strong":"fuerte",
  "trial.defBtn.odds":"Defiéndete · %1 de éxito", "trial.witBtn.named":"Llama a %1 en tu defensa · %2 de éxito", "trial.witBtn.none":"Ningún amigo vivo hablará por ti",
  "trial.settleBtn":"Repara el daño de la víctima · %1 monedas", "trial.settle.noFunds":"El acuerdo requiere %1 monedas", "trial.bowBtn":"Acata el fallo",
  "trial.witWin.named":"%1 testificó a tu favor ante el juez; quedaste absuelto. Esa deuda no se olvida.", "trial.witLose.named":"La palabra de %1 no convenció al juez; se leyó la sentencia.",
  "trial.settle.done":"Pagaste %2 monedas para reparar el daño de %1; el juez cerró la causa.",
};
const pt: D = {
  "trial.text":"O oficial põe-te perante o estrado. O juiz ouvirá a vítima, as testemunhas e os indícios reunidos; a tua decisão será pesada contra o processo.",
  "trial.case":"Processo: prova %1 · %2 testemunhas", "trial.case.people":"Testemunhas da acusação: %1", "trial.case.victim":"Vítima: %1",
  "trial.level.weak":"fraca", "trial.level.medium":"média", "trial.level.strong":"forte",
  "trial.defBtn.odds":"Defende-te · %1 de êxito", "trial.witBtn.named":"Chama %1 em tua defesa · %2 de êxito", "trial.witBtn.none":"Nenhum amigo vivo falará por ti",
  "trial.settleBtn":"Repara o dano da vítima · %1 moedas", "trial.settle.noFunds":"O acordo requer %1 moedas", "trial.bowBtn":"Acata a sentença",
  "trial.witWin.named":"%1 testemunhou a teu favor perante o juiz; foste absolvido. Essa dívida não se esquece.", "trial.witLose.named":"A palavra de %1 não convenceu o juiz; a sentença foi lida.",
  "trial.settle.done":"Pagaste %2 moedas para reparar o dano de %1; o juiz encerrou o processo.",
};
const ar: D = {
  "trial.text":"وضعك الشرطي أمام القاضي. سيستمع إلى المجني عليه وشهود العيان وقرائن القضية، وسيزن قرارك بقوة الملف.",
  "trial.case":"الملف: دليل %1 · شهود العيان %2", "trial.case.people":"شهود الاتهام: %1", "trial.case.victim":"المجني عليه: %1",
  "trial.level.weak":"ضعيف", "trial.level.medium":"متوسط", "trial.level.strong":"قوي",
  "trial.defBtn.odds":"دافع عن نفسك · النجاح %1", "trial.witBtn.named":"استدعِ %1 للدفاع · النجاح %2", "trial.witBtn.none":"لا صديق حي يشهد لصالحك",
  "trial.settleBtn":"عوّض المجني عليه · %1 قطعة", "trial.settle.noFunds":"تحتاج التسوية إلى %1 قطعة", "trial.bowBtn":"اخضع للحكم",
  "trial.witWin.named":"شهد %1 لصالحك أمام القاضي فبرئت؛ ودين كهذا لا ينسى.", "trial.witLose.named":"لم تقنع شهادة %1 القاضي؛ فصدر الحكم.",
  "trial.settle.done":"دفعت %2 قطعة لتعويض %1؛ فأغلق القاضي القضية.",
};
const ru: D = {
  "trial.text":"Пристав ставит тебя перед судом. Кадий выслушает потерпевшего и очевидцев, изучит следы; твой выбор столкнётся с весом дела.",
  "trial.case":"Дело: улика %1 · очевидцев %2", "trial.case.people":"Свидетели обвинения: %1", "trial.case.victim":"Потерпевший: %1",
  "trial.level.weak":"слабая", "trial.level.medium":"средняя", "trial.level.strong":"сильная",
  "trial.defBtn.odds":"Защищаться · успех %1", "trial.witBtn.named":"Позвать %1 в защиту · успех %2", "trial.witBtn.none":"Нет живого друга, готового выступить за тебя",
  "trial.settleBtn":"Возместить ущерб · %1 монет", "trial.settle.noFunds":"Для примирения нужно %1 монет", "trial.bowBtn":"Склониться перед приговором",
  "trial.witWin.named":"%1 выступил в твою защиту перед кадием; тебя оправдали. Такой долг не забывается.", "trial.witLose.named":"Слово %1 не убедило кадия; приговор был оглашён.",
  "trial.settle.done":"Ты выплатил %2 монет в возмещение ущерба %1; кадий закрыл дело.",
};

export const CRIME_COURT_METIN: Record<Lang, D> = { tr, en, es, pt, ar, ru };
