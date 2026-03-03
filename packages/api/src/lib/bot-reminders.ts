import { TelegramLink, GroupMember, Habit, HabitCompletion } from "@we-grow/db/models/index";
import { getTelegramApi } from "./telegram";

function getDateStr(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

function getCurrentHHMM(): string {
  const now = new Date();
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

async function getIncompleteHabitsText(userIds: string[], today: string): Promise<string> {
  const allHabits = await (Habit as any).find({
    userId: { $in: userIds },
    archived: false,
  });

  if (allHabits.length === 0) return "";

  const completions = await (HabitCompletion as any).find({
    userId: { $in: userIds },
    date: today,
    habitId: { $in: allHabits.map((h: { _id: unknown }) => h._id) },
  });

  const completedKeys = new Set(
    completions.map((c: { userId: unknown; habitId: unknown }) => `${c.userId}:${c.habitId}`),
  );

  const incomplete = allHabits.filter(
    (h: { userId: unknown; _id: unknown }) => !completedKeys.has(`${h.userId}:${h._id}`),
  );

  if (incomplete.length === 0) return "";

  return incomplete
    .map((h: { title: unknown }) => `⬜ ${h.title}`)
    .join("\n");
}

export async function processReminders(): Promise<{ time: string; telegramSent: number }> {
  const currentTime = getCurrentHHMM();
  const today = getDateStr(new Date());
  let telegramSent = 0;

  try {
    const api = getTelegramApi();
    if (api) {
      const telegramLinks = await (TelegramLink as any).find({
        dailyReminderEnabled: true,
        dailyReminderTime: currentTime,
      });

      for (const link of telegramLinks) {
        const groupId = link.groupId as string;
        const members = await (GroupMember as any).find({ groupId, status: "active" });
        const userIds = members.map((m: { userId: unknown }) => String(m.userId));

        const incompleteText = await getIncompleteHabitsText(userIds, today);
        if (!incompleteText) continue;

        const message = `⏰ *Nhắc nhở hàng ngày*\n\nCòn habits chưa hoàn thành:\n${incompleteText}\n\nDùng /done để hoàn thành!`;
        try {
          await api.sendMessage(link.telegramChatId as number, message, { parse_mode: "Markdown" });
          telegramSent++;
        } catch (err) {
          console.error("[Cron] Telegram reminder error:", err);
        }
      }
    }
  } catch (err) {
    console.error("[Cron] Telegram reminders error:", err);
  }

  return { time: currentTime, telegramSent };
}
