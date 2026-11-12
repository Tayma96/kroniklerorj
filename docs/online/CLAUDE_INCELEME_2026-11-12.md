# Claude incelemesi: P5–P6 / E4.3 (12 Kasım 2026)

Kaynak: `feature/online-p5-darbe-zinciri` (PR #1, taslak), incelenen son commit `94c8ebd`.
Okunanlar: commit geçmişi, PR dosya listesi, CI sonucu, `darbe.ts`, `bolge.ts`, `devlet.ts`, `bolge-do.ts`,
`hizmet-pazari.ts`, `siyaset/tipler.ts`, `Ek B` (siyasi yapı), `E4.3 hizmet planı`, `FAZ8_PLAN.md`.
Okunmayanlar: mobil ekranların tamamı, `mogol.ts`, `mesruiyet.ts`, `MESLEK_AGACLARI.md`, testlerin çoğu.
Hiçbir testi kendim çalıştırmadım; CI sonucuna güvendim (head commit yeşildi).

## Düzeltme hazır (doğrulanmadı)
Dal `claude/diplomasi-outbox` (3 commit, `94c8ebd` üstüne). CI yalnız PR açılınca çalışır, bu yüzden henüz derlenip
sınanmadı. Taslak PR açılıp CI yeşil görülmeden birleştirilmemeli.

1. **Outbox tıkanması.** `BolgeDO.#gonderDiplomasi` alıcıdan `!r.ok` gelince her hatada `return` ediyordu.
   Kalıcı ret (ör. `devlet_yok`, `hedef_uygun_degil`) iletiyi kuyruğun başında sonsuza dek tutar, arkasındaki
   iletileri engeller ve her oyuncu isteğinde yeniden denenirdi. Ayrıca kaynak `taninma: "talepEdildi"`
   durumunda kilitli kalırdı. Düzeltme: 5xx geçici (kuyrukta kalır), 4xx kalıcı (ileti düşer, kaynaktaki bekleyen
   durum kapanır: `online-server/src/siyaset/diplomasi-red.ts`). Hata sonrası, önceki iletilerin silinmesi de
   artık kaydediliyor. Testler: `online-server/test/diplomasi-red.test.ts`.

## Açık bulgular (kararı Berkay verir)
2. **DO↔DO karşılıklı bekleme riski.** `#gonderDiplomasi`, `#sirayla` kuyruğunun içinde karşı DO'yu bekler.
   A→B ve B→A aynı anda giderse (iki alarm da aynı saniyede kurulur) iki taraf birbirini bekleyip kilitlenebilir.
   Çözüm: ileti listesini sıra içinde çıkar, ağ çağrısını sıra dışında yap, sonucu sıraya dönüp uygula.
   Testte yalnız tek yönlü akış kapsanıyor.
3. **Tanınma yalnız iki bağımsız devlet arasında.** Ek B §8.3: tanıma/tanımama kararını diğer *valiler* verir.
   Kodda `taninmaIstekAl` hedefte `devlet` yoksa `devlet_yok` döner, `taninmaYanit` yalnız bağımsız devletin
   beyine açık. Vali bölgesi hiç yanıt veremez.
4. **İttifak hedef listesi** istemcide tüm beylikleri gösteriyor; devleti olmayan hedef otomatik ret veriyor.
   Kullanıcıya "reddedildi" gibi görünür, gerçekte hedef hiç karar vermemiştir.

## Ek B §8.2 (darbe) ile farklar
- Hazırlık izleri Sultan, komşu valiler ve Moğol'a ulaşmıyor; yalnız bölge içi görünürlük var. Yanlış alarm ve
  karşı istihbarat yok.
- Açık ilanda gerekçe ve inandırıcılığa bağlı meşruiyet yok. Tebliğ süresi sabit, aktif oyuncu P90 aralığına
  bağlı değil. Ani baskının daha yüksek yakalanma ve meşruiyet kaybı riski yok.
- Pat: "ateşkes ve fiilî özerklik" yok, yalnız etiket. Bastırma: bölge göstergelerinde düşüş ve itibar kaybı
  görülmedi. Moğol müdahalesi: kukla/ağır haraç/yönetim değişikliği yok (`mogol.ts` okunmadı).
- Mülk kaybı tavanı (bölge başına, kayan pencere) yok. Komşu valiler taraf seçemiyor. Sıradan oyuncu yemin edip
  taraf tutamıyor, yalnız koltuk sahipleri destek/savunma yazabiliyor.
- Eşik: spec "vali desteği" diyor, kod ahi başı sayısını kullanıyor (yorum farkı, onay gerekir).

## Küçük riskler
- `darbeDestekle` başlatanın hesap kümesine bakmıyor, `darbeSavunmaYaz` bakıyor. Koltuk kuralı zaten engelliyorsa
  sorun yok.
- `"catışma"` durum adı Türkçe harfli, diğerleri ASCII. İstemcide yazım hatası riski.
- `hizmet-pazari.ts`: stok/ilan kayıtları (`hs`, `hi`) budanmıyor; DO kayıt boyutu için kontrol edilmeli.
- Stok kapasitesi (20) açık ilandaki adetleri saymıyor; fiilî tavan aylık hazırlama kotası.

## Süreç
- 100+ commit, yarısı docs/düzeltme, mesajlar İngilizce. Birleştirirken squash.
- Kod CI'da derlenerek düzeltiliyor; push'tan önce yerelde `npm run typecheck` çalıştırılmıyor görünüyor.
- Atlanan işler: gelir dengesi testi hâlâ skip, `vergiYatir` bağlantısı, Faz 9, test sürümü, `devir/ekonomi-istemci-yarim`.
