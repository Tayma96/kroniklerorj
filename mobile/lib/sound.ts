// Çevrimdışı ses: müzik, ortam ve efektler ayrı; kaynaklar ihtiyaç bitince bırakılır.
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isReduceMotion } from './perf';
import { MUZIK, ORTAM, EFEKT, EFEKT_SURE, type EfektId } from './ses-katalog';
import { SesMikser, type SesOynatici, type SesPlan, type SesTercih } from './ses-mikser';
import type { OrtamPlan } from './ses-plan';

const KEYS = { effects: 'kronikler_sound_v1', music: 'kronikler_music_v1', ambiance: 'kronikler_ambiance_v1' };
let prefs: SesTercih = { music: true, ambiance: false, effects: false };
const revisions = { music: 0, ambiance: 0, effects: 0 };
const writes: Partial<Record<keyof SesTercih, Promise<void>>> = {};
const listeners = new Set<() => void>();
const sources: Record<string, number> = Object.fromEntries([
  ...Object.entries(MUZIK).map(([id, source]) => ['music:' + id, source]),
  ...Object.entries(ORTAM).map(([id, source]) => ['ambiance:' + id, source]),
  ...Object.entries(EFEKT).map(([id, source]) => ['effect:' + id, source]),
]);
function nativePlayer(id: string): SesOynatici {
  const source = sources[id]; if (source == null) throw new Error('Ses kaynağı yok');
  const p = createAudioPlayer(source, { updateInterval: id.startsWith('effect:') ? 100 : 500 });
  return {
    get volume() { return p.volume; }, set volume(v) { p.volume = v; },
    get loop() { return p.loop; }, set loop(v) { p.loop = v; },
    play: () => p.play(), pause: () => p.pause(), remove: () => p.remove(), seekTo: sec => p.seekTo(sec),
    onEnd: fn => { const sub = p.addListener('playbackStatusUpdate', status => { if (status.didJustFinish) fn(); }); return () => sub.remove(); },
  };
}
const mixer = new SesMikser(nativePlayer);
let base: OrtamPlan = { music: 'ana_tema', ambiance: 'ocak' };
const scenes = new Map<symbol, OrtamPlan>();
let eventPlan: OrtamPlan | null = null, eventTimer: ReturnType<typeof setTimeout> | undefined;
let epoch = 0, cleanup: (() => void) | null = null;
function applyPlan() {
  const plan = [...scenes.values()].at(-1) || eventPlan || base;
  const mapped: SesPlan = { music: 'music:' + plan.music, ambiance: plan.ambiance ? 'ambiance:' + plan.ambiance : null };
  mixer.setPlan(mapped);
}
function notify() { mixer.setPreferences(prefs); listeners.forEach(fn => { try { fn(); } catch {} }); }
export function subscribeAudioPreferences(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function isSoundEnabled() { return prefs.effects; }
export function isMusicEnabled() { return prefs.music; }
export function isAmbianceEnabled() { return prefs.ambiance; }
async function setPreference(name: keyof SesTercih, on: boolean) {
  revisions[name]++; prefs = { ...prefs, [name]: on }; notify();
  const write = (writes[name] || Promise.resolve()).then(() => AsyncStorage.setItem(KEYS[name], on ? '1' : '0')).catch(() => {});
  writes[name] = write; await write;
}
export function setSoundEnabled(on: boolean) { return setPreference('effects', on); }
export function setMusicEnabled(on: boolean) { return setPreference('music', on); }
export function setAmbianceEnabled(on: boolean) { return setPreference('ambiance', on); }
async function loadPreferences(run: number) {
  const version = { ...revisions };
  let rows: readonly (readonly [string, string | null])[] = [];
  try { rows = await AsyncStorage.multiGet(Object.values(KEYS)); } catch {}
  if (run !== epoch) return;
  const stored = new Map(rows), musicDefault = !isReduceMotion();

  for (const name of ['music', 'ambiance', 'effects'] as const) {
    if (version[name] !== revisions[name]) continue; // Geç dönen yükleme yeni kullanıcı tercihini ezemez.
    const value = stored.get(KEYS[name]);
    prefs = { ...prefs, [name]: value == null ? (name === 'music' ? musicDefault : name === 'ambiance' ? prefs.music && !isReduceMotion() : false) : value === '1' };
    if (value == null && name !== 'effects') {
      const selected = prefs[name], rev = revisions[name];
      writes[name] = (writes[name] || Promise.resolve()).then(async () => {
        if (run !== epoch || rev !== revisions[name]) return;
        try { await AsyncStorage.setItem(KEYS[name], selected ? '1' : '0'); } catch {}
      });
    }
  }
  notify();
}
// Eski çağrı yüzeyi korunur; uygulama yaşam döngüsünü initializeAudio sahiplenir.
export async function loadSoundSetting() { await loadPreferences(epoch); return prefs.effects; }
export async function loadMusicSetting() { await loadPreferences(epoch); return prefs.music; }
export function initializeAudio(): () => void {
  cleanup?.(); const run = ++epoch; let ready = false, stopped = false;
  const stateChanged = () => { mixer.setActive(ready && AppState.currentState === 'active'); if (AppState.currentState !== 'active') clearEvent(); };
  const sub = AppState.addEventListener('change', stateChanged);
  applyPlan();
  void Promise.allSettled([loadPreferences(run), Promise.resolve().then(() => setAudioModeAsync({ playsInSilentMode: false, allowsRecording: false, shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' }))]).then(results => {
    if (stopped || epoch !== run) return; ready = results[1].status === 'fulfilled'; stateChanged();
  });
  const stop = () => { if (stopped) return; stopped = true; sub.remove(); if (epoch !== run) return; ++epoch; clearEvent(); mixer.dispose(); cleanup = null; };
  cleanup = stop; return stop;
}
export function setSoundscape(plan: OrtamPlan) { base = plan; applyPlan(); }
export function pushSoundscape(plan: OrtamPlan): () => void {
  const key = Symbol(); scenes.set(key, plan); applyPlan();
  return () => { scenes.delete(key); applyPlan(); };
}
function clearEvent() { if (eventTimer) clearTimeout(eventTimer); eventTimer = undefined; eventPlan = null; applyPlan(); }
function cue(plan: OrtamPlan, ms = 6500) { if (!mixer.snapshot().active) return; clearEvent(); eventPlan = plan; applyPlan(); eventTimer = setTimeout(clearEvent, ms); }
export function startMusic() { mixer.setPreferences(prefs); applyPlan(); }
export function stopMusic() { mixer.setPreferences({ ...prefs, music: false }); }
export function playEffect(id: EfektId) { mixer.effect('effect:' + id, EFEKT_SURE[id], !id.startsWith('ui_')); }
export function playTap() { playEffect('ui_dokun'); }
export function playAdvance() { playEffect('ui_ilerle'); }
export function playFanfare() { playEffect('zafer'); cue({ music: 'zafer', ambiance: 'avlu' }); }
export function playVictory() { playFanfare(); }
export function playToll() { playEffect('matem'); cue({ music: 'cenaze', ambiance: 'ocak' }); }
export function playChime() { playEffect('zil'); }
export function playWarDrum() { playEffect('davul_cenk'); cue({ music: 'akin', ambiance: 'bozkir' }, 12000); }
export function playClash() { playEffect('kilic'); }
export function playDefeat() { playEffect('yenilgi'); }
export function playCoin() { playEffect('akce_kese'); }
export function playLullaby() { playEffect('dogum'); cue({ music: 'dogum', ambiance: 'ocak' }, 8000); }
export function playSaz() { playEffect('saz_vurgu'); }
export function playHooves() { playEffect('nal'); }
export function playWedding() { playEffect('dugun'); cue({ music: 'dugun', ambiance: 'carsi' }); }
export function playNey() { playEffect('ney_nefes'); cue({ music: 'tekke', ambiance: 'avlu' }); }
export function playWater() { playEffect('su'); }
export function playPurr() { playEffect('mirilti'); }
export function playBark() { playEffect('hav'); }
