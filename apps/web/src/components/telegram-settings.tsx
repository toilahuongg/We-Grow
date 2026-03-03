"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { client } from "@/utils/orpc";

interface TelegramSettingsProps {
  groupId: string;
  t: (key: string, params?: Record<string, unknown>) => string;
}

export function TelegramSettings({ groupId, t }: TelegramSettingsProps) {
  const queryClient = useQueryClient();

  const { data: configStatus } = useQuery({
    queryKey: ["telegram", "isConfigured"],
    queryFn: () => client.telegram.isConfigured(),
  });

  const { data: groupStatus, refetch } = useQuery({
    queryKey: ["telegram", "groupStatus", groupId],
    queryFn: () => client.telegram.getGroupStatus({ groupId }),
    enabled: configStatus?.configured === true,
  });

  const updateMutation = useMutation({
    mutationFn: (data: {
      notifyActivities?: boolean;
      dailyReminderEnabled?: boolean;
      dailyReminderTime?: string;
    }) => client.telegram.updateGroupSettings({ groupId, ...data }),
    onSuccess: () => {
      toast.success(t("settingsUpdated"));
      refetch();
    },
    onError: () => {
      toast.error(t("failedUpdateSettings"));
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => client.telegram.disconnectGroup({ groupId }),
    onSuccess: () => {
      toast.success(t("disconnected"));
      refetch();
    },
    onError: () => {
      toast.error(t("failedDisconnect"));
    },
  });

  if (!configStatus?.configured) {
    return (
      <div className="rounded-xl border border-overlay-medium bg-overlay-subtle p-4">
        <div className="flex items-center gap-3">
          <span className="text-lg">🤖</span>
          <div>
            <p className="font-medium">Telegram Bot</p>
            <p className="text-sm text-muted-foreground">{t("notConfigured")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!groupStatus?.connected) {
    return (
      <div className="rounded-xl border border-overlay-medium bg-overlay-subtle p-4">
        <div className="flex items-center gap-3">
          <span className="text-lg">🤖</span>
          <div>
            <p className="font-medium">Telegram Bot</p>
            <p className="text-sm text-muted-foreground">{t("notConnected")}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">{t("connectInstructions")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-overlay-medium bg-overlay-subtle p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg">🤖</span>
          <div>
            <p className="font-medium">Telegram Bot</p>
            <p className="text-sm text-muted-foreground">
              {t("connectedTo", { chat: groupStatus.chatTitle ?? "Chat" })}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => disconnectMutation.mutate()}
          disabled={disconnectMutation.isPending}
          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
        >
          <Unlink className="mr-1 h-3 w-3" />
          {t("disconnect")}
        </Button>
      </div>

      {/* Notification Toggle */}
      <div className="space-y-3">
        <label className="flex items-center justify-between">
          <span className="text-sm">{t("notifyActivities")}</span>
          <button
            onClick={() => updateMutation.mutate({ notifyActivities: !groupStatus.notifyActivities })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              groupStatus.notifyActivities ? "bg-[#4ecdc4]" : "bg-overlay-strong"
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              groupStatus.notifyActivities ? "translate-x-6" : "translate-x-1"
            }`} />
          </button>
        </label>

        <label className="flex items-center justify-between">
          <span className="text-sm">{t("dailyReminder")}</span>
          <button
            onClick={() => updateMutation.mutate({ dailyReminderEnabled: !groupStatus.dailyReminderEnabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              groupStatus.dailyReminderEnabled ? "bg-[#4ecdc4]" : "bg-overlay-strong"
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              groupStatus.dailyReminderEnabled ? "translate-x-6" : "translate-x-1"
            }`} />
          </button>
        </label>

        {groupStatus.dailyReminderEnabled && (
          <div className="flex items-center gap-2 pl-4">
            <span className="text-sm text-muted-foreground">{t("reminderTime")}</span>
            <input
              type="time"
              value={groupStatus.dailyReminderTime}
              onChange={(e) => updateMutation.mutate({ dailyReminderTime: e.target.value })}
              className="rounded-lg border border-overlay-medium bg-overlay-subtle px-3 py-1.5 text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}
