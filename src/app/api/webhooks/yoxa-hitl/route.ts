import { NextResponse } from "next/server";

// Receives Yoxa's hitl.approval_requested push for "Request Vendor DNA
// Approval" (PRD 5.3.3) and persists it via the save-vendor-dna-approval-
// request edge function, so /vendor/solution-dna can poll and render it.
//
// This URL must be registered as the deployment's webhook endpoint in the
// Yoxa dashboard — there's no discoverable API to set it, and it must be
// publicly reachable (a local dev server needs a tunnel, e.g. ngrok, for
// Yoxa to be able to reach it at all).
//
// Payload shape is inferred from operator-log renderings of the "Request
// Vendor DNA Approval" tool call (request_title/request_description/
// options — no capability_id or response_url field on the tool args
// themselves; capability_id is embedded as text in request_description,
// see CAPABILITY_ID_PREFIX below). The envelope Yoxa wraps that call in to
// actually deliver this webhook (request_id, workflow_run_id, response_url)
// still hasn't been observed directly, so those field-name lookups stay
// permissive across variants — raw_payload is stored on every save so a
// real delivery can be inspected if response_url still ends up null.
//
// Verification is a placeholder: checks X-Yoxa-Deployment-Secret against
// our own deployment secret, the only shared-secret mechanism confirmed to
// exist on this platform. Replace with Yoxa's actual signature scheme (e.g.
// an HMAC header) once documented — right now a caller who somehow learned
// the deployment secret could forge approval-request rows.
export async function POST(req: Request) {
  const secret = process.env.YOXA_DEPLOYMENT_SECRET;
  const provided = req.headers.get("X-Yoxa-Deployment-Secret") ?? req.headers.get("x-yoxa-deployment-secret");
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Invalid webhook credentials." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const payload = (body.request_payload as Record<string, unknown> | undefined) ?? {};

  const requestId = (body.request_id ?? body.requestId) as string | undefined;
  const workflowRunId = (body.workflow_run_id ?? body.workflowRunId) as string | undefined;
  const title = (body.request_title ?? body.title ?? payload.request_title) as string | undefined;
  const rawDescription = (body.request_description ?? body.description ?? payload.request_description) as
    | string
    | undefined;
  const options = (body.approval_options ?? body.options ?? payload.approval_options) as unknown;
  // Previously only checked top-level fields — every stored row had a null
  // response_url as a result, so a vendor's decision could never actually be
  // forwarded back to Yoxa to resume the paused run. Now also falls back to
  // request_payload, matching the pattern already used for title/description/
  // options above.
  const responseUrl = (body.response_url ??
    body.responseUrl ??
    body.respond_url ??
    body.callback_url ??
    payload.response_url ??
    payload.responseUrl ??
    payload.respond_url ??
    payload.callback_url) as string | undefined;
  // capability_id is never a structured field on this tool's args — Yoxa's
  // agent embeds it as the first line of request_description instead, e.g.
  // "Capability ID: bdc21456-a0f1-4fef-8116-2e238b3c29af\n\nExtracted
  // claim: ..." (confirmed against a live operator log). Structured fields
  // are still checked first in case a future payload shape adds one.
  const CAPABILITY_ID_PREFIX = /^Capability ID:\s*([0-9a-fA-F-]{36})\s*\n+/;
  const embeddedMatch = rawDescription?.match(CAPABILITY_ID_PREFIX);
  const capabilityId = (body.capability_id ?? body.capabilityId ?? payload.capability_id ?? payload.capabilityId ??
    embeddedMatch?.[1]) as string | undefined;
  // Strip the "Capability ID: ..." line before it's shown to the vendor —
  // it's plumbing, not part of the question being asked.
  const description = embeddedMatch ? rawDescription!.slice(embeddedMatch[0].length) : rawDescription;
  const deploymentId = (body.deployment_id ?? body.deploymentId) as string | undefined;

  if (!requestId || !workflowRunId) {
    return NextResponse.json({ error: "request_id and workflow_run_id are required." }, { status: 400 });
  }

  const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!functionsUrl || !anonKey) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const res = await fetch(`${functionsUrl}/functions/v1/save-vendor-dna-approval-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    body: JSON.stringify({
      requestId,
      workflowRunId,
      deploymentId,
      capabilityId,
      title,
      description,
      options,
      responseUrl,
      // Raw body kept for forensics — the real Yoxa payload shape has never
      // been directly observed, only inferred from operator-log rendering.
      // If response_url/capability_id still show up null on new rows after
      // this change, inspect raw_payload to find the actual field names.
      rawPayload: body,
    }),
  });
  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  return NextResponse.json(data, { status: res.status });
}
