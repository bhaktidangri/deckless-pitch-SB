import { CheckCircle2, CircleDashed, HelpCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ResponseStatus, VerificationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const verificationConfig: Record<VerificationStatus, { label: string; variant: "verified" | "modelled" | "escalated" | "default"; icon: React.ElementType }> = {
  verified: { label: "Verified", variant: "verified", icon: CheckCircle2 },
  modelled: { label: "Modelled", variant: "modelled", icon: Sparkles },
  unverified: { label: "Unverified", variant: "escalated", icon: HelpCircle },
  pending: { label: "Pending review", variant: "default", icon: CircleDashed },
};

export function EvidenceBadge({ status, className }: { status: VerificationStatus; className?: string }) {
  const cfg = verificationConfig[status];
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} className={cn("shrink-0", className)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

const responseConfig: Record<ResponseStatus, { label: string; variant: "verified" | "modelled" | "escalated"; icon: React.ElementType }> = {
  verified: { label: "Verified answer", variant: "verified", icon: CheckCircle2 },
  modelled: { label: "Modelled estimate", variant: "modelled", icon: Sparkles },
  escalated: { label: "Needs vendor confirmation", variant: "escalated", icon: HelpCircle },
};

export function ResponseStatusBadge({ status, className }: { status: ResponseStatus; className?: string }) {
  const cfg = responseConfig[status];
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} className={cn("shrink-0", className)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

export function ConfidenceBadge({ value, className }: { value: number; className?: string }) {
  const tone = value >= 85 ? "verified" : value >= 60 ? "modelled" : "escalated";
  return (
    <Badge variant={tone} className={cn("font-mono tabular-nums", className)}>
      {value}% confidence
    </Badge>
  );
}
