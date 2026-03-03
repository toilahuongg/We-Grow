import { z } from "zod";
import { Habit, HabitCompletion, XpTransaction } from "@we-grow/db/models/index";

import { protectedProcedure } from "../index";

function getDateStr(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return getDateStr(d);
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + "T00:00:00Z").getUTCDay();
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return getDateStr(d);
}

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
      const habits = await (Habit as any).find(habitFilter);

      const completions = await (HabitCompletion as any).find({
        userId,
        date: { $gte: input.startDate, $lte: input.endDate },
        ...(input.habitId ? { habitId: input.habitId } : {}),
      });

      const completionsByDate = new Map<string, number>();
      for (const c of completions) {
        const d = c.date as string;
        completionsByDate.set(d, (completionsByDate.get(d) ?? 0) + 1);
      }

      const results: Array<{ date: string; dueCount: number; completedCount: number; rate: number }> = [];
      let currentDate = input.startDate;

      while (currentDate <= input.endDate) {
        const dow = getDayOfWeek(currentDate);
        let dueCount = 0;
        for (const habit of habits) {
          if (habit.frequency === "daily") {
            dueCount++;
          } else if (habit.frequency === "weekly") {
            dueCount++;
          } else if (habit.frequency === "specific_days") {
            if ((habit.targetDays ?? []).includes(dow)) {
              dueCount++;
            }
          }
        }

        const completedCount = completionsByDate.get(currentDate) ?? 0;
        results.push({
          date: currentDate,
          dueCount,
          completedCount: Math.min(completedCount, dueCount),
          rate: dueCount > 0 ? Math.round((Math.min(completedCount, dueCount) / dueCount) * 100) : 0,
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
      const today = getDateStr(new Date());

      let startDate: string;
      if (input.period === "week") {
        startDate = addDays(today, -7);
      } else if (input.period === "month") {
        startDate = addDays(today, -30);
      } else {
        startDate = "2020-01-01";
      }

      const habits = await (Habit as any).find({ userId, archived: false });
      const completions = await (HabitCompletion as any).find({
        userId,
        date: { $gte: startDate, $lte: today },
      });

      const completionCounts = new Map<string, number>();
      for (const c of completions) {
        const id = c.habitId as string;
        completionCounts.set(id, (completionCounts.get(id) ?? 0) + 1);
      }

      // Calculate total possible days for each habit
      const results = habits.map((habit: any) => {
        const totalCompletions = completionCounts.get(habit._id as string) ?? 0;
        const createdDate = getDateStr(new Date(habit.createdAt as unknown as string));
        const effectiveStart = createdDate > startDate ? createdDate : startDate;

        let possibleDays = 0;
        let d = effectiveStart;
        while (d <= today) {
          const dow = getDayOfWeek(d);
          if (habit.frequency === "daily") {
            possibleDays++;
          } else if (habit.frequency === "weekly") {
            possibleDays++;
          } else if (habit.frequency === "specific_days") {
            if ((habit.targetDays ?? []).includes(dow)) {
              possibleDays++;
            }
          }
          d = addDays(d, 1);
        }

        const rate = possibleDays > 0 ? Math.round((totalCompletions / possibleDays) * 100) : 0;

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

      return results.sort((a: any, b: any) => b.completionRate - a.completionRate);
    }),

  weeklyReport: protectedProcedure
    .input(
      z.object({
        weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }).optional(),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const today = getDateStr(new Date());
      const thisWeekStart = input?.weekStartDate ?? getWeekStart(today);
      const thisWeekEnd = addDays(thisWeekStart, 6);
      const lastWeekStart = addDays(thisWeekStart, -7);
      const lastWeekEnd = addDays(lastWeekStart, 6);

      const habits = await (Habit as any).find({ userId, archived: false });

      const [thisWeekCompletions, lastWeekCompletions, xpTransactions] = await Promise.all([
        (HabitCompletion as any).find({ userId, date: { $gte: thisWeekStart, $lte: thisWeekEnd } }),
        (HabitCompletion as any).find({ userId, date: { $gte: lastWeekStart, $lte: lastWeekEnd } }),
        (XpTransaction as any).find({ userId, createdAt: { $gte: new Date(thisWeekStart + "T00:00:00Z"), $lte: new Date(thisWeekEnd + "T23:59:59Z") } }),
      ]);

      const totalCompletions = thisWeekCompletions.length;
      const lastWeekTotal = lastWeekCompletions.length;

      // Calculate total possible
      let totalPossible = 0;
      const dailyCompletions = new Map<string, number>();
      let totalDailyPossible = new Map<string, number>();

      for (let i = 0; i <= 6; i++) {
        const d = addDays(thisWeekStart, i);
        if (d > today) break;
        const dow = getDayOfWeek(d);
        let dueCount = 0;
        for (const habit of habits) {
          if (habit.frequency === "daily") dueCount++;
          else if (habit.frequency === "weekly") dueCount++;
          else if (habit.frequency === "specific_days") {
            if ((habit.targetDays ?? []).includes(dow)) dueCount++;
          }
        }
        totalPossible += dueCount;
        totalDailyPossible.set(d, dueCount);
      }

      // Count completions per day
      for (const c of thisWeekCompletions) {
        const d = c.date as string;
        dailyCompletions.set(d, (dailyCompletions.get(d) ?? 0) + 1);
      }

      // Find best and worst days
      let bestDay = { date: "", count: -1 };
      let worstDay = { date: "", count: Infinity };
      for (let i = 0; i <= 6; i++) {
        const d = addDays(thisWeekStart, i);
        if (d > today) break;
        const count = dailyCompletions.get(d) ?? 0;
        const possible = totalDailyPossible.get(d) ?? 0;
        const rate = possible > 0 ? count / possible : 0;
        if (rate > bestDay.count / Math.max(1, totalDailyPossible.get(bestDay.date) ?? 1) || bestDay.date === "") {
          bestDay = { date: d, count };
        }
        if (rate < worstDay.count / Math.max(1, totalDailyPossible.get(worstDay.date) ?? 1) || worstDay.date === "") {
          worstDay = { date: d, count };
        }
      }

      const overallRate = totalPossible > 0 ? Math.round((totalCompletions / totalPossible) * 100) : 0;
      const xpEarned = xpTransactions.reduce((sum: number, tx: any) => sum + ((tx.amount as number) ?? 0), 0);
      const changePercent = lastWeekTotal > 0
        ? Math.round(((totalCompletions - lastWeekTotal) / lastWeekTotal) * 100)
        : totalCompletions > 0 ? 100 : 0;

      return {
        totalCompletions,
        totalPossible,
        overallRate,
        xpEarned,
        bestDay: bestDay.date ? DAY_NAMES[getDayOfWeek(bestDay.date)] : null,
        worstDay: worstDay.date ? DAY_NAMES[getDayOfWeek(worstDay.date)] : null,
        changePercent,
      };
    }),

  streakOverview: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    const today = getDateStr(new Date());
    const yesterday = addDays(today, -1);

    const habits = await (Habit as any).find({ userId, archived: false });

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
