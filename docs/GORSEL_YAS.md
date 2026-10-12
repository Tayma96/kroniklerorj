# Görsel kimlik ve yaş — 12 Ekim 2026

Kullanıcının yönü: 1200'lü yılların Selçuklu Anadolu'su ve Türkmen karakterleri. Mevcut yetişkin kişi yüzleri,
örgüler, keçe/kürk kenarlı başlıklar ve dokuma kıyafet kimliği korunur. Yeni setler genel çöl dekoru veya
modern/Osmanlı dönemine ait fes ve giysi eklemez. Bu, dönemden ilham alan kurmaca sanat yönüdür;
her kumaş ve süsleme için birebir arkeolojik rekonstrüksiyon iddiası değildir.

Dönem kontrolünde [Kubadabad buluntularına dayanan Selçuklu Devri Kadın Başlıkları](https://taed.ktb.gov.tr/Eklenti/108801,46onderpdf.pdf?0=)
ve [Anadolu Selçuklu sanatı dönem özeti](https://www.metmuseum.org/essays/the-art-of-the-seljuq-period-in-anatolia-1081-1307)
okundu. Yayınların görselleri oyun dosyası olarak kopyalanmadı. Yüzler mevcut kurmaca yetişkin portrelerinden
türetilir; başlık ve kıyafet sürekliliği kişinin tanınmasını destekler.

## Oyuncu ve NPC serileri

Oyuncu için kullanıcının seçtiği birinci çoklu set, 14 adet 200×200 PNG ve yedi yaş bandıyla aynı kalır.
Oyuncu yüzü NPC kimliğinden seçilmez. Kaynak: `mobile/assets/portre/KAYNAK.json`.

NPC'nin 16 yetişkin şablonunun her birine çocuk ve ergen karesi eklendi: dört 4×2 atlas, toplam 32 kare.
Kalıcı kişi havuzu hâlâ 7 erkek / 8 kadın şablonudur; e05 âlim şablonu bu havuza sokulmadı.
Dolayısıyla 30 yeni kare kişi havuzunda kullanılır, e05'in iki karesi ayrılmış kalır. Havuzdan aynı
şablonu paylaşan farklı NPC'ler olabilir; her kişiye eşsiz bir yüz üretildiği ileri sürülmez.

| NPC yaşı | Görsel evre | Kaynak |
| --- | --- | --- |
| 0–12 | Çocuk | Yeni atlas, temsilî çocuk görünümü |
| 13–17 | Ergen | Aynı kimliğin yeni ergen karesi |
| 18–34 | Genç yetişkin | Mevcut `*_genc.jpg` |
| 35–59 | Olgun | Mevcut `*_olgun.jpg` |
| 60+ | Yaşlı | Mevcut `*_yasli.jpg` |

Çocuk karesi yaklaşık okul çağı görünümüdür; bebek için ayrı kare yoktur. Yaş sınırları görsel seçime
aittir, oyun takvimi veya eylem kapıları değiştirilmedi. Kimliği seçen FNV özeti ve havuz sırası aynı
kaldığından eski kayıtlar başka bir yüz ailesine kaymaz. Negatif/geçersiz yaş ve kimliği olmayan portre
çağrısı oyuncunun mevcut genel seri yoluna döner.

## Dosyalar ve gösterim

- `mobile/assets/npc/*yas-atlas-v1.png`: dört yeni 1774×887 PNG; eski dosyalar üzerine yazılmadı.
- `mobile/assets/npc/YAS_KAYNAK.json`: dosya SHA-256, referans isimleri, satır/sütun yerleşimi, gerçek üretim yönergeleri.
- `mobile/lib/npc-portre.ts`: kimlik/yaş → kaynak ve hücre; salt kaynak isteyen API korunur, atlas gösterimi hücre bilgisi ister.
- `mobile/lib/ui.tsx`: önce tek hücreyi kadrajlar, sonra portre hareketini uygular. Komşu hücre hareketle görünmez.

PNG dosyaları kırpılmadı, büyütülmedi veya piksel düzenlemesinden geçirilmedi. Arayüz, dört sütun/iki satır
oranını kullanarak yalnız seçilen kareyi gösterir; 443,5 piksellik kaynak hücre boyutu yanlış tamsayı kırpmasına
zorlanmaz. Dört dosya toplam 10.364.006 bayt ekler. Fiziksel cihazda bellek/kare hızı ölçülmedi.

## Ana ekran ve hareket

Oyuncu/NPC profil portresi 72 piksele çıktı. Ana ekranda ad, meslek, nâm sıfatı ve tarih için daha okunur
hiyerarşi kullanılır. Sağlık/tokluk/akçe/nâm etiketleri mevcut altı dil anahtarından gelir; göstergeler
ekran okuyucuya tam değeri verir. Akçenin sahte bir 500 üst sınırı çubuğu kaldırıldı; büyük sayı görselde
yerel kısaltmayla, erişilebilirlik metninde tam değeriyle görünür. Arapça ana başlık/gösterge sırası aynalanır.

Uzun adlar sarılır, nâm rozeti adın altındadır. Yüklenen kayıt ve yeni kişi/nesil için sikke yağmuru
tetiklenmez; yalnız aynı hayatta gerçek akçe artışı kutlanır. Sade modda sikke yağmuru kapalıdır.
Yetişkin/yaşlı ilk girişinde çocukluk eylemi isteyen yanlış rehber yerine mevcut genel ay açıklaması gösterilir.

`use-sade-mod.ts` portre, hero, ortam parçacığı, düğme ve kartların tercihi anında görmesini sağlar.
Portre, yakınlaşma, parçacık, düğme ve nabız döngüleri temizlenir; sade modda sabitlenir.
Titreşim/sade mod anahtarları ve rehber kapatma düğmesi mevcut altı dil etiketiyle erişilebilir.

## Doğrulama

- Mobil tip denetimi, kurtarma denetimi, 8.975 anahtarlı altı dil/ikon denetimi ve dil karışması temiz.
- 4.000 kişi tohumu: eski kimlik havuzu, yeni çocuk/ergen hücreleri, yetişkin kaynakları ve yaş sınırları temiz.
  Önceki sürümden alınan yedi sabit kimlik örneği aynı; dört PNG'nin boyutu, özeti ve 32 eşsiz hücresi doğrulanır.
- Motorun 10 davranış hash'i aynı; üç sentetik kayıt × 30 ay tabanı temiz. Motor ve MP sözleşmesi değişmedi.
- Tarayıcıda 4× CPU sınırlamasıyla 9 ana ekran örneği: altı dil, 320/390 px, çocuk/ergen/yetişkin/yaşlı,
  erkek/kadın, uzun isim ve büyük akçe. Yatay taşma, bozuk resim ve çalışma zamanı hatası yok.
- Sekiz NPC profil örneği: aynı kimliğin 7/14/22 yaş geçişi ve dört atlasın farklı hücreleri. Yanlış komşu
  yüz görülmedi. Bu görsel denetim fiziksel Android denemesinin karşılığı olarak sunulmaz.
- Ayarlardan sade mod açılınca portre ölçeği 1'e döndü ve iki ölçümde sabit kaldı; yenilemede tercih korundu.
  Başlangıçta hareket açıkken ölçek değişti, kayıt yüklenmesinde sikke kanvası yoktu; beş anahtarın etiketi var.
- Android/Hermes paketleme kontrolü başarılı. APK/PR/dağıtım tetiklenmedi.

Sesin fiziksel cihazdaki dinleme kontrolü, üretim RNG'nin kayda alınması ve ortak neden dökümü önceki
devirde açık kalan ayrı işlerdir; görsel dalga bunların tamamlandığı anlamına gelmez.
