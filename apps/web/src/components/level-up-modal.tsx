"use client";

import { useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getLevelInfo } from "@/lib/level-utils";
import { useTranslations, useLocale } from "next-intl";
import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";
import { RankIcon } from "./rank-icon";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Sparkles, Trophy } from "lucide-react";

interface LevelUpModalProps {
  level: number | null;
  onClose: () => void;
}

export function LevelUpModal({ level, onClose }: LevelUpModalProps) {
  const t = useTranslations("levelUp");
  const locale = useLocale();

  const { data: profile } = useQuery({
    ...orpc.gamification.getProfile.queryOptions(),
    enabled: level !== null,
    staleTime: 1000 * 60,
  });

  const handleConfetti = useCallback(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, start a bit higher than random
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  }, []);

  useEffect(() => {
    if (level !== null) {
      // Small delay for the modal to open
      setTimeout(handleConfetti, 300);
    }
  }, [level, handleConfetti]);

  if (level === null) return null;

  const info = getLevelInfo(level, profile?.gender);
  const name = locale === "vi" ? info.nameVi : info.nameEn;

  return (
    <Dialog open={level !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-none bg-transparent p-0 shadow-none focus:outline-none overflow-hidden">
        <div className="relative p-8 rounded-[2rem] overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 blur-3xl rounded-full" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-secondary/20 blur-3xl rounded-full" />

          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.15,
                },
              },
            }}
            className="flex flex-col items-center text-center relative z-10"
          >
            <motion.div
              variants={{
                hidden: { scale: 0.8, opacity: 0 },
                visible: { scale: 1, opacity: 1, transition: { type: "spring", damping: 12 } },
              }}
              className="mb-2 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold uppercase tracking-wider"
            >
              <Trophy className="w-4 h-4" />
              {t("title")}
            </motion.div>

            <motion.div
              variants={{
                hidden: { y: 20, opacity: 0 },
                visible: { y: 0, opacity: 1 },
              }}
              className="relative mb-8 mt-4"
            >
              {/* Outer glowing ring */}
              <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full animate-pulse-glow" />

              <div className="relative animate-float">
                <RankIcon level={level} gender={profile?.gender} size={184} />
              </div>

              {/* Sparkle effects */}
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                  rotate: [0, 90, 0]
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute top-0 right-0 text-accent"
              >
                <Sparkles size={32} />
              </motion.div>
            </motion.div>

            <motion.div
              variants={{
                hidden: { y: 20, opacity: 0 },
                visible: { y: 0, opacity: 1 },
              }}
            >
              <h2 className="text-4xl md:text-5xl font-black gradient-text mb-2 tracking-tight">
                {t("levelLabel", { level })}
              </h2>
              <p className="text-xl md:text-2xl font-bold text-foreground/90 mb-4 tracking-tight uppercase">
                {name}
              </p>
              <p className="text-muted-foreground text-lg max-w-[280px] leading-relaxed mx-auto italic">
                "{t("description")}"
              </p>
            </motion.div>

            <motion.div
              variants={{
                hidden: { y: 20, opacity: 0 },
                visible: { y: 0, opacity: 1 },
              }}
              className="mt-10 w-full"
            >
              <Button
                onClick={onClose}
                size="lg"
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary text-white font-black text-xl shadow-xl shadow-primary/20 border-none hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                {t("awesome")}
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
