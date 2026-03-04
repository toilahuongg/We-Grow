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

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function FireIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M12 2c0 0-4 5-4 9 0 2.5 1.5 4 4 4s4-1.5 4-4c0-4-4-9-4-9z" />
      <path d="M12 16c-1.5 0-2.5-.8-3-2 0 2.5 1.5 4 3 4s3-1.5 3-4c-.5 1.2-1.5 2-3 2z" opacity="0.5" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

function CelebrationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M2 22l5-5 2 2-5 5zm14-16l-2 2 3 3 2-2-3-3zm-3 3l-2 2 3 3 2-2-3-3zM5.5 11l-3 3 2 2 3-3-2-2zm13 6l-2 2 3 3 2-2-3-3zM12 2L9 5l2 2 3-3-2-2zm7.5 10l-3-3-2 2 3 3 2-2z" />
      <path d="M12 15c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3z" />
    </svg>
  );
}

function WaveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M12 18c-3.3 0-6-2.7-6-6 0-1.8.8-3.4 2-4.5M12 18c3.3 0 6-2.7 6-6 0-1.8-.8-3.4-2-4.5M12 2v20M2 12h4M18 12h4" />
    </svg>
  );
}

const typeIcons: Record<string, React.ReactNode> = {
  habit_completed: <CheckIcon />,
  streak_milestone: <FireIcon />,
  level_up: <StarIcon />,
  all_habits_completed: <CelebrationIcon />,
  member_joined: <WaveIcon />,
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
  const icon = typeIcons[activity.type];

  const getIconColor = () => {
    switch (activity.type) {
      case "habit_completed":
        return "text-green-500";
      case "streak_milestone":
        return "text-orange-500";
      case "level_up":
        return "text-yellow-500";
      case "all_habits_completed":
        return "text-purple-500";
      case "member_joined":
        return "text-blue-500";
      default:
        return "text-muted-foreground";
    }
  };

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
            <span className={`leading-none mt-0.5 shrink-0 ${getIconColor()}`}>{icon}</span>
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
          {/* <ReactionBar
            activityId={activity._id}
            groupId={groupId}
            reactionCounts={activity.reactionCounts}
            myReactions={activity.myReactions}
          /> */}
        </div>
      </div>
    </div>
  );
}
