"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client, orpc } from "@/utils/orpc";

const REACTIONS = [
  { key: "fire", icon: <FireIcon /> },
  { key: "clap", icon: <ClapIcon /> },
  { key: "heart", icon: <HeartIcon /> },
  { key: "star", icon: <StarIcon /> },
  { key: "muscle", icon: <MuscleIcon /> },
] as const;

function FireIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
      <path d="M12 2c0 0-4 5-4 9 0 2.5 1.5 4 4 4s4-1.5 4-4c0-4-4-9-4-9z" />
      <path d="M12 16c-1.5 0-2.5-.8-3-2 0 2.5 1.5 4 3 4s3-1.5 3-4c-.5 1.2-1.5 2-3 2z" opacity="0.5" />
    </svg>
  );
}

function ClapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
      <path d="M11.5 2v9h1V2h-1zm-3 3v6h1V5h-1zm6 0v6h1V5h-1z" />
      <path d="M16 12c0-3-2-5-5-5h-1c-3 0-5 2-5 5v3c0 1.7 1.3 3 3 3h1v4h3v-4h1c1.7 0 3-1.3 3-3v-3z" />
      <path d="M9 13c-.6 0-1 .4-1 1s.4 1 1 1 1-.4 1-1-.4-1-1-1z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

function MuscleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
      <path d="M18.5 8c-1.3 0-2.4.8-2.8 2-.6-1.2-1.9-2-3.2-2-1.7 0-3.2 1.3-3.5 3-.3-1.7-1.8-3-3.5-3C3.1 8 1.5 9.6 1.5 11.5c0 1.3.6 2.4 1.5 3.1V20c0 1.1.9 2 2 2h3c1.1 0 2-.9 2-2v-5h4v5c0 1.1.9 2 2 2h3c1.1 0 2-.9 2-2v-5.4c.9-.7 1.5-1.8 1.5-3.1 0-1.9-1.6-3.5-3.5-3.5z" />
    </svg>
  );
}

interface ReactionBarProps {
  activityId: string;
  groupId: string;
  reactionCounts: Record<string, number>;
  myReactions: string[];
}

export function ReactionBar({ activityId, groupId, reactionCounts, myReactions }: ReactionBarProps) {
  const queryClient = useQueryClient();
  const [localCounts, setLocalCounts] = useState(reactionCounts);
  const [localMyReactions, setLocalMyReactions] = useState(myReactions);

  // Sync from server data when props change
  useEffect(() => {
    setLocalCounts(reactionCounts);
    setLocalMyReactions(myReactions);
  }, [reactionCounts, myReactions]);

  const toggleMutation = useMutation({
    mutationFn: (emoji: "fire" | "clap" | "heart" | "star" | "muscle") =>
      client.feed.toggleReaction({ activityId, emoji }),
    onMutate: async (emoji) => {
      const prevCounts = localCounts;
      const prevMyReactions = localMyReactions;
      const isAdding = !localMyReactions.includes(emoji);

      const newCounts = { ...localCounts };
      newCounts[emoji] = (newCounts[emoji] ?? 0) + (isAdding ? 1 : -1);
      if (newCounts[emoji] !== undefined && newCounts[emoji] <= 0) delete newCounts[emoji];

      setLocalCounts(newCounts);
      setLocalMyReactions(
        isAdding
          ? [...localMyReactions, emoji]
          : localMyReactions.filter((e) => e !== emoji),
      );

      return { prevCounts, prevMyReactions };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        setLocalCounts(context.prevCounts);
        setLocalMyReactions(context.prevMyReactions);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: orpc.feed.getGroupFeed.queryOptions({ input: { groupId } }).queryKey,
        exact: false,
      });
    },
  });

  const hasAnyReaction = Object.keys(localCounts).length > 0 || localMyReactions.length > 0;

  return (
    <div className="group flex flex-wrap gap-1">
      {REACTIONS.map(({ key, icon }) => {
        const count = localCounts[key] ?? 0;
        const isActive = localMyReactions.includes(key);

        // Reactions with counts or active - always visible
        if (count > 0 || isActive) {
          return (
            <button
              key={key}
              onClick={() => toggleMutation.mutate(key)}
              disabled={toggleMutation.isPending}
              className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs transition-all duration-150 active:scale-90 ${
                isActive
                  ? "bg-[#4ecdc4]/15 text-[#4ecdc4]"
                  : "bg-overlay-subtle text-muted-foreground hover:bg-overlay-medium hover:text-foreground"
              }`}
            >
              <span className="text-[11px]">{icon}</span>
              <span className="text-[10px] font-medium tabular-nums">{count}</span>
            </button>
          );
        }

        // Empty reactions - show on hover only, and only if there's already some activity
        return (
          <button
            key={key}
            onClick={() => toggleMutation.mutate(key)}
            disabled={toggleMutation.isPending}
            className={`flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/30 hover:text-[#4ecdc4] transition-all duration-200 ${
              hasAnyReaction ? "opacity-0 group-hover:opacity-100" : "opacity-40 hover:opacity-100"
            }`}
            title={key}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
