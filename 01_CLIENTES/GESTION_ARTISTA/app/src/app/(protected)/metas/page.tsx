"use client";

import { useState, useEffect, useCallback } from "react";
import { getGoals, createGoal, updateGoal, deleteGoal } from "@/lib/actions/goals";
import type { Goal } from "@/types/database";
import type { GoalFormData } from "@/lib/schemas";
import { GoalSchema } from "@/lib/schemas";
import { useToast } from "@/components/ui/ToastProvider";
import { PageTransition, StaggerList, StaggerItem, AnimatedCounter } from "@/components/ui/MotionWrapper";
import { GoalCardSkeleton } from "@/components/ui/Skeletons";
import {
  Target,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  X,
  Trophy,
  TrendingUp,
  Zap,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  streams: "Streams",
  seguidores: "Seguidores",
  lanzamientos: "Lanzamientos",
  ingresos: "Ingresos ($)",
  colaboraciones: "Colaboraciones",
  otro: "Otro",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  streams: <Zap className="h-4 w-4" />,
  seguidores: <TrendingUp className="h-4 w-4" />,
  lanzamientos: <Trophy className="h-4 w-4" />,
  ingresos: <span className="text-xs font-bold">$</span>,
  colaboraciones: <Target className="h-4 w-4" />,
  otro: <Target className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  streams: "bg-blue-500",
  seguidores: "bg-purple-500",
  lanzamientos: "bg-amber-500",
  ingresos: "bg-green-500",
  colaboraciones: "bg-pink-500",
  otro: "bg-slate-500",
};

const CATEGORIES = Object.keys(CATEGORY_LABELS);

// ─── GoalForm ─────────────────────────────────────────────────────────────────
interface GoalFormProps {
  onClose: () => void;
  onSave: (data: GoalFormData) => Promise<void>;
  initial?: Partial<GoalFormData>;
}

function GoalForm({ onClose, onSave, initial }: GoalFormProps) {
  const [form, setForm] = useState<GoalFormData>({
    title: initial?.title ?? "",
    category: initial?.category ?? "otro",
    target_value: initial?.target_value ?? 1000,
    current_value: initial?.current_value ?? 0,
    target_date: initial?.target_date ?? null,
    notes: initial?.notes ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = GoalSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const err of parsed.error.errors) errs[err.path[0] as string] = err.message;
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      await onSave(parsed.data);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const field = (key: string) =>
    `border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 w-full ${errors[key] ? "border-red-400" : "border-border"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={handleSubmit} className="bg-card border rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Nueva meta</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Título</label>
          <input
            type="text"
            className={field("title")}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Ej: 10,000 seguidores en Spotify"
          />
          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Categoría</label>
          <select
            className={field("category")}
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as any }))}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Valor objetivo</label>
            <input
              type="number"
              min="1"
              className={field("target_value")}
              value={form.target_value || ""}
              onChange={(e) => setForm((f) => ({ ...f, target_value: parseFloat(e.target.value) || 0 }))}
            />
            {errors.target_value && <p className="text-red-500 text-xs mt-1">{errors.target_value}</p>}
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Progreso actual</label>
            <input
              type="number"
              min="0"
              className={field("current_value")}
              value={form.current_value || ""}
              onChange={(e) => setForm((f) => ({ ...f, current_value: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Fecha objetivo (opcional)</label>
          <input
            type="date"
            className={field("target_date")}
            value={form.target_date ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, target_date: e.target.value || null }))}
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Notas (opcional)</label>
          <textarea
            rows={2}
            className={field("notes")}
            value={form.notes ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
            placeholder="Contexto, estrategia..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border rounded-lg px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Guardando..." : "Guardar meta"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── GoalCard ─────────────────────────────────────────────────────────────────
interface GoalCardProps {
  goal: Goal;
  onToggle: (id: string, is_completed: boolean) => void;
  onDelete: (id: string) => void;
  onUpdateProgress: (id: string, current_value: number) => void;
}

function GoalCard({ goal, onToggle, onDelete, onUpdateProgress }: GoalCardProps) {
  const percent = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(String(goal.current_value));

  const saveProgress = () => {
    const val = parseFloat(tempValue);
    if (!isNaN(val) && val >= 0) onUpdateProgress(goal.id, val);
    setEditing(false);
  };

  const daysLeft = goal.target_date
    ? Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className={`rounded-lg border bg-card p-5 space-y-3 transition-all ${goal.is_completed ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 ${CATEGORY_COLORS[goal.category]}`}>
            {CATEGORY_ICONS[goal.category]}
          </div>
          <div className="min-w-0">
            <p className={`font-medium text-sm leading-snug ${goal.is_completed ? "line-through text-muted-foreground" : ""}`}>
              {goal.title}
            </p>
            <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[goal.category]}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggle(goal.id, !goal.is_completed)}
            className="text-muted-foreground hover:text-green-500 transition-colors p-1"
            title={goal.is_completed ? "Marcar como pendiente" : "Marcar como completada"}
          >
            {goal.is_completed ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Circle className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={() => onDelete(goal.id)}
            className="text-muted-foreground hover:text-red-500 transition-colors p-1"
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Progreso</span>
          <span className="font-medium text-foreground">{percent}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              percent >= 100 ? "bg-green-500" : CATEGORY_COLORS[goal.category]
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="border rounded px-2 py-0.5 text-xs w-24 bg-background"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveProgress()}
                autoFocus
              />
              <button onClick={saveProgress} className="text-primary text-xs">OK</button>
              <button onClick={() => setEditing(false)} className="text-muted-foreground text-xs">✕</button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="hover:text-primary transition-colors"
              title="Editar progreso"
            >
              {goal.current_value.toLocaleString()} / {goal.target_value.toLocaleString()}
            </button>
          )}
          {daysLeft !== null && (
            <span className={daysLeft < 0 ? "text-red-500" : daysLeft < 30 ? "text-amber-500" : ""}>
              {daysLeft < 0 ? `Vencida hace ${Math.abs(daysLeft)}d` : `${daysLeft}d restantes`}
            </span>
          )}
        </div>
      </div>

      {goal.notes && (
        <p className="text-xs text-muted-foreground border-t pt-2">{goal.notes}</p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MetasPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"activas" | "completadas" | "todas">("activas");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const { error: toastError, success: toastSuccess } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await getGoals(
        categoryFilter !== "todos" ? { category: categoryFilter } : undefined
      );
      if (error) toastError(error);
      else setGoals(data);
    } catch {
      toastError("Error al cargar metas");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  useEffect(() => { load(); }, [load]);

  const displayedGoals = goals.filter((g) => {
    if (filter === "activas") return !g.is_completed;
    if (filter === "completadas") return g.is_completed;
    return true;
  });

  const activeCount = goals.filter((g) => !g.is_completed).length;
  const doneCount = goals.filter((g) => g.is_completed).length;
  const avgProgress = goals.length
    ? Math.round(
        goals.reduce((s, g) => s + Math.min(100, (g.current_value / g.target_value) * 100), 0) /
          goals.length
      )
    : 0;

  const handleCreate = async (data: GoalFormData) => {
    const { error } = await createGoal(data);
    if (error) { toastError(error); return; }
    toastSuccess("Meta creada");
    load();
  };

  const handleToggle = async (id: string, is_completed: boolean) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, is_completed } : g))
    );
    const { error } = await updateGoal(id, { is_completed });
    if (error) {
      toastError(error);
      setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, is_completed: !is_completed } : g)));
    } else {
      toastSuccess(is_completed ? "¡Meta completada! 🎉" : "Meta reactivada");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta meta?")) return;
    setGoals((prev) => prev.filter((g) => g.id !== id));
    const { error } = await deleteGoal(id);
    if (error) { toastError(error); load(); return; }
    toastSuccess("Meta eliminada");
  };

  const handleUpdateProgress = async (id: string, current_value: number) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, current_value } : g)));
    const { error } = await updateGoal(id, { current_value });
    if (error) toastError(error);
  };

  return (
    <PageTransition className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Metas & Objetivos</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Definí y seguí tus metas artísticas
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nueva meta
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              <AnimatedCounter value={activeCount} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">Activas</div>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              <AnimatedCounter value={doneCount} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">Completadas</div>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="text-2xl font-bold">
              <AnimatedCounter value={avgProgress} suffix="%" />
            </div>
            <div className="text-xs text-muted-foreground mt-1">Progreso prom.</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(["activas", "completadas", "todas"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors capitalize ${
                  filter === f
                    ? "bg-background shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm bg-background"
          >
            <option value="todos">Todas las categorías</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>

        {/* Goals Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <GoalCardSkeleton key={i} />)}
          </div>
        ) : displayedGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
            <Target className="h-12 w-12 opacity-30" />
            <div className="text-center">
              <p className="font-medium">
                {filter === "activas" ? "No hay metas activas" : filter === "completadas" ? "No hay metas completadas" : "No hay metas todavía"}
              </p>
              <p className="text-sm mt-1">Creá tu primera meta artística</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="text-primary text-sm hover:underline"
            >
              Crear meta
            </button>
          </div>
        ) : (
          <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedGoals.map((goal) => (
              <StaggerItem key={goal.id}>
                <GoalCard
                  goal={goal}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onUpdateProgress={handleUpdateProgress}
                />
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </div>

      {showForm && (
        <GoalForm onClose={() => setShowForm(false)} onSave={handleCreate} />
      )}
    </PageTransition>
  );
}
