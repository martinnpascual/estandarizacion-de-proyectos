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

function RoyaltyForm({ onClose, onSave, initial }: RoyaltyFormProps) {
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
    `border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 w-full ${errors[key] ? "border-red-400" : "border-border"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-card border rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Registrar ingreso</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Source */}
        <div>
          <label className="text-sm font-medium block mb-1">Plataforma / Fuente</label>
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
            <label className="text-sm font-medium block mb-1">Monto</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className={field("amount")}
              value={form.amount || ""}
              onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00"
            />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Moneda</label>
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
          <label className="text-sm font-medium block mb-1">Período (mes)</label>
          <input
            type="month"
            className={field("period_month")}
            value={form.period_month}
            onChange={(e) => setForm((f) => ({ ...f, period_month: e.target.value }))}
          />
          {errors.period_month && <p className="text-red-500 text-xs mt-1">{errors.period_month}</p>}
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm font-medium block mb-1">Notas (opcional)</label>
          <textarea
            rows={2}
            className={field("notes")}
            value={form.notes ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
            placeholder="Descripción, canción, álbum..."
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
            className="flex-1 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
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
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedSource, setSelectedSource] = useState<string>("todos");
  const { error: toastError, success: toastSuccess } = useToast();

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

  const handleCreate = async (data: RoyaltyPaymentFormData) => {
    const { error } = await createRoyaltyPayment(data);
    if (error) { toastError(error); return; }
    toastSuccess("Ingreso registrado");
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este ingreso?")) return;
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
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ingresos & Royalties</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Registrá y analizá tus ganancias por plataforma
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nuevo ingreso
          </button>
        </div>

        {/* Summary Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border bg-card p-5 animate-pulse space-y-3">
                <div className="h-4 w-28 bg-muted rounded" />
                <div className="h-8 w-24 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <DollarSign className="h-4 w-4" /> Total acumulado
              </div>
              <div className="text-2xl font-bold">
                <AnimatedCounter value={summary.total_all_time} prefix="$" decimals={2} />
              </div>
            </div>
            <div className="rounded-lg border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <TrendingUp className="h-4 w-4" /> Este año
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                <AnimatedCounter value={summary.total_this_year} prefix="$" decimals={2} />
              </div>
            </div>
            <div className="rounded-lg border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <BarChart3 className="h-4 w-4" /> Mes anterior
              </div>
              <div className="text-2xl font-bold">
                <AnimatedCounter value={summary.total_last_month} prefix="$" decimals={2} />
              </div>
            </div>
          </div>
        ) : null}

        {/* Charts */}
        {!loading && summary && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Area Chart - Monthly */}
            <div className="rounded-lg border bg-card p-5">
              <h3 className="font-semibold mb-4">Ingresos por mes</h3>
              {summary.by_month.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={summary.by_month}>
                    <defs>
                      <linearGradient id="royaltyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="period_month" tickFormatter={monthLabel} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      formatter={(v: unknown) => [`$${Number(v).toFixed(2)}`, "Ingresos"]}
                      labelFormatter={(label: unknown) => monthLabel(String(label))}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#6366F1"
                      strokeWidth={2}
                      fill="url(#royaltyGrad)"
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
            <div className="rounded-lg border bg-card p-5">
              <h3 className="font-semibold mb-4">Distribución por plataforma</h3>
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
                    <Tooltip formatter={(v: unknown) => `$${Number(v).toFixed(2)}`} />
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
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {YEARS.map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  selectedYear === y
                    ? "bg-background shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm bg-background"
          >
            <option value="todos">Todas las plataformas</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* Payments List */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
            <span className="font-medium text-sm">{payments.length} registro{payments.length !== 1 ? "s" : ""}</span>
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
              <h3 className="text-base font-semibold mb-1">Sin ingresos registrados</h3>
              <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
                Llevá el control de tus regalías, pagos por shows, licencias y cualquier ingreso de tu carrera musical.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Registrar primer ingreso
              </button>
            </div>
          ) : (
            <StaggerList>
              {payments.map((p) => (
                <StaggerItem key={p.id}>
                  <div className="flex items-center gap-4 px-4 py-3 border-b last:border-0 hover:bg-muted/30 transition-colors group">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold"
                      style={{ backgroundColor: SOURCE_COLORS[p.source] ?? "#6366F1" }}
                    >
                      {(SOURCE_LABELS[p.source] ?? p.source).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{SOURCE_LABELS[p.source] ?? p.source}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.period_month} {p.notes ? `· ${p.notes}` : ""}
                      </div>
                    </div>
                    <div className="font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(Number(p.amount), p.currency)}
                    </div>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 p-1"
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
    </PageTransition>
  );
}
