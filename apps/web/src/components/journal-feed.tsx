"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Edit2, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";

import { orpc, client } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { NoteDialog } from "@/components/note-dialog";
import { toast } from "sonner";

export function JournalFeed() {
  const t = useTranslations("journal");
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [editingNote, setEditingNote] = useState<{
    habitId: string;
    date: string;
    note: string | null;
  } | null>(null);
  const limit = 20;

  const { data, isLoading } = useQuery({
    ...orpc.habits.getNotes.queryOptions({ input: { limit, offset: page * limit } }),
    staleTime: 1000 * 60,
  });

  const updateNoteMutation = useMutation({
    mutationFn: (input: { habitId: string; date: string; note: string | null }) =>
      client.habits.updateNote(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.habits.getNotes.queryKey() });
      toast.success(t("noteUpdated"));
      setEditingNote(null);
    },
    onError: () => {
      toast.error(t("failedUpdateNote"));
    },
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {isLoading ? (
        <div className="glass-strong rounded-2xl p-8">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        </div>
      ) : !data || data.notes.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8 text-[#a78bfa]" />}
          title={t("noNotesTitle")}
          description={t("noNotesDesc")}
        />
      ) : (
        <div className="space-y-4">
          {data.notes.map((entry: any) => (
            <div
              key={`${entry.habitId}-${entry.date}`}
              className="glass-strong rounded-2xl p-5"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold">{entry.habitTitle}</h3>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(entry.date + "T00:00:00"), "MMM d, yyyy")}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setEditingNote({
                      habitId: entry.habitId,
                      date: entry.date,
                      note: entry.note,
                    })
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-muted-foreground transition-all hover:bg-white/20 hover:text-foreground"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm whitespace-pre-wrap">{entry.note}</p>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("pageOf", { page: page + 1, total: totalPages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Edit Note Dialog */}
      {editingNote && (
        <NoteDialog
          open={!!editingNote}
          onOpenChange={(open) => !open && setEditingNote(null)}
          initialNote={editingNote.note}
          isLoading={updateNoteMutation.isPending}
          onSave={(note) => {
            updateNoteMutation.mutate({
              habitId: editingNote.habitId,
              date: editingNote.date,
              note,
            });
          }}
        />
      )}
    </div>
  );
}
