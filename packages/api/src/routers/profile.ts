import { z } from "zod";
import { UserProfile } from "@we-grow/db/models/index";
import { generateId } from "@we-grow/db/utils/id";

import { protectedProcedure } from "../index";

export const profileRouter = {
  getProfile: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    const profile = await UserProfile.findOne({ userId }).select("bio timezone gender");

    return {
      bio: (profile?.bio as string) ?? "",
      timezone: (profile?.timezone as string) ?? "UTC",
      gender: (profile?.gender as string) ?? "male",
    };
  }),

  updateBio: protectedProcedure
    .input(z.object({ bio: z.string().max(500) }))
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const now = new Date();
      await UserProfile.findOneAndUpdate(
        { userId },
        {
          $set: { bio: input.bio, updatedAt: now },
          $setOnInsert: { _id: generateId(), userId, totalXp: 0, level: 1, createdAt: now },
        },
        { upsert: true },
      );
      return { success: true };
    }),

  updateTimezone: protectedProcedure
    .input(z.object({ timezone: z.string().min(1).max(100) }))
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const now = new Date();
      await UserProfile.findOneAndUpdate(
        { userId },
        {
          $set: { timezone: input.timezone, updatedAt: now },
          $setOnInsert: { _id: generateId(), userId, totalXp: 0, level: 1, createdAt: now },
        },
        { upsert: true },
      );
      return { success: true };
    }),

  updateGender: protectedProcedure
    .input(z.object({ gender: z.enum(["male", "female"]) }))
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const now = new Date();
      await UserProfile.findOneAndUpdate(
        { userId },
        {
          $set: { gender: input.gender, updatedAt: now },
          $setOnInsert: { _id: generateId(), userId, totalXp: 0, level: 1, createdAt: now },
        },
        { upsert: true },
      );
      return { success: true };
    }),
};
