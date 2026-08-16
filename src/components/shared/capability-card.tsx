"use client";

import { useState } from "react";
import { ChevronDown, FileText, Globe, Sheet as SheetIcon, FileType2, PenLine } from "lucide-react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { EvidenceBadge } from "@/components/shared/status-badge";
import type { Capability, SourceType } from "@/lib/types";
import { cn } from "@/lib/utils";

const sourceIcon: Record<SourceType, React.ElementType> = {
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

export function CapabilityCard({ capability }: { capability: Capability }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="overflow-hidden transition-colors hover:border-border-strong">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-start justify-between gap-4 p-4 text-left">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
              {categoryLabel[capability.category] ?? capability.category}
            </span>
            <EvidenceBadge status={capability.verificationStatus} />
          </div>
          <h4 className="text-sm font-semibold text-foreground">{capability.name}</h4>
          <p className="mt-1 text-sm text-muted line-clamp-2">{capability.description}</p>
        </div>
        <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-subtle transition-transform", open && "rotate-180")} />
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden"
      >
        <div className="border-t border-border bg-surface-2/50 px-4 py-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {capability.tags.map((t) => (
              <span key={t} className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted border border-border">
                #{t}
              </span>
            ))}
          </div>
          {capability.evidence.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-subtle">Evidence sources</p>
              {capability.evidence.map((ev, i) => {
                const Icon = sourceIcon[ev.sourceType];
                return (
                  <div key={i} className="flex items-start gap-2 rounded-lg border border-border bg-surface p-2.5">
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">{ev.sourceLabel}</p>
                      <p className="mt-0.5 text-xs text-muted">&ldquo;{ev.snippet}&rdquo;</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-escalated">No verified evidence found for this capability yet.</p>
          )}
        </div>
      </motion.div>
    </Card>
  );
}
