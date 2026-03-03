"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, User, Clock, Bell, Globe } from "lucide-react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";

import { orpc } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { locales, localeNames } from "@/i18n/config";
import { setLocaleCookie } from "@/i18n/locale-client";
import type { Locale } from "@/i18n/config";

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Australia/Sydney",
];

export function SettingsForm({ session }: { session: any }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const currentLocale = useLocale();
  const [logoutDialog, setLogoutDialog] = useState(false);
  const [timezone, setTimezone] = useState("UTC");

  useState(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && COMMON_TIMEZONES.includes(detected)) {
      setTimezone(detected);
    }
  });

  const updateTimezoneMutation = useMutation({
    mutationFn: async (newTimezone: string) => {
      toast.success(t("timezoneUpdated"));
      setTimezone(newTimezone);
    },
  });

  const handleLogout = async () => {
    await authClient.signOut();
    queryClient.clear();
    router.push("/login");
    toast.success(t("loggedOut"));
  };

  const handleLanguageChange = (locale: Locale) => {
    setLocaleCookie(locale);
    router.refresh();
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* Account Info */}
      <div className="glass-strong rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6b6b]/20 to-[#ffa06b]/20">
            <User className="h-5 w-5 text-[#ff6b6b]" />
          </div>
          <div>
            <h2 className="font-semibold">{t("accountInfo")}</h2>
            <p className="text-sm text-muted-foreground">{t("accountInfoDesc")}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-sm text-muted-foreground">{t("email")}</span>
            <span className="text-sm font-medium">{session.user?.email}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-sm text-muted-foreground">{t("name")}</span>
            <span className="text-sm font-medium">{session.user?.name || t("notSet")}</span>
          </div>
        </div>
      </div>

      {/* Language Settings */}
      <div className="glass-strong rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#a78bfa]/20 to-[#f472b6]/20">
            <Globe className="h-5 w-5 text-[#a78bfa]" />
          </div>
          <div>
            <h2 className="font-semibold">{t("language")}</h2>
            <p className="text-sm text-muted-foreground">{t("languageDesc")}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {locales.map((locale) => {
            const isSelected = currentLocale === locale;
            return (
              <button
                key={locale}
                onClick={() => handleLanguageChange(locale)}
                className={`w-full text-left rounded-xl border p-3 transition-all ${
                  isSelected
                    ? "border-[#a78bfa] bg-[#a78bfa]/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="block text-sm font-medium">{localeNames[locale]}</span>
                  {isSelected && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#a78bfa]">
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timezone Settings */}
      <div className="glass-strong rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ffa06b]/20 to-[#4ecdc4]/20">
            <Clock className="h-5 w-5 text-[#ffa06b]" />
          </div>
          <div>
            <h2 className="font-semibold">{t("timezone")}</h2>
            <p className="text-sm text-muted-foreground">{t("timezoneDesc")}</p>
          </div>
        </div>

        <div className="space-y-2">
          {COMMON_TIMEZONES.map((tz) => {
            const isSelected = timezone === tz;
            const tzDisplay = tz.replace("_", " ");
            const offset = new Intl.DateTimeFormat("en-US", {
              timeZone: tz,
              timeZoneName: "shortOffset",
            }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value;

            return (
              <button
                key={tz}
                onClick={() => updateTimezoneMutation.mutate(tz)}
                className={`w-full text-left rounded-xl border p-3 transition-all ${
                  isSelected
                    ? "border-[#4ecdc4] bg-[#4ecdc4]/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-sm font-medium">{tzDisplay}</span>
                    <span className="text-xs text-muted-foreground">{offset}</span>
                  </div>
                  {isSelected && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#4ecdc4]">
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications */}
      <div className="glass-strong rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4ecdc4]/20 to-[#a78bfa]/20">
            <Bell className="h-5 w-5 text-[#4ecdc4]" />
          </div>
          <div>
            <h2 className="font-semibold">{t("notifications")}</h2>
            <p className="text-sm text-muted-foreground">{t("notificationsDesc")}</p>
          </div>
        </div>

        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-4">
            {t("setupReminders")}
          </p>
          <Link href="/reminders">
            <Button variant="outline">{t("manageReminders")}</Button>
          </Link>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-strong rounded-2xl border border-red-500/20 p-6">
        <h2 className="font-semibold text-red-500 mb-4">{t("dangerZone")}</h2>

        <div className="space-y-3">
          <Button
            variant="outline"
            onClick={() => setLogoutDialog(true)}
            className="w-full justify-start"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("logOut")}
          </Button>
        </div>
      </div>

      {/* Logout Confirmation */}
      <ConfirmDialog
        open={logoutDialog}
        onOpenChange={setLogoutDialog}
        title={t("logOutConfirmTitle")}
        description={t("logOutConfirmDesc")}
        confirmText={t("logOut")}
        variant="warning"
        onConfirm={handleLogout}
      />
    </div>
  );
}
