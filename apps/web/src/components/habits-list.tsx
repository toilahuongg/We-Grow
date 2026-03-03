"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Calendar, Archive, Trash2, Edit2, Bell, BellOff } from "lucide-react";
import Link from "next/link";

import { orpc, client } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LevelUpModal } from "@/components/level-up-modal";
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";
import { Flame, CheckCircle2 } from "lucide-react";

type FilterType = "active" | "archived" | "all";

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

export function HabitsList() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>("active");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; habitId: string | null; habitTitle: string }>({
    open: false,
    habitId: null,
    habitTitle: "",
  });
  const [archiveDialog, setArchiveDialog] = useState<{ open: boolean; habitId: string | null; habitTitle: string }>({
    open: false,
    habitId: null,
    habitTitle: "",
  });
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);

  const { data: habits, isLoading } = useQuery({
    ...orpc.habits.list.queryOptions({ input: { includeArchived: filter !== "active" } }),
    staleTime: 1000 * 60,
  });

  const { data: reminders } = useQuery({
    ...orpc.notifications.listReminders.queryOptions(),
    staleTime: 1000 * 60,
  });

  const reminderMap = new Map(
    (reminders ?? []).filter((r: any) => r.habitId).map((r: any) => [r.habitId, r])
  );

  const toggleReminderMutation = useMutation({
    mutationFn: (input: { habitId: string; enabled: boolean }) =>
      client.notifications.toggleHabitReminder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.notifications.listReminders.queryKey() });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (habitId: string) => client.habits.archive({ habitId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.habits.list.queryKey() });
      toast.success("Habit archived");
    },
    onError: () => {
      toast.error("Failed to archive habit");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (habitId: string) => client.habits.delete({ habitId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.habits.list.queryKey() });
      toast.success("Habit deleted");
    },
    onError: () => {
      toast.error("Failed to delete habit");
    },
  });

  const completeMutation = useMutation({
    mutationFn: (habitId: string) => client.habits.complete({ habitId }),
    onSuccess: (result: any) => {
      if (!result.alreadyCompleted) {
        toast.success(`+${result.xpAwarded} XP! ✨`);
        if (result.leveledUp && result.newLevel) {
          setLevelUpLevel(result.newLevel);
        }
      }
      queryClient.invalidateQueries({ queryKey: orpc.habits.list.queryKey() });
      queryClient.invalidateQueries({ queryKey: orpc.gamification.getProfile.queryKey() });
    },
  });

  const filteredHabits = habits?.filter((habit: any) => {
    if (filter === "active") return !habit.archived;
    if (filter === "archived") return habit.archived;
    return true;
  }) ?? [];

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="glass-strong rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-white/10" />
            <div className="h-6 w-32 animate-pulse rounded bg-white/10" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-3xl font-bold">Habits</h1>
            <p className="text-sm text-muted-foreground">
              Manage your daily routines
            </p>
          </div>
        </div>
        <Link href="/groups">
          <Button className="bg-gradient-to-r from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-white">
            <Plus className="mr-2 h-4 w-4" />
            Manage Groups
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={filter === "active" ? "default" : "outline"}
          onClick={() => setFilter("active")}
          size="sm"
        >
          Active
        </Button>
        <Button
          variant={filter === "archived" ? "default" : "outline"}
          onClick={() => setFilter("archived")}
          size="sm"
        >
          Archived
        </Button>
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
          size="sm"
        >
          All
        </Button>
      </div>

      {/* Habits List */}
      {filteredHabits.length === 0 ? (
        <EmptyState
          title={filter === "active" ? "No active habits" : filter === "archived" ? "No archived habits" : "No habits yet"}
          description={
            filter === "active"
              ? "Join a group and create habits together"
              : "You haven't created any habits yet"
          }
          action={{
            label: "Go to Groups",
            onClick: () => {
              window.location.href = "/groups";
            },
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredHabits.map((habit: any) => (
            <div
              key={habit._id}
              className="glass-strong group relative rounded-xl border border-white/5 bg-white/5 p-4 transition-all hover:border-white/10 hover:bg-white/10"
            >
              <div className="flex items-center gap-4">
                {/* Habit Icon */}
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6b6b]/20 to-[#ffa06b]/20 text-2xl">
                  {getHabitIcon(habit.title)}
                </div>

                {/* Habit Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold ${habit.archived ? "text-muted-foreground line-through" : ""}`}>
                      {habit.title}
                    </h3>
                    {habit.archived && (
                      <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-500">
                        Archived
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {habit.frequency}
                    {habit.frequency === "specific_days" && ` · ${habit.targetDays?.length ?? 0} days/week`}
                    {habit.frequency === "weekly" && ` · ${habit.weeklyTarget ?? 1}x/week`}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Flame className="h-3 w-3" />
                      {habit.currentStreak ?? 0} day streak
                    </span>
                    <span>·</span>
                    <span>Best: {habit.longestStreak ?? 0} days</span>
                    {reminderMap.get(habit._id)?.enabled && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-[#4ecdc4]">
                          <Bell className="h-3 w-3" />
                          {reminderMap.get(habit._id)?.time}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!habit.archived && (
                    <button
                      onClick={() => completeMutation.mutate(habit._id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-muted-foreground transition-all hover:bg-[#4ecdc4] hover:text-white hover:shadow-lg hover:shadow-[#4ecdc4]/30"
                      title="Complete habit"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  )}
                  {!habit.archived && (() => {
                    const reminder = reminderMap.get(habit._id);
                    const isEnabled = reminder?.enabled ?? false;
                    return (
                      <button
                        onClick={() => toggleReminderMutation.mutate({ habitId: habit._id, enabled: !isEnabled })}
                        className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                          isEnabled
                            ? "bg-[#4ecdc4]/20 text-[#4ecdc4]"
                            : "bg-white/10 text-muted-foreground hover:bg-[#4ecdc4]/10 hover:text-[#4ecdc4]"
                        }`}
                        title={isEnabled ? `Reminder ${reminder?.time}` : "Set reminder"}
                      >
                        {isEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                      </button>
                    );
                  })()}
                  <Link href={`/habits/${habit._id}`}>
                    <Button variant="ghost" size="icon-xs">
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </Link>
                  {!habit.archived ? (
                    <button
                      onClick={() => setArchiveDialog({ open: true, habitId: habit._id, habitTitle: habit.title })}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-muted-foreground transition-all hover:bg-yellow-500/20 hover:text-yellow-500"
                      title="Archive habit"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => archiveMutation.mutate(habit._id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-muted-foreground transition-all hover:bg-[#4ecdc4]/20 hover:text-[#4ecdc4]"
                      title="Unarchive habit"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteDialog({ open: true, habitId: habit._id, habitTitle: habit.title })}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-muted-foreground transition-all hover:bg-red-500/20 hover:text-red-500"
                    title="Delete habit"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {habit.description && (
                <p className="mt-3 text-sm text-muted-foreground border-t border-white/5 pt-3">
                  {habit.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Delete Habit"
        description={`Are you sure you want to delete "${deleteDialog.habitTitle}"? This action cannot be undone and all completion history will be lost.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteDialog.habitId) {
            deleteMutation.mutate(deleteDialog.habitId);
          }
        }}
        isLoading={deleteMutation.isPending}
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        open={archiveDialog.open}
        onOpenChange={(open) => setArchiveDialog({ ...archiveDialog, open })}
        title="Archive Habit"
        description={`Are you sure you want to archive "${archiveDialog.habitTitle}"? You can unarchive it later if needed.`}
        confirmText="Archive"
        variant="warning"
        onConfirm={() => {
          if (archiveDialog.habitId) {
            archiveMutation.mutate(archiveDialog.habitId);
          }
        }}
        isLoading={archiveMutation.isPending}
      />

      {/* Level Up Modal */}
      <LevelUpModal level={levelUpLevel} onClose={() => setLevelUpLevel(null)} />
    </div>
  );
}
