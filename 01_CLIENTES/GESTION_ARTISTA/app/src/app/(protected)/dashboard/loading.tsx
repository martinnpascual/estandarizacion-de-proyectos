import { DashboardStatsSkeleton, ChartSkeleton, ListSkeleton } from "@/components/ui/Skeletons";

export default function DashboardLoading() {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Hero banner skeleton */}
      <div className="rounded-2xl border border-border/60 bg-card/80 p-6 h-[120px] skeleton" />

      {/* Stats row */}
      <DashboardStatsSkeleton />

      {/* Charts + activity row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ChartSkeleton height="h-64" />
        </div>
        <ListSkeleton rows={4} />
      </div>

      {/* Bottom widgets row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <ListSkeleton rows={3} />
        <ListSkeleton rows={3} />
        <ListSkeleton rows={3} />
      </div>
    </div>
  );
}
