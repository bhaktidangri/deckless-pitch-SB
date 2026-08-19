// Reads pending Yoxa "Request Vendor DNA Approval" HITL requests directly
// from Supabase (public read, same pattern as vendor-lookup.ts) and submits
// decisions back through our own /api/vendor-dna-approvals/[id]/respond
// route, which forwards them to Yoxa so a paused agent run can resume.
//
// This is a best-effort addition on top of the already-working direct
// Query/Publish flow (see solution-dna/page.tsx) — if no webhook has been
// registered with Yoxa yet, no pending rows will ever exist here, and the
// rest of the review/publish flow keeps working exactly as before.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export interface PendingApprovalRequest {
  requestId: string;
  capabilityId: string | null;
  title: string | null;
  description: string | null;
  options: { option_id: string; title: string; description: string; decision: string }[];
}

export async function findPendingApprovalForCapability(capabilityId: string): Promise<PendingApprovalRequest | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const params = new URLSearchParams({
    select: "request_id,capability_id,title,description,options",
    capability_id: `eq.${capabilityId}`,
    status: "eq.pending",
    order: "created_at.desc",
    limit: "1",
  });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/vendor_dna_approval_requests?${params}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as {
    request_id: string;
    capability_id: string | null;
    title: string | null;
    description: string | null;
    options: PendingApprovalRequest["options"];
  }[];
  const row = rows[0];
  if (!row) return null;
  return {
    requestId: row.request_id,
    capabilityId: row.capability_id,
    title: row.title,
    description: row.description,
    options: row.options ?? [],
  };
}

// Primary lookup path: workflow_run_id is present on every approval-request
// row (unlike capability_id, which Yoxa's "Request Vendor DNA Approval" tool
// doesn't send — see api/webhooks/yoxa-hitl/route.ts). Scoped to the run ids
// this browser actually triggered (vendor-session's addStoredWorkflowRunId),
// so solution-dna can surface real pending HITL questions instead of relying
// on the capability-card piggyback ever lining up.
export async function findPendingApprovalsForWorkflowRuns(runIds: string[]): Promise<PendingApprovalRequest[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || runIds.length === 0) return [];
  const params = new URLSearchParams({
    select: "request_id,capability_id,title,description,options",
    workflow_run_id: `in.(${runIds.join(",")})`,
    status: "eq.pending",
    order: "created_at.desc",
  });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/vendor_dna_approval_requests?${params}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as {
    request_id: string;
    capability_id: string | null;
    title: string | null;
    description: string | null;
    options: PendingApprovalRequest["options"];
  }[];
  return rows.map((row) => ({
    requestId: row.request_id,
    capabilityId: row.capability_id,
    title: row.title,
    description: row.description,
    options: row.options ?? [],
  }));
}

// approve_as_is/revise -> option_1/2 (approved), reject -> option_3, leave
// pending -> option_4, per the fixed 4-choice contract in PRD 5.3.3.
export type ApprovalOptionId = "option_1" | "option_2" | "option_3" | "option_4";

export async function respondToApprovalRequest(requestId: string, optionId: ApprovalOptionId): Promise<boolean> {
  try {
    const res = await fetch(`/api/vendor-dna-approvals/${requestId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { yoxaNotified?: boolean };
    return Boolean(data.yoxaNotified);
  } catch {
    return false;
  }
}
