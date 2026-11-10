// Meslek başına ağaç teması: arka plan sahnesi, düğüm zemini, mesleğin vurgu rengi. Durum renkleri (öğrenilmiş buz
// mavisi, seçili altın, öğreniliyor köz) bütün ağaçlarda aynı kalır; yalnız zemin ve vurgu mesleğe göre hafif değişir.
import type { MeslekId } from "../protokol";
import type { SAHNE_GORSEL } from "../../sahne-tema";
import { C } from "../../theme";

export interface AgacTema {
  sahne: keyof typeof SAHNE_GORSEL;
  /** Düğüm zemini (üst, alt). */
  zemin: [string, string];
  /** Mesleğin renkli zemini: vurgulu usta düğümü ve panel ikon kutusu. */
  renkli: [string, string];
  /** İkonun vurgu katmanı (köz, başak, ot…). */
  vurgu: string;
  /** Renkli düğümün içindeki vurgu. */
  vurguKoyu: string;
  bolum: string;
  bolumKenar: string;
  serit: string;
  /** Ekranın üstüne düşen hafif renk süzmesi. */
  isik: string;
}

const tema = (sahne: AgacTema["sahne"], zemin: [string, string], renkli: [string, string], vurgu: string, vurguKoyu: string, kenar: string, serit: string, isik: string, bolum = "rgba(12,10,8,0.5)"): AgacTema =>
  ({ sahne, zemin, renkli, vurgu, vurguKoyu, bolum, bolumKenar: kenar, serit, isik });

export const AGAC_TEMA: Record<MeslekId, AgacTema> = {
  demirci: tema("atolye_demirci", ["#2A2621", "#16130F"], ["#5E2119", "#2A0E0A"], C.goldBright, C.ember, "rgba(201,162,78,0.16)", "#18140F", "rgba(224,90,48,0.12)"),
  ciftci: tema("hasat", ["#262A1C", "#13160D"], ["#4C581E", "#222A0C"], "#E6C65A", "#C8DC74", "rgba(176,196,98,0.24)", "#151A0E", "rgba(150,186,70,0.12)", "rgba(10,13,7,0.52)"),
  oduncu: tema("nehir", ["#24261E", "#121310"], ["#3C4A26", "#182110"], "#D2A266", "#A9CC84", "rgba(150,170,110,0.24)", "#14160F", "rgba(110,150,80,0.12)", "rgba(9,12,8,0.52)"),
  marangoz: tema("ev_varlikli", ["#2C2219", "#17110B"], ["#5A3A1C", "#2A1A0A"], "#E2AA68", "#F2C47C", "rgba(208,150,90,0.24)", "#1A130C", "rgba(200,130,60,0.12)"),
  dokumaci: tema("dugun", ["#2A1D22", "#150E11"], ["#5C1E2E", "#2A0C14"], "#DE6E86", "#EC94A8", "rgba(212,82,138,0.22)", "#1A1014", "rgba(192,85,107,0.12)", "rgba(13,8,10,0.52)"),
  asci: tema("ev_yoksul", ["#2C2218", "#17110A"], ["#6A3A14", "#2E1808"], "#F0A244", "#F6BC66", "rgba(224,146,46,0.24)", "#1C140B", "rgba(224,146,46,0.12)"),
  hanci: tema("gurbet_yol", ["#2A241A", "#15110B"], ["#5A4418", "#2A1E08"], "#F3C866", "#FFD98A", "rgba(224,188,90,0.24)", "#1A150C", "rgba(224,188,90,0.12)"),
  sifaci: tema("dogum", ["#1C2620", "#0E1410"], ["#1F4A30", "#0C2416"], "#92D69C", "#AEE8B4", "rgba(120,200,140,0.24)", "#0F1A12", "rgba(74,154,90,0.14)", "rgba(7,12,9,0.54)"),
  ozan: tema("ahi_tekke", ["#221D2A", "#110E16"], ["#3E2A5E", "#1C1230"], "#BCA4E8", "#D0BCF4", "rgba(150,120,210,0.24)", "#16121D", "rgba(123,79,175,0.14)", "rgba(10,8,14,0.54)"),
  katip: tema("medrese", ["#1C2130", "#0E1018"], ["#1E2E5A", "#0C142C"], "#92B2EA", "#AAC6F2", "rgba(110,150,220,0.24)", "#10141F", "rgba(70,100,180,0.14)", "rgba(7,9,15,0.54)"),
  tuccar: tema("cami_avlu", ["#1C2624", "#0E1413"], ["#16484A", "#082224"], "#6CCABE", "#F3D27A", "rgba(95,176,166,0.24)", "#0F1A19", "rgba(80,170,160,0.12)", "rgba(7,12,12,0.54)"),
  arabulucu: tema("kadi_divan", ["#25261C", "#13140E"], ["#46481C", "#20210A"], "#CACE7A", "#DEE292", "rgba(190,196,110,0.24)", "#16170F", "rgba(170,176,90,0.12)"),
  asker: tema("mogol_baskin", ["#24242A", "#121216"], ["#5A1E1E", "#2A0C0C"], "#DA6E5E", "#F08A78", "rgba(180,190,200,0.22)", "#15151A", "rgba(200,64,64,0.12)", "rgba(9,9,12,0.54)"),
  divan: tema("kadi_divan", ["#261C2A", "#130E16"], ["#4E2460", "#240E2E"], C.goldBright, "#D2AAEA", "rgba(170,120,200,0.24)", "#18111C", "rgba(123,79,175,0.14)", "rgba(11,8,14,0.54)"),
};
