"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Disc3, FileAudio, Users, Calendar, TrendingUp, TrendingDown, Clock,
  CheckCircle, AlertCircle, FolderOpen, ChevronRight, Music,
  Zap, Rocket, Share2, FolderPlus, AlertTriangle, CalendarDays, Activity,
  Settings, Eye, EyeOff, ChevronUp, ChevronDown, X, RotateCcw,
  Target, Plus,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { NumberTicker } from "@/components/ui/MotionWrapper";
import {
  getDashboardStats, getLatestDrafts, getActiveCollabs,
  getSongsChartData, getRecentActivity, getActiveProjects,
  type DashboardStats, type SongsByYear, type SongsByGenre,
  type ActivityItem,
} from "@/lib/actions/dashboard";
import { getUpcomingEvents, getUpcomingReleases } from "@/lib/actions/calendar";
import { getGoals } from "@/lib/actions/goals";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarEventType, Draft, Collaboration, Project, ProjectStatus, Goal } from "@/types/database";

// ── tipos ──────────────────────────────────────────────────────────────
const EVENT_TYPE_DOTS: Record<CalendarEventType, string> = {
  lanzamiento: "bg-green-500",
  sesion_grabacion: "bg-blue-500",
  evento_musical: "bg-purple-500",
  reunion: "bg-yellow-500",
  otro: "bg-muted-foreground",
};

const DRAFT_STATUS_LABEL: Record<string, string> = {
  borrador: "Borrador",
  en_mezcla: "En mezcla",
  masterizada: "Masterizada",
  lista_para_publicar: "Lista para publicar",
};

const DRAFT_STATUS_COLOR: Record<string, string> = {
  borrador: "text-muted-foreground",
  en_mezcla: "text-blue-400",
  masterizada: "text-purple-400",
  lista_para_publicar: "text-green-400",
};

const COLLAB_STATUS_COLOR: Record<string, string> = {
  propuesta_enviada: "text-yellow-400",
  en_grabacion: "text-blue-400",
  recibido: "text-purple-400",
  mezclando: "text-orange-400",
  listo: "text-green-400",
};

const COLLAB_STATUS_LABEL: Record<string, string> = {
  propuesta_enviada: "Propuesta enviada",
  en_grabacion: "En grabación",
  recibido: "Recibido",
  mezclando: "Mezclando",
  listo: "Listo",
};

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
];
function getGenreColor(genre: string, i: number) {
  return GENRE_CHART_COLORS[genre] ?? GENRE_COLORS_FALLBACK[i % GENRE_COLORS_FALLBACK.length];
}

const TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border) / 0.6)",
  borderRadius: 16,
  fontSize: 11,
  boxShadow: "0 8px 32px hsl(0 0% 0% / 0.3)",
  padding: "8px 12px",
};

const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  idea:          "text-zinc-400",
  en_produccion: "text-blue-400",
  en_mezcla:     "text-purple-400",
  master:        "text-yellow-400",
  listo:         "text-orange-400",
  publicado:     "text-green-400",
};

const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  idea:          "Idea",
  en_produccion: "En producción",
  en_mezcla:     "En mezcla",
  master:        "Master",
  listo:         "Listo",
  publicado:     "Publicado",
};

const PROJECT_TYPE_LABEL: Record<string, string> = {
  album:   "Álbum",
  ep:      "EP",
  mixtape: "Mixtape",
  single:  "Single",
};

// ── Dashboard customization ────────────────────────────────────────────
const WIDGET_DEFS = [
  { id: "stats",    label: "Estadísticas rápidas",  icon: Activity,     description: "Contadores de canciones, maquetas, collabs y eventos" },
  { id: "agenda",   label: "Agenda semanal",         icon: CalendarDays, description: "Eventos y deadlines de los próximos 7 días" },
  { id: "releases", label: "Próximos lanzamientos",  icon: Rocket,       description: "Countdown de fechas de lanzamiento" },
  { id: "drafts",   label: "Últimas maquetas",       icon: Clock,        description: "Las maquetas más recientes" },
  { id: "events",   label: "Próximos eventos",       icon: Calendar,     description: "Eventos del calendario" },
  { id: "collabs",  label: "Featuring activos",      icon: Users,        description: "Collabs y featurrings en progreso" },
  { id: "projects", label: "Proyectos activos",      icon: FolderOpen,   description: "EPs, álbumes y mixtapes en progreso" },
  { id: "charts",   label: "Estadísticas",           icon: TrendingUp,   description: "Canciones por año y por género" },
  { id: "activity", label: "Actividad reciente",     icon: Zap,          description: "Historial de acciones recientes" },
  { id: "heatmap",  label: "Mapa de actividad",      icon: Activity,     description: "Heatmap de las últimas 16 semanas" },
  { id: "goals",    label: "Metas activas",          icon: Target,       description: "Tus metas artísticas con progreso" },
] as const;

type WidgetId = (typeof WIDGET_DEFS)[number]["id"];

const WIDGET_SIZES: Record<WidgetId, "full" | "half"> = {
  stats: "full", agenda: "full", releases: "full",
  drafts: "half", events: "half", collabs: "half", projects: "half", charts: "half",
  activity: "full", heatmap: "full", goals: "half",
};

const DEFAULT_WIDGET_ORDER: WidgetId[] = [
  "stats", "agenda", "releases", "drafts", "events", "collabs", "projects", "goals", "charts", "activity", "heatmap",
];

type DashboardConfig = { order: WidgetId[]; hidden: WidgetId[] };

const CONFIG_KEY = "dashboard_config_v1";

function loadDashConfig(): DashboardConfig {
  if (typeof window === "undefined") return { order: [...DEFAULT_WIDGET_ORDER], hidden: [] };
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { order: [...DEFAULT_WIDGET_ORDER], hidden: [] };
    const parsed = JSON.parse(raw) as { order: string[]; hidden: string[] };
    const knownIds = new Set<string>(DEFAULT_WIDGET_ORDER);
    const parsedOrder = (parsed.order ?? []).filter((id) => knownIds.has(id)) as WidgetId[];
    const missing = DEFAULT_WIDGET_ORDER.filter((id) => !parsedOrder.includes(id));
    return {
      order: [...parsedOrder, ...missing],
      hidden: ((parsed.hidden ?? []).filter((id) => knownIds.has(id))) as WidgetId[],
    };
  } catch {
    return { order: [...DEFAULT_WIDGET_ORDER], hidden: [] };
  }
}

// ── deadline urgency helper (dashboard use) ───────────────────────────
function deadlineChip(deadline: string | null): { label: string; cls: string; urgent: boolean } | null {
  if (!deadline) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  const d = new Date(deadline); d.setHours(0,0,0,0);
  const diff = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `Vencido`, cls: "text-red-400", urgent: true };
  if (diff === 0) return { label: "Hoy", cls: "text-red-400", urgent: true };
  if (diff === 1) return { label: "Mañana", cls: "text-orange-400", urgent: true };
  if (diff <= 7) return { label: `${diff}d`, cls: "text-yellow-400", urgent: false };
  return null; // don't clutter the widget with far-off deadlines
}

// ── componente principal ───────────────────────────────────────────────
export default function DashboardPage() {
  const { user, profile } = useUser();
  const searchParams = useSearchParams();
  const googleConnected = searchParams.get("google_connected") === "true";
  const googleError = searchParams.get("google_error");

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [collabs, setCollabs] = useState<Collaboration[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [byYear, setByYear] = useState<SongsByYear[]>([]);
  const [byGenre, setByGenre] = useState<SongsByGenre[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [releases, setReleases] = useState<CalendarEvent[]>([]);
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [googleLinked, setGoogleLinked] = useState<boolean | null>(null);
  const [activityFilter, setActivityFilter] = useState<ActivityItem["type"] | "all">(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("dashboard-activity-filter") as ActivityItem["type"] | "all") || "all"
      : "all"
  );
  const [dashConfig, setDashConfig] = useState<DashboardConfig>(() => loadDashConfig());
  const [editMode, setEditMode] = useState(false);

  useEffect(() => { localStorage.setItem("dashboard-activity-filter", activityFilter); }, [activityFilter]);

  const load = useCallback(async () => {
    try {
      const [statsRes, draftsRes, collabsRes, eventsRes, chartRes, activityRes, releasesRes, projectsRes, goalsRes] = await Promise.all([
        getDashboardStats(),
        getLatestDrafts(4),
        getActiveCollabs(4),
        getUpcomingEvents(5),
        getSongsChartData(),
        getRecentActivity(30),
        getUpcomingReleases(5),
        getActiveProjects(4),
        getGoals({ is_completed: false }),
      ]);
      setStats(statsRes.data);
      setDrafts(draftsRes.data ?? []);
      setCollabs(collabsRes.data ?? []);
      setEvents(eventsRes.data ?? []);
      setByYear(chartRes.byYear ?? []);
      setByGenre(chartRes.byGenre ?? []);
      setActivity(activityRes.data ?? []);
      setReleases(releasesRes.data ?? []);
      setActiveProjects(projectsRes.data ?? []);
      setActiveGoals(goalsRes.data ?? []);
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Verificar si Google está conectado consultando el perfil
    fetch("/api/drive/files?q=__check__")
      .then((r) => r.json())
      .then((j) => setGoogleLinked(!j.needs_auth))
      .catch(() => setGoogleLinked(false));
  }, [load]);

  // Keyboard: R = refresh dashboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "r" || e.key === "R") { e.preventDefault(); setLoading(true); load(); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [load]);

  // Use profile's full_name if available, fall back to email prefix
  const firstName = profile?.full_name
    ? profile.full_name.split(" ")[0].toUpperCase()
    : (user?.email?.split("@")[0] ?? "BERTIAKA").toUpperCase();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 18) return "Buenas tardes";
    return "Buenas noches";
  })();

  const todayLabel = new Date().toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long",
  });

  // ── Esta semana — computed from already-loaded state ─────────────────
  type WeekItem = {
    id: string; date: string; title: string; subtitle?: string;
    href: string; kind: "event" | "collab" | "project";
  };

  const todayMidnight = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();

  const thisWeekItems: WeekItem[] = (() => {
    if (loading) return [];
    const in7 = new Date(todayMidnight); in7.setDate(in7.getDate() + 7);
    const items: WeekItem[] = [];
    events.forEach(ev => {
      const raw = ev.start_date.split("T")[0];
      const d = new Date(raw + "T12:00:00"); d.setHours(0, 0, 0, 0);
      if (d >= todayMidnight && d <= in7)
        items.push({ id: ev.id, date: raw, title: ev.title, href: `/calendario?event=${ev.id}`, kind: "event" });
    });
    collabs.forEach(c => {
      if (!c.deadline) return;
      const d = new Date(c.deadline + "T00:00:00"); d.setHours(0, 0, 0, 0);
      if (d >= todayMidnight && d <= in7)
        items.push({ id: c.id, date: c.deadline, title: c.song_title, subtitle: `Deadline · ${c.artist_name}`, href: `/collabs?collab=${c.id}`, kind: "collab" });
    });
    activeProjects.forEach(p => {
      if (!p.target_date) return;
      const d = new Date(p.target_date + "T00:00:00"); d.setHours(0, 0, 0, 0);
      if (d >= todayMidnight && d <= in7)
        items.push({ id: p.id, date: p.target_date, title: p.name, subtitle: `Target · ${PROJECT_TYPE_LABEL[p.type] ?? p.type}`, href: `/proyectos?project=${p.id}`, kind: "project" });
    });
    return items.sort((a, b) => a.date.localeCompare(b.date));
  })();

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayMidnight);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    return {
      dateStr,
      label: d.toLocaleDateString("es-AR", { weekday: "short" }),
      dayNum: d.getDate(),
      isToday: i === 0,
      count: thisWeekItems.filter(item => item.date === dateStr).length,
    };
  });

  const groupedWeekItems = (() => {
    const groups: { date: string; label: string; diff: number; items: WeekItem[] }[] = [];
    thisWeekItems.forEach(item => {
      const d = new Date(item.date + "T12:00:00"); d.setHours(0, 0, 0, 0);
      const diff = Math.round((d.getTime() - todayMidnight.getTime()) / 86400000);
      const label = diff === 0 ? "Hoy" : diff === 1 ? "Mañana"
        : d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" });
      let group = groups.find(g => g.date === item.date);
      if (!group) { group = { date: item.date, label, diff, items: [] }; groups.push(group); }
      group.items.push(item);
    });
    return groups;
  })();

  // ── streak calculation (moved out of JSX) ─────────────────────────────────
  const streak = (() => {
    if (loading || !activity.length) return 0;
    const todayMs = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); })();
    let s = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(todayMs); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      if (activity.some(a => a.ts.startsWith(ds))) { s++; } else if (i > 0) break;
    }
    return s;
  })();

  const weekTotal = loading ? 0 : activity.filter(a => {
    const d = new Date(a.ts); d.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    return (today.getTime() - d.getTime()) < 7 * 86_400_000;
  }).length;

  // ── Dashboard config helpers ──────────────────────────────────────────────
  function saveDashConfig(cfg: DashboardConfig) {
    setDashConfig(cfg);
    if (typeof window !== "undefined") localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  }
  function toggleWidget(id: WidgetId) {
    const hidden = dashConfig.hidden.includes(id)
      ? dashConfig.hidden.filter((h) => h !== id)
      : [...dashConfig.hidden, id];
    saveDashConfig({ ...dashConfig, hidden });
  }
  function moveWidget(id: WidgetId, dir: -1 | 1) {
    const order = [...dashConfig.order];
    const idx = order.indexOf(id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= order.length) return;
    [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
    saveDashConfig({ ...dashConfig, order });
  }
  function resetDashConfig() {
    saveDashConfig({ order: [...DEFAULT_WIDGET_ORDER], hidden: [] });
  }

  // ── Contextual status phrase ──────────────────────────────────────────────
  const statusPhrase = (() => {
    if (loading) return null;
    const readyDrafts = drafts.filter(d => d.status === "lista_para_publicar").length;
    if (readyDrafts > 0)
      return { icon: "🚀", text: `${readyDrafts} maqueta${readyDrafts > 1 ? "s" : ""} lista${readyDrafts > 1 ? "s" : ""} para publicar` };
    const todayEvents = events.filter(e => e.start_date.startsWith(new Date().toISOString().split("T")[0])).length;
    if (todayEvents > 0)
      return { icon: "📅", text: `${todayEvents} evento${todayEvents > 1 ? "s" : ""} programado${todayEvents > 1 ? "s" : ""} hoy` };
    const weekDeadlines = collabs.filter(c => {
      if (!c.deadline) return false;
      const d = new Date(c.deadline + "T00:00:00"); d.setHours(0,0,0,0);
      const diff = (d.getTime() - todayMidnight.getTime()) / 86400000;
      return diff >= 0 && diff <= 7;
    }).length;
    if (weekDeadlines > 0)
      return { icon: "⚡", text: `${weekDeadlines} collab${weekDeadlines > 1 ? "s" : ""} con deadline esta semana` };
    if (stats && stats.totalSongs > 0)
      return { icon: "✨", text: `${stats.totalSongs} canciones en tu catálogo` };
    return { icon: "🎵", text: "Empezá a construir tu catálogo" };
  })();

  return (
    <div className="space-y-5">

      {/* ── HERO BANNER ─────────────────────────────────────────────────────── */}
      <div className="card-premium relative overflow-hidden rounded-2xl">
        {/* Ambient gradients — section-hsl reactive */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, hsl(var(--section-hsl, 248 78% 65%) / 0.14) 0%, transparent 60%)" }} />
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ background: "hsl(var(--section-hsl, 248 78% 65%) / 0.10)" }} />
        <div className="absolute -bottom-10 -left-10 w-56 h-56 bg-blue-500/8 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px pointer-events-none" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--section-hsl, 248 78% 65%) / 0.25), transparent)" }} />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6">
          {/* Left: avatar + name */}
          <div className="flex items-center gap-4">
            {/* Artist photo */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-lg scale-110" />
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-primary/35 shadow-[0_0_32px_hsl(var(--primary)/0.35)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/artist.jpg"
                  alt="BERTIAKA"
                  className="w-full h-full object-cover"
                  style={{ objectPosition: "50% 12%" }}
                />
              </div>
              {/* Online dot */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-card shadow-[0_0_6px_hsl(142_70%_45%/0.6)]" />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary/70 mb-1">{greeting}</p>
              <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-none gradient-text drop-shadow-[0_0_40px_hsl(var(--primary)/0.25)]">
                {firstName}
              </h1>
              <p className="text-muted-foreground/50 text-xs mt-2 mono-data">{todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)}</p>
              {statusPhrase && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border"
                  style={{
                    background: "hsl(var(--section-hsl, 248 78% 65%) / 0.10)",
                    borderColor: "hsl(var(--section-hsl, 248 78% 65%) / 0.22)",
                    color: "hsl(var(--section-hsl, 248 78% 65%) / 0.9)",
                  }}>
                  <span>{statusPhrase.icon}</span>
                  <span>{statusPhrase.text}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right side: streak + activity */}
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            {streak >= 2 && (
              <div className="flex flex-col items-center px-4 py-3 rounded-2xl bg-orange-500/12 border border-orange-500/25 shadow-[0_0_16px_hsl(30_80%_50%/0.1)]">
                <span className="text-xl">{streak >= 14 ? "🔥🔥" : streak >= 7 ? "🔥" : "⚡"}</span>
                <span className="text-sm font-black text-orange-400 tabular-nums mono-data">{streak}d</span>
                <span className="text-[10px] text-orange-400/60 uppercase tracking-wide mono-data">racha</span>
              </div>
            )}
            {weekTotal > 0 && (
              <div className="flex flex-col items-center px-4 py-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-[0_0_16px_hsl(var(--primary)/0.12)]">
                <Zap className="h-4 w-4 text-primary mb-0.5" />
                <span className="text-sm font-black text-primary tabular-nums mono-data">{weekTotal}</span>
                <span className="text-[10px] text-primary/50 uppercase tracking-wide mono-data">esta semana</span>
              </div>
            )}
            {!loading && stats && (
              <div className="card-premium flex flex-col items-center px-4 py-3 rounded-2xl">
                <Disc3 className="h-4 w-4 text-primary/60 mb-0.5" />
                <span className="text-sm font-black tabular-nums">{stats.totalSongs}</span>
                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">canciones</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts Google */}
      {googleConnected && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-2xl text-sm text-green-400">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          Google Drive y Calendar conectados correctamente.
        </div>
      )}
      {googleError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          Error al conectar con Google: {googleError}.
        </div>
      )}

      {/* Google connection banner */}
      {googleLinked === false && !googleConnected && !googleError && (
        <div className="card-premium flex items-center justify-between px-4 py-3 rounded-2xl">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-black">Conectar Google Drive & Calendar</p>
              <p className="text-xs text-muted-foreground">Para vincular archivos de audio y sincronizar eventos</p>
            </div>
          </div>
          <a href="/api/auth/google" className="px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-black hover:bg-primary/80 transition-all active:scale-95 flex-shrink-0">
            Conectar
          </a>
        </div>
      )}

      {/* Urgency alerts */}
      {!loading && (() => {
        const today = new Date(); today.setHours(0,0,0,0);
        const overdueCollabs = collabs.filter(c => {
          if (!c.deadline) return false;
          const d = new Date(c.deadline); d.setHours(0,0,0,0);
          return d < today;
        });
        const overdueProjects = activeProjects.filter(p => {
          if (!p.target_date) return false;
          const d = new Date(p.target_date + "T00:00:00");
          return d < today;
        });
        const total = overdueCollabs.length + overdueProjects.length;
        if (total === 0) return null;
        return (
          <a href="/notificaciones?filter=overdue" className="flex items-center justify-between px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-2xl hover:bg-red-500/15 hover:-translate-y-0.5 hover:shadow-sm transition-all active:scale-[0.99] group">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <p className="text-sm font-black text-red-400">
                {total} elemento{total !== 1 ? "s" : ""} vencido{total !== 1 ? "s" : ""} — atención requerida
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-red-400 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </a>
        );
      })()}

      {/* Maquetas listas alert */}
      {!loading && (stats?.readyToPublish ?? 0) > 0 && (
        <a href="/maquetas?status=lista_para_publicar" className="flex items-center justify-between px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-2xl hover:bg-green-500/15 hover:-translate-y-0.5 hover:shadow-sm transition-all active:scale-[0.99] group">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
            <p className="text-sm font-black text-green-400">
              {stats!.readyToPublish} maqueta{stats!.readyToPublish !== 1 ? "s" : ""} lista{stats!.readyToPublish !== 1 ? "s" : ""} para publicar
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-green-400 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </a>
      )}

      {/* Proyectos listos alert */}
      {!loading && (stats?.listoProjects ?? 0) > 0 && (
        <a href="/proyectos?status=listo" className="flex items-center justify-between px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-2xl hover:bg-purple-500/15 hover:-translate-y-0.5 hover:shadow-sm transition-all active:scale-[0.99] group">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-purple-400 flex-shrink-0" />
            <p className="text-sm font-black text-purple-400">
              {stats!.listoProjects} proyecto{stats!.listoProjects !== 1 ? "s" : ""} listo{stats!.listoProjects !== 1 ? "s" : ""} — pendiente{stats!.listoProjects !== 1 ? "s" : ""} de publicar
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-purple-400 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </a>
      )}

      {/* Collabs listos alert */}
      {!loading && (stats?.listoCollabs ?? 0) > 0 && (
        <a href="/collabs?status=listo" className="flex items-center justify-between px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl hover:bg-yellow-500/15 hover:-translate-y-0.5 hover:shadow-sm transition-all active:scale-[0.99] group">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-yellow-400 flex-shrink-0" />
            <p className="text-sm font-black text-yellow-400">
              {stats!.listoCollabs} collab{stats!.listoCollabs !== 1 ? "s" : ""} lista{stats!.listoCollabs !== 1 ? "s" : ""} — parte grabada recibida
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-yellow-400 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </a>
      )}

      {/* ── renderWidget helper ──────────────────────────────────────────── */}
      {/* Defined inline as IIFE so it has access to all state */}
      {(() => {
        const renderWidget = (id: WidgetId): React.ReactNode => {
          switch (id) {
            case "stats":
              return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {(() => {
                    const yearSpark = byYear.length >= 2
                      ? [...byYear].sort((a, b) => a.year - b.year).slice(-7).map(d => d.count)
                      : undefined;
                    return [
                      { icon: Disc3,      label: "Canciones",        value: loading ? "…" : String(stats?.totalSongs ?? 0),      iconBg: "bg-primary/15",     iconColor: "text-primary",      accent: "bg-primary",      href: "/discografia", sparkData: yearSpark },
                      { icon: FileAudio,  label: "Maquetas activas", value: loading ? "…" : String(stats?.activeDrafts ?? 0),    iconBg: "bg-blue-500/15",    iconColor: "text-blue-400",     accent: "bg-blue-500",     href: "/maquetas" },
                      { icon: Users,      label: "Collabs activas",  value: loading ? "…" : String(stats?.pendingCollabs ?? 0),  iconBg: "bg-yellow-500/15",  iconColor: "text-yellow-400",   accent: "bg-yellow-500",   href: "/collabs" },
                      { icon: Calendar,   label: "Eventos mes",      value: loading ? "…" : String(stats?.eventsThisMonth ?? 0), iconBg: "bg-green-500/15",   iconColor: "text-green-400",    accent: "bg-green-500",    href: "/calendario" },
                      { icon: FolderOpen, label: "Proyectos act.",   value: loading ? "…" : String(stats?.activeProjects ?? 0),  iconBg: "bg-purple-500/15",  iconColor: "text-purple-400",   accent: "bg-purple-500",   href: "/proyectos" },
                      { icon: Music,      label: "Listas publicar",  value: loading ? "…" : String(stats?.readyToPublish ?? 0),  iconBg: "bg-emerald-500/15", iconColor: "text-emerald-400",  accent: "bg-emerald-500",  href: "/maquetas" },
                    ].map((card, i) => (
                      <div key={i} className="stagger-item">
                        <StatCard {...card} />
                      </div>
                    ));
                  })()}
                </div>
              );

            case "agenda":
              return (
                <div className="card-premium rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.7)]" />
                      <h2 className="font-black text-sm gradient-text">Esta semana</h2>
                    </div>
                    <a href="/calendario" className="text-xs text-muted-foreground hover:text-primary transition-all active:scale-95 flex items-center gap-0.5 font-medium group">
                      Agenda completa <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-4">
                    {weekDays.map((day) => (
                      <div key={day.dateStr} className={cn(
                        "flex flex-col items-center gap-0.5 py-2 px-0.5 rounded-xl transition-all",
                        day.isToday ? "week-day-today" : "bg-secondary/50 hover:bg-secondary/80"
                      )}>
                        <span className={cn("text-[9px] uppercase tracking-wide font-black",
                          day.isToday ? "text-primary" : "text-muted-foreground/55")}>
                          {day.label}
                        </span>
                        <span className={cn(
                          "leading-tight",
                          day.isToday
                            ? "text-base font-black text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                            : day.count > 0 ? "text-sm font-bold text-foreground"
                            : "text-sm font-medium text-muted-foreground/35"
                        )}>
                          {day.dayNum}
                        </span>
                        <div className="h-2 flex items-center justify-center gap-0.5">
                          {day.count > 0 && Array.from({ length: Math.min(day.count, 3) }, (_, i) => (
                            <span key={i} className={cn("rounded-full transition-all",
                              day.isToday
                                ? "w-1.5 h-1.5 bg-primary shadow-[0_0_4px_hsl(var(--primary)/0.8)]"
                                : "w-1 h-1 bg-muted-foreground/40")} />
                          ))}
                          {day.count === 0 && <span className="w-1 h-1" />}
                        </div>
                      </div>
                    ))}
                  </div>
                  {loading ? (
                    <WidgetSkeleton />
                  ) : groupedWeekItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-3">
                      Sin eventos ni deadlines esta semana 🎵
                    </p>
                  ) : (
                    <div className="-mx-5">
                      {groupedWeekItems.map(group => (
                        <div key={group.date}>
                          <div className="px-5 pt-2.5 pb-1">
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-widest",
                              group.diff === 0 ? "text-primary" :
                              group.diff === 1 ? "text-orange-400" :
                              "text-muted-foreground/60"
                            )}>
                              {group.label}
                            </span>
                          </div>
                          {group.items.map(item => (
                            <a key={item.id} href={item.href}
                              className="row-interactive flex items-center gap-3 px-5 py-2 hover:bg-secondary/40 transition-all active:scale-[0.99] group">
                              {item.kind === "event" && <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-0.5" />}
                              {item.kind === "collab" && <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />}
                              {item.kind === "project" && <FolderOpen className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-black truncate group-hover:text-primary transition-colors">{item.title}</p>
                                {item.subtitle && <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>}
                              </div>
                            </a>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );

            case "releases":
              return (
                <Widget title="Próximos lanzamientos" icon={Rocket} href="/calendario" accentColor="bg-green-500">
                  {loading ? (
                    <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                      {[1, 2, 3].map((i) => <div key={i} className="flex-shrink-0 w-44 h-24 rounded-xl skeleton" />)}
                    </div>
                  ) : releases.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-5 text-center">
                      <p className="text-sm text-muted-foreground">Sin lanzamientos próximos</p>
                      <a href="/calendario?new=lanzamiento" className="flex items-center gap-1.5 text-xs font-medium text-primary/70 hover:text-primary transition-colors px-3 py-1.5 rounded-xl hover:bg-primary/8 active:scale-95">
                        <Plus className="h-3.5 w-3.5" />
                        Crear evento de lanzamiento
                      </a>
                    </div>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
                      {releases.map((r) => <ReleaseCard key={r.id} release={r} />)}
                    </div>
                  )}
                </Widget>
              );

            case "drafts":
              return (
                <Widget title="Últimas maquetas" icon={Clock} href="/maquetas" accentColor="bg-blue-500">
                  {loading ? <WidgetSkeleton /> : drafts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Sin maquetas aún</p>
                  ) : (
                    <div className="divide-y divide-border/50 -mx-5">
                      {drafts.map((d) => {
                        const statusColor = DRAFT_STATUS_COLOR[d.status];
                        const dotColor = {
                          borrador: "bg-zinc-500",
                          en_mezcla: "bg-blue-500",
                          masterizada: "bg-purple-500",
                          lista_para_publicar: "bg-green-500",
                        }[d.status] ?? "bg-muted-foreground";
                        return (
                          <a key={d.id} href={`/maquetas?draft=${d.id}`}
                            className="row-interactive flex items-center gap-3 py-2.5 px-5 hover:bg-secondary/40 transition-all active:scale-[0.99] group">
                            <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dotColor)} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black truncate group-hover:text-primary transition-colors">{d.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {d.producer && <p className="text-xs text-muted-foreground truncate">{d.producer}</p>}
                                {d.bpm && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-blue-400/60 mono-data flex-shrink-0">
                                    <Zap className="h-2.5 w-2.5" />{d.bpm}bpm
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className={cn("text-xs flex-shrink-0", statusColor)}>{DRAFT_STATUS_LABEL[d.status]}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </Widget>
              );

            case "events":
              return (
                <Widget title="Próximos eventos" icon={Calendar} href="/calendario" accentColor="bg-green-500">
                  {loading ? <WidgetSkeleton /> : events.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-5 text-center">
                      <p className="text-sm text-muted-foreground">Sin eventos próximos</p>
                      <a href="/calendario" className="flex items-center gap-1.5 text-xs font-medium text-primary/70 hover:text-primary transition-colors px-3 py-1.5 rounded-xl hover:bg-primary/8 active:scale-95">
                        <Plus className="h-3.5 w-3.5" />
                        Nuevo evento
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-1 -mx-5">
                      {events.map((ev) => (
                        <a key={ev.id} href={`/calendario?event=${ev.id}`}
                          className="row-interactive flex items-start gap-3 px-5 py-2.5 rounded-xl hover:bg-secondary/40 transition-all active:scale-[0.99] group">
                          <span className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", EVENT_TYPE_DOTS[ev.event_type])} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black truncate group-hover:text-primary transition-colors">{ev.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(ev.start_date.includes("T") ? ev.start_date : ev.start_date + "T12:00:00")
                                .toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </Widget>
              );

            case "collabs":
              return (
                <Widget title="Featuring activos" icon={Users} href="/collabs" accentColor="bg-yellow-500">
                  {loading ? <WidgetSkeleton /> : collabs.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-5 text-center">
                      <p className="text-sm text-muted-foreground">Sin collabs activas</p>
                      <a href="/collabs" className="flex items-center gap-1.5 text-xs font-medium text-primary/70 hover:text-primary transition-colors px-3 py-1.5 rounded-xl hover:bg-primary/8 active:scale-95">
                        <Plus className="h-3.5 w-3.5" />
                        Nueva colaboración
                      </a>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50 -mx-5">
                      {collabs.map((c) => {
                        const chip = deadlineChip(c.deadline);
                        const initials = c.artist_name.split(" ").slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? "").join("");
                        return (
                          <a key={c.id} href={`/collabs?collab=${c.id}`}
                            className="row-interactive flex items-center gap-3 py-2.5 px-5 hover:bg-secondary/40 transition-all active:scale-[0.99] group">
                            <div className="w-7 h-7 rounded-full bg-yellow-500/15 border border-yellow-500/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-bold text-yellow-400">{initials}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black truncate group-hover:text-primary transition-colors">{c.song_title}</p>
                              <p className="text-xs text-muted-foreground truncate">con {c.artist_name}</p>
                            </div>
                            {chip ? (
                              <span className={cn("flex items-center gap-0.5 text-xs font-medium flex-shrink-0", chip.cls)}>
                                {chip.urgent && <AlertTriangle className="h-3 w-3" />}
                                {chip.label}
                              </span>
                            ) : (
                              <span className={cn("text-xs flex-shrink-0", COLLAB_STATUS_COLOR[c.status])}>
                                {COLLAB_STATUS_LABEL[c.status]}
                              </span>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </Widget>
              );

            case "projects":
              return (
                <Widget title="Proyectos activos" icon={FolderOpen} href="/proyectos" accentColor="bg-purple-500">
                  {loading ? <WidgetSkeleton /> : activeProjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Sin proyectos activos</p>
                  ) : (
                    <div className="divide-y divide-border/50 -mx-5">
                      {activeProjects.map((p) => {
                        const targetDate = p.target_date
                          ? (() => {
                              const today = new Date(); today.setHours(0,0,0,0);
                              const d = new Date(p.target_date + "T00:00:00");
                              const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
                              if (diff < 0)   return { label: "Vencido", cls: "text-red-400" };
                              if (diff <= 30) return { label: `${diff}d`, cls: "text-yellow-400" };
                              return { label: d.toLocaleDateString("es-AR", { month: "short", year: "numeric" }), cls: "text-muted-foreground" };
                            })()
                          : null;
                        return (
                          <a key={p.id} href={`/proyectos?project=${p.id}`}
                            className="row-interactive flex items-center gap-3 py-2.5 px-5 hover:bg-secondary/40 transition-all active:scale-[0.99] group">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black truncate group-hover:text-primary transition-colors">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{PROJECT_TYPE_LABEL[p.type] ?? p.type}</p>
                            </div>
                            {targetDate && <span className={cn("text-xs flex-shrink-0", targetDate.cls)}>{targetDate.label}</span>}
                            <span className={cn("text-xs flex-shrink-0", PROJECT_STATUS_COLOR[p.status])}>{PROJECT_STATUS_LABEL[p.status]}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </Widget>
              );

            case "goals":
              return (
                <Widget title="Metas activas" icon={Target} href="/metas" accentColor="bg-primary">
                  {loading ? <WidgetSkeleton /> : activeGoals.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Sin metas activas</p>
                  ) : (
                    <div className="divide-y divide-border/50 -mx-5">
                      {activeGoals.slice(0, 4).map((goal) => {
                        const percent = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
                        const daysLeft = goal.target_date
                          ? Math.ceil((new Date(goal.target_date + "T00:00:00").getTime() - Date.now()) / 86400000)
                          : null;
                        return (
                          <a key={goal.id} href="/metas"
                            className="row-interactive flex flex-col gap-1.5 px-5 py-2.5 hover:bg-secondary/40 transition-all active:scale-[0.99] group">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-black truncate group-hover:text-primary transition-colors">{goal.title}</p>
                              {daysLeft !== null && (
                                <span className={cn(
                                  "text-[10px] font-medium flex-shrink-0 px-1.5 py-0.5 rounded-full",
                                  daysLeft < 0 ? "bg-red-500/15 text-red-400" :
                                  daysLeft <= 7 ? "bg-orange-500/15 text-orange-400" :
                                  "bg-secondary text-muted-foreground"
                                )}>
                                  {daysLeft < 0 ? "Vencida" : daysLeft === 0 ? "Hoy" : `${daysLeft}d`}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all duration-700",
                                    percent >= 100 ? "bg-green-400" :
                                    percent >= 70  ? "bg-primary" :
                                    percent >= 40  ? "bg-yellow-500" :
                                    "bg-primary/60"
                                  )}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right">{percent}%</span>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </Widget>
              );

            case "charts":
              return (
                <Widget title="Estadísticas" icon={TrendingUp} href="/estadisticas" accentColor="bg-primary">
                  {loading ? <WidgetSkeleton /> : byYear.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Sin canciones aún</p>
                  ) : (
                    <div className="space-y-4">
                      {byYear.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Canciones por año</p>
                          <ResponsiveContainer width="100%" height={80}>
                            <AreaChart data={byYear} margin={{ top: 4, right: 0, left: -25, bottom: 0 }}>
                              <defs>
                                <linearGradient id="songsByYearGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="hsl(var(--section-hsl, 262 80% 62%))" stopOpacity={0.45} />
                                  <stop offset="95%" stopColor="hsl(var(--section-hsl, 262 80% 62%))" stopOpacity={0.02} />
                                </linearGradient>
                                <linearGradient id="songsByYearStroke" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor="hsl(var(--section-hsl, 262 80% 62%)" stopOpacity={0.6} />
                                  <stop offset="100%" stopColor="hsl(var(--section-hsl, 262 80% 62%))" stopOpacity={1} />
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="year" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v as number, "canciones"]} />
                              <Area type="monotone" dataKey="count" stroke="url(#songsByYearStroke)" strokeWidth={2.5} fill="url(#songsByYearGrad)"
                                dot={{ fill: "hsl(var(--section-hsl, 262 80% 62%))", r: 3.5, strokeWidth: 0, filter: "drop-shadow(0 0 4px hsl(var(--section-hsl, 262 80% 62%) / 0.7))" }}
                                activeDot={{ r: 5.5, strokeWidth: 0, fill: "hsl(var(--section-hsl, 262 80% 62%))" }} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                      {byGenre.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Por género</p>
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <ResponsiveContainer width={80} height={80}>
                                <PieChart>
                                  <Pie data={byGenre.slice(0, 8)} dataKey="count" nameKey="genre" cx="50%" cy="50%" outerRadius={36} innerRadius={20} paddingAngle={2} strokeWidth={0}>
                                    {byGenre.slice(0, 8).map((entry, i) => (
                                      <Cell key={i} fill={getGenreColor(entry.genre, i)} />
                                    ))}
                          </Pie>
                          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: unknown, name: unknown) => [v as number, name as string]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      {byGenre.slice(0, 5).map((g, i) => (
                        <div key={g.genre} className="flex items-center gap-1.5 text-xs">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getGenreColor(g.genre, i) }} />
                          <span className="truncate text-muted-foreground">{g.genre}</span>
                          <span className="ml-auto font-medium tabular-nums">{g.count}</span>
                        </div>
                      ))}
                      {byGenre.length > 5 && (
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">+{byGenre.length - 5} más</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Widget>
              );

            case "activity":
              return (
                <Widget title="Actividad reciente" icon={Zap} href="/buscar" accentColor="bg-primary">
                  {loading ? <WidgetSkeleton /> : activity.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Sin actividad reciente</p>
                  ) : (
                    <>
                      <ActivitySparkline activity={activity} />
                      {(() => {
                        const now = new Date(); now.setHours(0,0,0,0);
                        const thisWeek = activity.filter(a => { const d = new Date(a.ts); d.setHours(0,0,0,0); return (now.getTime() - d.getTime()) < 7 * 86_400_000; }).length;
                        const lastWeek = activity.filter(a => { const d = new Date(a.ts); d.setHours(0,0,0,0); const diff = now.getTime() - d.getTime(); return diff >= 7 * 86_400_000 && diff < 14 * 86_400_000; }).length;
                        if (thisWeek === 0 && lastWeek === 0) return null;
                        const diff = thisWeek - lastWeek;
                        const pct = lastWeek > 0 ? Math.round((diff / lastWeek) * 100) : null;
                        return (
                          <div className="flex items-center gap-3 mt-3 mb-1">
                            <span className="text-xs text-muted-foreground">
                              Esta semana: <span className="font-black text-foreground">{thisWeek}</span> item{thisWeek !== 1 ? "s" : ""}
                            </span>
                            {lastWeek > 0 && (
                              <span className={cn("flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full",
                                diff > 0 ? "text-green-400 bg-green-400/10" : diff < 0 ? "text-red-400 bg-red-400/10" : "text-muted-foreground bg-secondary")}>
                                {diff > 0 ? <TrendingUp className="h-3 w-3" /> : diff < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                                {pct !== null ? `${diff > 0 ? "+" : ""}${pct}%` : "="}
                                <span className="opacity-60 ml-0.5">vs sem. anterior</span>
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      <div className="flex gap-1.5 mt-4 mb-1 overflow-x-auto pb-1">
                        {([
                          { key: "all", label: "Todos" },
                          { key: "song",    label: "Canciones" },
                          { key: "draft",   label: "Maquetas" },
                          { key: "collab",  label: "Featuring" },
                          { key: "project", label: "Proyectos" },
                        ] as { key: typeof activityFilter; label: string }[]).map(({ key, label }) => {
                          const count = key === "all" ? activity.length : activity.filter(a => a.type === key).length;
                          if (key !== "all" && count === 0) return null;
                          return (
                            <button key={key} onClick={() => setActivityFilter(key)}
                              className={cn("flex items-center gap-1 text-[11px] px-2 py-1 rounded-full whitespace-nowrap transition-all active:scale-95",
                                activityFilter === key ? "activity-pill-active text-primary" : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80")}>
                              {label}
                              {key !== "all" && <span className="tabular-nums opacity-70">{count}</span>}
                            </button>
                          );
                        })}
                      </div>
                      <div className="divide-y divide-border/50 -mx-5 list-enter">
                        {(activityFilter === "all" ? activity : activity.filter(a => a.type === activityFilter))
                          .slice(0, 10).map((item) => <ActivityRow key={item.id} item={item} />)}
                      </div>
                    </>
                  )}
                </Widget>
              );

            case "heatmap": {
              const today = new Date(); today.setHours(0, 0, 0, 0);
              const counts: Record<string, number> = {};
              activity.forEach((item) => {
                const d = new Date(item.ts); d.setHours(0, 0, 0, 0);
                const key = d.toISOString().split("T")[0];
                counts[key] = (counts[key] ?? 0) + 1;
              });
              const maxCount = Math.max(...Object.values(counts), 1);
              const days: { date: Date; count: number }[] = [];
              for (let i = 111; i >= 0; i--) {
                const d = new Date(today); d.setDate(d.getDate() - i);
                const key = d.toISOString().split("T")[0];
                days.push({ date: d, count: counts[key] ?? 0 });
              }
              const cols: typeof days[] = [];
              for (let c = 0; c < 16; c++) cols.push(days.slice(c * 7, c * 7 + 7));
              const totalActivity = Object.values(counts).reduce((a, b) => a + b, 0);
              return (
                <div className="card-premium rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Activity className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-black">Actividad</span>
                      <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full tabular-nums">{totalActivity} acciones</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/50">16 semanas</span>
                  </div>
                  <div className="flex gap-1 overflow-hidden">
                    {cols.map((col, ci) => (
                      <div key={ci} className="flex flex-col gap-1 flex-1">
                        {col.map((day, di) => {
                          const intensity = day.count === 0 ? 0 : Math.max(0.15, day.count / maxCount);
                          const isToday = day.date.toISOString().split("T")[0] === today.toISOString().split("T")[0];
                          return (
                            <div key={di} className="rounded-sm aspect-square transition-all hover:scale-110 cursor-default"
                              style={{
                                background: day.count === 0 ? "hsl(var(--secondary))" : `hsl(var(--primary) / ${intensity})`,
                                outline: isToday ? "1.5px solid hsl(var(--primary) / 0.6)" : undefined,
                                outlineOffset: "1px",
                              }}
                              title={`${day.date.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}: ${day.count} acción${day.count !== 1 ? "es" : ""}`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-2">
                    <span className="text-[9px] text-muted-foreground/40">Menos</span>
                    {[0, 0.2, 0.45, 0.7, 1].map((v, i) => (
                      <div key={i} className="w-2.5 h-2.5 rounded-sm"
                        style={{ background: v === 0 ? "hsl(var(--secondary))" : `hsl(var(--primary) / ${v})` }} />
                    ))}
                    <span className="text-[9px] text-muted-foreground/40">Más</span>
                  </div>
                </div>
              );
            }

            default:
              return null;
          }
        };

        // ── Quick actions (always visible) ──────────────────────────────────
        const quickActions = (
          <div className="hidden md:grid grid-cols-5 gap-2">
            {[
              { label: "Nueva canción",  icon: Disc3,      href: "/discografia?new=1", grad: "from-violet-600 to-purple-700",  shadow: "shadow-purple-900/40"  },
              { label: "Nueva maqueta",  icon: FileAudio,  href: "/maquetas?new=1",    grad: "from-blue-500 to-cyan-600",      shadow: "shadow-blue-900/40"    },
              { label: "Nuevo evento",   icon: Calendar,   href: "/calendario?new=1",  grad: "from-green-500 to-emerald-600",  shadow: "shadow-green-900/40"   },
              { label: "Nueva collab",   icon: Share2,     href: "/collabs?new=1",     grad: "from-amber-500 to-orange-600",   shadow: "shadow-orange-900/40"  },
              { label: "Nuevo proyecto", icon: FolderPlus, href: "/proyectos?new=1",   grad: "from-pink-500 to-rose-600",      shadow: "shadow-pink-900/40"    },
            ].map(({ label, icon: Icon, href, grad, shadow }) => (
              <a key={href} href={href} className="quick-action-card flex flex-col items-center gap-3 py-5 px-2 rounded-2xl group text-center">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br transition-all group-hover:scale-110",
                  "shadow-[0_4px_16px_hsl(0_0%_0%/0.4),0_1px_0_hsl(0_0%_100%/0.15)_inset]", grad, shadow)}>
                  <Icon className="h-[22px] w-[22px] text-white drop-shadow-md" />
                </div>
                <span className="text-xs font-black text-muted-foreground/80 group-hover:text-foreground transition-colors leading-tight">{label}</span>
              </a>
            ))}
          </div>
        );

        // ── Dynamic widget layout ────────────────────────────────────────────
        const visibleOrder = dashConfig.order.filter((id) => !dashConfig.hidden.includes(id));
        type WidgetGroup = { type: "full"; id: WidgetId } | { type: "pair"; ids: WidgetId[] };
        const groups: WidgetGroup[] = [];
        let halfBuf: WidgetId[] = [];
        for (const id of visibleOrder) {
          if (WIDGET_SIZES[id] === "full") {
            if (halfBuf.length > 0) { groups.push({ type: "pair", ids: [...halfBuf] }); halfBuf = []; }
            groups.push({ type: "full", id });
          } else {
            halfBuf.push(id);
            if (halfBuf.length === 2) { groups.push({ type: "pair", ids: [...halfBuf] }); halfBuf = []; }
          }
        }
        if (halfBuf.length > 0) groups.push({ type: "pair", ids: [...halfBuf] });

        // ── Customize panel ─────────────────────────────────────────────────
        const customizePanel = editMode && (
          <div className="fixed inset-0 z-50 flex" onClick={() => setEditMode(false)}>
            {/* Backdrop */}
            <div className="flex-1 bg-black/40 backdrop-blur-sm" />
            {/* Drawer */}
            <div
              className="w-80 bg-card border-l border-border/60 flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              style={{ animation: "drawer-slide-in 0.25s cubic-bezier(0.32,0.72,0,1)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border/50">
                <div>
                  <h2 className="font-black text-sm">Personalizar dashboard</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Elegí qué ver y en qué orden</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={resetDashConfig}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
                    title="Restablecer">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setEditMode(false)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {/* Widget list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {dashConfig.order.map((id, idx) => {
                  const def = WIDGET_DEFS.find((d) => d.id === id);
                  if (!def) return null;
                  const Icon = def.icon;
                  const isHidden = dashConfig.hidden.includes(id);
                  const isFirst = idx === 0;
                  const isLast = idx === dashConfig.order.length - 1;
                  return (
                    <div key={id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all",
                        isHidden
                          ? "border-border/30 bg-secondary/30 opacity-55"
                          : "border-border/50 bg-secondary/50"
                      )}>
                      {/* Icon */}
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        isHidden ? "bg-secondary" : "bg-primary/12")}>
                        <Icon className={cn("h-3.5 w-3.5", isHidden ? "text-muted-foreground" : "text-primary")} />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-black truncate", isHidden && "text-muted-foreground")}>{def.label}</p>
                        <p className="text-[10px] text-muted-foreground/60 truncate">{def.description}</p>
                      </div>
                      {/* Controls */}
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button onClick={() => moveWidget(id, -1)} disabled={isFirst}
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-90">
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => moveWidget(id, 1)} disabled={isLast}
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-90">
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => toggleWidget(id)}
                          className={cn("p-1 rounded transition-all active:scale-90",
                            isHidden
                              ? "text-muted-foreground hover:text-primary hover:bg-primary/10"
                              : "text-primary hover:text-muted-foreground hover:bg-secondary")}>
                          {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Footer */}
              <div className="p-4 border-t border-border/50">
                <button onClick={() => setEditMode(false)}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-black hover:bg-primary/80 transition-all active:scale-[0.98]">
                  Listo
                </button>
              </div>
            </div>
          </div>
        );

        return (
          <>
            {quickActions}
            {groups.map((group, gi) => {
              if (group.type === "full") {
                return <div key={`full-${group.id}-${gi}`}>{renderWidget(group.id)}</div>;
              }
              return (
                <div key={`pair-${group.ids.join("-")}-${gi}`} className="grid md:grid-cols-2 gap-6">
                  {group.ids.map((id) => <div key={id}>{renderWidget(id)}</div>)}
                </div>
              );
            })}

            {/* Floating customize button */}
            <button
              onClick={() => setEditMode(true)}
              className={cn(
                "fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black shadow-lg transition-all active:scale-95",
                "bg-card border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 hover:shadow-[0_0_20px_hsl(var(--primary)/0.2)]",
                editMode && "opacity-0 pointer-events-none"
              )}>
              <Settings className="h-3.5 w-3.5" />
              Personalizar
            </button>

            {customizePanel}
          </>
        );
      })()}
    </div>
  );
}

// ── sub-componentes ────────────────────────────────────────────────────
function SparklineBar({ data, accentClass }: { data: number[]; accentClass: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  return (
    <div className="sparkline-stat flex items-end gap-[2px]" aria-hidden="true">
      {data.map((v, i) => {
        const h = Math.max(2, Math.round((v / max) * 22));
        const isLast = i === data.length - 1;
        return (
          <div
            key={i}
            className={cn(
              "w-[4px] rounded-t-[2px] transition-all",
              isLast ? accentClass : "bg-current opacity-30"
            )}
            style={{ height: h }}
          />
        );
      })}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, iconBg, iconColor, accent, href, sparkData }: {
  icon: React.ElementType;
  label: string;
  value: string;
  iconBg: string;
  iconColor: string;
  accent: string;
  href?: string;
  sparkData?: number[];
}) {
  const numValue = parseInt(value, 10);
  const isNumeric = !isNaN(numValue) && value !== "…";

  const inner = (
    <div className="relative overflow-hidden group">
      {/* Accent line at top — thicker + glowing */}
      <div className={cn("absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl opacity-80", accent)} />
      <div className={cn("absolute top-0 left-0 right-0 h-8 opacity-15 blur-xl", accent)} />
      {/* Subtle bottom fade */}
      <div className={cn("absolute bottom-0 left-0 right-0 h-px opacity-30 rounded-full", accent)} />

      {/* Icon + label row */}
      <div className="flex items-center gap-2.5 mb-4 mt-1">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 stat-icon-wrap",
          "shadow-[inset_0_1px_0_hsl(0_0%_100%/0.10),0_2px_8px_hsl(0_0%_0%/0.2)]",
          iconBg
        )}>
          <Icon className={cn("h-[18px] w-[18px]", iconColor)} />
        </div>
        <span className="text-[11px] text-muted-foreground/70 font-black leading-tight uppercase tracking-wide">{label}</span>
      </div>

      {/* Value — grande, con gradient, NumberTicker anima desde 0 */}
      {isNumeric ? (
        <NumberTicker value={numValue} className="text-4xl font-black tracking-tight tabular-nums stat-value-gradient" />
      ) : (
        <p className="text-4xl font-black tracking-tight stat-value-gradient">{value}</p>
      )}

      {/* Mini sparkline — decorative, bottom-right */}
      {sparkData && sparkData.length >= 2 && (
        <SparklineBar data={sparkData} accentClass={iconColor} />
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href}
        className="card-premium rounded-2xl p-4 pb-5 block transition-all duration-200 group hover:-translate-y-1 active:scale-[0.98] overflow-hidden">
        {inner}
      </a>
    );
  }
  return (
    <div className="card-premium rounded-2xl p-4 pb-5 overflow-hidden">{inner}</div>
  );
}

// Map accentColor (bg-X) to an icon color (text-X) and bg-opacity class
const ACCENT_TO_ICON: Record<string, { icon: string; bg: string }> = {
  "bg-primary":       { icon: "text-primary",       bg: "bg-primary/12" },
  "bg-blue-500":      { icon: "text-blue-400",       bg: "bg-blue-500/12" },
  "bg-green-500":     { icon: "text-green-400",      bg: "bg-green-500/12" },
  "bg-yellow-500":    { icon: "text-yellow-400",     bg: "bg-yellow-500/12" },
  "bg-purple-500":    { icon: "text-purple-400",     bg: "bg-purple-500/12" },
  "bg-emerald-500":   { icon: "text-emerald-400",    bg: "bg-emerald-500/12" },
};

function Widget({ title, icon: Icon, href, accentColor = "bg-primary", children }: {
  title: string;
  icon: React.ElementType;
  href: string;
  accentColor?: string;
  children: React.ReactNode;
}) {
  const { icon: iconCls, bg: iconBg } = ACCENT_TO_ICON[accentColor] ?? { icon: "text-primary", bg: "bg-primary/12" };
  return (
    <div className="card-premium rounded-2xl overflow-hidden">
      {/* Top accent stripe — thicker with glow */}
      <div className={cn("h-[3px] w-full opacity-85", accentColor)} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {/* Icon with colored background */}
            <div className={cn("widget-icon-box shadow-[0_2px_6px_hsl(0_0%_0%/0.2)]", iconBg)}>
              <Icon className={cn("h-3.5 w-3.5", iconCls)} />
            </div>
            <h2 className="font-black text-sm tracking-tight">{title}</h2>
          </div>
          <a href={href}
            className="text-xs text-muted-foreground hover:text-primary transition-all active:scale-95 flex items-center gap-0.5 font-medium group">
            Ver todo <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
        {children}
      </div>
    </div>
  );
}

function WidgetSkeleton() {
  return (
    <div className="space-y-3 py-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-4 h-4 rounded skeleton flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 skeleton rounded w-3/4" />
            <div className="h-2 skeleton rounded w-1/2" />
          </div>
          <div className="h-3 skeleton rounded w-16" />
        </div>
      ))}
    </div>
  );
}

// ── Activity sparkline (7 days) ────────────────────────────────────────
function ActivitySparkline({ activity }: { activity: ActivityItem[] }) {
  const days = 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build array of last 7 days
  const buckets: { label: string; total: number; song: number; draft: number; collab: number; project: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets.push({
      label: d.toLocaleDateString("es-AR", { weekday: "short" }),
      total: 0, song: 0, draft: 0, collab: 0, project: 0,
    });
  }

  for (const item of activity) {
    const itemDate = new Date(item.ts);
    itemDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - itemDate.getTime()) / 86_400_000);
    if (diffDays >= 0 && diffDays < days) {
      const b = buckets[days - 1 - diffDays];
      b.total += 1;
      if (item.type === "song") b.song += 1;
      else if (item.type === "draft") b.draft += 1;
      else if (item.type === "collab") b.collab += 1;
      else if (item.type === "project") b.project += 1;
    }
  }

  const max = Math.max(...buckets.map(b => b.total), 1);
  const totalWeek = buckets.reduce((s, b) => s + b.total, 0);

  return (
    <div className="mb-2">
      <div className="flex items-end justify-between gap-1 h-12">
        {buckets.map((b, i) => {
          const heightPct = b.total > 0 ? Math.max(15, Math.round((b.total / max) * 100)) : 4;
          const isToday = i === days - 1;
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <div className="w-full flex flex-col justify-end" style={{ height: "100%" }}>
                <div
                  className={cn("w-full sparkline-bar transition-all duration-500",
                    isToday
                      ? "sparkline-bar-today"
                      : b.total > 0 ? "bg-primary/35" : "bg-secondary rounded-sm")}
                  style={{ height: `${heightPct}%` }}
                  title={`${b.label}: ${b.total} elemento${b.total !== 1 ? "s" : ""}`}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        {buckets.map((b, i) => (
          <span key={i} className={cn("text-[9px] text-center flex-1",
            i === days - 1 ? "text-primary font-semibold" : "text-muted-foreground/60")}>
            {b.label}
          </span>
        ))}
      </div>
      {totalWeek > 0 && (
        <p className="text-xs text-muted-foreground mt-1.5">
          <span className="font-medium text-foreground">{totalWeek}</span> elemento{totalWeek !== 1 ? "s" : ""} esta semana
          {buckets[days - 1].total > 0 && (
            <span className="ml-2 text-primary">· {buckets[days - 1].total} hoy</span>
          )}
        </p>
      )}
    </div>
  );
}

// ── Activity row ───────────────────────────────────────────────────────

const ACTIVITY_META: Record<ActivityItem["type"], { color: string; bg: string; icon: React.ElementType }> = {
  song:    { color: "text-primary",      bg: "bg-primary/10",    icon: Disc3 },
  draft:   { color: "text-blue-400",     bg: "bg-blue-400/10",   icon: FileAudio },
  collab:  { color: "text-yellow-400",   bg: "bg-yellow-400/10", icon: Users },
  project: { color: "text-purple-400",   bg: "bg-purple-400/10", icon: FolderOpen },
};


function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1)  return "Hace un momento";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)   return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7)     return `Hace ${days}d`;
  return new Date(isoDate).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

// ── Release countdown card ─────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function ReleaseCard({ release }: { release: CalendarEvent }) {
  const days = daysUntil(release.start_date);
  const isToday = days === 0;
  const isTomorrow = days === 1;

  const urgencyRing =
    days <= 3 ? "border-red-500/60 bg-red-500/5" :
    days <= 14 ? "border-yellow-500/60 bg-yellow-500/5" :
    "border-primary/40 bg-primary/5";

  const badgeColor =
    days <= 3 ? "bg-red-500 text-white" :
    days <= 14 ? "bg-yellow-500 text-black" :
    "bg-primary text-primary-foreground";

  const countdownLabel =
    isToday ? "¡Hoy!" :
    isTomorrow ? "Mañana" :
    `${days}d`;

  const formattedDate = new Date(
    release.start_date.includes("T") ? release.start_date : release.start_date + "T12:00:00"
  ).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });

  // SVG ring: 36px circle, stroke-dasharray trick for progress (0‒90 days max)
  const MAX_DAYS = 90;
  const clamped = Math.min(days, MAX_DAYS);
  const progress = isToday ? 1 : 1 - clamped / MAX_DAYS; // full ring = today
  const circumference = 2 * Math.PI * 14; // r=14
  const dash = circumference * progress;

  return (
    <a href={`/calendario?event=${release.id}`} className={cn(
      "flex-shrink-0 w-44 rounded-xl border p-3 flex flex-col gap-2 transition-all hover:scale-[1.02] active:scale-[0.97] cursor-pointer",
      urgencyRing
    )}>
      {/* Countdown ring + badge */}
      <div className="flex items-center gap-2">
        <div className="relative w-9 h-9 flex-shrink-0">
          <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
            {/* Track */}
            <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor"
              strokeWidth="3" className="text-secondary" />
            {/* Progress */}
            <circle cx="18" cy="18" r="14" fill="none"
              stroke={days <= 3 ? "#ef4444" : days <= 14 ? "#eab308" : "hsl(var(--primary))"}
              strokeWidth="3"
              strokeDasharray={`${dash} ${circumference}`}
              strokeLinecap="round"
            />
          </svg>
          <span className={cn(
            "absolute inset-0 flex items-center justify-center text-[9px] font-bold leading-none",
            days <= 3 ? "text-red-400" : days <= 14 ? "text-yellow-400" : "text-primary"
          )}>
            {isToday ? "★" : isTomorrow ? "1d" : days > 99 ? "99+" : `${days}d`}
          </span>
        </div>
        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none", badgeColor)}>
          {countdownLabel}
        </span>
      </div>

      {/* Title */}
      <p className="text-sm font-black leading-tight line-clamp-2">{release.title}</p>

      {/* Date */}
      <p className="text-[11px] text-muted-foreground mt-auto">{formattedDate}</p>
    </a>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const meta = ACTIVITY_META[item.type];
  const Icon = meta.icon;
  const isRecent = (Date.now() - new Date(item.ts).getTime()) < 7 * 86_400_000;
  const isNew = item.action === "created" && isRecent;
  return (
    <a
      href={item.href}
      className="row-interactive flex items-center gap-3 px-5 py-3 hover:bg-secondary/40 transition-all active:scale-[0.99] group"
    >
      <span className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border border-white/5 group-hover:scale-110 transition-transform",
        meta.bg, meta.color
      )}>
        <Icon className="h-3.5 w-3.5 drop-shadow-[0_0_3px_currentColor]" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-sm font-semibold truncate">{item.title}</p>
          {isNew && (
            <span className="tech-badge badge-new flex-shrink-0 border-green-500/30 text-green-400">
              NUEVO
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
      </div>
      <span className="text-[10px] mono-data text-muted-foreground/60 flex-shrink-0 whitespace-nowrap">
        {timeAgo(item.ts)}
      </span>
    </a>
  );
}
