# Denge denetimi — dikey dilim (9 Kasım 2026)

Denetçi: `denge-denetcisi` ajanı. Simülasyon: 3 oyunculu kasaba (her meslekten 1), 24 ay, her ay en kârlı iş.
Betikler kapsayıcıda geçici dizindeydi; sonuçlar aşağıda.

## Aylık ortalama akçe

| Durum | Çiftçi | Oduncu | Demirci |
|---|---|---|---|
| Şimdi, 3 oyuncu | 17,6 | 7,6 | 5,0 |
| Şimdi, ayak işiyle | 19,4 | 17,6 | 16,3 |
| Öneri, 3 oyuncu | 17,8 | 19,8 | 16,0 |
| Öneri, 6 oyuncu | 17,0 | 20,2 | 13,0 |
| Öneri, stok kanalı yok | 17,8 | 19,5 | 9,3 |
| Öneri + ayak işi 2 akçe, ayda en çok 3 | 20,0 | 20,6 | 21,3 |

## Sorunlar (dosya:satır, denetim anındaki hâl)
1. Ayak işi azalan getirisi NPC başına (`eylem.ts:76,115`): NPC değiştirerek tavansız ~10,9 akçe/ay.
2. Demircinin kendi temel işi yok ("basit onarım", spec §5.4); temel işten hizmet kazanamıyor.
3. Meslek atlama: her mesleğe 1 başlangıç puanı + düğüm meslek değişince de etkin (`meslek.ts` `dugumAcikMi`) → 14 mesleğin çırak düğümü bedava toplanır.
4. Kıtlık primi ters: satıcının kendisi meslek sayısına giriyor (`npc-taban.ts` `satisDegeri` çağrısı).
5. Meslek doluysa sipariş açılmıyor (`siparis.ts:51`); 6–10 oyuncuda teslim 0.
6. Orman düğümü odunu sert oduna çeviriyor; aynı düğümün kereste tarifi odunsuz kalıyor.
7. `ister` alanı hiçbir yerde uygulanmıyor.
8. Alet değersiz: tahıl satış kotası 6/ay, aletin fazladan hasadı satılamıyor.
9. Hal: kondisyon uzun vadede takat 5'te sabit; "iyi" kademe sürdürülemez; gönülü düşüren bir şey yok.
10. Dökümler eksik: sipariş ödülü dökümü, kalan NPC alım kotası, temel işin sonraki verimi.
11. Panel parametre sınırları takatsiz kâr açabilir: kural `(1 + KITLIK_PRIM) × sipariş çarpanı < NPC_CARPAN` zorunlu olmalı.

## Önerilen değişiklikler
- `mallar.ts`: nal 4→8, sertOdun 4→3, alet 14→24.
- `tarifler.ts`: kereste ve kömür girdisi odun 2→1.
- `temel-is.ts`: ana mesleğin kendi temel işinde azalan getiri penceresi 6→2 ay; sert odun/cevher ayrı usta işi (temel çıktının yerine geçmesin); demirciye "basit onarım" temel işi.
- `npc-taban.ts`: kasaba stok kanalı — oyuncunun NPC'ye sattığı mal stoğa girer, NPC önce stoktan `taban × STOK_CARPAN (1,5)` ile satar; kıtlık sayımında satıcı hariç.
- `eylem.ts`: ayak işi ücreti 3→2, ayda en çok 3.
- `hal.ts`: iş başı kondisyon kaybı 3→2,5; gönülü düşüren olaylar (yalnızlık, husumet, evsizlik).
- `siparis.ts`: ağırlık {boş 3, az 2, dolu 1}; siparişi yalnız malın mesleği ana/yan olan teslim eder; ödül dökümü.
- `meslek.ts`: düğüm yalnız ana ve yan meslekte etkin.
- `yonetim/parametre.ts`: çapraz sınır kuralı (madde 11).
- Oyuncudan oyuncuya ticaret (Faz 3 teklif/pazar) zincirin asıl çözümü; stok kanalı geçici köprü.
