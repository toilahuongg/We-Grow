"use client";

import { useTranslations } from "next-intl";
import { ReactionBar } from "./reaction-bar";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function timeAgo(date: Date, t: (key: string, values?: Record<string, any>) => string): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return t("justNow");
  if (diffMinutes < 60) return t("minutesAgo", { count: diffMinutes });
  if (diffHours < 24) return t("hoursAgo", { count: diffHours });
  return t("daysAgo", { count: diffDays });
}

const typeEmoji: Record<string, string> = {
  habit_completed: "\u2705",
  streak_milestone: "\uD83D\uDD25",
  level_up: "\u2B50",
  all_habits_completed: "\uD83C\uDF89",
  member_joined: "\uD83D\uDC4B",
};

const milestoneTypes = new Set(["streak_milestone", "level_up", "all_habits_completed"]);

interface ActivityItemProps {
  activity: {
    _id: string;
    type: string;
    userName: string;
    userImage: string | null;
    metadata: Record<string, any>;
    reactionCounts: Record<string, number>;
    myReactions: string[];
    createdAt: string;
  };
  groupId: string;
}

export function ActivityItem({ activity, groupId }: ActivityItemProps) {
  const t = useTranslations("feed");
  const isMilestone = milestoneTypes.has(activity.type);
  const emoji = typeEmoji[activity.type] ?? "";

  const getMessage = () => {
    const { type, metadata } = activity;
    switch (type) {
      case "habit_completed":
        return <><strong className="text-foreground">{activity.userName}</strong>{" "}{t("habitCompleted", { userName: "", habitTitle: metadata.habitTitle ?? "" }).trimStart()}</>;
      case "streak_milestone":
        return <><strong className="text-foreground">{activity.userName}</strong>{" "}{t("streakMilestone", { userName: "", streak: metadata.streak ?? 0 }).trimStart()}</>;
      case "level_up":
        return <><strong className="text-foreground">{activity.userName}</strong>{" "}{t("levelUp", { userName: "", level: metadata.level ?? 0 }).trimStart()}</>;
      case "all_habits_completed":
        return <><strong className="text-foreground">{activity.userName}</strong>{" "}{t("allHabitsCompleted", { userName: "" }).trimStart()}</>;
      case "member_joined":
        return <><strong className="text-foreground">{activity.userName}</strong>{" "}{t("memberJoined", { userName: "" }).trimStart()}</>;
      default:
        return <><strong className="text-foreground">{activity.userName}</strong> did something</>;
    }
  };

  return (
    <div className="relative flex gap-3 py-4 first:pt-0 last:pb-0">
      {/* Timeline connector */}
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-overlay-subtle first:top-5 last:bottom-auto" />

      {/* Avatar */}
      <div className="relative z-10 shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#ffa06b] to-[#f472b6] text-white text-xs font-semibold ring-4 ring-[var(--background)]">
          {activity.userImage ? (
            <img src={activity.userImage} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            getInitials(activity.userName)
          )}
        </div>
      </div>

      {/* Content card */}
      <div className="flex-1 min-w-0 -mt-0.5">
        {/* Message */}
        <div className={`rounded-2xl p-3.5 ${
          isMilestone
            ? "bg-gradient-to-r from-[#ff6b6b]/[0.08] via-[#ffa06b]/[0.06] to-transparent border border-overlay-medium"
            : "bg-overlay-subtle"
        }`}>
          <div className="flex items-start gap-2">
            <span className="text-base leading-none mt-0.5 shrink-0">{emoji}</span>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {getMessage()}
            </p>
          </div>
        </div>

        {/* Footer: time + reactions */}
        <div className="mt-2 flex items-center gap-3 pl-1">
          <span className="text-[11px] text-muted-foreground/60 shrink-0">
            {timeAgo(new Date(activity.createdAt), t)}
          </span>
          <ReactionBar
            activityId={activity._id}
            groupId={groupId}
            reactionCounts={activity.reactionCounts}
            myReactions={activity.myReactions}
          />
        </div>
      </div>
    </div>
  );
}
