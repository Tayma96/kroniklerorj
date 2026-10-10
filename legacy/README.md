# legacy/ — arşivlenmiş web dönemi (Haziran 2026)

Bu klasördeki her şey **çalışan ürünün parçası değildir**. Bugünkü oyun `mobile/` (Expo/React Native, tamamen
çevrimdışı tek oyunculu) ve `server/` (çok oyunculu "Diyar" için Cloudflare Worker). Mobil uygulama buradaki hiçbir
koda istek atmaz ve hiçbir dosyayı içe aktarmaz.

Silinmek yerine arşivlendi, çünkü:
- mobil port bu Python/JSX sistemlerinden yapıldı; ayrıntılı davranış (ör. diyalog katmanları, denge sabitleri)
  için başvuru kaynağı olmayı sürdürüyor;
- oyun ikonlarının SVG kaynakları `frontend/public/images/game-icons/` altında (game-icons.net, CC BY 3.0;
  `mobile/lib/icon-paths.ts` bunlardan üretildi).

| Yol | Ne | Son değişiklik |
|---|---|---|
| `backend/` | FastAPI + MongoDB oyun sunucusu (~33.700 satır), Vercel serverless girişi `api/index.py` | 13 Haziran 2026 |
| `frontend/` | CRA/craco + Radix + Tailwind web istemcisi | 13 Haziran 2026 |
| `test_reports/` | Web dönemi test ajanı raporları ve pytest XML çıktıları | Haziran 2026 |
| `tests/` | Kökteki boş Python paketi (`__init__.py`) | Haziran 2026 |
| `design_guidelines.json` | Web istemcisinin eski (zaten "DEPRECATED" işaretli) tasarım tanımı | Haziran 2026 |
| `unused/` | Hiçbir yerden çağrılmayan dosyalar: `skills.py.bak`, `dialogue_backup.py`, `enter.code-profile` (VS Code profil dışa aktarımı), `offline_entry.py` + `offline_db.py` (yarım kalmış Pyodide denemesi) | Haziran 2026 |

## Backend birim testleri hâlâ koşar

Ağ gerektirmeyen üç test dosyası yeni yerinde de geçer (depo kökünden):

```bash
python3 -m venv /tmp/bvenv && /tmp/bvenv/bin/pip install pytest
/tmp/bvenv/bin/python -m pytest -q legacy/backend/tests/test_dynasties.py \
  legacy/backend/tests/test_npc_mind.py legacy/backend/tests/test_story_director.py   # 58 passed
```

`test_kkm_*.py` dosyaları canlı bir backend URL'si (`REACT_APP_BACKEND_URL`) ister; artık çalışan bir dağıtım
olmadığı için koşulmaz.

## Bir gün tamamen kaldırılırsa

`git rm -r legacy/` yeter; ama önce `legacy/frontend/public/images/game-icons/` kaynaklarını (ya da en azından
lisans bilgisini) `mobile/` tarafında tut — atıf yükümlülüğü sürer.
