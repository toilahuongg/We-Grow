"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Crown, Trophy, Users } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { RankIcon } from "@/components/rank-icon";
import { getLevelInfo } from "@/lib/level-utils";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-xl">🥇</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-overlay-medium text-sm font-bold tabular-nums">
      {rank}
    </div>
  );
}

export function LeaderboardTabs() {
  const [activeTab, setActiveTab] = useState<"global" | "groups">("global");
  const t = useTranslations("leaderboard");
  const tc = useTranslations("common");
  const locale = useLocale();

  const { data: globalLeaderboard, isLoading: globalLoading } = useQuery({
    ...orpc.gamification.getGlobalLeaderboard.queryOptions({ input: { limit: 100 } }),
    staleTime: 1000 * 60 * 5,
  });

  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    authClient.getSession().then((res) => setSession(res.data ? res.data : null));
  }, []);

  // Find user's rank on global leaderboard
  const userRank = session?.user?.id
    ? globalLeaderboard?.findIndex((entry: any) => entry.userId === session.user.id)
    : -1;

  const getName = (entry: any) => {
    if (entry.userId === session?.user?.id) return tc("you");
    return `User #${entry.userId.slice(0, 8)}`;
  };

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
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === "global" ? "default" : "outline"}
          onClick={() => setActiveTab("global")}
          size="sm"
        >
          <Trophy className="mr-2 h-4 w-4" />
          {t("global")}
        </Button>
        <Button
          variant={activeTab === "groups" ? "default" : "outline"}
          onClick={() => setActiveTab("groups")}
          size="sm"
          disabled
        >
          <Users className="mr-2 h-4 w-4" />
          {t("groupsTab")}
        </Button>
      </div>

      {/* Global Leaderboard */}
      {activeTab === "global" && (
        <div className="space-y-6">
          {globalLoading ? (
            <div className="glass-strong rounded-2xl p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-overlay-subtle" style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
          ) : !globalLeaderboard || globalLeaderboard.length === 0 ? (
            <div className="glass-strong rounded-2xl p-6 text-center py-16">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-overlay-subtle mx-auto mb-4">
                <Trophy className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">{t("noRankingsTitle")}</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {t("noRankingsDesc")}
              </p>
            </div>
          ) : (
            <>
              {/* Top 3 Podium */}
              {globalLeaderboard.length >= 3 && (
                <div className="glass-strong rounded-2xl p-6 pb-8 overflow-hidden relative">
                  {/* Decorative gradient mesh behind podium */}
                  <div className="absolute inset-0 opacity-30 pointer-events-none">
                    <div className="absolute top-0 left-1/4 h-40 w-40 rounded-full bg-[#ffd700]/10 blur-3xl" />
                    <div className="absolute top-10 right-1/4 h-32 w-32 rounded-full bg-[#4ecdc4]/10 blur-3xl" />
                  </div>

                  <div className="flex items-end justify-center gap-3 sm:gap-6 relative z-10 pt-4">
                    {/* 2nd Place */}
                    <div className="flex flex-col items-center animate-[slide-up_0.5s_ease-out_0.1s_both]">
                      <span className="text-2xl mb-1">🥈</span>
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gray-300 to-gray-500 text-white text-lg font-bold shadow-lg ring-2 ring-gray-400/30 mb-3">
                        2
                      </div>
                      <div className="rounded-2xl border border-gray-400/20 bg-gray-400/[0.06] p-4 text-center w-28 sm:w-32">
                        <p className="font-medium text-sm truncate mb-1">
                          {getName(globalLeaderboard[1])}
                        </p>
                         <p className="text-lg font-bold tabular-nums">{globalLeaderboard[1]?.totalXp} <span className="text-xs font-medium text-muted-foreground">XP</span></p>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <RankIcon level={globalLeaderboard[1]?.level} size={14} />
                          <p className="text-[11px] text-muted-foreground">
                            {locale === "vi" ? getLevelInfo(globalLeaderboard[1]?.level).nameVi : getLevelInfo(globalLeaderboard[1]?.level).nameEn}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 1st Place */}
                    <div className="flex flex-col items-center animate-[slide-up_0.5s_ease-out_both] -mt-4">
                      <Crown className="h-7 w-7 text-yellow-400 mb-1 drop-shadow-[0_0_8px_rgba(255,215,0,0.4)]" />
                      <span className="text-3xl mb-1">🥇</span>
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600 text-white text-2xl font-bold shadow-xl ring-3 ring-yellow-400/40 mb-3 shimmer">
                        1
                      </div>
                      <div className="rounded-2xl border border-yellow-500/25 bg-yellow-500/[0.08] p-4 text-center w-32 sm:w-40 shadow-[0_0_30px_rgba(255,215,0,0.06)]">
                        <p className="font-semibold truncate mb-1">
                          {getName(globalLeaderboard[0])}
                        </p>
                         <p className="text-xl font-bold gradient-text tabular-nums">{globalLeaderboard[0]?.totalXp} <span className="text-xs font-medium">XP</span></p>
                        <div className="flex items-center justify-center gap-1.5 mt-1">
                          <RankIcon level={globalLeaderboard[0]?.level} size={16} />
                          <p className="text-xs text-muted-foreground">
                            {locale === "vi" ? getLevelInfo(globalLeaderboard[0]?.level).nameVi : getLevelInfo(globalLeaderboard[0]?.level).nameEn}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 3rd Place */}
                    <div className="flex flex-col items-center animate-[slide-up_0.5s_ease-out_0.2s_both]">
                      <span className="text-2xl mb-1">🥉</span>
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-800 text-white text-lg font-bold shadow-lg ring-2 ring-amber-600/30 mb-3">
                        3
                      </div>
                      <div className="rounded-2xl border border-amber-600/20 bg-amber-600/[0.06] p-4 text-center w-28 sm:w-32">
                        <p className="font-medium text-sm truncate mb-1">
                          {getName(globalLeaderboard[2])}
                        </p>
                         <p className="text-lg font-bold tabular-nums">{globalLeaderboard[2]?.totalXp} <span className="text-xs font-medium text-muted-foreground">XP</span></p>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <RankIcon level={globalLeaderboard[2]?.level} size={14} />
                          <p className="text-[11px] text-muted-foreground">
                            {locale === "vi" ? getLevelInfo(globalLeaderboard[2]?.level).nameVi : getLevelInfo(globalLeaderboard[2]?.level).nameEn}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Rest of Leaderboard */}
              {globalLeaderboard.length > 3 && (
                <div className="glass-strong rounded-2xl p-5">
                  <div className="space-y-1.5">
                    {globalLeaderboard.slice(3).map((entry: any, index: number) => {
                      const actualRank = index + 4;
                      const isCurrentUser = entry.userId === session?.user?.id;

                      return (
                        <div
                          key={entry.userId}
                          className={`group flex items-center gap-4 rounded-xl border p-3.5 transition-all duration-200 hover:translate-y-[-1px] ${
                            isCurrentUser
                              ? "border-[#4ecdc4]/30 bg-[#4ecdc4]/[0.08] shadow-[0_0_15px_rgba(78,205,196,0.08)]"
                              : "border-overlay-subtle bg-overlay-subtle hover:bg-overlay-subtle hover:border-overlay-medium"
                          }`}
                        >
                          <RankBadge rank={actualRank} />

                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6b6b]/80 to-[#ffa06b]/80 text-white text-xs font-semibold shrink-0">
                            {getName(entry).charAt(0)}
                          </div>

                          <div className="flex-1 min-w-0">
                             <p className={`font-medium text-sm ${isCurrentUser ? "text-[#4ecdc4]" : ""}`}>
                              {getName(entry)}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <RankIcon level={entry.level} size={14} />
                              <p className="text-xs text-muted-foreground">
                                {locale === "vi" ? getLevelInfo(entry.level).nameVi : getLevelInfo(entry.level).nameEn}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="font-semibold tabular-nums text-sm">{entry.totalXp} <span className="text-xs text-muted-foreground">XP</span></p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* User's Rank Card */}
              {userRank != null && userRank >= 0 && userRank < 100 && (
                <div className="glass-strong rounded-2xl p-5 border border-[#4ecdc4]/15 bg-gradient-to-r from-[#4ecdc4]/[0.04] to-transparent">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">{t("yourRanking")}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#4ecdc4] to-[#2ab7ad] text-white font-bold text-lg shadow-lg shadow-[#4ecdc4]/20 tabular-nums">
                      {userRank + 1}
                    </div>
                     <div className="flex-1">
                      <p className="font-semibold">{tc("you")}</p>
                      <div className="flex items-center gap-1.5">
                        <RankIcon level={globalLeaderboard[userRank]?.level} size={14} />
                        <p className="text-xs text-muted-foreground">
                          {locale === "vi" 
                            ? getLevelInfo(globalLeaderboard[userRank]?.level).nameVi 
                            : getLevelInfo(globalLeaderboard[userRank]?.level).nameEn}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg tabular-nums">{globalLeaderboard[userRank]?.totalXp} <span className="text-sm font-medium text-muted-foreground">XP</span></p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Groups Leaderboard */}
      {activeTab === "groups" && (
        <div className="glass-strong rounded-2xl p-6">
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">{t("groupLeaderboards")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("groupLeaderboardsDesc")}
            </p>
            <Link href="/groups">
              <Button className="mt-4">{t("browseGroups")}</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
