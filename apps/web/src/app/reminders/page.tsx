import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { RemindersList } from "@/components/reminders-list";

export default async function RemindersPage() {
  const session = await authClient.getSession();

  if (!session) {
    redirect("/login");
  }

  return <RemindersList />;
}
