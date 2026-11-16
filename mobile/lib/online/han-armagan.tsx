// Han masasında armağan çekmecesi (alt çekmece, iki sekme). İkram: hancının menüsü, fiyat sunucudan (GET /v1/han menüsü ya da
// ilk ikram yanıtı), POST /v1/han/ikram. Debdebe: katalogdaki `armagan` ürünleri; satın alma istemcide yok ("Yakında"),
// yalnız elde stok varsa POST /v1/debdebe/armagan ile verilir. Sonuç, tavan ve bedel sunucudadır; burada yalnız niyet gönderilir.
// Hedefin adı açılışta kopyalanır; hedef masadan ayrılırsa gönderim kilitlenir ve nedeni yazılır.
import { useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import { GameIcon } from "../icons";
import { C, F } from "../theme";
import { applyParams } from "../i18n";
import { hap } from "../haptics";
import { DesignPressable as Pressable } from "../design-pressable";
import { istekNoUret } from "./depo";
import { istekTekrarMi } from "./hata";
import { AltinDugme, CizgiDugme, ONL, hiza, yon } from "./ui";
import { AltPanel, BosKart, Hap, Yukleniyor } from "./yasam-ui";
import { IKRAMLAR, type HanIstemci, type IkramId, type MenuSatiri } from "./han-veri";
import { IKRAM_IKON, Not, SecimOgesi, debdebeIkon, hanHataAnahtari } from "./han-ui";
import { useDebdebeIstemci, type DebdebeGorunumu, type DebdebeUrun } from "./debdebe-veri";

type Ceviri = (k: string) => string;
export type ArmaganSekmesi = "ikram" | "debdebe";
/** Gönderim sonucu: bilgi metni ve (gerçekten gönderildiyse) masadaki kutlama. `oturum`: isteğin atıldığı açılış. */
export interface ArmaganSonucu { bilgi: string; kutlama?: { icon: string; oge: string }; oturum: number }

/** Debdebe ürün adı: "onl.db.urun.<id>" yoksa kimlikten okunur ad. */
export function debdebeAdi(t: Ceviri, id: string) {
  const k = "onl.db.urun." + id;
  const v = t(k);
  return v === k ? id.replace(/^armagan_/, "").replaceAll("_", " ") : v;
}

function Sekme({ etiket, icon, secili, rtl, onPress }: { etiket: string; icon: string; secili: boolean; rtl: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: secili }} accessibilityLabel={etiket} onPress={() => { if (!secili) { hap("selection"); onPress(); } }}
    style={{ flex: 1, flexDirection: yon(rtl), alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44, borderRadius: 10, borderWidth: 1.5,
      borderColor: secili ? C.goldBright : ONL.frame, backgroundColor: secili ? "rgba(201,162,78,0.22)" : "rgba(14,10,6,0.6)" }}>
    <GameIcon name={icon} size={16} color={secili ? C.goldBright : C.gold} />
    <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 13, color: secili ? C.parchment : C.parchmentDim }}>{etiket}</Text>
  </Pressable>;
}

export function ArmaganCekmecesi({ acik, oturum, onKapat, hedef, hedefMasada, masa, istemci, menu, onMenu, para, oturuyor, rtl, t, onSonuc }: {
  acik: boolean; oturum: number; onKapat: () => void; hedef: { hesap: string; ad: string } | null; hedefMasada: boolean; masa: number; istemci: HanIstemci;
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
  const [deneme, setDeneme] = useState(0);
  const istekNo = useRef(istekNoUret());
  const kilit = useRef(false);

  // Her açılışta yeni istek kimliği ve temiz hata.
  useEffect(() => { if (acik) { istekNo.current = istekNoUret(); setHata(null); } }, [acik, oturum]);
  // Debdebe sekmesi her açılışta (ve "Tekrar dene"de) stoğu tazeler; eski ızgara yüklenirken görünür kalır.
  useEffect(() => {
    if (!acik || sekme !== "debdebe") return;
    let iptal = false;
    setYukleniyor(true); setVeriHata(false);
    void db.oku().then((r) => {
      if (iptal) return;
      setYukleniyor(false);
      if (!r.ok) { setVeriHata(true); return; }
      setVeri(r.deger);
      setUrun((u) => (u && r.deger.katalog.some((x) => x.id === u) ? u : r.deger.katalog.find((x) => x.tur === "armagan" && (r.deger.ben.stok[x.id] ?? 0) > 0)?.id ?? null));
    });
    return () => { iptal = true; setYukleniyor(false); };
  }, [acik, oturum, sekme, deneme, db]);

  const fiyatBul = (id: IkramId) => menu?.find((x) => x.id === id)?.fiyat;
  const ikramFiyat = fiyatBul(ikram);
  const akceYetmez = ikramFiyat !== undefined && para !== undefined && para < ikramFiyat;
  const gonderBaslat = () => {
    if (kilit.current) return false;
    kilit.current = true; setBekliyor(true); setHata(null);
    return true;
  };
  const bitir = () => { kilit.current = false; setBekliyor(false); };
  const ikramGonder = async () => {
    if (!hedef || !gonderBaslat()) return;
    const s = await istemci.ikram({ masa, hedef: hedef.hesap, ikram, istekNo: istekNo.current });
    bitir();
    if (s.ok) {
      onMenu({ id: ikram, fiyat: s.deger.fiyat });
      istekNo.current = istekNoUret();
      onSonuc({ oturum, bilgi: applyParams(t("onl.han.ikramGitti"), [t("onl.han.ikram." + ikram), hedef.ad, s.deger.fiyat, s.deger.para]), kutlama: { icon: IKRAM_IKON[ikram], oge: t("onl.han.ikram." + ikram) } });
    } else if (istekTekrarMi(s.hata)) {
      istekNo.current = istekNoUret();
      onSonuc({ oturum, bilgi: t("onl.h.istekTekrar") });
    } else { hap("error"); setHata(t(hanHataAnahtari(s.hata))); }
  };
  const armaganlar: DebdebeUrun[] = veri?.katalog.filter((x) => x.tur === "armagan") ?? [];
  const stok = (id: string) => veri?.ben.stok[id] ?? 0;
  const seciliUrun = armaganlar.find((x) => x.id === urun && stok(x.id) > 0) ?? null;
  const kalan = veri?.armagan.bugunKalan ?? 0;
  const debdebeVerilir = !!veri?.acik && !!seciliUrun && kalan > 0;
  const debdebeGonder = async () => {
    if (!hedef || !seciliUrun || !gonderBaslat()) return;
    const s = await db.armagan({ urun: seciliUrun.id, hedef: hedef.hesap, masa, istekNo: istekNo.current });
    bitir();
    if (s.ok) {
      istekNo.current = istekNoUret();
      setVeri((v) => (v ? { ...v, ben: { ...v.ben, stok: { ...v.ben.stok, [seciliUrun.id]: s.deger.stok } }, armagan: { ...v.armagan, bugunKalan: s.deger.gunluk.kalan } } : v));
      const ad = debdebeAdi(t, seciliUrun.id);
      onSonuc({ oturum, bilgi: applyParams(t("onl.han.ag.gitti"), [ad, hedef.ad]), kutlama: { icon: debdebeIkon(seciliUrun.id), oge: ad } });
    } else if (istekTekrarMi(s.hata)) {
      istekNo.current = istekNoUret();
      onSonuc({ oturum, bilgi: t("onl.h.istekTekrar") });
    } else { hap("error"); setHata(t(hanHataAnahtari(s.hata))); }
  };
  const fiyatYaz = (x: DebdebeUrun) => {
    const f = x.fiyat ?? (x.kademe ? veri?.fiyatKademeleri[x.kademe] : undefined);
    return f ? applyParams(t("onl.han.ag.fiyat"), [f.usd.toFixed(2), f.tl.toFixed(2)]) : t("onl.han.ag.fiyatYok");
  };

  // Gönderim neden kapalı: tek satır, tek neden (öncelik sırasıyla).
  const neden = !hedef ? null : !hedefMasada ? applyParams(t("onl.han.ag.hedefGitti"), [hedef.ad]) : !oturuyor ? t("onl.han.oturunca")
    : sekme === "ikram" && akceYetmez ? applyParams(t("onl.han.ag.akceYetmez"), [ikramFiyat!, para!]) : null;
  const kapali = !hedef || !hedefMasada || !oturuyor || (sekme === "ikram" ? akceYetmez : !debdebeVerilir);
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
          return <SecimOgesi key={id} bicim="hucre" icon={IKRAM_IKON[id]} metin={t("onl.han.ikram." + id)} fiyat={fiyat} secili={ikram === id} rtl={rtl}
            erisim={`${t("onl.han.ikram." + id)}, ${fiyat}`} onPress={() => { setIkram(id); setHata(null); }} />;
        })}
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.han.ikramAcik." + ikram)}</Text>
      <Not metin={t("onl.han.ikramEtki")} rtl={rtl} icon="amphora" />
    </> : <>
      {yukleniyor && !veri ? <Yukleniyor metin={t("onl.han.ag.yukleniyor")} />
        : veriHata && !veri ? <>
          <BosKart icon="gems" metin={t("onl.han.ag.katalogYok")} rtl={rtl} />
          <CizgiDugme etiket={t("onl.han.ag.tekrarDene")} icon="hourglass" rtl={rtl} kucuk onPress={() => setDeneme((x) => x + 1)} />
        </>
        : !armaganlar.length ? <BosKart icon="gems" metin={t("onl.han.ag.bos")} rtl={rtl} />
        : <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 8 }}>
          {armaganlar.map((x) => {
            const ad = debdebeAdi(t, x.id);
            const fiyat = fiyatYaz(x);
            const elde = stok(x.id);
            const ek = elde > 0 ? applyParams(t("onl.han.ag.stok"), [elde]) : t("onl.han.ag.eldeYok");
            return <SecimOgesi key={x.id} bicim="hucre" icon={debdebeIkon(x.id)} metin={ad} fiyat={fiyat} ek={ek} secili={seciliUrun?.id === x.id} kapali={elde < 1} rtl={rtl}
              erisim={[ad, fiyat, ek].join(", ")} onPress={() => { setUrun(x.id); setHata(null); }} />;
          })}
        </View>}
      {veri?.acik ? <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.han.ag.gunluk"), [kalan])}</Text> : null}
      {!debdebeVerilir ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.han.ag.yakinda")}</Text> : null}
    </>}

    {hata ? <Text accessibilityRole="alert" style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.ember, textAlign: hiza(rtl) }}>{hata}</Text> : null}
    {neden ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{neden}</Text> : null}
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
      {para !== undefined ? <Hap icon="coins" metin={String(para)} erisim={applyParams(t("onl.han.ag.akcen"), [para])} /> : null}
      <View style={{ flex: 1 }}>
        <AltinDugme etiket={t("onl.han.ag.gonder")} icon={sekme === "ikram" ? IKRAM_IKON[ikram] : seciliUrun ? debdebeIkon(seciliUrun.id) : "gems"} rtl={rtl} bekliyor={bekliyor}
          erisim={hedef ? [applyParams(t("onl.han.ikramGonder"), [sekme === "ikram" ? t("onl.han.ikram." + ikram) : seciliUrun ? debdebeAdi(t, seciliUrun.id) : "", hedef.ad]), neden].filter(Boolean).join(". ") : undefined}
          kapali={kapali}
          onPress={() => { void (sekme === "ikram" ? ikramGonder() : debdebeGonder()); }} />
      </View>
    </View>
  </AltPanel>;
}
