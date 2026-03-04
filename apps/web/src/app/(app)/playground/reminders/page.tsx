"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellOff,
  Clock,
  Mail,
  Play,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { orpc, client } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PlaygroundRemindersPage() {
  const queryClient = useQueryClient();
  const [newTime, setNewTime] = useState("09:00");
  const [selectedHabitId, setSelectedHabitId] = useState<string>("");
  const [triggerResult, setTriggerResult] = useState<{
    time: string;
    emailsSent: number;
  } | null>(null);

  const { data: reminders, isLoading: loadingReminders } = useQuery({
    ...orpc.notifications.listReminders.queryOptions(),
    staleTime: 0,
  });

  const { data: habits } = useQuery({
    ...orpc.habits.list.queryOptions({ input: { includeArchived: false } }),
    staleTime: 1000 * 60,
  });

  const createMutation = useMutation({
    mutationFn: (input: { time: string; habitId?: string }) =>
      client.notifications.createReminder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orpc.notifications.listReminders.queryKey(),
      });
      toast.success("Reminder created");
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (input: { reminderId: string; enabled: boolean }) =>
      client.notifications.updateReminder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orpc.notifications.listReminders.queryKey(),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (reminderId: string) =>
      client.notifications.deleteReminder({ reminderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orpc.notifications.listReminders.queryKey(),
      });
      toast.success("Reminder deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const [triggering, setTriggering] = useState(false);
  async function handleTrigger() {
    setTriggering(true);
    setTriggerResult(null);
    try {
      const res = await fetch("/api/test/reminders", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to trigger");
        return;
      }
      setTriggerResult(data);
      toast.success(`Done! ${data.emailsSent} email(s) sent`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTriggering(false);
    }
  }

  const habitMap = new Map(
    (habits ?? []).map((h: any) => [h._id, h.title]),
  );

  if (loadingReminders) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-overlay-subtle"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6b6b]/20 to-[#ffa06b]/20">
            <Bell className="h-5 w-5 text-[#ff6b6b]" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">
              Reminder Playground
            </h1>
            <p className="text-sm text-muted-foreground">
              Test email reminders &mdash; dev only
            </p>
          </div>
        </div>
      </div>

      {/* Trigger Section */}
      <div className="glass-strong mb-6 rounded-2xl border border-overlay-subtle p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#4ecdc4]/20 to-[#a78bfa]/20">
            <Mail className="h-4 w-4 text-[#4ecdc4]" />
          </div>
          <div>
            <h2 className="font-semibold">Trigger Email Reminders</h2>
            <p className="text-xs text-muted-foreground">
              Run processEmailReminders() manually
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleTrigger}
            disabled={triggering}
            className="bg-gradient-to-r from-[#4ecdc4] to-[#a78bfa] text-white"
          >
            {triggering ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {triggering ? "Processing..." : "Run Now"}
          </Button>

          {triggerResult && (
            <div className="flex items-center gap-2 rounded-xl bg-overlay-subtle px-4 py-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-[#4ecdc4]" />
              <span>
                Time matched: <strong>{triggerResult.time || "N/A"}</strong>
              </span>
              <span className="text-muted-foreground">|</span>
              <span>
                Emails sent: <strong>{triggerResult.emailsSent}</strong>
              </span>
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Only sends to reminders matching the current UTC time (
          {new Date().toISOString().slice(11, 16)})
        </p>
      </div>

      {/* Create Reminder */}
      <div className="glass-strong mb-6 rounded-2xl border border-overlay-subtle p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#f472b6]/20 to-[#ff6b6b]/20">
            <Plus className="h-4 w-4 text-[#f472b6]" />
          </div>
          <h2 className="font-semibold">Create Reminder</h2>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Time (UTC)
            </label>
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="rounded-xl border border-overlay-medium bg-overlay-subtle px-4 py-2 text-sm focus:border-[#f472b6] focus:outline-none"
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">
              Habit (optional &mdash; leave empty for general reminder)
            </label>
            <select
              value={selectedHabitId}
              onChange={(e) => setSelectedHabitId(e.target.value)}
              className="w-full rounded-xl border border-overlay-medium bg-overlay-subtle px-4 py-2 text-sm focus:border-[#f472b6] focus:outline-none"
            >
              <option value="">General (all habits)</option>
              {(habits ?? []).map((h: any) => (
                <option key={h._id} value={h._id}>
                  {h.title}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={() => {
              createMutation.mutate({
                time: newTime,
                ...(selectedHabitId ? { habitId: selectedHabitId } : {}),
              });
            }}
            disabled={createMutation.isPending}
            size="sm"
          >
            {createMutation.isPending ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <Plus className="mr-2 h-3 w-3" />
            )}
            Add
          </Button>
        </div>
      </div>

      {/* Reminders List */}
      <div className="glass-strong rounded-2xl border border-overlay-subtle p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#ffa06b]/20 to-[#ff6b6b]/20">
            <Clock className="h-4 w-4 text-[#ffa06b]" />
          </div>
          <div>
            <h2 className="font-semibold">Your Reminders</h2>
            <p className="text-xs text-muted-foreground">
              {reminders?.length ?? 0} reminder(s)
            </p>
          </div>
        </div>

        {!reminders?.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No reminders yet. Create one above.
          </p>
        ) : (
          <div className="space-y-2">
            {reminders.map((r: any) => (
              <div
                key={r._id}
                className="flex items-center gap-3 rounded-xl border border-overlay-subtle bg-overlay-subtle p-3 transition-all hover:border-overlay-medium"
              >
                {/* Toggle */}
                <button
                  onClick={() =>
                    toggleMutation.mutate({
                      reminderId: r._id,
                      enabled: !r.enabled,
                    })
                  }
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${
                    r.enabled
                      ? "bg-[#4ecdc4]/20 text-[#4ecdc4]"
                      : "bg-overlay-medium text-muted-foreground"
                  }`}
                >
                  {r.enabled ? (
                    <Bell className="h-4 w-4" />
                  ) : (
                    <BellOff className="h-4 w-4" />
                  )}
                </button>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">
                      {r.time}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.enabled
                          ? "bg-[#4ecdc4]/20 text-[#4ecdc4]"
                          : "bg-overlay-medium text-muted-foreground"
                      }`}
                    >
                      {r.enabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.habitId
                      ? `Habit: ${habitMap.get(r.habitId) ?? r.habitId}`
                      : "General (all incomplete habits)"}
                  </p>
                </div>

                {/* Delete */}
                <button
                  onClick={() => deleteMutation.mutate(r._id)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-overlay-medium text-muted-foreground transition-all hover:bg-red-500/20 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
