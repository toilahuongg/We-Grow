import { cookies } from "next/headers";
import { defaultLocale, locales } from "./config";
import type { Locale } from "./config";

const COOKIE_NAME = "NEXT_LOCALE";

export async function getLocaleFromCookie(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (value && locales.includes(value as Locale)) {
    return value as Locale;
  }
  return defaultLocale;
}
