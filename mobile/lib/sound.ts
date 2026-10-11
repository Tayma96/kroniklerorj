// Gerçek kayıt efektleri (çevrimdışı, paket içi AAC). Varsayılan KAPALI; ayarlardan açılır.
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isReduceMotion } from "./perf";

const KEY = "kronikler_sound_v1";
let enabled = false;
let tap: AudioPlayer | null = null;
let advance: AudioPlayer | null = null;
let zafer: AudioPlayer | null = null;
let can: AudioPlayer | null = null;
let cingirak: AudioPlayer | null = null;
let kilic: AudioPlayer | null = null;
let davul: AudioPlayer | null = null;
let yenilgi: AudioPlayer | null = null;
let kese: AudioPlayer | null = null;
let ninni: AudioPlayer | null = null;
let saz: AudioPlayer | null = null;
let nal: AudioPlayer | null = null;
let dugun: AudioPlayer | null = null;
let ney: AudioPlayer | null = null;
let su: AudioPlayer | null = null;
let mirilti: AudioPlayer | null = null;
let hav: AudioPlayer | null = null;

// Arka plan müziği: paket içi gerçek icra, döngü. Ayrı anahtar; varsayılan AÇIK.
const MKEY = "kronikler_music_v1";
let musicEnabled = true;
let music: AudioPlayer | null = null;
export async function loadMusicSetting(): Promise<boolean> {
  // Pil dostu: sade moddaki (düşük RAM) cihazlarda müzik varsayılanı KAPALI — kullanıcı ayarlardan açarsa tercihi kalıcıdır.
  try {
    const v = await AsyncStorage.getItem(MKEY);
    if (v !== null) musicEnabled = v === "1";
    else { musicEnabled = !isReduceMotion(); await AsyncStorage.setItem(MKEY, musicEnabled ? "1" : "0"); }
  } catch {}
  if (musicEnabled) startMusic();
  return musicEnabled;
}
export function isMusicEnabled(): boolean { return musicEnabled; }
export async function setMusicEnabled(on: boolean): Promise<void> {
  musicEnabled = on;
  try { await AsyncStorage.setItem(MKEY, on ? "1" : "0"); } catch {}
  if (on) startMusic(); else stopMusic();
}
export function startMusic() {
  try {
    if (!music) { music = createAudioPlayer(require("../assets/ses/muzik/ana_tema.m4a")); music.loop = true; music.volume = 0.32; }
    music.play();
  } catch {}
}
export function stopMusic() { try { music?.pause(); } catch {} }
// Uygulama arka plana geçince müzik susar, dönünce kaldığı yerden sürer.
AppState.addEventListener("change", (st) => {
  if (!musicEnabled) return;
  try { if (st === "active") music?.play(); else music?.pause(); } catch {}
});

export async function loadSoundSetting(): Promise<boolean> {
  try { const v = await AsyncStorage.getItem(KEY); enabled = v === "1"; } catch {}
  return enabled;
}
export function isSoundEnabled(): boolean { return enabled; }
export async function setSoundEnabled(on: boolean): Promise<void> {
  enabled = on;
  try { await AsyncStorage.setItem(KEY, on ? "1" : "0"); } catch {}
}

function ensure() {
  try {
    if (!tap) tap = createAudioPlayer(require("../assets/ses/efekt/ui_dokun.m4a"));
    if (!advance) advance = createAudioPlayer(require("../assets/ses/efekt/ui_ilerle.m4a"));
    if (!zafer) zafer = createAudioPlayer(require("../assets/ses/efekt/zafer.m4a"));
    if (!can) can = createAudioPlayer(require("../assets/ses/efekt/matem.m4a"));
    if (!cingirak) cingirak = createAudioPlayer(require("../assets/ses/efekt/zil.m4a"));
    if (!kilic) kilic = createAudioPlayer(require("../assets/ses/efekt/kilic.m4a"));
    if (!davul) davul = createAudioPlayer(require("../assets/ses/efekt/davul_cenk.m4a"));
    if (!yenilgi) yenilgi = createAudioPlayer(require("../assets/ses/efekt/yenilgi.m4a"));
    if (!kese) kese = createAudioPlayer(require("../assets/ses/efekt/akce_kese.m4a"));
    if (!ninni) ninni = createAudioPlayer(require("../assets/ses/efekt/dogum.m4a"));
    if (!saz) saz = createAudioPlayer(require("../assets/ses/efekt/saz_vurgu.m4a"));
    if (!nal) nal = createAudioPlayer(require("../assets/ses/efekt/nal.m4a"));
    if (!dugun) dugun = createAudioPlayer(require("../assets/ses/efekt/dugun.m4a"));
    if (!ney) ney = createAudioPlayer(require("../assets/ses/efekt/ney_nefes.m4a"));
    if (!su) su = createAudioPlayer(require("../assets/ses/efekt/su.m4a"));
    if (!mirilti) mirilti = createAudioPlayer(require("../assets/ses/efekt/mirilti.m4a"));
    if (!hav) hav = createAudioPlayer(require("../assets/ses/efekt/hav.m4a"));
  } catch {}
}
function fire(p: AudioPlayer | null) {
  if (!enabled || !p) return;
  try { p.seekTo(0); p.play(); } catch {}
}
export function playTap() { if (!enabled) return; ensure(); fire(tap); }
export function playAdvance() { if (!enabled) return; ensure(); fire(advance); }
// Büyük anlar artık kendi sesini taşır: kutlama arpeji, ölüm çanı, şenlik çıngırağı.
export function playFanfare() { if (!enabled) return; ensure(); fire(zafer); }
export function playVictory() { if (!enabled) return; ensure(); fire(zafer); }
export function playToll() { if (!enabled) return; ensure(); fire(can); }
export function playChime() { if (!enabled) return; ensure(); fire(cingirak); }
// Savaş sesleri: giriş davulu, çelik çınlaması, yenilgi gümbürtüsü — meydanın kendi dili.
export function playWarDrum() { if (!enabled) return; ensure(); fire(davul); }
export function playClash() { if (!enabled) return; ensure(); fire(kilic); }
export function playDefeat() { if (!enabled) return; ensure(); fire(yenilgi); }
export function playCoin() { if (!enabled) return; ensure(); fire(kese); }
export function playLullaby() { if (!enabled) return; ensure(); fire(ninni); } // doğum: gerçek icra kesiti
export function playSaz() { if (!enabled) return; ensure(); fire(saz); }       // ikilem kapıyı çaldı: mızrap vurgusu
export function playHooves() { if (!enabled) return; ensure(); fire(nal); }    // yolculuk: dörtnala
export function playWedding() { if (!enabled) return; ensure(); fire(dugun); } // düğün: zurna-davul oyun havası
export function playNey() { if (!enabled) return; ensure(); fire(ney); }       // ibadet/tekke: ney nefesi
export function playWater() { if (!enabled) return; ensure(); fire(su); }      // hamam: tas suyu, mermer yankısı
export function playPurr() { if (!enabled) return; ensure(); fire(mirilti); }  // ocak kedisi: mırıltı
export function playBark() { if (!enabled) return; ensure(); fire(hav); }      // çoban köpeği: çift hav
