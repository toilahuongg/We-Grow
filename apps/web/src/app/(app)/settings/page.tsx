import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const session = await authClient.getSession();

  if (!session) {
    redirect("/login");
  }

  return <SettingsForm session={session} />;
}
