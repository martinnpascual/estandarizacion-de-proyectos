"use client";

import {
  X, Play, Pause, Music, ExternalLink, Clock, Tag, Users,
  Disc3, Calendar, FileAudio, Link as LinkIcon, Copy, Check,
  Share2, Keyboard, AlertCircle, FileText, ArrowDownToLine,
  Globe, Lock, Loader2, Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAudioPlayerContext } from "@/components/audio/AudioPlayer";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Song } from "@/types/database";
import { updateSongVisibility } from "@/lib/actions/songs";

const WaveformPlayer = dynamic(() => import("@/components/audio/WaveformPlayer"), { ssr: false });

interface Props {
  song: Song;
  onClose: () => void;
  onEdit: () => void;
  onOpenLyrics?: () => void;
  /** "overlay" = panel deslizante con backdrop (default)
   *  "sidebar" = columna fija inline, sin backdrop, sin bloquear la página */
  mode?: "overlay" | "sidebar";
}

const PLATFORM_CONFIG: {
  key: keyof Song;
  label: string;
  color: string;
  bg: string;
}[] = [
  { key: "spotify_url",      label: "Spotify",      color: "text-[#1db954]", bg: "bg-[#1db954]/10" },
  { key: "youtube_url",      label: "YouTube",      color: "text-[#ff0000]", bg: "bg-[#ff0000]/10" },
  { key: "apple_music_url",  label: "Apple Music",  color: "text-[#fa243c]", bg: "bg-[#fa243c]/10" },
  { key: "soundcloud_url",   label: "SoundCloud",   color: "text-[#ff5500]", bg: "bg-[#ff5500]/10" },
];

/** Completeness score calculation (0-100) */
function calcCompleteness(song: Song) {
  const hasAudio = !!(song.drive_file_id || song.drive_file_url);
  const checks = [
    { label: "Audio",       ok: hasAudio },
    { label: "Portada",     ok: !!song.cover_art_url },
    { label: "Letra",       ok: !!song.lyrics },
    { label: "Género",      ok: !!song.genre },
    { label: "Duración",    ok: !!song.duration_seconds },
    { label: "BPM/Key",     ok: !!(song.bpm && song.key_signature) || !hasAudio },
    { label: "Spotify",     ok: !!song.spotify_url },
    { label: "YouTube",     ok: !!song.youtube_url },
    { label: "Tags",        ok: !!(song.tags?.length) },
  ];
  const done = checks.filter(c => c.ok).length;
  return { score: Math.round((done / checks.length) * 100), missing: checks.filter(c => !c.ok).map(c => c.label) };
}

export default function SongDetailPanel({ song, onClose, onEdit, onOpenLyrics, mode = "overlay" }: Props) {
  const player = useAudioPlayerContext();
  const isPlaying = player.currentTrack?.id === song.id && player.isPlaying;
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isPublic, setIsPublic] = useState(song.is_public ?? false);
  const [togglingPublic, setTogglingPublic] = useState(false);

  // Close on Escape, P=play, E=edit
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "p" || e.key === "P") { handlePlay(); }
      if (e.key === "e" || e.key === "E") { onEdit(); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, onEdit, isPlaying]);

  const platformLinks = PLATFORM_CONFIG.filter((p) => !!song[p.key]);
  const { score: completenessScore, missing: completenessMissing } = calcCompleteness(song);

  async function handleTogglePublic() {
    setTogglingPublic(true);
    const newVal = !isPublic;
    const { error } = await updateSongVisibility(song.id, newVal);
    if (!error) setIsPublic(newVal);
    setTogglingPublic(false);
  }

  function handleCopy() {
    const parts: string[] = [`🎵 ${song.title}`];
    parts.push(`Artista: ${song.artist_name}`);
    if (song.featuring?.length) parts.push(`Feat: ${song.featuring.join(", ")}`);
    parts.push(`Año: ${song.year}`);
    if (song.genre) parts.push(`Género: ${song.genre}`);
    if (song.duration_seconds) {
      const m = Math.floor(song.duration_seconds / 60), s = song.duration_seconds % 60;
      parts.push(`Duración: ${m}:${String(s).padStart(2, "0")}`);
    }
    if (song.bpm) parts.push(`BPM: ${song.bpm}`);
    if (song.key_signature) parts.push(`Tonalidad: ${song.key_signature}`);
    if (song.spotify_url) parts.push(`Spotify: ${song.spotify_url}`);
    if (song.youtube_url) parts.push(`YouTube: ${song.youtube_url}`);
    // Deep-link so team members can open this song directly
    const deepLink = `${window.location.origin}/discografia?song=${song.id}`;
    parts.push(`Ver en Estudio: ${deepLink}`);
    navigator.clipboard.writeText(parts.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleShareLink() {
    const deepLink = `${window.location.origin}/discografia?song=${song.id}`;
    navigator.clipboard.writeText(deepLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  const addedDate = new Date(song.created_at).toLocaleDateString("es-ES", {
    day: "numeric", month: "short", year: "numeric",
  });

  function handlePlay() {
    const audioUrl = song.drive_file_id
      ? `/api/drive/stream/${song.drive_file_id}`
      : song.drive_file_url;
    if (!audioUrl) return;
    if (isPlaying) {
      player.pause();
    } else {
      player.play({
        id: song.id,
        title: song.title,
        artist: song.artist_name,
        url: audioUrl,
        duration: song.duration_seconds ?? undefined,
      });
    }
  }

  // ── Contenido interior (compartido entre ambos modos) ────────────────
  const panelContent = (
    <div className="flex flex-col h-full overflow-hidden bg-card/95 backdrop-blur-sm">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60 flex-shrink-0 bg-card/90 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Disc3 className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Detalle</span>
            {/* Public/private pill */}
            <button
              onClick={handleTogglePublic}
              disabled={togglingPublic}
              title={isPublic ? "Canción pública — clic para hacer privada" : "Canción privada — clic para publicar en EPK"}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all active:scale-95",
                isPublic
                  ? "bg-green-500/15 text-green-400 hover:bg-red-500/15 hover:text-red-400"
                  : "bg-secondary text-muted-foreground hover:bg-green-500/15 hover:text-green-400"
              )}
            >
              {togglingPublic ? <Loader2 className="h-3 w-3 animate-spin" /> : isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {isPublic ? "Pública" : "Privada"}
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Open full page */}
            <Link
              href={`/discografia/${song.id}`}
              title="Abrir página completa"
              className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground transition-all active:scale-95"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
            {/* Share link */}
            <button
              onClick={handleShareLink}
              title="Copiar enlace directo"
              className={cn(
                "p-1.5 rounded-xl transition-all active:scale-95",
                linkCopied
                  ? "bg-blue-500/15 text-blue-400"
                  : "hover:bg-secondary text-muted-foreground"
              )}
            >
              {linkCopied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            </button>
            {/* Copy full info */}
            <button
              onClick={handleCopy}
              title="Copiar info de la canción"
              className={cn(
                "p-1.5 rounded-xl transition-all active:scale-95",
                copied
                  ? "bg-green-500/15 text-green-400"
                  : "hover:bg-secondary text-muted-foreground"
              )}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
            {/* Shortcuts toggle */}
            <button
              onClick={() => setShowShortcuts(s => !s)}
              title="Atajos de teclado"
              className={cn(
                "p-1.5 rounded-xl transition-all active:scale-95",
                showShortcuts
                  ? "bg-secondary text-foreground"
                  : "hover:bg-secondary text-muted-foreground"
              )}
            >
              <Keyboard className="h-4 w-4" />
            </button>
            <button
              onClick={onEdit}
              className="text-xs px-3 py-1.5 rounded-xl border border-border/60 hover:bg-secondary/60 transition-all active:scale-95"
            >
              Editar
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground transition-all active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Keyboard shortcuts */}
        {showShortcuts && (
          <div className="border-b border-border/60 bg-secondary/30 px-5 py-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {[
              ["P", song.drive_file_url ? "Reproducir / Pausar" : "Reproducir (sin archivo)"],
              ["E", "Editar canción"],
              ["Esc", "Cerrar panel"],
            ].map(([key, desc]) => (
              <span key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-border/60 text-[10px] font-mono leading-none">
                  {key}
                </kbd>
                {desc}
              </span>
            ))}
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* ── Cover art hero — con fondo ambientado ─────────────────── */}
          <div className="relative w-full aspect-square bg-secondary flex items-center justify-center overflow-hidden">
            {/* Fondo desenfocado ambientado — crea efecto de color bleeding */}
            {song.cover_art_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={song.cover_art_url}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-50 saturate-150"
              />
            )}
            {/* Gradient overlay para legibilidad */}
            <div className="absolute inset-0 bg-gradient-to-t from-card/60 via-transparent to-transparent" />

            {song.cover_art_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={song.cover_art_url}
                alt={song.title}
                className="relative z-10 w-[85%] h-[85%] object-cover rounded-2xl shadow-[0_20px_60px_hsl(0_0%_0%/0.5)]"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground/20">
                <Music className="h-20 w-20" />
              </div>
            )}

            {/* Play overlay — botón flotante con glow */}
            {(song.drive_file_id || song.drive_file_url) && (
              <button
                onClick={handlePlay}
                title={isPlaying ? "Pausar" : "Reproducir"}
                className={cn(
                  "absolute bottom-4 right-4 z-20 w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95",
                  isPlaying
                    ? "bg-primary text-primary-foreground scale-105 shadow-[0_0_24px_hsl(var(--primary)/0.6)]"
                    : "bg-card/90 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground text-foreground shadow-xl"
                )}
              >
                {isPlaying
                  ? <Pause className="h-5 w-5" />
                  : <Play className="h-5 w-5 ml-0.5" />}
              </button>
            )}
          </div>

          {/* Waveform player */}
          {(song.drive_file_id || song.drive_file_url) && (
            <div className="px-4 pt-3 pb-1 border-b border-border/60 bg-secondary/20">
              <WaveformPlayer
                url={song.drive_file_id ? `/api/drive/stream/${song.drive_file_id}` : song.drive_file_url!}
                height={48}
              />
            </div>
          )}

          {/* Info */}
          <div className="p-5 space-y-5">
            {/* Title + artist — tipografía mejorada */}
            <div>
              <h2 className="text-xl font-bold leading-tight tracking-tight">{song.title}</h2>
              <p className="text-muted-foreground text-sm mt-1 font-medium">{song.artist_name}</p>
            </div>

            {/* Meta chips */}
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 text-xs bg-secondary px-2.5 py-1 rounded-full">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                {song.year}
              </span>
              {song.genre && (
                <span className="flex items-center gap-1.5 text-xs bg-secondary px-2.5 py-1 rounded-full">
                  <Music className="h-3 w-3 text-muted-foreground" />
                  {song.genre}
                </span>
              )}
              {song.duration_seconds && (
                <span className="flex items-center gap-1.5 text-xs bg-secondary px-2.5 py-1 rounded-full">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  {formatTime(song.duration_seconds)}
                </span>
              )}
              {song.bpm && (
                <span className="flex items-center gap-1.5 text-xs bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full font-mono tabular-nums" title="BPM">
                  <Zap className="h-3 w-3" />
                  {song.bpm} BPM
                </span>
              )}
              {song.key_signature && (
                <span className="flex items-center gap-1.5 text-xs bg-purple-500/10 text-purple-400 px-2.5 py-1 rounded-full font-medium" title="Tonalidad">
                  ♪ {song.key_signature}
                </span>
              )}
              <span
                className="flex items-center gap-1.5 text-xs bg-secondary/60 text-muted-foreground/70 px-2.5 py-1 rounded-full"
                title="Fecha de alta en la biblioteca"
              >
                <LinkIcon className="h-3 w-3" />
                {addedDate}
              </span>
            </div>

            {/* Featuring */}
            {song.featuring && song.featuring.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Featuring
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {song.featuring.map((feat) => (
                    <span
                      key={feat}
                      className="text-xs bg-yellow-500/10 text-yellow-400 px-2.5 py-1 rounded-full"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {song.tags && song.tags.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Tags
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {song.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-secondary text-muted-foreground px-2.5 py-1 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Plataformas */}
            {platformLinks.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Plataformas
                  </span>
                </div>
                <div className="space-y-2">
                  {platformLinks.map(({ key, label, color, bg }) => (
                    <a
                      key={key}
                      href={song[key] as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center justify-between px-3 py-2.5 rounded-2xl border border-border/60 hover:border-transparent hover:-translate-y-0.5 hover:shadow-sm transition-all group",
                        bg
                      )}
                    >
                      <span className={cn("text-sm font-medium", color)}>
                        {label}
                      </span>
                      <ExternalLink className={cn("h-3.5 w-3.5 opacity-60 group-hover:opacity-100", color)} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Drive file + descarga */}
            {(song.drive_file_id || song.drive_file_url) && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <FileAudio className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Archivo de audio
                  </span>
                </div>
                <div className="flex gap-2">
                  {/* Descargar */}
                  <a
                    href={song.drive_file_id
                      ? `/api/drive/stream/${song.drive_file_id}?dl=1&name=${encodeURIComponent(song.title)}`
                      : song.drive_file_url!}
                    download={song.drive_file_id ? song.title : undefined}
                    target={song.drive_file_id ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/80 transition-all active:scale-95 group"
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                    <span className="text-sm font-semibold">Descargar</span>
                  </a>
                  {/* Ver en Drive */}
                  {song.drive_file_url && (
                    <a
                      href={song.drive_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center px-3 py-2.5 rounded-xl border border-border/60 bg-secondary/50 hover:bg-secondary transition-all active:scale-95"
                      title="Abrir en Drive"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  )}
                </div>

                {/* Analizar BPM CTA — solo si tiene audio pero le falta BPM/key */}
                {!song.bpm && !song.key_signature && (
                  <Link
                    href="/analizar"
                    className="flex items-center gap-2 mt-2 px-3 py-2 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/15 transition-all active:scale-95 text-xs font-medium"
                  >
                    <Zap className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Detectar BPM y tonalidad automáticamente</span>
                  </Link>
                )}
              </div>
            )}

            {/* Letra */}
            <div className="pt-2 border-t border-border/60">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Letra
                  </span>
                </div>
                <button
                  onClick={onOpenLyrics}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1"
                >
                  {song.lyrics ? "Ver / editar" : "Agregar letra"}
                </button>
              </div>
              {song.lyrics ? (
                <div
                  onClick={onOpenLyrics}
                  className="relative bg-secondary/40 rounded-2xl px-3 py-2.5 cursor-pointer hover:bg-secondary/60 hover:-translate-y-0.5 hover:shadow-sm transition-all group"
                >
                  <p className="text-xs text-foreground/80 line-clamp-4 whitespace-pre-wrap font-['Georgia',serif] leading-relaxed">
                    {song.lyrics}
                  </p>
                  <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-secondary/60 to-transparent rounded-b-lg group-hover:from-secondary/80" />
                  <p className="text-[10px] text-primary mt-1 text-center">Clic para ver completa</p>
                </div>
              ) : (
                <button
                  onClick={onOpenLyrics}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-95 text-muted-foreground hover:text-primary text-xs"
                >
                  <FileText className="h-4 w-4" />
                  Agregar letra
                </button>
              )}
            </div>

            {/* Metadata completeness progress bar */}
            <div className="pt-2 border-t border-border/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Completitud
                </span>
                <span className={cn(
                  "text-sm font-bold tabular-nums",
                  completenessScore >= 80 ? "text-green-400" : completenessScore >= 50 ? "text-yellow-400" : "text-red-400"
                )}>
                  {completenessScore}%
                </span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-2">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    completenessScore >= 80 ? "bg-green-400" : completenessScore >= 50 ? "bg-yellow-400" : "bg-red-400"
                  )}
                  style={{ width: `${completenessScore}%` }}
                />
              </div>
              {completenessMissing.length > 0 ? (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground">
                    Falta: {completenessMissing.join(" · ")}
                    {" "}
                    <button onClick={onEdit} className="text-primary hover:underline">
                      Completar →
                    </button>
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-green-400 font-medium flex items-center gap-1">
                  ✓ Metadata completa
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
  );  // ← cierra panelContent

  // ── Sidebar mode: inline, sin backdrop, sin bloquear página ──────────
  if (mode === "sidebar") {
    return panelContent;
  }

  // ── Overlay mode: backdrop + panel fijo deslizante ────────────────────
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-sm border-l border-border/60 shadow-2xl animate-in slide-in-from-right duration-200">
        {panelContent}
      </div>
    </>
  );
}
