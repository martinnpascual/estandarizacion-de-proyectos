"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import {
  Play, Pause, Volume2, VolumeX,
  SkipBack, SkipForward, Music, List, X, Shuffle, Repeat, Repeat1, ChevronDown, ChevronUp,
  Heart, Timer, Share2, Check,
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

// ══════════════════════════════════════════════════════════════════════════════
// ── Real-time Spectrum Analyzer — SoundCloud aesthetic, canvas 60fps ─────
// ══════════════════════════════════════════════════════════════════════════════
const BAR_COUNT   = 260;          // dense fine bars for precision texture
const BAR_GAP     = 0.55;        // minimal gap for ultra-thin look
const MIN_FREQ_HZ = 20;
const MAX_FREQ_HZ = 18000;
const NYQUIST     = 22050;
const ALPHA_UP    = 0.65;        // very snappy to transients & beats
const ALPHA_DOWN  = 0.055;       // long musical tail on decay
const MIN_AMP     = 0.018;       // nearly flat floor when truly silent
const PEAK_DECAY  = 0.0012;      // slow peak-hold tick decay per frame at 60 fps

function barToFreq(i: number, count: number): number {
  return MIN_FREQ_HZ * Math.pow(MAX_FREQ_HZ / MIN_FREQ_HZ, i / (count - 1));
}
function freqToBin(freq: number, binCount: number): number {
  return Math.min(binCount - 1, Math.round((freq / NYQUIST) * binCount));
}
function buildBinRanges(binCount: number, count: number): Array<[number, number]> {
  return Array.from({ length: count }, (_, i) => {
    const b0 = freqToBin(barToFreq(i, count), binCount);
    const b1 = freqToBin(barToFreq(i + 1, count), binCount);
    return [b0, Math.max(b0, b1)];
  });
}

function SpectrumAnalyzer({
  analyserRef, isPlaying, currentTime, duration, commentMarkers, onSeek,
}: {
  analyserRef: React.RefObject<AnalyserNode | null>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  commentMarkers: number[];
  onSeek: (t: number) => void;
}) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const smoothed   = useRef<Float32Array>(new Float32Array(BAR_COUNT));
  const peakHold   = useRef<Float32Array>(new Float32Array(BAR_COUNT));
  const binRanges  = useRef<Array<[number, number]> | null>(null);
  const idlePhase  = useRef(0);
  const prevDpr    = useRef(0);
  const prevW      = useRef(0);
  const prevH      = useRef(0);

  const [hoverPct, setHoverPct] = useState<number | null>(null);

  const seekFromX = useCallback((clientX: number, rect: DOMRect) => {
    if (duration <= 0) return;
    onSeek(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * duration);
  }, [duration, onSeek]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPct(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  }, [duration]);

  const hoverTime = hoverPct !== null && duration > 0 ? hoverPct * duration : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Parse CSS primary color once
    const cssHsl  = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "262 80% 62%";
    const [pH, pS, pL] = cssHsl.split(" ").map(parseFloat);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);

      const dpr = window.devicePixelRatio || 1;
      const W   = canvas.clientWidth;
      const H   = canvas.clientHeight;

      if (W !== prevW.current || H !== prevH.current || dpr !== prevDpr.current) {
        canvas.width  = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        prevW.current = W; prevH.current = H; prevDpr.current = dpr;
      }

      ctx.clearRect(0, 0, W, H);

      // ── Read frequency data or breathe ─────────────────────────────
      const analyser = analyserRef.current;
      if (analyser && isPlaying) {
        const binCount = analyser.frequencyBinCount;
        if (!binRanges.current) binRanges.current = buildBinRanges(binCount, BAR_COUNT);
        const data = new Uint8Array(binCount);
        analyser.getByteFrequencyData(data);
        for (let i = 0; i < BAR_COUNT; i++) {
          const [b0, b1] = binRanges.current[i];
          let peak = 0;
          for (let b = b0; b <= b1; b++) if (data[b] > peak) peak = data[b];
          const raw   = Math.max(MIN_AMP, peak / 255);
          const alpha = raw > smoothed.current[i] ? ALPHA_UP : ALPHA_DOWN;
          smoothed.current[i] += alpha * (raw - smoothed.current[i]);
        }
      } else {
        // Organic multi-layer breathing when paused
        idlePhase.current += 0.018;
        const t = idlePhase.current;
        for (let i = 0; i < BAR_COUNT; i++) {
          const x    = i / BAR_COUNT;
          const wave = 0.50 * Math.sin(t + x * 5.8)
                     + 0.28 * Math.sin(t * 1.4 + x * 11.6)
                     + 0.14 * Math.sin(t * 0.8 + x * 2.9)
                     + 0.08 * Math.sin(t * 2.1 + x * 17.4);
          const target = MIN_AMP + 0.16 * (1 + wave) * 0.5;
          smoothed.current[i] += 0.048 * (target - smoothed.current[i]);
        }
      }

      // ── Update peak-hold ticks ──────────────────────────────────────
      for (let i = 0; i < BAR_COUNT; i++) {
        if (smoothed.current[i] >= peakHold.current[i]) {
          peakHold.current[i] = smoothed.current[i];
        } else {
          peakHold.current[i] = Math.max(MIN_AMP, peakHold.current[i] - PEAK_DECAY);
        }
      }

      // ── Layout ──────────────────────────────────────────────────────
      const totalGap = BAR_GAP * (BAR_COUNT - 1);
      const barW     = Math.max(1, (W - totalGap) / BAR_COUNT);
      const midY     = H / 2;
      const halfH    = midY - 2;

      const pct       = duration > 0 ? currentTime / duration : 0;
      const playheadX = pct * W;

      // ── Center axis baseline ─────────────────────────────────────────
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(W, midY);
      ctx.strokeStyle = `rgba(255,255,255,0.045)`;
      ctx.lineWidth   = 0.5;
      ctx.stroke();

      // ── Played-region ambient tint ───────────────────────────────────
      if (pct > 0.002) {
        const tintGrd = ctx.createLinearGradient(0, 0, playheadX, 0);
        tintGrd.addColorStop(0, `hsla(${pH}, ${pS}%, ${pL}%, 0.04)`);
        tintGrd.addColorStop(1, `hsla(${pH}, ${pS}%, ${pL}%, 0.11)`);
        ctx.fillStyle = tintGrd;
        ctx.fillRect(0, 0, playheadX, H);
      }

      // ── Horizontal frequency color gradients (warm bass → cool highs) ──
      // Playing state: full vivid spectrum
      const gradFreqPlay = ctx.createLinearGradient(0, 0, W, 0);
      gradFreqPlay.addColorStop(0,    `hsla(${pH - 24}, ${Math.min(pS + 22, 100)}%, ${pL + 4}%, 0.97)`);
      gradFreqPlay.addColorStop(0.12, `hsla(${pH - 10}, ${pS + 8}%,                 ${pL + 5}%, 0.95)`);
      gradFreqPlay.addColorStop(0.35, `hsla(${pH},       ${pS}%,                    ${pL + 9}%, 0.93)`);
      gradFreqPlay.addColorStop(0.60, `hsla(${pH + 8},  ${pS - 4}%,                ${pL + 14}%, 0.94)`);
      gradFreqPlay.addColorStop(1.0,  `hsla(${pH + 42}, ${Math.max(pS - 25, 56)}%, ${pL + 26}%, 0.91)`);

      // Paused state: muted version
      const gradFreqPause = ctx.createLinearGradient(0, 0, W, 0);
      gradFreqPause.addColorStop(0,   `hsla(${pH - 16}, ${pS}%, ${pL + 2}%, 0.50)`);
      gradFreqPause.addColorStop(0.5, `hsla(${pH},      ${pS}%, ${pL}%,     0.44)`);
      gradFreqPause.addColorStop(1.0, `hsla(${pH + 28}, ${pS}%, ${pL + 12}%, 0.46)`);

      // ── Draw bars (symmetric: grow up + down from midY) ─────────────
      for (let i = 0; i < BAR_COUNT; i++) {
        const x      = i * (barW + BAR_GAP);
        const cx     = x + barW / 2;
        const val    = smoothed.current[i];
        const arm    = Math.max(1, val * halfH);
        const radius = Math.min(barW / 2, 1.5);

        const barFrac  = cx / W;
        const isFilled = barFrac <= pct;

        if (isFilled && isPlaying) {
          ctx.fillStyle = gradFreqPlay;
        } else if (isFilled) {
          ctx.fillStyle = gradFreqPause;
        } else {
          ctx.fillStyle = `rgba(255,255,255,${isPlaying ? 0.16 : 0.10})`;
        }

        // Top arm
        ctx.beginPath();
        ctx.roundRect(x, midY - arm, barW, arm, [radius, radius, 0, 0]);
        ctx.fill();
        // Bottom arm (mirror)
        ctx.beginPath();
        ctx.roundRect(x, midY, barW, arm, [0, 0, radius, radius]);
        ctx.fill();

        // ── Bright tip overlay for loud bars (near-white highlights) ─
        if (isFilled && isPlaying && val > 0.62) {
          const t    = (val - 0.62) / 0.38;
          const tipH = Math.max(1.5, arm * 0.20);
          ctx.fillStyle = `rgba(255,255,255,${t * 0.32})`;
          ctx.beginPath();
          ctx.roundRect(x, midY - arm, barW, tipH, [radius, radius, 0, 0]);
          ctx.fill();
          ctx.beginPath();
          ctx.roundRect(x, midY + arm - tipH, barW, tipH, [0, 0, radius, radius]);
          ctx.fill();
        }
      }

      // ── Peak-hold ticks — professional spectrum analyzer signature ──
      if (isPlaying) {
        for (let i = 0; i < BAR_COUNT; i++) {
          const ph = peakHold.current[i];
          if (ph <= MIN_AMP + 0.01) continue;
          const x        = i * (barW + BAR_GAP);
          const cx       = x + barW / 2;
          const pArm     = Math.max(1, ph * halfH);
          const barFrac  = cx / W;
          const isFilled = barFrac <= pct;
          const alpha    = isFilled ? 0.88 : 0.28;

          // Frequency-matched tick color
          const freqFrac = i / (BAR_COUNT - 1);
          const tickHue  = freqFrac < 0.18
            ? pH - 24 * (1 - freqFrac / 0.18)
            : freqFrac > 0.65
              ? pH + 42 * ((freqFrac - 0.65) / 0.35)
              : pH;
          const tickL = Math.min(pL + 32, 92);
          ctx.fillStyle = `hsla(${tickHue}, ${pS}%, ${tickL}%, ${alpha})`;

          // Top tick
          ctx.fillRect(x, midY - pArm - 1.5, barW, 1.5);
          // Bottom tick (mirror)
          ctx.fillRect(x, midY + pArm,         barW, 1.5);
        }
      }

      // ── Depth vignette: fade extreme top & bottom into background ───
      const topVig = ctx.createLinearGradient(0, 0, 0, midY * 0.40);
      topVig.addColorStop(0,   'rgba(6,6,10,0.52)');
      topVig.addColorStop(1,   'rgba(6,6,10,0)');
      ctx.fillStyle = topVig;
      ctx.fillRect(0, 0, W, midY * 0.40);

      const botVig = ctx.createLinearGradient(0, H - midY * 0.40, 0, H);
      botVig.addColorStop(0,   'rgba(6,6,10,0)');
      botVig.addColorStop(1,   'rgba(6,6,10,0.52)');
      ctx.fillStyle = botVig;
      ctx.fillRect(0, H - midY * 0.40, W, midY * 0.40);

      // ── Playhead ─────────────────────────────────────────────────────
      if (duration > 0 && pct > 0.001) {
        // Wide soft glow halo
        const grd = ctx.createLinearGradient(playheadX - 14, 0, playheadX + 14, 0);
        grd.addColorStop(0,    `hsla(${pH},${pS}%,${pL+10}%,0)`);
        grd.addColorStop(0.38, `hsla(${pH},${pS}%,${pL+22}%,0.28)`);
        grd.addColorStop(0.62, `hsla(${pH},${pS}%,${pL+22}%,0.28)`);
        grd.addColorStop(1,    `hsla(${pH},${pS}%,${pL+10}%,0)`);
        ctx.fillStyle = grd;
        ctx.fillRect(playheadX - 14, 0, 28, H);

        // Crisp 1.5 px line
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, H);
        ctx.strokeStyle = `hsla(${pH},${pS}%,${Math.min(pL + 36, 97)}%,0.97)`;
        ctx.lineWidth   = 1.5;
        ctx.shadowColor = `hsl(${pH} ${pS}% ${Math.min(pL + 22, 92)}%)`;
        ctx.shadowBlur  = 11;
        ctx.stroke();
        ctx.restore();

        // Outer knob ring
        ctx.beginPath();
        ctx.arc(playheadX, midY, 6.5, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${pH},${pS}%,${Math.min(pL + 28, 90)}%,0.45)`;
        ctx.lineWidth   = 1;
        ctx.stroke();

        // Main knob
        ctx.beginPath();
        ctx.arc(playheadX, midY, 5, 0, Math.PI * 2);
        ctx.fillStyle   = `hsl(${pH} ${pS}% ${Math.min(pL + 36, 97)}%)`;
        ctx.shadowColor = `hsl(${pH} ${pS}% ${pL}%)`;
        ctx.shadowBlur  = 18;
        ctx.fill();
        ctx.shadowBlur  = 0;

        // White center dot
        ctx.beginPath();
        ctx.arc(playheadX, midY, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.97)";
        ctx.fill();
      }

      // ── Comment markers ──────────────────────────────────────────────
      for (const ts of commentMarkers) {
        if (duration <= 0) break;
        const mx = (ts / duration) * W;
        ctx.beginPath();
        ctx.arc(mx, midY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle   = "rgba(234,179,8,0.95)";
        ctx.shadowColor = "rgba(234,179,8,0.75)";
        ctx.shadowBlur  = 8;
        ctx.fill();
        ctx.shadowBlur  = 0;
      }
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserRef, isPlaying, currentTime, duration, commentMarkers]);

  return (
    <div className="relative w-full" style={{ height: 64 }}>
      {/* Timestamp hover tooltip */}
      {hoverTime !== null && hoverPct !== null && (
        <div
          className="absolute bottom-full mb-1.5 -translate-x-1/2 pointer-events-none z-10"
          style={{ left: `${hoverPct * 100}%` }}
        >
          <div className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold text-white/90 shadow-lg whitespace-nowrap"
            style={{ background: "rgba(10,10,18,0.92)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}>
            {formatTime(hoverTime)}
          </div>
          <div className="w-1.5 h-1.5 mx-auto -mt-[5px] rotate-45"
            style={{ background: "rgba(10,10,18,0.92)", border: "0 solid transparent", borderRight: "1px solid rgba(255,255,255,0.12)", borderBottom: "1px solid rgba(255,255,255,0.12)" }} />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer select-none"
        onClick={(e) => seekFromX(e.clientX, e.currentTarget.getBoundingClientRect())}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverPct(null)}
        style={{ display: "block" }}
      />
    </div>
  );
}

// ── Queue drawer ────────────────────────────────────────────────────────────
function QueueDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const player = useAudioPlayerContext();
  const { queue, queueIndex, play, removeFromQueue, clearQueue } = player;

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-[45] bg-black/50 md:bg-transparent md:pointer-events-none" onClick={onClose} />
      <div className={cn(
        "fixed z-[46] flex flex-col overflow-hidden",
        "bottom-[96px] left-0 right-0 rounded-t-2xl max-h-[60vh]",
        "md:bottom-[96px] md:right-4 md:left-auto md:w-80 md:rounded-2xl md:max-h-[70vh]",
        "border border-white/10 shadow-2xl",
      )}
        style={{ background: "rgba(10,10,15,0.97)", backdropFilter: "blur(28px)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-primary drop-shadow-[0_0_5px_currentColor]" />
            <span className="text-sm font-black text-white/90">Cola de reproducción</span>
            <span className="text-xs text-white/30 tabular-nums bg-white/6 px-1.5 py-0.5 rounded-full border border-white/8">
              {queue.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {queue.length > 0 && (
              <button onClick={clearQueue}
                className="text-xs text-white/30 hover:text-red-400 px-2 py-1 rounded-xl hover:bg-red-500/10 transition-all active:scale-95">
                Limpiar
              </button>
            )}
            <button onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/8 transition-all active:scale-95 text-white/40 hover:text-white/80">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/20 gap-3">
              <Music className="h-8 w-8 opacity-30" />
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
                      isCurrent
                        ? "bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-l-2 border-primary/60"
                        : "hover:bg-white/5"
                    )}
                    onClick={() => play(track)}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border",
                      isCurrent ? "bg-primary/25 border-primary/40 shadow-[0_0_8px_hsl(var(--primary)/0.3)]" : "bg-white/5 border-white/8"
                    )}>
                      {isCurrent && player.isPlaying ? (
                        <div className="flex gap-[2px] items-end h-4">
                          {[3, 5, 2, 4].map((h, k) => (
                            <div key={k} className="w-[2px] rounded-full eq-bar"
                              style={{
                                height: h * 2.5,
                                background: "linear-gradient(to top, hsl(var(--primary)), hsl(262 80% 75%))",
                                animationDelay: `${k * 0.15}s`,
                              }} />
                          ))}
                        </div>
                      ) : (
                        <span className={cn("text-[10px] tabular-nums font-black", isCurrent ? "text-primary" : "text-white/25")}>{i + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm truncate font-black leading-tight", isCurrent ? "text-white" : "text-white/80")}>{track.title}</p>
                      <p className="text-xs text-white/30 truncate mt-0.5">{track.artist}</p>
                    </div>
                    {track.duration && (
                      <span className="text-[11px] text-white/25 tabular-nums flex-shrink-0 font-mono">
                        {formatTime(track.duration)}
                      </span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFromQueue(track.id); }}
                      className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 text-white/30 transition-all active:scale-95">
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

// ── Helpers ─────────────────────────────────────────────────────────────────
function LoopIcon({ mode }: { mode: LoopMode }) {
  if (mode === "one") return <Repeat1 className="h-3.5 w-3.5" />;
  return <Repeat className="h-3.5 w-3.5" />;
}

function CtrlBtn({
  onClick, disabled, title, active, children, className,
}: {
  onClick?: () => void; disabled?: boolean; title?: string;
  active?: boolean; children: React.ReactNode; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-tooltip={title}
      className={cn(
        "p-1.5 rounded-xl transition-all active:scale-95 flex items-center justify-center",
        active
          ? "text-primary bg-primary/16 shadow-[0_0_14px_hsl(var(--primary)/0.35),inset_0_1px_0_hsl(var(--primary)/0.28)] border border-primary/32 player-ctrl-active"
          : disabled
          ? "text-white/10 cursor-not-allowed"
          : "text-white/38 hover:text-white/95 hover:bg-white/9 border border-transparent hover:border-white/10 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_1px_3px_rgba(0,0,0,0.28)]",
        className
      )}
    >
      {children}
    </button>
  );
}

// ── Main player ────────────────────────────────────────────────────────────
export default function AudioPlayer() {
  const player = useAudioPlayerContext();
  const {
    currentTrack, isPlaying, currentTime, duration, volume, commentMarkers,
    queue, queueIndex, shuffle, loop, hasNext, hasPrev, playbackRate, setPlaybackRate,
    analyserRef, resumeAudioContext,
  } = player;

  const [showQueue, setShowQueue] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // ── Like / heart ──────────────────────────────────────────────────────
  const [likedIds, setLikedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("liked_tracks") ?? "[]")); }
    catch { return new Set(); }
  });
  const [likeAnimating, setLikeAnimating] = useState(false);
  const isLiked = currentTrack ? likedIds.has(currentTrack.id) : false;

  function toggleLike() {
    if (!currentTrack) return;
    const next = new Set(likedIds);
    if (next.has(currentTrack.id)) { next.delete(currentTrack.id); }
    else {
      next.add(currentTrack.id);
      setLikeAnimating(true);
      setTimeout(() => setLikeAnimating(false), 800);
    }
    setLikedIds(next);
    localStorage.setItem("liked_tracks", JSON.stringify(Array.from(next)));
  }

  // ── Remaining time toggle (Spotify-style) ─────────────────────────────
  const [showRemaining, setShowRemaining] = useState(false);

  // ── Sleep timer ───────────────────────────────────────────────────────
  const [sleepMinutes, setSleepMinutes] = useState<number | null>(null);
  const [sleepSecondsLeft, setSleepSecondsLeft] = useState<number | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function activateSleep(minutes: number) {
    if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    setSleepMinutes(minutes);
    setSleepSecondsLeft(minutes * 60);
    sleepTimerRef.current = setInterval(() => {
      setSleepSecondsLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(sleepTimerRef.current!);
          player.pause();
          setSleepMinutes(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function cancelSleep() {
    if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    setSleepMinutes(null);
    setSleepSecondsLeft(null);
  }

  useEffect(() => () => { if (sleepTimerRef.current) clearInterval(sleepTimerRef.current); }, []);

  // ── Marquee: detect title overflow ───────────────────────────────────
  const titleRef = useRef<HTMLParagraphElement>(null);
  const [titleOverflows, setTitleOverflows] = useState(false);
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    setTitleOverflows(el.scrollWidth > el.clientWidth + 4);
  }, [currentTrack?.title]);

  const SPEED_STEPS = [0.75, 1, 1.25, 1.5, 2];
  function cycleSpeed() {
    const idx = SPEED_STEPS.indexOf(playbackRate);
    setPlaybackRate(SPEED_STEPS[(idx + 1) % SPEED_STEPS.length]);
  }

  // ── Sleep dropdown state ──────────────────────────────────────────────
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // ── Keyboard shortcuts ────────────────────────────────────────────
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
      if (isInput || !player.currentTrack) return;
      switch (e.code) {
        case "Space":       e.preventDefault(); resumeAudioContext(); player.togglePlay(); break;
        case "ArrowRight":
          if (e.altKey) { player.playNext(); break; }
          e.preventDefault(); player.seek(Math.min(currentTime + 10, duration)); break;
        case "ArrowLeft":
          if (e.altKey) { player.playPrev(); break; }
          e.preventDefault(); player.seek(Math.max(currentTime - 10, 0)); break;
        case "KeyM": player.setVolume(volume > 0 ? 0 : 0.8); break;
        case "KeyL": toggleLike(); break;
        case "KeyQ": if (e.altKey) setShowQueue(v => !v); break;
        case "Slash": if (e.shiftKey) { e.preventDefault(); setShowShortcuts(v => !v); } break;
        case "Escape":
          if (showQueue) setShowQueue(false);
          if (showSleepMenu) setShowSleepMenu(false);
          if (showShortcuts) setShowShortcuts(false);
          break;
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [player, currentTime, duration, volume, showQueue, showSleepMenu, showShortcuts, resumeAudioContext]);

  if (!currentTrack) return null;

  const coverUrl = currentTrack.coverArt ?? null;
  const pct      = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <QueueDrawer open={showQueue} onClose={() => setShowQueue(false)} />

      <div
        className="fixed bottom-0 left-0 right-0 z-30 animate-in slide-in-from-bottom-4 duration-300"
        style={{ filter: "drop-shadow(0 -24px 64px rgba(0,0,0,0.92))" }}
      >
        {/* ── Background ──────────────────────────────────────────────── */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0" style={{
            background: "rgba(6,6,10,0.98)",
            backdropFilter: "blur(52px) saturate(2.2)",
          }} />
          {/* Ambient multi-color bloom */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "linear-gradient(135deg, hsl(var(--primary)/0.22) 0%, transparent 48%, hsl(var(--primary)/0.12) 100%)",
          }} />
          {/* Side accent glows — left warm, right cool */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse 40% 100% at 0% 50%, hsl(var(--primary)/0.14) 0%, transparent 100%)",
          }} />
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse 30% 100% at 100% 50%, hsl(200 80% 60%/0.08) 0%, transparent 100%)",
          }} />
          {/* Central upward glow — depth from bottom */}
          <div className="absolute left-1/2 top-0 -translate-x-1/2 pointer-events-none" style={{
            width: "65%", height: "130%",
            background: `radial-gradient(ellipse at 50% 100%, hsl(var(--primary)/${isPlaying ? "0.20" : "0.11"}) 0%, transparent 70%)`,
            transition: "background 0.6s ease",
          }} />
          {/* Cover art color bleed — stronger */}
          {coverUrl && (
            <div className="absolute inset-0 pointer-events-none blur-3xl scale-110" style={{
              backgroundImage: `url(${coverUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: isPlaying ? 0.22 : 0.10,
              transition: "opacity 0.7s ease",
            }} />
          )}
          {/* Subtle grain texture for premium material feel */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.028]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "200px 200px",
          }} />
        </div>

        {/* ── Top accent line ──────────────────────────────────────────── */}
        <div className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none" style={{
          background: "linear-gradient(90deg, transparent 0%, hsl(200 80% 72%/0.55) 8%, hsl(var(--primary)/0.75) 25%, hsl(var(--primary)) 50%, hsl(var(--primary)/0.75) 75%, hsl(262 90% 82%/0.55) 92%, transparent 100%)",
          boxShadow: "0 0 24px hsl(var(--primary)/0.65), 0 0 48px hsl(var(--primary)/0.28)",
        }} />

        {/* ── Spectrum + time labels ────────────────────────────────────── */}
        <div className="relative z-10 px-3 pt-1.5">
          <SpectrumAnalyzer
            analyserRef={analyserRef}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            commentMarkers={commentMarkers}
            onSeek={player.seek}
          />
          <div className="flex justify-between mt-0.5 px-0.5">
            <span className="text-[9px] tabular-nums font-mono text-white/30 select-none">{formatTime(currentTime)}</span>
            <button
              onClick={() => setShowRemaining(v => !v)}
              title={showRemaining ? "Mostrar duración total" : "Mostrar tiempo restante"}
              className="text-[9px] tabular-nums font-mono text-white/18 hover:text-white/45 transition-colors select-none cursor-pointer"
            >
              {duration > 0
                ? showRemaining
                  ? `-${formatTime(Math.max(0, duration - currentTime))}`
                  : formatTime(duration)
                : currentTrack.duration
                  ? formatTime(currentTrack.duration)
                  : "—"
              }
            </button>
          </div>
        </div>

        {/* ── Collapsed mini bar ─────────────────────────────────────── */}
        {collapsed ? (
          <div className="relative z-10 flex items-center gap-3 px-4 py-2">
            {/* Progress line at bottom of collapsed bar */}
            {duration > 0 && (
              <div
                className="player-collapsed-progress"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            )}
            <button
              onClick={() => { resumeAudioContext(); player.togglePlay(); }}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 player-play-btn"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5 text-white" /> : <Play className="h-3.5 w-3.5 text-white ml-0.5" />}
            </button>
            <div className="flex-1 min-w-0 flex items-center gap-2.5">
              <div className="min-w-0 flex-1">
                <p className={cn("text-xs font-black truncate leading-none", isPlaying ? "text-white" : "text-white/70")}>
                  {currentTrack.title}
                </p>
                <p className="text-[10px] text-white/30 truncate leading-none mt-0.5">{currentTrack.artist}</p>
              </div>
              {/* Mini EQ bars visible in collapsed state while playing */}
              {isPlaying && (
                <div className="flex gap-[2px] items-end h-4 flex-shrink-0">
                  {[3, 5, 2, 4, 3].map((h, k) => (
                    <div key={k} className="w-[2px] rounded-full eq-bar"
                      style={{
                        height: h * 2.8,
                        background: "linear-gradient(to top, hsl(var(--primary)), hsl(262 80% 78%))",
                        animationDelay: `${k * 0.12}s`,
                      }} />
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setCollapsed(false)} title="Expandir"
              className="p-1.5 rounded-xl hover:bg-white/8 text-white/30 hover:text-white/70 transition-all active:scale-95 flex-shrink-0 border border-transparent hover:border-white/8">
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          /* ── Full expanded bar ────────────────────────────────────────── */
          <div className="relative z-10 flex items-center gap-2 px-4 py-2.5 max-w-screen-xl mx-auto">

            {/* ── LEFT: Cover + info ────────────────────────────────── */}
            <div className="flex items-center gap-3 w-[292px] min-w-0 flex-shrink-0">
              {/* Cover art */}
              <div className={cn("relative flex-shrink-0", isPlaying && "player-cover-float")}>
                {/* Ambient pulse halo */}
                {isPlaying && (
                  <div className="absolute -inset-[5px] rounded-[24px] pointer-events-none animate-pulse" style={{
                    boxShadow: "0 0 0 2px hsl(var(--primary)/0.70), 0 0 48px hsl(var(--primary)/0.65), 0 0 96px hsl(var(--primary)/0.28)",
                    animationDuration: "2.2s",
                  }} />
                )}
                {isPlaying && (
                  <>
                    {/* Inner ring — vivid primary CW fast */}
                    <div className="absolute -inset-[6px] rounded-full pointer-events-none player-ring-spin" style={{
                      background: "conic-gradient(from 0deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.75) 20%, transparent 38%, hsl(var(--primary)/0.55) 62%, transparent 80%, hsl(var(--primary)) 100%)",
                      WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), black calc(100% - 3px))",
                      mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), black calc(100% - 3px))",
                    }} />
                    {/* Middle ring — lavender CCW */}
                    <div className="absolute -inset-[13px] rounded-full pointer-events-none player-ring-spin-ccw" style={{
                      background: "conic-gradient(from 120deg, transparent 0%, hsl(262 90% 82%/0.85) 16%, transparent 40%, hsl(var(--primary)/0.50) 70%, transparent 100%)",
                      WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))",
                      mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))",
                    }} />
                    {/* Outer ring — cool cyan/teal, very slow CW */}
                    <div className="absolute -inset-[20px] rounded-full pointer-events-none player-ring-spin-slow" style={{
                      background: "conic-gradient(from 240deg, transparent 0%, hsl(200 80% 72%/0.42) 14%, transparent 34%, hsl(var(--primary)/0.24) 60%, transparent 100%)",
                      WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 1.5px), black calc(100% - 1.5px))",
                      mask: "radial-gradient(farthest-side, transparent calc(100% - 1.5px), black calc(100% - 1.5px))",
                    }} />
                  </>
                )}
                <div className={cn(
                  "relative w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center transition-all duration-500",
                  "border player-cover-vinyl player-cover-shine",
                  isPlaying
                    ? "border-primary/55 shadow-[0_0_0_1px_hsl(var(--primary)/0.22),0_10px_44px_hsl(var(--primary)/0.58),0_20px_64px_rgba(0,0,0,0.65)]"
                    : "border-white/12 shadow-[0_4px_22px_rgba(0,0,0,0.58)]"
                )}>
                  {coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverUrl} alt="" className={cn(
                      "w-full h-full object-cover transition-all duration-1000",
                      isPlaying && "scale-[1.06] player-vinyl-spin"
                    )} />
                  ) : (
                    <>
                      {/* Base dark fill */}
                      <div className="absolute inset-0" style={{ background: "hsl(262 58% 6%)" }} />
                      {/* Spinning vinyl groove texture */}
                      <div className={cn("absolute inset-0", isPlaying && "player-grooves-spin")} style={{
                        background: `
                          radial-gradient(circle at center, hsl(var(--primary)/0.28) 0%, transparent 68%),
                          repeating-radial-gradient(circle at center, transparent 0px, transparent 4px, rgba(0,0,0,0.20) 4px, rgba(0,0,0,0.20) 5px)
                        `,
                      }} />
                      {/* Outer ring groove highlight */}
                      <div className="absolute inset-[4px] rounded-full pointer-events-none" style={{
                        border: "1px solid rgba(255,255,255,0.06)",
                        boxShadow: "inset 0 0 12px rgba(0,0,0,0.5)",
                      }} />
                      {/* Static center label */}
                      <div className="relative z-[2] w-11 h-11 rounded-full flex items-center justify-center" style={{
                        background: "radial-gradient(circle at 32% 28%, hsl(var(--primary)/0.95) 0%, hsl(262 72% 28%) 52%, hsl(262 55% 11%) 100%)",
                        border: "1.5px solid hsl(var(--primary)/0.55)",
                        boxShadow: isPlaying
                          ? "0 0 0 1px hsl(var(--primary)/0.20), 0 0 28px hsl(var(--primary)/0.70), inset 0 1px 0 rgba(255,255,255,0.22)"
                          : "0 0 12px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.07)",
                      }}>
                        {/* Center hole */}
                        <div className="absolute w-3 h-3 rounded-full" style={{
                          background: "rgba(0,0,0,0.82)",
                          border: "1px solid rgba(255,255,255,0.16)",
                        }} />
                        {isPlaying ? (
                          <div className="relative z-[1] flex gap-[2px] items-end h-4">
                            {[1,2,3,4,5].map((idx) => (
                              <div key={idx} className="eq-bar rounded-full" style={{
                                width: "2px",
                                height: `${[55,100,40,75,50][idx - 1]}%`,
                                background: "linear-gradient(to top, hsl(var(--primary)/0.9), rgba(255,255,255,0.95))",
                              }} />
                            ))}
                          </div>
                        ) : (
                          <Music className="h-3.5 w-3.5 text-white/42 relative z-[1]" />
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Title + artist */}
              <div className="min-w-0 flex-1">
                {isPlaying ? (
                  <div className="flex items-center mb-1.5">
                    <div className="flex items-center gap-1.5 px-2 py-[3px] rounded-full" style={{
                      background: "linear-gradient(135deg, hsl(var(--primary)/0.28) 0%, hsl(var(--primary)/0.14) 100%)",
                      border: "1px solid hsl(var(--primary)/0.35)",
                      boxShadow: "0 0 10px hsl(var(--primary)/0.22), inset 0 1px 0 rgba(255,255,255,0.08)",
                    }}>
                      <div className="player-now-dot" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-primary drop-shadow-[0_0_5px_hsl(var(--primary)/0.7)]">
                        Reproduciendo
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mb-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/25 px-2 py-[3px] rounded-full border border-white/8">
                      En pausa
                    </span>
                  </div>
                )}
                {/* Marquee for long titles */}
                <div className="player-marquee-wrap overflow-hidden">
                  <p
                    ref={titleRef}
                    className={cn(
                      "text-[15px] font-black leading-tight transition-colors",
                      titleOverflows ? "player-marquee-inner" : "truncate",
                      isPlaying ? "text-white" : "text-white/65"
                    )}
                    title={currentTrack.title}
                  >
                    {currentTrack.title}
                    {titleOverflows && <span className="mx-6 opacity-0 select-none">·</span>}
                  </p>
                </div>
                <p className="text-[11px] text-white/35 truncate leading-tight mt-0.5 font-medium">
                  {currentTrack.artist}
                </p>
                {/* BPM + Key badges + Like button */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {currentTrack.bpm && (
                    <span className="meta-chip meta-chip-bpm">
                      {currentTrack.bpm} BPM
                    </span>
                  )}
                  {currentTrack.keySignature && (
                    <span className="meta-chip meta-chip-key">
                      {currentTrack.keySignature}
                    </span>
                  )}
                  {/* Heart / like button */}
                  <div className="relative ml-auto">
                    <button
                      onClick={toggleLike}
                      data-tooltip={isLiked ? "Quitar de favoritos (L)" : "Añadir a favoritos (L)"}
                      className={cn(
                        "p-1 rounded-lg transition-all active:scale-90 flex-shrink-0",
                        isLiked
                          ? "text-red-400 hover:text-red-300"
                          : "text-white/25 hover:text-white/60"
                      )}
                    >
                      <Heart className={cn("h-3.5 w-3.5", isLiked ? "fill-current" : "")} />
                    </button>
                    {/* Burst particles on like */}
                    {likeAnimating && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {[...Array(8)].map((_, i) => (
                          <div key={i} className="heart-burst-particle" style={{
                            animationDelay: `${i * 30}ms`,
                            transform: `rotate(${i * 45}deg)`,
                          }} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Separator ─────────────────────────────────────────── */}
            <div className="hidden lg:block w-px h-10 bg-white/12 flex-shrink-0 mx-1" />

            {/* ── CENTER: Controls ──────────────────────────────────── */}
            <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div className="flex items-center gap-1">
                <CtrlBtn onClick={player.toggleShuffle} title="Aleatorio" active={shuffle} className="hidden md:flex">
                  <Shuffle className="h-3.5 w-3.5" />
                </CtrlBtn>

                <CtrlBtn onClick={player.playPrev} disabled={!hasPrev} title="Anterior (Alt+←)">
                  <SkipBack className="h-4 w-4" />
                </CtrlBtn>

                <CtrlBtn onClick={() => player.seek(Math.max(0, currentTime - 10))} title="Retroceder 10s (←)" className="hidden sm:flex w-8 h-8">
                  <span className="flex flex-col items-center gap-px leading-none">
                    <span className="text-[8px] font-black tabular-nums opacity-90">-10</span>
                    <span className="text-[6px] font-bold tracking-wider opacity-55">SEC</span>
                  </span>
                </CtrlBtn>

                {/* ── Play / Pause ─────────────────────────────────── */}
                <div className="relative mx-2">
                  {/* Ambient pulse ring behind button */}
                  {isPlaying && (
                    <div className="absolute inset-0 rounded-full pointer-events-none animate-ping"
                      style={{ background: "hsl(var(--primary)/0.20)", animationDuration: "2.4s" }} />
                  )}
                  <button
                    onClick={() => { resumeAudioContext(); player.togglePlay(); }}
                    title={isPlaying ? "Pausar (Espacio)" : "Reproducir (Espacio)"}
                    className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 player-play-btn relative z-10"
                  >
                    {isPlaying
                      ? <Pause className="h-[22px] w-[22px] text-white" />
                      : <Play className="h-[22px] w-[22px] text-white ml-0.5" />}
                  </button>
                </div>

                <CtrlBtn onClick={() => player.seek(Math.min(duration, currentTime + 10))} title="Adelantar 10s (→)" className="hidden sm:flex w-8 h-8">
                  <span className="flex flex-col items-center gap-px leading-none">
                    <span className="text-[8px] font-black tabular-nums opacity-90">+10</span>
                    <span className="text-[6px] font-bold tracking-wider opacity-55">SEC</span>
                  </span>
                </CtrlBtn>

                <CtrlBtn onClick={player.playNext} disabled={!hasNext} title="Siguiente (Alt+→)">
                  <SkipForward className="h-4 w-4" />
                </CtrlBtn>

                <CtrlBtn onClick={player.cycleLoop} title="Modo repetición" active={loop !== "none"} className="hidden md:flex">
                  <LoopIcon mode={loop} />
                </CtrlBtn>
              </div>

              {queue.length > 1 && (
                <div className="flex items-center gap-1 text-[9px] text-white/25 tabular-nums select-none">
                  <span className="text-white/40 font-black">{queueIndex + 1}</span>
                  <span className="text-white/15">/ {queue.length}</span>
                </div>
              )}
            </div>

            {/* ── Separator ─────────────────────────────────────────── */}
            <div className="hidden lg:block w-px h-10 bg-white/12 flex-shrink-0 mx-1" />

            {/* ── RIGHT: Speed, volume, queue, collapse ─────────────── */}
            <div className="hidden sm:flex items-center gap-1.5 w-[250px] justify-end flex-shrink-0">

              {/* Sleep timer */}
              <div className="relative">
                <button
                  onClick={() => setShowSleepMenu(v => !v)}
                  data-tooltip={sleepSecondsLeft
                    ? `Parar en ${Math.floor(sleepSecondsLeft / 60)}:${String(sleepSecondsLeft % 60).padStart(2, "0")}`
                    : "Temporizador de sueño"}
                  className={cn(
                    "p-1.5 rounded-xl transition-all active:scale-95 border",
                    sleepMinutes !== null
                      ? "text-amber-400 bg-amber-400/12 border-amber-400/25 shadow-[0_0_8px_rgba(251,191,36,0.2)]"
                      : "text-white/25 border-transparent hover:text-white/60 hover:bg-white/8 hover:border-white/8"
                  )}
                >
                  <Timer className="h-3.5 w-3.5" />
                  {sleepSecondsLeft !== null && sleepSecondsLeft < 120 && (
                    <span className="absolute -top-1 -right-1 text-[7px] bg-amber-400 text-black rounded-full w-3.5 h-3.5 flex items-center justify-center font-black tabular-nums leading-none">
                      {sleepSecondsLeft}
                    </span>
                  )}
                </button>
                {showSleepMenu && (
                  <>
                    <div className="fixed inset-0 z-[55]" onClick={() => setShowSleepMenu(false)} />
                    <div className="absolute bottom-full right-0 mb-2 z-[56] rounded-xl border border-white/10 overflow-hidden shadow-2xl"
                      style={{ background: "rgba(10,10,18,0.97)", backdropFilter: "blur(24px)", minWidth: 160 }}>
                      <div className="px-3 py-2 border-b border-white/8">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Temporizador</p>
                      </div>
                      {[5, 10, 15, 30, 45, 60].map(min => (
                        <button
                          key={min}
                          onClick={() => { activateSleep(min); setShowSleepMenu(false); }}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-white/8 transition-colors text-left",
                            sleepMinutes === min ? "text-amber-400 font-black" : "text-white/70"
                          )}
                        >
                          <span>{min} minutos</span>
                          {sleepMinutes === min && sleepSecondsLeft !== null && (
                            <span className="text-amber-400 font-mono tabular-nums text-[10px]">
                              {Math.floor(sleepSecondsLeft / 60)}:{String(sleepSecondsLeft % 60).padStart(2, "0")}
                            </span>
                          )}
                        </button>
                      ))}
                      {sleepMinutes !== null && (
                        <button
                          onClick={() => { cancelSleep(); setShowSleepMenu(false); }}
                          className="w-full px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left border-t border-white/8"
                        >
                          Cancelar temporizador
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Share current track */}
              <div className="relative">
                <button
                  onClick={() => {
                    if (!currentTrack) return;
                    const url = `${window.location.origin}/discografia?song=${currentTrack.id}`;
                    navigator.clipboard.writeText(url).then(() => {
                      setShareCopied(true);
                      setTimeout(() => setShareCopied(false), 2000);
                    }).catch(() => {});
                  }}
                  data-tooltip={shareCopied ? "¡Copiado!" : "Copiar enlace de pista"}
                  className={cn(
                    "p-1.5 rounded-xl transition-all active:scale-95 border",
                    shareCopied
                      ? "text-green-400 bg-green-400/12 border-green-400/25"
                      : "text-white/25 border-transparent hover:text-white/60 hover:bg-white/8 hover:border-white/8"
                  )}
                >
                  {shareCopied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Keyboard shortcuts hint */}
              <button
                onClick={() => setShowShortcuts(v => !v)}
                data-tooltip="Atajos de teclado (Shift+?)"
                className="hidden lg:flex p-1.5 rounded-xl transition-all active:scale-95 border text-white/20 border-transparent hover:text-white/50 hover:bg-white/8 hover:border-white/8 text-[10px] font-black items-center justify-center w-6 h-6"
              >
                ?
              </button>

              {/* Speed */}
              <button onClick={cycleSpeed} data-tooltip={`Velocidad: ${playbackRate}x`}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-black tabular-nums transition-all active:scale-95 border",
                  playbackRate !== 1
                    ? "text-primary bg-primary/18 border-primary/30 shadow-[0_0_10px_hsl(var(--primary)/0.25)]"
                    : "text-white/35 border-white/10 hover:text-white/65 hover:bg-white/8 hover:border-white/18"
                )}
              >
                {playbackRate}×
              </button>

              <div className="w-px h-5 bg-white/12 mx-0.5" />

              {/* Volume icon */}
              <button
                onClick={() => player.setVolume(volume > 0 ? 0 : 0.8)}
                data-tooltip="Silenciar (M)"
                className="p-1.5 rounded-xl transition-all active:scale-95 border border-transparent text-white/50 hover:text-white/90 hover:bg-white/8 hover:border-white/8"
              >
                {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>

              {/* Volume slider */}
              <div
                className="player-vol-wrap relative flex items-center w-20 h-6 cursor-pointer group/vol"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  player.setVolume(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
                }}
              >
                <div className="w-full" style={{ padding: "8px 0" }}>
                  <div className="player-vol-track w-full relative overflow-visible" style={{ background: "rgba(255,255,255,0.10)" }}>
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-none"
                      style={{
                        width: `${volume * 100}%`,
                        background: "linear-gradient(90deg, hsl(var(--primary)/0.65), hsl(var(--primary)))",
                        boxShadow: volume > 0 ? "0 0 6px hsl(var(--primary)/0.4)" : "none",
                      }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover/vol:opacity-100 transition-opacity -translate-x-1/2 pointer-events-none border border-white/40"
                      style={{ left: `${volume * 100}%`, boxShadow: "0 0 6px rgba(255,255,255,0.8), 0 0 12px hsl(var(--primary)/0.4)" }}
                    />
                  </div>
                </div>
              </div>

              <div className="w-px h-5 bg-white/12 mx-0.5" />

              {/* Queue */}
              <button
                onClick={() => setShowQueue(v => !v)}
                data-tooltip={`Cola (Alt+Q)${queue.length > 0 ? ` · ${queue.length} pistas` : ""}`}
                className={cn(
                  "p-1.5 rounded-xl transition-all active:scale-95 relative border",
                  showQueue
                    ? "text-primary bg-primary/18 border-primary/30 shadow-[0_0_10px_hsl(var(--primary)/0.25)]"
                    : "text-white/40 border-transparent hover:text-white/80 hover:bg-white/8 hover:border-white/8"
                )}
              >
                <List className="h-4 w-4" />
                {queue.length > 1 && (
                  <span className="absolute -top-1 -right-1 text-[8px] bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center font-black tabular-nums leading-none shadow-[0_0_8px_hsl(var(--primary)/0.6)] border border-primary/50">
                    {queue.length > 9 ? "9+" : queue.length}
                  </span>
                )}
              </button>

              {/* Collapse */}
              <button
                onClick={() => setCollapsed(true)}
                data-tooltip="Minimizar"
                className="p-1.5 rounded-xl text-white/20 hover:text-white/60 hover:bg-white/8 transition-all active:scale-95 border border-transparent hover:border-white/8"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Keyboard shortcuts modal */}
      {showShortcuts && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={() => setShowShortcuts(false)} />
          <div className="fixed z-[61] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-2xl border border-white/12 shadow-2xl overflow-hidden"
            style={{ background: "rgba(10,10,18,0.98)", backdropFilter: "blur(32px)" }}>
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div>
                <p className="text-sm font-black text-white/90">Atajos de teclado</p>
                <p className="text-[11px] text-white/30 mt-0.5">Disponibles cuando el reproductor está activo</p>
              </div>
              <button onClick={() => setShowShortcuts(false)} className="p-1.5 rounded-xl hover:bg-white/8 text-white/30 hover:text-white/80 transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
              {[
                ["Espacio", "Reproducir / Pausar"],
                ["←", "Retroceder 10s"],
                ["→", "Adelantar 10s"],
                ["Alt + ←", "Pista anterior"],
                ["Alt + →", "Pista siguiente"],
                ["L", "Me gusta / Quitar"],
                ["M", "Silenciar"],
                ["Alt + Q", "Abrir cola"],
                ["Shift + ?", "Mostrar atajos"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-white/4 border border-white/6">
                  <span className="text-[11px] text-white/50">{desc}</span>
                  <kbd className="text-[10px] font-mono font-black bg-white/10 text-white/70 px-2 py-0.5 rounded-lg border border-white/15 flex-shrink-0">{key}</kbd>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-white/8 flex items-center justify-between">
              <span className="text-[10px] text-white/25">Solo funcionan fuera de campos de texto</span>
              <button onClick={() => setShowShortcuts(false)} className="text-[11px] text-primary hover:text-primary/80 font-black transition-colors">Cerrar</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
