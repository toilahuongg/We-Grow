import { Trophy } from "lucide-react";

import { cn } from "@/lib/utils";

interface LevelProgressProps {
  current: number;
  next: number;
  level: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LevelProgress({ current, next, level, size = "md", className }: LevelProgressProps) {
  const progress = ((current % 1000) / 1000) * 100;

  const sizeStyles = {
    sm: {
      container: "h-1.5",
      icon: "h-3 w-3",
      text: "text-xs",
    },
    md: {
      container: "h-2",
      icon: "h-4 w-4",
      text: "text-sm",
    },
    lg: {
      container: "h-3",
      icon: "h-5 w-5",
      text: "text-base",
    },
  };

  const styles = sizeStyles[size];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff6b6b] to-[#ffa06b]">
            <Trophy className={cn("text-white", styles.icon)} />
          </div>
          <span className={cn("font-semibold", styles.text)}>Level {level}</span>
        </div>
        <span className={cn("text-muted-foreground", styles.text)}>
          {current} / {next} XP
        </span>
      </div>
      <div className="w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            styles.container,
            "rounded-full bg-gradient-to-r from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] transition-all duration-500 progress-glow"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
