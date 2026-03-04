import mongoose from "mongoose";

const { Schema, model } = mongoose;

const userBadgeSchema = new Schema(
  {
    _id: { type: String },
    userId: { type: String, ref: "User", required: true },
    badgeType: { type: String, required: true },
    badgeKey: { type: String, required: true },
    level: { type: Number, required: true },
    awardedAt: { type: Date, required: true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: "user_badge" },
);

userBadgeSchema.index({ userId: 1, badgeKey: 1 }, { unique: true });

const UserBadge =
  (mongoose.models.UserBadge ?? model("UserBadge", userBadgeSchema)) as mongoose.Model<any>;

export { UserBadge };
