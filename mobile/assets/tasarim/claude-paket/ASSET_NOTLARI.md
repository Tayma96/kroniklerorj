# Asset Paketi – "Bir Ay Daha" UI

mockup_full.png  -> Nihai referans. Her ekran bununla yan yana karşılaştırılacak.
assets/*_REF.png -> Mockuptan birebir kırpılmış referans görseller (1x, düşük çözünürlük).

## Kullanım kuralları
1. *_REF dosyaları GEÇİCİ yer tutucudur. Oyunda ilk sürümde bunlar kullanılabilir, nihai üründe yüksek çözünürlüklü sürümle değiştirilecek.
2. Üzerlerinde YAZI GÖMÜLÜ olanlar (kodla ayrıca yazı BASMA, çift yazı olmasın):
   - hero_town_REF: "Bir Ay Daha / 1247 · Yaz" + ikonlar + portre kenarı gömülü
   - city_market_header_REF: "Demirhan / 1247 · Yaz" + ayar ikonu gömülü
   - card_pazar/mahalle/mulkler/hanedan_REF: başlık + açıklama + ok gömülü
   - npc_aybike_forge_REF: portre kenarı gömülü
   Bunların YAZISIZ temiz sürümleri gerekir (aşağıda "Temiz görsel" bölümü).
3. Yuvarlak portreler ve pusula düğmesi alfa kanallı (şeffaf köşe) PNG'dir.
4. Kırpma koordinatları mockup_full.png (1477x1065) üzerindedir.

## Temiz görsel gereksinimi (yüksek çözünürlük, YAZISIZ, UI'sız)
- hero_town: 1080x600, Anadolu Selçuklu kasabası, köprü, dağlar, yaz ışığı
- npc_aybike_forge: 1080x720, demirhanede çekiçle çalışan kadın demirci
- city_market_header: 1080x640, minareli şehir pazar meydanı
- card_*: 540x400 her biri (pazar, mahalle sokağı, taş mülk/tarla evi, hanedan iç mekânı)
- portrait_boran, portrait_aybike: 512x512 kare (maskeyi kod uygular)
- war_scene_bg: 600x600, atlı akıncılar, sisli, soluk

## Bot için ek kural
Kırpılmış _REF dosyaları AYNEN kullan; yeniden çizme, yeniden boyutlandırırken oranı bozma.
Yazı gömülü görsellerde başlık/ok için ayrıca UI öğesi EKLEME; temiz sürüm gelince ekle.
