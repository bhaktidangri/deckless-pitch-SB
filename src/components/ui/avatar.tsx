import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

const colorMap: Record<string, string> = {
  brand: "bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300",
  accent: "bg-accent-400/20 text-accent-600 dark:text-accent-400",
  verified: "bg-verified-bg text-verified",
  modelled: "bg-modelled-bg text-modelled",
  escalated: "bg-escalated-bg text-escalated",
};

export function Avatar({
  name,
  color = "brand",
  size = "md",
  className,
}: {
  name: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass = size === "sm" ? "h-7 w-7 text-[11px]" : size === "lg" ? "h-12 w-12 text-base" : "h-9 w-9 text-xs";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        sizeClass,
        colorMap[color] ?? colorMap.brand,
        className
      )}
    >
      {initials(name)}
    </div>
  );
}
