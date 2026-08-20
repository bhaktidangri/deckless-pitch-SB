"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  FileSearch,
  IndianRupee,
  Layers,
  Lock,
  Mail,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EngagementStatusBadge } from "@/components/shared/engagement-status";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { AgentWaitingState } from "@/components/shared/agent-waiting-state";
import {
  getVendorRecommendationsForVendor,
  getBuyerVendorSelectionsForVendor,
  getAllBuyers,
  getVendorOutreachEvents,
  getRealityProfilesForBuyers,
  type LeadBuyerRow,
  type VendorSideRealityProfileRow,
} from "@/lib/api/vendor-lookup";
import { getFrontierItemsForVendor } from "@/lib/api/vendor-frontier";
import { getStoredVendorId } from "@/lib/vendor-session";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { cn, formatCurrencyINR, formatNumber, formatRelativeTime } from "@/lib/utils";

interface BuyerEngagement {
  buyer: LeadBuyerRow;
  stage: string;
  fitScore: number | null;
  frontierOpen: number;
  contacted: boolean;
  profile: VendorSideRealityProfileRow | null;
}

export default function VendorBuyersPage() {
  const [query, setQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [engagements, setEngagements] = useState<BuyerEngagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [realtimeBump, setRealtimeBump] = useState(0);

  useRealtimeRefresh(
    vendorId
      ? [
          { table: "buyers" },
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
        const [buyers, recs, selections, frontier, outreach] = await Promise.all([
          getAllBuyers(),
          getVendorRecommendationsForVendor(id!),
          getBuyerVendorSelectionsForVendor(id!),
          getFrontierItemsForVendor(id!),
          getVendorOutreachEvents(id!).catch(() => []),
        ]);
        if (cancelled) return;
        const profiles = await getRealityProfilesForBuyers(buyers.map((b) => b.id)).catch(
          () => ({}) as Awaited<ReturnType<typeof getRealityProfilesForBuyers>>
        );
        if (cancelled) return;

        const contactedBuyerIds = new Set(outreach.map((o) => o.buyerId));
        const list: BuyerEngagement[] = buyers.map((buyer) => {
          const rec = recs.find((r) => r.buyerId === buyer.id);
          const selection = selections.find((s) => s.buyerId === buyer.id);
          const openFrontier = frontier.filter((f) => f.buyerId === buyer.id && (f.status === "open" || f.status === "vendor_review")).length;
          const stage = selection?.isActive ? "Solution Workspace" : selection ? "Vendor Selection" : "Discovery";
          return {
            buyer,
            stage,
            fitScore: rec?.fitScore ?? null,
            frontierOpen: openFrontier,
            contacted: contactedBuyerIds.has(buyer.id),
            profile: profiles[buyer.id] ?? null,
          };
        });
        list.sort((a, b) => (b.fitScore ?? -1) - (a.fitScore ?? -1));
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

  const industriesPresent = Array.from(
    new Set(engagements.map((e) => e.buyer.industry).filter((v): v is string => Boolean(v)))
  ).sort();

  const filtered = engagements.filter((e) => {
    if (industryFilter !== "all" && e.buyer.industry !== industryFilter) return false;
    if (!query.trim()) return true;
    return e.buyer.companyName.toLowerCase().includes(query.trim().toLowerCase());
  });

  if (!vendorId) {
    return (
      <div>
        <PageHeader eyebrow="Engagement" title="Buyers" description="Register your solution first." />
        <Card className="max-w-md p-6 text-center text-sm text-muted">No vendor session found in this browser yet.</Card>
      </div>
    );
  }

  const contactedCount = engagements.filter((e) => e.contacted).length;
  const activeCount = engagements.filter((e) => e.stage !== "Discovery").length;
  const openFrontierTotal = engagements.reduce((sum, e) => sum + e.frontierOpen, 0);
  const closedCount = engagements.filter((e) => e.buyer.engagementStatus === "closed").length;

  return (
    <div>
      <PageHeader eyebrow="Engagement" title="Buyers" description="Every buyer on the platform — profile, needs, and requirement fit with your solution, at a glance." />

      {!loading && engagements.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total buyers" value={String(engagements.length)} icon={Users} tone="brand" index={0} />
          <StatCard label="Actively engaged" value={String(activeCount)} icon={Sparkles} tone="accent" index={1} />
          <StatCard label="Contacted" value={String(contactedCount)} icon={Mail} tone="verified" index={2} />
          <StatCard label="Open frontier items" value={String(openFrontierTotal)} icon={FileSearch} tone="escalated" index={3} />
          <StatCard label="Closed deals" value={String(closedCount)} icon={Lock} tone="modelled" index={4} />
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <Input placeholder="Search buyers..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {industriesPresent.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip active={industryFilter === "all"} onClick={() => setIndustryFilter("all")}>
              All <span className="opacity-60">{engagements.length}</span>
            </FilterChip>
            {industriesPresent.map((industry) => {
              const count = engagements.filter((e) => e.buyer.industry === industry).length;
              return (
                <FilterChip key={industry} active={industryFilter === industry} onClick={() => setIndustryFilter(industry)}>
                  {industry} <span className="opacity-60">{count}</span>
                </FilterChip>
              );
            })}
          </div>
        )}
      </div>

      {loading ? (
        <AgentWaitingState variant="card" title="Loading buyers" description="Pulling profiles, requirements, and real-time recommendations." />
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">
          {engagements.length === 0 ? "No buyers are registered on the platform yet." : "No buyer matches your search."}
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((e) => (
            <BuyerProfileCard key={e.buyer.id} engagement={e} />
          ))}
        </div>
      )}
    </div>
  );
}
function BuyerProfileCard({ engagement: e }: { engagement: BuyerEngagement }) {
  const profile = e.profile;
  const closed = e.buyer.engagementStatus === "closed";
  return (
    <Link href={`/vendor/buyers/${e.buyer.id}`}>
      <Card className={cn("group h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md", closed && "opacity-70")}>
        <CardContent className="flex h-full flex-col gap-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={e.buyer.companyName} size="md" />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <span className="truncate group-hover:text-brand-600 dark:group-hover:text-brand-400">{e.buyer.companyName}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-subtle transition-colors group-hover:text-brand-500" />
                </p>
                <p className="flex items-center gap-1 text-xs text-muted">
                  <Building2 className="h-3 w-3" /> {e.buyer.industry ?? "Industry unknown"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <EngagementStatusBadge status={e.buyer.engagementStatus} />
              <Badge variant="modelled" size="sm">{e.stage}</Badge>
              {e.fitScore != null && (
                <span className="text-xs font-bold text-brand-600 dark:text-brand-400">{e.fitScore}% fit</span>
              )}
            </div>
          </div>

          {(e.buyer.companySize || profile?.timelineMonths || profile?.currentCostAnnual != null) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-y border-border py-2.5 text-xs text-muted">
              {e.buyer.companySize && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> {formatNumber(e.buyer.companySize)} employees
                </span>
              )}
              {profile?.timelineMonths != null && (
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" /> {profile.timelineMonths}mo timeline
                </span>
              )}
              {profile?.currentCostAnnual != null && (
                <span className="flex items-center gap-1.5">
                  <IndianRupee className="h-3.5 w-3.5" /> {formatCurrencyINR(profile.currentCostAnnual)}/yr current
                </span>
              )}
            </div>
          )}

          <div className="flex-1 space-y-2.5">
            <TagRow icon={Target} tone="verified" label="Goals" items={profile?.goals} />
            <TagRow icon={ShieldAlert} tone="escalated" label="Pain points" items={profile?.painPoints} />
            <TagRow icon={Layers} tone="default" label="Current stack" items={profile?.currentTechnology} />
            {!profile && <p className="text-xs italic text-subtle">No client reality profile captured yet.</p>}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 text-xs text-subtle">
            <div className="flex items-center gap-3">
              {e.contacted && (
                <span className="flex items-center gap-1 font-medium text-verified">
                  <Mail className="h-3.5 w-3.5" /> Contacted
                </span>
              )}
              {e.frontierOpen > 0 && (
                <span className="flex items-center gap-1 font-medium text-escalated">
                  <FileSearch className="h-3.5 w-3.5" /> {e.frontierOpen} open
                </span>
              )}
            </div>
            <span>{formatRelativeTime(e.buyer.createdAt)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function TagRow({
  icon: Icon,
  tone,
  label,
  items,
}: {
  icon: React.ElementType;
  tone: "verified" | "escalated" | "default";
  label: string;
  items?: string[];
}) {
  if (!items || items.length === 0) return null;
  const toneClass: Record<string, string> = {
    verified: "border-verified-border bg-verified-bg text-verified",
    escalated: "border-escalated-border bg-escalated-bg text-escalated",
    default: "border-border bg-surface-2 text-muted",
  };
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex items-center gap-1 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-subtle">
        <Icon className="h-3 w-3" /> {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {items.slice(0, 3).map((item) => (
          <span key={item} className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", toneClass[tone])}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-300"
          : "border-border bg-surface text-muted hover:bg-surface-2 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
