// Künye (oyuncu sayfası, YerlesimDO tarafı): hesabın güncel karakterinin YALNIZ herkese açık alanları. Akçe, envanter,
// beceri düğümleri, takat, ilişki haritası gibi özel veriler buraya hiç girmez; dönen alanlar KUNYE_ALANLARI ile
// birebirdir (izin listesi testi: test/kunye.test.ts). Çevrimiçi durum yalnız kaba kovadır (an verilmez).

import { AD_HAVUZLARI, type Dil } from "../icerik/adlar.ts";
import { KADEMELER } from "../icerik/meslekler.ts";
import { yerlesimBul } from "../dunya-veri.ts";
import { isletmeCoz } from "../mulk/kurallar.ts";
import { hanedanSoyadi, nesil, olduMu } from "../yerlesim/hanedan.ts";
import { adlandir, NAMLAR } from "../yerlesim/karakter.ts";
import { teveccuhKademesi } from "../yerlesim/teveccuh.ts";
import type { Karakter, Kasaba } from "../yerlesim/tipler.ts";
import { beylikAdi } from "./numara.ts";

/** [PARAMETRE] Son görülme bu kadar yeniyse "simdi" (çevrimiçi sayılır). */
export const DURUM_SIMDI_MS = 15 * 60_000;
/** [PARAMETRE] Son görülme bu kadar yeniyse "bugun"; daha eskiyse "uzak". */
export const DURUM_BUGUN_MS = 24 * 60 * 60_000;

/**
 * YerlesimDO'nun döndürdüğü alanlar (sıralı). HesapDO bunlara yalnız numara, ben ve ayniYerlesim ekler. `durum`
 * koşulludur (KUNYE_KOSULLU): yalnız kendisine ve aynı yerleşimdeki tanıdık/dostuna döner, yoksa alan hiç yoktur.
 */
export const KUNYE_ALANLARI = ["ad", "beylik", "durum", "hanedan", "isletmeler", "kisi", "meslek", "nam", "olu", "teveccuh", "yerlesim"] as const;
/** Koşullu alanlar: yalnız izinli izleyene döner (yoksa yanıtta anahtar da yok). */
export const KUNYE_KOSULLU: readonly (typeof KUNYE_ALANLARI)[number][] = ["durum"];

export type CevrimiciDurum = "simdi" | "bugun" | "uzak";

export interface KunyeGorunumu {
  ad: string;
  yerlesim: { id: string; ad: string };
  beylik: { id: string; ad: string };
  meslek: { ana: string | null; anaUnvan: string | null; yan: string | null; yanUnvan: string | null };
  hanedan: { soyad: string; nesil: number };
  nam: Record<(typeof NAMLAR)[number], number>;
  teveccuh: number;
  isletmeler: { tur: string; no: number; ad: string }[];
  /** Yalnız kendisine ve aynı yerleşimde kişinin tanıdık/dost saydığı izleyene; başkasına alan hiç dönmez. */
  durum?: CevrimiciDurum;
  olu: boolean;
  /** Sosyal eylemlere bağlanacak kimlik: yerleşim + yerel oyuncu kimliği (`/v1/oyuncu/:id`, dostluk, teklif...). */
  kisi: { yerlesim: string; id: string };
}

/** Son görülmeden kaba durum (an sızdırılmaz). Hiç görülmediyse uzak. */
export function durumKovasi(sonGorulme: number, simdi: number): CevrimiciDurum {
  if (!(sonGorulme > 0)) return "uzak";
  const fark = simdi - sonGorulme;
  if (fark <= DURUM_SIMDI_MS) return "simdi";
  if (fark <= DURUM_BUGUN_MS) return "bugun";
  return "uzak";
}

function unvan(kd: number | undefined): string | null {
  return kd === undefined ? null : (KADEMELER[kd] ?? null);
}

export function kunyeGorunumu(k: Kasaba, kar: Karakter, simdi: number, dil: Dil, durumGorur = true): KunyeGorunumu {
  const y = yerlesimBul(k.y);
  const beylik = y?.beylik ?? "";
  const ms = kar.ms;
  const ana = ms?.a || null;
  const yan = ms?.y || null;
  const soyadlar = AD_HAVUZLARI[dil].s.length ? AD_HAVUZLARI[dil].s : AD_HAVUZLARI.tr.s;
  const soyad = soyadlar[hanedanSoyadi(k, kar) % soyadlar.length] ?? "";
  const isletmeler: KunyeGorunumu["isletmeler"] = [];
  for (const [id, t] of Object.entries(k.mk?.t ?? {})) {
    if (t.s !== kar.o) continue;
    const c = isletmeCoz(id);
    if (c) isletmeler.push({ tur: c.tur, no: c.no, ad: t.y?.ad ?? "" });
  }
  isletmeler.sort((a, b) => (a.tur === b.tur ? a.no - b.no : a.tur < b.tur ? -1 : 1));
  return {
    ad: kar.ad,
    yerlesim: { id: k.y, ad: y?.ad ?? k.y },
    beylik: { id: beylik, ad: beylikAdi(beylik) },
    meslek: { ana, anaUnvan: ana ? unvan(ms?.s[ana]?.kd ?? 0) : null, yan, yanUnvan: yan ? unvan(ms?.s[yan]?.kd ?? 0) : null },
    hanedan: { soyad, nesil: nesil(kar) },
    nam: adlandir(NAMLAR, kar.nm),
    teveccuh: teveccuhKademesi(kar, k.ay),
    isletmeler,
    ...(durumGorur ? { durum: durumKovasi(kar.kz, simdi) } : {}),
    olu: olduMu(kar),
    kisi: { yerlesim: k.y, id: kar.o },
  };
}
