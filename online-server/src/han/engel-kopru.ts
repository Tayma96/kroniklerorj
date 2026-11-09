// Engelleme köprüsü (Faz 3 `engelliMi`, src/yerlesim/engel.ts ile bağlı). MasaDO yerleşim verisine erişemez; bu yüzden
// engel listesi bağlanırken (bilet alınırken) YerlesimDO'dan alınır ve bilete konur. Liste iki yönlüdür: oyuncunun
// engellediği VE onu engelleyen oyuncuların hesap kimlikleri (engel tek yönlü kaydedilir, iki yönlü uygulanır).
// MasaDO listeyi kendi deposunda hesap başına tutar (soket eki 2 KB sınırına sığmayabilir); oyuncu masadayken
// engellerse HesapDO güncel listeyi son masasına bildirir.
// Anlam: `engelliMi(a, b)` a ile b arasında hangi yönde olursa olsun engel varsa true. Masa iki yönü de sorar:
// engelleyen engellenenin iletisini görmez, engellenen de engelleyenin iletisini görmez; engellenen engelleyene
// butonlu eylem ve ikram yöneltemez.

export type EngelSorgusu = (a: string, b: string) => Promise<boolean>;

/** MasaDO depo öneki: + hesap kimliği → o hesabın iki yönlü engel listesi (hesap kimlikleri). */
export const ENGEL_ANAHTARI = "eg:";

/**
 * Hesap başına listeyi okuyan bir işlevden iki yönlü sorgu kurar. Listelerden biri bilinmese bile (oyuncu masada
 * değil) öbürü iki yönü de taşıdığı için yeterlidir.
 */
export function engelSorgusuKur(liste: (hesap: string) => Promise<readonly string[] | undefined>): EngelSorgusu {
  return async (a, b) => {
    if (a === b) return false;
    if ((await liste(a))?.includes(b)) return true;
    return (await liste(b))?.includes(a) ?? false;
  };
}

/** Bilet ya da bildirimden gelen ham listeyi temizler (yalnız kısa metinler, tekrarsız, sınırlı). */
export function engelListesiCoz(ham: unknown, enCok = 400): string[] {
  if (!Array.isArray(ham)) return [];
  const temiz = new Set<string>();
  for (const x of ham) if (typeof x === "string" && x.length > 0 && x.length <= 64) temiz.add(x);
  return [...temiz].slice(0, enCok);
}
