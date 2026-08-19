// Frontend client for responding to a paused buyer-workflow human_approval
// node. Pairs with getPendingApproval() in buyer-lookup.ts (reads the
// pause) and POST /api/buyer-approvals/[requestId]/respond (resumes it).

export interface RespondToApprovalResult {
  requestId: string;
  yoxaNotified: boolean;
  yoxaStatus?: number;
  reason?: string;
}

// `optionId` is for genuine button choices (the only field confirmed to
// resume a paused Yoxa run — see the respond route for why). `text` is for
// the two chat-shaped nodes (Query Workspace Evidence, Answer Scenario
// Questions) where the buyer typed something instead of clicking a curated
// option — sent best-effort under several field-name aliases since the
// resume contract has never been confirmed to accept free text at all (PRD
// §7.1). `numericValue` is for Adjust Scenario Assumptions' slider-settle
// round-trip.
export async function respondToApproval(
  requestId: string,
  answer: { optionId?: string; text?: string; numericValue?: Record<string, number> }
): Promise<RespondToApprovalResult> {
  const res = await fetch(`/api/buyer-approvals/${requestId}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(answer),
  });
  const data = (await res.json().catch(() => ({}))) as RespondToApprovalResult & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Could not respond to approval ${requestId}.`);
  return data;
}
