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
  Medal,
  Settings,
  Trash2,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { orpc, client } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

const roleConfig = {
  owner: { label: "Owner", icon: Crown, color: "text-yellow-500" },
  moderator: { label: "Moderator", icon: Shield, color: "text-blue-500" },
  member: { label: "Member", icon: Users, color: "text-muted-foreground" },
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
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"today" | "leaderboard" | "members" | "settings">("today");
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);

  useState(() => {
    authClient.getSession().then(setSession);
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
    onSuccess: (result) => {
      if (!result.alreadyCompleted) {
        toast.success(`+${result.xpAwarded} XP!`);
      }
      queryClient.invalidateQueries({ queryKey: orpc.gamification.getProfile.queryKey() });
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(
        orpc.habits.todaySummary.queryOptions({ input: { groupId } }).queryKey,
        context?.previousHabits
      );
      toast.error("Failed to complete habit.");
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
      toast.error("Failed to uncomplete habit.");
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => client.groups.leave({ groupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.groups.listMy.queryKey() });
      toast.success("Left the group");
      window.location.href = "/groups";
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to leave group");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => client.groups.delete({ groupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.groups.listMy.queryKey() });
      toast.success("Group deleted");
      window.location.href = "/groups";
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete group");
    },
  });

  const regenerateCodeMutation = useMutation({
    mutationFn: () => client.groups.regenerateInviteCode({ groupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.groups.getById.queryKey({ input: { groupId } }) });
      toast.success("Invite code regenerated!");
    },
    onError: () => {
      toast.error("Failed to regenerate invite code");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => client.groups.removeMember({ groupId, userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.groups.getById.queryKey({ input: { groupId } }) });
      toast.success("Member removed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove member");
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "moderator" | "member" }) =>
      client.groups.changeMemberRole({ groupId, userId, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.groups.getById.queryKey({ input: { groupId } }) });
      toast.success("Role updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update role");
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
          title="Group not found"
          description="The group you're looking for doesn't exist"
          action={{
            label: "Back to Groups",
            onClick: () => {
              window.location.href = "/groups";
            },
          }}
        />
      </div>
    );
  }

  const currentUser = group.members?.find((m: any) => m.userId === session.user?.id);
  const isOwner = currentUser?.role === "owner";
  const isModerator = currentUser?.role === "moderator";
  const canManage = isOwner || isModerator;

  const activeMembers = group.members?.filter((m: any) => m.status === "active") ?? [];
  const pendingMembers = group.members?.filter((m: any) => m.status === "pending") ?? [];

  const copyInviteCode = () => {
    navigator.clipboard.writeText(group.inviteCode);
    toast.success("Invite code copied!");
  };

  const dueHabits = (todayHabits as any[])?.filter((h: any) => h.isDue) ?? [];
  const completedCount = dueHabits.filter((h: any) => h.completedToday).length;

  const tabs = [
    { key: "today" as const, label: "Today" },
    { key: "leaderboard" as const, label: "Leaderboard" },
    { key: "members" as const, label: "Members" },
    { key: "settings" as const, label: "Settings" },
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
          <p className="text-sm text-muted-foreground capitalize">{group.mode} mode</p>
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
                <h2 className="font-display text-xl font-bold">Today's Habits</h2>
                <p className="text-sm text-muted-foreground">
                  {completedCount === dueHabits.length && dueHabits.length > 0
                    ? "All habits completed!"
                    : dueHabits.length === 0
                    ? "No habits scheduled for today"
                    : `${dueHabits.length - completedCount} remaining`}
                </p>
              </div>
              {canManage && (
                <Link href={`/groups/${groupId}/habits/new`}>
                  <Button size="sm" className="bg-gradient-to-r from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-white">
                    + New Habit
                  </Button>
                </Link>
              )}
            </div>

            <div className="space-y-3">
              {dueHabits.length === 0 ? (
                <EmptyState
                  title="No habits yet"
                  description={canManage ? "Create a habit to get started" : "Waiting for group habits to be created"}
                  action={canManage ? {
                    label: "Create Group Habit",
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
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${
                      habit.completedToday
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
                      <p className="text-sm font-medium">{habit.currentStreak ?? 0} day streak</p>
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
      )}

      {/* Tab: Leaderboard */}
      {activeTab === "leaderboard" && (
        <div className="glass-strong rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Leaderboard</h3>
          {!leaderboard || leaderboard.length === 0 ? (
            <EmptyState
              title="No data yet"
              description="Complete some habits to see the leaderboard"
            />
          ) : (
            <>
              {/* Top 3 Podium */}
              {leaderboard.length >= 3 && (
                <div className="flex items-end justify-center gap-4 mb-8">
                  {/* 2nd Place */}
                  <div className="flex flex-col items-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gray-400 to-gray-500 text-white text-xl font-bold mb-2 shadow-lg">
                      2
                    </div>
                    <div className="glass-strong rounded-xl border border-gray-400/30 bg-gray-400/10 p-4 text-center w-32">
                      <p className="font-medium text-sm truncate">
                        {leaderboard[1]?.userId === session?.user?.id
                          ? "You"
                          : `User #${leaderboard[1]?.userId.slice(0, 8)}`}
                      </p>
                      <p className="text-lg font-bold">{leaderboard[1]?.totalXp} XP</p>
                    </div>
                  </div>

                  {/* 1st Place */}
                  <div className="flex flex-col items-center">
                    <Crown className="h-8 w-8 text-yellow-500 mb-2" />
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white text-2xl font-bold mb-2 shadow-xl">
                      1
                    </div>
                    <div className="glass-strong rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-center w-36">
                      <p className="font-semibold truncate">
                        {leaderboard[0]?.userId === session?.user?.id
                          ? "You"
                          : `User #${leaderboard[0]?.userId.slice(0, 8)}`}
                      </p>
                      <p className="text-xl font-bold gradient-text">{leaderboard[0]?.totalXp} XP</p>
                      <p className="text-xs text-muted-foreground">Level {leaderboard[0]?.level}</p>
                    </div>
                  </div>

                  {/* 3rd Place */}
                  <div className="flex flex-col items-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-white text-xl font-bold mb-2 shadow-lg">
                      3
                    </div>
                    <div className="glass-strong rounded-xl border border-amber-600/30 bg-amber-600/10 p-4 text-center w-32">
                      <p className="font-medium text-sm truncate">
                        {leaderboard[2]?.userId === session?.user?.id
                          ? "You"
                          : `User #${leaderboard[2]?.userId.slice(0, 8)}`}
                      </p>
                      <p className="text-lg font-bold">{leaderboard[2]?.totalXp} XP</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Ranked List */}
              <div className="space-y-2">
                {leaderboard.map((entry: any, index: number) => {
                  // Skip top 3 if podium is shown
                  if (leaderboard.length >= 3 && index < 3) return null;
                  const isCurrentUser = entry.userId === session.user?.id;

                  return (
                    <div
                      key={entry.userId}
                      className={`flex items-center gap-4 rounded-xl border p-3 ${
                        isCurrentUser
                          ? "border-[#4ecdc4] bg-[#4ecdc4]/10"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6b6b] to-[#ffa06b] text-sm font-bold text-white">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {isCurrentUser ? "You" : `User #${entry.userId.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Level {entry.level} · {entry.bestStreak} day streak
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{entry.totalXp} XP</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* For leaderboards with fewer than 3, show all as list */}
              {leaderboard.length < 3 && (
                <div className="space-y-2">
                  {leaderboard.map((entry: any, index: number) => {
                    const isCurrentUser = entry.userId === session.user?.id;
                    return (
                      <div
                        key={entry.userId}
                        className={`flex items-center gap-4 rounded-xl border p-3 ${
                          isCurrentUser
                            ? "border-[#4ecdc4] bg-[#4ecdc4]/10"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6b6b] to-[#ffa06b] text-sm font-bold text-white">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">
                            {isCurrentUser ? "You" : `User #${entry.userId.slice(0, 8)}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Level {entry.level} · {entry.bestStreak} day streak
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{entry.totalXp} XP</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab: Members */}
      {activeTab === "members" && (
        <div className="glass-strong rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Members ({activeMembers.length})</h3>

          {activeMembers.length === 0 ? (
            <EmptyState
              title="No members yet"
              description="Share the invite code to add members"
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
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      isCurrentUser
                        ? "border-[#4ecdc4] bg-[#4ecdc4]/10"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#ffa06b] to-[#f472b6] text-white font-semibold">
                      {(member.userId === session.user?.id ? "You" : member.userId.slice(0, 2)).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {member.userId === session.user?.id ? "You" : `User #${member.userId.slice(0, 8)}`}
                      </p>
                      <div className={`flex items-center gap-1 text-xs ${config.color}`}>
                        <RoleIcon className="h-3 w-3" />
                        <span>{config.label}</span>
                      </div>
                    </div>
                    {canManage && !isCurrentUser && isOwner && (
                      <div className="flex gap-1">
                        <select
                          value={member.role}
                          onChange={(e) => {
                            const newRole = e.target.value as "moderator" | "member";
                            changeRoleMutation.mutate({ userId: member.userId, role: newRole });
                          }}
                          className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs"
                          disabled={changeRoleMutation.isPending}
                        >
                          <option value="member">Member</option>
                          <option value="moderator">Moderator</option>
                        </select>
                        <button
                          onClick={() => removeMemberMutation.mutate(member.userId)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-muted-foreground transition-all hover:bg-red-500/20 hover:text-red-500"
                          title="Remove member"
                          disabled={removeMemberMutation.isPending}
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {pendingMembers.length > 0 && canManage && (
            <>
              <h4 className="font-semibold mt-6 mb-3">Pending Members ({pendingMembers.length})</h4>
              <div className="space-y-2">
                {pendingMembers.map((member: any) => (
                  <div
                    key={member._id}
                    className="flex items-center gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#ffa06b] to-[#f472b6] text-white font-semibold">
                      {member.userId.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">User #{member.userId.slice(0, 8)}</p>
                      <p className="text-xs text-yellow-500">Waiting for approval</p>
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
            <h3 className="font-semibold mb-4">Group Information</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {group.description || "No description provided"}
            </p>
            <div className="flex items-center gap-2 mb-4">
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm">
                {activeMembers.length} members
              </span>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                group.mode === "together"
                  ? "bg-[#ff6b6b]/20 text-[#ff6b6b] border-[#ff6b6b]/30"
                  : "bg-[#4ecdc4]/20 text-[#4ecdc4] border-[#4ecdc4]/30"
              }`}>
                {group.mode === "together" ? "Together" : "Share"} mode
              </span>
            </div>

            {/* Invite Code */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1">Invite Code</Label>
                  <div className="flex items-center gap-2">
                    <code className="text-lg font-mono tracking-widest">
                      {showInviteCode ? group.inviteCode : "••••••"}
                    </code>
                    <button
                      onClick={() => setShowInviteCode(!showInviteCode)}
                      className="text-muted-foreground hover:text-foreground text-sm"
                    >
                      {showInviteCode ? "Hide" : "Show"}
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
                  {isOwner && (
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

          {/* Danger Zone */}
          <div className="glass-strong rounded-2xl p-6 border border-red-500/10">
            <h3 className="font-semibold mb-4 text-red-400">Danger Zone</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
                <div>
                  <p className="font-medium">Leave Group</p>
                  <p className="text-sm text-muted-foreground">You can rejoin later with the invite code</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setLeaveDialog(true)}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Leave
                </Button>
              </div>

              {isOwner && (
                <div className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                  <div>
                    <p className="font-medium text-red-400">Delete Group</p>
                    <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteDialog(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
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
        title="Leave Group"
        description={`Are you sure you want to leave "${group.name}"? You can join again later with the invite code.`}
        confirmText="Leave"
        variant="warning"
        onConfirm={() => leaveMutation.mutate()}
        isLoading={leaveMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        title="Delete Group"
        description={`Are you sure you want to delete "${group.name}"? This action cannot be undone and all group data will be lost.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={() => deleteMutation.mutate()}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
