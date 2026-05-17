"use client";

/**
 * /analizar — Batch BPM + key-signature detector
 *
 * Loads every song and draft that has an audio file, runs
 * analyzeAudioFromUrl() in the browser one at a time, and
 * saves the results back to Supabase via server actions.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { getSongsByYear } from "@/lib/actions/songs";
import { getDrafts } from "@/lib/actions/drafts";
import { updateSong } from "@/lib/actions/songs";
import { updateDraft } from "@/lib/actions/drafts";
import { analyzeAudioFromUrl } from "@/lib/audio-analysis";
import type { Song, Draft } from "@/types/database";
import { cn } from "@/lib/utils";
import {
  Music,
  Mic2,
  Play,
  Square,
  CheckCircle2,
  XCircle,
  Loader2,
  SkipForward,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Zap,
} from "lucide-react";

// ─── types ───────────────────────────────────────────────────────────────────

type ItemKind = "song" | "draft";

interface AnalyzeItem {
  id: string;
  kind: ItemKind;
  title: string;
  artist: string;
  audioUrl: string;
  currentBpm: number | null;
  currentKey: string | null;
}

type ItemStatus = "pending" | "running" | "done" | "error" | "skipped";

interface ItemResult {
  status: ItemStatus;
  bpm?: number;
  key?: string;
  phase?: string;
  error?: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function audioUrl(item: { drive_file_id?: string | null; drive_file_url?: string | null }): string | null {
  if (item.drive_file_id) return `/api/drive/stream/${item.drive_file_id}`;
  if (item.drive_file_url) return item.drive_file_url;
  return null;
}

function songToItem(s: Song): AnalyzeItem | null {
  const url = audioUrl(s);
  if (!url) return null;
  return {
    id: s.id,
    kind: "song",
    title: s.title,
    artist: s.artist_name,
    audioUrl: url,
    currentBpm: s.bpm,
    currentKey: s.key_signature,
  };
}

function draftToItem(d: Draft): AnalyzeItem | null {
  const url = audioUrl(d);
  if (!url) return null;
  return {
    id: d.id,
    kind: "draft",
    title: d.title,
    artist: d.producer ?? "Sin productor",
    audioUrl: url,
    currentBpm: d.bpm ?? null,
    currentKey: d.key_signature ?? null,
  };
}

// ─── status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, phase }: { status: ItemStatus; phase?: string }) {
  if (status === "running") return (
    <span className="flex items-center gap-1.5 text-[11px] text-blue-400">
      <Loader2 className="h-3 w-3 animate-spin" />
      {phase ?? "Analizando…"}
    </span>
  );
  if (status === "done") return (
    <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
  );
  if (status === "error") return (
    <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
  );
  if (status === "skipped") return (
    <SkipForward className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
  );
  return <span className="h-4 w-4" />;
}

// ─── main page ───────────────────────────────────────────────────────────────

const BATCH_OPTIONS = [1, 3, 5, 10] as const;

export default function AnalizarPage() {
  const [items, setItems] = useState<AnalyzeItem[]>([]);
  const [results, setResults] = useState<Record<string, ItemResult>>({});
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [skipExisting, setSkipExisting] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("analizar-skip-existing") !== "false"
      : true
  );
  const [batchSize, setBatchSize] = useState<number>(() =>
    typeof window !== "undefined"
      ? parseInt(localStorage.getItem("analizar-batch-size") ?? "3", 10) || 3
      : 3
  );
  const [showSongs, setShowSongs] = useState(true);
  const [showDrafts, setShowDrafts] = useState(true);
  const abortRef = useRef(false);

  // ── pre-load context stats (mount only, lightweight) ─────────────────────────
  const [preStats, setPreStats] = useState<{ total: number; withoutBpm: number; songs: number; drafts: number } | null>(null);
  useEffect(() => {
    Promise.all([getSongsByYear(), getDrafts()]).then(([songsRes, draftsRes]) => {
      const songs  = (songsRes.data  ?? []).filter((s) => audioUrl(s));
      const drafts = (draftsRes.data ?? []).filter((d) => audioUrl(d));
      const total  = songs.length + drafts.length;
      const withoutBpm = [...songs, ...drafts].filter((x) => !x.bpm || !x.key_signature).length;
      setPreStats({ total, withoutBpm, songs: songs.length, drafts: drafts.length });
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── load items ──────────────────────────────────────────────────────────────

  async function loadItems() {
    setLoading(true);
    setResults({});
    setCurrentIdx(-1);

    const [songsRes, draftsRes] = await Promise.all([
      getSongsByYear(),
      getDrafts(),
    ]);

    const songItems = (songsRes.data ?? [])
      .map(songToItem)
      .filter((x): x is AnalyzeItem => x !== null);

    const draftItems = (draftsRes.data ?? [])
      .map(draftToItem)
      .filter((x): x is AnalyzeItem => x !== null);

    setItems([...songItems, ...draftItems]);
    setLoading(false);
  }

  // ── update single item result ────────────────────────────────────────────────

  const setResult = useCallback((id: string, partial: Partial<ItemResult>) => {
    setResults(prev => ({
      ...prev,
      [id]: { ...(prev[id] ?? { status: "pending" }), ...partial },
    }));
  }, []);

  // ── run batch ───────────────────────────────────────────────────────────────

  async function runBatch(currentResults: Record<string, ItemResult>) {
    abortRef.current = false;
    setRunning(true);

    // Items not yet touched in previous batches
    const queue = items.filter(item => {
      const s = currentResults[item.id]?.status;
      return !s || s === "pending";
    });

    // Mark items that should be skipped (have existing data)
    queue.forEach(item => {
      if (skipExisting && item.currentBpm !== null && item.currentKey !== null) {
        setResult(item.id, { status: "skipped" });
      }
    });

    // Process only the next batchSize non-skipped items
    const toProcess = queue
      .filter(item => !(skipExisting && item.currentBpm !== null && item.currentKey !== null))
      .slice(0, batchSize);

    for (let i = 0; i < toProcess.length; i++) {
      if (abortRef.current) break;

      const item = toProcess[i];
      setCurrentIdx(items.findIndex(x => x.id === item.id));
      setResult(item.id, { status: "running", phase: "Iniciando…" });

      try {
        const result = await analyzeAudioFromUrl(
          item.audioUrl,
          (phase) => setResult(item.id, { status: "running", phase }),
        );

        // save to db
        if (item.kind === "song") {
          await updateSong(item.id, { bpm: result.bpm, key_signature: result.key });
        } else {
          await updateDraft(item.id, { bpm: result.bpm, key_signature: result.key });
        }

        setResult(item.id, { status: "done", bpm: result.bpm, key: result.key, phase: undefined });

        // update local item so the "current" value shows correctly
        setItems(prev => prev.map(x =>
          x.id === item.id ? { ...x, currentBpm: result.bpm, currentKey: result.key } : x
        ));
      } catch (err) {
        setResult(item.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Error desconocido",
          phase: undefined,
        });
      }

      if (i < toProcess.length - 1 && !abortRef.current) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    setCurrentIdx(-1);
    setRunning(false);
  }

  function stopBatch() {
    abortRef.current = true;
  }

  // ── stats ───────────────────────────────────────────────────────────────────

  const total   = items.length;
  const done    = Object.values(results).filter(r => r.status === "done").length;
  const errors  = Object.values(results).filter(r => r.status === "error").length;
  const skipped = Object.values(results).filter(r => r.status === "skipped").length;
  const progress = total > 0 ? Math.round(((done + errors + skipped) / total) * 100) : 0;

  // Items still pending (not processed, not skippable)
  const remaining = items.filter(item => {
    const s = results[item.id]?.status;
    if (s === "done" || s === "error" || s === "skipped") return false;
    if (skipExisting && item.currentBpm !== null && item.currentKey !== null) return false;
    return true;
  }).length;

  const hasStarted = Object.keys(results).length > 0;

  const songs  = items.filter(i => i.kind === "song");
  const drafts = items.filter(i => i.kind === "draft");

  // Persist settings
  useEffect(() => { localStorage.setItem("analizar-skip-existing", String(skipExisting)); }, [skipExisting]);
  useEffect(() => { localStorage.setItem("analizar-batch-size", String(batchSize)); }, [batchSize]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // L → load items (when none loaded yet)
      if ((e.key === "l" || e.key === "L") && items.length === 0 && !loading) {
        e.preventDefault(); loadItems(); return;
      }
      // R → reload (when items are loaded and not running)
      if ((e.key === "r" || e.key === "R") && items.length > 0 && !running) {
        e.preventDefault(); loadItems(); return;
      }
      // A or Space → start/continue analysis
      if ((e.key === "a" || e.key === "A" || e.key === " ") && items.length > 0 && !running && remaining > 0) {
        e.preventDefault(); runBatch(results); return;
      }
      // S → stop running batch
      if ((e.key === "s" || e.key === "S") && running) {
        e.preventDefault(); stopBatch(); return;
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, loading, running, remaining, results]);

  // ─── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="card-premium relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/8 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-500/6 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/30 to-yellow-600/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <Zap className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight gradient-text">Análisis de BPM y tonalidad</h1>
              <p className="text-muted-foreground text-xs mt-0.5">
                Detectá el BPM y la tonalidad de tus canciones y maquetas automáticamente
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/60 hidden sm:flex items-center gap-2 flex-shrink-0">
            {items.length === 0 ? (
              <>
                <kbd className="text-[9px] bg-secondary border border-border/60 px-1 py-0.5 rounded font-mono">L</kbd>
                cargar
              </>
            ) : running ? (
              <>
                <kbd className="text-[9px] bg-secondary border border-border/60 px-1 py-0.5 rounded font-mono">S</kbd>
                detener
              </>
            ) : (
              <>
                <kbd className="text-[9px] bg-secondary border border-border/60 px-1 py-0.5 rounded font-mono">A</kbd>
                analizar ·
                <kbd className="text-[9px] bg-secondary border border-border/60 px-1 py-0.5 rounded font-mono">R</kbd>
                recargar
              </>
            )}
          </p>
        </div>
      </div>

      {/* Controls card */}
      <div className="card-premium rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {/* Skip existing toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setSkipExisting(v => !v)}
              className={cn(
                "relative w-9 h-5 rounded-full transition-colors",
                skipExisting ? "bg-primary" : "bg-secondary border border-border/60"
              )}
            >
              <span className={cn(
                "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                skipExisting ? "translate-x-4" : "translate-x-0.5"
              )} />
            </div>
            <span className="text-sm">Saltar las que ya tienen BPM y tonalidad</span>
          </label>

          {/* Batch size selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Tanda de</span>
            <div className="flex gap-1">
              {BATCH_OPTIONS.map(n => (
                <button
                  key={n}
                  onClick={() => setBatchSize(n)}
                  disabled={running}
                  className={cn(
                    "w-8 h-7 rounded-xl text-xs font-medium transition-all active:scale-95",
                    batchSize === n
                      ? "bg-primary text-primary-foreground font-black shadow-[0_0_10px_hsl(var(--primary)/0.4)]"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">canciones</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {items.length === 0 ? (
            <button
              onClick={loadItems}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-black hover:bg-primary/80 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {loading ? "Cargando…" : "Cargar canciones y maquetas"}
            </button>
          ) : (
            <>
              <button
                onClick={loadItems}
                disabled={loading || running}
                className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border/60 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Recargar
              </button>
              {!running ? (
                <>
                  <button
                    onClick={() => runBatch(results)}
                    disabled={remaining === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-black hover:bg-primary/80 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    {remaining === 0
                      ? "✓ Todo analizado"
                      : hasStarted
                      ? "Continuar"
                      : "Analizar"}
                    {remaining > 0 && (
                      <span className="text-[11px] opacity-70">
                        ({Math.min(batchSize, remaining)} ahora · {remaining} restantes)
                      </span>
                    )}
                  </button>
                  {errors > 0 && (
                    <button
                      onClick={() => {
                        setResults(prev => {
                          const next = { ...prev };
                          Object.entries(next).forEach(([id, r]) => {
                            if (r.status === "error") delete next[id];
                          });
                          return next;
                        });
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm hover:bg-red-500/20 transition-all active:scale-95"
                      title="Reintentar las que fallaron"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Reintentar ({errors})
                    </button>
                  )}
                </>

              ) : (
                <button
                  onClick={stopBatch}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/15 text-red-400 border border-red-500/25 rounded-xl text-sm font-medium hover:bg-red-500/25 transition-all active:scale-95"
                >
                  <Square className="h-4 w-4 fill-current" />
                  Detener
                </button>
              )}
            </>
          )}
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {done} completadas · {skipped} saltadas · {errors} errores
                {remaining > 0 && !running && (
                  <span className="ml-2 text-yellow-500/80">· {remaining} pendientes</span>
                )}
              </span>
              <span className="font-medium tabular-nums">{progress}%</span>
            </div>
            <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, boxShadow: progress > 0 ? "0 0 8px hsl(var(--primary)/0.5)" : undefined }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Success banner */}
      {hasStarted && remaining === 0 && !running && total > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-green-500/10 border border-green-500/25 text-green-400">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-black">¡Análisis completo!</span>
            {" "}
            <span className="text-green-400/80">
              {done > 0 && `${done} analizadas`}
              {skipped > 0 && ` · ${skipped} saltadas`}
              {errors > 0 && ` · ${errors} con error`}
            </span>
          </div>
        </div>
      )}

      {/* Songs section */}
      {songs.length > 0 && (
        <div className="card-premium rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowSongs(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-2 text-sm font-black">
              <Music className="h-4 w-4 text-primary drop-shadow-[0_0_4px_currentColor]" />
              Canciones ({songs.length})
            </div>
            {showSongs ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </button>
          {showSongs && (
            <div className="divide-y divide-border/50 border-t border-border/50">
              {songs.map((item, idx) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  result={results[item.id]}
                  isCurrent={items.findIndex(x => x.id === item.id) === currentIdx}
                  idx={idx + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Drafts section */}
      {drafts.length > 0 && (
        <div className="card-premium rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowDrafts(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-2 text-sm font-black">
              <Mic2 className="h-4 w-4 text-blue-400 drop-shadow-[0_0_4px_currentColor]" />
              Maquetas ({drafts.length})
            </div>
            {showDrafts ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </button>
          {showDrafts && (
            <div className="divide-y divide-border/50 border-t border-border/50">
              {drafts.map((item, idx) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  result={results[item.id]}
                  isCurrent={items.findIndex(x => x.id === item.id) === currentIdx}
                  idx={idx + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {items.length === 0 && !loading && (
        <div className="card-premium rounded-2xl px-6 py-10 text-center space-y-3">
          {preStats ? (
            <>
              <div className="flex items-center justify-center gap-6 flex-wrap">
                <div className="text-center">
                  <p className="text-2xl font-black tabular-nums text-foreground">{preStats.total}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">con audio</p>
                </div>
                <div className="w-px h-8 bg-border/60" />
                <div className="text-center">
                  <p className={`text-2xl font-black tabular-nums ${preStats.withoutBpm > 0 ? "text-yellow-400" : "text-green-400"}`}>
                    {preStats.withoutBpm}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">sin BPM detectado</p>
                </div>
                <div className="w-px h-8 bg-border/60" />
                <div className="text-center">
                  <p className="text-2xl font-black tabular-nums text-foreground">{preStats.songs}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">canciones</p>
                </div>
                <div className="w-px h-8 bg-border/60" />
                <div className="text-center">
                  <p className="text-2xl font-black tabular-nums text-foreground">{preStats.drafts}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">maquetas</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {preStats.withoutBpm === 0
                  ? "✓ Todas las canciones y maquetas ya tienen BPM y tonalidad detectados."
                  : `Cargá para analizar las ${preStats.withoutBpm} que aún no tienen BPM.`}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">Cargá las canciones y maquetas para empezar.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── item row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  result,
  isCurrent,
  idx,
}: {
  item: AnalyzeItem;
  result?: ItemResult;
  isCurrent: boolean;
  idx: number;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const status = result?.status ?? "pending";

  // Auto-scroll into view when this item becomes the active one
  useEffect(() => {
    if (isCurrent && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isCurrent]);
  const bpm = result?.status === "done" ? result.bpm : item.currentBpm;
  const key = result?.status === "done" ? result.key : item.currentKey;

  return (
    <div ref={rowRef} className={cn(
      "row-interactive flex items-center gap-3 px-4 py-2.5 transition-all duration-300 text-sm",
      isCurrent && "bg-blue-500/8 border-l-2 border-blue-400 shadow-[inset_4px_0_12px_hsl(220_80%_60%/0.06)]",
      status === "done" && !isCurrent && "bg-green-500/4",
      status === "error" && !isCurrent && "bg-red-500/5",
    )}>
      <span className="text-xs text-muted-foreground/50 w-5 text-right flex-shrink-0 tabular-nums">{idx}</span>

      <div className="flex-1 min-w-0">
        <p className="truncate font-medium">{item.title}</p>
        <p className="text-xs text-muted-foreground truncate">{item.artist}</p>
      </div>

      {/* Current values */}
      <div className="flex items-center gap-3 flex-shrink-0 text-xs">
        {bpm !== null && bpm !== undefined ? (
          <span className={cn(
            "tabular-nums font-mono",
            status === "done" ? "text-green-400" : "text-muted-foreground"
          )}>
            {bpm} BPM
          </span>
        ) : (
          <span className="text-muted-foreground/30 font-mono">— BPM</span>
        )}
        {key ? (
          <span className={cn(
            "w-20 text-center",
            status === "done" ? "text-green-400" : "text-muted-foreground"
          )}>
            {key}
          </span>
        ) : (
          <span className="w-20 text-center text-muted-foreground/30">— key</span>
        )}
      </div>

      {/* Status */}
      <div className="w-28 flex items-center justify-end flex-shrink-0">
        {status === "error" ? (
          <span className="text-[10px] text-red-400 truncate max-w-[110px]" title={result?.error}>
            {result?.error}
          </span>
        ) : (
          <StatusBadge status={status} phase={result?.phase} />
        )}
      </div>
    </div>
  );
}
