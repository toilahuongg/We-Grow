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

  const allLevels = getAllLevelInfos(profile?.gender);
  const currentLevel = profile?.level ?? 1;

  // Add levels beyond the base levels if user has them
  const baseLevelCount = allLevels.length;
  if (currentLevel > baseLevelCount) {
    for (let i = baseLevelCount + 1; i <= currentLevel; i++) {
      allLevels.push(getLevelInfo(i, profile?.gender));
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="glass-strong rounded-2xl p-8">
          <div className="h-8 w-32 animate-pulse rounded bg-overlay-medium mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-overlay-subtle" />
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
          {allLevels.map((info) => {
            const earned = earnedLevels.has(info.level);
            const name = locale === "vi" ? info.nameVi : info.nameEn;

            return (
              <div
                key={info.level}
                className={`group flex flex-col items-center justify-center rounded-2xl border p-5 transition-all duration-300 ${
                  earned
                    ? "border-[#4ecdc4]/30 bg-gradient-to-br from-[#4ecdc4]/10 to-[#a78bfa]/10 shadow-lg shadow-[#4ecdc4]/5"
                    : "border-overlay-subtle bg-overlay-subtle opacity-40 grayscale"
                }`}
              >
                <div className="relative mb-3 aspect-square w-16 sm:w-20 transition-transform duration-300 group-hover:scale-110">
                  <img
                    src={info.icon}
                    alt={name}
                    className="h-full w-full object-contain drop-shadow-md"
                  />
                </div>
                <p className="text-xs font-bold text-center leading-tight">{name}</p>
                <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">
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
