import { NextResponse } from "next/server";

// Receives Yoxa's push for the "Generate and Upload Vendor Knowledge PPTX"
// Output Tool (Milestone 2 — runs automatically right after publish, no
// human approval gate) and persists it via the save-vendor-knowledge-
// document edge function, so /vendor/solution-dna can poll and link to it.
//
// This URL must be registered as a webhook endpoint in the Yoxa dashboard,
// same as api/webhooks/yoxa-hitl — there's no discoverable API to set it,
// and it must be publicly reachable (a local dev server needs a tunnel).
//
// Payload shape is UNCONFIRMED: this Output Tool type is new (added when the
// "Request Vendor DNA Approval" human-approval step was removed from
// Milestone 2), and no real delivery has been observed yet. Field lookups
// below are deliberately permissive across plausible naming variants, and
// the full raw body is always forwarded as rawPayload for forensics — if
// vendorId or the file end up missing on a real delivery, inspect
// raw_payload on the vendor_knowledge_documents row to find the real shape
// and tighten this extraction.
export async function POST(req: Request) {
  const secret = process.env.YOXA_DEPLOYMENT_SECRET;
  const provided = req.headers.get("X-Yoxa-Deployment-Secret") ?? req.headers.get("x-yoxa-deployment-secret");
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Invalid webhook credentials." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const payload = (body.output ?? body.result ?? body.tool_output ?? body.request_payload ?? {}) as Record<
    string,
    unknown
  >;

  const vendorId = (body.vendorId ?? body.vendor_id ?? payload.vendorId ?? payload.vendor_id) as string | undefined;
  const workflowRunId = (body.workflow_run_id ?? body.workflowRunId) as string | undefined;
  const title = (body.title ?? payload.title ?? "Vendor Knowledge Deck") as string | undefined;
  const fileUrl = (body.file_url ?? body.fileUrl ?? payload.file_url ?? payload.fileUrl ?? payload.pptx_url) as
    | string
    | undefined;
  const fileBase64 = (body.file_base64 ?? body.fileBase64 ?? payload.file_base64 ?? payload.fileBase64) as
    | string
    | undefined;
  const fileName = (body.file_name ?? body.fileName ?? payload.file_name ?? payload.fileName) as string | undefined;
  const indexedSections = (body.indexed_sections ?? body.indexedSections ?? payload.indexed_sections) as unknown;

  if (!vendorId) {
    return NextResponse.json({ error: "vendorId is required." }, { status: 400 });
  }

  const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!functionsUrl || !anonKey) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const res = await fetch(`${functionsUrl}/functions/v1/save-vendor-knowledge-document`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    body: JSON.stringify({
      vendorId,
      workflowRunId,
      title,
      fileUrl,
      fileBase64,
      fileName,
      indexedSections,
      rawPayload: body,
    }),
  });
  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  return NextResponse.json(data, { status: res.status });
}
