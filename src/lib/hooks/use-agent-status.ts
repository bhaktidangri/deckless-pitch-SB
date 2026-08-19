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
import { getLatestBuyerWorkflowRun, getPendingApproval, type BuyerApprovalNodeKey, type BuyerApprovalRequestRow, type BuyerWorkflowRunRow } from "@/lib/api/buyer-lookup";
import { POLL_INTERVAL_MS } from "@/lib/buyer-poll";

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
}

export function useAgentStatus(buyerId: string | null | undefined): AgentStatusResult {
  const [approval, setApproval] = useState<BuyerApprovalRequestRow | null>(null);
  // Latest run's completion status — this is what makes "the agent ended"
  // actually visible anywhere, instead of the old behavior where a finished
  // run and a still-working one both just showed "All caught up" /
  // "working" forever, with nothing to distinguish them. See
  // buyer_workflow_runs (0004 migration) for how this row gets populated:
  // the trigger route creates it, the discover page backfills buyerId, and
  // the scheduled Yoxa-sync task flips status to "completed".
  const [run, setRun] = useState<BuyerWorkflowRunRow | null>(null);
  const [checkedOnce, setCheckedOnce] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!buyerId) return;
    try {
      const [found, latestRun] = await Promise.all([
        getPendingApproval({ buyerId }),
        getLatestBuyerWorkflowRun(buyerId),
      ]);
      setApproval((prev) => (prev?.requestId === found?.requestId ? prev : found));
      setRun((prev) => (prev?.id === latestRun?.id && prev?.status === latestRun?.status ? prev : latestRun));
    } catch {
      // transient read error — next tick tries again
    } finally {
      setCheckedOnce(true);
    }
  }, [buyerId]);

  useEffect(() => {
    if (!buyerId) return;
    refresh();
    intervalRef.current = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [buyerId, refresh]);

  if (!buyerId) return { status: "idle", approval: null, run: null, label: "Start a discovery request", href: "/buyer/discover" };
  if (approval) {
    return {
      status: "needs_input",
      approval,
      run,
      label: APPROVAL_NODE_LABEL[approval.nodeKey] ?? "Respond to the agent",
      href: APPROVAL_NODE_ROUTE[approval.nodeKey] ?? "/buyer",
    };
  }
  // A run is only "done" once Yoxa itself reports completion (via the sync
  // task) — no pending approval just means nothing is paused *right now*,
  // which during a still-running workflow is the common case between steps.
  if (run?.status === "completed") {
    return {
      status: "completed",
      approval: null,
      run,
      label: "Your solution is ready",
      href: "/buyer/solution",
    };
  }
  return {
    status: checkedOnce ? "working" : "idle",
    approval: null,
    run,
    label: checkedOnce ? "All caught up" : "Checking…",
    href: null,
  };
}
