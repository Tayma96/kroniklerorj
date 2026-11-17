// Han masa oyunları, masa akışı: soket komutları, kişiye özel yayın ve gizli bilgi sızmazlığı (izin listesi),
// yeniden bağlanma, kopma/terk, tekrar güvenliği, sahne/atışma ile çakışma, canlı masalar vitrini (saf + uçtan uca).
import test from "node:test";
import assert from "node:assert/strict";
import { ayril, baglan, iletiIsle, type MasaBaglami } from "../src/han/masa.ts";
import { OYUN_KOPMA_SABRI_MS, type MasaOyunu, type OyunGorunumu } from "../src/han/oyun/cati.ts";
import { VITRIN_BAYAT_MS, vitrinBudar, vitrinListesi, vitrinUygula, type VitrinKaydi } from "../src/han/oyun/vitrin.ts";
import isleyici, { DunyaDO, HesapDO, IsletmeDO, MasaDO, YerlesimDO, YonetimDO } from "../src/index.ts";
import type { SunucuIletisi } from "../src/han/tipler.ts";
import type { Env } from "../src/tipler.ts";
import { bilet, hibernasyonlu, sahteAraclar, sahteMasa, sahteSoket, type SahteSoket, type SahteWebSoket } from "./han-yardimci.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteAdAlani, sahteJwks } from "./yardimci.ts";

const TOHUM = "gizli-sunucu-tohumu-0f0f0f0f0f0f";

/** sahteMasa + masa oyunu kaydı (DO'daki gibi bağlamda taşınır, yazılınca saklanır). */
function oyunluMasa() {
  const m = sahteMasa();
  let oyun: MasaOyunu | undefined;
  const baglam = (): MasaBaglami => ({
    ...m.baglam(),
    ...(oyun ? { oyun: structuredClone(oyun) } : {}),
    oyunYaz: (o) => {
      oyun = o ? structuredClone(o) : undefined;
    },
    tohumUret: () => TOHUM,
  });
  return {
    m,
    baglam,
    get oyun() {
      return oyun;
    },
    gir(hesap: string): SahteSoket {
      const s = sahteSoket();
      baglan(baglam(), s, bilet(hesap, hesap.toUpperCase()));
      m.soketler.push(s);
      return s;
    },
    async yolla(s: SahteSoket, ileti: unknown) {
      m.ileri(1000);
      await iletiIsle(baglam(), s, JSON.stringify(ileti));
    },
    cik(s: SahteSoket) {
      ayril(baglam(), s);
    },
  };
}
type Masa = ReturnType<typeof oyunluMasa>;
const sonOyun = (s: SahteSoket) => s.son("oyun")?.oyun ?? null;
const hataKodu = (s: SahteSoket) => s.son("hata")?.hata;

async function canakKur(kisiler = ["ali", "veli"], seyirci = ["deli"]) {
  const x = oyunluMasa();
  const ss = kisiler.map((h) => x.gir(h));
  const sy = seyirci.map((h) => x.gir(h));
  for (const s of ss) await x.yolla(s, { t: "otur" });
  await x.yolla(ss[0]!, { t: "oyunAc", oyun: "canak" });
  for (const s of ss.slice(1)) await x.yolla(s, { t: "oyunKatil" });
  await x.yolla(ss[0]!, { t: "oyunBaslat" });
  return { x, ss, sy };
}

/** Bir sokete giden bütün oyun yükleri (hosgeldin dahil). */
function oyunYukleri(s: SahteSoket): OyunGorunumu[] {
  const r: OyunGorunumu[] = [];
  for (const g of s.giden as SunucuIletisi[]) {
    if (g.t === "oyun" && g.oyun) r.push(g.oyun);
    if (g.t === "hosgeldin" && g.oyun) r.push(g.oyun);
  }
  return r;
}

test("Masa oyunu: oturan açar, oturan katılır, kurucu başlatır; oturmayan açamaz/katılamaz; herkes görür", async () => {
  const x = oyunluMasa();
  const a = x.gir("ali");
  const v = x.gir("veli");
  const d = x.gir("deli");
  await x.yolla(a, { t: "oyunAc", oyun: "canak" });
  assert.equal(hataKodu(a), "oturmuyor");
  await x.yolla(a, { t: "otur" });
  await x.yolla(v, { t: "otur" });
  await x.yolla(a, { t: "oyunAc", oyun: "tavla" });
  assert.equal(hataKodu(a), "oyun_turu_gecersiz");
  await x.yolla(a, { t: "oyunAc", oyun: "canak" });
  assert.deepEqual(sonOyun(d)?.oyuncular.map((o) => o.hesap), ["ali"], "seyirci de görür");
  await x.yolla(d, { t: "oyunKatil" });
  assert.equal(hataKodu(d), "oturmuyor");
  await x.yolla(a, { t: "oyunBaslat" });
  assert.equal(hataKodu(a), "oyuncu_az");
  await x.yolla(v, { t: "oyunKatil" });
  await x.yolla(v, { t: "oyunBaslat" });
  assert.equal(hataKodu(v), "yetki_yok");
  await x.yolla(a, { t: "oyunBaslat" });
  const g = sonOyun(d)!;
  assert.deepEqual([g.asama, g.n, g.sira, typeof g.taahhut], ["oyun", 0, "ali", "string"]);
  assert.equal(x.oyun?.tohum, TOHUM, "tohum yalnız depoda");
});

test("Masa oyunu: gizli zar yalnız sahibinin soketine gider — izin listesi ve sızma taraması (oyuncu, seyirci, yeni gelen)", async () => {
  const { x, ss, sy } = await canakKur(["ali", "veli", "can"], ["deli"]);
  const [a, v, c] = ss as [SahteSoket, SahteSoket, SahteSoket];
  await x.yolla(a, { t: "hamle", n: 0, hamle: { yenile: [1] } });
  await x.yolla(v, { t: "hamle", n: 1, hamle: { tut: true } });
  const geç = x.gir("gec"); // ayakta yeni gelen
  const zar = (x.oyun!.d as { zarlar: number[][] }).zarlar;
  const UST = new Set(["id", "tur", "asama", "kurucu", "enAz", "enCok", "oyuncular", "n", "sira", "taahhut", "durum", "ben", "dagit", "pasAcik", "sabir"]);
  const DURUM = new Set(["acan", "cikti", "el", "elEnCok", "gecmis", "hedef", "kazanc", "yeniledi"]);
  const kisiler: [SahteSoket, number | null][] = [[a, 0], [v, 1], [c, 2], [sy[0]!, null], [geç, null]];
  for (const [s, i] of kisiler) {
    const yukler = oyunYukleri(s);
    assert.ok(yukler.length > 0);
    for (const g of yukler) {
      for (const k of Object.keys(g)) assert.ok(UST.has(k), `beklenmeyen alan ${k}`);
      if (g.durum) for (const k of Object.keys(g.durum)) assert.ok(DURUM.has(k), `beklenmeyen durum alanı ${k}`);
      if (g.ben) {
        assert.notEqual(i, null, "seyirciye gizli ek gitmez");
        assert.deepEqual(Object.keys(g.ben).sort(), ["elim", "zarlarim"]);
      }
      assert.ok(!JSON.stringify(g).includes(TOHUM), "tohum sızmaz");
    }
    const son = yukler.at(-1)!;
    if (i === null) assert.equal(son.ben, undefined);
    else assert.deepEqual(son.ben?.zarlarim, zar[i], "kendi zarı");
  }
  // Açık bilgi: kaç zar yenilendiği görünür, değerleri görünmez.
  assert.deepEqual(sonOyun(sy[0]!)?.durum?.yeniledi, [1, 0, null]);
});

test("Masa oyunu: aynı hamle iki kez gelirse bir kez uygulanır; ikincisine hata değil güncel görünüm döner", async () => {
  const { x, ss } = await canakKur();
  const [a, v] = ss as [SahteSoket, SahteSoket];
  await x.yolla(a, { t: "hamle", n: 0, hamle: { tut: true } });
  assert.equal(x.oyun!.n, 1);
  const hataOnce = a.hepsi("hata").length;
  const vOnce = v.hepsi("oyun").length;
  await x.yolla(a, { t: "hamle", n: 0, hamle: { tut: true } });
  assert.equal(x.oyun!.n, 1, "ikinci kez uygulanmadı");
  assert.equal(a.hepsi("hata").length, hataOnce);
  assert.equal(sonOyun(a)?.n, 1);
  assert.equal(v.hepsi("oyun").length, vOnce, "başkasına yayın yok");
  await x.yolla(v, { t: "hamle", n: 5, hamle: { tut: true } });
  assert.equal(hataKodu(v), "hamle_no");
  await x.yolla(v, { t: "hamle", n: 1, hamle: { yenile: [9] } });
  assert.equal(hataKodu(v), "hamle_gecersiz");
});

test("Masa oyunu: kopan oyuncu yeniden bağlanınca kendi zarını yeniden alır; yok işareti silinir", async () => {
  const { x, ss, sy } = await canakKur();
  const [a] = ss as [SahteSoket, SahteSoket];
  const zarim = sonOyun(a)!.ben!.zarlarim;
  x.cik(a);
  assert.equal(typeof sonOyun(sy[0]!)?.oyuncular[0]?.yok, "number", "kopma herkese görünür");
  const a2 = x.gir("ali");
  const h = a2.son("hosgeldin")!;
  assert.deepEqual(h.oyun?.ben?.zarlarim, zarim, "yeniden bağlanınca durum yeniden gönderilir");
  assert.equal(h.oyun?.sira, "ali");
  await x.yolla(a2, { t: "hamle", n: 0, hamle: { tut: true } });
  assert.equal(x.oyun!.n, 1, "dönen oyuncu oynar (oturmasa da)");
  assert.equal(x.oyun!.yok.ali, undefined);
});

test("Masa oyunu: uzun süre dönmeyenin sırası cezasız geçilir ya da oyun dağıtılır; masa kilitlenmez", async () => {
  const { x, ss } = await canakKur(["ali", "veli", "can"], []);
  const [a, v, c] = ss as [SahteSoket, SahteSoket, SahteSoket];
  x.cik(a);
  await x.yolla(v, { t: "oyunPas", n: 0 });
  assert.equal(hataKodu(v), "pas_yok", "sabır dolmadan pas yok (hamle için zamanlayıcı değil)");
  x.m.ileri(OYUN_KOPMA_SABRI_MS);
  await x.yolla(v, { t: "oyunPas", n: 0 });
  assert.equal(x.oyun!.n, 1);
  assert.equal(sonOyun(c)?.sira, "veli");
  await x.yolla(v, { t: "oyunDagit" });
  assert.equal(x.oyun!.asama, "oyun");
  assert.deepEqual(sonOyun(c)?.dagit, ["veli"]);
  await x.yolla(c, { t: "oyunDagit" });
  assert.deepEqual([x.oyun!.asama, x.oyun!.sonuc], ["bitti", { tur: "dagildi", kazanan: [] }]);
  assert.equal(sonOyun(c)?.tohum, TOHUM, "bitince tohum denetim için açıklanır");
  await x.yolla(c, { t: "oyunKapat" });
  assert.equal(x.oyun, undefined);
  assert.equal(c.son("oyun")?.oyun, null);
});

test("Masa oyunu: oyuncu çekilir (iki kişilikte oyun sonuçsuz dağılır); beklemede kalkan listeden düşer", async () => {
  const x = oyunluMasa();
  const a = x.gir("ali");
  const v = x.gir("veli");
  await x.yolla(a, { t: "otur" });
  await x.yolla(v, { t: "otur" });
  await x.yolla(a, { t: "oyunAc", oyun: "dokuztas" });
  await x.yolla(v, { t: "oyunKatil" });
  await x.yolla(a, { t: "kalk" });
  assert.deepEqual([x.oyun?.kurucu, x.oyun?.oyuncular], ["veli", ["veli"]]);
  await x.yolla(a, { t: "otur" });
  await x.yolla(a, { t: "oyunKatil" });
  await x.yolla(v, { t: "oyunBaslat" });
  await x.yolla(v, { t: "hamle", n: 0, hamle: { koy: 0 } });
  assert.deepEqual((sonOyun(a)?.durum?.tahta as number[])[0], 0);
  assert.equal(sonOyun(a)?.ben, undefined, "dokuz taşta gizli bilgi yok");
  await x.yolla(a, { t: "oyunAyril" });
  assert.deepEqual(x.oyun?.sonuc, { tur: "dagildi", kazanan: [] });
});

test("Masa oyunu: sahne/atışma ile aynı anda olmaz", async () => {
  const { x, ss } = await canakKur();
  await x.yolla(ss[0]!, { t: "sahneAc" });
  assert.equal(hataKodu(ss[0]!), "masa_mesgul");
  const y = oyunluMasa();
  const a = y.gir("ali");
  await y.yolla(a, { t: "otur" });
  await y.yolla(a, { t: "sahneAc" });
  await y.yolla(a, { t: "oyunAc", oyun: "canak" });
  assert.equal(hataKodu(a), "masa_mesgul");
});

// ---------------------------------------------------------------- vitrin

test("Vitrin: bildirim uygulanır, eski z yok sayılır, özet yoksa silinir, bayat kayıt düşer; gizli alan yok", () => {
  const k: VitrinKaydi = {};
  const z = 1_800_000_000_000;
  assert.equal(vitrinUygula(k, { han: 1, masa: 2, ozet: { tur: "canak", asama: "bekleme", oyuncu: 2, enCok: 4, seyirci: 3 }, z }), true);
  assert.equal(vitrinUygula(k, { han: 2, masa: 1, ozet: { tur: "dokuztas", asama: "oyun", oyuncu: 2, enCok: 2, seyirci: 0 }, z }), true);
  assert.equal(vitrinUygula(k, { han: 1, masa: 2, z: z - 1 }), false, "eski z");
  for (const kotu of [{ han: 0, masa: 1, z }, { han: 1, masa: 1, ozet: { tur: "x", asama: "oyun", oyuncu: 1, enCok: 2, seyirci: 0 }, z }, { han: 1, masa: 1, ozet: { tur: "canak", asama: "oyun", oyuncu: 9, enCok: 4, seyirci: 0 }, z }]) {
    assert.equal(vitrinUygula(k, kotu), false);
  }
  const l = vitrinListesi(k, z);
  assert.deepEqual(l, [
    { han: 1, masa: 2, oyun: "canak", asama: "bekleme", oyuncu: 2, enCok: 4, bos: 2, seyirci: 3, katilabilir: true },
    { han: 2, masa: 1, oyun: "dokuztas", asama: "oyun", oyuncu: 2, enCok: 2, bos: 0, seyirci: 0, katilabilir: false },
  ]);
  assert.equal(vitrinUygula(k, { han: 2, masa: 1, z: z + 1 }), true);
  assert.equal(vitrinListesi(k, z).length, 1);
  assert.equal(vitrinListesi(k, z + VITRIN_BAYAT_MS + 1).length, 0, "bayat görünmez");
  assert.equal(vitrinBudar(k, z + VITRIN_BAYAT_MS + 1), true);
  assert.deepEqual(k, {});
});

test("Uçtan uca: masa oyunu DO'da sürer, vitrinde görünür, DO uyanınca durum korunur, gizli zar başkasına gitmez", async () => {
  const anahtar = await rsaAnahtari("kid-masaoyun");
  const eskiFetch = globalThis.fetch;
  globalThis.fetch = sahteJwks([anahtar]).getir;
  try {
    const saat = Date.now();
    const araclar = sahteAraclar();
    const env = { GOOGLE_CLIENT_ID: ISTEMCI, OTURUM_ANAHTARI: "o".repeat(48) } as Env;
    const masalar = sahteAdAlani((ctx) => new MasaDO(hibernasyonlu(ctx), env, araclar));
    Object.assign(env, {
      HESAP: sahteAdAlani((ctx) => new HesapDO(ctx, env)),
      DUNYA: sahteAdAlani((ctx) => new DunyaDO(ctx, env)),
      YONETIM: sahteAdAlani((ctx) => new YonetimDO(ctx, env)),
      YERLESIM: sahteAdAlani((ctx) => new YerlesimDO(ctx, env, () => saat)),
      MASA: masalar,
      ISLETME: sahteAdAlani((ctx) => new IsletmeDO(ctx, env, () => saat)),
    });
    let sayac = 0;
    const cagir = async (yontem: string, yol: string, s: { govde?: unknown; oturum?: string; baslik?: Record<string, string> } = {}) => {
      const basliklar: Record<string, string> = { ...s.baslik };
      if (s.oturum) basliklar.authorization = `Bearer ${s.oturum}`;
      const y = await isleyici.fetch(new Request(`https://kronikler-online.test${yol}`, { method: yontem, headers: basliklar, body: s.govde === undefined ? null : JSON.stringify(s.govde) }), env);
      return { durum: y.status, govde: (await y.json()) as Record<string, any> };
    };
    const oyuncu = async (sub: string, ad: string) => {
      const t = await jwtImzala(anahtar, googleYuku(saat, { sub, given_name: ad }));
      const oturum = (await cagir("POST", "/v1/giris", { govde: { idToken: t } })).govde.oturum as string;
      const p = await cagir("POST", "/v1/profil", { oturum, govde: { ad, cinsiyet: "kadın", yerlesim: "demirhan", istekNo: `masaoyun-${++sayac}` } });
      assert.equal(p.durum, 200, JSON.stringify(p.govde));
      return oturum;
    };
    const A = await oyuncu("160000000000000000001", "Ayşe");
    const B = await oyuncu("160000000000000000002", "Bora");
    const C = await oyuncu("160000000000000000003", "Cem");
    const bagla = async (o: string) => {
      await cagir("GET", "/v1/han/masa/3/baglan", { oturum: o, baslik: { upgrade: "websocket" } });
      return araclar.sunucular.at(-1)! as SahteWebSoket;
    };
    const a = await bagla(A);
    const b = await bagla(B);
    const c = await bagla(C);
    const masaAdi = [...masalar.ornekler.keys()][0]!;
    let masaDO = masalar.ornekler.get(masaAdi)!.ornek;
    const yolla = (s: SahteWebSoket, v: unknown) => masaDO.webSocketMessage(s, JSON.stringify(v));
    await yolla(a, { t: "otur" });
    await yolla(b, { t: "otur" });
    await yolla(a, { t: "oyunAc", oyun: "canak" });
    let v = await cagir("GET", "/v1/han/masalar", { oturum: C });
    assert.equal(v.durum, 200, JSON.stringify(v.govde));
    assert.deepEqual(v.govde.masalar, [{ han: 1, masa: 3, oyun: "canak", asama: "bekleme", oyuncu: 1, enCok: 4, bos: 3, seyirci: 2, katilabilir: true }]);
    await yolla(b, { t: "oyunKatil" });
    await yolla(a, { t: "oyunBaslat" });
    v = await cagir("GET", "/v1/han/masalar", { oturum: C });
    assert.deepEqual(v.govde.masalar.map((m: Record<string, unknown>) => [m.asama, m.oyuncu, m.seyirci, m.katilabilir]), [["oyun", 2, 1, false]]);
    const zarA = (a.son("oyun")!.oyun as OyunGorunumu).ben!.zarlarim;
    assert.ok(Array.isArray(zarA));
    const depoZar = ((masalar.ornekler.get(masaAdi)!.depolama.veri.get("oyun") as MasaOyunu).d as { zarlar: number[][] }).zarlar;
    assert.deepEqual(zarA, depoZar[0]);
    for (const s of [b, c]) {
      for (const g of s.giden) {
        if (g.t !== "oyun" || !g.oyun) continue;
        const ben = g.oyun.ben as { zarlarim?: number[] } | undefined;
        if (s === c) assert.equal(ben, undefined, "seyirciye gizli ek yok");
        else if (g.oyun.asama === "oyun") assert.deepEqual(ben?.zarlarim, depoZar[1], "B yalnız kendi zarını alır");
      }
    }
    // DO uyanışı: yeni örnek aynı depodan oyunu geri yükler.
    const kayit = masalar.ornekler.get(masaAdi)!;
    // Bağlı soketler yeni örneğe verilir (hibernation gibi); oyun depodan okunur: A'nın hamlesi geçer.
    const yeniCtx = hibernasyonlu({ id: masalar.idFromName("y"), storage: kayit.depolama } as unknown as DurableObjectState);
    yeniCtx.acceptWebSocket(a as unknown as WebSocket);
    yeniCtx.acceptWebSocket(b as unknown as WebSocket);
    yeniCtx.acceptWebSocket(c as unknown as WebSocket);
    masaDO = new MasaDO(yeniCtx, env, araclar);
    await yolla(a, { t: "hamle", n: 0, hamle: { tut: true } });
    assert.equal((b.son("oyun")!.oyun as OyunGorunumu).n, 1, "uyanıştan sonra durum korunur");
    assert.equal((b.son("oyun")!.oyun as OyunGorunumu).sira, (await cagir("GET", "/v1/profil", { oturum: B })).govde.hesapId);
  } finally {
    globalThis.fetch = eskiFetch;
  }
});
