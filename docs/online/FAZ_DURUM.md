# Çevrimiçi Faz 1–3 durum denetimi (3 Kasım 2026)

> Geçersiz: güncel durum `docs/online/ONLINE_DURUM.md` dosyasındadır. Bu not yalnız tarihçe için duruyor.

Kaynak planlar: `docs/online/FAZ1_PLAN.md`, `FAZ2_PLAN.md`, `FAZ3_PLAN.md`. Kanıtlar `rg` ve `git` ile koddan
alındı. Planlarda geçen sunucu klasörü `online-server/`dır. Eski çok oyunculu sunucu `server/` ile
`mobile/lib/mp/` bu fazların parçası değildir ve bunlara dokunulmaz.

## Ortak doğrulama (bu oturumda çalıştırıldı)
- `cd online-server && node --test test/*.test.ts` komutu çalıştı: **67 test, 67 geçti**, 0 kaldı (17 dosya).
- `online-server`: `../mobile/node_modules/.bin/tsc --noEmit -p .` komutu hatasız bitti (çıkış 0).
- Protokol eşliği: `cmp mobile/lib/mp/protocol.ts server/src/protocol.ts` komutu **eşit** sonucunu verdi.
  `server/` ve `mp/protocol.ts` dosyalarının son değişikliği 29 Ekim'deki `fea115b` commit'idir, Faz işleri bunlara dokunmadı.
- Mobil `tsc`, i18n ve ikon denetimi ile önizleme görüntüleri bu oturumda **çalıştırılmadı**.

## Faz 1 — Kimlik ve varış (yaklaşık %80)

| Görev | Durum | Kanıt |
|---|---|---|
| 1a `saat.ts` dünya saati | bitti | `online-server/src/saat.ts`, `test/saat.test.ts` |
| 1a `dunya-veri.ts` (7 beylik) | bitti | `BEYLIKLER` 7 beylik, 7 şehir, 17 kasaba, 34 köy; `test/dunya-veri.test.ts` |
| 1a `google.ts` JWKS/RS256/iss/aud | bitti | `src/google.ts` (`GECERLI_ISS`, `GOOGLE_JWKS_URL`), `test/google.test.ts` |
| 1a `oturum.ts` HMAC, `OTURUM_ANAHTARI` | bitti | `src/oturum.ts`, `test/oturum.test.ts` |
| 1a `ad.ts` (yasaklı sözcük, benzersizlik) | bitti | `src/ad.ts` (`YASAK_SOZCUK`), `test/ad.test.ts` |
| 1a `DunyaDO`, `HesapDO` (istekNo defteri) | bitti | `src/dunya-do.ts`, `src/hesap-do.ts` |
| 1a uçlar giris/dunya/profil/davet | bitti | `src/index.ts` 2–7. satırlar, `test/uclar.test.ts` |
| 1a hız sınırı 30/dk, CORS yok | bitti | `src/mantik.ts` `HIZ_SINIRI = 30`, `hizKontrol`; `index.ts` 1. satır |
| 1a `wrangler.toml` `kronikler-online`, DO bağları | bitti | `online-server/wrangler.toml` (HESAP, DUNYA, YERLESIM) |
| 1b `protokol.ts`, `istemci.ts`, `depo.ts`, `durum.tsx` | bitti | `mobile/lib/online/` |
| 1b oturum belirteci güvenli depoda | kısmen | `lib/online/depo.ts` AsyncStorage kullanıyor. 3. satırdaki not bunu 1d'ye erteliyor, `expo-secure-store` kurulu değil |
| 1b `../mp` içe aktarılmaz | kısmen | `lib/online/kapi.ts:9` `ONLINE_GELISTIRME`'yi `../mp/config`'ten alıyor (yalnız sabit) |
| 1c ekranlar index/profil/yerlesim/davet/varis | bitti | `mobile/app/online/*.tsx`, `_layout.tsx` |
| 1c `ONLINE_ACIK` kapalı, geliştirici bayrağı | bitti | `lib/mp/config`, `lib/online/kapi.ts`; "Yakında" `app/cok-oyunculu/index.tsx:140` |
| 1d Google girişi (yerel kütüphane) | yok | `mobile/package.json` içinde `google-signin` yok; düğme `app/online/index.tsx:84` `disabled` |
| Dağıtım (Berkay, elle) | yok | kanıt yok; `GOOGLE_CLIENT_ID` boş |

## Faz 2 — Yaşayan yerleşim çekirdeği (yaklaşık %60; yarım dal alınırsa yaklaşık %80)

| Görev | Durum | Kanıt |
|---|---|---|
| `YerlesimDO`, alarm UTC 09/21, kaçanları yetiştirme | bitti | `src/yerlesim-do.ts` (`alarm()`, `#alarmKur`), `yerlesim/motor.ts:293` `yetistir` |
| 2a `uret.ts` deterministik nüfus | bitti | `src/yerlesim/uret.ts`, `test/uret.test.ts` |
| 2a `karakter.ts` takat 6/ay, 2 ay taşınır | bitti | `karakter.ts:16-18` (`TAKAT_TAVAN` 18), `test/karakter.test.ts` |
| 2a `gorus.ts` döküm = toplam, dostunun dostu ±10 | bitti | `gorus.ts:13-15`, `test/gorus.test.ts` |
| 2a `cizelge.ts` | bitti | `src/yerlesim/cizelge.ts` |
| 2a `eylem.ts` 6 eylem, azalan getiri | bitti | `eylem.ts:29` (`EYLEM_TURLERI` + puan/karar), `test/eylem.test.ts` |
| 2a `donum.ts` yaşlanma, doğum/evlilik/ölüm, gündem | bitti | `src/yerlesim/donum.ts`, `test/donum.test.ts` |
| 2a `donus.ts` Dönüş Kartı (5 madde) | bitti | `src/yerlesim/donus.ts`, `test/donus.test.ts` |
| 2a içerik verisi kopyası | bitti | `src/icerik/adlar.ts`, `src/icerik/kisilik.ts` |
| 2a uçlar yerlesim/olaylar/kisi/eylem/tanidik | bitti | `src/index.ts` 8–12. satırlar ve `KISI_YOLU` (35. satır); `test/yerlesim-uclar.test.ts` |
| 2a istekNo tekrar güvenliği | bitti | `motor.ts:546-548` (`istekNoCoz`), `test/motor.test.ts` |
| 2b öğrenme dönemi 6 gün, ödül | bitti | `yerlesim/ogrenme.ts:28` `OGRENME_GUNLERI`, `test/ogrenme.test.ts` |
| 2b Kül Yemini kancası | bitti (kanca) | `donum.ts:203` `olay.kulYemini`. Mührün kendisi Faz 4'e kaldı |
| 2c istemci veri katmanı ve 5 ekran | `apk`'de yok, yarım dalda kısmen | bkz. aşağıdaki bölüm |
| 2d simülasyon (1 kasaba, 20 oyuncu, 24 ay) | kısmen | `test/sim.test.ts` dönüm süresini, olay hacmini, parayı ve farmı ölçüyor. Görüş ve takat dağılımı ayrı ölçülmüyor |
| 2d sunucu ve istemci inceleme ajanları | yok | `online-server/README.md` "Ertelenenler" bölümü (105–107. satırlar) |

## Faz 3 — Oyuncular arası (%0)

| Görev | Durum | Kanıt |
|---|---|---|
| 3a `teklif.ts`, `iliski.ts`, `soylenti.ts`, `sohbet.ts`, `npc-teklif.ts`, `duzen.ts` | yok | `online-server/src/` içinde dosya yok; `rg -i "teklif\|husumet\|soylenti\|engelle"` sonuç vermedi |
| 3a uçlar oyuncu/dostluk/teklif/gelen/husumet/sohbet/engelle/sikayet/duzen | yok | `src/index.ts` içinde yönlendirme yok |
| 3a testler ve servet pompalama simülasyonu | yok | `test/` içinde ilgili test yok |
| 3b istemci (gelen kutusu, oyuncu profili, teklif, meydan, düzen) | yok | `mobile/app/online/` ve yarım dalda yok |
| 3c güvenlik, taciz ve UI incelemesi | yok | — |

Not: `donum.ts`teki "dostluk" NPC'ler arası gündemdir (Faz 2). Oyuncular arası dostluk henüz yok.

## Yarım istemci dalı: `origin/faz2-istemci-yarim`

- Tek commit: `ec11fac` "Çevrimiçi Faz 2c istemci (yarım): yaşam, mahalle, kişi, tanıdıklar, karakter ekranları,
  tamamlanmadı, apk'ye alınmadı" (1 Kasım). Bu dal `bc62762` üzerinde açıldı; `apk` o noktadan 138 commit ileride.
- İçerik: 19 dosya, +3451/−19.
  - Yeni ekranlar: `mobile/app/online/yasam.tsx`, `mahalle.tsx`, `kisi/[id].tsx`, `tanidiklar.tsx`, `karakter.tsx`.
  - Yeni modüller: `lib/online/yasam-ui.tsx`, `eylem-ui.tsx`, `metin.ts`, `sahte-yerlesim.ts` (597 satır sahte veri),
    `lib/i18n-sayfa/online2.ts` (634 satır, 6 dil).
  - Genişleyen dosyalar: `protokol.ts` (+202), `durum.tsx` (+167), `istemci.ts`, `depo.ts`, `hata.ts`, `onizleme.ts`, `sahte.ts`.
  - `varis.tsx` düğmesi artık `/online/yasam`a gidiyor. `lib/screen-design.ts`e 5 sayfa kaydı eklendi.
- Karşıladığı FAZ2_PLAN görevleri: 2c veri katmanı (yerleşim, imleçli olaylar, istekNo'lu eylem, kişi, tanıdık),
  5 ekranın hepsi, sahte veriyle önizleme, 6 dil metni, varış bağlantısı. `mahalle.tsx` tek oyunculunun
  `lib/sayfa/mahalle/harita.tsx` bileşenini yeniden kullanıyor.
- Görülen eksikler:
  1. `online2.ts`, `mobile/lib/i18n-sayfa/index.ts`e **kayıtlı değil**. Yalnız `online` kayıtlı, bu yüzden Faz 2 anahtarları
     ekranda ham `onl.*` olarak görünür.
  2. `harita.tsx`, `../../game`den yalnız tip alıyor (`import type { Mekan }`). Çalışma anında bağ oluşturmaz ama
     `rg` içe aktarma taramasında görünür.
  3. Dalda mobil `tsc`, i18n denetimi ve 320/390 px önizleme çalıştırılmadı. Protokol tipleri
     `online-server/src/index.ts` ve `yerlesim/motor.ts` yanıtlarıyla karşılaştırılmadı.
- Çakışma denetimi: `git merge-tree --write-tree origin/apk origin/faz2-istemci-yarim` çıkış 0 verdi, yalnız ağaç
  kimliğini yazdı (`5a2e7e4`). **Çakışma listesi boş.** `apk`, dalın açıldığı noktadan beri dalın değiştirdiği dosyalara dokunmamış
  (`git diff --stat bc62762 origin/apk -- mobile/lib/online mobile/app/online mobile/lib/screen-design.ts mobile/lib/i18n-sayfa`
  boş). Dal birleştirilmedi, checkout yapılmadı.
- Kurallar: dal `server/` ve `mobile/lib/mp/protocol.ts` dosyalarına dokunmuyor, protokol bayt eşliği bozulmuyor.
  Tek oyunculu dosyalardan yalnız `lib/screen-design.ts` değişiyor (5 sayfa kaydı ve `/online/kisi/` eşlemesi).

## Limit yenilenince ilk yapılacak 3 iş

1. `ec11fac` commit'ini `apk`ye çakışmasız al (cherry-pick), `mobile/lib/i18n-sayfa/index.ts`e `online2` kaydını ekle,
   ardından mobil `tsc` ile i18n ve ikon denetimini çalıştır.
2. `mobile/lib/online/protokol.ts` tiplerini `online-server/src/yerlesim/motor.ts` yanıtlarıyla eşle.
   `app/online/yasam.tsx`, `mahalle.tsx`, `kisi/[id].tsx`, `tanidiklar.tsx` ve `karakter.tsx` için 320/390 px önizleme al.
   `lib/online/kapi.ts`nin `../mp/config` bağını `lib/online/ayar.ts`e taşı.
3. 2d'yi kapat: `online-server/test/sim.test.ts`e görüş ve takat dağılımını ekle, `online-server/src/yerlesim/` ve
   `mobile/lib/online/` için ayrı inceleme ajanları çalıştır. Ardından Berkay onaylarsa Faz 3'e
   `online-server/src/yerlesim/teklif.ts` ile başla.
