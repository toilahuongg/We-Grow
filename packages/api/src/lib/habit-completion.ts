import {
  Habit,
  HabitCompletion,
  UserProfile,
  UserBadge,
  XpTransaction,
} from "@we-grow/db/models/index";
import { generateId } from "@we-grow/db/utils/id";

import { XP_REWARDS, getLevelFromXp } from "./xp";
import { createActivity, createActivityForUserGroups } from "./activity";

function getDateStr(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return getDateStr(d);
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return getDateStr(d);
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + "T00:00:00Z").getUTCDay();
}

async function calculateStreak(
  habit: InstanceType<typeof Habit>,
  completionDate: string,
): Promise<number> {
  if (habit.frequency === "daily") {
    const yesterday = addDays(completionDate, -1);
    if (habit.lastCompletedDate === yesterday) {
      return (habit.currentStreak ?? 0) + 1;
    }
    if (habit.lastCompletedDate === completionDate) {
      return habit.currentStreak ?? 1;
    }
    return 1;
  }

  if (habit.frequency === "weekly") {
    const thisWeekStart = getWeekStart(completionDate);
    const thisWeekEnd = addDays(thisWeekStart, 6);
    const completionsThisWeek = await (HabitCompletion as any).countDocuments({
      habitId: habit._id,
      userId: habit.userId,
      date: { $gte: thisWeekStart, $lte: thisWeekEnd },
    });

    if (completionsThisWeek >= (habit.weeklyTarget ?? 1)) {
      const lastWeekStart = addDays(thisWeekStart, -7);
      const lastWeekEnd = addDays(lastWeekStart, 6);
      const completionsLastWeek = await (HabitCompletion as any).countDocuments({
        habitId: habit._id,
        userId: habit.userId,
        date: { $gte: lastWeekStart, $lte: lastWeekEnd },
      });

      if (completionsLastWeek >= (habit.weeklyTarget ?? 1)) {
        return (habit.currentStreak ?? 0) + 1;
      }
      return 1;
    }
    return habit.currentStreak ?? 0;
  }

  if (habit.frequency === "specific_days") {
    const todayDow = getDayOfWeek(completionDate);
    const targetDays = habit.targetDays ?? [];

    if (!targetDays.includes(todayDow)) {
      return habit.currentStreak ?? 0;
    }

    const sortedDays = [...targetDays].sort((a, b) => a - b);
    const currentIdx = sortedDays.indexOf(todayDow);
    let prevDay: number;
    let daysBack: number;

    if (currentIdx === 0) {
      prevDay = sortedDays[sortedDays.length - 1]!;
      daysBack = ((todayDow - prevDay + 7) % 7) || 7;
    } else {
      prevDay = sortedDays[currentIdx - 1]!;
      daysBack = todayDow - prevDay;
    }

    const prevDate = addDays(completionDate, -daysBack);
    const prevCompletion = await (HabitCompletion as any).findOne({
      habitId: habit._id,
      userId: habit.userId,
      date: prevDate,
    });

    if (prevCompletion) {
      return (habit.currentStreak ?? 0) + 1;
    }
    return 1;
  }

  return 1;
}

async function awardXp(
  userId: string,
  amount: number,
  source: string,
  sourceId: string | null,
  description: string,
): Promise<{ previousLevel: number; newLevel: number; leveledUp: boolean }> {
  const now = new Date();
  await (XpTransaction as any).create({
    _id: generateId(),
    userId,
    amount,
    source,
    sourceId,
    description,
    createdAt: now,
    updatedAt: now,
  });
  let profile = await (UserProfile as any).findOne({ userId });
  let isNewProfile = false;
  if (!profile) {
    isNewProfile = true;
    profile = await (UserProfile as any).create({
      _id: generateId(),
      userId,
      totalXp: 0,
      level: 1,
      onboardingCompleted: false,
      createdAt: now,
      updatedAt: now,
    });
  }
  const previousLevel = profile.level ?? 1;
  profile.totalXp = (profile.totalXp ?? 0) + amount;
  profile.level = getLevelFromXp(profile.totalXp);
  profile.updatedAt = now;
  await profile.save();

  const newLevel = profile.level ?? 1;

  if (isNewProfile) {
    await (UserBadge as any).create({
      _id: generateId(),
      userId,
      badgeType: "level",
      badgeKey: "level_1",
      level: 1,
      awardedAt: now,
      createdAt: now,
      updatedAt: now,
    }).catch(() => {/* ignore duplicate */});
  }

  if (newLevel > previousLevel) {
    for (let lvl = previousLevel + 1; lvl <= newLevel; lvl++) {
      await (UserBadge as any).create({
        _id: generateId(),
        userId,
        badgeType: "level",
        badgeKey: `level_${lvl}`,
        level: lvl,
        awardedAt: now,
        createdAt: now,
        updatedAt: now,
      }).catch(() => {/* ignore duplicate */});
    }
  }

  return { previousLevel, newLevel, leveledUp: newLevel > previousLevel };
}

async function checkStreakBonuses(
  userId: string,
  habitId: string,
  streak: number,
  date: string,
) {
  if (streak === 7) {
    await awardXp(userId, XP_REWARDS.STREAK_7_DAY, "streak_bonus", habitId, `7-day streak bonus [${date}]`);
  } else if (streak === 30) {
    await awardXp(userId, XP_REWARDS.STREAK_30_DAY, "streak_bonus", habitId, `30-day streak bonus [${date}]`);
  } else if (streak === 100) {
    await awardXp(userId, XP_REWARDS.STREAK_100_DAY, "streak_bonus", habitId, `100-day streak bonus [${date}]`);
  }
}

async function checkAllHabitsBonus(userId: string, date: string) {
  const activeHabits = await (Habit as any).find({ userId, archived: false, frequency: "daily" });
  if (activeHabits.length === 0) return;

  const completedCount = await (HabitCompletion as any).countDocuments({
    userId,
    date,
    habitId: { $in: activeHabits.map((h: { _id: unknown }) => h._id) },
  });

  if (completedCount === activeHabits.length) {
    const alreadyAwarded = await (XpTransaction as any).findOne({
      userId,
      source: "all_habits_bonus",
      description: `All daily habits completed [${date}]`,
    });
    if (!alreadyAwarded) {
      await awardXp(userId, XP_REWARDS.ALL_DAILY_HABITS, "all_habits_bonus", null, `All daily habits completed [${date}]`);
    }
  }
}

export interface HabitCompletionResult {
  success: boolean;
  alreadyCompleted: boolean;
  streak: number;
  xpAwarded?: number;
  leveledUp?: boolean;
  newLevel?: number;
  habitTitle?: string;
}

export async function completeHabitForUser(
  userId: string,
  habitId: string,
  date?: string,
  note?: string,
): Promise<HabitCompletionResult> {
  const completionDate = date ?? getDateStr(new Date());
  const now = new Date();

  const habit = await (Habit as any).findOne({ _id: habitId, userId });
  if (!habit) {
    throw new Error("Habit not found");
  }

  const existing = await (HabitCompletion as any).findOne({
    habitId,
    userId,
    date: completionDate,
  });
  if (existing) {
    return {
      success: true,
      alreadyCompleted: true,
      streak: habit.currentStreak ?? 0,
      habitTitle: habit.title as string,
    };
  }

  await (HabitCompletion as any).create({
    _id: generateId(),
    habitId,
    userId,
    date: completionDate,
    note: note ?? null,
    createdAt: now,
    updatedAt: now,
  });

  const newStreak = await calculateStreak(habit, completionDate);
  habit.currentStreak = newStreak;
  habit.longestStreak = Math.max(habit.longestStreak ?? 0, newStreak);
  habit.lastCompletedDate = completionDate;
  habit.updatedAt = now;
  await habit.save();

  const habitIdStr = habit._id as string;
  await awardXp(userId, XP_REWARDS.HABIT_COMPLETION, "habit_completion", habitIdStr, `Completed habit: ${habit.title} [${completionDate}]`);
  await checkStreakBonuses(userId, habitIdStr, newStreak, completionDate);
  await checkAllHabitsBonus(userId, completionDate);

  const finalProfile = await (UserProfile as any).findOne({ userId });
  const finalLevel = finalProfile?.level ?? 1;
  const xpBeforeAll = (finalProfile?.totalXp ?? 0) - XP_REWARDS.HABIT_COMPLETION;
  const levelBeforeAll = getLevelFromXp(Math.max(0, xpBeforeAll));

  // Create activity entries (non-blocking)
  if (habit.groupId) {
    createActivity(habit.groupId as string, userId, "habit_completed", {
      habitId: habitIdStr,
      habitTitle: habit.title,
      date: completionDate,
    });
    if (newStreak === 7 || newStreak === 30 || newStreak === 100) {
      createActivity(habit.groupId as string, userId, "streak_milestone", {
        habitId: habitIdStr,
        habitTitle: habit.title,
        streak: newStreak,
        date: completionDate,
      });
    }
  }
  if (finalLevel > levelBeforeAll) {
    createActivityForUserGroups(userId, "level_up", { level: finalLevel, date: completionDate });
  }

  return {
    success: true,
    alreadyCompleted: false,
    streak: newStreak,
    xpAwarded: XP_REWARDS.HABIT_COMPLETION,
    leveledUp: finalLevel > levelBeforeAll,
    newLevel: finalLevel,
    habitTitle: habit.title as string,
  };
}
