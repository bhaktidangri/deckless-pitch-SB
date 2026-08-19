import { NextResponse } from "next/server";

// Receives Yoxa's push for Step 6's "Generate Solution Pitch Deck" Output
// Tool (and, per PRD §7.4, potentially a regenerated deck fired after a
// What-If Scenarios change, if that gap ever gets a wired tool call) and
// persists it via save-buyer-solution-deck, so /buyer/solution can poll and
// link to it. Mirrors src/app/api/webhooks/yoxa-pptx/route.ts.
//
// This URL must be registered as a webhook endpoint on the buyer deployment
// in the Yoxa dashboard — see supabase-buyer/README.md. Payload shape is
// unconfirmed (same caveat as yoxa-pptx's own comment) — field lookups below
// are permissive across plausible variants, and the full raw body is always
// forwarded as rawPayload so this can be tightened once a real delivery is
// observed. fileBase64 is captured but not yet uploaded to storage here
// (unlike the vendor-side function this mirrors) — if a real delivery only
// ever carries fileBase64 and never fileUrl, that upload step needs adding
// to save-buyer-solution-deck before decks actually show up.
export async function POST(req: Request) {
  const secret = process.env.YOXA_BUYER_DEPLOYMENT_SECRET;
  const provided = req.headers.get("X-Yoxa-Deployment-Secret") ?? req.headers.get("x-yoxa-deployment-secret");
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Invalid webhook credentials." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const payload = (body.output ?? body.result ?? body.tool_output ?? body.request_payload ?? {}) as Record<
    string,
    unknown
  >;

  const buyerId = (body.buyerId ?? body.buyer_id ?? payload.buyerId ?? payload.buyer_id) as string | undefined;
  const vendorId = (body.vendorId ?? body.vendor_id ?? payload.vendorId ?? payload.vendor_id) as string | undefined;
  const solutionModelId = (body.solutionModelId ?? body.solution_model_id ?? payload.solutionModelId) as
    | string
    | undefined;
  const workflowRunId = (body.workflow_run_id ?? body.workflowRunId) as string | undefined;
  const title = (body.title ?? payload.title ?? "Solution Pitch Deck") as string | undefined;
  const fileUrl = (body.file_url ?? body.fileUrl ?? payload.file_url ?? payload.fileUrl ?? payload.pptx_url) as
    | string
    | undefined;
  const fileBase64 = (body.file_base64 ?? body.fileBase64 ?? payload.file_base64 ?? payload.fileBase64) as
    | string
    | undefined;
  const fileName = (body.file_name ?? body.fileName ?? payload.file_name ?? payload.fileName) as string | undefined;

  if (!buyerId) {
    return NextResponse.json({ error: "buyerId is required." }, { status: 400 });
  }

  const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!functionsUrl || !anonKey) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const res = await fetch(`${functionsUrl}/functions/v1/save-buyer-solution-deck`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    body: JSON.stringify({
      buyerId,
      vendorId,
      solutionModelId,
      workflowRunId,
      title,
      fileUrl,
      fileBase64,
      fileName,
      rawPayload: body,
    }),
  });
  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  return NextResponse.json(data, { status: res.status });
}
