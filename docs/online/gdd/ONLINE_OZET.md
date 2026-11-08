# ONLINE ÖZET (ajan için, ≤3 KB)

Kaynak: `KRONIKLER_ONLINE_GDD.md` v0.4, Ek A, Ek B. İşin ilgili bölümünü oku; çelişkide ana belge geçerli, çelişkiyi raporla.

- **Ürün:** online yaşam simülasyonu, kalıcı paylaşımlı dünya. Kurgusal bölgeler; tek Sultan (başta NPC) + 5–7 Vali + Moğol dış güç (NPC). D-05′ onay bekliyor.
- **Zaman:** 12 gerçek saat = 1 oyun ayı (00:00/12:00 TR). Takvim görünür, ortak tur kapısı yok. Sayaç çevrimdışıyken de işler.
- **Sunucu otorite**, idempotent, `WorldEvent`. Online, SP ile hiçbir veri paylaşmaz. Google girişi.
- **Gelir:** yalnız Debdebe (görünüş). Gerçek para güç, gelir, ilerleme, bekleme satmaz. `cosmetic` alanı ayrı; oyun mantığı okumaz. Akçe paraya çevrilmez. Paralı kutu yok.
- **Han:** serbest sohbet oyunu bağlamaz. Butonlu eylemler (yemin, sözleşme, ittifak, ihbar, meydan okuma) olay üretir, masa katılım listesi yazılır. Sohbet ve ses saklanmaz. Önce metin.
- **Mülkiyet:** oyuncu işletmeleri. Kasa, rezervasyon, ayar tek Durable Object. DO’lar arası para: işlem kimliği + emanet + uzlaştırma. Kapasite parayla artmaz.
- **Barınma:** ilk yerleşimde 48 saat ücretsiz; sonra uyarı, +24 saat Evsiz, +72 saat can kaybı. **Can tabanı %10, ölüm yok.** Diğer şehirlerde 12 saat, şehir başına bir kez. Otomatik konaklama opt-in.
- **Meslek (Ek A):** 14 meslek; temel iş herkese açık. Hal (can, kondisyon, gönül) / Sanat / Meşrep. Gizli sayı yok.
- **Siyaset (Ek B):** darbe aşamalı ve eşikli; ana §10 savaş kuralları geçerli. Hiçbir oyuncu zorunlu savaşçı değil.
- **Yasak:** [AÇIK KARAR] kesinleştirme; ücretli servis, deploy, commit, push; SP’yi değiştirme.
- **Faz sırası:** 0 denetim → 1 kimlik → 2 olay/zaman → 3 dikey dilim (+E1, E2) → 4, 6, 10 → 11 → 14, 12, 13 → 5, 7, 8, 9 → E3–E7, 15–17. Ek B P1–P6 bölgesel yapı için.
