// Shared "the agent/data is still loading" placeholder — replaces the
// scattered plain "Loading…" text + spinner that used to appear
// differently on every buyer page. `variant="stats"` mimics a StatCard
// grid, `variant="cards"` mimics a card grid (e.g. vendor recommendations),
// `variant="lines"` is a generic content skeleton.
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function LoadingState({
  variant = "lines",
  count = 4,
}: {
  variant?: "stats" | "cards" | "lines";
  count?: number;
}) {
  if (variant === "stats") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="mt-4 h-6 w-16" />
            <Skeleton className="mt-2 h-3 w-24" />
          </Card>
        ))}
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
            <Skeleton className="mt-4 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-4/5" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-4" style={{ width: `${85 - i * 12}%` }} />
      ))}
    </div>
  );
}
