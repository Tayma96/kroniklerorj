// Faz 16 handa sesli sohbet: gerçek Worker yönlendiricisi + gerçek DO'lar, sahte Realtime (gerçek ağ çağrısı yok).
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, MasaDO, YerlesimDO, YonetimDO } from "../src/index.ts";
import { REALTIME_KOK } from "../src/han/realtime.ts";
import { KAPANIS } from "../src/han/kurallar.ts";
import type { Env } from "../src/tipler.ts";
import { hibernasyonlu, sahteAraclar, type SahteWebSoket } from "./han-yardimci.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks, type TestAnahtari } from "./yardimci.ts";

type Yanit = { durum: number; govde: Record<string, any> };
type Cagri = { url: string; yontem: string; govde: any; yetki: string | null };

const TOKEN = "rt-gizli-uygulama-anahtari-9f3k";
const OFFER = "v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\n";
let sayac = 0;
const no = (): string => `ses-${String(++sayac).padStart(8, "0")}`;
let ortakAnahtar: TestAnahtari | undefined;

function sahteRealtime() {
  const cagrilar: Cagri[] = [];
  let oturum = 0;
  const getir = async (url: string, init: RequestInit): Promise<Response> => {
    const govde = init.body ? JSON.parse(String(init.body)) : undefined;
    cagrilar.push({ url, yontem: String(init.method), govde, yetki: new Headers(init.headers).get("authorization") });
    const json = (v: unknown) => new Response(JSON.stringify(v), { status: 200, headers: { "content-type": "application/json" } });
    if (url.endsWith("/sessions/new")) return json({ sessionId: `S${String(++oturum).padStart(4, "0")}` });
    if (url.endsWith("/tracks/new")) {
      const izler = govde.tracks as { location: string; mid?: string; trackName: string; sessionId?: string }[];
      if (izler[0]?.location === "local") return json({ sessionDescription: { type: "answer", sdp: "v=0 cevap" }, tracks: izler.map((t) => ({ mid: t.mid, trackName: t.trackName })) });
      return json({
        requiresImmediateRenegotiation: true,
        sessionDescription: { type: "offer", sdp: "v=0 teklif" },
        tracks: izler.map((t, i) => ({ mid: String(10 + i), trackName: t.trackName, sessionId: t.sessionId })),
      });
    }
    if (url.endsWith("/renegotiate")) return json({});
    if (url.endsWith("/tracks/close")) return json({ tracks: govde.tracks });
    return new Response("{}", { status: 404 });
  };
  return { cagrilar, getir, kapatmalar: () => cagrilar.filter((c) => c.url.endsWith("/tracks/close")) };
}

async function kur(sesAcik = true) {
  ortakAnahtar ??= await rsaAnahtari("kid-ses");
  const anahtar = ortakAnahtar;
  globalThis.fetch = sahteJwks([anahtar]).getir;
  const rt = sahteRealtime();
  const araclar = { ...sahteAraclar(), getir: rt.getir };
  const env = {
    GOOGLE_CLIENT_ID: ISTEMCI,
    OTURUM_ANAHTARI: "o".repeat(48),
    ...(sesAcik ? { REALTIME_APP_ID: "uygulama123", REALTIME_APP_TOKEN: TOKEN } : {}),
  } as Env;
  const hesap = sahteAdAlani((ctx) => new HesapDO(ctx, env));
  const masa = sahteAdAlani((ctx) => new MasaDO(hibernasyonlu(ctx), env, araclar));
  const yonetim = sahteAdAlani((ctx) => new YonetimDO(ctx, env));
  const dunya = sahteAdAlani((ctx) => new DunyaDO(ctx, env));
  const yerlesim = sahteAdAlani((ctx) => new YerlesimDO(ctx, env));
  Object.assign(env, { HESAP: hesap, MASA: masa, YONETIM: yonetim, DUNYA: dunya, YERLESIM: yerlesim });
  const simdi = Date.now();
  const cagir = async (yontem: string, yol: string, s: { govde?: unknown; oturum?: string; baslik?: Record<string, string> } = {}): Promise<Yanit> => {
    const basliklar: Record<string, string> = { ...s.baslik };
    if (s.oturum) basliklar.authorization = `Bearer ${s.oturum}`;
    if (s.govde !== undefined) basliklar["content-type"] = "application/json";
    const y = await isleyici.fetch(
      new Request(`https://kronikler-online.test${yol}`, { method: yontem, headers: basliklar, body: s.govde === undefined ? null : JSON.stringify(s.govde) }),
      env,
    );
    const metin = await y.text();
    assert.equal(metin.includes(TOKEN), false, "uygulama anahtarı hiçbir yanıtta yok");
    return { durum: y.status, govde: JSON.parse(metin) as Record<string, any> };
  };
  const oyuncu = async (sub: string, ad: string) => {
    const t = await jwtImzala(anahtar, googleYuku(simdi, { sub, given_name: ad }));
    const oturum = (await cagir("POST", "/v1/giris", { govde: { idToken: t } })).govde.oturum as string;
    const p = await cagir("POST", "/v1/profil", { oturum, govde: { ad, cinsiyet: "kadın", yerlesim: "kizilca", istekNo: no() } });
    assert.equal(p.durum, 200, `profil ${ad}`);
    return { oturum, hesap: p.govde.hesapId as string };
  };
  const baglan = async (oturum: string) => {
    const once = araclar.sunucular.length;
    await cagir("GET", "/v1/han/masa/1/baglan", { oturum, baslik: { upgrade: "websocket" } });
    assert.ok(araclar.sunucular.length > once);
    return araclar.sunucular.at(-1)!;
  };
  const masaOrnegi = () => {
    const k = masa.ornekler.get(masa.idFromName("masa:kizilca:menzil:1").toString());
    assert.ok(k);
    return k;
  };
  const yolla = (soket: SahteWebSoket, ileti: unknown) => masaOrnegi().ornek.webSocketMessage(soket, JSON.stringify(ileti));
  const ses = (oturum: string, alt: string, govde: unknown = {}) => cagir("POST", `/v1/han/masa/1/ses/${alt}`, { oturum, govde });
  const tumDepolar = () =>
    [hesap, masa, yonetim, dunya, yerlesim].flatMap((ns) => [...ns.ornekler.values()].map((o) => JSON.stringify([...o.depolama.veri.entries()])));
  return { rt, oyuncu, baglan, yolla, ses, tumDepolar, masaOrnegi };
}

test("ses yapılandırılmamışsa uçlar 503 ses_kapali, masa soketi nedeni bildirir", async () => {
  const { oyuncu, baglan, ses, rt } = await kur(false);
  const ayse = await oyuncu("120000000000000000201", "Ayşe");
  const a = await baglan(ayse.oturum);
  assert.deepEqual(a.son("hosgeldin")?.ses, { acik: false, neden: "yapilandirilmadi", yayin: [], konusan: [], kapali: [], soz: [] });
  const y = await ses(ayse.oturum, "oturum");
  assert.deepEqual([y.durum, y.govde.hata], [503, "ses_kapali"]);
  assert.equal(rt.cagrilar.length, 0, "Realtime'a hiç gidilmez");
});

test("oturan yayın açar, ayaktaki dinler; söz iste, masa başı kabulü, ses kesme ve atma yayını kapatır; ses saklanmaz", async () => {
  const { rt, oyuncu, baglan, yolla, ses, tumDepolar } = await kur();
  const ayse = await oyuncu("120000000000000000301", "Ayşe");
  const bora = await oyuncu("120000000000000000302", "Bora");
  const cem = await oyuncu("120000000000000000303", "Cem");

  assert.equal((await ses(ayse.oturum, "oturum")).govde.hata, "masada_degil", "masaya bağlı olmayan ses alamaz");
  const a = await baglan(ayse.oturum);
  const b = await baglan(bora.oturum);
  const c = await baglan(cem.oturum);
  assert.equal(a.son("hosgeldin")?.ses?.acik, true);
  await yolla(a, { t: "otur" });

  const ao = await ses(ayse.oturum, "oturum");
  assert.equal(ao.durum, 200, JSON.stringify(ao.govde));
  assert.deepEqual(ao.govde.ice, [{ urls: ["stun:stun.cloudflare.com:3478"] }]);
  assert.equal(JSON.stringify(ao.govde).includes("S0001"), false, "Realtime oturum kimliği istemciye gitmez");
  assert.equal(rt.cagrilar[0]?.url, `${REALTIME_KOK}/apps/uygulama123/sessions/new`);
  assert.equal(rt.cagrilar[0]?.yetki, `Bearer ${TOKEN}`);

  assert.equal((await ses(ayse.oturum, "yayin", { sdp: "bozuk", mid: "0" })).govde.hata, "gecersiz_istek");
  const ay = await ses(ayse.oturum, "yayin", { sdp: OFFER, mid: "0" });
  assert.equal(ay.durum, 200, JSON.stringify(ay.govde));
  assert.equal(ay.govde.sdp.type, "answer");
  const iz = ay.govde.iz as string;
  const ekle = rt.cagrilar.at(-1)!;
  assert.deepEqual(ekle.govde.tracks, [{ location: "local", mid: "0", trackName: iz }]);
  assert.deepEqual(b.son("sesDurum")?.ses.yayin, [{ hesap: ayse.hesap, iz }]);

  // Ayaktaki Bora: dinler ama yayın açamaz.
  await ses(bora.oturum, "oturum");
  assert.equal((await ses(bora.oturum, "yayin", { sdp: OFFER, mid: "0" })).govde.hata, "oturmuyor");
  const bd = await ses(bora.oturum, "dinle", { izler: [iz, "yok-boyle-iz"] });
  assert.equal(bd.durum, 200, JSON.stringify(bd.govde));
  assert.deepEqual(bd.govde.izler, [{ mid: "10", iz, hesap: ayse.hesap }]);
  assert.equal(bd.govde.yeniden, true);
  assert.deepEqual(rt.cagrilar.at(-1)!.govde.tracks, [{ location: "remote", sessionId: "S0001", trackName: iz }], "yayıncının oturumu sunucuda çözülür");
  assert.equal((await ses(bora.oturum, "anlas", { sdp: "v=0 cevap" })).durum, 200);
  assert.equal(rt.cagrilar.at(-1)!.yontem, "PUT");

  // Konuşma göstergesi yalnız yayındakinden.
  await yolla(a, { t: "konus", acik: true });
  assert.deepEqual(c.son("sesDurum")?.ses.konusan, [ayse.hesap]);
  await yolla(b, { t: "konus", acik: true });
  assert.equal(b.son("hata")?.hata, "ses_oturumu_yok");

  // Söz iste → masa başı (Ayşe) kabul eder → Bora oturur ve yayın açabilir.
  await yolla(b, { t: "sozIste" });
  assert.deepEqual(a.son("sesDurum")?.ses.soz.map((p) => p.hesap), [bora.hesap]);
  await yolla(c, { t: "sozVer", hedef: bora.hesap });
  assert.equal(c.son("hata")?.hata, "yetki_yok", "yalnız masa başı söz verir");
  await yolla(a, { t: "sozVer", hedef: bora.hesap });
  assert.equal(a.son("durum")?.masa.koltuklar[1]?.hesap, bora.hesap);
  assert.deepEqual(a.son("sesDurum")?.ses.soz, []);
  const by = await ses(bora.oturum, "yayin", { sdp: OFFER, mid: "1" });
  assert.equal(by.durum, 200, JSON.stringify(by.govde));

  // Masa başı Bora'nın sesini keser: yayın SFU'da zorla kapanır, yeniden açamaz; metin sohbeti sürer.
  const kapatOnce = rt.kapatmalar().length;
  await yolla(a, { t: "sesKapat", hedef: bora.hesap });
  const kapama = rt.kapatmalar().at(-1)!;
  assert.equal(rt.kapatmalar().length, kapatOnce + 1);
  assert.deepEqual([kapama.url.includes("/sessions/S0002/"), kapama.govde.force, kapama.govde.tracks], [true, true, [{ mid: "1" }]]);
  const sd = c.son("sesDurum")!.ses;
  assert.deepEqual([sd.yayin.map((y) => y.hesap), sd.kapali], [[ayse.hesap], [bora.hesap]]);
  assert.equal((await ses(bora.oturum, "yayin", { sdp: OFFER, mid: "2" })).govde.hata, "sesi_kesildi");
  await yolla(b, { t: "yaz", metin: "yazabilirim" });
  assert.equal(a.son("ileti")?.metin, "yazabilirim");
  await yolla(a, { t: "sesAc", hedef: bora.hesap });
  assert.deepEqual(c.son("sesDurum")?.ses.kapali, []);

  // Ayşe kalkınca kendi yayını kapanır.
  await yolla(a, { t: "kalk" });
  assert.equal(rt.kapatmalar().at(-1)!.url.includes("/sessions/S0001/"), true);
  assert.deepEqual(c.son("sesDurum")?.ses.yayin, []);

  // Bora yeniden yayında; masa başı artık Bora. Bora Cem'i... yerine: Ayşe oturur, Bora (masa başı) Ayşe'yi atar → yayını kapanır.
  assert.equal((await ses(bora.oturum, "yayin", { sdp: OFFER, mid: "3" })).durum, 200);
  await yolla(a, { t: "otur" });
  await ses(ayse.oturum, "yayin", { sdp: OFFER, mid: "4" });
  assert.equal(c.son("sesDurum")?.ses.yayin.length, 2);
  const once = rt.kapatmalar().length;
  await yolla(b, { t: "at", hedef: ayse.hesap });
  assert.equal(a.kapanis?.[0], KAPANIS.atildi);
  assert.equal(rt.kapatmalar().length, once + 1);
  assert.deepEqual(rt.kapatmalar().at(-1)!.govde.tracks, [{ mid: "4" }]);
  assert.deepEqual(c.son("sesDurum")?.ses.yayin.map((y) => y.hesap), [bora.hesap]);

  // Kendi isteğiyle kapatma (mikrofon kapalı) ve oturumu bırakma.
  const bk = await ses(bora.oturum, "kapat", { tum: true });
  assert.equal(bk.durum, 200, JSON.stringify(bk.govde));
  assert.deepEqual(c.son("sesDurum")?.ses.yayin, []);

  // Ses ve Realtime kimlikleri hiçbir depoya yazılmaz.
  for (const d of tumDepolar()) {
    assert.equal(d.includes("S0001") || d.includes("S0002") || d.includes(iz), false, "ses kimlikleri depoya yazılmaz");
  }
});

test("Y1 susturması yayını keser ve yeniden açtırmaz", async () => {
  const { rt, oyuncu, baglan, yolla, ses, masaOrnegi } = await kur();
  const ayse = await oyuncu("120000000000000000401", "Ayşe");
  const a = await baglan(ayse.oturum);
  await yolla(a, { t: "otur" });
  await ses(ayse.oturum, "oturum");
  assert.equal((await ses(ayse.oturum, "yayin", { sdp: OFFER, mid: "0" })).durum, 200);
  const y = await masaOrnegi().ornek.fetch(
    new Request("https://ic/", {
      method: "POST",
      body: JSON.stringify({ islem: "yaptirim", masa: "masa:kizilca:menzil:1", hesap: ayse.hesap, durum: { susturma: { bitis: null } } }),
    }),
  );
  assert.equal(y.status, 200);
  assert.deepEqual(rt.kapatmalar().at(-1)!.govde.tracks, [{ mid: "0" }]);
  assert.deepEqual(a.son("sesDurum")?.ses.yayin, []);
  assert.equal((await ses(ayse.oturum, "yayin", { sdp: OFFER, mid: "1" })).govde.hata, "susturuldu");
});
