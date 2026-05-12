import { DraftCardSkeleton } from "@/components/ui/Skeletons";

export default function MaquetasLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton h-7 w-36 rounded-xl" />
          <div className="skeleton h-4 w-52 rounded" />
        </div>
        <div className="skeleton h-9 w-40 rounded-xl" />
      </div>

      {/* Search + filters */}
      <div className="flex gap-3">
        <div className="skeleton h-10 flex-1 rounded-xl" />
        <div className="skeleton h-10 w-28 rounded-xl" />
      </div>

      {/* Status tabs */}
      <div className="flex gap-2">
        {["Todas", "Borrador", "En mezcla", "Masterizada"].map((s) => (
          <div key={s} className="skeleton h-8 w-20 rounded-full" />
        ))}
      </div>

      {/* Cards */}
      <DraftCardSkeleton count={6} />
    </div>
  );
}
