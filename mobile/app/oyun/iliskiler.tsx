// İlişkiler: ocak ve aile, yakın çevre, hasımlar, tanışlar — portre kartları, grup çipleri ve yol gösteren boş durumlar.
// Yakın çember (en çok 15 kişi, nerede olurlarsa olsunlar) rol etiketiyle kendi grubunda başta; yöre halkı ilişkisine göre dizilir.
import { useMemo, useRef, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { useMp } from "../../lib/mp/store";
import { useI18n, applyParams } from "../../lib/i18n";
import { professionNameL, placeName } from "../../lib/locale-data";
import { PageHeader, ScreenFresk } from "../../lib/ui";
import { C, F } from "../../lib/theme";
import { iliskiModeli, rolTonu, bantOf, GRUPLAR, type Grup, type Kisi } from "../../lib/sayfa/iliskiler/model";
import { FiltreCipleri, BolumPaneli, KisiKarti, KartIzgarasi, KisiSatiri, IliskiOlcer, IliskiOlcumu, BagCubugu, BosDurum, TumunuGor, CopcatanSatiri, DiyarOyunculari, useBantEtiketi, useGrupMetni, puanYazi, type Filtre, type KartVerisi } from "../../lib/sayfa/iliskiler/ui";

const KISA = 6; // "Hepsi" görünümünde grup başına gösterilen kişi; fazlası grubun çipinde açılır
const puanTonu = (v: number) => (v >= 20 ? C.sage : v <= -20 ? C.blood : C.parchmentDim);

export default function Iliskiler() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, mpMode } = useGame();
  const { snapshot, guestId } = useMp();
  const { lang, t } = useI18n();
  const bant = useBantEtiketi(); const metin = useGrupMetni();
  const [filtre, setFiltre] = useState<Filtre>("hepsi");
  const scroll = useRef<ScrollView>(null);
  // Nüfus yaşar: doğan, ölen, göçen ve değişen gönüller her durumda kadroya yansır.
  const model = useMemo(() => (state ? iliskiModeli(state, lang) : null), [state, lang]);
  if (!state || !model) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const p = state.player;
  const copcatanAcik = !p.married && p.age >= 18; // görücü usulü: bekâr yetişkine talip önerisi
  const profil = (id: string) => router.push(`/oyun/npc/${id}`);
  const copcatan = () => router.push("/oyun/copcatan");
  const mahalle = { icon: "house", label: t("iliskiler.git.mahalle"), onPress: () => router.push("/oyun/mahalle") };
  const sec = (f: Filtre) => { setFiltre(f); scroll.current?.scrollTo({ y: 0, animated: true }); };

  const kart = (k: Kisi): KartVerisi => {
    const tone = k.rol ? rolTonu(k.rol) : bantOf(k.v).tone;
    const sub = `${professionNameL(k.npc.profession, lang, k.npc.gender === "kadın")} · ${k.npc.age}`;
    const place = k.uzak ? placeName(k.loc, lang) : undefined; const rol = k.rol ? t(k.rol) : undefined;
    return {
      key: k.npc.id, seed: k.npc.id, age: k.npc.age, gender: k.npc.gender, name: k.npc.name, sub, place, tone, rol: rol ? { text: rol, tone } : undefined,
      a11y: [k.npc.name, rol, sub, place, `${bant(k.v)} ${puanYazi(k.v)}`].filter(Boolean).join(", "),
      olcum: <IliskiOlcumu etiket={bant(k.v)} deger={puanYazi(k.v)} tone={puanTonu(k.v)}><IliskiOlcer v={k.v} /></IliskiOlcumu>,
      onPress: () => profil(k.npc.id),
    };
  };
  // Çocukluk yoldaşı ("can dostu") çemberde değilse kendi kartıyla: bağ ölçeği ve hâli (ömürlük dost, rakip, yolları ayrıldı).
  const yoldasKarti = (): KartVerisi | null => {
    const y = model.yoldas; if (!y) return null;
    const tone = y.rakip ? C.blood : C.roseDim; const durum = t(y.durumKey); const sub = t("child.friend.of");
    return {
      key: "yoldas:" + y.id, seed: y.seed, age: y.age, gender: y.gender, name: y.ad, sub, tone, rol: { text: durum, tone },
      a11y: `${y.ad}, ${sub}, ${durum}, ${t("iliskiler.bag")} ${y.bag}`,
      olcum: <IliskiOlcumu etiket={t("iliskiler.bag")} deger={String(y.bag)} tone={tone}><BagCubugu pct={y.bag} tone={tone} /></IliskiOlcumu>,
      onPress: y.kayitli ? () => profil(y.id) : undefined,
    };
  };

  const bolum = (g: Grup) => {
    const hepsi = filtre === "hepsi"; const n = model.sayi[g]; const sinir = hepsi ? KISA : Infinity;
    const kisiler = model.gruplar[g];
    // Boş durumda tek eylem: ailede çöpçatan (uygunsa), tanış ve yakınlarda mahalle (Hepsi görünümünde yinelenmesin diye yalnız tanışlarda).
    const eylem = g === "aile" ? (copcatanAcik ? { icon: "ring", label: t("iliskiler.git.copcatan"), onPress: copcatan } : undefined)
      : g === "tanis" || (g === "yakin" && !hepsi) ? mahalle : undefined;
    let govde;
    if (n === 0) govde = <BosDurum grup={g} metin={metin[g].bos} eylem={eylem} kisa={hepsi} />;
    else if (g === "tanis") govde = <View>{kisiler.slice(0, sinir).map((k, i) => <KisiSatiri key={k.npc.id} name={k.npc.name} seed={k.npc.id} age={k.npc.age} gender={k.npc.gender} profession={k.npc.profession} v={k.v} first={i === 0} index={i} onPress={() => profil(k.npc.id)} />)}</View>;
    else {
      const yk = model.yoldasGrup === g ? yoldasKarti() : null;
      const kartlar = [...(yk ? [yk] : []), ...kisiler.map(kart)].slice(0, sinir);
      govde = <KartIzgarasi>{kartlar.map((k, i) => <KisiKarti key={k.key} k={k} index={i} />)}</KartIzgarasi>;
    }
    return <BolumPaneli key={g} grup={g} sayi={n} notsuz={n === 0 && hepsi}>
      {govde}
      {n > sinir && <TumunuGor grup={g} sayi={n} onPress={() => sec(g)} />}
      {g === "aile" && n > 0 && copcatanAcik && <CopcatanSatiri onPress={copcatan} />}
    </BolumPaneli>;
  };

  const oyuncular = mpMode && snapshot && snapshot.players.length > 0 ? snapshot.players : null;
  return (
    <ScreenFresk style={{ paddingTop: insets.top }}>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={placeName(p.location_name, lang)} title={t("rel.headTitle")} sub={applyParams(t("rel.subSome"), [model.toplam])} />
        {model.toplam > 0 && <FiltreCipleri secili={filtre} sayi={model.sayi} toplam={model.toplam} onSec={sec} />}
        {/* Diyar hanedanları: aynı diyarda yaşayan gerçek oyuncular (çok oyunculu) */}
        {oyuncular && filtre === "hepsi" && <DiyarOyunculari players={oyuncular} guestId={guestId} />}
        {model.toplam === 0 ? (
          <View style={{ marginBottom: 14, padding: 14, borderWidth: 1, borderColor: C.borderHi, borderRadius: 8, backgroundColor: "rgba(24,18,11,0.9)" }}>
            <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 17, lineHeight: 23, color: C.gold, textAlign: "center" }}>{t("rel.noneTitle")}</Text>
            <BosDurum grup="tanis" metin={t("rel.noneBody")} eylem={mahalle} />
            {copcatanAcik && <CopcatanSatiri onPress={copcatan} />}
          </View>
        ) : (filtre === "hepsi" ? GRUPLAR : [filtre]).map(bolum)}
      </ScrollView>
    </ScreenFresk>
  );
}
