import mongoose from "mongoose";

const { Schema, model } = mongoose;

const xpTransactionSchema = new Schema(
  {
    _id: { type: String },
    userId: { type: String, ref: "User", required: true },
    amount: { type: Number, required: true },
    source: {
      type: String,
      enum: [
        "habit_completion",
        "todo_completion",
        "streak_bonus",
        "all_habits_bonus",
        "onboarding",
      ],
      required: true,
    },
    sourceId: { type: String, default: null },
    description: { type: String, default: "" },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: "xp_transaction" },
);

xpTransactionSchema.index({ userId: 1, createdAt: -1 });

export const XpTransaction = mongoose.models.XpTransaction || model("XpTransaction", xpTransactionSchema);
