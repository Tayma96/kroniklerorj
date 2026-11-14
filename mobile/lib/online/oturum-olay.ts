// HTTP katmanından (istemci.ts, ek-istemci.ts) durum sağlayıcısına iki olay. Tek mekanizma: bütün yetkili uçlar buradan geçer.
// - oturum: sunucu gönderilen belirteci reddetti (oturum_gecersiz / oturum_suresi_doldu, HTTP 401). Sağlayıcı yerel oturumu
//   siler ve girişe döner.
// - tekrar: istekNo 24 saatlik pencerede zaten işlenmiş, yanıtı saklı değil (istek_tekrar, HTTP 409). İşlem yapılmış
//   sayılır; sağlayıcı ilgili veriyi sunucudan yeniden yükler (yerel durum tahminle değişmez).
import type { OnlineHata } from "./protokol";

type Dinleyici = () => void;
const oturumDinleyicileri = new Set<Dinleyici>();
const tekrarDinleyicileri = new Set<Dinleyici>();

const dinle = (k: Set<Dinleyici>, d: Dinleyici) => { k.add(d); return () => { k.delete(d); }; };
export const oturumDustuDinle = (d: Dinleyici) => dinle(oturumDinleyicileri, d);
export const istekTekrarDinle = (d: Dinleyici) => dinle(tekrarDinleyicileri, d);

/** Bir yanıt hatasını olaya çevirir. `belirtecGitti`: istekte Bearer belirteci vardı. */
export function yanitOlayi(kod: OnlineHata | string, durum: number, belirtecGitti: boolean): void {
  if (belirtecGitti && durum === 401 && (kod === "oturum_gecersiz" || kod === "oturum_suresi_doldu")) {
    for (const d of [...oturumDinleyicileri]) d();
  } else if (durum === 409 && kod === "istek_tekrar") {
    for (const d of [...tekrarDinleyicileri]) d();
  }
}
