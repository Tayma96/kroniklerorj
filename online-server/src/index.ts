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
//   POST /v1/meslek {islem, meslek, dal?, dugum?, istekNo} → meslek ve ağaç (ana tasarım §5)
//   POST /v1/temel-is {is, istekNo}      → çıktı, fırsat dökümü, envanter, takat
//   POST /v1/taban-al {mal, adet, istekNo} → NPC taban alımı, envanter, para
//   GET  /v1/lonca                       → yerleşimin lonca tablosu
//   POST /v1/sikayet {hedef, neden, aciklama?, istekNo} → {id, durum, kalan}
//   GET  /v1/duyurular                   → son 5 duyuru
// Uzaklaştırılmış hesapta giriş dışındaki /v1/* uçları 403 {hata: "uzaklastirildi", bitis} döner.
//
// Yönetim (ana tasarım §7; oyuncu oturumundan ayrı yönetici belirteci, src/yonetim/kimlik.ts):
//   GET  /yonetim                        → tek sayfalık panel (HTML, sıkı CSP)
//   POST /yonetim/giris {idToken}        → {oturum, rol}
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
  type HataKodu,
  type HesapIleti,
  type Sonuc,
  type YoneticiKimligi,
  type YonetimUcu,
} from "./tipler.ts";
import { yoneticiOturumuDogrula, yoneticiOturumuOlustur } from "./yonetim/kimlik.ts";
import { panelYaniti } from "./yonetim/panel.ts";

export { DunyaDO } from "./dunya-do.ts";
export { HesapDO } from "./hesap-do.ts";
export { YerlesimDO } from "./yerlesim-do.ts";
export { YonetimDO } from "./yonetim-do.ts";

const AZAMI_GOVDE = 16 * 1024;
const OTURUM_ANAHTARI_EN_KISA = 32;
const DAVET_YOLU = /^\/v1\/davet\/([^/]+)$/;
const KISI_YOLU = /^\/v1\/kisi\/([^/]+)$/;

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
  const kimlikler = istemciKimlikleri(env.YONETIM_GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID);
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

/** Gövdeli POST iletisi. */
function govdeli(istek: Request, env: Env, islem: GovdeliIslem): Promise<Response> {
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
    case "/v1/lonca":
      return yontem === "GET" ? hesaba(istek, env, (hesapId) => basarili({ islem: "lonca", hesapId, dil })) : hataYaniti("yontem_yok");
    case "/v1/sikayet":
      if (yontem !== "POST") return hataYaniti("yontem_yok");
      return hesaba(istek, env, async (hesapId) => {
        const govde = await govdeOku(istek);
        return govde.ok ? basarili({ islem: "sikayet", hesapId, govde: govde.deger }) : govde;
      });
    case "/v1/duyurular":
      return yontem === "GET" ? hesaba(istek, env, (hesapId) => basarili({ islem: "duyurular", hesapId })) : hataYaniti("yontem_yok");
    case "/yonetim":
    case "/yonetim/":
      return yontem === "GET" ? panelYaniti() : hataYaniti("yontem_yok");
    case "/yonetim/giris":
      return yontem === "POST" ? yonetimGiris(istek, env) : hataYaniti("yontem_yok");
  }
  if (yol.startsWith("/yonetim/")) {
    const uc = yol.slice("/yonetim/".length);
    return Object.hasOwn(YONETIM_UCLARI, uc) ? yonetimUcu(istek, env, uc as YonetimUcu, url) : hataYaniti("bulunamadi");
  }
  const kisi = KISI_YOLU.exec(yol);
  if (kisi?.[1]) {
    if (yontem !== "GET") return hataYaniti("yontem_yok");
    const ham = kisi[1];
    return hesaba(istek, env, (hesapId) => basarili({ islem: "kisi", hesapId, kisi: ham, dil }));
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
