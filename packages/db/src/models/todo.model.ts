import mongoose from "mongoose";

const { Schema, model } = mongoose;

const todoSchema = new Schema(
  {
    _id: { type: String },
    userId: { type: String, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    priority: {
      type: String,
      enum: ["normal", "important", "urgent"],
      default: "normal",
    },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: "todo" },
);

todoSchema.index({ userId: 1, completed: 1 });

export const Todo = model("Todo", todoSchema);
