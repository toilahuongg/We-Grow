import { processPushReminders } from "@we-grow/api/lib/push-reminders";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Not available in production" }, { status: 404 });
  }

  // Process all reminders matching current time
  const result = await processPushReminders();
  return Response.json(result);
}
