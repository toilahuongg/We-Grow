import mongoose from "mongoose";

const { Schema, model } = mongoose;

const reactionSchema = new Schema(
  {
    _id: { type: String },
    activityId: { type: String, ref: "Activity", required: true },
    userId: { type: String, ref: "User", required: true },
    emoji: {
      type: String,
      enum: ["fire", "clap", "heart", "star", "muscle"],
      required: true,
    },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: "reaction" },
);

reactionSchema.index({ activityId: 1, userId: 1, emoji: 1 }, { unique: true });

export const Reaction = mongoose.models.Reaction || model("Reaction", reactionSchema);
