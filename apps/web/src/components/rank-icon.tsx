import React from "react";
import { getLevelInfo } from "@/lib/level-utils";
import { cn } from "@/lib/utils";

interface RankIconProps {
  level: number;
  className?: string;
  size?: number;
}

export const RankIcon: React.FC<RankIconProps> = ({ level, className = "", size = 48 }) => {
  const info = getLevelInfo(level);
  
  return (
    <div 
      className={cn("relative flex items-center justify-center shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <img
        src={info.icon}
        alt={info.nameEn}
        width={size}
        height={size}
        className="object-contain drop-shadow-md"
      />
    </div>
  );
};
