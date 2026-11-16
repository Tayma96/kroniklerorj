// GET /yonetim: tek sayfalık yönetici paneli (ana tasarım §7.3-7.4). Yönetici aracıdır; oyuncu metni değildir,
// bu yüzden yalnız Türkçedir. Dış kaynak yoktur; satır içi CSS/JS, sıkı CSP ile özetleri (sha256) üzerinden izinlidir.
// Sunucudan gelen her metin textContent ile yazılır (innerHTML yok): oyuncu adı/şikayet metni betik olamaz.

import { utf8 } from "../b64.ts";

const STIL = `
:root{color-scheme:light dark;--z:#f6f3ee;--y:#1d1b18;--c:#d9d2c7;--v:#8a3b12;--k:#b3261e;--i:#fff;--a:#2e7d32}
@media (prefers-color-scheme:dark){:root{--z:#16140f;--y:#ece6dc;--c:#3a352d;--v:#e08a4f;--k:#f2b8b5;--i:#211e18;--a:#81c784}}
*{box-sizing:border-box}
body{margin:0;background:var(--z);color:var(--y);font:15px/1.45 system-ui,sans-serif}
header{padding:12px 16px;border-bottom:1px solid var(--c);display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
h1{font-size:18px;margin:0}
main{max-width:860px;margin:0 auto;padding:8px 16px 48px}
section{background:var(--i);border:1px solid var(--c);border-radius:10px;padding:12px;margin:12px 0}
h2{font-size:16px;margin:0 0 8px}
label{display:block;font-size:13px;margin:8px 0 2px}
input,select,textarea,button{font:inherit;color:inherit;max-width:100%}
input,select,textarea{width:100%;padding:8px;border:1px solid var(--c);border-radius:6px;background:var(--z)}
textarea{min-height:64px}
button{padding:8px 14px;border-radius:6px;border:1px solid var(--v);background:var(--v);color:#fff;margin:8px 8px 0 0;cursor:pointer}
button.ikincil{background:transparent;color:var(--v)}
button:disabled{opacity:.5}
.satir{display:flex;gap:8px;flex-wrap:wrap}.satir>*{flex:1 1 140px}
.kart{border-top:1px solid var(--c);padding:8px 0;overflow-wrap:anywhere}
.kucuk{font-size:12px;opacity:.8}
.hata{color:var(--k);min-height:1em}
pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;margin:4px 0}
table{width:100%;border-collapse:collapse;font-size:13px}td,th{border-top:1px solid var(--c);padding:4px;text-align:left;vertical-align:top}
.tablo{overflow-x:auto}
nav#sekmeler{display:flex;gap:6px;flex-wrap:wrap;max-width:860px;margin:8px auto 0;padding:0 16px}
nav#sekmeler button{margin:0;background:transparent;color:var(--v);padding:6px 12px}
nav#sekmeler button[aria-current="true"]{background:var(--v);color:#fff}
section.sekmeDisi{display:none}
.etkIzgara{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.etkKart{border:1px solid var(--c);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:4px}
.etkKart.acik{border-color:var(--a);box-shadow:0 0 0 1px var(--a) inset}
.etkKart h3{font-size:15px;margin:0}
.etkKart .satir>*{flex:1 1 100px}
.durumAcik{color:var(--a);font-weight:600}
.durumKapali{opacity:.7}
button.durdur{background:var(--k);border-color:var(--k)}
`;

const BETIK = `
"use strict";
const $ = (s) => document.querySelector(s);
let belirtec = "";
try { belirtec = sessionStorage.getItem("ybelirtec") || ""; } catch (e) {}
let yetkiler = [];
let kayitImleci = "";

function el(etiket, ozellik, ...cocuklar) {
  const e = document.createElement(etiket);
  for (const [a, d] of Object.entries(ozellik || {})) {
    if (a === "metin") e.textContent = d; else if (a === "tik") e.addEventListener("click", d); else e.setAttribute(a, d);
  }
  for (const c of cocuklar) if (c !== null && c !== undefined) e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return e;
}
const zaman = (ms) => ms === null || ms === undefined ? "kalıcı" : new Date(ms).toLocaleString("tr-TR");
const istekNo = () => crypto.randomUUID();

async function api(yontem, yol, govde) {
  const b = { authorization: "Bearer " + belirtec };
  if (govde !== undefined) b["content-type"] = "application/json";
  const y = await fetch("/yonetim/" + yol, { method: yontem, headers: b, body: govde === undefined ? undefined : JSON.stringify(govde) });
  let v = {};
  try { v = await y.json(); } catch (e) {}
  if (!y.ok) throw new Error((v && v.hata) || ("HTTP " + y.status));
  return v;
}
function hataYaz(yer, e) { $(yer).textContent = e ? "Hata: " + (e.message || e) : ""; }
async function dugme(d, yer, is) {
  d.disabled = true; hataYaz(yer);
  try { await is(); } catch (e) { hataYaz(yer, e); } finally { d.disabled = false; }
}

async function girisYap() {
  const idToken = $("#token").value.trim();
  const y = await fetch("/yonetim/giris", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken }) });
  const v = await y.json().catch(() => ({}));
  if (!y.ok) throw new Error(v.hata || ("HTTP " + y.status));
  belirtec = v.oturum;
  try { sessionStorage.setItem("ybelirtec", belirtec); } catch (e) {}
  $("#token").value = "";
  await yukle();
}
function cikis() {
  belirtec = ""; try { sessionStorage.removeItem("ybelirtec"); } catch (e) {}
  for (const s of document.querySelectorAll("section[data-yetki]")) s.hidden = true;
  $("#girisBolum").hidden = false; $("#benBilgi").textContent = "";
  $("#sekmeler").hidden = true; etkVeri = null;
}

// ---- sekmeler: her bölüm bir sekme; tıklanan bölüm görünür (seçim oturumda hatırlanır)
let seciliSekme = "";
try { seciliSekme = sessionStorage.getItem("ysekme") || ""; } catch (e) {}
function sekmeleriKur() {
  const nav = $("#sekmeler"); nav.textContent = "";
  const bolumler = [...document.querySelectorAll("section[data-yetki]")].filter((s) => !s.hidden);
  for (const s of bolumler) if (!s.id) s.id = "b-" + s.dataset.yetki;
  if (!seciliSekme || !bolumler.some((s) => s.id === seciliSekme)) seciliSekme = (bolumler.find((s) => s.id === "etkinlikBolum") || bolumler[0] || {}).id || "";
  for (const s of bolumler) {
    const b = el("button", { type: "button", metin: s.querySelector("h2").textContent, tik: () => { seciliSekme = s.id; try { sessionStorage.setItem("ysekme", s.id); } catch (e) {} sekmeleriKur(); } });
    if (s.id === seciliSekme) b.setAttribute("aria-current", "true");
    nav.append(b);
    s.classList.toggle("sekmeDisi", s.id !== seciliSekme);
  }
  nav.hidden = bolumler.length === 0;
}

// ---- canlı etkinlikler
let etkVeri = null;
let saatFarki = 0; // sunucu saati - tarayıcı saati
function sureYaz(ms) {
  ms = Math.max(0, Math.floor(ms / 1000));
  const g = Math.floor(ms / 86400), sa = Math.floor(ms % 86400 / 3600), dk = Math.floor(ms % 3600 / 60), sn = ms % 60;
  return (g ? g + " gün " : "") + (g || sa ? sa + " sa " : "") + dk + " dk " + String(sn).padStart(2, "0") + " sn";
}
const KAPSAM_AD = { dunya: "Bütün dünya", beylik: "Bir beylik", tur: "Bir yerleşim türü", yerlesim: "Tek yerleşim (şehir, kasaba, köy)" };
const TUR_AD = { sehir: "Bütün şehirler", kasaba: "Bütün kasabalar", koy: "Bütün köyler" };
const TUR_TEK = { sehir: "şehir", kasaba: "kasaba", koy: "köy" };
let nufus = null; // yerleşim → oyuncu sayısı (Oyuncu sayılarını getir)
const sayiEki = (id) => nufus && nufus[id] !== undefined ? " · " + nufus[id] + " oyuncu" : "";
const NAM_AD = { comertlik: "cömertlik", dindarlik: "dindarlık", mertlik: "mertlik", caliskanlik: "çalışkanlık" };
const MESLEK_AD = { ciftci: "çiftçi", asci: "aşçı", hanci: "hancı", oduncu: "oduncu", marangoz: "marangoz", dokumaci: "dokumacı", demirci: "demirci", sifaci: "şifacı", asker: "asker", katip: "kâtip", divan: "divan", tuccar: "tüccar", ozan: "ozan", arabulucu: "arabulucu" };
const MAL_AD = { bugday: "buğday", odun: "odun", kagit: "kâğıt", ekmek: "ekmek", bakir: "bakır" };
const DERT_AD = { kitlik: "kıtlık", haydut: "haydut", salgin: "salgın", hasat: "hasat" };
function yerAdi(e) {
  if (e.kapsam === "dunya") return "Bütün dünya";
  if (e.kapsam === "tur") return TUR_AD[e.hedef] || e.hedef;
  for (const b of etkVeri.beylikler) {
    if (e.kapsam === "beylik" && b.id === e.hedef) return b.ad;
    for (const y of b.yerlesimler) if (e.kapsam === "yerlesim" && y.id === e.hedef) return y.ad + " (" + b.ad + ")";
  }
  return e.hedef || "";
}
function durumSatiri(e) {
  const p = el("div", { class: "durumAcik", "data-bas": String(e.bas), "data-bit": e.bit === null ? "" : String(e.bit) });
  p.textContent = "● Etkinlik başlatıldı · " + sureYaz(Date.now() + saatFarki - e.bas) + " süredir aktif";
  return p;
}
function sayaclariTazele() {
  const simdi = Date.now() + saatFarki;
  let biten = false;
  for (const d of document.querySelectorAll("[data-bas]")) {
    d.textContent = "● Etkinlik başlatıldı · " + sureYaz(simdi - Number(d.dataset.bas)) + " süredir aktif";
    if (d.dataset.bit && simdi >= Number(d.dataset.bit)) biten = true;
  }
  for (const d of document.querySelectorAll("[data-kalan]")) d.textContent = "Kendiliğinden bitmesine: " + sureYaz(Number(d.dataset.kalan) - simdi);
  if (biten && !etkYukleniyor) etkinlikYukle().catch((e) => hataYaz("#etkHata", e));
}
let etkYukleniyor = false;
async function etkinlikYukle() {
  etkYukleniyor = true;
  try {
    etkVeri = await api("GET", "etkinlikler");
    saatFarki = etkVeri.simdi - Date.now();
    etkinlikCiz();
  } finally { etkYukleniyor = false; }
}
async function nufusYukle() {
  const v = await api("GET", "ekonomi");
  nufus = {};
  for (const y of v.yerlesimler) nufus[y.yerlesim] = y.oyuncuSayisi;
  const satirlar = [...v.yerlesimler].sort((a, b) => b.oyuncuSayisi - a.oyuncuSayisi);
  const k = $("#etkNufus"); k.textContent = "";
  const tablo = el("table", {}, el("tr", {}, el("th", { metin: "Yerleşim" }), el("th", { metin: "Beylik" }), el("th", { metin: "Oyuncu" })));
  for (const y of satirlar) tablo.append(el("tr", {}, el("td", { metin: y.ad }), el("td", { metin: y.beylik }), el("td", { metin: String(y.oyuncuSayisi) })));
  k.closest("details").open = true;
  k.append(el("p", { class: "kucuk", metin: "Toplam " + v.toplam.oyuncuSayisi + " oyuncu. Kalabalık yeri rahatlatmak için boş yerlere çekici bir etkinlik (Panayır, Kervan Mevsimi, Bereket, Göç Dalgası) aç; sakin yeri canlandırmak için de aynısı." }), tablo);
  if (etkVeri) etkinlikCiz();
}
async function etkinlikDurdur(d, e) {
  await dugme(d, "#etkHata", async () => {
    await api("POST", "etkinlik-durdur", { id: e.id, istekNo: istekNo() });
    $("#etkBilgi").textContent = e.ad + " durduruldu (" + sureYaz(Date.now() + saatFarki - e.bas) + " açık kaldı).";
    await etkinlikYukle();
  });
}
function etkinlikCiz() {
  const v = etkVeri;
  const yonetebilir = yetkiler.includes("etkinlikYonet");
  // Şu an açık olanlar
  const a = $("#etkAcik"); a.textContent = "";
  if (!v.etkin.length) a.append(el("p", { class: "kucuk", metin: "Şu an açık etkinlik yok." }));
  for (const e of v.etkin) {
    const kart = el("div", { class: "kart" },
      el("strong", { metin: e.ad }), " · ", el("span", { class: "kucuk", metin: yerAdi(e) + " (" + e.yerSayisi + " yer) · başlatan " + e.kim + " · " + zaman(e.bas) }),
      durumSatiri(e),
      e.bit === null ? el("div", { class: "kucuk", metin: "Süresiz: durdurulana kadar açık." }) : el("div", { class: "kucuk", "data-kalan": String(e.bit) }));
    if (yonetebilir) kart.append(el("button", { type: "button", class: "durdur", metin: "Eventi durdur", tik: (ev) => etkinlikDurdur(ev.target, e) }));
    a.append(kart);
  }
  // Katalog
  const k = $("#etkKatalog"); k.textContent = "";
  for (const t of v.katalog) {
    const aciklar = v.etkin.filter((e) => e.tur === t.tur);
    const kart = el("div", { class: "etkKart" + (aciklar.length ? " acik" : "") }, el("h3", { metin: t.ad }), el("div", { class: "kucuk", metin: t.ozet }));
    const odul = "Katılım (1 takat, bir kez): +" + t.katilim.namN + " " + (NAM_AD[t.katilim.nam] || t.katilim.nam) + ", +" + t.katilim.gonul + " gönül"
      + (t.katilim.mal ? ", " + t.katilim.mal[1] + " " + (MAL_AD[t.katilim.mal[0]] || t.katilim.mal[0]) : "")
      + (t.katilim.meslek.length ? " · iki kat: " + t.katilim.meslek.map((m) => MESLEK_AD[m] || m).join(", ") : "")
      + (t.dert ? " · ortak dert açar: " + (DERT_AD[t.dert] || t.dert) : "");
    kart.append(el("div", { class: "kucuk", metin: odul }));
    if (aciklar.length) for (const e of aciklar) {
      kart.append(durumSatiri(e), el("div", { class: "kucuk", metin: yerAdi(e) }));
      if (yonetebilir) kart.append(el("button", { type: "button", class: "durdur", metin: "Eventi durdur", tik: (ev) => etkinlikDurdur(ev.target, e) }));
    } else kart.append(el("div", { class: "durumKapali", metin: "○ Kapalı" }));
    if (yonetebilir) {
      const kapsam = el("select", { "aria-label": "Kapsam" }, ...v.kapsamlar.map((x) => el("option", { value: x, metin: KAPSAM_AD[x] || x })));
      const hedef = el("select", { "aria-label": "Hedef", hidden: "" });
      const hedefDoldur = () => {
        hedef.textContent = "";
        hedef.hidden = kapsam.value === "dunya";
        for (const b of v.beylikler) {
          if (kapsam.value === "beylik") {
            const top = nufus ? b.yerlesimler.reduce((s, y) => s + (nufus[y.id] || 0), 0) : null;
            hedef.append(el("option", { value: b.id, metin: b.ad + (top === null ? "" : " · " + top + " oyuncu") }));
          } else if (kapsam.value === "yerlesim") for (const y of b.yerlesimler) hedef.append(el("option", { value: y.id, metin: y.ad + " (" + (TUR_TEK[y.tur] || y.tur) + ") · " + b.ad + sayiEki(y.id) }));
        }
        if (kapsam.value === "tur") for (const [id, ad] of Object.entries(TUR_AD)) hedef.append(el("option", { value: id, metin: ad }));
      };
      kapsam.addEventListener("change", hedefDoldur);
      const saatler = [1, 3, 6, 12, 24, 48, 72, 168, 0];
      if (!saatler.includes(t.saat)) saatler.unshift(t.saat);
      const sure = el("select", { "aria-label": "Süre" }, ...saatler.map((s) => el("option", { value: String(s), metin: s === 0 ? "Durdurana kadar" : s >= 24 && s % 24 === 0 ? (s / 24) + " gün" : s + " saat" })));
      sure.value = String(t.saat);
      const baslat = el("button", { type: "button", metin: "Eventi başlat", tik: (ev) => dugme(ev.target, "#etkHata", async () => {
        const govde = { tur: t.tur, kapsam: kapsam.value, saat: Number(sure.value), istekNo: istekNo() };
        if (kapsam.value !== "dunya") govde.hedef = hedef.value;
        await api("POST", "etkinlik-baslat", govde);
        $("#etkBilgi").textContent = t.ad + " başlatıldı. Oyunda hemen etkin.";
        await etkinlikYukle();
      }) });
      kart.append(el("div", { class: "satir" }, kapsam, hedef, sure), baslat);
    }
    k.append(kart);
  }
  // Geçmiş
  const g = $("#etkGecmis"); g.textContent = "";
  if (!v.gecmis.length) g.append(el("p", { class: "kucuk", metin: "Henüz biten etkinlik yok." }));
  for (const e of v.gecmis) g.append(el("div", { class: "kart kucuk", metin: e.ad + " · " + yerAdi(e) + " · " + zaman(e.bas) + " → " + zaman(e.dur || e.bit)
    + " · " + sureYaz(e.sure) + " açık kaldı · " + (e.dur ? "durduran " + e.durKim : "süresi doldu") }));
}
setInterval(() => { if (etkVeri) sayaclariTazele(); }, 1000);

async function yukle() {
  const ben = await api("GET", "ben");
  yetkiler = ben.yetkiler;
  $("#girisBolum").hidden = true;
  $("#benBilgi").textContent = ben.eposta + " · " + ben.rol + (ben.ortamKurucusu ? " (ortam)" : "");
  $("#benYetki").textContent = "Yetkiler: " + ben.yetkiler.join(", ");
  for (const s of document.querySelectorAll("section[data-yetki]")) s.hidden = !yetkiler.includes(s.dataset.yetki);
  for (const d of document.querySelectorAll("[data-gerek]")) d.hidden = !yetkiler.includes(d.dataset.gerek);
  if (yetkiler.includes("sikayetGor")) await sikayetYukle();
  if (yetkiler.includes("parametreGor")) await parametreYukle();
  if (yetkiler.includes("ekonomi")) await ekonomiYukle();
  if (yetkiler.includes("telafiler")) await telafiYukle();
  if (yetkiler.includes("kayitGor")) { kayitImleci = ""; $("#kayitListe").textContent = ""; await kayitYukle(); }
  if (yetkiler.includes("etkinlikGor")) await etkinlikYukle().catch((e) => hataYaz("#etkHata", e));
  sekmeleriKur();
}

let seciliHesap = "";
async function oyuncuAra(sorgu) {
  const v = await api("GET", "oyuncu?" + sorgu);
  seciliHesap = v.profil.hesapId;
  const k = $("#oyuncuSonuc"); k.textContent = "";
  const p = v.profil;
  k.append(el("div", { class: "kart" },
    el("strong", { metin: p.ad }), " · " + p.cinsiyet + " · " + (v.yerlesim ? v.yerlesim.ad + " (" + v.yerlesim.beylik + ")" : p.yerlesim),
    v.kendi ? el("div", { class: "hata", metin: "Bu sizin oyuncu hesabınız: yaptırım kaldıramazsınız." }) : null,
    el("div", { class: "kucuk", metin: "Hesap: " + p.hesapId + " · Kayıt: " + zaman(p.olusturma) })));
  const e = v.yaptirim.etkin;
  k.append(el("div", { metin: "Etkin: " + (e.uzaklastirma ? "uzaklaştırma → " + zaman(e.uzaklastirma.bitis) + " " : "") + (e.susturma ? "susturma → " + zaman(e.susturma.bitis) : "") + (!e.uzaklastirma && !e.susturma ? "yok" : "") }));
  for (const y of v.yaptirim.liste) {
    k.append(el("div", { class: "kart kucuk", metin: "#" + y.id + " " + y.tur + " · " + zaman(y.baslangic) + " → " + zaman(y.bitis) + " · " + y.kim + " · " + y.gerekce + (y.kaldirma ? " · KALDIRILDI: " + y.kaldirma.kim + " (" + y.kaldirma.gerekce + ")" : "") }));
  }
  $("#yaptirimForm").hidden = false;
}

async function yaptirimUygula() {
  const tur = $("#yTur").value;
  const govde = { hedef: seciliHesap, tur, gerekce: $("#yGerekce").value, istekNo: istekNo() };
  if (tur !== "kaliciUzaklastirma") govde.gun = Number($("#yGun").value);
  const v = await api("POST", "yaptirim", govde);
  $("#yGerekce").value = "";
  if (v.hesabaYazildi === false) throw new Error("kaydedildi ama oyuncu hesabına yazılamadı; tekrar deneyin");
  await oyuncuAra("hesap=" + encodeURIComponent(seciliHesap));
}
async function yaptirimKaldir() {
  const govde = { hedef: seciliHesap, gerekce: $("#yGerekce").value, istekNo: istekNo() };
  if ($("#kTur").value) govde.tur = $("#kTur").value;
  const v = await api("POST", "yaptirim-kaldir", govde);
  $("#yGerekce").value = "";
  if (v.hesabaYazildi === false) throw new Error("kaydedildi ama oyuncu hesabına yazılamadı; tekrar deneyin");
  await oyuncuAra("hesap=" + encodeURIComponent(seciliHesap));
}

async function sikayetYukle() {
  const v = await api("GET", "sikayetler?durum=" + $("#sDurum").value);
  const k = $("#sikayetListe"); k.textContent = "";
  k.append(el("div", { class: "kucuk", metin: "Açık toplam: " + v.toplamAcik }));
  for (const s of v.sikayetler) {
    const kart = el("div", { class: "kart" },
      el("strong", { metin: "#" + s.id + " " + s.neden }), " · " + (s.sayi || 1) + " şikayetçi · " + zaman(s.zaman),
      el("div", { class: "kucuk", metin: "Hedef: " + s.hedef + " · Şikayetçi: " + s.sikayetci }),
      s.aciklama ? el("pre", { metin: s.aciklama }) : null,
      s.karar ? el("div", { class: "kucuk", metin: "Karar: " + s.durum + " · " + s.karar.kim + " · " + s.karar.gerekce }) : null,
      el("button", { class: "ikincil", metin: "Hedefi aç", tik: (e) => dugme(e.target, "#oyuncuHata", () => oyuncuAra("hesap=" + encodeURIComponent(s.hedef))) }));
    if (s.durum === "acik" && s.kendi) kart.append(el("div", { class: "hata", metin: "Sizin hakkınızda: karar veremezsiniz." }));
    else if (s.durum === "acik") {
      const g = el("textarea", { placeholder: "Gerekçe (en az 10 karakter)" });
      const tur = el("select", {}, el("option", { value: "susturma", metin: "susturma" }), el("option", { value: "uzaklastirma", metin: "geçici uzaklaştırma" }), el("option", { value: "kaliciUzaklastirma", metin: "kalıcı uzaklaştırma" }));
      const gun = el("input", { type: "number", min: "1", value: "1" });
      const karar = (k2) => async () => {
        const govde = { id: s.id, karar: k2, gerekce: g.value, istekNo: istekNo() };
        if (k2 === "yaptirim") { govde.tur = tur.value; if (tur.value !== "kaliciUzaklastirma") govde.gun = Number(gun.value); }
        await api("POST", "sikayet-karar", govde); await sikayetYukle();
      };
      kart.append(el("div", { class: "satir" }, tur, gun), g,
        el("button", { metin: "Yaptırım uygula", tik: (e) => dugme(e.target, "#sikayetHata", karar("yaptirim")) }),
        el("button", { class: "ikincil", metin: "Reddet", tik: (e) => dugme(e.target, "#sikayetHata", karar("reddet")) }));
    }
    k.append(kart);
  }
}

async function parametreYukle() {
  const v = await api("GET", "parametreler");
  const k = $("#parametreListe"); k.textContent = "";
  for (const p of v.parametreler) {
    const yeni = el("input", { type: "number", step: p.tam ? "1" : "any", value: String(p.deger) });
    const g = el("input", { placeholder: "Gerekçe (en az 10 karakter)" });
    const gecmis = el("details", {}, el("summary", { metin: "Geçmiş (sürüm " + p.surum + ")" }));
    for (const s of p.gecmis) gecmis.append(el("div", { class: "kucuk", metin: "s" + s.surum + " " + s.islem + ": " + s.onceki + " → " + s.deger + " · " + s.kim + " · " + zaman(s.zaman) + " · " + s.gerekce }));
    k.append(el("div", { class: "kart" },
      el("strong", { metin: p.ad }), " = " + p.deger + (p.deger !== p.varsayilan ? " (varsayılan " + p.varsayilan + ")" : " (varsayılan)"),
      el("div", { class: "kucuk", metin: p.aciklama + " · sınır " + p.alt + "–" + p.ust + (p.tam ? " (tam sayı)" : "") + " · " + p.kaynak + " · " + (p.uygulama === "Y1" ? "yönetim modülünde çalışma anında okunur" : "YerleşimDO/HesapDO her istekte çalışma anında okur") }),
      el("div", { class: "satir" }, yeni, g),
      el("button", { metin: "Kaydet", tik: (e) => dugme(e.target, "#parametreHata", async () => { await api("POST", "parametre", { ad: p.ad, deger: Number(yeni.value), gerekce: g.value, istekNo: istekNo() }); await parametreYukle(); }) }),
      el("button", { class: "ikincil", metin: "Geri al", tik: (e) => dugme(e.target, "#parametreHata", async () => { await api("POST", "parametre-geri", { ad: p.ad, gerekce: g.value, istekNo: istekNo() }); await parametreYukle(); }) }),
      gecmis));
  }
}

async function ekonomiYukle() {
  const v = await api("GET", "ekonomi");
  const fmt = (n) => Number(n || 0).toLocaleString("tr-TR");
  const t = $("#ekonomiToplam"); t.textContent = "";
  const o = v.toplam;
  t.append(el("div", { class: "satir" },
    el("div", { class: "kart" }, el("strong", { metin: fmt(o.oyuncuSayisi) }), el("div", { class: "kucuk", metin: "Oyuncu" })),
    el("div", { class: "kart" }, el("strong", { metin: fmt(o.toplamAkce) }), el("div", { class: "kucuk", metin: "Oyuncu cüzdanlarındaki akçe" })),
    el("div", { class: "kart" }, el("strong", { metin: fmt(o.acikSiparis) }), el("div", { class: "kucuk", metin: "Açık lonca siparişi" })),
    el("div", { class: "kart" }, el("strong", { metin: fmt(o.kasabaStokAdet) }), el("div", { class: "kucuk", metin: "Kasaba stok adedi" }))));
  t.append(el("div", { class: "kucuk", metin: "Cüzdan medyanı " + fmt(o.medyanAkce) + " · ortalama " + fmt(o.ortalamaAkce) + " · aralık " + fmt(o.enDusukAkce) + "–" + fmt(o.enYuksekAkce) + " akçe" }));
  t.append(el("div", { class: "kucuk", metin: "Son 12 ay: gelir +" + fmt(o.son12Ay.gelir) + " · gider -" + fmt(o.son12Ay.gider) + " · net " + fmt(o.son12Ay.net) + " akçe · NPC nüfusu " + fmt(o.npcSayisi) }));
  const k = $("#ekonomiListe"); k.textContent = "";
  for (const y of v.yerlesimler) {
    k.append(el("div", { class: "kart" },
      el("strong", { metin: y.ad }), " · " + y.beylik,
      el("div", { class: "kucuk", metin: "Oyuncu " + fmt(y.oyuncuSayisi) + " · NPC " + fmt(y.npcSayisi) + " · cüzdan toplamı " + fmt(y.toplamAkce) + " akçe" }),
      el("div", { class: "kucuk", metin: "Medyan " + fmt(y.medyanAkce) + " · ortalama " + fmt(y.ortalamaAkce) + " · aralık " + fmt(y.enDusukAkce) + "–" + fmt(y.enYuksekAkce) }),
      el("div", { class: "kucuk", metin: "12 ay gelir +" + fmt(y.son12Ay.gelir) + " · gider -" + fmt(y.son12Ay.gider) + " · net " + fmt(y.son12Ay.net) + " · açık sipariş " + fmt(y.acikSiparis) + " · stok " + fmt(y.kasabaStokAdet) })));
  }
  $("#ekonomiEksik").textContent = v.eksikYerlesim ? "Ulaşılamayan yerleşim: " + fmt(v.eksikYerlesim) : "Tüm yerleşimler güncel.";
}
async function telafiYukle() {
  const v = await api("GET", "telafiler");
  const k = $("#telafiListe"); k.textContent = "";
  for (const x of v.telafiler) {
    const odul = x.tur === "akce" ? fmtAkce(x.tutar) : String(x.adet) + " × " + x.mal;
    k.append(el("div", { class: "kart" },
      el("strong", { metin: odul + " · " + (x.hedefAd || x.hedef) }),
      el("div", { class: "kucuk", metin: x.yerlesim + " · " + new Date(x.zaman).toLocaleString("tr-TR") + " · " + x.kim }),
      el("div", { class: "kucuk", metin: x.gerekce })));
  }
}
function fmtAkce(n) { return Number(n || 0).toLocaleString("tr-TR") + " akçe"; }
async function kayitYukle() {
  const v = await api("GET", "kayit" + (kayitImleci ? "?imlec=" + kayitImleci : ""));
  const k = $("#kayitListe");
  for (const r of v.kayitlar) {
    k.append(el("div", { class: "kart kucuk" }, el("strong", { metin: "#" + r.no + " " + r.islem + " · " + r.sonuc }),
      " · " + zaman(r.zaman) + " · " + r.kim + " (" + (r.rol || "rolsüz") + ")" + (r.hedef ? " · hedef " + r.hedef : ""),
      r.gerekce ? el("div", { metin: "Gerekçe: " + r.gerekce }) : null,
      r.ayrinti ? el("pre", { metin: JSON.stringify(r.ayrinti) }) : null));
  }
  kayitImleci = String(v.imlec);
  $("#kayitDaha").hidden = !v.dahaVar;
}

$("#girisDugme").addEventListener("click", (e) => dugme(e.target, "#girisHata", girisYap));
$("#cikisDugme").addEventListener("click", cikis);
$("#araDugme").addEventListener("click", (e) => dugme(e.target, "#oyuncuHata", () => {
  const q = $("#ara").value.trim();
  return oyuncuAra(($("#araTur").value === "hesap" ? "hesap=" : "ad=") + encodeURIComponent(q));
}));
$("#yUygula").addEventListener("click", (e) => dugme(e.target, "#oyuncuHata", yaptirimUygula));
$("#yKaldir").addEventListener("click", (e) => dugme(e.target, "#oyuncuHata", yaptirimKaldir));
$("#sYenile").addEventListener("click", (e) => dugme(e.target, "#sikayetHata", sikayetYukle));
$("#eYenile").addEventListener("click", (e) => dugme(e.target, "#ekonomiHata", ekonomiYukle));
$("#tYenile").addEventListener("click", (e) => dugme(e.target, "#telafiHata", telafiYukle));
$("#tTur").addEventListener("change", () => { const akce = $("#tTur").value === "akce"; $("#tAkceAlan").hidden = !akce; $("#tEsyaAlan").hidden = akce; });
$("#tGonder").addEventListener("click", (e) => dugme(e.target, "#telafiHata", async () => {
  const tur = $("#tTur").value;
  const govde = { hedef: $("#tHedef").value.trim(), tur, gerekce: $("#tGerekce").value, istekNo: istekNo() };
  if (tur === "akce") govde.tutar = Number($("#tTutar").value);
  else { govde.mal = $("#tMal").value.trim(); govde.adet = Number($("#tAdet").value); }
  await api("POST", "telafi", govde);
  await telafiYukle();
}));
$("#dGonder").addEventListener("click", (e) => dugme(e.target, "#duyuruHata", async () => {
  await api("POST", "duyuru", { metin: $("#dMetin").value, gerekce: $("#dGerekce").value, istekNo: istekNo() });
  $("#dMetin").value = ""; $("#dGerekce").value = ""; $("#duyuruHata").textContent = "Duyuru kaydedildi.";
}));
$("#rKaydet").addEventListener("click", (e) => dugme(e.target, "#rolHata", async () => {
  const rol = $("#rRol").value || null;
  const v = await api("POST", "rol", { eposta: $("#rEposta").value, rol, gerekce: $("#rGerekce").value, istekNo: istekNo() });
  $("#rolHata").textContent = "Roller: " + JSON.stringify(v.roller);
}));
$("#etkYenile").addEventListener("click", (e) => dugme(e.target, "#etkHata", etkinlikYukle));
$("#etkNufusDugme").addEventListener("click", (e) => dugme(e.target, "#etkHata", nufusYukle));
$("#kayitDaha").addEventListener("click", (e) => dugme(e.target, "#kayitHata", kayitYukle));
if (belirtec) yukle().catch((e) => { cikis(); hataYaz("#girisHata", e); });
`;

const GOVDE = `<header><h1>Kronikler Online · Yönetim</h1><div><span id="benBilgi"></span>
<button class="ikincil" id="cikisDugme">Çıkış</button></div></header>
<nav id="sekmeler" hidden aria-label="Bölümler"></nav>
<main>
<section id="girisBolum"><h2>Giriş</h2>
<p class="kucuk">Google kimlik belirtecini (ID token) yapıştırın. Yalnız kayıtlı yönetici e-postaları girebilir; her deneme kayda geçer.</p>
<label for="token">Google ID token</label><textarea id="token" autocomplete="off" spellcheck="false"></textarea>
<button id="girisDugme">Giriş</button><div class="hata" id="girisHata"></div></section>

<section data-yetki="etkinlikGor" id="etkinlikBolum" hidden><h2>Etkinlikler</h2>
<p class="kucuk">Her kartta kapsamı seç: bütün dünya, bir beylik, bütün şehirler/kasabalar/köyler ya da tek bir şehir, kasaba veya köy. Bir etkinliği seçip <b>Eventi başlat</b>'a bastığın an oyunda açılır; <b>Eventi durdur</b> anında kapatır (oyuncunun bir sonraki dokunuşunda söner). Hepsi ücretsiz, herkese eşit; kaçıran bir şey kaybetmez. Başlatma ve durdurma yalnız Kurucu; her işlem kayda geçer.</p>
<button class="ikincil" id="etkYenile">Yenile</button><button class="ikincil" id="etkNufusDugme" data-gerek="ekonomi">Oyuncu sayılarını getir</button><div class="hata" id="etkHata"></div><div class="kucuk" id="etkBilgi" role="status"></div>
<h3>Şu an açık</h3><div id="etkAcik"></div>
<details><summary>Bölgelere göre oyuncu sayısı</summary><div id="etkNufus" class="tablo"><p class="kucuk">"Oyuncu sayılarını getir"e bas: her yerleşimin oyuncu sayısı burada ve seçim listelerinde görünür.</p></div></details>
<h3>Etkinlik listesi</h3><div id="etkKatalog" class="etkIzgara"></div>
<h3>Geçmiş</h3><div id="etkGecmis"></div></section>

<section data-yetki="ben" hidden><h2>Ben</h2><div id="benYetki" class="kucuk"></div></section>

<section data-yetki="telafi" hidden><h2>Oyuncu telafisi</h2>
<p class="kucuk">Yalnız Kurucu. Hedefin kendi hesabın veya aynı hane kümen olması reddedilir. Her işlem gerekçe ve tekrar güvenli istek numarasıyla kaydedilir.</p>
<label>Hedef hesap kimliği <input id="tHedef" autocomplete="off"></label>
<label>Telafi türü <select id="tTur"><option value="akce">Akçe</option><option value="esya">Eşya</option></select></label>
<div id="tAkceAlan"><label>Akçe (1–10.000) <input id="tTutar" type="number" min="1" max="10000" value="100"></label></div>
<div id="tEsyaAlan" hidden><label>Mal kimliği <input id="tMal" autocomplete="off"></label><label>Adet (1–50) <input id="tAdet" type="number" min="1" max="50" value="1"></label></div>
<label>Gerekçe (10–240 karakter) <textarea id="tGerekce" rows="3"></textarea></label>
<button id="tGonder">Telafiyi uygula</button><button class="ikincil" id="tYenile">Geçmişi yenile</button><div class="hata" id="telafiHata"></div><div id="telafiListe"></div></section>

<section data-yetki="ekonomi" hidden><h2>Ekonomi sağlığı</h2>
<p class="kucuk">Yerleşim bazında kimliksiz toplulaştırılmış cüzdan bakiyesi, 12 aylık gelir-gider, stok ve açık sipariş özeti.</p>
<button class="ikincil" id="eYenile">Yenile</button><div class="hata" id="ekonomiHata"></div><div id="ekonomiToplam"></div><div id="ekonomiEksik" class="kucuk"></div><div id="ekonomiListe"></div></section>

<section data-yetki="oyuncuGor" hidden><h2>Oyuncu ara ve yaptırım</h2>
<div class="satir"><select id="araTur"><option value="ad">Ada göre</option><option value="hesap">Hesap kimliğine göre</option></select>
<input id="ara" placeholder="Ad ya da hesap kimliği"></div>
<button id="araDugme">Ara</button><div class="hata" id="oyuncuHata"></div>
<div id="oyuncuSonuc"></div>
<div id="yaptirimForm" hidden>
<label for="yTur">Yaptırım</label>
<div class="satir"><select id="yTur"><option value="susturma">Susturma</option><option value="uzaklastirma">Geçici uzaklaştırma</option><option value="kaliciUzaklastirma">Kalıcı uzaklaştırma (kurucu)</option></select>
<input id="yGun" type="number" min="1" value="1" aria-label="Gün"></div>
<label for="yGerekce">Gerekçe (zorunlu, en az 10 karakter)</label><textarea id="yGerekce"></textarea>
<button id="yUygula">Uygula</button>
<div class="satir"><select id="kTur" aria-label="Kaldırılacak tür"><option value="">Etkin olanların hepsi</option><option value="susturma">Susturma</option><option value="uzaklastirma">Geçici uzaklaştırma</option><option value="kaliciUzaklastirma">Kalıcı uzaklaştırma</option></select></div>
<button class="ikincil" id="yKaldir">Yaptırımı kaldır</button></div></section>

<section data-yetki="sikayetGor" hidden><h2>Şikayet kuyruğu</h2>
<div class="satir"><select id="sDurum"><option value="acik">Açık</option><option value="reddedildi">Reddedilen</option><option value="yaptirim">Yaptırımla kapanan</option></select></div>
<button class="ikincil" id="sYenile">Yenile</button><div class="hata" id="sikayetHata"></div><div id="sikayetListe"></div></section>

<section data-yetki="parametreGor" hidden><h2>Parametreler</h2>
<p class="kucuk">Değerler sürümlenir; Y2 ekonomi ve hız parametreleri YerleşimDO/HesapDO tarafından çalışma anında okunur.</p>
<div class="hata" id="parametreHata"></div><div id="parametreListe"></div></section>

<section data-yetki="duyuru" hidden><h2>Duyuru</h2>
<label for="dMetin">Metin (oyunculara görünür, en çok 500 karakter)</label><textarea id="dMetin"></textarea>
<label for="dGerekce">Gerekçe</label><input id="dGerekce">
<button id="dGonder">Duyur</button><div class="hata" id="duyuruHata"></div></section>

<section data-yetki="rolVer" hidden><h2>Roller</h2>
<div class="satir"><input id="rEposta" type="email" placeholder="E-posta"><select id="rRol"><option value="moderator">Moderatör</option><option value="">Rolü al</option></select></div>
<label for="rGerekce">Gerekçe</label><input id="rGerekce">
<button id="rKaydet">Kaydet</button><div class="hata" id="rolHata"></div></section>

<section data-yetki="kayitGor" hidden><h2>İşlem kaydı</h2>
<p class="kucuk">Yalnız eklenir; silinemez, düzenlenemez.</p>
<div class="hata" id="kayitHata"></div><div id="kayitListe" class="tablo"></div>
<button class="ikincil" id="kayitDaha" hidden>Daha eski</button></section>
</main>`;

export const PANEL_HTML = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer"><title>Kronikler Yönetim</title>
<style>${STIL}</style></head><body>
${GOVDE}
<script>${BETIK}</script></body></html>`;

async function ozet(metin: string): Promise<string> {
  const baytlar = new Uint8Array(await crypto.subtle.digest("SHA-256", utf8(metin)));
  let ikili = "";
  for (const b of baytlar) ikili += String.fromCharCode(b);
  return `'sha256-${btoa(ikili)}'`;
}

let csp: string | undefined;

/** Satır içi betik ve stil yalnız özetleriyle izinlidir; başka hiçbir kaynak, çerçeveleme ve form gönderimi yok. */
export async function panelCsp(): Promise<string> {
  csp ??= [
    "default-src 'none'",
    `script-src ${await ozet(BETIK)}`,
    `style-src ${await ozet(STIL)}`,
    "connect-src 'self'",
    "img-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
  return csp;
}

export async function panelYaniti(): Promise<Response> {
  return new Response(PANEL_HTML, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": await panelCsp(),
      "x-frame-options": "DENY",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "cache-control": "no-store",
    },
  });
}

/** Testler için: CSP özetinin hesaplandığı içerik. */
export const PANEL_PARCALARI = { STIL, BETIK } as const;
