"use client";

// Shared polling hook for the buyer workflow's HITL bridge (see
// buyer-lookup.ts's getPendingApproval and buyer-approvals.ts's
// respondToApproval). Each of the 6 human_approval pages uses this to ask
// "is the run currently paused at my node?" and gets back the live approval
// row plus a respond() call that resumes it — the page itself owns how to
// render the control (buttons, a slider, curated questions + free text)
// since that differs per node.
import { useCallback, useEffect, useRef, useState } from "react";
import { getPendingApproval, type BuyerApprovalNodeKey, type BuyerApprovalRequestRow } from "@/lib/api/buyer-lookup";
import { respondToApproval } from "@/lib/api/buyer-approvals";
import { POLL_INTERVAL_MS } from "@/lib/buyer-poll";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";

export function usePendingApproval(
  nodeKey: BuyerApprovalNodeKey,
  opts: { buyerId?: string | null; workflowRunIds?: string[]; enabled?: boolean }
) {
  const { buyerId, workflowRunIds, enabled = true } = opts;
  const [approval, setApproval] = useState<BuyerApprovalRequestRow | null>(null);
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Callers derive workflowRunIds via getStoredBuyerWorkflowRunIds() on every
  // render (a fresh array each time), so depend on its serialized contents
  // rather than the reference itself to avoid re-subscribing every render.
  const workflowRunIdsKey = (workflowRunIds ?? []).join(",");

  const refresh = useCallback(async () => {
    if (!enabled || (!buyerId && (!workflowRunIds || workflowRunIds.length === 0))) return;
    try {
      const found = await getPendingApproval({ buyerId, workflowRunIds, nodeKey });
      setApproval((prev) => (prev?.requestId === found?.requestId ? prev : found));
    } catch {
      // transient read error — next tick tries again
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerId, workflowRunIdsKey, nodeKey, enabled]);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  useRealtimeRefresh(
    enabled && buyerId ? [{ table: "buyer_workflow_approval_requests", filter: `buyer_id=eq.${buyerId}` }] : [],
    refresh,
    [enabled, buyerId]
  );

  const respond = useCallback(
    async (answer: { optionId?: string; text?: string; numericValue?: Record<string, number> }) => {
      if (!approval) return;
      setResponding(true);
      setError(null);
      try {
        await respondToApproval(approval.requestId, answer);
        setApproval(null);
        // Give the agent a moment to run its Save tool(s) and (for looping
        // steps like What-If Scenarios) potentially re-pause at the same
        // node before the next poll tick fires.
        setTimeout(refresh, POLL_INTERVAL_MS);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not send your answer.");
      } finally {
        setResponding(false);
      }
    },
    [approval, refresh]
  );

  return { approval, responding, error, respond, refresh };
}
