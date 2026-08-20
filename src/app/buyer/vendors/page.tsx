"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Search, Sparkles, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState } from "@/components/shared/loading-state";
import { ApprovalButtons } from "@/components/shared/approval-buttons";
import { VendorRecommendationCard } from "@/components/shared/vendor-recommendation-card";
import { AgentWaitingState } from "@/components/shared/agent-waiting-state";
import { Globe, ArrowUpRight } from "lucide-react";
import {
  getActiveVendorSelection,
  getVendorRecommendations,
  type VendorRecommendationRow,
} from "@/lib/api/buyer-lookup";
import { queryPublishedVendorSolutionDna, type PublishedVendor } from "@/lib/api/buyer-vendor-dna";
import { getStoredBuyerWorkflowRunIds, setStoredSelectedVendor } from "@/lib/buyer-session";
import { useBuyerSession } from "@/lib/hooks/use-buyer-session";
import { usePendingApproval } from "@/lib/hooks/use-pending-approval";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { cn } from "@/lib/utils";

// Every capability name/tag/category that appears anywhere in a vendor's
// published Solution DNA — the searchable surface for "find me a vendor
// that can do X" instead of only being able to search by vendor name.
function capabilityHaystack(vendor: PublishedVendor | undefined): string {
  if (!vendor) return "";
  return vendor.capabilities
    .flatMap((c) => [c.name, c.category, ...(c.tags ?? [])])
    .join(" ")
    .toLowerCase();
}

function matchingCapabilityName(vendor: PublishedVendor | undefined, query: string): string | undefined {
  if (!vendor || !query) return undefined;
  const q = query.toLowerCase();
  const hit = vendor.capabilities.find(
    (c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || c.tags.some((t) => t.toLowerCase().includes(q))
  );
  return hit?.name;
}

// PRD §5 Step 3: "Do not proceed to Build Client Reality Profile or any
// later step until the buyer has explicitly confirmed a vendorId — this is
// a hard gate, not a default-to-top-ranked shortcut." So this page always
// shows the ranked comparison, but only unlocks moving on once
// buyer_vendor_selections has an active row.
export default function BuyerVendorsPage() {
  const { buyerId } = useBuyerSession();
  const [recommendations, setRecommendations] = useState<VendorRecommendationRow[]>([]);
  const [vendorsById, setVendorsById] = useState<Record<string, PublishedVendor>>({});
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"recommended" | "all">("recommended");

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

  useRealtimeRefresh(
    buyerId
      ? [
          { table: "vendor_recommendations", filter: `buyer_id=eq.${buyerId}` },
          { table: "buyer_vendor_selections", filter: `buyer_id=eq.${buyerId}` },
        ]
      : [],
    refresh,
    [buyerId]
  );

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 45000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerId]);

  async function choose(optionId: string) {
    await selection.respond({ optionId });
    setTimeout(refresh, 1500);
  }

  const filteredRecommendations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recommendations;
    return recommendations.filter((r) => {
      const vendor = vendorsById[r.vendorId];
      const fields = [
        vendor?.companyName,
        vendor?.industry,
        vendor?.tagline,
        vendor?.description,
        ...(vendor?.industries ?? []),
        r.keyMatch,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return fields.includes(q) || capabilityHaystack(vendor).includes(q);
    });
  }, [query, recommendations, vendorsById]);

  const allVendors = useMemo(() => Object.values(vendorsById), [vendorsById]);
  const filteredAllVendors = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allVendors;
    return allVendors.filter((vendor) => {
      const fields = [vendor.companyName, vendor.industry, vendor.tagline, vendor.description, ...vendor.industries].filter(Boolean).join(" ").toLowerCase();
      return fields.includes(q) || capabilityHaystack(vendor).includes(q);
    });
  }, [query, allVendors]);

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
          <AgentWaitingState
            variant="card"
            title="Waiting for your vendor choice"
            description="The Solution Matching Agent will present ranked options here as soon as they're ready."
            className="mb-6"
          />
        )
      )}

      {!loading && (recommendations.length > 0 || allVendors.length > 0) && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={view} onValueChange={(v) => setView(v as "recommended" | "all")}>
              <TabsList>
                <TabsTrigger value="recommended">Recommended for you ({recommendations.length})</TabsTrigger>
                <TabsTrigger value="all">All vendors ({allVendors.length})</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative max-w-sm flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by capability, industry, or vendor…"
                className="pl-9 pr-9"
                aria-label="Search vendors by capability"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-subtle hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {loading ? (
        <LoadingState variant="cards" count={3} />
      ) : view === "recommended" ? (
        recommendations.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted">
            No vendor recommendations yet — check back shortly, or browse the full catalog in the &ldquo;All vendors&rdquo; tab above.
          </Card>
        ) : filteredRecommendations.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted">
            No vendor matches &ldquo;{query}&rdquo; — try a broader capability, industry, or vendor name.
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredRecommendations.map((r) => {
              const vendor = vendorsById[r.vendorId];
              const matched = matchingCapabilityName(vendor, query);
              return (
                <div key={r.id} className="flex flex-col gap-2">
                  {matched && (
                    <Badge variant="brand" size="sm" className="w-fit">
                      Matches: {matched}
                    </Badge>
                  )}
                  <VendorRecommendationCard recommendation={r} vendor={vendor} href={`/buyer/vendors/${r.vendorId}`} />
                </div>
              );
            })}
          </div>
        )
      ) : allVendors.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">No vendors have published their Solution DNA yet.</Card>
      ) : filteredAllVendors.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">
          No vendor matches &ldquo;{query}&rdquo; — try a broader capability, industry, or vendor name.
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredAllVendors.map((vendor) => {
            const matched = matchingCapabilityName(vendor, query);
            const rec = recommendations.find((r) => r.vendorId === vendor.vendorId);
            return (
              <div key={vendor.vendorId} className="flex flex-col gap-2">
                {matched && (
                  <Badge variant="brand" size="sm" className="w-fit">
                    Matches: {matched}
                  </Badge>
                )}
                <Card className="group flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md">
                  <div className="flex items-start justify-between gap-3 p-5 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-bold text-white">
                        {vendor.companyName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{vendor.companyName}</h3>
                        <p className="flex items-center gap-1 text-xs text-muted">
                          {vendor.industry && <Globe className="h-3 w-3" />} {vendor.industry ?? "—"}
                        </p>
                      </div>
                    </div>
                    {rec?.fitScore != null && (
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-lg font-bold text-brand-600 dark:text-brand-400">{rec.fitScore}%</span>
                        <span className="text-[10px] uppercase tracking-wide text-subtle">fit</span>
                      </div>
                    )}
                  </div>
                  {vendor.description && (
                    <div className="px-5">
                      <p className="text-sm text-muted line-clamp-2">{vendor.description}</p>
                    </div>
                  )}
                  {vendor.industries.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5 px-5">
                      {vendor.industries.slice(0, 3).map((ind) => (
                        <Badge key={ind} variant="outline" size="sm">
                          {ind}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="mt-auto flex gap-2 border-t border-border p-3">
                    <Link href={`/buyer/vendors/${vendor.vendorId}`} className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "flex-1")}>
                      View profile <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
