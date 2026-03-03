import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

interface XPBadgeProps {
  amount: number;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

export function XPBadge({ amount, size = "md", showIcon = true, className }: XPBadgeProps) {
  const sizeStyles = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-sm px-2.5 py-1 gap-1.5",
    lg: "text-base px-3 py-1.5 gap-2",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full bg-gradient-to-r from-[#ff6b6b]/20 via-[#ffa06b]/20 to-[#4ecdc4]/20 text-[#ff6b6b] font-semibold",
        sizeStyles[size],
        className
      )}
    >
      {showIcon && <Sparkles className="h-3 w-3" />}
      <span>+{amount} XP</span>
    </div>
  );
}
