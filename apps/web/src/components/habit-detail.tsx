"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar as CalendarIcon, Flame, TrendingUp, Edit2, Trash2, Bell, BellOff } from "lucide-react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

import { orpc, client } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LevelUpModal } from "@/components/level-up-modal";
import { NoteDialog } from "@/components/note-dialog";
import { StreakBadge } from "@/components/streak-badge";
import { toast } from "sonner";
import { HabitForm } from "./habit-form";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { getDateFnsLocale } from "@/i18n/date-locale";
import type { Locale } from "@/i18n/config";
import { getHabitIcon } from "@/lib/habit-utils";

interface HabitDetailProps {
  habitId: string;
  initialData?: any;
}

export function HabitDetail({ habitId, initialData }: HabitDetailProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);
  const [noteDialog, setNoteDialog] = useState<{ date: string; note: string | null } | null>(null);

  const t = useTranslations("habitDetail");
  const tc = useTranslations("common");
  const td = useTranslations("calendarDays");
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale as Locale);

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
    onMutate: async (date) => {
      await queryClient.cancelQueries({ queryKey: orpc.habits.getById.queryKey({ input: { habitId } }) });
      const previous = queryClient.getQueryData(orpc.habits.getById.queryKey({ input: { habitId } }));
      queryClient.setQueryData(
        orpc.habits.getById.queryKey({ input: { habitId } }),
        (old: any) => {
          if (!old) return old;
          const targetPerDay = old.targetPerDay ?? 1;
          const newCount = (old.completedCount ?? 0) + 1;
          return {
            ...old,
            completedCount: newCount,
            completedToday: newCount >= targetPerDay
          };
        }
      );
      return { previous };
    },
    onSuccess: (result: any) => {
      if (!result.alreadyCompleted) {
        toast.success(t("xpAwarded", { amount: result.xpAwarded ?? 0 }));
        if (result.leveledUp && result.newLevel) {
          setLevelUpLevel(result.newLevel);
        }
      }
      queryClient.invalidateQueries({ queryKey: orpc.habits.getById.queryKey({ input: { habitId } }) });
      queryClient.invalidateQueries({ queryKey: orpc.habits.getCompletions.queryKey({ input: { habitId } } as any) });
      queryClient.invalidateQueries({ queryKey: orpc.gamification.getProfile.queryKey() });
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(orpc.habits.getById.queryKey({ input: { habitId } }), context?.previous);
      toast.error(t("failedComplete"));
    },
  });

  const uncompleteMutation = useMutation({
    mutationFn: (date: string) => client.habits.uncomplete({ habitId, date }),
    onMutate: async (date) => {
      await queryClient.cancelQueries({ queryKey: orpc.habits.getById.queryKey({ input: { habitId } }) });
      const previous = queryClient.getQueryData(orpc.habits.getById.queryKey({ input: { habitId } }));
      queryClient.setQueryData(
        orpc.habits.getById.queryKey({ input: { habitId } }),
        (old: any) => {
          if (!old) return old;
          const targetPerDay = old.targetPerDay ?? 1;
          const newCount = Math.max(0, (old.completedCount ?? 1) - 1);
          return {
            ...old,
            completedCount: newCount,
            completedToday: newCount >= targetPerDay
          };
        }
      );
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.habits.getById.queryKey({ input: { habitId } }) });
      queryClient.invalidateQueries({ queryKey: orpc.habits.getCompletions.queryKey({ input: { habitId } } as any) });
      queryClient.invalidateQueries({ queryKey: orpc.gamification.getProfile.queryKey() });
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(orpc.habits.getById.queryKey({ input: { habitId } }), context?.previous);
      toast.error(t("failedUncomplete"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => client.habits.delete({ habitId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.habits.list.queryKey() });
      toast.success(t("habitDeleted"));
      window.location.href = `/groups/${habit?.groupId ?? ""}`;
    },
  });

  const { data: reminder } = useQuery({
    ...orpc.notifications.getReminderByHabitId.queryOptions({ input: { habitId } }),
    staleTime: 1000 * 60,
  });

  const toggleReminderMutation = useMutation({
    mutationFn: (input: { habitId: string; enabled: boolean; time?: string }) =>
      client.notifications.toggleHabitReminder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.notifications.getReminderByHabitId.queryKey({ input: { habitId } }) });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: (input: { habitId: string; date: string; note: string | null }) =>
      client.habits.updateNote(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.habits.getCompletions.queryKey({ input: { habitId } } as any) });
      setNoteDialog(null);
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="glass-strong rounded-2xl p-8">
          <div className="h-8 w-32 animate-pulse rounded bg-overlay-medium mb-4" />
          <div className="h-32 animate-pulse rounded bg-overlay-subtle" />
        </div>
      </div>
    );
  }

  if (!habit) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="glass-strong rounded-2xl p-12 text-center">
          <h2 className="text-xl font-semibold mb-2">{t("habitNotFound")}</h2>
          <Link href="/groups">
            <Button>{t("backToGroups")}</Button>
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
          {t("backToDetail")}
        </Button>
        <HabitForm habit={habit} isEditing />
      </div>
    );
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const completionsMap = new Map<string, number>(completions?.map((c: any) => [c.date, c.completedCount ?? 0]) ?? []);
  const noteDates = new Map<string, string>();
  completions?.forEach((c: any) => { if (c.note) noteDates.set(c.date, c.note); });

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
            {tc("edit")}
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
            <h2 className="mb-4 font-display text-lg font-bold">{t("statistics")}</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Flame className="h-4 w-4 text-[#ff6b6b]" />
                  <span className="font-display text-2xl font-bold">{habit.currentStreak ?? 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t("currentStreak")}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-[#4ecdc4]" />
                  <span className="font-display text-2xl font-bold">{habit.longestStreak ?? 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t("bestStreak")}</p>
              </div>
              <div className="text-center">
                <div className="mb-1">
                  <span className="font-display text-2xl font-bold">{completionRate}%</span>
                </div>
                <p className="text-xs text-muted-foreground">{t("completionRate")}</p>
              </div>
            </div>
          </div>

          {/* Calendar View */}
          <div className="glass-strong rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">{t("completionHistory")}</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  ←
                </Button>
                <span className="text-sm font-medium min-w-[120px] text-center">
                  {format(currentMonth, "MMMM yyyy", { locale: dateLocale })}
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
              {[td("sun"), td("mon"), td("tue"), td("wed"), td("thu"), td("fri"), td("sat")].map((day) => (
                <div key={day} className="text-center text-xs text-muted-foreground py-2">
                  {day}
                </div>
              ))}
              {daysInMonth.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const count = completionsMap.get(dateStr) ?? 0;
                const targetPerDay = habit.targetPerDay ?? 1;
                const isCompleted = count >= targetPerDay;
                const isPartial = count > 0 && count < targetPerDay;
                const dayIsToday = isToday(day);
                const hasNote = noteDates.has(dateStr);

                return (
                  <button
                    key={dateStr}
                    onClick={() => {
                      if (isCompleted && hasNote) {
                        setNoteDialog({ date: dateStr, note: noteDates.get(dateStr) ?? null });
                      } else if (isCompleted) {
                        uncompleteMutation.mutate(dateStr);
                      } else {
                        completeMutation.mutate(dateStr);
                      }
                    }}
                    disabled={completeMutation.isPending || uncompleteMutation.isPending}
                    className={`
                      relative aspect-square rounded-lg text-sm font-medium transition-all
                      ${dayIsToday ? "ring-2 ring-[#ff6b6b]" : ""}
                      ${isCompleted
                        ? "bg-gradient-to-br from-[#4ecdc4] to-[#a78bfa] text-white shadow-lg"
                        : isPartial
                          ? "bg-gradient-to-br from-[#4ecdc4]/40 to-[#a78bfa]/40 text-foreground"
                          : "bg-overlay-subtle text-muted-foreground hover:bg-overlay-medium"
                      }
                      disabled:opacity-50
                    `}
                    title={`${format(day, "MMM d, yyyy", { locale: dateLocale })}${isPartial || isCompleted ? ` (${count}/${targetPerDay})` : ""}`}
                  >
                    {format(day, "d")}
                    {hasNote && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-white/80" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-gradient-to-br from-[#4ecdc4] to-[#a78bfa]" />
                <span>{t("completed")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-gradient-to-br from-[#4ecdc4]/40 to-[#a78bfa]/40" />
                <span>{t("partial")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-overlay-subtle" />
                <span>{t("notCompleted")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded ring-2 ring-[#ff6b6b]" />
                <span>{t("todayLabel")}</span>
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
            <h3 className="mb-4 font-semibold">{t("details")}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("frequencyLabel")}</span>
                <span className="font-medium capitalize">{habit.frequency.replace("_", " ")}</span>
              </div>
              {habit.frequency === "specific_days" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("targetDays")}</span>
                  <span className="font-medium">{t("daysPerWeek", { count: habit.targetDays?.length ?? 0 })}</span>
                </div>
              )}
              {habit.frequency === "weekly" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("weeklyTargetLabel")}</span>
                  <span className="font-medium">{t("timesPerWeek", { count: habit.weeklyTarget ?? 1 })}</span>
                </div>
              )}
              {(habit.targetPerDay ?? 1) > 1 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số lần mỗi ngày</span>
                  <span className="font-medium">{habit.targetPerDay}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("created")}</span>
                <span className="font-medium">{format(new Date(habit.createdAt), "MMM d, yyyy", { locale: dateLocale })}</span>
              </div>
            </div>
          </div>

          {/* Reminder */}
          <div className="glass-strong rounded-2xl p-6">
            <h3 className="mb-4 font-semibold">{t("reminder")}</h3>
            {reminder?.enabled ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#4ecdc4]">
                  <Bell className="h-4 w-4" />
                  <span className="text-sm font-medium">{reminder.time as string}</span>
                </div>
                <button
                  onClick={() => toggleReminderMutation.mutate({ habitId, enabled: false })}
                  className="text-xs text-muted-foreground hover:text-foreground"
                  disabled={toggleReminderMutation.isPending}
                >
                  <BellOff className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">{t("noReminder")}</p>
                <button
                  onClick={() => toggleReminderMutation.mutate({ habitId, enabled: true })}
                  className="flex items-center gap-2 mx-auto rounded-lg border border-overlay-medium bg-overlay-subtle px-4 py-2 text-sm text-muted-foreground transition-all hover:border-[#4ecdc4] hover:text-[#4ecdc4]"
                  disabled={toggleReminderMutation.isPending}
                >
                  <Bell className="h-4 w-4" />
                  {t("reminder")}
                </button>
              </div>
            )}
          </div>

          {/* Today's Status */}
          <div className="glass-strong rounded-2xl p-6">
            <h3 className="mb-4 font-semibold">{t("todayStatus")}</h3>
            {habit.completedToday ? (
              <div className="text-center">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#4ecdc4]/20 text-[#4ecdc4] mx-auto">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-semibold text-[#4ecdc4]">{t("completedStatus")}</p>
                <button
                  onClick={() => uncompleteMutation.mutate(format(new Date(), "yyyy-MM-dd"))}
                  className="mt-2 text-xs text-muted-foreground hover:text-foreground"
                  disabled={uncompleteMutation.isPending}
                >
                  {t("undoCompletion")}
                </button>
              </div>
            ) : (
              <Button
                onClick={() => completeMutation.mutate(format(new Date(), "yyyy-MM-dd"))}
                className="w-full bg-gradient-to-r from-[#4ecdc4] to-[#a78bfa] text-white"
                disabled={completeMutation.isPending}
              >
                {(habit.targetPerDay ?? 1) > 1 
                  ? `${t("markComplete")} (${habit.completedCount ?? 0}/${habit.targetPerDay})`
                  : habit.completedCount > 0 
                    ? `${t("markComplete")} (${habit.completedCount})`
                    : t("markComplete")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Note Dialog */}
      {noteDialog && (
        <NoteDialog
          open={!!noteDialog}
          onOpenChange={(open) => !open && setNoteDialog(null)}
          initialNote={noteDialog.note}
          isLoading={updateNoteMutation.isPending}
          onSave={(note) => {
            updateNoteMutation.mutate({ habitId, date: noteDialog.date, note });
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        title={t("deleteHabit")}
        description={t("deleteConfirmDesc", { title: habit.title })}
        confirmText={tc("delete")}
        variant="danger"
        onConfirm={() => deleteMutation.mutate()}
        isLoading={deleteMutation.isPending}
      />

      {/* Level Up Modal */}
      <LevelUpModal level={levelUpLevel} onClose={() => setLevelUpLevel(null)} />
    </div>
  );
}
