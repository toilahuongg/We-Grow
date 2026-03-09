export interface LevelInfo {
  level: number;
  icon: string;
  nameVi: string;
  nameEn: string;
}

const LEVEL_INFO: LevelInfo[] = [
  { level: 1, icon: "rank-1", nameVi: "Tân binh", nameEn: "Recruit" },
  { level: 2, icon: "rank-2", nameVi: "Binh nhì", nameEn: "Private Second Class" },
  { level: 3, icon: "rank-3", nameVi: "Binh nhất", nameEn: "Private First Class" },
  { level: 4, icon: "rank-4", nameVi: "Hạ sĩ", nameEn: "Corporal" },
  { level: 5, icon: "rank-5", nameVi: "Trung sĩ", nameEn: "Sergeant" },
  { level: 6, icon: "rank-6", nameVi: "Thượng sĩ", nameEn: "Staff Sergeant" },
  { level: 7, icon: "rank-7", nameVi: "Thiếu úy", nameEn: "Second Lieutenant" },
  { level: 8, icon: "rank-8", nameVi: "Trung úy", nameEn: "First Lieutenant" },
  { level: 9, icon: "rank-9", nameVi: "Thượng úy", nameEn: "Captain" },
  { level: 10, icon: "rank-10", nameVi: "Đại úy", nameEn: "Senior Captain" },
  { level: 11, icon: "rank-11", nameVi: "Thiếu tá", nameEn: "Major" },
  { level: 12, icon: "rank-12", nameVi: "Trung tá", nameEn: "Lieutenant Colonel" },
  { level: 13, icon: "rank-13", nameVi: "Thượng tá", nameEn: "Senior Colonel" },
  { level: 14, icon: "rank-14", nameVi: "Đại tá", nameEn: "Colonel" },
  { level: 15, icon: "rank-15", nameVi: "Thiếu tướng", nameEn: "Major General" },
  { level: 16, icon: "rank-16", nameVi: "Trung tướng", nameEn: "Lieutenant General" },
  { level: 17, icon: "rank-17", nameVi: "Thượng tướng", nameEn: "Senior General" },
  { level: 18, icon: "rank-18", nameVi: "Đại tướng", nameEn: "General" },
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
  if (level <= 18) {
    return LEVEL_INFO[level - 1] ?? LEVEL_INFO[0]!;
  }
  const tier = level - 18;
  return {
    level,
    icon: "rank-18",
    nameVi: `Đại tướng ${toRoman(tier)}`,
    nameEn: `General ${toRoman(tier)}`,
  };
}

export function getAllLevelInfos(): LevelInfo[] {
  return [...LEVEL_INFO];
}
