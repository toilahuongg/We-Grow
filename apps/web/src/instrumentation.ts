export async function onRequestError() {
  // Required export — intentionally empty
}

export async function register() {
  // Only run cron in the Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { schedule } = await import("node-cron");
    const { processEmailReminders } = await import("@we-grow/api/lib/email-reminders");

    // Run every minute
    schedule("* * * * *", async () => {
      try {
        const result = await processEmailReminders();
        if (result.emailsSent > 0) {
          console.log(`[email-reminders] Sent ${result.emailsSent} email(s) at ${result.time}`);
        }
      } catch (error) {
        console.error("[email-reminders] Error:", error);
      }
    });

    console.log("[email-reminders] Cron scheduled (every minute)");
  }
}
