// Kronikler Online HTTP uçları (yalnız uygulama içindir; CORS başlığı verilmez).
//   POST /v1/giris {idToken}             → {oturum, profilVar, adOnerisi?}
//   GET  /v1/dunya                       → saat + beylikler/yerleşimler (doluluk)
//   GET  /v1/profil                      → profil                     (oturum gerekir)
//   POST /v1/profil {ad, cinsiyet, yerlesim, davet?, istekNo} → profil (oturum gerekir)
//   POST /v1/davet                       → {kod}                      (oturum gerekir)
//   GET  /v1/davet/:kod                  → {kod, yerlesim, beylik, davetEden} (oturum gerekir)
// Hata gövdesi {hata: kod}; metin istemcide çevrilir. Hız sınırı hesap başına HesapDO'da.

import { GoogleDogrulayici, GoogleHatasi, istemciKimlikleri } from "./google.ts";
import { dunyaCagir, hesapCagir, hesapKimligi, jsonYanit } from "./ic.ts";
import { oturumDogrula, oturumOlustur } from "./oturum.ts";
import {
  basarili,
  hata,
  HATA_DURUMU,
  type Env,
  type HataKodu,
  type HesapIleti,
  type Sonuc,
} from "./tipler.ts";

export { DunyaDO } from "./dunya-do.ts";
export { HesapDO } from "./hesap-do.ts";

const AZAMI_GOVDE = 16 * 1024;
const OTURUM_ANAHTARI_EN_KISA = 32;
const DAVET_YOLU = /^\/v1\/davet\/([^/]+)$/;

/** Örnek yaşadıkça JWKS önbelleğini tutar. `fetch` çağrı anında çözülür (testte değiştirilebilir). */
const google = new GoogleDogrulayici({ fetch: (url) => fetch(url) });

function hataYaniti(kod: HataKodu): Response {
  return jsonYanit({ hata: kod }, Object.hasOwn(HATA_DURUMU, kod) ? HATA_DURUMU[kod] : 500);
}

function sonucYaniti<T>(sonuc: Sonuc<T>): Response {
  return sonuc.ok ? jsonYanit(sonuc.deger) : hataYaniti(sonuc.hata);
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
  if (!hazir.ok) return hataYaniti(hazir.hata);
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
  const kayit = await hesapCagir<{ profilVar: boolean }>(env, hesapId, { islem: "giris", hesapId, sub: kimlik.sub });
  if (!kayit.ok) return hataYaniti(kayit.hata);
  const oturum = await oturumOlustur(hesapId, anahtar, Date.now());
  const { profilVar } = kayit.deger;
  return jsonYanit({ oturum, profilVar, ...(!profilVar && kimlik.ad ? { adOnerisi: kimlik.ad } : {}) });
}

async function yonlendir(istek: Request, env: Env): Promise<Response> {
  const yol = new URL(istek.url).pathname;
  const yontem = istek.method;
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
