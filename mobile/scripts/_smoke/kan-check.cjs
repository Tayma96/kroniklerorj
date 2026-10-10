// Kan Hafızası denetimi: kin tutan ve hatır borçlu insanlar gerçekten geri dönüyor mu, kuşaktan kuşağa geçiyor mu,
// ve hiçbir hayat haksız bir çöküş sarmalına girmiyor mu?
//  1) Dönüş: en az 5 yıl yaşamış (kişi hayatta, oyuncu ≥14) hatır kayıtlarının ≥%70'i en az bir kez geri döner.
//  2) Miras: vâris atanın açık hesaplarını "ata" imiyle devralır; NPC ölünce kin/minnet yetişkin evladına geçer (devir satırı).
//  3) Adalet: kin yoksul/aç/hasta oyuncuya vurmaz (0 ihlal); kinin toplam zararı hayat boyu çalışma gelirinin ≤ %3'ü;
//     tek dönüşte kayıp kesenin %5'ini aşmaz.
// Kullanım: node scripts/_smoke/kan-check.cjs [KAN_N=24] → "KAN: TEMİZ" ya da ihlal listesi (exit 1)
const ESBUILD = require("./esbuild-yolu.cjs");
const { execSync } = require("child_process");
const os = require("os"); const fs = require("fs"); const path = require("path");
const mobile = path.join(__dirname, "..", "..");
const giris = path.join(mobile, `_kan_giris_${process.pid}.ts`);
const paket = path.join(os.tmpdir(), `kronikler-kan-${process.pid}.cjs`);
fs.writeFileSync(giris, `export * from "./lib/game";\nexport { ayinSahnesi } from "./lib/events";\nexport { renderEvt, tFor } from "./lib/i18n";\n`);
try { execSync(`${ESBUILD} ${giris} --bundle --platform=node --format=cjs --outfile=${paket} --log-level=error`, { cwd: mobile, stdio: "inherit" }); } finally { fs.unlinkSync(giris); }
const g = require(paket); fs.unlinkSync(paket);
const hata = [];
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const asil = Math.random; const R = (a) => a[Math.floor(Math.random() * a.length)];
const kayit = new Map(); let gelir = 0, kinZarar = 0, yoksulVurus = 0, tavanAsimi = 0, devir = 0, ataSatir = 0, hasim = 0, baris = 0, cekildi = 0, minnetPara = 0;
const tur = {}; const ornek = [];
function yasat(s, tohum, ayLimit) {
  let ay = 0; const gor = new Set(s.history);
  while (!s.player.dead && ay++ < ayLimit) {
    const p = s.player;
    if (p.hunger < 35) s = g.eat(s);
    if (p.age >= 13 && p.profession !== "işsiz" && p.hunger >= 30) { const m0 = s.player.money; s = g.work(s); gelir += Math.max(0, s.player.money - m0); }
    const ns = g.npcsOf(s);
    if (p.age >= 13 && ns.length && Math.random() < 0.25) { try { s = g.talkWith(s, R(ns), R(["hosbes", "iltifat", "dert", "saka", "is", "aile", "dunya", "hedef"])).state; } catch (e) {} }
    if (s.npcTeklif && s.npcTeklif.turn === s.turn) s = g.npcTeklifYanit(s, Math.random() < 0.5, 0);
    const onceKeys = (s.hatir || []).map((x) => tohum + "|" + x.t + "|" + x.kay + "|" + x.yon); let donusAy = false;
    const once = { money: s.player.money, hunger: s.player.hunger, health: s.player.health, infl: g.inflationFactor(s) };
    s = g.advance(s, 1);
    const r = g.ayinSahnesi(s, s.hseq || 0); s = r.s;
    if (r.dilemma) { const d = r.dilemma; const i = Math.floor(Math.random() * d.choices.length); s = g.applyDilemma(s, d.choices[i].gercek || d.choices[i].delta, d.choices[i].result, d.id + ":" + i, r.tur === "senlik"); }
    else if (r.opp) s = g.resolveOpportunity(s, r.opp, Math.random() < 0.5);
    if (s.hesap) s = g.hesapKarari(s, false);
    if (s.micro) s = g.resolveMicro(s, 0);
    for (const e of s.history) {
      if (gor.has(e)) continue; gor.add(e); const k = e.k || "";
      if (!k.startsWith("hatir.")) continue;
      const kok = k.replace(/\.k$/, "").replace(/\.\d$/, ""); tur[kok] = (tur[kok] || 0) + 1;
      if (ornek.length < 8 && !ornek.some((x) => x.kok === kok)) ornek.push({ kok, k, p: e.p });
      if (k.startsWith("hatir.kin.para")) { const z = e.p[1]; kinZarar += z; if (once.money < 80 * once.infl || once.hunger < 25 || once.health < 30) yoksulVurus++; if (z > Math.max(1, Math.floor(once.money * 0.05)) + 1) tavanAsimi++; }
      if (k.startsWith("hatir.kin.ad") && (once.money < 80 * once.infl || once.hunger < 25 || once.health < 30)) yoksulVurus++;
      if (k.startsWith("hatir.devir")) devir++; else donusAy = true;
      if (/\.ata(\.k)?$/.test(k)) ataSatir++;
      if (k.startsWith("hatir.hasim")) hasim++;
      if (k.startsWith("hatir.kin.baris")) baris++;
      if (k.startsWith("hatir.kin.cekildi")) cekildi++;
      if (k.startsWith("hatir.minnet.para")) minnetPara++;
    }
    const pop = g.nufusOf(s);
    const simdi = new Set((s.hatir || []).map((x) => tohum + "|" + x.t + "|" + x.kay + "|" + x.yon));
    if (donusAy) for (const key of onceKeys) if (!simdi.has(key) && kayit.has(key)) kayit.get(key).don = Math.max(1, kayit.get(key).don); // dönüşte kapanan hesap (barış, ödenen minnet, kanlı hasma dönüş)
    for (const x of s.hatir || []) {
      const key = tohum + "|" + x.t + "|" + x.kay + "|" + x.yon;
      const r0 = kayit.get(key) || { ilk: s.turn, son: s.turn, don: 0, uygun: 0 };
      r0.son = s.turn; r0.don = Math.max(r0.don, x.don);
      if (s.player.age >= 14 && pop.k[x.id] && pop.k[x.id].ol == null) r0.uygun++;
      kayit.set(key, r0);
    }
  }
  return s;
}
const N = parseInt(process.env.KAN_N || "24", 10); let mirasDeneme = 0, mirasAta = 0;
for (let i = 0; i < N; i++) {
  const tohum = 5150 + i * 7741; Math.random = mulberry(tohum);
  try {
    let s = g.newGame("Kan", "Deneme", i % 2 ? "erkek" : "kadın");
    s = yasat(s, tohum, 12 * 75);
    // Miras: ölmediyse öldür, çocuk varsa vâris; hesaplar ata imiyle geçmeli
    if (!s.player.dead) { s = JSON.parse(JSON.stringify(s)); s.player.dead = true; }
    const acik = (s.hatir || []).filter((x) => { const k = g.nufusOf(s).k[x.id]; return k && k.ol == null && (x.yon === "minnet" || x.guc > 1); });
    if (s.player.children.length && acik.length) {
      mirasDeneme++;
      const h = g.continueAsHeir(s, "esit");
      if ((h.hatir || []).some((x) => x.ata === s.player.name)) mirasAta++;
      else hata.push(`tohum ${tohum}: ${acik.length} açık hesap vârise geçmedi`);
      yasat(h, tohum + 1, 12 * 25);
    }
  } finally { Math.random = asil; }
}
let uzun = 0, donen = 0; for (const r of kayit.values()) if (r.uygun >= 60) { uzun++; if (r.don >= 1) donen++; }
const donus = uzun ? Math.round((donen / uzun) * 1000) / 10 : 0; const zararPay = gelir ? Math.round((kinZarar / gelir) * 10000) / 100 : 0;
console.log(`Kan Hafızası: ${N} hayat · ${kayit.size} hatır kaydı · ≥5 yıl yaşamış ${uzun}, geri dönen %${donus}`);
console.log(`  satırlar: ${JSON.stringify(tur)}`);
console.log(`  miras: ${mirasAta}/${mirasDeneme} vâris atanın hesabını devraldı · ata imli dönüş satırı ${ataSatir} · NPC evladına devir ${devir} · kanlı hasma dönen ${hasim} · barış ${baris} · düşene vurmadı ${cekildi} · darda minnet kesesi ${minnetPara}`);
console.log(`  adalet: kin zararı çalışma gelirinin %${zararPay}'i · yoksula vuruş ${yoksulVurus} · %5 tavan aşımı ${tavanAsimi}`);
for (const o of ornek.slice(0, 6)) { const t = (k) => g.tFor("tr", k); console.log(`  örnek: ${g.renderEvt(o.k, "", o.p, "tr", t, false)}`); }
if (uzun < 10) hata.push(`ölçüm için yetersiz uzun kayıt (${uzun})`);
if (donus < 70) hata.push(`dönüş oranı %${donus} < 70`);
if (mirasDeneme && mirasAta < mirasDeneme) hata.push(`miras ${mirasAta}/${mirasDeneme}`);
if (!mirasDeneme) hata.push("hiçbir hayatta miras denenemedi");
if (!ataSatir) hata.push("vârise geçen hesap hiç geri dönmedi (ata satırı 0)");
if (yoksulVurus) hata.push(`kin ${yoksulVurus} kez düşene vurdu`);
if (tavanAsimi) hata.push(`${tavanAsimi} dönüşte kayıp kesenin %5'ini aştı`);
if (zararPay > 3) hata.push(`kin zararı gelirin %${zararPay}'i > 3`);
if (hata.length) { console.log("KAN: " + hata.length + " ihlal\n  " + [...new Set(hata)].slice(0, 15).join("\n  ")); process.exit(1); }
console.log("KAN: TEMİZ");
