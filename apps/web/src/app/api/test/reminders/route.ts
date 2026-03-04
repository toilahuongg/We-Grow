import { processEmailReminders } from "@we-grow/api/lib/email-reminders";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Not available in production" }, { status: 404 });
  }

  const result = await processEmailReminders();
  return Response.json(result);
}
