import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-md bg-[linear-gradient(110deg,var(--surface-2)_8%,var(--surface-hover)_18%,var(--surface-2)_33%)] bg-[length:200%_100%]",
        className
      )}
    />
  );
}
