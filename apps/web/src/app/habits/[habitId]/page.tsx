import { notFound, redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { client } from "@/utils/orpc";
import { HabitDetail } from "@/components/habit-detail";

interface HabitPageProps {
  params: Promise<{ habitId: string }>;
}

export default async function HabitPage({ params }: HabitPageProps) {
  const session = await authClient.getSession();

  if (!session) {
    redirect("/login");
  }

  const { habitId } = await params;

  const habit = await client.habits.getById({ habitId });

  if (!habit) {
    notFound();
  }

  return <HabitDetail habitId={habitId} initialData={habit} />;
}
