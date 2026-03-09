import React from "react";

interface RankIconProps {
  level: number;
  className?: string;
  size?: number;
}

export const RankIcon: React.FC<RankIconProps> = ({ level, className = "", size = 48 }) => {
  // Determine rank category
  const isGeneral = level >= 15;
  const isOfficer = level >= 7 && level <= 14;
  const isNCO = level >= 4 && level <= 6;
  const isRecruit = level <= 3;

  // Stars count
  let stars = 0;
  if (level === 2) stars = 0; // Private Second Class - no stars, simple bar
  if (level === 3) stars = 1; // Private First Class
  
  if (isNCO) stars = level - 3; // 4:1, 5:2, 6:3
  
  if (level >= 7 && level <= 10) stars = level - 6; // 7:1, 8:2, 9:3, 10:4
  if (level >= 11 && level <= 14) stars = level - 10; // 11:1, 12:2, 13:3, 14:4
  if (level >= 15) stars = level - 14; // 15:1, 16:2, 17:3, 18:4

  // Colors
  const baseColor = level >= 15 ? "#FCD34D" : (level >= 7 ? "#FBBF24" : "#D1D5DB");
  const accentColor = level >= 15 ? "#B45309" : (level >= 7 ? "#92400E" : "#4B5563");
  const starColor = "#FDE68A";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background Glow */}
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>

      {/* Main Badge Shape (Hexagon) */}
      <path
        d="M50 5L85 25V75L50 95L15 75V25L50 5Z"
        fill={level >= 7 ? "url(#goldGrad)" : "#4B5563"}
        stroke={accentColor}
        strokeWidth="2"
      />

      {/* Ornaments for Higher Ranks */}
      {isGeneral && (
        <path
          d="M10 70L0 50L10 30 M90 70L100 50L90 30"
          stroke="url(#goldGrad)"
          strokeWidth="4"
          strokeLinecap="round"
        />
      )}
      
      {isOfficer && !isGeneral && (
        <path
          d="M20 75L10 60 M80 75L90 60"
          stroke={baseColor}
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}

      {/* Chevrons for NCOs */}
      {isNCO && (
        <g stroke={starColor} strokeWidth="4" strokeLinecap="round">
          <path d="M30 70L50 85L70 70" />
          {level >= 5 && <path d="M30 75L50 90L70 75" />}
          {level >= 6 && <path d="M30 80L50 95L70 80" />}
        </g>
      )}

      {/* Bars for Low Ranks */}
      {isRecruit && (
         <g stroke={starColor} strokeWidth="6" strokeLinecap="round">
            <path d="M30 80H70" />
            {level >= 2 && <path d="M30 70H70" />}
            {level >= 3 && <path d="M30 60H70" />}
         </g>
      )}

      {/* Stars */}
      {stars > 0 && (
        <g filter="url(#glow)">
          {stars === 1 && <Star x={50} y={50} size={25} color={starColor} />}
          {stars === 2 && (
            <>
              <Star x={35} y={50} size={20} color={starColor} />
              <Star x={65} y={50} size={20} color={starColor} />
            </>
          )}
          {stars === 3 && (
            <>
              <Star x={50} y={35} size={18} color={starColor} />
              <Star x={30} y={60} size={18} color={starColor} />
              <Star x={70} y={60} size={18} color={starColor} />
            </>
          )}
          {stars === 4 && (
            <>
              <Star x={50} y={30} size={16} color={starColor} />
              <Star x={50} y={70} size={16} color={starColor} />
              <Star x={30} y={50} size={16} color={starColor} />
              <Star x={70} y={50} size={16} color={starColor} />
            </>
          )}
        </g>
      )}
    </svg>
  );
};

const Star = ({ x, y, size, color }: { x: number; y: number; size: number; color: string }) => {
  const points = [];
  const outerRadius = size;
  const innerRadius = size / 2.5;
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    points.push(`${x + radius * Math.cos(angle)},${y + radius * Math.sin(angle)}`);
  }
  return <polygon points={points.join(" ")} fill={color} />;
};
