// Kronikler Online HTTP uçları (yalnız uygulama içindir; CORS başlığı verilmez).
//   POST /v1/giris {idToken}             → {oturum, profilVar, adOnerisi?}
//   GET  /v1/dunya                       → saat + beylikler/yerleşimler (doluluk)
//   GET  /v1/profil                      → profil                     (oturum gerekir)
//   POST /v1/profil {ad, cinsiyet, yerlesim, davet?, istekNo} → profil (oturum gerekir)
//   POST /v1/davet                       → {kod}                      (oturum gerekir)
//   GET  /v1/davet/:kod                  → {kod, yerlesim, beylik, davetEden} (oturum gerekir)
//   GET  /v1/yerlesim?dil=               → saat, yerleşim, karakterim, harita, Dönüş Kartı, imleç (Faz 2)
//   GET  /v1/olaylar?imlec=&dil=         → imleçten sonraki görünür olaylar (sayfalı)
//   GET  /v1/kisi/:id?dil=               → profil + bana bakışın dökümü + eylemler (§13.9 görünürlük)
//   POST /v1/eylem {tur, hedef?, secim?, ozellik?, istekNo, dil?} → şans, zar, sonuç, olay, takat
//   POST /v1/tanidik {hedef, isaret, dil?}  → tanıdıklar
//   POST /v1/meslek {islem: sec|yan|kademe, meslek, istekNo} → meslek kaydı, beceri puanı, tarifler (ana tasarım §5)
//   GET  /v1/beceri?meslek=              → beceri ağacı v2: düğümler, seviyeler, puan, öğrenme, kilit nedenleri
//   POST /v1/beceri/ogren {meslek, dugum, istekNo} → öğrenme başlar (tek sıra; süre bitince tembel açılır)
//   POST /v1/beceri/iptal {istekNo}      → puan iadesi
//   POST /v1/beceri/hizlandir {kaynak: egitim|debdebe, istekNo} → süre kısaltma (debdebe: hizlandirma_kapali)
//   POST /v1/beceri/yeniden {meslek, istekNo} → kalfa+ sıfırlanır, puan iade, akçe + bekleme
//   POST /v1/temel-is {is, istekNo}      → çıktı, fırsat dökümü, envanter, takat
//   POST /v1/taban-al {mal, adet, istekNo} → NPC taban alımı, envanter, para
//   GET  /v1/lonca                       → yerleşimin lonca tablosu
//   POST /v1/tarif {tarif, istekNo}      → çıktı, girdi, araç aşınması, hizmet, Hal, tarifler, envanter
//   POST /v1/sat {mal, adet, istekNo}    → NPC'ye satış: birim dökümü, tutar, aylık kota, para
//   POST /v1/siparis/teslim {siparis, istekNo, dil?} → ödül, hizmet, görüş, teşekkür izi olayı
//   GET  /v1/siparisler?dil=             → açık ve son kapanan lonca siparişleri
//   GET  /v1/oyuncu/:id?dil=             → oyuncu profili (yalnız görünür alanlar; Faz 3a)
//   POST /v1/dostluk {hedef, islem: iste|kabul|ret|bitir, istekNo} → {hedef, bag}
//   POST /v1/teklif {tur, hedef, ...şartlar, istekNo} → {teklif}
//   POST /v1/teklif/:id/cevap {cevap: kabul|ret|geri|bitir|ode, tutar?, istekNo} → {teklif}
//   GET  /v1/gelen?dil=                  → gelen/giden/süren/kapanan teklifler, dostluk, husumet, söylenti, engel
//   POST /v1/husumet {hedef, islem: ilan|kaldir, istekNo} → {hedef, husumet}
//   POST /v1/engelle {hedef, islem: engelle|kaldir, istekNo} → {engellenenler}
//   GET|POST /v1/duzen {gelen?, borcCevap?, borcEnCok?, istekNo} → {duzen}
//   POST /v1/yalanla {soylenti, istekNo} → {soylentiler}
//   POST /v1/vitrin {goster: armaganId[], istekNo} → {vitrin}
//   GET  /v1/ucgen?npc=&hedef=&dil=      → sözlerim, arabuluculuk talepleri, casusum, barışlar, parametreler, önizleme (Faz 4)
//   POST /v1/ucgen {tur: kiskirt|katil|sozBoz|araciIste|araciKapat|arabulucu|sartOde|casus, ..., istekNo} → şans dökümü, zar, sonuç
//   GET  /v1/hanedan?dil=                → hanedan, eş, çocuklar, vâris adayları, vasiyet, yaşlılık (Faz 7)
//   POST /v1/vasiyet {vasiyet, istekNo}  → vasiyet (null siler)
//   GET  /v1/devir/onizle?varis=&dil=    → {plan, pk, varsayim}
//   POST /v1/devir {varis?, pk, istekNo} → vâris karakteri, plan (pk tutmazsa 409 devir_degisti)
//   POST /v1/evlilik {hedef, istekNo}    → NPC ile evlilik (görüş eşiği, düğün bedeli)
//   GET  /v1/kronik?imlec=&dil=          → yerleşim kroniği (sayfalı, budanmaz)
//   GET  /v1/pazar?mal=&dil=             → oyuncu pazarı: açık ilanlar (NPC taban karşılaştırmalı), benim ilanlarım (Faz 6)
//   POST /v1/pazar/ilan {tur: sat|al, mal, adet, fiyat, sure?, kalite?, istekNo} → {ilan} (emanet kilitlenir)
//   POST /v1/pazar/islem {ilan, adet, kalite?, istekNo} → {islem: tutar, bac, net, karsilastirma, pompa}
//   POST /v1/pazar/geri {ilan, istekNo}  → {ilan, iade}
//   GET  /v1/ismarlama?dil=              → gelen/giden ısmarlamalar, ustalık sicili
//   POST /v1/ismarlama {hedef, mal, adet, kalite?, sure, ucret, istekNo} → {ismarlama} (ücret emanete)
//   POST /v1/ismarlama/cevap {ismarlama, cevap: kabul|ret|geri|teslim, kalite?, istekNo} → {ismarlama, teslim?}
//   GET  /v1/levha?mal=                  → Ustalar Levhası (üstün/şaheser ürünler: kim, ne, ay)
//   GET  /v1/defter?ay=                  → gelir-gider dökümü (son N ay), emanetteki akçe
//   POST /v1/sikayet {hedef, neden, aciklama?, istekNo} → {id, durum, kalan}
//   GET  /v1/duyurular                   → son 5 duyuru
//   GET  /v1/han?dil=                    → yerleşimin hanı ve masaları (doluluk)          (Faz 10, src/han/)
//   GET  /v1/han/masa/:no/baglan         → WebSocket yükseltmesi (Upgrade: websocket + oturum); iletiler src/han/tipler.ts
//   POST /v1/han/eylem {masa, tur, hedef?, olay?, sart?, istekNo} → {olay} (katılım listesiyle)
//   POST /v1/han/masa/:no/ses/oturum {}            → {ice}  (Faz 16 ses; Realtime yoksa 503 ses_kapali)
//   POST /v1/han/masa/:no/ses/yayin {sdp, mid}     → {sdp, yeniden, iz}  (yalnız oturan, susturulmamış, sesi kesilmemiş)
//   POST /v1/han/masa/:no/ses/dinle {izler}        → {sdp, yeniden, izler:[{mid, iz, hesap}]}  (ayaktakiler de dinler)
//   POST /v1/han/masa/:no/ses/anlas {sdp}          → {}  (çekilen izler için istemci answer'ı)
//   POST /v1/han/masa/:no/ses/kapat {mids?, sdp?, tum?} → {sdp}  (ses kaydedilmez; uygulama anahtarı istemciye gitmez)
//   POST /v1/han/ikram {masa, hedef, ikram, istekNo} → {ikram, fiyat, para, anons}  (ödeme YerlesimDO'da, teveccüh yazılır)
//   GET  /v1/barinma?dil=                → barınma: durum, konaklama, zincir (eşik/etki), misafirhane, odalar, tesis (Faz 14)
//   POST /v1/barinma/kira {oda, sure: 1|3|12, istekNo} → {kira, barinma, para}  (NPC hancı: akçe dünyadan çıkar)
//   POST /v1/barinma/tesis {istekNo}     → {tesis, barinma}  (imaret/zaviye, D-23 önerisi)
//   POST /v1/barinma/otomatik {mod: kapali|oda|tesis|uyar, istekNo} → {otomatik, barinma}
//   GET  /v1/donus?dil=                  → dönüş ekranı (yokluk, barınma, Hal, olanlar, tek dokunuş seçenekleri)
//   GET  /v1/debdebe                     → {acik, katalog, fiyatKademeleri, seviyeler, ben, sezon, armagan, paraliKutu:false} (Faz 11/15)
//   GET  /v1/debdebe/dene?urun=&dil=     → {urun, tur, gercekOyuncuYok, sahneler: [hanMasasi|sehirKapisi|profilKarti]}
//   POST /v1/debdebe/satin-al {urun, magaza: google|apple, makbuz, istekNo} → {urun, islem, verilen, tekrar, ben}
//   POST /v1/debdebe/kusan {yuva, urun|null, sira?, istekNo} → {kusanilan}
//   POST /v1/debdebe/armagan {urun, hedef, masa?, istekNo} → {urun, hedef, teveccuh, stok, gunluk, anons?}
//   POST /v1/debdebe/levha-gorunur {gorunur, istekNo} → {levhaGorunur}
//   GET  /v1/debdebe/levha               → Cömertler Levhası (yalnız adlar, alfabetik; tutar/sıra yok)
//   GET  /v1/debdebe/sezon               → Sezon Defteri (bedava + ücretli iz)
//   GET  /v1/debdebe/kisi/:id            → başkasının Debdebe görünüşü (kuşanılan, seviye etiketi, rozetler)
//   GET  /v1/topluluk?dil=               → meşrep, hami, ortak dertler (defter), şenlik (Cömertler Levhası), müdavim, zaviye, göstergeler (E5–E7)
//   POST /v1/mesrep {el, cesaret, gurur, istekNo} → {mesrep}  (her eksen bir uç ya da "orta"; etkiler yazılı)
//   POST /v1/hami {islem: teklif|iste|kabul|ret|birak, hedef, istekNo} → {bag, hami}  (hami akçe almaz, aşamada nam)
//   POST /v1/ortak-dert {dert, katki, mal?, adet?, istekNo} → {dert, katki (döküm), odul, basardi}
//   POST /v1/senlik {katki: yemek|sus|hayir, mal?, adet?, tutar?, istekNo} → {senlik, katki, odul}
//   POST /v1/zaviye {islem: kur|davet|katil|reddet|ayril|cikar|yatir|ver|arma|oy, ..., istekNo} → {zaviye, zaviyeler}
//   GET  /v1/siyaset?bolge=&kayit=       → bölge, makamlar, seçimler, kasa/defter, meşruiyet, Sultanlık, Moğol, kayıt (Faz 7, src/siyaset/)
//   POST /v1/siyaset {islem: aday|adayCekil|oy|onay|yetki|itiraz|ozerklikCevap|ozerklikBirak, makam?, ..., istekNo} → {sonuc, gorunum}
// Uzaklaştırılmış hesapta giriş dışındaki /v1/* uçları 403 {hata: "uzaklastirildi", bitis} döner.
//
// Yönetim (ana tasarım §7; oyuncu oturumundan ayrı yönetici belirteci, src/yonetim/kimlik.ts):
//   GET  /yonetim                        → tek sayfalık panel (HTML, sıkı CSP)
//   POST /yonetim/giris {idToken}        → {oturum, rol}
//   GET  /v1/mulk                        → yuvalar (boş/sahipli, bedel), benim, çalıştığım, teklifler, edinim şartı, bekleyen transferler (Faz 12)
//   POST /v1/mulk/edin {tur: han|dukkan|atolye, istekNo} → {edinim, transferDurumu, para}  (akçe + nam ya da lonca; D-17)
//   GET  /v1/isletme/:id                 → panel (konuma ve yetkiye göre; dışarıdan vitrin)
//   GET  /v1/isletme/:id/devir           → devir önizlemesi: kasa, emanet, borç, sözleşmeler, sicil, sürüm
//   POST /v1/isletme/:id/<islem> {..., istekNo}: yatir {tutar} | cek {tutar} | emanet {yon, tutar} | ad {ad} |
//        tezyin {grup, secim} | fiyat {carpan} | kapi {acik} | personel {islem, ...} | devir {islem: teklif|geri|kabul}
//   GET|POST /yonetim/<uc>               → YONETIM_UCLARI (src/tipler.ts); kurallar src/yonetim/islem.ts
// Hata gövdesi {hata: kod}; metin istemcide çevrilir. Hız sınırı hesap başına HesapDO'da.

import { GoogleDogrulayici, GoogleHatasi, istemciKimlikleri } from "./google.ts";
import { dunyaCagir, hesapCagir, hesapKimligi, jsonYanit, yonetimCagir } from "./ic.ts";
import { oturumDogrula, oturumOlustur } from "./oturum.ts";
import {
  basarili,
  hata,
  HATA_DURUMU,
  YONETIM_UCLARI,
  type Basarisiz,
  type Env,
  type GovdeliIslem,
  type BarinmaIslem,
  type HanedanIslem,
  type EkonomiIslem,
  type ToplulukIslem,
  type HataKodu,
  type HesapIleti,
  type DebdebeIslem,
  type Sonuc,
  type YoneticiKimligi,
  type YonetimUcu,
} from "./tipler.ts";
import { yoneticiOturumuDogrula, yoneticiOturumuOlustur } from "./yonetim/kimlik.ts";
import { panelYaniti } from "./yonetim/panel.ts";
import { masayaYukselt } from "./han/ic.ts";
import type { MasaBileti, SesAlt } from "./han/tipler.ts";
import { realtimeAyari } from "./han/realtime.ts";

export { DunyaDO } from "./dunya-do.ts";
export { IsletmeDO } from "./isletme-do.ts";
export { HesapDO } from "./hesap-do.ts";
export { MasaDO } from "./masa-do.ts";
export { BolgeDO } from "./bolge-do.ts";
export { SultanlikDO } from "./sultanlik-do.ts";
export { YerlesimDO } from "./yerlesim-do.ts";
export { YonetimDO } from "./yonetim-do.ts";

const AZAMI_GOVDE = 16 * 1024;
const OTURUM_ANAHTARI_EN_KISA = 32;
const DAVET_YOLU = /^\/v1\/davet\/([^/]+)$/;
const KISI_YOLU = /^\/v1\/kisi\/([^/]+)$/;
const OYUNCU_YOLU = /^\/v1\/oyuncu\/([^/]+)$/;
const TEKLIF_CEVAP_YOLU = /^\/v1\/teklif\/([^/]+)\/cevap$/;
const MASA_YOLU = /^\/v1\/han\/masa\/([^/]+)\/baglan$/;
const SES_YOLU = /^\/v1\/han\/masa\/([^/]{1,8})\/ses\/(oturum|yayin|dinle|anlas|kapat)$/;
const DEBDEBE_KISI_YOLU = /^\/v1\/debdebe\/kisi\/([^/]+)$/;
const DEBDEBE_YAZMA: Readonly<Record<string, DebdebeIslem>> = {
  "/v1/debdebe/satin-al": "debdebeSatinAl",
  "/v1/debdebe/kusan": "debdebeKusan",
  "/v1/debdebe/armagan": "debdebeArmagan",
  "/v1/debdebe/levha-gorunur": "debdebeLevhaGorunur",
};
const ISLETME_YOLU = /^\/v1\/isletme\/([^/]{1,64})(?:\/([a-z]{1,16}))?$/;
const ISLETME_POST = new Set(["yatir", "cek", "emanet", "ad", "tezyin", "fiyat", "kapi", "personel", "devir"]);

/** Örnek yaşadıkça JWKS önbelleğini tutar. `fetch` çağrı anında çözülür (testte değiştirilebilir). */
const google = new GoogleDogrulayici({ fetch: (url) => fetch(url) });

function hataYaniti(kod: HataKodu): Response {
  return jsonYanit({ hata: kod }, Object.hasOwn(HATA_DURUMU, kod) ? HATA_DURUMU[kod] : 500);
}

function basarisizYanit(s: Basarisiz): Response {
  const durum = Object.hasOwn(HATA_DURUMU, s.hata) ? HATA_DURUMU[s.hata] : 500;
  return jsonYanit(s.bitis !== undefined ? { hata: s.hata, bitis: s.bitis } : { hata: s.hata }, durum);
}

function sonucYaniti<T>(sonuc: Sonuc<T>): Response {
  return sonuc.ok ? jsonYanit(sonuc.deger) : basarisizYanit(sonuc);
}

function oturumAnahtari(env: Env): string | undefined {
  const a = env.OTURUM_ANAHTARI;
  return a && a.length >= OTURUM_ANAHTARI_EN_KISA ? a : undefined;
}

async function govdeOku(istek: Request): Promise<Sonuc<Record<string, unknown>>> {
  if (Number(istek.headers.get("content-length") ?? 0) > AZAMI_GOVDE) return hata("govde_buyuk");
  const metin = await istek.text();
  if (metin.length > AZAMI_GOVDE) return hata("govde_buyuk");
  try {
    const v: unknown = JSON.parse(metin);
    if (typeof v === "object" && v !== null && !Array.isArray(v)) return basarili(v as Record<string, unknown>);
  } catch {
    // aşağıda
  }
  return hata("gecersiz_istek");
}

/** Bearer oturumunu doğrular; hesap kimliğini döndürür. */
async function yetkilendir(istek: Request, env: Env): Promise<Sonuc<string>> {
  const anahtar = oturumAnahtari(env);
  if (!anahtar) return hata("yapilandirma_eksik");
  const m = /^Bearer\s+(\S+)$/i.exec(istek.headers.get("authorization") ?? "");
  if (!m?.[1]) return hata("oturum_yok");
  const sonuc = await oturumDogrula(m[1], anahtar, Date.now());
  return sonuc.ok ? basarili(sonuc.hesapId) : hata(sonuc.hata);
}

/** Oturumu doğrular, iletiyi oyuncunun HesapDO'suna iletir. */
async function hesaba(
  istek: Request,
  env: Env,
  ileti: (hesapId: string) => Promise<Sonuc<HesapIleti>> | Sonuc<HesapIleti>,
): Promise<Response> {
  const yetki = await yetkilendir(istek, env);
  if (!yetki.ok) return hataYaniti(yetki.hata);
  const hazir = await ileti(yetki.deger);
  if (!hazir.ok) return basarisizYanit(hazir);
  return sonucYaniti(await hesapCagir(env, yetki.deger, hazir.deger));
}

async function giris(istek: Request, env: Env): Promise<Response> {
  const govde = await govdeOku(istek);
  if (!govde.ok) return hataYaniti(govde.hata);
  const idToken = govde.deger.idToken;
  if (typeof idToken !== "string" || idToken.length === 0 || idToken.length > 8192) {
    return hataYaniti("gecersiz_istek");
  }
  const kimlikler = istemciKimlikleri(env.GOOGLE_CLIENT_ID);
  const anahtar = oturumAnahtari(env);
  if (kimlikler.length === 0 || !anahtar) return hataYaniti("yapilandirma_eksik");

  let kimlik;
  try {
    kimlik = await google.dogrula(idToken, kimlikler);
  } catch (e) {
    if (e instanceof GoogleHatasi) {
      return hataYaniti(e.kod === "jwks" ? "google_erisilemiyor" : "google_gecersiz");
    }
    throw e;
  }

  const hesapId = hesapKimligi(env, kimlik.sub);
  const kayit = await hesapCagir<{ profilVar: boolean; uzaklastirma?: { bitis: number | null } }>(env, hesapId, {
    islem: "giris",
    hesapId,
    sub: kimlik.sub,
  });
  if (!kayit.ok) return basarisizYanit(kayit);
  const oturum = await oturumOlustur(hesapId, anahtar, Date.now());
  const { profilVar, uzaklastirma } = kayit.deger;
  return jsonYanit({
    oturum,
    profilVar,
    ...(!profilVar && kimlik.ad ? { adOnerisi: kimlik.ad } : {}),
    ...(uzaklastirma ? { uzaklastirma } : {}),
  });
}

// ---------------------------------------------------------------- yönetim

/** Yönetici belirtecini doğrular (oyuncu belirteci burada geçmez). Rol burada değil, YonetimDO'da çözülür. */
async function yoneticiYetkilendir(istek: Request, env: Env): Promise<Sonuc<YoneticiKimligi>> {
  const anahtar = oturumAnahtari(env);
  if (!anahtar) return hata("yapilandirma_eksik");
  const m = /^Bearer\s+(\S+)$/i.exec(istek.headers.get("authorization") ?? "");
  if (!m?.[1]) return hata("oturum_yok");
  const s = await yoneticiOturumuDogrula(m[1], anahtar, Date.now());
  if (!s.ok) return hata(s.hata);
  return basarili({ eposta: s.eposta, sub: s.sub, hesap: hesapKimligi(env, s.sub) });
}

async function yonetimGiris(istek: Request, env: Env): Promise<Response> {
  const govde = await govdeOku(istek);
  if (!govde.ok) return hataYaniti(govde.hata);
  const idToken = govde.deger.idToken;
  if (typeof idToken !== "string" || idToken.length === 0 || idToken.length > 8192) return hataYaniti("gecersiz_istek");
  const kimlikler = istemciKimlikleri(env.YONETIM_GOOGLE_CLIENT_ID);
  const anahtar = oturumAnahtari(env);
  if (kimlikler.length === 0 || !anahtar) return hataYaniti("yapilandirma_eksik");
  let kimlik;
  try {
    kimlik = await google.dogrula(idToken, kimlikler);
  } catch (e) {
    if (e instanceof GoogleHatasi) return hataYaniti(e.kod === "jwks" ? "google_erisilemiyor" : "google_gecersiz");
    throw e;
  }
  if (!kimlik.eposta) return hataYaniti("eposta_dogrulanmamis");
  const yonetici: YoneticiKimligi = { eposta: kimlik.eposta, sub: kimlik.sub, hesap: hesapKimligi(env, kimlik.sub) };
  const sonuc = await yonetimCagir<{ rol: string }>(env, { islem: "giris", yonetici });
  if (!sonuc.ok) return basarisizYanit(sonuc);
  const oturum = await yoneticiOturumuOlustur({ sub: kimlik.sub, eposta: kimlik.eposta }, anahtar, Date.now());
  return jsonYanit({ oturum, rol: sonuc.deger.rol });
}

async function yonetimUcu(istek: Request, env: Env, uc: YonetimUcu, url: URL): Promise<Response> {
  if (istek.method !== YONETIM_UCLARI[uc]) return hataYaniti("yontem_yok");
  const yetki = await yoneticiYetkilendir(istek, env);
  if (!yetki.ok) return hataYaniti(yetki.hata);
  let govde: unknown;
  if (istek.method === "POST") {
    const g = await govdeOku(istek);
    if (!g.ok) return hataYaniti(g.hata);
    govde = g.deger;
  }
  const sorgu: Record<string, string | null> = {};
  for (const ad of ["ad", "hesap", "durum", "imlec"]) {
    const d = url.searchParams.get(ad);
    if (d !== null) sorgu[ad] = d.slice(0, 128);
  }
  return sonucYaniti(await yonetimCagir(env, { islem: "yonet", yonetici: yetki.deger, uc, govde, sorgu }));
}

/** Han masasına WebSocket: oturum + HesapDO bileti (yaptırım, plaka), sonra MasaDO yükseltmesi. */
async function masaBaglan(istek: Request, env: Env, no: string): Promise<Response> {
  if ((istek.headers.get("upgrade") ?? "").toLowerCase() !== "websocket") return hataYaniti("yukseltme_gerekli");
  const yetki = await yetkilendir(istek, env);
  if (!yetki.ok) return hataYaniti(yetki.hata);
  const bilet = await hesapCagir<MasaBileti>(env, yetki.deger, { islem: "masaBilet", hesapId: yetki.deger, masa: no.slice(0, 8) });
  if (!bilet.ok) return basarisizYanit(bilet);
  return masayaYukselt(env, bilet.deger);
}

/** Gövdeli han POST iletisi. */
function hanGovdeli(istek: Request, env: Env, islem: "hanEylem" | "hanIkram"): Promise<Response> {
  return hesaba(istek, env, async (hesapId) => {
    const govde = await govdeOku(istek);
    return govde.ok ? basarili({ islem, hesapId, govde: govde.deger }) : govde;
  });
}

/** Gövdeli POST iletisi. */
function govdeli(istek: Request, env: Env, islem: GovdeliIslem | HanedanIslem | BarinmaIslem): Promise<Response> {
  return hesaba(istek, env, async (hesapId) => {
    const govde = await govdeOku(istek);
    return govde.ok ? basarili({ islem, hesapId, govde: govde.deger } as HesapIleti) : govde;
  });
}

/** Gövdeli topluluk POST iletisi (E5–E7). */
function toplulukGovdeli(istek: Request, env: Env, islem: ToplulukIslem): Promise<Response> {
  return hesaba(istek, env, async (hesapId) => {
    const govde = await govdeOku(istek);
    return govde.ok ? basarili({ islem, hesapId, govde: govde.deger }) : govde;
  });
}

/** Gövdeli ekonomi POST iletisi (Faz 6). */
function ekonomiGovdeli(istek: Request, env: Env, islem: EkonomiIslem): Promise<Response> {
  return hesaba(istek, env, async (hesapId) => {
    const govde = await govdeOku(istek);
    return govde.ok ? basarili({ islem, hesapId, govde: govde.deger }) : govde;
  });
}

async function yonlendir(istek: Request, env: Env): Promise<Response> {
  const url = new URL(istek.url);
  const yol = url.pathname;
  const yontem = istek.method;
  const dil = url.searchParams.get("dil");
  switch (yol) {
    case "/v1/giris":
      return yontem === "POST" ? giris(istek, env) : hataYaniti("yontem_yok");
    case "/v1/dunya":
      return yontem === "GET" ? sonucYaniti(await dunyaCagir(env, { islem: "ozet" })) : hataYaniti("yontem_yok");
    case "/v1/profil":
      if (yontem === "GET") return hesaba(istek, env, (hesapId) => basarili({ islem: "profil", hesapId }));
      if (yontem === "POST") {
        return hesaba(istek, env, async (hesapId) => {
          const govde = await govdeOku(istek);
          return govde.ok ? basarili({ islem: "profilOlustur", hesapId, govde: govde.deger }) : govde;
        });
      }
      return hataYaniti("yontem_yok");
    case "/v1/davet":
      return yontem === "POST"
        ? hesaba(istek, env, (hesapId) => basarili({ islem: "davetOlustur", hesapId }))
        : hataYaniti("yontem_yok");
    case "/v1/yerlesim":
      return yontem === "GET" ? hesaba(istek, env, (hesapId) => basarili({ islem: "yerlesim", hesapId, dil })) : hataYaniti("yontem_yok");
    case "/v1/olaylar":
      return yontem === "GET"
        ? hesaba(istek, env, (hesapId) => basarili({ islem: "olaylar", hesapId, imlec: url.searchParams.get("imlec"), dil }))
        : hataYaniti("yontem_yok");
    case "/v1/eylem":
      return yontem === "POST" ? govdeli(istek, env, "eylem") : hataYaniti("yontem_yok");
    case "/v1/tanidik":
      return yontem === "POST" ? govdeli(istek, env, "tanidik") : hataYaniti("yontem_yok");
    case "/v1/meslek":
      return yontem === "POST" ? govdeli(istek, env, "meslek") : hataYaniti("yontem_yok");
    case "/v1/temel-is":
      return yontem === "POST" ? govdeli(istek, env, "temelIs") : hataYaniti("yontem_yok");
    case "/v1/taban-al":
      return yontem === "POST" ? govdeli(istek, env, "tabanAl") : hataYaniti("yontem_yok");
    case "/v1/tarif":
      return yontem === "POST" ? govdeli(istek, env, "tarif") : hataYaniti("yontem_yok");
    case "/v1/beceri":
      return yontem === "GET"
        ? hesaba(istek, env, (hesapId) => basarili({ islem: "beceri", hesapId, meslek: url.searchParams.get("meslek")?.slice(0, 32) ?? null }))
        : hataYaniti("yontem_yok");
    case "/v1/beceri/ogren":
      return yontem === "POST" ? govdeli(istek, env, "beceriOgren") : hataYaniti("yontem_yok");
    case "/v1/beceri/iptal":
      return yontem === "POST" ? govdeli(istek, env, "beceriIptal") : hataYaniti("yontem_yok");
    case "/v1/beceri/hizlandir":
      return yontem === "POST" ? govdeli(istek, env, "beceriHizlandir") : hataYaniti("yontem_yok");
    case "/v1/beceri/yeniden":
      return yontem === "POST" ? govdeli(istek, env, "beceriYeniden") : hataYaniti("yontem_yok");
    case "/v1/sat":
      return yontem === "POST" ? govdeli(istek, env, "sat") : hataYaniti("yontem_yok");
    case "/v1/siparis/teslim":
      return yontem === "POST" ? govdeli(istek, env, "siparisTeslim") : hataYaniti("yontem_yok");
    case "/v1/siparisler":
      return yontem === "GET" ? hesaba(istek, env, (hesapId) => basarili({ islem: "siparisler", hesapId, dil })) : hataYaniti("yontem_yok");
    case "/v1/lonca":
      return yontem === "GET" ? hesaba(istek, env, (hesapId) => basarili({ islem: "lonca", hesapId, dil })) : hataYaniti("yontem_yok");
    case "/v1/hanedan":
      return yontem === "GET" ? hesaba(istek, env, (hesapId) => basarili({ islem: "hanedan", hesapId, dil })) : hataYaniti("yontem_yok");
    case "/v1/vasiyet":
      return yontem === "POST" ? govdeli(istek, env, "vasiyet") : hataYaniti("yontem_yok");
    case "/v1/devir/onizle":
      return yontem === "GET"
        ? hesaba(istek, env, (hesapId) => basarili({ islem: "devirOnizle", hesapId, varis: url.searchParams.get("varis"), dil }))
        : hataYaniti("yontem_yok");
    case "/v1/devir":
      return yontem === "POST" ? govdeli(istek, env, "devir") : hataYaniti("yontem_yok");
    case "/v1/evlilik":
      return yontem === "POST" ? govdeli(istek, env, "evlilik") : hataYaniti("yontem_yok");
    case "/v1/kronik":
      return yontem === "GET"
        ? hesaba(istek, env, (hesapId) => basarili({ islem: "kronik", hesapId, imlec: url.searchParams.get("imlec"), dil }))
        : hataYaniti("yontem_yok");
    // Topluluk (E5–E7): src/yerlesim/topluluk-uclar.ts
    case "/v1/topluluk":
      return yontem === "GET" ? hesaba(istek, env, (hesapId) => basarili({ islem: "topluluk", hesapId, dil })) : hataYaniti("yontem_yok");
    case "/v1/mesrep":
      return yontem === "POST" ? toplulukGovdeli(istek, env, "mesrep") : hataYaniti("yontem_yok");
    case "/v1/hami":
      return yontem === "POST" ? toplulukGovdeli(istek, env, "hami") : hataYaniti("yontem_yok");
    case "/v1/ortak-dert":
      return yontem === "POST" ? toplulukGovdeli(istek, env, "ortakDert") : hataYaniti("yontem_yok");
    case "/v1/senlik":
      return yontem === "POST" ? toplulukGovdeli(istek, env, "senlik") : hataYaniti("yontem_yok");
    case "/v1/zaviye":
      return yontem === "POST" ? toplulukGovdeli(istek, env, "zaviye") : hataYaniti("yontem_yok");
    // Ekonomi (Faz 6) ve hizmet pazarı (E4.3): src/yerlesim/ekonomi-uclar.ts
    case "/v1/hizmet":
      return yontem === "GET" ? hesaba(istek, env, (hesapId) => basarili({ islem: "hizmet", hesapId, dil })) : hataYaniti("yontem_yok");
    case "/v1/hizmet/hazirla":
      return yontem === "POST" ? ekonomiGovdeli(istek, env, "hizmetHazirla") : hataYaniti("yontem_yok");
    case "/v1/hizmet/ilan":
      return yontem === "POST" ? ekonomiGovdeli(istek, env, "hizmetIlan") : hataYaniti("yontem_yok");
    case "/v1/hizmet/satin-al":
      return yontem === "POST" ? ekonomiGovdeli(istek, env, "hizmetIslem") : hataYaniti("yontem_yok");
    case "/v1/hizmet/geri":
      return yontem === "POST" ? ekonomiGovdeli(istek, env, "hizmetGeri") : hataYaniti("yontem_yok");
    case "/v1/pazar":
      return yontem === "GET"
        ? hesaba(istek, env, (hesapId) => basarili({ islem: "pazar", hesapId, mal: url.searchParams.get("mal"), dil }))
        : hataYaniti("yontem_yok");
    case "/v1/pazar/ilan":
      return yontem === "POST" ? ekonomiGovdeli(istek, env, "pazarIlan") : hataYaniti("yontem_yok");
    case "/v1/pazar/islem":
      return yontem === "POST" ? ekonomiGovdeli(istek, env, "pazarIslem") : hataYaniti("yontem_yok");
    case "/v1/pazar/geri":
      return yontem === "POST" ? ekonomiGovdeli(istek, env, "pazarGeri") : hataYaniti("yontem_yok");
    case "/v1/ismarlama":
      if (yontem === "GET") return hesaba(istek, env, (hesapId) => basarili({ islem: "ismarlamalar", hesapId, dil }));
      return yontem === "POST" ? ekonomiGovdeli(istek, env, "ismarla") : hataYaniti("yontem_yok");
    case "/v1/ismarlama/cevap":
      return yontem === "POST" ? ekonomiGovdeli(istek, env, "ismarlamaCevap") : hataYaniti("yontem_yok");
    case "/v1/levha":
      return yontem === "GET"
        ? hesaba(istek, env, (hesapId) => basarili({ islem: "levha", hesapId, mal: url.searchParams.get("mal") }))
        : hataYaniti("yontem_yok");
    case "/v1/defter":
      return yontem === "GET"
        ? hesaba(istek, env, (hesapId) => basarili({ islem: "defter", hesapId, ay: url.searchParams.get("ay") }))
        : hataYaniti("yontem_yok");
    case "/v1/barinma":
    case "/v1/donus": {
      const islem = yol === "/v1/barinma" ? "barinma" : "donus";
      return yontem === "GET" ? hesaba(istek, env, (hesapId) => basarili({ islem, hesapId, dil })) : hataYaniti("yontem_yok");
    }
    case "/v1/barinma/kira":
      return yontem === "POST" ? govdeli(istek, env, "barinmaKira") : hataYaniti("yontem_yok");
    case "/v1/barinma/tesis":
      return yontem === "POST" ? govdeli(istek, env, "barinmaTesis") : hataYaniti("yontem_yok");
    case "/v1/barinma/otomatik":
      return yontem === "POST" ? govdeli(istek, env, "barinmaOtomatik") : hataYaniti("yontem_yok");
    case "/v1/sikayet":
      if (yontem !== "POST") return hataYaniti("yontem_yok");
      return hesaba(istek, env, async (hesapId) => {
        const govde = await govdeOku(istek);
        return govde.ok ? basarili({ islem: "sikayet", hesapId, govde: govde.deger }) : govde;
      });
    case "/v1/dostluk":
      return yontem === "POST" ? govdeli(istek, env, "dostluk") : hataYaniti("yontem_yok");
    case "/v1/teklif":
      return yontem === "POST" ? govdeli(istek, env, "teklif") : hataYaniti("yontem_yok");
    case "/v1/husumet":
      return yontem === "POST" ? govdeli(istek, env, "husumet") : hataYaniti("yontem_yok");
    case "/v1/engelle":
      return yontem === "POST" ? govdeli(istek, env, "engelle") : hataYaniti("yontem_yok");
    case "/v1/yalanla":
      return yontem === "POST" ? govdeli(istek, env, "yalanla") : hataYaniti("yontem_yok");
    case "/v1/vitrin":
      return yontem === "POST" ? govdeli(istek, env, "vitrin") : hataYaniti("yontem_yok");
    case "/v1/ucgen":
      if (yontem === "GET") {
        const q = url.searchParams;
        return hesaba(istek, env, (hesapId) => basarili({ islem: "ucgenOku", hesapId, npc: q.get("npc"), hedef: q.get("hedef"), dil }));
      }
      return yontem === "POST" ? govdeli(istek, env, "ucgen") : hataYaniti("yontem_yok");
    case "/v1/gelen":
      return yontem === "GET" ? hesaba(istek, env, (hesapId) => basarili({ islem: "gelen", hesapId, dil })) : hataYaniti("yontem_yok");
    case "/v1/duzen":
      if (yontem === "GET") return hesaba(istek, env, (hesapId) => basarili({ islem: "duzenOku", hesapId }));
      return yontem === "POST" ? govdeli(istek, env, "duzen") : hataYaniti("yontem_yok");
    case "/v1/duyurular":
      return yontem === "GET" ? hesaba(istek, env, (hesapId) => basarili({ islem: "duyurular", hesapId })) : hataYaniti("yontem_yok");
    case "/v1/siyaset":
      if (yontem === "GET") {
        return hesaba(istek, env, (hesapId) => basarili({ islem: "siyaset", hesapId, bolge: url.searchParams.get("bolge"), kayitSayfa: url.searchParams.get("kayit") }));
      }
      if (yontem !== "POST") return hataYaniti("yontem_yok");
      return hesaba(istek, env, async (hesapId) => {
        const govde = await govdeOku(istek);
        return govde.ok ? basarili({ islem: "siyasetYaz", hesapId, govde: govde.deger }) : govde;
      });
    case "/v1/han":
      return yontem === "GET" ? hesaba(istek, env, (hesapId) => basarili({ islem: "han", hesapId, dil })) : hataYaniti("yontem_yok");
    case "/v1/han/eylem":
      return yontem === "POST" ? hanGovdeli(istek, env, "hanEylem") : hataYaniti("yontem_yok");
    case "/v1/han/ikram":
      return yontem === "POST" ? hanGovdeli(istek, env, "hanIkram") : hataYaniti("yontem_yok");
    case "/v1/debdebe":
    case "/v1/debdebe/levha":
    case "/v1/debdebe/sezon": {
      const islem = yol === "/v1/debdebe" ? "debdebe" : yol === "/v1/debdebe/levha" ? "debdebeLevha" : "debdebeSezon";
      return yontem === "GET" ? hesaba(istek, env, (hesapId) => basarili({ islem, hesapId })) : hataYaniti("yontem_yok");
    }
    case "/v1/debdebe/dene":
      return yontem === "GET"
        ? hesaba(istek, env, (hesapId) => basarili({ islem: "debdebeDene", hesapId, urun: url.searchParams.get("urun")?.slice(0, 40) ?? null, dil }))
        : hataYaniti("yontem_yok");
    case "/v1/mulk":
      return yontem === "GET" ? hesaba(istek, env, (hesapId) => basarili({ islem: "mulk", hesapId, alt: "liste", dil })) : hataYaniti("yontem_yok");
    case "/v1/mulk/edin":
      if (yontem !== "POST") return hataYaniti("yontem_yok");
      return hesaba(istek, env, async (hesapId) => {
        const govde = await govdeOku(istek);
        return govde.ok ? basarili({ islem: "mulk", hesapId, alt: "edin", govde: govde.deger }) : govde;
      });
    case "/yonetim":
    case "/yonetim/":
      return yontem === "GET" ? panelYaniti() : hataYaniti("yontem_yok");
    case "/yonetim/giris":
      return yontem === "POST" ? yonetimGiris(istek, env) : hataYaniti("yontem_yok");
  }
  if (Object.hasOwn(DEBDEBE_YAZMA, yol)) {
    if (yontem !== "POST") return hataYaniti("yontem_yok");
    const islem = DEBDEBE_YAZMA[yol]!;
    return hesaba(istek, env, async (hesapId) => {
      const govde = await govdeOku(istek);
      return govde.ok ? basarili({ islem, hesapId, govde: govde.deger }) : govde;
    });
  }
  const dk = DEBDEBE_KISI_YOLU.exec(yol);
  if (dk?.[1]) {
    if (yontem !== "GET") return hataYaniti("yontem_yok");
    const kisi = dk[1].slice(0, 16);
    return hesaba(istek, env, (hesapId) => basarili({ islem: "debdebeKisi", hesapId, kisi }));
  }
  if (yol.startsWith("/yonetim/")) {
    const uc = yol.slice("/yonetim/".length);
    return Object.hasOwn(YONETIM_UCLARI, uc) ? yonetimUcu(istek, env, uc as YonetimUcu, url) : hataYaniti("bulunamadi");
  }
  const isl = ISLETME_YOLU.exec(yol);
  if (isl?.[1]) {
    const isletme = isl[1];
    const alt = isl[2];
    if (alt === undefined || alt === "devir") {
      if (yontem === "GET") return hesaba(istek, env, (hesapId) => basarili({ islem: "mulk", hesapId, alt: alt ? "devirOnizle" : "panel", isletme, dil }));
      if (alt === undefined) return hataYaniti("yontem_yok");
    }
    if (!ISLETME_POST.has(alt!)) return hataYaniti("bulunamadi");
    if (yontem !== "POST") return hataYaniti("yontem_yok");
    return hesaba(istek, env, async (hesapId) => {
      const govde = await govdeOku(istek);
      return govde.ok ? basarili({ islem: "mulk", hesapId, alt: alt as "yatir", isletme, govde: govde.deger }) : govde;
    });
  }
  const masa = MASA_YOLU.exec(yol);
  if (masa?.[1]) return yontem === "GET" ? masaBaglan(istek, env, masa[1]) : hataYaniti("yontem_yok");
  const ses = SES_YOLU.exec(yol);
  if (ses?.[1] && ses[2]) {
    if (yontem !== "POST") return hataYaniti("yontem_yok");
    // Realtime yapılandırılmamışsa DO'lara hiç gitmeden kapalı döner.
    if (!realtimeAyari(env)) return hataYaniti("ses_kapali");
    const masaNo = ses[1];
    const alt = ses[2] as SesAlt;
    return hesaba(istek, env, async (hesapId) => {
      const govde = await govdeOku(istek);
      return govde.ok ? basarili({ islem: "hanSes", hesapId, masa: masaNo, alt, govde: govde.deger }) : govde;
    });
  }
  const kisi = KISI_YOLU.exec(yol);
  if (kisi?.[1]) {
    if (yontem !== "GET") return hataYaniti("yontem_yok");
    const ham = kisi[1];
    return hesaba(istek, env, (hesapId) => basarili({ islem: "kisi", hesapId, kisi: ham, dil }));
  }
  const oyuncu = OYUNCU_YOLU.exec(yol);
  if (oyuncu?.[1]) {
    if (yontem !== "GET") return hataYaniti("yontem_yok");
    const ham = oyuncu[1];
    return hesaba(istek, env, (hesapId) => basarili({ islem: "oyuncu", hesapId, oyuncu: ham, dil }));
  }
  const cevap = TEKLIF_CEVAP_YOLU.exec(yol);
  if (cevap?.[1]) {
    if (yontem !== "POST") return hataYaniti("yontem_yok");
    const teklif = cevap[1];
    return hesaba(istek, env, async (hesapId) => {
      const govde = await govdeOku(istek);
      return govde.ok ? basarili({ islem: "teklifCevap", hesapId, govde: { ...govde.deger, teklif } }) : govde;
    });
  }
  const davet = DAVET_YOLU.exec(yol);
  if (davet?.[1]) {
    if (yontem !== "GET") return hataYaniti("yontem_yok");
    const ham = davet[1];
    return hesaba(istek, env, (hesapId) => {
      try {
        return basarili({ islem: "davetCoz", hesapId, kod: decodeURIComponent(ham) });
      } catch {
        return hata("davet_gecersiz");
      }
    });
  }
  return hataYaniti("bulunamadi");
}

export default {
  async fetch(istek: Request, env: Env): Promise<Response> {
    try {
      return await yonlendir(istek, env);
    } catch (e) {
      console.error("istek hatası", e instanceof Error ? e.message : String(e));
      return hataYaniti("sunucu_hatasi");
    }
  },
};
