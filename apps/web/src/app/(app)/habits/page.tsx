"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Flame, Target } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { orpc, client } from "@/utils/orpc";
import { EmptyState } from "@/components/empty-state";
import { LevelUpModal } from "@/components/level-up-modal";
import { toast } from "sonner";
import { getHabitIcon } from "@/lib/habit-utils";

export default function HabitsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("personalHabits");
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);

  const { data: habits, isLoading: habitsLoading } = useQuery({
    ...orpc.habits.todaySummary.queryOptions({ input: {} }),
    staleTime: 1000 * 60,
  });

  const { data: groups } = useQuery({
    ...orpc.groups.listMy.queryOptions({ input: undefined }),
    staleTime: 1000 * 60 * 5,
  });

  const groupMap = new Map<string, string>();
  if (groups) {
    for (const g of groups as any[]) {
      groupMap.set(g._id, g.name);
    }
  }

  const completeHabit = useMutation({
    mutationFn: (habitId: string) => client.habits.complete({ habitId }),
    onMutate: async (habitId) => {
      await queryClient.cancelQueries({ queryKey: orpc.habits.todaySummary.queryKey() });
      const prev = queryClient.getQueryData(orpc.habits.todaySummary.queryOptions({ input: {} }).queryKey);
      queryClient.setQueryData(
        orpc.habits.todaySummary.queryOptions({ input: {} }).queryKey,
        (old: any[] | undefined) => old?.map((h) => (h._id === habitId ? { ...h, completedToday: true } : h)),
      );
      return { prev };
    },
    onSuccess: (result: any) => {
      if (!result.alreadyCompleted) {
        toast.success(t("xpAwarded", { amount: result.xpAwarded ?? 0 }));
        if (result.leveledUp && result.newLevel) {
          setLevelUpLevel(result.newLevel);
        }
      }
      queryClient.invalidateQueries({ queryKey: orpc.gamification.getProfile.queryKey() });
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(orpc.habits.todaySummary.queryOptions({ input: {} }).queryKey, context?.prev);
      toast.error(t("failedComplete"));
    },
  });

  const uncompleteHabit = useMutation({
    mutationFn: (habitId: string) => client.habits.uncomplete({ habitId }),
    onMutate: async (habitId) => {
      await queryClient.cancelQueries({ queryKey: orpc.habits.todaySummary.queryKey() });
      const prev = queryClient.getQueryData(orpc.habits.todaySummary.queryOptions({ input: {} }).queryKey);
      queryClient.setQueryData(
        orpc.habits.todaySummary.queryOptions({ input: {} }).queryKey,
        (old: any[] | undefined) => old?.map((h) => (h._id === habitId ? { ...h, completedToday: false } : h)),
      );
      return { prev };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.gamification.getProfile.queryKey() });
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(orpc.habits.todaySummary.queryOptions({ input: {} }).queryKey, context?.prev);
      toast.error(t("failedUncomplete"));
    },
  });

  const dueHabits = (habits as any[])?.filter((h: any) => h.isDue) ?? [];
  const completedCount = dueHabits.filter((h: any) => h.completedToday).length;

  // Group habits by groupId
  const grouped = new Map<string | null, any[]>();
  for (const h of dueHabits) {
    const key = h.groupId ?? null;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(h);
  }

  if (habitsLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <div className="h-9 w-40 animate-pulse rounded bg-overlay-medium mb-2" />
          <div className="h-5 w-60 animate-pulse rounded bg-overlay-subtle" />
        </div>
        <div className="glass-strong rounded-2xl p-8">
          <div className="h-48 animate-pulse rounded-xl bg-overlay-subtle" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {dueHabits.length === 0
            ? t("noHabitsToday")
            : completedCount === dueHabits.length
              ? t("allCompleted")
              : t("remaining", { count: dueHabits.length - completedCount })}
        </p>
      </div>

      {dueHabits.length === 0 ? (
        <EmptyState
          icon={<Target className="h-8 w-8 text-[#a78bfa]" />}
          title={t("noHabitsTitle")}
          description={t("noHabitsDesc")}
          action={{
            label: t("browseGroups"),
            onClick: () => router.push("/groups"),
          }}
        />
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([gId, gHabits]) => {
            const groupName = gId ? groupMap.get(gId) ?? "Group" : null;
            return (
              <div key={gId ?? "personal"} className="glass-strong rounded-2xl p-6">
                {groupName && (
                  <Link href={`/groups/${gId}`} className="mb-4 flex items-center gap-2 group">
                    <span className="rounded-full bg-[#a78bfa]/20 px-3 py-1 text-xs font-medium text-[#a78bfa] transition-colors group-hover:bg-[#a78bfa]/30">
                      {groupName}
                    </span>
                  </Link>
                )}

                <div className="space-y-3">
                  {gHabits.map((habit: any) => (
                    <div
                      key={habit._id}
                      onClick={() => router.push(`/habits/${habit._id}`)}
                      className="group/item relative flex items-center gap-4 rounded-xl border border-overlay-subtle bg-overlay-subtle p-4 transition-all hover:border-overlay-medium hover:bg-overlay-medium cursor-pointer"
                    >
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${
                          habit.completedToday
                            ? "bg-gradient-to-br from-[#4ecdc4]/20 to-[#a78bfa]/20"
                            : "bg-overlay-subtle"
                        }`}
                      >
                        {getHabitIcon(habit.title)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3
                            className={`font-semibold truncate ${habit.completedToday ? "text-muted-foreground line-through" : ""}`}
                          >
                            {habit.title}
                          </h3>
                          {(habit.currentStreak ?? 0) >= 7 && (
                            <span className="flex items-center gap-1 rounded-full bg-[#ff6b6b]/20 px-2 py-0.5 text-xs font-medium text-[#ff6b6b]">
                              <Flame className="h-3 w-3" />
                              {habit.currentStreak}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">
                          {habit.frequency}
                          {habit.frequency === "specific_days" ? ` · ${habit.targetDays?.length ?? 0} days/week` : ""}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium">{t("dayStreak", { count: habit.currentStreak ?? 0 })}</p>
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
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all ${
                          habit.completedToday
                            ? "bg-[#4ecdc4] text-white shadow-lg shadow-[#4ecdc4]/30"
                            : "bg-overlay-medium text-muted-foreground hover:bg-[#4ecdc4] hover:text-white hover:shadow-lg hover:shadow-[#4ecdc4]/30"
                        } ${completeHabit.isPending || uncompleteHabit.isPending ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Level Up Modal */}
      <LevelUpModal level={levelUpLevel} onClose={() => setLevelUpLevel(null)} />
    </div>
  );
}
