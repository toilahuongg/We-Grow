"use client";

import { Flame } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

interface StreakBadgeProps {
  count: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function StreakBadge({ count, size = "md", showLabel = true, className }: StreakBadgeProps) {
  const t = useTranslations("habitDetail");

  const sizeStyles = {
    sm: {
      container: "px-2 py-0.5 gap-1",
      icon: "h-3 w-3",
      text: "text-xs",
    },
    md: {
      container: "px-2.5 py-1 gap-1.5",
      icon: "h-4 w-4",
      text: "text-sm",
    },
    lg: {
      container: "px-3 py-1.5 gap-2",
      icon: "h-5 w-5",
      text: "text-base",
    },
  };

  const styles = sizeStyles[size];

  // Determine if streak is impressive (7+ days)
  const isImpressive = count >= 7;
  const colorVariant = isImpressive
    ? "bg-gradient-to-r from-[#ff6b6b]/20 to-[#ffa06b]/20 text-[#ff6b6b] border-[#ff6b6b]/30"
    : "bg-white/5 text-muted-foreground border-white/10";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border",
        styles.container,
        colorVariant,
        className
      )}
    >
      <Flame className={cn(styles.icon, isImpressive ? "text-[#ff6b6b]" : "")} />
      <span className={cn("font-semibold", styles.text)}>{count}</span>
      {showLabel && <span className={cn("text-xs font-medium", styles.text)}>{t("dayStreak")}</span>}
    </div>
  );
}
