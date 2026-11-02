# Sinematik etkileşimli dövüş — plan (2 Kasım 2026)

Kaynak: Berkay'ın kararları + ChatGPT GDD'si (3D karakter/düello; ordu savaşı şimdilik dışarıda).
Oyun metin tabanlı kalır. **Altın kural:** oyuncu karar verir → oyun hesaplar → sinematik sonucu canlandırır.

## Oynanış
- **Yüzleşme:** dövüşten önce hikâyeli durum + 4 seçenek (ör. konuş / saldır / gard al / kaç). Her seçenek
  stat ve eşyayla hesaplanır (karizma-nam, güç-çeviklik, zırh-kalkan, çeviklik-binek); başarı / kısmi / başarısız.
- **Turlar:** mevcut motor (`lib/combat.ts`: hamle, savuştur, özel, toparlan; rakip niyeti; arketip). Seçenek
  metinleri hikâyeli; rakip niyeti hikâyeli satır ("kılıcını omuz hizasına kaldırıyor…").
- **Sinematik + anlatı satırı:** her sonuç 2–4 sn klip, altta/üstte kısa anlatı; atla düğmesi; sade modda kare.

## Görsel ilke (Berkay şartı)
- **Birebir uyum:** metin klipten yazılır. "Sıçrayıp tepeden indir" diyorsa klipte o hareket var; "yere sağlam
  basıp karşılar" diyorsa o. Başarı / kısmi / başarısız ayrı klip.
- **Tutarlılık:** aynı karakterler, aynı mekân ve ışık; her klip sabit "duruş kapılarından" birinde başlar ve
  biter (ör. orta mesafe-gard, kılıç kilidi) → klipler kesintisiz art arda gelir.
- **Yöntem:** Blender'da gerçek 3D koreografi, önceden işlenmiş video (telefon yalnız oynatır; en gerçekçi ve
  en güvenli yol). Yapay zekâ görüntüsü ve videosu kullanılmaz (tutarsızlık). Canlı 3D ileride yalnız karakter
  sayfası için düşünülebilir.

## Kaynaklar (ücretsiz, ticari serbest, yapay zekâ yok)
MPFB/MakeHuman gövde, Poly Haven/ambientCG CC0 doku ve HDRI, CMU hareket kaydı, Quaternius Universal Animation
Library (CC0). Mixamo yok (bilgisayar yok); gerekirse ileride bir bilgisayardan eklenebilir.

## Yüzleşme katmanı (kuruldu, 2 Kasım)
- `lib/yuzlesme.ts` (saf çözücü), `game.ts` `applyYuzlesme` (kavgasız kapanış: söz / haraç / kaçış / kaçış bedeli),
  `lib/i18n-yuzlesme.ts` (6 dil), `app/oyun/savas.tsx` paneli. Türler: eşkıya (haydut, korsan, reis), hayvan (ayı,
  canavar), düello (meydan okuma, Kara Alp, Bozkır Kurdu); ordu, turnuva, hasım ve Gölge Okçusu doğrudan dövüşe gider.
- Ay hakkı girişte yanar; kavgasız sonuç ödül kapısını kapatır. Kavgaya dönen sonuç açılışa işlenir (rakip canı,
  oyuncu canı, nefes, üstünlük) ve anlatısı dövüş günlüğüne düşer.
- Klip eşlemesi: her `yz.<tür>.<seçim>.<sonuç>` bir klip. Metin önce yazıldı; klip çekilince metin klibe göre düzeltilir.

## Aşamalar ve onay kapıları
1. **Kalite kanıtı** (sürüyor): tek piyade, gerçekçi kıyafet/zırh/miğfer/kılıç; bekleme + kılıç saldırısı; telefonda
   video. Kapı: "gerçekçi ve akıcı".
2. **Tek karşılaşma — haydut pususu:** yüzleşme + 4 seçenek + 2–3 tur + son; 8–12 klip; 6 dil metin; ses (efekt,
   müzik, NPC sesi). Erkek oyuncu + kılıç. Kapı: telefonda oynanır.
3. **Genişleme:** diğer karşılaşmalar ve rakip tipleri, kadın oyuncu, silah tipleri, mekânlar.

## Kısıtlar
Ekran kartı yok: iki karakterli 2–3 sn klip ~45 dk işleme. APK'ya klip başına ~0,3–0,6 MB (720p). Ordu savaşı sonra.
