"use client";

/**
 * Skeletons — Componentes de carga con forma definida
 * Reemplazan spinners genéricos con placeholders con forma real
 */
import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-muted/60", className)} />
  );
}

// ─── Stat Card Skeleton ───────────────────────────────────────────────────────
export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
}

// ─── Chart Skeleton ───────────────────────────────────────────────────────────
export function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-5", height)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="h-full flex items-end gap-2 pb-6 px-2">
        {[60, 45, 75, 55, 80, 65, 90, 70, 85, 50, 70, 60].map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-muted/60 rounded-t animate-pulse"
            style={{ height: `${h}%`, animationDelay: `${i * 0.05}s` }}
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
      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
      {Array.from({ length: cols - 1 }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4 rounded", i === 0 ? "w-40 flex-1" : "w-20")}
        />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
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
        <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
          <Skeleton className="h-32 w-full rounded-md" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
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
          <Skeleton className="h-7 w-32 rounded-lg" />
          {Array.from({ length: 2 + (col % 2) }).map((_, card) => (
            <div key={card} className="rounded-lg border bg-card p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Song Row Skeleton ────────────────────────────────────────────────────────
export function SongRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b last:border-0">
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-9 w-9 rounded" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-4 w-12 hidden md:block" />
      <Skeleton className="h-4 w-16 hidden lg:block" />
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
export function RoyaltyRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b last:border-0">
      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-5 w-20" />
    </div>
  );
}

// ─── Goal Card Skeleton ───────────────────────────────────────────────────────
export function GoalCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full rounded-full" />
      <div className="flex justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

// ─── Song Card Skeleton (grid view) ──────────────────────────────────────────
export function SongCardSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card overflow-hidden">
          <Skeleton className="aspect-square w-full" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
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
        <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ─── Generic List Skeleton ────────────────────────────────────────────────────
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
