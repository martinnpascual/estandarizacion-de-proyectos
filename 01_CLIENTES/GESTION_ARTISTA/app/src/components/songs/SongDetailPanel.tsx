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
  mode?: "overlay" | "sidebar";
}

const PLATFORM_CONFIG: {
  key: keyof Song;
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
}[] = [
  { key: "spotify_url",     label: "Spotify",     color: "text-[#1db954]", bg: "bg-[#1db954]/10", border: "border-[#1db954]/25", dot: "bg-[#1db954]" },
  { key: "youtube_url",     label: "YouTube",     color: "text-[#ff4444]", bg: "bg-[#ff4444]/10", border: "border-[#ff4444]/25", dot: "bg-[#ff4444]" },
  { key: "apple_music_url", label: "Apple Music", color: "text-[#fa243c]", bg: "bg-[#fa243c]/10", border: "border-[#fa243c]/25", dot: "bg-[#fa243c]" },
  { key: "soundcloud_url",  label: "SoundCloud",  color: "text-[#ff5500]", bg: "bg-[#ff5500]/10", border: "border-[#ff5500]/25", dot: "bg-[#ff5500]" },
];

function calcCompleteness(song: Song) {
  const hasAudio = !!(song.drive_file_id || song.drive_file_url || song.audio_url);
  const checks = [
    { label: "Audio",    ok: hasAudio },
    { label: "Portada",  ok: !!song.cover_art_url },
    { label: "Letra",    ok: !!song.lyrics },
    { label: "Género",   ok: !!song.genre },
    { label: "Duración", ok: !!song.duration_seconds },
    { label: "BPM/Key",  ok: !!(song.bpm && song.key_signature) || !hasAudio },
    { label: "Spotify",  ok: !!song.spotify_url },
    { label: "YouTube",  ok: !!song.youtube_url },
    { label: "Tags",     ok: !!(song.tags?.length) },
  ];
  const done = checks.filter(c => c.ok).length;
  return {
    score: Math.round((done / checks.length) * 100),
    missing: checks.filter(c => !c.ok).map(c => c.label),
  };
}

/** Separador de sección con etiqueta */
function SectionLabel({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <span className="text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase">
        {label}
      </span>
      {action}
    </div>
  );
}

export default function SongDetailPanel({ song, onClose, onEdit, onOpenLyrics, mode = "overlay" }: Props) {
  const player = useAudioPlayerContext();
  const isPlaying = player.currentTrack?.id === song.id && player.isPlaying;
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isPublic, setIsPublic] = useState(song.is_public ?? false);
  const [togglingPublic, setTogglingPublic] = useState(false);

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
  const hasAudio = !!(song.drive_file_id || song.drive_file_url || song.audio_url);

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
      : song.drive_file_url ?? song.audio_url;
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
        coverArt: song.cover_art_url ?? undefined,
      });
    }
  }

  const panelContent = (
    <div className="flex flex-col h-full overflow-hidden glass-panel">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 flex-shrink-0 panel-header-ambient">
        {/* Ambient bleed from cover art */}
        {song.cover_art_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={song.cover_art_url}
            alt=""
            aria-hidden="true"
            className="absolute inset-[-20%] w-[140%] h-[140%] object-cover blur-[50px] opacity-[0.10] saturate-150 pointer-events-none"
          style={{ zIndex: 0 }}
          />
        )}
        <div className="flex items-center gap-2">
          <Disc3 className="h-3.5 w-3.5 text-primary drop-shadow-[0_0_4px_hsl(var(--primary)/0.6)]" />
          <span className="text-sm font-black">Detalle</span>
          <button
            onClick={handleTogglePublic}
            disabled={togglingPublic}
            title={isPublic ? "Pública — clic para hacer privada" : "Privada — clic para publicar en EPK"}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all active:scale-95",
              isPublic
                ? "bg-green-500/15 text-green-400 hover:bg-red-500/15 hover:text-red-400"
                : "bg-secondary text-muted-foreground hover:bg-green-500/15 hover:text-green-400"
            )}
          >
            {togglingPublic
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {isPublic ? "Pública" : "Privada"}
          </button>
        </div>
        <div className="flex items-center gap-0.5">
          <Link
            href={`/discografia/${song.id}`}
            title="Abrir página completa"
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-all active:scale-95"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={handleShareLink}
            title="Copiar enlace directo"
            className={cn(
              "p-1.5 rounded-lg transition-all active:scale-95",
              linkCopied ? "bg-blue-500/15 text-blue-400" : "hover:bg-secondary text-muted-foreground"
            )}
          >
            {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={handleCopy}
            title="Copiar info"
            className={cn(
              "p-1.5 rounded-lg transition-all active:scale-95",
              copied ? "bg-green-500/15 text-green-400" : "hover:bg-secondary text-muted-foreground"
            )}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => setShowShortcuts(s => !s)}
            title="Atajos"
            className={cn(
              "p-1.5 rounded-lg transition-all active:scale-95",
              showShortcuts ? "bg-secondary text-foreground" : "hover:bg-secondary text-muted-foreground"
            )}
          >
            <Keyboard className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onEdit}
            className="ml-1 text-xs px-2.5 py-1.5 rounded-lg border border-border/60 hover:bg-secondary/60 transition-all active:scale-95 font-medium"
          >
            Editar
          </button>
          <button
            onClick={onClose}
            className="ml-0.5 p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-all active:scale-95"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Atajos de teclado */}
      {showShortcuts && (
        <div className="border-b border-border/50 bg-secondary/20 px-4 py-2.5 flex flex-wrap gap-x-4 gap-y-1">
          {[
            ["P", "Reproducir / Pausar"],
            ["E", "Editar"],
            ["Esc", "Cerrar"],
          ].map(([key, desc]) => (
            <span key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded bg-background border border-border/60 text-[10px] font-mono leading-none">{key}</kbd>
              {desc}
            </span>
          ))}
        </div>
      )}

      {/* ── Contenido scrollable ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Hero: cover art con fondo ambientado ──────────────────── */}
        <div className="relative w-full bg-secondary overflow-hidden" style={{ aspectRatio: "1/1" }}>
          {/* Fondo desenfocado (bleed) */}
          {song.cover_art_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={song.cover_art_url}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-60 saturate-200"
            />
          )}
          {/* Gradiente inferior — fundido suave a card */}
          <div className="absolute inset-0 bg-gradient-to-t from-card/85 via-card/15 to-black/10" />

          {/* Halo ambiental bajo la portada */}
          <div className="cover-art-halo" />

          {/* Portada centrada con sombra profunda */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            {song.cover_art_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={song.cover_art_url}
                alt={song.title}
                className="w-[72%] aspect-square object-cover rounded-2xl shadow-[0_24px_64px_hsl(0_0%_0%/0.70)]"
              />
            ) : (
              <div className="w-28 h-28 rounded-2xl bg-secondary/60 border border-border/40 flex items-center justify-center">
                <Music className="h-10 w-10 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Botón play flotante */}
          {hasAudio && (
            <button
              onClick={handlePlay}
              title={isPlaying ? "Pausar" : "Reproducir"}
              className={cn(
                "absolute bottom-3.5 right-3.5 z-20 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 hover:scale-105",
                isPlaying
                  ? "bg-primary text-primary-foreground animate-glow-pulse"
                  : "bg-card/85 backdrop-blur-md text-foreground hover:bg-primary hover:text-primary-foreground shadow-[0_4px_20px_hsl(0_0%_0%/0.45)] hover:shadow-[0_0_24px_hsl(var(--primary)/0.5)]"
              )}
            >
              {isPlaying
                ? <Pause className="h-4 w-4" />
                : <Play className="h-4 w-4 ml-0.5" />}
            </button>
          )}
        </div>

        {/* ── Waveform (solo si tiene audio) ────────────────────────── */}
        {hasAudio && (
          <div className="px-4 py-3 border-b border-border/40 bg-secondary/10">
            <WaveformPlayer
              url={song.drive_file_id
                ? `/api/drive/stream/${song.drive_file_id}`
                : (song.drive_file_url ?? song.audio_url)!}
              height={44}
            />
          </div>
        )}

        {/* ── Título + artista ──────────────────────────────────────── */}
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-[22px] font-black leading-tight tracking-tight">{song.title}</h2>
          <p className="text-sm text-muted-foreground/80 mt-1 font-medium">
            {song.artist_name}
            {song.featuring && song.featuring.length > 0 && (
              <span className="text-muted-foreground/50 font-normal">
                {" "}ft. {song.featuring.join(", ")}
              </span>
            )}
          </p>
        </div>

        {/* ── Meta chips ────────────────────────────────────────────── */}
        <div className="px-5 pb-5 flex flex-wrap gap-1.5">
          <span className="flex items-center gap-1 text-[11px] bg-secondary/70 text-muted-foreground px-2.5 py-1 rounded-full">
            <Calendar className="h-3 w-3" />
            {song.year}
          </span>
          {song.genre && (
            <span className="flex items-center gap-1 text-[11px] bg-secondary/70 text-muted-foreground px-2.5 py-1 rounded-full">
              <Music className="h-3 w-3" />
              {song.genre}
            </span>
          )}
          {song.duration_seconds && (
            <span className="flex items-center gap-1 text-[11px] bg-secondary/70 text-muted-foreground px-2.5 py-1 rounded-full">
              <Clock className="h-3 w-3" />
              {formatTime(song.duration_seconds)}
            </span>
          )}
          {song.bpm && (
            <span className="flex items-center gap-1 text-[11px] bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full font-mono tabular-nums" title="BPM">
              <Zap className="h-3 w-3" />
              {song.bpm} BPM
            </span>
          )}
          {song.key_signature && (
            <span className="text-[11px] bg-purple-500/10 text-purple-400 px-2.5 py-1 rounded-full font-medium" title="Tonalidad">
              ♪ {song.key_signature}
            </span>
          )}
          <span
            className="flex items-center gap-1 text-[11px] bg-secondary/40 text-muted-foreground/50 px-2.5 py-1 rounded-full"
            title="Fecha de alta"
          >
            {addedDate}
          </span>
        </div>

        {/* ── Secciones ─────────────────────────────────────────────── */}
        <div className="px-5 space-y-5 pb-6">

          {/* Tags */}
          {song.tags && song.tags.length > 0 && (
            <div className="pt-4"><div className="section-divider mb-4" />
              <SectionLabel label="Tags" />
              <div className="flex flex-wrap gap-1.5">
                {song.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] bg-secondary text-muted-foreground px-2.5 py-1 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Plataformas */}
          {platformLinks.length > 0 && (
            <div className="pt-4"><div className="section-divider mb-4" />
              <SectionLabel label="Plataformas" />
              <div className="grid grid-cols-2 gap-2">
                {platformLinks.map(({ key, label, color, bg, border, dot }) => (
                  <a
                    key={key}
                    href={song[key] as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95 group",
                      bg, border
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dot)} />
                    <span className={cn("text-xs font-black flex-1 truncate", color)}>{label}</span>
                    <ExternalLink className={cn("h-3 w-3 opacity-40 group-hover:opacity-80 transition-opacity flex-shrink-0", color)} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Archivo de audio */}
          {hasAudio && (
            <div className="pt-4"><div className="section-divider mb-4" />
              <SectionLabel label="Archivo de audio" />
              {(() => {
                const downloadUrl = song.drive_file_id
                  ? `/api/drive/stream/${song.drive_file_id}?dl=1&name=${encodeURIComponent(song.title)}`
                  : (song.drive_file_url ?? song.audio_url)!;
                return (
                <div className="flex items-center gap-2">
                  <a
                    href={downloadUrl}
                    download={song.drive_file_id ? song.title : song.audio_url ? song.title : undefined}
                    target={song.drive_file_id || song.audio_url ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border/50 text-sm font-medium transition-all active:scale-95 group"
                  >
                    <ArrowDownToLine className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <span>Descargar</span>
                  </a>
                  {song.drive_file_url && (
                    <a
                      href={song.drive_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir en Drive"
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border/50 text-sm text-muted-foreground hover:text-foreground transition-all active:scale-95"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Drive</span>
                    </a>
                  )}
                </div>
                );
              })()}
              {!song.bpm && !song.key_signature && (
                <Link
                  href="/analizar"
                  className="flex items-center gap-2 mt-2.5 px-3.5 py-2 rounded-xl bg-violet-500/8 border border-violet-500/20 text-violet-400 hover:bg-violet-500/12 transition-all active:scale-95 text-xs font-medium"
                >
                  <Zap className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Detectar BPM y tonalidad automáticamente</span>
                </Link>
              )}
            </div>
          )}

          {/* Letra */}
          <div className="pt-4"><div className="section-divider mb-4" />
            <SectionLabel
              label="Letra"
              action={
                <button
                  onClick={onOpenLyrics}
                  className="text-[11px] text-primary/80 hover:text-primary transition-colors font-medium"
                >
                  {song.lyrics ? "Ver / editar" : "Agregar"}
                </button>
              }
            />
            {song.lyrics ? (
              <div
                onClick={onOpenLyrics}
                className="relative bg-secondary/30 border border-border/50 rounded-xl px-4 py-3 cursor-pointer hover:bg-secondary/50 hover:border-border/70 transition-all group"
              >
                <p className="text-xs text-foreground/70 line-clamp-4 whitespace-pre-wrap font-['Georgia',serif] leading-relaxed">
                  {song.lyrics}
                </p>
                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-secondary/30 to-transparent rounded-b-xl group-hover:from-secondary/50" />
                <p className="text-[10px] text-primary/60 mt-2 text-center">Clic para ver completa</p>
              </div>
            ) : (
              <button
                onClick={onOpenLyrics}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border border-dashed border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-95 text-muted-foreground/50 hover:text-primary text-xs"
              >
                <FileText className="h-3.5 w-3.5" />
                Agregar letra
              </button>
            )}
          </div>

          {/* Completitud */}
          <div className="pt-4 pb-2"><div className="section-divider mb-4" />
            <div className="flex items-center gap-4 mb-3">
              {/* SVG donut ring */}
              {(() => {
                const r = 18;
                const circ = 2 * Math.PI * r;
                const strokeColor = completenessScore >= 80 ? "#4ade80" : completenessScore >= 50 ? "#facc15" : "#f87171";
                const offset = circ - (completenessScore / 100) * circ;
                return (
                  <svg width="48" height="48" viewBox="0 0 48 48" className="flex-shrink-0 -rotate-90">
                    {/* Track */}
                    <circle cx="24" cy="24" r={r} fill="none" stroke="hsl(var(--border) / 0.6)" strokeWidth="3.5" />
                    {/* Fill */}
                    <circle
                      cx="24" cy="24" r={r}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="3.5"
                      strokeDasharray={circ}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                      style={{
                        transition: "stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1)",
                        filter: `drop-shadow(0 0 4px ${strokeColor}80)`,
                      }}
                    />
                  </svg>
                );
              })()}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase">
                    Completitud
                  </span>
                  <span className={cn(
                    "text-sm font-black tabular-nums",
                    completenessScore >= 80 ? "text-green-400" : completenessScore >= 50 ? "text-yellow-400" : "text-red-400"
                  )}>
                    {completenessScore}%
                  </span>
                </div>
                {/* Barra */}
                <div className="h-1 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      completenessScore >= 80 ? "bg-green-400" : completenessScore >= 50 ? "bg-yellow-400" : "bg-red-400"
                    )}
                    style={{
                      width: `${completenessScore}%`,
                      boxShadow: completenessScore > 0 ? "0 0 6px currentColor" : undefined,
                    }}
                  />
                </div>
              </div>
            </div>
            {completenessMissing.length > 0 ? (
              <div className="flex items-start gap-1.5">
                <AlertCircle className="h-3 w-3 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                  Falta: {completenessMissing.join(" · ")}
                  {" · "}
                  <button onClick={onEdit} className="text-primary/70 hover:text-primary transition-colors">
                    Completar →
                  </button>
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-green-400/80 font-medium flex items-center gap-1">
                ✓ Metadata completa
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );

  if (mode === "sidebar") {
    return panelContent;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-sm border-l border-border/20 shadow-[0_0_80px_hsl(0_0%_0%/0.6)] animate-in slide-in-from-right duration-200">
        {panelContent}
      </div>
    </>
  );
}
