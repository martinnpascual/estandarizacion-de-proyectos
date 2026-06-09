import { ChartSkeleton } from "@/components/ui/Skeletons";

export default function RedesLoading() {
  return (
    <div className="space-y-4 animate-fade-in p-4 md:p-6 lg:p-8">
      <div className="skeleton h-7 w-40 rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ChartSkeleton key={i} height="h-48" />
        ))}
      </div>
    </div>
  );
}
