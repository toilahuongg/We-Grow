"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp, Sparkles, Trophy, Flame, Zap } from "lucide-react";
import Link from "next/link";

import { orpc } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { XPBadge } from "@/components/xp-badge";
import { format } from "date-fns";

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  habit_completion: <Flame className="h-4 w-4" />,
  streak_bonus: <Trophy className="h-4 w-4" />,
  all_habits_bonus: <Sparkles className="h-4 w-4" />,
  onboarding: <Zap className="h-4 w-4" />,
};

const SOURCE_COLORS: Record<string, string> = {
  habit_completion: "text-[#ff6b6b]",
  streak_bonus: "text-[#f472b6]",
  all_habits_bonus: "text-[#a78bfa]",
  onboarding: "text-[#4ecdc4]",
};

export function XPHistoryList() {
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = useQuery({
    ...orpc.gamification.getXpHistory.queryOptions({ input: { limit, offset: page * limit } }),
    staleTime: 1000 * 60,
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;
  const transactions = data?.transactions ?? [];

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold">XP History</h1>
          <p className="text-sm text-muted-foreground">
            Track your earning history
          </p>
        </div>
      </div>

      {/* Summary */}
      {data && (
        <div className="glass-strong rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total XP Earned</p>
              <p className="font-display text-3xl font-bold gradient-text">
                {transactions.reduce((sum, t) => sum + t.amount, 0)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6b6b]/20 to-[#ffa06b]/20">
              <TrendingUp className="h-6 w-6 text-[#ff6b6b]" />
            </div>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="glass-strong rounded-2xl p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No XP history yet</h3>
            <p className="text-sm text-muted-foreground">
              Complete habits to start earning XP!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((transaction: any) => (
              <div
                key={transaction._id}
                className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/5 p-4 transition-all hover:border-white/10 hover:bg-white/10"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  SOURCE_COLORS[transaction.source] || "text-muted-foreground"
                } bg-current/10`}>
                  {SOURCE_ICONS[transaction.source] || <Sparkles className="h-4 w-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium">{transaction.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(transaction.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>

                <XPBadge amount={transaction.amount} size="sm" />
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
