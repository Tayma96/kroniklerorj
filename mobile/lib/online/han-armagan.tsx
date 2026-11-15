// Han masasında armağan çekmecesi (alt çekmece, iki sekme). İkram: hancının menüsü, fiyat sunucudan (GET /v1/han menüsü ya da
// ilk ikram yanıtı), POST /v1/han/ikram. Debdebe: katalogdaki `armagan` ürünleri; satın alma istemcide yok ("Yakında"),
// yalnız elde stok varsa POST /v1/debdebe/armagan ile verilir. Sonuç, tavan ve bedel sunucudadır; burada yalnız niyet gönderilir.
import { useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import { GameIcon } from "../icons";
import { C, F } from "../theme";
import { applyParams } from "../i18n";
import { hap } from "../haptics";
import { DesignPressable as Pressable } from "../design-pressable";
import { istekNoUret } from "./depo";
import { ekHataAnahtari, type EkHata } from "./ek-istemci";
import { istekTekrarMi } from "./hata";
import { AltinDugme, ONL, hiza, yon } from "./ui";
import { AltPanel, BosKart, Hap, Yukleniyor } from "./yasam-ui";
import { IKRAMLAR, type HanIstemci, type IkramId, type MenuSatiri } from "./han-veri";
import { IKRAM_IKON, Not } from "./han-ui";
import { useDebdebeIstemci, type DebdebeGorunumu, type DebdebeUrun } from "./debdebe-veri";

type Ceviri = (k: string) => string;
export type ArmaganSekmesi = "ikram" | "debdebe";
/** Gönderim sonucu: bilgi bandı metni ve (gerçekten gönderildiyse) masadaki kutlama. */
export interface ArmaganSonucu { bilgi: string; kutlama?: { icon: string; oge: string } }

/** Debdebe ürün adı: "onl.db.urun.<id>" yoksa kimlikten okunur ad. */
export function debdebeAdi(t: Ceviri, id: string) {
  const k = "onl.db.urun." + id;
  const v = t(k);
  return v === k ? id.replaceAll("_", " ") : v;
}
function debdebeHata(kod: EkHata): string {
  return kod === "stok_yok" ? "onl.han.ag.stokYok" : ekHataAnahtari(kod);
}

function Sekme({ etiket, icon, secili, rtl, onPress }: { etiket: string; icon: string; secili: boolean; rtl: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: secili }} accessibilityLabel={etiket} onPress={() => { hap("selection"); onPress(); }}
    style={{ flex: 1, flexDirection: yon(rtl), alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44, borderRadius: 10, borderWidth: 1.5,
      borderColor: secili ? C.goldBright : ONL.frame, backgroundColor: secili ? "rgba(201,162,78,0.22)" : "rgba(14,10,6,0.6)" }}>
    <GameIcon name={icon} size={16} color={secili ? C.goldBright : C.gold} />
    <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 13, color: secili ? C.parchment : C.parchmentDim }}>{etiket}</Text>
  </Pressable>;
}

/** Izgara hücresi: ikon, ad, fiyat (iki sütun; 320 px'te ~136 px). */
function Hucre({ icon, ad, fiyat, ek, secili, kapali, erisim, onPress }: { icon: string; ad: string; fiyat: string; ek?: string; secili: boolean; kapali?: boolean; erisim: string; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected: secili }} accessibilityLabel={erisim} onPress={() => { hap("tap"); onPress(); }}
    style={({ pressed }) => ({ width: "48%", flexGrow: 1, minHeight: 96, alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
      borderColor: secili ? C.goldBright : "rgba(168,130,63,0.5)", backgroundColor: secili ? "rgba(90,64,24,0.6)" : "rgba(14,10,6,0.6)", opacity: kapali ? 0.7 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
    <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: secili ? C.goldBright : ONL.frame, backgroundColor: "rgba(0,0,0,0.3)" }}>
      <GameIcon name={icon} size={20} color={secili ? C.goldBright : C.gold} />
    </View>
    <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 12.5, lineHeight: 15, color: C.parchment, textAlign: "center" }}>{ad}</Text>
    <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 12, lineHeight: 15, color: C.goldBright, textAlign: "center" }}>{fiyat}</Text>
    {ek ? <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 11.5, color: C.parchmentDim, textAlign: "center" }}>{ek}</Text> : null}
  </Pressable>;
}

export function ArmaganCekmecesi({ acik, onKapat, hedef, masa, istemci, menu, onMenu, para, oturuyor, rtl, t, onSonuc }: {
  acik: boolean; onKapat: () => void; hedef: { hesap: string; ad: string } | null; masa: number; istemci: HanIstemci;
  menu: MenuSatiri[] | null; onMenu: (m: MenuSatiri) => void; para: number | undefined; oturuyor: boolean; rtl: boolean; t: Ceviri;
  onSonuc: (s: ArmaganSonucu) => void;
}) {
  const db = useDebdebeIstemci();
  const [sekme, setSekme] = useState<ArmaganSekmesi>("ikram");
  const [ikram, setIkram] = useState<IkramId>("serbet");
  const [urun, setUrun] = useState<string | null>(null);
  const [veri, setVeri] = useState<DebdebeGorunumu | null>(null);
  const [veriHata, setVeriHata] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const istekNo = useRef(istekNoUret());

  // Her açılışta yeni istek kimliği ve temiz hata; hedef değişince seçim korunur.
  useEffect(() => { if (acik) { istekNo.current = istekNoUret(); setHata(null); } }, [acik, hedef?.hesap]);
  useEffect(() => {
    if (!acik || sekme !== "debdebe" || veri || yukleniyor) return;
    let iptal = false;
    setYukleniyor(true); setVeriHata(false);
    void db.oku().then((r) => {
      if (iptal) return;
      setYukleniyor(false);
      if (!r.ok) { setVeriHata(true); return; }
      setVeri(r.deger);
      setUrun((u) => u ?? r.deger.katalog.find((x) => x.tur === "armagan")?.id ?? null);
    });
    // Çekmece yüklenirken kapanırsa bir sonraki açılış yeniden dener (dönen yanıt yok sayılır).
    return () => { iptal = true; setYukleniyor(false); };
  }, [acik, sekme, veri, db]); // eslint-disable-line react-hooks/exhaustive-deps

  const fiyatBul = (id: IkramId) => menu?.find((x) => x.id === id)?.fiyat;
  const ikramGonder = async () => {
    if (!hedef) return;
    setBekliyor(true); setHata(null);
    const s = await istemci.ikram({ masa, hedef: hedef.hesap, ikram, istekNo: istekNo.current });
    setBekliyor(false);
    if (s.ok) {
      onMenu({ id: ikram, fiyat: s.deger.fiyat });
      istekNo.current = istekNoUret();
      onSonuc({ bilgi: applyParams(t("onl.han.ikramGitti"), [t("onl.han.ikram." + ikram), hedef.ad, s.deger.fiyat, s.deger.para]), kutlama: { icon: IKRAM_IKON[ikram], oge: t("onl.han.ikram." + ikram) } });
    } else if (istekTekrarMi(s.hata)) {
      istekNo.current = istekNoUret();
      onSonuc({ bilgi: t("onl.h.istekTekrar") });
    } else { hap("error"); setHata(t(ekHataAnahtari(s.hata))); }
  };
  const armaganlar: DebdebeUrun[] = veri?.katalog.filter((x) => x.tur === "armagan") ?? [];
  const seciliUrun = armaganlar.find((x) => x.id === urun) ?? null;
  const stok = (id: string) => veri?.ben.stok[id] ?? 0;
  const kalan = veri?.armagan.bugunKalan ?? 0;
  const debdebeVerilir = !!veri?.acik && !!seciliUrun && stok(seciliUrun.id) > 0 && kalan > 0;
  const debdebeGonder = async () => {
    if (!hedef || !seciliUrun) return;
    setBekliyor(true); setHata(null);
    const s = await db.armagan({ urun: seciliUrun.id, hedef: hedef.hesap, masa, istekNo: istekNo.current });
    setBekliyor(false);
    if (s.ok) {
      istekNo.current = istekNoUret();
      setVeri((v) => (v ? { ...v, ben: { ...v.ben, stok: { ...v.ben.stok, [seciliUrun.id]: s.deger.stok } }, armagan: { ...v.armagan, bugunKalan: s.deger.gunluk.kalan } } : v));
      const ad = debdebeAdi(t, seciliUrun.id);
      onSonuc({ bilgi: applyParams(t("onl.han.ag.gitti"), [ad, hedef.ad]), kutlama: { icon: "gems", oge: ad } });
    } else if (istekTekrarMi(s.hata)) {
      istekNo.current = istekNoUret();
      onSonuc({ bilgi: t("onl.h.istekTekrar") });
    } else { hap("error"); setHata(t(debdebeHata(s.hata))); }
  };
  const fiyatYaz = (x: DebdebeUrun) => {
    const f = x.fiyat ?? (x.kademe ? veri?.fiyatKademeleri[x.kademe] : undefined);
    return f ? applyParams(t("onl.han.ag.fiyat"), [f.usd.toFixed(2), f.tl.toFixed(2)]) : t("onl.han.ag.fiyatYok");
  };

  const baslik = hedef ? applyParams(t("onl.han.ag.baslik"), [hedef.ad]) : t("onl.han.armaganGonder");
  return <AltPanel acik={acik} onKapat={onKapat} etiket={baslik} rtl={rtl} t={t}>
    <Text accessibilityRole="header" numberOfLines={2} style={{ fontFamily: F.display, fontSize: 17, color: C.parchment, textAlign: hiza(rtl), paddingEnd: 36 }}>{baslik}</Text>
    <View accessibilityRole="tablist" style={{ flexDirection: yon(rtl), gap: 8 }}>
      <Sekme etiket={t("onl.han.ag.ikram")} icon="amphora" secili={sekme === "ikram"} rtl={rtl} onPress={() => { setSekme("ikram"); setHata(null); }} />
      <Sekme etiket={t("onl.han.ag.debdebe")} icon="gems" secili={sekme === "debdebe"} rtl={rtl} onPress={() => { setSekme("debdebe"); setHata(null); }} />
    </View>

    {sekme === "ikram" ? <>
      <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.han.menuNot")}</Text>
      <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 8 }}>
        {IKRAMLAR.map((id) => {
          const f = fiyatBul(id);
          const fiyat = f !== undefined ? applyParams(t("onl.han.akce"), [f]) : t("onl.han.fiyatHancida");
          return <Hucre key={id} icon={IKRAM_IKON[id]} ad={t("onl.han.ikram." + id)} fiyat={fiyat} secili={ikram === id} erisim={`${t("onl.han.ikram." + id)}, ${fiyat}`} onPress={() => { setIkram(id); setHata(null); }} />;
        })}
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.han.ikramAcik." + ikram)}</Text>
      <Not metin={t("onl.han.ikramEtki")} rtl={rtl} icon="amphora" />
    </> : <>
      {yukleniyor ? <Yukleniyor metin={t("onl.han.ag.yukleniyor")} />
        : veriHata || !veri ? <BosKart icon="gems" metin={t("onl.han.ag.katalogYok")} rtl={rtl} />
        : !armaganlar.length ? <BosKart icon="gems" metin={t("onl.han.ag.bos")} rtl={rtl} />
        : <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 8 }}>
          {armaganlar.map((x) => {
            const ad = debdebeAdi(t, x.id);
            const fiyat = fiyatYaz(x);
            const elde = stok(x.id);
            const ek = elde > 0 ? applyParams(t("onl.han.ag.stok"), [elde]) : undefined;
            return <Hucre key={x.id} icon="gems" ad={ad} fiyat={fiyat} ek={ek} secili={urun === x.id} kapali={!veri.acik || elde < 1} erisim={[ad, fiyat, ek].filter(Boolean).join(", ")} onPress={() => { setUrun(x.id); setHata(null); }} />;
          })}
        </View>}
      {veri?.acik ? <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.han.ag.gunluk"), [kalan])}</Text> : null}
      {!debdebeVerilir ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.han.ag.yakinda")}</Text> : null}
    </>}

    {hata ? <Text accessibilityRole="alert" style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.ember, textAlign: hiza(rtl) }}>{hata}</Text> : null}
    {!oturuyor ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.han.oturunca")}</Text> : null}
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
      {para !== undefined ? <Hap icon="coins" metin={String(para)} erisim={applyParams(t("onl.han.ag.akcen"), [para])} /> : null}
      <View style={{ flex: 1 }}>
        <AltinDugme etiket={t("onl.han.ag.gonder")} icon={sekme === "ikram" ? IKRAM_IKON[ikram] : "gems"} rtl={rtl} bekliyor={bekliyor}
          erisim={hedef ? applyParams(t("onl.han.ikramGonder"), [sekme === "ikram" ? t("onl.han.ikram." + ikram) : seciliUrun ? debdebeAdi(t, seciliUrun.id) : "", hedef.ad]) : undefined}
          kapali={!hedef || !oturuyor || (sekme === "debdebe" && !debdebeVerilir)}
          onPress={() => { void (sekme === "ikram" ? ikramGonder() : debdebeGonder()); }} />
      </View>
    </View>
  </AltPanel>;
}
