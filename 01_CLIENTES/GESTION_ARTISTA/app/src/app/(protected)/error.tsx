"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ProtectedError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center gap-6">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center empty-state-icon shadow-[0_8px_32px_hsl(0_0%_0%/0.15)]">
        <AlertTriangle className="h-7 w-7 text-red-400" />
      </div>

      <div className="space-y-2 max-w-sm">
        <h2 className="text-lg font-black text-foreground">Algo salió mal</h2>
        <p className="text-sm text-muted-foreground">
          Esta sección encontró un error inesperado. Podés reintentar o volver
          al inicio.
        </p>
        {error.digest && (
          <p className="text-[11px] font-mono text-muted-foreground/40 mt-1">
            ref: {error.digest}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/60 bg-secondary/60 hover:bg-secondary text-sm text-foreground font-medium transition-all active:scale-95"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </button>
        <a
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-sm text-primary-foreground font-medium transition-all active:scale-95 btn-shine"
        >
          <Home className="h-4 w-4" />
          Dashboard
        </a>
      </div>
    </div>
  );
}
