import { Reminder, Habit, HabitCompletion } from "@we-grow/db/models/index";
import { getToday } from "./date-utils";
import { sendPushNotification } from "./push";

export async function processPushReminders(): Promise<{
  time: string;
  notificationsSent: number;
}> {
  const now = new Date();
  const currentTime = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;
  const today = getToday();

  const reminders = await Reminder.find({ enabled: true, time: currentTime });
  if (reminders.length === 0) {
    return { time: currentTime, notificationsSent: 0 };
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

  let notificationsSent = 0;

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

    const count = incompleteHabits.length;
    const habitNames = incompleteHabits.map((h) => h.title as string).join(", ");

    await sendPushNotification(userId, {
      title: `${count} habit${count > 1 ? "s" : ""} to complete today`,
      body: habitNames,
      url: "/habits",
    });

    notificationsSent++;
  }

  return { time: currentTime, notificationsSent };
}
