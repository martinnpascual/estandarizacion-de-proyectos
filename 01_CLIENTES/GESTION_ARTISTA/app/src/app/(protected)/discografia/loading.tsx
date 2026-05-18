import { SongRowSkeleton } from "@/components/ui/Skeletons";

export default function DiscografiaLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton h-7 w-40 rounded-xl" />
          <div className="skeleton h-4 w-56 rounded" />
        </div>
        <div className="skeleton h-9 w-36 rounded-xl" />
      </div>

      {/* Search bar */}
      <div className="skeleton h-11 w-full rounded-xl" />

      {/* Year tabs */}
      <div className="flex gap-2">
        {[2026, 2025, 2024, 2023, 2022].map((y) => (
          <div key={y} className="skeleton h-8 w-16 rounded-full" />
        ))}
      </div>

      {/* Song list */}
      <div className="card-premium rounded-2xl overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <SongRowSkeleton key={i} delay={i * 30} />
        ))}
      </div>
    </div>
  );
}
