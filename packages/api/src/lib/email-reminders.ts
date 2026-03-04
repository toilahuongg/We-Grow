import { Reminder, Habit, HabitCompletion, User } from "@we-grow/db/models/index";
import { getToday } from "./date-utils";
import { getMailClient } from "./mail";

export async function processEmailReminders(): Promise<{
  time: string;
  emailsSent: number;
}> {
  const mailClient = getMailClient();
  if (!mailClient) {
    return { time: "", emailsSent: 0 };
  }

  const now = new Date();
  const currentTime = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;
  const today = getToday();

  const reminders = await Reminder.find({ enabled: true, time: currentTime });
  if (reminders.length === 0) {
    return { time: currentTime, emailsSent: 0 };
  }

  // Group reminders by userId
  const userReminders = new Map<string, Array<{ habitId: string | null }>>();
  for (const r of reminders) {
    const userId = r.userId as string;
    if (!userReminders.has(userId)) {
      userReminders.set(userId, []);
    }
    userReminders.get(userId)!.push({ habitId: r.habitId as string | null });
  }

  let emailsSent = 0;

  for (const [userId, remList] of userReminders) {
    const hasGeneral = remList.some((r) => r.habitId === null);
    const specificHabitIds = remList
      .filter((r) => r.habitId !== null)
      .map((r) => r.habitId as string);

    // Get habits to check
    let habits;
    if (hasGeneral) {
      habits = await Habit.find({ userId, archived: false });
    } else {
      habits = await Habit.find({ _id: { $in: specificHabitIds }, userId, archived: false });
    }

    if (habits.length === 0) continue;

    // Find which habits are already completed today
    const habitIds = habits.map((h) => h._id as string);
    const completions = await HabitCompletion.find({
      userId,
      habitId: { $in: habitIds },
      date: today,
    });
    const completedIds = new Set(completions.map((c) => c.habitId as string));

    const incompleteHabits = habits.filter((h) => !completedIds.has(h._id as string));
    if (incompleteHabits.length === 0) continue;

    const user = await User.findById(userId);
    if (!user?.email) continue;

    const habitListHtml = incompleteHabits
      .map((h) => `<li>${escapeHtml(h.title as string)}</li>`)
      .join("\n");
    const habitListText = incompleteHabits
      .map((h) => `- ${h.title as string}`)
      .join("\n");

    const subject = `You have ${incompleteHabits.length} habit${incompleteHabits.length > 1 ? "s" : ""} to complete today`;

    const html = `<h2>Daily Habit Reminder</h2>
<p>You still have ${incompleteHabits.length} habit${incompleteHabits.length > 1 ? "s" : ""} to complete today:</p>
<ul>
${habitListHtml}
</ul>
<p>Keep your streak going!</p>`;

    const text = `Daily Habit Reminder

You still have ${incompleteHabits.length} habit${incompleteHabits.length > 1 ? "s" : ""} to complete today:

${habitListText}

Keep your streak going!`;

    await mailClient.sendSystemEmail({
      to: user.email as string,
      fromName: "We Grow",
      subject,
      html,
      text,
    });

    emailsSent++;
  }

  return { time: currentTime, emailsSent };
}

export async function processOneReminder(reminderId: string): Promise<{
  sent: boolean;
  reason?: string;
  email?: string;
  habitsCount?: number;
}> {
  const mailClient = getMailClient();
  if (!mailClient) {
    return { sent: false, reason: "Mail client not configured" };
  }

  const reminder = await Reminder.findById(reminderId);
  if (!reminder) {
    return { sent: false, reason: "Reminder not found" };
  }

  const userId = reminder.userId as string;
  const today = getToday();

  // Get habits
  let habits;
  if (reminder.habitId) {
    habits = await Habit.find({ _id: reminder.habitId, userId, archived: false });
  } else {
    habits = await Habit.find({ userId, archived: false });
  }

  if (habits.length === 0) {
    return { sent: false, reason: "No active habits found" };
  }

  // Check completions
  const habitIds = habits.map((h) => h._id as string);
  const completions = await HabitCompletion.find({
    userId,
    habitId: { $in: habitIds },
    date: today,
  });
  const completedIds = new Set(completions.map((c) => c.habitId as string));
  const incompleteHabits = habits.filter((h) => !completedIds.has(h._id as string));

  if (incompleteHabits.length === 0) {
    return { sent: false, reason: "All habits already completed today" };
  }

  const user = await User.findById(userId);
  if (!user?.email) {
    return { sent: false, reason: "User has no email" };
  }

  const habitListHtml = incompleteHabits
    .map((h) => `<li>${escapeHtml(h.title as string)}</li>`)
    .join("\n");
  const habitListText = incompleteHabits
    .map((h) => `- ${h.title as string}`)
    .join("\n");

  const subject = `[TEST] You have ${incompleteHabits.length} habit${incompleteHabits.length > 1 ? "s" : ""} to complete today`;

  const html = `<h2>Daily Habit Reminder</h2>
<p>You still have ${incompleteHabits.length} habit${incompleteHabits.length > 1 ? "s" : ""} to complete today:</p>
<ul>
${habitListHtml}
</ul>
<p>Keep your streak going!</p>`;

  const text = `Daily Habit Reminder

You still have ${incompleteHabits.length} habit${incompleteHabits.length > 1 ? "s" : ""} to complete today:

${habitListText}

Keep your streak going!`;

  await mailClient.sendSystemEmail({
    to: user.email as string,
    fromName: "We Grow",
    subject,
    html,
    text,
  });

  return { sent: true, email: user.email as string, habitsCount: incompleteHabits.length };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
