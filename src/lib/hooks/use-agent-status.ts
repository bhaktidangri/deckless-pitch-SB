"use client";

// Single cross-page "where does the agent stand right now" signal for the
// buyer portal. Every buyer page used to run its own independent poll and
// show its own "Loading…" / HITL card with no way to know, from any *other*
// page, that the agent was waiting on you — this hook is the one flow all
// of them now share (surfaced via <AgentStatusPill> in the portal header).
//
// It reuses the exact same read the per-page usePendingApproval() hooks
// already make (getPendingApproval), just without a nodeKey filter, so it
// finds a pause anywhere in the buyer's journey, not just on the page
// you're currently looking at.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getActiveSolutionModelForBuyer,
  getLatestBuyerWorkflowRun,
  getLatestSolutionDeck,
  getPendingApproval,
  type BuyerApprovalNodeKey,
  type BuyerApprovalRequestRow,
  type BuyerWorkflowRunRow,
} from "@/lib/api/buyer-lookup";
import { POLL_INTERVAL_MS } from "@/lib/buyer-poll";
import { isSolutionMarkedComplete, markSolutionComplete } from "@/lib/buyer-session";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";

export type AgentStatus = "idle" | "working" | "needs_input" | "completed";

// Where the buyer should go to answer a pause at each node — lets the
// status pill deep-link straight to the right page instead of making them
// hunt for which one has the waiting card.
export const APPROVAL_NODE_ROUTE: Record<BuyerApprovalNodeKey, string> = {
  confirm_vendor_selection: "/buyer/vendors",
  adaptive_discovery_questioning: "/buyer/discover",
  adjust_scenario_assumptions: "/buyer/scenarios",
  answer_scenario_questions: "/buyer/scenarios",
  query_workspace_evidence: "/buyer/chat",
  approve_human_handoff: "/buyer/handoff",
  unknown: "/buyer",
};

const APPROVAL_NODE_LABEL: Record<BuyerApprovalNodeKey, string> = {
  confirm_vendor_selection: "Confirm your vendor",
  adaptive_discovery_questioning: "Answer discovery questions",
  adjust_scenario_assumptions: "Review scenario assumptions",
  answer_scenario_questions: "Answer a scenario question",
  query_workspace_evidence: "Reply in Ask AI",
  approve_human_handoff: "Confirm expert handoff",
  unknown: "Respond to the agent",
};

export interface AgentStatusResult {
  status: AgentStatus;
  approval: BuyerApprovalRequestRow | null;
  run: BuyerWorkflowRunRow | null;
  label: string;
  href: string | null;
  /** When the current run actually started, for a durable elapsed-time readout that survives navigation. */
  startedAt: string | null;
}

export function useAgentStatus(buyerId: string | null | undefined): AgentStatusResult {
  const [approval, setApproval] = useState<BuyerApprovalRequestRow | null>(null);
  // Latest run row — mostly useful for its started_at timestamp. Its
  // *status* field is NOT trusted for "completed": nothing in this codebase
  // ever writes status="completed" onto it (that was meant to come from a
  // "scheduled Yoxa-sync task" that was never actually built — a run can sit
  // at status="running" for hours after the agent finished everything). See
  // buyer_workflow_runs (0004 migration) for how the row itself gets
  // populated: the trigger route creates it, the discover page backfills
  // buyerId.
  const [run, setRun] = useState<BuyerWorkflowRunRow | null>(null);
  // The one signal that's actually real: finalize-solution-workspace's last
  // action is flipping the model to status="active", and a ready deck (agent
  // or the local fallback generator) only ever exists once real solution
  // data exists to build it from. Either is durable, server-side proof the
  // agent produced final output — unlike run.status, checked here as ground
  // truth for "completed" instead of a signal nothing ever sends.
  const [hasFinalOutput, setHasFinalOutput] = useState(false);
  const [checkedOnce, setCheckedOnce] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Synchronous, client-only check (inside an effect, not a useState
  // initializer, so there's no SSR/hydration mismatch risk) — if a previous
  // mount already confirmed completion for this buyer, reflect that
  // instantly instead of waiting on the real network refresh below, so
  // switching pages never flashes "still working" for something already
  // known to be done.
  useEffect(() => {
    if (buyerId && isSolutionMarkedComplete(buyerId)) {
      setHasFinalOutput(true);
      setCheckedOnce(true);
    }
  }, [buyerId]);

  const refresh = useCallback(async () => {
    if (!buyerId) return;
    try {
      const [found, latestRun, activeModel, latestDeck] = await Promise.all([
        getPendingApproval({ buyerId }),
        getLatestBuyerWorkflowRun(buyerId),
        getActiveSolutionModelForBuyer(buyerId),
        getLatestSolutionDeck(buyerId),
      ]);
      setApproval((prev) => (prev?.requestId === found?.requestId ? prev : found));
      setRun((prev) => (prev?.id === latestRun?.id && prev?.status === latestRun?.status ? prev : latestRun));
      const complete = Boolean(activeModel) || latestDeck?.status === "ready";
      setHasFinalOutput(complete);
      if (complete) markSolutionComplete(buyerId);
    } catch {
      // transient read error — next tick tries again
    } finally {
      setCheckedOnce(true);
    }
  }, [buyerId]);

  // Realtime is the primary signal now (near-instant instead of up to
  // POLL_INTERVAL_MS stale); the interval below stays as a safety net for
  // when the socket silently drops.
  useRealtimeRefresh(
    buyerId
      ? [
          { table: "buyer_workflow_approval_requests", filter: `buyer_id=eq.${buyerId}` },
          { table: "buyer_workflow_runs", filter: `buyer_id=eq.${buyerId}` },
          { table: "solution_models", filter: `buyer_id=eq.${buyerId}` },
          { table: "buyer_solution_decks", filter: `buyer_id=eq.${buyerId}` },
        ]
      : [],
    refresh,
    [buyerId]
  );

  useEffect(() => {
    if (!buyerId) return;
    refresh();
    intervalRef.current = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [buyerId, refresh]);

  if (!buyerId)
    return { status: "idle", approval: null, run: null, label: "Start a discovery request", href: "/buyer/discover", startedAt: null };
  if (approval) {
    return {
      status: "needs_input",
      approval,
      run,
      label: APPROVAL_NODE_LABEL[approval.nodeKey] ?? "Respond to the agent",
      href: APPROVAL_NODE_ROUTE[approval.nodeKey] ?? "/buyer",
      startedAt: run?.startedAt ?? null,
    };
  }
  // "Done" means real final output exists (see hasFinalOutput above) or —
  // should a completion signal ever actually get wired up — run.status says
  // so. No pending approval on its own just means nothing is paused *right
  // now*, which during a still-running workflow is the common case between
  // steps, so it's not treated as completion by itself.
  if (run?.status === "completed" || hasFinalOutput) {
    return {
      status: "completed",
      approval: null,
      run,
      label: "Your solution is ready",
      href: "/buyer/solution",
      startedAt: run?.startedAt ?? null,
    };
  }
  return {
    status: checkedOnce ? "working" : "idle",
    approval: null,
    run,
    label: checkedOnce ? "Agent working…" : "Checking…",
    href: null,
    startedAt: run?.startedAt ?? null,
  };
}
