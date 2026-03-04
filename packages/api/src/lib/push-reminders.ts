import "@we-grow/db"; // Ensure database connection is established
import { Reminder, Habit, HabitCompletion, UserProfile } from "@we-grow/db/models/index";
import { getToday } from "./date-utils";
import { sendPushNotification } from "./push";
import mongoose from "mongoose";

export async function processPushReminders(): Promise<{
  time: string;
  notificationsSent: number;
}> {
  const now = new Date();
  console.log(`[push-reminders] Cron job running at ${now.toISOString()}`);
  console.log(`[push-reminders] DB connection state: ${mongoose.connection.readyState} (0=disconnected, 1=connected, 2=connecting, 3=disconnecting)`);

  // Get all enabled reminders
  const allReminders = await Reminder.find({ enabled: true });
  console.log(`[push-reminders] Found ${allReminders.length} enabled reminders`);
  if (allReminders.length === 0) {
    return { time: now.toISOString(), notificationsSent: 0 };
  }

  // Get unique user IDs
  const userIds = [...new Set(allReminders.map((r) => r.userId as string))];

  // Fetch user timezones
  const profiles = await UserProfile.find({ userId: { $in: userIds } }).select("userId timezone");
  const userTimezones = new Map(profiles.map((p) => [p.userId as string, (p.timezone as string) ?? "UTC"]));
  console.log("[push-reminders] User timezones:", Array.from(userTimezones.entries()));

  // Group reminders by userId that match their local time
  const userReminders = new Map<string, Array<{ habitId: string | null }>>();

  for (const r of allReminders) {
    const userId = r.userId as string;
    const userTimezone = userTimezones.get(userId) ?? "UTC";

    // Convert current UTC time to user's local time
    const localTimeStr = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: userTimezone,
    }).format(now);

    console.log(`[push-reminders] User ${userId.substring(0,8)}... timezone=${userTimezone}, reminderTime=${r.time}, localTime=${localTimeStr}`);

    // Check if this reminder should fire now
    if (r.time === localTimeStr) {
      console.log(`[push-reminders] ✅ MATCH! User ${userId.substring(0,8)}... reminder at ${r.time}`);
      if (!userReminders.has(userId)) {
        userReminders.set(userId, []);
      }
      userReminders.get(userId)!.push({ habitId: r.habitId as string | null });
    }
  }

  console.log(`[push-reminders] Matched ${userReminders.size} users with reminders`);

  if (userReminders.size === 0) {
    return { time: now.toISOString(), notificationsSent: 0 };
  }

  let notificationsSent = 0;

  for (const [userId, remList] of userReminders) {
    const userTimezone = userTimezones.get(userId) ?? "UTC";
    const today = getToday(userTimezone);

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

    // Find which habits are already completed today (in user's timezone)
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

  return { time: now.toISOString(), notificationsSent };
}
