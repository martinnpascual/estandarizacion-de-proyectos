"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Users,
  Plus,
  Search,
  X,
  Loader2,
  Pencil,
  Trash2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  StickyNote,
  AlertTriangle,
  LayoutList,
  LayoutGrid,
  GripVertical,
  Download,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Copy,
  Check,
} from "lucide-react";
import {
  getCollabs,
  createCollab,
  updateCollab,
  deleteCollab,
} from "@/lib/actions/collabs";
import { CollabSchema, type CollabFormData } from "@/lib/schemas";
import { translateCollabStatus } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import type { Collaboration, CollabStatus } from "@/types/database";

const STATUSES: { value: "todos" | CollabStatus; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "propuesta_enviada", label: "Propuesta enviada" },
  { value: "en_grabacion", label: "En grabación" },
  { value: "recibido", label: "Recibido" },
  { value: "mezclando", label: "Mezclando" },
  { value: "listo", label: "Listo" },
];

const STATUS_COLORS: Record<CollabStatus, string> = {
  propuesta_enviada: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  en_grabacion: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  recibido: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  mezclando: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  listo: "bg-green-500/15 text-green-400 border-green-500/20",
};

const STATUS_NEXT: Record<CollabStatus, CollabStatus | null> = {
  propuesta_enviada: "en_grabacion",
  en_grabacion: "recibido",
  recibido: "mezclando",
  mezclando: "listo",
  listo: null,
};

const PIPELINE_STEPS: CollabStatus[] = [
  "propuesta_enviada", "en_grabacion", "recibido", "mezclando", "listo",
];

const PIPELINE_DOT_COLORS: Record<CollabStatus, string> = {
  propuesta_enviada: "bg-zinc-400",
  en_grabacion:      "bg-blue-400",
  recibido:          "bg-yellow-400",
  mezclando:         "bg-purple-400",
  listo:             "bg-green-400",
};

const STATUS_BAR_COLORS: Record<CollabStatus, string> = {
  propuesta_enviada: "#71717a",
  en_grabacion:      "#60a5fa",
  recibido:          "#facc15",
  mezclando:         "#c084fc",
  listo:             "#4ade80",
};

const STATUS_NEXT_LABEL: Record<CollabStatus, string> = {
  propuesta_enviada: "En grabación",
  en_grabacion: "Recibido",
  recibido: "Mezclando",
  mezclando: "Listo",
  listo: "",
};

type FormErrors = Partial<Record<keyof CollabFormData | "root", string>>;

const EMPTY_FORM: CollabFormData = {
  artist_name: "",
  song_title: "",
  status: "propuesta_enviada",
  deadline: null,
  notes: null,
};

// ── Deadline urgency helper ──────────────────────────────────────────
type DeadlineUrgency = "overdue" | "today" | "tomorrow" | "soon" | "ok";

function getDeadlineInfo(deadline: string | null): {
  label: string;
  color: string;
  rowBorder: string;
  urgency: DeadlineUrgency;
  icon?: boolean;
} | null {
  if (!deadline) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0)
    return { label: `Venció hace ${Math.abs(diff)}d`, color: "text-red-400 bg-red-500/10", rowBorder: "border-l-2 border-red-500/70", urgency: "overdue", icon: true };
  if (diff === 0)
    return { label: "Vence hoy", color: "text-red-400 bg-red-500/10", rowBorder: "border-l-2 border-red-500/70", urgency: "today", icon: true };
  if (diff === 1)
    return { label: "Vence mañana", color: "text-orange-400 bg-orange-500/10", rowBorder: "border-l-2 border-orange-500/60", urgency: "tomorrow", icon: true };
  if (diff <= 7)
    return { label: `${diff}d restantes`, color: "text-yellow-400 bg-yellow-500/10", rowBorder: "border-l-2 border-yellow-500/40", urgency: "soon" };
  return {
    label: d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" }),
    color: "text-muted-foreground bg-secondary",
    rowBorder: "",
    urgency: "ok",
  };
}

function collabToForm(c: Collaboration): CollabFormData {
  return {
    artist_name: c.artist_name,
    song_title: c.song_title,
    status: c.status,
    deadline: c.deadline,
    notes: c.notes,
  };
}

export default function CollabsPage() {
  const toast = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<"todos" | CollabStatus>("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [collabs, setCollabs] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingCollab, setEditingCollab] = useState<Collaboration | undefined>(undefined);
  const [form, setForm] = useState<CollabFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedCollabId, setCopiedCollabId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [noDeadlineFilter, setNoDeadlineFilter] = useState(false);
  const [artistFilter, setArtistFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"urgencia" | "artista" | "cancion" | "reciente">("urgencia");
  const artistNameRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus first field and Escape to close when form opens
  useEffect(() => {
    if (showForm) {
      setTimeout(() => artistNameRef.current?.focus(), 50);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (showForm) { setShowForm(false); setEditingCollab(undefined); return; }
      if (expandedId) { setExpandedId(null); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showForm, expandedId]);

  const loadCollabs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCollabs(statusFilter !== "todos" ? statusFilter : undefined);
      if (result.error) {
        setError(result.error);
        setCollabs([]);
      } else {
        let list = result.data ?? [];
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          list = list.filter(
            (c) =>
              c.artist_name.toLowerCase().includes(q) ||
              c.song_title.toLowerCase().includes(q)
          );
        }
        setCollabs(list);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar colaboraciones");
      setCollabs([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  // ?new=1 deep-link; ?status=<status> pre-filters; ?collab=<id> auto-expands the matching row
  useEffect(() => {
    if (searchParams.get("new") === "1") openCreate();
    const statusParam = searchParams.get("status") as CollabStatus | null;
    const validStatuses: CollabStatus[] = ["propuesta_enviada", "en_grabacion", "recibido", "mezclando", "listo"];
    if (statusParam && validStatuses.includes(statusParam)) {
      setStatusFilter(statusParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deepLinkCollabId = searchParams.get("collab");
  const deepLinkAppliedRef = useRef(false);
  useEffect(() => {
    if (!deepLinkCollabId || collabs.length === 0 || deepLinkAppliedRef.current) return;
    const found = collabs.find((c) => c.id === deepLinkCollabId);
    if (found) {
      deepLinkAppliedRef.current = true;
      setExpandedId(deepLinkCollabId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collabs, deepLinkCollabId]);

  useEffect(() => {
    const timer = setTimeout(loadCollabs, searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadCollabs, searchQuery]);

  // Keyboard shortcuts: N = nueva collab, / = focus search, E = export, V = toggle view
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.metaKey || e.ctrlKey) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        openCreate();
      }
      if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        handleExportCSV();
      }
      if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        setViewMode(prev => prev === "list" ? "board" : "list");
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditingCollab(undefined);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowForm(true);
  }

  function openEdit(c: Collaboration) {
    setEditingCollab(c);
    setForm(collabToForm(c));
    setFormErrors({});
    setShowForm(true);
  }

  function setField<K extends keyof CollabFormData>(key: K, value: CollabFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = CollabSchema.safeParse(form);
    if (!parsed.success) {
      const errs: FormErrors = {};
      parsed.error.errors.forEach((err) => {
        const k = err.path[0] as keyof CollabFormData;
        if (!errs[k]) errs[k] = err.message;
      });
      setFormErrors(errs);
      return;
    }

    setSubmitting(true);
    let result: { data: Collaboration | null; error: string | null };
    if (editingCollab) {
      result = await updateCollab(editingCollab.id, parsed.data);
    } else {
      result = await createCollab(parsed.data);
    }

    if (result.error || !result.data) {
      setFormErrors({ root: result.error ?? "Error desconocido" });
    } else {
      setShowForm(false);
      toast.success(editingCollab ? "Collab actualizada" : "Collab creada");
      setCollabs((prev) => {
        const idx = prev.findIndex((c) => c.id === result.data!.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = result.data!;
          return next;
        }
        return [result.data!, ...prev];
      });
    }
    setSubmitting(false);
  }

  async function handleAdvanceStatus(collab: Collaboration) {
    const next = STATUS_NEXT[collab.status];
    if (!next) return;
    setAdvancingId(collab.id);
    const result = await updateCollab(collab.id, { status: next });
    if (!result.error && result.data) {
      setCollabs((prev) => prev.map((c) => c.id === collab.id ? result.data! : c));
      toast.success(`${collab.song_title} → ${STATUS_NEXT_LABEL[collab.status]}`);
    }
    setAdvancingId(null);
  }

  function handleShareCollab(collabId: string) {
    const url = `${window.location.origin}/collabs?collab=${collabId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedCollabId(collabId);
      setTimeout(() => setCopiedCollabId(null), 2000);
    });
  }

  async function handleDelete(collab: Collaboration) {
    if (!await confirm({ title: `¿Eliminar collab con "${collab.artist_name}"?`, message: "Esta acción no se puede deshacer.", confirmLabel: "Eliminar" })) return;
    setDeletingId(collab.id);
    const { error } = await deleteCollab(collab.id);
    if (error) toast.error(error);
    else {
      setCollabs((prev) => prev.filter((c) => c.id !== collab.id));
      toast.success(`Collab con "${collab.artist_name}" eliminada`);
    }
    setDeletingId(null);
  }

  function handleExportCSV() {
    if (filteredCollabs.length === 0) return;
    const headers = ["Artista", "Canción", "Status", "Deadline", "Notas"];
    const rows = filteredCollabs.map((c) => [
      c.artist_name,
      c.song_title,
      translateCollabStatus(c.status),
      c.deadline ?? "",
      c.notes ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `featúrings.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const statusCounts = collabs.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  const URGENCY_ORDER: Record<DeadlineUrgency | "none", number> = {
    overdue: 0, today: 1, tomorrow: 2, soon: 3, ok: 4, none: 5,
  };
  const sortedCollabs = (() => {
    const list = [...collabs];
    if (sortBy === "artista") return list.sort((a, b) => a.artist_name.localeCompare(b.artist_name, "es"));
    if (sortBy === "cancion") return list.sort((a, b) => a.song_title.localeCompare(b.song_title, "es"));
    if (sortBy === "reciente") return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    // "urgencia" default — sort by deadline urgency
    return list.sort((a, b) => {
      const aOrder = URGENCY_ORDER[getDeadlineInfo(a.deadline)?.urgency ?? "none"];
      const bOrder = URGENCY_ORDER[getDeadlineInfo(b.deadline)?.urgency ?? "none"];
      return aOrder - bOrder;
    });
  })();

  const uniqueArtistNames = Array.from(new Set(collabs.map(c => c.artist_name.trim()))).sort((a, b) => a.localeCompare(b, "es"));

  const filteredCollabs = (() => {
    let result = sortedCollabs;
    if (overdueOnly) {
      result = result.filter((c) => {
        if (!c.deadline || c.status === "listo") return false;
        const now = new Date(); now.setHours(0, 0, 0, 0);
        const d = new Date(c.deadline); d.setHours(0, 0, 0, 0);
        return d < now;
      });
    }
    if (noDeadlineFilter) {
      result = result.filter((c) => !c.deadline && c.status !== "listo");
    }
    if (artistFilter) {
      result = result.filter((c) => c.artist_name.trim() === artistFilter);
    }
    return result;
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-yellow-400" />
            Featuring
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Colaboraciones con otros artistas
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-2 transition-colors", viewMode === "list" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary")}
              title="Vista lista"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("board")}
              className={cn("p-2 transition-colors", viewMode === "board" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary")}
              title="Vista tablero"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          {collabs.length > 0 && (
            <button
              onClick={handleExportCSV}
              title="Exportar como CSV"
              className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-secondary transition-colors text-sm text-muted-foreground hover:text-foreground"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          )}
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 transition-colors text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Nueva collab
            <kbd className="hidden md:inline-flex ml-1 text-[9px] bg-primary/20 px-1 py-0.5 rounded font-mono">N</kbd>
          </button>
        </div>
      </div>

      {/* Búsqueda + filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar… (/) artista o canción"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 items-center">
          {STATUSES.map((s) => {
            const count = s.value === "todos"
              ? collabs.length
              : collabs.filter(c => c.status === s.value).length;
            const show = !loading && count > 0;
            return (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                  statusFilter === s.value
                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {s.label}
                {show && (
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full tabular-nums",
                    statusFilter === s.value
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-secondary/80 text-muted-foreground"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          {!loading && !error && (() => {
            const noDeadlineCount = collabs.filter(c => !c.deadline && c.status !== "listo").length;
            if (noDeadlineCount === 0) return null;
            return (
              <button
                onClick={() => setNoDeadlineFilter(v => !v)}
                title="Collabs sin deadline asignado"
                className={cn(
                  "flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg border transition-colors flex-shrink-0 whitespace-nowrap",
                  noDeadlineFilter
                    ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                    : "bg-secondary border-0 text-muted-foreground hover:text-foreground"
                )}
              >
                <CalendarDays className={cn("h-3.5 w-3.5", noDeadlineFilter ? "text-orange-400" : "")} />
                <span>{noDeadlineCount} sin deadline</span>
                {noDeadlineFilter && <X className="h-3 w-3 ml-0.5 opacity-70" />}
              </button>
            );
          })()}
          {/* Artist filter chips — only when ≥2 distinct artists */}
          {!loading && !error && uniqueArtistNames.length >= 2 && uniqueArtistNames.map((artist) => (
            <button
              key={artist}
              onClick={() => setArtistFilter(artistFilter === artist ? null : artist)}
              className={cn(
                "flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg border transition-colors flex-shrink-0 whitespace-nowrap",
                artistFilter === artist
                  ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-400"
                  : "bg-secondary border-0 text-muted-foreground hover:text-foreground"
              )}
              title={`Filtrar por artista: ${artist}`}
            >
              <Users className={cn("h-3.5 w-3.5", artistFilter === artist ? "text-yellow-400" : "")} />
              <span>{artist}</span>
              {artistFilter === artist && <X className="h-3 w-3 ml-0.5 opacity-70" />}
            </button>
          ))}
          {!loading && collabs.length > 1 && (
            <div className="relative flex-shrink-0 ml-1">
              <ArrowUpDown className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="appearance-none pl-7 pr-6 py-2 rounded-lg text-xs bg-secondary text-muted-foreground hover:text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
              >
                <option value="urgencia">Por urgencia</option>
                <option value="artista">Artista A–Z</option>
                <option value="cancion">Canción A–Z</option>
                <option value="reciente">Más reciente</option>
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Pipeline bar */}
      {!loading && !error && collabs.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
            {(["propuesta_enviada","en_grabacion","recibido","mezclando","listo"] as CollabStatus[]).map((s) => {
              const pct = Math.round(((statusCounts[s] ?? 0) / collabs.length) * 100);
              if (pct === 0) return null;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  title={`${translateCollabStatus(s)}: ${statusCounts[s] ?? 0}`}
                  className="h-full transition-opacity hover:opacity-80"
                  style={{ width: `${pct}%`, background: STATUS_BAR_COLORS[s] }}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {(["propuesta_enviada","en_grabacion","recibido","mezclando","listo"] as CollabStatus[]).map((s) => {
              const n = statusCounts[s] ?? 0;
              if (n === 0) return null;
              const pct = Math.round((n / collabs.length) * 100);
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(statusFilter === s ? "todos" : s)}
                  className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_BAR_COLORS[s] }} />
                  <span className={statusFilter === s ? "font-semibold text-foreground" : "text-muted-foreground"}>
                    {translateCollabStatus(s)}
                  </span>
                  <span className="font-medium tabular-nums">{n}</span>
                  <span className="text-muted-foreground">({pct}%)</span>
                </button>
              );
            })}
          </div>
          {/* Quick stat chips */}
          {(() => {
            const uniqueArtists = new Set(collabs.map(c => c.artist_name.trim())).size;
            const completedCount = statusCounts["listo"] ?? 0;
            const withDeadline = collabs.filter(c => !!c.deadline && c.status !== "listo").length;
            const now = new Date(); now.setHours(0,0,0,0);
            const nextDeadline = collabs
              .filter(c => c.deadline && c.status !== "listo")
              .map(c => { const d = new Date(c.deadline!); d.setHours(0,0,0,0); return { title: c.song_title, diff: Math.round((d.getTime() - now.getTime()) / 86_400_000) }; })
              .filter(c => c.diff >= 0)
              .sort((a, b) => a.diff - b.diff)[0];
            return (
              <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
                {uniqueArtists > 0 && (
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-2 py-0.5 rounded-full bg-secondary/50">
                    <Users className="h-3 w-3 flex-shrink-0" />
                    {uniqueArtists} artista{uniqueArtists !== 1 ? "s" : ""}
                  </span>
                )}
                {completedCount > 0 && (
                  <span className="flex items-center gap-1.5 text-[11px] text-green-400 px-2 py-0.5 rounded-full bg-green-500/10">
                    <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                    {completedCount} lista{completedCount !== 1 ? "s" : ""}
                  </span>
                )}
                {withDeadline > 0 && (
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-2 py-0.5 rounded-full bg-secondary/50">
                    <CalendarDays className="h-3 w-3 flex-shrink-0" />
                    {withDeadline} con deadline
                  </span>
                )}
                {nextDeadline && (
                  <span className={cn(
                    "flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full",
                    nextDeadline.diff === 0 ? "text-red-400 bg-red-500/10" :
                    nextDeadline.diff <= 3 ? "text-orange-400 bg-orange-500/10" :
                    "text-muted-foreground bg-secondary/50"
                  )}>
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    {nextDeadline.diff === 0 ? "Deadline hoy" : `Próximo en ${nextDeadline.diff}d`}
                  </span>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Overdue alert banner */}
      {!loading && (() => {
        const overdueCount = collabs.filter((c) => {
          if (!c.deadline || c.status === "listo") return false;
          const now = new Date(); now.setHours(0,0,0,0);
          const d = new Date(c.deadline); d.setHours(0,0,0,0);
          return d < now;
        }).length;
        if (overdueCount === 0) return null;
        return (
          <button
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={cn(
              "flex items-center justify-between w-full px-4 py-2.5 rounded-xl border text-sm transition-colors",
              overdueOnly
                ? "bg-red-500/20 border-red-500/30 text-red-400"
                : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/15"
            )}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>
                <span className="font-semibold">{overdueCount}</span> collab{overdueCount !== 1 ? "s" : ""} con deadline vencido
              </span>
            </div>
            <span className="text-[11px] opacity-70">{overdueOnly ? "Ver todas ×" : "Ver solo vencidas →"}</span>
          </button>
        );
      })()}

      {/* Listos banner */}
      {!loading && !error && (() => {
        const listoCount = (collabs.filter(c => c.status === "listo")).length;
        if (listoCount === 0 || statusFilter === "listo") return null;
        return (
          <button
            onClick={() => setStatusFilter("listo")}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/30 hover:bg-green-500/15 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
              <p className="text-sm font-medium text-green-400">
                {listoCount} collab{listoCount !== 1 ? "s" : ""} lista{listoCount !== 1 ? "s" : ""} — ya tiene{listoCount !== 1 ? "n" : ""} la parte grabada
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-green-400 flex-shrink-0" />
          </button>
        );
      })()}

      {/* Vista Tablero */}
      {viewMode === "board" && !loading && !error && (
        <CollabKanbanBoard
          collabs={collabs}
          onEdit={openEdit}
          onDelete={handleDelete}
          onStatusChange={(collab, newStatus) => {
            setCollabs((prev) =>
              prev.map((c) => c.id === collab.id ? { ...c, status: newStatus } : c)
            );
          }}
        />
      )}

      {/* Lista */}
      <div className={cn("bg-card rounded-xl border border-border overflow-hidden", viewMode === "board" ? "hidden" : "")}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button onClick={loadCollabs} className="mt-3 text-sm text-primary hover:underline">
              Reintentar
            </button>
          </div>
        ) : collabs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">No hay colaboraciones</p>
            <button onClick={openCreate} className="mt-3 text-sm text-primary hover:underline">
              Agregar la primera
            </button>
          </div>
        ) : filteredCollabs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            {artistFilter ? (
              <>
                <Users className="h-10 w-10 text-yellow-400/40 mb-4" />
                <p className="text-muted-foreground text-sm font-medium">Sin collabs con {artistFilter}</p>
                <button onClick={() => setArtistFilter(null)} className="mt-3 text-sm text-primary hover:underline">
                  Ver todas
                </button>
              </>
            ) : noDeadlineFilter ? (
              <>
                <CalendarDays className="h-10 w-10 text-green-400/40 mb-4" />
                <p className="text-muted-foreground text-sm font-medium">¡Todas tienen deadline! 📅</p>
                <p className="text-xs text-muted-foreground mt-1">Todas las collabs activas tienen una fecha asignada</p>
                <button onClick={() => setNoDeadlineFilter(false)} className="mt-3 text-sm text-primary hover:underline">
                  Ver todas
                </button>
              </>
            ) : (
              <>
                <AlertTriangle className="h-10 w-10 text-green-400/40 mb-4" />
                <p className="text-muted-foreground text-sm font-medium">¡Sin vencidos!</p>
                <p className="text-xs text-muted-foreground mt-1">No hay collabs con deadline vencido</p>
                <button onClick={() => { setOverdueOnly(false); setNoDeadlineFilter(false); }} className="mt-3 text-sm text-primary hover:underline">
                  Ver todas
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredCollabs.map((collab) => {
              const deadlineInfo = getDeadlineInfo(collab.deadline);
              const isExpanded = expandedId === collab.id;
              return (
              <div key={collab.id} className={cn("bg-card", deadlineInfo?.rowBorder)}>
                <div className={cn(
                  "flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/40 transition-colors group",
                  (deadlineInfo?.urgency === "overdue" || deadlineInfo?.urgency === "today") && "bg-red-500/5 hover:bg-red-500/10",
                  deadlineInfo?.urgency === "tomorrow" && "bg-orange-500/5 hover:bg-orange-500/10",
                )}>
                {/* Expand toggle */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : collab.id)}
                  className="text-muted-foreground hover:text-foreground flex-shrink-0"
                >
                  {isExpanded
                    ? <ChevronDown className="h-4 w-4" />
                    : <ChevronRight className="h-4 w-4" />}
                </button>

                {/* Avatar artista */}
                <div className="w-9 h-9 rounded-full bg-yellow-500/15 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-yellow-400">
                    {collab.artist_name[0]?.toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{collab.song_title}</p>
                    {collab.notes && (
                      <StickyNote className="h-3 w-3 text-muted-foreground flex-shrink-0 opacity-60" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground truncate">
                      ft. {collab.artist_name}
                    </p>
                    {(() => {
                      const daysSinceUpdate = Math.floor((Date.now() - new Date(collab.updated_at).getTime()) / 86_400_000);
                      const daysSinceCreate = Math.floor((Date.now() - new Date(collab.created_at).getTime()) / 86_400_000);
                      if (daysSinceUpdate > 7 || daysSinceUpdate >= daysSinceCreate) return null;
                      const label = daysSinceUpdate === 0 ? "hoy" : daysSinceUpdate === 1 ? "ayer" : `hace ${daysSinceUpdate}d`;
                      return (
                        <span
                          className="text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded-full flex-shrink-0"
                          title={`Última actualización: ${new Date(collab.updated_at).toLocaleString("es-AR")}`}
                        >
                          ↑ {label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Deadline urgency badge */}
                {deadlineInfo && (
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0",
                    deadlineInfo.color
                  )}>
                    {deadlineInfo.icon && <AlertTriangle className="h-3 w-3" />}
                    <CalendarDays className="h-3 w-3" />
                    {deadlineInfo.label}
                  </span>
                )}

                {/* Pipeline progress dots */}
                <div className="hidden sm:flex items-center gap-1 flex-shrink-0" title={`Paso ${PIPELINE_STEPS.indexOf(collab.status) + 1} de ${PIPELINE_STEPS.length}`}>
                  {PIPELINE_STEPS.map((step, i) => {
                    const currentIdx = PIPELINE_STEPS.indexOf(collab.status);
                    const isCurrent = i === currentIdx;
                    const isDone = i < currentIdx;
                    return (
                      <span
                        key={step}
                        className={cn(
                          "rounded-full transition-all",
                          isCurrent
                            ? cn("w-2.5 h-2.5", PIPELINE_DOT_COLORS[collab.status])
                            : isDone
                            ? cn("w-1.5 h-1.5 opacity-40", PIPELINE_DOT_COLORS[collab.status])
                            : "w-1.5 h-1.5 bg-border"
                        )}
                      />
                    );
                  })}
                </div>

                {/* Quick advance button */}
                {STATUS_NEXT[collab.status] && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAdvanceStatus(collab); }}
                    disabled={advancingId === collab.id}
                    title={`Mover a ${STATUS_NEXT_LABEL[collab.status]}`}
                    className="hidden sm:flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {advancingId === collab.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <ChevronRight className="h-3 w-3" />
                    }
                    {advancingId !== collab.id && <span className="hidden md:inline">{STATUS_NEXT_LABEL[collab.status]}</span>}
                  </button>
                )}
                <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium border flex-shrink-0", STATUS_COLORS[collab.status])}>
                  {translateCollabStatus(collab.status)}
                </span>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => handleShareCollab(collab.id)}
                    title="Copiar enlace"
                    className={cn(
                      "p-1.5 rounded-lg hover:bg-secondary transition-colors",
                      copiedCollabId === collab.id ? "text-green-400" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {copiedCollabId === collab.id
                      ? <Check className="h-3.5 w-3.5" />
                      : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => openEdit(collab)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(collab)}
                    disabled={deletingId === collab.id}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-500 disabled:opacity-50"
                  >
                    {deletingId === collab.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Panel expandible — notas + deadline completo */}
              {isExpanded && (
                <div className="px-5 pb-4 pt-3 bg-secondary/20 border-t border-border space-y-3">
                  {/* Pipeline timeline */}
                  <div className="flex items-center gap-1">
                    {PIPELINE_STEPS.map((step, i) => {
                      const currentIdx = PIPELINE_STEPS.indexOf(collab.status);
                      const isCurrent = i === currentIdx;
                      const isDone = i < currentIdx;
                      const labels: Record<CollabStatus, string> = {
                        propuesta_enviada: "Propuesta",
                        en_grabacion: "Grabación",
                        recibido: "Recibido",
                        mezclando: "Mezcla",
                        listo: "Listo",
                      };
                      return (
                        <div key={step} className="flex items-center gap-1 flex-1 min-w-0">
                          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                            <span className={cn(
                              "w-2.5 h-2.5 rounded-full flex-shrink-0",
                              isCurrent ? PIPELINE_DOT_COLORS[collab.status] : isDone ? cn(PIPELINE_DOT_COLORS[collab.status], "opacity-40") : "bg-border"
                            )} />
                            <span className={cn("text-[9px] whitespace-nowrap", isCurrent ? "text-foreground font-semibold" : "text-muted-foreground/60")}>
                              {labels[step]}
                            </span>
                          </div>
                          {i < PIPELINE_STEPS.length - 1 && (
                            <div className={cn("h-px flex-1 mb-3", isDone || isCurrent ? "bg-secondary" : "bg-border")} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {deadlineInfo && (
                    <div className="flex items-center gap-2 text-xs">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Deadline:</span>
                      <span className={cn("font-medium px-1.5 py-0.5 rounded", deadlineInfo.color)}>
                        {deadlineInfo.icon && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                        {deadlineInfo.label}
                        {collab.deadline && (
                          <span className="ml-1 opacity-70">
                            ({new Date(collab.deadline).toLocaleDateString("es-AR", {
                              weekday: "short", day: "numeric", month: "short", year: "numeric"
                            })})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {collab.notes ? (
                    <div className="flex gap-2">
                      <StickyNote className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                        {collab.notes}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/50 italic pl-5">Sin notas</p>
                  )}
                  {/* Created at */}
                  <p className="text-[10px] text-muted-foreground/40">
                    En el pipeline desde {new Date(collab.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
                    {" · "}
                    {Math.floor((Date.now() - new Date(collab.created_at).getTime()) / 86400000)} días
                  </p>
                </div>
              )}
            </div>
            );
            })}
          </div>
        )}
      </div>

      {ConfirmDialog}

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-card border border-border rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-base font-semibold">
                {editingCollab ? "Editar collab" : "Nueva collab"}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formErrors.root && (
                <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">{formErrors.root}</p>
              )}
              <FormField label="Artista *" error={formErrors.artist_name}>
                <input ref={artistNameRef} type="text" value={form.artist_name} onChange={(e) => setField("artist_name", e.target.value)} placeholder="Nombre del artista" className={iClass(!!formErrors.artist_name)} />
              </FormField>
              <FormField label="Canción *" error={formErrors.song_title}>
                <input type="text" value={form.song_title} onChange={(e) => setField("song_title", e.target.value)} placeholder="Título de la canción" className={iClass(!!formErrors.song_title)} />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Estado *" error={formErrors.status}>
                  <select value={form.status} onChange={(e) => setField("status", e.target.value as CollabFormData["status"])} className={iClass(false)}>
                    {STATUSES.filter((s) => s.value !== "todos").map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Deadline" error={undefined}>
                  <input type="date" value={form.deadline ?? ""} onChange={(e) => setField("deadline", e.target.value || null)} className={iClass(false)} />
                </FormField>
              </div>
              <FormField label="Notas" error={formErrors.notes}>
                <textarea value={form.notes ?? ""} onChange={(e) => setField("notes", e.target.value || null)} rows={2} className={iClass(false) + " resize-none"} />
              </FormField>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors">Cancelar</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingCollab ? "Guardar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function iClass(hasError: boolean) {
  return `w-full px-3 py-2.5 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${hasError ? "border-red-500" : "border-border"}`;
}

// ── Kanban Board ────────────────────────────────────────────────────────────

const KANBAN_COLS: {
  status: CollabStatus;
  label: string;
  color: string;
  bg: string;
  dot: string;
  border: string;
}[] = [
  { status: "propuesta_enviada", label: "Propuesta", color: "text-zinc-400", bg: "bg-zinc-500/10 border-zinc-500/20", dot: "bg-zinc-400", border: "border-zinc-500/50" },
  { status: "en_grabacion", label: "En grabación", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", dot: "bg-blue-400", border: "border-blue-500/50" },
  { status: "recibido", label: "Recibido", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", dot: "bg-yellow-400", border: "border-yellow-500/50" },
  { status: "mezclando", label: "Mezclando", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", dot: "bg-purple-400", border: "border-purple-500/50" },
  { status: "listo", label: "Listo", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", dot: "bg-green-400", border: "border-green-500/50" },
];

interface KanbanProps {
  collabs: Collaboration[];
  onEdit: (c: Collaboration) => void;
  onDelete: (c: Collaboration) => void;
  onStatusChange: (c: Collaboration, newStatus: CollabStatus) => void;
}

function CollabKanbanBoard({ collabs, onEdit, onDelete, onStatusChange }: KanbanProps) {
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<CollabStatus | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [copiedCollabId, setCopiedCollabId] = useState<string | null>(null);
  const draggedId = useRef<string | null>(null);
  const dragSourceStatus = useRef<CollabStatus | null>(null);

  function handleCopyCollabLink(e: React.MouseEvent, collabId: string) {
    e.stopPropagation();
    const url = `${window.location.origin}/collabs?collab=${collabId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedCollabId(collabId);
      setTimeout(() => setCopiedCollabId(null), 2000);
    });
  }

  function handleDragStart(e: React.DragEvent, c: Collaboration) {
    draggedId.current = c.id;
    dragSourceStatus.current = c.status;
    setDraggingId(c.id);
    e.dataTransfer.effectAllowed = "move";
    const ghost = document.createElement("div");
    ghost.className = "fixed -left-full";
    ghost.textContent = c.song_title;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  }

  function handleDragEnd() {
    draggedId.current = null;
    dragSourceStatus.current = null;
    setDraggingId(null);
    setDragOverColumn(null);
  }

  function handleColumnDragOver(e: React.DragEvent, targetStatus: CollabStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (targetStatus !== dragSourceStatus.current) setDragOverColumn(targetStatus);
  }

  function handleColumnDragLeave(e: React.DragEvent) {
    const related = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(related)) setDragOverColumn(null);
  }

  async function handleColumnDrop(targetStatus: CollabStatus) {
    setDragOverColumn(null);
    const id = draggedId.current;
    const src = dragSourceStatus.current;
    draggedId.current = null; dragSourceStatus.current = null; setDraggingId(null);
    if (!id || !src || src === targetStatus) return;
    const c = collabs.find((x) => x.id === id);
    if (!c) return;
    setAdvancingId(id);
    const result = await updateCollab(id, { status: targetStatus });
    if (!result.error && result.data) onStatusChange(c, targetStatus);
    setAdvancingId(null);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
      {KANBAN_COLS.map((col) => {
        const colCollabs = collabs.filter((c) => c.status === col.status);
        const isDropTarget = dragOverColumn === col.status;

        return (
          <div
            key={col.status}
            className="flex flex-col min-h-[280px]"
            onDragOver={(e) => handleColumnDragOver(e, col.status)}
            onDragLeave={handleColumnDragLeave}
            onDrop={() => handleColumnDrop(col.status)}
          >
            {/* Column header */}
            <div className={cn(
              "flex items-center justify-between px-3 py-2 rounded-t-xl border transition-colors",
              col.bg,
              isDropTarget && col.border
            )}>
              <div className="flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full transition-transform", col.dot, isDropTarget && "scale-125")} />
                <span className={cn("text-xs font-semibold", col.color)}>{col.label}</span>
              </div>
              <span className={cn("text-xs font-bold tabular-nums", col.color)}>{colCollabs.length}</span>
            </div>

            {/* Column body */}
            <div className={cn(
              "flex-1 rounded-b-xl border border-t-0 p-2 space-y-2 min-h-[100px] transition-all duration-150",
              isDropTarget ? cn("border-2", col.border, "bg-secondary/40") : "border-border bg-secondary/20"
            )}>
              {colCollabs.length === 0 ? (
                <div className={cn(
                  "flex flex-col items-center justify-center h-16 gap-1 rounded-lg border-2 border-dashed transition-colors",
                  isDropTarget ? cn(col.border, "opacity-100") : "border-transparent opacity-30"
                )}>
                  <Users className={cn("h-4 w-4", isDropTarget ? col.color : "text-muted-foreground")} />
                  {isDropTarget && <span className={cn("text-[10px] font-medium", col.color)}>Soltar aquí</span>}
                </div>
              ) : (
                <>
                  {colCollabs.map((c) => {
                    const dInfo = getDeadlineInfo(c.deadline);
                    const isDragging = draggingId === c.id;
                    const isAdvancing = advancingId === c.id;
                    return (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, c)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "bg-card border border-border rounded-lg p-3 group transition-all duration-150 select-none",
                          isDragging && "opacity-40 scale-95 shadow-lg",
                          !isDragging && "cursor-grab active:cursor-grabbing hover:border-muted-foreground/30 hover:shadow-sm",
                          dInfo && (dInfo.urgency === "overdue" || dInfo.urgency === "today") && "border-l-2 border-red-500/60"
                        )}
                      >
                        {/* Drag handle + title */}
                        <div className="flex items-start gap-1.5 mb-1.5">
                          <GripVertical className="h-3 w-3 text-muted-foreground/30 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate leading-snug">{c.song_title}</p>
                            <p className="text-[11px] text-muted-foreground truncate">ft. {c.artist_name}</p>
                          </div>
                          {c.notes && <StickyNote className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />}
                        </div>

                        {/* Deadline badge */}
                        {dInfo && (
                          <div className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full mb-1.5",
                            dInfo.color
                          )}>
                            {dInfo.icon && <AlertTriangle className="h-2.5 w-2.5" />}
                            <CalendarDays className="h-2.5 w-2.5" />
                            {dInfo.label}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleCopyCollabLink(e, c.id)}
                            className={cn(
                              "p-1 rounded transition-colors",
                              copiedCollabId === c.id ? "text-green-400" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                            )}
                            title="Copiar enlace"
                          >
                            {copiedCollabId === c.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </button>
                          <button
                            onClick={() => onEdit(c)}
                            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => onDelete(c)}
                            className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                          {STATUS_NEXT[c.status] && (
                            <button
                              onClick={async () => {
                                const next = STATUS_NEXT[c.status];
                                if (!next) return;
                                setAdvancingId(c.id);
                                const result = await updateCollab(c.id, { status: next });
                                if (!result.error && result.data) onStatusChange(c, next);
                                setAdvancingId(null);
                              }}
                              disabled={isAdvancing}
                              className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary px-1.5 py-0.5 rounded transition-colors disabled:opacity-50"
                            >
                              {isAdvancing ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {isDropTarget && (
                    <div className={cn("h-8 rounded-lg border-2 border-dashed flex items-center justify-center", col.border)}>
                      <span className={cn("text-[10px] font-medium", col.color)}>Soltar aquí</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
