"use client";

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

  const toggleMutation = useMutation({
    mutationFn: (emoji: "fire" | "clap" | "heart" | "star" | "muscle") =>
      client.feed.toggleReaction({ activityId, emoji }),
    onMutate: async (emoji) => {
      await queryClient.cancelQueries({ queryKey: orpc.feed.getGroupFeed.queryOptions({ input: { groupId } }).queryKey });
      const queryKey = orpc.feed.getGroupFeed.queryOptions({ input: { groupId } }).queryKey;
      const previous = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          activities: old.activities.map((a: any) => {
            if (a._id !== activityId) return a;
            const isAdding = !a.myReactions.includes(emoji);
            const counts = { ...a.reactionCounts };
            counts[emoji] = (counts[emoji] ?? 0) + (isAdding ? 1 : -1);
            if (counts[emoji] <= 0) delete counts[emoji];
            return {
              ...a,
              reactionCounts: counts,
              myReactions: isAdding
                ? [...a.myReactions, emoji]
                : a.myReactions.filter((e: string) => e !== emoji),
            };
          }),
        };
      });

      return { previous };
    },
    onError: (_error, _variables, context) => {
      const queryKey = orpc.feed.getGroupFeed.queryOptions({ input: { groupId } }).queryKey;
      queryClient.setQueryData(queryKey, context?.previous);
    },
  });

  return (
    <div className="flex flex-wrap gap-1.5">
      {EMOJIS.map(({ key, display }) => {
        const count = reactionCounts[key] ?? 0;
        const isActive = myReactions.includes(key);

        return (
          <button
            key={key}
            onClick={() => toggleMutation.mutate(key)}
            disabled={toggleMutation.isPending}
            className={`group/reaction flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm transition-all duration-200 ${
              isActive
                ? "bg-[#4ecdc4]/20 border border-[#4ecdc4]/40 shadow-[0_0_8px_rgba(78,205,196,0.15)]"
                : "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/15"
            } active:scale-90 hover:scale-105`}
          >
            <span className="transition-transform duration-200 group-hover/reaction:scale-110">
              {display}
            </span>
            {count > 0 && (
              <span className={`font-medium text-xs tabular-nums ${isActive ? "text-[#4ecdc4]" : "text-muted-foreground"}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
