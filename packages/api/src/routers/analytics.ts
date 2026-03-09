import { z } from "zod";
import { Habit, HabitCompletion, XpTransaction } from "@we-grow/db/models/index";

import { protectedProcedure } from "../index";
import { getDateStr, getToday, addDays, getDayOfWeek, getWeekStart } from "../lib/date-utils";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const analyticsRouter = {
  completionTrends: protectedProcedure
    .input(
      z.object({
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        habitId: z.string().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;

      const habitFilter: Record<string, unknown> = { userId, archived: false };
      if (input.habitId) {
        habitFilter._id = input.habitId;
      }
      const habits = await Habit.find(habitFilter);

      const completions = await HabitCompletion.find({
        userId,
        date: { $gte: input.startDate, $lte: input.endDate },
        ...(input.habitId ? { habitId: input.habitId } : {}),
      });

      const completionsByDate = new Map<string, number>();
      for (const c of completions) {
        const d = c.date as string;
        completionsByDate.set(d, (completionsByDate.get(d) ?? 0) + (c.completedCount ?? 1));
      }

      const results: Array<{ date: string; dueCount: number; completedCount: number; rate: number }> = [];
      let currentDate = input.startDate;

      while (currentDate <= input.endDate) {
        const dow = getDayOfWeek(currentDate);
        let dueCount = 0;
        let targetCount = 0;
        for (const habit of habits) {
          if (habit.frequency === "daily") {
            dueCount++;
            targetCount += habit.targetPerDay ?? 1;
          } else if (habit.frequency === "weekly") {
            dueCount++;
            targetCount += habit.targetPerDay ?? 1;
          } else if (habit.frequency === "specific_days") {
            if ((habit.targetDays ?? []).includes(dow)) {
              dueCount++;
              targetCount += habit.targetPerDay ?? 1;
            }
          }
        }

        const completedCount = completionsByDate.get(currentDate) ?? 0;
        results.push({
          date: currentDate,
          dueCount,
          completedCount,
          rate: targetCount > 0 ? Math.round((completedCount / targetCount) * 100) : 0,
        });

        currentDate = addDays(currentDate, 1);
      }

      return results;
    }),

  habitPerformance: protectedProcedure
    .input(
      z.object({
        period: z.enum(["week", "month", "all"]),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const today = getToday(context.timezone);

      let startDate: string;
      if (input.period === "week") {
        startDate = addDays(today, -7);
      } else if (input.period === "month") {
        startDate = addDays(today, -30);
      } else {
        startDate = "2020-01-01";
      }

      const habits = await Habit.find({ userId, archived: false });
      const completions = await HabitCompletion.find({
        userId,
        date: { $gte: startDate, $lte: today },
      });

      const completionCounts = new Map<string, number>();
      for (const c of completions) {
        const id = c.habitId as string;
        completionCounts.set(id, (completionCounts.get(id) ?? 0) + (c.completedCount ?? 1));
      }

      // Calculate total possible days for each habit using arithmetic
      const results = habits.map((habit) => {
        const totalCompletions = completionCounts.get(habit._id as string) ?? 0;
        const createdDate = getDateStr(new Date(habit.createdAt as unknown as string));
        const effectiveStart = createdDate > startDate ? createdDate : startDate;
        const targetPerDay = habit.targetPerDay ?? 1;

        let possibleDays: number;

        if (habit.frequency === "daily" || habit.frequency === "weekly") {
          // Count calendar days between effectiveStart and today
          const startMs = new Date(effectiveStart + "T00:00:00Z").getTime();
          const endMs = new Date(today + "T00:00:00Z").getTime();
          possibleDays = Math.max(0, Math.floor((endMs - startMs) / 86400000) + 1);
        } else if (habit.frequency === "specific_days") {
          const targetDays = habit.targetDays ?? [];
          if (targetDays.length === 0) {
            possibleDays = 0;
          } else {
            // Count specific days using arithmetic: full weeks * days_per_week + remaining
            const startMs = new Date(effectiveStart + "T00:00:00Z").getTime();
            const endMs = new Date(today + "T00:00:00Z").getTime();
            const totalDays = Math.max(0, Math.floor((endMs - startMs) / 86400000) + 1);
            const fullWeeks = Math.floor(totalDays / 7);
            possibleDays = fullWeeks * targetDays.length;
            // Count remaining days
            const startDow = getDayOfWeek(effectiveStart);
            for (let i = 0; i < totalDays % 7; i++) {
              if (targetDays.includes((startDow + fullWeeks * 7 + i) % 7)) {
                possibleDays++;
              }
            }
          }
        } else {
          possibleDays = 0;
        }

        const possibleTargets = possibleDays * targetPerDay;
        const rate = possibleTargets > 0 ? Math.round((totalCompletions / possibleTargets) * 100) : 0;

        return {
          habitId: habit._id as string,
          title: habit.title as string,
          frequency: habit.frequency as string,
          totalCompletions,
          possibleDays,
          completionRate: Math.min(rate, 100),
          currentStreak: habit.currentStreak ?? 0,
          longestStreak: habit.longestStreak ?? 0,
        };
      });

      return results.sort((a, b) => b.completionRate - a.completionRate);
    }),

  weeklyReport: protectedProcedure
    .input(
      z.object({
        weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }).optional(),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const today = getToday(context.timezone);
      const thisWeekStart = input?.weekStartDate ?? getWeekStart(today);
      const thisWeekEnd = addDays(thisWeekStart, 6);
      const lastWeekStart = addDays(thisWeekStart, -7);
      const lastWeekEnd = addDays(lastWeekStart, 6);

      const habits = await Habit.find({ userId, archived: false });

      const [thisWeekCompletions, lastWeekCompletions, xpTransactions] = await Promise.all([
        HabitCompletion.find({ userId, date: { $gte: thisWeekStart, $lte: thisWeekEnd } }),
        HabitCompletion.find({ userId, date: { $gte: lastWeekStart, $lte: lastWeekEnd } }),
        XpTransaction.find({ userId, createdAt: { $gte: new Date(thisWeekStart + "T00:00:00Z"), $lte: new Date(thisWeekEnd + "T23:59:59Z") } }),
      ]);

      const totalCompletions = thisWeekCompletions.reduce((sum, c) => sum + (c.completedCount ?? 1), 0);
      const lastWeekTotal = lastWeekCompletions.reduce((sum, c) => sum + (c.completedCount ?? 1), 0);

      // Calculate total possible
      let totalPossibleTargets = 0;
      const dailyCompletions = new Map<string, number>();
      const totalDailyTargets = new Map<string, number>();

      for (let i = 0; i <= 6; i++) {
        const d = addDays(thisWeekStart, i);
        if (d > today) break;
        const dow = getDayOfWeek(d);
        let targetCount = 0;
        for (const habit of habits) {
          if (habit.frequency === "daily") targetCount += habit.targetPerDay ?? 1;
          else if (habit.frequency === "weekly") targetCount += habit.targetPerDay ?? 1;
          else if (habit.frequency === "specific_days") {
            if ((habit.targetDays ?? []).includes(dow)) targetCount += habit.targetPerDay ?? 1;
          }
        }
        totalPossibleTargets += targetCount;
        totalDailyTargets.set(d, targetCount);
      }

      // Count completions per day
      for (const c of thisWeekCompletions) {
        const d = c.date as string;
        dailyCompletions.set(d, (dailyCompletions.get(d) ?? 0) + (c.completedCount ?? 1));
      }

      // Find best and worst days
      let bestDay = { date: "", count: -1 };
      let worstDay = { date: "", count: Infinity };
      for (let i = 0; i <= 6; i++) {
        const d = addDays(thisWeekStart, i);
        if (d > today) break;
        const count = dailyCompletions.get(d) ?? 0;
        const target = totalDailyTargets.get(d) ?? 1;
        const rate = count / target;
        const bestRate = bestDay.date !== "" ? (dailyCompletions.get(bestDay.date) ?? 0) / Math.max(1, totalDailyTargets.get(bestDay.date) ?? 1) : -1;
        const worstRate = worstDay.date !== "" ? (dailyCompletions.get(worstDay.date) ?? 0) / Math.max(1, totalDailyTargets.get(worstDay.date) ?? 1) : Infinity;
        if (rate > bestRate || bestDay.date === "") {
          bestDay = { date: d, count };
        }
        if (rate < worstRate || worstDay.date === "") {
          worstDay = { date: d, count };
        }
      }

      const overallRate = totalPossibleTargets > 0 ? Math.round((totalCompletions / totalPossibleTargets) * 100) : 0;
      const xpEarned = xpTransactions.reduce((sum: number, tx) => sum + ((tx.amount as number) ?? 0), 0);
      const changePercent = lastWeekTotal > 0
        ? Math.round(((totalCompletions - lastWeekTotal) / lastWeekTotal) * 100)
        : totalCompletions > 0 ? 100 : 0;

      return {
        totalCompletions,
        totalPossible: totalPossibleTargets,
        overallRate,
        xpEarned,
        bestDay: bestDay.date ? DAY_NAMES[getDayOfWeek(bestDay.date)] : null,
        worstDay: worstDay.date ? DAY_NAMES[getDayOfWeek(worstDay.date)] : null,
        changePercent,
      };
    }),

  streakOverview: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    const today = getToday(context.timezone);
    const yesterday = addDays(today, -1);

    const habits = await Habit.find({ userId, archived: false });

    let totalActiveStreaks = 0;
    let longestEver = 0;
    let longestCurrent = 0;
    let atRiskStreaks = 0;

    for (const habit of habits) {
      const streak = habit.currentStreak ?? 0;
      const longest = habit.longestStreak ?? 0;
      const lastCompleted = habit.lastCompletedDate as string | null;

      if (streak > 0) {
        totalActiveStreaks++;
        if (streak > longestCurrent) {
          longestCurrent = streak;
        }
        // At risk: last completed yesterday (for daily) or approaching deadline
        if (habit.frequency === "daily" && lastCompleted === yesterday) {
          atRiskStreaks++;
        }
      }
      if (longest > longestEver) {
        longestEver = longest;
      }
    }

    return {
      totalActiveStreaks,
      longestEver,
      longestCurrent,
      atRiskStreaks,
    };
  }),
};
