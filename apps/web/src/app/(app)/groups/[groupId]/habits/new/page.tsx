import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@we-grow/auth";
import { client } from "@/utils/orpc";
import { GroupHabitForm } from "@/components/group-habit-form";

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function NewGroupHabitPage({ params }: PageProps) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const { groupId } = await params;
  const group = await client.groups.getById({ groupId });

  if (!group) {
    redirect("/groups");
  }

  const currentMember = group.members?.find(
    (m: any) => m.userId === session.user?.id && m.status === "active",
  );
  const canManage = currentMember?.role === "owner" || currentMember?.role === "moderator";

  if (!canManage) {
    redirect(`/groups/${groupId}`);
  }

  return <GroupHabitForm groupId={groupId} />;
}
