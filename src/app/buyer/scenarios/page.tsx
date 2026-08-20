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

// PRD §7.6: this page's fixed client-side ROI formula is explicitly called
// out as needing to be replaced with real agent output — there's no local
// math left here. Adjust Scenario Assumptions is human_approval mapped onto
// a continuous slider (PRD §7.3); this treats each debounced "settle" as one
// approval round-trip, per the PRD's own suggested resolution.
export default function ScenariosPage() {
  const { buyerId, vendorId, vendorName } = useBuyerSession();
  const workflowRunIds = getStoredBuyerWorkflowRunIds();

  const [solutionModelId, setSolutionModelId] = useState<string | null>(null);
  const [roi, setRoi] = useState<RoiProjectionRow | null>(null);
  const [baselineUsers, setBaselineUsers] = useState<number | null>(null);
  const [baselineTimeline, setBaselineTimeline] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState(500);
  const [timelineMonths, setTimelineMonths] = useState(6);
  const [dirty, setDirty] = useState(false);
  const [queuedChange, setQueuedChange] = useState<Record<string, number> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerId, vendorId]);

  // Deliver a debounce-settled or queued change the moment the run pauses
  // at Adjust Scenario Assumptions.
  useEffect(() => {
    if (adjust.approval && queuedChange) {
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

  return (
    <div>
      <PageHeader
        eyebrow="Explore What-If Scenarios"
        title="What if...?"
        description="Adjust your assumptions — every recalculation comes from the Solution Model Agent, grounded in the same vendor capabilities and fit-and-gap assessment."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Adjust assumptions
            </CardTitle>
            <CardDescription>Settles 0.7s after you stop dragging, then sends to the agent to recompute.</CardDescription>
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

            {(dirty || queuedChange) && !adjust.approval && (
              <div className="flex items-start gap-2.5 rounded-xl border border-modelled-border bg-modelled-bg p-3.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-modelled" />
                <p className="text-xs text-foreground/80">Waiting for the agent to be ready for a scenario adjustment — your change will send automatically.</p>
              </div>
            )}
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
            <Badge variant="modelled">
              <Sparkles className="h-3 w-3" /> Modelled projection — from the agent, not client-side math
            </Badge>
          </div>
          {roi ? (
            <RoiWidget roi={toRoiProjection(roi)} />
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
