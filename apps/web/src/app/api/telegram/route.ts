import { NextRequest, NextResponse } from "next/server";
import { env } from "@we-grow/env/server";
import { handleTelegramUpdate } from "@we-grow/api/lib/telegram-handler";

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (env.TELEGRAM_WEBHOOK_SECRET && secret !== env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const update = await req.json();
    // Fire-and-forget: process update without blocking response
    handleTelegramUpdate(update).catch((err) => {
      console.error("[Telegram] Update processing error:", err);
    });
  } catch (err) {
    console.error("[Telegram] Webhook error:", err);
  }

  // Always return 200 to Telegram
  return NextResponse.json({ ok: true });
}
