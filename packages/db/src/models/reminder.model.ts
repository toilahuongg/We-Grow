import mongoose from "mongoose";

const { Schema, model } = mongoose;

const reminderSchema = new Schema(
  {
    _id: { type: String },
    userId: { type: String, ref: "User", required: true },
    habitId: { type: String, ref: "Habit", default: null },
    todoId: { type: String, ref: "Todo", default: null },
    time: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: "reminder" },
);

reminderSchema.index({ userId: 1 });

export const Reminder = model("Reminder", reminderSchema);
