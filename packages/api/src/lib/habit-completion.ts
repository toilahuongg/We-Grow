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
import { getToday, addDays, getWeekStart, getDayOfWeek } from "./date-utils";

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
    const completionsThisWeek = await HabitCompletion.countDocuments({
      habitId: habit._id,
      userId: habit.userId,
      date: { $gte: thisWeekStart, $lte: thisWeekEnd },
    });

    if (completionsThisWeek >= (habit.weeklyTarget ?? 1)) {
      const lastWeekStart = addDays(thisWeekStart, -7);
      const lastWeekEnd = addDays(lastWeekStart, 6);
      const completionsLastWeek = await HabitCompletion.countDocuments({
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
    const prevCompletion = await HabitCompletion.findOne({
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

/** Atomic XP award using $inc to prevent race conditions */
async function awardXp(
  userId: string,
  amount: number,
  source: string,
  sourceId: string | null,
  description: string,
): Promise<{ previousLevel: number; newLevel: number; leveledUp: boolean }> {
  const now = new Date();
  await XpTransaction.create({
    _id: generateId(),
    userId,
    amount,
    source,
    sourceId,
    description,
    createdAt: now,
    updatedAt: now,
  });

  // Use $inc for atomic increment — prevents race condition where concurrent
  // calls both read the same totalXp and overwrite each other
  const profile = await UserProfile.findOneAndUpdate(
    { userId },
    {
      $inc: { totalXp: amount },
      $set: { updatedAt: now },
      $setOnInsert: {
        _id: generateId(),
        userId,
        level: 1,
        createdAt: now,
      },
    },
    { upsert: true, new: true },
  );

  const newTotalXp = profile.totalXp ?? amount;
  const newLevel = getLevelFromXp(newTotalXp);
  const previousLevel = getLevelFromXp(Math.max(0, newTotalXp - amount));

  // Update level if changed
  if (newLevel !== (profile.level ?? 1)) {
    await UserProfile.updateOne({ userId }, { $set: { level: newLevel } });
  }

  // Award badges for each level gained
  if (newLevel > previousLevel) {
    for (let lvl = previousLevel + 1; lvl <= newLevel; lvl++) {
      await UserBadge.create({
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
  const activeHabits = await Habit.find({ userId, archived: false, frequency: "daily" });
  if (activeHabits.length === 0) return;

  const completedCount = await HabitCompletion.countDocuments({
    userId,
    date,
    habitId: { $in: activeHabits.map((h) => h._id) },
  });

  if (completedCount === activeHabits.length) {
    const alreadyAwarded = await XpTransaction.findOne({
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
  timezone?: string,
  count?: number,
): Promise<HabitCompletionResult> {
  const completionDate = date ?? getToday(timezone);
  const now = new Date();

  const habit = await Habit.findOne({ _id: habitId, userId });
  if (!habit) {
    throw new Error("Habit not found");
  }

  const countInc = count ?? 1;
  const targetPerDay = habit.targetPerDay ?? 1;

  const updateObj: any = {
    $inc: { completedCount: countInc },
    $set: { updatedAt: now },
    $setOnInsert: { _id: generateId(), createdAt: now },
  };
  if (note !== undefined) {
    updateObj.$set.note = note ?? null;
  }

  const completion = await HabitCompletion.findOneAndUpdate(
    { habitId, userId, date: completionDate },
    updateObj,
    { upsert: true, new: true },
  );

  const newCount = completion.completedCount ?? countInc;
  const oldCount = newCount - countInc;

  if (oldCount >= targetPerDay) {
    return {
      success: true,
      alreadyCompleted: true,
      streak: habit.currentStreak ?? 0,
      habitTitle: habit.title as string,
    };
  }

  if (newCount < targetPerDay) {
    return {
      success: true,
      alreadyCompleted: false,
      streak: habit.currentStreak ?? 0,
      xpAwarded: 0,
      leveledUp: false,
      habitTitle: habit.title as string,
    };
  }

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

  const finalProfile = await UserProfile.findOne({ userId });
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

/** Reverse XP for uncomplete — uses $inc for atomic decrement */
export async function reverseXp(
  userId: string,
  source: string,
  sourceId: string | null,
  date: string,
) {
  const query: Record<string, unknown> = { userId, source };
  if (sourceId !== null) {
    query.sourceId = sourceId;
  }

  // Match by date tag exclusively
  const transaction = await XpTransaction.findOne({
    ...query,
    description: { $regex: `\\[${date}\\]` },
  });

  if (!transaction) return;

  await XpTransaction.deleteOne({ _id: transaction._id });

  const amount = transaction.amount ?? 0;
  const profile = await UserProfile.findOneAndUpdate(
    { userId },
    {
      $inc: { totalXp: -amount },
      $set: { updatedAt: new Date() },
    },
    { new: true },
  );

  if (profile) {
    const newLevel = getLevelFromXp(Math.max(0, profile.totalXp ?? 0));
    if (newLevel !== (profile.level ?? 1)) {
      await UserProfile.updateOne({ userId }, { $set: { level: newLevel } });
    }
  }
}

/** Recalculate streak by fetching all completions at once instead of N sequential queries */
export async function recalculateStreakFromCompletions(
  habit: InstanceType<typeof Habit>,
): Promise<{ streak: number; lastDate: string | null }> {
  // Fetch all completions at once — fixes unbounded while(true) N+1 query issue
  const completions = await HabitCompletion.find({
    habitId: habit._id,
    userId: habit.userId,
  }).sort({ date: -1 }).lean();

  const targetPerDay = habit.targetPerDay ?? 1;
  const validCompletions = completions.filter((c) => (c.completedCount ?? 1) >= targetPerDay);

  if (validCompletions.length === 0) {
    return { streak: 0, lastDate: null };
  }

  const lastDate = validCompletions[0]!.date as string;
  const completionDates = new Set(validCompletions.map((c) => c.date as string));

  if (habit.frequency === "daily") {
    let streak = 1;
    let currentDate = lastDate;
    while (true) {
      const prevDate = addDays(currentDate, -1);
      if (!completionDates.has(prevDate)) break;
      streak++;
      currentDate = prevDate;
    }
    return { streak, lastDate };
  }

  if (habit.frequency === "weekly") {
    const thisWeekStart = getWeekStart(lastDate);
    const thisWeekEnd = addDays(thisWeekStart, 6);
    let completionsThisWeek = 0;
    for (const d of completionDates) {
      if (d >= thisWeekStart && d <= thisWeekEnd) completionsThisWeek++;
    }

    if (completionsThisWeek >= (habit.weeklyTarget ?? 1)) {
      const lastWeekStart = addDays(thisWeekStart, -7);
      const lastWeekEnd = addDays(lastWeekStart, 6);
      let completionsLastWeek = 0;
      for (const d of completionDates) {
        if (d >= lastWeekStart && d <= lastWeekEnd) completionsLastWeek++;
      }

      if (completionsLastWeek >= (habit.weeklyTarget ?? 1)) {
        return { streak: (habit.currentStreak ?? 0), lastDate };
      }
      return { streak: 1, lastDate };
    }
    return { streak: 0, lastDate };
  }

  if (habit.frequency === "specific_days") {
    const targetDays = habit.targetDays ?? [];
    const lastDow = getDayOfWeek(lastDate);

    if (!targetDays.includes(lastDow)) {
      return { streak: 0, lastDate };
    }

    const sortedDays = [...targetDays].sort((a, b) => a - b);
    let streak = 1;
    let currentDate = lastDate;

    while (true) {
      const currentDow = getDayOfWeek(currentDate);
      const currentIdx = sortedDays.indexOf(currentDow);
      let daysBack: number;

      if (currentIdx === 0) {
        const prevDay = sortedDays[sortedDays.length - 1]!;
        daysBack = ((currentDow - prevDay + 7) % 7) || 7;
      } else {
        const prevDay = sortedDays[currentIdx - 1]!;
        daysBack = currentDow - prevDay;
      }

      const prevDate = addDays(currentDate, -daysBack);
      if (!completionDates.has(prevDate)) break;
      streak++;
      currentDate = prevDate;
    }
    return { streak, lastDate };
  }

  return { streak: 0, lastDate };
}
