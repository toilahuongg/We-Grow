"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client, orpc } from "@/utils/orpc";

const EMOJIS = [
  { key: "fire", display: "\uD83D\uDD25" },
  { key: "clap", display: "\uD83D\uDC4F" },
  { key: "heart", display: "\u2764\uFE0F" },
  { key: "star", display: "\u2B50" },
  { key: "muscle", display: "\uD83D\uDCAA" },
] as const;

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

  return (
    <div className="flex flex-wrap gap-1">
      {EMOJIS.map(({ key, display }) => {
        const count = localCounts[key] ?? 0;
        const isActive = localMyReactions.includes(key);

        if (count === 0 && !isActive) {
          return (
            <button
              key={key}
              onClick={() => toggleMutation.mutate(key)}
              disabled={toggleMutation.isPending}
              className="flex h-6 w-6 items-center justify-center rounded-full text-xs opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity duration-200"
            >
              {display}
            </button>
          );
        }

        return (
          <button
            key={key}
            onClick={() => toggleMutation.mutate(key)}
            disabled={toggleMutation.isPending}
            className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs transition-all duration-150 active:scale-90 ${
              isActive
                ? "bg-[#4ecdc4]/15 text-[#4ecdc4]"
                : "bg-overlay-subtle text-muted-foreground hover:bg-overlay-medium"
            }`}
          >
            <span className="text-[11px]">{display}</span>
            <span className="text-[10px] font-medium tabular-nums">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
