"use client";

/**
 * Skeletons — Shimmer sweep placeholders (premium feel vs animate-pulse)
 * Usa la clase .skeleton de globals.css para el efecto de barrido.
 */
import { cn } from "@/lib/utils";

// ─── Base skeleton ─────────────────────────────────────────────────────────────
function Sk({ className, delay = 0, style }: { className?: string; delay?: number; style?: React.CSSProperties }) {
  return (
    <div
      className={cn("skeleton", className)}
      style={{ ...(delay ? { animationDelay: `${delay}ms` } : {}), ...style }}
    />
  );
}

// ─── Stat Card Skeleton ───────────────────────────────────────────────────────
export function StatCardSkeleton() {
  return (
    <div className="card-premium rounded-2xl p-4 pb-5 space-y-3">
      <div className="flex items-center gap-2.5">
        <Sk className="h-8 w-8 rounded-xl" />
        <Sk className="h-3 w-24" delay={40} />
      </div>
      <Sk className="h-8 w-16" delay={80} />
    </div>
  );
}

// ─── Chart Skeleton ───────────────────────────────────────────────────────────
export function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className={cn("card-premium rounded-2xl p-5", height)}>
      <div className="flex items-center justify-between mb-4">
        <Sk className="h-4 w-40" />
        <Sk className="h-7 w-24 rounded-full" delay={40} />
      </div>
      <div className="h-[calc(100%-3.5rem)] flex items-end gap-1.5 pb-6 px-2">
        {[55, 40, 70, 50, 85, 62, 95, 72, 88, 45, 68, 58].map((h, i) => (
          <Sk
            key={i}
            className="flex-1 rounded-t"
            delay={i * 30}
            style={{ height: `${h}%` } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Table Row Skeleton ───────────────────────────────────────────────────────
export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
      <Sk className="h-9 w-9 rounded-full shrink-0" />
      {Array.from({ length: cols - 1 }).map((_, i) => (
        <Sk key={i} className={cn("h-4", i === 0 ? "w-40 flex-1" : "w-20")} delay={i * 25} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="card-premium rounded-2xl overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} cols={cols} />
      ))}
    </div>
  );
}

// ─── Card Grid Skeleton ───────────────────────────────────────────────────────
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-premium rounded-2xl p-4 space-y-3">
          <Sk className="h-32 w-full rounded-xl" delay={i * 20} />
          <Sk className="h-4 w-3/4" delay={i * 20 + 30} />
          <Sk className="h-3 w-1/2" delay={i * 20 + 60} />
          <div className="flex gap-2">
            <Sk className="h-6 w-16 rounded-full" delay={i * 20 + 80} />
            <Sk className="h-6 w-16 rounded-full" delay={i * 20 + 100} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Kanban Board Skeleton ────────────────────────────────────────────────────
export function KanbanSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: columns }).map((_, col) => (
        <div key={col} className="shrink-0 w-64 space-y-3">
          <Sk className="h-7 w-32 rounded-xl" delay={col * 40} />
          {Array.from({ length: 2 + (col % 2) }).map((_, card) => (
            <div key={card} className="card-premium rounded-2xl p-3 space-y-2">
              <Sk className="h-4 w-3/4" delay={col * 40 + card * 30} />
              <Sk className="h-3 w-1/2" delay={col * 40 + card * 30 + 20} />
              <Sk className="h-3 w-2/3" delay={col * 40 + card * 30 + 40} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Song Row Skeleton ────────────────────────────────────────────────────────
export function SongRowSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border/40 last:border-0">
      <Sk className="h-4 w-4 rounded" delay={delay} />
      <Sk className="h-9 w-9 rounded-xl flex-shrink-0" delay={delay + 20} />
      <div className="flex-1 space-y-1.5">
        <Sk className="h-4 w-40" delay={delay + 30} />
        <Sk className="h-3 w-28" delay={delay + 50} />
      </div>
      <Sk className="h-4 w-10 hidden md:block" delay={delay + 40} />
      <Sk className="h-4 w-16 hidden lg:block" delay={delay + 50} />
    </div>
  );
}

// ─── Song Card Skeleton (grid view) ──────────────────────────────────────────
export function SongCardSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-premium rounded-2xl overflow-hidden">
          <Sk className="aspect-square w-full rounded-none" delay={i * 25} />
          <div className="p-3 space-y-2">
            <Sk className="h-4 w-3/4" delay={i * 25 + 40} />
            <Sk className="h-3 w-1/2" delay={i * 25 + 60} />
            <Sk className="h-3 w-1/3" delay={i * 25 + 80} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Draft Card Skeleton ──────────────────────────────────────────────────────
export function DraftCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-premium rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Sk className="h-12 w-12 rounded-xl flex-shrink-0" delay={i * 30} />
            <div className="flex-1 space-y-1.5">
              <Sk className="h-4 w-3/4" delay={i * 30 + 30} />
              <Sk className="h-3 w-1/2" delay={i * 30 + 50} />
            </div>
          </div>
          <Sk className="h-6 w-24 rounded-full" delay={i * 30 + 70} />
        </div>
      ))}
    </div>
  );
}

// ─── Dashboard Stats Row Skeleton ─────────────────────────────────────────────
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
    </div>
  );
}

// ─── Royalty Row Skeleton ─────────────────────────────────────────────────────
export function RoyaltyRowSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-border/40 last:border-0">
      <Sk className="h-10 w-10 rounded-xl shrink-0" delay={delay} />
      <div className="flex-1 space-y-1.5">
        <Sk className="h-4 w-36" delay={delay + 20} />
        <Sk className="h-3 w-24" delay={delay + 40} />
      </div>
      <Sk className="h-6 w-20 rounded-full" delay={delay + 30} />
    </div>
  );
}

// ─── Goal Card Skeleton ───────────────────────────────────────────────────────
export function GoalCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div className="card-premium rounded-2xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <Sk className="h-5 w-40" delay={delay} />
        <Sk className="h-6 w-20 rounded-full" delay={delay + 20} />
      </div>
      <Sk className="h-2.5 w-full rounded-full" delay={delay + 40} />
      <div className="flex justify-between">
        <Sk className="h-3 w-20" delay={delay + 50} />
        <Sk className="h-3 w-20" delay={delay + 60} />
      </div>
    </div>
  );
}

// ─── Generic List Skeleton ────────────────────────────────────────────────────
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 card-premium rounded-2xl">
          <Sk className="h-8 w-8 rounded-full shrink-0" delay={i * 25} />
          <div className="flex-1 space-y-1.5">
            <Sk className="h-4 w-3/4" delay={i * 25 + 20} />
            <Sk className="h-3 w-1/2" delay={i * 25 + 40} />
          </div>
          <Sk className="h-6 w-16 rounded-full" delay={i * 25 + 30} />
        </div>
      ))}
    </div>
  );
}

// ─── Profile Skeleton ─────────────────────────────────────────────────────────
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Sk className="h-20 w-20 rounded-2xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Sk className="h-6 w-48" delay={30} />
          <Sk className="h-4 w-32" delay={60} />
          <Sk className="h-6 w-24 rounded-full" delay={90} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-premium rounded-2xl p-4 space-y-2">
            <Sk className="h-3 w-20" delay={i * 30} />
            <Sk className="h-5 w-40" delay={i * 30 + 20} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Setlist Skeleton ─────────────────────────────────────────────────────────
export function SetlistSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-premium rounded-2xl p-4 flex items-center gap-4">
          <Sk className="h-12 w-12 rounded-xl flex-shrink-0" delay={i * 30} />
          <div className="flex-1 space-y-1.5">
            <Sk className="h-4 w-48" delay={i * 30 + 20} />
            <Sk className="h-3 w-32" delay={i * 30 + 40} />
          </div>
          <Sk className="h-8 w-8 rounded-xl" delay={i * 30 + 30} />
        </div>
      ))}
    </div>
  );
}
