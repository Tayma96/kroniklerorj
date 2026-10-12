// Yerel oynatıcı yaşam döngüsü. Oyun durumunu okumaz veya değiştirmez.
export interface SesOynatici {
  volume: number; loop: boolean;
  play(): void; pause(): void; remove(): void;
  seekTo(seconds: number): Promise<void>;
  onEnd?(fn: () => void): () => void;
}
export interface SesSaat {
  now(): number;
  later(fn: () => void, ms: number): unknown;
  cancel(id: unknown): void;
  repeat(fn: () => void, ms: number): unknown;
  stopRepeat(id: unknown): void;
}
export type SesPlan = { music: string | null; ambiance: string | null };
export type SesTercih = { music: boolean; ambiance: boolean; effects: boolean };
type Loop = { id: string; player: SesOynatici };
type Channel = { current?: Loop; retiring?: Loop; fade?: unknown };
type Voice = { player: SesOynatici; timer?: unknown; off?: () => void; duck: boolean };
const SAAT: SesSaat = {
  now: () => Date.now(), later: (fn, ms) => setTimeout(fn, ms), cancel: id => clearTimeout(id as ReturnType<typeof setTimeout>),
  repeat: (fn, ms) => setInterval(fn, ms), stopRepeat: id => clearInterval(id as ReturnType<typeof setInterval>),
};
export class SesMikser {
  private channels: Record<'music' | 'ambiance', Channel> = { music: {}, ambiance: {} };
  private voices = new Map<string, Voice>();
  private last = new Map<string, number>();
  private plan: SesPlan = { music: null, ambiance: null };
  private prefs: SesTercih = { music: false, ambiance: false, effects: false };
  private active = false;
  constructor(private create: (id: string) => SesOynatici, private clock: SesSaat = SAAT) {}
  setPlan(plan: SesPlan) { if (this.plan.music === plan.music && this.plan.ambiance === plan.ambiance) return; this.plan = plan; this.sync(); }
  setPreferences(prefs: SesTercih) {
    this.prefs = prefs;
    if (!prefs.effects) for (const id of [...this.voices.keys()]) this.end(id);
    this.sync();
  }
  setActive(active: boolean) {
    this.active = active;
    if (!active) {
      for (const id of [...this.voices.keys()]) this.end(id);
      this.clearChannel('music'); this.clearChannel('ambiance');
    } else this.sync();
  }
  private safe(fn: () => void) { try { fn(); } catch {} }
  private remove(player?: SesOynatici) { if (player) { this.safe(() => player.pause()); this.safe(() => player.remove()); } }
  private clearChannel(name: 'music' | 'ambiance') {
    const c = this.channels[name];
    if (c.fade != null) this.clock.stopRepeat(c.fade);
    this.remove(c.current?.player); this.remove(c.retiring?.player); this.channels[name] = {};
  }
  private target(name: 'music' | 'ambiance') {
    const duck = [...this.voices.values()].some(v => v.duck);
    return name === 'music' ? (duck ? 0.085 : 0.23) : (duck ? 0.055 : 0.12);
  }
  private sync() {
    for (const name of ['music', 'ambiance'] as const) {
      const wanted = this.active && this.prefs[name] ? this.plan[name] : null;
      if (!wanted) { this.clearChannel(name); continue; }
      const c = this.channels[name];
      if (c.current?.id !== wanted) {
        let player: SesOynatici | undefined;
        try { player = this.create(wanted); player.loop = true; player.volume = 0; player.play(); }
        catch { this.remove(player); continue; }
        if (c.fade != null) this.clock.stopRepeat(c.fade);
        this.remove(c.retiring?.player);
        c.retiring = c.current; c.current = { id: wanted, player };
      }
      this.fade(name);
    }
  }
  private fade(name: 'music' | 'ambiance') {
    const c = this.channels[name]; if (!c.current) return;
    if (c.fade != null) this.clock.stopRepeat(c.fade);
    const current = c.current.player, old = c.retiring?.player;
    const start = current.volume, oldStart = old?.volume ?? 0, target = this.target(name);
    const begin = this.clock.now();
    c.fade = this.clock.repeat(() => {
      const progress = Math.min(1, (this.clock.now() - begin) / 800);
      this.safe(() => { current.volume = start + (target - start) * progress; });
      if (old) this.safe(() => { old.volume = oldStart * (1 - progress); });
      if (progress >= 1) {
        this.clock.stopRepeat(c.fade); c.fade = undefined;
        this.remove(old); c.retiring = undefined;
      }
    }, 50);
  }
  effect(id: string, durationMs: number, duck = true) {
    if (!this.active || !this.prefs.effects) return;
    const now = this.clock.now();
    if (now - (this.last.get(id) ?? -Infinity) < 100) return;
    this.last.set(id, now);
    this.end(id);
    while (this.voices.size >= 4) this.end(this.voices.keys().next().value!);
    let player: SesOynatici | undefined;
    try { player = this.create(id); player.loop = false; player.volume = duck ? 0.56 : 0.34; }
    catch { this.remove(player); return; }
    const effectPlayer = player;
    const voice: Voice = { player: effectPlayer, duck }; this.voices.set(id, voice);
    try { voice.off = player.onEnd?.(() => { if (this.voices.get(id) === voice) this.end(id); }); } catch {}
    voice.timer = this.clock.later(() => { if (this.voices.get(id) === voice) this.end(id); }, Math.max(400, durationMs + 700));
    // seekTo asenkrondur: susturma veya arka plana geçme sırasında geç dönen sonuç sesi yeniden başlatamaz.
    try { void effectPlayer.seekTo(0).then(() => {
      if (this.active && this.prefs.effects && this.voices.get(id) === voice) { try { effectPlayer.play(); } catch { this.end(id); } }
    }).catch(() => { if (this.voices.get(id) === voice) this.end(id); }); }
    catch { this.end(id); }
    this.fade('music'); this.fade('ambiance');
  }
  private end(id: string) {
    const v = this.voices.get(id); if (!v) return;
    this.voices.delete(id);
    if (v.timer != null) this.clock.cancel(v.timer);
    this.safe(() => v.off?.()); this.remove(v.player);
    if (this.active) { this.fade('music'); this.fade('ambiance'); }
  }
  dispose() { this.setActive(false); this.last.clear(); }
  snapshot() {
    return { voices: this.voices.size, loops: Object.values(this.channels).reduce((n, c) => n + Number(!!c.current) + Number(!!c.retiring), 0), active: this.active };
  }
}
