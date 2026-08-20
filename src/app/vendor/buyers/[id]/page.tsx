"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, CalendarClock, FileSearch, TrendingUp, User } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { GapCard } from "@/components/shared/gap-card";
import { MatchRow } from "@/components/shared/match-row";
import { FrontierCard } from "@/components/shared/frontier-card";
import { AgentWaitingState } from "@/components/shared/agent-waiting-state";
import { EmailBuyerCard } from "@/components/shared/email-buyer-card";
import {
  getBuyerById,
  getVendorById,
  getMatchesAndGapsForBuyer,
  getRequirementsForBuyer,
  getRealityProfileForBuyer,
  getVendorRecommendationsForVendor,
  type LeadBuyerRow,
  type VendorDetailRow,
  type VendorSideGapRow,
  type VendorSideMatchRow,
  type VendorSideRequirementRow,
  type VendorSideRealityProfileRow,
} from "@/lib/api/vendor-lookup";
import { getFrontierItemsForVendor, type VendorFrontierItemRow } from "@/lib/api/vendor-frontier";
import { getStoredVendorId } from "@/lib/vendor-session";
import { cn, formatCurrencyINR, formatNumber } from "@/lib/utils";
import type { CapabilityFrontierItem, GapItem, SolutionMatch } from "@/lib/types";

function toGapItem(g: VendorSideGapRow): GapItem {
  return { id: g.id, current: g.currentState ?? "—", desired: g.desiredState ?? "—", gap: g.gap ?? "—", severity: g.severity };
}

function toSolutionMatch(m: VendorSideMatchRow): SolutionMatch {
  return {
    id: m.id,
    requirementText: m.requirementText ?? "—",
    capabilityId: "",
    capabilityName: m.capabilityName ?? "—",
    matchStatus: m.matchStatus,
    confidence: m.confidence ?? 0,
    reasoning: m.reasoning ?? "",
  };
}

function toFrontierItem(f: VendorFrontierItemRow, buyerName: string, vendorName: string): CapabilityFrontierItem {
  return {
    id: f.id,
    buyerId: f.buyerId,
    buyerName,
    vendorId: "",
    vendorName,
    question: f.question,
    requirement: f.requirement ?? "",
    context: f.context ?? "",
    evidenceChecked: f.evidenceChecked,
    reasonUnresolved: f.reasonUnresolved ?? "",
    status: f.status,
    recommendedExpert: f.recommendedExpert ?? "Specialist",
    createdAt: f.createdAt,
    vendorResponse: f.vendorResponse ?? undefined,
  };
}

export default function VendorBuyerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const vendorId = getStoredVendorId();
  const [buyer, setBuyer] = useState<LeadBuyerRow | null>(null);
  const [vendor, setVendor] = useState<VendorDetailRow | null>(null);
  const [gaps, setGaps] = useState<VendorSideGapRow[]>([]);
  const [matches, setMatches] = useState<VendorSideMatchRow[]>([]);
  const [requirements, setRequirements] = useState<VendorSideRequirementRow[]>([]);
  const [profile, setProfile] = useState<VendorSideRealityProfileRow | null>(null);
  const [frontierItems, setFrontierItems] = useState<VendorFrontierItemRow[]>([]);
  const [fitScore, setFitScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const vId = getStoredVendorId();
    let cancelled = false;
    params.then(async ({ id }) => {
      if (cancelled) return;
      if (!vId) {
        setLoading(false);
        return;
      }
      try {
        const [b, v, matchesAndGaps, reqs, realityProfile, frontier, recs] = await Promise.all([
          getBuyerById(id),
          getVendorById(vId),
          getMatchesAndGapsForBuyer(id, vId),
          getRequirementsForBuyer(id),
          getRealityProfileForBuyer(id),
          getFrontierItemsForVendor(vId),
          getVendorRecommendationsForVendor(vId),
        ]);
        if (cancelled) return;
        if (!b) {
          setNotFound(true);
          return;
        }
        setBuyer(b);
        setVendor(v);
        setGaps(matchesAndGaps.gaps);
        setMatches(matchesAndGaps.matches);
        setRequirements(reqs);
        setProfile(realityProfile);
        setFrontierItems(frontier.filter((f) => f.buyerId === id));
        setFitScore(recs.find((r) => r.buyerId === id)?.fitScore ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <AgentWaitingState variant="fullpage" title="Loading buyer" description="Pulling their requirements, gaps, and open questions." />
      </div>
    );
  }

  if (notFound || !buyer) {
    return (
      <Card className="max-w-md p-6 text-center">
        <p className="text-sm text-escalated">Buyer not found.</p>
        <Link href="/vendor/buyers" className={cn(buttonVariants({ variant: "primary" }), "mt-4")}>
          Back to buyers
        </Link>
      </Card>
    );
  }

  return (
    <div>
      <Link href="/vendor/buyers" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to buyers
      </Link>

      <PageHeader
        eyebrow={buyer.industry ?? "Engagement"}
        title={buyer.companyName}
        description={`${buyer.industry ?? "Industry unknown"}${buyer.companySize ? ` · ${formatNumber(buyer.companySize)} users` : ""} · Engaged since ${new Date(buyer.createdAt).toLocaleDateString()}`}
        actions={
          <Link href="/vendor/meetings" className={cn(buttonVariants({ variant: "primary" }))}>
            <CalendarClock className="h-4 w-4" /> Prepare handoff
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {profile ? (
            <Card>
              <CardHeader>
                <CardTitle>Client Reality Profile</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 pt-2 sm:grid-cols-2">
                <ProfileBlock title="Current technology" items={profile.currentTechnology} />
                <ProfileBlock title="Pain points" items={profile.painPoints} tone="escalated" />
                <ProfileBlock title="Goals" items={profile.goals} tone="verified" />
                <ProfileBlock title="Constraints" items={profile.constraints} tone="modelled" />
              </CardContent>
            </Card>
          ) : (
            <Card className="p-6 text-center text-sm text-muted">No client reality profile captured yet for this buyer.</Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Business gaps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {gaps.length > 0 ? gaps.map((gap) => <GapCard key={gap.id} gap={toGapItem(gap)} />) : <p className="text-sm text-muted">No gaps identified yet.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Solution matches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {matches.length > 0 ? matches.map((m) => <MatchRow key={m.id} match={toSolutionMatch(m)} />) : <p className="text-sm text-muted">No solution matches yet.</p>}
            </CardContent>
          </Card>

          {frontierItems.length > 0 && (
            <Card>
              <CardHeader className="flex-row items-center gap-2">
                <FileSearch className="h-4 w-4 text-escalated" />
                <CardTitle>Capability Frontier for this buyer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {frontierItems.map((item) => (
                  <FrontierCard key={item.id} item={toFrontierItem(item, buyer.companyName, vendor?.companyName ?? "You")} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Primary contact</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-center gap-3">
                <Avatar name={buyer.contactName ?? buyer.companyName} size="lg" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{buyer.contactName ?? "Contact not on file"}</p>
                  {buyer.contactRole && <p className="text-xs text-muted">{buyer.contactRole}</p>}
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-muted">
                <p className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> {buyer.companyName}</p>
                {buyer.companySize && <p className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> {formatNumber(buyer.companySize)} employees</p>}
              </div>
            </CardContent>
          </Card>

          {vendorId && (
            <EmailBuyerCard
              vendorId={vendorId}
              buyerId={buyer.id}
              buyerCompanyName={buyer.companyName}
              buyerEmail={buyer.email}
              vendorCompanyName={vendor?.companyName ?? "Us"}
            />
          )}

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Requirement fit</CardTitle>
              {fitScore != null && (
                <span className="flex items-center gap-1 text-sm font-bold text-brand-600 dark:text-brand-400">
                  <TrendingUp className="h-4 w-4" /> {fitScore}%
                </span>
              )}
            </CardHeader>
            <CardContent className="pt-2">
              {requirements.length > 0 ? (
                <div className="space-y-2">
                  {requirements.map((r) => (
                    <div key={r.id} className="flex items-start justify-between gap-2 text-sm">
                      <span className="text-foreground">{r.text}</span>
                      <Badge variant="outline" size="sm" className="shrink-0 capitalize">{r.priority}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No requirements captured yet.</p>
              )}
            </CardContent>
          </Card>

          {profile?.currentCostAnnual != null && (
            <Card className="border-brand-200 bg-brand-50/50 dark:border-brand-900 dark:bg-brand-950/20">
              <CardContent className="pt-5">
                <p className="text-sm font-semibold text-foreground">Current infrastructure cost</p>
                <p className="mt-1 text-2xl font-bold text-brand-700 dark:text-brand-300">{formatCurrencyINR(profile.currentCostAnnual)}</p>
                <p className="mt-1 text-xs text-muted">per year, before optimization</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileBlock({ title, items, tone }: { title: string; items: string[]; tone?: "escalated" | "verified" | "modelled" }) {
  if (items.length === 0) return null;
  const dot = tone === "escalated" ? "bg-escalated" : tone === "verified" ? "bg-verified" : tone === "modelled" ? "bg-modelled" : "bg-subtle";
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">{title}</p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-foreground">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
