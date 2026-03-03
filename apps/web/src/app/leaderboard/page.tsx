import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { LeaderboardTabs } from "@/components/leaderboard-tabs";

export default async function LeaderboardPage() {
  const session = await authClient.getSession();

  if (!session) {
    redirect("/login");
  }

  return <LeaderboardTabs />;
}
