"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Target, Clock, ArrowRight, Check } from "lucide-react";

import { orpc } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const SUGGESTED_GOALS = [
  "🧘 Meditation & Mindfulness",
  "💪 Physical Fitness",
  "📚 Learning & Education",
  "💧 Health & Wellness",
  "✍️ Journaling & Reflection",
  "🎯 Productivity & Focus",
  "😴 Better Sleep Habits",
  "🎨 Creative Expression",
  "🌱 Personal Growth",
  "💼 Career Development",
];

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Australia/Sydney",
];

export function OnboardingFlow() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [timezone, setTimezone] = useState("UTC");

  const { data: status, isLoading } = useQuery({
    ...orpc.onboarding.getStatus.queryOptions(),
    staleTime: 1000 * 60,
  });

  const completeMutation = useMutation({
    mutationFn: orpc.onboarding.complete.mutate,
    onSuccess: (result) => {
      if (result.alreadyCompleted) {
        router.push("/dashboard");
        return;
      }
      queryClient.invalidateQueries({ queryKey: orpc.onboarding.getStatus.queryKey() });
      queryClient.invalidateQueries({ queryKey: orpc.gamification.getProfile.queryKey() });
      toast.success("Welcome to We-Grow! +10 XP 🎉");
      router.push("/dashboard");
    },
    onError: () => {
      toast.error("Failed to complete onboarding");
    },
  });

  // Detect user's timezone
  useState(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && COMMON_TIMEZONES.includes(detected)) {
      setTimezone(detected);
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-strong rounded-2xl p-8">
          <div className="h-8 w-32 animate-pulse rounded bg-white/10 mb-4" />
          <div className="h-4 w-48 animate-pulse rounded bg-white/10" />
        </div>
      </div>
    );
  }

  // Redirect if already completed
  if (status?.completed) {
    router.push("/dashboard");
    return null;
  }

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal)
        ? prev.filter((g) => g !== goal)
        : [...prev, goal]
    );
  };

  const handleComplete = () => {
    if (selectedGoals.length === 0) {
      toast.error("Please select at least one goal");
      return;
    }
    completeMutation.mutate({ goals: selectedGoals, timezone });
  };

  return (
    <div className="min-h-screen bg-gradient-mesh bg-grid-pattern flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4 inline-flex">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6b6b] to-[#ffa06b] text-white shadow-lg shadow-[#ff6b6b]/30">
              <Sparkles className="h-8 w-8" />
            </div>
          </div>
          <h1 className="font-display text-4xl font-bold mb-2">
            Welcome to <span className="gradient-text">We-Grow</span>
          </h1>
          <p className="text-muted-foreground">
            {step === 1
              ? "Let's personalize your experience. Select your growth goals."
              : "Almost done! Set your timezone for accurate tracking."}
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className={`h-2 flex-1 rounded-full transition-all ${
            step >= 1 ? "bg-gradient-to-r from-[#ff6b6b] to-[#ffa06b]" : "bg-white/10"
          }`} />
          <div className={`h-2 flex-1 rounded-full transition-all ${
            step >= 2 ? "bg-gradient-to-r from-[#ffa06b] to-[#4ecdc4]" : "bg-white/10"
          }`} />
        </div>

        {/* Step 1: Goals */}
        {step === 1 && (
          <div className="glass-strong rounded-2xl p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6b6b]/20 to-[#ffa06b]/20">
                <Target className="h-5 w-5 text-[#ff6b6b]" />
              </div>
              <div>
                <h2 className="font-semibold">What are your growth goals?</h2>
                <p className="text-sm text-muted-foreground">Select at least one (choose as many as you like)</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-6">
              {SUGGESTED_GOALS.map((goal) => {
                const isSelected = selectedGoals.includes(goal);
                return (
                  <button
                    key={goal}
                    onClick={() => toggleGoal(goal)}
                    className={`text-left rounded-xl border p-3 transition-all ${
                      isSelected
                        ? "border-[#4ecdc4] bg-[#4ecdc4]/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{goal}</span>
                      {isSelected && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#4ecdc4]">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={selectedGoals.length === 0}
                className="bg-gradient-to-r from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-white"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Timezone */}
        {step === 2 && (
          <div className="glass-strong rounded-2xl p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ffa06b]/20 to-[#4ecdc4]/20">
                <Clock className="h-5 w-5 text-[#ffa06b]" />
              </div>
              <div>
                <h2 className="font-semibold">What's your timezone?</h2>
                <p className="text-sm text-muted-foreground">This helps track your daily habits accurately</p>
              </div>
            </div>

            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
              {COMMON_TIMEZONES.map((tz) => {
                const isSelected = timezone === tz;
                // Format timezone for display
                const tzDisplay = tz.replace("_", " ");
                const offset = new Intl.DateTimeFormat("en-US", {
                  timeZone: tz,
                  timeZoneName: "shortOffset",
                }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value;

                return (
                  <button
                    key={tz}
                    onClick={() => setTimezone(tz)}
                    className={`w-full text-left rounded-xl border p-3 transition-all ${
                      isSelected
                        ? "border-[#4ecdc4] bg-[#4ecdc4]/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="block text-sm font-medium">{tzDisplay}</span>
                        <span className="text-xs text-muted-foreground">{offset}</span>
                      </div>
                      {isSelected && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#4ecdc4]">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={handleComplete}
                disabled={completeMutation.isPending}
                className="bg-gradient-to-r from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-white"
              >
                {completeMutation.isPending ? "Setting up..." : "Complete Setup"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Selected Goals Summary */}
        {step === 2 && selectedGoals.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {selectedGoals.length} goal{selectedGoals.length > 1 ? "s" : ""} selected
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
