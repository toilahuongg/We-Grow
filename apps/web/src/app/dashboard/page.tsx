import { auth } from "@we-grow/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import Dashboard from "./dashboard";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-gradient-mesh bg-grid-pattern">
      <Dashboard session={session} />
    </main>
  );
}
