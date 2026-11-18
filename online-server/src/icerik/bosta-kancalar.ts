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
export const BOSTA_TAVAN = 155;

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
  "hak:gecisAkcesi", // köprü yapımı/köprübaşı sistemi yok (ahsapKopru da boşta)
  "hak:haberSatisi", // oyuncular arası bilgi satışı (teklif türü + haber kopyası) yeni sistem ister
  "hak:hamamProjesi", // hamam yapısı yok; genişletme indirimi anlamı bozar
  "hak:hanedanDestani", // hanedan destanı (vâris devrinde nam korunumu) için destan kaydı ve devir kuralı yeni sistem
  "hak:haracSecenegi", // beylik elçiliği/haraç müzakeresi (BolgeDO) yok; beylikElciligi hizmeti de boşta
  "hak:haydutDokumu", // kervanda haydut/rota riski yok (ikinci dilim)
  "hak:hazineEminligi", // hazine emini makamı siyasette yok
  "hak:hekimIcazeti", // icazet (ustalık onayı) sistemi yok
  "hak:hikmetliKarar", // meclis karar sistemi yok
  "hak:hileliTarti",
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
