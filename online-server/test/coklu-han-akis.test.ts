// 4.9 Çoklu han uçtan uca: gerçek yönlendirici ve DO sınıfları. Şehirde 2. hanın edinimi, listede görünmesi, ayrı
// masa DO'su, ikramın o hanın kasasına gitmesi, aynı yerleşimde ikinci han reddi, eski isteğin 1. hana gitmesi,
// plaka kişi kartının (kisi, nam) MasaDO bilet çözümünden geçmesi.
import test from "node:test";
import assert from "node:assert/strict";
import isleyici, { DunyaDO, HesapDO, IsletmeDO, MasaDO, YerlesimDO, YonetimDO } from "../src/index.ts";
import type { Env } from "../src/tipler.ts";
import { oyunAyi } from "../src/saat.ts";
import { hibernasyonlu, sahteAraclar } from "./han-yardimci.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

type Nesne = Record<string, any>;
let sayac = 0;
const no = (): string => `cokhan-${String(++sayac).padStart(8, "0")}`;

test("4.9 uçtan uca: şehirde 2. han edinilir, listede görünür, masası ayrı, ikram o hanın kasasına", async () => {
  const anahtar = await rsaAnahtari("kid-cokhan");
  const eskiFetch = globalThis.fetch;
  globalThis.fetch = sahteJwks([anahtar]).getir;
  try {
    const saat = Date.now();
    const araclar = sahteAraclar();
    const env = { GOOGLE_CLIENT_ID: ISTEMCI, ZAR_YEDEK_IZINLI: "1", OTURUM_ANAHTARI: "o".repeat(48) } as Env;
    const yerlesimler = sahteAdAlani((ctx) => new YerlesimDO(ctx, env, () => saat));
    const masalar = sahteAdAlani((ctx) => new MasaDO(hibernasyonlu(ctx), env, araclar));
    const isletmeler = sahteAdAlani((ctx) => new IsletmeDO(ctx, env, () => saat));
    Object.assign(env, {
      HESAP: sahteAdAlani((ctx) => new HesapDO(ctx, env)),
      DUNYA: sahteAdAlani((ctx) => new DunyaDO(ctx, env)),
      YONETIM: sahteAdAlani((ctx) => new YonetimDO(ctx, env)),
      YERLESIM: yerlesimler,
      MASA: masalar,
      ISLETME: isletmeler,
    });
    const cagir = async (yontem: string, yol: string, s: { govde?: unknown; oturum?: string; baslik?: Record<string, string> } = {}) => {
      const basliklar: Record<string, string> = { ...s.baslik };
      if (s.oturum) basliklar.authorization = `Bearer ${s.oturum}`;
      const y = await isleyici.fetch(new Request(`https://kronikler-online.test${yol}`, { method: yontem, headers: basliklar, body: s.govde === undefined ? null : JSON.stringify(s.govde) }), env);
      return { durum: y.status, govde: (await y.json()) as Nesne };
    };
    const oyuncu = async (sub: string, ad: string) => {
      const t = await jwtImzala(anahtar, googleYuku(saat, { sub, given_name: ad }));
      const oturum = (await cagir("POST", "/v1/giris", { govde: { idToken: t } })).govde.oturum as string;
      const p = await cagir("POST", "/v1/profil", { oturum, govde: { ad, cinsiyet: "kadın", yerlesim: "demirhan", istekNo: no() } });
      assert.equal(p.durum, 200, JSON.stringify(p.govde));
      return oturum;
    };
    const A = await oyuncu("150000000000000000001", "Ayşe");
    const B = await oyuncu("150000000000000000002", "Bora");
    const C = await oyuncu("150000000000000000003", "Cem");

    // Ayşe'ye akçe, nam ve yaş; Cem'e ikram akçesi (depoda düzenleyip yerleşimi yeniden başlatır).
    const yId = env.YERLESIM.idFromName("yerlesim:demirhan");
    const kayit = yerlesimler.ornekler.get(yId.toString())!;
    const ay = oyunAyi(saat);
    const kar1 = kayit.depolama.veri.get("o:o1") as Nesne;
    Object.assign(kar1, { pa: 2000, nm: [30, 30, 0, 0], d: ay - 12 * 20 });
    kayit.depolama.veri.set("o:o1", kar1);
    const kar3 = kayit.depolama.veri.get("o:o3") as Nesne;
    Object.assign(kar3, { pa: 100, e: 9999 });
    kayit.depolama.veri.set("o:o3", kar3);
    yerlesimler.ornekler.set(yId.toString(), { ornek: new YerlesimDO({ id: yId, storage: kayit.depolama } as DurableObjectState, env, () => saat), depolama: kayit.depolama });

    const once = await cagir("GET", "/v1/han", { oturum: B });
    assert.equal(once.durum, 200, JSON.stringify(once.govde));
    assert.deepEqual(once.govde.hanlar.map((h: Nesne) => [h.no, h.sahip]), [[1, "npc"]], "sahipsiz arsa listede yok");
    assert.equal((await cagir("GET", "/v1/han?han=2", { oturum: B })).govde.hata, "han_yok");

    const e = await cagir("POST", "/v1/mulk/edin", { oturum: A, govde: { tur: "han", no: 2, istekNo: no() } });
    assert.equal(e.durum, 200, JSON.stringify(e.govde));
    assert.deepEqual([e.govde.edinim.isletme, e.govde.para], ["demirhan.han.2", 1400]);
    const ikinci = await cagir("POST", "/v1/mulk/edin", { oturum: A, govde: { tur: "han", istekNo: no() } });
    assert.deepEqual([ikinci.durum, ikinci.govde], [409, { hata: "han_siniri" }]);

    const l = await cagir("GET", "/v1/han?dil=tr", { oturum: B });
    assert.equal(l.govde.han.no, 1, "eski istek 1. hana");
    const h2 = l.govde.hanlar.find((h: Nesne) => h.no === 2);
    assert.deepEqual([h2.sahip, h2.sahipKisi.id, h2.acik, h2.oda.kapasite, h2.masa.sayi], ["oyuncu", "o1", true, 5, 8]);
    const l2 = await cagir("GET", "/v1/han?han=2", { oturum: B });
    assert.deepEqual([l2.govde.han.no, l2.govde.masalar.length], [2, 8]);

    // Bora 2. hanın 1. masasına oturur: masa DO'su ayrı; plaka kişi kartını taşır.
    await cagir("GET", "/v1/han/masa/1/baglan?han=2", { oturum: B, baslik: { upgrade: "websocket" } });
    const bSoket = araclar.sunucular.at(-1)!;
    assert.ok(masalar.ornekler.has(masalar.idFromName("masa:demirhan:han2:1").toString()));
    assert.equal(bSoket.son("hosgeldin")?.masa.no, 1);
    const ben = bSoket.son("hosgeldin")?.ben;
    assert.equal(ben?.kisi, "o2");
    assert.equal(typeof ben?.nam, "number");
    const masaDO = masalar.ornekler.get(masalar.idFromName("masa:demirhan:han2:1").toString())!.ornek;
    await masaDO.webSocketMessage(bSoket, JSON.stringify({ t: "otur" }));
    await cagir("GET", "/v1/han/masa/1/baglan?han=2", { oturum: C, baslik: { upgrade: "websocket" } });
    const cSoket = araclar.sunucular.at(-1)!;
    await masaDO.webSocketMessage(cSoket, JSON.stringify({ t: "otur" }));

    // Doluluk kaydı: 1. han seçiliyken 2. hanın masa özeti MasaDO bildiriminden gelir (canlı çağrı yok).
    const kartH2 = (await cagir("GET", "/v1/han", { oturum: A })).govde.hanlar.find((h: Nesne) => h.no === 2);
    assert.deepEqual(kartH2.masa, { sayi: 8, acik: 8, oturan: 2 });
    const hesapB = (await cagir("GET", "/v1/profil", { oturum: B })).govde.hesapId as string;
    const ik = await cagir("POST", "/v1/han/ikram", { oturum: C, govde: { masa: 1, han: 2, hedef: hesapB, ikram: "yemek", istekNo: no() } });
    assert.equal(ik.durum, 200, JSON.stringify(ik.govde));
    const panel = await cagir("GET", "/v1/isletme/demirhan.han.2", { oturum: A });
    assert.equal(panel.govde.isletme.kasa, ik.govde.fiyat, "ikram 2. hanın kasasına");
    // Aynı masa numarası 1. handa başka masadır: Bora orada oturmuyor.
    const yanlis = await cagir("POST", "/v1/han/ikram", { oturum: C, govde: { masa: 1, hedef: hesapB, ikram: "ekmek", istekNo: no() } });
    assert.equal(yanlis.durum >= 400, true, JSON.stringify(yanlis.govde));
  } finally {
    globalThis.fetch = eskiFetch;
  }
});
