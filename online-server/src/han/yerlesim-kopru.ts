// Han → YerlesimDO köprüsü (birleşmede bağlanacak). src/yerlesim/ bu dalda değiştirilmez.
//
// BİRLEŞMEDE YAPILACAK (ikram):
//  1. src/tipler.ts: GOVDELI_ISLEMLER'e "hanIkram" eklenir (YerlesimIleti otomatik genişler).
//  2. YerlesimDO / src/yerlesim/motor.ts: `hanIkram` işlemi: govde = IkramOdemeGovdesi. istekNo ile idempotent;
//     verenin parası `ikramOdemesi(k.pa, ikram)` (src/han/ikram.ts) ile düşülür (akçe dünyadan çıkar, batak sayılır);
//     `teveccuhEkle(k, alan=hedef, veren=hesapId, "ikram", ay)` çağrılır (çift başına ayda tek sefer izi orada);
//     yanıt basarili({ para }) | hata("para_yok" | "sakin_yok" | ...).
//  3. Aşağıdaki `ikramOde` gövdesi `yerlesimCagir(env, { islem: "hanIkram", yerlesim, hesapId, govde })` olur.
//  4. `teveccuhEkle` stub'ı silinip Faz 3'ün gerçek fonksiyonu içe aktarılır.

import { hata, type Env, type Sonuc } from "../tipler.ts";
import type { IkramId } from "./ikram.ts";
import type { AnonsTuru } from "./tipler.ts";

export interface IkramOdemeGovdesi {
  hedef: string;
  ikram: IkramId;
  /** Sunucu menüsünden; YerlesimDO yine IKRAM_MENUSU'ndan yeniden hesaplar. */
  fiyat: number;
  istekNo: string;
}

/** HesapDO → YerlesimDO ileti biçimi (YerlesimIleti'ye birleşmede eklenecek). */
export interface IkramOdemeIletisi {
  islem: "hanIkram";
  yerlesim: string;
  hesapId: string;
  govde: IkramOdemeGovdesi;
}

export type IkramOdeyici = (ileti: IkramOdemeIletisi) => Promise<Sonuc<{ para: number }>>;

/** Şimdilik kapalı: ödeme YerlesimDO'ya bağlanana kadar ikram yapılamaz (akçe hiç değişmez). */
export function ikramOdeyici(_env: Env): IkramOdeyici {
  return async () => hata("ikram_kapali");
}

/**
 * Faz 3 stub'ı (ana dalda src/yerlesim/ altında yazılıyor; aynı ad ve sıra). `alan`ın `veren`e teveccühünü artırır.
 * `k`: yerleşim durumu (Kasaba). Birleşmede gerçek fonksiyonla değiştirilir.
 */
export function teveccuhEkle(_k: unknown, _alan: string, _veren: string, _tur: AnonsTuru, _ay: number): void {
  // bilerek boş
}
