import mongoose from "mongoose";

const { Schema, model } = mongoose;

const groupMemberSchema = new Schema(
  {
    _id: { type: String },
    groupId: { type: String, ref: "Group", required: true },
    userId: { type: String, ref: "User", required: true },
    role: {
      type: String,
      enum: ["owner", "moderator", "member"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "pending", "removed"],
      default: "active",
    },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: "group_member" },
);

groupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });
groupMemberSchema.index({ userId: 1, status: 1 });

export const GroupMember = model("GroupMember", groupMemberSchema);
