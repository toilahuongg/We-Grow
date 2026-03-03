import { z } from "zod";
import { UserProfile } from "@we-grow/db/models/index";

import { protectedProcedure } from "../index";

export const profileRouter = {
  getProfile: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    const profile = await UserProfile.findOne({ userId }).select("bio timezone");

    return {
      bio: (profile?.bio as string) ?? "",
      timezone: (profile?.timezone as string) ?? "UTC",
    };
  }),

  updateBio: protectedProcedure
    .input(z.object({ bio: z.string().max(500) }))
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      await UserProfile.updateOne(
        { userId },
        { $set: { bio: input.bio, updatedAt: new Date() } },
      );
      return { success: true };
    }),

  updateTimezone: protectedProcedure
    .input(z.object({ timezone: z.string().min(1).max(100) }))
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      await UserProfile.updateOne(
        { userId },
        { $set: { timezone: input.timezone, updatedAt: new Date() } },
      );
      return { success: true };
    }),
};
