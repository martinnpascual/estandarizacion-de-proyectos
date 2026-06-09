"use client";
import Link from "next/link";
import { Music, Home, ArrowLeft } from "lucide-react";

export default function ProtectedNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center gap-8">
      <div className="relative">
        <p className="text-[96px] font-black leading-none text-foreground/5 select-none">404</p>
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center empty-state-icon"
            style={{
              background: "linear-gradient(135deg, hsl(var(--section-hsl, 262 80% 62%) / 0.22), hsl(var(--section-hsl, 262 80% 62%) / 0.08))",
              border: "1px solid hsl(var(--section-hsl, 262 80% 62%) / 0.25)",
              boxShadow: "0 8px 32px hsl(0 0% 0% / 0.15)"
            }}
          >
            <Music className="h-8 w-8" style={{ color: "hsl(var(--section-hsl, 262 80% 62%))" }} />
          </div>
        </div>
      </div>

      <div className="space-y-2 max-w-xs">
        <h2 className="text-xl font-black text-foreground">Página no encontrada</h2>
        <p className="text-sm text-muted-foreground">
          Esta sección no existe o fue movida.
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-sm text-primary-foreground font-medium transition-all active:scale-95 btn-shine shadow-[0_0_20px_hsl(var(--primary)/0.25)]"
        >
          <Home className="h-4 w-4" />
          Dashboard
        </Link>
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border/60 bg-secondary/60 hover:bg-secondary text-sm text-foreground font-medium transition-all active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
      </div>
    </div>
  );
}
