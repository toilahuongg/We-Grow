import mongoose from "mongoose";

const { Schema, model } = mongoose;

const groupSchema = new Schema(
  {
    _id: { type: String },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    mode: {
      type: String,
      enum: ["together", "share"],
      required: true,
    },
    inviteCode: { type: String, required: true, unique: true },
    ownerId: { type: String, ref: "User", required: true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: "group" },
);

export const Group = model("Group", groupSchema);
