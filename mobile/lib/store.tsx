// Oyun durumu deposu — React context + AsyncStorage (offline kalıcı kayıt).
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { oturumGecis } from "./oturum";
import { useI18n } from "./i18n";
import { advanceWithMonthScene, prepareMonthScene } from "./month-scene";
import { GameState, newGame, advance, eat, work, achievementsOf, WorkStyle , migrate, continueAsHeir, kulDenYeniOcak } from "./game";
import { Defter, DEFTER_KEY, bosDefter, defterGoc, defterIsle, defterSecim, hayatAnahtari, sonSoy } from "./defter";
import { NAME_POOLS } from "./locale-data";
import { kayitGovdesi, kayitKuyrugu } from "./kayit-kuyrugu";
export { migrate }; // MP ekranı ve testler store üzerinden erişmeye devam eder

const KEY = "kronikler_save_v1";
export const oyunKaydi = kayitKuyrugu(AsyncStorage, KEY);

// Kaydın ham JSON'unu dışa ver (ayarlar ekranındaki yedekle/paylaş): tek offline kayıt telefonla birlikte kaybolmasın.
export async function exportSaveText(): Promise<string | null> {
  try {
    const current = oyunKaydi.snapshot();
    if (current) return JSON.stringify(current);
    await oyunKaydi.idle();
    const raw = await AsyncStorage.getItem(KEY);
    if (kayitGovdesi(raw)) return raw;
    const backup = await AsyncStorage.getItem(KEY + "_bak");
    return kayitGovdesi(backup) ? backup : null;
  } catch { return null; }
}


interface Ctx {
  state: GameState | null;
  loading: boolean;
  startGame: (first: string, surname: string, gender: "erkek" | "kadın") => Promise<void>;
  apply: (fn: (s: GameState) => GameState) => void;
  doAdvance: (n?: number) => void;
  doEat: () => void;
  importSave: (raw: string) => Promise<boolean>;
  doWork: (style?: WorkStyle) => void;
  resetGame: () => Promise<void>;
  switchingSave: boolean;
  retryPersist: () => Promise<boolean>;
  // ── Çok oyuncu köprüsü ── MP karakterini aynı depoya koyar; böylece TÜM /oyun
  // alt-ekranları (meslek/mektep/savaş…) MP karakteri üstünde de değişiklik yapmadan çalışır.
  // MP karakteri SP kuyruğuna verilmez; daha önce kabul edilen SP yazımı tamamlanabilir.
  mpMode: boolean;
  // ── Hanedan Defteri (kronik_defter): ölümden sağ çıkar, resetGame silmez ──
  defter: Defter;
  varisleDevam: (willId: string, heirName?: string, lastWordsId?: string, yetenek?: string) => void;
  yeniOcak: (gender: "erkek" | "kadın", yetenek?: string, ad?: string) => Promise<void>;
  enterMp: (s: GameState) => void;
  exitMp: () => Promise<void>;
}

const GameContext = createContext<Ctx | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setRawState] = useState<GameState | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const setState = (next: GameState | null) => { stateRef.current = next; setRawState(next); };
  // Oyunun dili kayda yazılır (yeni evlatların adı bu dilde konur); oturum sayacına eylem diye geçmez.
  const { lang } = useI18n(); const langRef = useRef(lang); langRef.current = lang;
  const [loading, setLoading] = useState(true);
  const [mpMode, setMpMode] = useState(false);
  const mpRef = useRef(false); // persist gating senkron okuma için
  const changing = useRef(false);
  const [switchingSave, setSwitchingSave] = useState(false);
  const beginSwitch = () => { changing.current = true; setSwitchingSave(true); };
  const endSwitch = () => { changing.current = false; setSwitchingSave(false); };
  const [defter, setDefter] = useState<Defter>(bosDefter());
  const defterRef = useRef<Defter>(defter); defterRef.current = defter;
  const defterYaz = useCallback((d: Defter) => { setDefter(d); defterRef.current = d; AsyncStorage.setItem(DEFTER_KEY, JSON.stringify(d)).catch(() => {}); }, []);
  useEffect(() => { AsyncStorage.getItem(DEFTER_KEY).then((raw) => { if (raw) { try { const d = defterGoc(JSON.parse(raw)); setDefter(d); defterRef.current = d; } catch {} } }).catch(() => {}); }, []);
  // Ölüm deftere işlenir (idempotent; MP karakteri SP defterine yazılmaz).
  useEffect(() => {
    if (!state || !state.player.dead || mpRef.current) return;
    const n = defterIsle(defterRef.current, state); if (n !== defterRef.current) defterYaz(n);
  }, [state?.player.dead, state?.turn, defterYaz]);

  useEffect(() => {
    let gone = false;
    const version = oyunKaydi.version();
    const currentLoad = () => !gone && version === oyunKaydi.version();
    (async () => {
      try {
        // Bozuk/eksik kayıt (sürüm geçişi, yarım yazım) "Devam Et"i gösterip /oyun'da çökmesin:
        // önce ana kayıt, o bozuksa bir önceki yazımın yedeği (tek nokta = toplam kayıp olmasın).
        await oyunKaydi.idle();
        let obj = oyunKaydi.snapshot();
        if (!obj) {
          const raw = await AsyncStorage.getItem(KEY);
          const backup = kayitGovdesi(raw) ? null : await AsyncStorage.getItem(KEY + "_bak");
          const saved = kayitGovdesi(raw) || kayitGovdesi(backup);
          obj = oyunKaydi.snapshot() || saved;
          if (currentLoad() && !obj && (raw || backup)) oyunKaydi.reportFailure();
        }
        // Açılış okuması sürerken sıfırlanan/yenilenen hayat geri getirilemez.
        if (!currentLoad()) return;
        if (obj) {
          const s = migrate(obj as GameState); oyunKaydi.remember(s);
          if (!mpRef.current && !changing.current) setState(s);
        }
      } catch { if (currentLoad()) oyunKaydi.reportFailure(); }
      finally { if (!gone) setLoading(false); }
    })();
    return () => { gone = true; };
  }, []);

  // Kalıcılaştırmayı geciktir: bellekte anında, diske en çok ~1.2 sn'de bir yaz.
  // (Her aksiyonda tüm state'i JSON'a çevirip diske yazmak CPU/pil yakıyordu.)
  const flush = useCallback(() => {
    if (!mpRef.current && !changing.current) void oyunKaydi.flush();
  }, []);
  const schedulePersist = useCallback((s: GameState) => {
    if (mpRef.current || changing.current) return;
    oyunKaydi.schedule(s);
  }, []);
  // Arayüz dili değişince (ya da dili yazılmamış eski kayıt açılınca) kayda işlenir.
  useEffect(() => {
    if (!state || mpRef.current || changing.current || state.dil === lang) return;
    const cur = stateRef.current;
    if (!cur || mpRef.current || changing.current || cur.dil === lang) return;
    const n = { ...cur, dil: lang }; setState(n); schedulePersist(n);
  }, [lang, state?.dil, switchingSave, schedulePersist]);
  // Uygulama arka plana alınınca / kapanırken bekleyen kaydı hemen diske yaz.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => { if (st !== "active") flush(); });
    return () => { sub.remove(); flush(); };
  }, [flush]);

  // Tek geçiş noktası: state'i dönüştür (bellek anında) + kalıcılaştırmayı geciktir.
  const apply = useCallback((fn: (s: GameState) => GameState) => {
    if (changing.current) return;
    const cur = stateRef.current;
    if (!cur) return;
    let next = fn(cur);
    if (!mpRef.current && next.turn > cur.turn && next.player.generation === cur.player.generation) next = prepareMonthScene(next, cur.hseq ?? 0);
    if (next !== cur) oturumGecis(cur.turn, next.turn, next.player.age);
    setState(next); schedulePersist(next);
  }, [schedulePersist]);

  const startGame = useCallback(async (first: string, surname: string, gender: "erkek" | "kadın") => {
    if (changing.current || mpRef.current) return;
    beginSwitch();
    try {
      const s = { ...newGame(first, surname, gender), dil: langRef.current };
      const previous = oyunKaydi.snapshot();
      oyunKaydi.remember(s);
      setState(s);
      await oyunKaydi.replace(s, previous);
    } finally { endSwitch(); }
  }, []);

  // MP modunda zaman yalnız sunucu tick'iyle ilerler → yerel doAdvance no-op (desenkron önlenir).
  const doAdvance = useCallback((n = 1) => { if (mpRef.current) return; apply((s) => advanceWithMonthScene(s, n)); }, [apply]);
  const doEat = useCallback(() => apply(eat), [apply]);
  // Yedeği içe al: yapıştırılan JSON'u doğrula, göçten geçir, kayda ve yedeğe yaz. MP diyarında kapalı (SP kaydı ezilmesin).
  const importSave = useCallback(async (raw: string): Promise<boolean> => {
    if (mpRef.current || changing.current) return false;
    const obj = kayitGovdesi(raw.trim());
    if (!obj || typeof obj.turn !== "number") return false;
    beginSwitch();
    try {
      const s = migrate(obj);
      if (!await oyunKaydi.replace(s)) return false;
      setState(s);
      return true;
    } catch { return false; } finally { endSwitch(); }
  }, []);
  const doWork = useCallback((style?: WorkStyle) => apply((s) => work(s, style)), [apply]);
  // Vâris yolu: seçilen soy yeteneği deftere yazılır ve vârise geçer.
  const varisleDevam = useCallback((willId: string, heirName?: string, lastWordsId?: string, yetenek?: string) => {
    const cur = stateRef.current;
    if (!cur || changing.current) return;
    if (!mpRef.current && cur.player.dead) { const d0 = defterIsle(defterRef.current, cur); defterYaz(defterSecim(d0, hayatAnahtari(cur), yetenek)); }
    const next = continueAsHeir(cur, willId, heirName, lastWordsId, yetenek);
    setState(next); schedulePersist(next);
  }, [schedulePersist, defterYaz]);
  // Küllerden yeni ocak: vârissiz ölümün ardından aynı soyadla yeni hayat — defter ve tek soy yeteneği taşınır, başka hiçbir şey.
  const yeniOcak = useCallback(async (gender: "erkek" | "kadın", yetenek?: string, ad?: string) => {
    if (mpRef.current || changing.current) return;
    beginSwitch();
    try {
      let d = defterRef.current; const cur = stateRef.current;
      if (cur && cur.player.dead) { d = defterIsle(d, cur); d = defterSecim(d, hayatAnahtari(cur), yetenek); defterYaz(d); }
      const son = sonSoy(d); const havuz = NAME_POOLS[langRef.current] || NAME_POOLS.tr;
      const ilk = ad || (gender === "kadın" ? havuz.f : havuz.m)[Math.floor(Math.random() * (gender === "kadın" ? havuz.f : havuz.m).length)];
      const soyad = son?.soyad || havuz.s[0];
      const ata = son ? { name: son.ad, izler: son.izler, nesil: son.nesil } : undefined;
      const s = { ...kulDenYeniOcak(ilk, soyad, gender, ata, yetenek), dil: langRef.current };
      const previous = oyunKaydi.snapshot();
      oyunKaydi.remember(s);
      setState(s);
      await oyunKaydi.replace(s, previous);
    } finally { endSwitch(); }
  }, [defterYaz]);
  const resetGame = useCallback(async () => {
    if (mpRef.current || changing.current) return;
    beginSwitch();
    try {
      if (!await oyunKaydi.clear()) throw new Error("Kayit sifirlanamadi");
      setState(null);
    } finally { endSwitch(); }
  }, []);
  const retryPersist = useCallback(async () => {
    if (mpRef.current || changing.current) return false;
    let current = oyunKaydi.snapshot();
    if (!current) {
      beginSwitch();
      try {
        const saved = kayitGovdesi(await AsyncStorage.getItem(KEY)) || kayitGovdesi(await AsyncStorage.getItem(KEY + "_bak"));
        if (!saved) return false;
        current = migrate(saved); oyunKaydi.remember(current); setState(current as GameState);
      } catch { oyunKaydi.reportFailure(); return false; } finally { endSwitch(); }
    }
    return await oyunKaydi.saveNow(current);
  }, []);

  // ── Çok oyuncu köprüsü ──
  const enterMp = useCallback((s: GameState) => {
    if (changing.current) return;
    if (!mpRef.current) void oyunKaydi.flush(); // Son SP hamlesi bırakılmaz; MP karakteri kuyruğa verilmez.
    mpRef.current = true; setMpMode(true); setState(s);
  }, []);
  const exitMp = useCallback(async () => {
    if (changing.current) return;
    beginSwitch();
    try {
      // Son SP hamlesi bellekte korunur; disk yazımı tamamlanmadan eski sürüm okunmaz.
      await oyunKaydi.idle();
      const obj = oyunKaydi.snapshot() || kayitGovdesi(await AsyncStorage.getItem(KEY)) || kayitGovdesi(await AsyncStorage.getItem(KEY + "_bak"));
      setState(obj ? migrate(obj as GameState) : null);
    } catch { setState(oyunKaydi.snapshot() as GameState | null); }
    finally { mpRef.current = false; setMpMode(false); endSwitch(); }
  }, []);

  return (
    <GameContext.Provider value={{ state, loading, startGame, apply, doAdvance, doEat, importSave, doWork, resetGame, mpMode, defter, varisleDevam, yeniOcak, enterMp, exitMp, switchingSave, retryPersist }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): Ctx {
  const c = useContext(GameContext);
  if (!c) throw new Error("useGame must be used within GameProvider");
  return c;
}
