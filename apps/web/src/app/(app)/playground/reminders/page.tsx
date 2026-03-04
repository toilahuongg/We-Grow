"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellOff,
  Clock,
  Play,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  Send,
} from "lucide-react";
import { orpc, client } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PlaygroundRemindersPage() {
  const queryClient = useQueryClient();
  const [newTime, setNewTime] = useState("09:00");
  const [selectedHabitId, setSelectedHabitId] = useState<string>("");
  const [pushStatus, setPushStatus] = useState<
    "loading" | "unsupported" | "denied" | "subscribed" | "not-subscribed"
  >("loading");

  const { data: vapidData } = useQuery({
    ...orpc.notifications.getVapidPublicKey.queryOptions(),
    staleTime: Infinity,
  });

  const { data: reminders, isLoading: loadingReminders } = useQuery({
    ...orpc.notifications.listReminders.queryOptions(),
    staleTime: 0,
  });

  const { data: habits } = useQuery({
    ...orpc.habits.list.queryOptions({ input: { includeArchived: false } }),
    staleTime: 1000 * 60,
  });

  // Check push notification status
  useEffect(() => {
    async function checkPush() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushStatus("unsupported");
        return;
      }
      const permission = Notification.permission;
      if (permission === "denied") {
        setPushStatus("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          setPushStatus(sub ? "subscribed" : "not-subscribed");
        } else {
          setPushStatus("not-subscribed");
        }
      } catch {
        setPushStatus("not-subscribed");
      }
    }
    checkPush();
  }, []);

  // Subscribe to push notifications
  async function handleSubscribe() {
    if (!vapidData?.vapidPublicKey) {
      toast.error("VAPID public key not configured on server");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus("denied");
        toast.error("Notification permission denied");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.vapidPublicKey),
      });

      const json = subscription.toJSON();
      await client.notifications.subscribe({
        endpoint: json.endpoint!,
        keys: {
          p256dh: json.keys!.p256dh!,
          auth: json.keys!.auth!,
        },
      });

      setPushStatus("subscribed");
      toast.success("Push notifications enabled");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  // Unsubscribe
  async function handleUnsubscribe() {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await client.notifications.unsubscribe({ endpoint: sub.endpoint });
          await sub.unsubscribe();
        }
      }
      setPushStatus("not-subscribed");
      toast.success("Push notifications disabled");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  // Test push
  const testPushMutation = useMutation({
    mutationFn: () => client.notifications.testPush(),
    onSuccess: (data) => {
      if (data.sent) {
        toast.success(`Push sent to ${data.subscriptions} device(s)`);
      } else {
        toast.error(data.reason ?? "Failed to send");
      }
    },
    onError: (err) => toast.error(err.message),
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
              Test browser push notifications &mdash; dev only
            </p>
          </div>
        </div>
      </div>

      {/* Push Notification Status */}
      <div className="glass-strong mb-6 rounded-2xl border border-overlay-subtle p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#4ecdc4]/20 to-[#a78bfa]/20">
            <Send className="h-4 w-4 text-[#4ecdc4]" />
          </div>
          <div>
            <h2 className="font-semibold">Push Notifications</h2>
            <p className="text-xs text-muted-foreground">
              {pushStatus === "loading" && "Checking status..."}
              {pushStatus === "unsupported" &&
                "Not supported in this browser"}
              {pushStatus === "denied" &&
                "Permission denied — reset in browser settings"}
              {pushStatus === "subscribed" && "Subscribed and ready"}
              {pushStatus === "not-subscribed" && "Not subscribed yet"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {pushStatus === "not-subscribed" && (
            <Button
              onClick={handleSubscribe}
              className="bg-gradient-to-r from-[#4ecdc4] to-[#a78bfa] text-white"
            >
              <Bell className="mr-2 h-4 w-4" />
              Enable Push Notifications
            </Button>
          )}

          {pushStatus === "subscribed" && (
            <>
              <Button
                onClick={() => testPushMutation.mutate()}
                disabled={testPushMutation.isPending}
                className="bg-gradient-to-r from-[#4ecdc4] to-[#a78bfa] text-white"
              >
                {testPushMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Send Test Notification
              </Button>
              <Button
                onClick={handleUnsubscribe}
                variant="outline"
                size="sm"
              >
                <BellOff className="mr-2 h-3 w-3" />
                Unsubscribe
              </Button>
            </>
          )}

          {pushStatus === "subscribed" && (
            <span className="flex items-center gap-1.5 text-xs text-[#4ecdc4]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Active
            </span>
          )}
        </div>
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
