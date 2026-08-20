"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { GapCard } from "@/components/shared/gap-card";
import { MatchRow } from "@/components/shared/match-row";
import { RoiWidget } from "@/components/shared/roi-widget";
import { AgentWaitingState } from "@/components/shared/agent-waiting-state";
import {
  generateFallbackSolutionDeck,
  getBuyerSolutionDecks,
  getFitAndGapAssessment,
  getRoiProjection,
  getSolutionModel,
  FallbackDeckError,
  type BuyerSolutionDeckRow,
  type GapItemRow,
  type RoiProjectionRow,
  type SolutionMatchRow,
  type SolutionModelRow,
} from "@/lib/api/buyer-lookup";
import { setStoredSolutionModelId } from "@/lib/buyer-session";
import { useBuyerSession } from "@/lib/hooks/use-buyer-session";
import { useAgentStatus } from "@/lib/hooks/use-agent-status";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
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
  const { buyerId, vendorId, vendorName } = useBuyerSession();
  // status is the one real completion signal this codebase has (see
  // use-agent-status.ts's own header comment): finalize-solution-workspace's
  // last action is flipping solution_models.status to "active", so "the last
  // table workflow 2 edits" is solution_models — that (or a ready deck, agent
  // or fallback) is what "completed" is actually grounded in here, not a
  // run.status field nothing ever populates.
  const { status: agentStatus, startedAt: agentStartedAt } = useAgentStatus(buyerId);
  const solutionComplete = agentStatus === "completed";

  const [matches, setMatches] = useState<SolutionMatchRow[]>([]);
  const [gaps, setGaps] = useState<GapItemRow[]>([]);
  const [model, setModel] = useState<SolutionModelRow | null>(null);
  const [roi, setRoi] = useState<RoiProjectionRow | null>(null);
  const [deck, setDeck] = useState<BuyerSolutionDeckRow | null>(null);
  const [deckHistory, setDeckHistory] = useState<BuyerSolutionDeckRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingDeck, setGeneratingDeck] = useState(false);
  const [deckError, setDeckError] = useState<string | null>(null);
  const autoFallbackTriedRef = useRef(false);
  // Bumped by realtime events to re-trigger the load effect below the
  // instant something actually changes, instead of waiting up to 8s.
  const [realtimeBump, setRealtimeBump] = useState(0);

  useRealtimeRefresh(
    buyerId && vendorId
      ? [
          { table: "solution_matches", filter: `buyer_id=eq.${buyerId}` },
          { table: "gap_items", filter: `buyer_id=eq.${buyerId}` },
          { table: "solution_models", filter: `buyer_id=eq.${buyerId}` },
          { table: "buyer_solution_decks", filter: `buyer_id=eq.${buyerId}` },
        ]
      : [],
    () => setRealtimeBump((n) => n + 1),
    [buyerId, vendorId]
  );

  useEffect(() => {
    if (!buyerId || !vendorId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const [fitGap, m, decks] = await Promise.all([
          getFitAndGapAssessment(buyerId!, vendorId!),
          getSolutionModel(buyerId!, vendorId!),
          getBuyerSolutionDecks(buyerId!, 10),
        ]);
        if (cancelled) return;
        setMatches(fitGap.matches);
        setGaps(fitGap.gaps);
        setModel(m);
        setDeck(decks[0] ?? null);
        setDeckHistory(decks);
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
    // Realtime (above) is the primary signal now — this is just a safety
    // net for a dropped socket, so it can be far less aggressive than the
    // old 8s blind poll.
    const interval = setInterval(load, 45000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [buyerId, vendorId, realtimeBump]);

  // Backup path: the Yoxa agent's own "Generate Solution Pitch Deck" Output
  // Tool doesn't reliably reach the buyer (every agent-sourced deck row
  // observed so far ends up status=failed) — so once this workspace has
  // enough real Supabase data to build a deck from and no ready deck has
  // shown up, generate one locally instead of leaving the buyer staring at
  // "Generating…" forever. Fires once per page visit.
  useEffect(() => {
    if (loading || generatingDeck || autoFallbackTriedRef.current) return;
    if (!buyerId || !vendorId) return;
    if (deck?.status === "ready") return;
    const hasEnoughData = matches.length > 0 || gaps.length > 0 || Boolean(model?.executiveSummary);
    if (!hasEnoughData) return;
    autoFallbackTriedRef.current = true;
    void runFallbackGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, deck, matches, gaps, model, buyerId, vendorId]);

  async function runFallbackGeneration() {
    if (!buyerId) return;
    setGeneratingDeck(true);
    setDeckError(null);
    try {
      const created = await generateFallbackSolutionDeck(buyerId, vendorId);
      setDeck(created);
      setDeckHistory((prev) => [created, ...prev]);
    } catch (err) {
      setDeckError(err instanceof FallbackDeckError ? err.message : "Could not build a backup deck right now.");
    } finally {
      setGeneratingDeck(false);
    }
  }

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
      <div className="flex min-h-[40vh] items-center justify-center">
        <AgentWaitingState
          variant="fullpage"
          title="Loading your solution workspace"
          description="Pulling your fit and gap assessment, ROI model, and pitch deck."
        />
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

      <Card className={cn("mb-6", solutionComplete ? "border-verified-border bg-verified-bg" : undefined)}>
        <CardContent className="flex items-center gap-3 py-4">
          {solutionComplete ? (
            <>
              <CheckCircle2 className="h-5 w-5 shrink-0 text-verified" />
              <div>
                <p className="text-sm font-semibold text-foreground">Your solution is complete</p>
                <p className="text-xs text-muted">Every section below reflects real, final output — your pitch deck is ready below.</p>
              </div>
            </>
          ) : (
            <>
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand-500" />
              <div>
                <p className="text-sm font-semibold text-foreground">Your agent is still working</p>
                <p className="text-xs text-muted">Sections below fill in as real data lands — your pitch deck unlocks once the model is finalized.</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
        ) : solutionComplete ? (
          // The agent finished (real final output exists elsewhere on this
          // page) but never wrote an executive summary this run — showing an
          // open-ended "still working" spinner here would be false: nothing
          // is going to make this fill in on its own once solutionComplete
          // is true, so say so plainly instead of contradicting the banner
          // above it.
          <Card className="p-6 text-center text-sm text-muted">No executive summary was generated for this solution.</Card>
        ) : (
          <AgentWaitingState
            variant="card"
            startedAt={agentStartedAt}
            title="Building your executive summary"
            description="The Solution Model Agent hasn't produced it yet — this fills in automatically once it does."
          />
        )}

        {!solutionComplete ? (
          <AgentWaitingState
            variant="card"
            startedAt={agentStartedAt}
            title="Your pitch deck will appear here"
            description="The download and preview options unlock automatically once your solution is marked complete above."
          />
        ) : (
        <Card className={deck?.status === "ready" ? "border-verified-border bg-verified-bg" : undefined}>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {deck?.status === "ready" ? "Your Solution Pitch Deck is ready" : generatingDeck ? "Building your backup deck…" : "Your presentation-ready pitch deck"}
                    </p>
                  </div>
                  <p className="text-xs text-muted">
                    {deck?.title ?? "A polished .pptx — not this page — is the deliverable handed to you."}
                  </p>
                  {deckError && <p className="mt-1 text-xs text-escalated">{deckError}</p>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {deck?.pptxUrl ? (
                  <a href={deck.pptxUrl} target="_blank" rel="noreferrer" download className={cn(buttonVariants({ size: "sm" }))}>
                    <Download className="h-3.5 w-3.5" /> Download .pptx
                  </a>
                ) : generatingDeck ? (
                  <span className="flex items-center gap-1.5 text-xs text-subtle">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void runFallbackGeneration()}
                    className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Generate deck now
                  </button>
                )}
              </div>
            </div>

            {deck?.pptxUrl && (
              <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
                <iframe
                  key={deck.pptxUrl}
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(deck.pptxUrl)}`}
                  className="h-[560px] w-full"
                  title={deck.title ?? "Solution Pitch Deck preview"}
                />
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {solutionComplete && deckHistory.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Previous versions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pt-2">
              {deckHistory.slice(1).map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-surface-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-subtle" />
                    <span className="truncate text-sm text-foreground">{d.title ?? "Solution Pitch Deck"}</span>
                    {d.status === "failed" && <Badge variant="escalated" size="sm">failed</Badge>}
                    {d.status === "ready" && d.source === "fallback" && (
                      <Badge variant="modelled" size="sm">backup</Badge>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-subtle">{formatRelativeTime(d.createdAt)}</span>
                    {d.pptxUrl && (
                      <a href={d.pptxUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline dark:text-brand-400">
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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
          solutionComplete ? (
            <Card className="p-6 text-center text-sm text-muted">No fit or gap assessment was generated for this solution.</Card>
          ) : (
            <AgentWaitingState
              variant="card"
              startedAt={agentStartedAt}
              title="Assessing fit and gaps"
              description={`Comparing your requirements against ${vendorName ?? "your vendor"}'s published capabilities.`}
            />
          )
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
