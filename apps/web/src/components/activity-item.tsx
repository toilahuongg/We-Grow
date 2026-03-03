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

const typeIcons: Record<string, string> = {
  habit_completed: "\u2705",
  streak_milestone: "\uD83D\uDD25",
  level_up: "\u2B50",
  all_habits_completed: "\uD83C\uDF89",
  member_joined: "\uD83D\uDC4B",
};

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

  const getMessage = () => {
    const { type, userName, metadata } = activity;
    switch (type) {
      case "habit_completed":
        return t("habitCompleted", { userName, habitTitle: metadata.habitTitle ?? "" });
      case "streak_milestone":
        return t("streakMilestone", { userName, streak: metadata.streak ?? 0 });
      case "level_up":
        return t("levelUp", { userName, level: metadata.level ?? 0 });
      case "all_habits_completed":
        return t("allHabitsCompleted", { userName });
      case "member_joined":
        return t("memberJoined", { userName });
      default:
        return `${userName} did something`;
    }
  };

  return (
    <div className="flex gap-3 rounded-xl border border-white/5 bg-white/5 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ffa06b] to-[#f472b6] text-white text-sm font-semibold">
        {activity.userImage ? (
          <img src={activity.userImage} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          getInitials(activity.userName)
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <span className="text-lg">{typeIcons[activity.type] ?? ""}</span>
          <p className="text-sm">{getMessage()}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {timeAgo(new Date(activity.createdAt), t)}
        </p>
        <div className="mt-2">
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
