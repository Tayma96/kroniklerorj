# Kronikler Online — Meslek ağaçları (14 meslek · 42 dal · 168 düğüm)

**Tarih:** 9 Kasım 2026 · **Durum:** içerik tasarımı, uygulamaya hazır öneri · **Bağlı belge:** ana tasarım
`docs/superpowers/specs/2026-11-08-cevrimici-ana-tasarim-design.md` §5 ve §6.2 (teveccüh); `docs/online/DENGE_DENETIMI_2026-11-09.md` (fiyat, tarif, stok kanalı; bu belge onunla uyumludur). Çelişkide o belgeler ve Berkay'ın yeni sözü geçerlidir.
**Kapsam:** 14 mesleğin yapısı, ağaç ekonomisi (Berkay 9 Kasım: meslek tecrübesi → beceri puanı), her düğümün somut etkisi,
mal/tarif kataloğu, meslekler arası bağ, hizmet meslekleri mekaniği, uygulama sırası. Bütün sayılar **[PARAMETRE]**dir.
Düğüm kimlikleri koddaki `meslek.dal.kademe` kimlikleriyle birebir aynıdır; yalnız bazı **görünen adlar** değişir (kartlarda "ad değişir").

Değişmez kurallar: gizli sayı yok (her etki dökümde yazılı) · ücretli güç yok · farm yok (her kazanç yolunda takat, kota ya da
azalan getiri) · hiçbir düğüm yalnız sayı artırmaz · NPC tabanı her zaman var ama zayıf · metin Türkçe, 6 dil sonra.

---

## 0. Kısa okuma

| # | Tespit | Öneri |
|---|---|---|
| 1 | Tecrübe tavansız: puan = 1 + ⌊tecrübe/6⌋ (`meslek.ts:60-72`). Bütün ağaç 22 puan; ~126 tecrübede her şey alınır. Uzmanlaşma yalnız "tek pir ucu"nda kalır. | Artan bar (6, 10, 14…) + **16 puanlık tavan**. Usta 12 puanla 22'lik ağacın ancak yarısını alır (§1.4). |
| 2 | Yedi meslek (hancı hariç hizmet/toplum meslekleri ve tüccar) için **hiç tecrübe kaynağı yok**. Hancı yalnız su taşıyarak, şifacı yalnız ot toplayarak ilerler (`temel-is.ts:175-181`, `tarifler.ts:21-35`). | Hizmet tarifi + kasaba görevi + NPC hizmet talebi + oyuncu hizmet ilanı (§7). |
| 3 | Kademe hızı süre kapısız: kalfa 24, usta 72 tecrübe (`meslek.ts:36`). Demirci nalda takat başına 2 tecrübe alır; kalfalık 1–2 gerçek gün sürer (spec: 6 gün). | `KADEME_HIZMET=[0,70,240,240]` + asgari ay `[0,10,24,12]` (§6). |
| 4 | Lonca tablosu kademeyi saymıyor (`lonca.ts:23,37`); 7 mesleğin NPC karşılığı yok (`meslekler.ts:192`). "Boş meslek refahı düşürür" kuralı kodda yok (`loncaTablosu` yalnız sipariş ve `/v1/lonca`da kullanılıyor). | Kasaba hâli: 5 gösterge (§1.5); kurum NPC'si (§1.6); doluluk kademeye göre. |
| 5 | Meslek değiştirmek her an mümkün (`meslek.ts:98`); eski meslekte açılan düğümler sonsuza dek kullanılır (`meslek.ts:188`). Bir oyuncu zamanla birçok mesleğin ustası olur, birbirine muhtaçlık söner. | Ana meslek yılda bir değişir. Düğüm yalnız ana ve yan meslekte etkindir; eski meslek uyur, dönünce aynen uyanır (§1.3; denge denetimiyle aynı). |

---

## 1. İlkeler ve denetim

### 1.1 Güçlü yanlar (korunacak)

| Yapı | Neden iyi |
|---|---|
| 14 meslek, 5 aile, 3 dal × 4 kademe (`meslekler.ts:7-22,63-158`) | Ek A'nın "dört soru" sınavını geçiyor; §14.2'deki 21 meslek dal olarak içeride, yarım meslek yok. |
| Kimlik deseni `meslek.dal.kademe` + istemci anahtarı `onl.mes.*` (168 düğüm adı 6 dilde hazır) | İçerik verisi koddan ayrı; ad değişikliği sunucuyu bozmaz. |
| Usta iş = malın kendisi değişir (sert odun, cevher, ince yün; `temel-is.ts:175-181`) | "Kalite" gizli sayı değil, ayrı ve görünür maldır. Bu belge bu deseni bütün kalite düğümlerine yayar. |
| Temel iş herkese açık + azalan getiri `⌊3/(1+n)⌋`, 6 ay penceresi + fırsat maliyeti dökümü (`temel-is.ts:196-213`) | Demirci odun kesebilir ama hesabı görür. Ticaret zorlamadan doğar. |
| Alet aşınması (`tarif.ts:15,68-78`), NPC taban ×2,5 ve aylık kota (`npc-taban.ts:9-10`), kıtlık primi (`npc-taban.ts:30-35`) | "Her şey eskir", "NPC var ama zayıf", "kıtlık kazanç" üçü de çekirdekte var. |
| Lonca siparişi + teşekkür izi (`siparis.ts`) | Katkı isimli iz bırakıyor. Hizmet talebi aynı modelle genellenebilir (§7). |
| Tecrübe → mesleğe özel puan, kademeye göre bedel 1/2/3/4, geri alma puanı iade eder (Berkay 9 Kasım; `meslek.ts:43-47,155-186`) | Puan seçim yaptırır ve yalnız o mesleğe harcanır; pişmanlık hakkının da bir bedeli olur. |

### 1.2 Zayıf, çelişen ya da eksik yerler

| # | Yer (dosya:satır) | Sorun | Bu belgedeki çözüm |
|---|---|---|---|
| Z1 | `meslek.ts:60-72` `beceriPuani` | Tecrübe ve puan tavansız; usta sonrası tecrübe bütün ağacı açar. | §1.4 artan bar + `PUAN_TAVAN=16`; pir girişinde +3 icazet puanı. |
| Z2 | `meslek.ts:36` | Kademe yalnız tecrübeye bağlı; süre kapısı ve peştamal sınavı yok. | §6 asgari ay; §1.3 peştamal/ustalık eseri. |
| Z3 | `tarifler.ts:22-33` | Takat başına tecrübe tutarsız: kereste, kömür ve nal 2; alet 1,5; hasat ve kırkım 1. Çiftçi yarı hızda ilerliyor. | Kural: tarif tecrübesi = 2 × takat. Teslim (sipariş/talep) +3. Temel iş kendi mesleğindeyse +1. |
| Z4 | `temel-is.ts:175-181`, `siparis.ts:58-71` | Hizmet meslekleri için tecrübe kaynağı yok (bkz. tespit 2). Sipariş yalnız 3 mesleğin malına açılıyor. | §7: hizmet tarifi, kasaba görevi, hizmet talebi, hizmet ilanı. `SIPARIS_MALLARI` 14 mesleğe yayılır (§3.4). |
| Z5 | `meslekler.ts:33-37,70-137` `ister` | `ister` yalnız etiket; `dugumAc` okumuyor. Bazı `ister`ler tarifsiz düğümde duruyor (`ciftci.ekin.1`, `oduncu.maden.1`). | `ister` tarif girdisinden **türetilir** (tek kaynak). Düğüm açmak mal istemez; düğümün tarifi ister. |
| Z6 | `meslekler.ts:52,169` `KADEME_TURU` | Tür, kademeden kör atanıyor (çırak tarif, kalfa kalite, usta özel, pir hak). İstemcideki adlarla ve işle uyuşmayanlar var. | §2'deki tür sütunu düğüm başına yazılır; `ozel` istisna tablosu yerine her düğüm açık veri. |
| Z7 | `lonca.ts:10,23,37` | Doluluk yalnız ana meslek sayısıdır; çırak = pir. | Dolu = ≥2 oyuncu **ve** ≥1 usta. Az = 1 oyuncu ya da ustasız. Boş = 0. Sakin dizinine `kd` eklenir. |
| Z8 | `meslekler.ts:192-204`, `kisilik.ts:63-75` | NPC eşlemesi 10 SP mesleğine sınırlı. Oduncu, marangoz, dokumacı, hancı, kâtip, arabulucu ve divanın NPC'si 0 görünür. Oysa "NPC tabanı her zaman var" kuralı geçerli. | §1.6 **kurum NPC'si**: her yerleşimde her meslek için sanal bir kalfa (SP içeriğine dokunmadan). |
| Z9 | `lonca.ts` ↔ `motor.ts:717` | Boş meslek hiçbir göstergeyi düşürmüyor (§14.4.4 mekanizması eksik). | §1.5 Kasaba hâli. |
| Z10 | `meslek.ts:98-107,188-192` | Ana meslek değişimi sınırsız; eski meslek düğümleri hep kullanılıyor. | Yılda 1 değişim. `dugumAcikMi` yalnız ana/yan meslekte doğru döner (DENGE_DENETIMI madde 3). Başlangıç puanı yalnız ilk girişte verilir. |
| Z11 | `mallar.ts:39` | `deri` dokumacının malı ama hayvandan gelen ham post yok; deriyi kim, neyden yapıyor belirsiz. | `post` (çiftçi) eklenir; `deri` tabaklanmış deri olarak dokumacıda kalır. |
| Z12 | `temel-is.ts:177` ↔ istemci `oduncu.maden.0` "Damar bulma", `oduncu.tas.*` | Taş toplamanın usta işi cevher veriyor; **taş ocağı dalının hiçbir işi yok**. `komur` tarifi `maden.0`'da. | Cevher `maden.0`'da kalır (uyum). Taş dalına kesme taş, blok ve değirmen taşı gelir. Kömür ocak kömürü olarak `maden.0`'da kalır, adı açıklanır. |
| Z13 | `mallar.ts:34` + `temel-is.ts:180` | Su taşımak hancıya tecrübe yazıyor ama suyu hiçbir tarif kullanmıyor. | Su; çorba, şerbet ve yatak tariflerinin girdisi olur. |
| Z14 | `meslek.ts:144-153` `dalAc` | Çırak 1, kalfa 2, usta 3 dal. Doğru, ama puan tavansız olunca dal sırası anlamsızlaşıyor. | Puan tavanıyla dal sırası yeniden anlam kazanır; kural aynen kalır. |
| Z15 | Arabulucu `hukum.*`, divan dalı, birçok pir düğümü | Bağlı oldukları sistemler (D-28, kurum Faz 7, makam P1, çatışma Faz 8) E4'ten sonra geliyor. Erken açılırlarsa **etkisiz düğüm** olurlar. | Kartlarda `[Faz]` şartı var. Sistemi gelmemiş düğüm listede "kilitli: X ile gelir" görünür ve puan almaz. Divan meslek olarak Faz 7 ile açılır (§8). |
| Z16 | İstemci `hanci.etkinlik.0` "Çay ocağı" | 13. yüzyıl Anadolu'sunda çay yok. | "Şerbet ocağı". |

### 1.3 Bütün kartlar için ortak kurallar

**Düğüm türleri** (`DugumTuru`):

| Tür | Ne açar | Kural |
|---|---|---|
| tarif | Yeni bir girdi → çıktı ya da **hizmet tarifi** (girdi + takat → bir hedefe görünür etki, §7) | Tarif tecrübesi = 2 × takat. |
| kalite | Ayrı kimlikli üst kalite mal ya da hizmet. Etkisi mal kartında yazılır (ömür, verim, açtığı tarif ya da sipariş). | Gizli kalite sayısı yok. Her kalite ayrı bir `MalId`. |
| toplu | (a) **Toplu tarif modu:** aynı tarif ×3 parti, takat ×2, ayda en çok 2 kez. (b) **Kurum siparişi:** kasaba, garnizon, kervan ya da proje adına büyük sipariş (6–12 adet, ödül ×1,5, kasabada ayda 1). Yalnız toplu düğümlü oyuncu alır; birden çok oyuncu payla teslim edebilir. | (a) takatten tasarruf ettirir ama kotalıdır. (b) bir pazar açar. |
| özel | Şaheser ya da özel sipariş: isimli eser (oyuncu ad verir, en çok 24 harf, moderasyonlu), Ustalar Levhası'na yazılır, alıcının dönüş kartında görünür. Ya da bir olayı çözen tek seferlik usta eylemi. | Yılda en çok 2 şaheser [PARAMETRE]. Eserin oyundaki etkisi kartta yazılı. |
| hak | Toplumsal yetki. Çoğu bir **koltuktur** (berat): yerleşimde 1 kişi. | Koltuk kuralı aşağıda. |

**Koltuk (berat) kuralı:** Her koltuk yerleşim başına 1'dir. Hak düğümü açık birden çok aday varsa o meslekteki kalfa ve üstü
oyuncular yılda bir oy verir (lonca oyu). NPC her zaman yedek sahiptir ve işi kalfa kalitesinde görür. Her koltuğun yazılı bir
**yükümlülüğü** vardır (ör. yılda 6 zahire). Yükümlülüğü yerine getirmeyenin koltuğu düşer ve sıradaki adaya geçer. Böylece hak,
ödülü kadar bir sorumluluk da olur. Koltuk ücreti yoktur; geliri yalnız kartta yazan kanaldan gelir.

**Kademenin kendisinin verdikleri** (düğüm değildir, her meslekte aynıdır; Ahilik basamakları):

| Kademe | Geçiş töreni (sınav) | Kendiliğinden gelen haklar |
|---|---|---|
| Çırak | Mesleğe giriş (13 yaş; ağır meslekte kalfalık 16, Ç7) | 1 dal, temel işte kendi işinde tecrübe, NPC siparişlerine teslim |
| Kalfa | **Peştamal kuşanma:** asgari süre + tecrübe + dalının çırak malından ya da hizmetinden 3 teslim (sipariş, talep ya da oyuncuya). Ustası varsa tören ustanın adıyla kayda geçer. | 2. dal, oyuncu hizmet ilanı / tezgâh, kurum siparişine payla katılma, lonca oyu |
| Usta | **Ustalık eseri (icazet):** dalının kalfa malından isimli 1 eser → Ustalar Levhası | 3. dal, çırak alma (aynı anda 2), dükkân [Faz 12 mülk], makam adaylığının meslek şartı |
| Pir | 2 çırak kalfa yetiştirmiş olmak + 12 ay ustalık (§5) | Tek pir ucu, **kethüda adaylığı** (meslek loncasının başı: lonca disiplini, "papucunu dama atma" oylaması), +3 icazet puanı |

**Kethüdalık genel haktır.** Bu yüzden düğüm olarak tekrarlanmaz. İstemcide adı "kethüdalık" olan özgün pir düğümleri
(`demirci.zirh.3`, `dokumaci.deri.3`, `tuccar.pazar.3`) kartlarda kendine özgü bir role dönüştürülmüştür.

**Meslek değiştirme:** Ana meslek yılda bir değişir [PARAMETRE]. Eski meslek ilerlemesi silinmez ama **uyur**: düğümler
yalnız ana ve yan meslekte etkindir (DENGE_DENETIMI madde 3). Meslek geri alınınca kademe, puan ve düğümler aynen uyanır
("dönüşte toparlanma hızlıdır" = anında). Başlangıç puanı bir mesleğe yalnız ilk girişte verilir. Yan meslek yarı tecrübe alır
(`YAN_CARPAN=0,5`). Lonca tablosunda yalnız ana meslek sayılır.

**Kart sütunları:** *Şart* sütunundaki "—" standart şart demektir: kademe ≥ düğüm kademesi, aynı dalda önceki düğüm açık,
yeterli puan, dal açık. Ek şartlar yazılıdır. `[Faz N]` ya da `[E6]` gibi etiketler, düğümün ancak o sistem gelince açılacağını
gösterir. Tariflerde `t` = takat. Tarif tecrübesi aksi yazmadıkça 2 × takattir.

### 1.4 Ağaç ekonomisi (Berkay 9 Kasım modeli üzerine)

**Mevcut:** puan = `BASLANGIC_PUANI (1) + ⌊tecrübe / PUAN_TECRUBE (6)⌋`; bedel `DUGUM_BEDEL = [1,2,3,4]`; tek pir ucu.
Bütün ağacın bedeli: 3 dal × (1+2+3) + 4 = **22 puan**.

**Öneri: artan bar + tavan.**
- n'inci puanın barı = `PUAN_TECRUBE + PUAN_ARTIS × (n−1)` = 6, 10, 14, 18… (`PUAN_ARTIS = 4`). n puan için gereken toplam
  tecrübe `6n + 2n(n−1)`'dir: 1 puan = 6, 5 = 70, 6 = 96, 10 = 240, 11 = 286, 15 = 510.
- `PUAN_TAVAN = 16` (başlangıç ve icazet dahil). Tavandan sonra tecrübe puan vermez; bar "Ustalık: Levha sırası" olarak dolmaya
  devam eder ve sayısal bir avantaj vermez.
- Pir olunca **+3 icazet puanı** gelir; böylece pir ucu (4 puan) beklemeden alınabilir.
- Bedeller aynen kalır: 1/2/3/4. Geri alma yılda 1, puanı iade eder (mevcut).

**Bütçe ve seçim (kod kuralları + öneri):**

| Kademe | Açık dal | Normal oyuncuda o anki puan | Alınabilecekler (örnek) | Seçimi zorlayan şey |
|---|---|---|---|---|
| Çırak | 1 | 1 → ~5 (kalfalığa kadar biriken) | A0 (1) | Biriken puan kalfa günü harcanır: peştamal günü 2–3 düğüm birden açılır. |
| Kalfa | 2 | 6 | A0 A1 B0 B1 (6) **ya da** A0 A1 B0 + 2 puan yedek | İkinci dalı tamamlamak mı, ustalığa puan biriktirmek mi. |
| Usta | 3 | 12 | (a) A0-A2 + B0-B2 = 12 → iki usta düğümü, üçüncü dal yok; (b) A0-A2 + B0 B1 + C0 C1 = 12 → bir usta düğümü, üç dal | Ya iki derin dal ya da bir derin dal ve iki geniş dal. Üç usta düğümü (18) **imkânsız**. |
| Pir | 3 | 15 → 16 | (a) + A3 = 16 ya da (b)'den bir düğüm geri alınıp A3 | 22'lik ağacın en çok 16'sı. En az 4–5 düğüm her zaman başkasındadır. |

Sonuç: aynı mesleğin iki ustası çoğu zaman farklı düğümlere sahiptir. Örneğin silah ustası demirci pul zırh yapamaz ve zırh
ustasından alır. Kurum siparişleri (sefer takımı = mızrak + kalkan + zincir) iki ustayı ortak teslime iter (§5.3).

**Tecrübe kaynakları ve oranları:**

| Kaynak | Tecrübe | Sınır |
|---|---|---|
| Tarif (mal ya da hizmet) | 2 × takat | Takat (ayda 6, en çok 18 birikir), girdi, NPC kotası |
| Temel iş (kendi mesleğinin işi) | +1 | Azalan getiri (6 ay penceresi) |
| NPC siparişi / hizmet talebi teslimi | +3 (tarifin üstüne) | Kasabada ayda 1–2 açılır; ilk getiren alır |
| Kasaba görevi (nöbet, sayım, ilan) | 2 × takat | Kasaba başına aylık koltuk (ör. 4 nöbet) |
| Oyuncuya hizmet ya da satış (ilan, tezgâh) [E3/Faz 6] | +1 / teslim (tarifin üstüne) | Aynı alıcıdan ayda 2 teslim sayılır (kendi hesap kümesi sayılmaz) |
| Usta–çırak dersi [E3] | Çırağa +4, ustaya +1 | Ayda 2 ders |
| Yan meslek | Yukarıdakilerin ×0,5'i | — |

### 1.5 Kasaba hâli ve lonca tablosu etkisi (yeni çekirdek)

"Boş meslek refahı düşürür" kuralının soyut bir refah sayısı olmaması için yerleşimde **5 görünür gösterge** tutulur.
Her gösterge 0–100 arasındadır ve şu kurallarla değişir:
- Başlangıç 60.
- Her dönümde aşınma −4.
- İlgili mesleğin her teslimi ya da görevi +1; kurum siparişi +3; tamamlanan proje +10.
- Bir göstergeye bir ayda en çok +12 katkı yazılır.
- Lonca durumu **boş** ise o mesleğin göstergesine ek −2/ay, **az** ise −1/ay.
- NPC tabanı alt sınırı 30'dur: kasaba çökmez, kimse kilitlenmez.

Ekranda yalnız 40'ın altındaki göstergeler "gerilim" olarak öne çıkar; aynı anda en çok 3 tane (pusula ilke 1).

| Gösterge | Besleyen meslekler | < 40 iken (görünür etki) | ≥ 70 iken (görünür nimet) |
|---|---|---|---|
| **Erzak** | çiftçi, aşçı, tüccar | NPC gıda fiyatı ×1,5; NPC doğumu durur | Göç gelir: NPC hane +1 (yılda en çok 1) |
| **Bakım** | demirci, marangoz, oduncu, dokumacı | NPC onarımı 2 ay bekler; yapı projeleri yarı hızda; kamu yapısı "yıpranık" | Proje katkısı tam sayılır; kervan uğrar (NPC kervan siparişi) |
| **Sağlık** | şifacı, hancı, aşçı | Yaralının can toparlaması yarıya iner; NPC doğumunda risk artar (dökümde) | Salgın olayı olasılığı dökümde düşer |
| **Asayiş** | asker, arabulucu, divan | Hırsızlık ve haydut olayı olasılığı dökümde artar; kervan uğramaz | Kervan ve tüccar siparişleri gelir |
| **Huzur** | ozan, hancı, kâtip, arabulucu | Gönül dengesi 50 yerine 40'a çeker | Gönül dengesi 55; şenlik önerisi kabul edilir |

**Lonca tablosu satırı:**

| Alan | İçerik |
|---|---|
| Meslek | Meslek adı |
| Oyuncular | Kademeye göre sayı (ör. "1 usta · 2 çırak") |
| NPC | NPC sayısı (kurum NPC'si dahil) |
| Durum | **Boş** (0 oyuncu), **Az** (1 oyuncu ya da ustasız), **Dolu** (≥2 oyuncu ve ≥1 usta) |
| Etki | "Boş: Bakım −2/ay · NPC demirci 2,5 kat pahalı" |
| Çağrı | "Bu kasabada demirci yok: 2 hazır sipariş" |

### 1.6 NPC tabanı (bütün meslekler için tek kural)

- Her yerleşimde her mesleğin bir NPC karşılığı vardır. Bu ya SP eşlemeli gerçek bir NPC'dir (`NPC_MESLEK_ESLEME`) ya da
  **kurum NPC'sidir**: "köy marangozu", "han kâhyası", "kadı naibi", "subaşı neferi" gibi sanal, adı olan ama nüfusa sayılmayan
  bir kalfa. SP içeriğine dokunulmaz.
- **Sınırlar:**
  - Yalnız çırak ve kalfa (`kd ≤ 1`) düğümlerinin malları ve hizmetleri; usta ve pir işi hiç yoktur.
  - Fiyat taban ×2,5 (`NPC_CARPAN`). Kasaba stoğunda oyuncunun sattığı mal varsa ×1,5 (denge denetimi stok kanalı).
  - Kota: oyuncu başına mal başına ayda 3; hizmette ayda 1 ve teslim bir ay sonra.
  - Koltukların yedek sahibidir. Kasaba hâlinin 30 tabanını o tutar.
- Kartlardaki "NPC tabanı sınırı" satırı, o mesleğin NPC'sinin **neyi yapamadığını** yazar. Oyuncunun vazgeçilmezliği oradan doğar.

### 1.7 Teveccüh bağları (spec §6.2)

Teveccüh, alınan hediyeden doğan ayrı itibardır ve hediyenin tutarıyla artar. Bu belgede iki türlü bağlanır:

1. **Armağan malları:** Hediyeye uygun malların bir `armagan` etiketi olur. Bunlar: oyma takımı, şerbet, saz, kündekâri kapı,
   halı, sancak, pastırma, şaheser eserler ve ziyafet. Mal armağanının teveccühe katkısı malın taban değeriyle sayılır. Aynı hesap
   kümesinden ya da aynı haneden gelen armağan sayılmaz (§6.2). Bu malları üreten zanaatkâr, armağan ekonomisinin tedarikçisi olur.
2. **Önceliğe bağlanan düğümler:** Aşağıdaki düğümlerde, NPC talebi ya da sahne sırası aynı anda birden çok uygun oyuncuya
   düşerse **teveccüh kademesi** sırayı belirler. Sıra dökümde yazılıdır. Teveccüh işi kimseden almaz, yalnız sırayı belirler.

| Düğüm | Teveccühün etkisi |
|---|---|
| `hanci.konaklama.0` Yatak ve ahır | NPC yolcu talebi önce yüksek teveccühlü hancıya düşer |
| `hanci.konaklama.3` Han beratı | Müdavim rozeti bu handa daha az ziyaretle kazanılır (müdavim hızı) |
| `hanci.etkinlik.1` Saz gecesi | Ozanın sahne önceliği: aynı ay iki ozan isterse teveccühü yüksek olan sahneyi alır |
| `asci.mutfak.0` / `asci.firin.0` | NPC aş siparişinde öncelik (esnaf önceliği) |
| `asci.mutfak.2` Şenlik ziyafeti | Ziyafet bir ikramdır: katılanlar ev sahibine teveccüh yazar; aşçıya değil, sofranın sahibine |
| `ozan.sahne.0` Türkü ve mâni | Handa sahne sırası teveccühe göre |
| `ozan.sahne.3` Ozan postu | Şenlik sahnesinin dağıtımı; adaylıkta teveccüh, sınırlı meşruiyet desteği olarak sayılır |
| `dokumaci.deri.3` Debbağ ahisi ve genel kethüda/ahi başı adaylığı | Ahi başı adaylık şartı: en az "tanınır" teveccüh kademesi |
| `divan.meclis.3` Makam adaylığı | Sınırlı meşruiyet desteği (§6.2) |

---

## 2. Meslek kartları

Kartlarda tariflerin tecrübesi 2 × takattir. Fiyatlar §3'tedir. Lonca etkisi §1.5'teki gösterge eksisidir.

### 2.1 Çiftçi — Toprak

> *Fantezi:* "Kasabanın karnı benim tarlamdan doyar; kıtlık gelince ambarımın kapısını ben açarım."

| | |
|---|---|
| **Kim ister** | Aşçı (tahıl, buğday, bakla, et); dokumacı (yün, post); tüccar, asker ve divan (zahire); hancı (kervan hayvanına arpa); NPC haneler (gıda) |
| **Boşsa kasaba** | Ekmek ve çorba NPC fiyatına çıkar. Kıtlık olayında oyuncu ambarı olmadığı için yalnız NPC dağıtımı kalır. **Erzak −2/ay** |
| **Eşsiz cazibe** | Kıtlıkta kader: ambar emini, kıtlık ambarı ve imece; kasabanın açlığını isimle çözen tek meslek |
| **Temel iş / usta iş** | "Yün kırk" herkese açık (2 yün). `suru.0` ile ayrı usta işi "ince yün ayıkla" açılır; temel çıktının yerine geçmez (denge denetimi). Hasat bir tariftir; aletsiz de olur |
| **Tedarik → müşteri** | Demirci (alet, saban) · marangoz (kağnı) · dokumacı (bez çuval, yayla çadırı) → aşçı, dokumacı, tüccar, asker, hancı |
| **NPC tabanı sınırı** | NPC çiftlik tahıl, yün ve et satar. Seçme buğday, zahire, kıtlık ambarı ve imece yoktur |

| Kimlik | Ad | Tür | Açtığı | İster | Şart | Etki metni |
|---|---|---|---|---|---|---|
| `ciftci.ekin.0` | Buğday ve arpa | tarif | `hasat`: — → 3 tahıl · 2t; alet varsa 5 (alet aşınır) | (alet) | — | Tarlayı sürersin; aletin varsa harman bereketlenir. |
| `ciftci.ekin.1` | Demir sabanla sürüm | kalite | `sabanSurumu`: alet (zorunlu, aşınır) → 4 seçme buğday · 2t | alet | — | Seçme buğday ekersin; has un ve peksimet senin tarlandan çıkar. |
| `ciftci.ekin.2` | Nadas ve münavebe | özel | `baklagil`: — → 4 bakla · 2t. Kuraklık olayında hasadın yarıya düşmez (olay kartında yazar). | — | kuraklık direnci [E6] | Toprağı dinlendirirsin; kuraklık yılında tarlan ayakta kalır. |
| `ciftci.ekin.3` | İmece çağrısı | hak | Ayda 1 imece: kasabadan en çok 4 kişi 1'er takat bağışlar. Her bağış sana 2 tahıl, bağışlayana +3 gönül ve teşekkür izi getirir. Kıtlıkta imece katkısı ortak derde iki kez sayılır. | — | pir | Köyü tarlana çağırırsın; harman herkesin olur. |
| `ciftci.suru.0` | Kırkım ve süt | tarif | `kirkim`: — → 2 yün · 1t; usta işi "ince yün ayıkla": temel iş "yün kırk"tan ayrı, 1t → 2 ince yün | — | — | Sürünü kırkarsın; ince yünü yalnız sen ayırırsın. |
| `ciftci.suru.1` | Kesim ve post *(ad değişir: Seçme damızlık)* | tarif | `kesim`: — → 2 et + 1 post · 2t (et 2 ayda bozulur) | — | — | Sürüden kesim yaparsın; et aşçıya, post debbağa gider. |
| `ciftci.suru.2` | Yayla göçü | özel | `yaylaGocu`: 1 çadır (4 göçte eskir) + 3t peşin → 2 ay sonra (sen yokken de) 4 ince yün + 2 post + 2 et. İki ay boyunca sürü tarifleri kapalıdır. | çadır (dokumacı) | — | Sürüyü yaylaya çıkarırsın; sen yokken de otlar, dönüşte bereket getirir. |
| `ciftci.suru.3` | Mera hakkı | hak | Koltuk: kasaba merası. Sürü tarifi yapan her oyuncu ayda 1 akçe ot hakkı öder (kasaba tavanı). Kuraklıkta merayı kapatma ya da açma kararı sendedir. Yükümlülük: yılda 1 mera onarımı (2 kereste + 2 taş). | — | pir, koltuk | Meranın sözü sende; sürüler senin otunla doyar. |
| `ciftci.ambar.0` | Çuval ve kile | tarif | `zahire`: 4 tahıl + 1 bez → 1 zahire · 1t (bozulmaz; sefer, kervan ve kıtlık malı) | bez (dokumacı) | — | Tahılı çuvallarsın; zahire yıllarca bozulmaz. |
| `ciftci.ambar.1` | Toplu harman | toplu | Toplu hasat modu (×3, 4t) + "garnizon zahiresi" kurum siparişi | kağnı (marangoz; toplu modda aşınır) | — | Harmanı tek seferde kaldırırsın; kurumlar zahireyi senden ister. |
| `ciftci.ambar.2` | Kıtlık ambarı | özel | Kasabanın kıtlık ambarına en çok 12 zahire emanet edersin. Kıtlık ilan edilince emaneti ya hayır olarak dağıtırsın (cömertlik namı, Ortak Dert Defteri) ya da kasabaya taban ×2'den satarsın. Seçimin herkese görünür. | zahire | kıtlık [E6]; o gelene dek NPC kıtlık siparişi | Kıtlıkta ambarının kapısını sen açarsın; kader senin elinde. |
| `ciftci.ambar.3` | Ambar emini | hak | Koltuk: Erzak göstergesinin ayrıntısını görürsün; kıtlıkta dağıtım sırasını (yoksul hane, garnizon, han) sen belirlersin. Yükümlülük: yılda 6 zahire. | — | pir, koltuk | Kasabanın ambar defteri sende; kıtlıkta kimin önce doyacağına sen karar verirsin. |

### 2.2 Oduncu / madenci — Toprak (ağır meslek: kalfalık 16 yaş)

> *Fantezi:* "Her zanaat benim baltam ve kazmamla başlar; nadir damarı ve sert odunu yalnız ben bilirim."

| | |
|---|---|
| **Kim ister** | Demirci (kömür, cevher, bakır, gümüş); marangoz (kereste, kiriş, kesme taş, blok); aşçı (değirmen taşı, odun); hancı (odun); dokumacı (çadır direği); kasaba projeleri |
| **Boşsa kasaba** | Kereste, kömür ve taş NPC fiyatına çıkar. Kiriş ve blok hiç olmadığı için köprü, han ve sur projeleri başlamaz. **Bakım −2/ay** |
| **Eşsiz cazibe** | Zincirin başı: kiriş, blok, değirmen taşı, bakır ve gümüş yalnız ondadır. Koru dikimi bütün kasabanın baltasını yeniler. |
| **Temel iş / usta iş** | "Odun kes" ve "taş topla" herkese açık. `orman.0` "sert odun seç", `maden.0` "cevher ayıkla" ayrı usta işlerini açar; temel çıktının yerine geçmez (denge denetimi madde 6). |
| **Tedarik → müşteri** | Demirci (alet; toplu kesim ve ocakta aşınır) · aşçı (ocak erzakı, isteğe bağlı) → demirci, marangoz, hancı, aşçı, dokumacı |
| **NPC tabanı sınırı** | NPC odun, kereste, taş, cevher ve kömür satar. Kiriş, blok, değirmen taşı, bakır ve gümüş satmaz. |

| Kimlik | Ad | Tür | Açtığı | İster | Şart | Etki metni |
|---|---|---|---|---|---|---|
| `oduncu.orman.0` | Sert odun seçimi | tarif | `kereste`: 1 odun → 1 kereste · 1t (denge: girdi 2→1); usta işi "sert odun seç" 1t → 2 sert odun | — | — | Kereste biçersin; sert odunu ormanda bir tek sen seçersin. |
| `oduncu.orman.1` | Toplu kesim | toplu | Toplu kereste modu (×3, 2t) + "proje kerestesi" kurum siparişi | alet (aşınır) | — | Toplu kesim yaparsın; köprü ve han kerestesi senden çıkar. |
| `oduncu.orman.2` | Direk ve kiriş *(ad değişir: Gemi direği)* | tarif | `kiris`: 2 sert odun + 1 kereste → 1 kiriş · 2t; köprü, han ve araba kirişsiz yapılamaz | — | — | Köprüler ve hanlar senin kirişinin üstünde durur. |
| `oduncu.orman.3` | Koru hakkı | hak | Koltuk: altı ayda bir "dikim" (2t + 2 odun). Dikim, kasabadaki herkesin "odun kes" azalan getiri sayacını sıfırlar ve Bakım'a +5 yazar. Yükümlülük: yılda 2 dikim. | — | pir, koltuk | Koruyu sen yeşertirsin; kasabanın baltası senin ağaçlarınla döner. |
| `oduncu.maden.0` | Damar bulma | tarif | `komur` (ocak kömürü): 1 odun → 1 kömür · 1t (denge: girdi 2→1); usta işi "cevher ayıkla" 1t → 2 cevher | — | — | Ocak kömürü yakar, taşın içindeki cevheri seçersin. |
| `oduncu.maden.1` | Kazmalı ocak | kalite | `bakirOcagi`: alet (aşınır) + 1 kereste → 2 bakır · 2t | alet | — | Bakır damarını açarsın; aşçının kazanı senin cevherindendir. |
| `oduncu.maden.2` | Nadir damar | özel | `damarAra`, ayda 1: alet (aşınır) + 1 kereste · 3t → şans dökümüyle %40 ihtimalle 1 gümüş, yoksa 3 cevher. Döküm önceden gösterilir. | alet | — | Gümüş damarı ararsın; bulursan kuyumcunun ve kâtibin kapısı açılır. |
| `oduncu.maden.3` | Ocak beratı | hak | Koltuk: kasaba ocağı. Ayda en çok 2 NPC madenci tutarsın (her biri 4 akçe → ertesi ay 2 cevher). Ocak kazası olasılığı ayda %5 ve görünür; kaza şifacıya talep açar. Yükümlülük: yılda 12 cevher. | — | pir, koltuk | Ocak senin beratınla işler; köyün gençleri senin kazmanla ekmek kazanır. |
| `oduncu.tas.0` | Moloz ve kesme taş | tarif | `kesmeTas`: 3 taş → 1 kesme taş · 1t | — | — | Taşı yontarsın; ev temeli senin taşınla atılır. |
| `oduncu.tas.1` | Düzgün blok | kalite | `blok`: 2 kesme taş + alet (aşınır) → 1 blok · 2t; köprü, sur ve han temeli bloksuz kurulmaz | alet | — | Kesme bloğu yalnız sen çıkarırsın; büyük yapılar sana bakar. |
| `oduncu.tas.2` | Değirmen taşı | özel | `degirmenTasi`: 2 blok + 1 sert odun → 1 değirmen taşı · 3t (araç, 12 kullanım; un tarifini 2→3 un yapar); özel sipariş "kasaba değirmeni" | — | — | Değirmen taşını sen yontarsın; kasabanın unu onunla öğütülür. |
| `oduncu.tas.3` | Sur taşı hakkı | hak | Koltuk: sur ve kale onarımı kurum siparişlerini sen açarsın, önce sen teslim edersin. Sur sağlamken haydut olayı kasabaya bir basamak hafif girer. Sur kitabesine adın yazılır. Yükümlülük: yılda 4 blok. | — | pir, koltuk | Surun taşı senin elinden; kitabesinde adın yazar. |

### 2.3 Demirci — Zanaat (kuyumcunun ince işçiliği içeride)

> *Fantezi:* "Aletsiz hasat, silahsız savunma olmaz; damgamı taşıyan her demir benim adımı anar."

| | |
|---|---|
| **Kim ister** | Çiftçi (alet, saban); oduncu (alet); marangoz (çivi, nal); asker (mızrak, kalkan, kılıç, zırh); tüccar (nal); aşçı (kazan); kâtip (mühür) |
| **Boşsa kasaba** | Aletler 2,5 kat pahalanır; onarım 2 ay bekler; asker yalnız NPC mızrağıyla kalır. **Bakım −2/ay** (Asayiş dolaylı olarak düşer) |
| **Eşsiz cazibe** | Silah ve zırh savunmada belirleyicidir. Pir damgası müşteriyi ömür boyu geri getirir. Mühür yalnız onun örsünden çıkar. |
| **Temel iş / usta iş** | Herkese açık "basit onarım" temel işi: aşınmış aletin sayacını −1 yapar. Demircinin kendi işidir, ona tecrübe yazar (denge madde 2). `alet.0` tam onarımı açar. |
| **Tedarik → müşteri** | Oduncu (cevher, kömür, kereste, bakır, gümüş) · dokumacı (deri, astar) · tüccar (uzak cevher) → çiftçi, oduncu, marangoz, asker, tüccar, aşçı, kâtip |
| **NPC tabanı sınırı** | NPC demirci nal, çivi, alet, mızrak, kalkan ve kazan satar. Kılıç, zincir, pul zırh, damga ve mühür yoktur; onarım 2 ay sürer. |

| Kimlik | Ad | Tür | Açtığı | İster | Şart | Etki metni |
|---|---|---|---|---|---|---|
| `demirci.alet.0` | Nal ve çivi | tarif | `nal`: 1 cevher + 1 kömür → 2 nal · 1t (mevcut); `civi`: 1 cevher + 1 kömür → 4 çivi · 1t; `onarim`: 1 kömür + aşınmış alet → sayaç sıfır · 1t (başkasının aletini de onarırsın: hizmet ilanı) | — | — | Nal ve çivi dövüp aşınmış aleti yeniden ayağa kaldırırsın. |
| `demirci.alet.1` | Saban, orak ve kazan *(ad değişir: Sağlam saban)* | tarif | `alet`: 2 cevher + 1 kömür + 1 kereste → 1 alet · 2t (mevcut); `kazan`: 2 bakır + 1 kömür → 1 kazan · 2t (aşçı aracı, 12 kullanım) | kereste, bakır | — | Saban ve orak senden çıkar; aşçının kazanı da senin örsünden. |
| `demirci.alet.2` | Toplu alet siparişi | toplu | Toplu nal, çivi ve alet modu + kurum siparişleri: "köy aletleri" (4 alet), "kervan nalı" (12 nal) | — | — | Köyün bütün aletini tek seferde dövüp kurum siparişini alırsın. |
| `demirci.alet.3` | Pir damgası | özel | Ürettiğin alet, silah ve zırh damgalı olur ve alıcının kartında adın görünür. Damgalı eşya sana getirilirse girdisiz onarırsın (yalnız takat). İnce işçilik: `muhur`, 1 gümüş + 1 kömür → 1 mühür · 3t. | gümüş | pir | Damgan çarşıda tanınır; mühürler yalnız senin örsünden çıkar. |
| `demirci.silah.0` | Bıçak ve mızrak ucu | tarif | `mizrak`: 1 cevher + 1 kömür + 1 kereste → 1 mızrak · 1t (nöbette 6 kullanımda eskir) | — | — | Nöbetçinin mızrağını sen döversin. |
| `demirci.silah.1` | Su verilmiş kılıç | kalite | `kilic`: 2 cevher + 2 kömür + 1 deri → 1 kılıç · 3t. Çatışmada mızraktan üstündür (dökümde yazar); asker sefer düğümleri kılıç ister. | deri | çatışma etkisi [Faz 8] | Su verilmiş kılıç dövün; askerin sefer düğümleri senin kılıcınla açılır. |
| `demirci.silah.2` | Şaheser kılıç | özel | `saheserKilic`: 2 kılıç + 1 gümüş → isimli kılıç · 6t (iki aya bölünebilir). Ustalar Levhası'na girer, vârise yadigâr kalır [Faz H]. Yılda 2. | gümüş | — | Adını taşıyan bir kılıç dövün; Ustalar Levhası'na ve hanedan yadigârına geçer. |
| `demirci.silah.3` | Cephane hakkı | hak | Koltuk: garnizonun silah kurum siparişleri yalnız sana açılır. NPC garnizonun silahını sen verirsen NPC savunma kalfadan usta kalitesine çıkar (Asayiş). Yükümlülük: yılda 6 mızrak ya da 2 kılıç. | — | pir, koltuk | Garnizonun cephanesi sende; kasabanın savunması senin demirinle güçlenir. |
| `demirci.zirh.0` | Kalkan kasnağı | tarif | `kalkan`: 2 kereste + 1 cevher → 1 kalkan · 1t | — | — | Kalkan kasnağı dövün; saf düzeninin ilk şartı sensin. |
| `demirci.zirh.1` | Zincir örgü | kalite | `zincir`: 3 cevher + 2 kömür → 1 zincir zırh · 3t. Çatışmada can kaybını bir basamak hafifletir (dökümde yazar). | — | çatışma etkisi [Faz 8] | Zincir zırh örersin; giyen yarayı daha hafif atlatır. |
| `demirci.zirh.2` | Pul zırh | özel | `pulZirh`: 1 zincir zırh + 2 deri + 1 astar → 1 pul zırh (isteğe bağlı isimli) · 4t | deri, astar (dokumacı) | — | Debbağın derisi ve dokumacının astarıyla pul zırh yaparsın. |
| `demirci.zirh.3` | Ordu zırhçıbaşı *(ad değişir: Lonca kethüdalığı)* | hak | Koltuk: garnizon ve sefer zırh kurum siparişleri sana gelir. Sefer ordugâhında "onarım çadırı" kurarsın; askerin zırhı o seferde eskimez. Yükümlülük: yılda 2 zincir zırh. | — | pir, koltuk; bölge ordusu [P] | Seferde zırhlar senin çadırında onarılır; ordu sana güvenir. |

### 2.4 Marangoz / yapı ustası — Zanaat

> *Fantezi:* "Yerleşim benim ellerimle büyür; köprünün ve hanın kitabesinde adım yazar."

| | |
|---|---|
| **Kim ister** | Hancı (doğrama, temiz oda, han yapısı); çiftçi (kağnı); tüccar (araba, köprü); ozan (saz); herkes (oyma armağanı, proje); mülk sahipleri [Faz 12] |
| **Boşsa kasaba** | Yeni hane, han ve köprü projesi açılmaz; kamu yapıları yıpranır; nüfus büyümez. **Bakım −2/ay** |
| **Eşsiz cazibe** | **Kasaba projesi** başlatan tek meslek. Herkes katkı verir, kitabede usta ve katkıcıların adı yazar. Arma çizme hakkı da ondadır. |
| **Temel iş / usta iş** | "Basit onarım" ve odun kesme herkese açık. Marangozun kendi temel işi ayrıca yoktur; tecrübesi tarif ve proje katkısından gelir. |
| **Tedarik → müşteri** | Oduncu (kereste, kiriş, taş, blok) · demirci (çivi, nal) · dokumacı (koşum) → hancı, çiftçi, tüccar, ozan, kasaba |
| **NPC tabanı sınırı** | Köy marangozu (kurum NPC'si) doğrama, kağnı ve oyma satar. Proje başlatamaz; araba, kündekâri ve köprü yapamaz. |

| Kimlik | Ad | Tür | Açtığı | İster | Şart | Etki metni |
|---|---|---|---|---|---|---|
| `marangoz.yapi.0` | Çatı ve kapı | tarif | `dograma`: 2 kereste + 2 çivi → 1 doğrama · 1t; ev, han ve kamu yapısı onarımının girdisi | kereste, çivi | — | Kapı ve pencere yaparsın; yıpranan evler senin doğramanla ayağa kalkar. |
| `marangoz.yapi.1` | Taş temelli ev | toplu | Proje "yeni hane": 2 kiriş + 6 kesme taş + 4 doğrama + 10 takat. Herkes mal ve takatle katkı verebilir. Bitince kasabaya yeni bir NPC hanesi gelir; [Faz 12] ile satılık ev olur. | kiriş, kesme taş | — | Bir ev projesi başlatırsın; köy bir hane büyür, kitabede adın yazar. |
| `marangoz.yapi.2` | Han ve hamam inşası *(ad değişir: Han ve köprü inşası)* | özel | Büyük proje: han (6 kiriş + 8 blok + 6 doğrama + 1 kündekâri + 30t), hamam ya da sur onarımı. Kitabe: ustanın ve katkıcıların adları. Hancının kervan ağırlama ve han beratı düğümleri bu yapıya bağlanır. | kiriş, blok, kündekâri | — | Han ya da hamam kurarsın; kasaba yolcuya ve kervana açılır. |
| `marangoz.yapi.3` | Yapı emini | hak | Koltuk: kasabada en çok 2 açık projenin sırasını sen önerirsin; bakım defteri (yıpranan kamu yapıları) sende. Onayı muhtar verir, [Faz 7] sonra meclis. Yükümlülük: yılda 1 proje tamamlamak. | — | pir, koltuk | Kasabanın hangi yapıyı önce kuracağını sen önerirsin. |
| `marangoz.arac.0` | Kağnı tekeri | tarif | `kagni`: 4 kereste + 2 nal → 1 kağnı · 2t (araç, 8 kullanım) | nal | — | Kağnı yaparsın; çiftçinin harmanı ve kısa kervan onunla döner. |
| `marangoz.arac.1` | Yaylı araba | kalite | `araba`: 1 kiriş + 4 kereste + 4 çivi + 1 koşum → 1 araba · 3t (araç, 12 kullanım; tüccarın toplu yükü) | kiriş, koşum | — | Yaylı araba yaparsın; tüccarın 30 yükü senin tekerinle gider. |
| `marangoz.arac.2` | Ahşap köprü *(ad değişir: Asma köprü)* | özel | Proje "ahşap köprü": 4 kiriş + 6 kereste + 8 çivi + 20t. İki yerleşim arası kervan yolu 1 ay kısalır. Köprü kitabesine adın yazılır. | kiriş | iki yerleşim arası yol [tüccar kervanı] | Irmağa köprü atarsın; kervan yolu bir ay kısalır. |
| `marangoz.arac.3` | Köprü geçiş hakkı | hak | Yaptığın köprünün köprübaşısın: geçen kervan başına 2 akçe geçiş (kasaba tavanı). Yükümlülük: yılda 2 kirişle bakım; yapılmazsa hak düşer ve köprü "yıpranık" olur. | — | pir; yapılmış köprü | Köprün yaşadıkça geçiş akçesi senin; bakmazsan çürür. |
| `marangoz.tezyin.0` | Oyma ve saz *(ad değişir: Oyma kaşık)* | tarif | `oyma`: 1 kereste → 1 oyma takımı · 1t (armağan malı); `saz`: 1 sert odun + 1 deri → 1 saz · 1t (ozanın aracı, 12 kullanım) | deri | — | Oyma takımı ve saz yaparsın; armağan ve türkü senin elinden çıkar. |
| `marangoz.tezyin.1` | Kündekâri kapı | kalite | `kundekari`: 2 sert odun + 1 doğrama → 1 kündekâri kapı · 3t. Han projesinin girdisi, temiz odanın üst hâli, armağan malı, mülk değeri [Faz 12]. | sert odun | — | Çivisiz geçme kapı oyarsın; hanın en güzel odası senin kapınla açılır. |
| `marangoz.tezyin.2` | Minber oyması | özel | Vakıf siparişi: minber, rahle ya da tekke kapısı. İsimli eser, Ustalar Levhası; kasaba Huzur'a bir kez +10. Dervişin tekke postu bu eseri ister. | sert odun ×4, doğrama ×2 | — | Mescidin minberini oyarsın; kasaba her bakışta seni anar. |
| `marangoz.tezyin.3` | Nakkaş başı | hak | Arma çizme hakkı (kozmetik, ücretsiz): hane, lonca ve kervan armasını sen çizersin, oyuncular sana sipariş verir. Şenlik süslemesi ve kitabe bezeği senin imzanla olur. | — | pir | Kasabanın armaları ve süsleri senin kaleminden çıkar. |

### 2.5 Dokumacı / deri ustası (debbağ) — Zanaat

> *Fantezi:* "Kışın üşütmeyen, seferde barındıran, zırhın altını saran benim; Ahi Evran'ın izinden giderim."

| | |
|---|---|
| **Kim ister** | Demirci (deri, astar); asker (çadır, çizme, giysi); tüccar (koşum, kumaş, çadır); hancı (bez); şifacı (bez sargı); çiftçi (çuval bezi, yayla çadırı); marangoz (koşum) |
| **Boşsa kasaba** | Giysi ve çizme NPC fiyatına çıkar. Pul zırh yapılamaz. Kışlık giysisi olmayanın kış kondisyon kaybı görünür. **Bakım −2/ay** |
| **Eşsiz cazibe** | Deri ve astar olmadan zırh, çadır olmadan sefer ve yayla göçü yoktur. Halı ve sancak en değerli armağanlardandır. |
| **Temel iş / usta iş** | "Yün kırk" ve "ot topla" (tabaklık otu) herkese açık; dokumacının kendi temel işi yoktur. |
| **Tedarik → müşteri** | Çiftçi (yün, ince yün, post) · şifacı (kök boya) · oduncu (kereste) · demirci (çivi) → demirci, asker, tüccar, hancı, şifacı, çiftçi, marangoz |
| **NPC tabanı sınırı** | NPC dokumacı bez, deri, keçe ve sade giysi satar. Astar, halı, sancak ve çadır yoktur. |

| Kimlik | Ad | Tür | Açtığı | İster | Şart | Etki metni |
|---|---|---|---|---|---|---|
| `dokumaci.kumas.0` | Yün iplik ve bez | tarif | `bez`: 2 yün → 1 bez · 1t | yün | — | İplik büküp bez dokursun; çuval da sargı da senin bezinden. |
| `dokumaci.kumas.1` | Sık dokuma | kalite | `kumas`: 2 ince yün → 1 kumaş · 1t; `giysi`: 1 kumaş + 1 post → 1 kışlık giysi · 1t (8 ay giyilir; giyen kışta kondisyon kaybetmez) | ince yün, post | kış etkisi Hal'de yazılı | Sık kumaş ve kışlık giysi dokursun; kışı sen ısıtırsın. |
| `dokumaci.kumas.2` | Kilim ve halı | özel | `hali`: 4 ince yün + 2 boya → 1 halı (isimli olabilir) · 4t. Hanın konaklamasının üst hâlidir; çeyiz ve armağan malıdır. Yılda 2. | boya (şifacı) | — | Adını taşıyan bir halı dokursun; çeyizde ve handa yıllarca anılır. |
| `dokumaci.kumas.3` | Tezgâh hakkı | hak | Ev tezgâhları: ayda en çok 2 iş, NPC hanelerdeki tezgâhlara verilir: 2 yün + 2 akçe → 2 ay sonra (sen yokken) 1 bez. İş alan yoksul ya da dul hane geçim olayı yaşar (Huzur). | — | pir | Köyün ev tezgâhlarına iş verirsin; dul ocağı senin ipliğinle tüter. |
| `dokumaci.deri.0` | Tabaklama | tarif | `tabak`: 2 post + 1 ot → 2 deri · 1t | post (çiftçi) | — | Postu tabaklarsın; demircinin ve sazcının derisi senden. |
| `dokumaci.deri.1` | Kösele | kalite | `kosum`: 2 deri + 1 çivi → 1 koşum · 1t (araba ve kervanın şartı); `cizme`: 2 deri → 1 çizme · 1t (ulağın ve askerin; 6 yolda eskir) | çivi | — | Koşum ve çizme yaparsın; kervan ve ulak senin köselenle yürür. |
| `dokumaci.deri.2` | Zırh astarı | özel | `astar`: 1 kumaş + 1 deri → 1 astar · 2t; pul zırhın girdisi. "Ordu astarı" özel siparişi. | kumaş | — | Zırhın astarını yalnız sen dikersin; pul zırh sensiz olmaz. |
| `dokumaci.deri.3` | Debbağ ahisi *(ad değişir: Debbağlar kethüdalığı)* | hak | Ahi Evran'ın yolu. Koltuk: debbağhane. Başkalarının postunu tabaklama ilanı açarsın (sen yokken teslim). Ayda 1 "ahi sofrası": o ay kasabaya gelen yeni bir oyuncuya çizme ya da giysi verirsen hami bağı kurulur ve cömertlik namı alırsın. Ahi başı adaylığına teveccüh şartıyla açılır (§1.7). | — | pir, koltuk | Ahi Evran'ın izinden debbağhaneyi işletir, yeni geleni giydirirsin. |
| `dokumaci.cadir.0` | Keçe | tarif | `kece`: 3 yün → 1 keçe · 1t | yün | — | Keçe döversin; çobanın kepeneği ve çadırın duvarı sensin. |
| `dokumaci.cadir.1` | Kışlık çadır | kalite | `cadir`: 2 keçe + 1 kereste + 1 bez → 1 çadır · 2t (4 kullanım: yayla göçü, sefer, kervan konağı) | kereste | — | Kışlık çadır kurarsın; yayla ve sefer seninle barınır. |
| `dokumaci.cadir.2` | Sancak işleme | özel | `sancak`: 2 kumaş + 1 boya + 1 gümüş (sırma) → isimli sancak · 4t. Hane, lonca ve birlik sancağıdır; askerin sancak hakkı bunu ister. | gümüş, boya | — | Sırma sancak işlersin; birlik senin sancağının ardından yürür. |
| `dokumaci.cadir.3` | Ordugâh hakkı *(ad değişir: Ordu çadırı hakkı)* | hak | Koltuk: kervan konağı ve ordugâh. Uzak kervan senin çadırlarınla konaklarsa yolda kondisyon kaybetmez. Haydut ortak derdinde [E6] ve seferde [P] 6 çadırlık ordugâh kurarsın. Yükümlülük: yılda 2 çadır. | — | pir, koltuk | Yolda ve seferde konak senin; kimse yorgun dönmez. |

### 2.6 Aşçı / fırıncı (değirmenci içeride) — Zanaat

> *Fantezi:* "Sofram kasabayı bir araya getirir; kıtlıkta kazanım kaynar, şenlikte ziyafetim anılır."

| | |
|---|---|
| **Kim ister** | Herkes (sofra: ayda bir öğün kondisyon toparlar); hancı (yatak + aş); asker (peksimet, kuru et); tüccar (pastırma, peksimet); arabulucu (barış sofrası); düğün ve şenlik sahipleri |
| **Boşsa kasaba** | Sofra malı yalnız NPC fırından ve pahalıya gelir. Kıtlıkta toplu mutfak açılmaz. **Erzak −2/ay** (Sağlık dolaylı olarak düşer) |
| **Eşsiz cazibe** | Kondisyon ve gönül veren aşlar, kıtlıkta aşhane, şenlikte ziyafet. Uzak pazara giden tek aş malı pastırmadır. |
| **Temel iş / usta iş** | "Su taşı" ve "odun kes" herkese açık; aşçı suyu çorbada kullanır. Kendi temel işi yoktur. |
| **Tedarik → müşteri** | Çiftçi (tahıl, buğday, bakla, et) · oduncu (odun, değirmen taşı) · demirci (kazan) · tüccar (tuz) · şifacı (şifalı ot = baharat) → herkes, hancı, asker, tüccar, arabulucu |
| **NPC tabanı sınırı** | NPC fırın ekmek ve çorba satar. Un, pastırma, ziyafet ve aşhane yoktur. |

**Sofra kuralı (yeni):** Oyuncu ayda bir aş malı tüketebilir. Ekmek kondisyonu +3, çorba +5 artırır. Ziyafet ve şerbet gönül
verir. Etki Hal dökümünde yazılıdır. Bu, aş mallarının gerçek ve tavanlı tüketim kanalıdır.

| Kimlik | Ad | Tür | Açtığı | İster | Şart | Etki metni |
|---|---|---|---|---|---|---|
| `asci.firin.0` | Ekmek ve pide | tarif | `ekmek`: 2 tahıl + 1 odun → 3 ekmek · 1t (1 ayda bayatlar; sofra +3 kondisyon). NPC aş siparişinde teveccüh önceliği (§1.7). | tahıl | — | Taze ekmek pişirirsin; sofrası olanın kondisyonu toparlanır. |
| `asci.firin.1` | Taş değirmen unu | kalite | `un`: 2 seçme buğday → 2 un · 1t; değirmen taşı aracıyla 3 un | seçme buğday (çiftçi) | — | Has un öğütürsün; peksimet ve ziyafet senin unundan. |
| `asci.firin.2` | Mahalle fırını *(ad değişir: Simit ve çörek)* | toplu | Toplu ekmek modu (×3, 2t) + "garnizon ekmeği" ve "imaret ekmeği" kurum siparişleri | — | — | Mahalle fırınını yakarsın; garnizon ve imaret ekmeğini senden alır. |
| `asci.firin.3` | Fırın beratı | hak | Koltuk: kasabanın ekmek narhını önerirsin (NPC fırın fiyatı ±%20 bandında; onayı muhtar verir, [Faz 7] sonra divan). Kıtlık siparişlerinin ekmek kısmı önce sana açılır. Yükümlülük: ayda 6 ekmek. | — | pir, koltuk | Ekmeğin narhı senin sözünle konur; kıtlıkta fırın senin. |
| `asci.mutfak.0` | Çorba ve pilav | tarif | `corba`: 1 tahıl + 1 su → 2 çorba · 1t; 1 bakla eklenirse 3 çorba (1 ayda bozulur; sofra +5 kondisyon). NPC aş siparişinde teveccüh önceliği. | tahıl, su (bakla isteğe bağlı) | — | Çorba kaynatırsın; yorgun gelen toparlanır. |
| `asci.mutfak.1` | Toplu kazan | toplu | Toplu çorba modu (×3) + "aşevi" kurum siparişi | kazan (demirci, aşınır) | — | Kazan kurarsın; aşevi ve kıtlık sofrası senden. |
| `asci.mutfak.2` | Şenlik ziyafeti | özel | `ziyafet` (hizmet): 3 et + 4 un + 1 şifalı ot + 4t → bir düğün, masa ya da şenlik ziyafeti. Katılan herkes +10 gönül alır; sofra sahibi nam ve teveccüh kazanır (ziyafet bir ikramdır). Ustalar Levhası'na isimle girer. | et, un, şifalı ot | — | Ziyafet sofrası kurarsın; o gece kimse kırgın kalkmaz. |
| `asci.mutfak.3` | Aşhane hakkı | hak | Koltuk: aşhane. Evsiz [Faz 14] ve yoksul NPC'lere ayda bir çorba dağıtırsın, bedelini kasaba öder. Kıtlıkta toplu mutfak katkın iki sayılır. Erzak ve Huzur'a yazar. Yükümlülük: ayda 6 çorba. | — | pir, koltuk | Aşhanenin kazanı sende; kasabada aç yatan kalmaz. |
| `asci.saklama.0` | Kurutma ve tuzlama | tarif | `kuruEt`: 2 et + 1 tuz → 2 kuru et · 1t (bozulmaz); `peksimet`: 2 un + 1 odun → 3 peksimet · 1t (bozulmaz; sefer ve kervan erzakı) | tuz (tüccar), et | — | Eti tuzlar, peksimet pişirirsin; sefer ve kervan bozulmayan aşınla yürür. |
| `asci.saklama.1` | Pastırma *(ad değişir: Turşu ve pekmez)* | kalite | `pastirma`: 2 kuru et + 1 şifalı ot (çemen) → 1 pastırma · 1t; armağan malı; uzak kervanla başka bölgede iki kat değer | şifalı ot | — | Çemenli pastırma yaparsın; uzak pazarda adın aranır. |
| `asci.saklama.2` | Kıtlık erzakı | özel | `erzakSandigi`: 2 zahire + 2 kuru et + 3 peksimet → 1 erzak sandığı · 2t. Kıtlıkta kasabaya bağışlanırsa Erzak'a yazar ve adın Ortak Dert Defteri'ne geçer. Sefer erzakıdır. | zahire (çiftçi) | kıtlık [E6]; o gelene dek NPC kıtlık siparişi | Kıtlık sandığını sen hazırlarsın; dar günde kasabayı sen beslersin. |
| `asci.saklama.3` | Kiler emini | hak | Koltuk: kurum kileri. Divan, garnizon ve kervan erzak siparişleri sana gelir; kilerdeki aş malların bozulmaz. Yükümlülük: yılda 2 erzak sandığı. | — | pir, koltuk | Kurumların kileri sende; erzak senin elinde bozulmaz. |

### 2.7 Hancı — Hizmet

> *Fantezi:* "Yolcu önce bana uğrar; masam kasabanın kulağıdır, söylenti benim kapımdan geçer."

| | |
|---|---|
| **Kim ister** | Yolcular, yeni gelenler ve evsizler (barınma); tüccar (kervan konağı, fiyat haberi); ozan (sahne); düğün ve meclis sahipleri; NPC yolcular |
| **Boşsa kasaba** | Yalnız NPC misafirhanesi kalır: pahalı ve ayda 1 gece. Kervan konaklayamaz, haber dolaşmaz. **Huzur −1/ay, Sağlık −1/ay** |
| **Eşsiz cazibe** | Barınma ve kondisyon, masa ve etkinlik, söylentinin yayılması ve susturulması |
| **Temel iş / usta iş** | "Su taşı" hancının kendi temel işidir ve +1 tecrübe yazar. Su artık yatak, şerbet ve çorbanın girdisidir (Z13). |
| **Tedarik → müşteri** | Aşçı (aş) · marangoz (doğrama, han yapısı) · dokumacı (bez, halı) · oduncu (odun) → tüccar, ozan, yolcu, herkes |
| **NPC tabanı sınırı** | Han kâhyası (kurum NPC'si) oyuncu başına ayda 1 yatak verir (×2,5 ücret). Temiz oda, kervan konağı, etkinlik ve söylenti işi yoktur. |

| Kimlik | Ad | Tür | Açtığı | İster | Şart | Etki metni |
|---|---|---|---|---|---|---|
| `hanci.konaklama.0` | Yatak ve ahır | tarif (hizmet) | `yatak`: 1 odun + 1 su · 1t → 2 yatak hazır (2 ay). Konuğun kondisyonu +10; barınma sayılır [Faz 14]. NPC yolcu talebi teveccüh sırasıyla sana düşer (§1.7). | odun | — | Yatak serip ahır açarsın; yolcunun yorgunluğu senin damında geçer. |
| `hanci.konaklama.1` | Temiz oda | kalite | `oda`: 1 bez + 1 odun + 1 su · 1t → 1 temiz oda: kondisyon +15, gönül +3. Kündekâri kapı ya da halı varsa "seçkin oda" olur ve NPC tüccar onu tercih eder. | bez (dokumacı) | — | Temiz oda hazırlarsın; tüccarlar başka hana uğramaz. |
| `hanci.konaklama.2` | Kervan ağırlama | toplu | `kervanKonagi`: 6 yatak + 3 tahıl (hayvan yemi) · 2t. Kervan sahibi o ay sonraki yerleşime kondisyon kaybetmeden geçer. "Kervan konaklaması" kurum siparişi. | tahıl | kasabada han yapısı (NPC han başta vardır; oyuncu hanı `marangoz.yapi.2` ile) | Kervanı ağırlarsın; yol senin hanında dinlenir. |
| `hanci.konaklama.3` | Han beratı | hak | Koltuk: han başına 1. Han senin adınla anılır. Müdavim rozeti [Ek A 3.6] senin hanında kazanılır; teveccüh müdavim hızını artırır. Konaklama kirasının kasaba payı sana gelir; [Faz 12] öncesinde kiracı işletmeci olarak. Yükümlülük: ayda 4 yatak. | — | pir, koltuk | Han senin adınla anılır; müdavimlerin rozetini sen verirsin. |
| `hanci.etkinlik.0` | Şerbet ocağı *(ad değişir: Çay ocağı, dönem dışı)* | tarif (hizmet) | `serbet`: 1 su + 1 ot · 1t → 3 şerbet (1 ay). İçen +3 gönül; armağan ve ikram malı (teveccüh). | ot | — | Şerbet ocağını yakarsın; masana oturanın gönlü ferahlar. |
| `hanci.etkinlik.1` | Saz gecesi | tarif (hizmet) | `sazGecesi`: 2 şerbet · 1t + bir ozanın (oyuncu ya da NPC) sahne hizmeti → o ay handa olan herkes +5 gönül. Gelir ozanla bölüşülür; oran sende yazılıdır. Aynı ay iki ozan isterse sahneyi teveccühü yüksek olan alır. | şerbet; ozan | — | Saz gecesi açarsın; ozan senin sahnende, kasaba senin masanda. |
| `hanci.etkinlik.2` | Düğün yemeği | özel | Düğün, sünnet ya da şenlik ev sahipliği: aşçının ziyafeti, ozanın sahnesi ve hanın yatakları tek bir etkinlikte birleşir. Katılanlar gönül alır, ev sahibi nam alır, olay isimle kayda geçer. Hane evliliği töreni [Faz H]. | ziyafet (aşçı) | — | Düğün sofrasını sen kurarsın; kasaba o geceyi yıllarca anar. |
| `hanci.etkinlik.3` | Şenlik hakkı | hak | Yılda 1 yerel şenlik önerisi (3 gerçek gün pencere). Onaylanırsa ortak katkı defteri seninle açılır. | — | pir; şenlik [E7] | Kasabanın şenliğini sen önerirsin; defter senin hanında açılır. |
| `hanci.haber.0` | Kulak misafiri | tarif (hizmet) | `kulak`: 1t → kasabanın bu ayki 3 söylentisinden birinin kaynağı (kim yaydı) sana görünür. İkinci kullanım: "fiyat haberi" kaydı; tüccara satılır. | — | söylenti [Faz 4] (sıra 5, E4'ten önce gelir) | Masada kulak kabartırsın; söylentinin nereden çıktığını bilirsin. |
| `hanci.haber.1` | Haber defteri | kalite | Haberler 3 ay defterinde kalır ve olay defterine göre "doğru" ya da "yalan" işareti alır. Defter kaydı tüccara ve kâtibe satılabilir. | — | — | Haber defteri tutarsın; yalan söylenti senin masanda çürür. |
| `hanci.haber.2` | Söylenti ağı | özel | Ayda 1: bir söylentiyi komşu kasabaya taşırsın ya da yayılmasını durdurursun. Eylem adınla kayda geçer; yalanı yayarsan nam kaybedersin. | — | [Faz 4] | Söylentiyi sen yayar ya da susturursun; adın kayıtta durur. |
| `hanci.haber.3` | Han meclisi | hak | Ayda 1: ortak dert ya da şenlik çağrısı kasabadaki her oyuncunun dönüş kartına düşer. [Faz 7] sonra dilekçeler han meclisinden de geçer. | — | pir | Han meclisini toplarsın; çağrın her kapıya ulaşır. |

### 2.8 Şifacı (attar ve ebe içeride) — Hizmet

> *Fantezi:* "Yarayı ben kapatırım, doğumu ben karşılarım; zehre panzehiri bir tek ben bilirim."

| | |
|---|---|
| **Kim ister** | Yaralılar (oyuncu ve NPC; ocak kazası, çatışma); doğum yapan haneler; asker (merhem); dokumacı (kök boya); aşçı (baharat ve şifalı ot); salgın derdinde kasaba |
| **Boşsa kasaba** | Yaralı yarı hızda iyileşir; NPC doğumunda risk görünür biçimde artar; salgında yalnız NPC bakımı kalır. **Sağlık −2/ay** |
| **Eşsiz cazibe** | Can ve yaralı durumunu toparlayan, doğumu güvenli kılan, panzehir yapan tek meslek |
| **Temel iş / usta iş** | "Ot topla" şifacının kendi işidir. `otlar.0` ayrı usta işi "şifalı ot seç"i açar. |
| **Tedarik → müşteri** | Dokumacı (bez) · oduncu (kereste atel, kömür) · tüccar (uzak ot) → asker, herkes, hanedan, dokumacı, aşçı |
| **NPC tabanı sınırı** | NPC şifacı ayda 1 yara bakımı yapar (can +10, bir ay sonra). Kırık sarma, dikiş, güç doğum ve panzehir yoktur. |

| Kimlik | Ad | Tür | Açtığı | İster | Şart | Etki metni |
|---|---|---|---|---|---|---|
| `sifaci.hekimlik.0` | Sargı ve merhem | tarif | `merhem`: 2 şifalı ot + 1 ot → 2 merhem · 1t; hizmet `yaraBak`: 1 merhem · 1t → hedefin canı +10 | şifalı ot | — | Merhem karıp yara sararsın; yaralı senin elinde toparlanır. |
| `sifaci.hekimlik.1` | Kırık sarma | kalite | Hizmet `kirikSar`: 1 bez + 1 kereste + 1 merhem · 2t → can +20 ve "yaralı" durumu biter; toparlama tam hıza döner | bez, kereste | — | Kırığı atelle sararsın; yaralının toparlanması tam hıza döner. |
| `sifaci.hekimlik.2` | Yara dikişi | özel | Ölümcül yara: 1 aylık pencerede ölümü yalnız usta hekim önler. 2 merhem + 1 bez + 1 şifa şerbeti · 3t. Kurtarılanla aranızda "can borcu" bağı kurulur (ilişki kaydı). | şifa şerbeti | ölümcül yara [Faz 8]; o gelene dek ocak kazası ve haydut olayları | Ölümcül yarayı dikersin; kurtardığın can sana borçlu kalır. |
| `sifaci.hekimlik.3` | Darüşşifa hakkı | hak | Koltuk: darüşşifa. Kasabanın NPC şifacısı usta kalitesine çıkar (NPC yara bakımı can +20, herkese). Salgında [E6] katkın iki sayılır. Yükümlülük: ayda 2 bakım. | — | pir, koltuk | Darüşşifanın kapısını açarsın; kasabanın bütün yaraları senin icazetinle sarılır. |
| `sifaci.ebelik.0` | Lohusa bakımı | tarif (hizmet) | `lohusa`: 1 bez + 1 şifalı ot · 1t → yeni doğumdan sonra anne ve bebeğin riski (dökümde görünür) kalkar. NPC doğum talepleri (`donum.ts` doğumları) sana gelir. | bez | — | Lohusayı ve bebeği korursun; ocak sönmez. |
| `sifaci.ebelik.1` | Güç doğum | kalite | Hizmet `gucDogum`: 2 merhem + 1 bez · 2t → güç doğum olayında anne de bebek de kurtulur (NPC ebe yalnız birini kurtarır; dökümde yazar) | merhem | NPC doğumu şimdi; oyuncu hanedanı [Faz H] | Güç doğumda iki canı birden kurtarırsın. |
| `sifaci.ebelik.2` | Hane ebeliği *(ad değişir: Çocuk hastalıkları)* | özel | Bir haneyle "ebe bağı": o hanenin doğum ve çocuk hastalığı olaylarına ilk sen çağrılırsın; vâris çocuğun riski düşer ve görünür. | — | [Faz H]; o gelene dek NPC haneleri | Hanenin ebesi olursun; soyun devamı sana emanettir. |
| `sifaci.ebelik.3` | Ebe başı | hak | Kasabanın NPC ebeleri senin icazetinle çalışır. Bütün doğumlarda NPC ebe usta kalitesine çıkar; risk herkes için düşer. | — | pir | Kasabanın bütün doğumları senin icazetinle güvende. |
| `sifaci.otlar.0` | Ot tanıma | tarif | Usta işi "şifalı ot seç" (1t → 2 şifalı ot, temel işten ayrı); `otAyikla`: 3 ot → 1 şifalı ot · 1t | ot | — | Dağın otunu tanırsın; şifalı olanı sen ayırırsın. |
| `sifaci.otlar.1` | Kurutma ve damıtma | kalite | `boya`: 3 ot + 1 odun → 1 kök boya · 1t (halı ve sancak için); `sifaSerbeti`: 3 şifalı ot + 1 kömür → 1 şifa şerbeti · 1t (içen kondisyon +15) | kömür | — | Kök boya kaynatır, şifa şerbeti damıtırsın. |
| `sifaci.otlar.2` | Panzehir | özel | `panzehir`: 2 şifalı ot + 1 şifa şerbeti → 1 panzehir · 2t. Zehirlenen panzehirle kurtulur. Zehir aynı bilgiden çıkar ama yapımı suçtur ve iz bırakır (Faz 8 kuralı). | şifa şerbeti | zehir [Faz 8]; o gelene dek yılan sokması ve zehirli ot olayları | Panzehiri bir tek sen bilirsin; zehrin karşısında son kapı sensin. |
| `sifaci.otlar.3` | Attarlık beratı | hak | Koltuk: attar dükkânı. Uzak kervanın baharat ve otları için kasabanın alım siparişi sende açılır. Hastalıkta NPC'ler önce sana başvurur (NPC hizmet talebinin öncelikli alıcısısın). Salgında ilaç dağıtımını kasaba bütçesi öder. | — | pir, koltuk | Attar dükkânın kasabanın eczanesidir; hasta önce senin kapını çalar. |

### 2.9 Ozan / derviş (müzisyen içeride) — Hizmet

> *Fantezi:* "Türküm kırgını güldürür, destanım bir hanenin namını kuşaklar boyu taşır; kroniği ben yazarım."

| | |
|---|---|
| **Kim ister** | Hancı (sahne, saz gecesi); kırgın ve yaslı oyuncular ve NPC'ler (gönül); iyilik yapanlar ve hanedanlar (destan, nam); arabulucu (barış ilahisi); makam sahipleri (övgü ya da hiciv) |
| **Boşsa kasaba** | Gönül yalnız sohbet ve dostla toparlanır; destan ve kronik yazılmaz. **Huzur −2/ay** |
| **Eşsiz cazibe** | Nam üreten tek meslek: iyiliği türküye, hanedanı destana, yılı kroniğe çevirir |
| **Temel iş / usta iş** | Kendi temel işi yoktur. Tecrübesi hizmet tariflerinden ve NPC taleplerinden ("yaslı hane", "düğün") gelir. |
| **Tedarik → müşteri** | Marangoz (saz) · hancı (sahne) · aşçı (şenlik) → hancı, herkes, hanedan, arabulucu, divan |
| **NPC tabanı sınırı** | NPC ozan handa ayda bir türkü söyler (+2 gönül). Destan, atışma, kronik ve barış ilahisi yoktur. |

| Kimlik | Ad | Tür | Açtığı | İster | Şart | Etki metni |
|---|---|---|---|---|---|---|
| `ozan.sahne.0` | Türkü ve mâni | tarif (hizmet) | `turku`: 1t → handa bir aylık sahne: o ay handa sohbet edenler +3 gönül alır. NPC bahşişi ayda en çok 4 akçedir. Sahne sırası teveccühe göredir (§1.7). | — | — | Handa türkü söylersin; dinleyenin gönlü açılır. |
| `ozan.sahne.1` | Saz ustalığı | kalite | `sazliSahne`: saz (araç, 12 kullanım) · 1t → sahne +6 gönül; hancının saz gecesine katılırsın | saz (marangoz) | — | Sazla çalarsın; saz gecelerinin aranan sesi olursun. |
| `ozan.sahne.2` | Meydan atışması | özel | İki ozan (oyuncu ya da NPC) şenlikte ya da handa atışır. Dinleyiciler oy verir ve oylar görünür. Kazanan nam alır, ikisi de tecrübe alır. Yalnız iki ozanla olur. | — | — | Meydanda atışırsın; kazanırsan adın çarşıda dolaşır. |
| `ozan.sahne.3` | Ozan postu | hak | Koltuk: ozanbaşı. Şenlik sahnesini dağıtırsın. Yılda 1 kez bir makam sahibi için övgü ya da taşlama yazarsın; meşruiyetine küçük ve görünür bir etki eder. | — | pir, koltuk; makam [Faz 7/P] | Ozanbaşısın; sazın makam sahibini över ya da yerer. |
| `ozan.gonul.0` | Teselli sözü | tarif (hizmet) | `teselli`: 1t → hedefin gönlü +8 (kırgınsa +12). Yaslı NPC hanesi talebi sana gelir. | — | — | Teselli edersin; kırgın gönül senin sözünle doğrulur. |
| `ozan.gonul.1` | Dertleşme | kalite | `dertlesme`: 2t → hedef NPC'nin derdi (gündemi) sana görünür. Hedef oyuncu kırgınsa gönül tabanı o ay 40 olur. | — | NPC gündemi [Faz 5]; o gelene dek yalnız oyuncu etkisi | Dertleşirsin; NPC'nin derdini bilen sen olursun. |
| `ozan.gonul.2` | Barış ilahisi | özel | Husumetli iki taraf için okunur. Arabulucunun aynı ayki uzlaşma denemesinin şansına dökümde +10 puan ekler; arabulucusuz, tek başına etki etmez. | — | husumet [Faz 4/8] | İlahin öfkeyi yatıştırır; arabulucunun sözü sonra daha kolay geçer. |
| `ozan.gonul.3` | Tekke postu | hak | Koltuk: zaviye. Evsiz ve yolcuya ayda 4 yatak verirsin (ücretsiz, kondisyon +5). Ahi zaviyesinin [Faz 17] şeyh adayısın. Minber eseri (`marangoz.tezyin.2`) ister. | minber eseri | pir, koltuk | Tekke postuna oturursun; kapın kimsesize açıktır. |
| `ozan.destan.0` | Kahramanlık türküsü | tarif (hizmet) | `turkuYak`: 1t → olay defterinden bir iyiliği (sipariş teslimi, hayat kurtarma, imece) türküye çevirirsin. O kişi ilgili namdan +1 alır (kişi başına yılda 1). | — | — | İyiliği türküye çevirirsin; adı kasabada söylenir. |
| `ozan.destan.1` | Ezber destan | kalite | Türkülerin komşu kasabalara yayılır; o kişiyi oradaki NPC'ler tanır (ilk görüş +5) | — | söylenti [Faz 4] | Destanın dilden dile geçer; nam sınırı aşar. |
| `ozan.destan.2` | Nam yayan destan | özel | Hanedan destanı: bir hanenin 3 olayını isimli destana bağlarsın. Vâris devrinde nam düşmez [Faz H]. Ustalar Levhası. | — | — | Bir hanenin destanını yazarsın; vârisleri bile o namla anılır. |
| `ozan.destan.3` | Kronik kalemi | hak | Koltuk: yıl sonunda "Kasaba Kroniği"ne yılın 3 olayını yazarsın. Kayıt herkese görünür ve kalıcıdır; kronikte adı geçenin namı kalıcılaşır. | — | pir, koltuk | Kroniği sen yazarsın; yılın hatırası senin kalemindir. |

### 2.10 Kâtip / ulak — Hizmet

> *Fantezi:* "Yazıya geçmeyen söz rüzgâra karışır; benim kalemim sözü bağlar, mektubum yolu aşar."

| | |
|---|---|
| **Kim ister** | Tüccar (senet, defter, tercüme); arabulucu (senet, tercüme); hanedanlar (vasiyet); herkes (sözleşme, mektup); kurumlar [Faz 7] (belge, tahrir) |
| **Boşsa kasaba** | Senet ve vasiyeti yalnız kadı naibi (NPC) yazar: pahalı ve bir ay gecikmeli. Mektup iki ayda ulaşır. **Huzur −1/ay** (Asayiş dolaylı olarak düşer) |
| **Eşsiz cazibe** | Oyuncular arası sözün **sunucuda bağlayıcı** olmasını sağlayan tek meslek: senet, sözleşme, vasiyet, sicil |
| **Temel iş / usta iş** | Kendi temel işi yoktur; tecrübesi belge tariflerinden ve mektup taleplerinden gelir. |
| **Tedarik → müşteri** | Tüccar (kâğıt) · oduncu (kömür) · şifacı (ot) → tüccar, arabulucu, divan, herkes |
| **NPC tabanı sınırı** | Kadı naibi (kurum NPC'si) senet ve mektup yazar. Hatlı belge, sicil, mühürlü mektup ve tahrir yoktur. |

| Kimlik | Ad | Tür | Açtığı | İster | Şart | Etki metni |
|---|---|---|---|---|---|---|
| `katip.belge.0` | Dilekçe ve senet | tarif | `murekkep`: 1 kömür + 1 ot → 2 mürekkep · 1t; `senet`: 1 kâğıt + 1 mürekkep → 1 senet · 1t. Oyuncular arası alacak ya da teslim sözü sunucuda kayıtlı olur; bozan taraf görünür "sözünde durmadı" izi alır. | kâğıt (tüccar) | — | Senedi sen yazarsın; söz artık havada kalmaz. |
| `katip.belge.1` | Güzel yazı | kalite | `hatliBelge`: 1 kâğıt + 2 mürekkep → 1 hatlı belge · 2t. Koltuk beratlarının ve kurum belgelerinin resmî nüshası; yapı kitabesinin yazısı. | — | — | Hatlı belge yazarsın; beratlar ve kitabeler senin yazınla asılır. |
| `katip.belge.2` | Vasiyet ve sözleşme | özel | `vasiyet`: 2 kâğıt + 1 mürekkep · 2t → bağlayıcı vasiyetname (miras vasiyetle, Berkay 31 Ekim). `sozlesme`: ortaklık, kira ya da çıraklık sözleşmesi; şartlar (teslim, pay, süre) sunucuda uygulanır. | — | vasiyet [Faz H]; sözleşme Faz 6 ile | Vasiyeti ve sözleşmeyi sen bağlarsın; ölümden sonra bile söz yerini bulur. |
| `katip.belge.3` | Mühür hakkı | hak | Koltuk: kasaba sicili. Belgeleri tasdik edersin; tasdikli senede itiraz edilemez. Sahte belgeyi ayırt edersin. | mühür (demirci piri ya da bölge darphanesi ×4 fiyat) | pir, koltuk | Sicil defteri sende; mühürlediğin belgeye kimse itiraz edemez. |
| `katip.ulak.0` | Köy mektubu | tarif (hizmet) | `mektup`: 1 kâğıt · 1t → başka yerleşimdeki oyuncuya mektup (ertesi ay ulaşır); NPC ulak 2 ay ve 2,5 kat pahalı | kâğıt | ikinci yerleşim | Mektubu yazıp yola çıkarırsın; ses iki kasaba arasında yol bulur. |
| `katip.ulak.1` | Hızlı ulak | kalite | Aynı ay teslim | çizme (dokumacı; 6 yolda eskir) | — | Hızlı ulak olursun; haber aynı ay kapıdadır. |
| `katip.ulak.2` | Mühürlü mektup | özel | Mühürlü mektup yolda okunamaz; mühür kırılırsa alıcı iz görür. Kurum yazışması bununla yapılır. | mühür | casusluk [Faz 8]; kurum [Faz 7] | Mühürlü mektubu yalnız alıcısı açar; kırılan mühür iz bırakır. |
| `katip.ulak.3` | Menzil hakkı | hak | Koltuk: menzilhane. Kasabanın bütün ulakları (oyuncu ve NPC) senin menzilinden geçince bir ay hızlanır. Komşu yerleşimlerle resmî yazışma sende. | — | pir, koltuk; bölge postası [P] | Menzilhane sende; kasabanın haberi herkesten önce yola çıkar. |
| `katip.defter.0` | Hesap defteri | tarif | `defter`: 1 kâğıt + 1 mürekkep · 1t → bir oyuncunun ya da kurumun 6 aylık alım-satım dökümünün tasdikli defteri. Ortaklıkta pay bu defterle otomatik dağılır; vergi sayımında defteri olan itiraz edebilir. | kâğıt | — | Hesap defteri tutarsın; ortaklıkta kimse kimseyi kandıramaz. |
| `katip.defter.1` | Tercüme | kalite | Yabancı NPC elçi ve tüccarla (Bizans, İlhanlı, Arap tüccarı) anlaşma metni. Arabulucunun beylik elçiliği ve tüccarın uzak kervanında ek pazar tercüme ister. | — | — | Tercüman olursun; yabancının sözü senin kaleminle anlaşılır. |
| `katip.defter.2` | Tahrir defteri | özel | Kasabanın nüfus ve mülk sayımı, yılda 1 (4 kâğıt + 4t). Tahrirli kasabada vergi doğru konur ("kayıt dışı" kalemi sıfırlanır) [Faz 7] ve lonca tablosunda kademe ayrıntısı görünür. | kâğıt ×4 | — | Kasabanın tahririni yazarsın; kim var, ne var, deftere geçer. |
| `katip.defter.3` | Defterdarlık yolu | hak | Bölge defterdarı makamına adaylık [P1]. O gelene dek kasaba hazine defteri sende tutulur. | — | pir | Hazinenin defteri sende; defterdarlığa giden yol senden geçer. |

### 2.11 Tüccar / kervancı — Ticaret

> *Fantezi:* "Bir kasabanın bolluğunu ötekinin kıtlığına taşırım; yolun her tehlikesini, çarşının her fiyatını bilirim."

| | |
|---|---|
| **Kim ister** | Üreticiler (kotası dolan mal, uzak satış); kâtip (kâğıt); aşçı (tuz); şifacı (uzak ot); dokumacı (ipek); kıtlık çeken komşu yerleşim; kurumlar (toptan tedarik) |
| **Boşsa kasaba** | Mal yerleşimler arasında dolaşmaz; kotası dolan üretici malını satamaz; tuz, kâğıt ve uzak mal yalnız NPC'den ve pahalıya gelir. **Erzak −1/ay** (Asayiş: kervan uğramaz) |
| **Eşsiz cazibe** | Yerleşimler arası arz: kıtlık primi olan yere mal götüren ve uzak malı getiren tek meslek. Komşu kasabaların fiyatını da yalnız o görür. |
| **Temel iş / usta iş** | Kendi temel işi yoktur. Tecrübesi kervan seferinden, tezgâh satışından ve toptan teslimden gelir (satış başına +1, sefer 2 × takat). |
| **Tedarik → müşteri** | Kâtip (senet) · marangoz (araba, kağnı) · demirci (nal) · dokumacı (koşum, çadır) · asker (muhafız) → bütün üreticiler, kâtip, aşçı, şifacı, dokumacı, komşu yerleşimler |
| **NPC tabanı sınırı** | NPC tüccar kasabada sade arz satar (×2,5). Yerleşimler arasında mal taşımaz, uzak malı kotalı ve ×4 satar, fiyat bilgisi vermez. |

**Ön şart:** Kervan düğümleri en az 2 yerleşim ve aralarında yol ister. Tek yerleşimli dünyada tüccar meslek olarak kilitli görünür (§8).

| Kimlik | Ad | Tür | Açtığı | İster | Şart | Etki metni |
|---|---|---|---|---|---|---|
| `tuccar.pazar.0` | Tezgâh kurma | tarif (hizmet) | Tezgâh: başkalarının malını emanet alır, kendi **tezgâh kotanla** (mal başına ayda +6) NPC'ye satarsın; komisyonu (%0–20) sen belirlersin. Üreticinin kotası dolsa da malı akçeye döner. | — | — | Tezgâh kurarsın; kotası dolan üreticinin malı senin tezgâhında satılır. |
| `tuccar.pazar.1` | Pazarlık ustalığı | kalite | Kasabanın bütün NPC alış ve satış fiyatları, stok kanalı ve açık siparişler tek tabloda. NPC'den alımda ayrıca tüccar kotası (mal başına +3); aldığını üreticiye satarsın. | — | — | Çarşının bütün fiyatını bilirsin; ucuzu bulur, ihtiyacı olana götürürsün. |
| `tuccar.pazar.2` | Toptan alım | toplu | Vadeli alım: bir üreticinin 3 aylık çıktısını kâtip senedi üzerinden peşin akçeyle önceden alırsın. Kurum siparişinin tedarikçisi olursun. | senet (kâtip) | — | Üreticinin hasadını önceden alırsın; ikiniz de belirsizlikten kurtulursunuz. |
| `tuccar.pazar.3` | Pazar başı *(ad değişir: Pazar kethüdalığı)* | hak | Koltuk: ayda 1 pazar günü ilan edersin. O gün kasabada bütün NPC alım kotaları herkes için +2 olur. Hileli tartıyı muhtesibe (divan) bildirirsin. Yükümlülük: ayda 1 pazar günü. | — | pir, koltuk | Pazar gününü sen ilan edersin; o gün çarşı herkese bereket getirir. |
| `tuccar.kervan.0` | Yük hayvanı | tarif (hizmet) | `kervan`: 2 nal + 1 koşum + 2t → en çok 12 malı komşu yerleşime taşırsın (yolda 1 ay). Varışta oranın fiyatı (kıtlık primi orada) ve senin varış kotanla satarsın. | nal, koşum | 2 yerleşim | Yük hayvanını yüklersin; bir kasabanın bolluğu ötekinin kıtlığına gider. |
| `tuccar.kervan.1` | Toplu yük | toplu | Arabayla 30 mal. Başkalarının malını navlunla (adet başına ücret) taşırsın. "Kervan" kurum siparişi. | araba (marangoz) | — | Arabanla toplu yük taşırsın; başkalarının malı da senin kervanında yol alır. |
| `tuccar.kervan.2` | Uzak şehir kervanı | özel | Bölge dışına 2 aylık sefer. Uzak mallar (ipek, baharat, kâğıt, tuz) oyuncuya yalnız bu yolla ucuz gelir. Haydut olasılığı dökümde yazar; muhafız (asker) varsa kayıp yerine çatışma olur. | çadır (dokumacı); tercüme ek pazar açar | — | Uzak şehre kervan çekersin; ipek ve baharat senin yükünle gelir. |
| `tuccar.kervan.3` | Kervan sancağı | hak | Kervanbaşısın: kafile kurarsın. Katılan tüccarlar riski paylaşır (haydut kaybı kafileye bölünür). Kervansarayda (hancı) konak garantilidir. | — | pir | Kafileyi sen çekersin; yolda kimse yalnız kalmaz. |
| `tuccar.yol.0` | Fiyat haberi | tarif (hizmet) | `fiyatHaberi`: 1t → komşu 3 yerleşimin lonca tablosu ve en pahalı 3 malı (1 ay geçerli). Haberi başkasına satabilirsin. | — | 2 yerleşim | Komşu çarşıların haberini alırsın; nerede neyin kıt olduğunu bilirsin. |
| `tuccar.yol.1` | Güvenli yol | kalite | Rota seçimi: kısa ama riskli ya da uzun ama güvenli. Haydut olasılığı rotada yazar. | — | — | Yolun tehlikesini okursun; kervanını güvenli rotadan geçirirsin. |
| `tuccar.yol.2` | Uzak mal bilgisi | özel | Özel sipariş: bir oyuncu adına uzak mal getirme sözleşmesi (isimli). Uzak pazarların 6 aylık fiyat döngüsünü görürsün. | senet | — | Kimsenin bulamadığını getirirsin; adınla söz verir, adınla teslim edersin. |
| `tuccar.yol.3` | Yol beratı | hak | Koltuk: yol emini. Kasaba yolundan geçen kervanların yol akçesi kasabaya girer, bir payı sana düşer. Haydut olayında garnizonu çağırırsın. Yükümlülük: yılda 2 yol onarımı (taş). | — | pir, koltuk; vali pazarlığı [P] | Yolun emini sensin; kervan senin yolunda güvende yürür. |

### 2.12 Arabulucu — Toplum

> *Fantezi:* "Husumet kan davasına dönmeden ben araya girerim; iki kasaba, iki hane benim sofram etrafında barışır."

| | |
|---|---|
| **Kim ister** | Husumetli kişiler ve haneler (oyuncu ve NPC); komşu yerleşimler (mera ve su kavgası); tüccar (senet ihtilafı, yol izni); divan ve vali (elçilik, haraç müzakeresi) |
| **Boşsa kasaba** | Küslükler yalnız dost aracılığıyla çözülür, NPC ihtiyarlarınınki zayıftır. Husumet bir basamak daha kolay tırmanır (dökümde yazar). **Asayiş −1/ay, Huzur −1/ay** |
| **Eşsiz cazibe** | Tanışıklık şartı olmadan araya girebilen, aileler ve kasabalar ölçeğinde barıştıran, rızalı hakem kararını sunucuda uygulatan tek meslek |
| **Temel iş / usta iş** | Kendi temel işi yoktur. Tecrübesi NPC talebinden ("iki komşu küs") ve oyuncu talebinden gelir. |
| **Tedarik → müşteri** | Kâtip (senet, tercüme) · aşçı (barış sofrası) · ozan (barış ilahisi) · zanaatkâr (armağan malı) → kişiler, haneler, tüccar, divan, bölge |
| **NPC tabanı sınırı** | NPC ihtiyar ayda 1 küslüğü düzeltmeyi dener (düşük şans). Aile ve kasaba ölçeği, kan davası ve hakemlik yoktur. |

| Kimlik | Ad | Tür | Açtığı | İster | Şart | Etki metni |
|---|---|---|---|---|---|---|
| `arabulucu.uzlastirma.0` | Ara bulma sözü | tarif (hizmet) | `araBul`: 1t → iki NPC ya da oyuncu–NPC arasındaki küslüğü (görüş ≤ −20) düzeltme denemesi. Şans dökümü görünür. Tanışıklık şartı yoktur; dost arabuluculuğundan (§6.2 OYNANIS) farkı budur. | — | — | Hiç tanımadığın iki küsün arasını bulursun. |
| `arabulucu.uzlastirma.1` | Barış sofrası | kalite | `barisSofrasi`: 2 çorba ya da 3 ekmek + 2t → **hane–hane** küslüğüne uygulanır; iki hanenin bütün üyeleri tek denemede etkilenir | aş (aşçı) | — | Sofra kurup iki aileyi barıştırırsın. |
| `arabulucu.uzlastirma.2` | Kan davasını bitirme | özel | Kan davasında diyet pazarlığı ve barış yemini. Yemini bozan hane "lekeli" olur ve bu görünür. Barış isimle kayda geçer. | senet (kâtip) | kan davası [Faz 8] | Kan davasını bitirirsin; yemini bozan herkesin önünde lekelenir. |
| `arabulucu.uzlastirma.3` | İhtiyar heyeti | hak | Koltuk: kasabadaki bütün açık husumetleri listede görürsün ve onlara arabulucu atarsın. Heyetin başlattığı uzlaşma ilk denemede reddedilmez. | — | pir, koltuk | İhtiyar heyetindesin; kasabanın bütün kavgası senin önünden geçer. |
| `arabulucu.elcilik.0` | Komşu köy elçiliği | tarif (hizmet) | Komşu yerleşimle anlaşmazlık (mera, su, kervan) olayını çözme denemesi. Başarırsan iki yerleşim arasındaki kervan yolu o yıl güvenli olur. | — | 2 yerleşim | Komşu köye elçi gidersin; mera kavgası sofrada biter. |
| `arabulucu.elcilik.1` | Hediyeli elçilik | kalite | Armağan malıyla (kündekâri, halı, pastırma) elçilik: komşunun tutumu iyileşir, tüccara yol akçesi alınmaz. | armağan malı | — | Armağanla gidersin; komşu kasabanın kapısı tüccarlarına açılır. |
| `arabulucu.elcilik.2` | Beylik elçiliği | özel | Bölgeler arası, Sultan ya da Moğol elçisiyle haraç ve ateşkes müzakeresi. Haraç seçeneklerinden birini sen açarsın. | tercüme (kâtip) | [P2] | Saraya elçi gidersin; haracın ölçüsü senin sözünle konuşulur. |
| `arabulucu.elcilik.3` | Elçi beratı | hak | Bölgenin resmî elçiliğine adaylık | — | pir; [P1] | Bölgenin elçisi olmaya adaysın. |
| `arabulucu.hukum.0` | Şahit dinleme | tarif (hizmet) | `sahitDinle`: 1t → bir olayın tanıklarını dinlersin; olay defterinden kimin neyi gördüğü açılır (gerçek ile bilinen ayrımı, pusula ilke 9) | — | — | Şahitleri dinlersin; gerçek ile söylenti ayrılır. |
| `arabulucu.hukum.1` | Hakem kararı | kalite | Senetli ihtilafta, iki tarafın rızasıyla hakemlik. Karar sunucuda uygulanır: senet tutarına kadar akçe ya da mal aktarılır. | senet | — | Rızalı hakem olursun; kararın sunucuda yerine gelir. |
| `arabulucu.hukum.2` | Töre bilgisi | özel | Yılda 1 kasaba töresi önerisi (ör. "mera kavgasında önce arabulucu"); kabul edilirse olay seçeneklerine eklenir. Kan davasında diyet ölçüsünü sen koyarsın. | — | — | Töreyi bilirsin; kasabanın yazısız kuralına bir madde eklersin. |
| `arabulucu.hukum.3` | Kadılık yolu | hak | D-28 sonrası kadılık adaylığı. O gelene dek **naip** olarak rızasız hakemlik açabilirsin; karar 1 ay itiraza açıktır, itirazı bölge görür. | — | pir; D-28 için §9 S4 | Kadı naibisin; sözün kasabada hüküm sayılır. |

### 2.13 Asker — Toplum (ağır meslek: kalfalık 16 yaş)

> *Fantezi:* "Surda nöbet tutarım, kervana muhafız olurum; garnizon olmadan ne yol ne çarşı güvendedir."

| | |
|---|---|
| **Kim ister** | Kasaba (nöbet, Asayiş); tüccar (kervan muhafızı); divan ve vali (garnizon, sefer); haydut ortak derdi |
| **Boşsa kasaba** | Yalnız NPC garnizon kalır, kalfa kalitesinde. Hırsızlık ve haydut olasılığı dökümde artar. **Asayiş −2/ay** |
| **Eşsiz cazibe** | Asayiş göstergesinin asıl taşıyıcısıdır; kervanın kaderini çatışmaya çevirir; tehdidi bir ay önce görür |
| **Temel iş / usta iş** | Kendi temel işi yoktur. Tecrübesi kasaba görevinden (nöbet koltuğu) ve muhafızlıktan gelir. `kesif.0` av işini de açar (avcı içeride). |
| **Tedarik → müşteri** | Demirci (mızrak, kalkan, kılıç, zırh) · dokumacı (çizme, giysi, çadır, sancak) · aşçı (peksimet, kuru et) · şifacı (merhem) → kasaba, tüccar, divan |
| **NPC tabanı sınırı** | NPC garnizon tabanı Asayiş'i 30'da tutar. Devriye, gözcülük ve muhafızlık yoktur. |

| Kimlik | Ad | Tür | Açtığı | İster | Şart | Etki metni |
|---|---|---|---|---|---|---|
| `asker.nobet.0` | Sur nöbeti | tarif (hizmet) | Kasaba görevi `nobet`: 2t + mızrak (6 nöbette eskir) → Asayiş +1, ulufe 4 akçe (kasaba öder). Kasabada ayda 4 nöbet koltuğu vardır. | mızrak (demirci) | 16 yaş | Surda nöbet tutarsın; kasaba geceyi senin gözünle geçirir. |
| `asker.nobet.1` | Gece devriyesi | kalite | Devriye ayında kasabadaki hırsızlık olaylarının faili görünür olur; dökümde hırsızlık olasılığı düşer | mızrak | suç [Faz 8]; o gelene dek NPC hırsızlık olayları | Gece devriyesine çıkarsın; hırsız iz bırakmadan kaçamaz. |
| `asker.nobet.2` | Kapı muhafızlığı | özel | Kapı defteri: kasabaya giren yabancılar (başka yerleşimin oyuncusu, NPC yolcu) kayda geçer; casus ve haydut ilk ay tespit edilir | — | — | Kapıyı tutarsın; kasabaya kim girdiyse defterinde yazar. |
| `asker.nobet.3` | Garnizon ağalığı | hak | Koltuk: nöbet koltuklarını dağıtırsın. Ayda 1 NPC garnizon talimi: NPC savunma kalfa kalitesinden usta kalitesine çıkar. Yükümlülük: ayda 2 nöbet. | — | pir, koltuk | Garnizonun ağasısın; nöbet senin düzeninle döner. |
| `asker.sefer.0` | Mızrak talimi | tarif (hizmet) | `talim`: 2t → NPC gençlerini talim edersin; NPC garnizon tabanı aşınmaz (o ay Asayiş aşınması −4 yerine −2). Haydut ortak derdinde [E6] "talimli katkı" türünü açar. | — | 16 yaş | Köyün gençlerine mızrak talimi verirsin; garnizon sensiz zayıflar. |
| `asker.sefer.1` | Saf düzeni | kalite | Saf: 3 ya da daha çok asker (oyuncu ya da NPC) birlikte savunur. Haydut ve çatışma olayında saf seçeneği açılır. | kalkan, kışlık giysi | — | Saf kurarsın; tek başına durulmayan yerde birlikte durulur. |
| `asker.sefer.2` | Kervan muhafızlığı | özel | Muhafız sözleşmesi (ücreti tüccar öder, kâtip senedi). Haydut olayında kayıp yerine çatışma şansı açılır ve dökümde yazar. | kılıç (demirci) | kervan (tüccar) | Kervana muhafız olursun; haydut artık kolay lokma bulamaz. |
| `asker.sefer.3` | Sancak hakkı | hak | Bölge seferinde birlik komutanlığı [P]. O gelene dek haydut ortak derdinde önderlik: senin önderliğinde katkı eşiği düşük açılır. | sancak (dokumacı) | pir | Sancağı taşırsın; birlik senin ardından yürür. |
| `asker.kesif.0` | İz sürme | tarif (hizmet) | `izSur`: 1t → hırsızlık ya da kaçak olayında failin izini sürersin (şans dökümü). `av`: 1t + mızrak (aşınır) → 2 et + 1 post (avcılık). | — | — | İz sürer, av avlarsın; ormanda saklanan seni atlatamaz. |
| `asker.kesif.1` | Gözcülük | kalite | Yaklaşan tehdidi (haydut, akın) bir ay önce kasabaya duyurursun; ortak dert hazırlık penceresi bir ay uzar | — | ortak dert [E6] | Tepeden gözlersin; tehlike gelmeden kasaba hazırlanır. |
| `asker.kesif.2` | Düşman hattı keşfi | özel | Çatışmada karşı tarafın gücünü görürsün; isimli keşif raporu kurumlara sunulur | — | [Faz 8/P5] | Düşmanın hattına sızarsın; komutan senin raporunla karar verir. |
| `asker.kesif.3` | Öncü birlik hakkı | hak | Koltuk: iki yerleşim arasında yol devriyesi. O yolda kervanların haydut olasılığı düşer ve dökümde yazar. Akın öncülüğü [P]. Yükümlülük: ayda 1 devriye. | — | pir, koltuk; 2 yerleşim | Yolun öncüsüsün; kervan senin devriyende güvende yürür. |

### 2.14 Divan görevlisi — Toplum (kurum fazıyla açılır)

> *Fantezi:* "Vergiyi ben sayarım, çarşının terazisi bana bakar; makama giden yol benim defterimden geçer."

| | |
|---|---|
| **Kim ister** | Kasaba (vergi, bütçe, düzen); asker (ulufe, buyruk); marangoz (proje bütçesi); halk (dilekçe); makam adayları |
| **Boşsa kasaba** | Vergi "kayıt dışı" kalır (görünür kayıp); bütçe yalnız NPC muhtarın varsayılanıyla döner; hileli tartı yakalanmaz. **Asayiş −1/ay** (Faz 7 ile Hazine göstergesi) |
| **Eşsiz cazibe** | Kasabanın parasını ve kuralını yöneten, makama giden tek meslek yolu |
| **Temel iş / usta iş** | Kendi temel işi yoktur. Tecrübesi kasaba görevlerinden (sayım, denetim, kayıt) gelir. |
| **Tedarik → müşteri** | Kâtip (defter, belge) · asker (asayiş) → kasaba, asker, marangoz, herkes |
| **NPC tabanı sınırı** | NPC muhtar varsayılan bütçeyi uygular. Denetim, buyruk ve meclis kararı yoktur. |

**Ön şart:** Bütün dal Faz 7 (kurum, kasaba hazinesi) ve P1 (makam) üzerine kurulur. E4'te seçilemez; lonca tablosunda "kurumla
gelir" yazar (§8, §9 S3). Böylece etkisiz düğüm doğmaz.

| Kimlik | Ad | Tür | Açtığı | İster | Şart | Etki metni |
|---|---|---|---|---|---|---|
| `divan.hazine.0` | Vergi sayımı | tarif (hizmet) | Kasaba görevi `vergiSayimi`: 2t → aylık sayım; yapılmazsa vergi gelirinin %20'si "kayıt dışı" kalır (görünür kalem); ulufe | defter (kâtip) | [Faz 7] | Vergiyi sen sayarsın; hazineye giren her akçe deftere geçer. |
| `divan.hazine.1` | Bütçe defteri | kalite | Kasaba bütçesi önerisi: ulufe, aşhane, yapı projesi, darüşşifa payları; meclisin onayına sunulur | — | [Faz 7] | Bütçeyi sen yazarsın; kasabanın akçesi nereye gidecek, önerin belirler. |
| `divan.hazine.2` | Kıtlık yardımı | özel | Kıtlıkta hazineden ambar emininden zahire alım kararı ve dağıtım sırası | — | [Faz 7] + kıtlık [E6] | Kıtlıkta hazinenin kapısını açarsın. |
| `divan.hazine.3` | Hazine emini | hak | Hazine emini makamına adaylık | — | pir; [P1] | Hazine eminliğine adaysın. |
| `divan.nizam.0` | Çarşı denetimi | tarif (hizmet) | Muhtesiplik `denetim`: 1t → oyuncu pazarında hileli satışı ya da fiyatı tespit edersin; hileli satıcı "lekeli" olur | — | [Faz 6 pazar] | Çarşıyı denetlersin; hileli tartı senin gözünden kaçmaz. |
| `divan.nizam.1` | Ölçü ve tartı | kalite | Ayar damgası: tüccarın tartısını damgalarsın; damgalı tezgâhın satışı NPC alıcıya "güvenilir" etiketiyle çıkar (stok kanalında öncelik) | — | [Faz 6] | Tartıya damga vurursun; damgalı tezgâha herkes güvenir. |
| `divan.nizam.2` | Asayiş buyruğu | özel | Kapı kapama ya da karantina buyruğu (haydut, salgın): garnizonu ve şifacıyı yönlendirirsin; buyruklu ayda ortak derdin eşiği düşer | — | [Faz 7] + [E6] | Buyruk yazarsın; kasaba tehlikeye karşı kapılarını kapatır. |
| `divan.nizam.3` | Subaşılık | hak | Subaşı (asayiş amiri) makamına adaylık | — | pir; [P1] | Subaşılığa adaysın. |
| `divan.meclis.0` | Meclis kâtipliği | tarif (hizmet) | Kasaba görevi `meclisKaydi`: 1t → meclis kararlarının görünür defteri | — | [Faz 7] | Meclisin kâtibisin; alınan karar unutulmaz. |
| `divan.meclis.1` | Dilekçe kabulü | kalite | Oyuncu dilekçelerini (yapı, nöbet, şenlik) meclis gündemine alırsın | senet (kâtip) | [Faz 7] | Halkın dilekçesini meclise sen taşırsın. |
| `divan.meclis.2` | Meclis kürsüsü | özel | Karar önerir, oylama açarsın | — | [Faz 7] | Kürsüye çıkar, karar önerirsin; kasaba oylar. |
| `divan.meclis.3` | Makam adaylığı | hak | Kasaba ya da bölge makamına adaylık. Teveccüh, adaylıkta sınırlı meşruiyet desteği olarak sayılır (§6.2). | — | pir; [P1] | Makama adaysın; yolu defterden ve meclisten geçtin. |

---

## 3. Mal ve tarif kataloğu

### 3.1 Fiyat kuralı

Taban fiyat önerisi şu formüldür [PARAMETRE]:
**taban(çıktı) ≈ (Σ girdi tabanı + takat × `MESLEK_TAKAT_DEGERI[kd]`) / adet**, değer `[2,3,5,8]` (`temel-is.ts:190`).
Aşınan aracın payı taban ÷ ömürdür (ör. alet 24/4 = 6). Bu formül, fırsat maliyeti dökümünün (§5.4) zincirde tutarlı kalmasını
sağlar: her halka az da olsa değer katar, hiçbir tarif takatsiz kâr açmaz. Denge denetiminin üç fiyatı (nal 8, sert odun 3,
alet 24) esas alınmıştır.

### 3.2 Mallar

Alan önerisi (`mallar.ts`): `taban`, `meslek`, `kd` (üreten düğümün kademesi; NPC tabanı yalnız `kd ≤ 1` satar), `bozulur?`
(ay), `omur?` (araç kullanımı), `armagan?`, `uzak?` (yalnız kervanla ucuz gelir).

| Mal (`id`) | Ad | Meslek | kd | Taban | Bozulma / ömür | Kim kullanır |
|---|---|---|---|---|---|---|
| odun, tas, ot, yun, su, tahil | (mevcut) | — | 0 | 1, 1, 1, 2, 0, 2 | — | herkes |
| kereste, cevher, komur, sifaliOt, inceYun | (mevcut) | — | 0 | 3, 3, 3, 3, 4 | — | zanaatlar |
| sertOdun | Sert odun | oduncu | 0 | **3** (4'ten) | — | kiriş, saz, kündekâri |
| deri | Deri (tabaklanmış) | dokumacı | 0 | 3 | — | kılıç, pul zırh, koşum, saz |
| nal | Nal | demirci | 0 | **8** (4'ten) | — | kağnı, kervan |
| alet | Alet | demirci | 1 | **24** (14'ten) | 4 kullanım | hasat, ocak, blok |
| bugday | Seçme buğday | çiftçi | 1 | 3 | — | un |
| bakla | Bakla ve mercimek | çiftçi | 2 | 3 | — | çorba (isteğe bağlı) |
| post | Ham post | çiftçi | 1 | 2 | — | tabaklama, giysi |
| et | Et | çiftçi | 1 | 3 | 2 ay | kuru et, ziyafet |
| zahire | Zahire çuvalı | çiftçi | 0 | 16 | — | kıtlık, sefer, erzak sandığı |
| kiris | Kiriş | oduncu | 2 | 20 | — | ev, han, köprü, araba |
| bakir | Bakır | oduncu | 1 | 7 | — | kazan |
| gumus | Gümüş | oduncu | 2 | 45 | — | mühür, şaheser kılıç, sancak |
| kesmeTas | Kesme taş | oduncu | 0 | 5 | — | ev, blok |
| blok | Kesme blok | oduncu | 1 | 22 | — | han, sur, değirmen taşı |
| degirmenTasi | Değirmen taşı | oduncu | 2 | 60 | 12 kullanım | un |
| civi | Çivi | demirci | 0 | 4 | — | doğrama, araba, koşum |
| kazan | Bakır kazan | demirci | 1 | 24 | 12 kullanım | toplu kazan |
| mizrak | Mızrak | demirci | 0 | 11 | 6 nöbet | nöbet, av |
| kalkan | Kalkan | demirci | 0 | 11 | — | saf düzeni |
| kilic | Kılıç | demirci | 1 | 24 | — | muhafızlık, şaheser |
| zincir | Zincir zırh | demirci | 1 | 24 | — | pul zırh, asker |
| pulZirh | Pul zırh | demirci | 2 | 75 | — | asker, sefer |
| muhur | Mühür | demirci | 3 | 70 | — | sicil, mühürlü mektup |
| saheserKilic | Şaheser kılıç | demirci | 2 | NPC'ye satılmaz (değer ~120) | — | armağan, yadigâr |
| dograma | Doğrama | marangoz | 0 | 16 | — | onarım, ev, han, kündekâri |
| kagni | Kağnı | marangoz | 0 | 30 | 8 kullanım | toplu harman, kısa kervan |
| araba | Yaylı araba | marangoz | 1 | 70 | 12 kullanım | toplu yük |
| oyma | Oyma takımı | marangoz | 0 | 5 | — | armağan |
| saz | Saz | marangoz | 0 | 8 | 12 kullanım | sahne, armağan |
| kundekari | Kündekâri kapı | marangoz | 1 | 30 | — | han, seçkin oda, armağan |
| bez | Bez | dokumacı | 0 | 6 | — | zahire, sargı, çadır, oda |
| kumas | Kumaş | dokumacı | 1 | 11 | — | giysi, astar, sancak |
| giysi | Kışlık giysi | dokumacı | 1 | 16 | 8 ay | kış, saf düzeni |
| hali | Halı | dokumacı | 2 | 50 | — | seçkin oda, armağan |
| kosum | Koşum | dokumacı | 1 | 13 | — | araba, kervan |
| cizme | Çizme | dokumacı | 1 | 9 | 6 yol | hızlı ulak |
| astar | Zırh astarı | dokumacı | 2 | 24 | — | pul zırh |
| kece | Keçe | dokumacı | 0 | 8 | — | çadır |
| cadir | Kışlık çadır | dokumacı | 1 | 30 | 4 kullanım | yayla, sefer, kervan |
| sancak | Sancak | dokumacı | 2 | 95 | — | sancak hakkı, armağan |
| ekmek | Ekmek | aşçı | 0 | 2 | 1 ay | sofra, barış sofrası |
| un | Has un | aşçı | 1 | 4 | — | peksimet, ziyafet |
| corba | Çorba | aşçı | 0 | 3 | 1 ay | sofra, aşhane |
| kuruEt | Kuru et | aşçı | 0 | 5 | — | pastırma, erzak |
| peksimet | Peksimet | aşçı | 0 | 4 | — | sefer, kervan, erzak |
| pastirma | Pastırma | aşçı | 1 | 15 | — | uzak satış, armağan |
| erzakSandigi | Erzak sandığı | aşçı | 2 | 60 | — | kıtlık, sefer |
| serbet | Şerbet | hancı | 0 | 1 | 1 ay | ikram, saz gecesi |
| merhem | Merhem | şifacı | 0 | 5 | — | yara, dikiş, güç doğum |
| boya | Kök boya | şifacı | 1 | 7 | — | halı, sancak |
| sifaSerbeti | Şifa şerbeti | şifacı | 1 | 15 | — | kondisyon, panzehir, dikiş |
| panzehir | Panzehir | şifacı | 2 | 30 | — | zehir |
| murekkep | Mürekkep | kâtip | 0 | 3 | — | belgeler |
| senet | Senet | kâtip | 0 | 8 | — | sözleşme, hakem, toptan alım |
| hatliBelge | Hatlı belge | kâtip | 1 | 15 | — | berat, kitabe, kurum |
| tuz | Tuz | tüccar | 0 | 2 | — | kuru et |
| kagit | Kâğıt | tüccar | 0 | 3 | — | bütün belgeler |
| ipek | İpek | tüccar | uzak | 30 | — | sancak (sırmasız seçenek), armağan |
| baharat | Baharat | tüccar | uzak | 20 | — | ziyafet (şifalı ot yerine), armağan |

Belge nesneleri (vasiyet, sözleşme, defter, mektup) mal değildir. Oyuncuya ya da ilişkiye bağlı kayıtlardır; ticareti yapılmaz.

### 3.3 Tarifler

Bütün tariflerin tecrübesi 2 × takattir. "Araç" envanterde bulunup aşınan maldır; "zorunlu" yazmayan araç isteğe bağlıdır.

| Tarif | Düğüm | Girdi → çıktı | Takat |
|---|---|---|---|
| hasat (mevcut) | ciftci.ekin.0 | — → 3 tahıl; alet aracıyla 5 | 2 |
| sabanSurumu | ciftci.ekin.1 | alet (zorunlu araç) → 4 seçme buğday | 2 |
| baklagil | ciftci.ekin.2 | — → 4 bakla | 2 |
| kirkim (mevcut) | ciftci.suru.0 | — → 2 yün | 1 |
| kesim | ciftci.suru.1 | — → 2 et + 1 post | 2 |
| yaylaGocu | ciftci.suru.2 | çadır (araç) → 2 ay sonra 4 ince yün + 2 post + 2 et | 3 |
| zahire | ciftci.ambar.0 | 4 tahıl + 1 bez → 1 zahire | 1 |
| kereste (mevcut) | oduncu.orman.0 | **1** odun (2'den) → 1 kereste | 1 |
| kiris | oduncu.orman.2 | 2 sert odun + 1 kereste → 1 kiriş | 2 |
| komur (mevcut) | oduncu.maden.0 | **1** odun (2'den) → 1 kömür | 1 |
| bakirOcagi | oduncu.maden.1 | alet (zorunlu) + 1 kereste → 2 bakır | 2 |
| damarAra | oduncu.maden.2 | alet (zorunlu) + 1 kereste → %40 1 gümüş / %60 3 cevher; ayda 1 | 3 |
| kesmeTas | oduncu.tas.0 | 3 taş → 1 kesme taş | 1 |
| blok | oduncu.tas.1 | 2 kesme taş + alet (zorunlu) → 1 blok | 2 |
| degirmenTasi | oduncu.tas.2 | 2 blok + 1 sert odun → 1 değirmen taşı | 3 |
| nal (mevcut) | demirci.alet.0 | 1 cevher + 1 kömür → 2 nal | 1 |
| civi | demirci.alet.0 | 1 cevher + 1 kömür → 4 çivi | 1 |
| onarim | demirci.alet.0 | 1 kömür + aşınmış araç → sayaç sıfır | 1 |
| alet (mevcut) | demirci.alet.1 | 2 cevher + 1 kömür + 1 kereste → 1 alet | 2 |
| kazan | demirci.alet.1 | 2 bakır + 1 kömür → 1 kazan | 2 |
| muhur | demirci.alet.3 | 1 gümüş + 1 kömür → 1 mühür | 3 |
| mizrak | demirci.silah.0 | 1 cevher + 1 kömür + 1 kereste → 1 mızrak | 1 |
| kilic | demirci.silah.1 | 2 cevher + 2 kömür + 1 deri → 1 kılıç | 3 |
| saheserKilic | demirci.silah.2 | 2 kılıç + 1 gümüş → 1 isimli kılıç | 6 |
| kalkan | demirci.zirh.0 | 2 kereste + 1 cevher → 1 kalkan | 1 |
| zincir | demirci.zirh.1 | 3 cevher + 2 kömür → 1 zincir zırh | 3 |
| pulZirh | demirci.zirh.2 | 1 zincir + 2 deri + 1 astar → 1 pul zırh | 4 |
| dograma | marangoz.yapi.0 | 2 kereste + 2 çivi → 1 doğrama | 1 |
| kagni | marangoz.arac.0 | 4 kereste + 2 nal → 1 kağnı | 2 |
| araba | marangoz.arac.1 | 1 kiriş + 4 kereste + 4 çivi + 1 koşum → 1 araba | 3 |
| oyma | marangoz.tezyin.0 | 1 kereste → 1 oyma | 1 |
| saz | marangoz.tezyin.0 | 1 sert odun + 1 deri → 1 saz | 1 |
| kundekari | marangoz.tezyin.1 | 2 sert odun + 1 doğrama → 1 kündekâri | 3 |
| bez | dokumaci.kumas.0 | 2 yün → 1 bez | 1 |
| kumas | dokumaci.kumas.1 | 2 ince yün → 1 kumaş | 1 |
| giysi | dokumaci.kumas.1 | 1 kumaş + 1 post → 1 giysi | 1 |
| hali | dokumaci.kumas.2 | 4 ince yün + 2 boya → 1 halı | 4 |
| tabak | dokumaci.deri.0 | 2 post + 1 ot → 2 deri | 1 |
| kosum | dokumaci.deri.1 | 2 deri + 1 çivi → 1 koşum | 1 |
| cizme | dokumaci.deri.1 | 2 deri → 1 çizme | 1 |
| astar | dokumaci.deri.2 | 1 kumaş + 1 deri → 1 astar | 2 |
| kece | dokumaci.cadir.0 | 3 yün → 1 keçe | 1 |
| cadir | dokumaci.cadir.1 | 2 keçe + 1 kereste + 1 bez → 1 çadır | 2 |
| sancak | dokumaci.cadir.2 | 2 kumaş + 1 boya + 1 gümüş → 1 sancak | 4 |
| ekmek | asci.firin.0 | 2 tahıl + 1 odun → 3 ekmek | 1 |
| un | asci.firin.1 | 2 seçme buğday → 2 un; değirmen taşıyla 3 | 1 |
| corba | asci.mutfak.0 | 1 tahıl + 1 su (+1 bakla) → 2 (3) çorba | 1 |
| ziyafet (hizmet) | asci.mutfak.2 | 3 et + 4 un + 1 şifalı ot ya da baharat → ziyafet etkinliği | 4 |
| kuruEt | asci.saklama.0 | 2 et + 1 tuz → 2 kuru et | 1 |
| peksimet | asci.saklama.0 | 2 un + 1 odun → 3 peksimet | 1 |
| pastirma | asci.saklama.1 | 2 kuru et + 1 şifalı ot → 1 pastırma | 1 |
| erzakSandigi | asci.saklama.2 | 2 zahire + 2 kuru et + 3 peksimet → 1 sandık | 2 |
| serbet | hanci.etkinlik.0 | 1 su + 1 ot → 3 şerbet | 1 |
| merhem | sifaci.hekimlik.0 | 2 şifalı ot + 1 ot → 2 merhem | 1 |
| otAyikla | sifaci.otlar.0 | 3 ot → 1 şifalı ot | 1 |
| boya | sifaci.otlar.1 | 3 ot + 1 odun → 1 kök boya | 1 |
| sifaSerbeti | sifaci.otlar.1 | 3 şifalı ot + 1 kömür → 1 şifa şerbeti | 1 |
| panzehir | sifaci.otlar.2 | 2 şifalı ot + 1 şifa şerbeti → 1 panzehir | 2 |
| murekkep | katip.belge.0 | 1 kömür + 1 ot → 2 mürekkep | 1 |
| senet | katip.belge.0 | 1 kâğıt + 1 mürekkep → 1 senet | 1 |
| hatliBelge | katip.belge.1 | 1 kâğıt + 2 mürekkep → 1 hatlı belge | 2 |

Hizmet tarifleri (`yatak`, `oda`, `yaraBak`, `turku`, `nobet` vb.) §7'deki modelle tanımlanır; girdileri kartlardadır.

**Temel işler** (denge denetimiyle aynı): usta işi temel çıktının **yerine geçmez**, ayrı bir iştir:
"sert odun seç" (`oduncu.orman.0`), "cevher ayıkla" (`oduncu.maden.0`), "ince yün ayıkla" (`ciftci.suru.0`), "şifalı ot seç"
(`sifaci.otlar.0`). Her biri 1 takatte 2 adet verir ve kendi azalan getirisini taşır. Yeni temel iş: **"basit onarım"** (herkes;
aşınmış aracın sayacı −1; demircinin kendi işi). Ana mesleğin kendi temel işinde azalan getiri penceresi 2 aydır (denge).

### 3.4 Mevcut kodla fark tablosu

| Dosya | Mevcut | Önerilen |
|---|---|---|
| `mallar.ts` | 15 mal; alan: `taban`, `meslek` | +55 mal (§3.2); alanlar `kd`, `bozulur`, `omur`, `armagan`, `uzak`; nal 8, sert odun 3, alet 24 |
| `mallar.ts:39` | `deri` → dokumacı, kaynağı yok | `post` (çiftçi) → `tabak` tarifi → `deri` |
| `tarifler.ts` | 6 tarif; takat başına tecrübe 1–2 (Z3) | +58 mal tarifi (§3.3) + hizmet tarifleri (§7). Tecrübe alanı kaldırılır, 2 × takat hesaplanır. Kereste ve kömürde odun 2→1. Yeni alanlar: `arac.zorunlu`, `ayda?` (ayda en çok), `toplu?` |
| `temel-is.ts:175-181` | Usta işi temel çıktının yerine geçiyor | Ayrı usta işleri + "basit onarım"; su girdi oluyor |
| `meslekler.ts:52,169` | Tür kademeden kör atanıyor | Düğüm başına tür. Varsayılandan sapanlar: `ciftci.suru.1`, `oduncu.orman.2`, `demirci.alet.1`, `hanci.etkinlik.1` → tarif; `demirci.alet.3` → özel; `marangoz.yapi.1`, `asci.firin.2`, `hanci.konaklama.2`, `tuccar.pazar.2` → toplu |
| `meslekler.ts` `ister` | Elle yazılmış, uygulanmıyor | Tarif girdilerinden türetilir (yalnız başka mesleğin malları); düğüm kartında gösterilir |
| `meslekler.ts` `musteri/tedarik` | Kısmi (ör. çiftçinin tedarikçisi yalnız demirci) | §4'teki grafik |
| `meslekler.ts:192` | 10 NPC mesleği eşleniyor | + `KURUM_NPC`: oduncu, marangoz, dokumacı, hancı, kâtip, arabulucu, divan için sanal kalfa |
| `meslek.ts:36,44-47,60-72` | Tecrübe tavansız, sabit bar | `PUAN_ARTIS=4`, `PUAN_TAVAN=16`, `PIR_ICAZET=3`, `KADEME_HIZMET=[0,70,240,240]`, `KADEME_ASGARI_AY=[0,10,24,12]` |
| `meslek.ts:98,188` | Sınırsız meslek değişimi; düğüm her yerde etkin | `MESLEK_DEGISIM_ARALIK=12`; düğüm yalnız ana ve yan meslekte etkin |
| `meslek.ts:131` `kademeAtla` | Sınav yok | Peştamal (3 teslim) ve ustalık eseri şartı |
| `lonca.ts` | Kademesiz doluluk | Kademe sayımı, dolu = ≥2 ve ≥1 usta, kasaba hâli bağı |
| `siparis.ts:51,58-71` | 3 mesleğin malı; dolu meslek sipariş almaz | Her mesleğin `kd ≤ 1` mallarından sipariş. Ağırlık {boş 3, az 2, dolu 1} (denge). Yalnız ana/yan meslekte teslim. Hizmet talebi aynı modelle (§7) |
| İstemci `online3.ts` `onl.mes.*` | 168 ad | 14 ad değişir: `ciftci.suru.1`, `oduncu.orman.2`, `demirci.alet.1`, `demirci.zirh.3`, `marangoz.yapi.2`, `marangoz.arac.2`, `marangoz.tezyin.0`, `dokumaci.deri.3`, `dokumaci.cadir.3`, `asci.firin.2`, `asci.saklama.1`, `hanci.etkinlik.0`, `sifaci.ebelik.2`, `tuccar.pazar.3`. Ayrıca 168 etki satırı (`onl.mes.<id>.e`) |
