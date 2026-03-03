import { cn } from "@/lib/utils";
import { getLevelInfo } from "@/lib/level-utils";
import { useLocale } from "next-intl";

interface LevelProgressProps {
  current: number;
  next: number;
  level: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LevelProgress({ current, next, level, size = "md", className }: LevelProgressProps) {
  const locale = useLocale();
  const progress = next > 0 ? (current / next) * 100 : 0;
  const info = getLevelInfo(level);
  const levelName = locale === "vi" ? info.nameVi : info.nameEn;

  const sizeStyles = {
    sm: {
      container: "h-1.5",
      icon: "text-sm",
      text: "text-xs",
    },
    md: {
      container: "h-2",
      icon: "text-base",
      text: "text-sm",
    },
    lg: {
      container: "h-3",
      icon: "text-lg",
      text: "text-base",
    },
  };

  const styles = sizeStyles[size];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={styles.icon}>{info.icon}</span>
          <span className={cn("font-semibold", styles.text)}>{levelName}</span>
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
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}
