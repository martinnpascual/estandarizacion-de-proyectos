"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Trash2,
  Pencil,
  Download,
  Upload,
  List,
  Music,
  FolderOpen,
  FileDown,
  LayoutGrid,
  Search,
  Copy,
  Check,
  Link2,
} from "lucide-react";
import {
  getCalendarEvents,
  getCalendarEventsForYear,
  getCalendarEventById,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/actions/calendar";
import { CalendarEventSchema, type CalendarEventFormData } from "@/lib/schemas";
import { getSongsByYear } from "@/lib/actions/songs";
import { getProjects } from "@/lib/actions/projects";
import { useAudioPlayerContext } from "@/components/audio/AudioPlayer";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import type { CalendarEvent, CalendarEventType, Song, Project } from "@/types/database";

const EVENT_TYPE_META: Record<
  CalendarEventType,
  { label: string; color: string; dot: string }
> = {
  lanzamiento: { label: "Lanzamiento", color: "bg-green-500/20 text-green-400 border-green-500/30", dot: "bg-green-500" },
  sesion_grabacion: { label: "Sesión de grabación", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", dot: "bg-blue-500" },
  evento_musical: { label: "Evento musical", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", dot: "bg-purple-500" },
  reunion: { label: "Reunión", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", dot: "bg-yellow-500" },
  otro: { label: "Otro", color: "bg-secondary text-muted-foreground border-border", dot: "bg-muted-foreground" },
};

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type EventFormErrors = Partial<Record<keyof CalendarEventFormData | "root", string>>;

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function buildGrid(year: number, month: number) {
  // month is 1-based
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDow = firstDay.getDay(); // 0=Sun
  const days: (Date | null)[] = [];

  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month - 1, d));
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export default function CalendarioPage() {
  const player = useAudioPlayerContext();
  const toast = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const searchParams = useSearchParams();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<CalendarEventFormData>({
    title: "",
    description: null,
    event_type: "sesion_grabacion",
    start_date: "",
    end_date: null,
    all_day: true,
    song_id: null,
    project_id: null,
  });
  const [formErrors, setFormErrors] = useState<EventFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<"push" | "pull" | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "agenda" | "year">(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("calendario-view-mode") as "calendar" | "agenda" | "year") || "calendar"
      : "calendar"
  );
  const [yearEvents, setYearEvents] = useState<CalendarEvent[]>([]);
  const [yearLoading, setYearLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<CalendarEventType | "all">(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("calendario-type-filter") as CalendarEventType | "all") || "all"
      : "all"
  );
  const [agendaSearch, setAgendaSearch] = useState("");
  const eventTitleRef = useRef<HTMLInputElement>(null);
  const deepLinkAppliedRef = useRef(false);
  // Holds a fetched event to select once we've navigated to its month
  const [deepLinkTarget, setDeepLinkTarget] = useState<CalendarEvent | null>(null);
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  // For song/project linking dropdowns in the event form + linked-entity display
  const [formSongs, setFormSongs] = useState<Song[]>([]);
  const [formProjects, setFormProjects] = useState<Project[]>([]);

  // Load songs + projects once on mount (for form dropdowns and linked-entity display)
  useEffect(() => {
    Promise.all([getSongsByYear(), getProjects()]).then(([songsRes, projectsRes]) => {
      setFormSongs(
        [...(songsRes.data ?? [])].sort((a, b) => a.title.localeCompare(b.title))
      );
      setFormProjects(
        [...(projectsRes.data ?? [])].sort((a, b) => a.name.localeCompare(b.name))
      );
    }).catch(() => { /* silently ignore load errors for dropdowns */ });
  }, []);

  // Auto-focus and Escape to close the event form modal / expanded event detail
  useEffect(() => {
    if (showForm) {
      setTimeout(() => eventTitleRef.current?.focus(), 50);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (showForm) { setShowForm(false); return; }
      if (selectedEvent) { setSelectedEvent(null); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showForm, selectedEvent]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getCalendarEvents(viewYear, viewMonth);
      setEvents(data ?? []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [viewYear, viewMonth]);

  useEffect(() => {
    load();
    // Auto-select today when viewing the current month
    if (viewYear === today.getFullYear() && viewMonth === today.getMonth() + 1) {
      setSelectedDate(todayStr);
    } else {
      setSelectedDate(null);
    }
    setSelectedEvent(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  function prevMonth() {
    if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1); }
    else setViewMonth((m) => m + 1);
  }

  // ?new=1 deep-link; ?event=<id> navigates to the event's month + selects it
  useEffect(() => {
    if (searchParams.get("new") === "1") openCreate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ?event=<id>: fetch the event by ID (works across months), then navigate + select
  const deepLinkEventId = searchParams.get("event");
  useEffect(() => {
    if (!deepLinkEventId || deepLinkAppliedRef.current) return;
    deepLinkAppliedRef.current = true;
    getCalendarEventById(deepLinkEventId).then(({ data: ev }) => {
      if (!ev) return;
      const evDate = new Date(ev.start_date.split("T")[0] + "T12:00:00");
      setViewMode("calendar");
      setViewYear(evDate.getFullYear());
      setViewMonth(evDate.getMonth() + 1);
      setDeepLinkTarget(ev);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkEventId]);

  // Phase 2: once we're on the right month, apply the selection
  // (fires after load completes, which resets selection — this effect overrides it)
  useEffect(() => {
    if (!deepLinkTarget) return;
    const evDate = new Date(deepLinkTarget.start_date.split("T")[0] + "T12:00:00");
    if (evDate.getFullYear() === viewYear && evDate.getMonth() + 1 === viewMonth) {
      setSelectedDate(deepLinkTarget.start_date.split("T")[0]);
      setSelectedEvent(deepLinkTarget);
      setDeepLinkTarget(null);
    }
  }, [deepLinkTarget, viewYear, viewMonth]);

  // Load year events when year-view is active
  useEffect(() => {
    if (viewMode !== "year") return;
    setYearLoading(true);
    getCalendarEventsForYear(viewYear).then(({ data }) => {
      setYearEvents(data ?? []);
      setYearLoading(false);
    });
  }, [viewMode, viewYear]);

  // Keyboard shortcuts: N = nuevo evento, ← → = prev/next month (only when no audio track loaded), E = export ICS
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if ((e.key === "n" || e.key === "N") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        openCreate();
      }
      if ((e.key === "e" || e.key === "E") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleExportICS();
      }
      // C/A/Y = switch views
      if ((e.key === "c" || e.key === "C") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setViewMode("calendar");
      }
      if ((e.key === "a" || e.key === "A") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setViewMode("agenda");
      }
      if ((e.key === "y" || e.key === "Y") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setViewMode("year");
      }
      // T = go to today's month
      if ((e.key === "t" || e.key === "T") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const now = new Date();
        setViewYear(now.getFullYear());
        setViewMonth(now.getMonth() + 1);
      }
      // Yield arrow keys to audio player when a track is loaded
      if (player.currentTrack) return;
      if (e.key === "ArrowLeft" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        prevMonth();
      }
      if (e.key === "ArrowRight" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        nextMonth();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear, viewMonth, player.currentTrack]);

  // Persist view mode and type filter to localStorage
  useEffect(() => { localStorage.setItem("calendario-view-mode", viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem("calendario-type-filter", typeFilter); }, [typeFilter]);

  function openCreate(date?: string) {
    setEditingEvent(null);
    setForm({
      title: "",
      description: null,
      event_type: "sesion_grabacion",
      start_date: date ?? toDateStr(today),
      end_date: null,
      all_day: true,
      song_id: null,
      project_id: null,
    });
    setFormErrors({});
    setShowForm(true);
  }

  function openEdit(event: CalendarEvent) {
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description,
      event_type: event.event_type,
      start_date: event.start_date.split("T")[0],
      end_date: event.end_date ? event.end_date.split("T")[0] : null,
      all_day: event.all_day,
      song_id: event.song_id,
      project_id: event.project_id,
    });
    setFormErrors({});
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = CalendarEventSchema.safeParse(form);
    if (!parsed.success) {
      const errs: EventFormErrors = {};
      parsed.error.errors.forEach((err) => {
        const k = err.path[0] as keyof CalendarEventFormData;
        if (!errs[k]) errs[k] = err.message;
      });
      setFormErrors(errs);
      return;
    }

    setSubmitting(true);
    if (editingEvent) {
      const result = await updateCalendarEvent(editingEvent.id, parsed.data);
      if (result.error) {
        setFormErrors({ root: result.error });
      } else {
        setEvents((prev) =>
          prev.map((ev) => (ev.id === editingEvent.id ? result.data! : ev))
        );
        if (selectedEvent?.id === editingEvent.id) setSelectedEvent(result.data);
        setShowForm(false);
        toast.success("Evento actualizado correctamente");
      }
    } else {
      const result = await createCalendarEvent(parsed.data);
      if (result.error || !result.data) {
        setFormErrors({ root: result.error ?? "Error desconocido" });
      } else {
        setEvents((prev) => [...prev, result.data!].sort((a, b) =>
          a.start_date.localeCompare(b.start_date)
        ));
        setShowForm(false);
        toast.success("Evento creado correctamente");
      }
    }
    setSubmitting(false);
  }

  async function handleDelete(event: CalendarEvent) {
    if (!await confirm({ title: `¿Eliminar "${event.title}"?`, message: "Esta acción no se puede deshacer.", confirmLabel: "Eliminar" })) return;
    setDeletingId(event.id);
    const { error } = await deleteCalendarEvent(event.id);
    if (error) toast.error(error);
    else {
      setEvents((prev) => prev.filter((ev) => ev.id !== event.id));
      if (selectedEvent?.id === event.id) setSelectedEvent(null);
      toast.success("Evento eliminado");
    }
    setDeletingId(null);
  }

  async function handlePushToGoogle() {
    setSyncing("push");
    setSyncMsg(null);
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      const json = await res.json();
      if (json.error && json.needs_auth) {
        window.location.href = "/api/auth/google";
        return;
      }
      setSyncMsg(
        json.error
          ? `Error: ${json.error}`
          : `✓ ${json.synced} evento${json.synced !== 1 ? "s" : ""} exportado${json.synced !== 1 ? "s" : ""} a Google Calendar`
      );
    } catch {
      setSyncMsg("Error de conexión");
    }
    setSyncing(null);
  }

  async function handlePullFromGoogle() {
    setSyncing("pull");
    setSyncMsg(null);
    try {
      const res = await fetch("/api/calendar/sync");
      const json = await res.json();
      if (json.error && json.needs_auth) {
        window.location.href = "/api/auth/google";
        return;
      }
      if (json.error) {
        setSyncMsg(`Error: ${json.error}`);
      } else {
        setSyncMsg(`✓ ${json.imported} evento${json.imported !== 1 ? "s" : ""} importado${json.imported !== 1 ? "s" : ""} desde Google Calendar`);
        await load();
      }
    } catch {
      setSyncMsg("Error de conexión");
    }
    setSyncing(null);
  }

  function handleExportICS() {
    if (events.length === 0) return;
    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//BERTIAKA Studio//Calendar//ES",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];
    events.forEach((ev) => {
      const startStr = ev.start_date.split("T")[0].replace(/-/g, "");
      const endRaw = ev.end_date ? ev.end_date.split("T")[0] : ev.start_date.split("T")[0];
      // iCal DTEND for all-day is exclusive (add 1 day)
      const endDate = new Date(endRaw + "T12:00:00");
      endDate.setDate(endDate.getDate() + 1);
      const endStr = endDate.toISOString().split("T")[0].replace(/-/g, "");
      const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${ev.id}@bertiaka.studio`);
      lines.push(`DTSTART;VALUE=DATE:${startStr}`);
      lines.push(`DTEND;VALUE=DATE:${endStr}`);
      lines.push(`SUMMARY:${esc(ev.title)}`);
      if (ev.description) lines.push(`DESCRIPTION:${esc(ev.description)}`);
      lines.push(`CATEGORIES:${esc(EVENT_TYPE_META[ev.event_type].label)}`);
      lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`);
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bertiaka-${MONTHS_ES[viewMonth - 1].toLowerCase()}-${viewYear}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleShareEvent(eventId: string) {
    const url = `${window.location.origin}/calendario?event=${eventId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedEventId(eventId);
      setTimeout(() => setCopiedEventId(null), 2000);
    });
  }

  const grid = buildGrid(viewYear, viewMonth);

  const todayStr = toDateStr(today);

  // Map date string → events (all, for dots in calendar cells)
  const eventsByDate: Record<string, CalendarEvent[]> = {};
  events.forEach((ev) => {
    const key = ev.start_date.split("T")[0];
    if (!eventsByDate[key]) eventsByDate[key] = [];
    eventsByDate[key].push(ev);
  });

  // Filtered events for agenda / selected-date panel
  const filteredEvents = typeFilter === "all" ? events : events.filter((ev) => ev.event_type === typeFilter);
  const filteredEventsByDate: Record<string, CalendarEvent[]> = {};
  filteredEvents.forEach((ev) => {
    const key = ev.start_date.split("T")[0];
    if (!filteredEventsByDate[key]) filteredEventsByDate[key] = [];
    filteredEventsByDate[key].push(ev);
  });

  const selectedDateEvents = selectedDate ? (filteredEventsByDate[selectedDate] ?? []) : [];

  // Upcoming events (next 3 from today, not past)
  const upcomingEvents = events
    .filter((ev) => ev.start_date.split("T")[0] >= todayStr)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 3);

  // Per-type counts for the month
  const typeCounts = events.reduce<Record<string, number>>((acc, ev) => {
    acc[ev.event_type] = (acc[ev.event_type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-premium relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/8 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-emerald-400/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/30 to-green-600/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
            <Calendar className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-tight gradient-text">Calendario</h1>
            <p className="text-muted-foreground text-xs mt-0.5">Lanzamientos, sesiones, eventos y reuniones</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle */}
          <div className="flex items-center gap-0.5 bg-secondary/60 rounded-xl p-0.5 border border-border/40">
            <button
              onClick={() => setViewMode("calendar")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95",
                viewMode === "calendar"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cuadrícula</span>
            </button>
            <button
              onClick={() => setViewMode("agenda")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95",
                viewMode === "agenda"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Agenda</span>
            </button>
            <button
              onClick={() => setViewMode("year")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95",
                viewMode === "year"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Año</span>
            </button>
          </div>

          {/* Ir a hoy — solo visible cuando no estamos en el mes actual */}
          {(viewYear !== today.getFullYear() || viewMonth !== today.getMonth() + 1) && (
            <button
              onClick={() => {
                setViewYear(today.getFullYear());
                setViewMonth(today.getMonth() + 1);
                setSelectedDate(todayStr);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-medium hover:bg-primary/15 transition-all active:scale-95"
            >
              Hoy
            </button>
          )}

          <button
            onClick={handlePullFromGoogle}
            disabled={syncing !== null}
            className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border/60 rounded-xl hover:bg-secondary/60 transition-all active:scale-95 text-sm text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            title="Importar desde Google Calendar"
          >
            {syncing === "pull" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Importar</span>
          </button>
          <button
            onClick={handlePushToGoogle}
            disabled={syncing !== null}
            className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border/60 rounded-xl hover:bg-secondary/60 transition-all active:scale-95 text-sm text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar a Google Calendar"
          >
            {syncing === "push" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Exportar</span>
          </button>
          {events.length > 0 && (
            <button
              onClick={handleExportICS}
              className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border/60 rounded-xl hover:bg-secondary/60 transition-all active:scale-95 text-sm text-muted-foreground"
              title={`Descargar ${MONTHS_ES[viewMonth - 1]} ${viewYear} como archivo ICS`}
            >
              <FileDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">.ics</span>
            </button>
          )}
          <button
            onClick={() => openCreate()}
            className="btn-shine flex items-center gap-2 px-4 py-2 bg-green-500/90 hover:bg-green-500 hover:scale-[1.02] text-white rounded-xl transition-all active:scale-95 text-sm font-black shadow-lg shadow-green-500/20 hover:shadow-green-500/35"
          >
            <Plus className="h-4 w-4" />
            Nuevo evento
            <kbd className="hidden md:inline-flex ml-1 text-[9px] bg-white/20 px-1 py-0.5 rounded font-mono">N</kbd>
          </button>
        </div>
        </div>
      </div>

      {/* Sync feedback */}
      {syncMsg && (
        <div className={cn(
          "flex items-center justify-between px-4 py-2.5 rounded-2xl text-sm border",
          syncMsg.startsWith("✓")
            ? "bg-green-500/10 border-green-500/20 text-green-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        )}>
          <span>{syncMsg}</span>
          <button onClick={() => setSyncMsg(null)} className="p-0.5 rounded-xl hover:opacity-70">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Filter legend — click to filter by event type (hidden in year view) */}
      {viewMode !== "year" && <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setTypeFilter("all")}
          className={cn(
            "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all active:scale-95",
            typeFilter === "all"
              ? "bg-primary/10 border-primary/30 text-primary font-black"
              : "border-border text-muted-foreground hover:text-foreground bg-secondary"
          )}
        >
          Todos
          {events.length > 0 && <span className="tabular-nums opacity-70">{events.length}</span>}
        </button>
        {(Object.entries(EVENT_TYPE_META) as [CalendarEventType, typeof EVENT_TYPE_META[CalendarEventType]][]).map(
          ([type, meta]) => {
            const count = typeCounts[type] ?? 0;
            const isActive = typeFilter === type;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(typeFilter === type ? "all" : type)}
                className={cn(
                  "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all active:scale-95",
                  isActive
                    ? cn(meta.color, "font-black shadow-[0_0_8px_hsl(0_0%_0%/0.12)]")
                    : "border-border text-muted-foreground hover:text-foreground bg-secondary hover:-translate-y-px"
                )}
              >
                <span className={cn(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  meta.dot,
                  isActive && "event-pill-dot"
                )} />
                {meta.label}
                {count > 0 && <span className="tabular-nums opacity-70">{count}</span>}
              </button>
            );
          }
        )}
        {/* Next event countdown chip */}
        {!loading && upcomingEvents.length > 0 && (() => {
          const next = upcomingEvents[0];
          const daysAway = Math.ceil(
            (new Date(next.start_date.split("T")[0] + "T00:00:00").getTime() - new Date(todayStr + "T00:00:00").getTime()) / 86400000
          );
          const dot = EVENT_TYPE_META[next.event_type]?.dot ?? "bg-muted-foreground";
          const label = daysAway === 0 ? "Hoy" : daysAway === 1 ? "Mañana" : `En ${daysAway}d`;
          return (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-border/50 bg-secondary/60 text-muted-foreground ml-auto">
              <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dot)} />
              <span className="truncate max-w-[120px]" title={next.title}>{next.title}</span>
              <span className={cn(
                "font-black flex-shrink-0",
                daysAway === 0 ? "text-green-400" :
                daysAway <= 3 ? "text-orange-400" :
                "text-foreground/60"
              )}>{label}</span>
            </span>
          );
        })()}
      </div>}

      {/* ── Year view ─────────────────────────────────────────────────── */}
      {viewMode === "year" && (
        <div className="space-y-4">
          {/* Year navigator */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setViewYear((y) => y - 1)}
              className="p-1.5 rounded-xl hover:bg-secondary transition-all active:scale-95"
              title="Año anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-black tabular-nums">{viewYear}</h2>
              {viewYear !== today.getFullYear() && (
                <button
                  onClick={() => setViewYear(today.getFullYear())}
                  className="text-xs font-black px-2.5 py-1 bg-primary/15 text-primary border border-primary/35 rounded-xl hover:bg-primary/22 transition-all active:scale-95 shadow-[0_0_8px_hsl(var(--primary)/0.12)]"
                >
                  Este año
                </button>
              )}
            </div>
            <button
              onClick={() => setViewYear((y) => y + 1)}
              className="p-1.5 rounded-xl hover:bg-secondary border border-border/50 hover:border-border transition-all active:scale-95"
              title="Año siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {yearLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="card-premium rounded-2xl p-3 skeleton-shimmer h-36" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 12 }, (_, monthIdx) => {
                const month = monthIdx + 1;
                const monthEvents = yearEvents.filter((ev) => {
                  const d = new Date(ev.start_date.split("T")[0] + "T12:00:00");
                  return d.getFullYear() === viewYear && d.getMonth() + 1 === month;
                });
                const daysInMonth = new Date(viewYear, month, 0).getDate();
                const firstDow = new Date(viewYear, month - 1, 1).getDay();
                const isCurrentMonth =
                  viewYear === today.getFullYear() && month === today.getMonth() + 1;
                const todayDay = today.getDate();

                // Group events by day number
                const eventsByDay: Record<number, CalendarEvent[]> = {};
                monthEvents.forEach((ev) => {
                  const d = new Date(ev.start_date.split("T")[0] + "T12:00:00").getDate();
                  if (!eventsByDay[d]) eventsByDay[d] = [];
                  eventsByDay[d].push(ev);
                });

                // Event type breakdown for this month
                const typeBreakdown = monthEvents.reduce<Record<string, number>>((acc, ev) => {
                  acc[ev.event_type] = (acc[ev.event_type] ?? 0) + 1;
                  return acc;
                }, {});

                return (
                  <button
                    key={month}
                    onClick={() => {
                      setViewYear(viewYear);
                      setViewMonth(month);
                      setViewMode("calendar");
                    }}
                    className={cn(
                      "card-premium rounded-2xl p-3 text-left hover:-translate-y-1 hover:shadow-[0_12px_32px_hsl(0_0%_0%/0.30)] transition-all group w-full",
                      isCurrentMonth ? "month-card-current" : ""
                    )}
                  >
                    {/* Month header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        "text-xs font-black",
                        isCurrentMonth ? "text-primary" : "text-foreground"
                      )}>
                        {MONTHS_ES[monthIdx]}
                      </span>
                      {monthEvents.length > 0 && (
                        <span className="text-[10px] rounded-full px-1.5 py-0.5 tabular-nums font-black text-primary bg-primary/15 border border-primary/25">
                          {monthEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Mini calendar grid */}
                    <div className="grid grid-cols-7 gap-px text-[9px]">
                      {["D","L","M","M","J","V","S"].map((d, i) => (
                        <div key={`hdr-${i}`} className="text-center text-muted-foreground/40 leading-tight pb-0.5">
                          {d}
                        </div>
                      ))}
                      {Array.from({ length: firstDow }, (_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const dayEvents = eventsByDay[day] ?? [];
                        const isToday = isCurrentMonth && day === todayDay;

                        return (
                          <div
                            key={day}
                            className={cn(
                              "relative flex flex-col items-center justify-center leading-none rounded aspect-square transition-all",
                              isToday
                                ? "cal-day-today cal-day-today-ring text-primary-foreground font-black"
                                : dayEvents.length > 0
                                ? "cal-day-event text-foreground font-medium"
                                : "text-muted-foreground/40"
                            )}
                          >
                            <span className="text-[9px] leading-none">{day}</span>
                            {dayEvents.length > 0 && !isToday && (
                              <div className="flex gap-px mt-px">
                                {dayEvents.slice(0, 3).map((ev, ei) => (
                                  <span
                                    key={ei}
                                    className={cn("w-0.5 h-0.5 rounded-full", EVENT_TYPE_META[ev.event_type].dot)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Type breakdown dots */}
                    {Object.keys(typeBreakdown).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/60">
                        {(Object.entries(typeBreakdown) as [CalendarEventType, number][]).map(([type, count]) => (
                          <span key={type} className="flex items-center gap-0.5 text-[9px] text-muted-foreground font-black">
                            <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 event-dot-glow", EVENT_TYPE_META[type].dot)} />
                            {count}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Calendar / Agenda view (hidden when in year view) */}
      {viewMode === "year" ? null : viewMode === "agenda" ? (
        /* ── Agenda view ─────────────────────────────────────────────── */
        <div className="card-premium rounded-2xl overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <button onClick={prevMonth} title="Mes anterior (←)" className="p-1.5 rounded-xl hover:bg-secondary transition-all active:scale-95">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black">
                {MONTHS_ES[viewMonth - 1]} {viewYear}
              </h2>
              {events.length > 0 && (
                <span className="text-[11px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full tabular-nums">
                  {events.length}
                </span>
              )}
            </div>
            <button onClick={nextMonth} title="Mes siguiente (→)" className="p-1.5 rounded-xl hover:bg-secondary transition-all active:scale-95">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Agenda search */}
          {!loading && events.length > 2 && (
            <div className="px-4 py-2 border-b border-border/60">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={agendaSearch}
                  onChange={(e) => setAgendaSearch(e.target.value)}
                  placeholder="Buscar evento…"
                  className="w-full pl-9 pr-8 py-2 bg-secondary border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {agendaSearch && (
                  <button
                    onClick={() => setAgendaSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-xl hover:bg-border text-muted-foreground transition-all active:scale-95"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (() => {
            // Apply agenda search on top of type filter
            const searchQ = agendaSearch.trim().toLowerCase();
            const agendaEventsByDate: Record<string, CalendarEvent[]> = {};
            Object.entries(filteredEventsByDate).forEach(([dateStr, dayEvents]) => {
              const matched = searchQ
                ? dayEvents.filter(
                    (ev) =>
                      ev.title.toLowerCase().includes(searchQ) ||
                      (ev.description ?? "").toLowerCase().includes(searchQ)
                  )
                : dayEvents;
              if (matched.length > 0) agendaEventsByDate[dateStr] = matched;
            });

            return Object.keys(agendaEventsByDate).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {searchQ
                    ? `Sin resultados para "${agendaSearch}"`
                    : typeFilter === "all"
                    ? "Sin eventos este mes"
                    : "No hay eventos de este tipo"}
                </p>
                {searchQ ? (
                  <button onClick={() => setAgendaSearch("")} className="mt-1 text-xs text-primary hover:underline">
                    Limpiar búsqueda
                  </button>
                ) : typeFilter === "all" ? (
                  <button onClick={() => openCreate()} className="mt-1 text-xs text-primary hover:underline">
                    Crear evento
                  </button>
                ) : (
                  <button onClick={() => setTypeFilter("all")} className="mt-1 text-xs text-primary hover:underline">
                    Ver todos los tipos
                  </button>
                )}
              </div>
            ) : (
              <div>
                {Object.keys(agendaEventsByDate).sort().map((dateStr) => {
                  const dayEvents = agendaEventsByDate[dateStr];
                const isToday = dateStr === todayStr;
                const isPast = dateStr < todayStr;
                const displayDate = new Date(dateStr + "T12:00:00");
                return (
                  <div
                    key={dateStr}
                    className={cn(
                      "px-4 py-4 border-b border-border/60 last:border-b-0",
                      isPast && "opacity-55"
                    )}
                  >
                    {/* Date header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-full flex flex-col items-center justify-center flex-shrink-0 text-center",
                          isToday
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground"
                        )}
                      >
                        <span className={cn("text-sm font-bold leading-none", isToday ? "text-primary-foreground" : "")}>
                          {displayDate.getDate()}
                        </span>
                        <span className={cn("text-[9px] uppercase leading-none mt-0.5", isToday ? "text-primary-foreground/80" : "text-muted-foreground/70")}>
                          {displayDate.toLocaleDateString("es-AR", { weekday: "short" })}
                        </span>
                      </div>
                      <div>
                        <p className={cn("text-xs font-black capitalize", isToday ? "text-primary" : "text-foreground")}>
                          {isToday ? "Hoy" : displayDate.toLocaleDateString("es-AR", { weekday: "long" })}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {displayDate.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                      <button
                        onClick={() => openCreate(dateStr)}
                        className="ml-auto p-1 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-all active:scale-95"
                        title="Agregar evento"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Events */}
                    <div className="ml-12 space-y-1.5">
                      {dayEvents.map((ev) => {
                        const meta = EVENT_TYPE_META[ev.event_type];
                        return (
                          <div
                            key={ev.id}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2 rounded-2xl border text-xs group agenda-event-row transition-all cursor-default",
                              meta.color
                            )}
                          >
                            <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-[0_0_6px_currentColor]", meta.dot)} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{ev.title}</p>
                              {ev.description && (
                                <p className="text-[11px] opacity-70 truncate mt-0.5">{ev.description}</p>
                              )}
                            </div>
                            <span className="text-[10px] opacity-60 flex-shrink-0 hidden sm:block">{meta.label}</span>
                            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleShareEvent(ev.id); }}
                                className="p-0.5 rounded-xl hover:bg-black/10 transition-all active:scale-95"
                                title="Copiar enlace"
                              >
                                {copiedEventId === ev.id
                                  ? <Check className="h-3 w-3" />
                                  : <Copy className="h-3 w-3" />
                                }
                              </button>
                              <button
                                onClick={() => openEdit(ev)}
                                className="p-0.5 rounded-xl hover:bg-black/10 transition-all active:scale-95"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDelete(ev)}
                                disabled={deletingId === ev.id}
                                className="p-0.5 rounded-xl hover:bg-black/10 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {deletingId === ev.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <Trash2 className="h-3 w-3" />
                                }
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
                })}
              </div>
            );
          })()}
        </div>
      ) : (
        /* ── Calendar grid ───────────────────────────────────────────── */
        <div className="card-premium rounded-2xl overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <button onClick={prevMonth} title="Mes anterior (←)" className="p-1.5 rounded-xl hover:bg-secondary transition-all active:scale-95">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black">
                {MONTHS_ES[viewMonth - 1]} {viewYear}
              </h2>
              {events.length > 0 && (
                <span className="text-[11px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full tabular-nums">
                  {events.length}
                </span>
              )}
            </div>
            <button onClick={nextMonth} title="Mes siguiente (→)" className="p-1.5 rounded-xl hover:bg-secondary transition-all active:scale-95">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 border-b border-border/60">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-[11px] font-medium text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {grid.map((date, i) => {
                if (!date) {
                  return <div key={`empty-${i}`} className="min-h-[80px] border-r border-b border-border/60/50 last:border-r-0 bg-secondary/20" />;
                }
                const dateStr = toDateStr(date);
                const dayEvents = eventsByDate[dateStr] ?? [];
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;

                return (
                  <div
                    key={dateStr}
                    onClick={() => {
                      setSelectedDate(isSelected ? null : dateStr);
                      setSelectedEvent(null);
                    }}
                    className={cn(
                      "min-h-[80px] p-1.5 border-r border-b border-border/60/50 cursor-pointer transition-all active:scale-[0.99]",
                      "hover:bg-secondary/30",
                      isSelected && "bg-secondary/50",
                      i % 7 === 6 && "border-r-0"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={cn(
                          "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                          isToday && "cal-day-today text-primary-foreground font-black",
                          !isToday && "text-foreground"
                        )}
                      >
                        {date.getDate()}
                      </span>
                      {dayEvents.length === 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openCreate(dateStr); }}
                          className="opacity-0 hover:opacity-100 p-0.5 rounded-xl hover:bg-secondary text-muted-foreground transition-opacity"
                          title="Agregar evento"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((ev) => {
                        const meta = EVENT_TYPE_META[ev.event_type];
                        return (
                          <div
                            key={ev.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedDate(dateStr); setSelectedEvent(ev); }}
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded-xl truncate border cursor-pointer hover:opacity-80 transition-opacity",
                              meta.color
                            )}
                            title={ev.title}
                          >
                            {ev.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-muted-foreground px-1">
                          +{dayEvents.length - 3} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Selected date panel (grid mode only) */}
      {viewMode === "calendar" && selectedDate && (
        <div className="card-premium rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 selected-date-header">
            <h3 className="text-sm font-black capitalize">
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("es-AR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openCreate(selectedDate)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-all active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar
              </button>
              <button onClick={() => { setSelectedDate(null); setSelectedEvent(null); }} className="p-1 rounded-xl hover:bg-secondary">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {selectedDateEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">Sin eventos este día</p>
              <button
                onClick={() => openCreate(selectedDate)}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Agregar evento
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {selectedDateEvents.map((ev) => {
                const meta = EVENT_TYPE_META[ev.event_type];
                const isExpanded = selectedEvent?.id === ev.id;
                return (
                  <div key={ev.id} className="px-4 py-3">
                    <div
                      className="flex items-start gap-3 cursor-pointer"
                      onClick={() => setSelectedEvent(isExpanded ? null : ev)}
                      onDoubleClick={() => openEdit(ev)}
                    >
                      <span className={cn("w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0", meta.dot)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{ev.title}</p>
                        <p className="text-xs text-muted-foreground">{meta.label}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(ev); }}
                          className="p-1 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-all active:scale-95"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(ev); }}
                          disabled={deletingId === ev.id}
                          className="p-1 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingId === ev.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />
                          }
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-2 pl-5 space-y-2">
                        {ev.description && (
                          <p className="text-xs text-muted-foreground">{ev.description}</p>
                        )}
                        {ev.song_id && formSongs.find((s) => s.id === ev.song_id) && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Music className="h-3 w-3 flex-shrink-0 opacity-60" />
                            {formSongs.find((s) => s.id === ev.song_id)!.title}
                          </p>
                        )}
                        {ev.project_id && formProjects.find((p) => p.id === ev.project_id) && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <FolderOpen className="h-3 w-3 flex-shrink-0 opacity-60" />
                            {formProjects.find((p) => p.id === ev.project_id)!.name}
                          </p>
                        )}
                        {/* Share deep link */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleShareEvent(ev.id); }}
                          className={cn(
                            "flex items-center gap-1 text-[11px] transition-colors",
                            copiedEventId === ev.id
                              ? "text-green-400"
                              : "text-muted-foreground/60 hover:text-muted-foreground"
                          )}
                          title="Copiar enlace directo a este evento"
                        >
                          {copiedEventId === ev.id
                            ? <><Check className="h-3 w-3" /> Enlace copiado</>
                            : <><Link2 className="h-3 w-3" /> Copiar enlace</>
                          }
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Upcoming events strip — only shown in grid mode when today's month and nothing selected */}
      {viewMode === "calendar" && !selectedDate && upcomingEvents.length > 0 && (
        <div className="card-premium rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <h3 className="text-sm font-black">Próximos eventos</h3>
          </div>
          <div className="divide-y divide-border/50">
            {upcomingEvents.map((ev) => {
              const meta = EVENT_TYPE_META[ev.event_type];
              const evDate = new Date(ev.start_date.split("T")[0] + "T12:00:00");
              const isToday = ev.start_date.split("T")[0] === todayStr;
              const isTomorrow = (() => {
                const tom = new Date(today);
                tom.setDate(tom.getDate() + 1);
                return ev.start_date.split("T")[0] === toDateStr(tom);
              })();
              const dayLabel = isToday
                ? "Hoy"
                : isTomorrow
                ? "Mañana"
                : evDate.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
              return (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-all active:scale-[0.99] group"
                  onClick={() => {
                    setSelectedDate(ev.start_date.split("T")[0]);
                    setSelectedEvent(ev);
                    if (viewYear !== evDate.getFullYear() || viewMonth !== evDate.getMonth() + 1) {
                      setViewYear(evDate.getFullYear());
                      setViewMonth(evDate.getMonth() + 1);
                    }
                  }}
                  onDoubleClick={() => openEdit(ev)}
                >
                  <span className={cn("w-2 h-2 rounded-full flex-shrink-0", meta.dot)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">{meta.label}</p>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full flex-shrink-0",
                    isToday ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
                  )}>
                    {dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {ConfirmDialog}

      {/* Event form modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
          onClick={() => setShowForm(false)}
        >
          <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/20 via-transparent to-cyan-500/10 pointer-events-none" />
            <div className="relative glass-panel rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 sticky-frosted z-10 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-base font-black">
                  {editingEvent ? "Editar evento" : "Nuevo evento"}
                </h2>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl hover:bg-muted/50 transition-all active:scale-95 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formErrors.root && (
                <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-xl">{formErrors.root}</p>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Título *</label>
                <input
                  ref={eventTitleRef}
                  type="text"
                  value={form.title}
                  onChange={(e) => { setForm((p) => ({ ...p, title: e.target.value })); setFormErrors((p) => ({ ...p, title: undefined })); }}
                  placeholder="Sesión de grabación en el estudio"
                  className={cn("w-full px-3 py-2.5 bg-background border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50", formErrors.title ? "border-red-500" : "border-border/60")}
                />
                {formErrors.title && <p className="text-xs text-red-500">{formErrors.title}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo *</label>
                <select
                  value={form.event_type}
                  onChange={(e) => setForm((p) => ({ ...p, event_type: e.target.value as CalendarEventType }))}
                  className="w-full px-3 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {(Object.entries(EVENT_TYPE_META) as [CalendarEventType, typeof EVENT_TYPE_META[CalendarEventType]][]).map(
                    ([type, meta]) => (
                      <option key={type} value={type}>{meta.label}</option>
                    )
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Fecha *</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => { setForm((p) => ({ ...p, start_date: e.target.value })); setFormErrors((p) => ({ ...p, start_date: undefined })); }}
                    className={cn("w-full px-3 py-2.5 bg-background border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:dark]", formErrors.start_date ? "border-red-500" : "border-border/60")}
                  />
                  {formErrors.start_date && <p className="text-xs text-red-500">{formErrors.start_date}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Fecha fin</label>
                  <input
                    type="date"
                    value={form.end_date ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value || null }))}
                    className="w-full px-3 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Descripción</label>
                <textarea
                  value={form.description ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value || null }))}
                  placeholder="Detalles del evento..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              {/* Song & Project linking */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Canción vinculada</label>
                  <select
                    value={form.song_id ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, song_id: e.target.value || null }))}
                    className="w-full px-3 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">— Ninguna —</option>
                    {formSongs.map((s) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Proyecto vinculado</label>
                  <select
                    value={form.project_id ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, project_id: e.target.value || null }))}
                    className="w-full px-3 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">— Ninguno —</option>
                    {formProjects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.all_day}
                  onChange={(e) => setForm((p) => ({ ...p, all_day: e.target.checked }))}
                  className="rounded border-border/60 text-primary focus:ring-primary/50"
                />
                <span className="text-sm text-muted-foreground">Todo el día</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-border/60 text-sm font-black hover:bg-secondary/60 transition-all active:scale-95">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-black hover:bg-primary/80 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingEvent ? "Guardar" : "Crear"}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
