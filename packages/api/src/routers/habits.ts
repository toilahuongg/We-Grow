import { z } from "zod";
import {
  Habit,
  HabitCompletion,
  UserProfile,
  XpTransaction,
} from "@we-grow/db/models/index";
import { generateId } from "@we-grow/db/utils/id";

import { protectedProcedure } from "../index";
import { XP_REWARDS, getLevelFromXp } from "../lib/xp";

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

async function awardXp(
  userId: string,
  amount: number,
  source: string,
  sourceId: string | null,
  description: string,
) {
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
  const profile = await UserProfile.findOne({ userId });
  if (profile) {
    profile.totalXp = (profile.totalXp ?? 0) + amount;
    profile.level = getLevelFromXp(profile.totalXp);
    profile.updatedAt = now;
    await profile.save();
  }
}

async function checkStreakBonuses(
  userId: string,
  habitId: string,
  streak: number,
) {
  if (streak === 7) {
    await awardXp(userId, XP_REWARDS.STREAK_7_DAY, "streak_bonus", habitId, "7-day streak bonus");
  } else if (streak === 30) {
    await awardXp(userId, XP_REWARDS.STREAK_30_DAY, "streak_bonus", habitId, "30-day streak bonus");
  } else if (streak === 100) {
    await awardXp(userId, XP_REWARDS.STREAK_100_DAY, "streak_bonus", habitId, "100-day streak bonus");
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
    await awardXp(userId, XP_REWARDS.ALL_DAILY_HABITS, "all_habits_bonus", null, "All daily habits completed");
  }
}

export const habitsRouter = {
  list: protectedProcedure
    .input(z.object({ includeArchived: z.boolean().optional() }).optional())
    .handler(async ({ context, input }) => {
      const filter: Record<string, unknown> = { userId: context.session.user.id };
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

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        frequency: z.enum(["daily", "weekly", "specific_days"]),
        targetDays: z.array(z.number().min(0).max(6)).optional(),
        weeklyTarget: z.number().min(1).max(7).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const now = new Date();
      return Habit.create({
        _id: generateId(),
        userId: context.session.user.id,
        title: input.title,
        description: input.description ?? "",
        frequency: input.frequency,
        targetDays: input.targetDays ?? [],
        weeklyTarget: input.weeklyTarget ?? 1,
        createdAt: now,
        updatedAt: now,
      });
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
      return { success: true };
    }),

  complete: protectedProcedure
    .input(
      z.object({
        habitId: z.string(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const date = input.date ?? getDateStr(new Date());
      const now = new Date();

      const habit = await Habit.findOne({ _id: input.habitId, userId });
      if (!habit) {
        throw new Error("Habit not found");
      }

      const existing = await HabitCompletion.findOne({
        habitId: input.habitId,
        userId,
        date,
      });
      if (existing) {
        return { success: true, alreadyCompleted: true, streak: habit.currentStreak };
      }

      await HabitCompletion.create({
        _id: generateId(),
        habitId: input.habitId,
        userId,
        date,
        createdAt: now,
        updatedAt: now,
      });

      const newStreak = await calculateStreak(habit, date);
      habit.currentStreak = newStreak;
      habit.longestStreak = Math.max(habit.longestStreak ?? 0, newStreak);
      habit.lastCompletedDate = date;
      habit.updatedAt = now;
      await habit.save();

      await awardXp(userId, XP_REWARDS.HABIT_COMPLETION, "habit_completion", habit._id, `Completed habit: ${habit.title}`);
      await checkStreakBonuses(userId, habit._id, newStreak);
      await checkAllHabitsBonus(userId, date);

      return {
        success: true,
        alreadyCompleted: false,
        streak: newStreak,
        xpAwarded: XP_REWARDS.HABIT_COMPLETION,
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

      const habit = await Habit.findOne({ _id: input.habitId, userId });
      if (habit) {
        const lastCompletion = await HabitCompletion.findOne({
          habitId: input.habitId,
          userId,
        }).sort({ date: -1 });

        if (lastCompletion) {
          habit.lastCompletedDate = lastCompletion.date;
          habit.currentStreak = await calculateStreak(habit, lastCompletion.date);
        } else {
          habit.lastCompletedDate = null;
          habit.currentStreak = 0;
        }
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

  todaySummary: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    const today = getDateStr(new Date());
    const todayDow = getDayOfWeek(today);

    const habits = await Habit.find({ userId, archived: false });
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
        completedToday: completedIds.has(habit._id),
      };
    });
  }),
};
