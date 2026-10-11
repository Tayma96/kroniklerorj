# Görsel yenileme hattı (1247 Anadolu · fotogerçekçi)

- `prompts.py` — birleşik sanat yönü + tüm istemler (portre/hero/arma/mülk/mektep/geniş).
- `gen.py [önek] [tohumlar]` — adayları üretir (Pollinations anonim uç, model `sana` = dreamshaper-8-lcm), alttaki filigran şeridini kırpar → `cand/`.
- `secim.json` — her dosya için seçilen tohum (9000 = `arma_comp.py` bileşimi).
- `arma_comp.py` — boş bronz madalyon fotoğrafına kabartma amblem (hilal/taç/kılıç/hançer/buğday) bindirir.
- `finalize.py [önek]` — ortak renk derecelendirme (parlaklık normalizasyonu, %15 desatürasyon, umber/amber split-tone,
  #2a1c0c vinyet), hedef en-boya kırpma, ÖZGÜN boyut/biçimde kaydetme (JPEG q86 / PNG).
- `ba.py`, `sheet.py` — önce/sonra ve aday kontak sayfaları.
Yollar /workspace/kr-gorsel-is ve /workspace/kr-gorsel-orijinal varsayar.

## Oyuncu yaş serisi (güncel seçim)

Oyuncu portrelerinde eski `secim.json` adayları kullanılmaz. Kullanıcı `40_portre_turk.png` çoklu setini seçti.
Kaynak: `kaynak/oyuncu-yas-seridi.png` (1400×400). Üst sıra erkek, alt sıra kadın; soldan sağa
çocuk, ergen, genç, yetişkin, olgun, yaşlı, ihtiyar. Her 200×200 hücre kayıpsız PNG olarak
`assets/portre/` altına kırpıldı. Ayrıntılar `assets/portre/KAYNAK.json` içinde.
Bu seti eski üretim/finalize adaylarıyla karıştırmayın; kişi serisi tek kaynaktan bütünüyle korunur.
