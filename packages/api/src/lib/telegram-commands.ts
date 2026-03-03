import { TelegramLink, TelegramUserLink, Habit, HabitCompletion, UserProfile, GroupMember } from "@we-grow/db/models/index";
import { generateId } from "@we-grow/db/utils/id";
import { getTelegramApi } from "./telegram";
import { completeHabitForUser } from "./habit-completion";
import { getLevelInfo, getProgressToNextLevel } from "./xp";
import { getUserInfoMap } from "./user-lookup";

function getDateStr(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

async function reply(chatId: number, text: string) {
  const api = getTelegramApi();
  if (!api) return;
  await api.sendMessage(chatId, text, { parse_mode: "Markdown" });
}

export async function handleStart(chatId: number, isGroup: boolean) {
  if (isGroup) {
    await reply(chatId,
      "🌱 *We Grow Bot*\n\n" +
      "Xin chào! Tôi giúp nhóm theo dõi habits.\n\n" +
      "Dùng `/connect <invite-code>` để kết nối với group We Grow.\n" +
      "Dùng `/help` để xem danh sách lệnh."
    );
  } else {
    await reply(chatId,
      "🌱 *We Grow Bot*\n\n" +
      "Xin chào! Dùng `/link <token>` để liên kết tài khoản We Grow.\n" +
      "Lấy token từ Settings → Connected Accounts trên web."
    );
  }
}

export async function handleLink(chatId: number, telegramUserId: number, telegramUsername: string | undefined, token: string) {
  if (!token) {
    await reply(chatId, "❌ Vui lòng nhập token: `/link <token>`");
    return;
  }

  const userLink = await (TelegramUserLink as any).findOne({
    linkToken: token.toUpperCase(),
    linkTokenExpiresAt: { $gt: new Date() },
  });

  if (!userLink) {
    await reply(chatId, "❌ Token không hợp lệ hoặc đã hết hạn. Vui lòng tạo token mới từ web.");
    return;
  }

  // Check if this telegram user is already linked to another account
  const existingLink = await (TelegramUserLink as any).findOne({ telegramUserId });
  if (existingLink && existingLink._id !== userLink._id) {
    await reply(chatId, "❌ Tài khoản Telegram này đã được liên kết với một tài khoản khác.");
    return;
  }

  userLink.telegramUserId = telegramUserId;
  userLink.telegramUsername = telegramUsername ?? null;
  userLink.linkToken = null;
  userLink.linkTokenExpiresAt = null;
  userLink.updatedAt = new Date();
  await userLink.save();

  await reply(chatId, "✅ Liên kết tài khoản thành công! Bạn có thể sử dụng bot trong group chat.");
}

export async function handleConnect(chatId: number, chatTitle: string | undefined, telegramUserId: number, inviteCode: string) {
  if (!inviteCode) {
    await reply(chatId, "❌ Vui lòng nhập invite code: `/connect <invite-code>`");
    return;
  }

  // Find the user link
  const userLink = await (TelegramUserLink as any).findOne({ telegramUserId });
  if (!userLink) {
    await reply(chatId, "❌ Bạn chưa liên kết tài khoản. Gửi `/link <token>` cho bot trong DM trước.");
    return;
  }

  const userId = userLink.userId as string;

  // Find group by invite code
  const { Group } = await import("@we-grow/db/models/index");
  const group = await (Group as any).findOne({ inviteCode: inviteCode.toUpperCase() });
  if (!group) {
    await reply(chatId, "❌ Invite code không hợp lệ.");
    return;
  }

  // Check if user is owner/moderator
  const member = await (GroupMember as any).findOne({
    groupId: group._id,
    userId,
    status: "active",
  });
  if (!member || !["owner", "moderator"].includes(member.role as string)) {
    await reply(chatId, "❌ Chỉ owner/moderator mới có thể kết nối bot.");
    return;
  }

  // Check if already connected
  const existingLink = await (TelegramLink as any).findOne({ groupId: group._id });
  if (existingLink) {
    await reply(chatId, "❌ Group này đã được kết nối với một Telegram chat khác.");
    return;
  }

  const now = new Date();
  await (TelegramLink as any).create({
    _id: generateId(),
    groupId: group._id,
    telegramChatId: chatId,
    telegramChatTitle: chatTitle ?? null,
    linkedBy: userId,
    notifyActivities: true,
    dailyReminderEnabled: false,
    dailyReminderTime: "08:00",
    createdAt: now,
    updatedAt: now,
  });

  await reply(chatId, `✅ Đã kết nối với group *${group.name}*! Bot sẽ gửi thông báo hoạt động ở đây.`);
}

export async function handleDisconnect(chatId: number, telegramUserId: number) {
  const userLink = await (TelegramUserLink as any).findOne({ telegramUserId });
  if (!userLink) {
    await reply(chatId, "❌ Bạn chưa liên kết tài khoản.");
    return;
  }

  const link = await (TelegramLink as any).findOne({ telegramChatId: chatId });
  if (!link) {
    await reply(chatId, "❌ Chat này chưa được kết nối với group nào.");
    return;
  }

  const userId = userLink.userId as string;
  const member = await (GroupMember as any).findOne({
    groupId: link.groupId,
    userId,
    status: "active",
  });
  if (!member || !["owner", "moderator"].includes(member.role as string)) {
    await reply(chatId, "❌ Chỉ owner/moderator mới có thể ngắt kết nối.");
    return;
  }

  await (TelegramLink as any).deleteOne({ _id: link._id });
  await reply(chatId, "✅ Đã ngắt kết nối. Bot sẽ không gửi thông báo nữa.");
}

export async function handleHabits(chatId: number, telegramUserId: number) {
  const userLink = await (TelegramUserLink as any).findOne({ telegramUserId });
  if (!userLink) {
    await reply(chatId, "❌ Bạn chưa liên kết tài khoản. Gửi `/link <token>` cho bot trong DM.");
    return;
  }

  const userId = userLink.userId as string;
  const today = getDateStr(new Date());

  const habits = await (Habit as any).find({ userId, archived: false });
  if (habits.length === 0) {
    await reply(chatId, "📋 Bạn chưa có habit nào.");
    return;
  }

  const completions = await (HabitCompletion as any).find({
    userId,
    date: today,
    habitId: { $in: habits.map((h: { _id: unknown }) => h._id) },
  });
  const completedIds = new Set(completions.map((c: { habitId: unknown }) => String(c.habitId)));

  let text = `📋 *Habits hôm nay* (${today})\n\n`;
  habits.forEach((habit: { _id: unknown; title: unknown; currentStreak: unknown }, idx: number) => {
    const done = completedIds.has(String(habit._id));
    const emoji = done ? "✅" : "⬜";
    const streak = (habit.currentStreak as number) ?? 0;
    const streakText = streak > 0 ? ` 🔥${streak}` : "";
    text += `${idx + 1}. ${emoji} ${habit.title}${streakText}\n`;
  });

  const completedCount = completions.length;
  text += `\n${completedCount}/${habits.length} hoàn thành`;
  text += "\n\nDùng `/done <số>` để hoàn thành habit.";

  await reply(chatId, text);
}

export async function handleDone(chatId: number, telegramUserId: number, arg: string) {
  const userLink = await (TelegramUserLink as any).findOne({ telegramUserId });
  if (!userLink) {
    await reply(chatId, "❌ Bạn chưa liên kết tài khoản. Gửi `/link <token>` cho bot trong DM.");
    return;
  }

  const userId = userLink.userId as string;
  const today = getDateStr(new Date());

  const habits = await (Habit as any).find({ userId, archived: false });
  if (habits.length === 0) {
    await reply(chatId, "📋 Bạn chưa có habit nào.");
    return;
  }

  // /done all - complete all incomplete habits
  if (arg.toLowerCase() === "all") {
    const completions = await (HabitCompletion as any).find({
      userId,
      date: today,
      habitId: { $in: habits.map((h: { _id: unknown }) => h._id) },
    });
    const completedIds = new Set(completions.map((c: { habitId: unknown }) => String(c.habitId)));
    const incomplete = habits.filter((h: { _id: unknown }) => !completedIds.has(String(h._id)));

    if (incomplete.length === 0) {
      await reply(chatId, "✅ Tất cả habits đã hoàn thành rồi!");
      return;
    }

    const results: string[] = [];
    for (const habit of incomplete) {
      try {
        const result = await completeHabitForUser(userId, habit._id as string, today);
        results.push(`✅ ${habit.title} (🔥${result.streak})`);
      } catch {
        results.push(`❌ ${habit.title} - lỗi`);
      }
    }

    await reply(chatId, `*Hoàn thành tất cả:*\n\n${results.join("\n")}`);
    return;
  }

  // /done <number>
  const num = parseInt(arg, 10);
  if (!arg || isNaN(num) || num < 1 || num > habits.length) {
    // Show habit list for selection
    let text = "📋 *Chọn habit để hoàn thành:*\n\n";
    const completions = await (HabitCompletion as any).find({
      userId,
      date: today,
      habitId: { $in: habits.map((h: { _id: unknown }) => h._id) },
    });
    const completedIds = new Set(completions.map((c: { habitId: unknown }) => String(c.habitId)));

    habits.forEach((habit: { _id: unknown; title: unknown }, idx: number) => {
      const done = completedIds.has(String(habit._id));
      const emoji = done ? "✅" : "⬜";
      text += `${idx + 1}. ${emoji} ${habit.title}\n`;
    });
    text += "\nGửi `/done <số>` hoặc `/done all`";
    await reply(chatId, text);
    return;
  }

  const habit = habits[num - 1]!;
  try {
    const result = await completeHabitForUser(userId, habit._id as string, today);
    if (result.alreadyCompleted) {
      await reply(chatId, `⚠️ *${result.habitTitle}* đã hoàn thành rồi!`);
    } else {
      let text = `✅ *${result.habitTitle}* hoàn thành! 🔥 Streak: ${result.streak}`;
      if (result.xpAwarded) text += ` (+${result.xpAwarded} XP)`;
      if (result.leveledUp) text += `\n🎉 Level up! Level ${result.newLevel}`;
      await reply(chatId, text);
    }
  } catch (err) {
    await reply(chatId, `❌ Lỗi: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}

export async function handleStats(chatId: number, telegramUserId: number) {
  const userLink = await (TelegramUserLink as any).findOne({ telegramUserId });
  if (!userLink) {
    await reply(chatId, "❌ Bạn chưa liên kết tài khoản. Gửi `/link <token>` cho bot trong DM.");
    return;
  }

  const userId = userLink.userId as string;
  const profile = await (UserProfile as any).findOne({ userId });
  if (!profile) {
    await reply(chatId, "📊 Chưa có dữ liệu. Hãy hoàn thành habit đầu tiên!");
    return;
  }

  const levelInfo = getLevelInfo(profile.level ?? 1);
  const progress = getProgressToNextLevel(profile.totalXp ?? 0);
  const userInfo = await getUserInfoMap([userId]);
  const info = userInfo.get(userId);

  let text = `📊 *Thống kê - ${info?.name ?? "User"}*\n\n`;
  text += `${levelInfo.icon} Level ${profile.level} - ${levelInfo.nameVi}\n`;
  text += `⭐ ${profile.totalXp ?? 0} XP\n`;
  text += `📈 Next level: ${progress.progressXp}/${progress.nextLevelXp - progress.currentLevelXp} XP`;

  await reply(chatId, text);
}

export async function handleLeaderboard(chatId: number) {
  const link = await (TelegramLink as any).findOne({ telegramChatId: chatId });
  if (!link) {
    await reply(chatId, "❌ Chat này chưa được kết nối với group nào.");
    return;
  }

  const groupId = link.groupId as string;
  const members = await (GroupMember as any).find({ groupId, status: "active" });
  const userIds = members.map((m: { userId: unknown }) => String(m.userId));

  if (userIds.length === 0) {
    await reply(chatId, "📊 Group chưa có thành viên.");
    return;
  }

  const profiles = await (UserProfile as any).find({ userId: { $in: userIds } }).sort({ totalXp: -1 }).limit(10);
  const userInfo = await getUserInfoMap(userIds);

  let text = "🏆 *Bảng xếp hạng*\n\n";
  const medals = ["🥇", "🥈", "🥉"];

  profiles.forEach((p: { userId: unknown; level: unknown; totalXp: unknown }, idx: number) => {
    const info = userInfo.get(String(p.userId));
    const medal = medals[idx] ?? `${idx + 1}.`;
    const levelInfo = getLevelInfo((p.level as number) ?? 1);
    text += `${medal} ${info?.name ?? "Unknown"} - ${levelInfo.icon} Lv.${p.level} (${p.totalXp ?? 0} XP)\n`;
  });

  await reply(chatId, text);
}

export async function handleRemind(chatId: number, telegramUserId: number, timeArg: string) {
  const userLink = await (TelegramUserLink as any).findOne({ telegramUserId });
  if (!userLink) {
    await reply(chatId, "❌ Bạn chưa liên kết tài khoản.");
    return;
  }

  const link = await (TelegramLink as any).findOne({ telegramChatId: chatId });
  if (!link) {
    await reply(chatId, "❌ Chat này chưa được kết nối với group nào.");
    return;
  }

  const userId = userLink.userId as string;
  const member = await (GroupMember as any).findOne({
    groupId: link.groupId,
    userId,
    status: "active",
  });
  if (!member || !["owner", "moderator"].includes(member.role as string)) {
    await reply(chatId, "❌ Chỉ owner/moderator mới có thể cài đặt nhắc nhở.");
    return;
  }

  if (!timeArg || !/^\d{2}:\d{2}$/.test(timeArg)) {
    const current = link.dailyReminderEnabled ? `${link.dailyReminderTime} (bật)` : "(tắt)";
    await reply(chatId, `⏰ Nhắc nhở hiện tại: ${current}\n\nDùng \`/remind HH:MM\` để cài đặt hoặc \`/remind off\` để tắt.`);
    return;
  }

  link.dailyReminderEnabled = true;
  link.dailyReminderTime = timeArg;
  link.updatedAt = new Date();
  await link.save();

  await reply(chatId, `⏰ Đã cài đặt nhắc nhở hàng ngày lúc *${timeArg}*.`);
}

export async function handleRemindOff(chatId: number, telegramUserId: number) {
  const userLink = await (TelegramUserLink as any).findOne({ telegramUserId });
  if (!userLink) return;

  const link = await (TelegramLink as any).findOne({ telegramChatId: chatId });
  if (!link) return;

  const userId = userLink.userId as string;
  const member = await (GroupMember as any).findOne({
    groupId: link.groupId,
    userId,
    status: "active",
  });
  if (!member || !["owner", "moderator"].includes(member.role as string)) {
    await reply(chatId, "❌ Chỉ owner/moderator mới có thể tắt nhắc nhở.");
    return;
  }

  link.dailyReminderEnabled = false;
  link.updatedAt = new Date();
  await link.save();

  await reply(chatId, "⏰ Đã tắt nhắc nhở hàng ngày.");
}

export async function handleHelp(chatId: number, isGroup: boolean) {
  if (isGroup) {
    await reply(chatId,
      "🌱 *We Grow Bot - Commands*\n\n" +
      "📋 `/habits` - Xem habits hôm nay\n" +
      "✅ `/done <số>` - Hoàn thành habit\n" +
      "✅ `/done all` - Hoàn thành tất cả\n" +
      "📊 `/stats` - Xem thống kê cá nhân\n" +
      "🏆 `/leaderboard` - Bảng xếp hạng\n" +
      "⏰ `/remind HH:MM` - Cài nhắc nhở\n" +
      "⏰ `/remind off` - Tắt nhắc nhở\n" +
      "🔗 `/connect <code>` - Kết nối group\n" +
      "🔌 `/disconnect` - Ngắt kết nối\n" +
      "❓ `/help` - Xem trợ giúp"
    );
  } else {
    await reply(chatId,
      "🌱 *We Grow Bot - Commands*\n\n" +
      "🔗 `/link <token>` - Liên kết tài khoản\n" +
      "📊 `/stats` - Xem thống kê\n" +
      "❓ `/help` - Xem trợ giúp"
    );
  }
}
