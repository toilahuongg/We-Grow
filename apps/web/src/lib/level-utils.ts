export interface LevelInfo {
  level: number;
  icon: string;
  nameVi: string;
  nameEn: string;
}

const LEVEL_INFO: LevelInfo[] = [
  { level: 1, icon: "🌱", nameVi: "Hạt giống", nameEn: "Seed" },
  { level: 2, icon: "🌿", nameVi: "Mầm non", nameEn: "Sprout" },
  { level: 3, icon: "🪴", nameVi: "Cây con", nameEn: "Seedling" },
  { level: 4, icon: "🌳", nameVi: "Cây xanh", nameEn: "Young Tree" },
  { level: 5, icon: "🌲", nameVi: "Cây lớn", nameEn: "Mature Tree" },
  { level: 6, icon: "🏔️", nameVi: "Cổ thụ", nameEn: "Ancient Tree" },
  { level: 7, icon: "🌍", nameVi: "Rừng xanh", nameEn: "Forest" },
  { level: 8, icon: "⭐", nameVi: "Huyền thoại", nameEn: "Legend" },
  { level: 9, icon: "💎", nameVi: "Bất tử", nameEn: "Immortal" },
  { level: 10, icon: "👑", nameVi: "Thần thoại", nameEn: "Mythical" },
];

function toRoman(num: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
  let result = "";
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]!) {
      result += syms[i];
      num -= vals[i]!;
    }
  }
  return result;
}

export function getLevelInfo(level: number): LevelInfo {
  if (level <= 10) {
    return LEVEL_INFO[level - 1] ?? LEVEL_INFO[0]!;
  }
  const tier = level - 9;
  return {
    level,
    icon: "👑",
    nameVi: `Thần thoại ${toRoman(tier)}`,
    nameEn: `Mythical ${toRoman(tier)}`,
  };
}

export function getAllLevelInfos(): LevelInfo[] {
  return [...LEVEL_INFO];
}
