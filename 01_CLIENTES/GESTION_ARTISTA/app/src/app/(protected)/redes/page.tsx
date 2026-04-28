"use client";

import { useState, useEffect, useRef } from "react";
import {
  Share2,
  ExternalLink,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  TrendingUp,
  TrendingDown,
  Users,
  Play,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Check,
  AlertCircle,
  Download,
  ClipboardList,
  Save,
  ArrowUpDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  getSocialLinks,
  getSocialStatHistory,
  upsertSocialLink,
  deleteSocialLink,
  addSocialStat,
  type SocialLinkWithLatestStat,
} from "@/lib/actions/social";
import { SocialLinkSchema, type SocialLinkFormData } from "@/lib/schemas";
import type { SocialPlatform, SocialStat } from "@/types/database";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";

const PLATFORM_META: Record<
  SocialPlatform,
  { label: string; color: string; chartColor: string; placeholder: string }
> = {
  spotify: { label: "Spotify", color: "bg-green-500", chartColor: "#22c55e", placeholder: "https://open.spotify.com/artist/..." },
  youtube: { label: "YouTube", color: "bg-red-500", chartColor: "#ef4444", placeholder: "https://youtube.com/@..." },
  instagram: { label: "Instagram", color: "bg-pink-500", chartColor: "#ec4899", placeholder: "https://instagram.com/..." },
  tiktok: { label: "TikTok", color: "bg-slate-400", chartColor: "#94a3b8", placeholder: "https://tiktok.com/@..." },
  soundcloud: { label: "SoundCloud", color: "bg-orange-500", chartColor: "#f97316", placeholder: "https://soundcloud.com/..." },
  twitter: { label: "Twitter/X", color: "bg-sky-500", chartColor: "#0ea5e9", placeholder: "https://x.com/..." },
};

const ALL_PLATFORMS = Object.keys(PLATFORM_META) as SocialPlatform[];

type LinkFormErrors = Partial<Record<keyof SocialLinkFormData | "root", string>>;
type StatFormErrors = { followers?: string; monthly_plays?: string; root?: string };

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days}d`;
  if (days < 30) return `Hace ${Math.round(days / 7)} sem`;
  return `Hace ${Math.round(days / 30)} mes`;
}

function isStale(recordedAt: string | null | undefined): boolean {
  if (!recordedAt) return true;
  const days = (Date.now() - new Date(recordedAt).getTime()) / 86_400_000;
  return days > 30;
}

function TrendBadge({ current, previous }: { current: number | null | undefined; previous: number | null | undefined }) {
  if (current == null || previous == null || previous === 0) return null;
  const diff = current - previous;
  if (diff === 0) return null;
  const pct = Math.abs(Math.round((diff / previous) * 100));
  const isUp = diff > 0;
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-medium ${isUp ? "text-green-400" : "text-red-400"}`}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {pct}%
    </span>
  );
}

function StatChart({
  linkId,
  chartColor,
}: {
  linkId: string;
  chartColor: string;
}) {
  const [history, setHistory] = useState<SocialStat[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSocialStatHistory(linkId).then(({ data }) => {
      setHistory(data);
      setLoading(false);
    });
  }, [linkId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-24">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!history || history.length < 2) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        Necesitás al menos 2 registros para ver el gráfico
      </p>
    );
  }

  const data = history.map((s) => ({
    date: formatDate(s.recorded_at),
    seguidores: s.followers,
    reproducciones: s.monthly_plays,
  }));

  return (
    <div className="space-y-4 mt-3">
      {history.some((s) => s.followers != null) && (
        <div>
          <p className="text-[11px] text-muted-foreground font-medium mb-1">Seguidores</p>
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={data} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                formatter={(v) => [formatNumber(v as number | null | undefined), "Seguidores"]}
              />
              <Line type="monotone" dataKey="seguidores" stroke={chartColor} strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {history.some((s) => s.monthly_plays != null) && (
        <div>
          <p className="text-[11px] text-muted-foreground font-medium mb-1">Reproducciones mensuales</p>
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={data} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                formatter={(v) => [formatNumber(v as number | null | undefined), "Reproducciones"]}
              />
              <Line type="monotone" dataKey="reproducciones" stroke={chartColor} strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Combined multi-platform chart ──────────────────────────────────────────────

type CombinedMetric = "followers" | "monthly_plays";

function CombinedOverviewChart({ links }: { links: SocialLinkWithLatestStat[] }) {
  const [histories, setHistories] = useState<Record<string, SocialStat[]>>({});
  const [loadingCombined, setLoadingCombined] = useState(true);
  const [metric, setMetric] = useState<CombinedMetric>("followers");

  useEffect(() => {
    if (links.length === 0) { setLoadingCombined(false); return; }
    Promise.all(
      links.map(async (link) => {
        const { data } = await getSocialStatHistory(link.id);
        return { id: link.id, data: data ?? [] };
      })
    ).then((results) => {
      const map: Record<string, SocialStat[]> = {};
      results.forEach(({ id, data }) => { map[id] = data; });
      setHistories(map);
      setLoadingCombined(false);
    });
  }, [links]);

  // Collect all unique dates across all platform histories
  const allDates = Array.from(new Set(
    Object.values(histories).flatMap((stats) =>
      stats.map((s) => s.recorded_at.split("T")[0])
    )
  )).sort();

  // Only include platforms that have at least one value for this metric
  const activePlatforms = links.filter((link) =>
    (histories[link.id] ?? []).some((s) =>
      metric === "followers" ? s.followers != null : s.monthly_plays != null
    )
  );

  const chartData = allDates.map((date) => {
    const point: Record<string, string | number | null> = {
      date: formatDate(date + "T00:00:00"),
    };
    links.forEach((link) => {
      const stat = (histories[link.id] ?? []).find(
        (s) => s.recorded_at.split("T")[0] === date
      );
      if (stat) {
        point[link.platform] =
          metric === "followers" ? stat.followers : stat.monthly_plays;
      }
    });
    return point;
  });

  if (loadingCombined) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 flex items-center justify-center h-36">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (allDates.length < 2 || activePlatforms.length < 2) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Vista combinada</span>
          <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            {activePlatforms.length} plataformas
          </span>
        </div>
        {/* Metric toggle */}
        <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5">
          <button
            onClick={() => setMetric("followers")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              metric === "followers"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3 w-3" />
            Seguidores
          </button>
          <button
            onClick={() => setMetric("monthly_plays")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              metric === "monthly_plays"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Play className="h-3 w-3" />
            Reproducciones
          </button>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 11,
            }}
            formatter={(v: unknown) => [formatNumber(v as number | null | undefined), ""]}
          />
          {activePlatforms.map((link) => (
            <Line
              key={link.platform}
              type="monotone"
              dataKey={link.platform}
              name={PLATFORM_META[link.platform].label}
              stroke={PLATFORM_META[link.platform].chartColor}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Platform legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
        {activePlatforms.map((link) => (
          <span key={link.platform} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              className="w-2.5 h-1.5 rounded-full"
              style={{ background: PLATFORM_META[link.platform].chartColor }}
            />
            {PLATFORM_META[link.platform].label}
            {link.username && (
              <span className="opacity-60">@{link.username}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RedesPage() {
  const toast = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [links, setLinks] = useState<SocialLinkWithLatestStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showLinkForm, setShowLinkForm] = useState(false);
  const [editingLink, setEditingLink] = useState<SocialLinkWithLatestStat | null>(null);
  const [linkForm, setLinkForm] = useState<SocialLinkFormData>({ platform: "spotify", url: "", username: null });
  const [linkErrors, setLinkErrors] = useState<LinkFormErrors>({});
  const [submittingLink, setSubmittingLink] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showStatForm, setShowStatForm] = useState<string | null>(null);
  const [statForm, setStatForm] = useState({ followers: "", monthly_plays: "" });
  const [statErrors, setStatErrors] = useState<StatFormErrors>({});
  const [submittingStat, setSubmittingStat] = useState(false);

  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [platformSort, setPlatformSort] = useState<"default" | "followers" | "az">("default");
  const urlRef = useRef<HTMLInputElement>(null);

  // Batch stats form
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [batchStats, setBatchStats] = useState<Record<string, { followers: string; monthly_plays: string }>>({});
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchErrors, setBatchErrors] = useState<Record<string, string>>({});

  // Auto-focus URL input; Escape closes link form or stat form; N = nueva red
  useEffect(() => {
    if (showLinkForm) {
      setTimeout(() => urlRef.current?.focus(), 50);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (showBatchForm) { setShowBatchForm(false); return; }
        if (showLinkForm) { setShowLinkForm(false); return; }
        if (showStatForm) { setShowStatForm(null); return; }
        if (expandedChart) { setExpandedChart(null); return; }
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if ((e.key === "n" || e.key === "N") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        openAddLink();
      }
      if ((e.key === "e" || e.key === "E") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleExportCSV();
      }
      if ((e.key === "b" || e.key === "B") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (links.length > 0) openBatchForm();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLinkForm, showStatForm, expandedChart, showBatchForm]);

  function handleCopyUrl(id: string, url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await getSocialLinks();
      if (error) setError(error);
      else setLinks(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar redes sociales");
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }

  function openAddLink() {
    setEditingLink(null);
    const usedPlatforms = links.map((l) => l.platform);
    const first = ALL_PLATFORMS.find((p) => !usedPlatforms.includes(p)) ?? "spotify";
    setLinkForm({ platform: first, url: "", username: null });
    setLinkErrors({});
    setShowLinkForm(true);
  }

  function openEditLink(link: SocialLinkWithLatestStat) {
    setEditingLink(link);
    setLinkForm({ platform: link.platform, url: link.url, username: link.username });
    setLinkErrors({});
    setShowLinkForm(true);
  }

  function openBatchForm() {
    const initial: Record<string, { followers: string; monthly_plays: string }> = {};
    links.forEach((link) => {
      initial[link.id] = {
        followers: link.latest_stat?.followers != null ? String(link.latest_stat.followers) : "",
        monthly_plays: link.latest_stat?.monthly_plays != null ? String(link.latest_stat.monthly_plays) : "",
      };
    });
    setBatchStats(initial);
    setBatchErrors({});
    setShowBatchForm(true);
  }

  async function handleSubmitBatch(e: React.FormEvent) {
    e.preventDefault();
    setBatchErrors({});
    const errors: Record<string, string> = {};

    // Validate numeric fields
    for (const [linkId, vals] of Object.entries(batchStats)) {
      if (vals.followers && isNaN(parseInt(vals.followers))) errors[`${linkId}_followers`] = "Inválido";
      if (vals.monthly_plays && isNaN(parseInt(vals.monthly_plays))) errors[`${linkId}_plays`] = "Inválido";
    }
    if (Object.keys(errors).length > 0) { setBatchErrors(errors); return; }

    setBatchSubmitting(true);
    let saved = 0;
    for (const [linkId, vals] of Object.entries(batchStats)) {
      const followers = vals.followers ? parseInt(vals.followers) : null;
      const monthly_plays = vals.monthly_plays ? parseInt(vals.monthly_plays) : null;
      if (followers === null && monthly_plays === null) continue; // skip blank rows
      const result = await addSocialStat({ social_link_id: linkId, followers, monthly_plays });
      if (!result.error && result.data) {
        setLinks((prev) =>
          prev.map((l) => l.id === linkId ? { ...l, latest_stat: result.data } : l)
        );
        saved++;
      }
    }
    setBatchSubmitting(false);
    setShowBatchForm(false);
    if (saved > 0) toast.success(`Estadísticas actualizadas para ${saved} plataforma${saved !== 1 ? "s" : ""}`);
  }

  async function handleSubmitLink(e: React.FormEvent) {
    e.preventDefault();
    const parsed = SocialLinkSchema.safeParse(linkForm);
    if (!parsed.success) {
      const errs: LinkFormErrors = {};
      parsed.error.errors.forEach((err) => {
        const k = err.path[0] as keyof SocialLinkFormData;
        if (!errs[k]) errs[k] = err.message;
      });
      setLinkErrors(errs);
      return;
    }
    setSubmittingLink(true);
    const result = await upsertSocialLink(parsed.data);
    if (result.error || !result.data) {
      setLinkErrors({ root: result.error ?? "Error desconocido" });
    } else {
      setShowLinkForm(false);
      await load();
      toast.success(editingLink ? "Perfil actualizado" : "Perfil de red social añadido");
    }
    setSubmittingLink(false);
  }

  async function handleDeleteLink(id: string) {
    if (!await confirm({ title: "¿Eliminar este perfil?", message: "Se eliminará el perfil y todo su historial de estadísticas.", confirmLabel: "Eliminar" })) return;
    setDeletingId(id);
    const { error } = await deleteSocialLink(id);
    if (error) toast.error(error);
    else setLinks((prev) => prev.filter((l) => l.id !== id));
    setDeletingId(null);
  }

  async function handleSubmitStat(e: React.FormEvent, linkId: string) {
    e.preventDefault();
    setStatErrors({});
    const followers = statForm.followers ? parseInt(statForm.followers) : null;
    const monthly_plays = statForm.monthly_plays ? parseInt(statForm.monthly_plays) : null;

    if (followers !== null && isNaN(followers)) { setStatErrors({ followers: "Número inválido" }); return; }
    if (monthly_plays !== null && isNaN(monthly_plays)) { setStatErrors({ monthly_plays: "Número inválido" }); return; }

    setSubmittingStat(true);
    const result = await addSocialStat({ social_link_id: linkId, followers, monthly_plays });
    if (result.error || !result.data) {
      setStatErrors({ root: result.error ?? "Error desconocido" });
    } else {
      setLinks((prev) =>
        prev.map((l) => l.id === linkId ? { ...l, latest_stat: result.data } : l)
      );
      setShowStatForm(null);
      setStatForm({ followers: "", monthly_plays: "" });
      // Refresh chart if open
      if (expandedChart === linkId) {
        setExpandedChart(null);
        setTimeout(() => setExpandedChart(linkId), 50);
      }
    }
    setSubmittingStat(false);
  }

  const configuredPlatforms = links.map((l) => l.platform);
  const missingPlatforms = ALL_PLATFORMS.filter((p) => !configuredPlatforms.includes(p));

  const sortedLinks = (() => {
    const list = [...links];
    if (platformSort === "followers") {
      list.sort((a, b) => (b.latest_stat?.followers ?? -1) - (a.latest_stat?.followers ?? -1));
    } else if (platformSort === "az") {
      list.sort((a, b) => PLATFORM_META[a.platform].label.localeCompare(PLATFORM_META[b.platform].label));
    }
    return list;
  })();

  function handleExportCSV() {
    if (links.length === 0) return;
    const headers = ["Plataforma", "URL", "Seguidores", "Reproducciones mensuales", "Última actualización"];
    const rows = links.map((l) => [
      PLATFORM_META[l.platform]?.label ?? l.platform,
      l.url,
      l.latest_stat?.followers != null ? String(l.latest_stat.followers) : "",
      l.latest_stat?.monthly_plays != null ? String(l.latest_stat.monthly_plays) : "",
      l.latest_stat?.recorded_at
        ? new Date(l.latest_stat.recorded_at).toLocaleDateString("es-ES")
        : "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "redes-sociales.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Share2 className="h-6 w-6 text-pink-400" />
            Redes Sociales
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Todas tus redes y estadísticas en un solo lugar
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && links.length > 0 && (
            <>
              <button
                onClick={openBatchForm}
                title="Registrar estadísticas de hoy para todas las plataformas"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Registrar hoy</span>
              </button>
              <button
                onClick={handleExportCSV}
                title="Exportar estadísticas a CSV"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
              </button>
              {links.length > 1 && (
                <div className="relative">
                  <ArrowUpDown className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <select
                    value={platformSort}
                    onChange={(e) => setPlatformSort(e.target.value as typeof platformSort)}
                    className="appearance-none pl-7 pr-6 py-2 rounded-lg border border-border text-xs bg-card text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                  >
                    <option value="default">Orden original</option>
                    <option value="followers">Más seguidores</option>
                    <option value="az">A → Z</option>
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                </div>
              )}
            </>
          )}
          {missingPlatforms.length > 0 && (
            <button
              onClick={openAddLink}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 transition-colors text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Agregar red
            </button>
          )}
        </div>
      </div>

      {/* Stale / missing stats alert */}
      {!loading && !error && links.length > 0 && (() => {
        const noStat  = links.filter(l => !l.latest_stat);
        const stale   = links.filter(l => l.latest_stat && isStale(l.latest_stat.recorded_at));
        const total   = noStat.length + stale.length;
        if (total === 0) return null;
        const label =
          noStat.length > 0 && stale.length > 0
            ? `${total} plataforma${total !== 1 ? "s" : ""} sin datos o desactualizadas`
            : noStat.length > 0
            ? `${noStat.length} plataforma${noStat.length !== 1 ? "s" : ""} sin estadísticas registradas`
            : `${stale.length} plataforma${stale.length !== 1 ? "s" : ""} con estadísticas desactualizadas`;
        return (
          <button
            onClick={openBatchForm}
            className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/15 transition-colors w-full"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-400 flex-shrink-0" />
              <p className="text-sm font-medium text-orange-400">{label}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-orange-400 flex-shrink-0" />
          </button>
        );
      })()}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : (
        <>
          {links.length > 0 && (
            <>
              {links.length >= 2 && <CombinedOverviewChart links={links} />}
            </>
          )}

          {links.length > 0 && (() => {
            // Totals summary strip
            const totalFollowers = links.reduce((sum, l) => sum + (l.latest_stat?.followers ?? 0), 0);
            const totalPlays = links.reduce((sum, l) => sum + (l.latest_stat?.monthly_plays ?? 0), 0);
            const prevTotalFollowers = links.reduce((sum, l) => sum + (l.previous_stat?.followers ?? 0), 0);
            const prevTotalPlays = links.reduce((sum, l) => sum + (l.previous_stat?.monthly_plays ?? 0), 0);

            return totalFollowers > 0 || totalPlays > 0 ? (
              <div className="flex flex-wrap gap-4 bg-card border border-border rounded-xl px-5 py-4">
                {totalFollowers > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Seguidores totales</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-bold">{formatNumber(totalFollowers)}</p>
                        <TrendBadge current={totalFollowers} previous={prevTotalFollowers} />
                      </div>
                    </div>
                  </div>
                )}
                {totalPlays > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Play className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Reproducciones mensuales</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-bold">{formatNumber(totalPlays)}</p>
                        <TrendBadge current={totalPlays} previous={prevTotalPlays} />
                      </div>
                    </div>
                  </div>
                )}
                <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground self-center">
                  <span>{links.length} plataforma{links.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
            ) : null;
          })()}

          {links.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedLinks.map((link) => {
                const meta = PLATFORM_META[link.platform];
                const stat = link.latest_stat;
                const chartOpen = expandedChart === link.id;
                return (
                  <div key={link.id} className={cn(
                    "bg-card rounded-xl border p-5 group hover:border-muted-foreground/30 transition-colors",
                    isStale(stat?.recorded_at) && stat != null ? "border-orange-500/30" : "border-border"
                  )}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${meta.color}`} />
                        <h3 className="font-semibold text-sm">{meta.label}</h3>
                        {link.username && (
                          <span className="text-xs text-muted-foreground">@{link.username}</span>
                        )}
                        {isStale(stat?.recorded_at) && stat != null && (
                          <span className="flex items-center gap-0.5 text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded-full">
                            <AlertCircle className="h-2.5 w-2.5" />
                            Desactualizado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopyUrl(link.id, link.url)}
                          title="Copiar URL"
                          className="p-1 rounded hover:bg-secondary text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
                        >
                          {copiedId === link.id
                            ? <Check className="h-3.5 w-3.5 text-green-400" />
                            : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-secondary text-muted-foreground transition-colors"
                          title="Abrir"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                          onClick={() => openEditLink(link)}
                          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteLink(link.id)}
                          disabled={deletingId === link.id}
                          className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                        >
                          {deletingId === link.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Seguidores</p>
                          <div className="flex items-center gap-2">
                            <p className="text-lg font-bold">{formatNumber(stat?.followers)}</p>
                            <TrendBadge current={stat?.followers} previous={link.previous_stat?.followers} />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Play className="h-3.5 w-3.5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Reproducciones mensuales</p>
                          <div className="flex items-center gap-2">
                            <p className="text-lg font-bold">{formatNumber(stat?.monthly_plays)}</p>
                            <TrendBadge current={stat?.monthly_plays} previous={link.previous_stat?.monthly_plays} />
                          </div>
                        </div>
                      </div>
                      {stat?.recorded_at && (
                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                          <Clock className="h-3 w-3" />
                          {timeAgo(stat.recorded_at)}
                        </p>
                      )}
                    </div>

                    {/* Chart toggle */}
                    <button
                      onClick={() => setExpandedChart(chartOpen ? null : link.id)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-3 w-full"
                    >
                      <TrendingUp className="h-3.5 w-3.5" />
                      Historial
                      <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${chartOpen ? "rotate-180" : ""}`} />
                    </button>

                    {chartOpen && (
                      <StatChart linkId={link.id} chartColor={meta.chartColor} />
                    )}

                    <div className="mt-4 pt-3 border-t border-border">
                      {showStatForm === link.id ? (
                        <form onSubmit={(e) => handleSubmitStat(e, link.id)} className="space-y-2">
                          {statErrors.root && <p className="text-xs text-red-500">{statErrors.root}</p>}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <input
                                type="number"
                                min={0}
                                placeholder="Seguidores"
                                value={statForm.followers}
                                onChange={(e) => setStatForm((p) => ({ ...p, followers: e.target.value }))}
                                className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                              />
                              {statErrors.followers && <p className="text-xs text-red-500 mt-0.5">{statErrors.followers}</p>}
                            </div>
                            <div>
                              <input
                                type="number"
                                min={0}
                                placeholder="Reproducc. mensuales"
                                value={statForm.monthly_plays}
                                onChange={(e) => setStatForm((p) => ({ ...p, monthly_plays: e.target.value }))}
                                className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                              />
                              {statErrors.monthly_plays && <p className="text-xs text-red-500 mt-0.5">{statErrors.monthly_plays}</p>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => { setShowStatForm(null); setStatErrors({}); }} className="flex-1 py-1.5 rounded border border-border text-xs hover:bg-secondary transition-colors">Cancelar</button>
                            <button type="submit" disabled={submittingStat} className="flex-1 py-1.5 rounded bg-primary text-primary-foreground text-xs hover:bg-primary/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                              {submittingStat && <Loader2 className="h-3 w-3 animate-spin" />}
                              Guardar
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          onClick={() => {
                            setShowStatForm(link.id);
                            setStatForm({ followers: stat?.followers?.toString() ?? "", monthly_plays: stat?.monthly_plays?.toString() ?? "" });
                            setStatErrors({});
                          }}
                          className={cn(
                            "flex items-center gap-1.5 text-xs transition-colors",
                            isStale(stat?.recorded_at)
                              ? "text-orange-400 hover:text-orange-300 font-medium"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {isStale(stat?.recorded_at) && !stat ? "Registrar estadísticas" : "Actualizar estadísticas"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {missingPlatforms.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">
                Plataformas sin configurar
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {missingPlatforms.map((platform) => {
                  const meta = PLATFORM_META[platform];
                  return (
                    <button
                      key={platform}
                      onClick={() => {
                        setEditingLink(null);
                        setLinkForm({ platform, url: "", username: null });
                        setLinkErrors({});
                        setShowLinkForm(true);
                      }}
                      className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border border-dashed hover:border-muted-foreground/40 hover:bg-secondary/30 transition-colors text-left"
                    >
                      <span className={`w-3 h-3 rounded-full ${meta.color} flex-shrink-0`} />
                      <span className="text-sm text-muted-foreground">{meta.label}</span>
                      <Plus className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {ConfirmDialog}

      {/* Modal: Batch stats recording */}
      {showBatchForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60" onClick={() => setShowBatchForm(false)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm">Registrar estadísticas de hoy</h2>
              </div>
              <button onClick={() => setShowBatchForm(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitBatch} className="p-5 space-y-5">
              <p className="text-xs text-muted-foreground">
                Completá los campos que tenés actualizados. Los vacíos se ignorarán.
              </p>
              {links.map((link) => {
                const meta = PLATFORM_META[link.platform];
                const vals = batchStats[link.id] ?? { followers: "", monthly_plays: "" };
                return (
                  <div key={link.id} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${meta.color}`} />
                      <span className="text-sm font-semibold">{meta.label}</span>
                      {link.username && (
                        <span className="text-xs text-muted-foreground">@{link.username}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 pl-4">
                      <div>
                        <label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                          <Users className="h-3 w-3" /> Seguidores
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder={link.latest_stat?.followers != null ? formatNumber(link.latest_stat.followers) : "—"}
                          value={vals.followers}
                          onChange={(e) => setBatchStats(prev => ({
                            ...prev,
                            [link.id]: { ...prev[link.id], followers: e.target.value }
                          }))}
                          className={cn(
                            "w-full bg-secondary border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50",
                            batchErrors[`${link.id}_followers`] ? "border-red-500/50" : "border-border"
                          )}
                        />
                        {batchErrors[`${link.id}_followers`] && (
                          <p className="text-[10px] text-red-400 mt-0.5">{batchErrors[`${link.id}_followers`]}</p>
                        )}
                        {(() => {
                          const newVal = parseInt(vals.followers, 10);
                          const prev = link.latest_stat?.followers;
                          if (!vals.followers || isNaN(newVal) || prev == null) return null;
                          const diff = newVal - prev;
                          if (diff === 0) return <p className="text-[10px] text-muted-foreground mt-0.5">Sin cambios</p>;
                          return (
                            <p className={cn("text-[10px] mt-0.5 font-medium", diff > 0 ? "text-green-400" : "text-red-400")}>
                              {diff > 0 ? `+${formatNumber(diff)}` : formatNumber(diff)} vs anterior
                            </p>
                          );
                        })()}
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                          <Play className="h-3 w-3" /> Reproducciones/mes
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder={link.latest_stat?.monthly_plays != null ? formatNumber(link.latest_stat.monthly_plays) : "—"}
                          value={vals.monthly_plays}
                          onChange={(e) => setBatchStats(prev => ({
                            ...prev,
                            [link.id]: { ...prev[link.id], monthly_plays: e.target.value }
                          }))}
                          className={cn(
                            "w-full bg-secondary border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50",
                            batchErrors[`${link.id}_plays`] ? "border-red-500/50" : "border-border"
                          )}
                        />
                        {batchErrors[`${link.id}_plays`] && (
                          <p className="text-[10px] text-red-400 mt-0.5">{batchErrors[`${link.id}_plays`]}</p>
                        )}
                        {(() => {
                          const newVal = parseInt(vals.monthly_plays, 10);
                          const prev = link.latest_stat?.monthly_plays;
                          if (!vals.monthly_plays || isNaN(newVal) || prev == null) return null;
                          const diff = newVal - prev;
                          if (diff === 0) return <p className="text-[10px] text-muted-foreground mt-0.5">Sin cambios</p>;
                          return (
                            <p className={cn("text-[10px] mt-0.5 font-medium", diff > 0 ? "text-green-400" : "text-red-400")}>
                              {diff > 0 ? `+${formatNumber(diff)}` : formatNumber(diff)} vs anterior
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="flex gap-3 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowBatchForm(false)}
                  className="flex-1 py-2.5 border border-border rounded-lg text-sm hover:bg-secondary transition-colors text-muted-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={batchSubmitting}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {batchSubmitting
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</>
                    : <><Save className="h-4 w-4" /> Guardar todo</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal link */}
      {showLinkForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-card border border-border rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-base font-semibold">
                {editingLink ? "Editar perfil" : "Agregar red social"}
              </h2>
              <button onClick={() => setShowLinkForm(false)} className="p-1.5 rounded-lg hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitLink} className="p-5 space-y-4">
              {linkErrors.root && (
                <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">{linkErrors.root}</p>
              )}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">Plataforma *</label>
                <select
                  value={linkForm.platform}
                  onChange={(e) => setLinkForm((p) => ({ ...p, platform: e.target.value as SocialPlatform }))}
                  disabled={!!editingLink}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
                >
                  {ALL_PLATFORMS.map((p) => (
                    <option key={p} value={p}>{PLATFORM_META[p].label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">URL *</label>
                <input
                  ref={urlRef}
                  type="url"
                  value={linkForm.url}
                  onChange={(e) => setLinkForm((p) => ({ ...p, url: e.target.value }))}
                  placeholder={PLATFORM_META[linkForm.platform].placeholder}
                  className={`w-full px-3 py-2.5 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${linkErrors.url ? "border-red-500" : "border-border"}`}
                />
                {linkErrors.url && <p className="text-xs text-red-500">{linkErrors.url}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">Usuario (sin @)</label>
                <input
                  type="text"
                  value={linkForm.username ?? ""}
                  onChange={(e) => setLinkForm((p) => ({ ...p, username: e.target.value || null }))}
                  placeholder="bertiaka"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowLinkForm(false)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors">Cancelar</button>
                <button type="submit" disabled={submittingLink} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {submittingLink && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingLink ? "Guardar" : "Agregar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
