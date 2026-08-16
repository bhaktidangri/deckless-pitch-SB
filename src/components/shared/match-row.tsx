import { ArrowRight, CheckCircle2, CircleAlert, CircleSlash, Sparkles } from "lucide-react";
import { ConfidenceBadge } from "@/components/shared/status-badge";
import type { MatchStatus, SolutionMatch } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusConfig: Record<MatchStatus, { label: string; icon: React.ElementType; className: string }> = {
  strong_match: { label: "Strong match", icon: CheckCircle2, className: "text-verified" },
  partial_match: { label: "Partial match", icon: Sparkles, className: "text-modelled" },
  requires_validation: { label: "Requires validation", icon: CircleAlert, className: "text-modelled" },
  unmatched: { label: "Unmatched", icon: CircleSlash, className: "text-escalated" },
};

export function MatchRow({ match }: { match: SolutionMatch }) {
  const cfg = statusConfig[match.matchStatus];
  const Icon = cfg.icon;
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground">{match.requirementText}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("flex items-center gap-1.5 text-xs font-medium", cfg.className)}>
            <Icon className="h-3.5 w-3.5" />
            {cfg.label}
          </span>
          {match.matchStatus !== "unmatched" && <ConfidenceBadge value={match.confidence} />}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm text-muted">
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-subtle" />
        <span className="font-medium text-foreground">{match.capabilityName}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">{match.reasoning}</p>
    </div>
  );
}
