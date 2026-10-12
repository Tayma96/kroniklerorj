// Ses ve görüntü aynı anlamsal bağlama bağlanır; çevrilmiş metinden tema çıkarılmaz.
export type SahneTema = 'dugun' | 'cenaze' | 'mogol_baskin' | 'kitlik' | 'medrese' | 'ahi_tekke' | 'kadi_divan' | 'gurbet_yol' | 'ev_yoksul' | 'ev_varlikli' | 'atolye_demirci' | 'hasat' | 'nehir' | 'dogum' | 'cami_avlu';
export const SAHNE_GORSEL = {
  dugun: require('../assets/arka/dugun.jpg'), cenaze: require('../assets/arka/cenaze.jpg'),
  mogol_baskin: require('../assets/arka/mogol_baskin.jpg'), kitlik: require('../assets/arka/kitlik.jpg'),
  medrese: require('../assets/arka/medrese.jpg'), ahi_tekke: require('../assets/arka/ahi_tekke.jpg'),
  kadi_divan: require('../assets/arka/kadi_divan.jpg'), gurbet_yol: require('../assets/arka/gurbet_yol.jpg'),
  ev_yoksul: require('../assets/arka/ev_yoksul.jpg'), ev_varlikli: require('../assets/arka/ev_varlikli.jpg'),
  atolye_demirci: require('../assets/arka/atolye_demirci.jpg'), hasat: require('../assets/arka/hasat.jpg'),
  nehir: require('../assets/arka/nehir.jpg'), dogum: require('../assets/arka/dogum.jpg'), cami_avlu: require('../assets/arka/cami_avlu.jpg'),
} as const;
export function ikilemTema(id: string, icon: string): SahneTema | null {
  if (/kitlik|aclik|scarcity/.test(id)) return 'kitlik';
  if (/mogol|baskin|savas|sefer/.test(id)) return 'mogol_baskin';
  if (/dogum|bebek|besik/.test(id) || icon === 'baby') return 'dogum';
  if (/dugun|evlilik|fest_/.test(id) || icon === 'ring') return 'dugun';
  if (/cenaze|son_soz|olmeden|olum/.test(id) || icon === 'tombstone') return 'cenaze';
  if (/kadi|mahkeme|dava|hukum/.test(id)) return 'kadi_divan';
  if (/medrese|ilim|mektep/.test(id) || icon === 'graduate-cap') return 'medrese';
  if (/ahi|cirak|usta|pestamal/.test(id)) return 'ahi_tekke';
  if (/demir|tezgah|atolye/.test(id) || icon === 'anvil') return 'atolye_demirci';
  if (/hasat|tarla|bag_|ekin/.test(id) || icon === 'wheat') return 'hasat';
  if (/nehir|kuyu|su_|balik/.test(id) || icon === 'fishing') return 'nehir';
  if (/ibadet|tekke|cami|sadaka/.test(id) || icon === 'prayer-beads') return 'cami_avlu';
  if (/yol|gurbet|kervan|goc/.test(id) || icon === 'walk' || icon === 'camel') return 'gurbet_yol';
  if (/miras|servet|konak/.test(id)) return 'ev_varlikli';
  return null;
}
