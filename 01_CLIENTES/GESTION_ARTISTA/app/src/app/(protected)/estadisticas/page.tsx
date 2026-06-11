"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid, RadialBarChart,
  RadialBar, ComposedChart, Line,
} from "recharts";
import {
  BarChart2, Disc3, Clock, Tag, Users2, Music2,
  FileAudio, Users, FolderOpen, CheckCircle2, AlertTriangle, CalendarClock, ChevronRight,
  LayoutDashboard, Award, TrendingUp, TrendingDown, Share2, Play, Zap, Target,
} from "lucide-react";
import { getAllStats, type AllStats, type GoalsStats, getRecentPlayHistory, type PlayHistoryEntry } from "@/lib/actions/stats";
import { getSocialLinks, type SocialLinkWithLatestStat } from "@/lib/actions/social";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/MotionWrapper";

// Hex colors matching genre-colors.ts for Recharts
const GENRE_CHART_COLORS: Record<string, string> = {
  "Trap":      "#f97316",
  "Reggaeton": "#22c55e",
  "Hip Hop":   "#eab308",
  "R&B":       "#ec4899",
  "Pop":       "#06b6d4",
  "Drill":     "#ef4444",
  "Dancehall": "#a855f7",
  "Afrobeats": "#f59e0b",
  "Otro":      "#71717a",
};
const GENRE_COLORS_FALLBACK = [
  "#7c3aed", "#2563eb", "#0891b2", "#059669", "#d97706",
  "#dc2626", "#db2777", "#4f46e5", "#65a30d", "#0d9488",
  "#ea580c", "#0284c7",
];
function getGenreChartColor(genre: string, index: number): string {
  return GENRE_CHART_COLORS[genre] ?? GENRE_COLORS_FALLBACK[index % GENRE_COLORS_FALLBACK.length];
}

// Shared Recharts tooltip style
const TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border) / 0.6)",
  borderRadius: 16,
  fontSize: 12,
  boxShadow: "0 8px 32px hsl(0 0% 0% / 0.3)",
  padding: "8px 12px",
};

type Tab = "resumen" | "discografia" | "maquetas" | "collabs" | "proyectos" | "redes" | "metas";

const TABS: { id: Tab; label: string; icon: React.ElementType; color: string }[] = [
  { id: "resumen",     label: "Resumen",       icon: LayoutDashboard, color: "text-primary" },
  { id: "discografia", label: "Discografía",   icon: Disc3,           color: "text-primary" },
  { id: "maquetas",    label: "Maquetas",       icon: FileAudio,       color: "text-blue-400" },
  { id: "collabs",     label: "Featúrings",     icon: Users,           color: "text-yellow-400" },
  { id: "proyectos",   label: "Proyectos",      icon: FolderOpen,      color: "text-purple-400" },
  { id: "redes",       label: "Redes",          icon: Share2,          color: "text-pink-400" },
  { id: "metas",       label: "Metas",          icon: Target,          color: "text-emerald-400" },
];

const PLATFORM_META: Record<string, { label: string; color: string; chartColor: string }> = {
  spotify:    { label: "Spotify",       color: "bg-green-500",  chartColor: "#22c55e" },
  youtube:    { label: "YouTube",       color: "bg-red-500",    chartColor: "#ef4444" },
  instagram:  { label: "Instagram",     color: "bg-pink-500",   chartColor: "#ec4899" },
  tiktok:     { label: "TikTok",        color: "bg-slate-400",  chartColor: "#94a3b8" },
  soundcloud: { label: "SoundCloud",    color: "bg-orange-500", chartColor: "#f97316" },
  twitter:    { label: "Twitter/X",     color: "bg-sky-500",    chartColor: "#0ea5e9" },
};

function formatDuration(seconds: number): string {
  if (seconds === 0) return "0 min";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

function StatCard({ icon: Icon, label, value, sub, color, href, delta }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string; href?: string;
  delta?: number;
}) {
  // Auto-detect pure integer values to animate them
  const numericValue = /^\d+$/.test(value.trim()) ? Number(value) : null;
  const inner = (
    <>
      {/* Top accent bar — uses currentColor from the color class */}
      <span className={cn("block h-[3px] rounded-full mb-4 w-8", color)}
        style={{ background: "currentColor", boxShadow: "0 0 8px currentColor" }} />
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em]">{label}</span>
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center bg-secondary/60 group-hover:scale-110 transition-all border border-white/5 shadow-[0_2px_8px_hsl(0_0%_0%/0.2)]")}>
          <Icon className={cn("h-[18px] w-[18px] drop-shadow-[0_0_4px_currentColor]", color)} />
        </div>
      </div>
      {numericValue !== null ? (
        <AnimatedCounter
          value={numericValue}
          className="text-4xl font-black leading-none tabular-nums block"
          duration={1.4}
        />
      ) : (
        <p className="text-4xl font-black leading-none tabular-nums">{value}</p>
      )}
      {delta !== undefined && delta !== 0 && (
        <div className={cn(
          "inline-flex items-center gap-0.5 text-[11px] font-medium mt-1.5 px-1.5 py-0.5 rounded-full",
          delta > 0 ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"
        )}>
          {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {delta > 0 ? "+" : ""}{delta} vs mes ant.
        </div>
      )}
      {sub && <p className="text-xs text-muted-foreground mt-2">{sub}</p>}
    </>
  );
  if (href) {
    return (
      <a href={href} className="card-premium rounded-2xl p-5 block hover:-translate-y-0.5 active:scale-[0.98] group transition-all duration-200">
        {inner}
      </a>
    );
  }
  return (
    <div className="card-premium rounded-2xl p-5">
      {inner}
    </div>
  );
}

function SectionCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("card-premium rounded-2xl p-5", className)}>
      <h2 className="text-[11px] font-black mb-4 text-muted-foreground uppercase tracking-[0.1em]">
        {title}
      </h2>
      {children}
    </div>
  );
}

function TagCloud({ tags }: { tags: { tag: string; count: number }[] }) {
  const max = tags[0]?.count ?? 1;
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(({ tag, count }) => {
        const size = Math.round(10 + (count / max) * 6);
        const opacity = 0.5 + (count / max) * 0.5;
        return (
          <span
            key={tag}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary"
            style={{ fontSize: size, opacity }}
          >
            <Tag className="h-2.5 w-2.5 flex-shrink-0" />
            {tag}
            <span className="text-muted-foreground text-[10px]">{count}</span>
          </span>
        );
      })}
    </div>
  );
}

function BarList({ items, colorKey = "color" }: {
  items: { label: string; count: number; color?: string }[];
  colorKey?: string;
}) {
  const max = items[0]?.count ?? 1;
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-4 text-right flex-shrink-0">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-black truncate">{item.label}</span>
              <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">{item.count}</span>
            </div>
            <div className="h-1.5 bg-secondary/60 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
                style={{
                  width: `${Math.round((item.count / max) * 100)}%`,
                  background: item.color
                    ? `linear-gradient(90deg, ${item.color}99, ${item.color})`
                    : "linear-gradient(90deg, hsl(var(--primary)/0.7), hsl(var(--primary)))",
                  boxShadow: `0 0 6px ${item.color ?? "hsl(var(--primary)/0.5)"}66`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {[1,2,3,4].map(i => <div key={i} className="h-9 w-28 skeleton rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card-premium rounded-2xl p-5">
            <div className="h-3 skeleton rounded w-20 mb-3" />
            <div className="h-7 skeleton rounded w-16" />
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card-premium rounded-2xl p-5 h-56 skeleton-shimmer" />
        ))}
      </div>
    </div>
  );
}

export default function EstadisticasPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <EstadisticasContent />
    </Suspense>
  );
}

function EstadisticasContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [stats, setStats] = useState<AllStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLinkWithLatestStat[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [playHistory, setPlayHistory] = useState<PlayHistoryEntry[]>([]);

  const rawTab = searchParams.get("tab") as Tab | null;
  const tab: Tab = rawTab && TABS.some(t => t.id === rawTab) ? rawTab : "resumen";

  const setTab = useCallback((t: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", t);
    router.replace(`/estadisticas?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  useEffect(() => {
    getAllStats().then(({ data, error }) => {
      if (error) setError(error);
      else setStats(data);
      setLoading(false);
    });
    getSocialLinks().then(({ data }) => {
      setSocialLinks(data ?? []);
      setLoadingLinks(false);
    });
    getRecentPlayHistory(15).then(({ data }) => {
      setPlayHistory(data ?? []);
    });
  }, []);

  // Keyboard shortcuts: 1-5 to switch tabs
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const idx = parseInt(e.key, 10);
      if (idx >= 1 && idx <= TABS.length) {
        e.preventDefault();
        setTab(TABS[idx - 1].id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-premium relative overflow-hidden rounded-2xl page-header-hero p-6">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, hsl(var(--section-hsl, 262 80% 62%) / 0.10) 0%, transparent 60%)" }} />
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full blur-3xl pointer-events-none" style={{ background: "hsl(var(--section-hsl, 262 80% 62%) / 0.08)" }} />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full blur-2xl pointer-events-none" style={{ background: "hsl(var(--section-hsl, 262 80% 62%) / 0.05)" }} />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg shadow-primary/25 flex-shrink-0">
            <BarChart2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight gradient-text">Estadísticas</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Análisis completo de tu actividad musical
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <Skeleton />
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 bg-secondary/40 backdrop-blur-md rounded-2xl p-1.5 max-w-full border border-border/30 scrollbar-none">
            {TABS.map((t, i) => {
              const Icon = t.icon;
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  title={`${t.label} (tecla ${i + 1})`}
                  className={cn(
                    "tab-indicator flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm whitespace-nowrap transition-all duration-200 active:scale-95",
                    isActive
                      ? "active card-premium text-foreground font-black shadow-[0_2px_10px_hsl(0_0%_0%/0.25),inset_0_1px_0_hsl(0_0%_100%/0.10)] border-primary/15"
                      : "font-medium text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                >
                  <Icon className={cn(
                    "h-4 w-4 transition-all duration-200",
                    isActive
                      ? cn(t.color, "drop-shadow-[0_0_6px_currentColor] scale-110")
                      : "opacity-50 group-hover:opacity-80"
                  )} />
                  <span className={isActive ? "gradient-text" : ""}>{t.label}</span>
                  <kbd className={cn(
                    "hidden sm:inline-flex items-center justify-center w-4 h-4 text-[9px] font-mono rounded border transition-colors ml-0.5",
                    isActive
                      ? "border-primary/30 text-primary/70 bg-primary/8"
                      : "border-border/30 text-muted-foreground/35 bg-secondary/30"
                  )}>{i + 1}</kbd>
                </button>
              );
            })}
          </div>

          {/* ── RESUMEN TAB ──────────────────────────────────────── */}
          {tab === "resumen" && (
            <>
              <ResumenTab stats={stats!} />
              {playHistory.length > 0 && (
                <div className="card-premium rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-black text-foreground/90">Últimas reproducciones</h3>
                  </div>
                  <div className="space-y-1">
                    {playHistory.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-secondary/60 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn(
                            "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black",
                            entry.song_id ? "bg-primary/15 text-primary" : "bg-blue-500/15 text-blue-400"
                          )}>
                            {entry.song_id ? "S" : "M"}
                          </span>
                          <span className="text-sm font-medium truncate">
                            {entry.song_title ?? entry.draft_title ?? "Pista desconocida"}
                          </span>
                        </div>
                        <span className="flex-shrink-0 text-[11px] text-muted-foreground/50 tabular-nums">
                          {new Date(entry.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── DISCOGRAFÍA TAB ───────────────────────────────────── */}
          {tab === "discografia" && <DiscografiaTab stats={stats?.discografia ?? null} />}

          {/* ── MAQUETAS TAB ─────────────────────────────────────── */}
          {tab === "maquetas" && <MaquetasTab stats={stats?.maquetas ?? null} />}

          {/* ── COLLABS TAB ──────────────────────────────────────── */}
          {tab === "collabs" && <CollabsTab stats={stats?.collabs ?? null} />}

          {/* ── PROYECTOS TAB ────────────────────────────────────── */}
          {tab === "proyectos" && <ProyectosTab stats={stats?.projects ?? null} />}

          {/* ── REDES TAB ────────────────────────────────────────── */}
          {tab === "redes" && <RedesTab links={socialLinks} loading={loadingLinks} />}

          {/* ── METAS TAB ────────────────────────────────────────── */}
          {tab === "metas" && <MetasTab stats={stats?.goals ?? null} />}
        </>
      )}
    </div>
  );
}

// ── Sub-pages ─────────────────────────────────────────────────────────

function DiscografiaTab({ stats }: { stats: AllStats["discografia"] }) {
  if (!stats || stats.totalSongs === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <div
          className="relative w-16 h-16 rounded-2xl flex items-center justify-center empty-state-icon mx-auto mb-3"
          style={{
            background: "linear-gradient(135deg, hsl(var(--section-hsl, 178 70% 45%) / 0.20), hsl(var(--section-hsl, 178 70% 45%) / 0.07))",
            border: "1px solid hsl(var(--section-hsl, 178 70% 45%) / 0.22)",
            boxShadow: "0 8px 32px hsl(0 0% 0% / 0.15)"
          }}
        >
          <Disc3 className="h-8 w-8" style={{ color: "hsl(var(--section-hsl, 178 70% 45%))" }} />
        </div>
        <p className="text-sm">Todavía no hay canciones en la discografía</p>
      </div>
    );
  }

  const avgDuration = stats.totalSongs > 0
    ? Math.round(stats.totalDurationSeconds / stats.totalSongs) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Disc3} label="Canciones" value={String(stats.totalSongs)} color="text-primary" />
        <StatCard icon={Clock} label="Duración total" value={formatDuration(stats.totalDurationSeconds)}
          sub={avgDuration > 0 ? `~${formatDuration(avgDuration)} / canción` : undefined} color="text-blue-400" />
        <StatCard icon={Music2} label="Géneros" value={String(stats.totalGenres)} color="text-purple-400" />
        <StatCard icon={Users2} label="Artistas feat." value={String(stats.topFeaturing.length)} color="text-yellow-400" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <SectionCard title="Canciones por año">
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={stats.songsByYear} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="statsBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--section-hsl, 262 80% 62%))" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(var(--section-hsl, 262 80% 62%))" stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false}
                tickFormatter={(v: number) => v > 0 ? `${Math.floor(v / 60)}m` : ""} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v, name) => {
                  const num = v as number;
                  if (name === "count") return [num, "canciones"];
                  if (name === "avgDurationSeconds") {
                    const m = Math.floor(num / 60), s = num % 60;
                    return [`${m}:${String(s).padStart(2, "0")}`, "duración prom."];
                  }
                  return [num, String(name)];
                }}
              />
              <Bar yAxisId="left" dataKey="count" fill="url(#statsBarGrad)" radius={[6, 6, 0, 0]} maxBarSize={40} />
              <Line yAxisId="right" type="monotone" dataKey="avgDurationSeconds" stroke="#fb923c"
                strokeWidth={2} dot={{ fill: "#fb923c", r: 3 }} activeDot={{ r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-primary/80" /> canciones</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-orange-400" /> duración prom.</span>
          </p>
        </SectionCard>

        <SectionCard title="Distribución por género">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={stats.songsByGenre} dataKey="count" nameKey="genre" cx="50%" cy="50%"
                innerRadius={50} outerRadius={80} paddingAngle={2}>
                {stats.songsByGenre.map((entry, i) => (
                  <Cell key={i} fill={getGenreChartColor(entry.genre, i)} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend formatter={(v) => <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Cobertura de plataformas">
          <div className="space-y-3">
            {stats.platformCoverage.map(({ platform, count, total, pct }) => (
              <div key={platform}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{platform}</span>
                  <span className="text-xs text-muted-foreground">{count}/{total} · {pct}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{
                    width: `${pct}%`,
                    background: platform === "Spotify" ? "#1db954" : platform === "YouTube" ? "#ff0000"
                      : platform === "Apple Music" ? "#fa243c" : "#ff5500",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {stats.topFeaturing.length > 0 && (
          <SectionCard title="Artistas frecuentes (feat.)">
            <BarList items={stats.topFeaturing.map(f => ({ label: f.artist, count: f.count, color: "#facc15" }))} />
          </SectionCard>
        )}
      </div>

      {/* BPM & Key Distribution */}
      {(stats.bpmDistribution.length > 0 || stats.keyDistribution.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6">
          {stats.bpmDistribution.length > 0 && (
            <SectionCard title={`BPM · ${stats.songsWithBpm} canción${stats.songsWithBpm !== 1 ? "es" : ""} analizadas`}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats.bpmDistribution} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bpmBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--section-hsl, 178 70% 45%))" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="hsl(var(--section-hsl, 178 70% 45%))" stopOpacity={0.45} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="range" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE}
                    formatter={(v: unknown) => [v as number, "canciones"]}
                    labelFormatter={(l) => `${l} BPM`} />
                  <Bar dataKey="count" fill="url(#bpmBarGrad)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-muted-foreground mt-1">
                {stats.totalSongs - stats.songsWithBpm} canción{stats.totalSongs - stats.songsWithBpm !== 1 ? "es" : ""} sin BPM registrado
              </p>
            </SectionCard>
          )}

          {stats.keyDistribution.length > 0 && (
            <SectionCard title={`Tonalidades · ${stats.songsWithKey} canción${stats.songsWithKey !== 1 ? "es" : ""} analizadas`}>
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 scrollbar-none">
                {stats.keyDistribution.map(({ key, count }, i) => {
                  const max = stats.keyDistribution[0].count;
                  const pct = Math.round((count / max) * 100);
                  const hue = Math.round((i / stats.keyDistribution.length) * 280);
                  return (
                    <div key={key} className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-black w-16 flex-shrink-0 truncate" style={{ color: `hsl(${hue} 70% 65%)` }}>{key}</span>
                      <div className="flex-1 h-2 bg-secondary/60 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: `hsl(${hue} 70% 55%)`, boxShadow: `0 0 6px hsl(${hue} 70% 55% / 0.4)` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums w-4 text-right flex-shrink-0">{count}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                {stats.totalSongs - stats.songsWithKey} canción{stats.totalSongs - stats.songsWithKey !== 1 ? "es" : ""} sin tonalidad registrada
              </p>
            </SectionCard>
          )}
        </div>
      )}

      {stats.topTags.length > 0 && (
        <SectionCard title="Tags más usados">
          <TagCloud tags={stats.topTags} />
        </SectionCard>
      )}

      {stats.recentSongs.length > 0 && (
        <SectionCard title="Canciones recientes">
          <div className="divide-y divide-border/50 -mx-5 -mb-5">
            {stats.recentSongs.map((s) => (
              <a
                key={s.id}
                href={`/discografia?song=${s.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/50 transition-all active:scale-[0.99] group"
              >
                {/* Cover art or fallback */}
                <div className="w-9 h-9 rounded-xl overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0 border border-border/50">
                  {s.cover_art_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.cover_art_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Disc3 className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{s.year}{s.genre ? ` · ${s.genre}` : ""}</span>
                    {s.bpm && (
                      <span className="flex items-center gap-0.5 text-[10px] text-blue-400/80 font-mono tabular-nums">
                        <Zap className="h-2.5 w-2.5" />{s.bpm}
                      </span>
                    )}
                    {s.key_signature && (
                      <span className="text-[10px] text-purple-400/80 font-medium">♪ {s.key_signature}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </a>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function MaquetasTab({ stats }: { stats: AllStats["maquetas"] }) {
  if (!stats || stats.total === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <div
          className="relative w-16 h-16 rounded-2xl flex items-center justify-center empty-state-icon mx-auto mb-3"
          style={{
            background: "linear-gradient(135deg, hsl(var(--section-hsl, 178 70% 45%) / 0.20), hsl(var(--section-hsl, 178 70% 45%) / 0.07))",
            border: "1px solid hsl(var(--section-hsl, 178 70% 45%) / 0.22)",
            boxShadow: "0 8px 32px hsl(0 0% 0% / 0.15)"
          }}
        >
          <FileAudio className="h-8 w-8" style={{ color: "hsl(var(--section-hsl, 178 70% 45%))" }} />
        </div>
        <p className="text-sm">Todavía no hay maquetas registradas</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FileAudio} label="Total maquetas" value={String(stats.total)} color="text-blue-400" />
        <StatCard icon={CheckCircle2} label="Listas para publicar"
          value={String(stats.byStatus.find(s => s.status === "lista_para_publicar")?.count ?? 0)} color="text-green-400" />
        <StatCard icon={Music2} label="En mezcla"
          value={String(stats.byStatus.find(s => s.status === "en_mezcla")?.count ?? 0)} color="text-purple-400" />
        <StatCard icon={Users2} label="Productores"
          value={String(stats.topProducers.length)} color="text-orange-400" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pipeline donut */}
        <SectionCard title="Pipeline de producción">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={stats.byStatus} dataKey="count" nameKey="label" cx="50%" cy="50%"
                innerRadius={55} outerRadius={80} paddingAngle={3}>
                {stats.byStatus.map((s, i) => (
                  <Cell key={i} fill={s.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend formatter={(v) => <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Maquetas by month */}
        {stats.byMonth.length > 1 && (
          <SectionCard title="Creación mensual">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.byMonth} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="maquetasBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={1} />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.45} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [v as number, "maquetas"]} />
                <Bar dataKey="count" fill="url(#maquetasBarGrad)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        )}

        {/* Top producers */}
        {stats.topProducers.length > 0 && (
          <SectionCard title="Top productores">
            <BarList items={stats.topProducers.map(p => ({ label: p.producer, count: p.count, color: "#60a5fa" }))} />
          </SectionCard>
        )}

        {/* Status breakdown */}
        <SectionCard title="Estado del pipeline">
          <div className="space-y-3">
            {stats.byStatus.map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-sm flex-1">{label}</span>
                <span className="text-sm font-black tabular-nums">{count}</span>
                <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden flex-shrink-0">
                  <div className="h-full rounded-full" style={{ width: `${Math.round((count / stats.total) * 100)}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function CompletionRing({ pct, size = 120 }: { pct: number; size?: number }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="hsl(var(--secondary))" strokeWidth={10} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="#4ade80" strokeWidth={10} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black tabular-nums">{pct}%</span>
        <span className="text-[10px] text-muted-foreground">completadas</span>
      </div>
    </div>
  );
}

function CollabsTab({ stats }: { stats: AllStats["collabs"] }) {
  if (!stats || stats.total === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <div
          className="relative w-16 h-16 rounded-2xl flex items-center justify-center empty-state-icon mx-auto mb-3"
          style={{
            background: "linear-gradient(135deg, hsl(var(--section-hsl, 178 70% 45%) / 0.20), hsl(var(--section-hsl, 178 70% 45%) / 0.07))",
            border: "1px solid hsl(var(--section-hsl, 178 70% 45%) / 0.22)",
            boxShadow: "0 8px 32px hsl(0 0% 0% / 0.15)"
          }}
        >
          <Users className="h-8 w-8" style={{ color: "hsl(var(--section-hsl, 178 70% 45%))" }} />
        </div>
        <p className="text-sm">Todavía no hay featurings registrados</p>
      </div>
    );
  }

  const activeCount = stats.total - stats.completed;
  const completionPct = Math.round((stats.completed / stats.total) * 100);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total collabs" value={String(stats.total)} color="text-yellow-400" />
        <StatCard icon={CheckCircle2} label="Completadas" value={String(stats.completed)}
          sub={`${completionPct}% del total`} color="text-green-400" />
        <StatCard icon={Music2} label="En progreso" value={String(activeCount)} color="text-blue-400" />
        <StatCard icon={Users2} label="Artistas únicos" value={String(stats.topArtists.length)} color="text-purple-400" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Completion rate */}
        <SectionCard title="Tasa de finalización">
          <div className="flex items-center gap-4">
            {/* Radial chart */}
            <div className="relative flex-shrink-0">
              <ResponsiveContainer width={120} height={120}>
                <RadialBarChart
                  cx="50%" cy="50%"
                  innerRadius={36} outerRadius={56}
                  startAngle={90} endAngle={-270}
                  data={[
                    { name: "Completadas", value: completionPct, fill: "#4ade80" },
                    { name: "Pendientes", value: 100 - completionPct, fill: "hsl(var(--secondary))" },
                  ]}
                  barSize={14}
                >
                  <RadialBar dataKey="value" cornerRadius={6} background={false} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black tabular-nums leading-none">{completionPct}%</span>
                <span className="text-[9px] text-muted-foreground">listas</span>
              </div>
            </div>
            <div className="space-y-2.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <span className="text-sm flex-1">Listas</span>
                <span className="text-sm font-semibold tabular-nums">{stats.completed}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                <span className="text-sm flex-1">En progreso</span>
                <span className="text-sm font-semibold tabular-nums">{activeCount}</span>
              </div>
              {stats.overdueCount > 0 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-2.5 h-2.5 text-red-400 flex-shrink-0" />
                  <span className="text-sm flex-1 text-red-400">Deadline vencido</span>
                  <span className="text-sm font-black tabular-nums text-red-400">{stats.overdueCount}</span>
                </div>
              )}
              {stats.withDeadline > 0 && (
                <p className="text-[11px] text-muted-foreground border-t border-border/60 pt-2">
                  {stats.withDeadline}/{stats.total} tienen deadline
                </p>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Status funnel */}
        <SectionCard title="Estado de las colaboraciones">
          <div className="space-y-3">
            {stats.byStatus.map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-sm flex-1">{label}</span>
                <span className="text-sm font-black tabular-nums">{count}</span>
                <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden flex-shrink-0">
                  <div className="h-full rounded-full" style={{ width: `${Math.round((count / stats.total) * 100)}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Monthly activity chart */}
        {stats.byMonth.length > 1 && (
          <SectionCard title="Actividad mensual">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.byMonth} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="collabsBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#facc15" stopOpacity={1} />
                    <stop offset="100%" stopColor="#facc15" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [v as number, "collabs"]} />
                <Bar dataKey="count" fill="url(#collabsBarGrad)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        )}

        {/* Top artists */}
        {stats.topArtists.length > 0 && (
          <SectionCard title="Artistas más frecuentes">
            <BarList items={stats.topArtists.map(a => ({ label: a.artist, count: a.count, color: "#facc15" }))} />
          </SectionCard>
        )}
      </div>
    </div>
  );
}

function TargetDateBadge({ daysLeft }: { daysLeft: number }) {
  if (daysLeft < 0) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-red-400">
        <AlertTriangle className="h-3 w-3" />
        Vencido hace {Math.abs(daysLeft)}d
      </span>
    );
  }
  if (daysLeft === 0) return <span className="text-xs font-bold text-orange-400">¡Hoy!</span>;
  if (daysLeft === 1) return <span className="text-xs font-medium text-orange-400">Mañana</span>;
  if (daysLeft <= 7) return <span className="text-xs font-medium text-yellow-400">{daysLeft}d</span>;
  if (daysLeft <= 30) return <span className="text-xs text-muted-foreground">{daysLeft}d</span>;
  const weeks = Math.round(daysLeft / 7);
  return <span className="text-xs text-muted-foreground">{weeks} sem</span>;
}

// ── Resumen (overview) tab ────────────────────────────────────────────

function ResumenTab({ stats }: { stats: AllStats }) {
  const disco  = stats.discografia;
  const maq    = stats.maquetas;
  const col    = stats.collabs;
  const proy   = stats.projects;
  const goals  = stats.goals;

  const maquetasReady = maq?.byStatus.find(s => s.status === "lista_para_publicar")?.count ?? 0;
  const maquetasPct   = maq && maq.total > 0 ? Math.round((maquetasReady / maq.total) * 100) : 0;
  const collabsPct    = col && col.total > 0 ? Math.round((col.completed / col.total) * 100) : 0;
  const published     = proy?.byStatus.find(s => s.status === "publicado")?.count ?? 0;
  const proyPct       = proy && proy.total > 0 ? Math.round((published / proy.total) * 100) : 0;

  const bestYear  = disco?.songsByYear.reduce<{ year: number; count: number; avgDurationSeconds: number } | null>(
    (best, y) => y.count > (best?.count ?? 0) ? y : best, null
  );
  const topGenre  = disco?.songsByGenre[0];
  const topArtist = col?.topArtists[0];

  const hasAnyData = (disco?.totalSongs ?? 0) + (maq?.total ?? 0) + (col?.total ?? 0) + (proy?.total ?? 0) > 0;

  if (!hasAnyData) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <div
          className="relative w-16 h-16 rounded-2xl flex items-center justify-center empty-state-icon mx-auto mb-3"
          style={{
            background: "linear-gradient(135deg, hsl(var(--section-hsl, 178 70% 45%) / 0.20), hsl(var(--section-hsl, 178 70% 45%) / 0.07))",
            border: "1px solid hsl(var(--section-hsl, 178 70% 45%) / 0.22)",
            boxShadow: "0 8px 32px hsl(0 0% 0% / 0.15)"
          }}
        >
          <BarChart2 className="h-8 w-8" style={{ color: "hsl(var(--section-hsl, 178 70% 45%))" }} />
        </div>
        <p className="text-sm">Todavía no hay datos suficientes para el resumen</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mega KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard icon={Disc3}      label="Canciones"       value={String(disco?.totalSongs ?? 0)}
          sub={disco ? formatDuration(disco.totalDurationSeconds) + " de música" : undefined}
          color="text-primary" href="/discografia" />
        <StatCard icon={FileAudio}  label="Maquetas"        value={String(maq?.total ?? 0)}
          sub={maq ? `${maquetasPct}% listas para publicar` : undefined}
          color="text-blue-400" href="/maquetas" />
        <StatCard icon={Users}      label="Colaboraciones"  value={String(col?.total ?? 0)}
          sub={col ? `${collabsPct}% completadas` : undefined}
          color="text-yellow-400" href="/collabs" />
        <StatCard icon={FolderOpen} label="Proyectos"       value={String(proy?.total ?? 0)}
          sub={proy ? `${proyPct}% publicados` : undefined}
          color="text-purple-400" href="/proyectos" />
        <StatCard icon={Target}     label="Metas"           value={String(goals?.total ?? 0)}
          sub={goals && goals.total > 0 ? `${goals.completed} completada${goals.completed !== 1 ? "s" : ""} · ${goals.avgProgress}% prom.` : undefined}
          color="text-emerald-400" href="/metas" />
      </div>

      {/* Year-over-year output comparison */}
      {disco && disco.songsByYear.length > 0 && (() => {
        const currentYear = new Date().getFullYear();
        const thisYear  = disco.songsByYear.find(y => y.year === currentYear)?.count ?? 0;
        const lastYear  = disco.songsByYear.find(y => y.year === currentYear - 1)?.count ?? 0;
        if (thisYear === 0 && lastYear === 0) return null;
        const delta = thisYear - lastYear;
        const pct = lastYear > 0 ? Math.round((delta / lastYear) * 100) : null;
        const twoYearsAgo = disco.songsByYear.find(y => y.year === currentYear - 2)?.count ?? 0;
        const recent = disco.songsByYear
          .filter(y => y.year >= currentYear - 3)
          .sort((a, b) => a.year - b.year);
        const maxCount = Math.max(...recent.map(y => y.count), 1);
        return (
          <div className="card-premium rounded-2xl p-5">
            <h2 className="text-xs font-black mb-4 text-muted-foreground uppercase tracking-wide">
              Ritmo de producción anual
            </h2>
            <div className="flex items-end gap-6">
              {/* Sparkline minibar */}
              {recent.length > 1 && (
                <div className="flex items-end gap-1.5 h-14 flex-shrink-0">
                  {recent.map((y) => {
                    const h = Math.max(Math.round((y.count / maxCount) * 100), 8);
                    const isCurrent = y.year === currentYear;
                    return (
                      <div key={y.year} className="flex flex-col items-center gap-1">
                        <div
                          className={cn("w-5 rounded-t-sm transition-all duration-700", isCurrent ? "bg-primary" : "bg-secondary")}
                          style={{ height: `${h}%` }}
                          title={`${y.year}: ${y.count} canción${y.count !== 1 ? "es" : ""}`}
                        />
                        <span className="text-[9px] text-muted-foreground tabular-nums">{String(y.year).slice(2)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Numbers */}
              <div className="flex items-center gap-5 flex-1 flex-wrap">
                <div>
                  <p className="text-3xl font-black tabular-nums leading-none">{thisYear}</p>
                  <p className="text-xs text-muted-foreground mt-1">{currentYear}</p>
                </div>
                {lastYear > 0 && (
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-black px-2 py-1 rounded-full self-center border",
                    delta > 0 ? "text-green-400 bg-green-400/12 border-green-400/30 shadow-[0_0_8px_hsl(142_70%_45%/0.12)]" :
                    delta < 0 ? "text-red-400 bg-red-400/12 border-red-400/30 shadow-[0_0_8px_hsl(0_84%_60%/0.12)]" :
                    "text-muted-foreground bg-secondary border-border/50"
                  )}>
                    {delta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : delta < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : null}
                    {delta > 0 ? "+" : ""}{delta}
                    {pct !== null && ` (${pct > 0 ? "+" : ""}${pct}%)`}
                  </div>
                )}
                <div>
                  <p className="text-3xl font-black tabular-nums leading-none text-muted-foreground">{lastYear}</p>
                  <p className="text-xs text-muted-foreground mt-1">{currentYear - 1}</p>
                </div>
                {twoYearsAgo > 0 && (
                  <div>
                    <p className="text-xl font-black tabular-nums leading-none text-muted-foreground/50">{twoYearsAgo}</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">{currentYear - 2}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Studio health bars */}
      <SectionCard title="Salud del estudio">
        <div className="space-y-5">
          {/* Maquetas segmented pipeline */}
          {maq && maq.total > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileAudio className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-sm font-medium">Pipeline de maquetas</span>
                </div>
                <span className="text-xs text-muted-foreground">{maquetasPct}% listas</span>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden gap-px bg-secondary">
                {maq.byStatus.map((s) => {
                  const pct = Math.round((s.count / maq.total) * 100);
                  return pct > 0 ? (
                    <div
                      key={s.status}
                      className="h-full transition-all duration-700 first:rounded-l-full last:rounded-r-full"
                      style={{ width: `${pct}%`, background: s.color }}
                      title={`${s.label}: ${s.count}`}
                    />
                  ) : null;
                })}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {maq.byStatus.map((s) => (
                  <span key={s.status} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    {s.label}: {s.count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Collabs completion */}
          {col && col.total > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-yellow-400" />
                  <span className="text-sm font-medium">Colaboraciones completadas</span>
                </div>
                <span className="text-xs text-muted-foreground">{col.completed}/{col.total}</span>
              </div>
              <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${collabsPct}%`, background: "#facc15" }}
                />
              </div>
              {col.overdueCount > 0 && (
                <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {col.overdueCount} deadline vencido{col.overdueCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}

          {/* Projects published */}
          {proy && proy.total > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-sm font-medium">Proyectos publicados</span>
                </div>
                <span className="text-xs text-muted-foreground">{published}/{proy.total}</span>
              </div>
              <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${proyPct}%`, background: "#c084fc" }}
                />
              </div>
              {proy.overdue > 0 && (
                <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {proy.overdue} proyecto{proy.overdue !== 1 ? "s" : ""} con fecha vencida
                </p>
              )}
            </div>
          )}

          {/* Goals progress */}
          {goals && goals.total > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-sm font-medium">Progreso de metas</span>
                </div>
                <span className="text-xs text-muted-foreground">{goals.completed}/{goals.total} completadas</span>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden gap-px bg-secondary">
                {goals.byCategory.map(c => {
                  const pct = Math.round((c.count / goals.total) * 100);
                  return pct > 0 ? (
                    <div key={c.category} className="h-full transition-all duration-700 first:rounded-l-full last:rounded-r-full"
                      style={{ width: `${pct}%`, background: c.color }}
                      title={`${c.label}: ${c.count}`} />
                  ) : null;
                })}
              </div>
              {goals.avgProgress > 0 && (
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Progreso promedio activas: <span className="text-emerald-400 font-black">{goals.avgProgress}%</span>
                </p>
              )}
            </div>
          )}
        </div>
      </SectionCard>

      {/* Highlight cards */}
      {(bestYear || topGenre || topArtist) && (
        <div className={cn("grid gap-4", bestYear && topGenre && topArtist ? "md:grid-cols-3" : "md:grid-cols-2")}>
          {bestYear && (
            <div className="card-premium rounded-2xl p-5">
              <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-yellow-400" />
                Año más productivo
              </p>
              <p className="text-4xl font-bold tabular-nums">{bestYear.year}</p>
              <p className="text-sm text-muted-foreground mt-1.5">
                {bestYear.count} canción{bestYear.count !== 1 ? "es" : ""}
                {bestYear.avgDurationSeconds > 0 && ` · ~${formatDuration(bestYear.avgDurationSeconds)} prom.`}
              </p>
            </div>
          )}
          {topGenre && (
            <div className="card-premium rounded-2xl p-5">
              <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                <Music2 className="h-3.5 w-3.5 text-primary" />
                Género principal
              </p>
              <p className="text-3xl font-black truncate tracking-tight">{topGenre.genre}</p>
              <p className="text-sm text-muted-foreground mt-1.5">
                {topGenre.count} canción{topGenre.count !== 1 ? "es" : ""}
                {disco && disco.totalSongs > 0 ? ` · ${Math.round((topGenre.count / disco.totalSongs) * 100)}% del catálogo` : ""}
              </p>
            </div>
          )}
          {topArtist && (
            <div className="card-premium rounded-2xl p-5">
              <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                <Users2 className="h-3.5 w-3.5 text-blue-400" />
                Artista frecuente
              </p>
              <p className="text-3xl font-black truncate tracking-tight">{topArtist.artist}</p>
              <p className="text-sm text-muted-foreground mt-1.5">
                {topArtist.count} colaboración{topArtist.count !== 1 ? "es" : ""}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Platform coverage */}
      {disco?.platformCoverage && disco.platformCoverage.length > 0 && disco.totalSongs > 0 && (
        <SectionCard title="Cobertura de plataformas">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {disco.platformCoverage.map(({ platform, count, total, pct }) => (
              <div key={platform}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{platform}</span>
                  <span className="text-xs text-muted-foreground">{count}/{total} · {pct}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background:
                        platform === "Spotify"     ? "#1db954" :
                        platform === "YouTube"     ? "#ef4444" :
                        platform === "Apple Music" ? "#fa243c" : "#f97316",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Upcoming project deadlines */}
      {proy?.upcoming && proy.upcoming.length > 0 && (
        <SectionCard title="Próximas fechas objetivo (proyectos)">
          <div className="space-y-3">
            {proy.upcoming.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-1.5 self-stretch rounded-full flex-shrink-0" style={{ background: p.statusColor }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.statusLabel} · {new Date(p.target_date).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <TargetDateBadge daysLeft={p.daysLeft} />
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Achievements / Logros */}
      {(() => {
        const publishedCount = proy?.byStatus.find(s => s.status === "publicado")?.count ?? 0;
        const songs = disco?.totalSongs ?? 0;
        const platforms = disco?.platformCoverage.filter(p => p.count > 0).length ?? 0;
        type Achievement = { emoji: string; label: string; desc: string; earned: boolean; progress?: { current: number; target: number } };
        const achievements: Achievement[] = [
          {
            emoji: "🎵",
            label: "Primera canción",
            desc: "Registra tu primera canción",
            earned: songs >= 1,
            progress: songs < 1 ? { current: songs, target: 1 } : undefined,
          },
          {
            emoji: "📀",
            label: "Discografía activa",
            desc: "5 canciones en el catálogo",
            earned: songs >= 5,
            progress: songs < 5 ? { current: songs, target: 5 } : undefined,
          },
          {
            emoji: "🎶",
            label: "Catálogo consolidado",
            desc: "10 canciones publicadas",
            earned: songs >= 10,
            progress: songs < 10 ? { current: songs, target: 10 } : undefined,
          },
          {
            emoji: "🤝",
            label: "Colaborador",
            desc: "Primera colaboración creada",
            earned: (col?.total ?? 0) >= 1,
            progress: (col?.total ?? 0) < 1 ? { current: col?.total ?? 0, target: 1 } : undefined,
          },
          {
            emoji: "✅",
            label: "Listo para brillar",
            desc: "Collab completada exitosamente",
            earned: (col?.completed ?? 0) >= 1,
            progress: (col?.completed ?? 0) < 1 ? { current: col?.completed ?? 0, target: 1 } : undefined,
          },
          {
            emoji: "🎯",
            label: "Planificador",
            desc: "Proyecto con fecha objetivo",
            earned: (proy?.withTargetDate ?? 0) >= 1,
            progress: (proy?.withTargetDate ?? 0) < 1 ? { current: proy?.withTargetDate ?? 0, target: 1 } : undefined,
          },
          {
            emoji: "🚀",
            label: "Publicado",
            desc: "Proyecto en estado publicado",
            earned: publishedCount >= 1,
            progress: publishedCount < 1 ? { current: publishedCount, target: 1 } : undefined,
          },
          {
            emoji: "🌐",
            label: "Multi-plataforma",
            desc: "Canciones en 2+ plataformas",
            earned: platforms >= 2,
            progress: platforms < 2 ? { current: platforms, target: 2 } : undefined,
          },
        ];
        const earnedCount = achievements.filter(a => a.earned).length;
        return (
          <SectionCard title={`Logros · ${earnedCount}/${achievements.length}`}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {achievements.map((a) => (
                <div
                  key={a.label}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-2xl border text-center transition-all duration-300",
                    a.earned
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-secondary/40"
                  )}
                >
                  <span className={cn("text-2xl leading-none", !a.earned && "grayscale opacity-50")}>{a.emoji}</span>
                  <div className="w-full">
                    <p className={cn("text-xs font-black leading-tight", !a.earned && "text-muted-foreground")}>{a.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{a.desc}</p>
                  </div>
                  {a.earned ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                  ) : a.progress ? (
                    <div className="w-full space-y-1">
                      <div className="h-1 bg-secondary rounded-full overflow-hidden w-full">
                        <div
                          className="h-full rounded-full bg-primary/50 transition-all duration-700"
                          style={{ width: `${Math.round((a.progress.current / a.progress.target) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-muted-foreground tabular-nums">
                        {a.progress.current}/{a.progress.target}
                      </p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </SectionCard>
        );
      })()}
    </div>
  );
}

function ProyectosTab({ stats }: { stats: AllStats["projects"] }) {
  if (!stats || stats.total === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <div
          className="relative w-16 h-16 rounded-2xl flex items-center justify-center empty-state-icon mx-auto mb-3"
          style={{
            background: "linear-gradient(135deg, hsl(var(--section-hsl, 178 70% 45%) / 0.20), hsl(var(--section-hsl, 178 70% 45%) / 0.07))",
            border: "1px solid hsl(var(--section-hsl, 178 70% 45%) / 0.22)",
            boxShadow: "0 8px 32px hsl(0 0% 0% / 0.15)"
          }}
        >
          <FolderOpen className="h-8 w-8" style={{ color: "hsl(var(--section-hsl, 178 70% 45%))" }} />
        </div>
        <p className="text-sm">Todavía no hay proyectos registrados</p>
      </div>
    );
  }

  const published = stats.byStatus.find(s => s.status === "publicado")?.count ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FolderOpen} label="Total proyectos" value={String(stats.total)} color="text-purple-400" />
        <StatCard icon={CheckCircle2} label="Publicados" value={String(published)}
          sub={`${Math.round((published / stats.total) * 100)}% completados`} color="text-green-400" />
        <StatCard icon={CalendarClock} label="Con fecha objetivo" value={String(stats.withTargetDate)}
          sub={stats.overdue > 0 ? `${stats.overdue} vencido${stats.overdue !== 1 ? "s" : ""}` : "Al día"} color="text-orange-400" />
        <StatCard icon={BarChart2} label="En producción"
          value={String(stats.byStatus.filter(s => !["publicado", "idea"].includes(s.status)).reduce((a, b) => a + b.count, 0))}
          color="text-blue-400" />
      </div>

      {/* Upcoming target dates */}
      {stats.upcoming.length > 0 && (
        <SectionCard title="Fechas objetivo próximas">
          <div className="space-y-3">
            {stats.upcoming.map((p) => (
              <div key={p.id} className="flex items-center gap-3 group">
                <div
                  className="w-1 self-stretch rounded-full flex-shrink-0"
                  style={{ background: p.statusColor }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{p.statusLabel}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.target_date).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>
                <TargetDateBadge daysLeft={p.daysLeft} />
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* By type */}
        <SectionCard title="Proyectos por tipo">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.byType} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="proyectosTypeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c084fc" stopOpacity={1} />
                  <stop offset="100%" stopColor="#c084fc" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE}
                formatter={(v) => [v as number, "proyectos"]} />
              <Bar dataKey="count" fill="url(#proyectosTypeGrad)" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* By status */}
        <SectionCard title="Estado de los proyectos">
          <div className="space-y-3">
            {stats.byStatus.map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-sm flex-1">{label}</span>
                <span className="text-sm font-black tabular-nums">{count}</span>
                <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden flex-shrink-0">
                  <div className="h-full rounded-full" style={{ width: `${Math.round((count / stats.total) * 100)}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Monthly creation */}
        {stats.byMonth.length > 1 && (
          <SectionCard title="Creación mensual">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.byMonth} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="proyectosMonthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c084fc" stopOpacity={1} />
                    <stop offset="100%" stopColor="#c084fc" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [v as number, "proyectos"]} />
                <Bar dataKey="count" fill="url(#proyectosMonthGrad)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

// ── Redes Tab ─────────────────────────────────────────────────────────────────

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function RedesTab({ links, loading }: { links: SocialLinkWithLatestStat[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="card-premium rounded-2xl p-5 skeleton-shimmer">
              <div className="h-3 skeleton rounded w-20 mb-3" />
              <div className="h-7 skeleton rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <div
          className="relative w-16 h-16 rounded-2xl flex items-center justify-center empty-state-icon mx-auto mb-3"
          style={{
            background: "linear-gradient(135deg, hsl(var(--section-hsl, 178 70% 45%) / 0.20), hsl(var(--section-hsl, 178 70% 45%) / 0.07))",
            border: "1px solid hsl(var(--section-hsl, 178 70% 45%) / 0.22)",
            boxShadow: "0 8px 32px hsl(0 0% 0% / 0.15)"
          }}
        >
          <Share2 className="h-8 w-8" style={{ color: "hsl(var(--section-hsl, 178 70% 45%))" }} />
        </div>
        <p className="text-sm">No hay redes sociales configuradas</p>
        <a href="/redes" className="inline-flex items-center gap-1 mt-3 text-xs text-primary hover:underline transition-all active:scale-95">
          Configurar redes <ChevronRight className="h-3 w-3" />
        </a>
      </div>
    );
  }

  const totalFollowers = links.reduce((s, l) => s + (l.latest_stat?.followers ?? 0), 0);
  const totalPlays     = links.reduce((s, l) => s + (l.latest_stat?.monthly_plays ?? 0), 0);
  const prevFollowers  = links.reduce((s, l) => s + (l.previous_stat?.followers ?? 0), 0);
  const prevPlays      = links.reduce((s, l) => s + (l.previous_stat?.monthly_plays ?? 0), 0);

  const followerGrowthPct = prevFollowers > 0
    ? Math.round(((totalFollowers - prevFollowers) / prevFollowers) * 100) : null;
  const playsGrowthPct = prevPlays > 0
    ? Math.round(((totalPlays - prevPlays) / prevPlays) * 100) : null;

  const best = [...links].sort((a, b) =>
    (b.latest_stat?.followers ?? 0) - (a.latest_stat?.followers ?? 0)
  )[0];

  const followerBarData = links
    .filter(l => l.latest_stat?.followers != null)
    .map(l => ({
      platform: PLATFORM_META[l.platform]?.label ?? l.platform,
      seguidores: l.latest_stat!.followers!,
      chartColor: PLATFORM_META[l.platform]?.chartColor ?? "#888",
    }))
    .sort((a, b) => b.seguidores - a.seguidores);

  const playsBarData = links
    .filter(l => l.latest_stat?.monthly_plays != null)
    .map(l => ({
      platform: PLATFORM_META[l.platform]?.label ?? l.platform,
      reproducciones: l.latest_stat!.monthly_plays!,
      chartColor: PLATFORM_META[l.platform]?.chartColor ?? "#888",
    }))
    .sort((a, b) => b.reproducciones - a.reproducciones);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Seguidores totales" value={formatNumber(totalFollowers)}
          sub={followerGrowthPct !== null ? `${followerGrowthPct >= 0 ? "+" : ""}${followerGrowthPct}% vs anterior` : undefined}
          color="text-pink-400" />
        <StatCard icon={Play} label="Reproducciones/mes" value={formatNumber(totalPlays)}
          sub={playsGrowthPct !== null ? `${playsGrowthPct >= 0 ? "+" : ""}${playsGrowthPct}% vs anterior` : undefined}
          color="text-green-400" />
        <StatCard icon={Share2} label="Plataformas activas" value={String(links.length)} color="text-blue-400" />
        {best?.latest_stat?.followers != null && (
          <StatCard icon={Award} label="Mayor alcance"
            value={PLATFORM_META[best.platform]?.label ?? best.platform}
            sub={`${formatNumber(best.latest_stat.followers)} seguidores`}
            color="text-yellow-400" />
        )}
      </div>

      {links.some(l => l.previous_stat != null) && (
        <SectionCard title="Crecimiento vs registro anterior">
          <div className="space-y-4">
            {links
              .filter(l => l.latest_stat != null && l.previous_stat != null)
              .map(link => {
                const meta = PLATFORM_META[link.platform];
                const currF = link.latest_stat?.followers;
                const prevF = link.previous_stat?.followers;
                const diffF = currF != null && prevF != null ? currF - prevF : null;
                const pctF  = diffF != null && prevF != null && prevF > 0
                  ? Math.round((diffF / prevF) * 100) : null;
                return (
                  <div key={link.id} className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${meta?.color ?? "bg-muted-foreground"}`} />
                    <span className="text-sm w-24 flex-shrink-0">{meta?.label ?? link.platform}</span>
                    {link.username && <span className="text-xs text-muted-foreground">@{link.username}</span>}
                    <div className="flex-1 flex items-center gap-2 ml-auto justify-end">
                      <span className="text-sm font-medium tabular-nums">{formatNumber(currF)}</span>
                      {pctF !== null && (
                        <span className={cn("flex items-center gap-0.5 text-[11px] font-medium",
                          pctF > 0 ? "text-green-400" : pctF < 0 ? "text-red-400" : "text-muted-foreground")}>
                          {pctF > 0 ? <TrendingUp className="h-3 w-3" /> : pctF < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                          {pctF > 0 ? "+" : ""}{pctF}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </SectionCard>
      )}

      {followerBarData.length >= 2 && (
        <SectionCard title="Comparación de seguidores por plataforma">
          <ResponsiveContainer width="100%" height={Math.max(120, followerBarData.length * 44)}>
            <BarChart data={followerBarData} layout="vertical" margin={{ top: 0, right: 40, left: 8, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false} axisLine={false} tickFormatter={formatNumber} />
              <YAxis type="category" dataKey="platform"
                tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                tickLine={false} axisLine={false} width={80} />
              <Tooltip contentStyle={TOOLTIP_STYLE}
                formatter={(v: unknown) => [formatNumber(v as number), "Seguidores"]} />
              <Bar dataKey="seguidores" radius={[0, 4, 4, 0]} barSize={20}>
                {followerBarData.map((entry, i) => <Cell key={i} fill={entry.chartColor} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {playsBarData.length >= 2 && (
        <SectionCard title="Reproducciones mensuales por plataforma">
          <ResponsiveContainer width="100%" height={Math.max(120, playsBarData.length * 44)}>
            <BarChart data={playsBarData} layout="vertical" margin={{ top: 0, right: 40, left: 8, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false} axisLine={false} tickFormatter={formatNumber} />
              <YAxis type="category" dataKey="platform"
                tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                tickLine={false} axisLine={false} width={80} />
              <Tooltip contentStyle={TOOLTIP_STYLE}
                formatter={(v: unknown) => [formatNumber(v as number), "Reproducciones"]} />
              <Bar dataKey="reproducciones" radius={[0, 4, 4, 0]} barSize={20}>
                {playsBarData.map((entry, i) => <Cell key={i} fill={entry.chartColor} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      <SectionCard title="Detalle por plataforma">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {links.map(link => {
            const meta = PLATFORM_META[link.platform];
            const stat = link.latest_stat;
            const prev = link.previous_stat;
            return (
              <a key={link.id} href="/redes"
                className="flex items-start gap-3 p-4 rounded-2xl border border-border/60 bg-secondary/30 hover:bg-secondary/60 hover:-translate-y-0.5 hover:shadow-sm transition-all active:scale-[0.99]">
                <span className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${meta?.color ?? "bg-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-2">
                    <p className="text-sm font-black">{meta?.label ?? link.platform}</p>
                    {link.username && <span className="text-xs text-muted-foreground">@{link.username}</span>}
                  </div>
                  <div className="space-y-1">
                    {stat?.followers != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Seguidores</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold tabular-nums">{formatNumber(stat.followers)}</span>
                          {prev?.followers != null && prev.followers > 0 && (() => {
                            const diff = stat.followers! - prev.followers;
                            const pct = Math.round((diff / prev.followers) * 100);
                            if (pct === 0) return null;
                            return (
                              <span className={cn("text-[10px] font-medium", pct > 0 ? "text-green-400" : "text-red-400")}>
                                {pct > 0 ? "+" : ""}{pct}%
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                    {stat?.monthly_plays != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Reproduc./mes</span>
                        <span className="text-sm font-bold tabular-nums">{formatNumber(stat.monthly_plays)}</span>
                      </div>
                    )}
                    {!stat && <p className="text-xs text-muted-foreground/60 italic">Sin estadísticas</p>}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

// ── Metas Tab ─────────────────────────────────────────────────────────────────

function GoalMiniRing({ pct, color }: { pct: number; color: string }) {
  const size = 40;
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth={5} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
          style={{ transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-black tabular-nums" style={{ color }}>{pct}%</span>
      </div>
    </div>
  );
}

function MetasTab({ stats }: { stats: GoalsStats | null }) {
  if (!stats || stats.total === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <div
          className="relative w-16 h-16 rounded-2xl flex items-center justify-center empty-state-icon mx-auto mb-3"
          style={{
            background: "linear-gradient(135deg, hsl(var(--section-hsl, 178 70% 45%) / 0.20), hsl(var(--section-hsl, 178 70% 45%) / 0.07))",
            border: "1px solid hsl(var(--section-hsl, 178 70% 45%) / 0.22)",
            boxShadow: "0 8px 32px hsl(0 0% 0% / 0.15)"
          }}
        >
          <Target className="h-8 w-8" style={{ color: "hsl(var(--section-hsl, 178 70% 45%))" }} />
        </div>
        <p className="text-sm">Todavía no hay metas registradas</p>
        <a href="/metas" className="inline-flex items-center gap-1 mt-3 text-xs text-primary hover:underline transition-all active:scale-95">
          Crear primera meta <ChevronRight className="h-3 w-3" />
        </a>
      </div>
    );
  }

  const completionPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Target}       label="Total metas"     value={String(stats.total)}     color="text-emerald-400" />
        <StatCard icon={CheckCircle2} label="Completadas"     value={String(stats.completed)}
          sub={`${completionPct}% del total`} color="text-green-400" />
        <StatCard icon={TrendingUp}   label="En progreso"     value={String(stats.active)}    color="text-blue-400" />
        <StatCard icon={Zap}          label="Progreso prom."  value={`${stats.avgProgress}%`} color="text-yellow-400" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Completion radial */}
        <SectionCard title="Tasa de finalización">
          <div className="flex items-center gap-6">
            <div className="relative flex-shrink-0">
              <ResponsiveContainer width={120} height={120}>
                <RadialBarChart
                  cx="50%" cy="50%"
                  innerRadius={36} outerRadius={56}
                  startAngle={90} endAngle={-270}
                  data={[
                    { name: "Completadas", value: completionPct,       fill: "#4ade80" },
                    { name: "Pendientes",  value: 100 - completionPct, fill: "hsl(var(--secondary))" },
                  ]}
                  barSize={14}
                >
                  <RadialBar dataKey="value" cornerRadius={6} background={false} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black tabular-nums leading-none">{completionPct}%</span>
                <span className="text-[9px] text-muted-foreground">listas</span>
              </div>
            </div>
            <div className="space-y-2.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <span className="text-sm flex-1">Completadas</span>
                <span className="text-sm font-bold tabular-nums">{stats.completed}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                <span className="text-sm flex-1">En progreso</span>
                <span className="text-sm font-bold tabular-nums">{stats.active}</span>
              </div>
              {stats.avgProgress > 0 && (
                <div className="border-t border-border/60 pt-2">
                  <p className="text-[11px] text-muted-foreground">Progreso promedio activas</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700 bg-emerald-400"
                        style={{ width: `${stats.avgProgress}%` }} />
                    </div>
                    <span className="text-xs font-black text-emerald-400 tabular-nums">{stats.avgProgress}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* By category */}
        {stats.byCategory.length > 0 && (
          <SectionCard title="Metas por categoría">
            <div className="space-y-3">
              {stats.byCategory.map(({ label, count, completed, color }) => {
                const catPct = count > 0 ? Math.round((completed / count) * 100) : 0;
                return (
                  <div key={label} className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-sm flex-1 truncate">{label}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{completed}/{count}</span>
                    <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden flex-shrink-0">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${catPct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}

        {/* Category bar chart */}
        {stats.byCategory.length > 1 && (
          <SectionCard title="Distribución por categoría">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={stats.byCategory.map(c => ({ ...c, activas: c.count - c.completed }))}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={(v: unknown, name: unknown) => [v as number, name === "completed" ? "completadas" : "activas"]} />
                <Bar dataKey="activas"   stackId="a" radius={[0,0,0,0]}>
                  {stats.byCategory.map((c, i) => <Cell key={i} fill={`${c.color}88`} />)}
                </Bar>
                <Bar dataKey="completed" stackId="a" radius={[4,4,0,0]}>
                  {stats.byCategory.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-4">
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-emerald-400" /> completadas</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-emerald-400/40" /> activas</span>
            </p>
          </SectionCard>
        )}

        {/* Near deadline */}
        {stats.nearDeadline.length > 0 && (
          <SectionCard title="Próximas fechas límite (60 días)">
            <div className="space-y-3">
              {stats.nearDeadline.map((g) => (
                <a key={g.id} href="/metas"
                  className="flex items-center gap-3 -mx-1 px-1 py-1.5 rounded-xl hover:bg-secondary/60 transition-all group">
                  <GoalMiniRing pct={g.pct} color={g.categoryColor} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{g.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: `${g.categoryColor}22`, color: g.categoryColor }}>
                        {g.categoryLabel}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(g.target_date).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </div>
                  <TargetDateBadge daysLeft={g.daysLeft} />
                </a>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
