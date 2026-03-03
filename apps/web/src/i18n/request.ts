import { getRequestConfig } from "next-intl/server";
import { getLocaleFromCookie } from "./locale";

export default getRequestConfig(async () => {
  const locale = await getLocaleFromCookie();

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
