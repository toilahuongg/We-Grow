import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { GroupsList } from "@/components/groups-list";

export default async function GroupsPage() {
  const { data: session } = await authClient.getSession();

  if (!session) {
    redirect("/login");
  }

  return <GroupsList />;
}
