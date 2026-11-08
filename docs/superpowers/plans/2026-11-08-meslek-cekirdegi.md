# Meslek çekirdeği (sunucu) — uygulama planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Çevrimiçi sunucuya 14 meslek, beceri ağacı, temel iş/usta iş, fırsat maliyeti, NPC taban arzı ve lonca tablosu çekirdeğini eklemek.

**Architecture:** Saf modüller (`src/icerik/meslekler.ts`, `src/yerlesim/meslek.ts`, `temel-is.ts`, `npc-taban.ts`, `lonca.ts`) ve testleri; sonra `YerlesimMotoru`na `istekNo`lu üç uç (`/v1/meslek`, `/v1/temel-is`, `/v1/taban-al`) ve bir okuma ucu (`/v1/lonca`). Yeni kayıt alanları opsiyoneldir (eski kayıt bozulmaz).

**Tech Stack:** TypeScript, Cloudflare Worker + Durable Object, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-08-cevrimici-ana-tasarim-design.md` §5 (meslek), §8 sıra 2.

## Global Constraints
- Yalnız `online-server/`. `server/`, `mobile/lib/mp/`, tek oyunculu dosyalar dokunulmaz.
- Her sayısal değer dışa aktarılmış sabit ve `[PARAMETRE]` yorumlu.
- Gizli sayı yok: kazanç/maliyet istemciye `Dokum` (kalemler toplamı = toplam) olarak döner.
- Akçe/hizmet kazanan her yol azalan getiri ya da aylık kota taşır. NPC'den alımda akçe dünyadan çıkar (gider).
- `Karakter` ve `Sakin`e eklenen alanlar opsiyonel (`ms?`, `ev?`, `tz?`, `tb?`; `Sakin.ms?`).
- Meslek seçimi yaşı 13; ağır meslekler (`oduncu`, `asker`) kalfalığı 16 yaşında açar.
- Doğrulama: `node --test "test/*.test.ts"` ve `npm run typecheck` temiz.

## Review Focus
1. Bilinmeyen meslek/dal/düğüm/mal/iş kimliği → `meslek_gecersiz` hatası, çökme yok (her modülün testinde).
2. Aynı `istekNo` iki kez → aynı yanıt, ikinci kez envanter/akçe değişmez (motor testi).
3. Eski kayıt (alanlar yok) → meslek uçları çalışır, `lonca` boş meslek sayar (motor testi).
4. Takat 0 iken temel iş → `takat_yok`, envanter değişmez (temel-is testi).
5. Aynı ayda NPC kotası aşılır → `kota_doldu`, para düşmez (npc-taban testi).

---

### Task 1: Meslek içerik verisi

**Files:** Create `src/icerik/meslekler.ts`; Test `test/meslekler.test.ts`

**Interfaces — Produces:**
- `MESLEK_IDLERI` (14): `ciftci, oduncu, demirci, marangoz, dokumaci, asci, hanci, sifaci, ozan, katip, tuccar, arabulucu, asker, divan` ; `type MeslekId`.
- `KADEMELER = ["cirak","kalfa","usta","pir"]`; `type Kademe = 0|1|2|3`.
- `interface Dugum { id: string; dal: string; kd: Kademe; tur: "tarif"|"kalite"|"toplu"|"ozel"|"hak"; ister?: MalId[] }`
- `interface Meslek { id; aile: "toprak"|"zanaat"|"hizmet"|"ticaret"|"toplum"; dallar: [string,string,string]; dugumler: Dugum[]; agir: boolean; musteri: MeslekId[]; tedarik: MeslekId[] }`
- `MESLEKLER_ONLINE: Record<MeslekId, Meslek>`, `meslekBul(id: unknown): Meslek | undefined`, `dugumBul(m: Meslek, id: unknown): Dugum | undefined`.
- `NPC_MESLEK_ESLEME: Record<string, MeslekId | null>` (`kisilik.ts` MESLEKLER adı → online meslek; "işsiz" → null).
- Dallar §5.2 tablosundaki gibi (ASCII kimlik). Her dalda 4 düğüm, kimlik `${meslek}.${dal}.${kd}`; tür kademeye göre `tarif, kalite, ozel, hak` (çiftçi/oduncu/demirci içinde `ister` örnekleri: `demirci.zirh.2` ister `["deri"]`, `demirci.alet.1` ister `["kereste"]`).

- [ ] Test: 14 meslek; her birinde 3 benzersiz dal ve 12 düğüm; düğüm kimlikleri tüm sette benzersiz; her `musteri` ve `tedarik` geçerli `MeslekId`; her mesleğin en az 2 müşterisi ve 1 tedarikçisi var (§14.4.2); `NPC_MESLEK_ESLEME` `kisilik.ts` MESLEKLER'in hepsini kapsar; `meslekBul("yok")` undefined.
- [ ] Çalıştır → FAIL; uygula; çalıştır → PASS.

### Task 2: Meslek ağacı mantığı

**Files:** Create `src/yerlesim/meslek.ts`; Modify `src/yerlesim/tipler.ts` (Karakter `ms?`, Sakin `ms?`), `src/tipler.ts` (hata kodları `meslek_gecersiz:400, meslek_yok:409, kademe_kapali:409, dal_kapali:409, dugum_kapali:409, geri_alma_dolu:409`); Test `test/meslek.test.ts`

**Interfaces — Produces:**
- `interface MeslekIlerleme { kd: Kademe; dl: string[]; dg: string[]; hz: number; cy: number; ga: number }` (hz = hizmet puanı, cy = kalfa yaptığı çırak, ga = son geri alma ayı)
- `interface MeslekKaydi { a: MeslekId | ""; y: MeslekId | ""; s: Partial<Record<MeslekId, MeslekIlerleme>> }`
- Sabitler: `MESLEK_YASI=13`, `AGIR_KALFA_YASI=16`, `KADEME_HIZMET=[0,24,72,72]`, `PIR_CIRAK=2`, `GERI_ALMA_ARALIK=12`, `YAN_CARPAN=0.5`.
- `meslekKaydi(k: Karakter): MeslekKaydi` (yoksa boş oluşturur)
- `meslekSec(k, id: unknown, ay): Sonuc<MeslekKaydi>` — yaş < 13 → `yas_kapisi`; eski ilerleme silinmez; ana = yan ise yan "" olur.
- `yanSec(k, id: unknown, ay): Sonuc<MeslekKaydi>` — ana yoksa `meslek_yok`; ana ile aynı → `meslek_gecersiz`.
- `hizmetEkle(k, id: MeslekId, puan: number): number` — ana tam, yan `YAN_CARPAN`, diğer 0; eklenen döner.
- `kademeAtla(k, id, ay): Sonuc<Kademe>` — hz ≥ KADEME_HIZMET[kd+1]; kalfa için ağır meslekte yaş ≥16; pir için `cy ≥ PIR_CIRAK`; değilse `kademe_kapali`.
- `dalAc(k, id, dal): Sonuc<string[]>` — açık dal sayısı ≤ `min(kd+1, 3)`.
- `dugumAc(k, id, dugumId): Sonuc<string[]>` — dal açık, `dugum.kd ≤ kd`, aynı daldaki önceki kademe düğümü açık; kd=3 düğümü yalnız bir dalda (uzmanlaşma).
- `dugumGeriAl(k, id, dugumId, ay): Sonuc<string[]>` — `ay - ga ≥ 12`; aynı dalda üstündeki düğüm açıksa `dugum_kapali`.
- `dugumAcikMi(k, dugumId): boolean`.

- [ ] Testler: 12 yaşında seçim reddi; 13'te seçim; meslek değiştirince eski `s[eski]` duruyor; yan yarı hizmet; kademe eşiği (23 hz kalfa olmaz, 24 olur); ağır meslek 15 yaşta kalfa olamaz; dal sınırı; düğüm sırası; pir düğümü ikinci dalda reddedilir; geri alma 11 ay sonra reddedilir, 12'de kabul; bilinmeyen kimlik `meslek_gecersiz`.
- [ ] FAIL → uygula → PASS.

### Task 3: Mallar ve NPC taban arzı

**Files:** Create `src/yerlesim/npc-taban.ts`; Modify Karakter (`ev?: Record<string, number>`, `tb?: [ay: number, adet: Record<string, number>]`); hata `kota_doldu:409, mal_gecersiz:400`; Test `test/npc-taban.test.ts`

**Interfaces — Produces:**
- `MALLAR: Record<MalId, { taban: number; meslek: MeslekId }>` en az: `odun 1, tas 1, ot 1, yun 2, su 0` (su satılmaz), `kereste 3, sertOdun 4, cevher 3, komur 2, tahil 2, deri 3, alet 8, nal 3`.
- `NPC_CARPAN=2.5`, `NPC_AYLIK_KOTA=3` (oyuncu başına, mal başına, ay başına), `KITLIK_PRIM=0.5`.
- `envanterEkle(k, mal, adet)`; `npcFiyat(mal, oyuncuSayisi: number): Dokum` — kalemler `taban`, `npc_pahali`; oyuncu yoksa ek kalem yok (NPC her zaman satar).
- `satisDegeri(mal, oyuncuSayisi): Dokum` — `taban` + oyuncu sayısı 0 ise `kitlik` primi (kıtlık kazanç demektir).
- `npcdenAl(k, mal: unknown, adet: unknown, oyuncuSayisi, ay): Sonuc<{ fiyat: Dokum; adet: number; para: number }>` — kota, para kontrolü; para düşer (gider), envanter artar.

- [ ] Testler: fiyat dökümü toplamı = kalemler; kotanın 4. alımı `kota_doldu` ve para değişmez; yeni ayda kota sıfırlanır; para yetmezse `para_yok`; `su` alınamaz/satılmaz → `mal_gecersiz`.
- [ ] FAIL → uygula → PASS.

### Task 4: Temel iş, usta iş, fırsat maliyeti

**Files:** Create `src/yerlesim/temel-is.ts`; Modify Karakter (`tz?: Record<string, number[]>`); Test `test/temel-is.test.ts`

**Interfaces — Consumes:** Task 2 `dugumAcikMi`, `hizmetEkle`, `meslekKaydi`; Task 3 `envanterEkle`, `satisDegeri`, `MALLAR`; `karakter.ts` `takatHarca`.
**Produces:**
- `TEMEL_ISLER: Record<IsId, { mal: MalId; meslek: MeslekId; usta?: { dugum: string; mal: MalId } }>`: `odun→odun (oduncu; usta: oduncu.orman.0 → sertOdun)`, `tas→tas (oduncu; usta: oduncu.tas.0 → tas ×2)`, `ot→ot (sifaci; usta: sifaci.otlar.0)`, `yun→yun (ciftci; usta: ciftci.suru.0)`, `su→su (hanci)`.
- `TEMEL_CIKTI=3`, `USTA_CIKTI=5`, `TEMEL_TAKAT=1`, `AZALAN_PENCERE_IS=6`.
- `MESLEK_TAKAT_DEGERI=[2,3,5,8]` (kademe başına takat başına tahmini akçe).
- `temelIsYap(k, is: unknown, oyuncuSayisi: (m: MeslekId)=>number, ay): Sonuc<{ mal; adet; usta: boolean; hizmet: number; firsat: Dokum; takat: number }>` — çıktı `floor(base/(1+n))`, n = son 6 aydaki aynı iş sayısı; kendi mesleğinin işiyse `hizmetEkle(…,1)`.
- `firsatMaliyeti(k, is, oyuncuSayisi): Dokum` — kalemler: `bu_is` (+çıktı satış değeri), `meslekte` (−ana meslek kademe değeri × takat); ana meslek yoksa yalnız `bu_is`.

- [ ] Testler: **meslek demirci olan oyuncu odun kesebilir** (3 odun, hizmet 0); oduncu 3 odun + hizmet 1; `oduncu.orman.0` açık oduncu sertOdun alır; aynı iş 2. kez 1, 4. kez 0 (azalan getiri); 7 ay sonra yeniden 3; takat 0 → `takat_yok` ve envanter değişmez; fırsat dökümü toplamı = kalemler ve demircide `meslekte` kalemi negatif.
- [ ] FAIL → uygula → PASS.

### Task 5: Lonca tablosu

**Files:** Create `src/yerlesim/lonca.ts`; Test `test/lonca.test.ts`
**Produces:** `loncaTablosu(k: Kasaba): { meslek: MeslekId; oyuncu: number; npc: number; durum: "bos"|"az"|"dolu" }[]` (14 satır; oyuncu sayısı `Sakin.ms`, NPC sayısı yetişkin NPC'lerin `NPC_MESLEK_ESLEME`si; `bos` = oyuncu 0, `az` = 1, `dolu` ≥2 [PARAMETRE]); `oyuncuSayaci(k): (m: MeslekId) => number`.
- [ ] Testler: 14 satır; sakin `ms` alanı olmayan eski kayıt `bos` sayılır; iki demirci sakin → `dolu`.
- [ ] FAIL → uygula → PASS.

### Task 6: Motor ve uçlar

**Files:** Modify `src/yerlesim/motor.ts`, `src/yerlesim-do.ts`, `src/index.ts`, `src/tipler.ts` (`YerlesimIleti` yeni işlemler); Test `test/meslek-uclar.test.ts`
**Produces:**
- `POST /v1/meslek {islem: "sec"|"yan"|"kademe"|"dal"|"dugum"|"geriAl", meslek, dal?, dugum?, istekNo}` → `{ meslek: MeslekKaydi-görünümü }`; `sec` `Sakin.ms`i yazar.
- `POST /v1/temel-is {is, istekNo}` → Task 4 sonucu + `envanter`.
- `POST /v1/taban-al {mal, adet, istekNo}` → Task 3 sonucu + `envanter`.
- `GET /v1/lonca` → `loncaTablosu`.
- Hepsi `kar.ist` ile idempotent (mevcut `eylem` deseni).
- [ ] Testler: aynı istekNo iki kez temel iş → envanter bir kez artar; eski karakter (`ms` yok) `sec` çalışır; `lonca` 14 satır.
- [ ] Tüm test + typecheck → PASS; commit.
