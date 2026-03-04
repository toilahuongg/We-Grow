import { z } from "zod";
import { ORPCError } from "@orpc/server";
import { Activity, Reaction } from "@we-grow/db/models/index";
import { generateId } from "@we-grow/db/utils/id";

import { protectedProcedure } from "../index";
import { requireGroupRole } from "../middlewares/group-auth";

const EMOJI_VALUES = ["fire", "clap", "heart", "star", "muscle"] as const;

export const feedRouter = {
  getGroupFeed: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        limit: z.number().min(1).max(50).optional(),
        before: z.string().datetime().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      await requireGroupRole(context.session.user.id, input.groupId, ["owner", "moderator", "member"]);

      const userId = context.session.user.id;
      const limit = input.limit ?? 20;

      const filter: Record<string, unknown> = { groupId: input.groupId };
      if (input.before) {
        filter.createdAt = { $lt: new Date(input.before) };
      }

      const activities = await Activity.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit + 1);

      const hasMore = activities.length > limit;
      const items = activities.slice(0, limit);

      // Get user's reactions for these activities
      const activityIds = items.map((a) => a._id as string);
      const userReactions = await Reaction.find({
        activityId: { $in: activityIds },
        userId,
      });

      const myReactionsByActivity = new Map<string, Set<string>>();
      for (const r of userReactions) {
        const key = r.activityId as string;
        if (!myReactionsByActivity.has(key)) {
          myReactionsByActivity.set(key, new Set());
        }
        myReactionsByActivity.get(key)!.add(r.emoji as string);
      }

      return {
        activities: items.map((a) => ({
          ...a.toObject(),
          myReactions: [...(myReactionsByActivity.get(a._id as string) ?? [])],
        })),
        hasMore,
      };
    }),

  toggleReaction: protectedProcedure
    .input(
      z.object({
        activityId: z.string(),
        emoji: z.enum(EMOJI_VALUES),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const now = new Date();

      // Verify activity exists and user has access to its group
      const activity = await Activity.findById(input.activityId);
      if (!activity) {
        throw new ORPCError("NOT_FOUND", { message: "Activity not found" });
      }
      await requireGroupRole(userId, activity.groupId as string, ["owner", "moderator", "member"]);

      const existing = await Reaction.findOne({
        activityId: input.activityId,
        userId,
        emoji: input.emoji,
      });

      if (existing) {
        // Remove reaction
        await Reaction.deleteOne({ _id: existing._id });
        await Activity.findByIdAndUpdate(input.activityId, {
          $inc: { [`reactionCounts.${input.emoji}`]: -1 },
          updatedAt: now,
        });
        return { added: false };
      } else {
        // Add reaction
        await Reaction.create({
          _id: generateId(),
          activityId: input.activityId,
          userId,
          emoji: input.emoji,
          createdAt: now,
          updatedAt: now,
        });
        await Activity.findByIdAndUpdate(input.activityId, {
          $inc: { [`reactionCounts.${input.emoji}`]: 1 },
          updatedAt: now,
        });
        return { added: true };
      }
    }),
};
