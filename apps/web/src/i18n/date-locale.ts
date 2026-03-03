import { enUS, vi, fr, es } from "date-fns/locale";
import type { Locale as DateFnsLocale } from "date-fns";
import type { Locale } from "./config";

const dateLocaleMap: Record<Locale, DateFnsLocale> = {
  en: enUS,
  vi: vi,
  fr: fr,
  es: es,
};

export function getDateFnsLocale(locale: Locale): DateFnsLocale {
  return dateLocaleMap[locale] ?? enUS;
}
