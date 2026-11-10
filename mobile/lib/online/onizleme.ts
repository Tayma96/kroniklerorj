// Tasarım önizlemesi tohumu (yalnız onizlemeMi() doğruyken kullanılır; uygulamada hiç çalışmaz).
// Rota başına başlangıç durumu: /online giriş ekranını oturumsuz, diğerlerini sahte geliştirici oturumuyla açar.
// Sorgu parametreleri: oad (ad), ocins (erkek|kadın), osec (yerleşim kimliği), odavet (davet kodu),
// okisi (kişi ekranı: "n12"/"o2" kimliği, "t0" tanıdık sırası, "h0" hane sırası; yoksa en yakın tanıdık).
// Faz 2 ekranları (yaşam, mahalle, kişi, tanıdıklar, karakter) varmış bir profille ve sahte yerleşimle açılır.
// Meslek ekranları: oyas (karakterin yaşı; meslek, işler ve lonca ekranlarında öntanımlı 14), omes (o meslekte kalfa
// olarak başlar; "yok" ya da boş = mesleksiz, meslek, işler ve siparişler ekranında öntanımlı demirci).
import { onizlemeMi } from "./kapi";
import { sahteDunya, sahteProfil, SAHTE_DAVET_KODU } from "./sahte";
import { MESLEK_IDLERI, kisiKimligiMi, yerlesimBul, type Cinsiyet, type DunyaOzeti, type MeslekId, type Profil, type YerlesimDurumu } from "./protokol";

export interface Tohum {
  gelistirici: boolean;
  dunya?: DunyaOzeti;
  profil?: Profil;
  taslak?: { ad: string; cinsiyet: Cinsiyet | null; istekNo: string; yerlesim?: string };
  davetKodu?: string;
  /** Sahte istemcinin yanıt gecikmesi (ms). */
  gecikme?: number;
  /** Sahte karakterin yaşı ve başladığı meslek (meslek ekranları). */
  yas?: number;
  meslek?: MeslekId;
}

const MESLEK_EKRANLARI = ["/online/meslek", "/online/isler", "/online/lonca", "/online/siparisler"];
/** Bu ekranlar öntanımlı demirci kalfasıyla açılır (ağaç, tarif, ambar ve teslim edilebilir sipariş görünsün). */
const DEMIRCI_EKRANLARI = ["/online/meslek", "/online/isler", "/online/siparisler"];
/** Han ve hanedan ekranları (Faz 10, Faz 7) varmış bir profille açılır. */
const HAN_HANEDAN = ["/online/han", "/online/han/[masa]", "/online/hanedan", "/online/kronik"];
const VARMIS = [...HAN_HANEDAN, "/online/varis", "/online/yasam", "/online/mahalle", "/online/kisi/[id]", "/online/tanidiklar", "/online/karakter", ...MESLEK_EKRANLARI, "/online/oyuncu/[id]", "/online/gelen", "/online/donus"];

function parametre(ad: string): string | null {
  const arama = (globalThis as { location?: { search?: string } }).location?.search ?? "";
  try { return new URLSearchParams(arama).get(ad); } catch { return null; }
}

export function onizlemeTohumu(): Tohum | null {
  if (!onizlemeMi()) return null;
  const yol = String((globalThis as { __PATH?: unknown }).__PATH ?? "");
  if (yol === "/online") return { gelistirici: false };
  const cinsiyet: Cinsiyet = parametre("ocins") === "erkek" ? "erkek" : "kadın";
  const ad = parametre("oad") ?? (cinsiyet === "erkek" ? "Yusuf Ali" : "Elif Nur");
  const davet = parametre("odavet") ?? undefined;
  const yerlesim = parametre("osec") ?? (yol === "/online/yerlesim" ? "develi" : undefined);
  const dunya = sahteDunya();
  const varis = yerlesimBul(dunya, yerlesim ?? "develi");
  return {
    gelistirici: true,
    dunya,
    taslak: { ad, cinsiyet, istekNo: "onizleme-0001", ...(yerlesim ? { yerlesim } : {}) },
    gecikme: VARMIS.includes(yol) ? 60 : undefined,
    profil: VARMIS.includes(yol) ? sahteProfil(ad, cinsiyet, varis?.yerlesim.id ?? "develi", varis?.beylik.id ?? "demirhan", davet ? "Ayşe" : undefined) : undefined,
    davetKodu: davet === "1" ? SAHTE_DAVET_KODU : davet,
    ...meslekTohumu(yol),
  };
}

/**
 * Kişi ekranının açacağı kimlik: rota parametresi geçerliyse o; önizlemede okisi parametresi ya da en yakın tanıdık
 * (önizleme çizicisi rota parametresi olarak tek oyunculu bir NPC kimliği verir).
 */
export function kisiSec(param: string | undefined, yerlesim: YerlesimDurumu | null): string | undefined {
  if (!onizlemeMi()) return kisiKimligiMi(param) ? param : undefined;
  const ok = parametre("okisi");
  if (ok && kisiKimligiMi(ok)) return ok;
  const ben = yerlesim?.ben;
  if (ok && /^h[0-9]$/.test(ok)) return ben?.hane[Number(ok.slice(1))]?.id;
  if (ok && /^t[0-9]$/.test(ok)) return ben?.tanidiklar[Number(ok.slice(1))]?.id;
  return ben?.tanidiklar[0]?.id;
}

/**
 * Oyuncu profili ekranının açacağı kimlik: rota parametresi "o<sayı>" ise o; önizlemede ooyuncu parametresi
 * ("o1", "ben"; yoksa o1). "ben" kendi kimliğine çözülür.
 */
export function oyuncuSec(param: string | undefined, benId: string | undefined): string | undefined {
  const ham = onizlemeMi() ? parametre("ooyuncu") ?? "o1" : param;
  if (ham === "ben") return benId;
  return ham && /^o[1-9][0-9]{0,8}$/.test(ham) ? ham : undefined;
}

function meslekTohumu(yol: string): { yas?: number; meslek?: MeslekId } {
  const yasHam = Number(parametre("oyas"));
  const yas = Number.isInteger(yasHam) && yasHam >= 12 && yasHam <= 80 ? yasHam : MESLEK_EKRANLARI.includes(yol) ? 14 : undefined;
  const mes = parametre("omes");
  const meslek = mes && (MESLEK_IDLERI as readonly string[]).includes(mes) ? (mes as MeslekId) : mes === null && DEMIRCI_EKRANLARI.includes(yol) ? "demirci" : undefined;
  return { ...(yas ? { yas } : {}), ...(meslek ? { meslek } : {}) };
}
