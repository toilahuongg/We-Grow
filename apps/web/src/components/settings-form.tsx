"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, User, Clock, Bell, Globe, Camera, Shield, Pencil, Check, X } from "lucide-react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";

import { client, orpc } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { locales, localeNames } from "@/i18n/config";
import { setLocaleCookie } from "@/i18n/locale-client";
import type { Locale } from "@/i18n/config";

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Ho_Chi_Minh",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Australia/Sydney",
];

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 256, 256);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export function SettingsForm({ session: _serverSession }: { session: any }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const currentLocale = useLocale();

  const { data: session } = authClient.useSession();
  const user = session?.user ?? _serverSession?.user;

  // Profile data from API
  const { data: profile } = useQuery({
    queryKey: ["profile", "getProfile"],
    queryFn: () => client.profile.getProfile(),
  });

  // States
  const [logoutDialog, setLogoutDialog] = useState(false);
  const [timezone, setTimezone] = useState<string | null>(null);

  // Name editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Bio
  const [bio, setBio] = useState<string | null>(null);
  const [bioSaved, setBioSaved] = useState<string | null>(null);

  // Password
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Avatar
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize timezone and bio from profile
  useEffect(() => {
    if (profile) {
      if (timezone === null) {
        setTimezone(profile.timezone);
      }
      if (bio === null) {
        setBio(profile.bio);
        setBioSaved(profile.bio);
      }
    }
  }, [profile, timezone, bio]);

  // Focus name input when editing
  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const userInitials =
    user?.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  // Avatar upload mutation
  const avatarMutation = useMutation({
    mutationFn: async (dataUrl: string) => {
      await authClient.updateUser({ image: dataUrl });
    },
    onSuccess: () => {
      toast.success(t("avatarUpdated"));
    },
    onError: () => {
      toast.error(t("failedUpdateAvatar"));
    },
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file);
      avatarMutation.mutate(dataUrl);
    } catch {
      toast.error(t("failedUpdateAvatar"));
    }
    e.target.value = "";
  };

  // Name update mutation
  const nameMutation = useMutation({
    mutationFn: async (name: string) => {
      await authClient.updateUser({ name });
    },
    onSuccess: () => {
      toast.success(t("nameUpdated"));
      setEditingName(false);
    },
    onError: () => {
      toast.error(t("failedUpdateName"));
    },
  });

  const handleNameSave = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== user?.name) {
      nameMutation.mutate(trimmed);
    } else {
      setEditingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameSave();
    } else if (e.key === "Escape") {
      setEditingName(false);
    }
  };

  // Bio update mutation
  const bioMutation = useMutation({
    mutationFn: async (bioText: string) => {
      return client.profile.updateBio({ bio: bioText });
    },
    onSuccess: () => {
      toast.success(t("bioUpdated"));
      setBioSaved(bio);
    },
    onError: () => {
      toast.error(t("failedUpdateBio"));
    },
  });

  // Timezone mutation
  const timezoneMutation = useMutation({
    mutationFn: async (newTimezone: string) => {
      return client.profile.updateTimezone({ timezone: newTimezone });
    },
    onSuccess: (_data, newTimezone) => {
      toast.success(t("timezoneUpdated"));
      setTimezone(newTimezone);
    },
    onError: () => {
      toast.error(t("failedUpdateTimezone"));
    },
  });

  // Password mutation
  const passwordMutation = useMutation({
    mutationFn: async () => {
      await authClient.changePassword({
        currentPassword,
        newPassword,
      });
    },
    onSuccess: () => {
      toast.success(t("passwordChanged"));
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: any) => {
      toast.error(error?.message || t("failedChangePassword"));
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error(t("passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("passwordMismatch"));
      return;
    }
    passwordMutation.mutate();
  };

  const handleLogout = async () => {
    await authClient.signOut();
    queryClient.clear();
    router.push("/login");
    toast.success(t("loggedOut"));
  };

  const handleLanguageChange = (locale: Locale) => {
    setLocaleCookie(locale);
    router.refresh();
  };

  const bioChanged = bio !== null && bio !== bioSaved;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* Avatar + Profile Section */}
      <div className="glass-strong rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6b6b]/20 to-[#ffa06b]/20">
            <User className="h-5 w-5 text-[#ff6b6b]" />
          </div>
          <div>
            <h2 className="font-semibold">{t("editProfile")}</h2>
            <p className="text-sm text-muted-foreground">{t("editProfileDesc")}</p>
          </div>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-2xl font-bold text-white overflow-hidden">
              {user?.image ? (
                <img
                  src={user.image}
                  alt={t("avatar")}
                  className="h-full w-full object-cover"
                />
              ) : (
                userInitials
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarMutation.isPending}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Camera className="h-6 w-6 text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarMutation.isPending}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {avatarMutation.isPending ? tc("saving") : t("changeAvatar")}
          </button>
        </div>

        {/* Account Info */}
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-overlay-subtle">
            <span className="text-sm text-muted-foreground">{t("email")}</span>
            <span className="text-sm font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-overlay-subtle">
            <span className="text-sm text-muted-foreground">{t("displayName")}</span>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={handleNameKeyDown}
                  className="h-8 w-40 rounded-lg border border-overlay-medium bg-overlay-subtle px-3 text-sm font-medium focus:border-[#4ecdc4] focus:outline-none"
                  disabled={nameMutation.isPending}
                />
                <button
                  type="button"
                  onClick={handleNameSave}
                  disabled={nameMutation.isPending}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4ecdc4]/20 text-[#4ecdc4] hover:bg-[#4ecdc4]/30 transition-colors"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingName(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-overlay-subtle text-muted-foreground hover:bg-overlay-medium transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setNameValue(user?.name || "");
                  setEditingName(true);
                }}
                className="flex items-center gap-2 text-sm font-medium hover:text-[#4ecdc4] transition-colors group"
              >
                <span>{user?.name || t("notSet")}</span>
                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{t("bio")}</span>
            <span className="text-xs text-muted-foreground">
              {t("bioCharCount", { count: bio?.length ?? 0 })}
            </span>
          </div>
          <textarea
            value={bio ?? ""}
            onChange={(e) => {
              if (e.target.value.length <= 500) {
                setBio(e.target.value);
              }
            }}
            placeholder={t("bioPlaceholder")}
            rows={3}
            className="w-full rounded-xl border border-overlay-medium bg-overlay-subtle px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:border-[#4ecdc4] focus:outline-none resize-none"
          />
          {bioChanged && (
            <div className="flex justify-end mt-2">
              <Button
                size="sm"
                onClick={() => bioMutation.mutate(bio ?? "")}
                disabled={bioMutation.isPending}
              >
                {bioMutation.isPending ? tc("saving") : tc("save")}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Language Settings */}
      <div className="glass-strong rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#a78bfa]/20 to-[#f472b6]/20">
            <Globe className="h-5 w-5 text-[#a78bfa]" />
          </div>
          <div>
            <h2 className="font-semibold">{t("language")}</h2>
            <p className="text-sm text-muted-foreground">{t("languageDesc")}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {locales.map((locale) => {
            const isSelected = currentLocale === locale;
            return (
              <button
                key={locale}
                onClick={() => handleLanguageChange(locale)}
                className={`w-full text-left rounded-xl border p-3 transition-all ${
                  isSelected
                    ? "border-[#a78bfa] bg-[#a78bfa]/10"
                    : "border-overlay-medium bg-overlay-subtle hover:border-overlay-strong"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="block text-sm font-medium">{localeNames[locale]}</span>
                  {isSelected && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#a78bfa]">
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timezone Settings */}
      <div className="glass-strong rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ffa06b]/20 to-[#4ecdc4]/20">
            <Clock className="h-5 w-5 text-[#ffa06b]" />
          </div>
          <div>
            <h2 className="font-semibold">{t("timezone")}</h2>
            <p className="text-sm text-muted-foreground">{t("timezoneDesc")}</p>
          </div>
        </div>

        <div className="space-y-2">
          {COMMON_TIMEZONES.map((tz) => {
            const isSelected = timezone === tz;
            const tzDisplay = tz.replace("_", " ");
            const offset = new Intl.DateTimeFormat("en-US", {
              timeZone: tz,
              timeZoneName: "shortOffset",
            }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value;

            return (
              <button
                key={tz}
                onClick={() => timezoneMutation.mutate(tz)}
                disabled={timezoneMutation.isPending}
                className={`w-full text-left rounded-xl border p-3 transition-all ${
                  isSelected
                    ? "border-[#4ecdc4] bg-[#4ecdc4]/10"
                    : "border-overlay-medium bg-overlay-subtle hover:border-overlay-strong"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-sm font-medium">{tzDisplay}</span>
                    <span className="text-xs text-muted-foreground">{offset}</span>
                  </div>
                  {isSelected && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#4ecdc4]">
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Security */}
      <div className="glass-strong rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#f472b6]/20 to-[#ff6b6b]/20">
            <Shield className="h-5 w-5 text-[#f472b6]" />
          </div>
          <div>
            <h2 className="font-semibold">{t("security")}</h2>
            <p className="text-sm text-muted-foreground">{t("securityDesc")}</p>
          </div>
        </div>

        {showPasswordForm ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">{t("currentPassword")}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-overlay-medium bg-overlay-subtle px-4 py-2.5 text-sm focus:border-[#f472b6] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">{t("newPassword")}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-overlay-medium bg-overlay-subtle px-4 py-2.5 text-sm focus:border-[#f472b6] focus:outline-none"
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">{t("confirmPassword")}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-overlay-medium bg-overlay-subtle px-4 py-2.5 text-sm focus:border-[#f472b6] focus:outline-none"
                required
                minLength={8}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                type="submit"
                size="sm"
                disabled={passwordMutation.isPending}
              >
                {passwordMutation.isPending ? tc("saving") : t("changePassword")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowPasswordForm(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
              >
                {tc("cancel")}
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowPasswordForm(true)}
            className="w-full justify-start"
          >
            <Shield className="mr-2 h-4 w-4" />
            {t("changePassword")}
          </Button>
        )}
      </div>

      {/* Notifications */}
      <div className="glass-strong rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4ecdc4]/20 to-[#a78bfa]/20">
            <Bell className="h-5 w-5 text-[#4ecdc4]" />
          </div>
          <div>
            <h2 className="font-semibold">{t("notifications")}</h2>
            <p className="text-sm text-muted-foreground">{t("notificationsDesc")}</p>
          </div>
        </div>

        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-4">
            {t("setupReminders")}
          </p>
          <Link href="/reminders">
            <Button variant="outline">{t("manageReminders")}</Button>
          </Link>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-strong rounded-2xl border border-red-500/20 p-6">
        <h2 className="font-semibold text-red-500 mb-4">{t("dangerZone")}</h2>

        <div className="space-y-3">
          <Button
            variant="outline"
            onClick={() => setLogoutDialog(true)}
            className="w-full justify-start"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("logOut")}
          </Button>
        </div>
      </div>

      {/* Logout Confirmation */}
      <ConfirmDialog
        open={logoutDialog}
        onOpenChange={setLogoutDialog}
        title={t("logOutConfirmTitle")}
        description={t("logOutConfirmDesc")}
        confirmText={t("logOut")}
        variant="warning"
        onConfirm={handleLogout}
      />
    </div>
  );
}
