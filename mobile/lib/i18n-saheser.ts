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

const tr: D = { ...ADLAR,
  "se.title":"Hanedan Şaheseri", "se.intro":"Pirliğe ulaştın. Ömründe yalnız bir eser seçebilirsin; adı hanedan defterinde kalır ve sonraki kuşakları yetiştirir.", "se.choose":"Ömür eserini seç", "se.cost":"Yapım bedeli: %1 akçe", "se.done":"Bu ömrün şaheseri", "se.by":"%1 · %2. nesil", "se.legacy":"Soy izi", "se.made":"%1, ömrünün şaheseri %2'yi tamamladı.",
  "se.domain.bereket":"Bereket · sonraki vâris +50 akçe", "se.domain.zanaat":"Zanaat · sonraki vâris +1 zanaat", "se.domain.ticaret":"Ticaret · sonraki vâris +1 ticaret", "se.domain.savas":"Savaş · sonraki vâris +1 savaş", "se.domain.sosyal":"İtibar · sonraki vâris +3 itibar", "se.domain.saglik":"Direnç · sonraki vâris +1 özellik puanı",
};
const en: D = { ...ADLAR,
  "se.title":"Dynasty Masterpiece", "se.intro":"You have reached the summit of your craft. Choose one life's work; its name will remain in the dynasty ledger and train future generations.", "se.choose":"Choose your life's work", "se.cost":"Making cost: %1 coins", "se.done":"This life's masterpiece", "se.by":"%1 · generation %2", "se.legacy":"Bloodline legacy", "se.made":"%1 completed the life's masterpiece %2.",
  "se.domain.bereket":"Plenty · next heir starts with +50 coins", "se.domain.zanaat":"Craft · next heir gains +1 crafting", "se.domain.ticaret":"Trade · next heir gains +1 trade", "se.domain.savas":"War · next heir gains +1 combat", "se.domain.sosyal":"Standing · next heir gains +3 reputation", "se.domain.saglik":"Vigor · next heir gains +1 attribute point",
};
const es: D = { ...ADLAR,
  "se.title":"Obra maestra del linaje", "se.intro":"Has llegado a la cima del oficio. Elige una sola obra de vida; su nombre quedará en el libro del linaje y formará a futuras generaciones.", "se.choose":"Elige tu obra de vida", "se.cost":"Coste: %1 monedas", "se.done":"Obra maestra de esta vida", "se.by":"%1 · generación %2", "se.legacy":"Legado del linaje", "se.made":"%1 completó la obra de su vida: %2.",
  "se.domain.bereket":"Abundancia · el próximo heredero recibe +50 monedas", "se.domain.zanaat":"Oficio · el próximo heredero recibe +1 artesanía", "se.domain.ticaret":"Comercio · el próximo heredero recibe +1 comercio", "se.domain.savas":"Guerra · el próximo heredero recibe +1 combate", "se.domain.sosyal":"Prestigio · el próximo heredero recibe +3 reputación", "se.domain.saglik":"Vigor · el próximo heredero recibe +1 punto de atributo",
};
const pt: D = { ...ADLAR,
  "se.title":"Obra-prima da linhagem", "se.intro":"Chegaste ao cume do ofício. Escolhe uma única obra de vida; o nome ficará no livro da linhagem e formará as gerações futuras.", "se.choose":"Escolhe a tua obra de vida", "se.cost":"Custo: %1 moedas", "se.done":"Obra-prima desta vida", "se.by":"%1 · geração %2", "se.legacy":"Legado da linhagem", "se.made":"%1 concluiu a obra da sua vida: %2.",
  "se.domain.bereket":"Abundância · o próximo herdeiro recebe +50 moedas", "se.domain.zanaat":"Ofício · o próximo herdeiro recebe +1 artesanato", "se.domain.ticaret":"Comércio · o próximo herdeiro recebe +1 comércio", "se.domain.savas":"Guerra · o próximo herdeiro recebe +1 combate", "se.domain.sosyal":"Prestígio · o próximo herdeiro recebe +3 reputação", "se.domain.saglik":"Vigor · o próximo herdeiro recebe +1 ponto de atributo",
};
const ar: D = { ...ADLAR,
  "se.title":"تحفة السلالة", "se.intro":"بلغت ذروة حرفتك. اختر أثر عمر واحدًا؛ يبقى اسمه في سجل السلالة ويعلّم الأجيال التالية.", "se.choose":"اختر أثر عمرك", "se.cost":"كلفة الصنع: %1 قطعة", "se.done":"تحفة هذا العمر", "se.by":"%1 · الجيل %2", "se.legacy":"أثر السلالة", "se.made":"أتمّ %1 تحفة عمره %2.",
  "se.domain.bereket":"البركة · يبدأ الوارث التالي ومعه 50 قطعة إضافية", "se.domain.zanaat":"الصنعة · يكسب الوارث التالي +1 حرفة", "se.domain.ticaret":"التجارة · يكسب الوارث التالي +1 تجارة", "se.domain.savas":"القتال · يكسب الوارث التالي +1 قتال", "se.domain.sosyal":"السمعة · يكسب الوارث التالي +3 سمعة", "se.domain.saglik":"القوة · يكسب الوارث التالي نقطة صفة إضافية",
};
const ru: D = { ...ADLAR,
  "se.title":"Шедевр династии", "se.intro":"Ты достиг вершины ремесла. Выбери один труд жизни; его имя останется в летописи рода и будет учить будущие поколения.", "se.choose":"Выбери труд жизни", "se.cost":"Стоимость: %1 монет", "se.done":"Шедевр этой жизни", "se.by":"%1 · поколение %2", "se.legacy":"Наследие рода", "se.made":"%1 завершил труд жизни — %2.",
  "se.domain.bereket":"Достаток · следующий наследник получает +50 монет", "se.domain.zanaat":"Ремесло · следующий наследник получает +1 к ремеслу", "se.domain.ticaret":"Торговля · следующий наследник получает +1 к торговле", "se.domain.savas":"Война · следующий наследник получает +1 к бою", "se.domain.sosyal":"Почёт · следующий наследник получает +3 к репутации", "se.domain.saglik":"Стойкость · следующий наследник получает +1 очко свойства",
};

export const SAHESER_METIN: Record<Lang, D> = { tr, en, es, pt, ar, ru };
