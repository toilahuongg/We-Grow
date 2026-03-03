import mongoose from "mongoose";

const { Schema, model } = mongoose;

const userProfileSchema = new Schema(
  {
    _id: { type: String },
    userId: { type: String, ref: "User", required: true, unique: true },
    goals: { type: [String], default: [] },
    timezone: { type: String, default: "UTC" },
    totalXp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    onboardingCompleted: { type: Boolean, default: false },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: "user_profile" },
);

export const UserProfile = mongoose.models.UserProfile || model("UserProfile", userProfileSchema);
