"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { orpc } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const habitSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  frequency: z.enum(["daily", "weekly", "specific_days"]),
  targetDays: z.array(z.number()).optional(),
  weeklyTarget: z.number().min(1).max(7).optional(),
}).refine(
  (data) => {
    if (data.frequency === "specific_days") {
      return data.targetDays && data.targetDays.length > 0;
    }
    if (data.frequency === "weekly") {
      return data.weeklyTarget && data.weeklyTarget >= 1;
    }
    return true;
  },
  {
    message: "Please fill all required fields",
    path: ["frequency"],
  }
);

interface HabitFormProps {
  habit?: {
    _id: string;
    title: string;
    description?: string;
    frequency: "daily" | "weekly" | "specific_days";
    targetDays?: number[];
    weeklyTarget?: number;
  };
  isEditing?: boolean;
}

export function HabitForm({ habit, isEditing = false }: HabitFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: orpc.habits.create.mutate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.habits.list.queryKey() });
      toast.success("Habit created successfully! ✨");
      router.push("/habits");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create habit");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ habitId, updates }: { habitId: string; updates: any }) =>
      orpc.habits.update.mutate({ habitId, ...updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.habits.list.queryKey() });
      if (habit) {
        queryClient.invalidateQueries({ queryKey: orpc.habits.getById.queryKey() });
      }
      toast.success("Habit updated successfully! ✨");
      router.push("/habits");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update habit");
    },
  });

  const form = useForm({
    defaultValues: {
      title: habit?.title ?? "",
      description: habit?.description ?? "",
      frequency: habit?.frequency ?? "daily",
      targetDays: habit?.targetDays ?? [],
      weeklyTarget: habit?.weeklyTarget ?? 1,
    },
    onSubmit: async ({ value }) => {
      if (isEditing && habit) {
        updateMutation.mutate({
          habitId: habit._id,
          updates: {
            title: value.title,
            description: value.description,
            frequency: value.frequency,
            targetDays: value.targetDays,
            weeklyTarget: value.weeklyTarget,
          },
        });
      } else {
        createMutation.mutate({
          title: value.title,
          description: value.description,
          frequency: value.frequency,
          targetDays: value.targetDays,
          weeklyTarget: value.weeklyTarget,
        });
      }
    },
    validators: {
      onSubmit: habitSchema,
    },
  });

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link href="/habits">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold">
            {isEditing ? "Edit Habit" : "Create Habit"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditing ? "Update your habit settings" : "Build a new daily routine"}
          </p>
        </div>
      </div>

      {/* Form */}
      <form.Provider>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="glass-strong rounded-2xl p-6 space-y-6"
        >
          {/* Title */}
          <form.Field name="title">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Title *</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g., Morning Meditation"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-red-500">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </form.Field>

          {/* Description */}
          <form.Field name="description">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Description</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Optional notes or motivation"
                />
              </div>
            )}
          </form.Field>

          {/* Frequency */}
          <form.Field name="frequency">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Frequency *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["daily", "weekly", "specific_days"] as const).map((freq) => (
                    <label
                      key={freq}
                      className={`cursor-pointer rounded-lg border p-3 text-center transition-all ${
                        field.state.value === freq
                          ? "border-[#4ecdc4] bg-[#4ecdc4]/10"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                    >
                      <input
                        type="radio"
                        name={field.name}
                        value={freq}
                        checked={field.state.value === freq}
                        onChange={(e) => field.handleChange(e.target.value as any)}
                        className="sr-only"
                      />
                      <span className="block text-sm font-medium capitalize">{freq.replace("_", " ")}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </form.Field>

          {/* Target Days (for specific_days frequency) */}
          <form.Field name="frequency" mode="value">
            {(field) =>
              field.state.value === "specific_days" && (
                <form.Field name="targetDays">
                  {(targetDaysField) => (
                    <div className="space-y-2">
                      <Label>Select Days *</Label>
                      <div className="grid grid-cols-7 gap-2">
                        {DAYS.map((day, index) => (
                          <label
                            key={day}
                            className={`cursor-pointer rounded-lg border p-2 text-center transition-all ${
                              (targetDaysField.state.value as number[])?.includes(index)
                                ? "border-[#4ecdc4] bg-[#4ecdc4]/10"
                                : "border-white/10 bg-white/5 hover:border-white/20"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={(targetDaysField.state.value as number[])?.includes(index)}
                              onChange={(e) => {
                                const current = targetDaysField.state.value as number[];
                                if (e.target.checked) {
                                  targetDaysField.handleChange([...current, index]);
                                } else {
                                  targetDaysField.handleChange(current.filter((d) => d !== index));
                                }
                              }}
                              className="sr-only"
                            />
                            <span className="block text-xs font-medium">{day}</span>
                          </label>
                        ))}
                      </div>
                      {targetDaysField.state.meta.errors.length > 0 && (
                        <p className="text-sm text-red-500">{targetDaysField.state.meta.errors[0]}</p>
                      )}
                    </div>
                  )}
                </form.Field>
              )
            }
          </form.Field>

          {/* Weekly Target (for weekly frequency) */}
          <form.Field name="frequency" mode="value">
            {(field) =>
              field.state.value === "weekly" && (
                <form.Field name="weeklyTarget">
                  {(weeklyTargetField) => (
                    <div className="space-y-2">
                      <Label htmlFor={weeklyTargetField.name}>Weekly Target *</Label>
                      <div className="flex items-center gap-4">
                        <Input
                          id={weeklyTargetField.name}
                          name={weeklyTargetField.name}
                          type="number"
                          min="1"
                          max="7"
                          value={weeklyTargetField.state.value}
                          onBlur={weeklyTargetField.handleBlur}
                          onChange={(e) => weeklyTargetField.handleChange(Number(e.target.value))}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">times per week</span>
                      </div>
                      {weeklyTargetField.state.meta.errors.length > 0 && (
                        <p className="text-sm text-red-500">{weeklyTargetField.state.meta.errors[0]}</p>
                      )}
                    </div>
                  )}
                </form.Field>
              )
            }
          </form.Field>

          {/* Submit Button */}
          <div className="flex justify-end gap-2 pt-4">
            <Link href="/habits">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              className="bg-gradient-to-r from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-white"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : isEditing
                ? "Update Habit"
                : "Create Habit"}
            </Button>
          </div>
        </form>
      </form.Provider>
    </div>
  );
}
