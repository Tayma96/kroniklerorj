// Tasarım önizlemesi tohumu (yalnız onizlemeMi() doğruyken kullanılır; uygulamada hiç çalışmaz).
// Rota başına başlangıç durumu: /online giriş ekranını oturumsuz, diğerlerini sahte geliştirici oturumuyla açar.
// Sorgu parametreleri: oad (ad), ocins (erkek|kadın), osec (yerleşim kimliği), odavet (davet kodu).
import { onizlemeMi } from "./kapi";
import { sahteDunya, sahteProfil, SAHTE_DAVET_KODU } from "./sahte";
import { yerlesimBul, type Cinsiyet, type DunyaOzeti, type Profil } from "./protokol";

export interface Tohum {
  gelistirici: boolean;
  dunya?: DunyaOzeti;
  profil?: Profil;
  taslak?: { ad: string; cinsiyet: Cinsiyet | null; istekNo: string; yerlesim?: string };
  davetKodu?: string;
}

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
    profil: yol === "/online/varis" ? sahteProfil(ad, cinsiyet, varis?.yerlesim.id ?? "develi", varis?.beylik.id ?? "demirhan", davet ? "Ayşe" : undefined) : undefined,
    davetKodu: davet === "1" ? SAHTE_DAVET_KODU : davet,
  };
}
