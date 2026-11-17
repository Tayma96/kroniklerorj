// Dünya sürümü (yayın öncesi sıfırlama): `DUNYA_SURUMU` ([vars], varsayılan "1"). Oyun dünyasının bütün Durable
// Object adları (Hesap, Dünya, Yerleşim, Masa, İşletme, Bölge, Sultanlık) bu sürümle öneklenir; sürüm değişince
// herkes boş bir dünyada sıfırdan başlar. YonetimDO sürüm dışıdır: işlem kaydı, yönetici rolleri ve yetkileri korunur.
//
// Geriye uyum: sürüm "1" iken HİÇBİR önek eklenmez (bugünkü oyuncuların verisi aynı DO adlarında kalır).
// Oyuncu oturum belirteçleri de sürüme bağlıdır: sürüm değişince eski belirteçler imzadan geçmez (oyuncu yeniden
// girer ve yeni dünyadaki hesabına düşer). Yönetici belirteçleri sürümden bağımsızdır.

/** [PARAMETRE] Sürüm tanımsız ya da geçersizken kullanılan değer (bugünkü dünya). */
export const VARSAYILAN_DUNYA_SURUMU = "1";
const BICIM = /^[A-Za-z0-9_-]{1,16}$/;

/** Ortamdaki dünya sürümü; boş ya da biçimsizse "1". */
export function dunyaSurumu(env: { DUNYA_SURUMU?: string }): string {
  const s = env.DUNYA_SURUMU?.trim();
  return s && BICIM.test(s) ? s : VARSAYILAN_DUNYA_SURUMU;
}

/** Oyun DO'sunun `idFromName` girdisi: sürüm "1" iken adın kendisi, değilse "d<sürüm>:<ad>". */
export function doAdi(env: { DUNYA_SURUMU?: string }, ad: string): string {
  const s = dunyaSurumu(env);
  return s === VARSAYILAN_DUNYA_SURUMU ? ad : `d${s}:${ad}`;
}

/** Oyuncu oturum anahtarı: sürüm "1" iken sırrın kendisi, değilse sürümle ayrıştırılmış türev. */
export function oyuncuOturumAnahtari(gizli: string, env: { DUNYA_SURUMU?: string }): string {
  const s = dunyaSurumu(env);
  return s === VARSAYILAN_DUNYA_SURUMU ? gizli : `${gizli}\u0000dunya:${s}`;
}
