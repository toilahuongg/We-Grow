import mongoose from "mongoose";

const { Schema, model } = mongoose;

const telegramLinkSchema = new Schema(
  {
    _id: { type: String },
    groupId: { type: String, ref: "Group", required: true, unique: true },
    telegramChatId: { type: Number, required: true, unique: true },
    telegramChatTitle: { type: String },
    linkedBy: { type: String, ref: "User", required: true },
    notifyActivities: { type: Boolean, default: true },
    dailyReminderEnabled: { type: Boolean, default: false },
    dailyReminderTime: { type: String, default: "08:00" },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: "telegram_link" },
);

export const TelegramLink =
  mongoose.models.TelegramLink || model("TelegramLink", telegramLinkSchema);
