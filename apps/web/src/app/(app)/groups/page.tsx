import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@we-grow/auth";
import { GroupsList } from "@/components/groups-list";

export default async function GroupsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  return <GroupsList />;
}
