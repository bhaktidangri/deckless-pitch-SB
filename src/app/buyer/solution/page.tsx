"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Download, FileText, Loader2, MessageSquareText, Sparkles, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { GapCard } from "@/components/shared/gap-card";
import { MatchRow } from "@/components/shared/match-row";
import { RoiWidget } from "@/components/shared/roi-widget";
import {
  getFitAndGapAssessment,
  getLatestSolutionDeck,
  getRoiProjection,
  getSolutionModel,
  type BuyerSolutionDeckRow,
  type GapItemRow,
  type RoiProjectionRow,
  type SolutionMatchRow,
  type SolutionModelRow,
} from "@/lib/api/buyer-lookup";
import { getStoredBuyerId, getStoredSelectedVendorId, getStoredSelectedVendorName, setStoredSolutionModelId } from "@/lib/buyer-session";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { GapItem, RoiProjection, SolutionMatch } from "@/lib/types";

function toGapItem(g: GapItemRow): GapItem {
  return {
    id: g.id,
    current: g.currentState ?? "Not yet specified",
    desired: g.desiredState ?? "Not yet specified",
    gap: g.gap ?? "Not yet specified",
    severity: g.severity,
  };
}

function toSolutionMatch(m: SolutionMatchRow): SolutionMatch {
  return {
    id: m.id,
    requirementText: m.requirementText ?? "Requirement",
    capabilityId: m.capabilityId ?? "",
    capabilityName: m.capabilityName ?? "—",
    matchStatus: m.matchStatus,
    confidence: m.confidence ?? 0,
    reasoning: m.reasoning ?? "",
  };
}

function toRoiProjection(r: RoiProjectionRow): RoiProjection {
  return {
    currentAnnualCost: r.currentAnnualCost ?? 0,
    projectedAnnualCost: r.projectedAnnualCost ?? 0,
    savingsPercent: r.savingsPercent ?? 0,
    paybackMonths: r.paybackMonths ?? 0,
    threeYearSavings: r.threeYearSavings ?? 0,
    chart: Array.isArray(r.chart) ? (r.chart as RoiProjection["chart"]) : [],
  };
}

export default function SolutionWorkspacePage() {
  const buyerId = getStoredBuyerId();
  const vendorId = getStoredSelectedVendorId();
  const vendorName = getStoredSelectedVendorName();

  const [matches, setMatches] = useState<SolutionMatchRow[]>([]);
  const [gaps, setGaps] = useState<GapItemRow[]>([]);
  const [model, setModel] = useState<SolutionModelRow | null>(null);
  const [roi, setRoi] = useState<RoiProjectionRow | null>(null);
  const [deck, setDeck] = useState<BuyerSolutionDeckRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!buyerId || !vendorId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const [fitGap, m, deckDoc] = await Promise.all([
          getFitAndGapAssessment(buyerId!, vendorId!),
          getSolutionModel(buyerId!, vendorId!),
          getLatestSolutionDeck(buyerId!),
        ]);
        if (cancelled) return;
        setMatches(fitGap.matches);
        setGaps(fitGap.gaps);
        setModel(m);
        setDeck(deckDoc);
        if (m) {
          setStoredSolutionModelId(m.id);
          const roiRow = await getRoiProjection(m.id);
          if (!cancelled) setRoi(roiRow);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [buyerId, vendorId]);

  if (!buyerId || !vendorId) {
    return (
      <div>
        <PageHeader eyebrow="Your solution" title="Solution workspace" description="Confirm a vendor first to build your personalized solution." />
        <Card className="max-w-md p-6 text-center">
          <Link href="/buyer/vendors" className={cn(buttonVariants({ variant: "primary" }))}>
            Go to vendor recommendations
          </Link>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        <p className="text-sm text-muted">Loading your solution workspace…</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow={`Personalized for ${vendorName ?? "your vendor"}`}
        title="Your solution workspace"
        description="Evidence-backed fit and gap analysis, grounded in your Client Reality Profile — not a generic deck."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/buyer/scenarios" className={cn(buttonVariants({ variant: "secondary" }))}>
              <SlidersHorizontal className="h-4 w-4" /> Run what-if
            </Link>
            <Link href="/buyer/chat" className={cn(buttonVariants({ variant: "primary" }))}>
              <MessageSquareText className="h-4 w-4" /> Ask AI
            </Link>
          </div>
        }
      />

      {model && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {model.version != null && <Badge variant="brand">Version {model.version}</Badge>}
          {model.status && <Badge variant={model.status === "active" ? "verified" : "outline"} className="capitalize">{model.status}</Badge>}
          {model.updatedAt && <span className="text-xs text-subtle">Last updated {formatRelativeTime(model.updatedAt)}</span>}
        </div>
      )}

      <div className="space-y-6">
        {model?.executiveSummary ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Executive summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <p className="text-sm leading-relaxed text-muted">{model.executiveSummary}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-modelled-border bg-modelled-bg">
            <CardContent className="py-4 text-sm text-foreground">
              The Solution Model Agent hasn&apos;t produced your executive summary yet — this fills in automatically once it does.
            </CardContent>
          </Card>
        )}

        <Card className={deck?.status === "ready" ? "border-verified-border bg-verified-bg" : undefined}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {deck?.status === "ready" ? "Your Solution Pitch Deck is ready" : deck?.status === "failed" ? "Deck generation failed" : "Your presentation-ready pitch deck"}
                </p>
                <p className="text-xs text-muted">
                  {deck?.title ?? "A polished .pptx — not this page — is the deliverable handed to you."}
                </p>
              </div>
            </div>
            {deck?.pptxUrl ? (
              <a href={deck.pptxUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm" }))}>
                <Download className="h-3.5 w-3.5" /> Download .pptx
              </a>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-subtle">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…
              </span>
            )}
          </CardContent>
        </Card>

        {gaps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Business gaps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {gaps.map((g) => (
                <GapCard key={g.id} gap={toGapItem(g)} />
              ))}
            </CardContent>
          </Card>
        )}

        {matches.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>How {vendorName ?? "your vendor"} addresses each requirement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {matches.map((m) => (
                <MatchRow key={m.id} match={toSolutionMatch(m)} />
              ))}
            </CardContent>
          </Card>
        )}

        {matches.length === 0 && gaps.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted">
              Waiting for the Solution Matching Agent to assess fit and gaps against {vendorName ?? "your vendor"}&apos;s published capabilities.
            </CardContent>
          </Card>
        )}

        {roi && <RoiWidget roi={toRoiProjection(roi)} />}

        <Card className="border-brand-200 bg-gradient-to-br from-brand-50 to-accent-50 dark:border-brand-900 dark:from-brand-950/30 dark:to-accent-950/20">
          <CardContent className="flex flex-col items-start justify-between gap-4 py-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-foreground">Ready to explore further?</p>
              <p className="mt-1 text-sm text-muted">Adjust assumptions in Scenarios, or ask the AI directly.</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link href="/buyer/handoff" className={cn(buttonVariants({ variant: "secondary" }))}>
                <CalendarClock className="h-4 w-4" /> Request expert
              </Link>
              <Link href="/buyer/chat" className={cn(buttonVariants({ variant: "primary" }))}>
                Ask AI
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
