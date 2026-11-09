// NPC teklifleri (Faz 3a; tek oyunculu 3b'nin çevrimiçi karşılığı): ay dönümünde tanıdık ya da hane NPC'si oyuncuya
// iş teklif eder, borç ister ya da (16+) dünürcü olur. Oyuncu başına aynı anda tek NPC teklifi; 3 ay cevapsız kalırsa
// cezasız düşer; kapandıktan sonra NPC_TEKLIF_ARALIK ay yeni teklif gelmez (akçe kaynağı tavanlı).
// NPC borcu vadesinde aynen (faizsiz) döner; NPC ölürse batar. Dünürcü yalnız kayıttır (Faz 7'de evlilik).

import { MESLEKLER } from "../icerik/kisilik.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { varsayilanSonuc } from "./duzen.ts";
import { iliskiAl } from "./eylem.ts";
import { gorusDegeri } from "./gorus.ts";
import { beceriEkle, karakterYasi, takatHarca } from "./karakter.ts";
import { npcKimlik, npcRef, yas } from "./ortak.ts";
import { aralik, dizinSec, tohumlu } from "./rastgele.ts";
import { toplumAl, type NpcTeklifTuru, type Teklif } from "./toplum.ts";
import type { Karakter, Kasaba, Npc, OlayTaslagi } from "./tipler.ts";

/** [PARAMETRE] NPC teklifleri. */
export const NPC_TEKLIF_ORANI = 0.25;
export const NPC_TEKLIF_SURE = 3;
export const NPC_TEKLIF_ARALIK = 2;
export const NPC_TEKLIF_YASI = 13;
export const NPC_DUNUR_YASI = 16;
export const NPC_IS_UCRET = 4;
export const NPC_IS_TAKAT = 2;
export const NPC_IS_GORUS = 6;
export const NPC_BORC_ALT = 2;
export const NPC_BORC_UST = 6;
export const NPC_BORC_VADE = 6;
export const NPC_BORC_GORUS = 8;
const ISSIZ = MESLEKLER.indexOf("işsiz");

export function acikNpcTeklifi(k: Kasaba, o: string): Teklif | undefined {
  return k.tp?.tk.find((t) => t.a === o && t.d === "acik" && t.g.startsWith("n"));
}

function dunurAdayi(k: Kasaba, npc: Npc, kar: Karakter, ay: number): Npc | undefined {
  const ky = karakterYasi(kar, ay);
  return k.npc.find((c) => {
    if ((c.an !== npc.i && c.ba !== npc.i) || c.es || c.k === kar.k) return false;
    const y = yas(c.d, ay);
    return y >= NPC_DUNUR_YASI && Math.abs(y - ky) <= 8;
  });
}

/** Ay dönümü: uygun her oyuncuya en çok bir NPC teklifi (tohumlu). */
export function npcTeklifUret(k: Kasaba, ay: number): OlayTaslagi[] {
  const olaylar: OlayTaslagi[] = [];
  for (const s of k.sakin) {
    const kar = k.kar.get(s.o);
    const ili = k.ili.get(s.o);
    if (!kar || !ili || karakterYasi(kar, ay) < NPC_TEKLIF_YASI) continue;
    if (acikNpcTeklifi(k, kar.o) || ay - (kar.nt ?? -1e9) < NPC_TEKLIF_ARALIK) continue;
    const r = tohumlu("npcTeklif", k.y, ay, kar.o);
    if (r() >= NPC_TEKLIF_ORANI) continue;
    const adaylar = new Set<number>();
    for (const a of Object.keys(ili)) if (a !== "0") adaylar.add(Number(a));
    if (kar.e) for (const n of k.npc) if (n.e === kar.e) adaylar.add(n.i);
    const uygun = [...adaylar]
      .sort((a, b) => a - b)
      .map((i) => k.dizin.get(i))
      .filter((n): n is Npc => !!n && yas(n.d, ay) >= 16 && gorusDegeri(k, n, kar, ili, ay) >= 0);
    if (uygun.length === 0) continue;
    const npc = uygun[dizinSec(uygun.length, r)]!;
    const secenek: NpcTeklifTuru[] = ["npcBorc"];
    if (npc.m !== ISSIZ) secenek.push("npcIs");
    const aday = karakterYasi(kar, ay) >= NPC_DUNUR_YASI && npc.e !== kar.e ? dunurAdayi(k, npc, kar, ay) : undefined;
    if (aday) secenek.push("npcDunur");
    const tur = secenek[dizinSec(secenek.length, r)]!;
    const s_: Teklif["s"] =
      tur === "npcIs" ? { tu: NPC_IS_UCRET } : tur === "npcBorc" ? { tu: aralik(r, NPC_BORC_ALT, NPC_BORC_UST), va: NPC_BORC_VADE } : { dn: aday!.i };
    const tp = toplumAl(k);
    const t: Teklif = {
      i: tp.tn++,
      t: tur,
      g: npcKimlik(npc.i),
      a: kar.o,
      s: s_,
      e: 0,
      ac: ay,
      sa: ay + NPC_TEKLIF_SURE - 1,
      v: varsayilanSonuc(kar, tur, s_),
      d: "acik",
    };
    tp.tk.push(t);
    const p: OlayTaslagi["p"] = { kisi: npcRef(npc), teklif: `t${t.i}` };
    if (s_.tu) p.tutar = s_.tu;
    if (aday) p.aday = npcRef(aday);
    olaylar.push({ t: "teklif", w: npcKimlik(npc.i), h: kar.o, g: kar.o, n: 6, k: `olay.npcTeklif.${tur}`, p });
  }
  return olaylar;
}

/** NPC teklifinin kabulü (alıcı oyuncu). Hata olursa hiçbir şey değişmez. */
export function npcKabul(k: Kasaba, t: Teklif, kar: Karakter, ay: number): Sonuc<OlayTaslagi[]> {
  const npc = k.dizin.get(Number(t.g.slice(1)));
  if (!npc) return hata("kisi_yok");
  const ili = k.ili.get(kar.o);
  if (!ili) return hata("sakin_yok");
  const tu = t.s.tu ?? 0;
  if (t.t === "npcIs") {
    if (!takatHarca(kar, ay, NPC_IS_TAKAT)) return hata("takat_yok");
    kar.pa += tu;
    beceriEkle(kar, ay, "ticaret", 1);
    iliskiAl(ili, npc.i).an.push(["is", NPC_IS_GORUS, ay]);
    t.d = "bitti";
    t.sn = "yapildi";
  } else if (t.t === "npcBorc") {
    if (kar.pa < tu) return hata("para_yok");
    kar.pa -= tu;
    t.kl = tu;
    t.vd = ay + (t.s.va ?? NPC_BORC_VADE);
    t.d = "surer";
  } else {
    if (karakterYasi(kar, ay) < NPC_DUNUR_YASI) return hata("yas_kapisi");
    t.d = "bitti";
    t.sn = "kayit";
  }
  t.ka = ay;
  if (t.d === "bitti") {
    t.kp = ay;
    kar.nt = ay;
  }
  return basarili([]);
}

/** Vadesi gelen NPC borcu: NPC yaşıyorsa aynen döner (görüş artar), öldüyse batar. */
export function npcBorcTahsil(k: Kasaba, t: Teklif, ay: number): OlayTaslagi[] {
  if (t.d !== "surer" || t.t !== "npcBorc" || ay < (t.vd ?? 0)) return [];
  const kar = k.kar.get(t.a);
  if (!kar) return [];
  const npc = k.dizin.get(Number(t.g.slice(1)));
  t.d = "bitti";
  t.kp = ay;
  kar.nt = ay;
  if (!npc) {
    t.sn = "oldu";
    return [{ t: "teklif", w: t.g, h: kar.o, g: kar.o, n: 5, k: "olay.npcBorc.batti", p: { tutar: t.kl ?? 0 } }];
  }
  const kl = t.kl ?? 0;
  kar.pa += kl;
  t.kl = 0;
  t.sn = "odendi";
  const ili = k.ili.get(kar.o);
  if (ili) iliskiAl(ili, npc.i).an.push(["borc", NPC_BORC_GORUS, ay]);
  return [{ t: "teklif", w: t.g, h: kar.o, g: kar.o, n: 5, k: "olay.npcBorc.odendi", p: { kisi: npcRef(npc), tutar: kl } }];
}
