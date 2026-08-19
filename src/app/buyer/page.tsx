"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Loader2, MessageSquareText, Sparkles, Store, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EvidenceBadge } from "@/components/shared/status-badge";
import {
  getBuyerRequirements,
  getCapabilityFrontierItems,
  getRoiProjection,
  getSolutionModel,
  type BuyerRequirementRow,
  type CapabilityFrontierRow,
  type RoiProjectionRow,
} from "@/lib/api/buyer-lookup";
import { getStoredBuyerId, getStoredCompanyName, getStoredSelectedVendorId, getStoredSelectedVendorName } from "@/lib/buyer-session";
import { cn, formatCurrencyINR } from "@/lib/utils";

export default function BuyerDashboardPage() {
  const buyerId = getStoredBuyerId();
  const companyName = getStoredCompanyName();
  const vendorId = getStoredSelectedVendorId();
  const vendorName = getStoredSelectedVendorName();

  const [requirements, setRequirements] = useState<BuyerRequirementRow[]>([]);
  const [frontierItems, setFrontierItems] = useState<CapabilityFrontierRow[]>([]);
  const [roi, setRoi] = useState<RoiProjectionRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!buyerId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const [reqs, frontier] = await Promise.all([getBuyerRequirements(buyerId!), getCapabilityFrontierItems(buyerId!)]);
        if (cancelled) return;
        setRequirements(reqs);
        setFrontierItems(frontier);
        if (vendorId) {
          const model = await getSolutionModel(buyerId!, vendorId);
          if (model && !cancelled) setRoi(await getRoiProjection(model.id));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [buyerId, vendorId]);

  if (!buyerId) {
    return (
      <div>
        <PageHeader eyebrow="Welcome" title="Start your discovery" description="No buyer session found in this browser yet." />
        <Card className="max-w-md p-6 text-center">
          <Link href="/buyer/discover" className={cn(buttonVariants({ variant: "primary" }))}>
            Go to Discover <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>
    );
  }

  const openItems = frontierItems.filter((f) => f.status !== "resolved" && f.status !== "closed");
  const confirmedCount = requirements.filter((r) => r.status === "confirmed").length;

  return (
    <div>
      <PageHeader
        eyebrow={companyName ?? "Your organization"}
        title="Welcome back"
        description={vendorName ? `Here's where your ${vendorName} solution stands, and what still needs an answer.` : "Confirm a vendor to build your personalized solution."}
        actions={
          <Link href="/buyer/solution" className={cn(buttonVariants({ variant: "primary" }))}>
            Open solution workspace <ArrowUpRight className="h-4 w-4" />
          </Link>
        }
      />

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Requirements captured" value={String(requirements.length)} icon={TrendingUp} tone="verified" />
            <StatCard label="Confirmed" value={String(confirmedCount)} icon={MessageSquareText} tone="brand" />
            <StatCard label="Vendor selected" value={vendorName ? "1" : "0"} icon={Store} tone="accent" />
            <StatCard label="Open questions" value={String(openItems.length)} icon={Sparkles} tone="escalated" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Your vendor</CardTitle>
                <Link href="/buyer/vendors" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                  {vendorName ? "Compare vendors" : "See recommendations"}
                </Link>
              </CardHeader>
              <CardContent className="pt-2">
                {vendorName ? (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-lg font-bold text-white">
                        {vendorName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-semibold text-foreground">{vendorName}</p>
                      </div>
                    </div>

                    {roi && (
                      <div className="mt-5 rounded-xl bg-surface-2 p-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted">Projected annual savings</span>
                          <span className="font-semibold text-verified">{roi.savingsPercent ?? 0}%</span>
                        </div>
                        <Progress value={roi.savingsPercent ?? 0} className="mt-2" size="sm" />
                        {roi.currentAnnualCost != null && roi.projectedAnnualCost != null && (
                          <p className="mt-2 text-xs text-subtle">
                            From {formatCurrencyINR(roi.currentAnnualCost)} to {formatCurrencyINR(roi.projectedAnnualCost)}/year
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {requirements.slice(0, 3).map((r) => (
                        <Badge key={r.id} variant="outline" size="sm">{r.text}</Badge>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted">No vendor confirmed yet — head to vendor recommendations to choose one.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Awaiting confirmation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {openItems.length === 0 ? (
                  <p className="text-sm text-subtle">Nothing open right now.</p>
                ) : (
                  openItems.slice(0, 4).map((item) => (
                    <div key={item.id} className="rounded-xl border border-border bg-surface-2 p-3.5">
                      <p className="text-sm font-medium text-foreground">{item.question}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <EvidenceBadge status="unverified" />
                        <Link href="/buyer/handoff" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                          Track
                        </Link>
                      </div>
                    </div>
                  ))
                )}
                <Link href="/buyer/chat" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "w-full")}>
                  <MessageSquareText className="h-3.5 w-3.5" /> Ask another question
                </Link>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
