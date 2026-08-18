"use client";

import { useState } from "react";
import { AlertTriangle, Check, Clock, FileText, Globe, PenLine, Sheet as SheetIcon, FileType2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { EvidenceBadge } from "@/components/shared/status-badge";
import type { EvidenceSourceType, SavedCapability } from "@/lib/api/vendor-dna";
import { cn } from "@/lib/utils";

// The 4 choices from PRD Section 4 / 5.3.3, mapped to the verificationStatus
// the Publish tool actually acts on: verified/modelled publish, unverified/
// pending don't. "Leave pending" produces no decision at all — the PRD
// describes it as "no change", and Publish must never run on a capability
// that was never reviewed, so it's simply skipped rather than sent as
// verificationStatus: "pending".
export type ApprovalAction = "approve" | "revise" | "reject" | "pending";

export interface ResolvedDecision {
  capabilityId: string;
  verificationStatus: "verified" | "unverified";
  description?: string;
  decidedAt: string;
}

const sourceIcon: Record<EvidenceSourceType, React.ElementType> = {
  website: Globe,
  pdf: FileText,
  ppt: FileType2,
  doc: FileText,
  spreadsheet: SheetIcon,
  manual: PenLine,
  other: FileText,
};

const categoryLabel: Record<string, string> = {
  product: "Product",
  service: "Service",
  solution: "Solution",
  feature: "Feature",
  integration: "Integration",
  industry: "Industry",
  consulting: "Consulting",
  use_case: "Use case",
  constraint: "Constraint",
};

export function CapabilityApprovalCard({
  capability,
  remaining,
  onDecide,
  onLeavePending,
}: {
  capability: SavedCapability;
  remaining: number;
  onDecide: (decision: ResolvedDecision) => void;
  onLeavePending: () => void;
}) {
  const [revising, setRevising] = useState(false);
  const [revisedText, setRevisedText] = useState(capability.description ?? "");

  const hasConflict = new Set(capability.evidence.map((e) => e.sourceLabel)).size > 1 && capability.evidence.length > 1;

  function approve() {
    onDecide({ capabilityId: capability.id, verificationStatus: "verified", decidedAt: new Date().toISOString() });
  }

  function approveRevised() {
    onDecide({
      capabilityId: capability.id,
      verificationStatus: "verified",
      description: revisedText.trim() || undefined,
      decidedAt: new Date().toISOString(),
    });
  }

  function reject() {
    onDecide({ capabilityId: capability.id, verificationStatus: "unverified", decidedAt: new Date().toISOString() });
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
              {categoryLabel[capability.category] ?? capability.category}
            </span>
            <EvidenceBadge status={capability.verificationStatus} />
          </div>
          <h3 className="text-base font-semibold text-foreground">{capability.name}</h3>
          <p className="mt-0.5 font-mono text-[11px] text-subtle">{capability.id}</p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
          {remaining} remaining
        </span>
      </div>

      {capability.description && <p className="mb-3 text-sm text-muted">{capability.description}</p>}

      {hasConflict && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-modelled-border bg-modelled-bg px-3 py-2.5 text-xs text-foreground/80">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-modelled" />
          Two sources disagree on this capability — review both snippets below and pick or reconcile.
        </div>
      )}

      <div className="space-y-2">
        {capability.evidence.length > 0 ? (
          capability.evidence.map((ev, i) => {
            const Icon = ev.sourceType ? sourceIcon[ev.sourceType] : FileText;
            return (
              <div key={ev.id ?? i} className="flex items-start gap-2 rounded-lg border border-border bg-surface-2/50 p-2.5">
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">{ev.sourceLabel ?? "Source"}</p>
                  {ev.sourceText && <p className="mt-0.5 text-xs text-muted">&ldquo;{ev.sourceText}&rdquo;</p>}
                  {ev.sourceLocation && <p className="mt-0.5 text-[11px] text-subtle">{ev.sourceLocation}</p>}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-escalated">No evidence recorded for this capability.</p>
        )}
      </div>

      {revising ? (
        <div className="mt-4 space-y-2.5 border-t border-border pt-4">
          <Textarea value={revisedText} onChange={(e) => setRevisedText(e.target.value)} rows={3} autoFocus />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={approveRevised}>
              <Check className="h-3.5 w-3.5" /> Approve revised text
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setRevising(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          <Button size="sm" onClick={approve}>
            <Check className="h-3.5 w-3.5" /> Approve as-is
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setRevising(true)}>
            <PenLine className="h-3.5 w-3.5" /> Revise then approve
          </Button>
          <Button size="sm" variant="outline" className={cn("border-escalated/30 text-escalated hover:bg-escalated-bg")} onClick={reject}>
            <X className="h-3.5 w-3.5" /> Reject
          </Button>
          <Button size="sm" variant="ghost" onClick={onLeavePending}>
            <Clock className="h-3.5 w-3.5" /> Leave pending
          </Button>
        </div>
      )}
    </Card>
  );
}
