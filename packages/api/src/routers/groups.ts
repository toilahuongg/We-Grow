import { z } from "zod";
import {
  Group,
  GroupMember,
  GroupHabit,
  Habit,
  HabitCompletion,
} from "@we-grow/db/models/index";
import { generateId } from "@we-grow/db/utils/id";

import { ORPCError } from "@orpc/server";

import { protectedProcedure } from "../index";
import { requireGroupRole } from "../middlewares/group-auth";
import { generateInviteCode } from "../lib/invite-code";
import { getUserInfoMap } from "../lib/user-lookup";

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

  getById: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .handler(async ({ context, input }) => {
      await requireGroupRole(context.session.user.id, input.groupId, ["owner", "moderator", "member"]);

      const group = await Group.findById(input.groupId);
      if (!group) return null;

      const members = await GroupMember.find({
        groupId: input.groupId,
        status: { $in: ["active", "pending"] },
      });

      const userInfoMap = await getUserInfoMap(members.map((m) => m.userId as string));
      const enrichedMembers = members.map((m) => {
        const info = userInfoMap.get(m.userId as string);
        return {
          ...m.toObject(),
          userName: info?.name ?? "Unknown",
          userImage: info?.image ?? null,
        };
      });

      return { ...group.toObject(), members: enrichedMembers };
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

  update: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      await requireGroupRole(context.session.user.id, input.groupId, ["owner"]);
      const { groupId, ...updates } = input;
      return Group.findByIdAndUpdate(
        groupId,
        { ...updates, updatedAt: new Date() },
        { new: true },
      );
    }),

  delete: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .handler(async ({ context, input }) => {
      await requireGroupRole(context.session.user.id, input.groupId, ["owner"]);
      await Habit.updateMany(
        { groupId: input.groupId },
        { archived: true, updatedAt: new Date() },
      );
      await GroupMember.deleteMany({ groupId: input.groupId });
      await GroupHabit.deleteMany({ groupId: input.groupId });
      await Group.deleteOne({ _id: input.groupId });
      return { success: true };
    }),

  regenerateInviteCode: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .handler(async ({ context, input }) => {
      await requireGroupRole(context.session.user.id, input.groupId, ["owner"]);
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

          // Re-create habits for rejoining member
          const groupHabits = await GroupHabit.find({ groupId: group._id });
          for (const gh of groupHabits) {
            const existingHabit = await Habit.findOne({
              userId,
              groupHabitId: gh._id as string,
            });
            if (!existingHabit) {
              await Habit.create({
                _id: generateId(),
                userId,
                groupId: group._id as string,
                groupHabitId: gh._id as string,
                title: gh.title,
                description: gh.description,
                frequency: gh.frequency,
                targetDays: gh.targetDays,
                weeklyTarget: gh.weeklyTarget,
                createdAt: now,
                updatedAt: now,
              });
            } else if (existingHabit.archived) {
              existingHabit.archived = false;
              existingHabit.updatedAt = now;
              await existingHabit.save();
            }
          }

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

      // Auto-create habits for new member from existing group habits
      const groupHabits = await GroupHabit.find({ groupId: group._id });
      for (const gh of groupHabits) {
        await Habit.create({
          _id: generateId(),
          userId,
          groupId: group._id as string,
          groupHabitId: gh._id as string,
          title: gh.title,
          description: gh.description,
          frequency: gh.frequency,
          targetDays: gh.targetDays,
          weeklyTarget: gh.weeklyTarget,
          createdAt: now,
          updatedAt: now,
        });
      }

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

  approveMember: protectedProcedure
    .input(z.object({ groupId: z.string(), userId: z.string() }))
    .handler(async ({ context, input }) => {
      await requireGroupRole(context.session.user.id, input.groupId, ["owner", "moderator"]);
      const member = await GroupMember.findOneAndUpdate(
        { groupId: input.groupId, userId: input.userId, status: "pending" },
        { status: "active", updatedAt: new Date() },
        { new: true },
      );
      return { success: !!member };
    }),

  removeMember: protectedProcedure
    .input(z.object({ groupId: z.string(), userId: z.string() }))
    .handler(async ({ context, input }) => {
      const caller = await requireGroupRole(context.session.user.id, input.groupId, ["owner", "moderator"]);
      if (input.userId === context.session.user.id) {
        throw new Error("Cannot remove yourself");
      }

      // Prevent moderator from removing owner or other moderators
      const target = await GroupMember.findOne({
        groupId: input.groupId,
        userId: input.userId,
        status: "active",
      });
      if (target && caller.role === "moderator" && target.role !== "member") {
        throw new ORPCError("FORBIDDEN", {
          message: "Moderators can only remove members",
        });
      }

      const member = await GroupMember.findOneAndUpdate(
        { groupId: input.groupId, userId: input.userId },
        { status: "removed", updatedAt: new Date() },
        { new: true },
      );
      return { success: !!member };
    }),

  changeMemberRole: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        userId: z.string(),
        role: z.enum(["moderator", "member"]),
      }),
    )
    .handler(async ({ context, input }) => {
      await requireGroupRole(context.session.user.id, input.groupId, ["owner"]);

      // Prevent owner from changing their own role
      if (input.userId === context.session.user.id) {
        throw new Error("Cannot change your own role");
      }

      const member = await GroupMember.findOneAndUpdate(
        { groupId: input.groupId, userId: input.userId, status: "active" },
        { role: input.role, updatedAt: new Date() },
        { new: true },
      );
      return { success: !!member };
    }),

  createGroupHabit: protectedProcedure
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
      await requireGroupRole(context.session.user.id, input.groupId, ["owner", "moderator"]);

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
          groupId: input.groupId,
          groupHabitId: groupHabit._id as string,
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

  listGroupHabits: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .handler(async ({ context, input }) => {
      await requireGroupRole(context.session.user.id, input.groupId, ["owner", "moderator", "member"]);
      return GroupHabit.find({ groupId: input.groupId }).sort({ createdAt: -1 });
    }),

  updateGroupHabit: protectedProcedure
    .input(
      z.object({
        groupHabitId: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const groupHabit = await GroupHabit.findById(input.groupHabitId);
      if (!groupHabit) throw new Error("Group habit not found");

      await requireGroupRole(context.session.user.id, groupHabit.groupId as string, ["owner", "moderator"]);

      const { groupHabitId, ...updates } = input;
      const now = new Date();

      const updated = await GroupHabit.findByIdAndUpdate(
        groupHabitId,
        { ...updates, updatedAt: now },
        { new: true },
      );

      // Sync title/description to individual member habits
      await Habit.updateMany(
        { groupHabitId },
        { ...updates, updatedAt: now },
      );

      return updated;
    }),

  deleteGroupHabit: protectedProcedure
    .input(z.object({ groupHabitId: z.string() }))
    .handler(async ({ context, input }) => {
      const groupHabit = await GroupHabit.findById(input.groupHabitId);
      if (!groupHabit) throw new Error("Group habit not found");

      await requireGroupRole(context.session.user.id, groupHabit.groupId as string, ["owner", "moderator"]);

      // Archive individual habits (preserve completion history)
      await Habit.updateMany(
        { groupHabitId: input.groupHabitId },
        { archived: true, updatedAt: new Date() },
      );

      await GroupHabit.deleteOne({ _id: input.groupHabitId });
      return { success: true };
    }),

  getMemberProgress: protectedProcedure
    .input(z.object({ groupId: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }))
    .handler(async ({ context, input }) => {
      await requireGroupRole(context.session.user.id, input.groupId, ["owner", "moderator", "member"]);
      const date = input.date ?? getDateStr(new Date());

      const members = await GroupMember.find({
        groupId: input.groupId,
        status: "active",
      });

      const userInfoMap = await getUserInfoMap(members.map((m) => m.userId as string));

      const progress = await Promise.all(
        members.map(async (member) => {
          const habits = await Habit.find({ userId: member.userId, groupId: input.groupId, archived: false });
          const completions = await HabitCompletion.find({
            userId: member.userId,
            date,
            habitId: { $in: habits.map((h) => h._id) },
          });

          const info = userInfoMap.get(member.userId as string);
          return {
            userId: member.userId,
            userName: info?.name ?? "Unknown",
            userImage: info?.image ?? null,
            role: member.role,
            totalHabits: habits.length,
            completedHabits: completions.length,
          };
        }),
      );

      return progress;
    }),
};
