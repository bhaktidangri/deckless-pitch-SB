"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ApprovalButtons } from "@/components/shared/approval-buttons";
import { VendorRecommendationCard } from "@/components/shared/vendor-recommendation-card";
import {
  getActiveVendorSelection,
  getVendorRecommendations,
  type VendorRecommendationRow,
} from "@/lib/api/buyer-lookup";
import { queryPublishedVendorSolutionDna, type PublishedVendor } from "@/lib/api/buyer-vendor-dna";
import { getStoredBuyerId, getStoredBuyerWorkflowRunIds, setStoredSelectedVendor } from "@/lib/buyer-session";
import { usePendingApproval } from "@/lib/hooks/use-pending-approval";
import { cn } from "@/lib/utils";

// PRD §5 Step 3: "Do not proceed to Build Client Reality Profile or any
// later step until the buyer has explicitly confirmed a vendorId — this is
// a hard gate, not a default-to-top-ranked shortcut." So this page always
// shows the ranked comparison, but only unlocks moving on once
// buyer_vendor_selections has an active row.
export default function BuyerVendorsPage() {
  const buyerId = getStoredBuyerId();
  const [recommendations, setRecommendations] = useState<VendorRecommendationRow[]>([]);
  const [vendorsById, setVendorsById] = useState<Record<string, PublishedVendor>>({});
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const selection = usePendingApproval("confirm_vendor_selection", {
    buyerId,
    workflowRunIds: getStoredBuyerWorkflowRunIds(),
    enabled: !!buyerId && !activeVendorId,
  });

  async function refresh() {
    if (!buyerId) {
      setLoading(false);
      return;
    }
    try {
      const [recs, dna, active] = await Promise.all([
        getVendorRecommendations(buyerId),
        queryPublishedVendorSolutionDna().catch(() => null),
        getActiveVendorSelection(buyerId),
      ]);
      setRecommendations(recs);
      if (dna) setVendorsById(Object.fromEntries(dna.vendors.map((v) => [v.vendorId, v])));
      if (active) {
        setActiveVendorId(active.vendorId);
        const vendorName = dna?.vendors.find((v) => v.vendorId === active.vendorId)?.companyName;
        setStoredSelectedVendor(active.vendorId, vendorName);
      }
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

  async function choose(optionId: string) {
    await selection.respond({ optionId });
    setTimeout(refresh, 1500);
  }

  if (!buyerId) {
    return (
      <div>
        <PageHeader eyebrow="Vendor Discovery" title="Recommended vendors" description="Start a discovery submission first." />
        <Card className="max-w-md p-6 text-center">
          <p className="text-sm text-muted">No buyer session found in this browser yet.</p>
          <Link href="/buyer/discover" className={cn(buttonVariants({ variant: "primary" }), "mt-4")}>
            Go to Discover
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Vendor Discovery"
        title="Recommended vendors"
        description="Ranked by fit score against your captured requirements, using only verified or modelled vendor capabilities."
      />

      {activeVendorId ? (
        <Card className="mb-6 border-verified-border bg-verified-bg">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-verified" />
              <p className="text-sm text-foreground">
                You&apos;ve confirmed <span className="font-semibold">{vendorsById[activeVendorId]?.companyName ?? "your vendor"}</span> — every next step is built around this choice.
              </p>
            </div>
            <Link href={`/buyer/vendors/${activeVendorId}`} className={cn(buttonVariants({ variant: "primary", size: "sm" }))}>
              View vendor profile
            </Link>
          </CardContent>
        </Card>
      ) : selection.approval ? (
        <Card className="mb-6 border-brand-200 bg-brand-50/50 dark:border-brand-900 dark:bg-brand-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Which vendor would you like to explore?
            </CardTitle>
            {selection.approval.description && <CardDescription>{selection.approval.description}</CardDescription>}
          </CardHeader>
          <CardContent className="pt-2">
            <ApprovalButtons options={selection.approval.options} responding={selection.responding} onChoose={choose} />
            {selection.error && <p className="mt-2 text-xs text-escalated">{selection.error}</p>}
          </CardContent>
        </Card>
      ) : (
        !loading && (
          <Card className="mb-6 border-modelled-border bg-modelled-bg">
            <CardContent className="py-4 text-sm text-foreground">
              Waiting for the Solution Matching Agent to present your vendor choice — this appears here as soon as it&apos;s ready.
            </CardContent>
          </Card>
        )
      )}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading recommendations…</p>
      ) : recommendations.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">No vendor recommendations yet — check back shortly.</Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {recommendations.map((r) => (
            <VendorRecommendationCard key={r.id} recommendation={r} vendor={vendorsById[r.vendorId]} href={`/buyer/vendors/${r.vendorId}`} />
          ))}
        </div>
      )}
    </div>
  );
}
