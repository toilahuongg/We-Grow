import { z } from "zod";
import { randomBytes } from "crypto";
import { TelegramLink, TelegramUserLink } from "@we-grow/db/models/index";
import { generateId } from "@we-grow/db/utils/id";

import { protectedProcedure } from "../index";
import { requireGroupRole } from "../middlewares/group-auth";
import { isTelegramConfigured } from "../lib/telegram";

export const telegramRouter = {
  isConfigured: protectedProcedure.handler(() => {
    return { configured: isTelegramConfigured() };
  }),

  generateLinkToken: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    const now = new Date();
    const token = randomBytes(3).toString("hex").toUpperCase(); // 6-char token
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    let userLink = await (TelegramUserLink as any).findOne({ userId });
    if (userLink) {
      userLink.linkToken = token;
      userLink.linkTokenExpiresAt = expiresAt;
      userLink.updatedAt = now;
      await userLink.save();
    } else {
      await (TelegramUserLink as any).create({
        _id: generateId(),
        userId,
        telegramUserId: 0, // placeholder until actual link
        linkToken: token,
        linkTokenExpiresAt: expiresAt,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { token, expiresAt: expiresAt.toISOString() };
  }),

  getLinkStatus: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    const userLink = await (TelegramUserLink as any).findOne({ userId });
    if (!userLink || !userLink.telegramUserId || userLink.telegramUserId === 0) {
      return { linked: false };
    }
    return {
      linked: true,
      telegramUsername: userLink.telegramUsername ?? null,
    };
  }),

  unlinkAccount: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    await (TelegramUserLink as any).deleteOne({ userId });
    return { success: true };
  }),

  getGroupStatus: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .handler(async ({ context, input }) => {
      await requireGroupRole(context.session.user.id, input.groupId, ["owner", "moderator"]);
      const link = await (TelegramLink as any).findOne({ groupId: input.groupId });
      if (!link) {
        return { connected: false };
      }
      return {
        connected: true,
        chatTitle: link.telegramChatTitle ?? null,
        notifyActivities: link.notifyActivities ?? true,
        dailyReminderEnabled: link.dailyReminderEnabled ?? false,
        dailyReminderTime: (link.dailyReminderTime as string) ?? "08:00",
      };
    }),

  updateGroupSettings: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        notifyActivities: z.boolean().optional(),
        dailyReminderEnabled: z.boolean().optional(),
        dailyReminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      await requireGroupRole(context.session.user.id, input.groupId, ["owner", "moderator"]);
      const link = await (TelegramLink as any).findOne({ groupId: input.groupId });
      if (!link) {
        throw new Error("Telegram not connected for this group");
      }

      if (input.notifyActivities !== undefined) link.notifyActivities = input.notifyActivities;
      if (input.dailyReminderEnabled !== undefined) link.dailyReminderEnabled = input.dailyReminderEnabled;
      if (input.dailyReminderTime !== undefined) link.dailyReminderTime = input.dailyReminderTime;
      link.updatedAt = new Date();
      await link.save();

      return { success: true };
    }),

  disconnectGroup: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .handler(async ({ context, input }) => {
      await requireGroupRole(context.session.user.id, input.groupId, ["owner", "moderator"]);
      await (TelegramLink as any).deleteOne({ groupId: input.groupId });
      return { success: true };
    }),
};
