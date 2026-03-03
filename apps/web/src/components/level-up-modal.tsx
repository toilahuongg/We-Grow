"use client";

import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getLevelInfo } from "@/lib/level-utils";
import { useTranslations, useLocale } from "next-intl";

interface LevelUpModalProps {
  level: number | null;
  onClose: () => void;
}

export function LevelUpModal({ level, onClose }: LevelUpModalProps) {
  const t = useTranslations("levelUp");
  const locale = useLocale();

  if (level === null) return null;

  const info = getLevelInfo(level);
  const name = locale === "vi" ? info.nameVi : info.nameEn;

  return (
    <Dialog open={level !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogHeader className="text-center">
        <DialogTitle className="text-center">{t("title")}</DialogTitle>
        <DialogDescription className="text-center">
          {t("description")}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col items-center py-6">
        <div className="text-7xl mb-4 animate-bounce">{info.icon}</div>
        <p className="text-2xl font-bold gradient-text mb-1">
          {t("levelLabel", { level })}
        </p>
        <p className="text-lg text-muted-foreground">{name}</p>
      </div>
      <DialogFooter className="sm:justify-center">
        <Button
          onClick={onClose}
          className="bg-gradient-to-r from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-white px-8"
        >
          {t("awesome")}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
