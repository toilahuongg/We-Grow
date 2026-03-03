import { TelegramLink } from "@we-grow/db/models/index";
import { getTelegramApi } from "./telegram";

type ActivityType = "habit_completed" | "streak_milestone" | "level_up" | "all_habits_completed" | "member_joined";

function formatActivityMessage(userName: string, type: ActivityType, metadata: Record<string, unknown>): string {
  switch (type) {
    case "habit_completed":
      return `✅ *${userName}* hoàn thành habit *${metadata.habitTitle ?? ""}*`;
    case "streak_milestone":
      return `🔥 *${userName}* đạt streak *${metadata.streak} ngày* cho *${metadata.habitTitle ?? ""}*!`;
    case "level_up":
      return `🎉 *${userName}* lên *Level ${metadata.level}*!`;
    case "all_habits_completed":
      return `🌟 *${userName}* hoàn thành tất cả habits hôm nay!`;
    case "member_joined":
      return `👋 *${userName}* vừa tham gia group!`;
    default:
      return `📢 *${userName}* có hoạt động mới.`;
  }
}

export async function sendTelegramActivityNotification(
  groupId: string,
  userName: string,
  type: ActivityType,
  metadata: Record<string, unknown> = {},
) {
  try {
    const api = getTelegramApi();
    if (!api) return;

    const link = await (TelegramLink as any).findOne({ groupId });
    if (!link || !link.notifyActivities) return;

    const message = formatActivityMessage(userName, type, metadata);
    await api.sendMessage(link.telegramChatId as number, message, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("[Telegram] Notification error:", err);
  }
}
