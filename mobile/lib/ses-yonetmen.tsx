// Ses bağlamı oyun durumunu okur; motora, kayda ve zar akışına dokunmaz.
import { useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';
import { useGame } from './store';
import { currentCalendar } from './calendar';
import { ekranSes, hayatEvre, olayEfekti } from './ses-plan';
import { setSoundscape, playEffect } from './sound';
export function SesYonetmen() {
  const path = usePathname(), { state } = useGame();
  const age = state?.player.age ?? 7, dead = state?.player.dead ?? false;
  const season = currentCalendar(state?.turn ?? 0).season, profession = state?.player.profession;
  const propertyTypes = state?.player.properties.map(p => p.type) ?? [], propertyKey = propertyTypes.join('|');
  const history = useRef<{ q: number; identity: string; offer?: string } | null>(null);
  const previous = useRef<{ age: number; turn: number; name: string; path: string } | null>(null);
  useEffect(() => { setSoundscape(ekranSes({ path, age, dead, season, profession, propertyTypes })); }, [path, age, dead, season, profession, propertyKey]);
  useEffect(() => {
    if (!state) { previous.current = null; return; }
    const old = previous.current;
    if (path !== '/oyun/ayarlar' && old && old.name === state.player.name && state.turn > old.turn && age > old.age && !dead && hayatEvre(age) !== hayatEvre(old.age)) playEffect('bolum_davul');
    if (old && old.path !== path && ['roman', 'kronik', 'tarih'].includes(path.split('/').pop() || '')) playEffect('sayfa');
    previous.current = { age, turn: state.turn, name: state.player.name, path };
  }, [path, age, dead, state?.turn, state?.player.name]);
  useEffect(() => {
    if (!state) { history.current = null; return; }
    const identity = state.player.name + '|' + state.player.surname + '|' + state.player.generation;
    const q = state.hseq || 0, offer = state.npcTeklif ? state.npcTeklif.id + ':' + state.npcTeklif.turn : undefined;
    const old = history.current;
    if (path !== '/oyun/ayarlar' && old && old.identity === identity && q >= old.q && !dead) {
      const effect = olayEfekti(state.history.filter(e => (e.q || 0) > old.q));
      if (effect) playEffect(effect);
      else if (offer && offer !== old.offer && state.npcTeklif?.turn === state.turn) playEffect('kapi');
    }
    history.current = { identity, q, offer };
  }, [state?.hseq, state?.npcTeklif, state?.player.generation, state?.player.name, dead]);
  return null;
}
