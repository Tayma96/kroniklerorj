# NPC hafızası ve geçmiş konuşması — 12 Ekim 2026

GDD §4.1/§5.4 doğrultusunda mevcut anı cephesi genişletildi. Aynı yardım kişiliğe göre farklı ağırlık taşır: denetimde cömert +25, dindar +22, kurnaz +13 anı yükü; aynı başlangıçtaki etkin görüşler 44/40/31 ve konuşma ağızları farklı. Bu deney aynı NPC başlangıcının üç kişilik varyantıdır; tek bir canlı sahnede üç ayrı tanığa yayılımın kanıtı değildir.

Yeni anılar opsiyonel kimlik, olay referansı, sahip, konu, görgü/katılım kanıtı, kesinlik ve ilk kaynak halkasını taşır. Mevcut `remember`/`addMemory` çağrıları korunur; eski anılara yük geriye dönük yeniden hesaplanmaz. Anı tavanı 24 ve travmaların korunması aynı. Otomatik sohbet göndermesi son küçük sohbet yerine en belirgin anıyı seçer; aynı ay anılan anıyı tekrar seçmez.

Kişi profilinde belirgin bir anı ve tarihi görünür; **Geçmişi konuş** onun gerçek anısından ve kişiliğinden cevap verir. Eylem kişi başına ayda bir, yalnız yaşayan ve aynı yerdeki kişiyle; para/ilişki/XP/ay ödülü yok. Son anılma güncellenir, oyuncunun kroniğine dilden bağımsız kimlik ve parametrelerle yazılır. Kişinin eski serbest metin günlükleri önceki dilde kalabilir; tüm geçmiş sohbetlerin yeniden yerelleştirilmesi bu dalganın tamamlanmış işi değildir.

Doğrulama: 10.798 hedefli örnek; tüm anı türleri/kişilikler/altı dil/iki oyuncu cinsiyeti, kalıcı/solan anı, eski gövde, tur kilidi, uzak/ölü kişi, vâris yolu ve kronik dil değiştirme. Gerçek motor yardım→ay ilerletme→geçmiş konuşması altı dilde 320×568 / 4× CPU'da; ayrıca hakaret→ay ilerletme→hediye örneğinde ağır kırgınlık seçildi. Yedi örnekte kaynak/tur değişmedi, hata yok. Tip, dil/ikon, göç ve protokol paritesi temiz; 6 hayat/39.379 gerçek diyalog satırı ve 12 hayat/16.644 olay yazımı temiz. Karakter aynasında yardımsever/zalim tavırları ve vâris yönleri ayrıştı.

30 hayat/20.173 ay: boş ay %11,4, tekrar %4, bunalma %0,3; en çok üç açık gerilim; gecikmeli sonuçlarda sebep %100. Android/Hermes paketleme başarılı; yeni APK/telefon testi yok. Bu dalgada 300 hayat kontrol noktası tekrarlanmadı; motor dalgaları için mevcut 4–5 dalga kadansı sürer.

Davranış tabanı değişimi ayrıca kayıtlıdır: önceki motor eski 10 akış/3 sentetik örnek hash'ini yeniden aynen üretti. Yeni motorun yalnız `sohbet` hash'i (yeni anı alanları/kişilik ağırlığı) değişti; diğer dokuz akış ve üç sentetik 30 ay aynı. Mevcut taban bu gerekçeyle güncellendi; bunlar gerçek kullanıcı altın kayıtları değildir.

**GDD açıkları:** altı boyutlu artımlı görüş vektörü/ucuz eski izlenim; tek olayın birden çok canlı tanığı; üç halkalı bozulabilen dedikodu ve kesinliği tüketen kararlar; NPC LOD/perf bütçesi; 3–6 turlu tonlu konuşma. Kaynak zinciri/kanıt alanlarının varlığı bu sistemleri uygulanmış kılmaz. Mevcut kişilik, nüfus, hedef, görüş/şans dökümleri ve miras davranışı üstüne ilerlenir.

## Yaşayan üç şahit — sonraki dalga

Önceki bölümdeki üç kişilik varyantı deneyi canlı sahne değildi. Artık açık sadaka aynı sahnede
üç yaşayan kişiye ayrı görgü anısı üretir; gerçek görüş farkı ve konuşma doğrulanır. Hakaretin
muhatabı ayrıca kişisel anı taşır ve şahit havuzundan çıkar. Ortak olay tek söylentiye döner.
Profil, özet, görüş gerekçesi ve otomatik gönderme, görgüyü kişisel mağduriyet gibi anlatmaz.
Ayrıntı/kabul kapsamı `SAHITLER.md`; kanıta dayalı soruşturma, artımlı vektör ve izlenim hâlâ açık.
