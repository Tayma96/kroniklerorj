import type { Lang } from "./locale-data";

type D = Record<string, string>;

// Eser adları çevrilmez: Selçuklu kültürüne ait özel ad olarak bütün dillerde korunur.
const ADLAR: D = {
  "se.yedi_yil_tohumu.n":"Yedi Yıl Tohumu", "se.sarnicli_harman.n":"Sarnıçlı Harman",
  "se.alaca_kilic.n":"Alaca Kılıç", "se.kirilmaz_saban.n":"Kırılmaz Saban",
  "se.kervan_ahitnamesi.n":"Kervan Ahitnamesi", "se.yedi_sehir_mizani.n":"Yedi Şehir Mizanı",
  "se.golun_gumus_agi.n":"Gölün Gümüş Ağı", "se.firtina_kayigi.n":"Fırtına Kayığı",
  "se.alaca_yay.n":"Alaca Yay", "se.izler_defteri.n":"İzler Defteri",
  "se.civisiz_sandik.n":"Çivisiz Usta Sandığı", "se.kervansaray_kapisi.n":"Kervansaray Kapısı",
  "se.ak_kece_surusu.n":"Ak Keçe Sürüsü", "se.canli_goc_yolu.n":"Çanlı Göç Yolu",
  "se.kirk_ocak_mayasi.n":"Kırk Ocak Mayası", "se.ahilik_somunu.n":"Ahilik Somunu",
  "se.uc_sancagi.n":"Uç Sancağı", "se.gazi_talimnamesi.n":"Gazi Talimnamesi",
  "se.kopuz_destani.n":"Kopuz Destanı", "se.yedi_makam_mecmuasi.n":"Yedi Makam Mecmuası",
  "se.sifa_mecmuasi.n":"Şifa Mecmuası", "se.darussifa_sandigi.n":"Darüşşifa Sandığı",
  "se.altin_muhurlu_vakfiye.n":"Altın Mühürlü Vakfiye", "se.yollar_sicili.n":"Yollar Sicili",
  "se.firuze_kemer.n":"Firuze Kakmalı Kemer", "se.cift_kartal_brosu.n":"Çift Kartallı Broş",
  "se.kubadabad_deseni.n":"Kubadabad Deseni", "se.kirk_boy_kilimi.n":"Kırk Boy Kilimi",
  "se.kervanlar_defteri.n":"Kervanlar Defteri", "se.acik_sofra_yemini.n":"Açık Sofra Yemini",
};
const EN_ADLAR: D = {
  "se.yedi_yil_tohumu.n":"Seven-Year Seed", "se.sarnicli_harman.n":"Cistern Threshing Floor", "se.alaca_kilic.n":"Dapple Blade", "se.kirilmaz_saban.n":"Unbreakable Plough",
  "se.kervan_ahitnamesi.n":"Caravan Covenant", "se.yedi_sehir_mizani.n":"Balance of Seven Cities", "se.golun_gumus_agi.n":"Silver Net of the Lake", "se.firtina_kayigi.n":"Storm Boat",
  "se.alaca_yay.n":"Dapple Bow", "se.izler_defteri.n":"Book of Tracks", "se.civisiz_sandik.n":"Nail-Free Master Chest", "se.kervansaray_kapisi.n":"Caravanserai Gate",
  "se.ak_kece_surusu.n":"White Felt Flock", "se.canli_goc_yolu.n":"Road of Bells", "se.kirk_ocak_mayasi.n":"Leaven of Forty Hearths", "se.ahilik_somunu.n":"Ahi Brotherhood Loaf",
  "se.uc_sancagi.n":"Frontier Banner", "se.gazi_talimnamesi.n":"Ghazi Drillbook", "se.kopuz_destani.n":"Epic of the Kopuz", "se.yedi_makam_mecmuasi.n":"Treatise of Seven Modes",
  "se.sifa_mecmuasi.n":"Book of Healing", "se.darussifa_sandigi.n":"House of Healing Chest", "se.altin_muhurlu_vakfiye.n":"Gold-Sealed Endowment Deed", "se.yollar_sicili.n":"Register of Roads",
  "se.firuze_kemer.n":"Turquoise-Inlaid Belt", "se.cift_kartal_brosu.n":"Double-Eagle Brooch", "se.kubadabad_deseni.n":"Kubadabad Pattern", "se.kirk_boy_kilimi.n":"Carpet of Forty Tribes",
  "se.kervanlar_defteri.n":"Caravan Ledger", "se.acik_sofra_yemini.n":"Oath of the Open Table",
};
const ES_ADLAR: D = {
  "se.yedi_yil_tohumu.n":"Semilla de Siete Años", "se.sarnicli_harman.n":"Era del Aljibe", "se.alaca_kilic.n":"Espada Jaspeada", "se.kirilmaz_saban.n":"Arado Irrompible",
  "se.kervan_ahitnamesi.n":"Pacto de la Caravana", "se.yedi_sehir_mizani.n":"Balanza de Siete Ciudades", "se.golun_gumus_agi.n":"Red de Plata del Lago", "se.firtina_kayigi.n":"Barca de la Tormenta",
  "se.alaca_yay.n":"Arco Jaspeado", "se.izler_defteri.n":"Libro de las Huellas", "se.civisiz_sandik.n":"Arcón del Maestro sin Clavos", "se.kervansaray_kapisi.n":"Puerta del Caravasar",
  "se.ak_kece_surusu.n":"Rebaño de Fieltro Blanco", "se.canli_goc_yolu.n":"Camino de las Campanas", "se.kirk_ocak_mayasi.n":"Levadura de Cuarenta Hogares", "se.ahilik_somunu.n":"Pan de la Hermandad Ahi",
  "se.uc_sancagi.n":"Estandarte de la Frontera", "se.gazi_talimnamesi.n":"Manual del Gazi", "se.kopuz_destani.n":"Epopeya del Kopuz", "se.yedi_makam_mecmuasi.n":"Tratado de Siete Modos",
  "se.sifa_mecmuasi.n":"Libro de la Curación", "se.darussifa_sandigi.n":"Arcón de la Casa de Salud", "se.altin_muhurlu_vakfiye.n":"Fundación de Sello Dorado", "se.yollar_sicili.n":"Registro de Caminos",
  "se.firuze_kemer.n":"Cinturón de Turquesas", "se.cift_kartal_brosu.n":"Broche del Águila Bicéfala", "se.kubadabad_deseni.n":"Diseño de Kubadabad", "se.kirk_boy_kilimi.n":"Tapiz de Cuarenta Tribus",
  "se.kervanlar_defteri.n":"Libro de las Caravanas", "se.acik_sofra_yemini.n":"Juramento de la Mesa Abierta",
};
const PT_ADLAR: D = {
  "se.yedi_yil_tohumu.n":"Semente de Sete Anos", "se.sarnicli_harman.n":"Eira da Cisterna", "se.alaca_kilic.n":"Espada Malhada", "se.kirilmaz_saban.n":"Arado Inquebrável",
  "se.kervan_ahitnamesi.n":"Pacto da Caravana", "se.yedi_sehir_mizani.n":"Balança de Sete Cidades", "se.golun_gumus_agi.n":"Rede de Prata do Lago", "se.firtina_kayigi.n":"Barca da Tempestade",
  "se.alaca_yay.n":"Arco Malhado", "se.izler_defteri.n":"Livro dos Rastros", "se.civisiz_sandik.n":"Arca do Mestre sem Pregos", "se.kervansaray_kapisi.n":"Porta do Caravançará",
  "se.ak_kece_surusu.n":"Rebanho de Feltro Branco", "se.canli_goc_yolu.n":"Caminho dos Sinos", "se.kirk_ocak_mayasi.n":"Fermento de Quarenta Lares", "se.ahilik_somunu.n":"Pão da Irmandade Ahi",
  "se.uc_sancagi.n":"Estandarte da Fronteira", "se.gazi_talimnamesi.n":"Manual do Gazi", "se.kopuz_destani.n":"Epopeia do Kopuz", "se.yedi_makam_mecmuasi.n":"Tratado dos Sete Modos",
  "se.sifa_mecmuasi.n":"Livro da Cura", "se.darussifa_sandigi.n":"Arca da Casa de Saúde", "se.altin_muhurlu_vakfiye.n":"Fundação de Selo Dourado", "se.yollar_sicili.n":"Registo das Estradas",
  "se.firuze_kemer.n":"Cinto de Turquesas", "se.cift_kartal_brosu.n":"Broche da Águia Bicéfala", "se.kubadabad_deseni.n":"Padrão de Kubadabad", "se.kirk_boy_kilimi.n":"Tapete de Quarenta Tribos",
  "se.kervanlar_defteri.n":"Livro das Caravanas", "se.acik_sofra_yemini.n":"Juramento da Mesa Aberta",
};
const AR_ADLAR: D = {
  "se.yedi_yil_tohumu.n":"بذرة الأعوام السبعة", "se.sarnicli_harman.n":"بيدر الصهريج", "se.alaca_kilic.n":"السيف الموشى", "se.kirilmaz_saban.n":"المحراث الذي لا ينكسر",
  "se.kervan_ahitnamesi.n":"عهد القافلة", "se.yedi_sehir_mizani.n":"ميزان المدن السبع", "se.golun_gumus_agi.n":"شبكة البحيرة الفضية", "se.firtina_kayigi.n":"قارب العاصفة",
  "se.alaca_yay.n":"القوس الموشى", "se.izler_defteri.n":"دفتر الآثار", "se.civisiz_sandik.n":"صندوق الأستاذ بلا مسامير", "se.kervansaray_kapisi.n":"باب الخان",
  "se.ak_kece_surusu.n":"قطيع اللباد الأبيض", "se.canli_goc_yolu.n":"طريق الأجراس", "se.kirk_ocak_mayasi.n":"خميرة الأربعين موقدًا", "se.ahilik_somunu.n":"رغيف أخوة الحرفة",
  "se.uc_sancagi.n":"راية الثغر", "se.gazi_talimnamesi.n":"دليل الغازي", "se.kopuz_destani.n":"ملحمة القوبوز", "se.yedi_makam_mecmuasi.n":"رسالة المقامات السبعة",
  "se.sifa_mecmuasi.n":"كتاب الشفاء", "se.darussifa_sandigi.n":"صندوق دار الشفاء", "se.altin_muhurlu_vakfiye.n":"وقفية الختم الذهبي", "se.yollar_sicili.n":"سجل الطرق",
  "se.firuze_kemer.n":"حزام مرصع بالفيروز", "se.cift_kartal_brosu.n":"مشبك النسر ذي الرأسين", "se.kubadabad_deseni.n":"نقش قباد آباد", "se.kirk_boy_kilimi.n":"بساط القبائل الأربعين",
  "se.kervanlar_defteri.n":"دفتر القوافل", "se.acik_sofra_yemini.n":"قسم المائدة المفتوحة",
};
const RU_ADLAR: D = {
  "se.yedi_yil_tohumu.n":"Семя семи лет", "se.sarnicli_harman.n":"Гумно у цистерны", "se.alaca_kilic.n":"Пёстрый клинок", "se.kirilmaz_saban.n":"Несокрушимый плуг",
  "se.kervan_ahitnamesi.n":"Караванный завет", "se.yedi_sehir_mizani.n":"Весы семи городов", "se.golun_gumus_agi.n":"Серебряная сеть озера", "se.firtina_kayigi.n":"Лодка бури",
  "se.alaca_yay.n":"Пёстрый лук", "se.izler_defteri.n":"Книга следов", "se.civisiz_sandik.n":"Сундук мастера без гвоздей", "se.kervansaray_kapisi.n":"Ворота караван-сарая",
  "se.ak_kece_surusu.n":"Стадо белого войлока", "se.canli_goc_yolu.n":"Дорога колокольцев", "se.kirk_ocak_mayasi.n":"Закваска сорока очагов", "se.ahilik_somunu.n":"Хлеб братства ахи",
  "se.uc_sancagi.n":"Знамя рубежа", "se.gazi_talimnamesi.n":"Наставление гази", "se.kopuz_destani.n":"Эпос кобыза", "se.yedi_makam_mecmuasi.n":"Трактат семи ладов",
  "se.sifa_mecmuasi.n":"Книга исцеления", "se.darussifa_sandigi.n":"Сундук дома врачевания", "se.altin_muhurlu_vakfiye.n":"Вакф с золотой печатью", "se.yollar_sicili.n":"Реестр дорог",
  "se.firuze_kemer.n":"Пояс с бирюзой", "se.cift_kartal_brosu.n":"Брошь с двуглавым орлом", "se.kubadabad_deseni.n":"Узор Кубадабада", "se.kirk_boy_kilimi.n":"Ковёр сорока племён",
  "se.kervanlar_defteri.n":"Книга караванов", "se.acik_sofra_yemini.n":"Клятва открытого стола",
};

const tr: D = { ...ADLAR,
  "se.title":"Hanedan Şaheseri", "se.intro":"Pirliğe ulaştın. Ömründe yalnız bir eser seçebilirsin; adı hanedan defterinde kalır ve sonraki kuşakları yetiştirir.", "se.choose":"Ömür eserini seç", "se.cost":"Yapım bedeli: %1 akçe", "se.done":"Bu ömrün şaheseri", "se.by":"%1 · %2. nesil", "se.legacy":"Soy izi", "se.made":"%1, ömrünün şaheseri %2'yi tamamladı.",
  "se.domain.bereket":"Bereket · sonraki vâris +50 akçe", "se.domain.zanaat":"Zanaat · sonraki vâris +1 zanaat", "se.domain.ticaret":"Ticaret · sonraki vâris +1 ticaret", "se.domain.savas":"Savaş · sonraki vâris +1 savaş", "se.domain.sosyal":"İtibar · sonraki vâris +3 itibar", "se.domain.saglik":"Direnç · sonraki vâris +1 özellik puanı",
};
const en: D = { ...EN_ADLAR,
  "se.title":"Dynasty Masterpiece", "se.intro":"You have reached the summit of your craft. Choose one life's work; its name will remain in the dynasty ledger and train future generations.", "se.choose":"Choose your life's work", "se.cost":"Making cost: %1 coins", "se.done":"This life's masterpiece", "se.by":"%1 · generation %2", "se.legacy":"Bloodline legacy", "se.made":"%1 completed the life's masterpiece %2.",
  "se.domain.bereket":"Plenty · next heir starts with +50 coins", "se.domain.zanaat":"Craft · next heir gains +1 crafting", "se.domain.ticaret":"Trade · next heir gains +1 trade", "se.domain.savas":"War · next heir gains +1 combat", "se.domain.sosyal":"Standing · next heir gains +3 reputation", "se.domain.saglik":"Vigor · next heir gains +1 attribute point",
};
const es: D = { ...ES_ADLAR,
  "se.title":"Obra maestra del linaje", "se.intro":"Has llegado a la cima del oficio. Elige una sola obra de vida; su nombre quedará en el libro del linaje y formará a futuras generaciones.", "se.choose":"Elige tu obra de vida", "se.cost":"Coste: %1 monedas", "se.done":"Obra maestra de esta vida", "se.by":"%1 · generación %2", "se.legacy":"Legado del linaje", "se.made":"%1 completó la obra de su vida: %2.",
  "se.domain.bereket":"Abundancia · el próximo heredero recibe +50 monedas", "se.domain.zanaat":"Oficio · el próximo heredero recibe +1 artesanía", "se.domain.ticaret":"Comercio · el próximo heredero recibe +1 comercio", "se.domain.savas":"Guerra · el próximo heredero recibe +1 combate", "se.domain.sosyal":"Prestigio · el próximo heredero recibe +3 reputación", "se.domain.saglik":"Vigor · el próximo heredero recibe +1 punto de atributo",
};
const pt: D = { ...PT_ADLAR,
  "se.title":"Obra-prima da linhagem", "se.intro":"Chegaste ao cume do ofício. Escolhe uma única obra de vida; o nome ficará no livro da linhagem e formará as gerações futuras.", "se.choose":"Escolhe a tua obra de vida", "se.cost":"Custo: %1 moedas", "se.done":"Obra-prima desta vida", "se.by":"%1 · geração %2", "se.legacy":"Legado da linhagem", "se.made":"%1 concluiu a obra da sua vida: %2.",
  "se.domain.bereket":"Abundância · o próximo herdeiro recebe +50 moedas", "se.domain.zanaat":"Ofício · o próximo herdeiro recebe +1 artesanato", "se.domain.ticaret":"Comércio · o próximo herdeiro recebe +1 comércio", "se.domain.savas":"Guerra · o próximo herdeiro recebe +1 combate", "se.domain.sosyal":"Prestígio · o próximo herdeiro recebe +3 reputação", "se.domain.saglik":"Vigor · o próximo herdeiro recebe +1 ponto de atributo",
};
const ar: D = { ...AR_ADLAR,
  "se.title":"تحفة السلالة", "se.intro":"بلغت ذروة حرفتك. اختر أثر عمر واحدًا؛ يبقى اسمه في سجل السلالة ويعلّم الأجيال التالية.", "se.choose":"اختر أثر عمرك", "se.cost":"كلفة الصنع: %1 قطعة", "se.done":"تحفة هذا العمر", "se.by":"%1 · الجيل %2", "se.legacy":"أثر السلالة", "se.made":"أتمّ %1 تحفة عمره %2.",
  "se.domain.bereket":"البركة · يبدأ الوارث التالي ومعه 50 قطعة إضافية", "se.domain.zanaat":"الصنعة · يكسب الوارث التالي +1 حرفة", "se.domain.ticaret":"التجارة · يكسب الوارث التالي +1 تجارة", "se.domain.savas":"القتال · يكسب الوارث التالي +1 قتال", "se.domain.sosyal":"السمعة · يكسب الوارث التالي +3 سمعة", "se.domain.saglik":"القوة · يكسب الوارث التالي نقطة صفة إضافية",
};
const ru: D = { ...RU_ADLAR,
  "se.title":"Шедевр династии", "se.intro":"Ты достиг вершины ремесла. Выбери один труд жизни; его имя останется в летописи рода и будет учить будущие поколения.", "se.choose":"Выбери труд жизни", "se.cost":"Стоимость: %1 монет", "se.done":"Шедевр этой жизни", "se.by":"%1 · поколение %2", "se.legacy":"Наследие рода", "se.made":"%1 завершил труд жизни — %2.",
  "se.domain.bereket":"Достаток · следующий наследник получает +50 монет", "se.domain.zanaat":"Ремесло · следующий наследник получает +1 к ремеслу", "se.domain.ticaret":"Торговля · следующий наследник получает +1 к торговле", "se.domain.savas":"Война · следующий наследник получает +1 к бою", "se.domain.sosyal":"Почёт · следующий наследник получает +3 к репутации", "se.domain.saglik":"Стойкость · следующий наследник получает +1 очко свойства",
};

export const SAHESER_METIN: Record<Lang, D> = { tr, en, es, pt, ar, ru };
