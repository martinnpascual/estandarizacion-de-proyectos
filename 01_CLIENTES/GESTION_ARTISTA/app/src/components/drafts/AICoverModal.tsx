"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  RefreshCw,
  X,
  Loader2,
  Upload,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Draft } from "@/types/database";

interface AICoverModalProps {
  draft: Draft;
  onClose: () => void;
  onSaved: (updatedDraft: Draft) => void;
}

function defaultPrompt(_title: string): string {
  return `Album cover art for an urban music track. Dark aesthetic, abstract artistic, cinematic lighting, dramatic atmosphere, professional music artwork. No text, no letters, no words, no numbers in the image. Square format.`;
}

export default function AICoverModal({ draft, onClose, onSaved }: AICoverModalProps) {
  const [prompt, setPrompt] = useState(defaultPrompt(draft.title));
  const [showPrompt, setShowPrompt] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState("Generando portada…");
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    handleGenerate();
    return () => { if (retryTimer.current) clearTimeout(retryTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerate() {
    if (generating) return;
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    setGenerating(true);
    setError(null);
    setImageUrl(null);
    setLoadingMsg("Generando portada…");

    try {
      const res = await fetch("/api/covers/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      // Cold start: model is loading, auto-retry after estimated time
      if (res.status === 503 && data.loading) {
        const wait = Math.min(Math.ceil(data.estimatedTime ?? 20), 30);
        setLoadingMsg(`Modelo calentando… reintentando en ${wait}s`);
        setGenerating(false);
        retryTimer.current = setTimeout(() => handleGenerate(), wait * 1000);
        return;
      }

      if (!res.ok || !data.imageUrl) {
        setError(data.error ?? "No se pudo generar la imagen");
        return;
      }

      setImageUrl(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!imageUrl) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/covers/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, draftId: draft.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.draft) {
        setError(data.error ?? "Error al guardar la portada");
        return;
      }
      onSaved(data.draft);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-[hsl(var(--card))] border border-border/60 rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/30 to-violet-700/20 border border-violet-500/25 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-foreground">Portada con IA</h2>
              <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">{draft.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Image preview */}
        <div className="mx-5 mb-4">
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-border/50 bg-gradient-to-br from-violet-950/30 to-zinc-900/60 flex items-center justify-center">

            {/* Loading / warm-up spinner */}
            {(generating || (!imageUrl && !error)) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-gradient-to-br from-violet-950/30 to-zinc-900/60">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-violet-400 animate-pulse" />
                  </div>
                  <div className="absolute -inset-1 rounded-2xl border border-violet-500/20 animate-ping" />
                </div>
                <p className="text-xs text-muted-foreground text-center px-4">{loadingMsg}</p>
              </div>
            )}

            {/* Error state */}
            {error && !generating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
                <AlertCircle className="h-8 w-8 text-red-400/70" />
                <p className="text-xs text-red-400">{error}</p>
                <button
                  onClick={handleGenerate}
                  className="mt-1 text-xs text-violet-400 hover:text-violet-300 underline"
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* Generated image — already hosted in Supabase, loads instantly */}
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={`Portada para "${draft.title}"`}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>

        {/* Collapsible prompt editor */}
        <div className="mx-5 mb-4">
          <button
            onClick={() => setShowPrompt((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-all"
          >
            {showPrompt ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Editar prompt
          </button>
          {showPrompt && (
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="mt-2 w-full text-[11px] bg-secondary/40 border border-border/50 rounded-xl px-3 py-2 text-foreground/80 placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-500/40 resize-none"
              placeholder="Describí el estilo de la portada…"
            />
          )}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating || saving}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all active:scale-95 flex-1",
              "border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/60",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {generating
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <RefreshCw className="h-3.5 w-3.5" />}
            {imageUrl ? "Regenerar" : "Generar"}
          </button>

          <button
            onClick={handleSave}
            disabled={!imageUrl || saving || generating}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black transition-all active:scale-95 flex-1",
              "bg-violet-600 text-white hover:bg-violet-500",
              "shadow-[0_0_20px_hsl(263_60%_50%/0.3)]",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            )}
          >
            {saving
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Upload className="h-3.5 w-3.5" />}
            Guardar
          </button>
        </div>

      </div>
    </div>
  );
}
