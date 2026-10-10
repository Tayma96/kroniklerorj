// Meslek merdiveni bekçisi (ahilik): her kademe 30 ay hizmet + peştamal sınavı; para kademe atlatmaz; kalan 6 ay sonra
// yeniden çağrılır; zirve bonusu (şöhret +6, şeref +4, 60×enflasyon akçe) yalnız son kademeye İLK varışta ve meslek
// başına bir kez düşer. Eski kayıtlar migrate()'te rütbelerini korur (zirve zirvede kalır, kimse sınavsız atlamaz).
// Kullanım: node scripts/_smoke/merdiven-check.cjs
const ESBUILD = require("./esbuild-yolu.cjs");
const path = require("path"); const fs = require("fs"); const os = require("os"); const { execSync } = require("child_process");
const kok = path.join(__dirname, "..", ".."); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "merdiven-"));
execSync(`${ESBUILD} lib/game.ts --bundle --format=cjs --platform=node --outfile="${tmp}/g.cjs" --log-level=error`, { cwd: kok, stdio: "inherit" });
const g = require(`${tmp}/g.cjs`);
let hata = 0; const H = (m) => { hata++; console.log("  HATA: " + m); };
const oyuncu = (prof, k, xp) => { const s = g.newGame("Sim", "Test", "erkek"); const p = s.player; p.age = 30; p.base_age = 30; p.profession = prof; p.kademe = k; p.career_xp = xp; p.money = 5000; return s; };

// 1) Şifacı merdiveni: tam dört kademe, bu sırayla
const sif = g.professionById("şifacı");
if (JSON.stringify(sif.tiers) !== JSON.stringify(["Otacı", "Şifacı", "Kalfa", "Hekim"])) H("şifacı kademeleri: " + sif.tiers.join(" → "));
for (const pr of g.PROFESSIONS) if (pr.tiers.length !== 4 || new Set(pr.tiers).size !== 4) H(`${pr.id}: dört ayrı kademe değil (${pr.tiers.join(" → ")})`);

// 2) Her meslek: her kademe 30 ay hizmet; sınav kazanılınca bir kademe; kalınca 6 ay bekleme; zirve bonusu yalnız zirvede ve bir kez
const R0 = Math.random;
for (const pr of g.PROFESSIONS) {
  if (!g.SINAV_YOLLARI[pr.id]) { H(pr.id + ": sınav yolu yok"); continue; }
  let s = oyuncu(pr.id, 0, 0);
  for (let k = 0; k < pr.tiers.length - 1; k++) {
    const d0 = g.sinavDurumu(s);
    if (d0.hizmetAy !== (k + 1) * 30 - s.player.career_xp) H(`${pr.id} k${k}: hizmetAy ${d0.hizmetAy}`);
    if (s.player.career_xp === k * 30 && d0.hizmetAy !== 30) H(`${pr.id} k${k}: kademe başına 30 ay değil (${d0.hizmetAy})`);
    s.player.career_xp = (k + 1) * 30 - 1; if (g.sinavDurumu(s).hazir) H(`${pr.id} k${k}: hizmet dolmadan sınav açıldı`);
    s.player.money = 1e6; if (g.ustalikSinavi(s, 0).basari !== null) H(`${pr.id} k${k}: para hizmetsiz sınav açtı`);
    s.player.career_xp = (k + 1) * 30;
    // önce bir kez kal: 6 ay bekleme
    Math.random = () => 0.999; let r = g.ustalikSinavi(s, 0); Math.random = R0;
    if (r.basari !== false || r.state.player.sinav_bekle !== r.state.turn + g.SINAV_BEKLEME || g.SINAV_BEKLEME !== 6) H(`${pr.id} k${k}: kalma/6 ay bekleme bozuk`);
    s = r.state; s.player.sinav_bekle = undefined; s.player.sinav_turn = undefined;
    const f0 = s.player.fame, h0 = s.player.honor, m0 = s.player.money;
    Math.random = () => 0; r = g.ustalikSinavi(s, 0); Math.random = R0;
    if (r.basari !== true || r.state.player.kademe !== k + 1) { H(`${pr.id} k${k}: sınav geçilmedi/kademe ${r.state.player.kademe}`); break; }
    s = r.state; s.player.sinav_turn = undefined;
    const zirve = k + 1 === pr.tiers.length - 1;
    const bonus = s.player.fame - f0 === 6 && s.player.honor - h0 === 4 && s.player.money - m0 === Math.round(60 * (s.world.inflation || 1)) && (s.player.capstones || []).includes(pr.id);
    if (zirve && !bonus) H(`${pr.id}: zirve (${pr.tiers[k + 1]}) bonusu düşmedi (şöhret ${s.player.fame - f0}, şeref ${s.player.honor - h0}, akçe ${s.player.money - m0})`);
    if (!zirve && (s.player.capstones || []).includes(pr.id)) H(`${pr.id}: bonus zirveden önce (${pr.tiers[k + 1]}) düştü`);
    if (g.careerTitle(pr.id, g.kariyerXp(s.player)) !== pr.tiers[k + 1]) H(`${pr.id}: unvan ${g.careerTitle(pr.id, g.kariyerXp(s.player))} ≠ ${pr.tiers[k + 1]}`);
  }
  const d = g.sinavDurumu(s); if (!d.zirve || d.hazir) H(`${pr.id}: zirvede sınav kapanmadı`);
}

// 3) Eski kayıt: her göç sürümünden (0 = damgasız) yüklenen oyuncu rütbesini korur — zirve zirvede kalır, kimse sınavsız atlamaz
const eski = (prof, k, xp, v) => { const s = oyuncu(prof, k, xp); if (v) s.merdiven = v; else delete s.merdiven; s.history.push({ day: 0, type: "pestamal", text: "", scope: "kişisel", landmark: true, k: "evj.pestamal", p: [{ c: [prof, k * 30] }] }); return JSON.parse(JSON.stringify(s)); };
let gocSayisi = 0;
for (let v = 0; v < g.MERDIVEN_SURUM; v++) for (const pr of g.PROFESSIONS) {
  const prof = pr.id;
  // bu sürümdeki eski merdiven uzunluğu ve sonraki adımların bileşik eşlemesi
  let h = null; for (let w = v; w < g.MERDIVEN_SURUM; w++) { const m = g.MERDIVEN_GOC[w][prof]; if (m) h = h ? h.map((i) => m[Math.min(m.length - 1, i)]) : m.slice(); }
  if (!h) continue; gocSayisi++;
  for (let k0 = 0; k0 < h.length; k0++) {
    const s = g.migrate(eski(prof, k0, k0 * 30 + 5, v)); const p = s.player; const k1 = h[k0];
    if (p.kademe !== k1) H(`göç v${v} ${prof} k${k0}: kademe ${p.kademe} ≠ ${k1}`);
    if (k1 > k0 + 0 && k0 < h.length - 1) H(`göç v${v} ${prof} k${k0}: zirve dışı kademe atladı`);
    if (g.careerTitle(prof, g.kariyerXp(p)) !== pr.tiers[k1]) H(`göç v${v} ${prof} k${k0}: unvan ${g.careerTitle(prof, g.kariyerXp(p))}`);
    if (k0 === h.length - 1 && (!g.sinavDurumu(s).zirve || p.kademe !== pr.tiers.length - 1)) H(`göç v${v} ${prof}: eski zirve yeni zirvede değil`);
    if (k0 < h.length - 1 && p.career_xp !== k0 * 30 + 5) H(`göç v${v} ${prof} k${k0}: hizmet süresi değişti`);
    if (k0 === h.length - 1 && g.sinavDurumu(s).hazir) H(`göç v${v} ${prof}: zirvede sahte sınav`);
    const c = s.history[s.history.length - 1].p[0].c; if (Math.min(pr.tiers.length - 1, Math.floor(c[1] / 30)) !== k1) H(`göç v${v} ${prof} k${k0}: kronik unvanı ${c[1]}`);
    if (g.migrate(JSON.parse(JSON.stringify(s))).player.kademe !== k1) H(`göç v${v} ${prof}: ikinci yükleme yeniden taşıdı`);
  }
  if (v === 0) { // ahilik öncesi kayıt (kademe yok): eski merdivenle okunur
    const s2 = eski(prof, 0, (h.length - 1) * 30 + 12, 0); delete s2.player.kademe; const m2 = g.migrate(s2);
    if (m2.player.kademe !== h[h.length - 1]) H(`göç ${prof}: kademesiz eski zirve ${m2.player.kademe}`);
  }
  const s3 = eski(prof, h.length - 1, 200, v); s3.player.capstones = [prof]; const m3 = g.migrate(s3);
  if (JSON.stringify(m3.player.capstones) !== JSON.stringify([prof]) || m3.player.career_xp !== 200) H(`göç v${v} ${prof}: capstone/hizmet bozuldu`);
}
// 3b) Unvan çevirileri: her dilde kademe sayısı motorla aynı; kadın biçimleri (es/pt/ar) eksiksiz
{ const L = require("child_process"); L.execSync(`${ESBUILD} lib/locale-data.ts --bundle --format=cjs --platform=node --outfile="${tmp}/l.cjs" --log-level=error`, { cwd: kok, stdio: "inherit" });
  const ld = require(`${tmp}/l.cjs`);
  for (const lang of ["tr", "en", "es", "pt", "ar", "ru"]) for (const pr of g.PROFESSIONS) {
    const t = ld.PROF_L10N[lang][pr.id]; if (!t || t.tiers.length !== pr.tiers.length) { H(`${lang} ${pr.id}: ${t ? t.tiers.length : 0} kademe ≠ ${pr.tiers.length}`); continue; }
    if (lang === "tr" && JSON.stringify(t.tiers) !== JSON.stringify(pr.tiers)) H(`tr ${pr.id}: çeviri tablosu motorla aynı değil`);
    if (new Set(t.tiers).size !== t.tiers.length) H(`${lang} ${pr.id}: aynı adlı iki kademe`);
    for (let k = 0; k < pr.tiers.length; k++) { const e = ld.careerTitleL(pr.id, k * 30, lang, false), f = ld.careerTitleL(pr.id, k * 30, lang, true); if (!e || !f) H(`${lang} ${pr.id} k${k}: boş unvan`); }
  }
}
// 3c) Ekran metinleri: merdiven ipucu altı dilde "30 ay"ı söyler; mersiyedeki "… olarak anıldı" kadın için dişil (es/pt/ar/ru)
{ const giris = path.join(kok, "_merdiven_i18n.ts"); fs.writeFileSync(giris, 'export { tFor } from "./lib/i18n";\n');
  try { execSync(`${ESBUILD} "${giris}" --bundle --format=cjs --platform=node --outfile="${tmp}/i.cjs" --log-level=error`, { cwd: kok, stdio: "inherit" }); } finally { fs.unlinkSync(giris); }
  const { tFor } = require(`${tmp}/i.cjs`);
  for (const L of ["tr", "en", "es", "pt", "ar", "ru"]) { const v = tFor(L, "ahi.ladder"); if (v === "ahi.ladder" || (!/30/.test(v) && !/ثلاثين/.test(v))) H(`${L} ahi.ladder: ${v}`); }
  for (const L of ["es", "pt", "ar", "ru"]) { const f = tFor(L, "rom.t.recalled.f"); if (f === "rom.t.recalled.f" || f === tFor(L, "rom.t.recalled") || !f.includes("%s")) H(`${L} rom.t.recalled.f eksik`); }
  if (/\ba %s/.test(tFor("en", "rom.t.recalled"))) H("en rom.t.recalled: 'a %s' (an Innkeeper/an Apprentice bozulur)");
}
// 3d) Kalınca söz tutulur: bekleyiş boyunca çağrı yok, bekleyiş dolunca work() bir kez "yeniden çağrı" düşürür (dönüm penceresi açmaz)
{ let s = oyuncu("çiftçi", 0, 30); s.player.hunger = 100;
  Math.random = () => 0.999; s = g.ustalikSinavi(s, 0).state; Math.random = R0;
  const say = (st, k) => st.history.filter((e) => e.k === k).length;
  for (let ay = 0; ay < g.SINAV_BEKLEME + 2; ay++) {
    const once = say(s, "evj.sinav.yeniden"); s.player.hunger = 100; s.player.health = 100; s = g.work(s);
    const bekle = Math.max(0, (s.player.sinav_bekle ?? 0) - s.turn);
    if (say(s, "evj.sinav.yeniden") > once && bekle > 0) H("bekleyiş sürerken yeniden çağrı düştü");
    if (say(s, "evj.sinav.cagri") > 0) H("kalandan sonra ilk-çağrı metni tekrarlandı");
    s = g.advance(s);
  }
  const yc = s.history.filter((e) => e.k === "evj.sinav.yeniden");
  if (yc.length !== 1) H(`yeniden çağrı ${yc.length} kez düştü (1 beklenirdi)`); else if (yc[0].landmark) H("yeniden çağrı dönüm penceresi açıyor");
}
// 3e) Unvan çarpanı: aynı zar ve özellikle zirvenin kazancı üçüncü kademeden %10–17 fazla (ılımlı zirve basamağı)
{ const kazanc = (k) => { const s = oyuncu("demirci", k, k * 30 + 5); s.player.hunger = 100; s.player.stats = { strength: 8, intelligence: 8, charisma: 8, stamina: 8 }; const m0 = s.player.money; Math.random = () => 0.5; const r = g.work(s); Math.random = R0; return r.player.money - m0; };
  const k2 = kazanc(2), k3 = kazanc(3), k1 = kazanc(1);
  if (!(k1 < k2 && k3 / k2 >= 1.1 && k3 / k2 <= 1.17)) H(`unvan çarpanı: 2. kademe ${k1}, 3. kademe ${k2}, zirve ${k3} (zirve/3. = ${(k3 / k2).toFixed(2)})`); }
// 4) Yeni oyun güncel damgalı doğar: göç ona dokunmaz
{ const s = oyuncu("şifacı", 2, 65); const m = g.migrate(JSON.parse(JSON.stringify(s))); if (m.player.kademe !== 2 || m.merdiven !== g.MERDIVEN_SURUM) H("yeni kayıt göçe uğradı"); }

console.log(hata ? `MERDİVEN: ${hata} hata` : `MERDİVEN: TEMİZ · ${g.PROFESSIONS.length} meslek · şifacı ${sif.tiers.join(" → ")} · göç adımı ${g.MERDIVEN_SURUM} (${gocSayisi} meslek×sürüm denendi)`);
process.exit(hata ? 1 : 0);
