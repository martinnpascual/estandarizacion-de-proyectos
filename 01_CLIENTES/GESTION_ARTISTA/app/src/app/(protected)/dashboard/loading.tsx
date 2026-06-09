import { DashboardStatsSkeleton, ChartSkeleton } from "@/components/ui/Skeletons";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-6 lg:p-8">
      <div className="space-y-2">
        <div className="skeleton h-8 w-56 rounded-xl" />
        <div className="skeleton h-4 w-40 rounded" />
      </div>
      <DashboardStatsSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartSkeleton height="h-64" />
        <ChartSkeleton height="h-64" />
      </div>
    </div>
  );
}
