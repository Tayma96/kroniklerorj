# Y2 — ekonomi sağlığı ve çalışma anı parametreleri

Durum: sunucu tarafında ilk uygulama tamamlandı; doğrulama CI/yerel test çalıştırmasını bekliyor.

## Çalışma anı parametreleri

YönetimDO `parametrelerCalisma` iç iletisi, sürümlü parametre kayıtlarından etkin değerleri döndürür. YerlesimDO her istekte ve aylık alarmda bunları yükler; HesapDO hız sınırını aynı kaynaktan alır. YönetimDO erişilemiyorsa oyun modülleri güvenli kod varsayılanlarına döner. Parametre haritası kasaba kaydına yazılmaz.

Çalışma anında okunan Y2 parametreleri:
- `NPC_AYLIK_KOTA`: NPC'den aylık alım tavanı
- `NPC_CARPAN`: NPC taban alım fiyatı
- `KITLIK_PRIM`: NPC satış ve lonca siparişi kıtlık primi
- `STOK_CARPAN`: kasaba stoğu satış fiyatı
- `SIPARIS_ODUL_CARPANI`: lonca sipariş ödülü
- `TEMEL_CIKTI`: temel iş çıktısı
- `AZALAN_PENCERE_IS`: temel iş azalan getiri penceresi
- `HIZ_SINIRI`: hesap başına dakikalık istek tavanı

Parametre değişikliği ve geri alma, aynı YonetimDO kaydına yazılır. Her yeni oyun isteği etkin sürümü okur; daha önce açık olan DO'lar yeniden başlatılmak zorunda değildir.

## Ekonomi sağlığı

Kurucuya özel `GET /yonetim/ekonomi` uç noktası tüm 37 yerleşimin kimliksiz özetini toplar:
- kayıtlı oyuncu ve NPC sayısı
- oyuncu cüzdanlarının toplamı, ortalaması, medyanı ve min/max aralığı
- son 12 oyun ayının gelir, gider ve net akışı
- kasaba stoğundaki toplam adet ve açık lonca siparişi sayısı

Hesap kimliği, oyuncu adı, bireysel bakiye veya karakter kaydı rapora eklenmez. Henüz oluşturulmamış yerleşim sıfır değerle raporlanır; rapor sorgusu dünyayı tohumlayıp yeni yerleşim oluşturmaz. Ulaşılamayan yerleşim sayısı ayrıca gösterilir.

## Sınırlar

- Bu ilk rapor, para arzı ve oyuncu cüzdan akışını izler; gerçek enflasyon/fiyat endeksi veya tüm mülk/işletme kasalarının birleşik değerlemesi değildir.
- Son 12 ay akışı karakterlerin mevcut defter kayıtlarından toplanır; eski/deftersiz kayıtlar geçmişe dönük uydurulmaz.
- Y2 parametreleri için NPC fiyat/kota, temel iş ve sipariş ödülü regresyon testleri eklendi. YönetimDO parametre okuması ve ekonomi raporu uçtan uca testleri de eklendi.
- Test/typecheck sonucu alınmadan dal birleştirilmemelidir.
