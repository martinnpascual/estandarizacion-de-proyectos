import { TableSkeleton } from "@/components/ui/Skeletons";

export default function CollabsLoading() {
  return (
    <div className="space-y-4 animate-fade-in p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div className="skeleton h-7 w-44 rounded-xl" />
        <div className="skeleton h-9 w-28 rounded-xl" />
      </div>
      <div className="skeleton h-10 w-full rounded-2xl" />
      <TableSkeleton rows={8} cols={5} />
    </div>
  );
}
