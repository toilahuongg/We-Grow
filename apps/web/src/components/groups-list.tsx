"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Users, Trophy, Eye, EyeOff, LogOut } from "lucide-react";
import Link from "next/link";

import { orpc } from "@/utils/orpc";
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const { data: groups, isLoading } = useQuery({
    ...orpc.groups.listMy.queryOptions(),
    staleTime: 1000 * 60,
  });

  const joinMutation = useMutation({
    mutationFn: orpc.groups.join.mutate,
    onSuccess: (result) => {
      if (result.status === "active") {
        toast.success("Successfully joined the group! 🎉");
        queryClient.invalidateQueries({ queryKey: orpc.groups.listMy.queryKey() });
        setJoinDialogOpen(false);
        setInviteCode("");
        setLookupResult(null);
      } else if (result.status === "pending") {
        toast.success("Request sent! Waiting for approval.");
        setJoinDialogOpen(false);
        setInviteCode("");
        setLookupResult(null);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to join group");
    },
  });

  const leaveMutation = useMutation({
    mutationFn: (groupId: string) => orpc.groups.leave.mutate({ groupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.groups.listMy.queryKey() });
      toast.success("Left the group");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to leave group");
    },
  });

  const handleLookup = async () => {
    if (!inviteCode.trim()) return;

    setLookingUp(true);
    setLookupResult(null);

    try {
      const result = await orpc.groups.lookupByInviteCode({ inviteCode: inviteCode.trim().toUpperCase() });
      setLookupResult(result);
    } catch (error: any) {
      toast.error(error.message || "Invalid invite code");
      setLookupResult(null);
    } finally {
      setLookingUp(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="glass-strong rounded-2xl p-8">
          <div className="h-8 w-32 animate-pulse rounded bg-white/10 mb-6" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-white/5" />
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
            <h1 className="font-display text-3xl font-bold">Groups</h1>
            <p className="text-sm text-muted-foreground">
              Grow together with friends
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setJoinDialogOpen(true)}
          >
            Join Group
          </Button>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-gradient-to-r from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Group
          </Button>
        </div>
      </div>

      {/* Groups List */}
      {!groups || groups.length === 0 ? (
        <EmptyState
          title="No groups yet"
          description="Create a group or join one with an invite code to grow together"
          action={{
            label: "Create Your First Group",
            onClick: () => setCreateDialogOpen(true),
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((group: any) => {
            const config = modeConfig[group.mode as keyof typeof modeConfig];
            const Icon = config.icon;

            return (
              <div
                key={group._id}
                className="glass-strong group relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-6 transition-all hover:border-white/10 hover:bg-white/10"
              >
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
                      {config.label}
                    </span>
                  </div>

                  <h3 className="mb-1 font-display text-xl font-bold">{group.name}</h3>
                  <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
                    {group.description || "No description"}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>Members</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Icon className="h-3 w-3" />
                      <span>{config.label} mode</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/groups/${group._id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        View Group
                      </Button>
                    </Link>
                    <button
                      onClick={() => leaveMutation.mutate(group._id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-muted-foreground transition-all hover:bg-red-500/20 hover:text-red-500"
                      title="Leave group"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
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
            <h2 className="text-lg font-bold mb-4">Create Group</h2>
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
            <h2 className="text-lg font-bold mb-4">Join Group</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Invite Code</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-character code"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-[#4ecdc4] outline-none text-center text-lg font-mono tracking-widest uppercase"
                  maxLength={6}
                />
              </div>

              <Button
                onClick={handleLookup}
                disabled={inviteCode.length !== 6 || lookingUp}
                className="w-full"
                variant="outline"
              >
                {lookingUp ? "Looking up..." : "Lookup Group"}
              </Button>

              {lookupResult && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <h3 className="font-semibold mb-1">{lookupResult.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {lookupResult.description || "No description"}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {lookupResult.memberCount} members
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 ${
                      lookupResult.mode === "together"
                        ? "bg-[#ff6b6b]/20 text-[#ff6b6b] border-[#ff6b6b]/30"
                        : "bg-[#4ecdc4]/20 text-[#4ecdc4] border-[#4ecdc4]/30"
                    }`}>
                      {modeConfig[lookupResult.mode as keyof typeof modeConfig].label}
                    </span>
                  </div>
                  <Button
                    onClick={() => joinMutation.mutate({ inviteCode: inviteCode.trim().toUpperCase() })}
                    disabled={joinMutation.isPending}
                    className="w-full mt-3 bg-gradient-to-r from-[#4ecdc4] to-[#a78bfa] text-white"
                  >
                    {joinMutation.isPending ? "Joining..." : "Join Group"}
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
                Cancel
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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"together" | "share">("together");

  const createMutation = useMutation({
    mutationFn: orpc.groups.create.mutate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.groups.listMy.queryKey() });
      toast.success("Group created! 🎉");
      onSuccess();
    },
    onError: () => toast.error("Failed to create group"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name, description, mode });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Group Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Growth Group"
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-[#4ecdc4] outline-none"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this group about?"
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-[#4ecdc4] outline-none resize-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Group Mode *</label>
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
                    : "border-white/10 bg-white/5 hover:border-white/20"
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
                  <span className="text-sm font-medium">{config.label}</span>
                  <span className="text-xs text-muted-foreground">{config.description}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-gradient-to-r from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-white"
          disabled={createMutation.isPending || !name.trim()}
        >
          {createMutation.isPending ? "Creating..." : "Create Group"}
        </Button>
      </div>
    </form>
  );
}
