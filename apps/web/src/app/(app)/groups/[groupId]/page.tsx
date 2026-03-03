import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@we-grow/auth";
import { client } from "@/utils/orpc";
import { GroupDetail } from "@/components/group-detail";

interface GroupPageProps {
  params: Promise<{ groupId: string }>;
}

export default async function GroupPage({ params }: GroupPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const { groupId } = await params;

  // Fetch group data server-side
  const group = await client.groups.getById({ groupId });

  if (!group) {
    notFound();
  }

  return <GroupDetail groupId={groupId} initialData={group} />;
}
