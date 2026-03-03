import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@we-grow/auth";
import { RemindersList } from "@/components/reminders-list";

export default async function RemindersPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  return <RemindersList />;
}
