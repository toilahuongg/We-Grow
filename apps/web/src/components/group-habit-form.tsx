// @ts-nocheck — Pre-existing type compatibility issues with @tanstack/react-form
"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { ArrowLeft, Trophy } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { orpc, client } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface GroupHabitFormProps {
  groupId: string;
}

export function GroupHabitForm({ groupId }: GroupHabitFormProps) {
  const queryClient = useQueryClient();
  const t = useTranslations("habits");
  const td = useTranslations("days");
  const tc = useTranslations("common");

  const DAYS = [td("mon"), td("tue"), td("wed"), td("thu"), td("fri"), td("sat"), td("sun")];

  const frequencyLabels: Record<string, string> = {
    daily: t("daily"),
    weekly: t("weekly"),
    specific_days: t("specificDays"),
  };

  const groupHabitSchema = z.object({
    title: z.string().min(1, t("titleRequired")),
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
      message: t("fillRequired"),
      path: ["frequency"],
    }
  );

  const createMutation = useMutation({
    mutationFn: (input: any) => client.groups.createGroupHabit(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.groups.getById.queryKey({ input: { groupId } }) });
      queryClient.invalidateQueries({ queryKey: orpc.habits.list.queryKey() });
      toast.success(t("groupHabitCreated"));
      window.location.href = `/groups/${groupId}`;
    },
    onError: (error: any) => {
      toast.error(error.message || t("failedCreateGroupHabit"));
    },
  });

  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
      frequency: "daily" as "daily" | "weekly" | "specific_days",
      targetDays: [] as number[],
      weeklyTarget: 1,
    },
    onSubmit: async ({ value }) => {
      createMutation.mutate({
        groupId,
        title: value.title,
        description: value.description,
        frequency: value.frequency,
        targetDays: value.targetDays,
        weeklyTarget: value.weeklyTarget,
      });
    },
    validators: {
      onSubmit: groupHabitSchema as any,
    },
  });

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link href={`/groups/${groupId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold">{t("createGroupHabit")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("groupHabitSubtitle")}
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-6 glass-strong rounded-xl border border-[#ff6b6b]/20 bg-[#ff6b6b]/5 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff6b6b]/20">
            <Trophy className="h-4 w-4 text-[#ff6b6b]" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{t("togetherModeTitle")}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {t("togetherModeDesc")}
            </p>
          </div>
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
                <Label htmlFor={field.name}>{t("title")}</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={t("titlePlaceholder")}
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
                <Label htmlFor={field.name}>{t("descriptionLabel")}</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                />
              </div>
            )}
          </form.Field>

          {/* Frequency */}
          <form.Field name="frequency">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>{t("frequency")}</Label>
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
                      <span className="block text-sm font-medium">{frequencyLabels[freq]}</span>
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
                      <Label>{t("selectDays")}</Label>
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
                      <Label htmlFor={weeklyTargetField.name}>{t("weeklyTarget")}</Label>
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
                        <span className="text-sm text-muted-foreground">{t("timesPerWeek")}</span>
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
            <Link href={`/groups/${groupId}`}>
              <Button type="button" variant="outline">
                {tc("cancel")}
              </Button>
            </Link>
            <Button
              type="submit"
              className="bg-gradient-to-r from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-white"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? tc("saving") : t("createGroupHabitButton")}
            </Button>
          </div>
        </form>
      </form.Provider>
    </div>
  );
}
