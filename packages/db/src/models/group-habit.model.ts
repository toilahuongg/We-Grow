import mongoose from "mongoose";

const { Schema, model } = mongoose;

const groupHabitSchema = new Schema(
  {
    _id: { type: String },
    groupId: { type: String, ref: "Group", required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "specific_days"],
      required: true,
    },
    targetDays: { type: [Number], default: [] },
    weeklyTarget: { type: Number, default: 1 },
    createdBy: { type: String, ref: "User", required: true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: "group_habit" },
);

groupHabitSchema.index({ groupId: 1 });

export const GroupHabit = (mongoose.models.GroupHabit ?? model("GroupHabit", groupHabitSchema)) as mongoose.Model<any>;
