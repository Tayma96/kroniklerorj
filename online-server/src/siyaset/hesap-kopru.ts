// HesapDO → YerlesimDO (doğrulanmış siyasi kimlik) → BolgeDO. İstemcinin kimlik/yetki iddiası kabul edilmez.
// Makam sahibi hesabın varlığı (yokluk kademesi) ana ekran isteklerinde seyrek yoklamayla BolgeDO'ya bildirilir.

import type { Depo } from "../depo.ts";
import { profilGetir, yerlesimeIlet } from "../mantik.ts";
import { hata, type Env, type Sonuc, type YerlesimIleti } from "../tipler.ts";
import { bolgeVar } from "./bolge.ts";
import { bolgeCagir } from "./ic.ts";
import { KAYIT } from "./sabitler.ts";
import type { SiyasiKimlik } from "./tipler.ts";

const MAKAM = "siyaset:makam";

interface MakamIzi {
  bolge: string;
  an: number;
}

async function kimlikAl(depo: Depo, hesapId: string, cagir: (i: YerlesimIleti) => Promise<Sonuc<unknown>>): Promise<Sonuc<SiyasiKimlik>> {
  const profil = await profilGetir(depo);
  if (!profil.ok) return profil;
  const r = await yerlesimeIlet(depo, { islem: "siyasetKimlik", hesapId }, cagir);
  if (!r.ok) return r;
  return { ok: true, deger: { ...(r.deger as Omit<SiyasiKimlik, "bolge">), bolge: profil.deger.beylik } };
}

async function izYaz(depo: Depo, sonuc: Sonuc<unknown>, simdi: number): Promise<void> {
  if (!sonuc.ok) return;
  const v = sonuc.deger as { gorunum?: { benim?: { makamlar: string[]; vekillikler: string[] }; bolge?: { id: string } }; benim?: { makamlar: string[]; vekillikler: string[] }; bolge?: { id: string } };
  const g = v.gorunum ?? v;
  if (!g.benim || !g.bolge) return;
  if (g.benim.makamlar.length + g.benim.vekillikler.length > 0) await depo.koy({ [MAKAM]: { bolge: g.bolge.id, an: simdi } satisfies MakamIzi });
  else if (await depo.al(MAKAM)) await depo.sil([MAKAM]);
}

export async function siyasetOku(
  depo: Depo,
  env: Env,
  hesapId: string,
  bolgeHam: string | null | undefined,
  sayfaHam: string | null | undefined,
  simdi: number,
  cagir: (i: YerlesimIleti) => Promise<Sonuc<unknown>>,
): Promise<Sonuc<unknown>> {
  const k = await kimlikAl(depo, hesapId, cagir);
  if (!k.ok) return k;
  const bolge = bolgeHam ? bolgeHam.slice(0, 32) : k.deger.bolge;
  if (!bolgeVar(bolge)) return hata("bolge_gecersiz");
  const sayfa = sayfaHam != null && /^[0-9]{1,6}$/.test(sayfaHam) ? Number(sayfaHam) : null;
  const r = await bolgeCagir(env, { islem: "gorunum", bolge, hesapId, kimlik: k.deger, kayitSayfa: sayfa });
  if (bolge === k.deger.bolge) await izYaz(depo, r, simdi);
  return r;
}

export async function siyasetYaz(depo: Depo, env: Env, hesapId: string, govde: unknown, simdi: number, cagir: (i: YerlesimIleti) => Promise<Sonuc<unknown>>): Promise<Sonuc<unknown>> {
  if (typeof govde !== "object" || govde === null || Array.isArray(govde)) return hata("gecersiz_istek");
  const k = await kimlikAl(depo, hesapId, cagir);
  if (!k.ok) return k;
  const r = await bolgeCagir(env, { islem: "yaz", bolge: k.deger.bolge, hesapId, kimlik: k.deger, govde });
  await izYaz(depo, r, simdi);
  return r;
}

/** Makam sahibi hesap: en çok KAYIT.yoklamaMs'de bir "buradayım" (yokluk kademesi; vekil/devir buna bağlı). */
export async function siyasetYoklama(depo: Depo, env: Env, hesapId: string, simdi: number): Promise<void> {
  if (!env.BOLGE) return;
  const iz = await depo.al<MakamIzi>(MAKAM);
  if (!iz || simdi - iz.an < KAYIT.yoklamaMs) return;
  await depo.koy({ [MAKAM]: { bolge: iz.bolge, an: simdi } });
  try {
    await bolgeCagir(env, { islem: "yoklama", bolge: iz.bolge, hesapId });
  } catch {
    // yoklama en iyi çabadır
  }
}
