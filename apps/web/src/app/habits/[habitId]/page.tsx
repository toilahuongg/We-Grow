import { notFound, redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { orpc, type RouterClient } from "@/utils/orpc";
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

  // Fetch habit data server-side
  const orpcClient = (await import("@/utils/orpc")).orpc as RouterClient;
  const habit = await orpcClient.habits.getById({ habitId });

  if (!habit) {
    notFound();
  }

  return <HabitDetail habitId={habitId} initialData={habit} />;
}
