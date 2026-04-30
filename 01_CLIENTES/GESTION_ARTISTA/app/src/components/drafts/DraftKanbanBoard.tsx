"use client";

import { useState, useRef, useEffect } from "react";
import {
  Play, Pause, Pencil, Trash2, Upload, ChevronRight,
  History, FileAudio, Loader2, StickyNote, GripVertical, Copy, Check,
} from "lucide-react";
import { updateDraftStatus } from "@/lib/actions/drafts";
import { translateDraftStatus } from "@/lib/utils";
import { useAudioPlayerContext } from "@/components/audio/AudioPlayer";
import DraftVersionsPanel from "@/components/drafts/DraftVersionsPanel";
import { cn } from "@/lib/utils";
import type { Draft, DraftStatus } from "@/types/database";

const COLUMNS: {
  status: DraftStatus;
  label: string;
  color: string;
  bg: string;
  dot: string;
  border: string;
  accent: string;
  cardGlow: string;
}[] = [
  {
    status: "borrador",
    label: "Borrador",
    color: "text-zinc-400",
    bg: "bg-zinc-500/10 border-zinc-500/20",
    dot: "bg-zinc-400",
    border: "border-zinc-500/50",
    accent: "from-zinc-500/40 to-zinc-500/0",
    cardGlow: "hover:shadow-zinc-500/10",
  },
  {
    status: "en_mezcla",
    label: "En mezcla",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    dot: "bg-blue-400",
    border: "border-blue-500/50",
    accent: "from-blue-500/40 to-blue-500/0",
    cardGlow: "hover:shadow-blue-500/10",
  },
  {
    status: "masterizada",
    label: "Masterizada",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
    dot: "bg-purple-400",
    border: "border-purple-500/50",
    accent: "from-purple-500/40 to-purple-500/0",
    cardGlow: "hover:shadow-purple-500/10",
  },
  {
    status: "lista_para_publicar",
    label: "Lista para publicar",
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
    dot: "bg-green-400",
    border: "border-green-500/50",
    accent: "from-green-500/40 to-green-500/0",
    cardGlow: "hover:shadow-green-500/10",
  },
];

const STATUS_NEXT: Record<DraftStatus, DraftStatus | null> = {
  borrador: "en_mezcla",
  en_mezcla: "masterizada",
  masterizada: "lista_para_publicar",
  lista_para_publicar: null,
};

interface Props {
  drafts: Draft[];
  onEdit: (draft: Draft) => void;
  onDelete: (draft: Draft) => void;
  onPublish: (draft: Draft) => void;
  onStatusChange: (draft: Draft, newStatus: DraftStatus) => void;
}

export default function DraftKanbanBoard({
  drafts,
  onEdit,
  onDelete,
  onPublish,
  onStatusChange,
}: Props) {
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [versionsOpenId, setVersionsOpenId] = useState<string | null>(null);
  const player = useAudioPlayerContext();

  // Escape closes open versions panel
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && versionsOpenId) { setVersionsOpenId(null); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [versionsOpenId]);

  // ── Drag state ────────────────────────────────────────────────────────
  const draggedId = useRef<string | null>(null);
  const dragSourceStatus = useRef<DraftStatus | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<DraftStatus | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function handleDragStart(e: React.DragEvent, draft: Draft) {
    draggedId.current = draft.id;
    dragSourceStatus.current = draft.status;
    setDraggingId(draft.id);
    e.dataTransfer.effectAllowed = "move";
    // Ghost drag image: transparent div
    const ghost = document.createElement("div");
    ghost.className = "fixed -left-full";
    ghost.textContent = draft.title;
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

  function handleColumnDragOver(e: React.DragEvent, targetStatus: DraftStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (targetStatus !== dragSourceStatus.current) {
      setDragOverColumn(targetStatus);
    }
  }

  function handleColumnDragLeave(e: React.DragEvent) {
    // Only clear if truly leaving the column (not entering a child)
    const related = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(related)) {
      setDragOverColumn(null);
    }
  }

  async function handleColumnDrop(targetStatus: DraftStatus) {
    setDragOverColumn(null);
    const id = draggedId.current;
    const sourceStatus = dragSourceStatus.current;
    draggedId.current = null;
    dragSourceStatus.current = null;
    setDraggingId(null);

    if (!id || !sourceStatus || sourceStatus === targetStatus) return;

    const draft = drafts.find((d) => d.id === id);
    if (!draft) return;

    setAdvancingId(id);
    const result = await updateDraftStatus(id, targetStatus);
    if (!result.error && result.data) {
      onStatusChange(draft, targetStatus);
    }
    setAdvancingId(null);
  }

  // ── Advance button ────────────────────────────────────────────────────
  async function handleAdvance(draft: Draft) {
    const next = STATUS_NEXT[draft.status];
    if (!next) return;
    setAdvancingId(draft.id);
    const result = await updateDraftStatus(draft.id, next);
    if (!result.error && result.data) {
      onStatusChange(draft, next);
    }
    setAdvancingId(null);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {COLUMNS.map((col) => {
        const colDrafts = drafts.filter((d) => d.status === col.status);
        const isDropTarget = dragOverColumn === col.status;
        const isDraggingFromHere = dragSourceStatus.current === col.status && draggingId !== null;

        return (
          <div
            key={col.status}
            className="flex flex-col min-h-[300px]"
            onDragOver={(e) => handleColumnDragOver(e, col.status)}
            onDragLeave={handleColumnDragLeave}
            onDrop={() => handleColumnDrop(col.status)}
          >
            {/* Column header */}
            <div className={cn(
              "flex items-center justify-between px-3 py-2.5 rounded-t-xl border transition-colors",
              col.bg,
              isDropTarget && col.border
            )}>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  col.dot,
                  isDropTarget && "scale-125 shadow-[0_0_6px_currentColor]"
                )} />
                <span className={cn("text-xs font-bold tracking-wide", col.color)}>
                  {col.label}
                </span>
              </div>
              <span className={cn(
                "text-[11px] font-bold tabular-nums w-5 h-5 flex items-center justify-center rounded-full",
                col.color,
                colDrafts.length > 0 ? col.bg.split(" ")[0] : ""
              )}>
                {colDrafts.length}
              </span>
            </div>

            {/* Drop zone body */}
            <div className={cn(
              "flex-1 rounded-b-xl border border-t-0 p-2 space-y-2 min-h-[120px] transition-all duration-150",
              isDropTarget
                ? cn("border-2", col.border, "bg-secondary/40")
                : "border-border/60 bg-secondary/10",
            )}>
              {/* Empty state or drop hint */}
              {colDrafts.length === 0 ? (
                <div className={cn(
                  "flex flex-col items-center justify-center h-20 gap-1 rounded-lg border-2 border-dashed transition-colors",
                  isDropTarget
                    ? cn(col.border, "opacity-100")
                    : "border-transparent opacity-30"
                )}>
                  <FileAudio className={cn("h-5 w-5", isDropTarget ? col.color : "text-muted-foreground")} />
                  {isDropTarget && (
                    <span className={cn("text-[10px] font-medium", col.color)}>
                      Soltar aquí
                    </span>
                  )}
                </div>
              ) : (
                <>
                  {colDrafts.map((draft) => (
                    <DraftCard
                      key={draft.id}
                      draft={draft}
                      col={col}
                      isDragging={draggingId === draft.id}
                      isAdvancing={advancingId === draft.id}
                      versionsOpen={versionsOpenId === draft.id}
                      onDragStart={(e) => handleDragStart(e, draft)}
                      onDragEnd={handleDragEnd}
                      onAdvance={() => handleAdvance(draft)}
                      onEdit={() => onEdit(draft)}
                      onDelete={() => onDelete(draft)}
                      onPublish={() => onPublish(draft)}
                      onToggleVersions={() =>
                        setVersionsOpenId((p) => (p === draft.id ? null : draft.id))
                      }
                      player={player}
                    />
                  ))}
                  {/* Drop hint at bottom when items exist */}
                  {isDropTarget && !isDraggingFromHere && (
                    <div className={cn(
                      "h-10 rounded-lg border-2 border-dashed flex items-center justify-center",
                      col.border
                    )}>
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

// ── Card component ─────────────────────────────────────────────────────────

interface CardProps {
  draft: Draft;
  col: typeof COLUMNS[number];
  isDragging: boolean;
  isAdvancing: boolean;
  versionsOpen: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onAdvance: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onToggleVersions: () => void;
  player: ReturnType<typeof useAudioPlayerContext>;
}

function DraftCard({
  draft, col, isDragging, isAdvancing, versionsOpen,
  onDragStart, onDragEnd, onAdvance, onEdit, onDelete, onPublish, onToggleVersions, player,
}: CardProps) {
  const isPlaying = player.currentTrack?.id === draft.id && player.isPlaying;
  const [linkCopied, setLinkCopied] = useState(false);

  function handleCopyLink(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/maquetas?draft=${draft.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "relative bg-card border border-border/60 rounded-xl overflow-hidden group transition-all duration-150 select-none",
        isDragging && "opacity-40 scale-95 shadow-xl",
        !isDragging && cn(
          "cursor-grab active:cursor-grabbing",
          "hover:border-border hover:shadow-lg hover:-translate-y-0.5",
          col.cardGlow
        )
      )}
    >
      {/* Colored top accent strip */}
      <div className={cn("h-0.5 w-full bg-gradient-to-r", col.accent)} />

      {/* Drag handle + title row */}
      <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-0">
        <GripVertical className="h-3 w-3 text-muted-foreground/25 flex-shrink-0 group-hover:text-muted-foreground/50 transition-colors" />
        <p className={cn(
          "text-sm font-semibold leading-snug flex-1 min-w-0 truncate",
          isPlaying ? col.color : ""
        )}>
          {draft.title}
        </p>
        {draft.notes && (
          <StickyNote className="h-3 w-3 text-muted-foreground/30 flex-shrink-0" />
        )}
      </div>

      <div className="px-3 pt-1 pb-2">
        {draft.producer && (
          <p className="text-xs text-muted-foreground/70 truncate">{draft.producer}</p>
        )}
        <p className="text-[10px] text-muted-foreground/35 mt-0.5">
          {draft.month_created
            ? (() => {
                try {
                  return new Date(draft.month_created + "-01T12:00:00").toLocaleDateString("es-AR", { month: "short", year: "numeric" });
                } catch { return draft.month_created; }
              })()
            : null}
        </p>

        {/* Audio indicator */}
        {draft.drive_file_url && (
          <div className={cn(
            "inline-flex items-center gap-1 mt-1.5 text-[9px] px-1.5 py-0.5 rounded-full border",
            isPlaying
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-secondary/60 text-muted-foreground/50 border-border/30"
          )}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              isPlaying ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
            )} />
            Audio
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-2.5 pb-2.5 gap-1 border-t border-border/30 pt-2">
        <div className="flex items-center gap-0.5">
          {draft.drive_file_url && (
            <button
              onClick={() => {
                if (isPlaying) {
                  player.pause();
                } else {
                  const audioUrl = draft.drive_file_id
                    ? `/api/drive/stream/${draft.drive_file_id}`
                    : draft.drive_file_url!;
                  player.play({
                    id: draft.id,
                    title: draft.title,
                    artist: draft.producer ?? "Sin productor",
                    url: audioUrl,
                  });
                }
              }}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                isPlaying
                  ? cn("text-white shadow-sm", col.dot.replace("bg-", "bg-").replace("-400", "-500/80"))
                  : "text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60"
              )}
              title={isPlaying ? "Pausar" : "Reproducir"}
            >
              {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </button>
          )}
          <button
            onClick={onToggleVersions}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              versionsOpen
                ? "text-primary bg-primary/10"
                : "text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60"
            )}
            title="Versiones"
          >
            <History className="h-3 w-3" />
          </button>
          <button
            onClick={handleCopyLink}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              linkCopied
                ? "text-green-400 bg-green-400/10"
                : "text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60"
            )}
            title="Copiar enlace"
          >
            {linkCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-all"
            title="Editar"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Eliminar"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        {/* Advance / Publish */}
        {col.status === "lista_para_publicar" ? (
          <button
            onClick={onPublish}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 text-[10px] font-semibold hover:bg-green-500/25 transition-all"
          >
            <Upload className="h-3 w-3" />
            Publicar
          </button>
        ) : (
          <button
            onClick={onAdvance}
            disabled={isAdvancing}
            title={`Mover a ${translateDraftStatus(STATUS_NEXT[draft.status]!)}`}
            className={cn(
              "flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all disabled:opacity-50",
              col.color,
              col.bg.split(" ")[0],
              "hover:opacity-80"
            )}
          >
            {isAdvancing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <ChevronRight className="h-3 w-3" />
                {translateDraftStatus(STATUS_NEXT[draft.status]!)}
              </>
            )}
          </button>
        )}
      </div>

      {/* Versions panel */}
      {versionsOpen && (
        <DraftVersionsPanel draftId={draft.id} draftTitle={draft.title} />
      )}
    </div>
  );
}
