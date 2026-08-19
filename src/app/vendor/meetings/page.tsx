"use client";

import { useEffect, useState } from "react";
import { CalendarCheck2, CalendarClock, CheckCircle2, ChevronDown, ClipboardList, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBuyer } from "@/lib/api/buyer-lookup";
import { confirmVendorDiscussionMeeting, getMeetingRequestsForVendor, type VendorMeetingRequestRow } from "@/lib/api/vendor-frontier";
import { getStoredVendorId } from "@/lib/vendor-session";
import { cn } from "@/lib/utils";

const statusConfig = {
  requested: { label: "Requested", variant: "escalated" as const, icon: ClipboardList },
  scheduled: { label: "Scheduled", variant: "modelled" as const, icon: CalendarClock },
  completed: { label: "Completed", variant: "verified" as const, icon: CheckCircle2 },
  cancelled: { label: "Cancelled", variant: "outline" as const, icon: ClipboardList },
};

// PRD §7.7's other stated blocker: a real "Confirm meeting slot" control,
// calling the new confirm-vendor-discussion-meeting function (staged in
// supabase-buyer/, not yet deployed).
export default function MeetingsPage() {
  const vendorId = getStoredVendorId();
  const [meetings, setMeetings] = useState<VendorMeetingRequestRow[]>([]);
  const [buyerNames, setBuyerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  async function refresh() {
    if (!vendorId) {
      setLoading(false);
      return;
    }
    try {
      const rows = await getMeetingRequestsForVendor(vendorId);
      setMeetings(rows);
      if (!expandedId && rows[0]) setExpandedId(rows[0].id);
      const unknownBuyerIds = [...new Set(rows.map((r) => r.buyerId))].filter((id) => !buyerNames[id]);
      if (unknownBuyerIds.length > 0) {
        const buyers = await Promise.all(unknownBuyerIds.map((id) => getBuyer(id).catch(() => null)));
        setBuyerNames((prev) => {
          const next = { ...prev };
          buyers.forEach((b) => {
            if (b) next[b.id] = b.companyName;
          });
          return next;
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  async function confirm(meetingId: string) {
    setConfirming(meetingId);
    try {
      await confirmVendorDiscussionMeeting(meetingId);
      await refresh();
    } finally {
      setConfirming(null);
    }
  }

  if (!vendorId) {
    return (
      <div>
        <PageHeader eyebrow="Human Handoff" title="Meetings" description="No vendor session found in this browser." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Human Handoff"
        title="Meetings"
        description="When a buyer is ready for expert discussion, the AI hands over a complete context package — not a generic lead."
      />

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</p>
      ) : meetings.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">No meeting requests yet.</Card>
      ) : (
        <div className="space-y-4">
          {meetings.map((m) => {
            const cfg = statusConfig[m.status];
            const expanded = expandedId === m.id;
            return (
              <Card key={m.id} className="overflow-hidden">
                <button onClick={() => setExpandedId(expanded ? null : m.id)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300">
                      <cfg.icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{buyerNames[m.buyerId] ?? "Buyer"}</p>
                      <p className="text-xs text-muted">Recommended expert: {m.expert ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {m.unresolvedCount > 0 && <span className="hidden text-xs text-escalated sm:block">{m.unresolvedCount} unresolved questions</span>}
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
                    {m.proposedDate && (
                      <p className="mb-3 text-sm text-foreground">Proposed: {new Date(m.proposedDate).toLocaleString()}</p>
                    )}
                    <div className="flex gap-2">
                      {m.status === "requested" && (
                        <Button size="sm" loading={confirming === m.id} onClick={() => confirm(m.id)}>
                          <CalendarCheck2 className="h-3.5 w-3.5" /> Confirm meeting slot
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </motion.div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
