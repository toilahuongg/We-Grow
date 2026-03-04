// TODO: Email reminders disabled — using browser push notifications only
// import { processEmailReminders, processOneReminder } from "@we-grow/api/lib/email-reminders";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Not available in production" }, { status: 404 });
  }

  return Response.json({ message: "Email reminders are disabled" }, { status: 200 });

  // const body = await req.json().catch(() => ({}));
  //
  // // Test a single reminder
  // if (body.reminderId) {
  //   const result = await processOneReminder(body.reminderId);
  //   return Response.json(result);
  // }
  //
  // // Process all reminders matching current time
  // const result = await processEmailReminders();
  // return Response.json(result);
}
