import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { XPHistoryList } from "@/components/xp-history-list";

export default async function XPHistoryPage() {
  const { data: session } = await authClient.getSession();

  if (!session) {
    redirect("/login");
  }

  return <XPHistoryList />;
}
