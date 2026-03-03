"use client";

import { useState } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (note: string | null) => void;
  initialNote?: string | null;
  isLoading?: boolean;
}

export function NoteDialog({ open, onOpenChange, onSave, initialNote, isLoading }: NoteDialogProps) {
  const [note, setNote] = useState(initialNote ?? "");
  const t = useTranslations("noteDialog");

  const handleSave = () => {
    const trimmed = note.trim();
    onSave(trimmed || null);
  };

  const handleSkip = () => {
    onSave(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>
      <div className="py-4">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          rows={4}
          placeholder={t("placeholder")}
          className="w-full rounded-lg border border-overlay-medium bg-overlay-subtle px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#4ecdc4]/50"
        />
        <p className="text-xs text-muted-foreground mt-1 text-right">
          {note.length}/1000
        </p>
      </div>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="ghost" onClick={handleSkip} disabled={isLoading}>
          {t("skip")}
        </Button>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? t("saving") : t("save")}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
