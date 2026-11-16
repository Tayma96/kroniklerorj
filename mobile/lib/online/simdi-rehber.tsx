// "Şimdi" rehberi (Yaşam'ın üstü): eldeki durumdan türeyen en çok üç öneri, her biri tek cümle ve tek düğme.
// İstemcide bulunan veri okunur (yerleşim, meslek, siparişler, gelen kutusu, son mülk listesi, son tezgâh görünümü);
// mülk listesi ve kendi dükkânlarımın tezgâhı bellekte yoksa oturumda bir kez sessizce alınır (Yaşam da İşim kadar bilsin). Zamanlayıcı, sayaç ya da kaçırma korkusu yok: öneri yol gösterir, baskı yapmaz.
import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../i18n";
import { C, F } from "../theme";
import { GameIcon } from "../icons";
import { DesignPressable as Pressable } from "../design-pressable";
import { useOnline } from "./durum";
import { useToplum } from "./toplum-durum";
import { BASMA_OLCEK, Cerceve, Madalyon, belir, hiza, yon } from "./ui";
import { Baslik2 } from "./yasam-ui";
import { MESLEK_YASI } from "./meslek-veri";
import { yerlesimBarinma } from "./barinma-veri";
import { isletmeYolu, useMulkIstemci, type MulkListesi, type MulkTuru } from "./mulk-veri";
import { hatirlananTezgah, rafaKonabilir, tezgahHatirla, useTezgahIstemci } from "./tezgah-veri";

type Ceviri = (k: string) => string;

// ---------------------------------------------------------------- son mülk listesi (İşim ekranı yazar)

let mulkSon: { hesap: string; liste: MulkListesi } | null = null;
/** İşim ekranı GET /v1/mulk yanıtını buraya bırakır; rehber yalnız bunu okur (kendisi çağırmaz). */
export function mulkListesiniHatirla(hesap: string, liste: MulkListesi) { mulkSon = { hesap, liste }; }
export function hatirlananMulkListesi(hesap: string): MulkListesi | null { return mulkSon && mulkSon.hesap === hesap ? mulkSon.liste : null; }

/** Şartı tamam ve boş yuvası olan ilk işletme türü (dükkân önce); sınır doluysa null. */
export function acilabilirMulk(m: MulkListesi | null): MulkTuru | null {
  if (!m || m.sinir.sahip >= m.sinir.enCok) return null;
  for (const tur of ["dukkan", "atolye", "han"] as const) {
    if (tur === "han" && (m.sinir.han ?? 0) >= (m.sinir.hanEnCok ?? 1)) continue;
    if (m.edinimSarti[tur]?.uygun && m.yuvalar.some((x) => x.tur === tur && x.durum === "bos")) return tur;
  }
  return null;
}

/** Handa "kalabalık" sayılan kişi sayısı (öneri için). */
const HAN_KALABALIK = 3;

export interface Oneri { id: string; icon: string; metin: string; dugme: string; yol?: string; onPress?: () => void }

/** Öncelik sırasıyla öneriler; ilk üçü gösterilir. */
export function useSimdiOnerileri(t: Ceviri, onBarinma?: () => void): Oneri[] {
  const o = useOnline();
  const toplum = useToplum();
  const y = o.yerlesim;
  if (!y) return [];
  const ben = y.ben;
  const liste: Oneri[] = [];
  const ekle = (x: Oneri) => { if (liste.length < 3 && !liste.some((v) => v.id === x.id)) liste.push(x); };

  // Yeni oyuncu: öğrenme döneminin ilk günü, önce tek net adım.
  if (ben.ogrenme.suruyor && ben.ogrenme.gun <= 1) ekle({ id: "ilk", icon: "map", metin: t("onl.sm.ilk"), dugme: t("onl.sm.ilk.d"), yol: "/online/sokak" });

  if (toplum.gelen && toplum.bekleyen > 0) ekle({ id: "gelen", icon: "scroll", metin: applyParams(t("onl.sm.gelen"), [toplum.bekleyen]), dugme: t("onl.tp.gk.baslik"), yol: "/online/gelen" });
  if (o.siparisler?.some((x) => x.durum === "acik" && x.kalanAy > 0 && x.teslimEdebilir)) ekle({ id: "siparis", icon: "scroll-open", metin: t("onl.sm.siparis"), dugme: t("onl.sm.siparis.d"), yol: "/online/siparisler" });
  if (ben.ozellikPuani > 0) ekle({ id: "ozellik", icon: "star", metin: applyParams(t("onl.sm.ozellik"), [ben.ozellikPuani]), dugme: t("onl.sm.ozellik.d"), yol: "/online/karakter" });
  const aktif = o.meslekDurumu?.kayit.a || null;
  const beceriKalan = aktif ? o.meslekDurumu?.beceri?.[aktif]?.kalan ?? 0 : 0;
  if (beceriKalan > 0) ekle({ id: "beceri", icon: "graduate-cap", metin: applyParams(t("onl.sm.beceri"), [beceriKalan]), dugme: t("onl.im.beceri"), yol: "/online/beceri-agaci" });
  const meslekYok = o.meslekDurumu ? !o.meslekDurumu.kayit.a : ben.meslek === null;
  if (meslekYok && ben.yas >= MESLEK_YASI) ekle({ id: "meslek", icon: "anvil", metin: t("onl.sm.meslek"), dugme: t("onl.im.meslek.bos"), yol: "/online/meslek" });
  if (ben.takat.tavan > 0 && ben.takat.kalan >= ben.takat.tavan) ekle({ id: "takat", icon: "saw", metin: t("onl.sm.takat"), dugme: t("onl.sm.takat.d"), yol: "/online/isler" });
  const b = yerlesimBarinma(y);
  if (b?.acik && onBarinma && (b.konaklama?.yakindaBiter || b.durum === "uyari" || b.durum === "evsiz" || b.durum === "canKaybi")) {
    ekle({ id: "barinma", icon: "house", metin: t("onl.sm.barinma"), dugme: t("onl.sm.barinma.d"), onPress: onBarinma });
  }
  const handa = y.harita.find((m) => m.id === "han")?.kisiler.filter((k) => k.id !== ben.id).length ?? 0;
  if (handa >= HAN_KALABALIK) ekle({ id: "han", icon: "beer", metin: applyParams(t("onl.sm.han"), [handa]), dugme: t("onl.sm.han.d"), yol: "/online/han" });
  const hesap = o.profil?.hesapId ?? "";
  const ml = hatirlananMulkListesi(hesap);
  const rafli = (ml?.benim ?? []).find((id) => { const g = hatirlananTezgah(hesap, id); return !!g && rafaKonabilir(g); });
  if (rafli) ekle({ id: "raf", icon: "scales", metin: t("onl.sm.raf"), dugme: t("onl.sm.raf.d"), yol: isletmeYolu(rafli) });
  const mulk = acilabilirMulk(ml);
  if (mulk) ekle({ id: "mulk", icon: mulk === "han" ? "beer" : mulk === "atolye" ? "anvil" : "scales", metin: t("onl.sm.mulk." + mulk), dugme: t("onl.sm.mulk.d"), yol: "/online/mulk" });
  return liste;
}

/** Yaşam'ın üstündeki rehber: öneri kartları ya da sakin "her şey yolunda" satırı. */
let rehberYuklenen: string | null = null;

/** Mülk listesi ve kendi tezgâhlarım bellekte yoksa hesap başına bir kez alınır; bitince rehber yeniden çizilir. */
function useRehberVerisi(): void {
  const o = useOnline();
  const mist = useMulkIstemci();
  const tzi = useTezgahIstemci();
  const [, yenile] = useState(0);
  const hesap = o.profil?.hesapId ?? "";
  const hazir = !!o.yerlesim;
  useEffect(() => {
    if (!hazir || !hesap || rehberYuklenen === hesap) return;
    rehberYuklenen = hesap;
    let iptal = false;
    void (async () => {
      let ml = hatirlananMulkListesi(hesap);
      if (!ml) {
        const r = await mist.liste();
        if (!r.ok) { rehberYuklenen = null; return; }
        ml = r.deger;
        mulkListesiniHatirla(hesap, ml);
      }
      const dukkanlar = ml.benim.filter((id) => ml!.yuvalar.find((v) => v.isletme === id)?.tur === "dukkan" && !hatirlananTezgah(hesap, id));
      await Promise.all(dukkanlar.map(async (id) => { const r = await tzi.tezgah(id); if (r.ok) tezgahHatirla(hesap, r.deger); }));
      if (!iptal) yenile((n) => n + 1);
    })();
    return () => { iptal = true; };
  }, [hazir, hesap, mist, tzi]);
}

export function SimdiRehberi({ onBarinma }: { onBarinma?: () => void }) {
  const router = useRouter();
  const { t, rtl } = useI18n();
  useRehberVerisi();
  const oneriler = useSimdiOnerileri(t, onBarinma);
  return <View>
    <Baslik2 metin={t("onl.sm.baslik")} rtl={rtl} ust={16} />
    {oneriler.length ? <View style={{ gap: 8 }}>
      {oneriler.map((x, i) => <Animated.View key={x.id} entering={belir()}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${x.metin} ${x.dugme}`}
          onPress={() => { if (x.onPress) x.onPress(); else if (x.yol) router.push(x.yol); }}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? BASMA_OLCEK : 1 }] })}>
          <Cerceve aktif={i === 0} ic={{ flexDirection: yon(rtl), alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 12, minHeight: 64 }}>
            <Madalyon icon={x.icon} size={40} aktif={i === 0} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontFamily: F.serif, fontSize: 15.5, lineHeight: 21, color: C.parchment, textAlign: hiza(rtl) }}>{x.metin}</Text>
              <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6 }}>
                <Text style={{ fontFamily: F.display, fontSize: 12.5, letterSpacing: rtl ? 0 : 0.8, color: C.goldBright }}>{x.dugme}</Text>
                <GameIcon name="compass" size={13} color={C.goldBright} />
              </View>
            </View>
          </Cerceve>
        </Pressable>
      </Animated.View>)}
    </View> : <View accessible accessibilityLabel={t("onl.sm.sakin")} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(122,154,92,0.45)", backgroundColor: "rgba(14,10,6,0.62)" }}>
      <GameIcon name="leaf" size={18} color={C.sage} />
      <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, lineHeight: 21, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.sm.sakin")}</Text>
    </View>}
  </View>;
}
