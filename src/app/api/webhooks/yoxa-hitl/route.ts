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
// Payload shape is inferred from the operator-log rendering shown in
// testing (request_id, workflow_run_id, request_title/request_description/
// approval_options, possibly nested under request_payload) — the raw
// webhook body hasn't been observed directly yet, so field lookups are
// deliberately permissive across the naming variants seen so far.
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
  const description = (body.request_description ?? body.description ?? payload.request_description) as
    | string
    | undefined;
  const options = (body.approval_options ?? body.options ?? payload.approval_options) as unknown;
  const responseUrl = (body.response_url ?? body.responseUrl ?? body.respond_url ?? body.callback_url) as
    | string
    | undefined;
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
    body: JSON.stringify({ requestId, workflowRunId, deploymentId, title, description, options, responseUrl }),
  });
  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  return NextResponse.json(data, { status: res.status });
}
