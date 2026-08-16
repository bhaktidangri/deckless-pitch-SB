import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GapItem } from "@/lib/types";

const severityVariant: Record<GapItem["severity"], "escalated" | "modelled" | "default"> = {
  high: "escalated",
  medium: "modelled",
  low: "default",
};

export function GapCard({ gap }: { gap: GapItem }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <Badge variant={severityVariant[gap.severity]} size="sm" className="capitalize">
          {gap.severity} severity
        </Badge>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="rounded-lg bg-surface-2 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">Current state</p>
          <p className="mt-1 text-sm text-foreground">{gap.current}</p>
        </div>
        <ArrowRight className="mx-auto hidden h-4 w-4 text-subtle sm:block" />
        <div className="rounded-lg bg-brand-50 p-3 dark:bg-brand-950/30">
          <p className="text-[11px] font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">Desired state</p>
          <p className="mt-1 text-sm text-foreground">{gap.desired}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        <span className="font-medium text-foreground">Gap: </span>
        {gap.gap}
      </p>
    </div>
  );
}
