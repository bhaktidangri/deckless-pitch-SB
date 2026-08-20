"use client";

import { CheckCircle2, Lock, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BuyerEngagementStatus } from "@/lib/api/account";

// A buyer's own deal-status control — 'pending' (default, open to vendor
// outreach), 'in_progress' (actively evaluating a vendor), 'closed' (deal
// done). This isn't just a label: record-vendor-outreach and
// schedule-meeting-direct both reject with 403 once a buyer marks 'closed',
// so setting it here genuinely stops vendors from reaching out.
export const engagementStatusConfig: Record<
  BuyerEngagementStatus,
  { label: string; description: string; icon: React.ElementType; badgeVariant: "modelled" | "brand" | "escalated" }
> = {
  pending: {
    label: "Open to vendors",
    description: "Vendors browsing the catalog can email or schedule with you.",
    icon: CheckCircle2,
    badgeVariant: "modelled",
  },
  in_progress: {
    label: "In progress",
    description: "You're actively evaluating a vendor — still reachable.",
    icon: TrendingUp,
    badgeVariant: "brand",
  },
  closed: {
    label: "Closed",
    description: "Your deal is done — vendors can no longer contact you.",
    icon: Lock,
    badgeVariant: "escalated",
  },
};

export function EngagementStatusBadge({ status, className }: { status: BuyerEngagementStatus; className?: string }) {
  const cfg = engagementStatusConfig[status];
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.badgeVariant} size="sm" className={cn("shrink-0", className)}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </Badge>
  );
}

export function EngagementStatusControl({
  status,
  onChange,
  saving,
}: {
  status: BuyerEngagementStatus;
  onChange: (status: BuyerEngagementStatus) => void;
  saving: boolean;
}) {
  const options: BuyerEngagementStatus[] = ["pending", "in_progress", "closed"];
  return (
    <div>
      <div className="inline-flex flex-wrap gap-1.5 rounded-xl border border-border bg-surface-2 p-1">
        {options.map((opt) => {
          const cfg = engagementStatusConfig[opt];
          const Icon = cfg.icon;
          const active = status === opt;
          return (
            <button
              key={opt}
              type="button"
              disabled={saving}
              onClick={() => onChange(opt)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60",
                active ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {cfg.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-subtle">{engagementStatusConfig[status].description}</p>
    </div>
  );
}
