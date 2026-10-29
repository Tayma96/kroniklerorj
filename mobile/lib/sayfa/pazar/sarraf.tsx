// Sarraf sekmesi: hesap özeti, ödünç/borç, emanet, at rehini, zekât ve hane geçimi.
import { View, Text } from "react-native";
import type { GameState } from "../../game";
import { loanCapacity, loanRate, borrow, repay, depositCoin, withdrawCoin, DEPOSIT_ANNUAL_YIELD, lifestyleUpkeep, giveZekat, zekatDue, zekatAvailable, pawnHorse, redeemHorse, horsePawnValue, horseRedeemCost } from "../../game";
import { useI18n, applyParams, yuzdeL } from "../../i18n";
import { hap } from "../../haptics";
import { playCoin } from "../../sound";
import { StatStrip } from "../../ornament-ui";
import { C, F } from "../../theme";
import { Bolum, Not, AltBaslik, EylemDugmesi, Madalyon } from "./parcalar";

export function SarrafSekmesi({ state, apply, rtl }: { state: GameState; apply: (fn: (s: GameState) => GameState) => void; rtl: boolean }) {
  const { lang, t } = useI18n();
  const p = state.player;
  const row = rtl ? "row-reverse" as const : "row" as const;

  if (p.age < 16) {
    return <Bolum title={t("paz.sarrafTitle")} icon="coins" rtl={rtl}>
      <View style={{ flexDirection: row, alignItems: "center", gap: 12 }}>
        <Madalyon icon="book" size={40} dim />
        <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, lineHeight: 21, color: C.parchmentDim, textAlign: rtl ? "right" : "left" }}>{t("pazar.locked16")}</Text>
      </View>
    </Bolum>;
  }

  const cap = loanCapacity(state);
  const debt = Math.round(p.debt || 0);
  const dep = Math.round(p.deposit || 0);
  const ratePct = Math.round(loanRate(state) * 1000) / 10;
  const borrowAmts = [250, 1000].filter((a) => a <= cap);
  const repayAmts = [250, 1000].filter((a) => a <= debt && a <= p.money);
  const upkeep = lifestyleUpkeep(state);
  const z = zekatDue(state);
  const zCan = zekatAvailable(state);
  const act = (fn: (s: GameState) => GameState, kind: "advance" | "tap" = "tap") => { hap(kind); playCoin(); apply(fn); };
  const btnRow = { flexDirection: row, gap: 8 };

  return <>
    {/* Hesap özeti */}
    <View style={{ marginBottom: 12, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 10, borderWidth: 1, borderColor: C.borderHi, backgroundColor: "rgba(22,16,9,0.9)" }}>
      <StatStrip rtl={rtl} items={[
        { icon: "scroll", label: t("paz.debt"), value: `${debt} ⚜`, tone: debt > 0 ? C.blood : C.parchment },
        { icon: "amphora", label: t("paz.depBal"), value: `${dep} ⚜`, tone: dep > 0 ? C.sage : C.parchment },
        { icon: "house", label: t("pazar.upkeepLbl"), value: `${upkeep} ⚜`, tone: C.parchment },
      ]} />
    </View>

    {/* Ödünç / borç */}
    <Bolum title={t("paz.borrow")} icon="coins" rtl={rtl} right={<Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchmentMuted }}>{t("paz.borrowCap").replace("%c", String(cap))}</Text>}>
      <Not rtl={rtl}>{t("paz.sarrafRate").replace("%r", String(ratePct))}</Not>
      {cap > 0 ? (
        <View style={btnRow}>
          {borrowAmts.map((amt) => <EylemDugmesi key={amt} rtl={rtl} label={`${amt} ⚜`} style={{ flex: 1 }} onPress={() => act((s) => borrow(s, amt), "advance")} />)}
          <EylemDugmesi rtl={rtl} label={t("paz.max")} sub={`${cap} ⚜`} style={{ flex: 1 }} onPress={() => act((s) => borrow(s, cap), "advance")} />
        </View>
      ) : <Not rtl={rtl} tone={C.parchmentDim} mb={0}>{t("paz.noCredit")}</Not>}
      {debt > 0 ? <>
        <View style={{ height: 1, backgroundColor: C.border, marginVertical: 11 }} />
        <AltBaslik rtl={rtl} text={t("paz.repay")} right={<Text style={{ fontFamily: F.display, fontSize: 14, color: C.blood }}>{t("paz.debt")}: {debt} ⚜</Text>} />
        {p.money > 0 ? (
          <View style={btnRow}>
            {repayAmts.map((amt) => <EylemDugmesi key={amt} rtl={rtl} tone={C.sage} label={`${amt} ⚜`} style={{ flex: 1 }} onPress={() => act((s) => repay(s, amt))} />)}
            <EylemDugmesi rtl={rtl} tone={C.sage} label={t("paz.repayAll")} sub={`${Math.min(p.money, debt)} ⚜`} style={{ flex: 1 }} onPress={() => act((s) => repay(s, Math.min(p.money, debt)))} />
          </View>
        ) : <Not rtl={rtl} tone={C.parchmentDim} mb={0}>{t("paz.noCash")}</Not>}
      </> : null}
    </Bolum>

    {/* Emanet: âtıl serveti sarrafta sakla — yağma/hırsızlıktan emin, küçük getiri */}
    <Bolum title={t("paz.deposit")} icon="amphora" tone={C.sage} rtl={rtl} right={<Text style={{ fontFamily: F.display, fontSize: 13, color: C.sage }}>{yuzdeL(Math.round(DEPOSIT_ANNUAL_YIELD * 100), lang)}/{t("paz.perYear")}</Text>}>
      {dep > 0 ? <Not rtl={rtl} tone={C.sage}>{t("paz.depBal")}: {dep} ⚜</Not> : null}
      {(p.money > 0 || dep > 0) ? (
        <View style={btnRow}>
          {[250, 1000].filter((a) => a <= p.money).map((amt) => <EylemDugmesi key={amt} rtl={rtl} tone={C.sage} label={`+${amt} ⚜`} style={{ flex: 1 }} onPress={() => act((s) => depositCoin(s, amt))} />)}
          {dep > 0 ? <EylemDugmesi rtl={rtl} label={t("paz.withdrawAll")} sub={`${dep} ⚜`} style={{ flex: 1 }} onPress={() => act((s) => withdrawCoin(s, dep))} /> : null}
        </View>
      ) : <Not rtl={rtl} tone={C.parchmentDim} mb={0}>{t("paz.noCash")}</Not>}
    </Bolum>

    {/* At rehini: sarraf atı rehin alır — hızlı akçe, süresinde kurtarılmazsa yular el değiştirir */}
    {(p.horse || p.horse_pawn) ? (
      <Bolum title={t("paz.horsePawn")} icon="scroll" tone={C.ember} rtl={rtl}>
        {p.horse_pawn && !p.horse ? (() => {
          const rc = horseRedeemCost(p); const canR = p.money >= rc;
          return <>
            <Not rtl={rtl}>{applyParams(t("paz.horsePawned"), [p.horse_pawn.n, Math.max(0, p.horse_pawn.until - state.turn)])}</Not>
            <EylemDugmesi rtl={rtl} tone={C.sage} disabled={!canR} label={applyParams(t("paz.horseRedeem"), [rc])} onPress={() => act((s) => redeemHorse(s))} />
          </>;
        })() : p.horse ? (
          <EylemDugmesi rtl={rtl} tone={C.ember} label={applyParams(t("paz.horsePawnBtn"), [p.horse_name || "", horsePawnValue(state)])} onPress={() => act((s) => pawnHorse(s))} />
        ) : null}
      </Bolum>
    ) : null}

    {/* Zekât: serveti saygınlığa çevir (gönüllü, yılda bir) */}
    {(z > 0 || zCan) ? (
      <Bolum title={t("paz.zekat")} icon="prayer-beads" rtl={rtl} right={z > 0 ? <Text style={{ fontFamily: F.display, fontSize: 15, color: C.gold }}>{z} ⚜</Text> : undefined}>
        <Not rtl={rtl}>{t("paz.zekatHint")}</Not>
        {zCan
          ? <EylemDugmesi rtl={rtl} filled icon="prayer-beads" label={t("paz.zekatGive")} onPress={() => act((s) => giveZekat(s), "advance")} />
          : <Not rtl={rtl} tone={C.parchmentDim} mb={0}>{t("paz.zekatDone")}</Not>}
      </Bolum>
    ) : null}

    {/* Şeffaflık: ay kapanışında sessizce düşen hane geçimi burada görünür (birikim kademesi dahil) */}
    <Not rtl={rtl} tone={C.parchmentDim} mt={2}>{t("paz.upkeep").replace("%c", String(upkeep))}</Not>
  </>;
}
