"use client";

/**
 * Timeline de lanzamientos — Vista visual de toda la discografía ordenada por año
 * Accesible en /discografia/timeline
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Music, Disc3, Clock, ExternalLink, Globe, Lock, Play, Loader2, Zap } from "lucide-react";
import { getSongsByYear } from "@/lib/actions/songs";
import { useAudioPlayerContext } from "@/components/audio/AudioPlayer";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Song } from "@/types/database";

const GENRE_COLORS: Record<string, string> = {
  trap:          "bg-purple-500/20 border-purple-500/30 text-purple-300",
  reggaeton:     "bg-orange-500/20 border-orange-500/30 text-orange-300",
  pop:           "bg-pink-500/20 border-pink-500/30 text-pink-300",
  "hip-hop":     "bg-yellow-500/20 border-yellow-500/30 text-yellow-300",
  rock:          "bg-red-500/20 border-red-500/30 text-red-300",
  "r&b":         "bg-blue-500/20 border-blue-500/30 text-blue-300",
  electronica:   "bg-cyan-500/20 border-cyan-500/30 text-cyan-300",
  cumbia:        "bg-green-500/20 border-green-500/30 text-green-300",
  salsa:         "bg-amber-500/20 border-amber-500/30 text-amber-300",
};

function getGenreColor(genre: string | null): string {
  if (!genre) return "bg-secondary border-border text-muted-foreground";
  const key = genre.toLowerCase();
  return GENRE_COLORS[key] ?? "bg-primary/10 border-primary/20 text-primary/80";
}

interface YearGroup {
  year: number;
  songs: Song[];
  totalDuration: number;
}

export default function TimelinePage() {
  const router = useRouter();
  const player = useAudioPlayerContext();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState<string | null>(null);

  useEffect(() => {
    getSongsByYear().then(({ data }) => {
      setSongs(data ?? []);
      setLoading(false);
    });
  }, []);

  // Keyboard shortcuts: Escape = back, ↑↓ = navigate, Enter/P = play selected
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") { router.back(); return; }
      if (songs.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const flatSongs = songs.slice().sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
        const idx = flatSongs.findIndex((s) => s.id === selectedSong);
        const next = flatSongs[idx < flatSongs.length - 1 ? idx + 1 : 0];
        setSelectedSong(next.id);
        document.getElementById(`timeline-song-${next.id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const flatSongs = songs.slice().sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
        const idx = flatSongs.findIndex((s) => s.id === selectedSong);
        const prev = flatSongs[idx <= 0 ? flatSongs.length - 1 : idx - 1];
        setSelectedSong(prev.id);
        document.getElementById(`timeline-song-${prev.id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        return;
      }
      if ((e.key === "p" || e.key === "P" || e.key === "Enter") && selectedSong) {
        e.preventDefault();
        const song = songs.find((s) => s.id === selectedSong);
        if (song) handlePlay(song);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, selectedSong, songs]);

  // Group by year, sorted descending
  const yearGroups: YearGroup[] = (() => {
    const groups: Record<number, Song[]> = {};
    for (const s of songs) {
      if (!groups[s.year]) groups[s.year] = [];
      groups[s.year].push(s);
    }
    return Object.entries(groups)
      .map(([year, songs]) => ({
        year: Number(year),
        songs: songs.sort((a, b) => a.title.localeCompare(b.title)),
        totalDuration: songs.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0),
      }))
      .sort((a, b) => b.year - a.year);
  })();

  const totalSongs = songs.length;
  const totalDuration = songs.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0);
  const yearsActive = yearGroups.length;
  const totalHours = Math.floor(totalDuration / 3600);
  const totalMins = Math.floor((totalDuration % 3600) / 60);

  function handlePlay(song: Song) {
    const audioUrl = song.drive_file_id
      ? `/api/drive/stream/${song.drive_file_id}`
      : song.drive_file_url;
    if (!audioUrl) return;
    const isCurrentlyPlaying = player.currentTrack?.id === song.id && player.isPlaying;
    if (isCurrentlyPlaying) { player.pause(); return; }
    player.play({ id: song.id, title: song.title, artist: song.artist_name, url: audioUrl, duration: song.duration_seconds ?? undefined });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Back */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all active:scale-95"
          title="Volver (Esc)"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a discografía
        </button>
        <p className="text-xs text-muted-foreground/60 hidden sm:flex items-center gap-2">
          <kbd className="text-[9px] bg-secondary border border-border/60 px-1 py-0.5 rounded font-mono">↑↓</kbd>
          navegar ·
          <kbd className="text-[9px] bg-secondary border border-border/60 px-1 py-0.5 rounded font-mono">Enter</kbd>
          reproducir ·
          <kbd className="text-[9px] bg-secondary border border-border/60 px-1 py-0.5 rounded font-mono">Esc</kbd>
          volver
        </p>
      </div>

      {/* Header */}
      <div className="card-premium relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/6 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Disc3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-tight gradient-text">Timeline de lanzamientos</h1>
              <p className="text-muted-foreground text-xs mt-0.5">Toda la discografía ordenada cronológicamente</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Canciones", value: totalSongs, icon: <Music className="h-4 w-4" /> },
          { label: "Años activo", value: yearsActive, icon: <Disc3 className="h-4 w-4" /> },
          { label: "Duración total", value: totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`, icon: <Clock className="h-4 w-4" /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="card-premium rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">{icon}<span className="text-xs">{label}</span></div>
            <p className="text-xl font-black tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Visual timeline */}
      {yearGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Music className="h-16 w-16 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground">No hay canciones todavía</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line — gradient fade */}
          <div className="absolute left-[76px] top-0 bottom-0 w-px"
            style={{ background: "linear-gradient(to bottom, transparent 0%, hsl(var(--border)/0.6) 5%, hsl(var(--border)/0.6) 95%, transparent 100%)" }} />

          <div className="space-y-10">
            {yearGroups.map((group, groupIdx) => (
              <div key={group.year} className="relative">
                {/* Year marker */}
                <div className="flex items-center gap-4 mb-4">
                  <div className={cn(
                    "w-[76px] flex-shrink-0 flex items-center justify-end pr-4",
                    groupIdx === 0 ? "text-primary" : "text-muted-foreground"
                  )}>
                    <span className="text-sm font-black tabular-nums">{group.year}</span>
                  </div>
                  {/* Year dot on the line */}
                  <div className={cn(
                    "absolute left-[72px] w-3 h-3 rounded-full border-2 border-background",
                    groupIdx === 0 ? "bg-primary" : "bg-muted-foreground/60"
                  )}
                  style={groupIdx === 0 ? { boxShadow: "0 0 0 3px hsl(var(--primary)/0.2), 0 0 12px hsl(var(--primary)/0.4)" } : undefined} />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {group.songs.length} canción{group.songs.length !== 1 ? "es" : ""}
                      {group.totalDuration > 0 && ` · ${formatTime(group.totalDuration)}`}
                    </span>
                  </div>
                </div>

                {/* Songs list */}
                <div className="ml-[92px] space-y-2">
                  {group.songs.map((song) => {
                    const isPlaying = player.currentTrack?.id === song.id && player.isPlaying;
                    const isSelected = selectedSong === song.id;
                    const hasAudio = !!(song.drive_file_id || song.drive_file_url);

                    return (
                      <div
                        key={song.id}
                        id={`timeline-song-${song.id}`}
                        onClick={() => setSelectedSong(isSelected ? null : song.id)}
                        className={cn(
                          "group flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer active:scale-[0.98]",
                          isPlaying
                            ? "border-primary/40 bg-primary/5"
                            : isSelected
                              ? "border-border bg-secondary/50 ring-1 ring-primary/20"
                              : "border-transparent hover:border-border hover:bg-secondary/30 hover:-translate-y-0.5 hover:shadow-sm"
                        )}
                      >
                        {/* Cover art */}
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-secondary flex-shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
                          {song.cover_art_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={song.cover_art_url} alt={song.title} className="w-full h-full object-cover" />
                          ) : (
                            <Music className="h-5 w-5 text-muted-foreground/30" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn("text-sm font-black truncate", isPlaying && "text-primary")}>
                              {song.title}
                            </p>
                            {song.is_public ? (
                              <Globe className="h-3 w-3 text-green-400/60 flex-shrink-0" />
                            ) : (
                              <Lock className="h-3 w-3 text-muted-foreground/30 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {song.genre && (
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded border font-medium",
                                getGenreColor(song.genre)
                              )}>
                                {song.genre}
                              </span>
                            )}
                            {song.duration_seconds && (
                              <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />{formatTime(song.duration_seconds)}
                              </span>
                            )}
                            {song.bpm && (
                              <span className="flex items-center gap-0.5 text-[10px] text-blue-400/70 font-mono tabular-nums" title="BPM">
                                <Zap className="h-2.5 w-2.5" />{song.bpm}
                              </span>
                            )}
                            {song.key_signature && (
                              <span className="text-[10px] text-purple-400/70 font-medium" title="Tonalidad">
                                ♪ {song.key_signature}
                              </span>
                            )}
                            {song.featuring?.length > 0 && (
                              <span className="text-[11px] text-muted-foreground truncate">
                                ft. {song.featuring.join(", ")}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {/* Platform dots */}
                          <div className="hidden sm:flex gap-1">
                            {song.spotify_url && <div className="w-1.5 h-1.5 rounded-full bg-[#1db954]" title="Spotify" />}
                            {song.youtube_url && <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" title="YouTube" />}
                            {song.apple_music_url && <div className="w-1.5 h-1.5 rounded-full bg-[#fa243c]" title="Apple Music" />}
                            {song.soundcloud_url && <div className="w-1.5 h-1.5 rounded-full bg-[#f97316]" title="SoundCloud" />}
                          </div>
                          {hasAudio && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePlay(song); }}
                              className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-95",
                                isPlaying
                                  ? "bg-primary text-primary-foreground"
                                  : "opacity-0 group-hover:opacity-100 bg-secondary hover:bg-primary hover:text-primary-foreground"
                              )}
                            >
                              <Play className="h-3 w-3" />
                            </button>
                          )}
                          {(song.spotify_url || song.youtube_url) && (
                            <a
                              href={song.spotify_url ?? song.youtube_url ?? "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
