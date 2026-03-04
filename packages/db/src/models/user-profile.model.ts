import mongoose from "mongoose";

const { Schema, model } = mongoose;

const userProfileSchema = new Schema(
  {
    _id: { type: String },
    userId: { type: String, ref: "User", required: true, unique: true },
    bio: { type: String, default: "" },
    timezone: { type: String, default: "UTC" },
    totalXp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: "user_profile" },
);

userProfileSchema.index({ totalXp: -1, level: -1 });

export const UserProfile = (mongoose.models.UserProfile ?? model("UserProfile", userProfileSchema)) as mongoose.Model<any>;
