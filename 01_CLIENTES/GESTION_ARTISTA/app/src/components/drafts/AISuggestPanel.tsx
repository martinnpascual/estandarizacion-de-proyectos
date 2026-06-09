"use client";

/**
 * AISuggestPanel — Panel colapsable con sugerencias IA para una maqueta.
 * Usa /api/ai/suggest (Pollinations.ai, gratis, sin API key).
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, RefreshCw, ChevronRight, Lightbulb } from "lucide-react";
import type { Draft } from "@/types/database";

interface AISuggestPanelProps {
  draft: Draft;
}

type State = "idle" | "loading" | "done" | "error";

export default function AISuggestPanel({ draft }: AISuggestPanelProps) {
  const [state, setState] = useState<State>("idle");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          status: draft.status,
          bpm: draft.bpm,
          key: draft.key_signature,
          producer: draft.producer,
          notes: draft.notes,
          monthCreated: draft.month_created,
        }),
      });

      if (!res.ok) throw new Error("Error al conectar con la IA");
      const data = await res.json();

      if (!data.suggestions || data.suggestions.length === 0) {
        throw new Error("Sin sugerencias");
      }

      setSuggestions(data.suggestions);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setState("error");
    }
  }, [draft]);

  // Auto-fetch on first render
  const [didFetch, setDidFetch] = useState(false);
  if (!didFetch) {
    setDidFetch(true);
    fetchSuggestions();
  }

  return (
    <div
      className="px-4 py-3"
      style={{
        background: "linear-gradient(135deg, hsl(var(--section-hsl, 270 60% 50%) / 0.06) 0%, transparent 60%)",
        borderTop: "1px solid hsl(var(--section-hsl, 270 60% 50%) / 0.15)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: "hsl(var(--section-hsl, 270 60% 50%) / 0.18)" }}
          >
            <Sparkles className="h-3 w-3" style={{ color: "hsl(var(--section-hsl, 270 60% 50%))" }} />
          </div>
          <span className="text-[11px] font-bold text-white/70 tracking-wide uppercase">
            Sugerencias IA
          </span>
        </div>
        {state === "done" && (
          <button
            onClick={fetchSuggestions}
            title="Regenerar sugerencias"
            className="p-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/8 transition-all active:scale-90"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Loading */}
      <AnimatePresence mode="wait">
        {state === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 py-2"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin text-white/30" />
            <span className="text-[11px] text-white/35">Analizando la maqueta…</span>
          </motion.div>
        )}

        {state === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 py-1"
          >
            <span className="text-[11px] text-red-400/70">{error}</span>
            <button
              onClick={fetchSuggestions}
              className="text-[11px] text-white/50 hover:text-white/80 underline transition-colors"
            >
              Reintentar
            </button>
          </motion.div>
        )}

        {state === "done" && suggestions.length > 0 && (
          <motion.ul
            key="suggestions"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-1.5"
          >
            {suggestions.map((s, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-2"
              >
                <div
                  className="flex-shrink-0 w-4 h-4 rounded-md flex items-center justify-center mt-0.5"
                  style={{ background: "hsl(var(--section-hsl, 270 60% 50%) / 0.14)" }}
                >
                  <ChevronRight className="h-2.5 w-2.5" style={{ color: "hsl(var(--section-hsl, 270 60% 50%) / 0.8)" }} />
                </div>
                <span className="text-[12px] text-white/65 leading-relaxed">{s}</span>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      {/* Idle (shouldn't show — auto-fetches) */}
      {state === "idle" && (
        <button
          onClick={fetchSuggestions}
          className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 transition-colors"
        >
          <Lightbulb className="h-3 w-3" />
          Generar sugerencias
        </button>
      )}
    </div>
  );
}
