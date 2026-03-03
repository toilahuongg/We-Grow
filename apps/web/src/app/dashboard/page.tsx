import { auth } from "@we-grow/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createServerCaller } from "@/utils/server-rpc";

import Dashboard from "./dashboard";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  // Check if user has completed onboarding
  try {
    const rpc = await createServerCaller();
    const onboardingStatus = await rpc.onboarding.getStatus();
    if (!onboardingStatus.completed) {
      redirect("/onboarding");
    }
  } catch (error) {
    // If onboarding check fails (e.g., UserProfile doesn't exist), redirect to onboarding
    console.error("Failed to check onboarding status, redirecting to onboarding:", error);
    redirect("/onboarding");
  }

  return (
    <main className="min-h-screen bg-gradient-mesh bg-grid-pattern">
      <Dashboard session={session} />
    </main>
  );
}
