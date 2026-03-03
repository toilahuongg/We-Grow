"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Trophy, CheckCircle2, Flame, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { orpc, client } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";

const modeConfig = {
  together: {
    label: "Together",
    description: "Complete the same habits together",
    icon: Trophy,
    color: "from-[#ff6b6b] to-[#ffa06b]",
  },
  share: {
    label: "Share",
    description: "Track progress independently",
    icon: Users,
    color: "from-[#4ecdc4] to-[#a78bfa]",
  },
};

export function GroupsList() {
  const queryClient = useQueryClient();
  const t = useTranslations("groups");
  const tc = useTranslations("common");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const { data: groups, isLoading } = useQuery({
    ...orpc.groups.listMy.queryOptions(),
    staleTime: 1000 * 60,
  });

  const { data: profile } = useQuery({
    ...orpc.gamification.getProfile.queryOptions(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: todayHabits } = useQuery({
    ...orpc.habits.todaySummary.queryOptions(),
    staleTime: 1000 * 60,
  });

  const joinMutation = useMutation({
    mutationFn: (input: { inviteCode: string }) => client.groups.join(input),
    onSuccess: (result) => {
      if (result.status === "active") {
        toast.success(t("joinedSuccess"));
        queryClient.invalidateQueries({ queryKey: orpc.groups.listMy.queryKey() });
        setJoinDialogOpen(false);
        setInviteCode("");
        setLookupResult(null);
      } else if (result.status === "pending") {
        toast.success(t("joinRequestSent"));
        setJoinDialogOpen(false);
        setInviteCode("");
        setLookupResult(null);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || t("failedJoin"));
    },
  });

  const handleLookup = async () => {
    if (!inviteCode.trim()) return;

    setLookingUp(true);
    setLookupResult(null);

    try {
      const result = await client.groups.lookupByInviteCode({ inviteCode: inviteCode.trim().toUpperCase() });
      setLookupResult(result);
    } catch (error: any) {
      toast.error(error.message || t("invalidInviteCode"));
      setLookupResult(null);
    } finally {
      setLookingUp(false);
    }
  };

  // Calculate per-group progress from todayHabits
  const groupProgress: Record<string, { completed: number; total: number }> = {};
  if (todayHabits) {
    for (const habit of todayHabits as any[]) {
      if (!habit.isDue) continue;
      const gId = habit.groupId as string;
      if (!groupProgress[gId]) {
        groupProgress[gId] = { completed: 0, total: 0 };
      }
      groupProgress[gId].total++;
      if (habit.completedToday) {
        groupProgress[gId].completed++;
      }
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="glass-strong rounded-2xl p-8">
          <div className="h-8 w-32 animate-pulse rounded bg-overlay-medium mb-6" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-overlay-subtle" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const dueHabits = (todayHabits as any[])?.filter((h: any) => h.isDue) ?? [];
  const completedToday = dueHabits.filter((h: any) => h.completedToday).length;
  const totalHabits = dueHabits.length;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Personal Stats Banner */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="glass-strong group relative overflow-hidden rounded-2xl p-5 transition-all hover:scale-[1.02]">
          <div className="relative z-10">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff6b6b] to-[#ffa06b]">
                <Trophy className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{t("level")}</span>
            </div>
            <p className="font-display text-3xl font-bold">{profile?.level ?? 1}</p>
            <p className="text-sm text-muted-foreground">{(profile?.totalXp ?? 0).toLocaleString()} XP</p>
          </div>
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl group-hover:opacity-30 transition-opacity" style={{ background: "#ff6b6b" }} />
        </div>

        <div className="glass-strong group relative overflow-hidden rounded-2xl p-5 transition-all hover:scale-[1.02]">
          <div className="relative z-10">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#4ecdc4] to-[#a78bfa]">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{t("today")}</span>
            </div>
            <p className="font-display text-3xl font-bold">{completedToday}/{totalHabits}</p>
            <p className="text-sm text-muted-foreground">{t("habitsCompleted")}</p>
          </div>
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl group-hover:opacity-30 transition-opacity" style={{ background: "#4ecdc4" }} />
        </div>

        <div className="glass-strong group relative overflow-hidden rounded-2xl p-5 transition-all hover:scale-[1.02]">
          <div className="relative z-10">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#a78bfa] to-[#f472b6]">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{t("groupsLabel")}</span>
            </div>
            <p className="font-display text-3xl font-bold">{groups?.length ?? 0}</p>
            <p className="text-sm text-muted-foreground">{t("activeGroups")}</p>
          </div>
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl group-hover:opacity-30 transition-opacity" style={{ background: "#a78bfa" }} />
        </div>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setJoinDialogOpen(true)}
          >
            {t("joinGroup")}
          </Button>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-gradient-to-r from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("createGroup")}
          </Button>
        </div>
      </div>

      {/* Groups List */}
      {!groups || groups.length === 0 ? (
        <EmptyState
          title={t("noGroupsTitle")}
          description={t("noGroupsDesc")}
          action={{
            label: t("createFirstGroup"),
            onClick: () => setCreateDialogOpen(true),
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((group: any) => {
            const config = modeConfig[group.mode as keyof typeof modeConfig];
            const progress = groupProgress[group._id];

            return (
              <Link
                key={group._id}
                href={`/groups/${group._id}`}
                className="block"
              >
                <div className="glass-strong group relative overflow-hidden rounded-2xl border border-overlay-subtle bg-overlay-subtle p-6 transition-all hover:border-overlay-medium hover:bg-overlay-medium hover:scale-[1.01] cursor-pointer">
                  <div className="absolute top-0 right-0 h-32 w-32 opacity-10 blur-3xl">
                    <div
                      className="h-full w-full rounded-full"
                      style={{
                        background: `linear-gradient(135deg, ${config.color.split(" ")[0]}, ${config.color.split(" ")[2]})`,
                      }}
                    />
                  </div>

                  <div className="relative">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6b6b]/20 to-[#ffa06b]/20">
                        <Users className="h-6 w-6 text-[#ff6b6b]" />
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                        group.mode === "together"
                          ? "bg-[#ff6b6b]/20 text-[#ff6b6b] border-[#ff6b6b]/30"
                          : "bg-[#4ecdc4]/20 text-[#4ecdc4] border-[#4ecdc4]/30"
                      }`}>
                        {group.mode === "together" ? t("together") : t("share")}
                      </span>
                    </div>

                    <h3 className="mb-1 font-display text-xl font-bold">{group.name}</h3>
                    <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
                      {group.description || tc("noDescription")}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{tc("members")}</span>
                        </div>
                      </div>

                      {/* Progress indicator */}
                      {progress && progress.total > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-overlay-medium">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#4ecdc4] to-[#a78bfa] transition-all"
                              style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${
                            progress.completed === progress.total
                              ? "text-[#4ecdc4]"
                              : "text-muted-foreground"
                          }`}>
                            {progress.completed}/{progress.total}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Group Dialog */}
      {createDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
            onClick={() => setCreateDialogOpen(false)}
          />
          <div className="relative z-50 glass-strong rounded-2xl p-6 shadow-xl w-full max-w-md mx-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{t("createGroup")}</h2>
            <GroupForm
              onSuccess={() => {
                setCreateDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: orpc.groups.listMy.queryKey() });
              }}
              onCancel={() => setCreateDialogOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Join Group Dialog */}
      {joinDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
            onClick={() => {
              setJoinDialogOpen(false);
              setInviteCode("");
              setLookupResult(null);
            }}
          />
          <div className="relative z-50 glass-strong rounded-2xl p-6 shadow-xl w-full max-w-md mx-4 animate-in zoom-in-95">
            <h2 className="text-lg font-bold mb-4">{t("joinGroup")}</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{t("inviteCode")}</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder={t("enterCode")}
                  className="w-full px-3 py-2 rounded-lg bg-overlay-subtle border border-overlay-medium focus:border-[#4ecdc4] outline-none text-center text-lg font-mono tracking-widest uppercase"
                  maxLength={6}
                />
              </div>

              <Button
                onClick={handleLookup}
                disabled={inviteCode.length !== 6 || lookingUp}
                className="w-full"
                variant="outline"
              >
                {lookingUp ? t("lookingUp") : t("lookupGroup")}
              </Button>

              {lookupResult && (
                <div className="rounded-xl border border-overlay-medium bg-overlay-subtle p-4">
                  <h3 className="font-semibold mb-1">{lookupResult.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {lookupResult.description || tc("noDescription")}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t("membersCount", { count: lookupResult.memberCount })}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 ${
                      lookupResult.mode === "together"
                        ? "bg-[#ff6b6b]/20 text-[#ff6b6b] border-[#ff6b6b]/30"
                        : "bg-[#4ecdc4]/20 text-[#4ecdc4] border-[#4ecdc4]/30"
                    }`}>
                      {lookupResult.mode === "together" ? t("together") : t("share")}
                    </span>
                  </div>
                  <Button
                    onClick={() => joinMutation.mutate({ inviteCode: inviteCode.trim().toUpperCase() })}
                    disabled={joinMutation.isPending}
                    className="w-full mt-3 bg-gradient-to-r from-[#4ecdc4] to-[#a78bfa] text-white"
                  >
                    {joinMutation.isPending ? t("joining") : t("joinGroup")}
                  </Button>
                </div>
              )}

              <Button
                variant="ghost"
                onClick={() => {
                  setJoinDialogOpen(false);
                  setInviteCode("");
                  setLookupResult(null);
                }}
                className="w-full"
              >
                {tc("cancel")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Group Form Component (inline)
function GroupForm({ onSuccess, onCancel }: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const t = useTranslations("groups");
  const tc = useTranslations("common");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"together" | "share">("together");

  const createMutation = useMutation({
    mutationFn: (input: { name: string; description: string; mode: "together" | "share" }) =>
      client.groups.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.groups.listMy.queryKey() });
      toast.success(t("groupCreated"));
      onSuccess();
    },
    onError: (error: any) => toast.error(error.message || t("failedCreate")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name, description, mode });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("groupName")}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("groupNamePlaceholder")}
          className="w-full px-3 py-2 rounded-lg bg-overlay-subtle border border-overlay-medium focus:border-[#4ecdc4] outline-none"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t("description")}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-overlay-subtle border border-overlay-medium focus:border-[#4ecdc4] outline-none resize-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t("groupMode")}</label>
        <div className="grid grid-cols-2 gap-2">
          {(["together", "share"] as const).map((m) => {
            const config = modeConfig[m];
            const Icon = config.icon;

            return (
              <label
                key={m}
                className={`cursor-pointer rounded-xl border p-3 transition-all ${
                  mode === m
                    ? "border-[#4ecdc4] bg-[#4ecdc4]/10"
                    : "border-overlay-medium bg-overlay-subtle hover:border-overlay-strong"
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  value={m}
                  checked={mode === m}
                  onChange={(e) => setMode(e.target.value as any)}
                  className="sr-only"
                />
                <div className="flex flex-col items-center text-center gap-1">
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{m === "together" ? t("together") : t("share")}</span>
                  <span className="text-xs text-muted-foreground">{m === "together" ? t("togetherDesc") : t("shareDesc")}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {tc("cancel")}
        </Button>
        <Button
          type="submit"
          className="bg-gradient-to-r from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-white"
          disabled={createMutation.isPending || !name.trim()}
        >
          {createMutation.isPending ? t("creating") : t("createGroup")}
        </Button>
      </div>
    </form>
  );
}
