# Faz 3 — Oyuncular arası: uygulama planı

Kaynak: `docs/online/OYNANIS_TASARIMI.md` §4, §6.0, §10, §13 (5, 7, 9), GDD §5 (rızaya bağlı teklifler ve
varsayılanlar), §11 (oyuncu koruması). Faz 2'nin `YerlesimDO`'su üzerine kurulur. Kurallar aynı: tek
oyunculuya ve `server/**`'e dokunulmaz, dağıtım elle.

## Oyuncu deneyimi (kabul)
- **Oyuncu profili:** başka bir oyuncunun profilinde adı, yaşı, mesleği, hanesi ve görünür namı vardır.
  Onunla ortak tanıdıklarınız görünür. Gizli bilgi (§13.9) görünmez.
- **Dostluk:** istek gönderilir, kabul edilirse ikisi de "dost" olur. Ret ya da cevapsızlık ceza üretmez.
- **Teklifler** (gelen kutusu):
  - **ustalık–çıraklık:** usta oyuncu, genç oyuncuyu çırak alır (§3);
  - **ortaklık:** aynı meslek ya da tedarik zinciri; gelir payı;
  - **borç:** tutar, vade, geri ödeme (kayıtlı; uyku borcu silmez, §13);
  - **hediye:** tavanlı, tekrarında azalan getiri (§13.7);
  - **görücü / evlilik kancası:** 16+; Faz 7'de tamamlanır.
- **Varsayılanlar:** her teklifin süresi ve cevapsız kalınca ne olacağı baştan yazılır. Kaynak kilitleyen
  tekliflerde emanet iade edilir (GDD §5 tablo). Teklif sahibi beklemez.
- **Açık husumet:** meydanda ilan edilir, iki taraf ve yerleşim görür. Düello davetinin kapısıdır (Faz 6).
  Gizli düşmanlık yalnız işaret olarak kalır.
- **Sohbet:** yerleşim meydanı ve özel mesaj; satır başına 240 harf, hız sınırı. Engelle ve şikâyet et;
  sunucu kaydı tutar, moderasyon notu düşer.
- **NPC teklifleri:** tek oyunculudaki 3b'nin çevrimiçi karşılığı: dünürcü (16+), borç isteme, iş teklifi.
  Aynı anda tek teklif, 3 ay cevapsız kalırsa düşer.
- **Söylenti (temel):** eylemler tanıklarca görülür. Haber, NPC ağı üzerinden aya bağlı olarak yayılır ve
  kaynak güvenini taşır. Oyuncu söylentiyi yalanlayabilir. Kışkırtma ve casusluk Faz 4'te gelir.
- **Olağan düzen:** yokken işleyen ayarlar:
  - çalışma biçimi;
  - borç isteyene cevap;
  - gece kapı;
  - gelen tekliflere varsayılan cevap.

Ölçüt: iki oyuncu birbirini hiç beklemeden teklifleşir. Cevapsız teklif cezasız düşer. Aynı teklif ağ
tekrarında iki kez işlenmez. Hediye ve borçla servet pompalanamaz (simülasyonla gösterilir).

## Adımlar

### 3a. Sunucu
- `teklif.ts`: tür, taraflar, şartlar, emanet, son ay, varsayılan sonuç; kabul, ret ve süre dolumu. Hepsi
  idempotent ve olay defterine yazılır.
- `iliski.ts`: oyuncu–oyuncu bağı (dost/tanıdık/açık husumet), ortak tanıdıklar, görünür nam. Oyuncunun
  oyuncuya bakışı NPC görüşünden ayrıdır; burada yalnız beyan ve kayıt tutulur.
- `soylenti.ts`: tanık modeli. Olayı kim gördü, haber hangi NPC'den kime geçti, güven nasıl azaldı.
  Ay dönümünde yayılır, olay başına sınırlıdır.
- `sohbet.ts`: meydan ve özel ileti; hız sınırı, engelleme, şikâyet kaydı; ileti gövdesi uzunluk sınırlı.
- `npc-teklif.ts`: ay dönümünde NPC'den oyuncuya teklif (tek oyunculu 3b kuralları).
- `duzen.ts`: olağan düzen ayarları ve yokken uygulanması.
- Uçlar:
  - `GET /v1/oyuncu/:id`;
  - `POST /v1/dostluk`;
  - `POST /v1/teklif`;
  - `POST /v1/teklif/:id/cevap`;
  - `GET /v1/gelen`;
  - `POST /v1/husumet`;
  - `GET/POST /v1/sohbet`;
  - `POST /v1/engelle`;
  - `POST /v1/sikayet`;
  - `GET/POST /v1/duzen`.
- Testler:
  - teklif yaşam döngüsü ve süre dolumu;
  - emanet iadesi;
  - idempotency;
  - hediye ve borç tavanı;
  - engelleme sonrası ileti ve teklif kapalı;
  - sohbet hız sınırı;
  - söylenti yayılımı ve güven sönmesi;
  - NPC teklifinin tekilliği;
  - olağan düzenin yokken uygulanması.
- Simülasyon: iki hesaplı servet pompalama denemesi, düz oyundan anlamlı kazanç sağlamamalı.

### 3b. İstemci
- Gelen kutusu (teklifler + NPC teklifleri + sohbet).
- Oyuncu profili (dostluk / teklif / husumet / engelle).
- Teklif oluşturma sayfası (şartlar ve varsayılan açıkça yazılı).
- Meydan sohbeti.
- Olağan düzen ayarları.
- Dönüş Kartı'na teklif ve söylenti maddeleri.
- 6 dil, 320/390 px, sahte veriyle önizleme, içe aktarma taraması temiz.

### 3c. İnceleme
- Güvenlik incelemesi:
  - yetki ve sahte istekler;
  - kendine teklif;
  - başkasının teklifini cevaplama;
  - engellenenin ulaşması.
- Taciz sınırı denetimi (§13.5).
- UI incelemesi.

## Açık parametreler
Teklif süreleri (ay), hediye ve borç tavanları, sohbet hız sınırı ve söylenti yayılma oranı `[PARAMETRE]`.
Kapalı testte ayarlanır.
