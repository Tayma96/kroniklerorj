---
name: ses-uretimi
description: Kronikler için ücretsiz ve gerçekçi ses üretimi — duygulu Türkçe seslendirme (Chatterbox Multilingual, yerelde, MIT), ses efekti ve müzik seçenekleri, ElevenLabs'in ne zaman kullanılacağı. Seslendirme, anlatıcı, NPC sesi, efekt ya da müzik istendiğinde kullan.
---

# Ses üretimi

## Seçim sırası

1. **Chatterbox Multilingual** (Resemble AI, MIT): Türkçe dahil 23 dil, duygu abartı ayarı
   (`exaggeration`), kısa örnekten ses kopyalama. 0.5B model, bu makinede GPU'suz CPU'da
   çalışır (yavaş ama kısa replik için yeterli). Ücretsiz, ticari kullanım serbest.
   Çıktıya Resemble'ın görünmez filigranı eklenir.
2. **ElevenLabs v3** (`text-to-speech`, `sound-effects`, `music` skill'leri): En duygulu
   sonuç, ses etiketleriyle (`[fısıltı]` gibi). Ücretsiz plan ayda sınırlı kredi verir,
   ticari kullanım ve atıfsız yayın ücretli plan ister. Kullanıcı anahtar ve onay vermeden
   çağrılmaz.
3. Efekt ve müzikte önce `mobile/assets/sfx` ve `ses` altındaki mevcut CC0 kayıtlar.

## Chatterbox (denenmedi — ilk kullanımda doğrula)

```bash
pip install chatterbox-tts   # torch CPU sürümüyle; ilk çalıştırmada model iner (~2 GB)
```
```python
import torchaudio
from chatterbox.mtl_tts import ChatterboxMultilingualTTS
m = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
wav = m.generate("Ocağın sönmesin, evlat.", language_id="tr",
                 audio_prompt_path="ornek_ses.wav",  # isteğe bağlı: 5-10 sn temiz kayıt
                 exaggeration=0.7, cfg_weight=0.3)    # duygu ↑, tempo ↓
torchaudio.save("cikti.wav", wav, m.sr)
```
Ardından `ffmpeg -i cikti.wav -c:a aac -b:a 64k cikti.m4a`. Uygulamada m4a kullanılır.

## Kurallar

- Her karakter sesi için sabit bir örnek kayıt ve ayarlar `docs/SES_SAHNE.md`ye yazılır;
  aynı karakter her sahnede aynı sesle konuşur.
- Kaynak ve lisans `mobile/UCUNCU-TARAF.md` ve Emeği Geçenler'e eklenir.
- Gerçek kişinin sesi izinsiz kopyalanmaz.
