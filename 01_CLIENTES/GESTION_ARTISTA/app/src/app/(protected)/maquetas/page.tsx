"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  ArrowUpDown,
  MessageSquare,
  Download,
  Copy,
  Check,
} from "lucide-react";
import DraftVersionsPanel from "@/components/drafts/DraftVersionsPanel";
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
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [sortBy, setSortBy] = useState<"default" | "az" | "pipeline" | "newest" | "oldest">("default");
  const [missingAudioFilter, setMissingAudioFilter] = useState(false);
  const [producerFilter, setProducerFilter] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let result;
      if (searchQuery.trim()) {
        result = await searchDrafts(searchQuery.trim());
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
  }, [statusFilter, searchQuery]);

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
    const timer = setTimeout(loadDrafts, searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadDrafts, searchQuery]);

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
    };
  }

  function handlePlayDraft(draft: Draft) {
    if (!draft.drive_file_id && !draft.drive_file_url) return;
    // Toggle pause if this track is already playing
    if (player.currentTrack?.id === draft.id && player.isPlaying) {
      player.pause();
      return;
    }
    const playable = displayedDrafts.filter(d => !!d.drive_file_id || !!d.drive_file_url);
    if (playable.length <= 1) {
      player.play(draftToTrack(draft));
    } else {
      player.play(draftToTrack(draft), playable.map(draftToTrack));
    }
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

  const isSearching = searchQuery.trim().length > 0;

  const displayedDrafts = (() => {
    let result = [...drafts];
    // Year filter — only when not searching
    if (!isSearching) {
      result = result.filter(d =>
        d.month_created ? d.month_created.startsWith(String(selectedYear)) : false
      );
    }
    if (missingAudioFilter) {
      result = result.filter(d => !d.drive_file_id && !d.drive_file_url);
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
  const showMonthGroups = sortBy === "default" && !isSearching && statusFilter === "todos" && !missingAudioFilter;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileAudio className="h-6 w-6 text-blue-400" />
            Maquetas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Canciones en progreso y sin publicar
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export CSV */}
          {!loading && drafts.length > 0 && (
            <button
              onClick={handleExportCSV}
              title="Exportar maquetas a CSV"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <ListMusic className="h-4 w-4" />
              <span className="hidden sm:inline">Reproducir todo</span>
            </button>
          )}
          {/* View toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "list"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
              title="Vista lista"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("board")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "board"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
              title="Vista tablero"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => {
              setEditingDraft(undefined);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 transition-colors text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Nueva maqueta
            <kbd className="hidden md:inline-flex ml-1 text-[9px] bg-primary/20 px-1 py-0.5 rounded font-mono">N</kbd>
          </button>
        </div>
      </div>

      {/* Pipeline bar — visible once drafts are loaded */}
      {!loading && !error && drafts.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          {/* Segmented progress bar */}
          <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
            {(["borrador","en_mezcla","masterizada","lista_para_publicar"] as DraftStatus[]).map((s) => {
              const pct = Math.round(((counts[s] ?? 0) / drafts.length) * 100);
              if (pct === 0) return null;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  title={`${translateDraftStatus(s)}: ${counts[s] ?? 0}`}
                  className="h-full transition-opacity hover:opacity-80"
                  style={{ width: `${pct}%`, background: STATUS_BAR_COLOR[s] }}
                />
              );
            })}
          </div>
          {/* Legend chips */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {(["borrador","en_mezcla","masterizada","lista_para_publicar"] as DraftStatus[]).map((s) => {
              const n = counts[s] ?? 0;
              if (n === 0) return null;
              const pct = Math.round((n / drafts.length) * 100);
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(statusFilter === s ? "todos" : s)}
                  className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_BAR_COLOR[s] }} />
                  <span className={statusFilter === s ? "font-semibold text-foreground" : "text-muted-foreground"}>
                    {translateDraftStatus(s)}
                  </span>
                  <span className="font-medium tabular-nums">{n}</span>
                  <span className="text-muted-foreground">({pct}%)</span>
                </button>
              );
            })}
          </div>
          {/* Quick stat chips */}
          {(() => {
            const withAudio = drafts.filter(d => !!d.drive_file_id || !!d.drive_file_url).length;
            const producers = new Set(drafts.filter(d => d.producer).map(d => d.producer!)).size;
            const thisMonth = (() => {
              const now = new Date();
              const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
              return drafts.filter(d => d.month_created === key).length;
            })();
            return (
              <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
                {withAudio > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Play className="h-3 w-3 text-blue-400" />
                    {withAudio} con audio
                  </span>
                )}
                {producers > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <ListMusic className="h-3 w-3" />
                    {producers} productor{producers !== 1 ? "es" : ""}
                  </span>
                )}
                {thisMonth > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <History className="h-3 w-3" />
                    {thisMonth} este mes
                  </span>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Lista para publicar alert */}
      {!loading && !error && (counts["lista_para_publicar"] ?? 0) > 0 && statusFilter !== "lista_para_publicar" && (
        <button
          onClick={() => setStatusFilter("lista_para_publicar")}
          className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/30 hover:bg-green-500/15 transition-colors w-full"
        >
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-green-400 flex-shrink-0" />
            <p className="text-sm font-medium text-green-400">
              {counts["lista_para_publicar"]} maqueta{counts["lista_para_publicar"] !== 1 ? "s" : ""} lista{counts["lista_para_publicar"] !== 1 ? "s" : ""} para publicar
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-green-400 flex-shrink-0" />
        </button>
      )}

      {/* Tabs de años */}
      {!isSearching && (
        <div className="flex items-center gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
            {DRAFT_YEARS.map((year) => {
              const count = drafts.filter(d => d.month_created?.startsWith(String(year))).length;
              return (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                    selectedYear === year
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
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
            <span className="flex-shrink-0 text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full tabular-nums">
              {displayedDrafts.length} maqueta{displayedDrafts.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar… (/) maqueta o productor"
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
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                statusFilter === s.value
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
              {s.value !== "todos" && counts[s.value] ? (
                <span className="ml-1.5 opacity-70">
                  ({counts[s.value]})
                </span>
              ) : null}
            </button>
          ))}
          {/* Missing audio chip */}
          {!loading && !error && (() => {
            const noAudioCount = drafts.filter(d => !d.drive_file_id && !d.drive_file_url).length;
            if (noAudioCount === 0) return null;
            return (
              <button
                onClick={() => setMissingAudioFilter(v => !v)}
                className={cn(
                  "flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg border transition-colors flex-shrink-0",
                  missingAudioFilter
                    ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                    : "bg-secondary border-0 text-muted-foreground hover:text-foreground"
                )}
                title="Filtrar maquetas sin archivo de audio"
              >
                <FileAudio className={cn("h-3.5 w-3.5", missingAudioFilter ? "text-orange-400" : "")} />
                <span>{noAudioCount} sin audio</span>
                {missingAudioFilter && <X className="h-3 w-3 ml-0.5 opacity-70" />}
              </button>
            );
          })()}
          {/* Producer chips — only when ≥2 distinct producers */}
          {!loading && !error && uniqueProducers.length >= 2 && uniqueProducers.map((producer) => (
            <button
              key={producer}
              onClick={() => setProducerFilter(producerFilter === producer ? null : producer)}
              className={cn(
                "flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg border transition-colors flex-shrink-0 whitespace-nowrap",
                producerFilter === producer
                  ? "bg-purple-500/15 border-purple-500/30 text-purple-400"
                  : "bg-secondary border-0 text-muted-foreground hover:text-foreground"
              )}
              title={`Filtrar por productor: ${producer}`}
            >
              <ListMusic className={cn("h-3.5 w-3.5", producerFilter === producer ? "text-purple-400" : "")} />
              <span>{producer}</span>
              {producerFilter === producer && <X className="h-3 w-3 ml-0.5 opacity-70" />}
            </button>
          ))}
          {/* Sort */}
          <div className="relative flex-shrink-0">
            <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="pl-8 pr-3 py-2 rounded-lg bg-secondary border-0 text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer appearance-none"
            >
              <option value="default">Por mes</option>
              <option value="newest">Actualizado</option>
              <option value="az">A → Z</option>
              <option value="pipeline">Por estado</option>
              <option value="oldest">Más antigua</option>
            </select>
          </div>
        </div>
      </div>

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
      <div className={cn("bg-card rounded-xl border border-border overflow-hidden", viewMode === "board" ? "hidden" : "")}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
        ) : drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <FileAudio className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">
              {missingAudioFilter
                ? "¡Todas las maquetas tienen audio! 🎵"
                : producerFilter
                ? `Sin maquetas de ${producerFilter}`
                : searchQuery
                ? `Sin resultados para "${searchQuery}"`
                : "No hay maquetas todavía"}
            </p>
            {missingAudioFilter ? (
              <button onClick={() => setMissingAudioFilter(false)} className="mt-3 text-xs text-primary hover:underline">
                Ver todas las maquetas
              </button>
            ) : producerFilter ? (
              <button onClick={() => setProducerFilter(null)} className="mt-3 text-xs text-primary hover:underline">
                Ver todas las maquetas
              </button>
            ) : !searchQuery && (
              <button
                onClick={() => {
                  setEditingDraft(undefined);
                  setShowForm(true);
                }}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Crear la primera
              </button>
            )}
          </div>
        ) : (
          <div>
            {showMonthGroups ? (
              // Grouped by month view
              draftsByMonth.map(({ month, label, drafts: groupDrafts }) => (
                <div key={month}>
                  <div className="px-4 py-2 bg-secondary/50 border-b border-border flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                    <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                      {groupDrafts.length} maqueta{groupDrafts.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {groupDrafts.map((draft) => (
                      <div key={draft.id} id={`draft-row-${draft.id}`} className="bg-card">
                        <DraftRow
                          draft={draft}
                          isPlaying={player.currentTrack?.id === draft.id && player.isPlaying}
                          isDeleting={deletingId === draft.id}
                          isUpdatingStatus={updatingStatusId === draft.id}
                          versionsOpen={versionsOpenId === draft.id}
                          commentsOpen={commentsOpenId === draft.id}
                          onPlay={() => handlePlayDraft(draft)}
                          onEdit={() => { setEditingDraft(draft); setShowForm(true); }}
                          onDelete={() => handleDelete(draft)}
                          onAdvanceStatus={() => handleAdvanceStatus(draft)}
                          onPublish={() => setPublishingDraft(draft)}
                          onToggleVersions={() => setVersionsOpenId((prev) => prev === draft.id ? null : draft.id)}
                          onToggleComments={() => setCommentsOpenId((prev) => prev === draft.id ? null : draft.id)}
                        />
                        {versionsOpenId === draft.id && (
                          <DraftVersionsPanel draftId={draft.id} draftTitle={draft.title} />
                        )}
                        {commentsOpenId === draft.id && (
                          <div className="border-t border-border max-h-96 overflow-hidden flex flex-col">
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
              <div className="divide-y divide-border">
                {displayedDrafts.map((draft) => (
                  <div key={draft.id} id={`draft-row-${draft.id}`} className="bg-card">
                    <DraftRow
                      draft={draft}
                      isPlaying={player.currentTrack?.id === draft.id && player.isPlaying}
                      isDeleting={deletingId === draft.id}
                      isUpdatingStatus={updatingStatusId === draft.id}
                      versionsOpen={versionsOpenId === draft.id}
                      commentsOpen={commentsOpenId === draft.id}
                      onPlay={() => handlePlayDraft(draft)}
                      onEdit={() => { setEditingDraft(draft); setShowForm(true); }}
                      onDelete={() => handleDelete(draft)}
                      onAdvanceStatus={() => handleAdvanceStatus(draft)}
                      onPublish={() => setPublishingDraft(draft)}
                      onToggleVersions={() => setVersionsOpenId((prev) => prev === draft.id ? null : draft.id)}
                      onToggleComments={() => setCommentsOpenId((prev) => prev === draft.id ? null : draft.id)}
                    />
                    {versionsOpenId === draft.id && (
                      <DraftVersionsPanel draftId={draft.id} draftTitle={draft.title} />
                    )}
                    {commentsOpenId === draft.id && (
                      <div className="border-t border-border max-h-96 overflow-hidden flex flex-col">
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
  onPlay: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAdvanceStatus: () => void;
  onPublish: () => void;
  onToggleVersions: () => void;
  onToggleComments: () => void;
}

function DraftRow({
  draft,
  isPlaying,
  isDeleting,
  isUpdatingStatus,
  versionsOpen,
  commentsOpen,
  onPlay,
  onEdit,
  onDelete,
  onAdvanceStatus,
  onPublish,
  onToggleVersions,
  onToggleComments,
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
        "hover:bg-secondary/40 transition-colors group",
        isPlaying && "bg-primary/5",
        isReady && !isPlaying && "border-l-2 border-green-500/50 bg-green-500/3"
      )}
    >
    <div className="flex items-center gap-3 px-4 py-3.5">
      {/* Play */}
      <div className="w-7 flex-shrink-0 flex items-center justify-center">
        {hasAudio ? (
          <button
            onClick={onPlay}
            title={isPlaying ? "Pausar" : "Reproducir"}
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center transition-colors",
              isPlaying
                ? "bg-primary text-primary-foreground"
                : "hidden group-hover:flex bg-primary text-primary-foreground hover:bg-primary/80"
            )}
          >
            {isPlaying
              ? <Pause className="h-3 w-3" />
              : <Play className="h-3 w-3 ml-0.5" />}
          </button>
        ) : null}
        {!isPlaying && (
          <FileAudio
            className={cn(
              "h-4 w-4 text-muted-foreground/50",
              hasAudio && "group-hover:hidden"
            )}
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium truncate",
            isPlaying && "text-primary"
          )}
        >
          {draft.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {draft.producer && (
            <span className="text-xs text-muted-foreground truncate">
              {draft.producer}
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
        </div>
      </div>

      {/* Estado */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={cn(
            "px-2 py-0.5 rounded-full text-[11px] font-medium border",
            STATUS_COLORS[draft.status]
          )}
        >
          {translateDraftStatus(draft.status)}
        </span>

        {/* Avanzar estado */}
        {canAdvance && (
          <button
            onClick={onAdvanceStatus}
            disabled={isUpdatingStatus}
            title={`Pasar a ${translateDraftStatus(STATUS_NEXT[draft.status]!)}`}
            className="hidden group-hover:flex p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
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
          className="hidden group-hover:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors flex-shrink-0"
        >
          <Upload className="h-3 w-3" />
          Publicar
        </button>
      )}

      {/* Comentarios / Versiones / Copiar enlace / Editar / Eliminar */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={onToggleComments}
          title="Comentarios"
          className={cn(
            "p-1.5 rounded-lg transition-colors",
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
            "p-1.5 rounded-lg transition-colors",
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
            "p-1.5 rounded-lg hover:bg-secondary transition-colors",
            linkCopied ? "text-green-400" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          title="Editar"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-500 disabled:opacity-50"
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
            "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold transition-colors",
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
        <p className="text-xs text-muted-foreground bg-yellow-500/5 border border-yellow-500/15 rounded-lg px-3 py-2 leading-relaxed">
          {draft.notes}
        </p>
      </div>
    )}
    </div>
  );
}
