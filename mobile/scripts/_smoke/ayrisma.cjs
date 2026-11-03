// Ayrışma ölçümü (radikal sonuçlar planı, docs/superpowers/specs/2026-11-03-radikal-sonuclar-design.md §3.4):
// aynı tohumla (Math.random + oyun tohumu) başlayan hayatları farklı seçim politikalarıyla oynatır; seçim hayatın
// şeklini (şehir, evlilik, kademe, zindan, hasım, mülk) ve göstergelerin doyma yaşını ne kadar değiştiriyor, ölçer.
// Kullanım: node scripts/_smoke/ayrisma.cjs [hayat=8] [politika,...=hep0,iyi,kotu,aktif] [yasSiniri=90]
// Politikalar: hep0, hep1, rastgele, iyi, kotu, acgoz, aktif, usta; sonuna "~" eklenirse kelebek tabanı (tek fazladan zar).
const path = require("path"), esbuild = require("esbuild");
const built = esbuild.buildSync({ stdin: { contents: 'export * from "./lib/game"; export * as ms from "./lib/month-scene";', resolveDir: path.resolve(__dirname, "../.."), loader: "ts" }, bundle: true, platform: "node", format: "cjs", write: false, logLevel: "error" });
const box = { exports: {} }; new Function("module", "exports", "require", built.outputFiles[0].text)(box, box.exports, require);
const g = box.exports; const { ms } = g;
const N = parseInt(process.argv[2] || "8", 10); const BAS = parseInt(process.env.BAS || "0", 10);
const POL = (process.argv[3] || "hep0,iyi,kotu,aktif").split(",");
const YAS_SINIR = parseInt(process.argv[4] || "90", 10);
function mulberry(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ORJ = Math.random;
const SIRALI = { money: 0.1, reputation: 1, honor: 1, fame: 1, health: 0.5 };
const ahlak = (d) => { d = d || {}; const n = d.nam || {}; return (d.honor || 0) + (d.reputation || 0) + (n.comert || 0) + (n.mert || 0) + (n.dindar || 0) - 1.5 * (n.zalim || 0) - (d.fear || 0) * 0.5; };
const kazanc = (d) => { d = d || {}; return (d.money || 0) + 5 * (d.stat_points || 0) + (d.fear || 0); };
// politika: (tur, n, ctx) → indeks
function politika(ad, rng) {
  return (tur, n, ctx) => {
    if (n <= 1) return 0;
    if (ad === "hep0" || ad === "pasif" || ad === "aktif" || ad === "usta") return 0;
    if (ad === "hep1") return Math.min(1, n - 1);
    if (ad === "son") return n - 1;
    if (ad === "rastgele") return Math.floor(rng() * n);
    if (ad === "iyi" || ad === "kotu") {
      if (tur === "dilemma") { const sc = ctx.map((c) => ahlak(c.gercek || c.delta)); let bi = 0; for (let i = 1; i < n; i++) if (ad === "iyi" ? sc[i] > sc[bi] : sc[i] < sc[bi]) bi = i; return bi; }
      return ad === "iyi" ? 0 : n - 1;
    }
    if (ad === "acgoz") { if (tur === "dilemma") { const sc = ctx.map((c) => kazanc(c.gercek || c.delta)); let bi = 0; for (let i = 1; i < n; i++) if (sc[i] > sc[bi]) bi = i; return bi; } return 0; }
    return 0;
  };
}
function servet(s) { const p = s.player; let v = (p.money || 0) + (p.deposit || 0) - (p.debt || 0); for (const pr of p.properties || []) v += (g.PROPERTY_TYPES[pr.type]?.cost || 0); return Math.round(v); }
function hayat(tohum, polAd, opts = {}) {
  const rng = mulberry(tohum * 7919 + 13); Math.random = rng; // oyunun bütün Math.random çağrıları tohumdan
  const prng = mulberry(tohum * 104729 + 7); // politikanın kendi zarı (oyun akışını bozmaz)
  const pick = politika(polAd, prng);
  let s = g.newGame("Ali", "Veli", tohum % 2 ? "erkek" : "kadın");
  const dogum = s.player.location_name;
  const iz = { evlendi: false, zindan: 0, kart: 0, secim: 0, sehirler: new Set([dogum]), maxHasim: 0, ilkMeslek: null, gocAy: 0 };
  if (opts.sarsinti) Math.random(); // kelebek: tek fazladan zar
  let guard = 0, takili = 0;
  const aktif = polAd === "aktif" || polAd === "usta"; const usta = polAd === "usta";
  while (!s.player.dead && s.player.age < YAS_SINIR && guard++ < 1400) {
    const p = s.player;
    if (aktif) {
      try {
        if (p.age < 13 && prng() < 0.6) { const r = g.childAction(s, ["oyun", "yardim", "kesif"][Math.floor(prng() * 3)]); if (r && r.state) s = r.state; }
        if (p.age >= 13 && p.age < 18 && prng() < 0.5) { const r = g.youthAction(s, ["usta", "akran", "huner"][Math.floor(prng() * 3)]); if (r && !r.blocked && r.state) s = r.state; }
        const st = { "demirci": "strength", "asker": "strength" }[s.player.profession] || "intelligence";
        while (s.player.stat_points > 0 && s.player.stats[st] < g.statCapOf(s.player)) { const s2 = g.allocateStat(s, st); if (s2.player.stat_points === s.player.stat_points) break; s = s2; }
        if (s.player.age >= 13 && prng() < 0.3) { const ns = g.npcsOf(s); if (ns.length) { const r = g.talkWith(s, ns[Math.floor(prng() * ns.length)], ["hosbes", "iltifat", "is"][Math.floor(prng() * 3)]); if (r && r.state) s = r.state; } }
        if (s.player.age >= 18 && s.player.age <= 40 && !s.player.married && !s.player.betrothed && prng() < 0.15) {
          const ns = g.npcsOf(s).filter((n) => n.gender !== s.player.gender).sort((a, b) => g.relWith(s, b.id) - g.relWith(s, a.id));
          if (ns.length) s = g.proposeMarriage(s, ns[0]);
        }
        if (s.player.age >= 20 && prng() < 0.1) for (const t of ["dukkan", "tarla", "ev"]) { const s2 = g.buyProperty(s, t); if (s2 !== s && s2.player.properties.length > s.player.properties.length) { s = s2; break; } }
        if (usta) { const d = g.sinavDurumu(s); if (d && d.hazir) { let bi = 0; for (let i = 1; i < 3; i++) if (d.oranlar[i] > d.oranlar[bi]) bi = i; s = g.ustalikSinavi(s, bi).state; } }
      } catch (e) { /* aktif eylem başarısızsa geç */ }
    }
    const t0 = s.turn;
    s = ms.advanceWithMonthScene(s, 1);
    // bekleyen her şeyi politika ile çöz
    for (let k = 0; k < 8; k++) {
      let dokundu = false;
      const m = ms.pendingMonthScene(s);
      if (m?.dilemma) { const i = pick("dilemma", m.dilemma.choices.length, m.dilemma.choices); s = ms.chooseMonthDilemma(s, m.id, i); iz.kart++; iz.secim += i; dokundu = true; }
      else if (m?.opp) { const i = pick("opp", 2); iz.kart++; if (i === 0) { s = ms.progressMonthOpportunity(s, m.id, "play"); s = ms.progressMonthOpportunity(s, m.id, "result", rng() < 0.55); s = ms.resolveMonthOpportunity(s, m.id); } else s = ms.resolveMonthOpportunity(s, m.id, true); dokundu = true; }
      if (s.npcTeklif && s.npcTeklif.turn === s.turn) { const i = pick("teklif", 2); const s2 = g.npcTeklifYanit(s, i === 0, i === 0 ? 0 : 1); if (s2 !== s) { s = s2; iz.kart++; dokundu = true; } }
      if (s.hesap) { const i = pick("hesap", 2); s = g.hesapKarari(s, i === 1); dokundu = true; }
      if (s.micro) { const i = pick("micro", 2); s = g.resolveMicro(s, i); dokundu = true; }
      if (s.saga?.scene) { const n = g.SAGA_CHOICES[s.saga.scene] || 2; try { s = g.resolveSaga(s, pick("saga", n)); } catch (e) { s = { ...s, saga: { ...s.saga, scene: undefined } }; } dokundu = true; }
      if (s.bloodline?.scene) { const n = g.BL_CHOICES[s.bloodline.scene] || 2; try { s = g.resolveBloodline(s, pick("bl", n)); } catch (e) { s = { ...s, bloodline: { ...s.bloodline, scene: undefined } }; } dokundu = true; }
      if (s.player.crowned && s.divan) { s = g.resolveDivan(s, pick("divan", 2)); dokundu = true; }
      if (s.player.tezgah) { const n = (s.player.tezgah.secenekler || s.player.tezgah.choices || [0, 1]).length || 2; s = g.resolveTezgah(s, pick("tezgah", n)); dokundu = true; }
      if (s.pendingScene?.kind === "crime") { s = g.resolveCrimeScene(s, ["saklan", "rusvet", "kac"][pick("crime", 3)]); dokundu = true; }
      else if (s.pendingScene?.kind === "trial") { s = g.resolveTrial(s, ["savun", "tanik", "uzlas", "boyun"][pick("trial", 4)]); dokundu = true; }
      if (!dokundu) break;
    }
    if (s.turn === t0) { takili++; if (takili > 3) { s = { ...s, micro: undefined, pendingScene: undefined, monthScene: undefined, divan: undefined, saga: s.saga ? { ...s.saga, scene: undefined } : s.saga }; s = g.advance(s, 1); takili = 0; } continue; }
    takili = 0;
    if (opts.iz) opts.iz(s);
    const q = s.player;
    if (q.married) iz.evlendi = true;
    if (q.jail && q.jail.left > 0 && !iz._icerde) { iz.zindan++; iz._icerde = true; } else if (!(q.jail && q.jail.left > 0)) iz._icerde = false;
    iz.sehirler.add(q.location_name);
    if (!iz.ilkMeslek && q.profession !== "işsiz") iz.ilkMeslek = q.profession;
    const has = Object.values(s.relationships || {}).filter((v) => v <= -55).length + (s.story?.nemesis ? 1 : 0);
    iz.maxHasim = Math.max(iz.maxHasim, has);
    iz.doy = iz.doy || {}; for (const [k, v] of [["itibar", q.reputation], ["seref", q.honor], ["sohret", q.fame]]) if (v >= 100 && iz.doy[k] == null) iz.doy[k] = q.age; iz.y55 = iz.y55 || {}; for (const [k, v] of [["itibar", q.reputation], ["seref", q.honor], ["sohret", q.fame]]) if (v >= 55 && iz.y55[k] == null) iz.y55[k] = q.age;
    if (q.age === 40 && iz.y40 == null) iz.y40 = { itibar: q.reputation, seref: q.honor, sohret: q.fame, servet: servet(s) };
  }
  const p = s.player; const pr = g.professionById(p.profession);
  let varis = 0; try { varis = g.varisAdayDetaylari(s).filter((x) => x.uygun).length; } catch (e) {}
  const out = {
    tohum, pol: polAd, olu: !!p.dead, yas: p.age, servet: servet(s), para: Math.round(p.money), itibar: p.reputation, seref: p.honor, sohret: p.fame, korku: p.fear,
    unvan: pr ? g.careerTier(pr, g.kariyerXp(p)) : 0, kademe: g.kademeOf(p), meslek: p.profession, evlendi: iz.evlendi, evlat: (p.children || []).length,
    yasayanEvlat: g.yasayanEvlatAdlari(s).length, sehir: p.location_name, dogum: s.player && iz.sehirler.size, zindan: iz.zindan, hasim: iz.maxHasim, varis, kart: iz.kart,
    mulk: (p.properties || []).length, nam: p.nam ? Object.entries(p.nam).filter(([, v]) => v >= 20).map(([k]) => k).join("+") : "", doy: iz.doy || {}, y55: iz.y55 || {}, y40: iz.y40, olumNedeni: (s.history.filter((e) => /^evj\.die/.test(e.k || "")).pop() || {}).k || "",
  };
  Math.random = ORJ;
  return out;
}
module.exports = { hayat };
if (require.main === module) {
  const t0 = Date.now(); const sonuc = [];
  for (let k = BAS; k < BAS + N; k++) for (const pol of POL) { const sar = pol.endsWith("~"); const r = hayat(1000 + k, sar ? pol.slice(0, -1) : pol, { sarsinti: sar }); r.pol = pol; sonuc.push(r); console.log(JSON.stringify(r)); }
  console.error("süre", ((Date.now() - t0) / 1000).toFixed(1), "sn");
  // Özet: politika başına medyanlar (doyum yaşı: 100'e / 55'e ilk varış; ulaşamayan "-")
  const med = (a) => { const v = a.filter((x) => x != null && Number.isFinite(x)).sort((x, y) => x - y); return v.length ? v[v.length >> 1] : null; };
  const f = (x) => (x == null ? "-" : Math.round(x));
  console.log("\nÖZET (medyan) politika | ölüm | servet | itibar | şeref | şöhret | itibar100 | şöhret100 | itibar55 | şöhret55 | 40y itibar | mülk | evli% | evli%(itibar<0) | zindan | hasım");
  const ozet = {};
  for (const pol of POL) {
    const r = sonuc.filter((x) => x.pol === pol); const eks = r.filter((x) => x.itibar < 0);
    ozet[pol] = { servet: med(r.map((x) => x.servet)) };
    console.log([pol, f(med(r.map((x) => x.yas))), f(med(r.map((x) => x.servet))), f(med(r.map((x) => x.itibar))), f(med(r.map((x) => x.seref))), f(med(r.map((x) => x.sohret))),
      f(med(r.map((x) => x.doy.itibar))), f(med(r.map((x) => x.doy.sohret))), f(med(r.map((x) => x.y55.itibar))), f(med(r.map((x) => x.y55.sohret))), f(med(r.map((x) => x.y40 && x.y40.itibar))),
      f(med(r.map((x) => x.mulk))), Math.round(100 * r.filter((x) => x.evlendi).length / Math.max(1, r.length)), eks.length ? Math.round(100 * eks.filter((x) => x.evlendi).length / eks.length) : "-",
      r.reduce((a, x) => a + x.zindan, 0), r.reduce((a, x) => a + x.hasim, 0)].join(" | "));
  }
  if (ozet.aktif && ozet.hep0 && ozet.hep0.servet) console.log("etkin/pasif servet oranı:", (ozet.aktif.servet / ozet.hep0.servet).toFixed(1) + "×");
}
