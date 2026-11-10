// Han → YerlesimDO köprüsü (ikram ödemesi). Masa kontrolünden sonra HesapDO çağırır; YerlesimDO `hanIkram`
// işleminde (src/yerlesim/motor.ts) verenin akçesi `ikramOdemesi` ile düşer (NPC hancıda dünyadan çıkar) ve alanın
// verene teveccühü `teveccuhEkle(alan, veren, "ikram", ay, tutar)` ile yazılır. istekNo ile tekrar güvenlidir.

import { yerlesimCagir } from "../ic.ts";
import type { Env, Sonuc } from "../tipler.ts";
import type { IkramId } from "./ikram.ts";

export interface IkramOdemeGovdesi {
  hedef: string;
  ikram: IkramId;
  /** Sunucu menüsünden; YerlesimDO yine IKRAM_MENUSU'ndan yeniden hesaplar. */
  fiyat: number;
  istekNo: string;
}

/** HesapDO → YerlesimDO ileti biçimi (YerlesimIleti'nin `hanIkram` üyesi). */
export interface IkramOdemeIletisi {
  islem: "hanIkram";
  yerlesim: string;
  hesapId: string;
  govde: IkramOdemeGovdesi;
}

/** `fiyat`: oyuncu hanında çarpanlı menü fiyatı (Faz 12); yoksa sabit menü. */
export type IkramOdeyici = (ileti: IkramOdemeIletisi) => Promise<Sonuc<{ para: number; fiyat?: number }>>;

export function ikramOdeyici(env: Env): IkramOdeyici {
  return (ileti) => yerlesimCagir<{ para: number; fiyat?: number }>(env, ileti);
}
