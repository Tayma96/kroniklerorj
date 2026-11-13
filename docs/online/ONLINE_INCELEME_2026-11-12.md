# Çevrimiçi yapı incelemesi (12 Kasım 2026) — salt okunur

Kapsam: `apk` dalı, commit `4accda5` (10 Kasım). Yalnız okundu; `apk`'ye ve başka bir dala yazılmadı. Paralelde başka bir
yapay zekâ (ChatGPT) oyunu taslak olarak geliştirdiği için bu not yalnız `devir/ekonomi-istemci-yarim` dalındadır.
Çalıştırılamadı: `tsc`, sunucu testleri, i18n denetimleri. Aşağıdaki her bulgu koddan okunarak çıkarıldı;
"doğrulanmadı" yazanlar varsayımdır. Tek oyunculu oyun incelenmedi.

## 1. Mimari
- `online-server/`: Cloudflare Worker `kronikler-online` + SQLite Durable Object'ler. `HesapDO` (Google `sub` başına: kimlik,
  profil, hız sınırı, iletileri yönlendirme), `DunyaDO` (tek örnek: saat + beylikler), `YerlesimDO` (yerleşim başına; `motor.ts`;
  NPC nüfusu, karakterler, olay defteri, ekonomi kaydı `ek`; alarm UTC 09:00 ve 21:00), `YonetimDO` (tek), `MasaDO` (han masası,
  WebSocket, ses yetki kapısı), `IsletmeDO`, `BolgeDO` (bölge başına), `SultanlikDO` (tek). Göçler v1–v6.
- Kurallar saf modüllerde (`yerlesim/`, `mulk/`, `siyaset/`, `han/`, `debdebe/`, `yonetim/`), DO dosyaları ince sarmalayıcı. Uç listesi `index.ts` başlığında.
- Kimlik: Google ID token (RS256, JWKS önbellekli) → 30 günlük HMAC oturum. Yönetici belirteci ayrı anahtar, 12 saat.
- Eski çok oyunculu `server/` + `mobile/lib/mp/` ayrıdır ve dokunulmaz. `apk`'ye `server/**` push'u eski sunucuyu otomatik dağıtır.
- Mobil: `mobile/lib/online/` (HTTP `istemci.ts`, `protokol.ts` tipler ve type-guard'lar, `sahte-*.ts` önizleme istemcileri),
  `mobile/app/online/*` ekranlar, metinler `lib/i18n-sayfa/online*.ts` (`[tr,en,es,pt,ar,ru]`).
- Devir notuna göre (10 Kasım) sunucuda 334 test geçiyordu. Bu incelemede çalıştırılmadı.

## 2. Sunucu ↔ istemci (`apk`)
| Alan | Sunucu | İstemci |
|---|---|---|
| giriş, profil, davet, yerleşim, olaylar, kişi, eylem, tanıdık | var | var |
| meslek, beceri ağacı, temel iş, tarif, sat, sipariş, lonca | var | var |
| teklif, dostluk, gelen kutusu, düzen (toplum) | var | var |
| hanedan, kronik, üçgen, barınma, dönüş, han, masa + ses | var | var (ses cihazda denenmedi) |
| pazar, ısmarlama, levha, defter (Faz 6) | var | **yok** (yarım dalda kısmen) |
| mülk, işletme (Faz 12) | var | **yok** (yarım dalda kısmen) |
| siyaset (Faz 7, Ek B P1–P4) | var | yok |
| topluluk, Meşrep, Debdebe mağazası ve Dene | var | yok (devir notu "istemci ekranları" listesinde) |
| Faz 8 + Ek B P5–P6 (çatışma, darbe, bağımsız devlet) | yok | yok |

## 3. Kod kontrolü bulguları
İyi olanlar: `oturum.ts` sabit süreli imza karşılaştırması ve sıkı biçim denetimi; `google.ts` alg/kid/iss/aud/exp/iat/sub denetimi,
bilinmeyen `kid` için JWKS yeniden çekimi 60 sn ile sınırlı; gövde en çok 16 KB; hata gövdesi yalnız kod; CORS yok; yönetici ve oyuncu
belirteçleri ayrı; ekonomi yazmaları `ekonomiYaz` kabuğunda istekNo'lu (yeniden deneme güvenli); pazar işleminde akçe
korunumu doğru (`net + bac = tutar`, bac kasaba hazinesine).

Bulgular (öncelik sırasıyla):
1. **Orta, anonim uçlar:** `/v1/dunya` ve `/v1/giris` kimliksiz; `/v1/dunya` tek `DunyaDO` örneğine gider. Hız sınırı yalnız
   kimlikli hesapta (`HesapDO`). Anonim trafik hem tek DO'yu hem Workers ücretsiz kotasını doldurabilir. Öneri: `dunya` yanıtını
   30–60 sn önbellekle ya da Cloudflare hız sınırlaması ekle.
2. **Orta, ortak hız kovası (doğrulanmadı):** `hesap-do.ts`'de `debdebeIade` dışındaki bütün iletiler aynı `hizKontrol`'den geçiyor (30/dk).
   Ses uçları (`oturum/yayin/dinle/anlas/kapat`), han eylemi ve ekranların GET'leri aynı kovada. Aktif sesli masada 429 `hiz_siniri` çıkabilir.
   Öneri: ses ve han için ayrı kova ya da sınırı parametreye bağla (Y2'de `HIZ_SINIRI` okunacak).
3. **Düşük, gövde okuma:** `govdeOku` `content-length` yoksa gövdeyi tamamen okuyup sonra uzunluğa bakıyor; `metin.length` UTF-16 birimi sayar
   (16K karakter, 48 KB bayta kadar çıkabilir). Oturum doğrulandıktan sonra çalıştığı için risk düşük.
4. **Düşük, hata kodu uyumu:** sunucuda `HATA_DURUMU`da olmayan kod 500 döner; istemcide `hataKoduMu` bilmediği kodu HTTP durumuna düşürür
   (`gecersiz_istek` / `sunucu_hatasi`). Yeni sunucu kodları `mobile/lib/online/protokol.ts` / `eko-hata.ts` ve `i18n` `onl.hh.<kod>` ile birlikte eklenmeli.
5. **Düşük, savunma (doğrulanmadı):** `pazar-tahta.ts` `ilanIsle` satış ilanında emanet partilerinin toplamı `ilan.n`'e eşit varsayıyor;
   `partiAyir` eksik `p` ile sessizce 0 mal verir, alıcı akçe öder. İşlemden önce toplam kontrolü eklenebilir.
6. **Düşük, doğrulanmadı:** `ilanDonumu` ilan sahibini `k.kar.get(ilan.o)` ile çözer; sahip yüklü değilse emanet hazineye/stoğa gider.
   Ay dönümünde `k.kar`'ın bütün sakinleri içerdiği `motor.ts`'te doğrulanmadı.
7. **Düşük, bakım:** `hanGovdeli`, `toplulukGovdeli`, `ekonomiGovdeli` ve `/v1/sikayet` aynı gövdeli-ileti kalıbını kopyalıyor.
8. **İstemci:** oturum belirteci `AsyncStorage`'da (`expo-secure-store` yok; devir notunda açık). `lib/online/kapi.ts` `ONLINE_GELISTIRME`'yi `../mp/config`'ten alıyor.
9. **Dağıtım:** `wrangler.toml`'da `GOOGLE_CLIENT_ID=""` ve `REALTIME_APP_ID=""` boş (elle dağıtım). Realtime API biçimi belgeye bakılmadan yazıldı;
   dağıtımdan önce Cloudflare SFU belgesiyle karşılaştır.
10. **Belgeler:** `docs/online/FAZ_DURUM.md` 3 Kasım'dan kalma; Faz 3+ için "yok" diyor ama sunucuda var. Güncel olan `DEVIR_2026-11-10.md`.

## 4. Yarım ekonomi/mülk istemcisi (`devir/ekonomi-istemci-yarim`)
Ayrıntı: `docs/online/EKONOMI_ISTEMCI_DURUM.md`. Özet: `ADLARI` düzeltildi; `ismarlama.tsx`, `levha.tsx`, `defter.tsx` yok; `i18n-sayfa/online10.ts`
yok ve `index.ts`'te kayıtlı değil; `mulk.tsx`, `isletme/[id].tsx` anahtarları çıkarılmadı. Sunucu uç şekilleri `ekonomi-uclar.ts` ile
`mobile/lib/online/ekonomi-veri.ts` tipleri karşılaştırıldı, `sahte-ekonomi.ts` ile uyumlu görünüyor.

## 5. Çakışma notu
`apk` ucu `4accda5` (10 Kasım, Claude). Diğer dallar: `claude-dev`, `claude/*` (3), `feature/online-p5-darbe-zinciri`, `faz2-istemci-yarim`,
`apk-release-test-2026-10-25`. ChatGPT'nin hangi dalda çalıştığı bilinmiyor. Birleştirmede çakışma çıkarabilecek ortak dosyalar:
`lib/i18n-sayfa/index.ts`, `lib/online/protokol.ts`, `lib/online/istemci.ts`, `lib/online/onizleme.ts`, `lib/screen-design.ts`.
Bu dalda yalnız yeni dosya eklendi (`online10/11`, ekranlar, notlar); ortak dosyalara dokunulursa önce ana oturumla birleştirme planı yapılmalı.

## 6. Sıradaki işler (Claude, yalnız bu dalda)
1. `online10.ts` (pazar, ekonomi ortak, nabız, ekonomi hata kodları) + `index.ts` kaydı.
2. Mülk/işletme anahtarları → `online11.ts`.
3. `ismarlama.tsx`, `levha.tsx`, `defter.tsx` (önce kısa tasarım notu).
4. İş sonunda ana hesapta: `npx tsc --noEmit`, `node scripts/_smoke/i18n-icon-check.cjs`, `node scripts/_smoke/dil-karisma.cjs`, `cd online-server && node --test "test/*.test.ts"`.
