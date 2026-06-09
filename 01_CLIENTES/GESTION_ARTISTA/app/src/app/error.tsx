"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-black">Algo salió mal</h1>
          <p className="text-sm text-muted-foreground">
            Ocurrió un error inesperado. Podés intentar recargar la página.
          </p>
          {error.digest && (
            <p className="text-[11px] font-mono text-muted-foreground/50 mt-1">
              ref: {error.digest}
            </p>
          )}
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-sm font-medium transition-all active:scale-95"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
          <a
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm text-white font-medium transition-all active:scale-95"
          >
            <Home className="h-4 w-4" />
            Inicio
          </a>
        </div>
      </div>
    </div>
  );
}
