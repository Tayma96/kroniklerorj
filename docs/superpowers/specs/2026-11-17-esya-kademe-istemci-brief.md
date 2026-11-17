# Eşya kademeleri — istemci brief'i (Dilim 4, 17 Kasım 2026)

Sunucu: `online-server/src/yerlesim/kalite.ts`, `esya.ts`, `esya-kayit.ts`. Tasarım: tezgâh tasarımı §9.
Metinler yalnız Türkçe yazılır, çeviri `tester`a.

## 1. Kademeler
`kademe` 0–6, `kalite` adı (anahtar `kalite.<ad>`):

| kademe | ad | önerilen renk | ikon dili |
|---|---|---|---|
| 0 | sade | gri (metin ikincil) | yok |
| 1 | iyi | yeşil | tek nokta |
| 2 | ustun | mavi | iki nokta |
| 3 | saheser | mor | yıldız |
| 4 | nadide | turuncu/amber | elmas |
| 5 | efsanevi | altın, ince parıltı (`HAREKET` içinden, döngü yok) | taç |
| 6 | tilsimli | koyu lacivert + altın kenar | mühür/göz |

Renk tek başına anlam taşımaz: adı ve ikonu her yerde birlikte (erişilebilirlik).
Eski kayıtlarda 0–3 gelir; ek alan yoksa olağan.

## 2. Alanlar
- Envanter / depo partisi (`kaliteGorunumu`, `depoGorunumu`): `{kalite, kademe, adet, yapan, atolye?}`.
  - `kademe === 4`: `huner` (tek hüner kimliği; anahtar `esya.huner.<id>`).
  - `kademe >= 5`: `esya` nesnesi: `id, lakap (sayı; ad = esya.lakap.<n> + mal adı), kademe, kalite, usta (ad),
    atolye (ad), hunerler[], yapim (ay), gecmis[{ay, tur, kim}], ozellik`.
- `ozellik` (üretim yanıtı `uretim.ozellik`, eşyada `esya.ozellik`): `aile, kademe, carpan, etkiler[{id, carpan}],
  eksik[{id, kademe}], kusur|null, hunerler[], bagli`. Anahtarlar: `esya.aile.<aile>`, `esya.etki.<id>`,
  `esya.kusur.<id>`. `bagli:false` ise etki henüz oyunda işlemiyor: kartta "yakında" etiketi; yalnız alet (`verim`,
  `omur`) bağlı.
- Kalite dökümü (`uretim.kalite`): ek olarak `tavan` (bu üretimin puanla erişebileceği en üst kademe) ve `kisit`
  (`kalite.tavan.meslek` | `kalite.tavan.emir` | `kalite.tavan.ustaNadide` | null). `sonrakiEsik` tavanda null.
- Efsanevi (`uretim.efsanevi`, istenmediyse null): `denendi, neden ("nadide_degil"|null), sans
  ("yok"|"zayif"|"makul"|"guclu"), kademe (5|6|null), esya|null, kalanHak`. Sayısal şans gösterilmez; yalnız bant.
- Atölye görünümü `atolye.efsanevi`: `{pir, hak, ayda}`.
- Levha `ustalar[]`: `efsanevi, nadide, saheser, ustun` sayıları (sıralama efsanevi önce).
- Olay `olay.esya.efsanevi` / `olay.esya.tilsimli` ve kronik `kronik.esya.*` (tür `esya`):
  `{kim, mal, kalite, lakap, atolyeAd}`. Eşyanın şimdiki sahibi hiçbir herkese açık yerde yazılmaz.
- `GET /v1/ekonomi` `kaliteler` ve `kaliteCarpani` artık 7 elemanlı.

## 3. İstek
- `POST .../uret {tarif, efsanevi: true}` (yalnız atölye, kişinin kendi emeği). Hatalar: `efsanevi_pir_degil`,
  `efsanevi_hak_yok` (ikisinde de hiçbir şey harcanmaz). Ürün nadide çıkmazsa hak harcanmaz (`denendi:false`).
- Taşıma/raf/pazar uçlarında `kalite` 0–6 kabul edilir. Kendiliğinden kalite seçen uçlar (pazar teslimi, ısmarlama)
  adlı eşyayı seçmez; satmak için kalite açıkça seçilmeli.

## 4. Ekranlar
- **Envanter ve depo:** satırda kademe rozeti; nadide ve üstü dokununca eşya kartı.
- **Eşya kartı (yeni, alt sayfa):** başlık lakap + mal (efsanevi/tılsımlıda), kademe rozeti, "Usta X'in elinden —
  Y atölyesi", etkiler (çarpan "×3" gibi, eksik etkiler soluk ve "şaheserde açılır"), sadede kusur ("bayat ekmek":
  yan etki yok, yalnız eksik), hüner(ler) ayrı kutuda, yadigâr geçmişi zaman çizelgesi (yapım → satış → miras;
  en çok 8 satır, ilk satır hep yapım).
- **Atölye üretim:** pir için "Efsanevi dene (bu ay N hak)" anahtarı; altında kaba açıklama: "Yalnız nadide çıkan
  işte denenir; ayda bir." Sonuçta: başarı → tam ekran olmayan kutlama kartı (lakap, hüner); başarısız → "Bu ay
  nasip olmadı" (ceza yok, ürün nadide kaldı). Şans bandı sözle: zayıf / makul / güçlü.
- **Kalite dökümü:** `kisit` varsa tek satır neden ("Kalfa üstünü aşamaz", "Emirle iş şaheseri aşmaz", "Ustanın
  nadidesi ender çıkar").
- **Levha ve kronik:** efsanevi/tılsımlı satırları altın vurgulu; usta adı tıklanır (oyuncu sayfası).
- **Pazar/raf:** ilanda kademe rozeti; adlı eşyada lakap ve "yadigâr" etiketi; alıcı kartı satın almadan görebilir.

## 5. Süzgeç (metinde söylenecek)
Parayla kademe/hüner/şans alınmaz; efsanevi denemesi ayda bir, yeniden zar yok; adlı eşya kırılmaz (alet
yıpranmaz), mirasla varise geçer; başkasının envanteri görünmez.
