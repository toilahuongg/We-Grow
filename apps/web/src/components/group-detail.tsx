"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Users,
  Trophy,
  Copy,
  UserX,
  Shield,
  Crown,
  Edit2,
  CheckCircle2,
  Flame,
  Settings,
  Trash2,
  LogOut,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { orpc, client } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LevelUpModal } from "@/components/level-up-modal";
import { NoteDialog } from "@/components/note-dialog";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { ActivityFeed } from "@/components/activity-feed";
import { TelegramSettings } from "@/components/telegram-settings";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

const roleConfig = {
  owner: { labelKey: "owner" as const, icon: Crown, color: "text-yellow-500" },
  moderator: { labelKey: "moderator" as const, icon: Shield, color: "text-blue-500" },
  member: { labelKey: "member" as const, icon: Users, color: "text-muted-foreground" },
};

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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

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

export function GroupDetail({ groupId, initialData }: { groupId: string; initialData: any }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("groupDetail");
  const tc = useTranslations("common");
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"today" | "feed" | "leaderboard" | "members" | "settings">("today");
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [removeMemberTarget, setRemoveMemberTarget] = useState<{ userId: string; userName: string } | null>(null);
  const [editingGroup, setEditingGroup] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);
  const [noteDialogHabitId, setNoteDialogHabitId] = useState<string | null>(null);

  useState(() => {
    authClient.getSession().then((res) => setSession(res.data ? res.data : null));
  });

  const { data: group, isLoading } = useQuery({
    ...orpc.groups.getById.queryOptions({ input: { groupId } }),
    initialData,
    staleTime: 1000 * 60,
  });

  const { data: todayHabits } = useQuery({
    ...orpc.habits.todaySummary.queryOptions({ input: { groupId } }),
    staleTime: 1000 * 60,
    enabled: activeTab === "today",
  });

  const { data: leaderboard } = useQuery({
    ...orpc.gamification.getGroupLeaderboard.queryOptions({ input: { groupId } }),
    staleTime: 1000 * 60 * 5,
    enabled: activeTab === "leaderboard",
  });

  const completeHabit = useMutation({
    mutationFn: (habitId: string) => client.habits.complete({ habitId }),
    onMutate: async (habitId) => {
      await queryClient.cancelQueries({ queryKey: orpc.habits.todaySummary.queryKey() });
      const previousHabits = queryClient.getQueryData(orpc.habits.todaySummary.queryOptions({ input: { groupId } }).queryKey);

      queryClient.setQueryData(
        orpc.habits.todaySummary.queryOptions({ input: { groupId } }).queryKey,
        (old: any[] | undefined) => old?.map(h => h._id === habitId ? { ...h, completedToday: true } : h)
      );

      return { previousHabits };
    },
    onSuccess: (result: any, habitId: string) => {
      if (!result.alreadyCompleted) {
        toast.success(t("xpAwarded", { amount: result.xpAwarded ?? 0 }));
        if (result.leveledUp && result.newLevel) {
          setLevelUpLevel(result.newLevel);
        }
        setNoteDialogHabitId(habitId);
      }
      queryClient.invalidateQueries({ queryKey: orpc.gamification.getProfile.queryKey() });
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(
        orpc.habits.todaySummary.queryOptions({ input: { groupId } }).queryKey,
        context?.previousHabits
      );
      toast.error(t("failedComplete"));
    },
  });

  const saveNoteMutation = useMutation({
    mutationFn: (input: { habitId: string; date: string; note: string | null }) =>
      client.habits.updateNote(input),
    onSuccess: () => {
      setNoteDialogHabitId(null);
    },
  });

  const uncompleteHabit = useMutation({
    mutationFn: (habitId: string) => client.habits.uncomplete({ habitId }),
    onMutate: async (habitId) => {
      await queryClient.cancelQueries({ queryKey: orpc.habits.todaySummary.queryKey() });
      const previousHabits = queryClient.getQueryData(orpc.habits.todaySummary.queryOptions({ input: { groupId } }).queryKey);

      queryClient.setQueryData(
        orpc.habits.todaySummary.queryOptions({ input: { groupId } }).queryKey,
        (old: any[] | undefined) => old?.map(h => h._id === habitId ? { ...h, completedToday: false } : h)
      );

      return { previousHabits };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.gamification.getProfile.queryKey() });
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(
        orpc.habits.todaySummary.queryOptions({ input: { groupId } }).queryKey,
        context?.previousHabits
      );
      toast.error(t("failedUncomplete"));
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => client.groups.leave({ groupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.groups.listMy.queryKey() });
      toast.success(t("leftGroup"));
      window.location.href = "/groups";
    },
    onError: (error: any) => {
      toast.error(error.message || t("failedLeave"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => client.groups.delete({ groupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.groups.listMy.queryKey() });
      toast.success(t("groupDeleted"));
      window.location.href = "/groups";
    },
    onError: (error: any) => {
      toast.error(error.message || t("failedDelete"));
    },
  });

  const regenerateCodeMutation = useMutation({
    mutationFn: () => client.groups.regenerateInviteCode({ groupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.groups.getById.queryKey({ input: { groupId } }) });
      toast.success(t("inviteCodeRegenerated"));
    },
    onError: () => {
      toast.error(t("failedRegenerate"));
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      client.groups.update({ groupId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.groups.getById.queryKey({ input: { groupId } }) });
      toast.success(t("groupUpdated"));
      setEditingGroup(false);
    },
    onError: (error: any) => {
      toast.error(error.message || t("failedUpdateGroup"));
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => client.groups.removeMember({ groupId, userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.groups.getById.queryKey({ input: { groupId } }) });
      toast.success(t("memberRemoved"));
    },
    onError: (error: any) => {
      toast.error(error.message || t("failedRemoveMember"));
    },
  });

  const approveMemberMutation = useMutation({
    mutationFn: (userId: string) => client.groups.approveMember({ groupId, userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.groups.getById.queryKey({ input: { groupId } }) });
      toast.success(t("memberApproved"));
    },
    onError: (error: any) => {
      toast.error(error.message || t("failedApproveMember"));
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "moderator" | "member" }) =>
      client.groups.changeMemberRole({ groupId, userId, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.groups.getById.queryKey({ input: { groupId } }) });
      toast.success(t("roleUpdated"));
    },
    onError: (error: any) => {
      toast.error(error.message || t("failedUpdateRole"));
    },
  });

  if (isLoading || !session) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="glass-strong rounded-2xl p-8">
          <div className="h-8 w-32 animate-pulse rounded bg-white/10 mb-6" />
          <div className="h-48 animate-pulse rounded-xl bg-white/5" />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <EmptyState
          title={t("groupNotFound")}
          description={t("groupNotFoundDesc")}
          action={{
            label: t("backToGroups"),
            onClick: () => {
              window.location.href = "/groups";
            },
          }}
        />
      </div>
    );
  }

  const currentUser = group.members?.find((m: any) => {
    return m.userId === session.user?.id;
  });
  const isOwner = currentUser?.role === "owner";
  const isModerator = currentUser?.role === "moderator";
  const canManage = isOwner || isModerator;

  const activeMembers = group.members?.filter((m: any) => m.status === "active") ?? [];
  const pendingMembers = group.members?.filter((m: any) => m.status === "pending") ?? [];

  const copyInviteCode = () => {
    navigator.clipboard.writeText(group.inviteCode);
    toast.success(t("inviteCodeCopied"));
  };

  const dueHabits = (todayHabits as any[])?.filter((h: any) => h.isDue) ?? [];
  const completedCount = dueHabits.filter((h: any) => h.completedToday).length;

  const tabs = [
    { key: "today" as const, label: t("tabToday") },
    { key: "feed" as const, label: t("tabFeed") },
    { key: "leaderboard" as const, label: t("tabLeaderboard") },
    { key: "members" as const, label: t("tabMembers") },
    { key: "settings" as const, label: t("tabSettings") },
  ];

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link href="/groups">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold">{group.name}</h1>
          <p className="text-sm text-muted-foreground capitalize">{t("mode", { mode: group.mode })}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "outline"}
            onClick={() => setActiveTab(tab.key)}
            size="sm"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab: Today */}
      {activeTab === "today" && (
        <div className="space-y-6">
          <div className="glass-strong rounded-2xl p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold">{t("todaysHabits")}</h2>
                <p className="text-sm text-muted-foreground">
                  {completedCount === dueHabits.length && dueHabits.length > 0
                    ? t("allCompleted")
                    : dueHabits.length === 0
                      ? t("noHabitsToday")
                      : t("remaining", { count: dueHabits.length - completedCount })}
                </p>
              </div>
              {canManage && (
                <Link href={`/groups/${groupId}/habits/new`}>
                  <Button size="sm" className="bg-gradient-to-r from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-white">
                    {t("newHabit")}
                  </Button>
                </Link>
              )}
            </div>

            <div className="space-y-3">
              {dueHabits.length === 0 ? (
                <EmptyState
                  title={t("noHabitsYet")}
                  description={canManage ? t("createHabitToStart") : t("waitingForHabits")}
                  action={canManage ? {
                    label: t("createGroupHabit"),
                    onClick: () => router.push(`/groups/${groupId}/habits/new`),
                  } : undefined}
                />
              ) : (
                dueHabits.map((habit: any) => (
                  <div
                    key={habit._id}
                    onClick={() => router.push(`/habits/${habit._id}`)}
                    className="group relative flex items-center gap-4 rounded-xl border border-white/5 bg-white/5 p-4 transition-all hover:border-white/10 hover:bg-white/10 cursor-pointer"
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${habit.completedToday
                      ? "bg-gradient-to-br from-[#4ecdc4]/20 to-[#a78bfa]/20"
                      : "bg-white/5"
                      }`}>
                      {getHabitIcon(habit.title)}
                    </div>

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

                    <div className="text-right">
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
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${habit.completedToday
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
      )}

      {/* Tab: Feed */}
      {activeTab === "feed" && (
        <ActivityFeed groupId={groupId} />
      )}

      {/* Tab: Leaderboard */}
      {activeTab === "leaderboard" && (
        <div className="space-y-5">
          {!leaderboard || leaderboard.length === 0 ? (
            <EmptyState
              title={t("noDataYet")}
              description={t("completeToSeeLeaderboard")}
            />
          ) : (
            <>
              {/* Top 3 Podium */}
              {leaderboard.length >= 3 && (
                <div className="glass-strong rounded-2xl p-6 pb-8 overflow-hidden relative">
                  {/* Decorative gradient mesh */}
                  <div className="absolute inset-0 opacity-30 pointer-events-none">
                    <div className="absolute top-0 left-1/4 h-40 w-40 rounded-full bg-[#ffd700]/10 blur-3xl" />
                    <div className="absolute top-10 right-1/4 h-32 w-32 rounded-full bg-[#4ecdc4]/10 blur-3xl" />
                  </div>

                  <h3 className="font-display text-lg font-bold mb-6 relative z-10">{t("leaderboard")}</h3>

                  <div className="flex items-end justify-center gap-3 sm:gap-6 relative z-10">
                    {/* 2nd Place */}
                    <div className="flex flex-col items-center animate-[slide-up_0.5s_ease-out_0.1s_both]">
                      <span className="text-2xl mb-1">🥈</span>
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-gray-300 to-gray-500 text-white text-base font-bold shadow-lg ring-2 ring-gray-400/30 mb-3">
                        {getInitials(leaderboard[1]?.userId === session?.user?.id ? tc("you") : (leaderboard[1]?.userName ?? ""))}
                      </div>
                      <div className="rounded-2xl border border-gray-400/20 bg-gray-400/[0.06] p-3.5 text-center w-28 sm:w-32">
                        <p className="font-medium text-sm truncate mb-1">
                          {leaderboard[1]?.userId === session?.user?.id
                            ? tc("you")
                            : leaderboard[1]?.userName}
                        </p>
                        <p className="text-lg font-bold tabular-nums">{leaderboard[1]?.totalXp} <span className="text-xs font-medium text-muted-foreground">XP</span></p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {leaderboard[1]?.levelInfo?.icon} {t("levelLabel", { level: leaderboard[1]?.level })}
                        </p>
                      </div>
                    </div>

                    {/* 1st Place */}
                    <div className="flex flex-col items-center animate-[slide-up_0.5s_ease-out_both] -mt-4">
                      <Crown className="h-7 w-7 text-yellow-400 mb-1 drop-shadow-[0_0_8px_rgba(255,215,0,0.4)]" />
                      <span className="text-3xl mb-1">🥇</span>
                      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600 text-white text-lg font-bold shadow-xl ring-3 ring-yellow-400/40 mb-3 shimmer">
                        {getInitials(leaderboard[0]?.userId === session?.user?.id ? tc("you") : (leaderboard[0]?.userName ?? ""))}
                      </div>
                      <div className="rounded-2xl border border-yellow-500/25 bg-yellow-500/[0.08] p-4 text-center w-32 sm:w-40 shadow-[0_0_30px_rgba(255,215,0,0.06)]">
                        <p className="font-semibold truncate mb-1">
                          {leaderboard[0]?.userId === session?.user?.id
                            ? tc("you")
                            : leaderboard[0]?.userName}
                        </p>
                        <p className="text-xl font-bold gradient-text tabular-nums">{leaderboard[0]?.totalXp} <span className="text-xs font-medium">XP</span></p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {leaderboard[0]?.levelInfo?.icon} {t("levelLabel", { level: leaderboard[0]?.level })}
                        </p>
                      </div>
                    </div>

                    {/* 3rd Place */}
                    <div className="flex flex-col items-center animate-[slide-up_0.5s_ease-out_0.2s_both]">
                      <span className="text-2xl mb-1">🥉</span>
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-800 text-white text-base font-bold shadow-lg ring-2 ring-amber-600/30 mb-3">
                        {getInitials(leaderboard[2]?.userId === session?.user?.id ? tc("you") : (leaderboard[2]?.userName ?? ""))}
                      </div>
                      <div className="rounded-2xl border border-amber-600/20 bg-amber-600/[0.06] p-3.5 text-center w-28 sm:w-32">
                        <p className="font-medium text-sm truncate mb-1">
                          {leaderboard[2]?.userId === session?.user?.id
                            ? tc("you")
                            : leaderboard[2]?.userName}
                        </p>
                        <p className="text-lg font-bold tabular-nums">{leaderboard[2]?.totalXp} <span className="text-xs font-medium text-muted-foreground">XP</span></p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {leaderboard[2]?.levelInfo?.icon} {t("levelLabel", { level: leaderboard[2]?.level })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Ranked List */}
              {(leaderboard.length < 3 ? leaderboard : leaderboard.slice(3)).length > 0 && (
                <div className="glass-strong rounded-2xl p-5">
                  <div className="space-y-1.5">
                    {(leaderboard.length < 3 ? leaderboard : leaderboard.slice(3)).map((entry: any, index: number) => {
                      const actualRank = leaderboard.length < 3 ? index + 1 : index + 4;
                      const isCurrentUser = entry.userId === session.user?.id;

                      return (
                        <div
                          key={entry.userId}
                          className={`group flex items-center gap-4 rounded-xl border p-3.5 transition-all duration-200 hover:translate-y-[-1px] ${
                            isCurrentUser
                              ? "border-[#4ecdc4]/30 bg-[#4ecdc4]/[0.08] shadow-[0_0_15px_rgba(78,205,196,0.08)]"
                              : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10"
                          }`}
                        >
                          {actualRank <= 3 ? (
                            <span className="text-xl w-8 text-center">{actualRank === 1 ? "🥇" : actualRank === 2 ? "🥈" : "🥉"}</span>
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold tabular-nums">
                              {actualRank}
                            </div>
                          )}

                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6b6b]/80 to-[#ffa06b]/80 text-white text-xs font-semibold shrink-0">
                            {getInitials(isCurrentUser ? tc("you") : (entry.userName ?? ""))}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm ${isCurrentUser ? "text-[#4ecdc4]" : ""}`}>
                              {isCurrentUser ? tc("you") : entry.userName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {entry.levelInfo?.icon} {t("levelLabel", { level: entry.level })} · {t("dayStreakLabel", { count: entry.bestStreak })}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="font-semibold tabular-nums text-sm">{entry.totalXp} <span className="text-xs text-muted-foreground">XP</span></p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab: Members */}
      {activeTab === "members" && (
        <div className="glass-strong rounded-2xl p-6">
          <h3 className="font-semibold mb-4">{t("membersTitle", { count: activeMembers.length })}</h3>

          {activeMembers.length === 0 ? (
            <EmptyState
              title={t("noMembersYet")}
              description={t("shareInviteCode")}
            />
          ) : (
            <div className="space-y-2">
              {activeMembers.map((member: any) => {
                const isCurrentUser = member.userId === session.user?.id;
                const config = roleConfig[member.role as keyof typeof roleConfig];
                const RoleIcon = config.icon;

                return (
                  <div
                    key={member._id}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${isCurrentUser
                      ? "border-[#4ecdc4] bg-[#4ecdc4]/10"
                      : "border-white/10 bg-white/5"
                      }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#ffa06b] to-[#f472b6] text-white font-semibold">
                      {isCurrentUser ? "Y" : getInitials(member.userName)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {isCurrentUser ? tc("you") : member.userName}
                      </p>
                      <div className={`flex items-center gap-1 text-xs ${config.color}`}>
                        <RoleIcon className="h-3 w-3" />
                        <span>{t(config.labelKey)}</span>
                      </div>
                    </div>
                    {!isCurrentUser && (
                      <div className="flex gap-1">
                        {isOwner && (
                          <select
                            value={member.role}
                            onChange={(e) => {
                              const newRole = e.target.value as "moderator" | "member";
                              changeRoleMutation.mutate({ userId: member.userId, role: newRole });
                            }}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs"
                            disabled={changeRoleMutation.isPending}
                          >
                            <option value="member">{t("member")}</option>
                            <option value="moderator">{t("moderator")}</option>
                          </select>
                        )}
                        {canManage && (isOwner || member.role === "member") && (
                          <button
                            onClick={() => setRemoveMemberTarget({ userId: member.userId, userName: member.userName })}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-muted-foreground transition-all hover:bg-red-500/20 hover:text-red-500"
                            title={t("removeMember")}
                            disabled={removeMemberMutation.isPending}
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {pendingMembers.length > 0 && canManage && (
            <>
              <h4 className="font-semibold mt-6 mb-3">{t("pendingMembers", { count: pendingMembers.length })}</h4>
              <div className="space-y-2">
                {pendingMembers.map((member: any) => (
                  <div
                    key={member._id}
                    className="flex items-center gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#ffa06b] to-[#f472b6] text-white font-semibold">
                      {getInitials(member.userName)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{member.userName}</p>
                      <p className="text-xs text-yellow-500">{t("waitingForApproval")}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => approveMemberMutation.mutate(member.userId)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-muted-foreground transition-all hover:bg-green-500/20 hover:text-green-500"
                        title={t("approve")}
                        disabled={approveMemberMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setRemoveMemberTarget({ userId: member.userId, userName: member.userName })}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-muted-foreground transition-all hover:bg-red-500/20 hover:text-red-500"
                        title={t("reject")}
                        disabled={removeMemberMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Settings */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* Group Info */}
          <div className="glass-strong rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{t("groupInfo")}</h3>
              {canManage && !editingGroup && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditName(group.name);
                    setEditDescription(group.description ?? "");
                    setEditingGroup(true);
                  }}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  {tc("edit")}
                </Button>
              )}
            </div>

            {editingGroup ? (
              <div className="space-y-3 mb-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">{t("groupName")}</Label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">{t("groupDescription")}</Label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateGroupMutation.mutate({ name: editName, description: editDescription })}
                    disabled={!editName.trim() || updateGroupMutation.isPending}
                  >
                    {updateGroupMutation.isPending ? tc("saving") : tc("save")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingGroup(false)}
                  >
                    {tc("cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {group.description || t("noDescriptionProvided")}
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm">
                    {t("membersTitle", { count: activeMembers.length })}
                  </span>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${group.mode === "together"
                    ? "bg-[#ff6b6b]/20 text-[#ff6b6b] border-[#ff6b6b]/30"
                    : "bg-[#4ecdc4]/20 text-[#4ecdc4] border-[#4ecdc4]/30"
                    }`}>
                    {group.mode === "together" ? t("togetherMode") : t("shareMode")}
                  </span>
                </div>
              </>
            )}

            {/* Invite Code */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1">{t("inviteCode")}</Label>
                  <div className="flex items-center gap-2">
                    <code className="text-lg font-mono tracking-widest">
                      {showInviteCode ? group.inviteCode : "••••••"}
                    </code>
                    <button
                      onClick={() => setShowInviteCode(!showInviteCode)}
                      className="text-muted-foreground hover:text-foreground text-sm"
                    >
                      {showInviteCode ? t("hide") : t("show")}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyInviteCode}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  {canManage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => regenerateCodeMutation.mutate()}
                      disabled={regenerateCodeMutation.isPending}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bot Integrations */}
          {canManage && (
            <div className="glass-strong rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0088cc]/20 to-[#0068ff]/20">
                  <span className="text-lg">🤖</span>
                </div>
                <div>
                  <h3 className="font-semibold">{t("botIntegrations")}</h3>
                  <p className="text-sm text-muted-foreground">{t("botIntegrationsDesc")}</p>
                </div>
              </div>

              <div className="space-y-3">
                <TelegramSettings groupId={group._id as string} t={(key) => t(`telegram_${key}`)} />
              </div>
            </div>
          )}

          {/* Danger Zone */}
          <div className="glass-strong rounded-2xl p-6 border border-red-500/10">
            <h3 className="font-semibold mb-4 text-red-400">{t("dangerZone")}</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
                <div>
                  <p className="font-medium">{t("leaveGroup")}</p>
                  <p className="text-sm text-muted-foreground">{t("leaveGroupDesc")}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setLeaveDialog(true)}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("leave")}
                </Button>
              </div>

              {isOwner && (
                <div className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                  <div>
                    <p className="font-medium text-red-400">{t("deleteGroup")}</p>
                    <p className="text-sm text-muted-foreground">{t("deleteGroupDesc")}</p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteDialog(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("deleteGroup")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leave Confirmation */}
      <ConfirmDialog
        open={leaveDialog}
        onOpenChange={setLeaveDialog}
        title={t("leaveConfirmTitle")}
        description={t("leaveConfirmDesc", { name: group.name })}
        confirmText={t("leave")}
        variant="warning"
        onConfirm={() => leaveMutation.mutate()}
        isLoading={leaveMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDesc", { name: group.name })}
        confirmText={t("deleteGroup")}
        variant="danger"
        onConfirm={() => deleteMutation.mutate()}
        isLoading={deleteMutation.isPending}
      />

      {/* Remove Member Confirmation */}
      <ConfirmDialog
        open={!!removeMemberTarget}
        onOpenChange={(open) => !open && setRemoveMemberTarget(null)}
        title={t("removeMemberConfirmTitle")}
        description={t("removeMemberConfirmDesc", { name: removeMemberTarget?.userName ?? "" })}
        confirmText={t("removeMember")}
        variant="danger"
        onConfirm={() => {
          if (removeMemberTarget) removeMemberMutation.mutate(removeMemberTarget.userId);
          setRemoveMemberTarget(null);
        }}
        isLoading={removeMemberMutation.isPending}
      />

      {/* Note Dialog */}
      <NoteDialog
        open={!!noteDialogHabitId}
        onOpenChange={(open) => !open && setNoteDialogHabitId(null)}
        isLoading={saveNoteMutation.isPending}
        onSave={(note) => {
          if (noteDialogHabitId && note) {
            const today = new Date().toISOString().split("T")[0]!;
            saveNoteMutation.mutate({ habitId: noteDialogHabitId, date: today, note });
          } else {
            setNoteDialogHabitId(null);
          }
        }}
      />

      {/* Level Up Modal */}
      <LevelUpModal level={levelUpLevel} onClose={() => setLevelUpLevel(null)} />
    </div>
  );
}
