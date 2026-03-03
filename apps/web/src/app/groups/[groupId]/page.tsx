import { notFound, redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { orpc, type RouterClient } from "@/utils/orpc";
import { GroupDetail } from "@/components/group-detail";

interface GroupPageProps {
  params: Promise<{ groupId: string }>;
}

export default async function GroupPage({ params }: GroupPageProps) {
  const session = await authClient.getSession();

  if (!session) {
    redirect("/login");
  }

  const { groupId } = await params;

  // Fetch group data server-side
  const group = await orpc.groups.getById({ groupId });

  if (!group) {
    notFound();
  }

  return <GroupDetail groupId={groupId} initialData={group} />;
}
