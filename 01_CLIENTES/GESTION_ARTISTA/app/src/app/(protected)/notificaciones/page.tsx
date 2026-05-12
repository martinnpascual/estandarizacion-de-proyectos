"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Bell, Calendar, Users, Upload, AlertTriangle,
  ChevronRight, RefreshCw, CheckCircle2, Clock, FolderOpen,
  Search, X, ArrowUpDown,
} from "lucide-react";
import {
  getNotifications,
  type AppNotification,
  type NotifType,
  type NotifUrgency,
} from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";

// ── Config ────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<NotifType, {
  icon: React.ElementType;
  color: string;
  bg: string;
  label: string;
}> = {
  event:            { icon: Calendar,      color: "text-green-400",  bg: "bg-green-400/10",  label: "Evento" },
  collab_deadline:  { icon: Users,         color: "text-yellow-400", bg: "bg-yellow-400/10", label: "Deadline" },
  draft_ready:      { icon: Upload,        color: "text-blue-400",   bg: "bg-blue-400/10",   label: "Lista" },
  overdue:          { icon: AlertTriangle, color: "text-red-400",    bg: "bg-red-400/10",    label: "Vencido" },
  project_deadline: { icon: FolderOpen,   color: "text-purple-400", bg: "bg-purple-400/10", label: "Proyecto" },
};

const URGENCY_CONFIG: Record<NotifUrgency, {
  label: string;
  border: string;
  badge: string;
}> = {
  overdue:  { label: "Vencido",        border: "border-red-500/30",    badge: "bg-red-500/15 text-red-400" },
  urgent:   { label: "Urgente",        border: "border-orange-500/30", badge: "bg-orange-500/15 text-orange-400" },
  soon:     { label: "Pronto",         border: "border-yellow-500/30", badge: "bg-yellow-500/15 text-yellow-500" },
  ready:    { label: "Lista",          border: "border-blue-500/30",   badge: "bg-blue-500/15 text-blue-400" },
  upcoming: { label: "Próximamente",   border: "border-border/60",     badge: "bg-secondary text-muted-foreground" },
};

type FilterTab = "todos" | NotifType;

const FILTER_TABS: { id: FilterTab; label: string; icon: React.ElementType }[] = [
  { id: "todos",            label: "Todos",     icon: Bell },
  { id: "overdue",          label: "Vencidos",  icon: AlertTriangle },
  { id: "event",            label: "Eventos",   icon: Calendar },
  { id: "collab_deadline",  label: "Deadlines", icon: Users },
  { id: "project_deadline", label: "Proyectos", icon: FolderOpen },
  { id: "draft_ready",      label: "Maquetas",  icon: Upload },
];

// ── Urgency groups for "Todos" view ──────────────────────────────────────────
const URGENCY_GROUPS: { key: NotifUrgency; label: string; icon: React.ElementType; iconColor: string }[] = [
  { key: "overdue",  label: "Vencidos",      icon: AlertTriangle, iconColor: "text-red-400" },
  { key: "urgent",   label: "Urgente",       icon: Clock,         iconColor: "text-orange-400" },
  { key: "soon",     label: "Esta semana",   icon: Clock,         iconColor: "text-yellow-400" },
  { key: "ready",    label: "Listas para publicar", icon: CheckCircle2, iconColor: "text-blue-400" },
  { key: "upcoming", label: "Próximamente",  icon: Calendar,      iconColor: "text-muted-foreground" },
];

// ── Notification card ─────────────────────────────────────────────────────────
function NotifCard({ notif }: { notif: AppNotification }) {
  const type = TYPE_CONFIG[notif.type];
  const urgency = URGENCY_CONFIG[notif.urgency];
  const Icon = type.icon;

  return (
    <Link
      href={notif.href}
      className={cn(
        "flex items-start gap-4 p-4 rounded-2xl border transition-all group active:scale-[0.99]",
        "bg-card hover:bg-secondary/40 hover:shadow-sm hover:-translate-y-0.5",
        urgency.border,
      )}
    >
      <div className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", type.bg)}>
        <Icon className={cn("h-4 w-4", type.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug">{notif.title}</p>
          <span className={cn("flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium", urgency.badge)}>
            {urgency.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{notif.body}</p>
        {notif.daysAway !== undefined && (
          <p className="text-[11px] text-muted-foreground/60 mt-1.5 flex items-center gap-1">
            <Clock className="h-3 w-3 flex-shrink-0" />
            {notif.daysAway < 0
              ? `Hace ${Math.abs(notif.daysAway)} día${Math.abs(notif.daysAway) === 1 ? "" : "s"}`
              : notif.daysAway === 0
              ? "Hoy"
              : notif.daysAway === 1
              ? "Mañana"
              : `En ${notif.daysAway} días`}
          </p>
        )}
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-2.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start gap-4 p-4 rounded-2xl border border-border/60 bg-card animate-pulse">
          <div className="w-9 h-9 rounded-full bg-secondary flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between gap-4">
              <div className="h-3.5 bg-secondary rounded w-2/3" />
              <div className="h-4 bg-secondary rounded w-16 flex-shrink-0" />
            </div>
            <div className="h-3 bg-secondary rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NotificacionesPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <NotificacionesContent />
    </Suspense>
  );
}

function NotificacionesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [urgencyFilter, setUrgencyFilter] = useState<NotifUrgency | "all">(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("notif-urgency") as NotifUrgency | "all") || "all"
      : "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("notif-sort") as "asc" | "desc") || "asc"
      : "asc"
  );
  const searchRef = useRef<HTMLInputElement>(null);

  const rawFilter = searchParams.get("filter") as FilterTab | null;
  const filter: FilterTab = rawFilter && FILTER_TABS.some(t => t.id === rawFilter) ? rawFilter : "todos";

  function setFilter(f: FilterTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (f === "todos") params.delete("filter");
    else params.set("filter", f);
    router.replace(`/notificaciones?${params.toString()}`, { scroll: false });
    setUrgencyFilter("all");
    setSearchQuery("");
    setSort("asc");
  }

  async function load(showRefreshing = false) {
    if (showRefreshing) setRefreshing(true);
    const { data } = await getNotifications(30); // 30-day window on this page
    setNotifs(data);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  // Persist filter state
  useEffect(() => { localStorage.setItem("notif-urgency", urgencyFilter); }, [urgencyFilter]);
  useEffect(() => { localStorage.setItem("notif-sort", sort); }, [sort]);

  // Keyboard shortcuts: R = refresh, / = focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        load(true);
      }
      if (e.key === "/" ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = notifs
    .filter(n => filter === "todos" || n.type === filter)
    .filter(n => urgencyFilter === "all" || n.urgency === urgencyFilter)
    .filter(n => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
    });

  // Sorted version (only for flat/type-filtered view)
  const sortedFiltered = filter !== "todos"
    ? [...filtered].sort((a, b) => {
        const diff = a.date.localeCompare(b.date);
        return sort === "asc" ? diff : -diff;
      })
    : filtered;

  // Count per tab
  const counts: Partial<Record<FilterTab, number>> = {
    todos: notifs.length,
    overdue: notifs.filter(n => n.type === "overdue").length,
    event: notifs.filter(n => n.type === "event").length,
    collab_deadline: notifs.filter(n => n.type === "collab_deadline").length,
    project_deadline: notifs.filter(n => n.type === "project_deadline").length,
    draft_ready: notifs.filter(n => n.type === "draft_ready").length,
  };

  // Group by urgency for "todos" view
  const grouped = URGENCY_GROUPS.map(g => ({
    ...g,
    items: filtered.filter(n => n.urgency === g.key),
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/8 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-violet-500/6 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-violet-600/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
              <Bell className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Notificaciones</h1>
              <p className="text-muted-foreground text-xs mt-0.5">
                Eventos, deadlines y maquetas listas — próximos 30 días
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground/60 hidden sm:flex items-center gap-2">
              <kbd className="text-[9px] bg-secondary border border-border/60 px-1 py-0.5 rounded font-mono">R</kbd>
              actualizar ·
              <kbd className="text-[9px] bg-secondary border border-border/60 px-1 py-0.5 rounded font-mono">/</kbd>
              buscar
            </p>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="p-2 rounded-xl border border-border/60 hover:bg-secondary/60 transition-all active:scale-95 text-muted-foreground hover:text-foreground"
              title="Actualizar (R)"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </button>
          </div>
        </div>
      </div>

      {/* Search bar */}
      {!loading && notifs.length > 2 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar… (/) por título o descripción"
            className="w-full pl-10 pr-10 py-2.5 bg-card border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all active:scale-95 p-0.5 rounded-xl hover:bg-secondary/80"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Urgency summary strip */}
      {!loading && notifs.length > 0 && (() => {
        const overdueCount  = notifs.filter(n => n.urgency === "overdue").length;
        const urgentCount   = notifs.filter(n => n.urgency === "urgent").length;
        const soonCount     = notifs.filter(n => n.urgency === "soon").length;
        const readyCount    = notifs.filter(n => n.urgency === "ready").length;
        const upcomingCount = notifs.filter(n => n.urgency === "upcoming").length;

        const items = [
          { label: "Vencidos",    count: overdueCount,  color: "bg-red-500/10 border-red-500/20 text-red-400",         dot: "bg-red-400",             urgencyKey: "overdue"  as NotifUrgency },
          { label: "Urgente",     count: urgentCount,   color: "bg-orange-500/10 border-orange-500/20 text-orange-400", dot: "bg-orange-400",          urgencyKey: "urgent"   as NotifUrgency },
          { label: "Esta semana", count: soonCount,     color: "bg-yellow-500/10 border-yellow-500/20 text-yellow-500", dot: "bg-yellow-400",          urgencyKey: "soon"     as NotifUrgency },
          { label: "Listas",      count: readyCount,    color: "bg-blue-500/10 border-blue-500/20 text-blue-400",       dot: "bg-blue-400",            urgencyKey: "ready"    as NotifUrgency },
          { label: "Próximas",    count: upcomingCount, color: "bg-secondary border-border text-muted-foreground",      dot: "bg-muted-foreground/50", urgencyKey: "upcoming" as NotifUrgency },
        ].filter(i => i.count > 0);

        return (
          <div className="flex flex-wrap gap-2">
            {items.map((item) => {
              const isActive = urgencyFilter === item.urgencyKey;
              return (
                <button
                  key={item.label}
                  onClick={() => setUrgencyFilter(isActive ? "all" : item.urgencyKey)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all active:scale-95",
                    item.color,
                    isActive ? "ring-2 ring-white/20 scale-105 font-semibold" : "hover:scale-105 hover:brightness-110"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full flex-shrink-0", item.dot)} />
                  <span className="tabular-nums font-bold">{item.count}</span>
                  <span className="text-xs font-normal opacity-80">{item.label}</span>
                  {isActive && <span className="text-[10px] opacity-70">✕</span>}
                </button>
              );
            })}
            {urgencyFilter !== "all" && (
              <button
                onClick={() => setUrgencyFilter("all")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/60 text-xs text-muted-foreground hover:text-foreground bg-secondary transition-all active:scale-95 font-medium"
              >
                Ver todos
              </button>
            )}
          </div>
        );
      })()}

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTER_TABS.map((tab) => {
          const Icon = tab.icon;
          const count = counts[tab.id] ?? 0;
          const active = filter === tab.id;
          if (!loading && tab.id !== "todos" && count === 0) return null;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all active:scale-95",
                active
                  ? "bg-secondary border border-border/80 text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-transparent"
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", active && tab.id === "overdue" ? "text-red-400" : active ? "text-primary" : "")} />
              {tab.label}
              {!loading && count > 0 && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full tabular-nums",
                  tab.id === "overdue"
                    ? "bg-red-500/15 text-red-400"
                    : "bg-primary/15 text-primary"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sort control — only in flat/type view with multiple items */}
      {!loading && filter !== "todos" && filtered.length > 1 && (
        <div className="flex items-center justify-end gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "asc" | "desc")}
            className="appearance-none text-xs bg-transparent text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
          >
            <option value="asc">Más cercano primero</option>
            <option value="desc">Más lejano primero</option>
          </select>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <Skeleton />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-muted-foreground">
          <CheckCircle2 className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-sm font-medium">
            {searchQuery.trim()
              ? `Sin resultados para "${searchQuery}"`
              : urgencyFilter !== "all"
              ? "Sin resultados para este filtro"
              : "Todo al día"}
          </p>
          <p className="text-xs mt-1">
            {searchQuery.trim()
              ? "Probá con otro término"
              : urgencyFilter !== "all"
              ? "Prueba quitando el filtro de urgencia"
              : filter === "todos"
              ? "No hay notificaciones pendientes en los próximos 30 días"
              : `No hay ${FILTER_TABS.find(t => t.id === filter)?.label.toLowerCase() ?? "items"} pendientes`}
          </p>
          {(urgencyFilter !== "all" || searchQuery.trim()) && (
            <button
              onClick={() => { setUrgencyFilter("all"); setSearchQuery(""); }}
              className="mt-3 text-sm text-primary hover:underline transition-all active:scale-95"
            >
              Quitar filtros
            </button>
          )}
        </div>
      ) : filter === "todos" ? (
        // Grouped view
        <div className="space-y-6">
          {grouped.map(({ key, label, icon: Icon, iconColor, items }) => (
            <div key={key}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className={cn("h-3.5 w-3.5", iconColor)} />
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {label}
                </h2>
                <span className="text-xs text-muted-foreground">({items.length})</span>
              </div>
              <div className="space-y-2">
                {items.map(n => <NotifCard key={n.id} notif={n} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Flat filtered view
        <div className="space-y-2">
          {sortedFiltered.map(n => <NotifCard key={n.id} notif={n} />)}
        </div>
      )}
    </div>
  );
}
