// Vendor-side reads of the buyer workflow's capability_frontier /
// meeting_requests tables, plus the two new write calls that close PRD
// §7.7's stated blocker ("the vendor pages currently have no working
// answer/confirm controls"). Read pattern mirrors buyer-lookup.ts; the two
// writes call the new resolve-capability-frontier-item /
// confirm-vendor-discussion-meeting functions staged in supabase-buyer/.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function restGet<T>(path: string): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase is not configured.");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    cache: "no-store",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase read failed (${res.status}) for ${path}.`);
  return res.json() as Promise<T>;
}

async function callFunction<T>(slug: string, body: unknown): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase is not configured.");
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : `${slug} failed (${res.status}).`);
  return data as T;
}

export interface VendorFrontierItemRow {
  id: string;
  buyerId: string;
  question: string;
  status: "open" | "vendor_review" | "vendor_answered" | "resolved" | "closed";
  requirement: string | null;
  context: string | null;
  evidenceChecked: string[];
  reasonUnresolved: string | null;
  recommendedExpert: string | null;
  vendorResponse: string | null;
  createdAt: string;
}

export async function getFrontierItemsForVendor(vendorId: string): Promise<VendorFrontierItemRow[]> {
  const params = new URLSearchParams({
    select:
      "id,buyer_id,question,status,requirement,context,evidence_checked,reason_unresolved,recommended_expert,vendor_response,created_at",
    vendor_id: `eq.${vendorId}`,
    order: "created_at.desc",
  });
  const rows = await restGet<
    {
      id: string;
      buyer_id: string;
      question: string;
      status: VendorFrontierItemRow["status"];
      requirement: string | null;
      context: string | null;
      evidence_checked: string[] | null;
      reason_unresolved: string | null;
      recommended_expert: string | null;
      vendor_response: string | null;
      created_at: string;
    }[]
  >(`capability_frontier?${params}`);
  return rows.map((r) => ({
    id: r.id,
    buyerId: r.buyer_id,
    question: r.question,
    status: r.status,
    requirement: r.requirement,
    context: r.context,
    evidenceChecked: r.evidence_checked ?? [],
    reasonUnresolved: r.reason_unresolved,
    recommendedExpert: r.recommended_expert,
    vendorResponse: r.vendor_response,
    createdAt: r.created_at,
  }));
}

export function resolveCapabilityFrontierItem(frontierItemId: string, vendorResponse: string) {
  return callFunction<{ frontierItemId: string; status: string; vendorResponse: string }>("resolve-capability-frontier-item", {
    frontierItemId,
    vendorResponse,
  });
}

export interface VendorMeetingRequestRow {
  id: string;
  buyerId: string;
  status: "requested" | "scheduled" | "completed" | "cancelled";
  proposedDate: string | null;
  expert: string | null;
  unresolvedCount: number;
  createdAt: string;
}

export async function getMeetingRequestsForVendor(vendorId: string): Promise<VendorMeetingRequestRow[]> {
  const params = new URLSearchParams({
    select: "id,buyer_id,status,proposed_date,expert,unresolved_count,created_at",
    vendor_id: `eq.${vendorId}`,
    order: "created_at.desc",
  });
  const rows = await restGet<
    { id: string; buyer_id: string; status: VendorMeetingRequestRow["status"]; proposed_date: string | null; expert: string | null; unresolved_count: number | null; created_at: string }[]
  >(`meeting_requests?${params}`);
  return rows.map((r) => ({
    id: r.id,
    buyerId: r.buyer_id,
    status: r.status,
    proposedDate: r.proposed_date,
    expert: r.expert,
    unresolvedCount: r.unresolved_count ?? 0,
    createdAt: r.created_at,
  }));
}

export function confirmVendorDiscussionMeeting(meetingRequestId: string, confirmedDate?: string) {
  return callFunction<{ meetingRequestId: string; status: string; proposedDate: string | null }>(
    "confirm-vendor-discussion-meeting",
    { meetingRequestId, confirmedDate }
  );
}
