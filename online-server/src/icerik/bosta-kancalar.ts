// Boşta kanca izin listesi (tasarım §7 kilit testi). Burada olan kanca henüz hiçbir sisteme bağlı değildir; liste
// YALNIZ KISALIR: bir kanca bağlanınca buradan silinir (test/kanca.test.ts listede bağlı kanca ve listede olmayan
// boşta kanca bulursa düşer). Yeni boşta kanca eklemek yasaktır; BOSTA_TAVAN yalnız azaltılır.
// Anahtar biçimi: icerik/kanca-kayit.ts kancaAnahtari.

/**
 * Liste uzunluğunun üst sınırı (yalnız azalır). 232: Dilim 3 ilk parti denge denetiminde `hak:namYayma` (başka dükkânı
 * övme hizmeti, kendi rafına çekicilik değil) ve `hak:hileliTarti` (hileli tartı dürüst H olamaz) kayıttan geri alındı;
 * parti henüz ana dala girmediği için taban budur. Kanca partisi 2 (18 Kasım) bağladıkça düşer; bağlanamayanın yanında
 * tek satır neden yazar ("// boşta: ...").
 */
export const BOSTA_TAVAN = 162;

export const BOSTA_KANCALAR: readonly string[] = [
  "arac:av:mizrak",
  "arac:corba:kazan",
  "arac:devriye:kilic",
  "arac:saf:kalkan",
  "hak:ahsapKopru", // boşta: köprü/bayındırlık projesi sistemi yok (yalnız işletme genişletmesi var)
  "hak:akinOnculugu", // boşta: akın/sefer sistemi yok
  "hak:alpYemini", // boşta: yemin (ant) sistemi yok
  "hak:asayisAmirligi", // boşta: subaşı/asayiş amiri makamı yok (makamlar: vali, şehir beyi, ahi başı, kasaba ağası, Divan temsilcisi)
  "hak:asiklarMeclisi", // boşta: âşıklar meclisi ve ozan icazeti sistemi yok
  "hak:barisKitabesi", // boşta: kitabe/anıt sistemi yok
  "hak:barisYemini", // boşta: kan davası ve yemin bozma (hane lekesi) sistemi yok
  "hak:beylikMeclisi", // boşta: beylik meclisi yok
  "hak:bilinenGercek", // boşta: şahit dinleme kaydı (bilinen gerçek) sistemi yok
  "hak:birlikKomutanligi", // boşta: ordu/birlik sistemi yok
  "hak:bolgeHakemi", // boşta: bölge hakemliği makamı yok
  "hak:butceOnerisi", // boşta: hazine bütçe önerisi akışı yok
  "hak:dagitimKarari", // boşta: kıtlıkta erzak dağıtım (paylaştırma) sistemi yok
  "hak:dagitimSirasi", // boşta: kıtlıkta erzak dağıtım (paylaştırma) sistemi yok
  "hak:defterdarAdayligi", // boşta: defterdar makamı yok
  "hak:dilekce", // boşta: dilekçe sistemi yok
  "hak:dilekceGundemi", // boşta: dilekçe sistemi yok
  "hak:divanBaskanligi", // boşta: Divan başkanlığı makamı yok (Divan NPC)
  "hak:diyetToresi", // boşta: diyet/kan davası sistemi yok
  "hak:dogumRiski", // boşta: doğum riski sistemi yok (oyuncu hanesinde doğum risksiz)
  "hak:dusmanGucu", // boşta: düşman gücü/keşif görünümü yok
  "hak:ebeBagi", // boşta: hane–ebe bağı sistemi yok
  "hak:ebeIcazeti", // boşta: icazet sistemi yok
  "hak:elcilikAdayligi", // boşta: elçi makamı yok
  "hak:fiyatDongusu",
  "hak:gecisAkcesi",
  "hak:gencTalimi",
  "hak:haberSatisi",
  "hak:hamamProjesi",
  "hak:haneEbeligi",
  "hak:hanedanDestani",
  "hak:haracSecenegi",
  "hak:haydutDokumu",
  "hak:haydutOnderligi",
  "hak:hazineDefteri",
  "hak:hazineEminligi",
  "hak:hazirlikPenceresi",
  "hak:hekimIcazeti",
  "hak:heyetUzlasmasi",
  "hak:hikmetliKarar",
  "hak:hileliTarti",
  "hak:husumetListesi",
  "hak:ilkGorus",
  "hak:ipekYoluSeferi",
  "hak:kadilikAdayligi",
  "hak:kafile",
  "hak:kapiDefteri",
  "hak:kapiKapama",
  "hak:karantina",
  "hak:kararDefteri",
  "hak:kararOnerisi",
  "hak:kasabaKronigi",
  "hak:kasabaSicili",
  "hak:katkiDefteri",
  "hak:kayitDisiKalem",
  "hak:kayitDisiSifir",
  "hak:kervanYolu",
  "hak:kesifRaporu",
  "hak:kethudaAdayligi",
  "hak:kitlikBagisi",
  "hak:kitlikOnderligi",
  "hak:komsuSohret",
  "hak:kopruBakimi",
  "hak:koruBakimi",
  "hak:koruDikimi",
  "hak:kronikNami",
  "hak:kuraklikDirenci",
  "hak:lekeliSatici",
  "hak:meclisSirasi",
  "hak:menzilhane",
  "hak:meraHakki",
  "hak:meraKarari",
  "hak:naiplik",
  "hak:namYayma",
  "hak:navlun",
  "hak:ordugahHakki",
  "hak:ortakDertCagrisi",
  "hak:ortaklikDefteri",
  "hak:ovguTaslama",
  "hak:oylama",
  "hak:ozanIcazeti",
  "hak:ozanbasi",
  "hak:resmiElcilik",
  "hak:riskPaylasimi",
  "hak:rotaSecimi",
  "hak:safDuzeni", // boşta: çatışmada asker rolü/saf seçeneği yok (siyaset çatışması yalnız makam emri)
  "hak:sahteBelge", // boşta: sahte belge (sahtecilik) sistemi yok
  "hak:senetliIhtilaf", // boşta: hakemlik hizmeti ve senet ihtilafı akışı yok (hizmet:hakemlik de boşta)
  "hak:serdarAdayligi", // boşta: serdar makamı yok (siyaset makam listesi)
  "hak:seyhAdayligi", // boşta: tekke/şeyhlik makamı yok
  "hak:soylentiDurdurma", // boşta: susturma için yeni uç ve hak edilmiş kötü söylentiyi örtme denetimi gerekir
  "hak:soylentiTasima", // boşta: söylentiyi komşu yerleşime taşımak yerleşimler arası ileti ister
  "hak:subasiAdayligi", // boşta: subaşı makamı yok (siyaset makam listesi)
  "hak:surKitabesi", // boşta: sur/bayındırlık projesi ve kitabe kaydı yok
  "hak:tehditHaberi", // boşta: tehdit olayları ay dönümünde zarla doğar; erken haber önden kurulan tehdit takvimi ister
  "hak:toreOnerisi", // boşta: töre (yerel kural) önerisi sistemi yok
  "hak:uzakMalSiparisi", // boşta: kervanda dönüş yükü/uzaktan alım yok
  "hak:vadeliAlim", // boşta: vadeli (borçlu) alım borç/teminat ister; ucuz alım raf/NPC arbitrajı açar
  "hak:yerelSenlik", // boşta: takvim dışı yerel şenlik öneri/onay akışı ister (şenlik takvimi saf ay fonksiyonu)
  "hak:yolAkcesi", // boşta: kervanda yol akçesi (geçiş vergisi) yok
  "hak:yolAkcesiMuafiyeti", // boşta: kervanda yol akçesi (geçiş vergisi) yok
  "hak:zehirTanima", // boşta: zehir sistemi yok (tarif:panzehir de boşta)
  "hizmet:beylikElciligi",
  "hizmet:defter",
  "hizmet:denetim",
  "hizmet:diyetPazarligi",
  "hizmet:hakemlik",
  "hizmet:hediyeliElcilik",
  "hizmet:hizliUlak",
  "hizmet:ismarlamaZirh",
  "hizmet:izSur",
  "hizmet:komsuElcilik",
  "hizmet:muhurluMektup",
  "hizmet:sahitDinle",
  "hizmet:sifreliMektup",
  "hizmet:tercume",
  "hizmet:uzakKervan",
  "kalite:araBul",
  "kalite:butce",
  "kalite:cocukRiski",
  "kalite:defter",
  "kalite:denetim",
  "kalite:dilekce",
  "kalite:elcilik",
  "kalite:fiyatHaberi",
  "kalite:gozculuk",
  "kalite:hakemlik",
  "kalite:hali",
  "kalite:hirsizlikTespiti",
  "kalite:izSur",
  "kalite:mektup",
  "kalite:merhem",
  "kalite:sahitDinle",
  "kalite:sancak",
  "kalite:savunma",
  "kalite:tercume",
  "kalite:ulak",
  "kalite:uzlasma",
  "kalite:yolGuvenligi",
  "omur:cizme",
  "sinerji:degirmenKopruDemiri",
  "sinerji:kopruDemiri",
  "sinerji:uzakAnlasma",
  "tarif:boya",
  "tarif:degirmenMekanizmasi",
  "tarif:hali",
  "tarif:ipekKumas",
  "tarif:kilitMentese",
  "tarif:kulce",
  "tarif:merhem",
  "tarif:panzehir",
  "tarif:peynir",
  "tarif:sancak",
  "tarif:serbet",
  "tarif:sifaSerbeti",
  "tarif:tunc",
  "verim:kulce",
  "verim:serbet",
];
