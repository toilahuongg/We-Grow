import mongoose from "mongoose";

const { Schema, model } = mongoose;

const habitSchema = new Schema(
  {
    _id: { type: String },
    userId: { type: String, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "specific_days"],
      required: true,
    },
    targetDays: { type: [Number], default: [] },
    weeklyTarget: { type: Number, default: 1 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastCompletedDate: { type: String, default: null },
    archived: { type: Boolean, default: false },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: "habit" },
);

habitSchema.index({ userId: 1, archived: 1 });

export const Habit = mongoose.models.Habit || model("Habit", habitSchema);
