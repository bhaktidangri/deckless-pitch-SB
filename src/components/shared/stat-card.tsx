import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  tone = "brand",
  className,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  tone?: "brand" | "verified" | "modelled" | "escalated" | "accent";
  className?: string;
}) {
  const toneClass: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300",
    verified: "bg-verified-bg text-verified",
    modelled: "bg-modelled-bg text-modelled",
    escalated: "bg-escalated-bg text-escalated",
    accent: "bg-accent-400/15 text-accent-600 dark:text-accent-400",
  };
  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-5 transition-shadow hover:shadow-md", className)}>
      <div className="flex items-center justify-between">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", toneClass[tone])}>
          <Icon className="h-4 w-4" />
        </div>
        {trend && <span className="text-xs font-medium text-verified">{trend}</span>}
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}
