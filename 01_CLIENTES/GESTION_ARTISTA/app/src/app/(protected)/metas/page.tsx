"use client";

import { useState, useEffect, useCallback } from "react";
import { getGoals, createGoal, updateGoal, deleteGoal, syncGoalNow } from "@/lib/actions/goals";
import type { Goal } from "@/types/database";
import type { GoalFormData } from "@/lib/schemas";
import { GoalSchema } from "@/lib/schemas";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
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
  Loader2,
  Pencil,
  Download,
  ChevronRight,
  RefreshCw,
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

function GoalForm({ onClose, onSave, initial, isEditing }: GoalFormProps & { isEditing?: boolean }) {
  const [form, setForm] = useState<GoalFormData>({
    title: initial?.title ?? "",
    category: initial?.category ?? "otro",
    target_value: initial?.target_value ?? 1000,
    current_value: initial?.current_value ?? 0,
    target_date: initial?.target_date ?? null,
    notes: initial?.notes ?? null,
    platform_url: (initial as Partial<GoalFormData & { platform_url?: string | null }>)?.platform_url ?? null,
    auto_update: (initial as Partial<GoalFormData & { auto_update?: boolean }>)?.auto_update ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

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
    `border rounded-xl px-3 py-2.5 text-sm bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors w-full ${errors[key] ? "border-red-400" : "border-border/60"}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Glow ring */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/20 via-transparent to-violet-500/10 pointer-events-none" />

        <form
          onSubmit={handleSubmit}
          className="relative glass-panel rounded-2xl w-full p-6 space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <h2 className="font-black text-base">{isEditing ? "Editar meta" : "Nueva meta"}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-all active:scale-95 p-1.5 rounded-xl hover:bg-muted/50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide">
              Título *
            </label>
            <input
              type="text"
              className={field("title")}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ej: 10,000 seguidores en Spotify"
              autoFocus
            />
            {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide">
              Categoría
            </label>
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
              <label className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide">
                Valor objetivo *
              </label>
              <input
                type="number"
                min="1"
                className={field("target_value")}
                value={form.target_value || ""}
                onChange={(e) => setForm((f) => ({ ...f, target_value: parseFloat(e.target.value) || 0 }))}
              />
              {errors.target_value && <p className="text-red-400 text-xs mt-1">{errors.target_value}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide">
                Progreso actual
              </label>
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
            <label className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide">
              Fecha objetivo (opcional)
            </label>
            <input
              type="date"
              className={`${field("target_date")} [color-scheme:dark]`}
              value={form.target_date ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, target_date: e.target.value || null }))}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide">
              Notas (opcional)
            </label>
            <textarea
              rows={2}
              className={field("notes")}
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
              placeholder="Contexto, estrategia..."
            />
          </div>

          {/* ── Auto-update via YouTube ─────────────────────────────────── */}
          <div className="space-y-2.5 border border-border/50 rounded-xl p-3.5 bg-secondary/30">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">Actualización automática</span>
              </div>
              {/* Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={form.auto_update}
                onClick={() => setForm((f) => ({ ...f, auto_update: !f.auto_update }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  form.auto_update ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  form.auto_update ? "translate-x-4" : "translate-x-0.5"
                }`} />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              El cron diario actualizará el progreso automáticamente desde YouTube
              (suscriptores de un canal o reproducciones de un video).
            </p>
            {form.auto_update && (
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  URL de YouTube *
                </label>
                <input
                  type="url"
                  className={field("platform_url")}
                  value={form.platform_url ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, platform_url: e.target.value || null }))}
                  placeholder="youtube.com/@TuCanal  o  youtube.com/watch?v=…"
                />
                {errors.platform_url && (
                  <p className="text-red-400 text-xs mt-1">{errors.platform_url}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  Canal → suscriptores · Video → reproducciones
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border/60 rounded-xl px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-black hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? "Actualizar meta" : "Guardar meta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── GoalCard ─────────────────────────────────────────────────────────────────
interface GoalCardProps {
  goal: Goal;
  onToggle: (id: string, is_completed: boolean) => void;
  onDelete: (id: string) => void;
  onUpdateProgress: (id: string, current_value: number) => void;
  onEdit: (goal: Goal) => void;
  onSyncNow: (id: string) => Promise<void>;
}

function GoalCard({ goal, onToggle, onDelete, onUpdateProgress, onEdit, onSyncNow }: GoalCardProps) {
  const percent = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(String(goal.current_value));
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    await onSyncNow(goal.id);
    setSyncing(false);
  };

  const saveProgress = () => {
    const val = parseFloat(tempValue);
    if (!isNaN(val) && val >= 0) onUpdateProgress(goal.id, val);
    setEditing(false);
  };

  const daysLeft = goal.target_date
    ? Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className={`card-premium card-gradient-border relative overflow-hidden rounded-2xl transition-all group ${goal.is_completed ? "opacity-60" : "hover:-translate-y-0.5 hover:shadow-[0_8px_24px_hsl(0_0%_0%/0.25)]"}`}>
      {/* Category accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${CATEGORY_COLORS[goal.category]} opacity-90 shadow-[2px_0_8px_currentColor]`} />

      <div className="pl-5 pr-4 pt-4 pb-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform shadow-[0_0_12px_currentColor] ${CATEGORY_COLORS[goal.category]}`}>
              {CATEGORY_ICONS[goal.category]}
            </div>
            <div className="min-w-0">
              <p className={`font-black text-sm leading-snug ${goal.is_completed ? "line-through text-muted-foreground" : ""}`}>
                {goal.title}
              </p>
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] text-muted-foreground">{CATEGORY_LABELS[goal.category]}</p>
                {goal.auto_update && (
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    title={syncing ? "Actualizando…" : "Sincronizar ahora desde YouTube"}
                    className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 font-medium hover:bg-red-500/25 transition-all active:scale-95 disabled:opacity-60"
                  >
                    <RefreshCw className={`h-2.5 w-2.5 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "…" : "Auto"}
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => onToggle(goal.id, !goal.is_completed)}
              className="text-muted-foreground hover:text-green-500 transition-all active:scale-95 p-1"
              title={goal.is_completed ? "Marcar como pendiente" : "Marcar como completada"}
            >
              {goal.is_completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={() => onEdit(goal)}
              className="text-muted-foreground hover:text-foreground transition-all active:scale-95 p-1 opacity-0 group-hover:opacity-100"
              title="Editar meta"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(goal.id)}
              className="text-muted-foreground hover:text-red-500 transition-all active:scale-95 p-1"
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Progreso</span>
            <span className={`font-black tabular-nums ${percent >= 100 ? "text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.6)]" : percent >= 75 ? "text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]" : "text-foreground"}`}>
              {percent}%
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                percent >= 100 ? "goal-bar-green shadow-[0_0_10px_hsl(142_70%_45%/0.7)]"
                : percent >= 70 ? "goal-bar-green"
                : percent >= 40 ? "goal-bar-yellow"
                : "goal-bar-red"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="border border-border/60 rounded-xl px-2 py-0.5 text-xs w-24 bg-background"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveProgress()}
                  autoFocus
                />
                <button onClick={saveProgress} className="text-primary text-xs font-medium">OK</button>
                <button onClick={() => setEditing(false)} className="text-muted-foreground text-xs">✕</button>
              </div>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="hover:text-primary transition-all active:scale-95 tabular-nums"
                title="Editar progreso"
              >
                {goal.current_value.toLocaleString()} / {goal.target_value.toLocaleString()}
              </button>
            )}
            {daysLeft !== null && (
              <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                daysLeft < 0
                  ? "bg-red-500/15 text-red-400"
                  : daysLeft === 0
                  ? "bg-orange-500/15 text-orange-400 animate-pulse"
                  : daysLeft === 1
                  ? "bg-orange-500/15 text-orange-400"
                  : daysLeft < 7
                  ? "bg-amber-500/15 text-amber-400"
                  : daysLeft < 30
                  ? "bg-yellow-500/10 text-yellow-500"
                  : "bg-secondary text-muted-foreground"
              }`}>
                {daysLeft < 0 ? `Vencida hace ${Math.abs(daysLeft)}d`
                  : daysLeft === 0 ? "Hoy"
                  : daysLeft === 1 ? "Mañana"
                  : `${daysLeft}d restantes`}
              </span>
            )}
          </div>
        </div>

        {goal.notes && (
          <p className="text-xs text-muted-foreground border-t border-border/50 pt-2.5">{goal.notes}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MetasPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [filter, setFilter] = useState<"activas" | "completadas" | "todas">(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("metas-filter") as "activas" | "completadas" | "todas") || "activas"
      : "activas"
  );
  const [categoryFilter, setCategoryFilter] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("metas-category") || "todos" : "todos"
  );
  const { error: toastError, success: toastSuccess } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

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

  // ── Persist filter state ─────────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem("metas-filter", filter); }, [filter]);
  useEffect(() => { localStorage.setItem("metas-category", categoryFilter); }, [categoryFilter]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.key === "n" || e.key === "N") && !showForm && !editingGoal) { e.preventDefault(); setShowForm(true); }
      if ((e.key === "e" || e.key === "E") && !showForm && !editingGoal) { e.preventDefault(); handleExportCSV(); }
      if (e.key === "Escape") {
        if (editingGoal) { setEditingGoal(null); return; }
        if (showForm) setShowForm(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm, editingGoal, goals, filter]);

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

  const handleUpdate = async (data: GoalFormData) => {
    if (!editingGoal) return;
    const { error } = await updateGoal(editingGoal.id, data);
    if (error) { toastError(error); return; }
    toastSuccess("Meta actualizada");
    setEditingGoal(null);
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
    const ok = await confirm({ title: "¿Eliminar esta meta?", message: "Esta acción no se puede deshacer.", confirmLabel: "Eliminar", variant: "danger" });
    if (!ok) return;
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

  const handleSyncNow = async (id: string) => {
    const { newValue, metric, error } = await syncGoalNow(id);
    if (error) { toastError(error); return; }
    if (newValue !== null) {
      setGoals((prev) => prev.map((g) => g.id === id ? { ...g, current_value: newValue } : g));
      const label = metric === "views" ? "vistas" : "suscriptores";
      toastSuccess(`Actualizado: ${newValue.toLocaleString("es-AR")} ${label}`);
    }
  };

  const handleExportCSV = () => {
    if (!goals.length) return;
    const rows = [
      ["Título", "Categoría", "Valor actual", "Valor objetivo", "Progreso (%)", "Estado", "Fecha límite", "Notas"],
      ...goals.map((g) => [
        g.title,
        CATEGORY_LABELS[g.category] ?? g.category,
        String(g.current_value),
        String(g.target_value),
        String(Math.min(100, Math.round((g.current_value / g.target_value) * 100))),
        g.is_completed ? "Completada" : "Activa",
        g.target_date ?? "",
        (g.notes ?? "").replace(/\n/g, " "),
      ]),
    ];
    const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `metas_${filter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toastSuccess("CSV exportado");
  };

  return (
    <PageTransition className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="card-premium relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent pointer-events-none" />
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-violet-400/6 rounded-full blur-2xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight gradient-text">Metas & Objetivos</h1>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Definí y seguí tus metas artísticas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {goals.length > 0 && (
                <button
                  onClick={handleExportCSV}
                  title="Exportar metas a CSV (E)"
                  className="flex items-center gap-1.5 px-3 py-2 border border-border/60 rounded-xl hover:bg-secondary/60 transition-all active:scale-95 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Exportar</span>
                </button>
              )}
              <button
                onClick={() => setShowForm(true)}
                title="Nueva meta (N)"
                className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-black hover:bg-primary/90 transition-all active:scale-95 shadow-[0_0_16px_hsl(var(--primary)/0.25)] btn-shine"
              >
                <Plus className="h-4 w-4" /> Nueva meta
                <kbd className="hidden md:inline-flex ml-1 text-[9px] bg-primary-foreground/20 px-1 py-0.5 rounded font-mono">N</kbd>
              </button>
            </div>
          </div>
        </div>

        {/* Near-deadline urgency banner */}
        {!loading && (() => {
          const urgent = goals.filter((g) => {
            if (g.is_completed || !g.target_date) return false;
            const days = Math.ceil((new Date(g.target_date + "T00:00:00").getTime() - Date.now()) / 86400000);
            return days >= 0 && days <= 7;
          });
          if (urgent.length === 0) return null;
          const next = urgent.sort((a, b) => {
            const da = Math.ceil((new Date(a.target_date! + "T00:00:00").getTime() - Date.now()) / 86400000);
            const db = Math.ceil((new Date(b.target_date! + "T00:00:00").getTime() - Date.now()) / 86400000);
            return da - db;
          })[0];
          const daysLeft = Math.ceil((new Date(next.target_date! + "T00:00:00").getTime() - Date.now()) / 86400000);
          return (
            <button
              onClick={() => setFilter("activas")}
              className="flex items-center justify-between px-4 py-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/15 hover:-translate-y-0.5 hover:shadow-sm transition-all w-full group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="h-4 w-4 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-black text-orange-400">
                    {urgent.length === 1
                      ? `"${next.title}" vence ${daysLeft === 0 ? "hoy" : `en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}`}`
                      : `${urgent.length} metas con fecha límite esta semana`}
                  </p>
                  <p className="text-xs text-orange-400/70 mt-0.5">
                    {urgent.length > 1 ? `La próxima: "${next.title}" — ${daysLeft === 0 ? "hoy" : `${daysLeft}d`}` : "¡Actualizá tu progreso!"}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-orange-400 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>
          );
        })()}

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card-premium rounded-2xl p-5 text-center hover:-translate-y-1 transition-all relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-[0_0_14px_hsl(var(--primary)/0.2)]">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div className="text-3xl font-black text-primary tabular-nums animate-count-in">
                {loading ? <span className="opacity-30 text-2xl">—</span> : activeCount}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1.5 font-black uppercase tracking-wider">Activas</div>
            </div>
          </div>
          <div className="card-premium rounded-2xl p-5 text-center hover:-translate-y-1 transition-all relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-green-500/10 to-transparent pointer-events-none" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-[0_0_14px_hsl(142_72%_55%/0.2)]">
                <Trophy className="h-5 w-5 text-green-400" />
              </div>
              <div className="text-3xl font-black text-green-400 tabular-nums animate-count-in">
                {loading ? <span className="opacity-30 text-2xl">—</span> : doneCount}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1.5 font-black uppercase tracking-wider">Completadas</div>
            </div>
          </div>
          <div className="card-premium rounded-2xl p-5 text-center hover:-translate-y-1 transition-all relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/8 to-transparent pointer-events-none" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-[0_0_14px_hsl(220_90%_60%/0.2)]">
                <TrendingUp className="h-5 w-5 text-blue-400" />
              </div>
              <div className="text-3xl font-black tabular-nums animate-count-in">
                {loading ? <span className="opacity-30 text-2xl">—</span> : `${avgProgress}%`}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1.5 font-black uppercase tracking-wider">Progreso prom.</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-1 bg-secondary/40 rounded-xl p-1">
            {([
              { id: "activas",     label: "Activas",     count: activeCount },
              { id: "completadas", label: "Completadas", count: doneCount },
              { id: "todas",       label: "Todas",       count: goals.length },
            ] as const).map(({ id: f, label, count }) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                  filter === f
                    ? "bg-card shadow-[0_2px_8px_hsl(0_0%_0%/0.2),0_0_12px_hsl(var(--primary)/0.12),inset_0_1px_0_hsl(0_0%_100%/0.08)] border border-primary/20 text-foreground font-black"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                {label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full tabular-nums ${
                  filter === f ? "bg-primary/18 text-primary border border-primary/25 shadow-[0_0_6px_hsl(var(--primary)/0.3)]" : "bg-secondary text-muted-foreground"
                }`}>{count}</span>
              </button>
            ))}
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-border/60 rounded-xl px-3 py-1.5 text-sm bg-card"
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
              className="text-primary text-sm hover:underline transition-all active:scale-95"
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
                  onEdit={setEditingGoal}
                  onSyncNow={handleSyncNow}
                />
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </div>

      {showForm && (
        <GoalForm onClose={() => setShowForm(false)} onSave={handleCreate} />
      )}

      {editingGoal && (
        <GoalForm
          isEditing
          onClose={() => setEditingGoal(null)}
          onSave={handleUpdate}
          initial={{
            title: editingGoal.title,
            category: editingGoal.category,
            target_value: editingGoal.target_value,
            current_value: editingGoal.current_value,
            target_date: editingGoal.target_date ?? null,
            notes: editingGoal.notes ?? null,
            platform_url: editingGoal.platform_url ?? null,
            auto_update: editingGoal.auto_update ?? false,
          } as GoalFormData}
        />
      )}

      {ConfirmDialog}
    </PageTransition>
  );
}
