import type { Update } from "grammy/types";
import { TelegramLink } from "@we-grow/db/models/index";
import {
  handleStart,
  handleLink,
  handleConnect,
  handleDisconnect,
  handleHabits,
  handleDone,
  handleStats,
  handleLeaderboard,
  handleRemind,
  handleRemindOff,
  handleHelp,
} from "./telegram-commands";

export async function handleTelegramUpdate(update: Update) {
  // Handle supergroup migration
  const migrateChatId = (update as any).migrate_to_chat_id as number | undefined;
  if (migrateChatId) {
    const oldChatId = update.message?.chat.id;
    const newChatId = migrateChatId;
    if (oldChatId) {
      await (TelegramLink as any).findOneAndUpdate(
        { telegramChatId: oldChatId },
        { telegramChatId: newChatId, updatedAt: new Date() },
      );
    }
    return;
  }

  const message = update.message;
  if (!message?.text) return;

  const chatId = message.chat.id;
  const isGroup = message.chat.type === "group" || message.chat.type === "supergroup";
  const telegramUserId = message.from?.id;
  const telegramUsername = message.from?.username;

  if (!telegramUserId) return;

  const text = message.text.trim();
  // Strip bot username suffix e.g. /start@WeGrowBot
  const commandMatch = text.match(/^\/(\w+)(?:@\S+)?\s*([\s\S]*)/);
  if (!commandMatch) return;

  const command = commandMatch[1]!.toLowerCase();
  const args = commandMatch[2]!.trim();

  try {
    switch (command) {
      case "start":
        await handleStart(chatId, isGroup);
        break;
      case "link":
        if (isGroup) return; // DM only
        await handleLink(chatId, telegramUserId, telegramUsername, args);
        break;
      case "connect":
        if (!isGroup) return; // Group only
        await handleConnect(chatId, message.chat.title, telegramUserId, args);
        break;
      case "disconnect":
        if (!isGroup) return;
        await handleDisconnect(chatId, telegramUserId);
        break;
      case "habits":
        await handleHabits(chatId, telegramUserId);
        break;
      case "done":
        await handleDone(chatId, telegramUserId, args);
        break;
      case "stats":
        await handleStats(chatId, telegramUserId);
        break;
      case "leaderboard":
        if (!isGroup) return;
        await handleLeaderboard(chatId);
        break;
      case "remind":
        if (!isGroup) return;
        if (args.toLowerCase() === "off") {
          await handleRemindOff(chatId, telegramUserId);
        } else {
          await handleRemind(chatId, telegramUserId, args);
        }
        break;
      case "help":
        await handleHelp(chatId, isGroup);
        break;
    }
  } catch (err) {
    console.error("[Telegram] Command error:", command, err);
  }
}
