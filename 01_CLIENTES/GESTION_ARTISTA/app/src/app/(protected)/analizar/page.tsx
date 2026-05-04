"use client";

/**
 * /analizar — Batch BPM + key-signature detector
 *
 * Loads every song and draft that has an audio file, runs
 * analyzeAudioFromUrl() in the browser one at a time, and
 * saves the results back to Supabase via server actions.
 */

import { useState, useRef, useCallback } from "react";
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

export default function AnalizarPage() {
  const [items, setItems] = useState<AnalyzeItem[]>([]);
  const [results, setResults] = useState<Record<string, ItemResult>>({});
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [skipExisting, setSkipExisting] = useState(true);
  const [showSongs, setShowSongs] = useState(true);
  const [showDrafts, setShowDrafts] = useState(true);
  const abortRef = useRef(false);

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

  async function runBatch() {
    abortRef.current = false;
    setRunning(true);

    const toProcess = items.filter(item => {
      if (skipExisting && item.currentBpm !== null && item.currentKey !== null) return false;
      return true;
    });

    // mark skipped
    items.forEach(item => {
      if (!toProcess.find(i => i.id === item.id)) {
        setResult(item.id, { status: "skipped" });
      }
    });

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

      // small breathing room between requests so we don't hammer Drive API
      if (i < toProcess.length - 1 && !abortRef.current) {
        await new Promise(r => setTimeout(r, 400));
      }
    }

    setCurrentIdx(-1);
    setRunning(false);
  }

  function stopBatch() {
    abortRef.current = true;
  }

  // ── stats ───────────────────────────────────────────────────────────────────

  const total = items.length;
  const done = Object.values(results).filter(r => r.status === "done").length;
  const errors = Object.values(results).filter(r => r.status === "error").length;
  const skipped = Object.values(results).filter(r => r.status === "skipped").length;
  const progress = total > 0 ? Math.round(((done + errors + skipped) / total) * 100) : 0;

  const songs = items.filter(i => i.kind === "song");
  const drafts = items.filter(i => i.kind === "draft");

  // ─── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6 text-yellow-400" />
          Análisis automático de BPM y tonalidad
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Analiza todas las canciones y maquetas con audio y guarda los resultados.
        </p>
      </div>

      {/* Controls card */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Skip existing toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setSkipExisting(v => !v)}
              className={cn(
                "relative w-9 h-5 rounded-full transition-colors",
                skipExisting ? "bg-primary" : "bg-secondary border border-border"
              )}
            >
              <span className={cn(
                "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                skipExisting ? "translate-x-4" : "translate-x-0.5"
              )} />
            </div>
            <span className="text-sm">
              Saltar canciones que ya tienen BPM y tonalidad
            </span>
          </label>
        </div>

        <div className="flex items-center gap-3">
          {items.length === 0 ? (
            <button
              onClick={loadItems}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {loading ? "Cargando…" : "Cargar canciones y maquetas"}
            </button>
          ) : (
            <>
              <button
                onClick={loadItems}
                disabled={loading || running}
                className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Recargar
              </button>
              {!running ? (
                <button
                  onClick={runBatch}
                  disabled={items.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-50"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Analizar todo
                  <span className="text-[11px] opacity-70">
                    ({items.filter(i => !(skipExisting && i.currentBpm && i.currentKey)).length} pendientes)
                  </span>
                </button>
              ) : (
                <button
                  onClick={stopBatch}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/15 text-red-400 border border-red-500/25 rounded-lg text-sm font-medium hover:bg-red-500/25 transition-colors"
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
              </span>
              <span className="font-medium tabular-nums">{progress}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Songs section */}
      {songs.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setShowSongs(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Music className="h-4 w-4 text-primary" />
              Canciones ({songs.length})
            </div>
            {showSongs ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </button>
          {showSongs && (
            <div className="divide-y divide-border border-t border-border">
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
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setShowDrafts(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Mic2 className="h-4 w-4 text-blue-400" />
              Maquetas ({drafts.length})
            </div>
            {showDrafts ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </button>
          {showDrafts && (
            <div className="divide-y divide-border border-t border-border">
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
        <div className="text-center py-16 text-muted-foreground text-sm">
          Cargá las canciones y maquetas para empezar.
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
  const status = result?.status ?? "pending";
  const bpm = result?.status === "done" ? result.bpm : item.currentBpm;
  const key = result?.status === "done" ? result.key : item.currentKey;

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2.5 transition-colors text-sm",
      isCurrent && "bg-blue-500/5 border-l-2 border-blue-400",
      status === "done" && "bg-green-500/3",
      status === "error" && "bg-red-500/5",
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
