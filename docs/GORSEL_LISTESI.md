# Ana sayfa için gereken görseller

Hedef: `mobile/assets/tasarim/claude-paket/mockup_full.png` ekran 1'in havası — sıcak güneş ışığı,
canlı renkler, 13. yüzyıl Anadolu Selçuklu kasabası, yağlıboya/dijital resim. Görsellerde yazı,
çerçeve, arayüz öğesi ve filigran olmasın. Dosyayı aynı adla değiştirmen yeterli; kod değişmez.

## 1. Sahne (ana sayfanın üstü) — 16 adet

Yer: `mobile/assets/hero/<yaş>_<mevsim>.jpg`. Ölçü: 1600×1000 px (yatay), JPG, ≤ 350 KB.

- **Kompozisyon:** Üst %35 açık ve sade gökyüzü olsun; koyu başlık oraya yazılıyor.
  Sol alt köşe sade kalsın; portre oraya biniyor. Ana konu orta ve sağ altta.
- **Işık:** Kış dahil hepsi aydınlık olsun. Kışta güneşli bir kar günü, gri ve karanlık değil.

| Dosya öneki | Konu |
|---|---|
| `cocuk_` | Köy avlusu, ahşap evler, meyve ağaçları, uzakta kasaba |
| `genc_` | Çarşı yolu, kervan, han önü, uzakta köprü |
| `orta_` | Kasaba pazarı, minare, kale, taş köprü (mockup'taki sahne) |
| `yasli_` | Kümbet ya da türbe tepesinden kasabaya bakış |

Her önek için dört mevsim: `ilkbahar`, `yaz`, `sonbahar`, `kis`.
Örnek dosya adı: `orta_yaz.jpg`.

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
Önce 1 ve 2 numaralı setleri getirmen sayfanın havasını en çok değiştirir.
