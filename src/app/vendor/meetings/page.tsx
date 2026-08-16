"use client";

import { useState } from "react";
import { CalendarCheck2, CalendarClock, CheckCircle2, ChevronDown, ClipboardList } from "lucide-react";
import { motion } from "motion/react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { meetingRequests } from "@/lib/dummy-data";
import { cn } from "@/lib/utils";

const statusConfig = {
  requested: { label: "Requested", variant: "escalated" as const, icon: ClipboardList },
  scheduled: { label: "Scheduled", variant: "modelled" as const, icon: CalendarClock },
  completed: { label: "Completed", variant: "verified" as const, icon: CheckCircle2 },
};

const contextPackage = {
  buyer: "Meridian Retail Group",
  vendor: "CloudNova",
  buyerProblem: "Reduce infrastructure cost while eliminating peak-season outages",
  explored: ["Pricing", "Migration approach", "ROI projection", "Scalability", "Compliance"],
  topUnresolved: "Zero-downtime migration guarantee",
  evidenceChecked: "4 verified sources",
  aiStatus: "Unable to verify",
  buyerExpectation: "Enterprise migration without service interruption during Q4 holiday season",
  recommendedRole: "Solutions Architect",
};

export default function MeetingsPage() {
  const [expandedId, setExpandedId] = useState<string | null>("mr-1");

  return (
    <div>
      <PageHeader
        eyebrow="Human Handoff"
        title="Meetings"
        description="When the buyer is ready for expert discussion, the AI hands over a complete context package — not a generic lead."
      />

      <div className="space-y-4">
        {meetingRequests.map((m) => {
          const cfg = statusConfig[m.status];
          const expanded = expandedId === m.id;
          return (
            <Card key={m.id} className="overflow-hidden">
              <button
                onClick={() => setExpandedId(expanded ? null : m.id)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300">
                    <cfg.icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{m.buyerName}</p>
                    <p className="text-xs text-muted">Recommended expert: {m.expert}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {m.unresolvedCount > 0 && (
                    <span className="hidden text-xs text-escalated sm:block">{m.unresolvedCount} unresolved questions</span>
                  )}
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  <ChevronDown className={cn("h-4 w-4 text-subtle transition-transform", expanded && "rotate-180")} />
                </div>
              </button>

              <motion.div
                initial={false}
                animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <CardContent className="border-t border-border pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-subtle">Context package</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoBlock label="Buyer problem" value={contextPackage.buyerProblem} />
                    <InfoBlock label="Buyer expectation" value={contextPackage.buyerExpectation} />
                    <InfoBlock label="Top unresolved issue" value={contextPackage.topUnresolved} tone="escalated" />
                    <InfoBlock label="Evidence checked" value={contextPackage.evidenceChecked} />
                    <InfoBlock label="AI status" value={contextPackage.aiStatus} tone="escalated" />
                    <InfoBlock label="Recommended human role" value={contextPackage.recommendedRole} tone="verified" />
                  </div>
                  <div className="mt-3">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-subtle">Topics explored</p>
                    <div className="flex flex-wrap gap-1.5">
                      {contextPackage.explored.map((t) => (
                        <Badge key={t} variant="outline" size="sm">{t}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    {m.status === "requested" && (
                      <Button size="sm">
                        <CalendarCheck2 className="h-3.5 w-3.5" /> Confirm meeting slot
                      </Button>
                    )}
                    <Button size="sm" variant="secondary">View full conversation</Button>
                  </div>
                </CardContent>
              </motion.div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function InfoBlock({ label, value, tone }: { label: string; value: string; tone?: "escalated" | "verified" }) {
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">{label}</p>
      <p className={cn("mt-1 text-sm", tone === "escalated" ? "text-escalated" : tone === "verified" ? "text-verified" : "text-foreground")}>{value}</p>
    </div>
  );
}
