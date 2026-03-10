import { z } from "zod";
import { UserProfile, XpTransaction, GroupMember, Habit, UserBadge } from "@we-grow/db/models/index";

import { protectedProcedure } from "../index";
import { requireGroupRole } from "../middlewares/group-auth";
import { getProgressToNextLevel, getLevelInfo } from "../lib/xp";
import { getUserInfoMap } from "../lib/user-lookup";

export const gamificationRouter = {
  getProfile: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    const profile = await UserProfile.findOne({ userId });

    if (!profile) {
      const levelInfo = getLevelInfo(1);
      return {
        totalXp: 0,
        level: 1,
        currentLevel: 1,
        currentLevelXp: 0,
        nextLevelXp: 100,
        progressXp: 0,
        levelInfo,
        gender: "male", // Default
      };
    }

    const progress = getProgressToNextLevel(profile.totalXp ?? 0);
    const levelInfo = getLevelInfo(profile.level ?? 1);
    return {
      totalXp: profile.totalXp,
      level: profile.level,
      ...progress,
      levelInfo,
      gender: profile.gender ?? "male",
    };
  }),

  getBadges: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    const badges = await UserBadge.find({ userId }).sort({ level: 1 });
    return badges;
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
        .select("userId totalXp level gender");
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

      const memberIds = members.map((m) => m.userId as string);

      // Bulk fetch profiles and habits — avoids N+1 queries
      const [profiles, habits] = await Promise.all([
        UserProfile.find({ userId: { $in: memberIds } }),
        Habit.find({ userId: { $in: memberIds }, archived: false }),
      ]);

      const profileMap = new Map(profiles.map((p) => [p.userId as string, p]));
      const streakMap = new Map<string, number>();
      for (const h of habits) {
        const uid = h.userId as string;
        streakMap.set(uid, Math.max(streakMap.get(uid) ?? 0, h.currentStreak ?? 0));
      }

      const leaderboard = members.map((member) => {
        const uid = member.userId as string;
        const profile = profileMap.get(uid);
        const info = userInfoMap.get(uid);
        const memberLevel = profile?.level ?? 1;
        return {
          userId: member.userId,
          userName: info?.name ?? "Unknown",
          userImage: info?.image ?? null,
          role: member.role,
          totalXp: profile?.totalXp ?? 0,
          level: memberLevel,
          levelInfo: getLevelInfo(memberLevel),
          gender: profile?.gender ?? "male",
          bestStreak: streakMap.get(uid) ?? 0,
        };
      });

      return leaderboard.sort((a, b) => b.totalXp - a.totalXp);
    }),
};
