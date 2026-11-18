// Boşta kanca izin listesi (tasarım §7 kilit testi). Burada olan kanca henüz hiçbir sisteme bağlı değildir; liste
// YALNIZ KISALIR: bir kanca bağlanınca buradan silinir (test/kanca.test.ts listede bağlı kanca ve listede olmayan
// boşta kanca bulursa düşer). Yeni boşta kanca eklemek yasaktır; BOSTA_TAVAN yalnız azaltılır.
// Anahtar biçimi: icerik/kanca-kayit.ts kancaAnahtari.

/**
 * Liste uzunluğunun üst sınırı (yalnız azalır). 232: Dilim 3 ilk parti denge denetiminde `hak:namYayma` (başka dükkânı
 * övme hizmeti, kendi rafına çekicilik değil) ve `hak:hileliTarti` (hileli tartı dürüst H olamaz) kayıttan geri alındı;
 * parti henüz ana dala girmediği için taban budur. Kanca partisi 2 (18 Kasım) bağladıkça düşer; bağlanamayanın yanında
 * tek satır neden yazar ("// boşta: ..."). 160: a–e/konsinye dalı (10) ve kalite/eşya dalı (13) birleşti; gece devriyesinin
 * hırsızlık tespiti ve kılıcı yalnız devriye görevinde (nöbete sayılmaz). 151: hak l–r dalı (9; namYayma/hileliTarti çarşı hilesinde) birleşti.
 * 133: hizmet/tarif/sinerji dalı (18; 9 kasaba görevi, ısmarlama zırh, uzak kervan) birleşti. 122: hak s–z dalı (11).
 * 104: hak f–k dalı (18; ortak dert önderlik/buyruk, kronik, koru) birleşti.
 */
export const BOSTA_TAVAN = 104;

export const BOSTA_KANCALAR: readonly string[] = [
  // av sistemi yok (izSur hizmeti hizmet ajanında; hedefi "av" olan araçlı hizmet gelince bağlanır)
  "arac:av:mizrak",
  // "kazan" malı yok: yeni mal + üretim tarifi gerekir (çorba tarifi var; mal eklenince yapısal bağlanır)
  "arac:corba:kazan",
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
  "hak:gecisAkcesi", // köprü yapımı/köprübaşı sistemi yok (ahsapKopru da boşta)
  "hak:haberSatisi", // oyuncular arası bilgi satışı (teklif türü + haber kopyası) yeni sistem ister
  "hak:hamamProjesi", // hamam yapısı yok; genişletme indirimi anlamı bozar
  "hak:hanedanDestani", // hanedan destanı (vâris devrinde nam korunumu) için destan kaydı ve devir kuralı yeni sistem
  "hak:haracSecenegi", // beylik elçiliği/haraç müzakeresi (BolgeDO) yok; beylikElciligi hizmeti de boşta
  "hak:haydutDokumu", // kervanda haydut/rota riski yok (ikinci dilim)
  "hak:hazineEminligi", // hazine emini makamı siyasette yok
  "hak:hekimIcazeti", // icazet (ustalık onayı) sistemi yok
  "hak:hikmetliKarar", // meclis karar sistemi yok
  "hak:ipekYoluSeferi", // uzak pazar/mesafe kavramı yok (kervan her beyliğe gider)
  "hak:kadilikAdayligi", // kadı makamı siyasette yok
  "hak:kafile", // kervanda haydut kaybı ve çok tüccarlı kafile yok (ikinci dilim)
  "hak:kapiDefteri", // yerleşime giriş/ziyaret kavramı yok; göç zaten kronikte
  "hak:kararDefteri", // meclis karar sistemi yok
  "hak:kararOnerisi", // meclis karar/oylama sistemi yok
  "hak:kasabaSicili", // senet/tasdik sistemi yok
  "hak:katkiDefteri", // yerel şenlik önerisi (yerelSenlik) olmadan anlamsız; şenlik katkısı zaten defterli
  "hak:kayitDisiKalem", // kasabada kayıt dışı vergi mekaniği yok; bölge vergisini artırmak akçe basar
  "hak:kayitDisiSifir", // kasabada kayıt dışı vergi mekaniği yok; bölge vergisini artırmak akçe basar
  "hak:kervanYolu", // yerleşimler arası anlaşma sistemi ve komşuluk verisi yok
  "hak:kesifRaporu", // oyuncu düzeyinde çatışma/sefer sistemi yok
  "hak:komsuSohret", // komşuluk verisi yok (yerleşimler arası şöhret yayılımı)
  "hak:kopruBakimi", // köprü yapımı/köprübaşı sistemi yok
  "hak:kuraklikDirenci", // kuraklık/hasat kaybı mekaniği yok
  "hak:meclisSirasi", // boşta: siyaset (meclis gündem sırası): bölge meclisi programında kapanır
  "hak:meraKarari", // boşta: mera kararı meclis/gündem işi; çevrimiçide mera sistemi yok
  "hak:naiplik", // boşta: siyaset (kadılık yolu): makam sisteminde (siyaset/makam.ts) kapanır
  "hak:navlun", // boşta: başkasının yükünü taşıma yok: kervan yükü tek sahipli (yerlesim/kervan.ts)
  "hak:ortaklikDefteri", // boşta: ortak (çok sahipli) işletme yok
  "hak:oylama", // boşta: siyaset (meclis oylaması): bölge meclisi programında kapanır
  "hak:ozanIcazeti", // boşta: ozan yetiştirme/icazet sistemi çevrimiçide yok
  "hak:resmiElcilik", // boşta: siyaset (diplomasi): elçilik sistemi yok
  "hak:riskPaylasimi", // boşta: kervanda kayıp riski ve ortak kafile yok
  "hak:rotaSecimi", // boşta: kervanda rota ve yol tehlikesi yok
  "hak:safDuzeni", // boşta: çatışmada asker rolü/saf seçeneği yok (siyaset çatışması yalnız makam emri)
  "hak:sahteBelge", // boşta: sahte belge (sahtecilik) sistemi yok
  "hak:senetliIhtilaf", // boşta: senet ihtilafı (senet davası) akışı yok; hakemlik yalnız kasaba görevi
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
  "hizmet:beylikElciligi", // boşta: elçilik beylik diplomasisi (BolgeDO); kişi elçi rolü siyaset programında
  "hizmet:diyetPazarligi", // boşta: kan davası ilk sürümde yok (ONLINE_DURUM §4.2)
  "hizmet:hediyeliElcilik", // boşta: elçilik beylik diplomasisi (BolgeDO); kişi elçi rolü siyaset programında
  "hizmet:komsuElcilik", // boşta: elçilik beylik diplomasisi (BolgeDO); kişi elçi rolü siyaset programında
  // butce, dilekce: divan bütçe/dilekçe sistemi yok (hak:butceOnerisi, hak:dilekce ile gelir)
  "kalite:butce",
  "kalite:dilekce",
  "kalite:elcilik", // boşta: tüketicisi elçilik hizmetleri; beylik diplomasisi (BolgeDO) gelince bağlanır
  // hali, merhem, sancak: tarif kimliğiyle yapısal bağlıdır; tarif (tarif ajanında) eklenince listeden çıkar
  "kalite:hali",
  "kalite:merhem",
  "kalite:sancak",
  "sinerji:degirmenKopruDemiri", // boşta: tek tüketicisi hak:ahsapKopru kapısı (beceri-etki.ts); köprü hakkıyla birlikte bağlanır
  "sinerji:kopruDemiri", // boşta: tek tüketicisi hak:ahsapKopru kapısı (beceri-etki.ts); köprü hakkıyla birlikte bağlanır
  "tarif:boya", // boşta: yeni mal ister; istemci MAL_IDLERI kapalı küme (eski APK tarif listesini reddeder)
  "tarif:degirmenMekanizmasi", // boşta: yeni mal ister; istemci MAL_IDLERI kapalı küme (eski APK tarif listesini reddeder)
  "tarif:hali", // boşta: yeni mal ister; istemci MAL_IDLERI kapalı küme (eski APK tarif listesini reddeder)
  "tarif:ipekKumas", // boşta: yeni mal ister; istemci MAL_IDLERI kapalı küme (eski APK tarif listesini reddeder)
  "tarif:kilitMentese", // boşta: yeni mal ister; istemci MAL_IDLERI kapalı küme (eski APK tarif listesini reddeder)
  "tarif:kulce", // boşta: yeni mal ister; istemci MAL_IDLERI kapalı küme (eski APK tarif listesini reddeder)
  "tarif:merhem", // boşta: yeni mal ister; istemci MAL_IDLERI kapalı küme (eski APK tarif listesini reddeder)
  "tarif:panzehir", // boşta: yeni mal ister; istemci MAL_IDLERI kapalı küme (eski APK tarif listesini reddeder)
  "tarif:peynir", // boşta: yeni mal ister; istemci MAL_IDLERI kapalı küme (eski APK tarif listesini reddeder)
  "tarif:sancak", // boşta: yeni mal ister; istemci MAL_IDLERI kapalı küme (eski APK tarif listesini reddeder)
  "tarif:serbet", // boşta: yeni mal ister; istemci MAL_IDLERI kapalı küme (eski APK tarif listesini reddeder)
  "tarif:sifaSerbeti", // boşta: yeni mal ister; istemci MAL_IDLERI kapalı küme (eski APK tarif listesini reddeder)
  "tarif:tunc", // boşta: yeni mal ister; istemci MAL_IDLERI kapalı küme (eski APK tarif listesini reddeder)
  // verim:kulce, verim:serbet: tarif (tarif ajanında) eklenince yapısal bağlanır
  "verim:kulce",
  "verim:serbet",
];
