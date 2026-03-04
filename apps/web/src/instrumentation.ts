export async function onRequestError() {
  // Required export — intentionally empty
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { schedule } = await import("node-cron");
    const { processPushReminders } = await import("@we-grow/api/lib/push-reminders");

    // Run every minute — send push notifications for matching reminders
    schedule("* * * * *", async () => {
      try {
        const result = await processPushReminders();
        if (result.notificationsSent > 0) {
          console.log(`[push-reminders] Sent ${result.notificationsSent} notification(s) at ${result.time}`);
        }
      } catch (error) {
        console.error("[push-reminders] Error:", error);
      }
    });

    console.log("[push-reminders] Cron scheduled (every minute)");
  }
}
