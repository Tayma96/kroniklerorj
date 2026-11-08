// GET /yonetim: tek sayfalık yönetici paneli (ana tasarım §7.3-7.4). Yönetici aracıdır; oyuncu metni değildir,
// bu yüzden yalnız Türkçedir. Dış kaynak yoktur; satır içi CSS/JS, sıkı CSP ile özetleri (sha256) üzerinden izinlidir.
// Sunucudan gelen her metin textContent ile yazılır (innerHTML yok): oyuncu adı/şikayet metni betik olamaz.

import { utf8 } from "../b64.ts";

const STIL = `
:root{color-scheme:light dark;--z:#f6f3ee;--y:#1d1b18;--c:#d9d2c7;--v:#8a3b12;--k:#b3261e;--i:#fff}
@media (prefers-color-scheme:dark){:root{--z:#16140f;--y:#ece6dc;--c:#3a352d;--v:#e08a4f;--k:#f2b8b5;--i:#211e18}}
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
}

async function yukle() {
  const ben = await api("GET", "ben");
  yetkiler = ben.yetkiler;
  $("#girisBolum").hidden = true;
  $("#benBilgi").textContent = ben.eposta + " · " + ben.rol + (ben.ortamKurucusu ? " (ortam)" : "");
  $("#benYetki").textContent = "Yetkiler: " + ben.yetkiler.join(", ");
  for (const s of document.querySelectorAll("section[data-yetki]")) s.hidden = !yetkiler.includes(s.dataset.yetki);
  if (yetkiler.includes("sikayetGor")) await sikayetYukle();
  if (yetkiler.includes("parametreGor")) await parametreYukle();
  if (yetkiler.includes("kayitGor")) { kayitImleci = ""; $("#kayitListe").textContent = ""; await kayitYukle(); }
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
  await api("POST", "yaptirim", govde);
  $("#yGerekce").value = "";
  await oyuncuAra("hesap=" + encodeURIComponent(seciliHesap));
}
async function yaptirimKaldir() {
  const govde = { hedef: seciliHesap, gerekce: $("#yGerekce").value, istekNo: istekNo() };
  if ($("#kTur").value) govde.tur = $("#kTur").value;
  await api("POST", "yaptirim-kaldir", govde);
  $("#yGerekce").value = "";
  await oyuncuAra("hesap=" + encodeURIComponent(seciliHesap));
}

async function sikayetYukle() {
  const v = await api("GET", "sikayetler?durum=" + $("#sDurum").value);
  const k = $("#sikayetListe"); k.textContent = "";
  k.append(el("div", { class: "kucuk", metin: "Açık toplam: " + v.toplamAcik }));
  for (const s of v.sikayetler) {
    const kart = el("div", { class: "kart" },
      el("strong", { metin: "#" + s.id + " " + s.neden }), " · " + zaman(s.zaman),
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
      el("div", { class: "kucuk", metin: p.aciklama + " · sınır " + p.alt + "–" + p.ust + (p.tam ? " (tam sayı)" : "") + " · " + p.kaynak + " · " + (p.uygulama === "Y1" ? "çalışma anında okunur" : "Y2: yalnız saklanır, oyun henüz okumaz") }),
      el("div", { class: "satir" }, yeni, g),
      el("button", { metin: "Kaydet", tik: (e) => dugme(e.target, "#parametreHata", async () => { await api("POST", "parametre", { ad: p.ad, deger: Number(yeni.value), gerekce: g.value, istekNo: istekNo() }); await parametreYukle(); }) }),
      el("button", { class: "ikincil", metin: "Geri al", tik: (e) => dugme(e.target, "#parametreHata", async () => { await api("POST", "parametre-geri", { ad: p.ad, gerekce: g.value, istekNo: istekNo() }); await parametreYukle(); }) }),
      gecmis));
  }
}

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
$("#dGonder").addEventListener("click", (e) => dugme(e.target, "#duyuruHata", async () => {
  await api("POST", "duyuru", { metin: $("#dMetin").value, gerekce: $("#dGerekce").value, istekNo: istekNo() });
  $("#dMetin").value = ""; $("#dGerekce").value = ""; $("#duyuruHata").textContent = "Duyuru kaydedildi.";
}));
$("#rKaydet").addEventListener("click", (e) => dugme(e.target, "#rolHata", async () => {
  const rol = $("#rRol").value || null;
  const v = await api("POST", "rol", { eposta: $("#rEposta").value, rol, gerekce: $("#rGerekce").value, istekNo: istekNo() });
  $("#rolHata").textContent = "Roller: " + JSON.stringify(v.roller);
}));
$("#kayitDaha").addEventListener("click", (e) => dugme(e.target, "#kayitHata", kayitYukle));
if (belirtec) yukle().catch((e) => { cikis(); hataYaz("#girisHata", e); });
`;

const GOVDE = `<header><h1>Kronikler Online · Yönetim</h1><div><span id="benBilgi"></span>
<button class="ikincil" id="cikisDugme">Çıkış</button></div></header>
<main>
<section id="girisBolum"><h2>Giriş</h2>
<p class="kucuk">Google kimlik belirtecini (ID token) yapıştırın. Yalnız kayıtlı yönetici e-postaları girebilir; her deneme kayda geçer.</p>
<label for="token">Google ID token</label><textarea id="token" autocomplete="off" spellcheck="false"></textarea>
<button id="girisDugme">Giriş</button><div class="hata" id="girisHata"></div></section>

<section data-yetki="ben" hidden><h2>Ben</h2><div id="benYetki" class="kucuk"></div></section>

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
<p class="kucuk">Y1: değerler saklanır ve sürümlenir. "Y2" işaretliler oyun modüllerince henüz okunmaz.</p>
<div class="hata" id="parametreHata"></div><div id="parametreListe"></div></section>

<section data-yetki="duyuru" hidden><h2>Duyuru</h2>
<label for="dMetin">Metin (oyunculara görünür, en çok 500 karakter)</label><textarea id="dMetin"></textarea>
<label for="dGerekce">Gerekçe</label><input id="dGerekce">
<button id="dGonder">Duyur</button><div class="hata" id="duyuruHata"></div></section>

<section data-yetki="rolVer" hidden><h2>Roller</h2>
<div class="satir"><input id="rEposta" type="email" placeholder="E-posta"><select id="rRol"><option value="moderator">Moderatör</option><option value="kurucu">Kurucu</option><option value="">Rolü al</option></select></div>
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
