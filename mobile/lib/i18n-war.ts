import type { Lang } from "./locale-data";
const rows: Record<string, string[]> = {
  "cb.toparlan": [
    "Toparlan",
    "Recover",
    "Recuperar",
    "Recuperar",
    "التقاط الأنفاس",
    "Передышка"
  ],
  "war.breath": [
    "Nefes",
    "Stamina",
    "Resistencia",
    "Fôlego",
    "الطاقة",
    "Выносливость"
  ],
  "war.cost": [
    "−%1 nefes",
    "−%1 stamina",
    "−%1 resistencia",
    "−%1 fôlego",
    "−%1 طاقة",
    "−%1 выносливости"
  ],
  "war.momentum": [
    "Üstünlük %1/3",
    "Momentum %1/3",
    "Ventaja %1/3",
    "Vantagem %1/3",
    "الزخم %1/3",
    "Натиск %1/3"
  ],
  "war.predictable": [
    "Tekrarını okuyor; hamleni değiştir.",
    "Your pattern is showing. Change your move.",
    "Lee tu patrón. Cambia de movimiento.",
    "O padrão ficou claro. Muda o golpe.",
    "الخصم يقرأ نمطك؛ غيّر الحركة.",
    "Враг читает ваш рисунок боя. Смените приём."
  ],
  "war.log.exhausted": [
    "Nefesin yetmedi: vuruşun zayıfladı, savunman açıldı.",
    "Too tired: weaker strike, exposed defence.",
    "Sin aliento: golpe débil y defensa abierta.",
    "Sem fôlego: golpe fraco e defesa exposta.",
    "الطاقة لا تكفي: ضربة أضعف ودفاع مكشوف.",
    "Сил не хватило: удар слабее, защита открыта."
  ],
  "war.log.recover": [
    "%1 nefes topladın; rakip %2 hasar verdi.",
    "Recovered %1 stamina; the enemy dealt %2 damage.",
    "Recuperaste %1 de resistencia; el rival causó %2 de daño.",
    "Recuperação de %1 de fôlego; o inimigo causou %2 de dano.",
    "استعدت %1 طاقة؛ ألحق الخصم %2 ضررًا.",
    "Восстановлено %1 выносливости; враг нанёс %2 урона."
  ],
  "war.soldier": [
    "Askerlik: Meslek ekranından Asker yoluna gir. Talim, teçhizat ve cephe desteği savaş becerini geliştirir.",
    "Military service: choose Soldier in Professions. Training, equipment and front-line duty develop your combat ability.",
    "Elige Soldado en Profesiones. El entrenamiento, el equipo y el servicio en el frente desarrollan el combate.",
    "Escolhe Soldado em Profissões. Treino, equipamento e serviço na frente desenvolvem o combate.",
    "اختر مهنة الجندي من شاشة المهن. التدريب والتجهيز والخدمة في الجبهة تطوّر القدرة القتالية.",
    "Выберите солдата в разделе профессий. Тренировки, снаряжение и служба на фронте развивают боевые навыки."
  ],
  "war.policy.title": [
    "Devlet siyaseti",
    "State policy",
    "Política del reino",
    "Política do reino",
    "سياسة الدولة",
    "Курс государства"
  ],
  "war.policy.denge": [
    "Denge",
    "Balance",
    "Equilibrio",
    "Equilíbrio",
    "التوازن",
    "Равновесие"
  ],
  "war.policy.refah": [
    "Refah",
    "Welfare",
    "Bienestar",
    "Bem-estar",
    "الرفاه",
    "Благосостояние"
  ],
  "war.policy.sefer": [
    "Seferberlik",
    "Mobilisation",
    "Movilización",
    "Mobilização",
    "التعبئة",
    "Мобилизация"
  ],
  "war.policy.d.denge": [
    "Tam haraç geliri; ek otorite veya sefer katkısı yok.",
    "Full tribute income; no additional authority or campaign bonus.",
    "Tributo completo; sin bonificación de autoridad ni campaña.",
    "Tributo completo; sem bónus de autoridade ou campanha.",
    "دخل الجزية كامل؛ دون مكافأة للسلطة أو الحملة.",
    "Полная дань; без прибавки к власти и походам."
  ],
  "war.policy.d.refah": [
    "Haraç −20%; halk desteği otoritenin toparlanmasını güçlendirir.",
    "Tribute −20%; public support helps authority recover.",
    "Tributo −20%; el apoyo popular favorece la autoridad.",
    "Tributo −20%; o apoio popular ajuda a recuperar autoridade.",
    "الجزية −20٪؛ دعم السكان يساعد على استعادة السلطة.",
    "Дань −20%; поддержка населения помогает восстанавливать власть."
  ],
  "war.policy.d.sefer": [
    "Haraç −15%; sefer şansı +7 puan, otorite üzerinde ek baskı.",
    "Tribute −15%; campaign chance +7 points, extra pressure on authority.",
    "Tributo −15%; campaña +7 puntos, más presión sobre la autoridad.",
    "Tributo −15%; campanha +7 pontos, maior pressão na autoridade.",
    "الجزية −15٪؛ فرصة الحملة +7 نقاط مع ضغط إضافي على السلطة.",
    "Дань −15%; шанс похода +7 пунктов, дополнительное давление на власть."
  ],
  "war.policy.changed": [
    "Devlet siyaseti: %1. Bu ayki taht eylemi kullanıldı.",
    "State policy: %1. This month's royal action is spent.",
    "Política: %1. Se consumió la acción real del mes.",
    "Política: %1. A ação real deste mês foi usada.",
    "سياسة الدولة: %1. استُخدم إجراء الحكم لهذا الشهر.",
    "Курс государства: %1. Действие правителя в этом месяце использовано."
  ],
  "war.treaty.title": [
    "Diplomasi",
    "Diplomacy",
    "Diplomacia",
    "Diplomacia",
    "الدبلوماسية",
    "Дипломатия"
  ],
  "war.treaty.ticaret": [
    "Ticaret ahdi",
    "Trade pact",
    "Pacto comercial",
    "Pacto comercial",
    "ميثاق تجاري",
    "Торговый договор"
  ],
  "war.treaty.ateskes": [
    "Ateşkes",
    "Truce",
    "Tregua",
    "Trégua",
    "هدنة",
    "Перемирие"
  ],
  "war.treaty.d.ticaret": [
    "12 ay saldırmazlık; bu beyliğe giden kervanın getiri çarpanına +0,06 ve yolda daha az baskın riski.",
    "12 months of non-aggression; caravans to this realm gain +0.06 return multiplier and safer passage.",
    "12 meses sin agresión; las caravanas a este reino ganan +0,06 al multiplicador de retorno y un paso más seguro.",
    "12 meses sem agressão; caravanas para este reino ganham +0,06 no multiplicador de retorno e passagem mais segura.",
    "عدم اعتداء 12 شهرًا؛ معامل عائد القوافل إلى هذه الإمارة +0.06 وعبور أكثر أمانًا.",
    "Ненападение на 12 месяцев; множитель выручки караванов в это княжество +0,06 и более безопасный путь."
  ],
  "war.treaty.d.ateskes": [
    "12 ay saldırmazlık ve daha güvenli geçiş. Elçilik bedeli sonuçtan bağımsız ödenir.",
    "12 months of non-aggression and safer passage. Embassy costs are paid even if refused.",
    "12 meses sin agresión y paso más seguro. La embajada se paga incluso si fracasa.",
    "12 meses sem agressão e passagem mais segura. A missão é paga mesmo em caso de recusa.",
    "عدم اعتداء وعبور أكثر أمانًا 12 شهرًا. تُدفع كلفة السفارة حتى عند الرفض.",
    "Ненападение и более безопасный путь на 12 месяцев. Посольство оплачивается и при отказе."
  ],
  "war.treaty.btn": [
    "Elçi gönder",
    "Send embassy",
    "Enviar embajada",
    "Enviar embaixada",
    "إرسال سفارة",
    "Отправить посольство"
  ],
  "war.treaty.active": [
    "%1 · %2 ay kaldı",
    "%1 · %2 months left",
    "%1 · quedan %2 meses",
    "%1 · restam %2 meses",
    "%1 · متبقٍ %2 شهرًا",
    "%1 · осталось %2 мес."
  ],
  "war.treaty.success": [
    "Elçiler anlaşmayla döndü. Süresi boyunca bu beyliğe sefer ve haraç talebi kapalı.",
    "The embassy secured an agreement. Campaigns and tribute demands are blocked for its duration.",
    "La embajada logró un acuerdo. No podrás atacar ni exigir tributo mientras siga vigente.",
    "A embaixada conseguiu um acordo. Campanhas e exigências de tributo ficam bloqueadas durante a vigência.",
    "نجحت السفارة في الاتفاق. تُمنع الحملات وطلبات الجزية طوال مدته.",
    "Посольство заключило договор. Походы и требования дани запрещены до его окончания."
  ],
  "war.treaty.fail": [
    "Anlaşma sağlanamadı; elçilik bedeli harcandı.",
    "No agreement; the embassy cost was spent.",
    "Sin acuerdo; se gastó el coste de la embajada.",
    "Sem acordo; o custo da missão foi gasto.",
    "لم يُبرم اتفاق؛ صُرفت كلفة السفارة.",
    "Договор не заключён; расходы на посольство потрачены."
  ],
  "war.treaty.event.ticaret": [
    "%1 ile %2 aylık ticaret ve saldırmazlık ahdi kuruldu.",
    "A %2-month trade and non-aggression pact was signed with %1.",
    "Se firmó un pacto comercial y de no agresión de %2 meses con %1.",
    "Foi assinado um pacto comercial e de não agressão de %2 meses com %1.",
    "أُبرم مع %1 ميثاق تجاري وعدم اعتداء لمدة %2 شهرًا.",
    "С %1 заключён договор о торговле и ненападении на %2 мес."
  ],
  "war.treaty.event.ateskes": [
    "%1 ile %2 aylık ateşkes imzalandı.",
    "A %2-month truce was signed with %1.",
    "Se firmó una tregua de %2 meses con %1.",
    "Foi assinada uma trégua de %2 meses com %1.",
    "وُقّعت هدنة مع %1 لمدة %2 شهرًا.",
    "С %1 заключено перемирие на %2 мес."
  ],
  "war.treaty.refused": [
    "%1 elçiliğin teklifini reddetti.",
    "%1 refused the embassy's proposal.",
    "%1 rechazó la propuesta de la embajada.",
    "%1 recusou a proposta da embaixada.",
    "رفضت %1 اقتراح السفارة.",
    "%1 отклонило предложение посольства."
  ],
  "war.order.ikmal": [
    "İkmal",
    "Resupply",
    "Abastecer",
    "Reabastecer",
    "تموين",
    "Снабжение"
  ],
  "war.order.kesif": [
    "Keşif",
    "Scout",
    "Explorar",
    "Reconhecer",
    "استطلاع",
    "Разведка"
  ],
  "war.order.hucum": [
    "Hücum",
    "Assault",
    "Asalto",
    "Assalto",
    "هجوم",
    "Штурм"
  ],
  "war.order.d.ikmal": [
    "Erzak +35. Her ilerleyen ay 20 erzak tüketilir.",
    "Supplies +35. Each advancing month consumes 20.",
    "Suministros +35. Cada mes consume 20.",
    "Mantimentos +35. Cada mês consome 20.",
    "المؤن +35. يُستهلك 20 مع كل شهر.",
    "Припасы +35. Каждый месяц расходуется 20."
  ],
  "war.order.d.kesif": [
    "Üstünlük +3; sıradaki yürüyüş/kuşatma olayının iyi gelme şansı artar.",
    "Edge +3; improves the next march or siege event.",
    "Ventaja +3; mejora el próximo evento de marcha o asedio.",
    "Vantagem +3; melhora o próximo evento de marcha ou cerco.",
    "أفضلية +3؛ يزيد احتمال حدث جيد في المسير أو الحصار التالي.",
    "Преимущество +3; улучшает исход следующего события марша или осады."
  ],
  "war.order.d.hucum": [
    "Üstünlük +7; erzak −20, sağlık −3. En az 25 erzak ve 8 sağlık gerekir.",
    "Edge +7; supplies −20, health −3. Requires 25 supplies and 8 health.",
    "Ventaja +7; suministros −20, salud −3. Requiere 25 suministros y 8 de salud.",
    "Vantagem +7; mantimentos −20, saúde −3. Exige 25 mantimentos e 8 de saúde.",
    "أفضلية +7؛ المؤن −20 والصحة −3. يتطلب 25 مؤنًا و8 صحة.",
    "Преимущество +7; припасы −20, здоровье −3. Нужно 25 припасов и 8 здоровья."
  ],
  "war.order.done": [
    "Sefer emri: %1 (−%2 akçe). Bu ay başka emir verilemez.",
    "Campaign order: %1 (−%2 coins). No further order this month.",
    "Orden: %1 (−%2 monedas). No habrá otra este mes.",
    "Ordem: %1 (−%2 moedas). Sem outra ordem este mês.",
    "أمر الحملة: %1 (−%2 قطعة). لا أمر آخر هذا الشهر.",
    "Приказ в походе: %1 (−%2 монет). Других приказов в этом месяце нет."
  ],
  "war.supply": [
    "Erzak %1/100",
    "Supplies %1/100",
    "Suministros %1/100",
    "Mantimentos %1/100",
    "المؤن %1/100",
    "Припасы %1/100"
  ],
  "war.supply.low": [
    "Erzak 25'in altına düştü; aç ordu sefer üstünlüğünden 5 puan kaybetti.",
    "Supplies fell below 25; the hungry army lost 5 edge.",
    "Los suministros bajaron de 25; el ejército perdió 5 de ventaja.",
    "Os mantimentos caíram abaixo de 25; o exército perdeu 5 de vantagem.",
    "انخفضت المؤن دون 25؛ خسر الجيش الجائع 5 نقاط أفضلية.",
    "Припасы ниже 25; голодная армия потеряла 5 пунктов преимущества."
  ],
  "war.forecast": [
    "Göreli ordu gücü payı: %1",
    "Relative army strength share: %1",
    "Proporción de fuerza militar: %1",
    "Proporção da força militar: %1",
    "حصة القوة النسبية للجيش: %1",
    "Доля относительной силы войска: %1"
  ]
};
export const WAR_METIN = Object.fromEntries((["tr", "en", "es", "pt", "ar", "ru"] as Lang[]).map((lang, i) => [lang, Object.fromEntries(Object.entries(rows).map(([key, values]) => [key, values[i]]))])) as Record<Lang, Record<string, string>>;
