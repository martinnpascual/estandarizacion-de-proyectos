import { DashboardStatsSkeleton, ChartSkeleton } from "@/components/ui/Skeletons";

export default function EstadisticasLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <div className="skeleton h-7 w-44 rounded-xl" />
        <div className="skeleton h-4 w-64 rounded" />
      </div>

      {/* Stats row */}
      <DashboardStatsSkeleton />

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton height="h-72" />
        <ChartSkeleton height="h-72" />
        <ChartSkeleton height="h-72" />
        <ChartSkeleton height="h-72" />
      </div>
    </div>
  );
}
