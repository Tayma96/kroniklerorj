# Hayatın kilit anlarında anlatıcı — plan (2 Kasım 2026)

Metinler: `mobile/lib/sinematik/anlar.json` (6 dil). Ses: Kronks (Arapçada Kronks AR remix), `eleven_v4`,
giriş anlatısıyla aynı ayarlar (stability 0,67, similarity 0,75, tohum 1243). Üslup girişle aynı: üçüncü kişi,
ad yok, oyuncuya hitap yok, cinsiyetsiz (AR/RU uyumu bozulmaz); "kül / köz" imgesi yalnız açılış, ilk evlat,
ölüm ve vâris anlarında, tekrara düşmeden.

## Giriş hikâyesi değerlendirmesi
Tarihî çerçeve doğru: Kösedağ 1243'te Selçuklu yenilgisi, ardından Moğol egemenliği, ağır vergi ve haraç;
kervan ticareti sürdü. "Dört bir yana yayılan akınlar" dramatik bir abartı, sinematik için kabul edilebilir.
"Kül, közü saklar" kayıtlı bir atasözü değil, "kül altında köz" deyiminden türetilmiş bir söz; "eski bir söz"
diye sunulması kurgu içinde tutarlı. Oyun 1247'de, 7 yaşında başladığı için girişten oyuna köprü "Dört kış
geçti…" cümlesidir (an `basla`). Hikâyede değişiklik gerekmiyor.

## Anlar, tetikler ve sıklık
| An | Tetik (kod) | Sıklık |
|---|---|---|
| basla | Yeni oyun: sinematikten sonra ana sayfa, tur 0, 1. nesil | kayıt başına bir kez |
| genclik | Oyuncu yaşı 12 → 13 | hayat başına bir kez |
| ilk_is | Meslek "işsiz"den bir mesleğe ilk geçiş | hayat başına bir kez |
| evlilik | `married` false → true (`lib/feel.tsx`) | hayat başına ilk evlilik |
| ilk_evlat | Evlat sayısı 0 → 1 (`lib/feel.tsx`) | hayat başına bir kez |
| ebeveyn_vefat | `mother_dead` ya da `father_dead` false → true | her ebeveyn için bir kez |
| usta | Ustalık eseri (`capstones` artışı) | hayat başına bir kez |
| sohret | Şöhret kademesi ilk kez yükselir | hayat başına bir kez |
| yerlesim | Yeni yerleşim kuruldu | hayat başına bir kez |
| tac | `crowned` false → true | hayat başına bir kez |
| savas | Savaş ekranında çatışma başlar | hayat başına bir kez |
| olum | `dead` false → true | her ölümde |
| varis | Nesil artar ve vâris yaşıyor | her devirde |

"Bir kez" kaydı cihazda tutulur (`kronikler_anlar_v1`: `tohum:nesil:an`); oyun kaydına alan eklenmez.

## Çalma ve gösterim
- Anın kendi efekti (düğün, ninni, matem…) önce çalar; anlatı 1,2 sn sonra başlar, müzik altında kısılır.
- Altyazı: anın kartının altında, seçili dilde, anlatı süresince; etiketler gösterilmez.
- Ses kapalıysa (müzik ve efekt kapalı) anlatı çalmaz; altyazı yine görünür.
- Aynı anda iki an tetiklenirse (ör. ölüm + vâris) sırayla, aralarında 0,8 sn.

## Üretim ve kalite kapısı
- Dosya: `mobile/assets/ses/anlar/<an>_<dil>.m4a`, mono 96 kbps, −16 LUFS, baş/son sessizlik ≤ 150 ms.
- Her dosya yerel faster-whisper (medium) ile dinlenir: kelime hata oranı ≤ %10, dil tespiti doğru.
  Geçmeyen yalnız o dosya bir kez yeniden üretilir; ikincide de geçmezse metin gözden geçirilir.
- Kredi: ~5.300 karakter × ~0,4 ≈ 2.100 (+ yeniden üretim payı); müzik ve efekt üretiminden sonra.
