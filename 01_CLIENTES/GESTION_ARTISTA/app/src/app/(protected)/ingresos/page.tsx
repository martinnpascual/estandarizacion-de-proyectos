"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getRoyaltyPayments,
  getRoyaltySummary,
  createRoyaltyPayment,
  updateRoyaltyPayment,
  deleteRoyaltyPayment,
} from "@/lib/actions/royalties";
import type { RoyaltyPayment } from "@/types/database";
import type { RoyaltyPaymentFormData } from "@/lib/schemas";
import { RoyaltyPaymentSchema } from "@/lib/schemas";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { PageTransition, StaggerList, StaggerItem, AnimatedCounter } from "@/components/ui/MotionWrapper";
import { RoyaltyRowSkeleton, ChartSkeleton } from "@/components/ui/Skeletons";
import {
  DollarSign,
  TrendingUp,
  Plus,
  Trash2,
  Music,
  X,
  ChevronDown,
  BarChart3,
  Loader2,
  Download,
  Pencil,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────
const SOURCE_LABELS: Record<string, string> = {
  spotify: "Spotify",
  youtube: "YouTube",
  apple_music: "Apple Music",
  tidal: "Tidal",
  amazon_music: "Amazon Music",
  soundcloud: "SoundCloud",
  directo: "Directo / Live",
  sync: "Sync / Licencia",
  otro: "Otro",
};

const SOURCE_COLORS: Record<string, string> = {
  spotify: "#1DB954",
  youtube: "#FF0000",
  apple_music: "#FC3C44",
  tidal: "#000000",
  amazon_music: "#FF9900",
  soundcloud: "#FF5500",
  directo: "#6366F1",
  sync: "#8B5CF6",
  otro: "#94A3B8",
};

const SOURCES = Object.keys(SOURCE_LABELS);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - i);

// ─── RoyaltyForm ──────────────────────────────────────────────────────────────
interface RoyaltyFormProps {
  onClose: () => void;
  onSave: (data: RoyaltyPaymentFormData) => Promise<void>;
  initial?: Partial<RoyaltyPaymentFormData>;
}

function RoyaltyForm({ onClose, onSave, initial, isEditing }: RoyaltyFormProps & { isEditing?: boolean }) {
  const [form, setForm] = useState<RoyaltyPaymentFormData>({
    source: initial?.source ?? "spotify",
    amount: initial?.amount ?? 0,
    currency: initial?.currency ?? "USD",
    period_month: initial?.period_month ?? new Date().toISOString().slice(0, 7),
    song_id: initial?.song_id ?? null,
    notes: initial?.notes ?? null,
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
    const parsed = RoyaltyPaymentSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const err of parsed.error.errors) {
        errs[err.path[0] as string] = err.message;
      }
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

  const field = (key: keyof RoyaltyPaymentFormData) =>
    `border border-border/60 rounded-xl px-3 py-2.5 text-sm bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors w-full ${errors[key] ? "border-red-400" : ""}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Glow ring */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-green-500/20 via-transparent to-emerald-500/10 pointer-events-none" />

        <form
          onSubmit={handleSubmit}
          className="relative glass-panel rounded-2xl w-full p-6 space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-green-500/15 border border-green-500/20 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-green-400" />
              </div>
              <h2 className="font-black text-base">{isEditing ? "Editar ingreso" : "Registrar ingreso"}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-all active:scale-95 p-1.5 rounded-xl hover:bg-muted/50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Source */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide">
              Plataforma / Fuente
            </label>
            <select
              className={field("source")}
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as any }))}
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide">
                Monto *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={`${field("amount")} pl-6`}
                  value={form.amount || ""}
                  onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide">
                Moneda
              </label>
              <select
                className={field("currency")}
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="ARS">ARS</option>
                <option value="MXN">MXN</option>
                <option value="CLP">CLP</option>
                <option value="COP">COP</option>
              </select>
            </div>
          </div>

          {/* Period */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide">
              Período (mes) *
            </label>
            <input
              type="month"
              className={`${field("period_month")} [color-scheme:dark]`}
              value={form.period_month}
              onChange={(e) => setForm((f) => ({ ...f, period_month: e.target.value }))}
            />
            {errors.period_month && <p className="text-red-400 text-xs mt-1">{errors.period_month}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide">
              Notas (opcional)
            </label>
            <textarea
              rows={2}
              className={field("notes")}
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
              placeholder="Descripción, canción, álbum..."
            />
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
              className="flex-1 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-black hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEditing ? "Actualizar ingreso" : "Guardar ingreso"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function IngresosPage() {
  const [payments, setPayments] = useState<RoyaltyPayment[]>([]);
  const [summary, setSummary] = useState<{
    total_all_time: number;
    total_this_year: number;
    total_last_month: number;
    by_source: { source: string; total: number }[];
    by_month: { period_month: string; total: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<RoyaltyPayment | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(() =>
    typeof window !== "undefined"
      ? parseInt(localStorage.getItem("ingresos-year") ?? String(CURRENT_YEAR), 10) || CURRENT_YEAR
      : CURRENT_YEAR
  );
  const [selectedSource, setSelectedSource] = useState<string>(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("ingresos-source") || "todos"
      : "todos"
  );
  const { error: toastError, success: toastSuccess } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [paymentsRes, summaryRes] = await Promise.all([
        getRoyaltyPayments({
          year: selectedYear,
          source: selectedSource !== "todos" ? selectedSource : undefined,
        }),
        getRoyaltySummary(),
      ]);
      setPayments(paymentsRes.data);
      setSummary(summaryRes.data);
    } catch {
      toastError("Error al cargar ingresos");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedSource]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { localStorage.setItem("ingresos-year", String(selectedYear)); }, [selectedYear]);
  useEffect(() => { localStorage.setItem("ingresos-source", selectedSource); }, [selectedSource]);

  // ── CSV export ───────────────────────────────────────────────────────────────
  function handleExportCSV() {
    if (payments.length === 0) return;
    const headers = ["Plataforma", "Monto", "Moneda", "Período", "Notas"];
    const rows = payments.map((p) => [
      SOURCE_LABELS[p.source] ?? p.source,
      Number(p.amount).toFixed(2),
      p.currency,
      p.period_month ?? "",
      p.notes ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ingresos_${selectedYear}${selectedSource !== "todos" ? `_${selectedSource}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Keyboard shortcuts: N → new income, E → export CSV, Escape → close ──────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        if (editingPayment) { setEditingPayment(null); return; }
        if (showForm) { setShowForm(false); return; }
      }
      if (e.key === "n" || e.key === "N") { e.preventDefault(); setShowForm(true); }
      if (e.key === "e" || e.key === "E") { e.preventDefault(); handleExportCSV(); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments, selectedYear, selectedSource, showForm, editingPayment]);

  const handleCreate = async (data: RoyaltyPaymentFormData) => {
    const { error } = await createRoyaltyPayment(data);
    if (error) { toastError(error); return; }
    toastSuccess("Ingreso registrado");
    load();
  };

  const handleUpdate = async (data: RoyaltyPaymentFormData) => {
    if (!editingPayment) return;
    const { error } = await updateRoyaltyPayment(editingPayment.id, data);
    if (error) { toastError(error); return; }
    toastSuccess("Ingreso actualizado");
    setEditingPayment(null);
    load();
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: "¿Eliminar este ingreso?", message: "Esta acción no se puede deshacer.", confirmLabel: "Eliminar", variant: "danger" });
    if (!ok) return;
    const { error } = await deleteRoyaltyPayment(id);
    if (error) { toastError(error); return; }
    toastSuccess("Ingreso eliminado");
    setPayments((prev) => prev.filter((p) => p.id !== id));
  };

  const formatCurrency = (n: number, currency = "USD") =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);

  const monthLabel = (ym: string) => {
    const [y, m] = ym.split("-");
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString("es", { month: "short", year: "2-digit" });
  };

  return (
    <PageTransition className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="card-premium relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/8 via-transparent to-transparent pointer-events-none" />
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-500/8 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-emerald-400/6 rounded-full blur-2xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/30 to-emerald-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight gradient-text">Ingresos & Royalties</h1>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Registrá y analizá tus ganancias por plataforma
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {payments.length > 0 && (
                <button
                  onClick={handleExportCSV}
                  title="Exportar ingresos a CSV (E)"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all active:scale-95"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Exportar</span>
                </button>
              )}
              <button
                onClick={() => setShowForm(true)}
                title="Nuevo ingreso (N)"
                className="flex items-center gap-2 bg-green-500/90 hover:bg-green-500 text-white rounded-xl px-4 py-2 text-sm font-black transition-all active:scale-95 shadow-lg shadow-green-500/20 hover:shadow-green-500/30 btn-shine"
              >
                <Plus className="h-4 w-4" /> Nuevo ingreso
                <kbd className="hidden md:inline-flex ml-1 text-[9px] bg-white/20 px-1 py-0.5 rounded font-mono">N</kbd>
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-premium rounded-2xl p-5 skeleton-shimmer space-y-3">
                <div className="h-4 w-28 bg-muted rounded" />
                <div className="h-8 w-24 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card-premium rounded-2xl p-5 relative overflow-hidden group hover:border-green-500/40 hover:-translate-y-1 hover:shadow-[0_12px_32px_hsl(0_0%_0%/0.3),0_0_20px_rgba(74,222,128,0.08)] transition-all">
              <div className="absolute top-0 right-0 w-28 h-28 bg-green-500/8 rounded-full -translate-y-10 translate-x-10 group-hover:bg-green-500/14 transition-colors blur-sm" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-green-500/5 rounded-full translate-y-6 -translate-x-6 blur-md" />
              <div className="flex items-center gap-2 text-muted-foreground/70 text-xs font-black uppercase tracking-wider mb-2 relative">
                <DollarSign className="h-3.5 w-3.5 text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.9)] group-hover:scale-110 transition-transform" /> Total acumulado
              </div>
              <div className="text-3xl font-black text-green-400 tabular-nums tracking-tight drop-shadow-[0_0_18px_rgba(74,222,128,0.45)] relative">
                <AnimatedCounter value={summary.total_all_time} prefix="$" decimals={2} />
              </div>
              <p className="text-xs text-muted-foreground/60 mt-1.5">Todos los tiempos</p>
            </div>
            <div className="card-premium rounded-2xl p-5 relative overflow-hidden group hover:border-green-500/40 hover:-translate-y-1 hover:shadow-[0_12px_32px_hsl(0_0%_0%/0.3),0_0_20px_rgba(74,222,128,0.08)] transition-all">
              <div className="absolute top-0 right-0 w-28 h-28 bg-green-500/8 rounded-full -translate-y-10 translate-x-10 group-hover:bg-green-500/14 transition-colors blur-sm" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-green-500/5 rounded-full translate-y-6 -translate-x-6 blur-md" />
              <div className="flex items-center gap-2 text-muted-foreground/70 text-xs font-black uppercase tracking-wider mb-2 relative">
                <TrendingUp className="h-3.5 w-3.5 text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.9)] group-hover:scale-110 transition-transform" /> Este año
              </div>
              <div className="text-2xl font-black text-green-400 tabular-nums drop-shadow-[0_0_14px_rgba(74,222,128,0.45)] relative">
                <AnimatedCounter value={summary.total_this_year} prefix="$" decimals={2} />
              </div>
              <p className="text-xs text-muted-foreground/60 mt-1.5">{new Date().getFullYear()}</p>
            </div>
            <div className="card-premium rounded-2xl p-5 relative overflow-hidden group hover:border-green-500/40 hover:-translate-y-1 hover:shadow-[0_12px_32px_hsl(0_0%_0%/0.3),0_0_20px_rgba(74,222,128,0.08)] transition-all">
              <div className="absolute top-0 right-0 w-28 h-28 bg-green-500/8 rounded-full -translate-y-10 translate-x-10 group-hover:bg-green-500/14 transition-colors blur-sm" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-green-500/5 rounded-full translate-y-6 -translate-x-6 blur-md" />
              <div className="flex items-center gap-2 text-muted-foreground/70 text-xs font-black uppercase tracking-wider mb-2 relative">
                <BarChart3 className="h-3.5 w-3.5 text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.9)] group-hover:scale-110 transition-transform" /> Mes anterior
              </div>
              <div className="text-2xl font-black text-green-400 tabular-nums drop-shadow-[0_0_14px_rgba(74,222,128,0.40)] relative">
                <AnimatedCounter value={summary.total_last_month} prefix="$" decimals={2} />
              </div>
              <p className="text-xs text-muted-foreground/60 mt-1.5">Último mes completo</p>
            </div>
          </div>
        ) : null}

        {/* Charts */}
        {!loading && summary && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Area Chart - Monthly */}
            <div className="card-premium rounded-2xl p-5">
              <h3 className="font-black tracking-tight mb-4 flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.8)]" />
                Ingresos por mes
              </h3>
              {summary.by_month.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={summary.by_month}>
                    <defs>
                      <linearGradient id="royaltyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity={0.55} />
                        <stop offset="50%" stopColor="#6366F1" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />
                    <XAxis
                      dataKey="period_month"
                      tickFormatter={monthLabel}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "16px",
                        fontSize: 12,
                      }}
                      formatter={(v: unknown) => [`$${Number(v).toFixed(2)}`, "Ingresos"]}
                      labelFormatter={(label: unknown) => monthLabel(String(label))}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#6366F1"
                      strokeWidth={2.5}
                      fill="url(#royaltyGrad)"
                      dot={false}
                      activeDot={{ r: 5, fill: "#6366F1", stroke: "#6366F1", strokeWidth: 2, filter: "drop-shadow(0 0 6px #6366F1)" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
                  Sin datos todavía
                </div>
              )}
            </div>

            {/* Pie Chart - By Source */}
            <div className="card-premium rounded-2xl p-5">
              <h3 className="font-black tracking-tight mb-4 flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4 text-primary drop-shadow-[0_0_5px_hsl(var(--primary)/0.8)]" />
                Distribución por plataforma
              </h3>
              {summary.by_source.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={summary.by_source}
                      dataKey="total"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ source, percent }: { source?: string; percent?: number }) =>
                        `${SOURCE_LABELS[source ?? ""] ?? source ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {summary.by_source.map((entry, i) => (
                        <Cell
                          key={entry.source}
                          fill={SOURCE_COLORS[entry.source] ?? `hsl(${i * 45}, 60%, 55%)`}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "16px",
                        fontSize: 12,
                      }}
                      formatter={(v: unknown) => `$${Number(v).toFixed(2)}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
                  Sin datos todavía
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-1 bg-secondary/40 rounded-xl p-1">
            {YEARS.map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                  selectedYear === y
                    ? "bg-card shadow-[0_2px_8px_hsl(0_0%_0%/0.2),0_0_12px_hsl(var(--primary)/0.15)] border border-primary/20 text-foreground font-black"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="border border-border/60 rounded-xl px-3 py-1.5 text-sm bg-card"
          >
            <option value="todos">Todas las plataformas</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* Payments List */}
        <div className="card-premium rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
            <span className="font-black text-sm">{payments.length} registro{payments.length !== 1 ? "s" : ""}</span>
          </div>

          {loading ? (
            <div>{[1, 2, 3, 4, 5].map((i) => <RoyaltyRowSkeleton key={i} />)}</div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              {/* SVG illustration */}
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-green-500/10 rounded-full blur-2xl scale-150" />
                <svg width="96" height="96" viewBox="0 0 96 96" fill="none" className="relative">
                  <circle cx="48" cy="48" r="44" fill="hsl(var(--secondary))" opacity="0.6" />
                  {/* Coin stack */}
                  <ellipse cx="48" cy="62" rx="18" ry="6" fill="#4ade80" opacity="0.3" />
                  <ellipse cx="48" cy="56" rx="18" ry="6" fill="#4ade80" opacity="0.4" />
                  <ellipse cx="48" cy="50" rx="18" ry="6" fill="#4ade80" opacity="0.55" />
                  <rect x="30" y="44" width="36" height="12" fill="#4ade80" opacity="0.3" />
                  <ellipse cx="48" cy="44" rx="18" ry="6" fill="#4ade80" opacity="0.7" />
                  {/* Dollar sign */}
                  <text x="48" y="48" textAnchor="middle" dominantBaseline="middle" fill="#4ade80" fontSize="12" fontWeight="bold" opacity="0.9">$</text>
                  {/* Music note flying up */}
                  <path d="M65 28l-5 1.5v5l5-1.5V28z" fill="#4ade80" opacity="0.4" />
                  <circle cx="60" cy="33.5" r="2" fill="#4ade80" opacity="0.4" />
                  {/* Arrow up */}
                  <path d="M72 38l-4-5-4 5M68 33v8" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                </svg>
              </div>
              <h3 className="text-base font-black mb-1">Sin ingresos registrados</h3>
              <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
                Llevá el control de tus regalías, pagos por shows, licencias y cualquier ingreso de tu carrera musical.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-all active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Registrar primer ingreso
              </button>
            </div>
          ) : (
            <StaggerList>
              {payments.map((p) => (
                <StaggerItem key={p.id}>
                  <div
                    className="row-interactive flex items-center gap-4 px-4 py-3 border-b last:border-0 hover:bg-muted/30 transition-all group cursor-pointer"
                    onDoubleClick={() => setEditingPayment(p)}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xs font-black group-hover:scale-110 transition-transform"
                      style={{
                        backgroundColor: `${SOURCE_COLORS[p.source] ?? "#6366F1"}20`,
                        border: `1.5px solid ${SOURCE_COLORS[p.source] ?? "#6366F1"}50`,
                        color: SOURCE_COLORS[p.source] ?? "#6366F1",
                        boxShadow: `0 0 14px ${SOURCE_COLORS[p.source] ?? "#6366F1"}40, inset 0 1px 0 ${SOURCE_COLORS[p.source] ?? "#6366F1"}25`,
                      }}
                    >
                      {(SOURCE_LABELS[p.source] ?? p.source).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-sm truncate">{SOURCE_LABELS[p.source] ?? p.source}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {p.period_month} {p.notes ? `· ${p.notes}` : ""}
                      </div>
                    </div>
                    <div className="font-black text-green-400 font-mono tabular-nums text-sm shrink-0">
                      {formatCurrency(Number(p.amount), p.currency)}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingPayment(p); }}
                      className="opacity-0 group-hover:opacity-100 transition-all active:scale-95 text-muted-foreground hover:text-foreground p-1.5 rounded-xl hover:bg-muted/50"
                      title="Editar ingreso"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-all active:scale-95 text-muted-foreground hover:text-red-400 p-1.5 rounded-xl hover:bg-red-500/10 disabled:cursor-not-allowed"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </div>
      </div>

      {showForm && (
        <RoyaltyForm onClose={() => setShowForm(false)} onSave={handleCreate} />
      )}

      {editingPayment && (
        <RoyaltyForm
          isEditing
          onClose={() => setEditingPayment(null)}
          onSave={handleUpdate}
          initial={{
            source: editingPayment.source as any,
            amount: Number(editingPayment.amount),
            currency: editingPayment.currency,
            period_month: editingPayment.period_month ?? new Date().toISOString().slice(0, 7),
            song_id: editingPayment.song_id ?? null,
            notes: editingPayment.notes ?? null,
          }}
        />
      )}

      {ConfirmDialog}
    </PageTransition>
  );
}
