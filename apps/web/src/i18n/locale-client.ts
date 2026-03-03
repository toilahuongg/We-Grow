import type { Locale } from "./config";

const COOKIE_NAME = "NEXT_LOCALE";

export function setLocaleCookie(locale: Locale): void {
  document.cookie = `${COOKIE_NAME}=${locale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
}
