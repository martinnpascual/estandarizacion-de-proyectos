import { SongRowSkeleton } from "@/components/ui/Skeletons";

export default function DiscografiaLoading() {
  return (
    <div className="space-y-4 animate-fade-in p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div className="skeleton h-7 w-40 rounded-xl" />
        <div className="skeleton h-9 w-24 rounded-xl" />
      </div>
      <div className="skeleton h-10 w-full rounded-2xl" />
      <div className="card-premium rounded-2xl overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <SongRowSkeleton key={i} delay={i * 30} />
        ))}
      </div>
    </div>
  );
}
