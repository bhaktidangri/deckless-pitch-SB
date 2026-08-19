import { NextResponse } from "next/server";

// Receives Yoxa's hitl.approval_requested push whenever the buyer workflow
// pauses at one of its 6 "Ask Human for Approval" nodes (PRD §5, §7.1) and
// persists it via the save-buyer-approval-request edge function, so the
// relevant buyer/vendor page can poll for it (getPendingApproval in
// buyer-lookup.ts) and render the right control.
//
// This URL must be registered as the buyer deployment's webhook endpoint in
// the Yoxa dashboard — there's no discoverable API to set it, same
// limitation already documented on the vendor side's (now deleted)
// api/webhooks/yoxa-hitl/route.ts. Must be publicly reachable.
//
// Payload field names for request_id/workflow_run_id/response_url are still
// reconstructed from the vendor-side workflow's own now-deleted hitl webhook
// (git history: 0004-Replace-human-approval-gate-with-automated-PPTX-
// know.patch) — no real webhook delivery for *this* deployment has been
// observed yet, only the Yoxa dashboard's own activity-log rendering of the
// tool call's *arguments* (request_title/request_description/options), which
// is not necessarily the same envelope our registered webhook receives.
// raw_payload is always stored so this can be corrected once a real delivery
// lands.
//
// The options shape IS now confirmed from that dashboard log, though:
// [{ title, description, decision }] — not the { id, label } this code
// originally guessed. decision (seen values: "approved", "escalated") is
// carried through as-is; its meaning for the human_approval flow (e.g.
// whether "escalated" options should even be offered as a button) is not
// yet understood — currently every option is rendered as a choosable button
// regardless of decision, see normalizeOptions() below.
//
// The buyer workflow has 6 approval nodes sharing one webhook, unlike the
// vendor workflow's single one — nodeKey below is a best-effort
// classification by matching the pushed title/description against each
// node's exact PRD name, since nothing in the vendor-side payload shape
// carried a structured node identifier either. Verify/tighten against real
// deliveries once webhooks are registered.
const NODE_KEY_PATTERNS: [RegExp, string][] = [
  [/request buyer vendor selection/i, "confirm_vendor_selection"],
  [/adaptive discovery questioning/i, "adaptive_discovery_questioning"],
  [/adjust scenario assumptions/i, "adjust_scenario_assumptions"],
  [/answer scenario questions/i, "answer_scenario_questions"],
  [/query workspace evidence/i, "query_workspace_evidence"],
  [/approve human handoff/i, "approve_human_handoff"],
];

function classifyNodeKey(title?: string, description?: string): string {
  const haystack = `${title ?? ""} ${description ?? ""}`;
  for (const [pattern, key] of NODE_KEY_PATTERNS) {
    if (pattern.test(haystack)) return key;
  }
  return "unknown";
}

// Normalizes the confirmed real shape ({ title, description, decision }[])
// — and stays permissive about the { id, label } this code originally
// guessed, in case that shape shows up from a different node — into what
// buyer_workflow_approval_requests stores and ApprovalButtons renders.
// index-based ids since Yoxa's options carry no id field of their own.
function normalizeOptions(raw: unknown): { id: string; label: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((opt, i) => {
    if (opt && typeof opt === "object") {
      const o = opt as Record<string, unknown>;
      const label = (o.title ?? o.label ?? o.name) as string | undefined;
      const id = (o.id ?? label ?? `option-${i}`) as string;
      if (label) return { id: String(id), label };
    }
    return { id: `option-${i}`, label: String(opt) };
  });
}

export async function POST(req: Request) {
  const secret = process.env.YOXA_BUYER_DEPLOYMENT_SECRET;
  const provided = req.headers.get("X-Yoxa-Deployment-Secret") ?? req.headers.get("x-yoxa-deployment-secret");
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Invalid webhook credentials." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const payload = (body.request_payload as Record<string, unknown> | undefined) ?? {};

  const requestId = (body.request_id ?? body.requestId) as string | undefined;
  const workflowRunId = (body.workflow_run_id ?? body.workflowRunId) as string | undefined;
  const title = (body.request_title ?? body.title ?? payload.request_title) as string | undefined;
  const description = (body.request_description ?? body.description ?? payload.request_description) as
    | string
    | undefined;
  const options = normalizeOptions(body.options ?? body.approval_options ?? payload.options ?? payload.approval_options);
  const responseUrl = (body.response_url ??
    body.responseUrl ??
    body.respond_url ??
    body.callback_url ??
    payload.response_url ??
    payload.responseUrl ??
    payload.respond_url ??
    payload.callback_url) as string | undefined;
  // Not confirmed to ever be present — most buyer-workflow steps key off a
  // saved vendorId/buyerId server-side rather than passing them through tool
  // args, so pages mainly correlate a pause to themselves via workflow_run_id
  // (see buyer-session's stored run ids) rather than this field.
  const buyerId = (body.buyer_id ?? body.buyerId ?? payload.buyer_id ?? payload.buyerId) as string | undefined;

  if (!requestId || !workflowRunId) {
    return NextResponse.json({ error: "request_id and workflow_run_id are required." }, { status: 400 });
  }

  const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!functionsUrl || !anonKey) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const res = await fetch(`${functionsUrl}/functions/v1/save-buyer-approval-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    body: JSON.stringify({
      requestId,
      workflowRunId,
      buyerId,
      nodeKey: classifyNodeKey(title, description),
      title,
      description,
      options,
      responseUrl,
      rawPayload: body,
    }),
  });
  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  return NextResponse.json(data, { status: res.status });
}
