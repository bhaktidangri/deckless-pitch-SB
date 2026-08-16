import { Clock, FileSearch, UserCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CapabilityFrontierItem, FrontierStatus } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

const statusConfig: Record<FrontierStatus, { label: string; variant: "escalated" | "modelled" | "verified" | "default" }> = {
  open: { label: "Open", variant: "escalated" },
  vendor_review: { label: "Vendor reviewing", variant: "modelled" },
  vendor_answered: { label: "Vendor answered", variant: "verified" },
  resolved: { label: "Resolved", variant: "verified" },
  closed: { label: "Closed", variant: "default" },
};

export function FrontierCard({ item }: { item: CapabilityFrontierItem }) {
  const cfg = statusConfig[item.status];
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-subtle">{item.buyerName} &middot; {item.vendorName}</p>
          <h4 className="mt-1 text-sm font-semibold text-foreground">&ldquo;{item.question}&rdquo;</h4>
        </div>
        <Badge variant={cfg.variant}>{cfg.label}</Badge>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-surface-2 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">Requirement</p>
          <p className="mt-1 text-sm text-foreground">{item.requirement}</p>
        </div>
        <div className="rounded-lg bg-surface-2 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">Buyer context</p>
          <p className="mt-1 text-sm text-foreground">{item.context}</p>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-lg border border-escalated-border bg-escalated-bg p-3">
        <FileSearch className="mt-0.5 h-4 w-4 shrink-0 text-escalated" />
        <div>
          <p className="text-xs font-medium text-escalated">Why unresolved</p>
          <p className="mt-0.5 text-xs text-foreground/80">{item.reasonUnresolved}</p>
          <p className="mt-1.5 text-[11px] text-muted">Evidence checked: {item.evidenceChecked.join(", ")}</p>
        </div>
      </div>

      {item.vendorResponse && (
        <div className="mt-3 rounded-lg border border-verified-border bg-verified-bg p-3">
          <p className="text-xs font-medium text-verified">Vendor response</p>
          <p className="mt-0.5 text-xs text-foreground/80">{item.vendorResponse}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-subtle">
        <span className="flex items-center gap-1.5">
          <UserCheck className="h-3.5 w-3.5" /> Recommended expert: <span className="font-medium text-foreground">{item.recommendedExpert}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> {formatRelativeTime(item.createdAt)}
        </span>
      </div>
    </Card>
  );
}
