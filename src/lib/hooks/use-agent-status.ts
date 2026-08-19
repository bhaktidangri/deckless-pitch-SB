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
import { getPendingApproval, type BuyerApprovalNodeKey, type BuyerApprovalRequestRow } from "@/lib/api/buyer-lookup";
import { POLL_INTERVAL_MS } from "@/lib/buyer-poll";

export type AgentStatus = "idle" | "working" | "needs_input";

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
  label: string;
  href: string | null;
}

export function useAgentStatus(buyerId: string | null | undefined): AgentStatusResult {
  const [approval, setApproval] = useState<BuyerApprovalRequestRow | null>(null);
  const [checkedOnce, setCheckedOnce] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!buyerId) return;
    try {
      const found = await getPendingApproval({ buyerId });
      setApproval((prev) => (prev?.requestId === found?.requestId ? prev : found));
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

  if (!buyerId) return { status: "idle", approval: null, label: "Start a discovery request", href: "/buyer/discover" };
  if (approval) {
    return {
      status: "needs_input",
      approval,
      label: APPROVAL_NODE_LABEL[approval.nodeKey] ?? "Respond to the agent",
      href: APPROVAL_NODE_ROUTE[approval.nodeKey] ?? "/buyer",
    };
  }
  return {
    status: checkedOnce ? "working" : "idle",
    approval: null,
    label: checkedOnce ? "All caught up" : "Checking…",
    href: null,
  };
}
