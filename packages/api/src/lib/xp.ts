export const XP_REWARDS = {
  HABIT_COMPLETION: 10,
  STREAK_7_DAY: 50,
  STREAK_30_DAY: 200,
  STREAK_100_DAY: 500,
  ALL_DAILY_HABITS: 20,
} as const;

export function xpForLevel(level: number): number {
  return (100 * level * (level + 1)) / 2;
}

export function getLevelFromXp(totalXp: number): number {
  let level = 1;
  while (xpForLevel(level) <= totalXp) {
    level++;
  }
  return level;
}

export function getProgressToNextLevel(totalXp: number): {
  currentLevel: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressXp: number;
} {
  const currentLevel = getLevelFromXp(totalXp);
  const currentLevelXp = xpForLevel(currentLevel - 1);
  const nextLevelXp = xpForLevel(currentLevel);
  return {
    currentLevel,
    currentLevelXp,
    nextLevelXp,
    progressXp: totalXp - currentLevelXp,
  };
}
