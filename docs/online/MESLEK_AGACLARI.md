# Kronikler Online — Meslek ağaçları (14 meslek · 42 dal · 168 düğüm)

**Tarih:** 9 Kasım 2026 · **Durum:** içerik tasarımı, uygulamaya hazır öneri · **Bağlı belge:** ana tasarım
`docs/superpowers/specs/2026-11-08-cevrimici-ana-tasarim-design.md` §5 (çelişkide o belge ve Berkay'ın yeni sözü geçerlidir).
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
| 5 | Meslek değiştirmek her an mümkün (`meslek.ts:98`); eski meslekte açılan düğümler sonsuza dek kullanılır (`meslek.ts:188`). Bir oyuncu zamanla birçok mesleğin ustası olur, birbirine muhtaçlık söner. | Ana meslek yılda bir değişir. Eski meslekte yalnız çırak düğümleri kullanılır; üstü uyur, dönünce aynen uyanır (§1.3). |

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
| Z10 | `meslek.ts:98-107,188-192` | Ana meslek değişimi sınırsız; eski meslek düğümleri hep kullanılıyor. | Yılda 1 değişim. Eski meslekte `kd≥1` düğümler uyur. `dugumAcikMi` = ana/yan meslek **ya da** `kd=0`. |
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

**Meslek değiştirme:** Ana meslek yılda bir değişir [PARAMETRE]. Eski meslek ilerlemesi silinmez. Eski meslekte yalnız çırak
(`kd=0`) düğümleri kullanılır ("el alışkanlığı"); üstü uyur ve meslek geri alınınca aynen uyanır. Yan meslek her zaman etkindir
ve yarı tecrübe alır (`YAN_CARPAN=0,5`). Lonca tablosunda yalnız ana meslek sayılır.

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
