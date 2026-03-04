import { z } from "zod";
import {
  Habit,
  HabitCompletion,
  Reminder,
} from "@we-grow/db/models/index";
import { generateId } from "@we-grow/db/utils/id";

import { protectedProcedure } from "../index";
import { requireGroupRole } from "../middlewares/group-auth";
import { completeHabitForUser, reverseXp, recalculateStreakFromCompletions } from "../lib/habit-completion";
import { getToday, getDayOfWeek } from "../lib/date-utils";

export const habitsRouter = {
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
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

      const today = getToday(context.timezone);
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
        title: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
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
        context.timezone,
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
      const date = input.date ?? getToday(context.timezone);

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
    const today = getToday(context.timezone);
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
