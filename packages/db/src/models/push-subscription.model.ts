import mongoose from "mongoose";

const { Schema, model } = mongoose;

const pushSubscriptionSchema = new Schema(
  {
    _id: { type: String },
    userId: { type: String, ref: "User", required: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: "push_subscription" },
);

pushSubscriptionSchema.index({ userId: 1 });

export const PushSubscription = (mongoose.models.PushSubscription ?? model("PushSubscription", pushSubscriptionSchema)) as mongoose.Model<any>;
