"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, CircleAlert, FileSearch, Mail, Sparkles, TrendingUp, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { AuditTimeline } from "@/components/shared/audit-timeline";
import { AgentWaitingState } from "@/components/shared/agent-waiting-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  getVendorRecommendationsForVendor,
  getBuyersByIds,
  getVendorById,
  getVendorInterestSeries,
  getVendorOutreachEvents,
  type LeadBuyerRow,
  type VendorDetailRow,
  type VendorInterestWeek,
} from "@/lib/api/vendor-lookup";
import { getFrontierItemsForVendor, type VendorFrontierItemRow } from "@/lib/api/vendor-frontier";
import { getAuditEvents } from "@/lib/api/admin-lookup";
import { getStoredVendorId } from "@/lib/vendor-session";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { AuditEvent } from "@/lib/types";

interface EngagementSummary {
  buyer: LeadBuyerRow;
  fitScore: number | null;
  frontierOpen: number;
}

export default function VendorDashboardPage() {
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendor, setVendor] = useState<VendorDetailRow | null>(null);
  const [engagements, setEngagements] = useState<EngagementSummary[]>([]);
  const [openFrontier, setOpenFrontier] = useState<VendorFrontierItemRow[]>([]);
  const [buyersById, setBuyersById] = useState<Record<string, LeadBuyerRow>>({});
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [interestSeries, setInterestSeries] = useState<VendorInterestWeek[]>([]);
  const [outreachCount, setOutreachCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [realtimeBump, setRealtimeBump] = useState(0);

  useRealtimeRefresh(
    vendorId
      ? [
          { table: "vendors", filter: `id=eq.${vendorId}` },
          { table: "vendor_recommendations", filter: `vendor_id=eq.${vendorId}` },
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
        const [v, recs, frontier, auditEvents, interest, outreach] = await Promise.all([
          getVendorById(id!),
          getVendorRecommendationsForVendor(id!),
          getFrontierItemsForVendor(id!),
          getAuditEvents(5),
          getVendorInterestSeries(id!, 6).catch(() => []),
          getVendorOutreachEvents(id!).catch(() => []),
        ]);
        const buyerIds = Array.from(new Set(recs.map((r) => r.buyerId)));
        const buyers = await getBuyersByIds(buyerIds);
        if (cancelled) return;
        const byId = Object.fromEntries(buyers.map((b) => [b.id, b]));
        setBuyersById(byId);
        setVendor(v);
        setEvents(auditEvents);
        setInterestSeries(interest);
        setOutreachCount(outreach.length);
        setEngagements(
          recs
            .filter((r) => byId[r.buyerId])
            .map((r) => ({
              buyer: byId[r.buyerId],
              fitScore: r.fitScore,
              frontierOpen: frontier.filter((f) => f.buyerId === r.buyerId && (f.status === "open" || f.status === "vendor_review")).length,
            }))
        );
        setOpenFrontier(frontier.filter((f) => f.status === "open"));
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

  if (!vendorId) {
    return (
      <div>
        <PageHeader eyebrow="Vendor" title="Vendor Dashboard" description="Register your solution first." />
        <Card className="max-w-md p-6 text-center">
          <p className="text-sm text-muted">No vendor session found in this browser yet.</p>
          <Link href="/vendor/profile" className={cn(buttonVariants({ variant: "primary" }), "mt-4")}>
            Submit sources
          </Link>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <AgentWaitingState variant="fullpage" title="Loading your dashboard" description="Pulling live buyer engagement and evidence data." />
      </div>
    );
  }

  const avgFit = engagements.length > 0 ? Math.round(engagements.reduce((sum, e) => sum + (e.fitScore ?? 0), 0) / engagements.length) : null;

  return (
    <div>
      <PageHeader
        eyebrow={vendor?.companyName ?? "Vendor"}
        title="Vendor Dashboard"
        description="Track buyer engagement, Solution DNA health, and unresolved requirements at a glance."
        actions={
          <Link href="/vendor/solution-dna" className={cn(buttonVariants({ variant: "primary" }))}>
            Review Solution DNA <ArrowUpRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Active buyers" value={String(engagements.length)} icon={Users} index={0} />
        <StatCard label="Solutions generated" value={String(engagements.length)} icon={Sparkles} tone="accent" index={1} />
        <StatCard label="Open frontier items" value={String(openFrontier.length)} icon={FileSearch} tone="escalated" index={2} />
        <StatCard label="Avg. requirement fit" value={avgFit != null ? `${avgFit}%` : "—"} icon={TrendingUp} tone="verified" index={3} />
        <StatCard label="Outreach sent" value={String(outreachCount)} icon={Mail} tone="brand" index={4} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Buyer interest over time</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={interestSeries} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      fontSize: 12,
                      color: "var(--foreground)",
                    }}
                  />
                  <Bar dataKey="buyers" fill="var(--brand-500)" radius={[4, 4, 0, 0]} name="New buyers interested" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agent activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {events.length > 0 ? <AuditTimeline events={events} /> : <p className="py-8 text-center text-sm text-muted">No agent activity recorded yet.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Active buyer engagements</CardTitle>
          <Link href="/vendor/buyers" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
            View all
          </Link>
        </CardHeader>
        <CardContent className="pt-4">
          {engagements.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No buyers are exploring your solution yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {engagements.slice(0, 6).map((e) => (
                <EngagementRow key={e.buyer.id} id={e.buyer.id} name={e.buyer.companyName} industry={e.buyer.industry} fitScore={e.fitScore} frontierOpen={e.frontierOpen} lastActive={e.buyer.createdAt} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CircleAlert className="h-4 w-4 text-escalated" /> Needs your input
          </CardTitle>
          <Link href="/vendor/capability-frontier" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
            View Capability Frontier
          </Link>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2">
          {openFrontier.length === 0 ? (
            <p className="col-span-2 py-4 text-center text-sm text-muted">No open questions right now.</p>
          ) : (
            openFrontier.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-surface-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{item.question}</p>
                  <Badge variant="escalated" size="sm">Open</Badge>
                </div>
                <p className="mt-1.5 text-xs text-muted">{buyersById[item.buyerId]?.companyName ?? "A buyer"} &middot; {formatRelativeTime(item.createdAt)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EngagementRow({ id, name, industry, fitScore, frontierOpen, lastActive }: { id: string; name: string; industry: string | null; fitScore: number | null; frontierOpen: number; lastActive: string }) {
  return (
    <Link href={`/vendor/buyers/${id}`} className="flex items-center justify-between gap-3 py-3.5 transition-colors hover:bg-surface-2 -mx-1 px-1 rounded-lg">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted">{industry ?? "Industry unknown"}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {frontierOpen > 0 && (
          <span className="flex items-center gap-1 text-xs text-escalated">
            <FileSearch className="h-3.5 w-3.5" /> {frontierOpen}
          </span>
        )}
        {fitScore != null && <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">{fitScore}%</span>}
        <span className="hidden text-xs text-subtle sm:block">{formatRelativeTime(lastActive)}</span>
      </div>
    </Link>
  );
}
