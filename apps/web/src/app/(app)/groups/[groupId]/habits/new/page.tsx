import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { client } from "@/utils/orpc";
import { GroupHabitForm } from "@/components/group-habit-form";

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function NewGroupHabitPage({ params }: PageProps) {
  const session = await authClient.getSession();

  if (!session) {
    redirect("/login");
  }

  const { groupId } = await params;
  const group = await client.groups.getById({ groupId });

  if (!group) {
    redirect("/groups");
  }

  const sessionData = session as any;
  const currentMember = group.members?.find(
    (m: any) => m.userId === sessionData?.data?.user?.id && m.status === "active",
  );
  const canManage = currentMember?.role === "owner" || currentMember?.role === "moderator";

  if (!canManage) {
    redirect(`/groups/${groupId}`);
  }

  return <GroupHabitForm groupId={groupId} />;
}
