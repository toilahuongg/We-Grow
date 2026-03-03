import mongoose from "mongoose";

const { Schema, model } = mongoose;

const activitySchema = new Schema(
  {
    _id: { type: String },
    groupId: { type: String, ref: "Group", required: true },
    userId: { type: String, ref: "User", required: true },
    type: {
      type: String,
      enum: ["habit_completed", "streak_milestone", "level_up", "all_habits_completed", "member_joined"],
      required: true,
    },
    userName: { type: String, required: true },
    userImage: { type: String, default: null },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    reactionCounts: {
      type: Map,
      of: Number,
      default: {},
    },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: "activity" },
);

activitySchema.index({ groupId: 1, createdAt: -1 });
activitySchema.index(
  { groupId: 1, userId: 1, type: 1, "metadata.habitId": 1, "metadata.date": 1 },
  { unique: true, sparse: true },
);

export const Activity = mongoose.models.Activity || model("Activity", activitySchema);
