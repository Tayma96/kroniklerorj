# Beceri ağacı v2 ve kalıcı mesleki bilgi (9 Kasım 2026)

**Durum:** Berkay'ın kararı (GPT ile birlikte hazırlanan ekler dahil). Ana tasarım §5.3'teki "3 dal × 4 kademe, düğüm
puan ister" modelinin **yerine geçer**. Örnek arayüz yalnız Demirci için yapılır; Berkay görüp onaylamadan 14 mesleğe
toplu geçiş ve toplu kod değişikliği yapılmaz.

## 1. İlkeler
1. **Tam Özgürlük Modeli:** öğrenilen beceri karaktere aittir. Meslek değiştirmek hiçbir beceriyi silmez, sıfırlamaz,
   kilitlemez. Eski mesleğin becerisini kullanmak için o mesleği seçmek gerekmez; yalnız fiziksel koşullar (alet,
   malzeme, atölye) aranır.
2. **Aktif meslek** yalnız: meslek ekranında varsayılan açılan ağaç, lonca tablosunda sayıldığı meslek ve unvan satırı.
3. **Faaliyetle tecrübe:** tecrübe, yapılan işin mesleğine gider (silah döven demircilik tecrübesi kazanır, aktif
   mesleği çiftçi olsa bile). Zorluğa ve başarıya göre; azalan getiri ve takat sınırıyla kasılamaz.
4. **Bağımsız ilerleme:** her mesleğin tecrübesi, beceri puanı, kademesi, öğrenilmiş becerileri ve tarifleri ayrıdır.
   Puan meslekler arasında aktarılmaz. Bir meslekte pir olmak diğerinde kademe vermez.
5. **Uzmanlaşma:** bir meslekte kazanılabilecek puan tavanı ağacın tamamını açmaya yetmez.

## 2. Ağaç yapısı (bütün mesleklerde ortak)
- 4 kademe bölümü: **Çırak** (temel yetenekler) → **Kalfa** (ileri üretim ve uzmanlaşma, iki sıra) → **Usta**
  (özel teknikler) → **Pir** (tek zirve düğüm). Bölüm başlığı ve alt yazısı görünür.
- Düğüm: kimlik, ad, ikon, **seviye** (ör. 0/3; her seviye ayrı öğrenilir), kademe, sütun, ön koşullar (bir ya da birden
  çok düğüm, belirli seviyede: "Çırak: Aletçilik (3/3)"), kademe şartı ("Kalfa seviyesi"), her seviyenin puan bedeli
  ve öğrenme süresi, her seviyenin **somut oyun etkisi**.
- Bağlantı çizgileri ön koşulları gösterir; bir düğüm birden çok düğümden beslenebilir.
- **Gizli yetenekler:** her ağaçta 1–2 düğüm normalde görünmez ("?"); başarı, nadir kitap, usta NPC eğitimi ya da keşifle
  görünür olur ve açılabilir hale gelir.

## 3. Öğrenme süresi ve sıra
- Puan verilince düğüm **hemen açılmaz**; öğrenme başlar. Aynı anda **tek** öğrenme (bütün meslekler için tek sıra).
  Süre gerçek zamandır, oyuncu çevrimdışıyken de işler; bitince düğüm açılır ve bildirim/dönüş kartı maddesi düşer.
- Süre derinlikle artar [PARAMETRE]: Çırak 15 dk / 30 dk / 45 dk; Kalfa 1 sa / 1,5 sa / 2 sa; Kalfa ikinci sıra 2,5 / 3 sa;
  Usta 5 / 6 sa; Pir 12 sa.
- **Süre kısaltma** satılabilir (Berkay'ın gelir kararı): gerçek parayla (Debdebe mağazası) ve ücretsiz yollarla —
  usta oyuncudan eğitim (usta-çırak) süreyi kısaltır, hanın "kitaplık" gibi mekânları küçük indirim verir. Kısaltma
  yalnız süreyi etkiler; puan şartı ve ön koşul parayla atlanmaz.
- Öğrenme iptal edilirse puan iade edilir, geçen süre kaybolur.

## 4. Puan ekonomisi
- Tecrübe barı her dolduğunda o mesleğe özel 1 beceri puanı; bar her puanda biraz uzar [PARAMETRE].
- Bedel derinlikle artar: Çırak 1, Kalfa 2, Kalfa ikinci sıra 3, Usta 5, Pir 7 (seviye başına) [PARAMETRE].
- Demirci ağacını tamamen açmak ~82 puan; meslek başına puan tavanı ~40 [PARAMETRE] → oyuncu dallardan birini seçer.
- **Yeniden düzenleme:** Çırak becerileri asla silinmez. Kalfa ve üstü dağılım belirli bir bedelle (akçe + uzun süre ya
  da özel eğitim) yeniden düzenlenebilir; geri alınan puan iade edilir, öğrenme süresi yeniden işler.

## 5. Kalıcı bilgi ve kimlik
- **Bilgi arşivi:** öğrenilen her beceri ve açtığı tarifler karakterin kişisel arşivinde kalır, yıllar sonra da görünür.
- **Unvanlar:** gerçek işlerle kazanılır ve kalıcıdır (Demirci: "Silah Ustası" — ör. 20 kaliteli kılıç teslimi;
  Çiftçi: "Bereketli Toprakların Sahibi"; Tüccar: "Kervan Üstadı"; Marangoz: "Usta Yapı İşçisi").
- **Profil — Mesleki Geçmişim:** her meslek için kademe ve öğrenilmiş beceriler ("Demircilik — Kalfa — Silah Ustalığı ·
  Aletçilik"), toplam öğrenilmiş beceri sayısı, unvanlar.
- **Meslek ekranı sekmeleri:** Aktif Mesleğim · Mesleki Geçmişim · Öğrendiğim Tüm Beceriler.

## 6. Meslekler arası
- **Sinerji:** iki meslekte belirli beceriler öğrenmiş olmak ortak tarif/iş açar (Demircilik Mekanizma + Marangozluk
  Araç → yay ve arbalet, değirmen mekanizması; Çiftçilik + Aşçılık → özel yemekler; Tüccarlık + Kâtiplik → ticaret
  sözleşmesi ve senet).
- **Ortak üretim zinciri:** madenci cevher → demirci işler → dokumacı zırh astarı → tüccar taşır. Her aşama kendi
  mesleğine tecrübe verir.
- **Usta-çırak eğitimi:** usta/pir oyuncu başkasına eğitim verir; çırağın öğrenme süresi kısalır, öğretmen şöhret ve
  teveccüh kazanır.

## 7. Aletin işe yararlığı (Berkay: "alet ne işe yarıyor?")
Her mesleğin işi bir araç ister ya da araçla çok daha verimli olur; araç kullandıkça aşınır ve yenisi gerekir. Bu,
demirciye kesintisiz talep demektir:
- Çiftçi: saban/orak (hasat +, tarla işleme); oduncu: balta/kazma (sert odun, cevher için şart); marangoz: keser ve
  testere; dokumacı: makas ve iğne; aşçı: kazan ve bıçak; şifacı: neşter; asker: kılıç, mızrak, zırh (nöbet, kervan
  koruma, savunma gücü).
- Aracın **kalitesi** demircinin becerisine bağlıdır (Aletçilik seviyesi ömrü, Tarım Aletleri Ustalığı verimi artırır);
  yapanın adı aracın üzerinde yazar ("Usta Ayşe'nin sabanı").
- Kullanım: kendi işinde kullanmak, NPC'ye ya da oyuncuya satmak, lonca siparişi, armağan.

## 8. Örnek: Demircilik ağacı (görseldeki düzen)

| Kademe | Sol | Orta | Sağ |
|---|---|---|---|
| Çırak | **Aletçilik** 0/3 | **Temel Dövme** 0/3 | **Metal İşleme** 0/3 |
| Kalfa | **Tarım Aletleri Ustalığı** 0/3 ← Aletçilik 3 | **Silah Dövme** 0/3 ← Temel Dövme 1 + Aletçilik 3 | **Zırh Yapımı** 0/3 ← Metal İşleme 3 |
| Kalfa (2. sıra) | **Gelişmiş Aletler** 0/2 ← Tarım Aletleri 3 | **Silah Ustalığı** 0/2 ← Silah Dövme 3 | **Zırh Ustalığı** 0/2 ← Zırh Yapımı 3 |
| Usta | **Mekanizma Ustalığı** 0/2 ← Gelişmiş Aletler 2 | **Efsanevi Silahlar** 0/2 ← Silah Ustalığı 2 | **Özel Zırhlar** 0/2 ← Zırh Ustalığı 2 |
| Pir | | **Şaheser Ustalığı** 0/1 ← herhangi bir usta düğümü 2/2 + Pir kademesi | |
| Gizli | | **Efsanevi Çelik İşçiliği** (görünmesi: 10 şaheser kılıç ya da nadir "Çelik Risalesi") | |

Etkiler (seviye seviye, hepsi yazılı; sayılar [PARAMETRE]):
- **Aletçilik:** 1 nal ve çivi tarifi · 2 sağlam alet tarifi · 3 alet ömrü +1 kullanım.
- **Temel Dövme:** 1 bıçak tarifi · 2 dövmede kömür tasarrufu · 3 onarım hizmeti (başkasının aletini onarma).
- **Metal İşleme:** 1 cevherden külçe · 2 külçe verimi + · 3 bakır/tunç işleme.
- **Tarım Aletleri Ustalığı:** 1 saban · 2 orak ve tırpan · 3 tarım aleti hasat bonusu +%20.
- **Silah Dövme:** 1 mızrak ucu · 2 kılıç · 3 silah kalitesi +%20.
- **Zırh Yapımı:** 1 deri yelek onarımı · 2 zincir örgü (deri ister) · 3 kalkan.
- **Gelişmiş Aletler:** 1 toplu alet siparişi · 2 değirmen ve köprü demiri (marangozla).
- **Silah Ustalığı:** 1 su verilmiş kılıç · 2 silah siparişlerinde öncelik ve teveccüh.
- **Zırh Ustalığı:** 1 pul zırh (deri ustası derisiyle) · 2 zırh dayanıklılığı +.
- **Mekanizma Ustalığı:** 1 kilit ve menteşe · 2 değirmen mekanizması (sinerji: marangozla arbalet).
- **Efsanevi Silahlar:** 1 şaheser kılıç siparişi · 2 ordu siparişi (savaş zamanı).
- **Özel Zırhlar:** 1 ısmarlama zırh · 2 komutan zırhı.
- **Şaheser Ustalığı:** kendi damgası: ürünlerin tanınır, fiyatı artar; Ustalar Levhası'na adın yazılır; lonca kethüdalığı adaylığı.
- **Efsanevi Çelik İşçiliği (gizli):** dönemin en iyi çeliği; yalnız birkaç kişi bilir.

Bedel/süre: Çırak 1 puan, 15/30/45 dk · Kalfa 2 puan, 1/1,5/2 sa · Kalfa 2. sıra 3 puan, 2,5/3 sa · Usta 5 puan, 5/6 sa
· Pir 7 puan, 12 sa. Tamamı ≈ 82 puan.

## 9. Görsel
Klasik RPG ağacı (Berkay'ın gönderdiği örnek): koyu arka plan, hafif yuvarlatılmış kare düğümler, düğüme özgü ikon,
altta seviye rozeti (1/3), kademe bölüm başlıkları, bağlantı çizgileri; öğrenilmiş = parlak çerçeve (mavi), seçili =
altın çerçeve, öğreniliyor = kalan süre halkası, kilitli = karartılmış, gizli = "?" mührü. Üstte meslek adı, kademe,
beceri puanı. Altta seçili düğüm paneli: ikon, ad, açıklama, bu seviyenin etkisi, gereksinimler (✓/✗), "Öğren · N puan
· süre" düğmesi (öğreniliyorsa kalan süre ve "Kısalt"). Ekran dikey kaydırılır, iki parmakla yakınlaştırılır.
Dashboard ya da kart görünümü yok.

## 10. Geçiş (mevcut koddan)
- Mevcut `MeslekIlerleme.dg` (düğüm kimliği listesi) → düğüm başına seviye haritası; eski kayıt boş ağaçla başlar,
  eski düğümler karşılık gelen yeni düğümün 1. seviyesine çevrilir.
- `hizmetEkle` yalnız ana/yan meslek yerine faaliyetin mesleğine tam tecrübe yazar; yan meslek kavramı kalkar.
- Başlangıç puanı kalkar; her meslekte tecrübe kazandıran en az bir temel iş vardır (demirci: basit onarım).
- `dugumAcikMi` her meslekte bakar (zaten böyle).
