// Açılışı yeniden izle: "Küllerin Mirası" sinematiği, mevcut karakterin ocağı, tabiatı ve adıyla.
import { useMemo } from "react";
import { useRouter } from "expo-router";
import { useGame } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { Sinematik } from "../lib/sinematik/oynatici";
import { cekimListesi } from "../lib/sinematik/cekimler";

export default function SinematikEkrani() {
  const router = useRouter();
  const { t } = useI18n();
  const p = useGame().state?.player;
  const cekimler = useMemo(
    () => cekimListesi(p?.birth_house ?? "koylu", p?.temperament ?? "yigit", p?.gender ?? "erkek", (p?.name ?? "").split(" ")[0], t),
    [p?.birth_house, p?.temperament, p?.gender, p?.name, t],
  );
  const kapat = () => (router.canGoBack() ? router.back() : router.replace("/oyun"));
  return <Sinematik cekimler={cekimler} onDone={kapat} />;
}
