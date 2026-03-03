export const locales = ["en", "vi", "fr", "es"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  vi: "Tiếng Việt",
  fr: "Français",
  es: "Español",
};
