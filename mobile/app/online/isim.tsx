// İşim sekmesi: meslek ve beceri ağacı, üretim (işler, lonca siparişleri, ısmarlamalar), işletmelerim (dükkân, atölye,
// han aç / yönet; sahip olduğum ve çalıştığım işletmeler kart olarak) ve ekonomi defteri. Mülk listesi bir kez
// GET /v1/mulk ile alınır ve "Şimdi" rehberi için bellekte bırakılır; kervan Sokak'taki Kervansaray'dadır.
import { useCallback, useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { Bant, giris } from "../../lib/online/ui";
import { Baslik2, Hap, OnlineSayfa, SayfaBasi, YerlesimBekle, Yukleniyor, useYerlesimEkrani } from "../../lib/online/yasam-ui";
import { GirisSatiri } from "../../lib/online/gezinti-ui";
import { MESLEK_YASI } from "../../lib/online/meslek-veri";
import { MULK_IKON, isletmeYolu, useMulkIstemci, type MulkListesi } from "../../lib/online/mulk-veri";
import { ekHataAnahtari, type EkHata } from "../../lib/online/ek-istemci";
import { acilabilirMulk, mulkListesiniHatirla } from "../../lib/online/simdi-rehber";
import { dukkanOzetMetni, hatirlananTezgah, rafaKonabilir, tezgahHatirla, useTezgahIstemci, type TezgahGorunumu } from "../../lib/online/tezgah-veri";

const ISIM_GORSELI = require("../../assets/arka/atolye_demirci.jpg");
const MULK_GORSELI = require("../../assets/tasarim/v4/venue-mulkler.jpg");

function IsimEkran() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const o = useYerlesimEkrani();
  const ist = useMulkIstemci();
  const y = o.yerlesim;
  const hesap = o.profil?.hesapId ?? "";
  const [m, setM] = useState<MulkListesi | null>(null);
  const [mHata, setMHata] = useState<EkHata | null>(null);
  const tzi = useTezgahIstemci();
  const [tzler, setTzler] = useState<Record<string, TezgahGorunumu>>({});

  const mulkYukle = useCallback(async () => {
    setMHata(null);
    const r = await ist.liste();
    if (r.ok) { setM(r.deger); mulkListesiniHatirla(hesap, r.deger); } else setMHata(r.hata);
  }, [ist, hesap]);
  useEffect(() => { if (y) void mulkYukle(); }, [!!y, mulkYukle]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (y && !o.siparisler) void o.siparisleriYukle(true); }, [!!y]); // eslint-disable-line react-hooks/exhaustive-deps
  // Dükkân/atölye kartlarının canlı özeti: sahip ya da çalışan olduğum her tezgâh bir kez okunur (rehber de bunu kullanır).
  const tezgahIds = m ? [...new Set([...m.benim, ...m.calistigim])].filter((id) => { const tur = m.yuvalar.find((v) => v.isletme === id)?.tur; return tur === "dukkan" || tur === "atolye"; }) : [];
  const tezgahAnahtar = tezgahIds.join(",");
  useEffect(() => {
    if (!tezgahIds.length) return;
    let iptal = false;
    const once: Record<string, TezgahGorunumu> = {};
    for (const id of tezgahIds) { const h = hatirlananTezgah(hesap, id); if (h) once[id] = h; }
    setTzler(once);
    void Promise.all(tezgahIds.map(async (id) => {
      const r = await tzi.tezgah(id);
      if (iptal || !r.ok) return;
      tezgahHatirla(hesap, r.deger);
      setTzler((x) => ({ ...x, [id]: r.deger }));
    }));
    return () => { iptal = true; };
  }, [tezgahAnahtar, tzi, hesap]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!y) return <YerlesimBekle sekme="isim" rtl={rtl} t={t} onGiris={() => router.replace("/online")} />;

  const ben = y.ben;
  const git = (yol: string) => router.push(yol);
  const aktif = o.meslekDurumu?.kayit.a || null;
  const genc = ben.yas < MESLEK_YASI;
  const beceriKalan = aktif ? o.meslekDurumu?.beceri?.[aktif]?.kalan ?? 0 : 0;
  const acikIlan = o.siparisler?.filter((x) => x.durum === "acik" && x.kalanAy > 0) ?? [];
  const verebilir = acikIlan.some((x) => x.teslimEdebilir);
  const spAlt = !o.siparisler ? t("onl.sp.yaAlt") : verebilir ? t("onl.sp.yaVerebilir") : acikIlan.length ? applyParams(t("onl.sp.yaAcik"), [acikIlan.length]) : t("onl.sp.yaYok");
  const acilir = acilabilirMulk(m);
  const yuvaAdi = (id: string) => {
    const x = m?.yuvalar.find((v) => v.isletme === id);
    return { ad: x?.ad || (x ? t("onl.mk.tur." + x.tur) : id), icon: x ? MULK_IKON[x.tur] : "house", tur: x?.tur };
  };
  const mulkAlt = !m ? t("onl.im.mulk.alt")
    : acilir ? t("onl.sm.mulk." + acilir)
    : m.teklifler.length ? applyParams(t("onl.im.mulk.teklif"), [m.teklifler.length])
    : applyParams(t("onl.im.mulk.sinir"), [m.sinir.sahip, m.sinir.enCok]);

  return <OnlineSayfa gorsel={ISIM_GORSELI} oran={0.34} sekme="isim" rtl={rtl} t={t} rozet={{ ben: ben.ozellikPuani > 0 }}>
    <SayfaBasi ust={y.yerlesim.ad} baslik={t("onl.im.baslik")} alt={t("onl.im.alt")} rtl={rtl}
      sag={<Hap icon="coins" metin={String(ben.para)} erisim={applyParams(t("onl.ya.paraErisim"), [ben.para])} />} />
    <View style={{ minHeight: 64 }} />

    {/* Meslek */}
    <Animated.View entering={giris(40)} style={{ gap: 8 }}>
      <GirisSatiri rtl={rtl} icon="anvil" vurgu={!aktif && !genc}
        baslik={aktif ? t("onl.mes." + aktif) : t("onl.im.meslek.bos")}
        alt={aktif ? t("onl.im.meslek.alt") : genc ? applyParams(t("onl.im.meslek.genc"), [MESLEK_YASI]) : t("onl.im.meslek.secAlt")}
        onPress={() => git("/online/meslek")} />
      {aktif ? <GirisSatiri rtl={rtl} icon="graduate-cap" vurgu={beceriKalan > 0} baslik={t("onl.im.beceri")}
        alt={beceriKalan > 0 ? applyParams(t("onl.sm.beceri"), [beceriKalan]) : t("onl.im.beceri.alt")} onPress={() => git("/online/beceri-agaci")} /> : null}
    </Animated.View>

    {/* Üretim */}
    <Baslik2 metin={t("onl.im.b.uretim")} rtl={rtl} />
    <View style={{ gap: 8 }}>
      <GirisSatiri rtl={rtl} icon="saw" baslik={t("onl.is.kisa")} alt={t("onl.im.isler.alt")} onPress={() => git("/online/isler")} />
      <GirisSatiri rtl={rtl} icon="scroll-open" vurgu={verebilir} baslik={t("onl.sp.baslik")} alt={spAlt} rozet={acikIlan.length ? String(acikIlan.length) : undefined} onPress={() => git("/online/siparisler")} />
      <GirisSatiri rtl={rtl} icon="scroll" baslik={t("onl.eko.ismarlama")} alt={t("onl.eko.ismarlama.alt")} onPress={() => git("/online/ismarlama")} />
    </View>

    {/* İşletmelerim */}
    <Baslik2 metin={t("onl.im.b.isletme")} rtl={rtl} />
    <View style={{ gap: 8 }}>
      <GirisSatiri rtl={rtl} icon="house" gorsel={MULK_GORSELI} vurgu={!!acilir} baslik={t("onl.im.mulk")} alt={mulkAlt} onPress={() => git("/online/mulk")} />
      <GirisSatiri rtl={rtl} icon="coins" baslik={t("onl.tz.carsi")} alt={t("onl.im.carsi.alt")} onPress={() => git("/online/carsi")} />
      {mHata && !m ? <Bant metin={t(ekHataAnahtari(mHata))} rtl={rtl} eylem={t("onl.yenidenDene")} onEylem={() => { void mulkYukle(); }} />
        : !m ? <Yukleniyor metin={t("onl.im.mulk.yukleniyor")} />
        : <>
          {m.benim.map((id) => { const x = yuvaAdi(id); const g = tzler[id]; return <GirisSatiri key={id} rtl={rtl} icon={x.icon} baslik={x.ad} vurgu={!!g && rafaKonabilir(g)}
            alt={g ? `${t("onl.im.isletme.sahip")} · ${dukkanOzetMetni(t, g)}` : t("onl.im.isletme.sahip")} onPress={() => git(isletmeYolu(id))} />; })}
          {m.calistigim.filter((id) => !m.benim.includes(id)).map((id) => { const x = yuvaAdi(id); const g = tzler[id]; return <GirisSatiri key={id} rtl={rtl} icon={x.icon} baslik={x.ad}
            alt={g ? `${t("onl.im.isletme.calisan")} · ${dukkanOzetMetni(t, g)}` : t("onl.im.isletme.calisan")} onPress={() => git(isletmeYolu(id))} />; })}
          {!m.benim.length && !m.calistigim.length ? <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 20, color: C.parchmentDim, textAlign: rtl ? "right" : "left", paddingHorizontal: 4 }}>{t("onl.im.isletme.yok")}</Text> : null}
        </>}
    </View>

    {/* Kayıtlar */}
    <Baslik2 metin={t("onl.im.b.kayit")} rtl={rtl} />
    <GirisSatiri rtl={rtl} icon="book" baslik={t("onl.df.baslik")} alt={t("onl.eko.defter.alt")} onPress={() => git("/online/defter")} />
  </OnlineSayfa>;
}

export default function OnlineIsim() {
  return onlineEkranAcik() ? <OnlineKapisi><IsimEkran /></OnlineKapisi> : <OnlineYakinda />;
}
