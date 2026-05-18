"use client";

import { useState, useEffect } from "react";
import {
  History, Play, Pause, Trash2, Plus, Loader2, ExternalLink, Copy, Check,
} from "lucide-react";
import {
  getDraftVersions,
  addDraftVersion,
  deleteDraftVersion,
} from "@/lib/actions/drafts";
import { useAudioPlayerContext } from "@/components/audio/AudioPlayer";
import DriveFilePicker from "@/components/drive/DriveFilePicker";
import type { DraftVersion } from "@/types/database";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/ConfirmDialog";

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  if (hours < 24) return `hace ${hours}h`;
  if (days < 7) return `hace ${days}d`;
  return new Date(isoDate).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

function WaveformBars() {
  return (
    <div className="flex gap-[2px] items-end h-4">
      {[3, 5, 4, 6, 3].map((h, i) => (
        <div
          key={i}
          className="w-[2.5px] bg-primary rounded-full animate-pulse"
          style={{
            height: h * 2.5,
            animationDelay: `${i * 0.12}s`,
            animationDuration: "0.7s",
          }}
        />
      ))}
    </div>
  );
}

interface Props {
  draftId: string;
  draftTitle: string;
}

export default function DraftVersionsPanel({ draftId, draftTitle }: Props) {
  const player = useAudioPlayerContext();
  const { confirm, ConfirmDialog } = useConfirm();
  const [versions, setVersions] = useState<DraftVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedVersionId, setCopiedVersionId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [addNotes, setAddNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    id: string;
    url: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    getDraftVersions(draftId).then(({ data }) => {
      setVersions(data ?? []);
      setLoading(false);
    });
  }, [draftId]);

  function handlePickerSelect(file: { id: string; webViewLink?: string | null; name: string }) {
    setPendingFile({
      id: file.id,
      url: file.webViewLink ?? "",
      name: file.name,
    });
    setShowPicker(false);
    setShowNoteInput(true);
  }

  async function handleConfirmAdd() {
    if (!pendingFile) return;
    setAdding(true);
    const { data, error } = await addDraftVersion(draftId, {
      drive_file_id: pendingFile.id,
      drive_file_url: pendingFile.url || null,
      notes: addNotes.trim() || null,
    });
    setAdding(false);
    if (!error && data) {
      setVersions((prev) => [data, ...prev]);
    }
    setPendingFile(null);
    setAddNotes("");
    setShowNoteInput(false);
  }

  async function handleDelete(id: string) {
    if (!await confirm({ title: "¿Eliminar esta versión?", message: "Esta acción no se puede deshacer.", confirmLabel: "Eliminar" })) return;
    setDeletingId(id);
    await deleteDraftVersion(id);
    setVersions((prev) => prev.filter((v) => v.id !== id));
    setDeletingId(null);
  }

  function playVersion(v: DraftVersion) {
    // Usa el proxy de streaming (drive_file_id siempre existe en versiones)
    const audioUrl = v.drive_file_id
      ? `/api/drive/stream/${v.drive_file_id}`
      : v.drive_file_url;
    if (!audioUrl) return;
    const isCurrentlyPlaying = player.currentTrack?.id === v.id && player.isPlaying;
    if (isCurrentlyPlaying) {
      player.pause();
    } else {
      player.play({
        id: v.id,
        title: `${draftTitle} v${v.version_number}`,
        artist: "Maqueta",
        url: audioUrl,
      });
    }
  }

  return (
    <div className="border-t border-border/60">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/20">
        <div className="flex items-center gap-2">
          <History className="h-3.5 w-3.5 text-primary/60 drop-shadow-[0_0_3px_currentColor]" />
          <span className="text-xs font-semibold text-muted-foreground">
            Versiones{" "}
            {!loading && versions.length > 0 && (
              <span className="text-primary">({versions.length})</span>
            )}
          </span>
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Plus className="h-3 w-3" />
          Agregar
        </button>
      </div>

      {/* Note input after file selection */}
      {showNoteInput && pendingFile && (
        <div className="px-4 py-3 bg-secondary/30 border-b border-border/60 space-y-2">
          <p className="text-xs text-muted-foreground truncate">
            Archivo: <span className="text-foreground font-medium">{pendingFile.name}</span>
          </p>
          <input
            type="text"
            placeholder="Notas de esta versión (opcional)"
            value={addNotes}
            onChange={(e) => setAddNotes(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border/60 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleConfirmAdd(); }
              if (e.key === "Escape") { e.stopPropagation(); setShowNoteInput(false); setPendingFile(null); setAddNotes(""); }
            }}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setShowNoteInput(false); setPendingFile(null); setAddNotes(""); }}
              className="flex-1 py-1.5 rounded-xl border border-border/60 text-xs hover:bg-secondary/60 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmAdd}
              disabled={adding}
              className="flex-1 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/80 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            >
              {adding && <Loader2 className="h-3 w-3 animate-spin" />}
              Guardar versión
            </button>
          </div>
        </div>
      )}

      {/* Version list */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : versions.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <History className="h-7 w-7 text-muted-foreground/20 mb-1.5" />
          <p className="text-xs text-muted-foreground">Sin versiones guardadas</p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {versions.map((v) => {
            const isActive = player.currentTrack?.id === v.id;
            const isPlaying = isActive && player.isPlaying;
            return (
            <div
              key={v.id}
              className={cn(
                "row-interactive flex items-center gap-3 px-4 py-2.5 transition-all group",
                isPlaying
                  ? "bg-primary/5"
                  : isActive
                  ? "bg-primary/3"
                  : ""
              )}
            >
              {/* Version badge or waveform */}
              <div className="flex-shrink-0 w-10 flex items-center justify-center">
                {isPlaying ? (
                  <WaveformBars />
                ) : (
                  <span className={cn(
                    "text-[10px] font-black px-1.5 py-0.5 rounded-md border",
                    isActive
                      ? "bg-primary/20 text-primary border-primary/30 shadow-[0_0_6px_hsl(var(--primary)/0.3)]"
                      : "text-muted-foreground bg-secondary border-border/50"
                  )}>
                    v{v.version_number}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                {v.notes ? (
                  <p className={cn("text-xs truncate", isActive && "text-primary/90")}>{v.notes}</p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Sin notas</p>
                )}
                <p
                  className="text-[10px] text-muted-foreground"
                  title={new Date(v.created_at).toLocaleString("es-AR")}
                >
                  {relativeTime(v.created_at)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {v.drive_file_url && (
                  <>
                    <button
                      onClick={() => playVersion(v)}
                      title={isPlaying ? "Pausar" : "Reproducir"}
                      className={cn(
                        "p-1.5 rounded-xl transition-all active:scale-95",
                        isPlaying
                          ? "text-primary bg-primary/10 flex"
                          : isActive
                          ? "text-primary bg-primary/5 flex"
                          : "hidden group-hover:flex text-muted-foreground hover:text-foreground hover:bg-secondary"
                      )}
                    >
                      {isPlaying
                        ? <Pause className="h-3 w-3" />
                        : <Play className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(v.drive_file_url!).then(() => {
                          setCopiedVersionId(v.id);
                          setTimeout(() => setCopiedVersionId(null), 2000);
                        });
                      }}
                      title="Copiar URL"
                      className={cn(
                        "p-1.5 rounded-xl transition-all active:scale-95",
                        copiedVersionId === v.id
                          ? "flex text-green-400 bg-green-500/10"
                          : "hidden group-hover:flex text-muted-foreground hover:text-foreground hover:bg-secondary"
                      )}
                    >
                      {copiedVersionId === v.id
                        ? <Check className="h-3 w-3" />
                        : <Copy className="h-3 w-3" />}
                    </button>
                    <a
                      href={v.drive_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir en Drive"
                      className="hidden group-hover:flex p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </>
                )}
                <button
                  onClick={() => handleDelete(v.id)}
                  disabled={deletingId === v.id}
                  title="Eliminar versión"
                  className="hidden group-hover:flex p-1.5 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingId === v.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {ConfirmDialog}

      {/* Drive picker */}
      {showPicker && (
        <DriveFilePicker
          onSelect={(file) => handlePickerSelect(file)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
