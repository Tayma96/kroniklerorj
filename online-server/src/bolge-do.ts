// BolgeDO: bölge (valilik) başına bir örnek (idFromName("bolge:<id>")). Makamlar, seçimler, vali kasası, haraç
// outbox'ı, özerklik ve işlem kaydı (sayfalı, budanmaz). Ay dönümü DO alarmıyla ve her istekte tembel yetiştirmeyle
// (tekrar güvenli, ay sayacına bağlı). İşlemler tek sırada yürür (dış çağrı sırasında araya girme yok).
// İnce sarmalayıcıdır; kurallar src/siyaset/'tedir.

import { doDepo, type Depo } from "./depo.ts";
import { iletiOku, jsonYanit } from "./ic.ts";
import { istekNoCoz } from "./mantik.ts";
import { oyunAyi, sonrakiDonum } from "./saat.ts";
import { bolgeAyi, bolgeEylem, bolgeGorunumu, bolgeKur, bolgeVar, haracOnayla, vergiYatir } from "./siyaset/bolge.ts";
import { ittifakIstekAl, ittifakOnayAl, ittifakYanitAl, taninmaIstekAl, taninmaYanitAl } from "./siyaset/devlet.ts";
import { bolgeCagir, sultanlikCagir } from "./siyaset/ic.ts";
import { kimlikGor } from "./siyaset/makam.ts";
import { KAYIT } from "./siyaset/sabitler.ts";
import type { BolgeDurumu, BolgeIleti, KayitSatiri, SultanlikOzeti } from "./siyaset/tipler.ts";
import { basarili, hata, type Env, type Sonuc } from "./tipler.ts";

const DURUM = "bolge";
const IST = "ist:";
const SAYFA = "kayit:";
const VERGI = "vy:";
/** [PARAMETRE] Bir istekte yetiştirilecek en çok ay (uzun kesintide kalanı sonraki isteğe/alarma kalır). */
export const BOLGE_AZAMI_YETISTIRME = 24;

export class BolgeDO {
  readonly #depo: Depo;
  readonly #ctx: DurableObjectState;
  readonly #env: Env;
  readonly #saat: () => number;
  #durum: BolgeDurumu | undefined;
  #sira: Promise<unknown> = Promise.resolve();

  constructor(ctx: DurableObjectState, env: Env, saat: () => number = () => Date.now()) {
    this.#ctx = ctx;
    this.#depo = doDepo(ctx.storage);
    this.#env = env;
    this.#saat = saat;
  }

  #sirayla<T>(is: () => Promise<T>): Promise<T> {
    const p = this.#sira.then(is, is);
    this.#sira = p.catch(() => undefined);
    return p;
  }

  async fetch(istek: Request): Promise<Response> {
    const ileti = await iletiOku<BolgeIleti>(istek);
    if (!ileti || typeof ileti.bolge !== "string" || !bolgeVar(ileti.bolge)) return jsonYanit(hata("bolge_gecersiz"));
    return jsonYanit(await this.#sirayla(() => this.#isle(ileti, this.#saat())));
  }

  async alarm(): Promise<void> {
    await this.#sirayla(async () => {
      const d = await this.#ac(undefined, this.#saat());
      if (d) {
        await this.#yetistir(d, this.#saat());
        await this.#gonderDiplomasi(d);
      }
    });
  }

  async #ac(id: string | undefined, simdi: number): Promise<BolgeDurumu | undefined> {
    if (this.#durum && (id === undefined || this.#durum.id === id)) return this.#durum;
    const d = await this.#depo.al<BolgeDurumu>(DURUM);
    if (d) this.#durum = d;
    else if (id !== undefined) {
      this.#durum = bolgeKur(id, oyunAyi(simdi));
      await this.#kaydet(this.#durum, 0);
    }
    if (this.#durum && (await this.#ctx.storage.getAlarm()) === null) await this.#ctx.storage.setAlarm(sonrakiDonum(simdi));
    return this.#durum;
  }

  /** Durumu ve yeni kayıt satırlarını (sayfalara) yazar. */
  async #kaydet(d: BolgeDurumu, knOnce: number, ek: Record<string, unknown> = {}): Promise<void> {
    const yeni = d.kayit.filter((s) => s.n >= knOnce);
    const sayfalar = new Map<number, KayitSatiri[]>();
    for (const s of yeni) {
      const p = Math.floor(s.n / KAYIT.sayfa);
      if (!sayfalar.has(p)) sayfalar.set(p, (await this.#depo.al<KayitSatiri[]>(SAYFA + p)) ?? []);
      const liste = sayfalar.get(p)!;
      if (!liste.some((x) => x.n === s.n)) liste.push(s);
    }
    const yaz: Record<string, unknown> = { [DURUM]: d, ...ek };
    for (const [p, liste] of sayfalar) yaz[SAYFA + p] = liste;
    await this.#depo.koy(yaz);
  }

  /** Kaçırılan ay dönümleri: her ay işlenir, kaydedilir, sonra rapor + haraç Sultanlığa gider (outbox). */
  async #yetistir(d: BolgeDurumu, simdi: number): Promise<void> {
    const hedef = oyunAyi(simdi);
    if (hedef - d.ay > BOLGE_AZAMI_YETISTIRME) d.ay = hedef - BOLGE_AZAMI_YETISTIRME;
    while (d.ay < hedef) {
      const kn = d.kn;
      bolgeAyi(d, d.ay + 1, simdi);
      await this.#kaydet(d, kn);
      await this.#gonder(d);
    }
    await this.#ctx.storage.setAlarm(sonrakiDonum(simdi) + (d.id.length % 7) * 1000);
  }

  /** Yoldaki haraçları son raporla gönderir; Sultanlık anahtarla tekrar güvenlidir. Hata olursa sonra yeniden. */
  async #gonder(d: BolgeDurumu): Promise<void> {
    if (!d.sonRapor || !this.#env.SULTANLIK) return;
    const anahtarlar = Object.keys(d.yolda);
    const temsilci = d.koltuklar.find((k) => k.tur === "divanTemsilcisi")?.s;
    const isler = anahtarlar.length > 0 ? anahtarlar : [null];
    for (const anahtar of isler) {
      let r: Sonuc<SultanlikOzeti>;
      try {
        r = await sultanlikCagir<SultanlikOzeti>(this.#env, {
          islem: "rapor",
          bolge: d.id,
          rapor: d.sonRapor,
          harac: anahtar ? { anahtar, tutar: d.yolda[anahtar]! } : null,
          ...(temsilci ? { temsilci } : {}),
        });
      } catch {
        return;
      }
      if (!r.ok) return;
      if (anahtar) haracOnayla(d, anahtar);
      d.sultanlik = r.deger;
    }
    await this.#kaydet(d, d.kn);
  }

  /** Tanınma isteği/yanıtı outbox'ı: alıcı bölge kaydettiğini onaylayınca gönderim kaydı silinir. */
  async #gonderDiplomasi(d: BolgeDurumu): Promise<void> {
    const giden = d.diplomasiGiden ?? [];
    let degisti = false;
    for (const ileti of [...giden]) {
      let r: Sonuc<unknown>;
      try {
        switch (ileti.tur) {
          case "taninmaIstek":
            r = await bolgeCagir(this.#env, {
              islem: "taninmaIstekAl", bolge: ileti.hedef, kaynak: d.id,
              istekId: ileti.istekId, ay: ileti.ay, ad: ileti.ad,
            });
            break;
          case "taninmaYanit":
            r = await bolgeCagir(this.#env, {
              islem: "taninmaYanitAl", bolge: ileti.hedef, kaynak: d.id,
              istekId: ileti.istekId, karar: "karar" in ileti ? ileti.karar : "ret", ay: ileti.ay, ad: ileti.ad,
            });
            break;
          case "ittifakIstek":
            r = await bolgeCagir(this.#env, {
              islem: "ittifakIstekAl", bolge: ileti.hedef, kaynak: d.id,
              istekId: ileti.istekId, ay: ileti.ay, ad: ileti.ad,
            });
            break;
          case "ittifakYanit":
            r = await bolgeCagir(this.#env, {
              islem: "ittifakYanitAl", bolge: ileti.hedef, kaynak: d.id,
              istekId: ileti.istekId, karar: ileti.karar, ay: ileti.ay, ad: ileti.ad,
            });
            break;
          case "ittifakOnay":
            r = await bolgeCagir(this.#env, {
              islem: "ittifakOnayAl", bolge: ileti.hedef, kaynak: d.id,
              istekId: ileti.istekId, ay: ileti.ay, ad: ileti.ad,
            });
            break;
        }
      } catch {
        return;
      }
      if (!r.ok) return;
      const i = d.diplomasiGiden?.findIndex((x) => x.tur === ileti.tur && x.hedef === ileti.hedef && x.istekId === ileti.istekId) ?? -1;
      if (i >= 0) {
        d.diplomasiGiden!.splice(i, 1);
        degisti = true;
      }
    }
    if (degisti) await this.#kaydet(d, d.kn);
  }

  async #isle(ileti: BolgeIleti, simdi: number): Promise<Sonuc<unknown>> {
    const d = await this.#ac(ileti.bolge, simdi);
    if (!d) return hata("bolge_gecersiz");
    await this.#yetistir(d, simdi);
    // İç bölge iletilerinde karşı DO'ya geri çağrı yapma: DO→DO döngüsel beklemeyi önle.
    if (!["taninmaIstekAl", "taninmaYanitAl", "ittifakIstekAl", "ittifakYanitAl", "ittifakOnayAl"].includes(ileti.islem)) await this.#gonderDiplomasi(d);
    switch (ileti.islem) {
      case "taninmaIstekAl": {
        const h = taninmaIstekAl(d, ileti.kaynak, ileti.istekId, ileti.ay, ileti.ad);
        if (h) return hata(h);
        await this.#kaydet(d, d.kn);
        return basarili({ tamam: true });
      }
      case "ittifakIstekAl": {
        const h = ittifakIstekAl(d, ileti.kaynak, ileti.istekId, ileti.ay, ileti.ad);
        if (h) return hata(h);
        await this.#kaydet(d, d.kn);
        return basarili({ tamam: true });
      }
      case "ittifakYanitAl": {
        const h = ittifakYanitAl(d, ileti.kaynak, ileti.istekId, ileti.karar, ileti.ay, ileti.ad);
        if (h) return hata(h);
        await this.#kaydet(d, d.kn);
        return basarili({ tamam: true });
      }
      case "ittifakOnayAl": {
        const h = ittifakOnayAl(d, ileti.kaynak, ileti.istekId, ileti.ay, ileti.ad);
        if (h) return hata(h);
        await this.#kaydet(d, d.kn);
        return basarili({ tamam: true });
      }
      case "taninmaYanitAl": {
        const h = taninmaYanitAl(d, ileti.kaynak, ileti.istekId, ileti.karar, ileti.ay, ileti.ad);
        if (h) return hata(h);
        await this.#kaydet(d, d.kn);
        return basarili({ tamam: true });
      }
      case "gorunum": {
        if (ileti.kimlik) {
          const kn = d.kn;
          kimlikGor(d, ileti.kimlik, simdi);
          await this.#kaydet(d, kn);
        }
        const g = bolgeGorunumu(d, simdi, ileti.kimlik);
        const p = ileti.kayitSayfa;
        if (typeof p === "number" && Number.isInteger(p) && p >= 0) {
          return basarili({ ...g, kayitSayfasi: { sayfa: p, satirlar: (await this.#depo.al<KayitSatiri[]>(SAYFA + p)) ?? [] } });
        }
        return basarili(g);
      }
      case "yaz": {
        const no = istekNoCoz(ileti.govde);
        if (!no.ok) return no;
        const anahtar = IST + ileti.hesapId;
        const defter = (await this.#depo.al<[string, unknown][]>(anahtar)) ?? [];
        const onceki = defter.find((x) => x[0] === no.deger);
        if (onceki) return basarili(onceki[1]);
        const kn = d.kn;
        kimlikGor(d, ileti.kimlik, simdi);
        const govde = ileti.govde as Record<string, unknown>;
        const s = bolgeEylem(d, ileti.kimlik, govde, simdi);
        if (!s.ok) {
          await this.#kaydet(d, kn);
          return s;
        }
        const yanit = structuredClone({ sonuc: s.deger, gorunum: bolgeGorunumu(d, simdi, ileti.kimlik) });
        defter.push([no.deger, yanit]);
        if (defter.length > KAYIT.istekEnCok) defter.splice(0, defter.length - KAYIT.istekEnCok);
        await this.#kaydet(d, kn, { [anahtar]: defter });
        await this.#gonderDiplomasi(d);
        return basarili(yanit);
      }
      case "yoklama": {
        for (const k of d.koltuklar) {
          if (k.s.hesap === ileti.hesapId) k.s.sg = simdi;
          if (k.v?.hesap === ileti.hesapId) k.v.sg = simdi;
        }
        await this.#kaydet(d, d.kn);
        return basarili({ tamam: true });
      }
      case "vergiYatir": {
        if (typeof ileti.anahtar !== "string" || ileti.anahtar.length === 0 || ileti.anahtar.length > 128) return hata("gecersiz_istek");
        if (await this.#depo.al<number>(VERGI + ileti.anahtar)) return basarili({ kasa: d.kasa, tekrar: true });
        const kn = d.kn;
        const h = vergiYatir(d, ileti.tutar, ileti.yerlesim);
        if (h) return hata(h);
        await this.#kaydet(d, kn, { [VERGI + ileti.anahtar]: d.ay + 1 });
        return basarili({ kasa: d.kasa, tekrar: false });
      }
      default:
        return hata("gecersiz_istek");
    }
  }
}
