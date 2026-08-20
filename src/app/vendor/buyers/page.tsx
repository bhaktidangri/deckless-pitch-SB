"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FileSearch, Mail, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { AgentWaitingState } from "@/components/shared/agent-waiting-state";
import {
  getVendorRecommendationsForVendor,
  getBuyerVendorSelectionsForVendor,
  getBuyersByIds,
  getVendorOutreachEvents,
  type LeadBuyerRow,
} from "@/lib/api/vendor-lookup";
import { getFrontierItemsForVendor } from "@/lib/api/vendor-frontier";
import { getStoredVendorId } from "@/lib/vendor-session";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { formatRelativeTime } from "@/lib/utils";

interface BuyerEngagement {
  buyer: LeadBuyerRow;
  stage: string;
  fitScore: number | null;
  frontierOpen: number;
  contacted: boolean;
}

export default function VendorBuyersPage() {
  const [query, setQuery] = useState("");
  const [engagements, setEngagements] = useState<BuyerEngagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [realtimeBump, setRealtimeBump] = useState(0);

  useRealtimeRefresh(
    vendorId
      ? [
          { table: "vendor_recommendations", filter: `vendor_id=eq.${vendorId}` },
          { table: "buyer_vendor_selections", filter: `vendor_id=eq.${vendorId}` },
          { table: "capability_frontier", filter: `vendor_id=eq.${vendorId}` },
          { table: "vendor_outreach_events", filter: `vendor_id=eq.${vendorId}` },
        ]
      : [],
    () => setRealtimeBump((n) => n + 1),
    [vendorId]
  );

  useEffect(() => {
    const id = getStoredVendorId();
    setVendorId(id);
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const [recs, selections, frontier, outreach] = await Promise.all([
          getVendorRecommendationsForVendor(id!),
          getBuyerVendorSelectionsForVendor(id!),
          getFrontierItemsForVendor(id!),
          getVendorOutreachEvents(id!).catch(() => []),
        ]);
        const buyerIds = Array.from(new Set([...recs.map((r) => r.buyerId), ...selections.map((s) => s.buyerId)]));
        const buyers = await getBuyersByIds(buyerIds);
        if (cancelled) return;

        const contactedBuyerIds = new Set(outreach.map((o) => o.buyerId));
        const list: BuyerEngagement[] = buyers.map((buyer) => {
          const rec = recs.find((r) => r.buyerId === buyer.id);
          const selection = selections.find((s) => s.buyerId === buyer.id);
          const openFrontier = frontier.filter((f) => f.buyerId === buyer.id && (f.status === "open" || f.status === "vendor_review")).length;
          const stage = selection?.isActive ? "Solution Workspace" : selection ? "Vendor Selection" : "Discovery";
          return { buyer, stage, fitScore: rec?.fitScore ?? null, frontierOpen: openFrontier, contacted: contactedBuyerIds.has(buyer.id) };
        });
        list.sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0));
        setEngagements(list);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 45000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [realtimeBump]);

  const filtered = engagements.filter((e) => e.buyer.companyName.toLowerCase().includes(query.toLowerCase()));

  if (!vendorId) {
    return (
      <div>
        <PageHeader eyebrow="Engagement" title="Buyers" description="Register your solution first." />
        <Card className="max-w-md p-6 text-center text-sm text-muted">No vendor session found in this browser yet.</Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Engagement" title="Buyers" description="Every buyer currently exploring your solution, ranked by requirement fit." />

      <div className="mb-5 relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <Input placeholder="Search buyers..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {loading ? (
        <AgentWaitingState variant="card" title="Loading buyers" description="Pulling real-time recommendations and selections." />
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">
          {engagements.length === 0 ? "No buyers are exploring your solution yet." : `No buyer matches "${query}".`}
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((e) => (
            <Link key={e.buyer.id} href={`/vendor/buyers/${e.buyer.id}`}>
              <Card className="group transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md">
                <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={e.buyer.companyName} size="md" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{e.buyer.companyName}</p>
                      <p className="text-xs text-muted">{e.buyer.industry ?? "Industry unknown"}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                    <Badge variant="modelled">{e.stage}</Badge>
                    {e.contacted && (
                      <span className="flex items-center gap-1 text-xs font-medium text-verified">
                        <Mail className="h-3.5 w-3.5" /> Contacted
                      </span>
                    )}
                    {e.frontierOpen > 0 && (
                      <span className="flex items-center gap-1 text-xs font-medium text-escalated">
                        <FileSearch className="h-3.5 w-3.5" /> {e.frontierOpen} open
                      </span>
                    )}
                    {e.fitScore != null && (
                      <div className="text-right">
                        <p className="text-sm font-bold text-brand-600 dark:text-brand-400">{e.fitScore}%</p>
                        <p className="text-[10px] uppercase tracking-wide text-subtle">fit</p>
                      </div>
                    )}
                    <span className="hidden text-xs text-subtle md:block">{formatRelativeTime(e.buyer.createdAt)}</span>
                    <ArrowUpRight className="h-4 w-4 text-subtle transition-colors group-hover:text-brand-500" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
