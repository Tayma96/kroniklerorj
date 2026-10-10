// Ekonomi denetimi: "pasif" oyuncunun (yalnız karnını doyurur ve meslek varsa çalışır; mülk, ticaret, kart
// kararı, suç yok — scripts/balance-sim.ts'deki "makul oyuncu" politikası) 20/40/60 yaşındaki kesesini ve paranın
// nereden geldiğini (çalışma / ay kapanışı: miras, olay, harçlık / yemek gideri) ölçer.
// Ayrıca kart kararlarını da veren "etkin" oyuncuyu (oynanis.cjs ile aynı zar) ve bunun üstüne lonca sınavlarına
// giren "usta" oyuncuyu karşılaştırma için koşar (etkin oyun pasiften belirgin biçimde iyi kalmalı).
// Ömür sonunda hak edilen hüner kademesi ve 13–20 yaşta kesesi dibe vuranların oranı da yazılır.
// Kullanım: node scripts/_smoke/ekonomi.cjs [hayat=200]
//   EKO_JSON=1 → tek satır JSON · EKO_TURLER=pasif,etkin,usta · EKO_GIRIS=<başka game.ts> (deneme kopyası)
const ESBUILD = require("./esbuild-yolu.cjs");
const { execSync } = require("child_process");
const os = require("os");
const fs = require("fs");
const path = require("path");
const mobile = path.join(__dirname, "..", "..");
const paket = path.join(os.tmpdir(), `kronikler-eko-${process.pid}.cjs`);
execSync(`${ESBUILD} ${process.env.EKO_GIRIS || "lib/game.ts"} --bundle --platform=node --format=cjs --outfile=${paket} --log-level=error`, { cwd: mobile, stdio: "inherit" });
const g = require(paket);
const LIVES = parseInt(process.argv[2] || "200", 10);
const R = (a) => a[Math.floor(Math.random() * a.length)];
const servet = (p) => p.money + (p.deposit || 0);

function hayat(tur) {
  const etkin = tur !== "pasif", usta = tur === "usta";
  let s = g.newGame("Sim", "Test", Math.random() < 0.5 ? "erkek" : "kadın");
  const m = {}; const kay = { calisma: 0, yemek: 0, ay: 0, kart: 0 };
  let guard = 0; let gencBos = false; // 13–20 yaş arasında kese hiç dibe vurdu mu (erken oyun geçimi)
  while (!s.player.dead && s.player.age < 85 && guard++ < 1100) {
    const p = s.player;
    let a = p.money;
    if (p.hunger < 35) { s = g.eat(s); kay.yemek += s.player.money - a; }
    a = s.player.money;
    if (p.age >= 13 && p.profession !== "işsiz" && s.player.hunger >= 30) { s = g.work(s); kay.calisma += s.player.money - a; }
    if (usta) { a = servet(s.player); try { const d = g.sinavDurumu(s); if (d && d.hazir) s = g.ustalikSinavi(s, 1).state; } catch (e) {} kay.kart += servet(s.player) - a; }
    a = servet(s.player);
    s = g.advance(s, 1);
    kay.ay += servet(s.player) - a;
    if (etkin && !s.player.dead) {
      a = servet(s.player);
      try {
        const kararVar = !!s.hesap || (s.npcTeklif && s.npcTeklif.turn === s.turn);
        if (!kararVar && !(s.player.jail && s.player.jail.left > 0)) {
          const r = Math.random();
          if (r < 0.28) { const d = g.pickDilemma(s); if (d) { const i = Math.floor(Math.random() * d.choices.length); s = g.applyDilemma(s, d.choices[i].gercek || d.choices[i].delta, d.choices[i].result, d.id + ":" + i); } }
          else if (r < 0.5) { const l = g.opportunitiesFor(s); if (l.length) s = g.resolveOpportunity(s, R(l), Math.random() < 0.5); }
          else if (r < 0.75) s = g.kapiyaGelen(s);
        }
        if (s.npcTeklif && s.npcTeklif.turn === s.turn) s = g.npcTeklifYanit(s, Math.random() < 0.75, Math.random() < 0.5 ? 0 : 1);
        if (s.hesap) s = g.hesapKarari(s, Math.random() < 0.3);
        if (s.micro) s = g.resolveMicro(s, Math.random() < 0.5 ? 0 : 1);
      } catch (e) {}
      kay.kart += servet(s.player) - a;
    }
    const age = s.player.age;
    if (age >= 13 && age <= 20 && s.player.money < 5) gencBos = true;
    for (const y of [20, 40, 60]) if (age === y && m[y] == null) m[y] = { servet: servet(s.player), ...kay, enf: g.inflationFactor(s) };
  }
  // Ömür sonunda hak edilen hüner kademesi (seçilmiş + seçilmeyi bekleyen; hedef ~6–9) ve ölüm yaşı
  m.son = { hak: s.player.perks.length + g.pendingPerkCount(s.player), yas: s.player.age, gencBos };
  return m;
}
const med = (a) => { const b = a.filter((x) => x != null).sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : null; };
const ort = (a) => { const b = a.filter((x) => x != null); return b.length ? Math.round(b.reduce((x, y) => x + y, 0) / b.length) : null; };
const sonuc = {};
for (const tur of (process.env.EKO_TURLER || "pasif,etkin,usta").split(",")) {
  const H = []; for (let i = 0; i < LIVES; i++) H.push(hayat(tur));
  const o = {};
  for (const y of [20, 40, 60]) {
    const L = H.map((h) => h[y]).filter(Boolean);
    o[y] = { n: L.length, servetMedyan: med(L.map((x) => x.servet)), servetOrt: ort(L.map((x) => x.servet)),
      calisma: ort(L.map((x) => x.calisma)), ay: ort(L.map((x) => x.ay)), yemek: ort(L.map((x) => x.yemek)), kart: ort(L.map((x) => x.kart)),
      enflasyon: Math.round(ort(L.map((x) => x.enf * 1000)) ) / 1000 };
  }
  o.son = { hunerMedyan: med(H.map((h) => h.son.hak)), olumYasi: med(H.map((h) => h.son.yas)), gencBos: Math.round(100 * H.filter((h) => h.son.gencBos).length / H.length) };
  sonuc[tur] = o;
}
try { fs.unlinkSync(paket); } catch {}
if (process.env.EKO_JSON) { console.log(JSON.stringify(sonuc)); process.exit(0); }
console.log(`EKONOMİ DENETİMİ · ${LIVES} hayat/tür`);
for (const tur of Object.keys(sonuc)) for (const y of [20, 40, 60, "son"]) {
  if (y === "son") { const z = sonuc[tur].son; console.log(`  ${tur.padEnd(5)} ömür: hüner kademesi medyan ${z.hunerMedyan} · ölüm yaşı medyan ${z.olumYasi} · 13–20 yaşta kesesi dibe vuran %${z.gencBos}`); continue; }
  const x = sonuc[tur][y];
  console.log(`  ${tur.padEnd(5)} ${y} yaş (n=${x.n}): kese+emanet medyan ${x.servetMedyan} · ort ${x.servetOrt} | birikmiş: çalışma ${x.calisma} · ay kapanışı ${x.ay} · yemek ${x.yemek}${tur !== "pasif" ? " · kart/kapı/sınav " + x.kart : ""} · enflasyon ×${x.enflasyon}`);
}
