"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, Calendar, Users, Upload, X, ChevronRight, AlertTriangle, FolderOpen, RefreshCw, Target } from "lucide-react";
import { getNotifications, type AppNotification, type NotifType } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<
  NotifType,
  { icon: React.ElementType; color: string; dot: string; iconBg: string }
> = {
  event:            { icon: Calendar,      color: "text-green-400",  dot: "bg-green-400",  iconBg: "bg-green-400/15 border-green-400/30"   },
  collab_deadline:  { icon: Users,         color: "text-yellow-400", dot: "bg-yellow-400", iconBg: "bg-yellow-400/15 border-yellow-400/30" },
  draft_ready:      { icon: Upload,        color: "text-blue-400",   dot: "bg-blue-400",   iconBg: "bg-blue-400/15 border-blue-400/30"     },
  overdue:          { icon: AlertTriangle, color: "text-red-400",    dot: "bg-red-400",    iconBg: "bg-red-400/15 border-red-400/30"       },
  project_deadline: { icon: FolderOpen,    color: "text-purple-400", dot: "bg-purple-400", iconBg: "bg-purple-400/15 border-purple-400/30" },
  goal_deadline:    { icon: Target,        color: "text-pink-400",   dot: "bg-pink-400",   iconBg: "bg-pink-400/15 border-pink-400/30"     },
};

function daysAwayLabel(daysAway: number | undefined): { text: string; cls: string } | null {
  if (daysAway === undefined) return null;
  if (daysAway < 0) return { text: `Hace ${Math.abs(daysAway)}d`, cls: "bg-red-500/15 text-red-400" };
  if (daysAway === 0) return { text: "Hoy", cls: "bg-orange-500/15 text-orange-400" };
  if (daysAway === 1) return { text: "Mañana", cls: "bg-yellow-500/15 text-yellow-400" };
  if (daysAway <= 3) return { text: `En ${daysAway}d`, cls: "bg-yellow-500/10 text-yellow-500" };
  return { text: `En ${daysAway}d`, cls: "bg-secondary text-muted-foreground" };
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  async function fetchNotifs(quiet = false) {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    const { data } = await getNotifications();
    setNotifs(data);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { fetchNotifs(); }, []);

  // Auto-refresh every 60s while mounted
  useEffect(() => {
    const id = setInterval(() => fetchNotifs(true), 60_000);
    return () => clearInterval(id);
  }, []);

  // Close on click outside or Escape
  useEffect(() => {
    function onMouse(e: MouseEvent) {
      if (
        open &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (open && e.key === "Escape") { e.preventDefault(); setOpen(false); }
    }
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const count = notifs.length;
  const hasOverdue = notifs.some(n => n.type === "overdue");

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative p-2 rounded-xl transition-all active:scale-95",
          open
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
        aria-label="Notificaciones"
      >
        <Bell className={cn("h-4 w-4", hasOverdue && !open && "text-red-400")} />
        {!loading && count > 0 && (
          <span className={cn(
            "absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center tabular-nums leading-none badge-shimmer",
            hasOverdue
              ? "bg-red-500 text-white animate-pulse"
              : "bg-primary text-primary-foreground"
          )}>
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute bottom-full left-0 mb-2 w-80 card-premium rounded-2xl shadow-2xl shadow-black/30 overflow-hidden z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 text-primary/60 drop-shadow-[0_0_3px_currentColor]" />
              <span className="text-sm font-black">Notificaciones</span>
              {count > 0 && (
                <span className="text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchNotifs(true)}
                disabled={refreshing}
                title="Actualizar"
                className="p-0.5 rounded-xl hover:bg-secondary text-muted-foreground transition-all active:scale-95 disabled:opacity-40"
              >
                <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-0.5 rounded-xl hover:bg-secondary text-muted-foreground transition-all active:scale-95"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="space-y-3 p-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full skeleton flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 skeleton rounded w-3/4" />
                      <div className="h-2.5 skeleton rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : count === 0 ? (
              <div className="flex flex-col items-center py-10 text-muted-foreground">
                <Bell className="h-8 w-8 opacity-20 mb-2" />
                <p className="text-xs">Sin notificaciones pendientes</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {notifs.map((n) => {
                  const cfg = TYPE_CONFIG[n.type];
                  const Icon = cfg.icon;
                  return (
                    <Link
                      key={n.id}
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 transition-all active:scale-[0.99] group"
                    >
                      <div
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border group-hover:scale-110 transition-transform",
                          cfg.iconBg
                        )}
                      >
                        <Icon className={cn("h-3.5 w-3.5 drop-shadow-[0_0_4px_currentColor]", cfg.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate leading-snug">
                          {n.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {n.body}
                        </p>
                        {(() => {
                          const badge = daysAwayLabel(n.daysAway);
                          return badge ? (
                            <span className={cn("inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium", badge.cls)}>
                              {badge.text}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border/60 bg-secondary/20 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              Próximos 14 días
            </p>
            <Link
              href="/notificaciones"
              onClick={() => setOpen(false)}
              className="text-[11px] text-primary hover:underline transition-all active:scale-95 inline-flex"
            >
              Ver todas →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
