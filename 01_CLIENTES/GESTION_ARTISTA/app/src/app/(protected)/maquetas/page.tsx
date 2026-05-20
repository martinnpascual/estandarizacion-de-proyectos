"use client";

import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useSearchParams } from "next/navigation";
import {
  FileAudio,
  Plus,
  Search,
  X,
  Loader2,
  Play,
  Pause,
  Pencil,
  Trash2,
  Upload,
  ChevronDown,
  ChevronRight,
  History,
  LayoutList,
  LayoutGrid,
  ListMusic,
  MessageSquare,
  Download,
  Copy,
  Check,
  FileText,
  ArrowDownToLine,
  CheckSquare,
  Square,
  Zap,
  ListPlus,
  Clock,
  Heart,
} from "lucide-react";
import DraftVersionsPanel from "@/components/drafts/DraftVersionsPanel";
import LyricsPanel from "@/components/lyrics/LyricsPanel";
import { SongRowSkeleton } from "@/components/ui/Skeletons";
import DraftKanbanBoard from "@/components/drafts/DraftKanbanBoard";
import CommentsPanel from "@/components/comments/CommentsPanel";
import { useAudioPlayerContext } from "@/components/audio/AudioPlayer";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useUser } from "@/hooks/useUser";
import DraftForm from "@/components/drafts/DraftForm";
import PublishDraftModal from "@/components/drafts/PublishDraftModal";
import {
  getDrafts,
  searchDrafts,
  deleteDraft,
  updateDraftStatus,
} from "@/lib/actions/drafts";
import { useDebounce } from "@/hooks/useDebounce";
import { translateDraftStatus } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Draft, DraftStatus, Song } from "@/types/database";

const DRAFT_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

const STATUSES: { value: "todos" | DraftStatus; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "borrador", label: "Borrador" },
  { value: "en_mezcla", label: "En mezcla" },
  { value: "masterizada", label: "Masterizada" },
  { value: "lista_para_publicar", label: "Lista para publicar" },
];

const STATUS_COLORS: Record<DraftStatus, string> = {
  borrador: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  en_mezcla: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  masterizada: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  lista_para_publicar: "bg-green-500/15 text-green-400 border-green-500/20",
};

const STATUS_LEFT_BORDER: Record<DraftStatus, string> = {
  borrador: "border-l-zinc-500/40",
  en_mezcla: "border-l-blue-500/50",
  masterizada: "border-l-purple-500/50",
  lista_para_publicar: "border-l-green-500/60",
};

const STATUS_GRADIENT_THUMB: Record<DraftStatus, string> = {
  borrador:            "from-slate-600/80 via-slate-800/70 to-slate-900/80",
  en_mezcla:           "from-blue-500/80 via-blue-700/70 to-blue-900/80",
  masterizada:         "from-purple-500/80 via-purple-700/70 to-purple-900/80",
  lista_para_publicar: "from-emerald-500/80 via-emerald-700/70 to-emerald-900/80",
};

// Colores de las barras del waveform por estado
const STATUS_WAVEFORM_COLOR: Record<DraftStatus, string> = {
  borrador:            "bg-slate-300",
  en_mezcla:           "bg-blue-300",
  masterizada:         "bg-purple-300",
  lista_para_publicar: "bg-emerald-300",
};

// Waveform decorativo: 11 barras asimétricas, estilo forma de onda real
const WAVEFORM_BARS = [4, 9, 14, 11, 16, 10, 13, 7, 12, 8, 5];

// Solid hex colors for the pipeline bar segments
const STATUS_BAR_COLOR: Record<DraftStatus, string> = {
  borrador:            "#71717a",
  en_mezcla:           "#60a5fa",
  masterizada:         "#c084fc",
  lista_para_publicar: "#4ade80",
};

const STATUS_NEXT: Record<DraftStatus, DraftStatus | null> = {
  borrador: "en_mezcla",
  en_mezcla: "masterizada",
  masterizada: "lista_para_publicar",
  lista_para_publicar: null,
};

function relativeMonthAge(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  const now = new Date();
  const diffMonths = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  if (diffMonths <= 0) return "Este mes";
  if (diffMonths === 1) return "Hace 1 mes";
  if (diffMonths < 12) return `Hace ${diffMonths} meses`;
  const years = Math.floor(diffMonths / 12);
  const rem = diffMonths % 12;
  if (rem === 0) return `Hace ${years} año${years !== 1 ? "s" : ""}`;
  return `Hace ${years}a ${rem}m`;
}

export default function MaquetasPage() {
  const player = useAudioPlayerContext();
  const { user, profile } = useUser();
  const toast = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const searchParams = useSearchParams();

  const [statusFilter, setStatusFilter] = useState<"todos" | DraftStatus>(
    "todos"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingDraft, setEditingDraft] = useState<Draft | undefined>(
    undefined
  );
  const [publishingDraft, setPublishingDraft] = useState<Draft | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [versionsOpenId, setVersionsOpenId] = useState<string | null>(null);
  const [commentsOpenId, setCommentsOpenId] = useState<string | null>(null);
  const [lyricsDraft, setLyricsDraft] = useState<Draft | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "board">(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("maquetas-view-mode") as "list" | "board") || "list"
      : "list"
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "az" | "pipeline" | "newest" | "oldest">(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("maquetas-sort") as "default" | "az" | "pipeline" | "newest" | "oldest") || "default"
      : "default"
  );
  const [missingAudioFilter, setMissingAudioFilter] = useState(false);
  const [missingBpmFilter, setMissingBpmFilter] = useState(false);
  const [staleFilter, setStaleFilter] = useState(false);
  const [producerFilter, setProducerFilter] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(searchQuery, 280);

  const [activeTab, setActiveTab] = useState<"todas" | "favoritas">("todas");
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("maquetas_favorites") ?? "[]")); }
    catch { return new Set(); }
  });

  function toggleFavorite(id: string) {
    setFavoritedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      localStorage.setItem("maquetas_favorites", JSON.stringify(Array.from(next)));
      return next;
    });
  }

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let result;
      if (debouncedSearch.trim()) {
        result = await searchDrafts(debouncedSearch.trim());
      } else {
        result = await getDrafts(
          statusFilter !== "todos" ? statusFilter : undefined
        );
      }

      if (result.error) {
        setError(result.error);
        setDrafts([]);
      } else {
        setDrafts(result.data ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar maquetas");
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch]);

  // ?new=1 deep-link; ?status=<status> pre-filters; ?draft=<id> highlights and expands the matching draft row
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditingDraft(undefined);
      setShowForm(true);
    }
    const statusParam = searchParams.get("status") as DraftStatus | null;
    const validStatuses: DraftStatus[] = ["borrador", "en_mezcla", "masterizada", "lista_para_publicar"];
    if (statusParam && validStatuses.includes(statusParam)) {
      setStatusFilter(statusParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deepLinkDraftId = searchParams.get("draft");
  const deepLinkAppliedRef = useRef(false);
  useEffect(() => {
    if (!deepLinkDraftId || drafts.length === 0 || deepLinkAppliedRef.current) return;
    const found = drafts.find((d) => d.id === deepLinkDraftId);
    if (found) {
      deepLinkAppliedRef.current = true;
      setVersionsOpenId(deepLinkDraftId);
      // Scroll the row into view after render
      setTimeout(() => {
        document.getElementById(`draft-row-${deepLinkDraftId}`)?.scrollIntoView({
          behavior: "smooth", block: "center",
        });
      }, 150);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts, deepLinkDraftId]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  // Keyboard shortcuts: N = nueva maqueta, / = focus search, E = export, V = toggle view
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
        setEditingDraft(undefined);
        setShowForm(true);
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

  // Persist view mode + sort to localStorage
  useEffect(() => { localStorage.setItem("maquetas-view-mode", viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem("maquetas-sort", sortBy); }, [sortBy]);

  // Escape closes open side panels (versions / comments)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (versionsOpenId) { setVersionsOpenId(null); return; }
      if (commentsOpenId) { setCommentsOpenId(null); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [versionsOpenId, commentsOpenId]);

  function draftToTrack(d: Draft) {
    const audioUrl = d.drive_file_id
      ? `/api/drive/stream/${d.drive_file_id}`
      : d.drive_file_url!;
    return {
      id: d.id,
      title: d.title,
      artist: d.producer ?? "Sin productor",
      url: audioUrl,
      coverArt: d.cover_art_url ?? undefined,
      bpm: d.bpm ?? undefined,
      keySignature: d.key_signature ?? undefined,
    };
  }

  function handlePlayDraft(draft: Draft) {
    if (!draft.drive_file_id && !draft.drive_file_url) return;
    // Toggle pause if this track is already playing
    if (player.currentTrack?.id === draft.id && player.isPlaying) {
      player.pause();
      return;
    }
    // Play only this single track — use "Reproducir todo" to load the full queue
    player.play(draftToTrack(draft));
  }

  function handlePlayAll() {
    const playable = displayedDrafts.filter(d => !!d.drive_file_id || !!d.drive_file_url);
    if (playable.length === 0) return;
    player.play(draftToTrack(playable[0]), playable.map(draftToTrack));
  }

  async function handleAdvanceStatus(draft: Draft) {
    const next = STATUS_NEXT[draft.status];
    if (!next) return;
    setUpdatingStatusId(draft.id);
    const result = await updateDraftStatus(draft.id, next);
    if (!result.error && result.data) {
      setDrafts((prev) =>
        prev.map((d) => (d.id === draft.id ? result.data! : d))
      );
      toast.success(`Estado actualizado: ${translateDraftStatus(next)}`);
    }
    setUpdatingStatusId(null);
  }

  async function handleDelete(draft: Draft) {
    if (!await confirm({ title: `¿Eliminar "${draft.title}"?`, message: "Esta acción no se puede deshacer.", confirmLabel: "Eliminar" })) return;
    setDeletingId(draft.id);
    const { error } = await deleteDraft(draft.id);
    if (error) toast.error(error);
    else {
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
      toast.success(`"${draft.title}" eliminada`);
    }
    setDeletingId(null);
  }

  function handleSaved(saved: Draft) {
    setShowForm(false);
    setEditingDraft(undefined);
    setDrafts((prev) => {
      const idx = prev.findIndex((d) => d.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  }

  function handlePublished(song: Song) {
    setPublishingDraft(null);
    if (publishingDraft) {
      setDrafts((prev) => prev.filter((d) => d.id !== publishingDraft.id));
    }
  }

  const counts = drafts.reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1;
    return acc;
  }, {});

  const PIPELINE_ORDER: DraftStatus[] = ["borrador", "en_mezcla", "masterizada", "lista_para_publicar"];

  const MONTHS_ES_LONG = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  function formatMonthLabel(monthStr: string): string {
    // monthStr is "YYYY-MM"
    const [y, m] = monthStr.split("-");
    const idx = parseInt(m, 10) - 1;
    return `${MONTHS_ES_LONG[idx] ?? m} ${y}`;
  }


  const uniqueProducers = Array.from(new Set(drafts.filter(d => d.producer).map(d => d.producer!))).sort((a, b) => a.localeCompare(b, "es"));

  const isSearching = debouncedSearch.trim().length > 0;

  const displayedDrafts = (() => {
    let result = [...drafts];
    // Favorites filter — applied first, skips year filter
    if (activeTab === "favoritas") {
      result = result.filter(d => favoritedIds.has(d.id));
    }
    // Year filter — only when not searching and not on favorites tab
    if (!isSearching && activeTab !== "favoritas") {
      result = result.filter(d =>
        d.month_created ? d.month_created.startsWith(String(selectedYear)) : false
      );
    }
    if (missingAudioFilter) {
      result = result.filter(d => !d.drive_file_id && !d.drive_file_url);
    }
    if (missingBpmFilter) {
      result = result.filter(d => (!!d.drive_file_id || !!d.drive_file_url) && (!d.bpm || !d.key_signature));
    }
    if (staleFilter) {
      result = result.filter(d =>
        d.status === "borrador" && d.month_created != null &&
        (Date.now() - new Date(d.month_created + "-01").getTime()) > 180 * 86_400_000
      );
    }
    if (producerFilter) {
      result = result.filter(d => d.producer === producerFilter);
    }
    if (sortBy === "az") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "pipeline") {
      result.sort((a, b) => PIPELINE_ORDER.indexOf(b.status) - PIPELINE_ORDER.indexOf(a.status));
    } else if (sortBy === "newest") {
      result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    } else if (sortBy === "oldest") {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    return result;
  })();

  // Group by month_created for the "Recientes" view
  const showMonthGroups = sortBy === "default" && !isSearching && statusFilter === "todos" && !missingAudioFilter && !missingBpmFilter && !staleFilter && activeTab === "todas";
  const draftsByMonth: { month: string; label: string; drafts: Draft[] }[] = [];
  if (showMonthGroups) {
    const seen = new Map<string, Draft[]>();
    for (const d of displayedDrafts) {
      const key = d.month_created ?? "Sin fecha";
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key)!.push(d);
    }
    seen.forEach((items, month) => {
      draftsByMonth.push({ month, label: month === "Sin fecha" ? "Sin fecha" : formatMonthLabel(month), drafts: items });
    });
    draftsByMonth.sort((a, b) => b.month.localeCompare(a.month));
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const visible = displayedDrafts.map(d => d.id);
    const allSelected = visible.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visible));
    }
  }

  async function handleBulkDelete() {
    if (!await confirm({
      title: `¿Eliminar ${selectedIds.size} maqueta${selectedIds.size !== 1 ? "s" : ""}?`,
      message: "Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar todas",
    })) return;
    setBulkActionLoading(true);
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map(id => deleteDraft(id)));
    setDrafts(prev => prev.filter(d => !selectedIds.has(d.id)));
    setSelectedIds(new Set());
    toast.success(`${ids.length} maqueta${ids.length !== 1 ? "s" : ""} eliminada${ids.length !== 1 ? "s" : ""}`);
    setBulkActionLoading(false);
  }

  async function handleBulkAdvanceStatus() {
    setBulkActionLoading(true);
    const ids = Array.from(selectedIds);
    const updates = ids.map(async (id) => {
      const draft = drafts.find(d => d.id === id);
      if (!draft) return;
      const next = STATUS_NEXT[draft.status];
      if (!next) return;
      const result = await updateDraftStatus(id, next);
      if (result.data) setDrafts(prev => prev.map(d => d.id === id ? result.data! : d));
    });
    await Promise.all(updates);
    setSelectedIds(new Set());
    toast.success(`Estado avanzado en ${ids.length} maqueta${ids.length !== 1 ? "s" : ""}`);
    setBulkActionLoading(false);
  }

  function handleBulkExport() {
    const selected = displayedDrafts.filter(d => selectedIds.has(d.id));
    if (selected.length === 0) return;
    const headers = ["Título", "Productor", "Status", "Fecha", "Notas"];
    const rows = selected.map(d => [
      d.title, d.producer ?? "", translateDraftStatus(d.status),
      d.updated_at ? new Date(d.updated_at).toLocaleDateString("es-ES") : "", d.notes ?? "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "maquetas-seleccion.csv"; a.click();
    URL.revokeObjectURL(url);
    setSelectedIds(new Set());
  }

  function handleExportCSV() {
    if (displayedDrafts.length === 0) return;
    const headers = ["Título", "Productor", "Status", "Fecha actualización", "Notas"];
    const rows = displayedDrafts.map((d) => [
      d.title,
      d.producer ?? "",
      translateDraftStatus(d.status),
      d.updated_at ? new Date(d.updated_at).toLocaleDateString("es-ES") : "",
      d.notes ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "maquetas.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-premium relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent" />
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-blue-500/8 rounded-full blur-3xl" />
        <div className="relative px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/30 to-blue-600/8 border border-blue-500/25 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_hsl(220_80%_60%/0.18)]">
              <FileAudio className="h-6 w-6 text-blue-400 drop-shadow-[0_0_6px_hsl(220_80%_60%/0.5)]" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight gradient-text">Maquetas</h1>
              <p className="text-muted-foreground text-xs mt-0.5">
                {!loading && drafts.length > 0 ? (
                  <>
                    <span className="tabular-nums text-foreground/60 font-medium">{drafts.length}</span>
                    {" "}maqueta{drafts.length !== 1 ? "s" : ""}
                    {(() => {
                      const withAudio = drafts.filter(d => !!d.drive_file_id || !!d.drive_file_url).length;
                      return withAudio > 0
                        ? <> · <span className="tabular-nums">{withAudio}</span> con audio</>
                        : null;
                    })()}
                  </>
                ) : "Canciones en progreso"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Export CSV */}
            {!loading && drafts.length > 0 && (
              <button
                onClick={handleExportCSV}
                title="Exportar maquetas a CSV (E)"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all active:scale-95"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
              </button>
            )}
            {/* Play all */}
            {!loading && drafts.filter(d => !!d.drive_file_id || !!d.drive_file_url).length > 0 && (
              <button
                onClick={handlePlayAll}
                title="Reproducir todos los que tienen audio"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all active:scale-95"
              >
                <ListMusic className="h-4 w-4" />
                <span className="hidden sm:inline">Reproducir todo</span>
              </button>
            )}
            {/* View toggle */}
            <div className="flex rounded-xl border border-border/60 overflow-hidden bg-background/30">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2 transition-all active:scale-95",
                  viewMode === "list"
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                )}
                title="Vista lista (V)"
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("board")}
                className={cn(
                  "p-2 transition-all active:scale-95",
                  viewMode === "board"
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                )}
                title="Vista tablero (V)"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={() => {
                setEditingDraft(undefined);
                setShowForm(true);
              }}
              className="btn-shine flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 hover:scale-[1.02] transition-all active:scale-95 text-sm font-black shadow-[0_0_20px_hsl(var(--primary)/0.35)]"
            >
              <Plus className="h-4 w-4" />
              Nueva
              <kbd className="hidden md:inline-flex ml-0.5 text-[9px] bg-primary-foreground/15 px-1 py-0.5 rounded font-mono">N</kbd>
            </button>
          </div>
        </div>
      </div>


      {/* Tabs: Todas / Favoritas */}
      <div className="flex items-center gap-1 bg-secondary/40 rounded-2xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("todas")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-medium transition-all active:scale-95",
            activeTab === "todas"
              ? "bg-card shadow-sm text-foreground font-black border border-border/40"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <FileAudio className="h-3.5 w-3.5" />
          Todas
          <span className="text-[10px] tabular-nums px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
            {drafts.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("favoritas")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-medium transition-all active:scale-95",
            activeTab === "favoritas"
              ? "bg-card shadow-sm text-pink-400 font-black border border-pink-500/30"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Heart className={cn("h-3.5 w-3.5", activeTab === "favoritas" && "fill-pink-400 text-pink-400")} />
          Favoritas
          {favoritedIds.size > 0 && (
            <span className={cn(
              "text-[10px] tabular-nums px-1.5 py-0.5 rounded-full",
              activeTab === "favoritas"
                ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                : "bg-secondary text-muted-foreground"
            )}>
              {favoritedIds.size}
            </span>
          )}
        </button>
      </div>

      {/* Lista para publicar alert */}
      {!loading && !error && (counts["lista_para_publicar"] ?? 0) > 0 && statusFilter !== "lista_para_publicar" && activeTab === "todas" && (
        <button
          onClick={() => setStatusFilter("lista_para_publicar")}
          className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-green-500/10 border border-green-500/30 hover:bg-green-500/15 hover:-translate-y-0.5 hover:shadow-sm transition-all w-full group"
        >
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-green-400 flex-shrink-0" />
            <p className="text-sm font-medium text-green-400">
              {counts["lista_para_publicar"]} maqueta{counts["lista_para_publicar"] !== 1 ? "s" : ""} lista{counts["lista_para_publicar"] !== 1 ? "s" : ""} para publicar
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-green-400 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Tabs de años */}
      {!isSearching && activeTab === "todas" && (
        <div className="flex items-center gap-3">
          {/* Select all toggle */}
          {!loading && displayedDrafts.length > 0 && (
            <button
              onClick={toggleSelectAll}
              title={displayedDrafts.every(d => selectedIds.has(d.id)) ? "Deseleccionar todo" : "Seleccionar todo"}
              className="flex-shrink-0 text-muted-foreground hover:text-primary transition-all active:scale-95"
            >
              {displayedDrafts.every(d => selectedIds.has(d.id))
                ? <CheckSquare className="h-4 w-4 text-primary" />
                : <Square className="h-4 w-4" />}
            </button>
          )}
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
            {DRAFT_YEARS.map((year) => {
              const count = drafts.filter(d => d.month_created?.startsWith(String(year))).length;
              return (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95",
                    selectedYear === year
                      ? "bg-blue-500/25 text-blue-400 font-black shadow-[0_2px_10px_hsl(220_80%_60%/0.2),inset_0_1px_0_hsl(0_0%_100%/0.08)] border border-blue-500/25"
                      : "bg-secondary text-muted-foreground hover:text-foreground border border-transparent"
                  )}
                >
                  {year}
                  {count > 0 && (
                    <span className={cn("ml-1.5 text-xs tabular-nums", selectedYear === year ? "opacity-80" : "opacity-50")}>
                      ({count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {!loading && (
            <span className="stat-badge flex-shrink-0 text-muted-foreground">
              {displayedDrafts.length} maqueta{displayedDrafts.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Buscar maqueta o productor… (/)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-3 bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary/35 focus:bg-card/80 transition-all placeholder:text-muted-foreground/35"
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

      {/* Filter chips */}
      {!loading && !isSearching && drafts.length > 0 && (() => {
        const withoutAudio = drafts.filter(d => !d.drive_file_id && !d.drive_file_url).length;
        const withoutBpm = drafts.filter(d => (!!d.drive_file_id || !!d.drive_file_url) && (!d.bpm || !d.key_signature)).length;
        const staleCount = drafts.filter(d =>
          d.status === "borrador" && d.month_created != null &&
          (Date.now() - new Date(d.month_created + "-01").getTime()) > 180 * 86_400_000
        ).length;
        if (withoutAudio === 0 && withoutBpm === 0 && staleCount === 0) return null;
        return (
          <div className="flex items-center gap-2 flex-wrap">
            {withoutAudio > 0 && (
              <button
                onClick={() => { setMissingAudioFilter(!missingAudioFilter); setMissingBpmFilter(false); setStaleFilter(false); }}
                className={cn(
                  "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full transition-all active:scale-95",
                  missingAudioFilter
                    ? "bg-orange-500/18 text-orange-400 border border-orange-500/40 font-black shadow-[0_0_10px_hsl(30_80%_50%/0.15)]"
                    : "bg-secondary text-muted-foreground hover:text-foreground font-medium"
                )}
              >
                <FileAudio className="h-3 w-3 flex-shrink-0" />
                {withoutAudio} sin audio
                {missingAudioFilter && <X className="h-2.5 w-2.5 ml-0.5 opacity-70" />}
              </button>
            )}
            {withoutBpm > 0 && (
              <button
                onClick={() => { setMissingBpmFilter(!missingBpmFilter); setMissingAudioFilter(false); setStaleFilter(false); }}
                className={cn(
                  "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full transition-all active:scale-95",
                  missingBpmFilter
                    ? "bg-violet-500/18 text-violet-400 border border-violet-500/40 font-black shadow-[0_0_10px_hsl(260_80%_60%/0.15)]"
                    : "bg-secondary text-muted-foreground hover:text-foreground font-medium"
                )}
              >
                <Zap className="h-3 w-3 flex-shrink-0" />
                {withoutBpm} sin BPM/key
                {missingBpmFilter && <X className="h-2.5 w-2.5 ml-0.5 opacity-70" />}
              </button>
            )}
            {staleCount > 0 && (
              <button
                onClick={() => { setStaleFilter(!staleFilter); setMissingAudioFilter(false); setMissingBpmFilter(false); }}
                className={cn(
                  "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full transition-all active:scale-95",
                  staleFilter
                    ? "bg-orange-500/18 text-orange-400 border border-orange-500/40 font-black shadow-[0_0_10px_hsl(25_80%_50%/0.15)]"
                    : "bg-secondary text-muted-foreground hover:text-foreground font-medium"
                )}
              >
                <Clock className="h-3 w-3 flex-shrink-0" />
                {staleCount} estancadas
                {staleFilter && <X className="h-2.5 w-2.5 ml-0.5 opacity-70" />}
              </button>
            )}
          </div>
        );
      })()}

      {/* Vista Tablero */}
      {viewMode === "board" && !loading && !error && (
        <DraftKanbanBoard
          drafts={displayedDrafts}
          onEdit={(d) => { setEditingDraft(d); setShowForm(true); }}
          onDelete={handleDelete}
          onPublish={(d) => setPublishingDraft(d)}
          onStatusChange={(draft, newStatus) => {
            setDrafts((prev) =>
              prev.map((d) => d.id === draft.id ? { ...d, status: newStatus } : d)
            );
          }}
        />
      )}

      {/* Vista Lista */}
      <div className={cn("card-premium rounded-2xl overflow-hidden", viewMode === "board" ? "hidden" : "")}>
        {loading ? (
          <div>
            {Array.from({ length: 6 }).map((_, i) => <SongRowSkeleton key={i} />)}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={loadDrafts}
              className="mt-3 text-sm text-primary hover:underline"
            >
              Reintentar
            </button>
          </div>
        ) : activeTab === "favoritas" && favoritedIds.size === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="relative mb-5 empty-state-icon">
              <div className="absolute inset-0 bg-pink-500/20 rounded-2xl blur-xl scale-125" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-pink-700/10 border border-pink-500/20 flex items-center justify-center">
                <Heart className="h-8 w-8 text-pink-400/60" />
              </div>
            </div>
            <p className="text-sm font-medium text-foreground/70">Sin favoritas todavía</p>
            <p className="text-xs text-muted-foreground/50 mt-1">
              Tocá el ❤ en cualquier maqueta para guardarla aquí
            </p>
            <button
              onClick={() => setActiveTab("todas")}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-pink-500/10 border border-pink-500/25 text-pink-400 rounded-2xl text-sm font-medium hover:bg-pink-500/20 transition-all active:scale-95"
            >
              <FileAudio className="h-4 w-4" />
              Ver todas las maquetas
            </button>
          </div>
        ) : drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="relative mb-5 empty-state-icon">
              <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl scale-125" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-700/10 border border-blue-500/20 flex items-center justify-center">
                <FileAudio className="h-8 w-8 text-blue-400/60" />
              </div>
            </div>
            <p className="text-sm font-medium text-foreground/70">
              {missingAudioFilter
                ? "¡Todas las maquetas tienen audio!"
                : producerFilter
                ? `Sin maquetas de ${producerFilter}`
                : searchQuery
                ? `Sin resultados para "${searchQuery}"`
                : "No hay maquetas todavía"}
            </p>
            <p className="text-xs text-muted-foreground/50 mt-1">
              {missingAudioFilter ? "Buen trabajo 🎵" : searchQuery ? "Probá con otro término" : "Empezá a registrar tus canciones en progreso"}
            </p>
            {missingAudioFilter ? (
              <button onClick={() => setMissingAudioFilter(false)} className="mt-4 text-xs text-primary hover:text-primary/80 transition-all active:scale-95">
                Ver todas las maquetas
              </button>
            ) : producerFilter ? (
              <button onClick={() => setProducerFilter(null)} className="mt-4 text-xs text-primary hover:text-primary/80 transition-all active:scale-95">
                Ver todas las maquetas
              </button>
            ) : !searchQuery && (
              <button
                onClick={() => { setEditingDraft(undefined); setShowForm(true); }}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/25 text-primary rounded-2xl text-sm font-medium hover:bg-primary/20 transition-all active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Nueva maqueta
              </button>
            )}
          </div>
        ) : (
          <div>
            {showMonthGroups ? (
              // Grouped by month view
              draftsByMonth.map(({ month, label, drafts: groupDrafts }) => (
                <div key={month}>
                  <div className="section-group-header">
                    <span className="section-group-header-label">{label}</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-border/50 to-transparent" />
                    <span className="text-[10px] text-muted-foreground/70 bg-secondary/80 border border-border/40 px-2 py-0.5 rounded-full tabular-nums font-bold">
                      {groupDrafts.length}
                    </span>
                  </div>
                  <div className="divide-y divide-border/50">
                    {groupDrafts.map((draft) => (
                      <div key={draft.id} id={`draft-row-${draft.id}`} className="row-interactive">
                        <DraftRow
                          draft={draft}
                          isPlaying={player.currentTrack?.id === draft.id && player.isPlaying}
                          isDeleting={deletingId === draft.id}
                          isUpdatingStatus={updatingStatusId === draft.id}
                          versionsOpen={versionsOpenId === draft.id}
                          commentsOpen={commentsOpenId === draft.id}
                          selected={selectedIds.has(draft.id)}
                          anySelected={selectedIds.size > 0}
                          onSelect={() => toggleSelect(draft.id)}
                          onPlay={() => handlePlayDraft(draft)}
                          onEdit={() => { setEditingDraft(draft); setShowForm(true); }}
                          onDelete={() => handleDelete(draft)}
                          onAdvanceStatus={() => handleAdvanceStatus(draft)}
                          onPublish={() => setPublishingDraft(draft)}
                          onToggleVersions={() => setVersionsOpenId((prev) => prev === draft.id ? null : draft.id)}
                          onToggleComments={() => setCommentsOpenId((prev) => prev === draft.id ? null : draft.id)}
                          onOpenLyrics={() => setLyricsDraft(draft)}
                          onAddToQueue={() => { player.addToQueue(draftToTrack(draft)); toast.success(`"${draft.title}" añadida a la cola`); }}
                          isFavorited={favoritedIds.has(draft.id)}
                          onToggleFavorite={() => toggleFavorite(draft.id)}
                        />
                        {versionsOpenId === draft.id && (
                          <DraftVersionsPanel draftId={draft.id} draftTitle={draft.title} />
                        )}
                        {commentsOpenId === draft.id && (
                          <div className="border-t border-border/60 max-h-96 overflow-hidden flex flex-col">
                            <CommentsPanel draft_id={draft.id} currentUserId={user?.id} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              // Flat list (when filtering / sorting differently)
              <div className="divide-y divide-border/50">
                {displayedDrafts.map((draft) => (
                  <div key={draft.id} id={`draft-row-${draft.id}`}>
                    <DraftRow
                      draft={draft}
                      isPlaying={player.currentTrack?.id === draft.id && player.isPlaying}
                      isDeleting={deletingId === draft.id}
                      isUpdatingStatus={updatingStatusId === draft.id}
                      versionsOpen={versionsOpenId === draft.id}
                      commentsOpen={commentsOpenId === draft.id}
                      selected={selectedIds.has(draft.id)}
                      anySelected={selectedIds.size > 0}
                      onSelect={() => toggleSelect(draft.id)}
                      onPlay={() => handlePlayDraft(draft)}
                      onEdit={() => { setEditingDraft(draft); setShowForm(true); }}
                      onDelete={() => handleDelete(draft)}
                      onAdvanceStatus={() => handleAdvanceStatus(draft)}
                      onPublish={() => setPublishingDraft(draft)}
                      onToggleVersions={() => setVersionsOpenId((prev) => prev === draft.id ? null : draft.id)}
                      onToggleComments={() => setCommentsOpenId((prev) => prev === draft.id ? null : draft.id)}
                      onOpenLyrics={() => setLyricsDraft(draft)}
                      isFavorited={favoritedIds.has(draft.id)}
                      onToggleFavorite={() => toggleFavorite(draft.id)}
                    />
                    {versionsOpenId === draft.id && (
                      <DraftVersionsPanel draftId={draft.id} draftTitle={draft.title} />
                    )}
                    {commentsOpenId === draft.id && (
                      <div className="border-t border-border/60 max-h-96 overflow-hidden flex flex-col">
                        <CommentsPanel draft_id={draft.id} currentUserId={user?.id} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk action floating bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="flex items-center gap-2 px-4 py-3 glass-panel rounded-2xl">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-all active:scale-95"
              title="Deseleccionar todo"
            >
              <X className="h-4 w-4" />
            </button>
            <span className="text-sm font-black tabular-nums text-primary mr-1">
              {selectedIds.size} seleccionada{selectedIds.size !== 1 ? "s" : ""}
            </span>
            <div className="w-px h-5 bg-border/60" />
            <button
              onClick={handleBulkAdvanceStatus}
              disabled={bulkActionLoading}
              title="Avanzar estado de todas"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 text-xs font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5 rotate-[-90deg]" />}
              Avanzar estado
            </button>
            <button
              onClick={handleBulkExport}
              disabled={bulkActionLoading}
              title="Exportar seleccionadas a CSV"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 text-xs font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkActionLoading}
              title="Eliminar seleccionadas"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </button>
          </div>
        </div>
      )}

      {ConfirmDialog}

      {/* Modales */}
      {showForm && (
        <DraftForm
          draft={editingDraft}
          onClose={() => {
            setShowForm(false);
            setEditingDraft(undefined);
          }}
          onSaved={handleSaved}
        />
      )}

      {publishingDraft && (
        <PublishDraftModal
          draft={publishingDraft}
          artistName={profile?.full_name ?? undefined}
          onClose={() => setPublishingDraft(null)}
          onPublished={handlePublished}
        />
      )}

      {/* Panel de letras */}
      {lyricsDraft && (
        <LyricsPanel
          type="draft"
          id={lyricsDraft.id}
          title={lyricsDraft.title}
          artist={lyricsDraft.producer ?? undefined}
          initialLyrics={lyricsDraft.lyrics}
          onClose={() => setLyricsDraft(null)}
          onSaved={(newLyrics) => {
            setDrafts((prev) =>
              prev.map((d) =>
                d.id === lyricsDraft.id ? { ...d, lyrics: newLyrics } : d
              )
            );
            setLyricsDraft((prev) => prev ? { ...prev, lyrics: newLyrics } : prev);
          }}
        />
      )}
    </div>
  );
}

interface DraftRowProps {
  draft: Draft;
  isPlaying: boolean;
  isDeleting: boolean;
  isUpdatingStatus: boolean;
  versionsOpen: boolean;
  commentsOpen: boolean;
  selected: boolean;
  anySelected: boolean;
  onSelect: () => void;
  onPlay: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAdvanceStatus: () => void;
  onPublish: () => void;
  onToggleVersions: () => void;
  onToggleComments: () => void;
  onOpenLyrics: () => void;
  onAddToQueue?: () => void;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}

function DraftRow({
  draft,
  isPlaying,
  isDeleting,
  isUpdatingStatus,
  versionsOpen,
  commentsOpen,
  selected,
  anySelected,
  onSelect,
  onPlay,
  onEdit,
  onDelete,
  onAdvanceStatus,
  onPublish,
  onToggleVersions,
  onToggleComments,
  onOpenLyrics,
  onAddToQueue,
  isFavorited,
  onToggleFavorite,
}: DraftRowProps) {
  const hasAudio = !!draft.drive_file_id || !!draft.drive_file_url;
  const canAdvance = STATUS_NEXT[draft.status] !== null;
  const isReady = draft.status === "lista_para_publicar";
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  function handleCopyLink() {
    const url = `${window.location.origin}/maquetas?draft=${draft.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  return (
    <div
      className={cn(
        "border-l-2 transition-all group",
        selected
          ? "bg-primary/5 border-l-primary/60"
          : isPlaying
            ? "row-is-playing border-l-primary"
            : STATUS_LEFT_BORDER[draft.status],
        !selected && !isPlaying && "row-hover",
      )}
    >
    <div className="flex items-center gap-3 px-4 py-3.5">
      {/* Checkbox de selección */}
      <button
        onClick={onSelect}
        className={cn(
          "flex-shrink-0 transition-all duration-150",
          anySelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          "text-muted-foreground hover:text-primary"
        )}
        title={selected ? "Deseleccionar" : "Seleccionar"}
      >
        {selected
          ? <CheckSquare className="h-4 w-4 text-primary" />
          : <Square className="h-4 w-4" />}
      </button>
      {/* Cover art thumbnail / Play button */}
      <div className={cn(
        "w-11 h-11 flex-shrink-0 relative rounded-xl overflow-hidden flex items-center justify-center",
        draft.cover_art_url
          ? "border border-border/60"
          : `bg-gradient-to-br ${STATUS_GRADIENT_THUMB[draft.status]} border border-white/5`
      )}>
        {draft.cover_art_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={draft.cover_art_url} alt="" className="w-full h-full object-cover" />
        ) : (
          /* Waveform decorativo — barras centradas, 2 mitades (arriba/abajo), animadas si reproduce */
          <div className="flex flex-col items-center justify-center gap-[1px] w-full h-full px-1">
            {/* Mitad superior */}
            <div className="flex gap-[1.5px] items-end">
              {WAVEFORM_BARS.map((h, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-[2px] rounded-t-full",
                    isPlaying
                      ? cn("waveform-bar-animated", STATUS_WAVEFORM_COLOR[draft.status])
                      : cn("opacity-70", STATUS_WAVEFORM_COLOR[draft.status])
                  )}
                  style={{
                    height: `${Math.round(h * 0.62)}px`,
                    animationDelay: isPlaying ? `${i * 60}ms` : undefined,
                    boxShadow: isPlaying ? `0 0 4px currentColor` : undefined,
                  }}
                />
              ))}
            </div>
            {/* Línea central */}
            <div className={cn("w-full h-px opacity-30", STATUS_WAVEFORM_COLOR[draft.status])} />
            {/* Mitad inferior (espejo, 40% de altura) */}
            <div className="flex gap-[1.5px] items-start">
              {WAVEFORM_BARS.map((h, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-[2px] rounded-b-full opacity-40",
                    STATUS_WAVEFORM_COLOR[draft.status]
                  )}
                  style={{ height: `${Math.round(h * 0.30)}px` }}
                />
              ))}
            </div>
          </div>
        )}
        {/* Play overlay */}
        {hasAudio && (
          <button
            onClick={onPlay}
            title={isPlaying ? "Pausar" : "Reproducir"}
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-all",
              isPlaying
                ? "bg-primary/90 text-primary-foreground"
                : "bg-black/0 group-hover:bg-black/60 text-transparent group-hover:text-white"
            )}
          >
            {isPlaying
              ? <Pause className="h-3 w-3" />
              : <Play className="h-3 w-3 ml-0.5" />}
          </button>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-[13px] font-black truncate leading-tight",
            isPlaying ? "text-primary" : "text-foreground/90"
          )}
        >
          {draft.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {draft.producer && (
            <span className="text-[11px] text-muted-foreground/70 truncate">
              {draft.producer}
            </span>
          )}
          {draft.bpm && (
            <span className="meta-chip meta-chip-bpm" title="BPM">
              {draft.bpm} BPM
            </span>
          )}
          {draft.key_signature && (
            <span className="meta-chip meta-chip-key" title="Tonalidad">
              {draft.key_signature}
            </span>
          )}
          <span className="text-xs text-muted-foreground/50" title={draft.month_created}>
            {relativeMonthAge(draft.month_created)}
          </span>
          {(() => {
            const daysSinceUpdate = Math.floor((Date.now() - new Date(draft.updated_at).getTime()) / 86_400_000);
            // Show "updated" badge only when recently modified (within 7 days) and not just created
            const daysSinceCreate = Math.floor((Date.now() - new Date(draft.created_at).getTime()) / 86_400_000);
            if (daysSinceUpdate > 7 || daysSinceUpdate >= daysSinceCreate) return null;
            const label = daysSinceUpdate === 0 ? "hoy" : daysSinceUpdate === 1 ? "ayer" : `hace ${daysSinceUpdate}d`;
            return (
              <span
                className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full"
                title={`Última actualización: ${new Date(draft.updated_at).toLocaleString("es-AR")}`}
              >
                ↑ {label}
              </span>
            );
          })()}
          {(() => {
            const daysSince = Math.floor((Date.now() - new Date(draft.updated_at).getTime()) / 86_400_000);
            if (daysSince < 60 || draft.status === "lista_para_publicar") return null;
            return (
              <span
                className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded-full flex-shrink-0"
                title={`Sin actualizar hace ${daysSince} días`}
              >
                ⏸ {daysSince}d
              </span>
            );
          })()}
        </div>
      </div>

      {/* Pipeline micro-steps */}
      <div className="hidden sm:flex items-center gap-[5px] flex-shrink-0 mr-1">
        {(["borrador","en_mezcla","masterizada","lista_para_publicar"] as DraftStatus[]).map((s, i) => {
          const stepIdx = ["borrador","en_mezcla","masterizada","lista_para_publicar"].indexOf(draft.status);
          const isDone    = i <= stepIdx;
          const isCurrent = i === stepIdx;
          return (
            <div
              key={s}
              title={s === "borrador" ? "Borrador" : s === "en_mezcla" ? "En mezcla" : s === "masterizada" ? "Masterizada" : "Lista para publicar"}
              className={cn(
                "rounded-full transition-all duration-300",
                isCurrent ? "w-2 h-2" : "w-1.5 h-1.5"
              )}
              style={isDone
                ? {
                    background: STATUS_BAR_COLOR[s],
                    boxShadow: isCurrent ? `0 0 5px ${STATUS_BAR_COLOR[s]}cc` : undefined,
                  }
                : { background: "rgba(255,255,255,0.12)" }
              }
            />
          );
        })}
      </div>

      {/* Estado */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {draft.status !== "borrador" && (
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[11px] font-medium border",
              STATUS_COLORS[draft.status]
            )}
          >
            {translateDraftStatus(draft.status)}
          </span>
        )}

        {/* Avanzar estado */}
        {canAdvance && (
          <button
            onClick={onAdvanceStatus}
            disabled={isUpdatingStatus}
            title={`Pasar a ${translateDraftStatus(STATUS_NEXT[draft.status]!)}`}
            className="hidden group-hover:flex p-1 rounded-xl hover:bg-secondary transition-all active:scale-95 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdatingStatus ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 rotate-[-90deg]" />
            )}
          </button>
        )}
      </div>

      {/* Publicar */}
      {isReady && (
        <button
          onClick={onPublish}
          className="hidden group-hover:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-green-600 text-white text-xs font-black hover:bg-green-700 transition-all active:scale-95 flex-shrink-0"
        >
          <Upload className="h-3 w-3" />
          Publicar
        </button>
      )}

      {/* Descarga — siempre visible cuando hay audio */}
      {hasAudio && (
        <a
          href={draft.drive_file_id
            ? `/api/drive/stream/${draft.drive_file_id}?dl=1&name=${encodeURIComponent(draft.title)}`
            : draft.drive_file_url!}
          download={draft.drive_file_id ? draft.title : undefined}
          target={draft.drive_file_id ? undefined : "_blank"}
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Descargar audio"
          className="flex-shrink-0 p-1.5 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all active:scale-95"
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
        </a>
      )}

      {/* Analizar BPM hint — solo si hay audio y faltan datos musicales */}
      {hasAudio && !draft.bpm && !draft.key_signature && (
        <a
          href="/analizar"
          onClick={(e) => e.stopPropagation()}
          title="Analizar BPM y tonalidad"
          className="hidden group-hover:flex items-center gap-1 px-2 py-1 rounded-xl bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-all active:scale-95 flex-shrink-0 text-[10px] font-medium"
        >
          <Zap className="h-3 w-3" />
          BPM
        </a>
      )}

      {/* Favorito */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        title={isFavorited ? "Quitar de favoritas" : "Añadir a favoritas"}
        className={cn(
          "flex-shrink-0 p-1.5 rounded-xl transition-all active:scale-90",
          isFavorited
            ? "text-pink-400 hover:text-pink-300"
            : "text-muted-foreground/25 hover:text-pink-400"
        )}
      >
        <Heart className={cn("h-3.5 w-3.5", isFavorited && "fill-current")} />
      </button>

      {/* Comentarios / Versiones / Copiar enlace / Letras / Editar / Eliminar */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {/* Add to queue */}
        {hasAudio && onAddToQueue && (
          <button
            onClick={onAddToQueue}
            title="Añadir a la cola"
            className="p-1.5 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all active:scale-95"
          >
            <ListPlus className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={onToggleComments}
          title="Comentarios"
          className={cn(
            "p-1.5 rounded-xl transition-all active:scale-95",
            commentsOpen
              ? "bg-primary/15 text-primary"
              : "hover:bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onToggleVersions}
          title="Versiones"
          className={cn(
            "p-1.5 rounded-xl transition-all active:scale-95",
            versionsOpen
              ? "bg-primary/15 text-primary"
              : "hover:bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          <History className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleCopyLink}
          title="Copiar enlace"
          className={cn(
            "p-1.5 rounded-xl hover:bg-secondary transition-all active:scale-95",
            linkCopied ? "text-green-400" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onOpenLyrics}
          className={cn(
            "p-1.5 rounded-xl transition-all active:scale-95",
            draft.lyrics
              ? "text-primary/70 hover:text-primary hover:bg-primary/10"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
          title={draft.lyrics ? "Ver / editar letra" : "Agregar letra"}
        >
          <FileText className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onEdit}
          className="p-1.5 rounded-xl hover:bg-secondary transition-all active:scale-95 text-muted-foreground hover:text-foreground"
          title="Editar"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="p-1.5 rounded-xl hover:bg-red-500/10 transition-all active:scale-95 text-muted-foreground hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Eliminar"
        >
          {isDeleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Notas badge */}
      {draft.notes && (
        <button
          onClick={() => setNotesExpanded(v => !v)}
          title={notesExpanded ? "Ocultar notas" : "Ver notas"}
          className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold transition-all active:scale-95",
            notesExpanded
              ? "bg-yellow-500 text-black"
              : "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/40"
          )}
        >
          N
        </button>
      )}
    </div>
    {/* Inline notes */}
    {draft.notes && notesExpanded && (
      <div className="px-4 pb-3 pl-14">
        <p className="text-xs text-muted-foreground bg-yellow-500/5 border border-yellow-500/15 rounded-2xl px-3 py-2 leading-relaxed">
          {draft.notes}
        </p>
      </div>
    )}
    </div>
  );
}
