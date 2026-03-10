import { cn } from "@/lib/utils";
import { getLevelInfo } from "@/lib/level-utils";
import { useLocale } from "next-intl";
import { RankIcon } from "./rank-icon";

interface LevelProgressProps {
  current: number;
  next: number;
  level: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  gender?: string;
}

export function LevelProgress({ current, next, level, size = "md", className, gender = "male" }: LevelProgressProps) {
  const locale = useLocale();
  const progress = next > 0 ? (current / next) * 100 : 0;
  const info = getLevelInfo(level, gender);
  const levelName = locale === "vi" ? info.nameVi : info.nameEn;

  const sizeStyles = {
    sm: {
      container: "h-1.5",
      iconSize: 20,
      text: "text-xs",
    },
    md: {
      container: "h-2",
      iconSize: 28,
      text: "text-sm",
    },
    lg: {
      container: "h-3",
      iconSize: 40,
      text: "text-base",
    },
  };

  const styles = sizeStyles[size];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RankIcon level={level} gender={gender} size={styles.iconSize} />
          <span className={cn("font-semibold", styles.text)}>{levelName}</span>
        </div>
        <span className={cn("text-muted-foreground", styles.text)}>
          {current} / {next} XP
        </span>
      </div>
      <div className="w-full overflow-hidden rounded-full bg-overlay-medium">
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
