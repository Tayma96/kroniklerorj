# docs/arsiv — eskimiş belgeler

Bu belgeler **Haziran 2026** web (FastAPI + React, Vercel/Railway) ve ilk mobil port dönemini anlatır. Tarih kaydı
olarak saklanıyor; güncel durum için bunlara değil şunlara bak:

- `README.md` — projenin bugünkü hâli, çalıştırma, derleme, test
- `OTURUM_HAFIZASI.md` — son kararlar, kalıcı kurallar, açık işler
- `mobile/AGENTS.md` — geliştirme kuralları ve doğrulama hattı
- `TASARIM_PUSULASI.md` — tasarım ilkeleri ve oynanış ölçütleri
- `YOL_HARITASI.md` — yayın yol haritası (Ekim 2026'da gerçek duruma göre işaretlendi)

| Belge | Ne anlatıyordu | Neden eskidi |
|---|---|---|
| `PROJE_DURUMU.md` | Web sürümünün oturum devri, görsel varlık üretimi (yerel SD-Turbo) | Web yığını `legacy/`'de; devir notu artık `OTURUM_HAFIZASI.md` |
| `TASINMA_REHBERI.md` | Railway → Vercel taşınma adımları | Backend artık dağıtılmıyor |
| `MOBIL_PORT_DURUMU.md` | Web → mobil port durumu, `claude/gifted-volta-fwqcqn` dalı | Port tamamlandı; dal ve komutlar değişti (APK artık git'e konmuyor) |
| `PORT_DENETIM.md` | Web modülleri ↔ mobil karşılıkları denetimi | Port kapandı; diyalog gediği bu belgeden izlendi ve Ekim 2026'da kapatıldı |
| `GECE_CALISMA_LOG.md` | Haziran gece çalışma günlüğü | Tarih kaydı |
| `ANALIZ_RAPORU.md` | Web sürümünün oyuncu-bot analizi ve denge defteri | Web sürümü üzerine |

Bu belgelerdeki `backend/…`, `frontend/…`, `test_reports/…` yolları artık `legacy/` altında.
