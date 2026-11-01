// Tasarım önizlemesi tohumu (yalnız onizlemeMi() doğruyken kullanılır; uygulamada hiç çalışmaz).
// Rota başına başlangıç durumu: /online giriş ekranını oturumsuz, diğerlerini sahte geliştirici oturumuyla açar.
// Sorgu parametreleri: oad (ad), ocins (erkek|kadın), osec (yerleşim kimliği), odavet (davet kodu),
// okisi (kişi ekranı: "n12"/"o2" kimliği, "t0" tanıdık sırası, "h0" hane sırası; yoksa en yakın tanıdık).
// Faz 2 ekranları (yaşam, mahalle, kişi, tanıdıklar, karakter) varmış bir profille ve sahte yerleşimle açılır.
import { onizlemeMi } from "./kapi";
import { sahteDunya, sahteProfil, SAHTE_DAVET_KODU } from "./sahte";
import { kisiKimligiMi, yerlesimBul, type Cinsiyet, type DunyaOzeti, type Profil, type YerlesimDurumu } from "./protokol";

export interface Tohum {
  gelistirici: boolean;
  dunya?: DunyaOzeti;
  profil?: Profil;
  taslak?: { ad: string; cinsiyet: Cinsiyet | null; istekNo: string; yerlesim?: string };
  davetKodu?: string;
  /** Sahte istemcinin yanıt gecikmesi (ms). */
  gecikme?: number;
}

const VARMIS = ["/online/varis", "/online/yasam", "/online/mahalle", "/online/kisi/[id]", "/online/tanidiklar", "/online/karakter"];

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
