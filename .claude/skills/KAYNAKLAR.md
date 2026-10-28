# Kurulu skill'lerin kaynakları

Kullanıcının seçtiği depolardan, içerikleri okunarak ve şüpheli komut taramasından geçirilerek
kopyalandı (28 Ekim 2026). Her klasörde kaynağın lisans dosyası (`LICENSE`) vardır.
Güncellemek için aynı depoyu yeniden klonlayıp ilgili klasörü değiştir.

| Grup | Depo | Commit | Lisans | Kurulan skill'ler |
|---|---|---|---|---|
| Superpowers | github.com/obra/superpowers | 2ce8aa1 | MIT | 15 skill'in hepsi |
| ECC (seçki) | github.com/affaan-m/everything-claude-code | 25278e7 | MIT | react-native-patterns, react-performance, accessibility, blender-motion-state-inspection, make-interfaces-feel-better, click-path-audit, verification-loop, context-budget, search-first, error-handling, browser-qa, agent-sort, council |
| ElevenLabs | github.com/elevenlabs/skills | 503d4e9 | MIT | text-to-speech, sound-effects, music, voice-changer, setup-api-key |
| claude-code-setup | github.com/anthropics/claude-plugins-official | f8c5e7a | Apache-2.0 | claude-automation-recommender |
| Figma | github.com/figma/mcp-server-guide | — | — | Zaten kurulu (`figma:*`); kopyalanmadı |
| Proje | bu depo | — | — | kronikler-skill-rehberi, blender-karakter |

## Bilerek kurulmayanlar

- ECC'nin geri kalan ~300 skill'i, 71 ajanı, kancaları (hooks) ve her zaman yüklenen kuralları:
  bu projeyle ilgisiz (Django, Kotlin, ticaret vb.) ya da depo kurallarıyla çelişiyor
  (Conventional Commits, zorunlu kapsam oranı). Her oturumda bağlamı doldururlardı.
- Superpowers'ın oturum başı kancası: her yanıttan önce skill taraması dayatır; düşük bağlam
  kuralıyla çelişir. Skill'ler elle çağrılabilir.
- ElevenLabs agents, dubbing, realtime, speech-engine, speech-to-text, onboarding,
  voice-isolator: oyunda karşılığı yok.
- `react-performance` içindeki ECC kural bağlantısı, kurulmayan klasöre işaret ettiği için
  açıklamaya çevrildi.
