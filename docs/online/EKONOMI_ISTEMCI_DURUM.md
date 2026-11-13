# Ekonomi ve mülk istemcisi — durum notu (11 Kasım 2026)

Dal: `devir/ekonomi-istemci-yarim`. `apk`'ye birleştirilmedi; birleştirmeyi ana oturum yapar.
Bu not GitHub bağlayıcısıyla okuyarak hazırlandı. `tsc`, i18n denetçisi ve testler çalıştırılamadı.

## Yapıldı
- `sahte-ekonomi.ts`: tanımsız `ADLARI` düzeltildi (d8e8ce1). Dosya `ekonomi-veri.ts` tipleriyle elle karşılaştırıldı, başka tip uyumsuzluğu bulunmadı.
- Hata kodları (`ilan_*`, `ismarlama_*`, `mal_yok`, `para_yok`) `eko-hata.ts` ve `protokol.ts` içinde tanımlı.

## Eksik (okuyarak doğrulandı)
1. **Ekranlar yok:** `EkonomiGirisi` (ekonomi-ui.tsx) ve `pazar.tsx` şu yollara gidiyor, dosyaları dalda yok:
   - `/online/ismarlama` → `mobile/app/online/ismarlama.tsx`
   - `/online/levha` → `mobile/app/online/levha.tsx`
   - `/online/defter` → `mobile/app/online/defter.tsx`
   İstemci tipleri ve sahte istemci (`ismarlamalar`, `ismarla`, `cevap`, `levha`, `defter`) hazır; yalnız ekran eksik.
2. **Çeviri dosyası yok:** `eko-hata.ts` başlığı `i18n-sayfa/online10.ts` diyor, dosya yok ve `i18n-sayfa/index.ts` içinde kayıtlı değil.
   Şu anahtar aileleri tanımsız görünüyor: `onl.pz.*`, `onl.eko.*` (q.0–3, k.*, yapan, baslik, pazar/ismarlama/mulk/levha/defter ve `.alt`), `onl.mal.*`, `onl.nb.*` (nabız), `onl.hh.<kod>` (ekonomi ve mülk hata kodları), `onl.is.akce`, `onl.is.tamam`. Mülk/işletme ekranlarının anahtarları henüz çıkarılmadı.
   Biçim: `"anahtar": [tr, en, es, pt, ar, ru]`.
3. **Okunmadı:** `mulk.tsx`, `isletme/[id].tsx`, `mulk-veri.ts`, `sahte-mulk.ts`.

## Sıradaki
1. `online10.ts` (pazar + ekonomi ortak + nabız + ekonomi hata kodları) yaz, `index.ts`'e ekle.
2. Mülk/işletme anahtarlarını çıkarıp `online11.ts` yaz.
3. `ismarlama.tsx`, `levha.tsx`, `defter.tsx`: önce kısa tasarım notu, sonra kod.
4. İş sonunda ana hesapta: `npx tsc --noEmit`, `node scripts/_smoke/i18n-icon-check.cjs`, `node scripts/_smoke/dil-karisma.cjs`.
