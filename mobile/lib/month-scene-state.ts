import type { Dilemma } from "./events";
import type { GameState, Opportunity, KirSahne, Player, DanisanSes } from "./game";
export interface MonthScene {
  id: string; turn: number; generation: number; kind: "senlik" | "ikilem" | "orta" | "firsat" | "kapi" | "bos" | "kirilma" | "mektep" | "husumet"; done: boolean;
  mek?: { id: string }; // F3 mektep kartı (sıbyan olayı, 12 yaş yol kararı, 17 yaş kılıç icazeti) · F4 "usta" (usta kapısı): içerik id'den türetilir
  kir?: { tip: KirSahne; kisi?: string }; // kader kırılması anı (aşama 3): içerik kayıttan türetilir, yalnız tip ve kişi saklanır
  dilemma?: Omit<Dilemma, "when">; opp?: Opportunity;
  danis?: DanisanSes[]; // F6a: ay kararında yakın çevrenin tavsiyesi (kişi, önerdiği seçenek, yön, huy grubu, rol)
  hus?: { a: string; b: string }; // F6a: NPC–NPC husumeti kartı (iki kişi; içerik kayıttan türetilir)
  stage?: "intro" | "play" | "result"; success?: boolean;
  // Çözülen kararın izi (radikal sonuçlar planı, aşama 2): ana sayfa seçilen yolu ve GERÇEKLEŞEN etkiyi aynı yerde gösterir.
  secim?: { id: string; i: number; label: string; etki: Record<string, number> };
}
export function pendingMonthScene(s: GameState): MonthScene | undefined {
  const m = s.monthScene;
  return !s.mpRealm && !s.player.dead && !(s.player.jail && s.player.jail.left > 0) && m && !m.done && m.turn === s.turn && m.generation === (s.player.generation || 1) && (m.dilemma || m.opp || m.kir || m.mek || m.hus) ? m : undefined;
}
// Kayıt bozulduysa karar üretme veya ödül uydurma; yalnız güvenli veriyi geri yükle.
export function repairMonthScene(raw: unknown, s: GameState): MonthScene | undefined {
  if (!raw || typeof raw !== "object" || s.mpRealm || s.player.dead) return undefined;
  const m = raw as MonthScene;
  if (m.turn !== s.turn || m.generation !== (s.player.generation || 1) || m.id !== `month:${m.generation}:${m.turn}` || !["senlik", "ikilem", "orta", "firsat", "kapi", "bos", "kirilma", "mektep", "husumet"].includes(m.kind) || typeof m.done !== "boolean") return undefined;
  const base: MonthScene = { id: m.id, turn: m.turn, generation: m.generation, kind: m.kind, done: m.done };
  const secim = m.secim;
  if (m.done) return secim && typeof secim.id === "string" && Number.isInteger(secim.i) && typeof secim.label === "string" && secim.label.length <= 400
    && !!secim.etki && typeof secim.etki === "object" && Object.values(secim.etki).every(Number.isFinite) ? { ...base, secim } : base;
  const text = (v: unknown) => typeof v === "string" && v.length <= 8000;
  const delta = (v: unknown): boolean => !!v && typeof v === "object" && !Array.isArray(v) && Object.entries(v).every(([k, val]) => k === "nam" ? !!val && typeof val === "object" && Object.values(val).every(Number.isFinite) : ["addItem", "veraset"].includes(k) ? text(val) : k === "marry" ? typeof val === "boolean" : typeof val === "number" && Number.isFinite(val));
  if (["senlik", "ikilem", "orta"].includes(m.kind)) {
    const d = m.dilemma;
    if (!d || ![d.id, d.title, d.text, d.icon].every(text) || !Array.isArray(d.choices) || d.choices.length < 2 || d.choices.length > 8 || !d.choices.every(c => c && text(c.label) && text(c.result) && delta(c.delta) && (c.gercek === undefined || delta(c.gercek)) && (c.rk === undefined || text(c.rk)) && (c.sans === undefined || Number.isFinite(c.sans) && c.sans >= 0 && c.sans <= 100))) return undefined;
    base.dilemma = { id: d.id, title: d.title, text: d.text, icon: d.icon, ...(text(d.not) ? { not: d.not } : {}), choices: d.choices.map(c => ({ label: c.label, result: c.result, delta: c.delta, ...(c.gercek ? { gercek: c.gercek } : {}), ...(c.rk ? { rk: c.rk } : {}), ...(c.sans !== undefined ? { sans: c.sans } : {}) })) };
    const dn = Array.isArray(m.danis) ? m.danis.filter(x => x && typeof x.id === "string" && x.id.length <= 64 && Number.isInteger(x.i) && x.i >= 0 && x.i < d.choices.length && ["iyilik", "cikar", "temkin", "cesaret"].includes(x.y) && ["ilkeli", "cikarci", "cekingen", "sicak"].includes(x.g) && typeof x.r === "string" && x.r.length <= 40).slice(0, 2) : [];
    if (dn.length) base.danis = dn.map(x => ({ id: x.id, i: x.i, y: x.y, g: x.g, r: x.r }));
    return base;
  }
  if (m.kind === "kirilma") {
    const k = m.kir;
    if (!k || !["teklif", "haber", "alacakli", "ikinci"].includes(k.tip) || k.kisi !== undefined && (typeof k.kisi !== "string" || k.kisi.length > 64)) return undefined;
    // Sahne kayıttaki kırılmayla örtüşmüyorsa (bozuk ya da ayıklanmış kayıt) kapanmış sayılır: ay kilitli kalmaz.
    const kl = Array.isArray(s.player.kirilmalar) ? s.player.kirilmalar : [], ort = kl.filter((x) => x.id === "ortaklik");
    const uygun = k.tip === "alacakli" ? ort.some((x) => x.faz === "alacakli") : k.tip === "haber" ? ort.some((x) => x.faz === "yolda" && (x.yol === "buyuk" || x.yol === "kucuk"))
      : k.tip === "ikinci" ? kl.some((x) => x.id === "katip") && !ort.some((x) => x.ikinci) : !ort.length;
    if (!uygun) return { ...base, done: true };
    return { ...base, kir: { tip: k.tip, ...(k.kisi ? { kisi: k.kisi } : {}) } };
  }
  if (m.kind === "husumet") { // F6a: çift hâlâ geçerli değilse ay kilitli kalmaz
    const h = m.hus;
    if (!h || typeof h.a !== "string" || typeof h.b !== "string" || h.a.length > 64 || h.b.length > 64) return undefined;
    const bk = s.player.husumet_bekle;
    return bk && [bk.a, bk.b].sort().join("|") === [h.a, h.b].sort().join("|") ? { ...base, hus: { a: h.a, b: h.b } } : { ...base, done: true };
  }
  if (m.kind === "mektep") {
    const id = m.mek?.id;
    if (typeof id !== "string" || id.length > 32) return undefined;
    return mektepSahneGecerli(s.player, id) ? { ...base, mek: { id } } : { ...base, done: true }; // koşul düştüyse ay kilitli kalmaz
  }
  if (m.kind === "firsat") {
    const o = m.opp;
    if (!o || ![o.id, o.key, o.title, o.desc].every(text) || !["strength", "intelligence", "charisma", "stamina"].includes(o.stat) || !Number.isFinite(o.reward) || o.reward < 0 || !Number.isFinite(o.risk) || o.risk < 0 || o.risk > 1 || m.stage !== undefined && !["intro", "play", "result"].includes(m.stage) || m.stage === "result" && typeof m.success !== "boolean") return undefined;
    return { ...base, opp: { id: o.id, key: o.key, title: o.title, desc: o.desc, reward: o.reward, risk: o.risk, stat: o.stat, ...(Number.isFinite(o.minAge) ? { minAge: o.minAge } : {}) }, stage: m.stage || "intro", ...(m.stage === "result" ? { success: m.success } : {}) };
  }
  return undefined;
}

// F3 mektep sahnesinin hâlâ geçerli olup olmadığı (motor ve kayıt onarımı aynı kuralı kullanır).
export const MEKTEP_KART_IDLERI = ["kopya", "kavga", "siir", "soru", "yaramazlik", "yardim", "hattat", "ezber", "bahce", "harita", "misafir"];
export function mektepSahneGecerli(p: Player, id: string): boolean {
  if (p.dead) return false;
  if (id === "usta") return p.profession === "işsiz" && !!p.usta_kapisi?.adaylar?.length && (p.usta_kapisi.ert || 0) < 2; // F4 usta kapısı
  if (id === "yol") return p.age === 12 && !p.egitim_yolu;
  if (id === "kilic") return p.age === 17 && (p.egitim_yolu ?? "cirak") === "cirak" && !p.icazet && !(p.fates || []).includes("kilic17");
  return MEKTEP_KART_IDLERI.includes(id) && p.age >= 7 && p.age <= 12 && !(p.mektep_gorulen || []).includes(id);
}
