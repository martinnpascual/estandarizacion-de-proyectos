"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
}

interface DialogState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function useConfirm() {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({ ...options, resolve });
    });
  }, []);

  function handleConfirm() {
    dialog?.resolve(true);
    setDialog(null);
  }

  function handleCancel() {
    dialog?.resolve(false);
    setDialog(null);
  }

  useEffect(() => {
    if (!dialog) return;
    setTimeout(() => cancelBtnRef.current?.focus(), 30);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); handleCancel(); }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog]);

  const isDanger = !dialog?.variant || dialog.variant === "danger";

  const ConfirmDialog = dialog ? (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="bg-card/90 backdrop-blur-xl border border-border/60 rounded-2xl w-full max-w-sm shadow-[0_32px_80px_hsl(0_0%_0%/0.5)]"
        style={{ animation: "fadeInScale 0.14s cubic-bezier(0.16,1,0.3,1)" }}
      >
        <div className="p-5">
          <div className="flex items-start gap-3.5 mb-5">
            {isDanger ? (
              <div className="relative w-10 h-10 flex-shrink-0 mt-0.5">
                <div className="absolute inset-0 rounded-xl bg-red-500/20 blur-md" />
                <div className="relative w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
                  <Trash2 className="h-4.5 w-4.5 text-red-400" />
                </div>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className="flex-1 pt-0.5">
              <h3 className="font-semibold text-sm leading-snug">{dialog.title}</h3>
              {dialog.message && (
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {dialog.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2.5">
            <button
              ref={cancelBtnRef}
              onClick={handleCancel}
              className="flex-1 py-2.5 rounded-xl border border-border/60 text-sm font-medium hover:bg-secondary/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {dialog.cancelLabel ?? "Cancelar"}
            </button>
            <button
              onClick={handleConfirm}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2",
                isDanger
                  ? "bg-red-500/90 text-white hover:bg-red-500 shadow-[0_0_16px_hsl(0_84%_60%/0.25)] focus:ring-red-500"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_16px_hsl(var(--primary)/0.25)] focus:ring-primary"
              )}
            >
              {dialog.confirmLabel ?? "Confirmar"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.93) translateY(4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  ) : null;

  return { confirm, ConfirmDialog };
}
