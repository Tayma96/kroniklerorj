# Görsel yenileme hattı (1247 Anadolu · fotogerçekçi)

- `prompts.py` — birleşik sanat yönü + tüm istemler (portre/hero/arma/mülk/mektep/geniş).
- `gen.py [önek] [tohumlar]` — adayları üretir (Pollinations anonim uç, model `sana` = dreamshaper-8-lcm), alttaki filigran şeridini kırpar → `cand/`.
- `secim.json` — her dosya için seçilen tohum (9000 = `arma_comp.py` bileşimi).
- `arma_comp.py` — boş bronz madalyon fotoğrafına kabartma amblem (hilal/taç/kılıç/hançer/buğday) bindirir.
- `finalize.py [önek]` — ortak renk derecelendirme (parlaklık normalizasyonu, %15 desatürasyon, umber/amber split-tone,
  #2a1c0c vinyet), hedef en-boya kırpma, ÖZGÜN boyut/biçimde kaydetme (JPEG q86 / PNG).
- `ba.py`, `sheet.py` — önce/sonra ve aday kontak sayfaları.
Yollar /workspace/kr-gorsel-is ve /workspace/kr-gorsel-orijinal varsayar.
