"use client";

import {
  createContext, useContext, useState, useCallback,
  useEffect, useRef,
} from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

// ── Context ────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside <ToastProvider>");
  return ctx;
}

// ── Single toast ───────────────────────────────────────────────────────────

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mount animation
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, toast.duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [toast.id, toast.duration, onDismiss]);

  const META = {
    success: {
      icon: CheckCircle2,
      classes: "bg-card border-green-500/30 text-green-400",
      iconClass: "text-green-400",
    },
    error: {
      icon: AlertCircle,
      classes: "bg-card border-red-500/30 text-red-400",
      iconClass: "text-red-400",
    },
    info: {
      icon: Info,
      classes: "bg-card border-border text-foreground",
      iconClass: "text-muted-foreground",
    },
  }[toast.type];

  const Icon = META.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-2xl shadow-2xl shadow-black/30 border text-sm min-w-[260px] max-w-xs transition-all duration-300 backdrop-blur-xl",
        META.classes,
        visible
          ? "opacity-100 translate-x-0"
          : "opacity-0 translate-x-4"
      )}
    >
      <Icon className={cn("h-4 w-4 flex-shrink-0 mt-0.5", META.iconClass)} />
      <p className="flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        className="flex-shrink-0 p-0.5 rounded-xl hover:bg-secondary text-muted-foreground transition-all active:scale-95"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Provider ───────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((message: string, type: ToastType, duration = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => {
      // Max 5 toasts at a time
      const trimmed = prev.length >= 5 ? prev.slice(1) : prev;
      return [...trimmed, { id, message, type, duration }];
    });
  }, []);

  const ctx: ToastContextValue = {
    success: useCallback((m, d) => add(m, "success", d), [add]),
    error:   useCallback((m, d) => add(m, "error",   d), [add]),
    info:    useCallback((m, d) => add(m, "info",    d), [add]),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Toast stack — above the AudioPlayer (bottom-24) */}
      <div className="fixed bottom-24 right-4 z-[300] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
