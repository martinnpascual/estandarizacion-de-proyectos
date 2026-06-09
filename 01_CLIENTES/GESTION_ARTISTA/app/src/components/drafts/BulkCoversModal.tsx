"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, X, Loader2, CheckCircle2, AlertCircle, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDraftsWithoutCovers, updateDraftCoverArt } from "@/lib/actions/drafts";

interface BulkCoversModalProps {
  onClose: () => void;
  onDone: (updatedIds: string[]) => void;
}

type ItemStatus = "pending" | "generating" | "done" | "error";

interface DraftItem {
  id: string;
  title: string;
  status: ItemStatus;
  error?: string;
  coverUrl?: string;
}

const CONCURRENCY = 1;

function buildPrompt(title: string): string {
  return `Album cover art for an urban music track titled "${title}". Dark aesthetic, abstract artistic, cinematic lighting, dramatic atmosphere, professional music artwork. No text, no letters, no words, no numbers. Square format.`;
}

export default function BulkCoversModal({ onClose, onDone }: BulkCoversModalProps) {
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const pausedRef = useRef(false);
  const abortRef = useRef(false);
  const updatedIds = useRef<string[]>([]);

  useEffect(() => {
    getDraftsWithoutCovers().then(({ data, error }) => {
      if (error || !data) return;
      setDrafts(data.map((d) => ({ ...d, status: "pending" })));
      setLoading(false);
    });
  }, []);

  const completed = drafts.filter((d) => d.status === "done").length;
  const errors = drafts.filter((d) => d.status === "error").length;
  const total = drafts.length;
  const progress = total > 0 ? Math.round(((completed + errors) / total) * 100) : 0;

  async function processDraft(draft: DraftItem): Promise<void> {
    setDrafts((prev) =>
      prev.map((d) => (d.id === draft.id ? { ...d, status: "generating" } : d))
    );

    try {
      // 1. Get Pollinations URL from our API
      const genRes = await fetch("/api/covers/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: buildPrompt(draft.title) }),
      });
      const genData = await genRes.json();
      if (!genRes.ok || !genData.imageUrl) throw new Error(genData.error ?? "Sin URL");

      const imageUrl: string = genData.imageUrl;

      // 2. Fetch the image binary from Pollinations (retry up to 4 times with backoff)
      let blob: Blob | null = null;
      const MAX_RETRIES = 4;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          // Exponential backoff: 3s, 6s, 12s, 24s
          await new Promise((r) => setTimeout(r, 3000 * Math.pow(2, attempt - 1)));
        }
        const imgRes = await fetch(imageUrl);
        if (imgRes.ok) {
          blob = await imgRes.blob();
          break;
        }
        if (attempt === MAX_RETRIES) {
          throw new Error(`Imagen no disponible (${imgRes.status}) tras ${MAX_RETRIES + 1} intentos`);
        }
      }
      if (!blob) throw new Error("No se pudo obtener la imagen");

      // 3. Upload to Drive
      const formData = new FormData();
      const fileName = `cover-${draft.id}-${Date.now()}.jpg`;
      formData.append("file", new File([blob!], fileName, { type: "image/jpeg" }));
      const uploadRes = await fetch("/api/drive/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error ?? "Error al subir a Drive");

      // 4. Save to DB
      const { error: dbError } = await updateDraftCoverArt(draft.id, uploadData.url);
      if (dbError) throw new Error(dbError);

      updatedIds.current.push(draft.id);
      setDrafts((prev) =>
        prev.map((d) =>
          d.id === draft.id ? { ...d, status: "done", coverUrl: uploadData.url } : d
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setDrafts((prev) =>
        prev.map((d) => (d.id === draft.id ? { ...d, status: "error", error: msg } : d))
      );
    }
  }

  async function startGeneration() {
    setRunning(true);
    setPaused(false);
    pausedRef.current = false;
    abortRef.current = false;

    const pending = drafts.filter((d) => d.status === "pending" || d.status === "error");
    // Reset errors to pending
    setDrafts((prev) =>
      prev.map((d) => (d.status === "error" ? { ...d, status: "pending", error: undefined } : d))
    );

    let idx = 0;
    const queue = [...pending];

    async function runWorker() {
      while (idx < queue.length) {
        if (abortRef.current) break;
        // Wait while paused
        while (pausedRef.current) {
          await new Promise((r) => setTimeout(r, 300));
          if (abortRef.current) return;
        }
        const item = queue[idx++];
        if (!item) break;
        await processDraft(item);
      }
    }

    const workers = Array.from({ length: CONCURRENCY }, runWorker);
    await Promise.all(workers);

    if (!abortRef.current) {
      setRunning(false);
      setDone(true);
    }
  }

  function togglePause() {
    const next = !paused;
    setPaused(next);
    pausedRef.current = next;
  }

  function handleClose() {
    abortRef.current = true;
    onDone(updatedIds.current);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !running) handleClose(); }}
    >
      <div className="w-full max-w-md bg-[hsl(var(--card))] border border-border/60 rounded-3xl shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/30 to-violet-700/20 border border-violet-500/25 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-foreground">Generar todas las portadas</h2>
              <p className="text-[11px] text-muted-foreground">
                {loading ? "Cargando…" : `${total} maquetas sin portada`}
              </p>
            </div>
          </div>
          {!running && (
            <button onClick={handleClose} className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-all">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        {(running || done) && (
          <div className="px-5 pb-3 flex-shrink-0">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
              <span>
                {done ? "¡Listo!" : paused ? "Pausado" : "Generando…"}
                <span className="ml-2 text-foreground font-black tabular-nums">
                  {completed}/{total}
                </span>
                {errors > 0 && <span className="ml-1.5 text-red-400">({errors} errores)</span>}
              </span>
              <span className="font-black text-violet-400">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  done ? "bg-green-500" : "bg-violet-500"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* List */}
        <div className="overflow-y-auto flex-1 px-3 pb-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-0.5">
              {drafts.map((d) => (
                <div
                  key={d.id}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] transition-colors",
                    d.status === "generating" && "bg-violet-500/10",
                    d.status === "done" && "opacity-50",
                    d.status === "error" && "bg-red-500/8"
                  )}
                >
                  {/* Status icon */}
                  <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                    {d.status === "pending" && <div className="w-1.5 h-1.5 rounded-full bg-border" />}
                    {d.status === "generating" && <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />}
                    {d.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />}
                    {d.status === "error" && <AlertCircle className="h-3.5 w-3.5 text-red-400" />}
                  </div>

                  {/* Cover preview (when done) */}
                  {d.status === "done" && d.coverUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={d.coverUrl} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
                  )}

                  <span className={cn(
                    "flex-1 truncate",
                    d.status === "generating" ? "text-violet-300 font-medium" : "text-foreground/70"
                  )}>
                    {d.title}
                  </span>

                  {d.status === "error" && d.error && (
                    <span className="text-[10px] text-red-400 truncate max-w-[120px]">{d.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 pb-5 pt-3 flex-shrink-0 border-t border-border/40 flex gap-2">
          {!running && !done && !loading && (
            <>
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={startGeneration}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-black hover:bg-violet-500 transition-all active:scale-95 shadow-[0_0_20px_hsl(263_60%_50%/0.3)]"
              >
                <Sparkles className="h-4 w-4" />
                Generar {total} portadas
              </button>
            </>
          )}

          {running && (
            <>
              <button
                onClick={togglePause}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border/60 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all active:scale-95"
              >
                {paused ? <><Play className="h-4 w-4" /> Continuar</> : <><Pause className="h-4 w-4" /> Pausar</>}
              </button>
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-red-500/30 text-sm text-red-400 hover:bg-red-500/10 transition-all active:scale-95"
              >
                Detener
              </button>
            </>
          )}

          {done && (
            <button
              onClick={handleClose}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-black hover:bg-green-500 transition-all active:scale-95"
            >
              <CheckCircle2 className="h-4 w-4" />
              ¡Listo! Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
