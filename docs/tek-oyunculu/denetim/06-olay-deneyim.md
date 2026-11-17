# Denetim 6 — olay akışı ve oyuncu deneyimi (17 Kasım)
- ayinSahnesi (events.ts:1654-1704) ağırlık ikilem .28/fırsat .22/kapı .25/boş .6 → ~%50 boş ay. Tekrar koruması yalnız recent_dilemmas son 6 (events.ts:1400; game.ts:11237); hayat boyu görüldü kaydı yok; havuz <146.
- Bariz doğru seçenek: events.ts:39,48,66,75,84 (iyi seçenek bedelsiz). risk alanı yalnız 6 kartta.
- Yankı: applyDilemma (game.ts:11229) izEkle/sowSeed; seedTick (1862); landmark olmayan dönüş "Geçmiş kapını çaldı" (1886) sebepsiz; kok yalnız index.tsx:249.
- Öğretici: sp.tut.b1/kisa tek şerit (index.tsx:424); sp.tut.b2–b6 ve TutorialModal (lib/ui.tsx:332) kullanılmıyor. yeni-oyun tabiat/ocak etkisi önizlemesiz.
- FAB uzun bas 6 ay (_layout.tsx:128) ipucu görünmez; durma month-scene.ts:61. gorevler.tsx yalnız bekleyenler, "bu ay ne yapayım" yok; numberOfLines 1 (61,81).
- Yıl karnesi (index.tsx:329) delta yok. Ölüm/mersiye iyi. Yeni hayat resetGame onaysız (index.tsx:416).
- Erişilebilirlik: 145 label / 256 Pressable; hanedan 36/2. fontSize 10–12 29 yer.
- Performans: clone structuredClone (game.ts:3202) her advance; 6 aylık ilerlemede çok kopya. hanedan.tsx 761, index.tsx 702 satır.
