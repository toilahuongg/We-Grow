"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { orpc } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ActivityItem } from "@/components/activity-item";

interface ActivityFeedProps {
  groupId: string;
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

  // Sync initial data
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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-white/5" />
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
    <div className="space-y-3">
      {allActivities.map((activity: any) => (
        <ActivityItem key={activity._id} activity={activity} groupId={groupId} />
      ))}

      {hasMore && (
        <div className="text-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "..." : t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
