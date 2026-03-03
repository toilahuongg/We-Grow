"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Edit2, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";

import { orpc } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";

type FilterType = "all" | "active" | "completed";
type PriorityType = "all" | "normal" | "important" | "urgent";

const priorityConfig = {
  normal: {
    label: "Normal",
    color: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    dot: "bg-blue-500",
  },
  important: {
    label: "Important",
    color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    dot: "bg-yellow-500",
  },
  urgent: {
    label: "Urgent",
    color: "bg-red-500/20 text-red-500 border-red-500/30",
    dot: "bg-red-500",
  },
};

export function TodosList() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityType>("all");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; todoId: string | null; todoTitle: string }>({
    open: false,
    todoId: null,
    todoTitle: "",
  });
  const [editingTodo, setEditingTodo] = useState<any>(null);

  const { data: todos, isLoading } = useQuery({
    ...orpc.todos.list.queryOptions({
      completed: filter === "active" ? false : filter === "completed" ? true : undefined,
      priority: priorityFilter === "all" ? undefined : priorityFilter,
    }),
    staleTime: 1000 * 60,
  });

  const deleteMutation = useMutation({
    mutationFn: (todoId: string) => orpc.todos.delete.mutate({ todoId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.todos.list.queryKey() });
      toast.success("Todo deleted");
    },
    onError: () => {
      toast.error("Failed to delete todo");
    },
  });

  const completeMutation = useMutation({
    mutationFn: (todoId: string) => orpc.todos.complete.mutate({ todoId }),
    onSuccess: (result) => {
      if (!result.alreadyCompleted) {
        toast.success(`+${result.xpAwarded} XP! ✨`);
      }
      queryClient.invalidateQueries({ queryKey: orpc.todos.list.queryKey() });
      queryClient.invalidateQueries({ queryKey: orpc.gamification.getProfile.queryKey() });
    },
  });

  const uncompleteMutation = useMutation({
    mutationFn: (todoId: string) => orpc.todos.uncomplete.mutate({ todoId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.todos.list.queryKey() });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="glass-strong rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-white/10" />
            <div className="h-6 w-32 animate-pulse rounded bg-white/10" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-3xl font-bold">Todos</h1>
            <p className="text-sm text-muted-foreground">
              One-time tasks to complete
            </p>
          </div>
        </div>
        <button
          onClick={() => setEditingTodo({})}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] text-white shadow-lg shadow-[#ff6b6b]/25 transition-all hover:scale-110 hover:shadow-xl"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="flex gap-1">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={filter === "active" ? "default" : "outline"}
            onClick={() => setFilter("active")}
            size="sm"
          >
            Active
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "outline"}
            onClick={() => setFilter("completed")}
            size="sm"
          >
            Completed
          </Button>
        </div>
        <div className="h-6 w-px bg-white/10" />
        <div className="flex gap-1">
          {(["all", "normal", "important", "urgent"] as const).map((p) => (
            <Button
              key={p}
              variant={priorityFilter === p ? "default" : "outline"}
              onClick={() => setPriorityFilter(p)}
              size="sm"
            >
              {p === "all" ? "All Priorities" : priorityConfig[p as keyof typeof priorityConfig].label}
            </Button>
          ))}
        </div>
      </div>

      {/* Todos List */}
      {!todos || todos.length === 0 ? (
        <EmptyState
          title="No todos yet"
          description="Create your first todo to track your one-time tasks"
          action={{
            label: "Create Todo",
            onClick: () => setEditingTodo({}),
          }}
        />
      ) : (
        <div className="space-y-3">
          {todos.map((todo: any) => (
            <div
              key={todo._id}
              className={`glass-strong group relative rounded-xl border border-white/5 bg-white/5 p-4 transition-all hover:border-white/10 ${
                todo.completed ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Complete Button */}
                <button
                  onClick={() => {
                    if (todo.completed) {
                      uncompleteMutation.mutate(todo._id);
                    } else {
                      completeMutation.mutate(todo._id);
                    }
                  }}
                  className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center"
                  disabled={completeMutation.isPending || uncompleteMutation.isPending}
                >
                  {todo.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-[#4ecdc4]" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>

                {/* Todo Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-semibold ${todo.completed ? "line-through text-muted-foreground" : ""}`}>
                      {todo.title}
                    </h3>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                      priorityConfig[todo.priority || "normal"]?.color || priorityConfig.normal.color
                    }`}>
                      <div className={`mr-1 h-1.5 w-1.5 rounded-full ${
                        priorityConfig[todo.priority || "normal"]?.dot || priorityConfig.normal.dot
                      } inline-block`} />
                      {priorityConfig[todo.priority || "normal"]?.label || "Normal"}
                    </span>
                  </div>
                  {todo.description && (
                    <p className={`mt-1 text-sm ${todo.completed ? "text-muted-foreground line-through" : ""}`}>
                      {todo.description}
                    </p>
                  )}
                  {todo.completedAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Completed {new Date(todo.completedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingTodo(todo)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-muted-foreground transition-all hover:bg-white/20 hover:text-foreground"
                    title="Edit todo"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setDeleteDialog({ open: true, todoId: todo._id, todoTitle: todo.title })}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-muted-foreground transition-all hover:bg-red-500/20 hover:text-red-500"
                    title="Delete todo"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Delete Todo"
        description={`Are you sure you want to delete "${deleteDialog.todoTitle}"?`}
        confirmText="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteDialog.todoId) {
            deleteMutation.mutate(deleteDialog.todoId);
          }
        }}
        isLoading={deleteMutation.isPending}
      />

      {/* Edit Todo Modal */}
      {editingTodo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
            onClick={() => setEditingTodo(null)}
          />
          <div className="relative z-50 glass-strong rounded-2xl p-6 shadow-xl w-full max-w-md mx-4 animate-in zoom-in-95">
            <h2 className="text-lg font-bold mb-4">
              {editingTodo._id ? "Edit Todo" : "Create Todo"}
            </h2>
            <TodoForm
              todo={editingTodo}
              isEditing={!!editingTodo._id}
              onSuccess={() => setEditingTodo(null)}
              onCancel={() => setEditingTodo(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Todo Form Component (inline)
function TodoForm({ todo, isEditing, onSuccess, onCancel }: {
  todo?: any;
  isEditing?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(todo?.title ?? "");
  const [description, setDescription] = useState(todo?.description ?? "");
  const [priority, setPriority] = useState(todo?.priority ?? "normal");

  const createMutation = useMutation({
    mutationFn: orpc.todos.create.mutate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.todos.list.queryKey() });
      toast.success("Todo created! ✨");
      onSuccess();
    },
    onError: () => toast.error("Failed to create todo"),
  });

  const updateMutation = useMutation({
    mutationFn: (updates: any) => orpc.todos.update.mutate({ todoId: todo._id, ...updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.todos.list.queryKey() });
      toast.success("Todo updated! ✨");
      onSuccess();
    },
    onError: () => toast.error("Failed to update todo"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (isEditing) {
      updateMutation.mutate({ title, description, priority });
    } else {
      createMutation.mutate({ title, description, priority });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-[#4ecdc4] outline-none"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details (optional)"
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-[#4ecdc4] outline-none resize-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Priority</label>
        <div className="grid grid-cols-3 gap-2">
          {(["normal", "important", "urgent"] as const).map((p) => (
            <label
              key={p}
              className={`cursor-pointer rounded-lg border p-2 text-center text-sm transition-all ${
                priority === p
                  ? "border-[#4ecdc4] bg-[#4ecdc4]/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <input
                type="radio"
                name="priority"
                value={p}
                checked={priority === p}
                onChange={(e) => setPriority(e.target.value as any)}
                className="sr-only"
              />
              {priorityConfig[p].label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-gradient-to-r from-[#ff6b6b] via-[#ffa06b] to-[#4ecdc4] text-white"
          disabled={createMutation.isPending || updateMutation.isPending || !title.trim()}
        >
          {createMutation.isPending || updateMutation.isPending
            ? "Saving..."
            : isEditing
            ? "Update"
            : "Create"}
        </Button>
      </div>
    </form>
  );
}
