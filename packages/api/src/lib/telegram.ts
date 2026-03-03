import { Bot, Api } from "grammy";
import { env } from "@we-grow/env/server";

let botInstance: Bot | null = null;
let apiInstance: Api | null = null;

export function getTelegramBot(): Bot | null {
  if (!env.TELEGRAM_BOT_TOKEN) return null;
  if (!botInstance) {
    botInstance = new Bot(env.TELEGRAM_BOT_TOKEN);
  }
  return botInstance;
}

export function getTelegramApi(): Api | null {
  if (!env.TELEGRAM_BOT_TOKEN) return null;
  if (!apiInstance) {
    apiInstance = new Api(env.TELEGRAM_BOT_TOKEN);
  }
  return apiInstance;
}

export function isTelegramConfigured(): boolean {
  return !!env.TELEGRAM_BOT_TOKEN;
}
