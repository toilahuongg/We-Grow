"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Bell, BellOff, Trash2, Edit2, Clock } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { orpc, client } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";

export function RemindersList() {
  const queryClient = useQueryClient();
  const t = useTranslations("reminders");
  const tc = useTranslations("common");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; reminderId: string | null }>({
    open: false,
    reminderId: null,
  });

  const { data: reminders, isLoading } = useQuery({
    ...orpc.notifications.listReminders.queryOptions(),
    staleTime: 1000 * 60,
  });

  const { data: habits } = useQuery({
    ...orpc.habits.list.queryOptions({ input: { includeArchived: false } }),
    staleTime: 1000 * 60,
  });

  const deleteMutation = useMutation({
    mutationFn: (reminderId: string) => client.notifications.deleteReminder({ reminderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.notifications.listReminders.queryKey() });
      toast.success(t("reminderDeleted"));
    },
    onError: () => toast.error(t("failedDelete")),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ reminderId, enabled }: { reminderId: string; enabled: boolean }) =>
      client.notifications.updateReminder({ reminderId, enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.notifications.listReminders.queryKey() });
      toast.success(t("reminderUpdated"));
    },
    onError: () => toast.error(t("failedUpdate")),
  });

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="glass-strong rounded-2xl p-8">
          <div className="h-8 w-32 animate-pulse rounded bg-overlay-medium mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-overlay-subtle" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
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
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-gradient-to-r from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("newReminder")}
        </Button>
      </div>

      {/* Reminders List */}
      {!reminders || reminders.length === 0 ? (
        <EmptyState
          title={t("noRemindersTitle")}
          description={t("noRemindersDesc")}
          action={{
            label: t("createReminder"),
            onClick: () => setCreateDialogOpen(true),
          }}
        />
      ) : (
        <div className="space-y-3">
          {reminders.map((reminder: any) => {
            const linkedHabit = habits?.find((h: any) => h._id === reminder.habitId);
            const linkedItem = linkedHabit;

            return (
              <div
                key={reminder._id}
                className={`glass-strong group relative rounded-xl border p-4 transition-all ${
                  reminder.enabled
                    ? "border-overlay-subtle bg-overlay-subtle"
                    : "border-overlay-subtle bg-overlay-subtle opacity-60"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    reminder.enabled
                      ? "bg-gradient-to-br from-[#4ecdc4]/20 to-[#a78bfa]/20"
                      : "bg-overlay-subtle"
                  }`}>
                    {reminder.enabled ? (
                      <Bell className="h-6 w-6 text-[#4ecdc4]" />
                    ) : (
                      <BellOff className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold ${!reminder.enabled ? "text-muted-foreground" : ""}`}>
                        {linkedItem ? linkedItem.title : t("generalReminder")}
                      </h3>
                      {linkedHabit && (
                        <span className="rounded-full bg-[#ff6b6b]/20 px-2 py-0.5 text-xs font-medium text-[#ff6b6b]">
                          {t("habitLabel")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{reminder.time}</span>
                      {!reminder.enabled && <span>· {t("disabled")}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        toggleMutation.mutate({
                          reminderId: reminder._id,
                          enabled: !reminder.enabled,
                        })
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-overlay-medium text-muted-foreground transition-all hover:bg-[#4ecdc4]/20 hover:text-[#4ecdc4]"
                      title={reminder.enabled ? t("disable") : t("enable")}
                    >
                      {reminder.enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => setEditingReminder(reminder)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-overlay-medium text-muted-foreground transition-all hover:bg-overlay-strong hover:text-foreground"
                      title={tc("edit")}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteDialog({ open: true, reminderId: reminder._id })}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-overlay-medium text-muted-foreground transition-all hover:bg-red-500/20 hover:text-red-500"
                      title={tc("delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Reminder Dialog */}
      {(createDialogOpen || editingReminder) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
            onClick={() => {
              setCreateDialogOpen(false);
              setEditingReminder(null);
            }}
          />
          <div className="relative z-50 glass-strong rounded-2xl p-6 shadow-xl w-full max-w-md mx-4 animate-in zoom-in-95">
            <h2 className="text-lg font-bold mb-4">
              {editingReminder ? t("editReminder") : t("createReminder")}
            </h2>
            <ReminderForm
              reminder={editingReminder}
              habits={habits ?? []}
              onSuccess={() => {
                setCreateDialogOpen(false);
                setEditingReminder(null);
                queryClient.invalidateQueries({ queryKey: orpc.notifications.listReminders.queryKey() });
              }}
              onCancel={() => {
                setCreateDialogOpen(false);
                setEditingReminder(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title={t("deleteReminder")}
        description={t("deleteConfirmDesc")}
        confirmText={tc("delete")}
        variant="danger"
        onConfirm={() => {
          if (deleteDialog.reminderId) {
            deleteMutation.mutate(deleteDialog.reminderId);
          }
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

// Reminder Form Component (inline)
function ReminderForm({
  reminder,
  habits,
  onSuccess,
  onCancel,
}: {
  reminder?: any;
  habits: any[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const t = useTranslations("reminders");
  const tc = useTranslations("common");
  const [time, setTime] = useState(reminder?.time ?? "09:00");
  const [linkedType, setLinkedType] = useState<"habit" | "none">(
    reminder?.habitId ? "habit" : "none"
  );
  const [linkedId, setLinkedId] = useState(
    reminder?.habitId || ""
  );

  const createMutation = useMutation({
    mutationFn: (input: any) => client.notifications.createReminder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.notifications.listReminders.queryKey() });
      toast.success(t("reminderCreated"));
      onSuccess();
    },
    onError: () => toast.error(t("failedCreate")),
  });

  const updateMutation = useMutation({
    mutationFn: (updates: any) => client.notifications.updateReminder({ reminderId: reminder._id, ...updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.notifications.listReminders.queryKey() });
      toast.success(t("reminderUpdated"));
      onSuccess();
    },
    onError: () => toast.error(t("failedUpdate")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: any = { time };

    if (linkedType === "habit") {
      data.habitId = linkedId;
    }

    if (reminder) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>{t("time")}</Label>
        <Input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label>{t("linkTo")}</Label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            type="button"
            onClick={() => {
              setLinkedType("none");
              setLinkedId("");
            }}
            className={`rounded-lg border p-2 text-center text-sm transition-all ${
              linkedType === "none"
                ? "border-[#4ecdc4] bg-[#4ecdc4]/10"
                : "border-overlay-medium bg-overlay-subtle hover:border-overlay-strong"
            }`}
          >
            {t("none")}
          </button>
          <button
            type="button"
            onClick={() => {
              setLinkedType("habit");
              setLinkedId("");
            }}
            className={`rounded-lg border p-2 text-center text-sm transition-all ${
              linkedType === "habit"
                ? "border-[#4ecdc4] bg-[#4ecdc4]/10"
                : "border-overlay-medium bg-overlay-subtle hover:border-overlay-strong"
            }`}
          >
            {t("habitLabel")}
          </button>
        </div>

        {linkedType === "habit" && (
          <select
            value={linkedId}
            onChange={(e) => setLinkedId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-overlay-subtle border border-overlay-medium focus:border-[#4ecdc4] outline-none"
          >
            <option value="">{t("selectHabit")}</option>
            {habits.map((habit) => (
              <option key={habit._id} value={habit._id}>
                {habit.title}
              </option>
            ))}
          </select>
        )}

      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {tc("cancel")}
        </Button>
        <Button
          type="submit"
          className="bg-gradient-to-r from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-white"
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {createMutation.isPending || updateMutation.isPending
            ? tc("saving")
            : reminder
            ? t("update")
            : t("create")}
        </Button>
      </div>
    </form>
  );
}
