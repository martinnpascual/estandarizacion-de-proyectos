"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from "@/lib/actions/expenses";
import type { Expense } from "@/types/database";
import type { ExpenseFormData } from "@/lib/actions/expenses";
import { useToast } from "@/components/ui/ToastProvider";
import {
  PageTransition,
  StaggerList,
  StaggerItem,
  AnimatedCounter,
} from "@/components/ui/MotionWrapper";
import { RoyaltyRowSkeleton, ChartSkeleton } from "@/components/ui/Skeletons";
import {
  Receipt,
  Plus,
  Trash2,
  Loader2,
  TrendingDown,
  TrendingUp,
  X,
  AlertCircle,
  DollarSign,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: Record<string, { label: string; color: string }> = {
  studio:       { label: "Estudio",      color: "#6366f1" },
  mixing:       { label: "Mezcla",       color: "#8b5cf6" },
  mastering:    { label: "Mastering",    color: "#a855f7" },
  distribucion: { label: "Distribución", color: "#06b6d4" },
  artwork:      { label: "Arte",         color: "#ec4899" },
  marketing:    { label: "Marketing",    color: "#f97316" },
  equipamiento: { label: "Equipamiento", color: "#eab308" },
  viajes:       { label: "Viajes",       color: "#22c55e" },
  legales:      { label: "Legal",        color: "#ef4444" },
  otro:         { label: "Otro",         color: "#6b7280" },
};

const CATEGORY_KEYS = Object.keys(CATEGORIES) as Array<keyof typeof CATEGORIES>;
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR + 3 - i);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString("es", {
    month: "short",
    year: "2-digit",
  });
}

function buildMonthlyData(expenses: Expense[], year: number) {
  const map: Record<string, number> = {};
  for (let m = 1; m <= 12; m++) {
    map[`${year}-${String(m).padStart(2, "0")}`] = 0;
  }
  for (const e of expenses) {
    if (e.period_month?.startsWith(String(year))) {
      map[e.period_month] = (map[e.period_month] ?? 0) + Number(e.amount);
    }
  }
  return Object.entries(map)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period_month, total]) => ({ period_month, total }));
}

function buildCategoryData(expenses: Expense[]) {
  const map: Record<string, number> = {};
  for (const e of expenses) {
    map[e.category] = (map[e.category] ?? 0) + Number(e.amount);
  }
  return Object.entries(map)
    .map(([category, total]) => ({
      category,
      total,
      label: CATEGORIES[category]?.label ?? category,
      color: CATEGORIES[category]?.color ?? "#6b7280",
    }))
    .sort((a, b) => b.total - a.total);
}

// ─── Pie inner label ──────────────────────────────────────────────────────────

interface PieLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}

function PieInnerLabel({
  cx = 0, cy = 0, midAngle = 0,
  innerRadius = 0, outerRadius = 0, percent = 0,
}: PieLabelProps) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle"
      dominantBaseline="central" fontSize={10} fontWeight={600}>
      {(percent * 100).toFixed(0)}%
    </text>
  );
}

// ─── Expense Form Modal ───────────────────────────────────────────────────────

interface ExpenseFormProps {
  title?: string;
  onClose: () => void;
  onSave: (data: ExpenseFormData) => Promise<void>;
  initial?: Partial<ExpenseFormData>;
}

function ExpenseFormModal({ title = "Nuevo gasto", onClose, onSave, initial }: ExpenseFormProps) {
  const today = new Date().toISOString().slice(0, 7);
  const [form, setForm] = useState<ExpenseFormData>({
    description:  initial?.description  ?? "",
    category:     initial?.category     ?? "studio",
    amount:       initial?.amount       ?? 0,
    currency:     initial?.currency     ?? "USD",
    period_month: initial?.period_month ?? today,
    song_id:      initial?.song_id      ?? null,
    project_id:   initial?.project_id   ?? null,
    notes:        initial?.notes        ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.description.trim()) errs.description = "La descripción es requerida";
    if (!form.amount || form.amount <= 0)  errs.amount = "El monto debe ser mayor a 0";
    if (!form.period_month) errs.period_month = "El mes es requerido";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const fieldCls = (key: string) =>
    `w-full border rounded-xl px-3 py-2.5 text-sm bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${
      errors[key] ? "border-red-500/60" : "border-border/60"
    }`;

  const activeCat = CATEGORIES[form.category] ?? { label: form.category, color: "#6b7280" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md">
        {/* Glow ring */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-red-500/20 via-transparent to-purple-500/10 pointer-events-none" />

        <form
          onSubmit={handleSubmit}
          className="relative bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl w-full p-6 space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center">
                <Receipt className="h-4 w-4 text-red-400" />
              </div>
              <h2 className="font-semibold text-base">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted/50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide">
              Descripción *
            </label>
            <input
              type="text"
              className={fieldCls("description")}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Ej: Sesión de grabación 4h"
              autoFocus
            />
            {errors.description && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {errors.description}
              </p>
            )}
          </div>

          {/* Categoría */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide">
              Categoría
            </label>
            <select
              className={fieldCls("category")}
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ExpenseFormData["category"] }))}
            >
              {CATEGORY_KEYS.map((k) => (
                <option key={k} value={k}>{CATEGORIES[k].label}</option>
              ))}
            </select>
          </div>

          {/* Monto + Mes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide">
                Monto (USD) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={`${fieldCls("amount")} pl-6`}
                  value={form.amount || ""}
                  onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
              {errors.amount && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.amount}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide">
                Mes *
              </label>
              <input
                type="month"
                className={fieldCls("period_month")}
                value={form.period_month}
                onChange={(e) => setForm((f) => ({ ...f, period_month: e.target.value }))}
              />
              {errors.period_month && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.period_month}
                </p>
              )}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide">
              Notas (opcional)
            </label>
            <textarea
              rows={2}
              className={fieldCls("notes")}
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
              placeholder="Proveedor, número de factura, detalles..."
            />
          </div>

          {/* Category preview pill */}
          <div
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm border"
            style={{
              backgroundColor: `${activeCat.color}14`,
              borderColor: `${activeCat.color}40`,
            }}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: activeCat.color }} />
            <span className="font-medium" style={{ color: activeCat.color }}>{activeCat.label}</span>
            {form.amount > 0 && (
              <span className="ml-auto text-muted-foreground font-mono text-xs">
                {formatCurrency(form.amount)}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border/60 rounded-xl px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
              ) : (
                "Guardar gasto"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GastosPage() {
  const [expenses, setExpenses]           = useState<Expense[]>([]);
  const [allExpenses, setAllExpenses]     = useState<Expense[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [showForm, setShowForm]           = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedYear, setSelectedYear]   = useState(CURRENT_YEAR);
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const { error: toastError, success: toastSuccess } = useToast();

  // ── Data loaders ─────────────────────────────────────────────────────────────
  const loadYear = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getExpenses(selectedYear);
      if (res.error) setError(res.error);
      else setExpenses(res.data ?? []);
    } catch {
      setError("Error al cargar gastos. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  const loadAll = useCallback(async () => {
    try {
      const res = await getExpenses();
      if (!res.error) setAllExpenses(res.data ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadYear(); }, [loadYear]);
  useEffect(() => { loadAll();  }, [loadAll]);

  // ── Stats (all-time data) ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now       = new Date();
    const thisYear  = now.getFullYear().toString();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return {
      total_all_time:  allExpenses.reduce((s, e) => s + Number(e.amount), 0),
      total_this_year: allExpenses.filter((e) => e.period_month?.startsWith(thisYear)).reduce((s, e) => s + Number(e.amount), 0),
      total_this_month: allExpenses.filter((e) => e.period_month === thisMonth).reduce((s, e) => s + Number(e.amount), 0),
    };
  }, [allExpenses]);

  // ── Chart data ───────────────────────────────────────────────────────────────
  const monthlyData  = useMemo(() => buildMonthlyData(expenses, selectedYear), [expenses, selectedYear]);
  const categoryData = useMemo(() => buildCategoryData(expenses), [expenses]);
  const totalYear    = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  const handleCreate = async (data: ExpenseFormData) => {
    const res = await createExpense(data);
    if (res.error) { toastError(res.error); throw new Error(res.error); }
    toastSuccess("Gasto registrado");
    loadYear();
    loadAll();
  };

  const handleUpdate = async (data: ExpenseFormData) => {
    if (!editingExpense) return;
    const res = await updateExpense(editingExpense.id, data);
    if (res.error) { toastError(res.error); throw new Error(res.error); }
    toastSuccess("Gasto actualizado");
    setEditingExpense(null);
    loadYear();
    loadAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este gasto? Esta acción no se puede deshacer.")) return;
    setDeletingId(id);
    try {
      const res = await deleteExpense(id);
      if (res.error) { toastError(res.error); return; }
      toastSuccess("Gasto eliminado");
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      setAllExpenses((prev) => prev.filter((e) => e.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <PageTransition className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500/25 to-orange-500/15 border border-red-500/20 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Gastos</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Control de gastos del estudio</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Year dropdown */}
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="appearance-none border border-border/60 rounded-xl px-3 py-2 pr-8 text-sm bg-card/80 backdrop-blur-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
              >
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-xs">▾</span>
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-red-500/90 hover:bg-red-500 text-white rounded-xl px-4 py-2 text-sm font-medium transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/30"
            >
              <Plus className="h-4 w-4" /> Nuevo gasto
            </button>
          </div>
        </div>

        {/* ── Stat Cards ──────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-xl p-5 animate-pulse space-y-3">
                <div className="h-3.5 w-28 bg-muted rounded-lg" />
                <div className="h-8 w-36 bg-muted rounded-lg" />
                <div className="h-3 w-20 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total acumulado */}
            <div className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-xl p-5 relative overflow-hidden group hover:border-red-500/30 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-red-500/10 transition-colors" />
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-3 uppercase tracking-wide">
                <DollarSign className="h-3.5 w-3.5" /> Total gastos
              </div>
              <div className="text-2xl font-bold text-red-400">
                <AnimatedCounter value={stats.total_all_time} prefix="$" decimals={2} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">Histórico acumulado</div>
            </div>

            {/* Este año */}
            <div className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-xl p-5 relative overflow-hidden group hover:border-orange-500/30 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-orange-500/10 transition-colors" />
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-3 uppercase tracking-wide">
                <TrendingDown className="h-3.5 w-3.5" /> Este año
              </div>
              <div className="text-2xl font-bold text-orange-400">
                <AnimatedCounter value={stats.total_this_year} prefix="$" decimals={2} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">{CURRENT_YEAR}</div>
            </div>

            {/* Este mes */}
            <div className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-xl p-5 relative overflow-hidden group hover:border-yellow-500/30 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-yellow-500/10 transition-colors" />
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-3 uppercase tracking-wide">
                <Receipt className="h-3.5 w-3.5" /> Este mes
              </div>
              <div className="text-2xl font-bold text-yellow-400">
                <AnimatedCounter value={stats.total_this_month} prefix="$" decimals={2} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date().toLocaleDateString("es", { month: "long" })}
              </div>
            </div>
          </div>
        )}

        {/* ── Error banner ────────────────────────────────────────────────────── */}
        {error && !loading && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            <button
              onClick={loadYear}
              className="ml-auto text-red-400 hover:text-red-300 underline underline-offset-2 text-xs"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* ── Main 2-col grid ──────────────────────────────────────────────────── */}
        {!error && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ─── LEFT (2/3) ───────────────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Area chart */}
              {loading ? (
                <ChartSkeleton height="h-72" />
              ) : (
                <div className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-xl p-5">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-400" />
                      Gastos mensuales — {selectedYear}
                    </h3>
                    <span className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1 font-mono">
                      {formatCurrency(totalYear)}
                    </span>
                  </div>

                  {monthlyData.some((d) => d.total > 0) ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}    />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis
                          dataKey="period_month"
                          tickFormatter={monthLabel}
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={false} tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                          axisLine={false} tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "12px",
                            fontSize: 12,
                          }}
                          formatter={(v: unknown) => [formatCurrency(Number(v)), "Gastos"]}
                          labelFormatter={(label: unknown) => monthLabel(String(label))}
                        />
                        <Area
                          type="monotone"
                          dataKey="total"
                          stroke="#ef4444"
                          strokeWidth={2}
                          fill="url(#expGrad)"
                          dot={{ fill: "#ef4444", r: 3, strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: "#ef4444" }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-52 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                      <TrendingDown className="h-8 w-8 opacity-20" />
                      Sin gastos registrados en {selectedYear}
                    </div>
                  )}
                </div>
              )}

              {/* Expense list */}
              <div className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {loading
                      ? "Cargando..."
                      : `${expenses.length} registro${expenses.length !== 1 ? "s" : ""} en ${selectedYear}`}
                  </span>
                  {!loading && expenses.length > 0 && (
                    <span className="text-xs text-muted-foreground font-mono">{formatCurrency(totalYear)}</span>
                  )}
                </div>

                {loading ? (
                  <div>{[1, 2, 3, 4, 5].map((i) => <RoyaltyRowSkeleton key={i} />)}</div>
                ) : expenses.length === 0 ? (
                  /* Empty state */
                  <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-red-500/10 rounded-full blur-2xl scale-150" />
                      <svg width="96" height="96" viewBox="0 0 96 96" fill="none" className="relative">
                        <circle cx="48" cy="48" r="44" fill="hsl(var(--secondary))" opacity="0.5" />
                        <rect x="28" y="20" width="40" height="52" rx="4" fill="#ef4444" opacity="0.12" />
                        <rect x="28" y="20" width="40" height="52" rx="4" stroke="#ef4444" strokeWidth="1.5" opacity="0.35" />
                        <line x1="36" y1="34" x2="60" y2="34" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
                        <line x1="36" y1="42" x2="60" y2="42" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
                        <line x1="36" y1="50" x2="50" y2="50" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" opacity="0.25" />
                        <circle cx="58" cy="62" r="10" fill="#ef4444" opacity="0.18" />
                        <text x="58" y="66" textAnchor="middle" dominantBaseline="middle" fill="#ef4444" fontSize="11" fontWeight="bold" opacity="0.65">$</text>
                      </svg>
                    </div>
                    <h3 className="text-base font-semibold mb-1">Sin gastos registrados</h3>
                    <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
                      Registrá los gastos de estudio, mezcla, marketing y todo lo relacionado a tu carrera musical.
                    </p>
                    <button
                      onClick={() => setShowForm(true)}
                      className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors"
                    >
                      <Plus className="h-4 w-4" /> Registrar primer gasto
                    </button>
                  </div>
                ) : (
                  <StaggerList>
                    {expenses.map((exp) => {
                      const cat = CATEGORIES[exp.category] ?? { label: exp.category, color: "#6b7280" };
                      return (
                        <StaggerItem key={exp.id}>
                          <div className="flex items-center gap-4 px-5 py-3.5 border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors group">
                            {/* Category badge icon */}
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
                              style={{
                                backgroundColor: `${cat.color}1a`,
                                border: `1.5px solid ${cat.color}50`,
                                color: cat.color,
                              }}
                            >
                              {cat.label.slice(0, 2).toUpperCase()}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{exp.description}</div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span
                                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                                  style={{ backgroundColor: `${cat.color}18`, color: cat.color }}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                                  {cat.label}
                                </span>
                                {exp.period_month && (
                                  <span className="text-xs text-muted-foreground">
                                    {monthLabel(exp.period_month)}
                                  </span>
                                )}
                                {exp.notes && (
                                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                                    · {exp.notes}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Amount */}
                            <div className="font-semibold text-red-400 text-sm shrink-0 font-mono">
                              {formatCurrency(Number(exp.amount))}
                            </div>

                            {/* Delete */}
                            <button
                              onClick={() => handleDelete(exp.id)}
                              disabled={deletingId === exp.id}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 disabled:opacity-50"
                              title="Eliminar gasto"
                            >
                              {deletingId === exp.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </StaggerItem>
                      );
                    })}
                  </StaggerList>
                )}
              </div>
            </div>

            {/* ─── RIGHT (1/3) ─────────────────────────────────────────────── */}
            <div className="space-y-5">

              {/* Pie chart */}
              {loading ? (
                <ChartSkeleton height="h-80" />
              ) : (
                <div className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-xl p-5">
                  <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    Gastos por categoría
                  </h3>

                  {categoryData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={categoryData}
                            dataKey="total"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            outerRadius={85}
                            innerRadius={40}
                            labelLine={false}
                            label={PieInnerLabel as any}
                          >
                            {categoryData.map((entry) => (
                              <Cell key={entry.category} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "10px",
                              fontSize: 12,
                            }}
                            formatter={(v: unknown) => [formatCurrency(Number(v)), ""]}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Legend */}
                      <div className="space-y-1.5 mt-3">
                        {categoryData.map((entry) => (
                          <div key={entry.category} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                              <span className="text-muted-foreground">{entry.label}</span>
                            </div>
                            <span className="font-mono font-medium">{formatCurrency(entry.total)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
                      <span className="text-3xl opacity-20">🗂</span>
                      <span>Sin datos para {selectedYear}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Net balance card */}
              <div className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-xl p-5 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  Balance neto — {selectedYear}
                </h3>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                      <span>Ingresos</span>
                    </div>
                    <span className="font-mono font-medium text-green-400">{formatCurrency(0)}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                      <span>Gastos</span>
                    </div>
                    <span className="font-mono font-medium text-red-400">{formatCurrency(totalYear)}</span>
                  </div>

                  <div className="h-px bg-border/60" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {0 - totalYear >= 0 ? "Ganancia" : "Pérdida"}
                    </span>
                    <span
                      className={`text-lg font-bold font-mono ${
                        0 - totalYear >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {formatCurrency(0 - totalYear)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground/60 border-t border-border/40 pt-3 leading-relaxed">
                  Los ingresos se vincularán automáticamente desde el módulo de royalties.
                </p>
              </div>

              {/* Top categories bar chart */}
              {!loading && categoryData.length > 0 && (
                <div className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-xl p-5">
                  <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    Top categorías
                  </h3>
                  <div className="space-y-3">
                    {categoryData.slice(0, 5).map((entry) => {
                      const pct = totalYear > 0 ? (entry.total / totalYear) * 100 : 0;
                      return (
                        <div key={entry.category}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground">{entry.label}</span>
                            <span className="font-mono font-medium">{pct.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, backgroundColor: entry.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────────── */}
      {showForm && (
        <ExpenseFormModal
          title="Nuevo gasto"
          onClose={() => setShowForm(false)}
          onSave={handleCreate}
        />
      )}

      {editingExpense && (
        <ExpenseFormModal
          title="Editar gasto"
          onClose={() => setEditingExpense(null)}
          onSave={handleUpdate}
          initial={{
            description:  editingExpense.description,
            category:     editingExpense.category,
            amount:       Number(editingExpense.amount),
            currency:     editingExpense.currency,
            period_month: editingExpense.period_month,
            song_id:      editingExpense.song_id,
            project_id:   editingExpense.project_id,
            notes:        editingExpense.notes,
          }}
        />
      )}
    </PageTransition>
  );
}
