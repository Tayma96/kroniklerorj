import type { MuzikId, OrtamId, EfektId } from './ses-katalog';
import type { SahneTema } from './sahne-tema';
export function hayatEvre(age: number): MuzikId { return age < 13 ? 'cocukluk' : age < 18 ? 'genclik' : age < 25 ? 'ciraklik' : age < 40 ? 'ustalik' : age < 60 ? 'olgunluk' : 'yaslilik'; }
export type OrtamPlan = { music: MuzikId; ambiance: OrtamId | null };
export type SesBaglam = { path: string; age: number; dead?: boolean; season: string; profession?: string; propertyTypes?: readonly string[] };
const SEZON: Record<string, OrtamId> = { 'İlkbahar': 'bahar_kus', 'Yaz': 'yaz_cayir', 'Sonbahar': 'guz_ruzgar', 'Kış': 'kis_ruzgar' };
export function ekranSes(b: SesBaglam): OrtamPlan {
  const screen = b.path.split('/').filter(Boolean).pop() || '';
  if (!b.path.startsWith('/oyun')) return { music: b.path.includes('yeni-oyun') ? 'cocukluk' : 'ana_tema', ambiance: 'ocak' };
  if (b.dead) return { music: 'cenaze', ambiance: 'ocak' };
  if (screen === 'savas') return { music: 'gerilim', ambiance: 'bozkir' };
  if (screen === 'suc') return { music: 'gerilim', ambiance: 'yaz_gece' };
  if (screen === 'pazar') return { music: 'carsi', ambiance: 'carsi' };
  if (screen === 'atolye') return { music: 'ustalik', ambiance: b.profession === 'demirci' ? 'ors' : b.profession === 'dokumacı' ? 'dokuma' : 'ocak' };
  if (screen === 'mektep') return { music: 'genclik', ambiance: 'avlu' };
  if (screen === 'divan') return { music: 'divan', ambiance: 'avlu' };
  if (screen === 'harita' || b.path.includes('/diyar/')) return { music: 'yolculuk', ambiance: 'kervan' };
  if (['nesil', 'roman', 'kronik', 'tarih', 'hanedan'].includes(screen)) return { music: 'miras', ambiance: 'ocak' };
  if (screen === 'mulkler') return { music: 'gunluk', ambiance: b.propertyTypes?.includes('degirmen') ? 'degirmen' : 'ocak' };
  if (screen === 'sehir') return { music: 'carsi', ambiance: 'avlu' };
  return { music: hayatEvre(b.age), ambiance: SEZON[b.season] || 'bahar_kus' };
}
export function sahneSes(theme: SahneTema, festival = false): OrtamPlan {
  const map: Record<SahneTema, OrtamPlan> = {
    dugun: { music: festival ? 'senlik' : 'dugun', ambiance: 'carsi' }, cenaze: { music: 'cenaze', ambiance: 'guz_ruzgar' },
    mogol_baskin: { music: 'akin', ambiance: 'bozkir' }, kitlik: { music: 'kitlik', ambiance: 'kis_ruzgar' },
    medrese: { music: 'genclik', ambiance: 'avlu' }, ahi_tekke: { music: 'ciraklik', ambiance: 'dokuma' },
    kadi_divan: { music: 'divan', ambiance: 'avlu' }, gurbet_yol: { music: 'yolculuk', ambiance: 'kervan' },
    ev_yoksul: { music: 'gunluk', ambiance: 'ocak' }, ev_varlikli: { music: 'olgunluk', ambiance: 'ocak' },
    atolye_demirci: { music: 'ustalik', ambiance: 'ors' }, hasat: { music: 'gunluk', ambiance: 'suru' },
    nehir: { music: 'gunluk', ambiance: 'dere' }, dogum: { music: 'dogum', ambiance: 'ocak' }, cami_avlu: { music: 'tekke', ambiance: 'avlu' },
  };
  return map[theme];
}

// Tek durum değişiminde en çok bir anlatı efekti; günlüğün çevrilmiş cümlesi okunmaz.
export function olayEfekti(events: readonly { k?: string }[]): EfektId | null {
  if (events.some(e => e.k?.startsWith('hatir.kin.'))) return 'cip_kin';
  if (events.some(e => e.k?.startsWith('hatir.minnet.'))) return 'cip_minnet';
  if (events.some(e => /^yanki\.(comert|durust|cesur|temkin|hirs|hile|ata|kapi)\./.test(e.k || ''))) return 'cip_yanki';
  if (events.some(e => e.k === 'evj.buyHaggle' || e.k === 'evj.sellHaggle')) return 'akce_tek';
  return null;
}
