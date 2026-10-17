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

const investigation: Record<Lang, D> = {
  tr: {
    "crime.investigation.title":"Açık soruşturma", "crime.investigation.investigator":"Dosyayı yürüten: %1", "crime.investigation.summary":"Delil %1 · hükme yaklaşık %2 ay", "crime.investigation.case":"%1 · %2 yaşayan görgü tanığı",
    "crime.investigation.misdirect":"Sahte iz bırak · başarı %1", "crime.investigation.misdirect.d":"Bu ay suç hakkını kullanır; başarı delili zayıflatır, başarısızlık dosyayı güçlendirir.",
    "crime.investigation.opened":"%1, %2 izlerini toplamaya başladı; kaçtın ama dosya kapanmadı. Yaklaşık %3 ayın var.", "crime.investigation.deepened":"Yeni iş eski dosyaya eklendi; soruşturma hızlandı.",
    "crime.investigation.closed":"%1 izleri birleştiremedi; dosya kapandı.", "crime.investigation.replaced":"%1 yarım kalan dosyayı devraldı; izlerin bir kısmı kayboldu.", "crime.investigation.near":"%1 tanıkları yeniden çağırdı; dosya hükme yaklaşıyor.",
    "crime.investigation.failed":"%1 şüpheyi ispata çeviremedi; dosya düştü.", "crime.investigation.court":"%1, %2 dosyasını kadıya taşıdı; bu kez kaçacak sokak yok.",
    "crime.investigation.misdirectWin":"Sahte izi başka sokağa sürdün; dosyanın delili %1 zayıfladı.", "crime.investigation.misdirectLose":"Sahte iz çözüldü; soruşturmacı artık seni daha yakından izliyor.",
    "crime.layLow.done.case":"Bir ay başını eğdin; zaptiye izi %1, dosyanın delili %2 azaldı.",
  },
  en: {
    "crime.investigation.title":"Open investigation", "crime.investigation.investigator":"Investigator: %1", "crime.investigation.summary":"Evidence %1 · judgment in about %2 months", "crime.investigation.case":"%1 · %2 living eyewitnesses",
    "crime.investigation.misdirect":"Plant a false trail · %1 success", "crime.investigation.misdirect.d":"Uses this month's crime action; success weakens evidence, failure strengthens the case.",
    "crime.investigation.opened":"%1 began collecting traces from %2; you escaped, but the case remains open. You have about %3 months.", "crime.investigation.deepened":"The new offense was added to the old file; the investigation accelerated.",
    "crime.investigation.closed":"%1 could not connect the traces; the case was closed.", "crime.investigation.replaced":"%1 took over the unfinished case; some traces were lost.", "crime.investigation.near":"%1 recalled the witnesses; the case is nearing judgment.",
    "crime.investigation.failed":"%1 could not turn suspicion into proof; the case collapsed.", "crime.investigation.court":"%1 brought the %2 case before the judge; there is no alley to escape through this time.",
    "crime.investigation.misdirectWin":"You led the false trail into another street; evidence fell by %1.", "crime.investigation.misdirectLose":"The false trail was exposed; the investigator is watching you more closely.",
    "crime.layLow.done.case":"You kept your head down for a month; pursuit fell by %1 and case evidence by %2.",
  },
  es: {
    "crime.investigation.title":"Investigación abierta", "crime.investigation.investigator":"Investigador: %1", "crime.investigation.summary":"Prueba %1 · fallo en unos %2 meses", "crime.investigation.case":"%1 · %2 testigos vivos",
    "crime.investigation.misdirect":"Dejar una pista falsa · %1 de éxito", "crime.investigation.misdirect.d":"Consume la acción criminal del mes; el éxito debilita las pruebas y el fracaso refuerza la causa.",
    "crime.investigation.opened":"%1 empezó a reunir huellas de %2; escapaste, pero la causa sigue abierta. Tienes unos %3 meses.", "crime.investigation.deepened":"El nuevo delito se añadió al expediente anterior; la investigación se aceleró.",
    "crime.investigation.closed":"%1 no pudo unir las huellas; la causa se cerró.", "crime.investigation.replaced":"%1 asumió la causa inconclusa; se perdieron algunas huellas.", "crime.investigation.near":"%1 volvió a llamar a los testigos; la causa se acerca al fallo.",
    "crime.investigation.failed":"%1 no convirtió la sospecha en prueba; la causa cayó.", "crime.investigation.court":"%1 llevó la causa de %2 ante el juez; esta vez no hay callejón para huir.",
    "crime.investigation.misdirectWin":"Desviaste la pista falsa a otra calle; las pruebas bajaron %1.", "crime.investigation.misdirectLose":"Descubrieron la pista falsa; el investigador te vigila más de cerca.",
    "crime.layLow.done.case":"Te ocultaste un mes; la persecución bajó %1 y las pruebas %2.",
  },
  pt: {
    "crime.investigation.title":"Investigação aberta", "crime.investigation.investigator":"Investigador: %1", "crime.investigation.summary":"Prova %1 · sentença em cerca de %2 meses", "crime.investigation.case":"%1 · %2 testemunhas vivas",
    "crime.investigation.misdirect":"Deixar uma pista falsa · %1 de êxito", "crime.investigation.misdirect.d":"Gasta a ação criminosa do mês; o sucesso enfraquece a prova e o fracasso reforça o processo.",
    "crime.investigation.opened":"%1 começou a recolher vestígios de %2; escapaste, mas o processo continua aberto. Tens cerca de %3 meses.", "crime.investigation.deepened":"O novo crime foi acrescentado ao processo antigo; a investigação acelerou.",
    "crime.investigation.closed":"%1 não conseguiu ligar os vestígios; o processo foi encerrado.", "crime.investigation.replaced":"%1 assumiu o processo inacabado; perderam-se alguns vestígios.", "crime.investigation.near":"%1 voltou a chamar as testemunhas; o processo aproxima-se da sentença.",
    "crime.investigation.failed":"%1 não transformou suspeita em prova; o processo caiu.", "crime.investigation.court":"%1 levou o processo de %2 ao juiz; desta vez não há beco para fugir.",
    "crime.investigation.misdirectWin":"Levaste a pista falsa para outra rua; a prova caiu %1.", "crime.investigation.misdirectLose":"A pista falsa foi descoberta; o investigador vigia-te mais de perto.",
    "crime.layLow.done.case":"Escondeste-te por um mês; a perseguição caiu %1 e a prova %2.",
  },
  ar: {
    "crime.investigation.title":"تحقيق مفتوح", "crime.investigation.investigator":"المحقق: %1", "crime.investigation.summary":"الدليل %1 · الحكم بعد نحو %2 شهر", "crime.investigation.case":"%1 · شهود أحياء %2",
    "crime.investigation.misdirect":"اترك أثرًا زائفًا · النجاح %1", "crime.investigation.misdirect.d":"يستهلك فعل الجريمة لهذا الشهر؛ النجاح يضعف الدليل والفشل يقوي القضية.",
    "crime.investigation.opened":"بدأ %1 جمع آثار %2؛ أفلتّ لكن القضية بقيت مفتوحة. أمامك نحو %3 شهر.", "crime.investigation.deepened":"أضيفت الجريمة الجديدة إلى الملف القديم فتسارع التحقيق.",
    "crime.investigation.closed":"عجز %1 عن وصل الآثار فأغلق الملف.", "crime.investigation.replaced":"تولى %1 الملف الناقص وضاع بعض الأثر.", "crime.investigation.near":"استدعى %1 الشهود ثانية واقترب الملف من الحكم.",
    "crime.investigation.failed":"عجز %1 عن تحويل الشبهة إلى بينة فسقطت القضية.", "crime.investigation.court":"رفع %1 ملف %2 إلى القاضي؛ لا زقاق للهرب هذه المرة.",
    "crime.investigation.misdirectWin":"قدت الأثر الزائف إلى شارع آخر؛ نقص الدليل %1.", "crime.investigation.misdirectLose":"انكشف الأثر الزائف؛ المحقق يراقبك عن قرب.",
    "crime.layLow.done.case":"تواريت شهرًا؛ انخفضت المطاردة %1 والدليل %2.",
  },
  ru: {
    "crime.investigation.title":"Открытое расследование", "crime.investigation.investigator":"Дело ведёт: %1", "crime.investigation.summary":"Улики %1 · решение примерно через %2 мес.", "crime.investigation.case":"%1 · живых очевидцев: %2",
    "crime.investigation.misdirect":"Оставить ложный след · успех %1", "crime.investigation.misdirect.d":"Расходует преступное действие месяца; успех ослабит улики, провал усилит дело.",
    "crime.investigation.opened":"%1 начал собирать следы по делу %2; ты ушёл, но дело осталось открытым. Около %3 мес. в запасе.", "crime.investigation.deepened":"Новое преступление добавили к старому делу; расследование ускорилось.",
    "crime.investigation.closed":"%1 не смог связать следы; дело закрыто.", "crime.investigation.replaced":"%1 принял незаконченное дело; часть следов потерялась.", "crime.investigation.near":"%1 вновь вызвал свидетелей; дело близится к решению.",
    "crime.investigation.failed":"%1 не превратил подозрение в доказательство; дело развалилось.", "crime.investigation.court":"%1 передал дело %2 кадию; на этот раз бежать некуда.",
    "crime.investigation.misdirectWin":"Ты увёл ложный след на другую улицу; улики ослабли на %1.", "crime.investigation.misdirectLose":"Ложный след раскрыт; следователь наблюдает за тобой внимательнее.",
    "crime.layLow.done.case":"Ты затаился на месяц; погоня ослабла на %1, а улики на %2.",
  },
};

export const CRIME_COURT_METIN: Record<Lang, D> = {
  tr: { ...tr, ...investigation.tr }, en: { ...en, ...investigation.en }, es: { ...es, ...investigation.es },
  pt: { ...pt, ...investigation.pt }, ar: { ...ar, ...investigation.ar }, ru: { ...ru, ...investigation.ru },
};
