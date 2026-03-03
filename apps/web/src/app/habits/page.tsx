import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { HabitsList } from "@/components/habits-list";

export default async function HabitsPage() {
  const session = await authClient.getSession();

  if (!session) {
    redirect("/login");
  }

  return <HabitsList />;
}
