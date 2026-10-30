// NPC ad havuzları (erkek adı m, kadın adı f, soyad s), 6 dilde. Saf veri.
// Kaynak: mobile/lib/locale-data.ts → NAME_POOLS (tek oyunculu). Kopyadır; mobil kod içe aktarılmaz.
// Dizinler diller arasında hizalıdır: aynı kişi her dilde aynı dizinle adlandırılır.

export const DILLER = ["tr", "en", "es", "pt", "ar", "ru"] as const;
export type Dil = (typeof DILLER)[number];

export interface AdHavuzu {
  readonly m: readonly string[];
  readonly f: readonly string[];
  readonly s: readonly string[];
}

export const AD_HAVUZLARI: Readonly<Record<Dil, AdHavuzu>> = {
  tr: {
    m: ["Mehmet","Ahmet","Mustafa","Hasan","Hüseyin","İbrahim","Osman","Yusuf","Murat","Kerem","Emre","Cihan","Barış","Tolga","Mert","Orhan","Aydoğan","Selçuk"],
    f: ["Ayşe","Fatma","Zeynep","Emine","Hatice","Elif","Nur","Reyhan","Cansu","Derya","Sevda","Pınar","Gül","Nazlı","Hande","Melek","Gülbahar","Sultan"],
    s: ["Atay","Bircan","Demirhan","Saygı","Açıkel","Dalkılıç","Kayhan","Bal","Yıldırım","Toprak","Çelik","Aydın","Korkmaz","Şahin"],
  },
  en: {
    m: ["William","John","Robert","Edmund","Henry","Thomas","Walter","Hugh","Roger","Geoffrey","Richard","Simon","Gilbert","Ralph","Edward","Osbert","Alan","Miles"],
    f: ["Alice","Maud","Agnes","Edith","Joan","Margery","Cecily","Isabel","Eleanor","Matilda","Beatrice","Rose","Emma","Aveline","Sybil","Avice","Clemence","Sabina"],
    s: ["Ashford","Blackwood","Carter","Smith","Marsh","Thatcher","Fletcher","Hale","Stone","Wells","Reeve","Carver","Holt","Frost"],
  },
  es: {
    m: ["Juan","Pedro","Diego","Rodrigo","Alfonso","Fernando","Gonzalo","Ramiro","Sancho","Martín","Lope","García","Bermudo","Nuño","Álvaro","Íñigo","Ordoño","Vela"],
    f: ["María","Inés","Leonor","Urraca","Blanca","Constanza","Teresa","Elvira","Sancha","Mencía","Catalina","Isabel","Aldonza","Jimena","Beatriz","Estefanía","Toda","Milia"],
    s: ["del Valle","Herrero","Ríos","Castro","Vega","Montes","Salazar","Cuéllar","Bravo","Acero","Aguilar","Pardo","Sierra","León"],
  },
  pt: {
    m: ["João","Pedro","Diogo","Rodrigo","Afonso","Fernão","Gonçalo","Vasco","Sancho","Martim","Lopo","Garcia","Nuno","Álvaro","Egas","Mendo","Paio","Soeiro"],
    f: ["Maria","Inês","Leonor","Urraca","Branca","Constança","Teresa","Elvira","Sancha","Mécia","Catarina","Isabel","Aldonça","Mor","Beatriz","Dórdia","Ouroana","Châmoa"],
    s: ["do Vale","Ferreiro","Rios","Castro","Veiga","Montes","Salazar","Bravo","Aço","Aguiar","Pardo","Serra","Leão","Pinto"],
  },
  ar: {
    m: ["محمد","أحمد","علي","حسن","حسين","إبراهيم","عثمان","يوسف","عمر","خالد","سليمان","داود","يعقوب","صلاح","طارق","حمزة","أيوب","بلال"],
    f: ["فاطمة","عائشة","زينب","مريم","خديجة","ليلى","نور","رحمة","سعاد","هند","سارة","أمينة","حليمة","نادية","سلمى","نفيسة","زبيدة","صفية"],
    s: ["الحدّاد","النجّار","التاجر","الصيّاد","الراعي","الخبّاز","القيسي","الدمشقي","الحلبي","المصري","الأندلسي","الفارسي","الكردي","البغدادي"],
  },
  ru: {
    m: ["Иван","Пётр","Фёдор","Дмитрий","Алексей","Михаил","Никита","Борис","Глеб","Ярослав","Святослав","Олег","Игорь","Роман","Владимир","Мстислав","Добрыня","Всеволод"],
    f: ["Мария","Анна","Ольга","Дарья","Евдокия","Прасковья","Ксения","Варвара","Елена","Татьяна","Анастасия","Софья","Марфа","Наталья","Любовь","Василиса","Забава","Милослава"],
    s: ["Кузнецов","Плотников","Гончаров","Рыбаков","Пастухов","Соколов","Медведев","Волков","Морозов","Орлов","Зайцев","Лебедев","Карпов","Громов"],
  },
};

/** Rusçada soyad kadın için çekilir (Пастухов → Пастухова); havuz eril biçimi tutar. */
export function soyadCinsli(soyad: string, dil: Dil, kadin: boolean): string {
  return dil === "ru" && kadin && /(ов|ев|ёв|ин|ын)$/.test(soyad) ? soyad + "а" : soyad;
}
