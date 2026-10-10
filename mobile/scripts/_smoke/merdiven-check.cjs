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
const oyuncu = (prof, k, xp) => { const s = g.newGame("Sim", "Test", "erkek"); const p = s.player; p.age = 30; p.profession = prof; p.kademe = k; p.career_xp = xp; p.money = 5000; return s; };

// 1) Şifacı merdiveni: tam dört kademe, bu sırayla
const sif = g.professionById("şifacı");
if (JSON.stringify(sif.tiers) !== JSON.stringify(["Otacı", "Şifacı", "Kalfa", "Hekim"])) H("şifacı kademeleri: " + sif.tiers.join(" → "));

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

// 3) Eski kayıt (merdiven damgasız): rütbe korunur
const eski = (prof, k, xp) => { const s = oyuncu(prof, k, xp); delete s.merdiven; s.history.push({ day: 0, type: "pestamal", text: "", scope: "kişisel", landmark: true, k: "evj.pestamal", p: [{ c: [prof, k * 30] }] }); return JSON.parse(JSON.stringify(s)); };
const old = g.MERDIVEN_GOC[0];
for (const prof of Object.keys(old)) {
  const pr = g.professionById(prof); const h = old[prof];
  for (let k0 = 0; k0 < h.length; k0++) {
    const s = g.migrate(eski(prof, k0, k0 * 30 + 5)); const p = s.player; const k1 = h[k0];
    if (p.kademe !== k1) H(`göç ${prof} k${k0}: kademe ${p.kademe} ≠ ${k1}`);
    if (g.careerTitle(prof, g.kariyerXp(p)) !== pr.tiers[k1]) H(`göç ${prof} k${k0}: unvan ${g.careerTitle(prof, g.kariyerXp(p))}`);
    if (k0 === h.length - 1 && (!g.sinavDurumu(s).zirve || p.kademe !== pr.tiers.length - 1)) H(`göç ${prof}: eski zirve yeni zirvede değil`);
    if (k0 < h.length - 1 && p.career_xp !== k0 * 30 + 5) H(`göç ${prof} k${k0}: hizmet süresi değişti`);
    const c = s.history[s.history.length - 1].p[0].c; if (Math.floor(c[1] / 30) !== k1) H(`göç ${prof} k${k0}: kronik unvanı ${c[1]}`);
    if (g.migrate(JSON.parse(JSON.stringify(s))).player.kademe !== k1) H(`göç ${prof}: ikinci yükleme yeniden taşıdı`);
  }
  // ahilik öncesi kayıt (kademe yok): eski merdivenle okunur
  const s2 = eski(prof, 0, (h.length - 1) * 30 + 12); delete s2.player.kademe; const m2 = g.migrate(s2);
  if (m2.player.kademe !== h[h.length - 1]) H(`göç ${prof}: kademesiz eski zirve ${m2.player.kademe}`);
  // capstone korunur
  const s3 = eski(prof, h.length - 1, 200); s3.player.capstones = [prof]; const m3 = g.migrate(s3);
  if (JSON.stringify(m3.player.capstones) !== JSON.stringify([prof]) || m3.player.career_xp !== 200) H(`göç ${prof}: capstone/hizmet bozuldu`);
}
// 4) Yeni oyun güncel damgalı doğar: göç ona dokunmaz
{ const s = oyuncu("şifacı", 2, 65); const m = g.migrate(JSON.parse(JSON.stringify(s))); if (m.player.kademe !== 2 || m.merdiven !== g.MERDIVEN_SURUM) H("yeni kayıt göçe uğradı"); }

console.log(hata ? `MERDİVEN: ${hata} hata` : `MERDİVEN: TEMİZ · ${g.PROFESSIONS.length} meslek · şifacı ${sif.tiers.join(" → ")} · göç adımı ${g.MERDIVEN_SURUM}`);
process.exit(hata ? 1 : 0);
