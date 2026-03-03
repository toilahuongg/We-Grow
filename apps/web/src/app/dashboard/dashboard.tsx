"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Flame,
  Trophy,
  Target,
  TrendingUp,
  Calendar,
  Plus,
  CheckCircle2,
  Sparkles,
  Zap,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const habitIcons: Record<string, string> = {
  meditation: "🧘",
  exercise: "💪",
  reading: "📚",
  water: "💧",
  "social-media": "📵",
  journaling: "✍️",
  sleep: "😴",
  learning: "🎓",
  default: "🌟",
};

function getHabitIcon(title: string): string {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes("meditation") || lowerTitle.includes("mindful")) return habitIcons.meditation;
  if (lowerTitle.includes("exercise") || lowerTitle.includes("workout")) return habitIcons.exercise;
  if (lowerTitle.includes("read") || lowerTitle.includes("book")) return habitIcons.reading;
  if (lowerTitle.includes("water") || lowerTitle.includes("hydrate")) return habitIcons.water;
  if (lowerTitle.includes("social") || lowerTitle.includes("phone")) return habitIcons["social-media"];
  if (lowerTitle.includes("journal") || lowerTitle.includes("write")) return habitIcons.journaling;
  if (lowerTitle.includes("sleep") || lowerTitle.includes("bed")) return habitIcons.sleep;
  if (lowerTitle.includes("learn") || lowerTitle.includes("study")) return habitIcons.learning;
  return habitIcons.default;
}

function getHabitCategory(title: string): string {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes("meditation") || lowerTitle.includes("mindful") || lowerTitle.includes("journal")) return "wellness";
  if (lowerTitle.includes("exercise") || lowerTitle.includes("workout") || lowerTitle.includes("water")) return "fitness";
  if (lowerTitle.includes("read") || lowerTitle.includes("learn") || lowerTitle.includes("study")) return "learning";
  if (lowerTitle.includes("sleep")) return "health";
  return "general";
}

function calculateLevelProgress(currentXp: number, nextLevelXp: number): number {
  if (nextLevelXp === 0) return 0;
  return ((currentXp % 1000) / 1000) * 100;
}

export default function Dashboard({ session }: { session: typeof authClient.$Infer.Session }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const privateData = useQuery(orpc.privateData.queryOptions());

  // Queries
  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    ...orpc.gamification.getProfile.queryOptions(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: habits, isLoading: habitsLoading, error: habitsError } = useQuery({
    ...orpc.habits.todaySummary.queryOptions(),
    staleTime: 1000 * 60, // 1 minute
  });

  // Complete habit mutation
  const completeHabit = useMutation({
    mutationFn: (habitId: string) => orpc.habits.complete.mutate({ habitId }),
    onMutate: async (habitId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: orpc.habits.todaySummary.queryKey() });

      // Snapshot previous value
      const previousHabits = queryClient.getQueryData(orpc.habits.todaySummary.queryKey());

      // Optimistically update
      queryClient.setQueryData(
        orpc.habits.todaySummary.queryKey(),
        (old: any[]) => old?.map(h => h._id === habitId ? { ...h, completedToday: true } : h)
      );

      return { previousHabits };
    },
    onSuccess: (result) => {
      if (!result.alreadyCompleted) {
        toast.success(`+${result.xpAwarded} XP! ✨ Keep it up!`);
      }
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: orpc.gamification.getProfile.queryKey() });
    },
    onError: (error, variables, context) => {
      // Rollback
      queryClient.setQueryData(orpc.habits.todaySummary.queryKey(), context?.previousHabits);
      toast.error("Failed to complete habit. Please try again.");
    },
  });

  // Uncomplete habit mutation
  const uncompleteHabit = useMutation({
    mutationFn: (habitId: string) => orpc.habits.uncomplete.mutate({ habitId }),
    onMutate: async (habitId) => {
      await queryClient.cancelQueries({ queryKey: orpc.habits.todaySummary.queryKey() });
      const previousHabits = queryClient.getQueryData(orpc.habits.todaySummary.queryKey());

      queryClient.setQueryData(
        orpc.habits.todaySummary.queryKey(),
        (old: any[]) => old?.map(h => h._id === habitId ? { ...h, completedToday: false } : h)
      );

      return { previousHabits };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.gamification.getProfile.queryKey() });
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(orpc.habits.todaySummary.queryKey(), context?.previousHabits);
      toast.error("Failed to uncomplete habit. Please try again.");
    },
  });

  // Handle loading state
  if (profileLoading || habitsLoading) {
    return <DashboardSkeleton />;
  }

  // Handle error state
  if (profileError || habitsError) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="glass-strong rounded-2xl p-12 text-center">
          <h2 className="text-xl font-semibold mb-2">Oops! Something went wrong</h2>
          <p className="text-muted-foreground">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  const levelProgress = calculateLevelProgress(profile?.currentLevelXp ?? 0, profile?.nextLevelXp ?? 100);
  const dueHabits = habits?.filter((h: any) => h.isDue) ?? [];
  const completedToday = dueHabits.filter((h: any) => h.completedToday).length;
  const totalHabits = dueHabits.length;
  const bestStreak = habits?.reduce((max: number, h: any) => Math.max(max, h.longestStreak ?? 0), 0) ?? 0;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Welcome Section */}
      <div className="mb-8 animate-slide-up">
        <h1 className="mb-2 font-display text-3xl font-bold sm:text-4xl">
          Welcome back, <span className="gradient-text">{session.user?.name || "Grower"}</span>
        </h1>
        <p className="text-muted-foreground">
          {privateData.data?.message || "Ready to continue your growth journey?"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
        {/* Level Card */}
        <div className="glass-strong group relative overflow-hidden rounded-2xl p-5 transition-all hover:scale-[1.02] animate-slide-up opacity-0" style={{ animationFillMode: "forwards" }}>
          <div className="relative z-10">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff6b6b] to-[#ffa06b]">
                <Trophy className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Level</span>
            </div>
            <p className="font-display text-3xl font-bold">{profile?.level ?? 1}</p>
            <div className="mt-2">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{profile?.totalXp ?? 0} XP</span>
                <span className="text-muted-foreground">{profile?.nextLevelXp ?? 100} XP</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] transition-all duration-500 progress-glow"
                  style={{ width: `${levelProgress}%` }}
                />
              </div>
            </div>
          </div>
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl group-hover:opacity-30 transition-opacity" style={{ background: "#ff6b6b" }} />
        </div>

        {/* Streak Card */}
        <div className="glass-strong group relative overflow-hidden rounded-2xl p-5 transition-all hover:scale-[1.02] animate-slide-up opacity-0" style={{ animationDelay: "100ms", animationFillMode: "forwards" }}>
          <div className="relative z-10">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#ffa06b] to-[#f472b6]">
                <Flame className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Best Streak</span>
            </div>
            <p className="font-display text-3xl font-bold">{bestStreak}</p>
            <p className="mt-1 text-sm text-muted-foreground">days in a row</p>
          </div>
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl group-hover:opacity-30 transition-opacity" style={{ background: "#ffa06b" }} />
        </div>

        {/* Habits Completed Today */}
        <div className="glass-strong group relative overflow-hidden rounded-2xl p-5 transition-all hover:scale-[1.02] animate-slide-up opacity-0" style={{ animationDelay: "200ms", animationFillMode: "forwards" }}>
          <div className="relative z-10">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#4ecdc4] to-[#a78bfa]">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Today</span>
            </div>
            <p className="font-display text-3xl font-bold">
              {completedToday}/{totalHabits}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">habits completed</p>
          </div>
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl group-hover:opacity-30 transition-opacity" style={{ background: "#4ecdc4" }} />
        </div>

        {/* Total XP */}
        <div className="glass-strong group relative overflow-hidden rounded-2xl p-5 transition-all hover:scale-[1.02] animate-slide-up opacity-0" style={{ animationDelay: "300ms", animationFillMode: "forwards" }}>
          <div className="relative z-10">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#a78bfa] to-[#f472b6]">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Total XP</span>
            </div>
            <p className="font-display text-3xl font-bold">{(profile?.totalXp ?? 0).toLocaleString()}</p>
            <p className="mt-1 text-sm text-muted-foreground">lifetime points</p>
          </div>
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl group-hover:opacity-30 transition-opacity" style={{ background: "#a78bfa" }} />
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Habits List */}
        <div className="lg:col-span-2">
          <div className="glass-strong rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "400ms" }}>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold">Today's Habits</h2>
                <p className="text-sm text-muted-foreground">
                  {completedToday === totalHabits
                    ? "🎉 All habits completed!"
                    : totalHabits === 0
                    ? "No habits scheduled for today"
                    : `${totalHabits - completedToday} remaining`}
                </p>
              </div>
              <button
                onClick={() => router.push("/habits/new")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] text-white shadow-lg shadow-[#ff6b6b]/25 transition-all hover:scale-110 hover:shadow-xl"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {dueHabits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No habits scheduled for today</p>
                  <button
                    onClick={() => router.push("/habits")}
                    className="mt-2 text-sm text-[#4ecdc4] hover:underline"
                  >
                    View all habits →
                  </button>
                </div>
              ) : (
                dueHabits.map((habit: any, index: number) => (
                  <div
                    key={habit._id}
                    onClick={() => router.push(`/habits/${habit._id}`)}
                    className="group relative flex items-center gap-4 rounded-xl border border-white/5 bg-white/5 p-4 transition-all hover:border-white/10 hover:bg-white/10 animate-slide-up opacity-0 cursor-pointer"
                    style={{ animationDelay: `${500 + index * 100}ms`, animationFillMode: "forwards" }}
                  >
                    {/* Habit Icon */}
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${
                      habit.completedToday
                        ? "bg-gradient-to-br from-[#4ecdc4]/20 to-[#a78bfa]/20"
                        : "bg-white/5"
                    }`}>
                      {getHabitIcon(habit.title)}
                    </div>

                    {/* Habit Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold ${habit.completedToday ? "text-muted-foreground line-through" : ""}`}>
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
                        {habit.frequency} {habit.frequency === "specific_days" ? `· ${habit.targetDays?.length ?? 0} days/week` : ""}
                      </p>
                    </div>

                    {/* Streak */}
                    <div className="text-right">
                      <p className="text-sm font-medium">{habit.currentStreak ?? 0} day streak</p>
                    </div>

                    {/* Complete Button */}
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
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                        habit.completedToday
                          ? "bg-[#4ecdc4] text-white shadow-lg shadow-[#4ecdc4]/30"
                          : "bg-white/10 text-muted-foreground hover:bg-[#4ecdc4] hover:text-white hover:shadow-lg hover:shadow-[#4ecdc4]/30"
                      } ${completeHabit.isPending || uncompleteHabit.isPending ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Weekly Progress */}
          <div className="glass-strong rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "1s" }}>
            <h3 className="mb-4 font-display text-lg font-bold">Weekly Progress</h3>
            <div className="flex items-end justify-between gap-2">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => {
                const completed = [5, 4, 5, 3, 5, 2, 0][index];
                const total = 5;
                const percentage = (completed / total) * 100;
                const isToday = index === 4;

                return (
                  <div key={`day-${index}`} className="flex flex-col items-center gap-2">
                    <div className="flex h-24 w-8 items-end justify-center rounded-lg bg-white/5 p-1">
                      <div
                        className={`w-full rounded-md transition-all ${
                          isToday
                            ? "bg-gradient-to-t from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4]"
                            : "bg-[#4ecdc4]/50"
                        }`}
                        style={{ height: `${percentage}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${isToday ? "text-[#ff6b6b]" : "text-muted-foreground"}`}>
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Achievements */}
          <div className="glass-strong rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "1.1s" }}>
            <h3 className="mb-4 font-display text-lg font-bold">Recent Achievements</h3>
            <div className="space-y-3">
              {[
                { name: "Week Warrior", description: "7-day streak", icon: "⚔️", color: "#ff6b6b" },
                { name: "Early Bird", description: "5 AM habit", icon: "🌅", color: "#ffa06b" },
                { name: "Bookworm", description: "Read 1000 pages", icon: "📖", color: "#4ecdc4" },
              ].map((achievement) => (
                <div
                  key={achievement.name}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3 transition-all hover:border-white/10 hover:bg-white/10"
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-xl shadow-lg"
                    style={{
                      background: `${achievement.color}20`,
                      boxShadow: `0 0 12px ${achievement.color}40`,
                    }}
                  >
                    {achievement.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{achievement.name}</p>
                    <p className="text-xs text-muted-foreground">{achievement.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
