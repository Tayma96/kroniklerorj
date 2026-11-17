# Denetim 2 — kariyer, eğitim, işletme (17 Kasım)
- Mektep: oyuncunun SUBJECTS (game.ts:7496) 4 ders + 3 kulüp, 7–17 yaş, ayda 4 enerji/2 iş; her 4 derste sınav (7608), ilk 3 geçiş puan. 11 SCHOOL_EVENTS otomatik (%40). Kazanç +5 beceri XP, +5–6 stat-XP. exam_wins yalnız divan girişinde (12555). Hoca NPC değil (mektep.tsx:39). 18+ ölü sayfa (menu-data.ts:37). EDU_TRACKS (237) evlat eğitimi, vâris bonusu ≤+3.
- Meslek 13 yaşta ATANIR (3305–3314), seçim yok; usta NPC + 3 puan. Kapı meslekSarti (8815): stat≥4/5/6, beceri XP≥40/100/160, sermaye tüccar 120/hancı 150/kuyumcu 250. changeProfession (7441) her şeyi sıfırlar. 15 meslek×4 kademe, 30 ay + peştamal sınavı (8767–8807, 3 yol, %8–92, 6 ay bekleme). MESLEK_YOLLARI hepsi workBonus 0.12 (2998). WORK_STYLES 4 (5683).
- Meslek başına içerik aynı kalıp: 6 iş olayı otomatik %30 (5784), 4 tezgâh kartı ömürde 1 (5940), 1 imza eylemi (5829), 2 şaheser, yalnız 4 meslekte tarif (12656). profession=== ~25 yerde; dış etki asker/kâtip/demirci/şifacı.
- İşletme yok: han geliri 0.6+(refah+güvenlik)/250 (4056), dükkân çarpan (4055). Hancı↔han bağı yok. 6 mülk tipi (284). Atölye 16 tarif, meslek kilidi yok.
- FACTIONS 5 (1216), meslek şartı yok (9547); npcLonca var olmayan "edebiyat" (1357); 5 meslek loncasız; meslek ekranı "lonca" sekmesi ≠ orgutler.
- Yaş akışı: 0–6 boş; 7–12 mektep+uğraş; 9 hayal; 10/12 kader anı; 13 meslek atanır + menüler açılır; 15 gönül; 16 mülk; 18 divan.
- Tekrar: sosyal/iliskiler; tarih/roman/kronik/hikayeler; divan etkisiz; emek.tsx = credits.
