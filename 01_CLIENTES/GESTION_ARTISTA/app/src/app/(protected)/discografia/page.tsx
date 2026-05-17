"use client";

import { useState, useEffect, useCallback, useTransition, useRef, memo, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Disc3,
  Search,
  Plus,
  Music,
  Play,
  Pause,
  Pencil,
  Trash2,
  Loader2,
  X,
  MessageSquare,
  Download,
  Clock,
  ArrowUpDown,
  Filter,
  Shuffle,
  ListMusic,
  LayoutGrid,
  List,
  Radio,
  Copy,
  Check,
  ImageOff,
  FileText,
  ArrowDownToLine,
  Globe,
  ExternalLink,
  CalendarDays,
  Zap,
  ListPlus,
  Heart,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import SongDetailPanel from "@/components/songs/SongDetailPanel";
import LyricsPanel from "@/components/lyrics/LyricsPanel";
import { SongRowSkeleton, SongCardSkeleton } from "@/components/ui/Skeletons";
import { useAudioPlayerContext } from "@/components/audio/AudioPlayer";
import SongForm from "@/components/songs/SongForm";
import CommentsPanel from "@/components/comments/CommentsPanel";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  getSongsByYear,
  searchSongs,
  deleteSong,
  getAvailableYears,
} from "@/lib/actions/songs";
import { useDebounce } from "@/hooks/useDebounce";
import { useOptimisticList } from "@/hooks/useOptimisticList";
import { formatTime } from "@/lib/utils";
import type { Song } from "@/types/database";
import { cn } from "@/lib/utils";
import { getGenreColors } from "@/lib/genre-colors";

const DEFAULT_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019];

// Genre → hex color for 3px top stripe on grid cards
const GENRE_HEX: Record<string, string> = {
  "Trap":      "#f97316",
  "Reggaeton": "#22c55e",
  "Hip Hop":   "#eab308",
  "R&B":       "#ec4899",
  "Pop":       "#06b6d4",
  "Drill":     "#ef4444",
  "Dancehall": "#a855f7",
  "Afrobeats": "#f59e0b",
};

export default function DiscografiaPage() {
  const player = useAudioPlayerContext();
  const { user, profile } = useUser();
  const toast = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const searchParams = useSearchParams();

  const [years, setYears] = useState<number[]>(DEFAULT_YEARS);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const { items: songs, setItems: setSongs, removeOptimistic } = useOptimisticList<Song>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | undefined>(undefined);
  const [detailSong, setDetailSong] = useState<Song | null>(null);
  const [lyricsSong, setLyricsSong] = useState<Song | null>(null);

  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [missingPlatformFilter, setMissingPlatformFilter] = useState(false);
  const [missingGenreFilter, setMissingGenreFilter] = useState(false);
  const [missingAudioFilter, setMissingAudioFilter] = useState(false);
  const [missingCoverArtFilter, setMissingCoverArtFilter] = useState(false);
  const [missingBpmFilter, setMissingBpmFilter] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "az" | "za" | "duration_asc" | "duration_desc" | "newest" | "oldest">(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("discografia-sort") as "default" | "az" | "za" | "duration_asc" | "duration_desc" | "newest" | "oldest") || "default"
      : "default"
  );
  const [viewMode, setViewMode] = useState<"list" | "grid">(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("discografia-view-mode") as "list" | "grid") || "list"
      : "list"
  );
  const [copiedSongId, setCopiedSongId] = useState<string | null>(null);

  function handleCopySongLink(e: React.MouseEvent, songId: string) {
    e.stopPropagation();
    const url = `${window.location.origin}/discografia?song=${songId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedSongId(songId);
      setTimeout(() => setCopiedSongId(null), 2000);
    });
  }

  const debouncedSearch = useDebounce(searchQuery, 280);
  const isSearchPending = searchQuery !== debouncedSearch;
  const [isPending, startTransition] = useTransition();

  // Keyboard navigation state
  const [keyboardSongId, setKeyboardSongId] = useState<string | null>(null);
  const keyboardSongIdRef = useRef<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Mutable refs so handlers always see latest values without re-registration
  const displayedSongsRef = useRef<Song[]>([]);
  const handlePlaySongRef = useRef<(s: Song) => void>(() => {});
  const handleDeleteRef = useRef<(s: Song) => Promise<void>>(async () => {});

  // ?new=1 deep-link; ?song=<id> loads all songs, switches to the right year, auto-selects and opens detail panel
  useEffect(() => {
    if (searchParams.get("new") === "1") handleAdd();
    const songId = searchParams.get("song");
    if (songId) {
      getSongsByYear().then(({ data }) => {
        const found = (data ?? []).find((s) => s.id === songId);
        if (found) {
          setSelectedYear(found.year);
          setSelectedSong(found);
          setDetailSong(found); // auto-open the detail panel
          setTimeout(() => {
            document.getElementById(`song-row-${songId}`)?.scrollIntoView({
              behavior: "smooth", block: "center",
            });
          }, 200);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load available years
  useEffect(() => {
    getAvailableYears().then(({ data }) => {
      if (data && data.length > 0) {
        const merged = Array.from(new Set([...data, ...DEFAULT_YEARS])).sort(
          (a, b) => b - a
        );
        setYears(merged);
      }
    });
  }, []);

  const loadSongs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = debouncedSearch.trim()
        ? await searchSongs(debouncedSearch.trim())
        : await getSongsByYear(selectedYear);

      if (result.error) {
        setError(result.error);
        setSongs([]);
      } else {
        setSongs(result.data ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar canciones");
      setSongs([]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, debouncedSearch]);

  useEffect(() => {
    loadSongs();
  }, [loadSongs]);

  // Usa el proxy de streaming para archivos de Drive (soporta Range/seeking)
  // Fallback a la URL directa para archivos externos (Soundcloud, etc.)
  function songToTrack(s: Song) {
    const audioUrl = s.drive_file_id
      ? `/api/drive/stream/${s.drive_file_id}`
      : s.drive_file_url!;
    return {
      id: s.id,
      title: s.title,
      artist: s.artist_name,
      url: audioUrl,
      duration: s.duration_seconds ?? undefined,
      coverArt: s.cover_art_url ?? undefined,
      bpm: s.bpm ?? undefined,
      keySignature: s.key_signature ?? undefined,
    };
  }

  function handlePlaySong(song: Song) {
    setSelectedSong(song);
    if (!song.drive_file_id && !song.drive_file_url) return;
    // Toggle pause if already playing this track
    if (player.currentTrack?.id === song.id && player.isPlaying) {
      player.pause();
      return;
    }
    // Use filtered/sorted display list as the queue when a filter is active
    const sourceList = (genreFilter || sortBy !== "default") ? displayedSongs : songs;
    const playable = sourceList.filter(s => !!s.drive_file_id || !!s.drive_file_url);
    if (playable.length <= 1) {
      player.play(songToTrack(song));
    } else {
      player.play(songToTrack(song), playable.map(songToTrack));
    }
  }

  function handleAddToQueue(e: React.MouseEvent, song: Song) {
    e.stopPropagation();
    if (!song.drive_file_id && !song.drive_file_url) return;
    player.addToQueue(songToTrack(song));
    toast.success(`"${song.title}" añadida a la cola`);
  }

  function handleSelectSong(song: Song) {
    setSelectedSong((prev) => (prev?.id === song.id ? null : song));
  }

  function handleEdit(song: Song) {
    setEditingSong(song);
    setShowForm(true);
  }

  function handleAdd() {
    setEditingSong(undefined);
    setShowForm(true);
  }

  // Keyboard shortcuts: N = nueva canción, E = export CSV, V = toggle view
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.metaKey || e.ctrlKey) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        handleAdd();
      }
      if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        handleExportCSV();
      }
      if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        setViewMode(prev => prev === "list" ? "grid" : "list");
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape closes inline comments panel (detail panel handles its own Escape)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (selectedSong && !detailSong) { setSelectedSong(null); return; }
        if (keyboardSongId) { setKeyboardSongId(null); keyboardSongIdRef.current = null; }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedSong, detailSong, keyboardSongId]);

  // Persist view mode + sort to localStorage
  useEffect(() => { localStorage.setItem("discografia-view-mode", viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem("discografia-sort", sortBy); }, [sortBy]);

  // Keyboard: / = focus search; ↑/↓ = navigate songs; Enter = play/open detail
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !e.metaKey && !e.ctrlKey) {
        const songs = displayedSongsRef.current;
        if (!songs.length) return;
        e.preventDefault();
        const curIdx = keyboardSongIdRef.current
          ? songs.findIndex((s) => s.id === keyboardSongIdRef.current)
          : -1;
        const nextIdx =
          e.key === "ArrowDown"
            ? curIdx < songs.length - 1 ? curIdx + 1 : 0
            : curIdx > 0 ? curIdx - 1 : songs.length - 1;
        const next = songs[nextIdx];
        if (next) {
          keyboardSongIdRef.current = next.id;
          setKeyboardSongId(next.id);
          requestAnimationFrame(() => {
            document.getElementById(`song-row-${next.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          });
        }
        return;
      }
      if (e.key === "Enter" && keyboardSongIdRef.current) {
        const song = displayedSongsRef.current.find((s) => s.id === keyboardSongIdRef.current);
        if (song) {
          e.preventDefault();
          if (song.drive_file_url || song.drive_file_id) handlePlaySongRef.current(song);
          else setDetailSong(song);
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSaved(saved: Song) {
    setShowForm(false);
    setEditingSong(undefined);
    startTransition(() => {
      loadSongs();
      getAvailableYears().then(({ data }) => {
        if (data && data.length > 0) {
          const merged = Array.from(new Set([...data, ...DEFAULT_YEARS])).sort(
            (a, b) => b - a
          );
          setYears(merged);
        }
      });
    });
  }

  function handleExportCSV() {
    if (displayedSongs.length === 0) return;
    const headers = [
      "Título", "Artista", "Featuring", "Año", "Género",
      "Duración (seg)", "Spotify", "YouTube", "Apple Music", "SoundCloud",
      "Tags",
    ];
    const rows = displayedSongs.map((s) => [
      s.title,
      s.artist_name,
      (s.featuring ?? []).join("; "),
      String(s.year),
      s.genre ?? "",
      s.duration_seconds != null ? String(s.duration_seconds) : "",
      s.spotify_url ?? "",
      s.youtube_url ?? "",
      s.apple_music_url ?? "",
      s.soundcloud_url ?? "",
      (s.tags ?? []).join("; "),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `discografia_${isSearching ? "busqueda" : selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Optimistic delete — la fila desaparece al instante, vuelve si hay error
  // Se asigna al ref para que onAction siempre use la versión más fresca
  handleDeleteRef.current = async (song: Song) => {
    if (!await confirm({ title: `¿Eliminar "${song.title}"?`, message: "Esta acción no se puede deshacer.", confirmLabel: "Eliminar", variant: "danger" })) return;
    const revert = removeOptimistic(song.id);
    const { error } = await deleteSong(song.id);
    if (error) { revert(); toast.error(error); }
    else toast.success(`"${song.title}" eliminada`);
  };

  function handlePlayAll() {
    const playable = displayedSongsRef.current.filter(s => !!s.drive_file_url || !!s.drive_file_id);
    if (playable.length === 0) return;
    player.play(songToTrack(playable[0]), playable.map(songToTrack));
  }

  function handleShuffleAll() {
    const playable = displayedSongsRef.current.filter(s => !!s.drive_file_url || !!s.drive_file_id);
    if (playable.length === 0) return;
    const shuffled = [...playable].sort(() => Math.random() - 0.5);
    player.play(songToTrack(shuffled[0]), shuffled.map(songToTrack));
  }

  const isSearching = debouncedSearch.trim().length > 0;

  // useMemo: evita recalcular filtros/sort en cada keystroke de búsqueda
  const displayedSongs = useMemo(() => {
    let result = [...songs];
    if (genreFilter) result = result.filter(s => (s.genre ?? "Sin género") === genreFilter);
    if (missingPlatformFilter) result = result.filter(s => !s.spotify_url && !s.youtube_url && !s.apple_music_url && !s.soundcloud_url);
    if (missingGenreFilter) result = result.filter(s => !s.genre);
    if (missingAudioFilter) result = result.filter(s => !s.drive_file_url && !s.drive_file_id);
    if (missingCoverArtFilter) result = result.filter(s => !s.cover_art_url);
    if (missingBpmFilter) result = result.filter(s => (!!s.drive_file_url || !!s.drive_file_id) && (!s.bpm || !s.key_signature));
    switch (sortBy) {
      case "az":            result.sort((a, b) => a.title.localeCompare(b.title)); break;
      case "za":            result.sort((a, b) => b.title.localeCompare(a.title)); break;
      case "duration_asc":  result.sort((a, b) => (a.duration_seconds ?? 0) - (b.duration_seconds ?? 0)); break;
      case "duration_desc": result.sort((a, b) => (b.duration_seconds ?? 0) - (a.duration_seconds ?? 0)); break;
      case "newest":        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      case "oldest":        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
    }
    return result;
  }, [songs, genreFilter, missingPlatformFilter, missingGenreFilter, missingAudioFilter, missingCoverArtFilter, missingBpmFilter, sortBy]);

  // Stats del año actual: cantidad + duración total
  const yearStats = useMemo(() => {
    const count = songs.length;
    const totalSecs = songs.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0);
    if (count === 0) return null;
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = Math.floor(totalSecs % 60);
    const durationStr = totalSecs === 0
      ? null
      : h > 0
        ? `${h}h ${m}m`
        : `${m}:${s.toString().padStart(2, "0")}`;
    return { count, durationStr };
  }, [songs]);

  // Stable dispatch — onAction no cambia entre renders → memo en SongRow funciona
  type SongActionType = "play" | "select" | "edit" | "delete" | "detail" | "lyrics" | "addToQueue";
  const onAction = useCallback((type: SongActionType, song: Song) => {
    if (type === "play")   handlePlaySongRef.current(song);
    else if (type === "select") setSelectedSong(prev => prev?.id === song.id ? null : song);
    else if (type === "edit")   { setEditingSong(song); setShowForm(true); }
    else if (type === "delete") handleDeleteRef.current(song);
    else if (type === "detail") setDetailSong(song);
    else if (type === "lyrics") setLyricsSong(song);
    else if (type === "addToQueue") {
      if (!song.drive_file_id && !song.drive_file_url) return;
      player.addToQueue(songToTrack(song));
      toast.success(`"${song.title}" añadida a la cola`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, toast]);

  // Keep mutable refs in sync with latest values (used in keyboard / action handlers)
  displayedSongsRef.current = displayedSongs;
  handlePlaySongRef.current = handlePlaySong;

  return (
    <>
    {/* ── Layout de dos columnas estilo Spotify ──────────────────────────── */}
    <div className="flex items-start">

      {/* ── COLUMNA IZQUIERDA: contenido principal (scrollable) ─────────── */}
      <div className={cn(
        "space-y-6 min-w-0 transition-all duration-300",
        detailSong ? "flex-1" : "w-full"
      )}>
      {/* Header */}
      <div className="card-premium relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-violet-400/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/8 border border-primary/25 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_hsl(var(--primary)/0.2)]">
            <Disc3 className="h-6 w-6 text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
          </div>
          <div>
            <h1 className="text-xl font-black leading-tight tracking-tight gradient-text">Discografía</h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              {!loading && yearStats
                ? <>
                    <span className="tabular-nums">{yearStats.count}</span>
                    {" "}canción{yearStats.count !== 1 ? "es" : ""}
                    {yearStats.durationStr && <> · <span className="tabular-nums">{yearStats.durationStr}</span> total</>}
                  </>
                : "Toda la música publicada organizada por año"
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {songs.length > 0 && (
            <>
              {/* Play all / Shuffle */}
              {displayedSongs.some(s => !!(s.drive_file_url || s.drive_file_id)) && (
                <>
                  <button
                    onClick={handlePlayAll}
                    title="Reproducir todo"
                    className="flex items-center gap-1.5 px-3 py-2 border border-border/60 rounded-xl hover:bg-secondary/60 transition-all active:scale-95 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ListMusic className="h-4 w-4" />
                    <span className="hidden sm:inline">Reproducir</span>
                  </button>
                  <button
                    onClick={handleShuffleAll}
                    title="Reproducir en modo aleatorio"
                    className="flex items-center gap-1.5 px-3 py-2 border border-border/60 rounded-xl hover:bg-secondary/60 transition-all active:scale-95 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <Shuffle className="h-4 w-4" />
                    <span className="hidden sm:inline">Aleatorio</span>
                  </button>
                </>
              )}
              {/* View toggle */}
              <div className="flex items-center border border-border/60 rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode("list")}
                  title="Vista lista"
                  className={cn(
                    "px-2.5 py-2 transition-all active:scale-95",
                    viewMode === "list" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  title="Vista cuadrícula"
                  className={cn(
                    "px-2.5 py-2 transition-all active:scale-95 border-l border-border/60",
                    viewMode === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
              {/* Sort dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="appearance-none pl-7 pr-7 py-2 bg-card border border-border/60 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="default">Orden original</option>
                  <option value="newest">Más reciente</option>
                  <option value="oldest">Más antigua</option>
                  <option value="az">A → Z</option>
                  <option value="za">Z → A</option>
                  <option value="duration_desc">Mayor duración</option>
                  <option value="duration_asc">Menor duración</option>
                </select>
                <ArrowUpDown className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
              <button
                onClick={handleExportCSV}
                title="Exportar como CSV (E)"
                className="flex items-center gap-2 px-3 py-2 border border-border/60 rounded-xl hover:bg-secondary/60 transition-all active:scale-95 text-sm text-muted-foreground hover:text-foreground"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
              </button>
            </>
          )}
          <Link
            href="/discografia/timeline"
            className="flex items-center gap-1.5 px-3 py-2 border border-border/60 rounded-xl hover:bg-secondary/60 transition-all active:scale-95 text-sm text-muted-foreground hover:text-foreground"
            title="Ver timeline de lanzamientos"
          >
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Timeline</span>
          </Link>
          <button
            onClick={handleAdd}
            className="btn-shine flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 hover:scale-[1.02] transition-all active:scale-95 text-sm font-black shadow-[0_0_20px_hsl(var(--primary)/0.35)]"
          >
            <Plus className="h-4 w-4" />
            Agregar canción
            <kbd className="hidden md:inline-flex ml-1 text-[9px] bg-primary-foreground/20 px-1 py-0.5 rounded font-mono">N</kbd>
          </button>
        </div>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Buscar por título, artista o género… (/)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-3 bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary/35 focus:bg-card/80 transition-all placeholder:text-muted-foreground/35"
        />
        {/* Indicador de búsqueda pendiente o botón de limpiar */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isSearchPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary/60" />
          ) : searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              className="text-muted-foreground hover:text-foreground transition-all active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Tabs de años + count — solo visible cuando no hay búsqueda */}
      {!isSearching && (
        <div className="flex items-center gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
            {years.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm whitespace-nowrap pill-base active:scale-95",
                  selectedYear === year
                    ? "font-black bg-primary text-primary-foreground shadow-[0_2px_16px_hsl(var(--primary)/0.55),inset_0_1px_0_hsl(0_0%_100%/0.15)]"
                    : "font-medium bg-card/70 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-card/90"
                )}
              >
                {year}
              </button>
            ))}
          </div>
          {!loading && songs.length > 0 && (
            <span className="stat-badge flex-shrink-0 text-muted-foreground">
              {songs.length} canción{songs.length !== 1 ? "es" : ""}
            </span>
          )}
        </div>
      )}

      {/* Count chip when searching */}
      {isSearching && !loading && songs.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {songs.length} resultado{songs.length !== 1 ? "s" : ""} para &ldquo;{searchQuery}&rdquo;
        </p>
      )}

      {/* ── Stats strip ────────────────────────────────────────────────── */}
      {!loading && songs.length > 0 && (() => {
        const genreCounts: Record<string, number> = {};
        let withAudio = 0;
        let totalSeconds = 0;
        songs.forEach((s) => {
          const g = s.genre ?? "Sin género";
          genreCounts[g] = (genreCounts[g] ?? 0) + 1;
          if (s.drive_file_url || s.drive_file_id) withAudio++;
          if (s.duration_seconds) totalSeconds += s.duration_seconds;
        });
        const topGenres = Object.entries(genreCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5);
        const totalMin = Math.round(totalSeconds / 60);

        return (
          <div className="flex flex-wrap items-center gap-2">
            {/* Genre filter chips — clickable */}
            {topGenres.map(([genre, count]) => {
              const active = genreFilter === genre;
              return (
                <button
                  key={genre}
                  onClick={() => setGenreFilter(active ? null : genre)}
                  className={cn(
                    "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full pill-base active:scale-95",
                    active
                      ? "bg-primary/18 text-primary border border-primary/40 font-black shadow-[0_0_0_1px_hsl(var(--primary)/0.25),0_0_12px_hsl(var(--primary)/0.15)]"
                      : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 font-medium"
                  )}
                  title={active ? "Quitar filtro" : `Filtrar por ${genre}`}
                >
                  <Filter className={cn("h-3 w-3 flex-shrink-0", active ? "text-primary drop-shadow-[0_0_4px_hsl(var(--primary)/0.7)]" : "")} />
                  <span className="truncate max-w-[100px]">{genre}</span>
                  <span className={cn("tabular-nums font-black", active ? "text-primary" : "text-foreground/70")}>{count}</span>
                </button>
              );
            })}
            {/* Active filter indicator */}
            {genreFilter && (
              <span className="flex items-center gap-1 text-[11px] text-primary">
                — {displayedSongs.length} resultado{displayedSongs.length !== 1 ? "s" : ""}
                <button onClick={() => setGenreFilter(null)} className="ml-0.5 hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {withAudio > 0 && (
              <span className="flex items-center gap-1.5 text-[11px] text-primary px-2.5 py-1 rounded-full border border-primary/25 bg-primary/12 shadow-[0_0_8px_hsl(var(--primary)/0.10)] font-black">
                <Play className="h-3 w-3 flex-shrink-0 drop-shadow-[0_0_4px_hsl(var(--primary)/0.6)]" />
                {withAudio} con audio
              </span>
            )}
            {(() => {
              const withoutAudio = songs.filter(s => !s.drive_file_url && !s.drive_file_id).length;
              if (withoutAudio === 0) return null;
              return (
                <button
                  onClick={() => setMissingAudioFilter(!missingAudioFilter)}
                  className={cn(
                    "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full transition-all active:scale-95",
                    missingAudioFilter
                      ? "bg-orange-500/18 text-orange-400 border border-orange-500/40 font-black shadow-[0_0_10px_hsl(30_80%_50%/0.15)]"
                      : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 font-medium"
                  )}
                  title={missingAudioFilter ? "Mostrar todas" : "Ver canciones sin archivo de audio"}
                >
                  <Music className="h-3 w-3 flex-shrink-0" />
                  {withoutAudio} sin audio
                  {missingAudioFilter && <X className="h-2.5 w-2.5 ml-0.5 opacity-70" />}
                </button>
              );
            })()}
            {(() => {
              const withoutPlatform = songs.filter(s => !s.spotify_url && !s.youtube_url && !s.apple_music_url && !s.soundcloud_url).length;
              if (withoutPlatform === 0) return null;
              return (
                <button
                  onClick={() => setMissingPlatformFilter(!missingPlatformFilter)}
                  className={cn(
                    "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full transition-all active:scale-95",
                    missingPlatformFilter
                      ? "bg-orange-500/18 text-orange-400 border border-orange-500/40 font-black shadow-[0_0_10px_hsl(30_80%_50%/0.15)]"
                      : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 font-medium"
                  )}
                  title={missingPlatformFilter ? "Mostrar todas" : "Ver canciones sin streaming"}
                >
                  <Radio className="h-3 w-3 flex-shrink-0" />
                  {withoutPlatform} sin streaming
                </button>
              );
            })()}
            {(() => {
              const withoutGenre = songs.filter(s => !s.genre).length;
              if (withoutGenre === 0) return null;
              return (
                <button
                  onClick={() => { setMissingGenreFilter(!missingGenreFilter); setGenreFilter(null); }}
                  className={cn(
                    "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full transition-all active:scale-95",
                    missingGenreFilter
                      ? "bg-yellow-500/18 text-yellow-400 border border-yellow-500/40 font-black shadow-[0_0_10px_hsl(50_80%_50%/0.15)]"
                      : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 font-medium"
                  )}
                  title={missingGenreFilter ? "Mostrar todas" : "Ver canciones sin género"}
                >
                  <Filter className="h-3 w-3 flex-shrink-0" />
                  {withoutGenre} sin género
                </button>
              );
            })()}
            {(() => {
              const withoutCover = songs.filter(s => !s.cover_art_url).length;
              if (withoutCover === 0) return null;
              return (
                <button
                  onClick={() => setMissingCoverArtFilter(!missingCoverArtFilter)}
                  className={cn(
                    "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full transition-all active:scale-95",
                    missingCoverArtFilter
                      ? "bg-pink-500/18 text-pink-400 border border-pink-500/40 font-black shadow-[0_0_10px_hsl(340_80%_55%/0.15)]"
                      : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 font-medium"
                  )}
                  title={missingCoverArtFilter ? "Mostrar todas" : "Ver canciones sin cover art"}
                >
                  <ImageOff className="h-3 w-3 flex-shrink-0" />
                  {withoutCover} sin cover
                  {missingCoverArtFilter && <X className="h-2.5 w-2.5 ml-0.5 opacity-70" />}
                </button>
              );
            })()}
            {(() => {
              const withoutBpm = songs.filter(s => (!!s.drive_file_url || !!s.drive_file_id) && (!s.bpm || !s.key_signature)).length;
              if (withoutBpm === 0) return null;
              return (
                <button
                  onClick={() => setMissingBpmFilter(!missingBpmFilter)}
                  className={cn(
                    "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full transition-all active:scale-95",
                    missingBpmFilter
                      ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                      : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                  )}
                  title={missingBpmFilter ? "Mostrar todas" : "Ver canciones sin BPM o tonalidad"}
                >
                  <Zap className="h-3 w-3 flex-shrink-0" />
                  {withoutBpm} sin BPM/key
                  {missingBpmFilter && <X className="h-2.5 w-2.5 ml-0.5 opacity-70" />}
                </button>
              );
            })()}
            {totalMin > 0 && (
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                <Clock className="h-3 w-3 flex-shrink-0" />
                ~{totalMin} min
              </span>
            )}
          </div>
        );
      })()}

      {/* Grid view skeleton */}
      {viewMode === "grid" && loading && (
        <SongCardSkeleton count={10} />
      )}

      {/* Grid view */}
      {viewMode === "grid" && !loading && displayedSongs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 stagger-item">
          {displayedSongs.map((song) => {
            const isPlaying = player.currentTrack?.id === song.id && player.isPlaying;
            const hasAudio = !!(song.drive_file_url || song.drive_file_id);
            const platforms = [
              { label: "Spotify",    abbr: "SP", url: song.spotify_url,     color: "#1db954", bg: "rgba(29,185,84,0.12)",   border: "rgba(29,185,84,0.3)" },
              { label: "YouTube",    abbr: "YT", url: song.youtube_url,     color: "#ef4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.3)" },
              { label: "Apple",      abbr: "AM", url: song.apple_music_url, color: "#fa243c", bg: "rgba(250,36,60,0.12)",   border: "rgba(250,36,60,0.3)" },
              { label: "SoundCloud", abbr: "SC", url: song.soundcloud_url,  color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)" },
            ].filter(p => p.url);
            return (
              <div
                key={song.id}
                className={cn(
                  "card-premium card-gradient-border group relative rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer",
                  "hover:-translate-y-1",
                  isPlaying ? "border-primary/50 -translate-y-0.5" : "border-border/60"
                )}
                style={isPlaying
                  ? {
                      boxShadow: song.genre && GENRE_HEX[song.genre]
                        ? `0 0 0 1px ${GENRE_HEX[song.genre]}55, 0 8px 32px ${GENRE_HEX[song.genre]}33, 0 0 0 0 transparent`
                        : "0 0 0 1px hsl(var(--primary)/0.3), 0 6px 24px hsl(var(--primary)/0.2)",
                    }
                  : undefined
                }
                onClick={() => onAction("select", song)}
              >
                {/* ── Genre color stripe — 3px top accent ────────────── */}
                {song.genre && (
                  <div
                    className="absolute top-0 left-0 right-0 h-[3px] z-20 pointer-events-none"
                    style={{
                      background: GENRE_HEX[song.genre] ?? "hsl(var(--primary))",
                      boxShadow: `0 0 10px ${(GENRE_HEX[song.genre] ?? "hsl(var(--primary))")}80`,
                    }}
                  />
                )}

                {/* ── Cover art — full bleed ──────────────────────────── */}
                <div className="relative aspect-square overflow-hidden">
                  {song.cover_art_url ? (
                    <>
                      <Image
                        src={song.cover_art_url}
                        alt={song.title}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        unoptimized
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {/* Gradient overlay — bottom info legibility */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                    </>
                  ) : (
                    /* Placeholder con gradiente de marca — no más gray aburrido */
                    <div className={cn(
                      "absolute inset-0 flex flex-col items-center justify-center gap-2",
                      "bg-gradient-to-br",
                      isPlaying
                        ? "from-primary/30 via-primary/15 to-primary/5"
                        : "from-secondary via-secondary/80 to-background/60"
                    )}>
                      {/* Círculos decorativos de fondo */}
                      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-primary/8 blur-xl" />
                      <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-primary/6 blur-lg" />
                      <Disc3 className={cn(
                        "h-12 w-12 relative z-10 transition-all duration-500",
                        isPlaying
                          ? "text-primary animate-spin drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]"
                          : "text-muted-foreground/25 group-hover:text-muted-foreground/40 group-hover:scale-110"
                      )} style={isPlaying ? { animationDuration: "3s" } : {}} />
                      <span className="text-[10px] text-muted-foreground/30 font-medium relative z-10">Sin portada</span>
                    </div>
                  )}

                  {/* Chips: género + año */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
                    {song.genre ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white/85 font-semibold truncate max-w-[70%]">
                        {song.genre}
                      </span>
                    ) : <span />}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white/70 tabular-nums font-medium">
                      {song.year}
                    </span>
                  </div>

                  {/* Play button — botón grande centrado con glow */}
                  {hasAudio && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePlaySong(song); }}
                      className={cn(
                        "absolute inset-0 flex items-center justify-center z-10 transition-opacity",
                        isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                        "bg-primary/90 backdrop-blur-sm",
                        isPlaying
                          ? "shadow-[0_0_24px_hsl(var(--primary)/0.7)] scale-110"
                          : "shadow-[0_4px_20px_hsl(0_0%_0%/0.4)] hover:scale-110 hover:bg-primary"
                      )}>
                        {isPlaying
                          ? <Pause className="h-5 w-5 text-white" />
                          : <Play className="h-5 w-5 text-white ml-0.5" />
                        }
                      </div>
                    </button>
                  )}

                  {/* Equalizer si está reproduciendo */}
                  {isPlaying && (
                    <div className="absolute bottom-2 left-2 flex gap-[2px] items-end h-4 z-10">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="eq-bar w-[2.5px] bg-primary rounded-full"
                          style={{ height: `${[60,100,45,80][i-1]}%` }} />
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Info section ─────────────────────────────────────── */}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-sm font-black truncate leading-tight flex-1">{song.title}</p>
                    <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Add to queue */}
                      {hasAudio && (
                        <button
                          onClick={(e) => handleAddToQueue(e, song)}
                          title="Añadir a la cola"
                          className="p-1 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all active:scale-95"
                        >
                          <ListPlus className="h-3 w-3" />
                        </button>
                      )}
                      {/* Download button in grid card */}
                      {(song.drive_file_id || song.drive_file_url) && (
                        <a
                          href={song.drive_file_id
                            ? `/api/drive/stream/${song.drive_file_id}?dl=1&name=${encodeURIComponent(song.title)}`
                            : song.drive_file_url!}
                          download={song.drive_file_id ? song.title : undefined}
                          target={song.drive_file_id ? undefined : "_blank"}
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Descargar audio"
                          className="p-1 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all active:scale-95"
                        >
                          <ArrowDownToLine className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {song.artist_name}
                    {song.featuring.length > 0 && (
                      <span className="text-muted-foreground/60">
                        {" "}ft. {song.featuring.slice(0, 2).join(", ")}{song.featuring.length > 2 ? "…" : ""}
                      </span>
                    )}
                  </p>
                  {(song.duration_seconds || song.bpm || song.key_signature) && (
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {song.duration_seconds && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(song.duration_seconds)}
                        </span>
                      )}
                      {song.bpm && (
                        <span className="text-[10px] text-blue-400/70 font-mono tabular-nums" title="BPM">
                          {song.bpm}bpm
                        </span>
                      )}
                      {song.key_signature && (
                        <span className="text-[10px] text-purple-400/70 font-medium" title="Tonalidad">
                          {song.key_signature}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    {platforms.length > 0 ? (
                      <div className="flex gap-1">
                        {platforms.map(p => (
                          <a
                            key={p.label}
                            href={p.url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title={p.label}
                            className="px-1.5 py-0.5 rounded-md text-[9px] font-black border transition-all active:scale-95 hover:opacity-100"
                            style={{ color: p.color, background: p.bg, borderColor: p.border }}
                          >
                            {p.abbr}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
                        <Radio className="h-2.5 w-2.5" />
                        Sin streaming
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      {song.lyrics && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setLyricsSong(song); }}
                          title="Ver letra"
                          className="p-1 rounded-xl text-primary/60 hover:text-primary hover:bg-primary/10 transition-all active:scale-95"
                        >
                          <FileText className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleCopySongLink(e, song.id)}
                        title="Copiar enlace"
                        className={cn(
                          "p-1 rounded-xl transition-all active:scale-95 opacity-0 group-hover:opacity-100",
                          copiedSongId === song.id ? "text-green-400" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        )}
                      >
                        {copiedSongId === song.id
                          ? <Check className="h-3 w-3" />
                          : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List view — Contenido */}
      {(viewMode === "list" || loading || displayedSongs.length === 0) && (
      <div className="card-premium rounded-2xl overflow-hidden">
        {loading ? (
          <div>
            {Array.from({ length: 8 }).map((_, i) => <SongRowSkeleton key={i} />)}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={loadSongs}
              className="mt-3 text-sm text-primary hover:underline"
            >
              Reintentar
            </button>
          </div>
        ) : songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="relative mb-5">
              <div className="absolute inset-0 bg-primary/15 rounded-2xl blur-xl scale-125" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                <Music className="h-8 w-8 text-primary/50" />
              </div>
            </div>
            <p className="text-sm font-medium text-foreground/70">
              {isSearching ? `Sin resultados para "${searchQuery}"` : `No hay canciones en ${selectedYear}`}
            </p>
            <p className="text-xs text-muted-foreground/50 mt-1">
              {isSearching ? "Probá con otro término" : "Registrá tu primera canción de este año"}
            </p>
            {!isSearching && (
              <button
                onClick={handleAdd}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/25 text-primary rounded-xl text-sm font-medium hover:bg-primary/20 transition-all active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Agregar canción
              </button>
            )}
          </div>
        ) : displayedSongs.length === 0 && (genreFilter || sortBy !== "default" || missingPlatformFilter || missingGenreFilter || missingAudioFilter) ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            {missingPlatformFilter && !genreFilter && !missingGenreFilter && !missingAudioFilter ? (
              <>
                <div className="relative mb-5">
                  <div className="absolute inset-0 bg-green-500/15 rounded-2xl blur-xl scale-125" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-700/5 border border-green-500/20 flex items-center justify-center">
                    <Radio className="h-8 w-8 text-green-400/70" />
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground/70">¡Todo en streaming!</p>
                <p className="text-xs text-muted-foreground/50 mt-1">Todas las canciones tienen al menos una plataforma</p>
              </>
            ) : missingGenreFilter && !genreFilter && !missingPlatformFilter && !missingAudioFilter ? (
              <>
                <div className="relative mb-5">
                  <div className="absolute inset-0 bg-green-500/15 rounded-2xl blur-xl scale-125" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-700/5 border border-green-500/20 flex items-center justify-center">
                    <Music className="h-8 w-8 text-green-400/70" />
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground/70">¡Géneros completos!</p>
                <p className="text-xs text-muted-foreground/50 mt-1">Todas las canciones tienen género asignado</p>
              </>
            ) : missingAudioFilter && !genreFilter && !missingPlatformFilter && !missingGenreFilter ? (
              <>
                <div className="relative mb-5">
                  <div className="absolute inset-0 bg-green-500/15 rounded-2xl blur-xl scale-125" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-700/5 border border-green-500/20 flex items-center justify-center">
                    <Play className="h-8 w-8 text-green-400/70" />
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground/70">¡Todas tienen audio!</p>
                <p className="text-xs text-muted-foreground/50 mt-1">Todas las canciones tienen archivo de audio vinculado</p>
              </>
            ) : (
              <>
                <div className="relative mb-5">
                  <div className="absolute inset-0 bg-muted/20 rounded-2xl blur-xl scale-125" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-secondary/50 border border-border/60 flex items-center justify-center">
                    <Filter className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground/70">Sin canciones con ese filtro</p>
                <p className="text-xs text-muted-foreground/50 mt-1">Probá ajustando los filtros activos</p>
              </>
            )}
            <button
              onClick={() => { setGenreFilter(null); setSortBy("default"); setMissingPlatformFilter(false); setMissingGenreFilter(false); setMissingAudioFilter(false); }}
              className="mt-4 text-xs text-primary/70 hover:text-primary transition-all active:scale-95"
            >
              Quitar filtros
            </button>
          </div>
        ) : sortBy === "default" && !genreFilter && !isSearching && !missingPlatformFilter && !missingGenreFilter && !missingAudioFilter ? (
          // Grouped by year view
          (() => {
            const yearGroups: Record<number, Song[]> = {};
            for (const s of displayedSongs) {
              if (!yearGroups[s.year]) yearGroups[s.year] = [];
              yearGroups[s.year].push(s);
            }
            const years = Object.keys(yearGroups).map(Number).sort((a, b) => b - a);
            let globalIdx = 0;
            return (
              <div>
                {years.map((year) => (
                  <div key={year}>
                    <div className="section-group-header">
                      <span className="section-group-header-label tabular-nums">{year}</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-border/50 to-transparent" />
                      <span className="text-[10px] text-muted-foreground/70 bg-secondary/80 border border-border/40 px-2 py-0.5 rounded-full tabular-nums font-bold">{yearGroups[year].length}</span>
                    </div>
                    <div className="divide-y divide-border/50 list-enter">
                      {yearGroups[year].map((song) => {
                        const idx = globalIdx++;
                        return (
                          <div key={song.id} id={`song-row-${song.id}`} className="row-interactive" onDoubleClick={() => handleEdit(song)}>
                            <SongRow
                              song={song}
                              index={idx + 1}
                              isPlaying={player.currentTrack?.id === song.id && player.isPlaying}
                              isSelected={selectedSong?.id === song.id}
                              isKeyboardSelected={keyboardSongId === song.id}
                              onAction={onAction}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()
        ) : (
          <div className="divide-y divide-border/50">
            {displayedSongs.map((song, idx) => (
              <div key={song.id} id={`song-row-${song.id}`} className="row-interactive" onDoubleClick={() => handleEdit(song)}>
                <SongRow
                  song={song}
                  index={idx + 1}
                  isPlaying={player.currentTrack?.id === song.id && player.isPlaying}
                  isSelected={selectedSong?.id === song.id}
                  isKeyboardSelected={keyboardSongId === song.id}
                  onAction={onAction}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Panel de comentarios */}
      {selectedSong && (
        <div className="card-premium rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-secondary/50 border-b border-border/60">
            <span className="text-xs text-muted-foreground font-medium">
              {selectedSong.title}
            </span>
            <button
              onClick={() => setSelectedSong(null)}
              className="p-1 rounded-xl hover:bg-secondary text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="max-h-96">
            <CommentsPanel
              song_id={selectedSong.id}
              currentUserId={user?.id}
            />
          </div>
        </div>
      )}

      {ConfirmDialog}

      </div> {/* ← cierra columna izquierda */}

      {/* ── COLUMNA DERECHA: panel sticky (desktop) ─────────────────────── */}
      {detailSong && (
        <>
          {/* Desktop: sidebar fijo a la derecha */}
          <div
            className="hidden md:flex flex-col flex-shrink-0 w-80 xl:w-[360px] sticky top-0 self-start border-l border-border/60 overflow-hidden"
            style={{ height: "calc(100vh - 72px)" }}
          >
            <SongDetailPanel
              song={detailSong}
              mode="sidebar"
              onClose={() => setDetailSong(null)}
              onEdit={() => {
                handleEdit(detailSong);
                setDetailSong(null);
              }}
              onOpenLyrics={() => {
                setLyricsSong(detailSong);
                setDetailSong(null);
              }}
            />
          </div>

          {/* Mobile: overlay clásico */}
          <div className="md:hidden">
            <SongDetailPanel
              song={detailSong}
              mode="overlay"
              onClose={() => setDetailSong(null)}
              onEdit={() => {
                handleEdit(detailSong);
                setDetailSong(null);
              }}
              onOpenLyrics={() => {
                setLyricsSong(detailSong);
                setDetailSong(null);
              }}
            />
          </div>
        </>
      )}

    </div> {/* ← cierra flex */}

    {/* ── OVERLAYS: fuera del flex, siempre sobre todo ─────────────────── */}

    {/* Panel de letras */}
    {lyricsSong && (
      <LyricsPanel
        type="song"
        id={lyricsSong.id}
        title={lyricsSong.title}
        artist={lyricsSong.artist_name}
        initialLyrics={lyricsSong.lyrics}
        onClose={() => setLyricsSong(null)}
        onSaved={(newLyrics) => {
          setSongs((prev: Song[]) =>
            prev.map((s: Song) =>
              s.id === lyricsSong.id ? { ...s, lyrics: newLyrics } : s
            )
          );
          setLyricsSong((prev) => prev ? { ...prev, lyrics: newLyrics } : prev);
        }}
      />
    )}

    {/* Modal de formulario */}
    {showForm && (
      <SongForm
        song={editingSong}
        artistName={profile?.full_name ?? undefined}
        onClose={() => {
          setShowForm(false);
          setEditingSong(undefined);
        }}
        onSaved={handleSaved}
      />
    )}
  </>
  );
}

type SongActionType = "play" | "select" | "edit" | "delete" | "detail" | "lyrics" | "addToQueue";
interface SongRowProps {
  song: Song;
  index: number;
  isPlaying: boolean;
  isSelected: boolean;
  isKeyboardSelected: boolean;
  onAction: (type: SongActionType, song: Song) => void;
}

const SongRow = memo(function SongRow({
  song,
  index,
  isPlaying,
  isSelected,
  isKeyboardSelected,
  onAction,
}: SongRowProps) {
  const hasAudio = !!(song.drive_file_url || song.drive_file_id);
  const [linkCopied, setLinkCopied] = useState(false);

  function getDownloadUrl() {
    if (song.drive_file_id) {
      return `/api/drive/stream/${song.drive_file_id}?dl=1&name=${encodeURIComponent(song.title)}`;
    }
    if (song.drive_file_url) return song.drive_file_url;
    return null;
  }
  const downloadUrl = getDownloadUrl();

  function handleCopyLink(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/discografia?song=${song.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }
  const platformLinks = [
    { label: "Spotify",    abbr: "SP", color: "text-[#1db954]", bg: "bg-[#1db954]/12 border-[#1db954]/25 hover:bg-[#1db954]/20", url: song.spotify_url },
    { label: "YouTube",   abbr: "YT", color: "text-[#ff0000]", bg: "bg-[#ff0000]/12 border-[#ff0000]/25 hover:bg-[#ff0000]/20", url: song.youtube_url },
    { label: "Apple",     abbr: "AM", color: "text-[#fa243c]", bg: "bg-[#fa243c]/12 border-[#fa243c]/25 hover:bg-[#fa243c]/20", url: song.apple_music_url },
    { label: "SoundCloud",abbr: "SC", color: "text-[#ff5500]", bg: "bg-[#ff5500]/12 border-[#ff5500]/25 hover:bg-[#ff5500]/20", url: song.soundcloud_url },
  ].filter((l) => l.url);

  const genreColors = getGenreColors(song.genre ?? null);

  return (
    <div
      className={cn(
        "stagger-item relative flex items-center gap-3 px-4 py-3.5 row-hover transition-all duration-150 active:scale-[0.99] group rounded-xl mx-1.5",
        isPlaying && "row-is-playing",
        isSelected && "bg-secondary/60",
        isKeyboardSelected && "ring-1 ring-inset ring-primary/50 bg-primary/5"
      )}
    >
      {/* Accent bar izquierda — visible cuando suena, con glow */}
      {isPlaying && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.8)]" />
      )}

      {/* Número / Play / Pause — crossfade suave */}
      <div className="w-7 flex-shrink-0 text-center relative h-7">
        {isPlaying ? (
          /* Playing: EQ animado (fade-out en hover) → Pause (fade-in en hover) */
          <>
            <button
              onClick={() => onAction("play", song)}
              title="Pausar"
              className="absolute inset-0 flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground hover:bg-primary/80 transition-all active:scale-95 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
            >
              <Pause className="h-3 w-3" />
            </button>
            <span className="absolute inset-0 flex items-center justify-center w-7 h-7 transition-all group-hover:opacity-0 group-hover:scale-90">
              <span className="flex gap-0.5 items-end h-3.5">
                <span className="w-[3px] bg-primary rounded-full eq-bar" style={{ height: "8px" }} />
                <span className="w-[3px] bg-primary rounded-full eq-bar" style={{ height: "12px" }} />
                <span className="w-[3px] bg-primary rounded-full eq-bar" style={{ height: "6px" }} />
              </span>
            </span>
          </>
        ) : hasAudio ? (
          /* Con audio: número (fade-out en hover) → play button (fade-in en hover) */
          <>
            <button
              onClick={() => onAction("play", song)}
              title="Reproducir"
              className="absolute inset-0 flex items-center justify-center w-7 h-7 rounded-full text-primary-foreground bg-primary hover:bg-primary/85 transition-all active:scale-95 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
            >
              <Play className="h-3 w-3 ml-0.5" />
            </button>
            <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/50 tabular-nums select-none transition-all group-hover:opacity-0 group-hover:scale-90">{index}</span>
          </>
        ) : (
          /* Sin audio: número siempre */
          <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/50 tabular-nums select-none">{index}</span>
        )}
      </div>

      {/* Cover art placeholder */}
      <div className={cn(
        "w-11 h-11 flex-shrink-0 rounded-xl flex items-center justify-center overflow-hidden relative transition-all duration-300",
        !song.cover_art_url && genreColors ? genreColors.bg : "bg-secondary",
        isPlaying && "shadow-[0_0_14px_hsl(var(--primary)/0.5)] ring-1 ring-primary/40"
      )}>
        {song.cover_art_url ? (
          <Image
            src={song.cover_art_url}
            alt={song.title}
            fill
            sizes="44px"
            unoptimized
            className="rounded-xl object-cover"
          />
        ) : (
          <Music className={cn("h-4 w-4 group-hover:scale-110 transition-transform", genreColors ? genreColors.text : "text-muted-foreground/50")} />
        )}
      </div>

      {/* Info — click opens detail panel */}
      <button
        onClick={() => onAction("detail", song)}
        className="flex-1 min-w-0 text-left"
      >
        <p className={cn("text-[13px] font-black truncate leading-tight", isPlaying ? "text-primary" : "text-foreground/90")}>
          {song.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[11px] text-muted-foreground/70 truncate">
            {song.artist_name}
            {song.featuring.length > 0 && ` ft. ${song.featuring.join(", ")}`}
          </span>
          {song.genre && genreColors && (
            <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0", genreColors.bg, genreColors.text)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", genreColors.dot)} />
              {song.genre}
            </span>
          )}
          {song.genre && !genreColors && (
            <span className="text-xs text-muted-foreground"> · {song.genre}</span>
          )}
          {song.bpm && (
            <span className="text-[10px] text-blue-400/70 font-mono tabular-nums flex-shrink-0" title="BPM">
              {song.bpm}bpm
            </span>
          )}
          {song.key_signature && (
            <span className="text-[10px] text-purple-400/70 font-medium flex-shrink-0" title="Tonalidad">
              {song.key_signature}
            </span>
          )}
        </div>
      </button>

      {/* Tags */}
      <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
        {(song.tags ?? []).slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="px-1.5 py-0.5 bg-secondary rounded text-[10px] text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Duración */}
      <span className="hidden sm:block text-xs text-muted-foreground flex-shrink-0 w-10 text-right">
        {song.duration_seconds ? formatTime(song.duration_seconds) : "—"}
      </span>

      {/* Links externos — colored platform badges */}
      {platformLinks.length > 0 && (
        <div className="hidden md:flex items-center gap-1 flex-shrink-0">
          {platformLinks.slice(0, 4).map(({ label, abbr, color, bg, url }) => (
            <a
              key={label}
              href={url!}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[9px] font-black border transition-all active:scale-95",
                color, bg
              )}
              title={label}
              onClick={(e) => e.stopPropagation()}
            >
              {abbr}
            </a>
          ))}
        </div>
      )}

      {/* Descarga — siempre visible cuando hay audio */}
      {downloadUrl && (
        <a
          href={downloadUrl}
          download={song.drive_file_id ? `${song.title}` : undefined}
          target={song.drive_file_id ? undefined : "_blank"}
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Descargar audio"
          className="flex-shrink-0 p-1.5 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all active:scale-95"
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
        </a>
      )}

      {/* Analizar BPM hint — solo si hay audio y faltan datos musicales */}
      {hasAudio && !song.bpm && !song.key_signature && (
        <Link
          href="/analizar"
          onClick={(e) => e.stopPropagation()}
          title="Analizar BPM y tonalidad"
          className="hidden group-hover:flex items-center gap-1 px-2 py-1 rounded-xl bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-all active:scale-95 flex-shrink-0 text-[10px] font-medium"
        >
          <Zap className="h-3 w-3" />
          BPM
        </Link>
      )}

      {/* Public badge (always visible) */}
      {song.is_public && (
        <span title="Canción pública — visible en EPK" className="flex-shrink-0 p-1.5 text-green-400/60">
          <Globe className="h-3.5 w-3.5" />
        </span>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {/* Add to queue */}
        {hasAudio && (
          <button
            onClick={(e) => { e.stopPropagation(); onAction("addToQueue", song); }}
            title="Añadir a la cola"
            className="p-1.5 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all active:scale-95"
          >
            <ListPlus className="h-3.5 w-3.5" />
          </button>
        )}
        {/* Open full detail page */}
        <Link
          href={`/discografia/${song.id}`}
          onClick={(e) => e.stopPropagation()}
          title="Abrir página completa"
          className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        <button
          onClick={handleCopyLink}
          className={cn(
            "p-1.5 rounded-xl transition-all active:scale-95",
            linkCopied ? "text-green-400" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
          title="Copiar enlace"
        >
          {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => onAction("select", song)}
          className={cn(
            "p-1.5 rounded-xl transition-all active:scale-95",
            isSelected
              ? "bg-primary/15 text-primary"
              : "hover:bg-secondary text-muted-foreground hover:text-foreground"
          )}
          title="Comentarios"
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onAction("lyrics", song)}
          className={cn(
            "p-1.5 rounded-xl transition-all active:scale-95",
            song.lyrics
              ? "text-primary/70 hover:text-primary hover:bg-primary/10"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
          title={song.lyrics ? "Ver / editar letra" : "Agregar letra"}
        >
          <FileText className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onAction("edit", song)}
          className="p-1.5 rounded-xl hover:bg-secondary transition-all active:scale-95 text-muted-foreground hover:text-foreground"
          title="Editar"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onAction("delete", song)}
          className="p-1.5 rounded-xl hover:bg-red-500/10 transition-all active:scale-95 text-muted-foreground hover:text-red-500"
          title="Eliminar"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
});
