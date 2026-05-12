"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Disc3,
  FileAudio,
  Users,
  FolderOpen,
  Calendar,
  Share2,
  LayoutDashboard,
  UserCog,
  Menu,
  X,
  Search,
  UserCircle,
  BarChart2,
  Sun,
  Moon,
  Bell,
  Keyboard,
  DollarSign,
  Target,
  Receipt,
  ListMusic,
  Trash2,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useCommandMenu } from "@/components/search/CommandMenu";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useUser } from "@/hooks/useUser";
import { getNotifications } from "@/lib/actions/notifications";
import CommandPalette from "@/components/ui/CommandPalette";

// Tab bar items shown on mobile bottom nav (most important 5)
const mobileTabBar = [
  { name: "Inicio", href: "/dashboard", icon: LayoutDashboard },
  { name: "Disco", href: "/discografia", icon: Disc3 },
  { name: "Maquetas", href: "/maquetas", icon: FileAudio },
  { name: "Agenda", href: "/calendario", icon: Calendar },
  { name: "Más", href: null as string | null, icon: Menu }, // opens sidebar
] as const;

const navigationGroups = [
  {
    label: "Música",
    items: [
      { name: "Dashboard",   href: "/dashboard",   icon: LayoutDashboard },
      { name: "Discografía", href: "/discografia",  icon: Disc3 },
      { name: "Maquetas",    href: "/maquetas",     icon: FileAudio },
      { name: "Setlists",    href: "/setlists",     icon: ListMusic },
    ],
  },
  {
    label: "Gestión",
    items: [
      { name: "Featuring",   href: "/collabs",      icon: Users },
      { name: "Proyectos",   href: "/proyectos",    icon: FolderOpen },
      { name: "Calendario",  href: "/calendario",   icon: Calendar },
      { name: "Redes",       href: "/redes",        icon: Share2 },
      { name: "Ingresos",    href: "/ingresos",     icon: DollarSign },
      { name: "Gastos",      href: "/gastos",       icon: Receipt },
      { name: "Metas",       href: "/metas",        icon: Target },
    ],
  },
  {
    label: "Análisis",
    items: [
      { name: "Estadísticas",    href: "/estadisticas",   icon: BarChart2 },
      { name: "Analizar BPM",    href: "/analizar",       icon: Zap },
      { name: "Equipo",          href: "/equipo",         icon: UserCog },
      { name: "Notificaciones",  href: "/notificaciones", icon: Bell },
      { name: "Papelera",        href: "/papelera",       icon: Trash2 },
    ],
  },
];

// Flat list for mobile tab bar and other uses
const navigation = navigationGroups.flatMap(g => g.items);

const bottomNavigation = [
  { name: "Mi perfil", href: "/perfil", icon: UserCircle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { open: openSearch } = useCommandMenu();
  const { theme, toggle: toggleTheme } = useTheme();
  const { profile } = useUser();
  const [notifCount, setNotifCount] = useState(0);
  const [hasOverdue, setHasOverdue] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const displayName = profile?.full_name
    ? profile.full_name.split(" ")[0].toUpperCase()
    : "BERTIAKA";

  useEffect(() => {
    function refresh() {
      getNotifications().then(({ data }) => {
        setNotifCount(data.length);
        setHasOverdue(data.some(n => n.urgency === "overdue"));
      });
    }
    refresh();
    // Refresh every 5 minutes to keep the badge current
    const interval = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Escape closes mobile sidebar / shortcuts modal; ? opens shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (showShortcuts) { setShowShortcuts(false); return; }
        if (mobileOpen) setMobileOpen(false);
        return;
      }
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen, showShortcuts]);

  return (
    <>
      {/* Botón hamburguesa mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-xl bg-card hover:bg-secondary transition-all active:scale-95 border border-border/60 shadow-sm"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 flex flex-col transition-transform duration-200",
          "border-r border-border/60",
          "bg-card/95 backdrop-blur-xl",
          "md:translate-x-0 md:static md:z-auto",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* ── Header — branding con glow del artista ─────────────────────── */}
        <div className="relative flex items-center justify-between px-4 py-4 overflow-hidden">
          {/* Gradient ambient behind header */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-primary/4 to-transparent pointer-events-none" />

          <div className="relative flex items-center gap-3">
            {/* Avatar con glow ring */}
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center overflow-hidden shadow-lg shadow-primary/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/artist.jpg"
                  alt={displayName}
                  className="w-9 h-9 object-cover"
                  style={{ objectPosition: "50% 12%" }}
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    if (profile?.avatar_url && img.src !== profile.avatar_url) {
                      img.src = profile.avatar_url;
                    } else {
                      img.style.display = "none";
                    }
                  }}
                />
                <Disc3 className="h-4 w-4 text-primary-foreground absolute" style={{ zIndex: -1 }} />
              </div>
              {/* Status dot */}
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-card" />
            </div>

            <div>
              <h1 className="text-sm font-bold tracking-wide leading-none">{displayName}</h1>
              <p className="text-[10px] text-primary/60 uppercase tracking-widest mt-0.5 font-medium">
                Studio
              </p>
            </div>
          </div>

          <button
            onClick={() => setMobileOpen(false)}
            className="relative md:hidden p-1.5 rounded-xl hover:bg-secondary/80 text-muted-foreground transition-all active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Divider sutil */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mx-3" />

        {/* ── Navegación ─────────────────────────────────────────────────── */}
        <nav className="flex-1 p-2.5 overflow-y-auto space-y-4">
          {navigationGroups.map((group) => (
            <div key={group.label}>
              {/* Group label */}
              <p className="px-3 mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground/40 select-none">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname?.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150",
                        isActive
                          ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.6)]" />
                      )}
                      <item.icon className={cn("h-4 w-4 flex-shrink-0 transition-colors", isActive && "text-primary")} />
                      <span className="flex-1">{item.name}</span>
                      {item.href === "/notificaciones" && notifCount > 0 && (
                        <span className={cn(
                          "text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 tabular-nums",
                          hasOverdue
                            ? "bg-red-500 text-white animate-pulse"
                            : "bg-primary/90 text-primary-foreground"
                        )}>
                          {notifCount > 99 ? "99+" : notifCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Bottom nav ─────────────────────────────────────────────────── */}
        <div className="p-2.5 border-t border-border/60 space-y-0.5">
          {/* Búsqueda Cmd+K */}
          <button
            onClick={() => { setMobileOpen(false); openSearch(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-all"
          >
            <Search className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-left">Buscar</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 text-[9px] bg-secondary px-1.5 py-0.5 rounded border border-border/60 text-muted-foreground">
              ⌘K
            </kbd>
          </button>

          {bottomNavigation.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-primary" />
                )}
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.name}
              </Link>
            );
          })}

          {/* Divider */}
          <div className="h-px bg-border/60 my-1" />

          <div className="flex items-center justify-between px-1 py-1">
            <p className="text-[10px] text-muted-foreground/50 font-medium">
              Studio v1.0
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowShortcuts(true)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
                aria-label="Atajos de teclado"
                title="Atajos de teclado (?)"
              >
                <Keyboard className="h-4 w-4" />
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
                aria-label="Cambiar tema"
                title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
              <NotificationBell />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/90 backdrop-blur-xl border-t border-border/60 safe-area-bottom">
        <div className="flex items-center">
          {mobileTabBar.map((item) => {
            const isActive =
              item.href &&
              (pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href)));

            if (item.href === null) {
              return (
                <button
                  key="more"
                  onClick={() => setMobileOpen(true)}
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-muted-foreground hover:text-foreground transition-all active:scale-95"
                >
                  <div className="relative">
                    <Menu className="h-5 w-5" />
                    {notifCount > 0 && (
                      <span className={cn(
                        "absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full text-[8px] font-bold flex items-center justify-center tabular-nums leading-none",
                        hasOverdue ? "bg-red-500 text-white animate-pulse" : "bg-primary text-primary-foreground"
                      )}>
                        {notifCount > 9 ? "9+" : notifCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-semibold uppercase tracking-wide">Más</span>
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all active:scale-95 relative",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.7)]" />
                )}
                <item.icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]")} />
                <span className="text-[9px] font-semibold uppercase tracking-wide">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Command Palette global — Cmd+K */}
      <CommandPalette />

      {/* Keyboard shortcuts modal */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowShortcuts(false)}
        >
          <div className="relative w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            {/* Glow ring */}
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/20 via-transparent to-violet-500/10 pointer-events-none" />
            <div
              className="relative bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl max-h-[80vh] overflow-y-auto shadow-2xl shadow-black/40"
            >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur-xl rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <Keyboard className="h-4 w-4 text-primary" />
                </div>
                <h2 className="font-semibold text-sm">Atajos de teclado</h2>
              </div>
              <button onClick={() => setShowShortcuts(false)} className="p-1.5 rounded-xl hover:bg-muted/50 transition-all active:scale-95 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-5">
              <ShortcutGroup title="Global">
                <Shortcut keys={["⌘", "K"]} label="Abrir búsqueda rápida" />
                <Shortcut keys={["?"]} label="Mostrar/ocultar este panel" />
                <Shortcut keys={["Esc"]} label="Cerrar modal / desseleccionar" />
              </ShortcutGroup>

              <ShortcutGroup title="Discografía">
                <Shortcut keys={["N"]} label="Nueva canción" />
                <Shortcut keys={["/"]} label="Enfocar barra de búsqueda" />
                <Shortcut keys={["↑", "↓"]} label="Navegar entre canciones" />
                <Shortcut keys={["Enter"]} label="Reproducir / abrir canción" />
                <Shortcut keys={["V"]} label="Alternar vista lista / cuadrícula" />
                <Shortcut keys={["E"]} label="Exportar CSV" />
              </ShortcutGroup>

              <ShortcutGroup title="Timeline de lanzamientos">
                <Shortcut keys={["↑", "↓"]} label="Navegar entre canciones" />
                <Shortcut keys={["Enter"]} label="Reproducir canción seleccionada" />
                <Shortcut keys={["Esc"]} label="Volver a discografía" />
              </ShortcutGroup>

              <ShortcutGroup title="Maquetas">
                <Shortcut keys={["N"]} label="Nueva maqueta" />
                <Shortcut keys={["/"]} label="Enfocar búsqueda" />
                <Shortcut keys={["V"]} label="Alternar vista lista / tablero" />
                <Shortcut keys={["E"]} label="Exportar CSV" />
              </ShortcutGroup>

              <ShortcutGroup title="Proyectos">
                <Shortcut keys={["N"]} label="Nuevo proyecto" />
                <Shortcut keys={["/"]} label="Enfocar búsqueda" />
                <Shortcut keys={["V"]} label="Alternar vista lista / tablero" />
                <Shortcut keys={["E"]} label="Exportar CSV" />
              </ShortcutGroup>

              <ShortcutGroup title="Featuring / Collabs">
                <Shortcut keys={["N"]} label="Nueva colaboración" />
                <Shortcut keys={["/"]} label="Enfocar búsqueda" />
                <Shortcut keys={["V"]} label="Alternar vista lista / tablero" />
                <Shortcut keys={["E"]} label="Exportar CSV" />
              </ShortcutGroup>

              <ShortcutGroup title="Calendario">
                <Shortcut keys={["N"]} label="Nuevo evento" />
                <Shortcut keys={["←", "→"]} label="Mes anterior / siguiente" />
                <Shortcut keys={["T"]} label="Ir al mes actual" />
                <Shortcut keys={["C"]} label="Vista mensual" />
                <Shortcut keys={["A"]} label="Vista agenda" />
                <Shortcut keys={["Y"]} label="Vista anual" />
                <Shortcut keys={["E"]} label="Exportar eventos (.ics)" />
              </ShortcutGroup>

              <ShortcutGroup title="Estadísticas">
                <Shortcut keys={["1"]} label="Ir a Resumen" />
                <Shortcut keys={["2"]} label="Ir a Discografía" />
                <Shortcut keys={["3"]} label="Ir a Maquetas" />
                <Shortcut keys={["4"]} label="Ir a Featurings" />
                <Shortcut keys={["5"]} label="Ir a Proyectos" />
                <Shortcut keys={["6"]} label="Ir a Redes Sociales" />
              </ShortcutGroup>

              <ShortcutGroup title="Ingresos">
                <Shortcut keys={["N"]} label="Nuevo ingreso" />
                <Shortcut keys={["E"]} label="Exportar CSV" />
              </ShortcutGroup>

              <ShortcutGroup title="Gastos">
                <Shortcut keys={["N"]} label="Nuevo gasto" />
                <Shortcut keys={["E"]} label="Exportar CSV" />
              </ShortcutGroup>

              <ShortcutGroup title="Metas">
                <Shortcut keys={["N"]} label="Nueva meta" />
                <Shortcut keys={["E"]} label="Exportar CSV" />
              </ShortcutGroup>

              <ShortcutGroup title="Equipo">
                <Shortcut keys={["N"]} label="Invitar nuevo miembro" />
              </ShortcutGroup>

              <ShortcutGroup title="Setlists">
                <Shortcut keys={["N"]} label="Nueva setlist" />
                <Shortcut keys={["E"]} label="Exportar setlist a CSV" />
              </ShortcutGroup>

              <ShortcutGroup title="Redes Sociales">
                <Shortcut keys={["N"]} label="Agregar red social" />
                <Shortcut keys={["B"]} label="Registrar estadísticas de hoy" />
                <Shortcut keys={["E"]} label="Exportar CSV" />
              </ShortcutGroup>

              <ShortcutGroup title="Notificaciones">
                <Shortcut keys={["R"]} label="Actualizar notificaciones" />
                <Shortcut keys={["/"]} label="Enfocar búsqueda" />
              </ShortcutGroup>

              <ShortcutGroup title="Analizar BPM">
                <Shortcut keys={["L"]} label="Cargar canciones y maquetas" />
                <Shortcut keys={["A"]} label="Iniciar / continuar análisis" />
                <Shortcut keys={["S"]} label="Detener análisis en curso" />
                <Shortcut keys={["R"]} label="Recargar lista" />
              </ShortcutGroup>

              <ShortcutGroup title="Papelera">
                <Shortcut keys={["R"]} label="Actualizar papelera" />
              </ShortcutGroup>

              <ShortcutGroup title="Búsqueda global">
                <Shortcut keys={["↑", "↓"]} label="Navegar resultados" />
                <Shortcut keys={["Enter"]} label="Abrir resultado seleccionado" />
                <Shortcut keys={["Esc"]} label="Limpiar selección / desfocar" />
              </ShortcutGroup>

              <ShortcutGroup title="Panel de detalle (canción)">
                <Shortcut keys={["P"]} label="Reproducir / pausar" />
                <Shortcut keys={["E"]} label="Editar canción" />
                <Shortcut keys={["Esc"]} label="Cerrar panel" />
              </ShortcutGroup>

              <ShortcutGroup title="Audio / Reproductor">
                <Shortcut keys={["Space"]} label="Play / Pause" />
                <Shortcut keys={["M"]} label="Silenciar / activar" />
                <Shortcut keys={["Alt", "←"]} label="Pista anterior" />
                <Shortcut keys={["Alt", "→"]} label="Pista siguiente" />
                <Shortcut keys={["←", "→"]} label="Retroceder / adelantar 10s" />
                <Shortcut keys={["Alt", "Q"]} label="Abrir cola de reproducción" />
              </ShortcutGroup>
            </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ShortcutGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Shortcut({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1 flex-shrink-0">
        {keys.map((k, i) => (
          <kbd key={i} className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded bg-secondary border border-border/60 text-[11px] font-mono font-medium text-foreground">
            {k}
          </kbd>
        ))}
      </div>
    </div>
  );
}
