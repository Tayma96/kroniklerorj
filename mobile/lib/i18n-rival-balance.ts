import type { Lang } from "./locale-data";
type D = Record<string, string>;

const tr: D = {
  "rival.state.crisis":"Sarsıntıda", "rival.state.rising":"Yükselişte", "rival.state.falling":"Geriliyor", "rival.state.steady":"Dengede",
  "rival.crisis.miras":"Miras kavgası", "rival.crisis.borc":"Borç yükü", "rival.crisis.kuraklik":"Kuraklık", "rival.crisis.baskin":"Sınır baskını",
  "rival.crisis.start.miras":"%1 hanesinde miras kavgası çıktı; ocak bölündü, gücü geriliyor.", "rival.crisis.start.borc":"%1 hanesinin ağır borçları açığa çıktı; adamları ve toprakları çözülüyor.", "rival.crisis.start.kuraklik":"Kuraklık %1 hanesinin ambarlarını vurdu; gücü geriliyor.", "rival.crisis.start.baskin":"Bir sınır baskını %1 hanesini hazırlıksız yakaladı; gücü sarsıldı.", "rival.crisis.end":"%1 hanesi sarsıntıyı atlattı; ocağını yeniden topluyor.",
};
const en: D = {
  "rival.state.crisis":"In crisis", "rival.state.rising":"Rising", "rival.state.falling":"Declining", "rival.state.steady":"Steady",
  "rival.crisis.miras":"Succession dispute", "rival.crisis.borc":"Debt burden", "rival.crisis.kuraklik":"Drought", "rival.crisis.baskin":"Border raid",
  "rival.crisis.start.miras":"A succession dispute split House %1; its power is declining.", "rival.crisis.start.borc":"House %1's heavy debts came to light; its men and lands are slipping away.", "rival.crisis.start.kuraklik":"Drought struck House %1's granaries; its power is declining.", "rival.crisis.start.baskin":"A border raid caught House %1 unprepared; its power was shaken.", "rival.crisis.end":"House %1 weathered the crisis and is gathering its strength again.",
};
const es: D = {
  "rival.state.crisis":"En crisis", "rival.state.rising":"En ascenso", "rival.state.falling":"En declive", "rival.state.steady":"Estable",
  "rival.crisis.miras":"Disputa sucesoria", "rival.crisis.borc":"Carga de deuda", "rival.crisis.kuraklik":"Sequía", "rival.crisis.baskin":"Incursión fronteriza",
  "rival.crisis.start.miras":"Una disputa sucesoria dividió a la Casa %1; su poder disminuye.", "rival.crisis.start.borc":"Salieron a la luz las deudas de la Casa %1; pierde hombres y tierras.", "rival.crisis.start.kuraklik":"La sequía golpeó los graneros de la Casa %1; su poder disminuye.", "rival.crisis.start.baskin":"Una incursión sorprendió a la Casa %1; su poder quedó sacudido.", "rival.crisis.end":"La Casa %1 superó la crisis y vuelve a reunir sus fuerzas.",
};
const pt: D = {
  "rival.state.crisis":"Em crise", "rival.state.rising":"Em ascensão", "rival.state.falling":"Em declínio", "rival.state.steady":"Estável",
  "rival.crisis.miras":"Disputa sucessória", "rival.crisis.borc":"Peso da dívida", "rival.crisis.kuraklik":"Seca", "rival.crisis.baskin":"Incursão fronteiriça",
  "rival.crisis.start.miras":"Uma disputa sucessória dividiu a Casa %1; o seu poder recua.", "rival.crisis.start.borc":"As dívidas da Casa %1 vieram a público; homens e terras escapam-lhe.", "rival.crisis.start.kuraklik":"A seca atingiu os celeiros da Casa %1; o seu poder recua.", "rival.crisis.start.baskin":"Uma incursão apanhou a Casa %1 desprevenida; o seu poder foi abalado.", "rival.crisis.end":"A Casa %1 superou a crise e volta a reunir forças.",
};
const ar: D = {
  "rival.state.crisis":"في أزمة", "rival.state.rising":"في صعود", "rival.state.falling":"في تراجع", "rival.state.steady":"مستقرة",
  "rival.crisis.miras":"نزاع على الميراث", "rival.crisis.borc":"عبء الديون", "rival.crisis.kuraklik":"قحط", "rival.crisis.baskin":"غارة حدودية",
  "rival.crisis.start.miras":"شقّ نزاع الميراث بيت %1؛ وبدأت قوته تتراجع.", "rival.crisis.start.borc":"ظهرت ديون بيت %1 الثقيلة؛ وبدأ رجاله وأرضه يتفلتان.", "rival.crisis.start.kuraklik":"ضرب القحط مخازن بيت %1؛ وبدأت قوته تتراجع.", "rival.crisis.start.baskin":"باغتت غارة حدودية بيت %1؛ فاهتزت قوته.", "rival.crisis.end":"تجاوز بيت %1 أزمته وبدأ يجمع قوته من جديد.",
};
const ru: D = {
  "rival.state.crisis":"В кризисе", "rival.state.rising":"На подъёме", "rival.state.falling":"В упадке", "rival.state.steady":"Стабильно",
  "rival.crisis.miras":"Спор о наследстве", "rival.crisis.borc":"Долговое бремя", "rival.crisis.kuraklik":"Засуха", "rival.crisis.baskin":"Пограничный набег",
  "rival.crisis.start.miras":"Спор о наследстве расколол дом %1; его сила падает.", "rival.crisis.start.borc":"Тяжёлые долги дома %1 раскрылись; люди и земли уходят.", "rival.crisis.start.kuraklik":"Засуха ударила по амбарам дома %1; его сила падает.", "rival.crisis.start.baskin":"Пограничный набег застал дом %1 врасплох; его сила пошатнулась.", "rival.crisis.end":"Дом %1 пережил кризис и вновь собирается с силами.",
};

export const RIVAL_BALANCE_METIN: Record<Lang, D> = { tr, en, es, pt, ar, ru };
