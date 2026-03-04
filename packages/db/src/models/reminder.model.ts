import mongoose from "mongoose";

const { Schema, model } = mongoose;

const reminderSchema = new Schema(
  {
    _id: { type: String },
    userId: { type: String, ref: "User", required: true },
    habitId: { type: String, ref: "Habit", default: null },
    time: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: "reminder" },
);

reminderSchema.index({ userId: 1 });
reminderSchema.index({ enabled: 1, time: 1 });

export const Reminder = (mongoose.models.Reminder ?? model("Reminder", reminderSchema)) as mongoose.Model<any>;
