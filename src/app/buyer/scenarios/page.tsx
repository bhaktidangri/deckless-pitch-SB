"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Clock, Loader2, MessageSquareText, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ScenarioSlider } from "@/components/shared/scenario-slider";
import { RoiWidget } from "@/components/shared/roi-widget";
import { LiveChatPanel } from "@/components/shared/live-chat-panel";
import {
  getClientRealityProfile,
  getRoiProjection,
  getSolutionModel,
  type RoiProjectionRow,
} from "@/lib/api/buyer-lookup";
import { AgentWaitingState } from "@/components/shared/agent-waiting-state";
import { getStoredBuyerWorkflowRunIds } from "@/lib/buyer-session";
import { useBuyerSession } from "@/lib/hooks/use-buyer-session";
import { usePendingApproval } from "@/lib/hooks/use-pending-approval";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { cn, formatNumber } from "@/lib/utils";
import type { RoiProjection } from "@/lib/types";

const DEBOUNCE_MS = 700;

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

// The agent only re-pauses at adjust_scenario_assumptions under specific
// workflow conditions — most slider changes end up queued indefinitely with
// nothing to actually re-trigger a recompute, so gating the visible numbers
// on that round-trip left the ROI card frozen on stale figures while
// dragging. This estimates the effect of the changed users/timeline against
// the last real agent-computed baseline so the widget always reflects what
// you just changed — clearly labeled as an estimate (see the badge below),
// not a silent substitute for the real number. The actual agent recompute
// is still sent in the background (scheduleChange) and, via the existing
// roi_projections realtime subscription, replaces this the moment a real
// one arrives.
function estimateScenarioRoi(
  baseline: RoiProjection,
  baselineUsers: number,
  baselineTimeline: number,
  users: number,
  timelineMonths: number
): RoiProjection {
  const userScale = baselineUsers > 0 ? users / baselineUsers : 1;
  const rushMonths = Math.max(0, baselineTimeline - timelineMonths);
  const rushMultiplier = 1 + rushMonths * 0.02;
  const slackMonths = Math.max(0, timelineMonths - baselineTimeline);
  const slackMultiplier = Math.max(0.9, 1 - slackMonths * 0.005);
  const costMultiplier = rushMultiplier * slackMultiplier;

  const currentAnnualCost = Math.round(baseline.currentAnnualCost * userScale);
  const projectedAnnualCost = Math.round(baseline.projectedAnnualCost * userScale * costMultiplier);
  const netAnnual = currentAnnualCost - projectedAnnualCost;
  const savingsPercent = currentAnnualCost > 0 ? Math.round((netAnnual / currentAnnualCost) * 100) : 0;
  const threeYearSavings = Math.round(netAnnual * 3);
  const paybackMonths = netAnnual > 0 && userScale > 0 ? Math.max(1, Math.round((baseline.paybackMonths || 12) / userScale)) : 0;

  return {
    currentAnnualCost,
    projectedAnnualCost,
    savingsPercent,
    paybackMonths,
    threeYearSavings,
    chart: baseline.chart.map((point) => ({
      year: point.year,
      current: Math.round(point.current * userScale),
      projected: Math.round(point.projected * userScale * costMultiplier),
    })),
  };
}

// PRD §7.6 originally called for every ROI number here to come from the
// agent, with no local math — but Adjust Scenario Assumptions only re-pauses
// under specific workflow conditions, so most slider changes queued forever
// with no real recompute ever arriving (see estimateScenarioRoi above). The
// agent round-trip is still attempted in the background on every change;
// roiBaseUsers/roiBaseTimeline track which users/timeline the last REAL
// (agent-computed) roi row actually corresponds to, so the client-side
// estimate always scales from a genuine data point, and gets re-anchored the
// moment a fresh agent computation actually lands (detected by roi row id).
export default function ScenariosPage() {
  const { buyerId, vendorId, vendorName } = useBuyerSession();
  const workflowRunIds = getStoredBuyerWorkflowRunIds();

  const [solutionModelId, setSolutionModelId] = useState<string | null>(null);
  const [roi, setRoi] = useState<RoiProjectionRow | null>(null);
  const [baselineUsers, setBaselineUsers] = useState<number | null>(null);
  const [baselineTimeline, setBaselineTimeline] = useState<number | null>(null);
  const [roiBaseUsers, setRoiBaseUsers] = useState<number | null>(null);
  const [roiBaseTimeline, setRoiBaseTimeline] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState(500);
  const [timelineMonths, setTimelineMonths] = useState(6);
  const [dirty, setDirty] = useState(false);
  const [queuedChange, setQueuedChange] = useState<Record<string, number> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRoiIdRef = useRef<string | null>(null);
  // What was last actually sent to the agent — used to re-anchor the
  // estimate's baseline once a fresh roi row confirms it was applied,
  // instead of guessing which slider position produced it.
  const lastSentRef = useRef<{ users: number; timelineMonths: number } | null>(null);

  const adjust = usePendingApproval("adjust_scenario_assumptions", { buyerId, workflowRunIds, enabled: !!buyerId && !!vendorId });

  async function refresh() {
    if (!buyerId || !vendorId) {
      setLoading(false);
      return;
    }
    try {
      const [model, profile] = await Promise.all([getSolutionModel(buyerId, vendorId), getClientRealityProfile(buyerId)]);
      if (model) {
        setSolutionModelId(model.id);
        const roiRow = await getRoiProjection(model.id);
        setRoi(roiRow);
        if (roiRow && roiRow.id !== lastRoiIdRef.current) {
          lastRoiIdRef.current = roiRow.id;
          const anchor = lastSentRef.current ?? {
            users: profile?.users ?? users,
            timelineMonths: profile?.timelineMonths ?? timelineMonths,
          };
          setRoiBaseUsers(anchor.users);
          setRoiBaseTimeline(anchor.timelineMonths);
        }
      }
      if (profile?.users != null && baselineUsers === null) {
        setBaselineUsers(profile.users);
        setUsers(profile.users);
      }
      if (profile?.timelineMonths != null && baselineTimeline === null) {
        setBaselineTimeline(profile.timelineMonths);
        setTimelineMonths(profile.timelineMonths);
      }
    } finally {
      setLoading(false);
    }
  }

  useRealtimeRefresh(
    buyerId && vendorId
      ? [
          { table: "solution_models", filter: `buyer_id=eq.${buyerId}` },
          { table: "client_reality_profiles", filter: `buyer_id=eq.${buyerId}` },
          ...(solutionModelId ? [{ table: "roi_projections", filter: `solution_model_id=eq.${solutionModelId}` }] : []),
        ]
      : [],
    refresh,
    [buyerId, vendorId, solutionModelId]
  );

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 45000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerId, vendorId]);

  // Deliver a debounce-settled or queued change the moment the run pauses
  // at Adjust Scenario Assumptions.
  useEffect(() => {
    if (adjust.approval && queuedChange) {
      lastSentRef.current = { users: queuedChange.users, timelineMonths: queuedChange.timelineMonths };
      adjust.respond({ numericValue: queuedChange });
      setQueuedChange(null);
      setDirty(false);
      setTimeout(refresh, 2000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjust.approval?.requestId]);

  function scheduleChange(next: Record<string, number>) {
    setDirty(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (adjust.approval) {
        lastSentRef.current = { users: next.users, timelineMonths: next.timelineMonths };
        adjust.respond({ numericValue: next });
        setDirty(false);
        setTimeout(refresh, 2000);
      } else {
        setQueuedChange(next);
      }
    }, DEBOUNCE_MS);
  }

  if (!buyerId || !vendorId) {
    return (
      <div>
        <PageHeader eyebrow="Scenario Engine" title="What if...?" description="Confirm a vendor first to run scenarios against your solution model." />
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
        <AgentWaitingState variant="fullpage" title="Loading your baseline projection" />
      </div>
    );
  }

  const isEstimate = Boolean(roi) && (users !== roiBaseUsers || timelineMonths !== roiBaseTimeline);
  const displayedRoi: RoiProjection | null = roi
    ? isEstimate
      ? estimateScenarioRoi(toRoiProjection(roi), roiBaseUsers ?? users, roiBaseTimeline ?? timelineMonths, users, timelineMonths)
      : toRoiProjection(roi)
    : null;

  return (
    <div>
      <PageHeader
        eyebrow="Explore What-If Scenarios"
        title="What if...?"
        description="Adjust your assumptions — the impact updates instantly, refined by the Solution Model Agent in the background."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Adjust assumptions
            </CardTitle>
            <CardDescription>Updates instantly as you drag, then settles 0.7s after you stop and sends to the agent for a refined recompute.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-4">
            <ScenarioSlider
              label="Number of users"
              value={users}
              min={50}
              max={5000}
              step={50}
              onChange={(v) => {
                setUsers(v);
                scheduleChange({ users: v, timelineMonths });
              }}
              formatValue={(v) => formatNumber(v)}
            />
            <ScenarioSlider
              label="Implementation timeline"
              value={timelineMonths}
              min={1}
              max={24}
              step={1}
              suffix=" months"
              onChange={(v) => {
                setTimelineMonths(v);
                scheduleChange({ users, timelineMonths: v });
              }}
            />

            {adjust.responding && (
              <p className="flex items-center gap-1.5 text-xs text-muted"><Loader2 className="h-3 w-3 animate-spin" /> Recomputing…</p>
            )}
            {adjust.error && <p className="text-xs text-escalated">{adjust.error}</p>}

            {(baselineUsers !== null || baselineTimeline !== null) && (
              <div className="rounded-xl bg-surface-2 p-3.5">
                <p className="text-xs font-medium text-subtle">Baseline (from your Client Reality Profile)</p>
                <p className="mt-1 text-sm text-foreground">
                  {baselineUsers !== null && `${formatNumber(baselineUsers)} users`}
                  {baselineUsers !== null && baselineTimeline !== null && " · "}
                  {baselineTimeline !== null && `${baselineTimeline}-month timeline`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            {isEstimate ? (
              <Badge variant="outline">
                <Clock className="h-3 w-3" /> Instant estimate for these inputs — refines once the agent recomputes
              </Badge>
            ) : (
              <Badge variant="modelled">
                <Sparkles className="h-3 w-3" /> Modelled projection — from the agent, not client-side math
              </Badge>
            )}
          </div>
          {displayedRoi ? (
            <RoiWidget roi={displayedRoi} />
          ) : (
            <AgentWaitingState
              variant="card"
              title="Modelling your baseline"
              description="This fills in once the Solution Model Agent runs Solution Scenarios."
            />
          )}

          <Card className="h-[420px]">
            <CardHeader className="flex-row items-center gap-2 pb-2">
              <MessageSquareText className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              <CardTitle className="text-sm">Ask about this scenario</CardTitle>
            </CardHeader>
            <div className="h-[calc(420px-52px)]">
              <LiveChatPanel buyerId={buyerId} workflowRunIds={workflowRunIds} nodeKey="answer_scenario_questions" />
            </div>
          </Card>
          {!solutionModelId && <p className="text-xs text-subtle">Vendor: {vendorName ?? "—"}</p>}
        </div>
      </div>
    </div>
  );
}
