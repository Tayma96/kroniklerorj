// Yankı denetimi (sonuç motoru): seçimlerin gerçekten farklı sonuç doğurduğunu ve birbirine bağlandığını kanıtlar.
//  1) Statik: her ikilem/orta yaş sorusu/yay sahnesinde seçenekler en az iki farklı eğilim (iz etiketi) ya da farklı dal doğuruyor mu?
//  2) İkiz hayatlar: aynı tohumdan (aynı zar dizisi) başlayan iki hayat; biri her kararda ilk, öbürü son seçeneği seçer.
//     Ölçü: sonuç satırlarının (yankı/ip/tohum anahtarları) Jaccard uzaklığı ve yankı eğilim dağılımı. Kontrol: aynı politika → uzaklık 0.
//  3) Hafıza: yankı satırı sebebini (kartın başlığını ya da kişiyi) taşıyor mu; ata izi vârise geçiyor mu.
// Kullanım: node scripts/_smoke/yanki-check.cjs [YNK_N=12]  → "YANKI: TEMİZ" ya da ihlal listesi (exit 1)
const ESBUILD = require("./esbuild-yolu.cjs");
const { execSync } = require("child_process");
const os = require("os"); const fs = require("fs"); const path = require("path");
const mobile = path.join(__dirname, "..", "..");
const giris = path.join(os.tmpdir(), `kronikler-ynk-giris-${process.pid}.ts`);
const paket = path.join(os.tmpdir(), `kronikler-ynk-${process.pid}.cjs`);
fs.writeFileSync(giris, `export * from ${JSON.stringify(path.join(mobile, "lib/game"))};\nexport { ayinSahnesi, DILEMMAS, ORTA_YAS, SON_YAS } from ${JSON.stringify(path.join(mobile, "lib/events"))};\nexport { ARCS, availableArcs, arcById } from ${JSON.stringify(path.join(mobile, "lib/arcs"))};\n`);
execSync(`${ESBUILD} ${giris} --bundle --platform=node --format=cjs --outfile=${paket} --log-level=error`, { cwd: mobile, stdio: "inherit" });
const g = require(paket); fs.unlinkSync(giris); fs.unlinkSync(paket);
const hata = [];

// 1) Statik ayrışma
let kart = 0, ayrisan = 0; const tekYon = [];
for (const d of [...g.DILEMMAS, ...g.ORTA_YAS, ...g.SON_YAS]) { kart++; const et = new Set(d.choices.map((c) => g.deltaEtiketi(c.gercek || c.delta, !!c.risk))); if (et.size > 1) ayrisan++; else tekYon.push(d.id); }
let sahne = 0, sahneAyrisan = 0;
for (const a of g.ARCS) for (const st of Object.values(a.stages)) { sahne++; const et = new Set(st.choices.map((c) => g.deltaEtiketi(c.delta))); const dal = new Set(st.choices.map((c) => c.next)); if (et.size > 1 || dal.size > 1) sahneAyrisan++; }
const statikYuzde = Math.round((ayrisan / kart) * 1000) / 10, sahneYuzde = Math.round((sahneAyrisan / sahne) * 1000) / 10;
console.log(`Statik: ${kart} kartın %${statikYuzde}'inde seçenekler farklı eğilim doğuruyor · ${sahne} yay sahnesinin %${sahneYuzde}'inde farklı eğilim ya da dal`);
if (tekYon.length) console.log(`  tek yönlü kartlar: ${tekYon.slice(0, 12).join(", ")}${tekYon.length > 12 ? " …" : ""}`);
if (statikYuzde < 80) hata.push(`statik ayrışma %${statikYuzde} < 80`);

// 2) İkiz hayatlar (tohumlu zar)
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const asilRandom = Math.random;
function hayat(tohum, pol) {
  Math.random = mulberry(tohum);
  const sec = (n) => (pol === "ilk" ? 0 : n - 1);
  let s = g.newGame("İkiz", "Deneme", tohum % 2 ? "erkek" : "kadın"); let guard = 0; let ayBasi = s.hseq || 0;
  try {
    while (!s.player.dead && s.player.age < 60 && guard++ < 800) {
      if (s.player.hunger < 35) s = g.eat(s);
      if (s.player.age >= 13 && s.player.profession !== "işsiz" && s.player.hunger >= 30) s = g.work(s);
      if (s.player.age >= 16 && !s.story.active && guard % 40 === 0) { const av = g.availableArcs(s.player, s.story.completed, s.story.tension, null); if (av.length) s = g.beginArc(s, av[0].id); }
      else if (s.story.active) { const a = g.arcById(s.story.active.id); const st = a && a.stages[s.story.active.stage]; s = g.advanceArc(s, st ? sec(st.choices.length) : 0); }
      ayBasi = s.hseq || 0; s = g.advance(s, 1);
      const r = g.ayinSahnesi(s, ayBasi); s = r.s;
      if (r.dilemma) { const d = r.dilemma; const i = sec(d.choices.length); s = g.applyDilemma(s, d.choices[i].gercek || d.choices[i].delta, d.choices[i].result, d.id + ":" + i, r.tur === "senlik"); }
      else if (r.opp) s = g.resolveOpportunity(s, r.opp, pol === "ilk");
      if (s.npcTeklif && s.npcTeklif.turn === s.turn) s = g.npcTeklifYanit(s, pol === "ilk", 0);
      if (s.hesap) s = g.hesapKarari(s, false);
      if (s.micro) s = g.resolveMicro(s, sec(2));
      if (s.saga && s.saga.scene) { try { s = g.resolveSaga(s, 0); } catch (e) {} }
      if (s.bloodline && s.bloodline.scene) { try { s = g.resolveBloodline(s, 0); } catch (e) {} }
      if (s.player.crowned && s.divan) s = g.resolveDivan(s, sec(2));
    }
  } finally { Math.random = asilRandom; }
  return s;
}
const sonucAnahtarlari = (s) => s.history.filter((e) => /^(yanki|ip|seed)\./.test(e.k || "")).map((e) => e.k + "|" + JSON.stringify(e.p || []));
const jaccard = (a, b) => { const A = new Set(a), B = new Set(b); const u = new Set([...A, ...B]); if (!u.size) return 0; let k = 0; for (const x of A) if (B.has(x)) k++; return 1 - k / u.size; };
const egilim = (s) => { const o = {}; for (const x of s.hafiza || []) if (!x.ata) o[x.et] = (o[x.et] || 0) + 1; return o; };
const N = parseInt(process.env.YNK_N || "12", 10);
let fisSay = 0, fisOdenen = 0; let uzakTop = 0, kontrolTop = 0, yankiA = 0, yankiB = 0, sebepsiz = 0, ornek = null;
for (let i = 0; i < N; i++) {
  const tohum = 1000 + i * 7919;
  const A = hayat(tohum, "ilk"), A2 = hayat(tohum, "ilk"), B = hayat(tohum, "son");
  const kA = sonucAnahtarlari(A), kB = sonucAnahtarlari(B);
  uzakTop += jaccard(kA, kB); kontrolTop += jaccard(kA, sonucAnahtarlari(A2));
  for (const s of [A, B]) for (const e of s.history) if (e.type === "yanki" && !(e.p && e.p.length && e.p.every((x) => x !== "" && x != null))) sebepsiz++;
  for (const s of [A, B]) for (const e of s.history) if (/^fis\.yanki\./.test(e.k || "")) { // fısıltı → yankı: haber verilen karar en geç 3 ayda döner
    const sfx = JSON.stringify(e.p[e.p.length - 1]); fisSay++;
    if (s.history.some((y) => y.type === "yanki" && y.day >= e.day && y.day <= e.day + 3 && (y.p || []).some((x) => JSON.stringify(x) === sfx))) fisOdenen++;
    else if (e.day >= s.turn - 3) fisSay--; // simülasyon bitti, vade dolmadı
  }
  yankiA += A.history.filter((e) => e.type === "yanki").length; yankiB += B.history.filter((e) => e.type === "yanki").length;
  if (!ornek) ornek = { A: egilim(A), B: egilim(B), ilkA: A.history.filter((e) => e.type === "yanki").slice(0, 3).map((e) => e.k), ilkB: B.history.filter((e) => e.type === "yanki").slice(0, 3).map((e) => e.k) };
}
const uzak = Math.round((uzakTop / N) * 1000) / 10, kontrol = Math.round((kontrolTop / N) * 1000) / 10;
console.log(`İkiz hayatlar (${N} çift, aynı tohum): sonuç satırlarının ayrışması %${uzak} · kontrol (aynı politika) %${kontrol} · yankı satırı ilk-seçen ${yankiA}, son-seçen ${yankiB}`);
console.log(`  örnek eğilim — ilk-seçen ${JSON.stringify(ornek.A)} · son-seçen ${JSON.stringify(ornek.B)}`);
console.log(`  örnek ilk yankılar — ilk-seçen ${ornek.ilkA.join(", ")} · son-seçen ${ornek.ilkB.join(", ")}`);
if (kontrol !== 0) hata.push(`kontrol ayrışması %${kontrol} (aynı tohum + aynı seçim aynı hayatı vermeli)`);
if (uzak < 50) hata.push(`ikiz ayrışması %${uzak} < 50`);
if (sebepsiz) hata.push(`${sebepsiz} yankı satırı sebebini (kart/kişi) taşımıyor`);
console.log(`Fısıltı → yankı: ${fisSay} fısıltı eski bir kararı haber verdi · 3 ayda dönen %${fisSay ? Math.round((fisOdenen / fisSay) * 1000) / 10 : 0}`);
if (!fisSay) hata.push("hiçbir fısıltı Yankı'ya bağlanmadı");
else if (fisOdenen / fisSay < 0.9) hata.push(`fısıltının haber verdiği kararların yalnızca %${Math.round((fisOdenen / fisSay) * 100)}'i döndü (< 90)`);

// 3) Ata izi vârise geçer
{ const s0 = hayat(4242, "ilk"); const st = { ...s0, hafiza: (s0.hafiza || []).map((x) => ({ ...x, ref: 2 })) };
  const ata = g.ataIzleri(st); console.log(`Ata izi: ${ata.length} iz vârise geçiyor (${ata.map((x) => x.et).join(", ")})`); if (!ata.length && (s0.hafiza || []).length) hata.push("ata izi geçmiyor"); }

if (hata.length) { console.log("YANKI: " + hata.length + " ihlal\n  " + hata.join("\n  ")); process.exit(1); }
console.log("YANKI: TEMİZ");
