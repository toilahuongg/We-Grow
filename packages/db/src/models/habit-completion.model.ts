import mongoose from "mongoose";

const { Schema, model } = mongoose;

const habitCompletionSchema = new Schema(
  {
    _id: { type: String },
    habitId: { type: String, ref: "Habit", required: true },
    userId: { type: String, ref: "User", required: true },
    date: { type: String, required: true },
    note: { type: String, default: null, maxlength: 1000 },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: "habit_completion" },
);

habitCompletionSchema.index({ habitId: 1, userId: 1, date: 1 }, { unique: true });
habitCompletionSchema.index({ userId: 1, date: -1 });

export const HabitCompletion = (mongoose.models.HabitCompletion ?? model("HabitCompletion", habitCompletionSchema)) as mongoose.Model<any>;
