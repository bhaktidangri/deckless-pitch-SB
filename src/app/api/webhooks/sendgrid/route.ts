import { NextResponse } from "next/server";
import { createPublicKey, createVerify } from "crypto";

// Receives SendGrid's Event Webhook (processed/delivered/open/click/bounce/
// ...) and relays it to the record-email-delivery-event edge function,
// which matches each event's tracking_id (a custom_args value we set when
// sending — see schedule-meeting-direct / record-vendor-outreach) back to
// whichever vendor_outreach_events or meeting_requests row sent it. Mirrors
// the yoxa-*/route.ts webhooks: a thin, mostly-passthrough relay, with real
// Signed Event Webhook (ECDSA) verification here rather than a shared-secret
// header, since that's what SendGrid actually sends.
//
// This URL must be registered as a webhook endpoint in the SendGrid dashboard
// (Settings → Mail Settings → Event Webhook → this route's public URL,
// subscribed to at least Delivered, Opened, and Clicked, with "Signed Event
// Webhook Requests" enabled) — same "must be publicly reachable" caveat as
// every other webhook in this app; a local dev server needs a tunnel.
// SENDGRID_WEBHOOK_PUBLIC_KEY (the base64 verification key SendGrid shows
// once signing is enabled on the endpoint) is optional here the same way
// YOXA_DEPLOYMENT_SECRET is optional on the Yoxa webhooks: verification is
// skipped (not rejected) if it isn't set yet, so this can be wired up before
// the key is copied over.
export const runtime = "nodejs";

function verifySendGridSignature(payload: string, timestamp: string, signatureB64: string, publicKeyB64: string): boolean {
  try {
    const publicKey = createPublicKey({ key: Buffer.from(publicKeyB64, "base64"), format: "der", type: "spki" });
    const verifier = createVerify("sha256");
    verifier.update(timestamp + payload);
    verifier.end();
    return verifier.verify(publicKey, signatureB64, "base64");
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const raw = await req.text();

  const publicKey = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY;
  if (publicKey) {
    const signature = req.headers.get("x-twilio-email-event-webhook-signature");
    const timestamp = req.headers.get("x-twilio-email-event-webhook-timestamp");
    if (!signature || !timestamp || !verifySendGridSignature(raw, timestamp, signature, publicKey)) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }
  }

  const body = JSON.parse(raw || "[]") as unknown;

  const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!functionsUrl || !anonKey) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const res = await fetch(`${functionsUrl}/functions/v1/record-email-delivery-event`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  return NextResponse.json(data, { status: res.status });
}
