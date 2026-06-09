import { KanbanSkeleton } from "@/components/ui/Skeletons";

export default function MaquetasLoading() {
  return (
    <div className="space-y-4 animate-fade-in p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div className="skeleton h-7 w-36 rounded-xl" />
        <div className="skeleton h-9 w-28 rounded-xl" />
      </div>
      <div className="skeleton h-10 w-full rounded-2xl" />
      <KanbanSkeleton columns={4} />
    </div>
  );
}
