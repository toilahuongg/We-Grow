"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar as CalendarIcon, Flame, TrendingUp, Edit2, Trash2 } from "lucide-react";
import Link from "next/link";

import { orpc, client } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StreakBadge } from "@/components/streak-badge";
import { toast } from "sonner";
import { HabitForm } from "./habit-form";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";

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

interface HabitDetailProps {
  habitId: string;
  initialData?: any;
}

export function HabitDetail({ habitId, initialData }: HabitDetailProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [deleteDialog, setDeleteDialog] = useState(false);

  const { data: habit, isLoading } = useQuery({
    ...orpc.habits.getById.queryOptions({ input: { habitId } }),
    initialData,
    staleTime: 1000 * 60,
  });

  const { data: completions } = useQuery({
    ...orpc.habits.getCompletions.queryOptions({
      input: {
        habitId,
        startDate: format(subMonths(currentMonth, 3), "yyyy-MM-dd"),
        endDate: format(addMonths(currentMonth, 3), "yyyy-MM-dd"),
      },
    }),
    staleTime: 1000 * 60 * 5,
  });

  const completeMutation = useMutation({
    mutationFn: (date: string) => client.habits.complete({ habitId, date }),
    onSuccess: (result, date) => {
      if (!result.alreadyCompleted) {
        toast.success(`+${result.xpAwarded} XP! ✨`);
      }
      queryClient.invalidateQueries({ queryKey: orpc.habits.getById.queryKey({ input: { habitId } }) });
      queryClient.invalidateQueries({ queryKey: orpc.habits.getCompletions.queryKey({ input: { habitId } } as any) });
      queryClient.invalidateQueries({ queryKey: orpc.gamification.getProfile.queryKey() });
    },
  });

  const uncompleteMutation = useMutation({
    mutationFn: (date: string) => client.habits.uncomplete({ habitId, date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.habits.getById.queryKey({ input: { habitId } }) });
      queryClient.invalidateQueries({ queryKey: orpc.habits.getCompletions.queryKey({ input: { habitId } } as any) });
      queryClient.invalidateQueries({ queryKey: orpc.gamification.getProfile.queryKey() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => client.habits.delete({ habitId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.habits.list.queryKey() });
      toast.success("Habit deleted");
      window.location.href = `/groups/${habit?.groupId ?? ""}`;
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="glass-strong rounded-2xl p-8">
          <div className="h-8 w-32 animate-pulse rounded bg-white/10 mb-4" />
          <div className="h-32 animate-pulse rounded bg-white/5" />
        </div>
      </div>
    );
  }

  if (!habit) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="glass-strong rounded-2xl p-12 text-center">
          <h2 className="text-xl font-semibold mb-2">Habit not found</h2>
          <Link href="/groups">
            <Button>Back to Groups</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div>
        <Button
          variant="ghost"
          onClick={() => setIsEditing(false)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Detail
        </Button>
        <HabitForm habit={habit} isEditing />
      </div>
    );
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const completedDates = new Set(completions?.map((c: any) => c.date) ?? []);

  // Calculate completion rate
  const totalCompletions = completions?.length ?? 0;
  const daysSinceCreation = Math.ceil(
    (new Date().getTime() - new Date(habit.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const completionRate = daysSinceCreation > 0 ? Math.round((totalCompletions / daysSinceCreation) * 100) : 0;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={habit.groupId ? `/groups/${habit.groupId}` : "/groups"}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-3xl font-bold">{habit.title}</h1>
            <p className="text-sm text-muted-foreground capitalize">{habit.frequency}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Stats */}
          <div className="glass-strong rounded-2xl p-6">
            <h2 className="mb-4 font-display text-lg font-bold">Statistics</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Flame className="h-4 w-4 text-[#ff6b6b]" />
                  <span className="font-display text-2xl font-bold">{habit.currentStreak ?? 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">Current Streak</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-[#4ecdc4]" />
                  <span className="font-display text-2xl font-bold">{habit.longestStreak ?? 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">Best Streak</p>
              </div>
              <div className="text-center">
                <div className="mb-1">
                  <span className="font-display text-2xl font-bold">{completionRate}%</span>
                </div>
                <p className="text-xs text-muted-foreground">Completion Rate</p>
              </div>
            </div>
          </div>

          {/* Calendar View */}
          <div className="glass-strong rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Completion History</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  ←
                </Button>
                <span className="text-sm font-medium min-w-[120px] text-center">
                  {format(currentMonth, "MMMM yyyy")}
                </span>
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  →
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-xs text-muted-foreground py-2">
                  {day}
                </div>
              ))}
              {daysInMonth.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const isCompleted = completedDates.has(dateStr);
                const dayIsToday = isToday(day);

                return (
                  <button
                    key={dateStr}
                    onClick={() => {
                      if (isCompleted) {
                        uncompleteMutation.mutate(dateStr);
                      } else {
                        completeMutation.mutate(dateStr);
                      }
                    }}
                    disabled={completeMutation.isPending || uncompleteMutation.isPending}
                    className={`
                      aspect-square rounded-lg text-sm font-medium transition-all
                      ${dayIsToday ? "ring-2 ring-[#ff6b6b]" : ""}
                      ${isCompleted
                        ? "bg-gradient-to-br from-[#4ecdc4] to-[#a78bfa] text-white shadow-lg"
                        : "bg-white/5 text-muted-foreground hover:bg-white/10"
                      }
                      disabled:opacity-50
                    `}
                    title={format(day, "MMM d, yyyy")}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-gradient-to-br from-[#4ecdc4] to-[#a78bfa]" />
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-white/5" />
                <span>Not completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded ring-2 ring-[#ff6b6b]" />
                <span>Today</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="space-y-6">
          {/* Icon Card */}
          <div className="glass-strong rounded-2xl p-6 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6b6b]/20 to-[#ffa06b]/20 text-4xl mx-auto">
              {getHabitIcon(habit.title)}
            </div>
            <StreakBadge count={habit.currentStreak ?? 0} size="lg" showLabel={false} />
          </div>

          {/* Details */}
          <div className="glass-strong rounded-2xl p-6">
            <h3 className="mb-4 font-semibold">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequency</span>
                <span className="font-medium capitalize">{habit.frequency.replace("_", " ")}</span>
              </div>
              {habit.frequency === "specific_days" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Days</span>
                  <span className="font-medium">{habit.targetDays?.length ?? 0} days/week</span>
                </div>
              )}
              {habit.frequency === "weekly" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Weekly Target</span>
                  <span className="font-medium">{habit.weeklyTarget ?? 1}x/week</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{format(new Date(habit.createdAt), "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>

          {/* Today's Status */}
          <div className="glass-strong rounded-2xl p-6">
            <h3 className="mb-4 font-semibold">Today</h3>
            {habit.completedToday ? (
              <div className="text-center">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#4ecdc4]/20 text-[#4ecdc4] mx-auto">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-semibold text-[#4ecdc4]">Completed!</p>
                <button
                  onClick={() => uncompleteMutation.mutate(format(new Date(), "yyyy-MM-dd"))}
                  className="mt-2 text-xs text-muted-foreground hover:text-foreground"
                  disabled={uncompleteMutation.isPending}
                >
                  Undo completion
                </button>
              </div>
            ) : (
              <Button
                onClick={() => completeMutation.mutate(format(new Date(), "yyyy-MM-dd"))}
                className="w-full bg-gradient-to-r from-[#4ecdc4] to-[#a78bfa] text-white"
                disabled={completeMutation.isPending}
              >
                Mark Complete
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        title="Delete Habit"
        description={`Are you sure you want to delete "${habit.title}"? This action cannot be undone and all completion history will be lost.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={() => deleteMutation.mutate()}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
