import { z } from "zod";
import {
  Habit,
  HabitCompletion,
  Reminder,
  UserProfile,
  UserBadge,
  XpTransaction,
} from "@we-grow/db/models/index";
import { generateId } from "@we-grow/db/utils/id";

import { protectedProcedure } from "../index";
import { requireGroupRole } from "../middlewares/group-auth";
import { XP_REWARDS, getLevelFromXp } from "../lib/xp";
import { createActivity, createActivityForUserGroups } from "../lib/activity";
import { completeHabitForUser } from "../lib/habit-completion";

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

async function recalculateStreakFromCompletions(
  habit: InstanceType<typeof Habit>,
): Promise<{ streak: number; lastDate: string | null }> {
  const lastCompletion = await HabitCompletion.findOne({
    habitId: habit._id,
    userId: habit.userId,
  }).sort({ date: -1 });

  if (!lastCompletion) {
    return { streak: 0, lastDate: null };
  }

  if (habit.frequency === "daily") {
    let streak = 1;
    let currentDate = lastCompletion.date as string;
    // Walk backwards through consecutive days
    while (true) {
      const prevDate = addDays(currentDate, -1);
      const prev = await HabitCompletion.findOne({
        habitId: habit._id,
        userId: habit.userId,
        date: prevDate,
      });
      if (!prev) break;
      streak++;
      currentDate = prevDate;
    }
    return { streak, lastDate: lastCompletion.date as string };
  }

  if (habit.frequency === "weekly") {
    const lastDate = lastCompletion.date as string;
    const thisWeekStart = getWeekStart(lastDate);
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
        return { streak: (habit.currentStreak ?? 0), lastDate };
      }
      return { streak: 1, lastDate };
    }
    return { streak: 0, lastDate };
  }

  if (habit.frequency === "specific_days") {
    const lastDate = lastCompletion.date as string;
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
      const prev = await HabitCompletion.findOne({
        habitId: habit._id,
        userId: habit.userId,
        date: prevDate,
      });
      if (!prev) break;
      streak++;
      currentDate = prevDate;
    }
    return { streak, lastDate };
  }

  return { streak: 0, lastDate: lastCompletion.date as string };
}

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
  let profile = await UserProfile.findOne({ userId });
  let isNewProfile = false;
  if (!profile) {
    isNewProfile = true;
    profile = await UserProfile.create({
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

  // Award badge for new profile (level 1)
  if (isNewProfile) {
    await UserBadge.create({
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

  // Award badges for each level gained (handles multi-level jumps)
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

async function reverseXp(
  userId: string,
  source: string,
  sourceId: string | null,
  date: string,
) {
  const query: Record<string, unknown> = { userId, source };
  if (sourceId !== null) {
    query.sourceId = sourceId;
  }

  // Try exact match with date tag first (new format: "... [YYYY-MM-DD]")
  let transaction = await XpTransaction.findOne({
    ...query,
    description: { $regex: `\\[${date}\\]` },
  });

  // Fall back to most recent matching transaction (old format without date tag)
  if (!transaction) {
    transaction = await XpTransaction.findOne(query).sort({ createdAt: -1 });
  }

  if (!transaction) return;

  await XpTransaction.deleteOne({ _id: transaction._id });

  const profile = await UserProfile.findOne({ userId });
  if (profile) {
    profile.totalXp = Math.max(0, (profile.totalXp ?? 0) - (transaction.amount ?? 0));
    profile.level = getLevelFromXp(profile.totalXp);
    profile.updatedAt = new Date();
    await profile.save();
  }
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
    habitId: { $in: activeHabits.map((h: { _id: unknown }) => h._id) },
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

export const habitsRouter = {
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        frequency: z.enum(["daily", "weekly", "specific_days"]),
        targetDays: z.array(z.number().min(0).max(6)).optional(),
        weeklyTarget: z.number().min(1).max(7).optional(),
        groupId: z.string().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      if (input.groupId) {
        await requireGroupRole(context.session.user.id, input.groupId, ["owner", "moderator"]);
      }
      const now = new Date();
      return Habit.create({
        _id: generateId(),
        userId: context.session.user.id,
        title: input.title,
        description: input.description ?? "",
        frequency: input.frequency,
        targetDays: input.targetDays ?? [],
        weeklyTarget: input.weeklyTarget ?? 1,
        groupId: input.groupId ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }),

  list: protectedProcedure
    .input(z.object({
      groupId: z.string().optional(),
      includeArchived: z.boolean().optional(),
    }).optional())
    .handler(async ({ context, input }) => {
      const filter: Record<string, unknown> = { userId: context.session.user.id };
      if (input?.groupId) {
        filter.groupId = input.groupId;
      }
      if (!input?.includeArchived) {
        filter.archived = false;
      }
      return Habit.find(filter).sort({ createdAt: -1 });
    }),

  getById: protectedProcedure
    .input(z.object({ habitId: z.string() }))
    .handler(async ({ context, input }) => {
      const habit = await Habit.findOne({
        _id: input.habitId,
        userId: context.session.user.id,
      });
      if (!habit) return null;

      const today = getDateStr(new Date());
      const completion = await HabitCompletion.findOne({
        habitId: habit._id,
        userId: context.session.user.id,
        date: today,
      });

      return {
        ...habit.toObject(),
        completedToday: !!completion,
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        habitId: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        frequency: z.enum(["daily", "weekly", "specific_days"]).optional(),
        targetDays: z.array(z.number().min(0).max(6)).optional(),
        weeklyTarget: z.number().min(1).max(7).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const { habitId, ...updates } = input;
      return Habit.findOneAndUpdate(
        { _id: habitId, userId: context.session.user.id },
        { ...updates, updatedAt: new Date() },
        { new: true },
      );
    }),

  archive: protectedProcedure
    .input(z.object({ habitId: z.string() }))
    .handler(async ({ context, input }) => {
      return Habit.findOneAndUpdate(
        { _id: input.habitId, userId: context.session.user.id },
        { archived: true, updatedAt: new Date() },
        { new: true },
      );
    }),

  delete: protectedProcedure
    .input(z.object({ habitId: z.string() }))
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      await Habit.deleteOne({ _id: input.habitId, userId });
      await HabitCompletion.deleteMany({ habitId: input.habitId, userId });
      await Reminder.deleteMany({ habitId: input.habitId, userId });
      return { success: true };
    }),

  complete: protectedProcedure
    .input(
      z.object({
        habitId: z.string(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        note: z.string().max(1000).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const result = await completeHabitForUser(
        context.session.user.id,
        input.habitId,
        input.date,
        input.note,
      );
      return {
        success: result.success,
        alreadyCompleted: result.alreadyCompleted,
        streak: result.streak,
        xpAwarded: result.xpAwarded,
        leveledUp: result.leveledUp,
        newLevel: result.newLevel,
      };
    }),

  uncomplete: protectedProcedure
    .input(
      z.object({
        habitId: z.string(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const date = input.date ?? getDateStr(new Date());

      const deleted = await HabitCompletion.findOneAndDelete({
        habitId: input.habitId,
        userId,
        date,
      });
      if (!deleted) {
        return { success: true, wasCompleted: false };
      }

      // Reverse XP: remove base completion XP
      await reverseXp(userId, "habit_completion", input.habitId, date);
      // Reverse any streak bonus for this habit on this date
      await reverseXp(userId, "streak_bonus", input.habitId, date);
      // Reverse all-habits bonus for this date
      await reverseXp(userId, "all_habits_bonus", null, date);

      const habit = await Habit.findOne({ _id: input.habitId, userId });
      if (habit) {
        const { streak, lastDate } = await recalculateStreakFromCompletions(habit);
        habit.lastCompletedDate = lastDate;
        habit.currentStreak = streak;
        habit.updatedAt = new Date();
        await habit.save();
      }

      return { success: true, wasCompleted: true };
    }),

  getCompletions: protectedProcedure
    .input(
      z.object({
        habitId: z.string(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .handler(async ({ context, input }) => {
      return HabitCompletion.find({
        habitId: input.habitId,
        userId: context.session.user.id,
        date: { $gte: input.startDate, $lte: input.endDate },
      }).sort({ date: 1 });
    }),

  todaySummary: protectedProcedure
    .input(z.object({ groupId: z.string().optional() }).optional())
    .handler(async ({ context, input }) => {
    const userId = context.session.user.id;
    const today = getDateStr(new Date());
    const todayDow = getDayOfWeek(today);

    const filter: Record<string, unknown> = { userId, archived: false };
    if (input?.groupId) {
      filter.groupId = input.groupId;
    }
    const habits = await Habit.find(filter);
    const completions = await HabitCompletion.find({ userId, date: today });
    const completedIds = new Set(completions.map((c) => c.habitId));

    return habits.map((habit) => {
      let isDue = false;
      if (habit.frequency === "daily") {
        isDue = true;
      } else if (habit.frequency === "weekly") {
        isDue = true;
      } else if (habit.frequency === "specific_days") {
        isDue = (habit.targetDays ?? []).includes(todayDow);
      }

      return {
        ...habit.toObject(),
        isDue,
        completedToday: completedIds.has(habit._id as string),
      };
    });
  }),

  updateNote: protectedProcedure
    .input(
      z.object({
        habitId: z.string(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        note: z.string().max(1000).nullable(),
      }),
    )
    .handler(async ({ context, input }) => {
      const completion = await HabitCompletion.findOneAndUpdate(
        { habitId: input.habitId, userId: context.session.user.id, date: input.date },
        { note: input.note, updatedAt: new Date() },
        { new: true },
      );
      if (!completion) {
        throw new Error("Completion not found");
      }
      return completion;
    }),

  getNotes: protectedProcedure
    .input(
      z.object({
        habitId: z.string().optional(),
        limit: z.number().min(1).max(50).optional(),
        offset: z.number().min(0).optional(),
      }).optional(),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;

      const query: Record<string, unknown> = { userId, note: { $exists: true, $nin: [null, ""] } };
      if (input?.habitId) {
        query.habitId = input.habitId;
      }

      const [completions, total] = await Promise.all([
        HabitCompletion.find(query).sort({ date: -1 }).skip(offset).limit(limit),
        HabitCompletion.countDocuments(query),
      ]);

      // Enrich with habit titles
      const habitIds = [...new Set(completions.map((c) => c.habitId as string))];
      const habits = await Habit.find({ _id: { $in: habitIds } });
      const habitMap = new Map(habits.map((h) => [h._id as string, h.title as string]));

      return {
        notes: completions.map((c) => ({
          ...c.toObject(),
          habitTitle: habitMap.get(c.habitId as string) ?? "Unknown",
        })),
        total,
        limit,
        offset,
      };
    }),
};
