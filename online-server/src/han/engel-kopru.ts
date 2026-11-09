// Engelleme köprüsü. Ana dalda Faz 3 (src/yerlesim/) `engelliMi(a, b)` getirecek; birleşmede bu dosya oraya
// bağlanır (aynı ad ve imza). O zamana kadar hiç kimse engelli değildir.
// Anlam: `a`, `b`'yi engellediyse true. Masa iki yönü de sorar: engelleyen engellenenin iletisini görmez,
// engellenen de engelleyenin iletisini görmez; engellenen engelleyene butonlu eylem ve ikram yöneltemez.

export async function engelliMi(_a: string, _b: string): Promise<boolean> {
  return false;
}

export type EngelSorgusu = (a: string, b: string) => Promise<boolean>;
