// Sayfa başına çeviri dosyaları (paralel geliştirmede çakışma olmasın diye ayrı).
import type { Lang } from "../locale-data";
import { rows as ana } from "./ana";
import { rows as karakter } from "./karakter";
import { rows as iliskiler } from "./iliskiler";
import { rows as menu } from "./menu";
import { rows as sehir } from "./sehir";
import { rows as pazar } from "./pazar";
import { rows as atolye } from "./atolye";
import { rows as meslek } from "./meslek";
import { rows as mulkler } from "./mulkler";
import { rows as mahalle } from "./mahalle";
import { rows as sinematik } from "./sinematik";
import { rows as online } from "./online";

const all: Record<string, string[]> = { ...ana, ...karakter, ...iliskiler, ...menu, ...sehir, ...pazar, ...atolye, ...meslek, ...mulkler, ...mahalle, ...sinematik, ...online };
export const SAYFA_METIN = Object.fromEntries((["tr", "en", "es", "pt", "ar", "ru"] as Lang[]).map((lang, i) => [lang, Object.fromEntries(Object.entries(all).map(([key, values]) => [key, values[i]]))])) as Record<Lang, Record<string, string>>;
