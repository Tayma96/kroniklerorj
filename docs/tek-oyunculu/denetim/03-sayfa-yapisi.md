# Denetim 3 — sayfa yapısı ve gezinme (17 Kasım)
- Sekmeler: index, karakter, iliskiler, menu + orta "Ay İlerle" (_layout.tsx:101-162); 31 rota href:null (217-248).
- Yetim rota: divan (menu-data:56 kaldırılmış; _layout:244 kayıtlı).
- Çok girişli: npc/[id] 10+ (normal), hanedan 6, pazar 5+, orgutler 5, karakter 5+, ayarlar 4, nesil 4; tarih'e ana ekrandan 3 düğme (index:384, 441, 444).
- Çakışmalar: aile (hanedan 782 satır + nesil + ocak + karakter/OcakSekmesi); defter (tarih+roman aynı state.history, kronik, hikayeler≈gorevler arc listesi, haberler, sosyal söylenti = ana ekran gündem); iş (pazar, atolye, meslek; emek.tsx = jenerik ama gerçek emek EmekPanel karakter.tsx:55,68); insanlar (iliskiler, sosyal, mahalle, hanedan — 4 liste npc'ye); sehir 9 kartı = menu-data şehir grubu kopyası; ayarlar menüde 2 kez.
- Ana ekran ~12–15 etkileşimli öğe, 5–7 blok (MkHal, MkKirilma, MkDecision, AyOzeti, uyarı çipleri index:669-687) → 3–5 gerilim ilkesini aşıyor.
- Menü 21 kart / 4 grup. Yaş kapısı menu-data:19-49 (RESIT 13). Rotalar korumasız.
- Öneri 5 sekme: Bugün / Ben (karakter+beceri+aile) / İnsanlar (iliskiler+sosyal+mahalle+copcatan) / Şehir (çarşı-iş: pazar+atolye+meslek, mülk, mektep, harita/diyar, haberler) / Defter (tarih+roman+kronik+başarım+hikâye/görev+ayarlar/sss/krediler). Güç (örgüt/savaş/suç) 13+. emek→krediler.
