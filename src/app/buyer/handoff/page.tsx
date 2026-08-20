"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck2, CheckCircle2, Download, ExternalLink, MessageSquareText } from "lucide-react";
import { motion } from "motion/react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ApprovalButtons } from "@/components/shared/approval-buttons";
import { FrontierCard } from "@/components/shared/frontier-card";
import { AgentWaitingState } from "@/components/shared/agent-waiting-state";
import { getCapabilityFrontierItems, getMeetingRequests, getBuyer, type CapabilityFrontierRow, type MeetingRequestRow } from "@/lib/api/buyer-lookup";
import { getStoredBuyerWorkflowRunIds } from "@/lib/buyer-session";
import { useBuyerSession } from "@/lib/hooks/use-buyer-session";
import { usePendingApproval } from "@/lib/hooks/use-pending-approval";
import { downloadIcs } from "@/lib/ics";
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
  const { buyerId, vendorName: storedVendorName } = useBuyerSession();
  const vendorName = storedVendorName ?? "your vendor";
  const workflowRunIds = getStoredBuyerWorkflowRunIds();

  const [items, setItems] = useState<CapabilityFrontierRow[]>([]);
  const [meetings, setMeetings] = useState<MeetingRequestRow[]>([]);
  const [buyerEmail, setBuyerEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const handoffApproval = usePendingApproval("approve_human_handoff", { buyerId, workflowRunIds, enabled: !!buyerId });

  async function refresh() {
    if (!buyerId) {
      setLoading(false);
      return;
    }
    try {
      const [f, m, b] = await Promise.all([getCapabilityFrontierItems(buyerId), getMeetingRequests(buyerId), getBuyer(buyerId).catch(() => null)]);
      setItems(f);
      setMeetings(m);
      setBuyerEmail(b?.email ?? null);
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
            <AgentWaitingState variant="card" title="Loading open questions" />
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
                    {m.title && <p className="mt-2 text-sm font-medium text-foreground">{m.title}</p>}
                    {m.expert && <p className="mt-1 text-sm text-foreground">Recommended: {m.expert}</p>}
                    {m.proposedDate && (
                      <p className="text-xs text-muted">
                        {new Date(m.proposedDate).toLocaleString()} · {m.durationMinutes} min
                      </p>
                    )}
                    {m.notes && <p className="mt-1 text-xs text-muted">{m.notes}</p>}
                    {m.status === "scheduled" && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-verified"><CheckCircle2 className="h-3.5 w-3.5" /> Confirmed by {vendorName}</p>
                    )}
                    {m.status === "scheduled" && (
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        {m.meetingLink && (
                          <a href={m.meetingLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                            <ExternalLink className="h-3 w-3" /> Join link
                          </a>
                        )}
                        {m.proposedDate && (
                          <button
                            type="button"
                            onClick={() =>
                              downloadIcs(
                                {
                                  uid: `${m.id}@deckless-pitch`,
                                  title: m.title ?? `Meeting with ${vendorName}`,
                                  description: m.notes ?? undefined,
                                  location: m.meetingLink ?? undefined,
                                  startIso: m.proposedDate!,
                                  durationMinutes: m.durationMinutes,
                                  attendeeEmail: buyerEmail,
                                },
                                `${(m.title ?? "meeting").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`
                              )
                            }
                            className="flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
                          >
                            <Download className="h-3 w-3" /> Add to calendar
                          </button>
                        )}
                      </div>
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
