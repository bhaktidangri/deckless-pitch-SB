// Receives SendGrid delivery-lifecycle events (relayed from
// src/app/api/webhooks/sendgrid/route.ts, which verifies the Signed Event
// Webhook ECDSA signature before forwarding) and updates whichever row — a
// vendor_outreach_events row (record-vendor-outreach) or a meeting_requests
// row (schedule-meeting-direct) — has a matching email_provider_id /
// invite_email_provider_id. Both senders mint their own tracking id and pass
// it through as a `custom_args.tracking_id` on the SendGrid send, since
// SendGrid's /mail/send response carries no message id to key off of the
// way Resend's did — SendGrid echoes custom_args back verbatim as a
// top-level field on every event for that message.
// Payload shape follows SendGrid's documented Event Webhook format
// (https://www.twilio.com/docs/sendgrid/for-developers/tracking-events/event):
// a JSON array of event objects, e.g. [{ event, tracking_id, url?, ... }].
// Not yet observed against a real delivery (no webhook has been registered
// in the SendGrid dashboard yet — see this project's own README once that's
// done), so field lookups stay permissive and the full payload is preserved
// nowhere on purpose: this only ever mutates counters/timestamps on an
// existing row, there's no raw-payload column to backfill from if the shape
// turns out to differ.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function applyEvent(admin: ReturnType<typeof createClient>, event: Record<string, unknown>, now: string) {
  const type = typeof event.event === "string" ? event.event : "";
  const trackingId = event.tracking_id as string | undefined;
  if (!trackingId) return { ok: true, skipped: "no tracking_id on event" };

  // Try the outreach table first, then the meeting-invite table — an id
  // only ever matches one of the two.
  const { data: outreachRow } = await admin
    .from("vendor_outreach_events")
    .select("id, open_count, click_count, opened_at, clicked_at")
    .eq("email_provider_id", trackingId)
    .maybeSingle();

  if (outreachRow) {
    const patch: Record<string, unknown> = {};
    if (type === "open") {
      patch.open_count = (outreachRow.open_count ?? 0) + 1;
      patch.opened_at = outreachRow.opened_at ?? now;
    } else if (type === "click") {
      patch.click_count = (outreachRow.click_count ?? 0) + 1;
      patch.clicked_at = outreachRow.clicked_at ?? now;
      if (typeof event.url === "string") patch.last_clicked_url = event.url;
    } else if (type === "bounce" || type === "dropped" || type === "deferred" || type === "spamreport") {
      patch.email_status = "failed";
      patch.email_error = `SendGrid: ${type}${typeof event.reason === "string" ? ` — ${event.reason}` : ""}`;
    } else if (type === "delivered") {
      patch.email_status = "sent";
    }
    if (Object.keys(patch).length > 0) {
      await admin.from("vendor_outreach_events").update(patch).eq("id", outreachRow.id);
    }
    return { ok: true, matched: "vendor_outreach_events", id: outreachRow.id };
  }

  const { data: meetingRow } = await admin
    .from("meeting_requests")
    .select("id, invite_open_count, invite_click_count, invite_opened_at, invite_clicked_at")
    .eq("invite_email_provider_id", trackingId)
    .maybeSingle();

  if (meetingRow) {
    const patch: Record<string, unknown> = {};
    if (type === "open") {
      patch.invite_open_count = (meetingRow.invite_open_count ?? 0) + 1;
      patch.invite_opened_at = meetingRow.invite_opened_at ?? now;
    } else if (type === "click") {
      patch.invite_click_count = (meetingRow.invite_click_count ?? 0) + 1;
      patch.invite_clicked_at = meetingRow.invite_clicked_at ?? now;
    } else if (type === "bounce" || type === "dropped" || type === "deferred" || type === "spamreport") {
      patch.invite_email_status = "failed";
      patch.invite_email_error = `SendGrid: ${type}${typeof event.reason === "string" ? ` — ${event.reason}` : ""}`;
    } else if (type === "delivered") {
      patch.invite_email_status = "sent";
    }
    if (Object.keys(patch).length > 0) {
      await admin.from("meeting_requests").update(patch).eq("id", meetingRow.id);
    }
    return { ok: true, matched: "meeting_requests", id: meetingRow.id };
  }

  return { ok: true, skipped: "no row matched this tracking_id" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server is not configured." }, 503);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "The request body was not valid JSON." }, 400);
  }
  const events = Array.isArray(body) ? (body as Record<string, unknown>[]) : [body as Record<string, unknown>];

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const now = new Date().toISOString();

  const results = [];
  for (const event of events) {
    results.push(await applyEvent(admin, event, now));
  }

  return json({ ok: true, results });
});
