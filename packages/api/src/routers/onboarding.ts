import { z } from "zod";
import { generateId } from "@we-grow/db/utils/id";
import { UserProfile, XpTransaction } from "@we-grow/db/models/index";

import { protectedProcedure } from "../index";
import { XP_REWARDS, getLevelFromXp } from "../lib/xp";

export const onboardingRouter = {
  getStatus: protectedProcedure.handler(async ({ context }) => {
    const profile = await UserProfile.findOne({
      userId: context.session.user.id,
    });
    return {
      completed: profile?.onboardingCompleted ?? false,
      goals: profile?.goals ?? [],
      timezone: profile?.timezone ?? "UTC",
    };
  }),

  complete: protectedProcedure
    .input(
      z.object({
        goals: z.array(z.string()).min(1),
        timezone: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const now = new Date();

      let profile = await UserProfile.findOne({ userId });

      if (profile?.onboardingCompleted) {
        return { success: true, alreadyCompleted: true };
      }

      const xpAmount = XP_REWARDS.ONBOARDING;

      if (profile) {
        profile.goals = input.goals;
        profile.timezone = input.timezone;
        profile.onboardingCompleted = true;
        profile.totalXp = (profile.totalXp ?? 0) + xpAmount;
        profile.level = getLevelFromXp(profile.totalXp);
        profile.updatedAt = now;
        await profile.save();
      } else {
        profile = await UserProfile.create({
          _id: generateId(),
          userId,
          goals: input.goals,
          timezone: input.timezone,
          onboardingCompleted: true,
          totalXp: xpAmount,
          level: getLevelFromXp(xpAmount),
          createdAt: now,
          updatedAt: now,
        });
      }

      await XpTransaction.create({
        _id: generateId(),
        userId,
        amount: xpAmount,
        source: "onboarding",
        description: "Completed onboarding",
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, alreadyCompleted: false };
    }),
};
