import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import z from "zod";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";
import { client } from "@/utils/orpc";

import Loader from "./loader";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function SignUpForm({ onSwitchToSignIn }: { onSwitchToSignIn: () => void }) {
  const router = useRouter();
  const t = useTranslations("auth");
  const { isPending } = authClient.useSession();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      name: "",
      gender: "male",
    },
    onSubmit: async ({ value }) => {
      const signUpResult = await authClient.signUp.email(
        {
          email: value.email,
          password: value.password,
          name: value.name,
        },
        {
          onSuccess: () => {
            toast.success(t("accountCreated"));
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );

      if (signUpResult.data) {
        await authClient.signIn.email(
          {
            email: value.email,
            password: value.password,
          },
          {
            onSuccess: () => {
              router.push("/groups");
              toast.success(t("welcomeToWeGrow"));
              const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
              if (tz) client.profile.updateTimezone({ timezone: tz }).catch(() => { });

              const genderValue = value.gender as any;
              client.profile.updateGender({ gender: genderValue }).catch(() => { });
            },
            onError: () => {
              toast.error(t("signInFailed"));
            },
          },
        );
      }
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(2, t("nameMinLength")),
        email: z.email(t("invalidEmail")),
        password: z.string().min(8, t("passwordMinLength")),
        gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
      }),
    },
  });

  if (isPending) {
    return <Loader />;
  }

  return (
    <div className="w-full max-w-md mx-auto animate-scale-in">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 font-display text-3xl font-bold">
          {t("startYour")} <span className="gradient-text">{t("journey")}</span>
        </h1>
        <p className="text-muted-foreground">{t("joinThousands")}</p>
      </div>

      {/* Google Sign Up Button */}
      <button
        type="button"
        onClick={() => {
          authClient.signIn.social(
            { provider: "google", callbackURL: "/groups" },
            {
              onSuccess: () => {
                router.push("/groups");
                toast.success(t("welcomeToWeGrow"));
                const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                if (tz) client.profile.updateTimezone({ timezone: tz }).catch(() => { });
              },
              onError: (error) => {
                toast.error(error.error.message || t("failedGoogleSignUp"));
              },
            }
          );
        }}
        className="group relative mb-6 flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-overlay-subtle border border-overlay-medium py-3.5 px-4 font-medium text-foreground text-center transition-all hover:bg-overlay-medium hover:scale-[1.02] hover:border-overlay-strong"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {t("continueWithGoogle")}
      </button>

      {/* Divider */}
      <div className="mb-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-overlay-medium" />
        <span className="text-sm text-muted-foreground">{t("orContinueWithEmail")}</span>
        <span className="h-px flex-1 bg-overlay-medium" />
      </div>

      {/* Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-5"
      >
        <div>
          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name} className="text-sm font-medium">{t("name")}</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  placeholder="John Doe"
                  className="h-12 rounded-xl border-border bg-background focus:border-[#ff6b6b] focus:ring-[#ff6b6b]/20"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-sm text-red-400">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name} className="text-sm font-medium">{t("email")}</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  placeholder="you@example.com"
                  className="h-12 rounded-xl border-border bg-background focus:border-[#ff6b6b] focus:ring-[#ff6b6b]/20"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-sm text-red-400">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="password">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name} className="text-sm font-medium">{t("password")}</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="password"
                  placeholder="••••••••"
                  className="h-12 rounded-xl border-border bg-background focus:border-[#ff6b6b] focus:ring-[#ff6b6b]/20"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-sm text-red-400">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="gender">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name} className="text-sm font-medium">
                  {useTranslations("settings")("gender")}
                </Label>
                <select
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="w-full h-12 rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-[#ff6b6b] focus:ring-[#ff6b6b]/20 focus:outline-none appearance-none"
                >
                  <option value="male">{useTranslations("settings")("genderMale")}</option>
                  <option value="female">{useTranslations("settings")("genderFemale")}</option>
                  <option value="other">{useTranslations("settings")("genderOther")}</option>
                  <option value="prefer_not_to_say">{useTranslations("settings")("genderPreferNotToSay")}</option>
                </select>
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-sm text-red-400">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <form.Subscribe>
          {(state) => (
            <Button
              type="submit"
              className="h-12 w-full rounded-full bg-gradient-to-r from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-base font-semibold text-white shadow-lg shadow-[#ff6b6b]/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-[#ff6b6b]/40 disabled:opacity-50"
              disabled={!state.canSubmit || state.isSubmitting}
            >
              {state.isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t("creatingAccount")}
                </span>
              ) : (
                t("createAccount")
              )}
            </Button>
          )}
        </form.Subscribe>
      </form>

      {/* Switch to Sign In */}
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          {t("alreadyHaveAccount")}{" "}
          <button
            onClick={onSwitchToSignIn}
            className="font-semibold text-[#4ecdc4] transition-colors hover:text-[#a78bfa]"
          >
            {t("signIn")}
          </button>
        </p>
      </div>

      {/* Terms */}
      <p className="mt-4 text-center text-xs text-muted-foreground">
        {t("termsNotice")}
      </p>
    </div>
  );
}
