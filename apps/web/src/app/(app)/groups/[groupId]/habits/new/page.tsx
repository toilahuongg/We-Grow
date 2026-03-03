import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";
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

  return <GroupHabitForm groupId={groupId} />;
}
