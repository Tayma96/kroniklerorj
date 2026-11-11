# Y3 — gerekçeli oyuncu telafisi

Durum: sunucu ve yönetim panelinde ilk uygulama tamamlandı; CI/yerel doğrulama bekliyor.

## İşlem akışı

- Kurucu panelindeki Oyuncu Telafisi formu hedef hesap kimliği, tür, miktar/eşya, gerekçe ve istek numarası alır.
- Akçe telafisi 1–10.000 akçe; eşya telafisi 1–50 adet aralığındadır.
- Hedef profil ve yönetici profili DunyaDO'dan doğrulanır.
- İki hesabın siyasi kimliği YerlesimDO'dan okunur. Aynı hesap veya aynı yerleşimde aynı haneyi paylaşan hesap kümesi reddedilir.
- Hedef YerlesimDO, telafiyi karakter üzerinde uygular. Akçe karakter defterine varsayılan `diger` kalemiyle yazılır; eşya envantere eklenir.
- Hedefin kroniğine yalnız kendisinin görebildiği `olay.yonetim.telafiAkce` veya `olay.yonetim.telafiEsya` olayı eklenir.
- YönetimDO'da kalıcı telafi olayı, sıra indeksi, gerekçe ve yönetici işlem kaydı tutulur.
- İstek kimliği yönetici + istekNo karmasıdır. Aynı istek yeniden gönderildiğinde yönetim isteği ve hedef karakter isteği tekrar güvenlidir.

## Yetki ve sınırlar

- Telafi oluşturma ve geçmişi görme yalnız Kurucu yetkisindedir.
- Kendi hesap/hane kümesine telafi verilemez.
- Telafi geri alınmaz; yanlış telafi için yeni, gerekçeli düzeltme işlemi gerekir. Otomatik para/eşya yakma yoktur.
- Bu uç mağaza iadesi değildir. Google RTDN ve App Store Server Notifications V2 entegrasyonu ayrı TODO olarak kalır.
- İç YönetimDO → YerlesimDO kimlik ve telafi çağrıları aylık simülasyon/parametre yükleme döngüsüne girmez; böylece Durable Object geri çağrı döngüsü oluşmaz. Telafi, hedef yerleşimin son işlenmiş oyun ayına kaydedilir.

## Doğrulama kapsamı

- Akçe telafisi, aynı istekNo tekrarı, kendi hesap engeli ve yönetim defteri.
- Eşya telafisi ve hedef envanterine yansıma.
- Aynı hane kümesi anahtarlarının farklı hesapları kesiştirmesi.
- Uçtan uca testler eklendi; test/typecheck çalıştırılmadan birleştirme yapılmamalıdır.
