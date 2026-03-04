"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flame, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { orpc } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { getLocalToday } from "@/lib/date-utils";

type Period = "week" | "month" | "last30";

function getDateRange(period: Period) {
  const todayStr = getLocalToday();
  const today = new Date(todayStr + "T00:00:00");
  let startDate: string;

  if (period === "week") {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    startDate = new Intl.DateTimeFormat("en-CA").format(d);
  } else if (period === "month") {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    startDate = new Intl.DateTimeFormat("en-CA").format(d);
  } else {
    const d = new Date(today);
    d.setDate(d.getDate() - 29);
    startDate = new Intl.DateTimeFormat("en-CA").format(d);
  }

  return { startDate, endDate: todayStr };
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function AnalyticsDashboard() {
  const t = useTranslations("analytics");
  const [period, setPeriod] = useState<Period>("week");

  const dateRange = useMemo(() => getDateRange(period), [period]);
  const performancePeriod = period === "week" ? "week" : "month";

  const { data: trends, isLoading: trendsLoading } = useQuery({
    ...orpc.analytics.completionTrends.queryOptions({
      input: { startDate: dateRange.startDate, endDate: dateRange.endDate },
    }),
    staleTime: 1000 * 60 * 5,
  });

  const { data: performance } = useQuery({
    ...orpc.analytics.habitPerformance.queryOptions({
      input: { period: performancePeriod },
    }),
    staleTime: 1000 * 60 * 5,
  });

  const { data: streaks } = useQuery({
    ...orpc.analytics.streakOverview.queryOptions(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: weeklyReport } = useQuery({
    ...orpc.analytics.weeklyReport.queryOptions(),
    staleTime: 1000 * 60 * 5,
  });

  const chartData = useMemo(
    () =>
      (trends ?? []).map((d: any) => ({
        ...d,
        label: formatDateShort(d.date),
      })),
    [trends],
  );

  const periods: Array<{ key: Period; label: string }> = [
    { key: "week", label: t("thisWeek") },
    { key: "month", label: t("thisMonth") },
    { key: "last30", label: t("last30Days") },
  ];

  const hasData = (trends ?? []).length > 0 && (trends as any[])?.some((d: any) => d.dueCount > 0);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 mb-6">
        {periods.map((p) => (
          <Button
            key={p.key}
            variant={period === p.key ? "default" : "outline"}
            onClick={() => setPeriod(p.key)}
            size="sm"
          >
            {p.label}
          </Button>
        ))}
      </div>

      {!hasData && !trendsLoading ? (
        <EmptyState
          icon={<BarChart3 className="h-8 w-8 text-[#f472b6]" />}
          title={t("noData")}
          description={t("noDataDesc")}
        />
      ) : (
        <div className="space-y-6">
          {/* Completion Trend Chart */}
          <div className="glass-strong rounded-2xl p-6">
            <h2 className="font-display text-lg font-bold mb-4">{t("completionTrend")}</h2>
            {trendsLoading ? (
              <div className="h-48 animate-pulse rounded-xl bg-overlay-subtle" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4ecdc4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4ecdc4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                      formatter={(value: number | undefined) => [`${value ?? 0}%`, t("completionRate")]}
                    />
                    <Area
                      type="monotone"
                      dataKey="rate"
                      stroke="#4ecdc4"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRate)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Habit Performance */}
            <div className="glass-strong rounded-2xl p-6">
              <h2 className="font-display text-lg font-bold mb-4">{t("habitPerformance")}</h2>
              {!performance || performance.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noData")}</p>
              ) : (
                <div className="space-y-3">
                  {(performance as any[]).slice(0, 8).map((habit: any) => (
                    <div key={habit.habitId} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{habit.title}</p>
                        <div className="w-full h-2 rounded-full bg-overlay-medium mt-1">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#4ecdc4] to-[#a78bfa] transition-all"
                            style={{ width: `${habit.completionRate}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-semibold min-w-[3rem] text-right">
                        {habit.completionRate}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Streak Overview */}
            <div className="glass-strong rounded-2xl p-6">
              <h2 className="font-display text-lg font-bold mb-4">{t("streakOverview")}</h2>
              {streaks && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-overlay-medium bg-overlay-subtle p-4 text-center">
                    <Flame className="h-5 w-5 text-[#ff6b6b] mx-auto mb-2" />
                    <p className="text-2xl font-bold">{streaks.totalActiveStreaks}</p>
                    <p className="text-xs text-muted-foreground">{t("activeStreaks")}</p>
                  </div>
                  <div className="rounded-xl border border-overlay-medium bg-overlay-subtle p-4 text-center">
                    <TrendingUp className="h-5 w-5 text-[#4ecdc4] mx-auto mb-2" />
                    <p className="text-2xl font-bold">{streaks.longestEver}</p>
                    <p className="text-xs text-muted-foreground">{t("longestEver")}</p>
                  </div>
                  <div className="rounded-xl border border-overlay-medium bg-overlay-subtle p-4 text-center">
                    <Flame className="h-5 w-5 text-[#ffa06b] mx-auto mb-2" />
                    <p className="text-2xl font-bold">{streaks.longestCurrent}</p>
                    <p className="text-xs text-muted-foreground">{t("longestCurrent")}</p>
                  </div>
                  <div className="rounded-xl border border-overlay-medium bg-overlay-subtle p-4 text-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{streaks.atRiskStreaks}</p>
                    <p className="text-xs text-muted-foreground">{t("atRisk")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Weekly Report */}
          {weeklyReport && (
            <div className="glass-strong rounded-2xl p-6">
              <h2 className="font-display text-lg font-bold mb-4">{t("weeklyReport")}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{weeklyReport.totalCompletions}</p>
                  <p className="text-xs text-muted-foreground">{t("totalCompletions")}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{weeklyReport.overallRate}%</p>
                  <p className="text-xs text-muted-foreground">{t("overallRate")}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{weeklyReport.xpEarned}</p>
                  <p className="text-xs text-muted-foreground">{t("xpEarned")}</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${weeklyReport.changePercent >= 0 ? "text-[#4ecdc4]" : "text-[#ff6b6b]"}`}>
                    {weeklyReport.changePercent >= 0 ? "+" : ""}{weeklyReport.changePercent}%
                  </p>
                  <p className="text-xs text-muted-foreground">{t("vsLastWeek")}</p>
                </div>
              </div>
              {weeklyReport.bestDay && (
                <div className="flex justify-center gap-8 mt-4 pt-4 border-t border-overlay-medium">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[#4ecdc4]">{weeklyReport.bestDay}</p>
                    <p className="text-xs text-muted-foreground">{t("bestDay")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[#ff6b6b]">{weeklyReport.worstDay}</p>
                    <p className="text-xs text-muted-foreground">{t("worstDay")}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
