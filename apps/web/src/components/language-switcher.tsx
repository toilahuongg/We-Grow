"use client";

import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { locales, localeNames } from "@/i18n/config";
import { setLocaleCookie } from "@/i18n/locale-client";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { Locale } from "@/i18n/config";

export function LanguageSwitcher() {
  const currentLocale = useLocale();
  const router = useRouter();

  const handleChange = (locale: Locale) => {
    setLocaleCookie(locale);
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline", size: "icon" }))}>
        <Globe className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Change language</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleChange(locale)}
            className={cn(currentLocale === locale && "font-bold")}
          >
            {localeNames[locale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
