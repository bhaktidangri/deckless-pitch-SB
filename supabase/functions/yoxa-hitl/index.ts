import { createClient } from "npm:@supabase/supabase-js@2";

// Supabase Edge Function version of src/app/api/webhooks/yoxa-hitl/route.ts —
// same verified contract (HMAC signature, capability_id parsing, raw_payload
// forensics), but writes directly to vendor_dna_approval_requests using the
// service role instead of hopping through save-vendor-dna-approval-request.
//
// Verification: Yoxa sends X-Yoxa-Webhook-Signature: v1=<hex>, plus
// X-Yoxa-Webhook-Id and X-Yoxa-Webhook-Timestamp, hashed with
// YOXA_WEBHOOK_SIGNING_SECRET (a project secret, not an env var Supabase
// provides automatically — set via `supabase secrets set`). Confirmed
// against real Yoxa deliveries: signed content is `${timestamp}.${rawBody}`,
// HMAC-SHA256, hex-encoded.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-yoxa-webhook-signature, x-yoxa-webhook-timestamp, x-yoxa-webhook-id",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function verifySignature(secret: string, signatureHeader: string, timestamp: string, rawBody: string): Promise<boolean> {
  const provided = signatureHeader.replace(/^v1=/, "").toLowerCase();
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  const digestHex = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (digestHex.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < digestHex.length; i++) diff |= digestHex.charCodeAt(i) ^ provided.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const secret = Deno.env.get("YOXA_WEBHOOK_SIGNING_SECRET");
  const signatureHeader = req.headers.get("x-yoxa-webhook-signature");
  const timestamp = req.headers.get("x-yoxa-webhook-timestamp");
  const rawBody = await req.text();

  if (secret) {
    if (!signatureHeader || !timestamp || !(await verifySignature(secret, signatureHeader, timestamp, rawBody))) {
      return json({ error: "Invalid webhook signature." }, 401);
    }
  }

  let body: Record<string, unknown>;
  try {
    body = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
  } catch {
    body = {};
  }

  const eventType = (body.event ?? body.type ?? body.event_type) as string | undefined;
  if (eventType === "hitl.webhook_test") {
    return json({ ok: true });
  }

  const payload = (body.request_payload as Record<string, unknown> | undefined) ?? {};
  const requestId = (body.request_id ?? body.requestId) as string | undefined;
  const workflowRunId = (body.workflow_run_id ?? body.workflowRunId) as string | undefined;
  const title = (body.request_title ?? body.title ?? payload.request_title) as string | undefined;
  const rawDescription = (body.request_description ?? body.description ?? payload.request_description) as string | undefined;
  const options = (body.approval_options ?? body.options ?? payload.approval_options) as unknown;
  const responseUrl = (body.response_url ??
    body.responseUrl ??
    body.respond_url ??
    body.callback_url ??
    payload.response_url ??
    payload.responseUrl ??
    payload.respond_url ??
    payload.callback_url) as string | undefined;

  // capability_id is embedded as the first line of request_description
  // ("Capability ID: <uuid>\n\n..."), not a structured field — confirmed
  // against live operator logs.
  const CAPABILITY_ID_PREFIX = /^Capability ID:\s*([0-9a-fA-F-]{36})\s*\n+/;
  const embeddedMatch = rawDescription?.match(CAPABILITY_ID_PREFIX);
  const capabilityId = (body.capability_id ?? body.capabilityId ?? payload.capability_id ?? payload.capabilityId ??
    embeddedMatch?.[1]) as string | undefined;
  const description = embeddedMatch ? rawDescription!.slice(embeddedMatch[0].length) : rawDescription;
  const deploymentId = (body.deployment_id ?? body.deploymentId) as string | undefined;

  if (!requestId || !workflowRunId) {
    return json({ error: "request_id and workflow_run_id are required." }, 400);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data, error } = await supabase
    .from("vendor_dna_approval_requests")
    .upsert(
      {
        request_id: requestId,
        workflow_run_id: workflowRunId,
        deployment_id: deploymentId ?? null,
        capability_id: capabilityId ?? null,
        title: title ?? null,
        description: description ?? null,
        options: options ?? [],
        response_url: responseUrl ?? null,
        status: "pending",
        raw_payload: body,
      },
      { onConflict: "request_id" }
    )
    .select("request_id")
    .single();

  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({ saved: true, requestId: data.request_id });
});
