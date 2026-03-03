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

const typeConfig: Record<string, {
  icon: string;
  gradient: string;
  ringColor: string;
  accentBg: string;
  accentBorder: string;
}> = {
  habit_completed: {
    icon: "\u2705",
    gradient: "from-[#4ecdc4] to-[#2ab7ad]",
    ringColor: "ring-[#4ecdc4]/40",
    accentBg: "bg-[#4ecdc4]/[0.06]",
    accentBorder: "border-[#4ecdc4]/10 hover:border-[#4ecdc4]/25",
  },
  streak_milestone: {
    icon: "\uD83D\uDD25",
    gradient: "from-[#ff6b6b] to-[#ffa06b]",
    ringColor: "ring-[#ff6b6b]/40",
    accentBg: "bg-[#ff6b6b]/[0.06]",
    accentBorder: "border-[#ff6b6b]/10 hover:border-[#ff6b6b]/25",
  },
  level_up: {
    icon: "\u2B50",
    gradient: "from-[#ffd700] to-[#ffaa00]",
    ringColor: "ring-[#ffd700]/40",
    accentBg: "bg-[#ffd700]/[0.06]",
    accentBorder: "border-[#ffd700]/10 hover:border-[#ffd700]/25",
  },
  all_habits_completed: {
    icon: "\uD83C\uDF89",
    gradient: "from-[#a78bfa] to-[#f472b6]",
    ringColor: "ring-[#a78bfa]/40",
    accentBg: "bg-[#a78bfa]/[0.06]",
    accentBorder: "border-[#a78bfa]/10 hover:border-[#a78bfa]/25",
  },
  member_joined: {
    icon: "\uD83D\uDC4B",
    gradient: "from-[#60a5fa] to-[#818cf8]",
    ringColor: "ring-[#60a5fa]/40",
    accentBg: "bg-[#60a5fa]/[0.06]",
    accentBorder: "border-[#60a5fa]/10 hover:border-[#60a5fa]/25",
  },
};

const defaultConfig = {
  icon: "",
  gradient: "from-[#ffa06b] to-[#f472b6]",
  ringColor: "ring-white/20",
  accentBg: "bg-white/[0.03]",
  accentBorder: "border-white/5 hover:border-white/15",
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
  index?: number;
}

export function ActivityItem({ activity, groupId, index = 0 }: ActivityItemProps) {
  const t = useTranslations("feed");
  const config = typeConfig[activity.type] ?? defaultConfig;

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
    <div
      className={`group flex gap-3.5 rounded-2xl border p-4 transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg hover:shadow-black/10 ${config.accentBg} ${config.accentBorder}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Avatar with type-colored ring */}
      <div className="relative shrink-0">
        <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${config.gradient} text-white text-sm font-semibold ring-2 ${config.ringColor} transition-shadow duration-300 group-hover:ring-4`}>
          {activity.userImage ? (
            <img src={activity.userImage} alt="" className="h-11 w-11 rounded-full object-cover" />
          ) : (
            getInitials(activity.userName)
          )}
        </div>
        {/* Type icon badge */}
        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--background)] text-xs shadow-sm">
          {config.icon}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed">{getMessage()}</p>
        <p className="text-[11px] text-muted-foreground mt-1.5 font-medium uppercase tracking-wide">
          {timeAgo(new Date(activity.createdAt), t)}
        </p>
        <div className="mt-2.5">
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
