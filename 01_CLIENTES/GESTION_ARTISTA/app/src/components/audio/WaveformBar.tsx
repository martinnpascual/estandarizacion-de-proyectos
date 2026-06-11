"use client";

import { useEffect, useRef, useState } from "react";

interface WaveformBarProps {
  url: string | null;
  audioElement: HTMLAudioElement | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  commentMarkers?: number[];
  onSeek: (time: number) => void;
  height?: number;
  waveColor?: string;
  progressColor?: string;
}

export default function WaveformBar({
  url,
  audioElement,
  currentTime,
  duration,
  isPlaying,
  commentMarkers = [],
  onSeek,
  height = 44,
  waveColor = "rgba(255,255,255,0.12)",
  progressColor = "hsl(var(--section-hsl, 262 80% 62%))",
}: WaveformBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<import("wavesurfer.js").default | null>(null);
  const [ready, setReady] = useState(false);
  const prevUrlRef = useRef<string | null>(null);

  // Init / reinit WaveSurfer when URL or audioElement changes
  useEffect(() => {
    if (!containerRef.current || !url || !audioElement) return;
    if (prevUrlRef.current === url && wsRef.current) return;
    prevUrlRef.current = url;
    setReady(false);

    let destroyed = false;

    (async () => {
      // Destroy previous instance
      if (wsRef.current) {
        try { wsRef.current.destroy(); } catch {}
        wsRef.current = null;
      }

      try {
        const WaveSurfer = (await import("wavesurfer.js")).default;

        if (destroyed || !containerRef.current) return;

        const ws = WaveSurfer.create({
          container: containerRef.current,
          height,
          waveColor,
          progressColor,
          cursorWidth: 0,
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
          normalize: true,
          interact: false,
          media: audioElement,
          url,
        });

        ws.on("ready", () => {
          if (!destroyed) setReady(true);
        });

        ws.on("error", () => {
          if (!destroyed) setReady(false);
        });

        wsRef.current = ws;
      } catch {}
    })();

    return () => {
      destroyed = true;
    };
  }, [url, audioElement]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync seek position to WaveSurfer
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || !ready || duration <= 0) return;
    const pct = currentTime / duration;
    try { ws.seekTo(Math.max(0, Math.min(1, pct))); } catch {}
  }, [currentTime, duration, ready]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        try { wsRef.current.destroy(); } catch {}
        wsRef.current = null;
      }
    };
  }, []);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(1, pct)) * duration);
  }

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="relative w-full cursor-pointer select-none" style={{ height }} onClick={handleClick}>
      {/* WaveSurfer canvas container */}
      <div ref={containerRef} className="absolute inset-0" style={{ opacity: ready ? 1 : 0, transition: "opacity 0.4s ease" }} />

      {/* Fallback progress bar when not ready */}
      {!ready && (
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-[3px] rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full transition-none"
              style={{ width: `${pct}%`, background: progressColor }} />
          </div>
        </div>
      )}

      {/* Clickable progress overlay (transparent, for seek) */}
      <div className="absolute inset-0" />

      {/* Playhead */}
      {ready && (
        <div
          className="absolute top-0 bottom-0 w-[2px] rounded-full pointer-events-none transition-none"
          style={{
            left: `${pct}%`,
            background: progressColor,
            boxShadow: `0 0 6px ${progressColor}`,
            opacity: isPlaying ? 0.9 : 0.5,
          }}
        />
      )}

      {/* Comment markers */}
      {ready && commentMarkers.map((t, i) => {
        const pos = duration > 0 ? (t / duration) * 100 : 0;
        return (
          <div key={i}
            className="absolute top-0 bottom-0 w-[1.5px] pointer-events-none"
            style={{ left: `${pos}%`, background: "rgba(251,191,36,0.7)" }}
          />
        );
      })}
    </div>
  );
}
