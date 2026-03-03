"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Users, Trophy, Copy, Settings, UserPlus, Shield, Crown, UserX, Edit2 } from "lucide-react";
import Link from "next/link";

import { orpc } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

const roleConfig = {
  owner: { label: "Owner", icon: Crown, color: "text-yellow-500" },
  moderator: { label: "Moderator", icon: Shield, color: "text-blue-500" },
  member: { label: "Member", icon: Users, color: "text-muted-foreground" },
};

export function GroupDetail({ groupId, initialData }: { groupId: string; initialData: any }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "leaderboard" | "members">("overview");
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);

  useState(() => {
    authClient.getSession().then(setSession);
  });

  const { data: group, isLoading } = useQuery({
    ...orpc.groups.getById.queryOptions({ groupId }),
    initialData,
    staleTime: 1000 * 60,
  });

  const { data: leaderboard } = useQuery({
    ...orpc.gamification.getGroupLeaderboard.queryOptions({ groupId }),
    staleTime: 1000 * 60 * 5,
    enabled: activeTab === "leaderboard",
  });

  const leaveMutation = useMutation({
    mutationFn: () => orpc.groups.leave.mutate({ groupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.groups.listMy.queryKey() });
      toast.success("Left the group");
      window.location.href = "/groups";
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to leave group");
    },
  });

  const regenerateCodeMutation = useMutation({
    mutationFn: () => orpc.groups.regenerateInviteCode.mutate({ groupId }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: orpc.groups.getById.queryKey() });
      toast.success("Invite code regenerated!");
      setEditDialog(false);
    },
    onError: () => {
      toast.error("Failed to regenerate invite code");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => orpc.groups.removeMember.mutate({ groupId, userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.groups.getById.queryKey() });
      toast.success("Member removed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove member");
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "moderator" | "member" }) =>
      orpc.groups.changeMemberRole.mutate({ groupId, userId, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.groups.getById.queryKey() });
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
    toast.success("Invite code copied to clipboard!");
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
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
        <div className="flex gap-2">
          {canManage && (
            <Link href={`/groups/${groupId}/habits/new`}>
              <Button variant="outline">
                <Trophy className="mr-2 h-4 w-4" />
                Create Group Habit
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            onClick={() => setLeaveDialog(true)}
          >
            Leave Group
          </Button>
        </div>
      </div>

      {/* Group Info Card */}
      <div className="glass-strong rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-semibold mb-1">Group Information</h2>
            <p className="text-sm text-muted-foreground">
              {group.description || "No description provided"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm">
              {activeMembers.length} members
            </span>
          </div>
        </div>

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
                  className="text-muted-foreground hover:text-foreground"
                >
                  {showInviteCode ? "🙈" : "👁️"}
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

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === "overview" ? "default" : "outline"}
          onClick={() => setActiveTab("overview")}
          size="sm"
        >
          Overview
        </Button>
        <Button
          variant={activeTab === "leaderboard" ? "default" : "outline"}
          onClick={() => setActiveTab("leaderboard")}
          size="sm"
        >
          Leaderboard
        </Button>
        <Button
          variant={activeTab === "members" ? "default" : "outline"}
          onClick={() => setActiveTab("members")}
          size="sm"
        >
          Members
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="glass-strong rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Group Progress</h3>
          <p className="text-sm text-muted-foreground">
            View the leaderboard and member stats to see how everyone is progressing!
          </p>
        </div>
      )}

      {activeTab === "leaderboard" && (
        <div className="glass-strong rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Leaderboard</h3>
          {!leaderboard || leaderboard.length === 0 ? (
            <EmptyState
              title="No data yet"
              description="Complete some habits to see the leaderboard"
            />
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry: any, index: number) => {
                const isCurrentUser = entry.userId === session.user?.id;
                const member = activeMembers.find((m: any) => m.userId === entry.userId);

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
                        {member?.userId === session.user?.id
                          ? "You"
                          : `User #${entry.userId.slice(0, 8)}`}
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
        </div>
      )}

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
    </div>
  );
}
