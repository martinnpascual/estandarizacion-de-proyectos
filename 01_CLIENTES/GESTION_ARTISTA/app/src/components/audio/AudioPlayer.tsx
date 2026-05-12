"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import {
  Play, Pause, Volume2, VolumeX,
  SkipBack, SkipForward, Music, List, X, Shuffle, Repeat, Repeat1, ChevronDown, ChevronUp,
} from "lucide-react";
import { formatTime } from "@/lib/utils";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import type { LoopMode } from "@/hooks/useAudioPlayer";
import { createContext, useContext } from "react";
import { cn } from "@/lib/utils";

// ── Context ────────────────────────────────────────────────────────────────
const AudioPlayerContext = createContext<ReturnType<typeof useAudioPlayer> | null>(null);

export function useAudioPlayerContext() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayerContext must be inside AudioPlayerProvider");
  return ctx;
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const player = useAudioPlayer();
  return (
    <AudioPlayerContext.Provider value={player}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

// ── Progress bar ────────────────────────────────────────────────────────────
function ProgressBar({
  currentTime, duration, markers, onSeek,
}: {
  currentTime: number; duration: number; markers: number[]; onSeek: (t: number) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const getTimeFromEvent = useCallback((e: MouseEvent | React.MouseEvent) => {
    const bar = barRef.current;
    if (!bar || duration <= 0) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration;
  }, [duration]);

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    dragging.current = true;
    onSeek(getTimeFromEvent(e));
  }

  const getTimeFromTouch = useCallback((e: TouchEvent | React.TouchEvent) => {
    const bar = barRef.current;
    if (!bar || duration <= 0) return 0;
    const rect = bar.getBoundingClientRect();
    const touch = e.touches[0] ?? e.changedTouches[0];
    if (!touch) return 0;
    return Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width)) * duration;
  }, [duration]);

  function handleTouchStart(e: React.TouchEvent) {
    dragging.current = true;
    onSeek(getTimeFromTouch(e));
  }

  useEffect(() => {
    function onMove(e: MouseEvent) { if (dragging.current) onSeek(getTimeFromEvent(e)); }
    function onUp() { dragging.current = false; }
    function onTouchMove(e: TouchEvent) { if (dragging.current) { e.preventDefault(); onSeek(getTimeFromTouch(e)); } }
    function onTouchEnd() { dragging.current = false; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [getTimeFromEvent, getTimeFromTouch, onSeek]);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div ref={barRef} onMouseDown={handleMouseDown} onTouchStart={handleTouchStart}
      className="group relative flex-1 h-5 flex items-center cursor-pointer select-none touch-none">
      <div className="absolute inset-y-0 flex items-center w-full">
        <div className="w-full h-1 bg-secondary rounded-full relative">
          <div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: `${pct}%` }} />
          {duration > 0 && markers.map((ts) => (
            <button key={ts} onClick={(e) => { e.stopPropagation(); onSeek(ts); }} title={formatTime(ts)}
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-yellow-400 border-2 border-background z-10 hover:scale-150 transition-transform -translate-x-1/2"
              style={{ left: `${(ts / duration) * 100}%` }} />
          ))}
        </div>
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 -translate-x-1/2"
        style={{ left: `${pct}%` }} />
    </div>
  );
}

// ── Queue drawer ────────────────────────────────────────────────────────────
function QueueDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const player = useAudioPlayerContext();
  const { queue, queueIndex, currentTrack, play, removeFromQueue, clearQueue } = player;

  if (!open) return null;
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[45] bg-black/40 md:bg-transparent md:pointer-events-none" onClick={onClose} />
      {/* Panel */}
      <div className={cn(
        "fixed z-[46] bg-card border border-border/60 shadow-2xl shadow-black/30 flex flex-col",
        // Mobile: bottom sheet above player
        "bottom-[72px] left-0 right-0 rounded-t-2xl max-h-[60vh]",
        // Desktop: right-side panel above player
        "md:bottom-[72px] md:right-4 md:left-auto md:w-80 md:rounded-2xl md:max-h-[70vh]",
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 flex-shrink-0">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Cola de reproducción</span>
            <span className="text-xs text-muted-foreground">({queue.length})</span>
          </div>
          <div className="flex items-center gap-1">
            {queue.length > 0 && (
              <button onClick={clearQueue}
                className="text-xs text-muted-foreground hover:text-red-400 px-2 py-1 rounded-xl hover:bg-secondary transition-all active:scale-95">
                Limpiar
              </button>
            )}
            <button onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-secondary transition-all active:scale-95 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Track list */}
        <div className="overflow-y-auto flex-1">
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Music className="h-8 w-8 opacity-20" />
              <p className="text-sm">La cola está vacía</p>
            </div>
          ) : (
            <ul className="py-1">
              {queue.map((track, i) => {
                const isCurrent = i === queueIndex;
                return (
                  <li key={track.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 group cursor-pointer transition-all active:scale-[0.99]",
                      isCurrent ? "bg-primary/10" : "hover:bg-secondary/60"
                    )}
                    onClick={() => play(track)}
                  >
                    <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 bg-secondary">
                      {isCurrent && player.isPlaying ? (
                        <div className="flex gap-[2px] items-end h-4">
                          {[3, 5, 2, 4].map((h, k) => (
                            <div key={k} className="w-0.5 bg-primary rounded-full animate-pulse"
                              style={{ height: h * 2, animationDelay: `${k * 0.15}s` }} />
                          ))}
                        </div>
                      ) : (
                        <span className={cn("text-[10px] tabular-nums", isCurrent ? "text-primary font-bold" : "text-muted-foreground")}>{i + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm truncate font-medium", isCurrent && "text-primary")}>{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    </div>
                    {track.duration && (
                      <span className="text-[11px] text-muted-foreground tabular-nums flex-shrink-0">
                        {formatTime(track.duration)}
                      </span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFromQueue(track.id); }}
                      className="p-1 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-secondary hover:text-red-400 text-muted-foreground transition-all active:scale-95">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

// ── Loop icon helper ────────────────────────────────────────────────────────
function LoopIcon({ mode }: { mode: LoopMode }) {
  if (mode === "one") return <Repeat1 className="h-3.5 w-3.5" />;
  return <Repeat className="h-3.5 w-3.5" />;
}

// ── Main player ────────────────────────────────────────────────────────────
export default function AudioPlayer() {
  const player = useAudioPlayerContext();
  const {
    currentTrack, isPlaying, currentTime, duration, volume, commentMarkers,
    queue, queueIndex, shuffle, loop, hasNext, hasPrev, playbackRate, setPlaybackRate,
  } = player;

  const [showQueue, setShowQueue] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const SPEED_STEPS = [0.75, 1, 1.25, 1.5, 2];
  function cycleSpeed() {
    const idx = SPEED_STEPS.indexOf(playbackRate);
    const next = SPEED_STEPS[(idx + 1) % SPEED_STEPS.length];
    setPlaybackRate(next);
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
      if (isInput || !player.currentTrack) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          player.togglePlay();
          break;
        case "ArrowRight":
          if (e.altKey) { player.playNext(); break; }
          e.preventDefault();
          player.seek(Math.min(currentTime + 10, duration));
          break;
        case "ArrowLeft":
          if (e.altKey) { player.playPrev(); break; }
          e.preventDefault();
          player.seek(Math.max(currentTime - 10, 0));
          break;
        case "KeyM":
          player.setVolume(volume > 0 ? 0 : 0.8);
          break;
        case "KeyQ":
          if (e.altKey) setShowQueue(v => !v);
          break;
        case "Escape":
          if (showQueue) { setShowQueue(false); }
          break;
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [player, currentTime, duration, volume, showQueue]);

  if (!currentTrack) {
    return (
      <div className="fixed bottom-0 left-0 right-0 h-[64px] bg-card/80 backdrop-blur-xl border-t border-border/50 flex items-center justify-center z-30">
        <p className="text-xs text-muted-foreground/40 select-none flex items-center gap-2">
          <Music className="h-3.5 w-3.5" />
          Seleccioná una canción para reproducir ·{" "}
          <kbd className="bg-secondary/60 px-1.5 rounded border border-border/60 text-[10px]">Espacio</kbd>
          {" "}play/pause
        </p>
      </div>
    );
  }

  // Cover art del track actual (pasado explícitamente desde las páginas)
  const coverUrl = currentTrack.coverArt ?? null;

  return (
    <>
      <QueueDrawer open={showQueue} onClose={() => setShowQueue(false)} />

      <div className="fixed bottom-0 left-0 right-0 z-30 bg-card/85 backdrop-blur-2xl border-t border-border/50 shadow-[0_-8px_40px_hsl(var(--background)/0.9)]">
        {/* ── Barra de progreso — fina y con gradiente ──────────────────── */}
        <div className="px-0">
          <div className="relative h-1 group cursor-pointer" onClick={(e) => {
            if (duration <= 0) return;
            const rect = e.currentTarget.getBoundingClientRect();
            player.seek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration);
          }}>
            {/* Track */}
            <div className="absolute inset-0 bg-border/60" />
            {/* Fill */}
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-primary/70 transition-none"
              style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%" }}
            />
            {/* Glow on filled area */}
            {isPlaying && (
              <div
                className="absolute inset-y-0 left-0 bg-primary/30 blur-sm"
                style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%" }}
              />
            )}
            {/* Thumb — aparece al hover */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg shadow-primary/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -translate-x-1/2"
              style={{ left: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%" }}
            />
            {/* Markers (comentarios) */}
            {duration > 0 && commentMarkers.map((ts) => (
              <button key={ts} onClick={(e) => { e.stopPropagation(); player.seek(ts); }}
                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-yellow-400 border border-background z-10 -translate-x-1/2 hover:scale-150 transition-transform"
                style={{ left: `${(ts / duration) * 100}%` }} />
            ))}
          </div>
        </div>

        {/* Collapsed mini bar */}
        {collapsed ? (
          <div className="flex items-center gap-3 px-4 py-2">
            <button onClick={player.togglePlay}
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95",
                "bg-primary text-primary-foreground hover:bg-primary/80",
                isPlaying && "shadow-[0_0_12px_hsl(var(--primary)/0.5)]"
              )}>
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={cn("text-xs font-semibold truncate leading-none", isPlaying && "text-primary")}>
                {currentTrack.title}
              </p>
              <p className="text-[10px] text-muted-foreground truncate leading-none mt-0.5">{currentTrack.artist}</p>
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
              {formatTime(currentTime)}{duration > 0 ? ` / ${formatTime(duration)}` : ""}
            </span>
            <button onClick={() => setCollapsed(false)} title="Expandir"
              className="p-1.5 rounded-xl hover:bg-secondary/80 text-muted-foreground transition-all active:scale-95 flex-shrink-0">
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2.5 max-w-screen-xl mx-auto">

            {/* ── Track info — cover art + nombre ─────────────────────── */}
            <div className="flex items-center gap-3 w-[220px] min-w-0 flex-shrink-0">
              {/* Cover / Equalizer */}
              <div className={cn(
                "relative w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center",
                "bg-gradient-to-br from-primary/30 to-primary/5 border border-border/60",
                isPlaying && "shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
              )}>
                {coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                ) : isPlaying ? (
                  /* Ecualizador animado real con CSS classes */
                  <div className="flex gap-[2.5px] items-end h-5 px-1">
                    {[1,2,3,4,5].map((i) => (
                      <div
                        key={i}
                        className="eq-bar w-[3px] bg-primary rounded-full"
                        style={{ height: `${[60,100,45,80,55][i-1]}%` }}
                      />
                    ))}
                  </div>
                ) : (
                  <Music className="h-4 w-4 text-primary/50" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className={cn(
                  "text-sm font-semibold truncate leading-tight transition-colors",
                  isPlaying ? "text-primary" : "text-foreground"
                )}>
                  {currentTrack.title}
                </p>
                <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                  {currentTrack.artist}
                </p>
              </div>
            </div>

            {/* ── Center controls ───────────────────────────────────────── */}
            <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div className="flex items-center gap-1">
                {/* Shuffle */}
                <button onClick={player.toggleShuffle} title="Shuffle"
                  className={cn("p-1.5 rounded-xl transition-all active:scale-95 hidden md:flex",
                    shuffle ? "text-primary bg-primary/10 shadow-[0_0_8px_hsl(var(--primary)/0.2)]" : "text-muted-foreground hover:text-foreground hover:bg-secondary/80")}>
                  <Shuffle className="h-3.5 w-3.5" />
                </button>

                {/* Prev */}
                <button onClick={player.playPrev} disabled={!hasPrev} title="Anterior (Alt+←)"
                  className={cn("p-1.5 rounded-xl transition-all",
                    hasPrev ? "text-muted-foreground hover:text-foreground hover:bg-secondary/80 active:scale-95" : "text-muted-foreground/25 cursor-not-allowed")}>
                  <SkipBack className="h-4 w-4" />
                </button>

                {/* -10s */}
                <button onClick={() => player.seek(Math.max(0, currentTime - 10))} title="Retroceder 10s (←)"
                  className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all active:scale-95 hidden sm:flex items-center justify-center w-7 h-7">
                  <span className="text-[9px] font-bold tabular-nums">-10</span>
                </button>

                {/* Play / Pause — botón principal */}
                <button onClick={player.togglePlay} title={isPlaying ? "Pausar (Espacio)" : "Reproducir (Espacio)"}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                    "bg-primary text-primary-foreground hover:bg-primary/85 hover:scale-105 active:scale-95",
                    isPlaying
                      ? "shadow-[0_0_20px_hsl(var(--primary)/0.5),0_4px_12px_hsl(var(--primary)/0.3)]"
                      : "shadow-[0_2px_8px_hsl(0_0%_0%/0.3)]"
                  )}>
                  {isPlaying
                    ? <Pause className="h-4 w-4" />
                    : <Play className="h-4 w-4 ml-0.5" />}
                </button>

                {/* +10s */}
                <button onClick={() => player.seek(Math.min(duration, currentTime + 10))} title="Adelantar 10s (→)"
                  className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all active:scale-95 hidden sm:flex items-center justify-center w-7 h-7">
                  <span className="text-[9px] font-bold tabular-nums">+10</span>
                </button>

                {/* Next */}
                <button onClick={player.playNext} disabled={!hasNext} title="Siguiente (Alt+→)"
                  className={cn("p-1.5 rounded-xl transition-all",
                    hasNext ? "text-muted-foreground hover:text-foreground hover:bg-secondary/80 active:scale-95" : "text-muted-foreground/25 cursor-not-allowed")}>
                  <SkipForward className="h-4 w-4" />
                </button>

                {/* Loop */}
                <button onClick={player.cycleLoop} title="Modo repetición"
                  className={cn("p-1.5 rounded-xl transition-all active:scale-95 hidden md:flex",
                    loop !== "none" ? "text-primary bg-primary/10 shadow-[0_0_8px_hsl(var(--primary)/0.2)]" : "text-muted-foreground hover:text-foreground hover:bg-secondary/80")}>
                  <LoopIcon mode={loop} />
                </button>
              </div>

              {/* Tiempo */}
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 tabular-nums">
                <span className="text-muted-foreground">{formatTime(currentTime)}</span>
                <span>/</span>
                <span>{duration > 0 ? formatTime(duration) : (currentTrack.duration ? formatTime(currentTrack.duration) : "—")}</span>
                {queue.length > 1 && (
                  <span className="text-muted-foreground/40 ml-1">{queueIndex + 1}/{queue.length}</span>
                )}
              </div>
            </div>

            {/* ── Right controls ────────────────────────────────────────── */}
            <div className="hidden sm:flex items-center gap-1.5 w-[220px] justify-end flex-shrink-0">
              {/* Speed */}
              <button onClick={cycleSpeed} title={`Velocidad: ${playbackRate}x`}
                className={cn(
                  "px-2 py-1 rounded-xl text-[10px] font-bold tabular-nums transition-all active:scale-95 border",
                  playbackRate !== 1
                    ? "text-primary bg-primary/10 border-primary/20"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/80 hover:border-border/60"
                )}>
                {playbackRate}x
              </button>

              {/* Volume icon */}
              <button onClick={() => player.setVolume(volume > 0 ? 0 : 0.8)} title="Silenciar (M)"
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all active:scale-95">
                {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>

              {/* Volume bar */}
              <div className="relative flex items-center w-16 h-5 group/vol cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  player.setVolume(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
                }}>
                <div className="w-full h-1 rounded-full bg-border/60 relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/70 to-primary rounded-full transition-none"
                    style={{ width: `${volume * 100}%` }}
                  />
                </div>
              </div>

              {/* Queue */}
              <button onClick={() => setShowQueue(v => !v)}
                title={`Cola (Alt+Q)${queue.length > 0 ? ` · ${queue.length} pistas` : ""}`}
                className={cn("p-1.5 rounded-xl transition-all active:scale-95 relative",
                  showQueue ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary/80")}>
                <List className="h-4 w-4" />
                {queue.length > 1 && (
                  <span className="absolute -top-1 -right-1 text-[8px] bg-primary text-primary-foreground rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold tabular-nums leading-none">
                    {queue.length > 9 ? "9+" : queue.length}
                  </span>
                )}
              </button>

              {/* Collapse */}
              <button onClick={() => setCollapsed(true)} title="Minimizar"
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all active:scale-95">
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
