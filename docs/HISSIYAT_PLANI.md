# Hissiyat planı (2 Kasım 2026)

Berkay'ın geri bildirimi: oyun "site gibi", tıklama çok, sonuç hissedilmiyor, pencereler rastgele, "+1 itibar" bir işe yaramıyor.

## Teşhis (ölçüm, 12 hayat)
- İtibar 233 yerde değişiyor, yalnız 11 yerde bir kapı açıyor (şeref 110/10, şöhret 61/13); kapıların çoğu lakap/mersiye.
- Kararların ~%45'inde ilk seçeneğin toplam etkisi ≤5 puan; şenlikler yılda 3 kart (60 yılda ~150 kart, 21 çeşit).
- Ayda ~0,67 kart + %15 ayda dönüm penceresi (dünya haberi, çağ, uzak tanıdığın ölümü, işlemsiz hane teklifi dahil).

## Aşamalar
1. **Az pencere, ağır karar** (yapıldı): dünya haberi/çağ/hane teklifi/aile görevi pencere açmaz, akışta "bu ay"
   şeridine düşer (`pencereAni`); şenlik yılda bir kart, sırayla; öbür şenlikler akışta tek satır (`senlikAni`);
   yönetmende boş ay payı 0,25 → 0,6. Sonuç: kart ~0,47/ay, pencere ayı %11,6.
2. **Rakamlara diş** (yapıldı): kademeler (`unKademesi`, eşik 0/10/30/55/80; itibarda Lekeli yalnız eksi). İtibar →
   çarşı fiyatı (Lekeli +%8; −%4/−%8/−%12, tüccar indirimiyle yığılmaz); şeref → iş geliri (+%3/+%7/+%10; eksi itibar
   −%5/−%10); şöhret 30 iltizam, 55 efsane cenk, 80 destan; korku 30 haydut pazarlığı, 55 kervan güvenliği (eşikler
   kademelere hizalandı). Bildirimde "sonraki kademe · kalan puan"; etkili kademeye çıkış/düşüş anı etkisini yazar;
   sosyal ekranda her eksenin etkisi ve sonraki kazanımı. Nam bildirimleri ancak 3+ puanda.
3. **Kararlar geri döner** (yapıldı): tohum/ip sistemi zaten vardı; geri dönüş olayı artık kökünü (`kok`: hafıza izi) ve
   getirdiğini (`etki`) taşır, pencere "↺ 26 yaşındaki kararın: “Komşunun Yangını”" satırı ve etki çipleriyle açılır.
   Ölçüm (10 hayat): 241 geri dönüş penceresi; kart kökenli %32'nin hepsinde kart adı çözülüyor (öbürleri kart dışı tohum).
4. **Az tıklama** (yapıldı): düzen (`gunlukDuzen`, `duzenAyarla`; Emek panelinde anahtar, varsayılan açık): ay geçerken
   çalışılmadıysa son seçilen tarzla çalışılır, açlık <40 ise ay geçişinden önce ve sonra sessizce yenir (yeni ay boş açlık uyarısıyla açılmaz); çok aylık ilerleme bekleyen tezgâh kararında
   durur; düzen açıkken "çalışmadın" rozetleri yok. Ölçüm (6 hayat, yalnız "Ayı İlerlet"): açık → uygun ayların %100'ü
   çalışıldı, açlık 0, ort. 57 yaş/3.144 akçe; kapalı (eski) → hiç çalışılmadı, ort. 14 yaşta açlık.
5. **Hayatın derdi** (kaldırıldı, 3 Kasım): sonucu olmayan yeni bir panel olduğu için Berkay'ın kararıyla tamamen çıkarıldı.
   Yön artık `docs/superpowers/specs/2026-11-03-radikal-sonuclar-design.md` planındaki kader kırılmalarından gelecek.

Ölçütler `TASARIM_PUSULASI.md`: ölü karar 0, gecikmiş sonucun sebebi %100, görünür gerilim ≤5.
