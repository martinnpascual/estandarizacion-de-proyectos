"use client";

/**
 * WaveformPlayer — Reproductor con visualización de forma de onda usando WaveSurfer.js
 * Usado en páginas de canción individual y panel de detalle
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Loader2 } from "lucide-react";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface WaveformPlayerProps {
  url: string;
  /** Color primario para la onda (CSS color string) */
  waveColor?: string;
  /** Color de la parte reproducida */
  progressColor?: string;
  height?: number;
  className?: string;
  autoPlay?: boolean;
  onTimeUpdate?: (time: number) => void;
  onDurationReady?: (duration: number) => void;
}

export default function WaveformPlayer({
  url,
  waveColor = "rgb(var(--primary) / 0.3)",
  progressColor = "rgb(var(--primary))",
  height = 64,
  className,
  autoPlay = false,
  onTimeUpdate,
  onDurationReady,
}: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<import("wavesurfer.js").default | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;

    let ws: import("wavesurfer.js").default;

    const initWaveSurfer = async () => {
      try {
        const WaveSurfer = (await import("wavesurfer.js")).default;

        ws = WaveSurfer.create({
          container: containerRef.current!,
          waveColor: "rgba(99, 102, 241, 0.35)",
          progressColor: "rgba(99, 102, 241, 1)",
          height,
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
          cursorWidth: 0,
          normalize: true,
          backend: "WebAudio",
          url,
        });

        wavesurferRef.current = ws;

        ws.on("ready", (dur) => {
          setIsLoading(false);
          setDuration(dur);
          onDurationReady?.(dur);
          if (autoPlay) ws.play();
        });

        ws.on("timeupdate", (t) => {
          setCurrentTime(t);
          onTimeUpdate?.(t);
        });

        ws.on("play", () => setIsPlaying(true));
        ws.on("pause", () => setIsPlaying(false));
        ws.on("finish", () => setIsPlaying(false));

        ws.on("error", (err) => {
          console.error("[WaveformPlayer] error:", err);
          setIsLoading(false);
          setError("Error al cargar el audio");
        });
      } catch (e) {
        console.error("[WaveformPlayer] init error:", e);
        setError("Error al inicializar el reproductor");
        setIsLoading(false);
      }
    };

    initWaveSurfer();

    return () => {
      ws?.destroy();
      wavesurferRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const togglePlay = useCallback(() => {
    wavesurferRef.current?.playPause();
  }, []);

  const toggleMute = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;
    const newMuted = !muted;
    ws.setVolume(newMuted ? 0 : volume);
    setMuted(newMuted);
  }, [muted, volume]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    setMuted(v === 0);
    wavesurferRef.current?.setVolume(v);
  }, []);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <div className={cn("flex items-center justify-center h-16 rounded-lg bg-secondary text-muted-foreground text-sm", className)}>
        {error}
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl bg-secondary/50 p-3 space-y-2", className)}>
      {/* Waveform canvas */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-secondary/50 rounded">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
        <div ref={containerRef} className={cn("w-full rounded", isLoading && "opacity-30")} />
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3">
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          disabled={isLoading}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
            "bg-primary text-primary-foreground hover:bg-primary/80 disabled:opacity-40"
          )}
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
        </button>

        {/* Time */}
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums flex-shrink-0">
          <span className="text-foreground">{formatTime(currentTime)}</span>
          <span className="text-muted-foreground/40">/</span>
          <span>{duration > 0 ? formatTime(duration) : "—"}</span>
        </div>

        {/* Progress bar (visual only — wavesurfer handles click-to-seek via its canvas) */}
        <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-100"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Volume */}
        <button onClick={toggleMute} className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors">
          {muted || volume === 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>
        <input
          type="range"
          min={0} max={1} step={0.01}
          value={muted ? 0 : volume}
          onChange={handleVolumeChange}
          className="w-16 h-1 accent-primary cursor-pointer"
        />
      </div>
    </div>
  );
}
