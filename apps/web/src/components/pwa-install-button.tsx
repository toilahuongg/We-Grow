"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallButton({ className }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const t = useTranslations("pwa");

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      // Check if user has previously dismissed the install prompt
      const hasDismissed = localStorage.getItem("pwa-install-dismissed");
      if (!hasDismissed) {
        setShowBanner(true);
      } else {
        setShowInstallButton(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowBanner(false);
      setShowInstallButton(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowBanner(false);
      setShowInstallButton(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowInstallButton(true);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  const handleRemove = () => {
    setShowInstallButton(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  // Show banner (prominent install prompt)
  if (showBanner) {
    return (
      <div
        className={cn(
          "fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50",
          "glass-strong rounded-2xl p-4 shadow-2xl animate-slide-up",
          className
        )}
      >
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-white shadow-lg">
            <Download className="h-6 w-6" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-lg mb-1">
              {t("installTitle")}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              {t("installDescription")}
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "flex-1 bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] text-white hover:opacity-90"
                )}
              >
                {t("installButton")}
              </button>
              <button
                onClick={handleDismiss}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "flex-1"
                )}
              >
                {t("notNow")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show small install button (after dismissal)
  if (showInstallButton) {
    return (
      <button
        onClick={handleInstall}
        className={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "glass-strong relative",
          "after:absolute after:-top-1 after:-right-1 after:h-3 after:w-3 after:rounded-full after:bg-[#ff6b6b] after:animate-pulse",
          className
        )}
        title={t("installApp")}
      >
        <Download className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">{t("installApp")}</span>
      </button>
    );
  }

  return null;
}
