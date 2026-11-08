# Dikey dilim (sunucu): Hal + üretim zinciri + NPC siparişi — uygulama planı

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** Ana tasarım §8 sıra 3'ün sunucu yarısı: E1 Hal göstergeleri, E2 çiftçi–oduncu–demirci zinciri (tarif,
alet aşınması, NPC'ye satış), lonca siparişi (NPC gündemi + hizmet + sosyal tepki + teşekkür izi).

**Architecture:** Saf modüller `src/yerlesim/hal.ts`, `tarif.ts`, `pazar.ts`, `siparis.ts` + testler; `motor.ts`e
`#tekrarGuvenli` kabuğuyla yeni uçlar. Karakter alanları opsiyonel. Hal tembel güncellenir (takat deseni: son
işlenen ay damgası), ay dönümü karakter yüklemez.

**Spec:** `docs/superpowers/specs/2026-11-08-cevrimici-ana-tasarim-design.md` §5.4–5.6, Ç5; Ek A §2.1, §1.5.

## Global Constraints
- Yalnız `online-server/`. Sayılar `[PARAMETRE]` yorumlu dışa aktarılmış sabit.
- Akçe kaynağı yalnız takatle sınırlı işlerden (NPC'ye satış aylık kotalı, sipariş tek seferlik); toplam akçe
  testinde para yalnız tanımlı kaynak/giderden değişir.
- Gizli sayı yok: Hal etkileri ve nedenleri yanıtta döküm olarak döner.
- Can tabanı %10 (can 10'un altına inmez; ölüm yok bu fazda).

## Review Focus
1. Eski karakter (`hl` yok) → tam Hal ile başlar, çökme yok.
2. Aynı istekNo ile tarif iki kez → girdi bir kez düşer.
3. Girdi eksik tarif → `girdi_yok`, takat/kondisyon değişmez.
4. Sipariş iki oyuncu tarafından aynı ayda teslim edilmeye çalışılır → yalnız ilki alır, ikinci `siparis_kapandi`.
5. NPC'ye satış kotası ay değişince sıfırlanır; negatif/kesirli adet reddedilir.

### Task 1: Hal (`hal.ts`)
- Karakter `hl?: [can, kondisyon, gonul, ay]` (0–100). `HAL_TABAN_CAN=10`, `KONDISYON_AYLIK_TOPARLAMA=15`,
  `CAN_AYLIK_TOPARLAMA=5`, `GONUL_DENGE=50` (aylık 5 dengeye yaklaşır), `IS_KONDISYON=4`.
- `halAl(k, ay)`: tembel toparlama; `halDegistir(k, ay, {can?, kondisyon?, gonul?}, neden)`.
- `kondisyonKademesi(kondisyon)`: ≥60 "iyi" → 6 takat/ay, 30–59 "yorgun" → 5, <30 "bitkin" → 4.
  `karakter.ts` `takatTazele` aylık miktarı bu kademeden alır (mevcut testler bozulmamalı: varsayılan iyi).
- `halGorunumu(k, ay)`: değerler + kademe + her göstergenin etkisi (anahtar) + son nedenler (en çok 3).
- Temel iş ve tarif `IS_KONDISYON` düşürür; sohbet/yardım eylemi gönül +3 (eylem.ts'e küçük bağ).
- `/v1/yerlesim` yanıtındaki `ben`e `hal` eklenir.
- Testler: tembel toparlama, taban, takat kademesi, eski kayıt.

### Task 2: Tarif ve alet aşınması (`tarif.ts`, içerik `src/icerik/tarifler.ts`)
- `Tarif { id; meslek; dugum; girdi: Partial<Record<MalId, number>>; cikti: [MalId, number]; takat; hizmet; arac?: MalId }`.
- Başlangıç: `kereste` (oduncu.orman.0, odun 2 → kereste 1), `komur` (oduncu.maden.0, odun 2 → komur 1),
  `nal` (demirci.alet.0, cevher 1 + komur 1 → nal 2), `alet` (demirci.alet.1, cevher 2 + komur 1 + kereste 1 → alet 1),
  `hasat` (ciftci.ekin.0, girdi yok, takat 2 → tahil 3; `arac: alet` envanterdeyse tahil 5),
  `kirkim` (ciftci.suru.0, takat 1 → yun 2).
- Araç aşınması: karakter `as?: Record<MalId, number>` kullanım sayacı; `ALET_OMRU=4` kullanımda 1 alet tükenir.
- `tarifYap(k, id, ay)`: düğüm açık (meslek değişse de açık kalan düğüm geçerli), girdi var, takat var →
  girdiler düşer, çıktı eklenir, `hizmetEkle(meslek, hizmet)`, Hal kondisyon düşer. Hatalar: `meslek_gecersiz`,
  `dugum_kapali`, `girdi_yok` (yeni kod), `takat_yok`.
- `POST /v1/tarif {tarif, istekNo}`; `GET`siz: tarif listesi `/v1/meslek` yanıtına `tarifler` (açık/kapalı, eksik girdi) olarak eklenir.

### Task 3: NPC'ye satış (`pazar.ts`)
- `npcyeSat(k, mal, adet, oyuncuSayisi, ay)`: birim fiyat `satisDegeri` (kıtlık primi dahil), oyuncu başına mal başına
  aylık kota `NPC_SATIS_KOTASI=6`; `su` satılmaz. Akçe NPC'den gelir (tanımlı kaynak).
- `POST /v1/sat {mal, adet, istekNo}`.

### Task 4: Lonca siparişi (`siparis.ts`)
- Yerleşim durumu `Kasaba.sp?: Siparis[]` (kalıcı; motor kayıt anahtarına ekle). `Siparis { id; mal; adet; odul; hizmet; acilis; son; durum: "acik"|"teslim"|"dustu"; alan?: string }`.
- Ay dönümünde (`donum.ts` sonu ya da motor `yetistir` içinde): lonca tablosunda `bos` olan ve NPC ihtiyacı olan
  meslek için en çok `SIPARIS_EN_COK=3` açık sipariş; `SIPARIS_SURE=4` ay; ödül `adet × satisDegeri × 1.5`
  (yukarı yuvarla) + hizmet 3. Deterministik tohum (`tohumlu`). Olay: "Kasabaya 3 nal lazım".
- `POST /v1/siparis/teslim {siparis, istekNo}`: envanterde mal varsa düşer, ödül + hizmet, sipariş `teslim`,
  olay (herkese görünür, teşekkür izi): `sip.teslim` {kim, mal, adet} — "Demirci Ayşe kasabaya 3 nal getirdi".
  Teslim edenle görüşü olan NPC'lere küçük görüş artışı (mevcut `gorus` deseniyle, tavanlı).
- `GET /v1/siparisler`.
- Testler: üretim deterministik, eşzamanlı teslimde tek kazanan, süre dolunca `dustu` ve olay, ödül toplam akçe kaydı.

### Task 5: Uçtan uca + simülasyon
- `test/dilim-uclar.test.ts`: demirci 13+ yaş → temel iş (taş→ usta cevher), oduncudan odun alır (taban-al), kömür ve nal
  tarifi, siparişi teslim eder; olay defterinde teşekkür izi görünür.
- `test/sim.test.ts`e: 1 kasaba, 10 oyuncu, 24 ay boyunca her oyuncu her ay bütün takatini en kârlı işe harcar →
  ortalama aylık akçe kazancı üst sınırı (`[PARAMETRE]`, örn. ≤ 40) ve sınırsız artış yok.
