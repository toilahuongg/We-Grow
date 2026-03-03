import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { HabitForm } from "@/components/habit-form";

export default async function NewHabitPage() {
  const session = await authClient.getSession();

  if (!session) {
    redirect("/login");
  }

  return <HabitForm />;
}
