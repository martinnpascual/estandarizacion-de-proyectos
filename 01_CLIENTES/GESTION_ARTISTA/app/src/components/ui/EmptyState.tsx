"use client";

import { type LucideIcon, Search, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  size?: "sm" | "md" | "lg";
  iconColor?: string;
  iconBg?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  size = "md",
  iconColor = "text-muted-foreground/40",
  iconBg = "bg-secondary/60",
  className,
}: EmptyStateProps) {
  const sizes = {
    sm: { wrapper: "py-12", iconWrap: "w-12 h-12 rounded-xl", iconSize: "h-5 w-5", title: "text-sm font-black", desc: "text-xs" },
    md: { wrapper: "py-20", iconWrap: "w-16 h-16 rounded-2xl", iconSize: "h-7 w-7", title: "text-base font-black", desc: "text-sm" },
    lg: { wrapper: "py-28", iconWrap: "w-20 h-20 rounded-2xl", iconSize: "h-9 w-9", title: "text-lg font-black", desc: "text-sm" },
  }[size];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn("flex flex-col items-center justify-center text-center", sizes.wrapper, className)}
    >
      <motion.div
        initial={{ scale: 0.75, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.05, type: "spring", stiffness: 260, damping: 20 }}
        className="relative mb-4 flex items-center justify-center"
      >
        {/* Ambient glow */}
        <div className={cn("absolute inset-0 rounded-2xl blur-xl opacity-30 scale-150", iconBg)} />
        <div className={cn("relative flex items-center justify-center", sizes.iconWrap, iconBg,
          "border border-white/5 shadow-[0_4px_20px_hsl(0_0%_0%/0.15)]")}>
          <Icon className={cn(sizes.iconSize, iconColor)} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="space-y-1.5 mb-6"
      >
        <p className={cn("text-foreground", sizes.title)}>{title}</p>
        {description && (
          <p className={cn("text-muted-foreground/70 max-w-xs mx-auto leading-relaxed", sizes.desc)}>
            {description}
          </p>
        )}
      </motion.div>

      {(action || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="flex items-center gap-3 flex-wrap justify-center"
        >
          {action && (
            action.href
              ? <Link href={action.href} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] active:scale-95">{action.label}</Link>
              : <button onClick={action.onClick} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] active:scale-95">{action.label}</button>
          )}
          {secondaryAction && (
            secondaryAction.href
              ? <Link href={secondaryAction.href} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all active:scale-95">{secondaryAction.label}</Link>
              : <button onClick={secondaryAction.onClick} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all active:scale-95">{secondaryAction.label}</button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

export function EmptySearch({ query, onClear }: { query: string; onClear?: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title={`Sin resultados para "${query}"`}
      description="Probá con otras palabras o revisá la ortografía."
      action={onClear ? { label: "Limpiar búsqueda", onClick: onClear } : undefined}
      size="sm"
    />
  );
}

export function EmptyError({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Algo salió mal"
      description="No pudimos cargar el contenido. Intentá de nuevo."
      action={onRetry ? { label: "Reintentar", onClick: onRetry } : undefined}
      iconColor="text-red-400/60"
      iconBg="bg-red-500/10"
      size="sm"
    />
  );
}
