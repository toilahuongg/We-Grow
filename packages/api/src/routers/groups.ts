import { z } from "zod";
import {
  Group,
  GroupMember,
  GroupHabit,
  Habit,
  HabitCompletion,
} from "@we-grow/db/models/index";
import { generateId } from "@we-grow/db/utils/id";

import {
  protectedProcedure,
  groupMemberProcedure,
  groupModeratorProcedure,
  groupOwnerProcedure,
} from "../index";
import { generateInviteCode } from "../lib/invite-code";

function getDateStr(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

export const groupsRouter = {
  listMy: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    const memberships = await GroupMember.find({ userId, status: "active" });
    const groupIds = memberships.map((m) => m.groupId);
    return Group.find({ _id: { $in: groupIds } });
  }),

  getById: groupMemberProcedure
    .input(z.object({ groupId: z.string() }))
    .handler(async ({ input }) => {
      const group = await Group.findById(input.groupId);
      if (!group) return null;

      const members = await GroupMember.find({
        groupId: input.groupId,
        status: { $in: ["active", "pending"] },
      });

      return { ...group.toObject(), members };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        mode: z.enum(["together", "share"]),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const now = new Date();

      let inviteCode = generateInviteCode();
      while (await Group.findOne({ inviteCode })) {
        inviteCode = generateInviteCode();
      }

      const group = await Group.create({
        _id: generateId(),
        name: input.name,
        description: input.description ?? "",
        mode: input.mode,
        inviteCode,
        ownerId: userId,
        createdAt: now,
        updatedAt: now,
      });

      await GroupMember.create({
        _id: generateId(),
        groupId: group._id,
        userId,
        role: "owner",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });

      return group;
    }),

  update: groupOwnerProcedure
    .input(
      z.object({
        groupId: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { groupId, ...updates } = input;
      return Group.findByIdAndUpdate(
        groupId,
        { ...updates, updatedAt: new Date() },
        { new: true },
      );
    }),

  delete: groupOwnerProcedure
    .input(z.object({ groupId: z.string() }))
    .handler(async ({ input }) => {
      await GroupMember.deleteMany({ groupId: input.groupId });
      await GroupHabit.deleteMany({ groupId: input.groupId });
      await Group.deleteOne({ _id: input.groupId });
      return { success: true };
    }),

  regenerateInviteCode: groupOwnerProcedure
    .input(z.object({ groupId: z.string() }))
    .handler(async ({ input }) => {
      let inviteCode = generateInviteCode();
      while (await Group.findOne({ inviteCode })) {
        inviteCode = generateInviteCode();
      }
      const group = await Group.findByIdAndUpdate(
        input.groupId,
        { inviteCode, updatedAt: new Date() },
        { new: true },
      );
      return { inviteCode: group?.inviteCode };
    }),

  lookupByInviteCode: protectedProcedure
    .input(z.object({ inviteCode: z.string() }))
    .handler(async ({ input }) => {
      const group = await Group.findOne({ inviteCode: input.inviteCode });
      if (!group) return null;

      const memberCount = await GroupMember.countDocuments({
        groupId: group._id,
        status: "active",
      });

      return {
        _id: group._id,
        name: group.name,
        description: group.description,
        mode: group.mode,
        memberCount,
      };
    }),

  join: protectedProcedure
    .input(z.object({ inviteCode: z.string() }))
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const now = new Date();

      const group = await Group.findOne({ inviteCode: input.inviteCode });
      if (!group) {
        throw new Error("Invalid invite code");
      }

      const existing = await GroupMember.findOne({
        groupId: group._id,
        userId,
      });
      if (existing) {
        if (existing.status === "removed") {
          existing.status = "active";
          existing.updatedAt = now;
          await existing.save();
          return { success: true, status: "active" };
        }
        return { success: true, status: existing.status };
      }

      const member = await GroupMember.create({
        _id: generateId(),
        groupId: group._id,
        userId,
        role: "member",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, status: member.status };
    }),

  leave: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;

      const group = await Group.findById(input.groupId);
      if (group?.ownerId === userId) {
        throw new Error("Owner cannot leave the group. Transfer ownership or delete the group.");
      }

      await GroupMember.findOneAndUpdate(
        { groupId: input.groupId, userId },
        { status: "removed", updatedAt: new Date() },
      );

      return { success: true };
    }),

  approveMember: groupModeratorProcedure
    .input(z.object({ groupId: z.string(), userId: z.string() }))
    .handler(async ({ input }) => {
      const member = await GroupMember.findOneAndUpdate(
        { groupId: input.groupId, userId: input.userId, status: "pending" },
        { status: "active", updatedAt: new Date() },
        { new: true },
      );
      return { success: !!member };
    }),

  removeMember: groupModeratorProcedure
    .input(z.object({ groupId: z.string(), userId: z.string() }))
    .handler(async ({ input, context }) => {
      if (input.userId === context.session.user.id) {
        throw new Error("Cannot remove yourself");
      }
      const member = await GroupMember.findOneAndUpdate(
        { groupId: input.groupId, userId: input.userId },
        { status: "removed", updatedAt: new Date() },
        { new: true },
      );
      return { success: !!member };
    }),

  changeMemberRole: groupOwnerProcedure
    .input(
      z.object({
        groupId: z.string(),
        userId: z.string(),
        role: z.enum(["moderator", "member"]),
      }),
    )
    .handler(async ({ input }) => {
      const member = await GroupMember.findOneAndUpdate(
        { groupId: input.groupId, userId: input.userId, status: "active" },
        { role: input.role, updatedAt: new Date() },
        { new: true },
      );
      return { success: !!member };
    }),

  createGroupHabit: groupModeratorProcedure
    .input(
      z.object({
        groupId: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        frequency: z.enum(["daily", "weekly", "specific_days"]),
        targetDays: z.array(z.number().min(0).max(6)).optional(),
        weeklyTarget: z.number().min(1).max(7).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const group = await Group.findById(input.groupId);
      if (group?.mode !== "together") {
        throw new Error("Group habits can only be created in 'together' mode groups");
      }

      const now = new Date();
      const groupHabit = await GroupHabit.create({
        _id: generateId(),
        groupId: input.groupId,
        title: input.title,
        description: input.description ?? "",
        frequency: input.frequency,
        targetDays: input.targetDays ?? [],
        weeklyTarget: input.weeklyTarget ?? 1,
        createdBy: context.session.user.id,
        createdAt: now,
        updatedAt: now,
      });

      const members = await GroupMember.find({
        groupId: input.groupId,
        status: "active",
      });

      for (const member of members) {
        await Habit.create({
          _id: generateId(),
          userId: member.userId,
          title: input.title,
          description: input.description ?? "",
          frequency: input.frequency,
          targetDays: input.targetDays ?? [],
          weeklyTarget: input.weeklyTarget ?? 1,
          createdAt: now,
          updatedAt: now,
        });
      }

      return groupHabit;
    }),

  getMemberProgress: groupMemberProcedure
    .input(z.object({ groupId: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }))
    .handler(async ({ input }) => {
      const date = input.date ?? getDateStr(new Date());

      const members = await GroupMember.find({
        groupId: input.groupId,
        status: "active",
      });

      const progress = await Promise.all(
        members.map(async (member) => {
          const habits = await Habit.find({ userId: member.userId, archived: false });
          const completions = await HabitCompletion.find({
            userId: member.userId,
            date,
            habitId: { $in: habits.map((h) => h._id) },
          });

          return {
            userId: member.userId,
            role: member.role,
            totalHabits: habits.length,
            completedHabits: completions.length,
          };
        }),
      );

      return progress;
    }),
};
