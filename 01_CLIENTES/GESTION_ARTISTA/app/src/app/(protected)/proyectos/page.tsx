"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  FolderOpen,
  Plus,
  X,
  Loader2,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Music,
  GripVertical,
  Search,
  CalendarClock,
  AlertTriangle,
  ListMusic,
  ArrowUpDown,
  Download,
  LayoutGrid,
  List,
  Copy,
  Check,
  Play,
} from "lucide-react";
import {
  getProjects,
  getProjectTracks,
  createProject,
  updateProject,
  deleteProject,
  addTrackToProject,
  removeTrackFromProject,
  reorderProjectTracks,
  type TrackWithAudio,
} from "@/lib/actions/projects";
import { useAudioPlayerContext } from "@/components/audio/AudioPlayer";
import type { Track as AudioTrack } from "@/hooks/useAudioPlayer";
import { ProjectSchema, type ProjectFormData } from "@/lib/schemas";
import { getSongsByYear } from "@/lib/actions/songs";
import { getDrafts } from "@/lib/actions/drafts";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import type { Project, ProjectType, ProjectStatus, ProjectTrack, Song, Draft } from "@/types/database";
import CoverArtUploader from "@/components/cover/CoverArtUploader";

const TYPES: { value: "todos" | ProjectType; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "album", label: "Álbum" },
  { value: "ep", label: "EP" },
  { value: "mixtape", label: "Mixtape" },
  { value: "single", label: "Single" },
];

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "idea", label: "Idea" },
  { value: "en_produccion", label: "En producción" },
  { value: "en_mezcla", label: "En mezcla" },
  { value: "master", label: "Master" },
  { value: "listo", label: "Listo" },
  { value: "publicado", label: "Publicado" },
];

const STATUS_COLORS: Record<ProjectStatus, string> = {
  idea: "bg-zinc-500/15 text-zinc-400",
  en_produccion: "bg-blue-500/15 text-blue-400",
  en_mezcla: "bg-purple-500/15 text-purple-400",
  master: "bg-yellow-500/15 text-yellow-400",
  listo: "bg-orange-500/15 text-orange-400",
  publicado: "bg-green-500/15 text-green-400",
};

// Solid hex colors for the pipeline bar
const STATUS_BAR_COLORS: Record<ProjectStatus, string> = {
  idea:          "#71717a",
  en_produccion: "#60a5fa",
  en_mezcla:     "#c084fc",
  master:        "#facc15",
  listo:         "#fb923c",
  publicado:     "#4ade80",
};

const STATUS_NEXT: Record<ProjectStatus, ProjectStatus | null> = {
  idea:          "en_produccion",
  en_produccion: "en_mezcla",
  en_mezcla:     "master",
  master:        "listo",
  listo:         "publicado",
  publicado:     null,
};

const PROJECT_TYPE_LABEL: Record<string, string> = {
  album:   "Álbum",
  ep:      "EP",
  mixtape: "Mixtape",
  single:  "Single",
};

const STATUS_NEXT_LABEL: Record<ProjectStatus, string> = {
  idea:          "→ Producción",
  en_produccion: "→ Mezcla",
  en_mezcla:     "→ Master",
  master:        "→ Listo",
  listo:         "→ Publicar",
  publicado:     "",
};

type TargetDateUrgency = "overdue" | "soon" | "ok";

function getTargetDateInfo(targetDate: string | null): {
  label: string; color: string; urgency: TargetDateUrgency
} | null {
  if (!targetDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(targetDate + "T00:00:00");
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return { label: "Vencido", color: "text-red-400 bg-red-500/10 border-red-500/20", urgency: "overdue" };
  if (diffDays <= 30) return { label: `${diffDays}d`, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", urgency: "soon" };
  const opts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" };
  return { label: date.toLocaleDateString("es-AR", opts), color: "text-muted-foreground bg-secondary border-border", urgency: "ok" };
}

type FormErrors = Partial<Record<keyof ProjectFormData | "root", string>>;

const EMPTY_FORM: ProjectFormData = {
  name: "",
  type: "ep",
  status: "idea",
  description: null,
  target_date: null,
  cover_art_url: null,
};

// TrackWithMeta = TrackWithAudio — re-alias so the rest of the file compiles unchanged
type TrackWithMeta = TrackWithAudio;

export default function ProyectosPage() {
  const toast = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const player = useAudioPlayerContext();
  const searchParams = useSearchParams();
  const [typeFilter, setTypeFilter] = useState<"todos" | ProjectType>("todos");
  const [statusFilter, setStatusFilter] = useState<"todos" | ProjectStatus>("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"updated" | "target_date" | "az">("updated");
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [noDateFilter, setNoDateFilter] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
  const [form, setForm] = useState<ProjectFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [copiedProjectId, setCopiedProjectId] = useState<string | null>(null);
  const projectNameRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Record<string, TrackWithMeta[]>>({});
  const [loadingTracks, setLoadingTracks] = useState<string | null>(null);

  // Picker de canciones/maquetas para agregar al tracklist
  const [showPicker, setShowPicker] = useState(false);
  const [pickerProjectId, setPickerProjectId] = useState<string | null>(null);
  const [pickerSongs, setPickerSongs] = useState<Song[]>([]);
  const [pickerDrafts, setPickerDrafts] = useState<Draft[]>([]);
  const [pickerTab, setPickerTab] = useState<"songs" | "drafts">("songs");
  const [pickerSearch, setPickerSearch] = useState("");
  const [addingTrack, setAddingTrack] = useState(false);

  // Drag-and-drop state for tracklist reordering
  const draggedTrackId = useRef<string | null>(null);
  const [dragOverTrackId, setDragOverTrackId] = useState<string | null>(null);

  // Auto-focus and Escape handler for project form, track picker, and expanded row
  useEffect(() => {
    if (showForm) {
      setTimeout(() => projectNameRef.current?.focus(), 50);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (showPicker) { setShowPicker(false); return; }
      if (showForm) { setShowForm(false); setEditingProject(undefined); return; }
      if (expandedId) { setExpandedId(null); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showForm, showPicker, expandedId]);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getProjects(typeFilter !== "todos" ? typeFilter : undefined);
      if (result.error) {
        setError(result.error);
        setProjects([]);
      } else {
        setProjects(result.data ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar proyectos");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  // ?new=1 deep-link from CommandMenu; ?status=<status> pre-filters; ?project=<id> auto-expands the row
  useEffect(() => {
    if (searchParams.get("new") === "1") openCreate();
    const statusParam = searchParams.get("status") as ProjectStatus | null;
    const validStatuses: ProjectStatus[] = ["idea", "en_produccion", "en_mezcla", "master", "listo", "publicado"];
    if (statusParam && validStatuses.includes(statusParam)) {
      setStatusFilter(statusParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deepLinkProjectId = searchParams.get("project");
  const deepLinkAppliedRef = useRef(false);
  useEffect(() => {
    if (!deepLinkProjectId || projects.length === 0 || deepLinkAppliedRef.current) return;
    const found = projects.find((p) => p.id === deepLinkProjectId);
    if (found) {
      deepLinkAppliedRef.current = true;
      toggleExpanded(found);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, deepLinkProjectId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  async function toggleExpanded(project: Project) {
    if (expandedId === project.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(project.id);
    if (!tracks[project.id]) {
      setLoadingTracks(project.id);
      const { data } = await getProjectTracks(project.id);
      setTracks((prev) => ({ ...prev, [project.id]: data ?? [] }));
      setLoadingTracks(null);
    }
  }

  async function openPicker(projectId: string) {
    setPickerProjectId(projectId);
    setPickerTab("songs");
    setPickerSearch("");
    setShowPicker(true);
    const [songsRes, draftsRes] = await Promise.all([
      getSongsByYear(), // sin filtro de año — traer todas
      getDrafts(),
    ]);
    setPickerSongs(songsRes.data ?? []);
    setPickerDrafts(draftsRes.data ?? []);
  }

  async function handleAddTrack(item: Song | Draft, type: "song" | "draft") {
    if (!pickerProjectId) return;
    setAddingTrack(true);
    const currentTracks = tracks[pickerProjectId] ?? [];
    const result = await addTrackToProject({
      project_id: pickerProjectId,
      song_id: type === "song" ? item.id : undefined,
      draft_id: type === "draft" ? item.id : undefined,
      track_order: currentTracks.length + 1,
    });
    if (!result.error && result.data) {
      const newTrack: TrackWithMeta = {
        ...result.data,
        song: type === "song" ? {
          title: (item as Song).title,
          artist_name: (item as Song).artist_name,
          drive_file_id: (item as Song).drive_file_id ?? null,
          drive_file_url: (item as Song).drive_file_url ?? null,
          cover_art_url: (item as Song).cover_art_url ?? null,
          duration_seconds: (item as Song).duration_seconds ?? null,
        } : null,
        draft: type === "draft" ? {
          title: item.title,
          drive_file_id: (item as Draft).drive_file_id ?? null,
          drive_file_url: (item as Draft).drive_file_url ?? null,
          cover_art_url: (item as Draft).cover_art_url ?? null,
          duration_seconds: null,
        } : null,
      };
      setTracks((prev) => ({
        ...prev,
        [pickerProjectId]: [...(prev[pickerProjectId] ?? []), newTrack],
      }));
    }
    setAddingTrack(false);
    setShowPicker(false);
  }

  async function handleRemoveTrack(projectId: string, trackId: string) {
    await removeTrackFromProject(trackId);
    setTracks((prev) => ({
      ...prev,
      [projectId]: prev[projectId]?.filter((t) => t.id !== trackId) ?? [],
    }));
  }

  function handleDragStart(trackId: string) {
    draggedTrackId.current = trackId;
  }

  function handleDragOver(e: React.DragEvent, trackId: string) {
    e.preventDefault();
    if (draggedTrackId.current !== trackId) {
      setDragOverTrackId(trackId);
    }
  }

  function handleDragEnd() {
    draggedTrackId.current = null;
    setDragOverTrackId(null);
  }

  async function handleDrop(projectId: string, targetTrackId: string) {
    const sourceId = draggedTrackId.current;
    if (!sourceId || sourceId === targetTrackId) {
      setDragOverTrackId(null);
      return;
    }

    const projectTracks = tracks[projectId] ?? [];
    const sourceIdx = projectTracks.findIndex((t) => t.id === sourceId);
    const targetIdx = projectTracks.findIndex((t) => t.id === targetTrackId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    // Reorder in place
    const reordered = [...projectTracks];
    const [moved] = reordered.splice(sourceIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    const withOrder = reordered.map((t, i) => ({ ...t, track_order: i + 1 }));

    // Optimistic update
    setTracks((prev) => ({ ...prev, [projectId]: withOrder }));
    setDragOverTrackId(null);
    draggedTrackId.current = null;

    // Persist
    await reorderProjectTracks(
      withOrder.map(({ id, track_order }) => ({ id, track_order }))
    );
  }

  // Keyboard shortcuts: N = nuevo proyecto, / = focus search, E = export, V = toggle view
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

  function openCreate(initialStatus?: ProjectStatus) {
    setEditingProject(undefined);
    setForm(initialStatus ? { ...EMPTY_FORM, status: initialStatus } : EMPTY_FORM);
    setFormErrors({});
    setShowForm(true);
  }

  function openEdit(p: Project) {
    setEditingProject(p);
    setForm({
      name: p.name,
      type: p.type,
      status: p.status,
      description: p.description,
      target_date: p.target_date,
      cover_art_url: p.cover_art_url,
    });
    setFormErrors({});
    setShowForm(true);
  }

  function setField<K extends keyof ProjectFormData>(key: K, value: ProjectFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = ProjectSchema.safeParse(form);
    if (!parsed.success) {
      const errs: FormErrors = {};
      parsed.error.errors.forEach((err) => {
        const k = err.path[0] as keyof ProjectFormData;
        if (!errs[k]) errs[k] = err.message;
      });
      setFormErrors(errs);
      return;
    }

    setSubmitting(true);
    let result: { data: Project | null; error: string | null };
    if (editingProject) {
      result = await updateProject(editingProject.id, parsed.data);
    } else {
      result = await createProject(parsed.data);
    }

    if (result.error || !result.data) {
      setFormErrors({ root: result.error ?? "Error desconocido" });
    } else {
      setShowForm(false);
      setProjects((prev) => {
        const idx = prev.findIndex((p) => p.id === result.data!.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = result.data!;
          return next;
        }
        return [result.data!, ...prev];
      });
      toast.success(editingProject ? "Proyecto actualizado" : "Proyecto creado correctamente");
    }
    setSubmitting(false);
  }

  async function handleAdvanceStatus(project: Project) {
    const next = STATUS_NEXT[project.status];
    if (!next) return;
    setAdvancingId(project.id);
    const result = await updateProject(project.id, { status: next });
    if (result.error) {
      toast.error(result.error);
    } else {
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, status: next } : p))
      );
      toast.success(`"${project.name}" → ${STATUS_OPTIONS.find(s => s.value === next)?.label}`);
    }
    setAdvancingId(null);
  }

  function handleShareProject(projectId: string) {
    const url = `${window.location.origin}/proyectos?project=${projectId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedProjectId(projectId);
      setTimeout(() => setCopiedProjectId(null), 2000);
    });
  }

  async function handleDelete(project: Project) {
    if (!await confirm({ title: `¿Eliminar "${project.name}"?`, message: "Se eliminarán también todos los tracks del proyecto.", confirmLabel: "Eliminar" })) return;
    setDeletingId(project.id);
    const { error } = await deleteProject(project.id);
    if (error) toast.error(error);
    else {
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      toast.success("Proyecto eliminado");
    }
    setDeletingId(null);
  }

  // ── Audio helpers ─────────────────────────────────────────────────────

  function trackToAudioTrack(track: TrackWithMeta): AudioTrack | null {
    if (track.song) {
      const { drive_file_id, drive_file_url, cover_art_url, title, artist_name, duration_seconds } = track.song;
      if (!drive_file_id && !drive_file_url) return null;
      return {
        id: track.id,
        title,
        artist: artist_name,
        url: drive_file_id ? `/api/drive/stream/${drive_file_id}` : drive_file_url!,
        coverArt: cover_art_url ?? undefined,
        duration: duration_seconds ?? undefined,
      };
    }
    if (track.draft) {
      const { drive_file_id, drive_file_url, cover_art_url, title, duration_seconds } = track.draft;
      if (!drive_file_id && !drive_file_url) return null;
      return {
        id: track.id,
        title,
        artist: "Maqueta",
        url: drive_file_id ? `/api/drive/stream/${drive_file_id}` : drive_file_url!,
        coverArt: cover_art_url ?? undefined,
        duration: duration_seconds ?? undefined,
      };
    }
    return null;
  }

  function handlePlayProject(projectId: string, startTrack?: TrackWithMeta) {
    const projectTracks = tracks[projectId] ?? [];
    const playable = projectTracks
      .map(trackToAudioTrack)
      .filter((t): t is AudioTrack => t !== null);
    if (playable.length === 0) return;
    if (startTrack) {
      const startAT = trackToAudioTrack(startTrack);
      player.play(startAT ?? playable[0], playable);
    } else {
      player.play(playable[0], playable);
    }
  }

  function isProjectPlaying(projectId: string): boolean {
    if (!player.currentTrack || !player.isPlaying) return false;
    return (tracks[projectId] ?? []).some(t => {
      const at = trackToAudioTrack(t);
      return at && at.id === player.currentTrack!.id;
    });
  }

  function isProjectLoaded(projectId: string): boolean {
    if (!player.currentTrack) return false;
    return (tracks[projectId] ?? []).some(t => {
      const at = trackToAudioTrack(t);
      return at && at.id === player.currentTrack!.id;
    });
  }

  function handleExportCSV() {
    if (displayedProjects.length === 0) return;
    const headers = ["Nombre", "Tipo", "Status", "Fecha objetivo", "Descripción"];
    const rows = displayedProjects.map((p) => [
      p.name,
      p.type.toUpperCase(),
      STATUS_OPTIONS.find((s) => s.value === p.status)?.label ?? p.status,
      p.target_date ?? "",
      p.description ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "proyectos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Client-side search + sort + status filter
  const displayedProjects = (() => {
    let result = [...projects];
    if (statusFilter !== "todos") {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (noDateFilter) {
      result = result.filter((p) => !p.target_date);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q)
      );
    }
    if (sortBy === "az") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "target_date") {
      result.sort((a, b) => {
        if (!a.target_date && !b.target_date) return 0;
        if (!a.target_date) return 1;
        if (!b.target_date) return -1;
        return a.target_date.localeCompare(b.target_date);
      });
    }
    return result;
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-purple-400" />
            Proyectos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ideas y proyectos musicales
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border p-0.5 gap-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                viewMode === "list" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              title="Vista lista"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("board")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                viewMode === "board" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              title="Vista tablero"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
          {projects.length > 0 && (
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
            onClick={() => openCreate()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 transition-colors text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Nuevo proyecto
            <kbd className="hidden md:inline-flex ml-1 text-[9px] bg-primary/20 px-1 py-0.5 rounded font-mono">N</kbd>
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Type filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 flex-1 items-center">
          {TYPES.map((t) => {
            const count = t.value === "todos"
              ? projects.length
              : projects.filter(p => p.type === t.value).length;
            return (
              <button
                key={t.value}
                onClick={() => setTypeFilter(t.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                  typeFilter === t.value
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
                {!loading && t.value !== "todos" && count > 0 && (
                  <span className="tabular-nums opacity-70">{count}</span>
                )}
              </button>
            );
          })}
          {!loading && !error && (() => {
            const noDateCount = projects.filter(p => !p.target_date && p.status !== "publicado").length;
            if (noDateCount === 0) return null;
            return (
              <button
                onClick={() => setNoDateFilter(v => !v)}
                title="Proyectos sin fecha objetivo"
                className={cn(
                  "flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg border transition-colors flex-shrink-0 whitespace-nowrap",
                  noDateFilter
                    ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                    : "bg-secondary border-0 text-muted-foreground hover:text-foreground"
                )}
              >
                <CalendarClock className={cn("h-3.5 w-3.5", noDateFilter ? "text-orange-400" : "")} />
                <span>{noDateCount} sin fecha</span>
                {noDateFilter && <X className="h-3 w-3 ml-0.5 opacity-70" />}
              </button>
            );
          })()}
        </div>
        {/* Search + sort */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar… (/) por nombre"
              className="w-40 bg-secondary border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 focus:w-52 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="flex items-center gap-1.5 text-xs bg-secondary border border-border rounded-lg px-2 py-1.5 text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          >
            <option value="updated">Recientes</option>
            <option value="az">A → Z</option>
            <option value="target_date">Fecha objetivo</option>
          </select>
        </div>
      </div>

      {/* Status filter chips — shown when ≥2 distinct statuses */}
      {!loading && !error && (() => {
        const statusCounts = projects.reduce<Record<string, number>>((acc, p) => {
          acc[p.status] = (acc[p.status] ?? 0) + 1;
          return acc;
        }, {});
        const activeStatuses = STATUS_OPTIONS.filter(s => (statusCounts[s.value] ?? 0) > 0);
        if (activeStatuses.length <= 1) return null;
        return (
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setStatusFilter("todos")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                statusFilter === "todos"
                  ? "bg-secondary border border-border text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              Todos los estados
              <span className="tabular-nums opacity-70">{projects.length}</span>
            </button>
            {activeStatuses.map((s) => {
              const count = statusCounts[s.value] ?? 0;
              const isActive = statusFilter === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => setStatusFilter(isActive ? "todos" : s.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors",
                    isActive
                      ? cn(STATUS_COLORS[s.value], "border-transparent")
                      : "border-border text-muted-foreground hover:text-foreground bg-secondary"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_BAR_COLORS[s.value] }} />
                  {s.label}
                  <span className="tabular-nums opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* Stats strip + pipeline */}
      {!loading && projects.length > 0 && (() => {
        const statusCounts = STATUS_OPTIONS.reduce<Record<ProjectStatus, number>>(
          (acc, s) => { acc[s.value] = 0; return acc; },
          {} as Record<ProjectStatus, number>
        );
        projects.forEach((p) => { statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1; });
        const total = projects.length;

        const typeCounts: Record<string, number> = {};
        projects.forEach((p) => { typeCounts[p.type] = (typeCounts[p.type] ?? 0) + 1; });
        const typeEntries = Object.entries(typeCounts).sort(([,a],[,b]) => b - a);

        const withTargetDate = projects.filter((p) => p.target_date).length;
        const overdueCount = projects.filter((p) => {
          if (!p.target_date || p.status === "publicado") return false;
          const info = getTargetDateInfo(p.target_date);
          return info?.urgency === "overdue";
        }).length;

        return (
          <div className="space-y-3">

            {/* Chips row */}
            <div className="flex flex-wrap items-center gap-2">
              {typeEntries.map(([type, count]) => (
                <span key={type} className="flex items-center gap-1.5 text-[11px] bg-secondary text-muted-foreground px-2.5 py-1 rounded-full">
                  <FolderOpen className="h-3 w-3 flex-shrink-0" />
                  <span>{PROJECT_TYPE_LABEL[type] ?? type}</span>
                  <span className="font-semibold text-foreground tabular-nums">{count}</span>
                </span>
              ))}
              {withTargetDate > 0 && (
                <span className="flex items-center gap-1.5 text-[11px] bg-secondary text-muted-foreground px-2.5 py-1 rounded-full">
                  <CalendarClock className="h-3 w-3 flex-shrink-0" />
                  <span>{withTargetDate} con fecha</span>
                </span>
              )}
              {overdueCount > 0 && (
                <span className="flex items-center gap-1.5 text-[11px] bg-red-500/10 text-red-400 px-2.5 py-1 rounded-full border border-red-500/20">
                  <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                  <span>{overdueCount} vencido{overdueCount !== 1 ? "s" : ""}</span>
                </span>
              )}
            </div>
          </div>
        );
      })()}

      {/* Listo para publicar alert */}
      {!loading && !error && (() => {
        const listoCount = projects.filter(p => p.status === "listo").length;
        if (listoCount === 0 || statusFilter === "listo") return null;
        return (
          <button
            onClick={() => setStatusFilter("listo")}
            className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/30 hover:bg-green-500/15 transition-colors w-full"
          >
            <div className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-green-400 flex-shrink-0" />
              <p className="text-sm font-medium text-green-400">
                {listoCount} proyecto{listoCount !== 1 ? "s" : ""} listo{listoCount !== 1 ? "s" : ""} para publicar
              </p>
            </div>
            <span className="text-[11px] text-green-400/70">Ver →</span>
          </button>
        );
      })()}

      {/* ── Board view ─────────────────────────────────────────────────── */}
      {viewMode === "board" && (
        <div className="overflow-x-auto pb-4 -mx-1 px-1">
          {loading ? (
            <div className="flex gap-4">
              {STATUS_OPTIONS.map((s) => (
                <div key={s.value} className="flex-shrink-0 w-60">
                  <div className="h-6 w-24 bg-secondary rounded animate-pulse mb-2" />
                  <div className="space-y-2">
                    {[1,2].map(i => <div key={i} className="h-24 bg-secondary rounded-xl animate-pulse" />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-4">
              {STATUS_OPTIONS.map((status) => {
                const colProjects = displayedProjects.filter(p => p.status === status.value);
                const barColor = STATUS_BAR_COLORS[status.value];
                return (
                  <div key={status.value} className="flex-shrink-0 w-60">
                    {/* Column header */}
                    <div className="flex items-center justify-between mb-2.5 px-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: barColor }} />
                        <span className="text-xs font-semibold">{status.label}</span>
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full tabular-nums">
                        {colProjects.length}
                      </span>
                    </div>

                    {/* Cards + add button */}
                    <div className="space-y-2">
                      {colProjects.map(project => (
                        <BoardCard
                          key={project.id}
                          project={project}
                          onEdit={openEdit}
                          onAdvance={handleAdvanceStatus}
                          advancingId={advancingId}
                          deletingId={deletingId}
                          onDelete={handleDelete}
                        />
                      ))}
                      <button
                        onClick={() => openCreate(status.value)}
                        className="w-full py-2 border border-dashed border-border/60 rounded-xl text-[11px] text-muted-foreground/50 hover:text-muted-foreground hover:border-border transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Agregar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Lista */}
      {viewMode === "list" && <div className="space-y-3">
        {loading ? (
          <div className="bg-card rounded-xl border border-border flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="bg-card rounded-xl border border-border flex flex-col items-center justify-center py-16 text-center px-4">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border/60 flex flex-col items-center justify-center py-20 text-center px-6">
            {/* SVG illustration */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-2xl scale-150" />
              <svg width="96" height="96" viewBox="0 0 96 96" fill="none" className="relative">
                <circle cx="48" cy="48" r="44" fill="hsl(var(--secondary))" opacity="0.6" />
                {/* Folder back */}
                <rect x="14" y="38" width="68" height="40" rx="6" fill="#c084fc" opacity="0.25" />
                {/* Folder tab */}
                <path d="M14 38h20l4-6h8a6 6 0 016 6v0H14z" fill="#c084fc" opacity="0.4" />
                {/* Folder front */}
                <rect x="14" y="42" width="68" height="36" rx="6" fill="#c084fc" opacity="0.3" />
                {/* Music note in folder */}
                <path d="M53 54l-8 2v8l8-2V54z" fill="#c084fc" opacity="0.9" />
                <circle cx="45" cy="64" r="3" fill="#c084fc" opacity="0.9" />
                <circle cx="53" cy="62" r="3" fill="#c084fc" opacity="0.9" />
                {/* Stars */}
                <circle cx="22" cy="28" r="2" fill="#c084fc" opacity="0.3" />
                <circle cx="74" cy="22" r="3" fill="#c084fc" opacity="0.2" />
                <circle cx="78" cy="34" r="2" fill="#c084fc" opacity="0.3" />
              </svg>
            </div>
            <h3 className="text-base font-semibold mb-1">Sin proyectos todavía</h3>
            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
              Organizá tus lanzamientos, EPs, álbumes y metas en proyectos para darle seguimiento.
            </p>
            <button
              onClick={() => openCreate()}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 text-sm font-medium hover:bg-purple-500/20 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Crear primer proyecto
            </button>
          </div>
        ) : displayedProjects.length === 0 ? (
          <div className="bg-card rounded-xl border border-border flex flex-col items-center justify-center py-16 text-center px-4">
            {noDateFilter ? (
              <>
                <CalendarClock className="h-10 w-10 text-green-400/40 mb-4" />
                <p className="text-muted-foreground text-sm font-medium">¡Todos los proyectos tienen fecha! 📅</p>
                <p className="text-xs text-muted-foreground mt-1">Todos los proyectos activos tienen fecha objetivo</p>
                <button onClick={() => setNoDateFilter(false)} className="mt-3 text-sm text-primary hover:underline">
                  Ver todos los proyectos
                </button>
              </>
            ) : (
              <>
                <Search className="h-10 w-10 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground text-sm">
                  {statusFilter !== "todos" && !searchQuery
                    ? `No hay proyectos en estado "${STATUS_OPTIONS.find(s => s.value === statusFilter)?.label ?? statusFilter}"`
                    : `Sin resultados para "${searchQuery}"`}
                </p>
                <button
                  onClick={() => { setSearchQuery(""); setStatusFilter("todos"); setNoDateFilter(false); }}
                  className="mt-3 text-sm text-primary hover:underline"
                >
                  Quitar filtros
                </button>
              </>
            )}
          </div>
        ) : (
          displayedProjects.map((project) => (
            <div key={project.id} className="bg-card rounded-xl border border-border overflow-hidden">
              {/* Header del proyecto */}
              <div className="flex items-center gap-3 px-4 py-3.5 group">
                <button onClick={() => toggleExpanded(project)} className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                  {expandedId === project.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>

                {/* Cover art thumbnail */}
                {project.cover_art_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={project.cover_art_url}
                    alt=""
                    className="w-8 h-8 rounded object-cover flex-shrink-0 border border-border"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <FolderOpen className="h-3.5 w-3.5 text-purple-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0" onClick={() => toggleExpanded(project)} role="button">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{project.name}</p>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 flex-shrink-0">
                      {PROJECT_TYPE_LABEL[project.type] ?? project.type}
                    </span>
                  </div>
                  {project.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{project.description}</p>
                  )}
                </div>

                {/* Track count badge (only when tracks are loaded) */}
                {tracks[project.id] && (
                  <span className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full flex-shrink-0">
                    <ListMusic className="h-3 w-3" />
                    {tracks[project.id].length}
                  </span>
                )}

                {/* Play project button — only when tracks have audio */}
                {tracks[project.id] && tracks[project.id].some(t => trackToAudioTrack(t) !== null) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isProjectLoaded(project.id)) {
                        player.togglePlay();
                      } else {
                        handlePlayProject(project.id);
                      }
                    }}
                    title={isProjectPlaying(project.id) ? "Pausar" : "Reproducir proyecto"}
                    className={cn(
                      "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors flex-shrink-0",
                      isProjectPlaying(project.id)
                        ? "bg-green-500/15 text-green-400 border-green-500/25"
                        : isProjectLoaded(project.id)
                        ? "bg-secondary text-muted-foreground border-border hover:text-foreground"
                        : "bg-secondary text-muted-foreground border-border hover:text-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary"
                    )}
                  >
                    {isProjectPlaying(project.id) ? (
                      <><EQBars /> Reproduciendo</>
                    ) : isProjectLoaded(project.id) ? (
                      <><Play className="h-3 w-3 fill-current" /> Continuar</>
                    ) : (
                      <><Play className="h-3 w-3 fill-current" /> Reproducir</>
                    )}
                  </button>
                )}

                {/* Target date badge */}
                {(() => {
                  const info = getTargetDateInfo(project.target_date);
                  if (!info) return null;
                  return (
                    <span className={cn(
                      "hidden sm:flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border flex-shrink-0",
                      info.color
                    )}>
                      {info.urgency === "overdue" && <AlertTriangle className="h-3 w-3" />}
                      {info.urgency !== "overdue" && <CalendarClock className="h-3 w-3" />}
                      {info.label}
                    </span>
                  );
                })()}

                {/* Quick advance */}
                {STATUS_NEXT[project.status] && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAdvanceStatus(project); }}
                    disabled={advancingId === project.id}
                    className="hidden sm:flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50 flex-shrink-0"
                    title={STATUS_NEXT_LABEL[project.status]}
                  >
                    {advancingId === project.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <ChevronRight className="h-3 w-3" />}
                    {advancingId !== project.id && (
                      <span className="hidden md:inline">{STATUS_NEXT_LABEL[project.status]}</span>
                    )}
                  </button>
                )}

                <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0", STATUS_COLORS[project.status])}>
                  {STATUS_OPTIONS.find((s) => s.value === project.status)?.label}
                </span>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleShareProject(project.id); }}
                    title="Copiar enlace al proyecto"
                    className={cn(
                      "p-1.5 rounded-lg hover:bg-secondary transition-colors",
                      copiedProjectId === project.id ? "text-green-400" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {copiedProjectId === project.id
                      ? <Check className="h-3.5 w-3.5" />
                      : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); openEdit(project); }} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(project); }}
                    disabled={deletingId === project.id}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    {deletingId === project.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Tracklist expandido */}
              {expandedId === project.id && (
                <div className="border-t border-border">
                  {loadingTracks === project.id ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div>
                      {(tracks[project.id] ?? []).length === 0 ? (
                        <div className="flex flex-col items-center py-8 text-center">
                          <Music className="h-8 w-8 text-muted-foreground/30 mb-2" />
                          <p className="text-sm text-muted-foreground">Sin tracks todavía</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border">
                          {(tracks[project.id] ?? []).map((track, idx) => {
                            const audioTrack = trackToAudioTrack(track);
                            const isCurrent = !!audioTrack && player.currentTrack?.id === audioTrack.id;
                            const isNowPlaying = isCurrent && player.isPlaying;
                            return (
                              <div
                                key={track.id}
                                draggable
                                onDragStart={() => handleDragStart(track.id)}
                                onDragOver={(e) => handleDragOver(e, track.id)}
                                onDrop={() => handleDrop(project.id, track.id)}
                                onDragEnd={handleDragEnd}
                                className={cn(
                                  "flex items-center gap-3 px-4 py-2.5 group/track transition-colors",
                                  dragOverTrackId === track.id
                                    ? "bg-primary/10 border-l-2 border-primary"
                                    : isCurrent
                                    ? "bg-green-500/5"
                                    : "hover:bg-secondary/30"
                                )}
                              >
                                <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0 cursor-grab active:cursor-grabbing" />

                                {/* Track number / play button / EQ indicator */}
                                {audioTrack ? (
                                  <button
                                    onClick={() => isNowPlaying ? player.togglePlay() : handlePlayProject(project.id, track)}
                                    title={isNowPlaying ? "Pausar" : "Reproducir"}
                                    className={cn(
                                      "w-5 flex-shrink-0 flex items-center justify-center transition-colors",
                                      isCurrent ? "text-green-400" : "text-muted-foreground"
                                    )}
                                  >
                                    {isNowPlaying ? (
                                      <EQBars />
                                    ) : (
                                      <>
                                        <span className="text-xs group-hover/track:hidden">{idx + 1}</span>
                                        <Play className="h-3 w-3 fill-current hidden group-hover/track:block" />
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-xs text-muted-foreground w-5 text-right flex-shrink-0">{idx + 1}</span>
                                )}

                                <div className="flex-1 min-w-0">
                                  <p className={cn("text-sm truncate", isCurrent && "text-green-400 font-medium")}>
                                    {track.song?.title ?? track.draft?.title ?? "—"}
                                  </p>
                                  {track.song && (
                                    <p className="text-xs text-muted-foreground">{track.song.artist_name}</p>
                                  )}
                                  {track.draft && (
                                    <span className="text-[10px] text-blue-400">maqueta</span>
                                  )}
                                </div>

                                {/* No audio indicator */}
                                {!audioTrack && (
                                  <span className="hidden group-hover/track:inline text-[10px] text-muted-foreground/50 flex-shrink-0">sin audio</span>
                                )}

                                <button
                                  onClick={() => handleRemoveTrack(project.id, track.id)}
                                  className="opacity-0 group-hover/track:opacity-100 p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="px-4 py-3 border-t border-border">
                        <button
                          onClick={() => openPicker(project.id)}
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Agregar track
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>}

      {ConfirmDialog}

      {/* Modal formulario proyecto */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-card border border-border rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-base font-semibold">
                {editingProject ? "Editar proyecto" : "Nuevo proyecto"}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formErrors.root && (
                <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">{formErrors.root}</p>
              )}
              <FormField label="Nombre *" error={formErrors.name}>
                <input ref={projectNameRef} type="text" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Nombre del proyecto" className={iClass(!!formErrors.name)} />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Tipo *" error={formErrors.type}>
                  <select value={form.type} onChange={(e) => setField("type", e.target.value as ProjectFormData["type"])} className={iClass(false)}>
                    {TYPES.filter((t) => t.value !== "todos").map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Estado *" error={formErrors.status}>
                  <select value={form.status} onChange={(e) => setField("status", e.target.value as ProjectFormData["status"])} className={iClass(false)}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </FormField>
              </div>
              <FormField label="Descripción" error={undefined}>
                <textarea value={form.description ?? ""} onChange={(e) => setField("description", e.target.value || null)} rows={2} className={iClass(false) + " resize-none"} />
              </FormField>
              <div>
                <CoverArtUploader
                  value={form.cover_art_url ?? null}
                  onChange={(url) => setField("cover_art_url", url)}
                  label="Portada (opcional)"
                  size="md"
                />
                {formErrors.cover_art_url && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.cover_art_url}</p>
                )}
              </div>
              <FormField label="Fecha objetivo" error={undefined}>
                <input type="date" value={form.target_date ?? ""} onChange={(e) => setField("target_date", e.target.value || null)} className={iClass(false)} />
              </FormField>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors">Cancelar</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingProject ? "Guardar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Picker de tracks */}
      {showPicker && (() => {
        const q = pickerSearch.toLowerCase().trim();
        const filteredSongs = q
          ? pickerSongs.filter(s => s.title.toLowerCase().includes(q) || s.artist_name.toLowerCase().includes(q))
          : pickerSongs;
        const filteredDrafts = q
          ? pickerDrafts.filter(d => d.title.toLowerCase().includes(q) || (d.producer ?? "").toLowerCase().includes(q))
          : pickerDrafts;
        const currentList = pickerTab === "songs" ? filteredSongs : filteredDrafts;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <div className="bg-card border border-border rounded-xl w-full max-w-md max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold">Agregar track</h3>
                <button onClick={() => setShowPicker(false)} className="p-1.5 rounded-lg hover:bg-secondary">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Search */}
              <div className="px-3 pt-3 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={e => setPickerSearch(e.target.value)}
                    placeholder="Buscar por título…"
                    autoFocus
                    className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border px-3 gap-1">
                {(["songs", "drafts"] as const).map((tab) => {
                  const count = tab === "songs" ? filteredSongs.length : filteredDrafts.length;
                  return (
                    <button
                      key={tab}
                      onClick={() => setPickerTab(tab)}
                      className={cn(
                        "py-2 px-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                        pickerTab === tab
                          ? "text-primary border-primary"
                          : "text-muted-foreground border-transparent hover:text-foreground"
                      )}
                    >
                      {tab === "songs" ? "Discografía" : "Maquetas"}
                      {q && (
                        <span className="ml-1.5 text-[10px] text-muted-foreground">({count})</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {currentList.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-muted-foreground">
                    <Music className="h-8 w-8 opacity-20 mb-2" />
                    <p className="text-sm">{q ? `Sin resultados para "${pickerSearch}"` : "Sin elementos"}</p>
                  </div>
                ) : (
                  currentList.map((item) => {
                    const isSong = pickerTab === "songs";
                    const song = isSong ? item as Song : null;
                    const draft = !isSong ? item as Draft : null;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleAddTrack(item, isSong ? "song" : "draft")}
                        disabled={addingTrack}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left disabled:opacity-50 group"
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                          isSong ? "bg-primary/10" : "bg-blue-400/10"
                        )}>
                          <Music className={cn("h-3.5 w-3.5", isSong ? "text-primary" : "text-blue-400")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {song ? `${song.artist_name} · ${song.year}` : `${draft?.producer ?? "Sin productor"} · ${draft?.status}`}
                          </p>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity" />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── EQ bars — animated indicator for currently-playing track ────────────────
function EQBars({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-end gap-px h-3.5", className)}>
      <span
        className="w-0.5 rounded-sm bg-current"
        style={{ height: "60%", transformOrigin: "bottom", animation: "eq-bounce 0.65s ease-in-out infinite" }}
      />
      <span
        className="w-0.5 rounded-sm bg-current"
        style={{ height: "100%", transformOrigin: "bottom", animation: "eq-bounce 0.65s ease-in-out infinite 0.18s" }}
      />
      <span
        className="w-0.5 rounded-sm bg-current"
        style={{ height: "75%", transformOrigin: "bottom", animation: "eq-bounce 0.65s ease-in-out infinite 0.35s" }}
      />
    </span>
  );
}

// ── Board card ──────────────────────────────────────────────────────────────
function BoardCard({
  project, onEdit, onAdvance, advancingId, deletingId, onDelete,
}: {
  project: Project;
  onEdit: (p: Project) => void;
  onAdvance: (p: Project) => void;
  onDelete: (p: Project) => void;
  advancingId: string | null;
  deletingId: string | null;
}) {
  const info = getTargetDateInfo(project.target_date);
  const [linkCopied, setLinkCopied] = useState(false);

  function handleCopyLink(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/proyectos?project=${project.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }
  return (
    <div className="bg-card border border-border rounded-xl p-3 group hover:border-primary/20 transition-colors">
      {/* Top: cover + name */}
      <div className="flex items-start gap-2 mb-2">
        {project.cover_art_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.cover_art_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0 border border-border" />
        ) : (
          <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center flex-shrink-0">
            <FolderOpen className="h-3.5 w-3.5 text-purple-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight line-clamp-2">{project.name}</p>
          <span className="text-[10px] font-medium text-purple-400">
            {PROJECT_TYPE_LABEL[project.type] ?? project.type}
          </span>
        </div>
      </div>

      {/* Description (truncated) */}
      {project.description && (
        <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2">{project.description}</p>
      )}

      {/* Target date badge */}
      {info && (
        <div className={cn(
          "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full mb-2",
          info.urgency === "overdue"
            ? "bg-red-500/10 text-red-400"
            : info.urgency === "soon"
            ? "bg-yellow-500/10 text-yellow-400"
            : "bg-secondary text-muted-foreground"
        )}>
          {info.urgency === "overdue"
            ? <AlertTriangle className="h-2.5 w-2.5" />
            : <CalendarClock className="h-2.5 w-2.5" />
          }
          {info.label}
        </div>
      )}

      {/* Actions row */}
      <div className="flex items-center gap-1 pt-1.5 border-t border-border">
        <button
          onClick={handleCopyLink}
          className={cn(
            "p-1 rounded transition-colors",
            linkCopied ? "text-green-400" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
          title="Copiar enlace"
        >
          {linkCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
        <button
          onClick={() => onEdit(project)}
          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Editar"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={() => onDelete(project)}
          disabled={deletingId === project.id}
          className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50"
          title="Eliminar"
        >
          {deletingId === project.id
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <Trash2 className="h-3 w-3" />}
        </button>
        {STATUS_NEXT[project.status] && (
          <button
            onClick={() => onAdvance(project)}
            disabled={advancingId === project.id}
            className="ml-auto flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition-colors disabled:opacity-50"
            title={STATUS_NEXT_LABEL[project.status]}
          >
            {advancingId === project.id
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <>
                  <ChevronRight className="h-3 w-3" />
                  <span className="hidden sm:inline">{STATUS_NEXT_LABEL[project.status]}</span>
                </>
            }
          </button>
        )}
      </div>
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
