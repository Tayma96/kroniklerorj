// YonetimDO: tek örnek ("yonetim"). Yönetici rolleri, yalnız eklenen işlem kaydı, parametre katmanı, şikayet kuyruğu,
// yaptırım kayıtları ve duyurular. Yönetici başına oran sınırı burada (bellekte) uygulanır.
// İnce sarmalayıcıdır; kurallar src/yonetim/islem.ts'dedir.

import { doDepo, type Depo } from "./depo.ts";
import { dunyaCagir, hesapCagir, iletiOku, jsonYanit, yerlesimCagir } from "./ic.ts";
import { YERLESIMLER } from "./dunya-veri.ts";
import type { SiyasiKimlik } from "./siyaset/tipler.ts";
import { HIZ_PENCERESI_MS, hizKontrol, type HizDurumu } from "./mantik.ts";
import { basarili, hata, type Env, type Profil, type YonetimIleti } from "./tipler.ts";
import { etkinDeger, PARAMETRELER, type ParametreAdi, type ParametreKaydi } from "./yonetim/parametre.ts";
import { yonetimIsle, type YonetimBaglami } from "./yonetim/islem.ts";
import { kurucuListesi } from "./yonetim/yetki.ts";
import { masaAtmaKaydet } from "./han/y1-kayit.ts";
import { etkinlikCalisma } from "./etkinlik/yonetim.ts";
import { dunyaSurumu } from "./dunya-surumu.ts";

/** [PARAMETRE] Yönetici (e-posta) başına dakikadaki istek sınırı. */
export const YONETIM_HIZ_SINIRI = 60;
/** [PARAMETRE] Rolsüz giriş denemeleri için genel (herkes toplam) dakikalık tavan. */
export const YETKISIZ_GIRIS_DAKIKA = 20;
/**
 * Bellekteki hız sayaçlarının en çok sayısı. Dolunca yalnız süresi geçmiş pencereler atılır; hiçbiri geçmemişse
 * tabloda olmayan yeni e-posta `hiz_siniri` alır. Tablo topluca sıfırlanmaz (çok sayıda e-postayla bir kişinin
 * sayacını silmek mümkün olmasın). Bu yalnız bellek içi hız tablosudur; işlem kaydı ayrıdır ve hiç silinmez.
 */
export const HIZ_TABLOSU_EN_COK = 1000;

/** Saf: e-posta başına dakikalık sayaç; tablo doluysa yalnız eski pencereleri atar, topluca silmez. */
export function hizTablosuSay(
  tablo: Map<string, HizDurumu>,
  anahtar: string,
  simdi: number,
  sinir = YONETIM_HIZ_SINIRI,
  enCok = HIZ_TABLOSU_EN_COK,
): boolean {
  if (!tablo.has(anahtar) && tablo.size >= enCok) {
    const pencere = Math.floor(simdi / HIZ_PENCERESI_MS);
    for (const [k, d] of tablo) if (d.pencere < pencere) tablo.delete(k);
    if (tablo.size >= enCok) return false;
  }
  const h = hizKontrol(tablo.get(anahtar), simdi, sinir);
  tablo.set(anahtar, h.durum);
  return h.izin;
}

/** [PARAMETRE] Kurucu anahtarı: IP başına pencerede en çok başarısız deneme ve pencere süresi. */
export const ANAHTAR_IP_HATA = 5;
export const ANAHTAR_PENCERE_MS = 15 * 60_000;
/** [PARAMETRE] Kurucu anahtarı: bütün IP'ler toplamı saatlik başarısız deneme tavanı (dağıtık denemeye karşı). */
export const ANAHTAR_GENEL_HATA_SAATLIK = 30;

export interface AnahtarSayaci {
  ip: Map<string, { p: number; n: number }>;
  genel: { p: number; n: number };
}

export function anahtarSayaciYeni(): AnahtarSayaci {
  return { ip: new Map(), genel: { p: -1, n: 0 } };
}

/** Saf: bu IP şimdi deneyebilir mi (IP penceresi ve genel saatlik tavan dolmadıysa). */
export function anahtarIzin(s: AnahtarSayaci, ip: string, simdi: number): boolean {
  const p = Math.floor(simdi / ANAHTAR_PENCERE_MS);
  const g = Math.floor(simdi / 3_600_000);
  if (s.genel.p === g && s.genel.n >= ANAHTAR_GENEL_HATA_SAATLIK) return false;
  const k = s.ip.get(ip);
  return !(k && k.p === p && k.n >= ANAHTAR_IP_HATA);
}

/** Saf: başarısız denemeyi sayar; tablo HIZ_TABLOSU_EN_COK'u aşınca eski pencereler atılır. */
export function anahtarHataSay(s: AnahtarSayaci, ip: string, simdi: number): void {
  const p = Math.floor(simdi / ANAHTAR_PENCERE_MS);
  const g = Math.floor(simdi / 3_600_000);
  s.genel = s.genel.p === g ? { p: g, n: s.genel.n + 1 } : { p: g, n: 1 };
  if (!s.ip.has(ip) && s.ip.size >= HIZ_TABLOSU_EN_COK) for (const [k, d] of s.ip) if (d.p < p) s.ip.delete(k);
  const k = s.ip.get(ip);
  s.ip.set(ip, k && k.p === p ? { p, n: k.n + 1 } : { p, n: 1 });
}

export class YonetimDO {
  readonly #depo: Depo;
  readonly #env: Env;
  readonly #hiz = new Map<string, HizDurumu>();
  #yetkisiz: HizDurumu | undefined;
  readonly #anahtar = anahtarSayaciYeni();

  constructor(ctx: DurableObjectState, env: Env) {
    this.#depo = doDepo(ctx.storage);
    this.#env = env;
  }

  async fetch(istek: Request): Promise<Response> {
    const ileti = await iletiOku<YonetimIleti>(istek);
    if (!ileti) return jsonYanit(hata("gecersiz_istek"));
    const simdi = Date.now();
    if (ileti.islem === "parametrelerCalisma") {
      const adlar = Object.keys(PARAMETRELER) as ParametreAdi[];
      const kayitlar = await this.#depo.alCok<ParametreKaydi>(adlar.map((ad) => `param:${ad}`));
      const degerler: Record<string, unknown> = Object.fromEntries(adlar.map((ad) => [ad, etkinDeger(PARAMETRELER[ad], kayitlar.get(`param:${ad}`))]));
      // Canlı etkinlikler yalnız yerleşime gider (src/etkinlik/): her istekte okunduğu için başlatma/durdurma anlıktır.
      if (typeof ileti.yerlesim === "string") degerler.ETKINLIKLER = await etkinlikCalisma(this.#depo, ileti.yerlesim, simdi);
      return jsonYanit(basarili(degerler));
    }
    if (ileti.islem === "masaAtma") return jsonYanit(await masaAtmaKaydet(this.#depo, ileti));
    if (ileti.islem === "giris" || ileti.islem === "yonet") {
      if (!hizTablosuSay(this.#hiz, ileti.yonetici.eposta, simdi)) return jsonYanit(hata("hiz_siniri"));
    }
    const env = this.#env;
    const baglam: YonetimBaglami = {
      depo: this.#depo,
      simdi,
      kurucular: kurucuListesi(env.YONETICI_EPOSTALAR),
      oyuncuBul: (sorgu) => dunyaCagir<Profil>(env, { islem: "oyuncuBul", ...sorgu }),
      dunyaCagir: (i) => dunyaCagir(env, i),
      ayrintiOku: (yerlesim, hesapId) => yerlesimCagir(env, { islem: "yonetimAyrinti", yerlesim, hesapId }),
      dunyaSurumu: dunyaSurumu(env),
      ...(env.YONETIM_KURUCU_ANAHTARI ? { kurucuAnahtari: env.YONETIM_KURUCU_ANAHTARI } : {}),
      anahtarSiniri: {
        izin: (ip) => anahtarIzin(this.#anahtar, ip, simdi),
        hata: (ip) => anahtarHataSay(this.#anahtar, ip, simdi),
      },
      siyasiKimlikOku: (hesapId, yerlesim) => yerlesimCagir<SiyasiKimlik>(env, { islem: "siyasetKimlik", yerlesim, hesapId }),
      telafiYaz: (yerlesim, hedef, govde) => yerlesimCagir(env, { islem: "yonetimTelafi", yerlesim, hesapId: hedef, govde }),
      ekonomiOku: async () => {
        type Satir = { yerlesim: string; oyuncuSayisi: number; npcSayisi: number; toplamAkce: number; bakiyeler: number[]; ortalamaAkce: number; medyanAkce: number; enDusukAkce: number; enYuksekAkce: number; son12Ay: { gelir: number; gider: number; net: number }; kasabaStokAdet: number; acikSiparis: number; esya?: { efsanevi: number; tilsimli: number } };
        const sonuclar = await Promise.all(YERLESIMLER.map(async (y) => {
          try { return await yerlesimCagir<Satir>(env, { islem: "ekonomiSagligi", yerlesim: y.id }); }
          catch { return null; }
        }));
        const satirlar = sonuclar.flatMap((r, i) => r?.ok ? [{ ...r.deger, ad: YERLESIMLER[i]!.ad, beylik: YERLESIMLER[i]!.beylik }] : []);
        const topla = (alan: "oyuncuSayisi" | "npcSayisi" | "toplamAkce" | "kasabaStokAdet" | "acikSiparis") => satirlar.reduce((s, r) => s + r[alan], 0);
        const gelir = satirlar.reduce((s, r) => s + r.son12Ay.gelir, 0);
        const gider = satirlar.reduce((s, r) => s + r.son12Ay.gider, 0);
        const oyuncuSayisi = topla("oyuncuSayisi");
        const toplamAkce = topla("toplamAkce");
        const bakiyeler = satirlar.flatMap((r) => r.bakiyeler).sort((a, b) => a - b);
        const orta = Math.floor(bakiyeler.length / 2);
        const medyanAkce = bakiyeler.length === 0 ? 0 : bakiyeler.length % 2
          ? bakiyeler[orta]!
          : Math.round((bakiyeler[orta - 1]! + bakiyeler[orta]!) / 2);
        const yerlesimler = satirlar.map((r) => ({
          yerlesim: r.yerlesim, ad: r.ad, beylik: r.beylik, oyuncuSayisi: r.oyuncuSayisi, npcSayisi: r.npcSayisi,
          toplamAkce: r.toplamAkce, ortalamaAkce: r.ortalamaAkce, medyanAkce: r.medyanAkce,
          enDusukAkce: r.enDusukAkce, enYuksekAkce: r.enYuksekAkce, son12Ay: r.son12Ay,
          kasabaStokAdet: r.kasabaStokAdet, acikSiparis: r.acikSiparis,
          esya: r.esya ?? { efsanevi: 0, tilsimli: 0 },
        }));
        const esya = { efsanevi: satirlar.reduce((s, r) => s + (r.esya?.efsanevi ?? 0), 0), tilsimli: satirlar.reduce((s, r) => s + (r.esya?.tilsimli ?? 0), 0) };
        return basarili({
          yerlesimler: yerlesimler.sort((a, b) => a.ad.localeCompare(b.ad, "tr")),
          eksikYerlesim: YERLESIMLER.length - satirlar.length,
          toplam: {
            oyuncuSayisi, npcSayisi: topla("npcSayisi"), toplamAkce,
            ortalamaAkce: oyuncuSayisi ? Math.round(toplamAkce / oyuncuSayisi) : 0,
            medyanAkce, enDusukAkce: bakiyeler[0] ?? 0, enYuksekAkce: bakiyeler.at(-1) ?? 0,
            kasabaStokAdet: topla("kasabaStokAdet"), acikSiparis: topla("acikSiparis"),
            son12Ay: { gelir, gider, net: gelir - gider },
            esya,
          },
        });
      },
      hesabaYaz: (hedef, durum) => hesapCagir(env, hedef, { islem: "yaptirimYaz", hesapId: hedef, durum }),
      hesabaIlet: (hedef, ileti) => hesapCagir(env, hedef, ileti),
      yetkisizGirisIzni: () => {
        const h = hizKontrol(this.#yetkisiz, simdi, YETKISIZ_GIRIS_DAKIKA);
        this.#yetkisiz = h.durum;
        return h.izin;
      },
    };
    return jsonYanit(await yonetimIsle(baglam, ileti));
  }
}
