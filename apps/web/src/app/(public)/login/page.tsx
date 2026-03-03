"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export default function LoginPage() {
  const [showSignIn, setShowSignIn] = useState(false);
  const t = useTranslations("auth");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-mesh bg-grid-pattern">
      {/* Floating Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -left-40 h-96 w-96 rounded-full opacity-30 blur-3xl animate-float"
          style={{ background: "linear-gradient(135deg, #4ecdc4, #a78bfa)" }}
        />
        <div
          className="absolute bottom-20 right-1/4 h-80 w-80 rounded-full opacity-20 blur-3xl animate-float"
          style={{ animationDelay: "3s", background: "linear-gradient(135deg, #ff6b6b, #ffa06b)" }}
        />
      </div>

      {/* Card Container */}
      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <Link href="/" className="mb-8 flex items-center justify-center gap-3 transition-opacity hover:opacity-80">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-white shadow-xl shadow-[#ff6b6b]/30">
            <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="font-display text-2xl font-bold">we-grow</span>
        </Link>

        {/* Form Card */}
        <div className="glass-strong rounded-3xl p-8 shadow-2xl">
          {showSignIn ? (
            <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
          ) : (
            <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
          )}
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t("backToHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
