"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Music, ExternalLink, Clock, Tag, Users,
  Play, Pause, Globe, Lock, Loader2, FileText,
  ArrowDownToLine, Copy, Check, Share2, Zap,
} from "lucide-react";
import { getSongById, updateSongVisibility } from "@/lib/actions/songs";
import { useAudioPlayerContext } from "@/components/audio/AudioPlayer";
import LyricsPanel from "@/components/lyrics/LyricsPanel";
import WaveformPlayer from "@/components/audio/WaveformPlayer";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/ToastProvider";
import type { Song } from "@/types/database";

const PLATFORMS = [
  { key: "spotify_url" as keyof Song,     label: "Spotify",      color: "#1db954", textColor: "#fff" },
  { key: "youtube_url" as keyof Song,     label: "YouTube",      color: "#ef4444", textColor: "#fff" },
  { key: "apple_music_url" as keyof Song, label: "Apple Music",  color: "#fa243c", textColor: "#fff" },
  { key: "soundcloud_url" as keyof Song,  label: "SoundCloud",   color: "#f97316", textColor: "#fff" },
];

/** Calcula puntuación de completitud de metadata (0-100) */
function completenessScore(song: Song): { score: number; total: number; missing: string[] } {
  const hasAudio = !!(song.drive_file_id || song.drive_file_url);
  const checks: { label: string; ok: boolean }[] = [
    { label: "Audio",        ok: hasAudio },
    { label: "Portada",      ok: !!song.cover_art_url },
    { label: "Letra",        ok: !!song.lyrics },
    { label: "Género",       ok: !!song.genre },
    { label: "Duración",     ok: !!song.duration_seconds },
    { label: "BPM/Key",      ok: !!(song.bpm && song.key_signature) || !hasAudio },
    { label: "Spotify",      ok: !!song.spotify_url },
    { label: "YouTube",      ok: !!song.youtube_url },
    { label: "Tags",         ok: !!(song.tags?.length) },
    { label: "Featuring",    ok: !!(song.featuring?.length) },
    { label: "Apple Music",  ok: !!song.apple_music_url },
  ];
  const done = checks.filter(c => c.ok).length;
  const missing = checks.filter(c => !c.ok).map(c => c.label);
  return { score: Math.round((done / checks.length) * 100), total: checks.length, missing };
}

export default function SongDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const player = useAudioPlayerContext();
  const toast = useToast();

  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLyrics, setShowLyrics] = useState(false);
  const [copied, setCopied] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);

  const isPlaying = player.currentTrack?.id === song?.id && player.isPlaying;

  useEffect(() => {
    if (!params.id) return;
    getSongById(params.id).then(({ data }) => {
      if (data) setSong(data);
      setLoading(false);
    });
  }, [params.id]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!song) return;
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        const audioUrl = song.drive_file_id ? `/api/drive/stream/${song.drive_file_id}` : song.drive_file_url;
        if (!audioUrl) return;
        if (isPlaying) { player.pause(); }
        else { player.play({ id: song.id, title: song.title, artist: song.artist_name, url: audioUrl, duration: song.duration_seconds ?? undefined }); }
      }
      if (e.key === "l" || e.key === "L") { e.preventDefault(); setShowLyrics(v => !v); }
      if (e.key === "Escape" && !showLyrics) { router.back(); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [song, isPlaying, showLyrics, player, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!song) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
        <Music className="h-16 w-16 text-muted-foreground/30" />
        <p className="text-muted-foreground">Canción no encontrada</p>
        <button onClick={() => router.back()} className="text-primary hover:underline text-sm transition-all active:scale-95">
          Volver
        </button>
      </div>
    );
  }

  const { score, missing } = completenessScore(song);
  const audioUrl = song.drive_file_id
    ? `/api/drive/stream/${song.drive_file_id}`
    : song.drive_file_url;
  const downloadUrl = song.drive_file_id
    ? `/api/drive/stream/${song.drive_file_id}?dl=1&name=${encodeURIComponent(song.title)}`
    : song.drive_file_url;
  const activePlatforms = PLATFORMS.filter(p => !!song[p.key]);

  function handlePlay() {
    if (!audioUrl) return;
    if (isPlaying) { player.pause(); return; }
    player.play({ id: song!.id, title: song!.title, artist: song!.artist_name, url: audioUrl, duration: song!.duration_seconds ?? undefined });
  }

  function handleShare() {
    const url = `${window.location.origin}/discografia/${song!.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleTogglePublic() {
    if (!song) return;
    setTogglingPublic(true);
    const newValue = !song.is_public;
    const { error } = await updateSongVisibility(song.id, newValue);
    if (error) {
      toast.error(error);
    } else {
      setSong(prev => prev ? { ...prev, is_public: newValue } : prev);
      toast.success(newValue ? "Canción ahora es pública" : "Canción ahora es privada");
    }
    setTogglingPublic(false);
  }

  const scoreColor = score >= 80 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400";
  const scoreBg = score >= 80 ? "bg-green-400" : score >= 50 ? "bg-yellow-400" : "bg-red-400";

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back nav */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            title="Volver (Esc)"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a discografía
          </button>
          <p className="text-xs text-muted-foreground/60 hidden sm:flex items-center gap-2">
            <kbd className="text-[9px] bg-secondary border border-border/60 px-1 py-0.5 rounded font-mono">P</kbd>
            reproducir ·
            <kbd className="text-[9px] bg-secondary border border-border/60 px-1 py-0.5 rounded font-mono">L</kbd>
            letra ·
            <kbd className="text-[9px] bg-secondary border border-border/60 px-1 py-0.5 rounded font-mono">Esc</kbd>
            volver
          </p>
        </div>

        {/* Hero */}
        <div className="card-premium rounded-2xl overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-0">
            {/* Cover art */}
            <div className="relative sm:w-64 sm:h-64 w-full aspect-square flex-shrink-0 bg-gradient-to-br from-secondary to-secondary/60 flex items-center justify-center group overflow-hidden">
              {song.cover_art_url ? (
                <>
                  {/* Cover image */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={song.cover_art_url} alt={song.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {/* Ambient glow from cover behind info panel */}
                  <div className="absolute inset-0 opacity-30 pointer-events-none"
                    style={{ boxShadow: "inset -40px 0 80px hsl(var(--primary)/0.3)" }} />
                </>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Music className="h-10 w-10 text-primary/30" />
                  </div>
                </div>
              )}
              {/* Play overlay */}
              {audioUrl && (
                <button
                  onClick={handlePlay}
                  className={cn(
                    "absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px] transition-all duration-200",
                    isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                >
                  <div className={cn(
                    "w-18 h-18 rounded-full flex items-center justify-center transition-all duration-200",
                    "bg-primary shadow-[0_0_30px_hsl(var(--primary)/0.6),0_0_60px_hsl(var(--primary)/0.3)]",
                    "hover:scale-110 active:scale-95"
                  )} style={{ width: 64, height: 64 }}>
                    {isPlaying
                      ? <Pause className="h-7 w-7 text-white" />
                      : <Play className="h-7 w-7 text-white ml-1" />}
                  </div>
                </button>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 p-6 space-y-4">
              {/* Title + year */}
              <div>
                <div className="flex items-start gap-2">
                  <h1 className="text-3xl font-black leading-tight flex-1 tracking-tight">{song.title}</h1>
                  {/* Public/private badge */}
                  <button
                    onClick={handleTogglePublic}
                    disabled={togglingPublic}
                    title={song.is_public ? "Canción pública — clic para hacer privada" : "Canción privada — clic para publicar"}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all active:scale-95 flex-shrink-0 mt-1",
                      song.is_public
                        ? "bg-green-500/15 text-green-400 hover:bg-red-500/15 hover:text-red-400"
                        : "bg-secondary text-muted-foreground hover:bg-green-500/15 hover:text-green-400"
                    )}
                  >
                    {togglingPublic ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : song.is_public ? (
                      <Globe className="h-3 w-3" />
                    ) : (
                      <Lock className="h-3 w-3" />
                    )}
                    {song.is_public ? "Pública" : "Privada"}
                  </button>
                </div>
                <p className="text-muted-foreground mt-1">
                  {song.artist_name}
                  {song.featuring?.length > 0 && (
                    <span className="text-muted-foreground/60"> ft. {song.featuring.join(", ")}</span>
                  )}
                </p>
              </div>

              {/* Meta chips */}
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center gap-1 text-xs bg-secondary/80 border border-border/40 px-2.5 py-1 rounded-full font-medium">
                  <Tag className="h-3 w-3 text-muted-foreground" />{song.year}
                </span>
                {song.genre && (
                  <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full font-black">{song.genre}</span>
                )}
                {song.duration_seconds && (
                  <span className="flex items-center gap-1 text-xs bg-secondary/80 border border-border/40 px-2.5 py-1 rounded-full font-medium">
                    <Clock className="h-3 w-3 text-muted-foreground" />{formatTime(song.duration_seconds)}
                  </span>
                )}
                {song.bpm && (
                  <span className="flex items-center gap-1 text-xs bg-blue-500/12 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full font-mono font-bold" title="BPM">
                    <Zap className="h-3 w-3" />{song.bpm} BPM
                  </span>
                )}
                {song.key_signature && (
                  <span className="text-xs bg-purple-500/12 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-full font-bold" title="Tonalidad">
                    ♪ {song.key_signature}
                  </span>
                )}
                {song.tags?.map(tag => (
                  <span key={tag} className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full font-medium">#{tag}</span>
                ))}
              </div>

              {/* Platform links */}
              {activePlatforms.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activePlatforms.map(p => (
                    <a
                      key={p.key}
                      href={song[p.key] as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80 active:scale-95"
                      style={{ background: p.color, color: p.textColor }}
                    >
                      <ExternalLink className="h-3 w-3" />
                      {p.label}
                    </a>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download={song.drive_file_id ? song.title : undefined}
                    className="flex items-center gap-2 px-3 py-2 bg-primary/90 hover:bg-primary text-primary-foreground rounded-xl text-sm font-black transition-all active:scale-95 shadow-sm shadow-primary/20"
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                    Descargar
                  </a>
                )}
                {song.lyrics && (
                  <button
                    onClick={() => setShowLyrics(true)}
                    className="flex items-center gap-2 px-3 py-2 border border-border/60 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all active:scale-95"
                  >
                    <FileText className="h-4 w-4" />
                    Ver letra
                  </button>
                )}
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-3 py-2 border border-border/60 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all active:scale-95"
                >
                  {copied ? <Check className="h-4 w-4 text-green-400" /> : <Share2 className="h-4 w-4" />}
                  {copied ? "Copiado" : "Compartir"}
                </button>
                {song.is_public && (
                  <a
                    href={`/p/${song.created_by}`}
                    className="flex items-center gap-2 px-3 py-2 border border-border/60 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all active:scale-95"
                  >
                    <Globe className="h-4 w-4" />
                    Ver EPK
                  </a>
                )}
                {/* Analizar BPM CTA — solo si tiene audio pero le falta BPM/key */}
                {audioUrl && !song.bpm && !song.key_signature && (
                  <a
                    href="/analizar"
                    className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/15 transition-all active:scale-95 text-sm font-medium"
                  >
                    <Zap className="h-4 w-4" />
                    Detectar BPM
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Waveform player */}
          {audioUrl && (
            <div className="p-4 border-t border-border/60">
              <WaveformPlayer url={audioUrl} height={56} />
            </div>
          )}
        </div>

        {/* Metadata completeness card */}
        <div className="card-premium rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black">Completitud de metadata</h2>
            <span className={cn("text-2xl font-black tabular-nums", scoreColor)}>{score}%</span>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn("h-full transition-all duration-500", score >= 100 ? "rounded-full bg-green-500 shadow-[0_0_10px_hsl(142_70%_45%/0.6)]" : "progress-fill-gradient")}
              style={{ width: `${score}%` }}
            />
          </div>
          {missing.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Faltan: {missing.join(", ")}
            </p>
          ) : (
            <p className="text-xs text-green-400 font-medium">¡Metadata completa! 🎉</p>
          )}
        </div>

        {/* Lyrics preview */}
        {song.lyrics && (
          <div
            className="card-premium rounded-2xl p-5 space-y-3 cursor-pointer hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-sm transition-all group"
            onClick={() => setShowLyrics(true)}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                Letra
              </h2>
              <span className="text-xs text-primary hover:underline">Ver completa →</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-line leading-relaxed">
              {song.lyrics.slice(0, 300)}{song.lyrics.length > 300 ? "…" : ""}
            </p>
          </div>
        )}

        {/* Featuring */}
        {song.featuring?.length > 0 && (
          <div className="card-premium rounded-2xl p-5">
            <h2 className="text-sm font-black flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-primary drop-shadow-[0_0_4px_hsl(var(--primary)/0.6)]" />
              Colaboraciones
            </h2>
            <div className="flex flex-wrap gap-2">
              {song.featuring.map(feat => (
                <span key={feat} className="text-sm bg-secondary px-3 py-1.5 rounded-xl font-medium">{feat}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lyrics panel */}
      {showLyrics && (
        <LyricsPanel
          type="song"
          id={song.id}
          title={song.title}
          artist={song.artist_name}
          initialLyrics={song.lyrics}
          onClose={() => setShowLyrics(false)}
          onSaved={(newLyrics) => setSong(prev => prev ? { ...prev, lyrics: newLyrics } : prev)}
        />
      )}
    </>
  );
}
