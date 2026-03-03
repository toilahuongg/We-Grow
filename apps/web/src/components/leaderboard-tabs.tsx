"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trophy, Medal, Crown, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { orpc } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { StreakBadge } from "@/components/streak-badge";

export function LeaderboardTabs() {
  const [activeTab, setActiveTab] = useState<"global" | "groups">("global");
  const t = useTranslations("leaderboard");
  const tc = useTranslations("common");

  const { data: globalLeaderboard, isLoading: globalLoading } = useQuery({
    ...orpc.gamification.getGlobalLeaderboard.queryOptions({ input: { limit: 100 } }),
    staleTime: 1000 * 60 * 5,
  });

  const [session, setSession] = useState<any>(null);

  useState(() => {
    import("@/lib/auth-client").then(({ authClient }) => {
      authClient.getSession().then(setSession);
    });
  });

  // Find user's rank on global leaderboard
  const userRank = session?.user?.id
    ? globalLeaderboard?.findIndex((entry: any) => entry.userId === session.user.id)
    : -1;

  const getRankColor = (rank: number) => {
    if (rank === 0) return "border-yellow-500/30 bg-yellow-500/10";
    if (rank === 1) return "border-gray-400/30 bg-gray-400/10";
    if (rank === 2) return "border-amber-600/30 bg-amber-600/10";
    return "border-white/10 bg-white/5";
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
        <div className="glass-strong rounded-2xl p-6">
          {globalLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />
              ))}
            </div>
          ) : !globalLeaderboard || globalLeaderboard.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 mx-auto mb-4">
                <Trophy className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">{t("noRankingsTitle")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("noRankingsDesc")}
              </p>
            </div>
          ) : (
            <>
              {/* Top 3 Podium */}
              {globalLeaderboard.length >= 3 && (
                <div className="flex items-end justify-center gap-4 mb-8">
                  {/* 2nd Place */}
                  <div className="flex flex-col items-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gray-400 to-gray-500 text-white text-xl font-bold mb-2 shadow-lg">
                      2
                    </div>
                    <div className="glass-strong rounded-xl border border-gray-400/30 bg-gray-400/10 p-4 text-center w-32">
                      <p className="font-medium text-sm truncate">
                        {globalLeaderboard[1]?.userId === session?.user?.id
                          ? tc("you")
                          : `User #${globalLeaderboard[1]?.userId.slice(0, 8)}`}
                      </p>
                      <p className="text-lg font-bold">{globalLeaderboard[1]?.totalXp} XP</p>
                    </div>
                  </div>

                  {/* 1st Place */}
                  <div className="flex flex-col items-center">
                    <Crown className="h-8 w-8 text-yellow-500 mb-2" />
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white text-2xl font-bold mb-2 shadow-xl">
                      1
                    </div>
                    <div className="glass-strong rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-center w-36">
                      <p className="font-semibold truncate">
                        {globalLeaderboard[0]?.userId === session?.user?.id
                          ? tc("you")
                          : `User #${globalLeaderboard[0]?.userId.slice(0, 8)}`}
                      </p>
                      <p className="text-xl font-bold gradient-text">{globalLeaderboard[0]?.totalXp} XP</p>
                      <p className="text-xs text-muted-foreground">Level {globalLeaderboard[0]?.level}</p>
                    </div>
                  </div>

                  {/* 3rd Place */}
                  <div className="flex flex-col items-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-white text-xl font-bold mb-2 shadow-lg">
                      3
                    </div>
                    <div className="glass-strong rounded-xl border border-amber-600/30 bg-amber-600/10 p-4 text-center w-32">
                      <p className="font-medium text-sm truncate">
                        {globalLeaderboard[2]?.userId === session?.user?.id
                          ? tc("you")
                          : `User #${globalLeaderboard[2]?.userId.slice(0, 8)}`}
                      </p>
                      <p className="text-lg font-bold">{globalLeaderboard[2]?.totalXp} XP</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Rest of Leaderboard */}
              <div className="space-y-2">
                {globalLeaderboard.slice(3).map((entry: any, index: number) => {
                  const actualRank = index + 3;
                  const isCurrentUser = entry.userId === session?.user?.id;

                  return (
                    <div
                      key={entry.userId}
                      className={`flex items-center gap-4 rounded-xl border p-3 transition-all ${
                        isCurrentUser
                          ? "border-[#4ecdc4] bg-[#4ecdc4]/10"
                          : getRankColor(actualRank)
                      }`}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold">
                        {actualRank + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {entry.userId === session?.user?.id
                            ? tc("you")
                            : `User #${entry.userId.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-muted-foreground">Level {entry.level}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{entry.totalXp} XP</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* User's Rank (if not in top 100 or highlighted) */}
              {userRank != null && userRank >= 0 && userRank < 100 && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-sm text-muted-foreground mb-2">{t("yourRanking")}</p>
                  <div className="flex items-center gap-4 rounded-xl border border-[#4ecdc4] bg-[#4ecdc4]/10 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4ecdc4] text-white font-bold">
                      {userRank + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{tc("you")}</p>
                      <p className="text-xs text-muted-foreground">Level {globalLeaderboard[userRank]?.level}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{globalLeaderboard[userRank]?.totalXp} XP</p>
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
