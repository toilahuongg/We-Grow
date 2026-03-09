export interface LevelInfo {
  level: number;
  icon: string;
  nameVi: string;
  nameEn: string;
}

const LEVEL_INFO: LevelInfo[] = [
  { level: 1, icon: "/badges/badge-1.png", nameVi: "Tân binh", nameEn: "Recruit" },
  { level: 2, icon: "/badges/badge-2.png", nameVi: "Binh nhì", nameEn: "Private Second Class" },
  { level: 3, icon: "/badges/badge-3.png", nameVi: "Binh nhất", nameEn: "Private First Class" },
  { level: 4, icon: "/badges/badge-4.png", nameVi: "Hạ sĩ", nameEn: "Corporal" },
  { level: 5, icon: "/badges/badge-5.png", nameVi: "Trung sĩ", nameEn: "Sergeant" },
  { level: 6, icon: "/badges/badge-6.png", nameVi: "Thượng sĩ", nameEn: "Staff Sergeant" },
  { level: 7, icon: "/badges/badge-7.png", nameVi: "Thiếu úy", nameEn: "Second Lieutenant" },
  { level: 8, icon: "/badges/badge-8.png", nameVi: "Trung úy", nameEn: "First Lieutenant" },
  { level: 9, icon: "/badges/badge-9.png", nameVi: "Thượng úy", nameEn: "Captain" },
  { level: 10, icon: "/badges/badge-10.png", nameVi: "Đại úy", nameEn: "Senior Captain" },
  { level: 11, icon: "/badges/badge-11.png", nameVi: "Thiếu tá", nameEn: "Major" },
  { level: 12, icon: "/badges/badge-12.png", nameVi: "Trung tá", nameEn: "Lieutenant Colonel" },
  { level: 13, icon: "/badges/badge-13.png", nameVi: "Thượng tá", nameEn: "Senior Colonel" },
  { level: 14, icon: "/badges/badge-14.png", nameVi: "Đại tá", nameEn: "Colonel" },
  { level: 15, icon: "/badges/badge-15.png", nameVi: "Thiếu tướng", nameEn: "Major General" },
  { level: 16, icon: "/badges/badge-16.png", nameVi: "Trung tướng", nameEn: "Lieutenant General" },
  { level: 17, icon: "/badges/badge-17.png", nameVi: "Thượng tướng", nameEn: "Senior General" },
  { level: 18, icon: "/badges/badge-18.png", nameVi: "Đại tướng", nameEn: "General" },
  { level: 19, icon: "/badges/badge-19.png", nameVi: "Thống tướng", nameEn: "Grand General" },
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
  if (level <= 19) {
    return LEVEL_INFO[level - 1] ?? LEVEL_INFO[0]!;
  }
  const tier = level - 19;
  return {
    level,
    icon: "/badges/badge-19.png",
    nameVi: `Thống tướng ${toRoman(tier)}`,
    nameEn: `Grand General ${toRoman(tier)}`,
  };
}

export function getAllLevelInfos(): LevelInfo[] {
  return [...LEVEL_INFO];
}
