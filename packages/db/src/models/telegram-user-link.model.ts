import mongoose from "mongoose";

const { Schema, model } = mongoose;

const telegramUserLinkSchema = new Schema(
  {
    _id: { type: String },
    userId: { type: String, ref: "User", required: true, unique: true },
    telegramUserId: { type: Number, required: true, unique: true },
    telegramUsername: { type: String },
    linkToken: { type: String },
    linkTokenExpiresAt: { type: Date },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: "telegram_user_link" },
);

export const TelegramUserLink =
  mongoose.models.TelegramUserLink || model("TelegramUserLink", telegramUserLinkSchema);
