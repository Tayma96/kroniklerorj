// Topluluk uçları (E5–E7; YerlesimDO → motor): meşrep, hami, ortak dert, şenlik, zaviye ve müdavim ziyareti. Yazma
// uçları motorun istekNo'lu kabuğundan geçer (`toplulukYaz`): aynı istekNo aynı yanıtı döndürür, ikinci kez etki
// üretmez; topluluk kaydı ("tl"), değişen öteki oyuncular ve defter birlikte yazılır. Müdavim ziyareti istemciden
// gelmez: HesapDO masa bileti kestiğinde iç çağrıdır (gün başına bir kez sayılır, doğal olarak tekrar güvenli).

import { hata, basarili, type Sonuc } from "../tipler.ts";
import { hamiGorunumu, hamiIslem } from "./hami.ts";
import { zaviyeIslem, zaviyeOzeti } from "./lonca-grup.ts";
import { mesrepGorunumu, mesrepSec } from "./mesrep.ts";
import type { YerlesimMotoru } from "./motor.ts";
import { mudavimGorunumu, mudavimZiyaret } from "./mudavim.ts";
import { dertGorunumu, ortakDertKatki, ORTAK_DERT_KURALLARI, uygunKatkilar } from "./ortak-dert.ts";
import { senlikGorunumu, senlikKatki } from "./senlik.ts";
import { gostergeGorunumu } from "./topluluk-kayit.ts";

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** GET /v1/topluluk?dil=: meşrep, hami, ortak dertler (defteriyle), şenlik (Cömertler Levhası), müdavim, zaviye,
 * bölge göstergeleri — bütün kurallar sayısıyla. */
export function toplulukOku(m: YerlesimMotoru, hesapId: string): Promise<Sonuc<unknown>> {
  return m.toplulukOku(hesapId, (kar, ay, simdi) => {
    const k = m.kasaba;
    const dertler = k.tl?.od ?? [];
    return basarili({
      mesrep: mesrepGorunumu(kar, ay),
      hami: hamiGorunumu(k, kar, ay),
      ortakDert: {
        acik: dertler.filter((d) => d.d === "acik").map((d) => dertGorunumu(d, kar)),
        son: dertler.filter((d) => d.d !== "acik").slice(-3).map((d) => dertGorunumu(d)),
        uygunKatkilarim: uygunKatkilar(kar),
        kurallar: ORTAK_DERT_KURALLARI,
      },
      senlik: senlikGorunumu(k, kar, ay),
      mudavim: mudavimGorunumu(kar, simdi, ay),
      zaviye: zaviyeOzeti(k, kar, ay),
      gostergeler: gostergeGorunumu(k),
    });
  });
}

/** POST /v1/mesrep {el, cesaret, gurur, istekNo}. */
export function mesrepUc(m: YerlesimMotoru, hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
  if (!nesneMi(govde)) return Promise.resolve(hata("gecersiz_istek"));
  return m.toplulukYaz(hesapId, govde, [], (kar, ay) => {
    const r = mesrepSec(kar, govde, ay);
    return r.ok ? basarili({ mesrep: mesrepGorunumu(kar, ay) }) : r;
  });
}

/** POST /v1/hami {islem, hedef, istekNo}. */
export function hamiUc(m: YerlesimMotoru, hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
  if (!nesneMi(govde)) return Promise.resolve(hata("gecersiz_istek"));
  const hedef = m.sakinKimligi(govde.hedef);
  return m.toplulukYaz(hesapId, govde, hedef ? [hedef] : [], (kar, ay, ek, simdi) => {
    const r = hamiIslem(m.kasaba, kar, govde, ay, simdi);
    if (!r.ok) return r;
    ek.olaylar.push(...r.deger.olaylar);
    ek.digerleri.push(...r.deger.digerleri);
    return basarili({ ...r.deger.yanit, hami: hamiGorunumu(m.kasaba, kar, ay) });
  });
}

/** POST /v1/ortak-dert {dert, katki, mal?, adet?, istekNo}. */
export function ortakDertUc(m: YerlesimMotoru, hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
  if (!nesneMi(govde)) return Promise.resolve(hata("gecersiz_istek"));
  return m.toplulukYaz(hesapId, govde, [], (kar, ay, ek) => {
    const r = ortakDertKatki(m.kasaba, kar, govde, ay);
    if (!r.ok) return r;
    ek.olaylar.push(...r.deger.olaylar);
    return basarili(r.deger.yanit);
  });
}

/** POST /v1/senlik {katki, mal?, adet?, tutar?, istekNo}. */
export function senlikUc(m: YerlesimMotoru, hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
  if (!nesneMi(govde)) return Promise.resolve(hata("gecersiz_istek"));
  return m.toplulukYaz(hesapId, govde, [], (kar, ay, ek) => {
    const r = senlikKatki(m.kasaba, kar, govde, ay);
    if (!r.ok) return r;
    ek.olaylar.push(...r.deger.olaylar);
    return basarili(r.deger.yanit);
  });
}

/** POST /v1/zaviye {islem, ..., istekNo}. Hedef ve (ver/oy için) üyeler önce yüklenir. */
export function zaviyeUc(m: YerlesimMotoru, hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
  if (!nesneMi(govde)) return Promise.resolve(hata("gecersiz_istek"));
  const hedef = m.sakinKimligi(govde.hedef);
  return m.toplulukYaz(hesapId, govde, hedef ? [hedef] : [], (kar, ay, ek) => {
    const r = zaviyeIslem(m.kasaba, kar, govde, ay);
    if (!r.ok) return r;
    ek.olaylar.push(...r.deger.olaylar);
    ek.digerleri.push(...r.deger.digerleri);
    return basarili({ ...r.deger.yanit, zaviyeler: zaviyeOzeti(m.kasaba, kar, ay) });
  });
}

/** İç (HesapDO masa bileti sonrası): han ziyareti sayılır; yeni rozet hancının tanıma olayını düşürür. */
export function mudavimUc(m: YerlesimMotoru, hesapId: string): Promise<Sonuc<unknown>> {
  return m.karakterYaz(hesapId, (kar, s, ay, simdi) => {
    const r = mudavimZiyaret(kar, simdi, ay);
    s.md = r.rozet || undefined;
    return basarili({ deger: { sayildi: r.sayildi, ziyaret: r.sayi, rozet: r.rozet }, olaylar: r.olay ? [r.olay] : [] });
  });
}
