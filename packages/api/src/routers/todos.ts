import { z } from "zod";
import { Todo, UserProfile, XpTransaction } from "@we-grow/db/models/index";
import { generateId } from "@we-grow/db/utils/id";

import { protectedProcedure } from "../index";
import { XP_REWARDS, getLevelFromXp } from "../lib/xp";

const XP_BY_PRIORITY: Record<string, number> = {
  normal: XP_REWARDS.TODO_NORMAL,
  important: XP_REWARDS.TODO_IMPORTANT,
  urgent: XP_REWARDS.TODO_URGENT,
};

export const todosRouter = {
  list: protectedProcedure
    .input(
      z.object({
        completed: z.boolean().optional(),
        priority: z.enum(["normal", "important", "urgent"]).optional(),
      }).optional(),
    )
    .handler(async ({ context, input }) => {
      const filter: Record<string, unknown> = { userId: context.session.user.id };
      if (input?.completed !== undefined) {
        filter.completed = input.completed;
      }
      if (input?.priority) {
        filter.priority = input.priority;
      }
      return Todo.find(filter).sort({ createdAt: -1 });
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        priority: z.enum(["normal", "important", "urgent"]).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const now = new Date();
      return Todo.create({
        _id: generateId(),
        userId: context.session.user.id,
        title: input.title,
        description: input.description ?? "",
        priority: input.priority ?? "normal",
        createdAt: now,
        updatedAt: now,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        todoId: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        priority: z.enum(["normal", "important", "urgent"]).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const { todoId, ...updates } = input;
      return Todo.findOneAndUpdate(
        { _id: todoId, userId: context.session.user.id },
        { ...updates, updatedAt: new Date() },
        { new: true },
      );
    }),

  delete: protectedProcedure
    .input(z.object({ todoId: z.string() }))
    .handler(async ({ context, input }) => {
      await Todo.deleteOne({ _id: input.todoId, userId: context.session.user.id });
      return { success: true };
    }),

  complete: protectedProcedure
    .input(z.object({ todoId: z.string() }))
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const now = new Date();

      const todo = await Todo.findOne({ _id: input.todoId, userId });
      if (!todo) {
        throw new Error("Todo not found");
      }
      if (todo.completed) {
        return { success: true, alreadyCompleted: true };
      }

      todo.completed = true;
      todo.completedAt = now;
      todo.updatedAt = now;
      await todo.save();

      const xpAmount = XP_BY_PRIORITY[todo.priority ?? "normal"] ?? XP_REWARDS.TODO_NORMAL;

      await XpTransaction.create({
        _id: generateId(),
        userId,
        amount: xpAmount,
        source: "todo_completion",
        sourceId: todo._id,
        description: `Completed todo: ${todo.title}`,
        createdAt: now,
        updatedAt: now,
      });

      const profile = await UserProfile.findOne({ userId });
      if (profile) {
        profile.totalXp = (profile.totalXp ?? 0) + xpAmount;
        profile.level = getLevelFromXp(profile.totalXp);
        profile.updatedAt = now;
        await profile.save();
      }

      return { success: true, alreadyCompleted: false, xpAwarded: xpAmount };
    }),

  uncomplete: protectedProcedure
    .input(z.object({ todoId: z.string() }))
    .handler(async ({ context, input }) => {
      const todo = await Todo.findOne({
        _id: input.todoId,
        userId: context.session.user.id,
      });
      if (!todo || !todo.completed) {
        return { success: true, wasCompleted: false };
      }

      todo.completed = false;
      todo.completedAt = null;
      todo.updatedAt = new Date();
      await todo.save();

      return { success: true, wasCompleted: true };
    }),
};
