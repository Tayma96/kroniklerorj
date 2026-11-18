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
 * 133: hizmet/tarif/sinerji dalı (18; 9 kasaba görevi, ısmarlama zırh, uzak kervan) birleşti.
 */
export const BOSTA_TAVAN = 133;

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
  "hak:safDuzeni",
  "hak:sahneSirasi",
  "hak:sahteBelge",
  "hak:salginKatkisi",
  "hak:senetliIhtilaf",
  "hak:senlikSuslemesi",
  "hak:serdarAdayligi",
  "hak:seyhAdayligi",
  "hak:soylentiDurdurma",
  "hak:soylentiTasima",
  "hak:subasiAdayligi",
  "hak:surKitabesi",
  "hak:tanikSozu",
  "hak:tehditHaberi",
  "hak:toreOnerisi",
  "hak:ulufePayi",
  "hak:uzakMalSiparisi",
  "hak:vadeliAlim",
  "hak:yaraliDurumu",
  "hak:yerelSenlik",
  "hak:yoksulCorbasi",
  "hak:yolAkcesi",
  "hak:yolAkcesiMuafiyeti",
  "hak:yolDevriyesi",
  "hak:yolEmini",
  "hak:zahireAlimi",
  "hak:zaviye",
  "hak:zehirTanima",
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
