"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

import { orpc } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { getAllLevelInfos, getLevelInfo } from "@/lib/level-utils";

export function BadgeCollection() {
  const t = useTranslations("badges");
  const locale = useLocale();

  const { data: badges, isLoading } = useQuery({
    ...orpc.gamification.getBadges.queryOptions(),
    staleTime: 1000 * 60,
  });

  const { data: profile } = useQuery({
    ...orpc.gamification.getProfile.queryOptions(),
    staleTime: 1000 * 60,
  });

  const earnedLevels = new Set(
    (badges as any[])?.map((b: any) => b.level as number) ?? [],
  );

  const allLevels = getAllLevelInfos();
  const currentLevel = profile?.level ?? 1;

  // Add levels beyond 10 if user has them
  if (currentLevel > 10) {
    for (let i = 11; i <= currentLevel; i++) {
      allLevels.push(getLevelInfo(i));
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="glass-strong rounded-2xl p-8">
          <div className="h-8 w-32 animate-pulse rounded bg-white/10 mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
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
            {t("subtitle", { earned: earnedLevels.size, total: allLevels.length })}
          </p>
        </div>
      </div>

      {/* Badge Grid */}
      <div className="glass-strong rounded-2xl p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {allLevels.map((info) => {
            const earned = earnedLevels.has(info.level);
            const name = locale === "vi" ? info.nameVi : info.nameEn;

            return (
              <div
                key={info.level}
                className={`flex flex-col items-center justify-center rounded-xl border p-4 transition-all ${
                  earned
                    ? "border-[#4ecdc4]/30 bg-gradient-to-br from-[#4ecdc4]/10 to-[#a78bfa]/10"
                    : "border-white/5 bg-white/5 opacity-40 grayscale"
                }`}
              >
                <span className="text-4xl mb-2">{info.icon}</span>
                <p className="text-xs font-semibold text-center">{name}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t("levelLabel", { level: info.level })}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
