"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Flame,
  Award,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";

import { orpc, client } from "@/utils/orpc";
import { RankIcon } from "@/components/rank-icon";
import { LevelProgress } from "@/components/level-progress";
import { LevelUpModal } from "@/components/level-up-modal";
import { PushNotificationPopup } from "@/components/push-notification-banner";
import { getLevelInfo } from "@/lib/level-utils";
import { toast } from "sonner";
import { getHabitIcon } from "@/lib/habit-utils";
import { getLocalToday } from "@/lib/date-utils";

export function Dashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);

  const { data: todayHabits, isLoading: habitsLoading } = useQuery({
    ...orpc.habits.todaySummary.queryOptions(),
    staleTime: 1000 * 60,
  });

  const { data: profile } = useQuery({
    ...orpc.gamification.getProfile.queryOptions(),
    staleTime: 1000 * 60,
  });

  const { data: badges } = useQuery({
    ...orpc.gamification.getBadges.queryOptions(),
    staleTime: 1000 * 60,
  });

  const completeHabit = useMutation({
    mutationFn: (habitId: string) => client.habits.complete({ habitId }),
    onMutate: async (habitId) => {
      await queryClient.cancelQueries({ queryKey: orpc.habits.todaySummary.queryKey() });
      const previous = queryClient.getQueryData(orpc.habits.todaySummary.queryOptions().queryKey);
      queryClient.setQueryData(
        orpc.habits.todaySummary.queryOptions().queryKey,
        (old: any[] | undefined) => old?.map(h => {
          if (h._id !== habitId) return h;
          const targetPerDay = h.targetPerDay ?? 1;
          const newCount = (h.completedCount ?? 0) + 1;
          return {
            ...h,
            completedCount: newCount,
            completedToday: newCount >= targetPerDay
          };
        })
      );
      return { previous };
    },
    onSuccess: (result: any, habitId: string) => {
      if (!result.alreadyCompleted) {
        toast.success(t("xpAwarded", { amount: result.xpAwarded ?? 0 }));
        if (result.leveledUp && result.newLevel) {
          setLevelUpLevel(result.newLevel);
        }
      }
      queryClient.invalidateQueries({ queryKey: orpc.habits.todaySummary.queryKey() });
      queryClient.invalidateQueries({ queryKey: orpc.gamification.getProfile.queryKey() });
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(orpc.habits.todaySummary.queryOptions().queryKey, context?.previous);
      toast.error(t("failedComplete"));
    },
  });

  const uncompleteHabit = useMutation({
    mutationFn: (habitId: string) => client.habits.uncomplete({ habitId }),
    onMutate: async (habitId) => {
      await queryClient.cancelQueries({ queryKey: orpc.habits.todaySummary.queryKey() });
      const previous = queryClient.getQueryData(orpc.habits.todaySummary.queryOptions().queryKey);
      queryClient.setQueryData(
        orpc.habits.todaySummary.queryOptions().queryKey,
        (old: any[] | undefined) => old?.map(h => {
          if (h._id !== habitId) return h;
          const targetPerDay = h.targetPerDay ?? 1;
          const newCount = Math.max(0, (h.completedCount ?? 0) - 1);
          return {
            ...h,
            completedCount: newCount,
            completedToday: newCount >= targetPerDay
          };
        })
      );
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.habits.todaySummary.queryKey() });
      queryClient.invalidateQueries({ queryKey: orpc.gamification.getProfile.queryKey() });
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(orpc.habits.todaySummary.queryOptions().queryKey, context?.previous);
      toast.error(t("failedUncomplete"));
    },
  });

  const dueHabits = (todayHabits as any[])?.filter((h: any) => h.isDue) ?? [];
  const habitsFinished = dueHabits.filter((h: any) => h.completedToday).length;
  const totalDue = dueHabits.length;
  const totalTargetSteps = dueHabits.reduce((acc: number, h: any) => acc + (h.targetPerDay ?? 1), 0);
  const currentCompletedSteps = dueHabits.reduce((acc: number, h: any) => acc + (h.completedCount ?? 0), 0);
  const progressPercent = totalTargetSteps > 0 ? Math.round((currentCompletedSteps / totalTargetSteps) * 100) : 0;

  // Best current streak
  const allHabits = (todayHabits as any[]) ?? [];
  const bestStreak = allHabits.reduce((max, h) => Math.max(max, h.currentStreak ?? 0), 0);
  const bestStreakHabit = allHabits.find((h: any) => (h.currentStreak ?? 0) === bestStreak && bestStreak > 0);

  // Recent badges (last 5)
  const recentBadges = ((badges as any[]) ?? []).slice(-5).reverse();

  const levelInfo = profile ? getLevelInfo(profile.level ?? 1) : null;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <PushNotificationPopup />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Progress */}
        <div className="glass-strong rounded-2xl p-6">
          <h2 className="font-display text-lg font-bold mb-4">{t("todaysProgress")}</h2>
          <div className="flex items-center gap-6">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-white/10"
                />
                <circle
                  cx="50" cy="50" r="40"
                  stroke="url(#progressGradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${progressPercent * 2.51} 251`}
                  className="transition-all duration-500"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4ecdc4" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute font-display text-xl font-bold">{progressPercent}%</span>
            </div>
            <div>
              <p className="font-semibold">
                {totalDue === 0
                  ? t("noHabitsDue")
                  : habitsFinished === totalDue
                    ? t("allDone")
                    : t("habitsCompleted", { completed: habitsFinished, total: totalDue })}
              </p>
            </div>
          </div>
        </div>

        {/* Level & XP */}
        <div className="glass-strong rounded-2xl p-6">
          <h2 className="font-display text-lg font-bold mb-4">{t("levelAndXp")}</h2>
          {profile && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <RankIcon level={profile.level ?? 1} size={64} />
                <div>
                  <p className="text-2xl font-bold gradient-text">
                    Level {profile.level}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {locale === "vi" ? levelInfo?.nameVi : levelInfo?.nameEn}
                  </p>
                </div>
              </div>
              <LevelProgress
                current={profile.progressXp ?? 0}
                next={(profile.nextLevelXp ?? 0) - (profile.currentLevelXp ?? 0)}
                level={profile.level ?? 1}
                size="md"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {profile.totalXp} XP total
              </p>
            </div>
          )}
        </div>

        {/* Streak Highlights */}
        <div className="glass-strong rounded-2xl p-6">
          <h2 className="font-display text-lg font-bold mb-4">{t("streakHighlights")}</h2>
          {bestStreakHabit ? (
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6b6b]/20 to-[#ffa06b]/20 text-2xl">
                <Flame className="h-7 w-7 text-[#ff6b6b]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("bestCurrentStreak")}</p>
                <p className="text-2xl font-bold">
                  {bestStreak} <span className="text-sm font-normal text-muted-foreground">{t("days")}</span>
                </p>
                <p className="text-xs text-muted-foreground">{bestStreakHabit.title}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noActiveStreaks")}</p>
          )}
        </div>

        {/* Recent Badges */}
        <div className="glass-strong rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold">{t("recentBadges")}</h2>
            <Link href="/badges" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              {t("viewAll")} <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {recentBadges.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noBadgesYet")}</p>
          ) : (
            <div className="flex gap-3">
              {recentBadges.map((badge: any) => {
                const info = getLevelInfo(badge.level);
                return (
                  <div
                    key={badge._id}
                    className="flex flex-col items-center rounded-xl border border-[#4ecdc4]/20 bg-[#4ecdc4]/5 p-3"
                  >
                    <RankIcon level={badge.level} size={40} className="mb-1" />
                    <span className="text-[10px] text-muted-foreground font-medium">Lv.{badge.level}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Today's Habits */}
      <div className="mt-6 glass-strong rounded-2xl p-6">
        <h2 className="font-display text-lg font-bold mb-4">{t("todaysHabits")}</h2>
        {habitsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-overlay-subtle" />
            ))}
          </div>
        ) : dueHabits.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noHabitsDue")}</p>
        ) : (
          <div className="space-y-3">
            {dueHabits.map((habit: any) => (
              <div
                key={habit._id}
                onClick={() => router.push(`/habits/${habit._id}`)}
                className="group relative flex items-center gap-4 rounded-xl border border-overlay-subtle bg-overlay-subtle p-4 transition-all hover:border-overlay-medium hover:bg-overlay-medium cursor-pointer"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${
                  habit.completedToday
                    ? "bg-gradient-to-br from-[#4ecdc4]/20 to-[#a78bfa]/20"
                    : "bg-overlay-subtle"
                }`}>
                  {getHabitIcon(habit.title)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold truncate ${habit.completedToday ? "text-muted-foreground line-through" : ""}`}>
                    {habit.title}
                  </h3>
                  <div className="flex items-center gap-3">
                    {(habit.currentStreak ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Flame className="h-3 w-3 text-[#ff6b6b]" />
                        {habit.currentStreak}
                      </span>
                    )}
                    {(habit.targetPerDay ?? 1) > 1 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CheckCircle2 className={`h-3 w-3 ${habit.completedToday ? "text-[#4ecdc4]" : ""}`} />
                        {habit.completedCount ?? 0}/{habit.targetPerDay}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (habit.completedToday) {
                      uncompleteHabit.mutate(habit._id);
                    } else {
                      completeHabit.mutate(habit._id);
                    }
                  }}
                  disabled={completeHabit.isPending || uncompleteHabit.isPending}
                  className={`flex h-10 min-w-[40px] px-2 items-center justify-center rounded-full transition-all ${
                    habit.completedToday
                      ? "bg-[#4ecdc4] text-white shadow-lg shadow-[#4ecdc4]/30"
                      : "bg-overlay-medium text-muted-foreground hover:bg-[#4ecdc4] hover:text-white hover:shadow-lg hover:shadow-[#4ecdc4]/30"
                  } ${completeHabit.isPending || uncompleteHabit.isPending ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {(habit.targetPerDay ?? 1) > 1 && !habit.completedToday ? (
                    <span className="text-xs font-bold">{habit.completedCount ?? 0}/{habit.targetPerDay}</span>
                  ) : habit.completedToday ? (
                    <CheckCircle2 className="h-5 w-5 fill-white text-[#4ecdc4]" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Level Up Modal */}
      <LevelUpModal level={levelUpLevel} onClose={() => setLevelUpLevel(null)} />
    </div>
  );
}
