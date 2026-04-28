"use client";

import { useState, useEffect, useCallback, useTransition, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Disc3,
  Search,
  Plus,
  Music,
  Play,
  Pause,
  ExternalLink,
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
} from "lucide-react";
import SongDetailPanel from "@/components/songs/SongDetailPanel";
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
import { formatTime } from "@/lib/utils";
import type { Song } from "@/types/database";
import { cn } from "@/lib/utils";

const DEFAULT_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019];

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
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailSong, setDetailSong] = useState<Song | null>(null);

  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [missingPlatformFilter, setMissingPlatformFilter] = useState(false);
  const [missingGenreFilter, setMissingGenreFilter] = useState(false);
  const [missingAudioFilter, setMissingAudioFilter] = useState(false);
  const [missingCoverArtFilter, setMissingCoverArtFilter] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "az" | "za" | "duration_asc" | "duration_desc" | "newest" | "oldest">("default");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [copiedSongId, setCopiedSongId] = useState<string | null>(null);

  function handleCopySongLink(e: React.MouseEvent, songId: string) {
    e.stopPropagation();
    const url = `${window.location.origin}/discografia?song=${songId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedSongId(songId);
      setTimeout(() => setCopiedSongId(null), 2000);
    });
  }

  const [isPending, startTransition] = useTransition();

  // Keyboard navigation state
  const [keyboardSongId, setKeyboardSongId] = useState<string | null>(null);
  const keyboardSongIdRef = useRef<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Mutable refs so keyboard handler always sees latest values without re-registration
  const displayedSongsRef = useRef<Song[]>([]);
  const handlePlaySongRef = useRef<(s: Song) => void>(() => {});

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
      const result = searchQuery.trim()
        ? await searchSongs(searchQuery.trim())
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
  }, [selectedYear, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(loadSongs, searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadSongs, searchQuery]);

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

  async function handleDelete(song: Song) {
    if (!await confirm({ title: `¿Eliminar "${song.title}"?`, message: "Esta acción no se puede deshacer.", confirmLabel: "Eliminar" })) return;
    setDeletingId(song.id);
    const { error } = await deleteSong(song.id);
    if (error) toast.error(error);
    else {
      setSongs((prev) => prev.filter((s) => s.id !== song.id));
      toast.success(`"${song.title}" eliminada`);
    }
    setDeletingId(null);
  }

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

  const isSearching = searchQuery.trim().length > 0;

  // Derived: filter + sort client-side
  const displayedSongs = (() => {
    let result = [...songs];
    if (genreFilter) {
      result = result.filter(s => (s.genre ?? "Sin género") === genreFilter);
    }
    if (missingPlatformFilter) {
      result = result.filter(s => !s.spotify_url && !s.youtube_url && !s.apple_music_url && !s.soundcloud_url);
    }
    if (missingGenreFilter) {
      result = result.filter(s => !s.genre);
    }
    if (missingAudioFilter) {
      result = result.filter(s => !s.drive_file_url && !s.drive_file_id);
    }
    if (missingCoverArtFilter) {
      result = result.filter(s => !s.cover_art_url);
    }
    switch (sortBy) {
      case "az":           result.sort((a, b) => a.title.localeCompare(b.title)); break;
      case "za":           result.sort((a, b) => b.title.localeCompare(a.title)); break;
      case "duration_asc": result.sort((a, b) => (a.duration_seconds ?? 0) - (b.duration_seconds ?? 0)); break;
      case "duration_desc":result.sort((a, b) => (b.duration_seconds ?? 0) - (a.duration_seconds ?? 0)); break;
      case "newest":       result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      case "oldest":       result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
    }
    return result;
  })();

  // Keep mutable refs in sync with latest values (used in keyboard handler)
  displayedSongsRef.current = displayedSongs;
  handlePlaySongRef.current = handlePlaySong;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Disc3 className="h-6 w-6 text-primary" />
            Discografía
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Toda la música publicada organizada por año
          </p>
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
                    className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg hover:bg-secondary transition-colors text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ListMusic className="h-4 w-4" />
                    <span className="hidden sm:inline">Reproducir</span>
                  </button>
                  <button
                    onClick={handleShuffleAll}
                    title="Reproducir en modo aleatorio"
                    className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg hover:bg-secondary transition-colors text-sm text-muted-foreground hover:text-foreground"
                  >
                    <Shuffle className="h-4 w-4" />
                    <span className="hidden sm:inline">Aleatorio</span>
                  </button>
                </>
              )}
              {/* View toggle */}
              <div className="flex items-center border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode("list")}
                  title="Vista lista"
                  className={cn(
                    "px-2.5 py-2 transition-colors",
                    viewMode === "list" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  title="Vista cuadrícula"
                  className={cn(
                    "px-2.5 py-2 transition-colors border-l border-border",
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
                  className="appearance-none pl-7 pr-7 py-2 bg-card border border-border rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
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
                title="Exportar como CSV"
                className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-secondary transition-colors text-sm text-muted-foreground hover:text-foreground"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
              </button>
            </>
          )}
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 transition-colors text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Agregar canción
            <kbd className="hidden md:inline-flex ml-1 text-[9px] bg-primary/20 px-1 py-0.5 rounded font-mono">N</kbd>
          </button>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Buscar… (/) por título, artista o género"
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

      {/* Tabs de años + count — solo visible cuando no hay búsqueda */}
      {!isSearching && (
        <div className="flex items-center gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
            {years.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                  selectedYear === year
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {year}
              </button>
            ))}
          </div>
          {!loading && songs.length > 0 && (
            <span className="flex-shrink-0 text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full tabular-nums">
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
                    "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full transition-colors",
                    active
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                  )}
                  title={active ? "Quitar filtro" : `Filtrar por ${genre}`}
                >
                  <Filter className={cn("h-3 w-3 flex-shrink-0", active ? "text-primary" : "")} />
                  <span className="truncate max-w-[100px]">{genre}</span>
                  <span className={cn("font-semibold tabular-nums", active ? "text-primary" : "text-foreground")}>{count}</span>
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
              <span className="flex items-center gap-1.5 text-[11px] bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                <Play className="h-3 w-3 flex-shrink-0" />
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
                    "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full transition-colors",
                    missingAudioFilter
                      ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                      : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
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
                    "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full transition-colors",
                    missingPlatformFilter
                      ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                      : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
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
                    "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full transition-colors",
                    missingGenreFilter
                      ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                      : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
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
                    "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full transition-colors",
                    missingCoverArtFilter
                      ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                      : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                  )}
                  title={missingCoverArtFilter ? "Mostrar todas" : "Ver canciones sin cover art"}
                >
                  <ImageOff className="h-3 w-3 flex-shrink-0" />
                  {withoutCover} sin cover
                  {missingCoverArtFilter && <X className="h-2.5 w-2.5 ml-0.5 opacity-70" />}
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

      {/* Grid view */}
      {viewMode === "grid" && !loading && displayedSongs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
          {displayedSongs.map((song) => {
            const isPlaying = player.currentTrack?.id === song.id && player.isPlaying;
            const hasAudio = !!(song.drive_file_url || song.drive_file_id);
            const platforms = [
              { label: "Spotify", url: song.spotify_url, color: "#1db954" },
              { label: "YouTube", url: song.youtube_url, color: "#ef4444" },
              { label: "Apple", url: song.apple_music_url, color: "#fa243c" },
              { label: "SC", url: song.soundcloud_url, color: "#f97316" },
            ].filter(p => p.url);
            return (
              <div
                key={song.id}
                className={cn(
                  "group relative bg-card border rounded-xl overflow-hidden transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 cursor-pointer",
                  isPlaying ? "border-primary/50 bg-primary/5" : "border-border"
                )}
                onClick={() => handleSelectSong(song)}
              >
                {/* Cover art area */}
                <div
                  className={cn(
                    "relative flex items-center justify-center aspect-square text-4xl transition-colors overflow-hidden",
                    isPlaying ? "bg-primary/20" : "bg-secondary/50 group-hover:bg-secondary"
                  )}
                >
                  {song.cover_art_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={song.cover_art_url}
                      alt={song.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <Disc3 className={cn("h-10 w-10 transition-all duration-300", isPlaying ? "text-primary animate-spin" : "text-muted-foreground/40 group-hover:text-muted-foreground")} style={isPlaying ? { animationDuration: "3s" } : {}} />
                  )}
                  {/* Dark overlay for readability on cover art */}
                  {song.cover_art_url && (
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                  )}
                  {hasAudio && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePlaySong(song); }}
                      className={cn(
                        "absolute inset-0 flex items-center justify-center transition-opacity",
                        isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
                        {isPlaying
                          ? <Pause className="h-4 w-4 text-primary-foreground" />
                          : <Play className="h-4 w-4 text-primary-foreground ml-0.5" />
                        }
                      </div>
                    </button>
                  )}
                  {song.genre && (
                    <span className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded-full bg-black/40 text-white/80 font-medium truncate max-w-[80%]">
                      {song.genre}
                    </span>
                  )}
                  <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-black/40 text-white/70 tabular-nums">
                    {song.year}
                  </span>
                </div>
                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-semibold truncate leading-tight">{song.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {song.artist_name}
                    {song.featuring.length > 0 && (
                      <span className="text-muted-foreground/60">
                        {" "}ft. {song.featuring.slice(0, 2).join(", ")}{song.featuring.length > 2 ? "…" : ""}
                      </span>
                    )}
                  </p>
                  {song.duration_seconds && (
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(song.duration_seconds)}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    {platforms.length > 0 ? (
                      <div className="flex gap-1.5">
                        {platforms.map(p => (
                          <a
                            key={p.label}
                            href={p.url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title={p.label}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white transition-opacity opacity-70 hover:opacity-100"
                            style={{ background: p.color }}
                          >
                            {p.label[0]}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
                        <Radio className="h-2.5 w-2.5" />
                        Sin streaming
                      </span>
                    )}
                    <button
                      onClick={(e) => handleCopySongLink(e, song.id)}
                      title="Copiar enlace"
                      className={cn(
                        "p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100",
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
            );
          })}
        </div>
      )}

      {/* List view — Contenido */}
      {(viewMode === "list" || loading || displayedSongs.length === 0) && (
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Music className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">
              {isSearching
                ? `Sin resultados para "${searchQuery}"`
                : `No hay canciones en ${selectedYear}`}
            </p>
            {!isSearching && (
              <button
                onClick={handleAdd}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Agregar la primera
              </button>
            )}
          </div>
        ) : displayedSongs.length === 0 && (genreFilter || sortBy !== "default" || missingPlatformFilter || missingGenreFilter || missingAudioFilter) ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            {missingPlatformFilter && !genreFilter && !missingGenreFilter && !missingAudioFilter ? (
              <>
                <Radio className="h-12 w-12 text-green-400/40 mb-4" />
                <p className="text-muted-foreground text-sm font-medium">¡Todo en streaming!</p>
                <p className="text-muted-foreground text-xs mt-1">Todas las canciones tienen al menos una plataforma configurada</p>
              </>
            ) : missingGenreFilter && !genreFilter && !missingPlatformFilter && !missingAudioFilter ? (
              <>
                <Music className="h-12 w-12 text-green-400/40 mb-4" />
                <p className="text-muted-foreground text-sm font-medium">¡Géneros completos!</p>
                <p className="text-muted-foreground text-xs mt-1">Todas las canciones tienen género asignado</p>
              </>
            ) : missingAudioFilter && !genreFilter && !missingPlatformFilter && !missingGenreFilter ? (
              <>
                <Play className="h-12 w-12 text-green-400/40 mb-4" />
                <p className="text-muted-foreground text-sm font-medium">¡Todas tienen audio! 🎵</p>
                <p className="text-muted-foreground text-xs mt-1">Todas las canciones tienen archivo de audio vinculado</p>
              </>
            ) : (
              <>
                <Filter className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground text-sm">Sin canciones con ese filtro</p>
              </>
            )}
            <button onClick={() => { setGenreFilter(null); setSortBy("default"); setMissingPlatformFilter(false); setMissingGenreFilter(false); setMissingAudioFilter(false); }} className="mt-3 text-sm text-primary hover:underline">
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
                    <div className="flex items-center gap-3 px-4 py-2 bg-secondary/30 border-b border-border sticky top-0 z-10">
                      <span className="text-xs font-bold text-muted-foreground tracking-widest">{year}</span>
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10px] text-muted-foreground">{yearGroups[year].length}</span>
                    </div>
                    <div className="divide-y divide-border">
                      {yearGroups[year].map((song) => {
                        const idx = globalIdx++;
                        return (
                          <div key={song.id} id={`song-row-${song.id}`}>
                            <SongRow
                              song={song}
                              index={idx + 1}
                              isPlaying={player.currentTrack?.id === song.id && player.isPlaying}
                              isSelected={selectedSong?.id === song.id}
                              isKeyboardSelected={keyboardSongId === song.id}
                              isDeleting={deletingId === song.id}
                              onPlay={() => handlePlaySong(song)}
                              onSelect={() => handleSelectSong(song)}
                              onEdit={() => handleEdit(song)}
                              onDelete={() => handleDelete(song)}
                              onOpenDetail={() => setDetailSong(song)}
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
          <div className="divide-y divide-border">
            {displayedSongs.map((song, idx) => (
              <div key={song.id} id={`song-row-${song.id}`}>
                <SongRow
                  song={song}
                  index={idx + 1}
                  isPlaying={player.currentTrack?.id === song.id && player.isPlaying}
                  isSelected={selectedSong?.id === song.id}
                  isKeyboardSelected={keyboardSongId === song.id}
                  isDeleting={deletingId === song.id}
                  onPlay={() => handlePlaySong(song)}
                  onSelect={() => handleSelectSong(song)}
                  onEdit={() => handleEdit(song)}
                  onDelete={() => handleDelete(song)}
                  onOpenDetail={() => setDetailSong(song)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Panel de comentarios */}
      {selectedSong && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-secondary/50 border-b border-border">
            <span className="text-xs text-muted-foreground font-medium">
              {selectedSong.title}
            </span>
            <button
              onClick={() => setSelectedSong(null)}
              className="p-1 rounded hover:bg-secondary text-muted-foreground"
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

      {/* Panel de detalle */}
      {detailSong && (
        <SongDetailPanel
          song={detailSong}
          onClose={() => setDetailSong(null)}
          onEdit={() => {
            handleEdit(detailSong);
            setDetailSong(null);
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
    </div>
  );
}

interface SongRowProps {
  song: Song;
  index: number;
  isPlaying: boolean;
  isSelected: boolean;
  isKeyboardSelected: boolean;
  isDeleting: boolean;
  onPlay: () => void;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenDetail: () => void;
}

function SongRow({
  song,
  index,
  isPlaying,
  isSelected,
  isKeyboardSelected,
  isDeleting,
  onPlay,
  onSelect,
  onEdit,
  onDelete,
  onOpenDetail,
}: SongRowProps) {
  const hasAudio = !!(song.drive_file_url || song.drive_file_id);
  const [linkCopied, setLinkCopied] = useState(false);

  function handleCopyLink(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/discografia?song=${song.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }
  const platformLinks = [
    { label: "Spotify",    abbr: "S", color: "text-[#1db954] hover:bg-[#1db954]/10", url: song.spotify_url },
    { label: "YouTube",   abbr: "Y", color: "text-[#ff0000] hover:bg-[#ff0000]/10", url: song.youtube_url },
    { label: "Apple",     abbr: "A", color: "text-[#fa243c] hover:bg-[#fa243c]/10", url: song.apple_music_url },
    { label: "SoundCloud",abbr: "SC",color: "text-[#ff5500] hover:bg-[#ff5500]/10", url: song.soundcloud_url },
  ].filter((l) => l.url);

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors group",
        isPlaying && "bg-primary/5",
        isSelected && "bg-secondary/60",
        isKeyboardSelected && "ring-1 ring-inset ring-primary/50 bg-primary/5"
      )}
    >
      {/* Número / Play / Pause */}
      <div className="w-7 flex-shrink-0 text-center relative">
        {isPlaying ? (
          /* Playing: show waveform, replace with Pause on hover */
          <>
            <button
              onClick={onPlay}
              title="Pausar"
              className="hidden group-hover:flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
            >
              <Pause className="h-3 w-3" />
            </button>
            <span className="group-hover:hidden flex items-center justify-center w-7 h-7">
              <span className="flex gap-0.5 items-end h-3">
                <span className="w-0.5 bg-primary rounded-full animate-bounce h-2" style={{ animationDelay: "0ms" }} />
                <span className="w-0.5 bg-primary rounded-full animate-bounce h-3" style={{ animationDelay: "150ms" }} />
                <span className="w-0.5 bg-primary rounded-full animate-bounce h-1.5" style={{ animationDelay: "300ms" }} />
              </span>
            </span>
          </>
        ) : hasAudio ? (
          /* Not playing, has audio: show number, replace with Play on hover */
          <>
            <button
              onClick={onPlay}
              title="Reproducir"
              className="hidden group-hover:flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
            >
              <Play className="h-3 w-3 ml-0.5" />
            </button>
            <span className="text-xs text-muted-foreground group-hover:hidden">
              {index}
            </span>
          </>
        ) : (
          /* No audio: just the number */
          <span className="text-xs text-muted-foreground">{index}</span>
        )}
      </div>

      {/* Cover art placeholder */}
      <div className="w-9 h-9 flex-shrink-0 rounded bg-secondary flex items-center justify-center">
        {song.cover_art_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={song.cover_art_url}
            alt={song.title}
            className="w-9 h-9 rounded object-cover"
          />
        ) : (
          <Music className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>

      {/* Info — click opens detail panel */}
      <button
        onClick={onOpenDetail}
        className="flex-1 min-w-0 text-left"
      >
        <p className={cn("text-sm font-medium truncate", isPlaying && "text-primary")}>
          {song.title}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {song.artist_name}
          {song.featuring.length > 0 &&
            ` ft. ${song.featuring.join(", ")}`}
          {song.genre && ` · ${song.genre}`}
        </p>
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
        <div className="hidden md:flex items-center gap-0.5 flex-shrink-0">
          {platformLinks.slice(0, 4).map(({ label, abbr, color, url }) => (
            <a
              key={label}
              href={url!}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded text-[10px] font-bold transition-colors",
                color
              )}
              title={label}
              onClick={(e) => e.stopPropagation()}
            >
              {abbr}
            </a>
          ))}
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={handleCopyLink}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            linkCopied ? "text-green-400" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
          title="Copiar enlace"
        >
          {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onSelect}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            isSelected
              ? "bg-primary/15 text-primary"
              : "hover:bg-secondary text-muted-foreground hover:text-foreground"
          )}
          title="Comentarios"
        >
          <MessageSquare className="h-3.5 w-3.5" />
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
    </div>
  );
}
