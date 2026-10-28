# Ana sayfa için gereken görseller

Hedef: `mobile/assets/tasarim/claude-paket/mockup_full.png` ekran 1'in havası — sıcak güneş ışığı,
canlı renkler, 13. yüzyıl Anadolu Selçuklu kasabası, yağlıboya/dijital resim. Görsellerde yazı,
çerçeve, arayüz öğesi ve filigran olmasın. Dosyayı aynı adla değiştirmen yeterli; kod değişmez.

## 1. Sahne (ana sayfanın üstü) — var, isteğe bağlı yenileme

`mobile/assets/hero/<yaş>_<mevsim>.jpg` altında 16 resim zaten var. Kare resimler üstten
hizalanıyor; başlık gökyüzüne oturuyor. Yenilemek istersen gerekçe yalnız kalite olur:
dosyalar 640 px ve telefonda biraz yumuşak görünüyor, birkaçı da kasvetli (`genc_sonbahar`,
`yasli_sonbahar`, `cocuk_yaz`). Yenilersen aynı adla, kare **1280×1280 px**, üst %35 sade
gökyüzü ve aydınlık olsun.

## 2. Karar ve sayfa sahneleri — 15 adet

Yer: `mobile/assets/arka/<ad>.jpg`. Ölçü: 1200×800 px, JPG, ≤ 250 KB.
Ana konu **sağ yarıda** olsun; sol yarı yazının arkasında soluklaşıyor. Aydınlık, okunur sahneler.
Bu görseller alt sayfaların tam ekran arka planı olarak da kullanılıyor.

| Dosya | Konu |
|---|---|
| `mogol_baskin` | Uzaktan gelen atlı akıncılar, sancaklar, toz (mockup'taki karar resmi) |
| `kitlik` | Boş ambar, kuru tarla, sıra bekleyen halk |
| `dugun` | Avluda düğün, davul zurna, fener |
| `cenaze` | Mezarlıkta sessiz kalabalık, servi ağaçları |
| `dogum` | Ev içi, beşik, ebe ve anne |
| `medrese` | Medrese avlusu, rahle, talebeler |
| `ahi_tekke` | Ahi loncası, esnaf meclisi |
| `kadi_divan` | Kadı huzurunda dava |
| `gurbet_yol` | Dağ yolunda yolcu ve kervan |
| `ev_yoksul` | Yoksul ev içi, ocak başı |
| `ev_varlikli` | Varlıklı konak içi, halılar, aile |
| `atolye_demirci` | Demirhane, örs, kıvılcım |
| `hasat` | Buğday hasadı, orak, harman |
| `nehir` | Nehir kıyısı, köprü, balıkçılar |
| `cami_avlu` | Cami avlusu, şadırvan, cemaat |

## 3. İkonlar — ilk set 24 adet

Yer: `mobile/assets/ikon/<ad>.png`.

- **Ölçü ve biçim:** 256×256 px, saydam PNG.
- **Üslup:** Mockup'taki gibi kabartmalı altın; tek parça; ince koyu kontur. Gölgeli olabilir ama arka plan olmasın.

| Grup | İkonlar |
|---|---|
| Göstergeler | `saglik` (kalp), `guc` (bükülmüş kol), `zeka` (düşünen baş), `akce` (sikke yığını) |
| Mevsim ve başlık | `ilkbahar` (yaprak), `yaz` (güneş), `sonbahar` (buğday başağı), `kis` (kar tanesi), `defter` (rulo harita), `ayarlar` (çark) |
| Karar ve uyarı | `savas` (çapraz kılıçlar), `itibar` (kalkan), `seref` (madalya), `korku` (kafatası), `sohret` (taç) |
| Son gelişmeler | `kervan` (kalkan), `piyasa` (sikke), `nufus` (insan topluluğu), `kitap` (açık kitap) |
| Alt menü | `ana` (ev), `karakter` (büst), `iliskiler` (iki-üç kişi), `menu` (kitap), `pusula` (ortadaki düğme için 8 köşeli yıldız) |

İkonlar gelince eski glifler yerine resim ikonları kullanacak küçük bir değişiklik yapacağım.
Önce 2 numaralı seti (karar ve sayfa sahneleri) getirmen sayfanın havasını en çok değiştirir.
