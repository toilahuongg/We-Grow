import { NextRequest, NextResponse } from "next/server";
import { env } from "@we-grow/env/server";
import { processReminders } from "@we-grow/api/lib/bot-reminders";

export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get("authorization")?.replace("Bearer ", "")
    ?? req.nextUrl.searchParams.get("secret");

  if (env.CRON_SECRET && secret !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processReminders();

  return NextResponse.json({ ok: true, ...result });
}
