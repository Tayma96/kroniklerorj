// Oynanış denetimi (TASARIM_PUSULASI.md Bölüm 9.10): yüzlerce hayatı "makul bir oyuncu" gibi oynatır — ana ekranın
// açtığı kartlar (şenlik, ikilem, fırsat) dahil — ve oyunun oyuncuya AYDA NE SUNDUĞUNU ölçer: boş ay, bunalma,
// açık gerilim, pencere sıklığı, günlük gürültüsü, tempo, çöküş sarmalı ve hayatlar arası çeşitlilik.
// Kullanım: node scripts/_smoke/oynanis.cjs  [OYN_LIVES=80] [OYN_JSON=1]
// Ayın sahnesini ana ekranla aynı motor işlevi seçer (events.ts ayinSahnesi — Yönetmen 2.0); oyuncu ara sıra bir hikâye yayına girer.
// Kader ipi ölçümleri (çığır Sütun 1+3): ip ödeme oranı (vadesi hayat içinde dolanlar), açık ip tavanı, jenerik doruk satırı,
// aynı tür kart serisi, orta yaşta iki soru arası en uzun boşluk, ay sonu notu kapsamı.
const ESBUILD = require("./esbuild-yolu.cjs");
const { execSync } = require("child_process");
const os = require("os"); const fs = require("fs"); const path = require("path");
const mobile = path.join(__dirname, "..", "..");
const giris = path.join(os.tmpdir(), `kronikler-oyn-giris-${process.pid}.ts`);
const paket = path.join(os.tmpdir(), `kronikler-oyn-${process.pid}.cjs`);
fs.writeFileSync(giris, `export * from ${JSON.stringify(path.join(mobile, "lib/game"))};\nexport { ayinSahnesi, ORTA_ARA } from ${JSON.stringify(path.join(mobile, "lib/events"))};\nexport { availableArcs, arcById } from ${JSON.stringify(path.join(mobile, "lib/arcs"))};\n`);
execSync(`${ESBUILD} ${giris} --bundle --platform=node --format=cjs --outfile=${paket} --log-level=error`, { cwd: mobile, stdio: "inherit" });
const g = require(paket); fs.unlinkSync(giris);

const LIVES = parseInt(process.env.OYN_LIVES || "80", 10);
const R = (a) => a[Math.floor(Math.random() * a.length)];
const SINIF = { ikilem: "ikilem", orta: "orta", firsat: "firsat", kapi: "kapi", senlik: "senlik" }; // events.ts ayniTurSerisi ile aynı sınıflar

// Açık gerilimler: oyuncunun "aklında tutması gereken" süren hesaplar.
function acikGerilim(s) {
  const p = s.player; let n = 0;
  if (s.story && s.story.nemesis) n++;
  if (s.feud) n++;
  if (s.bloodline && s.bloodline.scene) n++;
  if (s.saga && s.saga.scene) n++;
  n += (s.kanDefteri || []).filter((x) => x.tur !== "canborcu").length;
  if (s.npcTeklif) n++;
  if (s.hesap) n++;
  if (p.rakip && !p.rakip.bitti && p.rakip.yaris != null) n++;
  if (p.jail && p.jail.left > 0) n++;
  if (p.debt > 0) n++;
  if (p.affair) n++;
  if (p.betrothed) n++;
  return n;
}

// Gecikmeli sonuç olayları (sonucun orta/uzun vadesi): kişiyi adıyla anıyor mu? (TASARIM_PUSULASI 9.3, geri çağırma)
const GECIKMELI = ["seed.", "ip.", "kan.canBorcu", "kan.donus", "kan.davaci", "kan.buyudu", "kan.miras", "kan.babaKatili", "npct.kefilOd", "npct.kefilBatti", "npct.borcOdendi", "npct.borcGecikti", "npct.borcBatti", "npci.savundu"]; // (nesil hafızası olayları kasabanın toplu anısıdır; anılan kişi atanın kendisi — ölçüm dışı)
// İkilemden doğan tohumların metni eylemin kendisini geri çağırır ("o yangın gecesi…"): adsız da olsa sebebini söyler.
const IKILEM_TOHUM = new Set(Object.values(g.DILEMMA_SEEDS || {}).map((x) => "seed." + x.kaynak));
const T = { kisisiz: {}, gecikmeli: 0, geriCagiran: 0, kapi: {}, dunyaHaberi: 0, ay: 0, bos: 0, bunalma: 0, pencere: 0, karar: 0, buyukKarar: 0, olay: 0, landmark: 0, gerilimTop: 0, gerilim5ustu: 0, gerilimMax: 0, cocukAy: 0, cocukBos: 0, ortaAy: 0, ortaBos: 0, ipAcilan: 0, ipOdenen: 0, ipVadesiGecen: 0, ipMax: 0, jenerikDoruk: 0, seriMax: 0, ortaAraMax: 0, ortaKart: 0, notAy: 0, yetiskinAy: 0, yay: 0, ipKaynak: {}, sahneTur: {}, izToplam: 0, izUygun: 0, izKarsilik: 0, yankiSatir: 0, yankiTur: {}, kisisel: 0, tekrar: 0, tekrarKey: {} };
const hayatAy = [], hayatKarar = [], olumYasi = [], meslekler = {}, enBuyuk = {}; let sarmal = 0, ilkKararAy = [];
for (let h = 0; h < LIVES; h++) {
  let s = g.newGame("Sim", "Oyuncu", Math.random() < 0.5 ? "erkek" : "kadın");
  const goruldu = new Map(); const ipIz = new Map(); const izIz = new Map(); let seri = 0, seriSinif = null, ortaAra = 0; let ay = 0, kararSay = 0, dip = 0, sarmalda = false, ilkKarar = null, seen = s.hseq || 0, guard = 0;
  const hedef = R(g.ALL_PROFS.filter((x) => x !== "işsiz")); const hedefSart = g.meslekSarti(hedef);
  while (!s.player.dead && s.player.age < 85 && guard++ < 1100) {
    const p = s.player;
    // Makul oyuncu: karnını doyurur, çalışır, çocukken oynar, gençken uğraşır, ara sıra insanlarla konuşur.
    if (p.hunger < 35) s = g.eat(s);
    if (p.age >= 13 && p.profession !== "işsiz" && s.player.hunger >= 30) s = g.work(s);
    let secim = 0; // oyuncunun kendi seçtiği aylık uğraş (çocukluk/gençlik): küçük karar sayılır
    try { if (p.age < 13 && Math.random() < 0.6) { const r = g.childAction(s, R(["oyun", "yardim", "yaramazlik", "kesif"])); if (r && r.state && r.state !== s) { s = r.state; secim = 1; } } } catch (e) {}
    try { if (p.age >= 13 && p.age < 18 && Math.random() < 0.5) { const r = g.youthAction(s, R(["usta", "akran", "gonul", "huner"])); if (r && !r.blocked) { s = r.state; secim = 1; } } } catch (e) {}
    // Hedefini seçen oyuncu: özellik puanlarını hedef mesleğin özelliğine basar ve uygun olunca o mesleğe geçer (ölçüm: hedefli oyuncu 13–18 yaşında ulaşıyor)
    while (s.player.stat_points > 0 && s.player.stats[hedefSart.stat] < g.statCapOf(s.player)) s = g.allocateStat(s, hedefSart.stat);
    try { if (p.age >= 13 && s.player.profession !== hedef && Math.random() < 0.2) s = g.changeProfession(s, hedef); } catch (e) {}
    try { if (p.age >= 13 && Math.random() < 0.25) { const ns = g.npcsOf(s); if (ns.length) { const r = g.talkWith(s, R(ns), R(["hosbes", "iltifat", "dert", "is", "aile"])); if (r && r.state) s = r.state; } } } catch (e) {}
    // Hikâyeler ekranı: yetişkin oyuncu ara sıra bir yaya girer, sahnelerini ayda bir seçerek oynar.
    try { if (p.age >= 16 && !s.story.active && Math.random() < 0.04) { const av = g.availableArcs(s.player, s.story.completed, s.story.tension, null); if (av.length) s = g.beginArc(s, R(av).id); }
      else if (s.story.active) { const a = g.arcById ? g.arcById(s.story.active.id) : null; const st = a && a.stages[s.story.active.stage]; s = g.advanceArc(s, st ? Math.floor(Math.random() * st.choices.length) : 0); secim = 1; if (!s.story.active) T.yay++; } } catch (e) {}
    // Ay ilerler; ardından ana ekranın göstereceği her şey sayılır.
    const ayBasi = s.hseq || 0; // ayın kendisinin ürettiği olaylar bundan sonra (oyuncunun eylem dönütleri hariç)
    s = g.advance(s, 1); ay++; T.ay++;
    if (s.npcTeklif && s.npcTeklif.turn === s.turn && ['canborcu', 'kardes', 'miras', 'dunur', 'borc'].includes(s.npcTeklif.tur)) T.kapi[s.npcTeklif.tur] = (T.kapi[s.npcTeklif.tur] || 0) + 1; // ayın kendisinden gelen kapı (can borcu, kardeş, miras, dünür, borç)
    const yeni = s.history.filter((e) => (e.q || 0) > seen); seen = s.hseq || seen;
    let pencere = 0, karar = secim, buyuk = 0;
    const land = yeni.filter(g.donumAni); // pencere açan büyük an (index.tsx ile aynı kural)
    T.dunyaHaberi += yeni.filter((e) => e.landmark && e.scope === "makro" && !g.donumAni(e)).length;
    if (land.length) pencere++; // dönüm noktası penceresi (ayın en yenisi)
    if (yeni.some((e) => e.type === "yıl_dönümü")) pencere++; // yıl karnesi
    T.olay += yeni.length; T.landmark += land.length;
    for (const e of yeni) { if (e.scope === "makro" || !e.k || (e.q || 0) <= ayBasi || !g.onemliMi(e)) continue; T.kisisel++; const imza = e.k + "|" + JSON.stringify(e.p || []); const once = goruldu.get(imza); if (once != null && s.turn - once <= 24) { T.tekrar++; T.tekrarKey[e.k] = (T.tekrarKey[e.k] || 0) + 1; } goruldu.set(imza, s.turn); } // aynı satır (anahtar + parametreler) iki yıl içinde yeniden
    for (const e of yeni) if (GECIKMELI.some((x) => (e.k || "").startsWith(x)) && !/\.ima$/.test(e.k || "")) { T.gecikmeli++; if ((e.p || []).some((v) => v && typeof v === "object" && ("kn" in v || "kf" in v || "fn" in v)) || IKILEM_TOHUM.has(e.k) || /^ip\..*\.ode2?$/.test(e.k || "")) T.geriCagiran++; else T.kisisiz[e.k] = (T.kisisiz[e.k] || 0) + 1; }
    for (const e of land) enBuyuk[e.type] = (enBuyuk[e.type] || 0) + 1;
    const ger = acikGerilim(s); T.gerilimTop += ger; if (ger > 5) T.gerilim5ustu++; T.gerilimMax = Math.max(T.gerilimMax, ger); // kararlar verilmeden önce
    // Ayın sahnesi (index.tsx ile aynı motor işlevi): teklif/hesap ayında kart yok (orta yaş nöbetçisi hariç); büyük an ayında yalnız şenlik
    const ortaYas = s.player.age >= 30 && s.player.age <= 55, hucrede = !!(s.player.jail && s.player.jail.left > 0);
    const sahne = g.ayinSahnesi(s, ayBasi); s = sahne.s; T.sahneTur[sahne.tur] = (T.sahneTur[sahne.tur] || 0) + 1;
    if (sahne.tur !== "bos") { const sn = SINIF[sahne.tur]; seri = sn === seriSinif ? seri + 1 : 1; seriSinif = sn; if (seri > T.seriMax) { T.seriMax = seri; T.seriSinif = sn; } if (seri > 3 && process.env.OYN_DEBUG) console.log("SERI", sn, s.turn, JSON.stringify(s.sahne_izi), JSON.stringify(sahne.dilemma && sahne.dilemma.id)); }
    if (sahne.tur === "orta") { T.ortaKart++; T.ortaAraMax = Math.max(T.ortaAraMax, ortaAra); ortaAra = 0; }
    if (ortaYas && !hucrede) { ortaAra++; if (ortaAra > g.ORTA_ARA + 1) T.ortaAraMax = Math.max(T.ortaAraMax, ortaAra - 1); } // kartsız aşılan boşluk da sayılır (ölçü: son sorudan bu yana geçen ay)
    if (sahne.dilemma) { const d = sahne.dilemma; pencere++; karar++; buyuk++; const i = Math.floor(Math.random() * d.choices.length); s = g.applyDilemma(s, d.choices[i].gercek || d.choices[i].delta, d.choices[i].result, d.id + ":" + i, sahne.tur === "senlik"); }
    else if (sahne.opp) { pencere++; karar++; s = g.resolveOpportunity(s, sahne.opp, Math.random() < 0.5); }
    else if (sahne.tur === "kapi" && s.npcTeklif && s.npcTeklif.turn === s.turn) T.kapi[s.npcTeklif.tur] = (T.kapi[s.npcTeklif.tur] || 0) + 1;
    if (s.npcTeklif && s.npcTeklif.turn === s.turn) { pencere++; karar++; buyuk++; s = g.npcTeklifYanit(s, Math.random() < 0.75, Math.random() < 0.5 ? 0 : 1); }
    if (s.hesap) { pencere++; karar++; buyuk++; s = g.hesapKarari(s, Math.random() < 0.3); }
    if (s.micro) { karar++; s = g.resolveMicro(s, Math.random() < 0.5 ? 0 : 1); }
    if (s.saga && s.saga.scene) { karar++; buyuk++; try { s = g.resolveSaga(s, Math.floor(Math.random() * (g.SAGA_CHOICES[s.saga.scene] || 2))); } catch (e) {} }
    if (s.bloodline && s.bloodline.scene) { karar++; buyuk++; try { s = g.resolveBloodline(s, Math.floor(Math.random() * (g.BL_CHOICES[s.bloodline.scene] || 2))); } catch (e) {} }
    if (s.player.crowned && s.divan) { karar++; buyuk++; s = g.resolveDivan(s, Math.random() < 0.5 ? 0 : 1); }
    seen = s.hseq || seen; // kararların kendi olayları bu ayın sayımına girdi
    // Kader ipi izleme: açılan her ip; kapanınca bir tohum/kader satırı düştü mü; vadesi hayat içinde geçip açık kalan var mı
    const acik = g.acikIpler(s); T.ipMax = Math.max(T.ipMax, acik.length);
    for (const t of acik) if (!ipIz.has(t.id)) { ipIz.set(t.id, { son: t.ekim + t.ip.vade[1], kaynak: t.kaynak }); T.ipAcilan++; T.ipKaynak[t.kaynak] = (T.ipKaynak[t.kaynak] || 0) + 1; }
    const ayOlay = s.history.filter((e) => e.day === s.turn);
    for (const [id, iz] of ipIz) if (!iz.kapandi && !acik.some((t) => t.id === id)) { iz.kapandi = true; if (ayOlay.some((e) => e.type === "tohum")) T.ipOdenen++; }
    for (const x of s.hafiza || []) if (!x.ata) { const o = izIz.get(x.n); if (!o) izIz.set(x.n, { t: x.t, ref: !!x.ref, k: x.k }); else if (x.ref) o.ref = true; } // Yankı: her büyük seçimin izi
    for (const e of ayOlay) if (e.type === "yanki") { T.yankiSatir++; const tk = (e.k || "").split(".").slice(0, 2).join("."); T.yankiTur[tk] = (T.yankiTur[tk] || 0) + 1; }
    T.jenerikDoruk += ayOlay.filter((e) => e.k === "dir.climaxWin" || e.k === "dir.climaxTurn").length;
    if (!s.player.dead && s.player.age >= 18) { T.yetiskinAy++; if (g.ayNotu(s)) T.notAy++; }
    const bos = karar === 0 && land.length === 0;
    if (bos) T.bos++; if (pencere >= 3) T.bunalma++;
    if (s.player.age < 13) { T.cocukAy++; if (bos) T.cocukBos++; }
    if (s.player.age >= 30 && s.player.age <= 55) { T.ortaAy++; if (bos) T.ortaBos++; }
    T.pencere += pencere; T.karar += karar; T.buyukKarar += buyuk; kararSay += karar;
    if (karar && ilkKarar == null) ilkKarar = ay;
    // Çöküş sarmalı: parasız ve (hasta ya da itibarsız) 60 ay üst üste
    const dipte = s.player.money < 5 && (s.player.health < 30 || s.player.reputation < -40);
    dip = dipte ? dip + 1 : 0; if (dip >= 60) sarmalda = true;
  }
  for (const [, iz] of ipIz) if (!iz.kapandi && iz.son < s.turn) T.ipVadesiGecen++; // vadesi hayat içinde doldu, ödenmedi
  for (const [, o] of izIz) { T.izToplam++; if (o.t <= s.turn - 72) { T.izUygun++; if (o.ref) T.izKarsilik++; } } // karşılık için en az 6 yıl yaşanmış seçimler
  hayatAy.push(ay); hayatKarar.push(kararSay); olumYasi.push(s.player.age); if (sarmalda) sarmal++;
  if (ilkKarar != null) ilkKararAy.push(ilkKarar);
  meslekler[s.player.profession] = (meslekler[s.player.profession] || 0) + 1;
}
fs.unlinkSync(paket);
const med = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };
const yuzde = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const entropi = (o) => { const n = Object.values(o).reduce((a, b) => a + b, 0); return Math.round(-Object.values(o).reduce((a, c) => a + (c / n) * Math.log2(c / n), 0) * 100) / 100; };
const sonuc = {
  hayat: LIVES, ay: T.ay,
  bosAyYuzde: yuzde(T.bos, T.ay), cocuklukBosAyYuzde: yuzde(T.cocukBos, T.cocukAy), ortaYasBosAyYuzde: yuzde(T.ortaBos, T.ortaAy),
  bunalmaAyYuzde: yuzde(T.bunalma, T.ay),
  aylikPencere: Math.round((T.pencere / T.ay) * 100) / 100, aylikKarar: Math.round((T.karar / T.ay) * 100) / 100, aylikBuyukKarar: Math.round((T.buyukKarar / T.ay) * 100) / 100,
  aylikOlay: Math.round((T.olay / T.ay) * 10) / 10, aylikDonumNoktasi: Math.round((T.landmark / T.ay) * 100) / 100, aylikDunyaHaberi: Math.round((T.dunyaHaberi / T.ay) * 100) / 100,
  geriCagirmaYuzde: yuzde(T.geriCagiran, T.gecikmeli), gecikmeliSonuc: T.gecikmeli,
  ortGerilim: Math.round((T.gerilimTop / T.ay) * 100) / 100, gerilim5UstuAyYuzde: yuzde(T.gerilim5ustu, T.ay), gerilimMax: T.gerilimMax,
  hayatAyMedyan: med(hayatAy), hayatKararMedyan: med(hayatKarar), ilkKararAyMedyan: med(ilkKararAy),
  olumYasiMedyan: med(olumYasi), sarmalYuzde: yuzde(sarmal, LIVES),
  meslekCesitliligi: entropi(meslekler), meslekSayisi: Object.keys(meslekler).length,
  enSikDonum: Object.entries(enBuyuk).sort((a, b) => b[1] - a[1]).slice(0, 6),
  ipAcilan: T.ipAcilan, ipOdemeYuzde: yuzde(T.ipOdenen, T.ipOdenen + T.ipVadesiGecen + (T.ipAcilan ? 0 : 1)), ipVadesiGecen: T.ipVadesiGecen, ipMax: T.ipMax, jenerikDoruk: T.jenerikDoruk,
  izToplam: T.izToplam, izKarsilikYuzde: yuzde(T.izKarsilik, T.izUygun), yetimIz: T.izUygun - T.izKarsilik, aylikYanki: Math.round((T.yankiSatir / T.ay) * 100) / 100,
  ayniTurSeriMax: T.seriMax, ortaAraMax: T.ortaAraMax, ortaKart: T.ortaKart, ayNotuYuzde: yuzde(T.notAy, T.yetiskinAy), biterYay: T.yay,
};
if (process.env.OYN_JSON) { console.log(JSON.stringify(sonuc)); process.exit(0); }
console.log(`OYNANIŞ DENETİMİ · ${LIVES} hayat · ${T.ay} ay`);
console.log(`  Boş ay (karar da dönüm noktası da yok): %${sonuc.bosAyYuzde}  · çocuklukta %${sonuc.cocuklukBosAyYuzde} · 30–55 yaşta %${sonuc.ortaYasBosAyYuzde}`);
console.log(`  Bunalma ayı (3+ pencere): %${sonuc.bunalmaAyYuzde}`);
console.log(`  Ayda pencere ${sonuc.aylikPencere} · karar ${sonuc.aylikKarar} (büyük ${sonuc.aylikBuyukKarar}) · olay ${sonuc.aylikOlay} · dönüm noktası ${sonuc.aylikDonumNoktasi} (pencere açmayan dünya haberi ${sonuc.aylikDunyaHaberi})`);
console.log(`  Gecikmeli sonuç ${sonuc.gecikmeliSonuc} · sebebini söyleyen (geri çağırma: kişi adı ya da eylemin kendisi) %${sonuc.geriCagirmaYuzde}`);
if (Object.keys(T.kisisiz).length) console.log(`    kişiyi anmayanlar: ${Object.entries(T.kisisiz).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => k + " " + v).join(", ")}`);
console.log(`  Açık gerilim ort. ${sonuc.ortGerilim} · 5'i aşan ay %${sonuc.gerilim5UstuAyYuzde} · en çok ${sonuc.gerilimMax}`);
console.log(`  Tempo: hayat medyan ${sonuc.hayatAyMedyan} ay, ${sonuc.hayatKararMedyan} karar · ilk karar ${sonuc.ilkKararAyMedyan}. ayda`);
console.log(`  Ölüm yaşı medyan ${sonuc.olumYasiMedyan} · çöküş sarmalı %${sonuc.sarmalYuzde}`);
console.log(`  Çeşitlilik: ${sonuc.meslekSayisi} meslek, entropi ${sonuc.meslekCesitliligi} bit (${Object.entries(meslekler).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + " " + v).join(", ")})`);
console.log(`  Tekrar: ayın getirdiği önemli satırların %${yuzde(T.tekrar, T.kisisel)}'i son iki yılda aynen görülmüştü · en çok: ${Object.entries(T.tekrarKey).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => k + " " + v).join(", ")}`);
console.log(`  Kapıya gelenler: ${Object.entries(T.kapi).map(([k, v]) => k + " " + v).join(", ") || "yok"}`);
console.log(`  YANKI: ${sonuc.izToplam} seçim hafızaya yazıldı · en az 6 yıl sonrası yaşanmış seçimlerin %${sonuc.izKarsilikYuzde}'i sonradan karşılık buldu (karşılıksız ${sonuc.yetimIz}) · ayda ${sonuc.aylikYanki} yankı satırı`);
console.log(`    yankı türleri: ${Object.entries(T.yankiTur).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + " " + v).join(", ")}`);
console.log(`  KADER İPİ: açılan ${sonuc.ipAcilan} · ödeme (vadesi hayat içinde dolanlar) %${sonuc.ipOdemeYuzde} (ödenmeyen ${sonuc.ipVadesiGecen}) · aynı anda en çok ${sonuc.ipMax} açık ip · jenerik doruk satırı ${sonuc.jenerikDoruk}`);
console.log(`    kaynaklar: ${Object.entries(T.ipKaynak).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + " " + v).join(", ")}`);
console.log(`  YÖNETMEN 2.0: aynı tür kart serisi en çok ${sonuc.ayniTurSeriMax} (${T.seriSinif}) · orta yaşta iki soru arası en çok ${sonuc.ortaAraMax} ay (${sonuc.ortaKart} soru) · ay sonu notu yetişkin ayların %${sonuc.ayNotuYuzde}'inde · biten yay ${sonuc.biterYay}`);
console.log(`    sahne türleri: ${Object.entries(T.sahneTur).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + " " + v).join(", ")}`);
if (process.env.OYN_ESIK) { // çığır eşikleri: ödeme %100, ≤3 açık ip, jenerik doruk 0, seri ≤3, orta yaş arası ≤18, not ≥%60, bunalma ≤%1
  const hata = [];
  if (sonuc.ipOdemeYuzde < 100) hata.push("ip ödeme %" + sonuc.ipOdemeYuzde); if (sonuc.ipMax > 3) hata.push("açık ip " + sonuc.ipMax); if (sonuc.jenerikDoruk) hata.push("jenerik doruk " + sonuc.jenerikDoruk);
  if (sonuc.ayniTurSeriMax > 3) hata.push("seri " + sonuc.ayniTurSeriMax); if (sonuc.ortaAraMax > 18) hata.push("orta yaş arası " + sonuc.ortaAraMax); if (sonuc.ayNotuYuzde < 60) hata.push("ay notu %" + sonuc.ayNotuYuzde); if (sonuc.izKarsilikYuzde < 60) hata.push("yankı karşılık %" + sonuc.izKarsilikYuzde); if (sonuc.bunalmaAyYuzde > 1) hata.push("bunalma %" + sonuc.bunalmaAyYuzde);
  console.log(hata.length ? "ÇIĞIR EŞİKLERİ: AŞILDI — " + hata.join(", ") : "ÇIĞIR EŞİKLERİ: TEMİZ"); if (hata.length) process.exitCode = 1;
}
console.log(`  En sık dönüm noktası türleri: ${sonuc.enSikDonum.map(([k, v]) => k + " " + v).join(", ")}`);
