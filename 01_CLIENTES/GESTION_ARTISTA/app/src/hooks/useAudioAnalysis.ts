"use client";

import { useState, useCallback } from "react";
import type { AudioAnalysisResult } from "@/lib/audio-analysis";

export type AnalysisPhase =
  | "idle"
  | "downloading"
  | "decoding"
  | "bpm"
  | "key"
  | "done"
  | "error";

interface UseAudioAnalysisReturn {
  analyzing: boolean;
  phase: string;
  result: AudioAnalysisResult | null;
  error: string | null;
  analyze: (audioUrl: string) => Promise<AudioAnalysisResult | null>;
  reset: () => void;
}

export function useAudioAnalysis(): UseAudioAnalysisReturn {
  const [analyzing, setAnalyzing] = useState(false);
  const [phase, setPhase] = useState("");
  const [result, setResult] = useState<AudioAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (audioUrl: string): Promise<AudioAnalysisResult | null> => {
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      // Dynamic import keeps the FFT code out of the initial JS bundle
      const { analyzeAudioFromUrl } = await import("@/lib/audio-analysis");

      const res = await analyzeAudioFromUrl(audioUrl, (p) => setPhase(p));
      setResult(res);
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al analizar el audio";
      setError(msg);
      return null;
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setAnalyzing(false);
    setPhase("");
    setResult(null);
    setError(null);
  }, []);

  return { analyzing, phase, result, error, analyze, reset };
}
