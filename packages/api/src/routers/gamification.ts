import { z } from "zod";
import { UserProfile, XpTransaction, GroupMember, Habit } from "@we-grow/db/models/index";

import { protectedProcedure } from "../index";
import { requireGroupRole } from "../middlewares/group-auth";
import { getProgressToNextLevel } from "../lib/xp";
import { getUserInfoMap } from "../lib/user-lookup";

export const gamificationRouter = {
  getProfile: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    const profile = await UserProfile.findOne({ userId });

    if (!profile) {
      return {
        totalXp: 0,
        level: 1,
        currentLevel: 1,
        currentLevelXp: 0,
        nextLevelXp: 100,
        progressXp: 0,
      };
    }

    const progress = getProgressToNextLevel(profile.totalXp ?? 0);
    return {
      totalXp: profile.totalXp,
      level: profile.level,
      ...progress,
    };
  }),

  getXpHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
      }).optional(),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;

      const [transactions, total] = await Promise.all([
        XpTransaction.find({ userId })
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit),
        XpTransaction.countDocuments({ userId }),
      ]);

      return { transactions, total, limit, offset };
    }),

  getGlobalLeaderboard: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).optional(),
      }).optional(),
    )
    .handler(async ({ input }) => {
      const limit = input?.limit ?? 20;

      return UserProfile.find()
        .sort({ totalXp: -1, level: -1 })
        .limit(limit)
        .select("userId totalXp level");
    }),

  getGroupLeaderboard: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .handler(async ({ context, input }) => {
      await requireGroupRole(context.session.user.id, input.groupId, ["owner", "moderator", "member"]);
      const members = await GroupMember.find({
        groupId: input.groupId,
        status: "active",
      });

      const userInfoMap = await getUserInfoMap(members.map((m) => m.userId as string));

      const leaderboard = await Promise.all(
        members.map(async (member) => {
          const [profile, habits] = await Promise.all([
            UserProfile.findOne({ userId: member.userId }),
            Habit.find({ userId: member.userId, archived: false }),
          ]);

          const maxStreak = habits.reduce(
            (max, h) => Math.max(max, h.currentStreak ?? 0),
            0,
          );

          const info = userInfoMap.get(member.userId as string);
          return {
            userId: member.userId,
            userName: info?.name ?? "Unknown",
            userImage: info?.image ?? null,
            role: member.role,
            totalXp: profile?.totalXp ?? 0,
            level: profile?.level ?? 1,
            bestStreak: maxStreak,
          };
        }),
      );

      return leaderboard.sort((a, b) => b.totalXp - a.totalXp);
    }),
};
