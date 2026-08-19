"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck2, CheckCircle2, Loader2, MessageSquareText } from "lucide-react";
import { motion } from "motion/react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ApprovalButtons } from "@/components/shared/approval-buttons";
import { FrontierCard } from "@/components/shared/frontier-card";
import { getCapabilityFrontierItems, getMeetingRequests, type CapabilityFrontierRow, type MeetingRequestRow } from "@/lib/api/buyer-lookup";
import { getStoredBuyerId, getStoredBuyerWorkflowRunIds, getStoredSelectedVendorName } from "@/lib/buyer-session";
import { usePendingApproval } from "@/lib/hooks/use-pending-approval";
import { cn } from "@/lib/utils";
import type { CapabilityFrontierItem } from "@/lib/types";

function toFrontierItem(f: CapabilityFrontierRow, buyerName: string, vendorName: string): CapabilityFrontierItem {
  return {
    id: f.id,
    buyerId: f.buyerId,
    buyerName,
    vendorId: f.vendorId,
    vendorName,
    question: f.question,
    requirement: f.requirement ?? "",
    context: f.context ?? "",
    evidenceChecked: f.evidenceChecked,
    reasonUnresolved: f.reasonUnresolved ?? "",
    status: f.status,
    recommendedExpert: f.recommendedExpert ?? "Specialist",
    createdAt: f.createdAt,
  };
}

const statusConfig: Record<MeetingRequestRow["status"], { label: string; variant: "escalated" | "modelled" | "verified" | "outline" }> = {
  requested: { label: "Requested", variant: "escalated" },
  scheduled: { label: "Scheduled", variant: "modelled" },
  completed: { label: "Completed", variant: "verified" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

export default function HandoffPage() {
  const buyerId = getStoredBuyerId();
  const vendorName = getStoredSelectedVendorName() ?? "your vendor";
  const workflowRunIds = getStoredBuyerWorkflowRunIds();

  const [items, setItems] = useState<CapabilityFrontierRow[]>([]);
  const [meetings, setMeetings] = useState<MeetingRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const handoffApproval = usePendingApproval("approve_human_handoff", { buyerId, workflowRunIds, enabled: !!buyerId });

  async function refresh() {
    if (!buyerId) {
      setLoading(false);
      return;
    }
    try {
      const [f, m] = await Promise.all([getCapabilityFrontierItems(buyerId), getMeetingRequests(buyerId)]);
      setItems(f);
      setMeetings(m);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 6000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerId]);

  if (!buyerId) {
    return (
      <div>
        <PageHeader eyebrow="Human Handoff" title="Ready for expert discussion?" description="Start a discovery submission first." />
        <Card className="max-w-md p-6 text-center">
          <Link href="/buyer/discover" className={cn(buttonVariants({ variant: "primary" }))}>
            Go to Discover
          </Link>
        </Card>
      </div>
    );
  }

  const openItems = items.filter((f) => f.status !== "resolved" && f.status !== "closed");

  return (
    <div>
      <PageHeader
        eyebrow="Human Handoff"
        title="Ready for expert discussion?"
        description={`${openItems.length} question${openItems.length === 1 ? "" : "s"} require ${vendorName} confirmation before closure.`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</p>
          ) : openItems.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted">No open questions right now.</Card>
          ) : (
            openItems.map((item) => <FrontierCard key={item.id} item={toFrontierItem(item, "You", vendorName)} />)
          )}
        </div>

        <Card className="h-fit lg:sticky lg:top-24">
          {handoffApproval.approval ? (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarCheck2 className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Live discussion?
                </CardTitle>
                {handoffApproval.approval.description && <CardDescription>{handoffApproval.approval.description}</CardDescription>}
              </CardHeader>
              <CardContent className="pt-2">
                <ApprovalButtons
                  options={handoffApproval.approval.options}
                  responding={handoffApproval.responding}
                  onChoose={(optionId) => handoffApproval.respond({ optionId })}
                />
                {handoffApproval.error && <p className="mt-2 text-xs text-escalated">{handoffApproval.error}</p>}
              </CardContent>
            </>
          ) : meetings.length > 0 ? (
            <CardContent className="space-y-3 pt-5">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-subtle">Meeting status</p>
              {meetings.map((m) => {
                const cfg = statusConfig[m.status];
                return (
                  <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-border bg-surface-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      {m.unresolvedCount > 0 && <span className="text-xs text-escalated">{m.unresolvedCount} unresolved</span>}
                    </div>
                    {m.expert && <p className="mt-2 text-sm text-foreground">Recommended: {m.expert}</p>}
                    {m.proposedDate && <p className="text-xs text-muted">{new Date(m.proposedDate).toLocaleString()}</p>}
                    {m.status === "scheduled" && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-verified"><CheckCircle2 className="h-3.5 w-3.5" /> Confirmed by {vendorName}</p>
                    )}
                  </motion.div>
                );
              })}
            </CardContent>
          ) : (
            <CardContent className="space-y-3 pt-5 text-center">
              <MessageSquareText className="mx-auto h-6 w-6 text-subtle" />
              <p className="text-sm text-muted">
                Tell the AI in chat that you&apos;d like a live discussion — this screen updates the moment a specialist call is offered.
              </p>
              <Link href="/buyer/chat" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "w-full")}>
                Go to chat
              </Link>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
