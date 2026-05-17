"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ListMusic,
  Plus,
  GripVertical,
  Trash2,
  Music,
  Loader2,
  X,
  Clock,
  MapPin,
  Calendar,
  Search,
  Pencil,
  Download,
} from "lucide-react";
import {
  getSetlists,
  getSetlistSongs,
  createSetlist,
  updateSetlist,
  deleteSetlist,
  addSongToSetlist,
  removeSongFromSetlist,
  reorderSetlistSongs,
  type SetlistFormData,
  type SetlistSongWithDetails,
} from "@/lib/actions/setlists";
import { getSongsByYear } from "@/lib/actions/songs";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils";
import type { Setlist, Song } from "@/types/database";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEventDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const day = d.getDate();
  const year = d.getFullYear();
  const month = d.toLocaleDateString("es-AR", { month: "long" });
  return `${day} de ${month} de ${year}`;
}

function calcTotalDuration(songs: SetlistSongWithDetails[]): number {
  return songs.reduce((acc, s) => {
    const dur = s.song?.duration_seconds ?? 0;
    return acc + dur;
  }, 0);
}

function getTrackTitle(s: SetlistSongWithDetails): string {
  return s.song?.title ?? s.draft?.title ?? "Sin título";
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SetlistsPage() {
  const toast = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  // Setlists state
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null);

  // Setlist songs state
  const [setlistSongs, setSetlistSongs] = useState<SetlistSongWithDetails[]>([]);
  const [songsLoading, setSongsLoading] = useState(false);

  // All songs (for song picker)
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [songsPickerLoading, setSongsPickerLoading] = useState(false);

  // UI state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSetlist, setEditingSetlist] = useState<Setlist | undefined>(undefined);
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [songSearch, setSongSearch] = useState("");
  const [addingSongId, setAddingSongId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Drag-and-drop reorder
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // ─── Load setlists ──────────────────────────────────────────────────────────

  const loadSetlists = useCallback(async () => {
    setLoading(true);
    const result = await getSetlists();
    if (result.error) {
      toast.error(result.error);
    } else {
      const data = result.data ?? [];
      setSetlists(data);
      // Restore last selected setlist from localStorage
      const savedId = typeof window !== "undefined"
        ? localStorage.getItem("setlists-selected-id")
        : null;
      if (savedId) {
        const found = data.find((s) => s.id === savedId);
        if (found) setSelectedSetlist(found);
      }
    }
    setLoading(false);
  }, [toast]);

  // ─── Trigger load on mount ──────────────────────────────────────────────────
  useEffect(() => { loadSetlists(); }, [loadSetlists]);

  // Persist selected setlist ID so it's restored on next visit
  useEffect(() => {
    if (selectedSetlist) {
      localStorage.setItem("setlists-selected-id", selectedSetlist.id);
    } else {
      localStorage.removeItem("setlists-selected-id");
    }
  }, [selectedSetlist]);

  // ─── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.key === "n" || e.key === "N") && !showFormModal && !showSongPicker) {
        e.preventDefault();
        setEditingSetlist(undefined);
        setShowFormModal(true);
      }
      if ((e.key === "e" || e.key === "E") && !showFormModal && !showSongPicker) {
        e.preventDefault();
        handleExportCSV();
      }
      if (e.key === "Escape" && showFormModal) { setShowFormModal(false); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFormModal, showSongPicker, selectedSetlist, setlistSongs]);

  // ─── Load setlist songs when selection changes ──────────────────────────────

  const loadSetlistSongs = useCallback(async (setlistId: string) => {
    setSongsLoading(true);
    const result = await getSetlistSongs(setlistId);
    if (result.error) toast.error(result.error);
    else setSetlistSongs(result.data ?? []);
    setSongsLoading(false);
  }, [toast]);

  useEffect(() => {
    if (selectedSetlist) {
      loadSetlistSongs(selectedSetlist.id);
    } else {
      setSetlistSongs([]);
    }
  }, [selectedSetlist, loadSetlistSongs]);

  // ─── Load all songs for picker ──────────────────────────────────────────────

  const loadAllSongs = useCallback(async () => {
    setSongsPickerLoading(true);
    const result = await getSongsByYear();
    if (!result.error) setAllSongs(result.data ?? []);
    setSongsPickerLoading(false);
  }, []);

  useEffect(() => {
    if (showSongPicker && allSongs.length === 0) {
      loadAllSongs();
    }
  }, [showSongPicker, allSongs.length, loadAllSongs]);

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const totalSetlists = setlists.length;
  // We can't sum songs across all setlists without fetching each, so we show
  // song count of selected setlist or a dash for the total
  const selectedSongCount = setlistSongs.length;
  const selectedTotalDuration = calcTotalDuration(setlistSongs);

  // ─── Actions ────────────────────────────────────────────────────────────────

  function handleSaved(saved: Setlist) {
    setShowFormModal(false);
    setEditingSetlist(undefined);
    setSetlists((prev) => {
      const idx = prev.findIndex((s) => s.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    if (!selectedSetlist) setSelectedSetlist(saved);
  }

  async function handleDeleteSetlist(setlist: Setlist) {
    const ok = await confirm({
      title: `¿Eliminar "${setlist.name}"?`,
      message: "La setlist y todas sus canciones serán eliminadas.",
      confirmLabel: "Eliminar",
    });
    if (!ok) return;

    setDeletingId(setlist.id);
    const { error } = await deleteSetlist(setlist.id);
    if (error) toast.error(error);
    else {
      setSetlists((prev) => prev.filter((s) => s.id !== setlist.id));
      if (selectedSetlist?.id === setlist.id) setSelectedSetlist(null);
      toast.success(`"${setlist.name}" eliminada`);
    }
    setDeletingId(null);
  }

  async function handleAddSong(song: Song) {
    if (!selectedSetlist) return;
    setAddingSongId(song.id);
    const nextOrder = setlistSongs.length + 1;
    const { error } = await addSongToSetlist(selectedSetlist.id, song.id, nextOrder);
    if (error) toast.error(error);
    else {
      await loadSetlistSongs(selectedSetlist.id);
      toast.success(`"${song.title}" agregada`);
    }
    setAddingSongId(null);
  }

  async function handleRemoveSong(item: SetlistSongWithDetails) {
    if (!selectedSetlist) return;
    setRemovingId(item.id);
    const { error } = await removeSongFromSetlist(item.id);
    if (error) toast.error(error);
    else {
      setSetlistSongs((prev) => prev.filter((s) => s.id !== item.id));
      toast.success(`"${getTrackTitle(item)}" removida`);
    }
    setRemovingId(null);
  }

  // ─── Drag-and-drop reorder ──────────────────────────────────────────────────

  function handleDragStart(index: number) {
    dragItem.current = index;
  }

  function handleDragEnter(index: number) {
    dragOverItem.current = index;
  }

  async function handleDragEnd() {
    if (
      dragItem.current === null ||
      dragOverItem.current === null ||
      dragItem.current === dragOverItem.current ||
      !selectedSetlist
    ) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    const reordered = [...setlistSongs];
    const [moved] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, moved);
    setSetlistSongs(reordered);

    dragItem.current = null;
    dragOverItem.current = null;

    const orderedIds = reordered.map((s) => s.id);
    const { error } = await reorderSetlistSongs(selectedSetlist.id, orderedIds);
    if (error) {
      toast.error("Error al reordenar");
      loadSetlistSongs(selectedSetlist.id);
    }
  }

  // ─── CSV Export ─────────────────────────────────────────────────────────────

  function handleExportCSV() {
    if (!selectedSetlist || !setlistSongs.length) return;
    const rows = [
      ["#", "Título", "Artista", "Duración", "BPM", "Tono", "Tipo"],
      ...setlistSongs.map((s, i) => {
        const title = getTrackTitle(s);
        const artist = s.song?.artist_name ?? "";
        const duration = s.song?.duration_seconds ? formatTime(s.song.duration_seconds) : "";
        const bpm = (s.song?.bpm ?? s.draft?.bpm) ? String(s.song?.bpm ?? s.draft?.bpm) : "";
        const key = s.song?.key_signature ?? s.draft?.key_signature ?? "";
        const type = s.song ? "Canción" : s.draft ? "Maqueta" : "—";
        return [String(i + 1), title, artist, duration, bpm, key, type];
      }),
    ];
    const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `setlist_${selectedSetlist.name.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Setlist exportada");
  }

  // ─── Filtered songs for picker ──────────────────────────────────────────────

  const alreadyAddedIds = new Set(setlistSongs.map((s) => s.song_id).filter(Boolean));
  const filteredPickerSongs = allSongs.filter((s) => {
    if (alreadyAddedIds.has(s.id)) return false;
    if (!songSearch.trim()) return true;
    return s.title.toLowerCase().includes(songSearch.toLowerCase()) ||
      s.artist_name.toLowerCase().includes(songSearch.toLowerCase());
  });

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="card-premium relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/8 via-transparent to-transparent" />
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-violet-500/6 rounded-full blur-3xl" />
        <div className="relative px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-violet-600/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
              <ListMusic className="h-5 w-5 text-violet-400 drop-shadow-[0_0_6px_currentColor]" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight gradient-text">Setlists</h1>
              <p className="text-muted-foreground text-xs mt-0.5">
                Armá y organizá los tracklists de tus shows ·{" "}
                <span className="text-foreground/60 font-medium tabular-nums">
                  {totalSetlists} setlist{totalSetlists !== 1 ? "s" : ""}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedSetlist && setlistSongs.length > 0 && (
              <button
                onClick={handleExportCSV}
                title="Exportar setlist a CSV (E)"
                className="flex items-center gap-1.5 px-3 py-2 border border-border/60 rounded-xl hover:bg-secondary/60 transition-all active:scale-95 text-sm text-muted-foreground hover:text-foreground"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
              </button>
            )}
            <button
              onClick={() => {
                setEditingSetlist(undefined);
                setShowFormModal(true);
              }}
              title="Nueva setlist (N)"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all active:scale-95 text-sm font-black shadow-[0_0_16px_hsl(var(--primary)/0.25)] btn-shine"
            >
              <Plus className="h-4 w-4" />
              Nueva setlist
              <kbd className="hidden md:inline-flex ml-0.5 text-[9px] bg-primary-foreground/20 px-1 py-0.5 rounded font-mono">N</kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {selectedSetlist && !songsLoading && (
        <div className="flex items-center gap-4 px-1">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Music className="h-3.5 w-3.5 text-violet-400/70" />
            <span className="tabular-nums font-medium text-foreground/70">{selectedSongCount}</span>
            <span>canción{selectedSongCount !== 1 ? "es" : ""}</span>
          </div>
          {selectedTotalDuration > 0 && (
            <>
              <div className="w-px h-3 bg-border/60" />
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-violet-400/70" />
                <span className="tabular-nums font-medium text-foreground/70">
                  {formatTime(selectedTotalDuration)}
                </span>
                <span>duración total</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Main split layout */}
      <div className="flex gap-4 flex-1 min-h-0" style={{ minHeight: "60vh" }}>
        {/* ── Left panel: Setlist list (1/3) ── */}
        <div className="w-1/3 flex flex-col gap-3 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 card-premium rounded-2xl skeleton-shimmer"
                />
              ))}
            </div>
          ) : setlists.length === 0 ? (
            // Empty state
            <div className="card-premium flex flex-col items-center justify-center py-20 text-center rounded-2xl px-6">
              <div className="relative mb-5">
                <div className="absolute inset-0 bg-violet-500/20 rounded-2xl blur-xl scale-125" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-700/10 border border-violet-500/20 flex items-center justify-center">
                  <ListMusic className="h-8 w-8 text-violet-400/60" />
                </div>
              </div>
              <p className="text-sm font-medium text-foreground/70">Sin setlists todavía</p>
              <p className="text-xs text-muted-foreground/50 mt-1 mb-4">
                Organizá las canciones de tu próximo show
              </p>
              <button
                onClick={() => {
                  setEditingSetlist(undefined);
                  setShowFormModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/25 text-primary rounded-xl text-sm font-medium hover:bg-primary/20 transition-all active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Crear primer setlist
              </button>
            </div>
          ) : (
            setlists.map((setlist) => (
              <SetlistCard
                key={setlist.id}
                setlist={setlist}
                isSelected={selectedSetlist?.id === setlist.id}
                isDeleting={deletingId === setlist.id}
                onClick={() =>
                  setSelectedSetlist((prev) =>
                    prev?.id === setlist.id ? null : setlist
                  )
                }
                onEdit={() => {
                  setEditingSetlist(setlist);
                  setShowFormModal(true);
                }}
                onDelete={() => handleDeleteSetlist(setlist)}
              />
            ))
          )}
        </div>

        {/* ── Right panel: Tracklist (2/3) ── */}
        <div className="flex-1 flex flex-col card-premium rounded-2xl overflow-hidden">
          {!selectedSetlist ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/15 to-violet-700/5 border border-violet-500/15 flex items-center justify-center mb-4">
                <Music className="h-7 w-7 text-violet-400/40" />
              </div>
              <p className="text-sm font-medium text-foreground/40">
                Seleccioná una setlist para ver su tracklist
              </p>
            </div>
          ) : (
            <>
              {/* Right panel header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                <div>
                  <h2 className="text-base font-black gradient-text">{selectedSetlist.name}</h2>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {selectedSetlist.venue && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 text-violet-400/60" />
                        {selectedSetlist.venue}
                      </span>
                    )}
                    {selectedSetlist.event_date && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 text-violet-400/60" />
                        {formatEventDate(selectedSetlist.event_date)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowSongPicker(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/15 border border-violet-500/20 text-violet-400 text-xs font-black hover:bg-violet-500/25 transition-all active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar canción
                </button>
              </div>

              {/* Track list */}
              <div className="flex-1 overflow-y-auto">
                {songsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
                  </div>
                ) : setlistSongs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                    <Music className="h-10 w-10 text-muted-foreground/20 mb-3" />
                    <p className="text-sm text-muted-foreground/50">
                      Esta setlist no tiene canciones todavía
                    </p>
                    <button
                      onClick={() => setShowSongPicker(true)}
                      className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/15 border border-violet-500/20 text-violet-400 text-xs font-black hover:bg-violet-500/25 transition-all active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Agregar canción
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {setlistSongs.map((item, index) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragEnter={() => handleDragEnter(index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        className="row-interactive flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-all group cursor-grab active:cursor-grabbing select-none"
                      >
                        {/* Track number + drag handle */}
                        <div className="flex items-center gap-1.5 w-7 flex-shrink-0">
                          <GripVertical className="h-4 w-4 text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors" />
                          <span className="text-xs text-muted-foreground/40 tabular-nums group-hover:hidden">
                            {index + 1}
                          </span>
                        </div>

                        {/* Cover art thumbnail */}
                        <div className="w-9 h-9 flex-shrink-0 rounded-xl overflow-hidden border border-border/50 bg-gradient-to-br from-violet-500/20 to-violet-800/10 flex items-center justify-center">
                          {item.song?.cover_art_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.song.cover_art_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Music className="h-4 w-4 text-violet-400/30" />
                          )}
                        </div>

                        {/* Song info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {getTrackTitle(item)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {(item.song?.bpm ?? item.draft?.bpm) && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20 tabular-nums">
                                {item.song?.bpm ?? item.draft?.bpm} BPM
                              </span>
                            )}
                            {(item.song?.key_signature ?? item.draft?.key_signature) && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/20">
                                {item.song?.key_signature ?? item.draft?.key_signature}
                              </span>
                            )}
                            {item.song?.duration_seconds && (
                              <span className="text-[10px] text-muted-foreground/50 tabular-nums flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                {formatTime(item.song.duration_seconds)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Remove button */}
                        <button
                          onClick={() => handleRemoveSong(item)}
                          disabled={removingId === item.id}
                          className="p-1.5 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                          title="Quitar de la setlist"
                        >
                          {removingId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total duration footer */}
              {setlistSongs.length > 0 && selectedTotalDuration > 0 && (
                <div className="border-t border-border/50 px-5 py-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground/50">
                    {setlistSongs.length} canción{setlistSongs.length !== 1 ? "es" : ""}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                    <Clock className="h-3 w-3 text-violet-400/50" />
                    <span className="tabular-nums font-medium">
                      {formatTime(selectedTotalDuration)}
                    </span>
                    <span>total</span>
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {ConfirmDialog}

      {/* ── Setlist form modal ── */}
      {showFormModal && (
        <SetlistFormModal
          setlist={editingSetlist}
          onClose={() => {
            setShowFormModal(false);
            setEditingSetlist(undefined);
          }}
          onSaved={handleSaved}
        />
      )}

      {/* ── Song picker modal ── */}
      {showSongPicker && selectedSetlist && (
        <SongPickerModal
          songs={filteredPickerSongs}
          loading={songsPickerLoading}
          addingSongId={addingSongId}
          searchValue={songSearch}
          onSearchChange={setSongSearch}
          onAdd={handleAddSong}
          onClose={() => {
            setShowSongPicker(false);
            setSongSearch("");
          }}
        />
      )}
    </div>
  );
}

// ─── SetlistCard ──────────────────────────────────────────────────────────────

interface SetlistCardProps {
  setlist: Setlist;
  isSelected: boolean;
  isDeleting: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SetlistCard({
  setlist,
  isSelected,
  isDeleting,
  onClick,
  onEdit,
  onDelete,
}: SetlistCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl border cursor-pointer transition-all active:scale-[0.99] group",
        isSelected
          ? "border-violet-500/50 bg-violet-500/8 shadow-[0_0_20px_hsl(271,81%,66%/0.1)]"
          : "border-border/60 bg-card/80 hover:border-violet-500/30 hover:bg-card hover:shadow-sm hover:-translate-y-0.5"
      )}
    >
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-violet-500/80 rounded-r shadow-[0_0_12px_hsl(271_81%_66%/0.6),0_0_24px_hsl(271_81%_66%/0.3)]" />
      )}
      <div className="px-4 py-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cn(
                "w-9 h-9 flex-shrink-0 rounded-xl border flex items-center justify-center transition-all",
                isSelected
                  ? "bg-violet-500/25 border-violet-500/40 shadow-[0_0_12px_hsl(271_81%_66%/0.25)]"
                  : "bg-violet-500/10 border-violet-500/15 group-hover:bg-violet-500/15"
              )}
            >
              <ListMusic
                className={cn(
                  "h-4 w-4",
                  isSelected ? "text-violet-400 drop-shadow-[0_0_4px_hsl(271_81%_66%/0.8)]" : "text-violet-400/50"
                )}
              />
            </div>
            <p
              className={cn(
                "text-sm font-black truncate",
                isSelected ? "text-foreground" : "text-foreground/80"
              )}
            >
              {setlist.name}
            </p>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-all active:scale-95"
              title="Editar"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={isDeleting}
              className="p-1 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Eliminar"
            >
              {isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        <div className="mt-2.5 flex flex-col gap-1">
          {setlist.venue && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
              <MapPin className="h-3 w-3 text-violet-400/50 flex-shrink-0" />
              <span className="truncate">{setlist.venue}</span>
            </div>
          )}
          {setlist.event_date && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
              <Calendar className="h-3 w-3 text-violet-400/50 flex-shrink-0" />
              <span>{formatEventDate(setlist.event_date)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SetlistFormModal ─────────────────────────────────────────────────────────

interface SetlistFormModalProps {
  setlist?: Setlist;
  onClose: () => void;
  onSaved: (saved: Setlist) => void;
}

function SetlistFormModal({ setlist, onClose, onSaved }: SetlistFormModalProps) {
  const toast = useToast();
  const isEditing = !!setlist;

  const [form, setForm] = useState<SetlistFormData>({
    name: setlist?.name ?? "",
    description: setlist?.description ?? null,
    event_date: setlist?.event_date ?? null,
    venue: setlist?.venue ?? null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    setSaving(true);
    const result = isEditing
      ? await updateSetlist(setlist!.id, form)
      : await createSetlist(form);

    if (result.error) toast.error(result.error);
    else {
      toast.success(isEditing ? "Setlist actualizada" : "Setlist creada");
      onSaved(result.data!);
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Glow ring */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-violet-500/20 via-transparent to-violet-600/10 pointer-events-none" />
        <div className="relative glass-panel rounded-2xl overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
              <ListMusic className="h-4 w-4 text-violet-400" />
            </div>
            <h2 className="text-base font-black">
              {isEditing ? "Editar setlist" : "Nueva setlist"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-muted/50 transition-all active:scale-95 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Nombre <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Show en el Luna Park"
              className="w-full px-3 py-2.5 bg-secondary/50 border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all placeholder:text-muted-foreground/40"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Venue / Lugar
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
              <input
                type="text"
                value={form.venue ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, venue: e.target.value || null }))
                }
                placeholder="Ej: Teatro Gran Rex"
                className="w-full pl-9 pr-3 py-2.5 bg-secondary/50 border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all placeholder:text-muted-foreground/40"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Fecha del evento
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
              <input
                type="date"
                value={form.event_date ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, event_date: e.target.value || null }))
                }
                className="w-full pl-9 pr-3 py-2.5 bg-secondary/50 border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-black hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEditing ? (
                "Guardar cambios"
              ) : (
                "Crear setlist"
              )}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

// ─── SongPickerModal ──────────────────────────────────────────────────────────

interface SongPickerModalProps {
  songs: Song[];
  loading: boolean;
  addingSongId: string | null;
  searchValue: string;
  onSearchChange: (v: string) => void;
  onAdd: (song: Song) => void;
  onClose: () => void;
}

function SongPickerModal({
  songs,
  loading,
  addingSongId,
  searchValue,
  onSearchChange,
  onAdd,
  onClose,
}: SongPickerModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Glow ring */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-violet-500/20 via-transparent to-violet-600/10 pointer-events-none" />
        <div className="relative glass-panel rounded-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
              <Music className="h-4 w-4 text-violet-400" />
            </div>
            <h2 className="text-base font-black">Agregar canción</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-muted/50 transition-all active:scale-95 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border/40 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar canción…"
              autoFocus
              className="w-full pl-9 pr-4 py-2 bg-secondary/50 border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all placeholder:text-muted-foreground/40"
            />
          </div>
        </div>

        {/* Song list */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 text-violet-400 animate-spin" />
            </div>
          ) : songs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <Music className="h-8 w-8 text-muted-foreground/20 mb-2" />
              <p className="text-sm text-muted-foreground/50">
                {searchValue
                  ? `Sin resultados para "${searchValue}"`
                  : "No hay canciones disponibles"}
              </p>
            </div>
          ) : (
            songs.map((song) => (
              <button
                key={song.id}
                onClick={() => onAdd(song)}
                disabled={addingSongId === song.id}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-all active:scale-[0.99] text-left group disabled:opacity-60"
              >
                {/* Cover */}
                <div className="w-9 h-9 flex-shrink-0 rounded-xl overflow-hidden border border-border/50 bg-gradient-to-br from-violet-500/15 to-violet-800/5 flex items-center justify-center">
                  {song.cover_art_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={song.cover_art_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music className="h-4 w-4 text-violet-400/30" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{song.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {song.bpm && (
                      <span className="text-[10px] text-blue-400/70 tabular-nums font-mono">
                        {song.bpm} BPM
                      </span>
                    )}
                    {song.key_signature && (
                      <span className="text-[10px] text-purple-400/70">
                        {song.key_signature}
                      </span>
                    )}
                    {song.duration_seconds && (
                      <span className="text-[10px] text-muted-foreground/40 tabular-nums">
                        {formatTime(song.duration_seconds)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Add indicator */}
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {addingSongId === song.id ? (
                    <Loader2 className="h-4 w-4 text-violet-400 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 text-violet-400" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
