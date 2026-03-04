"use client";

import { ArrowRight, Sparkles, TrendingUp, Users, Zap } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { LanguageSwitcher } from "@/components/language-switcher";
import { PWAInstallButton } from "@/components/pwa-install-button";

export default function Home() {
  const t = useTranslations("landing");

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-mesh bg-grid-pattern">
      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <LanguageSwitcher />
        <PWAInstallButton />
      </div>

      {/* Floating Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -right-40 h-96 w-96 rounded-full opacity-30 blur-3xl animate-float"
          style={{ background: "linear-gradient(135deg, #ff6b6b, #ffa06b)" }}
        />
        <div
          className="absolute top-1/3 -left-20 h-80 w-80 rounded-full opacity-20 blur-3xl animate-float"
          style={{ animationDelay: "2s", background: "linear-gradient(135deg, #4ecdc4, #a78bfa)" }}
        />
        <div
          className="absolute bottom-20 right-1/4 h-64 w-64 rounded-full opacity-25 blur-3xl animate-float"
          style={{ animationDelay: "4s", background: "linear-gradient(135deg, #f472b6, #ffa06b)" }}
        />
      </div>

      {/* Hero Section */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
        <div className="mx-auto max-w-5xl text-center">
          {/* Badge */}
          <div className="mb-8 flex justify-center animate-scale-in">
            <div className="glass-strong rounded-full px-5 py-2 text-sm">
              <span className="gradient-text font-semibold">✨ {t("badge")}</span>
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="mb-6 font-display text-5xl font-bold leading-tight sm:text-6xl md:text-7xl lg:text-8xl animate-slide-up">
            <span className="gradient-text animate-gradient">{t("heroGrow")}</span>
            <span className="text-foreground">{t("heroTogether")}</span>
            <br />
            <span className="text-foreground">{t("heroThrive")}</span>
            <span className="gradient-text animate-gradient">{t("heroForever")}</span>
          </h1>

          {/* Subheading */}
          <p className="mb-10 max-w-2xl mx-auto text-lg text-muted-foreground sm:text-xl animate-slide-up text-center" style={{ animationDelay: "150ms" }}>
            {t("subheading")}
          </p>

          {/* CTA Buttons */}
          <div className="mb-16 flex flex-col items-center gap-4 sm:flex-row sm:justify-center animate-slide-up" style={{ animationDelay: "300ms" }}>
            <Link
              href="/login"
              className="group relative overflow-hidden rounded-full bg-gradient-to-r from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] px-8 py-4 font-semibold text-white shadow-lg shadow-[#ff6b6b]/25 transition-all hover:scale-105 hover:shadow-xl hover:shadow-[#ff6b6b]/40"
              style={{ backgroundSize: "200% 200%" }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundPosition = "100% 50%"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundPosition = "0% 50%"}
            >
              <span className="relative z-10 flex items-center gap-2">
                {t("ctaStart")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>

            <Link
              href="#learn-more"
              className="glass-strong rounded-full px-8 py-4 font-semibold transition-all hover:bg-overlay-medium hover:scale-105"
            >
              {t("ctaLearnMore")}
            </Link>
          </div>

        </div>
      </div>

      {/* Features Section */}
      <div id="learn-more" className="relative z-10 px-4 pb-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center font-display text-3xl font-bold sm:text-4xl">
            {t("featuresHeading")}
            <span className="gradient-text animate-gradient">{t("featuresHighlight")}</span>
          </h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 stagger-children">
            {/* Feature 1 */}
            <div className="glass-strong group rounded-3xl p-6 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-[#ff6b6b]/10 animate-slide-up opacity-0" style={{ animationDelay: "600ms", animationFillMode: "forwards" }}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6b6b] to-[#ffa06b] text-white shadow-lg shadow-[#ff6b6b]/30">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-display text-xl font-bold">{t("featureXpTitle")}</h3>
              <p className="text-muted-foreground">
                {t("featureXpDesc")}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-strong group rounded-3xl p-6 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-[#4ecdc4]/10 animate-slide-up opacity-0" style={{ animationDelay: "700ms", animationFillMode: "forwards" }}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4ecdc4] to-[#a78bfa] text-white shadow-lg shadow-[#4ecdc4]/30">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-display text-xl font-bold">{t("featureStreakTitle")}</h3>
              <p className="text-muted-foreground">
                {t("featureStreakDesc")}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-strong group rounded-3xl p-6 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-[#ffa06b]/10 animate-slide-up opacity-0" style={{ animationDelay: "800ms", animationFillMode: "forwards" }}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ffa06b] to-[#f472b6] text-white shadow-lg shadow-[#ffa06b]/30">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-display text-xl font-bold">{t("featureGroupTitle")}</h3>
              <p className="text-muted-foreground">
                {t("featureGroupDesc")}
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass-strong group rounded-3xl p-6 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-[#a78bfa]/10 animate-slide-up opacity-0" style={{ animationDelay: "900ms", animationFillMode: "forwards" }}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#f472b6] text-white shadow-lg shadow-[#a78bfa]/30">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-display text-xl font-bold">{t("featureAchievementTitle")}</h3>
              <p className="text-muted-foreground">
                {t("featureAchievementDesc")}
              </p>
            </div>

            {/* Feature 5 */}
            <div className="glass-strong group rounded-3xl p-6 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-[#4ecdc4]/10 animate-slide-up opacity-0 md:col-span-2 lg:col-span-1" style={{ animationDelay: "1s", animationFillMode: "forwards" }}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4ecdc4] to-[#ff6b6b] text-white shadow-lg shadow-[#4ecdc4]/30">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="mb-2 font-display text-xl font-bold">{t("featureAnalyticsTitle")}</h3>
              <p className="text-muted-foreground">
                {t("featureAnalyticsDesc")}
              </p>
            </div>

            {/* Feature 6 - CTA */}
            <div className="glass-strong group overflow-hidden rounded-3xl p-6 transition-all hover:scale-[1.02] animate-slide-up opacity-0 md:col-span-2 lg:col-span-1" style={{ animationDelay: "1.1s", animationFillMode: "forwards" }}>
              <div className="relative z-10">
                <h3 className="mb-2 font-display text-2xl font-bold gradient-text">
                  {t("featureCtaTitle")}
                </h3>
                <p className="mb-6 text-muted-foreground">
                  {t("featureCtaDesc")}
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] px-6 py-3 font-semibold text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-[#ff6b6b]/25"
                >
                  {t("featureCtaButton")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div
                className="absolute inset-0 opacity-20 blur-3xl"
                style={{ background: "linear-gradient(135deg, #ff6b6b, #4ecdc4)" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-overlay-subtle px-4 py-8">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-sm text-muted-foreground">
            {t("footer")}
          </p>
        </div>
      </footer>
    </div>
  );
}
