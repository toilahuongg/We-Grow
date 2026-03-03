"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { orpc } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ActivityItem } from "@/components/activity-item";

interface ActivityFeedProps {
  groupId: string;
}

function getDateGroup(dateStr: string): "today" | "yesterday" | "earlier" {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date >= today) return "today";
  if (date >= yesterday) return "yesterday";
  return "earlier";
}

export function ActivityFeed({ groupId }: ActivityFeedProps) {
  const t = useTranslations("feed");
  const queryClient = useQueryClient();
  const [allActivities, setAllActivities] = useState<any[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);

  const { data, isLoading } = useQuery({
    ...orpc.feed.getGroupFeed.queryOptions({ input: { groupId, limit: 20 } }),
    staleTime: 1000 * 30,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (data) {
      setAllActivities(data.activities);
      setHasMore(data.hasMore);
      if (data.activities.length > 0) {
        setCursor(data.activities[data.activities.length - 1]?.createdAt);
      }
    }
  }, [data]);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await queryClient.fetchQuery(
        orpc.feed.getGroupFeed.queryOptions({
          input: { groupId, limit: 20, before: cursor },
        }),
      );
      setAllActivities((prev) => [...prev, ...result.activities]);
      setHasMore(result.hasMore);
      if (result.activities.length > 0) {
        setCursor(result.activities[result.activities.length - 1]?.createdAt);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const grouped = useMemo(() => {
    const groups: { key: string; label: string; items: any[] }[] = [];
    const map = new Map<string, any[]>();

    allActivities.forEach((activity) => {
      const group = getDateGroup(activity.createdAt);
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(activity);
    });

    const labels: Record<string, string> = {
      today: "Today",
      yesterday: "Yesterday",
      earlier: "Earlier",
    };

    for (const key of ["today", "yesterday", "earlier"] as const) {
      const items = map.get(key);
      if (items && items.length > 0) {
        groups.push({ key, label: labels[key], items });
      }
    }

    return groups;
  }, [allActivities]);

  if (isLoading) {
    return (
      <div className="space-y-4 pl-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/5" />
            <div className="flex-1 space-y-2">
              <div className="h-14 animate-pulse rounded-2xl bg-white/5" />
              <div className="h-4 w-24 animate-pulse rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (allActivities.length === 0) {
    return (
      <EmptyState
        title={t("noActivityTitle")}
        description={t("noActivityDesc")}
      />
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map((group) => (
        <div key={group.key}>
          {/* Day label */}
          <div className="flex items-center gap-3 mb-1 pl-[52px]">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              {group.label}
            </span>
            <div className="h-px flex-1 bg-white/[0.04]" />
          </div>

          {/* Timeline items */}
          <div className="divide-y divide-white/[0.04]">
            {group.items.map((activity) => (
              <ActivityItem
                key={activity._id}
                activity={activity}
                groupId={groupId}
              />
            ))}
          </div>
        </div>
      ))}

      {hasMore && (
        <div className="text-center pt-2 pl-[52px]">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadMore}
            disabled={loadingMore}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {loadingMore ? "..." : t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
