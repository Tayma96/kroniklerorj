// Açılışı yeniden izle: "Küllerin Mirası" sinematiği, seçili dilde anlatıcıyla.
import { useMemo } from "react";
import { useRouter } from "expo-router";
import { useI18n } from "../lib/i18n";
import { Sinematik } from "../lib/sinematik/oynatici";
import { girisCekimleri, girisParca, GIRIS_VIDEO } from "../lib/sinematik/giris";

export default function SinematikEkrani() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const cekimler = useMemo(() => girisCekimleri(lang, t), [lang, t]);
  const kapat = () => (router.canGoBack() ? router.back() : router.replace("/oyun"));
  return <Sinematik cekimler={cekimler} parca={girisParca(lang)} video={GIRIS_VIDEO} onDone={kapat} />;
}
