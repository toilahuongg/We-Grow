import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@we-grow/auth";
import { XPHistoryList } from "@/components/xp-history-list";

export default async function XPHistoryPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  return <XPHistoryList />;
}
