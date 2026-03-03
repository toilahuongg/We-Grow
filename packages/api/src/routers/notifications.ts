import { z } from "zod";
import { PushSubscription, Reminder } from "@we-grow/db/models/index";
import { generateId } from "@we-grow/db/utils/id";
import { env } from "@we-grow/env/server";

import { protectedProcedure } from "../index";

export const notificationsRouter = {
  subscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        keys: z.object({
          p256dh: z.string(),
          auth: z.string(),
        }),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const now = new Date();

      const existing = await PushSubscription.findOne({ endpoint: input.endpoint });
      if (existing) {
        existing.userId = userId;
        existing.keys = input.keys;
        existing.updatedAt = now;
        await existing.save();
        return { success: true };
      }

      await PushSubscription.create({
        _id: generateId(),
        userId,
        endpoint: input.endpoint,
        keys: input.keys,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true };
    }),

  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string().url() }))
    .handler(async ({ context, input }) => {
      await PushSubscription.deleteOne({
        endpoint: input.endpoint,
        userId: context.session.user.id,
      });
      return { success: true };
    }),

  getVapidPublicKey: protectedProcedure.handler(() => {
    return { vapidPublicKey: env.VAPID_PUBLIC_KEY };
  }),

  listReminders: protectedProcedure.handler(async ({ context }) => {
    return Reminder.find({ userId: context.session.user.id }).sort({ time: 1 });
  }),

  createReminder: protectedProcedure
    .input(
      z.object({
        habitId: z.string().optional(),
        time: z.string().regex(/^\d{2}:\d{2}$/),
        enabled: z.boolean().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const now = new Date();
      return Reminder.create({
        _id: generateId(),
        userId: context.session.user.id,
        habitId: input.habitId ?? null,
        time: input.time,
        enabled: input.enabled ?? true,
        createdAt: now,
        updatedAt: now,
      });
    }),

  updateReminder: protectedProcedure
    .input(
      z.object({
        reminderId: z.string(),
        time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        enabled: z.boolean().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const { reminderId, ...updates } = input;
      return Reminder.findOneAndUpdate(
        { _id: reminderId, userId: context.session.user.id },
        { ...updates, updatedAt: new Date() },
        { new: true },
      );
    }),

  deleteReminder: protectedProcedure
    .input(z.object({ reminderId: z.string() }))
    .handler(async ({ context, input }) => {
      await Reminder.deleteOne({
        _id: input.reminderId,
        userId: context.session.user.id,
      });
      return { success: true };
    }),
};
