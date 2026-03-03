import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { OnboardingFlow } from "@/components/onboarding-flow";

export default async function OnboardingPage() {
  const session = await authClient.getSession();

  if (!session) {
    redirect("/login");
  }

  return <OnboardingFlow />;
}
